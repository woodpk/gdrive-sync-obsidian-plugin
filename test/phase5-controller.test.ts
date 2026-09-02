import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource, ConflictAssessment, ConflictId, ContentEvidence, LocalMutationTransaction,
  LocalTransactionalMutationPort, ManagedRemoteIdentity, PathSnapshot, ReliableRemoteMutationPort,
  RemoteObjectId, SynchronizationPlan, VersionReference,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { IntegratedSynchronizationStateStore } from "../src/product/phase6-sync-integration";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialAuthorityState } from "../src/state/persistent-state-store";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:controller");
const device = id<"DeviceIdentity">("device:controller");
const root = id<"RemoteObjectId">("remote:root");
const managedRemote: ManagedRemoteIdentity = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const trustedContext = { expectation: "existing-pairing" as const, expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const newContext = { expectation: "new-installation" as const, expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const lease = { tryAcquire: async () => ({ release: async () => undefined }) } as never;

function source(text: string): BinaryContentSource { return { sizeBytes: new TextEncoder().encode(text).byteLength, async *openChunks() { yield new TextEncoder().encode(text); } }; }
async function textOf(content: BinaryContentSource): Promise<string> { const d = new TextDecoder(); let out = ""; for await (const c of content.openChunks()) out += d.decode(c, { stream: true }); return out + d.decode(); }
function hash(value: string): ContentEvidence { return { hash: sha256Text(value), sizeBytes: new TextEncoder().encode(value).byteLength }; }

function unresolvedPlan(path: ReturnType<typeof id<"VaultPath">>, conflictId: ConflictId): SynchronizationPlan {
  return {
    planId: id<"PlanId">(`plan:${String(conflictId)}`), trigger: "manual", executionDisposition: "requires-user-approval", recoveryCheckpointRequired: false, globalExecutionGate: "none",
    operations: [{ operationId: id<"OperationId">(`op:${String(conflictId)}`), kind: "unresolved-conflict", path, conflictId: String(conflictId), destructive: false, preconditions: [], reasons: [{ code: "opaque-binary", summary: "preserve" }] }],
  };
}

async function conflictHarness(onTrustedBaselineEstablished?: () => Promise<void>) {
  const path = id<"VaultPath">("note.bin"), remoteId = id<"RemoteObjectId">("remote:note"), conflict = id<"ConflictId">("conflict:note");
  const baseEvidence = hash("base"), localOriginal = hash("local"), remoteOriginal: ContentEvidence = { ...hash("remote"), revision: "7" };
  let localEvidence = localOriginal, remoteEvidence = remoteOriginal, localText = "local", remoteText = "remote";
  let candidateRemoteObjectId: RemoteObjectId | undefined;
  let candidateEvidence: ContentEvidence | undefined;
  let candidateSequence = 0;
  const copies = new Map<string, { evidence: ContentEvidence; text: string }>();
  const staged = new Map<string, { evidence: ContentEvidence; text: string }>();
  const localVersion: VersionReference = { path, entityKind: "file", content: localOriginal, observationToken: id<"ObservationToken">("local-token") };
  const remoteVersion: VersionReference = { path, entityKind: "file", content: remoteOriginal, remoteObjectId: remoteId };
  const assessment: ConflictAssessment = {
    kind: "opaque-binary", conflictId: conflict, path,
    preserved: {
      local: { version: localVersion, deviceId: device, source: "local" },
      remote: { version: remoteVersion, deviceId: device, source: "remote", remoteObjectId: remoteId },
    },
  };
  const local = {
    observe: async (p: string) => {
      if (String(p) === String(path)) return { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content: localEvidence, stability: "stable" as const, observationToken: id<"ObservationToken">("local-token") };
      const copy = copies.get(String(p));
      return copy ? { status: "present" as const, side: "local" as const, path: p, entityKind: "file" as const, content: copy.evidence, stability: "stable" as const, observationToken: id<"ObservationToken">(`copy:${String(p)}`) } : { status: "absent" as const, side: "local" as const, path: p };
    },
    readFile: async () => ({ content: source(localText), evidence: localEvidence, stability: "stable" as const, observationToken: id<"ObservationToken">("local-token") }),
    createFile: async (p: string, content: BinaryContentSource) => { const text = await textOf(content); const evidence = remoteOriginal; copies.set(String(p), { text, evidence }); return { path: p, evidence }; },
    replaceFile: async (_p: string, content: BinaryContentSource) => { localText = await textOf(content); localEvidence = remoteEvidence; return { path, evidence: localEvidence }; },
    validatePath: async () => ({ status: "valid" as const }),
    trash: async () => ({ path }),
  } as never;
  const drive = {
    observe: async (_root: unknown, p: string) => String(p) === String(path)
      ? { ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: remoteId, content: remoteEvidence, stability: "stable" as const } }
      : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path: p } },
    download: async () => ({ ok: true as const, value: { remoteObjectId: remoteId, path, content: source(remoteText), evidence: remoteEvidence } }),
    listForReconciliation: async () => ({
      ok: true as const,
      value: {
        entries: [
          { path, entityKind: "file" as const, remoteObjectId: remoteId, content: remoteEvidence, trashed: false },
          ...(candidateRemoteObjectId && candidateEvidence ? [{ path, entityKind: "file" as const, remoteObjectId: candidateRemoteObjectId, content: candidateEvidence, trashed: false }] : []),
        ],
        completeness: { status: "complete" as const },
      },
    }),
    update: async (request: { content: BinaryContentSource }) => { remoteText = await textOf(request.content); remoteEvidence = localEvidence; return { ok: true as const, value: { remoteObjectId: remoteId, path, evidence: remoteEvidence } }; },
    trash: async () => ({ ok: true as const, value: { remoteObjectId: remoteId, path } }),
  } as never;
  const localTransactionalMutationPort: LocalTransactionalMutationPort = {
    stageAndVerify: async (transaction, content) => {
      staged.set(String(transaction.transactionId), {
        text: await textOf(content),
        evidence: { hash: transaction.expectedNewEvidence.hash, sizeBytes: transaction.expectedNewEvidence.sizeBytes },
      });
      return { status: "staged-verified", transaction: { ...transaction, stage: "staged-verified" } as LocalMutationTransaction };
    },
    commitVerifiedStage: async transaction => {
      const pending = staged.get(String(transaction.transactionId));
      if (!pending) return { status: "outcome-unknown", reason: "fixture stage is missing", transaction };
      if (transaction.mutationKind === "create") copies.set(String(transaction.path), pending);
      else { localText = pending.text; localEvidence = pending.evidence; }
      staged.delete(String(transaction.transactionId));
      return {
        status: "committed",
        transaction: { ...transaction, stage: "completed" } as LocalMutationTransaction,
        resultingObservationToken: id<"ObservationToken">(`committed:${String(transaction.transactionId)}`),
      };
    },
    recover: async transaction => ({ status: "blocked", reason: "fixture has no interrupted local transaction", transaction }),
  };
  const reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_managed, intentId, targetPath, intendedContent) => ({
      ok: true,
      value: {
        kind: "reserved-file-create",
        intentId,
        reservedRemoteObjectId: id<"RemoteObjectId">(`remote:candidate:${++candidateSequence}`),
        path: targetPath,
        intendedContent,
      },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder creation is not used by this fixture"); },
    createReserved: async identity => {
      if (identity.kind !== "reserved-file-create") throw new Error("folder creation is not used by this fixture");
      candidateRemoteObjectId = identity.reservedRemoteObjectId;
      candidateEvidence = { hash: identity.intendedContent.hash, sizeBytes: identity.intendedContent.sizeBytes, revision: "candidate-create" };
      return { status: "verified-effect", applicationProof: { kind: "reserved-create", remoteObjectId: identity.reservedRemoteObjectId, path: identity.path, verifiedContent: identity.intendedContent } };
    },
    updateExisting: async (identity, content) => {
      await textOf(content);
      candidateRemoteObjectId = identity.candidateRemoteObjectId;
      candidateEvidence = { hash: identity.intendedContent.hash, sizeBytes: identity.intendedContent.sizeBytes, revision: "candidate-update" };
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "immutable-candidate-preservation",
          candidateRemoteObjectId: identity.candidateRemoteObjectId,
          predecessorRemoteObjectId: identity.remoteObjectId,
          predecessorRevision: identity.expectedRevision,
          intendedContent: identity.intendedContent,
          verifiedContent: identity.intendedContent,
          preservedRemoteObjectIds: [identity.remoteObjectId, identity.candidateRemoteObjectId],
        },
      };
    },
    moveExisting: async () => { throw new Error("move is not used by this fixture"); },
    trashExisting: async () => { throw new Error("trash is not used by this fixture"); },
  };

  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const semanticGeneration = id<"SemanticStateGeneration">("semantic:controller:1");
  const baseFingerprint = id<"BaseFingerprint">("base:controller:note");
  const initial = createInitialAuthorityState({
    persistenceRevision: id<"PersistenceRevision">("persistence:controller:1"),
    semanticGeneration,
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  await rawStore.saveTrusted({
    ...initial,
    base: [{ path, entityKind: "file", localExisted: true, remoteExisted: true, content: baseEvidence, remoteObjectId: remoteId }],
    remoteMappings: [{ path, entityKind: "file", remoteObjectId: remoteId }],
    baseAuthority: [{ path, fingerprint: baseFingerprint }],
    pathConvergence: [{ path, state: { status: "converged", generation: semanticGeneration, baseFingerprint } }],
  });
  const store = new IntegratedSynchronizationStateStore(rawStore);
  const snapshot = (): PathSnapshot => ({
    path,
    local: { status: "present", side: "local", path, entityKind: "file", content: localEvidence, stability: "stable", observationToken: id<"ObservationToken">("local-token") },
    remote: { status: "present", side: "remote", path, entityKind: "file", content: remoteEvidence, remoteObjectId: remoteId, stability: "stable" },
    base: { status: "trusted", entry: { path, entityKind: "file", localExisted: true, remoteExisted: true, content: baseEvidence, remoteObjectId: remoteId } },
    remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" },
  });
  const assembler = { assembleFull: async () => ({ input: { snapshots: [snapshot()], state: await store.load(trustedContext) }, managedRemote, remoteEnumeration: { status: "complete" as const }, mode: "full" as const }), assemble: async () => ({ input: { snapshots: [snapshot()], state: await store.load(trustedContext) }, managedRemote, remoteEnumeration: { status: "complete" as const }, mode: "incremental" as const }) } as never;
  let controller: IntegratedProductController;
  const executor = new ProductSynchronizationExecutor(local, drive, store, trustedContext, () => controller.currentRunEvidence());
  controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: trustedContext, stateStore: store, authorityStore: store, snapshotAssembler: assembler,
    executor, reliableRemoteMutationPort, localTransactionalMutationPort,
    conflictResolver: { assess: async () => assessment }, plannerForTrigger: () => ({ plan: async () => unresolvedPlan(path, conflict) }), leasePort: lease,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100), holderId: "test", onTrustedBaselineEstablished,
  });
  return { controller, store, path, conflict, remoteId, localOriginal, remoteOriginal, copies, setRemoteStale: () => { remoteEvidence = { ...hash("remote-stale"), revision: "8" }; } };
}

test("Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit", async () => {
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await rawStore.saveTrusted(createInitialAuthorityState({
    persistenceRevision: id<"PersistenceRevision">("persistence:controller:first:1"),
    semanticGeneration: id<"SemanticStateGeneration">("semantic:controller:first:1"),
    vaultIdentity: vault,
    deviceIdentity: device,
  }));
  const store = new IntegratedSynchronizationStateStore(rawStore);
  const cursor = id<"ChangeCursor">("cursor:first"); let completed = 0;
  const assembly = { input: { snapshots: [], state: { status: "uninitialized" as const } }, managedRemote, remoteEnumeration: { status: "complete" as const }, nextCursor: cursor, mode: "full" as const };
  const controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: newContext, stateStore: store, authorityStore: store, snapshotAssembler: { assembleFull: async () => assembly, assemble: async () => assembly } as never,
    executor: new ProductSynchronizationExecutor({} as never, {} as never, store, newContext, () => ({ managedRemote, remoteEnumerationComplete: true })),
    conflictResolver: { assess: async () => ({ kind: "none" as const }) }, plannerForTrigger: trigger => ({ plan: async () => ({ planId: id<"PlanId">("plan:first"), trigger, operations: [], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" }) }),
    leasePort: lease, audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100), holderId: "first", onTrustedBaselineEstablished: async () => { completed += 1; },
  });
  const preview = await controller.previewManual(); assert.ok(preview);
  assert.equal((await controller.request({ kind: "execute-plan", planId: preview.planId })).status, "accepted"); assert.equal(completed, 1);
  const loaded = await store.load(newContext); assert.equal(loaded.status, "trusted"); if (loaded.status === "trusted") assert.equal(loaded.state.changeCursor, cursor);
});

test("Phase 5 unresolved reviewed synchronization remains partial and cannot open the completion gate", async () => {
  let completed = 0;
  const harness = await conflictHarness(async () => { completed += 1; });
  const preview = await harness.controller.previewManual(); assert.ok(preview);
  const result = await harness.controller.request({ kind: "execute-plan", planId: preview.planId });
  assert.equal(result.status, "accepted"); assert.equal(completed, 0); assert.equal(harness.controller.currentSurface().status.kind, "attention-required");
});

test("Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update", async () => {
  const h = await conflictHarness(); await h.controller.previewManual();
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId: h.conflict, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "accepted"); const loaded = await h.store.load(trustedContext); assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.base.find(entry => entry.path === h.path)?.content?.hash, h.localOriginal.hash);
});

test("Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update", async () => {
  const h = await conflictHarness(); await h.controller.previewManual();
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId: h.conflict, resolution: { kind: "keep-remote" } });
  assert.equal(result.status, "accepted"); const loaded = await h.store.load(trustedContext); assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.base.find(entry => entry.path === h.path)?.content?.hash, h.remoteOriginal.hash);
});

test("Phase 5 keep-both creates a local-only conflict copy without assigning the source Drive ID, then next reconciliation plans upload-create", async () => {
  const h = await conflictHarness(); await h.controller.previewManual();
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId: h.conflict, resolution: { kind: "keep-both" } }); assert.equal(result.status, "accepted");
  const loaded = await h.store.load(trustedContext); assert.equal(loaded.status, "trusted"); if (loaded.status !== "trusted") return;
  const copy = loaded.state.base.find(entry => entry.path !== h.path); assert.ok(copy); assert.equal(copy.remoteExisted, false); assert.equal(copy.remoteObjectId, undefined);
  assert.equal(loaded.state.remoteMappings.some(mapping => mapping.path === copy.path), false);
  const copySnapshot: PathSnapshot = { path: copy.path, local: { status: "present", side: "local", path: copy.path, entityKind: "file", content: copy.content, stability: "stable" }, remote: { status: "absent", side: "remote", path: copy.path }, base: { status: "trusted", entry: copy }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" } };
  const planner = new DeterministicSynchronizationPlanner({ assess: async () => ({ kind: "none" }) }); const next = await planner.plan({ snapshots: [copySnapshot], state: loaded });
  assert.equal(next.operations[0].kind, "upload-create");
});

test("Phase 5 stale conflict resolution is rejected before mutation and requires fresh planning", async () => {
  const h = await conflictHarness(); await h.controller.previewManual(); h.setRemoteStale();
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId: h.conflict, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "rejected"); assert.match(result.reason ?? "", /changed|fresh plan/);
});
