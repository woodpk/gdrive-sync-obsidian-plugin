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
  readonly editCalls: Array<{ fixtureId: string; version: number; textVariant?: ValidationTextVariant }> = [];
  private target = BASE_DESCRIPTOR;

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    this.createCalls.push(spec);
    if (spec.fixtureId === D01_TARGET_FIXTURE_ID) return this.target;
    if (spec.fixtureId === D01_SENTINEL_FIXTURE_ID) return SENTINEL_DESCRIPTOR;
    throw new Error("Unexpected D01 fixture ID.");
  }

  async edit(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    this.editCalls.push({ fixtureId, version, ...(textVariant === undefined ? {} : { textVariant }) });
    assert.equal(fixtureId, D01_TARGET_FIXTURE_ID);
    assert.equal(version, 2);
    assert.equal(textVariant, "non-overlap-a");
    this.target = WINDOWS_DESCRIPTOR;
    return this.target;
  }

  async hash(fixtureId: string) {
    if (fixtureId === D01_TARGET_FIXTURE_ID) return this.target.hash!;
    if (fixtureId === D01_SENTINEL_FIXTURE_ID) return SENTINEL_HASH;
    throw new Error("Unexpected D01 fixture hash request.");
  }
}

class FakeMobileFixture implements D01ExistingTextFixturePort {
  readonly editCalls: Array<Parameters<D01ExistingTextFixturePort["editExisting"]>[0]> = [];
  private hash = D01_BASE_HASH;

  async editExisting(input: Parameters<D01ExistingTextFixturePort["editExisting"]>[0]) {
    this.editCalls.push(input);
    assert.equal(input.run.runId, RUN.runId);
    assert.equal(input.fixtureId, D01_TARGET_FIXTURE_ID);
    assert.equal(input.relativePath, D01_TARGET_RELATIVE_PATH);
    assert.equal(input.path, TARGET_PATH);
    assert.equal(input.expectedCurrentHash, D01_BASE_HASH);
    assert.equal(input.nextVersion, 2);
    assert.equal(input.textVariant, "non-overlap-b");
    this.hash = D01_MOBILE_EDIT_HASH;
    return MOBILE_DESCRIPTOR;
  }

  async hashExisting() {
    return this.hash;
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

class CapturingVerifier implements D01VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest) {
    this.requests.push(request);
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
}) {
  const world = freshWorld();
  const windowsFixtures = new FakeWindowsFixtures();
  const mobileFixture = new FakeMobileFixture();
  const verifier = new CapturingVerifier();
  const handoffs = new RecordingHandoffs(world);
  const evidence = new RecordingEvidence();
  const packageBinding = createD01CleanTextMergeScenario({
    targetPath: TARGET_PATH,
    sentinelPath: SENTINEL_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixtures,
    mobileFixture,
    mappingReader: new StableMappingReader(world, input?.driftAfterMerge),
    verifier,
    conflictArtifacts: conflictProbe(input?.conflictProbeResult),
    handoffs,
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
    mobileFixture,
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
  assert.equal(s.windowsFixtures.editCalls.length, 1);
  assert.equal(s.windowsFixtures.editCalls[0]?.textVariant, "non-overlap-a");
  assert.equal(s.mobileFixture.editCalls.length, 1);
  assert.equal(s.mobileFixture.editCalls[0]?.textVariant, "non-overlap-b");

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
