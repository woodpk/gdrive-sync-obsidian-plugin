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
import type { DiagnosticEvent } from "../src/diagnostics/diagnostic-logger";
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
  validationStepId,
  type ValidationRunIdentity,
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
  type D03ScenarioPackage,
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
const RUN_A = validationRunIdentity("run:vh26:d03:run-a", "D03");
const RUN_B = validationRunIdentity("run:vh26:d03:run-b", "D03");
const WINDOWS = validationDeviceIdentity("device:d03:windows", "windows-desktop");
const MOBILE = validationDeviceIdentity("device:d03:mobile", "iphone");
const TARGET_PATH = contractId<"VaultPath">("validation/d03/d03-binary-conflict.bin") as VaultPath;
const SAFE_PATH = contractId<"VaultPath">("validation/d03/d03-unrelated-safe.bin") as VaultPath;
const REMOTE_ID = contractId<"RemoteObjectId">("remote:d03:target");

const WINDOWS_BASE_RUN_ID = 1101;
const MOBILE_BASE_RUN_ID = 2201;
const WINDOWS_PUBLISH_RUN_ID = 1102;
const MOBILE_CONFLICT_PREVIEW_RUN_ID = 2202;

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

function descriptor(
  run: ValidationRunIdentity,
  input: {
    readonly fixtureId: string;
    readonly relativePath: string;
    readonly path: VaultPath;
    readonly version: number;
    readonly sizeBytes: number;
    readonly hash: ContentHash;
    readonly purpose: "ordinary" | "conflict";
  },
): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(run, input.fixtureId),
    relativePath: input.relativePath,
    path: input.path,
    kind: "opaque-binary",
    purpose: input.purpose,
    version: input.version,
    sizeBytes: input.sizeBytes,
    hash: input.hash,
  });
}

function targetBase(run: ValidationRunIdentity): ValidationFixtureDescriptor {
  return descriptor(run, {
    fixtureId: D03_TARGET_FIXTURE_ID,
    relativePath: D03_TARGET_RELATIVE_PATH,
    path: TARGET_PATH,
    version: D03_BASE_VERSION,
    sizeBytes: D03_TARGET_SIZE_BYTES,
    hash: BASE_HASH,
    purpose: "conflict",
  });
}

function targetWindows(run: ValidationRunIdentity): ValidationFixtureDescriptor {
  return descriptor(run, {
    fixtureId: D03_TARGET_FIXTURE_ID,
    relativePath: D03_TARGET_RELATIVE_PATH,
    path: TARGET_PATH,
    version: D03_WINDOWS_TARGET_VERSION,
    sizeBytes: D03_TARGET_SIZE_BYTES,
    hash: WINDOWS_HASH,
    purpose: "conflict",
  });
}

function targetMobile(
  run: ValidationRunIdentity,
  hash: ContentHash = MOBILE_HASH,
): ValidationFixtureDescriptor {
  return descriptor(run, {
    fixtureId: D03_TARGET_FIXTURE_ID,
    relativePath: D03_TARGET_RELATIVE_PATH,
    path: TARGET_PATH,
    version: D03_MOBILE_TARGET_VERSION,
    sizeBytes: D03_TARGET_SIZE_BYTES,
    hash,
    purpose: "conflict",
  });
}

function safeBase(run: ValidationRunIdentity): ValidationFixtureDescriptor {
  return descriptor(run, {
    fixtureId: D03_SAFE_FIXTURE_ID,
    relativePath: D03_SAFE_RELATIVE_PATH,
    path: SAFE_PATH,
    version: D03_BASE_VERSION,
    sizeBytes: D03_SAFE_SIZE_BYTES,
    hash: SAFE_BASE_HASH,
    purpose: "ordinary",
  });
}

function safeFinal(run: ValidationRunIdentity): ValidationFixtureDescriptor {
  return descriptor(run, {
    fixtureId: D03_SAFE_FIXTURE_ID,
    relativePath: D03_SAFE_RELATIVE_PATH,
    path: SAFE_PATH,
    version: D03_WINDOWS_SAFE_VERSION,
    sizeBytes: D03_SAFE_SIZE_BYTES,
    hash: SAFE_FINAL_HASH,
    purpose: "ordinary",
  });
}

class FakeFixtureManager implements D03FixtureManagerPort {
  readonly createCalls: ValidationFixtureSpec[] = [];
  readonly editCalls: Array<{ fixtureId: string; version: number }> = [];
  private target: ValidationFixtureDescriptor;
  private safe: ValidationFixtureDescriptor;

  constructor(
    private readonly requestedRun: ValidationRunIdentity,
    descriptorRun: ValidationRunIdentity = requestedRun,
  ) {
    this.target = targetBase(descriptorRun);
    this.safe = safeBase(descriptorRun);
  }

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
      this.target = targetWindows(this.requestedRun);
      return this.target;
    }
    if (fixtureId === D03_SAFE_FIXTURE_ID) {
      assert.equal(version, D03_WINDOWS_SAFE_VERSION);
      this.safe = safeFinal(this.requestedRun);
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

class FixtureManagerRegistry {
  readonly managers = new Map<string, FakeFixtureManager>();
  private readonly descriptorRunOverrides = new Map<string, ValidationRunIdentity>();

  useDescriptorsFrom(requestedRun: ValidationRunIdentity, descriptorRun: ValidationRunIdentity): void {
    this.descriptorRunOverrides.set(String(requestedRun.runId), descriptorRun);
    this.managers.delete(String(requestedRun.runId));
  }

  forRun(run: ValidationRunIdentity): FakeFixtureManager {
    const key = String(run.runId);
    const existing = this.managers.get(key);
    if (existing) return existing;
    const manager = new FakeFixtureManager(run, this.descriptorRunOverrides.get(key) ?? run);
    this.managers.set(key, manager);
    return manager;
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

interface DiagnosticState {
  windows?: number;
  mobile?: number;
}

interface SurfaceState {
  current: ProductSurfaceState;
}

function productionFixture(
  plans: readonly SynchronizationPlan[],
  timeline: string[],
  diagnostics: DiagnosticState,
  surfaceState: SurfaceState,
  conflict: Extract<ConflictAssessment, { readonly kind: "opaque-binary" }> = opaqueConflict(),
) {
  let previewIndex = 0;
  const executedPlanIds: string[] = [];
  const requestedActions: string[] = [];

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      const observed = plans[previewIndex];
      previewIndex += 1;
      const planId = String(observed?.planId ?? "none");
      timeline.push(`preview:${planId}`);

      if (planId === "plan:d03:baseline-windows") diagnostics.windows = WINDOWS_BASE_RUN_ID;
      else if (planId === "plan:d03:baseline-mobile") diagnostics.mobile = MOBILE_BASE_RUN_ID;
      else if (planId === "plan:d03:windows-publish") diagnostics.windows = WINDOWS_PUBLISH_RUN_ID;
      else if (planId === "plan:d03:mobile-conflict") diagnostics.mobile = MOBILE_CONFLICT_PREVIEW_RUN_ID;

      if (planId === "plan:d03:mobile-conflict") {
        surfaceState.current = {
          status: { kind: "conflict-present", conflictCount: 1 },
          conflicts: [conflict],
          ...(observed ? { planPreview: observed } : {}),
        };
      } else {
        surfaceState.current = {
          status: { kind: "idle-ready" },
          conflicts: [],
          ...(observed ? { planPreview: observed } : {}),
        };
      }
      return observed;
    },
    previewVerifyReconcile: async () => undefined,
    runAutomatic: async () => undefined,
    request: async action => {
      requestedActions.push(action.kind);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      const planId = String(action.planId);
      timeline.push(`execute:${planId}`);
      executedPlanIds.push(planId);
      if (planId === "plan:d03:mobile-conflict") {
        throw new Error("D03 protocol violation: conflict-containing plan must never execute.");
      }
      return { status: "accepted" };
    },
    currentSurface: () => surfaceState.current,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("No direct run-evidence read is expected in D03 focused tests."); },
  };

  return {
    executedPlanIds,
    requestedActions,
    runtime: { productController: () => controller },
  };
}

function passingReport(request: ValidationStateConvergenceRequest): ValidationStateConvergenceReport {
  const stateRef = validationEvidenceRef(`vh26:d03:state-proof:${String(request.run.runId)}`);
  const convergenceRef = validationEvidenceRef(`vh26:d03:convergence-proof:${String(request.run.runId)}`);
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
  readonly handoffPhases: Array<{ runId: string; phase: string }> = [];
  readonly prepareCalls: Array<Parameters<D03CrossDevicePort["prepareMobileVariant"]>[0]> = [];

  constructor(private readonly mobileHash: ContentHash = MOBILE_HASH) {}

  async handoff(input: Parameters<D03CrossDevicePort["handoff"]>[0]) {
    this.handoffPhases.push({ runId: String(input.run.runId), phase: input.phase });
    return [validationEvidenceRef(`vh26:d03:handoff:${String(input.run.runId)}:${input.phase}`)];
  }

  async prepareMobileVariant(input: Parameters<D03CrossDevicePort["prepareMobileVariant"]>[0]) {
    this.prepareCalls.push(input);
    return {
      descriptor: targetMobile(input.run, this.mobileHash),
      evidenceRefs: [validationEvidenceRef(`vh26:d03:mobile-variant:${String(input.run.runId)}`)],
    };
  }
}

class RecordingDiagnosticRunSource implements D03DiagnosticRunIdSource {
  constructor(
    private readonly device: "windows" | "mobile",
    private readonly state: DiagnosticState,
    private readonly timeline: string[],
  ) {}

  currentSyncRunId(): number | undefined {
    const value = this.state[this.device];
    this.timeline.push(`diagnostic:${this.device}:${String(value)}`);
    return value;
  }
}

class RecordingEvidence implements D03EvidenceRecorderPort {
  readonly calls: Array<Parameters<D03EvidenceRecorderPort["record"]>[0]> = [];

  async record(input: Parameters<D03EvidenceRecorderPort["record"]>[0]) {
    this.calls.push(input);
    return [validationEvidenceRef(`vh26:d03:scenario-evidence:${String(input.run.runId)}`)];
  }
}

interface PackageHarness {
  readonly packageBinding: D03ScenarioPackage;
  readonly fixtures: FixtureManagerRegistry;
  readonly verifier: PassingVerifier;
  readonly crossDevice: RecordingCrossDevice;
  readonly evidence: RecordingEvidence;
  readonly diagnostics: DiagnosticState;
  readonly surface: SurfaceState;
  readonly timeline: string[];
}

function packageHarness(input?: {
  readonly mobileHash?: ContentHash;
}): PackageHarness {
  const timeline: string[] = [];
  const diagnostics: DiagnosticState = {};
  const surface: SurfaceState = {
    current: { status: { kind: "idle-ready" }, conflicts: [] },
  };
  const fixtures = new FixtureManagerRegistry();
  const verifier = new PassingVerifier();
  const crossDevice = new RecordingCrossDevice(input?.mobileHash);
  const evidence = new RecordingEvidence();
  const conflicts: D03ConflictObserverPort = { current: () => surface.current };
  const windowsDiagnostics = new RecordingDiagnosticRunSource("windows", diagnostics, timeline);
  const mobileDiagnostics = new RecordingDiagnosticRunSource("mobile", diagnostics, timeline);

  const packageBinding = createD03ConcurrentBinaryConflictScenario({
    targetPath: TARGET_PATH,
    safePath: SAFE_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixturesForRun: run => fixtures.forRun(run),
    verifier,
    crossDevice,
    conflicts,
    windowsDiagnostics,
    mobileDiagnostics,
    evidence,
  });

  return {
    packageBinding,
    fixtures,
    verifier,
    crossDevice,
    evidence,
    diagnostics,
    surface,
    timeline,
  };
}

function runtimeFor(
  harness: PackageHarness,
  run: ValidationRunIdentity,
  plans: readonly SynchronizationPlan[] = [
    baselineWindowsPlan(),
    baselineMobilePlan(),
    windowsPublishPlan(),
    mobileConflictPlan(),
  ],
  conflict: Extract<ConflictAssessment, { readonly kind: "opaque-binary" }> = opaqueConflict(),
) {
  const production = productionFixture(
    plans,
    harness.timeline,
    harness.diagnostics,
    harness.surface,
    conflict,
  );
  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [harness.packageBinding.definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites: harness.packageBinding.prerequisites,
    moduleOverrides: harness.packageBinding.moduleOverrides,
    currentDevice: () => WINDOWS,
    createRunId: () => String(run.runId),
  });
  return { runtime, production };
}

function subject(input?: {
  readonly plans?: readonly SynchronizationPlan[];
  readonly conflict?: Extract<ConflictAssessment, { readonly kind: "opaque-binary" }>;
  readonly mobileHash?: ContentHash;
}) {
  const harness = packageHarness({ mobileHash: input?.mobileHash });
  const execution = runtimeFor(
    harness,
    RUN,
    input?.plans,
    input?.conflict,
  );
  return { ...harness, ...execution };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected D03 runner result.");
  return result.result;
}

function terminalRequests(verifier: PassingVerifier): ValidationStateConvergenceRequest[] {
  return verifier.requests.filter(request =>
    request.state.some(postcondition => postcondition.kind === "terminal-product-result"),
  );
}

test("VH26 D03 previews and proves the binary conflict without ever executing the conflict-containing plan", async () => {
  const s = subject();

  assert.equal(
    s.packageBinding.definition.steps.some(step => String(step.stepId) === "d03-mobile-conflict-execute"),
    false,
  );

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
  ]);
  assert.equal(s.production.executedPlanIds.includes("plan:d03:mobile-conflict"), false);
  assert.equal(s.timeline.includes("execute:plan:d03:mobile-conflict"), false);

  const terminals = terminalRequests(s.verifier);
  assert.equal(terminals.length, 3);
  const terminalIdentities = terminals.map(request => {
    const terminal = request.state.find(item => item.kind === "terminal-product-result");
    assert.ok(terminal && terminal.kind === "terminal-product-result");
    return {
      deviceId: terminal.diagnostic.deviceId,
      runId: terminal.diagnostic.diagnosticRunId,
      fields: terminal.diagnostic.expectedFields,
    };
  });
  assert.deepEqual(terminalIdentities, [
    {
      deviceId: WINDOWS.deviceId,
      runId: WINDOWS_BASE_RUN_ID,
      fields: { stage: "terminal", result: "complete" },
    },
    {
      deviceId: MOBILE.deviceId,
      runId: MOBILE_BASE_RUN_ID,
      fields: { stage: "terminal", result: "complete" },
    },
    {
      deviceId: WINDOWS.deviceId,
      runId: WINDOWS_PUBLISH_RUN_ID,
      fields: { stage: "terminal", result: "complete" },
    },
  ]);
  assert.equal(
    terminalIdentities.some(identity => identity.runId === MOBILE_CONFLICT_PREVIEW_RUN_ID),
    false,
  );

  assert.deepEqual(
    s.timeline.filter(item => item.startsWith("diagnostic:")),
    [
      `diagnostic:windows:${WINDOWS_BASE_RUN_ID}`,
      `diagnostic:mobile:${MOBILE_BASE_RUN_ID}`,
      `diagnostic:windows:${WINDOWS_PUBLISH_RUN_ID}`,
    ],
  );

  const assertCaptureBetweenPreviewAndExecute = (
    preview: string,
    diagnostic: string,
    execute: string,
  ) => {
    const previewIndex = s.timeline.indexOf(preview);
    const diagnosticIndex = s.timeline.indexOf(diagnostic);
    const executeIndex = s.timeline.indexOf(execute);
    assert.ok(previewIndex >= 0);
    assert.ok(diagnosticIndex > previewIndex);
    assert.ok(executeIndex > diagnosticIndex);
  };
  assertCaptureBetweenPreviewAndExecute(
    "preview:plan:d03:baseline-windows",
    `diagnostic:windows:${WINDOWS_BASE_RUN_ID}`,
    "execute:plan:d03:baseline-windows",
  );
  assertCaptureBetweenPreviewAndExecute(
    "preview:plan:d03:baseline-mobile",
    `diagnostic:mobile:${MOBILE_BASE_RUN_ID}`,
    "execute:plan:d03:baseline-mobile",
  );
  assertCaptureBetweenPreviewAndExecute(
    "preview:plan:d03:windows-publish",
    `diagnostic:windows:${WINDOWS_PUBLISH_RUN_ID}`,
    "execute:plan:d03:windows-publish",
  );

  const final = s.verifier.requests[s.verifier.requests.length - 1]!;
  assert.equal(final.state.some(item => item.kind === "terminal-product-result"), false);

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
  assert.equal(remoteTarget.remoteObjectId, undefined);

  const mobileTargetBase = final.state.find(item =>
    item.kind === "base-authority"
    && item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
  );
  assert.ok(mobileTargetBase && mobileTargetBase.kind === "base-authority");
  assert.equal(mobileTargetBase.expectedContent?.hash, BASE_HASH);

  const mobileSafe = final.state.find(item =>
    item.kind === "local-content"
    && item.deviceId === MOBILE.deviceId
    && item.path === SAFE_PATH
  );
  assert.ok(mobileSafe && mobileSafe.kind === "local-content");
  assert.equal(mobileSafe.content.hash, SAFE_BASE_HASH);

  const remoteSafe = final.state.find(item =>
    item.kind === "remote-content" && item.path === SAFE_PATH
  );
  assert.ok(remoteSafe && remoteSafe.kind === "remote-content");
  assert.equal(remoteSafe.content.hash, SAFE_FINAL_HASH);
  assert.equal(remoteSafe.remoteObjectId, undefined);

  assert.ok(final.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
    && item.expected === "mapping"
  ));
  assert.ok(final.state.some(item =>
    item.kind === "durable-intent-or-effect"
    && item.deviceId === MOBILE.deviceId
    && item.expected === "none-outstanding"
  ));

  assert.equal(s.evidence.calls.length, 1);
  const recorded = s.evidence.calls[0]!;
  assert.deepEqual(recorded.executedDiagnosticRunIds, {
    establishWindows: WINDOWS_BASE_RUN_ID,
    establishMobile: MOBILE_BASE_RUN_ID,
    windowsPublish: WINDOWS_PUBLISH_RUN_ID,
  });
  assert.equal(recorded.conflict.kind, "opaque-binary");
  assert.equal(recorded.conflict.preserved.base?.version.content?.hash, BASE_HASH);
  assert.equal(recorded.conflict.preserved.local.version.content?.hash, MOBILE_HASH);
  assert.equal(recorded.conflict.preserved.remote.version.content?.hash, WINDOWS_HASH);
  assert.equal(recorded.conflict.preserved.local.deviceId, MOBILE.deviceId);
  assert.equal(recorded.conflict.preserved.remote.remoteObjectId, REMOTE_ID);
  assert.equal(recorded.conflict.preserved.base?.remoteObjectId, REMOTE_ID);
  assert.equal(recorded.mobileTarget.hash, MOBILE_HASH);
  assert.equal(recorded.windowsTarget.hash, WINDOWS_HASH);
  assert.equal(recorded.safeFinal.hash, SAFE_FINAL_HASH);
  assert.deepEqual(s.production.requestedActions, []);
});

function diagnosticVerifier(
  deviceId: typeof WINDOWS.deviceId | typeof MOBILE.deviceId,
  events: readonly DiagnosticEvent[],
): StateConvergenceVerifier {
  const device: ValidationDeviceObservationSource = {
    deviceId,
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
        throw new Error("D03 terminal diagnostic regression does not read file bytes.");
      },
    },
    authority: {
      loadAuthority: async () => {
        throw new Error("D03 terminal diagnostic regression does not read synchronization authority.");
      },
    },
    diagnostics: { snapshot: () => events },
  };
  return new StateConvergenceVerifier({ devices: [device] });
}

function terminalRequest(
  run: ValidationRunIdentity,
  deviceId: typeof WINDOWS.deviceId | typeof MOBILE.deviceId,
  diagnosticRunId: number,
): ValidationStateConvergenceRequest {
  return {
    run,
    state: [{
      kind: "terminal-product-result",
      assertion: {
        assertionId: validationAssertionId(`d03.terminal.${diagnosticRunId}`),
        kind: "terminal-product-result",
        subject: String(diagnosticRunId),
        expectation: "Only the exact executed production run may establish terminal completion.",
      },
      diagnostic: {
        deviceId,
        component: "sync.controller",
        event: "sync-run-complete",
        diagnosticRunId,
        expectedFields: {
          stage: "terminal",
          result: "complete",
        },
      },
    }],
    convergence: [{
      kind: "cross-device-path",
      assertion: {
        assertionId: validationAssertionId(`d03.terminal.path.${diagnosticRunId}`),
        kind: "cross-device-path",
        subject: String(TARGET_PATH),
        expectation: "The executing device retains the target path.",
      },
      deviceIds: [deviceId],
      path: TARGET_PATH,
      expected: "file",
    }],
  };
}

test("VH26 D03 exact diagnostic run correlation rejects wrong-run, missing, failed, partial, and conflict-preview substitution", async () => {
  const cycles = [
    { deviceId: WINDOWS.deviceId, expected: WINDOWS_BASE_RUN_ID, wrong: WINDOWS_PUBLISH_RUN_ID },
    { deviceId: MOBILE.deviceId, expected: MOBILE_BASE_RUN_ID, wrong: MOBILE_CONFLICT_PREVIEW_RUN_ID },
    { deviceId: WINDOWS.deviceId, expected: WINDOWS_PUBLISH_RUN_ID, wrong: WINDOWS_BASE_RUN_ID },
  ] as const;

  for (const cycle of cycles) {
    const wrongRunEvents = [
      {
        timestamp: "2026-09-22T12:00:00.000Z",
        sequence: 1,
        level: "info" as const,
        component: "sync.controller" as const,
        event: "sync-run-complete",
        runId: cycle.wrong,
        platform: cycle.deviceId === WINDOWS.deviceId ? "desktop" as const : "mobile" as const,
        fields: { stage: "terminal", result: "complete" },
      },
      {
        timestamp: "2026-09-22T12:00:01.000Z",
        sequence: 2,
        level: "info" as const,
        component: "sync.controller" as const,
        event: "sync-run-complete",
        runId: cycle.expected,
        platform: cycle.deviceId === WINDOWS.deviceId ? "desktop" as const : "mobile" as const,
        fields: { stage: "terminal", result: "partial" },
      },
    ];
    const wrongRunReport = await diagnosticVerifier(cycle.deviceId, wrongRunEvents).verify(
      terminalRequest(RUN, cycle.deviceId, cycle.expected),
    );
    assert.equal(wrongRunReport.result.verdict, "fail");

    const missingReport = await diagnosticVerifier(cycle.deviceId, []).verify(
      terminalRequest(RUN, cycle.deviceId, cycle.expected),
    );
    assert.notEqual(missingReport.result.verdict, "pass");

    const failedReport = await diagnosticVerifier(cycle.deviceId, [{
      timestamp: "2026-09-22T12:00:02.000Z",
      sequence: 3,
      level: "error" as const,
      component: "sync.controller" as const,
      event: "sync-run-failed",
      runId: cycle.expected,
      platform: cycle.deviceId === WINDOWS.deviceId ? "desktop" as const : "mobile" as const,
      fields: { stage: "terminal", result: "failed" },
    }]).verify(terminalRequest(RUN, cycle.deviceId, cycle.expected));
    assert.notEqual(failedReport.result.verdict, "pass");

    const partialReport = await diagnosticVerifier(cycle.deviceId, [{
      timestamp: "2026-09-22T12:00:03.000Z",
      sequence: 4,
      level: "info" as const,
      component: "sync.controller" as const,
      event: "sync-run-complete",
      runId: cycle.expected,
      platform: cycle.deviceId === WINDOWS.deviceId ? "desktop" as const : "mobile" as const,
      fields: { stage: "terminal", result: "partial" },
    }]).verify(terminalRequest(RUN, cycle.deviceId, cycle.expected));
    assert.equal(partialReport.result.verdict, "fail");
  }

  const conflictSubstitution = await diagnosticVerifier(MOBILE.deviceId, [{
    timestamp: "2026-09-22T12:00:04.000Z",
    sequence: 5,
    level: "info",
    component: "sync.controller",
    event: "sync-run-complete",
    runId: MOBILE_CONFLICT_PREVIEW_RUN_ID,
    platform: "mobile",
    fields: { stage: "terminal", result: "complete" },
  }]).verify(terminalRequest(RUN, MOBILE.deviceId, MOBILE_BASE_RUN_ID));
  assert.notEqual(conflictSubstitution.result.verdict, "pass");
});

test("VH26 D03 rejects newest-wins or silent overwrite planning and never executes the conflict plan", async () => {
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
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
    "plan:d03:windows-publish",
  ]);
  assert.equal(s.production.executedPlanIds.includes("plan:d03:mobile-conflict"), false);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH26 D03 rejects incomplete or substituted opaque conflict provenance", async () => {
  const s = subject({ conflict: opaqueConflict(WRONG_HASH) });

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D03"));
  assert.equal(result.status, "FAIL");
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
    "plan:d03:windows-publish",
  ]);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH26 D03 rejects unrelated safe-path suppression in the conflict preview", async () => {
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
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
    "plan:d03:windows-publish",
  ]);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH26 D03 rejects a mobile variant that is not independently byte-distinct", async () => {
  const s = subject({ mobileHash: WINDOWS_HASH });

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D03"));
  assert.equal(result.status, "FAIL");
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d03:baseline-windows",
    "plan:d03:baseline-mobile",
  ]);
  assert.equal(s.timeline.includes("preview:plan:d03:windows-publish"), false);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH26 D03 mutable context is exact-run scoped across repeated use of one scenario package", async () => {
  const harness = packageHarness();
  const runA = runtimeFor(harness, RUN_A);
  runA.runtime.setEnabled(true);
  const resultA = runnerResult(await runA.runtime.startScenario("D03"));
  assert.equal(resultA.status, "PASS");
  assert.equal(harness.evidence.calls.length, 1);
  assert.equal(harness.evidence.calls[0]!.run.runId, RUN_A.runId);

  const evidenceDelegate = harness.packageBinding.moduleOverrides["scenario-evidence-recorder"];
  assert.ok(evidenceDelegate);
  const preRunBEvidence = await evidenceDelegate.execute({
    run: RUN_B,
    stepId: validationStepId("d03-run-b-prestart-evidence"),
    operation: D03_OPERATIONS.recordEvidence,
  });
  assert.ok(preRunBEvidence);
  assert.equal(preRunBEvidence.status, "failed");
  if (preRunBEvidence.status === "failed") {
    assert.match(preRunBEvidence.summary, /exact validation run/i);
  }
  assert.equal(harness.evidence.calls.length, 1);

  harness.fixtures.useDescriptorsFrom(RUN_B, RUN_A);
  const runB = runtimeFor(harness, RUN_B);
  runB.runtime.setEnabled(true);
  const resultB = runnerResult(await runB.runtime.startScenario("D03"));
  assert.equal(resultB.status, "FAIL");
  if (resultB.status === "FAIL") {
    assert.match(resultB.reason.summary, /different validation run/i);
  }

  assert.equal(harness.evidence.calls.length, 1);
  assert.equal(
    harness.evidence.calls.some(call => call.run.runId === RUN_B.runId),
    false,
  );
  assert.equal(
    harness.verifier.requests.some(request => request.run.runId === RUN_B.runId),
    false,
  );
});

test("VH26 D03 package stays binary-specific and owns no shared H6B module binding", () => {
  const s = subject();
  assert.equal(D03_TARGET_RELATIVE_PATH, "d03-binary-conflict.bin");
  assert.equal(D03_OPERATIONS.prepareMobileVariant, "d03-prepare-mobile-variant");
  assert.equal(
    s.packageBinding.definition.steps.some(step => step.operation === "execute-asserted-plan" && String(step.stepId).includes("mobile-conflict")),
    false,
  );
  assert.deepEqual(Object.keys(s.packageBinding.moduleOverrides).sort(), [
    "cross-device-coordinator",
    "fixture-manager",
    "scenario-evidence-recorder",
    "state-convergence-verifier",
  ]);
});
