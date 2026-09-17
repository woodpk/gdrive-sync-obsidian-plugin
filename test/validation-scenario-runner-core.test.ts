import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  HumanCheckpointResumeController,
  type HumanCheckpointDurableState,
  type HumanCheckpointStateStore,
} from "../src/validation/human-checkpoint-resume-controller";
import {
  createValidationScenarioRunnerCore,
  type ValidationScenarioRunnerCoreOptions,
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
  type ValidationRunnerStateStore,
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
    const current = this.value;
    if (
      current === null ||
      current.lifecycle.kind !== "resumable" ||
      current.run.runId !== input.run.runId ||
      current.run.scenarioId !== input.run.scenarioId ||
      current.lifecycle.resume.checkpoint.checkpointId !== input.checkpointId ||
      current.lifecycle.resume.resumeStepId !== input.resumeStepId ||
      current.currentStep?.stepId !== input.resumeStepId
    ) throw new Error("Resume adoption tuple mismatch.");
    this.value = structuredClone({
      ...current,
      revision: current.revision + 1,
      lifecycle: { kind: "running", stepId: input.resumeStepId },
    });
  }
}

class RawRunnerStore implements ValidationRunnerStateStore {
  value: ValidationRunnerPersistentState | null = null;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    if ((this.value?.revision ?? null) !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    return true;
  }
}

class RawAdoptionStore {
  value: unknown = null;

  async load(): Promise<unknown> {
    return structuredClone(this.value);
  }

  async compareAndSet(expectedRevision: number | null, next: unknown): Promise<boolean> {
    const current = this.value as { readonly revision?: unknown } | null;
    if ((current?.revision ?? null) !== expectedRevision) return false;
    this.value = structuredClone(next);
    return true;
  }
}

class InterruptibleCheckpointStore implements HumanCheckpointStateStore {
  readonly durability = "external-coordination" as const;
  value: HumanCheckpointDurableState | null = null;
  failNextCleanup = false;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: HumanCheckpointDurableState | null,
  ): Promise<boolean> {
    if ((this.value?.revision ?? null) !== expectedRevision) return false;
    if (next === null && this.failNextCleanup) {
      this.failNextCleanup = false;
      return false;
    }
    this.value = next === null ? null : structuredClone(next);
    return true;
  }
}

const INTEGRATED_C_MODULE = resolve(
  __dirname,
  "../src/validation/scenario-runner-durable-state.js",
);

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
  state: ValidationRunnerDurableStatePort,
  modules: ValidationRunnerModuleFacade,
  consumeResume?: ValidationRunnerHumanCheckpointResumePort["consumeResume"],
  options?: ValidationScenarioRunnerCoreOptions,
) {
  return createValidationScenarioRunnerCore({
    state,
    modules,
    humanCheckpoints: {
      consumeResume: typeof consumeResume === "function"
        ? consumeResume
        : async () => ({ status: "empty" }),
    },
  }, options);
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

test("VH14-B reconstructs deterministic advancement from durable state plus an immutable definition catalog", async () => {
  const state = new MemoryState();
  const definition = scenario();
  const modules = completingModules();
  const run = validationRunIdentity("restart-run", "C03");
  const beforeRestart = runnerWith(state, modules);
  const started = await beforeRestart.startScenario({ run, definition });
  const operated = await beforeRestart.advance({ run, expectedRevision: started.state.revision });
  assert.equal(operated.state.currentStep?.stepId, validationStepId("C03-verify"));

  const afterRestart = runnerWith(state, modules, undefined, { definitions: [definition] });
  const verified = await afterRestart.advance({ run, expectedRevision: operated.state.revision });
  assert.equal(verified.status, "RUNNING");
  assert.equal(verified.state.currentStep?.stepId, validationStepId("C03-record"));

  const afterSecondRestart = runnerWith(state, modules, undefined, { definitions: [definition] });
  const passed = await afterSecondRestart.advance({ run, expectedRevision: verified.state.revision });
  assert.equal(passed.status, "PASS");
  assert.deepEqual(passed.state.completedScenarioIds, ["C03"]);
});

test("VH14-B recovers exact single and suite pending cursors after rev1 interruption", async () => {
  for (const kind of ["single", "suite"] as const) {
    const state = new MemoryState();
    const definitions = kind === "single"
      ? [scenario("C03")] as const
      : [scenario("C03"), scenario("C04")] as const;
    const interruptedModules = completingModules({
      prerequisites: async () => await new Promise<never>(() => {}),
    });
    const interrupted = runnerWith(state, interruptedModules);
    if (kind === "single") {
      void interrupted.startScenario({
        run: validationRunIdentity("pending-single", "C03"),
        definition: definitions[0],
      });
    } else {
      void interrupted.startSuite({
        runId: validationRunId("pending-suite"),
        suite: { suiteId: "pending-suite", scenarios: definitions },
      });
    }
    await new Promise<void>(resolvePending => setImmediate(resolvePending));
    assert.equal(state.value?.revision, 1);
    assert.equal(state.value?.lifecycle.kind, "pending");
    assert.equal(state.value?.currentStep?.stepId, validationStepId("C03-operate"));

    const recovered = runnerWith(state, completingModules(), undefined, { definitions });
    const result = await recovered.advance({
      run: state.value!.run,
      expectedRevision: state.value!.revision,
    });
    assert.equal(result.status, "RUNNING");
    assert.equal(result.state.revision, 2);
    assert.deepEqual(result.state.currentStep, {
      scenarioId: "C03",
      stepId: validationStepId("C03-operate"),
      stepIndex: 0,
    });
  }
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
  const modules = completingModules();
  const definitions = [scenario("C03"), scenario("C04")] as const;
  let runner = runnerWith(state, modules);
  let result = await runner.startSuite({
    runId: validationRunId("ordered-suite"),
    suite: { suiteId: "C03-C04", scenarios: definitions },
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
  runner = runnerWith(state, modules, undefined, { definitions });
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
  const resumable = {
    state: "resumable" as const,
    checkpoint,
    acknowledgement: "acknowledged",
    verification: "verified",
    resumeStepId: validationStepId("C03-verify"),
  };
  const modules = completingModules({
    execute: async () => {
      execution += 1;
      if (execution === 1) return { status: "paused-human-action", checkpoint, evidenceRefs: [] };
      return { status: "resumable", resume: resumable, evidenceRefs: [] };
    },
  });
  const consumeResume: ValidationRunnerHumanCheckpointResumePort["consumeResume"] = async (
    consumeRun,
    checkpointId,
    _device,
    resumeCommit,
  ) => {
    consumeCalls += 1;
    const resumeStepId = validationStepId("C03-verify");
    const adoptedCheckpointId = humanCheckpointId(checkpointId);
    await resumeCommit.commitResume({ run: consumeRun, checkpointId: adoptedCheckpointId, resumeStepId });
    return { status: "resumed", checkpointId: adoptedCheckpointId, resumeStepId };
  };
  const runner = runnerWith(state, modules, consumeResume);

  const started = await runner.startScenario({ run, definition });
  const paused = await runner.advance({ run, expectedRevision: started.state.revision });
  assert.equal(paused.status, "PAUSED-HUMAN-ACTION");
  assert.deepEqual(paused.state.currentStep, started.state.currentStep);
  const ready = await runner.advance({ run, expectedRevision: paused.state.revision });
  assert.equal(ready.status, "RESUMABLE");
  assert.equal(ready.state.currentStep?.stepId, validationStepId("C03-verify"));
  assert.equal(ready.state.currentStep?.stepIndex, 1);
  const restarted = runnerWith(state, modules, consumeResume, { definitions: [definition] });
  const resumed = await restarted.resume({
    run,
    checkpointId: checkpoint.checkpointId,
    currentDevice: validationDeviceIdentity("iphone-a", "iphone"),
    expectedRevision: ready.state.revision,
  });
  assert.equal(resumed.status, "RUNNING");
  assert.equal(resumed.state.currentStep?.stepId, validationStepId("C03-verify"));
  assert.equal(consumeCalls, 1);
  assert.equal(state.adoptions.length, 1);
  assert.ok(state.adoptions.every(adoption => (
    adoption.run.runId === run.runId &&
    adoption.run.scenarioId === run.scenarioId &&
    adoption.checkpointId === checkpoint.checkpointId &&
    adoption.resumeStepId === validationStepId("C03-verify")
  )));
});

test("VH14-B resolves a VH13-returned RESUMABLE cursor through the immutable definition", async () => {
  const state = new MemoryState();
  const run = validationRunIdentity("vh13-resumable-run", "C03");
  const definition = scenario();
  const checkpoint = humanCheckpoint({
    checkpointId: "vh13-resumable-checkpoint",
    run,
    deviceId: "iphone-a",
    requestedAction: "restart-obsidian",
    instruction: "Restart Obsidian.",
  });
  const runner = runnerWith(state, completingModules({
    execute: async () => ({ status: "paused-human-action", checkpoint, evidenceRefs: [] }),
  }), async () => ({
    status: "resumable",
    state: {
      schemaVersion: 1,
      revision: 3,
      status: "resumable",
      checkpoint,
      devicePlatform: "iphone",
      resumeStepId: validationStepId("C03-verify"),
      createdAt: "2026-09-17T12:00:00.000Z",
      acknowledgedAt: "2026-09-17T12:01:00.000Z",
      verifiedAt: "2026-09-17T12:02:00.000Z",
    },
  }));
  const started = await runner.startScenario({ run, definition });
  const paused = await runner.advance({ run, expectedRevision: started.state.revision });
  const resumable = await runner.resume({
    run,
    checkpointId: checkpoint.checkpointId,
    currentDevice: validationDeviceIdentity("iphone-a", "iphone"),
    expectedRevision: paused.state.revision,
  });
  assert.equal(resumable.status, "RESUMABLE");
  assert.deepEqual(resumable.state.currentStep, {
    scenarioId: "C03",
    stepId: validationStepId("C03-verify"),
    stepIndex: 1,
  });
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

test("VH14-B + real C + real VH13 retries cleanup after durable adoption and process restart", {
  skip: !existsSync(INTEGRATED_C_MODULE) && "Package C is not present on the isolated B branch.",
}, async () => {
  // Package C is intentionally absent from B's exact A base. This import is
  // exercised in the temporary B+C verification tree and Package I tree.
  // @ts-ignore -- resolved only after the separately owned C head is integrated.
  const cModule = await import("../src/validation/scenario-runner-durable-state");
  const DurableController = cModule.ValidationRunnerDurableStateController;
  const runnerStore = new RawRunnerStore();
  const adoptionStore = new RawAdoptionStore();
  const checkpointStore = new InterruptibleCheckpointStore();
  const clock = () => new Date("2026-09-17T12:00:00.000Z");
  const device = validationDeviceIdentity("iphone-integration", "iphone");
  const run = validationRunIdentity("b-c-vh13-retry", "C03");
  const definition = scenario();
  const resumeStepId = validationStepId("C03-verify");

  const vh13 = new HumanCheckpointResumeController(checkpointStore, clock);
  const began = await vh13.begin({
    run,
    checkpointId: "b-c-vh13-checkpoint",
    device,
    action: "restart-obsidian",
    resumeStepId: String(resumeStepId),
  });
  assert.equal(began.status, "paused");
  if (began.status !== "paused" || !began.state) throw new Error("Expected a durable VH13 checkpoint.");
  const checkpoint = began.state.checkpoint;
  await vh13.acknowledge(run, String(checkpoint.checkpointId));
  const verified = await vh13.verify(run, String(checkpoint.checkpointId), device, {
    observe: async () => ({ status: "verified" }),
  });
  assert.equal(verified.status, "resumable");

  let moduleCall = 0;
  const modules = completingModules({
    execute: async () => {
      moduleCall += 1;
      if (moduleCall === 1) return { status: "paused-human-action", checkpoint, evidenceRefs: [] };
      return {
        status: "resumable",
        resume: {
          state: "resumable",
          checkpoint,
          acknowledgement: "acknowledged",
          verification: "verified",
          resumeStepId,
        },
        evidenceRefs: [],
      };
    },
  });
  const initialDurable = new DurableController(runnerStore, adoptionStore);
  const initial = runnerWith(initialDurable, modules, vh13.consumeResume.bind(vh13));
  const started = await initial.startScenario({ run, definition });
  const paused = await initial.advance({ run, expectedRevision: started.state.revision });
  const ready = await initial.advance({ run, expectedRevision: paused.state.revision });
  assert.equal(ready.status, "RESUMABLE");
  assert.deepEqual(ready.state.currentStep, { scenarioId: "C03", stepId: resumeStepId, stepIndex: 1 });

  checkpointStore.failNextCleanup = true;
  const afterProcessRestartDurable = new DurableController(runnerStore, adoptionStore);
  const afterProcessRestartVh13 = new HumanCheckpointResumeController(checkpointStore, clock);
  const afterProcessRestart = runnerWith(
    afterProcessRestartDurable,
    modules,
    afterProcessRestartVh13.consumeResume.bind(afterProcessRestartVh13),
    { definitions: [definition] },
  );
  const cleanupInterrupted = await afterProcessRestart.resume({
    run,
    checkpointId: checkpoint.checkpointId,
    currentDevice: device,
    expectedRevision: ready.state.revision,
  });
  assert.equal(cleanupInterrupted.status, "PAUSED-HUMAN-ACTION");
  assert.equal(cleanupInterrupted.state.lifecycle.kind, "running");
  assert.equal(cleanupInterrupted.state.currentStep?.stepId, resumeStepId);
  assert.ok(cleanupInterrupted.state.revision > ready.state.revision);

  const cleanupRetryDurable = new DurableController(runnerStore, adoptionStore);
  const cleanupRetryVh13 = new HumanCheckpointResumeController(checkpointStore, clock);
  const cleanupRetry = runnerWith(
    cleanupRetryDurable,
    modules,
    cleanupRetryVh13.consumeResume.bind(cleanupRetryVh13),
    { definitions: [definition] },
  );
  const resumed = await cleanupRetry.resume({
    run,
    checkpointId: checkpoint.checkpointId,
    currentDevice: device,
    expectedRevision: cleanupInterrupted.state.revision,
  });
  assert.equal(resumed.status, "RUNNING");
  assert.equal(resumed.state.revision, cleanupInterrupted.state.revision,
    "cleanup retry accepts equal revision only after exact C adoption proof");
  assert.equal(checkpointStore.value, null);
  const journal = adoptionStore.value as { readonly entries?: readonly unknown[] };
  assert.equal(journal.entries?.length, 1);
});
