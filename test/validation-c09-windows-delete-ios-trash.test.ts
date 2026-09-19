import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentHash,
  type OperationId,
  type PlanId,
  type PlannedOperation,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
} from "../src/contracts";
import {
  validationEvidenceRef,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type {
  ValidationFixtureDescriptor,
  ValidationFixtureSpec,
} from "../src/validation/fixture-manager";
import type {
  ValidationProductionControllerPort,
  ValidationProductionRuntimePort,
} from "../src/validation/production-path-driver";
import {
  validationDeviceId,
  validationDeviceIdentity,
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
import type {
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import {
  C09_AUTHORITY_CYCLES,
  C09_FIXTURE_ROOT,
  C09_GUARD_FIXTURE_ID,
  C09_GUARD_PATH,
  C09_GUARD_RELATIVE_PATH,
  C09_SOURCE_PATH,
  C09_SOURCE_RELATIVE_PATH,
  C09_TARGET_FIXTURE_ID,
  C09_TARGET_PATH,
  C09_TARGET_RELATIVE_PATH,
  createC09ScenarioPackage,
  type C09StateVerifierPort,
} from "../src/validation/scenarios/c09-windows-delete-ios-trash";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";

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

const run = validationRunIdentity("run:c09:correction-02", "C09");
const windowsDeviceId = validationDeviceId("device:c09:windows");
const mobileDeviceId = validationDeviceId("device:c09:mobile");

const targetRemoteObjectId = contractId<"RemoteObjectId">("remote:c09:c08-target") as RemoteObjectId;
const guardRemoteObjectId = contractId<"RemoteObjectId">("remote:c09:c08-guard") as RemoteObjectId;
const wrongRemoteObjectId = contractId<"RemoteObjectId">("remote:c09:wrong-target") as RemoteObjectId;

const targetHash = contractId<"ContentHash">("sha256:" + "a".repeat(64)) as ContentHash;
const guardHash = contractId<"ContentHash">("sha256:" + "b".repeat(64)) as ContentHash;

function sourceDescriptor(): ValidationFixtureDescriptor {
  return {
    identity: validationFixtureIdentity(run, C09_TARGET_FIXTURE_ID),
    relativePath: C09_SOURCE_RELATIVE_PATH,
    path: C09_SOURCE_PATH,
    kind: "text",
    purpose: "ordinary",
    version: 1,
    sizeBytes: 311,
    hash: targetHash,
  };
}

function targetDescriptor(): ValidationFixtureDescriptor {
  return {
    ...sourceDescriptor(),
    relativePath: C09_TARGET_RELATIVE_PATH,
    path: C09_TARGET_PATH,
  };
}

function guardDescriptor(): ValidationFixtureDescriptor {
  return {
    identity: validationFixtureIdentity(run, C09_GUARD_FIXTURE_ID),
    relativePath: C09_GUARD_RELATIVE_PATH,
    path: C09_GUARD_PATH,
    kind: "text",
    purpose: "ordinary",
    version: 1,
    sizeBytes: 197,
    hash: guardHash,
  };
}

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: PlannedOperation["path"];
  readonly targetSide?: "local" | "remote";
  readonly destructive?: boolean;
  readonly fromPath?: PlannedOperation["fromPath"];
  readonly toPath?: PlannedOperation["toPath"];
  readonly remoteObjectId?: RemoteObjectId;
}): PlannedOperation {
  return {
    operationId: contractId<"OperationId">(input.id) as OperationId,
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{
      code: "vh22-c09-correction-02",
      summary: "Focused deterministic C09 scenario plan.",
    }],
  };
}

function plan(
  id: string,
  operations: readonly PlannedOperation[],
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

function seedWindowsPlan(): SynchronizationPlan {
  return plan("plan:c09:seed-windows", [
    operation({
      id: "op:c09:seed-upload-target",
      kind: "upload-create",
      path: C09_SOURCE_PATH,
      targetSide: "remote",
    }),
    operation({
      id: "op:c09:seed-upload-guard",
      kind: "upload-create",
      path: C09_GUARD_PATH,
      targetSide: "remote",
    }),
  ]);
}

function seedMobilePlan(): SynchronizationPlan {
  return plan("plan:c09:seed-mobile", [
    operation({
      id: "op:c09:seed-download-target",
      kind: "download-create",
      path: C09_SOURCE_PATH,
      targetSide: "local",
      remoteObjectId: targetRemoteObjectId,
    }),
    operation({
      id: "op:c09:seed-download-guard",
      kind: "download-create",
      path: C09_GUARD_PATH,
      targetSide: "local",
      remoteObjectId: guardRemoteObjectId,
    }),
  ]);
}

function moveWindowsPlan(): SynchronizationPlan {
  return plan("plan:c09:move-windows", [
    operation({
      id: "op:c09:move-windows-target",
      kind: "identity-preserving-move",
      path: C09_TARGET_PATH,
      targetSide: "remote",
      fromPath: C09_SOURCE_PATH,
      toPath: C09_TARGET_PATH,
      remoteObjectId: targetRemoteObjectId,
    }),
    operation({
      id: "op:c09:move-windows-guard-noop",
      kind: "noop",
      path: C09_GUARD_PATH,
    }),
  ]);
}

function moveMobilePlan(): SynchronizationPlan {
  return plan("plan:c09:move-mobile", [
    operation({
      id: "op:c09:move-mobile-target",
      kind: "identity-preserving-move",
      path: C09_TARGET_PATH,
      targetSide: "local",
      fromPath: C09_SOURCE_PATH,
      toPath: C09_TARGET_PATH,
      remoteObjectId: targetRemoteObjectId,
    }),
    operation({
      id: "op:c09:move-mobile-guard-noop",
      kind: "noop",
      path: C09_GUARD_PATH,
    }),
  ]);
}

function windowsDeletePlan(
  remoteObjectId: RemoteObjectId = targetRemoteObjectId,
  extra: readonly PlannedOperation[] = [],
): SynchronizationPlan {
  return plan("plan:c09:delete-windows", [
    operation({
      id: "op:c09:trash-exact-target",
      kind: "trash-remote",
      path: C09_TARGET_PATH,
      targetSide: "remote",
      destructive: true,
      remoteObjectId,
    }),
    operation({
      id: "op:c09:delete-windows-guard-noop",
      kind: "noop",
      path: C09_GUARD_PATH,
    }),
    ...extra,
  ]);
}

function mobileDeletePlan(): SynchronizationPlan {
  return plan("plan:c09:delete-mobile", [
    operation({
      id: "op:c09:trash-local-target",
      kind: "trash-local",
      path: C09_TARGET_PATH,
      targetSide: "local",
      destructive: true,
    }),
    operation({
      id: "op:c09:delete-mobile-guard-noop",
      kind: "noop",
      path: C09_GUARD_PATH,
    }),
  ]);
}

function defaultPlans(): readonly SynchronizationPlan[] {
  return [
    seedWindowsPlan(),
    seedMobilePlan(),
    moveWindowsPlan(),
    moveMobilePlan(),
    windowsDeletePlan(),
    mobileDeletePlan(),
  ];
}

function productionFixture(plans: readonly SynchronizationPlan[]) {
  let previewIndex = 0;
  const calls: string[] = [];
  const previewedPlanIds: string[] = [];
  const executedPlanIds: string[] = [];
  const surface: ProductSurfaceState = {
    status: { kind: "idle-ready" },
    conflicts: [],
  };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      calls.push("preview-manual");
      const observed = plans[previewIndex];
      previewIndex += 1;
      if (observed) previewedPlanIds.push(String(observed.planId));
      return observed;
    },
    previewVerifyReconcile: async () => {
      calls.push("preview-verify-reconcile");
      return undefined;
    },
    runAutomatic: async trigger => {
      calls.push("automatic:" + trigger);
    },
    request: async action => {
      calls.push("request:" + action.kind);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push("preview-action:" + action.kind);
      if (action.kind !== "execute-plan") {
        return { status: "rejected", reason: "Focused C09 harness permits only fixed execute-plan dispatch." };
      }
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => {
      throw new Error("Focused C09 correction tests do not require production run evidence.");
    },
  };

  const runtime: ValidationProductionRuntimePort = {
    productController: () => controller,
  };

  return {
    runtime,
    calls,
    previewedPlanIds,
    executedPlanIds,
  };
}

class CapturingVerifier implements C09StateVerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  constructor(
    private readonly verdictFor: (
      request: ValidationStateConvergenceRequest,
      index: number,
    ) => "pass" | "fail" | "blocked" = () => "pass",
  ) {}

  async verify(request: ValidationStateConvergenceRequest) {
    this.requests.push(request);
    const index = this.requests.length - 1;
    return {
      result: { verdict: this.verdictFor(request, index) },
      evidence: [{
        ref: validationEvidenceRef("c09:verify:" + String(index + 1)),
      }],
    };
  }
}

function createHarness(input?: {
  readonly plans?: readonly SynchronizationPlan[];
  readonly verifierVerdict?: (
    request: ValidationStateConvergenceRequest,
    index: number,
  ) => "pass" | "fail" | "blocked";
}) {
  const production = productionFixture(input?.plans ?? defaultPlans());
  const createdFixtureIds: string[] = [];
  const movedFixturePaths: string[] = [];
  const deletedFixtureIds: string[] = [];
  const handoffs: string[] = [];
  const evidenceCalls: Array<{
    readonly targetRemoteObjectId: RemoteObjectId;
    readonly guardRemoteObjectId: RemoteObjectId;
  }> = [];
  let role: "windows" | "mobile" = "windows";

  const verifier = new CapturingVerifier(input?.verifierVerdict);

  const fixtureForSpec = (spec: ValidationFixtureSpec): ValidationFixtureDescriptor => {
    if (spec.fixtureId === C09_TARGET_FIXTURE_ID) {
      assert.equal(spec.relativePath, C09_SOURCE_RELATIVE_PATH);
      return sourceDescriptor();
    }
    if (spec.fixtureId === C09_GUARD_FIXTURE_ID) {
      assert.equal(spec.relativePath, C09_GUARD_RELATIVE_PATH);
      return guardDescriptor();
    }
    throw new Error("Unexpected C09 fixture ID: " + spec.fixtureId);
  };

  const scenario = createC09ScenarioPackage({
    windowsDeviceId,
    mobileDeviceId,
    windowsFixtures: {
      async create(spec) {
        assert.equal(role, "windows");
        createdFixtureIds.push(spec.fixtureId);
        return fixtureForSpec(spec);
      },
      async move(fixtureId, relativePath) {
        assert.equal(role, "windows");
        assert.equal(fixtureId, C09_TARGET_FIXTURE_ID);
        assert.equal(relativePath, C09_TARGET_RELATIVE_PATH);
        movedFixturePaths.push(relativePath);
        return targetDescriptor();
      },
      async delete(fixtureId) {
        assert.equal(role, "windows");
        assert.equal(fixtureId, C09_TARGET_FIXTURE_ID);
        deletedFixtureIds.push(fixtureId);
        return targetDescriptor();
      },
      async hash(fixtureId) {
        if (fixtureId === C09_TARGET_FIXTURE_ID) return targetHash;
        if (fixtureId === C09_GUARD_FIXTURE_ID) return guardHash;
        throw new Error("Unexpected C09 fixture ID: " + fixtureId);
      },
    },
    mappingReader: {
      async remoteObjectId(_deviceId, pathValue) {
        const moveCompleted = production.executedPlanIds.includes("plan:c09:move-mobile");
        if (pathValue === C09_SOURCE_PATH) {
          return moveCompleted ? undefined : targetRemoteObjectId;
        }
        if (pathValue === C09_TARGET_PATH) {
          return moveCompleted ? targetRemoteObjectId : undefined;
        }
        if (pathValue === C09_GUARD_PATH) return guardRemoteObjectId;
        return undefined;
      },
    },
    verifier,
    handoff: {
      currentRole: () => role,
      async handoff(handoff) {
        role = handoff.targetRole;
        handoffs.push(handoff.targetRole);
        return [validationEvidenceRef("c09:handoff:" + handoff.targetRole)];
      },
    },
    evidence: {
      async record(evidence) {
        evidenceCalls.push({
          targetRemoteObjectId: evidence.targetRemoteObjectId,
          guardRemoteObjectId: evidence.guardRemoteObjectId,
        });
        return [validationEvidenceRef("c09:evidence")];
      },
    },
  });

  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [scenario.definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides: scenario.moduleOverrides,
    currentDevice: () => validationDeviceIdentity(String(windowsDeviceId), "windows-desktop"),
    createRunId: () => String(run.runId),
  });

  return {
    runtime,
    scenario,
    production,
    verifier,
    createdFixtureIds,
    movedFixturePaths,
    deletedFixtureIds,
    handoffs,
    evidenceCalls,
  };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected H6B runner result.");
  return result.result;
}

test("VH22 C09 correction 02 reconstructs full C08 lineage before exact-object Windows and mobile deletion", async () => {
  let harnessRef: ReturnType<typeof createHarness> | undefined;
  const harness = createHarness({
    verifierVerdict(request, index) {
      if (index === 0) {
        assert.ok(harnessRef);
        assert.deepEqual(harnessRef.createdFixtureIds, [
          C09_TARGET_FIXTURE_ID,
          C09_GUARD_FIXTURE_ID,
        ]);
        assert.deepEqual(harnessRef.production.executedPlanIds, [
          "plan:c09:seed-windows",
          "plan:c09:seed-mobile",
        ]);
        assert.deepEqual(harnessRef.movedFixturePaths, []);
        assert.deepEqual(harnessRef.deletedFixtureIds, []);

        const seedTargetBase = request.state.filter(item =>
          item.kind === "base-authority"
          && item.path === C09_SOURCE_PATH
          && item.expectedRemoteObjectId === targetRemoteObjectId
        );
        assert.equal(seedTargetBase.length, 2);
      }

      if (index === 2) {
        assert.ok(harnessRef);
        assert.deepEqual(harnessRef.movedFixturePaths, [C09_TARGET_RELATIVE_PATH]);
        assert.deepEqual(harnessRef.production.executedPlanIds, [
          "plan:c09:seed-windows",
          "plan:c09:seed-mobile",
          "plan:c09:move-windows",
          "plan:c09:move-mobile",
        ]);
        assert.deepEqual(harnessRef.deletedFixtureIds, []);

        const renamedBase = request.state.filter(item =>
          item.kind === "base-authority"
          && item.path === C09_TARGET_PATH
          && item.expectedRemoteObjectId === targetRemoteObjectId
        );
        const renamedMappings = request.state.filter(item =>
          item.kind === "mapping-or-tombstone"
          && item.path === C09_TARGET_PATH
          && item.expected === "mapping"
          && item.remoteObjectId === targetRemoteObjectId
        );
        assert.equal(renamedBase.length, 2);
        assert.equal(renamedMappings.length, 2);
        assert.ok(request.convergence.some(item =>
          item.kind === "cross-device-path"
          && item.path === C09_SOURCE_PATH
          && item.expected === "absent"
        ));
      }

      return "pass";
    },
  });
  harnessRef = harness;

  assert.equal(C09_FIXTURE_ROOT, "__brain_validation__/c08");
  assert.equal(C09_SOURCE_RELATIVE_PATH, "test-win-c06.md");
  assert.equal(C09_TARGET_RELATIVE_PATH, "test-win-c08-renamed.md");
  assert.equal(String(C09_SOURCE_PATH), "__brain_validation__/c08/test-win-c06.md");
  assert.equal(String(C09_TARGET_PATH), "__brain_validation__/c08/test-win-c08-renamed.md");
  assert.equal("production-path-driver" in harness.scenario.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in harness.scenario.moduleOverrides, false);

  const productionSteps = harness.scenario.definition.steps.filter(step =>
    step.module === "production-path-driver" || step.module === "plan-assertion-engine"
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
      ["production-path-driver", "preview-manual"],
      ["plan-assertion-engine", "assert-observed-plan"],
      ["production-path-driver", "execute-asserted-plan"],
      ["production-path-driver", "preview-manual"],
      ["plan-assertion-engine", "assert-observed-plan"],
      ["production-path-driver", "execute-asserted-plan"],
      ["production-path-driver", "preview-manual"],
      ["plan-assertion-engine", "assert-observed-plan"],
      ["production-path-driver", "execute-asserted-plan"],
      ["production-path-driver", "preview-manual"],
      ["plan-assertion-engine", "assert-observed-plan"],
      ["production-path-driver", "execute-asserted-plan"],
    ],
  );

  const cycleIds = productionSteps.map(step => {
    const stepInput = step.input as { readonly authorityCycleId?: string } | undefined;
    return stepInput?.authorityCycleId;
  });
  assert.deepEqual(cycleIds, [
    C09_AUTHORITY_CYCLES.seedWindows,
    C09_AUTHORITY_CYCLES.seedWindows,
    C09_AUTHORITY_CYCLES.seedWindows,
    C09_AUTHORITY_CYCLES.seedMobile,
    C09_AUTHORITY_CYCLES.seedMobile,
    C09_AUTHORITY_CYCLES.seedMobile,
    C09_AUTHORITY_CYCLES.moveWindows,
    C09_AUTHORITY_CYCLES.moveWindows,
    C09_AUTHORITY_CYCLES.moveWindows,
    C09_AUTHORITY_CYCLES.moveMobile,
    C09_AUTHORITY_CYCLES.moveMobile,
    C09_AUTHORITY_CYCLES.moveMobile,
    C09_AUTHORITY_CYCLES.deleteWindows,
    C09_AUTHORITY_CYCLES.deleteWindows,
    C09_AUTHORITY_CYCLES.deleteWindows,
    C09_AUTHORITY_CYCLES.deleteMobile,
    C09_AUTHORITY_CYCLES.deleteMobile,
    C09_AUTHORITY_CYCLES.deleteMobile,
  ]);
  for (const step of productionSteps.filter(step => step.operation === "execute-asserted-plan")) {
    const stepInput = step.input as Record<string, unknown>;
    assert.equal(Object.prototype.hasOwnProperty.call(stepInput, "authorization"), false);
  }

  harness.runtime.setEnabled(true);
  const result = runnerResult(await harness.runtime.startScenario("C09"));
  assert.equal(result.status, "PASS");

  assert.deepEqual(harness.createdFixtureIds, [
    C09_TARGET_FIXTURE_ID,
    C09_GUARD_FIXTURE_ID,
  ]);
  assert.deepEqual(harness.movedFixturePaths, [C09_TARGET_RELATIVE_PATH]);
  assert.deepEqual(harness.deletedFixtureIds, [C09_TARGET_FIXTURE_ID]);
  assert.deepEqual(harness.handoffs, ["mobile", "windows", "mobile", "windows", "mobile"]);
  assert.deepEqual(harness.production.previewedPlanIds, [
    "plan:c09:seed-windows",
    "plan:c09:seed-mobile",
    "plan:c09:move-windows",
    "plan:c09:move-mobile",
    "plan:c09:delete-windows",
    "plan:c09:delete-mobile",
  ]);
  assert.deepEqual(harness.production.executedPlanIds, harness.production.previewedPlanIds);
  assert.equal(harness.verifier.requests.length, 6);

  const remoteMove = harness.verifier.requests[1]!;
  assert.ok(remoteMove.state.some(item =>
    item.kind === "remote-content"
    && item.path === C09_TARGET_PATH
    && item.remoteObjectId === targetRemoteObjectId
  ));
  assert.ok(remoteMove.state.some(item =>
    item.kind === "live-trash-absence-state"
    && item.path === C09_SOURCE_PATH
    && item.expectedState === "absent"
  ));

  const remoteTrash = harness.verifier.requests[3]!;
  assert.ok(remoteTrash.state.some(item =>
    item.kind === "live-trash-absence-state"
    && item.path === C09_TARGET_PATH
    && item.expectedState === "trashed"
    && item.remoteObjectId === targetRemoteObjectId
  ));
  assert.ok(remoteTrash.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === windowsDeviceId
    && item.path === C09_TARGET_PATH
    && item.expected === "tombstone"
    && item.remoteObjectId === targetRemoteObjectId
    && item.deletedOn === "both"
  ));

  const mobilePreDelete = harness.verifier.requests[4]!;
  assert.ok(mobilePreDelete.state.some(item =>
    item.kind === "base-authority"
    && item.deviceId === mobileDeviceId
    && item.path === C09_TARGET_PATH
    && item.expectedRemoteObjectId === targetRemoteObjectId
  ));

  const final = harness.verifier.requests[5]!;
  const tombstones = final.state.filter(item =>
    item.kind === "mapping-or-tombstone"
    && item.path === C09_TARGET_PATH
    && item.expected === "tombstone"
    && item.remoteObjectId === targetRemoteObjectId
    && item.deletedOn === "both"
  );
  assert.equal(tombstones.length, 2);
  assert.ok(final.convergence.some(item =>
    item.kind === "cross-device-path"
    && item.path === C09_TARGET_PATH
    && item.expected === "absent"
    && item.deviceIds.includes(windowsDeviceId)
    && item.deviceIds.includes(mobileDeviceId)
  ));
  assert.ok(final.state.some(item => item.kind === "unrelated-mutation-absence"));
  assert.deepEqual(harness.evidenceCalls, [{
    targetRemoteObjectId,
    guardRemoteObjectId,
  }]);
});

test("VH22 C09 correction 02 cannot fake starting lineage: completed setup plans and mapping IDs still cannot unlock delete when objective C08-equivalent verification blocks", async () => {
  const harness = createHarness({
    verifierVerdict(_request, index) {
      return index === 2 ? "blocked" : "pass";
    },
  });

  harness.runtime.setEnabled(true);
  const result = runnerResult(await harness.runtime.startScenario("C09"));
  assert.equal(result.status, "BLOCKED");
  if (result.status === "BLOCKED") {
    assert.match(result.reason.summary, /C08-equivalent trusted lineage|required objective proof/i);
  }

  assert.deepEqual(harness.createdFixtureIds, [
    C09_TARGET_FIXTURE_ID,
    C09_GUARD_FIXTURE_ID,
  ]);
  assert.deepEqual(harness.movedFixturePaths, [C09_TARGET_RELATIVE_PATH]);
  assert.deepEqual(harness.production.executedPlanIds, [
    "plan:c09:seed-windows",
    "plan:c09:seed-mobile",
    "plan:c09:move-windows",
    "plan:c09:move-mobile",
  ]);
  assert.deepEqual(harness.deletedFixtureIds, []);
  assert.equal(harness.production.previewedPlanIds.length, 4);
  assert.equal(harness.verifier.requests.length, 3);
  assert.equal(harness.evidenceCalls.length, 0);
});

test("VH22 C09 correction 02 fixed assertion rejects wrong exact Drive object before Windows production trash execution", async () => {
  const harness = createHarness({
    plans: [
      seedWindowsPlan(),
      seedMobilePlan(),
      moveWindowsPlan(),
      moveMobilePlan(),
      windowsDeletePlan(wrongRemoteObjectId),
      mobileDeletePlan(),
    ],
  });

  harness.runtime.setEnabled(true);
  const result = runnerResult(await harness.runtime.startScenario("C09"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /remoteObjectId=remote:c09:c08-target|identity/i);
  }

  assert.deepEqual(harness.deletedFixtureIds, [C09_TARGET_FIXTURE_ID]);
  assert.deepEqual(harness.production.executedPlanIds, [
    "plan:c09:seed-windows",
    "plan:c09:seed-mobile",
    "plan:c09:move-windows",
    "plan:c09:move-mobile",
  ]);
  assert.equal(harness.production.previewedPlanIds.length, 5);
  assert.equal(harness.verifier.requests.length, 3);
  assert.equal(harness.evidenceCalls.length, 0);
});

test("VH22 C09 correction 02 fixed assertion hard-stops unexpected destructive mutation before Windows production execution", async () => {
  const unexpectedGuardTrash = operation({
    id: "op:c09:unexpected-trash-guard",
    kind: "trash-remote",
    path: C09_GUARD_PATH,
    targetSide: "remote",
    destructive: true,
    remoteObjectId: guardRemoteObjectId,
  });
  const harness = createHarness({
    plans: [
      seedWindowsPlan(),
      seedMobilePlan(),
      moveWindowsPlan(),
      moveMobilePlan(),
      windowsDeletePlan(targetRemoteObjectId, [unexpectedGuardTrash]),
      mobileDeletePlan(),
    ],
  });

  harness.runtime.setEnabled(true);
  const result = runnerResult(await harness.runtime.startScenario("C09"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /outside the scenario contract|destructive operation/i);
  }

  assert.deepEqual(harness.production.executedPlanIds, [
    "plan:c09:seed-windows",
    "plan:c09:seed-mobile",
    "plan:c09:move-windows",
    "plan:c09:move-mobile",
  ]);
  assert.equal(harness.production.previewedPlanIds.length, 5);
  assert.equal(harness.verifier.requests.length, 3);
  assert.equal(harness.evidenceCalls.length, 0);
});
