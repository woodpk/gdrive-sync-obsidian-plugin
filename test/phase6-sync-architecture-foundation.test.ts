import assert from "node:assert/strict";
import test from "node:test";
import {
  assessTextMergeEligibility,
  classifyRemoteChangePage,
  contractId,
  exactBaseAuthorityMatches,
  localTransactionRecoveryAction,
  resolveRemotePathCandidates,
  restartRecoveryDirective,
  type BaseFingerprint,
  type ChangeCursor,
  type LocalMutationTransaction,
  type LocalMutationTransactionId,
  type MutationIntentId,
  type OperationId,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type VaultPath,
} from "../src/contracts";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const cursor = (value: string) => id<"ChangeCursor">(value) as ChangeCursor;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const fingerprint = (value: string) => id<"BaseFingerprint">(value) as BaseFingerprint;
const operationId = id<"OperationId">("op:foundation") as OperationId;
const intentId = id<"MutationIntentId">("intent:foundation") as MutationIntentId;
const transactionId = id<"LocalMutationTransactionId">("local-tx:foundation") as LocalMutationTransactionId;

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

test("foundation restart contract reconciles ambiguous mutation stages and finishes verified commits", () => {
  const common = { operationId, intentId, path: path("note.md"), semanticAuthority: { generation: generation("semantic:1") } };
  assert.deepEqual(restartRecoveryDirective({ ...common, stage: "mutation-dispatched" }), { action: "reconcile-physical-reality" });
  assert.deepEqual(restartRecoveryDirective({ ...common, stage: "outcome-unknown" }), { action: "reconcile-physical-reality" });
  assert.deepEqual(restartRecoveryDirective({ ...common, stage: "effect-verified", verificationEvidenceRef: "sha256:proof" }), { action: "finish-authoritative-state-commit", verificationEvidenceRef: "sha256:proof" });
});

test("foundation local transaction contract exposes restart recovery at every durable swap boundary", () => {
  const transaction: Omit<LocalMutationTransaction, "stage"> = {
    transactionId,
    operationId,
    path: path("note.md"),
    stagePath: path(".note.stage"),
    backupPath: path(".note.backup"),
    expectedNewEvidence: { sizeBytes: 4 },
  };
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "staged-unverified" }), "discard-unverified-stage");
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "staged-verified" }), "verify-stage");
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "backup-established" }), "restore-or-complete-swap");
  assert.equal(localTransactionRecoveryAction({ ...transaction, stage: "swap-committed" }), "cleanup-backup");
});

test("foundation merge resource policy fails closed for unknown and oversized inputs", () => {
  const policy = { maximumInputBytesPerVersion: 10, maximumCombinedInputBytes: 20 };
  assert.deepEqual(assessTextMergeEligibility([4, 5, 6], policy), { eligible: true });
  assert.deepEqual(assessTextMergeEligibility([4, undefined, 6], policy), { eligible: false, reason: "size-unknown" });
  assert.deepEqual(assessTextMergeEligibility([11, 1, 1], policy), { eligible: false, reason: "version-too-large" });
  assert.deepEqual(assessTextMergeEligibility([8, 8, 8], policy), { eligible: false, reason: "combined-input-too-large" });
});
