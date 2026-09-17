import {
  VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
  type ValidationRunnerExecutionIdentity,
  type ValidationRunnerPersistentState,
  type ValidationRunnerStateStore,
} from "./scenario-runner-contracts";
import {
  humanCheckpoint,
  isHumanCheckpointAction,
  isValidationScenarioId,
  validationRunIdentity,
  validationScenarioId,
  validationStepId,
  type HumanCheckpoint,
  type HumanCheckpointResume,
  type ValidationRunIdentity,
  type ValidationScenarioLifecycle,
  type ValidationStepId,
} from "./run-sandbox-checkpoint-contracts";

export type ValidationRunnerPersistedStateFailure =
  | "persisted-state-invalid"
  | "persisted-state-mismatch";

/** A fail-closed durable-state error; callers must not treat it as an empty run. */
export class ValidationRunnerPersistedStateError extends Error {
  constructor(
    readonly reason: ValidationRunnerPersistedStateFailure,
    message: string,
  ) {
    super(message);
    this.name = "ValidationRunnerPersistedStateError";
  }
}

export interface ValidationRunnerReconstructionExpectation {
  readonly run?: ValidationRunIdentity;
  readonly execution?: ValidationRunnerExecutionIdentity;
}

function invalid(message: string): never {
  throw new ValidationRunnerPersistedStateError("persisted-state-invalid", message);
}

function mismatch(message: string): never {
  throw new ValidationRunnerPersistedStateError("persisted-state-mismatch", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

function nonBlankString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    invalid(`${label} must be a non-empty, trim-stable string.`);
  }
  return value;
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function hydrateRun(value: unknown): ValidationRunIdentity {
  if (!isRecord(value)) invalid("Persisted runner run identity is missing.");
  try {
    return validationRunIdentity(
      nonBlankString(value.runId, "Validation run ID"),
      nonBlankString(value.scenarioId, "Validation scenario ID"),
    );
  } catch (error) {
    invalid(error instanceof Error ? error.message : "Persisted runner run identity is invalid.");
  }
}

function hydrateStepId(value: unknown, label: string): ValidationStepId {
  try {
    return validationStepId(nonBlankString(value, label));
  } catch (error) {
    invalid(error instanceof Error ? error.message : `${label} is invalid.`);
  }
}

function hydrateCheckpoint(value: unknown): HumanCheckpoint {
  if (!isRecord(value)) invalid("Persisted human checkpoint is missing.");
  const requestedAction = nonBlankString(value.requestedAction, "Human checkpoint action");
  if (!isHumanCheckpointAction(requestedAction)) invalid("Persisted human checkpoint action is unsupported.");
  try {
    return humanCheckpoint({
      checkpointId: nonBlankString(value.checkpointId, "Human checkpoint ID"),
      run: hydrateRun(value.run),
      deviceId: nonBlankString(value.deviceId, "Validation device ID"),
      requestedAction,
      instruction: nonBlankString(value.instruction, "Human checkpoint instruction"),
    });
  } catch (error) {
    invalid(error instanceof Error ? error.message : "Persisted human checkpoint is invalid.");
  }
}

function hydrateResume(value: unknown): Extract<HumanCheckpointResume, { readonly state: "resumable" }> {
  if (!isRecord(value) || value.state !== "resumable") invalid("Persisted resume state is not resumable.");
  return Object.freeze({
    state: "resumable" as const,
    checkpoint: hydrateCheckpoint(value.checkpoint),
    acknowledgement: nonBlankString(value.acknowledgement, "Resume acknowledgement"),
    verification: nonBlankString(value.verification, "Resume verification"),
    resumeStepId: hydrateStepId(value.resumeStepId, "Resume step ID"),
  });
}

function hydrateLifecycle(value: unknown): ValidationScenarioLifecycle {
  if (!isRecord(value)) invalid("Persisted runner lifecycle is missing.");
  switch (value.kind) {
    case "pending":
      return Object.freeze({ kind: "pending" });
    case "running":
      return Object.freeze({ kind: "running", stepId: hydrateStepId(value.stepId, "Running step ID") });
    case "paused-human-action":
      return Object.freeze({ kind: "paused-human-action", checkpoint: hydrateCheckpoint(value.checkpoint) });
    case "resumable":
      return Object.freeze({ kind: "resumable", resume: hydrateResume(value.resume) });
    case "terminal": {
      if (value.verdict !== "pass" && value.verdict !== "fail" && value.verdict !== "blocked") {
        invalid("Persisted terminal verdict is unsupported.");
      }
      return Object.freeze({
        kind: "terminal",
        verdict: value.verdict,
        summary: nonBlankString(value.summary, "Terminal summary"),
      });
    }
    default:
      return invalid("Persisted runner lifecycle kind is unsupported.");
  }
}

function hydrateExecution(value: unknown, run: ValidationRunIdentity): ValidationRunnerExecutionIdentity {
  if (!isRecord(value)) invalid("Persisted runner execution identity is missing.");
  if (value.kind === "single") {
    const scenarioId = validationScenarioId(nonBlankString(value.scenarioId, "Single scenario ID"));
    if (scenarioId !== run.scenarioId) mismatch("Single execution scenario does not match the run scenario.");
    return Object.freeze({ kind: "single", scenarioId });
  }
  if (value.kind !== "suite") invalid("Persisted runner execution kind is unsupported.");
  const suiteId = nonBlankString(value.suiteId, "Suite ID");
  if (!Array.isArray(value.scenarioIds) || value.scenarioIds.length === 0) {
    invalid("Persisted suite must contain at least one scenario.");
  }
  const scenarioIds = value.scenarioIds.map((item, index) => {
    const scenarioId = nonBlankString(item, `Suite scenario ${index}`);
    if (!isValidationScenarioId(scenarioId)) invalid(`Suite scenario ${index} is unsupported.`);
    return scenarioId;
  });
  if (new Set(scenarioIds).size !== scenarioIds.length) invalid("Persisted suite contains duplicate scenarios.");
  if (!Number.isSafeInteger(value.currentScenarioIndex)) invalid("Persisted suite position is invalid.");
  const currentScenarioIndex = value.currentScenarioIndex as number;
  if (currentScenarioIndex < 0 || currentScenarioIndex >= scenarioIds.length) {
    invalid("Persisted suite position is outside the ordered scenario list.");
  }
  if (scenarioIds[currentScenarioIndex] !== run.scenarioId) {
    mismatch("Persisted suite position does not match the run scenario.");
  }
  return Object.freeze({
    kind: "suite",
    suiteId,
    scenarioIds: Object.freeze(scenarioIds),
    currentScenarioIndex,
  });
}

function hydrateStepList(value: unknown, label: string): readonly ValidationStepId[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array.`);
  const ids = value.map((item, index) => hydrateStepId(item, `${label} entry ${index}`));
  if (new Set(ids).size !== ids.length) invalid(`${label} contains duplicate step IDs.`);
  return Object.freeze(ids);
}

function hydrateScenarioList(value: unknown): readonly ReturnType<typeof validationScenarioId>[] {
  if (!Array.isArray(value)) invalid("Completed scenario IDs must be an array.");
  const ids = value.map((item, index) => {
    try {
      return validationScenarioId(nonBlankString(item, `Completed scenario ${index}`));
    } catch (error) {
      invalid(error instanceof Error ? error.message : `Completed scenario ${index} is invalid.`);
    }
  });
  if (new Set(ids).size !== ids.length) invalid("Completed scenario IDs contain duplicates.");
  return Object.freeze(ids);
}

function sameExecution(left: ValidationRunnerExecutionIdentity, right: ValidationRunnerExecutionIdentity): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "single" && right.kind === "single") return left.scenarioId === right.scenarioId;
  if (left.kind !== "suite" || right.kind !== "suite") return false;
  return left.suiteId === right.suiteId
    && left.currentScenarioIndex === right.currentScenarioIndex
    && left.scenarioIds.length === right.scenarioIds.length
    && left.scenarioIds.every((scenarioId, index) => scenarioId === right.scenarioIds[index]);
}

/**
 * Hydrate one persisted runner record without trusting its source. Invalid or
 * internally mismatched bytes throw rather than being interpreted as empty.
 */
export function reconstructValidationRunnerState(
  raw: unknown,
  expected: ValidationRunnerReconstructionExpectation = {},
): ValidationRunnerPersistentState | null {
  if (raw === null || raw === undefined) return null;
  if (!isRecord(raw)) invalid("Persisted runner state must be an object.");
  if (raw.schemaVersion !== VALIDATION_RUNNER_STATE_SCHEMA_VERSION) {
    invalid("Persisted runner state schema version is unsupported.");
  }
  if (!isSafeRevision(raw.revision)) invalid("Persisted runner revision is invalid.");

  const run = hydrateRun(raw.run);
  const execution = hydrateExecution(raw.execution, run);
  const lifecycle = hydrateLifecycle(raw.lifecycle);
  let currentStep: ValidationRunnerPersistentState["currentStep"] = null;
  if (raw.currentStep !== null) {
    if (!isRecord(raw.currentStep)) invalid("Persisted current-step identity is invalid.");
    const scenarioId = validationScenarioId(nonBlankString(raw.currentStep.scenarioId, "Current-step scenario ID"));
    const stepId = hydrateStepId(raw.currentStep.stepId, "Current step ID");
    if (!Number.isSafeInteger(raw.currentStep.stepIndex) || (raw.currentStep.stepIndex as number) < 0) {
      invalid("Persisted current-step index is invalid.");
    }
    if (scenarioId !== run.scenarioId) mismatch("Current-step scenario does not match the run scenario.");
    currentStep = Object.freeze({ scenarioId, stepId, stepIndex: raw.currentStep.stepIndex as number });
  }
  if ((lifecycle.kind === "running" || lifecycle.kind === "paused-human-action" || lifecycle.kind === "resumable") && currentStep === null) {
    mismatch(`Lifecycle ${lifecycle.kind} requires a current step.`);
  }
  if (lifecycle.kind === "running" && currentStep?.stepId !== lifecycle.stepId) {
    mismatch("Running lifecycle step does not match the current step.");
  }
  if (lifecycle.kind === "paused-human-action" && !sameRun(lifecycle.checkpoint.run, run)) {
    mismatch("Paused checkpoint run does not match the runner run.");
  }
  if (lifecycle.kind === "resumable" && !sameRun(lifecycle.resume.checkpoint.run, run)) {
    mismatch("Resumable checkpoint run does not match the runner run.");
  }
  if (!isRecord(raw.proofs)
    || typeof raw.proofs.verificationPassed !== "boolean"
    || typeof raw.proofs.evidenceRecorded !== "boolean") {
    invalid("Persisted runner proof state is invalid.");
  }

  const state: ValidationRunnerPersistentState = Object.freeze({
    schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
    revision: raw.revision,
    run,
    execution,
    lifecycle,
    currentStep,
    completedStepIds: hydrateStepList(raw.completedStepIds, "Completed step IDs"),
    completedScenarioIds: hydrateScenarioList(raw.completedScenarioIds),
    proofs: Object.freeze({
      verificationPassed: raw.proofs.verificationPassed,
      evidenceRecorded: raw.proofs.evidenceRecorded,
    }),
  });

  if (expected.run && !sameRun(state.run, expected.run)) mismatch("Persisted runner run does not match the requested run.");
  if (expected.execution && !sameExecution(state.execution, expected.execution)) {
    mismatch("Persisted runner execution identity does not match the requested execution.");
  }
  return state;
}

/**
 * Validating revision-CAS adapter. The backing store owns physical durability;
 * this class prevents malformed or identity-changing records reaching it.
 */
export class ValidationRunnerDurableStateController implements ValidationRunnerStateStore {
  constructor(private readonly store: ValidationRunnerStateStore) {}

  async load(): Promise<ValidationRunnerPersistentState | null> {
    return reconstructValidationRunnerState(await this.store.load());
  }

  async reconstruct(
    expected: ValidationRunnerReconstructionExpectation = {},
  ): Promise<ValidationRunnerPersistentState | null> {
    return reconstructValidationRunnerState(await this.store.load(), expected);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    if (expectedRevision !== null && !isSafeRevision(expectedRevision)) {
      invalid("Expected runner revision is invalid.");
    }
    const current = reconstructValidationRunnerState(await this.store.load());
    if ((current?.revision ?? null) !== expectedRevision) return false;
    const validatedNext = reconstructValidationRunnerState(next);
    if (validatedNext !== null) {
      const requiredRevision = expectedRevision === null ? 1 : expectedRevision + 1;
      if (validatedNext.revision !== requiredRevision) {
        invalid(`Next runner revision must be ${requiredRevision}.`);
      }
      if (current !== null && current.run.runId !== validatedNext.run.runId) {
        mismatch("A runner CAS update cannot replace the durable run identity.");
      }
      if (current !== null && current.execution.kind !== validatedNext.execution.kind) {
        mismatch("A runner CAS update cannot replace the execution kind.");
      }
      if (current?.execution.kind === "single" && validatedNext.execution.kind === "single"
        && current.execution.scenarioId !== validatedNext.execution.scenarioId) {
        mismatch("A single-scenario CAS update cannot replace the scenario identity.");
      }
      if (current?.execution.kind === "suite" && validatedNext.execution.kind === "suite") {
        const nextExecution = validatedNext.execution;
        const sameSuite = current.execution.suiteId === nextExecution.suiteId
          && current.execution.scenarioIds.length === nextExecution.scenarioIds.length
          && current.execution.scenarioIds.every(
            (scenarioId, index) => scenarioId === nextExecution.scenarioIds[index],
          );
        if (!sameSuite) mismatch("A suite CAS update cannot replace the ordered suite identity.");
      }
    }
    return this.store.compareAndSet(expectedRevision, validatedNext);
  }
}
