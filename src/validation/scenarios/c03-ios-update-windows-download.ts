import type {
  ManagedRemoteIdentity,
  RemoteObjectId,
  SynchronizationPlan,
} from "../../contracts";
import {
  validationAssertionId,
  validationPlanExpectation,
  type ValidationEvidenceRef,
  type ValidationPlanAssertionResult,
  type ValidationPlanExecutionAuthorization,
} from "../driver-plan-fault-verifier-contracts";
import type { ValidationFixtureDescriptor } from "../fixture-manager";
import { assertValidationPlan } from "../plan-assertion-engine";
import type {
  ValidationDiagnosticExpectation,
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

/** Existing live-validation package preserved by VH16. */
export const C03_LIVE_PACKAGE = "C03-ios-update-windows-download.md" as const;
export const C03_SCENARIO_ID = "C03" as const;
export const C03_PREREQUISITE_ID = "C02:PASS" as const;

/** The original C03 logical fixture name, always rooted inside a harness-owned disposable namespace. */
export const C03_FIXTURE_RELATIVE_PATH = "test-ios-c02.md" as const;

export const C03_OPERATIONS = Object.freeze({
  mobileEdit: "c03:mobile-edit",
  mobilePreview: "c03:mobile-preview",
  mobilePlanAssertion: "c03:mobile-plan-assertion",
  mobileExecute: "c03:mobile-execute-asserted-plan",
  handoffToWindows: "c03:handoff-to-windows",
  windowsPreview: "c03:windows-preview",
  windowsPlanAssertion: "c03:windows-plan-assertion",
  windowsExecute: "c03:windows-execute-asserted-plan",
  verify: "c03:verify-postconditions",
  evidence: "c03:record-evidence",
} as const);

/**
 * C03 is intentionally a declarative H7 package. VH23 owns registry/routing
 * integration; these steps name only existing H1-H6 module authorities.
 */
export const C03_SCENARIO_DEFINITION: ValidationRunnerScenarioDefinition = Object.freeze({
  scenarioId: C03_SCENARIO_ID,
  prerequisiteIds: Object.freeze([C03_PREREQUISITE_ID]),
  steps: Object.freeze([
    Object.freeze({
      stepId: validationStepId("c03-mobile-edit"),
      module: "fixture-manager" as const,
      operation: C03_OPERATIONS.mobileEdit,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-mobile-preview"),
      module: "production-path-driver" as const,
      operation: C03_OPERATIONS.mobilePreview,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-mobile-plan-assertion"),
      module: "plan-assertion-engine" as const,
      operation: C03_OPERATIONS.mobilePlanAssertion,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-mobile-execute"),
      module: "production-path-driver" as const,
      operation: C03_OPERATIONS.mobileExecute,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-handoff-to-windows"),
      module: "cross-device-coordinator" as const,
      operation: C03_OPERATIONS.handoffToWindows,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-windows-preview"),
      module: "production-path-driver" as const,
      operation: C03_OPERATIONS.windowsPreview,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-windows-plan-assertion"),
      module: "plan-assertion-engine" as const,
      operation: C03_OPERATIONS.windowsPlanAssertion,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-windows-execute"),
      module: "production-path-driver" as const,
      operation: C03_OPERATIONS.windowsExecute,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-verify-postconditions"),
      module: "state-convergence-verifier" as const,
      operation: C03_OPERATIONS.verify,
      requiredCompletionProof: "verification-passed" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c03-record-evidence"),
      module: "scenario-evidence-recorder" as const,
      operation: C03_OPERATIONS.evidence,
      requiredCompletionProof: "evidence-recorded" as const,
    }),
  ]),
});

export interface C03TrustedFixtureLineage {
  readonly run: ValidationRunIdentity;
  readonly fixture: ValidationFixtureDescriptor;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly remoteIdentity: ManagedRemoteIdentity;
  readonly remoteObjectId: RemoteObjectId;
  /** Objective proof that the harness-owned fixture has the trusted two-sided C02-equivalent baseline. */
  readonly prerequisiteEvidenceRefs: readonly [ValidationEvidenceRef, ...ValidationEvidenceRef[]];
  /** Protected paths used to prove that C03 changed nothing outside its fixture. */
  readonly unrelatedLocal: readonly ValidationLocalProtectedPathExpectation[];
  readonly unrelatedRemote: readonly ValidationRemoteProtectedPathExpectation[];
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function assertLineage(lineage: C03TrustedFixtureLineage): void {
  if (lineage.run.scenarioId !== C03_SCENARIO_ID) throw new Error("C03 lineage must belong to scenario C03.");
  if (!sameRun(lineage.fixture.identity.run, lineage.run)) throw new Error("C03 fixture lineage must belong to the active validation run.");
  if (lineage.fixture.relativePath !== C03_FIXTURE_RELATIVE_PATH) throw new Error("C03 fixture lineage must preserve the authoritative logical fixture name.");
  if (lineage.fixture.kind !== "text" || !lineage.fixture.hash) throw new Error("C03 requires a deterministic text fixture with an exact content hash.");
  if (lineage.mobileDeviceId === lineage.windowsDeviceId) throw new Error("C03 mobile and Windows participants must be distinct devices.");
  if (lineage.prerequisiteEvidenceRefs.length === 0) throw new Error("C03 requires objective trusted-lineage prerequisite evidence.");
  if (lineage.unrelatedLocal.length + lineage.unrelatedRemote.length === 0) {
    throw new Error("C03 requires at least one protected unrelated path for no-unrelated-change proof.");
  }
}

function assertEditedFixture(lineage: C03TrustedFixtureLineage, edited: ValidationFixtureDescriptor): void {
  if (!sameRun(edited.identity.run, lineage.run)) throw new Error("C03 edited fixture belongs to a different run.");
  if (edited.identity.fixtureId !== lineage.fixture.identity.fixtureId) throw new Error("C03 edit changed fixture identity.");
  if (edited.path !== lineage.fixture.path || edited.relativePath !== lineage.fixture.relativePath) throw new Error("C03 edit changed the fixture path.");
  if (edited.kind !== "text" || !edited.hash) throw new Error("C03 edited fixture must retain exact text content evidence.");
  if (edited.version <= lineage.fixture.version) throw new Error("C03 mobile edit must advance the fixture version.");
  if (edited.hash === lineage.fixture.hash) throw new Error("C03 mobile edit must change the fixture bytes/hash.");
}

function mobileExpectation(lineage: C03TrustedFixtureLineage, edited: ValidationFixtureDescriptor) {
  return validationPlanExpectation({
    run: lineage.run,
    expectedTrigger: "manual",
    expectedOperations: [{
      kind: "upload-update",
      path: edited.path,
      targetSide: "remote",
      remoteObjectId: lineage.remoteObjectId,
      destructive: false,
    }],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: [
      "upload-create",
      "download-create",
      "download-update",
      "identity-preserving-move",
      "clean-text-merge",
      "unresolved-conflict",
      "trash-local",
      "trash-remote",
      "blocked-unsafe",
      "recovery-required",
    ],
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
}

function windowsExpectation(lineage: C03TrustedFixtureLineage, edited: ValidationFixtureDescriptor) {
  return validationPlanExpectation({
    run: lineage.run,
    expectedTrigger: "manual",
    expectedOperations: [{
      kind: "download-update",
      path: edited.path,
      targetSide: "local",
      remoteObjectId: lineage.remoteObjectId,
      destructive: false,
    }],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: [
      "upload-create",
      "upload-update",
      "download-create",
      "identity-preserving-move",
      "clean-text-merge",
      "unresolved-conflict",
      "trash-local",
      "trash-remote",
      "blocked-unsafe",
      "recovery-required",
    ],
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
}

export function c03PlanMismatchSummary(result: Extract<ValidationPlanAssertionResult, { readonly status: "mismatch" }>): string {
  return result.failures.map(failure => failure.summary).join(" | ");
}

/**
 * Stateful C03-only plan gate. It retains authorization only after the exact
 * production plan has matched the C03 contract, so a mismatch cannot reach an
 * execute-asserted-plan request.
 */
export class C03PlanGate {
  private edited?: ValidationFixtureDescriptor;
  private mobile?: Extract<ValidationPlanAssertionResult, { readonly status: "matched" }>;
  private windows?: Extract<ValidationPlanAssertionResult, { readonly status: "matched" }>;
  private mobileExecuted = false;
  private handedOff = false;
  private windowsExecuted = false;

  constructor(readonly lineage: C03TrustedFixtureLineage) {
    assertLineage(lineage);
  }

  acceptMobileEdit(edited: ValidationFixtureDescriptor): void {
    assertEditedFixture(this.lineage, edited);
    this.edited = edited;
    this.mobile = undefined;
    this.windows = undefined;
    this.mobileExecuted = false;
    this.handedOff = false;
    this.windowsExecuted = false;
  }

  assertMobilePlan(plan: SynchronizationPlan): ValidationPlanAssertionResult {
    const edited = this.requireEdited();
    this.mobile = undefined;
    const result = assertValidationPlan({
      assertionId: "c03-mobile-upload-update",
      expectation: mobileExpectation(this.lineage, edited),
      plan,
    });
    if (result.status === "matched") this.mobile = result;
    return result;
  }

  mobileAuthorization(): ValidationPlanExecutionAuthorization {
    if (!this.mobile) throw new Error("C03 mobile execution is not authorized because its production plan has not matched.");
    return this.mobile.authorization;
  }

  markMobileExecutionAccepted(authorization: ValidationPlanExecutionAuthorization): void {
    if (!this.mobile || authorization.planId !== this.mobile.authorization.planId || !sameRun(authorization.run, this.lineage.run)) {
      throw new Error("C03 mobile execution acknowledgement does not match the asserted plan authorization.");
    }
    this.mobileExecuted = true;
  }

  markHandoffToWindows(): void {
    if (!this.mobileExecuted) throw new Error("C03 cannot hand off to Windows before the mobile asserted plan is accepted for execution.");
    this.handedOff = true;
  }

  assertWindowsPlan(plan: SynchronizationPlan): ValidationPlanAssertionResult {
    if (!this.handedOff) throw new Error("C03 Windows plan cannot be asserted before the mobile-to-Windows handoff.");
    const edited = this.requireEdited();
    this.windows = undefined;
    const result = assertValidationPlan({
      assertionId: "c03-windows-download-update",
      expectation: windowsExpectation(this.lineage, edited),
      plan,
    });
    if (result.status === "matched") this.windows = result;
    return result;
  }

  windowsAuthorization(): ValidationPlanExecutionAuthorization {
    if (!this.windows) throw new Error("C03 Windows execution is not authorized because its production plan has not matched.");
    return this.windows.authorization;
  }

  markWindowsExecutionAccepted(authorization: ValidationPlanExecutionAuthorization): void {
    if (!this.windows || authorization.planId !== this.windows.authorization.planId || !sameRun(authorization.run, this.lineage.run)) {
      throw new Error("C03 Windows execution acknowledgement does not match the asserted plan authorization.");
    }
    this.windowsExecuted = true;
  }

  verificationRequest(windowsTerminalDiagnostic: ValidationDiagnosticExpectation): ValidationStateConvergenceRequest {
    if (!this.windowsExecuted) throw new Error("C03 postconditions cannot be verified before the asserted Windows plan is accepted for execution.");
    if (windowsTerminalDiagnostic.deviceId !== this.lineage.windowsDeviceId) throw new Error("C03 terminal diagnostic must belong to the Windows participant.");
    const edited = this.requireEdited();
    const content = { hash: edited.hash!, sizeBytes: edited.sizeBytes };
    const path = edited.path;
    const remoteObjectId = this.lineage.remoteObjectId;

    const state: ValidationStateConvergenceRequest["state"] = [
      {
        kind: "local-content",
        assertion: {
          assertionId: validationAssertionId("c03-windows-bytes"),
          kind: "local-content",
          subject: String(path),
          expectation: "Windows bytes/hash equal the mobile-edited version after download-update.",
        },
        deviceId: this.lineage.windowsDeviceId,
        path,
        content,
      },
      {
        kind: "remote-content",
        assertion: {
          assertionId: validationAssertionId("c03-remote-bytes"),
          kind: "remote-content",
          subject: String(path),
          expectation: "Remote bytes/hash equal the mobile-edited version on the original stable object.",
        },
        path,
        content,
        remoteObjectId,
      },
      {
        kind: "remote-identity",
        assertion: {
          assertionId: validationAssertionId("c03-remote-identity"),
          kind: "remote-identity",
          subject: String(remoteObjectId),
          expectation: "Managed-remote identity and fixture Drive object identity remain coherent.",
        },
        expectedIdentity: this.lineage.remoteIdentity,
        path,
        remoteObjectId,
      },
      {
        kind: "base-authority",
        assertion: {
          assertionId: validationAssertionId("c03-windows-base-commit"),
          kind: "base-authority",
          subject: String(path),
          expectation: "Trusted Windows BASE reflects the verified replacement bytes and stable remote identity.",
        },
        deviceId: this.lineage.windowsDeviceId,
        path,
        expectedRemoteObjectId: remoteObjectId,
        expectedContent: content,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: {
          assertionId: validationAssertionId("c03-windows-live-mapping"),
          kind: "mapping-or-tombstone",
          subject: String(path),
          expectation: "Windows retains one live file mapping to the stable remote object and no tombstone.",
        },
        deviceId: this.lineage.windowsDeviceId,
        path,
        expected: "mapping",
        remoteObjectId,
        entityKind: "file",
      },
      {
        kind: "durable-intent-or-effect",
        assertion: {
          assertionId: validationAssertionId("c03-windows-no-outstanding-effect"),
          kind: "durable-intent-or-effect",
          subject: String(path),
          expectation: "No uncommitted durable mutation effect remains after verified local replacement and state commit.",
        },
        deviceId: this.lineage.windowsDeviceId,
        expected: "none-outstanding",
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: {
          assertionId: validationAssertionId("c03-no-unrelated-change"),
          kind: "unrelated-mutation-absence",
          subject: C03_SCENARIO_ID,
          expectation: "All declared unrelated protected paths remain byte/state identical.",
        },
        local: this.lineage.unrelatedLocal,
        remote: this.lineage.unrelatedRemote,
      },
      {
        kind: "terminal-product-result",
        assertion: {
          assertionId: validationAssertionId("c03-windows-terminal-success"),
          kind: "terminal-product-result",
          subject: "Windows production synchronization",
          expectation: "The Windows production run terminates with sync-run-complete rather than failure/recovery.",
        },
        diagnostic: windowsTerminalDiagnostic,
      },
    ];

    const convergence: ValidationStateConvergenceRequest["convergence"] = [
      {
        kind: "cross-device-content",
        assertion: {
          assertionId: validationAssertionId("c03-cross-device-bytes"),
          kind: "cross-device-content",
          subject: String(path),
          expectation: "Mobile and Windows converge on the exact edited bytes/hash.",
        },
        deviceIds: [this.lineage.mobileDeviceId, this.lineage.windowsDeviceId],
        path,
        content,
      },
      {
        kind: "cross-device-authority",
        assertion: {
          assertionId: validationAssertionId("c03-cross-device-authority"),
          kind: "cross-device-authority",
          subject: String(path),
          expectation: "Both devices retain coherent authority for the same stable remote object without a tombstone.",
        },
        deviceIds: [this.lineage.mobileDeviceId, this.lineage.windowsDeviceId],
        path,
        expectedRemoteObjectId: remoteObjectId,
        expectedTombstone: false,
      },
    ];

    return Object.freeze({ run: this.lineage.run, state: Object.freeze(state), convergence: Object.freeze(convergence) });
  }

  prerequisiteResult(): Readonly<{
    prerequisiteId: typeof C03_PREREQUISITE_ID;
    status: "satisfied";
    summary: string;
    evidenceRefs: readonly [ValidationEvidenceRef, ...ValidationEvidenceRef[]];
  }> {
    return Object.freeze({
      prerequisiteId: C03_PREREQUISITE_ID,
      status: "satisfied",
      summary: "Harness-owned C03 fixture has a trusted C02-equivalent two-sided baseline.",
      evidenceRefs: this.lineage.prerequisiteEvidenceRefs,
    });
  }

  private requireEdited(): ValidationFixtureDescriptor {
    if (!this.edited) throw new Error("C03 mobile edit has not been established.");
    return this.edited;
  }
}
