import assert from "node:assert/strict";
import test from "node:test";
import type { HumanCheckpointResumeCommitPort } from "../src/validation/human-checkpoint-resume-controller";
import {
  VALIDATION_RUNNER_COMPLETION_PROOFS,
  VALIDATION_RUNNER_MODULE_IDS,
  VALIDATION_RUNNER_PREREQUISITE_STATUSES,
  VALIDATION_RUNNER_SCENARIO_IDS,
  VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
  VALIDATION_RUNNER_STOP_REASON_KINDS,
  type ValidationRunnerDurableStatePort,
  type ValidationRunnerModuleFacade,
  type ValidationRunnerPersistentState,
  type ValidationRunnerResult,
  type ValidationRunnerResumeAdoptionInput,
  type ValidationRunnerScenarioDefinition,
  type ValidationScenarioRunner,
  type ValidationScenarioRunnerDependencies,
  type ValidationScenarioRunnerFactory,
} from "../src/validation/scenario-runner-contracts";
import {
  VALIDATION_SCENARIO_IDS,
  humanCheckpoint,
  validationDeviceIdentity,
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";

const run = validationRunIdentity("vh14-a-contract-run", "C03");
const stepId = validationStepId("c03-observe-plan");

function runningState(revision = 1): ValidationRunnerPersistentState {
  return {
    schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
    revision,
    run,
    execution: { kind: "single", scenarioId: "C03" },
    lifecycle: { kind: "running", stepId },
    currentStep: { scenarioId: "C03", stepId, stepIndex: 0 },
    completedStepIds: [],
    completedScenarioIds: [],
    proofs: { verificationPassed: false, evidenceRecorded: false },
  };
}

class MemoryDurableRunnerState implements ValidationRunnerDurableStatePort {
  value: ValidationRunnerPersistentState | null = null;
  readonly adoptions: ValidationRunnerResumeAdoptionInput[] = [];

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    const actualRevision = this.value?.revision ?? null;
    if (actualRevision !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    return true;
  }

  async commitResume(input: ValidationRunnerResumeAdoptionInput): Promise<void> {
    this.adoptions.push(input);
  }
}

test("VH14-A runner scenario enumeration reuses the exact frozen H0 C03-F03 tuple", () => {
  assert.equal(VALIDATION_RUNNER_SCENARIO_IDS, VALIDATION_SCENARIO_IDS);
  assert.deepEqual(VALIDATION_RUNNER_SCENARIO_IDS, [
    "C03", "C04", "C05", "C06", "C07", "C08", "C09",
    "D01", "D02", "D03", "D04", "D05", "D06",
    "E01", "E02", "E03", "E04", "E05", "E06", "E07",
    "F01", "F02", "F03",
  ]);
});

test("VH14-A freezes only approved module identities, completion proofs, prerequisites, and stop reasons", () => {
  assert.deepEqual(VALIDATION_RUNNER_MODULE_IDS, [
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
  ]);
  assert.deepEqual(VALIDATION_RUNNER_COMPLETION_PROOFS, [
    "operation-complete",
    "verification-passed",
    "evidence-recorded",
  ]);
  assert.deepEqual(VALIDATION_RUNNER_PREREQUISITE_STATUSES, ["satisfied", "failed", "blocked"]);
  assert.ok(VALIDATION_RUNNER_STOP_REASON_KINDS.includes("completion-proof-missing"));
  assert.ok(VALIDATION_RUNNER_STOP_REASON_KINDS.includes("resume-adoption-failed"));
});

test("VH14-A durable state uses revision CAS and implements the exact VH13 resume-adoption port", async () => {
  const durable = new MemoryDurableRunnerState();
  const vh13Port: HumanCheckpointResumeCommitPort = durable;
  const state = runningState();

  assert.equal(await durable.compareAndSet(null, state), true);
  assert.equal(await durable.compareAndSet(null, { ...state, revision: 2 }), false);
  assert.deepEqual(await durable.load(), state);

  const adoption: ValidationRunnerResumeAdoptionInput = {
    run,
    checkpointId: humanCheckpoint({
      checkpointId: "c03-checkpoint",
      run,
      deviceId: "iphone-a",
      requestedAction: "restart-obsidian",
      instruction: "Restart Obsidian.",
    }).checkpointId,
    resumeStepId: validationStepId("c03-resume"),
  };
  await vh13Port.commitResume(adoption);
  assert.deepEqual(durable.adoptions, [adoption]);
});

test("VH14-A composition seams support all runner outcomes without granting module behavior", async () => {
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C03",
    prerequisiteIds: ["paired-devices"],
    steps: [{
      stepId,
      module: "production-path-driver",
      operation: "observe-plan",
      requiredCompletionProof: "operation-complete",
    }],
  };

  const modules: ValidationRunnerModuleFacade = {
    evaluatePrerequisites: async input => input.prerequisiteIds.map(prerequisiteId => ({
      prerequisiteId,
      status: "satisfied",
      summary: "supplied by approved module facade",
      evidenceRefs: [],
    })),
    executeStep: async input => ({
      status: "completed",
      proof: input.step.requiredCompletionProof,
      evidenceRefs: [],
    }),
  };

  const durable = new MemoryDurableRunnerState();
  const dependencies: ValidationScenarioRunnerDependencies = {
    state: durable,
    modules,
    humanCheckpoints: {
      consumeResume: async () => ({ status: "empty" }),
    },
  };

  const checkpoint = humanCheckpoint({
    checkpointId: "c03-human-action",
    run,
    deviceId: "iphone-a",
    requestedAction: "restart-obsidian",
    instruction: "Restart Obsidian.",
  });
  const resume = {
    state: "resumable" as const,
    checkpoint,
    acknowledgement: "acknowledged",
    verification: "observed",
    resumeStepId: validationStepId("c03-resume"),
  };
  const reason = { kind: "module-failed" as const, summary: "delegated failure", evidenceRefs: [] };
  const state = runningState();
  const outcomes: readonly ValidationRunnerResult[] = [
    { status: "RUNNING", state },
    { status: "PASS", state },
    { status: "FAIL", state, reason },
    { status: "BLOCKED", state, reason: { ...reason, kind: "module-blocked" } },
    { status: "PAUSED-HUMAN-ACTION", state, checkpoint },
    { status: "RESUMABLE", state, resume },
  ];

  const factory: ValidationScenarioRunnerFactory = deps => {
    const runner: ValidationScenarioRunner = {
      enumerateScenarioIds: () => VALIDATION_RUNNER_SCENARIO_IDS,
      current: async () => state,
      startScenario: async request => {
        const prerequisites = await deps.modules.evaluatePrerequisites({
          run: request.run,
          prerequisiteIds: request.definition.prerequisiteIds,
        });
        assert.equal(prerequisites[0]?.status, "satisfied");
        return { status: "RUNNING", state };
      },
      startSuite: async () => ({ status: "RUNNING", state }),
      advance: async () => ({ status: "PASS", state }),
      resume: async request => {
        await deps.humanCheckpoints.consumeResume(
          request.run,
          request.checkpointId,
          request.currentDevice,
          deps.state,
        );
        return { status: "RUNNING", state };
      },
    };
    return runner;
  };

  const runner = factory(dependencies);
  assert.deepEqual(runner.enumerateScenarioIds(), VALIDATION_SCENARIO_IDS);
  assert.equal((await runner.startScenario({ run, definition })).status, "RUNNING");
  assert.deepEqual(outcomes.map(outcome => outcome.status), [
    "RUNNING", "PASS", "FAIL", "BLOCKED", "PAUSED-HUMAN-ACTION", "RESUMABLE",
  ]);

  const device = validationDeviceIdentity("iphone-a", "iphone");
  assert.equal(device.deviceId, checkpoint.deviceId);
});

if (false) {
  // @ts-expect-error Frozen H0 scenario vocabulary excludes pre-C03 scenarios.
  const unsupportedScenario: (typeof VALIDATION_RUNNER_SCENARIO_IDS)[number] = "C02";
  // @ts-expect-error Runner delegation cannot name an unapproved second synchronization engine.
  const unsupportedModule: (typeof VALIDATION_RUNNER_MODULE_IDS)[number] = "alternate-sync-engine";
  void unsupportedScenario;
  void unsupportedModule;
}
