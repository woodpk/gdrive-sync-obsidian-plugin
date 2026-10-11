import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type ChangeCursor, type DeviceIdentity, type InventoryCoverage,
  type InventoryGeneration, type InventoryGenerationManifest, type InventoryIdentityFence,
  type InventoryOverlayRecord, type PersistenceRevision, type ProtocolVersion,
  type RemoteObjectId, type SemanticStateGeneration, type VaultIdentity,
} from "../src/contracts";
import { IndexedDbStateByteStorage } from "../src/state/indexeddb-state-storage";
import { IndexedDbInventoryAwareStateByteStorage } from "../src/state/indexeddb-inventory-authority-storage";
import { IndexedDbInventoryObservationStore } from "../src/state/indexeddb-inventory-storage";
import { PersistentSynchronizationStateStore, createInitialAuthorityState } from "../src/state/persistent-state-store";
import { VerifiedInventoryBaselineCoordinator } from "../src/state/verified-inventory-integration";
import type { VerifiedMetadataInventoryReader } from "../src/drive/verified-metadata-inventory-reader";

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
  assert.equal((await read.value.listByParent("content", fence.contentDomainRootId)).status, "unknown");
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

test("inventory-aware v2 canonical state reader opens upgraded DB without VersionError", async () => {
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const staged = candidate();
  await inventory.stage({ candidate: staged.manifest,
    overlays: rows(staged.rows), coverage: rows(staged.coverage) });
  const canonical = new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory);
  assert.ok(await canonical.read());
  assert.equal(db.version, 2);
});

test("unmodified v1 reader fails closed against an upgraded v2 database", async () => {
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const staged = candidate();
  assert.equal((await inventory.stage({ candidate: staged.manifest,
    overlays: rows(staged.rows), coverage: rows(staged.coverage) })).status, "verified-observation");
  const oldReader = new IndexedDbStateByteStorage("device:idb:test", factory);
  await assert.rejects(oldReader.read(), /VersionError/);
});

test("inventory-aware canonical cursor writer atomically invalidates stale inventory", async () => {
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
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory));
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
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
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
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
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
  const cover = [
    ...first.coverage.map(row => ({
      ...row, generation: nextGen, terminalCursor: nextCursor,
    })),
    {
      generation: nextGen, domain: "content" as const,
      scopeId: fence.contentDomainRootId, scopeKind: "parent" as const,
      state: "complete" as const, visibility: "app-visible" as const,
      allPagesRead: true, incompleteSearch: false, provenanceVerified: true,
      terminalCursor: nextCursor,
    },
  ];
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


function simulatedBaseline(c: ReturnType<typeof candidate>): Pick<VerifiedMetadataInventoryReader, "baseline" | "incremental"> {
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

test("D339-04 full provider baseline validates and atomically publishes canonical cursor with indexed generation", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const initial = candidate(g("integrated-baseline"));
  const coordinator = new VerifiedInventoryBaselineCoordinator(simulatedBaseline(initial), storage);
  const result = await coordinator.publishBaseline(fence, initial.manifest.generation);
  assert.equal(result.status, "published");
  const authority = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status === "trusted") assert.equal(authority.state.changeCursor, cursor1);
  const restarted = new IndexedDbInventoryObservationStore("device:idb:test", idb);
  const read = await restarted.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status === "verified-observation") {
    assert.equal(read.value.generation, initial.manifest.generation);
    assert.equal((await read.value.getById(fence.contentDomainRootId)).status, "verified-observation");
    const children = await read.value.listByParent("content", fence.contentDomainRootId);
    assert.equal(children.status, "verified-observation");
    await read.value.release();
  }
});

test("D339-04 refuses partial parent coverage without staging or advancing the cursor", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const c = candidate(g("partial-coverage"));
  const bad = { ...c, coverage: c.coverage.filter(x => x.domain !== "content") };
  const result = await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(bad), storage)
    .publishBaseline(fence, c.manifest.generation);
  assert.equal(result.status, "unknown");
  const authority = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status === "trusted") assert.equal(authority.state.changeCursor ?? null, null);
});

test("D339-04 rejects unrooted provider inventory before issuing staged writes", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const c = candidate(g("orphaned-baseline"));
  const invalid = { ...c, rows: c.rows.filter(r =>
    r.kind !== "upsert" || r.entity.remoteObjectId !== fence.contentDomainRootId) };
  const result = await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(invalid), storage)
    .publishBaseline(fence, c.manifest.generation);
  assert.equal(result.status, "invalid");
  assert.equal((await storage.openRead()).status, "stale");
});

test("D339-04 duplicate generation cannot publish twice even with the same metadata receipt", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const c = candidate(g("replayed-generation"));
  const coordinator = new VerifiedInventoryBaselineCoordinator(simulatedBaseline(c), storage);
  assert.equal((await coordinator.publishBaseline(fence, c.manifest.generation)).status, "published");
  const retry = await coordinator.publishBaseline(fence, c.manifest.generation);
  assert.notEqual(retry.status, "published");
});

test("D339-04 incremental path fails closed pending predecessor coverage and mask integration", async () => {
  const c = candidate(g("blocked-delta"));
  const store = {} as IndexedDbInventoryObservationStore;
  const result = await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(c), store).publishIncremental();
  assert.equal(result.status, "recovery-required");
});


test("D339-04 full rebaseline atomically replaces the active generation while an earlier reader remains usable", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const first = candidate(g("integrated-first"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), storage)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const old = await storage.openRead();
  assert.equal(old.status, "verified-observation");
  const secondCursor = c("changes:next");
  const second = candidate(g("integrated-second"), secondCursor);
  const updated = await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(second), storage)
    .publishBaseline(fence, second.manifest.generation);
  assert.equal(updated.status, "published");
  const now = await storage.openRead();
  assert.equal(now.status, "verified-observation");
  if (now.status === "verified-observation") {
    assert.equal(now.value.generation, second.manifest.generation);
    await now.value.release();
  }
  if (old.status === "verified-observation") {
    assert.equal(old.value.generation, first.manifest.generation);
    assert.equal((await old.value.getById(fence.contentDomainRootId)).status, "verified-observation");
    await old.value.release();
  }
  const canonical = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(canonical.status, "trusted");
  if (canonical.status === "trusted") assert.equal(canonical.state.changeCursor, secondCursor);
});

test("D339-04 discards stale remote scan if canonical CAS changes before staging", async () => {
  const fixture = candidate(g("racing-scan"));
  const first = {
    status: "trusted-fence" as const,
    value: {
      activeGeneration: null, canonicalCursor: null,
      persistenceRevision: r0, semanticGeneration: s0,
    },
  };
  let checks = 0, stages = 0, publications = 0;
  const racing = {
    publicationSnapshot: async () => ++checks === 1 ? first :
      { status: "trusted-fence" as const,
        value: { ...first.value, persistenceRevision: rev("state:99") } },
    stage: async () => { stages++; return {
      status: "verified-observation" as const, generation: fixture.manifest.generation,
      value: fixture.manifest.generation,
    }; },
    publishAtomically: async () => { publications++; return {
      status: "published" as const,
      generation: fixture.manifest.generation, terminalCursor: cursor1,
    }; },
  } as unknown as Pick<IndexedDbInventoryObservationStore,
    "publicationSnapshot" | "stage" | "publishAtomically">;
  const result = await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(fixture), racing)
    .publishBaseline(fence, fixture.manifest.generation);
  assert.equal(result.status, "stale");
  assert.equal(checks, 2);
  assert.equal(stages, 0);
  assert.equal(publications, 0);
});


/** D339-04B uses a deterministic provider fixture; PHX-CI executes these tests. */
function simulatedDelta(
  base: ReturnType<typeof candidate>,
  next: {
    readonly generation: InventoryGeneration; readonly token: ChangeCursor;
    readonly overlays: readonly InventoryOverlayRecord[];
    readonly changes: readonly import("../src/contracts/google-drive").RemoteChange[];
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
        inputCursor: cursor1, terminalCursor: next.token,
        overlays: [...next.overlays], invalidatedParentIds: [fence.contentDomainRootId],
        coverage: next.partial ? cover.filter(row => row.domain !== "content") : cover,
        learnedChanges: [...next.changes], publishAuthorized: false as const,
      },
    }),
  };
}

function integratedFile(generation: InventoryGeneration, name: string): Extract<InventoryOverlayRecord, { kind: "upsert" }> {
  const remoteObjectId = id("remote:delta-file");
  const path = contractId<"VaultPath">(name);
  return { kind: "upsert", generation, entity: {
    generation, remoteObjectId, parentRemoteObjectId: fence.contentDomainRootId,
    domain: "content", name, kind: "file", logicalPath: path,
    pathValidity: "verified", access: "visible", trashed: false,
    managedRootId: fence.managedRootId, provenanceDomain: "content",
  } };
}

test("D339-04B publishes COW file delta and Changes checkpoint in one authority transaction", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), idb = db.openFactory();
  const store = await seeded(idb);
  const first = candidate(g("integrated-COW-first"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), store)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const previous = await store.openRead();
  assert.equal(previous.status, "verified-observation");
  const gen = g("integrated-COW-next"), terminal = c("changes:2");
  const file = integratedFile(gen, "changed.md");
  const source = simulatedDelta(first, {
    generation: gen, token: terminal, overlays: [file],
    changes: [{ kind: "upsert", entry: {
      path: file.entity.logicalPath!, entityKind: "file",
      remoteObjectId: file.entity.remoteObjectId, trashed: false,
    } }],
  });
  const batchId = contractId<"RemoteIngestionBatchId">("changes:batch2");
  const result = await new VerifiedInventoryBaselineCoordinator(source, store)
    .publishIncremental(fence, gen, batchId);
  assert.equal(result.status, "published");
  const canonical = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(canonical.status, "trusted");
  if (canonical.status === "trusted") {
    assert.equal(canonical.state.changeCursor, terminal);
    assert.equal(canonical.state.learnedRemoteBatches.length, 1);
    assert.equal(canonical.state.learnedRemoteBatches[0].checkpoint.batchId, batchId);
  }
  const restarted = new IndexedDbInventoryObservationStore("device:idb:test", idb);
  const active = await restarted.openRead();
  assert.equal(active.status, "verified-observation");
  if (active.status === "verified-observation") {
    assert.equal(active.value.generation, gen);
    const member = await active.value.getById(file.entity.remoteObjectId);
    assert.equal(member.status, "verified-observation");
    const children = await active.value.listByParent("content", fence.contentDomainRootId);
    assert.equal(children.status, "verified-observation");
    if (children.status === "verified-observation") assert.equal(children.value.length, 1);
    await active.value.release();
  }
  if (previous.status === "verified-observation") {
    assert.equal((await previous.value.getById(file.entity.remoteObjectId)).status, "unknown");
    await previous.value.release();
  }
});

test("D339-04B refuses coverage gaps without learning Changes or altering active generation", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), idb = db.openFactory();
  const store = await seeded(idb);
  const initial = candidate(g("coverage-COW-first"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(initial), store)
    .publishBaseline(fence, initial.manifest.generation)).status, "published");
  const gen = g("coverage-COW-next"), terminal = c("changes:second");
  const changed = integratedFile(gen, "new.md");
  const delta = simulatedDelta(initial, {
    generation: gen, token: terminal, overlays: [changed], changes: [], partial: true,
  });
  const result = await new VerifiedInventoryBaselineCoordinator(delta, store)
    .publishIncremental(fence, gen, contractId<"RemoteIngestionBatchId">("changes:coverage-gap"));
  assert.equal(result.status, "unknown");
  const current = await store.openRead();
  assert.equal(current.status, "verified-observation");
  if (current.status === "verified-observation") {
    assert.equal(current.value.generation, initial.manifest.generation);
    await current.value.release();
  }
  const canonical = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(canonical.status, "trusted");
  if (canonical.status === "trusted") {
    assert.equal(canonical.state.changeCursor, cursor1);
    assert.equal(canonical.state.learnedRemoteBatches.length, 0);
  }
});

test("D339-04B rejects attempted mask without a tracked stable ID", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), idb = db.openFactory();
  const store = await seeded(idb);
  const initial = candidate(g("untracked-mask-first"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(initial), store)
    .publishBaseline(fence, initial.manifest.generation)).status, "published");
  const gen = g("untracked-mask-next");
  const delta = simulatedDelta(initial, {
    generation: gen, token: c("changes:next"),
    overlays: [{ kind: "mask", generation: gen, remoteObjectId: id("not-tracked") }],
    changes: [{ kind: "removed", remoteObjectId: id("not-tracked") }],
  });
  const result = await new VerifiedInventoryBaselineCoordinator(delta, store)
    .publishIncremental(fence, gen, contractId<"RemoteIngestionBatchId">("changes:unknown-mask"));
  assert.equal(result.status, "unknown");
  const active = await store.openRead();
  assert.equal(active.status, "verified-observation");
  if (active.status === "verified-observation") await active.value.release();
});


test("D339-04B known stable-ID mask hides prior row without becoming deletion authority", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const store = await seeded(factory);
  const initial = candidate(g("mask-first"));
  const oldRow = integratedFile(initial.manifest.generation, "old.md");
  initial.rows.push(oldRow);
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(initial), store)
    .publishBaseline(fence, initial.manifest.generation)).status, "published");
  const now = g("mask-next"), terminal = c("changes:masked");
  const masked = simulatedDelta(initial, {
    generation: now, token: terminal,
    overlays: [{ kind: "mask", generation: now, remoteObjectId: oldRow.entity.remoteObjectId }],
    changes: [{ kind: "removed", remoteObjectId: oldRow.entity.remoteObjectId,
      lastKnownPath: oldRow.entity.logicalPath }],
  });
  const result = await new VerifiedInventoryBaselineCoordinator(masked, store).publishIncremental(
    fence, now, contractId<"RemoteIngestionBatchId">("changes:mask-learned"));
  assert.equal(result.status, "published");
  const read = await store.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status === "verified-observation") {
    // A mask means "do not trust this cached ID"; it is not physical deletion proof.
    assert.equal((await read.value.getById(oldRow.entity.remoteObjectId)).status, "unknown");
    const children = await read.value.listByParent("content", fence.contentDomainRootId);
    assert.equal(children.status, "verified-observation");
    if (children.status === "verified-observation") assert.equal(children.value.length, 0);
    await read.value.release();
  }
});
