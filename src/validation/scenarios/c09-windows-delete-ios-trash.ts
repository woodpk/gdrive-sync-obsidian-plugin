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
  type ValidationEvidenceRef,
  type ValidationPlanExpectation,
} from "../driver-plan-fault-verifier-contracts";
import type { ValidationFixtureManager } from "../fixture-manager";
import {
  recordValidationScenarioEvidence,
  type ValidationBuildEvidence,
  type ValidationScenarioEvidenceRecord,
} from "../scenario-evidence-recorder";
import type {
  ValidationRunnerScenarioDefinition,
} from "../scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
} from "../scenario-runner-module-adapter";
import {
  validationFixtureIdentity,
  validationStepId,
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type {
  ValidationModeModuleOverrides,
} from "../validation-mode-runtime";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";

export const C09_TARGET_FIXTURE_ID = "c09-delete-target" as const;
export const C09_SENTINEL_FIXTURE_ID = "c09-unrelated-sentinel" as const;
export const C09_TARGET_RELATIVE_PATH = "c09/windows-delete-mobile-trash.md" as const;
export const C09_SENTINEL_RELATIVE_PATH = "c09/unrelated-sentinel.md" as const;

export const C09_WINDOWS_DELETE_AUTHORITY_CYCLE = "c09-windows-delete" as const;
export const C09_MOBILE_DELETE_AUTHORITY_CYCLE = "c09-mobile-recoverable-delete" as const;

export interface C09TrustedFile {
  readonly fixtureId: string;
  readonly path: VaultPath;
  readonly hash: ContentHash;
  readonly sizeBytes: number;
  readonly remoteObjectId: RemoteObjectId;
}

export interface C09TrustedFixtureSet {
  readonly target: C09TrustedFile;
  readonly sentinel: C09TrustedFile;
}

export function c09TrustedFixtureSet(input: {
  readonly targetHash: ContentHash;
  readonly targetSizeBytes: number;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly sentinelHash: ContentHash;
  readonly sentinelSizeBytes: number;
  readonly sentinelRemoteObjectId: RemoteObjectId;
}): C09TrustedFixtureSet {
  if (!Number.isSafeInteger(input.targetSizeBytes) || input.targetSizeBytes < 0) {
    throw new Error("C09 target fixture size must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(input.sentinelSizeBytes) || input.sentinelSizeBytes < 0) {
    throw new Error("C09 sentinel fixture size must be a non-negative safe integer.");
  }
  if (input.targetRemoteObjectId === input.sentinelRemoteObjectId) {
    throw new Error("C09 target and sentinel must have distinct stable remote identities.");
  }
  return Object.freeze({
    target: Object.freeze({
      fixtureId: C09_TARGET_FIXTURE_ID,
      path: contractId<"VaultPath">(C09_TARGET_RELATIVE_PATH),
      hash: input.targetHash,
      sizeBytes: input.targetSizeBytes,
      remoteObjectId: input.targetRemoteObjectId,
    }),
    sentinel: Object.freeze({
      fixtureId: C09_SENTINEL_FIXTURE_ID,
      path: contractId<"VaultPath">(C09_SENTINEL_RELATIVE_PATH),
      hash: input.sentinelHash,
      sizeBytes: input.sentinelSizeBytes,
      remoteObjectId: input.sentinelRemoteObjectId,
    }),
  });
}

type C09FixturePort = Pick<ValidationFixtureManager, "delete">;
type C09VerifierPort = Pick<StateConvergenceVerifier, "verify">;

export interface C09CrossDeviceHandoffPort {
  handoffToMobile(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly targetRemoteObjectId: RemoteObjectId;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C09ScenarioRegistrationInput {
  readonly trustedFixture: C09TrustedFixtureSet;
  readonly windowsFixtures: C09FixturePort;
  readonly verifier: C09VerifierPort;
  readonly handoff: C09CrossDeviceHandoffPort;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly build: ValidationBuildEvidence;
  readonly capturedAt: () => string;
}

export interface C09ScenarioRegistration {
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly moduleOverrides: ValidationModeModuleOverrides;
  evidenceRecord(): ValidationScenarioEvidenceRecord | undefined;
}

type RuntimePlanExpectation = Omit<ValidationPlanExpectation, "run">;

const WINDOWS_DELETE_FORBIDDEN_KINDS = Object.freeze([
  "upload-create",
  "upload-update",
  "download-create",
  "download-update",
  "identity-preserving-move",
  "trash-local",
  "clean-text-merge",
  "unresolved-conflict",
  "blocked-unsafe",
  "recovery-required",
] satisfies readonly PlanOperationKind[]);

const MOBILE_DELETE_FORBIDDEN_KINDS = Object.freeze([
  "upload-create",
  "upload-update",
  "download-create",
  "download-update",
  "identity-preserving-move",
  "trash-remote",
  "clean-text-merge",
  "unresolved-conflict",
  "blocked-unsafe",
  "recovery-required",
] satisfies readonly PlanOperationKind[]);

export function c09WindowsDeleteExpectation(
  trustedFixture: C09TrustedFixtureSet,
): RuntimePlanExpectation {
  return {
    expectedTrigger: "manual",
    expectedOperations: [{
      kind: "trash-remote",
      path: trustedFixture.target.path,
      targetSide: "remote",
      destructive: true,
      remoteObjectId: trustedFixture.target.remoteObjectId,
    }],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: WINDOWS_DELETE_FORBIDDEN_KINDS,
    conflictExpectation: "forbidden",
    destructiveExpectation: "allowed-exactly-as-expected",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  };
}

export function c09MobileRecoverableDeleteExpectation(
  trustedFixture: C09TrustedFixtureSet,
): RuntimePlanExpectation {
  return {
    expectedTrigger: "manual",
    expectedOperations: [{
      kind: "trash-local",
      path: trustedFixture.target.path,
      targetSide: "local",
      destructive: true,
    }],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: MOBILE_DELETE_FORBIDDEN_KINDS,
    conflictExpectation: "forbidden",
    destructiveExpectation: "allowed-exactly-as-expected",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  };
}

function stateAssertion(
  suffix: string,
  kind: "local-content" | "remote-content" | "live-trash-absence-state" | "mapping-or-tombstone" | "unrelated-mutation-absence",
  subject: string,
  expectation: string,
) {
  return {
    assertionId: validationAssertionId(`c09:${suffix}`),
    kind,
    subject,
    expectation,
  };
}

function convergenceAssertion(
  suffix: string,
  kind: "cross-device-content" | "cross-device-path" | "cross-device-authority",
  subject: string,
  expectation: string,
) {
  return {
    assertionId: validationAssertionId(`c09:${suffix}`),
    kind,
    subject,
    expectation,
  };
}

export function c09TrustedFixtureVerification(input: {
  readonly run: ValidationRunIdentity;
  readonly trustedFixture: C09TrustedFixtureSet;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
}): ValidationStateConvergenceRequest {
  const { target, sentinel } = input.trustedFixture;
  const targetContent = { hash: target.hash, sizeBytes: target.sizeBytes };
  const sentinelContent = { hash: sentinel.hash, sizeBytes: sentinel.sizeBytes };
  const windowsId = input.windowsDevice.deviceId;
  const mobileId = input.mobileDevice.deviceId;

  return {
    run: input.run,
    state: [
      {
        kind: "local-content",
        assertion: stateAssertion(
          "trusted-target-windows",
          "local-content",
          String(target.path),
          "Windows has the exact trusted target bytes before deletion",
        ),
        deviceId: windowsId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion(
          "trusted-target-mobile",
          "local-content",
          String(target.path),
          "mobile has the exact trusted target bytes before deletion",
        ),
        deviceId: mobileId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion(
          "trusted-target-remote",
          "remote-content",
          String(target.path),
          "the exact target remote object is live with trusted bytes before deletion",
        ),
        path: target.path,
        content: targetContent,
        remoteObjectId: target.remoteObjectId,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(
          "trusted-target-windows-mapping",
          "mapping-or-tombstone",
          String(target.path),
          "Windows authority maps the target to the exact remote object before deletion",
        ),
        deviceId: windowsId,
        path: target.path,
        expected: "mapping",
        remoteObjectId: target.remoteObjectId,
        entityKind: "file",
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(
          "trusted-target-mobile-mapping",
          "mapping-or-tombstone",
          String(target.path),
          "mobile authority maps the target to the exact remote object before deletion",
        ),
        deviceId: mobileId,
        path: target.path,
        expected: "mapping",
        remoteObjectId: target.remoteObjectId,
        entityKind: "file",
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: stateAssertion(
          "trusted-sentinel",
          "unrelated-mutation-absence",
          String(sentinel.path),
          "the unrelated sentinel is unchanged while target trust is established",
        ),
        local: [
          { deviceId: windowsId, path: sentinel.path, state: "file", content: sentinelContent },
          { deviceId: mobileId, path: sentinel.path, state: "file", content: sentinelContent },
        ],
        remote: [{
          path: sentinel.path,
          state: "live",
          remoteObjectId: sentinel.remoteObjectId,
          content: sentinelContent,
        }],
      },
    ],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion(
          "trusted-target-content",
          "cross-device-content",
          String(target.path),
          "both participants hold identical trusted target bytes before deletion",
        ),
        deviceIds: [windowsId, mobileId],
        path: target.path,
        content: targetContent,
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion(
          "trusted-target-authority",
          "cross-device-authority",
          String(target.path),
          "both participants agree on the exact live target remote identity before deletion",
        ),
        deviceIds: [windowsId, mobileId],
        path: target.path,
        expectedRemoteObjectId: target.remoteObjectId,
        expectedTombstone: false,
      },
    ],
  };
}

export function c09FinalDeletionVerification(input: {
  readonly run: ValidationRunIdentity;
  readonly trustedFixture: C09TrustedFixtureSet;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
}): ValidationStateConvergenceRequest {
  const { target, sentinel } = input.trustedFixture;
  const sentinelContent = { hash: sentinel.hash, sizeBytes: sentinel.sizeBytes };
  const windowsId = input.windowsDevice.deviceId;
  const mobileId = input.mobileDevice.deviceId;

  return {
    run: input.run,
    state: [
      {
        kind: "live-trash-absence-state",
        assertion: stateAssertion(
          "target-exact-remote-trashed",
          "live-trash-absence-state",
          String(target.path),
          "the exact original remote object is in recoverable trash",
        ),
        path: target.path,
        expectedState: "trashed",
        remoteObjectId: target.remoteObjectId,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(
          "target-windows-tombstone",
          "mapping-or-tombstone",
          String(target.path),
          "Windows converges to deletion authority for the exact target object",
        ),
        deviceId: windowsId,
        path: target.path,
        expected: "tombstone",
        remoteObjectId: target.remoteObjectId,
        entityKind: "file",
        deletedOn: "both",
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(
          "target-mobile-tombstone",
          "mapping-or-tombstone",
          String(target.path),
          "mobile recoverable deletion converges to deletion authority for the exact target object",
        ),
        deviceId: mobileId,
        path: target.path,
        expected: "tombstone",
        remoteObjectId: target.remoteObjectId,
        entityKind: "file",
        deletedOn: "both",
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: stateAssertion(
          "sentinel-unchanged",
          "unrelated-mutation-absence",
          String(sentinel.path),
          "the unrelated sentinel remains byte-identical and live everywhere",
        ),
        local: [
          { deviceId: windowsId, path: sentinel.path, state: "file", content: sentinelContent },
          { deviceId: mobileId, path: sentinel.path, state: "file", content: sentinelContent },
        ],
        remote: [{
          path: sentinel.path,
          state: "live",
          remoteObjectId: sentinel.remoteObjectId,
          content: sentinelContent,
        }],
      },
    ],
    convergence: [
      {
        kind: "cross-device-path",
        assertion: convergenceAssertion(
          "target-live-path-absent",
          "cross-device-path",
          String(target.path),
          "the target live path is absent on Windows and mobile",
        ),
        deviceIds: [windowsId, mobileId],
        path: target.path,
        expected: "absent",
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion(
          "target-tombstone-converged",
          "cross-device-authority",
          String(target.path),
          "both participants converge on tombstone authority for the exact original object",
        ),
        deviceIds: [windowsId, mobileId],
        path: target.path,
        expectedRemoteObjectId: target.remoteObjectId,
        expectedTombstone: true,
      },
    ],
  };
}

export const C09_STEP_IDS = Object.freeze({
  verifyTrustedFixture: validationStepId("c09-verify-trusted-fixture"),
  deleteWindowsFixture: validationStepId("c09-delete-windows-fixture"),
  previewWindowsDelete: validationStepId("c09-preview-windows-delete"),
  assertWindowsDelete: validationStepId("c09-assert-windows-delete"),
  executeWindowsDelete: validationStepId("c09-execute-windows-delete"),
  handoffToMobile: validationStepId("c09-handoff-to-mobile"),
  previewMobileDelete: validationStepId("c09-preview-mobile-delete"),
  assertMobileDelete: validationStepId("c09-assert-mobile-delete"),
  executeMobileDelete: validationStepId("c09-execute-mobile-delete"),
  verifyFinalConvergence: validationStepId("c09-verify-final-convergence"),
  recordEvidence: validationStepId("c09-record-evidence"),
} as const);

function c09Definition(trustedFixture: C09TrustedFixtureSet): ValidationRunnerScenarioDefinition {
  const windowsExpectation = c09WindowsDeleteExpectation(trustedFixture);
  const mobileExpectation = c09MobileRecoverableDeleteExpectation(trustedFixture);

  return Object.freeze({
    scenarioId: "C09",
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      {
        stepId: C09_STEP_IDS.verifyTrustedFixture,
        module: "state-convergence-verifier",
        operation: "c09-verify-trusted-fixture",
        requiredCompletionProof: "verification-passed",
      },
      {
        stepId: C09_STEP_IDS.deleteWindowsFixture,
        module: "fixture-manager",
        operation: "c09-delete-windows-fixture",
        requiredCompletionProof: "operation-complete",
      },
      {
        stepId: C09_STEP_IDS.previewWindowsDelete,
        module: "production-path-driver",
        operation: "preview-manual",
        requiredCompletionProof: "operation-complete",
        input: { authorityCycleId: C09_WINDOWS_DELETE_AUTHORITY_CYCLE },
      },
      {
        stepId: C09_STEP_IDS.assertWindowsDelete,
        module: "plan-assertion-engine",
        operation: "assert-observed-plan",
        requiredCompletionProof: "operation-complete",
        input: {
          authorityCycleId: C09_WINDOWS_DELETE_AUTHORITY_CYCLE,
          assertionId: "c09:windows-delete-plan",
          expectation: windowsExpectation,
        },
      },
      {
        stepId: C09_STEP_IDS.executeWindowsDelete,
        module: "production-path-driver",
        operation: "execute-asserted-plan",
        requiredCompletionProof: "operation-complete",
        input: { authorityCycleId: C09_WINDOWS_DELETE_AUTHORITY_CYCLE },
      },
      {
        stepId: C09_STEP_IDS.handoffToMobile,
        module: "cross-device-coordinator",
        operation: "c09-handoff-to-mobile",
        requiredCompletionProof: "operation-complete",
      },
      {
        stepId: C09_STEP_IDS.previewMobileDelete,
        module: "production-path-driver",
        operation: "preview-manual",
        requiredCompletionProof: "operation-complete",
        input: { authorityCycleId: C09_MOBILE_DELETE_AUTHORITY_CYCLE },
      },
      {
        stepId: C09_STEP_IDS.assertMobileDelete,
        module: "plan-assertion-engine",
        operation: "assert-observed-plan",
        requiredCompletionProof: "operation-complete",
        input: {
          authorityCycleId: C09_MOBILE_DELETE_AUTHORITY_CYCLE,
          assertionId: "c09:mobile-recoverable-delete-plan",
          expectation: mobileExpectation,
        },
      },
      {
        stepId: C09_STEP_IDS.executeMobileDelete,
        module: "production-path-driver",
        operation: "execute-asserted-plan",
        requiredCompletionProof: "operation-complete",
        input: { authorityCycleId: C09_MOBILE_DELETE_AUTHORITY_CYCLE },
      },
      {
        stepId: C09_STEP_IDS.verifyFinalConvergence,
        module: "state-convergence-verifier",
        operation: "c09-verify-final-convergence",
        requiredCompletionProof: "verification-passed",
      },
      {
        stepId: C09_STEP_IDS.recordEvidence,
        module: "scenario-evidence-recorder",
        operation: "c09-record-evidence",
        requiredCompletionProof: "evidence-recorded",
      },
    ]),
  });
}

function completed(evidenceRefs: readonly ValidationEvidenceRef[] = []) {
  return { status: "completed" as const, evidenceRefs };
}

function failed(summary: string, evidenceRefs: readonly ValidationEvidenceRef[] = []) {
  return { status: "failed" as const, summary, evidenceRefs };
}

function blocked(summary: string, evidenceRefs: readonly ValidationEvidenceRef[] = []) {
  return { status: "blocked" as const, summary, evidenceRefs };
}

function allObservations(report: ValidationStateConvergenceReport) {
  return [
    ...report.result.state.observations,
    ...report.result.convergence.observations,
  ];
}

export function createC09WindowsDeleteIosTrashRegistration(
  input: C09ScenarioRegistrationInput,
): C09ScenarioRegistration {
  if (input.windowsDevice.platform !== "windows-desktop") {
    throw new Error("C09 controller participant must be Windows desktop.");
  }
  if (input.mobileDevice.platform !== "iphone" && input.mobileDevice.platform !== "ipad") {
    throw new Error("C09 mobile participant must be iPhone or iPad.");
  }
  if (input.windowsDevice.deviceId === input.mobileDevice.deviceId) {
    throw new Error("C09 participants must have distinct device identities.");
  }
  if (input.trustedFixture.target.fixtureId !== C09_TARGET_FIXTURE_ID) {
    throw new Error("C09 target fixture identity is not the canonical harness-owned target.");
  }
  if (input.trustedFixture.sentinel.fixtureId !== C09_SENTINEL_FIXTURE_ID) {
    throw new Error("C09 sentinel fixture identity is not the canonical unrelated-mutation control.");
  }
  if (String(input.trustedFixture.target.path) !== C09_TARGET_RELATIVE_PATH) {
    throw new Error("C09 target fixture path is not canonical.");
  }
  if (String(input.trustedFixture.sentinel.path) !== C09_SENTINEL_RELATIVE_PATH) {
    throw new Error("C09 sentinel fixture path is not canonical.");
  }
  if (input.trustedFixture.target.remoteObjectId === input.trustedFixture.sentinel.remoteObjectId) {
    throw new Error("C09 trusted fixture identities are ambiguous.");
  }

  let trustedReport: ValidationStateConvergenceReport | undefined;
  let finalReport: ValidationStateConvergenceReport | undefined;
  let evidence: ValidationScenarioEvidenceRecord | undefined;

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== "c09-delete-windows-fixture") {
        return blocked(`Unsupported C09 fixture operation: ${request.operation}`);
      }
      try {
        await input.windowsFixtures.delete(input.trustedFixture.target.fixtureId);
        return completed();
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 Windows fixture deletion failed.");
      }
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== "c09-handoff-to-mobile") {
        return blocked(`Unsupported C09 coordination operation: ${request.operation}`);
      }
      try {
        const refs = await input.handoff.handoffToMobile({
          run: request.run,
          stepId: request.stepId,
          targetRemoteObjectId: input.trustedFixture.target.remoteObjectId,
        });
        return completed(refs);
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "C09 mobile handoff failed.");
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      let verification: ValidationStateConvergenceRequest | undefined;
      if (request.operation === "c09-verify-trusted-fixture") {
        verification = c09TrustedFixtureVerification({
          run: request.run,
          trustedFixture: input.trustedFixture,
          windowsDevice: input.windowsDevice,
          mobileDevice: input.mobileDevice,
        });
      } else if (request.operation === "c09-verify-final-convergence") {
        verification = c09FinalDeletionVerification({
          run: request.run,
          trustedFixture: input.trustedFixture,
          windowsDevice: input.windowsDevice,
          mobileDevice: input.mobileDevice,
        });
      }
      if (!verification) {
        return blocked(`Unsupported C09 verification operation: ${request.operation}`);
      }

      try {
        const report = await input.verifier.verify(verification);
        if (request.operation === "c09-verify-trusted-fixture") trustedReport = report;
        else finalReport = report;
        const refs = report.evidence.map(item => item.ref);
        if (report.result.verdict === "pass") return completed(refs);
        const summary = `C09 verification ${report.result.verdict}: ${request.operation}`;
        return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 convergence verification failed.");
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== "c09-record-evidence") {
        return blocked(`Unsupported C09 evidence operation: ${request.operation}`);
      }
      if (!trustedReport || !finalReport) {
        return blocked("C09 cannot record PASS evidence before both trusted-fixture and final-convergence verification.");
      }
      try {
        const expectedPlan: ValidationPlanExpectation = {
          ...c09MobileRecoverableDeleteExpectation(input.trustedFixture),
          run: request.run,
        };
        evidence = recordValidationScenarioEvidence({
          run: request.run,
          primaryDeviceId: input.windowsDevice.deviceId,
          devices: [input.windowsDevice, input.mobileDevice],
          build: input.build,
          capturedAt: input.capturedAt(),
          preDiagnosticRefs: [],
          postDiagnosticRefs: [],
          fixtures: [
            {
              fixture: validationFixtureIdentity(request.run, input.trustedFixture.target.fixtureId),
              sizeBytes: input.trustedFixture.target.sizeBytes,
              contentHash: String(input.trustedFixture.target.hash),
            },
            {
              fixture: validationFixtureIdentity(request.run, input.trustedFixture.sentinel.fixtureId),
              sizeBytes: input.trustedFixture.sentinel.sizeBytes,
              contentHash: String(input.trustedFixture.sentinel.hash),
            },
          ],
          expectedPlan,
          correlations: {
            remoteObjectIds: [
              String(input.trustedFixture.target.remoteObjectId),
              String(input.trustedFixture.sentinel.remoteObjectId),
            ],
          },
          revisions: [],
          faults: [],
          checkpoints: [],
          assertions: [
            ...allObservations(trustedReport),
            ...allObservations(finalReport),
          ],
          requiredEvidence: ["fixtures", "expected-plan", "correlations", "assertions"],
          requestedStatus: "PASS",
        });
        return completed([
          validationEvidenceRef(`c09:scenario-evidence:${evidence.integrityDigest}`),
        ]);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 evidence recording failed.");
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
    definition: c09Definition(input.trustedFixture),
    moduleOverrides,
    evidenceRecord: () => evidence,
  });
}
