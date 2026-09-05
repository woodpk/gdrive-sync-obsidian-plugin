import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  LocalMutationTransaction,
  LocalTransactionalMutationPort,
  ManagedRemoteIdentity,
  ObservationToken,
  PersistenceRevision,
  ReliableRemoteChangePort,
  ReliableRemoteMutationPort,
  RemoteChange,
  RemoteObjectId,
  SemanticStateGeneration,
  StateLoadContext,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { InMemoryRunLeasePort } from "../src/core/run-coordinator";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { IntegratedSynchronizationStateStore } from "../src/product/phase6-sync-integration";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import {
  createInitialAuthorityState,
  type DurableSynchronizationAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
} from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const cur = (value: string) => id<"ChangeCursor">(value) as ChangeCursor;
const gen = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const prev = (value: string) => id<"StateRevision">(value) as unknown as PersistenceRevision;
const ev = (text: string, revision?: string): ContentEvidence => ({
  hash: sha256Text(text),
  sizeBytes: new TextEncoder().encode(text).byteLength,
  ...(revision ? { revision } : {}),
});
const src = (text: string): BinaryContentSource => ({
  sizeBytes: new TextEncoder().encode(text).byteLength,
  async *openChunks() { yield new TextEncoder().encode(text); },
});
async function textOf(source: BinaryContentSource): Promise<string> {
  let out = "";
  const decoder = new TextDecoder();
  for await (const chunk of source.openChunks()) out += decoder.decode(chunk, { stream: true });
  return out + decoder.decode();
}

const vault = id<"VaultIdentity">("vault:g2:active");
const device = id<"DeviceIdentity">("device:g2:active");
const root = rid("root:g2:active");
const identity: ManagedRemoteIdentity = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const remoteRevision = (path: VaultPath, suffix = "0") => `remote-revision:${String(path)}:${suffix}`;

interface SeedEntry {
  readonly path: VaultPath;
  readonly text: string;
  readonly remoteObjectId: RemoteObjectId;
}

function state(entries: readonly SeedEntry[]): DurableSynchronizationAuthorityState {
  const semanticGeneration = gen("semantic:g2:active:0");
  const initial = createInitialAuthorityState({
    persistenceRevision: prev("persistence:g2:active:0"),
    semanticGeneration,
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  return {
    ...initial,
    base: entries.map(entry => ({
      path: entry.path,
      entityKind: "file" as const,
      localExisted: true,
      remoteExisted: true,
      content: ev(entry.text, remoteRevision(entry.path)),
      remoteObjectId: entry.remoteObjectId,
    })),
    remoteMappings: entries.map(entry => ({ path: entry.path, entityKind: "file" as const, remoteObjectId: entry.remoteObjectId })),
    baseAuthority: entries.map(entry => ({
      path: entry.path,
      fingerprint: id<"BaseFingerprint">(`base:g2:active:${String(entry.path)}`),
    })),
    pathConvergence: entries.map(entry => ({
      path: entry.path,
      state: {
        status: "converged" as const,
        generation: semanticGeneration,
        baseFingerprint: id<"BaseFingerprint">(`base:g2:active:${String(entry.path)}`),
      },
    })),
    changeCursor: cur("cursor:0"),
  };
}

async function storeFor(entries: readonly SeedEntry[]): Promise<IntegratedSynchronizationStateStore> {
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const saved = await raw.saveTrusted(state(entries));
  assert.equal(saved.status, "saved");
  return new IntegratedSynchronizationStateStore(raw);
}

async function makeController(
  local: any,
  drive: any,
  store: IntegratedSynchronizationStateStore,
  reliableRemoteMutationPort: ReliableRemoteMutationPort,
  localTransactionalMutationPort?: LocalTransactionalMutationPort,
): Promise<IntegratedProductController> {
  const reliableChanges = typeof drive.readChangePage === "function" ? drive as ReliableRemoteChangePort : undefined;
  const assembler = new ProductSnapshotAssembler(local, drive, store, context, async () => identity, () => true, () => false, undefined, reliableChanges);
  const conflicts = new ThreeWayConflictResolver({ readText: async () => undefined });
  let controller!: IntegratedProductController;
  const executor = new ProductSynchronizationExecutor(local, drive, store, context, () => controller.currentRunEvidence());
  controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: assembler,
    executor,
    reliableRemoteMutationPort,
    ...(localTransactionalMutationPort ? { localTransactionalMutationPort } : {}),
    conflictResolver: conflicts,
    plannerForTrigger: trigger => new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger })),
    leasePort: new InMemoryRunLeasePort(),
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100),
    holderId: "g2-active",
  });
  return controller;
}

test("G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval", async () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({
    path: vp(`file-${index}.md`),
    text: `v${index}`,
    remoteObjectId: rid(`rid:file:${index}`),
  }));
  const store = await storeFor(entries);
  const localEntries = entries.slice(1);
  const remote = new Map(entries.map(entry => [String(entry.path), entry]));
  const trashed: string[] = [];
  let rawTrashCalls = 0;
  const local = {
    enumerate: async () => ({
      entries: localEntries.map(entry => ({
        status: "present" as const,
        side: "local" as const,
        path: entry.path,
        entityKind: "file" as const,
        content: ev(entry.text),
        stability: "stable" as const,
        observationToken: id<"ObservationToken">(`tok:${String(entry.path)}`),
      })),
      completeness: { status: "complete" as const },
    }),
    observe: async (path: VaultPath) => {
      const entry = localEntries.find(candidate => candidate.path === path);
      return entry
        ? {
            status: "present" as const,
            side: "local" as const,
            path,
            entityKind: "file" as const,
            content: ev(entry.text),
            stability: "stable" as const,
            observationToken: id<"ObservationToken">(`tok:${String(path)}`),
          }
        : { status: "absent" as const, side: "local" as const, path };
    },
  } as never;
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    getStartCursor: async () => ({ ok: true as const, value: cur("cursor:1") }),
    listForReconciliation: async () => ({
      ok: true as const,
      value: {
        entries: [...remote.values()].map(entry => ({
          path: entry.path,
          entityKind: "file" as const,
          remoteObjectId: entry.remoteObjectId,
          content: ev(entry.text, remoteRevision(entry.path)),
          trashed: false,
        })),
        completeness: { status: "complete" as const },
      },
    }),
    observe: async (_rootId: RemoteObjectId, path: VaultPath) => {
      const entry = remote.get(String(path));
      return entry
        ? {
            ok: true as const,
            value: {
              status: "present" as const,
              side: "remote" as const,
              path,
              entityKind: "file" as const,
              remoteObjectId: entry.remoteObjectId,
              content: ev(entry.text, remoteRevision(entry.path)),
              stability: "stable" as const,
            },
          }
        : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path } };
    },
    trash: async () => { rawTrashCalls += 1; throw new Error("raw Drive trash must not execute"); },
  } as never;
  const reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async () => { throw new Error("file reservation is not used by scenario 15"); },
    reserveFolderCreateIdentity: async () => { throw new Error("folder reservation is not used by scenario 15"); },
    createReserved: async () => { throw new Error("create is not used by scenario 15"); },
    updateExisting: async () => { throw new Error("update is not used by scenario 15"); },
    moveExisting: async () => { throw new Error("move is not used by scenario 15"); },
    trashExisting: async mutation => {
      const entry = [...remote.values()].find(candidate => candidate.remoteObjectId === mutation.remoteObjectId);
      if (!entry || entry.path !== mutation.path) return { status: "verified-not-applied", reason: "fixture remote trash target no longer matches durable identity" };
      trashed.push(String(entry.path));
      remote.delete(String(entry.path));
      return {
        status: "verified-effect",
        applicationProof: { kind: "trash", remoteObjectId: mutation.remoteObjectId, path: mutation.path, trashed: true },
      };
    },
  };
  const controller = await makeController(local, drive, store, reliableRemoteMutationPort);
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.recoveryCheckpointRequired, false);
  assert.equal(plan.executionDisposition, "safe-auto-eligible");
  assert.equal(plan.operations.filter(operation => operation.kind === "trash-remote").length, 1);
  assert.equal((await controller.request({ kind: "execute-plan", planId: plan.planId })).status, "accepted");
  assert.deepEqual(trashed, ["file-0.md"]);
  assert.equal(rawTrashCalls, 0);
});

test("G2 scenario 24 stale operation precondition refuses mutation, completes with attention, and awaits an external reconciliation trigger", async () => {
  const path = vp("stale.md");
  const remoteObjectId = rid("rid:stale");
  const entries = [{ path, text: "base", remoteObjectId }];
  const store = await storeFor(entries);
  let localText = "local-edit";
  let remoteText = "base";
  let remoteRevisionValue = remoteRevision(path);
  let observeCalls = 0;
  let updates = 0;
  let changeReads = 0;
  const local = {
    enumerate: async () => ({
      entries: [{
        status: "present" as const,
        side: "local" as const,
        path,
        entityKind: "file" as const,
        content: ev(localText),
        stability: "stable" as const,
        observationToken: id<"ObservationToken">("tok:stale"),
      }],
      completeness: { status: "complete" as const },
    }),
    observe: async () => ({
      status: "present" as const,
      side: "local" as const,
      path,
      entityKind: "file" as const,
      content: ev(localText),
      stability: "stable" as const,
      observationToken: id<"ObservationToken">("tok:stale"),
    }),
    readFile: async () => ({
      content: src(localText),
      evidence: ev(localText),
      stability: "stable" as const,
      observationToken: id<"ObservationToken">("tok:stale"),
    }),
  } as never;
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    getStartCursor: async () => ({ ok: true as const, value: cur("cursor:full") }),
    listForReconciliation: async () => ({
      ok: true as const,
      value: {
        entries: [{ path, entityKind: "file" as const, remoteObjectId, content: ev("base", remoteRevision(path)), trashed: false }],
        completeness: { status: "complete" as const },
      },
    }),
    readChanges: async () => {
      changeReads += 1;
      return {
        ok: true as const,
        value: {
          changes: [{ kind: "upsert" as const, entry: { path, entityKind: "file" as const, remoteObjectId, content: ev("remote-raced", remoteRevision(path, "1")), trashed: false } }],
          nextCursor: cur("cursor:after-race"),
          completeness: { status: "complete" as const },
        },
      };
    },
    observe: async () => {
      observeCalls += 1;
      if (observeCalls === 1) {
        remoteText = "remote-raced";
        remoteRevisionValue = remoteRevision(path, "1");
      }
      return {
        ok: true as const,
        value: {
          status: "present" as const,
          side: "remote" as const,
          path,
          entityKind: "file" as const,
          remoteObjectId,
          content: ev(remoteText, remoteRevisionValue),
          stability: "stable" as const,
        },
      };
    },
    update: async () => { updates += 1; throw new Error("raw stale update must never execute"); },
    download: async () => ({ ok: true as const, value: { remoteObjectId, content: src(remoteText), evidence: ev(remoteText, remoteRevisionValue) } }),
  } as never;
  const reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async () => { updates += 1; throw new Error("stale operation must not reserve an update candidate"); },
    reserveFolderCreateIdentity: async () => { throw new Error("folder reservation is not used by scenario 24"); },
    createReserved: async () => { updates += 1; throw new Error("stale operation must not create"); },
    updateExisting: async () => { updates += 1; throw new Error("stale operation must not update"); },
    moveExisting: async () => { updates += 1; throw new Error("stale operation must not move"); },
    trashExisting: async () => { updates += 1; throw new Error("stale operation must not trash"); },
  };
  const controller = await makeController(local, drive, store, reliableRemoteMutationPort);
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations[0]?.kind, "upload-update");
  assert.equal((await controller.request({ kind: "execute-plan", planId: plan.planId })).status, "accepted");
  assert.equal(updates, 0);
  assert.equal(controller.currentSurface().status.kind, "attention-required");
  await new Promise(resolve => globalThis.setTimeout(resolve, 10));
  assert.equal(changeReads, 0);
});

test("G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation", async () => {
  const a = vp("a.md");
  const b = vp("b.md");
  const ra = rid("rid:a");
  const rb = rid("rid:b");
  const entries = [{ path: a, text: "A0", remoteObjectId: ra }, { path: b, text: "B0", remoteObjectId: rb }];
  const store = await storeFor(entries);

  interface LocalFile { text: string; evidence: ContentEvidence; token: ObservationToken; }
  interface RemoteFile { path: VaultPath; text: string; evidence: ContentEvidence; remoteObjectId: RemoteObjectId; }
  let localTokenSequence = 0;
  const nextLocalToken = (path: VaultPath) => id<"ObservationToken">(`tok:${++localTokenSequence}:${String(path)}`) as ObservationToken;
  const localFiles = new Map<string, LocalFile>([
    [String(a), { text: "A1", evidence: ev("A1"), token: nextLocalToken(a) }],
    [String(b), { text: "B0", evidence: ev("B0"), token: nextLocalToken(b) }],
  ]);
  const remoteFiles = new Map<string, RemoteFile>([
    [String(a), { path: a, text: "A0", evidence: ev("A0", remoteRevision(a)), remoteObjectId: ra }],
    [String(b), { path: b, text: "B0", evidence: ev("B0", remoteRevision(b)), remoteObjectId: rb }],
  ]);
  const preservedRemotePredecessors = new Map<string, RemoteFile>();
  const stagedLocalTransactions = new Map<string, { text: string; evidence: ContentEvidence }>();
  let queued: RemoteChange[] = [];
  let reads = 0;
  let rawUpdates = 0;
  let rawLocalReplacements = 0;
  let candidateSequence = 0;
  let updateStartedResolve!: () => void;
  let releaseUpdate!: () => void;
  const updateStarted = new Promise<void>(resolve => { updateStartedResolve = resolve; });
  const updateRelease = new Promise<void>(resolve => { releaseUpdate = resolve; });

  const local = {
    enumerate: async () => ({
      entries: [a, b].map(path => {
        const file = localFiles.get(String(path))!;
        return {
          status: "present" as const,
          side: "local" as const,
          path,
          entityKind: "file" as const,
          content: file.evidence,
          stability: "stable" as const,
          observationToken: file.token,
        };
      }),
      completeness: { status: "complete" as const },
    }),
    observe: async (path: VaultPath) => {
      const file = localFiles.get(String(path));
      return file
        ? {
            status: "present" as const,
            side: "local" as const,
            path,
            entityKind: "file" as const,
            content: file.evidence,
            stability: "stable" as const,
            observationToken: file.token,
          }
        : { status: "absent" as const, side: "local" as const, path };
    },
    readFile: async (path: VaultPath, expectedToken?: ObservationToken) => {
      const file = localFiles.get(String(path));
      if (!file) throw new Error(`missing local ${String(path)}`);
      if (expectedToken && expectedToken !== file.token) throw new Error("stale local token");
      return { content: src(file.text), evidence: file.evidence, stability: "stable" as const, observationToken: file.token };
    },
    replaceFile: async () => { rawLocalReplacements += 1; throw new Error("raw LOCAL replace must not execute"); },
    validatePath: async (path: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(path) }),
  } as never;

  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    readChangePage: async (_identity: ManagedRemoteIdentity, requestedToken: ChangeCursor) => {
      reads += 1;
      const changes = queued;
      queued = [];
      return {
        ok: true as const,
        value: {
          kind: "terminal" as const,
          requestedToken,
          changes,
          newStartPageToken: cur(requestedToken === cur("cursor:0") ? "cursor:1" : "cursor:2"),
        },
      };
    },
    getStartCursor: async () => ({ ok: true as const, value: cur("cursor:full") }),
    listForReconciliation: async () => ({
      ok: true as const,
      value: {
        entries: [...preservedRemotePredecessors.values(), ...remoteFiles.values()].map(file => ({
          path: file.path,
          entityKind: "file" as const,
          remoteObjectId: file.remoteObjectId,
          content: file.evidence,
          trashed: false,
        })),
        completeness: { status: "complete" as const },
      },
    }),
    observe: async (_rootId: RemoteObjectId, path: VaultPath) => {
      const file = remoteFiles.get(String(path));
      return file
        ? {
            ok: true as const,
            value: {
              status: "present" as const,
              side: "remote" as const,
              path,
              entityKind: "file" as const,
              remoteObjectId: file.remoteObjectId,
              content: file.evidence,
              stability: "stable" as const,
            },
          }
        : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path } };
    },
    update: async () => { rawUpdates += 1; throw new Error("raw Drive update must not execute"); },
    download: async (remoteObjectId: RemoteObjectId) => {
      const file = [...remoteFiles.values(), ...preservedRemotePredecessors.values()].find(candidate => candidate.remoteObjectId === remoteObjectId);
      if (!file) return { ok: false as const, signal: { kind: "not-found" as const, remoteObjectId } };
      return { ok: true as const, value: { remoteObjectId, content: src(file.text), evidence: file.evidence } };
    },
  } as never;

  const reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_managed, intentId, path, intendedContent) => ({
      ok: true as const,
      value: {
        kind: "reserved-file-create" as const,
        intentId,
        reservedRemoteObjectId: rid(`rid:candidate:${++candidateSequence}:${String(path)}`),
        path,
        intendedContent,
      },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder reservation is not used by scenario 25"); },
    createReserved: async () => { throw new Error("create is not used by scenario 25"); },
    updateExisting: async (mutation, content) => {
      assert.equal(mutation.kind, "existing-file-content-update");
      const predecessor = remoteFiles.get(String(mutation.path));
      if (!predecessor || predecessor.remoteObjectId !== mutation.remoteObjectId || predecessor.evidence.revision !== String(mutation.expectedRevision)) {
        return { status: "verified-not-applied" as const, reason: "fixture predecessor authority changed before hardened update" };
      }
      updateStartedResolve();
      await updateRelease;
      const text = await textOf(content);
      const actual = ev(text);
      assert.equal(actual.hash, mutation.intendedContent.hash);
      assert.equal(actual.sizeBytes, mutation.intendedContent.sizeBytes);
      preservedRemotePredecessors.set(String(predecessor.remoteObjectId), predecessor);
      const candidate: RemoteFile = {
        path: mutation.path,
        text,
        evidence: { hash: mutation.intendedContent.hash, sizeBytes: mutation.intendedContent.sizeBytes, revision: remoteRevision(mutation.path, `candidate-${candidateSequence}`) },
        remoteObjectId: mutation.candidateRemoteObjectId,
      };
      remoteFiles.set(String(mutation.path), candidate);
      return {
        status: "verified-effect" as const,
        applicationProof: {
          kind: "immutable-candidate-preservation" as const,
          candidateRemoteObjectId: mutation.candidateRemoteObjectId,
          predecessorRemoteObjectId: mutation.remoteObjectId,
          predecessorRevision: mutation.expectedRevision,
          intendedContent: mutation.intendedContent,
          verifiedContent: mutation.intendedContent,
          preservedRemoteObjectIds: [mutation.remoteObjectId, mutation.candidateRemoteObjectId],
        },
      };
    },
    moveExisting: async () => { throw new Error("move is not used by scenario 25"); },
    trashExisting: async () => { throw new Error("trash is not used by scenario 25"); },
  };

  const localTransactionalMutationPort: LocalTransactionalMutationPort = {
    stageAndVerify: async (transaction, content) => {
      const text = await textOf(content);
      const actual = ev(text);
      if (actual.hash !== transaction.expectedNewEvidence.hash || actual.sizeBytes !== transaction.expectedNewEvidence.sizeBytes) {
        return { status: "blocked", reason: "fixture staged bytes do not match intended content", transaction };
      }
      const current = localFiles.get(String(transaction.path));
      if (transaction.expectedTarget.status === "expected-absent" && current) {
        return { status: "stale", reason: "fixture target is no longer absent", transaction };
      }
      if (transaction.expectedTarget.status === "expected-present") {
        if (!current || current.token !== transaction.expectedTarget.observationToken
          || current.evidence.hash !== transaction.expectedTarget.canonicalContent.hash
          || current.evidence.sizeBytes !== transaction.expectedTarget.canonicalContent.sizeBytes) {
          return { status: "stale", reason: "fixture target changed before transactional staging", transaction };
        }
      }
      stagedLocalTransactions.set(String(transaction.transactionId), { text, evidence: actual });
      return { status: "staged-verified", transaction: { ...transaction, stage: "staged-verified" } as LocalMutationTransaction };
    },
    commitVerifiedStage: async transaction => {
      const staged = stagedLocalTransactions.get(String(transaction.transactionId));
      if (!staged) return { status: "outcome-unknown", reason: "fixture staged transaction is missing", transaction };
      const resultingObservationToken = nextLocalToken(transaction.path);
      localFiles.set(String(transaction.path), { text: staged.text, evidence: staged.evidence, token: resultingObservationToken });
      stagedLocalTransactions.delete(String(transaction.transactionId));
      return {
        status: "committed",
        transaction: { ...transaction, stage: "completed" } as LocalMutationTransaction,
        resultingObservationToken,
      };
    },
    recover: async transaction => ({ status: "blocked", reason: "fixture has no interrupted local transaction", transaction }),
  };

  const controller = await makeController(local, drive, store, reliableRemoteMutationPort, localTransactionalMutationPort);
  const first = controller.runAutomatic("periodic");
  await updateStarted;

  const remoteB = remoteFiles.get(String(b))!;
  const changedB: RemoteFile = { ...remoteB, text: "B1", evidence: ev("B1", remoteRevision(b, "1")) };
  remoteFiles.set(String(b), changedB);
  queued = [{ kind: "upsert", entry: { path: b, entityKind: "file", remoteObjectId: rb, content: changedB.evidence, trashed: false } }];
  controller.noteChangeDuringRun();
  releaseUpdate();

  await first;
  await new Promise(resolve => globalThis.setTimeout(resolve, 20));
  assert.equal(reads >= 2, true);
  assert.equal(rawUpdates, 0);
  assert.equal(rawLocalReplacements, 0);
  assert.equal(localFiles.get(String(b))?.text, "B1");
  assert.equal(remoteFiles.get(String(a))?.text, "A1");
  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.changeCursor, cur("cursor:2"));
});
