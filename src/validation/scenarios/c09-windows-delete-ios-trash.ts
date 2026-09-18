import type {
  ContentHash,
  RemoteObjectId,
  SynchronizationPlan,
  VaultPath,
} from "../../contracts";
import {
  validationAssertionId,
  validationEvidenceRef,
  validationPlanExpectation,
  type ValidationPlanAssertionResult,
  type ValidationPlanExecutionAuthorization,
  type ValidationPlanExpectation,
} from "../driver-plan-fault-verifier-contracts";
import {
  validationDeletionFixture,
  validationTextFixture,
  type ValidationFixtureDescriptor,
  type ValidationFixtureManager,
} from "../fixture-manager";
import { assertValidationPlan } from "../plan-assertion-engine";
import type { ValidationProductionPathDriver } from "../production-path-driver";
import {
  recordValidationScenarioEvidence,
  type ValidationBuildEvidence,
  type ValidationScenarioEvidenceRecord,
} from "../scenario-evidence-recorder";
import {
  VALIDATION_RUNNER_MODULE_IDS,
  type ValidationRunnerScenarioDefinition,
} from "../scenario-runner-contracts";
import {
  type ValidationRunnerApprovedModuleDelegate,
  type ValidationRunnerApprovedModuleDelegates,
  type ValidationRunnerPrerequisiteDelegate,
} from "../scenario-runner-module-adapter";
import {
  validationStepId,
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "../run-sandbox-checkpoint-contracts";
import type {
  StateConvergenceVerifier,
  ValidationAuthorityReadSource,
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../state-convergence-verifier";

export const C09_TARGET_RELATIVE_PATH = "c09/windows-delete-mobile-trash.md" as const;
export const C09_SENTINEL_RELATIVE_PATH = "c09/unrelated-sentinel.md" as const;

const C09_TARGET_FIXTURE_ID = "c09-delete-target";
const C09_SENTINEL_FIXTURE_ID = "c09-unrelated-sentinel";

export const C09_STEP_IDS = Object.freeze({
  establishFixtures: validationStepId("c09-establish-trusted-fixtures-windows"),
  previewWindowsEstablish: validationStepId("c09-preview-windows-establish"),
  assertWindowsEstablish: validationStepId("c09-assert-windows-establish"),
  executeWindowsEstablish: validationStepId("c09-execute-windows-establish"),
  handoffEstablishToMobile: validationStepId("c09-handoff-establish-to-mobile"),
  previewMobileEstablish: validationStepId("c09-preview-mobile-establish"),
  assertMobileEstablish: validationStepId("c09-assert-mobile-establish"),
  executeMobileEstablish: validationStepId("c09-execute-mobile-establish"),
  verifyTrustedFixture: validationStepId("c09-verify-trusted-fixture"),
  handoffDeleteToWindows: validationStepId("c09-handoff-delete-to-windows"),
  deleteWindowsFixture: validationStepId("c09-delete-windows-fixture"),
  previewWindowsDelete: validationStepId("c09-preview-windows-delete"),
  assertWindowsDelete: validationStepId("c09-assert-windows-delete"),
  executeWindowsDelete: validationStepId("c09-execute-windows-delete"),
  handoffDeleteToMobile: validationStepId("c09-handoff-delete-to-mobile"),
  previewMobileDelete: validationStepId("c09-preview-mobile-delete"),
  assertMobileDelete: validationStepId("c09-assert-mobile-delete"),
  executeMobileDelete: validationStepId("c09-execute-mobile-delete"),
  verifyFinalConvergence: validationStepId("c09-verify-final-convergence"),
  recordEvidence: validationStepId("c09-record-evidence"),
} as const);

export type C09HandoffPhase =
  | "establish-to-mobile"
  | "delete-to-windows"
  | "delete-to-mobile";

export interface C09CrossDeviceHandoffPort {
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationStepId;
    readonly phase: C09HandoffPhase;
    readonly from: "windows" | "mobile";
    readonly to: "windows" | "mobile";
  }): Promise<readonly ReturnType<typeof validationEvidenceRef>[]>;
}

type FixturePort = Pick<ValidationFixtureManager, "create" | "delete">;
type ProductionDriverPort = Pick<ValidationProductionPathDriver, "dispatch">;
type VerifierPort = Pick<StateConvergenceVerifier, "verify">;

export interface C09ScenarioDependencies {
  readonly windowsFixtures: FixturePort;
  readonly windowsProduction: ProductionDriverPort;
  readonly mobileProduction: ProductionDriverPort;
  readonly windowsAuthority: ValidationAuthorityReadSource;
  readonly verifier: VerifierPort;
  readonly handoffs: C09CrossDeviceHandoffPort;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly build: ValidationBuildEvidence;
  readonly capturedAt: () => string;
}

export interface C09ScenarioPackage {
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly modules: ValidationRunnerApprovedModuleDelegates;
  evidenceRecord(): ValidationScenarioEvidenceRecord | undefined;
}

interface C09Context {
  target?: ValidationFixtureDescriptor;
  sentinel?: ValidationFixtureDescriptor;
  targetRemoteObjectId?: RemoteObjectId;
  sentinelRemoteObjectId?: RemoteObjectId;
  windowsEstablishPlan?: SynchronizationPlan;
  windowsEstablishAuthorization?: ValidationPlanExecutionAuthorization;
  mobileEstablishPlan?: SynchronizationPlan;
  mobileEstablishAuthorization?: ValidationPlanExecutionAuthorization;
  windowsDeletePlan?: SynchronizationPlan;
  windowsDeleteExpectation?: ValidationPlanExpectation;
  windowsDeleteAuthorization?: ValidationPlanExecutionAuthorization;
  mobileDeletePlan?: SynchronizationPlan;
  mobileDeleteExpectation?: ValidationPlanExpectation;
  mobileDeleteAuthorization?: ValidationPlanExecutionAuthorization;
  trustedReport?: ValidationStateConvergenceReport;
  finalReport?: ValidationStateConvergenceReport;
  evidence?: ValidationScenarioEvidenceRecord;
}

function completed(evidenceRefs: readonly ReturnType<typeof validationEvidenceRef>[] = []) {
  return { status: "completed" as const, evidenceRefs };
}

function failed(summary: string, evidenceRefs: readonly ReturnType<typeof validationEvidenceRef>[] = []) {
  return { status: "failed" as const, summary, evidenceRefs };
}

function blocked(summary: string, evidenceRefs: readonly ReturnType<typeof validationEvidenceRef>[] = []) {
  return { status: "blocked" as const, summary, evidenceRefs };
}

function assertionSummary(result: ValidationPlanAssertionResult): string {
  if (result.status === "matched") return "matched";
  return result.failures.map(failure => failure.summary).join(" | ");
}

function requiredDescriptor(
  value: ValidationFixtureDescriptor | undefined,
  label: string,
): ValidationFixtureDescriptor {
  if (!value) throw new Error(label + " fixture has not been established.");
  return value;
}

function requiredRemoteObjectId(
  value: RemoteObjectId | undefined,
  label: string,
): RemoteObjectId {
  if (!value) throw new Error(label + " remote object identity has not been established.");
  return value;
}

function requiredHash(descriptor: ValidationFixtureDescriptor, label: string): ContentHash {
  if (!descriptor.contentHash) throw new Error(label + " fixture does not carry content hash evidence.");
  return descriptor.contentHash;
}

function expectedOperation(input: {
  readonly kind: "upload-create" | "download-create" | "trash-remote" | "trash-local";
  readonly path: VaultPath;
  readonly targetSide: "local" | "remote";
  readonly destructive: boolean;
  readonly remoteObjectId?: RemoteObjectId;
}) {
  return {
    kind: input.kind,
    path: input.path,
    targetSide: input.targetSide,
    destructive: input.destructive,
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
  };
}

function establishmentExpectation(
  run: ValidationRunIdentity,
  direction: "windows-upload" | "mobile-download",
  target: ValidationFixtureDescriptor,
  sentinel: ValidationFixtureDescriptor,
  ids?: { readonly target: RemoteObjectId; readonly sentinel: RemoteObjectId },
): ValidationPlanExpectation {
  const upload = direction === "windows-upload";
  return validationPlanExpectation({
    run,
    expectedTrigger: "manual",
    expectedOperations: [
      expectedOperation({
        kind: upload ? "upload-create" : "download-create",
        path: target.path,
        targetSide: upload ? "remote" : "local",
        destructive: false,
        ...(upload ? {} : { remoteObjectId: ids!.target }),
      }),
      expectedOperation({
        kind: upload ? "upload-create" : "download-create",
        path: sentinel.path,
        targetSide: upload ? "remote" : "local",
        destructive: false,
        ...(upload ? {} : { remoteObjectId: ids!.sentinel }),
      }),
    ],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: [
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

export function c09WindowsDeleteExpectation(input: {
  readonly run: ValidationRunIdentity;
  readonly path: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
}): ValidationPlanExpectation {
  return validationPlanExpectation({
    run: input.run,
    expectedTrigger: "manual",
    expectedOperations: [
      expectedOperation({
        kind: "trash-remote",
        path: input.path,
        targetSide: "remote",
        destructive: true,
        remoteObjectId: input.remoteObjectId,
      }),
    ],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: [
      "unresolved-conflict",
      "trash-local",
      "blocked-unsafe",
      "recovery-required",
    ],
    conflictExpectation: "forbidden",
    destructiveExpectation: "allowed-exactly-as-expected",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
}

export function c09MobileRecoverableDeleteExpectation(input: {
  readonly run: ValidationRunIdentity;
  readonly path: VaultPath;
}): ValidationPlanExpectation {
  return validationPlanExpectation({
    run: input.run,
    expectedTrigger: "manual",
    expectedOperations: [
      expectedOperation({
        kind: "trash-local",
        path: input.path,
        targetSide: "local",
        destructive: true,
      }),
    ],
    allowedBackgroundKinds: ["noop"],
    forbiddenKinds: [
      "unresolved-conflict",
      "trash-remote",
      "blocked-unsafe",
      "recovery-required",
    ],
    conflictExpectation: "forbidden",
    destructiveExpectation: "allowed-exactly-as-expected",
    expectedExecutionDisposition: "safe-auto-eligible",
    expectedGlobalExecutionGate: "none",
  });
}

async function resolveTrustedRemoteObjectIds(
  authority: ValidationAuthorityReadSource,
  targetPath: VaultPath,
  sentinelPath: VaultPath,
): Promise<{ readonly target: RemoteObjectId; readonly sentinel: RemoteObjectId }> {
  const loaded = await authority.loadAuthority();
  if (loaded.status !== "trusted") {
    throw new Error("C09 trusted fixture authority is unavailable: " + loaded.status + ".");
  }

  const resolve = (path: VaultPath, label: string): RemoteObjectId => {
    const candidates = [
      ...loaded.state.remoteMappings
        .filter(entry => entry.path === path)
        .map(entry => entry.remoteObjectId),
      ...loaded.state.base
        .filter(entry => entry.path === path && entry.remoteObjectId !== undefined)
        .map(entry => entry.remoteObjectId!),
    ];
    const unique = [...new Set(candidates.map(String))];
    if (unique.length !== 1) {
      throw new Error("C09 " + label + " trusted remote identity is missing or ambiguous.");
    }
    return candidates.find(value => String(value) === unique[0])!;
  };

  return {
    target: resolve(targetPath, "target"),
    sentinel: resolve(sentinelPath, "sentinel"),
  };
}

function stateAssertion(
  suffix: string,
  kind:
    | "base-authority"
    | "mapping-or-tombstone"
    | "live-trash-absence-state"
    | "unrelated-mutation-absence",
  subject: string,
  expectation: string,
) {
  return {
    assertionId: validationAssertionId("c09:" + suffix),
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
    assertionId: validationAssertionId("c09:" + suffix),
    kind,
    subject,
    expectation,
  };
}

export function c09TrustedFixtureVerification(input: {
  readonly run: ValidationRunIdentity;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly target: ValidationFixtureDescriptor;
  readonly sentinel: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly sentinelRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const targetContent = { hash: requiredHash(input.target, "target"), sizeBytes: input.target.sizeBytes };
  const sentinelContent = { hash: requiredHash(input.sentinel, "sentinel"), sizeBytes: input.sentinel.sizeBytes };
  const windowsId = input.windowsDevice.deviceId;
  const mobileId = input.mobileDevice.deviceId;

  return {
    run: input.run,
    state: [
      {
        kind: "base-authority",
        assertion: stateAssertion("trusted-windows-base", "base-authority", String(input.target.path), "trusted Windows base retains exact target object identity"),
        deviceId: windowsId,
        path: input.target.path,
        expectedRemoteObjectId: input.targetRemoteObjectId,
        expectedContent: targetContent,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion("trusted-windows-mapping", "mapping-or-tombstone", String(input.target.path), "Windows has the exact live remote mapping before deletion"),
        deviceId: windowsId,
        path: input.target.path,
        expected: "mapping",
        remoteObjectId: input.targetRemoteObjectId,
        entityKind: "file",
      },
      {
        kind: "base-authority",
        assertion: stateAssertion("trusted-mobile-base", "base-authority", String(input.target.path), "trusted mobile base retains exact target object identity"),
        deviceId: mobileId,
        path: input.target.path,
        expectedRemoteObjectId: input.targetRemoteObjectId,
        expectedContent: targetContent,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion("trusted-mobile-mapping", "mapping-or-tombstone", String(input.target.path), "mobile has the exact live remote mapping before deletion"),
        deviceId: mobileId,
        path: input.target.path,
        expected: "mapping",
        remoteObjectId: input.targetRemoteObjectId,
        entityKind: "file",
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: stateAssertion("trusted-sentinel", "unrelated-mutation-absence", String(input.sentinel.path), "sentinel is unchanged while target trust is established"),
        local: [
          { deviceId: windowsId, path: input.sentinel.path, state: "file", content: sentinelContent },
          { deviceId: mobileId, path: input.sentinel.path, state: "file", content: sentinelContent },
        ],
        remote: [
          {
            path: input.sentinel.path,
            state: "live",
            remoteObjectId: input.sentinelRemoteObjectId,
            content: sentinelContent,
          },
        ],
      },
    ],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion("trusted-target-content", "cross-device-content", String(input.target.path), "target content is identical on both participants before deletion"),
        deviceIds: [windowsId, mobileId],
        path: input.target.path,
        content: targetContent,
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion("trusted-target-authority", "cross-device-authority", String(input.target.path), "both devices retain the exact target remote identity before deletion"),
        deviceIds: [windowsId, mobileId],
        path: input.target.path,
        expectedRemoteObjectId: input.targetRemoteObjectId,
        expectedTombstone: false,
      },
    ],
  };
}

export function c09FinalDeletionVerification(input: {
  readonly run: ValidationRunIdentity;
  readonly windowsDevice: ValidationDeviceIdentity;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly target: ValidationFixtureDescriptor;
  readonly sentinel: ValidationFixtureDescriptor;
  readonly targetRemoteObjectId: RemoteObjectId;
  readonly sentinelRemoteObjectId: RemoteObjectId;
}): ValidationStateConvergenceRequest {
  const sentinelContent = { hash: requiredHash(input.sentinel, "sentinel"), sizeBytes: input.sentinel.sizeBytes };
  const windowsId = input.windowsDevice.deviceId;
  const mobileId = input.mobileDevice.deviceId;

  return {
    run: input.run,
    state: [
      {
        kind: "live-trash-absence-state",
        assertion: stateAssertion("remote-target-trashed", "live-trash-absence-state", String(input.target.path), "the exact original remote object is trashed"),
        path: input.target.path,
        expectedState: "trashed",
        remoteObjectId: input.targetRemoteObjectId,
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion("windows-target-tombstone", "mapping-or-tombstone", String(input.target.path), "Windows deletion authority is a tombstone for the exact original remote object"),
        deviceId: windowsId,
        path: input.target.path,
        expected: "tombstone",
        remoteObjectId: input.targetRemoteObjectId,
        entityKind: "file",
      },
      {
        kind: "mapping-or-tombstone",
        assertion: stateAssertion("mobile-target-tombstone", "mapping-or-tombstone", String(input.target.path), "mobile recoverable deletion authority is a tombstone for the exact original remote object"),
        deviceId: mobileId,
        path: input.target.path,
        expected: "tombstone",
        remoteObjectId: input.targetRemoteObjectId,
        entityKind: "file",
      },
      {
        kind: "unrelated-mutation-absence",
        assertion: stateAssertion("final-sentinel-unchanged", "unrelated-mutation-absence", String(input.sentinel.path), "unrelated sentinel remains unchanged on both devices and remote"),
        local: [
          { deviceId: windowsId, path: input.sentinel.path, state: "file", content: sentinelContent },
          { deviceId: mobileId, path: input.sentinel.path, state: "file", content: sentinelContent },
        ],
        remote: [
          {
            path: input.sentinel.path,
            state: "live",
            remoteObjectId: input.sentinelRemoteObjectId,
            content: sentinelContent,
          },
        ],
      },
    ],
    convergence: [
      {
        kind: "cross-device-path",
        assertion: convergenceAssertion("target-live-path-absent", "cross-device-path", String(input.target.path), "target live path is absent on both participants"),
        deviceIds: [windowsId, mobileId],
        path: input.target.path,
        expected: "absent",
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion("target-tombstone-converged", "cross-device-authority", String(input.target.path), "both participants converge on tombstone authority"),
        deviceIds: [windowsId, mobileId],
        path: input.target.path,
        expectedTombstone: true,
      },
    ],
  };
}

function definition(): ValidationRunnerScenarioDefinition {
  const operation = (stepId: ValidationStepId, module: ValidationRunnerScenarioDefinition["steps"][number]["module"], name: string, proof: ValidationRunnerScenarioDefinition["steps"][number]["requiredCompletionProof"]) => ({
    stepId,
    module,
    operation: name,
    requiredCompletionProof: proof,
  });

  return Object.freeze({
    scenarioId: "C09",
    prerequisiteIds: Object.freeze([]),
    steps: Object.freeze([
      operation(C09_STEP_IDS.establishFixtures, "fixture-manager", "c09-establish-trusted-fixtures", "operation-complete"),
      operation(C09_STEP_IDS.previewWindowsEstablish, "production-path-driver", "c09-preview-windows-establish", "operation-complete"),
      operation(C09_STEP_IDS.assertWindowsEstablish, "plan-assertion-engine", "c09-assert-windows-establish", "operation-complete"),
      operation(C09_STEP_IDS.executeWindowsEstablish, "production-path-driver", "c09-execute-windows-establish", "operation-complete"),
      operation(C09_STEP_IDS.handoffEstablishToMobile, "cross-device-coordinator", "c09-handoff-establish-to-mobile", "operation-complete"),
      operation(C09_STEP_IDS.previewMobileEstablish, "production-path-driver", "c09-preview-mobile-establish", "operation-complete"),
      operation(C09_STEP_IDS.assertMobileEstablish, "plan-assertion-engine", "c09-assert-mobile-establish", "operation-complete"),
      operation(C09_STEP_IDS.executeMobileEstablish, "production-path-driver", "c09-execute-mobile-establish", "operation-complete"),
      operation(C09_STEP_IDS.verifyTrustedFixture, "state-convergence-verifier", "c09-verify-trusted-fixture", "verification-passed"),
      operation(C09_STEP_IDS.handoffDeleteToWindows, "cross-device-coordinator", "c09-handoff-delete-to-windows", "operation-complete"),
      operation(C09_STEP_IDS.deleteWindowsFixture, "fixture-manager", "c09-delete-windows-fixture", "operation-complete"),
      operation(C09_STEP_IDS.previewWindowsDelete, "production-path-driver", "c09-preview-windows-delete", "operation-complete"),
      operation(C09_STEP_IDS.assertWindowsDelete, "plan-assertion-engine", "c09-assert-windows-delete", "operation-complete"),
      operation(C09_STEP_IDS.executeWindowsDelete, "production-path-driver", "c09-execute-windows-delete", "operation-complete"),
      operation(C09_STEP_IDS.handoffDeleteToMobile, "cross-device-coordinator", "c09-handoff-delete-to-mobile", "operation-complete"),
      operation(C09_STEP_IDS.previewMobileDelete, "production-path-driver", "c09-preview-mobile-delete", "operation-complete"),
      operation(C09_STEP_IDS.assertMobileDelete, "plan-assertion-engine", "c09-assert-mobile-delete", "operation-complete"),
      operation(C09_STEP_IDS.executeMobileDelete, "production-path-driver", "c09-execute-mobile-delete", "operation-complete"),
      operation(C09_STEP_IDS.verifyFinalConvergence, "state-convergence-verifier", "c09-verify-final-convergence", "verification-passed"),
      operation(C09_STEP_IDS.recordEvidence, "scenario-evidence-recorder", "c09-record-evidence", "evidence-recorded"),
    ]),
  });
}

function fullModuleSet(
  used: Partial<Record<(typeof VALIDATION_RUNNER_MODULE_IDS)[number], ValidationRunnerApprovedModuleDelegate>>,
): ValidationRunnerApprovedModuleDelegates {
  const unavailable: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      return blocked("C09 does not authorize operation " + request.operation + " on this module.");
    },
  };
  return Object.fromEntries(
    VALIDATION_RUNNER_MODULE_IDS.map(moduleId => [moduleId, used[moduleId] ?? unavailable]),
  ) as unknown as ValidationRunnerApprovedModuleDelegates;
}

function driverFailure(status: string, reason: string | undefined) {
  const summary = reason ?? ("production driver returned " + status);
  return status === "request-failed" ? failed(summary) : blocked(summary);
}

function observedPlan(
  result: Awaited<ReturnType<ProductionDriverPort["dispatch"]>>,
): SynchronizationPlan | undefined {
  return result.status === "plan-observed" ? result.plan : undefined;
}

function authorization(result: ValidationPlanAssertionResult): ValidationPlanExecutionAuthorization | undefined {
  return result.status === "matched" ? result.authorization : undefined;
}

function allObservations(report: ValidationStateConvergenceReport) {
  return [
    ...report.result.state.observations,
    ...report.result.convergence.observations,
  ];
}

export function createC09WindowsDeleteIosTrashScenario(
  dependencies: C09ScenarioDependencies,
): C09ScenarioPackage {
  if (dependencies.windowsDevice.platform !== "windows-desktop") {
    throw new Error("C09 controller device must be Windows desktop.");
  }
  if (
    dependencies.mobileDevice.platform !== "iphone"
    && dependencies.mobileDevice.platform !== "ipad"
  ) {
    throw new Error("C09 mobile participant must be iPhone or iPad.");
  }
  if (dependencies.windowsDevice.deviceId === dependencies.mobileDevice.deviceId) {
    throw new Error("C09 participants must have distinct device identities.");
  }

  const context: C09Context = {};
  const targetSpec = validationDeletionFixture(C09_TARGET_FIXTURE_ID, C09_TARGET_RELATIVE_PATH, 1);
  const sentinelSpec = validationTextFixture(
    C09_SENTINEL_FIXTURE_ID,
    C09_SENTINEL_RELATIVE_PATH,
    1,
    "c09-unrelated-sentinel",
    "ordinary",
  );

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        if (request.operation === "c09-establish-trusted-fixtures") {
          context.target = await dependencies.windowsFixtures.create(targetSpec);
          context.sentinel = await dependencies.windowsFixtures.create(sentinelSpec);
          return completed();
        }
        if (request.operation === "c09-delete-windows-fixture") {
          const target = requiredDescriptor(context.target, "target");
          await dependencies.windowsFixtures.delete(target.identity.fixtureId);
          return completed();
        }
        return blocked("Unsupported C09 fixture operation: " + request.operation);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 fixture operation failed.");
      }
    },
  };

  const productionDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const target = requiredDescriptor(context.target, "target");
        const sentinel = requiredDescriptor(context.sentinel, "sentinel");
        let driver: ProductionDriverPort;
        let mode: "preview" | "execute";
        let planSlot:
          | "windowsEstablishPlan"
          | "mobileEstablishPlan"
          | "windowsDeletePlan"
          | "mobileDeletePlan";
        let auth: ValidationPlanExecutionAuthorization | undefined;

        switch (request.operation) {
          case "c09-preview-windows-establish":
            driver = dependencies.windowsProduction;
            mode = "preview";
            planSlot = "windowsEstablishPlan";
            break;
          case "c09-execute-windows-establish":
            driver = dependencies.windowsProduction;
            mode = "execute";
            planSlot = "windowsEstablishPlan";
            auth = context.windowsEstablishAuthorization;
            break;
          case "c09-preview-mobile-establish":
            driver = dependencies.mobileProduction;
            mode = "preview";
            planSlot = "mobileEstablishPlan";
            break;
          case "c09-execute-mobile-establish":
            driver = dependencies.mobileProduction;
            mode = "execute";
            planSlot = "mobileEstablishPlan";
            auth = context.mobileEstablishAuthorization;
            break;
          case "c09-preview-windows-delete":
            driver = dependencies.windowsProduction;
            mode = "preview";
            planSlot = "windowsDeletePlan";
            break;
          case "c09-execute-windows-delete":
            driver = dependencies.windowsProduction;
            mode = "execute";
            planSlot = "windowsDeletePlan";
            auth = context.windowsDeleteAuthorization;
            break;
          case "c09-preview-mobile-delete":
            driver = dependencies.mobileProduction;
            mode = "preview";
            planSlot = "mobileDeletePlan";
            break;
          case "c09-execute-mobile-delete":
            driver = dependencies.mobileProduction;
            mode = "execute";
            planSlot = "mobileDeletePlan";
            auth = context.mobileDeleteAuthorization;
            break;
          default:
            return blocked("Unsupported C09 production operation: " + request.operation);
        }

        if (mode === "preview") {
          const result = await driver.dispatch({
            kind: "preview-manual",
            run: request.run,
            stepId: request.stepId,
          });
          const plan = observedPlan(result);
          if (!plan) {
            return driverFailure(result.status, "reason" in result ? result.reason : undefined);
          }
          context[planSlot] = plan;

          if (planSlot === "windowsEstablishPlan") {
            const ids = await resolveTrustedRemoteObjectIdsAfterExecutionPlaceholder();
            void ids;
          }
          return completed();
        }

        if (!auth) {
          return blocked("C09 execution is not authorized because the immediately preceding production plan did not match.");
        }
        const result = await driver.dispatch({
          kind: "execute-asserted-plan",
          run: request.run,
          stepId: request.stepId,
          authorization: auth,
        });
        if (result.status !== "request-accepted") {
          return driverFailure(result.status, "reason" in result ? result.reason : undefined);
        }

        if (request.operation === "c09-execute-windows-establish") {
          const ids = await resolveTrustedRemoteObjectIds(
            dependencies.windowsAuthority,
            target.path,
            sentinel.path,
          );
          context.targetRemoteObjectId = ids.target;
          context.sentinelRemoteObjectId = ids.sentinel;
        }
        return completed();
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 production operation failed.");
      }
    },
  };

  async function resolveTrustedRemoteObjectIdsAfterExecutionPlaceholder(): Promise<void> {
    return;
  }

  const planDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const target = requiredDescriptor(context.target, "target");
        const sentinel = requiredDescriptor(context.sentinel, "sentinel");
        let plan: SynchronizationPlan | undefined;
        let expectation: ValidationPlanExpectation;
        let store: (value: ValidationPlanExecutionAuthorization | undefined) => void;

        switch (request.operation) {
          case "c09-assert-windows-establish":
            plan = context.windowsEstablishPlan;
            expectation = establishmentExpectation(request.run, "windows-upload", target, sentinel);
            store = value => { context.windowsEstablishAuthorization = value; };
            break;
          case "c09-assert-mobile-establish":
            plan = context.mobileEstablishPlan;
            expectation = establishmentExpectation(request.run, "mobile-download", target, sentinel, {
              target: requiredRemoteObjectId(context.targetRemoteObjectId, "target"),
              sentinel: requiredRemoteObjectId(context.sentinelRemoteObjectId, "sentinel"),
            });
            store = value => { context.mobileEstablishAuthorization = value; };
            break;
          case "c09-assert-windows-delete":
            plan = context.windowsDeletePlan;
            expectation = c09WindowsDeleteExpectation({
              run: request.run,
              path: target.path,
              remoteObjectId: requiredRemoteObjectId(context.targetRemoteObjectId, "target"),
            });
            context.windowsDeleteExpectation = expectation;
            store = value => { context.windowsDeleteAuthorization = value; };
            break;
          case "c09-assert-mobile-delete":
            plan = context.mobileDeletePlan;
            expectation = c09MobileRecoverableDeleteExpectation({
              run: request.run,
              path: target.path,
            });
            context.mobileDeleteExpectation = expectation;
            store = value => { context.mobileDeleteAuthorization = value; };
            break;
          default:
            return blocked("Unsupported C09 plan assertion operation: " + request.operation);
        }

        if (!plan) return blocked("C09 has no observed production plan for " + request.operation + ".");
        const result = assertValidationPlan({
          assertionId: "c09:" + request.operation,
          expectation,
          plan,
        });
        const auth = authorization(result);
        store(auth);
        if (!auth) return failed("C09 production plan hard-stop: " + assertionSummary(result));
        return completed();
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 plan assertion failed.");
      }
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      let phase: C09HandoffPhase;
      let from: "windows" | "mobile";
      let to: "windows" | "mobile";
      switch (request.operation) {
        case "c09-handoff-establish-to-mobile":
          phase = "establish-to-mobile";
          from = "windows";
          to = "mobile";
          break;
        case "c09-handoff-delete-to-windows":
          phase = "delete-to-windows";
          from = "mobile";
          to = "windows";
          break;
        case "c09-handoff-delete-to-mobile":
          phase = "delete-to-mobile";
          from = "windows";
          to = "mobile";
          break;
        default:
          return blocked("Unsupported C09 handoff operation: " + request.operation);
      }
      try {
        const refs = await dependencies.handoffs.handoff({
          run: request.run,
          stepId: request.stepId,
          phase,
          from,
          to,
        });
        return completed(refs);
      } catch (error) {
        return blocked(error instanceof Error ? error.message : "C09 cross-device handoff failed.");
      }
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      try {
        const target = requiredDescriptor(context.target, "target");
        const sentinel = requiredDescriptor(context.sentinel, "sentinel");
        const targetRemoteObjectId = requiredRemoteObjectId(context.targetRemoteObjectId, "target");
        const sentinelRemoteObjectId = requiredRemoteObjectId(context.sentinelRemoteObjectId, "sentinel");

        const verification = request.operation === "c09-verify-trusted-fixture"
          ? c09TrustedFixtureVerification({
              run: request.run,
              windowsDevice: dependencies.windowsDevice,
              mobileDevice: dependencies.mobileDevice,
              target,
              sentinel,
              targetRemoteObjectId,
              sentinelRemoteObjectId,
            })
          : request.operation === "c09-verify-final-convergence"
            ? c09FinalDeletionVerification({
                run: request.run,
                windowsDevice: dependencies.windowsDevice,
                mobileDevice: dependencies.mobileDevice,
                target,
                sentinel,
                targetRemoteObjectId,
                sentinelRemoteObjectId,
              })
            : undefined;
        if (!verification) return blocked("Unsupported C09 verifier operation: " + request.operation);

        const report = await dependencies.verifier.verify(verification);
        if (request.operation === "c09-verify-trusted-fixture") context.trustedReport = report;
        else context.finalReport = report;
        const refs = report.evidence.map(item => item.ref);
        if (report.result.verdict === "pass") return completed(refs);
        const summary = "C09 verification " + report.result.verdict + " for " + request.operation + ".";
        return report.result.verdict === "fail" ? failed(summary, refs) : blocked(summary, refs);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 convergence verification failed.");
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== "c09-record-evidence") {
        return blocked("Unsupported C09 evidence operation: " + request.operation);
      }
      try {
        const target = requiredDescriptor(context.target, "target");
        const targetRemoteObjectId = requiredRemoteObjectId(context.targetRemoteObjectId, "target");
        const sentinelRemoteObjectId = requiredRemoteObjectId(context.sentinelRemoteObjectId, "sentinel");
        if (!context.windowsDeleteExpectation || !context.mobileDeleteExpectation || !context.mobileDeletePlan) {
          return blocked("C09 final plan evidence is incomplete.");
        }
        if (!context.trustedReport || !context.finalReport) {
          return blocked("C09 verifier evidence is incomplete.");
        }

        context.evidence = recordValidationScenarioEvidence({
          run: request.run,
          primaryDeviceId: dependencies.windowsDevice.deviceId,
          devices: [dependencies.windowsDevice, dependencies.mobileDevice],
          build: dependencies.build,
          capturedAt: dependencies.capturedAt(),
          preDiagnosticRefs: [],
          postDiagnosticRefs: [],
          fixtures: [{
            fixture: target.identity,
            sizeBytes: target.sizeBytes,
            contentHash: String(requiredHash(target, "target")),
          }],
          expectedPlan: context.mobileDeleteExpectation,
          actualPlan: context.mobileDeletePlan,
          correlations: {
            remoteObjectIds: [String(targetRemoteObjectId), String(sentinelRemoteObjectId)],
          },
          revisions: [],
          faults: [],
          checkpoints: [],
          assertions: [
            ...allObservations(context.trustedReport),
            ...allObservations(context.finalReport),
          ],
          requiredEvidence: [
            "fixtures",
            "expected-plan",
            "actual-plan",
            "correlations",
            "assertions",
          ],
          requestedStatus: "PASS",
        });
        return completed([
          validationEvidenceRef("c09:scenario-evidence:" + context.evidence.integrityDigest),
        ]);
      } catch (error) {
        return failed(error instanceof Error ? error.message : "C09 evidence recording failed.");
      }
    },
  };

  const prerequisites: ValidationRunnerPrerequisiteDelegate = {
    async evaluate(input) {
      if (input.prerequisiteIds.length !== 0) {
        return input.prerequisiteIds.map(prerequisiteId => ({
          prerequisiteId,
          status: "blocked" as const,
          summary: "C09 establishes its trusted fixture internally and accepts no external scenario prerequisite.",
          evidenceRefs: [],
        }));
      }
      return [];
    },
  };

  return {
    definition: definition(),
    prerequisites,
    modules: fullModuleSet({
      "fixture-manager": fixtureDelegate,
      "production-path-driver": productionDelegate,
      "plan-assertion-engine": planDelegate,
      "state-convergence-verifier": verifierDelegate,
      "scenario-evidence-recorder": evidenceDelegate,
      "cross-device-coordinator": handoffDelegate,
    }),
    evidenceRecord: () => context.evidence,
  };
}
