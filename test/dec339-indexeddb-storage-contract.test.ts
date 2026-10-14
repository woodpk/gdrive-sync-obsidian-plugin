import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type ChangeCursor, type DurableRemoteChangeBatch,
  type PersistenceRevision, type SemanticStateGeneration,
  type VaultIdentity, type DeviceIdentity,
} from "../src/contracts";
import {
  createInitialAuthorityState, inspectInventoryAuthorityFence, MemoryStateByteStorage,
  PersistentSynchronizationStateStore, prepareInventoryAuthorityPublication,
} from "../src/state/persistent-state-store";

const revision = (s: string) => contractId<"StateRevision">(s) as PersistenceRevision;
const semantic = (s: string) => contractId<"SemanticStateGeneration">(s) as SemanticStateGeneration;
const cursor = (s: string) => contractId<"ChangeCursor">(s) as ChangeCursor;
const p1 = revision("state:1");
const sem1 = semantic("semantic:1");
const c1 = cursor("changes:1"), c2 = cursor("changes:2");

async function authorityBytes(): Promise<Uint8Array> {
  const backing = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(backing);
  const state = createInitialAuthorityState({
    persistenceRevision: p1, semanticGeneration: sem1,
    vaultIdentity: contractId<"VaultIdentity">("vault:storage") as VaultIdentity,
    deviceIdentity: contractId<"DeviceIdentity">("device:storage") as DeviceIdentity,
  });
  assert.equal((await store.saveTrusted(state)).status, "saved");
  const bytes = await backing.read();
  assert.ok(bytes);
  return bytes;
}
function batch(): DurableRemoteChangeBatch {
  return { checkpoint: { batchId: contractId<"RemoteIngestionBatchId">("batch:test"),
    startingToken: c1, terminalStartToken: c2,
    persistenceRevision: revision("state:2"), status: "learned" }, changes: [] };
}

test("inventory baseline cursor change is prepared but not persisted by the pure authority helper", async () => {
  const source = await authorityBytes();
  const prepared = prepareInventoryAuthorityPublication(source, {
    persistenceRevision: p1, semanticGeneration: sem1, canonicalCursor: null,
    terminalCursor: c1, mode: "baseline",
  });
  assert.equal(prepared.status, "prepared");
  if (prepared.status !== "prepared") return;
  assert.equal(prepared.persistenceRevision, revision("state:2"));
  assert.equal(prepared.semanticGeneration, semantic("semantic:2"));
  const before = inspectInventoryAuthorityFence(source);
  const after = inspectInventoryAuthorityFence(prepared.replacement);
  assert.equal(before.status, "trusted");
  assert.equal(after.status, "trusted");
  if (before.status === "trusted") assert.equal(before.canonicalCursor, null);
  if (after.status === "trusted") {
    assert.equal(after.canonicalCursor, c1);
    assert.equal(after.persistenceRevision, revision("state:2"));
  }
});

test("incremental learned batch is appended with the matching terminal cursor in prepared bytes", async () => {
  const baseline = prepareInventoryAuthorityPublication(await authorityBytes(), {
    persistenceRevision: p1, semanticGeneration: sem1, canonicalCursor: null,
    terminalCursor: c1, mode: "baseline",
  });
  assert.equal(baseline.status, "prepared");
  if (baseline.status !== "prepared") return;
  const updated = prepareInventoryAuthorityPublication(baseline.replacement, {
    persistenceRevision: baseline.persistenceRevision, semanticGeneration: baseline.semanticGeneration,
    canonicalCursor: c1, terminalCursor: c2, mode: "incremental", learnedBatch: batch(),
  });
  assert.equal(updated.status, "prepared");
  if (updated.status !== "prepared") return;
  const copy = new MemoryStateByteStorage();
  copy.bytes = updated.replacement;
  const loaded = await new PersistentSynchronizationStateStore(copy).loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.changeCursor, c2);
    assert.equal(loaded.state.learnedRemoteBatches.length, 1);
    assert.equal(loaded.state.learnedRemoteBatches[0].checkpoint.terminalStartToken, c2);
  }
});

test("stale CAS, stale cursor, and wrong semantic generation cannot publish a cursor", async () => {
  const source = await authorityBytes();
  const expected = { persistenceRevision: p1, semanticGeneration: sem1,
    canonicalCursor: null, terminalCursor: c1, mode: "baseline" as const };
  assert.equal(prepareInventoryAuthorityPublication(source, {
    ...expected, persistenceRevision: revision("state:0"),
  }).status, "stale");
  assert.equal(prepareInventoryAuthorityPublication(source, {
    ...expected, semanticGeneration: semantic("semantic:0"),
  }).status, "stale");
  assert.equal(prepareInventoryAuthorityPublication(source, {
    ...expected, canonicalCursor: c2,
  }).status, "stale");
});

test("a bad, absent, corrupted or historical authority envelope is never adopted", async () => {
  const expected = { persistenceRevision: p1, semanticGeneration: sem1,
    canonicalCursor: null, terminalCursor: c1, mode: "baseline" as const };
  assert.equal(prepareInventoryAuthorityPublication(undefined, expected).status, "recovery-required");
  assert.equal(prepareInventoryAuthorityPublication(new TextEncoder().encode("corrupt"), expected).status, "recovery-required");
  const original = await authorityBytes();
  const corrupted = original.slice();
  corrupted[corrupted.length - 4] ^= 1;
  assert.equal(prepareInventoryAuthorityPublication(corrupted, expected).status, "recovery-required");
});

test("inconsistent/duplicate/unsupplied incremental batch and baseline batch misuse fail closed", async () => {
  const source = await authorityBytes();
  const base = prepareInventoryAuthorityPublication(source, {
    persistenceRevision: p1, semanticGeneration: sem1, canonicalCursor: null,
    terminalCursor: c1, mode: "baseline",
  });
  assert.equal(base.status, "prepared");
  if (base.status !== "prepared") return;
  const args = { persistenceRevision: base.persistenceRevision,
    semanticGeneration: base.semanticGeneration,
    canonicalCursor: c1, terminalCursor: c2, mode: "incremental" as const };
  assert.equal(prepareInventoryAuthorityPublication(base.replacement, args).status, "recovery-required");
  assert.equal(prepareInventoryAuthorityPublication(base.replacement, { ...args,
    learnedBatch: { ...batch(), checkpoint: { ...batch().checkpoint, startingToken: c2 } },
  }).status, "recovery-required");
  assert.equal(prepareInventoryAuthorityPublication(source, {
    persistenceRevision: p1, semanticGeneration: sem1, canonicalCursor: null,
    terminalCursor: c1, mode: "baseline", learnedBatch: batch(),
  }).status, "recovery-required");
});

test("inspected authority bytes preserve vault/device identity and do not invent mutation proofs", async () => {
  const inspected = inspectInventoryAuthorityFence(await authorityBytes());
  assert.equal(inspected.status, "trusted");
  if (inspected.status === "trusted") {
    assert.equal(inspected.vaultIdentity, "vault:storage");
    assert.equal(inspected.deviceIdentity, "device:storage");
    assert.equal(inspected.unresolvedEffects, false);
  }
});
