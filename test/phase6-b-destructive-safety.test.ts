import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type DeviceIdentity,
  type PlannedOperation,
  type StateRevision,
  type SynchronizationPlan,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type VaultPath,
} from "../src/contracts";
import {
  DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS,
  DestructiveSafetyPolicy,
} from "../src/core/destructive-safety";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { DEFAULT_TOMBSTONE_RETENTION, TombstoneRetentionPolicy } from "../src/state/state-policy";

const id = <T extends string>(value: string) => contractId<T>(value);
const device = id<"DeviceIdentity">("device:phase6-b") as DeviceIdentity;
const vault = id<"VaultIdentity">("vault:phase6-b") as VaultIdentity;
const revision = id<"StateRevision">("state:phase6-b") as StateRevision;

function destructive(count: number): PlannedOperation[] {
  return Array.from({ length: count }, (_, index) => ({
    operationId: id<"OperationId">(`delete:${index}`),
    kind: "trash-remote" as const,
    path: id<"VaultPath">(`delete-${index}.md`) as VaultPath,
    targetSide: "remote" as const,
    destructive: true,
    preconditions: [],
    reasons: [{ code: "attested-delete", summary: "Controlled destructive-safety test." }],
  }));
}

function trustedState(stale = false): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: revision,
    vaultIdentity: vault,
    deviceIdentity: device,
    base: [],
    remoteMappings: [],
    tombstones: [],
    operations: [],
    knownDevices: [{ deviceId: device, stale }],
  };
}

test("default breaker permits a small ordinary trusted deletion below every threshold", () => {
  const policy = new DestructiveSafetyPolicy();
  const assessment = policy.assess(destructive(1), {
    totalManagedPaths: 100,
    recentAverageDestructiveOperations: 1,
    stateCondition: "trusted",
  });
  assert.deepEqual(assessment, {
    suspicious: false,
    requiresApproval: false,
    recoveryCheckpointRequired: false,
    signals: [],
  });
});

test("default absolute-count boundary blocks exactly at the configured threshold", () => {
  const policy = new DestructiveSafetyPolicy();
  const below = policy.assess(destructive(DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS.absoluteDestructiveLimit - 1), {
    totalManagedPaths: 1_000,
    stateCondition: "trusted",
  });
  assert.equal(below.signals.includes("absolute-count"), false);

  const at = policy.assess(destructive(DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS.absoluteDestructiveLimit), {
    totalManagedPaths: 1_000,
    stateCondition: "trusted",
  });
  assert.equal(at.suspicious, true);
  assert.equal(at.requiresApproval, true);
  assert.equal(at.recoveryCheckpointRequired, true);
  assert.equal(at.signals.includes("absolute-count"), true);
});

test("default affected-percentage boundary blocks at the configured fraction even below absolute count", () => {
  const policy = new DestructiveSafetyPolicy();
  const totalManagedPaths = 100;
  const thresholdCount = Math.ceil(totalManagedPaths * DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS.affectedFractionLimit);
  assert.ok(thresholdCount < DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS.absoluteDestructiveLimit);

  const below = policy.assess(destructive(thresholdCount - 1), { totalManagedPaths, stateCondition: "trusted" });
  assert.equal(below.signals.includes("affected-percentage"), false);

  const at = policy.assess(destructive(thresholdCount), { totalManagedPaths, stateCondition: "trusted" });
  assert.equal(at.signals.includes("affected-percentage"), true);
  assert.equal(at.requiresApproval, true);
  assert.equal(at.recoveryCheckpointRequired, true);
});

test("reconstructed or untrusted state makes even one destructive operation review-only", () => {
  const policy = new DestructiveSafetyPolicy();
  for (const stateCondition of ["reconstructed", "untrusted"] as const) {
    const assessment = policy.assess(destructive(1), { totalManagedPaths: 100, stateCondition });
    assert.equal(assessment.suspicious, true);
    assert.equal(assessment.requiresApproval, true);
    assert.equal(assessment.recoveryCheckpointRequired, true);
    assert.equal(assessment.signals.includes("state-integrity-or-rebuild"), true);
  }
});

test("approval remains scoped to the exact reviewed plan and a concrete recovery checkpoint", () => {
  const policy = new DestructiveSafetyPolicy();
  const operations = destructive(2);
  const plan: SynchronizationPlan = {
    planId: id<"PlanId">("plan:reviewed"),
    trigger: "manual",
    operations,
    executionDisposition: "requires-user-approval",
    recoveryCheckpointRequired: true,
  };
  const checkpoint = id<"CheckpointId">("checkpoint:reviewed");
  const approval = policy.authorizeReviewedPlan(plan, checkpoint);
  assert.equal(approval.planId, plan.planId);
  assert.equal(approval.checkpointId, checkpoint);
  assert.deepEqual(approval.destructiveOperationIds, operations.map(operation => operation.operationId));
  assert.throws(() => policy.authorizeReviewedPlan({ ...plan, executionDisposition: "safe-auto-eligible" }, checkpoint));
  assert.throws(() => policy.authorizeReviewedPlan({ ...plan, recoveryCheckpointRequired: false }, checkpoint));
});

test("production planner prevents a stale current device from authorizing any destructive plan", async () => {
  const unsafePlan: SynchronizationPlan = {
    planId: id<"PlanId">("plan:stale-delete"),
    trigger: "local-change",
    operations: destructive(3),
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
  };
  const planner = new ProductionSynchronizationPlanner({ plan: async () => unsafePlan });
  const result = await planner.plan({ snapshots: [], state: { status: "trusted", state: trustedState(true) } });
  assert.equal(result.executionDisposition, "blocked");
  assert.equal(result.operations.some(operation => operation.kind === "blocked-unsafe"), true);
  assert.equal(result.operations.some(operation => operation.reasons.some(reason => reason.code === "stale-device-destructive-gate")), true);
});

test("tombstones expire at the configured bound only when every known device is current", () => {
  const policy = new TombstoneRetentionPolicy();
  const recordedAt = 1_000;
  const tombstone = {
    path: id<"VaultPath">("deleted.md") as VaultPath,
    entityKind: "file" as const,
    deletedOn: "both" as const,
    sourceDeviceId: device,
    advisoryRecordedAtMs: recordedAt,
  };
  const beforeBoundary = recordedAt + DEFAULT_TOMBSTONE_RETENTION.retentionMs - 1;
  const atBoundary = recordedAt + DEFAULT_TOMBSTONE_RETENTION.retentionMs;
  assert.equal(policy.canExpire(tombstone, [{ deviceId: device, stale: false }], beforeBoundary), false);
  assert.equal(policy.canExpire(tombstone, [{ deviceId: device, stale: false }], atBoundary), true);
  assert.equal(policy.canExpire(tombstone, [{ deviceId: device, stale: true }], atBoundary + DEFAULT_TOMBSTONE_RETENTION.retentionMs * 10), false);
});
