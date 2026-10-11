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
