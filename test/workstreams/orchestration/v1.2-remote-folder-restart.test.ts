import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BaseFingerprint,
  type MutationIntentId,
  type OperationId,
  type PathConvergenceState,
  type RecoverableMutationEffectV1_1,
  type RecoverableOperationIntentV1_1,
  type RemoteFolderCreateObservation,
  type RemoteFolderCreatePhysicalMutationDescriptor,
  type RemoteFolderCreateRecoveryReadPort,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type VaultPath,
} from "../../../src/contracts";
import {
  recoverRemoteFolderEffectV1_2,
  recoverRemoteFolderIntentsV1_2,
  resolveAuthorityCompleteOperation,
} from "../../../src/core/execution-coordinator";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const fingerprint = (value: string) => id<"BaseFingerprint">(value) as BaseFingerprint;
const persistence = (value: string) => id<"StateRevision">(value) as StateRevision;
const operationId = (value: string) => id<"OperationId">(value) as OperationId;

function descriptor(target = "empty/remote", suffix = "a"): RemoteFolderCreatePhysicalMutationDescriptor {
  const targetPath = path(target);
  const mutationIntentId = id<"MutationIntentId">(`intent:v1.2:${suffix}`) as MutationIntentId;
  return {
    kind: "remote-folder-create",
    targetSide: "remote",
    mutationKind: "create",
    intentId: mutationIntentId,
    targetPath,
    parentRemoteObjectId: remoteId(`parent:${suffix}`),
    pathAuthority: {
      generation: generation("semantic:v1.2:d"),
      targetPath,
      parentPath: path(target.includes("/") ? target.slice(0, target.lastIndexOf("/")) : ""),
      pathComparisonKey: target,
      expectedTarget: "absent",
    },
    remoteMutation: {
      kind: "reserved-folder-create",
      intentId: mutationIntentId,
      reservedRemoteObjectId: remoteId(`reserved:${suffix}`),
      path: targetPath,
    },
  };
}

function effect(stage: RecoverableMutationEffectV1_1["stage"], value = descriptor()): RecoverableMutationEffectV1_1 {
  return { effectId: `effect:${String(value.intentId)}:${stage}`, descriptor: value, stage };
}

function convergence(value: RemoteFolderCreatePhysicalMutationDescriptor, state: "converged" | "unknown" = "unknown"): PathConvergenceState {
  return state === "converged"
    ? { status: "converged", generation: value.pathAuthority.generation, baseFingerprint: fingerprint(`base:${String(value.targetPath)}`) }
    : { status: "unknown", reasonCode: "logical-path-not-yet-converged" };
}

class ScriptedReader implements RemoteFolderCreateRecoveryReadPort {
  calls = 0;
  readonly seen: RemoteFolderCreatePhysicalMutationDescriptor[] = [];
  constructor(private readonly observe: (value: RemoteFolderCreatePhysicalMutationDescriptor) => RemoteFolderCreateObservation) {}
  async observeFolderCreateRecovery(value: RemoteFolderCreatePhysicalMutationDescriptor): Promise<RemoteFolderCreateObservation> {
    this.calls += 1;
    this.seen.push(value);
    return this.observe(value);
  }
}

const correctFolder = (value: RemoteFolderCreatePhysicalMutationDescriptor): RemoteFolderCreateObservation => ({
  status: "folder",
  targetPath: value.targetPath,
  pathComparisonKey: value.pathAuthority.pathComparisonKey,
  remoteObjectId: value.remoteMutation.reservedRemoteObjectId,
  parentRemoteObjectId: value.parentRemoteObjectId,
});

test("D v1.2 authority boundary replaces nominal BASE and identity markers with exact frozen authority", () => {
  const target = path("notes/a.md");
  const rid = remoteId("remote:a");
  const authority: SynchronizationAuthorityMetadataV1_1 = {
    persistenceRevision: persistence("p:1"),
    semanticGeneration: generation("semantic:authority"),
    learnedRemoteBatches: [],
    pathConvergence: [{ path: target, state: { status: "converged", generation: generation("semantic:authority"), baseFingerprint: fingerprint("base:a") } }],
    operationIntents: [],
    localTransactions: [],
  };
  const result = resolveAuthorityCompleteOperation({
    operationId: operationId("op:authority"),
    kind: "upload-update",
    path: target,
    targetSide: "remote",
    remoteObjectId: rid,
    destructive: false,
    preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path: target }],
    reasons: [],
  }, authority, [{ path: target, entityKind: "file", remoteObjectId: rid }]);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.operation.authorityComplete, true);
  const kinds: string[] = result.operation.preconditions.map(item => item.kind);
  assert.equal(kinds.includes("base-trusted"), false);
  assert.equal(kinds.includes("identity-unambiguous"), false);
  assert.deepEqual(kinds, ["base-authority", "identity-authority"]);
});

test("D v1.2 restart from dispatch-authorized observes physical reality before retry eligibility", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(correctFolder);
  const result = await recoverRemoteFolderEffectV1_2(effect("dispatch-authorized", value), convergence(value), reader);
  assert.equal(reader.calls, 1);
  assert.equal(result.status, "effect-verified-awaiting-convergence");
});

test("D v1.2 restart from outcome-unknown also observes physical reality before retry eligibility", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(correctFolder);
  const result = await recoverRemoteFolderEffectV1_2(effect("outcome-unknown", value), convergence(value), reader);
  assert.equal(reader.calls, 1);
  assert.equal(result.status, "effect-verified-awaiting-convergence");
});

test("D v1.2 correctly observed reserved folder is physical proof but not commit authority without convergence", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(correctFolder);
  const result = await recoverRemoteFolderEffectV1_2(effect("dispatch-authorized", value), convergence(value, "unknown"), reader);
  assert.equal(result.status, "effect-verified-awaiting-convergence");
});

test("D v1.2 correctly observed reserved folder becomes commit-eligible only with converged path authority", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(correctFolder);
  const result = await recoverRemoteFolderEffectV1_2(effect("dispatch-authorized", value), convergence(value, "converged"), reader);
  assert.equal(result.status, "authoritative-commit-eligible");
});

test("D v1.2 wrong actual parent remains conflict-preserved", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(candidate => ({ ...correctFolder(candidate), parentRemoteObjectId: remoteId("parent:wrong") }));
  const result = await recoverRemoteFolderEffectV1_2(effect("outcome-unknown", value), convergence(value, "converged"), reader);
  assert.equal(result.status, "conflict-preserved");
});

test("D v1.2 wrong actual structural path remains conflict-preserved", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(candidate => ({ ...correctFolder(candidate), targetPath: path("wrong/remote"), pathComparisonKey: "wrong/remote" }));
  const result = await recoverRemoteFolderEffectV1_2(effect("dispatch-authorized", value), convergence(value, "converged"), reader);
  assert.equal(result.status, "conflict-preserved");
});

test("D v1.2 occupied logical target cannot become verified-not-applied retry authority", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(candidate => ({
    status: "occupied",
    targetPath: candidate.targetPath,
    pathComparisonKey: candidate.pathAuthority.pathComparisonKey,
    remoteObjectId: remoteId("independent:occupant"),
    entityKind: "folder",
  }));
  const result = await recoverRemoteFolderEffectV1_2(effect("dispatch-authorized", value), convergence(value), reader);
  assert.equal(result.status, "conflict-preserved");
});

test("D v1.2 authoritative reserved-ID absence and clear target can become safe retry eligibility", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(candidate => ({ status: "authoritative-absent", reservedRemoteObjectId: candidate.remoteMutation.reservedRemoteObjectId }));
  const result = await recoverRemoteFolderEffectV1_2(effect("outcome-unknown", value), convergence(value), reader);
  assert.equal(result.status, "safe-retry-eligible");
});

test("D v1.2 incomplete recovery observation remains recovery-pending", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(() => ({ status: "unobservable", reason: "parent-evidence-incomplete" }));
  const result = await recoverRemoteFolderEffectV1_2(effect("dispatch-authorized", value), convergence(value), reader);
  assert.equal(result.status, "recovery-pending");
});

test("D v1.2 unrelated sibling effects are independently classified while one recovery is conflicted", async () => {
  const conflicted = descriptor("folder/conflicted", "conflict");
  const safe = descriptor("folder/safe", "safe");
  const intents: RecoverableOperationIntentV1_1[] = [conflicted, safe].map((value, index) => ({
    logicalKind: "single-effect",
    operationId: operationId(`op:sibling:${index}`),
    intentId: value.intentId,
    semanticAuthority: { generation: value.pathAuthority.generation },
    effects: [effect("dispatch-authorized", value)],
  }));
  const authority: SynchronizationAuthorityMetadataV1_1 = {
    persistenceRevision: persistence("p:siblings"),
    semanticGeneration: generation("semantic:v1.2:d"),
    learnedRemoteBatches: [],
    pathConvergence: [
      { path: conflicted.targetPath, state: convergence(conflicted, "unknown") },
      { path: safe.targetPath, state: convergence(safe, "unknown") },
    ],
    operationIntents: intents,
    localTransactions: [],
  };
  const reader = new ScriptedReader(candidate => candidate.targetPath === conflicted.targetPath
    ? { status: "occupied", targetPath: candidate.targetPath, pathComparisonKey: candidate.pathAuthority.pathComparisonKey, remoteObjectId: remoteId("independent:conflict"), entityKind: "folder" }
    : { status: "authoritative-absent", reservedRemoteObjectId: candidate.remoteMutation.reservedRemoteObjectId });
  const results = await recoverRemoteFolderIntentsV1_2(authority, reader);
  assert.equal(reader.calls, 2);
  assert.deepEqual(results.map(item => item.decision.status), ["conflict-preserved", "safe-retry-eligible"]);
});

test("D v1.2 restart never re-observes or duplicates a state-committed folder create", async () => {
  const value = descriptor();
  const reader = new ScriptedReader(() => { throw new Error("committed effect must not be observed or redispatched"); });
  const result = await recoverRemoteFolderEffectV1_2(effect("state-committed", value), convergence(value, "converged"), reader);
  assert.equal(result.status, "already-committed");
  assert.equal(reader.calls, 0);
});