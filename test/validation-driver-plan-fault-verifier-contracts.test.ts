import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type SynchronizationPlan } from "../src/contracts";
import {
  VALIDATION_CONVERGENCE_ASSERTION_KINDS,
  VALIDATION_FAULT_KINDS,
  VALIDATION_PLAN_ASSERTION_FAILURE_KINDS,
  VALIDATION_PRODUCTION_DRIVER_REQUEST_KINDS,
  VALIDATION_STATE_ASSERTION_KINDS,
  isValidationFaultKind,
  matchedValidationPlanAssertion,
  mismatchedValidationPlanAssertion,
  validationAssertionGroupResult,
  validationAssertionId,
  validationEvidenceRef,
  validationFaultSpecification,
  validationPlanExpectation,
  validationVerificationResult,
  type ValidationAssertionObservation,
  type ValidationFaultResult,
  type ValidationFaultSpecification,
  type ValidationPlanAssertionResult,
  type ValidationProductionDriverRequest,
  type ValidationVerificationResult,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import { validationRunIdentity, validationStepId } from "../src/validation/run-sandbox-checkpoint-contracts";

const run = validationRunIdentity("run-vh02-e02", "E02");
const stepId = validationStepId("drive-production-path");
const plan: SynchronizationPlan = {
  planId: contractId<"PlanId">("plan-vh02-e02"),
  trigger: "manual",
  operations: [],
  executionDisposition: "safe-auto-eligible",
  recoveryCheckpointRequired: false,
  globalExecutionGate: "none",
};

test("VH02 driver requests are bounded to production-path orchestration actions", () => {
  assert.deepEqual(VALIDATION_PRODUCTION_DRIVER_REQUEST_KINDS, [
    "preview-manual",
    "preview-verify-reconcile",
    "run-automatic",
    "execute-asserted-plan",
    "cancel-active-sync",
  ]);
  const matched = matchedValidationPlanAssertion({ assertionId: "assert-e02-plan", run, plan });
  const execute: ValidationProductionDriverRequest = { kind: "execute-asserted-plan", run, stepId, authorization: matched.authorization };
  assert.equal(execute.authorization.executionAuthorized, true);
  assert.equal(execute.authorization.planId, plan.planId);
});

test("plan expectations reject a kind that is simultaneously allowed background and forbidden", () => {
  const valid = validationPlanExpectation({
    run,
    expectedTrigger: "manual",
    expectedOperations: [],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: ["trash-local", "trash-remote"],
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
  assert.deepEqual(valid.allowedBackgroundKinds, ["noop"]);
  assert.throws(() => validationPlanExpectation({ ...valid, forbiddenKinds: ["noop"] }), /both allowed background and forbidden/);
});

test("plan mismatch is structurally fail-closed and cannot carry execution authorization", () => {
  assert.deepEqual(VALIDATION_PLAN_ASSERTION_FAILURE_KINDS, [
    "trigger-mismatch",
    "expected-operation-missing",
    "unexpected-operation",
    "forbidden-operation-kind",
    "path-or-identity-mismatch",
    "conflict-expectation-mismatch",
    "destructive-expectation-mismatch",
    "execution-disposition-mismatch",
    "global-execution-gate-mismatch",
  ]);
  const result = mismatchedValidationPlanAssertion({
    run,
    plan,
    failures: [{ kind: "unexpected-operation", summary: "Observed an operation outside the scenario contract." }],
  });
  assert.equal(result.status, "mismatch");
  assert.equal(result.executionAuthorized, false);
});

test("fault specifications freeze approved deterministic fault classes and exact boundaries", () => {
  assert.deepEqual(VALIDATION_FAULT_KINDS, [
    "post-dispatch-response-loss",
    "partial-remote-enumeration",
    "transport-offline",
    "authentication-required",
    "rate-limited",
    "quota-exhausted",
    "cancellation-timing",
    "validation-state-corruption",
    "validation-cursor-loss",
  ]);
  assert.equal(isValidationFaultKind("post-dispatch-response-loss"), true);
  assert.equal(isValidationFaultKind("fabricate-success"), false);
  assert.deepEqual(validationFaultSpecification({ run, stepId, kind: "post-dispatch-response-loss", occurrence: 2 }), {
    run,
    stepId,
    kind: "post-dispatch-response-loss",
    boundary: "remote-mutation-result",
    occurrence: 2,
  });
  assert.throws(() => validationFaultSpecification({ run, stepId, kind: "fabricate-success" }), /Unsupported/);
  assert.throws(() => validationFaultSpecification({ run, stepId, kind: "rate-limited", occurrence: 0 }), /positive safe integer/);
});

test("post-dispatch fault results preserve physical uncertainty rather than manufacturing certainty", () => {
  const specification = validationFaultSpecification({ run, stepId, kind: "post-dispatch-response-loss" });
  const result: ValidationFaultResult = {
    status: "triggered-post-dispatch",
    specification,
    physicalEffect: { status: "outcome-unknown", reason: "The real remote mutation may have completed before its client result was withheld." },
  };
  assert.equal(result.physicalEffect.status, "outcome-unknown");
});

test("state and convergence vocabularies remain separate", () => {
  assert.deepEqual(VALIDATION_STATE_ASSERTION_KINDS, [
    "local-content",
    "remote-content",
    "remote-identity",
    "live-trash-absence-state",
    "base-authority",
    "mapping-or-tombstone",
    "authority-generation-or-revision",
    "durable-intent-or-effect",
    "change-cursor-or-completeness",
    "conflict-provenance",
    "unrelated-mutation-absence",
    "terminal-product-result",
  ]);
  assert.deepEqual(VALIDATION_CONVERGENCE_ASSERTION_KINDS, [
    "cross-device-content",
    "cross-device-path",
    "cross-device-authority",
    "cross-device-conflict-resolution",
    "final-reconciliation-stable",
  ]);
});

test("missing required proof becomes BLOCKED and cannot silently produce PASS", () => {
  const stateAssertion = {
    assertionId: validationAssertionId("state-remote-identity"),
    kind: "remote-identity" as const,
    subject: "validation remote object",
    expectation: "Stable remote object identity remains unchanged.",
  };
  const convergenceAssertion = {
    assertionId: validationAssertionId("convergence-final"),
    kind: "final-reconciliation-stable" as const,
    subject: "Windows and mobile participants",
    expectation: "A final Verify/Reconcile observes stable convergence.",
  };
  const stateObservation: ValidationAssertionObservation = {
    status: "not-observable",
    assertion: stateAssertion,
    reason: "Required Drive identity evidence is unavailable.",
    evidenceRefs: [],
  };
  const convergenceObservation: ValidationAssertionObservation = {
    status: "satisfied",
    assertion: convergenceAssertion,
    evidenceRefs: [validationEvidenceRef("evidence:final-reconcile")],
  };
  const state = validationAssertionGroupResult([stateObservation]);
  const convergence = validationAssertionGroupResult([convergenceObservation]);
  const result = validationVerificationResult(run, state, convergence);
  assert.equal(state.verdict, "blocked");
  assert.equal(convergence.verdict, "pass");
  assert.equal(result.verdict, "blocked");
});

test("verification result preserves FAIL > BLOCKED > PASS across valid group combinations", () => {
  const satisfiedState: ValidationAssertionObservation = {
    status: "satisfied",
    assertion: {
      assertionId: validationAssertionId("state-pass"),
      kind: "local-content",
      subject: "local fixture",
      expectation: "Expected bytes are present.",
    },
    evidenceRefs: [validationEvidenceRef("evidence:state-pass")],
  };
  const satisfiedConvergence: ValidationAssertionObservation = {
    status: "satisfied",
    assertion: {
      assertionId: validationAssertionId("convergence-pass"),
      kind: "cross-device-content",
      subject: "Windows and mobile bytes",
      expectation: "All participants have the expected bytes.",
    },
    evidenceRefs: [validationEvidenceRef("evidence:convergence-pass")],
  };
  const failedState: ValidationAssertionObservation = {
    status: "failed",
    assertion: {
      assertionId: validationAssertionId("state-fail"),
      kind: "unrelated-mutation-absence",
      subject: "validation sandbox",
      expectation: "No unrelated mutation occurs.",
    },
    reason: "An unrelated path changed.",
    evidenceRefs: [validationEvidenceRef("evidence:state-fail")],
  };
  const blockedConvergence: ValidationAssertionObservation = {
    status: "not-observable",
    assertion: {
      assertionId: validationAssertionId("convergence-blocked"),
      kind: "final-reconciliation-stable",
      subject: "final reconciliation",
      expectation: "Stable convergence is independently observable.",
    },
    reason: "Mobile participant is unavailable.",
    evidenceRefs: [],
  };
  const passState = validationAssertionGroupResult([satisfiedState]);
  const passConvergence = validationAssertionGroupResult([satisfiedConvergence]);
  const failState = validationAssertionGroupResult([failedState]);
  const blockedConvergenceGroup = validationAssertionGroupResult([blockedConvergence]);

  assert.equal(validationVerificationResult(run, passState, passConvergence).verdict, "pass");
  assert.equal(validationVerificationResult(run, failState, passConvergence).verdict, "fail");
  assert.equal(validationVerificationResult(run, passState, blockedConvergenceGroup).verdict, "blocked");
  assert.equal(validationVerificationResult(run, blockedConvergenceGroup, blockedConvergenceGroup).verdict, "blocked");
  assert.equal(validationVerificationResult(run, failState, blockedConvergenceGroup).verdict, "fail");
});

test("any failed state or convergence assertion dominates BLOCKED and yields FAIL", () => {
  const failedState: ValidationAssertionObservation = {
    status: "failed",
    assertion: {
      assertionId: validationAssertionId("state-unrelated-mutation"),
      kind: "unrelated-mutation-absence",
      subject: "validation run sandbox",
      expectation: "No unrelated mutation occurred.",
    },
    reason: "An unrelated path changed.",
    evidenceRefs: [validationEvidenceRef("evidence:unexpected-path")],
  };
  const blockedConvergence: ValidationAssertionObservation = {
    status: "not-observable",
    assertion: {
      assertionId: validationAssertionId("convergence-cross-device"),
      kind: "cross-device-content",
      subject: "Windows and mobile bytes",
      expectation: "All participants converge to exact expected bytes.",
    },
    reason: "Mobile participant is unavailable.",
    evidenceRefs: [],
  };
  const result = validationVerificationResult(
    run,
    validationAssertionGroupResult([failedState]),
    validationAssertionGroupResult([blockedConvergence]),
  );
  assert.equal(result.verdict, "fail");
});

const matchedForTypes = matchedValidationPlanAssertion({ assertionId: "typecheck-plan", run, plan });
const validExecuteTypeCheck: ValidationProductionDriverRequest = { kind: "execute-asserted-plan", run, stepId, authorization: matchedForTypes.authorization };
void validExecuteTypeCheck;
// @ts-expect-error raw observed plans are not sufficient authority for execution; an assertion authorization is required.
const invalidExecuteTypeCheck: ValidationProductionDriverRequest = { kind: "execute-asserted-plan", run, stepId, plan };
void invalidExecuteTypeCheck;

const mismatchTypeCheck: Extract<ValidationPlanAssertionResult, { readonly status: "mismatch" }> = {
  status: "mismatch",
  run,
  plan,
  failures: [{ kind: "unexpected-operation", summary: "unexpected" }],
  executionAuthorized: false,
};
void mismatchTypeCheck;
// @ts-expect-error a mismatched plan may never authorize execution.
const invalidMismatchTypeCheck: Extract<ValidationPlanAssertionResult, { readonly status: "mismatch" }> = { ...mismatchTypeCheck, executionAuthorized: true };
void invalidMismatchTypeCheck;

// @ts-expect-error post-dispatch-response-loss has exactly one valid boundary.
const invalidPostDispatchBoundaryTypeCheck: ValidationFaultSpecification = { run, stepId, kind: "post-dispatch-response-loss", boundary: "transport-request", occurrence: 1 };
void invalidPostDispatchBoundaryTypeCheck;

const postDispatchSpecification = validationFaultSpecification({ run, stepId, kind: "post-dispatch-response-loss" });
// @ts-expect-error post-dispatch-response-loss cannot be recategorized as pre-dispatch verified-not-applied.
const invalidPostDispatchPreDispatchTypeCheck: ValidationFaultResult = { status: "triggered-pre-dispatch", specification: postDispatchSpecification, physicalEffect: { status: "verified-not-applied", basis: "fault-before-dispatch" } };
void invalidPostDispatchPreDispatchTypeCheck;
// @ts-expect-error post-dispatch fault results must remain outcome-unknown and cannot claim verified-not-applied.
const invalidPostDispatchCertaintyTypeCheck: Extract<ValidationFaultResult, { readonly status: "triggered-post-dispatch" }> = { status: "triggered-post-dispatch", specification: postDispatchSpecification, physicalEffect: { status: "verified-not-applied", basis: "fault-before-dispatch" } };
void invalidPostDispatchCertaintyTypeCheck;

const satisfiedForTypes: ValidationAssertionObservation = {
  status: "satisfied",
  assertion: { assertionId: validationAssertionId("typecheck-state"), kind: "local-content", subject: "local fixture", expectation: "expected hash" },
  evidenceRefs: [validationEvidenceRef("evidence:typecheck")],
};
const passGroupForTypes = validationAssertionGroupResult([satisfiedForTypes]);
if (passGroupForTypes.verdict === "pass") {
  const passVerificationTypeCheck: ValidationVerificationResult = { verdict: "pass", run, state: passGroupForTypes, convergence: passGroupForTypes };
  void passVerificationTypeCheck;
  // @ts-expect-error FAIL requires at least one failed assertion group.
  const invalidFailPassPassTypeCheck: ValidationVerificationResult = { verdict: "fail", run, state: passGroupForTypes, convergence: passGroupForTypes };
  void invalidFailPassPassTypeCheck;
  // @ts-expect-error BLOCKED requires at least one blocked assertion group.
  const invalidBlockedPassPassTypeCheck: ValidationVerificationResult = { verdict: "blocked", run, state: passGroupForTypes, convergence: passGroupForTypes };
  void invalidBlockedPassPassTypeCheck;
}
// @ts-expect-error satisfied observations require at least one evidence reference.
const invalidSatisfiedObservationTypeCheck: ValidationAssertionObservation = { status: "satisfied", assertion: satisfiedForTypes.assertion, evidenceRefs: [] };
void invalidSatisfiedObservationTypeCheck;
