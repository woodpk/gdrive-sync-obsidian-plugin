import assert from "node:assert/strict";
import test from "node:test";
import type {
  ManagedRemoteIdentity,
  ProductSurfaceState,
  SynchronizationPlan,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import {
  validationAssertionGroupResult,
  validationEvidenceRef,
  validationVerificationResult,
  type ValidationProductionDriverResult,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationFixtureDescriptor } from "../src/validation/fixture-manager";
import {
  ValidationProductionPathDriver,
  type ValidationProductionControllerPort,
} from "../src/validation/production-path-driver";
import {
  validationDeviceId,
  validationFixtureIdentity,
  validationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import {
  createValidationScenarioRunnerCore,
} from "../src/validation/scenario-runner-core";
import {
  VALIDATION_RUNNER_MODULE_IDS,
  type ValidationRunnerResult,
} from "../src/validation/scenario-runner-contracts";
import {
  createValidationRunnerModuleAdapter,
  type ValidationRunnerApprovedModuleDelegate,
  type ValidationRunnerApprovedModuleDelegates,
  type ValidationRunnerApprovedModuleResult,
  type ValidationRunnerModuleOperationRequest,
  type ValidationRunnerPrerequisiteDelegate,
} from "../src/validation/scenario-runner-module-adapter";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import {
  C03_FIXTURE_RELATIVE_PATH,
  C03_LIVE_PACKAGE,
  C03_OPERATIONS,
  C03_PREREQUISITE_ID,
  C03_SCENARIO_DEFINITION,
  C03PlanGate,
  c03PlanMismatchSummary,
  type C03TrustedFixtureLineage,
} from "../src/validation/scenarios/c03-ios-update-windows-download";
import {
  CanaryMemoryDurableStatePort,
  CanaryScriptedHumanCheckpointPort,
} from "./validation-scenario-runner-canary-support";

const run = validationRunIdentity("run:vh16:c03", "C03");
const fixturePath = contractId<"VaultPath">(`validation/${C03_FIXTURE_RELATIVE_PATH}`) as VaultPath;
const unrelatedPath = contractId<"VaultPath">("validation/protected-unrelated.md") as VaultPath;
const remoteObjectId = contractId<"RemoteObjectId">("remote:c03:fixture");
const unrelatedRemoteObjectId = contractId<"RemoteObjectId">("remote:c03:unrelated");
const remoteIdentity: ManagedRemoteIdentity = {
  rootId: contractId<"RemoteObjectId">("remote:c03:root"),
  vaultIdentity: contractId<"VaultIdentity">("vault:c03"),
  protocolVersion: contractId<"ProtocolVersion">("1"),
};
const mobileDeviceId = validationDeviceId("device:c03:mobile");
const windowsDeviceId = validationDeviceId("device:c03:windows");
const baseHash = contractId<"ContentHash">("sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
const editedHash = contractId<"ContentHash">("sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
const unrelatedHash = contractId<"ContentHash">("sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc");

function baselineFixture(): ValidationFixtureDescriptor {
  return {
    identity: validationFixtureIdentity(run, "c03-fixture"),
    relativePath: C03_FIXTURE_RELATIVE_PATH,
    path: fixturePath,
    kind: "text",
    purpose: "ordinary",
    version: 1,
    sizeBytes: 64,
    hash: baseHash,
  };
}

function editedFixture(): ValidationFixtureDescriptor {
  return {
    ...baselineFixture(),
    version: 2,
    sizeBytes: 72,
    hash: editedHash,
  };
}

function lineage(): C03TrustedFixtureLineage {
  return {
    run,
    fixture: baselineFixture(),
    mobileDeviceId,
    windowsDeviceId,
    remoteIdentity,
    remoteObjectId,
    prerequisiteEvidenceRefs: [validationEvidenceRef("vh16:c03:trusted-lineage")],
    unrelatedLocal: [{
      deviceId: windowsDeviceId,
      path: unrelatedPath,
      state: "file",
      content: { hash: unrelatedHash, sizeBytes: 17 },
    }],
    unrelatedRemote: [{
      path: unrelatedPath,
      state: "live",
      remoteObjectId: unrelatedRemoteObjectId,
      content: { hash: unrelatedHash, sizeBytes: 17 },
    }],
  };
}

function operation(
  kind: "noop" | "upload-update" | "download-update" | "upload-create",
  path: VaultPath,
  targetSide: "local" | "remote" | undefined,
  operationSuffix: string,
) {
  return {
    operationId: contractId<"OperationId">(`op:c03:${operationSuffix}`),
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    ...(kind === "noop" ? {} : { remoteObjectId }),
    destructive: false,
    preconditions: [],
    reasons: [],
  } as const;
}

function mobilePlan(): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">("plan:c03:mobile"),
    trigger: "manual",
    operations: [
      operation("upload-update", fixturePath, "remote", "mobile-upload"),
      operation("noop", unrelatedPath, undefined, "mobile-background-noop"),
    ],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function windowsPlan(kind: "download-update" | "upload-update" = "download-update"): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(`plan:c03:windows:${kind}`),
    trigger: "manual",
    operations: [
      operation(kind, fixturePath, kind === "download-update" ? "local" : "remote", `windows-${kind}`),
      operation("noop", unrelatedPath, undefined, "windows-background-noop"),
    ],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

interface ProductionFixture {
  readonly driver: ValidationProductionPathDriver;
  readonly calls: string[];
}

function productionFixture(plan: SynchronizationPlan, label: string): ProductionFixture {
  const calls: string[] = [];
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
  const controller: ValidationProductionControllerPort = {
    previewManual: async () => { calls.push(`${label}:preview-manual`); return plan; },
    previewVerifyReconcile: async () => { calls.push(`${label}:preview-verify-reconcile`); return plan; },
    runAutomatic: async trigger => { calls.push(`${label}:automatic:${trigger}`); },
    request: async action => { calls.push(`${label}:request:${action.kind}`); return { status: "accepted" }; },
    requestPreviewAction: async action => { calls.push(`${label}:execute:${action.kind}:${String(action.planId)}`); return { status: "accepted" }; },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => ({ managedRemote: remoteIdentity, remoteEnumerationComplete: true }),
  };
  return {
    calls,
    driver: new ValidationProductionPathDriver({ productController: () => controller }),
  };
}

class PassingVerifier {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    const stateRef = validationEvidenceRef("vh16:c03:state-proof");
    const convergenceRef = validationEvidenceRef("vh16:c03:convergence-proof");
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
    const state = validationAssertionGroupResult(stateObservations as [typeof stateObservations[number], ...typeof stateObservations[number][]]);
    const convergence = validationAssertionGroupResult(convergenceObservations as [typeof convergenceObservations[number], ...typeof convergenceObservations[number][]]);
    return {
      result: validationVerificationResult(request.run, state, convergence),
      evidence: [
        { ref: stateRef, source: "authority", summary: "C03 trusted state postconditions observed." },
        { ref: convergenceRef, source: "convergence", summary: "C03 cross-device convergence observed." },
      ],
    };
  }
}

function driverStop(result: ValidationProductionDriverResult): ValidationRunnerApprovedModuleResult {
  if (result.status === "request-failed") {
    return { status: "failed", summary: result.reason, evidenceRefs: [] };
  }
  if (result.status === "request-rejected" || result.status === "no-plan-observed") {
    return { status: "blocked", summary: result.reason, evidenceRefs: [] };
  }
  return { status: "blocked", summary: `Unexpected production result ${result.status}.`, evidenceRefs: [] };
}

class C03IntegrationRouter {
  readonly gate = new C03PlanGate(lineage());
  readonly edited = editedFixture();
  readonly verifier = new PassingVerifier();
  readonly evidenceCalls: string[] = [];
  readonly handoffCalls: string[] = [];
  readonly mobile: ProductionFixture;
  readonly windows: ProductionFixture;
  private observedMobilePlan?: SynchronizationPlan;
  private observedWindowsPlan?: SynchronizationPlan;
  private verificationPassed = false;

  constructor(observedWindowsPlan: SynchronizationPlan) {
    this.mobile = productionFixture(mobilePlan(), "mobile");
    this.windows = productionFixture(observedWindowsPlan, "windows");
  }

  readonly prerequisites: ValidationRunnerPrerequisiteDelegate = {
    evaluate: async input => {
      assert.deepEqual(input.prerequisiteIds, [C03_PREREQUISITE_ID]);
      assert.deepEqual(input.run, run);
      return [this.gate.prerequisiteResult()];
    },
  };

  delegates(): Partial<Record<(typeof VALIDATION_RUNNER_MODULE_IDS)[number], ValidationRunnerApprovedModuleDelegate>> {
    return {
      "fixture-manager": { execute: request => this.fixture(request) },
      "production-path-driver": { execute: request => this.production(request) },
      "plan-assertion-engine": { execute: request => this.planAssertion(request) },
      "cross-device-coordinator": { execute: request => this.handoff(request) },
      "state-convergence-verifier": { execute: request => this.verify(request) },
      "scenario-evidence-recorder": { execute: request => this.evidence(request) },
    };
  }

  private async fixture(request: ValidationRunnerModuleOperationRequest): Promise<ValidationRunnerApprovedModuleResult> {
    assert.equal(request.operation, C03_OPERATIONS.mobileEdit);
    this.gate.acceptMobileEdit(this.edited);
    return { status: "completed", evidenceRefs: [] };
  }

  private async dispatchPreview(
    request: ValidationRunnerModuleOperationRequest,
    driver: ValidationProductionPathDriver,
  ): Promise<ValidationProductionDriverResult> {
    return await driver.dispatch({ kind: "preview-manual", run: request.run, stepId: request.stepId });
  }

  private async dispatchExecution(
    request: ValidationRunnerModuleOperationRequest,
    driver: ValidationProductionPathDriver,
    authorization: ReturnType<C03PlanGate["mobileAuthorization"]>,
  ): Promise<ValidationProductionDriverResult> {
    return await driver.dispatch({ kind: "execute-asserted-plan", run: request.run, stepId: request.stepId, authorization });
  }

  private async production(request: ValidationRunnerModuleOperationRequest): Promise<ValidationRunnerApprovedModuleResult> {
    if (request.operation === C03_OPERATIONS.mobilePreview) {
      const result = await this.dispatchPreview(request, this.mobile.driver);
      if (result.status !== "plan-observed") return driverStop(result);
      this.observedMobilePlan = result.plan;
      return { status: "completed", evidenceRefs: [] };
    }
    if (request.operation === C03_OPERATIONS.mobileExecute) {
      const authorization = this.gate.mobileAuthorization();
      const result = await this.dispatchExecution(request, this.mobile.driver, authorization);
      if (result.status !== "request-accepted") return driverStop(result);
      this.gate.markMobileExecutionAccepted(authorization);
      return { status: "completed", evidenceRefs: [] };
    }
    if (request.operation === C03_OPERATIONS.windowsPreview) {
      const result = await this.dispatchPreview(request, this.windows.driver);
      if (result.status !== "plan-observed") return driverStop(result);
      this.observedWindowsPlan = result.plan;
      return { status: "completed", evidenceRefs: [] };
    }
    if (request.operation === C03_OPERATIONS.windowsExecute) {
      const authorization = this.gate.windowsAuthorization();
      const result = await this.dispatchExecution(request, this.windows.driver, authorization);
      if (result.status !== "request-accepted") return driverStop(result);
      this.gate.markWindowsExecutionAccepted(authorization);
      return { status: "completed", evidenceRefs: [] };
    }
    return { status: "blocked", summary: `Unexpected C03 production operation ${request.operation}.`, evidenceRefs: [] };
  }

  private async planAssertion(request: ValidationRunnerModuleOperationRequest): Promise<ValidationRunnerApprovedModuleResult> {
    const result = request.operation === C03_OPERATIONS.mobilePlanAssertion
      ? this.observedMobilePlan
        ? this.gate.assertMobilePlan(this.observedMobilePlan)
        : undefined
      : request.operation === C03_OPERATIONS.windowsPlanAssertion
        ? this.observedWindowsPlan
          ? this.gate.assertWindowsPlan(this.observedWindowsPlan)
          : undefined
        : undefined;
    if (!result) return { status: "blocked", summary: "C03 plan assertion has no observed production plan.", evidenceRefs: [] };
    if (result.status === "mismatch") {
      return { status: "failed", summary: c03PlanMismatchSummary(result), evidenceRefs: [] };
    }
    return { status: "completed", evidenceRefs: [] };
  }

  private async handoff(request: ValidationRunnerModuleOperationRequest): Promise<ValidationRunnerApprovedModuleResult> {
    assert.equal(request.operation, C03_OPERATIONS.handoffToWindows);
    this.gate.markHandoffToWindows();
    this.handoffCalls.push(request.operation);
    return { status: "completed", evidenceRefs: [validationEvidenceRef("vh16:c03:handoff")] };
  }

  private async verify(request: ValidationRunnerModuleOperationRequest): Promise<ValidationRunnerApprovedModuleResult> {
    assert.equal(request.operation, C03_OPERATIONS.verify);
    const verificationRequest = this.gate.verificationRequest({
      deviceId: windowsDeviceId,
      component: "sync.controller",
      event: "sync-run-complete",
      expectedFields: { result: "complete" },
    });
    const report = await this.verifier.verify(verificationRequest);
    if (report.result.verdict !== "pass") {
      return { status: report.result.verdict === "fail" ? "failed" : "blocked", summary: "C03 postcondition verification did not pass.", evidenceRefs: [] };
    }
    this.verificationPassed = true;
    return { status: "completed", evidenceRefs: report.evidence.map(item => item.ref) };
  }

  private async evidence(request: ValidationRunnerModuleOperationRequest): Promise<ValidationRunnerApprovedModuleResult> {
    assert.equal(request.operation, C03_OPERATIONS.evidence);
    if (!this.verificationPassed) return { status: "blocked", summary: "C03 evidence cannot close before objective verification passes.", evidenceRefs: [] };
    this.evidenceCalls.push(request.operation);
    return { status: "completed", evidenceRefs: [validationEvidenceRef("vh16:c03:evidence-recorded")] };
  }
}

function completeModuleMap(router: C03IntegrationRouter): ValidationRunnerApprovedModuleDelegates {
  const blocked: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      return { status: "blocked", summary: `Unbound test module operation ${request.operation}.`, evidenceRefs: [] };
    },
  };
  const map = Object.fromEntries(VALIDATION_RUNNER_MODULE_IDS.map(moduleId => [moduleId, blocked])) as Record<
    (typeof VALIDATION_RUNNER_MODULE_IDS)[number],
    ValidationRunnerApprovedModuleDelegate
  >;
  Object.assign(map, router.delegates());
  return map;
}

async function executeScenario(router: C03IntegrationRouter): Promise<ValidationRunnerResult> {
  const modules = createValidationRunnerModuleAdapter({
    prerequisites: router.prerequisites,
    modules: completeModuleMap(router),
  });
  const runner = createValidationScenarioRunnerCore({
    state: new CanaryMemoryDurableStatePort(),
    modules,
    humanCheckpoints: new CanaryScriptedHumanCheckpointPort(),
  });
  let result = await runner.startScenario({ run, definition: C03_SCENARIO_DEFINITION });
  for (let transitions = 0; transitions < 32 && result.status === "RUNNING"; transitions += 1) {
    result = await runner.advance({ run, expectedRevision: result.state.revision });
  }
  return result;
}

test("VH16 C03 package maps one-to-one to the authoritative live package and harness modules", () => {
  assert.equal(C03_LIVE_PACKAGE, "C03-ios-update-windows-download.md");
  assert.equal(C03_SCENARIO_DEFINITION.scenarioId, "C03");
  assert.deepEqual(C03_SCENARIO_DEFINITION.prerequisiteIds, ["C02:PASS"]);
  assert.deepEqual(C03_SCENARIO_DEFINITION.steps.map(step => [step.module, step.operation]), [
    ["fixture-manager", C03_OPERATIONS.mobileEdit],
    ["production-path-driver", C03_OPERATIONS.mobilePreview],
    ["plan-assertion-engine", C03_OPERATIONS.mobilePlanAssertion],
    ["production-path-driver", C03_OPERATIONS.mobileExecute],
    ["cross-device-coordinator", C03_OPERATIONS.handoffToWindows],
    ["production-path-driver", C03_OPERATIONS.windowsPreview],
    ["plan-assertion-engine", C03_OPERATIONS.windowsPlanAssertion],
    ["production-path-driver", C03_OPERATIONS.windowsExecute],
    ["state-convergence-verifier", C03_OPERATIONS.verify],
    ["scenario-evidence-recorder", C03_OPERATIONS.evidence],
  ]);
});

test("VH16 C03 success uses production preview/assert/execute seams and requests exact convergence proof", async () => {
  const router = new C03IntegrationRouter(windowsPlan());
  const result = await executeScenario(router);

  assert.equal(result.status, "PASS");
  assert.deepEqual(router.mobile.calls, [
    "mobile:preview-manual",
    "mobile:execute:execute-plan:plan:c03:mobile",
  ]);
  assert.deepEqual(router.windows.calls, [
    "windows:preview-manual",
    "windows:execute:execute-plan:plan:c03:windows:download-update",
  ]);
  assert.deepEqual(router.handoffCalls, [C03_OPERATIONS.handoffToWindows]);
  assert.deepEqual(router.evidenceCalls, [C03_OPERATIONS.evidence]);
  assert.equal(router.verifier.requests.length, 1);

  const verification = router.verifier.requests[0]!;
  assert.deepEqual(verification.state.map(item => item.kind), [
    "local-content",
    "remote-content",
    "remote-identity",
    "base-authority",
    "mapping-or-tombstone",
    "durable-intent-or-effect",
    "unrelated-mutation-absence",
    "terminal-product-result",
  ]);
  assert.deepEqual(verification.convergence.map(item => item.kind), [
    "cross-device-content",
    "cross-device-authority",
  ]);
  const windowsBytes = verification.state.find(item => item.kind === "local-content");
  assert.ok(windowsBytes && windowsBytes.kind === "local-content");
  assert.equal(windowsBytes.content.hash, editedHash);
  assert.equal(windowsBytes.content.sizeBytes, 72);
  const baseCommit = verification.state.find(item => item.kind === "base-authority");
  assert.ok(baseCommit && baseCommit.kind === "base-authority");
  assert.equal(baseCommit.expectedRemoteObjectId, remoteObjectId);
  assert.equal(baseCommit.expectedContent?.hash, editedHash);
  const unrelated = verification.state.find(item => item.kind === "unrelated-mutation-absence");
  assert.ok(unrelated && unrelated.kind === "unrelated-mutation-absence");
  assert.equal(unrelated.local.length, 1);
  assert.equal(unrelated.remote.length, 1);
});

test("VH16 C03 unexpected Windows plan fails closed before production execution", async () => {
  const router = new C03IntegrationRouter(windowsPlan("upload-update"));
  const result = await executeScenario(router);

  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.equal(result.reason.kind, "module-failed");
    assert.match(result.reason.summary, /Expected operation was not observed|forbidden operation kind|outside the scenario contract/i);
  }
  assert.deepEqual(router.windows.calls, ["windows:preview-manual"]);
  assert.equal(router.verifier.requests.length, 0);
  assert.deepEqual(router.evidenceCalls, []);
});
