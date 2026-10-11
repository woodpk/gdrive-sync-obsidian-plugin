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

test("D339-07B1 A02 aborted baseline publication does not commit cursor or active generation", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), idb = db.openFactory(), store = await seeded(idb);
  const first = candidate(g("abort-baseline"));
  assert.equal((await store.stage({ candidate: first.manifest, overlays: rows(first.rows),
    coverage: rows(first.coverage) })).status, "verified-observation");
  db.abortNextPublication = true;
  const result = await store.publishAtomically({
    candidateGeneration: first.manifest.generation, validationReceipt: first.manifest.validationReceipt,
    expectedActiveGeneration: null, expectedAuthorityPersistenceRevision: r0,
    expectedAuthoritySemanticGeneration: s0, expectedCanonicalCursor: null,
    nextCanonicalCursor: cursor1, fence,
  });
  assert.equal(result.status, "recovery-required");
  assert.equal(db.abortNextPublication, false);
  assert.deepEqual(new Set(db.abortedPublicationStores), new Set([
    "sync-state", "inventory-control", "inventory-generations",
    "inventory-stage", "inventory-coverage", "inventory-entities",
  ]));
  await assertDurablePair(idb, null, null);
  assert.equal((await new IndexedDbInventoryObservationStore("device:idb:test", idb)
    .openRead()).status, "stale");
});

test("D339-07B1 A02 aborted delta publication rolls back learned batch and generation", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), idb = db.openFactory(), store = await seeded(idb);
  const first = candidate(g("abort-delta-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), store)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const next = g("abort-delta-next"), terminal = c("changes:2");
  const file = integratedFile(next, "uncommitted.md");
  db.abortNextPublication = true;
  const result = await new VerifiedInventoryBaselineCoordinator(simulatedDelta(first, {
    generation: next, token: terminal, overlays: [file], changes: [],
  }), store).publishIncremental(fence, next, contractId<"RemoteIngestionBatchId">("abort-batch"));
  assert.equal(result.status, "recovery-required");
  assert.equal(db.abortNextPublication, false);
  assert.deepEqual(new Set(db.abortedPublicationStores), new Set([
    "sync-state", "inventory-control", "inventory-generations",
    "inventory-stage", "inventory-coverage", "inventory-entities",
  ]));
  await assertDurablePair(idb, first.manifest.generation, cursor1);
  const restart = await new IndexedDbInventoryObservationStore("device:idb:test", idb).openRead();
  assert.equal(restart.status, "verified-observation");
  if (restart.status === "verified-observation") {
    assert.equal(restart.value.generation, first.manifest.generation);
    assert.equal((await restart.value.getById(file.entity.remoteObjectId)).status, "unknown");
    await restart.value.release();
  }
});

test("D339-07B1 A02 canonical writer races staged publish and invalidates cached cursor", async () => {
  withRangeOnly();
  const idb = new FakeDatabase().openFactory(), store = await seeded(idb);
  const first = candidate(g("writer-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), store)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const second = candidate(g("writer-next"), c("changes:next"));
  assert.equal((await store.stage({ candidate: second.manifest, overlays: rows(second.rows),
    coverage: rows(second.coverage) })).status, "verified-observation");
  const authority = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb));
  const before = await authority.loadAuthority();
  assert.equal(before.status, "trusted");
  if (before.status !== "trusted") return;
  const external = c("changes:outside-inventory");
  assert.equal((await authority.saveAuthority({ ...before.state, changeCursor: external },
    before.state.persistenceRevision, before.state.semanticGeneration)).status, "saved");
  const attempt = await store.publishAtomically({
    candidateGeneration: second.manifest.generation, validationReceipt: second.manifest.validationReceipt,
    expectedActiveGeneration: first.manifest.generation,
    expectedAuthorityPersistenceRevision: before.state.persistenceRevision,
    expectedAuthoritySemanticGeneration: before.state.semanticGeneration,
    expectedCanonicalCursor: cursor1, nextCanonicalCursor: second.manifest.terminalCursor, fence,
  });
  assert.notEqual(attempt.status, "published");
  const after = await authority.loadAuthority();
  assert.equal(after.status, "trusted");
  if (after.status === "trusted") assert.equal(after.state.changeCursor, external);
  assert.equal((await new IndexedDbInventoryObservationStore("device:idb:test", idb)
    .openRead()).status, "stale");
});

test("D339-07B1 A01 two COW generations mask ancestor without affecting pinned readers", async () => {
  withRangeOnly();
  const idb = new FakeDatabase().openFactory(), store = await seeded(idb);
  const first = candidate(g("chain-base"));
  const old = integratedFile(first.manifest.generation, "original.md");
  first.rows.push(old);
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), store)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const pinned = await store.openRead();
  assert.equal(pinned.status, "verified-observation");
  const second = g("chain-delta-1"), token2 = c("changes:2");
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedDelta(first, {
    generation: second, token: token2, overlays: [integratedFile(second, "renamed.md")], changes: [],
  }), store).publishIncremental(fence, second,
    contractId<"RemoteIngestionBatchId">("chain-1"))).status, "published");
  const prior = await store.openRead();
  assert.equal(prior.status, "verified-observation");
  const third = g("chain-delta-2"), token3 = c("changes:3");
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedDelta(first, {
    generation: third, inputCursor: token2, token: token3,
    overlays: [{ kind: "mask", generation: third, remoteObjectId: old.entity.remoteObjectId }],
    changes: [],
  }), store).publishIncremental(fence, third,
    contractId<"RemoteIngestionBatchId">("chain-2"))).status, "published");
  await assertDurablePair(idb, third, token3, 2);
  const current = await new IndexedDbInventoryObservationStore("device:idb:test", idb).openRead();
  assert.equal(current.status, "verified-observation");
  if (current.status === "verified-observation") {
    assert.equal((await current.value.getById(old.entity.remoteObjectId)).status, "unknown");
    const children = await current.value.listByParent("content", fence.contentDomainRootId);
    assert.equal(children.status, "verified-observation");
    if (children.status === "verified-observation") assert.equal(children.value.length, 0);
    await current.value.release();
  }
  for (const lease of [pinned, prior]) {
    assert.equal(lease.status, "verified-observation");
    if (lease.status === "verified-observation") {
      assert.equal((await lease.value.getById(old.entity.remoteObjectId)).status, "verified-observation");
      await lease.value.release();
    }
  }
});

test("D339-07B1 A01 lost ancestor rejects inventory instead of fabricating empty rows", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), idb = db.openFactory(), store = await seeded(idb);
  const first = candidate(g("missing-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), store)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const second = g("missing-child"), token2 = c("changes:2");
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedDelta(first, {
    generation: second, token: token2, overlays: [integratedFile(second, "new.md")], changes: [],
  }), store).publishIncremental(fence, second,
    contractId<"RemoteIngestionBatchId">("missing-batch"))).status, "published");
  db.tables.get("inventory-generations")!.records.delete(JSON.stringify(String(first.manifest.generation)));
  assert.equal((await new IndexedDbInventoryObservationStore("device:idb:test", idb)
    .openRead()).status, "invalid");
  const authority = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status === "trusted") assert.equal(authority.state.changeCursor, token2);
});

test("D339-07B1 A08 rejected v1 open leaves upgraded canonical bytes and cursor intact", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), idb = db.openFactory(), store = await seeded(idb);
  const first = candidate(g("v2-preserved"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), store)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const reader = new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb);
  const before = await reader.read();
  assert.ok(before);
  await assert.rejects(new IndexedDbStateByteStorage("device:idb:test", idb).read(), /VersionError/);
  assert.equal(db.version, 2);
  assert.deepEqual(await reader.read(), before);
  await assertDurablePair(idb, first.manifest.generation, cursor1);
});
