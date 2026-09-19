import {
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
} from "../scenario-runner-contracts";
import {
  validationStepId,
  type ValidationDeviceId,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const C08_SCENARIO_ID = "C08" as const;
export const C08_FIXTURE_ID = "c08-windows-move" as const;
export const C08_GUARD_FIXTURE_ID = "c08-unrelated-guard" as const;
export const C08_FIXTURE_ROOT = "__brain_validation__/c08" as const;
export const C08_OLD_RELATIVE_PATH = "test-win-c06.md" as const;
export const C08_NEW_RELATIVE_PATH = "test-win-c08-renamed.md" as const;
export const C08_GUARD_RELATIVE_PATH = "c08-unrelated-guard.md" as const;

const path = (value: string): VaultPath => contractId<"VaultPath">(value) as VaultPath;
export const C08_OLD_PATH = path(`${C08_FIXTURE_ROOT}/${C08_OLD_RELATIVE_PATH}`);
export const C08_NEW_PATH = path(`${C08_FIXTURE_ROOT}/${C08_NEW_RELATIVE_PATH}`);
export const C08_GUARD_PATH = path(`${C08_FIXTURE_ROOT}/${C08_GUARD_RELATIVE_PATH}`);

export const C08_AUTHORITY_CYCLES = Object.freeze({
  lineageWindows: "c08-lineage-windows",
  lineageMobile: "c08-lineage-mobile",
  moveWindows: "c08-move-windows",
  moveMobile: "c08-move-mobile",
} as const);

const LINEAGE_FORBIDDEN_KINDS: readonly PlanOperationKind[] = Object.freeze([
  "upload-update",
  "download-update",
  "identity-preserving-move",
  "clean-text-merge",
  "unresolved-conflict",
  "trash-local",
  "trash-remote",
  "blocked-unsafe",
  "recovery-required",
]);

const MOVE_FORBIDDEN_KINDS: readonly PlanOperationKind[] = Object.freeze([
  "upload-create",
  "upload-update",
  "download-create",
  "download-update",
  "clean-text-merge",
  "unresolved-conflict",
  "trash-local",
  "trash-remote",
  "blocked-unsafe",
  "recovery-required",
]);

function expectedOperation(input: {
  readonly kind: PlanOperationKind;
  readonly path: VaultPath;
  readonly targetSide: "local" | "remote";
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
}): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind: input.kind,
    path: input.path,
    targetSide: input.targetSide,
    destructive: false,
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
  });
}

function expectation(
  expectedOperations: readonly ValidationExpectedPlanOperation[],
  forbiddenKinds: readonly PlanOperationKind[],
): Omit<ValidationPlanExpectation, "run"> {
  return Object.freeze({
    expectedTrigger: "manual" as const,
    expectedOperations: Object.freeze([...expectedOperations]),
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: Object.freeze([...forbiddenKinds]),
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: "safe-auto-eligible" as const,
    expectedGlobalExecutionGate: "none" as const,
  });
}

export const C08_PLAN_EXPECTATIONS = Object.freeze({
  lineageWindows: expectation([
    expectedOperation({ kind: "upload-create", path: C08_OLD_PATH, targetSide: "remote" }),
    expectedOperation({ kind: "upload-create", path: C08_GUARD_PATH, targetSide: "remote" }),
  ], LINEAGE_FORBIDDEN_KINDS),
  lineageMobile: expectation([
    expectedOperation({ kind: "download-create", path: C08_OLD_PATH, targetSide: "local" }),
    expectedOperation({ kind: "download-create", path: C08_GUARD_PATH, targetSide: "local" }),
  ], LINEAGE_FORBIDDEN_KINDS),
  moveWindows: expectation([
    expectedOperation({
      kind: "identity-preserving-move",
      path: C08_NEW_PATH,
      targetSide: "remote",
      fromPath: C08_OLD_PATH,
      toPath: C08_NEW_PATH,
    }),
  ], MOVE_FORBIDDEN_KINDS),
  moveMobile: expectation([
    expectedOperation({
      kind: "identity-preserving-move",
      path: C08_NEW_PATH,
      targetSide: "local",
      fromPath: C08_OLD_PATH,
      toPath: C08_NEW_PATH,
    }),
  ], MOVE_FORBIDDEN_KINDS),
});

function previewStep(id: string, cycleId: string) {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "production-path-driver" as const,
    operation: "preview-manual",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function assertionStep(
  id: string,
  cycleId: string,
  planExpectation: Omit<ValidationPlanExpectation, "run">,
) {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "plan-assertion-engine" as const,
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({
      authorityCycleId: cycleId,
      assertionId: `c08:${id}`,
      expectation: planExpectation,
    }),
  });
}

function executionStep(id: string, cycleId: string) {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "production-path-driver" as const,
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

export const C08_SCENARIO_DEFINITION: ValidationRunnerScenarioDefinition = Object.freeze({
  scenarioId: C08_SCENARIO_ID,
  prerequisiteIds: Object.freeze([]),
  steps: Object.freeze([
    {
      stepId: validationStepId("c08-lineage-create"),
      module: "fixture-manager",
      operation: "c08-lineage-create",
      requiredCompletionProof: "operation-complete",
    },
    previewStep("c08-lineage-windows-preview", C08_AUTHORITY_CYCLES.lineageWindows),
    assertionStep("c08-lineage-windows-assert", C08_AUTHORITY_CYCLES.lineageWindows, C08_PLAN_EXPECTATIONS.lineageWindows),
    executionStep("c08-lineage-windows-execute", C08_AUTHORITY_CYCLES.lineageWindows),
    {
      stepId: validationStepId("c08-lineage-mobile-handoff"),
      module: "cross-device-coordinator",
      operation: "c08-handoff-mobile",
      requiredCompletionProof: "operation-complete",
    },
    previewStep("c08-lineage-mobile-preview", C08_AUTHORITY_CYCLES.lineageMobile),
    assertionStep("c08-lineage-mobile-assert", C08_AUTHORITY_CYCLES.lineageMobile, C08_PLAN_EXPECTATIONS.lineageMobile),
    executionStep("c08-lineage-mobile-execute", C08_AUTHORITY_CYCLES.lineageMobile),
    {
      stepId: validationStepId("c08-lineage-verify"),
      module: "state-convergence-verifier",
      operation: "c08-lineage-verify",
      requiredCompletionProof: "verification-passed",
    },
    {
      stepId: validationStepId("c08-windows-handoff"),
      module: "cross-device-coordinator",
      operation: "c08-handoff-windows",
      requiredCompletionProof: "operation-complete",
    },
    {
      stepId: validationStepId("c08-windows-move-fixture"),
      module: "fixture-manager",
      operation: "c08-windows-move-fixture",
      requiredCompletionProof: "operation-complete",
    },
    previewStep("c08-windows-move-preview", C08_AUTHORITY_CYCLES.moveWindows),
    assertionStep("c08-windows-move-assert", C08_AUTHORITY_CYCLES.moveWindows, C08_PLAN_EXPECTATIONS.moveWindows),
    executionStep("c08-windows-move-execute", C08_AUTHORITY_CYCLES.moveWindows),
    {
      stepId: validationStepId("c08-remote-move-verify"),
      module: "state-convergence-verifier",
      operation: "c08-remote-move-verify",
      requiredCompletionProof: "verification-passed",
    },
    {
      stepId: validationStepId("c08-mobile-handoff"),
      module: "cross-device-coordinator",
      operation: "c08-handoff-mobile",
      requiredCompletionProof: "operation-complete",
    },
    previewStep("c08-mobile-move-preview", C08_AUTHORITY_CYCLES.moveMobile),
    assertionStep("c08-mobile-move-assert", C08_AUTHORITY_CYCLES.moveMobile, C08_PLAN_EXPECTATIONS.moveMobile),
    executionStep("c08-mobile-move-execute", C08_AUTHORITY_CYCLES.moveMobile),
    {
      stepId: validationStepId("c08-final-verify"),
      module: "state-convergence-verifier",
      operation: "c08-final-verify",
      requiredCompletionProof: "verification-passed",
    },
    {
      stepId: validationStepId("c08-evidence"),
      module: "scenario-evidence-recorder",
      operation: "c08-evidence",
      requiredCompletionProof: "evidence-recorded",
    },
  ]),
});

export const C08_SCENARIO_REGISTRATION = Object.freeze({
  scenarioId: C08_SCENARIO_ID,
  definition: C08_SCENARIO_DEFINITION,
});

export type C08DeviceRole = "windows" | "mobile";

export interface C08CrossDeviceHandoffPort {
  currentRole(): C08DeviceRole;
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly targetRole: C08DeviceRole;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C08TrustedMappingReader {
  remoteObjectId(deviceId: ValidationDeviceId, path: VaultPath): Promise<RemoteObjectId | undefined>;
}

export interface C08EvidencePort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly remoteObjectId: RemoteObjectId;
    readonly guardRemoteObjectId: RemoteObjectId;
    readonly contentHash: ContentHash;
    readonly guardContentHash: ContentHash;
    readonly oldPath: VaultPath;
    readonly newPath: VaultPath;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C08ScenarioBindings {
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsFixtures: Pick<ValidationFixtureManager, "create" | "move" | "hash">;
  readonly mappingReader: C08TrustedMappingReader;
  readonly verifier: Pick<StateConvergenceVerifier, "verify">;
  readonly handoff: C08CrossDeviceHandoffPort;
  readonly evidence: C08EvidencePort;
}

interface C08RunContext {
  main?: ValidationFixtureDescriptor;
  guard?: ValidationFixtureDescriptor;
  remoteObjectId?: RemoteObjectId;
  guardRemoteObjectId?: RemoteObjectId;
}

function runKey(run: ValidationRunIdentity): string {
  return `${String(run.scenarioId)}\u0000${String(run.runId)}`;
}

function stateAssertion(
  id: string,
  kind: ValidationStateAssertion["kind"],
  expectationText: string,
): ValidationStateAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject: C08_SCENARIO_ID,
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
    subject: C08_SCENARIO_ID,
    expectation: expectationText,
  });
}

function requireHash(descriptor: ValidationFixtureDescriptor, label: string): ContentHash {
  if (!descriptor.hash) throw new Error(`${label} fixture has no content hash.`);
  return descriptor.hash;
}

function c08LineageVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly main: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly remoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const mainContent = { hash: requireHash(input.main, "C08 main"), sizeBytes: input.main.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C08 guard"), sizeBytes: input.guard.sizeBytes };
  const devices = [input.windowsDeviceId, input.mobileDeviceId] as const;
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c08-lineage-windows-content", "local-content", "Windows lineage bytes match the deterministic C06 fixture."), deviceId: input.windowsDeviceId, path: C08_OLD_PATH, content: mainContent },
      { kind: "local-content", assertion: stateAssertion("c08-lineage-mobile-content", "local-content", "Mobile lineage bytes match the deterministic C06 fixture."), deviceId: input.mobileDeviceId, path: C08_OLD_PATH, content: mainContent },
      { kind: "remote-content", assertion: stateAssertion("c08-lineage-remote-content", "remote-content", "Remote lineage bytes and stable identity match the trusted fixture."), path: C08_OLD_PATH, remoteObjectId: input.remoteObjectId, content: mainContent },
      { kind: "base-authority", assertion: stateAssertion("c08-lineage-windows-base", "base-authority", "Windows BASE binds the old path to the stable Drive identity."), deviceId: input.windowsDeviceId, path: C08_OLD_PATH, expectedRemoteObjectId: input.remoteObjectId, expectedContent: mainContent },
      { kind: "base-authority", assertion: stateAssertion("c08-lineage-mobile-base", "base-authority", "Mobile BASE binds the old path to the same stable Drive identity."), deviceId: input.mobileDeviceId, path: C08_OLD_PATH, expectedRemoteObjectId: input.remoteObjectId, expectedContent: mainContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-lineage-windows-mapping", "mapping-or-tombstone", "Windows holds the live mapping and no tombstone."), deviceId: input.windowsDeviceId, path: C08_OLD_PATH, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-lineage-mobile-mapping", "mapping-or-tombstone", "Mobile holds the live mapping and no tombstone."), deviceId: input.mobileDeviceId, path: C08_OLD_PATH, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "remote-content", assertion: stateAssertion("c08-lineage-guard-remote", "remote-content", "Unrelated guard object is established before the move."), path: C08_GUARD_PATH, remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c08-lineage-windows-intents", "durable-intent-or-effect", "Windows has no outstanding durable effects after lineage setup."), deviceId: input.windowsDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c08-lineage-mobile-intents", "durable-intent-or-effect", "Mobile has no outstanding durable effects after lineage setup."), deviceId: input.mobileDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c08-lineage-content", "cross-device-content", "Windows and mobile share identical lineage bytes."), deviceIds: devices, path: C08_OLD_PATH, content: mainContent },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c08-lineage-authority", "cross-device-authority", "Windows and mobile bind the lineage path to one Drive object."), deviceIds: devices, path: C08_OLD_PATH, expectedRemoteObjectId: input.remoteObjectId, expectedTombstone: false },
      { kind: "cross-device-content", assertion: convergenceAssertion("c08-lineage-guard", "cross-device-content", "The unrelated guard is identical on both participants."), deviceIds: devices, path: C08_GUARD_PATH, content: guardContent },
    ],
  };
}

function c08RemoteMoveVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly main: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly remoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const mainContent = { hash: requireHash(input.main, "C08 main"), sizeBytes: input.main.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C08 guard"), sizeBytes: input.guard.sizeBytes };
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c08-windows-new-content", "local-content", "Windows moved file retains unchanged bytes."), deviceId: input.windowsDeviceId, path: C08_NEW_PATH, content: mainContent },
      { kind: "live-trash-absence-state", assertion: stateAssertion("c08-remote-old-absent", "live-trash-absence-state", "Old remote path is absent after the identity-preserving move."), path: C08_OLD_PATH, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c08-remote-new-content", "remote-content", "The original Drive object is live at the new path with unchanged bytes."), path: C08_NEW_PATH, remoteObjectId: input.remoteObjectId, content: mainContent },
      { kind: "base-authority", assertion: stateAssertion("c08-windows-new-base", "base-authority", "Windows BASE follows the stable Drive object to the new path."), deviceId: input.windowsDeviceId, path: C08_NEW_PATH, expectedRemoteObjectId: input.remoteObjectId, expectedContent: mainContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-windows-new-mapping", "mapping-or-tombstone", "Windows mapping follows the same Drive object to the new path."), deviceId: input.windowsDeviceId, path: C08_NEW_PATH, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-windows-old-cleared", "mapping-or-tombstone", "Windows old path has neither mapping nor tombstone after a move."), deviceId: input.windowsDeviceId, path: C08_OLD_PATH, expected: "neither" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("c08-remote-move-unrelated", "unrelated-mutation-absence", "The unrelated guard remains unchanged while Windows moves the target."), local: [
        { deviceId: input.windowsDeviceId, path: C08_GUARD_PATH, state: "file", content: guardContent },
        { deviceId: input.mobileDeviceId, path: C08_GUARD_PATH, state: "file", content: guardContent },
      ], remote: [
        { path: C08_GUARD_PATH, state: "live", remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      ] },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c08-windows-move-intents", "durable-intent-or-effect", "Windows has no outstanding durable effects after remote move verification."), deviceId: input.windowsDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c08-windows-new-bytes", "cross-device-content", "Windows new path retains the original fixture bytes."), deviceIds: [input.windowsDeviceId], path: C08_NEW_PATH, content: mainContent },
      { kind: "cross-device-path", assertion: convergenceAssertion("c08-windows-old-absent", "cross-device-path", "Windows old path is absent after its local move."), deviceIds: [input.windowsDeviceId], path: C08_OLD_PATH, expected: "absent" },
    ],
  };
}

export function c08FinalVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly main: ValidationFixtureDescriptor;
  readonly guard: ValidationFixtureDescriptor;
  readonly remoteObjectId: RemoteObjectId;
  readonly guardRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const mainContent = { hash: requireHash(input.main, "C08 main"), sizeBytes: input.main.sizeBytes };
  const guardContent = { hash: requireHash(input.guard, "C08 guard"), sizeBytes: input.guard.sizeBytes };
  const devices = [input.windowsDeviceId, input.mobileDeviceId] as const;
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c08-final-windows-content", "local-content", "Windows new-path bytes are unchanged."), deviceId: input.windowsDeviceId, path: C08_NEW_PATH, content: mainContent },
      { kind: "local-content", assertion: stateAssertion("c08-final-mobile-content", "local-content", "Mobile new-path bytes are unchanged."), deviceId: input.mobileDeviceId, path: C08_NEW_PATH, content: mainContent },
      { kind: "live-trash-absence-state", assertion: stateAssertion("c08-final-remote-old-absent", "live-trash-absence-state", "Old remote path remains absent without delete/create substitution."), path: C08_OLD_PATH, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c08-final-remote-content", "remote-content", "The same Drive object remains live at the new path with unchanged bytes."), path: C08_NEW_PATH, remoteObjectId: input.remoteObjectId, content: mainContent },
      { kind: "base-authority", assertion: stateAssertion("c08-final-windows-base", "base-authority", "Windows BASE retains the stable Drive object at the new path."), deviceId: input.windowsDeviceId, path: C08_NEW_PATH, expectedRemoteObjectId: input.remoteObjectId, expectedContent: mainContent },
      { kind: "base-authority", assertion: stateAssertion("c08-final-mobile-base", "base-authority", "Mobile BASE retains the same stable Drive object at the new path."), deviceId: input.mobileDeviceId, path: C08_NEW_PATH, expectedRemoteObjectId: input.remoteObjectId, expectedContent: mainContent },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-final-windows-mapping", "mapping-or-tombstone", "Windows new path maps to the stable Drive object."), deviceId: input.windowsDeviceId, path: C08_NEW_PATH, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-final-mobile-mapping", "mapping-or-tombstone", "Mobile new path maps to the stable Drive object."), deviceId: input.mobileDeviceId, path: C08_NEW_PATH, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-final-windows-old-cleared", "mapping-or-tombstone", "Windows old path has neither mapping nor tombstone."), deviceId: input.windowsDeviceId, path: C08_OLD_PATH, expected: "neither" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c08-final-mobile-old-cleared", "mapping-or-tombstone", "Mobile old path has neither mapping nor tombstone."), deviceId: input.mobileDeviceId, path: C08_OLD_PATH, expected: "neither" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("c08-final-unrelated", "unrelated-mutation-absence", "The unrelated guard remains unchanged across both production synchronization cycles."), local: [
        { deviceId: input.windowsDeviceId, path: C08_GUARD_PATH, state: "file", content: guardContent },
        { deviceId: input.mobileDeviceId, path: C08_GUARD_PATH, state: "file", content: guardContent },
      ], remote: [
        { path: C08_GUARD_PATH, state: "live", remoteObjectId: input.guardRemoteObjectId, content: guardContent },
      ] },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c08-final-windows-intents", "durable-intent-or-effect", "Windows has no outstanding durable effects."), deviceId: input.windowsDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c08-final-mobile-intents", "durable-intent-or-effect", "Mobile has no outstanding durable effects."), deviceId: input.mobileDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c08-final-content", "cross-device-content", "Windows and mobile converge on unchanged moved bytes."), deviceIds: devices, path: C08_NEW_PATH, content: mainContent },
      { kind: "cross-device-path", assertion: convergenceAssertion("c08-final-old-absent", "cross-device-path", "Old path is absent on both participants."), deviceIds: devices, path: C08_OLD_PATH, expected: "absent" },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c08-final-authority", "cross-device-authority", "Both participants bind the new path to the original Drive object."), deviceIds: devices, path: C08_NEW_PATH, expectedRemoteObjectId: input.remoteObjectId, expectedTombstone: false },
    ],
  };
}

function reportResult(report: ValidationStateConvergenceReport, phase: string) {
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

function requireRole(bindings: C08ScenarioBindings, role: C08DeviceRole): string | undefined {
  return bindings.handoff.currentRole() === role
    ? undefined
    : `C08 step requires ${role} ownership; current role is ${bindings.handoff.currentRole()}.`;
}

async function sameStableId(
  bindings: C08ScenarioBindings,
  pathValue: VaultPath,
): Promise<RemoteObjectId | undefined> {
  const [windows, mobile] = await Promise.all([
    bindings.mappingReader.remoteObjectId(bindings.windowsDeviceId, pathValue),
    bindings.mappingReader.remoteObjectId(bindings.mobileDeviceId, pathValue),
  ]);
  return windows !== undefined && windows === mobile ? windows : undefined;
}

export function createC08ScenarioModuleOverrides(
  bindings: C08ScenarioBindings,
): ValidationModeModuleOverrides {
  const contexts = new Map<string, C08RunContext>();
  const context = (run: ValidationRunIdentity): C08RunContext => {
    const key = runKey(run);
    const existing = contexts.get(key);
    if (existing) return existing;
    const created: C08RunContext = {};
    contexts.set(key, created);
    return created;
  };

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);
      if (request.operation === "c08-lineage-create") {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
        try {
          state.main = await bindings.windowsFixtures.create(
            validationTextFixture(C08_FIXTURE_ID, C08_OLD_RELATIVE_PATH),
          );
          state.guard = await bindings.windowsFixtures.create(
            validationTextFixture(C08_GUARD_FIXTURE_ID, C08_GUARD_RELATIVE_PATH),
          );
          requireHash(state.main, "C08 main");
          requireHash(state.guard, "C08 guard");
          return { status: "completed", evidenceRefs: [] };
        } catch (error) {
          return { status: "failed", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
        }
      }
      if (request.operation === "c08-windows-move-fixture") {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
        if (!state.main) return { status: "blocked", summary: "C08 trusted main fixture lineage is unavailable.", evidenceRefs: [] };
        try {
          const originalHash = requireHash(state.main, "C08 main");
          const originalSize = state.main.sizeBytes;
          const moved = await bindings.windowsFixtures.move(C08_FIXTURE_ID, C08_NEW_RELATIVE_PATH);
          const observedHash = await bindings.windowsFixtures.hash(C08_FIXTURE_ID);
          if (moved.path !== C08_NEW_PATH || moved.sizeBytes !== originalSize || moved.hash !== originalHash || observedHash !== originalHash) {
            return { status: "failed", summary: "C08 Windows move changed path/content identity or bytes.", evidenceRefs: [] };
          }
          state.main = moved;
          return { status: "completed", evidenceRefs: [] };
        } catch (error) {
          return { status: "failed", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
        }
      }
      return { status: "blocked", summary: `Unsupported C08 fixture operation: ${request.operation}`, evidenceRefs: [] };
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const targetRole = request.operation === "c08-handoff-mobile"
        ? "mobile"
        : request.operation === "c08-handoff-windows"
          ? "windows"
          : undefined;
      if (!targetRole) return { status: "blocked", summary: `Unsupported C08 handoff operation: ${request.operation}`, evidenceRefs: [] };
      try {
        const evidenceRefs = await bindings.handoff.handoff({
          run: request.run,
          stepId: request.stepId,
          targetRole,
        });
        if (bindings.handoff.currentRole() !== targetRole) {
          return { status: "blocked", summary: `C08 handoff did not establish ${targetRole} step ownership.`, evidenceRefs };
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
      if (!state.main || !state.guard) {
        return { status: "blocked", summary: "C08 deterministic fixture lineage is unavailable.", evidenceRefs: [] };
      }
      try {
        if (request.operation === "c08-lineage-verify") {
          const remoteObjectId = await sameStableId(bindings, C08_OLD_PATH);
          const guardRemoteObjectId = await sameStableId(bindings, C08_GUARD_PATH);
          if (!remoteObjectId || !guardRemoteObjectId) {
            return { status: "failed", summary: "C08 lineage did not establish one stable Drive identity on both participants.", evidenceRefs: [] };
          }
          state.remoteObjectId = remoteObjectId;
          state.guardRemoteObjectId = guardRemoteObjectId;
          return reportResult(await bindings.verifier.verify(c08LineageVerificationRequest({
            run: request.run,
            windowsDeviceId: bindings.windowsDeviceId,
            mobileDeviceId: bindings.mobileDeviceId,
            main: state.main,
            guard: state.guard,
            remoteObjectId,
            guardRemoteObjectId,
          })), "C08 lineage");
        }

        if (!state.remoteObjectId || !state.guardRemoteObjectId) {
          return { status: "blocked", summary: "C08 stable Drive identity authority is unavailable.", evidenceRefs: [] };
        }

        if (request.operation === "c08-remote-move-verify") {
          return reportResult(await bindings.verifier.verify(c08RemoteMoveVerificationRequest({
            run: request.run,
            windowsDeviceId: bindings.windowsDeviceId,
            mobileDeviceId: bindings.mobileDeviceId,
            main: state.main,
            guard: state.guard,
            remoteObjectId: state.remoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          })), "C08 remote move");
        }

        if (request.operation === "c08-final-verify") {
          const finalWindowsId = await bindings.mappingReader.remoteObjectId(bindings.windowsDeviceId, C08_NEW_PATH);
          const finalMobileId = await bindings.mappingReader.remoteObjectId(bindings.mobileDeviceId, C08_NEW_PATH);
          if (finalWindowsId !== state.remoteObjectId || finalMobileId !== state.remoteObjectId) {
            return { status: "failed", summary: "C08 final mapping does not preserve the original Drive identity on both participants.", evidenceRefs: [] };
          }
          return reportResult(await bindings.verifier.verify(c08FinalVerificationRequest({
            run: request.run,
            windowsDeviceId: bindings.windowsDeviceId,
            mobileDeviceId: bindings.mobileDeviceId,
            main: state.main,
            guard: state.guard,
            remoteObjectId: state.remoteObjectId,
            guardRemoteObjectId: state.guardRemoteObjectId,
          })), "C08 final convergence");
        }

        return { status: "blocked", summary: `Unsupported C08 verification operation: ${request.operation}`, evidenceRefs: [] };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== "c08-evidence") {
        return { status: "blocked", summary: `Unsupported C08 evidence operation: ${request.operation}`, evidenceRefs: [] };
      }
      const state = context(request.run);
      if (!state.main || !state.guard || !state.remoteObjectId || !state.guardRemoteObjectId) {
        return { status: "blocked", summary: "C08 evidence cannot be recorded without complete stable-identity context.", evidenceRefs: [] };
      }
      try {
        const evidenceRefs = await bindings.evidence.record({
          run: request.run,
          remoteObjectId: state.remoteObjectId,
          guardRemoteObjectId: state.guardRemoteObjectId,
          contentHash: requireHash(state.main, "C08 main"),
          guardContentHash: requireHash(state.guard, "C08 guard"),
          oldPath: C08_OLD_PATH,
          newPath: C08_NEW_PATH,
        });
        return evidenceRefs.length > 0
          ? { status: "completed", evidenceRefs }
          : { status: "blocked", summary: "C08 evidence recorder returned no durable evidence reference.", evidenceRefs: [] };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  return Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": handoffDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });
}

/** Utility used by focused tests and H7 integration binders. */
export function c08EvidenceRef(value: string): ValidationEvidenceRef {
  return validationEvidenceRef(`c08:${value}`);
}
