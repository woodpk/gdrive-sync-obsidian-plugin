import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type ChangeCursor, type DeviceIdentity, type InventoryCoverage,
  type InventoryGeneration, type InventoryGenerationManifest, type InventoryIdentityFence,
  type InventoryOverlayRecord, type PersistenceRevision, type ProtocolVersion,
  type RecoverableOperationIntentV1_1,
  type RemoteObjectId, type SemanticStateGeneration, type VaultIdentity,
} from "../../src/contracts";
import { IndexedDbStateByteStorage } from "../../src/state/indexeddb-state-storage";
import { IndexedDbInventoryAwareStateByteStorage } from "../../src/state/indexeddb-inventory-authority-storage";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import { PersistentSynchronizationStateStore, createInitialAuthorityState } from "../../src/state/persistent-state-store";
import { SynchronizationStateAuthorityAdapter } from "../../src/product/synchronization-adapters";
import { commitTrustedCursorWithCas } from "../../src/product/product-controller-base";
import { persistLearnedRemoteBatch } from "../../src/product/product-controller";
import { VerifiedInventoryBaselineCoordinator } from "../../src/state/verified-inventory-integration";
import type { VerifiedMetadataInventoryReader } from "../../src/drive/verified-metadata-inventory-reader";

/** Deterministic IDB transaction fixture; software validation is executed exclusively by PHX-CI. */
import { FakeDatabase, withRangeOnly, id, c, rev, sem, g, r0, s0, cursor0, cursor1, fence, candidate, seeded, rows, simulatedBaseline, simulatedDelta, integratedFile, assertDurablePair } from "../fixtures/dec339-inventory-idb-fixtures";

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

test("D339-08A atomically refuses altered staged rows before committing the canonical cursor", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), factory = fake.openFactory();
  const storage = await seeded(factory);
  const staged = candidate(g("tampered-before-publication"));
  assert.equal((await storage.stage({
    candidate: staged.manifest, overlays: rows(staged.rows), coverage: rows(staged.coverage),
  })).status, "verified-observation");
  const entities = fake.tables.get("inventory-entities");
  assert.ok(entities);
  const key = JSON.stringify([staged.manifest.generation, fence.contentDomainRootId]);
  const row = entities.records.get(key) as { entity?: Record<string, unknown> } | undefined;
  assert.ok(row?.entity);
  entities.records.set(key, { ...row, entity: { ...row.entity, name: "tampered-stage" } });
  const result = await storage.publishAtomically({
    candidateGeneration: staged.manifest.generation,
    validationReceipt: staged.manifest.validationReceipt,
    expectedActiveGeneration: null,
    expectedAuthorityPersistenceRevision: r0,
    expectedAuthoritySemanticGeneration: s0,
    expectedCanonicalCursor: null,
    nextCanonicalCursor: cursor1,
    fence,
  });
  assert.equal(result.status, "invalid");
  const authority = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status === "trusted") assert.equal(authority.state.changeCursor ?? null, null);
});

test("D339-08A missing persisted entity rows invalidate a sealed inventory read", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const initial = candidate(g("lost-persisted-row"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(initial), storage)
    .publishBaseline(fence, initial.manifest.generation)).status, "published");
  const entities = fake.tables.get("inventory-entities");
  assert.ok(entities);
  assert.equal(entities.records.delete(JSON.stringify([initial.manifest.generation, fence.configDomainRootId])), true);
  const restarted = await new IndexedDbInventoryObservationStore("device:idb:test", idb).openRead();
  assert.equal(restarted.status, "invalid");
  if (restarted.status === "invalid") assert.match(restarted.reason, /row-count/);
});

test("D339-08A same-count persisted entity corruption invalidates a sealed inventory read", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const initial = candidate(g("tampered-persistent-entity"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(initial), storage)
    .publishBaseline(fence, initial.manifest.generation)).status, "published");
  const entities = fake.tables.get("inventory-entities");
  assert.ok(entities);
  const key = JSON.stringify([initial.manifest.generation, fence.contentDomainRootId]);
  const saved = entities.records.get(key) as { entity?: Record<string, unknown> } | undefined;
  assert.ok(saved?.entity);
  entities.records.set(key, { ...saved, entity: { ...saved.entity, name: "corrupted-root" } });
  const restarted = await new IndexedDbInventoryObservationStore("device:idb:test", idb).openRead();
  assert.equal(restarted.status, "invalid");
  if (restarted.status === "invalid") assert.match(restarted.reason, /integrity-mismatch/);
});

test("D339-08A missing persisted coverage rows invalidate a sealed inventory read", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const initial = candidate(g("lost-coverage-row"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(initial), storage)
    .publishBaseline(fence, initial.manifest.generation)).status, "published");
  const coverage = fake.tables.get("inventory-coverage");
  assert.ok(coverage);
  assert.equal(coverage.records.delete(JSON.stringify([
    initial.manifest.generation, "content", "parent", fence.contentDomainRootId,
  ])), true);
  const restarted = await new IndexedDbInventoryObservationStore("device:idb:test", idb).openRead();
  assert.equal(restarted.status, "invalid");
  if (restarted.status === "invalid") assert.match(restarted.reason, /row-count/);
});

test("D339-08A full reconstruction accepts unchanged cursor after inventory invalidation", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), idb = fake.openFactory();
  const storage = await seeded(idb);
  const first = candidate(g("equal-cursor-original"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), storage)
    .publishBaseline(fence, first.manifest.generation)).status, "published");

  // Canonical authority is still trusted, but the observational active pointer
  // has been invalidated. No remote change is needed to rebuild its coverage.
  const controlTable = fake.tables.get("inventory-control");
  assert.ok(controlTable);
  const key = JSON.stringify("active");
  const previous = controlTable.records.get(key) as Record<string, unknown> | undefined;
  assert.ok(previous);
  controlTable.records.set(key, { ...previous, status: "invalid", reason: "reconstruct" });
  assert.notEqual((await storage.openRead()).status, "verified-observation");

  const replacement = candidate(g("equal-cursor-replacement"), cursor1);
  const result = await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(replacement), storage)
    .publishBaseline(fence, replacement.manifest.generation);
  assert.equal(result.status, "published");
  const active = await new IndexedDbInventoryObservationStore("device:idb:test", idb).openRead();
  assert.equal(active.status, "verified-observation");
  if (active.status === "verified-observation") {
    assert.equal(active.value.generation, replacement.manifest.generation);
    await active.value.release();
  }
  const canonical = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(canonical.status, "trusted");
  if (canonical.status === "trusted") assert.equal(canonical.state.changeCursor, cursor1);
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

/** Assert the persisted canonical cursor and active generation as one accepted pair. */


test("WS-02 appendLearnedRemoteBatch cursor writer invalidates an active inventory atomically", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("ws02-learned-batch-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), inventory)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const before = await inventory.openRead();
  assert.equal(before.status, "verified-observation");
  if (before.status === "verified-observation") await before.value.release();

  const canonical = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory));
  const authority = await canonical.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") return;

  const nextCursor = c("changes:ws02-learned-batch");
  const batch = {
    checkpoint: {
      batchId: contractId<"RemoteIngestionBatchId">("ws02-batch"),
      startingToken: cursor1,
      terminalStartToken: nextCursor,
      persistenceRevision: authority.state.persistenceRevision,
      status: "learned" as const,
    },
    changes: [],
  };
  const learned = await canonical.appendLearnedRemoteBatch(
    batch, authority.state.persistenceRevision, authority.state.semanticGeneration);
  assert.equal(learned.status, "saved");
  const after = await canonical.loadAuthority();
  assert.equal(after.status, "trusted");
  if (after.status !== "trusted") return;
  assert.equal(after.state.changeCursor, nextCursor);
  assert.equal(after.state.learnedRemoteBatches.length, 1);
  assert.equal(after.state.learnedRemoteBatches[0].checkpoint.batchId, batch.checkpoint.batchId);
  assert.equal((await inventory.openRead()).status, "stale",
    "legacy cursor progress must never leave the old inventory actionable");

  const pointer = await inventory.publicationSnapshot(fence);
  assert.equal(pointer.status, "trusted-fence");
  if (pointer.status === "trusted-fence") {
    assert.equal(pointer.value.activeGeneration, null);
    assert.equal(pointer.value.canonicalCursor, nextCursor);
  }
});


test("WS-02 BU-02 v2-aware legacy authority reopens upgraded pairing without reactivation", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const legacy = new IndexedDbStateByteStorage("device:idb:test", factory);
  const state = new PersistentSynchronizationStateStore(legacy);
  const initial = createInitialAuthorityState({
    persistenceRevision: r0, semanticGeneration: s0,
    vaultIdentity: fence.vaultIdentity, deviceIdentity: fence.deviceIdentity,
  });
  assert.equal((await state.saveTrusted(initial)).status, "saved");
  const canonicalBytes = await legacy.read();
  assert.ok(canonicalBytes);
  const backupKey = await legacy.backup(canonicalBytes!);
  // The FakeDatabase does not autonomously deliver browser versionchange
  // events. Model the old connection receiving the upgrade notification before
  // upgrading v1 to v2, as production IndexedDB would.
  const originalConnection = db.lastOpened;
  assert.ok(originalConnection);
  assert.equal(typeof originalConnection.onversionchange, "function");
  originalConnection.onversionchange?.call(originalConnection, {} as IDBVersionChangeEvent);
  assert.equal(db.closeCount, 1, "legacy connection must release its version-1 handle");
  const inventory = new IndexedDbInventoryObservationStore("device:idb:test", factory);
  const staged = candidate(g("ws02-bu02-legacy-rollback"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(staged), inventory).publishBaseline(fence, staged.manifest.generation)
  ).status, "published");
  assert.equal(db.version, 2);
  await assert.rejects(legacy.read(), /VersionError/,
    "v1-only rollback remains unsafe after the additive schema upgrade");
  assert.deepEqual(db.tables.get("sync-state")?.records.get(JSON.stringify(backupKey)), canonicalBytes,
    "v2 upgrade must retain pre-upgrade backup records");
  const byteStorage = new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory);
  const canonical = new PersistentSynchronizationStateStore(byteStorage);
  const loaded = await canonical.loadAuthority();
  assert.equal(loaded.status, "trusted", "version-aware legacy mode must read the real canonical authority");
  if (loaded.status !== "trusted") return;
  assert.equal(loaded.state.vaultIdentity, initial.vaultIdentity);
  assert.equal(loaded.state.deviceIdentity, initial.deviceIdentity);
  assert.equal(loaded.state.changeCursor, cursor1);
  assert.deepEqual(loaded.state.base, initial.base);
  assert.deepEqual(loaded.state.operationIntents, initial.operationIntents);

  const saved = await canonical.saveAuthority({
    ...loaded.state, changeCursor: c("changes:legacy-advance"),
  }, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
  assert.equal(saved.status, "saved");
  const restarted = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)
  ).loadAuthority();
  assert.equal(restarted.status, "trusted");
  if (restarted.status !== "trusted") return;
  assert.equal(restarted.state.changeCursor, c("changes:legacy-advance"));
  assert.deepEqual(restarted.state.base, loaded.state.base);
  assert.deepEqual(restarted.state.operationIntents, loaded.state.operationIntents);
  assert.equal((await inventory.openRead()).status, "stale",
    "legacy cursor advance cannot retain an actionable stale inventory");
  const pointer = await inventory.publicationSnapshot(fence);
  assert.equal(pointer.status, "trusted-fence");
  if (pointer.status === "trusted-fence") {
    assert.equal(pointer.value.activeGeneration, null);
    assert.equal(pointer.value.canonicalCursor, c("changes:legacy-advance"));
  }
});

test("WS-02 BU-02 stale legacy CAS does not advance cursor or invalidate an accepted inventory", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("ws02-bu02-stale-cas"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(baseline), inventory
  ).publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const canonicalBytes = new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory);
  const stale = await canonicalBytes.read();
  assert.ok(stale);
  const writer = new PersistentSynchronizationStateStore(canonicalBytes);
  const first = await writer.loadAuthority();
  assert.equal(first.status, "trusted");
  if (first.status !== "trusted") return;
  assert.equal((await writer.saveAuthority({
    ...first.state, learnedRemoteReductions: first.state.learnedRemoteReductions,
  }, first.state.persistenceRevision, first.state.semanticGeneration)).status, "saved");
  const stalePayload = new TextEncoder().encode("stale-writer-must-not-persist");
  assert.equal(await canonicalBytes.compareAndSwap(stale, stalePayload), false);
  const trusted = await writer.loadAuthority();
  assert.equal(trusted.status, "trusted");
  if (trusted.status === "trusted") assert.equal(trusted.state.changeCursor, cursor1);
  const pointer = await inventory.publicationSnapshot(fence);
  assert.equal(pointer.status, "stale",
    "the canonical revision change must not preserve a falsely complete inventory proof");
  assert.equal((await inventory.openRead()).status, "stale");
  assert.notDeepEqual(await canonicalBytes.read(), stalePayload);
});


test("WS-02 BU-02 version-aware rollback retains a pending effect across cursor advancement", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("ws02-bu02-pending-intent"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(baseline), inventory
  ).publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const writer = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory));
  const first = await writer.loadAuthority();
  assert.equal(first.status, "trusted");
  if (first.status !== "trusted") return;
  const target = contractId<"VaultPath">("parent/pending-folder");
  const intentId = contractId<"MutationIntentId">("ws02-bu02-pending-intent");
  const intent: RecoverableOperationIntentV1_1 = {
    logicalKind: "single-effect" as const,
    operationId: contractId<"OperationId">("ws02-bu02-pending-op"),
    intentId,
    semanticAuthority: { generation: first.state.semanticGeneration },
    effects: [{
      effectId: "ws02-pending-effect",
      descriptor: {
        kind: "local-folder-create" as const,
        targetSide: "local" as const,
        mutationKind: "create" as const,
        intentId,
        targetPath: target,
        pathAuthority: {
          generation: first.state.semanticGeneration,
          targetPath: target,
          parentPath: contractId<"VaultPath">("parent"),
          pathComparisonKey: "parent/pending-folder",
          expectedTarget: "absent" as const,
        },
      },
      stage: "intent-persisted" as const,
    }],
  };
  const recorded = await writer.persistOperationIntent(
    intent, first.state.persistenceRevision, first.state.semanticGeneration);
  assert.equal(recorded.status, "saved");
  const afterIntent = await writer.loadAuthority();
  assert.equal(afterIntent.status, "trusted");
  if (afterIntent.status !== "trusted") return;
  const nextCursor = c("changes:pending-effect-advance");
  assert.equal((await writer.saveAuthority({
    ...afterIntent.state, changeCursor: nextCursor,
  }, afterIntent.state.persistenceRevision, afterIntent.state.semanticGeneration)).status, "saved");
  const restart = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory));
  const loaded = await restart.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  assert.equal(loaded.state.changeCursor, nextCursor);
  assert.deepEqual(loaded.state.operationIntents, [intent],
    "cursor advancement cannot drop a previously committed operation intent");
  assert.equal((await inventory.openRead()).status, "stale");
});


test("WS-02 BU-02 production-compatible byte adapter does not silently upgrade a v1 pairing", async () => {
  const db = new FakeDatabase(), factory = db.openFactory();
  await seeded(factory);
  assert.equal(db.version, 1);
  const legacy = new IndexedDbStateByteStorage("device:idb:test", factory);
  const original = await legacy.read();
  assert.ok(original);
  const compatible = new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory);
  assert.deepEqual(await compatible.read(), original);
  assert.equal(db.version, 1, "legacy mode must not perform an inventory schema migration");
  assert.equal(db.tables.has("inventory-control"), false,
    "a compatible open must not create the inventory control store");
  const authority = await new PersistentSynchronizationStateStore(compatible).loadAuthority();
  assert.equal(authority.status, "trusted");
  assert.deepEqual(await legacy.read(), original,
    "v1 binary remains compatible until an expressly authorized v2 upgrade occurs");
});


test("WS-02 BU-02 shipping state authority adapter mirrors cursor through v2-compatible storage", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("ws02-bu02-product-cursor-mirror"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(baseline), inventory
  ).publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const raw = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory));
  const product = new SynchronizationStateAuthorityAdapter(raw);
  const context = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: fence.vaultIdentity,
    expectedDeviceIdentity: fence.deviceIdentity,
  };
  const original = await product.load(context);
  assert.equal(original.status, "trusted");
  if (original.status !== "trusted") return;
  const saved = await product.saveTrusted({
    ...original.state,
    changeCursor: c("changes:product-cursor-mirror"),
  }, original.state.stateRevision);
  assert.equal(saved.status, "saved");
  const canonical = await raw.loadAuthority();
  assert.equal(canonical.status, "trusted");
  if (canonical.status !== "trusted") return;
  assert.equal(canonical.state.changeCursor, c("changes:product-cursor-mirror"));
  assert.equal(canonical.state.vaultIdentity, fence.vaultIdentity);
  assert.equal(canonical.state.deviceIdentity, fence.deviceIdentity);
  assert.equal((await inventory.openRead()).status, "stale");
  const pointer = await inventory.publicationSnapshot(fence);
  assert.equal(pointer.status, "trusted-fence");
  if (pointer.status === "trusted-fence") {
    assert.equal(pointer.value.activeGeneration, null);
    assert.equal(pointer.value.canonicalCursor, c("changes:product-cursor-mirror"));
  }
});


test("WS-02 BU-05 stale learned-batch cursor writer cannot overwrite newer canonical authority", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("ws02-bu05-stale-writer"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(baseline), inventory).publishBaseline(fence, baseline.manifest.generation)
  ).status, "published");
  const writer = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory));
  const stale = await writer.loadAuthority();
  assert.equal(stale.status, "trusted");
  if (stale.status !== "trusted") return;
  const current = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory));
  const saved = await current.saveAuthority({
    ...stale.state, changeCursor: c("changes:ws02-bu05-winner"),
  }, stale.state.persistenceRevision, stale.state.semanticGeneration);
  assert.equal(saved.status, "saved");
  const batch = {
    checkpoint: {
      batchId: contractId<"RemoteIngestionBatchId">("ws02-bu05-stale-batch"),
      startingToken: cursor1,
      terminalStartToken: c("changes:ws02-bu05-loser"),
      persistenceRevision: stale.state.persistenceRevision,
      status: "learned" as const,
    },
    changes: [],
  };
  const refused = await writer.appendLearnedRemoteBatch(
    batch, stale.state.persistenceRevision, stale.state.semanticGeneration);
  assert.equal(refused.status, "stale-persistence");
  const restarted = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(restarted.status, "trusted");
  if (restarted.status !== "trusted") return;
  assert.equal(restarted.state.changeCursor, c("changes:ws02-bu05-winner"));
  assert.equal(restarted.state.learnedRemoteBatches.length, 0);
  assert.deepEqual(restarted.state.base, stale.state.base);
  assert.deepEqual(restarted.state.operationIntents, stale.state.operationIntents);
  assert.equal((await inventory.openRead()).status, "stale",
    "stale inventory cannot authorize observations after the winning cursor write");
  const pointer = await inventory.publicationSnapshot(fence);
  assert.equal(pointer.status, "trusted-fence");
  if (pointer.status === "trusted-fence") assert.equal(pointer.value.activeGeneration, null);
});

test("WS-02 BU-05 recovery of corrupted version-aware canonical state is backup-first and invalidates inventory", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("ws02-bu05-recovery-backup"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(baseline), inventory).publishBaseline(fence, baseline.manifest.generation)
  ).status, "published");
  const bytes = new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory);
  const state = new PersistentSynchronizationStateStore(bytes);
  const before = await state.loadAuthority();
  assert.equal(before.status, "trusted");
  if (before.status !== "trusted") return;
  const oldBytes = await bytes.read();
  assert.ok(oldBytes);
  const originalBackup = await state.createRecoveryBackup();
  assert.deepEqual(db.tables.get("sync-state")?.records.get(JSON.stringify(originalBackup.backupId)), oldBytes);
  const corrupt = new TextEncoder().encode("ws02-bu05-corrupt-envelope");
  await bytes.write(corrupt);
  assert.equal((await inventory.openRead()).status, "stale");
  assert.equal((await state.loadAuthority()).status, "recovery-required");
  const restored = await state.replaceRecoveryState(before.state, {
    expectation: "existing-pairing",
    expectedVaultIdentity: fence.vaultIdentity,
    expectedDeviceIdentity: fence.deviceIdentity,
  });
  assert.equal(restored.status, "replaced");
  if (restored.status === "replaced") {
    assert.deepEqual(db.tables.get("sync-state")?.records.get(JSON.stringify(restored.backup.backupId)), corrupt,
      "recovery replacement must back up exact bad bytes before writing");
  }
  const restarted = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(restarted.status, "trusted");
  if (restarted.status !== "trusted") return;
  assert.equal(restarted.state.changeCursor, before.state.changeCursor);
  assert.deepEqual(restarted.state.base, before.state.base);
  assert.deepEqual(restarted.state.operationIntents, before.state.operationIntents);
  assert.equal(restarted.state.deviceIdentity, before.state.deviceIdentity);
  assert.equal(restarted.state.vaultIdentity, before.state.vaultIdentity);
  assert.deepEqual(db.tables.get("sync-state")?.records.get(JSON.stringify(originalBackup.backupId)), oldBytes,
    "pre-recovery canonical backup must remain untouched");
  assert.equal((await inventory.openRead()).status, "stale",
    "restoring canonical authority cannot silently reactivate a prior inventory generation");
});


test("WS-02 BU-05 shipping commitCursor path refuses stale predecessor and preserves winning cursor", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("bu05-shipping-cursor"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(baseline), inventory).publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const context = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: fence.vaultIdentity,
    expectedDeviceIdentity: fence.deviceIdentity,
  };
  const adapter = new SynchronizationStateAuthorityAdapter(
    new PersistentSynchronizationStateStore(
      new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)));
  const winner = c("changes:bu05-shipping-winner");
  const loser = c("changes:bu05-shipping-loser");
  assert.equal(await commitTrustedCursorWithCas(adapter, context, winner, cursor1), "saved");
  assert.equal(await commitTrustedCursorWithCas(adapter, context, loser, cursor1), "refused",
    "a complete older snapshot cannot regress the opaque canonical cursor after another run commits");
  const restarted = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(restarted.status, "trusted");
  if (restarted.status === "trusted") assert.equal(restarted.state.changeCursor, winner);
  assert.equal((await inventory.openRead()).status, "stale");
  const pointer = await inventory.publicationSnapshot(fence);
  assert.equal(pointer.status, "trusted-fence");
  if (pointer.status === "trusted-fence") assert.equal(pointer.value.activeGeneration, null);
});

test("WS-02 BU-05 shipping Changes-learning writer refuses unrelated cursor and conflicting batch replay", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const inventory = await seeded(factory);
  const baseline = candidate(g("bu05-shipping-learning"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(
    simulatedBaseline(baseline), inventory).publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const stateStore = new SynchronizationStateAuthorityAdapter(
    new PersistentSynchronizationStateStore(
      new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)));
  const context = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: fence.vaultIdentity,
    expectedDeviceIdentity: fence.deviceIdentity,
  };
  const makeBatch = (batchId: string, start: ChangeCursor, end: ChangeCursor) => ({
    checkpoint: {
      batchId: contractId<"RemoteIngestionBatchId">(batchId),
      startingToken: start,
      terminalStartToken: end,
      persistenceRevision: r0,
      status: "learned" as const,
    },
    changes: [],
  });
  const first = makeBatch("bu05-learning-first", cursor1, c("changes:bu05-learned"));
  const assembly = (remoteChangeBatch: typeof first) => ({ remoteChangeBatch } as never);
  await persistLearnedRemoteBatch(assembly(first), stateStore, { stateStore, stateContext: context });
  const previous = await stateStore.loadAuthority();
  assert.equal(previous.status, "trusted");
  if (previous.status !== "trusted") return;
  assert.equal(previous.state.changeCursor, first.checkpoint.terminalStartToken);
  assert.equal(previous.state.learnedRemoteBatches.length, 1);
  await assert.rejects(
    persistLearnedRemoteBatch(assembly(makeBatch("bu05-learning-stale", cursor1, c("changes:bu05-stale"))),
      stateStore, { stateStore, stateContext: context }),
    /unrelated durable cursor/,
  );
  await assert.rejects(
    persistLearnedRemoteBatch(assembly(makeBatch("bu05-learning-first", cursor1, c("changes:bu05-tampered"))),
      stateStore, { stateStore, stateContext: context }),
    /incompatible cursor tokens/,
  );
  const restored = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(restored.status, "trusted");
  if (restored.status === "trusted") {
    assert.equal(restored.state.changeCursor, first.checkpoint.terminalStartToken);
    assert.equal(restored.state.learnedRemoteBatches.length, 1);
  }
  assert.equal((await inventory.openRead()).status, "stale");
});

test("WS-02 BU-05 recovery replacement refuses wrong pairing before backup or CAS", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  await seeded(factory);
  const byteStore = new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory);
  const store = new PersistentSynchronizationStateStore(byteStore);
  const original = await store.loadAuthority();
  assert.equal(original.status, "trusted");
  if (original.status !== "trusted") return;
  const corrupt = new TextEncoder().encode("bu05-invalid-envelope");
  await byteStore.write(corrupt);
  const backupCount = db.tables.get("sync-state")?.records.size;
  const matching = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: fence.vaultIdentity,
    expectedDeviceIdentity: fence.deviceIdentity,
  };
  const wrongVault = { ...matching, expectedVaultIdentity: contractId<"VaultIdentity">("wrong-vault") };
  const wrongDevice = { ...matching, expectedDeviceIdentity: contractId<"DeviceIdentity">("wrong-device") };
  assert.equal((await store.replaceRecoveryState(original.state, wrongVault)).status, "recovery-required");
  assert.equal((await store.replaceRecoveryState(original.state, wrongDevice)).status, "recovery-required");
  assert.equal((await store.replaceRecoveryState(original.state, { expectation: "existing-pairing" })).status, "recovery-required");
  assert.deepEqual(await byteStore.read(), corrupt);
  assert.equal(db.tables.get("sync-state")?.records.size, backupCount,
    "invalid identity must not emit a backup or modify canonical authority");
  assert.equal((await store.replaceRecoveryState(original.state, matching)).status, "replaced");
  assert.equal((await store.loadAuthority()).status, "trusted");
});
