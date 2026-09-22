import {
  PLAN_OPERATION_KINDS,
  contractId,
  type ContentHash,
  type PlanOperationKind,
  type RemoteObjectId,
  type SynchronizationAuthorityStoreV1_1,
  type VaultPath,
} from "../../contracts";
import type { DurableSynchronizationAuthorityState } from "../../state/persistent-state-store";
import {
  validationAssertionId,
  validationEvidenceRef,
  type ValidationConvergenceAssertion,
  type ValidationEvidenceRef,
  type ValidationExpectedPlanOperation,
  type ValidationPlanExpectation,
  type ValidationStateAssertion,
} from "../driver-plan-fault-verifier-contracts";
import {
  validationDeletionFixture,
  validationTextFixture,
  type ValidationFixtureDescriptor,
  type ValidationFixtureManager,
  type ValidationFixtureSpec,
} from "../fixture-manager";
import {
  HumanCheckpointResumeController,
  type HumanCheckpointControllerResult,
  type HumanCheckpointPostconditionProbe,
} from "../human-checkpoint-resume-controller";
import {
  type ValidationRunnerApprovedModuleDelegate,
  type ValidationRunnerPrerequisiteDelegate,
} from "../scenario-runner-module-adapter";
import type {
  ValidationRunnerHumanCheckpointResumePort,
  ValidationRunnerScenarioDefinition,
  ValidationRunnerStepDefinition,
} from "../scenario-runner-contracts";
import {
  validationStepId,
  type ValidationDeviceId,
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
} from "../run-sandbox-checkpoint-contracts";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
  ValidationStatePostcondition,
  ValidationConvergencePostcondition,
} from "../state-convergence-verifier";
import type { ValidationModeModuleOverrides } from "../validation-mode-runtime";

export const D06_SCENARIO_ID = "D06" as const;
export const D06_STALE_CONDITION_BLOCKED = "BLOCKED — STALE CONDITION NOT SAFELY INDUCIBLE" as const;
export const D06_STALE_PREREQUISITE_ID = "d06-stale-condition-safely-inducible" as const;
export const D06_STALE_CHECKPOINT_ID = "d06-establish-stale-device" as const;
export const D06_STALE_RESUME_STEP_ID = "d06-stale-authority-verify" as const;

export const D06_FIXTURE_ROOT = "__brain_validation__/d06" as const;
export const D06_DELETE_FIXTURE_ID = "d06-delete-target" as const;
export const D06_UPDATE_FIXTURE_ID = "d06-update-target" as const;
export const D06_GUARD_FIXTURE_IDS = Object.freeze([
  "d06-guard-1",
  "d06-guard-2",
  "d06-guard-3",
  "d06-guard-4",
] as const);

export const D06_DELETE_RELATIVE_PATH = "delete-target.md" as const;
export const D06_UPDATE_RELATIVE_PATH = "update-target.md" as const;
export const D06_GUARD_RELATIVE_PATHS = Object.freeze([
  "guard-1.md",
  "guard-2.md",
  "guard-3.md",
  "guard-4.md",
] as const);

const vaultPath = (value: string): VaultPath => contractId<"VaultPath">(value) as VaultPath;
export const D06_DELETE_PATH = vaultPath(D06_FIXTURE_ROOT + "/" + D06_DELETE_RELATIVE_PATH);
export const D06_UPDATE_PATH = vaultPath(D06_FIXTURE_ROOT + "/" + D06_UPDATE_RELATIVE_PATH);
export const D06_GUARD_PATHS = Object.freeze(
  D06_GUARD_RELATIVE_PATHS.map(relativePath => vaultPath(D06_FIXTURE_ROOT + "/" + relativePath)),
);

export const D06_AUTHORITY_CYCLES = Object.freeze({
  seedWindows: "d06-seed-windows",
  seedMobile: "d06-seed-mobile",
  windowsAbsentChanges: "d06-windows-absent-changes",
  staleReturnReconcile: "d06-stale-return-reconcile",
  staleReturnPostSafe: "d06-stale-return-post-safe",
} as const);

export const D06_SCENARIO_OPERATIONS = Object.freeze({
  createSeed: "d06-seed-create",
  verifySeed: "d06-seed-verify",
  handoffMobile: "d06-handoff-mobile",
  handoffWindows: "d06-handoff-windows",
  establishStaleDevice: "d06-establish-stale-device",
  verifyStaleAuthority: "d06-stale-authority-verify",
  mutateWhileAbsent: "d06-windows-mutate-while-absent",
  verifyNewerAuthority: "d06-newer-authority-verify",
  verifySafeReconciliation: "d06-safe-reconciliation-verify",
  recordEvidence: "d06-record-evidence",
} as const);

type D06DeviceRole = "windows" | "mobile";

export interface D06StateVerifierPort {
  verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport>;
}

export interface D06TrustedMappingReader {
  remoteObjectId(deviceId: ValidationDeviceId, path: VaultPath): Promise<RemoteObjectId | undefined>;
}

export interface D06CrossDeviceHandoffPort {
  currentRole(): D06DeviceRole;
  handoff(input: {
    readonly run: ValidationRunIdentity;
    readonly stepId: ValidationRunnerStepDefinition["stepId"];
    readonly targetRole: D06DeviceRole;
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export type D06StaleAuthorityObservation =
  | { readonly status: "stale"; readonly evidenceRefs: readonly ValidationEvidenceRef[] }
  | { readonly status: "fresh"; readonly evidenceRefs: readonly ValidationEvidenceRef[] }
  | { readonly status: "not-observable"; readonly reason: string; readonly evidenceRefs: readonly ValidationEvidenceRef[] };

export interface D06StaleAuthorityPort {
  observeDeviceStale(deviceId: ValidationDeviceId): Promise<D06StaleAuthorityObservation>;
}

export type D06StaleConditionConfiguration =
  | { readonly mode: "human-checkpoint" }
  | { readonly mode: "not-safely-inducible" };

export interface D06EvidencePort {
  record(input: {
    readonly run: ValidationRunIdentity;
    readonly deleteRemoteObjectId: RemoteObjectId;
    readonly updateRemoteObjectId: RemoteObjectId;
    readonly deleteHash: ContentHash;
    readonly updatedHash: ContentHash;
    readonly protectedGuardPaths: readonly VaultPath[];
  }): Promise<readonly ValidationEvidenceRef[]>;
}

export interface D06ScenarioBindings {
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDevice: ValidationDeviceIdentity;
  readonly windowsFixtures: Pick<ValidationFixtureManager, "create" | "edit" | "delete" | "hash">;
  readonly mappingReader: D06TrustedMappingReader;
  readonly verifier: D06StateVerifierPort;
  readonly handoff: D06CrossDeviceHandoffPort;
  readonly staleAuthority: D06StaleAuthorityPort;
  readonly staleCondition: D06StaleConditionConfiguration;
  readonly checkpointController: HumanCheckpointResumeController;
  readonly evidence: D06EvidencePort;
}

export interface D06ScenarioPackage {
  readonly scenarioId: typeof D06_SCENARIO_ID;
  readonly definition: ValidationRunnerScenarioDefinition;
  readonly prerequisites: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides: ValidationModeModuleOverrides;
  readonly humanCheckpoints: ValidationRunnerHumanCheckpointResumePort;
  readonly staleCheckpoint: {
    acknowledge(run: ValidationRunIdentity): Promise<HumanCheckpointControllerResult>;
    verify(run: ValidationRunIdentity): Promise<HumanCheckpointControllerResult>;
  };
}

export interface D06AuthorityObservationSource {
  /** Exact device whose stale status this trusted production authority attests. */
  readonly subjectDeviceId: ValidationDeviceId;
  readonly authority: Pick<
    SynchronizationAuthorityStoreV1_1<DurableSynchronizationAuthorityState>,
    "loadAuthority"
  >;
}

/**
 * Read-only adapter over production synchronization authority. D06 never ages,
 * rewrites, clears, or synthesizes device state. It proves the exact target
 * device's known-device record from a trusted production authority source;
 * another stale peer can never satisfy the observation.
 */
export class D06ProductionStaleAuthorityObserver implements D06StaleAuthorityPort {
  private readonly sources = new Map<string, D06AuthorityObservationSource>();

  constructor(sources: readonly D06AuthorityObservationSource[]) {
    for (const source of sources) {
      const key = String(source.subjectDeviceId);
      if (this.sources.has(key)) throw new Error("Duplicate D06 authority subject: " + key);
      this.sources.set(key, source);
    }
  }

  async observeDeviceStale(deviceId: ValidationDeviceId): Promise<D06StaleAuthorityObservation> {
    const source = this.sources.get(String(deviceId));
    if (!source) {
      return { status: "not-observable", reason: "No production authority source is bound for the returning device.", evidenceRefs: [] };
    }
    try {
      const loaded = await source.authority.loadAuthority();
      if (loaded.status !== "trusted") {
        return {
          status: "not-observable",
          reason: "Returning-device synchronization authority is not trusted.",
          evidenceRefs: [],
        };
      }
      const target = loaded.state.knownDevices.find(entry => String(entry.deviceId) === String(deviceId));
      if (!target) {
        return {
          status: "not-observable",
          reason: "Trusted authority contains no known-device entry for the returning installation.",
          evidenceRefs: [],
        };
      }
      const evidence = validationEvidenceRef(
        "d06:authority:" + String(loaded.state.deviceIdentity) + ":subject:" + String(deviceId) + ":" + String(loaded.state.persistenceRevision) + ":" + String(loaded.state.semanticGeneration),
      );
      return target.stale
        ? { status: "stale", evidenceRefs: [evidence] }
        : { status: "fresh", evidenceRefs: [evidence] };
    } catch {
      return {
        status: "not-observable",
        reason: "Returning-device production authority could not be read.",
        evidenceRefs: [],
      };
    }
  }
}

interface D06RunContext {
  readonly baseFixtures: Map<string, ValidationFixtureDescriptor>;
  readonly remoteObjectIds: Map<string, RemoteObjectId>;
  seedVerified: boolean;
  windowsChanged: boolean;
  safeReconciliationVerified: boolean;
  updatedFixture?: ValidationFixtureDescriptor;
}

function runKey(run: ValidationRunIdentity): string {
  return String(run.scenarioId) + "\u0000" + String(run.runId);
}

function fixtureSpecs(): readonly ValidationFixtureSpec[] {
  return Object.freeze([
    validationDeletionFixture(D06_DELETE_FIXTURE_ID, D06_DELETE_RELATIVE_PATH),
    validationTextFixture(D06_UPDATE_FIXTURE_ID, D06_UPDATE_RELATIVE_PATH),
    ...D06_GUARD_FIXTURE_IDS.map((fixtureId, index) =>
      validationTextFixture(fixtureId, D06_GUARD_RELATIVE_PATHS[index]!),
    ),
  ]);
}

function fixturePath(fixtureId: string): VaultPath {
  if (fixtureId === D06_DELETE_FIXTURE_ID) return D06_DELETE_PATH;
  if (fixtureId === D06_UPDATE_FIXTURE_ID) return D06_UPDATE_PATH;
  const index = D06_GUARD_FIXTURE_IDS.indexOf(fixtureId as (typeof D06_GUARD_FIXTURE_IDS)[number]);
  if (index < 0) throw new Error("Unsupported D06 fixture ID: " + fixtureId);
  return D06_GUARD_PATHS[index]!;
}

function requireHash(descriptor: ValidationFixtureDescriptor, label: string): ContentHash {
  if (!descriptor.hash) throw new Error(label + " has no content hash.");
  return descriptor.hash;
}

function contentOf(descriptor: ValidationFixtureDescriptor) {
  return { hash: requireHash(descriptor, "D06 fixture"), sizeBytes: descriptor.sizeBytes };
}

function stateAssertion(
  id: string,
  kind: ValidationStateAssertion["kind"],
  expectation: string,
): ValidationStateAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject: D06_SCENARIO_ID,
    expectation,
  });
}

function convergenceAssertion(
  id: string,
  kind: ValidationConvergenceAssertion["kind"],
  expectation: string,
): ValidationConvergenceAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject: D06_SCENARIO_ID,
    expectation,
  });
}

function nonEmptyState(items: readonly ValidationStatePostcondition[]): readonly [ValidationStatePostcondition, ...ValidationStatePostcondition[]] {
  if (!items.length) throw new Error("D06 verifier request requires state postconditions.");
  return items as readonly [ValidationStatePostcondition, ...ValidationStatePostcondition[]];
}

function nonEmptyConvergence(items: readonly ValidationConvergencePostcondition[]): readonly [ValidationConvergencePostcondition, ...ValidationConvergencePostcondition[]] {
  if (!items.length) throw new Error("D06 verifier request requires convergence postconditions.");
  return items as readonly [ValidationConvergencePostcondition, ...ValidationConvergencePostcondition[]];
}

function expectedOperation(input: {
  readonly kind: PlanOperationKind;
  readonly path: VaultPath;
  readonly destructive: boolean;
  readonly targetSide?: "local" | "remote";
  readonly remoteObjectId?: RemoteObjectId;
}): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind: input.kind,
    path: input.path,
    destructive: input.destructive,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
  });
}

function dynamicRemoteOperation(input: {
  readonly kind: PlanOperationKind;
  readonly path: VaultPath;
  readonly destructive: boolean;
  readonly targetSide?: "local" | "remote";
  readonly resolveRemoteObjectId: () => RemoteObjectId | undefined;
}): ValidationExpectedPlanOperation {
  return Object.freeze({
    kind: input.kind,
    path: input.path,
    destructive: input.destructive,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    get remoteObjectId(): RemoteObjectId {
      const remoteObjectId = input.resolveRemoteObjectId();
      if (!remoteObjectId) throw new Error("D06 exact remote identity is unavailable for " + String(input.path) + ".");
      return remoteObjectId;
    },
  });
}

function forbiddenKinds(expectedKinds: readonly PlanOperationKind[]): readonly PlanOperationKind[] {
  const permitted = new Set<PlanOperationKind>(["noop", ...expectedKinds]);
  return Object.freeze(PLAN_OPERATION_KINDS.filter(kind => !permitted.has(kind)));
}

function expectation(input: {
  readonly trigger: "manual" | "verify-reconcile";
  readonly expectedOperations: readonly ValidationExpectedPlanOperation[];
  readonly expectedKinds: readonly PlanOperationKind[];
  readonly destructiveExpectation: ValidationPlanExpectation["destructiveExpectation"];
  readonly executionDisposition: ValidationPlanExpectation["expectedExecutionDisposition"];
}): Omit<ValidationPlanExpectation, "run"> {
  return Object.freeze({
    expectedTrigger: input.trigger,
    expectedOperations: Object.freeze([...input.expectedOperations]),
    allowedBackgroundKinds: Object.freeze(["noop"] as const),
    forbiddenKinds: forbiddenKinds(input.expectedKinds),
    conflictExpectation: "forbidden" as const,
    destructiveExpectation: input.destructiveExpectation,
    expectedExecutionDisposition: input.executionDisposition,
    expectedGlobalExecutionGate: "none" as const,
  });
}

export const D06_SEED_WINDOWS_EXPECTATION = expectation({
  trigger: "manual",
  expectedOperations: fixtureSpecs().map(spec => expectedOperation({
    kind: "upload-create",
    path: fixturePath(spec.fixtureId),
    targetSide: "remote",
    destructive: false,
  })),
  expectedKinds: ["upload-create"],
  destructiveExpectation: "forbidden",
  executionDisposition: "safe-auto-eligible",
});

export const D06_SEED_MOBILE_EXPECTATION = expectation({
  trigger: "manual",
  expectedOperations: fixtureSpecs().map(spec => expectedOperation({
    kind: "download-create",
    path: fixturePath(spec.fixtureId),
    targetSide: "local",
    destructive: false,
  })),
  expectedKinds: ["download-create"],
  destructiveExpectation: "forbidden",
  executionDisposition: "safe-auto-eligible",
});

function previewStep(
  id: string,
  cycleId: string,
  operation: "preview-manual" | "preview-verify-reconcile" = "preview-manual",
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "production-path-driver",
    operation,
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function assertionStep(
  id: string,
  cycleId: string,
  planExpectation: Omit<ValidationPlanExpectation, "run">,
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "plan-assertion-engine",
    operation: "assert-observed-plan",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({
      authorityCycleId: cycleId,
      assertionId: "d06:" + id,
      expectation: planExpectation,
    }),
  });
}

function executionStep(id: string, cycleId: string): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module: "production-path-driver",
    operation: "execute-asserted-plan",
    requiredCompletionProof: "operation-complete",
    input: Object.freeze({ authorityCycleId: cycleId }),
  });
}

function moduleStep(
  id: string,
  module: ValidationRunnerStepDefinition["module"],
  operation: string,
  requiredCompletionProof: ValidationRunnerStepDefinition["requiredCompletionProof"],
): ValidationRunnerStepDefinition {
  return Object.freeze({
    stepId: validationStepId(id),
    module,
    operation,
    requiredCompletionProof,
  });
}

function seedVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: D06ScenarioBindings;
  readonly context: D06RunContext;
}): ValidationStateConvergenceRequest {
  const state: ValidationStatePostcondition[] = [];
  const convergence: ValidationConvergencePostcondition[] = [];
  for (const descriptor of input.context.baseFixtures.values()) {
    const remoteObjectId = input.context.remoteObjectIds.get(String(descriptor.path));
    if (!remoteObjectId) throw new Error("D06 seed remote identity is unavailable for " + String(descriptor.path) + ".");
    const content = contentOf(descriptor);
    state.push(
      { kind: "local-content", assertion: stateAssertion("d06-seed-win-" + descriptor.identity.fixtureId, "local-content", "Windows seed bytes are exact."), deviceId: input.bindings.windowsDeviceId, path: descriptor.path, content },
      { kind: "local-content", assertion: stateAssertion("d06-seed-mobile-" + descriptor.identity.fixtureId, "local-content", "Mobile seed bytes are exact."), deviceId: input.bindings.mobileDevice.deviceId, path: descriptor.path, content },
      { kind: "remote-content", assertion: stateAssertion("d06-seed-remote-" + descriptor.identity.fixtureId, "remote-content", "Remote seed bytes and identity are exact."), path: descriptor.path, remoteObjectId, content },
      { kind: "base-authority", assertion: stateAssertion("d06-seed-win-base-" + descriptor.identity.fixtureId, "base-authority", "Windows BASE binds the exact remote identity."), deviceId: input.bindings.windowsDeviceId, path: descriptor.path, expectedRemoteObjectId: remoteObjectId, expectedContent: content },
      { kind: "base-authority", assertion: stateAssertion("d06-seed-mobile-base-" + descriptor.identity.fixtureId, "base-authority", "Mobile BASE binds the exact remote identity."), deviceId: input.bindings.mobileDevice.deviceId, path: descriptor.path, expectedRemoteObjectId: remoteObjectId, expectedContent: content },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d06-seed-win-map-" + descriptor.identity.fixtureId, "mapping-or-tombstone", "Windows has one live mapping and no tombstone."), deviceId: input.bindings.windowsDeviceId, path: descriptor.path, expected: "mapping", remoteObjectId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d06-seed-mobile-map-" + descriptor.identity.fixtureId, "mapping-or-tombstone", "Mobile has one live mapping and no tombstone."), deviceId: input.bindings.mobileDevice.deviceId, path: descriptor.path, expected: "mapping", remoteObjectId, entityKind: "file" },
    );
    convergence.push(
      { kind: "cross-device-content", assertion: convergenceAssertion("d06-seed-content-" + descriptor.identity.fixtureId, "cross-device-content", "Both participants share exact seed bytes."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDevice.deviceId], path: descriptor.path, content },
      { kind: "cross-device-authority", assertion: convergenceAssertion("d06-seed-authority-" + descriptor.identity.fixtureId, "cross-device-authority", "Both participants bind the same live remote identity."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDevice.deviceId], path: descriptor.path, expectedRemoteObjectId: remoteObjectId, expectedTombstone: false },
    );
  }
  return { run: input.run, state: nonEmptyState(state), convergence: nonEmptyConvergence(convergence) };
}

function guardExpectations(input: {
  readonly bindings: D06ScenarioBindings;
  readonly context: D06RunContext;
}) {
  return {
    local: D06_GUARD_FIXTURE_IDS.flatMap(fixtureId => {
      const descriptor = input.context.baseFixtures.get(fixtureId);
      if (!descriptor) throw new Error("D06 guard descriptor is unavailable: " + fixtureId);
      const content = contentOf(descriptor);
      return [
        { deviceId: input.bindings.windowsDeviceId, path: descriptor.path, state: "file" as const, content },
        { deviceId: input.bindings.mobileDevice.deviceId, path: descriptor.path, state: "file" as const, content },
      ];
    }),
    remote: D06_GUARD_FIXTURE_IDS.map(fixtureId => {
      const descriptor = input.context.baseFixtures.get(fixtureId);
      if (!descriptor) throw new Error("D06 guard descriptor is unavailable: " + fixtureId);
      const remoteObjectId = input.context.remoteObjectIds.get(String(descriptor.path));
      if (!remoteObjectId) throw new Error("D06 guard remote identity is unavailable: " + fixtureId);
      return { path: descriptor.path, state: "live" as const, remoteObjectId, content: contentOf(descriptor) };
    }),
  };
}

function newerAuthorityVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: D06ScenarioBindings;
  readonly context: D06RunContext;
}): ValidationStateConvergenceRequest {
  const deleteBase = input.context.baseFixtures.get(D06_DELETE_FIXTURE_ID);
  const updateBase = input.context.baseFixtures.get(D06_UPDATE_FIXTURE_ID);
  const updated = input.context.updatedFixture;
  if (!deleteBase || !updateBase || !updated) throw new Error("D06 changed-fixture descriptors are incomplete.");
  const deleteRemoteObjectId = input.context.remoteObjectIds.get(String(D06_DELETE_PATH));
  const updateRemoteObjectId = input.context.remoteObjectIds.get(String(D06_UPDATE_PATH));
  if (!deleteRemoteObjectId || !updateRemoteObjectId) throw new Error("D06 changed-fixture remote identities are incomplete.");
  const guards = guardExpectations(input);

  return {
    run: input.run,
    state: [
      { kind: "remote-content", assertion: stateAssertion("d06-newer-update-remote", "remote-content", "Windows established the newer update on the exact existing Drive object."), path: D06_UPDATE_PATH, remoteObjectId: updateRemoteObjectId, content: contentOf(updated) },
      { kind: "local-content", assertion: stateAssertion("d06-newer-update-windows", "local-content", "Windows contains the newer update bytes."), deviceId: input.bindings.windowsDeviceId, path: D06_UPDATE_PATH, content: contentOf(updated) },
      { kind: "base-authority", assertion: stateAssertion("d06-newer-update-windows-base", "base-authority", "Windows BASE advanced to the newer update on the same remote object."), deviceId: input.bindings.windowsDeviceId, path: D06_UPDATE_PATH, expectedRemoteObjectId: updateRemoteObjectId, expectedContent: contentOf(updated) },
      { kind: "local-content", assertion: stateAssertion("d06-absent-mobile-old-update", "local-content", "The absent mobile participant still has its original update-target bytes."), deviceId: input.bindings.mobileDevice.deviceId, path: D06_UPDATE_PATH, content: contentOf(updateBase) },
      { kind: "live-trash-absence-state", assertion: stateAssertion("d06-newer-delete-remote-trash", "live-trash-absence-state", "The attested deletion trashed the exact original Drive object."), path: D06_DELETE_PATH, expectedState: "trashed", remoteObjectId: deleteRemoteObjectId },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d06-newer-delete-windows-tombstone", "mapping-or-tombstone", "Windows committed tombstone authority for the exact deleted object."), deviceId: input.bindings.windowsDeviceId, path: D06_DELETE_PATH, expected: "tombstone", remoteObjectId: deleteRemoteObjectId, entityKind: "file", deletedOn: "both" },
      { kind: "local-content", assertion: stateAssertion("d06-absent-mobile-delete-copy", "local-content", "The absent stale participant still retains the pre-deletion local bytes."), deviceId: input.bindings.mobileDevice.deviceId, path: D06_DELETE_PATH, content: contentOf(deleteBase) },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d06-absent-mobile-delete-mapping", "mapping-or-tombstone", "Before return, mobile still carries its old live mapping rather than manufactured tombstone authority."), deviceId: input.bindings.mobileDevice.deviceId, path: D06_DELETE_PATH, expected: "mapping", remoteObjectId: deleteRemoteObjectId, entityKind: "file" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d06-newer-guards", "unrelated-mutation-absence", "All four guard fixtures remain unchanged while the device is absent."), local: guards.local, remote: guards.remote },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d06-newer-windows-intents", "durable-intent-or-effect", "Windows has no outstanding mutation effect after verifying the attested deletion."), deviceId: input.bindings.windowsDeviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-path", assertion: convergenceAssertion("d06-newer-windows-delete-absent", "cross-device-path", "Windows authoritatively observes the deleted fixture as absent."), deviceIds: [input.bindings.windowsDeviceId], path: D06_DELETE_PATH, expected: "absent" },
      { kind: "cross-device-content", assertion: convergenceAssertion("d06-newer-windows-update", "cross-device-content", "Windows authoritative content is the newer update."), deviceIds: [input.bindings.windowsDeviceId], path: D06_UPDATE_PATH, content: contentOf(updated) },
    ],
  };
}

function safeReconciliationVerificationRequest(input: {
  readonly run: ValidationRunIdentity;
  readonly bindings: D06ScenarioBindings;
  readonly context: D06RunContext;
}): ValidationStateConvergenceRequest {
  const deleteBase = input.context.baseFixtures.get(D06_DELETE_FIXTURE_ID);
  const updated = input.context.updatedFixture;
  if (!deleteBase || !updated) throw new Error("D06 post-return fixture descriptors are incomplete.");
  const deleteRemoteObjectId = input.context.remoteObjectIds.get(String(D06_DELETE_PATH));
  const updateRemoteObjectId = input.context.remoteObjectIds.get(String(D06_UPDATE_PATH));
  if (!deleteRemoteObjectId || !updateRemoteObjectId) throw new Error("D06 post-return remote identities are incomplete.");
  const guards = guardExpectations(input);

  return {
    run: input.run,
    state: [
      { kind: "remote-content", assertion: stateAssertion("d06-safe-update-remote", "remote-content", "The newer update remains live on the original remote object."), path: D06_UPDATE_PATH, remoteObjectId: updateRemoteObjectId, content: contentOf(updated) },
      { kind: "local-content", assertion: stateAssertion("d06-safe-update-windows", "local-content", "Windows retains the newer update bytes."), deviceId: input.bindings.windowsDeviceId, path: D06_UPDATE_PATH, content: contentOf(updated) },
      { kind: "local-content", assertion: stateAssertion("d06-safe-update-mobile", "local-content", "The stale return safely reconciled the non-destructive newer update to mobile."), deviceId: input.bindings.mobileDevice.deviceId, path: D06_UPDATE_PATH, content: contentOf(updated) },
      { kind: "base-authority", assertion: stateAssertion("d06-safe-update-mobile-base", "base-authority", "Mobile BASE advanced only for the safely reconciled update."), deviceId: input.bindings.mobileDevice.deviceId, path: D06_UPDATE_PATH, expectedRemoteObjectId: updateRemoteObjectId, expectedContent: contentOf(updated) },
      { kind: "live-trash-absence-state", assertion: stateAssertion("d06-safe-delete-still-remote-trash", "live-trash-absence-state", "The exact deleted remote object remains trashed; stale return did not resurrect it."), path: D06_DELETE_PATH, expectedState: "trashed", remoteObjectId: deleteRemoteObjectId },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d06-safe-delete-windows-tombstone", "mapping-or-tombstone", "Windows authoritative tombstone remains intact."), deviceId: input.bindings.windowsDeviceId, path: D06_DELETE_PATH, expected: "tombstone", remoteObjectId: deleteRemoteObjectId, entityKind: "file", deletedOn: "both" },
      { kind: "local-content", assertion: stateAssertion("d06-safe-delete-mobile-preserved", "local-content", "The stale local copy remains recoverable because destructive cleanup was hard-stopped."), deviceId: input.bindings.mobileDevice.deviceId, path: D06_DELETE_PATH, content: contentOf(deleteBase) },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("d06-safe-delete-mobile-old-mapping", "mapping-or-tombstone", "Skipped stale destruction did not fabricate mobile tombstone authority."), deviceId: input.bindings.mobileDevice.deviceId, path: D06_DELETE_PATH, expected: "mapping", remoteObjectId: deleteRemoteObjectId, entityKind: "file" },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("d06-safe-guards", "unrelated-mutation-absence", "All guard fixtures remain unchanged through stale return."), local: guards.local, remote: guards.remote },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("d06-safe-mobile-intents", "durable-intent-or-effect", "Safe partial reconciliation leaves no outstanding dispatched mutation effect."), deviceId: input.bindings.mobileDevice.deviceId, expected: "none-outstanding" },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("d06-safe-update-converged", "cross-device-content", "The valid non-destructive update reconciled across both participants before any stale destructive authority."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDevice.deviceId], path: D06_UPDATE_PATH, content: contentOf(updated) },
      { kind: "cross-device-authority", assertion: convergenceAssertion("d06-safe-update-authority", "cross-device-authority", "Both participants retain the same exact remote identity for the safely reconciled update."), deviceIds: [input.bindings.windowsDeviceId, input.bindings.mobileDevice.deviceId], path: D06_UPDATE_PATH, expectedRemoteObjectId: updateRemoteObjectId, expectedTombstone: false },
      { kind: "cross-device-path", assertion: convergenceAssertion("d06-safe-stale-copy-preserved", "cross-device-path", "The stale participant's local deleted-target copy remains present because destructive cleanup was skipped."), deviceIds: [input.bindings.mobileDevice.deviceId], path: D06_DELETE_PATH, expected: "file" },
    ],
  };
}

function reportResult(report: ValidationStateConvergenceReport, phase: string) {
  const refs = report.evidence.map(item => item.ref);
  if (report.result.verdict === "pass") {
    return refs.length > 0
      ? { status: "completed" as const, evidenceRefs: refs }
      : { status: "blocked" as const, summary: phase + " produced no objective verification evidence.", evidenceRefs: [] };
  }
  return {
    status: report.result.verdict === "fail" ? "failed" as const : "blocked" as const,
    summary: report.result.verdict === "fail"
      ? phase + " objective verification failed."
      : phase + " required objective proof was not observable.",
    evidenceRefs: refs,
  };
}

function requireRole(bindings: D06ScenarioBindings, role: D06DeviceRole): string | undefined {
  return bindings.handoff.currentRole() === role
    ? undefined
    : "D06 step requires " + role + " ownership; current role is " + bindings.handoff.currentRole() + ".";
}

export function createD06ScenarioPackage(bindings: D06ScenarioBindings): D06ScenarioPackage {
  if (bindings.windowsDeviceId === bindings.mobileDevice.deviceId) {
    throw new Error("D06 requires distinct Windows and mobile validation device identities.");
  }

  const contexts = new Map<string, D06RunContext>();
  const context = (run: ValidationRunIdentity): D06RunContext => {
    const key = runKey(run);
    const existing = contexts.get(key);
    if (existing) return existing;
    const created: D06RunContext = {
      baseFixtures: new Map(),
      remoteObjectIds: new Map(),
      seedVerified: false,
      windowsChanged: false,
      safeReconciliationVerified: false,
    };
    contexts.set(key, created);
    return created;
  };

  let assertionRun: ValidationRunIdentity | undefined;
  const remoteId = (path: VaultPath): RemoteObjectId | undefined =>
    assertionRun ? context(assertionRun).remoteObjectIds.get(String(path)) : undefined;

  const windowsChangesExpectation = expectation({
    trigger: "manual",
    expectedOperations: [
      dynamicRemoteOperation({
        kind: "upload-update",
        path: D06_UPDATE_PATH,
        targetSide: "remote",
        destructive: false,
        resolveRemoteObjectId: () => remoteId(D06_UPDATE_PATH),
      }),
      dynamicRemoteOperation({
        kind: "trash-remote",
        path: D06_DELETE_PATH,
        targetSide: "remote",
        destructive: true,
        resolveRemoteObjectId: () => remoteId(D06_DELETE_PATH),
      }),
    ],
    expectedKinds: ["upload-update", "trash-remote"],
    destructiveExpectation: "allowed-exactly-as-expected",
    executionDisposition: "safe-auto-eligible",
  });

  const staleReturnExpectation = expectation({
    trigger: "verify-reconcile",
    expectedOperations: [
      dynamicRemoteOperation({
        kind: "download-update",
        path: D06_UPDATE_PATH,
        targetSide: "local",
        destructive: false,
        resolveRemoteObjectId: () => remoteId(D06_UPDATE_PATH),
      }),
      expectedOperation({
        kind: "blocked-unsafe",
        path: D06_DELETE_PATH,
        destructive: false,
      }),
    ],
    expectedKinds: ["download-update", "blocked-unsafe"],
    destructiveExpectation: "forbidden",
    executionDisposition: "requires-user-approval",
  });

  const postSafeStaleExpectation = expectation({
    trigger: "verify-reconcile",
    expectedOperations: [
      expectedOperation({
        kind: "blocked-unsafe",
        path: D06_DELETE_PATH,
        destructive: false,
      }),
    ],
    expectedKinds: ["blocked-unsafe"],
    destructiveExpectation: "forbidden",
    executionDisposition: "requires-user-approval",
  });

  const definition: ValidationRunnerScenarioDefinition = Object.freeze({
    scenarioId: D06_SCENARIO_ID,
    prerequisiteIds: Object.freeze([D06_STALE_PREREQUISITE_ID]),
    steps: Object.freeze([
      moduleStep("d06-seed-create", "fixture-manager", D06_SCENARIO_OPERATIONS.createSeed, "operation-complete"),

      previewStep("d06-seed-windows-preview", D06_AUTHORITY_CYCLES.seedWindows),
      assertionStep("d06-seed-windows-assert", D06_AUTHORITY_CYCLES.seedWindows, D06_SEED_WINDOWS_EXPECTATION),
      executionStep("d06-seed-windows-execute", D06_AUTHORITY_CYCLES.seedWindows),

      moduleStep("d06-seed-handoff-mobile", "cross-device-coordinator", D06_SCENARIO_OPERATIONS.handoffMobile, "operation-complete"),
      previewStep("d06-seed-mobile-preview", D06_AUTHORITY_CYCLES.seedMobile),
      assertionStep("d06-seed-mobile-assert", D06_AUTHORITY_CYCLES.seedMobile, D06_SEED_MOBILE_EXPECTATION),
      executionStep("d06-seed-mobile-execute", D06_AUTHORITY_CYCLES.seedMobile),
      moduleStep("d06-seed-verify", "state-convergence-verifier", D06_SCENARIO_OPERATIONS.verifySeed, "verification-passed"),

      moduleStep("d06-establish-stale-device", "human-checkpoint-resume-controller", D06_SCENARIO_OPERATIONS.establishStaleDevice, "operation-complete"),
      moduleStep(D06_STALE_RESUME_STEP_ID, "state-convergence-verifier", D06_SCENARIO_OPERATIONS.verifyStaleAuthority, "verification-passed"),

      moduleStep("d06-absent-handoff-windows", "cross-device-coordinator", D06_SCENARIO_OPERATIONS.handoffWindows, "operation-complete"),
      moduleStep("d06-absent-windows-mutate", "fixture-manager", D06_SCENARIO_OPERATIONS.mutateWhileAbsent, "operation-complete"),
      previewStep("d06-absent-windows-preview", D06_AUTHORITY_CYCLES.windowsAbsentChanges),
      assertionStep("d06-absent-windows-assert", D06_AUTHORITY_CYCLES.windowsAbsentChanges, windowsChangesExpectation),
      executionStep("d06-absent-windows-execute", D06_AUTHORITY_CYCLES.windowsAbsentChanges),
      moduleStep("d06-newer-authority-verify", "state-convergence-verifier", D06_SCENARIO_OPERATIONS.verifyNewerAuthority, "verification-passed"),

      moduleStep("d06-return-handoff-mobile", "cross-device-coordinator", D06_SCENARIO_OPERATIONS.handoffMobile, "operation-complete"),
      previewStep("d06-return-preview", D06_AUTHORITY_CYCLES.staleReturnReconcile, "preview-verify-reconcile"),
      assertionStep("d06-return-assert", D06_AUTHORITY_CYCLES.staleReturnReconcile, staleReturnExpectation),
      executionStep("d06-return-execute-safe-only", D06_AUTHORITY_CYCLES.staleReturnReconcile),
      moduleStep("d06-safe-reconciliation-verify", "state-convergence-verifier", D06_SCENARIO_OPERATIONS.verifySafeReconciliation, "verification-passed"),

      previewStep("d06-return-post-safe-preview", D06_AUTHORITY_CYCLES.staleReturnPostSafe, "preview-verify-reconcile"),
      assertionStep("d06-return-post-safe-assert", D06_AUTHORITY_CYCLES.staleReturnPostSafe, postSafeStaleExpectation),

      moduleStep("d06-record-evidence", "scenario-evidence-recorder", D06_SCENARIO_OPERATIONS.recordEvidence, "evidence-recorded"),
    ]),
  });

  const prerequisites: ValidationRunnerPrerequisiteDelegate = {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => {
        if (prerequisiteId !== D06_STALE_PREREQUISITE_ID) {
          return {
            prerequisiteId,
            status: "blocked" as const,
            summary: "D06 received an unsupported prerequisite identity.",
            evidenceRefs: [],
          };
        }
        return bindings.staleCondition.mode === "not-safely-inducible"
          ? {
              prerequisiteId,
              status: "blocked" as const,
              summary: D06_STALE_CONDITION_BLOCKED,
              evidenceRefs: [],
            }
          : {
              prerequisiteId,
              status: "satisfied" as const,
              summary: "D06 is configured to establish genuine staleness through the approved VH13 checkpoint.",
              evidenceRefs: [],
            };
      });
    },
  };

  const fixtureDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);
      if (request.operation === D06_SCENARIO_OPERATIONS.createSeed) {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
        state.baseFixtures.clear();
        state.remoteObjectIds.clear();
        state.seedVerified = false;
        state.windowsChanged = false;
        state.safeReconciliationVerified = false;
        state.updatedFixture = undefined;
        assertionRun = request.run;
        try {
          for (const spec of fixtureSpecs()) {
            const descriptor = await bindings.windowsFixtures.create(spec);
            if (descriptor.path !== fixturePath(spec.fixtureId)) {
              return { status: "failed", summary: "D06 fixture manager created an unexpected path.", evidenceRefs: [] };
            }
            requireHash(descriptor, "D06 seed fixture " + spec.fixtureId);
            state.baseFixtures.set(spec.fixtureId, descriptor);
          }
          return { status: "completed", evidenceRefs: [] };
        } catch (error) {
          return { status: "failed", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
        }
      }

      if (request.operation === D06_SCENARIO_OPERATIONS.mutateWhileAbsent) {
        const roleProblem = requireRole(bindings, "windows");
        if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
        if (!state.seedVerified) {
          return { status: "blocked", summary: "D06 cannot mutate newer authority before objective seed verification.", evidenceRefs: [] };
        }
        const stale = await bindings.staleAuthority.observeDeviceStale(bindings.mobileDevice.deviceId);
        if (stale.status !== "stale" || stale.evidenceRefs.length === 0) {
          return { status: "failed", summary: "D06 refused absent-device mutation because genuine returning-device staleness was no longer objectively proven.", evidenceRefs: stale.evidenceRefs };
        }
        try {
          state.updatedFixture = await bindings.windowsFixtures.edit(D06_UPDATE_FIXTURE_ID, 2, "non-overlap-a");
          await bindings.windowsFixtures.delete(D06_DELETE_FIXTURE_ID);
          state.windowsChanged = true;
          return { status: "completed", evidenceRefs: stale.evidenceRefs };
        } catch (error) {
          return { status: "failed", summary: error instanceof Error ? error.message : String(error), evidenceRefs: stale.evidenceRefs };
        }
      }

      return { status: "blocked", summary: "Unsupported D06 fixture operation: " + request.operation, evidenceRefs: [] };
    },
  };

  const handoffDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const targetRole = request.operation === D06_SCENARIO_OPERATIONS.handoffMobile
        ? "mobile"
        : request.operation === D06_SCENARIO_OPERATIONS.handoffWindows
          ? "windows"
          : undefined;
      if (!targetRole) return { status: "blocked", summary: "Unsupported D06 handoff operation: " + request.operation, evidenceRefs: [] };
      try {
        const evidenceRefs = await bindings.handoff.handoff({ run: request.run, stepId: request.stepId, targetRole });
        if (bindings.handoff.currentRole() !== targetRole) {
          return { status: "blocked", summary: "D06 handoff did not establish " + targetRole + " ownership.", evidenceRefs };
        }
        return { status: "completed", evidenceRefs };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const staleProbe: HumanCheckpointPostconditionProbe = {
    async observe(input) {
      if (
        input.action !== "establish-stale-device-condition"
        || input.run.scenarioId !== D06_SCENARIO_ID
        || input.device.deviceId !== bindings.mobileDevice.deviceId
      ) return { status: "ambiguous" };
      const observation = await bindings.staleAuthority.observeDeviceStale(bindings.mobileDevice.deviceId);
      if (observation.status === "stale" && observation.evidenceRefs.length > 0) return { status: "verified" };
      if (observation.status === "fresh") return { status: "pending" };
      return { status: "ambiguous" };
    },
  };

  const checkpointDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== D06_SCENARIO_OPERATIONS.establishStaleDevice) {
        return { status: "blocked", summary: "Unsupported D06 checkpoint operation: " + request.operation, evidenceRefs: [] };
      }
      const roleProblem = requireRole(bindings, "mobile");
      if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
      if (bindings.staleCondition.mode === "not-safely-inducible") {
        return { status: "blocked", summary: D06_STALE_CONDITION_BLOCKED, evidenceRefs: [] };
      }

      const observed = await bindings.staleAuthority.observeDeviceStale(bindings.mobileDevice.deviceId);
      if (observed.status === "stale" && observed.evidenceRefs.length > 0) {
        return { status: "completed", evidenceRefs: observed.evidenceRefs };
      }

      const begun = await bindings.checkpointController.begin({
        run: request.run,
        checkpointId: D06_STALE_CHECKPOINT_ID,
        device: bindings.mobileDevice,
        action: "establish-stale-device-condition",
        resumeStepId: D06_STALE_RESUME_STEP_ID,
      });
      if (begun.status === "paused" && begun.state) {
        return {
          status: "paused-human-action",
          checkpoint: begun.state.checkpoint,
          evidenceRefs: observed.evidenceRefs,
        };
      }
      return {
        status: "blocked",
        summary: "D06 could not durably establish the genuine-staleness checkpoint.",
        evidenceRefs: observed.evidenceRefs,
      };
    },
  };

  const verifierDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      const state = context(request.run);
      try {
        if (request.operation === D06_SCENARIO_OPERATIONS.verifySeed) {
          if (state.baseFixtures.size !== fixtureSpecs().length) {
            return { status: "blocked", summary: "D06 seed fixture set is incomplete.", evidenceRefs: [] };
          }
          for (const descriptor of state.baseFixtures.values()) {
            const [windows, mobile] = await Promise.all([
              bindings.mappingReader.remoteObjectId(bindings.windowsDeviceId, descriptor.path),
              bindings.mappingReader.remoteObjectId(bindings.mobileDevice.deviceId, descriptor.path),
            ]);
            if (!windows || windows !== mobile) {
              return { status: "failed", summary: "D06 seed did not establish one stable remote identity on both participants.", evidenceRefs: [] };
            }
            state.remoteObjectIds.set(String(descriptor.path), windows);
          }
          const result = reportResult(await bindings.verifier.verify(seedVerificationRequest({
            run: request.run,
            bindings,
            context: state,
          })), "D06 seed authority");
          if (result.status === "completed") state.seedVerified = true;
          return result;
        }

        if (request.operation === D06_SCENARIO_OPERATIONS.verifyStaleAuthority) {
          const roleProblem = requireRole(bindings, "mobile");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
          const observed = await bindings.staleAuthority.observeDeviceStale(bindings.mobileDevice.deviceId);
          if (observed.status !== "stale" || observed.evidenceRefs.length === 0) {
            return {
              status: "failed",
              summary: "D06 stale authority was not objectively retained through checkpoint resume.",
              evidenceRefs: observed.evidenceRefs,
            };
          }
          return { status: "completed", evidenceRefs: observed.evidenceRefs };
        }

        if (request.operation === D06_SCENARIO_OPERATIONS.verifyNewerAuthority) {
          if (!state.windowsChanged) return { status: "blocked", summary: "D06 newer authority has not been established.", evidenceRefs: [] };
          return reportResult(await bindings.verifier.verify(newerAuthorityVerificationRequest({
            run: request.run,
            bindings,
            context: state,
          })), "D06 newer authoritative changes");
        }

        if (request.operation === D06_SCENARIO_OPERATIONS.verifySafeReconciliation) {
          const roleProblem = requireRole(bindings, "mobile");
          if (roleProblem) return { status: "blocked", summary: roleProblem, evidenceRefs: [] };
          const stale = await bindings.staleAuthority.observeDeviceStale(bindings.mobileDevice.deviceId);
          if (stale.status !== "stale" || stale.evidenceRefs.length === 0) {
            return {
              status: "failed",
              summary: "D06 returning-device destructive authority became fresh before the stale-safety proof completed.",
              evidenceRefs: stale.evidenceRefs,
            };
          }
          const result = reportResult(await bindings.verifier.verify(safeReconciliationVerificationRequest({
            run: request.run,
            bindings,
            context: state,
          })), "D06 safe stale-device reconciliation");
          if (result.status === "completed") state.safeReconciliationVerified = true;
          return result.status === "completed"
            ? { ...result, evidenceRefs: [...stale.evidenceRefs, ...result.evidenceRefs] }
            : result;
        }

        return { status: "blocked", summary: "Unsupported D06 verification operation: " + request.operation, evidenceRefs: [] };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const evidenceDelegate: ValidationRunnerApprovedModuleDelegate = {
    async execute(request) {
      if (request.operation !== D06_SCENARIO_OPERATIONS.recordEvidence) {
        return { status: "blocked", summary: "Unsupported D06 evidence operation: " + request.operation, evidenceRefs: [] };
      }
      const state = context(request.run);
      const deleteBase = state.baseFixtures.get(D06_DELETE_FIXTURE_ID);
      const updated = state.updatedFixture;
      const deleteRemoteObjectId = state.remoteObjectIds.get(String(D06_DELETE_PATH));
      const updateRemoteObjectId = state.remoteObjectIds.get(String(D06_UPDATE_PATH));
      if (!state.seedVerified || !state.windowsChanged || !state.safeReconciliationVerified || !deleteBase || !updated || !deleteRemoteObjectId || !updateRemoteObjectId) {
        return { status: "blocked", summary: "D06 evidence cannot close without complete stale-safety verification.", evidenceRefs: [] };
      }
      try {
        const refs = await bindings.evidence.record({
          run: request.run,
          deleteRemoteObjectId,
          updateRemoteObjectId,
          deleteHash: requireHash(deleteBase, "D06 deleted fixture"),
          updatedHash: requireHash(updated, "D06 updated fixture"),
          protectedGuardPaths: D06_GUARD_PATHS,
        });
        return refs.length > 0
          ? { status: "completed", evidenceRefs: refs }
          : { status: "blocked", summary: "D06 evidence recorder returned no durable evidence reference.", evidenceRefs: [] };
      } catch (error) {
        return { status: "blocked", summary: error instanceof Error ? error.message : String(error), evidenceRefs: [] };
      }
    },
  };

  const moduleOverrides: ValidationModeModuleOverrides = Object.freeze({
    "fixture-manager": fixtureDelegate,
    "cross-device-coordinator": handoffDelegate,
    "human-checkpoint-resume-controller": checkpointDelegate,
    "state-convergence-verifier": verifierDelegate,
    "scenario-evidence-recorder": evidenceDelegate,
  });

  return Object.freeze({
    scenarioId: D06_SCENARIO_ID,
    definition,
    prerequisites,
    moduleOverrides,
    humanCheckpoints: bindings.checkpointController,
    staleCheckpoint: Object.freeze({
      acknowledge: (run: ValidationRunIdentity) =>
        bindings.checkpointController.acknowledge(run, D06_STALE_CHECKPOINT_ID),
      verify: (run: ValidationRunIdentity) =>
        bindings.checkpointController.verify(run, D06_STALE_CHECKPOINT_ID, bindings.mobileDevice, staleProbe),
    }),
  });
}

export function d06EvidenceRef(value: string): ValidationEvidenceRef {
  return validationEvidenceRef("d06:" + value);
}
