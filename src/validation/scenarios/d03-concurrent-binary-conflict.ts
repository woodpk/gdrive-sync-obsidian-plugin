import {
  PLAN_OPERATION_KINDS,
  type ConflictAssessment,
  type PlanOperationKind,
  type ProductSurfaceState,
  type VaultPath,
} from "../../contracts";
import type { DiagnosticLogger } from "../../diagnostics/diagnostic-logger";
import {
  validationAssertionId,
  type ValidationConvergenceAssertion,
  type ValidationEvidenceRef,
  type ValidationExpectedPlanOperation,
  type ValidationPlanExpectation,
  type ValidationStateAssertion,
} from "../driver-plan-fault-verifier-contracts";
import {
  validationOpaqueBinaryFixture,
  type ValidationFixtureDescriptor,
  type ValidationFixtureManager,
} from "../fixture-manager";
import type { ValidationProductionRuntimePort } from "../production-path-driver";
import {
  validationStepId,
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type { ValidationRunnerScenarioDefinition } from "../scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "../scenario-runner-module-adapter";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const D03_SCENARIO_ID = "D03" as const;
export const D03_LIVE_PACKAGE = "D03-binary-conflict.md" as const;

export const D03_TARGET_FIXTURE_ID = "d03-binary-target" as const;
export const D03_TARGET_RELATIVE_PATH = "d03-binary-conflict.bin" as const;
export const D03_SAFE_FIXTURE_ID = "d03-unrelated-safe" as const;
export const D03_SAFE_RELATIVE_PATH = "d03-unrelated-safe.bin" as const;

export const D03_TARGET_SIZE_BYTES = 4096 as const;
export const D03_SAFE_SIZE_BYTES = 2048 as const;
export const D03_BASE_VERSION = 1 as const;
export const D03_WINDOWS_TARGET_VERSION = 2 as const;
export const D03_MOBILE_TARGET_VERSION = 3 as const;
export const D03_WINDOWS_SAFE_VERSION = 2 as const;

export const D03_AUTHORITY_CYCLES = Object.freeze({
  establishWindows: "d03-establish-windows",
  establishMobile: "d03-establish-mobile",
  windowsPublish: "d03-windows-publish",
  mobileConflict: "d03-mobile-conflict",
});

export const D03_OPERATIONS = Object.freeze({
  establishFixtures: "d03-establish-trusted-fixtures",
  captureEstablishWindowsDiagnosticRun: "d03-capture-establish-windows-diagnostic-run",
  verifyEstablishWindowsTerminal: "d03-verify-establish-windows-terminal",
  handoffBaselineToMobile: "d03-handoff-baseline-to-mobile",
  captureEstablishMobileDiagnosticRun: "d03-capture-establish-mobile-diagnostic-run",
  verifyEstablishMobileTerminal: "d03-verify-establish-mobile-terminal",
  verifyTrustedBaseline: "d03-verify-trusted-baseline",
  editWindowsVariants: "d03-edit-windows-variants",
  prepareMobileVariant: "d03-prepare-mobile-variant",
  captureWindowsPublishDiagnosticRun: "d03-capture-windows-publish-diagnostic-run",
  verifyWindowsPublishTerminal: "d03-verify-windows-publish-terminal",
  handoffWindowsUpdatesToMobile: "d03-handoff-windows-updates-to-mobile",
  verifyConflictOutcome: "d03-verify-conflict-outcome",
  recordEvidence: "d03-record-evidence",
});

export type D03FixtureManagerPort = Pick<ValidationFixtureManager, "create" | "edit" | "hash">;
export type D03VerifierPort = Pick<StateConvergenceVerifier, "verify">;
export type D03DiagnosticRunIdSource = Pick<DiagnosticLogger, "currentSyncRunId">;
export type D03OpaqueConflict = Extract<ConflictAssessment, { readonly kind: "opaque-binary" }>;

export interface D03ConflictObserverPort {
  current(): ProductSurfaceState;
}

export interface D03CrossDevicePort {
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly phase: "baseline-to-mobile" | "windows-updates-to-mobile";
    readonly from: "windows";
    readonly to: "mobile";
  }): Promise<readonly ValidationEvidenceRef[]>;

  prepareMobileVariant(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly baseline: ValidationFixtureDescriptor;
    readonly fixtureId: typeof D03_TARGET_FIXTURE_ID;
    readonly relativePath: typeof D03_TARGET_RELATIVE_PATH;
    readonly path: VaultPath;
    readonly sizeBytes: typeof D03_TARGET_SIZE_BYTES;
    readonly version: typeof D03_MOBILE_TARGET_VERSION;
  }): Promise<{
    readonly descriptor: ValidationFixtureDescriptor;
    readonly evidenceRefs: readonly ValidationEvidenceRef[];
  }>;
}

export interface D03EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly targetBase: ValidationFixtureDescriptor;
    readonly windowsTarget: ValidationFixtureDescriptor;
    readonly mobileTarget: ValidationFixtureDescriptor;
    readonly safeBase: ValidationFixtureDescriptor;
    readonly safeFinal: ValidationFixtureDescriptor;
    readonly conflict: D03OpaqueConflict;
    readonly executedDiagnosticRunIds: Readonly<{
      establishWindows: number;
      establishMobile: number;
      windowsPublish: number;
    }>;
    readonly executionVerifications: Readonly<{
      establishWindows: ValidationStateConvergenceReport;
      establishMobile: ValidationStateConvergenceReport;
      windowsPublish: ValidationStateConvergenceReport;
    }>;
    readonly baselineVerification: ValidationStateConvergenceReport;
    readonly finalVerification: ValidationStateConvergenceReport;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D03ScenarioPackageOptions {
  readonly targetPath: VaultPath;
  readonly safePath: VaultPath;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly windowsFixturesForRun: (run: ValidationRunIdentity) => D03FixtureManagerPort;
  readonly verifier: D03VerifierPort;
  readonly crossDevice: D03CrossDevicePort;
  readonly conflicts: D03ConflictObserverPort;
  readonly windowsDiagnostics: D03DiagnosticRunIdSource;
  readonly mobileDiagnostics: D03DiagnosticRunIdSource;
  readonly evidence: D03EvidenceRecorderPort;
}

export interface D03ScenarioPackage {
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
}

interface D03Context {
  readonly run: ValidationRunIdentity;
  targetBase?: ValidationFixtureDescriptor;
  windowsTarget?: ValidationFixtureDescriptor;
  mobileTarget?: ValidationFixtureDescriptor;
  safeBase?: ValidationFixtureDescriptor;
  safeFinal?: ValidationFixtureDescriptor;
  conflict?: D03OpaqueConflict;
  establishWindowsDiagnosticRunId?: number;
  establishMobileDiagnosticRunId?: number;
  windowsPublishDiagnosticRunId?: number;
  establishWindowsVerification?: ValidationStateConvergenceReport;
  establishMobileVerification?: ValidationStateConvergenceReport;
  windowsPublishVerification?: ValidationStateConvergenceReport;
  baselineVerification?: ValidationStateConvergenceReport;
  finalVerification?: ValidationStateConvergenceReport;
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function runKey(run: ValidationRunIdentity): string {
  return `${String(run.scenarioId)}\u0000${String(run.runId)}`;
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

function forbiddenKinds(expectedOperations: readonly ValidationExpectedPlanOperation[]): readonly PlanOperationKind[] {
  const expectedKinds = new Set<PlanOperationKind>(expectedOperations.map(operation => operation.kind));
  return Object.freeze(
    PLAN_OPERATION_KINDS.filter(kind => kind !== "noop" && !expectedKinds.has(kind)),
  );
}

function expectation(
  expectedOperations: readonly ValidationExpectedPlanOperation[],
  conflictExpectation: ValidationPlanExpectation["conflictExpectation"] = "forbidden",
  expectedExecutionDisposition: ValidationPlanExpectation["expectedExecutionDisposition"] = "safe-auto-eligible",
): Omit<ValidationPlanExpectation, "run"> {
  return Object.freeze({
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([...expectedOperations]),
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: forbiddenKinds(expectedOperations),
    conflictExpectation,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition,
    expectedGlobalExecutionGate: "none" as const,
  });
}

function expectedOperation(
  kind: "upload-create" | "download-create" | "upload-update" | "download-update" | "unresolved-conflict",
  path: VaultPath,
): ValidationExpectedPlanOperation {
  const targetSide = kind.startsWith("upload-")
    ? "remote"
    : kind.startsWith("download-")
      ? "local"
      : undefined;
  return Object.freeze({
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    destructive: false,
  });
}

function previewStep(stepId: string, cycleId: string) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "preview-manual",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function assertionStep(
  stepId: string,
  cycleId: string,
  assertionId: string,
  planExpectation: Omit<ValidationPlanExpectation, "run">,
) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "plan-assertion-engine" as const,
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({
      authorityCycleId: cycleId,
      assertionId,
      expectation: planExpectation,
    }),
  });
}

function executeStep(stepId: string, cycleId: string) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function moduleStep(
  stepId: string,
  module: "fixture-manager" | "cross-device-coordinator" | "state-convergence-verifier" | "scenario-evidence-recorder",
  operation: string,
  requiredCompletionProof: "operation-complete" | "verification-passed" | "evidence-recorded",
) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module,
    operation,
    requiredCompletionProof,
  });
}

export function createD03ScenarioDefinition(input: {
  readonly targetPath: VaultPath;
  readonly safePath: VaultPath;
}): ValidationRunnerScenarioDefinition {
  const baselineWindowsExpectation = expectation([
    expectedOperation("upload-create", input.targetPath),
    expectedOperation("upload-create", input.safePath),
  ]);
  const baselineMobileExpectation = expectation([
    expectedOperation("download-create", input.targetPath),
    expectedOperation("download-create", input.safePath),
  ]);
  const windowsPublishExpectation = expectation([
    expectedOperation("upload-update", input.targetPath),
    expectedOperation("upload-update", input.safePath),
  ]);
  const mobileConflictExpectation = expectation(
    [
      expectedOperation("unresolved-conflict", input.targetPath),
      expectedOperation("download-update", input.safePath),
    ],
    "required",
    "requires-user-approval",
  );

  return Object.freeze({
    scenarioId: D03_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      moduleStep("d03-establish-fixtures", "fixture-manager", D03_OPERATIONS.establishFixtures, "operation-complete"),

      previewStep("d03-establish-windows-preview", D03_AUTHORITY_CYCLES.establishWindows),
      moduleStep(
        "d03-capture-establish-windows-diagnostic-run",
        "state-convergence-verifier",
        D03_OPERATIONS.captureEstablishWindowsDiagnosticRun,
        "operation-complete",
      ),
      assertionStep(
        "d03-establish-windows-assert",
        D03_AUTHORITY_CYCLES.establishWindows,
        "d03:establish-windows",
        baselineWindowsExpectation,
      ),
      executeStep("d03-establish-windows-execute", D03_AUTHORITY_CYCLES.establishWindows),
      moduleStep(
        "d03-verify-establish-windows-terminal",
        "state-convergence-verifier",
        D03_OPERATIONS.verifyEstablishWindowsTerminal,
        "verification-passed",
      ),

      moduleStep(
        "d03-handoff-baseline-to-mobile",
        "cross-device-coordinator",
        D03_OPERATIONS.handoffBaselineToMobile,
        "operation-complete",
      ),
      previewStep("d03-establish-mobile-preview", D03_AUTHORITY_CYCLES.establishMobile),
      moduleStep(
        "d03-capture-establish-mobile-diagnostic-run",
        "state-convergence-verifier",
        D03_OPERATIONS.captureEstablishMobileDiagnosticRun,
        "operation-complete",
      ),
      assertionStep(
        "d03-establish-mobile-assert",
        D03_AUTHORITY_CYCLES.establishMobile,
        "d03:establish-mobile",
        baselineMobileExpectation,
      ),
      executeStep("d03-establish-mobile-execute", D03_AUTHORITY_CYCLES.establishMobile),
      moduleStep(
        "d03-verify-establish-mobile-terminal",
        "state-convergence-verifier",
        D03_OPERATIONS.verifyEstablishMobileTerminal,
        "verification-passed",
      ),
      moduleStep(
        "d03-verify-trusted-baseline",
        "state-convergence-verifier",
        D03_OPERATIONS.verifyTrustedBaseline,
        "verification-passed",
      ),

      moduleStep(
        "d03-edit-windows-variants",
        "fixture-manager",
        D03_OPERATIONS.editWindowsVariants,
        "operation-complete",
      ),
      moduleStep(
        "d03-prepare-mobile-variant",
        "cross-device-coordinator",
        D03_OPERATIONS.prepareMobileVariant,
        "operation-complete",
      ),

      previewStep("d03-windows-publish-preview", D03_AUTHORITY_CYCLES.windowsPublish),
      moduleStep(
        "d03-capture-windows-publish-diagnostic-run",
        "state-convergence-verifier",
        D03_OPERATIONS.captureWindowsPublishDiagnosticRun,
        "operation-complete",
      ),
      assertionStep(
        "d03-windows-publish-assert",
        D03_AUTHORITY_CYCLES.windowsPublish,
        "d03:windows-publish",
        windowsPublishExpectation,
      ),
      executeStep("d03-windows-publish-execute", D03_AUTHORITY_CYCLES.windowsPublish),
      moduleStep(
        "d03-verify-windows-publish-terminal",
        "state-convergence-verifier",
        D03_OPERATIONS.verifyWindowsPublishTerminal,
        "verification-passed",
      ),

      moduleStep(
        "d03-handoff-windows-updates-to-mobile",
        "cross-device-coordinator",
        D03_OPERATIONS.handoffWindowsUpdatesToMobile,
        "operation-complete",
      ),
      previewStep("d03-mobile-conflict-preview", D03_AUTHORITY_CYCLES.mobileConflict),
      assertionStep(
        "d03-mobile-conflict-assert",
        D03_AUTHORITY_CYCLES.mobileConflict,
        "d03:mobile-conflict",
        mobileConflictExpectation,
      ),

      moduleStep(
        "d03-verify-conflict-outcome",
        "state-convergence-verifier",
        D03_OPERATIONS.verifyConflictOutcome,
        "verification-passed",
      ),
      moduleStep(
        "d03-record-evidence",
        "scenario-evidence-recorder",
        D03_OPERATIONS.recordEvidence,
        "evidence-recorded",
      ),
    ]),
  });
}

function requireDescriptor(
  run: ValidationRunIdentity,
  descriptor: ValidationFixtureDescriptor | undefined,
  label: string,
): ValidationFixtureDescriptor {
  if (!descriptor) throw new Error(`D03 ${label} fixture is unavailable for this validation run.`);
  if (!sameRun(descriptor.identity.run, run)) {
    throw new Error(`D03 ${label} fixture belongs to a different validation run.`);
  }
  if (!descriptor.hash) throw new Error(`D03 ${label} fixture has no exact content hash.`);
  return descriptor;
}

function assertBinaryFixture(input: {
  readonly run: ValidationRunIdentity;
  readonly descriptor: ValidationFixtureDescriptor;
  readonly fixtureId: string;
  readonly relativePath: string;
  readonly expectedPath: VaultPath;
  readonly expectedVersion: number;
  readonly expectedSizeBytes: number;
}): void {
  const { descriptor } = input;
  if (!sameRun(descriptor.identity.run, input.run)) throw new Error("D03 fixture belongs to a different validation run.");
  if (String(descriptor.identity.fixtureId) !== input.fixtureId) throw new Error("D03 fixture identity does not match the scenario-owned fixture.");
  if (descriptor.relativePath !== input.relativePath || descriptor.path !== input.expectedPath) {
    throw new Error("D03 fixture path does not match the scenario-owned path.");
  }
  if (descriptor.kind !== "opaque-binary" || !descriptor.hash) {
    throw new Error("D03 requires deterministic opaque-binary fixtures with exact content hashes.");
  }
  if (descriptor.version !== input.expectedVersion || descriptor.sizeBytes !== input.expectedSizeBytes) {
    throw new Error("D03 opaque-binary fixture version/size does not match the scenario contract.");
  }
}

function content(descriptor: ValidationFixtureDescriptor) {
  return { hash: descriptor.hash!, sizeBytes: descriptor.sizeBytes };
}

function baselineVerificationRequest(
  run: ValidationRunIdentity,
  options: D03ScenarioPackageOptions,
  target: ValidationFixtureDescriptor,
  safe: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  const targetContent = content(target);
  const safeContent = content(safe);
  return {
    run,
    state: [
      {
        kind: "local-content",
        assertion: stateAssertion("d03.baseline.windows.target", "local-content", String(target.path), "Windows has the trusted binary BASE bytes."),
        deviceId: options.windowsDevice.deviceId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d03.baseline.mobile.target", "local-content", String(target.path), "Mobile has the trusted binary BASE bytes."),
        deviceId: options.mobileDevice.deviceId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("d03.baseline.remote.target", "remote-content", String(target.path), "Remote has exactly the trusted binary BASE bytes."),
        path: target.path,
        content: targetContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d03.baseline.windows.safe", "local-content", String(safe.path), "Windows has the unrelated safe BASE bytes."),
        deviceId: options.windowsDevice.deviceId,
        path: safe.path,
        content: safeContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d03.baseline.mobile.safe", "local-content", String(safe.path), "Mobile has the unrelated safe BASE bytes."),
        deviceId: options.mobileDevice.deviceId,
        path: safe.path,
        content: safeContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("d03.baseline.remote.safe", "remote-content", String(safe.path), "Remote has exactly the unrelated safe BASE bytes."),
        path: safe.path,
        content: safeContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.baseline.windows.base", "base-authority", String(target.path), "Windows trusted BASE contains the target binary baseline."),
        deviceId: options.windowsDevice.deviceId,
        path: target.path,
        expectedContent: targetContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.baseline.mobile.base", "base-authority", String(target.path), "Mobile trusted BASE contains the target binary baseline."),
        deviceId: options.mobileDevice.deviceId,
        path: target.path,
        expectedContent: targetContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.baseline.windows.safe-base", "base-authority", String(safe.path), "Windows trusted BASE contains the unrelated safe baseline."),
        deviceId: options.windowsDevice.deviceId,
        path: safe.path,
        expectedContent: safeContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.baseline.mobile.safe-base", "base-authority", String(safe.path), "Mobile trusted BASE contains the unrelated safe baseline."),
        deviceId: options.mobileDevice.deviceId,
        path: safe.path,
        expectedContent: safeContent,
      },
    ],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("d03.baseline.target.convergence", "cross-device-content", String(target.path), "Both participants share the trusted binary BASE."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: target.path,
        content: targetContent,
      },
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("d03.baseline.safe.convergence", "cross-device-content", String(safe.path), "Both participants share the unrelated safe BASE."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: safe.path,
        content: safeContent,
      },
    ],
  };
}

function executedCycleTerminalVerificationRequest(
  run: ValidationRunIdentity,
  deviceId: ValidationDeviceIdentity["deviceId"],
  diagnosticRunId: number,
  cycle: "establish-windows" | "establish-mobile" | "windows-publish",
  observedPath: VaultPath,
): ValidationStateConvergenceRequest {
  return {
    run,
    state: [{
      kind: "terminal-product-result",
      assertion: stateAssertion(
        `d03.${cycle}.terminal`,
        "terminal-product-result",
        cycle,
        "The exact production synchronization run completes successfully.",
      ),
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
      assertion: convergenceAssertion(
        `d03.${cycle}.path`,
        "cross-device-path",
        String(observedPath),
        "The executed cycle leaves its target path present on the executing device.",
      ),
      deviceIds: [deviceId],
      path: observedPath,
      expected: "file",
    }],
  };
}

function finalVerificationRequest(
  run: ValidationRunIdentity,
  options: D03ScenarioPackageOptions,
  targetBase: ValidationFixtureDescriptor,
  windowsTarget: ValidationFixtureDescriptor,
  mobileTarget: ValidationFixtureDescriptor,
  safeBase: ValidationFixtureDescriptor,
  safeFinal: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  const baseContent = content(targetBase);
  const windowsContent = content(windowsTarget);
  const mobileContent = content(mobileTarget);
  const safeBaseContent = content(safeBase);
  const safeFinalContent = content(safeFinal);
  return {
    run,
    state: [
      {
        kind: "local-content",
        assertion: stateAssertion("d03.final.windows.target", "local-content", String(windowsTarget.path), "Windows retains its complete divergent binary variant."),
        deviceId: options.windowsDevice.deviceId,
        path: windowsTarget.path,
        content: windowsContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("d03.final.remote.target", "remote-content", String(windowsTarget.path), "Remote retains the complete Windows binary variant without ambiguous duplicate occupancy."),
        path: windowsTarget.path,
        content: windowsContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d03.final.mobile.target", "local-content", String(mobileTarget.path), "Mobile retains its distinct complete binary variant because the conflict plan is never executed."),
        deviceId: options.mobileDevice.deviceId,
        path: mobileTarget.path,
        content: mobileContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.final.mobile.target-base", "base-authority", String(targetBase.path), "Mobile trusted BASE remains the original common BASE while the binary conflict is unresolved."),
        deviceId: options.mobileDevice.deviceId,
        path: targetBase.path,
        expectedContent: baseContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.final.windows.target-base", "base-authority", String(windowsTarget.path), "Windows committed its verified publication as trusted target BASE."),
        deviceId: options.windowsDevice.deviceId,
        path: windowsTarget.path,
        expectedContent: windowsContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d03.final.windows.safe", "local-content", String(safeFinal.path), "Windows retains the unrelated safe update published before conflict preview."),
        deviceId: options.windowsDevice.deviceId,
        path: safeFinal.path,
        content: safeFinalContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("d03.final.remote.safe", "remote-content", String(safeFinal.path), "Remote contains the unrelated safe update published before conflict preview, with no ambiguous duplicate occupant."),
        path: safeFinal.path,
        content: safeFinalContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.final.windows.safe-base", "base-authority", String(safeFinal.path), "Windows commits the unrelated safe publication into trusted BASE."),
        deviceId: options.windowsDevice.deviceId,
        path: safeFinal.path,
        expectedContent: safeFinalContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d03.final.mobile.safe", "local-content", String(safeBase.path), "Mobile unrelated-safe bytes remain at the established BASE because the conflict-containing plan is not executed."),
        deviceId: options.mobileDevice.deviceId,
        path: safeBase.path,
        content: safeBaseContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d03.final.mobile.safe-base", "base-authority", String(safeBase.path), "Mobile unrelated-safe trusted BASE remains preserved while the conflict plan is only previewed."),
        deviceId: options.mobileDevice.deviceId,
        path: safeBase.path,
        expectedContent: safeBaseContent,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion("d03.final.mobile.target-mapping", "mapping-or-tombstone", String(mobileTarget.path), "Mobile retains one live target mapping and no deletion tombstone."),
        deviceId: options.mobileDevice.deviceId,
        path: mobileTarget.path,
        expected: "mapping",
        entityKind: "file",
      },
      {
        kind: "durable-intent-or-effect",
        assertion: stateAssertion("d03.final.mobile.effects", "durable-intent-or-effect", D03_SCENARIO_ID, "No mobile durable synchronization effect remains outstanding after the completed BASE cycle and unexecuted conflict preview."),
        deviceId: options.mobileDevice.deviceId,
        expected: "none-outstanding",
      },
    ],
    convergence: [
      {
        kind: "cross-device-path",
        assertion: convergenceAssertion("d03.final.target-presence", "cross-device-path", String(windowsTarget.path), "Both complete conflicting target variants remain live files."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: windowsTarget.path,
        expected: "file",
      },
      {
        kind: "cross-device-path",
        assertion: convergenceAssertion("d03.final.safe-presence", "cross-device-path", String(safeFinal.path), "The unrelated safe path remains live on both participants while its newer remote version is pending on mobile."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: safeFinal.path,
        expected: "file",
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion("d03.final.target-authority", "cross-device-authority", String(targetBase.path), "Neither participant converts the unresolved binary conflict into a deletion tombstone."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: targetBase.path,
        expectedTombstone: false,
      },
    ],
  };
}

function conflictMatchesDescriptor(
  provenance: D03OpaqueConflict["preserved"]["local"],
  source: "base" | "local" | "remote",
  descriptor: ValidationFixtureDescriptor,
): boolean {
  return provenance.source === source
    && provenance.version.path === descriptor.path
    && provenance.version.entityKind === "file"
    && provenance.version.content?.hash === descriptor.hash
    && provenance.version.content?.sizeBytes === descriptor.sizeBytes;
}

function requireOpaqueConflict(input: {
  readonly surface: ProductSurfaceState;
  readonly expectedMobileDeviceId: string;
  readonly targetBase: ValidationFixtureDescriptor;
  readonly windowsTarget: ValidationFixtureDescriptor;
  readonly mobileTarget: ValidationFixtureDescriptor;
}): D03OpaqueConflict {
  const conflictCount = input.surface.status.kind === "attention-required"
    || input.surface.status.kind === "conflict-present"
    ? input.surface.status.conflictCount
    : 0;
  if (conflictCount !== 1) {
    throw new Error(`D03 production surface must report exactly one conflict; observed conflictCount=${conflictCount}.`);
  }

  const activeConflicts = input.surface.conflicts.filter(conflict => conflict.kind !== "none");
  if (activeConflicts.length !== 1) {
    throw new Error(`D03 production surface must contain exactly one non-none conflict; observed ${activeConflicts.length}.`);
  }

  const onlyConflict = activeConflicts[0]!;
  if (onlyConflict.kind !== "opaque-binary" || onlyConflict.path !== input.targetBase.path) {
    throw new Error("D03 sole production conflict is not the expected target-path opaque-binary conflict.");
  }
  const conflict: D03OpaqueConflict = onlyConflict;
  const base = conflict.preserved.base;
  if (!base) throw new Error("D03 opaque-binary conflict did not preserve trusted BASE provenance.");
  if (!conflictMatchesDescriptor(conflict.preserved.local, "local", input.mobileTarget)) {
    throw new Error("D03 opaque-binary conflict did not preserve the complete mobile/local variant with provenance.");
  }
  if (conflict.preserved.local.deviceId !== input.expectedMobileDeviceId) {
    throw new Error("D03 opaque-binary local provenance is not owned by the exact mobile participant.");
  }
  if (!conflictMatchesDescriptor(conflict.preserved.remote, "remote", input.windowsTarget)) {
    throw new Error("D03 opaque-binary conflict did not preserve the complete Windows/remote variant with provenance.");
  }
  if (
    !conflict.preserved.remote.remoteObjectId
    || conflict.preserved.remote.version.remoteObjectId !== conflict.preserved.remote.remoteObjectId
  ) {
    throw new Error("D03 opaque-binary remote provenance is missing stable remote identity.");
  }
  if (!conflictMatchesDescriptor(base, "base", input.targetBase)) {
    throw new Error("D03 opaque-binary conflict did not preserve the complete trusted BASE provenance.");
  }
  if (
    !base.remoteObjectId
    || base.version.remoteObjectId !== base.remoteObjectId
    || base.remoteObjectId !== conflict.preserved.remote.remoteObjectId
  ) {
    throw new Error("D03 opaque-binary BASE provenance lost the stable remote identity lineage.");
  }

  const hashes = [
    String(input.targetBase.hash),
    String(input.windowsTarget.hash),
    String(input.mobileTarget.hash),
  ];
  if (new Set(hashes).size !== 3) {
    throw new Error("D03 requires distinct BASE, Windows, and mobile binary hashes.");
  }
  return conflict;
}

export function createD03ProductionConflictObserver(
  runtime: ValidationProductionRuntimePort,
): D03ConflictObserverPort {
  return Object.freeze({
    current(): ProductSurfaceState {
      const controller = runtime.productController();
      if (!controller) throw new Error("D03 production conflict observation requires the production controller.");
      return controller.currentSurface();
    },
  });
}

export function createD03ConcurrentBinaryConflictScenario(
  options: D03ScenarioPackageOptions,
): D03ScenarioPackage {
  if (options.windowsDevice.platform !== "windows-desktop") {
    throw new Error("D03 controller device must be Windows desktop.");
  }
  if (options.mobileDevice.platform !== "iphone" && options.mobileDevice.platform !== "ipad") {
    throw new Error("D03 mobile participant must be iPhone or iPad.");
  }
  if (options.windowsDevice.deviceId === options.mobileDevice.deviceId) {
    throw new Error("D03 participants must have distinct device identities.");
  }
  if (options.targetPath === options.safePath) {
    throw new Error("D03 target and unrelated-safe paths must be distinct.");
  }

  const contexts = new Map<string, D03Context>();

  const startContext = (run: ValidationRunIdentity): D03Context => {
    const context: D03Context = { run };
    contexts.set(runKey(run), context);
    return context;
  };

  const requireContext = (run: ValidationRunIdentity): D03Context => {
    const context = contexts.get(runKey(run));
    if (!context || !sameRun(context.run, run)) {
      throw new Error("D03 mutable scenario state is unavailable for this exact validation run.");
    }
    return context;
  };

  const captureDiagnosticRun = (
    context: D03Context,
    cycle: "establishWindows" | "establishMobile" | "windowsPublish",
    source: D03DiagnosticRunIdSource,
  ): number => {
    const diagnosticRunId = source.currentSyncRunId();
    if (diagnosticRunId === undefined || !Number.isSafeInteger(diagnosticRunId) || diagnosticRunId < 1) {
      throw new Error(`D03 ${cycle} preview did not expose an active authoritative production diagnostic run ID.`);
    }

    if (cycle === "establishWindows") {
      if (
        context.establishWindowsDiagnosticRunId !== undefined
        && context.establishWindowsDiagnosticRunId !== diagnosticRunId
      ) {
        throw new Error("D03 Windows BASE diagnostic run identity changed within the active validation run.");
      }
      context.establishWindowsDiagnosticRunId = diagnosticRunId;
      return diagnosticRunId;
    }

    if (cycle === "establishMobile") {
      if (
        context.establishMobileDiagnosticRunId !== undefined
        && context.establishMobileDiagnosticRunId !== diagnosticRunId
      ) {
        throw new Error("D03 mobile BASE diagnostic run identity changed within the active validation run.");
      }
      context.establishMobileDiagnosticRunId = diagnosticRunId;
      return diagnosticRunId;
    }

    if (
      context.windowsPublishDiagnosticRunId !== undefined
      && context.windowsPublishDiagnosticRunId !== diagnosticRunId
    ) {
      throw new Error("D03 Windows publication diagnostic run identity changed within the active validation run.");
    }
    if (context.establishWindowsDiagnosticRunId === diagnosticRunId) {
      throw new Error("D03 Windows publication reused the Windows BASE diagnostic run ID.");
    }
    context.windowsPublishDiagnosticRunId = diagnosticRunId;
    return diagnosticRunId;
  };

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        if (request.operation === D03_OPERATIONS.establishFixtures) {
          const context = startContext(request.run);
          const windowsFixtures = options.windowsFixturesForRun(request.run);
          const target = await windowsFixtures.create(
            validationOpaqueBinaryFixture(
              D03_TARGET_FIXTURE_ID,
              D03_TARGET_RELATIVE_PATH,
              D03_TARGET_SIZE_BYTES,
              D03_BASE_VERSION,
              "conflict",
            ),
          );
          const safe = await windowsFixtures.create(
            validationOpaqueBinaryFixture(
              D03_SAFE_FIXTURE_ID,
              D03_SAFE_RELATIVE_PATH,
              D03_SAFE_SIZE_BYTES,
              D03_BASE_VERSION,
              "ordinary",
            ),
          );
          assertBinaryFixture({
            run: request.run,
            descriptor: target,
            fixtureId: D03_TARGET_FIXTURE_ID,
            relativePath: D03_TARGET_RELATIVE_PATH,
            expectedPath: options.targetPath,
            expectedVersion: D03_BASE_VERSION,
            expectedSizeBytes: D03_TARGET_SIZE_BYTES,
          });
          assertBinaryFixture({
            run: request.run,
            descriptor: safe,
            fixtureId: D03_SAFE_FIXTURE_ID,
            relativePath: D03_SAFE_RELATIVE_PATH,
            expectedPath: options.safePath,
            expectedVersion: D03_BASE_VERSION,
            expectedSizeBytes: D03_SAFE_SIZE_BYTES,
          });
          const targetHash = await windowsFixtures.hash(D03_TARGET_FIXTURE_ID);
          const safeHash = await windowsFixtures.hash(D03_SAFE_FIXTURE_ID);
          if (targetHash !== target.hash || safeHash !== safe.hash) {
            return failed("D03 trusted binary fixture setup failed deterministic hash verification.");
          }
          context.targetBase = target;
          context.safeBase = safe;
          return completed();
        }

        const context = requireContext(request.run);
        if (request.operation === D03_OPERATIONS.editWindowsVariants) {
          const targetBase = requireDescriptor(request.run, context.targetBase, "target BASE");
          const safeBase = requireDescriptor(request.run, context.safeBase, "safe BASE");
          const windowsFixtures = options.windowsFixturesForRun(request.run);
          const windowsTarget = await windowsFixtures.edit(
            D03_TARGET_FIXTURE_ID,
            D03_WINDOWS_TARGET_VERSION,
          );
          const safeFinal = await windowsFixtures.edit(
            D03_SAFE_FIXTURE_ID,
            D03_WINDOWS_SAFE_VERSION,
          );
          assertBinaryFixture({
            run: request.run,
            descriptor: windowsTarget,
            fixtureId: D03_TARGET_FIXTURE_ID,
            relativePath: D03_TARGET_RELATIVE_PATH,
            expectedPath: options.targetPath,
            expectedVersion: D03_WINDOWS_TARGET_VERSION,
            expectedSizeBytes: D03_TARGET_SIZE_BYTES,
          });
          assertBinaryFixture({
            run: request.run,
            descriptor: safeFinal,
            fixtureId: D03_SAFE_FIXTURE_ID,
            relativePath: D03_SAFE_RELATIVE_PATH,
            expectedPath: options.safePath,
            expectedVersion: D03_WINDOWS_SAFE_VERSION,
            expectedSizeBytes: D03_SAFE_SIZE_BYTES,
          });
          if (windowsTarget.hash === targetBase.hash || safeFinal.hash === safeBase.hash) {
            return failed("D03 Windows binary edits did not change the target and unrelated-safe bytes.");
          }
          const targetHash = await windowsFixtures.hash(D03_TARGET_FIXTURE_ID);
          const safeHash = await windowsFixtures.hash(D03_SAFE_FIXTURE_ID);
          if (targetHash !== windowsTarget.hash || safeHash !== safeFinal.hash) {
            return failed("D03 Windows binary edits failed deterministic post-edit hash verification.");
          }
          context.windowsTarget = windowsTarget;
          context.safeFinal = safeFinal;
          return completed();
        }

        return blocked(`Unsupported D03 fixture operation: ${request.operation}`);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D03 fixture operation failed.");
      }
    },
  };

  const crossDeviceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const context = requireContext(request.run);
        if (request.operation === D03_OPERATIONS.handoffBaselineToMobile) {
          const refs = await options.crossDevice.handoff({
            run: request.run,
            stepId: request.stepId,
            phase: "baseline-to-mobile",
            from: "windows",
            to: "mobile",
          });
          return completed(refs);
        }

        if (request.operation === D03_OPERATIONS.prepareMobileVariant) {
          const targetBase = requireDescriptor(request.run, context.targetBase, "target BASE");
          const windowsTarget = requireDescriptor(request.run, context.windowsTarget, "Windows target");
          const prepared = await options.crossDevice.prepareMobileVariant({
            run: request.run,
            stepId: request.stepId,
            baseline: targetBase,
            fixtureId: D03_TARGET_FIXTURE_ID,
            relativePath: D03_TARGET_RELATIVE_PATH,
            path: options.targetPath,
            sizeBytes: D03_TARGET_SIZE_BYTES,
            version: D03_MOBILE_TARGET_VERSION,
          });
          const mobileTarget = prepared.descriptor;
          assertBinaryFixture({
            run: request.run,
            descriptor: mobileTarget,
            fixtureId: D03_TARGET_FIXTURE_ID,
            relativePath: D03_TARGET_RELATIVE_PATH,
            expectedPath: options.targetPath,
            expectedVersion: D03_MOBILE_TARGET_VERSION,
            expectedSizeBytes: D03_TARGET_SIZE_BYTES,
          });
          if (mobileTarget.hash === targetBase.hash || mobileTarget.hash === windowsTarget.hash) {
            return failed("D03 mobile variant is not byte-distinct from both trusted BASE and the Windows variant.");
          }
          context.mobileTarget = mobileTarget;
          return completed(prepared.evidenceRefs);
        }

        if (request.operation === D03_OPERATIONS.handoffWindowsUpdatesToMobile) {
          const refs = await options.crossDevice.handoff({
            run: request.run,
            stepId: request.stepId,
            phase: "windows-updates-to-mobile",
            from: "windows",
            to: "mobile",
          });
          return completed(refs);
        }

        return blocked(`Unsupported D03 cross-device operation: ${request.operation}`);
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "D03 cross-device coordination failed.");
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const context = requireContext(request.run);

        if (request.operation === D03_OPERATIONS.captureEstablishWindowsDiagnosticRun) {
          captureDiagnosticRun(context, "establishWindows", options.windowsDiagnostics);
          return completed();
        }
        if (request.operation === D03_OPERATIONS.captureEstablishMobileDiagnosticRun) {
          captureDiagnosticRun(context, "establishMobile", options.mobileDiagnostics);
          return completed();
        }
        if (request.operation === D03_OPERATIONS.captureWindowsPublishDiagnosticRun) {
          captureDiagnosticRun(context, "windowsPublish", options.windowsDiagnostics);
          return completed();
        }

        const targetBase = requireDescriptor(request.run, context.targetBase, "target BASE");
        const safeBase = requireDescriptor(request.run, context.safeBase, "safe BASE");

        const verifyTerminal = async (
          cycle: "establishWindows" | "establishMobile" | "windowsPublish",
          device: ValidationDeviceIdentity,
          diagnosticRunId: number | undefined,
          observedPath: VaultPath,
        ): Promise<ReturnType<typeof completed> | ReturnType<typeof failed> | ReturnType<typeof blocked>> => {
          if (diagnosticRunId === undefined) {
            return blocked(`D03 ${cycle} terminal verification has no captured production diagnostic run ID.`);
          }
          const report = await options.verifier.verify(
            executedCycleTerminalVerificationRequest(
              request.run,
              device.deviceId,
              diagnosticRunId,
              cycle === "establishWindows"
                ? "establish-windows"
                : cycle === "establishMobile"
                  ? "establish-mobile"
                  : "windows-publish",
              observedPath,
            ),
          );
          if (cycle === "establishWindows") context.establishWindowsVerification = report;
          else if (cycle === "establishMobile") context.establishMobileVerification = report;
          else context.windowsPublishVerification = report;
          const refs = report.evidence.map(item => item.ref);
          if (report.result.verdict === "pass") return completed(refs);
          const summary = `D03 ${cycle} terminal verification ${report.result.verdict}.`;
          return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
        };

        if (request.operation === D03_OPERATIONS.verifyEstablishWindowsTerminal) {
          return verifyTerminal(
            "establishWindows",
            options.windowsDevice,
            context.establishWindowsDiagnosticRunId,
            targetBase.path,
          );
        }
        if (request.operation === D03_OPERATIONS.verifyEstablishMobileTerminal) {
          return verifyTerminal(
            "establishMobile",
            options.mobileDevice,
            context.establishMobileDiagnosticRunId,
            targetBase.path,
          );
        }

        if (request.operation === D03_OPERATIONS.verifyTrustedBaseline) {
          const report = await options.verifier.verify(
            baselineVerificationRequest(request.run, options, targetBase, safeBase),
          );
          context.baselineVerification = report;
          const refs = report.evidence.map(item => item.ref);
          if (report.result.verdict === "pass") return completed(refs);
          const summary = `D03 verification ${report.result.verdict} for ${request.operation}.`;
          return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
        }

        if (request.operation === D03_OPERATIONS.verifyWindowsPublishTerminal) {
          const windowsTarget = requireDescriptor(request.run, context.windowsTarget, "Windows target");
          return verifyTerminal(
            "windowsPublish",
            options.windowsDevice,
            context.windowsPublishDiagnosticRunId,
            windowsTarget.path,
          );
        }

        if (request.operation === D03_OPERATIONS.verifyConflictOutcome) {
          const windowsTarget = requireDescriptor(request.run, context.windowsTarget, "Windows target");
          const mobileTarget = requireDescriptor(request.run, context.mobileTarget, "mobile target");
          const safeFinal = requireDescriptor(request.run, context.safeFinal, "safe final");
          const conflict = requireOpaqueConflict({
            surface: options.conflicts.current(),
            expectedMobileDeviceId: options.mobileDevice.deviceId,
            targetBase,
            windowsTarget,
            mobileTarget,
          });
          const report = await options.verifier.verify(
            finalVerificationRequest(
              request.run,
              options,
              targetBase,
              windowsTarget,
              mobileTarget,
              safeBase,
              safeFinal,
            ),
          );
          context.conflict = conflict;
          context.finalVerification = report;
          const refs = report.evidence.map(item => item.ref);
          if (report.result.verdict === "pass") return completed(refs);
          const summary = `D03 verification ${report.result.verdict} for ${request.operation}.`;
          return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
        }

        return blocked(`Unsupported D03 verifier operation: ${request.operation}`);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D03 verification failed.");
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== D03_OPERATIONS.recordEvidence) {
        return blocked(`Unsupported D03 evidence operation: ${request.operation}`);
      }
      try {
        const context = requireContext(request.run);
        const targetBase = requireDescriptor(request.run, context.targetBase, "target BASE");
        const windowsTarget = requireDescriptor(request.run, context.windowsTarget, "Windows target");
        const mobileTarget = requireDescriptor(request.run, context.mobileTarget, "mobile target");
        const safeBase = requireDescriptor(request.run, context.safeBase, "safe BASE");
        const safeFinal = requireDescriptor(request.run, context.safeFinal, "safe final");
        const conflict = context.conflict;
        const baselineVerification = context.baselineVerification;
        const finalVerification = context.finalVerification;
        const establishWindowsVerification = context.establishWindowsVerification;
        const establishMobileVerification = context.establishMobileVerification;
        const windowsPublishVerification = context.windowsPublishVerification;
        const establishWindowsDiagnosticRunId = context.establishWindowsDiagnosticRunId;
        const establishMobileDiagnosticRunId = context.establishMobileDiagnosticRunId;
        const windowsPublishDiagnosticRunId = context.windowsPublishDiagnosticRunId;

        if (
          !conflict
          || establishWindowsDiagnosticRunId === undefined
          || establishMobileDiagnosticRunId === undefined
          || windowsPublishDiagnosticRunId === undefined
          || !establishWindowsVerification
          || !establishMobileVerification
          || !windowsPublishVerification
          || !baselineVerification
          || !finalVerification
        ) {
          return blocked("D03 evidence cannot be recorded before all executed-cycle terminal proofs, baseline verification, conflict proof, and final verification complete for this exact validation run.");
        }

        if (
          establishWindowsVerification.result.verdict !== "pass"
          || establishMobileVerification.result.verdict !== "pass"
          || windowsPublishVerification.result.verdict !== "pass"
          || baselineVerification.result.verdict !== "pass"
          || finalVerification.result.verdict !== "pass"
        ) {
          return blocked("D03 evidence cannot be recorded from non-PASS verification reports.");
        }

        const refs = await options.evidence.record({
          run: request.run,
          targetBase,
          windowsTarget,
          mobileTarget,
          safeBase,
          safeFinal,
          conflict,
          executedDiagnosticRunIds: {
            establishWindows: establishWindowsDiagnosticRunId,
            establishMobile: establishMobileDiagnosticRunId,
            windowsPublish: windowsPublishDiagnosticRunId,
          },
          executionVerifications: {
            establishWindows: establishWindowsVerification,
            establishMobile: establishMobileVerification,
            windowsPublish: windowsPublishVerification,
          },
          baselineVerification,
          finalVerification,
        });
        if (refs.length === 0) return blocked("D03 evidence recorder returned no durable evidence reference.");
        contexts.delete(runKey(request.run));
        return completed(refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D03 evidence recording failed.");
      }
    },
  };

  const prerequisites: ValidationRunnerPrerequisiteDelegate = {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "D03 constructs its trusted binary BASE internally and accepts no external prerequisite.",
        evidenceRefs: [],
      }));
    },
  };

  const moduleOverrides: ValidationModeModuleOverrides = Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": crossDeviceDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });

  return Object.freeze({
    definition: createD03ScenarioDefinition({
      targetPath: options.targetPath,
      safePath: options.safePath,
    }),
    prerequisites,
    moduleOverrides,
  });
}
