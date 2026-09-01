import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type ContentHash,
  type DeviceIdentity,
  type ExecutablePlannedOperation,
  type GoogleDrivePort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type OperationId,
  type PersistenceRevision,
  type PlanId,
  type PlannedOperation,
  type ReliableRemoteMutationPort,
  type RemoteObjectId,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type SynchronizationPlan,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import { InMemoryRunLeasePort } from "../../../src/core/run-coordinator";
import { BoundedAuditHistory } from "../../../src/product/audit-history";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { IntegratedProductController } from "../../../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";
import type { AssembledPlanningInput } from "../../../src/product/snapshot-assembler";
import { TrustedStateSynchronizationAuthorityStore } from "../../../src/product/trusted-state-authority-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const revision = (value: string) => id<"StateRevision">(value) as StateRevision;
const vault = id<"VaultIdentity">("vault:production-authority") as VaultIdentity;
const device = id<"DeviceIdentity">("device:production-authority") as DeviceIdentity;
const generation = id<"SemanticStateGeneration">("generation:production-authority");
const target = path("notes/authority.md");
const expectedRemoteId = remoteId("remote:authority");
const candidateRemoteId = remoteId("remote:authority:candidate");
const hash = id<"ContentHash">("hash:authority") as ContentHash;
const managedRemote: ManagedRemoteIdentity = { rootId: remoteId("root:authority"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const stateContext: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };

function trustedState(): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: revision("state:1"), vaultIdentity: vault, deviceIdentity: device,
    base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: expectedRemoteId, content: { hash, sizeBytes: 3 } }],
    remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: expectedRemoteId }], tombstones: [], operations: [], knownDevices: [],
  };
}
function authority(): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: revision("authority:1") as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: [{ path: target, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:authority") } }],
    operationIntents: [], localTransactions: [],
  };
}
class WritableAuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  value = authority();
  saves: SynchronizationAuthorityMetadataV1_1[] = [];
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    if (expected !== this.value.persistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: this.value.persistenceRevision };
    const next = revision(`authority:${this.saves.length + 2}`) as PersistenceRevision;
    this.value = { ...candidate, persistenceRevision: next };
    this.saves.push(this.value);
    return { status: "saved", persistenceRevision: next, semanticGeneration: this.value.semanticGeneration };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
}
function stateStore(state = trustedState()) {
  return { load: async () => ({ status: "trusted" as const, state }), saveTrusted: async () => ({ status: "saved" as const, stateRevision: state.stateRevision }) };
}
const source: BinaryContentSource = { sizeBytes: 3, async *openChunks() { yield new Uint8Array([1, 2, 3]); } };
function plannedNominal(): PlannedOperation {
  return {
    operationId: id<"OperationId">("op:nominal") as OperationId, kind: "upload-update", path: target, targetSide: "remote", remoteObjectId: expectedRemoteId,
    contentVersion: { path: target, entityKind: "file", content: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">("local:stable") }, destructive: false,
    preconditions: [
      { kind: "base-trusted" }, { kind: "identity-unambiguous", path: target },
      { kind: "remote-object", remoteObjectId: expectedRemoteId, expectedRevision: "remote-revision:1" },
      { kind: "content-evidence", side: "local", path: target, expected: { hash, sizeBytes: 3 } }, { kind: "file-stable", path: target },
    ], reasons: [],
  };
}
function realExecutor(values: { observedRemoteId?: RemoteObjectId; onRawUpdate?: () => void; listCandidate?: boolean } = {}): ProductSynchronizationExecutor {
  const local = {
    observe: async () => ({ status: "present", side: "local", path: target, entityKind: "file", content: { hash, sizeBytes: 3 }, stability: "stable", observationToken: id<"ObservationToken">("local:stable") }),
    readFile: async () => ({ content: source, evidence: { hash, sizeBytes: 3 } }), validatePath: async () => ({ status: "compatible" }),
  } as unknown as LocalVaultPort;
  const drive = {
    observe: async () => ({ ok: true, value: { status: "present", side: "remote", path: target, entityKind: "file", remoteObjectId: values.observedRemoteId ?? expectedRemoteId, content: { hash, sizeBytes: 3, revision: "remote-revision:1" }, stability: "stable" } }),
    update: async () => { values.onRawUpdate?.(); return { ok: true, value: { remoteObjectId: expectedRemoteId, evidence: { hash, sizeBytes: 3 } } }; },
    listForReconciliation: async () => ({ ok: true, value: { entries: [{ path: target, entityKind: "file", remoteObjectId: values.listCandidate === false ? expectedRemoteId : candidateRemoteId, content: { hash, sizeBytes: 3 }, trashed: false }], completeness: { status: "complete" } } }),
  } as unknown as GoogleDrivePort;
  return new ProductSynchronizationExecutor(local, drive, stateStore() as never, stateContext, () => ({ managedRemote, remoteEnumerationComplete: true }));
}
function executable(): ExecutablePlannedOperation {
  return {
    ...plannedNominal(), authorityComplete: true,
    preconditions: [
      { kind: "base-authority", authority: { generation, path: target, fingerprint: id<"BaseFingerprint">("base:authority") } },
      { kind: "identity-authority", proof: { generation, status: "unique", path: target, remoteObjectId: expectedRemoteId } },
      { kind: "remote-object", remoteObjectId: expectedRemoteId, expectedRevision: "remote-revision:1" },
      { kind: "content-evidence", side: "local", path: target, expected: { hash, sizeBytes: 3 } }, { kind: "file-stable", path: target },
    ],
  };
}
function reliableRemote(log: string[]): ReliableRemoteMutationPort {
  return {
    async reserveFileCreateIdentity(_root, intentId, targetPath, intendedContent) {
      log.push("reserve-update-candidate");
      return { ok: true, value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: candidateRemoteId, path: targetPath, intendedContent } };
    },
    async reserveFolderCreateIdentity() { throw new Error("not used"); },
    async createReserved() { throw new Error("raw create not expected"); },
    async updateExisting(identity) {
      log.push("updateExisting");
      assert.equal(identity.kind, "existing-file-content-update");
      assert.equal(identity.remoteObjectId, expectedRemoteId);
      assert.equal(identity.candidateRemoteObjectId, candidateRemoteId);
      return { status: "verified-effect", applicationProof: { kind: "immutable-candidate-preservation", candidateRemoteObjectId: candidateRemoteId, predecessorRemoteObjectId: expectedRemoteId, predecessorRevision: identity.expectedRevision, intendedContent: identity.intendedContent, verifiedContent: identity.intendedContent, preservedRemoteObjectIds: [expectedRemoteId, candidateRemoteId] } };
    },
    async moveExisting() { throw new Error("not used"); }, async trashExisting() { throw new Error("not used"); },
  };
}

test("D actual controller plus product executor has no nominal-only ordinary mutation fallback", async () => {
  let raw = 0;
  const executor = realExecutor({ onRawUpdate: () => { raw += 1; } });
  const plan: SynchronizationPlan = { planId: id<"PlanId">("plan:production-boundary") as PlanId, trigger: "manual", operations: [plannedNominal()], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" };
  const assembly: AssembledPlanningInput = { input: { snapshots: [], state: { status: "trusted", state: trustedState() } }, managedRemote, localEnumeration: { status: "complete" }, remoteEnumeration: { status: "complete" }, mode: "full" };
  const controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext, stateStore: stateStore({ ...trustedState(), remoteMappings: [] }) as never,
    snapshotAssembler: { assembleFull: async () => assembly } as never, executor, conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: () => ({ plan: async () => plan }), leasePort: new InMemoryRunLeasePort(), audit: { append: async () => undefined, read: async () => [] } as unknown as BoundedAuditHistory, holderId: "test:production-authority",
  });
  await controller.previewManual();
  const result = await controller.request({ kind: "execute-plan", planId: plan.planId });
  assert.equal(result.status, "rejected"); assert.equal(raw, 0); assert.equal(controller.currentSurface().status.kind, "recovery-required");
});

test("D production update stops at effect-verified until authoritative canonical commit occurs", async () => {
  let raw = 0; const log: string[] = []; const store = new WritableAuthorityStore(); const legacy = realExecutor({ onRawUpdate: () => { raw += 1; } });
  const adapter = createAuthoritativeProductExecutor(legacy, store, stateStore() as never, stateContext, managedRemote, { reliableRemoteMutationPort: reliableRemote(log) });
  const result = await adapter.execute(executable());
  assert.equal(result.status, "durable-verified-success"); assert.equal(raw, 0); assert.deepEqual(log, ["reserve-update-candidate", "updateExisting"]);
  const stages = store.saves.flatMap(saved => saved.operationIntents.flatMap(intent => intent.effects.map(effect => effect.stage)));
  assert.equal(stages.includes("intent-persisted"), true); assert.equal(stages.includes("dispatch-authorized"), true); assert.equal(stages.includes("effect-verified"), true);
  assert.equal(stages.includes("state-committed"), false, "executor cannot persist state-committed before canonical BASE/state commit");
  assert.equal(store.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
  const dispatchSave = store.saves.find(saved => saved.operationIntents.some(intent => intent.effects.some(effect => effect.stage === "dispatch-authorized")));
  assert.ok(dispatchSave, "dispatch-authorized must be durably saved before updateExisting returns control");
});

test("D authoritative production adapter vetoes mutation when independent remote observation disagrees", async () => {
  const log: string[] = []; const legacy = realExecutor({ observedRemoteId: remoteId("remote:intruder") });
  const result = await createAuthoritativeProductExecutor(legacy, new WritableAuthorityStore(), stateStore() as never, stateContext, managedRemote, { reliableRemoteMutationPort: reliableRemote(log) }).execute(executable());
  assert.equal(result.status, "stale-precondition"); assert.deepEqual(log, []);
});

test("D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation", async () => {
  const bridge = new TrustedStateSynchronizationAuthorityStore(stateStore() as never, stateContext);
  const loaded = await bridge.loadAuthority(); assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") return;
  const result = await bridge.saveAuthority({ ...loaded.state, operationIntents: [] }, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
  assert.equal(result.status, "recovery-required");
});

test("D missing writable/frozen production mutation dependencies fail closed before physical dispatch", async () => {
  let raw = 0; const legacy = realExecutor({ onRawUpdate: () => { raw += 1; } });
  const result = await createAuthoritativeProductExecutor(legacy, new WritableAuthorityStore(), stateStore() as never, stateContext, managedRemote).execute(executable());
  assert.equal(result.status, "recovery-required"); assert.equal(raw, 0);
});