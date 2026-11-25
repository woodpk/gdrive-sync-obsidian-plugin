/** Deterministic IDB transaction fixture; software validation is executed exclusively by PHX-CI. */
interface StoredTable {
  readonly keyPath?: readonly string[];
  readonly indexes: Map<string, readonly string[]>;
  readonly records: Map<string, unknown>;
}
const keyOf = (key: unknown) => JSON.stringify(key);
const clone = (value: StoredTable): StoredTable => ({
  keyPath: value.keyPath, indexes: new Map(value.indexes), records: new Map(value.records),
});
const getField = (value: unknown, path: string): unknown => (value as Record<string, unknown>)[path];

export class FakeDatabase {
  constructor(private readonly serializeTransactions = false) {}
  private transactionTail: Promise<void> = Promise.resolve();
  version = 0;
  /** Capture the last opened connection for versionchange lifecycle tests. */
  lastOpened?: IDBDatabase;
  closeCount = 0;
  blockNextOpen = false;
  private blockedOpenContinuation?: () => void;
  resumeBlockedOpen(): boolean {
    const continueOpen = this.blockedOpenContinuation;
    if (!continueOpen) return false;
    this.blockedOpenContinuation = undefined;
    queueMicrotask(continueOpen);
    return true;
  }
  abortNextPublication = false;
  abortedPublicationStores: readonly string[] | null = null;
  tables = new Map<string, StoredTable>();
  openFactory(): IDBFactory {
    return { open: (_name: string, version?: number) => {
      const action: { result?: IDBDatabase; error?: Error;
        onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: () => void;
        onblocked?: () => void } = {};
      const performOpen = () => {
        const target = version ?? (this.version || 1);
        if (target < this.version) {
          action.error = new Error("VersionError");
          action.onerror?.();
          return;
        }
        const upgrading = target > this.version;
        this.version = target;
        action.result = this.handle();
        this.lastOpened = action.result;
        if (upgrading) action.onupgradeneeded?.();
        action.onsuccess?.();
      };
      queueMicrotask(() => {
        if (this.blockNextOpen) {
          this.blockNextOpen = false;
          this.blockedOpenContinuation = performOpen;
          action.onblocked?.();
          return;
        }
        performOpen();
      });
      return action as unknown as IDBOpenDBRequest;
    } } as unknown as IDBFactory;
  }
  private handle(): IDBDatabase {
    const self = this;
    return {
      objectStoreNames: { contains: (name: string) => self.tables.has(name) },
      createObjectStore: (name: string, cfg?: { keyPath?: string | string[] }) => {
        const table: StoredTable = { keyPath: Array.isArray(cfg?.keyPath) ? cfg.keyPath : undefined,
          records: new Map(), indexes: new Map() };
        self.tables.set(name, table);
        return { createIndex: (key: string, paths: string | string[]) => {
          table.indexes.set(key, Array.isArray(paths) ? paths : [paths]);
        } } as unknown as IDBObjectStore;
      },
      transaction: (names: readonly string[] | string, mode: IDBTransactionMode) =>
        this.transaction(Array.isArray(names) ? names : [names], mode),
      close: () => { self.closeCount++; },
      onversionchange: null,
    } as unknown as IDBDatabase;
  }
  private transaction(names: readonly string[], mode: IDBTransactionMode): IDBTransaction {
    const snapshots = new Map<string, StoredTable>();
    for (const name of names) {
      const t = this.tables.get(name);
      if (!t) throw new Error("NotFoundError");
      snapshots.set(name, clone(t));
    }
    let release = () => {};
    let ready = Promise.resolve();
    if (this.serializeTransactions) {
      ready = this.transactionTail.then(() => {
        for (const [name, snapshot] of snapshots) {
          snapshot.records.clear();
          for (const [key, value] of this.tables.get(name)!.records) snapshot.records.set(key, value);
        }
      });
      const completed = new Promise<void>(resolve => { release = () => resolve(); });
      this.transactionTail = ready.then(() => completed);
    }
    const dispatch = (action: () => void) => { if (this.serializeTransactions) void ready.then(() => queueMicrotask(action)); else queueMicrotask(action); };
    let pending = 0, aborted = false, closed = false;
    const tx: {
      db: IDBDatabase; oncomplete?: () => void; onabort?: () => void;
      onerror?: () => void; error?: Error;
      abort: () => void; objectStore: (name: string) => IDBObjectStore;
    } = {
      db: this.handle(),
      abort: () => { if (closed || aborted) return; aborted = true; dispatch(() => { release(); tx.onabort?.(); }); },
      objectStore: (name: string) => {
        const data = snapshots.get(name);
        if (!data) throw new Error("NotFoundError");
        const enqueue = (action: () => unknown): IDBRequest => {
          if (closed || aborted) throw new Error("TransactionInactiveError");
          const req: { result?: unknown; error?: Error; onsuccess?: () => void; onerror?: () => void } = {};
          pending++;
          dispatch(() => {
            if (aborted) { pending--; return; }
            try { req.result = action(); req.onsuccess?.(); }
            catch (e) {
              req.error = e instanceof Error ? e : new Error("ConstraintError");
              req.onerror?.();
              tx.abort();
            }
            pending--;
            // IndexedDB commits after the request's event task and its promise
            // microtasks, not before awaited request handlers can queue more work.
            // Queueing finish as a microtask closed this fake too early, leaving
            // transactionComplete() without an oncomplete event.
            setImmediate(finish);
          });
          return req as unknown as IDBRequest;
        };
        const resolveKey = (value: unknown, key?: unknown): unknown =>
          key ?? (data.keyPath ? data.keyPath.map(path => getField(value, path)) : undefined);
        const entryPut = (value: unknown, key: unknown, onlyNew: boolean) => {
          if (mode !== "readwrite") throw new Error("ReadOnlyError");
          const chosen = resolveKey(value, key);
          if (chosen === undefined) throw new Error("DataError");
          const encoded = keyOf(chosen);
          if (onlyNew && data.records.has(encoded)) throw new Error("ConstraintError");
          data.records.set(encoded, value);
          return chosen;
        };
        const selectByPrimaryRange = (
          range?: { lower?: readonly unknown[]; upper?: readonly unknown[] },
        ): unknown[] => {
          if (!range) return [...data.records.values()];
          if (!Array.isArray(range.lower) || !Array.isArray(range.upper) ||
              range.lower.length !== 1 || range.upper.length !== 2 ||
              range.upper[0] !== range.lower[0] || !Array.isArray(range.upper[1]))
            throw new Error("Unsupported IDB primary-key range in fixture");
          return [...data.records.entries()].filter(([encoded]) => {
            const key: unknown = JSON.parse(encoded);
            return Array.isArray(key) && key[0] === range.lower![0];
          }).map(([, value]) => value);
        };
        return {
          get: (key: unknown) => enqueue(() => data.records.get(keyOf(key))),
          count: (range?: { lower?: readonly unknown[]; upper?: readonly unknown[] }) =>
            enqueue(() => selectByPrimaryRange(range).length),
          getAll: (range?: { lower?: readonly unknown[]; upper?: readonly unknown[] }, count?: number) =>
            enqueue(() => selectByPrimaryRange(range).slice(0, count)),
          add: (value: unknown, key?: unknown) => enqueue(() => entryPut(value, key, true)),
          put: (value: unknown, key?: unknown) => enqueue(() => entryPut(value, key, false)),
          delete: (key: unknown) => enqueue(() => {
            if (mode !== "readwrite") throw new Error("ReadOnlyError");
            data.records.delete(keyOf(key));
          }),
          index: (name: string) => {
            const path = data.indexes.get(name);
            if (!path) throw new Error("IndexNotFoundError");
            return { getAll: (range: { key: unknown }, count?: number) => enqueue(() =>
              [...data.records.values()].filter(value => {
                const actual = path.map(item => getField(value, item));
                return keyOf(actual) === keyOf(range.key);
              }).slice(0, count)) };
          },
        } as unknown as IDBObjectStore;
      },
    };
    const finish = () => {
      if (aborted || closed || pending !== 0) return;
      if (this.abortNextPublication && mode === "readwrite" &&
          names.includes("sync-state") && names.includes("inventory-control") &&
          names.includes("inventory-generations")) {
        this.abortNextPublication = false;
        this.abortedPublicationStores = [...names];
        tx.abort();
        return;
      }
      closed = true;
      if (mode === "readwrite") for (const [name, data] of snapshots) this.tables.set(name, data);
      release(); tx.oncomplete?.();
    };
    if (this.serializeTransactions) void ready.then(() => setImmediate(finish));
    return tx as unknown as IDBTransaction;
  }
}

/** Bounded indexed reads and generation-prefix row-count integrity queries. */
export function withRangeOnly(): void {
  (globalThis as unknown as { IDBKeyRange: {
    only: (value: unknown) => { key: unknown };
    bound: (lower: unknown, upper: unknown) => { lower: unknown; upper: unknown };
  } }).IDBKeyRange = {
    only: value => ({ key: value }),
    bound: (lower, upper) => ({ lower, upper }),
  };
}

