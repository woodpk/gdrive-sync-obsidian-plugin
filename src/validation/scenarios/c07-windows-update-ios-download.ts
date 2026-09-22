import {
  PLAN_OPERATION_KINDS,
  type PlanOperationKind,
  type VaultPath,
} from "../../contracts";
import {
  validationAssertionId,
  type ValidationConvergenceAssertion,
  type ValidationEvidenceRef,
  type ValidationExpectedPlanOperation,
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
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type { ValidationRunnerScenarioDefinition } from "../scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "../scenario-runner-module-adapter";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const C07_SCENARIO_ID = "C07" as const;
export const C07_LIVE_PACKAGE = "C07-windows-update-ios-download.md" as const;
export const C07_TARGET_FIXTURE_ID = "c07-windows-update" as const;
export const C07_TARGET_RELATIVE_PATH = "test-win-c06.md" as const;
export const C07_SENTINEL_FIXTURE_ID = "c07-unrelated-sentinel" as const;
export const C07_SENTINEL_RELATIVE_PATH = "c07-unrelated-sentinel.md" as const;

export const C07_AUTHORITY_CYCLES = Object.freeze({
  establishWindows: "c07-establish-windows",
  establishMobile: "c07-establish-mobile",
  windowsUpdate: "c07-windows-update",
  mobileDownloadUpdate: "c07-mobile-download-update",
});

export const C07_OPERATIONS = Object.freeze({
  establishFixtures: "c07-establish-trusted-fixtures",
  handoffBaselineToMobile: "c07-handoff-baseline-to-mobile",
  verifyTrustedBaseline: "c07-verify-trusted-baseline",
  editWindowsFixture: "c07-edit-windows-fixture",
  handoffUpdateToMobile: "c07-handoff-update-to-mobile",
  verifyFinalConvergence: "c07-verify-final-convergence",
  recordEvidence: "c07-record-evidence",
});

export type C07FixtureManagerPort = Pick<ValidationFixtureManager, "create" | "edit" | "hash">;
export type C07VerifierPort = Pick<StateConvergenceVerifier, "verify">;

export interface C07CrossDeviceHandoffPort {
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly phase: "baseline-to-mobile" | "update-to-mobile";
    readonly from: "windows";
    readonly to: "mobile";
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C07EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly target: ValidationFixtureDescriptor;
    readonly sentinel: ValidationFixtureDescriptor;
    readonly baselineVerification: ValidationStateConvergenceReport;
    readonly finalVerification: ValidationStateConvergenceReport;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface C07ScenarioPackageOptions {
  readonly targetPath: VaultPath;
  readonly sentinelPath: VaultPath;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly windowsFixtures: C07FixtureManagerPort;
  readonly verifier: C07VerifierPort;
  readonly handoffs: C07CrossDeviceHandoffPort;
  readonly evidence: C07EvidenceRecorderPort;
}

export interface C07ScenarioPackage {
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
}

interface C07Context {
  target?: ValidationFixtureDescriptor;
  sentinel?: ValidationFixtureDescriptor;
  baselineVerification?: ValidationStateConvergenceReport;
  finalVerification?: ValidationStateConvergenceReport;
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
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

function forbiddenKinds(expectedOperations: readonly ValidationExpectedPlanOperation[]): readonly PlanOperationKind[] {
  const expectedKinds = new Set<PlanOperationKind>(expectedOperations.map(operation => operation.kind));
  return Object.freeze(
    PLAN_OPERATION_KINDS.filter(kind => kind !== "noop" && !expectedKinds.has(kind)),
  );
}

function expectation(
  expectedOperations: readonly ValidationExpectedPlanOperation[],
): Omit<ValidationPlanExpectation, "run"> {
  return Object.freeze({
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([...expectedOperations]),
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: forbiddenKinds(expectedOperations),
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: "forbidden" as const,
    expectedExecutionDisposition: "safe-auto-eligible" as const,
    expectedGlobalExecutionGate: "none" as const,
  });
}

function expectedOperation(
  kind: "upload-create" | "download-create" | "upload-update" | "download-update",
  path: VaultPath,
): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind,
    path,
    targetSide: kind.startsWith("upload-") ? "remote" : "local",
    destructive: false,
  });
}

function previewStep(stepId: string, cycleId: string) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "preview-manual",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function assertionStep(
  stepId: string,
  cycleId: string,
  assertionId: string,
  planExpectation: Omit<ValidationPlanExpectation, "run">,
) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "plan-assertion-engine" as const,
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({
      authorityCycleId: cycleId,
      assertionId,
      expectation: planExpectation,
    }),
  });
}

function executeStep(stepId: string, cycleId: string) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module: "production-path-driver" as const,
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete" as const,
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function moduleStep(
  stepId: string,
  module: "fixture-manager" | "cross-device-coordinator" | "state-convergence-verifier" | "scenario-evidence-recorder",
  operation: string,
  requiredCompletionProof: "operation-complete" | "verification-passed" | "evidence-recorded",
) {
  return Object.freeze({
    stepId: validationStepId(stepId),
    module,
    operation,
    requiredCompletionProof,
  });
}

export function createC07ScenarioDefinition(input: {
  readonly targetPath: VaultPath;
  readonly sentinelPath: VaultPath;
}): ValidationRunnerScenarioDefinition {
  const baselineWindowsExpectation = expectation([
    expectedOperation("upload-create", input.targetPath),
    expectedOperation("upload-create", input.sentinelPath),
  ]);
  const baselineMobileExpectation = expectation([
    expectedOperation("download-create", input.targetPath),
    expectedOperation("download-create", input.sentinelPath),
  ]);
  const windowsUpdateExpectation = expectation([
    expectedOperation("upload-update", input.targetPath),
  ]);
  const mobileUpdateExpectation = expectation([
    expectedOperation("download-update", input.targetPath),
  ]);

  return Object.freeze({
    scenarioId: C07_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      moduleStep("c07-establish-fixtures", "fixture-manager", C07_OPERATIONS.establishFixtures, "operation-complete"),

      previewStep("c07-establish-windows-preview", C07_AUTHORITY_CYCLES.establishWindows),
      assertionStep(
        "c07-establish-windows-assert",
        C07_AUTHORITY_CYCLES.establishWindows,
        "c07:establish-windows",
        baselineWindowsExpectation,
      ),
      executeStep("c07-establish-windows-execute", C07_AUTHORITY_CYCLES.establishWindows),

      moduleStep(
        "c07-handoff-baseline-to-mobile",
        "cross-device-coordinator",
        C07_OPERATIONS.handoffBaselineToMobile,
        "operation-complete",
      ),
      previewStep("c07-establish-mobile-preview", C07_AUTHORITY_CYCLES.establishMobile),
      assertionStep(
        "c07-establish-mobile-assert",
        C07_AUTHORITY_CYCLES.establishMobile,
        "c07:establish-mobile",
        baselineMobileExpectation,
      ),
      executeStep("c07-establish-mobile-execute", C07_AUTHORITY_CYCLES.establishMobile),
      moduleStep(
        "c07-verify-trusted-baseline",
        "state-convergence-verifier",
        C07_OPERATIONS.verifyTrustedBaseline,
        "verification-passed",
      ),

      moduleStep(
        "c07-edit-windows-fixture",
        "fixture-manager",
        C07_OPERATIONS.editWindowsFixture,
        "operation-complete",
      ),
      previewStep("c07-windows-update-preview", C07_AUTHORITY_CYCLES.windowsUpdate),
      assertionStep(
        "c07-windows-update-assert",
        C07_AUTHORITY_CYCLES.windowsUpdate,
        "c07:windows-upload-update",
        windowsUpdateExpectation,
      ),
      executeStep("c07-windows-update-execute", C07_AUTHORITY_CYCLES.windowsUpdate),

      moduleStep(
        "c07-handoff-update-to-mobile",
        "cross-device-coordinator",
        C07_OPERATIONS.handoffUpdateToMobile,
        "operation-complete",
      ),
      previewStep("c07-mobile-update-preview", C07_AUTHORITY_CYCLES.mobileDownloadUpdate),
      assertionStep(
        "c07-mobile-update-assert",
        C07_AUTHORITY_CYCLES.mobileDownloadUpdate,
        "c07:mobile-download-update",
        mobileUpdateExpectation,
      ),
      executeStep("c07-mobile-update-execute", C07_AUTHORITY_CYCLES.mobileDownloadUpdate),

      moduleStep(
        "c07-verify-final-convergence",
        "state-convergence-verifier",
        C07_OPERATIONS.verifyFinalConvergence,
        "verification-passed",
      ),
      moduleStep(
        "c07-record-evidence",
        "scenario-evidence-recorder",
        C07_OPERATIONS.recordEvidence,
        "evidence-recorded",
      ),
    ]),
  });
}

function requireDescriptor(
  descriptor: ValidationFixtureDescriptor | undefined,
  label: string,
): ValidationFixtureDescriptor {
  if (!descriptor) throw new Error(`C07 ${label} fixture is unavailable.`);
  if (!descriptor.hash) throw new Error(`C07 ${label} fixture has no exact content hash.`);
  return descriptor;
}

function assertFixture(
  run: ValidationRunIdentity,
  descriptor: ValidationFixtureDescriptor,
  expectedRelativePath: string,
  expectedPath: VaultPath,
): void {
  if (!sameRun(descriptor.identity.run, run)) throw new Error("C07 fixture belongs to a different validation run.");
  if (descriptor.relativePath !== expectedRelativePath || descriptor.path !== expectedPath) {
    throw new Error("C07 fixture path does not match the scenario-owned path.");
  }
  if (descriptor.kind !== "text" || !descriptor.hash) {
    throw new Error("C07 requires deterministic text fixtures with exact content hashes.");
  }
}

function baselineVerificationRequest(
  run: ValidationRunIdentity,
  options: C07ScenarioPackageOptions,
  target: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  const targetContent = { hash: target.hash!, sizeBytes: target.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  return {
    run,
    state: [
      {
        kind: "local-content",
        assertion: stateAssertion("c07.baseline.windows.target", "local-content", String(target.path), "Windows has the trusted target bytes."),
        deviceId: options.windowsDevice.deviceId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("c07.baseline.mobile.target", "local-content", String(target.path), "Mobile has the trusted target bytes."),
        deviceId: options.mobileDevice.deviceId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("c07.baseline.remote.target", "remote-content", String(target.path), "Remote has exactly the trusted target bytes."),
        path: target.path,
        content: targetContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("c07.baseline.windows.sentinel", "local-content", String(sentinel.path), "Windows has the unrelated sentinel bytes."),
        deviceId: options.windowsDevice.deviceId,
        path: sentinel.path,
        content: sentinelContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("c07.baseline.mobile.sentinel", "local-content", String(sentinel.path), "Mobile has the unrelated sentinel bytes."),
        deviceId: options.mobileDevice.deviceId,
        path: sentinel.path,
        content: sentinelContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("c07.baseline.remote.sentinel", "remote-content", String(sentinel.path), "Remote has exactly one unrelated sentinel with the expected bytes."),
        path: sentinel.path,
        content: sentinelContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("c07.baseline.windows.base", "base-authority", String(target.path), "Windows trusted BASE contains the target baseline."),
        deviceId: options.windowsDevice.deviceId,
        path: target.path,
        expectedContent: targetContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("c07.baseline.mobile.base", "base-authority", String(target.path), "Mobile trusted BASE contains the target baseline."),
        deviceId: options.mobileDevice.deviceId,
        path: target.path,
        expectedContent: targetContent,
      },
    ],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("c07.baseline.target.convergence", "cross-device-content", String(target.path), "Both participants share the trusted target baseline."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: target.path,
        content: targetContent,
      },
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("c07.baseline.sentinel.convergence", "cross-device-content", String(sentinel.path), "Both participants share the unrelated sentinel baseline."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: sentinel.path,
        content: sentinelContent,
      },
    ],
  };
}

function finalVerificationRequest(
  run: ValidationRunIdentity,
  options: C07ScenarioPackageOptions,
  target: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  const targetContent = { hash: target.hash!, sizeBytes: target.sizeBytes };
  const sentinelContent = { hash: sentinel.hash!, sizeBytes: sentinel.sizeBytes };
  return {
    run,
    state: [
      {
        kind: "local-content",
        assertion: stateAssertion("c07.final.windows.target", "local-content", String(target.path), "Windows retains the exact edited target bytes/hash."),
        deviceId: options.windowsDevice.deviceId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("c07.final.mobile.target", "local-content", String(target.path), "Mobile replacement contains the exact edited Windows bytes/hash."),
        deviceId: options.mobileDevice.deviceId,
        path: target.path,
        content: targetContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("c07.final.remote.target", "remote-content", String(target.path), "Remote bytes/hash exactly equal the edited Windows target."),
        path: target.path,
        content: targetContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("c07.final.mobile.base", "base-authority", String(target.path), "Mobile trusted BASE commits only after verified replacement."),
        deviceId: options.mobileDevice.deviceId,
        path: target.path,
        expectedContent: targetContent,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion("c07.final.mobile.mapping", "mapping-or-tombstone", String(target.path), "Mobile retains one live target mapping and no tombstone."),
        deviceId: options.mobileDevice.deviceId,
        path: target.path,
        expected: "mapping",
        entityKind: "file",
      },
      {
        kind: "durable-intent-or-effect",
        assertion: stateAssertion("c07.final.mobile.effects", "durable-intent-or-effect", String(target.path), "No mobile durable effect remains outstanding after replacement/state commit."),
        deviceId: options.mobileDevice.deviceId,
        expected: "none-outstanding",
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: stateAssertion("c07.final.no-unrelated-change", "unrelated-mutation-absence", C07_SCENARIO_ID, "The sentinel remains byte/state identical on both devices and remote."),
        local: [
          {
            deviceId: options.windowsDevice.deviceId,
            path: sentinel.path,
            state: "file",
            content: sentinelContent,
          },
          {
            deviceId: options.mobileDevice.deviceId,
            path: sentinel.path,
            state: "file",
            content: sentinelContent,
          },
        ],
        remote: [
          {
            path: sentinel.path,
            state: "live",
            content: sentinelContent,
          },
        ],
      },
    ],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("c07.final.target.content", "cross-device-content", String(target.path), "Windows and mobile converge on the edited target bytes/hash."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: target.path,
        content: targetContent,
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion("c07.final.target.authority", "cross-device-authority", String(target.path), "Both participants converge on live target authority without a tombstone."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: target.path,
        expectedTombstone: false,
      },
    ],
  };
}

export function createC07WindowsUpdateMobileDownloadScenario(
  options: C07ScenarioPackageOptions,
): C07ScenarioPackage {
  if (options.windowsDevice.platform !== "windows-desktop") {
    throw new Error("C07 controller device must be Windows desktop.");
  }
  if (options.mobileDevice.platform !== "iphone" && options.mobileDevice.platform !== "ipad") {
    throw new Error("C07 mobile participant must be iPhone or iPad.");
  }
  if (options.windowsDevice.deviceId === options.mobileDevice.deviceId) {
    throw new Error("C07 participants must have distinct device identities.");
  }
  if (options.targetPath === options.sentinelPath) {
    throw new Error("C07 target and sentinel paths must be distinct.");
  }

  const context: C07Context = {};

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        if (request.operation === C07_OPERATIONS.establishFixtures) {
          const target = await options.windowsFixtures.create(
            validationTextFixture(C07_TARGET_FIXTURE_ID, C07_TARGET_RELATIVE_PATH, 1, "base", "ordinary"),
          );
          const sentinel = await options.windowsFixtures.create(
            validationTextFixture(C07_SENTINEL_FIXTURE_ID, C07_SENTINEL_RELATIVE_PATH, 1, "base", "ordinary"),
          );
          assertFixture(request.run, target, C07_TARGET_RELATIVE_PATH, options.targetPath);
          assertFixture(request.run, sentinel, C07_SENTINEL_RELATIVE_PATH, options.sentinelPath);
          const targetHash = await options.windowsFixtures.hash(C07_TARGET_FIXTURE_ID);
          const sentinelHash = await options.windowsFixtures.hash(C07_SENTINEL_FIXTURE_ID);
          if (targetHash !== target.hash || sentinelHash !== sentinel.hash) {
            return failed("C07 trusted fixture setup failed deterministic hash verification.");
          }
          context.target = target;
          context.sentinel = sentinel;
          return completed();
        }

        if (request.operation === C07_OPERATIONS.editWindowsFixture) {
          const prior = requireDescriptor(context.target, "target");
          const edited = await options.windowsFixtures.edit(
            C07_TARGET_FIXTURE_ID,
            prior.version + 1,
            "non-overlap-a",
          );
          assertFixture(request.run, edited, C07_TARGET_RELATIVE_PATH, options.targetPath);
          if (edited.identity.fixtureId !== prior.identity.fixtureId || edited.version <= prior.version) {
            return failed("C07 Windows edit did not preserve fixture identity and advance its version.");
          }
          if (edited.hash === prior.hash) {
            return failed("C07 Windows edit did not change the target bytes/hash.");
          }
          const editedHash = await options.windowsFixtures.hash(C07_TARGET_FIXTURE_ID);
          if (editedHash !== edited.hash) {
            return failed("C07 Windows edit failed deterministic post-edit hash verification.");
          }
          context.target = edited;
          return completed();
        }

        return blocked(`Unsupported C07 fixture operation: ${request.operation}`);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C07 fixture operation failed.");
      }
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const phase = request.operation === C07_OPERATIONS.handoffBaselineToMobile
        ? "baseline-to-mobile"
        : request.operation === C07_OPERATIONS.handoffUpdateToMobile
          ? "update-to-mobile"
          : undefined;
      if (!phase) return blocked(`Unsupported C07 handoff operation: ${request.operation}`);
      try {
        const refs = await options.handoffs.handoff({
          run: request.run,
          stepId: request.stepId,
          phase,
          from: "windows",
          to: "mobile",
        });
        return completed(refs);
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "C07 cross-device handoff failed.");
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const target = requireDescriptor(context.target, "target");
        const sentinel = requireDescriptor(context.sentinel, "sentinel");
        const verification = request.operation === C07_OPERATIONS.verifyTrustedBaseline
          ? baselineVerificationRequest(request.run, options, target, sentinel)
          : request.operation === C07_OPERATIONS.verifyFinalConvergence
            ? finalVerificationRequest(request.run, options, target, sentinel)
            : undefined;
        if (!verification) return blocked(`Unsupported C07 verifier operation: ${request.operation}`);

        const report = await options.verifier.verify(verification);
        if (request.operation === C07_OPERATIONS.verifyTrustedBaseline) context.baselineVerification = report;
        else context.finalVerification = report;
        const refs = report.evidence.map(item => item.ref);
        if (report.result.verdict === "pass") return completed(refs);
        const summary = `C07 verification ${report.result.verdict} for ${request.operation}.`;
        return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C07 verification failed.");
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== C07_OPERATIONS.recordEvidence) {
        return blocked(`Unsupported C07 evidence operation: ${request.operation}`);
      }
      try {
        const target = requireDescriptor(context.target, "target");
        const sentinel = requireDescriptor(context.sentinel, "sentinel");
        const baselineVerification = context.baselineVerification;
        const finalVerification = context.finalVerification;
        if (!baselineVerification || !finalVerification) {
          return blocked("C07 evidence cannot be recorded before both verifier phases complete.");
        }
        const refs = await options.evidence.record({
          run: request.run,
          target,
          sentinel,
          baselineVerification,
          finalVerification,
        });
        if (refs.length === 0) return blocked("C07 evidence recorder returned no durable evidence reference.");
        return completed(refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C07 evidence recording failed.");
      }
    },
  };

  const prerequisites: ValidationRunnerPrerequisiteDelegate = {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "C07 reconstructs its trusted C06-equivalent fixture baseline internally and accepts no external prerequisite.",
        evidenceRefs: [],
      }));
    },
  };

  const moduleOverrides: ValidationModeModuleOverrides = Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": handoffDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });

  return Object.freeze({
    definition: createC07ScenarioDefinition({
      targetPath: options.targetPath,
      sentinelPath: options.sentinelPath,
    }),
    prerequisites,
    moduleOverrides,
  });
}
