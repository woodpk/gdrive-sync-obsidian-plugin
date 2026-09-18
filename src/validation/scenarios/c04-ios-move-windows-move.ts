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
