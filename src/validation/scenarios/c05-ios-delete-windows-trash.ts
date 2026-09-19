import {
  PLAN_OPERATION_KINDS,
  type PlanOperationKind,
  type RemoteObjectId,
  type VaultPath,
} from "../../contracts";
import {
  validationAssertionId,
  type ValidationEvidenceRef,
  type ValidationPlanExpectation,
  type ValidationStateAssertion,
} from "../driver-plan-fault-verifier-contracts";
import type { ValidationFixtureDescriptor } from "../fixture-manager";
import {
  validationStepId,
  type ValidationDeviceId,
} from "../run-sandbox-checkpoint-contracts";
import type {
  ValidationLocalProtectedPathExpectation,
  ValidationRemoteProtectedPathExpectation,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type {
  ValidationRunnerApprovedModuleDelegate,
} from "../scenario-runner-module-adapter";
import type {
  ValidationRunnerScenarioDefinition,
} from "../scenario-runner-contracts";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const C05_SCENARIO_ID = "C05" as const;
export const C05_C04_RENAMED_RELATIVE_PATH = "test-ios-c04-renamed.md" as const;
export const C05_MOBILE_AUTHORITY_CYCLE_ID = "c05-mobile-delete-cycle" as const;
export const C05_WINDOWS_AUTHORITY_CYCLE_ID = "c05-windows-delete-cycle" as const;

export interface C05TrustedFixtureAuthority {
  readonly descriptor: ValidationFixtureDescriptor;
  readonly remoteObjectId: RemoteObjectId;
}

export interface C05UnrelatedMutationWitnesses {
  readonly local: readonly ValidationLocalProtectedPathExpectation[];
  readonly remote: readonly ValidationRemoteProtectedPathExpectation[];
}

export interface C05ScenarioAuthority {
  readonly trustedFixture: C05TrustedFixtureAuthority;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly unrelated: C05UnrelatedMutationWitnesses;
}

export interface C05FixtureDeletePort {
  delete(fixtureId: string): Promise<ValidationFixtureDescriptor>;
}

export interface C05StateVerifierPort {
  verify(request: ValidationStateConvergenceRequest): Promise<{
    readonly result: { readonly verdict: "pass" | "fail" | "blocked" };
    readonly evidence: readonly { readonly ref: ValidationEvidenceRef }[];
  }>;
}

export interface C05RuntimeBindings {
  readonly fixtureManager: C05FixtureDeletePort;
  readonly verifier: C05StateVerifierPort;
  readonly crossDeviceCoordinator: ValidationRunnerApprovedModuleDelegate;
  readonly evidenceRecorder: ValidationRunnerApprovedModuleDelegate;
}

type C05VerificationTemplate = Omit<ValidationStateConvergenceRequest, "run">;

function sameTargetPath(authority: C05ScenarioAuthority, path: VaultPath): boolean {
  return authority.trustedFixture.descriptor.path === path;
}

function validateAuthority(authority: C05ScenarioAuthority): void {
  const fixture = authority.trustedFixture.descriptor;
  if (
    fixture.relativePath !== C05_C04_RENAMED_RELATIVE_PATH
    || fixture.kind !== "text"
    || fixture.hash === undefined
    || fixture.sizeBytes === undefined
  ) {
    throw new Error("C05 requires the trusted C04 file lineage at test-ios-c04-renamed.md with exact content evidence.");
  }
  if (authority.mobileDeviceId === authority.windowsDeviceId) {
    throw new Error("C05 requires distinct mobile and Windows validation device identities.");
  }
  if (authority.unrelated.local.length + authority.unrelated.remote.length === 0) {
    throw new Error("C05 requires at least one unrelated protected witness.");
  }
  if (
    authority.unrelated.local.some(item => sameTargetPath(authority, item.path))
    || authority.unrelated.remote.some(item => sameTargetPath(authority, item.path))
  ) {
    throw new Error("The C05 deletion target cannot also be an unrelated protected witness.");
  }
}

function forbiddenKinds(expected: "trash-remote" | "trash-local"): readonly PlanOperationKind[] {
  return Object.freeze(
    PLAN_OPERATION_KINDS.filter(kind => kind !== "noop" && kind !== expected),
  );
}

function deletePlanExpectation(
  authority: C05ScenarioAuthority,
  expected: "trash-remote" | "trash-local",
): Omit<ValidationPlanExpectation, "run"> {
  const path = authority.trustedFixture.descriptor.path;
  return Object.freeze({
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([
      Object.freeze({
        kind: expected,
        path,
        destructive: true,
        targetSide: expected === "trash-remote" ? "remote" : "local",
        ...(expected === "trash-remote"
          ? { remoteObjectId: authority.trustedFixture.remoteObjectId }
          : {}),
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

function mobileVerification(authority: C05ScenarioAuthority): C05VerificationTemplate {
  const path = authority.trustedFixture.descriptor.path;
  const remoteObjectId = authority.trustedFixture.remoteObjectId;
  return Object.freeze({
    state: Object.freeze([
      Object.freeze({
        kind: "live-trash-absence-state" as const,
        assertion: stateAssertion(
          "c05-mobile-exact-remote-trash",
          "live-trash-absence-state",
          "C05 exact managed remote object",
          "The exact stable Drive object is recoverably trashed at the C04-renamed path.",
        ),
        path,
        expectedState: "trashed" as const,
        remoteObjectId,
      }),
      Object.freeze({
        kind: "live-trash-absence-state" as const,
        assertion: stateAssertion(
          "c05-mobile-no-live-remote-occupant",
          "live-trash-absence-state",
          "C05 managed remote path",
          "The C04-renamed path has exactly one managed occupant and that occupant is trashed, so no live same-path object remains.",
        ),
        path,
        expectedState: "trashed" as const,
      }),
      Object.freeze({
        kind: "mapping-or-tombstone" as const,
        assertion: stateAssertion(
          "c05-mobile-exact-tombstone",
          "mapping-or-tombstone",
          "C05 mobile deletion authority",
          "Mobile trusted authority contains the exact-object tombstone and no live mapping.",
        ),
        deviceId: authority.mobileDeviceId,
        path,
        expected: "tombstone" as const,
        remoteObjectId,
        entityKind: "file" as const,
      }),
      Object.freeze({
        kind: "durable-intent-or-effect" as const,
        assertion: stateAssertion(
          "c05-mobile-no-outstanding-effects",
          "durable-intent-or-effect",
          "C05 mobile durable mutation authority",
          "No mobile destructive effect remains unresolved after verified remote trash.",
        ),
        deviceId: authority.mobileDeviceId,
        expected: "none-outstanding" as const,
      }),
      Object.freeze({
        kind: "terminal-product-result" as const,
        assertion: stateAssertion(
          "c05-mobile-production-trash-complete",
          "terminal-product-result",
          "C05 mobile production execution",
          "Production execution completed the destructive remote-trash operation.",
        ),
        diagnostic: Object.freeze({
          deviceId: authority.mobileDeviceId,
          component: "sync.execute" as const,
          event: "operation-complete",
          expectedFields: Object.freeze({
            operationKind: "trash-remote",
            target: "remote",
            destructiveCount: 1,
            remoteObjectId: String(remoteObjectId),
          }),
        }),
      }),
      Object.freeze({
        kind: "unrelated-mutation-absence" as const,
        assertion: stateAssertion(
          "c05-mobile-unrelated-unchanged",
          "unrelated-mutation-absence",
          "C05 unrelated protected witnesses after mobile deletion",
          "Every declared unrelated local and remote witness remains unchanged.",
        ),
        local: authority.unrelated.local,
        remote: authority.unrelated.remote,
      }),
    ]) as C05VerificationTemplate["state"],
    convergence: Object.freeze([
      Object.freeze({
        kind: "cross-device-path" as const,
        assertion: Object.freeze({
          assertionId: validationAssertionId("c05-mobile-local-absence"),
          kind: "cross-device-path" as const,
          subject: "C05 mobile deleted path",
          expectation: "The mobile participant authoritatively observes the C04-renamed path as absent.",
        }),
        deviceIds: Object.freeze([authority.mobileDeviceId]),
        path,
        expected: "absent" as const,
      }),
    ]) as C05VerificationTemplate["convergence"],
  });
}

function finalVerification(authority: C05ScenarioAuthority): C05VerificationTemplate {
  const path = authority.trustedFixture.descriptor.path;
  const remoteObjectId = authority.trustedFixture.remoteObjectId;
  return Object.freeze({
    state: Object.freeze([
      Object.freeze({
        kind: "live-trash-absence-state" as const,
        assertion: stateAssertion(
          "c05-final-exact-remote-trash",
          "live-trash-absence-state",
          "C05 exact managed remote object",
          "The exact stable Drive object remains recoverably trashed after Windows convergence.",
        ),
        path,
        expectedState: "trashed" as const,
        remoteObjectId,
      }),
      Object.freeze({
        kind: "live-trash-absence-state" as const,
        assertion: stateAssertion(
          "c05-final-no-live-remote-occupant",
          "live-trash-absence-state",
          "C05 managed remote path",
          "The C04-renamed path has no live remote occupant after Windows convergence.",
        ),
        path,
        expectedState: "trashed" as const,
      }),
      Object.freeze({
        kind: "mapping-or-tombstone" as const,
        assertion: stateAssertion(
          "c05-final-mobile-exact-tombstone",
          "mapping-or-tombstone",
          "C05 mobile deletion authority",
          "Mobile trusted authority retains the exact-object tombstone and no live mapping.",
        ),
        deviceId: authority.mobileDeviceId,
        path,
        expected: "tombstone" as const,
        remoteObjectId,
        entityKind: "file" as const,
      }),
      Object.freeze({
        kind: "mapping-or-tombstone" as const,
        assertion: stateAssertion(
          "c05-final-windows-exact-tombstone",
          "mapping-or-tombstone",
          "C05 Windows deletion authority",
          "Windows trusted authority retains the exact-object tombstone and no live mapping.",
        ),
        deviceId: authority.windowsDeviceId,
        path,
        expected: "tombstone" as const,
        remoteObjectId,
        entityKind: "file" as const,
      }),
      Object.freeze({
        kind: "durable-intent-or-effect" as const,
        assertion: stateAssertion(
          "c05-final-mobile-no-outstanding-effects",
          "durable-intent-or-effect",
          "C05 mobile durable mutation authority",
          "No mobile destructive effect remains outstanding.",
        ),
        deviceId: authority.mobileDeviceId,
        expected: "none-outstanding" as const,
      }),
      Object.freeze({
        kind: "durable-intent-or-effect" as const,
        assertion: stateAssertion(
          "c05-final-windows-no-outstanding-effects",
          "durable-intent-or-effect",
          "C05 Windows durable mutation authority",
          "No Windows local-trash effect remains outstanding.",
        ),
        deviceId: authority.windowsDeviceId,
        expected: "none-outstanding" as const,
      }),
      Object.freeze({
        kind: "terminal-product-result" as const,
        assertion: stateAssertion(
          "c05-windows-production-trash-complete",
          "terminal-product-result",
          "C05 Windows recoverable local deletion",
          "Production execution completed the recoverable local-trash operation.",
        ),
        diagnostic: Object.freeze({
          deviceId: authority.windowsDeviceId,
          component: "sync.execute" as const,
          event: "operation-complete",
          expectedFields: Object.freeze({
            operationKind: "trash-local",
            target: "local",
            destructiveCount: 1,
          }),
        }),
      }),
      Object.freeze({
        kind: "unrelated-mutation-absence" as const,
        assertion: stateAssertion(
          "c05-final-unrelated-unchanged",
          "unrelated-mutation-absence",
          "C05 unrelated protected witnesses after Windows convergence",
          "Every declared unrelated local and remote witness remains unchanged.",
        ),
        local: authority.unrelated.local,
        remote: authority.unrelated.remote,
      }),
    ]) as C05VerificationTemplate["state"],
    convergence: Object.freeze([
      Object.freeze({
        kind: "cross-device-path" as const,
        assertion: Object.freeze({
          assertionId: validationAssertionId("c05-final-cross-device-path-absence"),
          kind: "cross-device-path" as const,
          subject: "C05 deleted fixture path",
          expectation: "Mobile and Windows both authoritatively observe the C04-renamed path as absent.",
        }),
        deviceIds: Object.freeze([authority.mobileDeviceId, authority.windowsDeviceId]),
        path,
        expected: "absent" as const,
      }),
      Object.freeze({
        kind: "cross-device-authority" as const,
        assertion: Object.freeze({
          assertionId: validationAssertionId("c05-final-cross-device-tombstone-authority"),
          kind: "cross-device-authority" as const,
          subject: "C05 deletion authority",
          expectation: "Mobile and Windows converge on tombstone authority with no live BASE or mapping.",
        }),
        deviceIds: Object.freeze([authority.mobileDeviceId, authority.windowsDeviceId]),
        path,
        expectedTombstone: true,
      }),
    ]) as C05VerificationTemplate["convergence"],
  });
}

function productionCycleSteps(input: {
  readonly prefix: "mobile" | "windows";
  readonly cycleId: string;
  readonly expectation: Omit<ValidationPlanExpectation, "run">;
}) {
  return Object.freeze([
    Object.freeze({
      stepId: validationStepId(`c05-${input.prefix}-preview`),
      module: "production-path-driver" as const,
      operation: "preview-manual",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: input.cycleId }),
    }),
    Object.freeze({
      stepId: validationStepId(`c05-${input.prefix}-assert`),
      module: "plan-assertion-engine" as const,
      operation: "assert-observed-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({
        authorityCycleId: input.cycleId,
        assertionId: `c05-${input.prefix}-exact-delete-plan`,
        expectation: input.expectation,
      }),
    }),
    Object.freeze({
      stepId: validationStepId(`c05-${input.prefix}-execute`),
      module: "production-path-driver" as const,
      operation: "execute-asserted-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: input.cycleId }),
    }),
  ]);
}

export function createC05ScenarioDefinition(
  authority: C05ScenarioAuthority,
): ValidationRunnerScenarioDefinition {
  validateAuthority(authority);
  const fixtureId = String(authority.trustedFixture.descriptor.identity.fixtureId);
  const path = authority.trustedFixture.descriptor.path;
  const remoteObjectId = authority.trustedFixture.remoteObjectId;

  return Object.freeze({
    scenarioId: C05_SCENARIO_ID,
    prerequisiteIds: Object.freeze([
      "C04-pass",
      "c05-harness-owned-trusted-fixture",
    ]),
    steps: Object.freeze([
      Object.freeze({
        stepId: validationStepId("c05-delete-mobile-fixture"),
        module: "fixture-manager" as const,
        operation: "c05-delete-mobile-fixture",
        requiredCompletionProof: "operation-complete" as const,
        input: Object.freeze({ fixtureId, path: String(path) }),
      }),
      ...productionCycleSteps({
        prefix: "mobile",
        cycleId: C05_MOBILE_AUTHORITY_CYCLE_ID,
        expectation: deletePlanExpectation(authority, "trash-remote"),
      }),
      Object.freeze({
        stepId: validationStepId("c05-verify-mobile-remote-trash"),
        module: "state-convergence-verifier" as const,
        operation: "c05-verify-mobile-remote-trash",
        requiredCompletionProof: "verification-passed" as const,
        input: Object.freeze({
          verification: mobileVerification(authority),
        }),
      }),
      Object.freeze({
        stepId: validationStepId("c05-handoff-to-windows"),
        module: "cross-device-coordinator" as const,
        operation: "c05-handoff-to-windows",
        requiredCompletionProof: "operation-complete" as const,
        input: Object.freeze({
          path: String(path),
          remoteObjectId: String(remoteObjectId),
          fromDeviceId: String(authority.mobileDeviceId),
          toDeviceId: String(authority.windowsDeviceId),
        }),
      }),
      ...productionCycleSteps({
        prefix: "windows",
        cycleId: C05_WINDOWS_AUTHORITY_CYCLE_ID,
        expectation: deletePlanExpectation(authority, "trash-local"),
      }),
      Object.freeze({
        stepId: validationStepId("c05-verify-final-convergence"),
        module: "state-convergence-verifier" as const,
        operation: "c05-verify-final-convergence",
        requiredCompletionProof: "verification-passed" as const,
        input: Object.freeze({
          verification: finalVerification(authority),
        }),
      }),
      Object.freeze({
        stepId: validationStepId("c05-record-evidence"),
        module: "scenario-evidence-recorder" as const,
        operation: "c05-record-evidence",
        requiredCompletionProof: "evidence-recorded" as const,
        input: Object.freeze({
          scenarioId: C05_SCENARIO_ID,
          fixtureId,
          path: String(path),
          remoteObjectId: String(remoteObjectId),
        }),
      }),
    ]),
  });
}

export function createC05ScenarioRegistration(authority: C05ScenarioAuthority) {
  return Object.freeze({
    scenarioId: C05_SCENARIO_ID,
    definition: createC05ScenarioDefinition(authority),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function c05FixtureDelegate(
  authority: C05ScenarioAuthority,
  fixtureManager: C05FixtureDeletePort,
): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      if (request.operation !== "c05-delete-mobile-fixture") {
        return { status: "blocked", summary: `Unsupported C05 fixture operation: ${request.operation}`, evidenceRefs: [] };
      }
      const input = isRecord(request.input) ? request.input : undefined;
      const expectedFixtureId = String(authority.trustedFixture.descriptor.identity.fixtureId);
      if (
        !input
        || input.fixtureId !== expectedFixtureId
        || input.path !== String(authority.trustedFixture.descriptor.path)
      ) {
        return { status: "blocked", summary: "C05 fixture deletion input does not match the trusted fixture authority.", evidenceRefs: [] };
      }
      try {
        const deleted = await fixtureManager.delete(expectedFixtureId);
        if (
          deleted.path !== authority.trustedFixture.descriptor.path
          || String(deleted.identity.fixtureId) !== expectedFixtureId
        ) {
          return { status: "blocked", summary: "Fixture manager deleted a different harness-owned fixture than C05 authorized.", evidenceRefs: [] };
        }
        return { status: "completed", evidenceRefs: [] };
      } catch {
        return { status: "failed", summary: "C05 mobile fixture deletion failed.", evidenceRefs: [] };
      }
    },
  };
}

function verificationTemplate(input: unknown): C05VerificationTemplate | undefined {
  if (!isRecord(input) || !isRecord(input.verification)) return undefined;
  const verification = input.verification as Record<string, unknown>;
  if (!Array.isArray(verification.state) || verification.state.length === 0) return undefined;
  if (!Array.isArray(verification.convergence) || verification.convergence.length === 0) return undefined;
  return verification as unknown as C05VerificationTemplate;
}

function c05VerifierDelegate(
  verifier: C05StateVerifierPort,
): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      if (
        request.operation !== "c05-verify-mobile-remote-trash"
        && request.operation !== "c05-verify-final-convergence"
      ) {
        return { status: "blocked", summary: `Unsupported C05 verification operation: ${request.operation}`, evidenceRefs: [] };
      }
      const template = verificationTemplate(request.input);
      if (!template) {
        return { status: "blocked", summary: "C05 verification step does not contain a valid frozen verification template.", evidenceRefs: [] };
      }

      try {
        const report = await verifier.verify({
          run: request.run,
          state: template.state,
          convergence: template.convergence,
        });
        const evidenceRefs = Object.freeze(report.evidence.map(item => item.ref));
        if (report.result.verdict === "pass") {
          return { status: "completed", evidenceRefs };
        }
        return {
          status: report.result.verdict === "fail" ? "failed" : "blocked",
          summary: report.result.verdict === "fail"
            ? "C05 state/convergence verification failed."
            : "C05 state/convergence verification was not fully observable.",
          evidenceRefs,
        };
      } catch {
        return { status: "failed", summary: "C05 state/convergence verifier threw before producing a verdict.", evidenceRefs: [] };
      }
    },
  };
}

export function createC05RuntimeModuleOverrides(
  authority: C05ScenarioAuthority,
  bindings: C05RuntimeBindings,
): ValidationModeModuleOverrides {
  validateAuthority(authority);
  return Object.freeze({
    "fixture-manager": c05FixtureDelegate(authority, bindings.fixtureManager),
    "state-convergence-verifier": c05VerifierDelegate(bindings.verifier),
    "cross-device-coordinator": bindings.crossDeviceCoordinator,
    "scenario-evidence-recorder": bindings.evidenceRecorder,
  });
}
