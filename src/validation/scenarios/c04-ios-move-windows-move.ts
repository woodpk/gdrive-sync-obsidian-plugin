import type {
  ContentHash,
  PlanOperationKind,
  RemoteObjectId,
  VaultPath,
} from "../../contracts";
import {
  validationAssertionId,
  type ValidationConvergenceAssertion,
  type ValidationEvidenceRef,
  type ValidationPlanExpectation,
  type ValidationStateAssertion,
} from "../driver-plan-fault-verifier-contracts";
import {
  validationTextFixture,
  type ValidationFixtureDescriptor,
  type ValidationFixtureManager,
} from "../fixture-manager";
import type {
  ValidationModeModuleOverrides,
  ValidationPlanAssertionStepInput,
} from "../validation-mode-runtime";
import {
  validationStepId,
  type ValidationDeviceId,
  type ValidationRunIdentity,
} from "../run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerModuleOperationRequest,
} from "../scenario-runner-module-adapter";
import type {
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStepDefinition,
} from "../scenario-runner-contracts";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";

export const C04_LIVE_PACKAGE = "C04-ios-move-windows-move.md" as const;
export const C04_SCENARIO_ID = "C04" as const;
export const C04_FIXTURE_ID = "c04-mobile-move" as const;
export const C04_OLD_RELATIVE_PATH = "test-ios-c02.md" as const;
export const C04_NEW_RELATIVE_PATH = "test-ios-c04-renamed.md" as const;

export const C04_AUTHORITY_CYCLES = Object.freeze({
  mobileLineage: "c04-authority-mobile-lineage",
  windowsLineage: "c04-authority-windows-lineage",
  mobileMove: "c04-authority-mobile-move",
  windowsMove: "c04-authority-windows-move",
} as const);

export const C04_OPERATIONS = Object.freeze({
  establishMobileFixture: "c04-establish-mobile-fixture",
  handoffLineageWindows: "c04-handoff-lineage-windows",
  verifyLineage: "c04-verify-trusted-lineage",
  handoffMoveMobile: "c04-handoff-move-mobile",
  moveMobileFixture: "c04-mobile-local-move",
  verifyRemoteMove: "c04-verify-remote-move",
  handoffMoveWindows: "c04-handoff-move-windows",
  verifyFinal: "c04-verify-final-convergence",
  recordEvidence: "c04-record-evidence",
} as const);

const ALL_MUTATION_KINDS: readonly PlanOperationKind[] = Object.freeze([
  "upload-create",
  "upload-update",
  "download-create",
  "download-update",
  "identity-preserving-move",
  "clean-text-merge",
  "unresolved-conflict",
  "trash-local",
  "trash-remote",
  "blocked-unsafe",
  "recovery-required",
]);

function forbiddenExcept(expected: PlanOperationKind): readonly PlanOperationKind[] {
  return Object.freeze(ALL_MUTATION_KINDS.filter(kind => kind !== expected));
}

type PlanExpectationWithoutRun = Omit<ValidationPlanExpectation, "run">;

function planExpectation(input: {
  readonly expectedKind: "upload-create" | "download-create" | "identity-preserving-move";
  readonly path: VaultPath;
  readonly targetSide: "local" | "remote";
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
}): PlanExpectationWithoutRun {
  return Object.freeze({
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([Object.freeze({
      kind: input.expectedKind,
      path: input.path,
      targetSide: input.targetSide,
      ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
      ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
      destructive: false,
    })]),
    allowedBackgroundKinds: Object.freeze(["noop"]),
    forbiddenKinds: forbiddenExcept(input.expectedKind),
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
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
  const input: ValidationPlanAssertionStepInput = Object.freeze({
    authorityCycleId: cycleId,
    assertionId,
    expectation,
  });
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "plan-assertion-engine",
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete",
    input,
  });
}

function executionStep(stepId: string, cycleId: string): ValidationRunnerStepDefinition {
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

export interface C04ScenarioDefinitionInput {
  readonly oldPath: VaultPath;
  readonly newPath: VaultPath;
}

/**
 * Declarative C04 package for the repaired H6B runtime.
 *
 * Production preview, assertion, retained authorization, and execution are
 * represented only by fixed H6B module steps with explicit authority cycles.
 * Scenario code never receives or synthesizes execution authorization.
 */
export function createC04ScenarioDefinition(
  input: C04ScenarioDefinitionInput,
): ValidationRunnerScenarioDefinition {
  const steps: readonly ValidationRunnerStepDefinition[] = Object.freeze([
    moduleStep("c04-establish-mobile-fixture", "fixture-manager", C04_OPERATIONS.establishMobileFixture),

    previewStep("c04-lineage-mobile-preview", C04_AUTHORITY_CYCLES.mobileLineage),
    assertionStep(
      "c04-lineage-mobile-assert",
      C04_AUTHORITY_CYCLES.mobileLineage,
      "c04-lineage-mobile-upload-create",
      planExpectation({
        expectedKind: "upload-create",
        path: input.oldPath,
        targetSide: "remote",
      }),
    ),
    executionStep("c04-lineage-mobile-execute", C04_AUTHORITY_CYCLES.mobileLineage),

    moduleStep("c04-handoff-lineage-windows", "cross-device-coordinator", C04_OPERATIONS.handoffLineageWindows),

    previewStep("c04-lineage-windows-preview", C04_AUTHORITY_CYCLES.windowsLineage),
    assertionStep(
      "c04-lineage-windows-assert",
      C04_AUTHORITY_CYCLES.windowsLineage,
      "c04-lineage-windows-download-create",
      planExpectation({
        expectedKind: "download-create",
        path: input.oldPath,
        targetSide: "local",
      }),
    ),
    executionStep("c04-lineage-windows-execute", C04_AUTHORITY_CYCLES.windowsLineage),

    moduleStep(
      "c04-verify-trusted-lineage",
      "state-convergence-verifier",
      C04_OPERATIONS.verifyLineage,
      "verification-passed",
    ),
    moduleStep("c04-handoff-move-mobile", "cross-device-coordinator", C04_OPERATIONS.handoffMoveMobile),
    moduleStep("c04-mobile-local-move", "fixture-manager", C04_OPERATIONS.moveMobileFixture),

    previewStep("c04-mobile-move-preview", C04_AUTHORITY_CYCLES.mobileMove),
    assertionStep(
      "c04-mobile-move-assert",
      C04_AUTHORITY_CYCLES.mobileMove,
      "c04-mobile-identity-preserving-remote-move",
      planExpectation({
        expectedKind: "identity-preserving-move",
        path: input.newPath,
        targetSide: "remote",
        fromPath: input.oldPath,
        toPath: input.newPath,
      }),
    ),
    executionStep("c04-mobile-move-execute", C04_AUTHORITY_CYCLES.mobileMove),

    moduleStep(
      "c04-verify-remote-move",
      "state-convergence-verifier",
      C04_OPERATIONS.verifyRemoteMove,
      "verification-passed",
    ),
    moduleStep("c04-handoff-move-windows", "cross-device-coordinator", C04_OPERATIONS.handoffMoveWindows),

    previewStep("c04-windows-move-preview", C04_AUTHORITY_CYCLES.windowsMove),
    assertionStep(
      "c04-windows-move-assert",
      C04_AUTHORITY_CYCLES.windowsMove,
      "c04-windows-identity-preserving-local-move",
      planExpectation({
        expectedKind: "identity-preserving-move",
        path: input.newPath,
        targetSide: "local",
        fromPath: input.oldPath,
        toPath: input.newPath,
      }),
    ),
    executionStep("c04-windows-move-execute", C04_AUTHORITY_CYCLES.windowsMove),

    moduleStep(
      "c04-verify-final-convergence",
      "state-convergence-verifier",
      C04_OPERATIONS.verifyFinal,
      "verification-passed",
    ),
    moduleStep(
      "c04-record-evidence",
      "scenario-evidence-recorder",
      C04_OPERATIONS.recordEvidence,
      "evidence-recorded",
    ),
  ]);

  return Object.freeze({
    scenarioId: C04_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps,
  });
}

export interface C04ParticipantHandoffPort {
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly target: "mobile" | "windows";
    readonly reason: "trusted-lineage-download" | "mobile-move" | "windows-move";
  }): Promise<void>;
}

export interface C04StableRemoteIdentitySource {
  resolveStableRemoteObjectId(input: {
    readonly run: ValidationRunIdentity;
    readonly path: VaultPath;
  }): Promise<RemoteObjectId | undefined>;
}

export interface C04EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly fixture: ValidationFixtureDescriptor;
    readonly remoteObjectId: RemoteObjectId;
    readonly oldPath: VaultPath;
    readonly newPath: VaultPath;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C04ModuleBindings {
  readonly fixtureManager: Pick<ValidationFixtureManager, "create" | "move" | "hash">;
  readonly participantHandoff: C04ParticipantHandoffPort;
  readonly verifier: Pick<StateConvergenceVerifier, "verify">;
  readonly stableRemoteIdentity: C04StableRemoteIdentitySource;
  readonly evidenceRecorder: C04EvidenceRecorderPort;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly oldPath: VaultPath;
  readonly newPath: VaultPath;
}

interface C04RunState {
  run?: ValidationRunIdentity;
  fixture?: ValidationFixtureDescriptor;
  originalHash?: ContentHash;
  stableRemoteObjectId?: RemoteObjectId;
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
    subject: C04_SCENARIO_ID,
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
    subject: C04_SCENARIO_ID,
    expectation,
  });
}

function requireFixture(
  state: C04RunState,
  run: ValidationRunIdentity,
): ValidationFixtureDescriptor {
  if (!state.run || !sameRun(state.run, run) || !state.fixture || !state.originalHash) {
    throw new Error("C04 trusted fixture lineage is not established for this run.");
  }
  return state.fixture;
}

function requireStableIdentity(state: C04RunState): RemoteObjectId {
  if (!state.stableRemoteObjectId) {
    throw new Error("C04 stable Drive identity has not been established.");
  }
  return state.stableRemoteObjectId;
}

function objectiveRefs(report: ValidationStateConvergenceReport): readonly ValidationEvidenceRef[] {
  return Object.freeze(report.evidence.map(item => item.ref));
}

function verificationResult(
  report: ValidationStateConvergenceReport,
  phase: string,
) {
  const evidenceRefs = objectiveRefs(report);
  if (report.result.verdict === "pass") {
    return {
      status: "completed" as const,
      evidenceRefs,
    };
  }
  return {
    status: report.result.verdict === "fail" ? "failed" as const : "blocked" as const,
    summary: `C04 ${phase} verification ${report.result.verdict}.`,
    evidenceRefs,
  };
}

function lineageRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly fixture: ValidationFixtureDescriptor;
  readonly remoteObjectId: RemoteObjectId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
}): ValidationStateConvergenceRequest {
  if (!input.fixture.hash) throw new Error("C04 fixture has no canonical hash.");
  const content = { hash: input.fixture.hash, sizeBytes: input.fixture.sizeBytes };
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c04-lineage-mobile-content", "local-content", "Mobile trusted-lineage bytes match the deterministic fixture."), deviceId: input.mobileDeviceId, path: input.fixture.path, content },
      { kind: "local-content", assertion: stateAssertion("c04-lineage-windows-content", "local-content", "Windows trusted-lineage bytes match the deterministic fixture."), deviceId: input.windowsDeviceId, path: input.fixture.path, content },
      { kind: "remote-content", assertion: stateAssertion("c04-lineage-remote-content", "remote-content", "Remote trusted-lineage bytes and stable identity match the fixture."), path: input.fixture.path, remoteObjectId: input.remoteObjectId, content },
      { kind: "base-authority", assertion: stateAssertion("c04-lineage-mobile-base", "base-authority", "Mobile BASE binds the old path to the stable Drive object."), deviceId: input.mobileDeviceId, path: input.fixture.path, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "base-authority", assertion: stateAssertion("c04-lineage-windows-base", "base-authority", "Windows BASE binds the old path to the stable Drive object."), deviceId: input.windowsDeviceId, path: input.fixture.path, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-lineage-mobile-mapping", "mapping-or-tombstone", "Mobile has a live mapping and no tombstone at the old path."), deviceId: input.mobileDeviceId, path: input.fixture.path, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-lineage-windows-mapping", "mapping-or-tombstone", "Windows has a live mapping and no tombstone at the old path."), deviceId: input.windowsDeviceId, path: input.fixture.path, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c04-lineage-content-converged", "cross-device-content", "Both participants hold the same trusted-lineage bytes."), deviceIds: [input.mobileDeviceId, input.windowsDeviceId], path: input.fixture.path, content },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c04-lineage-authority-converged", "cross-device-authority", "Both participants bind the old path to the same Drive identity."), deviceIds: [input.mobileDeviceId, input.windowsDeviceId], path: input.fixture.path, expectedRemoteObjectId: input.remoteObjectId, expectedTombstone: false },
    ],
  };
}

function remoteMoveRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly fixture: ValidationFixtureDescriptor;
  readonly oldPath: VaultPath;
  readonly newPath: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
  readonly mobileDeviceId: ValidationDeviceId;
}): ValidationStateConvergenceRequest {
  if (!input.fixture.hash) throw new Error("C04 fixture has no canonical hash.");
  const content = { hash: input.fixture.hash, sizeBytes: input.fixture.sizeBytes };
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c04-mobile-new-content", "local-content", "Mobile moved file retains the original bytes."), deviceId: input.mobileDeviceId, path: input.newPath, content },
      { kind: "live-trash-absence-state", assertion: stateAssertion("c04-remote-old-absent", "live-trash-absence-state", "Old remote path is absent after the identity-preserving move."), path: input.oldPath, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c04-remote-new-content", "remote-content", "The same Drive object is live at the new path with unchanged bytes."), path: input.newPath, remoteObjectId: input.remoteObjectId, content },
      { kind: "base-authority", assertion: stateAssertion("c04-mobile-new-base", "base-authority", "Mobile BASE follows the stable Drive identity to the new path."), deviceId: input.mobileDeviceId, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-mobile-new-mapping", "mapping-or-tombstone", "Mobile mapping follows the stable Drive identity to the new path."), deviceId: input.mobileDeviceId, path: input.newPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-mobile-old-cleared", "mapping-or-tombstone", "Old mobile path has neither mapping nor tombstone; the move was not a delete."), deviceId: input.mobileDeviceId, path: input.oldPath, expected: "neither" },
    ],
    convergence: [
      { kind: "cross-device-path", assertion: convergenceAssertion("c04-mobile-old-path-absent", "cross-device-path", "Old path is absent on the mobile participant."), deviceIds: [input.mobileDeviceId], path: input.oldPath, expected: "absent" },
      { kind: "cross-device-content", assertion: convergenceAssertion("c04-mobile-new-bytes", "cross-device-content", "Mobile new-path bytes are unchanged."), deviceIds: [input.mobileDeviceId], path: input.newPath, content },
    ],
  };
}

function finalRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly fixture: ValidationFixtureDescriptor;
  readonly oldPath: VaultPath;
  readonly newPath: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
}): ValidationStateConvergenceRequest {
  if (!input.fixture.hash) throw new Error("C04 fixture has no canonical hash.");
  const content = { hash: input.fixture.hash, sizeBytes: input.fixture.sizeBytes };
  const devices = [input.mobileDeviceId, input.windowsDeviceId] as const;
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c04-final-mobile-content", "local-content", "Mobile new-path bytes are unchanged."), deviceId: input.mobileDeviceId, path: input.newPath, content },
      { kind: "local-content", assertion: stateAssertion("c04-final-windows-content", "local-content", "Windows new-path bytes are unchanged."), deviceId: input.windowsDeviceId, path: input.newPath, content },
      { kind: "live-trash-absence-state", assertion: stateAssertion("c04-final-remote-old-absent", "live-trash-absence-state", "Old remote path is absent without delete/create substitution."), path: input.oldPath, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c04-final-remote-content", "remote-content", "Stable Drive object remains live at the new path with unchanged bytes."), path: input.newPath, remoteObjectId: input.remoteObjectId, content },
      { kind: "base-authority", assertion: stateAssertion("c04-final-mobile-base", "base-authority", "Mobile BASE retains stable identity at the new path."), deviceId: input.mobileDeviceId, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "base-authority", assertion: stateAssertion("c04-final-windows-base", "base-authority", "Windows BASE retains stable identity at the new path."), deviceId: input.windowsDeviceId, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-mobile-mapping", "mapping-or-tombstone", "Mobile new path has the live stable mapping."), deviceId: input.mobileDeviceId, path: input.newPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-windows-mapping", "mapping-or-tombstone", "Windows new path has the live stable mapping."), deviceId: input.windowsDeviceId, path: input.newPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-mobile-old-cleared", "mapping-or-tombstone", "Mobile old path has neither mapping nor tombstone."), deviceId: input.mobileDeviceId, path: input.oldPath, expected: "neither" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-windows-old-cleared", "mapping-or-tombstone", "Windows old path has neither mapping nor tombstone."), deviceId: input.windowsDeviceId, path: input.oldPath, expected: "neither" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c04-final-content-converged", "cross-device-content", "Both devices contain the unchanged bytes at the new path."), deviceIds: devices, path: input.newPath, content },
      { kind: "cross-device-path", assertion: convergenceAssertion("c04-final-new-path-present", "cross-device-path", "Both devices contain the file at the new path."), deviceIds: devices, path: input.newPath, expected: "file" },
      { kind: "cross-device-path", assertion: convergenceAssertion("c04-final-old-path-absent", "cross-device-path", "The old path is absent on both devices."), deviceIds: devices, path: input.oldPath, expected: "absent" },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c04-final-authority-converged", "cross-device-authority", "Both devices bind the new path to the same stable Drive identity without tombstones."), deviceIds: devices, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedTombstone: false },
    ],
  };
}

function requireOperation(
  request: ValidationRunnerModuleOperationRequest,
  expected: string,
): void {
  if (request.run.scenarioId !== C04_SCENARIO_ID) throw new Error("C04 module request belongs to a different scenario.");
  if (request.operation !== expected) throw new Error(`Unsupported C04 module operation: ${request.operation}`);
}

export function createC04ModuleOverrides(
  bindings: C04ModuleBindings,
): ValidationModeModuleOverrides {
  const state: C04RunState = {};

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation === C04_OPERATIONS.establishMobileFixture) {
        if (state.run && !sameRun(state.run, request.run)) {
          return { status: "blocked", summary: "C04 fixture state belongs to another run.", evidenceRefs: [] };
        }
        const fixture = await bindings.fixtureManager.create(
          validationTextFixture(C04_FIXTURE_ID, C04_OLD_RELATIVE_PATH, 1, "base", "ordinary"),
        );
        if (fixture.path !== bindings.oldPath || !fixture.hash) {
          return { status: "failed", summary: "C04 deterministic fixture identity/path/hash does not match the scenario contract.", evidenceRefs: [] };
        }
        state.run = request.run;
        state.fixture = fixture;
        state.originalHash = fixture.hash;
        return { status: "completed", evidenceRefs: [] };
      }

      requireOperation(request, C04_OPERATIONS.moveMobileFixture);
      const fixture = requireFixture(state, request.run);
      const moved = await bindings.fixtureManager.move(C04_FIXTURE_ID, C04_NEW_RELATIVE_PATH);
      const observedHash = await bindings.fixtureManager.hash(C04_FIXTURE_ID);
      if (
        moved.path !== bindings.newPath
        || moved.hash !== state.originalHash
        || observedHash !== state.originalHash
        || moved.sizeBytes !== fixture.sizeBytes
      ) {
        return { status: "failed", summary: "C04 mobile rename/move did not preserve deterministic fixture bytes.", evidenceRefs: [] };
      }
      state.fixture = moved;
      return { status: "completed", evidenceRefs: [] };
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation === C04_OPERATIONS.handoffLineageWindows) {
        await bindings.participantHandoff.handoff({
          run: request.run,
          target: "windows",
          reason: "trusted-lineage-download",
        });
      } else if (request.operation === C04_OPERATIONS.handoffMoveMobile) {
        await bindings.participantHandoff.handoff({
          run: request.run,
          target: "mobile",
          reason: "mobile-move",
        });
      } else if (request.operation === C04_OPERATIONS.handoffMoveWindows) {
        await bindings.participantHandoff.handoff({
          run: request.run,
          target: "windows",
          reason: "windows-move",
        });
      } else {
        return { status: "blocked", summary: `Unsupported C04 handoff operation: ${request.operation}`, evidenceRefs: [] };
      }
      return { status: "completed", evidenceRefs: [] };
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const fixture = requireFixture(state, request.run);

      if (request.operation === C04_OPERATIONS.verifyLineage) {
        const remoteObjectId = await bindings.stableRemoteIdentity.resolveStableRemoteObjectId({
          run: request.run,
          path: bindings.oldPath,
        });
        if (!remoteObjectId) {
          return { status: "blocked", summary: "C04 trusted lineage did not expose a stable Drive object identity.", evidenceRefs: [] };
        }
        state.stableRemoteObjectId = remoteObjectId;
        const report = await bindings.verifier.verify(lineageRequest({
          run: request.run,
          fixture,
          remoteObjectId,
          mobileDeviceId: bindings.mobileDeviceId,
          windowsDeviceId: bindings.windowsDeviceId,
        }));
        return verificationResult(report, "trusted-lineage");
      }

      const remoteObjectId = requireStableIdentity(state);
      const observedIdentity = await bindings.stableRemoteIdentity.resolveStableRemoteObjectId({
        run: request.run,
        path: bindings.newPath,
      });
      if (!observedIdentity) {
        return { status: "blocked", summary: "C04 moved path did not expose a stable Drive identity.", evidenceRefs: [] };
      }
      if (observedIdentity !== remoteObjectId) {
        return { status: "failed", summary: "C04 Drive object identity changed across rename/move.", evidenceRefs: [] };
      }

      if (request.operation === C04_OPERATIONS.verifyRemoteMove) {
        const report = await bindings.verifier.verify(remoteMoveRequest({
          run: request.run,
          fixture,
          oldPath: bindings.oldPath,
          newPath: bindings.newPath,
          remoteObjectId,
          mobileDeviceId: bindings.mobileDeviceId,
        }));
        return verificationResult(report, "remote-move");
      }
      if (request.operation === C04_OPERATIONS.verifyFinal) {
        const report = await bindings.verifier.verify(finalRequest({
          run: request.run,
          fixture,
          oldPath: bindings.oldPath,
          newPath: bindings.newPath,
          remoteObjectId,
          mobileDeviceId: bindings.mobileDeviceId,
          windowsDeviceId: bindings.windowsDeviceId,
        }));
        return verificationResult(report, "final-convergence");
      }
      return { status: "blocked", summary: `Unsupported C04 verification operation: ${request.operation}`, evidenceRefs: [] };
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      requireOperation(request, C04_OPERATIONS.recordEvidence);
      const fixture = requireFixture(state, request.run);
      const remoteObjectId = requireStableIdentity(state);
      const evidenceRefs = await bindings.evidenceRecorder.record({
        run: request.run,
        fixture,
        remoteObjectId,
        oldPath: bindings.oldPath,
        newPath: bindings.newPath,
      });
      if (evidenceRefs.length === 0) {
        return { status: "blocked", summary: "C04 evidence recorder returned no durable evidence reference.", evidenceRefs: [] };
      }
      return { status: "completed", evidenceRefs };
    },
  };

  return Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": handoffDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });
}
