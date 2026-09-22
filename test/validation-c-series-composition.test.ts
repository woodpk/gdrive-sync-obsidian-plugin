import assert from "node:assert/strict";
import test from "node:test";
import type { ValidationProductionRuntimePort } from "../src/validation/production-path-driver";
import {
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type { ValidationRunnerScenarioDefinition } from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "../src/validation/scenario-runner-module-adapter";
import {
  C_SERIES_SCENARIO_IDS,
  composeCSeriesValidationMode,
  type CSeriesScenarioExtension,
  type CSeriesScenarioId,
} from "../src/validation/c-series-composition";
import {
  ValidationModeRuntime,
  type ValidationModeModuleOverrides,
} from "../src/validation/validation-mode-runtime";

function definition(
  scenarioId: CSeriesScenarioId,
  prerequisiteIds: readonly string[] = [],
): ValidationRunnerScenarioDefinition {
  return Object.freeze({
    scenarioId,
    prerequisiteIds: Object.freeze([...prerequisiteIds]),
    steps: Object.freeze([
      Object.freeze({
        stepId: validationStepId(`vh23:${scenarioId}:step`),
        module: "fixture-manager" as const,
        operation: `vh23:${scenarioId}:fixture`,
        requiredCompletionProof: "operation-complete" as const,
      }),
    ]),
  });
}

function completedDelegate(label: string, calls: string[]): ValidationRunnerApprovedModuleDelegate {
  return Object.freeze({
    async execute(request: Parameters<ValidationRunnerApprovedModuleDelegate["execute"]>[0]) {
      calls.push(`${label}:${request.run.scenarioId}:${request.operation}`);
      return { status: "completed" as const, evidenceRefs: [] };
    },
  });
}

function satisfiedPrerequisites(label: string, calls: string[]): ValidationRunnerPrerequisiteDelegate {
  return Object.freeze({
    async evaluate(input: Parameters<ValidationRunnerPrerequisiteDelegate["evaluate"]>[0]) {
      calls.push(`${label}:${input.run.scenarioId}`);
      return Object.freeze(input.prerequisiteIds.map(prerequisiteId => Object.freeze({
        prerequisiteId,
        status: "satisfied" as const,
        summary: `${label} satisfied ${prerequisiteId}`,
        evidenceRefs: Object.freeze([]),
      })));
    },
  });
}

function allExtensions(
  customize: Partial<Record<CSeriesScenarioId, Partial<CSeriesScenarioExtension>>> = {},
): CSeriesScenarioExtension[] {
  return C_SERIES_SCENARIO_IDS.map(scenarioId => {
    const custom = customize[scenarioId] ?? {};
    return {
      scenarioId,
      definition: custom.definition ?? definition(scenarioId),
      ...(custom.prerequisites === undefined ? {} : { prerequisites: custom.prerequisites }),
      ...(custom.moduleOverrides === undefined ? {} : { moduleOverrides: custom.moduleOverrides }),
    };
  });
}

test("VH23 H7 registers C03-C09 exactly once in deterministic suite order", () => {
  const extensions = allExtensions().reverse();
  const c09Definition = extensions.find(item => item.scenarioId === "C09")!.definition;
  const registration = composeCSeriesValidationMode(extensions);

  assert.deepEqual(
    registration.definitions.map(item => item.scenarioId),
    [...C_SERIES_SCENARIO_IDS],
  );
  assert.deepEqual(
    registration.suite.scenarios.map(item => item.scenarioId),
    [...C_SERIES_SCENARIO_IDS],
  );
  assert.equal(registration.definitionFor("C09"), c09Definition);

  const runtime = new ValidationModeRuntime({
    productionRuntime: {} as ValidationProductionRuntimePort,
    definitions: registration.definitions,
    prerequisites: registration.prerequisites,
    moduleOverrides: registration.moduleOverrides,
  });
  runtime.setEnabled(true);
  assert.deepEqual(runtime.installedScenarioIds(), [...C_SERIES_SCENARIO_IDS]);
});

test("VH23 H7 rejects duplicate or incomplete C-series registrations", () => {
  const duplicate = allExtensions();
  duplicate[1] = {
    ...duplicate[0]!,
    definition: definition("C03"),
  };
  assert.throws(
    () => composeCSeriesValidationMode(duplicate),
    /Duplicate C-series scenario registration: C03/,
  );

  assert.throws(
    () => composeCSeriesValidationMode(allExtensions().slice(0, -1)),
    /must contain C03-C09 exactly once/,
  );
});

test("VH23 H7 routes non-fixed module delegates only to the active scenario", async () => {
  const calls: string[] = [];
  const c03Modules: ValidationModeModuleOverrides = {
    "fixture-manager": completedDelegate("c03", calls),
  };
  const c04Modules: ValidationModeModuleOverrides = {
    "fixture-manager": completedDelegate("c04", calls),
  };
  const registration = composeCSeriesValidationMode(allExtensions({
    C03: { moduleOverrides: c03Modules },
    C04: { moduleOverrides: c04Modules },
  }));

  const delegate = registration.moduleOverrides["fixture-manager"];
  assert.ok(delegate);

  const c03Result = await delegate.execute({
    run: validationRunIdentity("vh23-run-c03", "C03"),
    stepId: validationStepId("vh23-c03-step"),
    operation: "c03-owned",
  });
  assert.equal(c03Result?.status, "completed");

  const c04Result = await delegate.execute({
    run: validationRunIdentity("vh23-run-c04", "C04"),
    stepId: validationStepId("vh23-c04-step"),
    operation: "c04-owned",
  });
  assert.equal(c04Result?.status, "completed");

  const c05Result = await delegate.execute({
    run: validationRunIdentity("vh23-run-c05", "C05"),
    stepId: validationStepId("vh23-c05-step"),
    operation: "c05-unbound",
  });
  assert.equal(c05Result?.status, "blocked");

  assert.deepEqual(calls, [
    "c03:C03:c03-owned",
    "c04:C04:c04-owned",
  ]);
});

test("VH23 H7 routes prerequisite evaluation by scenario without bleed", async () => {
  const calls: string[] = [];
  const registration = composeCSeriesValidationMode(allExtensions({
    C03: {
      definition: definition("C03", ["c03-ready"]),
      prerequisites: satisfiedPrerequisites("c03-prereq", calls),
    },
  }));

  const c03 = await registration.prerequisites.evaluate({
    run: validationRunIdentity("vh23-prereq-c03", "C03"),
    prerequisiteIds: ["c03-ready"],
  });
  assert.equal(c03?.[0]?.status, "satisfied");

  const c04 = await registration.prerequisites.evaluate({
    run: validationRunIdentity("vh23-prereq-c04", "C04"),
    prerequisiteIds: ["c04-unbound"],
  });
  assert.equal(c04?.[0]?.status, "blocked");

  assert.deepEqual(calls, ["c03-prereq:C03"]);
});

test("VH23 H7 cannot replace fixed production or plan-assertion bindings", () => {
  const calls: string[] = [];
  for (const moduleId of ["production-path-driver", "plan-assertion-engine"] as const) {
    const moduleOverrides: ValidationModeModuleOverrides = {
      [moduleId]: completedDelegate(moduleId, calls),
    };
    assert.throws(
      () => composeCSeriesValidationMode(allExtensions({
        C03: { moduleOverrides },
      })),
      new RegExp(`cannot override fixed H6B module ${moduleId}`),
    );
  }
});
