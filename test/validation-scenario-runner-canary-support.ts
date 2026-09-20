import type { ValidationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import type { HumanCheckpointControllerResult } from "../src/validation/human-checkpoint-resume-controller";
import {
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import {
  type ValidationRunnerDelegatedStepResult,
  type ValidationRunnerDurableStatePort,
  type ValidationRunnerModuleFacade,
  type ValidationRunnerPersistentState,
  type ValidationRunnerPrerequisiteResult,
  type ValidationRunnerResumeAdoptionInput,
  type ValidationRunnerStepDefinition,
  type ValidationRunnerHumanCheckpointResumePort,
} from "../src/validation/scenario-runner-contracts";

function copy<T>(value: T): T {
  return structuredClone(value);
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function sameAdoption(
  left: ValidationRunnerResumeAdoptionInput,
  right: ValidationRunnerResumeAdoptionInput,
): boolean {
  return sameRun(left.run, right.run)
    && left.checkpointId === right.checkpointId
    && left.resumeStepId === right.resumeStepId;
}

export function canaryEvidenceRef(value: string): ValidationEvidenceRef {
  return validationEvidenceRef(`vh14-e:${value}`);
}

export interface CanaryStateWrite {
  readonly expectedRevision: number | null;
  readonly next: ValidationRunnerPersistentState | null;
  readonly accepted: boolean;
}

/**
 * A deliberately small fake for A's durable orchestration seam. It stores only
 * runner state and resume-adoption tuples; it owns no synchronization behavior.
 */
export class CanaryMemoryDurableStatePort implements ValidationRunnerDurableStatePort {
  private value: ValidationRunnerPersistentState | null = null;
  readonly writes: CanaryStateWrite[] = [];
  readonly adoptions: ValidationRunnerResumeAdoptionInput[] = [];
  readonly events: string[] = [];

  async load(): Promise<unknown> {
    this.events.push("state:load");
    return this.value === null ? null : copy(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    const actualRevision = this.value?.revision ?? null;
    const accepted = actualRevision === expectedRevision;
    this.writes.push({
      expectedRevision,
      next: next === null ? null : copy(next),
      accepted,
    });
    this.events.push(`state:cas:${expectedRevision ?? "empty"}:${accepted ? "accepted" : "rejected"}`);
    if (accepted) this.value = next === null ? null : copy(next);
    return accepted;
  }

  /**
   * Models only the A/VH13 contract: exact tuple adoption is durable and
   * idempotent, and the resume step becomes current before cleanup may proceed.
   */
  async commitResume(input: ValidationRunnerResumeAdoptionInput): Promise<void> {
    this.events.push("state:adoption:start");
    const prior = this.adoptions.find(adoption => adoption.checkpointId === input.checkpointId);
    if (prior) {
      if (!sameAdoption(prior, input)) throw new Error("Conflicting resume adoption tuple.");
      this.events.push("state:adoption:idempotent");
      return;
    }

    const state = this.value;
    if (
      state === null
      || !sameRun(state.run, input.run)
      || state.lifecycle.kind !== "resumable"
      || state.lifecycle.resume.checkpoint.checkpointId !== input.checkpointId
      || state.lifecycle.resume.resumeStepId !== input.resumeStepId
      || state.currentStep === null
    ) {
      throw new Error("Resume adoption does not match durable runner state.");
    }

    this.adoptions.push(copy(input));
    this.value = copy({
      ...state,
      revision: state.revision + 1,
      lifecycle: { kind: "running", stepId: input.resumeStepId },
      currentStep: {
        scenarioId: state.run.scenarioId,
        stepId: input.resumeStepId,
        stepIndex: state.currentStep.stepIndex + 1,
      },
      completedStepIds: state.completedStepIds.includes(state.currentStep.stepId)
        ? state.completedStepIds
        : [...state.completedStepIds, state.currentStep.stepId],
    });
    this.events.push("state:adoption:durable");
  }

  /** Test-only malformed-state injection for fail-closed contract probes. */
  inject(raw: ValidationRunnerPersistentState | null): void {
    this.value = raw === null ? null : copy(raw);
  }
}

export interface CanaryModuleStepCall {
  readonly run: ValidationRunIdentity;
  readonly step: ValidationRunnerStepDefinition;
}

/** Scripted fake for the single module-facade seam frozen by Package A. */
export class CanaryScriptedModuleFacade implements ValidationRunnerModuleFacade {
  readonly prerequisiteCalls: Array<{
    readonly run: ValidationRunIdentity;
    readonly prerequisiteIds: readonly string[];
  }> = [];
  readonly stepCalls: CanaryModuleStepCall[] = [];

  private readonly prerequisites = new Map<string, ValidationRunnerPrerequisiteResult>();
  private readonly stepResults = new Map<string, ValidationRunnerDelegatedStepResult[]>();

  setPrerequisite(result: ValidationRunnerPrerequisiteResult): this {
    this.prerequisites.set(result.prerequisiteId, copy(result));
    return this;
  }

  queueStep(operation: string, result: ValidationRunnerDelegatedStepResult): this {
    const queue = this.stepResults.get(operation) ?? [];
    queue.push(copy(result));
    this.stepResults.set(operation, queue);
    return this;
  }

  async evaluatePrerequisites(input: {
    readonly run: ValidationRunIdentity;
    readonly prerequisiteIds: readonly string[];
  }): Promise<readonly ValidationRunnerPrerequisiteResult[]> {
    this.prerequisiteCalls.push(copy(input));
    return input.prerequisiteIds.map(prerequisiteId => {
      const result = this.prerequisites.get(prerequisiteId);
      if (!result) throw new Error(`No canary prerequisite result scripted for ${prerequisiteId}.`);
      return copy(result);
    });
  }

  async executeStep(input: CanaryModuleStepCall): Promise<ValidationRunnerDelegatedStepResult> {
    this.stepCalls.push(copy(input));
    const queue = this.stepResults.get(input.step.operation);
    const result = queue?.shift();
    if (!result) throw new Error(`No canary module result scripted for ${input.step.operation}.`);
    return copy(result);
  }
}

export interface CanaryHumanCheckpointCall {
  readonly run: ValidationRunIdentity;
  readonly checkpointId: string;
  readonly currentDevice: ValidationDeviceIdentity;
  readonly resumeCommit: ValidationRunnerDurableStatePort;
}

export type CanaryHumanCheckpointHandler = (
  input: CanaryHumanCheckpointCall,
) => Promise<HumanCheckpointControllerResult>;

/** Scripted fake for A's narrow VH13 consumeResume seam. */
export class CanaryScriptedHumanCheckpointPort
implements ValidationRunnerHumanCheckpointResumePort {
  readonly calls: CanaryHumanCheckpointCall[] = [];

  constructor(private readonly handler: CanaryHumanCheckpointHandler = async () => ({ status: "empty" })) {}

  async consumeResume(
    run: ValidationRunIdentity,
    checkpointId: string,
    currentDevice: ValidationDeviceIdentity,
    resumeCommit: ValidationRunnerDurableStatePort,
  ): Promise<HumanCheckpointControllerResult> {
    const input = { run, checkpointId, currentDevice, resumeCommit };
    this.calls.push(input);
    return this.handler(input);
  }
}
