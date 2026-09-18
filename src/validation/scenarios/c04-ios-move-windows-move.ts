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
      { kind: "base-authority", assertion: stateAssertion("c04-mobile-new-base", "base-authority", "Mobile BASE follows the stable Drive identity to the new path."), deviceId: input.mobileDeviceId, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-mobile-new-mapping", "mapping-or-tombstone", "Mobile mapping follows the stable Drive identity to the new path."), deviceId: input.mobileDeviceId, path: input.newPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-mobile-old-authority-cleared", "mapping-or-tombstone", "The old mobile path has neither a live mapping nor a deletion tombstone."), deviceId: input.mobileDeviceId, path: input.oldPath, expected: "neither" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c04-mobile-move-intents", "durable-intent-or-effect", "Mobile has no outstanding durable effect after the verified remote move."), deviceId: input.mobileDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c04-mobile-move-bytes", "cross-device-content", "The moved mobile path retains the original fixture bytes."), deviceIds: [input.mobileDeviceId], path: input.newPath, content },
      { kind: "cross-device-path", assertion: convergenceAssertion("c04-mobile-old-path-absent", "cross-device-path", "The old mobile path is absent after the move."), deviceIds: [input.mobileDeviceId], path: input.oldPath, expected: "absent" },
    ],
  };
}

export function c04FinalVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly oldPath: VaultPath;
  readonly newPath: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
  readonly contentHash: ContentHash;
  readonly sizeBytes: number;
}): ValidationStateConvergenceRequest {
  const content = { hash: input.contentHash, sizeBytes: input.sizeBytes };
  const devices = [input.mobileDeviceId, input.windowsDeviceId] as const;
  return {
    run: input.run,
    state: [
      { kind: "local-content", assertion: stateAssertion("c04-final-mobile-content", "local-content", "Mobile new-path bytes are unchanged."), deviceId: input.mobileDeviceId, path: input.newPath, content },
      { kind: "local-content", assertion: stateAssertion("c04-final-windows-content", "local-content", "Windows new-path bytes are unchanged."), deviceId: input.windowsDeviceId, path: input.newPath, content },
      { kind: "live-trash-absence-state", assertion: stateAssertion("c04-final-remote-old-absent", "live-trash-absence-state", "Old remote path is absent without delete/create substitution."), path: input.oldPath, expectedState: "absent" },
      { kind: "remote-content", assertion: stateAssertion("c04-final-remote-content", "remote-content", "Stable Drive object is live at the new path with unchanged bytes."), path: input.newPath, remoteObjectId: input.remoteObjectId, content },
      { kind: "base-authority", assertion: stateAssertion("c04-final-mobile-base", "base-authority", "Mobile BASE retains the stable Drive identity at the new path."), deviceId: input.mobileDeviceId, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "base-authority", assertion: stateAssertion("c04-final-windows-base", "base-authority", "Windows BASE retains the stable Drive identity at the new path."), deviceId: input.windowsDeviceId, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-mobile-mapping", "mapping-or-tombstone", "Mobile new path has the live stable mapping."), deviceId: input.mobileDeviceId, path: input.newPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-windows-mapping", "mapping-or-tombstone", "Windows new path has the live stable mapping."), deviceId: input.windowsDeviceId, path: input.newPath, expected: "mapping", remoteObjectId: input.remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-mobile-old-no-tombstone", "mapping-or-tombstone", "Mobile old path has neither mapping nor tombstone; move was not deletion."), deviceId: input.mobileDeviceId, path: input.oldPath, expected: "neither" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("c04-final-windows-old-no-tombstone", "mapping-or-tombstone", "Windows old path has neither mapping nor tombstone; move was not deletion."), deviceId: input.windowsDeviceId, path: input.oldPath, expected: "neither" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c04-final-mobile-no-intents", "durable-intent-or-effect", "Mobile has no outstanding durable mutation effect."), deviceId: input.mobileDeviceId, expected: "none-outstanding" },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("c04-final-windows-no-intents", "durable-intent-or-effect", "Windows has no outstanding durable mutation effect."), deviceId: input.windowsDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c04-final-content-converged", "cross-device-content", "Both devices contain the unchanged bytes at the new path."), deviceIds: devices, path: input.newPath, content },
      { kind: "cross-device-path", assertion: convergenceAssertion("c04-final-new-path-present", "cross-device-path", "Both devices contain the file at the new path."), deviceIds: devices, path: input.newPath, expected: "file" },
      { kind: "cross-device-path", assertion: convergenceAssertion("c04-final-old-path-absent", "cross-device-path", "The old path is absent on both devices."), deviceIds: devices, path: input.oldPath, expected: "absent" },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c04-final-authority-converged", "cross-device-authority", "Both devices bind the new path to the same stable Drive identity without tombstones."), deviceIds: devices, path: input.newPath, expectedRemoteObjectId: input.remoteObjectId, expectedTombstone: false },
    ],
  };
}

async function previewManual(
  phase: string,
  driver: C04ProductionDriverPort,
  run: ValidationRunIdentity,
): Promise<SynchronizationPlan | C04ScenarioExecutionResult> {
  const result = await driver.dispatch({ kind: "preview-manual", run, stepId: validationStepId("c04:" + phase + ":preview") });
  const stop = driverStop(phase + "-preview", result);
  if (stop) return stop;
  if (result.status !== "plan-observed") {
    return { status: "blocked", phase: phase + "-preview", reason: "C04 manual preview did not expose a production plan." };
  }
  return result.plan;
}

async function executeMatched(
  phase: string,
  driver: C04ProductionDriverPort,
  run: ValidationRunIdentity,
  assertion: Extract<ValidationPlanAssertionResult, { readonly status: "matched" }>,
): Promise<C04ScenarioExecutionResult | undefined> {
  const result = await driver.dispatch({
    kind: "execute-asserted-plan",
    run,
    stepId: validationStepId("c04:" + phase + ":execute"),
    authorization: assertion.authorization,
  });
  return driverStop(phase + "-execute", result);
}

export class C04ScenarioExecutor {
  constructor(private readonly options: C04ScenarioExecutorOptions) {
    if (options.run.scenarioId !== C04_SCENARIO_ID) throw new Error("C04 executor requires a C04 validation run identity.");
    if (options.mobileDeviceId === options.windowsDeviceId) throw new Error("C04 requires distinct mobile and Windows device identities.");
  }

  async execute(): Promise<C04ScenarioExecutionResult> {
    try {
      const fixture = await this.options.mobileFixtures.create(
        validationTextFixture(C04_FIXTURE_ID, C04_OLD_RELATIVE_PATH, 1, "base", "ordinary"),
      );
      if (!fixture.hash) {
        return { status: "blocked", phase: "lineage-create", reason: "C04 deterministic text fixture produced no content hash." };
      }
      const oldPath = fixture.path;
      const contentHash = fixture.hash;
      const sizeBytes = fixture.sizeBytes;

      const mobileSeedPlan = await previewManual("lineage-mobile", this.options.mobileProduction, this.options.run);
      if ("status" in mobileSeedPlan) return mobileSeedPlan;
      const mobileSeedAssertion = assertValidationPlan({
        assertionId: "c04-lineage-mobile-upload-create",
        expectation: planExpectation({
          run: this.options.run,
          expected: expectedOperation({ kind: "upload-create", path: oldPath, targetSide: "remote" }),
        }),
        plan: mobileSeedPlan,
      });
      const mobileSeedStop = planStop("lineage-mobile-plan", mobileSeedAssertion);
      if (mobileSeedStop) return mobileSeedStop;
      const mobileSeedExecuteStop = await executeMatched(
        "lineage-mobile",
        this.options.mobileProduction,
        this.options.run,
        mobileSeedAssertion as Extract<ValidationPlanAssertionResult, { readonly status: "matched" }>,
      );
      if (mobileSeedExecuteStop) return mobileSeedExecuteStop;

      const windowsSeedPlan = await previewManual("lineage-windows", this.options.windowsProduction, this.options.run);
      if ("status" in windowsSeedPlan) return windowsSeedPlan;
      const remoteObjectId = stableRemoteIdFromLineagePlan(windowsSeedPlan, oldPath);
      if (!remoteObjectId) {
        return { status: "failed", phase: "lineage-windows-plan", reason: "C04 trusted-lineage download-create did not expose exactly one stable Drive object identity." };
      }
      const windowsSeedAssertion = assertValidationPlan({
        assertionId: "c04-lineage-windows-download-create",
        expectation: planExpectation({
          run: this.options.run,
          expected: expectedOperation({ kind: "download-create", path: oldPath, targetSide: "local", remoteObjectId }),
        }),
        plan: windowsSeedPlan,
      });
