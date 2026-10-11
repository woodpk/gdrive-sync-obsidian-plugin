import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type ChangeCursor, type DeviceIdentity, type InventoryCoverage,
  type InventoryGeneration, type InventoryGenerationManifest, type InventoryIdentityFence,
  type InventoryOverlayRecord, type PersistenceRevision, type ProtocolVersion,
  type RemoteObjectId, type SemanticStateGeneration, type VaultIdentity,
} from "../../src/contracts";
import { IndexedDbStateByteStorage } from "../../src/state/indexeddb-state-storage";
import { IndexedDbInventoryAwareStateByteStorage } from "../../src/state/indexeddb-inventory-authority-storage";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import { PersistentSynchronizationStateStore, createInitialAuthorityState } from "../../src/state/persistent-state-store";
import { VerifiedInventoryBaselineCoordinator } from "../../src/state/verified-inventory-integration";
import type { VerifiedMetadataInventoryReader } from "../../src/drive/verified-metadata-inventory-reader";

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
  version = 0;
  abortNextPublication = false;
  tables = new Map<string, StoredTable>();
  openFactory(): IDBFactory {
    return { open: (_name: string, version?: number) => {
      const action: { result?: IDBDatabase; error?: Error;
        onsuccess?: () => void; onerror?: () => void; onupgradeneeded?: () => void } = {};
      queueMicrotask(() => {
        const target = version ?? (this.version || 1);
        if (target < this.version) {
          action.error = new Error("VersionError");
          action.onerror?.();
          return;
        }
        const upgrading = target > this.version;
        this.version = target;
        action.result = this.handle();
        if (upgrading) action.onupgradeneeded?.();
        action.onsuccess?.();
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
      close: () => undefined,
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
    let pending = 0, aborted = false, closed = false;
    const tx: {
      db: IDBDatabase; oncomplete?: () => void; onabort?: () => void;
      onerror?: () => void; error?: Error;
      abort: () => void; objectStore: (name: string) => IDBObjectStore;
    } = {
      db: this.handle(),
      abort: () => { if (closed || aborted) return; aborted = true; queueMicrotask(() => tx.onabort?.()); },
      objectStore: (name: string) => {
        const data = snapshots.get(name);
        if (!data) throw new Error("NotFoundError");
        const enqueue = (action: () => unknown): IDBRequest => {
          if (closed || aborted) throw new Error("TransactionInactiveError");
          const req: { result?: unknown; error?: Error; onsuccess?: () => void; onerror?: () => void } = {};
          pending++;
          queueMicrotask(() => {
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
        return {
          get: (key: unknown) => enqueue(() => data.records.get(keyOf(key))),
          add: (value: unknown, key?: unknown) => enqueue(() => entryPut(value, key, true)),
          put: (value: unknown, key?: unknown) => enqueue(() => entryPut(value, key, false)),
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
          names.includes("inventory-control") && names.includes("inventory-generations")) {
        this.abortNextPublication = false;
        tx.abort();
        return;
      }
      closed = true;
      if (mode === "readwrite") for (const [name, data] of snapshots) this.tables.set(name, data);
      tx.oncomplete?.();
    };
    return tx as unknown as IDBTransaction;
  }
}

/** IDBKeyRange only is sufficient for the inventory's bounded indexed-read queries. */
export function withRangeOnly(): void {
  (globalThis as unknown as { IDBKeyRange: { only: (value: unknown) => { key: unknown } } }).IDBKeyRange =
    { only: value => ({ key: value }) };
}

export const id = (s: string) => contractId<"RemoteObjectId">(s) as RemoteObjectId;
export const c = (s: string) => contractId<"ChangeCursor">(s) as ChangeCursor;
export const rev = (s: string) => contractId<"StateRevision">(s) as PersistenceRevision;
export const sem = (s: string) => contractId<"SemanticStateGeneration">(s) as SemanticStateGeneration;
export const g = (s: string) => s as InventoryGeneration;
export const r0 = rev("state:1"), s0 = sem("semantic:1"), cursor0 = c("changes:0"), cursor1 = c("changes:1");
export const fence: InventoryIdentityFence = {
  vaultIdentity: contractId<"VaultIdentity">("vault:idb") as VaultIdentity,
  deviceIdentity: contractId<"DeviceIdentity">("device:idb") as DeviceIdentity,
  pairedAccountKey: "opaque", managedRootId: id("managed"),
  protocolVersion: contractId<"ProtocolVersion">("1") as ProtocolVersion,
  contentDomainRootId: id("content"), configDomainRootId: id("config"),
  scopePolicyFingerprint: "scope:idb", inventorySchemaVersion: 1,
};
export function candidate(gen = g("g1"), token = cursor1): {
  manifest: InventoryGenerationManifest; rows: InventoryOverlayRecord[]; coverage: InventoryCoverage[];
} {
  const manifest: InventoryGenerationManifest = {
    generation: gen, parentGeneration: null, overlayDepth: 0,
    inputCursor: cursor0, terminalCursor: token, baseStartToken: cursor0,
    fence, authorityPersistenceRevision: r0, authoritySemanticGeneration: s0,
    recordCount: 2, coverageDigest: "digest:stage", validationReceipt: "receipt:stage", status: "complete",
  };
  const rows = (["content", "portable-config"] as const).map(domain => {
    const remoteObjectId = domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId;
    return { kind: "upsert" as const, generation: gen, entity: {
      generation: gen, remoteObjectId, parentRemoteObjectId: null, domain,
      name: domain, kind: "folder" as const, pathValidity: "verified" as const,
      access: "visible" as const, trashed: false, managedRootId: fence.managedRootId,
      provenanceDomain: domain,
    } };
  });
  const coverage = (["content", "portable-config"] as const).map(domain => ({
    generation: gen, domain, scopeId: domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId,
    scopeKind: "domain" as const, state: "complete" as const, visibility: "app-visible" as const,
    allPagesRead: true, incompleteSearch: false, provenanceVerified: true, terminalCursor: token,
  }));
  return { manifest, rows, coverage };
}
export async function* rows<T>(items: readonly T[]): AsyncIterable<T> { for (const v of items) yield v; }
export async function seeded(factory: IDBFactory): Promise<IndexedDbInventoryObservationStore> {
  const bytes = new IndexedDbStateByteStorage("device:idb:test", factory);
  const store = new PersistentSynchronizationStateStore(bytes);
  const initial = createInitialAuthorityState({
    persistenceRevision: r0, semanticGeneration: s0,
    vaultIdentity: fence.vaultIdentity, deviceIdentity: fence.deviceIdentity,
  });
  assert.equal((await store.saveTrusted(initial)).status, "saved");
  return new IndexedDbInventoryObservationStore("device:idb:test", factory);
}

export function simulatedBaseline(c: ReturnType<typeof candidate>): Pick<VerifiedMetadataInventoryReader, "baseline" | "incremental"> {
  return {
    incremental: async () => ({ status: "unknown" as const, reason: "incremental-not-configured" }),
    baseline: async () => ({
      status: "ok" as const,
      value: {
        inputCursor: c.manifest.inputCursor, terminalCursor: c.manifest.terminalCursor,
        entities: c.rows.filter((r): r is Extract<InventoryOverlayRecord, { readonly kind: "upsert" }> =>
          r.kind === "upsert").map(r => r.entity),
        coverage: [...c.coverage, ...c.rows.flatMap(row => {
          if (row.kind !== "upsert" || row.entity.kind !== "folder") return [];
          return [{
            generation: row.generation, domain: row.entity.domain,
            scopeId: row.entity.remoteObjectId, scopeKind: "parent" as const,
            state: "complete" as const, visibility: "app-visible" as const,
            allPagesRead: true, incompleteSearch: false, provenanceVerified: true,
            terminalCursor: c.manifest.terminalCursor,
          }];
        })], normalizedSiblingCollisions: [],
        replayedEvents: 0, publishAuthorized: false as const,
      },
    }),
  };
}

export function simulatedDelta(
  base: ReturnType<typeof candidate>,
  next: {
    readonly generation: InventoryGeneration; readonly token: ChangeCursor;
    readonly inputCursor?: ChangeCursor;
    readonly overlays: readonly InventoryOverlayRecord[];
    readonly changes: readonly import("../../src/contracts/google-drive").RemoteChange[];
    readonly partial?: boolean;
  },
): Pick<VerifiedMetadataInventoryReader, "baseline" | "incremental"> {
  const cover = (["content", "portable-config"] as const).flatMap(domain => {
    const rootId = domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId;
    return (["domain", "parent"] as const).map(scopeKind => ({
      generation: next.generation, domain, scopeId: rootId, scopeKind,
      state: "complete" as const, visibility: "app-visible" as const,
      allPagesRead: true, incompleteSearch: false, provenanceVerified: true,
      terminalCursor: next.token,
    }));
  });
  return {
    ...simulatedBaseline(base),
    incremental: async () => ({
      status: "ok" as const, value: {
        inputCursor: next.inputCursor ?? cursor1, terminalCursor: next.token,
        overlays: [...next.overlays], invalidatedParentIds: [fence.contentDomainRootId],
        coverage: next.partial ? cover.filter(row => row.domain !== "content") : cover,
        learnedChanges: [...next.changes], publishAuthorized: false as const,
      },
    }),
  };
}

export function integratedFile(generation: InventoryGeneration, name: string): Extract<InventoryOverlayRecord, { kind: "upsert" }> {
  const remoteObjectId = id("remote:delta-file");
  const path = contractId<"VaultPath">(name);
  return { kind: "upsert", generation, entity: {
    generation, remoteObjectId, parentRemoteObjectId: fence.contentDomainRootId,
    domain: "content", name, kind: "file", logicalPath: path,
    pathValidity: "verified", access: "visible", trashed: false,
    managedRootId: fence.managedRootId, provenanceDomain: "content",
  } };
}

export async function assertDurablePair(idb: IDBFactory, generation: InventoryGeneration | null,
  cursor: ChangeCursor | null, batches = 0): Promise<void> {
  const authority = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") return;
  assert.equal(authority.state.changeCursor ?? null, cursor);
  assert.equal(authority.state.learnedRemoteBatches.length, batches);
  const pointer = await new IndexedDbInventoryObservationStore("device:idb:test", idb)
    .publicationSnapshot(fence);
  assert.equal(pointer.status, "trusted-fence");
  if (pointer.status !== "trusted-fence") return;
  assert.equal(pointer.value.activeGeneration, generation);
  assert.equal(pointer.value.canonicalCursor, cursor);
  assert.equal(pointer.value.persistenceRevision, authority.state.persistenceRevision);
  assert.equal(pointer.value.semanticGeneration, authority.state.semanticGeneration);
}
