import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type DeviceIdentity, type PlannedOperation, type StateRevision, type SynchronizationPlan, type TrustedSynchronizationState, type VaultIdentity, type VaultPath } from "../src/contracts";
import { DestructiveSafetyPolicy } from "../src/core/destructive-safety";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { TombstoneRetentionPolicy, generateDeviceIdentity } from "../src/state/state-policy";

const path = contractId<"VaultPath">("gone.md") as VaultPath;
const device = contractId<"DeviceIdentity">("device-current") as DeviceIdentity;
const vault = contractId<"VaultIdentity">("vault") as VaultIdentity;
const revision = contractId<"StateRevision">("state-1") as StateRevision;

function destructive(count: number): PlannedOperation[] {
  return Array.from({ length: count }, (_, i) => ({
    operationId: contractId<"OperationId">(`delete-${i}`), kind: "trash-remote" as const, path: contractId<"VaultPath">(`p-${i}.md`), targetSide: "remote" as const,
    destructive: true, preconditions: [], reasons: [],
  }));
}

test("tombstone retention is bounded but never expires while any known device is stale", () => {
  const policy = new TombstoneRetentionPolicy({ retentionMs: 100 });
  const tombstone = { path, entityKind: "file" as const, deletedOn: "both" as const, sourceDeviceId: device, advisoryRecordedAtMs: 1_000 };
  assert.equal(policy.canExpire(tombstone, [{ deviceId: device, stale: false }], 1_101), true);
  assert.equal(policy.canExpire(tombstone, [{ deviceId: device, stale: true }], 10_000), false);
  assert.equal(policy.canExpire({ ...tombstone, advisoryRecordedAtMs: undefined }, [{ deviceId: device, stale: false }], 10_000), false);
});

test("device identities are random-source derived and reject all-zero entropy", () => {
  const first = generateDeviceIdentity(bytes => bytes.fill(1));
  const second = generateDeviceIdentity(bytes => bytes.fill(2));
  assert.notEqual(first, second);
  assert.throws(() => generateDeviceIdentity(bytes => bytes.fill(0)));
});

test("destructive breaker independently detects count, percentage, abnormal divergence, and state integrity signals", () => {
  const policy = new DestructiveSafetyPolicy({ absoluteDestructiveLimit: 5, affectedFractionLimit: 0.25, abnormalMultiple: 3 });
  assert.deepEqual(policy.assess(destructive(5), { totalManagedPaths: 100, stateCondition: "trusted" }).signals, ["absolute-count"]);
  assert.ok(policy.assess(destructive(2), { totalManagedPaths: 4, stateCondition: "trusted" }).signals.includes("affected-percentage"));
  assert.ok(policy.assess(destructive(3), { totalManagedPaths: 100, recentAverageDestructiveOperations: 1, stateCondition: "trusted" }).signals.includes("abnormal-divergence"));
  assert.ok(policy.assess(destructive(1), { totalManagedPaths: 100, stateCondition: "reconstructed" }).signals.includes("state-integrity-or-rebuild"));
});

test("review approval is scoped to exact plan and requires a checkpoint", () => {
  const policy = new DestructiveSafetyPolicy();
  const plan: SynchronizationPlan = { planId: contractId<"PlanId">("plan-1"), trigger: "manual", operations: destructive(1), executionDisposition: "requires-user-approval", recoveryCheckpointRequired: true, globalExecutionGate: "destructive-approval-required" };
  const checkpoint = contractId<"CheckpointId">("checkpoint-1");
  const approved = policy.authorizeReviewedPlan(plan, checkpoint);
  assert.equal(approved.planId, plan.planId);
  assert.equal(approved.checkpointId, checkpoint);
  assert.deepEqual(approved.destructiveOperationIds, [plan.operations[0].operationId]);
  assert.throws(() => policy.authorizeReviewedPlan({ ...plan, recoveryCheckpointRequired: false }, checkpoint));
});

test("a returning stale current device cannot authorize destructive propagation", async () => {
  const state: TrustedSynchronizationState = {
    schemaVersion: 1, stateRevision: revision, vaultIdentity: vault, deviceIdentity: device,
    base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [{ deviceId: device, stale: true }],
  };
  const unsafePlan: SynchronizationPlan = { planId: contractId<"PlanId">("delete-plan"), trigger: "local-change", operations: destructive(1), executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" };
  const guarded = new ProductionSynchronizationPlanner({ plan: async () => unsafePlan });
  const result = await guarded.plan({ snapshots: [], state: { status: "trusted", state } });
  assert.equal(result.executionDisposition, "requires-user-approval");
  assert.equal(result.globalExecutionGate, "none");
  assert.equal(result.operations.at(-1)?.kind, "blocked-unsafe");
});
