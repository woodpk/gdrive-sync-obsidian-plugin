import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type ChangeCursor, type CheckpointId, type DeviceIdentity, type OperationId, type PlannedOperation, type StateRevision, type TrustedSynchronizationState, type VaultIdentity, type VaultPath } from "../src/contracts";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { CoreRunCoordinator, InMemoryRunLeasePort } from "../src/core/run-coordinator";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";
import { removeKnownDevice } from "../src/state/state-policy";

const vault = contractId<"VaultIdentity">("vault") as VaultIdentity;
const device = contractId<"DeviceIdentity">("device") as DeviceIdentity;
const rev = (n: number) => contractId<"StateRevision">(`state-${n}`) as StateRevision;
const p = contractId<"VaultPath">("a.md") as VaultPath;
const opId = contractId<"OperationId">("op-1") as OperationId;
const op: PlannedOperation = { operationId: opId, kind: "upload-create", path: p, targetSide: "remote", contentVersion: { path: p, entityKind: "file", content: { revision: "content-1" } }, destructive: false, preconditions: [], reasons: [] };

async function seeded() {
  const bytes = new MemoryStateByteStorage(); const store = new PersistentSynchronizationStateStore(bytes);
  await store.saveTrusted(createInitialTrustedState({ stateRevision: rev(1), vaultIdentity: vault, deviceIdentity: device }));
  return { bytes, store };
}

function envelopeChecksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

test("true new install differs from missing expected state", async () => {
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  assert.equal((await store.load({ expectation: "new-installation" })).status, "uninitialized");
  const expected = await store.load({ expectation: "existing-pairing" });
  assert.equal(expected.status, "recovery-required");
  if (expected.status === "recovery-required") assert.equal(expected.reason, "expected-state-missing");
});

test("malformed and truncated state enter recovery", async () => {
  const malformed = new MemoryStateByteStorage(); malformed.bytes = new TextEncoder().encode("not json");
  const truncated = new MemoryStateByteStorage(); truncated.bytes = new TextEncoder().encode('{"envelopeVersion":1');
  const a = await new PersistentSynchronizationStateStore(malformed).load({ expectation: "existing-pairing" });
  const b = await new PersistentSynchronizationStateStore(truncated).load({ expectation: "existing-pairing" });
  assert.equal(a.status, "recovery-required"); assert.equal(b.status, "recovery-required");
  if (b.status === "recovery-required") assert.equal(b.reason, "truncated");
});

test("internally inconsistent state is recovery-required even with a valid envelope checksum", async () => {
  const inconsistent = {
    schemaVersion: 1, stateRevision: "state-1", vaultIdentity: "vault", deviceIdentity: "device",
    base: [{ path: "dup.md", entityKind: "file", localExisted: true, remoteExisted: true }, { path: "dup.md", entityKind: "file", localExisted: true, remoteExisted: true }],
    remoteMappings: [], tombstones: [], operations: [], knownDevices: [{ deviceId: "device", stale: false }],
  };
  const payload = JSON.stringify(inconsistent);
  const storage = new MemoryStateByteStorage();
  storage.bytes = new TextEncoder().encode(JSON.stringify({ envelopeVersion: 1, checksum: envelopeChecksum(payload), state: inconsistent }));
  const loaded = await new PersistentSynchronizationStateStore(storage).load({ expectation: "existing-pairing" });
  assert.equal(loaded.status, "recovery-required");
  if (loaded.status === "recovery-required") assert.equal(loaded.reason, "internally-inconsistent");
});

test("integrity failure and incompatible schema enter recovery", async () => {
  const { bytes } = await seeded();
  const raw = new TextDecoder().decode(bytes.bytes!);
  bytes.bytes = new TextEncoder().encode(raw.replace("state-1", "state-9"));
  const integrity = await new PersistentSynchronizationStateStore(bytes).load({ expectation: "existing-pairing" });
  assert.equal(integrity.status, "recovery-required");
  if (integrity.status === "recovery-required") assert.equal(integrity.reason, "integrity-check-failed");

  const newer = new MemoryStateByteStorage(); const version2 = new PersistentSynchronizationStateStore(newer, 2);
  await version2.saveTrusted(createInitialTrustedState({ stateRevision: rev(1), vaultIdentity: vault, deviceIdentity: device, schemaVersion: 2 }));
  const version1 = await new PersistentSynchronizationStateStore(newer, 1).load({ expectation: "existing-pairing" });
  assert.equal(version1.status, "recovery-required");
  if (version1.status === "recovery-required") assert.equal(version1.reason, "incompatible-version");
});

test("clone or restore suspicion is detected from expected device identity", async () => {
  const { store } = await seeded();
  const other = contractId<"DeviceIdentity">("other") as DeviceIdentity;
  const loaded = await store.load({ expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: other });
  assert.equal(loaded.status, "recovery-required");
  if (loaded.status === "recovery-required") assert.equal(loaded.reason, "clone-or-restore-suspected");
});

test("stale revision prevents concurrent state overwrite", async () => {
  const { store } = await seeded();
  const loaded = await store.load({ expectation: "existing-pairing" }); assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  const attempted = { ...loaded.state, stateRevision: rev(2) };
  const result = await store.saveTrusted(attempted, rev(0));
  assert.equal(result.status, "stale-revision");
});

test("change cursor and stale-device metadata round-trip as durable synchronization state", async () => {
  const storage = new MemoryStateByteStorage(); const store = new PersistentSynchronizationStateStore(storage);
  const cursor = contractId<"ChangeCursor">("cursor-17") as ChangeCursor;
  const other = contractId<"DeviceIdentity">("other-device") as DeviceIdentity;
  const state: TrustedSynchronizationState = {
    ...createInitialTrustedState({ stateRevision: rev(1), vaultIdentity: vault, deviceIdentity: device }),
    changeCursor: cursor,
    knownDevices: [{ deviceId: device, stale: false }, { deviceId: other, stale: true, advisoryLastReconciledAtMs: 100 }],
  };
  assert.equal((await store.saveTrusted(state)).status, "saved");
  const loaded = await store.load({ expectation: "existing-pairing" });
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.changeCursor, cursor);
    assert.equal(loaded.state.knownDevices[1].stale, true);
  }
});

test("device removal changes only known-device coordination state", () => {
  const other = contractId<"DeviceIdentity">("old-device") as DeviceIdentity;
  const state: TrustedSynchronizationState = {
    ...createInitialTrustedState({ stateRevision: rev(1), vaultIdentity: vault, deviceIdentity: device }),
    base: [{ path: p, entityKind: "file", localExisted: true, remoteExisted: true }],
    tombstones: [{ path: contractId<"VaultPath">("gone.md"), entityKind: "file", deletedOn: "both" }],
    knownDevices: [{ deviceId: device, stale: false }, { deviceId: other, stale: true }],
  };
  const removed = removeKnownDevice(state, other);
  assert.deepEqual(removed.base, state.base);
  assert.deepEqual(removed.tombstones, state.tombstones);
  assert.deepEqual(removed.knownDevices, [{ deviceId: device, stale: false }]);
  assert.throws(() => removeKnownDevice(state, device));
});

test("migration assessment is backward-aware and migration creates backup first", async () => {
  const { bytes } = await seeded();
  const oldRuntime = new PersistentSynchronizationStateStore(bytes, 1);
  assert.equal((await oldRuntime.assessMigration(2)).status, "migration-required");
  const result = await oldRuntime.migrate(2, (state, target) => ({ ...state, schemaVersion: target, stateRevision: rev(2) }));
  assert.equal(result.status, "migrated");
  assert.equal(bytes.backups.size, 1);
  const downgraded = await new PersistentSynchronizationStateStore(bytes, 2).assessMigration(1);
  assert.equal(downgraded.status, "incompatible");
});

test("diagnostic export is an explicit metadata projection", async () => {
  const { store } = await seeded();
  const text = new TextDecoder().decode(await store.exportDiagnosticState());
  assert.match(text, /vault/);
  assert.doesNotMatch(text, /refreshToken|accessToken|fullNoteContent/);
});

test("operation journal records checkpointed pending and uncertain work without claiming success", async () => {
  const { store } = await seeded(); const coordinator = new StateCommitCoordinator(store, { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device });
  const checkpoint = contractId<"CheckpointId">("checkpoint-1") as CheckpointId;
  assert.equal((await coordinator.markPending(op, rev(1), checkpoint)).status, "committed");
  let loaded = await store.load({ expectation: "existing-pairing" }); assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.operations[0].status, "pending");
    assert.equal(loaded.state.operations[0].checkpointId, checkpoint);
  }
  const current = loaded.status === "trusted" ? loaded.state.stateRevision : undefined;
  assert.equal((await coordinator.markUncertain(op, current, checkpoint)).status, "committed");
  loaded = await store.load({ expectation: "existing-pairing" });
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.operations[0].status, "uncertain");
    assert.equal(loaded.state.operations[0].checkpointId, checkpoint);
  }
});

test("verified success is committed only after a matching durable verified receipt and preserves checkpoint provenance", async () => {
  const { store } = await seeded(); const coordinator = new StateCommitCoordinator(store, { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device });
  const wrong = contractId<"OperationId">("wrong") as OperationId;
  assert.equal((await coordinator.commitVerifiedSuccess(op, { operationId: wrong, durable: true, integrityVerified: true }, rev(1))).status, "recovery-required");
  const checkpoint = contractId<"CheckpointId">("checkpoint-2") as CheckpointId;
  assert.equal((await coordinator.markPending(op, rev(1), checkpoint)).status, "committed");
  const pending = await store.load({ expectation: "existing-pairing" });
  if (pending.status !== "trusted") throw new Error("expected trusted state");
  const result = await coordinator.commitVerifiedSuccess(op, { operationId: opId, durable: true, integrityVerified: true, evidence: { revision: "content-1" }, verificationEvidenceRef: "hash-ok" }, pending.state.stateRevision);
  assert.equal(result.status, "committed");
  const loaded = await store.load({ expectation: "existing-pairing" });
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.operations[0].status, "completed");
    assert.equal(loaded.state.operations[0].checkpointId, checkpoint);
    assert.equal(loaded.state.base[0].localExisted, true);
    assert.equal(loaded.state.base[0].remoteExisted, true);
  }
});

test("run coordination serializes writers, cancels future operations, and requests later reconcile", async () => {
  const leases = new InMemoryRunLeasePort();
  const first = new CoreRunCoordinator(vault, device, leases, "holder-1");
  const second = new CoreRunCoordinator(vault, device, leases, "holder-2");
  assert.equal((await first.beginRun()).status, "started");
  assert.equal((await second.beginRun()).status, "lease-unavailable");
  first.noteLocalOrRemoteChangeDuringRun();
  first.requestCancellation();
  assert.equal(first.canStartNextOperation(), false);
  assert.deepEqual(await first.finishRun(), { reconcileAgain: true });
  assert.equal((await second.beginRun()).status, "started");
  second.pause();
  assert.equal(second.canStartNextOperation(), false);
  await second.finishRun();
});
