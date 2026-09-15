import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ExecutablePlannedOperation,
  type ManagedRemoteIdentity,
  type PersistenceRevision,
  type ReliableRemoteMutationPort,
  type RemoteFolderCreateRecoveryReadPort,
  type RemoteObjectId,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type DeviceIdentity,
  type VaultPath,
} from "../../../src/contracts";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const revision = (value: string) => id<"StateRevision">(value) as StateRevision;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const vault = id<"VaultIdentity">("vault:folder-production") as VaultIdentity;
const device = id<"DeviceIdentity">("device:folder-production") as DeviceIdentity;
const generation = id<"SemanticStateGeneration">("generation:folder-production");
const target = path("new-empty");
const reserved = remoteId("remote:folder:reserved:production");
const managedRemote: ManagedRemoteIdentity = { rootId: remoteId("root:folder-production"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };

class Authority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1 = {
    persistenceRevision: revision("authority:1") as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: [{ path: target, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:folder-production") } }],
    operationIntents: [],
    localTransactions: [],
  };
  saves = 0;
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    assert.equal(expected, this.value.persistenceRevision);
    this.saves += 1;
    const persistenceRevision = revision(`authority:${this.saves + 1}`) as PersistenceRevision;
    this.value = { ...candidate, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: generation };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: generation }; }
}

const canonical: TrustedSynchronizationState = {
  schemaVersion: 1,
  stateRevision: revision("state:1"),
  vaultIdentity: vault,
  deviceIdentity: device,
  base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [],
};
const stateStore = { load: async () => ({ status: "trusted" as const, state: canonical }) };

function operation(): ExecutablePlannedOperation {
  return {
    operationId: id<"OperationId">("op:folder-production"),
    kind: "upload-create",
    path: target,
    targetSide: "remote",
    contentVersion: { path: target, entityKind: "folder" },
    destructive: false,
    authorityComplete: true,
    preconditions: [{ kind: "base-authority", authority: { generation, path: target, fingerprint: id<"BaseFingerprint">("base:folder-production") } }],
    reasons: [],
  };
}

test("D-C8 production REMOTE folder reserved identity is carried into the verified receipt", async () => {
  const authority = new Authority();
  const mutation: ReliableRemoteMutationPort = {
    async reserveFileCreateIdentity() { throw new Error("file reservation must not be used"); },
    async reserveFolderCreateIdentity(_root, intentId, targetPath) {
      return { ok: true, value: { kind: "reserved-folder-create", intentId, reservedRemoteObjectId: reserved, path: targetPath } };
    },
    async createReserved(identity) {
      assert.equal(identity.kind, "reserved-folder-create");
      assert.equal(identity.reservedRemoteObjectId, reserved);
      return { status: "verified-effect", applicationProof: { kind: "reserved-create", remoteObjectId: reserved } } as never;
    },
    async updateExisting() { throw new Error("not used"); },
    async moveExisting() { throw new Error("not used"); },
    async trashExisting() { throw new Error("not used"); },
  };
  const recovery: RemoteFolderCreateRecoveryReadPort = {
    async observeFolderCreateRecovery(descriptor) {
      return { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, remoteObjectId: reserved, parentRemoteObjectId: managedRemote.rootId };
    },
  };
  const legacy = {
    validatePreconditions: async () => ({ status: "valid" as const }),
    versionStillCurrent: async () => true,
    local: {},
    drive: {
      listForReconciliation: async () => ({ ok: true, value: { entries: [{ path: target, entityKind: "folder", remoteObjectId: reserved, trashed: false }], completeness: { status: "complete" } } }),
    },
    runEvidence: () => ({ managedRemote, remoteEnumerationComplete: true }),
  };
  const executor = createAuthoritativeProductExecutor(legacy as never, authority, stateStore as never, context, managedRemote, { reliableRemoteMutationPort: mutation, remoteFolderCreateRecoveryReadPort: recovery });
  const result = await executor.execute(operation());
  assert.equal(result.status, "durable-verified-success");
  if (result.status !== "durable-verified-success") return;
  assert.equal(result.receipt.resultingRemoteObjectId, reserved);
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.descriptor.kind, "remote-folder-create");
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
});