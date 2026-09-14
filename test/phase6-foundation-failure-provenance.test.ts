import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OperationalFailureErrorV1_3,
  contractId,
  executionDispositionV1_3,
  operationalFailureFromDriveSignalV1_3,
  operationalFailureProvenanceFromErrorV1_3,
  type BinaryContentSource,
  type ExecutionResultV1_3,
  type LocalMutationTransaction,
  type LocalTransactionResultV1_3,
  type OperationalFailureProvenanceV1_3,
  type RemoteMutationOutcomeV1_3,
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

async function captureLazyFailure(provenance: OperationalFailureProvenanceV1_3): Promise<OperationalFailureProvenanceV1_3 | undefined> {
  const content: BinaryContentSource = {
    async *openChunks() {
      throw new OperationalFailureErrorV1_3(provenance);
    },
  };
  try {
    for await (const chunk of content.openChunks()) void chunk;
  } catch (error) {
    return operationalFailureProvenanceFromErrorV1_3(error);
  }
  return undefined;
}

function gitBlobSha1(bytes: Buffer): string {
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

const predecessorPrefixes = [
  ["src/contracts/common.ts", 2559, "4048ceca9bd2a5022ededf7406a736360330572c"],
  ["src/contracts/google-drive.ts", 5457, "dc331d4acd1e7d9c308c0df73232497bf5d85d55"],
  ["src/contracts/execution.ts", 3107, "7fd20c94d5852f14bc223b6e5e0280d60fbb5776"],
  ["dev/planning-and-building/phase6-sync-contract-freeze.md", 16296, "fe527c76137b2cd578ef7050ee3444498b21a5e0"],
  ["dev/planning-and-building/phase6-sync-architecture-foundation.md", 14429, "f67d8ff67ff1915610e5a21ddc3d113c94a2f94b"],
] as const;

// Compile-time negative proof: Drive authentication provenance cannot claim a local source.
// @ts-expect-error V1.3 source/category combinations are invalid by construction.
const invalidLocalAuthentication: OperationalFailureProvenanceV1_3 = { kind: "authentication-required", source: "local" };
void invalidLocalAuthentication;

// Compile-time negative proof: V1.3 execution has no second top-level retry timing authority.
// @ts-expect-error retryAfterMs belongs only to rate-limited operationalFailure provenance.
const contradictoryRetryTiming: ExecutionResultV1_3 = { status: "retryable-failure", reason: "429", operationalFailure: { kind: "rate-limited", source: "google-drive", retryAfterMs: 5000 }, retryAfterMs: 1, retrySafety: { status: "verified-no-unresolved-effect", basis: "verified-not-applied" } };
void contradictoryRetryTiming;

// Compile-time negative proof: retryable failure cannot omit physical retry-safety authority.
// @ts-expect-error transient cause alone never proves redispatch safety.
const retryWithoutPhysicalSafety: ExecutionResultV1_3 = { status: "retryable-failure", reason: "network", operationalFailure: { kind: "transient-failure", source: "google-drive" } };
void retryWithoutPhysicalSafety;

// Compile-time negative proof: physically safe authentication cannot omit no-unresolved-effect authority.
// @ts-expect-error authentication cause alone never proves physical safety.
const safeAuthenticationWithoutPhysicalSafety: ExecutionResultV1_3 = { status: "authentication-required", reason: "no token", operationalFailure: { kind: "authentication-required", source: "google-drive" } };
void safeAuthenticationWithoutPhysicalSafety;

test("foundation v1.3 C1: Drive authentication maps to public provenance and survives lazy carrier/extractor", async () => {
  const mapped = operationalFailureFromDriveSignalV1_3({ kind: "authentication-required", detail: "token revoked" });
  assert.deepEqual(mapped, { kind: "authentication-required", source: "google-drive", detail: "token revoked" });
  assert.deepEqual(await captureLazyFailure(mapped!), mapped);
});

test("foundation v1.3 C2: transient Drive failure maps to public provenance", () => {
  assert.deepEqual(operationalFailureFromDriveSignalV1_3({ kind: "transient-failure", detail: "network reset" }), {
    kind: "transient-failure", source: "google-drive", detail: "network reset",
  });
});

test("foundation v1.3 C3: rate-limit mapping preserves exactly retryAfterMs 5000", () => {
  assert.deepEqual(operationalFailureFromDriveSignalV1_3({ kind: "rate-limited", retryAfterMs: 5000 }), {
    kind: "rate-limited", source: "google-drive", retryAfterMs: 5000,
  });
});

test("foundation v1.3 C4: not-found has no context-free operational recovery provenance", () => {
  assert.equal(operationalFailureFromDriveSignalV1_3({ kind: "not-found", remoteObjectId: contractId<"RemoteObjectId">("missing") }), undefined);
});

test("foundation v1.3 C5: conflict has no context-free operational recovery provenance", () => {
  assert.equal(operationalFailureFromDriveSignalV1_3({ kind: "conflict", detail: "context owns meaning" }), undefined);
});

test("foundation v1.3 C6: generic local I/O uncertainty fabricates no remote provenance", () => {
  const result: LocalTransactionResultV1_3 = { status: "outcome-unknown", reason: "local rename result unknown", transaction };
  assert.equal(result.operationalFailure, undefined);
  assert.equal(operationalFailureProvenanceFromErrorV1_3(new Error("ECONNRESET-looking text is not authority")), undefined);
});

test("foundation v1.3 C7: physically unknown remote mutation plus transient provenance remains physically unknown", () => {
  const result: RemoteMutationOutcomeV1_3 = {
    status: "outcome-unknown",
    reason: "response lost after dispatch",
    operationalFailure: { kind: "transient-failure", source: "google-drive" },
  };
  assert.equal(result.status, "outcome-unknown");
  assert.equal(result.operationalFailure?.kind, "transient-failure");
});

test("foundation v1.3 C8: verified-not-applied and outcome-unknown remain distinct under same operational cause", () => {
  const provenance = { kind: "authentication-required", source: "google-drive" } as const;
  const safe: RemoteMutationOutcomeV1_3 = { status: "verified-not-applied", reason: "rejected before application", operationalFailure: provenance };
  const unknown: RemoteMutationOutcomeV1_3 = { status: "outcome-unknown", reason: "dispatch may have occurred", operationalFailure: provenance };
  assert.notEqual(safe.status, unknown.status);
  assert.deepEqual(safe.operationalFailure, unknown.operationalFailure);
});

test("foundation v1.3 T3: verified-not-applied authentication preserves safe execution without fabricated reconciliation", () => {
  const result: ExecutionResultV1_3 = {
    status: "authentication-required",
    reason: "no usable token before dispatch",
    operationalFailure: { kind: "authentication-required", source: "google-drive" },
    effectSafety: { status: "verified-no-unresolved-effect", basis: "pre-dispatch-rejection" },
  };
  assert.deepEqual(executionDispositionV1_3(result), {
    primary: "authentication-required",
    physicalReconciliationRequired: false,
    physicalRedispatchSafe: true,
    retryMode: "reauthenticate-then-retry",
    mutationRedispatchAuthorized: false,
  });
});

test("foundation v1.3 C9: uncertain authentication surfaces auth while requiring physical reconciliation", () => {
  const disposition = executionDispositionV1_3({
    status: "uncertain",
    reason: "dispatch-authorized effect unresolved",
    operationalFailure: { kind: "authentication-required", source: "google-drive" },
  });
  assert.deepEqual(disposition, {
    primary: "authentication-required",
    physicalReconciliationRequired: true,
    physicalRedispatchSafe: false,
    retryMode: "reauthenticate-then-reconcile",
    mutationRedispatchAuthorized: false,
  });
});

test("foundation v1.3 C10: uncertain rate limit preserves timing and forbids redispatch until reconciliation", () => {
  const disposition = executionDispositionV1_3({
    status: "uncertain",
    reason: "may-have-dispatched",
    operationalFailure: { kind: "rate-limited", source: "google-drive", retryAfterMs: 5000 },
  });
  assert.deepEqual(disposition, {
    primary: "deferred",
    physicalReconciliationRequired: true,
    physicalRedispatchSafe: false,
    retryMode: "reconcile-before-redispatch",
    retryAfterMs: 5000,
    mutationRedispatchAuthorized: false,
  });
});

test("foundation v1.3 C11: uncertain result without provenance becomes conservative recovery", () => {
  assert.deepEqual(executionDispositionV1_3({ status: "uncertain", reason: "unknown physical reality" }), {
    primary: "recovery-required",
    physicalReconciliationRequired: true,
    physicalRedispatchSafe: false,
    retryMode: "reconcile-before-redispatch",
    mutationRedispatchAuthorized: false,
  });
});

test("foundation v1.3 C12: ordinary retry requires explicit no-unresolved-effect physical authority", () => {
  const result: ExecutionResultV1_3 = {
    status: "retryable-failure",
    reason: "verified rejection",
    operationalFailure: { kind: "transient-failure", source: "google-drive" },
    retrySafety: { status: "verified-no-unresolved-effect", basis: "verified-not-applied", verificationEvidenceRef: "proof-1" },
  };
  assert.deepEqual(executionDispositionV1_3(result), {
    primary: "deferred",
    physicalReconciliationRequired: false,
    physicalRedispatchSafe: true,
    retryMode: "ordinary-retry",
    mutationRedispatchAuthorized: false,
  });
});

test("foundation v1.3 C13: rate-limit timing has one execution authority", () => {
  const result: ExecutionResultV1_3 = {
    status: "retryable-failure",
    reason: "429 verified not applied",
    operationalFailure: { kind: "rate-limited", source: "google-drive", retryAfterMs: 5000 },
    retrySafety: { status: "verified-no-unresolved-effect", basis: "verified-not-applied" },
  };
  assert.equal("retryAfterMs" in result, false);
  assert.deepEqual(executionDispositionV1_3(result), { primary: "deferred", physicalReconciliationRequired: false, physicalRedispatchSafe: true, retryMode: "ordinary-retry", retryAfterMs: 5000, mutationRedispatchAuthorized: false });
});

test("foundation v1.3 C14: recovery-required physical state cannot be erased by operational metadata", () => {
  assert.deepEqual(executionDispositionV1_3({
    status: "recovery-required",
    reason: "durable physical recovery required",
    operationalFailure: { kind: "recovery-required", source: "google-drive", detail: "cursor invalid" },
  }), {
    primary: "recovery-required",
    physicalReconciliationRequired: true,
    physicalRedispatchSafe: false,
    retryMode: "reconcile-before-redispatch",
    mutationRedispatchAuthorized: false,
  });
});

test("foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes", () => {
  for (const [file, predecessorSize, predecessorBlobSha] of predecessorPrefixes) {
    const current = readFileSync(file);
    assert.ok(current.length > predecessorSize, `${file} must append successor material`);
    assert.equal(gitBlobSha1(current.subarray(0, predecessorSize)), predecessorBlobSha, `${file} predecessor prefix changed`);
  }
  const untouchedFoundation = readFileSync("src/contracts/synchronization-foundation.ts");
  assert.equal(gitBlobSha1(untouchedFoundation), "fde30f9ed2b13b878476759c3c0f4d7ddbbc5af6");
});

test("foundation v1.3 C16: documentation succession material is appended after approved predecessor prefixes", () => {
  const freeze = readFileSync("dev/planning-and-building/phase6-sync-contract-freeze.md");
  const architecture = readFileSync("dev/planning-and-building/phase6-sync-architecture-foundation.md");
  const freezeHeading = Buffer.from("## 12. V1.3 APPEND-ONLY FAILURE-PROVENANCE SUCCESSION CANDIDATE");
  const architectureHeading = Buffer.from("## 17. V1.3 APPEND-ONLY OPERATIONAL-FAILURE PROVENANCE ARCHITECTURE");
  assert.ok(freeze.indexOf(freezeHeading) >= 16296);
  assert.ok(architecture.indexOf(architectureHeading) >= 14429);
  const freezeText = freeze.toString("utf8");
  assert.match(freezeText, /Deprecation does not delete or rewrite predecessor contract history/);
  assert.match(freezeText, /ReliableRemoteMutationPortV1_3/);
  assert.match(freezeText, /ExecutionResultV1_3/);
});
