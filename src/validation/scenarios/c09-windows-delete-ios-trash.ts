import {
  PLAN_OPERATION_KINDS,
  contractId,
  type ContentHash,
  type PlanOperationKind,
  type RemoteObjectId,
  type VaultPath,
} from "../../contracts";
import {
  validationAssertionId,
  validationEvidenceRef,
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
import type {
  ValidationRunnerApprovedModuleDelegate,
} from "../scenario-runner-module-adapter";
import type {
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStepDefinition,
} from "../scenario-runner-contracts";
import {
  validationStepId,
  type ValidationDeviceId,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type {
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const C09_SCENARIO_ID = "C09" as const;

/**
 * C09 reconstructs the C08 terminal lineage deterministically rather than
 * trusting a prior physical C08 execution. These identities deliberately match
 * the accepted C08 package so the deletion target remains the C08-equivalent
 * test-win-c08-renamed.md fixture.
 */
export const C09_TARGET_FIXTURE_ID = "c08-windows-move" as const;
export const C09_GUARD_FIXTURE_ID = "c08-unrelated-guard" as const;
export const C09_FIXTURE_ROOT = "__brain_validation__/c08" as const;
export const C09_TARGET_RELATIVE_PATH = "test-win-c08-renamed.md" as const;
export const C09_GUARD_RELATIVE_PATH = "c08-unrelated-guard.md" as const;

const path = (value: string): VaultPath => contractId<"VaultPath">(value) as VaultPath;
export const C09_TARGET_PATH = path(`${C09_FIXTURE_ROOT}/${C09_TARGET_RELATIVE_PATH}`);
export const C09_GUARD_PATH = path(`${C09_FIXTURE_ROOT}/${C09_GUARD_RELATIVE_PATH}`);

export const C09_AUTHORITY_CYCLES = Object.freeze({
  lineageWindows: "c09-lineage-windows",
  lineageMobile: "c09-lineage-mobile",
  deleteWindows: "c09-delete-windows",
  deleteMobile: "c09-delete-mobile",
} as const);

export const C09_SCENARIO_OPERATIONS = Object.freeze({
  createLineage: "c09-lineage-create",
  verifyLineage: "c09-lineage-verify",
  handoffMobile: "c09-handoff-mobile",
  handoffWindows: "c09-handoff-windows",
  deleteWindowsFixture: "c09-delete-windows-fixture",
  verifyRemoteTrash: "c09-remote-trash-verify",
  verifyMobilePreDelete: "c09-mobile-pre-delete-verify",
  verifyFinal: "c09-final-verify",
  recordEvidence: "c09-record-evidence",
} as const);

function expectedOperation(input: {
  readonly kind: PlanOperationKind;
  readonly path: VaultPath;
  readonly targetSide: "local" | "remote";
  readonly destructive: boolean;
  readonly remoteObjectId?: RemoteObjectId;
}): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind: input.kind,
    path: input.path,
    targetSide: input.targetSide,
    destructive: input.destructive,
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
  });
}

function forbiddenKinds(expectedKinds: readonly PlanOperationKind[]): readonly PlanOperationKind[] {
  const permitted = new Set<PlanOperationKind>(["noop", ...expectedKinds]);
  return Object.freeze(
    PLAN_OPERATION_KINDS.filter(kind => !permitted.has(kind)),
  );
}

function expectation(input: {
  readonly expectedOperations: readonly ValidationExpectedPlanOperation[];
  readonly expectedKinds: readonly PlanOperationKind[];
  readonly destructiveExpectation: ValidationPlanExpectation["destructiveExpectation"];
}): Omit<ValidationPlanExpectation, "run"> {
  return Object.freeze({
    expectedTrigger: "manual" as const,
    expectedOperations: Object.freeze([...input.expectedOperations]),
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: forbiddenKinds(input.expectedKinds),
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: input.destructiveExpectation,
    expectedExecutionDisposition: "safe-auto-eligible" as const,
    expectedGlobalExecutionGate: "none" as const,
  });
}

export const C09_LINEAGE_WINDOWS_EXPECTATION = expectation({
  expectedOperations: [
    expectedOperation({
      kind: "upload-create",
      path: C09_TARGET_PATH,
      targetSide: "remote",
      destructive: false,
    }),
    expectedOperation({
      kind: "upload-create",
      path: C09_GUARD_PATH,
      targetSide: "remote",
      destructive: false,
    }),
  ],
  expectedKinds: ["upload-create"],
  destructiveExpectation: "forbidden",
});

export const C09_LINEAGE_MOBILE_EXPECTATION = expectation({
  expectedOperations: [
    expectedOperation({
      kind: "download-create",
      path: C09_TARGET_PATH,
      targetSide: "local",
      destructive: false,
    }),
    expectedOperation({
      kind: "download-create",
      path: C09_GUARD_PATH,
      targetSide: "local",
      destructive: false,
    }),
  ],
  expectedKinds: ["download-create"],
  destructiveExpectation: "forbidden",
});

export const C09_MOBILE_DELETE_EXPECTATION = expectation({
  expectedOperations: [
    expectedOperation({
      kind: "trash-local",
      path: C09_TARGET_PATH,
      targetSide: "local",
      destructive: true,
    }),
  ],
  expectedKinds: ["trash-local"],
  destructiveExpectation: "allowed-exactly-as-expected",
});

function exactWindowsDeleteExpectation(
  resolveRemoteObjectId: () => RemoteObjectId | undefined,
): Omit<ValidationPlanExpectation, "run"> {
  const operation: ValidationExpectedPlanOperation = Object.freeze({
    kind: "trash-remote",
    path: C09_TARGET_PATH,
    targetSide: "remote",
    destructive: true,
    get remoteObjectId(): RemoteObjectId {
      const remoteObjectId = resolveRemoteObjectId();
      if (!remoteObjectId) {
        throw new Error(
          "C09 exact remote identity is unavailable; objective trusted-lineage verification must complete before destructive assertion.",
        );
      }
      return remoteObjectId;
    },
  });

  return expectation({
    expectedOperations: [operation],
    expectedKinds: ["trash-remote"],
    destructiveExpectation: "allowed-exactly-as-expected",
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
      assertionId: `c09:${id}`,
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

function createDefinition(
  resolveWindowsDeleteRemoteObjectId: () => RemoteObjectId | undefined,
): ValidationRunnerScenarioDefinition {
  const windowsDeleteExpectation = exactWindowsDeleteExpectation(resolveWindowsDeleteRemoteObjectId);

  return Object.freeze({
    scenarioId: C09_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      moduleStep("c09-lineage-create", "fixture-manager", C09_SCENARIO_OPERATIONS.createLineage, "operation-complete"),

      previewStep("c09-lineage-windows-preview", C09_AUTHORITY_CYCLES.lineageWindows),
      assertionStep(
        "c09-lineage-windows-assert",
        C09_AUTHORITY_CYCLES.lineageWindows,
        C09_LINEAGE_WINDOWS_EXPECTATION,
      ),
      executionStep("c09-lineage-windows-execute", C09_AUTHORITY_CYCLES.lineageWindows),

      moduleStep("c09-lineage-handoff-mobile", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffMobile, "operation-complete"),

      previewStep("c09-lineage-mobile-preview", C09_AUTHORITY_CYCLES.lineageMobile),
      assertionStep(
        "c09-lineage-mobile-assert",
        C09_AUTHORITY_CYCLES.lineageMobile,
        C09_LINEAGE_MOBILE_EXPECTATION,
      ),
      executionStep("c09-lineage-mobile-execute", C09_AUTHORITY_CYCLES.lineageMobile),

      moduleStep("c09-lineage-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyLineage, "verification-passed"),

      moduleStep("c09-delete-handoff-windows", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffWindows, "operation-complete"),
      moduleStep("c09-delete-windows-fixture", "fixture-manager", C09_SCENARIO_OPERATIONS.deleteWindowsFixture, "operation-complete"),

      previewStep("c09-delete-windows-preview", C09_AUTHORITY_CYCLES.deleteWindows),
      assertionStep(
        "c09-delete-windows-assert",
        C09_AUTHORITY_CYCLES.deleteWindows,
        windowsDeleteExpectation,
      ),
      executionStep("c09-delete-windows-execute", C09_AUTHORITY_CYCLES.deleteWindows),

      moduleStep("c09-remote-trash-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyRemoteTrash, "verification-passed"),

      moduleStep("c09-delete-handoff-mobile", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffMobile, "operation-complete"),
      moduleStep("c09-mobile-pre-delete-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyMobilePreDelete, "verification-passed"),

      previewStep("c09-delete-mobile-preview", C09_AUTHORITY_CYCLES.deleteMobile),
      assertionStep(
        "c09-delete-mobile-assert",
        C09_AUTHORITY_CYCLES.deleteMobile,
        C09_MOBILE_DELETE_EXPECTATION,
      ),
      executionStep("c09-delete-mobile-execute", C09_AUTHORITY_CYCLES.deleteMobile),

      moduleStep("c09-final-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyFinal, "verification-passed"),
      moduleStep("c09-record-evidence", "scenario-evidence-recorder", C09_SCENARIO_OPERATIONS.recordEvidence, "evidence-recorded"),
    ]),
  });
}

export type C09DeviceRole = "windows" | "mobile";

export interface C09CrossDeviceHandoffPort {
  currentRole(): C09DeviceRole;
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly targetRole: C09DeviceRole;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C09TrustedMappingReader {
  remoteObjectId(deviceId: ValidationDeviceId, path: VaultPath): Promise<RemoteObjectId | undefined>;
}

export interface C09StateVerifierPort {
  verify(request: ValidationStateConvergenceRequest): Promise<{
    readonly result: { readonly verdict: "pass" | "fail" | "blocked" };
    readonly evidence: readonly { readonly ref: ValidationEvidenceRef }[];
  }>;
}

export interface C09EvidencePort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly targetRemoteObjectId: RemoteObjectId;
    readonly guardRemoteObjectId: RemoteObjectId;
    readonly targetHash: ContentHash;
    readonly guardHash: ContentHash;
    readonly targetPath: VaultPath;
    readonly guardPath: VaultPath;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C09ScenarioBindings {
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsFixtures: Pick<ValidationFixtureManager, "create" | "delete" | "hash">;
  readonly mappingReader: C09TrustedMappingReader;
  readonly verifier: C09StateVerifierPort;
  readonly handoff: C09CrossDeviceHandoffPort;
  readonly evidence: C09EvidencePort;
}

export interface C09ScenarioPackage {
  readonly scenarioId: typeof C09_SCENARIO_ID;
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly moduleOverrides: ValidationModeModuleOverrides;
}

interface C09RunContext {
  target?: ValidationFixtureDescriptor;
  guard?: ValidationFixtureDescriptor;
  trustedRemoteObjectId?: RemoteObjectId;
  guardRemoteObjectId?: RemoteObjectId;
  lineageVerified: boolean;
  remoteTrashVerified: boolean;
}

function runKey(run: ValidationRunIdentity): string {
  return `${String(run.scenarioId)}\u0000${String(run.runId)}`;
}

function requireHash(descriptor: ValidationFixtureDescriptor, label: string): ContentHash {
  if (!descriptor.hash) throw new Error(`${label} fixture has no content hash.`);
  return descriptor.hash;
}

function stateAssertion(
  id: string,
  kind: ValidationStateAssertion["kind"],
  expectationText: string,
): ValidationStateAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject: C09_SCENARIO_ID,
    expectation: expectationText,
  });
}

function convergenceAssertion(
  id: string,
  kind: ValidationConvergenceAssertion["kind"],
  expectationText: string,
): ValidationConvergenceAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject: C09_SCENARIO_ID,
    expectation: expectationText,
  });
}

function requireRole(bindings: C09ScenarioBindings, role: C09DeviceRole): string | undefined {
  return bindings.handoff.currentRole() === role
    ? undefined
    : `C09 step requires ${role} ownership; current role is ${bindings.handoff.currentRole()}.`;
}

async function sameStableId(
  bindings: C09ScenarioBindings,
  pathValue: VaultPath,
): Promise<RemoteObjectId | undefined> {
  const [windows, mobile] = await Promise.all([
    bindings.mappingReader.remoteObjectId(bindings.windowsDeviceId, pathValue),
    bindings.mappingReader.remoteObjectId(bindings.mobileDeviceId, pathValue),
  ]);
  return windows !== undefined && windows === mobile ? windows : undefined;
}

function reportResult(
  report: Awaited<ReturnType<C09StateVerifierPort["verify"]>>,
  phase: string,
) {
  const refs = report.evidence.map(item => item.ref);
  if (report.result.verdict === "pass") {
    return refs.length > 0
      ? { status: "completed" as const, evidenceRefs: refs }
      : { status: "blocked" as const, summary: `${phase} produced no objective verification evidence.`, evidenceRefs: [] };
  }
  return {
    status: report.result.verdict === "fail" ? "failed" as const : "blocked" as const,
    summary: report.result.verdict === "fail"
      ? `${phase} objective verification failed.`
      : `${phase} required objective proof was not observable.`,
    evidenceRefs: refs,
  };
}

function lineageVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: C09ScenarioBindings;
  readonly target: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const targetContent = { hash: requireHash(input.target, "C09 target"), sizeBytes: input.target.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C09 guard"), sizeBytes: input.guard.sizeBytes };
  const devices = [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId] as const;

  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c09-lineage-target-windows-content", "local-content", "Windows contains the exact C08-equivalent target bytes."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("c09-lineage-target-mobile-content", "local-content", "Mobile contains the exact C08-equivalent target bytes."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("c09-lineage-guard-windows-content", "local-content", "Windows contains the exact unrelated C08 guard bytes."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, content: guardContent },
      { kind: "local-content", assertion: stateAssertion("c09-lineage-guard-mobile-content", "local-content", "Mobile contains the exact unrelated C08 guard bytes."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, content: guardContent },

      { kind: "remote-content", assertion: stateAssertion("c09-lineage-target-remote-content", "remote-content", "The C08-equivalent target exists remotely on one stable exact Drive object."), path: C09_TARGET_PATH, remoteObjectId: input.targetRemoteObjectId, content: targetContent },
      { kind: "remote-content", assertion: stateAssertion("c09-lineage-guard-remote-content", "remote-content", "The unrelated guard exists remotely on its own stable exact Drive object."), path: C09_GUARD_PATH, remoteObjectId: input.guardRemoteObjectId, content: guardContent },

      { kind: "base-authority", assertion: stateAssertion("c09-lineage-target-windows-base", "base-authority", "Windows BASE binds the C08-equivalent target to the exact stable Drive object."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-lineage-target-mobile-base", "base-authority", "Mobile BASE binds the C08-equivalent target to the same exact stable Drive object."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-lineage-guard-windows-base", "base-authority", "Windows BASE binds the unrelated guard to its exact stable Drive object."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedContent: guardContent },
      { kind: "base-authority", assertion: stateAssertion("c09-lineage-guard-mobile-base", "base-authority", "Mobile BASE binds the unrelated guard to the same exact stable Drive object."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedContent: guardContent },

      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-lineage-target-windows-mapping", "mapping-or-tombstone", "Windows has one live target mapping and no tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-lineage-target-mobile-mapping", "mapping-or-tombstone", "Mobile has one live target mapping and no tombstone."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-lineage-guard-windows-mapping", "mapping-or-tombstone", "Windows has one live guard mapping and no tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, expected: "mapping", remoteObjectId: input.guardRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-lineage-guard-mobile-mapping", "mapping-or-tombstone", "Mobile has one live guard mapping and no tombstone."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, expected: "mapping", remoteObjectId: input.guardRemoteObjectId, entityKind: "file" },

      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-lineage-windows-no-intents", "durable-intent-or-effect", "Windows has no outstanding durable effect after trusted-lineage construction."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-lineage-mobile-no-intents", "durable-intent-or-effect", "Mobile has no outstanding durable effect after trusted-lineage construction."), deviceId: input.bindings.mobileDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-lineage-target-content", "cross-device-content", "Windows and mobile hold identical C08-equivalent target bytes."), deviceIds: devices, path: C09_TARGET_PATH, content: targetContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-lineage-target-authority", "cross-device-authority", "Windows and mobile bind the target to the same exact Drive object with no tombstone."), deviceIds: devices, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedTombstone: false },
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-lineage-guard-content", "cross-device-content", "Windows and mobile hold identical unrelated guard bytes."), deviceIds: devices, path: C09_GUARD_PATH, content: guardContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-lineage-guard-authority", "cross-device-authority", "Windows and mobile bind the guard to the same exact Drive object with no tombstone."), deviceIds: devices, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedTombstone: false },
    ],
  };
}

function remoteTrashVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: C09ScenarioBindings;
  readonly target: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const targetContent = { hash: requireHash(input.target, "C09 target"), sizeBytes: input.target.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C09 guard"), sizeBytes: input.guard.sizeBytes };

  return {
    run: input.run,
    state: [
      { kind: "live-trash-absence-state", assertion: stateAssertion("c09-windows-exact-remote-trash", "live-trash-absence-state", "Windows production deletion trashed the exact stable C08 target object."), path: C09_TARGET_PATH, expectedState: "trashed", remoteObjectId: input.targetRemoteObjectId },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-windows-target-tombstone", "mapping-or-tombstone", "Windows deletion authority is the exact target-object tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expected: "tombstone", remoteObjectId: input.targetRemoteObjectId, entityKind: "file", deletedOn: "both" },
      { kind: "local-content", assertion: stateAssertion("c09-mobile-target-still-live", "local-content", "Mobile still has the exact target bytes before recoverable local deletion."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-mobile-target-pre-delete-mapping", "mapping-or-tombstone", "Before mobile reconciliation, mobile still binds the live target path to the exact original Drive object."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("c09-windows-trash-unrelated", "unrelated-mutation-absence", "Windows remote trash does not mutate the unrelated C08 guard."), local: [
        { deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
        { deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
      ], remote: [
        { path: C09_GUARD_PATH, state: "live", remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      ] },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-windows-trash-no-intents", "durable-intent-or-effect", "Windows has no outstanding destructive effect after exact remote trash verification."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-path", assertion: convergenceAssertion("c09-windows-target-local-absent", "cross-device-path", "The Windows participant authoritatively observes the deleted target path as absent."), deviceIds: [input.bindings.windowsDeviceId], path: C09_TARGET_PATH, expected: "absent" },
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-windows-trash-guard-content", "cross-device-content", "The unrelated guard remains identical on both participants."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId], path: C09_GUARD_PATH, content: guardContent },
    ],
  };
}

function mobilePreDeleteVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: C09ScenarioBindings;
  readonly target: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const targetContent = { hash: requireHash(input.target, "C09 target"), sizeBytes: input.target.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C09 guard"), sizeBytes: input.guard.sizeBytes };

  return {
    run: input.run,
    state: [
      { kind: "live-trash-absence-state", assertion: stateAssertion("c09-mobile-pre-delete-exact-trash", "live-trash-absence-state", "Mobile begins reconciliation only after the exact original target object is objectively trashed."), path: C09_TARGET_PATH, expectedState: "trashed", remoteObjectId: input.targetRemoteObjectId },
      { kind: "local-content", assertion: stateAssertion("c09-mobile-pre-delete-local-content", "local-content", "Mobile still holds the exact trusted target bytes immediately before production recoverable deletion."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-mobile-pre-delete-base", "base-authority", "Mobile BASE still ties the live local target to the exact original remote object before reconciliation."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-mobile-pre-delete-mapping", "mapping-or-tombstone", "Mobile live mapping still identifies the exact original remote object before trash-local planning."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("c09-mobile-pre-delete-unrelated", "unrelated-mutation-absence", "The unrelated C08 guard remains unchanged before mobile deletion."), local: [
        { deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
        { deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
      ], remote: [
        { path: C09_GUARD_PATH, state: "live", remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      ] },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-mobile-pre-delete-guard-content", "cross-device-content", "The unrelated guard remains identical on both participants before mobile deletion."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId], path: C09_GUARD_PATH, content: guardContent },
    ],
  };
}

function finalVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: C09ScenarioBindings;
  readonly target: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const guardContent = { hash: requireHash(input.guard, "C09 guard"), sizeBytes: input.guard.sizeBytes };
  const devices = [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId] as const;

  return {
    run: input.run,
    state: [
      { kind: "live-trash-absence-state", assertion: stateAssertion("c09-final-exact-remote-trash", "live-trash-absence-state", "The exact original C08 target object remains recoverably trashed."), path: C09_TARGET_PATH, expectedState: "trashed", remoteObjectId: input.targetRemoteObjectId },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-final-windows-tombstone", "mapping-or-tombstone", "Windows retains exact-object tombstone authority for the deleted target."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expected: "tombstone", remoteObjectId: input.targetRemoteObjectId, entityKind: "file", deletedOn: "both" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-final-mobile-tombstone", "mapping-or-tombstone", "Mobile converges to exact-object tombstone authority after recoverable trash-local."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expected: "tombstone", remoteObjectId: input.targetRemoteObjectId, entityKind: "file", deletedOn: "both" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-final-windows-no-intents", "durable-intent-or-effect", "Windows has no outstanding destructive effect at final convergence."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-final-mobile-no-intents", "durable-intent-or-effect", "Mobile has no outstanding recoverable deletion effect at final convergence."), deviceId: input.bindings.mobileDeviceId, expected: "none-outstanding" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("c09-final-unrelated", "unrelated-mutation-absence", "The unrelated C08 guard remains unchanged through the complete deletion scenario."), local: [
        { deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
        { deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
      ], remote: [
        { path: C09_GUARD_PATH, state: "live", remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      ] },
    ],
    convergence: [
      { kind: "cross-device-path", assertion: convergenceAssertion("c09-final-target-absence", "cross-device-path", "Windows and mobile both authoritatively observe the C08-equivalent target live path as absent."), deviceIds: devices, path: C09_TARGET_PATH, expected: "absent" },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-final-target-tombstone-authority", "cross-device-authority", "Windows and mobile converge on tombstone authority for the exact original Drive object."), deviceIds: devices, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedTombstone: true },
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-final-guard-content", "cross-device-content", "The unrelated guard remains byte-identical on both participants."), deviceIds: devices, path: C09_GUARD_PATH, content: guardContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-final-guard-authority", "cross-device-authority", "The unrelated guard retains the same stable live Drive identity on both participants."), deviceIds: devices, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedTombstone: false },
    ],
  };
}

/**
 * Creates one self-contained C09 scenario package for one ValidationModeRuntime
 * composition. The package owns only scenario fixtures, read-only verification,
 * handoff, and evidence recording. Production preview/assert/authorization/
 * execution remains exclusively bound by H6B.
 */
export function createC09ScenarioPackage(
  bindings: C09ScenarioBindings,
): C09ScenarioPackage {
  if (bindings.windowsDeviceId === bindings.mobileDeviceId) {
    throw new Error("C09 requires distinct Windows and mobile validation device identities.");
  }

  const contexts = new Map<string, C09RunContext>();
  let activeDeleteAssertionContext: C09RunContext | undefined;

  const context = (run: ValidationRunIdentity): C09RunContext => {
    const key = runKey(run);
    const existing = contexts.get(key);
    if (existing) return existing;
    const created: C09RunContext = {
      lineageVerified: false,
      remoteTrashVerified: false,
    };
    contexts.set(key, created);
    return created;
  };

  const definition = createDefinition(() => {
    const state = activeDeleteAssertionContext;
    return state?.lineageVerified === true ? state.trustedRemoteObjectId : undefined;
  });

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);

      if (request.operation === C09_SCENARIO_OPERATIONS.createLineage) {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };

        activeDeleteAssertionContext = undefined;
        state.lineageVerified = false;
        state.remoteTrashVerified = false;
        state.trustedRemoteObjectId = undefined;
        state.guardRemoteObjectId = undefined;

        try {
          state.target = await bindings.windowsFixtures.create(
            validationTextFixture(C09_TARGET_FIXTURE_ID, C09_TARGET_RELATIVE_PATH),
          );
          state.guard = await bindings.windowsFixtures.create(
            validationTextFixture(C09_GUARD_FIXTURE_ID, C09_GUARD_RELATIVE_PATH),
          );

          if (
            state.target.path !== C09_TARGET_PATH
            || state.target.relativePath !== C09_TARGET_RELATIVE_PATH
            || state.guard.path !== C09_GUARD_PATH
            || state.guard.relativePath !== C09_GUARD_RELATIVE_PATH
          ) {
            return {
              status: "failed",
              summary: "C09 fixture manager did not construct the exact C08-equivalent target/guard paths.",
              evidenceRefs: [],
            };
          }

          requireHash(state.target, "C09 target");
          requireHash(state.guard, "C09 guard");
          return { status: "completed", evidenceRefs: [] };
        } catch (error) {
          return {
            status: "failed",
            summary: error instanceof Error ? error.message : String(error),
            evidenceRefs: [],
          };
        }
      }

      if (request.operation === C09_SCENARIO_OPERATIONS.deleteWindowsFixture) {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
        if (!state.lineageVerified || !state.target || !state.trustedRemoteObjectId) {
          return {
            status: "blocked",
            summary: "C09 Windows deletion is prohibited until objective trusted-lineage verification establishes exact target authority.",
            evidenceRefs: [],
          };
        }

        try {
          const prior = state.target;
          const priorHash = requireHash(prior, "C09 target");
          const deleted = await bindings.windowsFixtures.delete(C09_TARGET_FIXTURE_ID);
          if (
            deleted.path !== C09_TARGET_PATH
            || deleted.relativePath !== C09_TARGET_RELATIVE_PATH
            || requireHash(deleted, "C09 deleted target") !== priorHash
            || deleted.sizeBytes !== prior.sizeBytes
          ) {
            return {
              status: "failed",
              summary: "C09 Windows fixture deletion did not preserve the exact trusted target descriptor.",
              evidenceRefs: [],
            };
          }
          state.target = deleted;
          return { status: "completed", evidenceRefs: [] };
        } catch (error) {
          return {
            status: "failed",
            summary: error instanceof Error ? error.message : String(error),
            evidenceRefs: [],
          };
        }
      }

      return {
        status: "blocked",
        summary: `Unsupported C09 fixture operation: ${request.operation}`,
        evidenceRefs: [],
      };
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const targetRole = request.operation === C09_SCENARIO_OPERATIONS.handoffMobile
        ? "mobile"
        : request.operation === C09_SCENARIO_OPERATIONS.handoffWindows
          ? "windows"
          : undefined;

      if (!targetRole) {
        return {
          status: "blocked",
          summary: `Unsupported C09 handoff operation: ${request.operation}`,
          evidenceRefs: [],
        };
      }

      try {
        const evidenceRefs = await bindings.handoff.handoff({
          run: request.run,
          stepId: request.stepId,
          targetRole,
        });
        if (bindings.handoff.currentRole() !== targetRole) {
          return {
            status: "blocked",
            summary: `C09 handoff did not establish ${targetRole} step ownership.`,
            evidenceRefs,
          };
        }
        return { status: "completed", evidenceRefs };
      } catch (error) {
        return {
          status: "blocked",
          summary: error instanceof Error ? error.message : String(error),
          evidenceRefs: [],
        };
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);
      if (!state.target || !state.guard) {
        return {
          status: "blocked",
          summary: "C09 deterministic C08-equivalent fixtures have not been constructed.",
          evidenceRefs: [],
        };
      }

      try {
        if (request.operation === C09_SCENARIO_OPERATIONS.verifyLineage) {
          const targetRemoteObjectId = await sameStableId(bindings, C09_TARGET_PATH);
          const guardRemoteObjectId = await sameStableId(bindings, C09_GUARD_PATH);
          if (
            !targetRemoteObjectId
            || !guardRemoteObjectId
            || targetRemoteObjectId === guardRemoteObjectId
          ) {
            return {
              status: "failed",
              summary: "C09 trusted-lineage construction did not establish distinct stable Drive identities on both participants.",
              evidenceRefs: [],
            };
          }

          const report = await bindings.verifier.verify(lineageVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId,
            guardRemoteObjectId,
          }));
          const result = reportResult(report, "C09 trusted lineage");
          if (result.status === "completed") {
            state.trustedRemoteObjectId = targetRemoteObjectId;
            state.guardRemoteObjectId = guardRemoteObjectId;
            state.lineageVerified = true;
            activeDeleteAssertionContext = state;
          }
          return result;
        }

        if (!state.lineageVerified || !state.trustedRemoteObjectId || !state.guardRemoteObjectId) {
          return {
            status: "blocked",
            summary: "C09 exact stable target/guard authority is unavailable because trusted-lineage verification did not complete.",
            evidenceRefs: [],
          };
        }

        if (request.operation === C09_SCENARIO_OPERATIONS.verifyRemoteTrash) {
          const roleProblem = requireRole(bindings, "windows");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };

          const report = await bindings.verifier.verify(remoteTrashVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId: state.trustedRemoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          }));
          const result = reportResult(report, "C09 Windows exact-object remote trash");
          if (result.status === "completed") state.remoteTrashVerified = true;
          return result;
        }

        if (request.operation === C09_SCENARIO_OPERATIONS.verifyMobilePreDelete) {
          const roleProblem = requireRole(bindings, "mobile");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
          if (!state.remoteTrashVerified) {
            return {
              status: "blocked",
              summary: "C09 mobile deletion is prohibited until the exact remote trash outcome is objectively verified.",
              evidenceRefs: [],
            };
          }

          return reportResult(await bindings.verifier.verify(mobilePreDeleteVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId: state.trustedRemoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          })), "C09 mobile pre-delete authority");
        }

        if (request.operation === C09_SCENARIO_OPERATIONS.verifyFinal) {
          const roleProblem = requireRole(bindings, "mobile");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };

          return reportResult(await bindings.verifier.verify(finalVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId: state.trustedRemoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          })), "C09 final tombstone convergence");
        }

        return {
          status: "blocked",
          summary: `Unsupported C09 verification operation: ${request.operation}`,
          evidenceRefs: [],
        };
      } catch (error) {
        return {
          status: "blocked",
          summary: error instanceof Error ? error.message : String(error),
          evidenceRefs: [],
        };
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== C09_SCENARIO_OPERATIONS.recordEvidence) {
        return {
          status: "blocked",
          summary: `Unsupported C09 evidence operation: ${request.operation}`,
          evidenceRefs: [],
        };
      }

      const state = context(request.run);
      if (
        !state.target
        || !state.guard
        || !state.lineageVerified
        || !state.remoteTrashVerified
        || !state.trustedRemoteObjectId
        || !state.guardRemoteObjectId
      ) {
        return {
          status: "blocked",
          summary: "C09 evidence cannot be recorded without complete trusted-lineage and deletion verification context.",
          evidenceRefs: [],
        };
      }

      try {
        const refs = await bindings.evidence.record({
          run: request.run,
          targetRemoteObjectId: state.trustedRemoteObjectId,
          guardRemoteObjectId: state.guardRemoteObjectId,
          targetHash: requireHash(state.target, "C09 target"),
          guardHash: requireHash(state.guard, "C09 guard"),
          targetPath: C09_TARGET_PATH,
          guardPath: C09_GUARD_PATH,
        });
        return refs.length > 0
          ? { status: "completed", evidenceRefs: refs }
          : { status: "blocked", summary: "C09 evidence recorder returned no durable evidence reference.", evidenceRefs: [] };
      } catch (error) {
        return {
          status: "blocked",
          summary: error instanceof Error ? error.message : String(error),
          evidenceRefs: [],
        };
      }
    },
  };

  const moduleOverrides: ValidationModeModuleOverrides = Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": handoffDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });

  return Object.freeze({
    scenarioId: C09_SCENARIO_ID,
    definition,
    moduleOverrides,
  });
}

export function c09EvidenceRef(value: string): ValidationEvidenceRef {
  return validationEvidenceRef(`c09:${value}`);
}
