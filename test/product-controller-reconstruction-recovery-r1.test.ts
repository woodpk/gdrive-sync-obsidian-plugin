import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ManagedRemoteIdentity,
  type MutationIntentId,
  type OperationId,
  type RecoverableOperationIntentV1_1,
  type SemanticStateGeneration,
  type StateLoadContext,
  type StateRevision,
} from "../src/contracts";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { ProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { SynchronizationStateAuthorityAdapter } from "../src/product/synchronization-adapters";
import {
  createInitialAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  type DurableSynchronizationAuthorityState,
} from "../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:c1:r1");
const device = id<"DeviceIdentity">("device:c1:r1");
const managedRemote: ManagedRemoteIdentity = {
  rootId: id<"RemoteObjectId">("root:c1:r1"),
  vaultIdentity: vault,
  protocolVersion: id<"ProtocolVersion">("1"),
};
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const lease = { tryAcquire: async () => ({ release: async () => undefined }) } as never;

function trackingAuthority(store: SynchronizationStateAuthorityAdapter) {
  let loads = 0;
  let saves = 0;
  return {
    authorityStore: {
      loadAuthority: async () => { loads += 1; return store.loadAuthority(); },
      saveAuthority: async (...args: any[]) => { saves += 1; return (store.saveAuthority as any)(...args); },
      commitBaseTransition: (...args: any[]) => (store.commitBaseTransition as any)(...args),
    } as never,
    loads: () => loads,
    saves: () => saves,
  };
}

function unattemptedIntent(generation: SemanticStateGeneration): RecoverableOperationIntentV1_1 {
  const operationId = id<"OperationId">("op:c1:r1:unattempted") as OperationId;
  const intentId = id<"MutationIntentId">("intent:c1:r1:unattempted") as MutationIntentId;
  const path = id<"VaultPath">("recovery-r1.md");
  const intendedContent = { algorithm: "sha256" as const, hash: id<"ContentHash">("sha256:c1:r1"), sizeBytes: 7 };
  return {
    logicalKind: "single-effect",
    operationId,
    intentId,
    semanticAuthority: { generation },
    effects: [{
      effectId: "effect:c1:r1:unattempted",
      stage: "intent-persisted",
      descriptor: {
        kind: "remote-file",
        targetSide: "remote",
        mutationKind: "create",
        targetPath: path,
        intendedContent,
        remoteMutation: {
          kind: "reserved-file-create",
          intentId,
          reservedRemoteObjectId: id<"RemoteObjectId">("remote:c1:r1:reserved"),
          path,
          intendedContent,
        },
      },
    }],
  };
}

test("C1-R1 reconstruction bypasses durable recovery only while persisted canonical state is recovery-required", async () => {
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const store = new SynchronizationStateAuthorityAdapter(raw);
  const tracked = trackingAuthority(store);
  let controller!: ProductController;
  let plannerCalls = 0;
  let assemblyCalls = 0;
  const recoveryAssembly = {
    input: { snapshots: [], state: { status: "uninitialized" as const } },
    managedRemote,
    remoteEnumeration: { status: "complete" as const },
    mode: "full" as const,
    reconstruction: true as const,
    recoveryReason: "recovery gate remains active",
  };
  const assembler = {
    assemble: async () => { assemblyCalls += 1; return recoveryAssembly; },
    assembleFull: async () => { assemblyCalls += 1; return recoveryAssembly; },
    assembleRecovery: async () => { assemblyCalls += 1; return recoveryAssembly; },
  } as never;
  const local = { observe: async (path: any) => ({ status: "absent", side: "local", path }) } as never;
  const drive = {
    observe: async (_root: any, path: any) => ({ ok: true, value: { status: "absent", side: "remote", path } }),
    listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "complete" } } }),
  } as never;
  const executor = new ProductSynchronizationExecutor(local, drive, store, context, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: tracked.authorityStore,
    snapshotAssembler: assembler,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: trigger => ({
      plan: async () => {
        plannerCalls += 1;
        return {
          planId: id<"PlanId">(`plan:c1:r1:${plannerCalls}`),
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
    holderId: "c1-r1",
    recoveryActive: () => true,
  });

  assert.equal((await store.load(context)).status, "recovery-required");
  const first = await controller.previewVerifyReconcile();
  assert.ok(first);
  assert.equal(plannerCalls, 1);
  assert.equal(tracked.loads(), 0, "initial genuine reconstruction must not traverse durable recovery before review");
  assert.equal(tracked.saves(), 0, "initial reconstruction preview must not write authority");
  assert.equal((await store.load(context)).status, "recovery-required");

  const generation = id<"SemanticStateGeneration">("semantic:c1:r1:1") as SemanticStateGeneration;
  const trusted: DurableSynchronizationAuthorityState = {
    ...createInitialAuthorityState({
      persistenceRevision: id<"StateRevision">("persistence:c1:r1:1") as StateRevision,
      semanticGeneration: generation,
      vaultIdentity: vault,
      deviceIdentity: device,
    }),
    operationIntents: [unattemptedIntent(generation)],
  };
  assert.equal((await raw.saveTrusted(trusted)).status, "saved", "test transition models reviewed replacement of recovery-required state with trusted authority");
  assert.equal((await store.load(context)).status, "trusted");

  const loadsBeforeSecondPreview = tracked.loads();
  const savesBeforeSecondPreview = tracked.saves();
  const second = await controller.previewVerifyReconcile();
  assert.ok(second);
  assert.equal(plannerCalls, 2, "reconstruction planning still proceeds after trusted recovery-in-progress state is stabilized");
  assert.ok(tracked.loads() > loadsBeforeSecondPreview, "trusted reconstruction must traverse durable-intent recovery before planning");
  assert.ok(tracked.saves() > savesBeforeSecondPreview, "unattempted durable intent must be retired under trusted authority");
  const after = await store.loadAuthority();
  assert.equal(after.status, "trusted");
  if (after.status !== "trusted") throw new Error("trusted authority required after recovery");
  assert.equal(after.state.operationIntents.length, 0, "outstanding unattempted intent is recovered/retired before the later reconstruction plan");
  assert.ok(assemblyCalls >= 3, "changed durable recovery must refresh reconstruction assembly before planning");
});
