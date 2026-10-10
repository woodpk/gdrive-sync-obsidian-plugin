import type { StateByteStorage } from "./persistent-state-store";

const STATE_KEY = "current-state";
const STORE_NAME = "sync-state";
const INVENTORY_CONTROL = "inventory-control";

/** This is solely a fail-closed compatibility fence, not a parser for trusted authority. */
function inventoryRelevantState(bytes: Uint8Array | undefined): string {
  if (!bytes) return "missing";
  try {
    const state = (JSON.parse(new TextDecoder().decode(bytes)) as { state?: Record<string, unknown> }).state;
    if (!state || typeof state !== "object") return "unreadable";
    return JSON.stringify({
      vaultIdentity: state.vaultIdentity, deviceIdentity: state.deviceIdentity,
      changeCursor: state.changeCursor,
    });
  } catch { return "unreadable"; }
}

async function invalidateInventoryOnUnfencedAuthorityChange(
  transaction: IDBTransaction, previous: Uint8Array | undefined, next: Uint8Array,
): Promise<void> {
  if (!transaction.db.objectStoreNames.contains(INVENTORY_CONTROL)) return;
  const store = transaction.objectStore(INVENTORY_CONTROL);
  const record = await requestResult(store.get("active")) as
    ({ readonly status?: string; readonly activeGeneration?: string; readonly terminalCursor?: string } | undefined);
  if (record?.status !== "ready") return;
  if (inventoryRelevantState(previous) !== inventoryRelevantState(next)) {
    store.put({ ...record, status: "invalid", reason: "unfenced-authority-cursor-or-identity-write" }, "active");
  }
}


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
    const guarded = database.objectStoreNames.contains(INVENTORY_CONTROL);
    const transaction = database.transaction(guarded ? [STORE_NAME, INVENTORY_CONTROL] : [STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const previous = await requestResult(store.get(STATE_KEY)) as Uint8Array | undefined;
    await invalidateInventoryOnUnfencedAuthorityChange(transaction, previous, bytes);
    store.put(clone(bytes), STATE_KEY);
    await transactionComplete(transaction);
  }

  async compareAndSwap(expected: Uint8Array | undefined, replacement: Uint8Array): Promise<boolean> {
    const database = await this.open();
    const guarded = database.objectStoreNames.contains(INVENTORY_CONTROL);
    const transaction = database.transaction(guarded ? [STORE_NAME, INVENTORY_CONTROL] : [STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const current = await requestResult(store.get(STATE_KEY)) as Uint8Array | undefined;
    const matched = equal(current, expected);
    if (matched) {
      await invalidateInventoryOnUnfencedAuthorityChange(transaction, current, replacement);
      store.put(clone(replacement), STATE_KEY);
    }
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
    if (!this.database) {
      const pending = new Promise<IDBDatabase>((resolve, reject) => {
        // Unversioned opens work with both the existing v1 and additive inventory v2 databases.
        // An older binary that explicitly opens v1 cannot be assumed rollback compatible.
        const request = this.indexedDb.open(this.databaseName);
        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => { db.close(); this.database = undefined; };
          resolve(db);
        };
        request.onerror = () => reject(request.error ?? new Error("Unable to open synchronization state database"));
        request.onblocked = () => reject(new Error("Synchronization state database upgrade is blocked"));
      });
      this.database = pending.catch(error => { this.database = undefined; throw error; });
    }
    return this.database;
  }
}
