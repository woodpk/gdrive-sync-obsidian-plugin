import type {
  ContentHash,
  ManagedRemoteIdentity,
  RemoteObjectId,
  VaultPath,
} from "../../contracts";
import { validationAssertionId, type ValidationPlanExpectation } from "../driver-plan-fault-verifier-contracts";
import type { DiagnosticEvent } from "../../diagnostics/diagnostic-logger";
import { validationStepId, type ValidationDeviceId } from "../run-sandbox-checkpoint-contracts";
import type { ValidationRunnerScenarioDefinition } from "../scenario-runner-contracts";
import type {
  ValidationDiagnosticExpectation,
  ValidationLocalProtectedPathExpectation,
  ValidationRemoteProtectedPathExpectation,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";

export const C03_LIVE_PACKAGE = "C03-ios-update-windows-download.md" as const;
export const C03_SCENARIO_ID = "C03" as const;
export const C03_PREREQUISITE_ID = "C02:PASS" as const;
export const C03_FIXTURE_RELATIVE_PATH = "test-ios-c02.md" as const;

export const C03_AUTHORITY_CYCLES = Object.freeze({
  mobile: "c03-mobile-production-sync",
  windows: "c03-windows-production-sync",
} as const);

export const C03_SCENARIO_OPERATIONS = Object.freeze({
  mobileEdit: "c03-mobile-edit",
  handoffToWindows: "c03-handoff-mobile-to-windows",
  verify: "c03-verify-postconditions",
  recordEvidence: "c03-record-evidence",
} as const);

export interface C03ScenarioDefinitionInput {
  readonly fixtureId: string;
  readonly fixturePath: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
}

export interface C03VerificationFacts {
  readonly fixturePath: VaultPath;
  readonly editedHash: ContentHash;
  readonly editedSizeBytes: number;
  readonly remoteObjectId: RemoteObjectId;
  readonly remoteIdentity: ManagedRemoteIdentity;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly unrelatedLocal: readonly ValidationLocalProtectedPathExpectation[];
  readonly unrelatedRemote: readonly ValidationRemoteProtectedPathExpectation[];
  readonly windowsTerminalDiagnostic: ValidationDiagnosticExpectation;
}

export interface C03CommitOrderingResult {
  readonly status: "verified" | "failed" | "not-observable";
  readonly reason: string;
  readonly verificationSequence?: number;
  readonly stateCommitSequence?: number;
}

function assertDefinitionInput(input: C03ScenarioDefinitionInput): void {
  if (!input.fixtureId || input.fixtureId.trim() !== input.fixtureId) {
    throw new Error("C03 fixtureId must be a non-empty trim-stable string.");
  }
  const path = String(input.fixturePath);
  const leaf = path.split("/").at(-1);
  if (leaf !== C03_FIXTURE_RELATIVE_PATH) {
    throw new Error(`C03 harness fixture must retain logical name ${C03_FIXTURE_RELATIVE_PATH} inside its disposable namespace.`);
  }
}

function expectation(input: C03ScenarioDefinitionInput, side: "mobile" | "windows"): Omit<ValidationPlanExpectation, "run"> {
  const expectedKind = side === "mobile" ? "upload-update" : "download-update";
  const targetSide = side === "mobile" ? "remote" : "local";
  const forbiddenKinds = side === "mobile"
    ? [
        "noop",
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
      ] as const
    : [
        "noop",
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
      ] as const;

  return {
    expectedTrigger: "manual",
    expectedOperations: [{
      kind: expectedKind,
      path: input.fixturePath,
      targetSide,
      remoteObjectId: input.remoteObjectId,
      destructive: false,
    }],
    allowedBackgroundKinds: [],
    forbiddenKinds,
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  };
}

function productionCycleSteps(
  prefix: "mobile" | "windows",
  cycleId: string,
  planExpectation: Omit<ValidationPlanExpectation, "run">,
) {
  return [
    Object.freeze({
      stepId: validationStepId(`c03-${prefix}-preview`),
      module: "production-path-driver" as const,
      operation: "preview-manual",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: cycleId }),
    }),
    Object.freeze({
      stepId: validationStepId(`c03-${prefix}-assert-plan`),
      module: "plan-assertion-engine" as const,
      operation: "assert-observed-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({
        authorityCycleId: cycleId,
        assertionId: `c03-${prefix}-exact-plan`,
        expectation: Object.freeze(planExpectation),
      }),
    }),
    Object.freeze({
      stepId: validationStepId(`c03-${prefix}-execute`),
      module: "production-path-driver" as const,
      operation: "execute-asserted-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: cycleId }),
    }),
  ] as const;
}

/**
 * Declarative C03 H7 package.
 *
 * Production preview/assert/execute operations intentionally use only the fixed
 * H6B operation names. No execution authorization is supplied by this package;
 * H6B retains the observed plan and assertion-derived authorization internally.
 */
export function createC03ScenarioDefinition(input: C03ScenarioDefinitionInput): ValidationRunnerScenarioDefinition {
  assertDefinitionInput(input);
  const mobile = productionCycleSteps("mobile", C03_AUTHORITY_CYCLES.mobile, expectation(input, "mobile"));
  const windows = productionCycleSteps("windows", C03_AUTHORITY_CYCLES.windows, expectation(input, "windows"));

  return Object.freeze({
    scenarioId: C03_SCENARIO_ID,
    prerequisiteIds: Object.freeze([C03_PREREQUISITE_ID]),
    steps: Object.freeze([
      Object.freeze({
        stepId: validationStepId("c03-mobile-edit"),
        module: "fixture-manager" as const,
        operation: C03_SCENARIO_OPERATIONS.mobileEdit,
        requiredCompletionProof: "operation-complete" as const,
        input: Object.freeze({
          fixtureId: input.fixtureId,
          relativePath: C03_FIXTURE_RELATIVE_PATH,
          nextVersion: 2,
        }),
      }),
      ...mobile,
      Object.freeze({
        stepId: validationStepId("c03-handoff-to-windows"),
        module: "cross-device-coordinator" as const,
        operation: C03_SCENARIO_OPERATIONS.handoffToWindows,
        requiredCompletionProof: "operation-complete" as const,
        input: Object.freeze({ fixtureId: input.fixtureId }),
      }),
      ...windows,
      Object.freeze({
        stepId: validationStepId("c03-verify"),
        module: "state-convergence-verifier" as const,
        operation: C03_SCENARIO_OPERATIONS.verify,
        requiredCompletionProof: "verification-passed" as const,
        input: Object.freeze({
          fixtureId: input.fixtureId,
          fixturePath: input.fixturePath,
          remoteObjectId: input.remoteObjectId,
        }),
      }),
      Object.freeze({
        stepId: validationStepId("c03-evidence"),
        module: "scenario-evidence-recorder" as const,
        operation: C03_SCENARIO_OPERATIONS.recordEvidence,
        requiredCompletionProof: "evidence-recorded" as const,
        input: Object.freeze({
          scenarioPackage: C03_LIVE_PACKAGE,
          fixtureId: input.fixtureId,
        }),
      }),
    ]),
  });
}

export function createC03VerificationRequest(
  run: ValidationStateConvergenceRequest["run"],
  facts: C03VerificationFacts,
): ValidationStateConvergenceRequest {
  if (!Number.isSafeInteger(facts.editedSizeBytes) || facts.editedSizeBytes < 0) {
    throw new Error("C03 editedSizeBytes must be a non-negative safe integer.");
  }
  if (facts.mobileDeviceId === facts.windowsDeviceId) {
    throw new Error("C03 mobile and Windows device identities must be distinct.");
  }
  if (facts.unrelatedLocal.length + facts.unrelatedRemote.length === 0) {
    throw new Error("C03 requires at least one protected unrelated path.");
  }
  if (facts.windowsTerminalDiagnostic.deviceId !== facts.windowsDeviceId) {
    throw new Error("C03 terminal diagnostic must belong to the Windows participant.");
  }

  const content = Object.freeze({ hash: facts.editedHash, sizeBytes: facts.editedSizeBytes });
  const state: ValidationStateConvergenceRequest["state"] = [
    {
      kind: "local-content",
      assertion: {
        assertionId: validationAssertionId("c03-windows-bytes"),
        kind: "local-content",
        subject: String(facts.fixturePath),
        expectation: "Windows bytes/hash equal the mobile-edited version after download-update.",
      },
      deviceId: facts.windowsDeviceId,
      path: facts.fixturePath,
      content,
    },
    {
      kind: "remote-content",
      assertion: {
        assertionId: validationAssertionId("c03-remote-bytes"),
        kind: "remote-content",
        subject: String(facts.fixturePath),
        expectation: "Remote bytes/hash equal the mobile-edited version on the original stable object.",
      },
      path: facts.fixturePath,
      content,
      remoteObjectId: facts.remoteObjectId,
    },
    {
      kind: "remote-identity",
      assertion: {
        assertionId: validationAssertionId("c03-remote-identity"),
        kind: "remote-identity",
        subject: String(facts.remoteObjectId),
        expectation: "Managed remote and C03 stable Drive object identity remain coherent.",
      },
      expectedIdentity: facts.remoteIdentity,
      path: facts.fixturePath,
      remoteObjectId: facts.remoteObjectId,
    },
    {
      kind: "base-authority",
      assertion: {
        assertionId: validationAssertionId("c03-windows-base-commit"),
        kind: "base-authority",
        subject: String(facts.fixturePath),
        expectation: "Trusted Windows BASE contains the verified replacement and stable remote identity.",
      },
      deviceId: facts.windowsDeviceId,
      path: facts.fixturePath,
      expectedRemoteObjectId: facts.remoteObjectId,
      expectedContent: content,
    },
    {
      kind: "mapping-or-tombstone",
      assertion: {
        assertionId: validationAssertionId("c03-windows-live-mapping"),
        kind: "mapping-or-tombstone",
        subject: String(facts.fixturePath),
        expectation: "Windows retains one live file mapping and no tombstone.",
      },
      deviceId: facts.windowsDeviceId,
      path: facts.fixturePath,
      expected: "mapping",
      remoteObjectId: facts.remoteObjectId,
      entityKind: "file",
    },
    {
      kind: "durable-intent-or-effect",
      assertion: {
        assertionId: validationAssertionId("c03-no-outstanding-effect"),
        kind: "durable-intent-or-effect",
        subject: String(facts.fixturePath),
        expectation: "No durable mutation effect remains uncommitted after verified replacement.",
      },
      deviceId: facts.windowsDeviceId,
      expected: "none-outstanding",
    },
    {
      kind: "unrelated-mutation-absence",
      assertion: {
        assertionId: validationAssertionId("c03-no-unrelated-change"),
        kind: "unrelated-mutation-absence",
        subject: C03_SCENARIO_ID,
        expectation: "Declared unrelated protected paths remain unchanged.",
      },
      local: facts.unrelatedLocal,
      remote: facts.unrelatedRemote,
    },
    {
      kind: "terminal-product-result",
      assertion: {
        assertionId: validationAssertionId("c03-windows-terminal-success"),
        kind: "terminal-product-result",
        subject: "Windows production synchronization",
        expectation: "Windows synchronization reaches sync-run-complete.",
      },
      diagnostic: facts.windowsTerminalDiagnostic,
    },
  ];

  const convergence: ValidationStateConvergenceRequest["convergence"] = [
    {
      kind: "cross-device-content",
      assertion: {
        assertionId: validationAssertionId("c03-cross-device-bytes"),
        kind: "cross-device-content",
        subject: String(facts.fixturePath),
        expectation: "Mobile and Windows converge on the exact edited bytes/hash.",
      },
      deviceIds: [facts.mobileDeviceId, facts.windowsDeviceId],
      path: facts.fixturePath,
      content,
    },
    {
      kind: "cross-device-authority",
      assertion: {
        assertionId: validationAssertionId("c03-cross-device-authority"),
        kind: "cross-device-authority",
        subject: String(facts.fixturePath),
        expectation: "Both devices retain the same stable remote object without a tombstone.",
      },
      deviceIds: [facts.mobileDeviceId, facts.windowsDeviceId],
      path: facts.fixturePath,
      expectedRemoteObjectId: facts.remoteObjectId,
      expectedTombstone: false,
    },
  ];

  return Object.freeze({
    run,
    state: Object.freeze(state),
    convergence: Object.freeze(convergence),
  });
}

/**
 * Additional C03 ordering proof over authoritative execution diagnostics.
 * It does not perform synchronization or replace the shared state verifier.
 */
export function verifyC03VerifiedReplacementCommitOrdering(
  events: readonly DiagnosticEvent[],
  remoteObjectId: RemoteObjectId,
): C03CommitOrderingResult {
  const relevant = events
    .filter(event =>
      event.component === "sync.execute"
      && event.fields?.operationKind === "download-update"
      && event.fields?.remoteObjectId === String(remoteObjectId),
    )
    .slice()
    .sort((left, right) => left.sequence - right.sequence);

  const verified = relevant.find(event =>
    event.event === "integrity-verification-complete"
    && event.fields?.result === "verified",
  );
  if (!verified) {
    return {
      status: "not-observable",
      reason: "C03 could not observe authoritative integrity-verification-complete for the Windows download-update.",
    };
  }

  const committed = relevant.find(event =>
    event.event === "state-commit-complete"
    && event.fields?.commitStatus === "committed"
    && event.sequence > verified.sequence,
  );
  if (!committed) {
    const contradictory = relevant.find(event =>
      event.event === "state-commit-complete"
      && event.fields?.commitStatus === "committed",
    );
    return contradictory
      ? {
          status: "failed",
          reason: "C03 observed state commit before verified replacement.",
          verificationSequence: verified.sequence,
          stateCommitSequence: contradictory.sequence,
        }
      : {
          status: "not-observable",
          reason: "C03 could not observe a committed state transition after verified replacement.",
          verificationSequence: verified.sequence,
        };
  }

  const verifiedOperationId = verified.fields?.operationId;
  const committedOperationId = committed.fields?.operationId;
  if (!verifiedOperationId || verifiedOperationId !== committedOperationId) {
    return {
      status: "failed",
      reason: "C03 verification and state-commit diagnostics do not identify the same download-update operation.",
      verificationSequence: verified.sequence,
      stateCommitSequence: committed.sequence,
    };
  }

  return {
    status: "verified",
    reason: "Verified replacement precedes committed authoritative state for the same Windows download-update.",
    verificationSequence: verified.sequence,
    stateCommitSequence: committed.sequence,
  };
}
