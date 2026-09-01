import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type CanonicalFileContentProof,
  type ExactBaseAuthority,
  type IdentityAuthorityProof,
  type MutationIntentId,
  type OperationId,
  type PersistenceRevision,
  type RecoverableMutationEffectV1_1,
  type RecoverableOperationIntentV1_1,
  type RecoverablePhysicalMutationDescriptorV1_1,
  type SemanticStateGeneration,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type VaultPath,
} from "../../../src/contracts";
import {
  DurableEffectLifecycleCoordinator,
  type PhysicalEffectDispatcher,
  type PhysicalEffectDispatchResult,
} from "../../../src/product/operation-isolation";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const generation = id<"SemanticStateGeneration">("g:lifecycle") as SemanticStateGeneration;
const canonical: CanonicalFileContentProof = { algorithm: "sha256", hash: id<"ContentHash">("hash:lifecycle"), sizeBytes: 17 };
const exactBase: ExactBaseAuthority = { generation, path: path("base.md"), fingerprint: id<"BaseFingerprint">("base:lifecycle") };
const identity: IdentityAuthorityProof = { generation, status: "unique", path: path("base.md"), remoteObjectId: id<"RemoteObjectId">("remote:lifecycle") };

function intentId(value: string): MutationIntentId { return id<"MutationIntentId">(`intent:${value}`) as MutationIntentId; }
function operationId(value: string): OperationId { return id<"OperationId">(`op:${value}`) as OperationId; }

function descriptor(kind: string): RecoverablePhysicalMutationDescriptorV1_1 {
  const target = path(`${kind}.md`);
  const intent = intentId(kind);
  switch (kind) {
    case "local-file": return {
      kind: "local-file", targetSide: "local", mutationKind: "create", targetPath: target,
      localTransactionId: id<"LocalMutationTransactionId">(`txn:${kind}`), intendedContent: canonical,
    };
    case "remote-file": return {
      kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: target,
      remoteMutation: { kind: "reserved-file-create", intentId: intent, reservedRemoteObjectId: id<"RemoteObjectId">(`remote:${kind}`), path: target, intendedContent: canonical },
      intendedContent: canonical,
    };
    case "local-move": return {
      kind: "move", targetSide: "local", fromPath: path("move/from.md"), toPath: path("move/to.md"), identityAuthority: identity,
    };
    case "remote-move": return {
      kind: "move", targetSide: "remote", fromPath: path("remote-move/from.md"), toPath: path("remote-move/to.md"), remoteObjectId: id<"RemoteObjectId">("remote:move"), identityAuthority: identity,
    };
    case "local-trash": return { kind: "trash", targetSide: "local", path: target, baseAuthority: exactBase };
    case "remote-trash": return { kind: "trash", targetSide: "remote", path: target, remoteObjectId: id<"RemoteObjectId">("remote:trash"), baseAuthority: exactBase, identityAuthority: identity };
    case "local-folder": return {
      kind: "local-folder-create", targetSide: "local", mutationKind: "create", intentId: intent, targetPath: path("folders/local"),
      pathAuthority: { generation, targetPath: path("folders/local"), parentPath: path("folders"), pathComparisonKey: "folders/local", expectedTarget: "absent" },
    };
    case "remote-folder": return {
      kind: "remote-folder-create", targetSide: "remote", mutationKind: "create", intentId: intent, targetPath: path("folders/remote"), parentRemoteObjectId: id<"RemoteObjectId">("parent:folders"),
      pathAuthority: { generation, targetPath: path("folders/remote"), parentPath: path("folders"), pathComparisonKey: "folders/remote", expectedTarget: "absent" },
      remoteMutation: { kind: "reserved-folder-create", intentId: intent, reservedRemoteObjectId: id<"RemoteObjectId">("remote:folder:reserved"), path: path("folders/remote") },
    };
    default: throw new Error(`unsupported fixture descriptor ${kind}`);
  }
}

function effect(kind: string, stage: RecoverableMutationEffectV1_1["stage"] = "intent-persisted"): RecoverableMutationEffectV1_1 {
  return { effectId: `effect:${kind}`, descriptor: descriptor(kind), stage };
}

function singleIntent(kind: string): RecoverableOperationIntentV1_1 {
  return { logicalKind: "single-effect", operationId: operationId(kind), intentId: intentId(kind), semanticAuthority: { generation }, effects: [effect(kind)] };
}

function emptyAuthority(): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: id<"StateRevision">("p:0") as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [], pathConvergence: [], operationIntents: [], localTransactions: [],
  };
}

class MemoryStore implements SynchronizationAuthorityStoreV1_1 {
  state = emptyAuthority();
  readonly savedStages: string[][] = [];
  saves = 0;
  async loadAuthority() { return { status: "trusted" as const, state: this.state }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1, expectedPersistenceRevision: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    assert.equal(expectedPersistenceRevision, this.state.persistenceRevision, "every lifecycle write must use the immediately prior durable revision");
    this.saves += 1;
    const persistenceRevision = id<"StateRevision">(`p:${this.saves}`) as PersistenceRevision;
    this.state = { ...candidate, persistenceRevision };
    this.savedStages.push(this.state.operationIntents.flatMap(intent => intent.effects.map(effect => `${effect.effectId}:${effect.stage}`)));
    return { status: "saved", persistenceRevision, semanticGeneration: this.state.semanticGeneration };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> {
    return { status: "saved", persistenceRevision: this.state.persistenceRevision, semanticGeneration: this.state.semanticGeneration };
  }
}

class RecordingDispatcher implements PhysicalEffectDispatcher {
  readonly calls: RecoverablePhysicalMutationDescriptorV1_1[] = [];
  constructor(private readonly result: PhysicalEffectDispatchResult = { status: "verified-effect", verificationEvidenceRef: "verify:ok" }) {}
  async dispatch(value: RecoverablePhysicalMutationDescriptorV1_1): Promise<PhysicalEffectDispatchResult> {
    this.calls.push(value);
    return this.result;
  }
}

for (const kind of ["local-file", "remote-file", "local-move", "remote-move", "local-trash", "remote-trash", "local-folder", "remote-folder"] as const) {
  test(`D durable mutation lifecycle persists intent and dispatch authority before ${kind} physical mutation`, async () => {
    const store = new MemoryStore();
    const dispatcher = new RecordingDispatcher();
    const lifecycle = new DurableEffectLifecycleCoordinator(store, dispatcher);
    const persisted = await lifecycle.persistIntent(singleIntent(kind));
    assert.equal(persisted.status, "persisted");
    assert.equal(dispatcher.calls.length, 0);
    assert.match(store.savedStages[0]?.[0] ?? "", /:intent-persisted$/);

    const result = await lifecycle.dispatchPersistedEffect(String(operationId(kind)), `effect:${kind}`);
    assert.equal(result.status, "effect-verified");
    assert.equal(dispatcher.calls.length, 1);
    assert.match(store.savedStages[1]?.[0] ?? "", /:dispatch-authorized$/, "dispatch authority must be durable before dispatcher invocation");
    assert.match(store.savedStages[2]?.[0] ?? "", /:effect-verified$/);
  });
}

test("D post-dispatch uncertainty is durable and restart never blindly redispatches", async () => {
  const store = new MemoryStore();
  const dispatcher = new RecordingDispatcher({ status: "outcome-unknown", reason: "lost-response" });
  const lifecycle = new DurableEffectLifecycleCoordinator(store, dispatcher);
  await lifecycle.persistIntent(singleIntent("remote-file"));
  const first = await lifecycle.dispatchPersistedEffect(String(operationId("remote-file")), "effect:remote-file");
  assert.equal(first.status, "outcome-unknown");
  assert.match(store.savedStages.at(-1)?.[0] ?? "", /:outcome-unknown$/);
  const restarted = await lifecycle.dispatchPersistedEffect(String(operationId("remote-file")), "effect:remote-file");
  assert.equal(restarted.status, "already-progressed");
  if (restarted.status === "already-progressed") assert.equal(restarted.recoveryAction, "reconcile-physical-reality");
  assert.equal(dispatcher.calls.length, 1, "uncertain restart must not duplicate the physical mutation");
});

test("D conflict-preserved dispatch reaches bounded quiescence rather than immediate retry", async () => {
  const store = new MemoryStore();
  const dispatcher = new RecordingDispatcher({ status: "conflict-preserved", reason: "independent-remote-object" });
  const lifecycle = new DurableEffectLifecycleCoordinator(store, dispatcher);
  await lifecycle.persistIntent(singleIntent("remote-move"));
  const first = await lifecycle.dispatchPersistedEffect(String(operationId("remote-move")), "effect:remote-move");
  assert.equal(first.status, "conflict-preserved");
  const second = await lifecycle.dispatchPersistedEffect(String(operationId("remote-move")), "effect:remote-move");
  assert.equal(second.status, "already-progressed");
  assert.equal(dispatcher.calls.length, 1);
});

test("D authoritative state commit requires exact durable physical verification reference", async () => {
  const store = new MemoryStore();
  const lifecycle = new DurableEffectLifecycleCoordinator(store, new RecordingDispatcher());
  await lifecycle.persistIntent(singleIntent("local-file"));
  await lifecycle.dispatchPersistedEffect(String(operationId("local-file")), "effect:local-file");
  const wrong = await lifecycle.markEffectStateCommitted(String(operationId("local-file")), "effect:local-file", "verify:wrong");
  assert.equal(wrong.status, "recovery-required");
  const committed = await lifecycle.markEffectStateCommitted(String(operationId("local-file")), "effect:local-file", "verify:ok");
  assert.equal(committed.status, "state-committed");
  const repeat = await lifecycle.dispatchPersistedEffect(String(operationId("local-file")), "effect:local-file");
  assert.equal(repeat.status, "already-progressed");
  if (repeat.status === "already-progressed") assert.equal(repeat.recoveryAction, "none");
});

test("D clean merge tracks each physical effect independently across crash/restart", async () => {
  const store = new MemoryStore();
  const dispatcher = new RecordingDispatcher();
  const lifecycle = new DurableEffectLifecycleCoordinator(store, dispatcher);
  const merge: RecoverableOperationIntentV1_1 = {
    logicalKind: "clean-text-merge",
    operationId: operationId("merge"), intentId: intentId("merge"), semanticAuthority: { generation },
    effects: [effect("local-file"), effect("remote-file")],
  };
  await lifecycle.persistIntent(merge);
  await lifecycle.dispatchPersistedEffect(String(operationId("merge")), "effect:local-file");
  await lifecycle.markEffectStateCommitted(String(operationId("merge")), "effect:local-file", "verify:ok");
  assert.equal(store.state.operationIntents[0]?.effects[0]?.stage, "state-committed");
  assert.equal(store.state.operationIntents[0]?.effects[1]?.stage, "intent-persisted");
  const second = await lifecycle.dispatchPersistedEffect(String(operationId("merge")), "effect:remote-file");
  assert.equal(second.status, "effect-verified");
  assert.equal(dispatcher.calls.length, 2, "already committed first merge effect is never replayed while second resumes");
});
