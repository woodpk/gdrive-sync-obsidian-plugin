import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentHash,
  type DeviceIdentity,
  type ExecutablePlannedOperation,
  type GoogleDrivePort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type OperationId,
  type PersistenceRevision,
  type PlanId,
  type RecoverableOperationIntentV1_1,
  type RemoteEntry,
  type RemoteObjectId,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type SynchronizationPlan,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import { InMemoryRunLeasePort } from "../../../src/core/run-coordinator";
import { BoundedAuditHistory } from "../../../src/product/audit-history";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { recoverOutstandingDurableIntents, reconstructDurableRecovery } from "../../../src/product/durable-intent-recovery";
import { IntegratedProductController } from "../../../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";
import type { AssembledPlanningInput } from "../../../src/product/snapshot-assembler";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const revision = (value: string) => id<"StateRevision">(value) as StateRevision;
const hash = (value: string) => id<"ContentHash">(value) as ContentHash;
const vault = id<"VaultIdentity">("vault:d-c11-c12") as VaultIdentity;
const device = id<"DeviceIdentity">("device:d-c11-c12") as DeviceIdentity;
const generation = id<"SemanticStateGeneration">("generation:d-c11-c12");
const staleGeneration = id<"SemanticStateGeneration">("generation:stale");
const target = path("notes/restart.md");
const folder = path("folders/recovered");
const predecessor = remoteId("remote:predecessor");
const reserved = remoteId("remote:reserved:first");
const candidate = remoteId("remote:candidate:update");
const wrong = remoteId("remote:wrong-current-plan");
const root = remoteId("remote:root");
const v0 = { algorithm: "sha256" as const, hash: hash("hash:v0"), sizeBytes: 2 };
const v1 = { algorithm: "sha256" as const, hash: hash("hash:v1"), sizeBytes: 3 };
const v2 = { algorithm: "sha256" as const, hash: hash("hash:v2"), sizeBytes: 4 };
const managedRemote: ManagedRemoteIdentity = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const stateContext: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };

function emptyState(): TrustedSynchronizationState {
  return { schemaVersion: 1, stateRevision: revision("state:1"), vaultIdentity: vault, deviceIdentity: device, base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [] };
}
function priorState(): TrustedSynchronizationState {
  return {
    ...emptyState(),
    base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: predecessor, content: { hash: v0.hash, sizeBytes: v0.sizeBytes } }],
    remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: predecessor }],
  };
}

class CanonicalStore {
  value: TrustedSynchronizationState;
  saves = 0;
  constructor(initial: TrustedSynchronizationState = emptyState()) { this.value = initial; }
  async load() { return { status: "trusted" as const, state: this.value }; }
  async saveTrusted(candidateState: TrustedSynchronizationState, expected?: StateRevision) {
    if (expected && expected !== this.value.stateRevision) return { status: "stale-revision" as const, actualRevision: this.value.stateRevision };
    this.value = candidateState; this.saves += 1;
    return { status: "saved" as const, stateRevision: candidateState.stateRevision };
  }
  async createRecoveryBackup() { return { backupId: "unused" }; }
  async assessMigration() { return { status: "compatible" as const, toVersion: 1 }; }
  async exportDiagnosticState() { return new Uint8Array(); }
}

class AuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1;
  saves = 0;
  constructor(intents: readonly RecoverableOperationIntentV1_1[], semanticGeneration = generation, localTransactions: SynchronizationAuthorityMetadataV1_1["localTransactions"] = []) {
    this.value = { persistenceRevision: revision("authority:1") as PersistenceRevision, semanticGeneration, learnedRemoteBatches: [], pathConvergence: [], operationIntents: intents, localTransactions };
  }
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidateState: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision, expectedGeneration?: typeof generation): Promise<SynchronizationAuthoritySaveResult> {
    if (expected !== this.value.persistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: this.value.persistenceRevision };
    if (expectedGeneration && expectedGeneration !== this.value.semanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: this.value.semanticGeneration };
    this.saves += 1;
    const persistenceRevision = revision(`authority:${this.saves + 1}`) as PersistenceRevision;
    this.value = { ...candidateState, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
}

function createIntent(stage: "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified" | "state-committed" = "dispatch-authorized", content = v1, rid = reserved, semanticGeneration = generation): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:lost-create") as OperationId;
  const intentId = id<"MutationIntentId">("intent:lost-create");
  return {
    logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation: semanticGeneration },
    effects: [{
      effectId: "effect:lost-create:remote-file", stage,
      ...(stage === "effect-verified" || stage === "state-committed" ? { verificationEvidenceRef: "physical-proof:create-v1" } : {}),
      descriptor: {
        kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: target, intendedContent: content,
        remoteMutation: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: rid, path: target, intendedContent: content },
      },
    }],
  };
}
function updateIntent(stage: "effect-verified" | "state-committed" = "effect-verified"): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:lost-update") as OperationId;
  const intentId = id<"MutationIntentId">("intent:lost-update");
  return {
    logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation },
    effects: [{
      effectId: "effect:lost-update:remote-file", stage, verificationEvidenceRef: "physical-proof:update-v1",
      descriptor: {
        kind: "remote-file", targetSide: "remote", mutationKind: "update", targetPath: target, intendedContent: v1,
        remoteMutation: {
          kind: "existing-file-content-update", intentId, remoteObjectId: predecessor, candidateRemoteObjectId: candidate,
          expectedRevision: id<"RemoteRevisionId">("revision:old"), path: target, updateProtocol: "immutable-candidate-preservation", intendedContent: v1,
          identityAuthority: { generation, status: "unique", path: target, remoteObjectId: predecessor },
        },
      },
    }],
  };
}
function folderIntent(stage: "outcome-unknown" | "effect-verified" | "state-committed" = "outcome-unknown"): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:lost-folder") as OperationId;
  const intentId = id<"MutationIntentId">("intent:lost-folder");
  return {
    logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation },
    effects: [{
      effectId: "effect:lost-folder:remote-folder", stage,
      ...(stage === "effect-verified" || stage === "state-committed" ? { verificationEvidenceRef: "physical-proof:folder" } : {}),
      descriptor: {
        kind: "remote-folder-create", targetSide: "remote", mutationKind: "create", intentId, targetPath: folder, parentRemoteObjectId: root,
        pathAuthority: { generation, targetPath: folder, parentPath: path("folders"), pathComparisonKey: "folders/recovered", expectedTarget: "absent" },
        remoteMutation: { kind: "reserved-folder-create", intentId, reservedRemoteObjectId: reserved, path: folder },
      },
    }],
  };
}
function cleanMergeIntent(missingRemoteProof = false): { intent: RecoverableOperationIntentV1_1; localTransactions: SynchronizationAuthorityMetadataV1_1["localTransactions"] } {
  const operationId = id<"OperationId">("op:merge-restart") as OperationId;
  const intentId = id<"MutationIntentId">("intent:merge-restart");
  const txid = id<"LocalMutationTransactionId">("tx:merge-restart");
  const localTransaction = {
    transactionId: txid, operationId, path: target, stagePath: path(".brain-sync/stage/merge"), backupPath: path(".brain-sync/backup/merge"), stage: "completed" as const,
    expectedEntityKind: "file" as const, expectedNewEvidence: v1, mutationKind: "replace" as const,
    expectedTarget: { status: "expected-present" as const, observationToken: id<"ObservationToken">("obs:old"), entityKind: "file" as const, canonicalContent: v0 },
  };
  const intent = {
    logicalKind: "clean-text-merge" as const, operationId, intentId, semanticAuthority: { generation },
    effects: [
      { effectId: "effect:merge:local", stage: "effect-verified" as const, verificationEvidenceRef: "proof:merge:local", descriptor: { kind: "local-file" as const, targetSide: "local" as const, mutationKind: "replace" as const, targetPath: target, localTransactionId: txid, intendedContent: v1 } },
      { effectId: "effect:merge:remote", stage: "effect-verified" as const, ...(missingRemoteProof ? {} : { verificationEvidenceRef: "proof:merge:remote" }), descriptor: { kind: "remote-file" as const, targetSide: "remote" as const, mutationKind: "update" as const, targetPath: target, intendedContent: v1, remoteMutation: { kind: "existing-file-content-update" as const, intentId, remoteObjectId: predecessor, candidateRemoteObjectId: candidate, expectedRevision: id<"RemoteRevisionId">("revision:merge-old"), path: target, updateProtocol: "immutable-candidate-preservation" as const, intendedContent: v1, identityAuthority: { generation, status: "unique" as const, path: target, remoteObjectId: predecessor } } } },
    ] as const,
  } as RecoverableOperationIntentV1_1;
  return { intent, localTransactions: [localTransaction] };
}

function remoteEntry(p: VaultPath = target, rid: RemoteObjectId = reserved, content = v1, kind: "file" | "folder" = "file"): RemoteEntry {
  return { path: p, entityKind: kind, remoteObjectId: rid, ...(kind === "file" ? { content: { hash: content.hash, sizeBytes: content.sizeBytes } } : {}), trashed: false };
}
function executorFixture(canonical: CanonicalStore, entries: () => readonly RemoteEntry[]) {
  let rawCreate = 0, rawUpdate = 0, rawMove = 0, rawTrash = 0;
  const local = { observe: async (p: VaultPath) => ({ status: "absent", side: "local", path: p }) } as unknown as LocalVaultPort;
  const drive = {
    observe: async (_root: RemoteObjectId, p: VaultPath) => {
      const value = entries().find(entry => entry.path === p);
      return value ? { ok: true, value: { status: "present", side: "remote", path: p, entityKind: value.entityKind, remoteObjectId: value.remoteObjectId, content: value.content, stability: "stable" } } : { ok: true, value: { status: "absent", side: "remote", path: p } };
    },
    listForReconciliation: async () => ({ ok: true, value: { entries: entries(), completeness: { status: "complete" } } }),
    create: async () => { rawCreate += 1; throw new Error("raw create forbidden in restart recovery"); },
    update: async () => { rawUpdate += 1; throw new Error("raw update forbidden in restart recovery"); },
    move: async () => { rawMove += 1; throw new Error("raw move forbidden in restart recovery"); },
    trash: async () => { rawTrash += 1; throw new Error("raw trash forbidden in restart recovery"); },
  } as unknown as GoogleDrivePort;
  const executor = new ProductSynchronizationExecutor(local, drive, canonical as never, stateContext, () => ({ managedRemote, remoteEnumerationComplete: true }));
  return { executor, rawCalls: () => rawCreate + rawUpdate + rawMove + rawTrash };
}
function executableCreate(content = v2, claimedRemoteId?: RemoteObjectId): ExecutablePlannedOperation {
  return {
    operationId: createIntent().operationId, kind: "upload-create", path: target, targetSide: "remote", ...(claimedRemoteId ? { remoteObjectId: claimedRemoteId } : {}),
    contentVersion: { path: target, entityKind: "file", content: { hash: content.hash, sizeBytes: content.sizeBytes } }, authorityComplete: true, destructive: false,
    preconditions: [{ kind: "path-observation", side: "remote", path: target, expected: "absent" }], reasons: [],
  };
}

test("D-C11 lost-response upload-create recovers durable dispatch before expected-absent validation and never redispatches", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent("dispatch-authorized")]); const f = executorFixture(canonical, () => [remoteEntry()]);
  const adapter = createAuthoritativeProductExecutor(f.executor, authority, canonical as never, stateContext, managedRemote);
  const validation = await adapter.validatePreconditions(executableCreate());
  assert.equal(validation.status, "valid", "REMOTE is already present but durable intent must win over original expected-absent precondition");
  const result = await adapter.execute(executableCreate());
  assert.equal(result.status, "durable-verified-success");
  if (result.status === "durable-verified-success") {
    assert.equal(result.receipt.resultingRemoteObjectId, reserved);
    assert.equal(result.receipt.evidence?.hash, v1.hash, "restart receipt must retain persisted V1 rather than current-plan V2");
  }
  assert.equal(f.rawCalls(), 0);
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
  assert.equal(canonical.value.base[0]?.remoteObjectId, reserved);
  assert.equal(canonical.value.base[0]?.content?.hash, v1.hash);
});

test("D-C11 outcome-unknown REMOTE folder recovery uses frozen reader and never blindly creates", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([folderIntent()]); const f = executorFixture(canonical, () => [remoteEntry(folder, reserved, v1, "folder")]);
  let reads = 0;
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, stateContext, managedRemote, {
    remoteFolderCreateRecoveryReadPort: {
      async observeFolderCreateRecovery() { reads += 1; return { status: "folder", targetPath: folder, pathComparisonKey: "folders/recovered", remoteObjectId: reserved, parentRemoteObjectId: root }; },
    },
  });
  assert.equal(result.status, "recovered"); assert.equal(reads, 1); assert.equal(f.rawCalls(), 0);
  assert.equal(canonical.value.remoteMappings.find(value => value.path === folder)?.remoteObjectId, reserved);
});

test("D-C11 effect-verified restart dispatches nothing and completes canonical state", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent("effect-verified")]); const f = executorFixture(canonical, () => [remoteEntry()]);
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, stateContext, managedRemote);
  assert.equal(result.status, "recovered"); assert.equal(f.rawCalls(), 0); assert.equal(canonical.saves, 1);
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
});

test("D-C11 state-committed restart performs no physical or semantic commit", async () => {
  const intent = createIntent("state-committed");
  const provisional = reconstructDurableRecovery(intent, emptyState(), [remoteEntry()]); assert.ok(provisional);
  const completed: TrustedSynchronizationState = {
    ...emptyState(),
    base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: reserved, content: { hash: v1.hash, sizeBytes: v1.sizeBytes } }],
    remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: reserved }],
    operations: [{ operationId: intent.operationId, path: target, status: "completed", verificationEvidenceRef: provisional!.receipt.verificationEvidenceRef }],
  };
  const canonical = new CanonicalStore(completed); const authority = new AuthorityStore([intent]); const f = executorFixture(canonical, () => [remoteEntry()]);
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, stateContext, managedRemote);
  assert.deepEqual(result, { status: "recovered", changed: false, recoveredCount: 0, retiredCount: 0 });
  assert.equal(f.rawCalls(), 0); assert.equal(canonical.saves, 0); assert.equal(authority.saves, 0);
});

test("D-C11 intent-persisted only is retired for renewed planning without automatic dispatch", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent("intent-persisted")]); const f = executorFixture(canonical, () => []);
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, stateContext, managedRemote);
  assert.equal(result.status, "recovered"); if (result.status === "recovered") assert.equal(result.retiredCount, 1);
  assert.equal(authority.value.operationIntents.length, 0); assert.equal(f.rawCalls(), 0); assert.equal(canonical.saves, 0);
});

test("D-C11 stale-generation and malformed durable authority fail closed", async () => {
  const canonical = new CanonicalStore(); const stale = new AuthorityStore([createIntent("dispatch-authorized", v1, reserved, staleGeneration)]); const f = executorFixture(canonical, () => [remoteEntry()]);
  assert.equal((await recoverOutstandingDurableIntents(f.executor, stale, canonical as never, stateContext, managedRemote)).status, "recovery-required");
  const operationId = id<"OperationId">("op:malformed-local") as OperationId; const intentId = id<"MutationIntentId">("intent:malformed-local"); const txid = id<"LocalMutationTransactionId">("tx:missing");
  const malformed = new AuthorityStore([{
    logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation }, effects: [{ effectId: "effect:missing-tx", stage: "effect-verified", verificationEvidenceRef: "proof", descriptor: { kind: "local-file", targetSide: "local", mutationKind: "create", targetPath: target, localTransactionId: txid, intendedContent: v1 } }],
  }]);
  assert.equal((await recoverOutstandingDurableIntents(f.executor, malformed, canonical as never, stateContext, managedRemote)).status, "recovery-required");
  assert.equal(f.rawCalls(), 0);
});

test("D-C12 contradictory current REMOTE identity cannot override persisted reserved identity", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent("dispatch-authorized")]); const f = executorFixture(canonical, () => [remoteEntry()]);
  const adapter = createAuthoritativeProductExecutor(f.executor, authority, canonical as never, stateContext, managedRemote);
  const result = await adapter.validatePreconditions(executableCreate(v2, wrong));
  assert.equal(result.status, "recovery-required"); assert.equal(f.rawCalls(), 0); assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "dispatch-authorized");
});

test("D-C12 persisted REMOTE update candidate identity is the canonical recovery identity", async () => {
  const canonical = new CanonicalStore(priorState()); const authority = new AuthorityStore([updateIntent()]); const f = executorFixture(canonical, () => [remoteEntry(target, candidate)]);
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, stateContext, managedRemote);
  assert.equal(result.status, "recovered"); assert.equal(f.rawCalls(), 0);
  assert.equal(canonical.value.base.find(value => value.path === target)?.remoteObjectId, candidate);
  assert.equal(canonical.value.remoteMappings.find(value => value.path === target)?.remoteObjectId, candidate);
  assert.equal(canonical.value.base.find(value => value.path === target)?.content?.hash, v1.hash);
});

test("D-C12 clean merge reconstruction requires every persisted effect and aggregate verification is deterministic", async () => {
  const complete = cleanMergeIntent(false); const incomplete = cleanMergeIntent(true); const canonical = priorState(); const entries = [remoteEntry(target, candidate)];
  const first = reconstructDurableRecovery(complete.intent, canonical, entries); const second = reconstructDurableRecovery(complete.intent, canonical, entries);
  assert.ok(first); assert.ok(second); assert.equal(first?.receipt.evidence?.hash, v1.hash); assert.equal(first?.receipt.resultingRemoteObjectId, candidate);
  assert.equal(first?.receipt.verificationEvidenceRef, second?.receipt.verificationEvidenceRef);
  assert.equal(reconstructDurableRecovery(incomplete.intent, canonical, entries), undefined);

  const canonicalStore = new CanonicalStore(canonical); const authority = new AuthorityStore([incomplete.intent], generation, incomplete.localTransactions); const f = executorFixture(canonicalStore, () => entries);
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonicalStore as never, stateContext, managedRemote);
  assert.equal(result.status, "recovery-required"); assert.equal(f.rawCalls(), 0);
});

test("D-C11 controller drains outstanding durable intent before a fresh planner can return noop", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent("dispatch-authorized")]); const f = executorFixture(canonical, () => [remoteEntry()]);
  let assemblyCalls = 0; let plannerCalls = 0;
  const assembler = {
    async assembleFull(): Promise<AssembledPlanningInput> {
      assemblyCalls += 1;
      return { input: { snapshots: [], state: await canonical.load() }, managedRemote, localEnumeration: { status: "complete" }, remoteEnumeration: { status: "complete" }, mode: "full" } as AssembledPlanningInput;
    },
  };
  const noopPlan: SynchronizationPlan = {
    planId: id<"PlanId">("plan:post-recovery-noop") as PlanId, trigger: "manual",
    operations: [{ operationId: id<"OperationId">("op:fresh-noop") as OperationId, kind: "noop", path: target, destructive: false, preconditions: [], reasons: [] }],
    executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none",
  };
  const controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext, stateStore: canonical as never, authorityStore: authority,
    snapshotAssembler: assembler as never, executor: f.executor, conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: () => ({
      async plan() {
        plannerCalls += 1;
        assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed", "planner must run only after outstanding durable intent recovery");
        assert.equal(canonical.value.base.find(value => value.path === target)?.content?.hash, v1.hash);
        return noopPlan;
      },
    }),
    leasePort: new InMemoryRunLeasePort(), audit: { append: async () => undefined, read: async () => [] } as unknown as BoundedAuditHistory, holderId: "test:d-c11-controller",
  });
  const preview = await controller.previewManual();
  assert.equal(preview.plan.planId, noopPlan.planId); assert.equal(plannerCalls, 1); assert.equal(assemblyCalls, 2, "canonical recovery must force one refreshed assembly before planning");
  assert.equal(f.rawCalls(), 0);
});
