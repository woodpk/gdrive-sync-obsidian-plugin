import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type PlanOperationKind,
  type SynchronizationPlan,
} from "../src/contracts";
import type {
  ValidationProductionDriverRequest,
  ValidationProductionDriverResult,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type {
  ValidationFixtureDescriptor,
  ValidationFixtureSpec,
} from "../src/validation/fixture-manager";
import {
  C06_FIXTURE_ID,
  C06_FIXTURE_RELATIVE_PATH,
  C06WindowsCreateMobileDownloadScenario,
  type C06FixtureManager,
  type C06ProductionDriver,
  type C06StateVerifier,
} from "../src/validation/c06-windows-create-ios-download";
import {
  validationDeviceId,
  validationFixtureIdentity,
  validationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";

const RUN = validationRunIdentity("vh19-c06-test-run", "C06");
const WINDOWS_DEVICE = validationDeviceId("vh19-c06-windows");
const MOBILE_DEVICE = validationDeviceId("vh19-c06-mobile");
const PATH = contractId<"VaultPath">("validation/vh19/test-win-c06.md");
const HASH = contractId<"ContentHash">(
  "sha256:1111111111111111111111111111111111111111111111111111111111111111",
);

function fixtureDescriptor(): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(RUN, C06_FIXTURE_ID),
    relativePath: C06_FIXTURE_RELATIVE_PATH,
    path: PATH,
    kind: "text",
    purpose: "ordinary",
    version: 1,
    sizeBytes: 64,
    hash: HASH,
  });
}

class FakeFixtureManager implements C06FixtureManager {
  readonly createCalls: ValidationFixtureSpec[] = [];
  readonly hashCalls: string[] = [];

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    this.createCalls.push(spec);
    return fixtureDescriptor();
  }

  async hash(fixtureId: string) {
    this.hashCalls.push(fixtureId);
    return HASH;
  }
}

function plan(kind: PlanOperationKind, suffix: string, extraKinds: readonly PlanOperationKind[] = []): SynchronizationPlan {
  const operations = [kind, ...extraKinds].map((operationKind, index) => ({
    operationId: contractId<"OperationId">(`c06-${suffix}-op-${index}`),
    kind: operationKind,
    path: PATH,
    destructive: false,
    preconditions: [],
    reasons: [],
  }));
  return Object.freeze({
    planId: contractId<"PlanId">(`c06-${suffix}-plan`),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  });
}

class ScriptedProductionDriver implements C06ProductionDriver {
  readonly calls: ValidationProductionDriverRequest[] = [];

  constructor(private readonly previewPlan: SynchronizationPlan) {}

  async dispatch(request: ValidationProductionDriverRequest): Promise<ValidationProductionDriverResult> {
    this.calls.push(request);
    if (request.kind === "preview-manual") {
      return { status: "plan-observed", run: request.run, plan: this.previewPlan };
    }
    if (request.kind === "execute-asserted-plan") {
      assert.equal(request.authorization.planId, this.previewPlan.planId);
      assert.equal(request.authorization.executionAuthorized, true);
      return {
        status: "request-accepted",
        run: request.run,
        requestKind: "execute-asserted-plan",
        productionOutcomeEstablished: false,
      };
    }
    throw new Error(`Unexpected C06 production request: ${request.kind}`);
  }
}

function verificationReport(
  verdict: "pass" | "fail" | "blocked",
): ValidationStateConvergenceReport {
  return {
    result: { verdict, run: RUN },
    evidence: [],
  } as unknown as ValidationStateConvergenceReport;
}

class ScriptedVerifier implements C06StateVerifier {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  constructor(private readonly reports: readonly ValidationStateConvergenceReport[]) {}

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    const report = this.reports[this.requests.length - 1];
    if (!report) throw new Error("No scripted C06 verifier report remains.");
    return report;
  }
}

test("VH19 C06 succeeds through fixture, Windows upload, mobile download-create, and convergence seams", async () => {
  const fixture = new FakeFixtureManager();
  const windows = new ScriptedProductionDriver(plan("upload-create", "windows"));
  const mobile = new ScriptedProductionDriver(plan("download-create", "mobile"));
  const verifier = new ScriptedVerifier([
    verificationReport("pass"),
    verificationReport("pass"),
  ]);

  const result = await new C06WindowsCreateMobileDownloadScenario({
    run: RUN,
    windowsDeviceId: WINDOWS_DEVICE,
    mobileDeviceId: MOBILE_DEVICE,
    windowsFixture: fixture,
    windowsProduction: windows,
    mobileProduction: mobile,
    verifier,
  }).run();

  assert.equal(result.status, "PASS");
  assert.deepEqual(
    fixture.createCalls.map(spec => ({
      fixtureId: spec.fixtureId,
      relativePath: spec.relativePath,
      kind: spec.kind,
      version: spec.version,
      textVariant: spec.textVariant,
      purpose: spec.purpose,
    })),
    [{
      fixtureId: C06_FIXTURE_ID,
      relativePath: "test-win-c06.md",
      kind: "text",
      version: 1,
      textVariant: "base",
      purpose: "ordinary",
    }],
  );
  assert.deepEqual(fixture.hashCalls, [C06_FIXTURE_ID]);
  assert.deepEqual(windows.calls.map(call => call.kind), ["preview-manual", "execute-asserted-plan"]);
  assert.deepEqual(mobile.calls.map(call => call.kind), ["preview-manual", "execute-asserted-plan"]);
  assert.equal(verifier.requests.length, 2);

  const remoteContent = verifier.requests[0]!.state.find(item => item.kind === "remote-content");
  assert.ok(remoteContent);
  assert.equal(remoteContent.path, PATH);
  assert.equal(remoteContent.content.hash, HASH);
  assert.equal(remoteContent.content.sizeBytes, 64);
  assert.equal(remoteContent.remoteObjectId, undefined);

  const final = verifier.requests[1]!;
  assert.equal(final.state.filter(item => item.kind === "local-content").length, 2);
  assert.equal(final.state.filter(item => item.kind === "remote-content").length, 1);
  assert.equal(final.state.filter(item => item.kind === "base-authority").length, 2);
  assert.equal(final.state.filter(item => item.kind === "mapping-or-tombstone").length, 2);
  assert.equal(final.state.filter(item => item.kind === "durable-intent-or-effect").length, 2);
  assert.equal(final.convergence.some(item => item.kind === "cross-device-content"), true);
  assert.equal(final.convergence.some(item => item.kind === "cross-device-authority"), true);
});

test("VH19 C06 hard-stops before mobile sync when single-remote-object proof detects a duplicate", async () => {
  const windows = new ScriptedProductionDriver(plan("upload-create", "windows-duplicate"));
  const mobile = new ScriptedProductionDriver(plan("download-create", "mobile-never"));
  const verifier = new ScriptedVerifier([verificationReport("fail")]);

  const result = await new C06WindowsCreateMobileDownloadScenario({
    run: RUN,
    windowsDeviceId: WINDOWS_DEVICE,
    mobileDeviceId: MOBILE_DEVICE,
    windowsFixture: new FakeFixtureManager(),
    windowsProduction: windows,
    mobileProduction: mobile,
    verifier,
  }).run();

  assert.equal(result.status, "FAIL");
  if (result.status !== "FAIL") throw new Error("Expected C06 duplicate proof to fail.");
  assert.equal(result.stage, "remote-single-object");
  assert.deepEqual(windows.calls.map(call => call.kind), ["preview-manual", "execute-asserted-plan"]);
  assert.equal(mobile.calls.length, 0);

  const remoteContent = verifier.requests[0]!.state.find(item => item.kind === "remote-content");
  assert.ok(remoteContent);
  assert.equal(remoteContent.remoteObjectId, undefined);
});

test("VH19 C06 hard-stops before execution when the mobile plan is not exactly download-create", async () => {
  const windows = new ScriptedProductionDriver(plan("upload-create", "windows-unexpected-mobile"));
  const mobile = new ScriptedProductionDriver(plan("download-update", "mobile-unexpected"));
  const verifier = new ScriptedVerifier([verificationReport("pass")]);

  const result = await new C06WindowsCreateMobileDownloadScenario({
    run: RUN,
    windowsDeviceId: WINDOWS_DEVICE,
    mobileDeviceId: MOBILE_DEVICE,
    windowsFixture: new FakeFixtureManager(),
    windowsProduction: windows,
    mobileProduction: mobile,
    verifier,
  }).run();

  assert.equal(result.status, "FAIL");
  if (result.status !== "FAIL") throw new Error("Expected C06 unexpected mobile plan to fail.");
  assert.equal(result.stage, "mobile-plan");
  assert.deepEqual(mobile.calls.map(call => call.kind), ["preview-manual"]);
  assert.equal(verifier.requests.length, 1);
});
