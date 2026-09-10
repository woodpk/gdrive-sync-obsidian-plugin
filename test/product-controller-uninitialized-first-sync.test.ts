import assert from "node:assert/strict";
import test from "node:test";
import type { BinaryContentSource, ContentEvidence, ManagedRemoteIdentity, StateLoadContext, VaultPath } from "../src/contracts";
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
  const authorityStore = {
    loadAuthority: async () => { loads += 1; return store.loadAuthority(); },
    saveAuthority: (...args: any[]) => (store.saveAuthority as any)(...args),
    commitBaseTransition: (...args: any[]) => (store.commitBaseTransition as any)(...args),
  } as never;
  return { authorityStore, loads: () => loads };
}

function planner(trigger: string) {
  return {
    plan: async () => ({
      planId: id<"PlanId">(`plan:c1:${trigger}`),
      trigger,
      operations: [{
        operationId: id<"OperationId">(`op:c1:${trigger}`),
        kind: "upload-create",
        path,
        targetSide: "remote",
        contentVersion: {
          path,
          entityKind: "file",
          content,
          observationToken: id<"ObservationToken">("observation:c1:first-sync"),
        },
        destructive: false,
        preconditions: [],
        reasons: [{ code: "safe-union-local-only", summary: "Local-only first-sync content is copied to the managed remote." }],
      }],
      executionDisposition: "requires-user-approval",
      recoveryCheckpointRequired: false,
      globalExecutionGate: "none",
    }),
  } as never;
}

function localPort() {
  return {
    observe: async (candidate: VaultPath) => candidate === path
      ? {
        status: "present",
        side: "local",
        path,
        entityKind: "file",
        content,
        stability: "stable",
        observationToken: id<"ObservationToken">("observation:c1:first-sync"),
      }
      : { status: "absent", side: "local", path: candidate },
    readFile: async () => ({
      content: source,
      evidence: content,
      stability: "stable",
      observationToken: id<"ObservationToken">("observation:c1:first-sync"),
    }),
  } as never;
}

function drivePort(created: () => boolean = () => false) {
  return {
    observe: async (_root: unknown, candidate: VaultPath) => ({
      ok: true,
      value: created() && candidate === path
        ? { status: "present", side: "remote", path, entityKind: "file", content, stability: "stable", remoteObjectId: remoteId }
        : { status: "absent", side: "remote", path: candidate },
    }),
    listForReconciliation: async () => ({
      ok: true,
      value: {
        entries: created() ? [{ path, entityKind: "file", content, remoteObjectId: remoteId }] : [],
        completeness: { status: "complete" },
      },
    }),
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
  let remoteCreated = false;
  const drive = drivePort(() => remoteCreated);
  let controller!: ProductController;
  let mutationObservedTrustedAuthority = false;
  let mutationCount = 0;
  const reliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_managed: any, intentId: any, targetPath: any, intendedContent: any) => ({
      ok: true,
      value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: remoteId, path: targetPath, intendedContent },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder creation is outside this regression"); },
    createReserved: async (identity: any) => {
      const beforeMutation = await store.loadAuthority();
      mutationObservedTrustedAuthority = beforeMutation.status === "trusted";
      assert.equal(beforeMutation.status, "trusted");
      mutationCount += 1;
      assert.equal(identity.kind, "reserved-file-create");
      remoteCreated = true;
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "reserved-create",
          remoteObjectId: remoteId,
          path,
          verifiedContent: identity.intendedContent,
        },
      };
    },
    updateExisting: async () => { throw new Error("update is outside this regression"); },
    moveExisting: async () => { throw new Error("move is outside this regression"); },
    trashExisting: async () => { throw new Error("trash is outside this regression"); },
  } as never;
  const assembly = {
    input: {
      snapshots: [{
        path,
        local: {
          status: "present",
          side: "local",
          path,
          entityKind: "file",
          content,
          stability: "stable",
          observationToken: id<"ObservationToken">("observation:c1:first-sync"),
        },
        remote: { status: "absent", side: "remote", path },
        base: { status: "uninitialized" },
        remoteEnumeration: { status: "complete" },
        identity: { status: "unambiguous" },
      }],
      state: { status: "uninitialized" },
    },
    managedRemote,
    remoteEnumeration: { status: "complete" },
    nextCursor: id<"ChangeCursor">("cursor:c1:first-sync"),
    mode: "full",
  } as const;
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
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
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
  assert.equal(
    result.status,
    "accepted",
    result.status === "rejected"
      ? `${result.reason}; controller-status=${JSON.stringify(controller.currentSurface().status)}`
      : undefined,
  );
  assert.equal(mutationObservedTrustedAuthority, true);
  assert.equal(mutationCount, 1);
  assert.equal((await store.loadAuthority()).status, "trusted");
});

test("C1-R1 recovery-required reconstruction reaches reviewed planning without preview-time authority recovery or state replacement", async () => {
  const context: StateLoadContext = {
    expectation: "existing-pairing",
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const store = new SynchronizationStateAuthorityAdapter(rawStore);
  const tracked = trackingAuthority(store);
  const local = localPort();
  const drive = drivePort();
  let controller!: ProductController;
  let plannerCalls = 0;
  const recoveryAssembly = {
    input: { snapshots: [], state: { status: "uninitialized" } },
    managedRemote,
    remoteEnumeration: { status: "complete" },
    mode: "full",
    reconstruction: true,
    recoveryReason: "persisted recovery gate",
  } as const;
  const executor = new ProductSynchronizationExecutor(local, drive, store, context, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: tracked.authorityStore,
    snapshotAssembler: {
      assemble: async () => recoveryAssembly,
      assembleFull: async () => recoveryAssembly,
      assembleRecovery: async () => recoveryAssembly,
    } as never,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: trigger => ({
      plan: async () => {
        plannerCalls += 1;
        return {
          planId: id<"PlanId">(`plan:c1:recovery:${trigger}`),
          trigger,
          operations: [],
          executionDisposition: "safe-auto-eligible",
          recoveryCheckpointRequired: false,
          globalExecutionGate: "none",
        };
      },
    } as never),
    leasePort: lease,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "c1-reconstruction",
    recoveryActive: () => true,
  });

  assert.equal((await store.load(context)).status, "recovery-required");
  assert.equal(tracked.loads(), 0);
  const preview = await controller.previewVerifyReconcile();
  assert.ok(preview);
  assert.equal(plannerCalls, 1);
  assert.equal(tracked.loads(), 0, "explicit reconstruction preview must not traverse durable-intent recovery before review");
  assert.equal((await store.load(context)).status, "recovery-required", "preview must not replace untrusted persisted state with trusted state");
  assert.equal(controller.currentSurface().status.kind, "recovery-required");
});

test("C1 existing trusted authority planning still invokes durable-intent recovery", async () => {
  const context: StateLoadContext = {
    expectation: "existing-pairing",
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const seeded = await rawStore.saveTrusted(createInitialAuthorityState({
    persistenceRevision: id<"PersistenceRevision">("persistence:c1:trusted") as never,
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
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: trigger => ({
      plan: async () => ({
        planId: id<"PlanId">(`plan:c1:trusted:${trigger}`),
        trigger,
        operations: [],
        executionDisposition: "safe-auto-eligible",
        recoveryCheckpointRequired: false,
        globalExecutionGate: "none",
      }),
    } as never),
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