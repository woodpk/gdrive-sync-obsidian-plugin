import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import {
  contractId,
  type BinaryContentSource,
  type CanonicalFileContentProof,
  type ChangeCursor,
  type ContentHash,
  type LocalLifecycleEvent,
  type LocalMutationReceipt,
  type LocalReadResult,
  type LocalVaultChange,
  type LocalVaultListing,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type ObservationToken,
  type PathValidationResult,
  type PersistenceRevision,
  type PlannedOperation,
  type RemoteObjectId,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type Unsubscribe,
  type VaultPath,
  type VersionReference,
} from "../../../src/contracts";
import type { DriveResult } from "../../../src/contracts/google-drive";
import { StateCommitCoordinator } from "../../../src/core/commit-coordinator";
import { ThreeWayConflictResolver } from "../../../src/core/conflict-resolver";
import { AuthorityCompleteExecutionCoordinator } from "../../../src/core/execution-coordinator";
import { DeterministicSynchronizationPlanner } from "../../../src/core/planner";
import { enterSynchronizationLifecycle, InMemoryRunLeasePort } from "../../../src/core/run-coordinator";
import { GoogleOAuthSession, ObsidianSecretStore } from "../../../src/drive/auth";
import { GoogleDriveAdapter } from "../../../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../../../src/drive/transport";
import { CanonicalEvidenceLocalVault } from "../../../src/product/canonical-local-vault";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { ProductPathScope, ScopedLocalVault } from "../../../src/product/path-scope";
import { IntegratedLocalTransactionalMutationPort, IntegratedSynchronizationStateStore } from "../../../src/product/phase6-sync-integration";
import { IntegratedProductController } from "../../../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";
import { ProductSnapshotAssembler } from "../../../src/product/snapshot-assembler";
import { ProductSyncScheduler } from "../../../src/product/scheduler";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../../../src/product/text-version-store";
import {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
  type DurableSynchronizationAuthorityState,
} from "../../../src/state/persistent-state-store";
import { sha256Bytes, sha256Text } from "../../../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const obs = (value: string) => id<"ObservationToken">(value) as ObservationToken;
const cur = (value: string) => id<"ChangeCursor">(value) as ChangeCursor;
const rev = (value: string) => id<"StateRevision">(value) as StateRevision;
const generation = id<"SemanticStateGeneration">("semantic:h-u3:1");
const vault = id<"VaultIdentity">("vault:h-u3");
const device = id<"DeviceIdentity">("device:h-u3");
const rootId = rid("root");
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const managedRemote: ManagedRemoteIdentity = { rootId, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const encoder = new TextEncoder();
const FOLDER = "application/vnd.google-apps.folder";

function source(bytes: Uint8Array): BinaryContentSource {
  return { sizeBytes: bytes.byteLength, async *openChunks() { yield new Uint8Array(bytes); } };
}
function canonical(bytes: Uint8Array): CanonicalFileContentProof {
  return { algorithm: "sha256", hash: sha256Bytes(bytes) as ContentHash, sizeBytes: bytes.byteLength };
}
function textProof(text: string): CanonicalFileContentProof {
  return canonical(encoder.encode(text));
}
function fingerprint(path: VaultPath) { return id<"BaseFingerprint">(`base:h-u3:${String(path)}`); }

async function cState(options: {
  path: VaultPath;
  remoteObjectId?: RemoteObjectId;
  baseContent?: CanonicalFileContentProof;
  changeCursor?: ChangeCursor;
  localExisted?: boolean;
  remoteExisted?: boolean;
  unrelatedConflict?: boolean;
}) {
  const storage = new MemoryStateByteStorage();
  const raw = new PersistentSynchronizationStateStore(storage);
  const initial = createInitialAuthorityState({
    persistenceRevision: rev("persistence:h-u3:1") as unknown as PersistenceRevision,
    semanticGeneration: generation,
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  const remoteObjectId = options.remoteObjectId;
  const state: DurableSynchronizationAuthorityState = {
    ...initial,
    base: remoteObjectId ? [{
      path: options.path,
      entityKind: "file",
      localExisted: options.localExisted ?? true,
      remoteExisted: options.remoteExisted ?? true,
      remoteObjectId,
      ...(options.baseContent ? { content: { hash: options.baseContent.hash, sizeBytes: options.baseContent.sizeBytes, revision: "7" } } : {}),
    }] : [],
    remoteMappings: remoteObjectId ? [{ path: options.path, entityKind: "file", remoteObjectId }] : [],
    baseAuthority: [{ path: options.path, fingerprint: fingerprint(options.path) }],
    pathConvergence: [
      { path: options.path, state: { status: "converged", generation, baseFingerprint: fingerprint(options.path) } },
      ...(options.unrelatedConflict ? [{ path: vp("unrelated-conflict.md"), state: { status: "conflict" as const, reasonCode: "fixture-unresolved" } }] : []),
    ],
    ...(options.changeCursor ? { changeCursor: options.changeCursor } : {}),
  };
  const saved = await raw.saveTrusted(state);
  assert.equal(saved.status, "saved");
  return { storage, raw, state: new IntegratedSynchronizationStateStore(raw) };
}
async function trusted(store: IntegratedSynchronizationStateStore) {
  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("expected trusted C state");
  return loaded.state;
}
async function authority(store: IntegratedSynchronizationStateStore) {
  const loaded = await store.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("expected trusted C authority");
  return loaded.state;
}

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(key: string) { return this.values.get(key) ?? null; }
  setSecret(key: string, value: string) { this.values.set(key, value); }
  deleteSecret(key: string) { this.values.delete(key); }
}
class StubTransport extends GoogleHttpTransport {
  constructor(private readonly handler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>) {
    const memory = new MemorySecrets();
    super(new GoogleOAuthSession({ clientId: "client", redirectUri: "https://callback" }, new ObsidianSecretStore(memory)));
  }
  override request(url: string, init: PortableRequestInit = {}) { return this.handler(url, init); }
}
const ok = (body: unknown, status = 200, headers: Record<string, string> = {}) => Promise.resolve({
  ok: true,
  value: new Response(body === undefined ? undefined : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } }),
} as DriveResult<Response>);
const fail = (kind: "not-found" | "transient-failure" | "conflict", detail?: string) => Promise.resolve({
  ok: false,
  signal: kind === "not-found" ? { kind } : kind === "conflict" ? { kind, detail: detail ?? "conflict" } : { kind, detail },
} as DriveResult<Response>);
const norm = (url: string) => decodeURIComponent(url).replace(/\+/g, " ");
const root = () => ({ id: "root", name: "BRAIN Sync", mimeType: FOLDER, trashed: false, appProperties: { brainSyncRole: "brain-sync-root", brainVaultIdentity: String(vault), brainProtocolVersion: "1" } });
const content = () => ({ id: "content", name: "vault", mimeType: FOLDER, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-content" } });
const config = () => ({ id: "config", name: "__brain_sync_portable_config__", mimeType: FOLDER, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-portable-config" } });
const provenance = () => ({ brainManagedRootId: "root", brainSyncDomain: "content" });
function commonDrive(url: string): Promise<DriveResult<Response>> | undefined {
  const u = norm(url);
  if (u.includes("/about?")) return ok({ user: { permissionId: "acct" } });
  if (u.includes("/files/root?")) return ok(root());
  if (u.includes("'root' in parents") && u.includes("brain-sync-content")) return ok({ files: [content()] });
  if (u.includes("'root' in parents") && u.includes("__brain_sync_portable_config__")) return ok({ files: [config()] });
  return undefined;
}
function adapter(handler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>) {
  const memory = new MemorySecrets();
  memory.setSecret("brain-gdrive-paired-account", "acct");
  const store = new ObsidianSecretStore(memory);
  return new GoogleDriveAdapter(new GoogleOAuthSession({ clientId: "client", redirectUri: "https://callback" }, store), new StubTransport(handler), store);
}
async function waitUntil(predicate: () => boolean, attempts = 100) {
  for (let i = 0; i < attempts; i += 1) {
    if (predicate()) return;
    await new Promise(resolve => globalThis.setTimeout(resolve, 0));
  }
  throw new Error("condition did not become true");
}

class IntegrityDriftLocal implements LocalVaultPort {
  readonly path = vp("integrity.md");
  readonly token = obs("integrity:same-token");
  bytes = encoder.encode("cached-version\n");
  lifecycle?: (event: LocalLifecycleEvent) => void;
  readCalls = 0;
  blockNextRead?: { started: () => void; wait: Promise<void> };
  async activeConfigurationDirectory() { return vp(".obsidian"); }
  async enumerate(): Promise<LocalVaultListing> { return { entries: [await this.observe(this.path)], completeness: { status: "complete" } }; }
  async observe(path: VaultPath) {
    return path === this.path
      ? { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, stability: "stable" as const, observationToken: this.token, content: { sizeBytes: this.bytes.byteLength } }
      : { status: "absent" as const, side: "local" as const, path };
  }
  async readFile(path: VaultPath): Promise<LocalReadResult> {
    assert.equal(path, this.path);
    this.readCalls += 1;
    if (this.blockNextRead) { const gate = this.blockNextRead; this.blockNextRead = undefined; gate.started(); await gate.wait; }
    const bytes = new Uint8Array(this.bytes);
    return { content: source(bytes), evidence: { hash: sha256Bytes(bytes), sizeBytes: bytes.byteLength }, stability: "stable", observationToken: this.token };
  }
  async createFile(path: VaultPath, _content: BinaryContentSource): Promise<LocalMutationReceipt> { return { path }; }
  async replaceFile(path: VaultPath, _content: BinaryContentSource, _expected?: ObservationToken): Promise<LocalMutationReceipt> { return { path }; }
  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> { return { path }; }
  async move(_from: VaultPath, to: VaultPath): Promise<LocalMutationReceipt> { return { path: to }; }
  async trash(_path: VaultPath) { return; }
  async validatePath(path: VaultPath): Promise<PathValidationResult> { return { status: "compatible", normalizedComparisonPath: String(path).toLowerCase() }; }
  async classifyConfiguration(_path: VaultPath) { return { classification: "unknown" as const, reason: "fixture" }; }
  onChange(_listener: (change: LocalVaultChange) => void): Unsubscribe { return () => undefined; }
  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe { this.lifecycle = listener; return () => { if (this.lifecycle === listener) this.lifecycle = undefined; }; }
}

test("H-I5 E periodic integrity uses B cache-bypassing bytes, schedules reconciliation on drift, and suspension prevents a new run", async () => {
  enterSynchronizationLifecycle("active");
  const raw = new IntegrityDriftLocal();
  const canonicalLocal = new CanonicalEvidenceLocalVault(raw, { staleRetryAttempts: 1, staleRetryDelayMs: 0 });
  const initial = await canonicalLocal.enumerate();
  const cachedHash = initial.entries[0]?.status === "present" ? initial.entries[0].content?.hash : undefined;
  assert.equal(cachedHash, sha256Text("cached-version\n"));
  assert.equal(raw.readCalls, 1);
  raw.bytes = encoder.encode("changed-behind-cache\n");
  const ordinary = await canonicalLocal.enumerate();
  assert.equal(ordinary.entries[0]?.status === "present" ? ordinary.entries[0].content?.hash : undefined, cachedHash);
  assert.equal(raw.readCalls, 1, "ordinary same-token observation stayed cached");

  const automatic: string[] = [];
  let cancels = 0;
  const controller = {
    runAutomatic: async (trigger: string) => { automatic.push(trigger); },
    request: async (action: { kind: string }) => { if (action.kind === "cancel-active-sync") cancels += 1; return { status: "accepted" as const }; },
  };
  const scheduler = new ProductSyncScheduler(canonicalLocal, controller as never, () => ({ startupResumeEnabled: false, localChangeEnabled: true, periodicEnabled: false, periodicIntervalMs: 60_000, localDebounceMs: 0 }));
  scheduler.start();
  (scheduler as unknown as { requestPeriodicOpportunity(): void }).requestPeriodicOpportunity();
  await waitUntil(() => automatic.length === 1);
  assert.deepEqual(automatic, ["local-change"]);
  assert.equal(raw.readCalls, 2, "E used B cache-bypassing integrity bytes rather than cached evidence");

  let release!: () => void;
  let markStarted!: () => void;
  const started = new Promise<void>(resolve => { markStarted = resolve; });
  const blocked = new Promise<void>(resolve => { release = resolve; });
  raw.blockNextRead = { started: markStarted, wait: blocked };
  (scheduler as unknown as { requestPeriodicOpportunity(): void }).requestPeriodicOpportunity();
  await started;
  raw.lifecycle?.({ kind: "suspend" });
  release();
  await waitUntil(() => cancels === 1);
  await new Promise(resolve => globalThis.setTimeout(resolve, 0));
  assert.equal(automatic.length, 1, "suspension remained authoritative over starting new reconciliation work");
  scheduler.stop();
});

class FeedWorld {
  readonly calls: string[] = [];
  legacyCalls = 0;
  createAdapter() {
    const drive = adapter(async url => {
      const u = norm(url), common = commonDrive(url);
      if (common) return common;
      if (u.includes("/files/content?")) return ok(content());
      if (u.includes("/files/config?")) return ok(config());
      if (u.includes("/changes?")) {
        const token = new URL(url).searchParams.get("pageToken") ?? "";
        this.calls.push(token);
        if (token === "cursor:0") return ok({ changes: [{ fileId: "remote:old", removed: true }], nextPageToken: "page:1" });
        if (token === "page:1") return ok({ changes: [{ fileId: "remote:a2", file: { id: "remote:a2", name: "a.md", mimeType: "text/plain", parents: ["content"], size: "2", version: "8", appProperties: provenance() } }], newStartPageToken: "cursor:1" });
        if (token === "cursor:1") return ok({ changes: [{ fileId: "remote:b", file: { id: "remote:b", name: "b.md", mimeType: "text/plain", parents: ["content"], size: "2", version: "1", appProperties: provenance() } }], newStartPageToken: "cursor:2" });
        throw new Error(`unexpected token ${token}`);
      }
      throw new Error(`unhandled feed URL ${u}`);
    });
    drive.readChanges = (async () => { this.legacyCalls += 1; throw new Error("legacy readChanges forbidden"); }) as typeof drive.readChanges;
    return drive;
  }
}
function emptyLocal() { return { enumerate: async () => ({ entries: [], completeness: { status: "complete" as const } }) } as unknown as LocalVaultPort; }
function noOpPlanner(capture?: (snapshots: readonly unknown[]) => void) {
  return { plan: async (input: { snapshots: readonly unknown[] }) => {
    capture?.(input.snapshots);
    return { planId: id<"PlanId">("plan:h-u3-feed"), trigger: "periodic" as const, operations: [], executionDisposition: "safe-auto-eligible" as const, recoveryCheckpointRequired: false, globalExecutionGate: "none" as const };
  } };
}
function controllerFor(options: { state: unknown; authorityStore: SynchronizationAuthorityStoreV1_1; assembler: ProductSnapshotAssembler; capture?: (snapshots: readonly unknown[]) => void }) {
  return new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: options.state as never,
    authorityStore: options.authorityStore,
    snapshotAssembler: options.assembler,
    executor: {} as never,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: () => noOpPlanner(options.capture) as never,
    leasePort: new InMemoryRunLeasePort(),
    audit: { append: async () => undefined, read: async () => [] } as never,
    holderId: "h-u3-feed",
  });
}
class CursorMirrorFailure {
  cursorSaveAttempts = 0;
  constructor(private readonly delegate: IntegratedSynchronizationStateStore) {}
  load(ctx: StateLoadContext) { return this.delegate.load(ctx); }
  async saveTrusted(_candidate: TrustedSynchronizationState, _expected?: StateRevision) {
    this.cursorSaveAttempts += 1;
    return { status: "recovery-required" as const, reason: "injected cursor mirror failure" };
  }
}
class DurableLearningFailure implements SynchronizationAuthorityStoreV1_1 {
  saveAttempts = 0;
  constructor(private readonly delegate: IntegratedSynchronizationStateStore) {}
  loadAuthority() { return this.delegate.loadAuthority(); }
  async saveAuthority(_candidate: SynchronizationAuthorityMetadataV1_1, _expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    this.saveAttempts += 1;
    const loaded = await this.delegate.loadAuthority();
    return loaded.status === "trusted"
      ? { status: "stale-persistence", actualPersistenceRevision: loaded.state.persistenceRevision }
      : { status: "recovery-required", issues: [{ code: "other-semantic-inconsistency", detail: "fixture unavailable" }] };
  }
  commitBaseTransition(transition: Parameters<SynchronizationAuthorityStoreV1_1["commitBaseTransition"]>[0], expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: Parameters<SynchronizationAuthorityStoreV1_1["commitBaseTransition"]>[2]) {
    return this.delegate.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration);
  }
}

test("H-I6 A Changes traverse all pages; C durable learning precedes cursor mirror and restart consumes durable facts", async () => {
  enterSynchronizationLifecycle("active");
  const c = await cState({ path: vp("a.md"), remoteObjectId: rid("remote:old"), changeCursor: cur("cursor:0"), localExisted: false, remoteExisted: true, unrelatedConflict: true });
  const world1 = new FeedWorld();
  const a1 = world1.createAdapter();
  const cursorFailure = new CursorMirrorFailure(c.state);
  const assembler1 = new ProductSnapshotAssembler(emptyLocal(), a1, c.state, context, async () => managedRemote, () => true, () => false, undefined, a1, c.state);
  const first = controllerFor({ state: cursorFailure, authorityStore: c.state, assembler: assembler1 });
  await first.runAutomatic("periodic");
  assert.deepEqual(world1.calls, ["cursor:0", "page:1"]);
  assert.equal(world1.legacyCalls, 0);
  const learnedFirst = await authority(c.state);
  assert.equal(learnedFirst.learnedRemoteBatches.length, 1);
  assert.deepEqual(learnedFirst.learnedRemoteBatches[0]?.changes.map(change => change.kind), ["removed", "upsert"]);
  assert.equal(learnedFirst.learnedRemoteBatches[0]?.checkpoint.terminalStartToken, cur("cursor:1"));
  assert.equal((await trusted(c.state)).changeCursor, cur("cursor:0"), "cursor mirror did not advance after injected failure");
  assert.equal(learnedFirst.pathConvergence.find(value => value.path === vp("unrelated-conflict.md"))?.state.status, "conflict");
  assert.ok(cursorFailure.cursorSaveAttempts >= 1);
  assert.equal(first.currentSurface().status.kind, "recovery-required");

  const restarted = new IntegratedSynchronizationStateStore(new PersistentSynchronizationStateStore(c.storage));
  const world2 = new FeedWorld();
  const a2 = world2.createAdapter();
  let captured: readonly unknown[] = [];
  const assembler2 = new ProductSnapshotAssembler(emptyLocal(), a2, restarted, context, async () => managedRemote, () => true, () => false, undefined, a2, restarted);
  const second = controllerFor({ state: restarted, authorityStore: restarted, assembler: assembler2, capture: value => { captured = value; } });
  await second.runAutomatic("periodic");
  assert.deepEqual(world2.calls, ["cursor:1"], "restart resumed at durable learned terminal rather than stale mirror");
  assert.equal(world2.legacyCalls, 0);
  const snapshots = captured as Array<{ path: VaultPath; remote: { status: string; remoteObjectId?: RemoteObjectId } }>;
  assert.equal(snapshots.find(value => value.path === vp("a.md"))?.remote.remoteObjectId, rid("remote:a2"));
  assert.equal(snapshots.find(value => value.path === vp("b.md"))?.remote.remoteObjectId, rid("remote:b"));
  const finalAuthority = await authority(restarted);
  assert.equal(finalAuthority.learnedRemoteBatches.length, 2);
  assert.equal(finalAuthority.pathConvergence.find(value => value.path === vp("unrelated-conflict.md"))?.state.status, "conflict");
  assert.equal((await trusted(restarted)).changeCursor, cur("cursor:2"));
});

test("H-I6 failure to durably learn the terminal A batch prevents canonical cursor advancement", async () => {
  enterSynchronizationLifecycle("active");
  const c = await cState({ path: vp("a.md"), remoteObjectId: rid("remote:old"), changeCursor: cur("cursor:0"), localExisted: false, remoteExisted: true });
  const world = new FeedWorld();
  const a = world.createAdapter();
  const failing = new DurableLearningFailure(c.state);
  const assembler = new ProductSnapshotAssembler(emptyLocal(), a, c.state, context, async () => managedRemote, () => true, () => false, undefined, a, failing);
  const controller = controllerFor({ state: c.state, authorityStore: failing, assembler });
  await controller.runAutomatic("periodic");
  assert.deepEqual(world.calls, ["cursor:0", "page:1"]);
  assert.equal(failing.saveAttempts, 1);
  assert.equal((await authority(c.state)).learnedRemoteBatches.length, 0);
  assert.equal((await trusted(c.state)).changeCursor, cur("cursor:0"));
  assert.equal(controller.currentSurface().status.kind, "recovery-required");
});

class MemoryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  readonly versions = new Map<string, number>();
  readonly adapterLog: string[] = [];
  readonly adapter = {
    exists: async (path: string) => this.files.has(path),
    writeBinary: async (path: string, bytes: ArrayBuffer) => { this.adapterLog.push(`write:${path}`); this.files.set(path, new Uint8Array(bytes)); this.bump(path); },
    appendBinary: async (path: string, bytes: ArrayBuffer) => { const before = this.files.get(path) ?? new Uint8Array(); const next = new Uint8Array(before.length + bytes.byteLength); next.set(before); next.set(new Uint8Array(bytes), before.length); this.files.set(path, next); this.bump(path); },
    rename: async (from: string, to: string) => { const bytes = this.files.get(from); if (!bytes) throw new Error(`missing ${from}`); this.adapterLog.push(`rename:${from}->${to}`); this.files.set(to, bytes); this.files.delete(from); this.bump(from); this.bump(to); },
    remove: async (path: string) => { this.files.delete(path); this.bump(path); },
    trashLocal: async (path: string) => { this.files.delete(path); this.bump(path); },
  } as unknown as DataAdapter;
  async activeConfigurationDirectory() { return vp(".obsidian"); }
  async enumerate(): Promise<LocalVaultListing> { return { entries: [], completeness: { status: "complete" } }; }
  async observe(path: VaultPath) {
    const bytes = this.files.get(String(path));
    return bytes
      ? { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, stability: "stable" as const, content: { hash: sha256Bytes(bytes), sizeBytes: bytes.length }, observationToken: this.token(path) }
      : { status: "absent" as const, side: "local" as const, path };
  }
  async readFile(path: VaultPath, expected?: ObservationToken): Promise<LocalReadResult> {
    const bytes = this.files.get(String(path));
    if (!bytes) throw new Error(`missing ${String(path)}`);
    const token = this.token(path);
    if (expected && expected !== token) throw new Error(`Local observation became stale: ${String(path)}`);
    return { content: source(bytes), evidence: { hash: sha256Bytes(bytes), sizeBytes: bytes.length }, stability: "stable", observationToken: token };
  }
  async createFile(path: VaultPath, contentSource: BinaryContentSource) { return this.write(path, contentSource); }
  async replaceFile(path: VaultPath, contentSource: BinaryContentSource, _expected?: ObservationToken) { return this.write(path, contentSource); }
  async createFolder(path: VaultPath) { return { path }; }
  async move(from: VaultPath, to: VaultPath) { await (this.adapter as any).rename(String(from), String(to)); return { path: to, observationToken: this.token(to) }; }
  async trash(path: VaultPath) { await (this.adapter as any).trashLocal(String(path)); }
  async validatePath(path: VaultPath): Promise<PathValidationResult> { return { status: "compatible", normalizedComparisonPath: String(path).toLowerCase() }; }
  async classifyConfiguration(_path: VaultPath) { return { classification: "unknown" as const, reason: "fixture" }; }
  onChange(_listener: (change: LocalVaultChange) => void): Unsubscribe { return () => undefined; }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }
  private async write(path: VaultPath, contentSource: BinaryContentSource): Promise<LocalMutationReceipt> {
    const chunks: number[] = [];
    for await (const chunk of contentSource.openChunks()) chunks.push(...chunk);
    this.files.set(String(path), Uint8Array.from(chunks));
    this.bump(String(path));
    return { path, observationToken: this.token(path) };
  }
  private bump(path: string) { this.versions.set(path, (this.versions.get(path) ?? 0) + 1); }
  private token(path: VaultPath) { return obs(`${String(path)}:v${this.versions.get(String(path)) ?? 0}`); }
}

type RemoteFile = { id: string; name: string; mimeType: string; parents: string[]; trashed: boolean; size: string; sha256Checksum: string; version: string; appProperties: Record<string, string> };
class MergeWorld {
  readonly files = new Map<string, RemoteFile>();
  readonly candidateId = "remote:merge-candidate";
  intended?: CanonicalFileContentProof;
  uploadDispatches = 0;
  private pendingName: string;
  constructor(readonly path: VaultPath, predecessor: RemoteObjectId, remoteText: string) {
    this.pendingName = String(path);
    const p = textProof(remoteText);
    this.files.set(String(predecessor), { id: String(predecessor), name: String(path), mimeType: "text/plain", parents: ["content"], trashed: false, size: String(p.sizeBytes), sha256Checksum: String(p.hash).replace(/^sha256:/, ""), version: "7", appProperties: provenance() });
  }
  activeEntries() {
    return [...this.files.values()].filter(file => !file.trashed).map(file => ({ path: this.path, entityKind: "file" as const, remoteObjectId: rid(file.id), content: { hash: id<"ContentHash">(`sha256:${file.sha256Checksum}`), sizeBytes: Number(file.size), revision: file.version }, trashed: false }));
  }
  createAdapter() {
    return adapter(async (url, init = {}) => {
      const u = norm(url), common = commonDrive(url);
      if (common) return common;
      if (u.includes("/files/content?")) return ok(content());
      if (u.includes("/files/config?")) return ok(config());
      if (u.includes("/files/generateIds")) return ok({ ids: [this.candidateId] });
      if (u.includes("brainSyncRole") && u.includes("brain-sync-root")) return ok({ files: [root()] });
      if (u.startsWith("https://www.googleapis.com/upload/")) {
        const metadata = typeof init.body === "string" ? JSON.parse(init.body) as { name?: string } : {};
        this.pendingName = metadata.name ?? String(this.path);
        return ok({}, 200, { location: "https://upload.example/h-u3-merge" });
      }
      if (u === "https://upload.example/h-u3-merge") {
        const range = new Headers(init.headers).get("content-range") ?? "";
        if (range.startsWith("bytes */")) return fail("transient-failure", "status-response-lost");
        const intended = this.intended;
        if (!intended) throw new Error("missing intended merge proof");
        this.uploadDispatches += 1;
        this.files.set(this.candidateId, { id: this.candidateId, name: this.pendingName, mimeType: "application/octet-stream", parents: ["content"], trashed: false, size: String(intended.sizeBytes), sha256Checksum: String(intended.hash).replace(/^sha256:/, ""), version: "1", appProperties: provenance() });
        return fail("transient-failure", "upload-response-lost");
      }
      const direct = /\/files\/([^/?]+)\?/.exec(u)?.[1];
      if (direct) { const file = this.files.get(direct); return file ? ok(file) : fail("not-found"); }
      const parent = /'([^']+)' in parents/.exec(u)?.[1];
      if (parent) {
        const wantedName = /name='([^']+)'/.exec(u)?.[1];
        return ok({ files: [...this.files.values()].filter(file => file.parents.includes(parent) && !file.trashed && (!wantedName || file.name === wantedName)) });
      }
      throw new Error(`unhandled merge URL ${u}`);
    });
  }
}
function version(path: VaultPath, text: string, revision: string, extra: Partial<VersionReference> = {}): VersionReference {
  const p = textProof(text);
  return { path, entityKind: "file", content: { hash: p.hash, sizeBytes: p.sizeBytes, revision }, ...extra };
}

test("H-I7 F clean merge requires independent B LOCAL and A REMOTE durable verification before C canonical commit", async () => {
  enterSynchronizationLifecycle("active");
  const path = vp("merge.md"), predecessor = rid("remote:merge-predecessor");
  const baseText = "a\nb\nc\n", localText = "A\nb\nc\n", remoteText = "a\nb\nC\n", mergedText = "A\nb\nC\n";
  const baseVersion = version(path, baseText, "7");
  const c = await cState({ path, remoteObjectId: predecessor, baseContent: textProof(baseText) });

  const rawLocal = new MemoryLocal();
  rawLocal.files.set(String(path), encoder.encode(localText));
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  const scoped = new ScopedLocalVault(rawLocal, scope);
  const localTransactions = new IntegratedLocalTransactionalMutationPort(rawLocal.adapter, rawLocal, scope);
  const canonicalLocal = new CanonicalEvidenceLocalVault(scoped, {}, localTransactions);
  const localObservation = await canonicalLocal.observe(path);
  assert.equal(localObservation.status, "present");
  if (localObservation.status !== "present") return;

  const world = new MergeWorld(path, predecessor, remoteText);
  const a = world.createAdapter();
  const textVersions = new ProductTextVersionStore(new MemoryTextVersionPersistence(), canonicalLocal, {} as never, 1024);
  const localVersion = version(path, localText, "local", { observationToken: localObservation.observationToken });
  const remoteVersion = version(path, remoteText, "7", { remoteObjectId: predecessor });
  assert.equal(await textVersions.persistText(baseVersion, baseText), true);
  assert.equal(await textVersions.persistText(localVersion, localText), true);
  assert.equal(await textVersions.persistText(remoteVersion, remoteText), true);
  const resolver = new ThreeWayConflictResolver(textVersions, textVersions, device);
  const assessment = await resolver.assess(path, baseVersion, localVersion, remoteVersion);
  assert.equal(assessment.kind, "clean-merge");
  if (assessment.kind !== "clean-merge") return;
  assert.equal(await textVersions.retainedText(assessment.mergedVersion), mergedText);
  world.intended = { algorithm: "sha256", hash: assessment.mergedVersion.content!.hash!, sizeBytes: assessment.mergedVersion.content!.sizeBytes! };

  const canonicalBefore = await trusted(c.state);
  const planner = new DeterministicSynchronizationPlanner(resolver);
  const plan = await planner.plan({
    state: { status: "trusted", state: canonicalBefore },
    snapshots: [{
      path,
      local: localObservation,
      remote: { status: "present", side: "remote", path, entityKind: "file", remoteObjectId: predecessor, content: remoteVersion.content, stability: "stable" },
      base: { status: "trusted", entry: canonicalBefore.base.find(value => value.path === path)! },
      identity: { status: "unambiguous" },
      remoteEnumeration: { status: "complete" },
    }],
  });
  const operation = plan.operations.find(value => value.kind === "clean-text-merge");
  assert.ok(operation);
  if (!operation) return;

  const legacyDrive = {
    listForReconciliation: async () => ({ ok: true, value: { entries: world.activeEntries(), completeness: { status: "complete" as const } } }),
    observe: async (_root: RemoteObjectId, target: VaultPath) => {
      const matches = world.activeEntries().filter(value => value.path === target);
      return matches.length === 1
        ? { ok: true, value: { status: "present" as const, side: "remote" as const, ...matches[0], stability: "stable" as const } }
        : { ok: false, signal: { kind: "conflict" as const, detail: "ambiguous same-path objects" } };
    },
    create: async () => { throw new Error("legacy remote create forbidden"); },
    update: async () => { throw new Error("legacy remote update forbidden"); },
    move: async () => { throw new Error("legacy remote move forbidden"); },
    trash: async () => { throw new Error("legacy remote trash forbidden"); },
  };
  const legacy = new ProductSynchronizationExecutor(canonicalLocal, legacyDrive as never, c.state, context, () => ({ managedRemote, remoteEnumerationComplete: true }), textVersions);
  const authoritative = createAuthoritativeProductExecutor(legacy, c.state, c.state, context, managedRemote, { reliableRemoteMutationPort: a, localTransactionalMutationPort: canonicalLocal });
  const coordinator = new AuthorityCompleteExecutionCoordinator(c.state, authoritative, new StateCommitCoordinator(c.state, context), c.state, context);
  const result = await coordinator.executeOperation(operation as PlannedOperation);
  const durable = await authority(c.state);
  const effects = durable.operationIntents.find(value => value.operationId === operation.operationId)?.effects ?? [];
  const canonicalAfter = await trusted(c.state);
  if (result.status !== "committed") {
    assert.fail(`H-I7 cross-workstream convergence failed: result=${result.status}; effects=${effects.map(value => `${value.descriptor.targetSide}:${value.stage}`).join(",")}; remoteSamePath=${world.activeEntries().map(value => String(value.remoteObjectId)).join(",")}; canonicalHash=${String(canonicalAfter.base.find(value => value.path === path)?.content?.hash ?? "none")}`);
  }
  assert.equal(effects.length, 2);
  assert.deepEqual(effects.map(value => value.descriptor.targetSide), ["local", "remote"]);
  assert.equal(effects.every(value => value.stage === "state-committed"), true);
  assert.ok(rawLocal.adapterLog.some(value => value.startsWith("write:")), "LOCAL merge effect used B transaction staging");
  assert.equal(world.uploadDispatches, 1, "REMOTE merge effect used A immutable candidate update");
  assert.equal(canonicalAfter.base.find(value => value.path === path)?.content?.hash, assessment.mergedVersion.content?.hash);
  assert.notEqual(canonicalAfter.base.find(value => value.path === path)?.content?.hash, canonicalBefore.base.find(value => value.path === path)?.content?.hash);
});
