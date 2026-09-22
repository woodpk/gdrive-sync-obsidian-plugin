import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type ConflictAssessment,
  type ContentHash,
  type PlanOperationKind,
  type ProductSurfaceState,
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
  D03_AUTHORITY_CYCLES,
  D03_BASE_VERSION,
  D03_MOBILE_TARGET_VERSION,
  D03_OPERATIONS,
  D03_SAFE_FIXTURE_ID,
  D03_SAFE_RELATIVE_PATH,
  D03_SAFE_SIZE_BYTES,
  D03_TARGET_FIXTURE_ID,
  D03_TARGET_RELATIVE_PATH,
  D03_TARGET_SIZE_BYTES,
  D03_WINDOWS_SAFE_VERSION,
  D03_WINDOWS_TARGET_VERSION,
  createD03ConcurrentBinaryConflictScenario,
  type D03ConflictObserverPort,
  type D03CrossDevicePort,
  type D03DiagnosticRunIdSource,
  type D03EvidenceRecorderPort,
  type D03FixtureManagerPort,
  type D03VerifierPort,
} from "../src/validation/scenarios/d03-concurrent-binary-conflict";
import {
  StateConvergenceVerifier,
  type ValidationDeviceObservationSource,
  type ValidationStateConvergenceReport,
  type ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";

const RUN = validationRunIdentity("run:vh26:d03:01", "D03");
const WINDOWS = validationDeviceIdentity("device:d03:windows", "windows-desktop");
const MOBILE = validationDeviceIdentity("device:d03:mobile", "iphone");
const TARGET_PATH = contractId<"VaultPath">("validation/d03/d03-binary-conflict.bin") as VaultPath;
const SAFE_PATH = contractId<"VaultPath">("validation/d03/d03-unrelated-safe.bin") as VaultPath;
const REMOTE_ID = contractId<"RemoteObjectId">("remote:d03:target");
const MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID = 7303;

const BASE_HASH = contractId<"ContentHash">(
  "sha256:1111111111111111111111111111111111111111111111111111111111111111",
);
const WINDOWS_HASH = contractId<"ContentHash">(
  "sha256:2222222222222222222222222222222222222222222222222222222222222222",
);
const MOBILE_HASH = contractId<"ContentHash">(
  "sha256:3333333333333333333333333333333333333333333333333333333333333333",
);
const SAFE_BASE_HASH = contractId<"ContentHash">(
  "sha256:4444444444444444444444444444444444444444444444444444444444444444",
);
const SAFE_FINAL_HASH = contractId<"ContentHash">(
  "sha256:5555555555555555555555555555555555555555555555555555555555555555",
);
const WRONG_HASH = contractId<"ContentHash">(
  "sha256:9999999999999999999999999999999999999999999999999999999999999999",
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

function descriptor(input: {
  readonly fixtureId: string;
  readonly relativePath: string;
  readonly path: VaultPath;
  readonly version: number;
  readonly sizeBytes: number;
  readonly hash: ContentHash;
  readonly purpose: "ordinary" | "conflict";
}): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(RUN, input.fixtureId),
    relativePath: input.relativePath,
    path: input.path,
    kind: "opaque-binary",
    purpose: input.purpose,
    version: input.version,
    sizeBytes: input.sizeBytes,
    hash: input.hash,
  });
}

const TARGET_BASE = () => descriptor({
  fixtureId: D03_TARGET_FIXTURE_ID,
  relativePath: D03_TARGET_RELATIVE_PATH,
  path: TARGET_PATH,
  version: D03_BASE_VERSION,
  sizeBytes: D03_TARGET_SIZE_BYTES,
  hash: BASE_HASH,
  purpose: "conflict",
});

const TARGET_WINDOWS = () => descriptor({
  fixtureId: D03_TARGET_FIXTURE_ID,
  relativePath: D03_TARGET_RELATIVE_PATH,
  path: TARGET_PATH,
  version: D03_WINDOWS_TARGET_VERSION,
  sizeBytes: D03_TARGET_SIZE_BYTES,
  hash: WINDOWS_HASH,
  purpose: "conflict",
});

function targetMobile(hash: ContentHash = MOBILE_HASH): ValidationFixtureDescriptor {
  return descriptor({
    fixtureId: D03_TARGET_FIXTURE_ID,
    relativePath: D03_TARGET_RELATIVE_PATH,
    path: TARGET_PATH,
    version: D03_MOBILE_TARGET_VERSION,
    sizeBytes: D03_TARGET_SIZE_BYTES,
    hash,
    purpose: "conflict",
  });
}

const SAFE_BASE = () => descriptor({
  fixtureId: D03_SAFE_FIXTURE_ID,
  relativePath: D03_SAFE_RELATIVE_PATH,
  path: SAFE_PATH,
  version: D03_BASE_VERSION,
  sizeBytes: D03_SAFE_SIZE_BYTES,
  hash: SAFE_BASE_HASH,
  purpose: "ordinary",
});

const SAFE_FINAL = () => descriptor({
  fixtureId: D03_SAFE_FIXTURE_ID,
  relativePath: D03_SAFE_RELATIVE_PATH,
  path: SAFE_PATH,
  version: D03_WINDOWS_SAFE_VERSION,
  sizeBytes: D03_SAFE_SIZE_BYTES,
  hash: SAFE_FINAL_HASH,
  purpose: "ordinary",
});

class FakeFixtureManager implements D03FixtureManagerPort {
  readonly createCalls: ValidationFixtureSpec[] = [];
  readonly editCalls: Array<{ fixtureId: string; version: number }> = [];
  private target = TARGET_BASE();
  private safe = SAFE_BASE();

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    this.createCalls.push(spec);
    if (spec.fixtureId === D03_TARGET_FIXTURE_ID) return this.target;
    if (spec.fixtureId === D03_SAFE_FIXTURE_ID) return this.safe;
    throw new Error("Unexpected D03 fixture ID.");
  }

  async edit(fixtureId: string, version: number): Promise<ValidationFixtureDescriptor> {
    this.editCalls.push({ fixtureId, version });
    if (fixtureId === D03_TARGET_FIXTURE_ID) {
      assert.equal(version, D03_WINDOWS_TARGET_VERSION);
      this.target = TARGET_WINDOWS();
      return this.target;
    }
    if (fixtureId === D03_SAFE_FIXTURE_ID) {
      assert.equal(version, D03_WINDOWS_SAFE_VERSION);
      this.safe = SAFE_FINAL();
      return this.safe;
    }
    throw new Error("Unexpected D03 edit fixture ID.");
  }

  async hash(fixtureId: string): Promise<ContentHash> {
    if (fixtureId === D03_TARGET_FIXTURE_ID) return this.target.hash!;
    if (fixtureId === D03_SAFE_FIXTURE_ID) return this.safe.hash!;
    throw new Error("Unexpected D03 hash fixture ID.");
  }
}

function operation(
  kind: PlanOperationKind,
  path: VaultPath,
  suffix: string,
  targetSide?: "local" | "remote",
) {
  return Object.freeze({
    operationId: contractId<"OperationId">(`op:d03:${suffix}`),
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    destructive: false,
    preconditions: [],
    reasons: kind === "unresolved-conflict"
      ? [{ code: "opaque-binary", summary: "Concurrent opaque binary variants require explicit resolution." }]
      : [],
  });
}

function plan(
  planId: string,
  operations: SynchronizationPlan["operations"],
  executionDisposition: SynchronizationPlan["executionDisposition"] = "safe-auto-eligible",
): SynchronizationPlan {
  return Object.freeze({
    planId: contractId<"PlanId">(planId),
    trigger: "manual",
    operations,
    executionDisposition,
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  });
}

function baselineWindowsPlan(): SynchronizationPlan {
  return plan("plan:d03:baseline-windows", [
    operation("upload-create", TARGET_PATH, "baseline-windows-target", "remote"),
    operation("upload-create", SAFE_PATH, "baseline-windows-safe", "remote"),
  ]);
}

function baselineMobilePlan(): SynchronizationPlan {
  return plan("plan:d03:baseline-mobile", [
    operation("download-create", TARGET_PATH, "baseline-mobile-target", "local"),
    operation("download-create", SAFE_PATH, "baseline-mobile-safe", "local"),
  ]);
}

function windowsPublishPlan(): SynchronizationPlan {
  return plan("plan:d03:windows-publish", [
    operation("upload-update", TARGET_PATH, "windows-target", "remote"),
    operation("upload-update", SAFE_PATH, "windows-safe", "remote"),
  ]);
}

function mobileConflictPlan(): SynchronizationPlan {
  return plan(
    "plan:d03:mobile-conflict",
    [
      operation("unresolved-conflict", TARGET_PATH, "mobile-target-conflict"),
      operation("download-update", SAFE_PATH, "mobile-safe-download", "local"),
    ],
    "requires-user-approval",
  );
}

function opaqueConflict(remoteHash: ContentHash = WINDOWS_HASH): Extract<ConflictAssessment, { readonly kind: "opaque-binary" }> {
  return Object.freeze({
    kind: "opaque-binary",
    conflictId: contractId<"ConflictId">("conflict:binary:validation/d03/d03-binary-conflict.bin"),
    path: TARGET_PATH,
    preserved: Object.freeze({
      local: Object.freeze({
        source: "local",
        deviceId: contractId<"DeviceIdentity">("device:d03:mobile"),
        version: Object.freeze({
          path: TARGET_PATH,
          entityKind: "file",
          content: Object.freeze({ hash: MOBILE_HASH, sizeBytes: D03_TARGET_SIZE_BYTES }),
          observationToken: contractId<"ObservationToken">("obs:d03:mobile:v3"),
        }),
      }),
      remote: Object.freeze({
        source: "remote",
        remoteObjectId: REMOTE_ID,
        version: Object.freeze({
          path: TARGET_PATH,
          entityKind: "file",
          content: Object.freeze({
            hash: remoteHash,
            sizeBytes: D03_TARGET_SIZE_BYTES,
            revision: "remote:d03:v2",
          }),
          remoteObjectId: REMOTE_ID,
          observationToken: contractId<"ObservationToken">("obs:d03:remote:v2"),
        }),
      }),
      base: Object.freeze({
        source: "base",
        remoteObjectId: REMOTE_ID,
        version: Object.freeze({
          path: TARGET_PATH,
          entityKind: "file",
          content: Object.freeze({ hash: BASE_HASH, sizeBytes: D03_TARGET_SIZE_BYTES }),
          remoteObjectId: REMOTE_ID,
        }),
      }),
    }),
  });
}

function productionFixture(
  plans: readonly SynchronizationPlan[],
  timeline: string[],
  conflict: Extract<ConflictAssessment, { readonly kind: "opaque-binary" }> = opaqueConflict(),
) {
  let previewIndex = 0;
  const calls: string[] = [];
  const executedPlanIds: string[] = [];
  const requestedActions: string[] = [];
  let surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      const observed = plans[previewIndex];
      previewIndex += 1;
      calls.push("preview-manual");
      timeline.push(`preview:${String(observed?.planId ?? "none")}`);
      if (observed?.planId === contractId<"PlanId">("plan:d03:mobile-conflict")) {
        surface = {
          status: { kind: "conflict-present", conflictCount: 1 },
          conflicts: [conflict],
          planPreview: observed,
        };
      } else {
        surface = {
          status: { kind: "idle-ready" },
          conflicts: [],
          ...(observed ? { planPreview: observed } : {}),
        };
      }
      return observed;
    },
    previewVerifyReconcile: async () => {
      calls.push("preview-verify-reconcile");
      return undefined;
    },
    runAutomatic: async trigger => { calls.push(`automatic:${trigger}`); },
    request: async action => {
      calls.push(`request:${action.kind}`);
      requestedActions.push(action.kind);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push(`execute:${String(action.planId)}`);
      timeline.push(`execute:${String(action.planId)}`);
      executedPlanIds.push(String(action.planId));
      if (String(action.planId) === "plan:d03:mobile-conflict") {
        surface = {
          status: {
            kind: "attention-required",
            attentionCount: 1,
            attentionIdentity: "d03-conflict",
            conflictCount: 1,
            safeOperationsCommitted: 1,
            phase: "completed",
            ledgerAvailable: true,
          },
          conflicts: [conflict],
        };
      }
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("No direct run-evidence read is expected in D03 focused tests."); },
  };

  return {
    calls,
    executedPlanIds,
    requestedActions,
    runtime: { productController: () => controller },
    currentSurface: () => surface,
  };
}

function passingReport(request: ValidationStateConvergenceRequest): ValidationStateConvergenceReport {
  const stateRef = validationEvidenceRef("vh26:d03:state-proof");
  const convergenceRef = validationEvidenceRef("vh26:d03:convergence-proof");
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
      { ref: stateRef, source: "authority", summary: "D03 state postconditions observed." },
      { ref: convergenceRef, source: "convergence", summary: "D03 convergence postconditions observed." },
    ],
  };
}

class PassingVerifier implements D03VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    return passingReport(request);
  }
}

class RecordingCrossDevice implements D03CrossDevicePort {
  readonly handoffPhases: string[] = [];
  readonly prepareCalls: Array<Parameters<D03CrossDevicePort["prepareMobileVariant"]>[0]> = [];

  constructor(
    private readonly timeline: string[],
    private readonly mobileHash: ContentHash = MOBILE_HASH,
  ) {}

  async handoff(input: Parameters<D03CrossDevicePort["handoff"]>[0]) {
    this.handoffPhases.push(input.phase);
    this.timeline.push(`cross:handoff:${input.phase}`);
    return [validationEvidenceRef(`vh26:d03:handoff:${input.phase}`)];
  }

  async prepareMobileVariant(input: Parameters<D03CrossDevicePort["prepareMobileVariant"]>[0]) {
    this.prepareCalls.push(input);
    this.timeline.push("cross:prepare-mobile-variant");
    return {
      descriptor: targetMobile(this.mobileHash),
      evidenceRefs: [validationEvidenceRef("vh26:d03:mobile-variant")],
    };
  }
}

class RecordingDiagnosticRunSource implements D03DiagnosticRunIdSource {
  constructor(
    private readonly timeline: string[],
    private readonly runId: number | undefined = MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID,
  ) {}

  currentSyncRunId(): number | undefined {
    this.timeline.push(`diagnostic:current:${String(this.runId)}`);
    return this.runId;
  }
}

class RecordingEvidence implements D03EvidenceRecorderPort {
  readonly calls: Array<Parameters<D03EvidenceRecorderPort["record"]>[0]> = [];

  async record(input: Parameters<D03EvidenceRecorderPort["record"]>[0]) {
    this.calls.push(input);
    return [validationEvidenceRef("vh26:d03:scenario-evidence")];
  }
}

function subject(input?: {
  readonly plans?: readonly SynchronizationPlan[];
  readonly conflict?: Extract<ConflictAssessment, { readonly kind: "opaque-binary" }>;
  readonly mobileHash?: ContentHash;
}) {
  const timeline: string[] = [];
  const fixtures = new FakeFixtureManager();
  const verifier = new PassingVerifier();
  const crossDevice = new RecordingCrossDevice(timeline, input?.mobileHash);
  const evidence = new RecordingEvidence();
  const mobileDiagnostics = new RecordingDiagnosticRunSource(timeline);
  const plans = input?.plans ?? [
    baselineWindowsPlan(),
    baselineMobilePlan(),
    windowsPublishPlan(),
    mobileConflictPlan(),
  ];
  const production = productionFixture(plans, timeline, input?.conflict);
  const conflicts: D03ConflictObserverPort = {
    current: () => production.currentSurface(),
  };
  const packageBinding = createD03ConcurrentBinaryConflictScenario({
    targetPath: TARGET_PATH,
    safePath: SAFE_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixtures: fixtures,
    verifier,
    crossDevice,
    conflicts,
    mobileDiagnostics,
    evidence,
  });
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
    packageBinding,
    production,
    fixtures,
    verifier,
    crossDevice,
    mobileDiagnostics,
    evidence,
    timeline,
  };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected D03 runner result.");
  return result.result;
}

test("VH26 D03 preserves both complete binary variants and lets the unrelated safe path commit through the fixed production path", async () => {
  const s = subject();

  assert.equal("production-path-driver" in s.packageBinding.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in s.packageBinding.moduleOverrides, false);

  const conflictAssertion = s.packageBinding.definition.steps.find(
    step => String(step.stepId) === "d03-mobile-conflict-assert",
  );
  assert.ok(conflictAssertion);
  const conflictInput = conflictAssertion.input as {
    readonly authorityCycleId: string;
    readonly expectation: {
      readonly expectedOperations: ReadonlyArray<{ readonly kind: string; readonly path: VaultPath }>;
      readonly conflictExpectation: string;
      readonly expectedExecutionDisposition: string;
    };
  };
  assert.equal(conflictInput.authorityCycleId, D03_AUTHORITY_CYCLES.mobileConflict);
  assert.deepEqual(
    conflictInput.expectation.expectedOperations.map(item => [item.kind, item.path]),
    [
      ["unresolved-conflict", TARGET_PATH],
      ["download-update", SAFE_PATH],
    ],
  );
  assert.equal(conflictInput.expectation.conflictExpectation, "required");
  assert.equal(conflictInput.expectation.expectedExecutionDisposition, "requires-user-approval");

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D03"));
  assert.equal(result.status, "PASS");

  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
    "plan:d03:windows-publish",
    "plan:d03:mobile-conflict",
  ]);
  assert.deepEqual(s.crossDevice.handoffPhases, [
    "baseline-to-mobile",
    "windows-updates-to-mobile",
  ]);
  assert.equal(s.crossDevice.prepareCalls.length, 1);

  const prepareIndex = s.timeline.indexOf("cross:prepare-mobile-variant");
  const publishPreviewIndex = s.timeline.indexOf("preview:plan:d03:windows-publish");
  assert.ok(prepareIndex >= 0 && publishPreviewIndex >= 0 && prepareIndex < publishPreviewIndex);

  const mobilePreviewIndex = s.timeline.indexOf("preview:plan:d03:mobile-conflict");
  const diagnosticCaptureIndex = s.timeline.indexOf(`diagnostic:current:${MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID}`);
  const mobileExecuteIndex = s.timeline.indexOf("execute:plan:d03:mobile-conflict");
  assert.ok(
    mobilePreviewIndex >= 0
    && diagnosticCaptureIndex > mobilePreviewIndex
    && mobileExecuteIndex > diagnosticCaptureIndex,
  );

  assert.deepEqual(s.fixtures.editCalls, [
    { fixtureId: D03_TARGET_FIXTURE_ID, version: D03_WINDOWS_TARGET_VERSION },
    { fixtureId: D03_SAFE_FIXTURE_ID, version: D03_WINDOWS_SAFE_VERSION },
  ]);

  assert.equal(s.verifier.requests.length, 2);
  const final = s.verifier.requests[1]!;

  const windowsTarget = final.state.find(item =>
    item.kind === "local-content"
    && item.deviceId === WINDOWS.deviceId
    && item.path === TARGET_PATH
  );
  assert.ok(windowsTarget && windowsTarget.kind === "local-content");
  assert.equal(windowsTarget.content.hash, WINDOWS_HASH);

  const mobileTarget = final.state.find(item =>
    item.kind === "local-content"
    && item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
  );
  assert.ok(mobileTarget && mobileTarget.kind === "local-content");
  assert.equal(mobileTarget.content.hash, MOBILE_HASH);

  const remoteTarget = final.state.find(item =>
    item.kind === "remote-content" && item.path === TARGET_PATH
  );
  assert.ok(remoteTarget && remoteTarget.kind === "remote-content");
  assert.equal(remoteTarget.content.hash, WINDOWS_HASH);

  const mobileTargetBase = final.state.find(item =>
    item.kind === "base-authority"
    && item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
  );
  assert.ok(mobileTargetBase && mobileTargetBase.kind === "base-authority");
  assert.equal(mobileTargetBase.expectedContent?.hash, BASE_HASH);

  const safeMobile = final.state.find(item =>
    item.kind === "local-content"
    && item.deviceId === MOBILE.deviceId
    && item.path === SAFE_PATH
  );
  assert.ok(safeMobile && safeMobile.kind === "local-content");
  assert.equal(safeMobile.content.hash, SAFE_FINAL_HASH);

  const terminal = final.state.find(item => item.kind === "terminal-product-result");
  assert.ok(terminal && terminal.kind === "terminal-product-result");
  assert.equal(terminal.diagnostic.diagnosticRunId, MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID);
  assert.deepEqual(terminal.diagnostic.expectedFields, {
    result: "partial",
    skippedCount: 1,
    conflictCount: 1,
  });

  assert.equal(s.evidence.calls.length, 1);
  const recorded = s.evidence.calls[0]!;
  assert.equal(recorded.conflict.kind, "opaque-binary");
  assert.equal(recorded.mobileConflictDiagnosticRunId, MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID);
  assert.equal(recorded.conflict.preserved.base?.version.content?.hash, BASE_HASH);
  assert.equal(recorded.conflict.preserved.local.version.content?.hash, MOBILE_HASH);
  assert.equal(recorded.conflict.preserved.remote.version.content?.hash, WINDOWS_HASH);
  assert.equal(recorded.mobileTarget.hash, MOBILE_HASH);
  assert.equal(recorded.windowsTarget.hash, WINDOWS_HASH);
  assert.equal(recorded.safeFinal.hash, SAFE_FINAL_HASH);
  assert.deepEqual(s.production.requestedActions, []);
});

test("VH26 D03 wrong-run terminal diagnostics cannot satisfy the frozen verifier", async () => {
  const wrongRunId = MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID + 1;
  const device: ValidationDeviceObservationSource = {
    deviceId: MOBILE.deviceId,
    local: {
      enumerate: async () => ({ entries: [], completeness: { status: "complete" } }),
      observe: async path => ({
        status: "present",
        side: "local",
        path,
        entityKind: "file",
        stability: "stable",
      }),
      readFileBypassingEvidenceCache: async () => {
        throw new Error("D03 wrong-run diagnostic regression does not read file bytes.");
      },
    },
    authority: {
      loadAuthority: async () => {
        throw new Error("D03 wrong-run diagnostic regression does not read synchronization authority.");
      },
    },
    diagnostics: {
      snapshot: () => [
        {
          timestamp: "2026-09-22T12:00:00.000Z",
          sequence: 1,
          level: "info",
          component: "sync.controller",
          event: "sync-run-complete",
          runId: wrongRunId,
          platform: "mobile",
          fields: {
            result: "partial",
            skippedCount: 1,
            conflictCount: 1,
          },
        },
        {
          timestamp: "2026-09-22T12:00:01.000Z",
          sequence: 2,
          level: "info",
          component: "sync.controller",
          event: "sync-run-complete",
          runId: MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID,
          platform: "mobile",
          fields: {
            result: "complete",
            skippedCount: 0,
            conflictCount: 0,
          },
        },
      ],
    },
  };
  const verifier = new StateConvergenceVerifier({ devices: [device] });
  const request: ValidationStateConvergenceRequest = {
    run: RUN,
    state: [{
      kind: "terminal-product-result",
      assertion: {
        assertionId: validationAssertionId("d03.wrong-run.terminal"),
        kind: "terminal-product-result",
        subject: D03_OPERATIONS.verifyConflictOutcome,
        expectation: "Only the exact D03 production diagnostic run may establish the partial terminal result.",
      },
      diagnostic: {
        deviceId: MOBILE.deviceId,
        component: "sync.controller",
        event: "sync-run-complete",
        diagnosticRunId: MOBILE_CONFLICT_DIAGNOSTIC_RUN_ID,
        expectedFields: {
          result: "partial",
          skippedCount: 1,
          conflictCount: 1,
        },
      },
    }],
    convergence: [{
      kind: "cross-device-path",
      assertion: {
        assertionId: validationAssertionId("d03.wrong-run.path"),
        kind: "cross-device-path",
        subject: String(TARGET_PATH),
        expectation: "Unrelated convergence proof is satisfiable so the terminal diagnostic decides PASS eligibility.",
      },
      deviceIds: [MOBILE.deviceId],
      path: TARGET_PATH,
      expected: "file",
    }],
  };

  const report = await verifier.verify(request);
  assert.equal(report.result.verdict, "fail");
  assert.notEqual(report.result.verdict, "pass");
});

test("VH26 D03 rejects newest-wins or silent overwrite planning before the conflicted mobile plan can execute", async () => {
  const silentOverwrite = plan("plan:d03:mobile-conflict", [
    operation("download-update", TARGET_PATH, "newest-wins-target", "local"),
    operation("download-update", SAFE_PATH, "safe-download", "local"),
  ]);
  const s = subject({
    plans: [
      baselineWindowsPlan(),
      baselineMobilePlan(),
      windowsPublishPlan(),
      silentOverwrite,
    ],
  });

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D03"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /conflict|unresolved-conflict|download-update|Expected operation/i);
  }
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
    "plan:d03:windows-publish",
  ]);
  assert.equal(s.verifier.requests.length, 1);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH26 D03 rejects incomplete or substituted conflict provenance even when the production plan shape is correct", async () => {
  const s = subject({ conflict: opaqueConflict(WRONG_HASH) });

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D03"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /preserve.*Windows\/remote|complete.*variant|provenance/i);
  }
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
    "plan:d03:windows-publish",
    "plan:d03:mobile-conflict",
  ]);
  assert.equal(s.verifier.requests.length, 1);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH26 D03 rejects unrelated-path suppression instead of accepting conflict-only partial progress", async () => {
  const suppressedSafePath = plan(
    "plan:d03:mobile-conflict",
    [operation("unresolved-conflict", TARGET_PATH, "mobile-target-conflict")],
    "requires-user-approval",
  );
  const s = subject({
    plans: [
      baselineWindowsPlan(),
      baselineMobilePlan(),
      windowsPublishPlan(),
      suppressedSafePath,
    ],
  });

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D03"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /download-update|Expected operation|missing/i);
  }
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
    "plan:d03:windows-publish",
  ]);
  assert.equal(s.verifier.requests.length, 1);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH26 D03 rejects a mobile variant that is not independently byte-distinct before publishing the Windows variant", async () => {
  const s = subject({ mobileHash: WINDOWS_HASH });

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D03"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /mobile variant.*byte-distinct/i);
  }
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
  ]);
  assert.equal(s.verifier.requests.length, 1);
  assert.equal(s.evidence.calls.length, 0);
  assert.equal(s.timeline.includes("preview:plan:d03:windows-publish"), false);
});

test("VH26 D03 package stays binary-specific and owns no shared/fixed H6B module binding", () => {
  const s = subject();
  assert.equal(D03_TARGET_RELATIVE_PATH, "d03-binary-conflict.bin");
  assert.equal(D03_OPERATIONS.prepareMobileVariant, "d03-prepare-mobile-variant");
  assert.deepEqual(Object.keys(s.packageBinding.moduleOverrides).sort(), [
    "cross-device-coordinator",
    "fixture-manager",
    "scenario-evidence-recorder",
    "state-convergence-verifier",
  ]);
});
