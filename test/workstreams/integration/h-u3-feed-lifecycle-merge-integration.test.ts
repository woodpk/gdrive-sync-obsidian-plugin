import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import {
  contractId,
  type BinaryContentSource,
  type CanonicalFileContentProof,
  type ChangeCursor,
  type ContentHash,
  type DeviceIdentity,
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
  type SynchronizationStateStore,
  type TrustedSynchronizationState,
  type Unsubscribe,
  type VaultIdentity,
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
const prev = (value: string) => rev(value) as unknown as PersistenceRevision;
const gen = (value: string) => id<"SemanticStateGeneration">(value);
const vault = id<"VaultIdentity">("vault:h-u3") as VaultIdentity;
const device = id<"DeviceIdentity">("device:h-u3") as DeviceIdentity;
const generation = gen("semantic:h-u3:1");
const rootId = rid("root");
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const managedRemote: ManagedRemoteIdentity = { rootId, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const FOLDER = "application/vnd.google-apps.folder";
const encoder = new TextEncoder();

function source(bytes: Uint8Array): BinaryContentSource {
  return { sizeBytes: bytes.byteLength, async *openChunks() { yield new Uint8Array(bytes); } };
}
function proof(bytes: Uint8Array): CanonicalFileContentProof {
  return { algorithm: "sha256", hash: sha256Bytes(bytes) as ContentHash, sizeBytes: bytes.byteLength };
}
function textProof(text: string): CanonicalFileContentProof {
  return { algorithm: "sha256", hash: sha256Text(text), sizeBytes: encoder.encode(text).byteLength };
}
function baseFingerprint(path: VaultPath) { return id<"BaseFingerprint">(`base:h-u3:${String(path)}`); }

async function createCState(options: {
  readonly path: VaultPath;
  readonly remoteObjectId?: RemoteObjectId;
  readonly baseContent?: CanonicalFileContentProof;
  readonly changeCursor?: ChangeCursor;
  readonly localExisted?: boolean;
  readonly remoteExisted?: boolean;
  readonly includeConflict?: boolean;
}) {
  const storage = new MemoryStateByteStorage();
  const raw = new PersistentSynchronizationStateStore(storage);
  const initial = createInitialAuthorityState({
    persistenceRevision: prev("persistence:h-u3:1"),
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
    baseAuthority: [{ path: options.path, fingerprint: baseFingerprint(options.path) }],
    pathConvergence: [
      { path: options.path, state: { status: "converged", generation, baseFingerprint: baseFingerprint(options.path) } },
      ...(options.includeConflict ? [{ path: vp("unrelated-conflict.md"), state: { status: "conflict" as const, reasonCode: "fixture-unresolved" } }] : []),
    ],
    ...(options.changeCursor ? { changeCursor: options.changeCursor } : {}),
  };
  const saved = await raw.saveTrusted(state);
  assert.equal(saved.status, "saved", "C authority fixture must be valid");
  return { storage, raw, state: new IntegratedSynchronizationStateStore(raw) };
}
async function trusted(store: IntegratedSynchronizationStateStore): Promise<TrustedSynchronizationState> {
  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("expected trusted C state");
  return loaded.state;
}
async function authority(store: IntegratedSynchronizationStateStore): Promise<SynchronizationAuthorityMetadataV1_1> {
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
  override request(url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> { return this.handler(url, init); }
}
const ok = (body: unknown, status = 200, headers: Record<string, string> = {}) => Promise.resolve({
  ok: true,
  value: new Response(body === undefined ? undefined : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } }),
} as DriveResult<Response>);
const fail = (kind: "not-found" | "transient-failure" | "authentication-required" | "conflict", detail?: string) => Promise.resolve({
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
function googleAdapter(handler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>): GoogleDriveAdapter {
  const memory = new MemorySecrets();
  memory.setSecret("brain-gdrive-paired-account", "acct");
  const store = new ObsidianSecretStore(memory);
  return new GoogleDriveAdapter(new GoogleOAuthSession({ clientId: "client", redirectUri: "https://callback" }, store), new StubTransport(handler), store);
}

async function waitUntil(predicate: () => boolean, attempts = 50): Promise<void> {
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
  activeConfigurationDirectory = async () => vp(".obsidian");
  async enumerate(): Promise<LocalVaultListing> { return { entries: [await this.observe(this.path)], completeness: { status: "complete" } }; }
  async observe(path: VaultPath) {
    if (path !== this.path) return { status: "absent" as const, side: "local" as const, path, stability: "stable" as const };
    return { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, stability: "stable" as const, observationToken: this.token, content: { sizeBytes: this.bytes.byteLength } };
  }
  async readFile(path: VaultPath): Promise<LocalReadResult> {
    assert.equal(path, this.path);
    this.readCalls += 1;
    if (this.blockNextRead) { const gate = this.blockNextRead; this.blockNextRead = undefined; gate.started(); await gate.wait; }
    const bytes = new Uint8Array(this.bytes);
    return { content: source(bytes), evidence: { hash: sha256Bytes(bytes), sizeBytes: bytes.byteLength }, stability: "stable", observationToken: this.token };
  }
  async createFile(path: VaultPath): Promise<LocalMutationReceipt> { return { path }; }
  async replaceFile(path: VaultPath): Promise<LocalMutationReceipt> { return { path }; }
  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> { return { path }; }
  async move(_from: VaultPath, to: VaultPath): Promise<LocalMutationReceipt> { return { path: to }; }
  async trash(): Promise<void> { return; }
  async validatePath(path: VaultPath): Promise<PathValidationResult> { return { status: "compatible", normalizedComparisonPath: String(path).toLowerCase() }; }
  async classifyConfiguration() { return { classification: "unknown" as const, reason: "fixture" }; }
  onChange(): Unsubscribe { return () => undefined; }
  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe { this.lifecycle = listener; return () => { if (this.lifecycle === listener) this.lifecycle = undefined; }; }
}

test("H-I5 E periodic integrity uses B cache-bypassing bytes, schedules reconciliation on drift, and suspension prevents a new run", async () => {
  enterSynchronizationLifecycle("active");
  const raw = new IntegrityDriftLocal();
  const canonical = new CanonicalEvidenceLocalVault(raw, { staleRetryAttempts: 1, staleRetryDelayMs: 0 });
  const initial = await canonical.enumerate();
  const cachedHash = initial.entries[0]?.status === "present" ? initial.entries[0].content?.hash : undefined;
  assert.equal(cachedHash, sha256Text("cached-version\n"));
  assert.equal(raw.readCalls, 1, "initial canonical observation populates B evidence cache once");

  raw.bytes = encoder.encode("changed-behind-cache\n");
  const stillCached = await canonical.enumerate();
  assert.equal(stillCached.entries[0]?.status === "present" ? stillCached.entries[0].content?.hash : undefined, cachedHash);
  assert.equal(raw.readCalls, 1, "same observation token continues to serve the cached ordinary evidence");

  const automatic: string[] = [];
  let cancels = 0;
  const controller = {
    runAutomatic: async (trigger: string) => { automatic.push(trigger); },
    request: async (request: { kind: string }) => { if (request.kind === "cancel-active-sync") cancels += 1; return undefined; },
  };
  const scheduler = new ProductSyncScheduler(canonical, controller as never, () => ({
    startupResumeEnabled: false,
    localChangeEnabled: true,
    periodicEnabled: false,
    periodicIntervalMs: 60_000,
    localDebounceMs: 0,
  }));
  scheduler.start();
  (scheduler as unknown as { requestPeriodicOpportunity(): void }).requestPeriodicOpportunity();
  await waitUntil(() => automatic.length === 1);
  assert.deepEqual(automatic, ["local-change"], "authoritative byte mismatch becomes reconciliation opportunity, never deletion authority");
  assert.equal(raw.readCalls, 2, "E reached B's cache-bypassing integrity read rather than accepting cached evidence");

  let release!: () => void;
  let started!: () => void;
  const readStarted = new Promise<void>(resolve => { started = resolve; });
  const blocked = new Promise<void>(resolve => { release = resolve; });
  raw.blockNextRead = { started, wait: blocked };
  (scheduler as unknown as { requestPeriodicOpportunity(): void }).requestPeriodicOpportunity();
  await readStarted;
  raw.lifecycle?.({ kind: "suspend" });
  release();
  await waitUntil(() => cancels === 1);
  await new Promise(resolve => globalThis.setTimeout(resolve, 0));
  assert.equal(automatic.length, 1, "suspension gate remains authoritative over starting post-integrity synchronization work");
  scheduler.stop();
});

class FeedWorld {
  readonly calls: string[] = [];
  legacyReadCalls = 0;
  adapter(): GoogleDriveAdapter {
    const a = googleAdapter(async (url, init = {}) => {
      const u = norm(url);
      const common = commonDrive(url);
      if (common) return common;
      if (u.includes("/files/content?")) return ok(content());
      if (u.includes("/files/config?")) return ok(config());
      if (u.includes("/changes?")) {
        const token = new URL(url).searchParams.get("pageToken") ?? "";
        this.calls.push(token);
        if (token === "cursor:0") return ok({ changes: [{ fileId: "remote:old", removed: true }], nextPageToken: "page:1" });
        if (token === "page:1") return ok({ changes: [{ fileId: "remote:a2", file: { id: "remote:a2", name: "a.md", mimeType: "text/plain", parents: ["content"], size: "2", version: "8", appProperties: provenance() } }], newStartPageToken: "cursor:1" });
        if (token === "cursor:1") return ok({ changes: [{ fileId: "remote:b", file: { id: "remote:b", name: "b.md", mimeType: "text/plain", parents: ["content"], size: "2", version: "1", appProperties: provenance() } }], newStartPageToken: "cursor:2" });
        throw new Error(`unexpected Changes token ${token}`);
      }
      throw new Error(`unhandled feed request ${init.method ?? "GET"} ${u}`);
    });
    a.readChanges = (async () => { this.legacyReadCalls += 1; throw new Error("legacy cursor-collapsing readChanges must never be authoritative"); }) as typeof a.readChanges;
    return a;
  }
}
function emptyLocal(): LocalVaultPort { return { enumerate: async () => ({ entries: [], completeness: { status: "complete" } }) } as unknown as LocalVaultPort; }
function noOpPlan(sequence: number, snapshots?: (value: readonly unknown[]) => void) {
  return { plan: async (input: { snapshots: readonly unknown[] }) => {
    snapshots?.(input.snapshots);
    return { planId: id<"PlanId">(`plan:h-u3:${sequence}`), trigger: "periodic" as const, operations: [], executionDisposition: "safe-auto-eligible" as const, recoveryCheckpointRequired: false, globalExecutionGate: "none" as const };
  } };
}
function feedController(options: {
  readonly state: SynchronizationStateStore;
  readonly authority: SynchronizationAuthorityStoreV1_1;
  readonly assembler: ProductSnapshotAssembler;
  readonly capture?: (value: readonly unknown[]) => void;
}) {
  return new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: options.state,
    authorityStore: options.authority,
    snapshotAssembler: options.assembler,
    executor: {} as never,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: () => noOpPlan(1, options.capture) as never,
    leasePort: new InMemoryRunLeasePort(),
    audit: { append: async () => undefined, read: async () => [] } as never,
    holderId: "h-u3-feed",
  });
}

class CursorWriteFailureStore implements SynchronizationStateStore {
  cursorSaveAttempts = 0;
  constructor(private readonly delegate: IntegratedSynchronizationStateStore) {}
  load(context: StateLoadContext) { return this.delegate.load(context); }
  async saveTrusted(_candidate: TrustedSynchronizationState, _expected?: StateRevision) {
    this.cursorSaveAttempts += 1;
    return { status: "validation-failed" as const, reason: "injected-cursor-mirror-failure" };
  }
}
class FailingAuthority implements SynchronizationAuthorityStoreV1_1 {
  saveAttempts = 0;
  constructor(private readonly delegate: IntegratedSynchronizationStateStore) {}
  loadAuthority() { return this.delegate.loadAuthority(); }
  async saveAuthority(_candidate: SynchronizationAuthorityMetadataV1_1, _expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    this.saveAttempts += 1;
    const current = await this.delegate.loadAuthority();
    if (current.status !== "trusted") return { status: "validation-failed", reason: "fixture authority unavailable" };
    return { status: "stale-persistence", actualPersistenceRevision: current.state.persistenceRevision };
  }
  commitBaseTransition(...args: Parameters<SynchronizationAuthorityStoreV1_1["commitBaseTransition"]>) { return this.delegate.commitBaseTransition(...args); }
}

test("H-I6 A reliable pages are durably learned in C before cursor mirror; restart consumes the durable batch and later facts", async () => {
  enterSynchronizationLifecycle("active");
  const path = vp("a.md");
  const c = await createCState({ path, remoteObjectId: rid("remote:old"), changeCursor: cur("cursor:0"), localExisted: false, remoteExisted: true, includeConflict: true });
  const world1 = new FeedWorld();
  const a1 = world1.adapter();
  const cursorFailure = new CursorWriteFailureStore(c.state);
  const assembler1 = new ProductSnapshotAssembler(emptyLocal(), a1, c.state, context, async () => managedRemote, () => true, () => false, undefined, a1, c.state);
  const first = feedController({ state: cursorFailure, authority: c.state, assembler: assembler1 });
  await first.runAutomatic("periodic");
  assert.deepEqual(world1.calls, ["cursor:0", "page:1"], "A traverses every intermediate page through the terminal token");
  assert.equal(world1.legacyReadCalls, 0, "legacy cursor-collapsing readChanges is never the production authority path");
  const afterFirstAuthority = await authority(c.state);
  assert.equal(afterFirstAuthority.learnedRemoteBatches.length, 1, "terminal page set is durable in C before cursor mirror failure");
  assert.deepEqual(afterFirstAuthority.learnedRemoteBatches[0]?.changes.map(change => change.kind), ["removed", "upsert"]);
  assert.equal(afterFirstAuthority.learnedRemoteBatches[0]?.checkpoint.terminalStartToken, cur("cursor:1"));
  assert.equal(afterFirstAuthority.pathConvergence.find(value => value.path === vp("unrelated-conflict.md"))?.state.status, "conflict");
  assert.equal((await trusted(c.state)).changeCursor, cur("cursor:0"), "failed cursor mirror cannot erase or precede durable learned authority");
  assert.ok(cursorFailure.cursorSaveAttempts >= 1);
  assert.equal(first.currentSurface().status.kind, "recovery-required");

  const restartedRaw = new PersistentSynchronizationStateStore(c.storage);
  const restartedState = new IntegratedSynchronizationStateStore(restartedRaw);
  const world2 = new FeedWorld();
  const a2 = world2.adapter();
  let captured: readonly unknown[] = [];
  const assembler2 = new ProductSnapshotAssembler(emptyLocal(), a2, restartedState, context, async () => managedRemote, () => true, () => false, undefined, a2, restartedState);
  const restarted = feedController({ state: restartedState, authority: restartedState, assembler: assembler2, capture: value => { captured = value; } });
  await restarted.runAutomatic("periodic");
  assert.deepEqual(world2.calls, ["cursor:1"], "restart resumes from the durable learned terminal, not the stale canonical mirror");
  assert.equal(world2.legacyReadCalls, 0);
  const snapshots = captured as Array<{ path: VaultPath; remote: { status: string; remoteObjectId?: RemoteObjectId } }>;
  assert.equal(snapshots.find(value => value.path === vp("a.md"))?.remote.remoteObjectId, rid("remote:a2"), "already-durable first batch is reconstructed after restart");
  assert.equal(snapshots.find(value => value.path === vp("b.md"))?.remote.remoteObjectId, rid("remote:b"), "later unrelated REMOTE fact remains learnable despite prior path conflict");
  const finalAuthority = await authority(restartedState);
  assert.equal(finalAuthority.learnedRemoteBatches.length, 2);
  assert.equal(finalAuthority.pathConvergence.find(value => value.path === vp("unrelated-conflict.md"))?.state.status, "conflict");
  assert.equal((await trusted(restartedState)).changeCursor, cur("cursor:2"));
});

test("H-I6 failure to durably learn a terminal A batch prevents canonical cursor advancement", async () => {
  enterSynchronizationLifecycle("active");
  const path = vp("a.md");
  const c = await createCState({ path, remoteObjectId: rid("remote:old"), changeCursor: cur("cursor:0"), localExisted: false, remoteExisted: true });
  const world = new FeedWorld();
  const a = world.adapter();
  const failing = new FailingAuthority(c.state);
  const assembler = new ProductSnapshotAssembler(emptyLocal(), a, c.state, context, async () => managedRemote, () => true, () => false, undefined, a, failing);
  const controller = feedController({ state: c.state, authority: failing, assembler });
  await controller.runAutomatic("periodic");
  assert.deepEqual(world.calls, ["cursor:0", "page:1"]);
  assert.equal(failing.saveAttempts, 1);
  assert.equal((await authority(c.state)).learnedRemoteBatches.length, 0);
  assert.equal((await trusted(c.state)).changeCursor, cur("cursor:0"), "cursor mirror cannot advance when C durable learning fails");
  assert.equal(controller.currentSurface().status.kind, "recovery-required");
});

class MemoryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  readonly adapterLog: string[] = [];
  private readonly versions = new Map<string, number>();
  readonly adapter = {
    exists: async (path: string) => this.files.has(path),
    writeBinary: async (path: string, bytes: ArrayBuffer) => { this.adapterLog.push(`write:${path}`); this.files.set(path, new Uint8Array(bytes)); this.bump(path); },
    appendBinary: async (path: string, bytes: ArrayBuffer) => { const old = this.files.get(path) ?? new Uint8Array(); const next = new Uint8Array(old.length + bytes.byteLength); next.set(old); next.set(new Uint8Array(bytes), old.length); this.files.set(path, next); this.bump(path); },
    rename: async (from: string, to: string) => { const value = this.files.get(from); if (!value) throw new Error(`missing rename source ${from}`); this.adapterLog.push(`rename:${from}->${to}`); this.files.set(to, value); this.files.delete(from); this.bump(from); this.bump(to); },
    remove: async (path: string) => { this.files.delete(path); this.bump(path); },
    trashLocal: async (path: string) => { this.files.delete(path); this.bump(path); },
  } as unknown as DataAdapter;
  activeConfigurationDirectory = async () => vp(".obsidian");
  async enumerate(): Promise<LocalVaultListing> { return { entries: [], completeness: { status: "complete" } }; }
  async observe(path: VaultPath) {
    const value = this.files.get(String(path));
    return value
      ? { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, stability: "stable" as const, content: { hash: sha256Bytes(value), sizeBytes: value.length }, observationToken: this.token(path) }
      : { status: "absent" as const, side: "local" as const, path, stability: "stable" as const };
  }
  async readFile(path: VaultPath, expected?: ObservationToken): Promise<LocalReadResult> {
    const value = this.files.get(String(path));
    if (!value) throw new Error(`missing ${String(path)}`);
    const token = this.token(path);
    if (expected && expected !== token) throw new Error(`Local observation became stale: ${String(path)}`);
    return { content: source(value), evidence: { hash: sha256Bytes(value), sizeBytes: value.length }, stability: "stable", observationToken: token };
  }
  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { const chunks: Uint8Array[] = []; for await (const chunk of content.openChunks()) chunks.push(new Uint8Array(chunk)); this.files.set(String(path), Uint8Array.from(chunks.flatMap(value => [...value]))); this.bump(String(path)); return { path, observationToken: this.token(path) }; }
  async replaceFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { return this.createFile(path, content); }
  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> { return { path }; }
  async move(from: VaultPath, to: VaultPath): Promise<LocalMutationReceipt> { await (this.adapter as any).rename(String(from), String(to)); return { path: to, observationToken: this.token(to) }; }
  async trash(path: VaultPath): Promise<void> { await (this.adapter as any).trashLocal(String(path)); }
  async validatePath(path: VaultPath): Promise<PathValidationResult> { return { status: "compatible", normalizedComparisonPath: String(path).toLowerCase() }; }
  async classifyConfiguration() { return { classification: "unknown" as const, reason: "fixture" }; }
  onChange(_listener: (change: LocalVaultChange) => void): Unsubscribe { return () => undefined; }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }
  private bump(path: string) { this.versions.set(path, (this.versions.get(path) ?? 0) + 1); }
  private token(path: VaultPath): ObservationToken { return obs(`${String(path)}:v${this.versions.get(String(path)) ?? 0}`); }
}

type RemoteFile = { id: string; name: string; mimeType: string; parents: string[]; trashed: boolean; size: string; sha256Checksum: string; version: string; appProperties: Record<string, string> };
class MergeRemoteWorld {
  readonly files = new Map<string, RemoteFile>();
  readonly candidateId = "remote:merge-candidate";
  uploadDispatches = 0;
  intended?: CanonicalFileContentProof;
  private pendingName = "merge.md";
  constructor(readonly path: VaultPath, predecessor: RemoteObjectId, remoteText: string) {
    const p = textProof(remoteText);
    this.files.set(String(predecessor), { id: String(predecessor), name: String(path), mimeType: "text/plain", parents: ["content"], trashed: false, size: String(p.sizeBytes), sha256Checksum: String(p.hash).replace(/^sha256:/, ""), version: "7", appProperties: provenance() });
  }
  activeEntries() {
    return [...this.files.values()].filter(value => !value.trashed).map(file => ({ path: this.path, entityKind: "file" as const, remoteObjectId: rid(file.id), content: { hash: id<"ContentHash">(`sha256:${file.sha256Checksum}`), sizeBytes: Number(file.size), revision: file.version }, trashed: false }));
  }
  adapter(): GoogleDriveAdapter {
    return googleAdapter(async (url, init = {}) => {
      const u = norm(url);
      const method = init.method ?? "GET";
      const common = commonDrive(url);
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
        this.uploadDispatches += 1;
        const intended = this.intended;
        if (!intended) throw new Error("missing intended merge proof");
        this.files.set(this.candidateId, { id: this.candidateId, name: this.pendingName, mimeType: "application/octet-stream", parents: ["content"], trashed: false, size: String(intended.sizeBytes), sha256Checksum: String(intended.hash).replace(/^sha256:/, ""), version: "1", appProperties: provenance() });
        return fail("transient-failure", "upload-response-lost");
      }
      const direct = /\/files\/([^/?]+)\?/.exec(u)?.[1];
      if (direct) {
        const file = this.files.get(direct);
        return file ? ok(file) : fail("not-found");
      }
      const parent = /'([^']+)' in parents/.exec(u)?.[1];
      if (parent) {
        const wantedName = /name='([^']+)'/.exec(u)?.[1];
        const files = [...this.files.values()].filter(file => file.parents.includes(parent) && !file.trashed && (!wantedName || file.name === wantedName));
        return ok({ files });
      }
      throw new Error(`unhandled merge A request ${method} ${u}`);
    });
  }
}

function version(path: VaultPath, text: string, label: string, extra: Partial<VersionReference> = {}): VersionReference {
  const p = textProof(text);
  return { path, entityKind: "file", content: { hash: p.hash, sizeBytes: p.sizeBytes, revision: label }, ...extra };
}

test("H-I7 F clean merge requires independent B LOCAL and A REMOTE durable verification before C canonical commit", async () => {
  enterSynchronizationLifecycle("active");
  const path = vp("merge.md");
  const predecessor = rid("remote:merge-predecessor");
  const baseText = "a\nb\nc\n";
  const localText = "A\nb\nc\n";
  const remoteText = "a\nb\nC\n";
  const mergedText = "A\nb\nC\n";
  const base = version(path, baseText, "7");
  const c = await createCState({ path, remoteObjectId: predecessor, baseContent: textProof(baseText), localExisted: true, remoteExisted: true });

  const rawLocal = new MemoryLocal();
  rawLocal.files.set(String(path), encoder.encode(localText));
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  const scoped = new ScopedLocalVault(rawLocal, scope);
  const hTransaction = new IntegratedLocalTransactionalMutationPort(rawLocal.adapter, rawLocal, scope);
  const canonicalLocal = new CanonicalEvidenceLocalVault(scoped, {}, hTransaction);
  const localObservation = await canonicalLocal.observe(path);
  assert.equal(localObservation.status, "present");
  if (localObservation.status !== "present") return;

  const world = new MergeRemoteWorld(path, predecessor, remoteText);
  const a = world.adapter();
  const persistence = new MemoryTextVersionPersistence();
  const textVersions = new ProductTextVersionStore(persistence, canonicalLocal, {} as never, 1024);
  const localVersion = version(path, localText, "local", { observationToken: localObservation.observationToken });
  const remoteVersion = version(path, remoteText, "7", { remoteObjectId: predecessor });
  assert.equal(await textVersions.persistText(base, baseText), true);
  assert.equal(await textVersions.persistText(localVersion, localText), true);
  assert.equal(await textVersions.persistText(remoteVersion, remoteText), true);
  const resolver = new ThreeWayConflictResolver(textVersions, textVersions, device);
  const assessment = await resolver.assess(path, base, localVersion, remoteVersion);
  assert.equal(assessment.kind, "clean-merge");
  if (assessment.kind !== "clean-merge") return;
  assert.equal(await textVersions.retainedText(assessment.mergedVersion), mergedText, "F retains exact clean merged bytes for durable execution");
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
      identity: { status: "unambiguous", path, remoteObjectId: predecessor },
      remoteEnumeration: { status: "complete" },
    }],
  });
  const operation = plan.operations.find(value => value.kind === "clean-text-merge");
  assert.ok(operation, "D planner must consume F clean merge as clean-text-merge operation");
  if (!operation) return;

  const legacyDrive = {
    listForReconciliation: async () => ({ ok: true, value: { entries: world.activeEntries(), completeness: { status: "complete" as const } } }),
    observe: async (_root: RemoteObjectId, target: VaultPath) => {
      const matches = world.activeEntries().filter(value => value.path === target);
      return matches.length === 1
        ? { ok: true, value: { status: "present" as const, side: "remote" as const, ...matches[0], stability: "stable" as const } }
        : { ok: false, signal: { kind: "conflict" as const, detail: "ambiguous fixture path" } };
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
  const intent = durable.operationIntents.find(value => value.operationId === operation.operationId);
  const effects = intent?.effects ?? [];
  const canonicalAfter = await trusted(c.state);
  if (result.status !== "committed") {
    assert.fail(`H-I7 cross-workstream convergence failed: result=${result.status}; effects=${effects.map(value => `${value.descriptor.targetSide}:${value.stage}`).join(",")}; remoteSamePath=${world.activeEntries().map(value => String(value.remoteObjectId)).join(",")}; canonicalHash=${String(canonicalAfter.base.find(value => value.path === path)?.content?.hash ?? "none")}`);
  }
  assert.equal(effects.length, 2);
  assert.deepEqual(effects.map(value => value.descriptor.targetSide), ["local", "remote"]);
  assert.equal(effects.every(value => value.stage === "state-committed"), true, "both independent durable effects cross state-committed only after canonical C commit");
  assert.ok(rawLocal.adapterLog.some(value => value.startsWith("write:")), "LOCAL merge effect passes through B staging transaction");
  assert.equal(world.uploadDispatches, 1, "REMOTE merge effect passes through A immutable candidate update");
  assert.equal(canonicalAfter.base.find(value => value.path === path)?.content?.hash, assessment.mergedVersion.content?.hash);
  assert.notEqual(canonicalAfter.base.find(value => value.path === path)?.content?.hash, canonicalBefore.base.find(value => value.path === path)?.content?.hash, "canonical C BASE cannot claim convergence before merged effects complete");
});
