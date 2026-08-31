import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  establishFileCommonStateProof,
  recoverableOperationIsComplete,
  type BaseFingerprint,
  type CanonicalFileContentProof,
  type ChangeCursor,
  type ContentHash,
  type DeviceIdentity,
  type DurableRemoteChangeBatch,
  type IdentityAuthorityProof,
  type LocalMutationTransactionId,
  type MutationIntentId,
  type ObservationToken,
  type OperationId,
  type PersistenceRevision,
  type RecoverableMutationEffect,
  type RecoverableOperationIntent,
  type RemoteIngestionBatchId,
  type RemoteObjectId,
  type RemoteRevisionId,
  type SemanticStateGeneration,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import {
  DurableSemanticStateValidator,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
  createInitialTrustedState,
  type DurableSynchronizationAuthorityState,
} from "../../../src/state/persistent-state-store";
import {
  ageKnownDevices,
  markKnownDeviceReconciled,
  markKnownDeviceStale,
  registerKnownDevice,
  staleDeviceBlocksDestructiveAuthority,
} from "../../../src/state/state-policy";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault-state-authority") as VaultIdentity;
const device = id<"DeviceIdentity">("device-state-authority") as DeviceIdentity;
const peer = id<"DeviceIdentity">("device-state-peer") as DeviceIdentity;
const path = id<"VaultPath">("10-Notes/state.md") as VaultPath;
const otherPath = id<"VaultPath">("10-Notes/other.md") as VaultPath;
const remoteId = id<"RemoteObjectId">("remote-state-1") as RemoteObjectId;
const generation = (n: number) => id<"SemanticStateGeneration">(`semantic-${n}`) as SemanticStateGeneration;
const revision = (n: number) => id<"StateRevision">(`state-${n}`) as PersistenceRevision;
const op = (value: string) => id<"OperationId">(`op-${value}`) as OperationId;
const intent = (value: string) => id<"MutationIntentId">(`intent-${value}`) as MutationIntentId;
const fingerprint = (value: string) => id<"BaseFingerprint">(`base-${value}`) as BaseFingerprint;
const remoteRevision = (value: string) => id<"RemoteRevisionId">(`remote-rev-${value}`) as RemoteRevisionId;
const observation = (value: string) => id<"ObservationToken">(`obs-${value}`) as ObservationToken;
const cursor = (value: string) => id<"ChangeCursor">(`cursor-${value}`) as ChangeCursor;
const batchId = (value: string) => id<"RemoteIngestionBatchId">(`batch-${value}`) as RemoteIngestionBatchId;
const localTx = (value: string) => id<"LocalMutationTransactionId">(`tx-${value}`) as LocalMutationTransactionId;
const hash = (value: string) => id<"ContentHash">(`hash-${value}`) as ContentHash;

const canonical = (value: string, sizeBytes = value.length): CanonicalFileContentProof => ({ algorithm: "sha256", hash: hash(value), sizeBytes });

async function initializedStore(): Promise<{ storage: MemoryStateByteStorage; store: PersistentSynchronizationStateStore; state: DurableSynchronizationAuthorityState }> {
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage);
  const state = createInitialAuthorityState({ persistenceRevision: revision(1), semanticGeneration: generation(1), vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await store.saveTrusted(state)).status, "saved");
  return { storage, store, state };
}

async function trusted(store: PersistentSynchronizationStateStore): Promise<DurableSynchronizationAuthorityState> {
  const loaded = await store.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("authority was not trusted");
  return loaded.state;
}

function singleIntent(value: string, effect: RecoverableMutationEffect, semanticGeneration = generation(1)): RecoverableOperationIntent {
  return {
    logicalKind: "single-effect",
    operationId: op(value),
    intentId: intent(value),
    semanticAuthority: { generation: semanticGeneration },
    effects: [effect],
  };
}

function identityAuthority(atPath: VaultPath = path, objectId: RemoteObjectId = remoteId, semanticGeneration = generation(1)): IdentityAuthorityProof {
  return { status: "unique", generation: semanticGeneration, path: atPath, remoteObjectId: objectId };
}

test("persistence-only operation journaling advances persistence revision but not semantic generation", async () => {
  const { store } = await initializedStore();
  const durableIntent = singleIntent("journal-only", {
    effectId: "effect-upload",
    descriptor: {
      kind: "remote-file",
      targetSide: "remote",
      mutationKind: "create",
      targetPath: path,
      remoteMutation: {
        kind: "reserved-file-create",
        intentId: intent("remote-create"),
        reservedRemoteObjectId: remoteId,
        path,
        intendedContent: canonical("payload"),
      },
      intendedContent: canonical("payload"),
    },
    stage: "intent-persisted",
  });
  const saved = await store.persistOperationIntent(durableIntent, revision(1), generation(1));
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.notEqual(saved.persistenceRevision, revision(1));
  assert.equal(saved.semanticGeneration, generation(1));
  const loaded = await trusted(store);
  assert.equal(loaded.operationIntents.length, 1);
  assert.deepEqual(loaded.operationIntents[0].effects[0].descriptor, durableIntent.effects[0].descriptor);
});

test("file BASE healing requires current exact canonical common proof and advances semantic generation", async () => {
  const { store } = await initializedStore();
  assert.equal(establishFileCommonStateProof({
    path,
    generation: generation(1),
    localObservationToken: observation("local"),
    remoteObjectId: remoteId,
    remoteRevision: remoteRevision("1"),
    localCanonicalContent: canonical("L"),
    remoteCanonicalContent: canonical("R"),
  }), undefined);

  const common = establishFileCommonStateProof({
    path,
    generation: generation(1),
    localObservationToken: observation("local"),
    remoteObjectId: remoteId,
    remoteRevision: remoteRevision("1"),
    localCanonicalContent: canonical("same", 4),
    remoteCanonicalContent: canonical("same", 4),
  });
  assert.ok(common);
  const saved = await store.commitBaseTransition({ kind: "heal-common-state", proof: common, nextFingerprint: fingerprint("same") }, revision(1), generation(1));
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.notEqual(saved.semanticGeneration, generation(1));
  const loaded = await trusted(store);
  assert.equal(loaded.base.length, 1);
  assert.equal(loaded.baseAuthority[0].fingerprint, fingerprint("same"));
  assert.equal(loaded.base[0].content?.hash, canonical("same", 4).hash);
});

test("later learned Drive batches cannot erase unresolved earlier removals, moves, create-delete, or duplicate-path facts", async () => {
  const { store } = await initializedStore();
  const removedA: DurableRemoteChangeBatch = {
    checkpoint: { batchId: batchId("A"), startingToken: cursor("0"), terminalStartToken: cursor("1"), persistenceRevision: revision(1), status: "learned" },
    changes: [{ kind: "removed", remoteObjectId: id<"RemoteObjectId">("remote-A") as RemoteObjectId, lastKnownPath: path }],
  };
  const laterB: DurableRemoteChangeBatch = {
    checkpoint: { batchId: batchId("B"), startingToken: cursor("1"), terminalStartToken: cursor("2"), persistenceRevision: revision(2), status: "learned" },
    changes: [
      { kind: "upsert", entry: { path: otherPath, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("remote-B") as RemoteObjectId, trashed: false } },
      { kind: "removed", remoteObjectId: id<"RemoteObjectId">("remote-B") as RemoteObjectId, lastKnownPath: otherPath },
      { kind: "upsert", entry: { path, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("remote-dup-1") as RemoteObjectId, trashed: false } },
      { kind: "upsert", entry: { path, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("remote-dup-2") as RemoteObjectId, trashed: false } },
    ],
  };

  const a = await store.appendLearnedRemoteBatch(removedA, revision(1), generation(1));
  assert.equal(a.status, "saved");
  if (a.status !== "saved") return;
  const b = await store.appendLearnedRemoteBatch(laterB, a.persistenceRevision, a.semanticGeneration);
  assert.equal(b.status, "saved");
  if (b.status !== "saved") return;
  let loaded = await trusted(store);
  assert.deepEqual(loaded.learnedRemoteBatches.map(batch => batch.checkpoint.batchId), [batchId("A"), batchId("B")]);
  assert.equal(loaded.changeCursor, cursor("2"));

  const blocked = await store.retireLearnedRemoteBatch(batchId("A"), b.persistenceRevision, b.semanticGeneration);
  assert.equal(blocked.status, "recovery-required");

  const reduced = await store.recordRemoteBatchReduction(batchId("A"), ["tombstone:10-Notes/state.md", "mapping:remote-A"], true, b.persistenceRevision, b.semanticGeneration);
  assert.equal(reduced.status, "saved");
  if (reduced.status !== "saved") return;
  const retired = await store.retireLearnedRemoteBatch(batchId("A"), reduced.persistenceRevision, reduced.semanticGeneration);
  assert.equal(retired.status, "saved");
  loaded = await trusted(store);
  assert.deepEqual(loaded.learnedRemoteBatches.map(batch => batch.checkpoint.batchId), [batchId("B")]);
});

test("dispatch-authorized and outcome-unknown restart as may-have-happened; verified effect resumes commit without redispatch", async () => {
  const { store } = await initializedStore();
  const content = canonical("upload");
  const durableIntent = singleIntent("crash-upload", {
    effectId: "effect-upload",
    descriptor: {
      kind: "remote-file",
      targetSide: "remote",
      mutationKind: "create",
      targetPath: path,
      remoteMutation: { kind: "reserved-file-create", intentId: intent("crash-upload-remote"), reservedRemoteObjectId: remoteId, path, intendedContent: content },
      intendedContent: content,
    },
    stage: "intent-persisted",
  });
  const persisted = await store.persistOperationIntent(durableIntent, revision(1), generation(1));
  assert.equal(persisted.status, "saved");
  if (persisted.status !== "saved") return;

  const authorized = await store.advanceOperationEffect(durableIntent.operationId, "effect-upload", "dispatch-authorized", undefined, persisted.persistenceRevision, persisted.semanticGeneration);
  assert.equal(authorized.status, "saved");
  let directives = await store.restartRecoveryDirectives();
  assert.equal(directives[0].directive.action, "reconcile-physical-reality");
  if (authorized.status !== "saved") return;

  const unknown = await store.advanceOperationEffect(durableIntent.operationId, "effect-upload", "outcome-unknown", undefined, authorized.persistenceRevision, authorized.semanticGeneration);
  assert.equal(unknown.status, "saved");
  directives = await store.restartRecoveryDirectives();
  assert.equal(directives[0].directive.action, "reconcile-physical-reality");
  if (unknown.status !== "saved") return;

  const verified = await store.advanceOperationEffect(durableIntent.operationId, "effect-upload", "effect-verified", "remote-proof:upload", unknown.persistenceRevision, unknown.semanticGeneration);
  assert.equal(verified.status, "saved");
  directives = await store.restartRecoveryDirectives();
  assert.equal(directives[0].directive.action, "finish-authoritative-state-commit");
});

test("restart matrix retains exact descriptors for download, moves, trash, and unfinished clean-merge effects", async () => {
  const { store } = await initializedStore();
  const descriptors: readonly RecoverableMutationEffect[] = [
    {
      effectId: "download",
      descriptor: { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: path, localTransactionId: localTx("download"), intendedContent: canonical("download") },
      stage: "intent-persisted",
    },
    {
      effectId: "local-move",
      descriptor: { kind: "move", targetSide: "local", fromPath: path, toPath: otherPath, identityAuthority: identityAuthority() },
      stage: "intent-persisted",
    },
    {
      effectId: "remote-move",
      descriptor: { kind: "move", targetSide: "remote", fromPath: path, toPath: otherPath, remoteObjectId: remoteId, identityAuthority: identityAuthority() },
      stage: "intent-persisted",
    },
    {
      effectId: "local-trash",
      descriptor: { kind: "trash", targetSide: "local", path, baseAuthority: { generation: generation(1), path, fingerprint: fingerprint("trash") } },
      stage: "intent-persisted",
    },
    {
      effectId: "remote-trash",
      descriptor: { kind: "trash", targetSide: "remote", path, remoteObjectId: remoteId, baseAuthority: { generation: generation(1), path, fingerprint: fingerprint("trash") }, identityAuthority: identityAuthority() },
      stage: "intent-persisted",
    },
  ];

  let state = await trusted(store);
  for (const effect of descriptors) {
    const operation = singleIntent(effect.effectId, effect, state.semanticGeneration);
    const saved = await store.persistOperationIntent(operation, state.persistenceRevision, state.semanticGeneration);
    assert.equal(saved.status, "saved");
    state = await trusted(store);
    const dispatch = await store.advanceOperationEffect(operation.operationId, effect.effectId, "dispatch-authorized", undefined, state.persistenceRevision, state.semanticGeneration);
    assert.equal(dispatch.status, "saved");
    state = await trusted(store);
  }
  const directives = await store.restartRecoveryDirectives();
  for (const effect of descriptors) assert.equal(directives.find(item => item.effectId === effect.effectId)?.directive.action, "reconcile-physical-reality");

  const merge: RecoverableOperationIntent = {
    logicalKind: "clean-text-merge",
    operationId: op("merge"),
    intentId: intent("merge"),
    semanticAuthority: { generation: state.semanticGeneration },
    effects: [
      { effectId: "merge-local", descriptor: { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: path, localTransactionId: localTx("merge-local"), intendedContent: canonical("merge") }, stage: "intent-persisted" },
      { effectId: "merge-remote", descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: path, remoteMutation: { kind: "reserved-file-create", intentId: intent("merge-remote"), reservedRemoteObjectId: id<"RemoteObjectId">("remote-merge") as RemoteObjectId, path, intendedContent: canonical("merge") }, intendedContent: canonical("merge") }, stage: "intent-persisted" },
    ],
  };
  const mergePersisted = await store.persistOperationIntent(merge, state.persistenceRevision, state.semanticGeneration);
  assert.equal(mergePersisted.status, "saved");
  state = await trusted(store);
  let advanced = await store.advanceOperationEffect(merge.operationId, "merge-local", "dispatch-authorized", undefined, state.persistenceRevision, state.semanticGeneration);
  assert.equal(advanced.status, "saved");
  state = await trusted(store);
  advanced = await store.advanceOperationEffect(merge.operationId, "merge-local", "effect-verified", "proof:local-merge", state.persistenceRevision, state.semanticGeneration);
  assert.equal(advanced.status, "saved");
  state = await trusted(store);
  advanced = await store.advanceOperationEffect(merge.operationId, "merge-local", "state-committed", undefined, state.persistenceRevision, state.semanticGeneration);
  assert.equal(advanced.status, "saved");
  state = await trusted(store);
  const persistedMerge = state.operationIntents.find(item => item.operationId === merge.operationId);
  assert.ok(persistedMerge);
  assert.equal(recoverableOperationIsComplete(persistedMerge), false);
  assert.equal(persistedMerge.effects[0].stage, "state-committed");
  assert.equal(persistedMerge.effects[1].stage, "intent-persisted");
});

test("semantic contradictions and extension inconsistencies fail closed", async () => {
  const base = createInitialAuthorityState({ persistenceRevision: revision(1), semanticGeneration: generation(1), vaultIdentity: vault, deviceIdentity: device });
  const validator = new DurableSemanticStateValidator([() => "future invariant contradiction"]);
  const issues = validator.validate(base);
  assert.ok(issues.some(item => item.code === "other-semantic-inconsistency" && item.invariantCategory === "extension-invariant"));

  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage, 1, validator);
  const save = await store.saveTrusted(base);
  assert.equal(save.status, "recovery-required");
});

test("legacy state requires explicit backup-backed authority reconstruction rather than silent BASE trust", async () => {
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage);
  const legacy = {
    ...createInitialTrustedState({ stateRevision: revision(1), vaultIdentity: vault, deviceIdentity: device }),
    base: [{ path, entityKind: "file" as const, localExisted: true, remoteExisted: true, remoteObjectId: remoteId }],
  };
  assert.equal((await store.saveTrusted(legacy)).status, "saved");
  assert.equal((await store.loadAuthority()).status, "recovery-required");

  const migrated = await store.migrateToAuthority(1, () => createInitialAuthorityState({ persistenceRevision: revision(1), semanticGeneration: generation(1), vaultIdentity: vault, deviceIdentity: device }));
  assert.equal(migrated.status, "migrated");
  assert.equal(storage.backups.size, 1);
  assert.equal((await store.loadAuthority()).status, "trusted");
});

test("known-device registration, aging, stale gating, and reconciliation clearing are production transitions", () => {
  let state = createInitialTrustedState({ stateRevision: revision(1), vaultIdentity: vault, deviceIdentity: device });
  state = registerKnownDevice(state, peer);
  assert.equal(state.knownDevices.find(entry => entry.deviceId === peer)?.stale, true);
  assert.equal(staleDeviceBlocksDestructiveAuthority(state), true);

  state = markKnownDeviceReconciled(state, peer, 1_000);
  assert.equal(state.knownDevices.find(entry => entry.deviceId === peer)?.stale, false);
  assert.equal(staleDeviceBlocksDestructiveAuthority(state), false);

  state = ageKnownDevices(state, 10_000, { staleAfterMs: 5_000 });
  assert.equal(state.knownDevices.find(entry => entry.deviceId === peer)?.stale, true);
  state = markKnownDeviceReconciled(state, peer, 10_000);
  state = markKnownDeviceStale(state, peer);
  assert.equal(staleDeviceBlocksDestructiveAuthority(state), true);
});
