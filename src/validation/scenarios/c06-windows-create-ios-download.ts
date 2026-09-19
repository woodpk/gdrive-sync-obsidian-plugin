import {
  PLAN_OPERATION_KINDS,
  contractId,
  type ContentHash,
  type PlanOperationKind,
  type RemoteObjectId,
  type VaultPath,
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
import {
  validationStepId,
  type ValidationDeviceId,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type { ValidationRunnerScenarioDefinition } from "../scenario-runner-contracts";
import type { ValidationRunnerApprovedModuleDelegate } from "../scenario-runner-module-adapter";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const C06_LIVE_PACKAGE = "C06-windows-create-ios-download.md" as const;
export const C06_SCENARIO_ID = "C06" as const;
export const C06_FIXTURE_ID = "c06-windows-create" as const;
export const C06_FIXTURE_RELATIVE_PATH = "test-win-c06.md" as const;

/**
 * H7 owns only the logical C06 fixture name. The concrete harness-owned path is
 * fixed for this registration so H6B can assert the exact observed plan
 * without scenario-local plan authority.
 */
export const C06_FIXTURE_PATH = contractId<"VaultPath">(
  "BRAIN Validation/C06/test-win-c06.md",
) as VaultPath;

export const C06_WINDOWS_AUTHORITY_CYCLE_ID = "c06:windows-sync" as const;
export const C06_MOBILE_AUTHORITY_CYCLE_ID = "c06:mobile-sync" as const;

export const C06_OPERATIONS = Object.freeze({
  createWindowsFixture: "c06:create-windows-fixture",
  verifyRemoteSingleObject: "c06:verify-remote-single-object",
  handoffToMobile: "c06:handoff-to-mobile",
  verifyFinalConvergence: "c06:verify-final-convergence",
  recordEvidence: "c06:record-evidence",
} as const);

type C06PlanExpectation = Omit<ValidationPlanExpectation, "run">;

function forbiddenKinds(expected: PlanOperationKind): readonly PlanOperationKind[] {
  return Object.freeze(
    PLAN_OPERATION_KINDS.filter(kind => kind !== expected && kind !== "noop"),
  );
}

function planExpectation(
  expectedKind: "upload-create" | "download-create",
  targetSide: "remote" | "local",
): C06PlanExpectation {
  return Object.freeze({
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([
      Object.freeze({
        kind: expectedKind,
        path: C06_FIXTURE_PATH,
        targetSide,
        destructive: false,
      }),
    ]),
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: forbiddenKinds(expectedKind),
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
}

export const C06_WINDOWS_PLAN_EXPECTATION = planExpectation(
  "upload-create",
  "remote",
);
export const C06_MOBILE_PLAN_EXPECTATION = planExpectation(
  "download-create",
  "local",
);

/**
 * Declarative C06 registration consumed by the repaired H6B runtime.
 *
 * Production preview/assert/execute steps deliberately use only the generic
 * H6B operation names and explicit authority-cycle IDs. H6B therefore owns the
 * exact observed-plan retention, fixed assertion, retained authorization, and
 * fixed production execution handoff.
 */
export const C06_SCENARIO_DEFINITION: ValidationRunnerScenarioDefinition = Object.freeze({
  scenarioId: C06_SCENARIO_ID,
  prerequisiteIds: Object.freeze([]),
  steps: Object.freeze([
    Object.freeze({
      stepId: validationStepId("c06:create-windows-fixture"),
      module: "fixture-manager" as const,
      operation: C06_OPERATIONS.createWindowsFixture,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c06:windows-preview"),
      module: "production-path-driver" as const,
      operation: "preview-manual",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: C06_WINDOWS_AUTHORITY_CYCLE_ID }),
    }),
    Object.freeze({
      stepId: validationStepId("c06:windows-assert"),
      module: "plan-assertion-engine" as const,
      operation: "assert-observed-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({
        authorityCycleId: C06_WINDOWS_AUTHORITY_CYCLE_ID,
        assertionId: "c06:windows-upload-create",
        expectation: C06_WINDOWS_PLAN_EXPECTATION,
      }),
    }),
    Object.freeze({
      stepId: validationStepId("c06:windows-execute"),
      module: "production-path-driver" as const,
      operation: "execute-asserted-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: C06_WINDOWS_AUTHORITY_CYCLE_ID }),
    }),
    Object.freeze({
      stepId: validationStepId("c06:verify-remote-single-object"),
      module: "state-convergence-verifier" as const,
      operation: C06_OPERATIONS.verifyRemoteSingleObject,
      requiredCompletionProof: "verification-passed" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c06:handoff-to-mobile"),
      module: "cross-device-coordinator" as const,
      operation: C06_OPERATIONS.handoffToMobile,
      requiredCompletionProof: "operation-complete" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c06:mobile-preview"),
      module: "production-path-driver" as const,
      operation: "preview-manual",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: C06_MOBILE_AUTHORITY_CYCLE_ID }),
    }),
    Object.freeze({
      stepId: validationStepId("c06:mobile-assert"),
      module: "plan-assertion-engine" as const,
      operation: "assert-observed-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({
        authorityCycleId: C06_MOBILE_AUTHORITY_CYCLE_ID,
        assertionId: "c06:mobile-download-create",
        expectation: C06_MOBILE_PLAN_EXPECTATION,
      }),
    }),
    Object.freeze({
      stepId: validationStepId("c06:mobile-execute"),
      module: "production-path-driver" as const,
      operation: "execute-asserted-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: C06_MOBILE_AUTHORITY_CYCLE_ID }),
    }),
    Object.freeze({
      stepId: validationStepId("c06:verify-final-convergence"),
      module: "state-convergence-verifier" as const,
      operation: C06_OPERATIONS.verifyFinalConvergence,
      requiredCompletionProof: "verification-passed" as const,
    }),
    Object.freeze({
      stepId: validationStepId("c06:record-evidence"),
      module: "scenario-evidence-recorder" as const,
      operation: C06_OPERATIONS.recordEvidence,
      requiredCompletionProof: "evidence-recorded" as const,
    }),
  ]),
});

export type C06WindowsFixturePort = Pick<ValidationFixtureManager, "create" | "hash">;
export type C06VerifierPort = Pick<StateConvergenceVerifier, "verify">;

export interface C06RemoteObjectResolver {
  resolveRemoteObjectId(input: {
    readonly run: ValidationRunIdentity;
    readonly path: VaultPath;
  }): Promise<RemoteObjectId>;
}

export interface C06MobileHandoffPort {
  handoffToMobile(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly fixture: ValidationFixtureDescriptor;
    readonly remoteObjectId: RemoteObjectId;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C06EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly fixture: ValidationFixtureDescriptor;
    readonly remoteObjectId: RemoteObjectId;
    readonly remoteVerification: ValidationStateConvergenceReport;
    readonly finalVerification: ValidationStateConvergenceReport;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C06ValidationModeRegistrationDependencies {
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsFixtures: C06WindowsFixturePort;
  readonly verifier: C06VerifierPort;
  readonly remoteObjects: C06RemoteObjectResolver;
  readonly handoff: C06MobileHandoffPort;
  readonly evidence: C06EvidenceRecorderPort;
}

export interface C06ValidationModeRegistration {
  readonly definitions: readonly [ValidationRunnerScenarioDefinition];
  /**
   * Only non-fixed H6B modules are supplied here. Production-path-driver and
   * plan-assertion-engine remain owned by ValidationModeRuntime.
   */
  readonly moduleOverrides: ValidationModeModuleOverrides;
}

interface C06RunContext {
  fixture?: ValidationFixtureDescriptor;
  remoteObjectId?: RemoteObjectId;
  remoteVerification?: ValidationStateConvergenceReport;
  finalVerification?: ValidationStateConvergenceReport;
}

function runKey(run: ValidationRunIdentity): string {
  return `${String(run.scenarioId)}\u0000${String(run.runId)}`;
}

function sameScenario(run: ValidationRunIdentity): boolean {
  return run.scenarioId === C06_SCENARIO_ID;
}

function completed(
  evidenceRefs: readonly ValidationEvidenceRef[] = [],
): Awaited<ReturnType<ValidationRunnerApprovedModuleDelegate["execute"]>> {
  return { status: "completed", evidenceRefs };
}

function failed(
  summary: string,
  evidenceRefs: readonly ValidationEvidenceRef[] = [],
): Awaited<ReturnType<ValidationRunnerApprovedModuleDelegate["execute"]>> {
  return { status: "failed", summary, evidenceRefs };
}

function blocked(
  summary: string,
  evidenceRefs: readonly ValidationEvidenceRef[] = [],
): Awaited<ReturnType<ValidationRunnerApprovedModuleDelegate["execute"]>> {
  return { status: "blocked", summary, evidenceRefs };
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

function convergenceAssertion(
  id: string,
  kind: ValidationConvergenceAssertion["kind"],
  subject: string,
  expectation: string,
): ValidationConvergenceAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject,
    expectation,
  });
}

function exactContent(fixture: ValidationFixtureDescriptor): {
  readonly hash: ContentHash;
  readonly sizeBytes: number;
} {
  if (!fixture.hash) throw new Error("C06 deterministic text fixture has no content hash.");
  return Object.freeze({ hash: fixture.hash, sizeBytes: fixture.sizeBytes });
}

function verifyRemoteSingleObjectRequest(
  run: ValidationRunIdentity,
  windowsDeviceId: ValidationDeviceId,
  fixture: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  const content = exactContent(fixture);
  return Object.freeze({
    run,
    state: Object.freeze([
      Object.freeze({
        kind: "local-content" as const,
        assertion: stateAssertion(
          "c06:windows-source-content",
          "local-content",
          String(fixture.path),
          "Windows retains the deterministic C06 bytes/hash after upload-create.",
        ),
        deviceId: windowsDeviceId,
        path: fixture.path,
        content,
      }),
      Object.freeze({
        kind: "remote-content" as const,
        assertion: stateAssertion(
          "c06:remote-single-object",
          "remote-content",
          String(fixture.path),
          "Exactly one live remote object exists at the C06 path with identical bytes/hash.",
        ),
        path: fixture.path,
        content,
        // Intentionally omit remoteObjectId so the fixed verifier rejects
        // multiple occupants at the logical path.
      }),
    ]) as ValidationStateConvergenceRequest["state"],
    convergence: Object.freeze([
      Object.freeze({
        kind: "cross-device-path" as const,
        assertion: convergenceAssertion(
          "c06:windows-source-path",
          "cross-device-path",
          String(fixture.path),
          "The Windows source path remains a file before mobile handoff.",
        ),
        deviceIds: Object.freeze([windowsDeviceId]),
        path: fixture.path,
        expected: "file" as const,
      }),
    ]) as ValidationStateConvergenceRequest["convergence"],
  });
}

function finalConvergenceRequest(
  run: ValidationRunIdentity,
  windowsDeviceId: ValidationDeviceId,
  mobileDeviceId: ValidationDeviceId,
  fixture: ValidationFixtureDescriptor,
  remoteObjectId: RemoteObjectId,
): ValidationStateConvergenceRequest {
  const content = exactContent(fixture);
  const localContent = (deviceId: ValidationDeviceId, suffix: string) => Object.freeze({
    kind: "local-content" as const,
    assertion: stateAssertion(
      `c06:${suffix}:content`,
      "local-content",
      String(fixture.path),
      "Participant contains the exact deterministic C06 bytes/hash.",
    ),
    deviceId,
    path: fixture.path,
    content,
  });
  const baseAuthority = (deviceId: ValidationDeviceId, suffix: string) => Object.freeze({
    kind: "base-authority" as const,
    assertion: stateAssertion(
      `c06:${suffix}:base-authority`,
      "base-authority",
      String(fixture.path),
      "Participant BASE contains the converged bytes and stable remote identity.",
    ),
    deviceId,
    path: fixture.path,
    expectedRemoteObjectId: remoteObjectId,
    expectedContent: content,
  });
  const liveMapping = (deviceId: ValidationDeviceId, suffix: string) => Object.freeze({
    kind: "mapping-or-tombstone" as const,
    assertion: stateAssertion(
      `c06:${suffix}:live-mapping`,
      "mapping-or-tombstone",
      String(fixture.path),
      "Participant retains one live file mapping and no C06 tombstone.",
    ),
    deviceId,
    path: fixture.path,
    expected: "mapping" as const,
    remoteObjectId,
    entityKind: "file" as const,
  });
  const noOutstandingEffects = (deviceId: ValidationDeviceId, suffix: string) => Object.freeze({
    kind: "durable-intent-or-effect" as const,
    assertion: stateAssertion(
      `c06:${suffix}:no-outstanding-effects`,
      "durable-intent-or-effect",
      String(fixture.path),
      "No durable mutation effect remains outstanding after convergence.",
    ),
    deviceId,
    expected: "none-outstanding" as const,
  });

  return Object.freeze({
    run,
    state: Object.freeze([
      localContent(windowsDeviceId, "windows"),
      localContent(mobileDeviceId, "mobile"),
      Object.freeze({
        kind: "remote-content" as const,
        assertion: stateAssertion(
          "c06:remote-final-single-object",
          "remote-content",
          String(fixture.path),
          "Exactly one remote C06 object remains and its bytes/hash match both devices.",
        ),
        path: fixture.path,
        content,
        // Keep this path-based so a duplicate occupant still fails final proof.
      }),
      baseAuthority(windowsDeviceId, "windows"),
      baseAuthority(mobileDeviceId, "mobile"),
      liveMapping(windowsDeviceId, "windows"),
      liveMapping(mobileDeviceId, "mobile"),
      noOutstandingEffects(windowsDeviceId, "windows"),
      noOutstandingEffects(mobileDeviceId, "mobile"),
    ]) as ValidationStateConvergenceRequest["state"],
    convergence: Object.freeze([
      Object.freeze({
        kind: "cross-device-content" as const,
        assertion: convergenceAssertion(
          "c06:cross-device-content",
          "cross-device-content",
          String(fixture.path),
          "Windows and mobile contain identical C06 bytes/hash.",
        ),
        deviceIds: Object.freeze([windowsDeviceId, mobileDeviceId]),
        path: fixture.path,
        content,
      }),
      Object.freeze({
        kind: "cross-device-path" as const,
        assertion: convergenceAssertion(
          "c06:cross-device-path",
          "cross-device-path",
          String(fixture.path),
          "C06 exists as one file path on both participants.",
        ),
        deviceIds: Object.freeze([windowsDeviceId, mobileDeviceId]),
        path: fixture.path,
        expected: "file" as const,
      }),
      Object.freeze({
        kind: "cross-device-authority" as const,
        assertion: convergenceAssertion(
          "c06:cross-device-authority",
          "cross-device-authority",
          String(fixture.path),
          "Both devices converge on the same live remote object without a tombstone.",
        ),
        deviceIds: Object.freeze([windowsDeviceId, mobileDeviceId]),
        path: fixture.path,
        expectedRemoteObjectId: remoteObjectId,
        expectedTombstone: false,
      }),
    ]) as ValidationStateConvergenceRequest["convergence"],
  });
}

function reportOutcome(
  report: ValidationStateConvergenceReport,
  label: string,
): Awaited<ReturnType<ValidationRunnerApprovedModuleDelegate["execute"]>> {
  const refs = report.evidence.map(item => item.ref);
  if (report.result.verdict === "pass") {
    if (refs.length === 0) return blocked(`${label} produced no objective evidence references.`);
    return completed(refs);
  }
  const summary = `${label} verification ${report.result.verdict}.`;
  return report.result.verdict === "fail"
    ? failed(summary, refs)
    : blocked(summary, refs);
}

/**
 * Creates the C06 H7 extension consumed directly by ValidationModeRuntime's
 * established definitions/moduleOverrides seams.
 *
 * This function never supplies production-path-driver or plan-assertion-engine
 * overrides. Those bindings are fixed by H6B-R2.
 */
export function createC06ValidationModeRegistration(
  dependencies: C06ValidationModeRegistrationDependencies,
): C06ValidationModeRegistration {
  if (dependencies.windowsDeviceId === dependencies.mobileDeviceId) {
    throw new Error("C06 Windows and mobile participant identities must be distinct.");
  }

  const contexts = new Map<string, C06RunContext>();
  const contextFor = (run: ValidationRunIdentity): C06RunContext => {
    const key = runKey(run);
    const existing = contexts.get(key);
    if (existing) return existing;
    const created: C06RunContext = {};
    contexts.set(key, created);
    return created;
  };

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (!sameScenario(request.run) || request.operation !== C06_OPERATIONS.createWindowsFixture) {
        return blocked("C06 fixture registration received an unowned operation.");
      }
      try {
        const context = contextFor(request.run);
        if (context.fixture) return blocked("C06 Windows fixture is already established for this run.");
        const fixture = await dependencies.windowsFixtures.create(
          validationTextFixture(
            C06_FIXTURE_ID,
            C06_FIXTURE_RELATIVE_PATH,
            1,
            "base",
            "ordinary",
          ),
        );
        if (fixture.path !== C06_FIXTURE_PATH) {
          return blocked(
            `C06 fixture path ${String(fixture.path)} does not match registered plan authority path ${String(C06_FIXTURE_PATH)}.`,
          );
        }
        const actualHash = await dependencies.windowsFixtures.hash(C06_FIXTURE_ID);
        if (!fixture.hash || actualHash !== fixture.hash) {
          return failed("C06 deterministic Windows fixture hash does not match its descriptor.");
        }
        context.fixture = fixture;
        return completed();
      } catch (error) {
        return blocked(
          error instanceof Error
            ? `C06 Windows fixture setup blocked: ${error.message}`
            : "C06 Windows fixture setup blocked.",
        );
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (!sameScenario(request.run)) return blocked("C06 verifier received a different scenario.");
      const context = contextFor(request.run);
      if (!context.fixture) return blocked("C06 verifier has no deterministic Windows fixture.");

      try {
        if (request.operation === C06_OPERATIONS.verifyRemoteSingleObject) {
          const report = await dependencies.verifier.verify(
            verifyRemoteSingleObjectRequest(
              request.run,
              dependencies.windowsDeviceId,
              context.fixture,
            ),
          );
          context.remoteVerification = report;
          const outcome = reportOutcome(report, "C06 remote single-object");
          if (outcome.status !== "completed") return outcome;
          context.remoteObjectId = await dependencies.remoteObjects.resolveRemoteObjectId({
            run: request.run,
            path: context.fixture.path,
          });
          return outcome;
        }

        if (request.operation === C06_OPERATIONS.verifyFinalConvergence) {
          if (!context.remoteObjectId) {
            return blocked("C06 final verification has no trusted remote object identity.");
          }
          const report = await dependencies.verifier.verify(
            finalConvergenceRequest(
              request.run,
              dependencies.windowsDeviceId,
              dependencies.mobileDeviceId,
              context.fixture,
              context.remoteObjectId,
            ),
          );
          context.finalVerification = report;
          return reportOutcome(report, "C06 final convergence");
        }

        return blocked("C06 verifier received an unsupported operation.");
      } catch (error) {
        return blocked(
          error instanceof Error
            ? `C06 verification blocked: ${error.message}`
            : "C06 verification blocked.",
        );
      }
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (!sameScenario(request.run) || request.operation !== C06_OPERATIONS.handoffToMobile) {
        return blocked("C06 handoff registration received an unowned operation.");
      }
      const context = contextFor(request.run);
      if (!context.fixture || !context.remoteObjectId || context.remoteVerification?.result.verdict !== "pass") {
        return blocked("C06 cannot hand off to mobile before unique remote-object proof succeeds.");
      }
      try {
        const refs = await dependencies.handoff.handoffToMobile({
          run: request.run,
          stepId: request.stepId,
          fixture: context.fixture,
          remoteObjectId: context.remoteObjectId,
        });
        return completed(refs);
      } catch (error) {
        return blocked(
          error instanceof Error
            ? `C06 mobile handoff blocked: ${error.message}`
            : "C06 mobile handoff blocked.",
        );
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (!sameScenario(request.run) || request.operation !== C06_OPERATIONS.recordEvidence) {
        return blocked("C06 evidence registration received an unowned operation.");
      }
      const context = contextFor(request.run);
      if (
        !context.fixture
        || !context.remoteObjectId
        || context.remoteVerification?.result.verdict !== "pass"
        || context.finalVerification?.result.verdict !== "pass"
      ) {
        return blocked("C06 cannot record PASS evidence before both verification phases pass.");
      }
      try {
        const refs = await dependencies.evidence.record({
          run: request.run,
          fixture: context.fixture,
          remoteObjectId: context.remoteObjectId,
          remoteVerification: context.remoteVerification,
          finalVerification: context.finalVerification,
        });
        if (refs.length === 0) return blocked("C06 evidence recorder returned no durable evidence reference.");
        return completed(refs);
      } catch (error) {
        return failed(
          error instanceof Error
            ? `C06 evidence recording failed: ${error.message}`
            : "C06 evidence recording failed.",
        );
      }
    },
  };

  const moduleOverrides: ValidationModeModuleOverrides = Object.freeze({
    "fixture-manager": fixtureDelegate,
    "state-convergence-verifier": verifierDelegate,
    "cross-device-coordinator": handoffDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });

  return Object.freeze({
    definitions: Object.freeze([C06_SCENARIO_DEFINITION]) as readonly [ValidationRunnerScenarioDefinition],
    moduleOverrides,
  });
}
