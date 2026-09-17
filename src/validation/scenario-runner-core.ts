import {
  VALIDATION_RUNNER_SCENARIO_IDS,
  VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
  type ValidationRunnerAdvanceRequest,
  type ValidationRunnerExecutionIdentity,
  type ValidationRunnerPersistentState,
  type ValidationRunnerPrerequisiteResult,
  type ValidationRunnerResult,
  type ValidationRunnerResumeRequest,
  type ValidationRunnerScenarioDefinition,
  type ValidationRunnerStartScenarioRequest,
  type ValidationRunnerStartSuiteRequest,
  type ValidationRunnerStopReason,
  type ValidationScenarioRunner,
  type ValidationScenarioRunnerDependencies,
} from "./scenario-runner-contracts";
import {
  validationRunIdentity,
  type ValidationRunIdentity,
} from "./run-sandbox-checkpoint-contracts";

const SUPPORTED_SCENARIOS: ReadonlySet<string> = new Set(VALIDATION_RUNNER_SCENARIO_IDS);

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function reason(
  kind: ValidationRunnerStopReason["kind"],
  summary: string,
  evidenceRefs: ValidationRunnerStopReason["evidenceRefs"] = [],
): ValidationRunnerStopReason {
  return { kind, summary, evidenceRefs };
}

function definitionProblem(definition: ValidationRunnerScenarioDefinition): string | null {
  if (!SUPPORTED_SCENARIOS.has(definition.scenarioId)) {
    return `Unsupported scenario definition ${definition.scenarioId}.`;
  }
  if (definition.steps.length === 0) return `Scenario ${definition.scenarioId} has no steps.`;
  const stepIds = definition.steps.map(step => String(step.stepId));
  if (new Set(stepIds).size !== stepIds.length) {
    return `Scenario ${definition.scenarioId} contains duplicate step IDs.`;
  }
  if (definition.steps.some(step => step.operation.trim().length === 0)) {
    return `Scenario ${definition.scenarioId} contains a blank operation.`;
  }
  const prerequisiteIds = definition.prerequisiteIds.map(String);
  if (prerequisiteIds.some(id => id.length === 0 || id.trim() !== id)) {
    return `Scenario ${definition.scenarioId} contains an invalid prerequisite ID.`;
  }
  if (new Set(prerequisiteIds).size !== prerequisiteIds.length) {
    return `Scenario ${definition.scenarioId} contains duplicate prerequisite IDs.`;
  }
  return null;
}

/**
 * Deterministic H6A lifecycle core. It owns orchestration state transitions
 * only; approved modules and durable storage remain injected authorities.
 */
export class ValidationScenarioRunnerCore implements ValidationScenarioRunner {
  private readonly definitions = new Map<string, ValidationRunnerScenarioDefinition>();

  constructor(
    private readonly dependencies: ValidationScenarioRunnerDependencies,
    options: ValidationScenarioRunnerCoreOptions = {},
  ) {
    for (const definition of options.definitions ?? []) this.registerDefinition(definition);
  }

  enumerateScenarioIds(): typeof VALIDATION_RUNNER_SCENARIO_IDS {
    return VALIDATION_RUNNER_SCENARIO_IDS;
  }

  async current(): Promise<ValidationRunnerPersistentState | null> {
    return await this.dependencies.state.load() as ValidationRunnerPersistentState | null;
  }

  async startScenario(request: ValidationRunnerStartScenarioRequest): Promise<ValidationRunnerResult> {
    const existing = await this.current();
    if (existing !== null) return this.existingRunResult(existing);

    const problem = definitionProblem(request.definition);
    const execution: ValidationRunnerExecutionIdentity = {
      kind: "single",
      scenarioId: request.definition.scenarioId,
    };
    if (request.run.scenarioId !== request.definition.scenarioId) {
      return await this.persistInvalidStart(request.run, execution, request.definition,
        "Run and scenario-definition identities do not match.");
    }
    if (problem !== null) {
      return await this.persistInvalidStart(request.run, execution, request.definition, problem);
    }

    this.registerDefinition(request.definition);
    return await this.beginScenario(request.run, request.definition, execution);
  }

  async startSuite(request: ValidationRunnerStartSuiteRequest): Promise<ValidationRunnerResult> {
    const existing = await this.current();
    if (existing !== null) return this.existingRunResult(existing);

    const first = request.suite.scenarios[0];
    if (!first) throw new Error("Validation runner suites must contain at least one scenario.");
    const scenarioIds = request.suite.scenarios.map(definition => definition.scenarioId);
    const problem = request.suite.suiteId.trim().length === 0
      ? "Suite ID must not be blank."
      : new Set(scenarioIds).size !== scenarioIds.length
        ? "Suite scenario IDs must be unique."
        : request.suite.scenarios.map(definitionProblem).find(value => value !== null) ?? null;
    const execution: ValidationRunnerExecutionIdentity = {
      kind: "suite",
      suiteId: request.suite.suiteId,
      scenarioIds,
      currentScenarioIndex: 0,
    };
    const run = validationRunIdentity(String(request.runId), first.scenarioId);
    if (problem !== null) return await this.persistInvalidStart(run, execution, first, problem);

    for (const definition of request.suite.scenarios) this.registerDefinition(definition);
    return await this.beginScenario(run, first, execution);
  }

  async advance(request: ValidationRunnerAdvanceRequest): Promise<ValidationRunnerResult> {
    const state = await this.requireState();
    const identityProblem = this.requestProblem(state, request.run, request.expectedRevision);
    if (identityProblem !== null) return this.blocked(state, identityProblem.kind, identityProblem.summary);
    if (state.lifecycle.kind === "pending") {
      const definition = this.currentDefinition(state);
      const firstStep = definition?.steps[0];
      if (
        definition === undefined ||
        firstStep === undefined ||
        state.currentStep?.scenarioId !== definition.scenarioId ||
        state.currentStep.stepId !== firstStep.stepId ||
        state.currentStep.stepIndex !== 0
      ) {
        return await this.stop(state, "BLOCKED", reason(
          "invalid-definition",
          "The durable pending cursor does not match the immutable scenario definition.",
        ));
      }
      return await this.enterRunningAfterPrerequisites(state, definition);
    }
    if (state.lifecycle.kind === "terminal") {
      return this.blocked(state, "terminal-state", "A terminal validation run cannot advance.");
    }
    if (
      (state.lifecycle.kind !== "running" && state.lifecycle.kind !== "paused-human-action") ||
      state.currentStep === null
    ) {
      return this.blocked(state, "invalid-transition", `Cannot advance lifecycle ${state.lifecycle.kind}.`);
    }

    const definition = this.currentDefinition(state);
    const step = definition?.steps[state.currentStep.stepIndex];
    if (
      definition === undefined ||
      step === undefined ||
      definition.scenarioId !== state.run.scenarioId ||
      step.stepId !== state.currentStep.stepId ||
      (state.lifecycle.kind === "running" && state.lifecycle.stepId !== state.currentStep.stepId)
    ) {
      return await this.stop(state, "BLOCKED", reason(
        "invalid-definition",
        "The durable current-step identity does not match the supplied scenario definition.",
      ));
    }

    let delegated;
    try {
      delegated = await this.dependencies.modules.executeStep({ run: state.run, step });
    } catch {
      return await this.stop(state, "FAIL", reason(
        "module-failed",
        `Delegated module execution threw for step ${step.stepId}.`,
      ));
    }

    if (delegated.status === "failed") return await this.stop(state, "FAIL", delegated.reason);
    if (delegated.status === "blocked") return await this.stop(state, "BLOCKED", delegated.reason);
    if (delegated.status === "paused-human-action") {
      if (!sameRun(delegated.checkpoint.run, state.run)) {
        return await this.stop(state, "BLOCKED", reason(
          "module-blocked",
          "Delegated human checkpoint did not match the active run identity.",
          delegated.evidenceRefs,
        ));
      }
      const next = {
        ...state,
        revision: state.revision + 1,
        lifecycle: { kind: "paused-human-action", checkpoint: delegated.checkpoint } as const,
      };
      return await this.persist(state, next, { status: "PAUSED-HUMAN-ACTION", state: next, checkpoint: delegated.checkpoint });
    }
    if (delegated.status === "resumable") {
      if (!sameRun(delegated.resume.checkpoint.run, state.run)) {
        return await this.stop(state, "BLOCKED", reason(
          "module-blocked",
          "Delegated resumable checkpoint did not match the active run identity.",
          delegated.evidenceRefs,
        ));
      }
      const resumeStepIndex = definition.steps.findIndex(
        candidate => candidate.stepId === delegated.resume.resumeStepId,
      );
      if (resumeStepIndex < 0) {
        return await this.stop(state, "BLOCKED", reason(
          "invalid-definition",
          `Delegated resume step ${delegated.resume.resumeStepId} is not in scenario ${definition.scenarioId}.`,
          delegated.evidenceRefs,
        ));
      }
      const next = {
        ...state,
        revision: state.revision + 1,
        lifecycle: { kind: "resumable", resume: delegated.resume } as const,
        currentStep: {
          scenarioId: definition.scenarioId,
          stepId: delegated.resume.resumeStepId,
          stepIndex: resumeStepIndex,
        },
      };
      return await this.persist(state, next, { status: "RESUMABLE", state: next, resume: delegated.resume });
    }

    if (state.lifecycle.kind === "paused-human-action" && delegated.status === "completed") {
      return this.blocked(state, "invalid-transition",
        "A paused human checkpoint must become RESUMABLE and be durably adopted before step completion.");
    }

    if (delegated.proof !== step.requiredCompletionProof) {
      return await this.stop(state, "BLOCKED", reason(
        "completion-proof-missing",
        `Step ${step.stepId} required ${step.requiredCompletionProof}, but the delegate returned ${delegated.proof}.`,
        delegated.evidenceRefs,
      ));
    }

    const completedStepIds = [...state.completedStepIds, step.stepId];
    const proofs = {
      verificationPassed: state.proofs.verificationPassed || delegated.proof === "verification-passed",
      evidenceRecorded: state.proofs.evidenceRecorded || delegated.proof === "evidence-recorded",
    };
    const nextStep = definition.steps[state.currentStep.stepIndex + 1];
    if (nextStep) {
      const next: ValidationRunnerPersistentState = {
        ...state,
        revision: state.revision + 1,
        lifecycle: { kind: "running", stepId: nextStep.stepId },
        currentStep: {
          scenarioId: definition.scenarioId,
          stepId: nextStep.stepId,
          stepIndex: state.currentStep.stepIndex + 1,
        },
        completedStepIds,
        proofs,
      };
      return await this.persist(state, next, { status: "RUNNING", state: next });
    }

    const completedState: ValidationRunnerPersistentState = { ...state, completedStepIds, proofs };
    if (!proofs.verificationPassed || !proofs.evidenceRecorded) {
      return await this.stop(completedState, "BLOCKED", reason(
        "completion-proof-missing",
        `Scenario ${state.run.scenarioId} cannot pass without verifier and evidence success.`,
        delegated.evidenceRefs,
      ), state.revision);
    }
    return await this.completeScenario(state, completedState);
  }

  async resume(request: ValidationRunnerResumeRequest): Promise<ValidationRunnerResult> {
    const state = await this.requireState();
    const identityProblem = this.requestProblem(state, request.run, request.expectedRevision);
    if (identityProblem !== null) return this.blocked(state, identityProblem.kind, identityProblem.summary);
    const definition = this.currentDefinition(state);
    if (!definition) {
      return this.blocked(state, "invalid-definition", "The immutable scenario definition is unavailable.");
    }

    let cleanupRetryProven = false;
    if (state.lifecycle.kind === "paused-human-action" || state.lifecycle.kind === "resumable") {
      const activeCheckpoint = state.lifecycle.kind === "paused-human-action"
        ? state.lifecycle.checkpoint
        : state.lifecycle.resume.checkpoint;
      if (activeCheckpoint.checkpointId !== request.checkpointId) {
        return this.blocked(state, "resume-rejected", "Resume checkpoint does not match the active checkpoint.");
      }
    } else if (state.lifecycle.kind === "running" && state.currentStep !== null) {
      const currentStep = definition.steps[state.currentStep.stepIndex];
      if (currentStep?.stepId !== state.currentStep.stepId || state.lifecycle.stepId !== currentStep.stepId) {
        return this.blocked(state, "invalid-definition", "The running cleanup-retry cursor is inconsistent.");
      }
      try {
        // C accepts this on RUNNING only when the exact tuple is already in its
        // durable adoption journal. It is therefore proof, not a new adoption.
        await this.dependencies.state.commitResume({
          run: state.run,
          checkpointId: request.checkpointId,
          resumeStepId: currentStep.stepId,
        });
        cleanupRetryProven = true;
      } catch {
        return this.blocked(state, "resume-rejected",
          "A running resume cleanup retry lacks the exact durable adoption tuple.");
      }
    } else {
      return this.blocked(state, "invalid-transition", `Cannot resume lifecycle ${state.lifecycle.kind}.`);
    }

    const consumed = await this.dependencies.humanCheckpoints.consumeResume(
      request.run,
      request.checkpointId,
      request.currentDevice,
      this.dependencies.state,
    );
    if (consumed.status === "resumed") {
      if (consumed.checkpointId !== request.checkpointId) {
        return this.blocked(state, "resume-rejected", "VH13 resumed a different checkpoint.");
      }
      const stepIndex = definition?.steps.findIndex(step => step.stepId === consumed.resumeStepId) ?? -1;
      const step = definition?.steps[stepIndex];
      if (!definition || !step || stepIndex < 0) {
        return await this.stop(state, "BLOCKED", reason(
          "invalid-definition",
          `VH13 adopted unknown resume step ${consumed.resumeStepId}.`,
        ));
      }
      const adopted = await this.current();
      const revisionAccepted = cleanupRetryProven
        ? adopted !== null && adopted.revision >= state.revision
        : adopted !== null && adopted.revision > state.revision;
      if (
        adopted === null ||
        !revisionAccepted ||
        !sameRun(adopted.run, state.run) ||
        adopted.lifecycle.kind !== "running" ||
        adopted.lifecycle.stepId !== step.stepId ||
        adopted.currentStep?.scenarioId !== definition.scenarioId ||
        adopted.currentStep.stepId !== step.stepId ||
        adopted.currentStep.stepIndex !== stepIndex
      ) {
        return this.blocked(state, "resume-adoption-failed",
          "VH13 reported resumed without the exact durable runner-step adoption.");
      }
      return { status: "RUNNING", state: adopted };
    }
    if (consumed.status === "resumable") {
      if (
        consumed.state.checkpoint.checkpointId !== request.checkpointId ||
        !sameRun(consumed.state.checkpoint.run, state.run)
      ) {
        return this.blocked(state, "resume-rejected", "VH13 returned a different resumable checkpoint or run.");
      }
      if (!consumed.state.acknowledgedAt || !consumed.state.verifiedAt) {
        return await this.stop(state, "BLOCKED", reason(
          "resume-rejected",
          "VH13 returned resumable state without durable acknowledgement and verification.",
        ));
      }
      const resume = {
        state: "resumable" as const,
        checkpoint: consumed.state.checkpoint,
        acknowledgement: consumed.state.acknowledgedAt,
        verification: consumed.state.verifiedAt,
        resumeStepId: consumed.state.resumeStepId,
      };
      const resumeStepIndex = definition.steps.findIndex(step => step.stepId === resume.resumeStepId);
      if (resumeStepIndex < 0) {
        return await this.stop(state, "BLOCKED", reason(
          "invalid-definition",
          `VH13 returned unknown resume step ${resume.resumeStepId}.`,
        ));
      }
      const next = {
        ...state,
        revision: state.revision + 1,
        lifecycle: { kind: "resumable", resume } as const,
        currentStep: {
          scenarioId: definition.scenarioId,
          stepId: resume.resumeStepId,
          stepIndex: resumeStepIndex,
        },
      };
      return await this.persist(state, next, { status: "RESUMABLE", state: next, resume });
    }
    if (consumed.status === "paused" && consumed.state) {
      if (
        consumed.state.checkpoint.checkpointId !== request.checkpointId ||
        !sameRun(consumed.state.checkpoint.run, state.run)
      ) {
        return this.blocked(state, "resume-rejected", "VH13 paused a different checkpoint or run.");
      }
      const durable = await this.current() ?? state;
      if (
        durable.lifecycle.kind === "running" &&
        durable.currentStep !== null &&
        durable.revision > state.revision
      ) {
        const durableStep = definition.steps[durable.currentStep.stepIndex];
        if (
          !sameRun(durable.run, state.run) ||
          durable.currentStep.scenarioId !== definition.scenarioId ||
          durableStep?.stepId !== durable.currentStep.stepId ||
          durable.lifecycle.stepId !== durable.currentStep.stepId
        ) {
          return this.blocked(durable, "invalid-definition",
            "Durable adoption advanced to a cursor outside the immutable definition.");
        }
        try {
          await this.dependencies.state.commitResume({
            run: durable.run,
            checkpointId: request.checkpointId,
            resumeStepId: durable.currentStep.stepId,
          });
        } catch {
          return this.blocked(durable, "resume-adoption-failed",
            "Runner advanced before cleanup without a provable exact adoption tuple.");
        }
      }
      return {
        status: "PAUSED-HUMAN-ACTION",
        state: durable,
        checkpoint: consumed.state.checkpoint,
      };
    }
    if (consumed.status === "empty" && cleanupRetryProven) {
      const adopted = await this.current();
      if (
        adopted !== null &&
        adopted.revision === state.revision &&
        sameRun(adopted.run, state.run) &&
        adopted.lifecycle.kind === "running" &&
        adopted.currentStep?.stepId === state.currentStep?.stepId
      ) return { status: "RUNNING", state: adopted };
      return this.blocked(state, "resume-adoption-failed",
        "The proven cleanup retry no longer matches durable runner state.");
    }
    const summary = consumed.status === "rejected"
      ? `VH13 rejected resume: ${consumed.reason}.`
      : consumed.status === "paused"
        ? `VH13 paused resume: ${consumed.reason}.`
        : "VH13 had no matching checkpoint to resume.";
    return this.blocked(state, "resume-rejected", summary);
  }

  private async beginScenario(
    run: ValidationRunIdentity,
    definition: ValidationRunnerScenarioDefinition,
    execution: ValidationRunnerExecutionIdentity,
  ): Promise<ValidationRunnerResult> {
    const firstStep = definition.steps[0]!;
    const pending: ValidationRunnerPersistentState = {
      schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
      revision: 1,
      run,
      execution,
      lifecycle: { kind: "pending" },
      currentStep: { scenarioId: definition.scenarioId, stepId: firstStep.stepId, stepIndex: 0 },
      completedStepIds: [],
      completedScenarioIds: [],
      proofs: { verificationPassed: false, evidenceRecorded: false },
    };
    if (!await this.dependencies.state.compareAndSet(null, pending)) {
      return this.blocked(pending, "state-changed", "Runner state changed while starting.");
    }
    return await this.enterRunningAfterPrerequisites(pending, definition);
  }

  private async enterRunningAfterPrerequisites(
    state: ValidationRunnerPersistentState,
    definition: ValidationRunnerScenarioDefinition,
  ): Promise<ValidationRunnerResult> {
    let results: readonly ValidationRunnerPrerequisiteResult[];
    try {
      results = await this.dependencies.modules.evaluatePrerequisites({
        run: state.run,
        prerequisiteIds: definition.prerequisiteIds,
      });
    } catch {
      return await this.stop(state, "BLOCKED", reason(
        "module-blocked",
        `Prerequisite evaluation threw for scenario ${definition.scenarioId}.`,
      ));
    }

    const requested = new Set(definition.prerequisiteIds);
    const returned = results.map(result => result.prerequisiteId);
    if (
      returned.length !== requested.size ||
      new Set(returned).size !== returned.length ||
      returned.some(id => !requested.has(id))
    ) {
      return await this.stop(state, "BLOCKED", reason(
        "prerequisite-blocked",
        `Prerequisite results did not exactly cover scenario ${definition.scenarioId}.`,
        results.flatMap(result => result.evidenceRefs),
      ));
    }
    const failed = results.find(result => result.status === "failed");
    if (failed) {
      return await this.stop(state, "FAIL", reason("prerequisite-failed", failed.summary, failed.evidenceRefs));
    }
    const blocked = results.find(result => result.status === "blocked");
    if (blocked) {
      return await this.stop(state, "BLOCKED", reason("prerequisite-blocked", blocked.summary, blocked.evidenceRefs));
    }

    const step = definition.steps[0]!;
    const next: ValidationRunnerPersistentState = {
      ...state,
      revision: state.revision + 1,
      lifecycle: { kind: "running", stepId: step.stepId },
      currentStep: { scenarioId: definition.scenarioId, stepId: step.stepId, stepIndex: 0 },
    };
    return await this.persist(state, next, { status: "RUNNING", state: next });
  }

  private async completeScenario(
    persistedState: ValidationRunnerPersistentState,
    completedState: ValidationRunnerPersistentState,
  ): Promise<ValidationRunnerResult> {
    const completedScenarioIds = [...completedState.completedScenarioIds, completedState.run.scenarioId];
    if (completedState.execution.kind === "single") {
      const next: ValidationRunnerPersistentState = {
        ...completedState,
        revision: persistedState.revision + 1,
        lifecycle: { kind: "terminal", verdict: "pass", summary: `Scenario ${completedState.run.scenarioId} passed.` },
        currentStep: null,
        completedScenarioIds,
      };
      return await this.persist(persistedState, next, { status: "PASS", state: next });
    }

    const nextIndex = completedState.execution.currentScenarioIndex + 1;
    const nextScenarioId = completedState.execution.scenarioIds[nextIndex];
    const nextDefinition = nextScenarioId === undefined ? undefined : this.definitions.get(nextScenarioId);
    if (!nextDefinition) {
      if (nextIndex !== completedState.execution.scenarioIds.length) {
        return await this.stop(completedState, "BLOCKED", reason(
          "invalid-definition",
          "Ordered suite definitions are unavailable or inconsistent.",
        ), persistedState.revision);
      }
      const next: ValidationRunnerPersistentState = {
        ...completedState,
        revision: persistedState.revision + 1,
        lifecycle: { kind: "terminal", verdict: "pass", summary: `Suite ${completedState.execution.suiteId} passed.` },
        currentStep: null,
        completedScenarioIds,
      };
      return await this.persist(persistedState, next, { status: "PASS", state: next });
    }

    const firstStep = nextDefinition.steps[0]!;
    const pending: ValidationRunnerPersistentState = {
      ...completedState,
      revision: persistedState.revision + 1,
      run: validationRunIdentity(String(completedState.run.runId), nextDefinition.scenarioId),
      execution: { ...completedState.execution, currentScenarioIndex: nextIndex },
      lifecycle: { kind: "pending" },
      currentStep: { scenarioId: nextDefinition.scenarioId, stepId: firstStep.stepId, stepIndex: 0 },
      completedScenarioIds,
      proofs: { verificationPassed: false, evidenceRecorded: false },
    };
    if (!await this.dependencies.state.compareAndSet(persistedState.revision, pending)) {
      return this.blocked(persistedState, "state-changed", "Runner state changed while advancing the suite.");
    }
    return await this.enterRunningAfterPrerequisites(pending, nextDefinition);
  }

  private currentDefinition(state: ValidationRunnerPersistentState): ValidationRunnerScenarioDefinition | undefined {
    if (
      state.execution.kind === "single" &&
      state.execution.scenarioId !== state.run.scenarioId
    ) return undefined;
    if (
      state.execution.kind === "suite" &&
      state.execution.scenarioIds[state.execution.currentScenarioIndex] !== state.run.scenarioId
    ) return undefined;
    return this.definitions.get(state.run.scenarioId);
  }

  private registerDefinition(definition: ValidationRunnerScenarioDefinition): void {
    const immutable = Object.freeze({
      ...definition,
      prerequisiteIds: Object.freeze([...definition.prerequisiteIds]),
      steps: Object.freeze(definition.steps.map(step => Object.freeze({ ...step }))),
    });
    this.definitions.set(definition.scenarioId, immutable);
  }

  private requestProblem(
    state: ValidationRunnerPersistentState,
    run: ValidationRunIdentity,
    expectedRevision: number,
  ): Pick<ValidationRunnerStopReason, "kind" | "summary"> | null {
    if (!sameRun(state.run, run)) return { kind: "invalid-transition", summary: "Request run identity does not match durable runner state." };
    if (state.revision !== expectedRevision) return { kind: "state-changed", summary: "Request revision is stale." };
    return null;
  }

  private async requireState(): Promise<ValidationRunnerPersistentState> {
    const state = await this.current();
    if (state === null) throw new Error("Validation runner has no durable state.");
    return state;
  }

  private existingRunResult(state: ValidationRunnerPersistentState): ValidationRunnerResult {
    return this.blocked(
      state,
      state.lifecycle.kind === "terminal" ? "terminal-state" : "state-changed",
      "A durable validation run already exists.",
    );
  }

  private blocked(
    state: ValidationRunnerPersistentState,
    kind: ValidationRunnerStopReason["kind"],
    summary: string,
  ): ValidationRunnerResult {
    return { status: "BLOCKED", state, reason: reason(kind, summary) };
  }

  private async persistInvalidStart(
    run: ValidationRunIdentity,
    execution: ValidationRunnerExecutionIdentity,
    definition: ValidationRunnerScenarioDefinition,
    summary: string,
  ): Promise<ValidationRunnerResult> {
    const state: ValidationRunnerPersistentState = {
      schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
      revision: 1,
      run,
      execution,
      lifecycle: { kind: "terminal", verdict: "blocked", summary },
      currentStep: definition.steps[0]
        ? { scenarioId: definition.scenarioId, stepId: definition.steps[0].stepId, stepIndex: 0 }
        : null,
      completedStepIds: [],
      completedScenarioIds: [],
      proofs: { verificationPassed: false, evidenceRecorded: false },
    };
    const result: ValidationRunnerResult = {
      status: "BLOCKED",
      state,
      reason: reason("invalid-definition", summary),
    };
    if (!await this.dependencies.state.compareAndSet(null, state)) {
      return this.blocked(state, "state-changed", "Runner state changed while rejecting an invalid definition.");
    }
    return result;
  }

  private async stop(
    state: ValidationRunnerPersistentState,
    status: "FAIL" | "BLOCKED",
    stopReason: ValidationRunnerStopReason,
    expectedRevision = state.revision,
  ): Promise<ValidationRunnerResult> {
    const next: ValidationRunnerPersistentState = {
      ...state,
      revision: expectedRevision + 1,
      lifecycle: {
        kind: "terminal",
        verdict: status === "FAIL" ? "fail" : "blocked",
        summary: stopReason.summary,
      },
    };
    return await this.persist(
      { ...state, revision: expectedRevision },
      next,
      status === "FAIL"
        ? { status: "FAIL", state: next, reason: stopReason }
        : { status: "BLOCKED", state: next, reason: stopReason },
    );
  }

  private async persist(
    previous: ValidationRunnerPersistentState,
    next: ValidationRunnerPersistentState,
    result: ValidationRunnerResult,
  ): Promise<ValidationRunnerResult> {
    if (!await this.dependencies.state.compareAndSet(previous.revision, next)) {
      const durable = await this.current();
      return this.blocked(durable ?? previous, "state-changed", "Runner state changed during the lifecycle transition.");
    }
    return result;
  }
}

export interface ValidationScenarioRunnerCoreOptions {
  /** Immutable scenario catalog used to reconstruct a fresh core after restart. */
  readonly definitions?: readonly ValidationRunnerScenarioDefinition[];
}

export function createValidationScenarioRunnerCore(
  dependencies: ValidationScenarioRunnerDependencies,
  options?: ValidationScenarioRunnerCoreOptions,
): ValidationScenarioRunner {
  return new ValidationScenarioRunnerCore(dependencies, options);
}
