import assert from "node:assert/strict";
import test from "node:test";
import {
  appendDurableRemoteChangeBatch,
  assessTextMergeEligibility,
  classifyRemoteChangePage,
  contractId,
  establishFileCommonStateProof,
  exactBaseAuthorityMatches,
  localTransactionBackupExpectation,
  localTransactionRecoveryAction,
  mutationMayHaveBeenAttempted,
  remoteUpdateCanBeAcknowledgedConflictFree,
  resolveRemotePathCandidates,
  restartRecoveryDirective,
  type BaseFingerprint,
  type ChangeCursor,
  type ContentHash,
  type DurableRemoteChangeBatch,
  type LocalMutationTransaction,
  type LocalMutationTransactionId,
  type MutationIntentId,
  type ObservationToken,
  type OperationId,
  type PersistenceRevision,
  type RemoteIngestionBatchId,
  type RemoteObjectId,
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

test("foundation Changes contract preserves intermediate and terminal tokens as distinct states", () => {
  const intermediate = classifyRemoteChangePage({ requestedToken: cursor("start"), changes: [], nextPageToken: cursor("page-2") });
  assert.equal(intermediate.status, "valid");
  if (intermediate.status === "valid") assert.equal(intermediate.page.kind, "intermediate");

  const terminal = classifyRemoteChangePage({ requestedToken: cursor("page-2"), changes: [], newStartPageToken: cursor("future") });
  assert.equal(terminal.status, "valid");
  if (terminal.status === "valid") assert.equal(terminal.page.kind, "terminal");

  assert.deepEqual(
    classifyRemoteChangePage({ requestedToken: cursor("bad"), changes: [], nextPageToken: cursor("next"), newStartPageToken: cursor("future") }),
    { status: "invalid", reason: "both-page-tokens-present" },
  );
});

test("foundation remote path contract never silently collapses duplicate logical paths", () => {
  const p = path("same.md");
  const resolved = resolveRemotePathCandidates(p, [
    { path: p, entityKind: "file", remoteObjectId: remoteId("A") },
    { path: p, entityKind: "file", remoteObjectId: remoteId("B") },
  ]);
  assert.equal(resolved.status, "ambiguous");
  if (resolved.status === "ambiguous") assert.deepEqual(resolved.candidates.map(candidate => String(candidate.remoteObjectId)), ["A", "B"]);
});

test("foundation BASE authority is exact and independent of persistence-only writes", () => {
  const expected = { path: path("note.md"), generation: generation("semantic:7"), fingerprint: fingerprint("base:abc") };
  assert.equal(exactBaseAuthorityMatches(expected, { ...expected }), true);
  assert.equal(exactBaseAuthorityMatches(expected, { ...expected, generation: generation("semantic:8") }), false);
  assert.equal(exactBaseAuthorityMatches(expected, { ...expected, fingerprint: fingerprint("base:def") }), false);
});

test("foundation file BASE healing requires canonical SHA-256 equality authority", () => {
  const common = {
    path: path("note.md"),
    generation: generation("semantic:11"),
    localObservationToken: observationToken("local:11"),
    remoteObjectId: remoteId("remote:11"),
    remoteRevision: remoteRevision("rev:11"),
  };

  assert.equal(establishFileCommonStateProof({ ...common, remoteCanonicalContent: canonical("sha:equal") }), undefined);
  assert.equal(establishFileCommonStateProof({ ...common, localCanonicalContent: canonical("sha:equal") }), undefined);
  assert.equal(establishFileCommonStateProof({ ...common, localCanonicalContent: canonical("sha:a"), remoteCanonicalContent: canonical("sha:b") }), undefined);

  const proof = establishFileCommonStateProof({
    ...common,
    localCanonicalContent: canonical("sha:equal"),
    remoteCanonicalContent: canonical("sha:equal"),
  });
  assert.equal(proof?.kind, "file-common");
  assert.equal(proof?.canonicalContent.algorithm, "sha256");
  assert.equal(proof?.canonicalContent.hash, hash("sha:equal"));
});

test("foundation remote update cannot call final bytes conflict-free without preservation proof", () => {
  assert.equal(remoteUpdateCanBeAcknowledgedConflictFree({
    kind: "final-content-observed-only",
    finalContentMatchesCandidate: true,
  }), false);

  const proof = {
    kind: "immutable-candidate-preservation" as const,
    candidateRemoteObjectId: remoteId("candidate:windows"),
    predecessorRemoteObjectId: remoteId("R0"),
    predecessorRevision: remoteRevision("R0-version"),
    preservedRemoteObjectIds: [remoteId("R0"), remoteId("RI")],
  };
  assert.equal(remoteUpdateCanBeAcknowledgedConflictFree({
    kind: "immutable-candidate-preservation",
    finalContentMatchesCandidate: true,
    proof,
  }), true);

  assert.equal(remoteUpdateCanBeAcknowledgedConflictFree({
    kind: "immutable-candidate-preservation",
    finalContentMatchesCandidate: true,
    proof: { ...proof, preservedRemoteObjectIds: [remoteId("RI")] },
  }), false);
});

test("foundation restart contract distinguishes pre-dispatch intent from durable dispatch authority", () => {
  const common = { operationId, intentId, path: path("note.md"), semanticAuthority: { generation: generation("semantic:1") } };
  assert.deepEqual(restartRecoveryDirective({ ...common, stage: "intent-persisted" }), { action: "retire-unattempted-intent" });
  assert.equal(mutationMayHaveBeenAttempted("intent-persisted"), false);
  assert.equal(mutationMayHaveBeenAttempted("dispatch-authorized"), true);
  assert.deepEqual(restartRecoveryDirective({ ...common, stage: "dispatch-authorized" }), { action: "reconcile-physical-reality" });
  assert.deepEqual(restartRecoveryDirective({ ...common, stage: "outcome-unknown" }), { action: "reconcile-physical-reality" });
  assert.deepEqual(restartRecoveryDirective({ ...common, stage: "effect-verified", verificationEvidenceRef: "sha256:proof" }), { action: "finish-authoritative-state-commit", verificationEvidenceRef: "sha256:proof" });
});

test("foundation local transaction contract distinguishes create and replace recovery authority", () => {
  const common = {
    transactionId,
    operationId,
    path: path("note.md"),
    stagePath: path(".note.stage"),
    backupPath: path(".note.backup"),
    stage: "backup-established" as const,
    expectedEntityKind: "file" as const,
    expectedNewEvidence: canonical("sha:new"),
  };
  const create: LocalMutationTransaction = {
    ...common,
    mutationKind: "create",
    expectedTarget: { status: "expected-absent" },
  };
  const replace: LocalMutationTransaction = {
    ...common,
    mutationKind: "replace",
    expectedTarget: {
      status: "expected-present",
      observationToken: observationToken("old:token"),
      entityKind: "file",
      canonicalContent: canonical("sha:old"),
    },
  };

  assert.equal(localTransactionBackupExpectation(create), "backup-not-required");
  assert.equal(localTransactionBackupExpectation(replace), "backup-required-if-target-displaced");
  assert.equal(localTransactionRecoveryAction(create), "restore-or-complete-swap");
  assert.equal(localTransactionRecoveryAction(replace), "restore-or-complete-swap");
});

test("foundation local transaction contract exposes restart recovery at every durable swap boundary", () => {
  const transaction: Omit<Extract<LocalMutationTransaction, { readonly mutationKind: "replace" }>, "stage"> = {
    transactionId,
    operationId,
    path: path("note.md"),
    stagePath: path(".note.stage"),
    backupPath: path(".note.backup"),
    mutationKind: "replace",
    expectedEntityKind: "file",
    expectedTarget: {
      status: "expected-present",
      observationToken: observationToken("old:token"),
      entityKind: "file",
      canonicalContent: canonical("sha:old"),
    },
    expectedNewEvidence: canonical("sha:new"),
  };
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "staged-unverified" }), "discard-unverified-stage");
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "staged-verified" }), "verify-stage");
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "backup-established" }), "restore-or-complete-swap");
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "swap-committed" }), "cleanup-backup");
});

test("foundation remote ingestion backlog retains unresolved earlier facts across later learned batches", () => {
  const makeBatch = (n: number, changes: DurableRemoteChangeBatch["changes"]): DurableRemoteChangeBatch => ({
    checkpoint: {
      batchId: batchId(`batch:${n}`),
      startingToken: cursor(`start:${n}`),
      terminalStartToken: cursor(`future:${n}`),
      persistenceRevision: persistenceRevision(`persistence:${n}`),
      status: "learned",
    },
    changes,
  });
  const first = makeBatch(1, [{ kind: "removed", remoteObjectId: remoteId("A"), lastKnownPath: path("A.md") }]);
  const second = makeBatch(2, [{ kind: "upsert", entry: { path: path("B.md"), entityKind: "file", remoteObjectId: remoteId("B"), trashed: false } }]);
  const third = makeBatch(3, [
    { kind: "upsert", entry: { path: path("A-renamed.md"), entityKind: "file", remoteObjectId: remoteId("A"), trashed: false } },
    { kind: "removed", remoteObjectId: remoteId("B"), lastKnownPath: path("B.md") },
  ]);

  let backlog: readonly DurableRemoteChangeBatch[] = [];
  backlog = appendDurableRemoteChangeBatch(backlog, first);
  backlog = appendDurableRemoteChangeBatch(backlog, second);
  backlog = appendDurableRemoteChangeBatch(backlog, third);

  assert.deepEqual(backlog.map(batch => String(batch.checkpoint.batchId)), ["batch:1", "batch:2", "batch:3"]);
  assert.equal(backlog[0]?.changes[0]?.kind, "removed");
  assert.equal(backlog[2]?.changes.length, 2);
  assert.equal(appendDurableRemoteChangeBatch(backlog, second), backlog);
});

test("foundation semantic validation has a fail-closed extensibility code", () => {
  const issue: SemanticStateValidationIssue = {
    code: "other-semantic-inconsistency",
    invariantCategory: "newly-discovered-impossible-state",
    detail: "state contradiction must enter recovery rather than be trusted",
  };
  assert.equal(issue.code, "other-semantic-inconsistency");
  assert.equal(issue.invariantCategory, "newly-discovered-impossible-state");
});

test("foundation merge resource policy fails closed for unknown and oversized inputs", () => {
  const policy = { maximumInputBytesPerVersion: 10, maximumCombinedInputBytes: 20 };
  assert.deepEqual(assessTextMergeEligibility([4, 5, 6], policy), { eligible: true });
  assert.deepEqual(assessTextMergeEligibility([4, undefined, 6], policy), { eligible: false, reason: "size-unknown" });
  assert.deepEqual(assessTextMergeEligibility([11, 1, 1], policy), { eligible: false, reason: "version-too-large" });
  assert.deepEqual(assessTextMergeEligibility([8, 8, 8], policy), { eligible: false, reason: "combined-input-too-large" });
});
