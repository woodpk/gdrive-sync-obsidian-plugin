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

interface ValidationFaultSpecificationBase {
  readonly run: ValidationRunIdentity;
  readonly stepId: ValidationStepId;
  /** One-based occurrence at the named boundary. */
  readonly occurrence: number;
}

export type ValidationFaultSpecification =
  | (ValidationFaultSpecificationBase & { readonly kind: "post-dispatch-response-loss"; readonly boundary: "remote-mutation-result" })
  | (ValidationFaultSpecificationBase & { readonly kind: "partial-remote-enumeration"; readonly boundary: "remote-enumeration" })
  | (ValidationFaultSpecificationBase & { readonly kind: "transport-offline"; readonly boundary: "transport-request" })
  | (ValidationFaultSpecificationBase & { readonly kind: "authentication-required"; readonly boundary: "authentication-response" })
  | (ValidationFaultSpecificationBase & { readonly kind: "rate-limited"; readonly boundary: "rate-limit-response" })
  | (ValidationFaultSpecificationBase & { readonly kind: "quota-exhausted"; readonly boundary: "quota-response" })
  | (ValidationFaultSpecificationBase & { readonly kind: "cancellation-timing"; readonly boundary: "execution-cancellation" })
  | (ValidationFaultSpecificationBase & { readonly kind: "validation-state-corruption"; readonly boundary: "validation-state-store" })
  | (ValidationFaultSpecificationBase & { readonly kind: "validation-cursor-loss"; readonly boundary: "validation-cursor-store" });

export function validationFaultSpecification<K extends ValidationFaultKind>(input: {
  readonly run: ValidationRunIdentity;
  readonly stepId: ValidationStepId;
  readonly kind: K;
  readonly occurrence?: number;
}): Extract<ValidationFaultSpecification, { readonly kind: K }>;
export function validationFaultSpecification(input: {
  readonly run: ValidationRunIdentity;
  readonly stepId: ValidationStepId;
  readonly kind: string;
  readonly occurrence?: number;
}): ValidationFaultSpecification;
export function validationFaultSpecification(input: {
  readonly run: ValidationRunIdentity;
  readonly stepId: ValidationStepId;
  readonly kind: string;
  readonly occurrence?: number;
}): ValidationFaultSpecification {
  if (!isValidationFaultKind(input.kind)) throw new Error(`Unsupported validation fault kind: ${input.kind}`);
  const occurrence = input.occurrence ?? 1;
  if (!Number.isSafeInteger(occurrence) || occurrence < 1) throw new Error("Validation fault occurrence must be a positive safe integer.");
  const base = { run: input.run, stepId: input.stepId, occurrence };
  switch (input.kind) {
    case "post-dispatch-response-loss": return Object.freeze({ ...base, kind: input.kind, boundary: "remote-mutation-result" });
    case "partial-remote-enumeration": return Object.freeze({ ...base, kind: input.kind, boundary: "remote-enumeration" });
    case "transport-offline": return Object.freeze({ ...base, kind: input.kind, boundary: "transport-request" });
    case "authentication-required": return Object.freeze({ ...base, kind: input.kind, boundary: "authentication-response" });
    case "rate-limited": return Object.freeze({ ...base, kind: input.kind, boundary: "rate-limit-response" });
    case "quota-exhausted": return Object.freeze({ ...base, kind: input.kind, boundary: "quota-response" });
    case "cancellation-timing": return Object.freeze({ ...base, kind: input.kind, boundary: "execution-cancellation" });
    case "validation-state-corruption": return Object.freeze({ ...base, kind: input.kind, boundary: "validation-state-store" });
    case "validation-cursor-loss": return Object.freeze({ ...base, kind: input.kind, boundary: "validation-cursor-store" });
  }
}

type PostDispatchResponseLossFaultSpecification = Extract<ValidationFaultSpecification, { readonly kind: "post-dispatch-response-loss" }>;
type NonPostDispatchResponseLossFaultSpecification = Exclude<ValidationFaultSpecification, PostDispatchResponseLossFaultSpecification>;

export type ValidationFaultResult =
  | { readonly status: "not-triggered"; readonly specification: ValidationFaultSpecification }
  | {
      readonly status: "triggered-non-mutation";
      readonly specification: NonPostDispatchResponseLossFaultSpecification;
      readonly physicalEffect: { readonly status: "not-applicable" };
    }
  | {
      readonly status: "triggered-pre-dispatch";
      readonly specification: NonPostDispatchResponseLossFaultSpecification;
      readonly physicalEffect: { readonly status: "verified-not-applied"; readonly basis: "fault-before-dispatch" };
    }
  | {
      readonly status: "triggered-post-dispatch";
      readonly specification: PostDispatchResponseLossFaultSpecification;
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
type FailedAssertionGroup = Extract<ValidationAssertionGroupResult, { readonly verdict: "fail" }>;
type BlockedAssertionGroup = Extract<ValidationAssertionGroupResult, { readonly verdict: "blocked" }>;
type NonFailedAssertionGroup = PassedAssertionGroup | BlockedAssertionGroup;

export type ValidationVerificationResult =
  | { readonly verdict: "pass"; readonly run: ValidationRunIdentity; readonly state: PassedAssertionGroup; readonly convergence: PassedAssertionGroup }
  | { readonly verdict: "fail"; readonly run: ValidationRunIdentity; readonly state: FailedAssertionGroup; readonly convergence: ValidationAssertionGroupResult }
  | { readonly verdict: "fail"; readonly run: ValidationRunIdentity; readonly state: NonFailedAssertionGroup; readonly convergence: FailedAssertionGroup }
  | { readonly verdict: "blocked"; readonly run: ValidationRunIdentity; readonly state: BlockedAssertionGroup; readonly convergence: NonFailedAssertionGroup }
  | { readonly verdict: "blocked"; readonly run: ValidationRunIdentity; readonly state: PassedAssertionGroup; readonly convergence: BlockedAssertionGroup };

export function validationVerificationResult(
  run: ValidationRunIdentity,
  state: ValidationAssertionGroupResult,
  convergence: ValidationAssertionGroupResult,
): ValidationVerificationResult {
  if (state.verdict === "fail") return { verdict: "fail", run, state, convergence };
  if (convergence.verdict === "fail") return { verdict: "fail", run, state, convergence };
  if (state.verdict === "blocked") return { verdict: "blocked", run, state, convergence };
  if (convergence.verdict === "blocked") return { verdict: "blocked", run, state, convergence };
  return { verdict: "pass", run, state, convergence };
}
