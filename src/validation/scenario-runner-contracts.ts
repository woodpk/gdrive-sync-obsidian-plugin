/**
 * Internal H6A contracts for Phase 6 validation-runner orchestration.
 *
 * This module defines lifecycle and composition seams only. It owns no
 * filesystem, Drive, production-sync, assertion, verification, evidence,
 * fault, coordination, or checkpoint behavior.
 */
import type { ValidationEvidenceRef } from "./driver-plan-fault-verifier-contracts";
import type {
  HumanCheckpointControllerResult,
  HumanCheckpointResumeCommitPort,
} from "./human-checkpoint-resume-controller";
import {
  VALIDATION_SCENARIO_IDS,
  type HumanCheckpoint,
  type HumanCheckpointId,
  type HumanCheckpointResume,
  type ValidationDeviceIdentity,
  type ValidationRunId,
  type ValidationRunIdentity,
  type ValidationScenarioId,
  type ValidationScenarioLifecycle,
  type ValidationStepId,
} from "./run-sandbox-checkpoint-contracts";

/** The runner enumerates the exact frozen H0 C03-F03 scenario set. */
export const VALIDATION_RUNNER_SCENARIO_IDS = VALIDATION_SCENARIO_IDS;

export const VALIDATION_RUNNER_STATE_SCHEMA_VERSION = 1 as const;

export const VALIDATION_RUNNER_MODULE_IDS = [
  "safety-sandbox",
  "fixture-manager",
  "production-path-driver",
  "plan-assertion-engine",
  "state-convergence-verifier",
  "scenario-evidence-recorder",
  "transport-coverage-faults",
  "state-ambiguity-cancel-fault-hooks",
  "cross-device-coordinator",
  "human-checkpoint-resume-controller",
] as const;
export type ValidationRunnerModuleId = (typeof VALIDATION_RUNNER_MODULE_IDS)[number];

export const VALIDATION_RUNNER_COMPLETION_PROOFS = [
  "operation-complete",
  "verification-passed",
  "evidence-recorded",
] as const;
export type ValidationRunnerCompletionProof = (typeof VALIDATION_RUNNER_COMPLETION_PROOFS)[number];

/** Declarative step identity. The named module remains the behavior owner. */
export interface ValidationRunnerStepDefinition {
  readonly stepId: ValidationStepId;
  readonly module: ValidationRunnerModuleId;
  readonly operation: string;
  readonly requiredCompletionProof: ValidationRunnerCompletionProof;
  readonly input?: unknown;
}

export interface ValidationRunnerScenarioDefinition {
  readonly scenarioId: ValidationScenarioId;
  readonly prerequisiteIds: readonly string[];
  readonly steps: readonly ValidationRunnerStepDefinition[];
}

export interface ValidationRunnerSuiteDefinition {
  readonly suiteId: string;
  /** Ordered scenario definitions; order is durable suite authority. */
  readonly scenarios: readonly ValidationRunnerScenarioDefinition[];
}

export interface ValidationRunnerCurrentStepIdentity {
  readonly scenarioId: ValidationScenarioId;
  readonly stepId: ValidationStepId;
  readonly stepIndex: number;
}

export type ValidationRunnerExecutionIdentity =
  | {
      readonly kind: "single";
      readonly scenarioId: ValidationScenarioId;
    }
  | {
      readonly kind: "suite";
      readonly suiteId: string;
      readonly scenarioIds: readonly ValidationScenarioId[];
      readonly currentScenarioIndex: number;
    };

export interface ValidationRunnerProofState {
  readonly verificationPassed: boolean;
  readonly evidenceRecorded: boolean;
}

/**
 * Complete durable runner authority needed to reconstruct one controller.
 * Human-checkpoint durability remains owned by VH13; this record adopts only
 * the exact resume step after VH13 requests durable adoption.
 */
export interface ValidationRunnerPersistentState {
  readonly schemaVersion: typeof VALIDATION_RUNNER_STATE_SCHEMA_VERSION;
  readonly revision: number;
  readonly run: ValidationRunIdentity;
  readonly execution: ValidationRunnerExecutionIdentity;
  readonly lifecycle: ValidationScenarioLifecycle;
  readonly currentStep: ValidationRunnerCurrentStepIdentity | null;
  readonly completedStepIds: readonly ValidationStepId[];
  readonly completedScenarioIds: readonly ValidationScenarioId[];
  readonly proofs: ValidationRunnerProofState;
}

export interface ValidationRunnerStateStore {
  load(): Promise<unknown>;
  compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean>;
}

/** Exact VH13 tuple that must be durably and idempotently adopted. */
export type ValidationRunnerResumeAdoptionInput = Parameters<
  HumanCheckpointResumeCommitPort["commitResume"]
>[0];

/**
 * Package C supplies this combined durable port. commitResume must complete
 * before VH13 is allowed to clean up its resumable checkpoint.
 */
export interface ValidationRunnerDurableStatePort
  extends ValidationRunnerStateStore, HumanCheckpointResumeCommitPort {}

export const VALIDATION_RUNNER_PREREQUISITE_STATUSES = [
  "satisfied",
  "failed",
  "blocked",
] as const;
export type ValidationRunnerPrerequisiteStatus =
  (typeof VALIDATION_RUNNER_PREREQUISITE_STATUSES)[number];

export interface ValidationRunnerPrerequisiteResult {
  readonly prerequisiteId: string;
  readonly status: ValidationRunnerPrerequisiteStatus;
  readonly summary: string;
  readonly evidenceRefs: readonly ValidationEvidenceRef[];
}

export const VALIDATION_RUNNER_STOP_REASON_KINDS = [
  "unsupported-scenario",
  "invalid-definition",
  "prerequisite-failed",
  "prerequisite-blocked",
  "module-failed",
  "module-blocked",
  "completion-proof-missing",
  "invalid-transition",
  "persisted-state-invalid",
  "state-changed",
  "resume-rejected",
  "resume-adoption-failed",
  "terminal-state",
] as const;
export type ValidationRunnerStopReasonKind =
  (typeof VALIDATION_RUNNER_STOP_REASON_KINDS)[number];

export interface ValidationRunnerStopReason {
  readonly kind: ValidationRunnerStopReasonKind;
  readonly summary: string;
  readonly evidenceRefs: readonly ValidationEvidenceRef[];
}

export type ValidationRunnerDelegatedStepResult =
  | {
      readonly status: "completed";
      readonly proof: ValidationRunnerCompletionProof;
      readonly evidenceRefs: readonly ValidationEvidenceRef[];
    }
  | {
      readonly status: "failed";
      readonly reason: ValidationRunnerStopReason;
    }
  | {
      readonly status: "blocked";
      readonly reason: ValidationRunnerStopReason;
    }
  | {
      readonly status: "paused-human-action";
      readonly checkpoint: HumanCheckpoint;
      readonly evidenceRefs: readonly ValidationEvidenceRef[];
    }
  | {
      readonly status: "resumable";
      readonly resume: Extract<HumanCheckpointResume, { readonly state: "resumable" }>;
      readonly evidenceRefs: readonly ValidationEvidenceRef[];
    };

/** The runner delegates prerequisite and step work; it never performs it. */
export interface ValidationRunnerModuleFacade {
  evaluatePrerequisites(input: {
    readonly run: ValidationRunIdentity;
    readonly prerequisiteIds: readonly string[];
  }): Promise<readonly ValidationRunnerPrerequisiteResult[]>;

  executeStep(input: {
    readonly run: ValidationRunIdentity;
    readonly step: ValidationRunnerStepDefinition;
  }): Promise<ValidationRunnerDelegatedStepResult>;
}

/** Narrow structural seam over VH13's approved consumeResume ordering. */
export interface ValidationRunnerHumanCheckpointResumePort {
  consumeResume(
    run: ValidationRunIdentity,
    checkpointId: string,
    currentDevice: ValidationDeviceIdentity,
    resumeCommit: HumanCheckpointResumeCommitPort,
  ): Promise<HumanCheckpointControllerResult>;
}

export interface ValidationRunnerStartScenarioRequest {
  readonly run: ValidationRunIdentity;
  readonly definition: ValidationRunnerScenarioDefinition;
}

export interface ValidationRunnerStartSuiteRequest {
  readonly runId: ValidationRunId;
  readonly suite: ValidationRunnerSuiteDefinition;
}

export interface ValidationRunnerAdvanceRequest {
  readonly run: ValidationRunIdentity;
  readonly expectedRevision: number;
}

export interface ValidationRunnerResumeRequest {
  readonly run: ValidationRunIdentity;
  readonly checkpointId: HumanCheckpointId;
  readonly currentDevice: ValidationDeviceIdentity;
  readonly expectedRevision: number;
}

export type ValidationRunnerResult =
  | {
      readonly status: "RUNNING";
      readonly state: ValidationRunnerPersistentState;
    }
  | {
      readonly status: "PASS";
      readonly state: ValidationRunnerPersistentState;
    }
  | {
      readonly status: "FAIL";
      readonly state: ValidationRunnerPersistentState;
      readonly reason: ValidationRunnerStopReason;
    }
  | {
      readonly status: "BLOCKED";
      readonly state: ValidationRunnerPersistentState;
      readonly reason: ValidationRunnerStopReason;
    }
  | {
      readonly status: "PAUSED-HUMAN-ACTION";
      readonly state: ValidationRunnerPersistentState;
      readonly checkpoint: HumanCheckpoint;
    }
  | {
      readonly status: "RESUMABLE";
      readonly state: ValidationRunnerPersistentState;
      readonly resume: Extract<HumanCheckpointResume, { readonly state: "resumable" }>;
    };

export interface ValidationScenarioRunner {
  enumerateScenarioIds(): typeof VALIDATION_RUNNER_SCENARIO_IDS;
  current(): Promise<ValidationRunnerPersistentState | null>;
  startScenario(request: ValidationRunnerStartScenarioRequest): Promise<ValidationRunnerResult>;
  startSuite(request: ValidationRunnerStartSuiteRequest): Promise<ValidationRunnerResult>;
  advance(request: ValidationRunnerAdvanceRequest): Promise<ValidationRunnerResult>;
  resume(request: ValidationRunnerResumeRequest): Promise<ValidationRunnerResult>;
}

export interface ValidationScenarioRunnerDependencies {
  readonly state: ValidationRunnerDurableStatePort;
  readonly modules: ValidationRunnerModuleFacade;
  readonly humanCheckpoints: ValidationRunnerHumanCheckpointResumePort;
}

/** Package I binds the real B/C/D implementations through this seam. */
export type ValidationScenarioRunnerFactory = (
  dependencies: ValidationScenarioRunnerDependencies,
) => ValidationScenarioRunner;
