import type { ValidationModeModuleOverrides } from "./validation-mode-runtime";
import type {
  ValidationRunnerModuleId,
  ValidationRunnerPrerequisiteResult,
  ValidationRunnerScenarioDefinition,
  ValidationRunnerSuiteDefinition,
} from "./scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "./scenario-runner-module-adapter";

export const C_SERIES_SCENARIO_IDS = Object.freeze([
  "C03",
  "C04",
  "C05",
  "C06",
  "C07",
  "C08",
  "C09",
] as const);

export type CSeriesScenarioId = (typeof C_SERIES_SCENARIO_IDS)[number];

export const C_SERIES_SUITE_ID = "phase6-c-series" as const;

export interface CSeriesScenarioExtension {
  readonly scenarioId: CSeriesScenarioId;
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites?: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides?: ValidationModeModuleOverrides;
}

export interface CSeriesValidationModeRegistration {
  readonly definitions: readonly ValidationRunnerScenarioDefinition[];
  readonly suite: ValidationRunnerSuiteDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
  definitionFor(scenarioId: CSeriesScenarioId): ValidationRunnerScenarioDefinition;
}

const C_SERIES_ID_SET: ReadonlySet<string> = new Set(C_SERIES_SCENARIO_IDS);
const FIXED_H6B_MODULES: ReadonlySet<ValidationRunnerModuleId> = new Set([
  "production-path-driver",
  "plan-assertion-engine",
]);

function blockedPrerequisites(
  prerequisiteIds: readonly string[],
  summary: string,
): readonly ValidationRunnerPrerequisiteResult[] {
  return Object.freeze(prerequisiteIds.map(prerequisiteId => Object.freeze({
    prerequisiteId,
    status: "blocked" as const,
    summary,
    evidenceRefs: Object.freeze([]),
  })));
}

function failClosedModule(
  moduleId: ValidationRunnerModuleId,
  scenarioId: string,
): ValidationRunnerApprovedModuleDelegate {
  return Object.freeze({
    async execute() {
      return {
        status: "blocked" as const,
        summary: `${moduleId} has no C-series delegate registered for scenario ${scenarioId}.`,
        evidenceRefs: Object.freeze([]),
      };
    },
  });
}

function scenarioIdOf(value: string): CSeriesScenarioId | undefined {
  return C_SERIES_ID_SET.has(value) ? value as CSeriesScenarioId : undefined;
}

/**
 * H7 composition over the H6/H6B extension seams.
 *
 * This function owns registration order and scenario-aware routing only. It
 * does not implement scenario behavior and cannot replace the fixed H6B
 * production-path-driver or plan-assertion-engine bindings.
 */
export function composeCSeriesValidationMode(
  extensions: readonly CSeriesScenarioExtension[],
): CSeriesValidationModeRegistration {
  const byScenario = new Map<CSeriesScenarioId, CSeriesScenarioExtension>();

  for (const extension of extensions) {
    if (!C_SERIES_ID_SET.has(extension.scenarioId)) {
      throw new Error(`Unsupported C-series scenario registration: ${extension.scenarioId}`);
    }
    if (byScenario.has(extension.scenarioId)) {
      throw new Error(`Duplicate C-series scenario registration: ${extension.scenarioId}`);
    }
    if (extension.definition.scenarioId !== extension.scenarioId) {
      throw new Error(
        `C-series registration identity mismatch: registration ${extension.scenarioId}, definition ${extension.definition.scenarioId}.`,
      );
    }

    for (const moduleId of Object.keys(extension.moduleOverrides ?? {}) as ValidationRunnerModuleId[]) {
      if (FIXED_H6B_MODULES.has(moduleId)) {
        throw new Error(`C-series composition cannot override fixed H6B module ${moduleId}.`);
      }
    }

    byScenario.set(extension.scenarioId, extension);
  }

  if (byScenario.size !== C_SERIES_SCENARIO_IDS.length) {
    const missing = C_SERIES_SCENARIO_IDS.filter(id => !byScenario.has(id));
    throw new Error(`C-series registration must contain C03-C09 exactly once; missing: ${missing.join(", ")}.`);
  }

  const definitions = Object.freeze(
    C_SERIES_SCENARIO_IDS.map(id => byScenario.get(id)!.definition),
  );

  const prerequisiteRouter: ValidationRunnerPrerequisiteDelegate = Object.freeze({
    async evaluate(input) {
      if (input.prerequisiteIds.length === 0) return Object.freeze([]);
      const scenarioId = scenarioIdOf(String(input.run.scenarioId));
      if (!scenarioId) {
        return blockedPrerequisites(
          input.prerequisiteIds,
          `Prerequisite request belongs to non-C-series scenario ${input.run.scenarioId}.`,
        );
      }
      const delegate = byScenario.get(scenarioId)?.prerequisites;
      if (!delegate) {
        return blockedPrerequisites(
          input.prerequisiteIds,
          `Scenario ${scenarioId} has no prerequisite delegate bound in the C-series composition.`,
        );
      }
      return await delegate.evaluate(input);
    },
  });

  const moduleRoutes = new Map<
    ValidationRunnerModuleId,
    Map<CSeriesScenarioId, ValidationRunnerApprovedModuleDelegate>
  >();

  for (const scenarioId of C_SERIES_SCENARIO_IDS) {
    const extension = byScenario.get(scenarioId)!;
    for (const [rawModuleId, delegate] of Object.entries(extension.moduleOverrides ?? {})) {
      if (!delegate) continue;
      const moduleId = rawModuleId as ValidationRunnerModuleId;
      if (FIXED_H6B_MODULES.has(moduleId)) {
        throw new Error(`C-series composition cannot override fixed H6B module ${moduleId}.`);
      }
      const routes = moduleRoutes.get(moduleId) ?? new Map<
        CSeriesScenarioId,
        ValidationRunnerApprovedModuleDelegate
      >();
      routes.set(scenarioId, delegate);
      moduleRoutes.set(moduleId, routes);
    }
  }

  const routedOverrides: ValidationModeModuleOverrides = {};
  for (const [moduleId, routes] of moduleRoutes) {
    routedOverrides[moduleId] = Object.freeze({
      async execute(request) {
        const scenarioId = scenarioIdOf(String(request.run.scenarioId));
        if (!scenarioId) return await failClosedModule(moduleId, String(request.run.scenarioId)).execute(request);
        const delegate = routes.get(scenarioId);
        if (!delegate) return await failClosedModule(moduleId, scenarioId).execute(request);
        return await delegate.execute(request);
      },
    });
  }

  const suite: ValidationRunnerSuiteDefinition = Object.freeze({
    suiteId: C_SERIES_SUITE_ID,
    scenarios: definitions,
  });

  return Object.freeze({
    definitions,
    suite,
    prerequisites: prerequisiteRouter,
    moduleOverrides: Object.freeze(routedOverrides),
    definitionFor(scenarioId: CSeriesScenarioId) {
      return byScenario.get(scenarioId)!.definition;
    },
  });
}
