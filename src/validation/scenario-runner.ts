import {
  createValidationScenarioRunnerCore,
} from "./scenario-runner-core";
import {
  ValidationRunnerDurableStateController,
  type ValidationRunnerResumeAdoptionStore,
} from "./scenario-runner-durable-state";
import {
  createValidationRunnerModuleAdapter,
  type ValidationRunnerModuleAdapterOptions,
} from "./scenario-runner-module-adapter";
import type {
  ValidationRunnerHumanCheckpointResumePort,
  ValidationRunnerModuleFacade,
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStateStore,
  ValidationScenarioRunner,
  ValidationScenarioRunnerDependencies,
  ValidationScenarioRunnerFactory,
} from "./scenario-runner-contracts";

/**
 * Physical and approved-module dependencies for the supported H6A composition.
 * Storage and module behavior stay outside the runner and are supplied by the
 * caller; this module owns composition only.
 */
export interface IntegratedValidationScenarioRunnerOptions {
  readonly stateStore: ValidationRunnerStateStore;
  readonly resumeAdoptionStore: ValidationRunnerResumeAdoptionStore;
  readonly prerequisites: ValidationRunnerModuleAdapterOptions["prerequisites"];
  readonly modules: ValidationRunnerModuleAdapterOptions["modules"];
  readonly humanCheckpoints: ValidationRunnerHumanCheckpointResumePort;
  /** Immutable definitions available to a fresh controller after restart. */
  readonly definitions?: readonly ValidationRunnerScenarioDefinition[];
}

export interface IntegratedValidationScenarioRunner {
  readonly runner: ValidationScenarioRunner;
  readonly state: ValidationRunnerDurableStateController;
  readonly modules: ValidationRunnerModuleFacade;
  readonly dependencies: ValidationScenarioRunnerDependencies;
}

/** Package-A factory seam bound to Package B's accepted lifecycle core. */
export const createValidationScenarioRunner: ValidationScenarioRunnerFactory = dependencies =>
  createValidationScenarioRunnerCore(dependencies);

/**
 * Fresh-process construction path with the canonical immutable definitions
 * rebound explicitly. Durable state remains authoritative in Package C.
 */
export function createRestartedValidationScenarioRunner(
  dependencies: ValidationScenarioRunnerDependencies,
  definitions: readonly ValidationRunnerScenarioDefinition[],
): ValidationScenarioRunner {
  return createValidationScenarioRunnerCore(dependencies, { definitions });
}

/**
 * Supported production composition for VH14 H6A:
 * B lifecycle core + C durable state + D approved-module facade + VH13 resume
 * cleanup authority supplied through its existing narrow port.
 */
export function composeValidationScenarioRunner(
  options: IntegratedValidationScenarioRunnerOptions,
): IntegratedValidationScenarioRunner {
  const state = new ValidationRunnerDurableStateController(
    options.stateStore,
    options.resumeAdoptionStore,
  );
  const modules = createValidationRunnerModuleAdapter({
    prerequisites: options.prerequisites,
    modules: options.modules,
  });
  const dependencies: ValidationScenarioRunnerDependencies = Object.freeze({
    state,
    modules,
    humanCheckpoints: options.humanCheckpoints,
  });
  const runner = createValidationScenarioRunnerCore(
    dependencies,
    options.definitions === undefined ? undefined : { definitions: options.definitions },
  );

  return Object.freeze({ runner, state, modules, dependencies });
}
