import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  recoverableOperationV1_1IsComplete,
  type BaseFingerprint,
  type FolderCreatePathAuthority,
  type IdentityAuthorityProof,
  type MutationIntentId,
  type OperationId,
  type PersistenceRevision,
  type RecoverableMutationEffect,
  type RecoverableOperationIntent,
  type RecoverableOperationIntentV1_1,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
  createInitialAuthorityStateV1,
  type DurableSynchronizationAuthorityState,
} from "../../../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:v1.1") as VaultIdentity;
const device = id<"DeviceIdentity">("device:v1.1");
const gen = (n: number) => id<"SemanticStateGeneration">(`semantic:${n}`) as SemanticStateGeneration;
const rev = (n: number) => id<"StateRevision">(`state:${n}`) as PersistenceRevision;
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const mutationId = (value: string) => id<"MutationIntentId">(value) as MutationIntentId;
const operationId = (value: string) => id<"OperationId">(value) as OperationId;
const fingerprint = (value: string) => id<"BaseFingerprint">(value) as BaseFingerprint;

function authority(target: VaultPath, parent: VaultPath, generation = gen(1)): FolderCreatePathAuthority {
  return { generation, targetPath: target, parentPath: parent, pathComparisonKey: String(target).normalize("NFC").toLocaleLowerCase("en-US"), expectedTarget: "absent" };
}

function localFolder(stage: "intent-persisted" | "dispatch-authorized" | "effect-verified" | "state-committed" = "intent-persisted"): RecoverableOperationIntentV1_1 {
  const target = path("empty/local"); const intentId = mutationId("intent:local-folder");
  return {
    logicalKind: "single-effect",
    operationId: operationId("op:local-folder"),
    intentId,
    semanticAuthority: { generation: gen(1) },
    effects: [{
      effectId: "effect:local-folder",
      descriptor: { kind: "local-folder-create", targetSide: "local", mutationKind: "create", intentId, targetPath: target, pathAuthority: authority(target, path("empty")) },
      stage,
      ...((stage === "effect-verified" || stage === "state-committed") ? { verificationEvidenceRef: "proof:local-folder" } : {}),
    }],
  };
}

function remoteFolder(stage: "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified" | "state-committed" = "dispatch-authorized"): RecoverableOperationIntentV1_1 {
  const target = path("empty/remote"); const intentId = mutationId("intent:remote-folder"); const reserved = remoteId("folder:reserved:stable");
  return {
    logicalKind: "single-effect",
    operationId: operationId("op:remote-folder"),
    intentId,
    semanticAuthority: { generation: gen(1) },
    effects: [{
      effectId: "effect:remote-folder",
      descriptor: {
        kind: "remote-folder-create", targetSide: "remote", mutationKind: "create", intentId, targetPath: target,
        parentRemoteObjectId: remoteId("folder:parent:stable"), pathAuthority: authority(target, path("empty")),
        remoteMutation: { kind: "reserved-folder-create", intentId, reservedRemoteObjectId: reserved, path: target },
      },
      stage,
      ...((stage === "effect-verified" || stage === "state-committed") ? { verificationEvidenceRef: "proof:remote-folder" } : {}),
    }],
  };
}

async function setup() {
  const storage = new MemoryStateByteStorage(); const store = new PersistentSynchronizationStateStore(storage);
  const state = createInitialAuthorityState({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await store.saveTrusted(state)).status, "saved");
  return { storage, store };
}

async function trusted(store: PersistentSynchronizationStateStore): Promise<DurableSynchronizationAuthorityState> {
  const loaded = await store.loadAuthority(); assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("expected trusted v1.1 authority"); return loaded.state;
}

test("v1.1 production store round-trips LOCAL folder-create authority across restart unchanged", async () => {
  const { storage, store } = await setup();
  const intent = localFolder(); const saved = await store.persistOperationIntent(intent, rev(1), gen(1));
  assert.equal(saved.status, "saved");
  const restarted = new PersistentSynchronizationStateStore(storage); const loaded = await trusted(restarted);
  assert.deepEqual(loaded.operationIntents[0], intent);
  const descriptor = loaded.operationIntents[0]?.effects[0]?.descriptor;
  assert.equal(descriptor?.kind, "local-folder-create");
  if (descriptor?.kind === "local-folder-create") assert.equal("intendedContent" in descriptor, false);
});

test("v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart", async () => {
  const { storage, store } = await setup(); const intent = remoteFolder("dispatch-authorized");
  const saved = await store.persistOperationIntent(intent, rev(1), gen(1)); assert.equal(saved.status, "saved");
  const restarted = new PersistentSynchronizationStateStore(storage); const loaded = await trusted(restarted);
  const effect = loaded.operationIntents[0]?.effects[0]; const descriptor = effect?.descriptor;
  assert.equal(descriptor?.kind, "remote-folder-create");
  if (descriptor?.kind !== "remote-folder-create") return;
  assert.equal(descriptor.parentRemoteObjectId, remoteId("folder:parent:stable"));
  assert.equal(descriptor.remoteMutation.reservedRemoteObjectId, remoteId("folder:reserved:stable"));
  assert.deepEqual(await restarted.restartRecoveryDirectives(), [{ operationId: intent.operationId, effectId: "effect:remote-folder", directive: { action: "reconcile-physical-reality" } }]);
});

test("v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied", async () => {
  const { storage, store } = await setup(); const intent = remoteFolder("dispatch-authorized");
  assert.equal((await store.persistOperationIntent(intent, rev(1), gen(1))).status, "saved");
  const directives = await new PersistentSynchronizationStateStore(storage).restartRecoveryDirectives();
  assert.equal(directives[0]?.directive.action, "reconcile-physical-reality");
});

test("v1.1 verified folder effect restarts by finishing authoritative state commit", async () => {
  const { storage, store } = await setup(); const intent = localFolder("dispatch-authorized");
  const persisted = await store.persistOperationIntent(intent, rev(1), gen(1)); assert.equal(persisted.status, "saved"); if (persisted.status !== "saved") return;
  const verified = await store.advanceOperationEffect(intent.operationId, "effect:local-folder", "effect-verified", "proof:local-folder", persisted.persistenceRevision, persisted.semanticGeneration);
  assert.equal(verified.status, "saved");
  const directives = await new PersistentSynchronizationStateStore(storage).restartRecoveryDirectives();
  assert.equal(directives[0]?.directive.action, "finish-authoritative-state-commit");
});

test("v1.1 folder-containing logical operation remains incomplete until every effect is state-committed", () => {
  const local = localFolder("state-committed").effects[0]; const remote = remoteFolder("effect-verified").effects[0];
  const merge: RecoverableOperationIntentV1_1 = { logicalKind: "clean-text-merge", operationId: operationId("op:mixed-folder"), intentId: mutationId("intent:mixed-folder"), semanticAuthority: { generation: gen(1) }, effects: [local, remote] };
  assert.equal(recoverableOperationV1_1IsComplete(merge), false);
  const completed: RecoverableOperationIntentV1_1 = { ...merge, effects: [local, { ...remote, stage: "state-committed" }] };
  assert.equal(recoverableOperationV1_1IsComplete(completed), true);
});

test("v1.1 journal-only folder updates advance persistence revision without semantic generation", async () => {
  const { store } = await setup(); const saved = await store.persistOperationIntent(localFolder(), rev(1), gen(1));
  assert.equal(saved.status, "saved"); if (saved.status !== "saved") return;
  assert.notEqual(saved.persistenceRevision, rev(1)); assert.equal(saved.semanticGeneration, gen(1));
});

function oldFileIntent(name: string, descriptor: RecoverableMutationEffect["descriptor"]): RecoverableOperationIntent {
  return { logicalKind: "single-effect", operationId: operationId(`op:${name}`), intentId: mutationId(`intent:${name}`), semanticAuthority: { generation: gen(1) }, effects: [{ effectId: `effect:${name}`, descriptor, stage: "intent-persisted" }] };
}

test("explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects", async () => {
  const storage = new MemoryStateByteStorage(); const store = new PersistentSynchronizationStateStore(storage);
  const target = path("notes/a.md"); const moved = path("notes/b.md"); const remote = remoteId("remote:a");
  const identity: IdentityAuthorityProof = { status: "unique", generation: gen(1), path: target, remoteObjectId: remote };
  const source = createInitialAuthorityStateV1({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device });
  const intents: readonly RecoverableOperationIntent[] = [
    oldFileIntent("file", { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: target, remoteMutation: { kind: "reserved-file-create", intentId: mutationId("intent:file-create"), reservedRemoteObjectId: remote, path: target, intendedContent: { algorithm: "sha256", hash: id<"ContentHash">("hash:file"), sizeBytes: 4 } }, intendedContent: { algorithm: "sha256", hash: id<"ContentHash">("hash:file"), sizeBytes: 4 } }),
    oldFileIntent("move", { kind: "move", targetSide: "remote", fromPath: target, toPath: moved, remoteObjectId: remote, identityAuthority: identity }),
    oldFileIntent("trash", { kind: "trash", targetSide: "remote", path: target, remoteObjectId: remote, baseAuthority: { generation: gen(1), path: target, fingerprint: fingerprint("base:a") }, identityAuthority: identity }),
  ];
  assert.equal((await store.saveTrusted({ ...source, operationIntents: intents })).status, "saved");
  assert.equal((await store.loadAuthority()).status, "recovery-required");
  const migrated = await store.migrateAuthorityV1ToV1_1(); assert.equal(migrated.status, "migrated");
  assert.equal(storage.backups.size, 1);
  const loaded = await trusted(new PersistentSynchronizationStateStore(storage));
  assert.deepEqual(loaded.operationIntents.map(item => item.effects[0].descriptor.kind), ["remote-file", "move", "trash"]);
  assert.equal(loaded.semanticGeneration, gen(1)); assert.notEqual(loaded.persistenceRevision, rev(1));
});

function envelopeChecksum(value: string): string { let hash = 0x811c9dc5; for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; } return `fnv1a32:${hash.toString(16).padStart(8, "0")}`; }

test("malformed or inconsistent persisted v1.1 folder journal fails closed", async () => {
  const { storage, store } = await setup(); const intent = remoteFolder("dispatch-authorized");
  assert.equal((await store.persistOperationIntent(intent, rev(1), gen(1))).status, "saved");
  const envelope = JSON.parse(new TextDecoder().decode(storage.bytes!)) as { checksum: string; state: { operationIntents: Array<{ effects: Array<{ descriptor: { remoteMutation: { intentId: string } } }> }> } };
  envelope.state.operationIntents[0]!.effects[0]!.descriptor.remoteMutation.intentId = "intent:wrong";
  const payload = JSON.stringify(envelope.state); envelope.checksum = envelopeChecksum(payload); storage.bytes = new TextEncoder().encode(JSON.stringify(envelope));
  const loaded = await new PersistentSynchronizationStateStore(storage).loadAuthority();
  assert.equal(loaded.status, "recovery-required");
  if (loaded.status === "recovery-required") assert.ok(loaded.issues.some(item => item.code === "other-semantic-inconsistency"));
});

test("v1.1 validator rejects folder descriptor/operation intent mismatch before persistence", async () => {
  const { store } = await setup(); const good = localFolder(); const effect = good.effects[0];
  const bad: RecoverableOperationIntentV1_1 = { ...good, intentId: mutationId("intent:different"), effects: [effect] };
  const result = await store.persistOperationIntent(bad, rev(1), gen(1));
  assert.equal(result.status, "recovery-required");
});
