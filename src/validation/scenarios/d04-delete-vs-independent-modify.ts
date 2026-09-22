import {
  PLAN_OPERATION_KINDS,
  type ConflictAssessment,
  type PlanOperationKind,
  type ProductSurfaceState,
  type RemoteObjectId,
  type VaultPath,
} from "../../contracts";
import type { DiagnosticEvent } from "../../diagnostics/diagnostic-logger";
import {
  validationAssertionId,
  type ValidationConvergenceAssertion,
  type ValidationEvidenceRef,
  type ValidationExpectedPlanOperation,
  type ValidationPlanExpectation,
  type ValidationStateAssertion,
} from "../driver-plan-fault-verifier-contracts";
import {
  validationTextFixture,
  type ValidationFixtureDescriptor,
  type ValidationFixtureManager,
} from "../fixture-manager";
import {
  validationStepId,
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStepDefinition,
} from "../scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "../scenario-runner-module-adapter";
import type {
  StateConvergenceVerifier,
  ValidationDiagnosticExpectation,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const D04_SCENARIO_ID = "D04" as const;
export const D04_LIVE_PACKAGE = "D04-delete-vs-modify.md" as const;
export const D04_TARGET_FIXTURE_ID = "d04-delete-vs-modify" as const;
export const D04_TARGET_RELATIVE_PATH = "d04-delete-vs-modify.md" as const;
export const D04_SENTINEL_FIXTURE_ID = "d04-unrelated-sentinel" as const;
export const D04_SENTINEL_RELATIVE_PATH = "d04-unrelated-sentinel.md" as const;

export const D04_AUTHORITY_CYCLES = Object.freeze({
  establishWindows: "d04-establish-windows",
  establishMobile: "d04-establish-mobile",
  subcaseAMobileModify: "d04-subcase-a-mobile-modify",
  subcaseAWindowsConflict: "d04-subcase-a-windows-conflict",
  restoreWindowsBase: "d04-restore-windows-base",
  subcaseBWindowsModify: "d04-subcase-b-windows-modify",
  subcaseBMobileConflict: "d04-subcase-b-mobile-conflict",
} as const);

export const D04_OPERATIONS = Object.freeze({
  establishWindowsFixtures: "d04-establish-windows-fixtures",
  handoffBaselineToMobile: "d04-handoff-baseline-to-mobile",
  establishMobileFixtures: "d04-establish-mobile-fixtures",
  verifyTrustedBaseline: "d04-verify-trusted-baseline",
  deleteWindowsTarget: "d04-delete-windows-target",
  handoffSubcaseAToMobile: "d04-handoff-subcase-a-to-mobile",
  editMobileTarget: "d04-edit-mobile-target",
  handoffSubcaseAToWindows: "d04-handoff-subcase-a-to-windows",
  verifySubcaseA: "d04-verify-subcase-a",
  restoreWindowsBaselineBytes: "d04-restore-windows-baseline-bytes",
  verifyRestoredBase: "d04-verify-restored-base",
  handoffSubcaseBToMobile: "d04-handoff-subcase-b-to-mobile",
  deleteMobileTarget: "d04-delete-mobile-target",
  handoffSubcaseBToWindows: "d04-handoff-subcase-b-to-windows",
  editWindowsTarget: "d04-edit-windows-target",
  handoffSubcaseBConflictToMobile: "d04-handoff-subcase-b-conflict-to-mobile",
  verifySubcaseB: "d04-verify-subcase-b",
  captureProductionCycle: "d04-capture-production-cycle",
  bindProductionRun: "d04-bind-production-run",
  verifyConflictPresentation: "d04-verify-conflict-presentation",
  recordEvidence: "d04-record-evidence",
} as const);

export type D04FixtureManagerPort = Pick<
  ValidationFixtureManager,
  "create" | "edit" | "delete" | "restoreVersion" | "hash"
>;
export type D04VerifierPort = Pick<StateConvergenceVerifier, "verify">;

export interface D04ProductionObservationPort {
  currentSurface(): ProductSurfaceState;
  diagnosticSnapshot(): readonly DiagnosticEvent[];
}

export type D04DeviceRole = "windows" | "mobile";

export type D04HandoffPhase =
  | "baseline-to-mobile"
  | "subcase-a-delete-to-mobile"
  | "subcase-a-modification-to-windows"
  | "subcase-b-restored-base-to-mobile"
  | "subcase-b-delete-to-windows"
  | "subcase-b-modification-to-mobile";

export interface D04CrossDeviceHandoffPort {
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly phase: D04HandoffPhase;
    readonly from: "windows" | "mobile";
    readonly to: "windows" | "mobile";
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D04EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly baseline: ValidationFixtureDescriptor;
    readonly subcaseAModified: ValidationFixtureDescriptor;
    readonly subcaseBModified: ValidationFixtureDescriptor;
    readonly sentinel: ValidationFixtureDescriptor;
    readonly baselineVerification: ValidationStateConvergenceReport;
    readonly subcaseAVerification: ValidationStateConvergenceReport;
    readonly restoredBaseVerification: ValidationStateConvergenceReport;
    readonly subcaseBVerification: ValidationStateConvergenceReport;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D04ScenarioPackageOptions {
  readonly targetPath: VaultPath;
  readonly sentinelPath: VaultPath;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly windowsFixtures: D04FixtureManagerPort;
  readonly mobileFixtures: D04FixtureManagerPort;
  readonly windowsProduction: D04ProductionObservationPort;
  readonly mobileProduction: D04ProductionObservationPort;
  readonly verifier: D04VerifierPort;
  readonly handoffs: D04CrossDeviceHandoffPort;
  readonly evidence: D04EvidenceRecorderPort;
}

export interface D04ScenarioPackage {
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
}

type PlanExpectationWithoutRun = Omit<ValidationPlanExpectation, "run">;

interface D04CycleObservation {
  readonly run: ValidationRunIdentity;
  readonly role: D04DeviceRole;
  readonly checkpointSequence: number;
  diagnosticRunId?: number;
  planId?: string;
}

interface D04ConflictObservation {
  readonly run: ValidationRunIdentity;
  readonly conflictId: string;
  readonly remoteObjectId: RemoteObjectId;
  readonly diagnosticRunId: number;
}

interface D04RunContext {
  readonly run: ValidationRunIdentity;
  readonly cycleObservations: Map<string, D04CycleObservation>;
  baseline?: ValidationFixtureDescriptor;
  windowsTarget?: ValidationFixtureDescriptor;
  mobileTarget?: ValidationFixtureDescriptor;
  sentinel?: ValidationFixtureDescriptor;
  subcaseAModified?: ValidationFixtureDescriptor;
  subcaseBModified?: ValidationFixtureDescriptor;
  subcaseAConflict?: D04ConflictObservation;
  subcaseBConflict?: D04ConflictObservation;
  baselineVerification?: ValidationStateConvergenceReport;
  subcaseAVerification?: ValidationStateConvergenceReport;
  restoredBaseVerification?: ValidationStateConvergenceReport;
  subcaseBVerification?: ValidationStateConvergenceReport;
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function runKey(run: ValidationRunIdentity): string {
  return String(run.scenarioId) + "\u0000" + String(run.runId);
}

function newRunContext(run: ValidationRunIdentity): D04RunContext {
  return {
    run,
    cycleObservations: new Map(),
  };
}

function requireRunContext(
  contexts: Map<string, D04RunContext>,
  run: ValidationRunIdentity,
): D04RunContext {
  const context = contexts.get(runKey(run));
  if (!context || !sameRun(context.run, run)) {
    throw new Error("D04 has no task-local state established for the current validation run.");
  }
  return context;
}

function establishRunContext(
  contexts: Map<string, D04RunContext>,
  run: ValidationRunIdentity,
): D04RunContext {
  const key = runKey(run);
  const existing = contexts.get(key);
  if (existing) {
    if (!sameRun(existing.run, run)) {
      throw new Error("D04 run-context identity collision.");
    }
    throw new Error("D04 task-local state is already established for this validation run.");
  }
  const context = newRunContext(run);
  contexts.set(key, context);
  return context;
}

function assertContextRun(context: D04RunContext, run: ValidationRunIdentity): void {
  if (!sameRun(context.run, run)) {
    throw new Error("D04 task-local state belongs to a different validation run.");
  }
}

function completed(evidenceRefs: readonly ValidationEvidenceRef[] = []) {
  return { status: "completed" as const, evidenceRefs };
}

function failed(summary: string, evidenceRefs: readonly ValidationEvidenceRef[] = []) {
  return { status: "failed" as const, summary, evidenceRefs };
}

function blocked(summary: string, evidenceRefs: readonly ValidationEvidenceRef[] = []) {
  return { status: "blocked" as const, summary, evidenceRefs };
}

function stateAssertion(
  id: string,
  kind: ValidationStateAssertion["kind"],
  subject: string,
  expectation: string,
): ValidationStateAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject,
    expectation,
  });
}

function convergenceAssertion(
  id: string,
  kind: ValidationConvergenceAssertion["kind"],
  subject: string,
  expectation: string,
): ValidationConvergenceAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject,
    expectation,
  });
}

function forbiddenKinds(
  expectedOperations: readonly ValidationExpectedPlanOperation[],
  allowBackgroundNoop: boolean,
): readonly PlanOperationKind[] {
  const allowed = new Set<PlanOperationKind>(expectedOperations.map(operation => operation.kind));
  if (allowBackgroundNoop) allowed.add("noop");
  return Object.freeze(PLAN_OPERATION_KINDS.filter(kind => !allowed.has(kind)));
}

function expectedOperation(
  kind: "noop" | "upload-create" | "upload-update" | "download-update" | "unresolved-conflict",
  path: VaultPath,
): ValidationExpectedPlanOperation {
  const targetSide = kind.startsWith("upload-")
    ? "remote" as const
    : kind.startsWith("download-")
      ? "local" as const
      : undefined;
  return Object.freeze({
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    destructive: false,
  });
}

function ordinaryExpectation(
  expectedOperations: readonly ValidationExpectedPlanOperation[],
  allowBackgroundNoop = true,
): PlanExpectationWithoutRun {
  return Object.freeze({
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([...expectedOperations]),
    allowedBackgroundKinds: Object.freeze(allowBackgroundNoop ? ["noop"] as const : []),
    forbiddenKinds: forbiddenKinds(expectedOperations, allowBackgroundNoop),
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: "safe-auto-eligible" as const,
    expectedGlobalExecutionGate: "none" as const,
  });
}

function conflictExpectation(path: VaultPath): PlanExpectationWithoutRun {
  const expected = Object.freeze([expectedOperation("unresolved-conflict", path)]);
  return Object.freeze({
    expectedTrigger: "manual",
    expectedOperations: expected,
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: forbiddenKinds(expected, true),
    conflictExpectation: "required" as const,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: "requires-user-approval" as const,
    expectedGlobalExecutionGate: "none" as const,
  });
}

function previewStep(stepId: string, cycleId: string): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "production-path-driver",
    operation: "preview-manual",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function assertionStep(
  stepId: string,
  cycleId: string,
  assertionId: string,
  expectation: PlanExpectationWithoutRun,
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "plan-assertion-engine",
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({
      authorityCycleId: cycleId,
      assertionId,
      expectation,
    }),
  });
}

function executeStep(stepId: string, cycleId: string): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "production-path-driver",
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function moduleStep(
  stepId: string,
  module: ValidationRunnerStepDefinition["module"],
  operation: string,
  proof: ValidationRunnerStepDefinition["requiredCompletionProof"] = "operation-complete",
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module,
    operation,
    requiredCompletionProof: proof,
  });
}

function observationStep(
  stepId: string,
  operation: string,
  cycleId: string,
  role: D04DeviceRole,
  proof: ValidationRunnerStepDefinition["requiredCompletionProof"] = "operation-complete",
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "state-convergence-verifier",
    operation,
    requiredCompletionProof: proof,
    input: Object.freeze({ authorityCycleId: cycleId, deviceRole: role }),
  });
}

function productionCycle(
  prefix: string,
  cycleId: string,
  assertionId: string,
  expectation: PlanExpectationWithoutRun,
  role: D04DeviceRole,
): readonly ValidationRunnerStepDefinition[] {
  return Object.freeze([
    observationStep(prefix + "-capture", D04_OPERATIONS.captureProductionCycle, cycleId, role),
    previewStep(prefix + "-preview", cycleId),
    assertionStep(prefix + "-assert", cycleId, assertionId, expectation),
    observationStep(prefix + "-bind-run", D04_OPERATIONS.bindProductionRun, cycleId, role),
    executeStep(prefix + "-execute", cycleId),
  ]);
}

/**
 * D04 deliberately stops after the fixed H6B preview/assertion pair for a
 * delete-vs-modify plan. H6B conflict-resolution authority is intentionally
 * not invoked here: D04 proves the conflict is surfaced and that production
 * does not choose a destructive/newest-wins outcome without user authority.
 */
function conflictObservation(
  prefix: string,
  cycleId: string,
  assertionId: string,
  path: VaultPath,
  role: D04DeviceRole,
): readonly ValidationRunnerStepDefinition[] {
  return Object.freeze([
    observationStep(prefix + "-capture", D04_OPERATIONS.captureProductionCycle, cycleId, role),
    previewStep(prefix + "-preview", cycleId),
    assertionStep(prefix + "-assert", cycleId, assertionId, conflictExpectation(path)),
    observationStep(
      prefix + "-verify-presentation",
      D04_OPERATIONS.verifyConflictPresentation,
      cycleId,
      role,
      "verification-passed",
    ),
  ]);
}

export function createD04ScenarioDefinition(input: {
  readonly targetPath: VaultPath;
  readonly sentinelPath: VaultPath;
}): ValidationRunnerScenarioDefinition {
  if (input.targetPath === input.sentinelPath) {
    throw new Error("D04 target and sentinel paths must be distinct.");
  }

  const establishWindows = ordinaryExpectation([
    expectedOperation("upload-create", input.targetPath),
    expectedOperation("upload-create", input.sentinelPath),
  ]);
  const establishMobile = ordinaryExpectation([
    expectedOperation("noop", input.targetPath),
    expectedOperation("noop", input.sentinelPath),
  ]);
  const mobileModify = ordinaryExpectation([
    expectedOperation("upload-update", input.targetPath),
  ]);
  const restoreWindows = ordinaryExpectation([
    expectedOperation("download-update", input.targetPath),
  ]);
  const windowsModify = ordinaryExpectation([
    expectedOperation("upload-update", input.targetPath),
  ]);

  return Object.freeze({
    scenarioId: D04_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      moduleStep("d04-establish-windows-fixtures", "fixture-manager", D04_OPERATIONS.establishWindowsFixtures),
      ...productionCycle(
        "d04-establish-windows",
        D04_AUTHORITY_CYCLES.establishWindows,
        "d04:establish-windows",
        establishWindows,
        "windows",
      ),

      moduleStep("d04-handoff-baseline-to-mobile", "cross-device-coordinator", D04_OPERATIONS.handoffBaselineToMobile),
      moduleStep("d04-establish-mobile-fixtures", "fixture-manager", D04_OPERATIONS.establishMobileFixtures),
      ...productionCycle(
        "d04-establish-mobile",
        D04_AUTHORITY_CYCLES.establishMobile,
        "d04:establish-mobile-identical",
        establishMobile,
        "mobile",
      ),
      moduleStep(
        "d04-verify-trusted-baseline",
        "state-convergence-verifier",
        D04_OPERATIONS.verifyTrustedBaseline,
        "verification-passed",
      ),

      moduleStep("d04-delete-windows-target", "fixture-manager", D04_OPERATIONS.deleteWindowsTarget),
      moduleStep("d04-handoff-subcase-a-to-mobile", "cross-device-coordinator", D04_OPERATIONS.handoffSubcaseAToMobile),
      moduleStep("d04-edit-mobile-target", "fixture-manager", D04_OPERATIONS.editMobileTarget),
      ...productionCycle(
        "d04-subcase-a-mobile-modify",
        D04_AUTHORITY_CYCLES.subcaseAMobileModify,
        "d04:subcase-a-mobile-upload-update",
        mobileModify,
        "mobile",
      ),
      moduleStep("d04-handoff-subcase-a-to-windows", "cross-device-coordinator", D04_OPERATIONS.handoffSubcaseAToWindows),
      ...conflictObservation(
        "d04-subcase-a-windows-conflict",
        D04_AUTHORITY_CYCLES.subcaseAWindowsConflict,
        "d04:subcase-a-delete-vs-modify-conflict",
        input.targetPath,
        "windows",
      ),
      moduleStep(
        "d04-verify-subcase-a",
        "state-convergence-verifier",
        D04_OPERATIONS.verifySubcaseA,
        "verification-passed",
      ),

      moduleStep(
        "d04-restore-windows-baseline-bytes",
        "fixture-manager",
        D04_OPERATIONS.restoreWindowsBaselineBytes,
      ),
      ...productionCycle(
        "d04-restore-windows-base",
        D04_AUTHORITY_CYCLES.restoreWindowsBase,
        "d04:restore-windows-download-update",
        restoreWindows,
        "windows",
      ),
      moduleStep(
        "d04-verify-restored-base",
        "state-convergence-verifier",
        D04_OPERATIONS.verifyRestoredBase,
        "verification-passed",
      ),

      moduleStep("d04-handoff-subcase-b-to-mobile", "cross-device-coordinator", D04_OPERATIONS.handoffSubcaseBToMobile),
      moduleStep("d04-delete-mobile-target", "fixture-manager", D04_OPERATIONS.deleteMobileTarget),
      moduleStep("d04-handoff-subcase-b-to-windows", "cross-device-coordinator", D04_OPERATIONS.handoffSubcaseBToWindows),
      moduleStep("d04-edit-windows-target", "fixture-manager", D04_OPERATIONS.editWindowsTarget),
      ...productionCycle(
        "d04-subcase-b-windows-modify",
        D04_AUTHORITY_CYCLES.subcaseBWindowsModify,
        "d04:subcase-b-windows-upload-update",
        windowsModify,
        "windows",
      ),
      moduleStep(
        "d04-handoff-subcase-b-conflict-to-mobile",
        "cross-device-coordinator",
        D04_OPERATIONS.handoffSubcaseBConflictToMobile,
      ),
      ...conflictObservation(
        "d04-subcase-b-mobile-conflict",
        D04_AUTHORITY_CYCLES.subcaseBMobileConflict,
        "d04:subcase-b-delete-vs-modify-conflict",
        input.targetPath,
        "mobile",
      ),
      moduleStep(
        "d04-verify-subcase-b",
        "state-convergence-verifier",
        D04_OPERATIONS.verifySubcaseB,
        "verification-passed",
      ),
      moduleStep(
        "d04-record-evidence",
        "scenario-evidence-recorder",
        D04_OPERATIONS.recordEvidence,
        "evidence-recorded",
      ),
    ]),
  });
}

function assertFixture(
  run: ValidationRunIdentity,
  descriptor: ValidationFixtureDescriptor,
  expectedRelativePath: string,
  expectedPath: VaultPath,
): void {
  if (!sameRun(descriptor.identity.run, run)) {
    throw new Error("D04 fixture belongs to a different validation run.");
  }
  if (descriptor.relativePath !== expectedRelativePath || descriptor.path !== expectedPath) {
    throw new Error("D04 fixture path does not match the scenario-owned disposable path.");
  }
  if (descriptor.kind !== "text" || !descriptor.hash) {
    throw new Error("D04 requires deterministic text fixtures with exact content hashes.");
  }
}

function requireDescriptor(
  run: ValidationRunIdentity,
  descriptor: ValidationFixtureDescriptor | undefined,
  label: string,
): ValidationFixtureDescriptor {
  if (!descriptor || !descriptor.hash) throw new Error("D04 " + label + " fixture is unavailable.");
  if (!sameRun(descriptor.identity.run, run)) {
    throw new Error("D04 " + label + " fixture belongs to a different validation run.");
  }
  return descriptor;
}

function requireVerification(
  run: ValidationRunIdentity,
  report: ValidationStateConvergenceReport | undefined,
  label: string,
): ValidationStateConvergenceReport {
  if (!report) throw new Error("D04 " + label + " verification is unavailable.");
  if (!sameRun(report.result.run, run)) {
    throw new Error("D04 " + label + " verification belongs to a different validation run.");
  }
  return report;
}

function productionObservation(
  options: D04ScenarioPackageOptions,
  role: D04DeviceRole,
): D04ProductionObservationPort {
  return role === "windows" ? options.windowsProduction : options.mobileProduction;
}

function observationInput(input: unknown): { readonly cycleId: string; readonly role: D04DeviceRole } | undefined {
  if (!input || typeof input !== "object") return undefined;
  const value = input as { readonly authorityCycleId?: unknown; readonly deviceRole?: unknown };
  if (typeof value.authorityCycleId !== "string" || value.authorityCycleId.length === 0) return undefined;
  if (value.deviceRole !== "windows" && value.deviceRole !== "mobile") return undefined;
  return { cycleId: value.authorityCycleId, role: value.deviceRole };
}

function maxDiagnosticSequence(events: readonly DiagnosticEvent[]): number {
  return events.reduce((max, event) => Math.max(max, event.sequence), 0);
}

function captureProductionCycle(
  context: D04RunContext,
  options: D04ScenarioPackageOptions,
  run: ValidationRunIdentity,
  cycleId: string,
  role: D04DeviceRole,
): void {
  assertContextRun(context, run);
  if (context.cycleObservations.has(cycleId)) {
    throw new Error("D04 production cycle diagnostic checkpoint was already captured for this validation run: " + cycleId);
  }
  const checkpointSequence = maxDiagnosticSequence(productionObservation(options, role).diagnosticSnapshot());
  context.cycleObservations.set(cycleId, { run, role, checkpointSequence });
}

function expectedPreparedFields(plan: ProductSurfaceState["planPreview"]): Readonly<Record<string, string | number>> {
  if (!plan) throw new Error("D04 current production surface has no plan preview.");
  const count = (predicate: (kind: PlanOperationKind) => boolean) =>
    plan.operations.filter(operation => predicate(operation.kind)).length;
  return Object.freeze({
    trigger: plan.trigger,
    planDisposition: plan.executionDisposition,
    operationCount: plan.operations.length,
    conflictCount: count(kind => kind === "unresolved-conflict"),
    destructiveCount: plan.operations.filter(operation => operation.destructive).length,
    uploadCount: count(kind => kind.startsWith("upload-")),
    downloadCount: count(kind => kind.startsWith("download-")),
    noopCount: count(kind => kind === "noop"),
  });
}

function fieldsContain(
  actual: DiagnosticEvent["fields"],
  expected: Readonly<Record<string, string | number>>,
): boolean {
  if (!actual) return false;
  return Object.entries(expected).every(([key, value]) => actual[key as keyof typeof actual] === value);
}

function bindProductionRun(
  context: D04RunContext,
  options: D04ScenarioPackageOptions,
  run: ValidationRunIdentity,
  cycleId: string,
  role: D04DeviceRole,
): D04CycleObservation {
  assertContextRun(context, run);
  const cycle = context.cycleObservations.get(cycleId);
  if (!cycle || !sameRun(cycle.run, run) || cycle.role !== role) {
    throw new Error("D04 production cycle has no matching pre-preview diagnostic checkpoint: " + cycleId);
  }
  if (cycle.diagnosticRunId !== undefined) return cycle;

  const observation = productionObservation(options, role);
  const surface = observation.currentSurface();
  const plan = surface.planPreview;
  if (!plan) throw new Error("D04 cannot bind production run without the exact current production plan surface.");

  const afterCheckpoint = observation.diagnosticSnapshot().filter(
    event => event.sequence > cycle.checkpointSequence,
  );
  const starts = afterCheckpoint.filter(
    event =>
      event.component === "sync.controller"
      && event.event === "manual-sync-request-enter"
      && event.runId !== undefined
      && event.fields?.operation === "preview-manual"
      && event.fields?.trigger === "manual",
  );
  if (starts.length !== 1) {
    throw new Error(
      "D04 requires exactly one new manual production preview run after its diagnostic checkpoint; observed "
      + starts.length + ".",
    );
  }

  const diagnosticRunId = starts[0]!.runId!;
  const preparedFields = expectedPreparedFields(plan);
  const prepared = afterCheckpoint.filter(
    event =>
      event.component === "sync.controller"
      && event.event === "plan-preview-preparation-start"
      && event.runId === diagnosticRunId
      && event.fields?.stage === "preview-prepared"
      && fieldsContain(event.fields, preparedFields),
  );
  if (prepared.length !== 1) {
    throw new Error("D04 could not bind the current production plan to its exact diagnostic run.");
  }

  cycle.diagnosticRunId = diagnosticRunId;
  cycle.planId = String(plan.planId);
  return cycle;
}

function exactFixtureContent(
  version: Extract<ConflictAssessment, { readonly kind: "delete-vs-modify" }>["modifiedVersion"]["version"],
  fixture: ValidationFixtureDescriptor,
): boolean {
  return version.path === fixture.path
    && version.entityKind === "file"
    && version.content?.hash === fixture.hash
    && version.content?.sizeBytes === fixture.sizeBytes;
}

function observeDeleteVsModifyConflict(
  context: D04RunContext,
  options: D04ScenarioPackageOptions,
  run: ValidationRunIdentity,
  cycleId: string,
  role: D04DeviceRole,
  expectedModified: ValidationFixtureDescriptor,
  expectedBase: ValidationFixtureDescriptor,
): D04ConflictObservation {
  assertContextRun(context, run);
  assertFixture(run, expectedModified, D04_TARGET_RELATIVE_PATH, options.targetPath);
  assertFixture(run, expectedBase, D04_TARGET_RELATIVE_PATH, options.targetPath);
  const cycle = bindProductionRun(context, options, run, cycleId, role);
  const observation = productionObservation(options, role);
  const surface = observation.currentSurface();
  const pathConflicts = surface.conflicts.filter(conflict => conflict.kind !== "none" && "path" in conflict && conflict.path === options.targetPath);
  const matches = pathConflicts.filter(
    (conflict): conflict is Extract<ConflictAssessment, { readonly kind: "delete-vs-modify" }> =>
      conflict.kind === "delete-vs-modify",
  );
  if (pathConflicts.length !== 1 || matches.length !== 1) {
    throw new Error("D04 production surface must present exactly one delete-vs-modify conflict at the target path.");
  }

  const conflict = matches[0]!;
  if (conflict.modifiedSide !== "remote") {
    throw new Error("D04 deleting-side preview must identify the surviving independent modification as remote.");
  }
  if (conflict.modifiedVersion.source !== "remote" || !exactFixtureContent(conflict.modifiedVersion.version, expectedModified)) {
    throw new Error("D04 conflict presentation does not identify the exact surviving independent modification.");
  }

  const versionRemoteId = conflict.modifiedVersion.version.remoteObjectId;
  const provenanceRemoteId = conflict.modifiedVersion.remoteObjectId;
  const remoteObjectId = versionRemoteId ?? provenanceRemoteId;
  if (!remoteObjectId) {
    throw new Error("D04 conflict presentation does not preserve the surviving remote object identity.");
  }
  if (versionRemoteId && provenanceRemoteId && versionRemoteId !== provenanceRemoteId) {
    throw new Error("D04 conflict presentation contains contradictory surviving remote identities.");
  }

  if (conflict.base) {
    if (conflict.base.source !== "base" || !exactFixtureContent(conflict.base.version, expectedBase)) {
      throw new Error("D04 conflict BASE provenance does not match the exact trusted pre-conflict BASE.");
    }
    const baseRemoteId = conflict.base.version.remoteObjectId ?? conflict.base.remoteObjectId;
    if (baseRemoteId && baseRemoteId !== remoteObjectId) {
      throw new Error("D04 conflict BASE provenance points to a different remote identity.");
    }
  }

  return Object.freeze({
    run,
    conflictId: String(conflict.conflictId),
    remoteObjectId,
    diagnosticRunId: cycle.diagnosticRunId!,
  });
}

function terminalDiagnostic(
  context: D04RunContext,
  options: D04ScenarioPackageOptions,
  run: ValidationRunIdentity,
  cycleId: string,
): ValidationDiagnosticExpectation {
  assertContextRun(context, run);
  const cycle = context.cycleObservations.get(cycleId);
  if (!cycle || !sameRun(cycle.run, run) || cycle.diagnosticRunId === undefined) {
    throw new Error("D04 has no exact diagnostic run binding for production cycle: " + cycleId);
  }
  const events = productionObservation(options, cycle.role).diagnosticSnapshot();
  const terminal = events.filter(
    event =>
      event.sequence > cycle.checkpointSequence
      && event.runId === cycle.diagnosticRunId
      && event.component === "sync.controller"
      && event.fields?.stage === "terminal"
      && (
        event.event === "sync-run-complete"
        || event.event === "sync-run-failed"
        || event.event === "sync-run-cancelled"
      ),
  );
  if (terminal.length !== 1) {
    throw new Error("D04 requires exactly one run-correlated terminal diagnostic for cycle: " + cycleId);
  }
  const event = terminal[0]!;
  if (event.event !== "sync-run-complete" || event.fields?.result !== "complete") {
    throw new Error(
      "D04 production execution did not complete successfully for cycle "
      + cycleId + ": " + event.event + "/" + String(event.fields?.result),
    );
  }
  const deviceId = cycle.role === "windows" ? options.windowsDevice.deviceId : options.mobileDevice.deviceId;
  return Object.freeze({
    deviceId,
    component: "sync.controller",
    event: "sync-run-complete",
    diagnosticRunId: cycle.diagnosticRunId,
    expectedFields: Object.freeze({ stage: "terminal", result: "complete" }),
  });
}

function protectedSentinel(
  options: D04ScenarioPackageOptions,
  sentinel: ValidationFixtureDescriptor,
) {
  const content = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  return {
    local: Object.freeze([
      { deviceId: options.windowsDevice.deviceId, path: sentinel.path, state: "file" as const, content },
      { deviceId: options.mobileDevice.deviceId, path: sentinel.path, state: "file" as const, content },
    ]),
    remote: Object.freeze([
      { path: sentinel.path, state: "live" as const, content },
    ]),
  };
}

function baselineVerificationRequest(
  run: ValidationRunIdentity,
  options: D04ScenarioPackageOptions,
  baseline: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  windowsTerminal: ValidationDiagnosticExpectation,
  mobileTerminal: ValidationDiagnosticExpectation,
): ValidationStateConvergenceRequest {
  const targetContent = { hash: baseline.hash!, sizeBytes: baseline.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  const protectedPaths = protectedSentinel(options, sentinel);
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d04.baseline.windows.target", "local-content", String(baseline.path), "Windows holds the common trusted BASE bytes."), deviceId: options.windowsDevice.deviceId, path: baseline.path, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("d04.baseline.mobile.target", "local-content", String(baseline.path), "Mobile holds the common trusted BASE bytes."), deviceId: options.mobileDevice.deviceId, path: baseline.path, content: targetContent },
      { kind: "remote-content", assertion: stateAssertion("d04.baseline.remote.target", "remote-content", String(baseline.path), "Remote holds the common trusted BASE bytes."), path: baseline.path, content: targetContent },
      { kind: "base-authority", assertion: stateAssertion("d04.baseline.windows.base", "base-authority", String(baseline.path), "Windows authoritative BASE equals the common fixture."), deviceId: options.windowsDevice.deviceId, path: baseline.path, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("d04.baseline.mobile.base", "base-authority", String(baseline.path), "Mobile authoritative BASE equals the common fixture."), deviceId: options.mobileDevice.deviceId, path: baseline.path, expectedContent: targetContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d04.baseline.windows.mapping", "mapping-or-tombstone", String(baseline.path), "Windows has a live mapping and no deletion tombstone."), deviceId: options.windowsDevice.deviceId, path: baseline.path, expected: "mapping", entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d04.baseline.mobile.mapping", "mapping-or-tombstone", String(baseline.path), "Mobile has a live mapping and no deletion tombstone."), deviceId: options.mobileDevice.deviceId, path: baseline.path, expected: "mapping", entityKind: "file" },
      { kind: "terminal-product-result", assertion: stateAssertion("d04.baseline.windows-terminal", "terminal-product-result", "Windows BASE establishment", "Windows BASE establishment reaches exact run-correlated sync-run-complete."), diagnostic: windowsTerminal },
      { kind: "terminal-product-result", assertion: stateAssertion("d04.baseline.mobile-terminal", "terminal-product-result", "Mobile BASE establishment", "Mobile BASE establishment reaches exact run-correlated sync-run-complete."), diagnostic: mobileTerminal },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d04.baseline.sentinel", "unrelated-mutation-absence", String(sentinel.path), "Sentinel is unchanged on both devices and remote."), local: protectedPaths.local, remote: protectedPaths.remote },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d04.baseline.content", "cross-device-content", String(baseline.path), "Both participants hold the same common BASE bytes."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: baseline.path, content: targetContent },
      { kind: "cross-device-content", assertion: convergenceAssertion("d04.baseline.sentinel-content", "cross-device-content", String(sentinel.path), "Sentinel bytes are equal across participants."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: sentinel.path, content: sentinelContent },
    ],
  };
}

function subcaseAVerificationRequest(
  run: ValidationRunIdentity,
  options: D04ScenarioPackageOptions,
  baseline: ValidationFixtureDescriptor,
  modified: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  remoteObjectId: RemoteObjectId,
  terminal: ValidationDiagnosticExpectation,
): ValidationStateConvergenceRequest {
  const baselineContent = { hash: baseline.hash!, sizeBytes: baseline.sizeBytes };
  const modifiedContent = { hash: modified.hash!, sizeBytes: modified.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  const protectedPaths = protectedSentinel(options, sentinel);
  const localProtected = Object.freeze([
    ...protectedPaths.local,
    { deviceId: options.windowsDevice.deviceId, path: modified.path, state: "absent" as const },
  ]);
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d04.a.mobile.modified", "local-content", String(modified.path), "Mobile retains the independent modification after publishing it."), deviceId: options.mobileDevice.deviceId, path: modified.path, content: modifiedContent },
      { kind: "remote-content", assertion: stateAssertion("d04.a.remote.modified", "remote-content", String(modified.path), "Remote retains the independently modified bytes after Windows deletion conflict is surfaced."), path: modified.path, content: modifiedContent, remoteObjectId },
      { kind: "live-trash-absence-state", assertion: stateAssertion("d04.a.remote.live", "live-trash-absence-state", String(modified.path), "Deletion conflict must not trash the modified remote object."), path: modified.path, expectedState: "live", remoteObjectId },
      { kind: "base-authority", assertion: stateAssertion("d04.a.windows.base-preserved", "base-authority", String(baseline.path), "Windows BASE remains the pre-conflict BASE; conflict observation cannot guess a winner."), deviceId: options.windowsDevice.deviceId, path: baseline.path, expectedContent: baselineContent },
      { kind: "base-authority", assertion: stateAssertion("d04.a.mobile.base-modified", "base-authority", String(modified.path), "Mobile BASE records its verified modification."), deviceId: options.mobileDevice.deviceId, path: modified.path, expectedContent: modifiedContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d04.a.windows.no-tombstone", "mapping-or-tombstone", String(baseline.path), "Windows deletion remains unpropagated and does not become a tombstone after conflict observation."), deviceId: options.windowsDevice.deviceId, path: baseline.path, expected: "mapping", entityKind: "file" },
      { kind: "terminal-product-result", assertion: stateAssertion("d04.a.mobile-terminal", "terminal-product-result", "Mobile independent modification", "Mobile upload-update reaches exact run-correlated sync-run-complete."), diagnostic: terminal },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d04.a.protected-state", "unrelated-mutation-absence", D04_SCENARIO_ID, "Windows target remains locally absent after conflict observation while the sentinel stays untouched; the modified copy remains live on mobile and remote."), local: localProtected, remote: protectedPaths.remote },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d04.a.sentinel-content", "cross-device-content", String(sentinel.path), "Subcase A leaves sentinel bytes converged."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: sentinel.path, content: sentinelContent },
    ],
  };
}

function restoredBaseVerificationRequest(
  run: ValidationRunIdentity,
  options: D04ScenarioPackageOptions,
  modified: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  terminal: ValidationDiagnosticExpectation,
): ValidationStateConvergenceRequest {
  const content = { hash: modified.hash!, sizeBytes: modified.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  const protectedPaths = protectedSentinel(options, sentinel);
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d04.restore.windows.target", "local-content", String(modified.path), "Windows re-downloads the surviving modification through production download-update."), deviceId: options.windowsDevice.deviceId, path: modified.path, content },
      { kind: "local-content", assertion: stateAssertion("d04.restore.mobile.target", "local-content", String(modified.path), "Mobile retains the same surviving modification."), deviceId: options.mobileDevice.deviceId, path: modified.path, content },
      { kind: "remote-content", assertion: stateAssertion("d04.restore.remote.target", "remote-content", String(modified.path), "Remote remains on the surviving modification."), path: modified.path, content },
      { kind: "base-authority", assertion: stateAssertion("d04.restore.windows.base", "base-authority", String(modified.path), "Windows BASE advances through normal production download-update."), deviceId: options.windowsDevice.deviceId, path: modified.path, expectedContent: content },
      { kind: "base-authority", assertion: stateAssertion("d04.restore.mobile.base", "base-authority", String(modified.path), "Mobile BASE remains the same verified modified version."), deviceId: options.mobileDevice.deviceId, path: modified.path, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d04.restore.windows.mapping", "mapping-or-tombstone", String(modified.path), "Windows returns to a live mapping with no tombstone."), deviceId: options.windowsDevice.deviceId, path: modified.path, expected: "mapping", entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d04.restore.mobile.mapping", "mapping-or-tombstone", String(modified.path), "Mobile retains a live mapping with no tombstone."), deviceId: options.mobileDevice.deviceId, path: modified.path, expected: "mapping", entityKind: "file" },
      { kind: "terminal-product-result", assertion: stateAssertion("d04.restore.windows-terminal", "terminal-product-result", "Windows BASE restoration", "Windows download-update reaches exact run-correlated sync-run-complete."), diagnostic: terminal },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d04.restore.sentinel", "unrelated-mutation-absence", String(sentinel.path), "BASE restoration leaves the sentinel untouched."), local: protectedPaths.local, remote: protectedPaths.remote },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d04.restore.content", "cross-device-content", String(modified.path), "The production re-download re-establishes one clean common BASE."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: modified.path, content },
      { kind: "cross-device-content", assertion: convergenceAssertion("d04.restore.sentinel-content", "cross-device-content", String(sentinel.path), "Sentinel remains converged across clean BASE restoration."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: sentinel.path, content: sentinelContent },
    ],
  };
}

function subcaseBVerificationRequest(
  run: ValidationRunIdentity,
  options: D04ScenarioPackageOptions,
  priorBase: ValidationFixtureDescriptor,
  modified: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  remoteObjectId: RemoteObjectId,
  terminal: ValidationDiagnosticExpectation,
): ValidationStateConvergenceRequest {
  const priorContent = { hash: priorBase.hash!, sizeBytes: priorBase.sizeBytes };
  const modifiedContent = { hash: modified.hash!, sizeBytes: modified.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  const protectedPaths = protectedSentinel(options, sentinel);
  const localProtected = Object.freeze([
    ...protectedPaths.local,
    { deviceId: options.mobileDevice.deviceId, path: modified.path, state: "absent" as const },
  ]);
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d04.b.windows.modified", "local-content", String(modified.path), "Windows retains the independent modification after publishing it."), deviceId: options.windowsDevice.deviceId, path: modified.path, content: modifiedContent },
      { kind: "remote-content", assertion: stateAssertion("d04.b.remote.modified", "remote-content", String(modified.path), "Remote retains the independently modified bytes after mobile deletion conflict is surfaced."), path: modified.path, content: modifiedContent, remoteObjectId },
      { kind: "live-trash-absence-state", assertion: stateAssertion("d04.b.remote.live", "live-trash-absence-state", String(modified.path), "Mobile deletion conflict must not trash the independently modified remote object."), path: modified.path, expectedState: "live", remoteObjectId },
      { kind: "base-authority", assertion: stateAssertion("d04.b.windows.base-modified", "base-authority", String(modified.path), "Windows BASE records its verified modification."), deviceId: options.windowsDevice.deviceId, path: modified.path, expectedContent: modifiedContent },
      { kind: "base-authority", assertion: stateAssertion("d04.b.mobile.base-preserved", "base-authority", String(priorBase.path), "Mobile BASE remains the restored common BASE after conflict observation; no newest-wins guess is committed."), deviceId: options.mobileDevice.deviceId, path: priorBase.path, expectedContent: priorContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d04.b.mobile.no-tombstone", "mapping-or-tombstone", String(priorBase.path), "Mobile local deletion remains unpropagated and does not become a tombstone after conflict observation."), deviceId: options.mobileDevice.deviceId, path: priorBase.path, expected: "mapping", entityKind: "file" },
      { kind: "terminal-product-result", assertion: stateAssertion("d04.b.windows-terminal", "terminal-product-result", "Windows independent modification", "Windows upload-update reaches exact run-correlated sync-run-complete."), diagnostic: terminal },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d04.b.protected-state", "unrelated-mutation-absence", D04_SCENARIO_ID, "Mobile target is still locally absent while the sentinel remains untouched; surviving modified bytes remain live on Windows and remote."), local: localProtected, remote: protectedPaths.remote },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d04.b.sentinel-content", "cross-device-content", String(sentinel.path), "Subcase B leaves sentinel bytes converged."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: sentinel.path, content: sentinelContent },
    ],
  };
}

function verificationResult(
  report: ValidationStateConvergenceReport,
  phase: string,
) {
  const refs = Object.freeze(report.evidence.map(item => item.ref));
  if (report.result.verdict === "pass") return completed(refs);
  const summary = "D04 " + phase + " verification " + report.result.verdict + ".";
  return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
}

function assertPackageOptions(options: D04ScenarioPackageOptions): void {
  if (options.windowsDevice.platform !== "windows-desktop") {
    throw new Error("D04 Windows participant must be Windows desktop.");
  }
  if (options.mobileDevice.platform !== "iphone" && options.mobileDevice.platform !== "ipad") {
    throw new Error("D04 mobile participant must be iPhone or iPad.");
  }
  if (options.windowsDevice.deviceId === options.mobileDevice.deviceId) {
    throw new Error("D04 participants must have distinct device identities.");
  }
  if (options.targetPath === options.sentinelPath) {
    throw new Error("D04 target and sentinel paths must be distinct.");
  }
}

export function createD04DeleteVsIndependentModifyScenario(
  options: D04ScenarioPackageOptions,
): D04ScenarioPackage {
  assertPackageOptions(options);
  const contexts = new Map<string, D04RunContext>();

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = Object.freeze({
    async execute(request) {
      try {
        if (request.operation === D04_OPERATIONS.establishWindowsFixtures) {
          const context = establishRunContext(contexts, request.run);
          const target = await options.windowsFixtures.create(
            validationTextFixture(D04_TARGET_FIXTURE_ID, D04_TARGET_RELATIVE_PATH, 1, "base", "conflict"),
          );
          const sentinel = await options.windowsFixtures.create(
            validationTextFixture(D04_SENTINEL_FIXTURE_ID, D04_SENTINEL_RELATIVE_PATH, 1, "base", "ordinary"),
          );
          assertFixture(request.run, target, D04_TARGET_RELATIVE_PATH, options.targetPath);
          assertFixture(request.run, sentinel, D04_SENTINEL_RELATIVE_PATH, options.sentinelPath);
          if (await options.windowsFixtures.hash(D04_TARGET_FIXTURE_ID) !== target.hash) {
            return failed("D04 Windows target setup hash verification failed.");
          }
          if (await options.windowsFixtures.hash(D04_SENTINEL_FIXTURE_ID) !== sentinel.hash) {
            return failed("D04 Windows sentinel setup hash verification failed.");
          }
          context.baseline = target;
          context.windowsTarget = target;
          context.sentinel = sentinel;
          return completed();
        }

        const context = requireRunContext(contexts, request.run);

        if (request.operation === D04_OPERATIONS.establishMobileFixtures) {
          const baseline = requireDescriptor(request.run, context.baseline, "baseline");
          const sentinel = requireDescriptor(request.run, context.sentinel, "sentinel");
          const target = await options.mobileFixtures.create(
            validationTextFixture(D04_TARGET_FIXTURE_ID, D04_TARGET_RELATIVE_PATH, 1, "base", "conflict"),
          );
          const mobileSentinel = await options.mobileFixtures.create(
            validationTextFixture(D04_SENTINEL_FIXTURE_ID, D04_SENTINEL_RELATIVE_PATH, 1, "base", "ordinary"),
          );
          assertFixture(request.run, target, D04_TARGET_RELATIVE_PATH, options.targetPath);
          assertFixture(request.run, mobileSentinel, D04_SENTINEL_RELATIVE_PATH, options.sentinelPath);
          if (target.hash !== baseline.hash || target.sizeBytes !== baseline.sizeBytes) {
            return failed("D04 mobile target does not reproduce the exact Windows common BASE bytes.");
          }
          if (mobileSentinel.hash !== sentinel.hash || mobileSentinel.sizeBytes !== sentinel.sizeBytes) {
            return failed("D04 mobile sentinel does not reproduce the exact Windows sentinel bytes.");
          }
          if (await options.mobileFixtures.hash(D04_TARGET_FIXTURE_ID) !== target.hash) {
            return failed("D04 mobile target setup hash verification failed.");
          }
          context.mobileTarget = target;
          return completed();
        }

        if (request.operation === D04_OPERATIONS.deleteWindowsTarget) {
          const baseline = requireDescriptor(request.run, context.baseline, "baseline");
          const deleted = await options.windowsFixtures.delete(D04_TARGET_FIXTURE_ID);
          assertFixture(request.run, deleted, D04_TARGET_RELATIVE_PATH, options.targetPath);
          if (deleted.hash !== baseline.hash || deleted.path !== baseline.path) {
            return failed("D04 Windows deletion did not originate from the common trusted BASE fixture.");
          }
          context.windowsTarget = undefined;
          return completed();
        }

        if (request.operation === D04_OPERATIONS.editMobileTarget) {
          const baseline = requireDescriptor(request.run, context.baseline, "baseline");
          const edited = await options.mobileFixtures.edit(D04_TARGET_FIXTURE_ID, 2, "non-overlap-a");
          assertFixture(request.run, edited, D04_TARGET_RELATIVE_PATH, options.targetPath);
          if (edited.hash === baseline.hash || edited.version !== 2) {
            return failed("D04 mobile independent modification did not create a distinct version.");
          }
          if (await options.mobileFixtures.hash(D04_TARGET_FIXTURE_ID) !== edited.hash) {
            return failed("D04 mobile independent modification hash verification failed.");
          }
          context.mobileTarget = edited;
          context.subcaseAModified = edited;
          return completed();
        }

        if (request.operation === D04_OPERATIONS.restoreWindowsBaselineBytes) {
          const baseline = requireDescriptor(request.run, context.baseline, "baseline");
          const restored = await options.windowsFixtures.restoreVersion(D04_TARGET_FIXTURE_ID, 1, "base");
          assertFixture(request.run, restored, D04_TARGET_RELATIVE_PATH, options.targetPath);
          if (restored.hash !== baseline.hash || restored.sizeBytes !== baseline.sizeBytes) {
            return failed("D04 Windows local restoration did not recreate the pre-conflict BASE bytes.");
          }
          if (await options.windowsFixtures.hash(D04_TARGET_FIXTURE_ID) !== restored.hash) {
            return failed("D04 Windows pre-rebase restoration hash verification failed.");
          }
          context.windowsTarget = restored;
          return completed();
        }

        if (request.operation === D04_OPERATIONS.deleteMobileTarget) {
          const priorBase = requireDescriptor(request.run, context.subcaseAModified, "restored-base");
          const deleted = await options.mobileFixtures.delete(D04_TARGET_FIXTURE_ID);
          assertFixture(request.run, deleted, D04_TARGET_RELATIVE_PATH, options.targetPath);
          if (deleted.hash !== priorBase.hash || deleted.path !== priorBase.path) {
            return failed("D04 mobile deletion did not originate from the restored common BASE fixture.");
          }
          context.mobileTarget = undefined;
          return completed();
        }

        if (request.operation === D04_OPERATIONS.editWindowsTarget) {
          const priorBase = requireDescriptor(request.run, context.subcaseAModified, "restored-base");
          const edited = await options.windowsFixtures.edit(D04_TARGET_FIXTURE_ID, 3, "non-overlap-b");
          assertFixture(request.run, edited, D04_TARGET_RELATIVE_PATH, options.targetPath);
          if (edited.hash === priorBase.hash || edited.version !== 3) {
            return failed("D04 Windows independent modification did not create a distinct version.");
          }
          if (await options.windowsFixtures.hash(D04_TARGET_FIXTURE_ID) !== edited.hash) {
            return failed("D04 Windows independent modification hash verification failed.");
          }
          context.windowsTarget = edited;
          context.subcaseBModified = edited;
          return completed();
        }

        return blocked("Unsupported D04 fixture operation: " + request.operation);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D04 fixture operation failed.");
      }
    },
  });

  const handoffByOperation: Readonly<Record<string, {
    readonly phase: D04HandoffPhase;
    readonly from: "windows" | "mobile";
    readonly to: "windows" | "mobile";
  }>> = Object.freeze({
    [D04_OPERATIONS.handoffBaselineToMobile]: { phase: "baseline-to-mobile", from: "windows", to: "mobile" },
    [D04_OPERATIONS.handoffSubcaseAToMobile]: { phase: "subcase-a-delete-to-mobile", from: "windows", to: "mobile" },
    [D04_OPERATIONS.handoffSubcaseAToWindows]: { phase: "subcase-a-modification-to-windows", from: "mobile", to: "windows" },
    [D04_OPERATIONS.handoffSubcaseBToMobile]: { phase: "subcase-b-restored-base-to-mobile", from: "windows", to: "mobile" },
    [D04_OPERATIONS.handoffSubcaseBToWindows]: { phase: "subcase-b-delete-to-windows", from: "mobile", to: "windows" },
    [D04_OPERATIONS.handoffSubcaseBConflictToMobile]: { phase: "subcase-b-modification-to-mobile", from: "windows", to: "mobile" },
  });

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = Object.freeze({
    async execute(request) {
      const route = handoffByOperation[request.operation];
      if (!route) return blocked("Unsupported D04 handoff operation: " + request.operation);
      try {
        requireRunContext(contexts, request.run);
        const refs = await options.handoffs.handoff({
          run: request.run,
          stepId: request.stepId,
          phase: route.phase,
          from: route.from,
          to: route.to,
        });
        return completed(refs);
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "D04 cross-device handoff failed.");
      }
    },
  });

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = Object.freeze({
    async execute(request) {
      try {
        const context = requireRunContext(contexts, request.run);
        if (
          request.operation === D04_OPERATIONS.captureProductionCycle
          || request.operation === D04_OPERATIONS.bindProductionRun
          || request.operation === D04_OPERATIONS.verifyConflictPresentation
        ) {
          const input = observationInput(request.input);
          if (!input) return blocked("D04 production observation input is malformed.");

          if (request.operation === D04_OPERATIONS.captureProductionCycle) {
            captureProductionCycle(context, options, request.run, input.cycleId, input.role);
            return completed();
          }

          if (request.operation === D04_OPERATIONS.bindProductionRun) {
            bindProductionRun(context, options, request.run, input.cycleId, input.role);
            return completed();
          }

          if (input.cycleId === D04_AUTHORITY_CYCLES.subcaseAWindowsConflict) {
            const baseline = requireDescriptor(request.run, context.baseline, "baseline");
            const modified = requireDescriptor(request.run, context.subcaseAModified, "subcase-a-modified");
            context.subcaseAConflict = observeDeleteVsModifyConflict(
              context,
              options,
              request.run,
              input.cycleId,
              input.role,
              modified,
              baseline,
            );
            return completed();
          }
          if (input.cycleId === D04_AUTHORITY_CYCLES.subcaseBMobileConflict) {
            const priorBase = requireDescriptor(request.run, context.subcaseAModified, "restored-base");
            const modified = requireDescriptor(request.run, context.subcaseBModified, "subcase-b-modified");
            context.subcaseBConflict = observeDeleteVsModifyConflict(
              context,
              options,
              request.run,
              input.cycleId,
              input.role,
              modified,
              priorBase,
            );
            return completed();
          }
          return blocked("D04 conflict-presentation verification was requested for a non-conflict cycle.");
        }

        const baseline = requireDescriptor(request.run, context.baseline, "baseline");
        const sentinel = requireDescriptor(request.run, context.sentinel, "sentinel");
        let verificationRequest: ValidationStateConvergenceRequest | undefined;
        const phase = request.operation;

        if (request.operation === D04_OPERATIONS.verifyTrustedBaseline) {
          verificationRequest = baselineVerificationRequest(
            request.run,
            options,
            baseline,
            sentinel,
            terminalDiagnostic(context, options, request.run, D04_AUTHORITY_CYCLES.establishWindows),
            terminalDiagnostic(context, options, request.run, D04_AUTHORITY_CYCLES.establishMobile),
          );
        } else if (request.operation === D04_OPERATIONS.verifySubcaseA) {
          const modified = requireDescriptor(request.run, context.subcaseAModified, "subcase-a-modified");
          const conflict = context.subcaseAConflict;
          if (!conflict || !sameRun(conflict.run, request.run)) {
            throw new Error("D04 subcase A conflict presentation has not been objectively verified for the current validation run.");
          }
          verificationRequest = subcaseAVerificationRequest(
            request.run,
            options,
            baseline,
            modified,
            sentinel,
            conflict.remoteObjectId,
            terminalDiagnostic(context, options, request.run, D04_AUTHORITY_CYCLES.subcaseAMobileModify),
          );
        } else if (request.operation === D04_OPERATIONS.verifyRestoredBase) {
          const modified = requireDescriptor(request.run, context.subcaseAModified, "restored-base");
          verificationRequest = restoredBaseVerificationRequest(
            request.run,
            options,
            modified,
            sentinel,
            terminalDiagnostic(context, options, request.run, D04_AUTHORITY_CYCLES.restoreWindowsBase),
          );
        } else if (request.operation === D04_OPERATIONS.verifySubcaseB) {
          const priorBase = requireDescriptor(request.run, context.subcaseAModified, "restored-base");
          const modified = requireDescriptor(request.run, context.subcaseBModified, "subcase-b-modified");
          const conflict = context.subcaseBConflict;
          if (!conflict || !sameRun(conflict.run, request.run)) {
            throw new Error("D04 subcase B conflict presentation has not been objectively verified for the current validation run.");
          }
          verificationRequest = subcaseBVerificationRequest(
            request.run,
            options,
            priorBase,
            modified,
            sentinel,
            conflict.remoteObjectId,
            terminalDiagnostic(context, options, request.run, D04_AUTHORITY_CYCLES.subcaseBWindowsModify),
          );
        }

        if (!verificationRequest) return blocked("Unsupported D04 verifier operation: " + request.operation);
        const report = await options.verifier.verify(verificationRequest);
        if (!sameRun(report.result.run, request.run)) {
          return failed("D04 verifier returned a report for a different validation run.");
        }
        if (request.operation === D04_OPERATIONS.verifyTrustedBaseline) context.baselineVerification = report;
        else if (request.operation === D04_OPERATIONS.verifySubcaseA) context.subcaseAVerification = report;
        else if (request.operation === D04_OPERATIONS.verifyRestoredBase) context.restoredBaseVerification = report;
        else context.subcaseBVerification = report;
        return verificationResult(report, phase);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D04 verification failed.");
      }
    },
  });

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = Object.freeze({
    async execute(request) {
      if (request.operation !== D04_OPERATIONS.recordEvidence) {
        return blocked("Unsupported D04 evidence operation: " + request.operation);
      }
      try {
        const context = requireRunContext(contexts, request.run);
        const baseline = requireDescriptor(request.run, context.baseline, "baseline");
        const subcaseAModified = requireDescriptor(request.run, context.subcaseAModified, "subcase-a-modified");
        const subcaseBModified = requireDescriptor(request.run, context.subcaseBModified, "subcase-b-modified");
        const sentinel = requireDescriptor(request.run, context.sentinel, "sentinel");
        const baselineVerification = requireVerification(request.run, context.baselineVerification, "baseline");
        const subcaseAVerification = requireVerification(request.run, context.subcaseAVerification, "subcase-a");
        const restoredBaseVerification = requireVerification(request.run, context.restoredBaseVerification, "restored-base");
        const subcaseBVerification = requireVerification(request.run, context.subcaseBVerification, "subcase-b");
        if (
          !context.subcaseAConflict || !sameRun(context.subcaseAConflict.run, request.run)
          || !context.subcaseBConflict || !sameRun(context.subcaseBConflict.run, request.run)
        ) {
          return blocked("D04 evidence cannot be recorded without current-run conflict observations for both subcases.");
        }
        const refs = await options.evidence.record({
          run: request.run,
          baseline,
          subcaseAModified,
          subcaseBModified,
          sentinel,
          baselineVerification,
          subcaseAVerification,
          restoredBaseVerification,
          subcaseBVerification,
        });
        if (refs.length === 0) return blocked("D04 evidence recorder returned no durable evidence reference.");
        return completed(refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D04 evidence recording failed.");
      }
    },
  });

  const prerequisites: ValidationRunnerPrerequisiteDelegate = Object.freeze({
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "D04 reconstructs its trusted disposable BASE internally and accepts no external scenario prerequisite.",
        evidenceRefs: Object.freeze([]),
      }));
    },
  });

  const moduleOverrides: ValidationModeModuleOverrides = Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": handoffDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });

  return Object.freeze({
    definition: createD04ScenarioDefinition({
      targetPath: options.targetPath,
      sentinelPath: options.sentinelPath,
    }),
    prerequisites,
    moduleOverrides,
  });
}
