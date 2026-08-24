import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type DeviceIdentity,
  type ExecutionResult,
  type OperationId,
  type PlannedOperation,
  type PreconditionValidationResult,
  type StateRevision,
  type SynchronizationExecutor,
  type VaultIdentity,
  type VaultPath,
} from "../src/contracts";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { CrashSafeExecutionCoordinator } from "../src/core/execution-coordinator";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";

const vault = contractId<"VaultIdentity">("vault-exec") as VaultIdentity;
const device = contractId<"DeviceIdentity">("device-exec") as DeviceIdentity;
const revision = contractId<"StateRevision">("state-1") as StateRevision;
const path = contractId<"VaultPath">("10-Notes/exec.md") as VaultPath;
const operationId = contractId<"OperationId">("op-exec") as OperationId;
const operation: PlannedOperation = {
  operationId,
  kind: "upload-create",
  path,
  targetSide: "remote",
  contentVersion: { path, entityKind: "file", content: { revision: "content-1" } },
  destructive: false,
  preconditions: [{ kind: "file-stable", path }],
  reasons: [{ code: "test", summary: "fixture" }],
};

class ScriptedExecutor implements SynchronizationExecutor {
  executeCalls = 0;
  constructor(
    private readonly validation: PreconditionValidationResult,
    private readonly result: ExecutionResult,
  ) {}
  async validatePreconditions(_operation: PlannedOperation): Promise<PreconditionValidationResult> { return this.validation; }
  async execute(_operation: PlannedOperation): Promise<ExecutionResult> { this.executeCalls += 1; return this.result; }
}

async function setup(executor: SynchronizationExecutor) {
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage);
  await store.saveTrusted(createInitialTrustedState({ stateRevision: revision, vaultIdentity: vault, deviceIdentity: device }));
  const journal = new StateCommitCoordinator(store, { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device });
  return { store, coordinator: new CrashSafeExecutionCoordinator(executor, journal) };
}

test("stale precondition invalidates affected work before mutation", async () => {
  const executor = new ScriptedExecutor(
    { status: "stale", failed: [{ kind: "file-stable", path }] },
    { status: "blocking-failure", reason: "must never execute" },
  );
  const { store, coordinator } = await setup(executor);
  const result = await coordinator.executeOperation(operation, revision);
  assert.equal(result.status, "stale-precondition");
  assert.equal(executor.executeCalls, 0);
  const loaded = await store.load({ expectation: "existing-pairing" });
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.operations.length, 0);
});

test("durable verified execution is journaled pending before authoritative success commit", async () => {
  const executor = new ScriptedExecutor(
    { status: "valid" },
    { status: "durable-verified-success", receipt: { operationId, durable: true, integrityVerified: true, evidence: { revision: "content-1" }, verificationEvidenceRef: "verified-hash" } },
  );
  const { store, coordinator } = await setup(executor);
  const result = await coordinator.executeOperation(operation, revision);
  assert.equal(result.status, "committed");
  assert.equal(executor.executeCalls, 1);
  const loaded = await store.load({ expectation: "existing-pairing" });
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.operations[0].status, "completed");
    assert.equal(loaded.state.operations[0].verificationEvidenceRef, "verified-hash");
    assert.equal(loaded.state.base[0].content?.revision, "content-1");
  }
});

test("uncertain mutation outcome is persisted as uncertain and never authoritative success", async () => {
  const executor = new ScriptedExecutor({ status: "valid" }, { status: "uncertain", reason: "transport outcome unknown" });
  const { store, coordinator } = await setup(executor);
  const result = await coordinator.executeOperation(operation, revision);
  assert.equal(result.status, "uncertain");
  const loaded = await store.load({ expectation: "existing-pairing" });
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.operations[0].status, "uncertain");
    assert.equal(loaded.state.base.length, 0);
  }
});
