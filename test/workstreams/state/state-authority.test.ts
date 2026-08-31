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
const gen = (n: number) => id<"SemanticStateGeneration">(`semantic-${n}`) as SemanticStateGeneration;
const rev = (n: number) => id<"StateRevision">(`state-${n}`) as PersistenceRevision;
const op = (v: string) => id<"OperationId">(`op-${v}`) as OperationId;
const mi = (v: string) => id<"MutationIntentId">(`intent-${v}`) as MutationIntentId;
const fp = (v: string) => id<"BaseFingerprint">(`base-${v}`) as BaseFingerprint;
const rr = (v: string) => id<"RemoteRevisionId">(`remote-rev-${v}`) as RemoteRevisionId;
const obs = (v: string) => id<"ObservationToken">(`obs-${v}`) as ObservationToken;
const cur = (v: string) => id<"ChangeCursor">(`cursor-${v}`) as ChangeCursor;
const bid = (v: string) => id<"RemoteIngestionBatchId">(`batch-${v}`) as RemoteIngestionBatchId;
const tx = (v: string) => id<"LocalMutationTransactionId">(`tx-${v}`) as LocalMutationTransactionId;
const h = (v: string) => id<"ContentHash">(`hash-${v}`) as ContentHash;
const canonical = (v: string, sizeBytes = v.length): CanonicalFileContentProof => ({ algorithm: "sha256", hash: h(v), sizeBytes });

async function setup() {
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage);
  const state = createInitialAuthorityState({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await store.saveTrusted(state)).status, "saved");
  return { storage, store };
}

async function trusted(store: PersistentSynchronizationStateStore): Promise<DurableSynchronizationAuthorityState> {
  const loaded = await store.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("authority not trusted");
  return loaded.state;
}

function single(name: string, effect: RecoverableMutationEffect, generation = gen(1)): RecoverableOperationIntent {
  return { logicalKind: "single-effect", operationId: op(name), intentId: mi(name), semanticAuthority: { generation }, effects: [effect] };
}

function identity(atPath = path, objectId = remoteId, generation = gen(1)): IdentityAuthorityProof {
  return { status: "unique", generation, path: atPath, remoteObjectId: objectId };
}

test("journal-only persistence advances CAS revision without advancing semantic authority", async () => {
  const { store } = await setup();
  const operation = single("journal", {
    effectId: "upload",
    descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: path,
      remoteMutation: { kind: "reserved-file-create", intentId: mi("upload"), reservedRemoteObjectId: remoteId, path, intendedContent: canonical("payload") },
      intendedContent: canonical("payload") },
    stage: "intent-persisted",
  });
  const saved = await store.persistOperationIntent(operation, rev(1), gen(1));
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.notEqual(saved.persistenceRevision, rev(1));
  assert.equal(saved.semanticGeneration, gen(1));
  assert.deepEqual((await trusted(store)).operationIntents[0].effects[0].descriptor, operation.effects[0].descriptor);
});

test("file BASE healing accepts only current canonical equality and creates exact BASE authority", async () => {
  const { store } = await setup();
  assert.equal(establishFileCommonStateProof({ path, generation: gen(1), localObservationToken: obs("l"), remoteObjectId: remoteId, remoteRevision: rr("1"), localCanonicalContent: canonical("L"), remoteCanonicalContent: canonical("R") }), undefined);
  const proof = establishFileCommonStateProof({ path, generation: gen(1), localObservationToken: obs("l"), remoteObjectId: remoteId, remoteRevision: rr("1"), localCanonicalContent: canonical("same", 4), remoteCanonicalContent: canonical("same", 4) });
  assert.ok(proof);
  const saved = await store.commitBaseTransition({ kind: "heal-common-state", proof, nextFingerprint: fp("same") }, rev(1), gen(1));
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.notEqual(saved.semanticGeneration, gen(1));
  const state = await trusted(store);
  assert.equal(state.baseAuthority[0].fingerprint, fp("same"));
  assert.equal(state.base[0].content?.hash, canonical("same", 4).hash);

  const stale = await store.commitBaseTransition({ kind: "heal-common-state", proof, nextFingerprint: fp("stale") }, saved.persistenceRevision, saved.semanticGeneration);
  assert.equal(stale.status, "stale-semantic-authority");
});

test("learned Drive batches remain lossless until explicit durable reduction permits retirement", async () => {
  const { store } = await setup();
  const a: DurableRemoteChangeBatch = { checkpoint: { batchId: bid("A"), startingToken: cur("0"), terminalStartToken: cur("1"), persistenceRevision: rev(1), status: "learned" }, changes: [{ kind: "removed", remoteObjectId: id<"RemoteObjectId">("A") as RemoteObjectId, lastKnownPath: path }] };
  const b: DurableRemoteChangeBatch = { checkpoint: { batchId: bid("B"), startingToken: cur("1"), terminalStartToken: cur("2"), persistenceRevision: rev(2), status: "learned" }, changes: [
    { kind: "upsert", entry: { path: otherPath, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("B") as RemoteObjectId, trashed: false } },
    { kind: "removed", remoteObjectId: id<"RemoteObjectId">("B") as RemoteObjectId, lastKnownPath: otherPath },
    { kind: "upsert", entry: { path, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("dup-1") as RemoteObjectId, trashed: false } },
    { kind: "upsert", entry: { path, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("dup-2") as RemoteObjectId, trashed: false } },
  ] };
  const sa = await store.appendLearnedRemoteBatch(a, rev(1), gen(1));
  assert.equal(sa.status, "saved"); if (sa.status !== "saved") return;
  const sb = await store.appendLearnedRemoteBatch(b, sa.persistenceRevision, sa.semanticGeneration);
  assert.equal(sb.status, "saved"); if (sb.status !== "saved") return;
  let state = await trusted(store);
  assert.deepEqual(state.learnedRemoteBatches.map(x => x.checkpoint.batchId), [bid("A"), bid("B")]);
  assert.equal(state.changeCursor, cur("2"));
  assert.equal(state.pathConvergence.length, 0, "feed watermark progress is distinct from path convergence");
  assert.equal((await store.retireLearnedRemoteBatch(bid("A"), sb.persistenceRevision, sb.semanticGeneration)).status, "recovery-required");
  const reduced = await store.recordRemoteBatchReduction(bid("A"), ["tombstone:path", "mapping:A"], true, sb.persistenceRevision, sb.semanticGeneration);
  assert.equal(reduced.status, "saved"); if (reduced.status !== "saved") return;
  const retired = await store.retireLearnedRemoteBatch(bid("A"), reduced.persistenceRevision, reduced.semanticGeneration);
  assert.equal(retired.status, "saved");
  state = await trusted(store);
  assert.deepEqual(state.learnedRemoteBatches.map(x => x.checkpoint.batchId), [bid("B")]);
});

const stageExpectation: Record<RecoverableMutationEffect["stage"], string> = {
  "intent-persisted": "retire-unattempted-intent",
  "dispatch-authorized": "reconcile-physical-reality",
  "outcome-unknown": "reconcile-physical-reality",
  "effect-verified": "finish-authoritative-state-commit",
  "state-committed": "none",
};

async function exerciseEveryStage(store: PersistentSynchronizationStateStore, operation: RecoverableOperationIntent, effectId: string) {
  let state = await trusted(store);
  let result = await store.persistOperationIntent(operation, state.persistenceRevision, state.semanticGeneration);
  assert.equal(result.status, "saved");
  let directive = (await store.restartRecoveryDirectives()).find(x => x.operationId === operation.operationId && x.effectId === effectId);
  assert.equal(directive?.directive.action, stageExpectation["intent-persisted"]);
  for (const stage of ["dispatch-authorized", "outcome-unknown", "effect-verified", "state-committed"] as const) {
    state = await trusted(store);
    result = await store.advanceOperationEffect(operation.operationId, effectId, stage, stage === "effect-verified" ? `proof:${effectId}` : undefined, state.persistenceRevision, state.semanticGeneration);
    assert.equal(result.status, "saved");
    directive = (await store.restartRecoveryDirectives()).find(x => x.operationId === operation.operationId && x.effectId === effectId);
    assert.equal(directive?.directive.action, stageExpectation[stage]);
  }
}

test("crash/restart matrix covers upload, download, moves, and trash at every durable stage", async () => {
  const { store } = await setup();
  const effects: readonly RecoverableMutationEffect[] = [
    { effectId: "upload", descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: path, remoteMutation: { kind: "reserved-file-create", intentId: mi("u"), reservedRemoteObjectId: remoteId, path, intendedContent: canonical("u") }, intendedContent: canonical("u") }, stage: "intent-persisted" },
    { effectId: "download", descriptor: { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: path, localTransactionId: tx("d"), intendedContent: canonical("d") }, stage: "intent-persisted" },
    { effectId: "local-move", descriptor: { kind: "move", targetSide: "local", fromPath: path, toPath: otherPath, identityAuthority: identity() }, stage: "intent-persisted" },
    { effectId: "remote-move", descriptor: { kind: "move", targetSide: "remote", fromPath: path, toPath: otherPath, remoteObjectId: remoteId, identityAuthority: identity() }, stage: "intent-persisted" },
    { effectId: "local-trash", descriptor: { kind: "trash", targetSide: "local", path, baseAuthority: { generation: gen(1), path, fingerprint: fp("t") } }, stage: "intent-persisted" },
    { effectId: "remote-trash", descriptor: { kind: "trash", targetSide: "remote", path, remoteObjectId: remoteId, baseAuthority: { generation: gen(1), path, fingerprint: fp("t") }, identityAuthority: identity() }, stage: "intent-persisted" },
  ];
  for (const effect of effects) {
    const state = await trusted(store);
    await exerciseEveryStage(store, single(effect.effectId, effect, state.semanticGeneration), effect.effectId);
  }
});

test("clean merge keeps independently staged effects and cannot complete after only one side commits", async () => {
  const { store } = await setup();
  let state = await trusted(store);
  const merge: RecoverableOperationIntent = { logicalKind: "clean-text-merge", operationId: op("merge"), intentId: mi("merge"), semanticAuthority: { generation: state.semanticGeneration }, effects: [
    { effectId: "merge-local", descriptor: { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: path, localTransactionId: tx("ml"), intendedContent: canonical("merge") }, stage: "intent-persisted" },
    { effectId: "merge-remote", descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: path, remoteMutation: { kind: "reserved-file-create", intentId: mi("mr"), reservedRemoteObjectId: id<"RemoteObjectId">("merge-remote") as RemoteObjectId, path, intendedContent: canonical("merge") }, intendedContent: canonical("merge") }, stage: "intent-persisted" },
  ] };
  let result = await store.persistOperationIntent(merge, state.persistenceRevision, state.semanticGeneration);
  assert.equal(result.status, "saved");
  for (const stage of ["dispatch-authorized", "effect-verified", "state-committed"] as const) {
    state = await trusted(store);
    result = await store.advanceOperationEffect(merge.operationId, "merge-local", stage, stage === "effect-verified" ? "proof:merge-local" : undefined, state.persistenceRevision, state.semanticGeneration);
    assert.equal(result.status, "saved");
  }
  state = await trusted(store);
  const persisted = state.operationIntents.find(x => x.operationId === merge.operationId);
  assert.ok(persisted);
  if (!persisted) throw new Error("merge intent missing");
  assert.equal(recoverableOperationIsComplete(persisted), false);
  assert.equal(persisted.effects[0].stage, "state-committed");
  assert.equal(persisted.effects[1]?.stage, "intent-persisted");
});

test("known semantic contradictions and extensible contradictions both fail closed", async () => {
  const base = createInitialAuthorityState({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device });
  const known = new DurableSemanticStateValidator().validate({ ...base, knownDevices: [] });
  assert.ok(known.some(x => x.code === "active-device-missing"));
  const validator = new DurableSemanticStateValidator([() => "future invariant contradiction"]);
  assert.ok(validator.validate(base).some(x => x.code === "other-semantic-inconsistency" && x.invariantCategory === "extension-invariant"));
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage, 1, validator);
  assert.equal((await store.saveTrusted(base)).status, "recovery-required");
});

test("legacy state is not promoted silently; authority migration backs up before reconstruction", async () => {
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage);
  const legacy = { ...createInitialTrustedState({ stateRevision: rev(1), vaultIdentity: vault, deviceIdentity: device }), base: [{ path, entityKind: "file" as const, localExisted: true, remoteExisted: true, remoteObjectId: remoteId }] };
  assert.equal((await store.saveTrusted(legacy)).status, "saved");
  assert.equal((await store.loadAuthority()).status, "recovery-required");
  const migrated = await store.migrateToAuthority(1, () => createInitialAuthorityState({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device }));
  assert.equal(migrated.status, "migrated");
  assert.equal(storage.backups.size, 1);
  assert.equal((await store.loadAuthority()).status, "trusted");
});

test("stale-device registration, aging, clearing, and durable semantic transition gate destructive authority", async () => {
  const { store } = await setup();
  let state = await trusted(store);
  const registered = registerKnownDevice(state, peer);
  assert.equal(registered.knownDevices.find(x => x.deviceId === peer)?.stale, true);
  assert.equal(staleDeviceBlocksDestructiveAuthority(registered), true);
  let saved = await store.saveAuthority(registered as DurableSynchronizationAuthorityState, state.persistenceRevision, state.semanticGeneration);
  assert.equal(saved.status, "saved"); if (saved.status !== "saved") return;
  assert.notEqual(saved.semanticGeneration, state.semanticGeneration);

  state = await trusted(store);
  let reconciled = markKnownDeviceReconciled(state, peer, 1_000) as DurableSynchronizationAuthorityState;
  saved = await store.saveAuthority(reconciled, state.persistenceRevision, state.semanticGeneration);
  assert.equal(saved.status, "saved");
  state = await trusted(store);
  assert.equal(staleDeviceBlocksDestructiveAuthority(state), false);

  const aged = ageKnownDevices(state, 10_000, { staleAfterMs: 5_000 }) as DurableSynchronizationAuthorityState;
  assert.equal(aged.knownDevices.find(x => x.deviceId === peer)?.stale, true);
  const explicitlyStale = markKnownDeviceStale(reconciled, peer);
  assert.equal(staleDeviceBlocksDestructiveAuthority(explicitlyStale), true);
});
