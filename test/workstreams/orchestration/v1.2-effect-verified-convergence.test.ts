import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type GoogleDrivePort, type LocalVaultPort, type PersistenceRevision, type RemoteObjectId, type StateRevision, type SynchronizationAuthorityMetadataV1_1, type SynchronizationAuthoritySaveResult, type SynchronizationAuthorityStoreV1_1, type TrustedSynchronizationState, type VaultPath } from "../../../src/contracts";
import { recoverOutstandingDurableIntents } from "../../../src/product/durable-intent-recovery";
import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = id<"VaultPath">("notes/verified-diverged.md") as VaultPath;
const reserved = id<"RemoteObjectId">("remote:verified-diverged") as RemoteObjectId;
const root = id<"RemoteObjectId">("root:verified-diverged") as RemoteObjectId;
const vault = id<"VaultIdentity">("vault:verified-diverged");
const device = id<"DeviceIdentity">("device:verified-diverged");
const generation = id<"SemanticStateGeneration">("generation:verified-diverged");
const stateRevision = id<"StateRevision">("state:verified-diverged") as StateRevision;
const content = { algorithm: "sha256" as const, hash: id<"ContentHash">("hash:verified-diverged"), sizeBytes: 8 };
const operationId = id<"OperationId">("op:verified-diverged");
const intentId = id<"MutationIntentId">("intent:verified-diverged");

class Authority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1 = {
    persistenceRevision: id<"StateRevision">("authority:1") as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [], pathConvergence: [], localTransactions: [],
    operationIntents: [{
      logicalKind: "single-effect", operationId, intentId, semanticAuthority: { generation },
      effects: [{
        effectId: "effect:verified-diverged", stage: "effect-verified", verificationEvidenceRef: "proof:verified-before-crash",
        descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: path, intendedContent: content, remoteMutation: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: reserved, path, intendedContent: content } },
      }],
    }],
  };
  saves = 0;
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1): Promise<SynchronizationAuthoritySaveResult> { this.saves += 1; this.value = candidate; return { status: "saved", persistenceRevision: candidate.persistenceRevision, semanticGeneration: candidate.semanticGeneration }; }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
}

class Canonical {
  value: TrustedSynchronizationState = { schemaVersion: 1, stateRevision, vaultIdentity: vault as never, deviceIdentity: device as never, base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [] };
  saves = 0;
  async load() { return { status: "trusted" as const, state: this.value }; }
  async saveTrusted() { this.saves += 1; return { status: "saved" as const, stateRevision }; }
  async createRecoveryBackup() { return { backupId: "unused" }; }
  async assessMigration() { return { status: "compatible" as const, toVersion: 1 }; }
  async exportDiagnosticState() { return new Uint8Array(); }
}

test("D-C11 effect-verified restart re-observes convergence and preserves evidence when physical reality diverged", async () => {
  const authority = new Authority();
  const canonical = new Canonical();
  let rawMutations = 0;
  const local = { observe: async (target: VaultPath) => ({ status: "absent", side: "local", path: target }) } as unknown as LocalVaultPort;
  const drive = {
    listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "complete" } } }),
    create: async () => { rawMutations += 1; throw new Error("must not redispatch"); },
    update: async () => { rawMutations += 1; throw new Error("must not redispatch"); },
    move: async () => { rawMutations += 1; throw new Error("must not redispatch"); },
    trash: async () => { rawMutations += 1; throw new Error("must not redispatch"); },
  } as unknown as GoogleDrivePort;
  const context = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device } as const;
  const remote = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") } as never;
  const executor = new ProductSynchronizationExecutor(local, drive, canonical as never, context, () => ({ managedRemote: remote, remoteEnumerationComplete: true }));

  const result = await recoverOutstandingDurableIntents(executor, authority, canonical as never, context, remote);
  assert.equal(result.status, "recovery-required");
  assert.equal(rawMutations, 0);
  assert.equal(canonical.saves, 0, "diverged physical reality cannot cross canonical state commit");
  assert.equal(authority.saves, 0, "verified physical evidence remains durable and unchanged");
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
  assert.equal(authority.value.operationIntents[0]?.effects[0]?.verificationEvidenceRef, "proof:verified-before-crash");
});
