import assert from "node:assert/strict";
import test from "node:test";
import {
  createValidationScenarioRunnerCore,
} from "../src/validation/scenario-runner-core";
import {
  VALIDATION_RUNNER_SCENARIO_IDS,
  type ValidationRunnerDelegatedStepResult,
  type ValidationRunnerDurableStatePort,
  type ValidationRunnerHumanCheckpointResumePort,
  type ValidationRunnerModuleFacade,
  type ValidationRunnerPersistentState,
  type ValidationRunnerResumeAdoptionInput,
  type ValidationRunnerScenarioDefinition,
} from "../src/validation/scenario-runner-contracts";
import {
  VALIDATION_SCENARIO_IDS,
  humanCheckpoint,
  humanCheckpointId,
  validationDeviceIdentity,
  validationRunId,
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";

class MemoryState implements ValidationRunnerDurableStatePort {
  value: ValidationRunnerPersistentState | null = null;
  readonly adoptions: ValidationRunnerResumeAdoptionInput[] = [];
  rejectNextWrite = false;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    if (this.rejectNextWrite) {
      this.rejectNextWrite = false;
      return false;
    }
    if ((this.value?.revision ?? null) !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    return true;
  }

  async commitResume(input: ValidationRunnerResumeAdoptionInput): Promise<void> {
    this.adoptions.push(structuredClone(input));
  }
}

function scenario(
  scenarioId: "C03" | "C04" | "D01" = "C03",
  prerequisiteIds: readonly string[] = ["sandbox-ready"],
): ValidationRunnerScenarioDefinition {
  return {
    scenarioId,
    prerequisiteIds,
    steps: [
      {
        stepId: validationStepId(`${scenarioId}-operate`),
        module: "production-path-driver",
        operation: "operate",
        requiredCompletionProof: "operation-complete",
      },
      {
        stepId: validationStepId(`${scenarioId}-verify`),
        module: "state-convergence-verifier",
        operation: "verify",
        requiredCompletionProof: "verification-passed",
      },
      {
        stepId: validationStepId(`${scenarioId}-record`),
        module: "scenario-evidence-recorder",
        operation: "record",
        requiredCompletionProof: "evidence-recorded",
      },
    ],
  };
}

function completingModules(overrides: {
  readonly prerequisites?: ValidationRunnerModuleFacade["evaluatePrerequisites"];
  readonly execute?: ValidationRunnerModuleFacade["executeStep"];
} = {}): ValidationRunnerModuleFacade {
  return {
    evaluatePrerequisites: overrides.prerequisites ?? (async input => input.prerequisiteIds.map(prerequisiteId => ({
      prerequisiteId,
      status: "satisfied" as const,
      summary: "ready",
      evidenceRefs: [],
    }))),
    executeStep: overrides.execute ?? (async input => ({
      status: "completed",
      proof: input.step.requiredCompletionProof,
      evidenceRefs: [],
    })),
  };
}

function runnerWith(
  state: MemoryState,
  modules: ValidationRunnerModuleFacade,
  consumeResume?: ValidationRunnerHumanCheckpointResumePort["consumeResume"],
) {
  return createValidationScenarioRunnerCore({
    state,
    modules,
    humanCheckpoints: {
      consumeResume: typeof consumeResume === "function"
        ? consumeResume
        : async () => ({ status: "empty" }),
    },
  });
}

test("VH14-B enumerates the exact frozen C03-F03 tuple", () => {
  const runner = runnerWith(new MemoryState(), completingModules());
  assert.equal(runner.enumerateScenarioIds(), VALIDATION_RUNNER_SCENARIO_IDS);
  assert.equal(runner.enumerateScenarioIds(), VALIDATION_SCENARIO_IDS);
  assert.deepEqual(runner.enumerateScenarioIds(), [
    "C03", "C04", "C05", "C06", "C07", "C08", "C09",
    "D01", "D02", "D03", "D04", "D05", "D06",
    "E01", "E02", "E03", "E04", "E05", "E06", "E07",
    "F01", "F02", "F03",
  ]);
});

test("VH14-B deterministically advances one scenario and preserves identity until proven PASS", async () => {
  const state = new MemoryState();
  const definition = scenario();
  const run = validationRunIdentity("single-run", "C03");
  const executed: string[] = [];
  const runner = runnerWith(state, completingModules({
    execute: async input => {
      executed.push(String(input.step.stepId));
      return { status: "completed", proof: input.step.requiredCompletionProof, evidenceRefs: [] };
    },
  }));

  const started = await runner.startScenario({ run, definition });
  assert.equal(started.status, "RUNNING");
  assert.equal(started.state.revision, 2);
  assert.deepEqual(started.state.run, run);
  assert.deepEqual(started.state.currentStep, {
    scenarioId: "C03",
    stepId: validationStepId("C03-operate"),
    stepIndex: 0,
  });
  assert.deepEqual(started.state.proofs, { verificationPassed: false, evidenceRecorded: false });

  const operated = await runner.advance({ run, expectedRevision: started.state.revision });
  assert.equal(operated.status, "RUNNING");
  assert.deepEqual(operated.state.completedStepIds, [validationStepId("C03-operate")]);
  assert.deepEqual(operated.state.proofs, { verificationPassed: false, evidenceRecorded: false });

  const verified = await runner.advance({ run, expectedRevision: operated.state.revision });
  assert.equal(verified.status, "RUNNING");
  assert.deepEqual(verified.state.proofs, { verificationPassed: true, evidenceRecorded: false });

  const passed = await runner.advance({ run, expectedRevision: verified.state.revision });
  assert.equal(passed.status, "PASS");
  assert.deepEqual(passed.state.run, run);
  assert.deepEqual(passed.state.completedScenarioIds, ["C03"]);
  assert.deepEqual(passed.state.proofs, { verificationPassed: true, evidenceRecorded: true });
  assert.deepEqual(executed, ["C03-operate", "C03-verify", "C03-record"]);
});

test("VH14-B fails closed on incomplete prerequisites without invoking a step", async () => {
  for (const prerequisiteStatus of ["failed", "blocked"] as const) {
    const state = new MemoryState();
    let executions = 0;
    const runner = runnerWith(state, completingModules({
      prerequisites: async input => [{
        prerequisiteId: input.prerequisiteIds[0]!,
        status: prerequisiteStatus,
        summary: `${prerequisiteStatus} prerequisite`,
        evidenceRefs: [],
      }],
      execute: async () => {
        executions += 1;
        return { status: "completed", proof: "operation-complete", evidenceRefs: [] };
      },
    }));
    const result = await runner.startScenario({
      run: validationRunIdentity(`prerequisite-${prerequisiteStatus}`, "C03"),
      definition: scenario(),
    });
    assert.equal(result.status, prerequisiteStatus === "failed" ? "FAIL" : "BLOCKED");
    assert.equal(result.state.lifecycle.kind, "terminal");
    assert.equal(executions, 0);
  }

  const missing = runnerWith(new MemoryState(), completingModules({ prerequisites: async () => [] }));
  const result = await missing.startScenario({
    run: validationRunIdentity("missing-prerequisite-result", "C03"),
    definition: scenario(),
  });
  assert.equal(result.status, "BLOCKED");
  if (result.status === "BLOCKED") assert.equal(result.reason.kind, "prerequisite-blocked");
});

test("VH14-B never manufactures verifier or evidence success", async () => {
  const state = new MemoryState();
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C03",
    prerequisiteIds: [],
    steps: [{
      stepId: validationStepId("C03-only-operation"),
      module: "production-path-driver",
      operation: "operate-only",
      requiredCompletionProof: "operation-complete",
    }],
  };
  const runner = runnerWith(state, completingModules());
  const started = await runner.startScenario({ run: validationRunIdentity("proof-run", "C03"), definition });
  const result = await runner.advance({ run: started.state.run, expectedRevision: started.state.revision });
  assert.equal(result.status, "BLOCKED");
  if (result.status === "BLOCKED") assert.equal(result.reason.kind, "completion-proof-missing");
  assert.deepEqual(result.state.proofs, { verificationPassed: false, evidenceRecorded: false });

  const mismatchState = new MemoryState();
  const mismatch = runnerWith(mismatchState, completingModules({
    execute: async () => ({ status: "completed", proof: "evidence-recorded", evidenceRefs: [] }),
  }));
  const mismatchStarted = await mismatch.startScenario({
    run: validationRunIdentity("mismatch-run", "C03"),
    definition: scenario(),
  });
  const mismatchResult = await mismatch.advance({
    run: mismatchStarted.state.run,
    expectedRevision: mismatchStarted.state.revision,
  });
  assert.equal(mismatchResult.status, "BLOCKED");
  if (mismatchResult.status === "BLOCKED") assert.equal(mismatchResult.reason.kind, "completion-proof-missing");
});

test("VH14-B advances ordered suites only after PASS and keeps per-scenario proof state", async () => {
  const state = new MemoryState();
  const runner = runnerWith(state, completingModules());
  let result = await runner.startSuite({
    runId: validationRunId("ordered-suite"),
    suite: { suiteId: "C03-C04", scenarios: [scenario("C03"), scenario("C04")] },
  });
  assert.equal(result.status, "RUNNING");
  assert.equal(result.state.run.scenarioId, "C03");
  for (let index = 0; index < 3; index += 1) {
    result = await runner.advance({ run: result.state.run, expectedRevision: result.state.revision });
  }
  assert.equal(result.status, "RUNNING");
  assert.equal(result.state.run.scenarioId, "C04");
  assert.equal(result.state.execution.kind, "suite");
  if (result.state.execution.kind === "suite") assert.equal(result.state.execution.currentScenarioIndex, 1);
  assert.deepEqual(result.state.completedScenarioIds, ["C03"]);
  assert.deepEqual(result.state.proofs, { verificationPassed: false, evidenceRecorded: false });
  for (let index = 0; index < 3; index += 1) {
    result = await runner.advance({ run: result.state.run, expectedRevision: result.state.revision });
  }
  assert.equal(result.status, "PASS");
  assert.deepEqual(result.state.completedScenarioIds, ["C03", "C04"]);
});

test("VH14-B terminal failure stops a suite and blocks later execution", async () => {
  const state = new MemoryState();
  const executed: string[] = [];
  const runner = runnerWith(state, completingModules({
    execute: async input => {
      executed.push(String(input.run.scenarioId));
      return {
        status: "failed",
        reason: { kind: "module-failed", summary: "delegated failure", evidenceRefs: [] },
      };
    },
  }));
  const started = await runner.startSuite({
    runId: validationRunId("failed-suite"),
    suite: { suiteId: "fail-closed", scenarios: [scenario("C03"), scenario("D01")] },
  });
  const failed = await runner.advance({ run: started.state.run, expectedRevision: started.state.revision });
  assert.equal(failed.status, "FAIL");
  const afterTerminal = await runner.advance({ run: failed.state.run, expectedRevision: failed.state.revision });
  assert.equal(afterTerminal.status, "BLOCKED");
  if (afterTerminal.status === "BLOCKED") assert.equal(afterTerminal.reason.kind, "terminal-state");
  assert.deepEqual(executed, ["C03"]);
  assert.deepEqual(failed.state.completedScenarioIds, []);
});

test("VH14-B represents PAUSED-HUMAN-ACTION and resumes only through the VH13 port", async () => {
  const state = new MemoryState();
  const run = validationRunIdentity("resume-run", "C03");
  const definition = scenario();
  const checkpoint = humanCheckpoint({
    checkpointId: "resume-checkpoint",
    run,
    deviceId: "iphone-a",
    requestedAction: "restart-obsidian",
    instruction: "Restart Obsidian.",
  });
  let execution = 0;
  let consumeCalls = 0;
  const runner = runnerWith(state, completingModules({
    execute: async input => {
      execution += 1;
      if (execution === 1) return { status: "paused-human-action", checkpoint, evidenceRefs: [] };
      return { status: "completed", proof: input.step.requiredCompletionProof, evidenceRefs: [] };
    },
  }), async (consumeRun, checkpointId, _device, resumeCommit) => {
    consumeCalls += 1;
    const resumeStepId = validationStepId("C03-verify");
    const adoptedCheckpointId = humanCheckpointId(checkpointId);
    await resumeCommit.commitResume({ run: consumeRun, checkpointId: adoptedCheckpointId, resumeStepId });
    return { status: "resumed", checkpointId: adoptedCheckpointId, resumeStepId };
  });

  const started = await runner.startScenario({ run, definition });
  const paused = await runner.advance({ run, expectedRevision: started.state.revision });
  assert.equal(paused.status, "PAUSED-HUMAN-ACTION");
  assert.deepEqual(paused.state.currentStep, started.state.currentStep);
  const resumed = await runner.resume({
    run,
    checkpointId: checkpoint.checkpointId,
    currentDevice: validationDeviceIdentity("iphone-a", "iphone"),
    expectedRevision: paused.state.revision,
  });
  assert.equal(resumed.status, "RUNNING");
  assert.equal(resumed.state.currentStep?.stepId, validationStepId("C03-verify"));
  assert.equal(consumeCalls, 1);
  assert.deepEqual(state.adoptions, [{ run, checkpointId: checkpoint.checkpointId, resumeStepId: validationStepId("C03-verify") }]);
});

test("VH14-B represents RESUMABLE and rejects stale transitions without module work", async () => {
  const state = new MemoryState();
  const run = validationRunIdentity("resumable-run", "C03");
  const checkpoint = humanCheckpoint({
    checkpointId: "resumable-checkpoint",
    run,
    deviceId: "iphone-a",
    requestedAction: "restart-obsidian",
    instruction: "Restart Obsidian.",
  });
  const resume = {
    state: "resumable" as const,
    checkpoint,
    acknowledgement: "acknowledged",
    verification: "verified",
    resumeStepId: validationStepId("C03-verify"),
  };
  let executions = 0;
  const runner = runnerWith(state, completingModules({
    execute: async (): Promise<ValidationRunnerDelegatedStepResult> => {
      executions += 1;
      return { status: "resumable", resume, evidenceRefs: [] };
    },
  }));
  const started = await runner.startScenario({ run, definition: scenario() });
  const stale = await runner.advance({ run, expectedRevision: started.state.revision - 1 });
  assert.equal(stale.status, "BLOCKED");
  if (stale.status === "BLOCKED") assert.equal(stale.reason.kind, "state-changed");
  assert.equal(executions, 0);
  const resumable = await runner.advance({ run, expectedRevision: started.state.revision });
  assert.equal(resumable.status, "RESUMABLE");
  assert.equal(resumable.state.lifecycle.kind, "resumable");
});

test("VH14-B fails closed when lifecycle persistence loses its CAS race", async () => {
  const state = new MemoryState();
  const runner = runnerWith(state, completingModules());
  const started = await runner.startScenario({
    run: validationRunIdentity("cas-run", "C03"),
    definition: scenario(),
  });
  state.rejectNextWrite = true;
  const result = await runner.advance({ run: started.state.run, expectedRevision: started.state.revision });
  assert.equal(result.status, "BLOCKED");
  if (result.status === "BLOCKED") assert.equal(result.reason.kind, "state-changed");
  assert.equal(state.value?.revision, started.state.revision);
});
