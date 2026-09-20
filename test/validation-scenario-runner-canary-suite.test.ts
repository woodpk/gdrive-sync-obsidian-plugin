import assert from "node:assert/strict";
import test from "node:test";
import {
  humanCheckpoint,
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import {
  VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
  type ValidationRunnerPersistentState,
} from "../src/validation/scenario-runner-contracts";
import {
  VALIDATION_SCENARIO_RUNNER_CANARY_CAPABILITIES,
  VALIDATION_SCENARIO_RUNNER_CANARY_CASES,
} from "./validation-scenario-runner-canary-suite";
import {
  CanaryMemoryDurableStatePort,
  CanaryScriptedModuleFacade,
  canaryEvidenceRef,
} from "./validation-scenario-runner-canary-support";

test("VH14-E publishes one reusable contract case for each required canary capability", () => {
  assert.equal(VALIDATION_SCENARIO_RUNNER_CANARY_CAPABILITIES.length, 11);
  assert.deepEqual(
    VALIDATION_SCENARIO_RUNNER_CANARY_CASES.map(canaryCase => canaryCase.capability),
    VALIDATION_SCENARIO_RUNNER_CANARY_CAPABILITIES,
  );
  assert.equal(new Set(VALIDATION_SCENARIO_RUNNER_CANARY_CAPABILITIES).size, 11);
});

test("VH14-E module fake accepts only explicitly scripted orchestration results", async () => {
  const modules = new CanaryScriptedModuleFacade();
  const run = validationRunIdentity("vh14-e-fixture-module", "C03");
  const step = {
    stepId: validationStepId("fixture-operation"),
    module: "fixture-manager" as const,
    operation: "fixture-operation",
    requiredCompletionProof: "operation-complete" as const,
  };
  await assert.rejects(() => modules.executeStep({ run, step }), /No canary module result scripted/);
  modules.queueStep(step.operation, {
    status: "completed",
    proof: "operation-complete",
    evidenceRefs: [canaryEvidenceRef("fixture-operation")],
  });
  assert.equal((await modules.executeStep({ run, step })).status, "completed");
  assert.deepEqual(modules.stepCalls.map(call => call.step.module), ["fixture-manager", "fixture-manager"]);
});

test("VH14-E durable fake adopts the exact VH13 tuple before exposing the resume step", async () => {
  const state = new CanaryMemoryDurableStatePort();
  const run = validationRunIdentity("vh14-e-fixture-adoption", "F03");
  const checkpoint = humanCheckpoint({
    checkpointId: "vh14-e-fixture-checkpoint",
    run,
    deviceId: "iphone-canary",
    requestedAction: "restart-obsidian",
    instruction: "Restart Obsidian for the isolated canary.",
  });
  const resumeStepId = validationStepId("fixture-resume-step");
  const persisted: ValidationRunnerPersistentState = {
    schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
    revision: 2,
    run,
    execution: { kind: "single", scenarioId: "F03" },
    lifecycle: {
      kind: "resumable",
      resume: {
        state: "resumable",
        checkpoint,
        acknowledgement: "acknowledged",
        verification: "observed",
        resumeStepId,
      },
    },
    currentStep: {
      scenarioId: "F03",
      stepId: validationStepId("fixture-human-step"),
      stepIndex: 0,
    },
    completedStepIds: [],
    completedScenarioIds: [],
    proofs: { verificationPassed: false, evidenceRecorded: false },
  };
  state.inject(persisted);
  const adoption = { run, checkpointId: checkpoint.checkpointId, resumeStepId };
  await state.commitResume(adoption);
  await state.commitResume(adoption);
  const adopted = await state.load() as ValidationRunnerPersistentState;
  assert.equal(adopted.currentStep?.stepId, resumeStepId);
  assert.equal(adopted.lifecycle.kind, "running");
  assert.deepEqual(state.adoptions, [adoption]);
  assert.deepEqual(state.events.filter(event => event.startsWith("state:adoption")), [
    "state:adoption:start",
    "state:adoption:durable",
    "state:adoption:start",
    "state:adoption:idempotent",
  ]);
});
