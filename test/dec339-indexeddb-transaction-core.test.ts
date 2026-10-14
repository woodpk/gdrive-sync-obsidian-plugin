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
import { FakeDatabase, withRangeOnly, id, c, rev, sem, g, r0, s0, cursor0, cursor1, fence, candidate, seeded, rows, simulatedBaseline, simulatedDelta, integratedFile, assertDurablePair } from "./support/dec339-inventory-idb-fixtures";

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
