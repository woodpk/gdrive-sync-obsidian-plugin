import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  recoverRemoteFolderCreate,
  recoverableOperationV1_1RestartRecoveryDirectives,
  type FolderCreatePathAuthority,
  type MutationIntentId,
  type RecoverableOperationIntentV1_1,
  type RemoteFolderCreateObservation,
  type RemoteFolderCreatePhysicalMutationDescriptor,
  type RemoteFolderCreateRecoveryReadPort,
  type RemoteMutationIdentity,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type VaultPath,
} from "../src/contracts";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const intentId = id<"MutationIntentId">("intent:v1.2:remote-folder") as MutationIntentId;

const descriptor = (): RemoteFolderCreatePhysicalMutationDescriptor => {
  const targetPath = path("empty/remote");
  const authority: FolderCreatePathAuthority = {
    generation: generation("semantic:v1.2"),
    targetPath,
    parentPath: path("empty"),
    pathComparisonKey: "empty/remote",
    expectedTarget: "absent",
  };
  const remoteMutation: Extract<RemoteMutationIdentity, { readonly kind: "reserved-folder-create" }> = {
    kind: "reserved-folder-create",
    intentId,
    reservedRemoteObjectId: remoteId("folder:reserved:v1.2"),
    path: targetPath,
  };
  return {
    kind: "remote-folder-create",
    targetSide: "remote",
    mutationKind: "create",
    intentId,
    targetPath,
    parentRemoteObjectId: remoteId("folder:parent:intended"),
    pathAuthority: authority,
    remoteMutation,
  };
};

class ScriptedRecoveryReader implements RemoteFolderCreateRecoveryReadPort {
  readonly seenDescriptors: RemoteFolderCreatePhysicalMutationDescriptor[] = [];
  constructor(private readonly observation: RemoteFolderCreateObservation) {}
  async observeFolderCreateRecovery(value: RemoteFolderCreatePhysicalMutationDescriptor): Promise<RemoteFolderCreateObservation> {
    this.seenDescriptors.push(value);
    return this.observation;
  }
}

const recover = async (observation: RemoteFolderCreateObservation) => {
  const value = descriptor();
  const reader = new ScriptedRecoveryReader(observation);
  const result = await recoverRemoteFolderCreate(value, reader);
  return { value, reader, result };
};

test("v1.2 T1: correct reserved folder under correct observed parent is verified-effect", async () => {
  const value = descriptor();
  const { result } = await recover({
    status: "folder",
    targetPath: value.targetPath,
    pathComparisonKey: value.pathAuthority.pathComparisonKey,
    remoteObjectId: value.remoteMutation.reservedRemoteObjectId,
    parentRemoteObjectId: value.parentRemoteObjectId,
  });
  assert.equal(result.status, "verified-effect");
});

test("v1.2 T2: correct reserved folder under wrong observed parent is conservative conflict", async () => {
  const value = descriptor();
  const { result } = await recover({
    status: "folder",
    targetPath: value.targetPath,
    pathComparisonKey: value.pathAuthority.pathComparisonKey,
    remoteObjectId: value.remoteMutation.reservedRemoteObjectId,
    parentRemoteObjectId: remoteId("folder:parent:actual-other"),
  });
  assert.equal(result.status, "conflict-preserved");
});

test("v1.2 T3: correct reserved ID at wrong structural path is not success", async () => {
  const value = descriptor();
  const { result } = await recover({
    status: "folder",
    targetPath: path("other/remote"),
    pathComparisonKey: "other/remote",
    remoteObjectId: value.remoteMutation.reservedRemoteObjectId,
    parentRemoteObjectId: value.parentRemoteObjectId,
  });
  assert.equal(result.status, "conflict-preserved");
});

test("v1.2 T4: reserved ID missing while intended path is occupied is conflict, not verified-not-applied", async () => {
  const value = descriptor();
  const { result } = await recover({
    status: "occupied",
    targetPath: value.targetPath,
    pathComparisonKey: value.pathAuthority.pathComparisonKey,
    remoteObjectId: remoteId("folder:independent-occupant"),
    entityKind: "folder",
  });
  assert.equal(result.status, "conflict-preserved");
});

test("v1.2 T5: authoritative reserved-ID absence plus clear target may establish verified-not-applied", async () => {
  const value = descriptor();
  const { result } = await recover({
    status: "authoritative-absent",
    reservedRemoteObjectId: value.remoteMutation.reservedRemoteObjectId,
  });
  assert.equal(result.status, "verified-not-applied");
});

test("v1.2 T6: duplicate or ambiguous logical path never selects an arbitrary candidate", async () => {
  const { result } = await recover({
    status: "unobservable",
    reason: "ambiguous-logical-path:multiple-candidates",
  });
  assert.equal(result.status, "outcome-unknown");
});

test("v1.2 T7: incomplete parent/path observation remains outcome-unknown", async () => {
  const { result } = await recover({
    status: "unobservable",
    reason: "required-parent-evidence-incomplete",
  });
  assert.equal(result.status, "outcome-unknown");
});

const restartedIntent = (stage: "dispatch-authorized" | "outcome-unknown"): RecoverableOperationIntentV1_1 => {
  const value = descriptor();
  return {
    logicalKind: "single-effect",
    operationId: id<"OperationId">(`operation:v1.2:${stage}`),
    intentId: value.intentId,
    semanticAuthority: { generation: value.pathAuthority.generation },
    effects: [{
      effectId: `effect:v1.2:${stage}`,
      descriptor: value,
      stage,
    }],
  };
};

async function recoverPersisted(intent: RecoverableOperationIntentV1_1): Promise<{ readonly calls: number; readonly outcome: string }> {
  const persisted = JSON.parse(JSON.stringify(intent)) as RecoverableOperationIntentV1_1;
  const effect = persisted.effects[0];
  assert.equal(effect.descriptor.kind, "remote-folder-create");
  if (effect.descriptor.kind !== "remote-folder-create") throw new Error("expected persisted remote folder descriptor");
  const value = effect.descriptor;
  const reader = new ScriptedRecoveryReader({
    status: "folder",
    targetPath: value.targetPath,
    pathComparisonKey: value.pathAuthority.pathComparisonKey,
    remoteObjectId: value.remoteMutation.reservedRemoteObjectId,
    parentRemoteObjectId: value.parentRemoteObjectId,
  });
  const outcome = await recoverRemoteFolderCreate(value, reader);
  return { calls: reader.seenDescriptors.length, outcome: outcome.status };
}

test("v1.2 T8: restart from dispatch-authorized performs read-only reconciliation before any redispatch", async () => {
  const intent = restartedIntent("dispatch-authorized");
  assert.deepEqual(recoverableOperationV1_1RestartRecoveryDirectives(intent), [{
    effectId: "effect:v1.2:dispatch-authorized",
    directive: { action: "reconcile-physical-reality" },
  }]);
  const recovered = await recoverPersisted(intent);
  assert.deepEqual(recovered, { calls: 1, outcome: "verified-effect" });
});

test("v1.2 T9: restart from outcome-unknown performs the same read-only reconciliation before redispatch", async () => {
  const intent = restartedIntent("outcome-unknown");
  assert.deepEqual(recoverableOperationV1_1RestartRecoveryDirectives(intent), [{
    effectId: "effect:v1.2:outcome-unknown",
    directive: { action: "reconcile-physical-reality" },
  }]);
  const recovered = await recoverPersisted(intent);
  assert.deepEqual(recovered, { calls: 1, outcome: "verified-effect" });
});

test("v1.2 T10: intended parent in descriptor is expectation, not observed proof", async () => {
  const value = descriptor();
  const reader = new ScriptedRecoveryReader({
    status: "unobservable",
    reason: "parent-not-observed-remotely",
  });
  const result = await recoverRemoteFolderCreate(value, reader);
  assert.equal(value.parentRemoteObjectId, remoteId("folder:parent:intended"));
  assert.equal(result.status, "outcome-unknown");
  assert.equal(reader.seenDescriptors.length, 1);
});
