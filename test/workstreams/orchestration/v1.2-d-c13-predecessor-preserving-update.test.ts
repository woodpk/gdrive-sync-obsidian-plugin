import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ExecutablePlannedOperation,
  type PersistenceRevision,
  type RecoverableOperationIntentV1_1,
  type RemoteEntry,
  type RemoteObjectId,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultPath,
} from "../../../src/contracts";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { recoverOutstandingDurableIntents } from "../../../src/product/durable-intent-recovery";

const id = <T extends string>(value: string) => contractId<T>(value);
const p = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const rev = (value: string) => id<"StateRevision">(value) as StateRevision;
const generation = id<"SemanticStateGeneration">("generation:d-c13");
const vault = id<"VaultIdentity">("vault:d-c13");
const device = id<"DeviceIdentity">("device:d-c13");
const root = rid("remote:root:d-c13");
const target = p("notes/update.md");
const predecessor = rid("remote:predecessor:d-c13");
const candidate = rid("remote:candidate:d-c13");
const wrong = rid("remote:wrong:d-c13");
const extra = rid("remote:extra:d-c13");
const expectedRevision = id<"RemoteRevisionId">("remote-revision:old");
const intendedHash = id<"ContentHash">("hash:new:d-c13");
const priorHash = id<"ContentHash">("hash:old:d-c13");
const intended = { algorithm: "sha256" as const, hash: intendedHash, sizeBytes: 4 };
const bytes = { sizeBytes: 4, async *openChunks() { yield new Uint8Array([1, 2, 3, 4]); } };
const managedRemote = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") } as never;
const context = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device } as const;

function remoteFile(remoteObjectId: RemoteObjectId, hash = priorHash, sizeBytes = 3, revision = String(expectedRevision)): RemoteEntry {
  return { path: target, entityKind: "file", remoteObjectId, content: { hash, sizeBytes, revision }, trashed: false };
}
function exactTopology(): RemoteEntry[] {
  return [remoteFile(predecessor), remoteFile(candidate, intendedHash, intended.sizeBytes, "candidate-revision")];
}
function canonicalState(): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: rev("state:1"),
    vaultIdentity: vault as never,
    deviceIdentity: device as never,
    base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: predecessor, content: { hash: priorHash, sizeBytes: 3 } }],
    remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: predecessor }],
    tombstones: [], operations: [], knownDevices: [],
  };
}

class CanonicalStore {
  saves = 0;
  constructor(public value: TrustedSynchronizationState = canonicalState()) {}
  async load() { return { status: "trusted" as const, state: this.value }; }
  async saveTrusted(value: TrustedSynchronizationState, expected?: StateRevision) {
    if (expected && expected !== this.value.stateRevision) return { status: "stale-revision" as const, actualRevision: this.value.stateRevision };
    this.saves += 1;
    this.value = value;
    return { status: "saved" as const, stateRevision: value.stateRevision };
  }
  async createRecoveryBackup() { return { backupId: "unused" }; }
  async assessMigration() { return { status: "compatible" as const, toVersion: 1 }; }
  async exportDiagnosticState() { return new Uint8Array(); }
}

class AuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  saves = 0;
  value: SynchronizationAuthorityMetadataV1_1;
  constructor(intents: readonly RecoverableOperationIntentV1_1[] = []) {
    this.value = {
      persistenceRevision: rev("authority:1") as PersistenceRevision,
      semanticGeneration: generation,
      learnedRemoteBatches: [],
      pathConvergence: [{ path: target, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:d-c13") } }],
      operationIntents: intents,
      localTransactions: [],
    };
  }
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(value: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision, expectedGeneration?: any): Promise<SynchronizationAuthoritySaveResult> {
    if (expected !== this.value.persistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: this.value.persistenceRevision };
    if (expectedGeneration && expectedGeneration !== this.value.semanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: this.value.semanticGeneration };
    this.saves += 1;
    const persistenceRevision = rev(`authority:${this.saves + 1}`) as PersistenceRevision;
    this.value = { ...value, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> {
    return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }
}

function updateIntent(stage: "dispatch-authorized" | "outcome-unknown" | "effect-verified" = "outcome-unknown"): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:d-c13:update");
  const intentId = id<"MutationIntentId">("intent:d-c13:update");
  return {
    logicalKind: "single-effect",
    operationId,
    intentId,
    semanticAuthority: { generation },
    effects: [{
      effectId: "effect:d-c13:update",
      stage,
      ...(stage === "effect-verified" ? { verificationEvidenceRef: "proof:d-c13:update" } : {}),
      descriptor: {
        kind: "remote-file", targetSide: "remote", mutationKind: "update", targetPath: target, intendedContent: intended,
        remoteMutation: {
          kind: "existing-file-content-update", intentId, remoteObjectId: predecessor, expectedRevision, path: target,
          updateProtocol: "immutable-candidate-preservation", candidateRemoteObjectId: candidate, intendedContent: intended,
          identityAuthority: { status: "unique", generation, path: target, remoteObjectId: predecessor },
        },
      },
    }],
  } as never;
}

function updateOperation(): ExecutablePlannedOperation {
  return {
    operationId: id<"OperationId">("op:d-c13:update"), kind: "upload-update", path: target, targetSide: "remote", remoteObjectId: predecessor,
    contentVersion: { path: target, entityKind: "file", content: { hash: intendedHash, sizeBytes: intended.sizeBytes }, observationToken: id<"ObservationToken">("local:stable:d-c13") },
    authorityComplete: true, destructive: false,
    preconditions: [
      { kind: "identity-authority", proof: { status: "unique", generation, path: target, remoteObjectId: predecessor } },
      { kind: "remote-object", remoteObjectId: predecessor, expectedRevision: String(expectedRevision) },
    ],
    reasons: [],
  } as never;
}

function createOperation(): ExecutablePlannedOperation {
  return {
    operationId: id<"OperationId">("op:d-c13:create"), kind: "upload-create", path: target, targetSide: "remote",
    contentVersion: { path: target, entityKind: "file", content: { hash: intendedHash, sizeBytes: intended.sizeBytes }, observationToken: id<"ObservationToken">("local:create:d-c13") },
    authorityComplete: true, destructive: false, preconditions: [], reasons: [],
  } as never;
}

type UpdateTopology = (identity: any) => RemoteEntry[];
function fixture(topologyAfterUpdate: UpdateTopology = () => exactTopology(), initialEntries: RemoteEntry[] = [remoteFile(predecessor)]) {
  let entries = [...initialEntries];
  let rawRemoteCalls = 0;
  let reliableUpdateCalls = 0;
  let reserveSequence = 0;
  const canonical = new CanonicalStore();
  const local = {
    observe: async (path: VaultPath) => ({ status: "absent", side: "local", path }),
    readFile: async () => ({ content: bytes, evidence: { hash: intendedHash, sizeBytes: intended.sizeBytes }, observationToken: id<"ObservationToken">("local:read:d-c13") }),
  };
  const drive = {
    listForReconciliation: async () => ({ ok: true, value: { entries, completeness: { status: "complete" } } }),
    create: async () => { rawRemoteCalls += 1; throw new Error("raw create forbidden"); },
    update: async () => { rawRemoteCalls += 1; throw new Error("raw update forbidden"); },
    move: async () => { rawRemoteCalls += 1; throw new Error("raw move forbidden"); },
    trash: async () => { rawRemoteCalls += 1; throw new Error("raw trash forbidden"); },
  };
  const legacy = {
    local, drive,
    validatePreconditions: async () => ({ status: "valid" as const }),
    versionStillCurrent: async () => true,
    execute: async () => ({ status: "blocking-failure" as const, reason: "legacy execute must not run" }),
    runEvidence: () => ({ managedRemote, remoteEnumerationComplete: true }),
  };
  const remoteMutation = {
    async reserveFileCreateIdentity(_root: unknown, intentId: unknown, path: VaultPath, intendedContent: unknown) {
      reserveSequence += 1;
      const reservedRemoteObjectId = reserveSequence === 1 ? candidate : rid(`remote:reserved:${reserveSequence}`);
      return { ok: true, value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId, path, intendedContent } };
    },
    async reserveFolderCreateIdentity() { throw new Error("folder reservation not expected"); },
    async createReserved(identity: any) {
      entries = [...entries, remoteFile(identity.reservedRemoteObjectId, intendedHash, intended.sizeBytes, "created")];
      return { status: "verified-effect", applicationProof: { kind: "reserved-create", remoteObjectId: identity.reservedRemoteObjectId, path: identity.path, verifiedContent: identity.intendedContent } };
    },
    async updateExisting(identity: any) {
      reliableUpdateCalls += 1;
      entries = topologyAfterUpdate(identity);
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "immutable-candidate-preservation", candidateRemoteObjectId: identity.candidateRemoteObjectId,
          predecessorRemoteObjectId: identity.remoteObjectId, predecessorRevision: identity.expectedRevision,
          intendedContent: identity.intendedContent, verifiedContent: identity.intendedContent,
          preservedRemoteObjectIds: [identity.remoteObjectId, identity.candidateRemoteObjectId],
        },
      };
    },
    async moveExisting() { throw new Error("move not expected"); },
    async trashExisting() { throw new Error("trash not expected"); },
  };
  return {
    canonical,
    legacy,
    remoteMutation,
    get entries() { return entries; },
    rawRemoteCalls: () => rawRemoteCalls,
    reliableUpdateCalls: () => reliableUpdateCalls,
  };
}

function ordinaryExecutor(f: ReturnType<typeof fixture>, authority = new AuthorityStore()) {
  return { authority, executor: createAuthoritativeProductExecutor(f.legacy as never, authority, f.canonical as never, context as never, managedRemote, { reliableRemoteMutationPort: f.remoteMutation } as never) };
}

async function expectUpdateRejected(topology: UpdateTopology) {
  const f = fixture(topology);
  const { executor } = ordinaryExecutor(f);
  const result = await executor.execute(updateOperation());
  assert.equal(result.status, "blocking-failure");
  assert.equal(f.reliableUpdateCalls(), 1);
  assert.equal(f.rawRemoteCalls(), 0);
}

test("D-C13-T1 ordinary convergence accepts exact persisted predecessor plus candidate topology", async () => {
  const f = fixture();
  const { authority, executor } = ordinaryExecutor(f);
  const result = await executor.execute(updateOperation());
  assert.equal(result.status, "durable-verified-success");
  assert.equal(f.reliableUpdateCalls(), 1);
  assert.equal(f.rawRemoteCalls(), 0);
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
});

test("D-C13-T2 restart recognizes exact completed update topology without redispatch", async () => {
  const f = fixture(() => exactTopology(), exactTopology());
  const authority = new AuthorityStore([updateIntent("outcome-unknown")]);
  const result = await recoverOutstandingDurableIntents(f.legacy as never, authority, f.canonical as never, context as never, managedRemote);
  assert.equal(result.status, "recovered");
  assert.equal(f.reliableUpdateCalls(), 0);
  assert.equal(f.rawRemoteCalls(), 0);
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
  assert.equal(f.canonical.value.remoteMappings.find(value => value.path === target)?.remoteObjectId, candidate);
});

test("D-C13-T3 REMOTE create retains strict exact-one same-path convergence", async () => {
  const f = fixture(() => exactTopology(), [remoteFile(extra)]);
  const { executor } = ordinaryExecutor(f);
  const result = await executor.execute(createOperation());
  assert.equal(result.status, "blocking-failure");
  assert.equal(f.rawRemoteCalls(), 0);
});

test("D-C13-T4 wrong predecessor identity is rejected", async () => {
  await expectUpdateRejected(() => [remoteFile(wrong), remoteFile(candidate, intendedHash, intended.sizeBytes, "candidate-revision")]);
});

test("D-C13-T5 unexpected third same-path object is rejected", async () => {
  await expectUpdateRejected(() => [...exactTopology(), remoteFile(extra)]);
});

test("D-C13-T6 wrong candidate identity and candidate content mismatch are both rejected", async () => {
  await expectUpdateRejected(() => [remoteFile(predecessor), remoteFile(wrong, intendedHash, intended.sizeBytes, "candidate-revision")]);
  await expectUpdateRejected(() => [remoteFile(predecessor), remoteFile(candidate, priorHash, intended.sizeBytes + 1, "candidate-revision")]);
});

test("D-C13-T7 predecessor revision mismatch is rejected", async () => {
  await expectUpdateRejected(() => [remoteFile(predecessor, priorHash, 3, "remote-revision:wrong"), remoteFile(candidate, intendedHash, intended.sizeBytes, "candidate-revision")]);
});
