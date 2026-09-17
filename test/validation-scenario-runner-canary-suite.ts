import assert from "node:assert/strict";
import test from "node:test";
import type { HumanCheckpointControllerResult } from "../src/validation/human-checkpoint-resume-controller";
import {
  humanCheckpoint,
  humanCheckpointId,
  validationDeviceIdentity,
  validationRunId,
  validationRunIdentity,
  validationStepId,
  type ValidationScenarioId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import {
  VALIDATION_RUNNER_MODULE_IDS,
  VALIDATION_RUNNER_SCENARIO_IDS,
  type ValidationRunnerCompletionProof,
  type ValidationRunnerDelegatedStepResult,
  type ValidationRunnerDurableStatePort,
  type ValidationRunnerPersistentState,
  type ValidationRunnerResult,
  type ValidationRunnerScenarioDefinition,
  type ValidationRunnerStepDefinition,
  type ValidationScenarioRunner,
  type ValidationScenarioRunnerDependencies,
  type ValidationScenarioRunnerFactory,
} from "../src/validation/scenario-runner-contracts";
import {
  CanaryMemoryDurableStatePort,
  CanaryScriptedHumanCheckpointPort,
  CanaryScriptedModuleFacade,
  canaryEvidenceRef,
} from "./validation-scenario-runner-canary-support";

export const VALIDATION_SCENARIO_RUNNER_CANARY_CAPABILITIES = [
  "exact C03-F03 enumeration",
  "deterministic single-scenario advancement",
  "ordered-suite advancement only after allowed terminal result",
  "fail-closed prerequisite handling",
  "unexpected plan/assertion stops before mutation",
  "human-action pause persists checkpoint/current step",
  "RESUMABLE uses durable VH13 adoption ordering",
  "restart reconstruction preserves identity and step",
  "PASS requires verifier and evidence success",
  "terminal failure blocks subsequent execution",
  "module operations use orchestration interfaces",
] as const;

export const VALIDATION_SCENARIO_RUNNER_RESTART_SEAM_NOTE =
  "A persists run/scenario/current-step identity but does not persist the scenario definition or accept a definition registry; deterministic continuation in a fresh controller therefore requires Package I's optional composition-level createRestartedRunner binding.";

export interface ValidationScenarioRunnerCanaryBinding {
  readonly label: string;
  readonly factory: ValidationScenarioRunnerFactory;
  /** Package I should bind Package C here; E's contract-only fallback is local-test support. */
  readonly createDurableStatePort?: () => ValidationRunnerDurableStatePort;
  /**
   * A's factory does not accept a definition registry. Package I may provide a
   * composition-level rebind that gives a fresh controller its canonical
   * definition and thereby enables the continuation half of restart coverage.
   */
  readonly createRestartedRunner?: (input: {
    readonly dependencies: ValidationScenarioRunnerDependencies;
    readonly definition: ValidationRunnerScenarioDefinition;
  }) => ValidationScenarioRunner;
}

interface CanaryCase {
  readonly capability: (typeof VALIDATION_SCENARIO_RUNNER_CANARY_CAPABILITIES)[number];
  run(binding: ValidationScenarioRunnerCanaryBinding): Promise<void>;
}

class ObservedStatePort implements ValidationRunnerDurableStatePort {
  readonly events: string[] = [];
  readonly adoptions: Parameters<ValidationRunnerDurableStatePort["commitResume"]>[0][] = [];

  constructor(private readonly inner: ValidationRunnerDurableStatePort) {}

  load(): Promise<unknown> {
    return this.inner.load();
  }

  compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    return this.inner.compareAndSet(expectedRevision, next);
  }

  async commitResume(input: Parameters<ValidationRunnerDurableStatePort["commitResume"]>[0]): Promise<void> {
    this.events.push("adoption:start");
    await this.inner.commitResume(input);
    this.adoptions.push(structuredClone(input));
    this.events.push("adoption:durable");
  }
}

interface Harness {
  readonly runner: ValidationScenarioRunner;
  readonly dependencies: ValidationScenarioRunnerDependencies;
  readonly state: ObservedStatePort;
  readonly modules: CanaryScriptedModuleFacade;
  readonly human: CanaryScriptedHumanCheckpointPort;
}

function harness(
  binding: ValidationScenarioRunnerCanaryBinding,
  humanHandler?: ConstructorParameters<typeof CanaryScriptedHumanCheckpointPort>[0],
): Harness {
  const state = new ObservedStatePort(
    binding.createDurableStatePort?.() ?? new CanaryMemoryDurableStatePort(),
  );
  const modules = new CanaryScriptedModuleFacade();
  const human = new CanaryScriptedHumanCheckpointPort(humanHandler);
  const dependencies = { state, modules, humanCheckpoints: human };
  return { runner: binding.factory(dependencies), dependencies, state, modules, human };
}

function step(
  operation: string,
  module: ValidationRunnerStepDefinition["module"] = "production-path-driver",
  requiredCompletionProof: ValidationRunnerCompletionProof = "operation-complete",
): ValidationRunnerStepDefinition {
  return {
    stepId: validationStepId(operation),
    module,
    operation,
    requiredCompletionProof,
  };
}

function scenario(
  scenarioId: ValidationScenarioId,
  steps: readonly ValidationRunnerStepDefinition[],
  prerequisiteIds: readonly string[] = [],
): ValidationRunnerScenarioDefinition {
  return { scenarioId, prerequisiteIds, steps };
}

function completed(proof: ValidationRunnerCompletionProof, suffix: string): ValidationRunnerDelegatedStepResult {
  return {
    status: "completed",
    proof,
    evidenceRefs: [canaryEvidenceRef(suffix)],
  };
}

function failed(summary: string): ValidationRunnerDelegatedStepResult {
  return {
    status: "failed",
    reason: {
      kind: "module-failed",
      summary,
      evidenceRefs: [canaryEvidenceRef("delegated-failure")],
    },
  };
}

function assertStatus<Status extends ValidationRunnerResult["status"]>(
  result: ValidationRunnerResult,
  status: Status,
): asserts result is Extract<ValidationRunnerResult, { readonly status: Status }> {
  assert.equal(result.status, status);
}

async function currentState(runner: ValidationScenarioRunner): Promise<ValidationRunnerPersistentState> {
  const state = await runner.current();
  assert.ok(state, "runner must expose the durable current state");
  return state;
}

const cases: readonly CanaryCase[] = [
  {
    capability: "exact C03-F03 enumeration",
    async run(binding) {
      const subject = harness(binding);
      assert.deepEqual(subject.runner.enumerateScenarioIds(), VALIDATION_RUNNER_SCENARIO_IDS);
      assert.deepEqual(subject.runner.enumerateScenarioIds(), [
        "C03", "C04", "C05", "C06", "C07", "C08", "C09",
        "D01", "D02", "D03", "D04", "D05", "D06",
        "E01", "E02", "E03", "E04", "E05", "E06", "E07",
        "F01", "F02", "F03",
      ]);
    },
  },
  {
    capability: "deterministic single-scenario advancement",
    async run(binding) {
      const subject = harness(binding);
      const definition = scenario("C03", [
        step("single-operate"),
        step("single-verify", "state-convergence-verifier", "verification-passed"),
        step("single-evidence", "scenario-evidence-recorder", "evidence-recorded"),
      ]);
      subject.modules
        .queueStep("single-operate", completed("operation-complete", "single-operate"))
        .queueStep("single-verify", completed("verification-passed", "single-verify"))
        .queueStep("single-evidence", completed("evidence-recorded", "single-evidence"));
      const run = validationRunIdentity("vh14-e-single", "C03");

      const started = await subject.runner.startScenario({ run, definition });
      assertStatus(started, "RUNNING");
      assert.equal(started.state.currentStep?.stepId, validationStepId("single-operate"));

      const operated = await subject.runner.advance({ run, expectedRevision: started.state.revision });
      assertStatus(operated, "RUNNING");
      assert.equal(operated.state.currentStep?.stepId, validationStepId("single-verify"));
      const verified = await subject.runner.advance({ run, expectedRevision: operated.state.revision });
      assertStatus(verified, "RUNNING");
      assert.equal(verified.state.currentStep?.stepId, validationStepId("single-evidence"));
      const passed = await subject.runner.advance({ run, expectedRevision: verified.state.revision });
      assertStatus(passed, "PASS");
      assert.deepEqual(subject.modules.stepCalls.map(call => call.step.operation), [
        "single-operate", "single-verify", "single-evidence",
      ]);
    },
  },
  {
    capability: "ordered-suite advancement only after allowed terminal result",
    async run(binding) {
      const subject = harness(binding);
      const first = scenario("C03", [
        step("suite-c03-verify", "state-convergence-verifier", "verification-passed"),
        step("suite-c03-evidence", "scenario-evidence-recorder", "evidence-recorded"),
      ]);
      const second = scenario("C04", [
        step("suite-c04-verify", "state-convergence-verifier", "verification-passed"),
        step("suite-c04-evidence", "scenario-evidence-recorder", "evidence-recorded"),
      ]);
      for (const item of [...first.steps, ...second.steps]) {
        subject.modules.queueStep(item.operation, completed(item.requiredCompletionProof, item.operation));
      }
      const started = await subject.runner.startSuite({
        runId: validationRunId("vh14-e-suite"),
        suite: { suiteId: "ordered-two", scenarios: [first, second] },
      });
      assertStatus(started, "RUNNING");
      assert.equal(started.state.run.scenarioId, "C03");

      const firstVerified = await subject.runner.advance({
        run: started.state.run,
        expectedRevision: started.state.revision,
      });
      assertStatus(firstVerified, "RUNNING");
      assert.equal(firstVerified.state.run.scenarioId, "C03");
      const secondStarted = await subject.runner.advance({
        run: firstVerified.state.run,
        expectedRevision: firstVerified.state.revision,
      });
      assertStatus(secondStarted, "RUNNING");
      assert.equal(secondStarted.state.run.scenarioId, "C04");
      assert.equal(secondStarted.state.execution.kind, "suite");
      if (secondStarted.state.execution.kind === "suite") {
        assert.equal(secondStarted.state.execution.currentScenarioIndex, 1);
      }
      const secondVerified = await subject.runner.advance({
        run: secondStarted.state.run,
        expectedRevision: secondStarted.state.revision,
      });
      const passed = await subject.runner.advance({
        run: secondVerified.state.run,
        expectedRevision: secondVerified.state.revision,
      });
      assertStatus(passed, "PASS");
      assert.deepEqual(subject.modules.stepCalls.map(call => call.run.scenarioId), [
        "C03", "C03", "C04", "C04",
      ]);
    },
  },
  {
    capability: "fail-closed prerequisite handling",
    async run(binding) {
      for (const status of ["failed", "blocked"] as const) {
        const subject = harness(binding);
        subject.modules.setPrerequisite({
          prerequisiteId: "paired-devices",
          status,
          summary: `canary prerequisite ${status}`,
          evidenceRefs: [canaryEvidenceRef(`prerequisite-${status}`)],
        });
        const run = validationRunIdentity(`vh14-e-prerequisite-${status}`, "C03");
        const result = await subject.runner.startScenario({
          run,
          definition: scenario("C03", [step("must-not-run")], ["paired-devices"]),
        });
        assert.equal(result.status, status === "failed" ? "FAIL" : "BLOCKED");
        assert.equal(subject.modules.stepCalls.length, 0);
      }
    },
  },
  {
    capability: "unexpected plan/assertion stops before mutation",
    async run(binding) {
      const subject = harness(binding);
      const run = validationRunIdentity("vh14-e-plan-stop", "C03");
      subject.modules.queueStep("assert-plan", failed("unexpected operation in plan"));
      subject.modules.queueStep("mutate-production", completed("operation-complete", "must-not-run"));
      const started = await subject.runner.startScenario({
        run,
        definition: scenario("C03", [
          step("assert-plan", "plan-assertion-engine"),
          step("mutate-production", "production-path-driver"),
        ]),
      });
      const stopped = await subject.runner.advance({ run, expectedRevision: started.state.revision });
      assertStatus(stopped, "FAIL");
      assert.deepEqual(subject.modules.stepCalls.map(call => call.step.operation), ["assert-plan"]);
    },
  },
  {
    capability: "human-action pause persists checkpoint/current step",
    async run(binding) {
      const subject = harness(binding);
      const run = validationRunIdentity("vh14-e-human-pause", "F03");
      const checkpoint = humanCheckpoint({
        checkpointId: "vh14-e-human-checkpoint",
        run,
        deviceId: "iphone-canary",
        requestedAction: "restart-obsidian",
        instruction: "Restart Obsidian for the isolated canary.",
      });
      subject.modules.queueStep("pause-for-human", {
        status: "paused-human-action",
        checkpoint,
        evidenceRefs: [canaryEvidenceRef("human-pause")],
      });
      const started = await subject.runner.startScenario({
        run,
        definition: scenario("F03", [step("pause-for-human", "human-checkpoint-resume-controller")]),
      });
      const paused = await subject.runner.advance({ run, expectedRevision: started.state.revision });
      assertStatus(paused, "PAUSED-HUMAN-ACTION");
      assert.deepEqual(paused.checkpoint, checkpoint);
      assert.equal(paused.state.currentStep?.stepId, validationStepId("pause-for-human"));
      assert.equal(paused.state.lifecycle.kind, "paused-human-action");
      const persisted = await currentState(subject.runner);
      assert.deepEqual(persisted, paused.state);
    },
  },
  {
    capability: "RESUMABLE uses durable VH13 adoption ordering",
    async run(binding) {
      const adoptedStep = validationStepId("resume-after-human");
      const subject = harness(binding, async input => {
        const checkpointId = humanCheckpointId(input.checkpointId);
        await input.resumeCommit.commitResume({
          run: input.run,
          checkpointId,
          resumeStepId: adoptedStep,
        });
        (input.resumeCommit as ObservedStatePort).events.push("vh13:cleanup-after-adoption");
        return { status: "resumed", checkpointId, resumeStepId: adoptedStep } satisfies HumanCheckpointControllerResult;
      });
      const run = validationRunIdentity("vh14-e-resume", "F03");
      const checkpoint = humanCheckpoint({
        checkpointId: "vh14-e-resumable-checkpoint",
        run,
        deviceId: "iphone-canary",
        requestedAction: "restart-obsidian",
        instruction: "Restart Obsidian for the isolated canary.",
      });
      subject.modules.queueStep("await-resume", {
        status: "resumable",
        resume: {
          state: "resumable",
          checkpoint,
          acknowledgement: "human acknowledged",
          verification: "postcondition observed",
          resumeStepId: adoptedStep,
        },
        evidenceRefs: [canaryEvidenceRef("resumable")],
      });
      const started = await subject.runner.startScenario({
        run,
        definition: scenario("F03", [
          step("await-resume", "human-checkpoint-resume-controller"),
          step("resume-after-human"),
        ]),
      });
      const resumable = await subject.runner.advance({ run, expectedRevision: started.state.revision });
      assertStatus(resumable, "RESUMABLE");
      const resumed = await subject.runner.resume({
        run,
        checkpointId: checkpoint.checkpointId,
        currentDevice: validationDeviceIdentity("iphone-canary", "iphone"),
        expectedRevision: resumable.state.revision,
      });
      assertStatus(resumed, "RUNNING");
      assert.equal(resumed.state.currentStep?.stepId, adoptedStep);
      assert.deepEqual(subject.state.adoptions, [{
        run,
        checkpointId: checkpoint.checkpointId,
        resumeStepId: adoptedStep,
      }]);
      assert.ok(
        subject.state.events.indexOf("adoption:durable")
          < subject.state.events.indexOf("vh13:cleanup-after-adoption"),
        "VH13 cleanup must happen only after durable adoption",
      );
    },
  },
  {
    capability: "restart reconstruction preserves identity and step",
    async run(binding) {
      const subject = harness(binding);
      const definition = scenario("C03", [
        step("restart-operate"),
        step("restart-verify", "state-convergence-verifier", "verification-passed"),
        step("restart-evidence", "scenario-evidence-recorder", "evidence-recorded"),
      ]);
      subject.modules
        .queueStep("restart-operate", completed("operation-complete", "restart-operate"))
        .queueStep("restart-verify", completed("verification-passed", "restart-verify"))
        .queueStep("restart-evidence", completed("evidence-recorded", "restart-evidence"));
      const run = validationRunIdentity("vh14-e-restart", "C03");
      const started = await subject.runner.startScenario({ run, definition });
      const beforeRestart = await subject.runner.advance({
        run,
        expectedRevision: started.state.revision,
      });
      assertStatus(beforeRestart, "RUNNING");

      const fresh = binding.createRestartedRunner?.({
        dependencies: subject.dependencies,
        definition,
      }) ?? binding.factory(subject.dependencies);
      assert.notEqual(fresh, subject.runner);
      const reconstructed = await currentState(fresh);
      assert.deepEqual(reconstructed.run, beforeRestart.state.run);
      assert.deepEqual(reconstructed.execution, beforeRestart.state.execution);
      assert.deepEqual(reconstructed.currentStep, beforeRestart.state.currentStep);

      if (binding.createRestartedRunner) {
        const continued = await fresh.advance({ run, expectedRevision: reconstructed.revision });
        assertStatus(continued, "RUNNING");
        assert.equal(continued.state.currentStep?.stepId, validationStepId("restart-evidence"));
        const passed = await fresh.advance({ run, expectedRevision: continued.state.revision });
        assertStatus(passed, "PASS");
      }
    },
  },
  {
    capability: "PASS requires verifier and evidence success",
    async run(binding) {
      const verifierSubject = harness(binding);
      const verifierRun = validationRunIdentity("vh14-e-missing-verifier", "C03");
      verifierSubject.modules.queueStep(
        "missing-verifier-proof",
        completed("operation-complete", "wrong-verifier-proof"),
      );
      const verifierStarted = await verifierSubject.runner.startScenario({
        run: verifierRun,
        definition: scenario("C03", [
          step("missing-verifier-proof", "state-convergence-verifier", "verification-passed"),
        ]),
      });
      const verifierStopped = await verifierSubject.runner.advance({
        run: verifierRun,
        expectedRevision: verifierStarted.state.revision,
      });
      assertStatus(verifierStopped, "BLOCKED");
      assert.equal(verifierStopped.reason.kind, "completion-proof-missing");

      const evidenceSubject = harness(binding);
      const evidenceRun = validationRunIdentity("vh14-e-missing-evidence", "C03");
      evidenceSubject.modules
        .queueStep("proof-verifier", completed("verification-passed", "verified"))
        .queueStep("missing-evidence-proof", completed("operation-complete", "wrong-evidence-proof"));
      const evidenceStarted = await evidenceSubject.runner.startScenario({
        run: evidenceRun,
        definition: scenario("C03", [
          step("proof-verifier", "state-convergence-verifier", "verification-passed"),
          step("missing-evidence-proof", "scenario-evidence-recorder", "evidence-recorded"),
        ]),
      });
      const verified = await evidenceSubject.runner.advance({
        run: evidenceRun,
        expectedRevision: evidenceStarted.state.revision,
      });
      const evidenceStopped = await evidenceSubject.runner.advance({
        run: evidenceRun,
        expectedRevision: verified.state.revision,
      });
      assertStatus(evidenceStopped, "BLOCKED");
      assert.equal(evidenceStopped.reason.kind, "completion-proof-missing");
    },
  },
  {
    capability: "terminal failure blocks subsequent execution",
    async run(binding) {
      const subject = harness(binding);
      const run = validationRunIdentity("vh14-e-terminal-stop", "C03");
      subject.modules
        .queueStep("terminal-failure", failed("delegated terminal failure"))
        .queueStep("unauthorized-after-failure", completed("operation-complete", "must-not-run"));
      const started = await subject.runner.startScenario({
        run,
        definition: scenario("C03", [step("terminal-failure"), step("unauthorized-after-failure")]),
      });
      const failedResult = await subject.runner.advance({ run, expectedRevision: started.state.revision });
      assertStatus(failedResult, "FAIL");
      const retry = await subject.runner.advance({
        run,
        expectedRevision: failedResult.state.revision,
      });
      assert.ok(retry.status === "FAIL" || retry.status === "BLOCKED");
      assert.deepEqual(subject.modules.stepCalls.map(call => call.step.operation), ["terminal-failure"]);
    },
  },
  {
    capability: "module operations use orchestration interfaces",
    async run(binding) {
      const subject = harness(binding);
      const orderedModules = [
        "safety-sandbox",
        "fixture-manager",
        "production-path-driver",
        "plan-assertion-engine",
        "transport-coverage-faults",
        "state-ambiguity-cancel-fault-hooks",
        "cross-device-coordinator",
        "human-checkpoint-resume-controller",
        "state-convergence-verifier",
        "scenario-evidence-recorder",
      ] as const;
      assert.deepEqual(new Set(orderedModules), new Set(VALIDATION_RUNNER_MODULE_IDS));
      const steps = orderedModules.map((module, index) => step(
        `interface-${index}-${module}`,
        module,
        module === "state-convergence-verifier"
          ? "verification-passed"
          : module === "scenario-evidence-recorder"
            ? "evidence-recorded"
            : "operation-complete",
      ));
      for (const item of steps) {
        subject.modules.queueStep(item.operation, completed(item.requiredCompletionProof, item.operation));
      }
      const run = validationRunIdentity("vh14-e-interface-only", "C03");
      let result = await subject.runner.startScenario({ run, definition: scenario("C03", steps) });
      for (let index = 0; index < steps.length; index += 1) {
        result = await subject.runner.advance({ run, expectedRevision: result.state.revision });
      }
      assertStatus(result, "PASS");
      assert.deepEqual(subject.modules.stepCalls.map(call => call.step.module), orderedModules);
      assert.equal(subject.modules.stepCalls.length, orderedModules.length);
    },
  },
];

export const VALIDATION_SCENARIO_RUNNER_CANARY_CASES: readonly CanaryCase[] = cases;

/** Package I calls this once with the final integrated runner binding. */
export function registerValidationScenarioRunnerCanarySuite(
  binding: ValidationScenarioRunnerCanaryBinding,
): void {
  assert.ok(binding.label.trim().length > 0, "canary binding label must not be blank");
  for (const canaryCase of cases) {
    test(`${binding.label}: ${canaryCase.capability}`, () => canaryCase.run(binding));
  }
}
