import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type ChangeCursor, type DeviceIdentity, type InventoryCoverage,
  type InventoryGeneration, type InventoryGenerationManifest, type InventoryIdentityFence,
  type InventoryOverlayRecord, type PersistenceRevision, type ProtocolVersion,
  type RemoteObjectId, type SemanticStateGeneration, type VaultIdentity,
} from "../src/contracts";
import { IndexedDbStateByteStorage } from "../src/state/indexeddb-state-storage";
import { IndexedDbInventoryObservationStore } from "../src/state/indexeddb-inventory-storage";
import { PersistentSynchronizationStateStore, createInitialAuthorityState } from "../src/state/persistent-state-store";

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

class FakeDatabase {
  version = 0;
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
      closed = true;
      if (mode === "readwrite") for (const [name, data] of snapshots) this.tables.set(name, data);
      tx.oncomplete?.();
    };
    return tx as unknown as IDBTransaction;
  }
}

/** IDBKeyRange only is sufficient for the inventory's bounded indexed-read queries. */
function withRangeOnly(): void {
  (globalThis as unknown as { IDBKeyRange: { only: (value: unknown) => { key: unknown } } }).IDBKeyRange =
    { only: value => ({ key: value }) };
}

const id = (s: string) => contractId<"RemoteObjectId">(s) as RemoteObjectId;
const c = (s: string) => contractId<"ChangeCursor">(s) as ChangeCursor;
const rev = (s: string) => contractId<"StateRevision">(s) as PersistenceRevision;
const sem = (s: string) => contractId<"SemanticStateGeneration">(s) as SemanticStateGeneration;
const g = (s: string) => s as InventoryGeneration;
const r0 = rev("state:1"), s0 = sem("semantic:1"), cursor0 = c("changes:0"), cursor1 = c("changes:1");
const fence: InventoryIdentityFence = {
  vaultIdentity: contractId<"VaultIdentity">("vault:idb") as VaultIdentity,
  deviceIdentity: contractId<"DeviceIdentity">("device:idb") as DeviceIdentity,
  pairedAccountKey: "opaque", managedRootId: id("managed"),
  protocolVersion: contractId<"ProtocolVersion">("1") as ProtocolVersion,
  contentDomainRootId: id("content"), configDomainRootId: id("config"),
  scopePolicyFingerprint: "scope:idb", inventorySchemaVersion: 1,
};
function candidate(gen = g("g1"), token = cursor1): {
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
async function* rows<T>(items: readonly T[]): AsyncIterable<T> { for (const v of items) yield v; }
async function seeded(factory: IDBFactory): Promise<IndexedDbInventoryObservationStore> {
  const bytes = new IndexedDbStateByteStorage("device:idb:test", factory);
  const store = new PersistentSynchronizationStateStore(bytes);
  const initial = createInitialAuthorityState({
    persistenceRevision: r0, semanticGeneration: s0,
    vaultIdentity: fence.vaultIdentity, deviceIdentity: fence.deviceIdentity,
  });
  assert.equal((await store.saveTrusted(initial)).status, "saved");
  return new IndexedDbInventoryObservationStore("device:idb:test", factory);
}

test("v1 authority survives additive v2 schema, stage, atomic publish and restart", async () => {
  withRangeOnly();
  const db = new FakeDatabase();
  const factory = db.openFactory();
  const store = await seeded(factory);
  const staged = candidate();
  assert.equal((await store.stage({ candidate: staged.manifest,
    overlays: rows(staged.rows), coverage: rows(staged.coverage) })).status, "verified-observation");
  const result = await store.publishAtomically({
    candidateGeneration: staged.manifest.generation, validationReceipt: staged.manifest.validationReceipt,
    expectedActiveGeneration: null, expectedAuthorityPersistenceRevision: r0,
    expectedAuthoritySemanticGeneration: s0, expectedCanonicalCursor: null,
    nextCanonicalCursor: cursor1, fence,
  });
  assert.equal(result.status, "published");
  assert.equal(db.version, 2);
  const reader = new IndexedDbInventoryObservationStore("device:idb:test", factory);
  const read = await reader.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status !== "verified-observation") return;
  const entity = await read.value.getById(fence.contentDomainRootId);
  assert.equal(entity.status, "verified-observation");
  const domain = await read.value.coverage("content", fence.contentDomainRootId);
  assert.equal(domain.status, "verified-observation");
  const missing = await read.value.getById(id("not-present"));
  assert.equal(missing.status, "unknown");
  await read.value.release();
  assert.equal((await read.value.getById(fence.contentDomainRootId)).status, "stale");
});

test("staged, uncommitted replacement never publishes a new cursor or active generation", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const first = candidate();
  assert.equal((await store.stage({ candidate: first.manifest, overlays: rows(first.rows),
    coverage: rows(first.coverage) })).status, "verified-observation");
  const before = await store.openRead();
  assert.equal(before.status, "stale");
  const rejected = await store.publishAtomically({
    candidateGeneration: first.manifest.generation, validationReceipt: "wrong-receipt",
    expectedActiveGeneration: null, expectedAuthorityPersistenceRevision: r0,
    expectedAuthoritySemanticGeneration: s0, expectedCanonicalCursor: null,
    nextCanonicalCursor: cursor1, fence,
  });
  assert.equal(rejected.status, "invalid");
  assert.equal((await store.openRead()).status, "stale");
});

test("existing v2 canonical state reader can open without a forced v1 VersionError", async () => {
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const staged = candidate();
  await inventory.stage({ candidate: staged.manifest,
    overlays: rows(staged.rows), coverage: rows(staged.coverage) });
  const canonical = new IndexedDbStateByteStorage("device:idb:test", factory);
  assert.ok(await canonical.read());
  assert.equal(db.version, 2);
});

test("a legacy canonical cursor writer invalidates active inventory atomically instead of fast-forwarding it", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate();
  assert.equal((await inventory.stage({ candidate: baseline.manifest,
    overlays: rows(baseline.rows), coverage: rows(baseline.coverage) })).status, "verified-observation");
  const published = await inventory.publishAtomically({
    candidateGeneration: baseline.manifest.generation, validationReceipt: baseline.manifest.validationReceipt,
    expectedActiveGeneration: null, expectedAuthorityPersistenceRevision: r0,
    expectedAuthoritySemanticGeneration: s0, expectedCanonicalCursor: null,
    nextCanonicalCursor: cursor1, fence,
  });
  assert.equal(published.status, "published");
  const canonical = new PersistentSynchronizationStateStore(
    new IndexedDbStateByteStorage("device:idb:test", factory));
  const loaded = await canonical.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  const saved = await canonical.saveAuthority(
    { ...loaded.state, changeCursor: c("changes:outside-inventory") },
    loaded.state.persistenceRevision, loaded.state.semanticGeneration);
  assert.equal(saved.status, "saved");
  assert.equal((await inventory.openRead()).status, "stale");
});

test("duplicate candidate IDs cannot replace sealed or published generations", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const first = candidate();
  const initial = await inventory.stage({ candidate: first.manifest,
    overlays: rows(first.rows), coverage: rows(first.coverage) });
  assert.equal(initial.status, "verified-observation");
  const retry = await inventory.stage({ candidate: first.manifest,
    overlays: rows(first.rows), coverage: rows(first.coverage) });
  assert.equal(retry.status, "stale");
});

test("complete baseline can replace a previously published generation without a predecessor copy", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const inventory = await seeded(factory);
  const first = candidate();
  await inventory.stage({ candidate: first.manifest, overlays: rows(first.rows),
    coverage: rows(first.coverage) });
  const firstCommit = await inventory.publishAtomically({
    candidateGeneration: first.manifest.generation, validationReceipt: first.manifest.validationReceipt,
    expectedActiveGeneration: null, expectedAuthorityPersistenceRevision: r0,
    expectedAuthoritySemanticGeneration: s0, expectedCanonicalCursor: null,
    nextCanonicalCursor: cursor1, fence,
  });
  assert.equal(firstCommit.status, "published");
  const canonical = await new PersistentSynchronizationStateStore(
    new IndexedDbStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(canonical.status, "trusted");
  if (canonical.status !== "trusted") return;
  const next = candidate(g("full-rebaseline"), c("changes:next"));
  assert.equal((await inventory.stage({ candidate: next.manifest, overlays: rows(next.rows),
    coverage: rows(next.coverage) })).status, "verified-observation");
  const replaced = await inventory.publishAtomically({
    candidateGeneration: next.manifest.generation, validationReceipt: next.manifest.validationReceipt,
    expectedActiveGeneration: first.manifest.generation,
    expectedAuthorityPersistenceRevision: canonical.state.persistenceRevision,
    expectedAuthoritySemanticGeneration: canonical.state.semanticGeneration,
    expectedCanonicalCursor: cursor1, nextCanonicalCursor: c("changes:next"), fence,
  });
  assert.equal(replaced.status, "published");
  const read = await inventory.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status === "verified-observation") {
    assert.equal(read.value.generation, next.manifest.generation);
    await read.value.release();
  }
});

test("incremental COW generation keeps older indexed roots reachable after atomic Changes learning", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const inventory = await seeded(factory);
  const first = candidate();
  await inventory.stage({ candidate: first.manifest, overlays: rows(first.rows),
    coverage: rows(first.coverage) });
  assert.equal((await inventory.publishAtomically({
    candidateGeneration: first.manifest.generation, validationReceipt: first.manifest.validationReceipt,
    expectedActiveGeneration: null, expectedAuthorityPersistenceRevision: r0,
    expectedAuthoritySemanticGeneration: s0, expectedCanonicalCursor: null,
    nextCanonicalCursor: cursor1, fence,
  })).status, "published");
  const canonical = await new PersistentSynchronizationStateStore(
    new IndexedDbStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(canonical.status, "trusted");
  if (canonical.status !== "trusted") return;
  const nextGen = g("delta:1"), nextCursor = c("changes:2");
  const child = id("remote:child");
  const overlay: InventoryOverlayRecord = {
    kind: "upsert", generation: nextGen, entity: {
      generation: nextGen, remoteObjectId: child, parentRemoteObjectId: fence.contentDomainRootId,
      domain: "content", name: "child.md", kind: "file", logicalPath: contractId<"VaultPath">("child.md"),
      pathValidity: "verified", access: "visible", trashed: false,
      managedRootId: fence.managedRootId, provenanceDomain: "content",
    },
  };
  const manifest: InventoryGenerationManifest = {
    ...first.manifest, generation: nextGen, parentGeneration: first.manifest.generation,
    overlayDepth: 1, inputCursor: cursor1, terminalCursor: nextCursor,
    recordCount: 1, authorityPersistenceRevision: canonical.state.persistenceRevision,
    authoritySemanticGeneration: canonical.state.semanticGeneration,
  };
  const cover = first.coverage.map(row => ({
    ...row, generation: nextGen, terminalCursor: nextCursor,
  }));
  assert.equal((await inventory.stage({ candidate: manifest, overlays: rows([overlay]),
    coverage: rows(cover) })).status, "verified-observation");
  const learned = {
    checkpoint: { batchId: contractId<"RemoteIngestionBatchId">("delta:1"),
      startingToken: cursor1, terminalStartToken: nextCursor,
      persistenceRevision: canonical.state.persistenceRevision, status: "learned" as const },
    changes: [],
  };
  const published = await inventory.publishAtomically({
    candidateGeneration: nextGen, validationReceipt: manifest.validationReceipt,
    expectedActiveGeneration: first.manifest.generation,
    expectedAuthorityPersistenceRevision: canonical.state.persistenceRevision,
    expectedAuthoritySemanticGeneration: canonical.state.semanticGeneration,
    expectedCanonicalCursor: cursor1, nextCanonicalCursor: nextCursor, fence,
    learnedBatchId: String(learned.checkpoint.batchId),
  }, learned);
  assert.equal(published.status, "published");
  const read = await inventory.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status === "verified-observation") {
    assert.equal((await read.value.getById(fence.contentDomainRootId)).status, "verified-observation");
    const children = await read.value.listByParent("content", fence.contentDomainRootId);
    assert.equal(children.status, "verified-observation");
    if (children.status === "verified-observation") assert.equal(children.value[0]?.remoteObjectId, child);
    await read.value.release();
  }
});
