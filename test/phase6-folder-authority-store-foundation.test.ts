import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  folderCreateEligibleForAuthoritativeCommit,
  recoverableOperationV1_1IsComplete,
  recoverableOperationV1_1RestartRecoveryDirectives,
  verifyLocalFolderCreate,
  verifyRemoteFolderCreate,
  type AuthoritativeBaseTransition,
  type BaseFingerprint,
  type FolderCreatePathAuthority,
  type LocalFolderCreatePhysicalMutationDescriptor,
  type MutationIntentId,
  type ObservationToken,
  type OperationId,
  type PersistenceRevision,
  type RecoverableOperationIntentV1_1,
  type RemoteFolderCreatePhysicalMutationDescriptor,
  type RemoteMutationIdentity,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type SynchronizationAuthorityLoadResultV1_1,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type VaultPath,
} from "../src/contracts";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const revision = (value: string) => id<"StateRevision">(value) as PersistenceRevision;
const operationId = (value: string) => id<"OperationId">(value) as OperationId;
const mutationIntentId = (value: string) => id<"MutationIntentId">(value) as MutationIntentId;
const observation = (value: string) => id<"ObservationToken">(value) as ObservationToken;
const fingerprint = (value: string) => id<"BaseFingerprint">(value) as BaseFingerprint;

const folderAuthority = (target: VaultPath, parent = path("")): FolderCreatePathAuthority => ({
  generation: generation("semantic:folder-store"),
  targetPath: target,
  parentPath: parent,
  pathComparisonKey: String(target).normalize("NFC").toLocaleLowerCase("en-US"),
  expectedTarget: "absent",
});

const localIntent = (stage: "intent-persisted" | "dispatch-authorized" | "effect-verified" | "state-committed" = "dispatch-authorized"): RecoverableOperationIntentV1_1 => {
  const targetPath = path("empty/local");
  const intentId = mutationIntentId("intent:local-folder-store");
  const descriptor: LocalFolderCreatePhysicalMutationDescriptor = {
    kind: "local-folder-create",
    targetSide: "local",
    mutationKind: "create",
    intentId,
    targetPath,
    pathAuthority: folderAuthority(targetPath, path("empty")),
  };
  return {
    logicalKind: "single-effect",
    operationId: operationId("operation:local-folder-store"),
    intentId,
    semanticAuthority: { generation: descriptor.pathAuthority.generation },
    effects: [{
      effectId: "effect:local-folder-store",
      descriptor,
      stage,
      ...(stage === "effect-verified" || stage === "state-committed"
        ? { verificationEvidenceRef: "evidence:local-folder-store" }
        : {}),
    }],
  };
};

const remoteIntent = (stage: "intent-persisted" | "dispatch-authorized" | "effect-verified" | "state-committed" = "dispatch-authorized"): RecoverableOperationIntentV1_1 => {
  const targetPath = path("empty/remote");
  const intentId = mutationIntentId("intent:remote-folder-store");
  const remoteMutation: Extract<RemoteMutationIdentity, { readonly kind: "reserved-folder-create" }> = {
    kind: "reserved-folder-create",
    intentId,
    reservedRemoteObjectId: remoteId("folder:reserved:exact"),
    path: targetPath,
  };
  const descriptor: RemoteFolderCreatePhysicalMutationDescriptor = {
    kind: "remote-folder-create",
    targetSide: "remote",
    mutationKind: "create",
    intentId,
    targetPath,
    parentRemoteObjectId: remoteId("folder:parent:exact"),
    pathAuthority: folderAuthority(targetPath, path("empty")),
    remoteMutation,
  };
  return {
    logicalKind: "single-effect",
    operationId: operationId("operation:remote-folder-store"),
    intentId,
    semanticAuthority: { generation: descriptor.pathAuthority.generation },
    effects: [{
      effectId: "effect:remote-folder-store",
      descriptor,
      stage,
      ...(stage === "effect-verified" || stage === "state-committed"
        ? { verificationEvidenceRef: "evidence:remote-folder-store" }
        : {}),
    }],
  };
};

const metadata = (operationIntents: readonly RecoverableOperationIntentV1_1[]): SynchronizationAuthorityMetadataV1_1 => ({
  persistenceRevision: revision("state:folder-store:1"),
  semanticGeneration: generation("semantic:folder-store"),
  learnedRemoteBatches: [],
  pathConvergence: [],
  operationIntents,
  localTransactions: [],
});

class InMemoryAuthorityStoreV1_1 implements SynchronizationAuthorityStoreV1_1 {
  private persisted?: SynchronizationAuthorityMetadataV1_1;

  constructor(initial?: SynchronizationAuthorityMetadataV1_1) {
    if (initial) this.persisted = this.copy(initial);
  }

  async loadAuthority(): Promise<SynchronizationAuthorityLoadResultV1_1<SynchronizationAuthorityMetadataV1_1>> {
    return this.persisted
      ? { status: "trusted", state: this.copy(this.persisted) }
      : { status: "uninitialized" };
  }

  async saveAuthority(
    state: SynchronizationAuthorityMetadataV1_1,
    _expectedPersistenceRevision: PersistenceRevision,
    _expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    this.persisted = this.copy(state);
    return {
      status: "saved",
      persistenceRevision: state.persistenceRevision,
      semanticGeneration: state.semanticGeneration,
    };
  }

  async commitBaseTransition(
    _transition: AuthoritativeBaseTransition,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    return {
      status: "saved",
      persistenceRevision: expectedPersistenceRevision,
      semanticGeneration: expectedSemanticGeneration,
    };
  }

  durableSnapshot(): SynchronizationAuthorityMetadataV1_1 | undefined {
    return this.persisted ? this.copy(this.persisted) : undefined;
  }

  private copy(state: SynchronizationAuthorityMetadataV1_1): SynchronizationAuthorityMetadataV1_1 {
    return {
      ...state,
      learnedRemoteBatches: [...state.learnedRemoteBatches],
      pathConvergence: [...state.pathConvergence],
      operationIntents: [...state.operationIntents],
      localTransactions: [...state.localTransactions],
    };
  }
}

test("v1.1 authority store: LOCAL folder intent fits authoritative metadata without a sidecar", () => {
  const state: SynchronizationAuthorityMetadataV1_1 = metadata([localIntent()]);
  assert.equal(state.operationIntents[0]?.effects[0]?.descriptor.kind, "local-folder-create");
});

test("v1.1 authority store: REMOTE folder intent fits authoritative metadata with reserved identity", () => {
  const state: SynchronizationAuthorityMetadataV1_1 = metadata([remoteIntent()]);
  const descriptor = state.operationIntents[0]?.effects[0]?.descriptor;
  assert.equal(descriptor?.kind, "remote-folder-create");
  if (descriptor?.kind === "remote-folder-create") {
    assert.equal(descriptor.remoteMutation.reservedRemoteObjectId, remoteId("folder:reserved:exact"));
  }
});

test("v1.1 authority store: LOCAL folder save then restart/load preserves stage and structural authority", async () => {
  const original = metadata([localIntent("dispatch-authorized")]);
  const firstProcess = new InMemoryAuthorityStoreV1_1();
  await firstProcess.saveAuthority(original, original.persistenceRevision, original.semanticGeneration);

  const secondProcess = new InMemoryAuthorityStoreV1_1(firstProcess.durableSnapshot());
  const loaded = await secondProcess.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;

  const recovered = loaded.state.operationIntents[0];
  const effect = recovered?.effects[0];
  assert.equal(effect?.effectId, "effect:local-folder-store");
  assert.equal(effect?.stage, "dispatch-authorized");
  assert.deepEqual(recoverableOperationV1_1RestartRecoveryDirectives(recovered!), [{
    effectId: "effect:local-folder-store",
    directive: { action: "reconcile-physical-reality" },
  }]);

  const descriptor = effect?.descriptor;
  assert.equal(descriptor?.kind, "local-folder-create");
  if (descriptor?.kind !== "local-folder-create") return;
  assert.equal(descriptor.targetPath, path("empty/local"));
  assert.equal(descriptor.pathAuthority.parentPath, path("empty"));
  assert.equal(descriptor.pathAuthority.expectedTarget, "absent");

  const verified = verifyLocalFolderCreate(descriptor, {
    status: "folder",
    targetPath: descriptor.targetPath,
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
    observationToken: observation("local:folder:restart"),
  });
  assert.equal(folderCreateEligibleForAuthoritativeCommit(verified, {
    status: "unknown",
    reasonCode: "path-convergence-pending",
  }), false);
  assert.equal(folderCreateEligibleForAuthoritativeCommit(verified, {
    status: "converged",
    generation: generation("semantic:folder-store:next"),
    baseFingerprint: fingerprint("base:folder:local"),
  }), true);
});

test("v1.1 authority store: REMOTE reserved identity survives save then restart/load unchanged", async () => {
  const original = metadata([remoteIntent("dispatch-authorized")]);
  const firstProcess = new InMemoryAuthorityStoreV1_1();
  await firstProcess.saveAuthority(original, original.persistenceRevision, original.semanticGeneration);

  const secondProcess = new InMemoryAuthorityStoreV1_1(firstProcess.durableSnapshot());
  const loaded = await secondProcess.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;

  const recovered = loaded.state.operationIntents[0];
  const effect = recovered?.effects[0];
  assert.equal(recovered?.intentId, mutationIntentId("intent:remote-folder-store"));
  assert.equal(effect?.effectId, "effect:remote-folder-store");
  assert.equal(effect?.stage, "dispatch-authorized");

  const descriptor = effect?.descriptor;
  assert.equal(descriptor?.kind, "remote-folder-create");
  if (descriptor?.kind !== "remote-folder-create") return;
  assert.equal(descriptor.parentRemoteObjectId, remoteId("folder:parent:exact"));
  assert.equal(descriptor.remoteMutation.reservedRemoteObjectId, remoteId("folder:reserved:exact"));
  assert.equal(descriptor.targetPath, path("empty/remote"));
  assert.equal(descriptor.pathAuthority.targetPath, path("empty/remote"));
  assert.equal(descriptor.pathAuthority.parentPath, path("empty"));
  assert.deepEqual(recoverableOperationV1_1RestartRecoveryDirectives(recovered!), [{
    effectId: "effect:remote-folder-store",
    directive: { action: "reconcile-physical-reality" },
  }]);

  const verified = verifyRemoteFolderCreate(descriptor, {
    status: "folder",
    targetPath: descriptor.targetPath,
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
    remoteObjectId: descriptor.remoteMutation.reservedRemoteObjectId,
    parentRemoteObjectId: descriptor.parentRemoteObjectId,
  });
  assert.equal(folderCreateEligibleForAuthoritativeCommit(verified, {
    status: "converged",
    generation: generation("semantic:folder-store:next"),
    baseFingerprint: fingerprint("base:folder:remote"),
  }), true);
});

test("v1.1 authority store: shared completion semantics require every folder-capable effect state-committed", () => {
  assert.equal(recoverableOperationV1_1IsComplete(remoteIntent("effect-verified")), false);
  assert.equal(recoverableOperationV1_1IsComplete(remoteIntent("state-committed")), true);

  const localCommitted = localIntent("state-committed");
  const remotePending = remoteIntent("effect-verified");
  const multiEffect: RecoverableOperationIntentV1_1 = {
    logicalKind: "clean-text-merge",
    operationId: operationId("operation:folder-multi-effect"),
    intentId: mutationIntentId("intent:folder-multi-effect"),
    semanticAuthority: { generation: generation("semantic:folder-store") },
    effects: [localCommitted.effects[0], remotePending.effects[0]],
  };
  assert.equal(recoverableOperationV1_1IsComplete(multiEffect), false);
});

test("v1.1 authority store: C and D exchange folder intent solely through frozen metadata/store contract", async () => {
  const state = metadata([localIntent("intent-persisted"), remoteIntent("dispatch-authorized")]);
  const store: SynchronizationAuthorityStoreV1_1 = new InMemoryAuthorityStoreV1_1();
  await store.saveAuthority(state, state.persistenceRevision, state.semanticGeneration);
  const loaded = await store.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  assert.deepEqual(loaded.state.operationIntents.map(intent => intent.effects[0].descriptor.kind), [
    "local-folder-create",
    "remote-folder-create",
  ]);
  assert.deepEqual(loaded.state.operationIntents.map(intent => recoverableOperationV1_1RestartRecoveryDirectives(intent)[0].directive.action), [
    "retire-unattempted-intent",
    "reconcile-physical-reality",
  ]);
});
