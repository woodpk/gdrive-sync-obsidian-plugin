import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type AuthorityCompleteSuccessCommitter,
  type BinaryContentSource,
  type CommitResult,
  type ContentHash,
  type DeviceIdentity,
  type ExecutablePlannedOperation,
  type GoogleDrivePort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type OperationId,
  type PlanId,
  type PlannedOperation,
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
  type VerifiedExecutionReceipt,
} from "../../../src/contracts";
import { InMemoryRunLeasePort } from "../../../src/core/run-coordinator";
import { BoundedAuditHistory } from "../../../src/product/audit-history";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { IntegratedProductController } from "../../../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";
import type { AssembledPlanningInput } from "../../../src/product/snapshot-assembler";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const revision = (value: string) => id<"StateRevision">(value) as StateRevision;
const vault = id<"VaultIdentity">("vault:production-authority") as VaultIdentity;
const device = id<"DeviceIdentity">("device:production-authority") as DeviceIdentity;
const generation = id<"SemanticStateGeneration">("generation:production-authority");
const target = path("notes/authority.md");
const expectedRemoteId = remoteId("remote:authority");
const hash = id<"ContentHash">("hash:authority") as ContentHash;
const managedRemote: ManagedRemoteIdentity = { rootId: remoteId("root:authority"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const stateContext: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };

function trustedState(): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: revision("state:1"),
    vaultIdentity: vault,
    deviceIdentity: device,
    base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: expectedRemoteId, content: { hash, sizeBytes: 3 } }],
    remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: expectedRemoteId }],
    tombstones: [],
    operations: [],
    knownDevices: [],
  };
}

function authority(): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: revision("authority:1"),
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: [{ path: target, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:authority") } }],
    operationIntents: [],
    localTransactions: [],
  };
}

class AuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  async loadAuthority() { return { status: "trusted" as const, state: authority() }; }
  async saveAuthority(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: revision("authority:2"), semanticGeneration: generation }; }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: revision("authority:2"), semanticGeneration: generation }; }
}

class Committer implements AuthorityCompleteSuccessCommitter {
  calls = 0;
  async commitVerifiedSuccess(_operation: ExecutablePlannedOperation, _receipt: VerifiedExecutionReceipt): Promise<CommitResult> {
    this.calls += 1;
    return { status: "committed", newStateRevision: revision("authority:committed") };
  }
}

function stateStore(state = trustedState()) {
  return {
    load: async () => ({ status: "trusted" as const, state }),
    saveTrusted: async () => ({ status: "saved" as const, stateRevision: state.stateRevision }),
  };
}

const source: BinaryContentSource = {
  sizeBytes: 3,
  async *openChunks() { yield new Uint8Array([1, 2, 3]); },
};

function plannedNominal(): PlannedOperation {
  return {
    operationId: id<"OperationId">("op:nominal") as OperationId,
    kind: "upload-update",
    path: target,
    targetSide: "remote",
    remoteObjectId: expectedRemoteId,
    contentVersion: { path: target, entityKind: "file", content: { hash, sizeBytes: 3 }, observationToken: id<"ObservationToken">("local:stable") },
    destructive: false,
    preconditions: [
      { kind: "base-trusted" },
      { kind: "identity-unambiguous", path: target },
      { kind: "remote-object", remoteObjectId: expectedRemoteId },
      { kind: "content-evidence", side: "local", path: target, expected: { hash, sizeBytes: 3 } },
      { kind: "file-stable", path: target },
    ],
    reasons: [],
  };
}

function realExecutor(values: { observedRemoteId?: RemoteObjectId; onUpdate?: () => void } = {}): ProductSynchronizationExecutor {
  const local = {
    observe: async () => ({ status: "present", side: "local", path: target, entityKind: "file", content: { hash, sizeBytes: 3 }, stability: "stable", observationToken: id<"ObservationToken">("local:stable") }),
    readFile: async () => ({ content: source, evidence: { hash, sizeBytes: 3 } }),
    validatePath: async () => ({ status: "compatible" }),
  } as unknown as LocalVaultPort;
  const drive = {
    observe: async () => ({ ok: true, value: { status: "present", side: "remote", path: target, entityKind: "file", remoteObjectId: values.observedRemoteId ?? expectedRemoteId, content: { hash, sizeBytes: 3 }, stability: "stable" } }),
    update: async () => {
      values.onUpdate?.();
      return { ok: true, value: { remoteObjectId: expectedRemoteId, evidence: { hash, sizeBytes: 3 } } };
    },
  } as unknown as GoogleDrivePort;
  return new ProductSynchronizationExecutor(local, drive, stateStore() as never, stateContext, () => ({ managedRemote, remoteEnumerationComplete: true }));
}

test("D actual controller plus product executor has no nominal-only ordinary mutation fallback", async () => {
  let updateCalls = 0;
  const executor = realExecutor({ onUpdate: () => { updateCalls += 1; } });
  const plan: SynchronizationPlan = {
    planId: id<"PlanId">("plan:production-boundary") as PlanId,
    trigger: "manual",
    operations: [plannedNominal()],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
  const assembly: AssembledPlanningInput = {
    input: { snapshots: [], state: { status: "trusted", state: trustedState() } },
    managedRemote,
    localEnumeration: { status: "complete" },
    remoteEnumeration: { status: "complete" },
    mode: "full",
  };
  const missingDurableIdentity = { ...trustedState(), remoteMappings: [] };
  const controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext,
    stateStore: stateStore(missingDurableIdentity) as never,
    snapshotAssembler: { assembleFull: async () => assembly } as never,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: () => ({ plan: async () => plan }),
    leasePort: new InMemoryRunLeasePort(),
    audit: { append: async () => undefined, read: async () => [] } as unknown as BoundedAuditHistory,
    holderId: "test:production-authority",
  });
  const preview = await controller.previewManual();
  assert.equal(preview?.planId, plan.planId);
  const result = await controller.request({ kind: "execute-plan", planId: plan.planId });
  assert.equal(result.status, "rejected");
  assert.equal(updateCalls, 0, "nominal BASE/identity markers cannot reach the legacy physical updater when durable identity authority is absent");
  assert.equal(controller.currentSurface().status.kind, "recovery-required");
});

test("D authoritative production adapter independently re-observes matching remote identity before mutation", async () => {
  let updateCalls = 0;
  const legacy = realExecutor({ onUpdate: () => { updateCalls += 1; } });
  const adapter = createAuthoritativeProductExecutor(legacy, new AuthorityStore(), stateStore() as never, stateContext, managedRemote);
  const executable: ExecutablePlannedOperation = {
    ...plannedNominal(),
    authorityComplete: true,
    preconditions: [
      { kind: "base-authority", authority: { generation, path: target, fingerprint: id<"BaseFingerprint">("base:authority") } },
      { kind: "identity-authority", proof: { generation, status: "unique", path: target, remoteObjectId: expectedRemoteId } },
      { kind: "remote-object", remoteObjectId: expectedRemoteId },
      { kind: "content-evidence", side: "local", path: target, expected: { hash, sizeBytes: 3 } },
      { kind: "file-stable", path: target },
    ],
  };
  const result = await adapter.execute(executable);
  assert.equal(result.status, "durable-verified-success");
  assert.equal(updateCalls, 1);
});

test("D authoritative production adapter vetoes mutation when independent remote observation disagrees", async () => {
  let updateCalls = 0;
  const legacy = realExecutor({ observedRemoteId: remoteId("remote:intruder"), onUpdate: () => { updateCalls += 1; } });
  const adapter = createAuthoritativeProductExecutor(legacy, new AuthorityStore(), stateStore() as never, stateContext, managedRemote);
  const executable: ExecutablePlannedOperation = {
    ...plannedNominal(),
    authorityComplete: true,
    preconditions: [
      { kind: "base-authority", authority: { generation, path: target, fingerprint: id<"BaseFingerprint">("base:authority") } },
      { kind: "identity-authority", proof: { generation, status: "unique", path: target, remoteObjectId: expectedRemoteId } },
    ],
  };
  const result = await adapter.execute(executable);
  assert.equal(result.status, "stale-precondition");
  assert.equal(updateCalls, 0, "trusted mapping alone cannot override contradictory current remote reality");
});