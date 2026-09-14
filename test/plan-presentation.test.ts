import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type OperationId, type PlanOperationKind, type PlannedOperation, type VaultPath } from "../src/contracts";
import { groupPlanOperations, shouldExpandSystemGroup } from "../src/product/plan-presentation";

function operation(kind: PlanOperationKind, pathValue: string): PlannedOperation {
  return {
    operationId: contractId<"OperationId">(`op:${kind}:${pathValue}`) as OperationId,
    kind,
    path: contractId<"VaultPath">(pathValue) as VaultPath,
    destructive: false,
    preconditions: [],
    reasons: [{ code: "test", summary: "test reason" }],
  };
}

test("plan presentation groups system paths separately without changing relative order", () => {
  const unchangedA = operation("noop", "a.md");
  const systemNoop = operation("noop", "__brain_sync_portable_config__/app.json");
  const change = operation("upload-update", "b.md");
  const systemChange = operation("download-update", "__brain_sync_portable_config__/appearance.json");
  const unchangedB = operation("noop", "c.md");

  const groups = groupPlanOperations([unchangedA, systemNoop, change, systemChange, unchangedB]);

  assert.deepEqual(groups.vaultChanges, [change]);
  assert.deepEqual(groups.system, [systemNoop, systemChange]);
  assert.deepEqual(groups.unchangedVault, [unchangedA, unchangedB]);
});

test("system group expands only when it contains an actionable operation", () => {
  assert.equal(shouldExpandSystemGroup([operation("noop", "__brain_sync_portable_config__/app.json")]), false);
  assert.equal(shouldExpandSystemGroup([operation("upload-update", "__brain_sync_portable_config__/app.json")]), true);
});
