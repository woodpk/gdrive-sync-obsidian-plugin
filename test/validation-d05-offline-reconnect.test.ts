import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type ContentHash,
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
import {
  HumanCheckpointResumeController,
  type HumanCheckpointDurableState,
  type HumanCheckpointStateStore,
} from "../src/validation/human-checkpoint-resume-controller";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import {
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
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";
import {
  D05_MOBILE_FIXTURE_ID,
  D05_MOBILE_RELATIVE_PATH,
  D05_OFFLINE_CHECKPOINT_ID,
  D05_RECONNECT_CHECKPOINT_ID,
  D05_WINDOWS_FIXTURE_ID,
  D05_WINDOWS_RELATIVE_PATH,
  createD05OfflineReconnectScenario,
  D05ConnectivityCheckpointController,
  type D05CrossDeviceHandoffPort,
  type D05EvidenceRecorderPort,
  type D05FixtureManagerPort,
  type D05VerifierPort,
} from "../src/validation/scenarios/d05-offline-reconnect";

const RUN = validationRunIdentity("run:vh28:d05", "D05");
const WINDOWS = validationDeviceIdentity("device:d05:windows", "windows-desktop");
const MOBILE = validationDeviceIdentity("device:d05:mobile", "iphone");
const MOBILE_PATH = contractId<"VaultPath">("validation/d05/d05-mobile-offline.md") as VaultPath;
const WINDOWS_PATH = contractId<"VaultPath">("validation/d05/d05-windows-online.md") as VaultPath;

const MOBILE_HASH_V1 = contractId<"ContentHash">(
  "sha256:1111111111111111111111111111111111111111111111111111111111111111",
);
const MOBILE_HASH_V2 = contractId<"ContentHash">(
  "sha256:2222222222222222222222222222222222222222222222222222222222222222",
);
const WINDOWS_HASH_V1 = contractId<"ContentHash">(
  "sha256:3333333333333333333333333333333333333333333333333333333333333333",
);
const WINDOWS_HASH_V2 = contractId<"ContentHash">(
  "sha256:4444444444444444444444444444444444444444444444444444444444444444",
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

class RejectingResumeAdoptionStore implements ValidationRunnerResumeAdoptionStore {
  async load(): Promise<unknown> {
    return null;
  }

  async compareAndSet(): Promise<boolean> {
    return false;
  }
}

class MemoryCheckpointStore implements HumanCheckpointStateStore {
  readonly durability = "device-local" as const;
  private value: HumanCheckpointDurableState | null = null;

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

function descriptor(
  run: typeof RUN,
  fixtureId: string,
  relativePath: string,
  path: VaultPath,
  version: number,
  hash: ContentHash,
): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(run, fixtureId),
    relativePath,
    path,
    kind: "text",
    purpose: "ordinary",
    version,
    sizeBytes: 160 + version,
    hash,
  });
}

class FakeFixtureManager implements D05FixtureManagerPort {
  readonly createCalls: ValidationFixtureSpec[] = [];
  readonly editCalls: Array<{ fixtureId: string; version: number; textVariant?: ValidationTextVariant }> = [];
  private current: ValidationFixtureDescriptor;

  constructor(
    private readonly fixtureId: string,
    private readonly relativePath: string,
    private readonly path: VaultPath,
    private readonly firstHash: ContentHash,
    private readonly editedHash: ContentHash,
  ) {
    this.current = descriptor(RUN, fixtureId, relativePath, path, 1, firstHash);
  }

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    this.createCalls.push(spec);
    if (spec.fixtureId !== this.fixtureId || spec.relativePath !== this.relativePath) {
      throw new Error("Unexpected D05 fixture creation.");
    }
    return this.current;
  }

  async edit(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    this.editCalls.push({ fixtureId, version, ...(textVariant === undefined ? {} : { textVariant }) });
    if (fixtureId !== this.fixtureId) throw new Error("Unexpected D05 fixture edit.");
    this.current = descriptor(RUN, this.fixtureId, this.relativePath, this.path, version, this.editedHash);
    return this.current;
  }

  async hash(fixtureId: string): Promise<ContentHash> {
    if (fixtureId !== this.fixtureId || !this.current.hash) throw new Error("Unexpected D05 fixture hash request.");
    return this.current.hash;
  }
}

function operation(
  kind: PlanOperationKind,
  path: VaultPath,
  suffix: string,
  targetSide?: "local" | "remote",
) {
  return Object.freeze({
    operationId: contractId<"OperationId">(`op:d05:${suffix}`),
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    destructive: false,
    preconditions: [],
    reasons: [],
  });
}

function plan(id: string, operations: SynchronizationPlan["operations"]): SynchronizationPlan {
  return Object.freeze({
    planId: contractId<"PlanId">(id),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  });
}

function normalPlans(): readonly SynchronizationPlan[] {
  return [
    plan("plan:d05:establish-windows", [
      operation("upload-create", WINDOWS_PATH, "establish-windows", "remote"),
    ]),
    plan("plan:d05:establish-mobile", [
      operation("upload-create", MOBILE_PATH, "establish-mobile-own", "remote"),
      operation("download-create", WINDOWS_PATH, "establish-mobile-windows", "local"),
    ]),
    plan("plan:d05:establish-windows-remote", [
      operation("download-create", MOBILE_PATH, "establish-windows-mobile", "local"),
    ]),
    plan("plan:d05:windows-online-update", [
      operation("upload-update", WINDOWS_PATH, "windows-online-update", "remote"),
      operation("noop", MOBILE_PATH, "windows-mobile-noop"),
    ]),
    plan("plan:d05:mobile-reconnect", [
      operation("upload-update", MOBILE_PATH, "mobile-reconnect-upload", "remote"),
      operation("download-update", WINDOWS_PATH, "mobile-reconnect-download", "local"),
    ]),
    plan("plan:d05:windows-final-reconcile", [
      operation("download-update", MOBILE_PATH, "windows-final-mobile", "local"),
      operation("noop", WINDOWS_PATH, "windows-final-noop"),
    ]),
  ];
}

function productionFixture(plans: readonly SynchronizationPlan[]) {
  let previewIndex = 0;
  const calls: string[] = [];
  const executedPlanIds: string[] = [];
  let surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      calls.push("preview-manual");
      const observed = plans[previewIndex++];
      if (!observed) throw new Error("No D05 plan remains for preview.");
      return observed;
    },
    previewVerifyReconcile: async () => {
      calls.push("preview-verify-reconcile");
      const observed = plans[previewIndex++];
      if (!observed) throw new Error("No D05 plan remains for verify/reconcile preview.");
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
    currentRunEvidence: () => { throw new Error("No direct run-evidence read is expected in D05 focused tests."); },
  };

  return {
    calls,
    executedPlanIds,
    currentSurface: () => surface,
    setConflicts(conflicts: ProductSurfaceState["conflicts"]) {
      surface = { ...surface, conflicts };
    },
    runtime: { productController: () => controller },
  };
}

function passingReport(request: ValidationStateConvergenceRequest): ValidationStateConvergenceReport {
  const stateRef = validationEvidenceRef("vh28:d05:state-proof");
  const convergenceRef = validationEvidenceRef("vh28:d05:convergence-proof");
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
      { ref: stateRef, source: "authority", summary: "D05 state postconditions observed." },
      { ref: convergenceRef, source: "convergence", summary: "D05 convergence postconditions observed." },
    ],
  };
}

class PassingVerifier implements D05VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    return passingReport(request);
  }
}

class RecordingHandoffs implements D05CrossDeviceHandoffPort {
  readonly phases: string[] = [];

  async handoff(input: Parameters<D05CrossDeviceHandoffPort["handoff"]>[0]) {
    this.phases.push(input.phase);
    return [validationEvidenceRef(`vh28:d05:handoff:${input.phase}`)];
  }
}

class RecordingEvidence implements D05EvidenceRecorderPort {
  readonly calls: Array<Parameters<D05EvidenceRecorderPort["record"]>[0]> = [];

  async record(input: Parameters<D05EvidenceRecorderPort["record"]>[0]) {
    this.calls.push(input);
    return [validationEvidenceRef("vh28:d05:scenario-evidence")];
  }
}

function subject(
  plans: readonly SynchronizationPlan[],
  resumeAdoptionStore: ValidationRunnerResumeAdoptionStore = new MemoryResumeAdoptionStore(),
) {
  const windowsFixtures = new FakeFixtureManager(
    D05_WINDOWS_FIXTURE_ID,
    D05_WINDOWS_RELATIVE_PATH,
    WINDOWS_PATH,
    WINDOWS_HASH_V1,
    WINDOWS_HASH_V2,
  );
  const mobileFixtures = new FakeFixtureManager(
    D05_MOBILE_FIXTURE_ID,
    D05_MOBILE_RELATIVE_PATH,
    MOBILE_PATH,
    MOBILE_HASH_V1,
    MOBILE_HASH_V2,
  );
  const verifier = new PassingVerifier();
  const handoffs = new RecordingHandoffs();
  const evidence = new RecordingEvidence();
  const checkpoints = new D05ConnectivityCheckpointController(
    new HumanCheckpointResumeController(new MemoryCheckpointStore(), (() => {
      let tick = 0;
      return () => new Date(Date.UTC(2026, 8, 22, 14, 0, tick++));
    })()),
  );
  const production = productionFixture(plans);
  const packageBinding = createD05OfflineReconnectScenario({
    mobilePath: MOBILE_PATH,
    windowsPath: WINDOWS_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixtures,
    mobileFixtures,
    verifier,
    handoffs,
    checkpoints,
    currentProductSurface: production.currentSurface,
    evidence,
  });
  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [packageBinding.definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore,
    prerequisites: packageBinding.prerequisites,
    moduleOverrides: packageBinding.moduleOverrides,
    humanCheckpoints: packageBinding.humanCheckpoints,
    currentDevice: () => MOBILE,
    createRunId: () => String(RUN.runId),
  });
  return {
    runtime,
    packageBinding,
    production,
    windowsFixtures,
    mobileFixtures,
    verifier,
    handoffs,
    evidence,
    checkpoints,
  };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"] | ValidationModeRuntime["resumeCurrent"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected D05 runner result.");
  return result.result;
}

const verifiedProbe = {
  async observe() {
    return { status: "verified" as const };
  },
};

test("VH28 D05 pauses for genuine offline/reconnect checkpoints and converges both independent edits", async () => {
  const s = subject(normalPlans());
  assert.equal("production-path-driver" in s.packageBinding.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in s.packageBinding.moduleOverrides, false);

  s.runtime.setEnabled(true);
  const offlinePause = runnerResult(await s.runtime.startScenario("D05"));
  assert.equal(offlinePause.status, "PAUSED-HUMAN-ACTION");
  if (offlinePause.status !== "PAUSED-HUMAN-ACTION") throw new Error("D05 must pause for genuine offline state.");
  assert.equal(String(offlinePause.checkpoint.checkpointId), D05_OFFLINE_CHECKPOINT_ID);
  assert.equal(offlinePause.checkpoint.requestedAction, "disable-mobile-connectivity");
  assert.equal(offlinePause.checkpoint.deviceId, MOBILE.deviceId);
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d05:establish-windows",
    "plan:d05:establish-mobile",
    "plan:d05:establish-windows-remote",
  ]);
  assert.equal(s.mobileFixtures.editCalls.length, 0);
  assert.equal(s.windowsFixtures.editCalls.length, 0);

  const wrongRun = await s.checkpoints.acknowledge(
    validationRunIdentity("run:vh28:d05:wrong", "D05"),
    D05_OFFLINE_CHECKPOINT_ID,
  );
  assert.equal(wrongRun.status, "rejected");
  if (wrongRun.status === "rejected") assert.equal(wrongRun.reason, "run-mismatch");

  const wrongCheckpoint = await s.checkpoints.acknowledge(RUN, "d05-wrong-checkpoint");
  assert.equal(wrongCheckpoint.status, "rejected");
  if (wrongCheckpoint.status === "rejected") assert.equal(wrongCheckpoint.reason, "checkpoint-mismatch");

  const offlineAck = await s.checkpoints.acknowledge(RUN, D05_OFFLINE_CHECKPOINT_ID);
  assert.equal(offlineAck.status, "paused");
  const offlineVerified = await s.checkpoints.verify(
    RUN,
    D05_OFFLINE_CHECKPOINT_ID,
    MOBILE,
    verifiedProbe,
  );
  assert.equal(offlineVerified.status, "resumable");

  const reconnectPause = runnerResult(await s.runtime.resumeCurrent());
  assert.equal(reconnectPause.status, "PAUSED-HUMAN-ACTION");
  if (reconnectPause.status !== "PAUSED-HUMAN-ACTION") throw new Error("D05 must pause for genuine reconnect.");
  assert.equal(String(reconnectPause.checkpoint.checkpointId), D05_RECONNECT_CHECKPOINT_ID);
  assert.equal(reconnectPause.checkpoint.requestedAction, "restore-mobile-connectivity");
  assert.equal(s.checkpoints.records(RUN).length, 1);
  assert.equal(s.checkpoints.records(RUN)[0]?.action, "disable-mobile-connectivity");

  assert.deepEqual(s.mobileFixtures.editCalls, [{
    fixtureId: D05_MOBILE_FIXTURE_ID,
    version: 2,
    textVariant: "non-overlap-a",
  }]);
  assert.deepEqual(s.windowsFixtures.editCalls, [{
    fixtureId: D05_WINDOWS_FIXTURE_ID,
    version: 2,
    textVariant: "non-overlap-b",
  }]);
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d05:establish-windows",
    "plan:d05:establish-mobile",
    "plan:d05:establish-windows-remote",
    "plan:d05:windows-online-update",
  ]);

  const stalePriorCheckpoint = await s.checkpoints.acknowledge(RUN, D05_OFFLINE_CHECKPOINT_ID);
  assert.equal(stalePriorCheckpoint.status, "rejected");
  if (stalePriorCheckpoint.status === "rejected") {
    assert.equal(stalePriorCheckpoint.reason, "checkpoint-mismatch");
  }

  const reconnectAck = await s.checkpoints.acknowledge(RUN, D05_RECONNECT_CHECKPOINT_ID);
  assert.equal(reconnectAck.status, "paused");
  const reconnectVerified = await s.checkpoints.verify(
    RUN,
    D05_RECONNECT_CHECKPOINT_ID,
    MOBILE,
    verifiedProbe,
  );
  assert.equal(reconnectVerified.status, "resumable");

  const passed = runnerResult(await s.runtime.resumeCurrent());
  assert.equal(passed.status, "PASS");

  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d05:establish-windows",
    "plan:d05:establish-mobile",
    "plan:d05:establish-windows-remote",
    "plan:d05:windows-online-update",
    "plan:d05:mobile-reconnect",
    "plan:d05:windows-final-reconcile",
  ]);
  assert.deepEqual(s.handoffs.phases, [
    "baseline-to-mobile",
    "baseline-to-windows",
    "reconnected-mobile-to-windows",
  ]);

  assert.equal(s.verifier.requests.length, 2);
  const final = s.verifier.requests[1]!;
  const mobileConvergence = final.convergence.find(
    assertion => assertion.kind === "cross-device-content" && assertion.path === MOBILE_PATH,
  );
  const windowsConvergence = final.convergence.find(
    assertion => assertion.kind === "cross-device-content" && assertion.path === WINDOWS_PATH,
  );
  assert.ok(mobileConvergence && mobileConvergence.kind === "cross-device-content");
  assert.ok(windowsConvergence && windowsConvergence.kind === "cross-device-content");
  assert.equal(mobileConvergence.content.hash, MOBILE_HASH_V2);
  assert.equal(windowsConvergence.content.hash, WINDOWS_HASH_V2);

  const remoteContent = final.state.filter(postcondition => postcondition.kind === "remote-content");
  assert.deepEqual(
    remoteContent.map(postcondition => [postcondition.path, postcondition.content.hash]),
    [
      [MOBILE_PATH, MOBILE_HASH_V2],
      [WINDOWS_PATH, WINDOWS_HASH_V2],
    ],
    "remote-content verification must require one exact occupant per independent D05 path",
  );

  const baseAuthority = final.state.filter(postcondition => postcondition.kind === "base-authority");
  assert.equal(baseAuthority.length, 4, "both devices must converge BASE authority for both D05 paths");
  assert.deepEqual(
    new Set(baseAuthority.map(postcondition => String(postcondition.deviceId))),
    new Set([String(WINDOWS.deviceId), String(MOBILE.deviceId)]),
  );

  const liveMappings = final.state.filter(postcondition => postcondition.kind === "mapping-or-tombstone");
  assert.equal(liveMappings.length, 4, "both devices must retain live mappings for both D05 paths");
  assert.ok(liveMappings.every(postcondition => postcondition.expected === "mapping"));

  const outstandingEffects = final.state.filter(postcondition => postcondition.kind === "durable-intent-or-effect");
  assert.equal(outstandingEffects.length, 2, "each device must prove no outstanding D05 effect remains");
  assert.ok(outstandingEffects.every(postcondition => postcondition.expected === "none-outstanding"));

  assert.equal(s.evidence.calls.length, 1);
  const evidence = s.evidence.calls[0]!;
  assert.equal(evidence.mobileFixture.hash, MOBILE_HASH_V2);
  assert.equal(evidence.windowsFixture.hash, WINDOWS_HASH_V2);
  assert.equal(evidence.connectivityCheckpoints.length, 2);
  assert.deepEqual(
    evidence.connectivityCheckpoints.map(record => [
      record.action,
      record.device.deviceId,
      record.device.platform,
      Boolean(record.acknowledgedAt),
      Boolean(record.verifiedAt),
    ]),
    [
      ["disable-mobile-connectivity", MOBILE.deviceId, "iphone", true, true],
      ["restore-mobile-connectivity", MOBILE.deviceId, "iphone", true, true],
    ],
  );
});

test("VH28 D05 does not record or advance a checkpoint when resume adoption fails", async () => {
  const s = subject(normalPlans(), new RejectingResumeAdoptionStore());

  s.runtime.setEnabled(true);
  const offlinePause = runnerResult(await s.runtime.startScenario("D05"));
  assert.equal(offlinePause.status, "PAUSED-HUMAN-ACTION");

  await s.checkpoints.acknowledge(RUN, D05_OFFLINE_CHECKPOINT_ID);
  await s.checkpoints.verify(RUN, D05_OFFLINE_CHECKPOINT_ID, MOBILE, verifiedProbe);

  const failedResume = runnerResult(await s.runtime.resumeCurrent());
  assert.equal(failedResume.status, "PAUSED-HUMAN-ACTION");
  assert.equal(s.checkpoints.records(RUN).length, 0);
  assert.equal(s.mobileFixtures.editCalls.length, 0);
  assert.equal(s.windowsFixtures.editCalls.length, 0);
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d05:establish-windows",
    "plan:d05:establish-mobile",
    "plan:d05:establish-windows-remote",
  ]);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH28 D05 checkpoint observations are isolated by exact run identity across retries and later runs", async () => {
  const store = new MemoryCheckpointStore();
  const checkpoints = new D05ConnectivityCheckpointController(
    new HumanCheckpointResumeController(store, (() => {
      let tick = 0;
      return () => new Date(Date.UTC(2026, 8, 22, 15, 0, tick++));
    })()),
  );
  const nextRun = validationRunIdentity("run:vh28:d05:next", "D05");
  const resumeCommit = {
    async commitResume() {},
  };

  await checkpoints.begin({
    run: RUN,
    checkpointId: D05_OFFLINE_CHECKPOINT_ID,
    device: MOBILE,
    action: "disable-mobile-connectivity",
    resumeStepId: "d05-edit-mobile-offline",
  });
  await checkpoints.acknowledge(RUN, D05_OFFLINE_CHECKPOINT_ID);
  await checkpoints.verify(RUN, D05_OFFLINE_CHECKPOINT_ID, MOBILE, verifiedProbe);
  const firstConsumed = await checkpoints.consumeResume(
    RUN,
    D05_OFFLINE_CHECKPOINT_ID,
    MOBILE,
    resumeCommit,
  );
  assert.equal(firstConsumed.status, "resumed");
  assert.equal(checkpoints.records(RUN).length, 1);
  assert.equal(checkpoints.records(nextRun).length, 0);

  await checkpoints.begin({
    run: nextRun,
    checkpointId: D05_OFFLINE_CHECKPOINT_ID,
    device: MOBILE,
    action: "disable-mobile-connectivity",
    resumeStepId: "d05-edit-mobile-offline",
  });
  await checkpoints.acknowledge(nextRun, D05_OFFLINE_CHECKPOINT_ID);
  await checkpoints.verify(nextRun, D05_OFFLINE_CHECKPOINT_ID, MOBILE, verifiedProbe);
  const secondConsumed = await checkpoints.consumeResume(
    nextRun,
    D05_OFFLINE_CHECKPOINT_ID,
    MOBILE,
    resumeCommit,
  );
  assert.equal(secondConsumed.status, "resumed");

  assert.equal(checkpoints.records(RUN).length, 1);
  assert.equal(checkpoints.records(nextRun).length, 1);
  assert.ok(checkpoints.records(RUN).every(record => record.run.runId === RUN.runId));
  assert.ok(checkpoints.records(nextRun).every(record => record.run.runId === nextRun.runId));
});

test("VH28 D05 fails final verification when a clean plan leaves a retained conflict on a D05 path", async () => {
  const s = subject(normalPlans());

  s.runtime.setEnabled(true);
  const offlinePause = runnerResult(await s.runtime.startScenario("D05"));
  assert.equal(offlinePause.status, "PAUSED-HUMAN-ACTION");
  await s.checkpoints.acknowledge(RUN, D05_OFFLINE_CHECKPOINT_ID);
  await s.checkpoints.verify(RUN, D05_OFFLINE_CHECKPOINT_ID, MOBILE, verifiedProbe);

  const reconnectPause = runnerResult(await s.runtime.resumeCurrent());
  assert.equal(reconnectPause.status, "PAUSED-HUMAN-ACTION");
  await s.checkpoints.acknowledge(RUN, D05_RECONNECT_CHECKPOINT_ID);
  await s.checkpoints.verify(RUN, D05_RECONNECT_CHECKPOINT_ID, MOBILE, verifiedProbe);

  s.production.setConflicts([
    {
      kind: "unresolved-text",
      conflictId: contractId<"ConflictId">("conflict:d05:retained"),
      path: MOBILE_PATH,
      preserved: {
        local: {
          source: "local",
          version: { path: MOBILE_PATH, entityKind: "file" },
        },
        remote: {
          source: "remote",
          version: { path: MOBILE_PATH, entityKind: "file" },
        },
      },
    },
  ]);

  const failed = runnerResult(await s.runtime.resumeCurrent());
  assert.equal(failed.status, "FAIL");
  if (failed.status === "FAIL") {
    assert.match(failed.reason.summary, /retains a conflict/i);
  }
  assert.equal(s.verifier.requests.length, 1, "final state verifier must not bless a retained conflict surface");
  assert.equal(s.evidence.calls.length, 0);
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d05:establish-windows",
    "plan:d05:establish-mobile",
    "plan:d05:establish-windows-remote",
    "plan:d05:windows-online-update",
    "plan:d05:mobile-reconnect",
    "plan:d05:windows-final-reconcile",
  ]);
});

test("VH28 D05 rejects a reconnect conflict before mutation because the independent paths do not genuinely conflict", async () => {
  const plans = [...normalPlans()];
  plans[4] = plan("plan:d05:unexpected-conflict", [
    {
      ...operation("unresolved-conflict", MOBILE_PATH, "unexpected-conflict"),
      conflictId: "d05-unexpected-conflict",
    },
    operation("download-update", WINDOWS_PATH, "mobile-reconnect-download", "local"),
  ]);
  const s = subject(plans);

  s.runtime.setEnabled(true);
  const offlinePause = runnerResult(await s.runtime.startScenario("D05"));
  assert.equal(offlinePause.status, "PAUSED-HUMAN-ACTION");
  await s.checkpoints.acknowledge(RUN, D05_OFFLINE_CHECKPOINT_ID);
  await s.checkpoints.verify(RUN, D05_OFFLINE_CHECKPOINT_ID, MOBILE, verifiedProbe);

  const reconnectPause = runnerResult(await s.runtime.resumeCurrent());
  assert.equal(reconnectPause.status, "PAUSED-HUMAN-ACTION");
  await s.checkpoints.acknowledge(RUN, D05_RECONNECT_CHECKPOINT_ID);
  await s.checkpoints.verify(RUN, D05_RECONNECT_CHECKPOINT_ID, MOBILE, verifiedProbe);

  const failed = runnerResult(await s.runtime.resumeCurrent());
  assert.equal(failed.status, "FAIL");
  if (failed.status === "FAIL") {
    assert.match(failed.reason.summary, /conflict|unresolved-conflict|Expected operation|forbidden/i);
  }

  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d05:establish-windows",
    "plan:d05:establish-mobile",
    "plan:d05:establish-windows-remote",
    "plan:d05:windows-online-update",
  ]);
  assert.equal(s.evidence.calls.length, 0);
  assert.equal(s.verifier.requests.length, 1, "final convergence must not run after unexpected conflict");
});

test("VH28 D05 uses the real VH13 checkpoint controller and no injected transport-offline fault", () => {
  const s = subject(normalPlans());
  const checkpointSteps = s.packageBinding.definition.steps.filter(
    step => step.module === "human-checkpoint-resume-controller",
  );
  assert.deepEqual(
    checkpointSteps.map(step => step.operation),
    [
      "d05-pause-for-genuine-mobile-offline",
      "d05-pause-for-mobile-reconnect",
    ],
  );
  assert.equal(
    s.packageBinding.definition.steps.some(step => step.module === "transport-coverage-faults"),
    false,
  );
  assert.deepEqual(Object.keys(s.packageBinding.moduleOverrides).sort(), [
    "cross-device-coordinator",
    "fixture-manager",
    "human-checkpoint-resume-controller",
    "scenario-evidence-recorder",
    "state-convergence-verifier",
  ]);
});
