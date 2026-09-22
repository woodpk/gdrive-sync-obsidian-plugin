import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type ConflictAssessment,
  type ContentHash,
  type PlanOperationKind,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import type { DiagnosticEvent } from "../src/diagnostics/diagnostic-logger";
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
  ValidationRunnerScenarioDefinition,
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
  D04_AUTHORITY_CYCLES,
  D04_OPERATIONS,
  D04_SENTINEL_FIXTURE_ID,
  D04_SENTINEL_RELATIVE_PATH,
  D04_TARGET_FIXTURE_ID,
  D04_TARGET_RELATIVE_PATH,
  createD04DeleteVsIndependentModifyScenario,
  type D04CrossDeviceHandoffPort,
  type D04EvidenceRecorderPort,
  type D04FixtureManagerPort,
  type D04ProductionObservationPort,
  type D04VerifierPort,
} from "../src/validation/scenarios/d04-delete-vs-independent-modify";

const RUN = validationRunIdentity("run:vh27:d04", "D04");
const WINDOWS = validationDeviceIdentity("device:d04:windows", "windows-desktop");
const MOBILE = validationDeviceIdentity("device:d04:mobile", "iphone");
const TARGET_PATH = contractId<"VaultPath">("validation/d04/d04-delete-vs-modify.md") as VaultPath;
const SENTINEL_PATH = contractId<"VaultPath">("validation/d04/d04-unrelated-sentinel.md") as VaultPath;
const TARGET_HASH_V1 = contractId<"ContentHash">(
  "sha256:1111111111111111111111111111111111111111111111111111111111111111",
) as ContentHash;
const TARGET_HASH_V2 = contractId<"ContentHash">(
  "sha256:2222222222222222222222222222222222222222222222222222222222222222",
) as ContentHash;
const TARGET_HASH_V3 = contractId<"ContentHash">(
  "sha256:3333333333333333333333333333333333333333333333333333333333333333",
) as ContentHash;
const SENTINEL_HASH = contractId<"ContentHash">(
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
) as ContentHash;
const TARGET_REMOTE_ID = contractId<"RemoteObjectId">("remote:d04:target") as RemoteObjectId;

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
  fixtureId: string,
  relativePath: string,
  path: VaultPath,
  version: number,
  hash: ContentHash,
  purpose: "conflict" | "ordinary",
): ValidationFixtureDescriptor {
  return Object.freeze({
    identity: validationFixtureIdentity(RUN, fixtureId),
    relativePath,
    path,
    kind: "text",
    purpose,
    version,
    sizeBytes: fixtureId === D04_SENTINEL_FIXTURE_ID ? 117 : 128 + version,
    hash,
  });
}

class FakeFixtureManager implements D04FixtureManagerPort {
  readonly createCalls: ValidationFixtureSpec[] = [];
  readonly editCalls: Array<{ fixtureId: string; version: number; textVariant?: ValidationTextVariant }> = [];
  readonly deleteCalls: string[] = [];
  readonly restoreCalls: Array<{ fixtureId: string; version: number; textVariant?: ValidationTextVariant }> = [];

  private targetActive = false;
  private sentinelActive = false;
  private target = descriptor(
    D04_TARGET_FIXTURE_ID,
    D04_TARGET_RELATIVE_PATH,
    TARGET_PATH,
    1,
    TARGET_HASH_V1,
    "conflict",
  );
  private sentinel = descriptor(
    D04_SENTINEL_FIXTURE_ID,
    D04_SENTINEL_RELATIVE_PATH,
    SENTINEL_PATH,
    1,
    SENTINEL_HASH,
    "ordinary",
  );

  constructor(readonly role: "windows" | "mobile") {}

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    this.createCalls.push(spec);
    if (spec.fixtureId === D04_TARGET_FIXTURE_ID) {
      assert.equal(this.targetActive, false);
      this.targetActive = true;
      this.target = descriptor(
        D04_TARGET_FIXTURE_ID,
        D04_TARGET_RELATIVE_PATH,
        TARGET_PATH,
        spec.version,
        TARGET_HASH_V1,
        "conflict",
      );
      return this.target;
    }
    if (spec.fixtureId === D04_SENTINEL_FIXTURE_ID) {
      assert.equal(this.sentinelActive, false);
      this.sentinelActive = true;
      return this.sentinel;
    }
    throw new Error("Unexpected D04 fixture ID.");
  }

  async edit(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    this.editCalls.push({ fixtureId, version, ...(textVariant === undefined ? {} : { textVariant }) });
    if (fixtureId !== D04_TARGET_FIXTURE_ID || !this.targetActive) {
      throw new Error("D04 edit requires the active target fixture.");
    }
    const hash = version === 2 ? TARGET_HASH_V2 : version === 3 ? TARGET_HASH_V3 : undefined;
    if (!hash) throw new Error("Unexpected D04 edit version.");
    this.target = descriptor(
      D04_TARGET_FIXTURE_ID,
      D04_TARGET_RELATIVE_PATH,
      TARGET_PATH,
      version,
      hash,
      "conflict",
    );
    return this.target;
  }

  async delete(fixtureId: string): Promise<ValidationFixtureDescriptor> {
    this.deleteCalls.push(fixtureId);
    if (fixtureId !== D04_TARGET_FIXTURE_ID || !this.targetActive) {
      throw new Error("D04 delete requires the active target fixture.");
    }
    this.targetActive = false;
    return this.target;
  }

  async restoreVersion(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    this.restoreCalls.push({ fixtureId, version, ...(textVariant === undefined ? {} : { textVariant }) });
    if (fixtureId !== D04_TARGET_FIXTURE_ID || this.targetActive || version !== 1) {
      throw new Error("D04 restore must recreate version 1 after the first deletion.");
    }
    this.targetActive = true;
    this.target = descriptor(
      D04_TARGET_FIXTURE_ID,
      D04_TARGET_RELATIVE_PATH,
      TARGET_PATH,
      1,
      TARGET_HASH_V1,
      "conflict",
    );
    return this.target;
  }

  async hash(fixtureId: string): Promise<ContentHash> {
    if (fixtureId === D04_TARGET_FIXTURE_ID) {
      if (!this.targetActive) throw new Error("D04 target is deleted.");
      return this.target.hash!;
    }
    if (fixtureId === D04_SENTINEL_FIXTURE_ID) {
      if (!this.sentinelActive) throw new Error("D04 sentinel is unavailable.");
      return this.sentinel.hash!;
    }
    throw new Error("Unexpected D04 hash fixture ID.");
  }
}

function operation(
  kind: PlanOperationKind,
  path: VaultPath,
  suffix: string,
  options: {
    readonly targetSide?: "local" | "remote";
    readonly destructive?: boolean;
  } = {},
): SynchronizationPlan["operations"][number] {
  return Object.freeze({
    operationId: contractId<"OperationId">("op:d04:" + suffix),
    kind,
    path,
    ...(options.targetSide === undefined ? {} : { targetSide: options.targetSide }),
    destructive: options.destructive ?? false,
    preconditions: [],
    reasons: [],
  });
}

function plan(
  planId: string,
  operations: SynchronizationPlan["operations"],
  executionDisposition: SynchronizationPlan["executionDisposition"] = "safe-auto-eligible",
  globalExecutionGate: SynchronizationPlan["globalExecutionGate"] = "none",
  recoveryCheckpointRequired = false,
): SynchronizationPlan {
  return Object.freeze({
    planId: contractId<"PlanId">(planId),
    trigger: "manual",
    operations,
    executionDisposition,
    recoveryCheckpointRequired,
    globalExecutionGate,
  });
}

function establishWindowsPlan(): SynchronizationPlan {
  return plan("plan:d04:establish-windows", [
    operation("upload-create", TARGET_PATH, "establish-windows-target", { targetSide: "remote" }),
    operation("upload-create", SENTINEL_PATH, "establish-windows-sentinel", { targetSide: "remote" }),
  ]);
}

function establishMobilePlan(): SynchronizationPlan {
  return plan("plan:d04:establish-mobile", [
    operation("noop", TARGET_PATH, "establish-mobile-target"),
    operation("noop", SENTINEL_PATH, "establish-mobile-sentinel"),
  ]);
}

function mobileModifyPlan(): SynchronizationPlan {
  return plan("plan:d04:mobile-modify", [
    operation("upload-update", TARGET_PATH, "mobile-modify-target", { targetSide: "remote" }),
    operation("noop", SENTINEL_PATH, "mobile-modify-sentinel"),
  ]);
}

function subcaseAConflictPlan(): SynchronizationPlan {
  return plan("plan:d04:subcase-a-conflict", [
    operation("unresolved-conflict", TARGET_PATH, "subcase-a-conflict"),
    operation("noop", SENTINEL_PATH, "subcase-a-sentinel"),
  ], "requires-user-approval");
}

function restoreWindowsPlan(): SynchronizationPlan {
  return plan("plan:d04:restore-windows", [
    operation("download-update", TARGET_PATH, "restore-windows-target", { targetSide: "local" }),
    operation("noop", SENTINEL_PATH, "restore-windows-sentinel"),
  ]);
}

function windowsModifyPlan(): SynchronizationPlan {
  return plan("plan:d04:windows-modify", [
    operation("upload-update", TARGET_PATH, "windows-modify-target", { targetSide: "remote" }),
    operation("noop", SENTINEL_PATH, "windows-modify-sentinel"),
  ]);
}

function subcaseBConflictPlan(): SynchronizationPlan {
  return plan("plan:d04:subcase-b-conflict", [
    operation("unresolved-conflict", TARGET_PATH, "subcase-b-conflict"),
    operation("noop", SENTINEL_PATH, "subcase-b-sentinel"),
  ], "requires-user-approval");
}

function completePlans(): readonly SynchronizationPlan[] {
  return [
    establishWindowsPlan(),
    establishMobilePlan(),
    mobileModifyPlan(),
    subcaseAConflictPlan(),
    restoreWindowsPlan(),
    windowsModifyPlan(),
    subcaseBConflictPlan(),
  ];
}

type ConflictFixtureMode = "normal" | "missing" | "wrong-modified" | "wrong-base";
type TerminalFixtureMode = "complete" | "partial" | "failed" | "missing" | "wrong-run";

interface ProductionFixtureOptions {
  readonly conflictMode?: ConflictFixtureMode;
  readonly terminalByPlanId?: Readonly<Record<string, TerminalFixtureMode>>;
}

function conflictAssessment(
  planId: string,
  mode: ConflictFixtureMode,
): Extract<ConflictAssessment, { readonly kind: "delete-vs-modify" }> | undefined {
  if (mode === "missing") return undefined;
  const subcaseA = planId === "plan:d04:subcase-a-conflict";
  const modifiedHash = subcaseA ? TARGET_HASH_V2 : TARGET_HASH_V3;
  const baseHash = subcaseA ? TARGET_HASH_V1 : TARGET_HASH_V2;
  const modifiedVersion = subcaseA ? 2 : 3;
  const baseVersion = subcaseA ? 1 : 2;
  const actualModifiedHash = mode === "wrong-modified" ? TARGET_HASH_V1 : modifiedHash;
  const actualBaseHash = mode === "wrong-base" ? TARGET_HASH_V3 : baseHash;
  return Object.freeze({
    kind: "delete-vs-modify",
    conflictId: contractId<"ConflictId">("conflict:" + planId),
    path: TARGET_PATH,
    modifiedSide: "remote",
    modifiedVersion: Object.freeze({
      source: "remote",
      remoteObjectId: TARGET_REMOTE_ID,
      version: Object.freeze({
        path: TARGET_PATH,
        entityKind: "file",
        remoteObjectId: TARGET_REMOTE_ID,
        content: Object.freeze({
          hash: actualModifiedHash,
          sizeBytes: 128 + modifiedVersion,
        }),
      }),
    }),
    base: Object.freeze({
      source: "base",
      remoteObjectId: TARGET_REMOTE_ID,
      version: Object.freeze({
        path: TARGET_PATH,
        entityKind: "file",
        remoteObjectId: TARGET_REMOTE_ID,
        content: Object.freeze({
          hash: actualBaseHash,
          sizeBytes: 128 + baseVersion,
        }),
      }),
    }),
  });
}

function preparedFields(observed: SynchronizationPlan): DiagnosticEvent["fields"] {
  const count = (predicate: (kind: PlanOperationKind) => boolean) =>
    observed.operations.filter(item => predicate(item.kind)).length;
  return {
    stage: "preview-prepared",
    trigger: "manual",
    planDisposition: observed.executionDisposition,
    operationCount: observed.operations.length,
    conflictCount: count(kind => kind === "unresolved-conflict"),
    destructiveCount: observed.operations.filter(item => item.destructive).length,
    uploadCount: count(kind => kind.startsWith("upload-")),
    downloadCount: count(kind => kind.startsWith("download-")),
    noopCount: count(kind => kind === "noop"),
  };
}

function productionFixture(
  plans: readonly SynchronizationPlan[],
  options: ProductionFixtureOptions = {},
) {
  let previewIndex = 0;
  let sequence = 0;
  let nextRunId = 100;
  let currentRunId: number | undefined;
  let currentPlan: SynchronizationPlan | undefined;
  const calls: string[] = [];
  const executedPlanIds: string[] = [];
  const diagnostics: DiagnosticEvent[] = [];
  let surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };

  const pushDiagnostic = (
    event: string,
    runId: number,
    fields: DiagnosticEvent["fields"],
  ) => {
    sequence += 1;
    diagnostics.push({
      timestamp: "2026-09-22T17:30:00.000Z",
      sequence,
      level: "trace",
      component: "sync.controller",
      event,
      runId,
      platform: "desktop",
      fields,
    });
  };

  const preview = async () => {
    calls.push("preview-manual");
    const observed = plans[previewIndex];
    previewIndex += 1;
    if (!observed) throw new Error("No D04 plan fixture remains for preview.");
    currentPlan = observed;
    currentRunId = nextRunId++;
    pushDiagnostic("manual-sync-request-enter", currentRunId, {
      operation: "preview-manual",
      trigger: "manual",
    });

    const isConflict = observed.planId === contractId<"PlanId">("plan:d04:subcase-a-conflict")
      || observed.planId === contractId<"PlanId">("plan:d04:subcase-b-conflict");
    const conflict = isConflict
      ? conflictAssessment(String(observed.planId), options.conflictMode ?? "normal")
      : undefined;
    surface = {
      status: conflict ? { kind: "conflict-present", conflictCount: 1 } : { kind: "idle-ready" },
      planPreview: observed,
      conflicts: conflict ? [conflict] : [],
    };
    pushDiagnostic("plan-preview-preparation-start", currentRunId, preparedFields(observed));
    return observed;
  };

  const controller: ValidationProductionControllerPort = {
    previewManual: preview,
    previewVerifyReconcile: preview,
    runAutomatic: async trigger => {
      calls.push("automatic:" + trigger);
    },
    request: async action => {
      calls.push("request:" + action.kind);
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      calls.push("execute:" + String(action.planId));
      executedPlanIds.push(String(action.planId));
      if (!currentPlan || currentPlan.planId !== action.planId || currentRunId === undefined) {
        throw new Error("D04 fake production execution is not bound to the current preview run.");
      }
      const mode = options.terminalByPlanId?.[String(action.planId)] ?? "complete";
      if (mode !== "missing") {
        const terminalRunId = mode === "wrong-run" ? currentRunId + 1000 : currentRunId;
        pushDiagnostic(
          mode === "failed" ? "sync-run-failed" : "sync-run-complete",
          terminalRunId,
          {
            stage: "terminal",
            result: mode === "partial" ? "partial" : mode === "failed" ? "failed" : "complete",
          },
        );
      }
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => {
      throw new Error("Direct run-evidence reads are not expected in D04 focused tests.");
    },
  };

  const observation: D04ProductionObservationPort = {
    currentSurface: () => surface,
    diagnosticSnapshot: () => diagnostics.map(event => ({ ...event, fields: event.fields ? { ...event.fields } : undefined })),
  };

  return {
    calls,
    executedPlanIds,
    diagnostics,
    observation,
    previewCount: () => previewIndex,
    runtime: { productController: () => controller },
  };
}

function passingReport(request: ValidationStateConvergenceRequest): ValidationStateConvergenceReport {
  const stateRef = validationEvidenceRef("vh27:d04:state-proof");
  const convergenceRef = validationEvidenceRef("vh27:d04:convergence-proof");
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
      { ref: stateRef, source: "authority", summary: "D04 state postconditions observed." },
      { ref: convergenceRef, source: "convergence", summary: "D04 convergence postconditions observed." },
    ],
  };
}

class PassingVerifier implements D04VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    return passingReport(request);
  }
}

class RecordingHandoffs implements D04CrossDeviceHandoffPort {
  readonly phases: string[] = [];

  async handoff(input: Parameters<D04CrossDeviceHandoffPort["handoff"]>[0]) {
    this.phases.push(input.phase);
    return [validationEvidenceRef("vh27:d04:handoff:" + input.phase)];
  }
}

class RecordingEvidence implements D04EvidenceRecorderPort {
  readonly calls: Array<Parameters<D04EvidenceRecorderPort["record"]>[0]> = [];

  async record(input: Parameters<D04EvidenceRecorderPort["record"]>[0]) {
    this.calls.push(input);
    return [validationEvidenceRef("vh27:d04:scenario-evidence")];
  }
}

function subject(
  plans: readonly SynchronizationPlan[],
  definitionTransform?: (definition: ValidationRunnerScenarioDefinition) => ValidationRunnerScenarioDefinition,
  productionOptions: ProductionFixtureOptions = {},
) {
  const windowsFixtures = new FakeFixtureManager("windows");
  const mobileFixtures = new FakeFixtureManager("mobile");
  const verifier = new PassingVerifier();
  const handoffs = new RecordingHandoffs();
  const evidence = new RecordingEvidence();
  const production = productionFixture(plans, productionOptions);
  const packageBinding = createD04DeleteVsIndependentModifyScenario({
    targetPath: TARGET_PATH,
    sentinelPath: SENTINEL_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixtures,
    mobileFixtures,
    windowsProduction: production.observation,
    mobileProduction: production.observation,
    verifier,
    handoffs,
    evidence,
  });
  const definition = definitionTransform?.(packageBinding.definition) ?? packageBinding.definition;
  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [definition],
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
    definition,
    production,
    windowsFixtures,
    mobileFixtures,
    verifier,
    handoffs,
    evidence,
  };
}

function runnerResult(result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected D04 runner result.");
  return result.result;
}

function stepCycle(step: ValidationRunnerScenarioDefinition["steps"][number]): string | undefined {
  const input = step.input;
  if (!input || typeof input !== "object") return undefined;
  const value = (input as { readonly authorityCycleId?: unknown }).authorityCycleId;
  return typeof value === "string" ? value : undefined;
}

test("VH27 D04 executes both role-reversed delete-vs-modify subcases through fixed H6B preview/assertion authority and preserves modifications", async () => {
  const s = subject(completePlans());

  assert.equal("production-path-driver" in s.packageBinding.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in s.packageBinding.moduleOverrides, false);

  for (const cycle of [D04_AUTHORITY_CYCLES.subcaseAWindowsConflict, D04_AUTHORITY_CYCLES.subcaseBMobileConflict]) {
    const steps = s.definition.steps.filter(step => stepCycle(step) === cycle);
    assert.deepEqual(steps.map(step => step.operation), [
      D04_OPERATIONS.captureProductionCycle,
      "preview-manual",
      "assert-observed-plan",
      D04_OPERATIONS.verifyConflictPresentation,
    ]);
    const assertion = steps[2]!;
    const expectation = (assertion.input as {
      readonly expectation: {
        readonly expectedOperations: ReadonlyArray<{ readonly kind: string; readonly path: VaultPath }>;
        readonly conflictExpectation: string;
        readonly destructiveExpectation: string;
        readonly expectedExecutionDisposition: string;
        readonly expectedGlobalExecutionGate: string;
      };
    }).expectation;
    assert.deepEqual(
      expectation.expectedOperations.map(item => [item.kind, item.path]),
      [["unresolved-conflict", TARGET_PATH]],
    );
    assert.equal(expectation.conflictExpectation, "required");
    assert.equal(expectation.destructiveExpectation, "forbidden");
    assert.equal(expectation.expectedExecutionDisposition, "requires-user-approval");
    assert.equal(expectation.expectedGlobalExecutionGate, "none");
  }
  assert.equal(s.definition.steps.some(step => step.operation === "resolve-observed-conflict"), false);

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D04"));
  assert.equal(result.status, "PASS");

  assert.equal(s.production.previewCount(), 7);
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d04:establish-windows",
    "plan:d04:establish-mobile",
    "plan:d04:mobile-modify",
    "plan:d04:restore-windows",
    "plan:d04:windows-modify",
  ]);
  assert.equal(s.production.calls.some(call => call === "request:resolve-conflict"), false);

  assert.deepEqual(s.handoffs.phases, [
    "baseline-to-mobile",
    "subcase-a-delete-to-mobile",
    "subcase-a-modification-to-windows",
    "subcase-b-restored-base-to-mobile",
    "subcase-b-delete-to-windows",
    "subcase-b-modification-to-mobile",
  ]);

  assert.deepEqual(s.windowsFixtures.deleteCalls, [D04_TARGET_FIXTURE_ID]);
  assert.deepEqual(s.mobileFixtures.deleteCalls, [D04_TARGET_FIXTURE_ID]);
  assert.deepEqual(s.mobileFixtures.editCalls, [{
    fixtureId: D04_TARGET_FIXTURE_ID,
    version: 2,
    textVariant: "non-overlap-a",
  }]);
  assert.deepEqual(s.windowsFixtures.restoreCalls, [{
    fixtureId: D04_TARGET_FIXTURE_ID,
    version: 1,
    textVariant: "base",
  }]);
  assert.deepEqual(s.windowsFixtures.editCalls, [{
    fixtureId: D04_TARGET_FIXTURE_ID,
    version: 3,
    textVariant: "non-overlap-b",
  }]);

  assert.equal(s.verifier.requests.length, 4);
  const terminalProofs = s.verifier.requests.flatMap(request =>
    request.state.filter(item => item.kind === "terminal-product-result")
  );
  assert.equal(terminalProofs.length, 5);
  const terminalRunIds = terminalProofs.map(item =>
    item.kind === "terminal-product-result" ? item.diagnostic.diagnosticRunId : undefined
  );
  assert.equal(terminalRunIds.every(runId => typeof runId === "number"), true);
  assert.equal(new Set(terminalRunIds).size, 5);

  const subcaseA = s.verifier.requests[1]!;
  const aRemote = subcaseA.state.find(item => item.kind === "remote-content" && item.path === TARGET_PATH);
  assert.ok(aRemote && aRemote.kind === "remote-content");
  assert.equal(aRemote.content.hash, TARGET_HASH_V2);
  assert.equal(aRemote.remoteObjectId, TARGET_REMOTE_ID);
  const aWindowsBase = subcaseA.state.find(item =>
    item.kind === "base-authority"
    && item.deviceId === WINDOWS.deviceId
    && item.path === TARGET_PATH
  );
  assert.ok(aWindowsBase && aWindowsBase.kind === "base-authority");
  assert.equal(aWindowsBase.expectedContent?.hash, TARGET_HASH_V1);
  const aProtected = subcaseA.state.find(item => item.kind === "unrelated-mutation-absence");
  assert.ok(aProtected && aProtected.kind === "unrelated-mutation-absence");
  assert.ok(aProtected.local.some(item =>
    item.deviceId === WINDOWS.deviceId
    && item.path === TARGET_PATH
    && item.state === "absent"
  ));

  const restored = s.verifier.requests[2]!;
  const restoredWindows = restored.state.find(item =>
    item.kind === "local-content"
    && item.deviceId === WINDOWS.deviceId
    && item.path === TARGET_PATH
  );
  assert.ok(restoredWindows && restoredWindows.kind === "local-content");
  assert.equal(restoredWindows.content.hash, TARGET_HASH_V2);

  const subcaseB = s.verifier.requests[3]!;
  const bRemote = subcaseB.state.find(item => item.kind === "remote-content" && item.path === TARGET_PATH);
  assert.ok(bRemote && bRemote.kind === "remote-content");
  assert.equal(bRemote.content.hash, TARGET_HASH_V3);
  assert.equal(bRemote.remoteObjectId, TARGET_REMOTE_ID);
  const bMobileBase = subcaseB.state.find(item =>
    item.kind === "base-authority"
    && item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
  );
  assert.ok(bMobileBase && bMobileBase.kind === "base-authority");
  assert.equal(bMobileBase.expectedContent?.hash, TARGET_HASH_V2);
  const bProtected = subcaseB.state.find(item => item.kind === "unrelated-mutation-absence");
  assert.ok(bProtected && bProtected.kind === "unrelated-mutation-absence");
  assert.ok(bProtected.local.some(item =>
    item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
    && item.state === "absent"
  ));

  assert.equal(s.evidence.calls.length, 1);
  assert.equal(s.evidence.calls[0]?.baseline.hash, TARGET_HASH_V1);
  assert.equal(s.evidence.calls[0]?.subcaseAModified.hash, TARGET_HASH_V2);
  assert.equal(s.evidence.calls[0]?.subcaseBModified.hash, TARGET_HASH_V3);
  assert.equal(s.evidence.calls[0]?.sentinel.hash, SENTINEL_HASH);
});

test("VH27 D04 rejects an unresolved-conflict plan when the production surface does not present delete-vs-modify", async () => {
  const s = subject(
    [establishWindowsPlan(), establishMobilePlan(), mobileModifyPlan(), subcaseAConflictPlan()],
    undefined,
    { conflictMode: "missing" },
  );
  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D04"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") assert.match(result.reason.summary, /production surface|delete-vs-modify/i);
  assert.equal(s.evidence.calls.length, 0);
});

for (const conflictMode of ["wrong-modified", "wrong-base"] as const) {
  test("VH27 D04 rejects incorrect conflict provenance: " + conflictMode, async () => {
    const s = subject(
      [establishWindowsPlan(), establishMobilePlan(), mobileModifyPlan(), subcaseAConflictPlan()],
      undefined,
      { conflictMode },
    );
    s.runtime.setEnabled(true);
    const result = runnerResult(await s.runtime.startScenario("D04"));
    assert.equal(result.status, "FAIL");
    if (result.status === "FAIL") assert.match(result.reason.summary, /surviving independent modification|BASE provenance/i);
    assert.equal(s.evidence.calls.length, 0);
  });
}

test("VH27 D04 rejects missing terminal proof for a relied-upon production execution", async () => {
  const s = subject(
    [establishWindowsPlan(), establishMobilePlan(), mobileModifyPlan(), subcaseAConflictPlan()],
    undefined,
    { terminalByPlanId: { "plan:d04:mobile-modify": "missing" } },
  );
  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D04"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") assert.match(result.reason.summary, /run-correlated terminal diagnostic/i);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH27 D04 rejects terminal proof from a different production run", async () => {
  const s = subject(
    [establishWindowsPlan(), establishMobilePlan(), mobileModifyPlan(), subcaseAConflictPlan()],
    undefined,
    { terminalByPlanId: { "plan:d04:mobile-modify": "wrong-run" } },
  );
  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D04"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") assert.match(result.reason.summary, /run-correlated terminal diagnostic/i);
  assert.equal(s.evidence.calls.length, 0);
});

for (const terminalMode of ["failed", "partial"] as const) {
  test("VH27 D04 rejects non-complete production terminal result: " + terminalMode, async () => {
    const s = subject(
      [establishWindowsPlan(), establishMobilePlan(), mobileModifyPlan(), subcaseAConflictPlan()],
      undefined,
      { terminalByPlanId: { "plan:d04:mobile-modify": terminalMode } },
    );
    s.runtime.setEnabled(true);
    const result = runnerResult(await s.runtime.startScenario("D04"));
    assert.equal(result.status, "FAIL");
    if (result.status === "FAIL") assert.match(result.reason.summary, /did not complete successfully/i);
    assert.equal(s.evidence.calls.length, 0);
  });
}

test("VH27 D04 rejects silent deletion propagation before destructive production execution", async () => {
  const silentDeletion = plan("plan:d04:silent-delete", [
    operation("trash-remote", TARGET_PATH, "silent-delete-target", {
      targetSide: "remote",
      destructive: true,
    }),
    operation("noop", SENTINEL_PATH, "silent-delete-sentinel"),
  ], "requires-user-approval", "destructive-approval-required", true);

  const s = subject([
    establishWindowsPlan(),
    establishMobilePlan(),
    mobileModifyPlan(),
    silentDeletion,
  ]);

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D04"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /unresolved-conflict|trash-remote|destructive|forbidden/i);
  }
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d04:establish-windows",
    "plan:d04:establish-mobile",
    "plan:d04:mobile-modify",
  ]);
  assert.equal(s.production.executedPlanIds.includes("plan:d04:silent-delete"), false);
  assert.equal(s.verifier.requests.length, 1);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH27 D04 rejects automatic newest-wins recovery in the reversed subcase before execution", async () => {
  const newestWins = plan("plan:d04:newest-wins", [
    operation("download-create", TARGET_PATH, "newest-wins-target", { targetSide: "local" }),
    operation("noop", SENTINEL_PATH, "newest-wins-sentinel"),
  ]);

  const s = subject([
    establishWindowsPlan(),
    establishMobilePlan(),
    mobileModifyPlan(),
    subcaseAConflictPlan(),
    restoreWindowsPlan(),
    windowsModifyPlan(),
    newestWins,
  ]);

  s.runtime.setEnabled(true);
  const result = runnerResult(await s.runtime.startScenario("D04"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /unresolved-conflict|download-create|conflict|forbidden/i);
  }
  assert.deepEqual(s.production.executedPlanIds, [
    "plan:d04:establish-windows",
    "plan:d04:establish-mobile",
    "plan:d04:mobile-modify",
    "plan:d04:restore-windows",
    "plan:d04:windows-modify",
  ]);
  assert.equal(s.production.executedPlanIds.includes("plan:d04:newest-wins"), false);
  assert.equal(s.verifier.requests.length, 3);
  assert.equal(s.evidence.calls.length, 0);
});

test("VH27 D04 keeps scenario ownership bounded to task-local modules and re-establishes the inter-subcase BASE through production download-update", () => {
  const s = subject(completePlans());

  assert.equal(D04_TARGET_RELATIVE_PATH, "d04-delete-vs-modify.md");
  assert.equal(D04_OPERATIONS.restoreWindowsBaselineBytes, "d04-restore-windows-baseline-bytes");
  assert.deepEqual(Object.keys(s.packageBinding.moduleOverrides).sort(), [
    "cross-device-coordinator",
    "fixture-manager",
    "scenario-evidence-recorder",
    "state-convergence-verifier",
  ]);

  const restoreAssertion = s.definition.steps.find(step =>
    String(step.stepId) === "d04-restore-windows-base-assert"
  );
  assert.ok(restoreAssertion);
  const input = restoreAssertion.input as {
    readonly authorityCycleId: string;
    readonly expectation: {
      readonly expectedOperations: ReadonlyArray<{
        readonly kind: string;
        readonly path: VaultPath;
        readonly targetSide?: string;
      }>;
    };
  };
  assert.equal(input.authorityCycleId, D04_AUTHORITY_CYCLES.restoreWindowsBase);
  assert.deepEqual(
    input.expectation.expectedOperations.map(item => [item.kind, item.path, item.targetSide]),
    [["download-update", TARGET_PATH, "local"]],
  );
});
