import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type PlanOperationKind,
  type ProductSurfaceState,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import {
  validationAssertionGroupResult,
  validationEvidenceRef,
  validationVerificationResult,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type {
  ValidationFixtureDescriptor,
  ValidationFixtureSpec,
  ValidationTextVariant,
} from "../src/validation/fixture-manager";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import {
  validationDeviceIdentity,
  validationFixtureIdentity,
  validationRunIdentity,
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
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";
import {
  C07_AUTHORITY_CYCLES,
  C07_OPERATIONS,
  C07_SENTINEL_FIXTURE_ID,
  C07_SENTINEL_RELATIVE_PATH,
  C07_TARGET_FIXTURE_ID,
  C07_TARGET_RELATIVE_PATH,
  createC07WindowsUpdateMobileDownloadScenario,
  type C07CrossDeviceHandoffPort,
  type C07EvidenceRecorderPort,
  type C07FixtureManagerPort,
  type C07VerifierPort,
} from "../src/validation/scenarios/c07-windows-update-ios-download";

const RUN = validationRunIdentity("run:vh20:c07:correction-01", "C07");
const WINDOWS = validationDeviceIdentity("device:c07:windows", "windows-desktop");
const MOBILE = validationDeviceIdentity("device:c07:mobile", "iphone");
const TARGET_PATH = contractId<"VaultPath">("validation/c07/test-win-c06.md") as VaultPath;
const SENTINEL_PATH = contractId<"VaultPath">("validation/c07/c07-unrelated-sentinel.md") as VaultPath;
const TARGET_HASH_V1 = contractId<"ContentHash">(
  "sha256:1111111111111111111111111111111111111111111111111111111111111111",
);
const TARGET_HASH_V2 = contractId<"ContentHash">(
  "sha256:2222222222222222222222222222222222222222222222222222222222222222",
);
const SENTINEL_HASH = contractId<"ContentHash">(
  "sha256:3333333333333333333333333333333333333333333333333333333333333333",
);

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

function descriptor(
  fixtureId: string,
  relativePath: string,
  path: VaultPath,
  version: number,
  hash: typeof TARGET_HASH_V1,
): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(RUN, fixtureId),
    relativePath,
    path,
    kind: "text",
    purpose: "ordinary",
    version,
    sizeBytes: 128 + version,
    hash,
  });
}

class FakeFixtureManager implements C07FixtureManagerPort {
  readonly createCalls: ValidationFixtureSpec[] = [];
  readonly editCalls: Array<{ fixtureId: string; version: number; textVariant?: ValidationTextVariant }> = [];
  private target = descriptor(C07_TARGET_FIXTURE_ID, C07_TARGET_RELATIVE_PATH, TARGET_PATH, 1, TARGET_HASH_V1);
  private sentinel = descriptor(C07_SENTINEL_FIXTURE_ID, C07_SENTINEL_RELATIVE_PATH, SENTINEL_PATH, 1, SENTINEL_HASH);

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    this.createCalls.push(spec);
    if (spec.fixtureId === C07_TARGET_FIXTURE_ID) return this.target;
    if (spec.fixtureId === C07_SENTINEL_FIXTURE_ID) return this.sentinel;
    throw new Error("Unexpected C07 fixture ID.");
  }

  async edit(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    this.editCalls.push({ fixtureId, version, ...(textVariant === undefined ? {} : { textVariant }) });
    if (fixtureId !== C07_TARGET_FIXTURE_ID) throw new Error("Only the C07 target may be edited.");
    this.target = descriptor(
      C07_TARGET_FIXTURE_ID,
      C07_TARGET_RELATIVE_PATH,
      TARGET_PATH,
      version,
      TARGET_HASH_V2,
    );
    return this.target;
  }

  async hash(fixtureId: string) {
    if (fixtureId === C07_TARGET_FIXTURE_ID) return this.target.hash!;
    if (fixtureId === C07_SENTINEL_FIXTURE_ID) return this.sentinel.hash!;
    throw new Error("Unexpected C07 hash fixture ID.");
  }
}

function operation(
  kind: PlanOperationKind,
  path: VaultPath,
  suffix: string,
  targetSide?: "local" | "remote",
) {
  return Object.freeze({
    operationId: contractId<"OperationId">(`op:c07:${suffix}`),
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    destructive: false,
    preconditions: [],
    reasons: [],
  });
}

function plan(
  planId: string,
  operations: SynchronizationPlan["operations"],
): SynchronizationPlan {
  return Object.freeze({
    planId: contractId<"PlanId">(planId),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  });
}

function baselineWindowsPlan(id = "plan:c07:baseline-windows"): SynchronizationPlan {
  return plan(id, [
    operation("upload-create", TARGET_PATH, "baseline-windows-target", "remote"),
    operation("upload-create", SENTINEL_PATH, "baseline-windows-sentinel", "remote"),
  ]);
}

function baselineMobilePlan(id = "plan:c07:baseline-mobile"): SynchronizationPlan {
  return plan(id, [
    operation("download-create", TARGET_PATH, "baseline-mobile-target", "local"),
    operation("download-create", SENTINEL_PATH, "baseline-mobile-sentinel", "local"),
  ]);
}

function windowsUpdatePlan(): SynchronizationPlan {
  return plan("plan:c07:windows-update", [
    operation("upload-update", TARGET_PATH, "windows-update-target", "remote"),
    operation("noop", SENTINEL_PATH, "windows-update-sentinel-noop"),
  ]);
}

function mobileUpdatePlan(): SynchronizationPlan {
  return plan("plan:c07:mobile-download-update", [
    operation("download-update", TARGET_PATH, "mobile-update-target", "local"),
    operation("noop", SENTINEL_PATH, "mobile-update-sentinel-noop"),
  ]);
}

function productionFixture(plans: readonly SynchronizationPlan[]) {
  let previewIndex = 0;
  const calls: string[] = [];
  const executedPlanIds: string[] = [];
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      calls.push("preview-manual");
      const observed = plans[previewIndex];
      previewIndex += 1;
      return observed;
    },
    previewVerifyReconcile: async () => {
      calls.push("preview-verify-reconcile");
      const observed = plans[previewIndex];
      previewIndex += 1;
      return observed;
    },
    runAutomatic: async trigger => { calls.push(`automatic:${trigger}`); },
    request: async action => {
      calls.push(`request:${action.kind}`);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push(`execute:${String(action.planId)}`);
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("No direct run-evidence read is expected in C07 focused tests."); },
  };

  return {
    calls,
    executedPlanIds,
    runtime: { productController: () => controller },
  };
}

function passingReport(request: ValidationStateConvergenceRequest): ValidationStateConvergenceReport {
  const stateRef = validationEvidenceRef("vh20:c07:state-proof");
  const convergenceRef = validationEvidenceRef("vh20:c07:convergence-proof");
  const stateObservations = request.state.map(postcondition => ({
    status: "satisfied" as const,
    assertion: postcondition.assertion,
    evidenceRefs: [stateRef] as const,
  }));
  const convergenceObservations = request.convergence.map(postcondition => ({
    status: "satisfied" as const,
    assertion: postcondition.assertion,
    evidenceRefs: [convergenceRef] as const,
  }));
  const state = validationAssertionGroupResult(
    stateObservations as [typeof stateObservations[number], ...typeof stateObservations[number][]],
  );
  const convergence = validationAssertionGroupResult(
    convergenceObservations as [typeof convergenceObservations[number], ...typeof convergenceObservations[number][]],
  );
  return {
    result: validationVerificationResult(request.run, state, convergence),
    evidence: [
      { ref: stateRef, source: "authority", summary: "C07 state postconditions observed." },
      { ref: convergenceRef, source: "convergence", summary: "C07 convergence postconditions observed." },
    ],
  };
}

class PassingVerifier implements C07VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    return passingReport(request);
  }
}

class RecordingHandoffs implements C07CrossDeviceHandoffPort {
  readonly phases: string[] = [];

  async handoff(input: Parameters<C07CrossDeviceHandoffPort["handoff"]>[0]) {
    this.phases.push(input.phase);
    return [validationEvidenceRef(`vh20:c07:handoff:${input.phase}`)];
  }
}

class RecordingEvidence implements C07EvidenceRecorderPort {
  readonly calls: Array<Parameters<C07EvidenceRecorderPort["record"]>[0]> = [];

  async record(input: Parameters<C07EvidenceRecorderPort["record"]>[0]) {
    this.calls.push(input);
    return [validationEvidenceRef("vh20:c07:scenario-evidence")];
  }
}

function subject(
  plans: readonly SynchronizationPlan[],
  definitionTransform?: (definition: ValidationRunnerScenarioDefinition) => ValidationRunnerScenarioDefinition,
) {
  const fixtures = new FakeFixtureManager();
  const verifier = new PassingVerifier();
  const handoffs = new RecordingHandoffs();
  const evidence = new RecordingEvidence();
  const packageBinding = createC07WindowsUpdateMobileDownloadScenario({
    targetPath: TARGET_PATH,
    sentinelPath: SENTINEL_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixtures: fixtures,
    verifier,
    handoffs,
    evidence,
  });
  const definition = definitionTransform?.(packageBinding.definition) ?? packageBinding.definition;
  const production = productionFixture(plans);
  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites: packageBinding.prerequisites,
    moduleOverrides: packageBinding.moduleOverrides,
    currentDevice: () => WINDOWS,
    createRunId: () => String(RUN.runId),
  });
  return { runtime, packageBinding, production, fixtures, verifier, handoffs, evidence, definition };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected C07 runner result.");
  return result.result;
}

test("VH20 C07 uses real H6B fixed plan handoff for trusted baseline, Windows update, mobile download-update, and exact convergence", async () => {
  const s = subject([
    baselineWindowsPlan(),
    baselineMobilePlan(),
    windowsUpdatePlan(),
    mobileUpdatePlan(),
  ]);

  assert.equal("production-path-driver" in s.packageBinding.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in s.packageBinding.moduleOverrides, false);

  const mobileAssertion = s.definition.steps.find(step => String(step.stepId) === "c07-mobile-update-assert");
  assert.ok(mobileAssertion);
  assert.equal(mobileAssertion.module, "plan-assertion-engine");
  assert.equal(mobileAssertion.operation, "assert-observed-plan");
  const mobileInput = mobileAssertion.input as {
    readonly authorityCycleId: string;
    readonly expectation: { readonly expectedOperations: ReadonlyArray<{ readonly kind: string; readonly path: VaultPath }> };
  };
  assert.equal(mobileInput.authorityCycleId, C07_AUTHORITY_CYCLES.mobileDownloadUpdate);
  assert.deepEqual(
    mobileInput.expectation.expectedOperations.map(operation => [operation.kind, operation.path]),
    [["download-update", TARGET_PATH]],
  );

  const executeSteps = s.definition.steps.filter(step => step.operation === "execute-asserted-plan");
  assert.equal(executeSteps.length, 4);
  for (const step of executeSteps) {
    const input = step.input as Record<string, unknown>;
    assert.equal(Object.prototype.hasOwnProperty.call(input, "authorization"), false);
    assert.equal(typeof input.authorityCycleId, "string");
  }

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("C07"));
  assert.equal(result.status, "PASS");

  assert.deepEqual(s.production.executedPlanIds, [
    "plan:c07:baseline-windows",
    "plan:c07:baseline-mobile",
    "plan:c07:windows-update",
    "plan:c07:mobile-download-update",
  ]);
  assert.deepEqual(s.handoffs.phases, ["baseline-to-mobile", "update-to-mobile"]);
  assert.deepEqual(s.fixtures.editCalls, [{
    fixtureId: C07_TARGET_FIXTURE_ID,
    version: 2,
    textVariant: "non-overlap-a",
  }]);

  assert.equal(s.verifier.requests.length, 2);
  const final = s.verifier.requests[1]!;
  const mobileTarget = final.state.find(postcondition =>
    postcondition.kind === "local-content"
    && postcondition.deviceId === MOBILE.deviceId
    && postcondition.path === TARGET_PATH
  );
  assert.ok(mobileTarget && mobileTarget.kind === "local-content");
  assert.equal(mobileTarget.content.hash, TARGET_HASH_V2);

  const remoteTarget = final.state.find(postcondition =>
    postcondition.kind === "remote-content" && postcondition.path === TARGET_PATH
  );
  assert.ok(remoteTarget && remoteTarget.kind === "remote-content");
  assert.equal(remoteTarget.content.hash, TARGET_HASH_V2);

  const mobileBase = final.state.find(postcondition =>
    postcondition.kind === "base-authority"
    && postcondition.deviceId === MOBILE.deviceId
    && postcondition.path === TARGET_PATH
  );
  assert.ok(mobileBase && mobileBase.kind === "base-authority");
  assert.equal(mobileBase.expectedContent?.hash, TARGET_HASH_V2);

  const unrelated = final.state.find(postcondition => postcondition.kind === "unrelated-mutation-absence");
  assert.ok(unrelated && unrelated.kind === "unrelated-mutation-absence");
  assert.equal(unrelated.local.length, 2);
  assert.equal(unrelated.remote.length, 1);
  assert.equal(unrelated.local[0]?.content?.hash, SENTINEL_HASH);
  assert.equal(unrelated.remote[0]?.content?.hash, SENTINEL_HASH);

  assert.equal(s.evidence.calls.length, 1);
  assert.equal(s.evidence.calls[0]?.target.hash, TARGET_HASH_V2);
  assert.equal(s.evidence.calls[0]?.sentinel.hash, SENTINEL_HASH);
});

test("VH20 C07 unexpected production plan hard-stops in the fixed H6B assertion before any production execution", async () => {
  const wrong = plan("plan:c07:unexpected", [
    operation("upload-update", TARGET_PATH, "wrong-target", "remote"),
    operation("upload-create", SENTINEL_PATH, "sentinel", "remote"),
  ]);
  const s = subject([wrong]);

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("C07"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /upload-create|upload-update|Expected operation|forbidden/i);
  }
  assert.deepEqual(s.production.executedPlanIds, []);
  assert.deepEqual(s.production.calls, ["preview-manual"]);
  assert.equal(s.verifier.requests.length, 0);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH20 C07 stale same-cycle re-preview invalidates assertion-derived authorization and hard-stops before execution", async () => {
  const first = baselineWindowsPlan("plan:c07:stale-a");
  const second = baselineWindowsPlan("plan:c07:stale-b");
  const s = subject([first, second], definition => {
    const steps = [...definition.steps];
    const executeIndex = steps.findIndex(step => String(step.stepId) === "c07-establish-windows-execute");
    assert.ok(executeIndex > 0);
    steps.splice(executeIndex, 0, {
      stepId: validationStepId("c07-test-stale-repreview"),
      module: "production-path-driver",
      operation: "preview-manual",
      requiredCompletionProof: "operation-complete",
      input: { authorityCycleId: C07_AUTHORITY_CYCLES.establishWindows },
    });
    return Object.freeze({
      ...definition,
      steps: Object.freeze(steps),
    });
  });

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("C07"));
  assert.equal(result.status, "BLOCKED");
  if (result.status === "BLOCKED") {
    assert.match(result.reason.summary, /No asserted execution authorization/);
  }
  assert.deepEqual(s.production.executedPlanIds, []);
  assert.deepEqual(s.production.calls, ["preview-manual", "preview-manual"]);
  assert.equal(s.fixtures.createCalls.length, 2);
  assert.equal(s.verifier.requests.length, 0);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH20 C07 package keeps the authoritative logical fixture name and C07-only module ownership", () => {
  const s = subject([
    baselineWindowsPlan(),
    baselineMobilePlan(),
    windowsUpdatePlan(),
    mobileUpdatePlan(),
  ]);
  assert.equal(C07_TARGET_RELATIVE_PATH, "test-win-c06.md");
  assert.equal(C07_OPERATIONS.editWindowsFixture, "c07-edit-windows-fixture");
  assert.deepEqual(Object.keys(s.packageBinding.moduleOverrides).sort(), [
    "cross-device-coordinator",
    "fixture-manager",
    "scenario-evidence-recorder",
    "state-convergence-verifier",
  ]);
});
