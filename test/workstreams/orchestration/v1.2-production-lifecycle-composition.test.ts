import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ExecutablePlannedOperation,
  type PersistenceRevision,
  type RemoteObjectId,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultPath,
} from "../../../src/contracts";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";

const id = <T extends string>(value: string) => contractId<T>(value);
const p = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const rev = (value: string) => id<"StateRevision">(value) as StateRevision;
const generation = id<"SemanticStateGeneration">("g:production-composition");
const vault = id<"VaultIdentity">("vault:production-composition");
const device = id<"DeviceIdentity">("device:production-composition");
const managedRemote = { rootId: rid("root:production-composition"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const stateContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device } as const;
const hash = id<"ContentHash">("hash:new");
const priorHash = id<"ContentHash">("hash:prior");
const bytes = { sizeBytes: 3, async *openChunks() { yield new Uint8Array([1, 2, 3]); } };

class Authority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1;
  saves = 0;
  constructor(paths: readonly VaultPath[] = []) {
    this.value = {
      persistenceRevision: rev("authority:1") as PersistenceRevision,
      semanticGeneration: generation,
      learnedRemoteBatches: [],
      pathConvergence: paths.map(path => ({ path, state: { status: "converged" as const, generation, baseFingerprint: id<"BaseFingerprint">(`base:${String(path)}`) } })),
      operationIntents: [], localTransactions: [],
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
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: generation }; }
}

type LocalEntry = { entityKind: "file" | "folder"; hash?: string; sizeBytes?: number; token?: string };
type RemoteEntry = { path: VaultPath; entityKind: "file" | "folder"; remoteObjectId: RemoteObjectId; hash?: string; sizeBytes?: number; trashed?: boolean };

function harness(initial: { local?: Record<string, LocalEntry>; remote?: RemoteEntry[]; mappings?: { path: VaultPath; entityKind: "file" | "folder"; remoteObjectId: RemoteObjectId }[] } = {}) {
  const localEntries = new Map<string, LocalEntry>(Object.entries(initial.local ?? {}));
  let remoteEntries = [...(initial.remote ?? [])];
  let rawRemoteCalls = 0;
  const mutationCalls: string[] = [];
  const localTxCalls: string[] = [];
  let reserveSequence = 0;
  const canonical: TrustedSynchronizationState = {
    schemaVersion: 1, stateRevision: rev("state:1"), vaultIdentity: vault, deviceIdentity: device,
    base: [], remoteMappings: initial.mappings ?? [], tombstones: [], operations: [], knownDevices: [],
  };
  const stateStore = { load: async () => ({ status: "trusted" as const, state: canonical }) };
  const local = {
    observe: async (path: VaultPath) => {
      const found = localEntries.get(String(path));
      return found
        ? { status: "present", side: "local", path, entityKind: found.entityKind, content: found.entityKind === "file" ? { hash: id<"ContentHash">(found.hash ?? String(hash)), sizeBytes: found.sizeBytes ?? 3 } : undefined, stability: "stable", observationToken: id<"ObservationToken">(found.token ?? `token:${String(path)}`) }
        : { status: "absent", side: "local", path, stability: "stable" };
    },
    readFile: async (path: VaultPath) => ({ content: bytes, evidence: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">(`token:${String(path)}`) }),
    createFolder: async (path: VaultPath) => { mutationCalls.push(`local-folder:${String(path)}`); localEntries.set(String(path), { entityKind: "folder", token: `folder:${String(path)}` }); },
    move: async (from: VaultPath, to: VaultPath) => { mutationCalls.push(`local-move:${String(from)}->${String(to)}`); const found = localEntries.get(String(from)); if (found) { localEntries.delete(String(from)); localEntries.set(String(to), found); } },
    trash: async (path: VaultPath) => { mutationCalls.push(`local-trash:${String(path)}`); localEntries.delete(String(path)); },
  };
  const drive = {
    download: async () => ({ ok: true, value: { content: bytes, evidence: { hash, sizeBytes: 3 } } }),
    listForReconciliation: async () => ({ ok: true, value: { entries: remoteEntries, completeness: { status: "complete" } } }),
    create: async () => { rawRemoteCalls += 1; throw new Error("raw remote create forbidden"); },
    update: async () => { rawRemoteCalls += 1; throw new Error("raw remote update forbidden"); },
    move: async () => { rawRemoteCalls += 1; throw new Error("raw remote move forbidden"); },
    trash: async () => { rawRemoteCalls += 1; throw new Error("raw remote trash forbidden"); },
  };
  const legacy = {
    local, drive,
    validatePreconditions: async () => ({ status: "valid" as const }),
    versionStillCurrent: async () => true,
    runEvidence: () => ({ managedRemote, remoteEnumerationComplete: true }),
  };
  const remoteMutation = {
    async reserveFileCreateIdentity(_root: unknown, intentId: unknown, target: VaultPath, intendedContent: unknown) {
      reserveSequence += 1; const reservedRemoteObjectId = rid(`reserved:file:${reserveSequence}`);
      mutationCalls.push(`reserve-file:${String(target)}`);
      return { ok: true, value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId, path: target, intendedContent } };
    },
    async reserveFolderCreateIdentity(_root: unknown, intentId: unknown, target: VaultPath) {
      reserveSequence += 1; const reservedRemoteObjectId = rid(`reserved:folder:${reserveSequence}`);
      mutationCalls.push(`reserve-folder:${String(target)}`);
      return { ok: true, value: { kind: "reserved-folder-create", intentId, reservedRemoteObjectId, path: target } };
    },
    async createReserved(identity: any) {
      mutationCalls.push(`create:${identity.kind}:${String(identity.path)}`);
      remoteEntries = remoteEntries.filter(entry => entry.path !== identity.path);
      remoteEntries.push({ path: identity.path, entityKind: identity.kind === "reserved-folder-create" ? "folder" : "file", remoteObjectId: identity.reservedRemoteObjectId, hash: String(hash), sizeBytes: 3, trashed: false });
      return { status: "verified-effect", applicationProof: { kind: "reserved-create", remoteObjectId: identity.reservedRemoteObjectId, path: identity.path, verifiedContent: identity.intendedContent } };
    },
    async updateExisting(identity: any) {
      mutationCalls.push(`update:${String(identity.path)}`);
      remoteEntries = remoteEntries.filter(entry => entry.path !== identity.path);
      remoteEntries.push({ path: identity.path, entityKind: "file", remoteObjectId: identity.candidateRemoteObjectId, hash: String(hash), sizeBytes: 3, trashed: false });
      return { status: "verified-effect", applicationProof: { kind: "immutable-candidate-preservation", candidateRemoteObjectId: identity.candidateRemoteObjectId, predecessorRemoteObjectId: identity.remoteObjectId, predecessorRevision: identity.expectedRevision, intendedContent: identity.intendedContent, verifiedContent: identity.intendedContent, preservedRemoteObjectIds: [identity.remoteObjectId, identity.candidateRemoteObjectId] } };
    },
    async moveExisting(identity: any) {
      mutationCalls.push(`remote-move:${String(identity.fromPath)}->${String(identity.toPath)}`);
      remoteEntries = remoteEntries.map(entry => entry.remoteObjectId === identity.remoteObjectId ? { ...entry, path: identity.toPath } : entry);
      return { status: "verified-effect", applicationProof: { kind: "identity-preserving-move", remoteObjectId: identity.remoteObjectId, fromPath: identity.fromPath, toPath: identity.toPath } };
    },
    async trashExisting(identity: any) {
      mutationCalls.push(`remote-trash:${String(identity.path)}`);
      remoteEntries = remoteEntries.filter(entry => entry.remoteObjectId !== identity.remoteObjectId);
      return { status: "verified-effect", applicationProof: { kind: "trash", remoteObjectId: identity.remoteObjectId, path: identity.path, trashed: true } };
    },
  };
  const localTransactions = {
    async stageAndVerify(tx: any) { localTxCalls.push(`stage:${tx.mutationKind}`); return { status: "staged-verified", transaction: { ...tx, stage: "staged-verified" } }; },
    async commitVerifiedStage(tx: any) { localTxCalls.push(`commit:${tx.mutationKind}`); localEntries.set(String(tx.path), { entityKind: "file", hash: String(hash), sizeBytes: 3, token: `new:${String(tx.path)}` }); return { status: "committed", transaction: { ...tx, stage: "completed" } }; },
    async recover(tx: any) { localTxCalls.push(`recover:${tx.mutationKind}`); return { status: "recovered", transaction: tx }; },
  };
  const folderRecovery = {
    async observeFolderCreateRecovery(descriptor: any) {
      const match = remoteEntries.find(entry => entry.remoteObjectId === descriptor.remoteMutation.reservedRemoteObjectId);
      return match
        ? { status: "folder", targetPath: match.path, pathComparisonKey: String(match.path).toLocaleLowerCase("en-US"), remoteObjectId: match.remoteObjectId, parentRemoteObjectId: descriptor.parentRemoteObjectId }
        : { status: "unobservable", reason: "missing" };
    },
  };
  return { localEntries, get remoteEntries() { return remoteEntries; }, set remoteEntries(value: RemoteEntry[]) { remoteEntries = value; }, rawRemoteCalls: () => rawRemoteCalls, mutationCalls, localTxCalls, canonical, stateStore, legacy, remoteMutation, localTransactions, folderRecovery };
}

function authorityFor(paths: readonly VaultPath[]) { return new Authority(paths); }
function base(path: VaultPath) { return { kind: "base-authority" as const, authority: { generation, path, fingerprint: id<"BaseFingerprint">(`base:${String(path)}`) } }; }
function identity(path: VaultPath, remoteObjectId: RemoteObjectId) { return { kind: "identity-authority" as const, proof: { generation, status: "unique" as const, path, remoteObjectId } }; }
function op(value: Omit<ExecutablePlannedOperation, "authorityComplete" | "reasons" | "destructive">): ExecutablePlannedOperation {
  return { ...value, authorityComplete: true, destructive: false, reasons: [] } as ExecutablePlannedOperation;
}
function executor(h: ReturnType<typeof harness>, authority: Authority) {
  return createAuthoritativeProductExecutor(h.legacy as never, authority, h.stateStore as never, stateContext as never, managedRemote as never, { reliableRemoteMutationPort: h.remoteMutation, localTransactionalMutationPort: h.localTransactions, remoteFolderCreateRecoveryReadPort: h.folderRecovery } as never);
}

test("D production REMOTE file create uses reserved ReliableRemoteMutationPort and stops at effect-verified", async () => {
  const target = p("remote-create.md"); const h = harness(); const authority = authorityFor([target]);
  const result = await executor(h, authority).execute(op({ operationId: id<"OperationId">("op:remote-create"), kind: "upload-create", path: target, targetSide: "remote", contentVersion: { path: target, entityKind: "file", content: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">("token:create") }, preconditions: [base(target)] }));
  assert.equal(result.status, "durable-verified-success"); assert.equal(h.rawRemoteCalls(), 0);
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.descriptor.kind, "remote-file"); assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
});

test("D production REMOTE move and trash use frozen mutation methods, never raw Drive methods", async () => {
  const source = p("remote-old.md"), destination = p("remote-new.md"), remote = rid("remote:move-trash");
  const hMove = harness({ remote: [{ path: source, entityKind: "file", remoteObjectId: remote }], mappings: [{ path: source, entityKind: "file", remoteObjectId: remote }] });
  const aMove = authorityFor([source]);
  const moved = await executor(hMove, aMove).execute(op({ operationId: id<"OperationId">("op:remote-move"), kind: "identity-preserving-move", path: source, fromPath: source, toPath: destination, targetSide: "remote", remoteObjectId: remote, preconditions: [base(source), identity(source, remote)] }));
  assert.equal(moved.status, "durable-verified-success"); assert.equal(hMove.rawRemoteCalls(), 0); assert.equal(hMove.mutationCalls.some(value => value.startsWith("remote-move:")), true);

  const hTrash = harness({ remote: [{ path: source, entityKind: "file", remoteObjectId: remote }], mappings: [{ path: source, entityKind: "file", remoteObjectId: remote }] });
  const aTrash = authorityFor([source]);
  const trashed = await executor(hTrash, aTrash).execute(op({ operationId: id<"OperationId">("op:remote-trash"), kind: "trash-remote", path: source, targetSide: "remote", remoteObjectId: remote, preconditions: [base(source), identity(source, remote)] }));
  assert.equal(trashed.status, "durable-verified-success"); assert.equal(hTrash.rawRemoteCalls(), 0); assert.equal(hTrash.mutationCalls.includes(`remote-trash:${String(source)}`), true);
});

test("D production LOCAL file create and replace use LocalTransactionalMutationPort", async () => {
  const target = p("local-file.md"), remote = rid("remote:local-file");
  for (const kind of ["download-create", "download-update"] as const) {
    const h = harness({ local: kind === "download-update" ? { [String(target)]: { entityKind: "file", hash: String(priorHash), sizeBytes: 3, token: "prior-token" } } : {}, mappings: [{ path: target, entityKind: "file", remoteObjectId: remote }] });
    const authority = authorityFor([target]);
    const preconditions: any[] = [base(target)];
    if (kind === "download-update") preconditions.push({ kind: "path-observation", side: "local", path: target, expected: "present", observationToken: "prior-token" }, { kind: "content-evidence", side: "local", path: target, expected: { hash: priorHash, sizeBytes: 3 } });
    const result = await executor(h, authority).execute(op({ operationId: id<"OperationId">(`op:${kind}`), kind, path: target, targetSide: "local", remoteObjectId: remote, contentVersion: { path: target, entityKind: "file", remoteObjectId: remote, content: { hash, sizeBytes: 3 } }, preconditions }));
    assert.equal(result.status, "durable-verified-success"); assert.deepEqual(h.localTxCalls, [kind === "download-create" ? "stage:create" : "stage:replace", kind === "download-create" ? "commit:create" : "commit:replace"]);
    assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
  }
});

test("D production LOCAL folder create, move, and trash persist descriptors before physical mutation", async () => {
  const folder = p("local-folder"), remoteFolder = rid("remote:folder-source");
  const hFolder = harness({ mappings: [{ path: folder, entityKind: "folder", remoteObjectId: remoteFolder }] }); const aFolder = authorityFor([folder]);
  const created = await executor(hFolder, aFolder).execute(op({ operationId: id<"OperationId">("op:local-folder"), kind: "download-create", path: folder, targetSide: "local", remoteObjectId: remoteFolder, contentVersion: { path: folder, entityKind: "folder", remoteObjectId: remoteFolder }, preconditions: [base(folder)] }));
  assert.equal(created.status, "durable-verified-success"); assert.equal(aFolder.value.operationIntents[0]?.effects[0]?.descriptor.kind, "local-folder-create"); assert.equal(aFolder.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");

  const from = p("local-old.md"), to = p("local-new.md"), remote = rid("remote:local-move");
  const hMove = harness({ local: { [String(from)]: { entityKind: "file", hash: String(hash), sizeBytes: 3 } }, mappings: [{ path: from, entityKind: "file", remoteObjectId: remote }] }); const aMove = authorityFor([from]);
  const moved = await executor(hMove, aMove).execute(op({ operationId: id<"OperationId">("op:local-move"), kind: "identity-preserving-move", path: from, fromPath: from, toPath: to, targetSide: "local", remoteObjectId: remote, preconditions: [base(from), identity(from, remote)] }));
  assert.equal(moved.status, "durable-verified-success"); assert.equal(hMove.mutationCalls.some(value => value.startsWith("local-move:")), true);

  const hTrash = harness({ local: { [String(from)]: { entityKind: "file", hash: String(hash), sizeBytes: 3 } } }); const aTrash = authorityFor([from]);
  const trashed = await executor(hTrash, aTrash).execute(op({ operationId: id<"OperationId">("op:local-trash"), kind: "trash-local", path: from, targetSide: "local", preconditions: [base(from)] }));
  assert.equal(trashed.status, "durable-verified-success"); assert.equal(hTrash.mutationCalls.includes(`local-trash:${String(from)}`), true);
});

test("D production clean merge persists and verifies independent LOCAL and REMOTE effects", async () => {
  const target = p("merge.md"), remote = rid("remote:merge");
  const h = harness({ local: { [String(target)]: { entityKind: "file", hash: String(priorHash), sizeBytes: 3, token: "prior-token" } }, remote: [{ path: target, entityKind: "file", remoteObjectId: remote }], mappings: [{ path: target, entityKind: "file", remoteObjectId: remote }] });
  const authority = authorityFor([target]);
  const result = await executor(h, authority).execute(op({ operationId: id<"OperationId">("op:merge"), kind: "clean-text-merge", path: target, targetSide: "remote", remoteObjectId: remote, contentVersion: { path: target, entityKind: "file", content: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">("prior-token") }, preconditions: [base(target), identity(target, remote), { kind: "remote-object", remoteObjectId: remote, expectedRevision: "revision:merge" }, { kind: "path-observation", side: "local", path: target, expected: "present", observationToken: "prior-token" }, { kind: "content-evidence", side: "local", path: target, expected: { hash: priorHash, sizeBytes: 3 } }] }));
  assert.equal(result.status, "durable-verified-success");
  const effects = authority.value.operationIntents[0]?.effects ?? [];
  assert.equal(effects.length, 2); assert.equal(effects.every(effect => effect.stage === "effect-verified"), true); assert.deepEqual(effects.map(effect => effect.descriptor.targetSide), ["local", "remote"]);
});

test("D production restart from intent-persisted never dispatches; dispatch-authorized and outcome-unknown reconcile without blind redispatch", async () => {
  const from = p("restart-old.md"), to = p("restart-new.md"), remote = rid("remote:restart");
  for (const stage of ["intent-persisted", "dispatch-authorized", "outcome-unknown"] as const) {
    const h = harness({ remote: [{ path: to, entityKind: "file", remoteObjectId: remote }], mappings: [{ path: from, entityKind: "file", remoteObjectId: remote }] });
    const authority = authorityFor([from]);
    authority.value = { ...authority.value, operationIntents: [{ logicalKind: "single-effect", operationId: id<"OperationId">(`op:restart:${stage}`), intentId: id<"MutationIntentId">(`intent:restart:${stage}`), semanticAuthority: { generation }, effects: [{ effectId: `effect:restart:${stage}`, stage, descriptor: { kind: "move", targetSide: "remote", fromPath: from, toPath: to, remoteObjectId: remote, identityAuthority: { generation, status: "unique", path: from, remoteObjectId: remote } } }] }] };
    const result = await executor(h, authority).execute(op({ operationId: id<"OperationId">(`op:restart:${stage}`), kind: "identity-preserving-move", path: from, fromPath: from, toPath: to, targetSide: "remote", remoteObjectId: remote, preconditions: [base(from), identity(from, remote)] }));
    if (stage === "intent-persisted") assert.equal(result.status, "recovery-required"); else assert.equal(result.status, "durable-verified-success");
    assert.equal(h.mutationCalls.some(value => value.startsWith("remote-move:")), false, `${stage} restart must not blindly redispatch`);
  }
});

test("D physical verification without unique logical-path convergence remains blocked and cannot become state-committed", async () => {
  const target = p("conflicted-create.md"); const h = harness(); const authority = authorityFor([target]);
  const originalCreate = h.remoteMutation.createReserved.bind(h.remoteMutation);
  h.remoteMutation.createReserved = async (identity: any) => {
    const result = await originalCreate(identity);
    h.remoteEntries = [...h.remoteEntries, { path: identity.path, entityKind: "file", remoteObjectId: rid("remote:independent-conflict"), trashed: false }];
    return result;
  };
  const result = await executor(h, authority).execute(op({ operationId: id<"OperationId">("op:conflicted-create"), kind: "upload-create", path: target, targetSide: "remote", contentVersion: { path: target, entityKind: "file", content: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">("token:conflict") }, preconditions: [base(target)] }));
  assert.equal(result.status, "blocking-failure");
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified", "physical proof alone never becomes authoritative state commit");
});