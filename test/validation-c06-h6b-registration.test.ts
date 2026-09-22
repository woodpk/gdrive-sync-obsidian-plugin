import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type PlanOperationKind,
  type ProductSurfaceState,
  type SynchronizationPlan,
} from "../src/contracts";
import {
  validationEvidenceRef,
  type ValidationEvidenceRef,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationFixtureSpec } from "../src/validation/fixture-manager";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import {
  validationDeviceId,
  validationFixtureIdentity,
  validationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerPersistentState,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  C06_FIXTURE_ID,
  C06_FIXTURE_PATH,
  C06_FIXTURE_RELATIVE_PATH,
  C06_MOBILE_AUTHORITY_CYCLE_ID,
  C06_SCENARIO_DEFINITION,
  C06_WINDOWS_AUTHORITY_CYCLE_ID,
  createC06ValidationModeRegistration,
  type C06ValidationModeRegistrationDependencies,
} from "../src/validation/scenarios/c06-windows-create-ios-download";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";

const RUN_ID = "run:vh19-c06-correction";
const RUN = validationRunIdentity(RUN_ID, "C06");
const WINDOWS_DEVICE = validationDeviceId("device:vh19-c06:windows");
const MOBILE_DEVICE = validationDeviceId("device:vh19-c06:mobile");
const HASH = contractId<"ContentHash">(
  "sha256:2222222222222222222222222222222222222222222222222222222222222222",
);
const REMOTE_ID = contractId<"RemoteObjectId">("remote:vh19-c06");

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

function operation(
  kind: PlanOperationKind,
  suffix: string,
): SynchronizationPlan["operations"][number] {
  return {
    operationId: contractId<"OperationId">(`operation:${suffix}`),
    kind,
    path: C06_FIXTURE_PATH,
    targetSide: kind.startsWith("upload-") ? "remote" : "local",
    ...(kind.startsWith("download-") ? { remoteObjectId: REMOTE_ID } : {}),
    destructive: false,
    preconditions: [],
    reasons: [],
  };
}

function plan(
  planId: string,
  kind: PlanOperationKind,
): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(planId),
    trigger: "manual",
    operations: [operation(kind, planId)],
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
      const observed = plans[previewIndex];
      previewIndex += 1;
      return observed;
    },
    previewVerifyReconcile: async () => {
      calls.push("preview-verify-reconcile");
      return undefined;
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
    currentRunEvidence: () => {
      throw new Error("C06 correction tests do not require active production run evidence.");
    },
  };

  return {
    calls,
    executedPlanIds,
    runtime: { productController: () => controller },
  };
}

function passReport(
  request: ValidationStateConvergenceRequest,
  label: string,
): ValidationStateConvergenceReport {
  const ref = validationEvidenceRef(`c06:test:${label}`);
  return {
    result: {
      verdict: "pass",
      run: request.run,
      state: { verdict: "pass", observations: [] },
      convergence: { verdict: "pass", observations: [] },
    },
    evidence: [{ ref, source: "convergence", summary: label }],
  } as unknown as ValidationStateConvergenceReport;
}

function failReport(
  request: ValidationStateConvergenceRequest,
  label: string,
): ValidationStateConvergenceReport {
  const ref = validationEvidenceRef(`c06:test:${label}`);
  return {
    result: {
      verdict: "fail",
      run: request.run,
      state: { verdict: "fail", observations: [], failures: [] },
      convergence: { verdict: "pass", observations: [] },
    },
    evidence: [{ ref, source: "remote", summary: label }],
  } as unknown as ValidationStateConvergenceReport;
}

class ScriptedVerifier {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  constructor(private readonly outcomes: readonly ("pass" | "fail")[]) {}

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    const index = this.requests.length - 1;
    const outcome = this.outcomes[index] ?? "pass";
    return outcome === "pass"
      ? passReport(request, `verification-${index + 1}`)
      : failReport(request, `duplicate-remote-${index + 1}`);
  }
}

function fixtureDescriptor() {
  return Object.freeze({
    identity: validationFixtureIdentity(RUN, C06_FIXTURE_ID),
    relativePath: C06_FIXTURE_RELATIVE_PATH,
    path: C06_FIXTURE_PATH,
    kind: "text" as const,
    purpose: "ordinary" as const,
    version: 1,
    sizeBytes: 73,
    hash: HASH,
  });
}

function dependencyFixture(outcomes: readonly ("pass" | "fail")[] = ["pass", "pass"]) {
  const createCalls: ValidationFixtureSpec[] = [];
  const hashCalls: string[] = [];
  const verifier = new ScriptedVerifier(outcomes);
  const handoffs: Array<{ readonly remoteObjectId: string }> = [];
  const recordedEvidence: Array<{ readonly remoteObjectId: string }> = [];
  const resolvedPaths: string[] = [];

  const dependencies: C06ValidationModeRegistrationDependencies = {
    windowsDeviceId: WINDOWS_DEVICE,
    mobileDeviceId: MOBILE_DEVICE,
    windowsFixtures: {
      async create(spec) {
        createCalls.push(spec);
        return fixtureDescriptor();
      },
      async hash(fixtureId) {
        hashCalls.push(fixtureId);
        return HASH;
      },
    },
    verifier,
    remoteObjects: {
      async resolveRemoteObjectId(input) {
        resolvedPaths.push(String(input.path));
        return REMOTE_ID;
      },
    },
    handoff: {
      async handoffToMobile(input) {
        handoffs.push({ remoteObjectId: String(input.remoteObjectId) });
        return [validationEvidenceRef("c06:test:handoff")];
      },
    },
    evidence: {
      async record(input) {
        recordedEvidence.push({ remoteObjectId: String(input.remoteObjectId) });
        return [validationEvidenceRef("c06:test:evidence")];
      },
    },
  };

  return {
    dependencies,
    verifier,
    createCalls,
    hashCalls,
    handoffs,
    recordedEvidence,
    resolvedPaths,
  };
}

function runtimeFor(
  production: ReturnType<typeof productionFixture>,
  dependencies: C06ValidationModeRegistrationDependencies,
) {
  const registration = createC06ValidationModeRegistration(dependencies);
  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: registration.definitions,
    moduleOverrides: registration.moduleOverrides,
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    createRunId: () => RUN_ID,
  });
  return { runtime, registration };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
  expected: "PASS" | "FAIL" | "BLOCKED",
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected actual H6B runner result.");
  assert.equal(result.result.status, expected);
  return result.result;
}

test("VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles", async () => {
  const windowsPlan = plan("plan:c06:windows", "upload-create");
  const mobilePlan = plan("plan:c06:mobile", "download-create");
  const production = productionFixture([windowsPlan, mobilePlan]);
  const fixture = dependencyFixture();
  const { runtime, registration } = runtimeFor(production, fixture.dependencies);

  assert.equal(registration.moduleOverrides["production-path-driver"], undefined);
  assert.equal(registration.moduleOverrides["plan-assertion-engine"], undefined);
  assert.deepEqual(runtime.installedScenarioIds(), []);

  runtime.setEnabled(true);
  assert.deepEqual(runtime.installedScenarioIds(), ["C06"]);

  const result = runnerResult(await runtime.startScenario("C06"), "PASS");
  assert.equal(result.state.run.runId, RUN_ID);
  assert.deepEqual(production.calls, [
    "preview-manual",
    "preview-action:execute-plan",
    "preview-manual",
    "preview-action:execute-plan",
  ]);
  assert.deepEqual(production.executedPlanIds, [
    String(windowsPlan.planId),
    String(mobilePlan.planId),
  ]);

  assert.equal(fixture.createCalls.length, 1);
  assert.deepEqual(
    {
      fixtureId: fixture.createCalls[0]!.fixtureId,
      relativePath: fixture.createCalls[0]!.relativePath,
      kind: fixture.createCalls[0]!.kind,
      version: fixture.createCalls[0]!.version,
      textVariant: fixture.createCalls[0]!.textVariant,
      purpose: fixture.createCalls[0]!.purpose,
    },
    {
      fixtureId: C06_FIXTURE_ID,
      relativePath: "test-win-c06.md",
      kind: "text",
      version: 1,
      textVariant: "base",
      purpose: "ordinary",
    },
  );
  assert.deepEqual(fixture.hashCalls, [C06_FIXTURE_ID]);
  assert.deepEqual(fixture.resolvedPaths, [String(C06_FIXTURE_PATH)]);
  assert.deepEqual(fixture.handoffs, [{ remoteObjectId: String(REMOTE_ID) }]);
  assert.deepEqual(fixture.recordedEvidence, [{ remoteObjectId: String(REMOTE_ID) }]);
  assert.equal(fixture.verifier.requests.length, 2);

  const preMobileRemote = fixture.verifier.requests[0]!.state.find(
    postcondition => postcondition.kind === "remote-content",
  );
  assert.ok(preMobileRemote);
  assert.equal(preMobileRemote.remoteObjectId, undefined);
  assert.equal(preMobileRemote.path, C06_FIXTURE_PATH);
  assert.equal(preMobileRemote.content.hash, HASH);

  const finalAuthority = fixture.verifier.requests[1]!.convergence.find(
    postcondition => postcondition.kind === "cross-device-authority",
  );
  assert.ok(finalAuthority);
  assert.equal(finalAuthority.expectedRemoteObjectId, REMOTE_ID);
  assert.deepEqual(finalAuthority.deviceIds, [WINDOWS_DEVICE, MOBILE_DEVICE]);

  const executeSteps = C06_SCENARIO_DEFINITION.steps.filter(
    step => step.operation === "execute-asserted-plan",
  );
  assert.equal(executeSteps.length, 2);
  assert.deepEqual(executeSteps.map(step => step.input), [
    { authorityCycleId: C06_WINDOWS_AUTHORITY_CYCLE_ID },
    { authorityCycleId: C06_MOBILE_AUTHORITY_CYCLE_ID },
  ]);
  for (const step of executeSteps) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(step.input as object, "authorization"),
      false,
    );
  }
});

test("VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution", async () => {
  const windowsPlan = plan("plan:c06:duplicate:windows", "upload-create");
  const mobilePlan = plan("plan:c06:duplicate:mobile-never", "download-create");
  const production = productionFixture([windowsPlan, mobilePlan]);
  const fixture = dependencyFixture(["fail"]);
  const { runtime } = runtimeFor(production, fixture.dependencies);
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C06"), "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /remote single-object verification fail/i);
  }

  assert.deepEqual(production.calls, [
    "preview-manual",
    "preview-action:execute-plan",
  ]);
  assert.deepEqual(production.executedPlanIds, [String(windowsPlan.planId)]);
  assert.equal(fixture.handoffs.length, 0);
  assert.equal(fixture.recordedEvidence.length, 0);

  const remoteProof = fixture.verifier.requests[0]!.state.find(
    postcondition => postcondition.kind === "remote-content",
  );
  assert.ok(remoteProof);
  assert.equal(remoteProof.remoteObjectId, undefined);
});

test("VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution", async () => {
  const windowsPlan = plan("plan:c06:unexpected:windows", "upload-create");
  const unexpectedMobilePlan = plan("plan:c06:unexpected:mobile", "download-update");
  const production = productionFixture([windowsPlan, unexpectedMobilePlan]);
  const fixture = dependencyFixture(["pass"]);
  const { runtime } = runtimeFor(production, fixture.dependencies);
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C06"), "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /download-create|download-update|Expected operation/i);
  }

  assert.deepEqual(production.calls, [
    "preview-manual",
    "preview-action:execute-plan",
    "preview-manual",
  ]);
  assert.deepEqual(production.executedPlanIds, [String(windowsPlan.planId)]);
  assert.equal(fixture.verifier.requests.length, 1);
  assert.equal(fixture.recordedEvidence.length, 0);
});
