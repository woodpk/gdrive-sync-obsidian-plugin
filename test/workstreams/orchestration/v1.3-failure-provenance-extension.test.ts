import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  executionDispositionV1_3,
  type ExecutablePlannedOperation,
  type LocalTransactionResultV1_3,
  type OperationalFailureProvenanceV1_3,
  type PersistenceRevision,
  type RemoteMutationOutcomeV1_3,
  type RemoteObjectId,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultPath,
} from "../../../src/contracts";
import { createAuthoritativeProductExecutorV1_3 } from "../../../src/product/authoritative-production-executor";

const id = <T extends string>(value: string) => contractId<T>(value);
const p = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const rev = (value: string) => id<"StateRevision">(value) as StateRevision;
const generation = id<"SemanticStateGeneration">("g:v1.3-D");
const vault = id<"VaultIdentity">("vault:v1.3-D");
const device = id<"DeviceIdentity">("device:v1.3-D");
const managedRemote = { rootId: rid("root:v1.3-D"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const stateContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device } as const;
const hash = id<"ContentHash">("hash:v1.3-D");
const bytes = { sizeBytes: 3, async *openChunks() { yield new Uint8Array([1, 2, 3]); } };

class Authority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1;
  saves = 0;
  constructor(path: VaultPath) {
    this.value = {
      persistenceRevision: rev("authority:1") as PersistenceRevision,
      semanticGeneration: generation,
      learnedRemoteBatches: [],
      pathConvergence: [{ path, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">(`base:${String(path)}`) } }],
      operationIntents: [],
      localTransactions: [],
    };
  }
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    assert.equal(expected, this.value.persistenceRevision);
    this.saves += 1;
    const persistenceRevision = rev(`authority:${this.saves + 1}`) as PersistenceRevision;
    this.value = { ...candidate, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: generation };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> {
    return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: generation };
  }
}

function uploadOperation(path: VaultPath, operationId: string): ExecutablePlannedOperation {
  return {
    authorityComplete: true,
    operationId: id<"OperationId">(operationId),
    kind: "upload-create",
    path,
    targetSide: "remote",
    destructive: false,
    reasons: [],
    contentVersion: { path, entityKind: "file", content: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">(`token:${operationId}`) },
    preconditions: [{ kind: "base-authority", authority: { generation, path, fingerprint: id<"BaseFingerprint">(`base:${String(path)}`) } }],
  };
}

function downloadOperation(path: VaultPath, operationId: string): ExecutablePlannedOperation {
  const remoteObjectId = rid(`remote:${operationId}`);
  return {
    authorityComplete: true,
    operationId: id<"OperationId">(operationId),
    kind: "download-create",
    path,
    targetSide: "local",
    remoteObjectId,
    destructive: false,
    reasons: [],
    contentVersion: { path, entityKind: "file", remoteObjectId, content: { hash, sizeBytes: 3 } },
    preconditions: [{ kind: "base-authority", authority: { generation, path, fingerprint: id<"BaseFingerprint">(`base:${String(path)}`) } }],
  };
}

function harness(
  path: VaultPath,
  remoteOutcome: RemoteMutationOutcomeV1_3,
  localStageResult?: (transaction: any) => LocalTransactionResultV1_3,
) {
  const authority = new Authority(path);
  const canonical: TrustedSynchronizationState = {
    schemaVersion: 1,
    stateRevision: rev("state:1"),
    vaultIdentity: vault,
    deviceIdentity: device,
    base: [],
    remoteMappings: [],
    tombstones: [],
    operations: [],
    knownDevices: [],
  };
  const stateStore = { load: async () => ({ status: "trusted" as const, state: canonical }) };
  let remoteMutationCalls = 0;
  const legacy = {
    local: {
      observe: async (target: VaultPath) => ({ status: "absent" as const, side: "local" as const, path: target, stability: "stable" as const }),
      readFile: async (target: VaultPath) => ({ content: bytes, evidence: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">(`read:${String(target)}`) }),
      createFolder: async () => undefined,
      move: async () => undefined,
      trash: async () => undefined,
    },
    drive: {
      download: async () => ({ ok: true as const, value: { content: bytes, evidence: { hash, sizeBytes: 3 } } }),
      listForReconciliation: async () => ({ ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } }),
    },
    validatePreconditions: async () => ({ status: "valid" as const }),
    versionStillCurrent: async () => true,
    runEvidence: () => ({ managedRemote, remoteEnumerationComplete: true }),
  };
  const remotePort = {
    async reserveFileCreateIdentity(_root: unknown, intentId: unknown, target: VaultPath, intendedContent: unknown) {
      return { ok: true as const, value: { kind: "reserved-file-create" as const, intentId, reservedRemoteObjectId: rid(`reserved:${String(target)}`), path: target, intendedContent } };
    },
    async reserveFolderCreateIdentity(_root: unknown, intentId: unknown, target: VaultPath) {
      return { ok: true as const, value: { kind: "reserved-folder-create" as const, intentId, reservedRemoteObjectId: rid(`reserved-folder:${String(target)}`), path: target } };
    },
    async createReserved() { remoteMutationCalls += 1; return remoteOutcome; },
    async updateExisting() { remoteMutationCalls += 1; return remoteOutcome; },
    async moveExisting() { remoteMutationCalls += 1; return remoteOutcome; },
    async trashExisting() { remoteMutationCalls += 1; return remoteOutcome; },
  };
  const localPort = {
    async stageAndVerify(transaction: any) {
      return localStageResult?.(transaction) ?? { status: "staged-verified" as const, transaction: { ...transaction, stage: "staged-verified" } };
    },
    async commitVerifiedStage(transaction: any) { return { status: "committed" as const, transaction: { ...transaction, stage: "completed" } }; },
    async recover(transaction: any) { return { status: "outcome-unknown" as const, reason: "restart unresolved", transaction }; },
  };
  const executor = createAuthoritativeProductExecutorV1_3(
    legacy as never,
    authority,
    stateStore as never,
    stateContext as never,
    managedRemote as never,
    { reliableRemoteMutationPort: remotePort as never, localTransactionalMutationPort: localPort as never },
  );
  return { authority, canonical, executor, remoteMutationCalls: () => remoteMutationCalls };
}

const auth: OperationalFailureProvenanceV1_3 = { kind: "authentication-required", source: "google-drive" };
const transient: OperationalFailureProvenanceV1_3 = { kind: "transient-failure", source: "google-drive" };
const rateLimited: OperationalFailureProvenanceV1_3 = { kind: "rate-limited", source: "google-drive", retryAfterMs: 5000 };

test("D V1.3 remote outcome-unknown authentication stays uncertain with unresolved durable effect", async () => {
  const path = p("remote-auth.md");
  const h = harness(path, { status: "outcome-unknown", reason: "opaque-1", operationalFailure: auth });
  const result = await h.executor.execute(uploadOperation(path, "op:remote-auth"));
  assert.equal(result.status, "uncertain");
  assert.deepEqual(result.status === "uncertain" ? result.operationalFailure : undefined, auth);
  assert.equal(h.authority.value.operationIntents[0]?.effects[0]?.stage, "outcome-unknown");
  assert.equal(executionDispositionV1_3(result).physicalRedispatchSafe, false);
});

test("D V1.3 remote outcome-unknown rate-limit preserves exact timing and forbids ordinary redispatch", async () => {
  const path = p("remote-rate.md");
  const h = harness(path, { status: "outcome-unknown", reason: "opaque-2", operationalFailure: rateLimited });
  const result = await h.executor.execute(uploadOperation(path, "op:remote-rate"));
  assert.equal(result.status, "uncertain");
  assert.equal(result.status === "uncertain" && result.operationalFailure?.kind === "rate-limited" ? result.operationalFailure.retryAfterMs : undefined, 5000);
  assert.deepEqual(executionDispositionV1_3(result), {
    primary: "deferred", physicalReconciliationRequired: true, physicalRedispatchSafe: false,
    retryMode: "reconcile-before-redispatch", retryAfterMs: 5000, mutationRedispatchAuthorized: false,
  });
});

test("D V1.3 local outcome-unknown transient preserves trustworthy operational provenance", async () => {
  const path = p("local-transient.md");
  const h = harness(path, { status: "outcome-unknown", reason: "unused" }, transaction => ({ status: "outcome-unknown", reason: "opaque-local-1", transaction, operationalFailure: transient }));
  const result = await h.executor.execute(downloadOperation(path, "op:local-transient"));
  assert.equal(result.status, "uncertain");
  assert.deepEqual(result.status === "uncertain" ? result.operationalFailure : undefined, transient);
  assert.equal(h.authority.value.operationIntents[0]?.effects[0]?.stage, "outcome-unknown");
});

test("D V1.3 generic local outcome-unknown fabricates no provenance", async () => {
  const path = p("local-generic.md");
  const h = harness(path, { status: "outcome-unknown", reason: "unused" }, transaction => ({ status: "outcome-unknown", reason: "opaque-local-2", transaction }));
  const result = await h.executor.execute(downloadOperation(path, "op:local-generic"));
  assert.equal(result.status, "uncertain");
  assert.equal(result.status === "uncertain" ? result.operationalFailure : undefined, undefined);
});

test("D V1.3 verified-not-applied authentication emits explicit physical safety authority", async () => {
  const path = p("safe-auth.md");
  const h = harness(path, { status: "verified-not-applied", reason: "opaque-3", operationalFailure: auth });
  const result = await h.executor.execute(uploadOperation(path, "op:safe-auth"));
  assert.deepEqual(result, {
    status: "authentication-required", reason: "opaque-3", operationalFailure: auth,
    effectSafety: { status: "verified-no-unresolved-effect", basis: "verified-not-applied" },
  });
});

test("D V1.3 verified-not-applied transient is retryable only with explicit safety authority", async () => {
  const path = p("safe-transient.md");
  const h = harness(path, { status: "verified-not-applied", reason: "opaque-4", operationalFailure: transient });
  const result = await h.executor.execute(uploadOperation(path, "op:safe-transient"));
  assert.deepEqual(result, {
    status: "retryable-failure", reason: "opaque-4", operationalFailure: transient,
    retrySafety: { status: "verified-no-unresolved-effect", basis: "verified-not-applied" },
  });
});

test("D V1.3 verified-not-applied rate-limit keeps timing only in provenance", async () => {
  const path = p("safe-rate.md");
  const h = harness(path, { status: "verified-not-applied", reason: "opaque-5", operationalFailure: rateLimited });
  const result = await h.executor.execute(uploadOperation(path, "op:safe-rate"));
  assert.equal(result.status, "retryable-failure");
  assert.equal("retryAfterMs" in result, false);
  assert.equal(result.status === "retryable-failure" && result.operationalFailure.kind === "rate-limited" ? result.operationalFailure.retryAfterMs : undefined, 5000);
});

test("D V1.3 uncertain execution never advances canonical BASE/state and restart reconciles before redispatch", async () => {
  const path = p("restart-unknown.md");
  const h = harness(path, { status: "outcome-unknown", reason: "opaque-6", operationalFailure: transient });
  const operation = uploadOperation(path, "op:restart-unknown");
  const first = await h.executor.execute(operation);
  assert.equal(first.status, "uncertain");
  assert.equal(h.canonical.stateRevision, rev("state:1"));
  assert.equal(h.canonical.base.length, 0);
  assert.equal(h.remoteMutationCalls(), 1);
  const second = await h.executor.execute(operation);
  assert.notEqual(second.status, "durable-verified-success");
  assert.equal(h.remoteMutationCalls(), 1, "restart must reconcile durable unresolved state before any redispatch");
  assert.equal(h.authority.value.operationIntents[0]?.effects[0]?.stage, "outcome-unknown");
});
