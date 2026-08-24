import type { StateByteStorage } from "./persistent-state-store";

const STATE_KEY = "current-state";
const STORE_NAME = "sync-state";

function clone(bytes: Uint8Array): Uint8Array { return bytes.slice(); }
function equal(a: Uint8Array | undefined, b: Uint8Array | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function randomId(): string {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) throw new Error("secure random generation is unavailable");
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Browser/Obsidian-mobile-compatible production byte store.
 *
 * IndexedDB record replacement is transactional. compareAndSwap performs the read, equality
 * decision, and replacement in one read-write transaction so two plugin instances cannot both
 * successfully commit from the same observed state bytes.
 */
export class IndexedDbStateByteStorage implements StateByteStorage {
  private database?: Promise<IDBDatabase>;

  constructor(
    private readonly databaseName = "brain-google-drive-sync",
    private readonly indexedDb: IDBFactory = globalThis.indexedDB,
  ) {
    if (!indexedDb) throw new Error("IndexedDB is unavailable in this runtime");
  }

  async read(): Promise<Uint8Array | undefined> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const value = await requestResult(transaction.objectStore(STORE_NAME).get(STATE_KEY)) as Uint8Array | undefined;
    await transactionComplete(transaction);
    return value ? clone(value) : undefined;
  }

  async write(bytes: Uint8Array): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(clone(bytes), STATE_KEY);
    await transactionComplete(transaction);
  }

  async compareAndSwap(expected: Uint8Array | undefined, replacement: Uint8Array): Promise<boolean> {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const current = await requestResult(store.get(STATE_KEY)) as Uint8Array | undefined;
    const matched = equal(current, expected);
    if (matched) store.put(clone(replacement), STATE_KEY);
    await transactionComplete(transaction);
    return matched;
  }

  async backup(bytes: Uint8Array): Promise<string> {
    const database = await this.open();
    const backupId = `backup:${randomId()}`;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(clone(bytes), backupId);
    await transactionComplete(transaction);
    return backupId;
  }

  private open(): Promise<IDBDatabase> {
    this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = this.indexedDb.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open synchronization state database"));
      request.onblocked = () => reject(new Error("Synchronization state database upgrade is blocked"));
    });
    return this.database;
  }
}
