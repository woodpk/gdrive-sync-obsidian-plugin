import {
  PLAN_OPERATION_KINDS,
  type ContentHash,
  type PlanOperationKind,
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
  type ValidationTextVariant,
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
import type { ValidationRunnerScenarioDefinition } from "../scenario-runner-contracts";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";
import { sha256Text } from "../../util/sha256";

export const D01_SCENARIO_ID = "D01" as const;
export const D01_LIVE_PACKAGE = "D01-clean-text-merge.md" as const;
export const D01_TARGET_FIXTURE_ID = "d01-clean-text-merge" as const;
export const D01_TARGET_RELATIVE_PATH = "d01-clean-text-merge.md" as const;
export const D01_SENTINEL_FIXTURE_ID = "d01-unrelated-sentinel" as const;
export const D01_SENTINEL_RELATIVE_PATH = "d01-unrelated-sentinel.md" as const;

export const D01_AUTHORITY_CYCLES = Object.freeze({
  establishWindows: "d01-establish-windows",
  establishMobile: "d01-establish-mobile",
  windowsFirstSync: "d01-windows-first-sync",
  mobileCleanMerge: "d01-mobile-clean-merge",
  windowsReconcile: "d01-windows-reconcile",
} as const);

export const D01_OPERATIONS = Object.freeze({
  establishFixtures: "d01-establish-fixtures",
  handoffBaselineToMobile: "d01-handoff-baseline-to-mobile",
  verifyTrustedBaseline: "d01-verify-trusted-baseline",
  handoffEditToWindows: "d01-handoff-edit-to-windows",
  editWindows: "d01-edit-windows-non-overlap-a",
  handoffEditToMobile: "d01-handoff-edit-to-mobile",
  editMobile: "d01-edit-mobile-non-overlap-b",
  handoffFirstSyncToWindows: "d01-handoff-first-sync-to-windows",
  verifyIndependentEdits: "d01-verify-independent-edits",
  handoffMergeToMobile: "d01-handoff-merge-to-mobile",
  verifyCleanMerge: "d01-verify-clean-merge",
  handoffReconcileToWindows: "d01-handoff-reconcile-to-windows",
  verifyFinalConvergence: "d01-verify-final-convergence",
  recordEvidence: "d01-record-evidence",
} as const);

export type D01WindowsFixtureManagerPort = Pick<ValidationFixtureManager, "create" | "edit" | "hash">;

export interface D01ExistingTextFixturePort {
  editExisting(input: {
    readonly run: ValidationRunIdentity;
    readonly fixtureId: string;
    readonly relativePath: string;
    readonly path: VaultPath;
    readonly expectedCurrentHash: ContentHash;
    readonly nextVersion: number;
    readonly textVariant: Extract<ValidationTextVariant, "non-overlap-a" | "non-overlap-b">;
  }): Promise<ValidationFixtureDescriptor>;
  hashExisting(input: {
    readonly run: ValidationRunIdentity;
    readonly fixtureId: string;
    readonly path: VaultPath;
  }): Promise<ContentHash>;
}

export type D01DeviceRole = "windows" | "mobile";

export interface D01CrossDeviceHandoffPort {
  currentRole(): D01DeviceRole;
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly phase:
      | "baseline-to-mobile"
      | "edit-to-windows"
      | "edit-to-mobile"
      | "first-sync-to-windows"
      | "merge-to-mobile"
      | "reconcile-to-windows";
    readonly targetRole: D01DeviceRole;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D01TrustedMappingReader {
  remoteObjectId(deviceId: ValidationDeviceIdentity["deviceId"], path: VaultPath): Promise<RemoteObjectId | undefined>;
}

export interface D01VerifierPort {
  verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport>;
}

export interface D01ConflictArtifactProbe {
  verifyNoConflictCopy(input: {
    readonly run: ValidationRunIdentity;
    readonly targetPath: VaultPath;
    readonly fixtureId: string;
  }): Promise<
    | { readonly status: "verified"; readonly evidenceRefs: readonly ValidationEvidenceRef[] }
    | { readonly status: "failed" | "not-observable"; readonly summary: string; readonly evidenceRefs: readonly ValidationEvidenceRef[] }
  >;
}

export interface D01EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly remoteObjectId: RemoteObjectId;
    readonly targetPath: VaultPath;
    readonly sentinelPath: VaultPath;
    readonly baseHash: ContentHash;
    readonly windowsEditHash: ContentHash;
    readonly mobileEditHash: ContentHash;
    readonly mergedHash: ContentHash;
    readonly mergedSizeBytes: number;
    readonly baselineVerification: ValidationStateConvergenceReport;
    readonly independentEditsVerification: ValidationStateConvergenceReport;
    readonly cleanMergeVerification: ValidationStateConvergenceReport;
    readonly finalVerification: ValidationStateConvergenceReport;
    readonly noConflictCopyEvidence: readonly ValidationEvidenceRef[];
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D01ScenarioPackageOptions {
  readonly targetPath: VaultPath;
  readonly sentinelPath: VaultPath;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly windowsFixtures: D01WindowsFixtureManagerPort;
  readonly mobileFixture: D01ExistingTextFixturePort;
  readonly mappingReader: D01TrustedMappingReader;
  readonly verifier: D01VerifierPort;
  readonly conflictArtifacts: D01ConflictArtifactProbe;
  readonly handoffs: D01CrossDeviceHandoffPort;
  readonly evidence: D01EvidenceRecorderPort;
}

export interface D01ScenarioPackage {
  readonly scenarioId: typeof D01_SCENARIO_ID;
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
}

interface D01Context {
  targetBase?: ValidationFixtureDescriptor;
  targetWindows?: ValidationFixtureDescriptor;
  targetMobile?: ValidationFixtureDescriptor;
  sentinel?: ValidationFixtureDescriptor;
  remoteObjectId?: RemoteObjectId;
  baselineVerification?: ValidationStateConvergenceReport;
  independentEditsVerification?: ValidationStateConvergenceReport;
  cleanMergeVerification?: ValidationStateConvergenceReport;
  finalVerification?: ValidationStateConvergenceReport;
  noConflictCopyEvidence?: readonly ValidationEvidenceRef[];
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function fixtureText(
  fixtureId: string,
  version: number,
  left: "base" | "edit-a",
  right: "base" | "edit-b",
): string {
  return [
    "BRAIN validation fixture",
    "fixture=" + fixtureId,
    "version=" + String(version),
    "left=" + left,
    "right=" + right,
    "overlap=base",
    "",
  ].join("\n");
}

export const D01_BASE_TEXT = fixtureText(D01_TARGET_FIXTURE_ID, 1, "base", "base");
export const D01_WINDOWS_EDIT_TEXT = fixtureText(D01_TARGET_FIXTURE_ID, 2, "edit-a", "base");
export const D01_MOBILE_EDIT_TEXT = fixtureText(D01_TARGET_FIXTURE_ID, 2, "base", "edit-b");
export const D01_EXPECTED_MERGED_TEXT = fixtureText(D01_TARGET_FIXTURE_ID, 2, "edit-a", "edit-b");
export const D01_BASE_HASH = sha256Text(D01_BASE_TEXT);
export const D01_WINDOWS_EDIT_HASH = sha256Text(D01_WINDOWS_EDIT_TEXT);
export const D01_MOBILE_EDIT_HASH = sha256Text(D01_MOBILE_EDIT_TEXT);
export const D01_EXPECTED_MERGED_HASH = sha256Text(D01_EXPECTED_MERGED_TEXT);
export const D01_EXPECTED_MERGED_SIZE_BYTES = new TextEncoder().encode(D01_EXPECTED_MERGED_TEXT).byteLength;

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

function expectedOperation(
  kind: "upload-create" | "download-create" | "upload-update" | "download-update" | "clean-text-merge",
  path: VaultPath,
): ValidationExpectedPlanOperation {
  const targetSide = kind === "upload-create" || kind === "upload-update"
    ? "remote" as const
    : kind === "download-create" || kind === "download-update"
      ? "local" as const
      : undefined;
  return Object.freeze({
    kind,
    path,
    ...(targetSide === undefined ? {} : { targetSide }),
    destructive: false,
  });
}

function expectation(
  expectedOperations: readonly ValidationExpectedPlanOperation[],
): Omit<ValidationPlanExpectation, "run"> {
  const expectedKinds = new Set<PlanOperationKind>(expectedOperations.map(operation => operation.kind));
  return Object.freeze({
    expectedTrigger: "manual" as const,
    expectedOperations: Object.freeze([...expectedOperations]),
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: Object.freeze(
      PLAN_OPERATION_KINDS.filter(kind => kind !== "noop" && !expectedKinds.has(kind)),
    ),
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: "safe-auto-eligible" as const,
    expectedGlobalExecutionGate: "none" as const,
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

export function createD01ScenarioDefinition(input: {
  readonly targetPath: VaultPath;
  readonly sentinelPath: VaultPath;
}): ValidationRunnerScenarioDefinition {
  const establishWindows = expectation([
    expectedOperation("upload-create", input.targetPath),
    expectedOperation("upload-create", input.sentinelPath),
  ]);
  const establishMobile = expectation([
    expectedOperation("download-create", input.targetPath),
    expectedOperation("download-create", input.sentinelPath),
  ]);
  const windowsFirstSync = expectation([
    expectedOperation("upload-update", input.targetPath),
  ]);
  const mobileMerge = expectation([
    expectedOperation("clean-text-merge", input.targetPath),
  ]);
  const windowsReconcile = expectation([
    expectedOperation("download-update", input.targetPath),
  ]);

  return Object.freeze({
    scenarioId: D01_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      moduleStep("d01-establish-fixtures", "fixture-manager", D01_OPERATIONS.establishFixtures, "operation-complete"),

      previewStep("d01-establish-windows-preview", D01_AUTHORITY_CYCLES.establishWindows),
      assertionStep("d01-establish-windows-assert", D01_AUTHORITY_CYCLES.establishWindows, "d01:establish-windows", establishWindows),
      executeStep("d01-establish-windows-execute", D01_AUTHORITY_CYCLES.establishWindows),

      moduleStep("d01-handoff-baseline-mobile", "cross-device-coordinator", D01_OPERATIONS.handoffBaselineToMobile, "operation-complete"),
      previewStep("d01-establish-mobile-preview", D01_AUTHORITY_CYCLES.establishMobile),
      assertionStep("d01-establish-mobile-assert", D01_AUTHORITY_CYCLES.establishMobile, "d01:establish-mobile", establishMobile),
      executeStep("d01-establish-mobile-execute", D01_AUTHORITY_CYCLES.establishMobile),
      moduleStep("d01-verify-trusted-baseline", "state-convergence-verifier", D01_OPERATIONS.verifyTrustedBaseline, "verification-passed"),

      moduleStep("d01-handoff-edit-windows", "cross-device-coordinator", D01_OPERATIONS.handoffEditToWindows, "operation-complete"),
      moduleStep("d01-edit-windows", "fixture-manager", D01_OPERATIONS.editWindows, "operation-complete"),
      moduleStep("d01-handoff-edit-mobile", "cross-device-coordinator", D01_OPERATIONS.handoffEditToMobile, "operation-complete"),
      moduleStep("d01-edit-mobile", "fixture-manager", D01_OPERATIONS.editMobile, "operation-complete"),

      moduleStep("d01-handoff-first-sync-windows", "cross-device-coordinator", D01_OPERATIONS.handoffFirstSyncToWindows, "operation-complete"),
      previewStep("d01-windows-first-sync-preview", D01_AUTHORITY_CYCLES.windowsFirstSync),
      assertionStep("d01-windows-first-sync-assert", D01_AUTHORITY_CYCLES.windowsFirstSync, "d01:windows-first-sync", windowsFirstSync),
      executeStep("d01-windows-first-sync-execute", D01_AUTHORITY_CYCLES.windowsFirstSync),
      moduleStep("d01-verify-independent-edits", "state-convergence-verifier", D01_OPERATIONS.verifyIndependentEdits, "verification-passed"),

      moduleStep("d01-handoff-merge-mobile", "cross-device-coordinator", D01_OPERATIONS.handoffMergeToMobile, "operation-complete"),
      previewStep("d01-mobile-merge-preview", D01_AUTHORITY_CYCLES.mobileCleanMerge),
      assertionStep("d01-mobile-merge-assert", D01_AUTHORITY_CYCLES.mobileCleanMerge, "d01:mobile-clean-merge", mobileMerge),
      executeStep("d01-mobile-merge-execute", D01_AUTHORITY_CYCLES.mobileCleanMerge),
      moduleStep("d01-verify-clean-merge", "state-convergence-verifier", D01_OPERATIONS.verifyCleanMerge, "verification-passed"),

      moduleStep("d01-handoff-reconcile-windows", "cross-device-coordinator", D01_OPERATIONS.handoffReconcileToWindows, "operation-complete"),
      previewStep("d01-windows-reconcile-preview", D01_AUTHORITY_CYCLES.windowsReconcile),
      assertionStep("d01-windows-reconcile-assert", D01_AUTHORITY_CYCLES.windowsReconcile, "d01:windows-reconcile", windowsReconcile),
      executeStep("d01-windows-reconcile-execute", D01_AUTHORITY_CYCLES.windowsReconcile),

      moduleStep("d01-verify-final", "state-convergence-verifier", D01_OPERATIONS.verifyFinalConvergence, "verification-passed"),
      moduleStep("d01-record-evidence", "scenario-evidence-recorder", D01_OPERATIONS.recordEvidence, "evidence-recorded"),
    ]),
  });
}

function requireRole(options: D01ScenarioPackageOptions, role: D01DeviceRole): string | undefined {
  const current = options.handoffs.currentRole();
  return current === role ? undefined : "D01 step requires " + role + " ownership; current role is " + current + ".";
}

function requireDescriptor(
  descriptor: ValidationFixtureDescriptor | undefined,
  label: string,
): ValidationFixtureDescriptor {
  if (!descriptor) throw new Error("D01 " + label + " fixture is unavailable.");
  if (!descriptor.hash) throw new Error("D01 " + label + " fixture has no exact content hash.");
  return descriptor;
}

function assertDescriptor(
  run: ValidationRunIdentity,
  descriptor: ValidationFixtureDescriptor,
  fixtureId: string,
  relativePath: string,
  expectedPath: VaultPath,
): void {
  if (!sameRun(descriptor.identity.run, run)) throw new Error("D01 fixture belongs to a different validation run.");
  if (String(descriptor.identity.fixtureId) !== fixtureId) throw new Error("D01 fixture identity changed unexpectedly.");
  if (descriptor.relativePath !== relativePath || descriptor.path !== expectedPath) {
    throw new Error("D01 fixture path changed unexpectedly.");
  }
  if (descriptor.kind !== "text" || !descriptor.hash) {
    throw new Error("D01 requires deterministic text fixtures with exact content hashes.");
  }
}

function passOrStop(report: ValidationStateConvergenceReport, phase: string) {
  const evidenceRefs = report.evidence.map(item => item.ref);
  if (report.result.verdict === "pass") {
    return evidenceRefs.length > 0
      ? { status: "completed" as const, evidenceRefs }
      : { status: "blocked" as const, summary: phase + " produced no objective evidence.", evidenceRefs: [] };
  }
  return {
    status: report.result.verdict === "fail" ? "failed" as const : "blocked" as const,
    summary: phase + " objective verification " + report.result.verdict + ".",
    evidenceRefs,
  };
}

async function stableRemoteId(
  options: D01ScenarioPackageOptions,
  path: VaultPath,
): Promise<RemoteObjectId | undefined> {
  const [windows, mobile] = await Promise.all([
    options.mappingReader.remoteObjectId(options.windowsDevice.deviceId, path),
    options.mappingReader.remoteObjectId(options.mobileDevice.deviceId, path),
  ]);
  return windows !== undefined && windows === mobile ? windows : undefined;
}

function baselineRequest(
  run: ValidationRunIdentity,
  options: D01ScenarioPackageOptions,
  target: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  remoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const targetContent = { hash: target.hash!, sizeBytes: target.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  const devices = [options.windowsDevice.deviceId, options.mobileDevice.deviceId] as const;
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d01.base.windows.target", "local-content", String(target.path), "Windows has the exact trusted D01 BASE bytes."), deviceId: options.windowsDevice.deviceId, path: target.path, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("d01.base.mobile.target", "local-content", String(target.path), "Mobile has the exact trusted D01 BASE bytes."), deviceId: options.mobileDevice.deviceId, path: target.path, content: targetContent },
      { kind: "remote-content", assertion: stateAssertion("d01.base.remote.target", "remote-content", String(target.path), "Remote has the exact trusted D01 BASE bytes."), path: target.path, content: targetContent, remoteObjectId },
      { kind: "base-authority", assertion: stateAssertion("d01.base.windows.authority", "base-authority", String(target.path), "Windows trusted BASE records the exact D01 object and bytes."), deviceId: options.windowsDevice.deviceId, path: target.path, expectedRemoteObjectId: remoteObjectId, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("d01.base.mobile.authority", "base-authority", String(target.path), "Mobile trusted BASE records the same exact D01 object and bytes."), deviceId: options.mobileDevice.deviceId, path: target.path, expectedRemoteObjectId: remoteObjectId, expectedContent: targetContent },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d01.base.sentinel", "unrelated-mutation-absence", String(sentinel.path), "The D01 sentinel is identical on both devices and remote."), local: [
        { deviceId: options.windowsDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
        { deviceId: options.mobileDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
      ], remote: [{ path: sentinel.path, state: "live", content: sentinelContent }] },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d01.base.content", "cross-device-content", String(target.path), "Both devices share one exact trusted D01 BASE."), deviceIds: devices, path: target.path, content: targetContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("d01.base.authority", "cross-device-authority", String(target.path), "Both devices map the D01 BASE to the same stable remote object."), deviceIds: devices, path: target.path, expectedRemoteObjectId: remoteObjectId, expectedTombstone: false },
    ],
  };
}

function independentEditsRequest(
  run: ValidationRunIdentity,
  options: D01ScenarioPackageOptions,
  windowsTarget: ValidationFixtureDescriptor,
  mobileTarget: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  remoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const windowsContent = { hash: windowsTarget.hash!, sizeBytes: windowsTarget.sizeBytes };
  const mobileContent = { hash: mobileTarget.hash!, sizeBytes: mobileTarget.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d01.independent.windows", "local-content", String(windowsTarget.path), "Windows retains its non-overlap-a edit after the first production sync."), deviceId: options.windowsDevice.deviceId, path: windowsTarget.path, content: windowsContent },
      { kind: "remote-content", assertion: stateAssertion("d01.independent.remote", "remote-content", String(windowsTarget.path), "Remote contains the Windows first-sync edit before mobile observes it."), path: windowsTarget.path, content: windowsContent, remoteObjectId },
      { kind: "local-content", assertion: stateAssertion("d01.independent.mobile", "local-content", String(mobileTarget.path), "Mobile still retains its independently-created non-overlap-b edit before merge planning."), deviceId: options.mobileDevice.deviceId, path: mobileTarget.path, content: mobileContent },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d01.independent.sentinel", "unrelated-mutation-absence", String(sentinel.path), "The D01 sentinel remains unchanged during independent edits and first sync."), local: [
        { deviceId: options.windowsDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
        { deviceId: options.mobileDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
      ], remote: [{ path: sentinel.path, state: "live", content: sentinelContent }] },
    ],
    convergence: [
      { kind: "cross-device-authority", assertion: convergenceAssertion("d01.independent.authority", "cross-device-authority", String(windowsTarget.path), "Both devices retain the same stable remote identity while content is intentionally divergent."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: windowsTarget.path, expectedRemoteObjectId: remoteObjectId, expectedTombstone: false },
    ],
  };
}

function cleanMergeRequest(
  run: ValidationRunIdentity,
  options: D01ScenarioPackageOptions,
  windowsTarget: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  remoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const mergedContent = { hash: D01_EXPECTED_MERGED_HASH, sizeBytes: D01_EXPECTED_MERGED_SIZE_BYTES };
  const windowsContent = { hash: windowsTarget.hash!, sizeBytes: windowsTarget.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d01.merge.mobile", "local-content", String(options.targetPath), "Mobile contains the exact clean three-way merge: each independent edit appears exactly once."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, content: mergedContent },
      { kind: "remote-content", assertion: stateAssertion("d01.merge.remote", "remote-content", String(options.targetPath), "Remote contains the exact clean three-way merge on the original stable object."), path: options.targetPath, content: mergedContent, remoteObjectId },
      { kind: "local-content", assertion: stateAssertion("d01.merge.windows-pre-reconcile", "local-content", String(options.targetPath), "Windows still has its first-sync edit until the required reconciliation step."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, content: windowsContent },
      { kind: "base-authority", assertion: stateAssertion("d01.merge.mobile-base", "base-authority", String(options.targetPath), "Mobile trusted BASE commits the verified merged bytes on the same remote object."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: remoteObjectId, expectedContent: mergedContent },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d01.merge.mobile-effects", "durable-intent-or-effect", String(options.targetPath), "No mobile durable effect remains outstanding after the clean merge commits."), deviceId: options.mobileDevice.deviceId, expected: "none-outstanding" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d01.merge.sentinel", "unrelated-mutation-absence", String(sentinel.path), "The D01 sentinel remains unchanged through clean merge execution."), local: [
        { deviceId: options.windowsDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
        { deviceId: options.mobileDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
      ], remote: [{ path: sentinel.path, state: "live", content: sentinelContent }] },
    ],
    convergence: [
      { kind: "cross-device-authority", assertion: convergenceAssertion("d01.merge.authority", "cross-device-authority", String(options.targetPath), "Both participants retain the same live remote identity through the merge."), deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId], path: options.targetPath, expectedRemoteObjectId: remoteObjectId, expectedTombstone: false },
    ],
  };
}

function finalRequest(
  run: ValidationRunIdentity,
  options: D01ScenarioPackageOptions,
  sentinel: ValidationFixtureDescriptor,
  remoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const mergedContent = { hash: D01_EXPECTED_MERGED_HASH, sizeBytes: D01_EXPECTED_MERGED_SIZE_BYTES };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  const devices = [options.windowsDevice.deviceId, options.mobileDevice.deviceId] as const;
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("d01.final.windows", "local-content", String(options.targetPath), "Windows reconciles to the exact combined D01 bytes."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, content: mergedContent },
      { kind: "local-content", assertion: stateAssertion("d01.final.mobile", "local-content", String(options.targetPath), "Mobile retains the exact combined D01 bytes."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, content: mergedContent },
      { kind: "remote-content", assertion: stateAssertion("d01.final.remote", "remote-content", String(options.targetPath), "Remote retains the exact combined D01 bytes on the original object."), path: options.targetPath, content: mergedContent, remoteObjectId },
      { kind: "base-authority", assertion: stateAssertion("d01.final.windows-base", "base-authority", String(options.targetPath), "Windows trusted BASE records the verified merged bytes and stable object identity."), deviceId: options.windowsDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: remoteObjectId, expectedContent: mergedContent },
      { kind: "base-authority", assertion: stateAssertion("d01.final.mobile-base", "base-authority", String(options.targetPath), "Mobile trusted BASE records the verified merged bytes and stable object identity."), deviceId: options.mobileDevice.deviceId, path: options.targetPath, expectedRemoteObjectId: remoteObjectId, expectedContent: mergedContent },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d01.final.windows-effects", "durable-intent-or-effect", String(options.targetPath), "No Windows durable effect remains outstanding after reconciliation."), deviceId: options.windowsDevice.deviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d01.final.mobile-effects", "durable-intent-or-effect", String(options.targetPath), "No mobile durable effect remains outstanding after merge."), deviceId: options.mobileDevice.deviceId, expected: "none-outstanding" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d01.final.sentinel", "unrelated-mutation-absence", String(sentinel.path), "The unrelated D01 sentinel remains byte-identical everywhere."), local: [
        { deviceId: options.windowsDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
        { deviceId: options.mobileDevice.deviceId, path: sentinel.path, state: "file", content: sentinelContent },
      ], remote: [{ path: sentinel.path, state: "live", content: sentinelContent }] },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d01.final.content", "cross-device-content", String(options.targetPath), "Both devices converge on the exact combined D01 content."), deviceIds: devices, path: options.targetPath, content: mergedContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("d01.final.authority", "cross-device-authority", String(options.targetPath), "Both devices converge on the same live remote object without a tombstone."), deviceIds: devices, path: options.targetPath, expectedRemoteObjectId: remoteObjectId, expectedTombstone: false },
    ],
  };
}

export function createD01CleanTextMergeScenario(
  options: D01ScenarioPackageOptions,
): D01ScenarioPackage {
  if (options.windowsDevice.platform !== "windows-desktop") {
    throw new Error("D01 Windows participant must be Windows desktop.");
  }
  if (options.mobileDevice.platform !== "iphone" && options.mobileDevice.platform !== "ipad") {
    throw new Error("D01 mobile participant must be iPhone or iPad.");
  }
  if (options.windowsDevice.deviceId === options.mobileDevice.deviceId) {
    throw new Error("D01 participants must have distinct device identities.");
  }
  if (options.targetPath === options.sentinelPath) {
    throw new Error("D01 target and sentinel paths must be distinct.");
  }

  const contexts = new Map<string, D01Context>();
  const context = (run: ValidationRunIdentity): D01Context => {
    const key = String(run.scenarioId) + "\u0000" + String(run.runId);
    const existing = contexts.get(key);
    if (existing) return existing;
    const created: D01Context = {};
    contexts.set(key, created);
    return created;
  };

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);
      try {
        if (request.operation === D01_OPERATIONS.establishFixtures) {
          const roleProblem = requireRole(options, "windows");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
          state.targetBase = await options.windowsFixtures.create(
            validationTextFixture(D01_TARGET_FIXTURE_ID, D01_TARGET_RELATIVE_PATH, 1, "base", "conflict"),
          );
          state.sentinel = await options.windowsFixtures.create(
            validationTextFixture(D01_SENTINEL_FIXTURE_ID, D01_SENTINEL_RELATIVE_PATH, 1, "base", "ordinary"),
          );
          assertDescriptor(request.run, state.targetBase, D01_TARGET_FIXTURE_ID, D01_TARGET_RELATIVE_PATH, options.targetPath);
          assertDescriptor(request.run, state.sentinel, D01_SENTINEL_FIXTURE_ID, D01_SENTINEL_RELATIVE_PATH, options.sentinelPath);
          if (state.targetBase.hash !== D01_BASE_HASH || await options.windowsFixtures.hash(D01_TARGET_FIXTURE_ID) !== D01_BASE_HASH) {
            return { status: "failed", summary: "D01 deterministic BASE bytes/hash do not match the fixture contract.", evidenceRefs: [] };
          }
          return { status: "completed", evidenceRefs: [] };
        }

        if (request.operation === D01_OPERATIONS.editWindows) {
          const roleProblem = requireRole(options, "windows");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
          if (!state.baselineVerification || !state.targetBase) {
            return { status: "blocked", summary: "D01 Windows edit requires objectively verified common BASE.", evidenceRefs: [] };
          }
          const edited = await options.windowsFixtures.edit(D01_TARGET_FIXTURE_ID, 2, "non-overlap-a");
          assertDescriptor(request.run, edited, D01_TARGET_FIXTURE_ID, D01_TARGET_RELATIVE_PATH, options.targetPath);
          const observedHash = await options.windowsFixtures.hash(D01_TARGET_FIXTURE_ID);
          if (edited.hash !== D01_WINDOWS_EDIT_HASH || observedHash !== D01_WINDOWS_EDIT_HASH) {
            return { status: "failed", summary: "D01 Windows non-overlap-a edit is not the exact deterministic fixture variant.", evidenceRefs: [] };
          }
          state.targetWindows = edited;
          return { status: "completed", evidenceRefs: [] };
        }

        if (request.operation === D01_OPERATIONS.editMobile) {
          const roleProblem = requireRole(options, "mobile");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
          if (!state.baselineVerification || !state.targetBase || !state.targetWindows) {
            return { status: "blocked", summary: "D01 mobile edit requires verified BASE and the independent Windows edit to exist first.", evidenceRefs: [] };
          }
          const edited = await options.mobileFixture.editExisting({
            run: request.run,
            fixtureId: D01_TARGET_FIXTURE_ID,
            relativePath: D01_TARGET_RELATIVE_PATH,
            path: options.targetPath,
            expectedCurrentHash: D01_BASE_HASH,
            nextVersion: 2,
            textVariant: "non-overlap-b",
          });
          assertDescriptor(request.run, edited, D01_TARGET_FIXTURE_ID, D01_TARGET_RELATIVE_PATH, options.targetPath);
          const observedHash = await options.mobileFixture.hashExisting({
            run: request.run,
            fixtureId: D01_TARGET_FIXTURE_ID,
            path: options.targetPath,
          });
          if (edited.hash !== D01_MOBILE_EDIT_HASH || observedHash !== D01_MOBILE_EDIT_HASH) {
            return { status: "failed", summary: "D01 mobile non-overlap-b edit is not the exact deterministic fixture variant.", evidenceRefs: [] };
          }
          state.targetMobile = edited;
          return { status: "completed", evidenceRefs: [] };
        }

        return { status: "blocked", summary: "Unsupported D01 fixture operation: " + request.operation, evidenceRefs: [] };
      } catch (error) {
        return { status: "failed", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const handoffMap = new Map<string, { readonly phase: Parameters<D01CrossDeviceHandoffPort["handoff"]>[0]["phase"]; readonly role: D01DeviceRole }>([
    [D01_OPERATIONS.handoffBaselineToMobile, { phase: "baseline-to-mobile", role: "mobile" }],
    [D01_OPERATIONS.handoffEditToWindows, { phase: "edit-to-windows", role: "windows" }],
    [D01_OPERATIONS.handoffEditToMobile, { phase: "edit-to-mobile", role: "mobile" }],
    [D01_OPERATIONS.handoffFirstSyncToWindows, { phase: "first-sync-to-windows", role: "windows" }],
    [D01_OPERATIONS.handoffMergeToMobile, { phase: "merge-to-mobile", role: "mobile" }],
    [D01_OPERATIONS.handoffReconcileToWindows, { phase: "reconcile-to-windows", role: "windows" }],
  ]);

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const target = handoffMap.get(request.operation);
      if (!target) return { status: "blocked", summary: "Unsupported D01 handoff operation: " + request.operation, evidenceRefs: [] };
      try {
        const evidenceRefs = await options.handoffs.handoff({
          run: request.run,
          stepId: request.stepId,
          phase: target.phase,
          targetRole: target.role,
        });
        if (options.handoffs.currentRole() !== target.role) {
          return { status: "blocked", summary: "D01 handoff did not establish " + target.role + " ownership.", evidenceRefs };
        }
        return { status: "completed", evidenceRefs };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);
      try {
        const targetBase = requireDescriptor(state.targetBase, "BASE target");
        const sentinel = requireDescriptor(state.sentinel, "sentinel");

        if (request.operation === D01_OPERATIONS.verifyTrustedBaseline) {
          const remoteObjectId = await stableRemoteId(options, options.targetPath);
          if (!remoteObjectId) {
            return { status: "failed", summary: "D01 common BASE did not establish one stable remote identity on both participants.", evidenceRefs: [] };
          }
          const report = await options.verifier.verify(
            baselineRequest(request.run, options, targetBase, sentinel, remoteObjectId),
          );
          const result = passOrStop(report, "D01 trusted BASE");
          if (result.status === "completed") {
            state.remoteObjectId = remoteObjectId;
            state.baselineVerification = report;
          }
          return result;
        }

        if (!state.baselineVerification || !state.remoteObjectId) {
          return { status: "blocked", summary: "D01 verified common BASE authority is unavailable.", evidenceRefs: [] };
        }

        if (request.operation === D01_OPERATIONS.verifyIndependentEdits) {
          const windowsTarget = requireDescriptor(state.targetWindows, "Windows edited target");
          const mobileTarget = requireDescriptor(state.targetMobile, "mobile edited target");
          if (windowsTarget.hash === mobileTarget.hash || windowsTarget.hash === targetBase.hash || mobileTarget.hash === targetBase.hash) {
            return { status: "failed", summary: "D01 independent edits are not distinct from each other and the trusted BASE.", evidenceRefs: [] };
          }
          const report = await options.verifier.verify(
            independentEditsRequest(request.run, options, windowsTarget, mobileTarget, sentinel, state.remoteObjectId),
          );
          const result = passOrStop(report, "D01 independent edits");
          if (result.status === "completed") state.independentEditsVerification = report;
          return result;
        }

        if (!state.independentEditsVerification) {
          return { status: "blocked", summary: "D01 clean merge cannot be accepted before independent divergent edits are objectively verified.", evidenceRefs: [] };
        }

        if (request.operation === D01_OPERATIONS.verifyCleanMerge) {
          const windowsTarget = requireDescriptor(state.targetWindows, "Windows edited target");
          const report = await options.verifier.verify(
            cleanMergeRequest(request.run, options, windowsTarget, sentinel, state.remoteObjectId),
          );
          const reportResult = passOrStop(report, "D01 clean three-way merge");
          if (reportResult.status !== "completed") return reportResult;

          const conflictProbe = await options.conflictArtifacts.verifyNoConflictCopy({
            run: request.run,
            targetPath: options.targetPath,
            fixtureId: D01_TARGET_FIXTURE_ID,
          });
          if (conflictProbe.status !== "verified") {
            return {
              status: conflictProbe.status === "failed" ? "failed" : "blocked",
              summary: conflictProbe.summary,
              evidenceRefs: [...reportResult.evidenceRefs, ...conflictProbe.evidenceRefs],
            };
          }
          if (conflictProbe.evidenceRefs.length === 0) {
            return {
              status: "blocked",
              summary: "D01 no-conflict-copy probe returned no objective evidence.",
              evidenceRefs: reportResult.evidenceRefs,
            };
          }

          const mobileId = await options.mappingReader.remoteObjectId(options.mobileDevice.deviceId, options.targetPath);
          if (mobileId !== state.remoteObjectId) {
            return { status: "failed", summary: "D01 clean merge changed or lost the stable remote identity.", evidenceRefs: [...reportResult.evidenceRefs, ...conflictProbe.evidenceRefs] };
          }
          state.cleanMergeVerification = report;
          state.noConflictCopyEvidence = conflictProbe.evidenceRefs;
          return {
            status: "completed",
            evidenceRefs: [...reportResult.evidenceRefs, ...conflictProbe.evidenceRefs],
          };
        }

        if (request.operation === D01_OPERATIONS.verifyFinalConvergence) {
          if (!state.cleanMergeVerification || !state.noConflictCopyEvidence) {
            return { status: "blocked", summary: "D01 final reconciliation requires verified clean merge and no-conflict-copy evidence.", evidenceRefs: [] };
          }
          const finalId = await stableRemoteId(options, options.targetPath);
          if (finalId !== state.remoteObjectId) {
            return { status: "failed", summary: "D01 final convergence does not preserve the original stable remote identity.", evidenceRefs: [] };
          }
          const report = await options.verifier.verify(
            finalRequest(request.run, options, sentinel, state.remoteObjectId),
          );
          const result = passOrStop(report, "D01 final convergence");
          if (result.status === "completed") state.finalVerification = report;
          return result;
        }

        return { status: "blocked", summary: "Unsupported D01 verification operation: " + request.operation, evidenceRefs: [] };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== D01_OPERATIONS.recordEvidence) {
        return { status: "blocked", summary: "Unsupported D01 evidence operation: " + request.operation, evidenceRefs: [] };
      }
      const state = context(request.run);
      if (
        !state.remoteObjectId
        || !state.targetBase
        || !state.targetWindows
        || !state.targetMobile
        || !state.sentinel
        || !state.baselineVerification
        || !state.independentEditsVerification
        || !state.cleanMergeVerification
        || !state.finalVerification
        || !state.noConflictCopyEvidence
      ) {
        return { status: "blocked", summary: "D01 evidence cannot be recorded before all required verification phases complete.", evidenceRefs: [] };
      }
      try {
        const refs = await options.evidence.record({
          run: request.run,
          remoteObjectId: state.remoteObjectId,
          targetPath: options.targetPath,
          sentinelPath: options.sentinelPath,
          baseHash: D01_BASE_HASH,
          windowsEditHash: D01_WINDOWS_EDIT_HASH,
          mobileEditHash: D01_MOBILE_EDIT_HASH,
          mergedHash: D01_EXPECTED_MERGED_HASH,
          mergedSizeBytes: D01_EXPECTED_MERGED_SIZE_BYTES,
          baselineVerification: state.baselineVerification,
          independentEditsVerification: state.independentEditsVerification,
          cleanMergeVerification: state.cleanMergeVerification,
          finalVerification: state.finalVerification,
          noConflictCopyEvidence: state.noConflictCopyEvidence,
        });
        return refs.length > 0
          ? { status: "completed", evidenceRefs: refs }
          : { status: "blocked", summary: "D01 evidence recorder returned no durable evidence reference.", evidenceRefs: [] };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const prerequisites: ValidationRunnerPrerequisiteDelegate = {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "D01 constructs its trusted common BASE inside the scenario and accepts no external prerequisite.",
        evidenceRefs: [],
      }));
    },
  };

  return Object.freeze({
    scenarioId: D01_SCENARIO_ID,
    definition: createD01ScenarioDefinition({
      targetPath: options.targetPath,
      sentinelPath: options.sentinelPath,
    }),
    prerequisites,
    moduleOverrides: Object.freeze({
      "fixture-manager": fixtureDelegate,
      "cross-device-coordinator": handoffDelegate,
      "state-convergence-verifier": verifierDelegate,
      "scenario-evidence-recorder": evidenceDelegate,
    }),
  });
}
