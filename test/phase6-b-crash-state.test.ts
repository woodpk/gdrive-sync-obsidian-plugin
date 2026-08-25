import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type DeviceIdentity,
  type PlannedOperation,
  type StateRevision,
  type VaultIdentity,
  type VaultPath,
} from "../src/contracts";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { CrashSafeExecutionCoordinator } from "../src/core/execution-coordinator";
import {
  createInitialTrustedState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
} from "../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:phase6-b") as VaultIdentity;
const device = id<"DeviceIdentity">("device:phase6-b") as DeviceIdentity;
const context = {
  expectation: "existing-pairing" as const,
  expectedVaultIdentity: vault,
  expectedDeviceIdentity: device,
};

function operation(name = "crash.md"): PlannedOperation {
  const path = id<"VaultPath">(name) as VaultPath;
  return {
    operationId: id<"OperationId">(`operation:${name}`),
    kind: "upload-create",
    path,
    targetSide: "remote",
    destructive: false,
    preconditions: [],
    reasons: [{ code: "phase6-fault-injection", summary: "Phase 6 controlled crash/fault test." }],
    contentVersion: {
      path,
      entityKind: "file",
      content: { hash: `hash:${name}`, sizeBytes: name.length },
    },
  };
}

async function seededStore(storage = new MemoryStateByteStorage(), schemaVersion = 1) {
  const store = new PersistentSynchronizationStateStore(storage, schemaVersion);
  const initial = createInitialTrustedState({
    stateRevision: id<"StateRevision">("state:0") as StateRevision,
    vaultIdentity: vault,
    deviceIdentity: device,
    schemaVersion,
  });
  assert.equal((await store.saveTrusted(initial)).status, "saved");
  return { store, storage };
}

function successfulExecutor() {
  return {
    validatePreconditions: async () => ({ status: "valid" as const }),
    execute: async (planned: PlannedOperation) => ({
      status: "durable-verified-success" as const,
      receipt: {
        operationId: planned.operationId,
        durable: true as const,
        integrityVerified: true as const,
        evidence: planned.contentVersion?.content,
        resultingRemoteObjectId: id<"RemoteObjectId">(`remote:${String(planned.path)}`),
        verificationEvidenceRef: `phase6:${String(planned.operationId)}`,
      },
    }),
  };
}

test("crash before content mutation leaves only durable pending evidence and never advances BASE", async () => {
  const { store } = await seededStore();
  const planned = operation("before-mutation.md");
  const journal = new StateCommitCoordinator(store, context);
  const coordinator = new CrashSafeExecutionCoordinator({
    validatePreconditions: async () => ({ status: "valid" as const }),
    execute: async () => { throw new Error("simulated process termination before mutation"); },
  }, journal);

  await assert.rejects(() => coordinator.executeOperation(planned), /simulated process termination/);
  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  assert.equal(loaded.state.base.some(entry => entry.path === planned.path), false);
  assert.equal(loaded.state.operations.find(entry => entry.operationId === planned.operationId)?.status, "pending");
});

test("ambiguous transfer outcome is durably classified uncertain without advancing BASE", async () => {
  const { store } = await seededStore();
  const planned = operation("ambiguous.md");
  const journal = new StateCommitCoordinator(store, context);
  const coordinator = new CrashSafeExecutionCoordinator({
    validatePreconditions: async () => ({ status: "valid" as const }),
    execute: async () => ({ status: "uncertain" as const, reason: "connection lost after remote request" }),
  }, journal);

  const result = await coordinator.executeOperation(planned);
  assert.equal(result.status, "uncertain");
  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  assert.equal(loaded.state.base.some(entry => entry.path === planned.path), false);
  assert.equal(loaded.state.operations.find(entry => entry.operationId === planned.operationId)?.status, "uncertain");
});

test("authoritative success commit rejects non-durable or non-verified receipts", async () => {
  const { store } = await seededStore();
  const planned = operation("false-success.md");
  const journal = new StateCommitCoordinator(store, context);
  const pending = await journal.markPending(planned);
  assert.equal(pending.status, "committed");
  if (pending.status !== "committed") return;

  const result = await journal.commitVerifiedSuccess(planned, {
    operationId: planned.operationId,
    durable: false,
    integrityVerified: true,
  } as never, pending.newStateRevision);
  assert.equal(result.status, "recovery-required");

  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  assert.equal(loaded.state.base.some(entry => entry.path === planned.path), false);
  assert.equal(loaded.state.operations.find(entry => entry.operationId === planned.operationId)?.status, "pending");
});

test("crash/failure while persisting verified success cannot create false-success state", async () => {
  class FailThirdCasStorage extends MemoryStateByteStorage {
    calls = 0;
    override async compareAndSwap(expected: Uint8Array | undefined, replacement: Uint8Array): Promise<boolean> {
      this.calls += 1;
      if (this.calls === 3) throw new Error("simulated crash during success-state commit");
      return super.compareAndSwap(expected, replacement);
    }
  }

  const storage = new FailThirdCasStorage();
  const { store } = await seededStore(storage);
  const planned = operation("commit-crash.md");
  const coordinator = new CrashSafeExecutionCoordinator(successfulExecutor(), new StateCommitCoordinator(store, context));

  await assert.rejects(() => coordinator.executeOperation(planned), /simulated crash during success-state commit/);
  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  assert.equal(loaded.state.base.some(entry => entry.path === planned.path), false);
  assert.equal(loaded.state.operations.find(entry => entry.operationId === planned.operationId)?.status, "pending");
});

test("migration preserves a recoverable exact pre-migration checkpoint", async () => {
  const storage = new MemoryStateByteStorage();
  const { store } = await seededStore(storage, 1);
  const result = await store.migrate(2, (state, targetSchemaVersion) => ({ ...state, schemaVersion: targetSchemaVersion }));
  assert.equal(result.status, "migrated");
  if (result.status !== "migrated") return;

  const backupBytes = storage.backups.get(result.backup.backupId);
  assert.ok(backupBytes);
  const backupStorage = new MemoryStateByteStorage();
  backupStorage.bytes = backupBytes!.slice();
  const backupStore = new PersistentSynchronizationStateStore(backupStorage, 1);
  const backup = await backupStore.load(context);
  assert.equal(backup.status, "trusted");
  if (backup.status === "trusted") assert.equal(backup.state.schemaVersion, 1);

  const migratedStore = new PersistentSynchronizationStateStore(storage, 2);
  const migrated = await migratedStore.load(context);
  assert.equal(migrated.status, "trusted");
  if (migrated.status === "trusted") assert.equal(migrated.state.schemaVersion, 2);
});

test("corrupt, truncated, incompatible, and missing expected state all fail into recovery", async () => {
  const cases: Array<{ bytes?: Uint8Array; expectedReason: string }> = [
    { bytes: new TextEncoder().encode('{"envelopeVersion":1'), expectedReason: "truncated" },
    { bytes: new TextEncoder().encode("not-json"), expectedReason: "malformed" },
  ];

  for (const item of cases) {
    const storage = new MemoryStateByteStorage();
    storage.bytes = item.bytes;
    const store = new PersistentSynchronizationStateStore(storage);
    const loaded = await store.load(context);
    assert.equal(loaded.status, "recovery-required");
    if (loaded.status === "recovery-required") assert.equal(loaded.reason, item.expectedReason);
  }

  const missing = await new PersistentSynchronizationStateStore(new MemoryStateByteStorage()).load(context);
  assert.deepEqual(missing, { status: "recovery-required", reason: "expected-state-missing" });

  const storage = new MemoryStateByteStorage();
  const v2 = createInitialTrustedState({ stateRevision: id<"StateRevision">("state:2"), vaultIdentity: vault, deviceIdentity: device, schemaVersion: 2 });
  assert.equal((await new PersistentSynchronizationStateStore(storage, 2).saveTrusted(v2)).status, "saved");
  const incompatible = await new PersistentSynchronizationStateStore(storage, 1).load(context);
  assert.equal(incompatible.status, "recovery-required");
  if (incompatible.status === "recovery-required") assert.equal(incompatible.reason, "incompatible-version");
});
