import { IndexedDbStateByteStorage } from "../state/indexeddb-state-storage";
import type {
  ValidationPlanExecutionAuthorization,
  ValidationProductionDriverResult,
} from "./driver-plan-fault-verifier-contracts";
import {
  ValidationProductionPathDriver,
  type ValidationProductionRuntimePort,
} from "./production-path-driver";
import {
  VALIDATION_RUNNER_MODULE_IDS,
  VALIDATION_RUNNER_SCENARIO_IDS,
  type ValidationRunnerHumanCheckpointResumePort,
  type ValidationRunnerPersistentState,
  type ValidationRunnerResult,
  type ValidationRunnerScenarioDefinition,
  type ValidationRunnerStateStore,
} from "./scenario-runner-contracts";
import {
  type ValidationRunnerApprovedModuleDelegate,
  type ValidationRunnerApprovedModuleDelegates,
  type ValidationRunnerModuleId,
  type ValidationRunnerPrerequisiteDelegate,
} from "./scenario-runner-module-adapter";
import {
  type ValidationRunnerResumeAdoptionJournal,
  type ValidationRunnerResumeAdoptionStore,
} from "./scenario-runner-durable-state";
import { composeValidationScenarioRunner, type IntegratedValidationScenarioRunner } from "./scenario-runner";
import {
  isValidationScenarioId,
  validationRunIdentity,
  type ValidationDeviceIdentity,
  type ValidationScenarioId,
} from "./run-sandbox-checkpoint-contracts";

export type ValidationModeActionResult =
  | { readonly status: "disabled"; readonly reason: string }
  | { readonly status: "unavailable"; readonly reason: string }
  | { readonly status: "runner"; readonly result: ValidationRunnerResult };

export type ValidationModeModuleOverrides = Partial<
  Record<ValidationRunnerModuleId, ValidationRunnerApprovedModuleDelegate>
>;

export interface ValidationModeRuntimeOptions {
  readonly productionRuntime: ValidationProductionRuntimePort;
  readonly definitions?: readonly ValidationRunnerScenarioDefinition[];
  readonly stateStore?: ValidationRunnerStateStore;
  readonly resumeAdoptionStore?: ValidationRunnerResumeAdoptionStore;
  readonly prerequisites?: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides?: ValidationModeModuleOverrides;
  readonly humanCheckpoints?: ValidationRunnerHumanCheckpointResumePort;
  readonly currentDevice?: () => ValidationDeviceIdentity | undefined;
  readonly createRunId?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function revisionOf(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0) {
    throw new Error("Validation durable state has no valid revision.");
  }
  return Number(value.revision);
}

class IndexedDbValidationJsonCasStore<T extends { readonly revision: number }> {
  private readonly storage: IndexedDbStateByteStorage;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  constructor(databaseName: string) {
    this.storage = new IndexedDbStateByteStorage(databaseName);
  }

  async load(): Promise<unknown> {
    const bytes = await this.storage.read();
    if (bytes === undefined) return null;
    return JSON.parse(this.decoder.decode(bytes)) as unknown;
  }

  async compareAndSet(expectedRevision: number | null, next: T | null): Promise<boolean> {
    const currentBytes = await this.storage.read();
    const current = currentBytes === undefined
      ? null
      : JSON.parse(this.decoder.decode(currentBytes)) as unknown;
    if (revisionOf(current) !== expectedRevision) return false;
    const compareAndSwap = this.storage.compareAndSwap;
    if (!compareAndSwap) throw new Error("Validation state storage does not provide atomic compare-and-swap.");
    const replacement = this.encoder.encode(JSON.stringify(next));
    return await compareAndSwap.call(this.storage, currentBytes, replacement);
  }
}

function defaultPrerequisites(): ValidationRunnerPrerequisiteDelegate {
  return {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "This validation prerequisite has not been bound by an installed scenario package.",
        evidenceRefs: [],
      }));
    },
  };
}

function defaultHumanCheckpoints(): ValidationRunnerHumanCheckpointResumePort {
  return {
    async consumeResume() {
      return { status: "empty" };
    },
  };
}

function blockedModule(moduleId: ValidationRunnerModuleId): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute() {
      return {
        status: "blocked",
        summary: `${moduleId} runtime authority is not bound by this H6B build.`,
        evidenceRefs: [],
      };
    },
  };
}

function productionFailure(
  result: Exclude<ValidationProductionDriverResult, { readonly status: "plan-observed" | "request-accepted" }>,
): ReturnType<ValidationRunnerApprovedModuleDelegate["execute"]> {
  const summary = result.status === "no-plan-observed" ? result.reason : result.reason;
  return Promise.resolve({
    status: result.status === "request-failed" ? "failed" : "blocked",
    summary,
    evidenceRefs: [],
  });
}

function productionDelegate(driver: ValidationProductionPathDriver): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      let result: ValidationProductionDriverResult;
      switch (request.operation) {
        case "preview-manual":
          result = await driver.dispatch({ kind: "preview-manual", run: request.run, stepId: request.stepId });
          break;
        case "preview-verify-reconcile":
          result = await driver.dispatch({ kind: "preview-verify-reconcile", run: request.run, stepId: request.stepId });
          break;
        case "run-automatic": {
          const trigger = isRecord(request.input) ? request.input.trigger : undefined;
          if (trigger !== "startup-resume" && trigger !== "local-change" && trigger !== "periodic") {
            return { status: "blocked", summary: "run-automatic requires an approved automatic trigger.", evidenceRefs: [] };
          }
          result = await driver.dispatch({ kind: "run-automatic", run: request.run, stepId: request.stepId, trigger });
          break;
        }
        case "execute-asserted-plan": {
          const authorization = isRecord(request.input) ? request.input.authorization : undefined;
          if (!isRecord(authorization) || authorization.executionAuthorized !== true) {
            return { status: "blocked", summary: "execute-asserted-plan requires an asserted plan authorization.", evidenceRefs: [] };
          }
          result = await driver.dispatch({
            kind: "execute-asserted-plan",
            run: request.run,
            stepId: request.stepId,
            authorization: authorization as unknown as ValidationPlanExecutionAuthorization,
          });
          break;
        }
        case "cancel-active-sync":
          result = await driver.dispatch({ kind: "cancel-active-sync", run: request.run, stepId: request.stepId });
          break;
        default:
          return {
            status: "blocked",
            summary: `Unsupported production-path validation operation: ${request.operation}`,
            evidenceRefs: [],
          };
      }

      if (result.status === "plan-observed" || result.status === "request-accepted") {
        return { status: "completed", evidenceRefs: [] };
      }
      return await productionFailure(result);
    },
  };
}

function buildModules(
  driver: ValidationProductionPathDriver,
  overrides: ValidationModeModuleOverrides | undefined,
): ValidationRunnerApprovedModuleDelegates {
  if (overrides?.["production-path-driver"]) {
    throw new Error("The production-path-driver runtime binding is fixed and cannot be overridden.");
  }
  const modules = Object.fromEntries(
    VALIDATION_RUNNER_MODULE_IDS.map(moduleId => [moduleId, blockedModule(moduleId)]),
  ) as unknown as Record<ValidationRunnerModuleId, ValidationRunnerApprovedModuleDelegate>;
  modules["production-path-driver"] = productionDelegate(driver);
  for (const [moduleId, delegate] of Object.entries(overrides ?? {})) {
    if (!delegate) continue;
    modules[moduleId as ValidationRunnerModuleId] = delegate;
  }
  return modules as ValidationRunnerApprovedModuleDelegates;
}

function defaultRunId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return `vh15:${random ?? `${Date.now()}:${Math.random().toString(16).slice(2)}`}`;
}

/**
 * Validation-only runtime gate.
 *
 * Ordinary product synchronization owns no reference to this class. The H6A
 * runner, its state stores, and all module delegates are constructed lazily
 * only after explicit activation. Disabling validation mode drops the live
 * harness composition without deleting its device-local durable checkpoint.
 */
export class ValidationModeRuntime {
  private active = false;
  private composition?: IntegratedValidationScenarioRunner;
  private readonly definitions = new Map<ValidationScenarioId, ValidationRunnerScenarioDefinition>();

  constructor(private readonly options: ValidationModeRuntimeOptions) {
    for (const definition of options.definitions ?? []) {
      if (this.definitions.has(definition.scenarioId)) {
        throw new Error(`Duplicate validation scenario definition: ${definition.scenarioId}`);
      }
      this.definitions.set(definition.scenarioId, definition);
    }
  }

  enabled(): boolean {
    return this.active;
  }

  setEnabled(enabled: boolean): void {
    this.active = enabled;
    if (!enabled) this.composition = undefined;
  }

  scenarioIds(): readonly ValidationScenarioId[] {
    return this.active ? VALIDATION_RUNNER_SCENARIO_IDS : [];
  }

  installedScenarioIds(): readonly ValidationScenarioId[] {
    return this.active ? Object.freeze([...this.definitions.keys()]) : [];
  }

  async startScenario(scenarioId: string): Promise<ValidationModeActionResult> {
    if (!this.active) return { status: "disabled", reason: "Validation mode is disabled." };
    if (!isValidationScenarioId(scenarioId)) {
      return { status: "unavailable", reason: `Unsupported Phase 6 validation scenario: ${scenarioId}` };
    }
    const definition = this.definitions.get(scenarioId);
    if (!definition) {
      return {
        status: "unavailable",
        reason: `Scenario ${scenarioId} is not installed in this H6B build; scenario packages H7-H10 own executable definitions.`,
      };
    }
    const run = validationRunIdentity((this.options.createRunId ?? defaultRunId)(), scenarioId);
    const result = await this.harness().runner.startScenario({ run, definition });
    return await this.drive(result);
  }

  async resumeCurrent(): Promise<ValidationModeActionResult> {
    if (!this.active) return { status: "disabled", reason: "Validation mode is disabled." };
    const runner = this.harness().runner;
    const current = await runner.current();
    if (!current) return { status: "unavailable", reason: "No durable validation scenario is available to resume." };
    if (current.lifecycle.kind === "terminal") {
      return { status: "unavailable", reason: "The durable validation scenario is already terminal." };
    }

    if (current.lifecycle.kind === "paused-human-action" || current.lifecycle.kind === "resumable") {
      const currentDevice = this.options.currentDevice?.();
      if (!currentDevice) {
        return { status: "unavailable", reason: "Current validation device identity is unavailable." };
      }
      const checkpoint = current.lifecycle.kind === "paused-human-action"
        ? current.lifecycle.checkpoint
        : current.lifecycle.resume.checkpoint;
      const resumed = await runner.resume({
        run: current.run,
        checkpointId: checkpoint.checkpointId,
        currentDevice,
        expectedRevision: current.revision,
      });
      return await this.drive(resumed);
    }

    const advanced = await runner.advance({
      run: current.run,
      expectedRevision: current.revision,
    });
    return await this.drive(advanced);
  }

  private harness(): IntegratedValidationScenarioRunner {
    if (!this.active) throw new Error("Validation mode is disabled.");
    if (this.composition) return this.composition;

    const stateStore = this.options.stateStore
      ?? new IndexedDbValidationJsonCasStore<ValidationRunnerPersistentState>(
        "brain-google-drive-sync-validation-runner-v1",
      );
    const resumeAdoptionStore = this.options.resumeAdoptionStore
      ?? new IndexedDbValidationJsonCasStore<ValidationRunnerResumeAdoptionJournal>(
        "brain-google-drive-sync-validation-resume-adoptions-v1",
      );
    const driver = new ValidationProductionPathDriver(this.options.productionRuntime);

    this.composition = composeValidationScenarioRunner({
      stateStore,
      resumeAdoptionStore,
      prerequisites: this.options.prerequisites ?? defaultPrerequisites(),
      modules: buildModules(driver, this.options.moduleOverrides),
      humanCheckpoints: this.options.humanCheckpoints ?? defaultHumanCheckpoints(),
      definitions: [...this.definitions.values()],
    });
    return this.composition;
  }

  private async drive(initial: ValidationRunnerResult): Promise<ValidationModeActionResult> {
    let result = initial;
    for (let transitions = 0; transitions < 1024 && result.status === "RUNNING"; transitions += 1) {
      result = await this.harness().runner.advance({
        run: result.state.run,
        expectedRevision: result.state.revision,
      });
    }
    if (result.status === "RUNNING") {
      return {
        status: "unavailable",
        reason: "Validation scenario exceeded the bounded H6B orchestration transition limit.",
      };
    }
    return { status: "runner", result };
  }
}
