import assert from "node:assert/strict";
import test from "node:test";
import type { ProductSurfaceState, SynchronizationPlan } from "../src/contracts";
import { contractId } from "../src/contracts";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import {
  humanCheckpoint,
  humanCheckpointId,
  validationDeviceIdentity,
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerHumanCheckpointResumePort,
  ValidationRunnerPersistentState,
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
} from "../src/validation/scenario-runner-module-adapter";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  ValidationModeRuntime,
  type ValidationModeModuleOverrides,
  type ValidationRemoteIdentityPublishingVerifierResult,
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

const targetPath = contractId<"VaultPath">("validation/runtime-bound.md");

function remotePlan(planId: string, remoteObjectId: string): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(planId),
    trigger: "manual",
    operations: [{
      operationId: contractId<"OperationId">(`operation:${planId}`),
      kind: "download-update",
      path: targetPath,
      targetSide: "local",
      remoteObjectId: contractId<"RemoteObjectId">(remoteObjectId),
      destructive: false,
      preconditions: [],
      reasons: [],
    }],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function productionFixture(plans: readonly SynchronizationPlan[]) {
  let previewIndex = 0;
  const calls: string[] = [];
  const executedPlanIds: string[] = [];
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
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
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push(`preview-action:${action.kind}`);
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("No active production run evidence is expected in VH15-R3 tests."); },
  };
  return { calls, executedPlanIds, runtime: { productController: () => controller } };
}

function baseExpectation(expectedOperations: readonly unknown[]) {
  return {
    expectedTrigger: "manual" as const,
    expectedOperations,
    allowedBackgroundKinds: [],
    forbiddenKinds: [],
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: "safe-auto-eligible" as const,
    expectedGlobalExecutionGate: "none" as const,
  };
}

function expectedRemoteOperation(input: {
  readonly bindingName?: unknown;
  readonly literalRemoteObjectId?: string;
}) {
  return {
    kind: "download-update",
    path: targetPath,
    targetSide: "local",
    destructive: false,
    ...(input.literalRemoteObjectId === undefined
      ? {}
      : { remoteObjectId: contractId<"RemoteObjectId">(input.literalRemoteObjectId) }),
    ...(input.bindingName === undefined ? {} : { remoteObjectIdBinding: input.bindingName }),
  };
}

function verifierStep(stepId: string, operation = "verify-remote-identity") {
  return {
    stepId: validationStepId(stepId),
    module: "state-convergence-verifier" as const,
    operation,
    requiredCompletionProof: "verification-passed" as const,
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

function assertPlan(stepId: string, cycleId: string, expectedOperation: unknown) {
  return {
    stepId: validationStepId(stepId),
    module: "plan-assertion-engine" as const,
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: {
      authorityCycleId: cycleId,
      assertionId: `assertion:${stepId}`,
      expectation: baseExpectation([expectedOperation]),
    },
  };
}

function execute(stepId: string, cycleId: string) {
  return {
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: { authorityCycleId: cycleId },
  };
}

function evidenceStep(stepId: string) {
  return {
    stepId: validationStepId(stepId),
    module: "scenario-evidence-recorder" as const,
    operation: "record",
    requiredCompletionProof: "evidence-recorded" as const,
  };
}

function pauseStep(stepId: string) {
  return {
    stepId: validationStepId(stepId),
    module: "human-checkpoint-resume-controller" as const,
    operation: "pause",
    requiredCompletionProof: "operation-complete" as const,
  };
}

function publishingVerifier(
  remoteObjectId: string,
  bindingName = "target",
  evidenceId = "vh15-r3:verified",
): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute() {
      return {
        status: "completed",
        evidenceRefs: [validationEvidenceRef(evidenceId)],
        remoteIdentityBindings: [{
          bindingName,
          remoteObjectId: contractId<"RemoteObjectId">(remoteObjectId),
        }],
      } as ValidationRemoteIdentityPublishingVerifierResult;
    },
  };
}

const ordinaryVerifier: ValidationRunnerApprovedModuleDelegate = {
  async execute() {
    return {
      status: "completed",
      evidenceRefs: [validationEvidenceRef("vh15-r3:ordinary-verification")],
    };
  },
};

const recorder: ValidationRunnerApprovedModuleDelegate = {
  async execute() {
    return {
      status: "completed",
      evidenceRefs: [validationEvidenceRef("vh15-r3:evidence")],
    };
  },
};

function pauseDelegate(): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      return {
        status: "paused-human-action",
        checkpoint: humanCheckpoint({
          checkpointId: `checkpoint:${String(request.run.runId)}`,
          run: request.run,
          deviceId: "device:vh15-r3",
          requestedAction: "restart-obsidian",
          instruction: "Pause after verified runtime identity publication.",
        }),
        evidenceRefs: [],
      };
    },
  };
}

function resumePort(resumeStepId: ReturnType<typeof validationStepId>): ValidationRunnerHumanCheckpointResumePort {
  let calls = 0;
  return {
    async consumeResume(run, checkpointId, _device, resumeCommit) {
      calls += 1;
      const adoptedCheckpointId = humanCheckpointId(checkpointId);
      if (calls % 2 === 1) {
        return {
          status: "resumable",
          state: {
            schemaVersion: 1,
            revision: 3,
            status: "resumable",
            checkpoint: humanCheckpoint({
              checkpointId: String(adoptedCheckpointId),
              run,
              deviceId: "device:vh15-r3",
              requestedAction: "restart-obsidian",
              instruction: "Resume after runtime identity publication.",
            }),
            devicePlatform: "windows-desktop",
            resumeStepId,
            createdAt: "2026-09-19T00:00:00.000Z",
            acknowledgedAt: "2026-09-19T00:01:00.000Z",
            verifiedAt: "2026-09-19T00:02:00.000Z",
          },
        };
      }
      await resumeCommit.commitResume({ run, checkpointId: adoptedCheckpointId, resumeStepId });
      return { status: "resumed", checkpointId: adoptedCheckpointId, resumeStepId };
    },
  };
}

function runtimeFor(input: {
  readonly production: ReturnType<typeof productionFixture>;
  readonly definitions: readonly ValidationRunnerScenarioDefinition[];
  readonly state?: MemoryRunnerStateStore;
  readonly runIds?: readonly string[];
  readonly verifier?: ValidationRunnerApprovedModuleDelegate;
  readonly moduleOverrides?: ValidationModeModuleOverrides;
  readonly humanCheckpoints?: ValidationRunnerHumanCheckpointResumePort;
}) {
  const state = input.state ?? new MemoryRunnerStateStore();
  const runIds = [...(input.runIds ?? ["run:vh15-r3"])];
  let runIndex = 0;
  const runtime = new ValidationModeRuntime({
    productionRuntime: input.production.runtime,
    definitions: input.definitions,
    stateStore: state,
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides: {
      "state-convergence-verifier": input.verifier ?? ordinaryVerifier,
      "scenario-evidence-recorder": recorder,
      ...(input.moduleOverrides ?? {}),
    },
    humanCheckpoints: input.humanCheckpoints,
    currentDevice: () => validationDeviceIdentity("device:vh15-r3", "windows-desktop"),
    createRunId: () => runIds[Math.min(runIndex++, runIds.length - 1)]!,
  });
  return { runtime, state };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
  expected: "PASS" | "FAIL" | "BLOCKED" | "PAUSED-HUMAN-ACTION",
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected runner result.");
  assert.equal(result.result.status, expected);
  return result.result;
}

function boundScenario(
  scenarioId: ValidationRunnerScenarioDefinition["scenarioId"],
  expectedOperation: unknown,
  cycleId = "cycle-a",
): ValidationRunnerScenarioDefinition {
  return {
    scenarioId,
    prerequisiteIds: [],
    steps: [
      verifierStep(`${scenarioId}:verify`),
      preview(`${scenarioId}:preview`, cycleId),
      assertPlan(`${scenarioId}:assert`, cycleId, expectedOperation),
      execute(`${scenarioId}:execute`, cycleId),
      evidenceStep(`${scenarioId}:evidence`),
    ],
  };
}

test("VH15-R3 matching verified identity narrows assertion and authorizes fixed production execution", async () => {
  const plan = remotePlan("plan:r3:match", "remote-id-1");
  const expectedOperation = expectedRemoteOperation({ bindingName: "target" });
  const definition = boundScenario("C03", expectedOperation);
  const originalExpectation = structuredClone(definition.steps[2]!.input);
  const production = productionFixture([plan]);
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    verifier: publishingVerifier("remote-id-1"),
  });
  runtime.setEnabled(true);

  runnerResult(await runtime.startScenario("C03"), "PASS");
  assert.deepEqual(production.executedPlanIds, [String(plan.planId)]);
  assert.deepEqual(definition.steps[2]!.input, originalExpectation, "static scenario definition must not be mutated");
});

test("VH15-R3 principal safety: verified remote-id-1 rejects otherwise-correct remote-id-2 before execution", async () => {
  const production = productionFixture([remotePlan("plan:r3:wrong", "remote-id-2")]);
  const definition = boundScenario("C04", expectedRemoteOperation({ bindingName: "target" }));
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    verifier: publishingVerifier("remote-id-1"),
  });
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C04"), "FAIL");
  if (result.status === "FAIL") assert.match(result.reason.summary, /remoteObjectId=remote-id-1.*remoteObjectId=remote-id-2/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 missing observed remote ID fails closed at trusted publication", async () => {
  const malformedVerifier: ValidationRunnerApprovedModuleDelegate = {
    async execute() {
      return {
        status: "completed",
        evidenceRefs: [validationEvidenceRef("vh15-r3:missing-observed-id")],
        remoteIdentityBindings: [{ bindingName: "target" }],
      } as unknown as ValidationRemoteIdentityPublishingVerifierResult;
    },
  };
  const production = productionFixture([remotePlan("plan:r3:missing-observed", "remote-id-1")]);
  const definition = boundScenario("C05", expectedRemoteOperation({ bindingName: "target" }));
  const { runtime } = runtimeFor({ production, definitions: [definition], verifier: malformedVerifier });
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C05"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /requires non-empty bindingName and remoteObjectId/);
  assert.deepEqual(production.calls, []);
});

test("VH15-R3 missing runtime binding blocks assertion before production execution", async () => {
  const production = productionFixture([remotePlan("plan:r3:missing-binding", "remote-id-1")]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C06",
    prerequisiteIds: [],
    steps: [
      verifierStep("missing-binding:verify"),
      preview("missing-binding:preview", "cycle-missing"),
      assertPlan("missing-binding:assert", "cycle-missing", expectedRemoteOperation({ bindingName: "target" })),
      execute("missing-binding:execute", "cycle-missing"),
    ],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition], verifier: ordinaryVerifier });
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C06"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /No verified remote-identity binding named target/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 non-verifier module output cannot establish remote identity authority", async () => {
  const publishingRecorder: ValidationRunnerApprovedModuleDelegate = {
    async execute() {
      return {
        status: "completed",
        evidenceRefs: [validationEvidenceRef("vh15-r3:non-verifier")],
        remoteIdentityBindings: [{
          bindingName: "target",
          remoteObjectId: contractId<"RemoteObjectId">("remote-id-1"),
        }],
      } as ValidationRemoteIdentityPublishingVerifierResult;
    },
  };
  const production = productionFixture([remotePlan("plan:r3:non-verifier", "remote-id-1")]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C07",
    prerequisiteIds: [],
    steps: [
      evidenceStep("non-verifier:publish-attempt"),
      preview("non-verifier:preview", "cycle-non-verifier"),
      assertPlan("non-verifier:assert", "cycle-non-verifier", expectedRemoteOperation({ bindingName: "target" })),
      execute("non-verifier:execute", "cycle-non-verifier"),
    ],
  };
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    moduleOverrides: { "scenario-evidence-recorder": publishingRecorder },
  });
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C07"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /No verified remote-identity binding named target/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 failed or blocked verifier cannot establish identity authority or reach production", async () => {
  for (const status of ["failed", "blocked"] as const) {
    const verifier: ValidationRunnerApprovedModuleDelegate = {
      async execute() {
        return {
          status,
          summary: `intentional ${status} verifier`,
          evidenceRefs: [validationEvidenceRef(`vh15-r3:${status}-verifier`)],
          remoteIdentityBindings: [{
            bindingName: "target",
            remoteObjectId: contractId<"RemoteObjectId">("remote-id-1"),
          }],
        } as ValidationRemoteIdentityPublishingVerifierResult;
      },
    };
    const production = productionFixture([remotePlan(`plan:r3:${status}`, "remote-id-1")]);
    const definition = boundScenario(status === "failed" ? "C08" : "C09", expectedRemoteOperation({ bindingName: "target" }));
    const { runtime } = runtimeFor({ production, definitions: [definition], verifier });
    runtime.setEnabled(true);

    runnerResult(await runtime.startScenario(definition.scenarioId), status === "failed" ? "FAIL" : "BLOCKED");
    assert.deepEqual(production.calls, []);
  }
});

test("VH15-R3 conflicting rebinding fails closed while same-value re-verification is idempotent", async () => {
  const conflictVerifier: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const id = request.operation === "verify-first" ? "remote-id-1" : "remote-id-2";
      return {
        status: "completed",
        evidenceRefs: [validationEvidenceRef(`vh15-r3:${request.operation}`)],
        remoteIdentityBindings: [{
          bindingName: "target",
          remoteObjectId: contractId<"RemoteObjectId">(id),
        }],
      } as ValidationRemoteIdentityPublishingVerifierResult;
    },
  };
  const conflictDefinition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D01",
    prerequisiteIds: [],
    steps: [verifierStep("conflict:first", "verify-first"), verifierStep("conflict:second", "verify-second")],
  };
  const conflictProduction = productionFixture([remotePlan("plan:r3:conflict", "remote-id-1")]);
  const conflictRuntime = runtimeFor({
    production: conflictProduction,
    definitions: [conflictDefinition],
    verifier: conflictVerifier,
  }).runtime;
  conflictRuntime.setEnabled(true);
  const conflict = runnerResult(await conflictRuntime.startScenario("D01"), "BLOCKED");
  if (conflict.status === "BLOCKED") assert.match(conflict.reason.summary, /conflicts with previously verified authority/);

  const sameValueVerifier: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      return {
        status: "completed",
        evidenceRefs: [validationEvidenceRef(`vh15-r3:same:${request.operation}`)],
        remoteIdentityBindings: [{
          bindingName: "target",
          remoteObjectId: contractId<"RemoteObjectId">("remote-id-1"),
        }],
      } as ValidationRemoteIdentityPublishingVerifierResult;
    },
  };
  const sameValuePlan = remotePlan("plan:r3:same", "remote-id-1");
  const sameDefinition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D02",
    prerequisiteIds: [],
    steps: [
      verifierStep("same:first", "verify-first"),
      verifierStep("same:second", "verify-second"),
      preview("same:preview", "cycle-same"),
      assertPlan("same:assert", "cycle-same", expectedRemoteOperation({ bindingName: "target" })),
      execute("same:execute", "cycle-same"),
      evidenceStep("same:evidence"),
    ],
  };
  const sameProduction = productionFixture([sameValuePlan]);
  const sameRuntime = runtimeFor({
    production: sameProduction,
    definitions: [sameDefinition],
    verifier: sameValueVerifier,
  }).runtime;
  sameRuntime.setEnabled(true);
  runnerResult(await sameRuntime.startScenario("D02"), "PASS");
  assert.deepEqual(sameProduction.executedPlanIds, [String(sameValuePlan.planId)]);
});

test("VH15-R3 remote identity authority is isolated by run and scenario", async () => {
  const state = new MemoryRunnerStateStore();
  const production = productionFixture([remotePlan("plan:r3:run-isolation", "remote-id-1")]);
  const publishAndPause: ValidationRunnerScenarioDefinition = {
    scenarioId: "D03",
    prerequisiteIds: [],
    steps: [verifierStep("run-a:verify"), pauseStep("run-a:pause")],
  };
  const consumeOnly: ValidationRunnerScenarioDefinition = {
    scenarioId: "D04",
    prerequisiteIds: [],
    steps: [
      preview("run-b:preview", "cycle-run-b"),
      assertPlan("run-b:assert", "cycle-run-b", expectedRemoteOperation({ bindingName: "target" })),
      execute("run-b:execute", "cycle-run-b"),
    ],
  };
  const { runtime } = runtimeFor({
    production,
    definitions: [publishAndPause, consumeOnly],
    state,
    runIds: ["run:vh15-r3:a", "run:vh15-r3:b"],
    verifier: publishingVerifier("remote-id-1"),
    moduleOverrides: { "human-checkpoint-resume-controller": pauseDelegate() },
  });
  runtime.setEnabled(true);

  runnerResult(await runtime.startScenario("D03"), "PAUSED-HUMAN-ACTION");
  state.resetForIsolationTest();
  const result = runnerResult(await runtime.startScenario("D04"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /No verified remote-identity binding named target/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 one stable verified identity constrains multiple later authority cycles in one run", async () => {
  const planA = remotePlan("plan:r3:cycle-a", "remote-id-1");
  const planB = remotePlan("plan:r3:cycle-b", "remote-id-1");
  const production = productionFixture([planA, planB]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D05",
    prerequisiteIds: [],
    steps: [
      verifierStep("multi:verify"),
      preview("multi:preview-a", "cycle-a"),
      assertPlan("multi:assert-a", "cycle-a", expectedRemoteOperation({ bindingName: "target" })),
      execute("multi:execute-a", "cycle-a"),
      preview("multi:preview-b", "cycle-b"),
      assertPlan("multi:assert-b", "cycle-b", expectedRemoteOperation({ bindingName: "target" })),
      execute("multi:execute-b", "cycle-b"),
      evidenceStep("multi:evidence"),
    ],
  };
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    verifier: publishingVerifier("remote-id-1"),
  });
  runtime.setEnabled(true);

  runnerResult(await runtime.startScenario("D05"), "PASS");
  assert.deepEqual(production.executedPlanIds, [String(planA.planId), String(planB.planId)]);
});

test("VH15-R3 fresh runtime/composition reconstruction loses remote identity authority", async () => {
  const state = new MemoryRunnerStateStore();
  const previewStepId = validationStepId("restart:preview");
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "D06",
    prerequisiteIds: [],
    steps: [
      verifierStep("restart:verify"),
      pauseStep("restart:pause"),
      { ...preview("restart:preview", "cycle-restart"), stepId: previewStepId },
      assertPlan("restart:assert", "cycle-restart", expectedRemoteOperation({ bindingName: "target" })),
      execute("restart:execute", "cycle-restart"),
    ],
  };
  const production = productionFixture([remotePlan("plan:r3:restart", "remote-id-1")]);
  const resume = resumePort(previewStepId);
  const first = runtimeFor({
    production,
    definitions: [definition],
    state,
    verifier: publishingVerifier("remote-id-1"),
    moduleOverrides: { "human-checkpoint-resume-controller": pauseDelegate() },
    humanCheckpoints: resume,
  }).runtime;
  first.setEnabled(true);
  runnerResult(await first.startScenario("D06"), "PAUSED-HUMAN-ACTION");

  const reconstructed = runtimeFor({
    production,
    definitions: [definition],
    state,
    verifier: publishingVerifier("remote-id-1"),
    moduleOverrides: { "human-checkpoint-resume-controller": pauseDelegate() },
    humanCheckpoints: resume,
  }).runtime;
  reconstructed.setEnabled(true);
  const firstResume = await reconstructed.resumeCurrent();
  assert.equal(firstResume.status, "runner");
  if (firstResume.status !== "runner") throw new Error("Expected resumable runner result.");
  assert.equal(firstResume.result.status, "RESUMABLE");

  const secondResume = await reconstructed.resumeCurrent();
  assert.equal(secondResume.status, "runner");
  if (secondResume.status !== "runner") throw new Error("Expected resumed runner result.");
  assert.equal(secondResume.result.status, "BLOCKED");
  if (secondResume.result.status === "BLOCKED") {
    assert.match(secondResume.result.reason.summary, /No verified remote-identity binding named target/);
  }
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 disable/re-enable clears remote identity authority before durable resume", async () => {
  const state = new MemoryRunnerStateStore();
  const previewStepId = validationStepId("disable:preview");
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "E01",
    prerequisiteIds: [],
    steps: [
      verifierStep("disable:verify"),
      pauseStep("disable:pause"),
      { ...preview("disable:preview", "cycle-disable"), stepId: previewStepId },
      assertPlan("disable:assert", "cycle-disable", expectedRemoteOperation({ bindingName: "target" })),
      execute("disable:execute", "cycle-disable"),
    ],
  };
  const production = productionFixture([remotePlan("plan:r3:disable", "remote-id-1")]);
  const resume = resumePort(previewStepId);
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    state,
    verifier: publishingVerifier("remote-id-1"),
    moduleOverrides: { "human-checkpoint-resume-controller": pauseDelegate() },
    humanCheckpoints: resume,
  });
  runtime.setEnabled(true);
  runnerResult(await runtime.startScenario("E01"), "PAUSED-HUMAN-ACTION");

  runtime.setEnabled(false);
  runtime.setEnabled(true);
  const firstResume = await runtime.resumeCurrent();
  assert.equal(firstResume.status, "runner");
  if (firstResume.status !== "runner") throw new Error("Expected resumable runner result.");
  assert.equal(firstResume.result.status, "RESUMABLE");

  const secondResume = await runtime.resumeCurrent();
  assert.equal(secondResume.status, "runner");
  if (secondResume.status !== "runner") throw new Error("Expected resumed runner result.");
  assert.equal(secondResume.result.status, "BLOCKED");
  if (secondResume.result.status === "BLOCKED") {
    assert.match(secondResume.result.reason.summary, /No verified remote-identity binding named target/);
  }
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 terminal completion clears remote identity authority", async () => {
  const runId = "run:vh15-r3:terminal-clear";
  const definition = boundScenario("E02", expectedRemoteOperation({ bindingName: "target" }));
  const production = productionFixture([remotePlan("plan:r3:terminal", "remote-id-1")]);
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    runIds: [runId],
    verifier: publishingVerifier("remote-id-1"),
  });
  runtime.setEnabled(true);
  runnerResult(await runtime.startScenario("E02"), "PASS");

  const internal = runtime as unknown as {
    identityAuthority?: { resolve(run: ReturnType<typeof validationRunIdentity>, bindingName: string): unknown };
  };
  assert.equal(
    internal.identityAuthority?.resolve(validationRunIdentity(runId, "E02"), "target"),
    undefined,
  );
});

test("VH15-R3 literal static remoteObjectId expectations remain valid without runtime binding", async () => {
  const plan = remotePlan("plan:r3:literal", "remote-id-1");
  const production = productionFixture([plan]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "E03",
    prerequisiteIds: [],
    steps: [
      preview("literal:preview", "cycle-literal"),
      assertPlan("literal:assert", "cycle-literal", expectedRemoteOperation({ literalRemoteObjectId: "remote-id-1" })),
      execute("literal:execute", "cycle-literal"),
      verifierStep("literal:verify"),
      evidenceStep("literal:evidence"),
    ],
  };
  const { runtime } = runtimeFor({ production, definitions: [definition], verifier: ordinaryVerifier });
  runtime.setEnabled(true);

  runnerResult(await runtime.startScenario("E03"), "PASS");
  assert.deepEqual(production.executedPlanIds, [String(plan.planId)]);
});

test("VH15-R3 runtime binding cannot weaken a conflicting static remoteObjectId expectation", async () => {
  const production = productionFixture([remotePlan("plan:r3:static-conflict", "remote-id-2")]);
  const definition = boundScenario(
    "E04",
    expectedRemoteOperation({ bindingName: "target", literalRemoteObjectId: "remote-id-2" }),
  );
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    verifier: publishingVerifier("remote-id-1"),
  });
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("E04"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /cannot weaken conflicting static remoteObjectId/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 malformed assertion binding declarations fail closed", async () => {
  const production = productionFixture([remotePlan("plan:r3:malformed-binding", "remote-id-1")]);
  const definition = boundScenario("E05", expectedRemoteOperation({ bindingName: " " }));
  const { runtime } = runtimeFor({
    production,
    definitions: [definition],
    verifier: publishingVerifier("remote-id-1"),
  });
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("E05"), "BLOCKED");
  if (result.status === "BLOCKED") assert.match(result.reason.summary, /remoteObjectIdBinding must be a non-empty/);
  assert.deepEqual(production.executedPlanIds, []);
});

test("VH15-R3 fixed production driver and assertion engine remain non-overridable", async () => {
  const production = productionFixture([remotePlan("plan:r3:fixed", "remote-id-1")]);
  const definition: ValidationRunnerScenarioDefinition = {
    scenarioId: "E06",
    prerequisiteIds: [],
    steps: [preview("fixed:preview", "cycle-fixed")],
  };
  const illegal: ValidationRunnerApprovedModuleDelegate = {
    async execute() { return { status: "completed", evidenceRefs: [] }; },
  };

  for (const moduleId of ["production-path-driver", "plan-assertion-engine"] as const) {
    const { runtime } = runtimeFor({
      production,
      definitions: [definition],
      moduleOverrides: { [moduleId]: illegal },
    });
    runtime.setEnabled(true);
    await assert.rejects(
      runtime.startScenario("E06"),
      new RegExp(`The ${moduleId} runtime binding is fixed and cannot be overridden\\.`),
    );
  }
});
