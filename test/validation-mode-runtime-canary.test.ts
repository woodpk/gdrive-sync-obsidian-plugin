import assert from "node:assert/strict";
import test from "node:test";
import type { ProductSurfaceState, SynchronizationPlan } from "../src/contracts";
import { contractId } from "../src/contracts";
import type { ProductionDiagnosticCorrelation } from "../src/diagnostics/production-diagnostic-correlation";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  validationDeviceIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerPersistentState,
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  classifyValidationDevicePlatform,
  ValidationModeRuntime,
} from "../src/validation/validation-mode-runtime";

function revisionOf(value: unknown): number | null {
  if (value === null || value === undefined || typeof value !== "object") return null;
  const revision = (value as { readonly revision?: unknown }).revision;
  return typeof revision === "number" ? revision : null;
}

class MemoryRunnerStateStore implements ValidationRunnerStateStore {
  value: ValidationRunnerPersistentState | null = null;
  loads = 0;
  writes = 0;

  async load(): Promise<unknown> {
    this.loads += 1;
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(expectedRevision: number | null, next: ValidationRunnerPersistentState | null): Promise<boolean> {
    if (revisionOf(this.value) !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    this.writes += 1;
    return true;
  }
}

class MemoryResumeAdoptionStore implements ValidationRunnerResumeAdoptionStore {
  value: ValidationRunnerResumeAdoptionJournal | null = null;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(expectedRevision: number | null, next: ValidationRunnerResumeAdoptionJournal): Promise<boolean> {
    if (revisionOf(this.value) !== expectedRevision) return false;
    this.value = structuredClone(next);
    return true;
  }
}

function plan(): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">("plan:vh15:canary"),
    trigger: "manual",
    operations: [],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function productionFixture() {
  const calls: string[] = [];
  let diagnosticRunId = 0;
  let correlation: ProductionDiagnosticCorrelation | undefined;
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
  const observe = (requestKind: "manual" | "verify-reconcile", observed: SynchronizationPlan): SynchronizationPlan => {
    correlation = Object.freeze({ diagnosticRunId: ++diagnosticRunId, requestKind, planId: observed.planId });
    return observed;
  };
  const controller: ValidationProductionControllerPort = {
    previewManual: async () => { calls.push("preview-manual"); return observe("manual", plan()); },
    previewVerifyReconcile: async () => { calls.push("preview-verify-reconcile"); return observe("verify-reconcile", plan()); },
    runAutomatic: async trigger => { calls.push(`automatic:${trigger}`); },
    request: async action => { calls.push(`request:${action.kind}`); return { status: "accepted" }; },
    requestPreviewAction: async action => { calls.push(`preview-action:${action.kind}`); return { status: "accepted" }; },
    currentDiagnosticCorrelation: () => correlation,
    diagnosticSnapshot: () => [],
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("No active production run evidence is expected in the local VH15 canary."); },
  };
  return { calls, runtime: { productController: () => controller }, controller };
}

const canaryDefinition: ValidationRunnerScenarioDefinition = {
  scenarioId: "C03",
  prerequisiteIds: [],
  steps: [
    {
      stepId: validationStepId("vh15-production-preview"),
      module: "production-path-driver",
      operation: "preview-manual",
      requiredCompletionProof: "operation-complete",
      input: { authorityCycleId: "vh15-canary-cycle" },
    },
    {
      stepId: validationStepId("vh15-objective-verification"),
      module: "state-convergence-verifier",
      operation: "canary-verify",
      requiredCompletionProof: "verification-passed",
    },
    {
      stepId: validationStepId("vh15-evidence"),
      module: "scenario-evidence-recorder",
      operation: "canary-evidence",
      requiredCompletionProof: "evidence-recorded",
    },
  ],
};

function runtimeOptions(fixture: ReturnType<typeof productionFixture>, state = new MemoryRunnerStateStore()) {
  return {
    productionRuntime: fixture.runtime,
    definitions: [canaryDefinition],
    stateStore: state,
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides: {
      "state-convergence-verifier": {
        async execute() {
          return { status: "completed" as const, evidenceRefs: [validationEvidenceRef("vh15:verified")] };
        },
      },
      "scenario-evidence-recorder": {
        async execute() {
          return { status: "completed" as const, evidenceRefs: [validationEvidenceRef("vh15:evidence")] };
        },
      },
    },
    currentDevice: () => validationDeviceIdentity("device:vh15", "windows-desktop"),
    createRunId: () => "run:vh15:canary",
  };
}


test("VH15 classifies validation device platforms deterministically", () => {
  assert.equal(classifyValidationDevicePlatform({
    isDesktopApp: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    maxTouchPoints: 0,
  }), "windows-desktop");

  assert.equal(classifyValidationDevicePlatform({
    isDesktopApp: false,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    maxTouchPoints: 5,
  }), "iphone");

  assert.equal(classifyValidationDevicePlatform({
    isDesktopApp: false,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    maxTouchPoints: 5,
  }), "ipad");

  assert.equal(classifyValidationDevicePlatform({
    isDesktopApp: false,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    maxTouchPoints: 5,
  }), "ipad");

  assert.equal(classifyValidationDevicePlatform({
    isDesktopApp: false,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    maxTouchPoints: 0,
  }), "iphone");
});

test("VH15 validation mode is disabled by default and cannot touch production or durable harness state", async () => {
  const fixture = productionFixture();
  const state = new MemoryRunnerStateStore();
  const runtime = new ValidationModeRuntime(runtimeOptions(fixture, state));

  assert.equal(runtime.enabled(), false);
  assert.deepEqual(runtime.scenarioIds(), []);
  assert.deepEqual(await runtime.startScenario("C03"), {
    status: "disabled",
    reason: "Validation mode is disabled.",
  });
  assert.deepEqual(await runtime.resumeCurrent(), {
    status: "disabled",
    reason: "Validation mode is disabled.",
  });
  assert.deepEqual(fixture.calls, []);
  assert.equal(state.loads, 0);
  assert.equal(state.writes, 0);
});

test("VH15 local canary reaches the real production-path driver only after explicit activation", async () => {
  const fixture = productionFixture();
  const runtime = new ValidationModeRuntime(runtimeOptions(fixture));

  runtime.setEnabled(true);
  assert.equal(runtime.enabled(), true);
  assert.ok(runtime.scenarioIds().includes("C03"));

  const result = await runtime.startScenario("C03");
  assert.equal(result.status, "runner");
  if (result.status !== "runner") return;
  assert.equal(result.result.status, "PASS");
  assert.deepEqual(fixture.calls, ["preview-manual"]);
  assert.equal(fixture.calls.some(call => call.includes("execute-plan")), false);
});

test("VH15 unbound sandbox/fault authority fails closed and disabling drops all harness controls", async () => {
  const fixture = productionFixture();
  const state = new MemoryRunnerStateStore();
  const dangerousDefinition: ValidationRunnerScenarioDefinition = {
    scenarioId: "C04",
    prerequisiteIds: [],
    steps: [
      {
        stepId: validationStepId("vh15-sandbox"),
        module: "safety-sandbox",
        operation: "attempt-sandbox-authority",
        requiredCompletionProof: "operation-complete",
      },
      {
        stepId: validationStepId("vh15-fault"),
        module: "transport-coverage-faults",
        operation: "attempt-fault-authority",
        requiredCompletionProof: "operation-complete",
      },
      {
        stepId: validationStepId("vh15-verify"),
        module: "state-convergence-verifier",
        operation: "verify",
        requiredCompletionProof: "verification-passed",
      },
      {
        stepId: validationStepId("vh15-record"),
        module: "scenario-evidence-recorder",
        operation: "record",
        requiredCompletionProof: "evidence-recorded",
      },
    ],
  };
  const runtime = new ValidationModeRuntime({
    ...runtimeOptions(fixture, state),
    definitions: [dangerousDefinition],
    createRunId: () => "run:vh15:isolation",
  });

  runtime.setEnabled(true);
  const result = await runtime.startScenario("C04");
  assert.equal(result.status, "runner");
  if (result.status !== "runner") return;
  assert.equal(result.result.status, "BLOCKED");
  if (result.result.status === "BLOCKED") {
    assert.match(result.result.reason.summary, /safety-sandbox runtime authority is not bound/);
  }
  assert.deepEqual(fixture.calls, []);

  runtime.setEnabled(false);
  assert.deepEqual(runtime.scenarioIds(), []);
  assert.deepEqual(await runtime.startScenario("C04"), {
    status: "disabled",
    reason: "Validation mode is disabled.",
  });
});

test("VH15 validation wrapper does not replace or intercept the ordinary production controller", async () => {
  const fixture = productionFixture();
  const runtime = new ValidationModeRuntime(runtimeOptions(fixture));

  const before = await fixture.controller.previewManual();
  assert.equal(before?.planId, "plan:vh15:canary");

  assert.equal(runtime.enabled(), false);
  await runtime.startScenario("C03");

  const after = await fixture.controller.previewManual();
  assert.equal(after?.planId, "plan:vh15:canary");
  assert.deepEqual(fixture.calls, ["preview-manual", "preview-manual"]);
});
