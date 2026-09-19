import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type PlannedOperation,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import {
  validationAssertionGroupResult,
  validationEvidenceRef,
  validationVerificationResult,
  type ValidationAssertionObservation,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationFixtureDescriptor } from "../src/validation/fixture-manager";
import {
  C09_SENTINEL_FIXTURE_ID,
  C09_SENTINEL_RELATIVE_PATH,
  C09_TARGET_FIXTURE_ID,
  C09_TARGET_RELATIVE_PATH,
  c09TrustedFixtureSet,
  createC09WindowsDeleteIosTrashRegistration,
} from "../src/validation/scenarios/c09-windows-delete-ios-trash";
import type {
  ValidationRunnerPersistentState,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  validationDeviceIdentity,
  validationFixtureIdentity,
  validationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationProductionControllerPort,
  ValidationProductionRuntimePort,
} from "../src/validation/production-path-driver";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";

const runId = "run:vh22:c09:correction";
const run = validationRunIdentity(runId, "C09");
const windowsDevice = validationDeviceIdentity("device:c09:windows", "windows-desktop");
const mobileDevice = validationDeviceIdentity("device:c09:iphone", "iphone");

const targetRemoteObjectId = contractId<"RemoteObjectId">("drive:c09:target");
const sentinelRemoteObjectId = contractId<"RemoteObjectId">("drive:c09:sentinel");
const wrongRemoteObjectId = contractId<"RemoteObjectId">("drive:c09:wrong");
const targetHash = contractId<"ContentHash">(`sha256:${"a".repeat(64)}`);
const sentinelHash = contractId<"ContentHash">(`sha256:${"b".repeat(64)}`);

const trustedFixture = c09TrustedFixtureSet({
  targetHash,
  targetSizeBytes: 19,
  targetRemoteObjectId,
  sentinelHash,
  sentinelSizeBytes: 23,
  sentinelRemoteObjectId,
});

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

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly destructive?: boolean;
  readonly remoteObjectId?: RemoteObjectId;
}): PlannedOperation {
  return {
    operationId: contractId<"OperationId">(input.id),
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{ code: "vh22-c09-correction-test", summary: "Focused C09 correction plan." }],
  };
}

function plan(id: string, operations: readonly PlannedOperation[]): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(id),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function windowsDeletePlan(
  remoteObjectId: RemoteObjectId = targetRemoteObjectId,
  extra: readonly PlannedOperation[] = [],
): SynchronizationPlan {
  return plan("plan:c09:windows-delete", [
    operation({
      id: "op:c09:windows-trash-target",
      kind: "trash-remote",
      path: trustedFixture.target.path,
      targetSide: "remote",
      destructive: true,
      remoteObjectId,
    }),
    operation({
      id: "op:c09:windows-sentinel-noop",
      kind: "noop",
      path: trustedFixture.sentinel.path,
    }),
    ...extra,
  ]);
}

function mobileDeletePlan(): SynchronizationPlan {
  return plan("plan:c09:mobile-delete", [
    operation({
      id: "op:c09:mobile-trash-target",
      kind: "trash-local",
      path: trustedFixture.target.path,
      targetSide: "local",
      destructive: true,
    }),
    operation({
      id: "op:c09:mobile-sentinel-noop",
      kind: "noop",
      path: trustedFixture.sentinel.path,
    }),
  ]);
}

class FakeProductionController implements ValidationProductionControllerPort {
  readonly calls: string[] = [];
  readonly executedPlanIds: string[] = [];
  private readonly surface: ProductSurfaceState = {
    status: { kind: "idle-ready" },
    conflicts: [],
  };

  constructor(
    readonly label: "windows" | "mobile",
    private readonly previewPlan: SynchronizationPlan,
  ) {}

  async previewManual(): Promise<SynchronizationPlan> {
    this.calls.push("preview-manual");
    return this.previewPlan;
  }

  async previewVerifyReconcile(): Promise<SynchronizationPlan> {
    this.calls.push("preview-verify-reconcile");
    return this.previewPlan;
  }

  async runAutomatic(trigger: "startup-resume" | "local-change" | "periodic"): Promise<void> {
    this.calls.push(`automatic:${trigger}`);
  }

  async request(): Promise<{ readonly status: "accepted" }> {
    this.calls.push("request");
    return { status: "accepted" };
  }

  async requestPreviewAction(
    action: Parameters<ValidationProductionControllerPort["requestPreviewAction"]>[0],
  ): Promise<{ readonly status: "accepted" } | { readonly status: "rejected"; readonly reason: string }> {
    if (action.kind !== "execute-plan") {
      return { status: "rejected", reason: "focused C09 test accepts only fixed execute-plan dispatch" };
    }
    this.calls.push(`execute-plan:${String(action.planId)}`);
    if (action.planId !== this.previewPlan.planId) {
      return { status: "rejected", reason: "plan ID does not match this participant's exact preview" };
    }
    this.executedPlanIds.push(String(action.planId));
    return { status: "accepted" };
  }

  currentSurface(): ProductSurfaceState {
    return this.surface;
  }

  onSurface(): () => void {
    return () => undefined;
  }

  currentRunEvidence(): never {
    throw new Error("Focused C09 correction tests do not require production run evidence.");
  }
}

class SwitchingProductionRuntime implements ValidationProductionRuntimePort {
  active: "windows" | "mobile" = "windows";

  constructor(
    readonly windows: FakeProductionController,
    readonly mobile: FakeProductionController,
  ) {}

  productController(): ValidationProductionControllerPort {
    return this.active === "windows" ? this.windows : this.mobile;
  }
}

class CapturingVerifier {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    const stateObservations = request.state.map((postcondition, index) => ({
      status: "satisfied" as const,
      assertion: postcondition.assertion,
      evidenceRefs: [validationEvidenceRef(`c09-correction:state:${this.requests.length}:${index + 1}`)],
    })) as unknown as [ValidationAssertionObservation, ...ValidationAssertionObservation[]];
    const convergenceObservations = request.convergence.map((postcondition, index) => ({
      status: "satisfied" as const,
      assertion: postcondition.assertion,
      evidenceRefs: [validationEvidenceRef(`c09-correction:convergence:${this.requests.length}:${index + 1}`)],
    })) as unknown as [ValidationAssertionObservation, ...ValidationAssertionObservation[]];

    const state = validationAssertionGroupResult(stateObservations);
    const convergence = validationAssertionGroupResult(convergenceObservations);
    return {
      result: validationVerificationResult(request.run, state, convergence),
      evidence: [{
        ref: validationEvidenceRef(`c09-correction:verification:${this.requests.length}`),
        source: "convergence",
        summary: "Focused C09 correction verification evidence.",
      }],
    };
  }
}

function deleteDescriptor(): ValidationFixtureDescriptor {
  return {
    identity: validationFixtureIdentity(run, C09_TARGET_FIXTURE_ID),
    relativePath: C09_TARGET_RELATIVE_PATH,
    path: trustedFixture.target.path,
    kind: "text",
    purpose: "deletion",
    version: 1,
    sizeBytes: trustedFixture.target.sizeBytes,
    hash: trustedFixture.target.hash,
  };
}

function createHarness(input?: {
  readonly windowsPlan?: SynchronizationPlan;
}) {
  const windowsController = new FakeProductionController(
    "windows",
    input?.windowsPlan ?? windowsDeletePlan(),
  );
  const mobileController = new FakeProductionController("mobile", mobileDeletePlan());
  const productionRuntime = new SwitchingProductionRuntime(windowsController, mobileController);
  const verifier = new CapturingVerifier();
  const deletedFixtureIds: string[] = [];
  const handoffs: string[] = [];

  const registration = createC09WindowsDeleteIosTrashRegistration({
    trustedFixture,
    windowsFixtures: {
      async delete(fixtureId) {
        assert.equal(productionRuntime.active, "windows");
        deletedFixtureIds.push(String(fixtureId));
        return deleteDescriptor();
      },
    },
    verifier,
    handoff: {
      async handoffToMobile(input) {
        assert.equal(productionRuntime.active, "windows");
        assert.equal(input.targetRemoteObjectId, targetRemoteObjectId);
        handoffs.push("windows-to-mobile");
        productionRuntime.active = "mobile";
        return [validationEvidenceRef("c09-correction:handoff:mobile")];
      },
    },
    windowsDevice,
    mobileDevice,
    build: { version: "vh22-c09-correction", commitSha: "focused-test" },
    capturedAt: () => "2026-09-18T23:00:00.000Z",
  });

  const runtime = new ValidationModeRuntime({
    productionRuntime,
    definitions: [registration.definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides: registration.moduleOverrides,
    currentDevice: () => windowsDevice,
    createRunId: () => runId,
  });

  return {
    registration,
    runtime,
    productionRuntime,
    windowsController,
    mobileController,
    verifier,
    deletedFixtureIds,
    handoffs,
  };
}

test("VH22 C09 correction executes exact-object Windows then mobile deletion only through fixed H6B preview/assert/execute handoff", async () => {
  const harness = createHarness();

  assert.equal(harness.registration.moduleOverrides["production-path-driver"], undefined);
  assert.equal(harness.registration.moduleOverrides["plan-assertion-engine"], undefined);

  harness.runtime.setEnabled(true);
  const result = await harness.runtime.startScenario("C09");

  assert.equal(result.status, "runner");
  if (result.status !== "runner") return;
  assert.equal(result.result.status, "PASS");

  assert.deepEqual(harness.deletedFixtureIds, [C09_TARGET_FIXTURE_ID]);
  assert.deepEqual(harness.handoffs, ["windows-to-mobile"]);
  assert.deepEqual(harness.windowsController.calls, [
    "preview-manual",
    "execute-plan:plan:c09:windows-delete",
  ]);
  assert.deepEqual(harness.mobileController.calls, [
    "preview-manual",
    "execute-plan:plan:c09:mobile-delete",
  ]);
  assert.deepEqual(harness.windowsController.executedPlanIds, ["plan:c09:windows-delete"]);
  assert.deepEqual(harness.mobileController.executedPlanIds, ["plan:c09:mobile-delete"]);

  assert.equal(harness.verifier.requests.length, 2);
  const final = harness.verifier.requests[1]!;

  const remoteTrash = final.state.find(value => value.kind === "live-trash-absence-state");
  assert.ok(remoteTrash && remoteTrash.kind === "live-trash-absence-state");
  assert.equal(remoteTrash.expectedState, "trashed");
  assert.equal(remoteTrash.remoteObjectId, targetRemoteObjectId);

  const tombstones = final.state.filter(value => value.kind === "mapping-or-tombstone");
  assert.equal(tombstones.length, 2);
  assert.ok(tombstones.every(value =>
    value.kind === "mapping-or-tombstone"
    && value.expected === "tombstone"
    && value.remoteObjectId === targetRemoteObjectId
    && value.deletedOn === "both"
  ));

  const livePath = final.convergence.find(value => value.kind === "cross-device-path");
  assert.ok(livePath && livePath.kind === "cross-device-path");
  assert.equal(livePath.expected, "absent");

  const sentinel = final.state.find(value => value.kind === "unrelated-mutation-absence");
  assert.ok(sentinel && sentinel.kind === "unrelated-mutation-absence");
  assert.equal(sentinel.local.length, 2);
  assert.equal(sentinel.remote.length, 1);
  assert.equal(sentinel.remote[0]?.path, contractId<"VaultPath">(C09_SENTINEL_RELATIVE_PATH));
  assert.equal(sentinel.remote[0]?.remoteObjectId, sentinelRemoteObjectId);

  assert.equal(harness.registration.evidenceRecord()?.verdict.status, "PASS");
});

test("VH22 C09 correction rejects a wrong-object destructive Windows plan before fixed production execution", async () => {
  const harness = createHarness({
    windowsPlan: windowsDeletePlan(wrongRemoteObjectId),
  });

  harness.runtime.setEnabled(true);
  const result = await harness.runtime.startScenario("C09");

  assert.equal(result.status, "runner");
  if (result.status !== "runner") return;
  assert.equal(result.result.status, "FAIL");
  if (result.result.status === "FAIL") {
    assert.match(result.result.reason.summary, /remoteObjectId=drive:c09:target/);
  }

  assert.deepEqual(harness.windowsController.calls, ["preview-manual"]);
  assert.deepEqual(harness.windowsController.executedPlanIds, []);
  assert.deepEqual(harness.mobileController.calls, []);
  assert.equal(harness.verifier.requests.length, 1);
  assert.equal(harness.registration.evidenceRecord(), undefined);
});

test("VH22 C09 correction hard-stops an unexpected destructive mutation before fixed production execution", async () => {
  const unexpected = operation({
    id: "op:c09:unexpected-sentinel-trash",
    kind: "trash-remote",
    path: trustedFixture.sentinel.path,
    targetSide: "remote",
    destructive: true,
    remoteObjectId: sentinelRemoteObjectId,
  });
  const harness = createHarness({
    windowsPlan: windowsDeletePlan(targetRemoteObjectId, [unexpected]),
  });

  harness.runtime.setEnabled(true);
  const result = await harness.runtime.startScenario("C09");

  assert.equal(result.status, "runner");
  if (result.status !== "runner") return;
  assert.equal(result.result.status, "FAIL");
  if (result.result.status === "FAIL") {
    assert.match(result.result.reason.summary, /outside the scenario contract|Expected 1 destructive operation/);
  }

  assert.deepEqual(harness.windowsController.calls, ["preview-manual"]);
  assert.deepEqual(harness.windowsController.executedPlanIds, []);
  assert.deepEqual(harness.mobileController.calls, []);
  assert.equal(harness.verifier.requests.length, 1);
  assert.equal(harness.registration.evidenceRecord(), undefined);
});

test("VH22 C09 correction canonical trusted fixture identity remains deterministic and run-independent", () => {
  assert.equal(trustedFixture.target.fixtureId, C09_TARGET_FIXTURE_ID);
  assert.equal(String(trustedFixture.target.path), C09_TARGET_RELATIVE_PATH);
  assert.equal(trustedFixture.sentinel.fixtureId, C09_SENTINEL_FIXTURE_ID);
  assert.equal(String(trustedFixture.sentinel.path), C09_SENTINEL_RELATIVE_PATH);
});
