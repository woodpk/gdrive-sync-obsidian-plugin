import type {
  PlanOperationKind,
  RemoteObjectId,
  SynchronizationPlan,
  VaultPath,
} from "../../contracts";
import { assertValidationPlan } from "../plan-assertion-engine";
import {
  validationAssertionId,
  validationPlanExpectation,
  type ValidationPlanAssertionFailure,
  type ValidationProductionDriverRequest,
  type ValidationProductionDriverResult,
  type ValidationStateAssertion,
} from "../driver-plan-fault-verifier-contracts";
import {
  validationDeletionFixture,
  type ValidationFixtureDescriptor,
} from "../fixture-manager";
import type {
  ValidationLocalProtectedPathExpectation,
  ValidationRemoteProtectedPathExpectation,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import {
  validationStepId,
  type ValidationDeviceId,
  type ValidationRunIdentity,
} from "../run-sandbox-checkpoint-contracts";
import type { ValidationRunnerScenarioDefinition } from "../scenario-runner-contracts";

export const C05_SCENARIO_ID = "C05" as const;
export const C05_FIXTURE_ID = "c05-ios-delete-windows-trash" as const;
export const C05_C04_RENAMED_RELATIVE_PATH = "test-ios-c04-renamed.md" as const;

export const C05_FIXTURE_SPEC = validationDeletionFixture(
  C05_FIXTURE_ID,
  C05_C04_RENAMED_RELATIVE_PATH,
);

export const C05_SCENARIO_DEFINITION: ValidationRunnerScenarioDefinition = Object.freeze({
  scenarioId: C05_SCENARIO_ID,
  prerequisiteIds: Object.freeze(["C04-pass", "c05-harness-owned-trusted-fixture"]),
  steps: Object.freeze([
    Object.freeze({
      stepId: validationStepId("c05-delete-mobile-fixture"),
      module: "fixture-manager",
      operation: "c05-delete-mobile-fixture",
      requiredCompletionProof: "operation-complete",
    }),
    Object.freeze({
      stepId: validationStepId("c05-sync-mobile-delete"),
      module: "plan-assertion-engine",
      operation: "c05-sync-mobile-delete",
      requiredCompletionProof: "operation-complete",
    }),
    Object.freeze({
      stepId: validationStepId("c05-handoff-to-windows"),
      module: "cross-device-coordinator",
      operation: "c05-handoff-to-windows",
      requiredCompletionProof: "operation-complete",
    }),
    Object.freeze({
      stepId: validationStepId("c05-sync-windows-delete"),
      module: "plan-assertion-engine",
      operation: "c05-sync-windows-delete",
      requiredCompletionProof: "operation-complete",
    }),
    Object.freeze({
      stepId: validationStepId("c05-verify-delete-convergence"),
      module: "state-convergence-verifier",
      operation: "c05-verify-delete-convergence",
      requiredCompletionProof: "verification-passed",
    }),
    Object.freeze({
      stepId: validationStepId("c05-record-evidence"),
      module: "scenario-evidence-recorder",
      operation: "c05-record-evidence",
      requiredCompletionProof: "evidence-recorded",
    }),
  ]),
});

export const C05_SCENARIO_REGISTRATION = Object.freeze({
  scenarioId: C05_SCENARIO_ID,
  definition: C05_SCENARIO_DEFINITION,
});

export interface C05FixtureDeletePort {
  delete(fixtureId: string): Promise<ValidationFixtureDescriptor>;
}

export interface C05ProductionDriverPort {
  dispatch(request: ValidationProductionDriverRequest): Promise<ValidationProductionDriverResult>;
}

export interface C05VerifierPort {
  verify(request: ValidationStateConvergenceRequest): Promise<{
    readonly result: { readonly verdict: "pass" | "fail" | "blocked" };
  }>;
}

export interface C05TrustedFixture {
  readonly descriptor: ValidationFixtureDescriptor;
  readonly remoteObjectId: RemoteObjectId;
}

export interface C05UnrelatedMutationWitnesses {
  readonly local: readonly ValidationLocalProtectedPathExpectation[];
  readonly remote: readonly ValidationRemoteProtectedPathExpectation[];
}

export interface C05ExecutionInput {
  readonly run: ValidationRunIdentity;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly trustedFixture: C05TrustedFixture;
  readonly unrelated: C05UnrelatedMutationWitnesses;
  readonly mobileFixtureManager: C05FixtureDeletePort;
  readonly mobileProduction: C05ProductionDriverPort;
  readonly windowsProduction: C05ProductionDriverPort;
  readonly verifier: C05VerifierPort;
}

export type C05ExecutionPhase =
  | "precondition"
  | "mobile-delete"
  | "mobile-plan"
  | "mobile-remote-trash-verification"
  | "windows-plan"
  | "final-verification";

export type C05ExecutionResult =
  | {
      readonly status: "completed";
      readonly mobilePlan: SynchronizationPlan;
      readonly windowsPlan: SynchronizationPlan;
    }
  | {
      readonly status: "blocked" | "failed";
      readonly phase: C05ExecutionPhase;
      readonly reason: string;
      readonly observedPlan?: SynchronizationPlan;
      readonly planFailures?: readonly ValidationPlanAssertionFailure[];
    };

const PLAN_OPERATION_KINDS: readonly PlanOperationKind[] = Object.freeze([
  "noop",
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

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function validatePreconditions(input: C05ExecutionInput): C05ExecutionResult | undefined {
  if (input.run.scenarioId !== C05_SCENARIO_ID) {
    return { status: "blocked", phase: "precondition", reason: "C05 execution requires a C05 validation run identity." };
  }
  if (input.mobileDeviceId === input.windowsDeviceId) {
    return { status: "blocked", phase: "precondition", reason: "C05 requires distinct mobile and Windows device identities." };
  }

  const fixture = input.trustedFixture.descriptor;
  if (!sameRun(fixture.identity.run, input.run)) {
    return {
      status: "blocked",
      phase: "precondition",
      reason: "The trusted fixture does not belong to the active C05 validation run.",
    };
  }
  if (
    String(fixture.identity.fixtureId) !== C05_FIXTURE_ID
    || fixture.relativePath !== C05_C04_RENAMED_RELATIVE_PATH
    || fixture.purpose !== "deletion"
    || fixture.kind !== "text"
    || fixture.hash === undefined
  ) {
    return {
      status: "blocked",
      phase: "precondition",
      reason: "C05 requires the exact harness-owned trusted deletion fixture at the C04-renamed path.",
    };
  }
  if (input.unrelated.local.length + input.unrelated.remote.length === 0) {
    return {
      status: "blocked",
      phase: "precondition",
      reason: "C05 requires at least one unrelated protected witness for mutation-absence proof.",
    };
  }
  if (
    input.unrelated.local.some(item => item.path === fixture.path)
    || input.unrelated.remote.some(item => item.path === fixture.path)
  ) {
    return {
      status: "blocked",
      phase: "precondition",
      reason: "The C05 target path cannot also be used as an unrelated-mutation witness.",
    };
  }
  return undefined;
}

function forbiddenKinds(expected: "trash-remote" | "trash-local"): readonly PlanOperationKind[] {
  return Object.freeze(PLAN_OPERATION_KINDS.filter(kind => kind !== "noop" && kind !== expected));
}

function deletionExpectation(
  run: ValidationRunIdentity,
  path: VaultPath,
  remoteObjectId: RemoteObjectId,
  expected: "trash-remote" | "trash-local",
) {
  return validationPlanExpectation({
    run,
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([
      Object.freeze({
        kind: expected,
        path,
        destructive: true,
        targetSide: expected === "trash-remote" ? "remote" : "local",
        ...(expected === "trash-remote" ? { remoteObjectId } : {}),
      }),
    ]),
    allowedBackgroundKinds: Object.freeze(["noop"]),
    forbiddenKinds: forbiddenKinds(expected),
    conflictExpectation: "forbidden",
    destructiveExpectation: "allowed-exactly-as-expected",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
}

function attestationReason(plan: SynchronizationPlan, expected: "trash-remote" | "trash-local"): string | undefined {
  const reasonCode = expected === "trash-remote" ? "attested-local-deletion" : "attested-remote-deletion";
  const operation = plan.operations.find(item => item.kind === expected);
  return operation?.reasons.some(reason => reason.code === reasonCode)
    ? undefined
    : `Expected ${expected} to retain production attestation reason ${reasonCode}.`;
}

async function executeExpectedDeletePlan(input: {
  readonly run: ValidationRunIdentity;
  readonly path: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
  readonly expected: "trash-remote" | "trash-local";
  readonly driver: C05ProductionDriverPort;
  readonly stepPrefix: "mobile" | "windows";
}): Promise<
  | { readonly status: "completed"; readonly plan: SynchronizationPlan }
  | {
      readonly status: "blocked" | "failed";
      readonly reason: string;
      readonly observedPlan?: SynchronizationPlan;
      readonly planFailures?: readonly ValidationPlanAssertionFailure[];
    }
> {
  const preview = await input.driver.dispatch({
    kind: "preview-manual",
    run: input.run,
    stepId: validationStepId(`c05-${input.stepPrefix}-preview`),
  });
  if (preview.status !== "plan-observed") {
    return {
      status: preview.status === "request-failed" ? "failed" : "blocked",
      reason: preview.status === "request-accepted"
        ? "Manual C05 preview unexpectedly returned execution acknowledgement."
        : preview.reason,
    };
  }

  const assertion = assertValidationPlan({
    assertionId: `c05-${input.stepPrefix}-delete-plan`,
    expectation: deletionExpectation(input.run, input.path, input.remoteObjectId, input.expected),
    plan: preview.plan,
  });
  if (assertion.status === "mismatch") {
    return {
      status: "blocked",
      reason: "Observed production deletion plan does not match the exact C05 fixture-scoped contract.",
      observedPlan: preview.plan,
      planFailures: assertion.failures,
    };
  }

  const reasonFailure = attestationReason(preview.plan, input.expected);
  if (reasonFailure) {
    return { status: "blocked", reason: reasonFailure, observedPlan: preview.plan };
  }

  const executed = await input.driver.dispatch({
    kind: "execute-asserted-plan",
    run: input.run,
    stepId: validationStepId(`c05-${input.stepPrefix}-execute`),
    authorization: assertion.authorization,
  });
  if (executed.status !== "request-accepted") {
    return {
      status: executed.status === "request-failed" ? "failed" : "blocked",
      reason: executed.status === "plan-observed" || executed.status === "no-plan-observed"
        ? "C05 execution returned an unexpected production driver result."
        : executed.reason,
      observedPlan: preview.plan,
    };
  }
  return { status: "completed", plan: preview.plan };
}

function stateAssertion(
  id: string,
  kind: ValidationStateAssertion["kind"],
  subject: string,
  expectation: string,
): ValidationStateAssertion {
  return {
    assertionId: validationAssertionId(id),
    kind,
    subject,
    expectation,
  };
}

function intermediateVerification(input: C05ExecutionInput): ValidationStateConvergenceRequest {
  const path = input.trustedFixture.descriptor.path;
  const remoteObjectId = input.trustedFixture.remoteObjectId;
  return {
    run: input.run,
    state: [
      {
        kind: "live-trash-absence-state",
        assertion: stateAssertion(
          "c05-mobile-remote-trash",
          "live-trash-absence-state",
          "C05 managed remote target",
          "The fixture is recoverably trashed and no live same-path object remains.",
        ),
        path,
        expectedState: "trashed",
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(
          "c05-mobile-tombstone",
          "mapping-or-tombstone",
          "C05 mobile deletion authority",
          "Mobile trusted authority contains a tombstone and no live mapping for the deleted fixture.",
        ),
        deviceId: input.mobileDeviceId,
        path,
        expected: "tombstone",
        remoteObjectId,
        entityKind: "file",
      },
      {
        kind: "durable-intent-or-effect",
        assertion: stateAssertion(
          "c05-mobile-no-outstanding-effect",
          "durable-intent-or-effect",
          "C05 mobile durable effects",
          "No remote-delete effect remains unresolved before Windows consumes the deletion.",
        ),
        deviceId: input.mobileDeviceId,
        expected: "none-outstanding",
      },
      {
        kind: "terminal-product-result",
        assertion: stateAssertion(
          "c05-mobile-production-trash-complete",
          "terminal-product-result",
          "C05 mobile production deletion execution",
          "Production execution completed a trash-remote operation.",
        ),
        diagnostic: {
          deviceId: input.mobileDeviceId,
          component: "sync.execute",
          event: "operation-complete",
          expectedFields: { operationKind: "trash-remote", target: "remote", destructiveCount: 1 },
        },
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: stateAssertion(
          "c05-mobile-unrelated-unchanged",
          "unrelated-mutation-absence",
          "C05 protected unrelated paths after mobile propagation",
          "Declared unrelated local and remote witnesses remain unchanged.",
        ),
        local: input.unrelated.local,
        remote: input.unrelated.remote,
      },
    ],
    convergence: [
      {
        kind: "cross-device-path",
        assertion: {
          assertionId: validationAssertionId("c05-mobile-local-absence"),
          kind: "cross-device-path",
          subject: "C05 mobile fixture path",
          expectation: "The mobile participant no longer exposes the deleted fixture as live content.",
        },
        deviceIds: [input.mobileDeviceId],
        path,
        expected: "absent",
      },
    ],
  };
}

function finalVerification(input: C05ExecutionInput): ValidationStateConvergenceRequest {
  const path = input.trustedFixture.descriptor.path;
  const remoteObjectId = input.trustedFixture.remoteObjectId;
  return {
    run: input.run,
    state: [
      {
        kind: "live-trash-absence-state",
        assertion: stateAssertion(
          "c05-final-remote-trash",
          "live-trash-absence-state",
          "C05 managed remote target",
          "Exactly one same-path remote object remains and it is recoverably trashed, not live.",
        ),
        path,
        expectedState: "trashed",
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(
          "c05-final-mobile-tombstone",
          "mapping-or-tombstone",
          "C05 mobile deletion authority",
          "Mobile trusted authority retains the deletion tombstone without a live mapping.",
        ),
        deviceId: input.mobileDeviceId,
        path,
        expected: "tombstone",
        remoteObjectId,
        entityKind: "file",
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(
          "c05-final-windows-tombstone",
          "mapping-or-tombstone",
          "C05 Windows deletion authority",
          "Windows trusted authority retains the deletion tombstone without a live mapping.",
        ),
        deviceId: input.windowsDeviceId,
        path,
        expected: "tombstone",
        remoteObjectId,
        entityKind: "file",
      },
      {
        kind: "durable-intent-or-effect",
        assertion: stateAssertion(
          "c05-final-mobile-effects",
          "durable-intent-or-effect",
          "C05 mobile durable effects",
          "No mobile deletion effect remains outstanding.",
        ),
        deviceId: input.mobileDeviceId,
        expected: "none-outstanding",
      },
      {
        kind: "durable-intent-or-effect",
        assertion: stateAssertion(
          "c05-final-windows-effects",
          "durable-intent-or-effect",
          "C05 Windows durable effects",
          "No Windows deletion effect remains outstanding.",
        ),
        deviceId: input.windowsDeviceId,
        expected: "none-outstanding",
      },
      {
        kind: "terminal-product-result",
        assertion: stateAssertion(
          "c05-windows-production-trash-complete",
          "terminal-product-result",
          "C05 Windows recoverable local deletion",
          "Production execution completed a trash-local operation through the local-vault trash boundary.",
        ),
        diagnostic: {
          deviceId: input.windowsDeviceId,
          component: "sync.execute",
          event: "operation-complete",
          expectedFields: { operationKind: "trash-local", target: "local", destructiveCount: 1 },
        },
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: stateAssertion(
          "c05-final-unrelated-unchanged",
          "unrelated-mutation-absence",
          "C05 protected unrelated paths",
          "Declared unrelated local and remote witnesses remain unchanged through final convergence.",
        ),
        local: input.unrelated.local,
        remote: input.unrelated.remote,
      },
    ],
    convergence: [
      {
        kind: "cross-device-path",
        assertion: {
          assertionId: validationAssertionId("c05-cross-device-path-absence"),
          kind: "cross-device-path",
          subject: "C05 deleted fixture path",
          expectation: "Mobile and Windows both authoritatively observe the fixture path as absent.",
        },
        deviceIds: [input.mobileDeviceId, input.windowsDeviceId],
        path,
        expected: "absent",
      },
      {
        kind: "cross-device-authority",
        assertion: {
          assertionId: validationAssertionId("c05-cross-device-tombstone-authority"),
          kind: "cross-device-authority",
          subject: "C05 deleted fixture authority",
          expectation: "Both participants retain coherent tombstone authority with no live BASE or mapping.",
        },
        deviceIds: [input.mobileDeviceId, input.windowsDeviceId],
        path,
        expectedTombstone: true,
      },
    ],
  };
}

export async function executeC05Scenario(input: C05ExecutionInput): Promise<C05ExecutionResult> {
  const precondition = validatePreconditions(input);
  if (precondition) return precondition;

  const fixture = input.trustedFixture.descriptor;
  let deleted: ValidationFixtureDescriptor;
  try {
    deleted = await input.mobileFixtureManager.delete(C05_FIXTURE_ID);
  } catch (error) {
    return {
      status: "failed",
      phase: "mobile-delete",
      reason: error instanceof Error ? error.message : "Mobile fixture deletion failed.",
    };
  }
  if (deleted.path !== fixture.path || !sameRun(deleted.identity.run, input.run)) {
    return {
      status: "blocked",
      phase: "mobile-delete",
      reason: "Fixture manager deleted a different path or run-owned fixture than the trusted C05 target.",
    };
  }

  const mobile = await executeExpectedDeletePlan({
    run: input.run,
    path: fixture.path,
    remoteObjectId: input.trustedFixture.remoteObjectId,
    expected: "trash-remote",
    driver: input.mobileProduction,
    stepPrefix: "mobile",
  });
  if (mobile.status !== "completed") return { ...mobile, phase: "mobile-plan" };

  const remoteTrash = await input.verifier.verify(intermediateVerification(input));
  if (remoteTrash.result.verdict !== "pass") {
    return {
      status: remoteTrash.result.verdict === "fail" ? "failed" : "blocked",
      phase: "mobile-remote-trash-verification",
      reason: "Attested remote trash and mobile deletion authority were not objectively proven; Windows deletion was not started.",
      observedPlan: mobile.plan,
    };
  }

  const windows = await executeExpectedDeletePlan({
    run: input.run,
    path: fixture.path,
    remoteObjectId: input.trustedFixture.remoteObjectId,
    expected: "trash-local",
    driver: input.windowsProduction,
    stepPrefix: "windows",
  });
  if (windows.status !== "completed") return { ...windows, phase: "windows-plan" };

  const final = await input.verifier.verify(finalVerification(input));
  if (final.result.verdict !== "pass") {
    return {
      status: final.result.verdict === "fail" ? "failed" : "blocked",
      phase: "final-verification",
      reason: "C05 final Windows trash/tombstone/convergence proof did not pass.",
      observedPlan: windows.plan,
    };
  }

  return { status: "completed", mobilePlan: mobile.plan, windowsPlan: windows.plan };
}
