import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentHash,
  type OperationId,
  type PlanId,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import {
  validationEvidenceRef,
  type ValidationProductionDriverRequest,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationFixtureDescriptor } from "../src/validation/fixture-manager";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import {
  validationDeviceId,
  validationDeviceIdentity,
  validationFixtureIdentity,
  validationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerPersistentState,
  ValidationRunnerPrerequisiteResult,
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type { ValidationRunnerApprovedModuleDelegate } from "../src/validation/scenario-runner-module-adapter";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import type { ValidationStateConvergenceRequest } from "../src/validation/state-convergence-verifier";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";
import {
  C05_C04_RENAMED_RELATIVE_PATH,
  C05_MOBILE_AUTHORITY_CYCLE_ID,
  C05_WINDOWS_AUTHORITY_CYCLE_ID,
  createC05RuntimeModuleOverrides,
  createC05ScenarioDefinition,
  createC05ScenarioRegistration,
  type C05ScenarioAuthority,
  type C05StateVerifierPort,
} from "../src/validation/scenarios/c05-ios-delete-windows-trash";

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

const run = validationRunIdentity("run:c05:correction", "C05");
const mobileDeviceId = validationDeviceId("device:c05:mobile");
const windowsDeviceId = validationDeviceId("device:c05:windows");
const targetPath = contractId<"VaultPath">(`__validation/${C05_C04_RENAMED_RELATIVE_PATH}`) as VaultPath;
const unrelatedPath = contractId<"VaultPath">("__validation/c05-unrelated.md") as VaultPath;
const targetRemoteObjectId = contractId<"RemoteObjectId">("remote:c05:target") as RemoteObjectId;
const unrelatedRemoteObjectId = contractId<"RemoteObjectId">("remote:c05:unrelated") as RemoteObjectId;
const contentHash = contractId<"ContentHash">(`sha256:${"a".repeat(64)}`) as ContentHash;

function trustedFixture(): ValidationFixtureDescriptor {
  return {
    identity: validationFixtureIdentity(run, "fixture:c04-lineage"),
    relativePath: C05_C04_RENAMED_RELATIVE_PATH,
    path: targetPath,
    kind: "text",
    purpose: "ordinary",
    version: 4,
    sizeBytes: 256,
    hash: contentHash,
  };
}

function authority(): C05ScenarioAuthority {
  return {
    trustedFixture: {
      descriptor: trustedFixture(),
      remoteObjectId: targetRemoteObjectId,
    },
    mobileDeviceId,
    windowsDeviceId,
    unrelated: {
      local: [{
        deviceId: windowsDeviceId,
        path: unrelatedPath,
        state: "file",
        content: { hash: contentHash, sizeBytes: 256 },
      }],
      remote: [{
        path: unrelatedPath,
        state: "live",
        remoteObjectId: unrelatedRemoteObjectId,
        content: { hash: contentHash, sizeBytes: 256 },
      }],
    },
  };
}

function operation(
  kind: "trash-remote" | "trash-local",
  path: VaultPath,
  index: number,
  remoteObjectId?: RemoteObjectId,
) {
  return {
    operationId: contractId<"OperationId">(`operation:c05:${kind}:${index}`) as OperationId,
    kind,
    path,
    targetSide: kind === "trash-remote" ? "remote" as const : "local" as const,
    ...(remoteObjectId ? { remoteObjectId } : {}),
    destructive: true,
    preconditions: [],
    reasons: [{
      code: kind === "trash-remote" ? "attested-local-deletion" : "attested-remote-deletion",
      summary: "production deletion authority",
    }],
  };
}

function plan(
  id: string,
  operations: SynchronizationPlan["operations"],
): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(id) as PlanId,
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function productionFixture(plans: readonly SynchronizationPlan[]) {
  let previewIndex = 0;
  const calls: string[] = [];
  const previewedPlanIds: string[] = [];
  const executedPlanIds: string[] = [];
  let physicalExecutionRequests = 0;
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      calls.push("preview-manual");
      const observed = plans[Math.min(previewIndex, plans.length - 1)];
      previewIndex += 1;
      if (observed) previewedPlanIds.push(String(observed.planId));
      return observed;
    },
    previewVerifyReconcile: async () => {
      calls.push("preview-verify-reconcile");
      return undefined;
    },
    runAutomatic: async trigger => {
      calls.push(`automatic:${trigger}`);
    },
    request: async action => {
      calls.push(`request:${action.kind}`);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push(`preview-action:${action.kind}`);
      physicalExecutionRequests += 1;
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => {
      throw new Error("C05 correction tests do not require active production run evidence.");
    },
  };

  return {
    calls,
    previewedPlanIds,
    executedPlanIds,
    physicalExecutionRequests: () => physicalExecutionRequests,
    runtime: { productController: () => controller },
  };
}

class CapturingVerifier implements C05StateVerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest) {
    this.requests.push(request);
    return {
      result: { verdict: "pass" as const },
      evidence: [{
        ref: validationEvidenceRef(`c05:verification:${this.requests.length}`),
      }],
    };
  }
}

function satisfiedPrerequisites(input: {
  readonly prerequisiteIds: readonly string[];
}): readonly ValidationRunnerPrerequisiteResult[] {
  return input.prerequisiteIds.map(prerequisiteId => ({
    prerequisiteId,
    status: "satisfied",
    summary: `${prerequisiteId} satisfied by deterministic C05 harness setup.`,
    evidenceRefs: [validationEvidenceRef(`c05:prerequisite:${prerequisiteId}`)],
  }));
}

const crossDeviceCoordinator: ValidationRunnerApprovedModuleDelegate = {
  async execute(request) {
    if (request.operation !== "c05-handoff-to-windows") {
      return { status: "blocked", summary: "unexpected C05 handoff operation", evidenceRefs: [] };
    }
    return { status: "completed", evidenceRefs: [validationEvidenceRef("c05:handoff")] };
  },
};

const evidenceRecorder: ValidationRunnerApprovedModuleDelegate = {
  async execute(request) {
    if (request.operation !== "c05-record-evidence") {
      return { status: "blocked", summary: "unexpected C05 evidence operation", evidenceRefs: [] };
    }
    return { status: "completed", evidenceRefs: [validationEvidenceRef("c05:evidence")] };
  },
};

function runtimeFor(input: {
  readonly production: ReturnType<typeof productionFixture>;
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly verifier: CapturingVerifier;
  readonly deleted?: string[];
}) {
  const deleted = input.deleted ?? [];
  const a = authority();
  const overrides = createC05RuntimeModuleOverrides(a, {
    fixtureManager: {
      async delete(fixtureId: string) {
        deleted.push(fixtureId);
        return a.trustedFixture.descriptor;
      },
    },
    verifier: input.verifier,
    crossDeviceCoordinator,
    evidenceRecorder,
  });

  const runtime = new ValidationModeRuntime({
    productionRuntime: input.production.runtime,
    definitions: [input.definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites: {
      async evaluate(request) {
        return satisfiedPrerequisites(request);
      },
    },
    moduleOverrides: overrides,
    currentDevice: () => validationDeviceIdentity(String(windowsDeviceId), "windows-desktop"),
    createRunId: () => String(run.runId),
  });
  return { runtime, overrides, deleted };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected H6B runner result.");
  return result.result;
}

test("VH18 correction registers C05 one-to-one and expresses both fixed authority cycles without caller authorization", () => {
  const a = authority();
  const registration = createC05ScenarioRegistration(a);
  assert.equal(registration.scenarioId, "C05");
  assert.equal(registration.definition.scenarioId, "C05");

  const productionSteps = registration.definition.steps.filter(
    step => step.module === "production-path-driver" || step.module === "plan-assertion-engine",
  );
  assert.deepEqual(
    productionSteps.map(step => [step.module, step.operation]),
    [
      ["production-path-driver", "preview-manual"],
      ["plan-assertion-engine", "assert-observed-plan"],
      ["production-path-driver", "execute-asserted-plan"],
      ["production-path-driver", "preview-manual"],
      ["plan-assertion-engine", "assert-observed-plan"],
      ["production-path-driver", "execute-asserted-plan"],
    ],
  );

  const cycleIds = productionSteps.map(step => {
    const input = step.input as { readonly authorityCycleId?: string } | undefined;
    return input?.authorityCycleId;
  });
  assert.deepEqual(cycleIds, [
    C05_MOBILE_AUTHORITY_CYCLE_ID,
    C05_MOBILE_AUTHORITY_CYCLE_ID,
    C05_MOBILE_AUTHORITY_CYCLE_ID,
    C05_WINDOWS_AUTHORITY_CYCLE_ID,
    C05_WINDOWS_AUTHORITY_CYCLE_ID,
    C05_WINDOWS_AUTHORITY_CYCLE_ID,
  ]);

  for (const step of productionSteps.filter(step => step.operation === "execute-asserted-plan")) {
    const input = step.input as Record<string, unknown>;
    assert.equal(Object.prototype.hasOwnProperty.call(input, "authorization"), false);
  }
});

test("VH18 correction C05 runs destructive preview/assert/authorization/execution only through ValidationModeRuntime and retains exact-object/tombstone assertions", async () => {
  const a = authority();
  const mobilePlan = plan(
    "plan:c05:mobile",
    [operation("trash-remote", targetPath, 0, targetRemoteObjectId)],
  );
  const windowsPlan = plan(
    "plan:c05:windows",
    [operation("trash-local", targetPath, 0)],
  );
  const production = productionFixture([mobilePlan, windowsPlan]);
  const verifier = new CapturingVerifier();
  const definition = createC05ScenarioDefinition(a);
  const h = runtimeFor({ production, verifier, definition });

  assert.equal("production-path-driver" in h.overrides, false);
  assert.equal("plan-assertion-engine" in h.overrides, false);

  h.runtime.setEnabled(true);
  const result = runnerResult(await h.runtime.startScenario("C05"));
  assert.equal(result.status, "PASS");

  assert.deepEqual(h.deleted, [String(a.trustedFixture.descriptor.identity.fixtureId)]);
  assert.deepEqual(production.calls, [
    "preview-manual",
    "preview-action:execute-plan",
    "preview-manual",
    "preview-action:execute-plan",
  ]);
  assert.deepEqual(production.previewedPlanIds, [
    String(mobilePlan.planId),
    String(windowsPlan.planId),
  ]);
  assert.deepEqual(production.executedPlanIds, production.previewedPlanIds);
  assert.equal(production.physicalExecutionRequests(), 2);

  assert.equal(verifier.requests.length, 2);
  const mobileVerification = verifier.requests[0]!;
  assert.equal(mobileVerification.run.runId, run.runId);
  assert.ok(mobileVerification.state.some(item =>
    item.kind === "live-trash-absence-state"
    && item.path === targetPath
    && item.expectedState === "trashed"
    && item.remoteObjectId === targetRemoteObjectId
  ));
  assert.ok(mobileVerification.state.some(item =>
    item.kind === "live-trash-absence-state"
    && item.path === targetPath
    && item.expectedState === "trashed"
    && item.remoteObjectId === undefined
  ));
  assert.ok(mobileVerification.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === mobileDeviceId
    && item.expected === "tombstone"
    && item.remoteObjectId === targetRemoteObjectId
  ));
  assert.ok(mobileVerification.state.some(item => item.kind === "unrelated-mutation-absence"));

  const finalVerification = verifier.requests[1]!;
  assert.ok(finalVerification.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === mobileDeviceId
    && item.expected === "tombstone"
    && item.remoteObjectId === targetRemoteObjectId
  ));
  assert.ok(finalVerification.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === windowsDeviceId
    && item.expected === "tombstone"
    && item.remoteObjectId === targetRemoteObjectId
  ));
  assert.ok(finalVerification.state.some(item =>
    item.kind === "terminal-product-result"
    && item.diagnostic.expectedFields?.operationKind === "trash-local"
  ));
  assert.ok(finalVerification.state.some(item => item.kind === "unrelated-mutation-absence"));
  assert.ok(finalVerification.convergence.some(item =>
    item.kind === "cross-device-path"
    && item.expected === "absent"
    && item.deviceIds.includes(mobileDeviceId)
    && item.deviceIds.includes(windowsDeviceId)
  ));
  assert.ok(finalVerification.convergence.some(item =>
    item.kind === "cross-device-authority"
    && item.expectedTombstone === true
  ));
});

test("VH18 correction unsafe additional destructive plan fails in the fixed assertion step before physical execution", async () => {
  const a = authority();
  const unrelatedDeletePath = contractId<"VaultPath">("__validation/c05-unrelated-delete.md") as VaultPath;
  const unrelatedDeleteId = contractId<"RemoteObjectId">("remote:c05:unrelated-delete") as RemoteObjectId;
  const unsafeMobilePlan = plan(
    "plan:c05:unsafe-mobile",
    [
      operation("trash-remote", targetPath, 0, targetRemoteObjectId),
      operation("trash-remote", unrelatedDeletePath, 1, unrelatedDeleteId),
    ],
  );
  const production = productionFixture([unsafeMobilePlan]);
  const verifier = new CapturingVerifier();
  const definition = createC05ScenarioDefinition(a);
  const h = runtimeFor({ production, verifier, definition });

  h.runtime.setEnabled(true);
  const result = runnerResult(await h.runtime.startScenario("C05"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /outside the scenario contract|destructive operation/i);
  }

  assert.deepEqual(production.calls, ["preview-manual"]);
  assert.deepEqual(production.previewedPlanIds, [String(unsafeMobilePlan.planId)]);
  assert.deepEqual(production.executedPlanIds, []);
  assert.equal(production.physicalExecutionRequests(), 0);
  assert.equal(verifier.requests.length, 0);
});

test("VH18 correction plan expectations bind the exact remote object and reject a same-path destructive plan for the wrong Drive identity", async () => {
  const a = authority();
  const wrongRemoteObjectId = contractId<"RemoteObjectId">("remote:c05:wrong-object") as RemoteObjectId;
  const wrongObjectPlan = plan(
    "plan:c05:wrong-object",
    [operation("trash-remote", targetPath, 0, wrongRemoteObjectId)],
  );
  const production = productionFixture([wrongObjectPlan]);
  const verifier = new CapturingVerifier();
  const h = runtimeFor({
    production,
    verifier,
    definition: createC05ScenarioDefinition(a),
  });

  h.runtime.setEnabled(true);
  const result = runnerResult(await h.runtime.startScenario("C05"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") assert.match(result.reason.summary, /remoteObjectId|identity/i);
  assert.deepEqual(production.executedPlanIds, []);
  assert.equal(production.physicalExecutionRequests(), 0);
  assert.equal(verifier.requests.length, 0);
});
