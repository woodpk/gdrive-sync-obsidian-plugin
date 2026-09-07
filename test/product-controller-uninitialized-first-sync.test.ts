import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ContentEvidence,
  ManagedRemoteIdentity,
  PersistenceRevision,
  ReliableRemoteMutationPort,
  StateLoadContext,
  SynchronizationAuthorityStoreV1_1,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { ProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { SynchronizationStateAuthorityAdapter } from "../src/product/synchronization-adapters";
import {
  createInitialAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
} from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = id<"VaultPath">("first-sync.md") as VaultPath;
const vault = id<"VaultIdentity">("vault:c1:first-sync");
const device = id<"DeviceIdentity">("device:c1:first-sync");
const remoteId = id<"RemoteObjectId">("remote:c1:first-sync");
const managedRemote: ManagedRemoteIdentity = {
  rootId: id<"RemoteObjectId">("root:c1:first-sync"),
  vaultIdentity: vault,
  protocolVersion: id<"ProtocolVersion">("1"),
};
const content: ContentEvidence = {
  hash: sha256Text("first sync"),
  sizeBytes: new TextEncoder().encode("first sync").byteLength,
};
const source: BinaryContentSource = {
  sizeBytes: content.sizeBytes,
  async *openChunks() { yield new TextEncoder().encode("first sync"); },
};
const lease = { tryAcquire: async () => ({ release: async () => undefined }) } as never;

function trackingAuthority(store: SynchronizationStateAuthorityAdapter) {
  let loads = 0;
  const authorityStore: SynchronizationAuthorityStoreV1_1 = {
    loadAuthority: async () => { loads += 1; return store.loadAuthority(); },
    saveAuthority: (...args) => store.saveAuthority(...args),
    commitBaseTransition: (...args) => store.commitBaseTransition(...args),
  };
  return { authorityStore, loads: () => loads };
}

function planner(trigger: "manual" | "startup-resume" | "local-change" | "periodic" | "verify-reconcile") {
  return {
    plan: async () => ({
      planId: id<"PlanId">(`plan:c1:${trigger}`),
      trigger,
      operations: [{
        operationId: id<"OperationId">(`op:c1:${trigger}`),
        kind: "upload-create" as const,
        path,
        targetSide: "remote" as const,
        contentVersion: {
          path,
          entityKind: "file" as const,
          content,
          observationToken: id<"ObservationToken">("observation:c1:first-sync"),
        },
        destructive: false,
        preconditions: [],
        reasons: [{ code: "safe-union-local-only", summary: "Local-only first-sync content is copied to the managed remote." }],
      }],
      executionDisposition: "requires-user-approval" as const,
      recoveryCheckpointRequired: false,
      globalExecutionGate: "none" as const,
    }),
  };
}

function localPort() {
  return {
    observe: async (candidate: VaultPath) => candidate === path
      ? {
        status: "present" as const,
        side: "local" as const,
        path,
        entityKind: "file" as const,
        content,
        stability: "stable" as const,
        observationToken: id<"ObservationToken">("observation:c1:first-sync"),
      }
      : { status: "absent" as const, side: "local" as const, path: candidate },
    readFile: async () => ({
      content: source,
      evidence: content,
      stability: "stable" as const,
      observationToken: id<"ObservationToken">("observation:c1:first-sync"),
    }),
  } as never;
}

function drivePort() {
  return {
    observe: async (_root: unknown, candidate: VaultPath) => ({ ok: true as const, value: { status: "absent" as const, side: "remote" as const, path: candidate } }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } }),
  } as never;
}

test("C1 absent new-installation state previews first-sync safe union without persistence, then initializes authority before mutation", async () => {
  const context: StateLoadContext = {
    expectation: "new-installation",
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const store = new SynchronizationStateAuthorityAdapter(rawStore);
  const tracked = trackingAuthority(store);
  const local = localPort();
  const drive = drivePort();
  let controller!: ProductController;
  let mutationObservedTrustedAuthority = false;
  let mutationCount = 0;
  const reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_managed, intentId, targetPath, intendedContent) => ({
      ok: true,
      value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: remoteId, path: targetPath, intendedContent },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder creation is outside this regression"); },
    createReserved: async identity => {
      const beforeMutation = await store.loadAuthority();
      mutationObservedTrustedAuthority = beforeMutation.status === "trusted";
      assert.equal(beforeMutation.status, "trusted");
      mutationCount += 1;
      assert.equal(identity.kind, "reserved-file-create");
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "reserved-create",
          remoteObjectId: remoteId,
          path,
          verifiedContent: identity.kind === "reserved-file-create" ? identity.intendedContent : undefined,
        },
      } as never;
    },
    updateExisting: async () => { throw new Error("update is outside this regression"); },
    moveExisting: async () => { throw new Error("move is outside this regression"); },
    trashExisting: async () => { throw new Error("trash is outside this regression"); },
  };
  const assembly = {
    input: {
      snapshots: [{
        path,
        local: {
          status: "present" as const,
          side: "local" as const,
          path,
          entityKind: "file" as const,
          content,
          stability: "stable" as const,
          observationToken: id<"ObservationToken">("observation:c1:first-sync"),
        },
        remote: { status: "absent" as const, side: "remote" as const, path },
        base: { status: "uninitialized" as const },
        remoteEnumeration: { status: "complete" as const },
        identity: { status: "unambiguous" as const },
      }],
      state: { status: "uninitialized" as const },
    },
    managedRemote,
    remoteEnumeration: { status: "complete" as const },
    nextCursor: id<"ChangeCursor">("cursor:c1:first-sync"),
    mode: "full" as const,
  };
  const assembler = { assemble: async () => assembly, assembleFull: async () => assembly, assembleRecovery: async () => assembly } as never;
  const executor = new ProductSynchronizationExecutor(local, drive, store, context, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: tracked.authorityStore,
    snapshotAssembler: assembler,
    executor,
    reliableRemoteMutationPort,
    conflictResolver: { assess: async () => ({ kind: "none" as const }) },
    plannerForTrigger: trigger => planner(trigger),
    leasePort: lease,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "c1-first-sync",
  });

  assert.equal((await store.loadAuthority()).status, "uninitialized");
  const preview = await controller.previewVerifyReconcile();
  assert.ok(preview);
  assert.equal(preview.trigger, "verify-reconcile");
  assert.equal(preview.operations.some(operation => operation.kind === "upload-create"), true);
  assert.notEqual(controller.currentSurface().status.kind, "recovery-required");
  assert.equal((await store.loadAuthority()).status, "uninitialized");
  assert.equal(tracked.loads(), 0);
  assert.equal(mutationCount, 0);

  const result = await controller.request({ kind: "execute-plan", planId: preview.planId });
  assert.equal(result.status, "accepted");
  assert.equal(mutationObservedTrustedAuthority, true);
  assert.equal(mutationCount, 1);
  assert.equal((await store.loadAuthority()).status, "trusted");
});

test("C1 existing trusted authority planning still invokes durable-intent recovery", async () => {
  const context: StateLoadContext = {
    expectation: "existing-pairing",
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const seeded = await rawStore.saveTrusted(createInitialAuthorityState({
    persistenceRevision: id<"PersistenceRevision">("persistence:c1:trusted") as PersistenceRevision,
    semanticGeneration: id<"SemanticStateGeneration">("semantic:c1:trusted"),
    vaultIdentity: vault,
    deviceIdentity: device,
  }));
  assert.equal(seeded.status, "saved");
  const store = new SynchronizationStateAuthorityAdapter(rawStore);
  const tracked = trackingAuthority(store);
  const local = localPort();
  const drive = drivePort();
  let controller!: ProductController;
  const executor = new ProductSynchronizationExecutor(local, drive, store, context, () => controller.currentRunEvidence());
  const assemble = async () => ({
    input: { snapshots: [], state: await store.load(context) },
    managedRemote,
    remoteEnumeration: { status: "complete" as const },
    mode: "full" as const,
  });
  controller = new ProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: tracked.authorityStore,
    snapshotAssembler: { assemble, assembleFull: assemble, assembleRecovery: assemble } as never,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" as const }) },
    plannerForTrigger: trigger => ({
      plan: async () => ({
        planId: id<"PlanId">(`plan:c1:trusted:${trigger}`),
        trigger,
        operations: [],
        executionDisposition: "safe-auto-eligible" as const,
        recoveryCheckpointRequired: false,
        globalExecutionGate: "none" as const,
      }),
    }),
    leasePort: lease,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "c1-trusted",
  });

  assert.equal(tracked.loads(), 0);
  const preview = await controller.previewVerifyReconcile();
  assert.ok(preview);
  assert.ok(tracked.loads() > 0);
  assert.equal((await store.loadAuthority()).status, "trusted");
});
