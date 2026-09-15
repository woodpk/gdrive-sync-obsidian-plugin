/**
 * Frozen H0B contracts for the Phase 6 live-validation harness.
 *
 * These types describe validation-only orchestration around the existing
 * production synchronization path. They confer no synchronization authority,
 * implement no mutation/fault behavior, and depend on no Node/Electron APIs.
 */
import {
  PLAN_OPERATION_KINDS,
  type PlanOperationKind,
  type PlannedOperation,
  type RemoteObjectId,
  type SyncSide,
  type SynchronizationPlan,
  type VaultPath,
} from "../contracts";
import type { ValidationRunIdentity, ValidationStepId } from "./run-sandbox-checkpoint-contracts";

type ValidationH0BBrand<Name extends string> = string & { readonly __validationH0BBrand: Name };
export type ValidationPlanAssertionId = ValidationH0BBrand<"ValidationPlanAssertionId">;
export type ValidationAssertionId = ValidationH0BBrand<"ValidationAssertionId">;
export type ValidationEvidenceRef = ValidationH0BBrand<"ValidationEvidenceRef">;

function h0bId<Name extends string>(value: string, label: string): ValidationH0BBrand<Name> {
  if (value.length === 0 || value.trim() !== value) throw new Error(`${label} must be a non-empty, trim-stable string.`);
  return value as ValidationH0BBrand<Name>;
}
export const validationPlanAssertionId = (value: string): ValidationPlanAssertionId => h0bId<"ValidationPlanAssertionId">(value, "Validation plan assertion ID");
export const validationAssertionId = (value: string): ValidationAssertionId => h0bId<"ValidationAssertionId">(value, "Validation assertion ID");
export const validationEvidenceRef = (value: string): ValidationEvidenceRef => h0bId<"ValidationEvidenceRef">(value, "Validation evidence reference");

export const VALIDATION_PRODUCTION_DRIVER_REQUEST_KINDS = [
  "preview-manual",
  "preview-verify-reconcile",
  "run-automatic",
  "execute-asserted-plan",
  "cancel-active-sync",
] as const;
export type ValidationProductionDriverRequestKind = (typeof VALIDATION_PRODUCTION_DRIVER_REQUEST_KINDS)[number];

export interface ValidationPlanExecutionAuthorization {
  readonly assertionId: ValidationPlanAssertionId;
  readonly run: ValidationRunIdentity;
  readonly planId: SynchronizationPlan["planId"];
  readonly executionAuthorized: true;
}

export type ValidationProductionDriverRequest =
  | { readonly kind: "preview-manual"; readonly run: ValidationRunIdentity; readonly stepId: ValidationStepId }
  | { readonly kind: "preview-verify-reconcile"; readonly run: ValidationRunIdentity; readonly stepId: ValidationStepId }
  | { readonly kind: "run-automatic"; readonly run: ValidationRunIdentity; readonly stepId: ValidationStepId; readonly trigger: "startup-resume" | "local-change" | "periodic" }
  | { readonly kind: "execute-asserted-plan"; readonly run: ValidationRunIdentity; readonly stepId: ValidationStepId; readonly authorization: ValidationPlanExecutionAuthorization }
  | { readonly kind: "cancel-active-sync"; readonly run: ValidationRunIdentity; readonly stepId: ValidationStepId };

/** Driver acknowledgement never claims that a production mutation succeeded. */
export type ValidationProductionDriverResult =
  | { readonly status: "plan-observed"; readonly run: ValidationRunIdentity; readonly plan: SynchronizationPlan }
  | { readonly status: "no-plan-observed"; readonly run: ValidationRunIdentity; readonly reason: string }
  | { readonly status: "request-accepted"; readonly run: ValidationRunIdentity; readonly requestKind: Exclude<ValidationProductionDriverRequestKind, "preview-manual" | "preview-verify-reconcile">; readonly productionOutcomeEstablished: false }
  | { readonly status: "request-rejected" | "request-failed"; readonly run: ValidationRunIdentity; readonly reason: string; readonly productionOutcomeEstablished: false };

export interface ValidationExpectedPlanOperation {
  readonly kind: PlanOperationKind;
  readonly path: VaultPath;
  readonly destructive: boolean;
  readonly targetSide?: SyncSide;
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
  readonly remoteObjectId?: RemoteObjectId;
}

export const VALIDATION_CONFLICT_EXPECTATIONS = ["forbidden", "allowed-exactly-as-expected", "required"] as const;
export type ValidationConflictExpectation = (typeof VALIDATION_CONFLICT_EXPECTATIONS)[number];
export const VALIDATION_DESTRUCTIVE_EXPECTATIONS = ["forbidden", "allowed-exactly-as-expected", "required"] as const;
export type ValidationDestructiveExpectation = (typeof VALIDATION_DESTRUCTIVE_EXPECTATIONS)[number];

export interface ValidationPlanExpectation {
  readonly run: ValidationRunIdentity;
  readonly expectedTrigger?: SynchronizationPlan["trigger"];
  readonly expectedOperations: readonly ValidationExpectedPlanOperation[];
  readonly allowedBackgroundKinds: readonly PlanOperationKind[];
  readonly forbiddenKinds: readonly PlanOperationKind[];
  readonly conflictExpectation: ValidationConflictExpectation;
  readonly destructiveExpectation: ValidationDestructiveExpectation;
  readonly expectedExecutionDisposition?: SynchronizationPlan["executionDisposition"];
  readonly expectedGlobalExecutionGate?: SynchronizationPlan["globalExecutionGate"];
}

export const VALIDATION_PLAN_ASSERTION_FAILURE_KINDS = [
  "trigger-mismatch",
  "expected-operation-missing",
  "unexpected-operation",
  "forbidden-operation-kind",
  "path-or-identity-mismatch",
  "conflict-expectation-mismatch",
  "destructive-expectation-mismatch",
  "execution-disposition-mismatch",
  "global-execution-gate-mismatch",
] as const;
export type ValidationPlanAssertionFailureKind = (typeof VALIDATION_PLAN_ASSERTION_FAILURE_KINDS)[number];
export interface ValidationPlanAssertionFailure {
  readonly kind: ValidationPlanAssertionFailureKind;
  readonly summary: string;
  readonly operation?: PlannedOperation;
}

type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];
export type ValidationPlanAssertionResult =
  | {
      readonly status: "matched";
      readonly run: ValidationRunIdentity;
      readonly plan: SynchronizationPlan;
      readonly authorization: ValidationPlanExecutionAuthorization;
    }
  | {
      readonly status: "mismatch";
      readonly run: ValidationRunIdentity;
      readonly plan: SynchronizationPlan;
      readonly failures: NonEmptyReadonlyArray<ValidationPlanAssertionFailure>;
      readonly executionAuthorized: false;
    };

export function matchedValidationPlanAssertion(input: {
  readonly assertionId: string;
  readonly run: ValidationRunIdentity;
  readonly plan: SynchronizationPlan;
}): Extract<ValidationPlanAssertionResult, { readonly status: "matched" }> {
  return Object.freeze({
    status: "matched",
    run: input.run,
    plan: input.plan,
    authorization: Object.freeze({
      assertionId: validationPlanAssertionId(input.assertionId),
      run: input.run,
      planId: input.plan.planId,
      executionAuthorized: true,
    }),
  });
}

export function mismatchedValidationPlanAssertion(input: {
  readonly run: ValidationRunIdentity;
  readonly plan: SynchronizationPlan;
  readonly failures: NonEmptyReadonlyArray<ValidationPlanAssertionFailure>;
}): Extract<ValidationPlanAssertionResult, { readonly status: "mismatch" }> {
  return Object.freeze({ status: "mismatch", run: input.run, plan: input.plan, failures: input.failures, executionAuthorized: false });
}

export function validationPlanExpectation(input: ValidationPlanExpectation): ValidationPlanExpectation {
  const allowed = new Set(input.allowedBackgroundKinds);
  const forbidden = new Set(input.forbiddenKinds);
  for (const kind of [...allowed, ...forbidden]) {
    if (!(PLAN_OPERATION_KINDS as readonly string[]).includes(kind)) throw new Error(`Unsupported production plan operation kind: ${String(kind)}`);
  }
  for (const kind of allowed) if (forbidden.has(kind)) throw new Error(`Plan operation kind cannot be both allowed background and forbidden: ${kind}`);
  return Object.freeze({ ...input });
}

export const VALIDATION_FAULT_KINDS = [
  "post-dispatch-response-loss",
  "partial-remote-enumeration",
  "transport-offline",
  "authentication-required",
  "rate-limited",
  "quota-exhausted",
  "cancellation-timing",
  "validation-state-corruption",
  "validation-cursor-loss",
] as const;
export type ValidationFaultKind = (typeof VALIDATION_FAULT_KINDS)[number];
const VALIDATION_FAULT_KIND_SET: ReadonlySet<string> = new Set(VALIDATION_FAULT_KINDS);
export function isValidationFaultKind(value: string): value is ValidationFaultKind { return VALIDATION_FAULT_KIND_SET.has(value); }

export const VALIDATION_FAULT_BOUNDARIES = [
  "remote-mutation-result",
  "remote-enumeration",
  "transport-request",
  "authentication-response",
  "rate-limit-response",
  "quota-response",
  "execution-cancellation",
  "validation-state-store",
  "validation-cursor-store",
] as const;
export type ValidationFaultBoundary = (typeof VALIDATION_FAULT_BOUNDARIES)[number];

const FAULT_BOUNDARY_BY_KIND: Readonly<Record<ValidationFaultKind, ValidationFaultBoundary>> = {
  "post-dispatch-response-loss": "remote-mutation-result",
  "partial-remote-enumeration": "remote-enumeration",
  "transport-offline": "transport-request",
  "authentication-required": "authentication-response",
  "rate-limited": "rate-limit-response",
  "quota-exhausted": "quota-response",
  "cancellation-timing": "execution-cancellation",
  "validation-state-corruption": "validation-state-store",
  "validation-cursor-loss": "validation-cursor-store",
};

export interface ValidationFaultSpecification {
  readonly run: ValidationRunIdentity;
  readonly stepId: ValidationStepId;
  readonly kind: ValidationFaultKind;
  readonly boundary: ValidationFaultBoundary;
  /** One-based occurrence at the named boundary. */
  readonly occurrence: number;
}

export function validationFaultSpecification(input: {
  readonly run: ValidationRunIdentity;
  readonly stepId: ValidationStepId;
  readonly kind: string;
  readonly occurrence?: number;
}): ValidationFaultSpecification {
  if (!isValidationFaultKind(input.kind)) throw new Error(`Unsupported validation fault kind: ${input.kind}`);
  const occurrence = input.occurrence ?? 1;
  if (!Number.isSafeInteger(occurrence) || occurrence < 1) throw new Error("Validation fault occurrence must be a positive safe integer.");
  return Object.freeze({ run: input.run, stepId: input.stepId, kind: input.kind, boundary: FAULT_BOUNDARY_BY_KIND[input.kind], occurrence });
}

export type ValidationFaultResult =
  | { readonly status: "not-triggered"; readonly specification: ValidationFaultSpecification }
  | {
      readonly status: "triggered-non-mutation";
      readonly specification: ValidationFaultSpecification;
      readonly physicalEffect: { readonly status: "not-applicable" };
    }
  | {
      readonly status: "triggered-pre-dispatch";
      readonly specification: ValidationFaultSpecification;
      readonly physicalEffect: { readonly status: "verified-not-applied"; readonly basis: "fault-before-dispatch" };
    }
  | {
      readonly status: "triggered-post-dispatch";
      readonly specification: ValidationFaultSpecification;
      readonly physicalEffect: { readonly status: "outcome-unknown"; readonly reason: string };
    };

export const VALIDATION_STATE_ASSERTION_KINDS = [
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
] as const;
export type ValidationStateAssertionKind = (typeof VALIDATION_STATE_ASSERTION_KINDS)[number];

export const VALIDATION_CONVERGENCE_ASSERTION_KINDS = [
  "cross-device-content",
  "cross-device-path",
  "cross-device-authority",
  "cross-device-conflict-resolution",
  "final-reconciliation-stable",
] as const;
export type ValidationConvergenceAssertionKind = (typeof VALIDATION_CONVERGENCE_ASSERTION_KINDS)[number];

export interface ValidationStateAssertion {
  readonly assertionId: ValidationAssertionId;
  readonly kind: ValidationStateAssertionKind;
  readonly subject: string;
  readonly expectation: string;
}
export interface ValidationConvergenceAssertion {
  readonly assertionId: ValidationAssertionId;
  readonly kind: ValidationConvergenceAssertionKind;
  readonly subject: string;
  readonly expectation: string;
}
export type ValidationAssertion = ValidationStateAssertion | ValidationConvergenceAssertion;

export type ValidationAssertionObservation =
  | { readonly status: "satisfied"; readonly assertion: ValidationAssertion; readonly evidenceRefs: NonEmptyReadonlyArray<ValidationEvidenceRef> }
  | { readonly status: "failed"; readonly assertion: ValidationAssertion; readonly reason: string; readonly evidenceRefs: readonly ValidationEvidenceRef[] }
  | { readonly status: "not-observable"; readonly assertion: ValidationAssertion; readonly reason: string; readonly evidenceRefs: readonly ValidationEvidenceRef[] };

export type ValidationAssertionGroupResult =
  | { readonly verdict: "pass"; readonly observations: NonEmptyReadonlyArray<Extract<ValidationAssertionObservation, { readonly status: "satisfied" }>> }
  | { readonly verdict: "fail"; readonly observations: NonEmptyReadonlyArray<ValidationAssertionObservation>; readonly failures: NonEmptyReadonlyArray<Extract<ValidationAssertionObservation, { readonly status: "failed" }>> }
  | { readonly verdict: "blocked"; readonly observations: NonEmptyReadonlyArray<ValidationAssertionObservation>; readonly blockers: NonEmptyReadonlyArray<Extract<ValidationAssertionObservation, { readonly status: "not-observable" }>> };

export function validationAssertionGroupResult(observations: NonEmptyReadonlyArray<ValidationAssertionObservation>): ValidationAssertionGroupResult {
  const failures = observations.filter((observation): observation is Extract<ValidationAssertionObservation, { readonly status: "failed" }> => observation.status === "failed");
  if (failures.length > 0) return { verdict: "fail", observations, failures: failures as unknown as NonEmptyReadonlyArray<typeof failures[number]> };
  const blockers = observations.filter((observation): observation is Extract<ValidationAssertionObservation, { readonly status: "not-observable" }> => observation.status === "not-observable");
  if (blockers.length > 0) return { verdict: "blocked", observations, blockers: blockers as unknown as NonEmptyReadonlyArray<typeof blockers[number]> };
  return { verdict: "pass", observations: observations as NonEmptyReadonlyArray<Extract<ValidationAssertionObservation, { readonly status: "satisfied" }>> };
}

type PassedAssertionGroup = Extract<ValidationAssertionGroupResult, { readonly verdict: "pass" }>;
export type ValidationVerificationResult =
  | { readonly verdict: "pass"; readonly run: ValidationRunIdentity; readonly state: PassedAssertionGroup; readonly convergence: PassedAssertionGroup }
  | { readonly verdict: "fail"; readonly run: ValidationRunIdentity; readonly state: ValidationAssertionGroupResult; readonly convergence: ValidationAssertionGroupResult }
  | { readonly verdict: "blocked"; readonly run: ValidationRunIdentity; readonly state: Exclude<ValidationAssertionGroupResult, { readonly verdict: "fail" }>; readonly convergence: Exclude<ValidationAssertionGroupResult, { readonly verdict: "fail" }> };

export function validationVerificationResult(
  run: ValidationRunIdentity,
  state: ValidationAssertionGroupResult,
  convergence: ValidationAssertionGroupResult,
): ValidationVerificationResult {
  if (state.verdict === "fail" || convergence.verdict === "fail") return { verdict: "fail", run, state, convergence };
  if (state.verdict === "blocked" || convergence.verdict === "blocked") return { verdict: "blocked", run, state, convergence };
  return { verdict: "pass", run, state, convergence };
}
