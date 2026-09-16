import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type PlanOperationKind,
  type PlannedOperation,
  type SynchronizationPlan,
} from "../src/contracts";
import {
  validationPlanExpectation,
  type ValidationExpectedPlanOperation,
  type ValidationPlanAssertionResult,
  type ValidationPlanExpectation,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import { assertValidationPlan } from "../src/validation/plan-assertion-engine";
import { validationRunIdentity } from "../src/validation/run-sandbox-checkpoint-contracts";

const run = validationRunIdentity("run-vh07-c04", "C04");
const vaultPath = (value: string) => contractId<"VaultPath">(value);
const remoteObjectId = (value: string) => contractId<"RemoteObjectId">(value);

function operation(input: {
  readonly id: string;
  readonly kind?: PlanOperationKind;
  readonly path?: string;
  readonly destructive?: boolean;
  readonly targetSide?: "local" | "remote";
  readonly fromPath?: string;
  readonly toPath?: string;
  readonly remoteId?: string;
}): PlannedOperation {
  return {
    operationId: contractId<"OperationId">(input.id),
    kind: input.kind ?? "upload-update",
    path: vaultPath(input.path ?? "notes/example.md"),
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.fromPath === undefined ? {} : { fromPath: vaultPath(input.fromPath) }),
    ...(input.toPath === undefined ? {} : { toPath: vaultPath(input.toPath) }),
    ...(input.remoteId === undefined ? {} : { remoteObjectId: remoteObjectId(input.remoteId) }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{ code: "vh07-test", summary: "VH07 plan assertion fixture." }],
  };
}

function plan(
  operations: readonly PlannedOperation[],
  overrides: Partial<Omit<SynchronizationPlan, "planId" | "operations">> = {},
): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">("plan-vh07"),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
    ...overrides,
  };
}

function expected(operation: PlannedOperation): ValidationExpectedPlanOperation {
  return {
    kind: operation.kind,
    path: operation.path,
    destructive: operation.destructive,
    ...(operation.targetSide === undefined ? {} : { targetSide: operation.targetSide }),
    ...(operation.fromPath === undefined ? {} : { fromPath: operation.fromPath }),
    ...(operation.toPath === undefined ? {} : { toPath: operation.toPath }),
    ...(operation.remoteObjectId === undefined ? {} : { remoteObjectId: operation.remoteObjectId }),
  };
}

function expectation(
  expectedOperations: readonly ValidationExpectedPlanOperation[],
  overrides: Partial<Omit<ValidationPlanExpectation, "run" | "expectedOperations">> = {},
): ValidationPlanExpectation {
  return validationPlanExpectation({
    run,
    expectedTrigger: "manual",
    expectedOperations,
    allowedBackgroundKinds: [],
    forbiddenKinds: ["unresolved-conflict", "trash-local", "trash-remote", "blocked-unsafe", "recovery-required"],
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
    ...overrides,
  });
}

function failureKinds(result: ValidationPlanAssertionResult): readonly string[] {
  if (result.status !== "mismatch") assert.fail("Expected plan assertion mismatch.");
  assert.equal(result.executionAuthorized, false);
  return result.failures.map((failure) => failure.kind);
}

test("VH07 exact expected production plan match authorizes only the observed plan ID", () => {
  const observed = operation({ id: "op-upload", kind: "upload-update", targetSide: "remote", remoteId: "drive-object-1" });
  const observedPlan = plan([observed]);
  const result = assertValidationPlan({
    assertionId: "vh07-exact-match",
    expectation: expectation([expected(observed)]),
    plan: observedPlan,
  });

  assert.equal(result.status, "matched");
  if (result.status !== "matched") return;
  assert.equal(result.authorization.executionAuthorized, true);
  assert.equal(result.authorization.planId, observedPlan.planId);
});

test("VH07 permits only explicitly allowed nondestructive background no-ops", () => {
  const observed = operation({ id: "op-upload", kind: "upload-update", targetSide: "remote" });
  const background = operation({ id: "op-noop", kind: "noop", path: "notes/unchanged.md" });
  const result = assertValidationPlan({
    assertionId: "vh07-background-noop",
    expectation: expectation([expected(observed)], { allowedBackgroundKinds: ["noop"] }),
    plan: plan([observed, background]),
  });

  assert.equal(result.status, "matched");
});

test("VH07 rejects an unrelated mutation even when the expected operation is present", () => {
  const observed = operation({ id: "op-upload", kind: "upload-update", targetSide: "remote" });
  const unrelated = operation({ id: "op-unrelated", kind: "download-create", path: "notes/unrelated.md", targetSide: "local" });
  const result = assertValidationPlan({
    assertionId: "vh07-unrelated-mutation",
    expectation: expectation([expected(observed)]),
    plan: plan([observed, unrelated]),
  });

  assert.ok(failureKinds(result).includes("unexpected-operation"));
});

test("VH07 rejects a move whose path or stable remote identity differs from the scenario contract", () => {
  const expectedMove = operation({
    id: "op-move-expected",
    kind: "identity-preserving-move",
    path: "notes/new.md",
    targetSide: "remote",
    fromPath: "notes/old.md",
    toPath: "notes/new.md",
    remoteId: "drive-object-expected",
  });
  const observedMove = operation({
    id: "op-move-observed",
    kind: "identity-preserving-move",
    path: "notes/new.md",
    targetSide: "remote",
    fromPath: "notes/old.md",
    toPath: "notes/new.md",
    remoteId: "drive-object-wrong",
  });
  const result = assertValidationPlan({
    assertionId: "vh07-move-identity",
    expectation: expectation([expected(expectedMove)]),
    plan: plan([observedMove]),
  });

  assert.ok(failureKinds(result).includes("path-or-identity-mismatch"));
});

test("VH07 hard-stops an unexpected conflict", () => {
  const conflict = operation({ id: "op-conflict", kind: "unresolved-conflict", path: "notes/conflict.md" });
  const result = assertValidationPlan({
    assertionId: "vh07-unexpected-conflict",
    expectation: expectation([]),
    plan: plan([conflict]),
  });

  const kinds = failureKinds(result);
  assert.ok(kinds.includes("conflict-expectation-mismatch"));
  assert.ok(kinds.includes("unexpected-operation"));
});

test("VH07 hard-stops an unexpected destructive operation", () => {
  const destructive = operation({ id: "op-trash", kind: "trash-remote", path: "notes/deleted.md", targetSide: "remote", destructive: true });
  const result = assertValidationPlan({
    assertionId: "vh07-unexpected-destruction",
    expectation: expectation([]),
    plan: plan([destructive]),
  });

  const kinds = failureKinds(result);
  assert.ok(kinds.includes("destructive-expectation-mismatch"));
  assert.ok(kinds.includes("unexpected-operation"));
});

test("VH07 hard-stops unexpected recovery and blocked operation states", () => {
  const recovery = operation({ id: "op-recovery", kind: "recovery-required", path: "notes/recovery.md" });
  const blocked = operation({ id: "op-blocked", kind: "blocked-unsafe", path: "notes/blocked.md" });
  const result = assertValidationPlan({
    assertionId: "vh07-unexpected-recovery-blocked",
    expectation: expectation([]),
    plan: plan([recovery, blocked], { executionDisposition: "blocked", globalExecutionGate: "globally-blocked" }),
  });

  const kinds = failureKinds(result);
  assert.ok(kinds.includes("unexpected-operation"));
  assert.ok(kinds.includes("execution-disposition-mismatch"));
  assert.ok(kinds.includes("global-execution-gate-mismatch"));
});

test("VH07 accepts explicitly expected recovery state and review disposition", () => {
  const recovery = operation({ id: "op-recovery", kind: "recovery-required", path: "notes/recovery.md" });
  const result = assertValidationPlan({
    assertionId: "vh07-expected-recovery",
    expectation: expectation([expected(recovery)], {
      forbiddenKinds: ["unresolved-conflict", "trash-local", "trash-remote", "blocked-unsafe"],
      expectedExecutionDisposition: "blocked",
      expectedGlobalExecutionGate: "globally-blocked",
    }),
    plan: plan([recovery], { executionDisposition: "blocked", globalExecutionGate: "globally-blocked" }),
  });

  assert.equal(result.status, "matched");
});

test("VH07 fails closed when runtime plan content contains an unknown operation kind", () => {
  const unknownOperation = {
    ...operation({ id: "op-unknown", kind: "noop", path: "notes/unknown.md" }),
    kind: "future-production-mutation",
  } as unknown as PlannedOperation;
  const result = assertValidationPlan({
    assertionId: "vh07-unknown-plan-content",
    expectation: expectation([], { allowedBackgroundKinds: ["noop"] }),
    plan: plan([unknownOperation]),
  });

  assert.ok(failureKinds(result).includes("unexpected-operation"));
});
