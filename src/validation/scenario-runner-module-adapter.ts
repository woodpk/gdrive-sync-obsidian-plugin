import type { ValidationEvidenceRef } from "./driver-plan-fault-verifier-contracts";
import type {
  ValidationRunnerCompletionProof,
  ValidationRunnerDelegatedStepResult,
  ValidationRunnerModuleFacade,
  ValidationRunnerModuleId,
  ValidationRunnerPrerequisiteResult,
  ValidationRunnerStepDefinition,
} from "./scenario-runner-contracts";
import { VALIDATION_RUNNER_MODULE_IDS } from "./scenario-runner-contracts";
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

export const VALIDATION_RUNNER_MODULE_COMPLETION_PROOFS: Readonly<
  Record<ValidationRunnerModuleId, ValidationRunnerCompletionProof>
> =
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

const MODULE_ID_SET: ReadonlySet<string> = new Set(VALIDATION_RUNNER_MODULE_IDS);
const PREREQUISITE_STATUS_SET: ReadonlySet<string> = new Set(["satisfied", "failed", "blocked"]);

function validText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

function validEvidenceRefs(value: unknown): value is readonly ValidationEvidenceRef[] {
  return Array.isArray(value) && value.every(validText);
}

function blockedPrerequisites(
  prerequisiteIds: readonly string[],
  summary: string,
): readonly ValidationRunnerPrerequisiteResult[] {
  return Object.freeze(prerequisiteIds.map(prerequisiteId => Object.freeze({
    prerequisiteId,
    status: "blocked" as const,
    summary,
    evidenceRefs: Object.freeze([]),
  })));
}

function moduleStop(
  status: "failed" | "blocked",
  module: string,
  summary: string,
  evidenceRefs: readonly ValidationEvidenceRef[] = [],
): ValidationRunnerDelegatedStepResult {
  return {
    status,
    reason: {
      kind: status === "failed" ? "module-failed" : "module-blocked",
      summary: `${module}: ${summary}`,
      evidenceRefs,
    },
  };
}

function completionProofMissing(
  module: string,
  summary: string,
  evidenceRefs: readonly ValidationEvidenceRef[] = [],
): ValidationRunnerDelegatedStepResult {
  return {
    status: "blocked",
    reason: {
      kind: "completion-proof-missing",
      summary: `${module}: ${summary}`,
      evidenceRefs,
    },
  };
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

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
    if (input.prerequisiteIds.length === 0) return Object.freeze([]);
    if (
      input.prerequisiteIds.some(prerequisiteId => !validText(prerequisiteId))
      || new Set(input.prerequisiteIds).size !== input.prerequisiteIds.length
    ) {
      return blockedPrerequisites(input.prerequisiteIds, "Prerequisite identities are invalid or duplicated.");
    }

    let delegated: readonly ValidationRunnerPrerequisiteResult[] | null | undefined;
    try {
      delegated = await this.options.prerequisites.evaluate(input);
    } catch {
      return blockedPrerequisites(input.prerequisiteIds, "Prerequisite evaluation failed closed.");
    }
    if (!Array.isArray(delegated)) {
      return blockedPrerequisites(input.prerequisiteIds, "Prerequisite evaluation returned no result set.");
    }

    const expectedIds = new Set(input.prerequisiteIds);
    const byId = new Map<string, ValidationRunnerPrerequisiteResult>();
    for (const result of delegated) {
      if (
        !result
        || typeof result !== "object"
        || !validText(result.prerequisiteId)
        || !expectedIds.has(result.prerequisiteId)
        || byId.has(result.prerequisiteId)
        || !PREREQUISITE_STATUS_SET.has(String(result.status))
        || !validText(result.summary)
        || !validEvidenceRefs(result.evidenceRefs)
      ) {
        return blockedPrerequisites(input.prerequisiteIds, "Prerequisite evaluation returned an incomplete or ambiguous result set.");
      }
      byId.set(result.prerequisiteId, result);
    }
    if (byId.size !== input.prerequisiteIds.length) {
      return blockedPrerequisites(input.prerequisiteIds, "Prerequisite evaluation omitted a required result.");
    }

    return Object.freeze(input.prerequisiteIds.map(prerequisiteId => {
      const result = byId.get(prerequisiteId)!;
      return Object.freeze({
        prerequisiteId: result.prerequisiteId,
        status: result.status,
        summary: result.summary,
        evidenceRefs: Object.freeze([...result.evidenceRefs]),
      });
    }));
  }

  public async executeStep(input: {
    readonly run: ValidationRunIdentity;
    readonly step: ValidationRunnerStepDefinition;
  }): Promise<ValidationRunnerDelegatedStepResult> {
    if (!MODULE_ID_SET.has(String(input.step.module))) {
      return moduleStop("blocked", String(input.step.module), "The requested module is not an approved VH04-VH13 owner.");
    }
    if (!validText(input.step.operation)) {
      return {
        status: "blocked",
        reason: {
          kind: "invalid-definition",
          summary: `${input.step.module}: operation identity must be a non-empty, trim-stable string.`,
          evidenceRefs: [],
        },
      };
    }

    const proof = VALIDATION_RUNNER_MODULE_COMPLETION_PROOFS[input.step.module];
    if (proof !== input.step.requiredCompletionProof) {
      return completionProofMissing(
        input.step.module,
        `cannot establish ${input.step.requiredCompletionProof}; its owned proof is ${proof}.`,
      );
    }

    const delegate = this.options.modules[input.step.module];
    if (!delegate || typeof delegate.execute !== "function") {
      return moduleStop("blocked", input.step.module, "The approved module delegate is unavailable.");
    }
    let result: ValidationRunnerApprovedModuleResult | null | undefined;
    try {
      result = await delegate.execute({
        run: input.run,
        operation: input.step.operation,
        ...(input.step.input === undefined ? {} : { input: input.step.input }),
      });
    } catch {
      return moduleStop("failed", input.step.module, "The delegated module operation threw before producing a result.");
    }
    if (!result || typeof result !== "object" || !validEvidenceRefs(result.evidenceRefs)) {
      return moduleStop("blocked", input.step.module, "The delegated module returned no valid result.");
    }

    if (result.status === "completed") {
      if (proof !== "operation-complete" && result.evidenceRefs.length === 0) {
        return completionProofMissing(
          input.step.module,
          `${proof} requires at least one durable evidence reference.`,
        );
      }
      return { status: "completed", proof, evidenceRefs: result.evidenceRefs };
    }
    if (result.status === "failed" || result.status === "blocked") {
      if (!validText(result.summary)) {
        return moduleStop("blocked", input.step.module, "The delegated stop result omitted its summary.");
      }
      return moduleStop(result.status, input.step.module, result.summary, result.evidenceRefs);
    }
    if (result.status === "paused-human-action") {
      if (
        input.step.module !== "human-checkpoint-resume-controller"
        || !result.checkpoint
        || !sameRun(result.checkpoint.run, input.run)
      ) {
        return moduleStop("blocked", input.step.module, "Only VH13 may pause this exact run for human action.");
      }
      return {
        status: result.status,
        checkpoint: result.checkpoint,
        evidenceRefs: result.evidenceRefs,
      };
    }
    if (result.status === "resumable") {
      if (
        input.step.module !== "human-checkpoint-resume-controller"
        || !result.resume
        || !sameRun(result.resume.checkpoint.run, input.run)
      ) {
        return moduleStop("blocked", input.step.module, "Only VH13 may mark this exact run resumable.");
      }
      return {
        status: result.status,
        resume: result.resume,
        evidenceRefs: result.evidenceRefs,
      };
    }
    if (result.status === "physical-outcome-uncertain") {
      if (
        input.step.module !== "state-ambiguity-cancel-fault-hooks"
        || proof !== "operation-complete"
        || !validText(result.summary)
        || result.evidenceRefs.length === 0
      ) {
        return completionProofMissing(
          input.step.module,
          "physical uncertainty may only be preserved as evidenced VH11 operation completion.",
          result.evidenceRefs,
        );
      }
      return {
        status: "completed",
        proof: "operation-complete",
        evidenceRefs: result.evidenceRefs,
      };
    }

    return moduleStop("blocked", input.step.module, "The delegated module returned an unsupported status.");
  }
}

export function createValidationRunnerModuleAdapter(
  options: ValidationRunnerModuleAdapterOptions,
): ValidationRunnerModuleFacade {
  return new ValidationRunnerModuleAdapter(options);
}
