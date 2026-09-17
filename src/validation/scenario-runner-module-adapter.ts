import type { ValidationEvidenceRef } from "./driver-plan-fault-verifier-contracts";
import type {
  ValidationRunnerCompletionProof,
  ValidationRunnerDelegatedStepResult,
  ValidationRunnerModuleFacade,
  ValidationRunnerModuleId,
  ValidationRunnerPrerequisiteResult,
  ValidationRunnerStepDefinition,
} from "./scenario-runner-contracts";
import type {
  HumanCheckpoint,
  HumanCheckpointResume,
  ValidationRunIdentity,
} from "./run-sandbox-checkpoint-contracts";

export interface ValidationRunnerModuleOperationRequest {
  readonly run: ValidationRunIdentity;
  readonly operation: string;
  readonly input?: unknown;
}

export type ValidationRunnerApprovedModuleResult =
  | {
      readonly status: "completed";
      readonly evidenceRefs: readonly ValidationEvidenceRef[];
    }
  | {
      readonly status: "physical-outcome-uncertain";
      readonly summary: string;
      readonly evidenceRefs: readonly ValidationEvidenceRef[];
    }
  | {
      readonly status: "failed" | "blocked";
      readonly summary: string;
      readonly evidenceRefs: readonly ValidationEvidenceRef[];
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

export interface ValidationRunnerApprovedModuleDelegate {
  execute(
    request: ValidationRunnerModuleOperationRequest,
  ): Promise<ValidationRunnerApprovedModuleResult | null | undefined>;
}

export type ValidationRunnerApprovedModuleDelegates = Readonly<
  Record<ValidationRunnerModuleId, ValidationRunnerApprovedModuleDelegate>
>;

export interface ValidationRunnerPrerequisiteDelegate {
  evaluate(input: {
    readonly run: ValidationRunIdentity;
    readonly prerequisiteIds: readonly string[];
  }): Promise<readonly ValidationRunnerPrerequisiteResult[] | null | undefined>;
}

export interface ValidationRunnerModuleAdapterOptions {
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly modules: ValidationRunnerApprovedModuleDelegates;
}

const MODULE_COMPLETION_PROOF: Readonly<Record<ValidationRunnerModuleId, ValidationRunnerCompletionProof>> =
  Object.freeze({
    "safety-sandbox": "operation-complete",
    "fixture-manager": "operation-complete",
    "production-path-driver": "operation-complete",
    "plan-assertion-engine": "operation-complete",
    "state-convergence-verifier": "verification-passed",
    "scenario-evidence-recorder": "evidence-recorded",
    "transport-coverage-faults": "operation-complete",
    "state-ambiguity-cancel-fault-hooks": "operation-complete",
    "cross-device-coordinator": "operation-complete",
    "human-checkpoint-resume-controller": "operation-complete",
  });

/**
 * Orchestration-only facade over the approved VH04-VH13 module owners.
 *
 * The facade routes requests and normalizes outcomes; it does not implement
 * module behavior, runner lifecycle transitions, or durable runner state.
 */
export class ValidationRunnerModuleAdapter implements ValidationRunnerModuleFacade {
  public constructor(private readonly options: ValidationRunnerModuleAdapterOptions) {}

  public async evaluatePrerequisites(input: {
    readonly run: ValidationRunIdentity;
    readonly prerequisiteIds: readonly string[];
  }): Promise<readonly ValidationRunnerPrerequisiteResult[]> {
    return await this.options.prerequisites.evaluate(input) ?? [];
  }

  public async executeStep(input: {
    readonly run: ValidationRunIdentity;
    readonly step: ValidationRunnerStepDefinition;
  }): Promise<ValidationRunnerDelegatedStepResult> {
    const proof = MODULE_COMPLETION_PROOF[input.step.module];
    if (proof !== input.step.requiredCompletionProof) {
      return {
        status: "blocked",
        reason: {
          kind: "completion-proof-missing",
          summary: `${input.step.module} cannot establish ${input.step.requiredCompletionProof}.`,
          evidenceRefs: [],
        },
      };
    }

    const delegate = this.options.modules[input.step.module];
    const result = await delegate.execute({
      run: input.run,
      operation: input.step.operation,
      ...(input.step.input === undefined ? {} : { input: input.step.input }),
    });
    if (!result) {
      return {
        status: "blocked",
        reason: {
          kind: "module-blocked",
          summary: `${input.step.module} returned no delegated result.`,
          evidenceRefs: [],
        },
      };
    }
    if (result.status === "completed") {
      return { status: "completed", proof, evidenceRefs: result.evidenceRefs };
    }
    if (result.status === "failed" || result.status === "blocked") {
      return {
        status: result.status,
        reason: {
          kind: result.status === "failed" ? "module-failed" : "module-blocked",
          summary: result.summary,
          evidenceRefs: result.evidenceRefs,
        },
      };
    }
    if (result.status === "paused-human-action") {
      return {
        status: result.status,
        checkpoint: result.checkpoint,
        evidenceRefs: result.evidenceRefs,
      };
    }
    if (result.status === "resumable") {
      return {
        status: result.status,
        resume: result.resume,
        evidenceRefs: result.evidenceRefs,
      };
    }

    return {
      status: "completed",
      proof: "operation-complete",
      evidenceRefs: result.evidenceRefs,
    };
  }
}

export function createValidationRunnerModuleAdapter(
  options: ValidationRunnerModuleAdapterOptions,
): ValidationRunnerModuleFacade {
  return new ValidationRunnerModuleAdapter(options);
}
