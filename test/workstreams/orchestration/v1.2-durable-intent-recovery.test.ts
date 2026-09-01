import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type GoogleDrivePort, type LocalVaultPort, type PersistenceRevision, type RecoverableOperationIntentV1_1, type RemoteEntry, type RemoteObjectId, type StateRevision, type SynchronizationAuthorityMetadataV1_1, type SynchronizationAuthoritySaveResult, type SynchronizationAuthorityStoreV1_1, type TrustedSynchronizationState, type VaultPath } from "../../../src/contracts";
import { StateCommitCoordinator } from "../../../src/core/commit-coordinator";
import { AuthorityCompleteExecutionCoordinator } from "../../../src/core/execution-coordinator";
import { InMemoryRunLeasePort } from "../../../src/core/run-coordinator";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { recoverOutstandingDurableIntents, reconstructDurableRecovery } from "../../../src/product/durable-intent-recovery";
import { IntegratedProductController } from "../../../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";

const id = <T extends string>(v: string) => contractId<T>(v);
const p = (v: string) => id<"VaultPath">(v) as VaultPath;
const rid = (v: string) => id<"RemoteObjectId">(v) as RemoteObjectId;
const rev = (v: string) => id<"StateRevision">(v) as StateRevision;
const vault = id<"VaultIdentity">("vault:d-c11");
const device = id<"DeviceIdentity">("device:d-c11");
const gen = id<"SemanticStateGeneration">("generation:d-c11");
const staleGen = id<"SemanticStateGeneration">("generation:stale");
const target = p("notes/restart.md");
const folder = p("folders/recovered");
const root = rid("remote:root");
const reserved = rid("remote:reserved:first");
const predecessor = rid("remote:predecessor");
const candidate = rid("remote:candidate:update");
const wrong = rid("remote:wrong-current");
const h0 = id<"ContentHash">("hash:v0");
const h1 = id<"ContentHash">("hash:v1");
const h2 = id<"ContentHash">("hash:v2");
const v0 = { algorithm: "sha256" as const, hash: h0, sizeBytes: 2 };
const v1 = { algorithm: "sha256" as const, hash: h1, sizeBytes: 3 };
const v2 = { algorithm: "sha256" as const, hash: h2, sizeBytes: 4 };
const managedRemote = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") } as never;
const context = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device } as const;

function emptyState(): TrustedSynchronizationState {
  return { schemaVersion: 1, stateRevision: rev("state:1"), vaultIdentity: vault as never, deviceIdentity: device as never, base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [] };
}
function priorState(): TrustedSynchronizationState {
  return { ...emptyState(), base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: predecessor, content: { hash: h0, sizeBytes: 2 } }], remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: predecessor }] };
}
class CanonicalStore {
  saves = 0;
  constructor(public value: TrustedSynchronizationState = emptyState()) {}
  async load() { return { status: "trusted" as const, state: this.value }; }
  async saveTrusted(value: TrustedSynchronizationState, expected?: StateRevision) { if (expected && expected !== this.value.stateRevision) return { status: "stale-revision" as const, actualRevision: this.value.stateRevision }; this.value = value; this.saves++; return { status: "saved" as const, stateRevision: value.stateRevision }; }
  async createRecoveryBackup() { return { backupId: "unused" }; }
  async assessMigration() { return { status: "compatible" as const, toVersion: 1 }; }
  async exportDiagnosticState() { return new Uint8Array(); }
}
class AuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  saves = 0;
  value: SynchronizationAuthorityMetadataV1_1;
  constructor(intents: readonly RecoverableOperationIntentV1_1[], semanticGeneration: any = gen, localTransactions: any[] = []) { this.value = { persistenceRevision: rev("authority:1") as PersistenceRevision, semanticGeneration, learnedRemoteBatches: [], pathConvergence: [], operationIntents: intents, localTransactions }; }
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(value: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision, expectedGen?: any): Promise<SynchronizationAuthoritySaveResult> { if (expected !== this.value.persistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: this.value.persistenceRevision }; if (expectedGen && expectedGen !== this.value.semanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: this.value.semanticGeneration }; this.saves++; const persistenceRevision = rev(`authority:${this.saves + 1}`) as PersistenceRevision; this.value = { ...value, persistenceRevision }; return { status: "saved", persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
}
function createIntent(stage: string = "dispatch-authorized", content: any = v1, remoteObjectId = reserved, semanticGeneration: any = gen): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:lost-create"); const intentId = id<"MutationIntentId">("intent:lost-create");
  return { logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation: semanticGeneration }, effects: [{ effectId: "effect:create", stage, ...(stage === "effect-verified" || stage === "state-committed" ? { verificationEvidenceRef: "proof:create" } : {}), descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: target, intendedContent: content, remoteMutation: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: remoteObjectId, path: target, intendedContent: content } } }] } as never;
}
function folderIntent(stage: string = "outcome-unknown"): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:folder"); const intentId = id<"MutationIntentId">("intent:folder");
  return { logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation: gen }, effects: [{ effectId: "effect:folder", stage, ...(stage === "effect-verified" || stage === "state-committed" ? { verificationEvidenceRef: "proof:folder" } : {}), descriptor: { kind: "remote-folder-create", targetSide: "remote", mutationKind: "create", intentId, targetPath: folder, parentRemoteObjectId: root, pathAuthority: { generation: gen, targetPath: folder, parentPath: p("folders"), pathComparisonKey: "folders/recovered", expectedTarget: "absent" }, remoteMutation: { kind: "reserved-folder-create", intentId, reservedRemoteObjectId: reserved, path: folder } } }] } as never;
}
function updateIntent(): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:update"); const intentId = id<"MutationIntentId">("intent:update");
  return { logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation: gen }, effects: [{ effectId: "effect:update", stage: "effect-verified", verificationEvidenceRef: "proof:update", descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "update", targetPath: target, intendedContent: v1, remoteMutation: { kind: "existing-file-content-update", intentId, remoteObjectId: predecessor, candidateRemoteObjectId: candidate, expectedRevision: id<"RemoteRevisionId">("revision:old"), path: target, updateProtocol: "immutable-candidate-preservation", intendedContent: v1, identityAuthority: { generation: gen, status: "unique", path: target, remoteObjectId: predecessor } } } }] } as never;
}
function mergeIntent(missing = false) {
  const operationId = id<"OperationId">("op:merge"); const intentId = id<"MutationIntentId">("intent:merge"); const txid = id<"LocalMutationTransactionId">("tx:merge");
  const tx = { transactionId: txid, operationId, path: target, stagePath: p(".brain-sync/stage/merge"), backupPath: p(".brain-sync/backup/merge"), stage: "completed", expectedEntityKind: "file", expectedNewEvidence: v1, mutationKind: "replace", expectedTarget: { status: "expected-present", observationToken: id<"ObservationToken">("obs:old"), entityKind: "file", canonicalContent: v0 } };
  const intent = { logicalKind: "clean-text-merge", operationId, intentId, semanticAuthority: { generation: gen }, effects: [{ effectId: "effect:merge:local", stage: "effect-verified", verificationEvidenceRef: "proof:local", descriptor: { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: target, localTransactionId: txid, intendedContent: v1 } }, { effectId: "effect:merge:remote", stage: "effect-verified", ...(missing ? {} : { verificationEvidenceRef: "proof:remote" }), descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "update", targetPath: target, intendedContent: v1, remoteMutation: { kind: "existing-file-content-update", intentId, remoteObjectId: predecessor, candidateRemoteObjectId: candidate, expectedRevision: id<"RemoteRevisionId">("revision:merge"), path: target, updateProtocol: "immutable-candidate-preservation", intendedContent: v1, identityAuthority: { generation: gen, status: "unique", path: target, remoteObjectId: predecessor } } } }] } as never;
  return { intent: intent as RecoverableOperationIntentV1_1, tx: tx as never };
}
function entry(pathValue: VaultPath = target, remoteObjectId = reserved, content: any = v1, kind: "file" | "folder" = "file"): RemoteEntry { return { path: pathValue, entityKind: kind, remoteObjectId, ...(kind === "file" ? { content: { hash: content.hash, sizeBytes: content.sizeBytes } } : {}), trashed: false }; }
function fixture(canonical: CanonicalStore, entries: () => readonly RemoteEntry[]) {
  let raw = 0;
  const local = { observe: async (pathValue: VaultPath) => ({ status: "absent", side: "local", path: pathValue }) } as unknown as LocalVaultPort;
  const drive = { observe: async (_root: RemoteObjectId, pathValue: VaultPath) => { const found = entries().find(e => e.path === pathValue); return found ? { ok: true, value: { status: "present", side: "remote", path: pathValue, entityKind: found.entityKind, remoteObjectId: found.remoteObjectId, content: found.content, stability: "stable" } } : { ok: true, value: { status: "absent", side: "remote", path: pathValue } }; }, listForReconciliation: async () => ({ ok: true, value: { entries: entries(), completeness: { status: "complete" } } }), create: async () => { raw++; throw new Error("raw create forbidden"); }, update: async () => { raw++; throw new Error("raw update forbidden"); }, move: async () => { raw++; throw new Error("raw move forbidden"); }, trash: async () => { raw++; throw new Error("raw trash forbidden"); } } as unknown as GoogleDrivePort;
  return { executor: new ProductSynchronizationExecutor(local, drive, canonical as never, context, () => ({ managedRemote, remoteEnumerationComplete: true })), raw: () => raw };
}
function executable(content: any = v2, claimed?: RemoteObjectId) { return { operationId: createIntent().operationId, kind: "upload-create", path: target, targetSide: "remote", ...(claimed ? { remoteObjectId: claimed } : {}), contentVersion: { path: target, entityKind: "file", content: { hash: content.hash, sizeBytes: content.sizeBytes } }, authorityComplete: true, destructive: false, preconditions: [{ kind: "path-observation", side: "remote", path: target, expected: "absent" }], reasons: [] } as never; }

test("D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent()]); const f = fixture(canonical, () => [entry()]); const adapter = createAuthoritativeProductExecutor(f.executor, authority, canonical as never, context, managedRemote);
  assert.equal((await adapter.validatePreconditions(executable())).status, "valid");
  const coordinated = await new AuthorityCompleteExecutionCoordinator(authority, adapter, new StateCommitCoordinator(canonical as never, context), canonical as never, context).executeOperation(executable());
  assert.equal(coordinated.status, "committed"); assert.equal(f.raw(), 0); assert.equal(canonical.value.base[0]?.content?.hash, h1); assert.equal(canonical.value.base[0]?.remoteObjectId, reserved); assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
});

test("D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([folderIntent()]); const f = fixture(canonical, () => [entry(folder, reserved, v1, "folder")]); let reads = 0;
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, context, managedRemote, { remoteFolderCreateRecoveryReadPort: { async observeFolderCreateRecovery() { reads++; return { status: "folder", targetPath: folder, pathComparisonKey: "folders/recovered", remoteObjectId: reserved, parentRemoteObjectId: root }; } } });
  assert.equal(result.status, "recovered"); assert.equal(reads, 1); assert.equal(f.raw(), 0); assert.equal(canonical.value.remoteMappings[0]?.remoteObjectId, reserved);
});

test("D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent("effect-verified")]); const f = fixture(canonical, () => [entry()]); assert.equal((await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, context, managedRemote)).status, "recovered"); assert.equal(canonical.saves, 1); assert.equal(f.raw(), 0);
  const completedIntent = createIntent("state-committed"); const rebuilt = reconstructDurableRecovery(completedIntent, emptyState(), [entry()]); assert.ok(rebuilt); const completed = new CanonicalStore({ ...emptyState(), base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: h1, sizeBytes: 3 }, remoteObjectId: reserved }], remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: reserved }], operations: [{ operationId: completedIntent.operationId, path: target, status: "completed", verificationEvidenceRef: rebuilt!.receipt.verificationEvidenceRef }] }); const completedAuthority = new AuthorityStore([completedIntent]); const cf = fixture(completed, () => [entry()]); const second = await recoverOutstandingDurableIntents(cf.executor, completedAuthority, completed as never, context, managedRemote); assert.deepEqual(second, { status: "recovered", changed: false, recoveredCount: 0, retiredCount: 0 }); assert.equal(completed.saves, 0); assert.equal(completedAuthority.saves, 0); assert.equal(cf.raw(), 0);
});

test("D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed", async () => {
  const canonical = new CanonicalStore(); const unattempted = new AuthorityStore([createIntent("intent-persisted")]); const f = fixture(canonical, () => []); const retired = await recoverOutstandingDurableIntents(f.executor, unattempted, canonical as never, context, managedRemote); assert.equal(retired.status, "recovered"); if (retired.status === "recovered") assert.equal(retired.retiredCount, 1); assert.equal(unattempted.value.operationIntents.length, 0); assert.equal(f.raw(), 0);
  const stale = new AuthorityStore([createIntent("dispatch-authorized", v1, reserved, staleGen)]); assert.equal((await recoverOutstandingDurableIntents(f.executor, stale, canonical as never, context, managedRemote)).status, "recovery-required");
  const oid = id<"OperationId">("op:bad-local"), iid = id<"MutationIntentId">("intent:bad-local"), txid = id<"LocalMutationTransactionId">("tx:missing"); const malformed = new AuthorityStore([{ logicalKind: "single-effect", operationId: oid, intentId: iid, semanticAuthority: { generation: gen }, effects: [{ effectId: "effect:bad", stage: "effect-verified", verificationEvidenceRef: "proof", descriptor: { kind: "local-file", targetSide: "local", mutationKind: "create", targetPath: target, localTransactionId: txid, intendedContent: v1 } }] } as never]); assert.equal((await recoverOutstandingDurableIntents(f.executor, malformed, canonical as never, context, managedRemote)).status, "recovery-required");
});

test("D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent()]); const f = fixture(canonical, () => [entry()]); const adapter = createAuthoritativeProductExecutor(f.executor, authority, canonical as never, context, managedRemote); assert.equal((await adapter.validatePreconditions(executable(v2, wrong))).status, "recovery-required"); assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "dispatch-authorized"); assert.equal(f.raw(), 0);
});

test("D-C12 persisted update candidate identity becomes canonical", async () => {
  const canonical = new CanonicalStore(priorState()); const authority = new AuthorityStore([updateIntent()]); const f = fixture(canonical, () => [entry(target, candidate)]); assert.equal((await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, context, managedRemote)).status, "recovered"); assert.equal(canonical.value.remoteMappings.find(x => x.path === target)?.remoteObjectId, candidate); assert.equal(canonical.value.base.find(x => x.path === target)?.content?.hash, h1); assert.equal(f.raw(), 0);
});

test("D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic", async () => {
  const complete = mergeIntent(false), incomplete = mergeIntent(true), entries = [entry(target, candidate)]; const one = reconstructDurableRecovery(complete.intent, priorState(), entries), two = reconstructDurableRecovery(complete.intent, priorState(), entries); assert.ok(one); assert.equal(one?.receipt.resultingRemoteObjectId, candidate); assert.equal(one?.receipt.verificationEvidenceRef, two?.receipt.verificationEvidenceRef); assert.equal(reconstructDurableRecovery(incomplete.intent, priorState(), entries), undefined); const canonical = new CanonicalStore(priorState()); const authority = new AuthorityStore([incomplete.intent], gen, [incomplete.tx]); const f = fixture(canonical, () => entries); assert.equal((await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, context, managedRemote)).status, "recovery-required"); assert.equal(f.raw(), 0);
});

test("D-C11 controller recovers outstanding durable work before a fresh planner returns noop", async () => {
  const canonical = new CanonicalStore(); const authority = new AuthorityStore([createIntent()]); const f = fixture(canonical, () => [entry()]); let assemblyCalls = 0, plannerCalls = 0;
  const assembler = { async assembleFull() { assemblyCalls++; return { input: { snapshots: [], state: await canonical.load() }, managedRemote, localEnumeration: { status: "complete" }, remoteEnumeration: { status: "complete" }, mode: "full" }; } };
  const plan = { planId: id<"PlanId">("plan:noop") as any, trigger: "manual", operations: [{ operationId: id<"OperationId">("op:fresh-noop"), kind: "noop", path: target, destructive: false, preconditions: [], reasons: [] }], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" } as any;
  const controller = new IntegratedProductController({ vaultIdentity: vault as never, deviceIdentity: device as never, stateContext: context, stateStore: canonical as never, authorityStore: authority, snapshotAssembler: assembler as never, executor: f.executor, conflictResolver: { assess: async () => ({ kind: "none" }) } as never, plannerForTrigger: () => ({ async plan() { plannerCalls++; assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed"); assert.equal(canonical.value.base[0]?.content?.hash, h1); return plan; } }), leasePort: new InMemoryRunLeasePort(), audit: { append: async () => undefined, read: async () => [] } as never, holderId: "test:d-c11" });
  const preview = await controller.previewManual(); assert.ok(preview); assert.equal(preview?.planId, plan.planId); assert.equal(plannerCalls, 1); assert.equal(assemblyCalls, 2); assert.equal(f.raw(), 0);
});
