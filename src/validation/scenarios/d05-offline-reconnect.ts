import {
  PLAN_OPERATION_KINDS,
  type PlanOperationKind,
  type ProductSurfaceState,
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
  HumanCheckpointResumeController,
  type HumanCheckpointControllerResult,
  type HumanCheckpointPostconditionProbe,
  type HumanCheckpointResumeCommitPort,
} from "../human-checkpoint-resume-controller";
import {
  validationStepId,
  type HumanCheckpointAction,
  type HumanCheckpointId,
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerHumanCheckpointResumePort,
  ValidationRunnerScenarioDefinition,
} from "../scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "../scenario-runner-module-adapter";
import type {
  StateConvergenceVerifier,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
  ValidationStatePostcondition,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const D05_SCENARIO_ID = "D05" as const;
export const D05_LIVE_PACKAGE = "D05-offline-reconnect.md" as const;

export const D05_MOBILE_FIXTURE_ID = "d05-mobile-offline-edit" as const;
export const D05_WINDOWS_FIXTURE_ID = "d05-windows-online-edit" as const;
export const D05_MOBILE_RELATIVE_PATH = "d05-mobile-offline.md" as const;
export const D05_WINDOWS_RELATIVE_PATH = "d05-windows-online.md" as const;

export const D05_OFFLINE_CHECKPOINT_ID = "d05-disable-mobile-connectivity" as const;
export const D05_RECONNECT_CHECKPOINT_ID = "d05-restore-mobile-connectivity" as const;

export const D05_AUTHORITY_CYCLES = Object.freeze({
  establishWindows: "d05-establish-windows",
  establishMobile: "d05-establish-mobile",
  establishWindowsRemote: "d05-establish-windows-remote",
  windowsOnlineUpdate: "d05-windows-online-update",
  mobileReconnect: "d05-mobile-reconnect",
  windowsFinalReconcile: "d05-windows-final-reconcile",
});

export const D05_OPERATIONS = Object.freeze({
  establishFixtures: "d05-establish-independent-fixtures",
  handoffBaselineToMobile: "d05-handoff-baseline-to-mobile",
  handoffBaselineToWindows: "d05-handoff-baseline-to-windows",
  verifyTrustedBaseline: "d05-verify-trusted-baseline",
  pauseForOffline: "d05-pause-for-genuine-mobile-offline",
  editMobileOffline: "d05-edit-mobile-while-offline",
  editWindowsOnline: "d05-edit-windows-while-mobile-offline",
  pauseForReconnect: "d05-pause-for-mobile-reconnect",
  handoffReconnectedToWindows: "d05-handoff-reconnected-to-windows",
  verifyFinalConvergence: "d05-verify-final-convergence",
  recordEvidence: "d05-record-evidence",
});

export type D05FixtureManagerPort = Pick<ValidationFixtureManager, "create" | "edit" | "hash">;
export type D05VerifierPort = Pick<StateConvergenceVerifier, "verify">;

export type D05HandoffPhase =
  | "baseline-to-mobile"
  | "baseline-to-windows"
  | "reconnected-mobile-to-windows";

export interface D05CrossDeviceHandoffPort {
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly phase: D05HandoffPhase;
    readonly from: "windows" | "mobile";
    readonly to: "windows" | "mobile";
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D05ConnectivityCheckpointEvidence {
  readonly run: ValidationRunIdentity;
  readonly checkpointId: HumanCheckpointId;
  readonly action: Extract<HumanCheckpointAction, "disable-mobile-connectivity" | "restore-mobile-connectivity">;
  readonly device: ValidationDeviceIdentity;
  readonly acknowledgedAt: string;
  readonly verifiedAt: string;
}

/**
 * Scenario-local evidence adapter over the approved VH13 controller.
 *
 * It delegates all checkpoint authority to HumanCheckpointResumeController and
 * retains already-durable acknowledgement/device facts only after VH13 reports
 * that the exact checkpoint was successfully consumed and adopted.
 */
export class D05ConnectivityCheckpointController implements ValidationRunnerHumanCheckpointResumePort {
  private readonly observations: D05ConnectivityCheckpointEvidence[] = [];

  public constructor(private readonly inner: HumanCheckpointResumeController) {}

  current(): Promise<HumanCheckpointControllerResult> {
    return this.inner.current();
  }

  begin(input: Parameters<HumanCheckpointResumeController["begin"]>[0]): Promise<HumanCheckpointControllerResult> {
    return this.inner.begin(input);
  }

  acknowledge(
    run: ValidationRunIdentity,
    checkpointId: string,
  ): Promise<HumanCheckpointControllerResult> {
    return this.inner.acknowledge(run, checkpointId);
  }

  verify(
    run: ValidationRunIdentity,
    checkpointId: string,
    currentDevice: ValidationDeviceIdentity,
    probe: HumanCheckpointPostconditionProbe,
  ): Promise<HumanCheckpointControllerResult> {
    return this.inner.verify(run, checkpointId, currentDevice, probe);
  }

  async consumeResume(
    run: ValidationRunIdentity,
    checkpointId: string,
    currentDevice: ValidationDeviceIdentity,
    resumeCommit: HumanCheckpointResumeCommitPort,
  ): Promise<HumanCheckpointControllerResult> {
    const current = await this.inner.current();
    const candidate = (
      current.status === "resumable"
      && sameRun(current.state.checkpoint.run, run)
      && String(current.state.checkpoint.checkpointId) === checkpointId
      && current.state.checkpoint.deviceId === currentDevice.deviceId
      && current.state.devicePlatform === currentDevice.platform
      && current.state.acknowledgedAt
      && current.state.verifiedAt
      && (
        current.state.checkpoint.requestedAction === "disable-mobile-connectivity"
        || current.state.checkpoint.requestedAction === "restore-mobile-connectivity"
      )
    )
      ? Object.freeze({
          run: Object.freeze({ ...current.state.checkpoint.run }),
          checkpointId: current.state.checkpoint.checkpointId,
          action: current.state.checkpoint.requestedAction,
          device: Object.freeze({
            deviceId: currentDevice.deviceId,
            platform: currentDevice.platform,
          }),
          acknowledgedAt: current.state.acknowledgedAt,
          verifiedAt: current.state.verifiedAt,
          resumeStepId: current.state.resumeStepId,
        })
      : undefined;

    const consumed = await this.inner.consumeResume(run, checkpointId, currentDevice, resumeCommit);
    if (
      candidate
      && consumed.status === "resumed"
      && consumed.checkpointId === candidate.checkpointId
      && consumed.resumeStepId === candidate.resumeStepId
    ) {
      const duplicate = this.observations.some(
        observation =>
          sameRun(observation.run, candidate.run)
          && observation.checkpointId === candidate.checkpointId
          && observation.acknowledgedAt === candidate.acknowledgedAt
          && observation.verifiedAt === candidate.verifiedAt,
      );
      if (!duplicate) {
        this.observations.push(Object.freeze({
          run: candidate.run,
          checkpointId: candidate.checkpointId,
          action: candidate.action,
          device: candidate.device,
          acknowledgedAt: candidate.acknowledgedAt,
          verifiedAt: candidate.verifiedAt,
        }));
      }
    }
    return consumed;
  }

  records(run: ValidationRunIdentity): readonly D05ConnectivityCheckpointEvidence[] {
    return Object.freeze(this.observations
      .filter(record => sameRun(record.run, run))
      .map(record => Object.freeze({
        ...record,
        run: Object.freeze({ ...record.run }),
        device: Object.freeze({ ...record.device }),
      })));
  }
}

export interface D05EvidenceRecorderPort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly mobileFixture: ValidationFixtureDescriptor;
    readonly windowsFixture: ValidationFixtureDescriptor;
    readonly baselineVerification: ValidationStateConvergenceReport;
    readonly finalVerification: ValidationStateConvergenceReport;
    readonly connectivityCheckpoints: readonly D05ConnectivityCheckpointEvidence[];
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D05ScenarioPackageOptions {
  readonly mobilePath: VaultPath;
  readonly windowsPath: VaultPath;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly windowsFixtures: D05FixtureManagerPort;
  readonly mobileFixtures: D05FixtureManagerPort;
  readonly verifier: D05VerifierPort;
  readonly handoffs: D05CrossDeviceHandoffPort;
  readonly checkpoints: D05ConnectivityCheckpointController;
  readonly currentProductSurface: () => ProductSurfaceState;
  readonly evidence: D05EvidenceRecorderPort;
}

export interface D05ScenarioPackage {
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
  readonly humanCheckpoints: ValidationRunnerHumanCheckpointResumePort;
}

interface D05Context {
  mobileFixture?: ValidationFixtureDescriptor;
  windowsFixture?: ValidationFixtureDescriptor;
  baselineVerification?: ValidationStateConvergenceReport;
  finalVerification?: ValidationStateConvergenceReport;
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

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
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

function planExpectation(
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
  kind: "upload-create" | "upload-update" | "download-create" | "download-update",
  path: VaultPath,
): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind,
    path,
    targetSide: kind.startsWith("upload-") ? "remote" : "local",
    destructive: false,
  });
}

function productionCycle(
  prefix: string,
  cycleId: string,
  expectation: Omit<ValidationPlanExpectation, "run">,
) {
  return [
    Object.freeze({
      stepId: validationStepId(`${prefix}-preview`),
      module: "production-path-driver" as const,
      operation: "preview-manual",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: cycleId }),
    }),
    Object.freeze({
      stepId: validationStepId(`${prefix}-assert`),
      module: "plan-assertion-engine" as const,
      operation: "assert-observed-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({
        authorityCycleId: cycleId,
        assertionId: `${prefix}:exact-plan`,
        expectation,
      }),
    }),
    Object.freeze({
      stepId: validationStepId(`${prefix}-execute`),
      module: "production-path-driver" as const,
      operation: "execute-asserted-plan",
      requiredCompletionProof: "operation-complete" as const,
      input: Object.freeze({ authorityCycleId: cycleId }),
    }),
  ] as const;
}

function moduleStep(
  stepId: string,
  module:
    | "fixture-manager"
    | "cross-device-coordinator"
    | "human-checkpoint-resume-controller"
    | "state-convergence-verifier"
    | "scenario-evidence-recorder",
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

export function createD05ScenarioDefinition(input: {
  readonly mobilePath: VaultPath;
  readonly windowsPath: VaultPath;
}): ValidationRunnerScenarioDefinition {
  if (input.mobilePath === input.windowsPath) {
    throw new Error("D05 requires distinct mobile and Windows fixture paths.");
  }

  const establishWindows = productionCycle(
    "d05-establish-windows",
    D05_AUTHORITY_CYCLES.establishWindows,
    planExpectation([expectedOperation("upload-create", input.windowsPath)]),
  );
  const establishMobile = productionCycle(
    "d05-establish-mobile",
    D05_AUTHORITY_CYCLES.establishMobile,
    planExpectation([
      expectedOperation("upload-create", input.mobilePath),
      expectedOperation("download-create", input.windowsPath),
    ]),
  );
  const establishWindowsRemote = productionCycle(
    "d05-establish-windows-remote",
    D05_AUTHORITY_CYCLES.establishWindowsRemote,
    planExpectation([expectedOperation("download-create", input.mobilePath)]),
  );
  const windowsOnlineUpdate = productionCycle(
    "d05-windows-online-update",
    D05_AUTHORITY_CYCLES.windowsOnlineUpdate,
    planExpectation([expectedOperation("upload-update", input.windowsPath)]),
  );
  const mobileReconnect = productionCycle(
    "d05-mobile-reconnect",
    D05_AUTHORITY_CYCLES.mobileReconnect,
    planExpectation([
      expectedOperation("upload-update", input.mobilePath),
      expectedOperation("download-update", input.windowsPath),
    ]),
  );
  const windowsFinalReconcile = productionCycle(
    "d05-windows-final-reconcile",
    D05_AUTHORITY_CYCLES.windowsFinalReconcile,
    planExpectation([expectedOperation("download-update", input.mobilePath)]),
  );

  return Object.freeze({
    scenarioId: D05_SCENARIO_ID,
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      moduleStep("d05-establish-fixtures", "fixture-manager", D05_OPERATIONS.establishFixtures, "operation-complete"),
      ...establishWindows,
      moduleStep("d05-handoff-baseline-to-mobile", "cross-device-coordinator", D05_OPERATIONS.handoffBaselineToMobile, "operation-complete"),
      ...establishMobile,
      moduleStep("d05-handoff-baseline-to-windows", "cross-device-coordinator", D05_OPERATIONS.handoffBaselineToWindows, "operation-complete"),
      ...establishWindowsRemote,
      moduleStep("d05-verify-trusted-baseline", "state-convergence-verifier", D05_OPERATIONS.verifyTrustedBaseline, "verification-passed"),

      moduleStep("d05-offline-checkpoint", "human-checkpoint-resume-controller", D05_OPERATIONS.pauseForOffline, "operation-complete"),
      moduleStep("d05-edit-mobile-offline", "fixture-manager", D05_OPERATIONS.editMobileOffline, "operation-complete"),
      moduleStep("d05-edit-windows-online", "fixture-manager", D05_OPERATIONS.editWindowsOnline, "operation-complete"),
      ...windowsOnlineUpdate,

      moduleStep("d05-reconnect-checkpoint", "human-checkpoint-resume-controller", D05_OPERATIONS.pauseForReconnect, "operation-complete"),
      ...mobileReconnect,
      moduleStep("d05-handoff-reconnected-to-windows", "cross-device-coordinator", D05_OPERATIONS.handoffReconnectedToWindows, "operation-complete"),
      ...windowsFinalReconcile,

      moduleStep("d05-verify-final-convergence", "state-convergence-verifier", D05_OPERATIONS.verifyFinalConvergence, "verification-passed"),
      moduleStep("d05-record-evidence", "scenario-evidence-recorder", D05_OPERATIONS.recordEvidence, "evidence-recorded"),
    ]),
  });
}

function requireFixture(
  descriptor: ValidationFixtureDescriptor | undefined,
  label: string,
): ValidationFixtureDescriptor {
  if (!descriptor?.hash) throw new Error(`D05 ${label} fixture with exact hash is unavailable.`);
  return descriptor;
}

function assertFixture(
  run: ValidationRunIdentity,
  descriptor: ValidationFixtureDescriptor,
  expectedFixtureId: string,
  expectedRelativePath: string,
  expectedPath: VaultPath,
): void {
  if (!sameRun(descriptor.identity.run, run)) {
    throw new Error("D05 fixture belongs to a different validation run.");
  }
  if (
    String(descriptor.identity.fixtureId) !== expectedFixtureId
    || descriptor.relativePath !== expectedRelativePath
    || descriptor.path !== expectedPath
    || descriptor.kind !== "text"
    || descriptor.purpose !== "ordinary"
    || !descriptor.hash
  ) {
    throw new Error("D05 fixture identity/path/content contract is invalid.");
  }
}

function contentOf(descriptor: ValidationFixtureDescriptor) {
  if (!descriptor.hash) throw new Error("D05 fixture hash is unavailable.");
  return Object.freeze({ hash: descriptor.hash, sizeBytes: descriptor.sizeBytes });
}

function baselineVerificationRequest(
  run: ValidationRunIdentity,
  options: D05ScenarioPackageOptions,
  mobile: ValidationFixtureDescriptor,
  windows: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  const mobileContent = contentOf(mobile);
  const windowsContent = contentOf(windows);
  return {
    run,
    state: [
      {
        kind: "local-content",
        assertion: stateAssertion("d05.baseline.mobile.mobile", "local-content", String(options.mobilePath), "Mobile has the trusted mobile fixture baseline."),
        deviceId: options.mobileDevice.deviceId,
        path: options.mobilePath,
        content: mobileContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d05.baseline.windows.mobile", "local-content", String(options.mobilePath), "Windows has the same mobile fixture baseline."),
        deviceId: options.windowsDevice.deviceId,
        path: options.mobilePath,
        content: mobileContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("d05.baseline.remote.mobile", "remote-content", String(options.mobilePath), "Remote has exactly one mobile fixture baseline."),
        path: options.mobilePath,
        content: mobileContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d05.baseline.windows.windows", "local-content", String(options.windowsPath), "Windows has the trusted Windows fixture baseline."),
        deviceId: options.windowsDevice.deviceId,
        path: options.windowsPath,
        content: windowsContent,
      },
      {
        kind: "local-content",
        assertion: stateAssertion("d05.baseline.mobile.windows", "local-content", String(options.windowsPath), "Mobile has the same Windows fixture baseline."),
        deviceId: options.mobileDevice.deviceId,
        path: options.windowsPath,
        content: windowsContent,
      },
      {
        kind: "remote-content",
        assertion: stateAssertion("d05.baseline.remote.windows", "remote-content", String(options.windowsPath), "Remote has exactly one Windows fixture baseline."),
        path: options.windowsPath,
        content: windowsContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d05.baseline.mobile.base.mobile", "base-authority", String(options.mobilePath), "Mobile BASE records the trusted mobile baseline."),
        deviceId: options.mobileDevice.deviceId,
        path: options.mobilePath,
        expectedContent: mobileContent,
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("d05.baseline.windows.base.windows", "base-authority", String(options.windowsPath), "Windows BASE records the trusted Windows baseline."),
        deviceId: options.windowsDevice.deviceId,
        path: options.windowsPath,
        expectedContent: windowsContent,
      },
    ],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("d05.baseline.mobile.convergence", "cross-device-content", String(options.mobilePath), "Both devices share the mobile fixture baseline."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: options.mobilePath,
        content: mobileContent,
      },
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("d05.baseline.windows.convergence", "cross-device-content", String(options.windowsPath), "Both devices share the Windows fixture baseline."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: options.windowsPath,
        content: windowsContent,
      },
    ],
  };
}

function finalVerificationRequest(
  run: ValidationRunIdentity,
  options: D05ScenarioPackageOptions,
  mobile: ValidationFixtureDescriptor,
  windows: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  const mobileContent = contentOf(mobile);
  const windowsContent = contentOf(windows);
  const state: ValidationStatePostcondition[] = [
    {
      kind: "local-content" as const,
      assertion: stateAssertion("d05.final.mobile.mobile", "local-content", String(options.mobilePath), "Mobile offline edit survives reconnect."),
      deviceId: options.mobileDevice.deviceId,
      path: options.mobilePath,
      content: mobileContent,
    },
    {
      kind: "local-content" as const,
      assertion: stateAssertion("d05.final.windows.mobile", "local-content", String(options.mobilePath), "Windows receives the mobile offline edit."),
      deviceId: options.windowsDevice.deviceId,
      path: options.mobilePath,
      content: mobileContent,
    },
    {
      kind: "remote-content" as const,
      assertion: stateAssertion("d05.final.remote.mobile", "remote-content", String(options.mobilePath), "Remote preserves the mobile offline edit exactly once."),
      path: options.mobilePath,
      content: mobileContent,
    },
    {
      kind: "local-content" as const,
      assertion: stateAssertion("d05.final.windows.windows", "local-content", String(options.windowsPath), "Windows online edit survives mobile reconnect."),
      deviceId: options.windowsDevice.deviceId,
      path: options.windowsPath,
      content: windowsContent,
    },
    {
      kind: "local-content" as const,
      assertion: stateAssertion("d05.final.mobile.windows", "local-content", String(options.windowsPath), "Mobile receives the independent Windows edit."),
      deviceId: options.mobileDevice.deviceId,
      path: options.windowsPath,
      content: windowsContent,
    },
    {
      kind: "remote-content" as const,
      assertion: stateAssertion("d05.final.remote.windows", "remote-content", String(options.windowsPath), "Remote preserves the Windows edit exactly once."),
      path: options.windowsPath,
      content: windowsContent,
    },
  ];

  for (const [label, device] of [
    ["windows", options.windowsDevice],
    ["mobile", options.mobileDevice],
  ] as const) {
    state.push(
      {
        kind: "base-authority",
        assertion: stateAssertion(`d05.final.${label}.base.mobile`, "base-authority", String(options.mobilePath), "Trusted BASE converges to the mobile offline edit."),
        deviceId: device.deviceId,
        path: options.mobilePath,
        expectedContent: mobileContent,
      } as const,
      {
        kind: "base-authority",
        assertion: stateAssertion(`d05.final.${label}.base.windows`, "base-authority", String(options.windowsPath), "Trusted BASE converges to the independent Windows edit."),
        deviceId: device.deviceId,
        path: options.windowsPath,
        expectedContent: windowsContent,
      } as const,
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(`d05.final.${label}.mapping.mobile`, "mapping-or-tombstone", String(options.mobilePath), "Mobile fixture has one live mapping and no tombstone."),
        deviceId: device.deviceId,
        path: options.mobilePath,
        expected: "mapping",
        entityKind: "file",
      } as const,
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion(`d05.final.${label}.mapping.windows`, "mapping-or-tombstone", String(options.windowsPath), "Windows fixture has one live mapping and no tombstone."),
        deviceId: device.deviceId,
        path: options.windowsPath,
        expected: "mapping",
        entityKind: "file",
      } as const,
      {
        kind: "durable-intent-or-effect",
        assertion: stateAssertion(`d05.final.${label}.effects`, "durable-intent-or-effect", D05_SCENARIO_ID, "No durable synchronization effect remains outstanding."),
        deviceId: device.deviceId,
        expected: "none-outstanding",
      } as const,
    );
  }

  return {
    run,
    state: state as unknown as ValidationStateConvergenceRequest["state"],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("d05.final.mobile.content", "cross-device-content", String(options.mobilePath), "Both devices converge on the mobile offline edit."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: options.mobilePath,
        content: mobileContent,
      },
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("d05.final.windows.content", "cross-device-content", String(options.windowsPath), "Both devices converge on the independent Windows edit."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: options.windowsPath,
        content: windowsContent,
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion("d05.final.mobile.authority", "cross-device-authority", String(options.mobilePath), "Neither side is globally authoritative; both converge on live shared authority for the mobile path."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: options.mobilePath,
        expectedTombstone: false,
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion("d05.final.windows.authority", "cross-device-authority", String(options.windowsPath), "Neither side is globally authoritative; both converge on live shared authority for the Windows path."),
        deviceIds: [options.windowsDevice.deviceId, options.mobileDevice.deviceId],
        path: options.windowsPath,
        expectedTombstone: false,
      },
    ],
  };
}

function expectedCheckpoint(
  result: HumanCheckpointControllerResult,
  input: {
    readonly run: ValidationRunIdentity;
    readonly checkpointId: string;
    readonly action: Extract<HumanCheckpointAction, "disable-mobile-connectivity" | "restore-mobile-connectivity">;
    readonly mobileDevice: ValidationDeviceIdentity;
    readonly resumeStepId: string;
  },
) {
  if (result.status !== "paused" || result.reason !== "human-action-required" || !result.state) {
    return blocked(`D05 checkpoint ${input.checkpointId} did not enter the required human-action pause.`);
  }
  const state = result.state;
  if (
    !sameRun(state.checkpoint.run, input.run)
    || String(state.checkpoint.checkpointId) !== input.checkpointId
    || state.checkpoint.requestedAction !== input.action
    || state.checkpoint.deviceId !== input.mobileDevice.deviceId
    || state.devicePlatform !== input.mobileDevice.platform
    || String(state.resumeStepId) !== input.resumeStepId
  ) {
    return blocked(`D05 checkpoint ${input.checkpointId} identity/action/resume binding is invalid.`);
  }
  return {
    status: "paused-human-action" as const,
    checkpoint: state.checkpoint,
    evidenceRefs: Object.freeze([] as ValidationEvidenceRef[]),
  };
}

export function createD05OfflineReconnectScenario(
  options: D05ScenarioPackageOptions,
): D05ScenarioPackage {
  if (options.windowsDevice.platform !== "windows-desktop") {
    throw new Error("D05 controller device must be Windows desktop.");
  }
  if (options.mobileDevice.platform !== "iphone" && options.mobileDevice.platform !== "ipad") {
    throw new Error("D05 mobile participant must be iPhone or iPad.");
  }
  if (options.windowsDevice.deviceId === options.mobileDevice.deviceId) {
    throw new Error("D05 participants must have distinct device identities.");
  }
  if (options.mobilePath === options.windowsPath) {
    throw new Error("D05 requires distinct mobile and Windows fixture paths.");
  }

  const context: D05Context = {};

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        if (request.operation === D05_OPERATIONS.establishFixtures) {
          const [mobile, windows] = await Promise.all([
            options.mobileFixtures.create(
              validationTextFixture(D05_MOBILE_FIXTURE_ID, D05_MOBILE_RELATIVE_PATH, 1, "base", "ordinary"),
            ),
            options.windowsFixtures.create(
              validationTextFixture(D05_WINDOWS_FIXTURE_ID, D05_WINDOWS_RELATIVE_PATH, 1, "base", "ordinary"),
            ),
          ]);
          assertFixture(request.run, mobile, D05_MOBILE_FIXTURE_ID, D05_MOBILE_RELATIVE_PATH, options.mobilePath);
          assertFixture(request.run, windows, D05_WINDOWS_FIXTURE_ID, D05_WINDOWS_RELATIVE_PATH, options.windowsPath);
          const [mobileHash, windowsHash] = await Promise.all([
            options.mobileFixtures.hash(D05_MOBILE_FIXTURE_ID),
            options.windowsFixtures.hash(D05_WINDOWS_FIXTURE_ID),
          ]);
          if (mobileHash !== mobile.hash || windowsHash !== windows.hash) {
            return failed("D05 independent fixture setup failed deterministic hash verification.");
          }
          context.mobileFixture = mobile;
          context.windowsFixture = windows;
          return completed();
        }

        if (request.operation === D05_OPERATIONS.editMobileOffline) {
          const prior = requireFixture(context.mobileFixture, "mobile");
          if (options.checkpoints.records(request.run).some(record => record.action === "restore-mobile-connectivity")) {
            return blocked("D05 mobile offline edit cannot occur after reconnect acknowledgement.");
          }
          const offlineRecord = options.checkpoints.records(request.run).find(record => record.action === "disable-mobile-connectivity");
          if (!offlineRecord) {
            return blocked("D05 mobile offline edit requires a verified genuine-offline checkpoint.");
          }
          const edited = await options.mobileFixtures.edit(
            D05_MOBILE_FIXTURE_ID,
            prior.version + 1,
            "non-overlap-a",
          );
          assertFixture(request.run, edited, D05_MOBILE_FIXTURE_ID, D05_MOBILE_RELATIVE_PATH, options.mobilePath);
          if (edited.identity.fixtureId !== prior.identity.fixtureId || edited.version <= prior.version || edited.hash === prior.hash) {
            return failed("D05 mobile offline edit did not preserve identity and produce new bytes.");
          }
          if (await options.mobileFixtures.hash(D05_MOBILE_FIXTURE_ID) !== edited.hash) {
            return failed("D05 mobile offline edit failed exact local hash verification.");
          }
          context.mobileFixture = edited;
          return completed();
        }

        if (request.operation === D05_OPERATIONS.editWindowsOnline) {
          const prior = requireFixture(context.windowsFixture, "Windows");
          const offlineRecord = options.checkpoints.records(request.run).find(record => record.action === "disable-mobile-connectivity");
          const reconnectRecord = options.checkpoints.records(request.run).find(record => record.action === "restore-mobile-connectivity");
          if (!offlineRecord || reconnectRecord) {
            return blocked("D05 Windows edit must occur while the verified mobile participant remains offline.");
          }
          const edited = await options.windowsFixtures.edit(
            D05_WINDOWS_FIXTURE_ID,
            prior.version + 1,
            "non-overlap-b",
          );
          assertFixture(request.run, edited, D05_WINDOWS_FIXTURE_ID, D05_WINDOWS_RELATIVE_PATH, options.windowsPath);
          if (edited.identity.fixtureId !== prior.identity.fixtureId || edited.version <= prior.version || edited.hash === prior.hash) {
            return failed("D05 Windows online edit did not preserve identity and produce new bytes.");
          }
          if (await options.windowsFixtures.hash(D05_WINDOWS_FIXTURE_ID) !== edited.hash) {
            return failed("D05 Windows online edit failed exact local hash verification.");
          }
          context.windowsFixture = edited;
          return completed();
        }

        return blocked(`Unsupported D05 fixture operation: ${request.operation}`);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D05 fixture operation failed.");
      }
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      let phase: D05HandoffPhase | undefined;
      let from: "windows" | "mobile" | undefined;
      let to: "windows" | "mobile" | undefined;
      if (request.operation === D05_OPERATIONS.handoffBaselineToMobile) {
        phase = "baseline-to-mobile"; from = "windows"; to = "mobile";
      } else if (request.operation === D05_OPERATIONS.handoffBaselineToWindows) {
        phase = "baseline-to-windows"; from = "mobile"; to = "windows";
      } else if (request.operation === D05_OPERATIONS.handoffReconnectedToWindows) {
        phase = "reconnected-mobile-to-windows"; from = "mobile"; to = "windows";
      }
      if (!phase || !from || !to) return blocked(`Unsupported D05 handoff operation: ${request.operation}`);
      try {
        return completed(await options.handoffs.handoff({
          run: request.run,
          stepId: request.stepId,
          phase,
          from,
          to,
        }));
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "D05 cross-device handoff failed.");
      }
    },
  };

  const checkpointDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const checkpoint = request.operation === D05_OPERATIONS.pauseForOffline
        ? {
            checkpointId: D05_OFFLINE_CHECKPOINT_ID,
            action: "disable-mobile-connectivity" as const,
            resumeStepId: "d05-edit-mobile-offline",
          }
        : request.operation === D05_OPERATIONS.pauseForReconnect
          ? {
              checkpointId: D05_RECONNECT_CHECKPOINT_ID,
              action: "restore-mobile-connectivity" as const,
              resumeStepId: "d05-mobile-reconnect-preview",
            }
          : undefined;
      if (!checkpoint) return blocked(`Unsupported D05 human checkpoint operation: ${request.operation}`);
      try {
        const result = await options.checkpoints.begin({
          run: request.run,
          checkpointId: checkpoint.checkpointId,
          device: options.mobileDevice,
          action: checkpoint.action,
          resumeStepId: checkpoint.resumeStepId,
        });
        return expectedCheckpoint(result, {
          run: request.run,
          checkpointId: checkpoint.checkpointId,
          action: checkpoint.action,
          mobileDevice: options.mobileDevice,
          resumeStepId: checkpoint.resumeStepId,
        });
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "D05 human checkpoint creation failed.");
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const mobile = requireFixture(context.mobileFixture, "mobile");
        const windows = requireFixture(context.windowsFixture, "Windows");
        const verification = request.operation === D05_OPERATIONS.verifyTrustedBaseline
          ? baselineVerificationRequest(request.run, options, mobile, windows)
          : request.operation === D05_OPERATIONS.verifyFinalConvergence
            ? finalVerificationRequest(request.run, options, mobile, windows)
            : undefined;
        if (!verification) return blocked(`Unsupported D05 verifier operation: ${request.operation}`);

        if (
          request.operation === D05_OPERATIONS.verifyFinalConvergence
          && (
            options.checkpoints.records(request.run).length !== 2
            || options.checkpoints.records(request.run)[0]?.action !== "disable-mobile-connectivity"
            || options.checkpoints.records(request.run)[1]?.action !== "restore-mobile-connectivity"
          )
        ) {
          return blocked("D05 final verification requires both ordered, verified connectivity checkpoints.");
        }

        if (request.operation === D05_OPERATIONS.verifyFinalConvergence) {
          const retainedConflicts = options.currentProductSurface().conflicts.filter(
            conflict =>
              "path" in conflict
              && (conflict.path === options.mobilePath || conflict.path === options.windowsPath),
          );
          if (retainedConflicts.length > 0) {
            return failed("D05 final production surface retains a conflict for a D05 fixture path.");
          }
        }

        const report = await options.verifier.verify(verification);
        if (request.operation === D05_OPERATIONS.verifyTrustedBaseline) context.baselineVerification = report;
        else context.finalVerification = report;
        const refs = report.evidence.map(item => item.ref);
        if (report.result.verdict === "pass") return completed(refs);
        const summary = `D05 verification ${report.result.verdict} for ${request.operation}.`;
        return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D05 verification failed.");
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== D05_OPERATIONS.recordEvidence) {
        return blocked(`Unsupported D05 evidence operation: ${request.operation}`);
      }
      try {
        const mobileFixture = requireFixture(context.mobileFixture, "mobile");
        const windowsFixture = requireFixture(context.windowsFixture, "Windows");
        if (!context.baselineVerification || !context.finalVerification) {
          return blocked("D05 evidence requires both baseline and final verification reports.");
        }
        const connectivityCheckpoints = options.checkpoints.records(request.run);
        if (
          connectivityCheckpoints.length !== 2
          || connectivityCheckpoints.some(record => record.device.deviceId !== options.mobileDevice.deviceId)
        ) {
          return blocked("D05 evidence requires both connectivity acknowledgements bound to the actual mobile device identity.");
        }
        const refs = await options.evidence.record({
          run: request.run,
          mobileFixture,
          windowsFixture,
          baselineVerification: context.baselineVerification,
          finalVerification: context.finalVerification,
          connectivityCheckpoints,
        });
        if (refs.length === 0) return blocked("D05 evidence recorder returned no durable evidence reference.");
        return completed(refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "D05 evidence recording failed.");
      }
    },
  };

  const prerequisites: ValidationRunnerPrerequisiteDelegate = {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "D05 establishes its independent trusted disposable fixtures internally and accepts no external scenario prerequisite.",
        evidenceRefs: [],
      }));
    },
  };

  return Object.freeze({
    definition: createD05ScenarioDefinition({
      mobilePath: options.mobilePath,
      windowsPath: options.windowsPath,
    }),
    prerequisites,
    humanCheckpoints: options.checkpoints,
    moduleOverrides: Object.freeze({
      "fixture-manager": fixtureDelegate,
      "cross-device-coordinator": handoffDelegate,
      "human-checkpoint-resume-controller": checkpointDelegate,
      "state-convergence-verifier": verifierDelegate,
      "scenario-evidence-recorder": evidenceDelegate,
    }),
  });
}
