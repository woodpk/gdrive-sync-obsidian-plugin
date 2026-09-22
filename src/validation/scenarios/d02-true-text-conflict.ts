import {
  PLAN_OPERATION_KINDS,
  type ConflictAssessment,
  type ContentHash,
  type PlanOperationKind,
  type ProductSurfaceState,
  type RemoteObjectId,
  type VaultPath,
} from "../../contracts";
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
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "../scenario-runner-module-adapter";
import type {
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStepDefinition,
} from "../scenario-runner-contracts";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const D02_SCENARIO_ID = "D02" as const;
export const D02_LIVE_PACKAGE = "D02-true-text-conflict.md" as const;
export const D02_TARGET_FIXTURE_ID = "d02-overlap-target" as const;
export const D02_TARGET_RELATIVE_PATH = "d02-overlap-target.md" as const;
export const D02_GUARD_FIXTURE_ID = "d02-unrelated-guard" as const;
export const D02_GUARD_RELATIVE_PATH = "d02-unrelated-guard.md" as const;
export const D02_RESOLUTION = Object.freeze({ kind: "keep-local" as const });

export const D02_AUTHORITY_CYCLES = Object.freeze({
  seedWindows: "d02-seed-windows",
  seedMobile: "d02-seed-mobile",
  publishWindowsEdit: "d02-publish-windows-edit",
  mobileConflict: "d02-mobile-conflict",
  convergeWindows: "d02-converge-windows",
});

export const D02_OPERATIONS = Object.freeze({
  handoffSeedMobile: "d02-handoff-seed-mobile",
  establishMobileFixtures: "d02-establish-mobile-fixtures",
  handoffSeedWindows: "d02-handoff-seed-windows",
  establishWindowsFixtures: "d02-establish-windows-fixtures",
  handoffBaselineMobile: "d02-handoff-baseline-mobile",
  verifyTrustedBaseline: "d02-verify-trusted-baseline",
  editMobileOverlap: "d02-edit-mobile-overlap",
  handoffEditWindows: "d02-handoff-edit-windows",
  editWindowsOverlap: "d02-edit-windows-overlap",
  handoffConflictMobile: "d02-handoff-conflict-mobile",
  verifyConflictPreserved: "d02-verify-conflict-preserved",
  verifyResolution: "d02-verify-resolution",
  handoffFinalWindows: "d02-handoff-final-windows",
  verifyFinalConvergence: "d02-verify-final-convergence",
  recordEvidence: "d02-record-evidence",
});

export type D02FixtureManagerPort = Pick<ValidationFixtureManager, "create" | "edit" | "hash">;
export type D02DeviceRole = "windows" | "mobile";

export interface D02CrossDeviceHandoffPort {
  currentRole(): D02DeviceRole;
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly targetRole: D02DeviceRole;
    readonly reason:
      | "seed-mobile"
      | "seed-windows"
      | "baseline-mobile"
      | "edit-windows"
      | "conflict-mobile"
      | "final-windows";
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D02TrustedMappingReader {
  remoteObjectId(deviceId: ValidationDeviceIdentity["deviceId"], path: VaultPath): Promise<RemoteObjectId | undefined>;
}

export interface D02ConflictSurfacePort {
  currentSurface(): ProductSurfaceState;
}

export interface D02StateVerifierPort {
  verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport>;
}

export interface D02EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly targetRemoteObjectId: RemoteObjectId;
    readonly guardRemoteObjectId: RemoteObjectId;
    readonly baseHash: ContentHash;
    readonly windowsEditHash: ContentHash;
    readonly mobileEditHash: ContentHash;
    readonly conflictId: string;
    readonly resolution: typeof D02_RESOLUTION;
    readonly baselineVerification: ValidationStateConvergenceReport;
    readonly conflictVerification: ValidationStateConvergenceReport;
    readonly resolutionVerification: ValidationStateConvergenceReport;
    readonly finalVerification: ValidationStateConvergenceReport;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D02ScenarioPackageOptions {
  readonly targetPath: VaultPath;
  readonly guardPath: VaultPath;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly windowsFixtures: D02FixtureManagerPort;
  readonly mobileFixtures: D02FixtureManagerPort;
  readonly handoff: D02CrossDeviceHandoffPort;
  readonly mappingReader: D02TrustedMappingReader;
  readonly conflictSurface: D02ConflictSurfacePort;
  readonly verifier: D02StateVerifierPort;
  readonly evidence: D02EvidenceRecorderPort;
}

export interface D02ScenarioPackage {
  readonly scenarioId: typeof D02_SCENARIO_ID;
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
}

interface D02RunContext {
  run?: ValidationRunIdentity;
  mobileBaseTarget?: ValidationFixtureDescriptor;
  mobileGuard?: ValidationFixtureDescriptor;
  windowsBaseTarget?: ValidationFixtureDescriptor;
  windowsGuard?: ValidationFixtureDescriptor;
  mobileEdit?: ValidationFixtureDescriptor;
  windowsEdit?: ValidationFixtureDescriptor;
  targetRemoteObjectId?: RemoteObjectId;
  guardRemoteObjectId?: RemoteObjectId;
  conflictId?: string;
  baselineVerification?: ValidationStateConvergenceReport;
  conflictVerification?: ValidationStateConvergenceReport;
  resolutionVerification?: ValidationStateConvergenceReport;
  finalVerification?: ValidationStateConvergenceReport;
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

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function stateAssertion(
  id: string,
  kind: ValidationStateAssertion["kind"],
  expectation: string,
): ValidationStateAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject: D02_SCENARIO_ID,
    expectation,
  });
}

function convergenceAssertion(
  id: string,
  kind: ValidationConvergenceAssertion["kind"],
  expectation: string,
): ValidationConvergenceAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject: D02_SCENARIO_ID,
    expectation,
  });
}

function expectedOperation(input: {
  readonly kind: ValidationExpectedPlanOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly remoteObjectId?: RemoteObjectId;
}): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind: input.kind,
    path: input.path,
    destructive: false,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
  });
}

function forbiddenKinds(expectedKinds: readonly PlanOperationKind[]): readonly PlanOperationKind[] {
  const permitted = new Set<PlanOperationKind>(["noop", ...expectedKinds]);
  return Object.freeze(PLAN_OPERATION_KINDS.filter(kind => !permitted.has(kind)));
}

function expectation(input: {
  readonly expectedOperations: readonly ValidationExpectedPlanOperation[];
  readonly expectedKinds: readonly PlanOperationKind[];
  readonly conflictExpectation?: ValidationPlanExpectation["conflictExpectation"];
  readonly executionDisposition?: ValidationPlanExpectation["expectedExecutionDisposition"];
  readonly allowBackgroundNoop?: boolean;
}): Omit<ValidationPlanExpectation, "run"> {
  return Object.freeze({
    expectedTrigger: "manual" as const,
    expectedOperations: Object.freeze([...input.expectedOperations]),
    allowedBackgroundKinds: Object.freeze(input.allowBackgroundNoop === false ? [] : ["noop"] as const),
    forbiddenKinds: forbiddenKinds(input.expectedKinds),
    conflictExpectation: input.conflictExpectation ?? "forbidden",
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: input.executionDisposition ?? "safe-auto-eligible",
    expectedGlobalExecutionGate: "none" as const,
  });
}

function previewStep(id: string, cycleId: string): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "production-path-driver",
    operation: "preview-manual",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function assertionStep(
  id: string,
  cycleId: string,
  planExpectation: Omit<ValidationPlanExpectation, "run">,
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "plan-assertion-engine",
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({
      authorityCycleId: cycleId,
      assertionId: "d02:" + id,
      expectation: planExpectation,
    }),
  });
}

function executionStep(id: string, cycleId: string): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "production-path-driver",
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function moduleStep(
  id: string,
  module: ValidationRunnerStepDefinition["module"],
  operation: string,
  requiredCompletionProof: ValidationRunnerStepDefinition["requiredCompletionProof"],
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module,
    operation,
    requiredCompletionProof,
  });
}

function resolveConflictStep(path: VaultPath): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId("d02-resolve-observed-conflict"),
    module: "production-path-driver",
    operation: "resolve-observed-conflict",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({
      expectedVaultPath: String(path),
      expectedConflictKind: "unresolved-text",
      resolution: D02_RESOLUTION,
    }),
  });
}

function exactRemoteOperation(
  kind: "upload-update" | "download-update",
  path: VaultPath,
  targetSide: "remote" | "local",
  resolveRemoteObjectId: () => RemoteObjectId | undefined,
): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind,
    path,
    targetSide,
    destructive: false,
    get remoteObjectId(): RemoteObjectId {
      const remoteObjectId = resolveRemoteObjectId();
      if (!remoteObjectId) {
        throw new Error("D02 exact target Drive identity is unavailable before trusted-baseline verification.");
      }
      return remoteObjectId;
    },
  });
}

function createDefinition(
  targetPath: VaultPath,
  guardPath: VaultPath,
  resolveTargetRemoteObjectId: () => RemoteObjectId | undefined,
): ValidationRunnerScenarioDefinition {
  const seedWindows = expectation({
    expectedOperations: [
      expectedOperation({ kind: "upload-create", path: targetPath, targetSide: "remote" }),
      expectedOperation({ kind: "upload-create", path: guardPath, targetSide: "remote" }),
    ],
    expectedKinds: ["upload-create"],
    allowBackgroundNoop: false,
  });
  const seedMobile = expectation({
    expectedOperations: [
      expectedOperation({ kind: "noop", path: targetPath }),
      expectedOperation({ kind: "noop", path: guardPath }),
    ],
    expectedKinds: ["noop"],
    allowBackgroundNoop: false,
  });
  const publishWindows = expectation({
    expectedOperations: [
      exactRemoteOperation("upload-update", targetPath, "remote", resolveTargetRemoteObjectId),
    ],
    expectedKinds: ["upload-update"],
  });
  const mobileConflict = expectation({
    expectedOperations: [
      expectedOperation({ kind: "unresolved-conflict", path: targetPath }),
    ],
    expectedKinds: ["unresolved-conflict"],
    conflictExpectation: "allowed-exactly-as-expected",
    executionDisposition: "requires-user-approval",
  });
  const convergeWindows = expectation({
    expectedOperations: [
      exactRemoteOperation("download-update", targetPath, "local", resolveTargetRemoteObjectId),
    ],
    expectedKinds: ["download-update"],
  });

  return Object.freeze({
    scenarioId: D02_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      moduleStep("d02-handoff-seed-mobile", "cross-device-coordinator", D02_OPERATIONS.handoffSeedMobile, "operation-complete"),
      moduleStep("d02-establish-mobile-fixtures", "fixture-manager", D02_OPERATIONS.establishMobileFixtures, "operation-complete"),
      moduleStep("d02-handoff-seed-windows", "cross-device-coordinator", D02_OPERATIONS.handoffSeedWindows, "operation-complete"),
      moduleStep("d02-establish-windows-fixtures", "fixture-manager", D02_OPERATIONS.establishWindowsFixtures, "operation-complete"),

      previewStep("d02-seed-windows-preview", D02_AUTHORITY_CYCLES.seedWindows),
      assertionStep("d02-seed-windows-assert", D02_AUTHORITY_CYCLES.seedWindows, seedWindows),
      executionStep("d02-seed-windows-execute", D02_AUTHORITY_CYCLES.seedWindows),

      moduleStep("d02-handoff-baseline-mobile", "cross-device-coordinator", D02_OPERATIONS.handoffBaselineMobile, "operation-complete"),
      previewStep("d02-seed-mobile-preview", D02_AUTHORITY_CYCLES.seedMobile),
      assertionStep("d02-seed-mobile-assert", D02_AUTHORITY_CYCLES.seedMobile, seedMobile),
      executionStep("d02-seed-mobile-execute", D02_AUTHORITY_CYCLES.seedMobile),
      moduleStep("d02-verify-trusted-baseline", "state-convergence-verifier", D02_OPERATIONS.verifyTrustedBaseline, "verification-passed"),

      moduleStep("d02-edit-mobile-overlap", "fixture-manager", D02_OPERATIONS.editMobileOverlap, "operation-complete"),
      moduleStep("d02-handoff-edit-windows", "cross-device-coordinator", D02_OPERATIONS.handoffEditWindows, "operation-complete"),
      moduleStep("d02-edit-windows-overlap", "fixture-manager", D02_OPERATIONS.editWindowsOverlap, "operation-complete"),

      previewStep("d02-publish-windows-preview", D02_AUTHORITY_CYCLES.publishWindowsEdit),
      assertionStep("d02-publish-windows-assert", D02_AUTHORITY_CYCLES.publishWindowsEdit, publishWindows),
      executionStep("d02-publish-windows-execute", D02_AUTHORITY_CYCLES.publishWindowsEdit),

      moduleStep("d02-handoff-conflict-mobile", "cross-device-coordinator", D02_OPERATIONS.handoffConflictMobile, "operation-complete"),
      previewStep("d02-mobile-conflict-preview", D02_AUTHORITY_CYCLES.mobileConflict),
      assertionStep("d02-mobile-conflict-assert", D02_AUTHORITY_CYCLES.mobileConflict, mobileConflict),
      executionStep("d02-mobile-conflict-execute", D02_AUTHORITY_CYCLES.mobileConflict),
      moduleStep("d02-verify-conflict-preserved", "state-convergence-verifier", D02_OPERATIONS.verifyConflictPreserved, "verification-passed"),

      resolveConflictStep(targetPath),
      moduleStep("d02-verify-resolution", "state-convergence-verifier", D02_OPERATIONS.verifyResolution, "verification-passed"),

      moduleStep("d02-handoff-final-windows", "cross-device-coordinator", D02_OPERATIONS.handoffFinalWindows, "operation-complete"),
      previewStep("d02-converge-windows-preview", D02_AUTHORITY_CYCLES.convergeWindows),
      assertionStep("d02-converge-windows-assert", D02_AUTHORITY_CYCLES.convergeWindows, convergeWindows),
      executionStep("d02-converge-windows-execute", D02_AUTHORITY_CYCLES.convergeWindows),

      moduleStep("d02-verify-final-convergence", "state-convergence-verifier", D02_OPERATIONS.verifyFinalConvergence, "verification-passed"),
      moduleStep("d02-record-evidence", "scenario-evidence-recorder", D02_OPERATIONS.recordEvidence, "evidence-recorded"),
    ]),
  });
}

function requireDescriptor(
  descriptor: ValidationFixtureDescriptor | undefined,
  label: string,
): ValidationFixtureDescriptor {
  if (!descriptor) throw new Error("D02 " + label + " fixture is unavailable.");
  if (!descriptor.hash) throw new Error("D02 " + label + " fixture has no exact content hash.");
  return descriptor;
}

function assertFixture(
  run: ValidationRunIdentity,
  descriptor: ValidationFixtureDescriptor,
  expectedRelativePath: string,
  expectedPath: VaultPath,
): void {
  if (!sameRun(descriptor.identity.run, run)) throw new Error("D02 fixture belongs to a different validation run.");
  if (descriptor.relativePath !== expectedRelativePath || descriptor.path !== expectedPath) {
    throw new Error("D02 fixture path does not match the scenario-owned path.");
  }
  if (descriptor.kind !== "text" || !descriptor.hash) {
    throw new Error("D02 requires deterministic text fixtures with exact hashes.");
  }
}

function requireRole(options: D02ScenarioPackageOptions, role: D02DeviceRole): string | undefined {
  return options.handoff.currentRole() === role
    ? undefined
    : "D02 step requires " + role + " ownership; current role is " + options.handoff.currentRole() + ".";
}

function requireContextRun(context: D02RunContext, run: ValidationRunIdentity): string | undefined {
  return context.run && !sameRun(context.run, run)
    ? "D02 task-local state belongs to a different validation run."
    : undefined;
}

async function sameStableId(
  options: D02ScenarioPackageOptions,
  path: VaultPath,
): Promise<RemoteObjectId | undefined> {
  const [windows, mobile] = await Promise.all([
    options.mappingReader.remoteObjectId(options.windowsDevice.deviceId, path),
    options.mappingReader.remoteObjectId(options.mobileDevice.deviceId, path),
  ]);
  return windows !== undefined && windows === mobile ? windows : undefined;
}

function exactContent(descriptor: ValidationFixtureDescriptor) {
  return { hash: descriptor.hash!, sizeBytes: descriptor.sizeBytes };
}

function baselineRequest(
  run: ValidationRunIdentity,
  options: D02ScenarioPackageOptions,
  target: ValidationFixtureDescriptor,
  guard: ValidationFixtureDescriptor,
  targetRemoteObjectId: RemoteObjectId,
  guardRemoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const targetContent = exactContent(target);
  const guardContent = exactContent(guard);
  const devices = [options.windowsDevice.deviceId, options.mobileDevice.deviceId] as const;
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d02-base-windows-target", "local-content", "Windows holds the deterministic common text BASE."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("d02-base-mobile-target", "local-content", "Mobile holds the deterministic common text BASE."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, content: targetContent },
      { kind: "remote-content", assertion: stateAssertion("d02-base-remote-target", "remote-content", "Remote holds the same exact common text BASE on the stable Drive object."), path: options.targetPath, remoteObjectId: targetRemoteObjectId, content: targetContent },
      { kind: "base-authority", assertion: stateAssertion("d02-base-windows-authority", "base-authority", "Windows BASE binds the target to the common bytes and stable object."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("d02-base-mobile-authority", "base-authority", "Mobile BASE binds the target to the common bytes and stable object."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: targetContent },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d02-base-guard", "unrelated-mutation-absence", "The unrelated guard is identical on both devices and remote."), local: [
        { deviceId: options.windowsDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
        { deviceId: options.mobileDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
      ], remote: [{ path: options.guardPath, state: "live", remoteObjectId: guardRemoteObjectId, content: guardContent }] },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d02-base-content-converged", "cross-device-content", "Both devices share the exact target BASE bytes."), deviceIds: devices, path: options.targetPath, content: targetContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("d02-base-authority-converged", "cross-device-authority", "Both devices bind the target to the same stable Drive object."), deviceIds: devices, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedTombstone: false },
    ],
  };
}

function conflictRequest(
  run: ValidationRunIdentity,
  options: D02ScenarioPackageOptions,
  base: ValidationFixtureDescriptor,
  windowsEdit: ValidationFixtureDescriptor,
  mobileEdit: ValidationFixtureDescriptor,
  guard: ValidationFixtureDescriptor,
  targetRemoteObjectId: RemoteObjectId,
  guardRemoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const baseContent = exactContent(base);
  const windowsContent = exactContent(windowsEdit);
  const mobileContent = exactContent(mobileEdit);
  const guardContent = exactContent(guard);
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d02-conflict-windows-original", "local-content", "The complete Windows overlapping edit remains recoverable locally."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, content: windowsContent },
      { kind: "local-content", assertion: stateAssertion("d02-conflict-mobile-original", "local-content", "The complete mobile overlapping edit remains recoverable locally."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, content: mobileContent },
      { kind: "remote-content", assertion: stateAssertion("d02-conflict-remote-windows-original", "remote-content", "Remote retains the complete Windows edit before explicit conflict resolution."), path: options.targetPath, remoteObjectId: targetRemoteObjectId, content: windowsContent },
      { kind: "base-authority", assertion: stateAssertion("d02-conflict-mobile-base-not-advanced", "base-authority", "Mobile BASE remains the common ancestor until explicit conflict resolution."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: baseContent },
      { kind: "base-authority", assertion: stateAssertion("d02-conflict-windows-base-published", "base-authority", "Windows BASE records only its own verified published edit."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: windowsContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d02-conflict-mobile-mapping", "mapping-or-tombstone", "Mobile keeps the stable target mapping without a tombstone."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expected: "mapping", remoteObjectId: targetRemoteObjectId, entityKind: "file" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d02-conflict-mobile-no-outstanding-effect", "durable-intent-or-effect", "The unresolved conflict leaves no mobile mutation effect outstanding."), deviceId: options.mobileDevice.deviceId, expected: "none-outstanding" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d02-conflict-guard-unchanged", "unrelated-mutation-absence", "The unrelated guard is untouched while the conflict is preserved."), local: [
        { deviceId: options.windowsDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
        { deviceId: options.mobileDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
      ], remote: [{ path: options.guardPath, state: "live", remoteObjectId: guardRemoteObjectId, content: guardContent }] },
    ],
    convergence: [
      { kind: "cross-device-authority", assertion: convergenceAssertion("d02-conflict-identity-stable", "cross-device-authority", "Both devices retain the same stable Drive identity while content remains intentionally divergent."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedTombstone: false },
    ],
  };
}

function resolutionRequest(
  run: ValidationRunIdentity,
  options: D02ScenarioPackageOptions,
  windowsEdit: ValidationFixtureDescriptor,
  mobileEdit: ValidationFixtureDescriptor,
  guard: ValidationFixtureDescriptor,
  targetRemoteObjectId: RemoteObjectId,
  guardRemoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const windowsContent = exactContent(windowsEdit);
  const mobileContent = exactContent(mobileEdit);
  const guardContent = exactContent(guard);
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d02-resolution-mobile-chosen", "local-content", "Mobile still contains the explicit keep-local choice."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, content: mobileContent },
      { kind: "remote-content", assertion: stateAssertion("d02-resolution-remote-chosen", "remote-content", "Remote now contains the explicit mobile keep-local choice."), path: options.targetPath, remoteObjectId: targetRemoteObjectId, content: mobileContent },
      { kind: "base-authority", assertion: stateAssertion("d02-resolution-mobile-base", "base-authority", "Mobile BASE advances only after authoritative explicit resolution."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: mobileContent },
      { kind: "local-content", assertion: stateAssertion("d02-resolution-windows-pre-reconcile", "local-content", "Windows retains its complete original edit until final reconciliation."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, content: windowsContent },
      { kind: "base-authority", assertion: stateAssertion("d02-resolution-windows-base-pre-reconcile", "base-authority", "Windows BASE still records its previously published edit before it observes the resolution."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: windowsContent },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d02-resolution-mobile-no-outstanding-effect", "durable-intent-or-effect", "Explicit resolution leaves no mobile durable effect outstanding."), deviceId: options.mobileDevice.deviceId, expected: "none-outstanding" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d02-resolution-guard-unchanged", "unrelated-mutation-absence", "The unrelated guard remains unchanged after resolution."), local: [
        { deviceId: options.windowsDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
        { deviceId: options.mobileDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
      ], remote: [{ path: options.guardPath, state: "live", remoteObjectId: guardRemoteObjectId, content: guardContent }] },
    ],
    convergence: [
      { kind: "cross-device-conflict-resolution", assertion: convergenceAssertion("d02-resolution-mobile-authoritative", "cross-device-conflict-resolution", "The explicit resolution is authoritative on mobile and remote before Windows reconciliation."), deviceIds: [options.mobileDevice.deviceId], path: options.targetPath, content: mobileContent, remoteObjectId: targetRemoteObjectId },
    ],
  };
}

function finalRequest(
  run: ValidationRunIdentity,
  options: D02ScenarioPackageOptions,
  mobileEdit: ValidationFixtureDescriptor,
  guard: ValidationFixtureDescriptor,
  targetRemoteObjectId: RemoteObjectId,
  guardRemoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const chosenContent = exactContent(mobileEdit);
  const guardContent = exactContent(guard);
  const devices = [options.windowsDevice.deviceId, options.mobileDevice.deviceId] as const;
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d02-final-windows-content", "local-content", "Windows converges to the explicit mobile resolution bytes."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, content: chosenContent },
      { kind: "local-content", assertion: stateAssertion("d02-final-mobile-content", "local-content", "Mobile retains the explicit resolution bytes."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, content: chosenContent },
      { kind: "remote-content", assertion: stateAssertion("d02-final-remote-content", "remote-content", "Remote retains the explicit resolution bytes on the original stable object."), path: options.targetPath, remoteObjectId: targetRemoteObjectId, content: chosenContent },
      { kind: "base-authority", assertion: stateAssertion("d02-final-windows-base", "base-authority", "Windows BASE converges to the explicit resolution."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: chosenContent },
      { kind: "base-authority", assertion: stateAssertion("d02-final-mobile-base", "base-authority", "Mobile BASE remains at the explicit resolution."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedContent: chosenContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d02-final-windows-mapping", "mapping-or-tombstone", "Windows has one live mapping and no tombstone."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, expected: "mapping", remoteObjectId: targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d02-final-mobile-mapping", "mapping-or-tombstone", "Mobile has one live mapping and no tombstone."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expected: "mapping", remoteObjectId: targetRemoteObjectId, entityKind: "file" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d02-final-windows-effects", "durable-intent-or-effect", "Windows has no outstanding durable effect after convergence."), deviceId: options.windowsDevice.deviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d02-final-mobile-effects", "durable-intent-or-effect", "Mobile has no outstanding durable effect after convergence."), deviceId: options.mobileDevice.deviceId, expected: "none-outstanding" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d02-final-guard-unchanged", "unrelated-mutation-absence", "The unrelated guard remains unchanged everywhere."), local: [
        { deviceId: options.windowsDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
        { deviceId: options.mobileDevice.deviceId, path: options.guardPath, state: "file", content: guardContent },
      ], remote: [{ path: options.guardPath, state: "live", remoteObjectId: guardRemoteObjectId, content: guardContent }] },
    ],
    convergence: [
      { kind: "cross-device-conflict-resolution", assertion: convergenceAssertion("d02-final-conflict-resolution", "cross-device-conflict-resolution", "Both devices and remote converge on the explicit conflict resolution."), deviceIds: devices, path: options.targetPath, content: chosenContent, remoteObjectId: targetRemoteObjectId },
      { kind: "cross-device-authority", assertion: convergenceAssertion("d02-final-authority", "cross-device-authority", "Both devices retain the original stable Drive identity without tombstones."), deviceIds: devices, path: options.targetPath, expectedRemoteObjectId: targetRemoteObjectId, expectedTombstone: false },
    ],
  };
}

function conflictHash(
  provenance: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>["preserved"]["local"],
): string | undefined {
  return provenance.version.content?.hash === undefined ? undefined : String(provenance.version.content.hash);
}

function conflictRemoteId(
  provenance: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>["preserved"]["remote"],
): string | undefined {
  return provenance.version.remoteObjectId === undefined
    ? provenance.remoteObjectId === undefined ? undefined : String(provenance.remoteObjectId)
    : String(provenance.version.remoteObjectId);
}

function verifyPreservedConflict(input: {
  readonly surface: ProductSurfaceState;
  readonly path: VaultPath;
  readonly base: ValidationFixtureDescriptor;
  readonly windowsEdit: ValidationFixtureDescriptor;
  readonly mobileEdit: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
}): Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> | undefined {
  const conflicts = input.surface.conflicts.filter(
    (value): value is Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> =>
      value.kind === "unresolved-text" && value.path === input.path,
  );
  if (conflicts.length !== 1 || input.surface.conflicts.length !== 1) return undefined;
  const conflict = conflicts[0]!;
  const base = conflict.preserved.base;
  if (!base) return undefined;
  if (
    conflict.preserved.local.source !== "local"
    || conflict.preserved.remote.source !== "remote"
    || base.source !== "base"
    || conflict.preserved.local.deviceId === undefined
    || conflict.preserved.local.version.path !== input.path
    || conflict.preserved.remote.version.path !== input.path
    || base.version.path !== input.path
    || conflictHash(conflict.preserved.local) !== String(input.mobileEdit.hash)
    || conflictHash(conflict.preserved.remote) !== String(input.windowsEdit.hash)
    || (base.version.content?.hash === undefined ? undefined : String(base.version.content.hash)) !== String(input.base.hash)
    || conflict.preserved.local.version.content?.sizeBytes !== input.mobileEdit.sizeBytes
    || conflict.preserved.remote.version.content?.sizeBytes !== input.windowsEdit.sizeBytes
    || base.version.content?.sizeBytes !== input.base.sizeBytes
    || conflictRemoteId(conflict.preserved.remote) !== String(input.targetRemoteObjectId)
    || (base.version.remoteObjectId === undefined ? base.remoteObjectId : base.version.remoteObjectId) !== input.targetRemoteObjectId
  ) {
    return undefined;
  }
  return conflict;
}

function reportResult(report: ValidationStateConvergenceReport, phase: string) {
  const refs = report.evidence.map(item => item.ref);
  if (report.result.verdict === "pass") {
    return refs.length > 0
      ? completed(refs)
      : blocked("D02 " + phase + " verification produced no objective evidence.");
  }
  return report.result.verdict === "fail"
    ? failed("D02 " + phase + " objective verification failed.", refs)
    : blocked("D02 " + phase + " objective verification was not fully observable.", refs);
}

export function createD02ConcurrentOverlappingTextConflictScenario(
  options: D02ScenarioPackageOptions,
): D02ScenarioPackage {
  if (options.windowsDevice.platform !== "windows-desktop") {
    throw new Error("D02 Windows participant must be Windows desktop.");
  }
  if (options.mobileDevice.platform !== "iphone" && options.mobileDevice.platform !== "ipad") {
    throw new Error("D02 mobile participant must be iPhone or iPad.");
  }
  if (options.windowsDevice.deviceId === options.mobileDevice.deviceId) {
    throw new Error("D02 participants must have distinct device identities.");
  }
  if (options.targetPath === options.guardPath) {
    throw new Error("D02 target and guard paths must be distinct.");
  }

  const context: D02RunContext = {};

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        if (request.operation === D02_OPERATIONS.establishMobileFixtures) {
          const runError = requireContextRun(context, request.run);
          if (runError) return blocked(runError);
          context.run = request.run;
          const roleError = requireRole(options, "mobile");
          if (roleError) return blocked(roleError);
          const target = await options.mobileFixtures.create(
            validationTextFixture(D02_TARGET_FIXTURE_ID, D02_TARGET_RELATIVE_PATH, 1, "base", "conflict"),
          );
          const guard = await options.mobileFixtures.create(
            validationTextFixture(D02_GUARD_FIXTURE_ID, D02_GUARD_RELATIVE_PATH, 1, "base", "ordinary"),
          );
          assertFixture(request.run, target, D02_TARGET_RELATIVE_PATH, options.targetPath);
          assertFixture(request.run, guard, D02_GUARD_RELATIVE_PATH, options.guardPath);
          if (
            await options.mobileFixtures.hash(D02_TARGET_FIXTURE_ID) !== target.hash
            || await options.mobileFixtures.hash(D02_GUARD_FIXTURE_ID) !== guard.hash
          ) {
            return failed("D02 mobile deterministic BASE fixture hash verification failed.");
          }
          context.mobileBaseTarget = target;
          context.mobileGuard = guard;
          return completed();
        }

        const runError = requireContextRun(context, request.run);
        if (runError) return blocked(runError);

        if (request.operation === D02_OPERATIONS.establishWindowsFixtures) {
          const roleError = requireRole(options, "windows");
          if (roleError) return blocked(roleError);
          const mobileTarget = requireDescriptor(context.mobileBaseTarget, "mobile BASE target");
          const mobileGuard = requireDescriptor(context.mobileGuard, "mobile guard");
          const target = await options.windowsFixtures.create(
            validationTextFixture(D02_TARGET_FIXTURE_ID, D02_TARGET_RELATIVE_PATH, 1, "base", "conflict"),
          );
          const guard = await options.windowsFixtures.create(
            validationTextFixture(D02_GUARD_FIXTURE_ID, D02_GUARD_RELATIVE_PATH, 1, "base", "ordinary"),
          );
          assertFixture(request.run, target, D02_TARGET_RELATIVE_PATH, options.targetPath);
          assertFixture(request.run, guard, D02_GUARD_RELATIVE_PATH, options.guardPath);
          if (
            target.hash !== mobileTarget.hash
            || target.sizeBytes !== mobileTarget.sizeBytes
            || guard.hash !== mobileGuard.hash
            || guard.sizeBytes !== mobileGuard.sizeBytes
            || await options.windowsFixtures.hash(D02_TARGET_FIXTURE_ID) !== target.hash
            || await options.windowsFixtures.hash(D02_GUARD_FIXTURE_ID) !== guard.hash
          ) {
            return failed("D02 Windows/mobile deterministic BASE fixtures are not byte-identical.");
          }
          context.windowsBaseTarget = target;
          context.windowsGuard = guard;
          return completed();
        }

        if (request.operation === D02_OPERATIONS.editMobileOverlap) {
          const roleError = requireRole(options, "mobile");
          if (roleError) return blocked(roleError);
          const base = requireDescriptor(context.mobileBaseTarget, "mobile BASE target");
          const edited = await options.mobileFixtures.edit(D02_TARGET_FIXTURE_ID, base.version + 1, "overlap-b");
          assertFixture(request.run, edited, D02_TARGET_RELATIVE_PATH, options.targetPath);
          if (edited.hash === base.hash || await options.mobileFixtures.hash(D02_TARGET_FIXTURE_ID) !== edited.hash) {
            return failed("D02 mobile overlapping edit did not produce and retain deterministic changed bytes.");
          }
          context.mobileEdit = edited;
          return completed();
        }

        if (request.operation === D02_OPERATIONS.editWindowsOverlap) {
          const roleError = requireRole(options, "windows");
          if (roleError) return blocked(roleError);
          const base = requireDescriptor(context.windowsBaseTarget, "Windows BASE target");
          const mobileEdit = requireDescriptor(context.mobileEdit, "mobile overlapping edit");
          const edited = await options.windowsFixtures.edit(D02_TARGET_FIXTURE_ID, base.version + 1, "overlap-a");
          assertFixture(request.run, edited, D02_TARGET_RELATIVE_PATH, options.targetPath);
          if (
            edited.hash === base.hash
            || edited.hash === mobileEdit.hash
            || await options.windowsFixtures.hash(D02_TARGET_FIXTURE_ID) !== edited.hash
          ) {
            return failed("D02 Windows overlapping edit is not a distinct deterministic variant.");
          }
          context.windowsEdit = edited;
          return completed();
        }

        return blocked("Unsupported D02 fixture operation: " + request.operation);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D02 fixture operation failed.");
      }
    },
  };

  const handoffReasons: Readonly<Record<string, { readonly role: D02DeviceRole; readonly reason: Parameters<D02CrossDeviceHandoffPort["handoff"]>[0]["reason"] }>> = Object.freeze({
    [D02_OPERATIONS.handoffSeedMobile]: { role: "mobile", reason: "seed-mobile" },
    [D02_OPERATIONS.handoffSeedWindows]: { role: "windows", reason: "seed-windows" },
    [D02_OPERATIONS.handoffBaselineMobile]: { role: "mobile", reason: "baseline-mobile" },
    [D02_OPERATIONS.handoffEditWindows]: { role: "windows", reason: "edit-windows" },
    [D02_OPERATIONS.handoffConflictMobile]: { role: "mobile", reason: "conflict-mobile" },
    [D02_OPERATIONS.handoffFinalWindows]: { role: "windows", reason: "final-windows" },
  });

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const runError = requireContextRun(context, request.run);
      if (context.run && runError) return blocked(runError);
      const route = handoffReasons[request.operation];
      if (!route) return blocked("Unsupported D02 handoff operation: " + request.operation);
      try {
        return completed(await options.handoff.handoff({
          run: request.run,
          stepId: request.stepId,
          targetRole: route.role,
          reason: route.reason,
        }));
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "D02 cross-device handoff failed.");
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const runError = requireContextRun(context, request.run);
        if (runError) return blocked(runError);
        const base = requireDescriptor(context.mobileBaseTarget, "mobile BASE target");
        const guard = requireDescriptor(context.mobileGuard, "mobile guard");

        if (request.operation === D02_OPERATIONS.verifyTrustedBaseline) {
          const windowsBase = requireDescriptor(context.windowsBaseTarget, "Windows BASE target");
          const windowsGuard = requireDescriptor(context.windowsGuard, "Windows guard");
          if (
            windowsBase.hash !== base.hash
            || windowsBase.sizeBytes !== base.sizeBytes
            || windowsGuard.hash !== guard.hash
            || windowsGuard.sizeBytes !== guard.sizeBytes
          ) {
            return failed("D02 common BASE fixtures diverged before trusted-baseline verification.");
          }
          const targetRemoteObjectId = await sameStableId(options, options.targetPath);
          const guardRemoteObjectId = await sameStableId(options, options.guardPath);
          if (!targetRemoteObjectId || !guardRemoteObjectId || targetRemoteObjectId === guardRemoteObjectId) {
            return blocked("D02 trusted baseline does not expose distinct stable Drive identities on both devices.");
          }
          const report = await options.verifier.verify(
            baselineRequest(request.run, options, base, guard, targetRemoteObjectId, guardRemoteObjectId),
          );
          if (report.result.verdict === "pass") {
            context.targetRemoteObjectId = targetRemoteObjectId;
            context.guardRemoteObjectId = guardRemoteObjectId;
            context.baselineVerification = report;
          }
          return reportResult(report, "trusted-baseline");
        }

        const targetRemoteObjectId = context.targetRemoteObjectId;
        const guardRemoteObjectId = context.guardRemoteObjectId;
        if (!targetRemoteObjectId || !guardRemoteObjectId || !context.baselineVerification) {
          return blocked("D02 trusted baseline and exact Drive identities must be verified before conflict testing.");
        }
        const windowsEdit = requireDescriptor(context.windowsEdit, "Windows overlapping edit");
        const mobileEdit = requireDescriptor(context.mobileEdit, "mobile overlapping edit");

        if (request.operation === D02_OPERATIONS.verifyConflictPreserved) {
          const conflict = verifyPreservedConflict({
            surface: options.conflictSurface.currentSurface(),
            path: options.targetPath,
            base,
            windowsEdit,
            mobileEdit,
            targetRemoteObjectId,
          });
          if (!conflict) {
            return failed("D02 production conflict surface did not preserve exact local, remote, and BASE provenance for both complete overlapping versions.");
          }
          const report = await options.verifier.verify(
            conflictRequest(request.run, options, base, windowsEdit, mobileEdit, guard, targetRemoteObjectId, guardRemoteObjectId),
          );
          if (report.result.verdict === "pass") {
            context.conflictId = String(conflict.conflictId);
            context.conflictVerification = report;
          }
          return reportResult(report, "pre-resolution conflict preservation");
        }

        if (!context.conflictId || !context.conflictVerification) {
          return blocked("D02 explicit resolution is not eligible until exact conflict preservation has passed.");
        }

        if (request.operation === D02_OPERATIONS.verifyResolution) {
          const remaining = options.conflictSurface.currentSurface().conflicts;
          if (remaining.length !== 0) return failed("D02 explicit production resolution left conflict state on the production surface.");
          const report = await options.verifier.verify(
            resolutionRequest(request.run, options, windowsEdit, mobileEdit, guard, targetRemoteObjectId, guardRemoteObjectId),
          );
          if (report.result.verdict === "pass") context.resolutionVerification = report;
          return reportResult(report, "explicit-resolution");
        }

        if (request.operation === D02_OPERATIONS.verifyFinalConvergence) {
          if (!context.resolutionVerification) {
            return blocked("D02 final convergence cannot be verified before explicit resolution passes.");
          }
          const remaining = options.conflictSurface.currentSurface().conflicts;
          if (remaining.length !== 0) return failed("D02 conflict state reappeared during final Windows reconciliation.");
          const report = await options.verifier.verify(
            finalRequest(request.run, options, mobileEdit, guard, targetRemoteObjectId, guardRemoteObjectId),
          );
          if (report.result.verdict === "pass") context.finalVerification = report;
          return reportResult(report, "final-convergence");
        }

        return blocked("Unsupported D02 verifier operation: " + request.operation);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D02 verification failed.");
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const runError = requireContextRun(context, request.run);
      if (runError) return blocked(runError);
      if (request.operation !== D02_OPERATIONS.recordEvidence) {
        return blocked("Unsupported D02 evidence operation: " + request.operation);
      }
      try {
        const base = requireDescriptor(context.mobileBaseTarget, "mobile BASE target");
        const windowsEdit = requireDescriptor(context.windowsEdit, "Windows overlapping edit");
        const mobileEdit = requireDescriptor(context.mobileEdit, "mobile overlapping edit");
        if (
          !context.targetRemoteObjectId
          || !context.guardRemoteObjectId
          || !context.conflictId
          || !context.baselineVerification
          || !context.conflictVerification
          || !context.resolutionVerification
          || !context.finalVerification
        ) {
          return blocked("D02 evidence cannot be recorded before every objective phase completes.");
        }
        const refs = await options.evidence.record({
          run: request.run,
          targetRemoteObjectId: context.targetRemoteObjectId,
          guardRemoteObjectId: context.guardRemoteObjectId,
          baseHash: base.hash!,
          windowsEditHash: windowsEdit.hash!,
          mobileEditHash: mobileEdit.hash!,
          conflictId: context.conflictId,
          resolution: D02_RESOLUTION,
          baselineVerification: context.baselineVerification,
          conflictVerification: context.conflictVerification,
          resolutionVerification: context.resolutionVerification,
          finalVerification: context.finalVerification,
        });
        return refs.length > 0
          ? completed(refs)
          : blocked("D02 evidence recorder returned no durable evidence reference.");
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D02 evidence recording failed.");
      }
    },
  };

  const prerequisites: ValidationRunnerPrerequisiteDelegate = {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "D02 reconstructs its common trusted BASE internally and accepts no external prerequisite.",
        evidenceRefs: [],
      }));
    },
  };

  const moduleOverrides: ValidationModeModuleOverrides = Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": handoffDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });

  return Object.freeze({
    scenarioId: D02_SCENARIO_ID,
    definition: createDefinition(options.targetPath, options.guardPath, () => context.targetRemoteObjectId),
    prerequisites,
    moduleOverrides,
  });
}
