import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type AuthorityCompletePreconditionValidationResult,
  type AuthorityCompleteSuccessCommitter,
  type AuthoritativeSynchronizationExecutor,
  type CommitResult,
  type ExecutablePlannedOperation,
  type ExecutionResult,
  type OperationId,
  type PersistenceRevision,
  type PlannedOperation,
  type RemoteObjectId,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type DeviceIdentity,
  type VaultPath,
  type VerifiedExecutionReceipt,
} from "../../../src/contracts";
import { StateCommitCoordinator } from "../../../src/core/commit-coordinator";
import { AuthorityCompleteExecutionCoordinator } from "../../../src/core/execution-coordinator";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const revision = (value: string) => id<"StateRevision">(value) as StateRevision;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const vault = id<"VaultIdentity">("vault:commit-lifecycle") as VaultIdentity;
const device = id<"DeviceIdentity">("device:commit-lifecycle") as DeviceIdentity;
const generation = id<"SemanticStateGeneration">("generation:commit-lifecycle");
const target = path("folders/new-empty");
const reserved = remoteId("remote:folder:reserved");
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };

class MutableCanonicalState {
  value: TrustedSynchronizationState = {
    schemaVersion: 1,
    stateRevision: revision("state:1"),
    vaultIdentity: vault,
    deviceIdentity: device,
    base: [],
    remoteMappings: [],
    tombstones: [],
    operations: [],
    knownDevices: [],
  };
  saves = 0;
  async load() { return { status: "trusted" as const, state: this.value }; }
  async saveTrusted(candidate: TrustedSynchronizationState, expected?: StateRevision) {
    if (expected && expected !== this.value.stateRevision) return { status: "stale-revision" as const, actualRevision: this.value.stateRevision };
    this.value = candidate;
    this.saves += 1;
    return { status: "saved" as const, stateRevision: candidate.stateRevision };
  }
  async createRecoveryBackup() { return { backupId: "unused" }; }
  async assessMigration() { return { status: "compatible" as const, toVersion: 1 }; }
  async exportDiagnosticState() { return new Uint8Array(); }
}

class MutableAuthority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1 = {
    persistenceRevision: revision("authority:1") as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: [{ path: target, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:folder-create") } }],
    operationIntents: [],
    localTransactions: [],
  };
  saves = 0;
  failNextStateCommittedSave = false;
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    if (expected !== this.value.persistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: this.value.persistenceRevision };
    const attemptsStateCommit = candidate.operationIntents.some(intent => intent.effects.some(effect => effect.stage === "state-committed"));
    if (attemptsStateCommit && this.failNextStateCommittedSave) {
      this.failNextStateCommittedSave = false;
      return { status: "recovery-required", issues: [{ code: "other-semantic-inconsistency", detail: "simulated crash window after canonical commit" }] };
    }
    this.saves += 1;
    const persistenceRevision = revision(`authority:${this.saves + 1}`) as PersistenceRevision;
    this.value = { ...candidate, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> {
    return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }
  async ensureVerifiedIntent(operation: ExecutablePlannedOperation, receipt: VerifiedExecutionReceipt): Promise<void> {
    if (this.value.operationIntents.some(intent => intent.operationId === operation.operationId)) return;
    const effectId = `effect:${String(operation.operationId)}:remote-folder`;
    const candidate: SynchronizationAuthorityMetadataV1_1 = {
      ...this.value,
      operationIntents: [{
        logicalKind: "single-effect",
        operationId: operation.operationId,
        intentId: id<"MutationIntentId">(`intent:${String(operation.operationId)}`),
        semanticAuthority: { generation },
        effects: [{
          effectId,
          stage: "effect-verified",
          verificationEvidenceRef: `folder-proof:${String(reserved)}`,
          descriptor: {
            kind: "remote-folder-create",
            targetSide: "remote",
            mutationKind: "create",
            intentId: id<"MutationIntentId">(`intent:${String(operation.operationId)}`),
            targetPath: target,
            parentRemoteObjectId: remoteId("root:managed"),
            pathAuthority: { generation, targetPath: target, parentPath: path("folders"), pathComparisonKey: "folders/new-empty", expectedTarget: "absent" },
            remoteMutation: { kind: "reserved-folder-create", intentId: id<"MutationIntentId">(`intent:${String(operation.operationId)}`), reservedRemoteObjectId: reserved, path: target },
          },
        }],
      }],
    };
    const saved = await this.saveAuthority(candidate, this.value.persistenceRevision);
    assert.equal(saved.status, "saved");
    assert.equal(receipt.resultingRemoteObjectId, reserved);
  }
}

function operation(): PlannedOperation {
  return {
    operationId: id<"OperationId">("op:folder-create") as OperationId,
    kind: "upload-create",
    path: target,
    targetSide: "remote",
    contentVersion: { path: target, entityKind: "folder" },
    destructive: false,
    preconditions: [{ kind: "base-trusted" }],
    reasons: [],
  };
}

class VerifiedFolderExecutor implements AuthoritativeSynchronizationExecutor {
  calls = 0;
  readonly receipt: VerifiedExecutionReceipt = {
    operationId: operation().operationId,
    durable: true,
    integrityVerified: true,
    resultingRemoteObjectId: reserved,
    verificationEvidenceRef: "durable-effects:folder-create",
  };
  constructor(private readonly authority: MutableAuthority) {}
  async validatePreconditions(): Promise<AuthorityCompletePreconditionValidationResult> { return { status: "valid" }; }
  async execute(value: ExecutablePlannedOperation): Promise<ExecutionResult> {
    this.calls += 1;
    await this.authority.ensureVerifiedIntent(value, this.receipt);
    return { status: "durable-verified-success", receipt: this.receipt };
  }
}

class InspectingCommitter implements AuthorityCompleteSuccessCommitter {
  calls = 0;
  constructor(
    private readonly authority: MutableAuthority,
    private readonly delegate: StateCommitCoordinator,
    private readonly forced?: CommitResult,
  ) {}
  async commitVerifiedSuccess(value: ExecutablePlannedOperation, receipt: VerifiedExecutionReceipt, expected?: StateRevision): Promise<CommitResult> {
    this.calls += 1;
    const intent = this.authority.value.operationIntents.find(item => item.operationId === value.operationId);
    assert.ok(intent?.effects.every(effect => effect.stage === "effect-verified"), "canonical commit must observe durable effects at effect-verified, never state-committed");
    return this.forced ?? this.delegate.commitVerifiedSuccess(value, receipt, expected);
  }
}

function harness(forced?: CommitResult) {
  const authority = new MutableAuthority();
  const canonical = new MutableCanonicalState();
  const executor = new VerifiedFolderExecutor(authority);
  const delegate = new StateCommitCoordinator(canonical as never, context);
  const committer = new InspectingCommitter(authority, delegate, forced);
  const coordinator = new AuthorityCompleteExecutionCoordinator(authority, executor, committer, canonical as never, context);
  return { authority, canonical, executor, committer, coordinator };
}

test("D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes", async () => {
  const h = harness();
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "committed");
  assert.equal(h.committer.calls, 1);
  assert.equal(h.authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
  assert.equal(h.canonical.saves, 1);
});

test("D-C7 stale canonical CAS leaves durable effect at effect-verified", async () => {
  const h = harness({ status: "stale-state", actualRevision: revision("state:raced") });
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "stale-state");
  assert.equal(h.authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
  assert.equal(h.canonical.saves, 0);
});

test("D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings", async () => {
  const h = harness();
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "committed");
  const base = h.canonical.value.base.find(entry => entry.path === target);
  const mapping = h.canonical.value.remoteMappings.find(entry => entry.path === target);
  assert.equal(base?.entityKind, "folder");
  assert.equal(base?.remoteObjectId, reserved);
  assert.equal(mapping?.entityKind, "folder");
  assert.equal(mapping?.remoteObjectId, reserved);
});

test("D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit", async () => {
  const h = harness();
  h.authority.failNextStateCommittedSave = true;
  const first = await h.coordinator.executeOperation(operation());
  assert.equal(first.status, "recovery-required");
  assert.equal(h.canonical.saves, 1, "canonical semantic transition committed before simulated finalization failure");
  assert.equal(h.authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
  assert.equal(h.committer.calls, 1);

  const second = await h.coordinator.executeOperation(operation());
  assert.equal(second.status, "committed");
  assert.equal(h.canonical.saves, 1, "restart proves exact prior canonical commit instead of applying it twice");
  assert.equal(h.committer.calls, 1, "semantic committer is not called a second time");
  assert.equal(h.authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
});