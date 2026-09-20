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
 * C09 reconstructs the accepted C08 lineage inside its own disposable run.
 * The target/guard IDs, namespace, source name, and terminal renamed name are
 * intentionally the C08 identities. No prior physical C08 execution is trusted.
 */
export const C09_TARGET_FIXTURE_ID = "c08-windows-move" as const;
export const C09_GUARD_FIXTURE_ID = "c08-unrelated-guard" as const;
export const C09_FIXTURE_ROOT = "__brain_validation__/c08" as const;
export const C09_SOURCE_RELATIVE_PATH = "test-win-c06.md" as const;
export const C09_TARGET_RELATIVE_PATH = "test-win-c08-renamed.md" as const;
export const C09_GUARD_RELATIVE_PATH = "c08-unrelated-guard.md" as const;

const path = (value: string): VaultPath => contractId<"VaultPath">(value) as VaultPath;
export const C09_SOURCE_PATH = path(C09_FIXTURE_ROOT + "/" + C09_SOURCE_RELATIVE_PATH);
export const C09_TARGET_PATH = path(C09_FIXTURE_ROOT + "/" + C09_TARGET_RELATIVE_PATH);
export const C09_GUARD_PATH = path(C09_FIXTURE_ROOT + "/" + C09_GUARD_RELATIVE_PATH);

export const C09_AUTHORITY_CYCLES = Object.freeze({
  seedWindows: "c09-seed-windows",
  seedMobile: "c09-seed-mobile",
  moveWindows: "c09-move-windows",
  moveMobile: "c09-move-mobile",
  deleteWindows: "c09-delete-windows",
  deleteMobile: "c09-delete-mobile",
} as const);

export const C09_SCENARIO_OPERATIONS = Object.freeze({
  createSeed: "c09-seed-create",
  verifySeed: "c09-seed-verify",
  moveWindowsFixture: "c09-move-windows-fixture",
  verifyRemoteMove: "c09-remote-move-verify",
  verifyTrustedLineage: "c09-trusted-lineage-verify",
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
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
  readonly remoteObjectId?: RemoteObjectId;
}): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind: input.kind,
    path: input.path,
    targetSide: input.targetSide,
    destructive: input.destructive,
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
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

export const C09_SEED_WINDOWS_EXPECTATION = expectation({
  expectedOperations: [
    expectedOperation({
      kind: "upload-create",
      path: C09_SOURCE_PATH,
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

export const C09_SEED_MOBILE_EXPECTATION = expectation({
  expectedOperations: [
    expectedOperation({
      kind: "download-create",
      path: C09_SOURCE_PATH,
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

export const C09_MOVE_WINDOWS_EXPECTATION = expectation({
  expectedOperations: [
    expectedOperation({
      kind: "identity-preserving-move",
      path: C09_TARGET_PATH,
      targetSide: "remote",
      destructive: false,
      fromPath: C09_SOURCE_PATH,
      toPath: C09_TARGET_PATH,
    }),
  ],
  expectedKinds: ["identity-preserving-move"],
  destructiveExpectation: "forbidden",
});

export const C09_MOVE_MOBILE_EXPECTATION = expectation({
  expectedOperations: [
    expectedOperation({
      kind: "identity-preserving-move",
      path: C09_TARGET_PATH,
      targetSide: "local",
      destructive: false,
      fromPath: C09_SOURCE_PATH,
      toPath: C09_TARGET_PATH,
    }),
  ],
  expectedKinds: ["identity-preserving-move"],
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

/**
 * The exact Drive ID is not caller input. It becomes readable only after the
 * objective C08-equivalent trusted-lineage verifier has passed. H6B reads this
 * operation during its fixed assertion step and issues the authorization.
 */
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
          "C09 exact remote identity is unavailable; objective C08-equivalent trusted-lineage verification must complete before destructive assertion.",
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
      assertionId: "c09:" + id,
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
      moduleStep("c09-seed-create", "fixture-manager", C09_SCENARIO_OPERATIONS.createSeed, "operation-complete"),

      previewStep("c09-seed-windows-preview", C09_AUTHORITY_CYCLES.seedWindows),
      assertionStep("c09-seed-windows-assert", C09_AUTHORITY_CYCLES.seedWindows, C09_SEED_WINDOWS_EXPECTATION),
      executionStep("c09-seed-windows-execute", C09_AUTHORITY_CYCLES.seedWindows),

      moduleStep("c09-seed-handoff-mobile", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffMobile, "operation-complete"),

      previewStep("c09-seed-mobile-preview", C09_AUTHORITY_CYCLES.seedMobile),
      assertionStep("c09-seed-mobile-assert", C09_AUTHORITY_CYCLES.seedMobile, C09_SEED_MOBILE_EXPECTATION),
      executionStep("c09-seed-mobile-execute", C09_AUTHORITY_CYCLES.seedMobile),

      moduleStep("c09-seed-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifySeed, "verification-passed"),

      moduleStep("c09-move-handoff-windows", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffWindows, "operation-complete"),
      moduleStep("c09-move-windows-fixture", "fixture-manager", C09_SCENARIO_OPERATIONS.moveWindowsFixture, "operation-complete"),

      previewStep("c09-move-windows-preview", C09_AUTHORITY_CYCLES.moveWindows),
      assertionStep("c09-move-windows-assert", C09_AUTHORITY_CYCLES.moveWindows, C09_MOVE_WINDOWS_EXPECTATION),
      executionStep("c09-move-windows-execute", C09_AUTHORITY_CYCLES.moveWindows),

      moduleStep("c09-remote-move-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyRemoteMove, "verification-passed"),

      moduleStep("c09-move-handoff-mobile", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffMobile, "operation-complete"),

      previewStep("c09-move-mobile-preview", C09_AUTHORITY_CYCLES.moveMobile),
      assertionStep("c09-move-mobile-assert", C09_AUTHORITY_CYCLES.moveMobile, C09_MOVE_MOBILE_EXPECTATION),
      executionStep("c09-move-mobile-execute", C09_AUTHORITY_CYCLES.moveMobile),

      moduleStep("c09-trusted-lineage-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyTrustedLineage, "verification-passed"),

      moduleStep("c09-delete-handoff-windows", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffWindows, "operation-complete"),
      moduleStep("c09-delete-windows-fixture", "fixture-manager", C09_SCENARIO_OPERATIONS.deleteWindowsFixture, "operation-complete"),

      previewStep("c09-delete-windows-preview", C09_AUTHORITY_CYCLES.deleteWindows),
      assertionStep("c09-delete-windows-assert", C09_AUTHORITY_CYCLES.deleteWindows, windowsDeleteExpectation),
      executionStep("c09-delete-windows-execute", C09_AUTHORITY_CYCLES.deleteWindows),

      moduleStep("c09-remote-trash-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyRemoteTrash, "verification-passed"),

      moduleStep("c09-delete-handoff-mobile", "cross-device-coordinator", C09_SCENARIO_OPERATIONS.handoffMobile, "operation-complete"),
      moduleStep("c09-mobile-pre-delete-verify", "state-convergence-verifier", C09_SCENARIO_OPERATIONS.verifyMobilePreDelete, "verification-passed"),

      previewStep("c09-delete-mobile-preview", C09_AUTHORITY_CYCLES.deleteMobile),
      assertionStep("c09-delete-mobile-assert", C09_AUTHORITY_CYCLES.deleteMobile, C09_MOBILE_DELETE_EXPECTATION),
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
    readonly sourcePath: VaultPath;
    readonly targetPath: VaultPath;
    readonly guardPath: VaultPath;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C09ScenarioBindings {
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsFixtures: Pick<ValidationFixtureManager, "create" | "move" | "delete" | "hash">;
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
  seedRemoteObjectId?: RemoteObjectId;
  guardRemoteObjectId?: RemoteObjectId;
  seedVerified: boolean;
  trustedLineageVerified: boolean;
  remoteTrashVerified: boolean;
}

function runKey(run: ValidationRunIdentity): string {
  return String(run.scenarioId) + "\u0000" + String(run.runId);
}

function requireHash(descriptor: ValidationFixtureDescriptor, label: string): ContentHash {
  if (!descriptor.hash) throw new Error(label + " fixture has no content hash.");
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
    : "C09 step requires " + role + " ownership; current role is " + bindings.handoff.currentRole() + ".";
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
      : { status: "blocked" as const, summary: phase + " produced no objective verification evidence.", evidenceRefs: [] };
  }
  return {
    status: report.result.verdict === "fail" ? "failed" as const : "blocked" as const,
    summary: report.result.verdict === "fail"
      ? phase + " objective verification failed."
      : phase + " required objective proof was not observable.",
    evidenceRefs: refs,
  };
}

function seedVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: C09ScenarioBindings;
  readonly target: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const targetContent = { hash: requireHash(input.target, "C09 seed target"), sizeBytes: input.target.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C09 guard"), sizeBytes: input.guard.sizeBytes };
  const devices = [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId] as const;

  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c09-seed-target-windows-content", "local-content", "Windows contains the deterministic C08 source fixture bytes."), deviceId: input.bindings.windowsDeviceId, path: C09_SOURCE_PATH, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("c09-seed-target-mobile-content", "local-content", "Mobile contains the deterministic C08 source fixture bytes."), deviceId: input.bindings.mobileDeviceId, path: C09_SOURCE_PATH, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("c09-seed-guard-windows-content", "local-content", "Windows contains the deterministic unrelated C08 guard bytes."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, content: guardContent },
      { kind: "local-content", assertion: stateAssertion("c09-seed-guard-mobile-content", "local-content", "Mobile contains the deterministic unrelated C08 guard bytes."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, content: guardContent },

      { kind: "remote-content", assertion: stateAssertion("c09-seed-target-remote-content", "remote-content", "The C08 source fixture exists remotely on one exact Drive object."), path: C09_SOURCE_PATH, remoteObjectId: input.targetRemoteObjectId, content: targetContent },
      { kind: "remote-content", assertion: stateAssertion("c09-seed-guard-remote-content", "remote-content", "The unrelated guard exists remotely on its own exact Drive object."), path: C09_GUARD_PATH, remoteObjectId: input.guardRemoteObjectId, content: guardContent },

      { kind: "base-authority", assertion: stateAssertion("c09-seed-target-windows-base", "base-authority", "Windows BASE binds the C08 source fixture to the exact Drive object."), deviceId: input.bindings.windowsDeviceId, path: C09_SOURCE_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-seed-target-mobile-base", "base-authority", "Mobile BASE binds the C08 source fixture to the same exact Drive object."), deviceId: input.bindings.mobileDeviceId, path: C09_SOURCE_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-seed-guard-windows-base", "base-authority", "Windows BASE binds the unrelated guard to its exact Drive object."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedContent: guardContent },
      { kind: "base-authority", assertion: stateAssertion("c09-seed-guard-mobile-base", "base-authority", "Mobile BASE binds the unrelated guard to the same exact Drive object."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedContent: guardContent },

      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-seed-target-windows-mapping", "mapping-or-tombstone", "Windows has one live C08 source mapping and no tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_SOURCE_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-seed-target-mobile-mapping", "mapping-or-tombstone", "Mobile has one live C08 source mapping and no tombstone."), deviceId: input.bindings.mobileDeviceId, path: C09_SOURCE_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-seed-guard-windows-mapping", "mapping-or-tombstone", "Windows has one live guard mapping and no tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, expected: "mapping", remoteObjectId: input.guardRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-seed-guard-mobile-mapping", "mapping-or-tombstone", "Mobile has one live guard mapping and no tombstone."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, expected: "mapping", remoteObjectId: input.guardRemoteObjectId, entityKind: "file" },

      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-seed-windows-no-intents", "durable-intent-or-effect", "Windows has no outstanding durable effect after seed synchronization."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-seed-mobile-no-intents", "durable-intent-or-effect", "Mobile has no outstanding durable effect after seed synchronization."), deviceId: input.bindings.mobileDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-seed-target-content", "cross-device-content", "Windows and mobile share identical C08 source fixture bytes."), deviceIds: devices, path: C09_SOURCE_PATH, content: targetContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-seed-target-authority", "cross-device-authority", "Windows and mobile bind the C08 source path to one exact Drive object."), deviceIds: devices, path: C09_SOURCE_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedTombstone: false },
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-seed-guard-content", "cross-device-content", "The unrelated guard is identical on both participants."), deviceIds: devices, path: C09_GUARD_PATH, content: guardContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-seed-guard-authority", "cross-device-authority", "Both participants bind the guard to the same exact Drive object."), deviceIds: devices, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedTombstone: false },
    ],
  };
}

function remoteMoveVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: C09ScenarioBindings;
  readonly target: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const targetContent = { hash: requireHash(input.target, "C09 moved target"), sizeBytes: input.target.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C09 guard"), sizeBytes: input.guard.sizeBytes };

  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c09-move-windows-target-content", "local-content", "Windows moved target retains the deterministic C08 bytes."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "live-trash-absence-state", assertion: stateAssertion("c09-move-remote-old-absent", "live-trash-absence-state", "The old C08 source path is absent remotely after identity-preserving move."), path: C09_SOURCE_PATH, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c09-move-remote-target-content", "remote-content", "The exact original Drive object is live at test-win-c08-renamed.md with unchanged bytes."), path: C09_TARGET_PATH, remoteObjectId: input.targetRemoteObjectId, content: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-move-windows-target-base", "base-authority", "Windows BASE follows the same exact Drive object to the C08 renamed path."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-move-windows-target-mapping", "mapping-or-tombstone", "Windows mapping follows the same exact Drive object to the C08 renamed path."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-move-windows-source-cleared", "mapping-or-tombstone", "Windows old C08 source path has neither mapping nor tombstone after move."), deviceId: input.bindings.windowsDeviceId, path: C09_SOURCE_PATH, expected: "neither" },
      { kind: "local-content", assertion: stateAssertion("c09-move-mobile-source-still-live", "local-content", "Mobile still has the C08 source path before its production move."), deviceId: input.bindings.mobileDeviceId, path: C09_SOURCE_PATH, content: targetContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-move-mobile-source-mapping", "mapping-or-tombstone", "Mobile still maps the C08 source path to the same exact Drive object before reconciliation."), deviceId: input.bindings.mobileDeviceId, path: C09_SOURCE_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("c09-move-unrelated", "unrelated-mutation-absence", "The unrelated C08 guard is unchanged while Windows moves the target."), local: [
        { deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
        { deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
      ], remote: [
        { path: C09_GUARD_PATH, state: "live", remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      ] },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-move-windows-no-intents", "durable-intent-or-effect", "Windows has no outstanding durable effect after remote move verification."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-move-guard-content", "cross-device-content", "The unrelated guard remains identical on both participants."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId], path: C09_GUARD_PATH, content: guardContent },
    ],
  };
}

function trustedLineageVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: C09ScenarioBindings;
  readonly target: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const targetContent = { hash: requireHash(input.target, "C09 trusted target"), sizeBytes: input.target.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C09 guard"), sizeBytes: input.guard.sizeBytes };
  const devices = [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId] as const;

  return {
    run: input.run,
    state: [
      { kind: "live-trash-absence-state", assertion: stateAssertion("c09-trusted-source-remote-absent", "live-trash-absence-state", "The C08 source path remains absent remotely after both production moves."), path: C09_SOURCE_PATH, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c09-trusted-target-remote-content", "remote-content", "The exact original Drive object is live at test-win-c08-renamed.md with unchanged bytes."), path: C09_TARGET_PATH, remoteObjectId: input.targetRemoteObjectId, content: targetContent },

      { kind: "local-content", assertion: stateAssertion("c09-trusted-target-windows-content", "local-content", "Windows contains the exact C08 renamed target bytes."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "local-content", assertion: stateAssertion("c09-trusted-target-mobile-content", "local-content", "Mobile contains the exact C08 renamed target bytes."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, content: targetContent },

      { kind: "base-authority", assertion: stateAssertion("c09-trusted-target-windows-base", "base-authority", "Windows BASE binds test-win-c08-renamed.md to the exact original Drive object."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-trusted-target-mobile-base", "base-authority", "Mobile BASE binds test-win-c08-renamed.md to the same exact original Drive object."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },

      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trusted-target-windows-mapping", "mapping-or-tombstone", "Windows has one live mapping for the C08 renamed target and no tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trusted-target-mobile-mapping", "mapping-or-tombstone", "Mobile has one live mapping for the C08 renamed target and no tombstone."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trusted-source-windows-cleared", "mapping-or-tombstone", "Windows old C08 source path has neither mapping nor tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_SOURCE_PATH, expected: "neither" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trusted-source-mobile-cleared", "mapping-or-tombstone", "Mobile old C08 source path has neither mapping nor tombstone."), deviceId: input.bindings.mobileDeviceId, path: C09_SOURCE_PATH, expected: "neither" },

      { kind: "local-content", assertion: stateAssertion("c09-trusted-guard-windows-content", "local-content", "Windows retains the unrelated C08 guard bytes."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, content: guardContent },
      { kind: "local-content", assertion: stateAssertion("c09-trusted-guard-mobile-content", "local-content", "Mobile retains the unrelated C08 guard bytes."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, content: guardContent },
      { kind: "remote-content", assertion: stateAssertion("c09-trusted-guard-remote-content", "remote-content", "The unrelated guard remains live on its exact Drive object."), path: C09_GUARD_PATH, remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      { kind: "base-authority", assertion: stateAssertion("c09-trusted-guard-windows-base", "base-authority", "Windows BASE retains exact guard authority."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedContent: guardContent },
      { kind: "base-authority", assertion: stateAssertion("c09-trusted-guard-mobile-base", "base-authority", "Mobile BASE retains exact guard authority."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedContent: guardContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trusted-guard-windows-mapping", "mapping-or-tombstone", "Windows guard mapping remains live."), deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, expected: "mapping", remoteObjectId: input.guardRemoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trusted-guard-mobile-mapping", "mapping-or-tombstone", "Mobile guard mapping remains live."), deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, expected: "mapping", remoteObjectId: input.guardRemoteObjectId, entityKind: "file" },

      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-trusted-windows-no-intents", "durable-intent-or-effect", "Windows has no outstanding durable effect at C08-equivalent lineage freeze."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-trusted-mobile-no-intents", "durable-intent-or-effect", "Mobile has no outstanding durable effect at C08-equivalent lineage freeze."), deviceId: input.bindings.mobileDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-trusted-target-content", "cross-device-content", "Windows and mobile converge on exact C08 renamed target bytes."), deviceIds: devices, path: C09_TARGET_PATH, content: targetContent },
      { kind: "cross-device-path", assertion: convergenceAssertion("c09-trusted-source-absent", "cross-device-path", "The old C08 source path is absent on both participants."), deviceIds: devices, path: C09_SOURCE_PATH, expected: "absent" },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-trusted-target-authority", "cross-device-authority", "Windows and mobile bind test-win-c08-renamed.md to the same original Drive object with no tombstone."), deviceIds: devices, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedTombstone: false },
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-trusted-guard-content", "cross-device-content", "The unrelated C08 guard remains identical on both participants."), deviceIds: devices, path: C09_GUARD_PATH, content: guardContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-trusted-guard-authority", "cross-device-authority", "Both participants retain the guard's exact live Drive identity."), deviceIds: devices, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedTombstone: false },
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
      { kind: "live-trash-absence-state", assertion: stateAssertion("c09-trash-exact-remote-object", "live-trash-absence-state", "Windows production deletion trashed the exact original C08 Drive object."), path: C09_TARGET_PATH, expectedState: "trashed", remoteObjectId: input.targetRemoteObjectId },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trash-windows-tombstone", "mapping-or-tombstone", "Windows deletion authority is the exact target-object tombstone."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expected: "tombstone", remoteObjectId: input.targetRemoteObjectId, entityKind: "file", deletedOn: "both" },
      { kind: "local-content", assertion: stateAssertion("c09-trash-mobile-target-live", "local-content", "Mobile still has the exact renamed target bytes before recoverable local deletion."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-trash-mobile-target-mapping", "mapping-or-tombstone", "Before mobile reconciliation, mobile still binds the renamed path to the exact original Drive object."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expected: "mapping", remoteObjectId: input.targetRemoteObjectId, entityKind: "file" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("c09-trash-unrelated", "unrelated-mutation-absence", "Windows remote trash does not mutate the unrelated C08 guard."), local: [
        { deviceId: input.bindings.windowsDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
        { deviceId: input.bindings.mobileDeviceId, path: C09_GUARD_PATH, state: "file", content: guardContent },
      ], remote: [
        { path: C09_GUARD_PATH, state: "live", remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      ] },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c09-trash-windows-no-intents", "durable-intent-or-effect", "Windows has no outstanding destructive effect after exact remote trash verification."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-path", assertion: convergenceAssertion("c09-trash-windows-target-absent", "cross-device-path", "The Windows participant authoritatively observes the deleted renamed target path as absent."), deviceIds: [input.bindings.windowsDeviceId], path: C09_TARGET_PATH, expected: "absent" },
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-trash-guard-content", "cross-device-content", "The unrelated guard remains identical on both participants."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDeviceId], path: C09_GUARD_PATH, content: guardContent },
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
      { kind: "local-content", assertion: stateAssertion("c09-mobile-pre-delete-content", "local-content", "Mobile still holds exact C08 renamed target bytes before production recoverable deletion."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, content: targetContent },
      { kind: "base-authority", assertion: stateAssertion("c09-mobile-pre-delete-base", "base-authority", "Mobile BASE still ties the live renamed target to the exact original remote object."), deviceId: input.bindings.mobileDeviceId, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedContent: targetContent },
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

function finalDeletionVerificationRequest(input: {
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
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c09-final-windows-tombstone", "mapping-or-tombstone", "Windows retains exact-object tombstone authority for the deleted renamed target."), deviceId: input.bindings.windowsDeviceId, path: C09_TARGET_PATH, expected: "tombstone", remoteObjectId: input.targetRemoteObjectId, entityKind: "file", deletedOn: "both" },
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
      { kind: "cross-device-path", assertion: convergenceAssertion("c09-final-target-absence", "cross-device-path", "Windows and mobile both authoritatively observe test-win-c08-renamed.md as absent."), deviceIds: devices, path: C09_TARGET_PATH, expected: "absent" },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-final-target-tombstone-authority", "cross-device-authority", "Windows and mobile converge on tombstone authority for the exact original Drive object."), deviceIds: devices, path: C09_TARGET_PATH, expectedRemoteObjectId: input.targetRemoteObjectId, expectedTombstone: true },
      { kind: "cross-device-content", assertion: convergenceAssertion("c09-final-guard-content", "cross-device-content", "The unrelated guard remains byte-identical on both participants."), deviceIds: devices, path: C09_GUARD_PATH, content: guardContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c09-final-guard-authority", "cross-device-authority", "The unrelated guard retains the same stable live Drive identity on both participants."), deviceIds: devices, path: C09_GUARD_PATH, expectedRemoteObjectId: input.guardRemoteObjectId, expectedTombstone: false },
    ],
  };
}

/**
 * Creates one self-contained C09 scenario package for one ValidationModeRuntime
 * composition. C09 owns only fixture setup/mutation, read-only verification,
 * handoff, and evidence recording. H6B exclusively owns production preview,
 * plan assertion, assertion-derived authorization, and production execution.
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
      seedVerified: false,
      trustedLineageVerified: false,
      remoteTrashVerified: false,
    };
    contexts.set(key, created);
    return created;
  };

  const definition = createDefinition(() => {
    const state = activeDeleteAssertionContext;
    return state?.trustedLineageVerified === true ? state.seedRemoteObjectId : undefined;
  });

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);

      if (request.operation === C09_SCENARIO_OPERATIONS.createSeed) {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };

        activeDeleteAssertionContext = undefined;
        state.seedVerified = false;
        state.trustedLineageVerified = false;
        state.remoteTrashVerified = false;
        state.seedRemoteObjectId = undefined;
        state.guardRemoteObjectId = undefined;

        try {
          state.target = await bindings.windowsFixtures.create(
            validationTextFixture(C09_TARGET_FIXTURE_ID, C09_SOURCE_RELATIVE_PATH),
          );
          state.guard = await bindings.windowsFixtures.create(
            validationTextFixture(C09_GUARD_FIXTURE_ID, C09_GUARD_RELATIVE_PATH),
          );

          if (
            state.target.path !== C09_SOURCE_PATH
            || state.target.relativePath !== C09_SOURCE_RELATIVE_PATH
            || state.guard.path !== C09_GUARD_PATH
            || state.guard.relativePath !== C09_GUARD_RELATIVE_PATH
          ) {
            return {
              status: "failed",
              summary: "C09 fixture manager did not construct the exact C08 source/guard paths.",
              evidenceRefs: [],
            };
          }

          requireHash(state.target, "C09 seed target");
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

      if (request.operation === C09_SCENARIO_OPERATIONS.moveWindowsFixture) {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
        if (!state.seedVerified || !state.target || !state.seedRemoteObjectId) {
          return {
            status: "blocked",
            summary: "C09 C08-equivalent move is prohibited until objective seed-lineage verification passes.",
            evidenceRefs: [],
          };
        }

        try {
          const priorHash = requireHash(state.target, "C09 seed target");
          const priorSize = state.target.sizeBytes;
          const moved = await bindings.windowsFixtures.move(C09_TARGET_FIXTURE_ID, C09_TARGET_RELATIVE_PATH);
          const observedHash = await bindings.windowsFixtures.hash(C09_TARGET_FIXTURE_ID);
          if (
            moved.path !== C09_TARGET_PATH
            || moved.relativePath !== C09_TARGET_RELATIVE_PATH
            || moved.sizeBytes !== priorSize
            || requireHash(moved, "C09 moved target") !== priorHash
            || observedHash !== priorHash
          ) {
            return {
              status: "failed",
              summary: "C09 C08-equivalent Windows move changed fixture bytes/path identity.",
              evidenceRefs: [],
            };
          }
          state.target = moved;
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
        if (!state.trustedLineageVerified || !state.target || !state.seedRemoteObjectId) {
          return {
            status: "blocked",
            summary: "C09 Windows deletion is prohibited until objective C08-equivalent trusted-lineage verification establishes exact target authority.",
            evidenceRefs: [],
          };
        }

        try {
          const prior = state.target;
          const priorHash = requireHash(prior, "C09 trusted target");
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
        summary: "Unsupported C09 fixture operation: " + request.operation,
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
          summary: "Unsupported C09 handoff operation: " + request.operation,
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
            summary: "C09 handoff did not establish " + targetRole + " step ownership.",
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
          summary: "C09 deterministic C08 fixtures have not been constructed.",
          evidenceRefs: [],
        };
      }

      try {
        if (request.operation === C09_SCENARIO_OPERATIONS.verifySeed) {
          const targetRemoteObjectId = await sameStableId(bindings, C09_SOURCE_PATH);
          const guardRemoteObjectId = await sameStableId(bindings, C09_GUARD_PATH);
          if (
            !targetRemoteObjectId
            || !guardRemoteObjectId
            || targetRemoteObjectId === guardRemoteObjectId
          ) {
            return {
              status: "failed",
              summary: "C09 seed construction did not establish distinct stable Drive identities on both participants.",
              evidenceRefs: [],
            };
          }

          const report = await bindings.verifier.verify(seedVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId,
            guardRemoteObjectId,
          }));
          const result = reportResult(report, "C09 seed lineage");
          if (result.status === "completed") {
            state.seedRemoteObjectId = targetRemoteObjectId;
            state.guardRemoteObjectId = guardRemoteObjectId;
            state.seedVerified = true;
          }
          return result;
        }

        if (!state.seedVerified || !state.seedRemoteObjectId || !state.guardRemoteObjectId) {
          return {
            status: "blocked",
            summary: "C09 stable seed authority is unavailable because objective seed verification did not complete.",
            evidenceRefs: [],
          };
        }

        if (request.operation === C09_SCENARIO_OPERATIONS.verifyRemoteMove) {
          const roleProblem = requireRole(bindings, "windows");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };

          return reportResult(await bindings.verifier.verify(remoteMoveVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId: state.seedRemoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          })), "C09 C08-equivalent remote move");
        }

        if (request.operation === C09_SCENARIO_OPERATIONS.verifyTrustedLineage) {
          const roleProblem = requireRole(bindings, "mobile");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };

          const finalWindowsId = await bindings.mappingReader.remoteObjectId(bindings.windowsDeviceId, C09_TARGET_PATH);
          const finalMobileId = await bindings.mappingReader.remoteObjectId(bindings.mobileDeviceId, C09_TARGET_PATH);
          const guardWindowsId = await bindings.mappingReader.remoteObjectId(bindings.windowsDeviceId, C09_GUARD_PATH);
          const guardMobileId = await bindings.mappingReader.remoteObjectId(bindings.mobileDeviceId, C09_GUARD_PATH);
          if (
            finalWindowsId !== state.seedRemoteObjectId
            || finalMobileId !== state.seedRemoteObjectId
            || guardWindowsId !== state.guardRemoteObjectId
            || guardMobileId !== state.guardRemoteObjectId
          ) {
            return {
              status: "failed",
              summary: "C09 C08-equivalent lineage did not preserve the original exact Drive identities on both participants.",
              evidenceRefs: [],
            };
          }

          const report = await bindings.verifier.verify(trustedLineageVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId: state.seedRemoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          }));
          const result = reportResult(report, "C09 C08-equivalent trusted lineage");
          if (result.status === "completed") {
            state.trustedLineageVerified = true;
            activeDeleteAssertionContext = state;
          }
          return result;
        }

        if (!state.trustedLineageVerified) {
          return {
            status: "blocked",
            summary: "C09 deletion authority is unavailable because objective C08-equivalent trusted-lineage verification did not complete.",
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
            targetRemoteObjectId: state.seedRemoteObjectId,
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
            targetRemoteObjectId: state.seedRemoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          })), "C09 mobile pre-delete authority");
        }

        if (request.operation === C09_SCENARIO_OPERATIONS.verifyFinal) {
          const roleProblem = requireRole(bindings, "mobile");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };

          return reportResult(await bindings.verifier.verify(finalDeletionVerificationRequest({
            run: request.run,
            bindings,
            target: state.target,
            guard: state.guard,
            targetRemoteObjectId: state.seedRemoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          })), "C09 final tombstone convergence");
        }

        return {
          status: "blocked",
          summary: "Unsupported C09 verification operation: " + request.operation,
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
          summary: "Unsupported C09 evidence operation: " + request.operation,
          evidenceRefs: [],
        };
      }

      const state = context(request.run);
      if (
        !state.target
        || !state.guard
        || !state.trustedLineageVerified
        || !state.remoteTrashVerified
        || !state.seedRemoteObjectId
        || !state.guardRemoteObjectId
      ) {
        return {
          status: "blocked",
          summary: "C09 evidence cannot be recorded without complete C08-equivalent lineage and deletion verification context.",
          evidenceRefs: [],
        };
      }

      try {
        const refs = await bindings.evidence.record({
          run: request.run,
          targetRemoteObjectId: state.seedRemoteObjectId,
          guardRemoteObjectId: state.guardRemoteObjectId,
          targetHash: requireHash(state.target, "C09 target"),
          guardHash: requireHash(state.guard, "C09 guard"),
          sourcePath: C09_SOURCE_PATH,
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
  return validationEvidenceRef("c09:" + value);
}
