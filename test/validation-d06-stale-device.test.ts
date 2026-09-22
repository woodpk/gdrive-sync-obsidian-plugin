import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentHash,
  type OperationId,
  type PlannedOperation,
  type PlanId,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import {
  validationEvidenceRef,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type {
  ValidationFixtureDescriptor,
  ValidationFixtureSpec,
} from "../src/validation/fixture-manager";
import {
  HumanCheckpointResumeController,
  type HumanCheckpointDurableState,
  type HumanCheckpointStateStore,
} from "../src/validation/human-checkpoint-resume-controller";
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
  D06_AUTHORITY_CYCLES,
  D06_DELETE_FIXTURE_ID,
  D06_DELETE_PATH,
  D06_DELETE_RELATIVE_PATH,
  D06_FIXTURE_ROOT,
  D06_GUARD_FIXTURE_IDS,
  D06_GUARD_PATHS,
  D06_GUARD_RELATIVE_PATHS,
  D06_SCENARIO_OPERATIONS,
  D06_STALE_CHECKPOINT_ID,
  D06_STALE_CONDITION_BLOCKED,
  D06_UPDATE_FIXTURE_ID,
  D06_UPDATE_PATH,
  D06_UPDATE_RELATIVE_PATH,
  D06ProductionStaleAuthorityObserver,
  createD06ScenarioPackage,
  type D06StaleAuthorityPort,
} from "../src/validation/scenarios/d06-stale-device";
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

class MemoryCheckpointStore implements HumanCheckpointStateStore {
  readonly durability = "device-local" as const;
  value: HumanCheckpointDurableState | null = null;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: HumanCheckpointDurableState | null,
  ): Promise<boolean> {
    if (revisionOf(this.value) !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    return true;
  }
}

const run = validationRunIdentity("run:d06:vh29", "D06");
const windowsDeviceId = validationDeviceId("device:d06:windows");
const mobileDevice = validationDeviceIdentity("device:d06:mobile", "iphone");

const allFixtureIds = [
  D06_DELETE_FIXTURE_ID,
  D06_UPDATE_FIXTURE_ID,
  ...D06_GUARD_FIXTURE_IDS,
] as const;
const allPaths = [
  D06_DELETE_PATH,
  D06_UPDATE_PATH,
  ...D06_GUARD_PATHS,
] as const;

const remoteIds = new Map<string, RemoteObjectId>(
  allPaths.map((path, index) => [
    String(path),
    contractId<"RemoteObjectId">("remote:d06:" + String(index + 1)) as RemoteObjectId,
  ]),
);

function hashFor(fixtureId: string, version: number): ContentHash {
  const seed = (fixtureId.length * 17 + version * 31).toString(16).padStart(2, "0").slice(-2);
  return contractId<"ContentHash">("sha256:" + seed.repeat(32)) as ContentHash;
}

function relativePathFor(fixtureId: string): string {
  if (fixtureId === D06_DELETE_FIXTURE_ID) return D06_DELETE_RELATIVE_PATH;
  if (fixtureId === D06_UPDATE_FIXTURE_ID) return D06_UPDATE_RELATIVE_PATH;
  const index = D06_GUARD_FIXTURE_IDS.indexOf(fixtureId as (typeof D06_GUARD_FIXTURE_IDS)[number]);
  if (index < 0) throw new Error("Unexpected D06 fixture ID: " + fixtureId);
  return D06_GUARD_RELATIVE_PATHS[index]!;
}

function pathFor(fixtureId: string): VaultPath {
  if (fixtureId === D06_DELETE_FIXTURE_ID) return D06_DELETE_PATH;
  if (fixtureId === D06_UPDATE_FIXTURE_ID) return D06_UPDATE_PATH;
  const index = D06_GUARD_FIXTURE_IDS.indexOf(fixtureId as (typeof D06_GUARD_FIXTURE_IDS)[number]);
  if (index < 0) throw new Error("Unexpected D06 fixture ID: " + fixtureId);
  return D06_GUARD_PATHS[index]!;
}

function descriptor(fixtureId: string, version = 1): ValidationFixtureDescriptor {
  return {
    identity: validationFixtureIdentity(run, fixtureId),
    relativePath: relativePathFor(fixtureId),
    path: pathFor(fixtureId),
    kind: "text",
    purpose: fixtureId === D06_DELETE_FIXTURE_ID ? "deletion" : "ordinary",
    version,
    sizeBytes: 128 + version,
    hash: hashFor(fixtureId, version),
  };
}

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly destructive?: boolean;
  readonly targetSide?: "local" | "remote";
  readonly remoteObjectId?: RemoteObjectId;
  readonly reasonCode?: string;
}): PlannedOperation {
  return {
    operationId: contractId<"OperationId">(input.id) as OperationId,
    kind: input.kind,
    path: input.path,
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: input.reasonCode
      ? [{ code: input.reasonCode, summary: input.reasonCode }]
      : [],
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
  };
}

function plan(
  id: string,
  trigger: SynchronizationPlan["trigger"],
  operations: readonly PlannedOperation[],
  executionDisposition: SynchronizationPlan["executionDisposition"] = "safe-auto-eligible",
): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(id) as PlanId,
    trigger,
    operations,
    executionDisposition,
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function noopOperations(prefix: string): PlannedOperation[] {
  return D06_GUARD_PATHS.map((path, index) =>
    operation({ id: prefix + ":noop:" + String(index + 1), kind: "noop", path }),
  );
}

function seedWindowsPlan(): SynchronizationPlan {
  return plan("plan:d06:seed-windows", "manual", allPaths.map((path, index) =>
    operation({
      id: "op:d06:seed-windows:" + String(index + 1),
      kind: "upload-create",
      path,
      targetSide: "remote",
    }),
  ));
}

function seedMobilePlan(): SynchronizationPlan {
  return plan("plan:d06:seed-mobile", "manual", allPaths.map((path, index) =>
    operation({
      id: "op:d06:seed-mobile:" + String(index + 1),
      kind: "download-create",
      path,
      targetSide: "local",
      remoteObjectId: remoteIds.get(String(path)),
    }),
  ));
}

function windowsChangesPlan(): SynchronizationPlan {
  return plan("plan:d06:windows-changes", "manual", [
    operation({
      id: "op:d06:update-remote",
      kind: "upload-update",
      path: D06_UPDATE_PATH,
      targetSide: "remote",
      remoteObjectId: remoteIds.get(String(D06_UPDATE_PATH)),
    }),
    operation({
      id: "op:d06:trash-remote",
      kind: "trash-remote",
      path: D06_DELETE_PATH,
      targetSide: "remote",
      destructive: true,
      remoteObjectId: remoteIds.get(String(D06_DELETE_PATH)),
      reasonCode: "attested-local-deletion",
    }),
    ...noopOperations("op:d06:windows"),
  ]);
}

function safeStaleReturnPlan(): SynchronizationPlan {
  return plan("plan:d06:stale-return", "verify-reconcile", [
    operation({
      id: "op:d06:download-safe-update",
      kind: "download-update",
      path: D06_UPDATE_PATH,
      targetSide: "local",
      remoteObjectId: remoteIds.get(String(D06_UPDATE_PATH)),
    }),
    operation({
      id: "op:d06:block-stale-delete",
      kind: "blocked-unsafe",
      path: D06_DELETE_PATH,
      reasonCode: "stale-device-destructive-gate",
    }),
    ...noopOperations("op:d06:return"),
  ], "requires-user-approval");
}

function postSafeStalePlan(): SynchronizationPlan {
  return plan("plan:d06:post-safe", "verify-reconcile", [
    operation({ id: "op:d06:update-now-noop", kind: "noop", path: D06_UPDATE_PATH }),
    operation({
      id: "op:d06:block-stale-delete-again",
      kind: "blocked-unsafe",
      path: D06_DELETE_PATH,
      reasonCode: "stale-device-destructive-gate",
    }),
    ...noopOperations("op:d06:post-safe"),
  ], "requires-user-approval");
}

function resurrectionPlan(): SynchronizationPlan {
  return plan("plan:d06:unsafe-resurrection", "verify-reconcile", [
    operation({
      id: "op:d06:download-safe-update",
      kind: "download-update",
      path: D06_UPDATE_PATH,
      targetSide: "local",
      remoteObjectId: remoteIds.get(String(D06_UPDATE_PATH)),
    }),
    operation({
      id: "op:d06:resurrect-delete",
      kind: "upload-create",
      path: D06_DELETE_PATH,
      targetSide: "remote",
    }),
    ...noopOperations("op:d06:unsafe-resurrection"),
  ]);
}

function unsafeDestructivePlan(): SynchronizationPlan {
  return plan("plan:d06:unsafe-destructive", "verify-reconcile", [
    operation({
      id: "op:d06:download-safe-update",
      kind: "download-update",
      path: D06_UPDATE_PATH,
      targetSide: "local",
      remoteObjectId: remoteIds.get(String(D06_UPDATE_PATH)),
    }),
    operation({
      id: "op:d06:unsafe-trash-local",
      kind: "trash-local",
      path: D06_DELETE_PATH,
      targetSide: "local",
      destructive: true,
      reasonCode: "attested-remote-deletion",
    }),
    ...noopOperations("op:d06:unsafe-destructive"),
  ]);
}

class CapturingVerifier {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest) {
    this.requests.push(request);
    return {
      result: { verdict: "pass" as const },
      evidence: [{
        ref: validationEvidenceRef("d06:verify:" + String(this.requests.length)),
        source: "convergence" as const,
        summary: "focused D06 verifier evidence",
      }],
    };
  }
}

function productionFixture(input?: {
  readonly firstReturnPlan?: SynchronizationPlan;
}) {
  const manualPlans = [seedWindowsPlan(), seedMobilePlan(), windowsChangesPlan()];
  const reconcilePlans = [input?.firstReturnPlan ?? safeStaleReturnPlan(), postSafeStalePlan()];
  let manualIndex = 0;
  let reconcileIndex = 0;
  let currentPlan: SynchronizationPlan | undefined;
  const previewedPlanIds: string[] = [];
  const executedPlanIds: string[] = [];
  const calls: string[] = [];
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };

  const observe = (next: SynchronizationPlan | undefined, kind: string) => {
    calls.push(kind);
    currentPlan = next;
    if (next) previewedPlanIds.push(String(next.planId));
    return next;
  };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => observe(manualPlans[manualIndex++], "preview-manual"),
    previewVerifyReconcile: async () => observe(reconcilePlans[reconcileIndex++], "preview-verify-reconcile"),
    runAutomatic: async trigger => { calls.push("automatic:" + trigger); },
    request: async action => {
      calls.push("request:" + action.kind);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push("preview-action:" + action.kind);
      if (action.kind !== "execute-plan") return { status: "rejected", reason: "D06 focused harness only executes asserted plans." };
      if (!currentPlan || currentPlan.planId !== action.planId) return { status: "rejected", reason: "plan mismatch" };
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => {
      throw new Error("Focused D06 tests do not require production run evidence.");
    },
  };

  const runtime: ValidationProductionRuntimePort = {
    productController: () => controller,
  };

  return { runtime, calls, previewedPlanIds, executedPlanIds };
}

function createHarness(input?: {
  readonly staleMode?: "human-checkpoint" | "not-safely-inducible";
  readonly firstReturnPlan?: SynchronizationPlan;
}) {
  const production = productionFixture({ firstReturnPlan: input?.firstReturnPlan });
  const checkpointController = new HumanCheckpointResumeController(new MemoryCheckpointStore());
  const verifier = new CapturingVerifier();
  const created: string[] = [];
  const edited: string[] = [];
  const deleted: string[] = [];
  const handoffs: string[] = [];
  const evidenceCalls: unknown[] = [];
  let role: "windows" | "mobile" = "windows";
  let stale = false;
  let staleObservations = 0;

  const staleAuthority: D06StaleAuthorityPort = {
    async observeDeviceStale(deviceId) {
      assert.equal(deviceId, mobileDevice.deviceId);
      staleObservations += 1;
      return stale
        ? { status: "stale", evidenceRefs: [validationEvidenceRef("d06:authority:stale:" + String(staleObservations))] }
        : { status: "fresh", evidenceRefs: [validationEvidenceRef("d06:authority:fresh:" + String(staleObservations))] };
    },
  };

  const scenario = createD06ScenarioPackage({
    windowsDeviceId,
    mobileDevice,
    windowsFixtures: {
      async create(spec: ValidationFixtureSpec) {
        assert.equal(role, "windows");
        assert.ok(allFixtureIds.includes(spec.fixtureId as (typeof allFixtureIds)[number]));
        created.push(spec.fixtureId);
        return descriptor(spec.fixtureId);
      },
      async edit(fixtureId, version, textVariant) {
        assert.equal(role, "windows");
        assert.equal(fixtureId, D06_UPDATE_FIXTURE_ID);
        assert.equal(version, 2);
        assert.equal(textVariant, "non-overlap-a");
        edited.push(fixtureId);
        return descriptor(fixtureId, version);
      },
      async delete(fixtureId) {
        assert.equal(role, "windows");
        assert.equal(fixtureId, D06_DELETE_FIXTURE_ID);
        deleted.push(fixtureId);
        return descriptor(fixtureId);
      },
      async hash(fixtureId) {
        return descriptor(fixtureId).hash!;
      },
    },
    mappingReader: {
      async remoteObjectId(_deviceId, path) {
        return remoteIds.get(String(path));
      },
    },
    verifier,
    handoff: {
      currentRole: () => role,
      async handoff(handoff) {
        role = handoff.targetRole;
        handoffs.push(handoff.targetRole);
        return [validationEvidenceRef("d06:handoff:" + handoff.targetRole)];
      },
    },
    staleAuthority,
    staleCondition: { mode: input?.staleMode ?? "human-checkpoint" },
    checkpointController,
    evidence: {
      async record(evidence) {
        evidenceCalls.push(evidence);
        return [validationEvidenceRef("d06:evidence")];
      },
    },
  });

  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [scenario.definition],
    prerequisites: scenario.prerequisites,
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides: scenario.moduleOverrides,
    humanCheckpoints: scenario.humanCheckpoints,
    currentDevice: () => role === "mobile"
      ? mobileDevice
      : validationDeviceIdentity(String(windowsDeviceId), "windows-desktop"),
    createRunId: () => String(run.runId),
  });

  return {
    runtime,
    scenario,
    production,
    verifier,
    checkpointController,
    created,
    edited,
    deleted,
    handoffs,
    evidenceCalls,
    setStale(value: boolean) { stale = value; },
    staleObservationCount: () => staleObservations,
  };
}

function runnerResult(result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected D06 H6B runner result.");
  return result.result;
}

async function reachStaleResume(harness: ReturnType<typeof createHarness>) {
  harness.runtime.setEnabled(true);
  const started = runnerResult(await harness.runtime.startScenario("D06"));
  assert.equal(started.status, "PAUSED-HUMAN-ACTION");
  if (started.status !== "PAUSED-HUMAN-ACTION") throw new Error("Expected D06 stale-device checkpoint.");
  assert.equal(started.checkpoint.checkpointId, D06_STALE_CHECKPOINT_ID);
  assert.equal(started.checkpoint.requestedAction, "establish-stale-device-condition");

  harness.setStale(true);
  const acknowledged = await harness.scenario.staleCheckpoint.acknowledge(run);
  assert.equal(acknowledged.status, "paused");
  const verified = await harness.scenario.staleCheckpoint.verify(run);
  assert.equal(verified.status, "resumable");

  const resumed = await harness.runtime.resumeCurrent();
  assert.equal(resumed.status, "runner");
  if (resumed.status !== "runner") throw new Error("Expected runner result after D06 resume.");
  return resumed.result;
}

test("VH29 D06 returns the exact required BLOCKED classification before mutation when genuine staleness is not safely inducible", async () => {
  const harness = createHarness({ staleMode: "not-safely-inducible" });
  harness.runtime.setEnabled(true);

  const result = runnerResult(await harness.runtime.startScenario("D06"));
  assert.equal(result.status, "BLOCKED");
  if (result.status !== "BLOCKED") throw new Error("Expected D06 blocked result.");

  assert.equal(result.reason.summary, D06_STALE_CONDITION_BLOCKED);
  assert.equal(result.state.lifecycle.kind, "terminal");
  if (result.state.lifecycle.kind === "terminal") {
    assert.equal(result.state.lifecycle.summary, D06_STALE_CONDITION_BLOCKED);
  }
  assert.deepEqual(harness.created, []);
  assert.deepEqual(harness.production.previewedPlanIds, []);
  assert.deepEqual(harness.production.executedPlanIds, []);
  assert.equal(harness.evidenceCalls.length, 0);
});

test("VH29 D06 uses VH13 genuine-staleness checkpoint, executes safe reconciliation, and keeps stale deletion hard-stopped", async () => {
  const harness = createHarness();

  assert.equal(D06_FIXTURE_ROOT, "__brain_validation__/d06");
  assert.equal(allFixtureIds.length, 6, "one destructive deletion must remain below the 20% affected-path circuit breaker");
  assert.equal("production-path-driver" in harness.scenario.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in harness.scenario.moduleOverrides, false);

  const result = await reachStaleResume(harness);
  assert.equal(result.status, "PASS");

  assert.deepEqual(harness.created, [...allFixtureIds]);
  assert.deepEqual(harness.edited, [D06_UPDATE_FIXTURE_ID]);
  assert.deepEqual(harness.deleted, [D06_DELETE_FIXTURE_ID]);
  assert.deepEqual(harness.handoffs, ["mobile", "windows", "mobile"]);

  assert.deepEqual(harness.production.previewedPlanIds, [
    "plan:d06:seed-windows",
    "plan:d06:seed-mobile",
    "plan:d06:windows-changes",
    "plan:d06:stale-return",
    "plan:d06:post-safe",
  ]);
  assert.deepEqual(harness.production.executedPlanIds, [
    "plan:d06:seed-windows",
    "plan:d06:seed-mobile",
    "plan:d06:windows-changes",
    "plan:d06:stale-return",
  ], "post-safe stale gate is asserted but never executed");

  assert.equal(harness.verifier.requests.length, 3);
  const newerAuthority = harness.verifier.requests[1]!;
  assert.ok(newerAuthority.state.some(item =>
    item.kind === "live-trash-absence-state"
    && item.path === D06_DELETE_PATH
    && item.expectedState === "trashed"
  ));
  assert.ok(newerAuthority.state.some(item =>
    item.kind === "local-content"
    && item.deviceId === mobileDevice.deviceId
    && item.path === D06_DELETE_PATH
  ));

  const safeReturn = harness.verifier.requests[2]!;
  assert.ok(safeReturn.convergence.some(item =>
    item.kind === "cross-device-content"
    && item.path === D06_UPDATE_PATH
    && item.deviceIds.includes(windowsDeviceId)
    && item.deviceIds.includes(mobileDevice.deviceId)
  ));
  assert.ok(safeReturn.state.some(item =>
    item.kind === "live-trash-absence-state"
    && item.path === D06_DELETE_PATH
    && item.expectedState === "trashed"
  ));
  assert.ok(safeReturn.state.some(item =>
    item.kind === "local-content"
    && item.deviceId === mobileDevice.deviceId
    && item.path === D06_DELETE_PATH
  ));

  assert.ok(harness.staleObservationCount() >= 4);
  assert.equal(harness.evidenceCalls.length, 1);

  const productionSteps = harness.scenario.definition.steps.filter(step =>
    step.module === "production-path-driver" || step.module === "plan-assertion-engine"
  );
  const returnCycles = productionSteps.filter(step => {
    const input = step.input as { readonly authorityCycleId?: string } | undefined;
    return input?.authorityCycleId === D06_AUTHORITY_CYCLES.staleReturnReconcile
      || input?.authorityCycleId === D06_AUTHORITY_CYCLES.staleReturnPostSafe;
  });
  assert.deepEqual(returnCycles.map(step => step.operation), [
    "preview-verify-reconcile",
    "assert-observed-plan",
    "execute-asserted-plan",
    "preview-verify-reconcile",
    "assert-observed-plan",
  ]);
});

test("VH29 D06 fixed H6B assertion rejects stale resurrection before any returning-device execution", async () => {
  const harness = createHarness({ firstReturnPlan: resurrectionPlan() });
  const result = await reachStaleResume(harness);

  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.equal(result.reason.kind, "module-failed");
  }
  assert.deepEqual(harness.production.executedPlanIds, [
    "plan:d06:seed-windows",
    "plan:d06:seed-mobile",
    "plan:d06:windows-changes",
  ]);
  assert.equal(harness.evidenceCalls.length, 0);
});

test("VH29 D06 fixed H6B assertion rejects a stale destructive proposal before execution", async () => {
  const harness = createHarness({ firstReturnPlan: unsafeDestructivePlan() });
  const result = await reachStaleResume(harness);

  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.equal(result.reason.kind, "module-failed");
  }
  assert.deepEqual(harness.production.executedPlanIds, [
    "plan:d06:seed-windows",
    "plan:d06:seed-mobile",
    "plan:d06:windows-changes",
  ]);
  assert.equal(harness.evidenceCalls.length, 0);
});

test("VH29 D06 production stale-authority observer proves the exact returning peer and never substitutes another stale device", async () => {
  let targetStale = false;
  let includeTarget = true;
  const unrelatedDeviceId = contractId<"DeviceIdentity">("device:d06:unrelated");

  const authority = {
    async loadAuthority() {
      return {
        status: "trusted",
        state: {
          deviceIdentity: contractId<"DeviceIdentity">(String(windowsDeviceId)),
          persistenceRevision: contractId<"StateRevision">("persistence:d06:7"),
          semanticGeneration: contractId<"SemanticStateGeneration">("semantic:d06:3"),
          knownDevices: [
            ...(includeTarget
              ? [{ deviceId: contractId<"DeviceIdentity">(String(mobileDevice.deviceId)), stale: targetStale }]
              : []),
            { deviceId: unrelatedDeviceId, stale: true },
          ],
        },
      } as any;
    },
  };

  const observer = new D06ProductionStaleAuthorityObserver([{
    subjectDeviceId: mobileDevice.deviceId,
    authority,
  }]);

  const unrelatedOnly = await observer.observeDeviceStale(mobileDevice.deviceId);
  assert.equal(unrelatedOnly.status, "fresh");
  assert.equal(unrelatedOnly.evidenceRefs.length, 1);

  targetStale = true;
  const target = await observer.observeDeviceStale(mobileDevice.deviceId);
  assert.equal(target.status, "stale");
  assert.equal(target.evidenceRefs.length, 1);

  includeTarget = false;
  const missingTarget = await observer.observeDeviceStale(mobileDevice.deviceId);
  assert.equal(missingTarget.status, "not-observable");
  assert.match(missingTarget.reason, /no known-device entry/i);
});

test("VH29 D06 scenario owns only D06 modules and does not replace frozen H6B production authority", () => {
  const harness = createHarness();
  const operations = harness.scenario.definition.steps.map(step => step.operation);

  assert.ok(operations.includes(D06_SCENARIO_OPERATIONS.establishStaleDevice));
  assert.ok(operations.includes(D06_SCENARIO_OPERATIONS.mutateWhileAbsent));
  assert.ok(operations.includes(D06_SCENARIO_OPERATIONS.verifySafeReconciliation));
  assert.equal("production-path-driver" in harness.scenario.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in harness.scenario.moduleOverrides, false);

  for (const step of harness.scenario.definition.steps.filter(step => step.operation === "execute-asserted-plan")) {
    const input = step.input as Record<string, unknown>;
    assert.equal(Object.prototype.hasOwnProperty.call(input, "authorization"), false);
  }
});
