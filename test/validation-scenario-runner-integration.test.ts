import assert from "node:assert/strict";
import test from "node:test";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import {
  VALIDATION_RUNNER_MODULE_IDS,
  type ValidationRunnerPersistentState,
  type ValidationRunnerScenarioDefinition,
  type ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import { ValidationScenarioRunnerCore } from "../src/validation/scenario-runner-core";
import {
  ValidationRunnerDurableStateController,
  type ValidationRunnerResumeAdoptionJournal,
  type ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  ValidationRunnerModuleAdapter,
  type ValidationRunnerApprovedModuleDelegate,
  type ValidationRunnerApprovedModuleDelegates,
} from "../src/validation/scenario-runner-module-adapter";
import {
  composeValidationScenarioRunner,
  createRestartedValidationScenarioRunner,
  createValidationScenarioRunner,
} from "../src/validation/scenario-runner";
import {
  registerValidationScenarioRunnerCanarySuite,
  VALIDATION_SCENARIO_RUNNER_CANARY_CASES,
} from "./validation-scenario-runner-canary-suite";

function revisionOf(value: unknown): number | null {
  if (value === null || value === undefined || typeof value !== "object") return null;
  const revision = (value as { readonly revision?: unknown }).revision;
  return typeof revision === "number" ? revision : null;
}

class MemoryRunnerStateStore implements ValidationRunnerStateStore {
  private value: ValidationRunnerPersistentState | null = null;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    if (revisionOf(this.value) !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    return true;
  }
}

class MemoryResumeAdoptionStore implements ValidationRunnerResumeAdoptionStore {
  private value: ValidationRunnerResumeAdoptionJournal | null = null;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerResumeAdoptionJournal,
  ): Promise<boolean> {
    if (revisionOf(this.value) !== expectedRevision) return false;
    this.value = structuredClone(next);
    return true;
  }
}

function createRealDurableStatePort(): ValidationRunnerDurableStateController {
  return new ValidationRunnerDurableStateController(
    new MemoryRunnerStateStore(),
    new MemoryResumeAdoptionStore(),
  );
}

assert.equal(
  VALIDATION_SCENARIO_RUNNER_CANARY_CASES.length,
  11,
  "Package E must expose exactly 11 generic orchestration canary cases",
);

registerValidationScenarioRunnerCanarySuite({
  label: "VH14 integrated B+C runner",
  factory: createValidationScenarioRunner,
  createDurableStatePort: createRealDurableStatePort,
  createRestartedRunner: ({ dependencies, definition }) =>
    createRestartedValidationScenarioRunner(dependencies, [definition]),
});

test("VH14 production composition wires B + C + D without manufacturing proof authority", async () => {
  const calls: string[] = [];
  const delegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      calls.push(request.operation);
      return {
        status: "completed",
        evidenceRefs: [validationEvidenceRef(`vh14-i:${request.operation}`)],
      };
    },
  };
  const modules = Object.fromEntries(
    VALIDATION_RUNNER_MODULE_IDS.map(moduleId => [moduleId, delegate]),
  ) as unknown as ValidationRunnerApprovedModuleDelegates;

  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C03",
    prerequisiteIds: [],
    steps: [
      {
        stepId: validationStepId("integrated-operation"),
        module: "production-path-driver",
        operation: "integrated-operation",
        requiredCompletionProof: "operation-complete",
      },
      {
        stepId: validationStepId("integrated-verification"),
        module: "state-convergence-verifier",
        operation: "integrated-verification",
        requiredCompletionProof: "verification-passed",
      },
      {
        stepId: validationStepId("integrated-evidence"),
        module: "scenario-evidence-recorder",
        operation: "integrated-evidence",
        requiredCompletionProof: "evidence-recorded",
      },
    ],
  };

  const composition = composeValidationScenarioRunner({
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites: {
      async evaluate(input) {
        return input.prerequisiteIds.map(prerequisiteId => ({
          prerequisiteId,
          status: "satisfied" as const,
          summary: "satisfied",
          evidenceRefs: [],
        }));
      },
    },
    modules,
    humanCheckpoints: {
      async consumeResume() {
        throw new Error("No human checkpoint is expected in this composition test.");
      },
    },
    definitions: [definition],
  });

  assert.ok(composition.runner instanceof ValidationScenarioRunnerCore);
  assert.ok(composition.state instanceof ValidationRunnerDurableStateController);
  assert.ok(composition.modules instanceof ValidationRunnerModuleAdapter);

  const run = validationRunIdentity("vh14-i-composition", "C03");
  let result = await composition.runner.startScenario({ run, definition });
  assert.equal(result.status, "RUNNING");

  result = await composition.runner.advance({ run, expectedRevision: result.state.revision });
  assert.equal(result.status, "RUNNING");
  result = await composition.runner.advance({ run, expectedRevision: result.state.revision });
  assert.equal(result.status, "RUNNING");
  result = await composition.runner.advance({ run, expectedRevision: result.state.revision });

  assert.equal(result.status, "PASS");
  assert.deepEqual(calls, [
    "integrated-operation",
    "integrated-verification",
    "integrated-evidence",
  ]);
  assert.equal(result.state.proofs.verificationPassed, true);
  assert.equal(result.state.proofs.evidenceRecorded, true);
});
