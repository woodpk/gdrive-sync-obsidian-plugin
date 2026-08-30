import assert from "node:assert/strict";
import test from "node:test";
import {
  appendDurableRemoteChangeBatch,
  assessExecutableOperation,
  assessTextMergeEligibility,
  classifyRemoteChangePage,
  contractId,
  establishFileCommonStateProof,
  exactBaseAuthorityMatches,
  localTransactionBackupExpectation,
  localTransactionRecoveryAction,
  mutationMayHaveBeenAttempted,
  recoverableOperationIsComplete,
  remoteUpdateEligibleForOrdinaryConvergence,
  remoteUpdateWasSafelyMaterialized,
  resolveRemotePathCandidates,
  restartRecoveryDirective,
  type BaseFingerprint,
  type ChangeCursor,
  type ContentHash,
  type DurableRemoteChangeBatch,
  type ExactBaseAuthority,
  type IdentityAuthorityProof,
  type LocalIntegrityReconciliationPort,
  type LocalMutationTransaction,
  type LocalMutationTransactionId,
  type MutationIntentId,
  type ObservationToken,
  type OperationId,
  type PersistenceRevision,
  type PlannedOperation,
  type RecoverableMutationEffect,
  type RecoverableOperationIntent,
  type RemoteIngestionBatchId,
  type RemoteMutationIdentity,
  type RemoteMutationOutcome,
  type RemoteObjectId,
  type RemotePathConvergenceAuthority,
  type RemoteRevisionId,
  type SemanticStateGeneration,
  type SemanticStateValidationIssue,
  type StateRevision,
  type VaultPath,
} from "../src/contracts";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const cursor = (value: string) => id<"ChangeCursor">(value) as ChangeCursor;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const fingerprint = (value: string) => id<"BaseFingerprint">(value) as BaseFingerprint;
const hash = (value: string) => id<"ContentHash">(value) as ContentHash;
const observationToken = (value: string) => id<"ObservationToken">(value) as ObservationToken;
const remoteRevision = (value: string) => id<"RemoteRevisionId">(value) as RemoteRevisionId;
const batchId = (value: string) => id<"RemoteIngestionBatchId">(value) as RemoteIngestionBatchId;
const persistenceRevision = (value: string) => id<"StateRevision">(value) as StateRevision as PersistenceRevision;
const operationId = id<"OperationId">("op:foundation") as OperationId;
const intentId = id<"MutationIntentId">("intent:foundation") as MutationIntentId;
const transactionId = id<"LocalMutationTransactionId">("local-tx:foundation") as LocalMutationTransactionId;
const canonical = (value: string, sizeBytes = 4) => ({ algorithm: "sha256" as const, hash: hash(value), sizeBytes });
const baseAuthority = (p = path("note.md")): ExactBaseAuthority => ({ path: p, generation: generation("semantic:7"), fingerprint: fingerprint("base:abc") });
const identityAuthority = (p = path("note.md"), object = remoteId("remote:1")): IdentityAuthorityProof => ({ status: "unique", path: p, remoteObjectId: object, generation: generation("semantic:7") });

function operation(preconditions: PlannedOperation["preconditions"]): PlannedOperation {
  return { operationId, kind: "upload-update", path: path("note.md"), targetSide: "remote", destructive: false, preconditions, reasons: [] };
}

test("foundation Changes contract preserves intermediate and terminal tokens as distinct states", () => {
  const intermediate = classifyRemoteChangePage({ requestedToken: cursor("start"), changes: [], nextPageToken: cursor("page-2") });
  assert.equal(intermediate.status, "valid");
  if (intermediate.status === "valid") assert.equal(intermediate.page.kind, "intermediate");
  const terminal = classifyRemoteChangePage({ requestedToken: cursor("page-2"), changes: [], newStartPageToken: cursor("future") });
  assert.equal(terminal.status, "valid");
  if (terminal.status === "valid") assert.equal(terminal.page.kind, "terminal");
  assert.deepEqual(classifyRemoteChangePage({ requestedToken: cursor("bad"), changes: [], nextPageToken: cursor("next"), newStartPageToken: cursor("future") }), { status: "invalid", reason: "both-page-tokens-present" });
});

test("foundation remote path contract never silently collapses duplicate logical paths", () => {
  const p = path("same.md");
  const resolved = resolveRemotePathCandidates(p, [
    { path: p, entityKind: "file", remoteObjectId: remoteId("A") },
    { path: p, entityKind: "file", remoteObjectId: remoteId("B") },
  ]);
  assert.equal(resolved.status, "ambiguous");
});

test("foundation BASE authority is exact and independent of persistence-only writes", () => {
  const expected = baseAuthority();
  assert.equal(exactBaseAuthorityMatches(expected, { ...expected }), true);
  assert.equal(exactBaseAuthorityMatches(expected, { ...expected, generation: generation("semantic:8") }), false);
  assert.equal(exactBaseAuthorityMatches(expected, { ...expected, fingerprint: fingerprint("base:def") }), false);
});

test("foundation file BASE healing requires canonical SHA-256 equality authority", () => {
  const common = { path: path("note.md"), generation: generation("semantic:11"), localObservationToken: observationToken("local:11"), remoteObjectId: remoteId("remote:11"), remoteRevision: remoteRevision("rev:11") };
  assert.equal(establishFileCommonStateProof({ ...common, remoteCanonicalContent: canonical("sha:equal") }), undefined);
  assert.equal(establishFileCommonStateProof({ ...common, localCanonicalContent: canonical("sha:equal") }), undefined);
  assert.equal(establishFileCommonStateProof({ ...common, localCanonicalContent: canonical("sha:a"), remoteCanonicalContent: canonical("sha:b") }), undefined);
  assert.equal(establishFileCommonStateProof({ ...common, localCanonicalContent: canonical("sha:equal"), remoteCanonicalContent: canonical("sha:equal") })?.kind, "file-common");
});

test("R1 exact BASE precondition rejects nominal base-trusted for execution", () => {
  assert.equal(assessExecutableOperation(operation([{ kind: "base-trusted" }])).status, "incomplete-authority");
  const exact = assessExecutableOperation(operation([{ kind: "base-authority", authority: baseAuthority() }]));
  assert.equal(exact.status, "ready");
  if (exact.status === "ready") assert.equal(exact.operation.preconditions[0]?.kind, "base-authority");
});

test("R1 exact identity precondition rejects nominal identity-unambiguous for execution", () => {
  assert.equal(assessExecutableOperation(operation([{ kind: "identity-unambiguous", path: path("note.md") }])).status, "incomplete-authority");
  const exact = assessExecutableOperation(operation([{ kind: "identity-authority", proof: identityAuthority() }]));
  assert.equal(exact.status, "ready");
  if (exact.status === "ready") assert.equal(exact.operation.preconditions[0]?.kind, "identity-authority");
});

test("foundation restart contract distinguishes pre-dispatch intent from durable dispatch authority", () => {
  assert.deepEqual(restartRecoveryDirective({ stage: "intent-persisted" }), { action: "retire-unattempted-intent" });
  assert.equal(mutationMayHaveBeenAttempted("intent-persisted"), false);
  assert.equal(mutationMayHaveBeenAttempted("dispatch-authorized"), true);
  assert.deepEqual(restartRecoveryDirective({ stage: "dispatch-authorized" }), { action: "reconcile-physical-reality" });
  assert.deepEqual(restartRecoveryDirective({ stage: "outcome-unknown" }), { action: "reconcile-physical-reality" });
  assert.deepEqual(restartRecoveryDirective({ stage: "effect-verified", verificationEvidenceRef: "sha256:proof" }), { action: "finish-authoritative-state-commit", verificationEvidenceRef: "sha256:proof" });
});

test("foundation local transaction contract distinguishes create and replace recovery authority", () => {
  const common = { transactionId, operationId, path: path("note.md"), stagePath: path(".note.stage"), backupPath: path(".note.backup"), stage: "backup-established" as const, expectedEntityKind: "file" as const, expectedNewEvidence: canonical("sha:new") };
  const create: LocalMutationTransaction = { ...common, mutationKind: "create", expectedTarget: { status: "expected-absent" } };
  const replace: LocalMutationTransaction = { ...common, mutationKind: "replace", expectedTarget: { status: "expected-present", observationToken: observationToken("old:token"), entityKind: "file", canonicalContent: canonical("sha:old") } };
  assert.equal(localTransactionBackupExpectation(create), "backup-not-required");
  assert.equal(localTransactionBackupExpectation(replace), "backup-required-if-target-displaced");
});

test("foundation local transaction contract exposes restart recovery at every durable swap boundary", () => {
  const common = { transactionId, operationId, path: path("note.md"), stagePath: path(".note.stage"), backupPath: path(".note.backup"), mutationKind: "replace" as const, expectedEntityKind: "file" as const, expectedTarget: { status: "expected-present" as const, observationToken: observationToken("old:token"), entityKind: "file" as const, canonicalContent: canonical("sha:old") }, expectedNewEvidence: canonical("sha:new") };
  assert.equal(localTransactionRecoveryAction({ ...common, stage: "staged-unverified" }), "discard-unverified-stage");
  assert.equal(localTransactionRecoveryAction({ ...common, stage: "staged-verified" }), "verify-stage");
  assert.equal(localTransactionRecoveryAction({ ...common, stage: "backup-established" }), "restore-or-complete-swap");
  assert.equal(localTransactionRecoveryAction({ ...common, stage: "swap-committed" }), "cleanup-backup");
});

test("R2 durable remote move recovery descriptor carries side paths identity and authority", () => {
  const descriptor: RecoverableMutationEffect["descriptor"] = { kind: "move", targetSide: "remote", fromPath: path("old.md"), toPath: path("new.md"), remoteObjectId: remoteId("R1"), identityAuthority: identityAuthority(path("old.md"), remoteId("R1")) };
  assert.equal(descriptor.kind, "move");
  assert.equal(descriptor.targetSide, "remote");
  assert.equal(descriptor.remoteObjectId, remoteId("R1"));
});

test("R2 durable trash recovery descriptor retains destructive authority", () => {
  const descriptor: RecoverableMutationEffect["descriptor"] = { kind: "trash", targetSide: "remote", path: path("gone.md"), remoteObjectId: remoteId("R-trash"), baseAuthority: baseAuthority(path("gone.md")), identityAuthority: identityAuthority(path("gone.md"), remoteId("R-trash")) };
  assert.equal(descriptor.kind, "trash");
  assert.equal(descriptor.baseAuthority.path, path("gone.md"));
});

test("R2 clean merge keeps separately recoverable physical effects", () => {
  const localEffect: RecoverableMutationEffect = { effectId: "local", descriptor: { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: path("merge.md"), localTransactionId: transactionId, intendedContent: canonical("merged") }, stage: "state-committed" };
  const remoteIdentity: RemoteMutationIdentity = { kind: "existing-file-content-update", intentId, remoteObjectId: remoteId("R0"), expectedRevision: remoteRevision("rev0"), path: path("merge.md"), updateProtocol: "immutable-candidate-preservation", candidateRemoteObjectId: remoteId("candidate"), intendedContent: canonical("merged"), identityAuthority: identityAuthority(path("merge.md"), remoteId("R0")) };
  const remoteEffect: RecoverableMutationEffect = { effectId: "remote", descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "update", targetPath: path("merge.md"), remoteMutation: remoteIdentity, intendedContent: canonical("merged") }, stage: "outcome-unknown" };
  const intent: RecoverableOperationIntent = { logicalKind: "clean-text-merge", operationId, intentId, semanticAuthority: { generation: generation("semantic:merge") }, effects: [localEffect, remoteEffect] };
  assert.equal(recoverableOperationIsComplete(intent), false);
  assert.equal(recoverableOperationIsComplete({ ...intent, effects: [{ ...localEffect }, { ...remoteEffect, stage: "state-committed" }] }), true);
});

test("R3 safe remote move and trash outcomes preserve unknown versus verified effect", () => {
  const unknownMove: RemoteMutationOutcome = { status: "outcome-unknown", reason: "response lost" };
  const verifiedMove: RemoteMutationOutcome = { status: "verified-effect", applicationProof: { kind: "identity-preserving-move", remoteObjectId: remoteId("R1"), fromPath: path("a.md"), toPath: path("b.md") } };
  const verifiedTrash: RemoteMutationOutcome = { status: "verified-effect", applicationProof: { kind: "trash", remoteObjectId: remoteId("R2"), path: path("gone.md"), trashed: true } };
  assert.equal(unknownMove.status, "outcome-unknown");
  assert.equal(verifiedMove.status, "verified-effect");
  assert.equal(verifiedTrash.status, "verified-effect");
});

test("R4 concurrent RI allows safe materialization but not ordinary convergence", () => {
  const proof = { kind: "immutable-candidate-preservation" as const, candidateRemoteObjectId: remoteId("RW"), predecessorRemoteObjectId: remoteId("R0"), predecessorRevision: remoteRevision("r0"), intendedContent: canonical("writer"), verifiedContent: canonical("writer"), preservedRemoteObjectIds: [remoteId("R0"), remoteId("RI")] };
  const materialized = remoteUpdateWasSafelyMaterialized({ kind: "immutable-candidate-preservation", finalContentMatchesCandidate: true, proof });
  const convergence: RemotePathConvergenceAuthority = { status: "conflict-preserved", independentRemoteObjectIds: [remoteId("RI")] };
  assert.equal(materialized, true);
  assert.equal(remoteUpdateEligibleForOrdinaryConvergence(materialized, convergence), false);
  assert.equal(proof.preservedRemoteObjectIds.includes(remoteId("RI")), true);
});

test("R4 true conflict-free remote application requires separate convergence authority", () => {
  const proof = { kind: "immutable-candidate-preservation" as const, candidateRemoteObjectId: remoteId("RW"), predecessorRemoteObjectId: remoteId("R0"), predecessorRevision: remoteRevision("r0"), intendedContent: canonical("writer"), verifiedContent: canonical("writer"), preservedRemoteObjectIds: [remoteId("R0")] };
  const materialized = remoteUpdateWasSafelyMaterialized({ kind: "immutable-candidate-preservation", finalContentMatchesCandidate: true, proof });
  const convergence: RemotePathConvergenceAuthority = { status: "conflict-free", basis: "no-independent-candidate", authoritativeRemoteObjectIds: [remoteId("RW")] };
  assert.equal(remoteUpdateEligibleForOrdinaryConvergence(materialized, convergence), true);
});

test("R5 lost response recovery validates exact durable intended upload version rather than current LOCAL", () => {
  const identity: RemoteMutationIdentity = { kind: "existing-file-content-update", intentId, remoteObjectId: remoteId("R0"), expectedRevision: remoteRevision("r0"), path: path("note.md"), updateProtocol: "immutable-candidate-preservation", candidateRemoteObjectId: remoteId("candidate"), intendedContent: canonical("L1"), identityAuthority: identityAuthority() };
  assert.equal(identity.kind, "existing-file-content-update");
  const proof = { kind: "immutable-candidate-preservation" as const, candidateRemoteObjectId: remoteId("candidate"), predecessorRemoteObjectId: remoteId("R0"), predecessorRevision: remoteRevision("r0"), intendedContent: identity.intendedContent, verifiedContent: canonical("L1"), preservedRemoteObjectIds: [remoteId("R0")] };
  assert.equal(remoteUpdateWasSafelyMaterialized({ kind: "immutable-candidate-preservation", finalContentMatchesCandidate: true, proof }), true);
  assert.equal(remoteUpdateWasSafelyMaterialized({ kind: "immutable-candidate-preservation", finalContentMatchesCandidate: true, proof: { ...proof, verifiedContent: canonical("L2") } }), false);
});

test("R6 cache-bypassing integrity reconciliation seam is distinct from ordinary cached read", () => {
  const contractMethod: keyof LocalIntegrityReconciliationPort = "readFileBypassingEvidenceCache";
  const scenario = { base: "H0", changed: "H1", sameByteLength: true, mtimeUnchanged: true, watcherEventDelivered: false, cachedObservationTokenUnchanged: true, requiredAuthoritativeRead: contractMethod };
  assert.equal(scenario.requiredAuthoritativeRead, "readFileBypassingEvidenceCache");
  assert.equal(scenario.sameByteLength && scenario.mtimeUnchanged && !scenario.watcherEventDelivered && scenario.cachedObservationTokenUnchanged, true);
});

test("foundation remote ingestion backlog retains unresolved earlier facts across later learned batches", () => {
  const makeBatch = (n: number, changes: DurableRemoteChangeBatch["changes"]): DurableRemoteChangeBatch => ({ checkpoint: { batchId: batchId(`batch:${n}`), startingToken: cursor(`start:${n}`), terminalStartToken: cursor(`future:${n}`), persistenceRevision: persistenceRevision(`persistence:${n}`), status: "learned" }, changes });
  const first = makeBatch(1, [{ kind: "removed", remoteObjectId: remoteId("A"), lastKnownPath: path("A.md") }]);
  const second = makeBatch(2, [{ kind: "upsert", entry: { path: path("B.md"), entityKind: "file", remoteObjectId: remoteId("B"), trashed: false } }]);
  const third = makeBatch(3, [{ kind: "upsert", entry: { path: path("A-renamed.md"), entityKind: "file", remoteObjectId: remoteId("A"), trashed: false } }, { kind: "removed", remoteObjectId: remoteId("B"), lastKnownPath: path("B.md") }]);
  let backlog: readonly DurableRemoteChangeBatch[] = [];
  backlog = appendDurableRemoteChangeBatch(backlog, first);
  backlog = appendDurableRemoteChangeBatch(backlog, second);
  backlog = appendDurableRemoteChangeBatch(backlog, third);
  assert.deepEqual(backlog.map(batch => String(batch.checkpoint.batchId)), ["batch:1", "batch:2", "batch:3"]);
  assert.equal(appendDurableRemoteChangeBatch(backlog, second), backlog);
});

test("foundation semantic validation has a fail-closed extensibility code", () => {
  const issue: SemanticStateValidationIssue = { code: "other-semantic-inconsistency", invariantCategory: "newly-discovered-impossible-state", detail: "state contradiction must enter recovery rather than be trusted" };
  assert.equal(issue.code, "other-semantic-inconsistency");
});

test("foundation merge resource policy fails closed for unknown and oversized inputs", () => {
  const policy = { maximumInputBytesPerVersion: 10, maximumCombinedInputBytes: 20 };
  assert.deepEqual(assessTextMergeEligibility([4, 5, 6], policy), { eligible: true });
  assert.deepEqual(assessTextMergeEligibility([4, undefined, 6], policy), { eligible: false, reason: "size-unknown" });
  assert.deepEqual(assessTextMergeEligibility([11, 1, 1], policy), { eligible: false, reason: "version-too-large" });
  assert.deepEqual(assessTextMergeEligibility([8, 8, 8], policy), { eligible: false, reason: "combined-input-too-large" });
});
