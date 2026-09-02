import assert from "node:assert/strict";
import test from "node:test";
import {
  OperationalFailureError,
  contractId,
  operationalFailureDisposition,
  operationalFailureFromDriveSignal,
  operationalFailureProvenanceFromError,
  unclassifiedOperationalFailure,
  type BinaryContentSource,
  type ExecutionResult,
  type LocalMutationTransaction,
  type LocalTransactionResult,
  type OperationalFailureProvenance,
  type RemoteMutationOutcome,
} from "../src/contracts";

const operationId = contractId<"OperationId">("failure-prov-op");
const transactionId = contractId<"LocalMutationTransactionId">("failure-prov-tx");
const path = contractId<"VaultPath">("10-Notes/failure-provenance.md");
const stagePath = contractId<"VaultPath">(".sync-stage/failure-provenance.md");
const backupPath = contractId<"VaultPath">(".sync-backup/failure-provenance.md");
const transaction: LocalMutationTransaction = {
  transactionId,
  operationId,
  path,
  stagePath,
  backupPath,
  stage: "staging",
  mutationKind: "create",
  expectedEntityKind: "file",
  expectedNewEvidence: { algorithm: "sha256", hash: contractId<"ContentHash">("hash-new"), sizeBytes: 1 },
  expectedTarget: { status: "expected-absent" },
};

async function captureLazyFailure(provenance: OperationalFailureProvenance): Promise<OperationalFailureProvenance | undefined> {
  const content: BinaryContentSource = {
    async *openChunks() {
      throw new OperationalFailureError(provenance);
    },
  };
  try {
    for await (const _chunk of content.openChunks()) {
      void _chunk;
    }
  } catch (error) {
    return operationalFailureProvenanceFromError(error);
  }
  return undefined;
}

test("foundation v1.3: authentication during lazy download preserves uncertainty and auth provenance", async () => {
  const provenance = await captureLazyFailure({ kind: "authentication-required", origin: "remote", detail: "token revoked" });
  const result: LocalTransactionResult = { status: "outcome-unknown", reason: "stage write may have begun", transaction, operationalFailure: provenance };
  assert.equal(result.status, "outcome-unknown");
  assert.equal(result.operationalFailure?.kind, "authentication-required");
  assert.deepEqual(operationalFailureDisposition(result.operationalFailure!), { status: "authentication-required", retry: "after-reauthentication" });
});

test("foundation v1.3: transient lazy download failure remains physically uncertain and operationally deferred", async () => {
  const provenance = await captureLazyFailure({ kind: "transient-failure", origin: "remote", detail: "network reset" });
  const result: LocalTransactionResult = { status: "outcome-unknown", reason: "local transaction requires recovery", transaction, operationalFailure: provenance };
  assert.equal(result.status, "outcome-unknown");
  assert.deepEqual(operationalFailureDisposition(result.operationalFailure!), { status: "deferred", retry: "bounded-backoff" });
});

test("foundation v1.3: lazy rate limit preserves exact retryAfterMs without changing physical certainty", async () => {
  const provenance = await captureLazyFailure({ kind: "rate-limited", origin: "remote", retryAfterMs: 5000 });
  const result: LocalTransactionResult = { status: "outcome-unknown", reason: "stage effect uncertain", transaction, operationalFailure: provenance };
  assert.equal(result.status, "outcome-unknown");
  assert.equal(result.operationalFailure?.kind, "rate-limited");
  assert.equal(result.operationalFailure?.kind === "rate-limited" ? result.operationalFailure.retryAfterMs : undefined, 5000);
  assert.deepEqual(operationalFailureDisposition(result.operationalFailure!), { status: "deferred", retry: "bounded-backoff", retryAfterMs: 5000 });
});

test("foundation v1.3: generic local I/O uncertainty does not fabricate remote retry provenance", () => {
  const result: LocalTransactionResult = { status: "outcome-unknown", reason: "local rename result unknown", transaction };
  assert.equal(result.status, "outcome-unknown");
  assert.equal(result.operationalFailure, undefined);
  assert.equal(operationalFailureProvenanceFromError(new Error("ECONNRESET-looking text is not authority")), undefined);
});

test("foundation v1.3: remote lost response retains both outcome-unknown and structured failure provenance", () => {
  const remote: RemoteMutationOutcome = {
    status: "outcome-unknown",
    reason: "response lost after dispatch",
    operationalFailure: operationalFailureFromDriveSignal({ kind: "transient-failure", detail: "connection dropped" }),
  };
  assert.equal(remote.status, "outcome-unknown");
  assert.equal(remote.operationalFailure?.kind, "transient-failure");
});

test("foundation v1.3: operational provenance cannot erase verified-not-applied versus outcome-unknown", () => {
  const provenance = operationalFailureFromDriveSignal({ kind: "authentication-required", detail: "reauth" });
  const notApplied: RemoteMutationOutcome = { status: "verified-not-applied", reason: "pre-dispatch authorization rejected", operationalFailure: provenance };
  const unknown: RemoteMutationOutcome = { status: "outcome-unknown", reason: "dispatch occurred before auth failure surfaced", operationalFailure: provenance };
  assert.notEqual(notApplied.status, unknown.status);
  assert.equal(notApplied.operationalFailure?.kind, unknown.operationalFailure?.kind);
});

test("foundation v1.3: execution boundary retains durable recovery truth separately from user/retry disposition", () => {
  const result: ExecutionResult = {
    status: "uncertain",
    reason: "dispatch-authorized effect requires physical reconciliation",
    operationalFailure: { kind: "rate-limited", origin: "remote", retryAfterMs: 5000 },
  };
  assert.equal(result.status, "uncertain");
  assert.deepEqual(operationalFailureDisposition(result.operationalFailure!), { status: "deferred", retry: "bounded-backoff", retryAfterMs: 5000 });
});

test("foundation v1.3: unknown future operational cause is conservative and never guessed retryable", () => {
  const provenance = unclassifiedOperationalFailure("remote", "future provider failure category");
  assert.deepEqual(operationalFailureDisposition(provenance), { status: "recovery-required", retry: "none" });
});
