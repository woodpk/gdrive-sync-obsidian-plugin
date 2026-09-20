/**
 * Frozen H0C contracts for Phase 6 cross-device coordination and evidence.
 *
 * Validation-only vocabulary: no synchronization authority, credentials, private
 * vault payloads, Node APIs, Electron APIs, or transport implementation.
 */
import type {
  ValidationDeviceId,
  ValidationRunIdentity,
  ValidationScenarioVerdict,
  ValidationStepId,
} from "./run-sandbox-checkpoint-contracts";
import type { ValidationEvidenceRef } from "./driver-plan-fault-verifier-contracts";

export const PHASE6_LIVE_VALIDATION_HARNESS_VERSION = "phase6-live-validation-harness-v1" as const;
export type Phase6LiveValidationHarnessVersion = typeof PHASE6_LIVE_VALIDATION_HARNESS_VERSION;
export const PHASE6_LIVE_VALIDATION_H0_CONTRACTS_FROZEN = true as const;

export const VALIDATION_COORDINATION_SCHEMA_VERSION = 1 as const;
export const VALIDATION_EVIDENCE_SCHEMA_VERSION = 1 as const;

type H0CBrand<Name extends string> = string & { readonly __validationH0CBrand: Name };
export type ValidationCoordinationMessageId = H0CBrand<"ValidationCoordinationMessageId">;
export type ValidationEvidenceId = H0CBrand<"ValidationEvidenceId">;

function h0cId<Name extends string>(value: string, label: string): H0CBrand<Name> {
  if (value.length === 0 || value.trim() !== value) throw new Error(`${label} must be a non-empty, trim-stable string.`);
  return value as H0CBrand<Name>;
}
export const validationCoordinationMessageId = (value: string): ValidationCoordinationMessageId =>
  h0cId<"ValidationCoordinationMessageId">(value, "Validation coordination message ID");
export const validationEvidenceId = (value: string): ValidationEvidenceId =>
  h0cId<"ValidationEvidenceId">(value, "Validation evidence ID");

export const VALIDATION_COORDINATION_ROLES = ["controller", "mobile-participant"] as const;
export type ValidationCoordinationRole = (typeof VALIDATION_COORDINATION_ROLES)[number];

export const VALIDATION_COORDINATION_MESSAGE_KINDS = [
  "step-ready",
  "step-complete",
  "human-checkpoint-required",
  "human-checkpoint-acknowledged",
  "pause",
  "resume",
  "terminal",
] as const;
export type ValidationCoordinationMessageKind = (typeof VALIDATION_COORDINATION_MESSAGE_KINDS)[number];
type ValidationNonTerminalCoordinationMessageKind = Exclude<ValidationCoordinationMessageKind, "terminal">;

export const VALIDATION_COORDINATION_TERMINAL_CLASSIFICATIONS = ["pass", "fail", "blocked"] as const;
export type ValidationCoordinationTerminalClassification = (typeof VALIDATION_COORDINATION_TERMINAL_CLASSIFICATIONS)[number];

type ValidationCoordinationMessageBase = {
  readonly schemaVersion: typeof VALIDATION_COORDINATION_SCHEMA_VERSION;
  readonly harnessVersion: Phase6LiveValidationHarnessVersion;
  readonly messageId: ValidationCoordinationMessageId;
  readonly sequence: number;
  readonly run: ValidationRunIdentity;
  readonly senderDeviceId: ValidationDeviceId;
  readonly senderRole: ValidationCoordinationRole;
  readonly recipientDeviceId: ValidationDeviceId;
  readonly stepId: ValidationStepId;
  readonly createdAt: string;
  /** Safe metadata/evidence references only; never private content or secrets. */
  readonly evidenceRefs: readonly ValidationEvidenceRef[];
};

type ValidationNonTerminalCoordinationMessage = {
  readonly [K in ValidationNonTerminalCoordinationMessageKind]: ValidationCoordinationMessageBase & {
    readonly kind: K;
    readonly terminalClassification?: never;
  };
}[ValidationNonTerminalCoordinationMessageKind];

export type ValidationCoordinationMessage =
  | ValidationNonTerminalCoordinationMessage
  | (ValidationCoordinationMessageBase & {
      readonly kind: "terminal";
      readonly terminalClassification: ValidationCoordinationTerminalClassification;
    });

type ValidationCoordinationStateBase = {
  readonly schemaVersion: typeof VALIDATION_COORDINATION_SCHEMA_VERSION;
  readonly harnessVersion: Phase6LiveValidationHarnessVersion;
  readonly run: ValidationRunIdentity;
  readonly controllerDeviceId: ValidationDeviceId;
  readonly mobileParticipantDeviceId: ValidationDeviceId;
  readonly currentStepId: ValidationStepId;
  readonly owningRole: ValidationCoordinationRole;
  readonly expectedNextEvent: ValidationCoordinationMessageKind;
  readonly lastAcceptedSequenceByDevice: Readonly<Record<string, number>>;
  readonly evidenceRefs: readonly ValidationEvidenceRef[];
};

export type ValidationCoordinationState =
  | (ValidationCoordinationStateBase & {
      readonly status: "active" | "paused";
      readonly terminalClassification?: never;
    })
  | (ValidationCoordinationStateBase & {
      readonly status: "terminal";
      readonly terminalClassification: ValidationCoordinationTerminalClassification;
    });

export const VALIDATION_COORDINATION_REJECTION_REASONS = [
  "schema-version-mismatch",
  "harness-version-mismatch",
  "run-mismatch",
  "scenario-mismatch",
  "sender-not-participant",
  "sender-role-mismatch",
  "recipient-not-participant",
  "recipient-mismatch",
  "stale-sequence",
  "step-mismatch",
  "step-owner-mismatch",
  "unexpected-event",
  "terminal-state",
] as const;
export type ValidationCoordinationRejectionReason = (typeof VALIDATION_COORDINATION_REJECTION_REASONS)[number];

export type ValidationCoordinationAcceptance =
  | { readonly status: "accepted"; readonly message: ValidationCoordinationMessage }
  | { readonly status: "rejected"; readonly message: ValidationCoordinationMessage; readonly reason: ValidationCoordinationRejectionReason };

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId;
}

export function evaluateValidationCoordinationMessage(
  state: ValidationCoordinationState,
  localDeviceId: ValidationDeviceId,
  message: ValidationCoordinationMessage,
): ValidationCoordinationAcceptance {
  if (message.schemaVersion !== VALIDATION_COORDINATION_SCHEMA_VERSION) return { status: "rejected", message, reason: "schema-version-mismatch" };
  if (message.harnessVersion !== PHASE6_LIVE_VALIDATION_HARNESS_VERSION) return { status: "rejected", message, reason: "harness-version-mismatch" };
  if (!sameRun(state.run, message.run)) return { status: "rejected", message, reason: "run-mismatch" };
  if (state.run.scenarioId !== message.run.scenarioId) return { status: "rejected", message, reason: "scenario-mismatch" };

  const senderIsController = message.senderDeviceId === state.controllerDeviceId;
  const senderIsMobileParticipant = message.senderDeviceId === state.mobileParticipantDeviceId;
  if (!senderIsController && !senderIsMobileParticipant) return { status: "rejected", message, reason: "sender-not-participant" };

  const expectedSenderRole: ValidationCoordinationRole = senderIsController ? "controller" : "mobile-participant";
  if (message.senderRole !== expectedSenderRole) return { status: "rejected", message, reason: "sender-role-mismatch" };

  const recipientIsParticipant =
    message.recipientDeviceId === state.controllerDeviceId ||
    message.recipientDeviceId === state.mobileParticipantDeviceId;
  if (!recipientIsParticipant) return { status: "rejected", message, reason: "recipient-not-participant" };
  if (message.recipientDeviceId !== localDeviceId) return { status: "rejected", message, reason: "recipient-mismatch" };

  const lastAcceptedSequence = state.lastAcceptedSequenceByDevice[message.senderDeviceId] ?? 0;
  if (!Number.isSafeInteger(message.sequence) || message.sequence <= lastAcceptedSequence) return { status: "rejected", message, reason: "stale-sequence" };
  if (message.stepId !== state.currentStepId) return { status: "rejected", message, reason: "step-mismatch" };
  if (state.status === "terminal") return { status: "rejected", message, reason: "terminal-state" };
  if (message.senderRole !== state.owningRole) return { status: "rejected", message, reason: "step-owner-mismatch" };
  if (message.kind !== state.expectedNextEvent) return { status: "rejected", message, reason: "unexpected-event" };
  return { status: "accepted", message };
}

export const VALIDATION_EVIDENCE_KINDS = [
  "identity",
  "checkpoint",
  "plan",
  "assertion",
  "fault",
  "coordination",
  "state",
  "content-hash",
  "convergence",
  "human-checkpoint",
  "terminal",
] as const;
export type ValidationEvidenceKind = (typeof VALIDATION_EVIDENCE_KINDS)[number];

export interface ValidationEvidencePrivacy {
  readonly contentPolicy: "metadata-and-digests-only";
  readonly credentialsIncluded: false;
  readonly privateContentIncluded: false;
}

export interface ValidationEvidenceRecord {
  readonly schemaVersion: typeof VALIDATION_EVIDENCE_SCHEMA_VERSION;
  readonly harnessVersion: Phase6LiveValidationHarnessVersion;
  readonly evidenceId: ValidationEvidenceId;
  readonly run: ValidationRunIdentity;
  readonly deviceId: ValidationDeviceId;
  readonly stepId?: ValidationStepId;
  readonly kind: ValidationEvidenceKind;
  readonly capturedAt: string;
  readonly summary: string;
  readonly integrityDigest: string;
  readonly references: readonly ValidationEvidenceRef[];
  readonly privacy: ValidationEvidencePrivacy;
}

export const VALIDATION_EVIDENCE_PRIVACY: ValidationEvidencePrivacy = Object.freeze({
  contentPolicy: "metadata-and-digests-only",
  credentialsIncluded: false,
  privateContentIncluded: false,
});

type NonEmptyReadonlyStringArray = readonly [string, ...string[]];

export type ValidationScenarioEvidenceVerdict =
  | {
      readonly status: "PASS";
      readonly run: ValidationRunIdentity;
      readonly evidenceIds: readonly ValidationEvidenceId[];
      readonly failedAssertionIds: readonly [];
      readonly blockerReasons: readonly [];
      readonly summary: string;
    }
  | {
      readonly status: "FAIL";
      readonly run: ValidationRunIdentity;
      readonly evidenceIds: readonly ValidationEvidenceId[];
      readonly failedAssertionIds: NonEmptyReadonlyStringArray;
      readonly blockerReasons: readonly [];
      readonly summary: string;
    }
  | {
      readonly status: "BLOCKED";
      readonly run: ValidationRunIdentity;
      readonly evidenceIds: readonly ValidationEvidenceId[];
      readonly failedAssertionIds: readonly [];
      readonly blockerReasons: NonEmptyReadonlyStringArray;
      readonly summary: string;
    }
  | {
      readonly status: "PAUSED";
      readonly run: ValidationRunIdentity;
      readonly evidenceIds: readonly ValidationEvidenceId[];
      readonly failedAssertionIds: readonly [];
      readonly blockerReasons: readonly [];
      readonly resumeStepId: ValidationStepId;
      readonly summary: string;
    };

export function scenarioEvidenceVerdict<T extends ValidationScenarioEvidenceVerdict>(input: T): T {
  if (input.summary.trim().length === 0) throw new Error("Validation verdict summary must not be blank.");
  if (input.status === "FAIL" && input.failedAssertionIds.length === 0) throw new Error("FAIL requires at least one failed assertion ID.");
  if (input.status === "BLOCKED" && input.blockerReasons.length === 0) throw new Error("BLOCKED requires at least one blocker reason.");
  return Object.freeze(input) as T;
}

export function toScenarioLifecycleVerdict(
  verdict: Exclude<ValidationScenarioEvidenceVerdict, { readonly status: "PAUSED" }>,
): ValidationScenarioVerdict {
  switch (verdict.status) {
    case "PASS": return "pass";
    case "FAIL": return "fail";
    case "BLOCKED": return "blocked";
  }
}
