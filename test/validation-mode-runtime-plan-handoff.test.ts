import assert from "node:assert/strict";
import test from "node:test";
import type { ConflictAssessment, ProductSurfaceState, SynchronizationPlan, UserAction } from "../src/contracts";
import { contractId } from "../src/contracts";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import {
  humanCheckpoint,
  humanCheckpointId,
  validationDeviceIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerHumanCheckpointResumePort,
  ValidationRunnerPersistentState,
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type { ValidationRunnerApprovedModuleDelegate } from "../src/validation/scenario-runner-module-adapter";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  classifyValidationDevicePlatform,
  ValidationModeRuntime,
  type ValidationModeModuleOverrides,
} from "../src/validation/validation-mode-runtime";

function revisionOf(value: unknown): number | null {
  if (value === null || value === undefined || typeof value !== "object") return null;
  const revision = (value as { readonly revision?: unknown }).revision;
  return typeof revision === "number" ? revision : null;
}

class MemoryRunnerStateStore implements ValidationRunnerStateStore {
  value: ValidationRunnerPersistentState | null = null;

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

  resetForIsolationTest(): void {
    this.value = null;
  }
}

class MemoryResumeAdoptionStore implements ValidationRunnerResumeAdoptionStore {
  value: ValidationRunnerResumeAdoptionJournal | null = null;

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

function plan(planId: string, trigger: SynchronizationPlan["trigger"] = "manual"): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(planId),
    trigger,
    operations: [],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function productionFixture(plans: readonly SynchronizationPlan[], conflicts: readonly ConflictAssessment[] = []) {
  let previewIndex = 0;
  const calls: string[] = [];
  const executedPlanIds: string[] = [];
  const requestedActions: UserAction[] = [];
  const surface: ProductSurfaceState = {
    status: conflicts.length > 0 ? { kind: "conflict-present", conflictCount: conflicts.length } : { kind: "idle-ready" },
    conflicts,
  };
  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      calls.push("preview-manual");
      const observed = plans[Math.min(previewIndex, plans.length - 1)];
      previewIndex += 1;
      return observed;
    },
    previewVerifyReconcile: async () => {
      calls.push("preview-verify-reconcile");
      const observed = plans[Math.min(previewIndex, plans.length - 1)];
      previewIndex += 1;
      return observed;
    },
    runAutomatic: async trigger => { calls.push(`automatic:${trigger}`); },
    request: async action => {
      calls.push(`request:${action.kind}`);
      requestedActions.push(action);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push(`preview-action:${action.kind}`);
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("No active production run evidence is expected in VH15-R2 handoff tests."); },
  };
  return {
    calls,
    executedPlanIds,
    requestedActions,
    runtime: { productController: () => controller },
  };
}

function unresolvedTextConflict(conflictId: string, pathValue: string): Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> {
  const path = contractId<"VaultPath">(pathValue);
  return {
    kind: "unresolved-text",
    conflictId: contractId<"ConflictId">(conflictId),
    path,
    preserved: {
      local: { source: "local", version: { path, entityKind: "file" } },
      remote: { source: "remote", version: { path, entityKind: "file" } },
    },
  };
}

function expectation(expectedTrigger: SynchronizationPlan["trigger"] = "manual") {
  return {
    expectedTrigger,
    expectedOperations: [],
    allowedBackgroundKinds: [],
    forbiddenKinds: [],
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: "safe-auto-eligible" as const,
    expectedGlobalExecutionGate: "none" as const,
  };
}

function preview(stepId: string, cycleId: string) {
  return {
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "preview-manual",
    requiredCompletionProof: "operation-complete" as const,
    input: { authorityCycleId: cycleId },
  };
}

function assertPlan(
  stepId: string,
  cycleId: string,
  expectedTrigger: SynchronizationPlan["trigger"] = "manual",
) {
  return {
    stepId: validationStepId(stepId),
    module: "plan-assertion-engine" as const,
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: {
      authorityCycleId: cycleId,
      assertionId: `assertion:${stepId}`,
      expectation: expectation(expectedTrigger),
    },
  };
}

function resolveObservedConflict(
  stepId: string,
  input: Record<string, unknown>,
) {
  return {
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "resolve-observed-conflict",
    requiredCompletionProof: "operation-complete" as const,
    input,
  };
}

function execute(stepId: string, cycleId: string, extraInput: Record<string, unknown> = {}) {
  return {
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: { authorityCycleId: cycleId, ...extraInput },
  };
}

function proofSteps(prefix: string) {
  return [
    {
      stepId: validationStepId(`${prefix}:verify`),
      module: "state-convergence-verifier" as const,
      operation: "verify",
      requiredCompletionProof: "verification-passed" as const,
    },
    {
      stepId: validationStepId(`${prefix}:evidence`),
      module: "scenario-evidence-recorder" as const,
      operation: "record",
      requiredCompletionProof: "evidence-recorded" as const,
    },
  ];
}

const verifier: ValidationRunnerApprovedModuleDelegate = {
  async execute() {
    return {
      status: "completed",
      evidenceRefs: [validationEvidenceRef("vh15-r2:verified")],
    };
  },
};

const recorder: ValidationRunnerApprovedModuleDelegate = {
  async execute() {
    return {
      status: "completed",
      evidenceRefs: [validationEvidenceRef("vh15-r2:evidence")],
    };
  },
};

function runtimeFor(input: {
  readonly production: ReturnType<typeof productionFixture>;
  readonly definitions: readonly ValidationRunnerScenarioDefinition[];
  readonly state?: MemoryRunnerStateStore;
  readonly runIds?: readonly string[];
  readonly moduleOverrides?: ValidationModeModuleOverrides;
  readonly humanCheckpoints?: ValidationRunnerHumanCheckpointResumePort;
}) {
  const state = input.state ?? new MemoryRunnerStateStore();
  const runIds = [...(input.runIds ?? ["run:vh15-r2"])];
  let runIndex = 0;
  const runtime = new ValidationModeRuntime({
    productionRuntime: input.production.runtime,
    definitions: input.definitions,
    stateStore: state,
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides: {
      "state-convergence-verifier": verifier,
      "scenario-evidence-recorder": recorder,
      ...(input.moduleOverrides ?? {}),
    },
    humanCheckpoints: input.humanCheckpoints,
    currentDevice: () => validationDeviceIdentity("device:vh15-r2", "windows-desktop"),
    createRunId: () => runIds[Math.min(runIndex++, runIds.length - 1)]!,
  });
  return { runtime, state };
}

function assertRunnerStatus(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
  expected: "PASS" | "FAIL" | "BLOCKED" | "PAUSED-HUMAN-ACTION",
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected runner result.");
  assert.equal(result.result.status, expected);
  return result.result;
}

test("VH15-R2 T1/T2 exact preview handoff reaches assertion and fixed execution with the observed plan ID", async () => {
  const observed = plan("plan:vh15-r2:exact");
  const production = productionFixture([observed]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C03",
    prerequisiteIds: [],
    steps: [
      preview("t1-preview", "cycle-a"),
      assertPlan("t1-assert", "cycle-a"),
      execute("t2-execute", "cycle-a"),
      ...proofSteps("t1-t2"),
    ],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition] });
  runtime.setEnabled(true);

  const result = await runtime.startScenario("C03");
  assertRunnerStatus(result, "PASS");
  assert.deepEqual(production.calls, ["preview-manual", "preview-action:execute-plan"]);
  assert.deepEqual(production.executedPlanIds, [String(observed.planId)]);
});

test("VH15-R2 T3 plan mismatch hard-stops before production execution", async () => {
  const production = productionFixture([plan("plan:vh15-r2:mismatch", "manual")]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C04",
    prerequisiteIds: [],
    steps: [
      preview("t3-preview", "cycle-mismatch"),
      assertPlan("t3-assert", "cycle-mismatch", "verify-reconcile"),
      execute("t3-execute", "cycle-mismatch"),
    ],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition] });
  runtime.setEnabled(true);

  const result = assertRunnerStatus(await runtime.startScenario("C04"), "FAIL");
  if (result.status === "FAIL") assert.match(result.reason.summary, /Expected trigger verify-reconcile/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R2 T4 execution without successful assertion fails closed", async () => {
  const production = productionFixture([plan("plan:vh15-r2:no-assert")]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C05",
    prerequisiteIds: [],
    steps: [execute("t4-execute", "cycle-no-assert")],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition] });
  runtime.setEnabled(true);

  const result = assertRunnerStatus(await runtime.startScenario("C05"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /No asserted execution authorization/);
  assert.deepEqual(production.calls, []);
});

test("VH15-R2 T5 a newer preview invalidates prior authorization for the same cycle", async () => {
  const planA = plan("plan:vh15-r2:stale-a");
  const planB = plan("plan:vh15-r2:stale-b");
  const production = productionFixture([planA, planB]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C06",
    prerequisiteIds: [],
    steps: [
      preview("t5-preview-a", "cycle-stale"),
      assertPlan("t5-assert-a", "cycle-stale"),
      preview("t5-preview-b", "cycle-stale"),
      execute("t5-execute-old", "cycle-stale"),
    ],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition] });
  runtime.setEnabled(true);

  const result = assertRunnerStatus(await runtime.startScenario("C06"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /No asserted execution authorization/);
  assert.deepEqual(production.calls, ["preview-manual", "preview-manual"]);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R2 T6 retained authority for run A cannot be consumed by run B", async () => {
  const production = productionFixture([plan("plan:vh15-r2:run-a")]);
  const state = new MemoryRunnerStateStore();
  const runAPause: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      return {
        status: "paused-human-action",
        checkpoint: humanCheckpoint({
          checkpointId: "t6-run-a-pause",
          run: request.run,
          deviceId: "device:vh15-r2",
          requestedAction: "restart-obsidian",
          instruction: "Pause after run A assertion for run-isolation testing.",
        }),
        evidenceRefs: [],
      };
    },
  };
  const runA: ValidationRunnerScenarioDefinition = {
    scenarioId: "C07",
    prerequisiteIds: [],
    steps: [
      preview("t6-preview-a", "cycle-shared-name"),
      assertPlan("t6-assert-a", "cycle-shared-name"),
      {
        stepId: validationStepId("t6-pause-a"),
        module: "human-checkpoint-resume-controller",
        operation: "pause",
        requiredCompletionProof: "operation-complete",
      },
    ],
  };
  const runB: ValidationRunnerScenarioDefinition = {
    scenarioId: "C08",
    prerequisiteIds: [],
    steps: [execute("t6-execute-b", "cycle-shared-name")],
  };
  const { runtime } = runtimeFor({
    production,
    definitions: [runA, runB],
    state,
    runIds: ["run:vh15-r2:a", "run:vh15-r2:b"],
    moduleOverrides: { "human-checkpoint-resume-controller": runAPause },
  });
  runtime.setEnabled(true);

  assertRunnerStatus(await runtime.startScenario("C07"), "PAUSED-HUMAN-ACTION");
  state.resetForIsolationTest();
  const runBResult = assertRunnerStatus(await runtime.startScenario("C08"), "BLOCKED");
  if (runBResult.status === "BLOCKED") assert.match(runBResult.reason.summary, /No asserted execution authorization/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R2 T7 two independent cycles in one run execute only their own asserted plans", async () => {
  const planA = plan("plan:vh15-r2:cycle-a");
  const planB = plan("plan:vh15-r2:cycle-b");
  const production = productionFixture([planA, planB]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C09",
    prerequisiteIds: [],
    steps: [
      preview("t7-preview-a", "cycle-a"),
      assertPlan("t7-assert-a", "cycle-a"),
      execute("t7-execute-a", "cycle-a"),
      preview("t7-preview-b", "cycle-b"),
      assertPlan("t7-assert-b", "cycle-b"),
      execute("t7-execute-b", "cycle-b"),
      ...proofSteps("t7"),
    ],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition] });
  runtime.setEnabled(true);

  assertRunnerStatus(await runtime.startScenario("C09"), "PASS");
  assert.deepEqual(production.executedPlanIds, [String(planA.planId), String(planB.planId)]);
});

test("VH15-R2 T8 composition recreation drops handoff authority and resumed execution fails closed", async () => {
  const production = productionFixture([plan("plan:vh15-r2:restart")]);
  const state = new MemoryRunnerStateStore();
  const assertionStepId = validationStepId("t8-assert");
  const pausingDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      return {
        status: "paused-human-action",
        checkpoint: humanCheckpoint({
          checkpointId: "t8-restart-pause",
          run: request.run,
          deviceId: "device:vh15-r2",
          requestedAction: "restart-obsidian",
          instruction: "Recreate the H6B composition before assertion.",
        }),
        evidenceRefs: [],
      };
    },
  };
  let resumeCalls = 0;
  const humanCheckpoints: ValidationRunnerHumanCheckpointResumePort = {
    async consumeResume(run, checkpointId, _device, resumeCommit) {
      resumeCalls += 1;
      const adoptedCheckpointId = humanCheckpointId(checkpointId);
      if (resumeCalls === 1) {
        return {
          status: "resumable",
          state: {
            schemaVersion: 1,
            revision: 3,
            status: "resumable",
            checkpoint: humanCheckpoint({
              checkpointId: String(adoptedCheckpointId),
              run,
              deviceId: "device:vh15-r2",
              requestedAction: "restart-obsidian",
              instruction: "Recreate the H6B composition before assertion.",
            }),
            devicePlatform: "windows-desktop",
            resumeStepId: assertionStepId,
            createdAt: "2026-09-18T19:00:00.000Z",
            acknowledgedAt: "2026-09-18T19:01:00.000Z",
            verifiedAt: "2026-09-18T19:02:00.000Z",
          },
        };
      }
      await resumeCommit.commitResume({
        run,
        checkpointId: adoptedCheckpointId,
        resumeStepId: assertionStepId,
      });
      return {
        status: "resumed",
        checkpointId: adoptedCheckpointId,
        resumeStepId: assertionStepId,
      };
    },
  };
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D01",
    prerequisiteIds: [],
    steps: [
      preview("t8-preview", "cycle-restart"),
      {
        stepId: validationStepId("t8-pause"),
        module: "human-checkpoint-resume-controller",
        operation: "pause",
        requiredCompletionProof: "operation-complete",
      },
      {
        ...assertPlan("t8-assert", "cycle-restart"),
        stepId: assertionStepId,
      },
      execute("t8-execute", "cycle-restart"),
      ...proofSteps("t8"),
    ],
  };
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    state,
    moduleOverrides: { "human-checkpoint-resume-controller": pausingDelegate },
    humanCheckpoints,
  });
  runtime.setEnabled(true);

  assertRunnerStatus(await runtime.startScenario("D01"), "PAUSED-HUMAN-ACTION");
  runtime.setEnabled(false);
  runtime.setEnabled(true);

  const resumable = await runtime.resumeCurrent();
  assert.equal(resumable.status, "runner");
  if (resumable.status !== "runner") throw new Error("Expected runner result after restart.");
  assert.equal(resumable.result.status, "RESUMABLE");

  const resumed = await runtime.resumeCurrent();
  assert.equal(resumed.status, "runner");
  if (resumed.status !== "runner") throw new Error("Expected runner result after durable resume adoption.");
  assert.equal(resumed.result.status, "BLOCKED");
  if (resumed.result.status === "BLOCKED") assert.match(resumed.result.reason.summary, /No observed production plan exists/);
  assert.equal(resumeCalls, 2);
  assert.deepEqual(production.executedPlanIds, []);
});

test("H6B runtime delegates resolve-observed-conflict through the fixed production path using observed identity", async () => {
  const conflict = unresolvedTextConflict("conflict:h6b:runtime", "Notes/runtime-conflict.md");
  const production = productionFixture([plan("plan:h6b:runtime")], [conflict]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D02",
    prerequisiteIds: [],
    steps: [
      preview("h6b-runtime-preview", "h6b-runtime-cycle"),
      resolveObservedConflict("h6b-runtime-resolve", {
        expectedVaultPath: String(conflict.path),
        expectedConflictKind: "unresolved-text",
        resolution: { kind: "keep-both" },
      }),
      ...proofSteps("h6b-runtime"),
    ],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition] });
  runtime.setEnabled(true);

  assertRunnerStatus(await runtime.startScenario("D02"), "PASS");
  assert.deepEqual(production.requestedActions, [{
    kind: "resolve-conflict",
    conflictId: conflict.conflictId,
    resolution: { kind: "keep-both" },
  }]);
  assert.deepEqual(production.calls, ["preview-manual", "request:resolve-conflict"]);
});

test("H6B runtime rejects caller conflictId and malformed path, conflict kind, or resolution before production resolution", async () => {
  const conflict = unresolvedTextConflict("conflict:h6b:runtime-guard", "Notes/runtime-guard.md");
  const cases: readonly { readonly scenarioId: "D02" | "D03" | "D04" | "D05"; readonly input: Record<string, unknown> }[] = [
    {
      scenarioId: "D02",
      input: {
        expectedVaultPath: String(conflict.path),
        expectedConflictKind: "unresolved-text",
        resolution: { kind: "keep-local" },
        conflictId: "conflict:caller-forged",
      },
    },
    {
      scenarioId: "D03",
      input: {
        expectedVaultPath: " Notes/runtime-guard.md ",
        expectedConflictKind: "unresolved-text",
        resolution: { kind: "keep-local" },
      },
    },
    {
      scenarioId: "D04",
      input: {
        expectedVaultPath: String(conflict.path),
        expectedConflictKind: "opaque-binary",
        resolution: { kind: "keep-local" },
      },
    },
    {
      scenarioId: "D05",
      input: {
        expectedVaultPath: String(conflict.path),
        expectedConflictKind: "unresolved-text",
        resolution: { kind: "manual", resolvedVersion: { path: String(conflict.path), entityKind: "file" } },
      },
    },
  ];

  for (const entry of cases) {
    const production = productionFixture([plan("plan:h6b:guard:" + entry.scenarioId)], [conflict]);
    const definition: ValidationRunnerScenarioDefinition = {
      scenarioId: entry.scenarioId,
      prerequisiteIds: [],
      steps: [
        preview("h6b-guard-preview-" + entry.scenarioId, "h6b-guard-cycle-" + entry.scenarioId),
        resolveObservedConflict("h6b-guard-resolve-" + entry.scenarioId, entry.input),
      ],
    };
    const { runtime } = runtimeFor({ production, definitions: [definition] });
    runtime.setEnabled(true);

    assertRunnerStatus(await runtime.startScenario(entry.scenarioId), "BLOCKED");
    assert.deepEqual(production.requestedActions, []);
    assert.deepEqual(production.calls, ["preview-manual"]);
  }
});

test("VH15-R2 T9 production-path-driver remains non-overridable", async () => {
  const production = productionFixture([plan("plan:vh15-r2:fixed-driver")]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D02",
    prerequisiteIds: [],
    steps: [preview("t9-preview", "cycle-fixed")],
  };
  const illegalOverride: ValidationRunnerApprovedModuleDelegate = {
    async execute() {
      return { status: "completed", evidenceRefs: [] };
    },
  };
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    moduleOverrides: { "production-path-driver": illegalOverride },
  });
  runtime.setEnabled(true);

  await assert.rejects(runtime.startScenario("D02"), /production-path-driver runtime binding is fixed/);
  assert.deepEqual(production.calls, []);
});

test("VH15-R2 T10 default-off isolation and platform classification remain intact", async () => {
  const production = productionFixture([plan("plan:vh15-r2:isolation")]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D03",
    prerequisiteIds: [],
    steps: [preview("t10-preview", "cycle-isolation")],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition] });

  assert.equal(runtime.enabled(), false);
  assert.deepEqual(await runtime.startScenario("D03"), {
    status: "disabled",
    reason: "Validation mode is disabled.",
  });
  assert.deepEqual(production.calls, []);
  assert.equal(classifyValidationDevicePlatform({
    isDesktopApp: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    maxTouchPoints: 0,
  }), "windows-desktop");
  assert.equal(classifyValidationDevicePlatform({
    isDesktopApp: false,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Mobile/15E148",
    maxTouchPoints: 5,
  }), "ipad");
});
