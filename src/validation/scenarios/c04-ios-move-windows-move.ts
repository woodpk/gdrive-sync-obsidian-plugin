import {
  contractId,
  type ContentHash,
  type PlanOperationKind,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../../contracts";
import {
  validationAssertionId,
  validationPlanExpectation,
  type ValidationConvergenceAssertion,
  type ValidationExpectedPlanOperation,
  type ValidationPlanAssertionResult,
  type ValidationProductionDriverResult,
  type ValidationStateAssertion,
} from "../driver-plan-fault-verifier-contracts";
import {
  validationTextFixture,
  type ValidationFixtureManager,
} from "../fixture-manager";
import { assertValidationPlan } from "../plan-assertion-engine";
import type { ValidationProductionPathDriver } from "../production-path-driver";
import {
  validationStepId,
  type ValidationDeviceId,
  type ValidationRunIdentity,
} from "../run-sandbox-checkpoint-contracts";
import type { ValidationRunnerScenarioDefinition } from "../scenario-runner-contracts";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";

export const C04_SCENARIO_ID = "C04" as const;
export const C04_FIXTURE_ID = "c04-mobile-move" as const;
export const C04_OLD_RELATIVE_PATH = "test-ios-c02.md" as const;
export const C04_NEW_RELATIVE_PATH = "test-ios-c04-renamed.md" as const;

const C04_FORBIDDEN_NON_MOVE_KINDS: readonly PlanOperationKind[] = Object.freeze([
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

/**
 * C04 is self-seeding: it creates and synchronizes a disposable fixture to a
 * trustworthy two-device BASE before performing the authoritative move. It
 * therefore does not depend on a live C03 result during harness execution.
 */
export const C04_SCENARIO_DEFINITION: ValidationRunnerScenarioDefinition = Object.freeze({
  scenarioId: C04_SCENARIO_ID,
  prerequisiteIds: Object.freeze([]),
  steps: Object.freeze([
    { stepId: validationStepId("c04-lineage-create"), module: "fixture-manager", operation: "c04-lineage-create", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-mobile-preview"), module: "production-path-driver", operation: "preview-manual", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-mobile-assert"), module: "plan-assertion-engine", operation: "c04-lineage-mobile-assert", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-mobile-execute"), module: "production-path-driver", operation: "execute-asserted-plan", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-windows-handoff"), module: "cross-device-coordinator", operation: "c04-lineage-windows-handoff", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-windows-preview"), module: "production-path-driver", operation: "preview-manual", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-windows-assert"), module: "plan-assertion-engine", operation: "c04-lineage-windows-assert", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-windows-execute"), module: "production-path-driver", operation: "execute-asserted-plan", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-lineage-verify"), module: "state-convergence-verifier", operation: "c04-lineage-verify", requiredCompletionProof: "verification-passed" },
    { stepId: validationStepId("c04-mobile-move"), module: "fixture-manager", operation: "c04-mobile-move", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-mobile-preview"), module: "production-path-driver", operation: "preview-manual", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-mobile-move-assert"), module: "plan-assertion-engine", operation: "c04-mobile-move-assert", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-mobile-execute"), module: "production-path-driver", operation: "execute-asserted-plan", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-remote-move-verify"), module: "state-convergence-verifier", operation: "c04-remote-move-verify", requiredCompletionProof: "verification-passed" },
    { stepId: validationStepId("c04-windows-handoff"), module: "cross-device-coordinator", operation: "c04-windows-handoff", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-windows-preview"), module: "production-path-driver", operation: "preview-manual", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-windows-move-assert"), module: "plan-assertion-engine", operation: "c04-windows-move-assert", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-windows-execute"), module: "production-path-driver", operation: "execute-asserted-plan", requiredCompletionProof: "operation-complete" },
    { stepId: validationStepId("c04-final-verify"), module: "state-convergence-verifier", operation: "c04-final-verify", requiredCompletionProof: "verification-passed" },
    { stepId: validationStepId("c04-evidence"), module: "scenario-evidence-recorder", operation: "c04-evidence", requiredCompletionProof: "evidence-recorded" },
  ]),
});

/** Scenario-local registration. H7 integration owns insertion into the shared registry. */
export const C04_SCENARIO_REGISTRATION = Object.freeze({
  scenarioId: C04_SCENARIO_ID,
  definition: C04_SCENARIO_DEFINITION,
});

export type C04ProductionDriverPort = Pick<ValidationProductionPathDriver, "dispatch">;
export type C04FixtureManagerPort = Pick<ValidationFixtureManager, "create" | "move" | "hash">;
export type C04VerifierPort = Pick<StateConvergenceVerifier, "verify">;

export interface C04ScenarioExecutorOptions {
  readonly run: ValidationRunIdentity;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileFixtures: C04FixtureManagerPort;
  readonly mobileProduction: C04ProductionDriverPort;
  readonly windowsProduction: C04ProductionDriverPort;
  readonly verifier: C04VerifierPort;
}

export type C04ScenarioExecutionResult =
  | {
      readonly status: "completed";
      readonly remoteObjectId: RemoteObjectId;
      readonly contentHash: ContentHash;
      readonly sizeBytes: number;
      readonly oldPath: VaultPath;
      readonly newPath: VaultPath;
      readonly verification: ValidationStateConvergenceReport;
    }
  | {
      readonly status: "failed" | "blocked";
      readonly phase: string;
      readonly reason: string;
      readonly planAssertion?: ValidationPlanAssertionResult;
    };

function stateAssertion(id: string, kind: ValidationStateAssertion["kind"], expectation: string): ValidationStateAssertion {
  return { assertionId: validationAssertionId(id), kind, subject: C04_SCENARIO_ID, expectation };
}

function convergenceAssertion(
  id: string,
  kind: ValidationConvergenceAssertion["kind"],
  expectation: string,
): ValidationConvergenceAssertion {
  return { assertionId: validationAssertionId(id), kind, subject: C04_SCENARIO_ID, expectation };
}

function expectedOperation(input: {
  readonly kind: PlanOperationKind;
  readonly path: VaultPath;
  readonly targetSide: "local" | "remote";
  readonly remoteObjectId?: RemoteObjectId;
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
}): ValidationExpectedPlanOperation {
  return {
    kind: input.kind,
    path: input.path,
    targetSide: input.targetSide,
    destructive: false,
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
  };
}

function planExpectation(input: {
  readonly run: ValidationRunIdentity;
  readonly expected: ValidationExpectedPlanOperation;
  readonly moveOnly?: boolean;
}) {
  return validationPlanExpectation({
    run: input.run,
    expectedTrigger: "manual",
    expectedOperations: [input.expected],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: input.moveOnly
      ? C04_FORBIDDEN_NON_MOVE_KINDS
      : ["unresolved-conflict", "trash-local", "trash-remote", "blocked-unsafe", "recovery-required"],
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
}

function stableRemoteIdFromLineagePlan(plan: SynchronizationPlan, oldPath: VaultPath): RemoteObjectId | undefined {
  const candidates = plan.operations.filter(operation =>
    operation.kind === "download-create"
    && operation.path === oldPath
    && operation.targetSide === "local"
    && operation.destructive === false,
  );
  if (candidates.length !== 1) return undefined;
  return candidates[0]?.remoteObjectId;
}

function driverStop(phase: string, result: ValidationProductionDriverResult): C04ScenarioExecutionResult | undefined {
  if (result.status === "plan-observed" || result.status === "request-accepted") return undefined;
  return {
    status: "blocked",
    phase,
    reason: result.status === "no-plan-observed" ? result.reason : result.reason,
  };
}

function planStop(phase: string, assertion: ValidationPlanAssertionResult): C04ScenarioExecutionResult | undefined {
  if (assertion.status === "matched") return undefined;
  return {
    status: "failed",
    phase,
    reason: assertion.failures.map(failure => failure.summary).join(" | "),
    planAssertion: assertion,
  };
}

function verifierStop(phase: string, report: ValidationStateConvergenceReport): C04ScenarioExecutionResult | undefined {
  if (report.result.verdict === "pass") return undefined;
  return {
    status: report.result.verdict === "fail" ? "failed" : "blocked",
    phase,
    reason: report.result.verdict === "fail"
      ? "C04 objective state/convergence verification failed."
      : "C04 required objective state/convergence proof was not observable.",
  };
}

function lineageVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly oldPath: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
  readonly contentHash: ContentHash;
  readonly sizeBytes: number;
}): ValidationStateConvergenceRequest {
  const content = { hash: input.contentHash, sizeBytes: input.sizeBytes };
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c04-lineage-mobile-content", "local-content", "Mobile seed bytes match the deterministic fixture."), deviceId: input.mobileDeviceId, path: input.oldPath, content },
      { kind: "local-content", assertion: stateAssertion("c04-lineage-windows-content", "local-content", "Windows seed bytes match the deterministic fixture."), deviceId: input.windowsDeviceId, path: input.oldPath, content },
      { kind: "remote-content", assertion: stateAssertion("c04-lineage-remote-content", "remote-content", "Remote seed bytes and stable identity match the trusted fixture."), path: input.oldPath, remoteObjectId: input.remoteObjectId, content },
      { kind: "base-authority", assertion: stateAssertion("c04-lineage-mobile-base", "base-authority", "Mobile BASE binds the seed path to the stable Drive object."), deviceId: input.mobileDeviceId, path: input.oldPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "base-authority", assertion: stateAssertion("c04-lineage-windows-base", "base-authority", "Windows BASE binds the seed path to the stable Drive object."), deviceId: input.windowsDeviceId, path: input.oldPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-lineage-mobile-mapping", "mapping-or-tombstone", "Mobile trusted state contains the live stable mapping and no tombstone."), deviceId: input.mobileDeviceId, path: input.oldPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-lineage-windows-mapping", "mapping-or-tombstone", "Windows trusted state contains the live stable mapping and no tombstone."), deviceId: input.windowsDeviceId, path: input.oldPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c04-lineage-mobile-intents", "durable-intent-or-effect", "Mobile has no outstanding durable mutation effect."), deviceId: input.mobileDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c04-lineage-windows-intents", "durable-intent-or-effect", "Windows has no outstanding durable mutation effect."), deviceId: input.windowsDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c04-lineage-content-converged", "cross-device-content", "Both participants hold the same seed bytes."), deviceIds: [input.mobileDeviceId, input.windowsDeviceId], path: input.oldPath, content },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c04-lineage-authority-converged", "cross-device-authority", "Both participants bind the seed path to the same Drive identity."), deviceIds: [input.mobileDeviceId, input.windowsDeviceId], path: input.oldPath, expectedRemoteObjectId: input.remoteObjectId, expectedTombstone: false },
    ],
  };
}

function remoteMoveVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly oldPath: VaultPath;
  readonly newPath: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
  readonly contentHash: ContentHash;
  readonly sizeBytes: number;
}): ValidationStateConvergenceRequest {
  const content = { hash: input.contentHash, sizeBytes: input.sizeBytes };
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c04-mobile-new-content", "local-content", "Mobile moved file retains the original bytes."), deviceId: input.mobileDeviceId, path: input.newPath, content },
      { kind: "live-trash-absence-state", assertion: stateAssertion("c04-remote-old-absent", "live-trash-absence-state", "The old remote path is absent after an identity-preserving move."), path: input.oldPath, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c04-remote-new-content", "remote-content", "The same Drive object is live at the new path with unchanged bytes."), path: input.newPath, remoteObjectId: input.remoteObjectId, content },
