import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type OperationId,
  type PlanId,
  type PlanOperationKind,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import {
  validationAssertionGroupResult,
  validationAssertionId,
  validationEvidenceRef,
  validationVerificationResult,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type {
  ValidationFixtureDescriptor,
  ValidationFixtureSpec,
} from "../src/validation/fixture-manager";
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
import {
  StateConvergenceVerifier,
  type ValidationDeviceObservationSource,
  type ValidationRemoteObservationSource,
  type ValidationStateConvergenceReport,
  type ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { mergeThreeWayText } from "../src/core/conflict-resolver";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";
import {
  D01_AUTHORITY_CYCLES,
  D01_BASE_HASH,
  D01_BASE_TEXT,
  D01_EXPECTED_MERGED_HASH,
  D01_EXPECTED_MERGED_SIZE_BYTES,
  D01_EXPECTED_MERGED_TEXT,
  D01_LIVE_PACKAGE,
  D01_MOBILE_EDIT_HASH,
  D01_MOBILE_EDIT_TEXT,
  D01_OPERATIONS,
  D01_SENTINEL_FIXTURE_ID,
  D01_SENTINEL_RELATIVE_PATH,
  D01_TARGET_FIXTURE_ID,
  D01_TARGET_RELATIVE_PATH,
  D01_WINDOWS_EDIT_HASH,
  D01_WINDOWS_EDIT_TEXT,
  createD01CleanTextMergeScenario,
  type D01ConflictArtifactProbe,
  type D01CrossDeviceHandoffPort,
  type D01EvidenceRecorderPort,
  type D01ExistingTextFixturePort,
  type D01TrustedMappingReader,
  type D01VerifierPort,
  type D01WindowsFixtureManagerPort,
} from "../src/validation/scenarios/d01-clean-text-merge";

const RUN = validationRunIdentity("run:vh24:d01", "D01");
const WINDOWS = validationDeviceIdentity("device:d01:windows", "windows-desktop");
const MOBILE = validationDeviceIdentity("device:d01:mobile", "iphone");
const TARGET_PATH = contractId<"VaultPath">("validation/d01/d01-clean-text-merge.md") as VaultPath;
const SENTINEL_PATH = contractId<"VaultPath">("validation/d01/d01-unrelated-sentinel.md") as VaultPath;
const REMOTE_ID = contractId<"RemoteObjectId">("remote:d01:target") as RemoteObjectId;
const DRIFTED_REMOTE_ID = contractId<"RemoteObjectId">("remote:d01:drifted-target") as RemoteObjectId;
const SENTINEL_HASH = contractId<"ContentHash">(
  "sha256:9999999999999999999999999999999999999999999999999999999999999999",
);
const SENTINEL_SIZE = 173;

const TERMINAL_DIAGNOSTICS = Object.freeze({
  establishWindows: {
    deviceId: WINDOWS.deviceId,
    component: "sync.controller",
    event: "sync-run-complete",
    diagnosticRunId: 101,
    expectedFields: { result: "complete" },
  },
  establishMobile: {
    deviceId: MOBILE.deviceId,
    component: "sync.controller",
    event: "sync-run-complete",
    diagnosticRunId: 102,
    expectedFields: { result: "complete" },
  },
  windowsFirstSync: {
    deviceId: WINDOWS.deviceId,
    component: "sync.controller",
    event: "sync-run-complete",
    diagnosticRunId: 103,
    expectedFields: { result: "complete" },
  },
  mobileCleanMerge: {
    deviceId: MOBILE.deviceId,
    component: "sync.controller",
    event: "sync-run-complete",
    diagnosticRunId: 104,
    expectedFields: { result: "complete" },
  },
  windowsReconcile: {
    deviceId: WINDOWS.deviceId,
    component: "sync.controller",
    event: "sync-run-complete",
    diagnosticRunId: 105,
    expectedFields: { result: "complete" },
  },
} as const);

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

function targetDescriptor(
  version: number,
  hash: typeof D01_BASE_HASH,
  sizeBytes: number,
): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(RUN, D01_TARGET_FIXTURE_ID),
    relativePath: D01_TARGET_RELATIVE_PATH,
    path: TARGET_PATH,
    kind: "text",
    purpose: "conflict",
    version,
    sizeBytes,
    hash,
  });
}

function sentinelDescriptor(): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(RUN, D01_SENTINEL_FIXTURE_ID),
    relativePath: D01_SENTINEL_RELATIVE_PATH,
    path: SENTINEL_PATH,
    kind: "text",
    purpose: "ordinary",
    version: 1,
    sizeBytes: SENTINEL_SIZE,
    hash: SENTINEL_HASH,
  });
}

const BASE_DESCRIPTOR = targetDescriptor(1, D01_BASE_HASH, new TextEncoder().encode(D01_BASE_TEXT).byteLength);
const WINDOWS_DESCRIPTOR = targetDescriptor(2, D01_WINDOWS_EDIT_HASH, new TextEncoder().encode(D01_WINDOWS_EDIT_TEXT).byteLength);
const MOBILE_DESCRIPTOR = targetDescriptor(2, D01_MOBILE_EDIT_HASH, new TextEncoder().encode(D01_MOBILE_EDIT_TEXT).byteLength);
const SENTINEL_DESCRIPTOR = sentinelDescriptor();

class FakeWindowsFixtures implements D01WindowsFixtureManagerPort {
  readonly createCalls: ValidationFixtureSpec[] = [];

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    this.createCalls.push(spec);
    if (spec.fixtureId === D01_TARGET_FIXTURE_ID) return BASE_DESCRIPTOR;
    if (spec.fixtureId === D01_SENTINEL_FIXTURE_ID) return SENTINEL_DESCRIPTOR;
    throw new Error("Unexpected D01 fixture ID.");
  }

  async hash(fixtureId: string) {
    if (fixtureId === D01_TARGET_FIXTURE_ID) return D01_BASE_HASH;
    if (fixtureId === D01_SENTINEL_FIXTURE_ID) return SENTINEL_HASH;
    throw new Error("Unexpected D01 fixture hash request.");
  }
}

class FakeExactEditPort implements D01ExistingTextFixturePort {
  readonly replaceCalls: Array<Parameters<D01ExistingTextFixturePort["replaceExactText"]>[0]> = [];
  private currentHash = D01_BASE_HASH;

  constructor(
    private readonly replacementText: string,
    private readonly replacementHash: typeof D01_BASE_HASH,
    private readonly descriptor: ValidationFixtureDescriptor,
  ) {}

  async replaceExactText(input: Parameters<D01ExistingTextFixturePort["replaceExactText"]>[0]) {
    this.replaceCalls.push(input);
    assert.equal(input.run.runId, RUN.runId);
    assert.equal(input.fixtureId, D01_TARGET_FIXTURE_ID);
    assert.equal(input.relativePath, D01_TARGET_RELATIVE_PATH);
    assert.equal(input.path, TARGET_PATH);
    assert.equal(input.expectedCurrentHash, D01_BASE_HASH);
    assert.equal(input.replacementText, this.replacementText);
    assert.equal(input.expectedResultHash, this.replacementHash);
    assert.equal(input.descriptorVersion, 2);
    this.currentHash = this.replacementHash;
    return this.descriptor;
  }

  async hashExisting() {
    return this.currentHash;
  }
}

function operation(
  id: string,
  kind: PlanOperationKind,
  path: VaultPath,
  targetSide?: "local" | "remote",
): SynchronizationPlan["operations"][number] {
  return Object.freeze({
    operationId: contractId<"OperationId">(id) as OperationId,
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    destructive: false,
    preconditions: [],
    reasons: [{ code: "vh24-d01", summary: "Deterministic D01 focused-plan fixture." }],
    ...(kind === "unresolved-conflict" ? { conflictId: "conflict:d01" } : {}),
  });
}

function plan(
  id: string,
  operations: SynchronizationPlan["operations"],
  disposition: SynchronizationPlan["executionDisposition"] = "safe-auto-eligible",
): SynchronizationPlan {
  return Object.freeze({
    planId: contractId<"PlanId">(id) as PlanId,
    trigger: "manual",
    operations,
    executionDisposition: disposition,
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  });
}

function establishWindowsPlan() {
  return plan("plan:d01:establish-windows", [
    operation("op:d01:establish-windows-target", "upload-create", TARGET_PATH, "remote"),
    operation("op:d01:establish-windows-sentinel", "upload-create", SENTINEL_PATH, "remote"),
  ]);
}

function establishMobilePlan() {
  return plan("plan:d01:establish-mobile", [
    operation("op:d01:establish-mobile-target", "download-create", TARGET_PATH, "local"),
    operation("op:d01:establish-mobile-sentinel", "download-create", SENTINEL_PATH, "local"),
  ]);
}

function windowsFirstSyncPlan() {
  return plan("plan:d01:windows-first-sync", [
    operation("op:d01:windows-update", "upload-update", TARGET_PATH, "remote"),
    operation("op:d01:windows-sentinel-noop", "noop", SENTINEL_PATH),
  ]);
}

function mobileMergePlan(kind: "clean-text-merge" | "unresolved-conflict" | "download-update" = "clean-text-merge") {
  return plan(
    "plan:d01:mobile-merge:" + kind,
    [
      operation(
        "op:d01:mobile-merge:" + kind,
        kind,
        TARGET_PATH,
        kind === "download-update" ? "local" : undefined,
      ),
      operation("op:d01:mobile-sentinel-noop", "noop", SENTINEL_PATH),
    ],
    kind === "unresolved-conflict" ? "requires-user-approval" : "safe-auto-eligible",
  );
}

function windowsReconcilePlan() {
  return plan("plan:d01:windows-reconcile", [
    operation("op:d01:windows-reconcile", "download-update", TARGET_PATH, "local"),
    operation("op:d01:windows-reconcile-sentinel-noop", "noop", SENTINEL_PATH),
  ]);
}

interface World {
  role: "windows" | "mobile";
  remoteId: RemoteObjectId;
  firstSyncExecuted: boolean;
  mergeExecuted: boolean;
  reconcileExecuted: boolean;
  events: string[];
}

function freshWorld(): World {
  return {
    role: "windows",
    remoteId: REMOTE_ID,
    firstSyncExecuted: false,
    mergeExecuted: false,
    reconcileExecuted: false,
    events: [],
  };
}

function productionFixture(world: World, plans: readonly SynchronizationPlan[]) {
  let previewIndex = 0;
  const previewedPlanIds: string[] = [];
  const executedPlanIds: string[] = [];
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      const observed = plans[previewIndex];
      previewIndex += 1;
      world.events.push("preview:" + String(observed?.planId ?? "none"));
      if (observed) previewedPlanIds.push(String(observed.planId));
      return observed;
    },
    previewVerifyReconcile: async () => {
      throw new Error("D01 uses manual preview for every synchronization phase.");
    },
    runAutomatic: async () => {
      throw new Error("D01 must not invoke automatic synchronization.");
    },
    request: async action => {
      world.events.push("request:" + action.kind);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      executedPlanIds.push(String(action.planId));
      world.events.push("execute:" + String(action.planId));
      if (action.planId === windowsFirstSyncPlan().planId) world.firstSyncExecuted = true;
      if (String(action.planId).startsWith("plan:d01:mobile-merge:")) world.mergeExecuted = true;
      if (action.planId === windowsReconcilePlan().planId) world.reconcileExecuted = true;
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => {
      throw new Error("D01 focused tests do not require direct production run-evidence reads.");
    },
  };

  return {
    runtime: { productController: () => controller },
    previewedPlanIds,
    executedPlanIds,
  };
}

function passingReport(request: ValidationStateConvergenceRequest): ValidationStateConvergenceReport {
  const stateRef = validationEvidenceRef("vh24:d01:state");
  const convergenceRef = validationEvidenceRef("vh24:d01:convergence");
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
      { ref: stateRef, source: "authority", summary: "D01 state postconditions observed." },
      { ref: convergenceRef, source: "convergence", summary: "D01 convergence postconditions observed." },
    ],
  };
}

type D01VerifierMode = "pass" | "final-terminal-not-observable" | "final-duplicate-target";

function assertD01RequestShape(request: ValidationStateConvergenceRequest, phaseIndex: number): void {
  const terminal = request.state.filter(item => item.kind === "terminal-product-result");
  if (phaseIndex === 0) {
    assert.deepEqual(terminal.map(item => item.diagnostic.diagnosticRunId), [101, 102]);
  } else if (phaseIndex === 1) {
    assert.deepEqual(terminal.map(item => item.diagnostic.diagnosticRunId), [103]);
  } else if (phaseIndex === 2) {
    assert.deepEqual(terminal.map(item => item.diagnostic.diagnosticRunId), [104]);
    assert.ok(request.state.some(item =>
      item.kind === "live-trash-absence-state"
      && item.path === TARGET_PATH
      && item.expectedState === "live"
      && item.remoteObjectId === undefined
    ));
  } else if (phaseIndex === 3) {
    assert.deepEqual(terminal.map(item => item.diagnostic.diagnosticRunId), [105]);
    assert.ok(request.state.some(item =>
      item.kind === "live-trash-absence-state"
      && item.path === TARGET_PATH
      && item.expectedState === "live"
      && item.remoteObjectId === undefined
    ));
    assert.equal(request.state.filter(item => item.kind === "mapping-or-tombstone").length, 2);
    const stable = request.convergence.find(item => item.kind === "final-reconciliation-stable");
    assert.ok(stable);
    assert.equal(stable.terminalDiagnostic.diagnosticRunId, 105);
    assert.equal(stable.requireRemoteComplete, true);
    assert.equal(stable.requireNoOutstandingIntents, true);
    assert.equal(stable.requireNoLearnedRemoteBatches, true);
    assert.equal(stable.requireAllRecordedPathsConverged, true);
  } else {
    assert.fail("Unexpected D01 verifier phase index.");
  }

  for (const item of terminal) {
    assert.equal(item.diagnostic.component, "sync.controller");
    assert.equal(item.diagnostic.event, "sync-run-complete");
    assert.equal(item.diagnostic.expectedFields?.result, "complete");
    assert.ok(Number.isSafeInteger(item.diagnostic.diagnosticRunId));
  }
}

function minimalDevice(
  diagnostics: readonly {
    readonly sequence: number;
    readonly runId: number;
    readonly component: "sync.controller";
    readonly event: string;
    readonly fields: Readonly<Record<string, string>>;
  }[] = [],
): ValidationDeviceObservationSource {
  return {
    deviceId: WINDOWS.deviceId,
    local: {
      observe: async (path: VaultPath) => ({
        status: "present",
        side: "local",
        path,
        entityKind: "file",
        stability: "stable",
        observationToken: contractId<"ObservationToken">("token:d01:minimal"),
      }),
    },
    authority: {
      loadAuthority: async () => {
        throw new Error("Minimal focused verifier does not require authority reads.");
      },
    },
    diagnostics: {
      snapshot: () => diagnostics.map(item => ({
        timestamp: "2026-09-22T13:00:00.000-04:00",
        sequence: item.sequence,
        level: "trace" as const,
        component: item.component,
        event: item.event,
        runId: item.runId,
        platform: "desktop" as const,
        fields: item.fields,
      })),
    },
  } as unknown as ValidationDeviceObservationSource;
}

function duplicateRemote(): ValidationRemoteObservationSource {
  const identity = {
    rootId: contractId<"RemoteObjectId">("remote:d01:root"),
    vaultIdentity: contractId<"VaultIdentity">("vault:d01"),
    protocolVersion: contractId<"ProtocolVersion">("1"),
  };
  const duplicateId = contractId<"RemoteObjectId">("remote:d01:duplicate") as RemoteObjectId;
  return {
    identity,
    drive: {
      validateManagedRoot: async () => ({ ok: true, value: { status: "valid", identity } }),
      listForReconciliation: async () => ({
        ok: true,
        value: {
          entries: [
            { path: TARGET_PATH, entityKind: "file", remoteObjectId: REMOTE_ID, content: { hash: D01_EXPECTED_MERGED_HASH, sizeBytes: D01_EXPECTED_MERGED_SIZE_BYTES }, trashed: false },
            { path: TARGET_PATH, entityKind: "file", remoteObjectId: duplicateId, content: { hash: D01_EXPECTED_MERGED_HASH, sizeBytes: D01_EXPECTED_MERGED_SIZE_BYTES }, trashed: false },
          ],
          completeness: { status: "complete" },
        },
      }),
      download: async () => {
        throw new Error("Duplicate-path proof must fail before remote download.");
      },
    },
  } as unknown as ValidationRemoteObservationSource;
}

function minimalPassingConvergence(run: ValidationStateConvergenceRequest["run"]): ValidationStateConvergenceRequest["convergence"][number] {
  return {
    kind: "cross-device-path",
    assertion: {
      assertionId: validationAssertionId("d01.minimal.cross-device-path"),
      kind: "cross-device-path",
      subject: "D01 target",
      expectation: "Minimal focused verifier keeps the local target observable.",
    },
    deviceIds: [WINDOWS.deviceId],
    path: TARGET_PATH,
    expected: "file",
  };
}

async function frozenAcceptanceFailure(
  request: ValidationStateConvergenceRequest,
  mode: Exclude<D01VerifierMode, "pass">,
): Promise<ValidationStateConvergenceReport> {
  const state = mode === "final-terminal-not-observable"
    ? request.state.find(item => item.kind === "terminal-product-result" && item.diagnostic.diagnosticRunId === 105)
    : request.state.find(item =>
      item.kind === "live-trash-absence-state"
      && item.path === TARGET_PATH
      && item.expectedState === "live"
      && item.remoteObjectId === undefined
    );
  assert.ok(state);

  const verifier = new StateConvergenceVerifier({
    devices: [minimalDevice()],
    ...(mode === "final-duplicate-target" ? { remote: duplicateRemote() } : {}),
  });
  return verifier.verify({
    run: request.run,
    state: [state],
    convergence: [minimalPassingConvergence(request.run)],
  });
}

class CapturingVerifier implements D01VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  constructor(private readonly mode: D01VerifierMode = "pass") {}

  async verify(request: ValidationStateConvergenceRequest) {
    const phaseIndex = this.requests.length;
    this.requests.push(request);
    assertD01RequestShape(request, phaseIndex);
    if (phaseIndex === 3 && this.mode !== "pass") {
      return frozenAcceptanceFailure(request, this.mode);
    }
    return passingReport(request);
  }
}

class RecordingHandoffs implements D01CrossDeviceHandoffPort {
  readonly phases: string[] = [];

  constructor(private readonly world: World) {}

  currentRole() {
    return this.world.role;
  }

  async handoff(input: Parameters<D01CrossDeviceHandoffPort["handoff"]>[0]) {
    this.world.role = input.targetRole;
    this.phases.push(input.phase);
    this.world.events.push("handoff:" + input.phase);
    return [validationEvidenceRef("vh24:d01:handoff:" + input.phase)];
  }
}

class StableMappingReader implements D01TrustedMappingReader {
  constructor(private readonly world: World, private readonly driftAfterMerge = false) {}

  async remoteObjectId() {
    if (this.driftAfterMerge && this.world.mergeExecuted) return DRIFTED_REMOTE_ID;
    return this.world.remoteId;
  }
}

class RecordingEvidence implements D01EvidenceRecorderPort {
  readonly calls: Array<Parameters<D01EvidenceRecorderPort["record"]>[0]> = [];

  async record(input: Parameters<D01EvidenceRecorderPort["record"]>[0]) {
    this.calls.push(input);
    return [validationEvidenceRef("vh24:d01:evidence")];
  }
}

function conflictProbe(
  result: "verified" | "failed" | "not-observable" = "verified",
): D01ConflictArtifactProbe {
  return {
    async verifyNoConflictCopy() {
      if (result === "verified") {
        return {
          status: "verified",
          evidenceRefs: [validationEvidenceRef("vh24:d01:no-conflict-copy")],
        };
      }
      return {
        status: result,
        summary: "D01 conflict-copy absence was not established.",
        evidenceRefs: [validationEvidenceRef("vh24:d01:conflict-copy-probe")],
      };
    },
  };
}

function subject(input?: {
  readonly mergeKind?: "clean-text-merge" | "unresolved-conflict" | "download-update";
  readonly conflictProbeResult?: "verified" | "failed" | "not-observable";
  readonly driftAfterMerge?: boolean;
  readonly verifierMode?: D01VerifierMode;
}) {
  const world = freshWorld();
  const windowsFixtures = new FakeWindowsFixtures();
  const windowsEdit = new FakeExactEditPort(D01_WINDOWS_EDIT_TEXT, D01_WINDOWS_EDIT_HASH, WINDOWS_DESCRIPTOR);
  const mobileEdit = new FakeExactEditPort(D01_MOBILE_EDIT_TEXT, D01_MOBILE_EDIT_HASH, MOBILE_DESCRIPTOR);
  const verifier = new CapturingVerifier(input?.verifierMode);
  const handoffs = new RecordingHandoffs(world);
  const evidence = new RecordingEvidence();
  const packageBinding = createD01CleanTextMergeScenario({
    targetPath: TARGET_PATH,
    sentinelPath: SENTINEL_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixtures,
    windowsEdit,
    mobileEdit,
    mappingReader: new StableMappingReader(world, input?.driftAfterMerge),
    verifier,
    conflictArtifacts: conflictProbe(input?.conflictProbeResult),
    handoffs,
    terminalDiagnostics: TERMINAL_DIAGNOSTICS,
    evidence,
  });
  const plans = [
    establishWindowsPlan(),
    establishMobilePlan(),
    windowsFirstSyncPlan(),
    mobileMergePlan(input?.mergeKind),
    windowsReconcilePlan(),
  ];
  const production = productionFixture(world, plans);
  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [packageBinding.definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites: packageBinding.prerequisites,
    moduleOverrides: packageBinding.moduleOverrides,
    currentDevice: () => WINDOWS,
    createRunId: () => String(RUN.runId),
  });
  return {
    runtime,
    world,
    packageBinding,
    production,
    windowsFixtures,
    windowsEdit,
    mobileEdit,
    verifier,
    handoffs,
    evidence,
  };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected D01 runner result.");
  return result.result;
}

test("VH24 D01 deterministic edits are truly disjoint under the production three-way merge algorithm", () => {
  assert.equal(D01_WINDOWS_EDIT_TEXT.includes("version=1"), true);
  assert.equal(D01_MOBILE_EDIT_TEXT.includes("version=1"), true);
  assert.deepEqual(
    mergeThreeWayText(D01_BASE_TEXT, D01_MOBILE_EDIT_TEXT, D01_WINDOWS_EDIT_TEXT),
    { clean: true, text: D01_EXPECTED_MERGED_TEXT },
  );
  assert.deepEqual(
    mergeThreeWayText(D01_BASE_TEXT, D01_WINDOWS_EDIT_TEXT, D01_MOBILE_EDIT_TEXT),
    { clean: true, text: D01_EXPECTED_MERGED_TEXT },
  );
});

test("VH24 D01 maps one-to-one to clean merge sequencing over fixed H6B plan authority", () => {
  const s = subject();
  assert.equal(D01_LIVE_PACKAGE, "D01-clean-text-merge.md");
  assert.equal(s.packageBinding.scenarioId, "D01");
  assert.deepEqual(s.packageBinding.definition.prerequisiteIds, []);
  assert.equal("production-path-driver" in s.packageBinding.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in s.packageBinding.moduleOverrides, false);

  const productionSteps = s.packageBinding.definition.steps.filter(step =>
    step.module === "production-path-driver" || step.module === "plan-assertion-engine",
  );
  assert.deepEqual(
    productionSteps.map(step => [step.module, step.operation]),
    Array.from({ length: 5 }, () => [
      ["production-path-driver", "preview-manual"],
      ["plan-assertion-engine", "assert-observed-plan"],
      ["production-path-driver", "execute-asserted-plan"],
    ]).flat(),
  );
  assert.deepEqual(
    productionSteps.map(step => (step.input as { authorityCycleId?: string }).authorityCycleId),
    [
      D01_AUTHORITY_CYCLES.establishWindows,
      D01_AUTHORITY_CYCLES.establishWindows,
      D01_AUTHORITY_CYCLES.establishWindows,
      D01_AUTHORITY_CYCLES.establishMobile,
      D01_AUTHORITY_CYCLES.establishMobile,
      D01_AUTHORITY_CYCLES.establishMobile,
      D01_AUTHORITY_CYCLES.windowsFirstSync,
      D01_AUTHORITY_CYCLES.windowsFirstSync,
      D01_AUTHORITY_CYCLES.windowsFirstSync,
      D01_AUTHORITY_CYCLES.mobileCleanMerge,
      D01_AUTHORITY_CYCLES.mobileCleanMerge,
      D01_AUTHORITY_CYCLES.mobileCleanMerge,
      D01_AUTHORITY_CYCLES.windowsReconcile,
      D01_AUTHORITY_CYCLES.windowsReconcile,
      D01_AUTHORITY_CYCLES.windowsReconcile,
    ],
  );

  const mergeAssertion = s.packageBinding.definition.steps.find(
    step => String(step.stepId) === "d01-mobile-merge-assert",
  );
  assert.ok(mergeAssertion);
  const mergeInput = mergeAssertion.input as {
    readonly expectation: {
      readonly expectedOperations: readonly Array<{ readonly kind: string; readonly path: VaultPath }>;
      readonly forbiddenKinds: readonly string[];
      readonly conflictExpectation: string;
      readonly destructiveExpectation: string;
    };
  };
  assert.deepEqual(
    mergeInput.expectation.expectedOperations.map(item => [item.kind, item.path]),
    [["clean-text-merge", TARGET_PATH]],
  );
  assert.ok(mergeInput.expectation.forbiddenKinds.includes("unresolved-conflict"));
  assert.equal(mergeInput.expectation.conflictExpectation, "forbidden");
  assert.equal(mergeInput.expectation.destructiveExpectation, "forbidden");
});

test("VH24 D01 success preserves independent edits until sync, executes clean three-way merge, and converges exact combined content", async () => {
  const s = subject();
  s.runtime.setEnabled(true);

  const result = runnerResult(await s.runtime.startScenario("D01"));
  assert.equal(result.status, "PASS");
  assert.deepEqual(s.production.previewedPlanIds, [
    String(establishWindowsPlan().planId),
    String(establishMobilePlan().planId),
    String(windowsFirstSyncPlan().planId),
    String(mobileMergePlan().planId),
    String(windowsReconcilePlan().planId),
  ]);
  assert.deepEqual(s.production.executedPlanIds, s.production.previewedPlanIds);
  assert.equal(s.windowsEdit.replaceCalls.length, 1);
  assert.equal(s.windowsEdit.replaceCalls[0]?.replacementText, D01_WINDOWS_EDIT_TEXT);
  assert.equal(s.mobileEdit.replaceCalls.length, 1);
  assert.equal(s.mobileEdit.replaceCalls[0]?.replacementText, D01_MOBILE_EDIT_TEXT);
  assert.equal(D01_WINDOWS_EDIT_TEXT.includes("version=1"), true);
  assert.equal(D01_MOBILE_EDIT_TEXT.includes("version=1"), true);

  const firstSyncPreviewIndex = s.world.events.findIndex(event =>
    event === "preview:" + String(windowsFirstSyncPlan().planId),
  );
  const windowsEditIndex = s.world.events.findIndex(event => event === "handoff:edit-to-mobile");
  const mobileEditIndex = s.world.events.findIndex(event => event === "handoff:first-sync-to-windows");
  assert.ok(firstSyncPreviewIndex > windowsEditIndex);
  assert.ok(firstSyncPreviewIndex > mobileEditIndex);

  assert.equal(D01_EXPECTED_MERGED_TEXT.includes("left=edit-a"), true);
  assert.equal(D01_EXPECTED_MERGED_TEXT.includes("right=edit-b"), true);
  assert.equal(D01_EXPECTED_MERGED_TEXT.match(/left=edit-a/g)?.length, 1);
  assert.equal(D01_EXPECTED_MERGED_TEXT.match(/right=edit-b/g)?.length, 1);
  assert.notEqual(D01_EXPECTED_MERGED_HASH, D01_WINDOWS_EDIT_HASH);
  assert.notEqual(D01_EXPECTED_MERGED_HASH, D01_MOBILE_EDIT_HASH);
  assert.equal(D01_EXPECTED_MERGED_SIZE_BYTES, new TextEncoder().encode(D01_EXPECTED_MERGED_TEXT).byteLength);

  assert.equal(s.verifier.requests.length, 4);
  const cleanMergeRequest = s.verifier.requests[2]!;
  const mergeHashes = cleanMergeRequest.state
    .filter(postcondition => postcondition.kind === "local-content" || postcondition.kind === "remote-content")
    .map(postcondition => postcondition.content.hash);
  assert.ok(mergeHashes.includes(D01_EXPECTED_MERGED_HASH));
  assert.ok(cleanMergeRequest.state.some(postcondition =>
    postcondition.kind === "terminal-product-result"
    && postcondition.diagnostic.diagnosticRunId === 104
  ));

  const finalRequest = s.verifier.requests[3]!;
  assert.ok(finalRequest.state.some(postcondition =>
    postcondition.kind === "terminal-product-result"
    && postcondition.diagnostic.diagnosticRunId === 105
  ));
  assert.ok(finalRequest.state.some(postcondition =>
    postcondition.kind === "live-trash-absence-state"
    && postcondition.path === TARGET_PATH
    && postcondition.expectedState === "live"
    && postcondition.remoteObjectId === undefined
  ));
  assert.equal(finalRequest.state.filter(postcondition => postcondition.kind === "mapping-or-tombstone").length, 2);
  assert.ok(finalRequest.convergence.some(postcondition =>
    postcondition.kind === "final-reconciliation-stable"
    && postcondition.terminalDiagnostic.diagnosticRunId === 105
    && postcondition.requireRemoteComplete
    && postcondition.requireNoOutstandingIntents
    && postcondition.requireNoLearnedRemoteBatches === true
    && postcondition.requireAllRecordedPathsConverged === true
  ));

  assert.equal(s.evidence.calls.length, 1);
  assert.equal(s.evidence.calls[0]?.mergedHash, D01_EXPECTED_MERGED_HASH);
  assert.equal(s.evidence.calls[0]?.remoteObjectId, REMOTE_ID);
});

test("VH24 D01 rejects an unexpected unresolved conflict before any conflict plan execution", async () => {
  const s = subject({ mergeKind: "unresolved-conflict" });
  s.runtime.setEnabled(true);

  const result = runnerResult(await s.runtime.startScenario("D01"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /clean-text-merge|unresolved-conflict|forbidden operation kind|Expected operation was not observed/i);
  }
  assert.equal(s.world.firstSyncExecuted, true);
  assert.equal(s.world.mergeExecuted, false);
  assert.equal(s.world.reconcileExecuted, false);
  assert.deepEqual(s.production.executedPlanIds, [
    String(establishWindowsPlan().planId),
    String(establishMobilePlan().planId),
    String(windowsFirstSyncPlan().planId),
  ]);
});

test("VH24 D01 rejects newest-wins-style download selection instead of accepting timestamp authority", async () => {
  const s = subject({ mergeKind: "download-update" });
  s.runtime.setEnabled(true);

  const result = runnerResult(await s.runtime.startScenario("D01"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /clean-text-merge|download-update|forbidden operation kind|Expected operation was not observed/i);
  }
  assert.equal(s.world.mergeExecuted, false);
  assert.equal(s.world.reconcileExecuted, false);
});

test("VH24 D01 missing terminal proof is BLOCKED by the frozen verifier and cannot yield PASS", async () => {
  const s = subject({ verifierMode: "final-terminal-not-observable" });
  s.runtime.setEnabled(true);

  const result = runnerResult(await s.runtime.startScenario("D01"));
  assert.equal(result.status, "BLOCKED");
  assert.equal(s.world.reconcileExecuted, true);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH24 D01 ambiguous duplicate canonical-path occupancy is FAIL under complete remote enumeration", async () => {
  const s = subject({ verifierMode: "final-duplicate-target" });
  s.runtime.setEnabled(true);

  const result = runnerResult(await s.runtime.startScenario("D01"));
  assert.equal(result.status, "FAIL");
  assert.equal(s.world.reconcileExecuted, true);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH24 D01 focused proof-shape guard rejects omission of terminal or final-stability acceptance proof", async () => {
  const s = subject();
  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D01"));
  assert.equal(result.status, "PASS");

  const finalRequest = s.verifier.requests[3]!;
  const withoutTerminal: ValidationStateConvergenceRequest = {
    ...finalRequest,
    state: finalRequest.state.filter(item => item.kind !== "terminal-product-result") as ValidationStateConvergenceRequest["state"],
  };
  assert.throws(() => assertD01RequestShape(withoutTerminal, 3));

  const withoutStability: ValidationStateConvergenceRequest = {
    ...finalRequest,
    convergence: finalRequest.convergence.filter(item => item.kind !== "final-reconciliation-stable") as ValidationStateConvergenceRequest["convergence"],
  };
  assert.throws(() => assertD01RequestShape(withoutStability, 3));
});

test("VH24 D01 fails closed when no-conflict-copy proof or stable remote identity is not established", async () => {
  const noProof = subject({ conflictProbeResult: "not-observable" });
  noProof.runtime.setEnabled(true);
  const noProofResult = runnerResult(await noProof.runtime.startScenario("D01"));
  assert.equal(noProofResult.status, "BLOCKED");
  assert.equal(noProof.world.mergeExecuted, true);
  assert.equal(noProof.world.reconcileExecuted, false);

  const drift = subject({ driftAfterMerge: true });
  drift.runtime.setEnabled(true);
  const driftResult = runnerResult(await drift.runtime.startScenario("D01"));
  assert.equal(driftResult.status, "FAIL");
  assert.equal(drift.world.mergeExecuted, true);
  assert.equal(drift.world.reconcileExecuted, false);
});
