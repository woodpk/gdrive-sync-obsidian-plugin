import {
  PLAN_OPERATION_KINDS,
  type PlanOperationKind,
  type PlannedOperation,
  type SynchronizationPlan,
} from "../contracts";
import {
  matchedValidationPlanAssertion,
  mismatchedValidationPlanAssertion,
  type ValidationExpectedPlanOperation,
  type ValidationPlanAssertionFailure,
  type ValidationPlanAssertionResult,
  type ValidationPlanExpectation,
} from "./driver-plan-fault-verifier-contracts";

const PLAN_OPERATION_KIND_SET: ReadonlySet<string> = new Set(PLAN_OPERATION_KINDS);
const PLAN_TRIGGERS: ReadonlySet<string> = new Set(["manual", "startup-resume", "local-change", "periodic", "verify-reconcile"]);
const PLAN_EXECUTION_DISPOSITIONS: ReadonlySet<string> = new Set(["safe-auto-eligible", "requires-user-approval", "blocked"]);
const PLAN_GLOBAL_EXECUTION_GATES: ReadonlySet<string> = new Set(["none", "destructive-approval-required", "globally-blocked"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKnownObservedOperation(value: unknown): value is PlannedOperation {
  if (!isRecord(value)) return false;
  return (
    typeof value.operationId === "string" &&
    typeof value.kind === "string" &&
    PLAN_OPERATION_KIND_SET.has(value.kind) &&
    typeof value.path === "string" &&
    value.path.length > 0 &&
    typeof value.destructive === "boolean" &&
    Array.isArray(value.preconditions) &&
    Array.isArray(value.reasons)
  );
}

function optionalIdentityMatches(expected: ValidationExpectedPlanOperation, observed: PlannedOperation): boolean {
  return (
    observed.kind === expected.kind &&
    observed.path === expected.path &&
    (expected.targetSide === undefined || observed.targetSide === expected.targetSide) &&
    (expected.fromPath === undefined || observed.fromPath === expected.fromPath) &&
    (expected.toPath === undefined || observed.toPath === expected.toPath) &&
    (expected.remoteObjectId === undefined || observed.remoteObjectId === expected.remoteObjectId)
  );
}

function operationSummary(operation: PlannedOperation): string {
  const identity = [
    `kind=${operation.kind}`,
    `path=${operation.path}`,
    operation.targetSide === undefined ? undefined : `targetSide=${operation.targetSide}`,
    operation.fromPath === undefined ? undefined : `fromPath=${operation.fromPath}`,
    operation.toPath === undefined ? undefined : `toPath=${operation.toPath}`,
    operation.remoteObjectId === undefined ? undefined : `remoteObjectId=${operation.remoteObjectId}`,
    `destructive=${String(operation.destructive)}`,
  ].filter((value): value is string => value !== undefined);
  return identity.join(", ");
}

function expectedSummary(operation: ValidationExpectedPlanOperation): string {
  const identity = [
    `kind=${operation.kind}`,
    `path=${operation.path}`,
    operation.targetSide === undefined ? undefined : `targetSide=${operation.targetSide}`,
    operation.fromPath === undefined ? undefined : `fromPath=${operation.fromPath}`,
    operation.toPath === undefined ? undefined : `toPath=${operation.toPath}`,
    operation.remoteObjectId === undefined ? undefined : `remoteObjectId=${operation.remoteObjectId}`,
    `destructive=${String(operation.destructive)}`,
  ].filter((value): value is string => value !== undefined);
  return identity.join(", ");
}

function isPermittedBackgroundNoop(operation: PlannedOperation, expectation: ValidationPlanExpectation): boolean {
  return operation.kind === "noop" && operation.destructive === false && expectation.allowedBackgroundKinds.includes("noop");
}

/**
 * Compares an already-observed production plan with the frozen validation
 * scenario contract. This function is assertion-only: it performs no planning,
 * execution, mutation, or synchronization-policy decisions.
 */
export function assertValidationPlan(input: {
  readonly assertionId: string;
  readonly expectation: ValidationPlanExpectation;
  readonly plan: SynchronizationPlan;
}): ValidationPlanAssertionResult {
  const failures: ValidationPlanAssertionFailure[] = [];
  const { expectation, plan } = input;

  if (!PLAN_TRIGGERS.has(String(plan.trigger))) {
    failures.push({ kind: "trigger-mismatch", summary: `Observed an unsupported production plan trigger: ${String(plan.trigger)}.` });
  } else if (expectation.expectedTrigger !== undefined && plan.trigger !== expectation.expectedTrigger) {
    failures.push({
      kind: "trigger-mismatch",
      summary: `Expected trigger ${expectation.expectedTrigger}; observed ${plan.trigger}.`,
    });
  }

  if (!PLAN_EXECUTION_DISPOSITIONS.has(String(plan.executionDisposition))) {
    failures.push({
      kind: "execution-disposition-mismatch",
      summary: `Observed an unsupported execution disposition: ${String(plan.executionDisposition)}.`,
    });
  } else if (expectation.expectedExecutionDisposition !== undefined) {
    if (plan.executionDisposition !== expectation.expectedExecutionDisposition) {
      failures.push({
        kind: "execution-disposition-mismatch",
        summary: `Expected execution disposition ${expectation.expectedExecutionDisposition}; observed ${plan.executionDisposition}.`,
      });
    }
  } else if (plan.executionDisposition !== "safe-auto-eligible") {
    failures.push({
      kind: "execution-disposition-mismatch",
      summary: `Observed review disposition ${plan.executionDisposition} without an explicit scenario expectation.`,
    });
  }

  if (!PLAN_GLOBAL_EXECUTION_GATES.has(String(plan.globalExecutionGate))) {
    failures.push({
      kind: "global-execution-gate-mismatch",
      summary: `Observed an unsupported global execution gate: ${String(plan.globalExecutionGate)}.`,
    });
  } else if (expectation.expectedGlobalExecutionGate !== undefined) {
    if (plan.globalExecutionGate !== expectation.expectedGlobalExecutionGate) {
      failures.push({
        kind: "global-execution-gate-mismatch",
        summary: `Expected global execution gate ${expectation.expectedGlobalExecutionGate}; observed ${plan.globalExecutionGate}.`,
      });
    }
  } else if (plan.globalExecutionGate !== "none") {
    failures.push({
      kind: "global-execution-gate-mismatch",
      summary: `Observed global execution gate ${plan.globalExecutionGate} without an explicit scenario expectation.`,
    });
  }

  if (typeof plan.recoveryCheckpointRequired !== "boolean") {
    failures.push({
      kind: "unexpected-operation",
      summary: "Observed unknown production plan content: recoveryCheckpointRequired is not boolean.",
    });
  }

  const rawOperations: readonly unknown[] = Array.isArray(plan.operations) ? plan.operations : [];
  if (!Array.isArray(plan.operations)) {
    failures.push({ kind: "unexpected-operation", summary: "Observed unknown production plan content: operations is not an array." });
  }

  const observedOperations: PlannedOperation[] = [];
  for (const rawOperation of rawOperations) {
    if (!isKnownObservedOperation(rawOperation)) {
      const kind = isRecord(rawOperation) ? rawOperation.kind : undefined;
      failures.push({
        kind: "unexpected-operation",
        summary: `Observed unknown or malformed production plan operation${kind === undefined ? "" : ` kind ${String(kind)}`}.`,
      });
      continue;
    }
    observedOperations.push(rawOperation);
  }

  const forbiddenKinds: ReadonlySet<PlanOperationKind> = new Set(expectation.forbiddenKinds);
  for (const operation of observedOperations) {
    if (forbiddenKinds.has(operation.kind)) {
      failures.push({
        kind: "forbidden-operation-kind",
        summary: `Observed forbidden operation kind ${operation.kind} at ${operation.path}.`,
        operation,
      });
    }
  }

  const consumed = new Set<number>();
  for (const expected of expectation.expectedOperations) {
    const exactIndex = observedOperations.findIndex(
      (operation, index) => !consumed.has(index) && optionalIdentityMatches(expected, operation) && operation.destructive === expected.destructive,
    );
    if (exactIndex >= 0) {
      consumed.add(exactIndex);
      continue;
    }

    const identityIndex = observedOperations.findIndex(
      (operation, index) => !consumed.has(index) && optionalIdentityMatches(expected, operation),
    );
    if (identityIndex >= 0) {
      consumed.add(identityIndex);
      const operation = observedOperations[identityIndex]!;
      failures.push({
        kind: "destructive-expectation-mismatch",
        summary: `Expected ${expectedSummary(expected)}; observed ${operationSummary(operation)}.`,
        operation,
      });
      continue;
    }

    const sameKindIndex = observedOperations.findIndex(
      (operation, index) => !consumed.has(index) && operation.kind === expected.kind,
    );
    if (sameKindIndex >= 0) {
      consumed.add(sameKindIndex);
      const operation = observedOperations[sameKindIndex]!;
      failures.push({
        kind: "path-or-identity-mismatch",
        summary: `Expected ${expectedSummary(expected)}; observed ${operationSummary(operation)}.`,
        operation,
      });
      continue;
    }

    failures.push({
      kind: "expected-operation-missing",
      summary: `Expected operation was not observed: ${expectedSummary(expected)}.`,
    });
  }

  observedOperations.forEach((operation, index) => {
    if (consumed.has(index)) return;
    if (isPermittedBackgroundNoop(operation, expectation)) return;
    failures.push({
      kind: "unexpected-operation",
      summary: `Observed operation outside the scenario contract: ${operationSummary(operation)}.`,
      operation,
    });
  });

  const observedConflicts = observedOperations.filter((operation) => operation.kind === "unresolved-conflict");
  const expectedConflicts = expectation.expectedOperations.filter((operation) => operation.kind === "unresolved-conflict");
  if (expectation.conflictExpectation === "forbidden" && observedConflicts.length > 0) {
    failures.push({
      kind: "conflict-expectation-mismatch",
      summary: `Scenario forbids conflicts; observed ${observedConflicts.length} unresolved-conflict operation(s).`,
      operation: observedConflicts[0],
    });
  } else if (expectation.conflictExpectation === "required" && observedConflicts.length === 0) {
    failures.push({ kind: "conflict-expectation-mismatch", summary: "Scenario requires a conflict, but no unresolved-conflict operation was observed." });
  } else if (expectation.conflictExpectation === "allowed-exactly-as-expected" && observedConflicts.length !== expectedConflicts.length) {
    failures.push({
      kind: "conflict-expectation-mismatch",
      summary: `Expected ${expectedConflicts.length} unresolved-conflict operation(s); observed ${observedConflicts.length}.`,
      operation: observedConflicts[0],
    });
  }

  const observedDestructive = observedOperations.filter((operation) => operation.destructive);
  const expectedDestructive = expectation.expectedOperations.filter((operation) => operation.destructive);
  if (expectation.destructiveExpectation === "forbidden" && observedDestructive.length > 0) {
    failures.push({
      kind: "destructive-expectation-mismatch",
      summary: `Scenario forbids destructive operations; observed ${observedDestructive.length}.`,
      operation: observedDestructive[0],
    });
  } else if (expectation.destructiveExpectation === "required" && observedDestructive.length === 0) {
    failures.push({ kind: "destructive-expectation-mismatch", summary: "Scenario requires a destructive operation, but none was observed." });
  } else if (expectation.destructiveExpectation === "allowed-exactly-as-expected" && observedDestructive.length !== expectedDestructive.length) {
    failures.push({
      kind: "destructive-expectation-mismatch",
      summary: `Expected ${expectedDestructive.length} destructive operation(s); observed ${observedDestructive.length}.`,
      operation: observedDestructive[0],
    });
  }

  if (failures.length === 0) {
    return matchedValidationPlanAssertion({ assertionId: input.assertionId, run: expectation.run, plan });
  }

  return mismatchedValidationPlanAssertion({
    run: expectation.run,
    plan,
    failures: failures as [ValidationPlanAssertionFailure, ...ValidationPlanAssertionFailure[]],
  });
}
