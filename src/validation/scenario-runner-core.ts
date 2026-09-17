import {
  VALIDATION_RUNNER_SCENARIO_IDS,
  VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
  type ValidationRunnerPersistentState,
  type ValidationRunnerResult,
  type ValidationRunnerScenarioDefinition,
  type ValidationRunnerStartScenarioRequest,
  type ValidationRunnerStartSuiteRequest,
  type ValidationScenarioRunner,
  type ValidationScenarioRunnerDependencies,
} from "./scenario-runner-contracts";
import { validationRunIdentity } from "./run-sandbox-checkpoint-contracts";

/**
 * Deterministic H6A lifecycle core. Approved modules and durable storage are
 * supplied through the frozen internal runner contracts.
 */
export class ValidationScenarioRunnerCore implements ValidationScenarioRunner {
  private readonly definitionsByRun = new Map<string, readonly ValidationRunnerScenarioDefinition[]>();

  constructor(private readonly dependencies: ValidationScenarioRunnerDependencies) {}

  enumerateScenarioIds(): typeof VALIDATION_RUNNER_SCENARIO_IDS {
    return VALIDATION_RUNNER_SCENARIO_IDS;
  }

  async current(): Promise<ValidationRunnerPersistentState | null> {
    return await this.dependencies.state.load() as ValidationRunnerPersistentState | null;
  }

  async startScenario(request: ValidationRunnerStartScenarioRequest): Promise<ValidationRunnerResult> {
    this.definitionsByRun.set(String(request.run.runId), [request.definition]);
    return this.start(request, {
      kind: "single",
      scenarioId: request.definition.scenarioId,
    });
  }

  async startSuite(request: ValidationRunnerStartSuiteRequest): Promise<ValidationRunnerResult> {
    const first = request.suite.scenarios[0];
    if (!first) throw new Error("Validation runner suites must contain at least one scenario.");
    this.definitionsByRun.set(String(request.runId), request.suite.scenarios);
    return this.start({
      run: validationRunIdentity(String(request.runId), first.scenarioId),
      definition: first,
    }, {
      kind: "suite",
      suiteId: request.suite.suiteId,
      scenarioIds: request.suite.scenarios.map(definition => definition.scenarioId),
      currentScenarioIndex: 0,
    });
  }

  async advance(): Promise<ValidationRunnerResult> {
    throw new Error("Runner lifecycle behavior is added in the next B checkpoint.");
  }

  async resume(): Promise<ValidationRunnerResult> {
    throw new Error("Runner resume behavior is added in the next B checkpoint.");
  }

  private async start(
    request: ValidationRunnerStartScenarioRequest,
    execution: ValidationRunnerPersistentState["execution"],
  ): Promise<ValidationRunnerResult> {
    const firstStep = request.definition.steps[0];
    if (!firstStep) throw new Error("Validation runner scenarios must contain at least one step.");
    const state: ValidationRunnerPersistentState = {
      schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
      revision: 1,
      run: request.run,
      execution,
      lifecycle: { kind: "running", stepId: firstStep.stepId },
      currentStep: {
        scenarioId: request.definition.scenarioId,
        stepId: firstStep.stepId,
        stepIndex: 0,
      },
      completedStepIds: [],
      completedScenarioIds: [],
      proofs: { verificationPassed: false, evidenceRecorded: false },
    };
    if (!await this.dependencies.state.compareAndSet(null, state)) {
      throw new Error("Validation runner state changed while starting.");
    }
    return { status: "RUNNING", state };
  }
}

export function createValidationScenarioRunnerCore(
  dependencies: ValidationScenarioRunnerDependencies,
): ValidationScenarioRunner {
  return new ValidationScenarioRunnerCore(dependencies);
}
