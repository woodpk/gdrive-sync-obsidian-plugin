import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  LocalLifecycleEvent,
  LocalVaultChange,
  ManagedRemoteIdentity,
  PersistenceRevision,
  ReliableRemoteChangePort,
  ReliableRemoteMutationPort,
  RemoteObjectId,
  SemanticStateGeneration,
  Unsubscribe,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { meaningfulNotification } from "../src/product/notification-policy";
import { IntegratedProductController } from "../src/product/product-controller";
import { IntegratedSynchronizationStateStore } from "../src/product/phase6-sync-integration";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSyncScheduler } from "../src/product/scheduler";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import {
  createInitialAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
} from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const cursor = (value: string) => id<"ChangeCursor">(value) as ChangeCursor;

function source(text: string): BinaryContentSource {
  const bytes = new TextEncoder().encode(text);
  return {
    sizeBytes: bytes.byteLength,
    async *openChunks() {
      yield bytes;
    },
  };
}

async function consume(content: BinaryContentSource): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of content.openChunks()) {
    chunks.push(chunk);
    total += chunk.byteLength;
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass", async () => {
  const vault = id<"VaultIdentity">("vault:group-d:scenario-26");
  const device = id<"DeviceIdentity">("device:group-d:scenario-26");
  const root = remoteId("remote:group-d:root");
  const file = path("during-run.md");
  const allocated = remoteId("remote:group-d:during-run");
  const text = "stable local version";
  const evidence: ContentEvidence = {
    hash: sha256Text(text),
    sizeBytes: new TextEncoder().encode(text).byteLength,
  };
  const token = id<"ObservationToken">("local:group-d:scenario-26:1");
  const managed: ManagedRemoteIdentity = {
    rootId: root,
    vaultIdentity: vault,
    protocolVersion: id<"ProtocolVersion">("1"),
  };
  const stateContext = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };

  let changeListener: (change: LocalVaultChange) => void = () => undefined;
  let lifecycleListener: (event: LocalLifecycleEvent) => void = () => undefined;
  let remoteCreated = false;
  let createCalls = 0;
  let fullListingCalls = 0;
  let changesCalls = 0;
  let createStartedResolve!: () => void;
  const createStarted = new Promise<void>(resolve => { createStartedResolve = resolve; });
  let releaseCreate!: () => void;
  const createRelease = new Promise<void>(resolve => { releaseCreate = resolve; });

  const local = {
    enumerate: async () => ({
      entries: [{
        status: "present" as const,
        side: "local" as const,
        path: file,
        entityKind: "file" as const,
        content: evidence,
        stability: "stable" as const,
        observationToken: token,
      }],
      completeness: { status: "complete" as const },
    }),
    observe: async (candidate: VaultPath) => String(candidate) === String(file)
      ? {
          status: "present" as const,
          side: "local" as const,
          path: file,
          entityKind: "file" as const,
          content: evidence,
          stability: "stable" as const,
          observationToken: token,
        }
      : { status: "absent" as const, side: "local" as const, path: candidate },
    readFile: async () => ({ content: source(text), evidence, stability: "stable" as const, observationToken: token }),
    validatePath: async () => ({ status: "compatible" as const, normalizedComparisonPath: String(file) }),
    onChange(listener: (change: LocalVaultChange) => void): Unsubscribe {
      changeListener = listener;
      return () => { changeListener = () => undefined; };
    },
    onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe {
      lifecycleListener = listener;
      return () => { lifecycleListener = () => undefined; };
    },
  } as never;

  const remoteEntry = () => ({
    path: file,
    entityKind: "file" as const,
    remoteObjectId: allocated,
    content: evidence,
    trashed: false,
  });
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }),
    getStartCursor: async () => ({ ok: true as const, value: cursor("cursor:group-d:first") }),
    listForReconciliation: async () => {
      if (!remoteCreated) fullListingCalls += 1;
      return {
        ok: true as const,
        value: {
          entries: remoteCreated ? [remoteEntry()] : [],
          completeness: { status: "complete" as const },
        },
      };
    },
    readChanges: async () => { throw new Error("legacy readChanges must not be used by this test"); },
    observe: async (_root: RemoteObjectId, candidate: VaultPath) => remoteCreated && String(candidate) === String(file)
      ? {
          ok: true as const,
          value: {
            status: "present" as const,
            side: "remote" as const,
            path: file,
            entityKind: "file" as const,
            remoteObjectId: allocated,
            content: evidence,
            stability: "stable" as const,
          },
        }
      : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path: candidate } },
    create: async () => { throw new Error("legacy raw Drive create must not be used by this test"); },
  } as never;
  const reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_identity, intentId, candidatePath, intendedContent) => ({
      ok: true,
      value: {
        kind: "reserved-file-create",
        intentId,
        reservedRemoteObjectId: allocated,
        path: candidatePath,
        intendedContent,
      },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder creation is not used by scenario 26"); },
    createReserved: async (identity, content) => {
      if (identity.kind !== "reserved-file-create" || !content) {
        return { status: "outcome-unknown", reason: "scenario 26 requires reserved file-create content" };
      }
      createCalls += 1;
      createStartedResolve();
      await createRelease;
      assert.equal(identity.reservedRemoteObjectId, allocated);
      assert.equal(identity.path, file);
      assert.equal(new TextDecoder().decode(await consume(content)), text);
      remoteCreated = true;
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "reserved-create",
          remoteObjectId: identity.reservedRemoteObjectId,
          path: identity.path,
          verifiedContent: identity.intendedContent,
        },
      };
    },
    updateExisting: async () => { throw new Error("update is not used by scenario 26"); },
    moveExisting: async () => { throw new Error("move is not used by scenario 26"); },
    trashExisting: async () => { throw new Error("trash is not used by scenario 26"); },
  };
  const reliableChanges: ReliableRemoteChangePort = {
    async readChangePage(_identity, requestedToken) {
      changesCalls += 1;
      return {
        ok: true,
        value: {
          kind: "terminal",
          requestedToken,
          changes: [],
          newStartPageToken: cursor("cursor:group-d:later"),
        },
      };
    },
  };

  const rawStateStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const seeded = await rawStateStore.saveTrusted(createInitialAuthorityState({
    persistenceRevision: id<"StateRevision">("persistence:group-d:0") as unknown as PersistenceRevision,
    semanticGeneration: id<"SemanticStateGeneration">("semantic:group-d:0") as SemanticStateGeneration,
    vaultIdentity: vault,
    deviceIdentity: device,
  }));
  assert.equal(seeded.status, "saved");
  const stateStore = new IntegratedSynchronizationStateStore(rawStateStore);

  const assembler = new ProductSnapshotAssembler(local, drive, stateStore, stateContext, async () => managed, () => true, () => false, undefined, reliableChanges);
  const resolver = new ThreeWayConflictResolver({ readText: async () => undefined });
  const triggers: string[] = [];
  let laterPassResolve!: () => void;
  const laterPassPlanned = new Promise<void>(resolve => { laterPassResolve = resolve; });
  let controller!: IntegratedProductController;
  const executor = new ProductSynchronizationExecutor(local, drive, stateStore, stateContext, () => controller.currentRunEvidence());
  controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext,
    stateStore,
    authorityStore: stateStore,
    snapshotAssembler: assembler,
    executor,
    reliableRemoteMutationPort,
    conflictResolver: resolver,
    plannerForTrigger: trigger => {
      triggers.push(trigger);
      if (trigger === "local-change") laterPassResolve();
      return new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(resolver, undefined, { trigger }));
    },
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 50),
    holderId: "group-d-scenario-26",
  });

  const scheduler = new ProductSyncScheduler(local, controller, () => ({
    startupResumeEnabled: false,
    localChangeEnabled: true,
    periodicEnabled: false,
    periodicIntervalMs: 60_000,
    localDebounceMs: 1_000,
  }));
  scheduler.start();

  const firstRun = controller.runAutomatic("periodic");
  await createStarted;
  changeListener({ kind: "modified", path: file });
  releaseCreate();
  await firstRun;
  await laterPassPlanned;
  await flushMicrotasks();

  assert.deepEqual(triggers.slice(0, 2), ["periodic", "local-change"]);
  assert.equal(createCalls, 1, "the executing plan must not be mutated into a duplicate upload");
  assert.equal(fullListingCalls, 1, "the initial active pass used the required full view because no cursor existed");
  assert.equal(changesCalls, 1, "the deferred pass reconciled from the newly committed cursor through ReliableRemoteChangePort");
  const loaded = await stateStore.load(stateContext);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.base.some(entry => entry.path === file && entry.remoteObjectId === allocated), true);
  }

  scheduler.stop();
  lifecycleListener({ kind: "unload" });
});

test("Phase5 scenario 47 notification policy emits only material user-actionable conditions", () => {
  assert.equal(meaningfulNotification({ status: { kind: "idle-ready" }, conflicts: [] }), undefined);
  assert.equal(meaningfulNotification({ status: { kind: "planning", trigger: "manual" }, conflicts: [] }), undefined);
  assert.equal(meaningfulNotification({ status: { kind: "syncing", planId: id<"PlanId">("plan:notification") }, conflicts: [] }), undefined);
  assert.match(meaningfulNotification({ status: { kind: "authentication-required", reason: "revoked" }, conflicts: [] })?.message ?? "", /authentication/i);
  assert.match(meaningfulNotification({ status: { kind: "recovery-required", reason: "state untrusted" }, conflicts: [] })?.message ?? "", /recovery/i);
  assert.match(meaningfulNotification({ status: { kind: "conflict-present", conflictCount: 2 }, conflicts: [] })?.message ?? "", /conflict/i);
});

test("Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root", async () => {
  const vault = id<"VaultIdentity">("vault:group-d:scenario-49");
  const device = id<"DeviceIdentity">("device:group-d:scenario-49");
  const managedRoot = remoteId("remote:managed-sync-root");
  const externalAssetRoot = remoteId("remote:canonical-brain-asset-repository");
  const managed: ManagedRemoteIdentity = { rootId: managedRoot, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
  const stateContext = { expectation: "new-installation" as const, expectedVaultIdentity: vault, expectedDeviceIdentity: device };
  const touchedRoots: string[] = [];
  const trashedObjects: string[] = [];
  const local = {
    enumerate: async () => ({ entries: [], completeness: { status: "complete" as const } }),
  } as never;
  const drive = {
    validateManagedRoot: async (identity: ManagedRemoteIdentity) => {
      touchedRoots.push(String(identity.rootId));
      return { ok: true as const, value: { status: "valid" as const, identity: managed } };
    },
    getStartCursor: async (root: RemoteObjectId) => {
      touchedRoots.push(String(root));
      return { ok: true as const, value: cursor("cursor:scenario-49") };
    },
    listForReconciliation: async (root: RemoteObjectId) => {
      touchedRoots.push(String(root));
      return { ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } };
    },
    trash: async (objectId: RemoteObjectId) => {
      trashedObjects.push(String(objectId));
      return { ok: true as const, value: undefined };
    },
  } as never;
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const assembler = new ProductSnapshotAssembler(local, drive, store, stateContext, async () => managed);
  const assembly = await assembler.assembleFull();
  const resolver = new ThreeWayConflictResolver({ readText: async () => undefined });
  const plan = await new DeterministicSynchronizationPlanner(resolver, undefined, { trigger: "verify-reconcile" }).plan(assembly.input);

  assert.equal(plan.operations.length, 0);
  assert.equal(touchedRoots.length > 0, true);
  assert.equal(touchedRoots.every(value => value === String(managedRoot)), true);
  assert.equal(touchedRoots.includes(String(externalAssetRoot)), false);
  assert.deepEqual(trashedObjects, []);
});