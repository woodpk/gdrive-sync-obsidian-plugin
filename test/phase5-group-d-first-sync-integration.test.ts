import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  LocalMutationTransaction,
  LocalTransactionalMutationPort,
  LocalVaultChange,
  ManagedRemoteIdentity,
  ObservationToken,
  PersistenceRevision,
  ReliableRemoteMutationPortV1_3,
  RemoteChange,
  RemoteObjectId,
  SemanticStateGeneration,
  StateLoadContext,
  Unsubscribe,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { IntegratedSynchronizationStateStore } from "../src/product/phase6-sync-integration";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { ProductSyncScheduler } from "../src/product/scheduler";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../src/product/text-version-store";
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

function evidence(text: string, revision?: string): ContentEvidence {
  return {
    hash: sha256Text(text),
    sizeBytes: new TextEncoder().encode(text).byteLength,
    ...(revision ? { revision } : {}),
  };
}
function source(text: string): BinaryContentSource {
  const bytes = new TextEncoder().encode(text);
  return { sizeBytes: bytes.byteLength, async *openChunks() { yield bytes; } };
}
async function textOf(content: BinaryContentSource): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  for await (const chunk of content.openChunks()) text += decoder.decode(chunk, { stream: true });
  return text + decoder.decode();
}

interface LocalFile { text: string; evidence: ContentEvidence; token: ObservationToken; }
interface RemoteFile { path: VaultPath; text: string; evidence: ContentEvidence; remoteObjectId: RemoteObjectId; }

class MemorySyncBoundary {
  readonly localFiles = new Map<string, LocalFile>();
  readonly remoteFiles = new Map<string, RemoteFile>();
  readonly localTrash: string[] = [];
  readonly remoteTrash: string[] = [];
  readonly createRemoteCalls: string[] = [];
  readonly updateRemoteCalls: string[] = [];
  readonly createLocalCalls: string[] = [];
  readonly replaceLocalCalls: string[] = [];
  readonly changeListeners = new Set<(change: LocalVaultChange) => void>();
  remoteChanges: RemoteChange[] = [];
  updateFailureOnce = false;
  cursorCounter = 0;
  remoteIdCounter = 0;
  localTokenCounter = 0;
  private readonly preservedRemotePredecessors = new Map<string, RemoteFile>();
  private readonly pendingRemoteCandidates = new Map<string, RemoteFile>();
  private readonly stagedLocalTransactions = new Map<string, { text: string; evidence: ContentEvidence }>();

  constructor(readonly identity: ManagedRemoteIdentity) {}

  setLocal(path: VaultPath, text: string): void {
    this.localFiles.set(String(path), { text, evidence: evidence(text), token: this.nextToken(path) });
  }
  setRemote(path: VaultPath, text: string, remoteObjectId = rid(`remote:${++this.remoteIdCounter}:${String(path)}`)): RemoteObjectId {
    const entry = { path, text, evidence: evidence(text, `r${this.remoteIdCounter}`), remoteObjectId };
    this.remoteFiles.set(String(path), entry);
    return remoteObjectId;
  }
  externalLocalEdit(path: VaultPath, text: string): void {
    this.setLocal(path, text);
    for (const listener of this.changeListeners) listener({ kind: "modified", path });
  }
  externalRemoteEdit(path: VaultPath, text: string): void {
    const prior = this.remoteFiles.get(String(path));
    assert.ok(prior);
    const next: RemoteFile = { ...prior, text, evidence: evidence(text, `r${++this.remoteIdCounter}`) };
    this.remoteFiles.set(String(path), next);
    this.remoteChanges.push({ kind: "upsert", entry: { path, entityKind: "file", remoteObjectId: next.remoteObjectId, content: next.evidence, trashed: false } });
  }
  emitChange(change: LocalVaultChange): void { for (const listener of this.changeListeners) listener(change); }

  readonly local = {
    activeConfigurationDirectory: async () => vp(".obsidian"),
    enumerate: async () => ({
      entries: [...this.localFiles.entries()].map(([raw, file]) => ({
        status: "present" as const,
        side: "local" as const,
        path: vp(raw),
        entityKind: "file" as const,
        content: file.evidence,
        stability: "stable" as const,
        observationToken: file.token,
      })),
      completeness: { status: "complete" as const },
    }),
    observe: async (path: VaultPath) => {
      const file = this.localFiles.get(String(path));
      return file
        ? { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content: file.evidence, stability: "stable" as const, observationToken: file.token }
        : { status: "absent" as const, side: "local" as const, path };
    },
    readFile: async (path: VaultPath, expectedToken?: ObservationToken) => {
      const file = this.localFiles.get(String(path));
      if (!file) throw new Error(`missing local ${String(path)}`);
      if (expectedToken && expectedToken !== file.token) throw new Error("stale local token");
      return { content: source(file.text), evidence: file.evidence, stability: "stable" as const, observationToken: file.token };
    },
    createFile: async (path: VaultPath, content: BinaryContentSource) => {
      const text = await textOf(content);
      this.createLocalCalls.push(String(path));
      this.setLocal(path, text);
      const file = this.localFiles.get(String(path))!;
      return { path, evidence: file.evidence, observationToken: file.token };
    },
    replaceFile: async (path: VaultPath, content: BinaryContentSource) => {
      const text = await textOf(content);
      this.replaceLocalCalls.push(String(path));
      this.setLocal(path, text);
      const file = this.localFiles.get(String(path))!;
      return { path, evidence: file.evidence, observationToken: file.token };
    },
    createFolder: async (path: VaultPath) => ({ path }),
    move: async (fromPath: VaultPath, toPath: VaultPath) => {
      const file = this.localFiles.get(String(fromPath));
      if (!file) throw new Error("missing local move source");
      this.localFiles.delete(String(fromPath));
      this.localFiles.set(String(toPath), { ...file, token: this.nextToken(toPath) });
      return { path: toPath, evidence: file.evidence };
    },
    trash: async (path: VaultPath) => { this.localTrash.push(String(path)); this.localFiles.delete(String(path)); },
    validatePath: async (path: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(path) }),
    classifyConfiguration: async () => ({ classification: "unknown" as const, reason: "test boundary" }),
    onChange: (listener: (change: LocalVaultChange) => void): Unsubscribe => { this.changeListeners.add(listener); return () => this.changeListeners.delete(listener); },
    onLifecycle: (_listener: (event: never) => void): Unsubscribe => () => undefined,
  };

  readonly drive = {
    authenticationState: async () => ({ status: "authenticated" as const }),
    validateManagedRoot: async (identity: ManagedRemoteIdentity) => ({
      ok: true as const,
      value: identity.rootId === this.identity.rootId && identity.vaultIdentity === this.identity.vaultIdentity
        ? { status: "valid" as const, identity: this.identity }
        : { status: "identity-mismatch" as const },
    }),
    getStartCursor: async () => ({ ok: true as const, value: cur(`cursor:${++this.cursorCounter}`) }),
    listForReconciliation: async () => {
      this.promotePendingRemoteCandidates();
      return {
        ok: true as const,
        value: {
          entries: [...this.preservedRemotePredecessors.values(), ...this.remoteFiles.values()].map(file => ({ path: file.path, entityKind: "file" as const, remoteObjectId: file.remoteObjectId, content: file.evidence, trashed: false })),
          completeness: { status: "complete" as const },
        },
      };
    },
    readChanges: async () => {
      const changes = [...this.remoteChanges];
      this.remoteChanges = [];
      return { ok: true as const, value: { changes, nextCursor: cur(`cursor:${++this.cursorCounter}`), completeness: { status: "complete" as const } } };
    },
    observe: async (_root: RemoteObjectId, path: VaultPath) => {
      const file = this.remoteFiles.get(String(path));
      return file
        ? { ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: file.remoteObjectId, content: file.evidence, stability: "stable" as const } }
        : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path } };
    },
    download: async (remoteObjectId: RemoteObjectId) => {
      const file = [...this.remoteFiles.values(), ...this.preservedRemotePredecessors.values(), ...this.pendingRemoteCandidates.values()].find(candidate => candidate.remoteObjectId === remoteObjectId);
      if (!file) return { ok: false as const, signal: { kind: "not-found" as const, remoteObjectId } };
      return { ok: true as const, value: { remoteObjectId, content: source(file.text), evidence: file.evidence } };
    },
    create: async (_root: RemoteObjectId, request: { path: VaultPath; entityKind: "file" | "folder"; content?: BinaryContentSource; expectedEvidence?: ContentEvidence }) => {
      const remoteObjectId = rid(`remote:${++this.remoteIdCounter}:${String(request.path)}`);
      const text = request.content ? await textOf(request.content) : "";
      const nextEvidence = request.expectedEvidence ?? evidence(text, `r${this.remoteIdCounter}`);
      this.remoteFiles.set(String(request.path), { path: request.path, text, evidence: nextEvidence, remoteObjectId });
      this.createRemoteCalls.push(String(request.path));
      return { ok: true as const, value: { remoteObjectId, path: request.path, evidence: nextEvidence } };
    },
    update: async (request: { remoteObjectId: RemoteObjectId; path: VaultPath; content: BinaryContentSource; expectedEvidence?: ContentEvidence }) => {
      if (this.updateFailureOnce) {
        this.updateFailureOnce = false;
        return { ok: false as const, signal: { kind: "transient-failure" as const, detail: "offline" } };
      }
      const text = await textOf(request.content);
      const nextEvidence = request.expectedEvidence ?? evidence(text, `r${++this.remoteIdCounter}`);
      this.remoteFiles.set(String(request.path), { path: request.path, text, evidence: nextEvidence, remoteObjectId: request.remoteObjectId });
      this.updateRemoteCalls.push(String(request.path));
      return { ok: true as const, value: { remoteObjectId: request.remoteObjectId, path: request.path, evidence: nextEvidence } };
    },
    move: async (remoteObjectId: RemoteObjectId, fromPath: VaultPath, toPath: VaultPath) => {
      const file = this.remoteFiles.get(String(fromPath));
      if (!file) return { ok: false as const, signal: { kind: "not-found" as const, remoteObjectId } };
      this.remoteFiles.delete(String(fromPath));
      this.remoteFiles.set(String(toPath), { ...file, path: toPath, remoteObjectId });
      return { ok: true as const, value: { remoteObjectId, path: toPath, evidence: file.evidence } };
    },
    trash: async (remoteObjectId: RemoteObjectId) => {
      const entry = [...this.remoteFiles.entries()].find(([, file]) => file.remoteObjectId === remoteObjectId);
      if (entry) { this.remoteTrash.push(entry[0]); this.remoteFiles.delete(entry[0]); }
      return { ok: true as const, value: undefined };
    },
  };

  readonly reliableRemoteMutationPort: ReliableRemoteMutationPortV1_3 = {
    reserveFileCreateIdentity: async (_managed, intentId, path, intendedContent) => ({
      ok: true,
      value: {
        kind: "reserved-file-create",
        intentId,
        reservedRemoteObjectId: rid(`remote:reserved:${++this.remoteIdCounter}:${String(path)}`),
        path,
        intendedContent,
      },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder creation is not used by this fixture"); },
    createReserved: async (identity, content) => {
      if (identity.kind !== "reserved-file-create" || !content) return { status: "outcome-unknown", reason: "fixture requires file content" };
      const text = await textOf(content);
      const actual = evidence(text);
      if (actual.hash !== identity.intendedContent.hash || actual.sizeBytes !== identity.intendedContent.sizeBytes) {
        return { status: "verified-not-applied", reason: "fixture source does not match reserved content identity" };
      }
      const next: RemoteFile = {
        path: identity.path,
        text,
        evidence: { hash: identity.intendedContent.hash, sizeBytes: identity.intendedContent.sizeBytes, revision: `r${++this.remoteIdCounter}` },
        remoteObjectId: identity.reservedRemoteObjectId,
      };
      this.remoteFiles.set(String(identity.path), next);
      this.createRemoteCalls.push(String(identity.path));
      return {
        status: "verified-effect",
        applicationProof: { kind: "reserved-create", remoteObjectId: identity.reservedRemoteObjectId, path: identity.path, verifiedContent: identity.intendedContent },
      };
    },
    updateExisting: async (identity, content) => {
      const predecessor = this.remoteFiles.get(String(identity.path));
      if (!predecessor || predecessor.remoteObjectId !== identity.remoteObjectId || predecessor.evidence.revision !== String(identity.expectedRevision)) {
        return { status: "verified-not-applied", reason: "fixture predecessor authority changed before update" };
      }
      const text = await textOf(content);
      const actual = evidence(text);
      if (actual.hash !== identity.intendedContent.hash || actual.sizeBytes !== identity.intendedContent.sizeBytes) {
        return { status: "verified-not-applied", reason: "fixture source does not match intended update content" };
      }
      const candidate: RemoteFile = {
        path: identity.path,
        text,
        evidence: { hash: identity.intendedContent.hash, sizeBytes: identity.intendedContent.sizeBytes, revision: `r${++this.remoteIdCounter}` },
        remoteObjectId: identity.candidateRemoteObjectId,
      };
      this.updateRemoteCalls.push(String(identity.path));
      if (this.updateFailureOnce) {
        this.updateFailureOnce = false;
        this.pendingRemoteCandidates.set(String(identity.path), candidate);
        return {
          status: "outcome-unknown",
          reason: "offline",
          operationalFailure: { kind: "transient-failure", source: "google-drive", detail: "offline" },
        };
      }
      this.preserveAndPromoteRemoteCandidate(predecessor, candidate);
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

  readonly localTransactionalMutationPort: LocalTransactionalMutationPort = {
    stageAndVerify: async (transaction, content) => {
      const text = await textOf(content);
      const actual = evidence(text);
      if (actual.hash !== transaction.expectedNewEvidence.hash || actual.sizeBytes !== transaction.expectedNewEvidence.sizeBytes) {
        return { status: "blocked", reason: "fixture staged bytes do not match intended content", transaction };
      }
      const current = this.localFiles.get(String(transaction.path));
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
      this.stagedLocalTransactions.set(String(transaction.transactionId), { text, evidence: actual });
      return { status: "staged-verified", transaction: { ...transaction, stage: "staged-verified" } as LocalMutationTransaction };
    },
    commitVerifiedStage: async transaction => {
      const staged = this.stagedLocalTransactions.get(String(transaction.transactionId));
      if (!staged) return { status: "outcome-unknown", reason: "fixture staged transaction is missing", transaction };
      if (transaction.mutationKind === "create") this.createLocalCalls.push(String(transaction.path));
      else this.replaceLocalCalls.push(String(transaction.path));
      this.setLocal(transaction.path, staged.text);
      this.stagedLocalTransactions.delete(String(transaction.transactionId));
      const resulting = this.localFiles.get(String(transaction.path))!;
      return {
        status: "committed",
        transaction: { ...transaction, stage: "completed" } as LocalMutationTransaction,
        resultingObservationToken: resulting.token,
      };
    },
    recover: async transaction => ({ status: "blocked", reason: "fixture has no interrupted local transaction", transaction }),
  };

  private preserveAndPromoteRemoteCandidate(predecessor: RemoteFile, candidate: RemoteFile): void {
    this.preservedRemotePredecessors.set(String(predecessor.remoteObjectId), predecessor);
    this.remoteFiles.set(String(candidate.path), candidate);
  }

  private promotePendingRemoteCandidates(): void {
    for (const [path, candidate] of this.pendingRemoteCandidates) {
      const predecessor = this.remoteFiles.get(path);
      if (predecessor) this.preserveAndPromoteRemoteCandidate(predecessor, candidate);
      this.pendingRemoteCandidates.delete(path);
    }
  }

  private nextToken(path: VaultPath): ObservationToken {
    return id<"ObservationToken">(`local:${++this.localTokenCounter}:${String(path)}`) as ObservationToken;
  }
}

interface Harness {
  boundary: MemorySyncBoundary;
  store: IntegratedSynchronizationStateStore;
  controller: IntegratedProductController;
  context: StateLoadContext;
  setFirstSyncCompleted(value: boolean): void;
  firstSyncCompleted(): boolean;
}

async function harness(options: { trusted?: DurableSynchronizationAuthorityState; local?: readonly [string, string][]; remote?: readonly [string, string, string?][] } = {}): Promise<Harness> {
  const vault = id<"VaultIdentity">("vault:g2:first-sync");
  const device = id<"DeviceIdentity">("device:g2:first-sync");
  const identity: ManagedRemoteIdentity = { rootId: rid("remote:g2:root"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
  const boundary = new MemorySyncBoundary(identity);
  for (const [raw, text] of options.local ?? []) boundary.setLocal(vp(raw), text);
  for (const [raw, text, remoteObjectId] of options.remote ?? []) boundary.setRemote(vp(raw), text, remoteObjectId ? rid(remoteObjectId) : undefined);
  const context: StateLoadContext = {
    expectation: options.trusted ? "existing-pairing" : "new-installation",
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const seeded = options.trusted ?? createInitialAuthorityState({
    persistenceRevision: prev("persistence:g2:first-sync:0"),
    semanticGeneration: gen("semantic:g2:first-sync:0"),
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  const saved = await rawStore.saveTrusted(seeded);
  assert.equal(saved.status, "saved");
  const store = new IntegratedSynchronizationStateStore(rawStore);
  const assembler = new ProductSnapshotAssembler(boundary.local as never, boundary.drive as never, store, context, async () => identity);
  const textVersions = new ProductTextVersionStore(new MemoryTextVersionPersistence(), boundary.local as never, boundary.drive as never);
  const conflicts = new ThreeWayConflictResolver(textVersions, textVersions, device);
  let controller!: IntegratedProductController;
  let completed = Boolean(options.trusted);
  const executor = new ProductSynchronizationExecutor(boundary.local as never, boundary.drive as never, store, context, () => controller.currentRunEvidence(), textVersions);
  controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: assembler,
    executor,
    reliableRemoteMutationPort: boundary.reliableRemoteMutationPort,
    localTransactionalMutationPort: boundary.localTransactionalMutationPort,
    conflictResolver: conflicts,
    plannerForTrigger: trigger => new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger })),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100),
    holderId: "g2-first-sync",
    automaticExecutionAllowed: () => completed ? { allowed: true } : { allowed: false, reason: "first sync incomplete" },
    onTrustedBaselineEstablished: async () => { completed = true; },
  });
  return { boundary, store, controller, context, setFirstSyncCompleted: value => { completed = value; }, firstSyncCompleted: () => completed };
}

function trustedState(path: VaultPath, remoteObjectId: RemoteObjectId, text: string): DurableSynchronizationAuthorityState {
  const vault = id<"VaultIdentity">("vault:g2:first-sync");
  const device = id<"DeviceIdentity">("device:g2:first-sync");
  const content = evidence(text, "r0");
  const semanticGeneration = gen("semantic:g2:trusted:0");
  const baseFingerprint = id<"BaseFingerprint">(`base:g2:${String(path)}`);
  const initial = createInitialAuthorityState({
    persistenceRevision: prev("persistence:g2:trusted:0"),
    semanticGeneration,
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  return {
    ...initial,
    base: [{ path, entityKind: "file", localExisted: true, remoteExisted: true, content, remoteObjectId }],
    remoteMappings: [{ path, entityKind: "file", remoteObjectId }],
    baseAuthority: [{ path, fingerprint: baseFingerprint }],
    pathConvergence: [{ path, state: { status: "converged", generation: semanticGeneration, baseFingerprint } }],
    changeCursor: cur("cursor:trusted:0"),
  };
}

async function executeReviewed(controller: IntegratedProductController) {
  const plan = await controller.previewManual();
  assert.ok(plan);
  const result = await controller.request({ kind: "execute-plan", planId: plan.planId });
  assert.equal(result.status, "accepted");
  return plan;
}

test("G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility", async () => {
  const h = await harness({ local: [["local-only.md", "local first"]] });
  assert.equal(h.firstSyncCompleted(), false);
  const plan = await executeReviewed(h.controller);
  assert.equal(plan.operations.some(operation => operation.kind === "upload-create"), true);
  assert.deepEqual(h.boundary.createRemoteCalls, ["local-only.md"]);
  assert.equal(h.firstSyncCompleted(), true);
  const loaded = await h.store.load(h.context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.ok(loaded.state.changeCursor);
    assert.equal(loaded.state.base.some(entry => String(entry.path) === "local-only.md" && entry.localExisted && entry.remoteExisted && Boolean(entry.remoteObjectId)), true);
  }
});

test("G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base", async () => {
  const h = await harness({ remote: [["remote-only.md", "remote first", "remote:only"]] });
  const plan = await executeReviewed(h.controller);
  assert.equal(plan.operations.some(operation => operation.kind === "download-create"), true);
  assert.deepEqual(h.boundary.createLocalCalls, ["remote-only.md"]);
  assert.equal(h.boundary.localFiles.get("remote-only.md")?.text, "remote first");
  const loaded = await h.store.load(h.context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.ok(loaded.state.changeCursor);
    assert.equal(loaded.state.base.find(entry => String(entry.path) === "remote-only.md")?.remoteObjectId, rid("remote:only"));
  }
});

test("G2 scenario 3 identical first sync establishes BASE without content mutation", async () => {
  const h = await harness({ local: [["same.md", "same"]], remote: [["same.md", "same", "remote:same"]] });
  const plan = await executeReviewed(h.controller);
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0].kind, "noop");
  assert.deepEqual(h.boundary.createRemoteCalls, []);
  assert.deepEqual(h.boundary.updateRemoteCalls, []);
  assert.deepEqual(h.boundary.createLocalCalls, []);
  assert.deepEqual(h.boundary.replaceLocalCalls, []);
  const loaded = await h.store.load(h.context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.base[0]?.remoteObjectId, rid("remote:same"));
});

test("G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions", async () => {
  const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
  const plan = await h.controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations[0]?.kind, "unresolved-conflict");
  assert.equal(h.controller.currentSurface().status.kind, "conflict-present");
  const result = await h.controller.request({ kind: "execute-plan", planId: plan.planId });
  assert.equal(result.status, "accepted");
  assert.equal(h.boundary.localFiles.get("collision.bin")?.text, "LOCAL");
  assert.equal(h.boundary.remoteFiles.get("collision.bin")?.text, "REMOTE");
  assert.equal(h.firstSyncCompleted(), false);
});

test("G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion", async () => {
  const h = await harness({ local: [["seed.md", "seed"]] });
  let automaticCalls = 0;
  const original = h.controller.runAutomatic.bind(h.controller);
  h.controller.runAutomatic = async trigger => { automaticCalls += 1; await original(trigger); };
  const scheduler = new ProductSyncScheduler(h.boundary.local as never, h.controller, () => ({
    startupResumeEnabled: false,
    localChangeEnabled: h.firstSyncCompleted(),
    periodicEnabled: false,
    periodicIntervalMs: 60_000,
    localDebounceMs: 0,
  }));
  scheduler.start();
  h.boundary.emitChange({ kind: "modified", path: vp("seed.md") });
  await new Promise(resolve => globalThis.setTimeout(resolve, 5));
  assert.equal(automaticCalls, 0);
  await executeReviewed(h.controller);
  h.boundary.setLocal(vp("later.md"), "later");
  h.boundary.emitChange({ kind: "created", path: vp("later.md") });
  await new Promise(resolve => globalThis.setTimeout(resolve, 20));
  assert.equal(automaticCalls, 1);
  assert.equal(h.boundary.remoteFiles.get("later.md")?.text, "later");
  scheduler.stop();
});

test("G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration", async () => {
  const path = vp("ordinary-local.md");
  const remoteObjectId = rid("remote:ordinary-local");
  const h = await harness({ trusted: trustedState(path, remoteObjectId, "base"), local: [[String(path), "base"]], remote: [[String(path), "base", String(remoteObjectId)]] });
  h.boundary.setLocal(path, "local edited");
  const plan = await executeReviewed(h.controller);
  assert.equal(plan.operations[0]?.kind, "upload-update");
  assert.deepEqual(h.boundary.updateRemoteCalls, [String(path)]);
  assert.equal(h.boundary.remoteFiles.get(String(path))?.text, "local edited");
  const loaded = await h.store.load(h.context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.base[0]?.content?.hash, sha256Text("local edited"));
});

test("G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration", async () => {
  const path = vp("ordinary-remote.md");
  const remoteObjectId = rid("remote:ordinary-remote");
  const h = await harness({ trusted: trustedState(path, remoteObjectId, "base"), local: [[String(path), "base"]], remote: [[String(path), "base", String(remoteObjectId)]] });
  h.boundary.externalRemoteEdit(path, "remote edited");
  const plan = await executeReviewed(h.controller);
  assert.equal(plan.operations[0]?.kind, "download-update");
  assert.deepEqual(h.boundary.replaceLocalCalls, [String(path)]);
  assert.equal(h.boundary.localFiles.get(String(path))?.text, "remote edited");
  const loaded = await h.store.load(h.context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.base[0]?.content?.hash, sha256Text("remote edited"));
});

test("G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds", async () => {
  const path = vp("reconnect.md");
  const remoteObjectId = rid("remote:reconnect");
  const h = await harness({ trusted: trustedState(path, remoteObjectId, "base"), local: [[String(path), "base"]], remote: [[String(path), "base", String(remoteObjectId)]] });
  h.boundary.setLocal(path, "edited while offline");
  h.boundary.updateFailureOnce = true;
  await h.controller.runAutomatic("periodic");
  assert.equal(h.controller.currentSurface().status.kind, "offline-deferred");
  const afterFailure = await h.store.load(h.context);
  assert.equal(afterFailure.status, "trusted");
  if (afterFailure.status === "trusted") assert.equal(afterFailure.state.changeCursor, cur("cursor:trusted:0"));
  assert.equal(h.boundary.remoteFiles.get(String(path))?.text, "base");

  await h.controller.runAutomatic("periodic");
  assert.equal(h.boundary.remoteFiles.get(String(path))?.text, "edited while offline");
  const afterReconnect = await h.store.load(h.context);
  assert.equal(afterReconnect.status, "trusted");
  if (afterReconnect.status === "trusted") {
    assert.notEqual(afterReconnect.state.changeCursor, cur("cursor:trusted:0"));
    assert.equal(afterReconnect.state.base[0]?.content?.hash, sha256Text("edited while offline"));
  }
});
