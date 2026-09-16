import {
  validationEvidenceRef,
  type ValidationEvidenceRef,
  type ValidationFaultResult,
  type ValidationFaultSpecification,
} from "./driver-plan-fault-verifier-contracts";
import type {
  ValidationRunIdentity,
  ValidationSandboxAuthorization,
  ValidationSandboxResourceId,
} from "./run-sandbox-checkpoint-contracts";

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return String(left.runId) === String(right.runId) && left.scenarioId === right.scenarioId;
}

function faultOccurrenceKey(specification: ValidationFaultSpecification, observationPoint: string): string {
  return [
    String(specification.run.runId),
    specification.run.scenarioId,
    String(specification.stepId),
    specification.kind,
    specification.boundary,
    observationPoint,
  ].join("|");
}

/** Deterministic one-based occurrence counter shared by validation fault hooks. */
export class ValidationFaultOccurrenceCounter {
  private readonly counts = new Map<string, number>();

  observe(specification: ValidationFaultSpecification, observationPoint: string = specification.boundary): boolean {
    const key = faultOccurrenceKey(specification, observationPoint);
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next === specification.occurrence;
  }
}

export interface ValidationDurableDispatchEvidence {
  readonly durableIntentEvidenceRef: ValidationEvidenceRef;
  readonly remoteDispatchEvidenceRef: ValidationEvidenceRef;
}

export type ValidationAmbiguousRemoteMutation = Extract<ValidationFaultResult, { readonly status: "triggered-post-dispatch" }> & {
  readonly durableDispatch: ValidationDurableDispatchEvidence;
  readonly requiresObservation: true;
};

export type ValidationPostDispatchResponseLossResult =
  | Extract<ValidationFaultResult, { readonly status: "not-triggered" }>
  | ValidationAmbiguousRemoteMutation;

/**
 * Validation-only ordering guard for response loss after a remote mutation may
 * have been dispatched. It cannot arm the ambiguity hook until durable-intent
 * persistence is evidenced before dispatch.
 */
export class ValidationRemoteMutationAmbiguityHook {
  private durableIntentEvidenceRef?: ValidationEvidenceRef;
  private remoteDispatchEvidenceRef?: ValidationEvidenceRef;

  recordDurableIntentPersisted(evidenceRef: string): void {
    if (this.durableIntentEvidenceRef) throw new Error("Durable-intent persistence evidence was already recorded.");
    this.durableIntentEvidenceRef = validationEvidenceRef(evidenceRef);
  }

  recordRemoteMutationDispatched(evidenceRef: string): void {
    if (!this.durableIntentEvidenceRef) {
      throw new Error("Remote mutation dispatch cannot be recorded before durable-intent persistence evidence.");
    }
    if (this.remoteDispatchEvidenceRef) throw new Error("Remote mutation dispatch evidence was already recorded.");
    this.remoteDispatchEvidenceRef = validationEvidenceRef(evidenceRef);
  }

  injectResponseLoss(
    specification: ValidationFaultSpecification,
    occurrences: ValidationFaultOccurrenceCounter,
  ): ValidationPostDispatchResponseLossResult {
    if (specification.kind !== "post-dispatch-response-loss") {
      throw new Error("The ambiguous-outcome hook accepts only post-dispatch-response-loss faults.");
    }
    if (!this.durableIntentEvidenceRef || !this.remoteDispatchEvidenceRef) {
      throw new Error("Post-dispatch response loss requires durable-intent and remote-dispatch evidence in that order.");
    }
    if (!occurrences.observe(specification, "post-dispatch-pre-response")) {
      return Object.freeze({ status: "not-triggered", specification });
    }
    return Object.freeze({
      status: "triggered-post-dispatch",
      specification,
      physicalEffect: Object.freeze({
        status: "outcome-unknown",
        reason: "The remote mutation was dispatched after durable intent persistence, but its response was intentionally withheld; physical effect remains unknown until independently observed.",
      }),
      durableDispatch: Object.freeze({
        durableIntentEvidenceRef: this.durableIntentEvidenceRef,
        remoteDispatchEvidenceRef: this.remoteDispatchEvidenceRef,
      }),
      requiresObservation: true,
    });
  }
}

export interface ValidationRemoteMutationObservation {
  readonly status: "verified-applied" | "verified-not-applied";
  readonly evidenceRef: ValidationEvidenceRef;
}

export interface ValidationObservedRemoteMutationResolution {
  readonly status: "observed-resolution";
  readonly physicalEffect: ValidationRemoteMutationObservation;
  readonly priorOutcome: ValidationAmbiguousRemoteMutation;
}

/** Ambiguous post-dispatch outcomes can become definite only from observation evidence. */
export function resolveValidationAmbiguousRemoteMutation(
  priorOutcome: ValidationAmbiguousRemoteMutation,
  observation: ValidationRemoteMutationObservation | undefined,
): ValidationObservedRemoteMutationResolution {
  if (!observation) throw new Error("Ambiguous remote mutation outcome requires independent observation evidence.");
  return Object.freeze({ status: "observed-resolution", physicalEffect: observation, priorOutcome });
}

export const VALIDATION_STATE_FAULT_ACTIONS = ["corrupt-state", "remove-state", "remove-cursor"] as const;
export type ValidationStateFaultAction = (typeof VALIDATION_STATE_FAULT_ACTIONS)[number];

export interface ValidationStateBackupEvidence {
  readonly run: ValidationRunIdentity;
  readonly resourceId: ValidationSandboxResourceId;
  readonly evidenceRef: ValidationEvidenceRef;
}

export interface ValidationStateCheckpointEvidence {
  readonly run: ValidationRunIdentity;
  readonly resourceId: ValidationSandboxResourceId;
  readonly evidenceRef: ValidationEvidenceRef;
  readonly sentinelPreserved: true;
}

export interface ValidationStateSafetyEvidence {
  readonly backup: ValidationStateBackupEvidence;
  readonly preFaultCheckpoint: ValidationStateCheckpointEvidence;
}

export interface ValidationDisposableStateMutationPort {
  corruptState(resourceId: ValidationSandboxResourceId): void | Promise<void>;
  removeState(resourceId: ValidationSandboxResourceId): void | Promise<void>;
  removeCursor(resourceId: ValidationSandboxResourceId): void | Promise<void>;
}

export interface ValidationAppliedStateFault {
  readonly fault: Extract<ValidationFaultResult, { readonly status: "triggered-non-mutation" }>;
  readonly action: ValidationStateFaultAction;
  readonly resourceId: ValidationSandboxResourceId;
  readonly safetyEvidence: ValidationStateSafetyEvidence;
}

export type ValidationStateFaultHookResult =
  | { readonly fault: Extract<ValidationFaultResult, { readonly status: "not-triggered" }> }
  | ValidationAppliedStateFault;

function requireDisposableStateAuthorization(
  specification: ValidationFaultSpecification,
  authorization: ValidationSandboxAuthorization,
  safetyEvidence: ValidationStateSafetyEvidence | undefined,
): {
  readonly authorization: Extract<ValidationSandboxAuthorization, { readonly status: "authorized" }>;
  readonly safetyEvidence: ValidationStateSafetyEvidence;
} {
  if (authorization.status !== "authorized") {
    throw new Error(`Direct validation-state manipulation refused: sandbox authorization is ${authorization.status}.`);
  }
  if (authorization.ownership.surface !== "validation-vault-state-copy") {
    throw new Error("Direct validation-state manipulation is allowed only on an authorized disposable validation-vault-state-copy.");
  }
  if (!sameRun(authorization.ownership.owner, specification.run)) {
    throw new Error("Direct validation-state manipulation refused: sandbox authorization belongs to a different validation run.");
  }
  if (!safetyEvidence) {
    throw new Error("Direct validation-state manipulation requires backup and pre-fault checkpoint evidence.");
  }
  const resourceId = String(authorization.ownership.resourceId);
  if (!sameRun(safetyEvidence.backup.run, specification.run)
    || !sameRun(safetyEvidence.preFaultCheckpoint.run, specification.run)
    || String(safetyEvidence.backup.resourceId) !== resourceId
    || String(safetyEvidence.preFaultCheckpoint.resourceId) !== resourceId) {
    throw new Error("Backup/checkpoint evidence must belong to the authorized disposable state resource and validation run.");
  }
  if (!safetyEvidence.preFaultCheckpoint.sentinelPreserved) {
    throw new Error("Pre-fault checkpoint must prove the validation sentinel is preserved.");
  }
  return { authorization, safetyEvidence };
}

function assertStateActionMatchesFault(
  specification: ValidationFaultSpecification,
  action: ValidationStateFaultAction,
): asserts specification is Extract<ValidationFaultSpecification, { readonly kind: "validation-state-corruption" | "validation-cursor-loss" }> {
  if (specification.kind === "validation-state-corruption") {
    if (action === "remove-cursor") throw new Error("validation-state-corruption cannot invoke the cursor-loss action.");
    return;
  }
  if (specification.kind === "validation-cursor-loss") {
    if (action !== "remove-cursor") throw new Error("validation-cursor-loss may remove only the approved validation cursor.");
    return;
  }
  throw new Error("The disposable-state hook accepts only validation-state-corruption or validation-cursor-loss faults.");
}

/**
 * Applies corruption/loss only through an authorized disposable state resource.
 * The port receives a validated resource ID, never an arbitrary filesystem path.
 */
export async function applyValidationStateFault(input: {
  readonly specification: ValidationFaultSpecification;
  readonly action: ValidationStateFaultAction;
  readonly authorization: ValidationSandboxAuthorization;
  readonly safetyEvidence?: ValidationStateSafetyEvidence;
  readonly port: ValidationDisposableStateMutationPort;
  readonly occurrences: ValidationFaultOccurrenceCounter;
}): Promise<ValidationStateFaultHookResult> {
  assertStateActionMatchesFault(input.specification, input.action);
  const validated = requireDisposableStateAuthorization(input.specification, input.authorization, input.safetyEvidence);
  const specification = input.specification;
  if (!input.occurrences.observe(specification, input.action)) {
    return Object.freeze({ fault: Object.freeze({ status: "not-triggered", specification }) });
  }

  const resourceId = validated.authorization.ownership.resourceId;
  switch (input.action) {
    case "corrupt-state": await input.port.corruptState(resourceId); break;
    case "remove-state": await input.port.removeState(resourceId); break;
    case "remove-cursor": await input.port.removeCursor(resourceId); break;
  }

  return Object.freeze({
    fault: Object.freeze({
      status: "triggered-non-mutation",
      specification,
      physicalEffect: Object.freeze({ status: "not-applicable" }),
    }),
    action: input.action,
    resourceId,
    safetyEvidence: validated.safetyEvidence,
  });
}

export const VALIDATION_CANCELLATION_POINTS = ["before-operation-dispatch", "post-dispatch-pre-response"] as const;
export type ValidationCancellationPoint = (typeof VALIDATION_CANCELLATION_POINTS)[number];

/** Structural surface intentionally satisfied by CoreRunCoordinator. */
export interface ValidationProductionCancellationAuthority {
  requestCancellation(): void;
  isCancellationRequested(): boolean;
  canStartNextOperation(): boolean;
}

export type ValidationCancellationFaultHookResult =
  | { readonly status: "not-triggered"; readonly specification: ValidationFaultSpecification }
  | {
      readonly status: "triggered-cancellation";
      readonly specification: Extract<ValidationFaultSpecification, { readonly kind: "cancellation-timing" }>;
      readonly point: ValidationCancellationPoint;
      readonly cancellationRequested: true;
      readonly currentOperationEffect:
        | { readonly status: "verified-not-applied"; readonly basis: "fault-before-dispatch" }
        | { readonly status: "outcome-unknown"; readonly reason: string };
    };

/**
 * Requests cancellation through the normal production run coordinator only.
 * It never aborts an in-flight atomic operation or manufactures its outcome.
 */
export function applyDeterministicCancellationFault(input: {
  readonly specification: ValidationFaultSpecification;
  readonly point: ValidationCancellationPoint;
  readonly authority: ValidationProductionCancellationAuthority;
  readonly occurrences: ValidationFaultOccurrenceCounter;
}): ValidationCancellationFaultHookResult {
  if (input.specification.kind !== "cancellation-timing") {
    throw new Error("The cancellation hook accepts only cancellation-timing faults.");
  }
  if (!input.occurrences.observe(input.specification, input.point)) {
    return Object.freeze({ status: "not-triggered", specification: input.specification });
  }

  input.authority.requestCancellation();
  if (!input.authority.isCancellationRequested() || input.authority.canStartNextOperation()) {
    throw new Error("Production cancellation authority did not establish the normal next-operation cancellation gate.");
  }

  const currentOperationEffect = input.point === "before-operation-dispatch"
    ? Object.freeze({ status: "verified-not-applied" as const, basis: "fault-before-dispatch" as const })
    : Object.freeze({
        status: "outcome-unknown" as const,
        reason: "Cancellation was requested after the atomic operation was dispatched; the current physical effect remains unknown until normal production verification/recovery observes it.",
      });

  return Object.freeze({
    status: "triggered-cancellation",
    specification: input.specification,
    point: input.point,
    cancellationRequested: true,
    currentOperationEffect,
  });
}
