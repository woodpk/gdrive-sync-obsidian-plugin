import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import {
  contractId,
  type BinaryContentSource,
  type CanonicalFileContentProof,
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
  type OperationId,
  type PathValidationResult,
  type PersistenceRevision,
  type PlannedOperation,
  type RecoverableOperationIntentV1_1,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type StateLoadContext,
  type Unsubscribe,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import type { DriveResult } from "../../../src/contracts/google-drive";
import { AuthorityCompleteExecutionCoordinator } from "../../../src/core/execution-coordinator";
import { StateCommitCoordinator } from "../../../src/core/commit-coordinator";
import { GoogleOAuthSession, ObsidianSecretStore } from "../../../src/drive/auth";
import { GoogleDriveAdapter } from "../../../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../../../src/drive/transport";
import { CanonicalEvidenceLocalVault } from "../../../src/product/canonical-local-vault";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { recoverOutstandingDurableIntents } from "../../../src/product/durable-intent-recovery";
import { CONFIG_REMOTE_NAMESPACE, ProductPathScope, ScopedLocalVault } from "../../../src/product/path-scope";
import { IntegratedLocalTransactionalMutationPort, IntegratedSynchronizationStateStore } from "../../../src/product/phase6-sync-integration";
import { TrustedStateSynchronizationAuthorityStore } from "../../../src/product/trusted-state-authority-store";
import {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
  type DurableSynchronizationAuthorityState,
} from "../../../src/state/persistent-state-store";
import { sha256Bytes } from "../../../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const obs = (value: string) => id<"ObservationToken">(value) as ObservationToken;
const opid = (value: string) => id<"OperationId">(value) as OperationId;
const gen = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const prev = (value: string) => id<"StateRevision">(value) as unknown as PersistenceRevision;
const vault = id<"VaultIdentity">("vault-1") as VaultIdentity;
const device = id<"DeviceIdentity">("device-h-u2") as DeviceIdentity;
const generation = gen("semantic:h-u2:1");
const rootId = rid("root");
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const managedRemote: ManagedRemoteIdentity = { rootId, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const FOLDER = "application/vnd.google-apps.folder";

function source(bytes: Uint8Array): BinaryContentSource {
  return { sizeBytes: bytes.byteLength, async *openChunks() { yield new Uint8Array(bytes); } };
}

async function collect(content: BinaryContentSource): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of content.openChunks()) { chunks.push(new Uint8Array(chunk)); total += chunk.byteLength; }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

function proof(bytes: Uint8Array): CanonicalFileContentProof {
  return { algorithm: "sha256", hash: sha256Bytes(bytes) as ContentHash, sizeBytes: bytes.byteLength };
}

function baseFingerprint(path: VaultPath) { return id<"BaseFingerprint">(`base:h-u2:${String(path)}`); }

async function cState(options: {
  readonly convergedPath: VaultPath;
  readonly existingRemoteObjectId?: RemoteObjectId;
  readonly existingContent?: CanonicalFileContentProof;
  readonly includeMapping?: boolean;
}) {
  const storage = new MemoryStateByteStorage();
  const raw = new PersistentSynchronizationStateStore(storage);
  const initial = createInitialAuthorityState({ persistenceRevision: prev("persistence:h-u2:1"), semanticGeneration: generation, vaultIdentity: vault, deviceIdentity: device });
  const fingerprint = baseFingerprint(options.convergedPath);
  const existing = options.existingRemoteObjectId;
  const state: DurableSynchronizationAuthorityState = {
    ...initial,
    base: existing ? [{
      path: options.convergedPath,
      entityKind: "file",
      localExisted: true,
      remoteExisted: true,
      remoteObjectId: existing,
      ...(options.existingContent ? { content: { hash: options.existingContent.hash, sizeBytes: options.existingContent.sizeBytes, revision: "7" } } : {}),
    }] : [],
    remoteMappings: existing && options.includeMapping !== false ? [{ path: options.convergedPath, entityKind: "file", remoteObjectId: existing }] : [],
    baseAuthority: existing ? [{ path: options.convergedPath, fingerprint }] : [],
    pathConvergence: [{ path: options.convergedPath, state: { status: "converged", generation, baseFingerprint: fingerprint } }],
  };
  const saved = await raw.saveTrusted(state);
  assert.equal(saved.status, "saved", "C authority fixture must itself be semantically valid");
  return { storage, raw, state: new IntegratedSynchronizationStateStore(raw) };
}

async function trusted(store: IntegratedSynchronizationStateStore) {
  const loaded = await store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("expected trusted integrated C state");
  return loaded.state;
}

async function authority(store: IntegratedSynchronizationStateStore) {
  const loaded = await store.loadAuthority();
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("expected trusted C authority");
  return loaded.state;
}

type DriveFile = {
  id: string;
  name?: string;
  mimeType?: string;
  parents?: string[];
  trashed?: boolean;
  size?: string;
  sha256Checksum?: string;
  version?: string;
  appProperties?: Record<string, string>;
  logicalPath?: string;
};

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

class DriveWorld {
  readonly files = new Map<string, DriveFile>();
  generateCount = 0;
  uploadDispatches = 0;
  trashPatches = 0;
  nextReserved = "reserved-h-u2";
  intended?: CanonicalFileContentProof;
  private pendingMetadata?: DriveFile;

  constructor() {
    this.files.set("root", { id: "root", name: "BRAIN Sync", mimeType: FOLDER, trashed: false, appProperties: { brainSyncRole: "brain-sync-root", brainVaultIdentity: "vault-1", brainProtocolVersion: "1" } });
    this.files.set("content", { id: "content", name: "vault", mimeType: FOLDER, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-content" } });
    this.files.set("config", { id: "config", name: CONFIG_REMOTE_NAMESPACE, mimeType: FOLDER, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-portable-config" } });
  }

  addFile(idValue: string, path: string, value: CanonicalFileContentProof, version = "7") {
    this.files.set(idValue, {
      id: idValue,
      name: path.split("/").at(-1) ?? path,
      logicalPath: path,
      mimeType: "application/octet-stream",
      parents: ["content"],
      trashed: false,
      size: String(value.sizeBytes),
      sha256Checksum: String(value.hash).replace(/^sha256:/, ""),
      version,
      appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" },
    });
  }

  activeEntries() {
    return [...this.files.values()]
      .filter(file => !["root", "content", "config"].includes(file.id))
      .map(file => ({
        path: vp(file.logicalPath ?? file.name ?? ""),
        entityKind: file.mimeType === FOLDER ? "folder" as const : "file" as const,
        remoteObjectId: rid(file.id),
        ...(file.mimeType === FOLDER ? {} : { content: { hash: id<"ContentHash">(`sha256:${file.sha256Checksum ?? ""}`), sizeBytes: Number(file.size ?? 0), revision: file.version } }),
        trashed: Boolean(file.trashed),
      }));
  }

  adapter(): GoogleDriveAdapter {
    const secrets = new MemorySecrets();
    secrets.setSecret("brain-gdrive-paired-account", "acct");
    const store = new ObsidianSecretStore(secrets);
    return new GoogleDriveAdapter(
      new GoogleOAuthSession({ clientId: "client", redirectUri: "https://callback" }, store),
      new StubTransport((url, init) => this.request(url, init)),
      store,
    );
  }

  private async request(url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> {
    const u = norm(url);
    const method = init.method ?? "GET";
    if (u.includes("/about?")) return ok({ user: { permissionId: "acct" } });
    if (u.includes("/files/generateIds")) { this.generateCount += 1; return ok({ ids: [this.nextReserved] }); }

    if (u.startsWith("https://www.googleapis.com/upload/")) {
      const metadata = typeof init.body === "string" ? JSON.parse(init.body) as DriveFile : {} as DriveFile;
      this.pendingMetadata = { ...metadata, logicalPath: metadata.name };
      return ok({}, 200, { location: "https://upload.example/h-u2" });
    }
    if (u.startsWith("https://upload.example/")) {
      const range = new Headers(init.headers).get("content-range") ?? "";
      if (range.startsWith("bytes */")) return fail("transient-failure", "status-response-lost");
      this.uploadDispatches += 1;
      const intended = this.intended;
      if (!intended) throw new Error("test world intended content not configured");
      const metadata: Partial<DriveFile> = this.pendingMetadata ?? {};
      this.files.set(this.nextReserved, {
        id: this.nextReserved,
        name: metadata.name ?? "note.md",
        logicalPath: metadata.name ?? "note.md",
        mimeType: "application/octet-stream",
        parents: metadata.parents ?? ["content"],
        trashed: false,
        size: String(intended.sizeBytes),
        sha256Checksum: String(intended.hash).replace(/^sha256:/, ""),
        version: "1",
        appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" },
      });
      return fail("transient-failure", "upload-response-lost");
    }

    const direct = /\/files\/([^/?]+)\?/.exec(u)?.[1];
    if (direct && direct !== "generateIds") {
      const file = this.files.get(direct);
      if (method === "PATCH") {
        if (!file) return fail("not-found");
        const body = typeof init.body === "string" ? JSON.parse(init.body) as { trashed?: boolean } : {};
        if (body.trashed === true) { file.trashed = true; this.trashPatches += 1; }
        return ok(file);
      }
      return file ? ok(file) : fail("not-found");
    }

    if (u.includes("brainSyncRole") && u.includes("brain-sync-root")) return ok({ files: [this.files.get("root")] });
    if (u.includes("'root' in parents") && u.includes("brain-sync-content")) return ok({ files: [this.files.get("content")] });
    if (u.includes("'root' in parents") && u.includes(`name='${CONFIG_REMOTE_NAMESPACE}'`)) return ok({ files: [this.files.get("config")] });

    const parent = /'([^']+)' in parents/.exec(u)?.[1];
    if (parent) {
      const wantedName = /name='([^']+)'/.exec(u)?.[1];
      const files = [...this.files.values()].filter(file => file.parents?.includes(parent) && !file.trashed && (!wantedName || file.name === wantedName));
      return ok({ files });
    }
    throw new Error(`unhandled Drive test request: ${method} ${u}`);
  }
}

function remoteLegacy(local: LocalVaultPort, world: DriveWorld, options: { readonly downloadBytes?: Uint8Array; readonly rawRemoteCounter?: { value: number } } = {}) {
  const downloadProof = options.downloadBytes ? proof(options.downloadBytes) : undefined;
  const rawCounter = options.rawRemoteCounter;
  return {
    local,
    drive: {
      listForReconciliation: async () => ({ ok: true, value: { entries: world.activeEntries(), completeness: { status: "complete" as const } } }),
      download: async (_remoteObjectId: RemoteObjectId) => downloadProof && options.downloadBytes
        ? { ok: true, value: { content: source(options.downloadBytes), evidence: { hash: downloadProof.hash, sizeBytes: downloadProof.sizeBytes } } }
        : { ok: false, signal: { kind: "not-found" as const } },
      create: async () => { if (rawCounter) rawCounter.value += 1; throw new Error("raw Drive create must not execute"); },
      update: async () => { if (rawCounter) rawCounter.value += 1; throw new Error("raw Drive update must not execute"); },
      move: async () => { if (rawCounter) rawCounter.value += 1; throw new Error("raw Drive move must not execute"); },
      trash: async () => { if (rawCounter) rawCounter.value += 1; throw new Error("raw Drive trash must not execute"); },
    },
    validatePreconditions: async () => ({ status: "valid" as const }),
    versionStillCurrent: async () => true,
    runEvidence: () => ({ managedRemote, remoteEnumerationComplete: true }),
  };
}

function simpleLocal(path: VaultPath, bytes: Uint8Array): LocalVaultPort {
  const expected = proof(bytes);
  const token = obs(`token:${String(path)}`);
  return {
    activeConfigurationDirectory: async () => vp(".obsidian"),
    enumerate: async () => ({ entries: [], completeness: { status: "complete" } }),
    observe: async value => value === path
      ? { status: "present", side: "local", path: value, entityKind: "file", stability: "stable", content: { hash: expected.hash, sizeBytes: expected.sizeBytes }, observationToken: token }
      : { status: "absent", side: "local", path: value, stability: "stable" },
    readFile: async () => ({ content: source(bytes), evidence: { hash: expected.hash, sizeBytes: expected.sizeBytes }, stability: "stable", observationToken: token }),
    createFile: async value => ({ path: value }),
    replaceFile: async value => ({ path: value }),
    createFolder: async value => ({ path: value }),
    move: async (_from, to) => ({ path: to }),
    trash: async () => undefined,
    validatePath: async value => ({ status: "compatible", normalizedComparisonPath: String(value).toLowerCase() }),
    classifyConfiguration: async () => ({ classification: "unknown", reason: "test" }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  } as LocalVaultPort;
}

function coordinator(
  legacy: ReturnType<typeof remoteLegacy>,
  state: IntegratedSynchronizationStateStore,
  dependencies: { reliableRemoteMutationPort?: unknown; localTransactionalMutationPort?: unknown; remoteFolderCreateRecoveryReadPort?: unknown } = {},
  authorityStore: unknown = state,
) {
  const executor = createAuthoritativeProductExecutor(legacy as never, authorityStore as never, state, context, managedRemote, dependencies as never);
  return new AuthorityCompleteExecutionCoordinator(authorityStore as never, executor, new StateCommitCoordinator(state, context), state, context);
}

function uploadCreate(path: VaultPath, value: CanonicalFileContentProof, operation = "h-u2-create"): PlannedOperation {
  return {
    operationId: opid(operation),
    kind: "upload-create",
    path,
    targetSide: "remote",
    contentVersion: { path, entityKind: "file", content: { hash: value.hash, sizeBytes: value.sizeBytes }, observationToken: obs(`token:${operation}`) },
    destructive: false,
    preconditions: [{ kind: "base-trusted" }],
    reasons: [],
  } as PlannedOperation;
}

class MemoryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  readonly adapterLog: string[] = [];
  private readonly versions = new Map<string, number>();
  private readonly listeners = new Set<(change: LocalVaultChange) => void>();
  readonly adapter = {
    exists: async (path: string) => this.files.has(path),
    writeBinary: async (path: string, bytes: ArrayBuffer) => { this.adapterLog.push(`write:${path}`); this.files.set(path, new Uint8Array(bytes)); this.bump(path); },
    appendBinary: async (path: string, bytes: ArrayBuffer) => { const old = this.files.get(path) ?? new Uint8Array(); const next = new Uint8Array(old.length + bytes.byteLength); next.set(old); next.set(new Uint8Array(bytes), old.length); this.adapterLog.push(`append:${path}`); this.files.set(path, next); this.bump(path); },
    rename: async (from: string, to: string) => { const value = this.files.get(from); if (!value) throw new Error(`missing rename source ${from}`); this.adapterLog.push(`rename:${from}->${to}`); this.files.set(to, value); this.files.delete(from); this.bump(from); this.bump(to); },
    remove: async (path: string) => { this.adapterLog.push(`remove:${path}`); this.files.delete(path); this.bump(path); },
    trashLocal: async (path: string) => { this.adapterLog.push(`trash:${path}`); this.files.delete(path); this.bump(path); },
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
    if (expected && expected !== token) throw new Error("stale observation");
    return { content: source(value), evidence: { hash: sha256Bytes(value), sizeBytes: value.length }, stability: "stable", observationToken: token };
  }
  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { this.files.set(String(path), await collect(content)); this.bump(String(path)); return { path, observationToken: this.token(path) }; }
  async replaceFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { this.files.set(String(path), await collect(content)); this.bump(String(path)); return { path, observationToken: this.token(path) }; }
  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> { return { path }; }
  async move(from: VaultPath, to: VaultPath): Promise<LocalMutationReceipt> { await (this.adapter as any).rename(String(from), String(to)); return { path: to, observationToken: this.token(to) }; }
  async trash(path: VaultPath): Promise<void> { await (this.adapter as any).trashLocal(String(path)); }
  async validatePath(path: VaultPath): Promise<PathValidationResult> { return { status: "compatible", normalizedComparisonPath: String(path).toLowerCase() }; }
  async classifyConfiguration() { return { classification: "unknown" as const, reason: "test" }; }
  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }
  private bump(path: string) { this.versions.set(path, (this.versions.get(path) ?? 0) + 1); }
  private token(path: VaultPath): ObservationToken { return obs(`${String(path)}:v${this.versions.get(String(path)) ?? 0}`); }
}

test("H-I1 REMOTE create composes C durable authority, A reserved identity, D verification, and canonical commit", async () => {
  const path = vp("h-u2-create.md");
  const bytes = new Uint8Array([1, 2, 3]);
  const intended = proof(bytes);
  const c = await cState({ convergedPath: path });
  const world = new DriveWorld();
  world.intended = intended;
  const a = world.adapter();
  const rawRemote = { value: 0 };
  const legacy = remoteLegacy(simpleLocal(path, bytes), world, { rawRemoteCounter: rawRemote });
  const result = await coordinator(legacy, c.state, { reliableRemoteMutationPort: a, remoteFolderCreateRecoveryReadPort: a }).executeOperation(uploadCreate(path, intended));
  assert.equal(result.status, "committed");
  assert.equal(world.generateCount, 1, "A reserved one stable Drive identity before dispatch");
  assert.equal(world.uploadDispatches, 1, "A performed the physical upload exactly once despite a lost response");
  assert.equal(rawRemote.value, 0, "D never fell back to raw legacy Drive mutation");
  const durable = await authority(c.state);
  const effect = durable.operationIntents.find(value => value.operationId === opid("h-u2-create"))?.effects[0];
  assert.equal(effect?.descriptor.kind, "remote-file");
  assert.equal(effect?.stage, "state-committed");
  if (effect?.descriptor.kind === "remote-file" && effect.descriptor.remoteMutation.kind === "reserved-file-create") {
    assert.equal(effect.descriptor.remoteMutation.reservedRemoteObjectId, rid("reserved-h-u2"));
  }
  const canonical = await trusted(c.state);
  assert.equal(canonical.base.find(value => value.path === path)?.remoteObjectId, rid("reserved-h-u2"));
  assert.equal(canonical.remoteMappings.find(value => value.path === path)?.remoteObjectId, rid("reserved-h-u2"));
  assert.equal(world.files.get("reserved-h-u2")?.id, "reserved-h-u2", "the independently observed physical object keeps the reserved identity");
});

test("H-I2 REMOTE trash uses current C identity authority through A and fails closed when the mapping is absent", async () => {
  const path = vp("h-u2-trash.md");
  const bytes = new Uint8Array([4, 5, 6]);
  const intended = proof(bytes);
  const remoteId = rid("remote:h-u2-trash");

  const positive = await cState({ convergedPath: path, existingRemoteObjectId: remoteId, existingContent: intended });
  const positiveWorld = new DriveWorld();
  positiveWorld.addFile(String(remoteId), String(path), intended);
  const a = positiveWorld.adapter();
  const positiveLegacy = remoteLegacy(simpleLocal(path, bytes), positiveWorld);
  const planned: PlannedOperation = {
    operationId: opid("h-u2-trash-positive"), kind: "trash-remote", path, targetSide: "remote", remoteObjectId: remoteId, destructive: true,
    preconditions: [
      { kind: "base-trusted" },
      { kind: "identity-unambiguous" },
      { kind: "identity-authority", proof: { status: "unique", generation: gen("planner-marker-must-not-authorize"), path, remoteObjectId: rid("planner-fake-id") } } as never,
    ],
    reasons: [],
  } as PlannedOperation;
  const committed = await coordinator(positiveLegacy, positive.state, { reliableRemoteMutationPort: a, remoteFolderCreateRecoveryReadPort: a }).executeOperation(planned);
  assert.equal(committed.status, "committed");
  assert.equal(positiveWorld.trashPatches, 1);
  assert.equal(positiveWorld.files.get(String(remoteId))?.trashed, true);
  const positiveCanonical = await trusted(positive.state);
  assert.equal(positiveCanonical.remoteMappings.some(value => value.path === path), false);
  assert.equal(positiveCanonical.tombstones.find(value => value.path === path)?.remoteObjectId, remoteId);

  const missing = await cState({ convergedPath: path, existingRemoteObjectId: remoteId, existingContent: intended, includeMapping: false });
  const missingWorld = new DriveWorld();
  missingWorld.addFile(String(remoteId), String(path), intended);
  const missingA = missingWorld.adapter();
  const blocked = await coordinator(remoteLegacy(simpleLocal(path, bytes), missingWorld), missing.state, { reliableRemoteMutationPort: missingA, remoteFolderCreateRecoveryReadPort: missingA }).executeOperation({ ...planned, operationId: opid("h-u2-trash-missing-mapping") } as PlannedOperation);
  assert.equal(blocked.status, "recovery-required");
  assert.equal(missingWorld.trashPatches, 0, "planner path/legacy identity markers cannot manufacture C identity authority");
  assert.equal(missingWorld.files.get(String(remoteId))?.trashed, false);
});

test("H-I3 C-persisted dispatch-authorized create restarts through D observation without redispatch and becomes inert after state commit", async () => {
  const path = vp("h-u2-restart.md");
  const bytes = new Uint8Array([7, 8, 9]);
  const intended = proof(bytes);
  const c = await cState({ convergedPath: path });
  const intentId = id<"MutationIntentId">("intent:h-u2-restart");
  const operationId = opid("h-u2-restart");
  const reserved = rid("remote:h-u2-recovered");
  const durableIntent: RecoverableOperationIntentV1_1 = {
    logicalKind: "single-effect",
    operationId,
    intentId,
    semanticAuthority: { generation },
    effects: [{
      effectId: "effect:h-u2-restart",
      stage: "intent-persisted",
      descriptor: {
        kind: "remote-file",
        targetSide: "remote",
        mutationKind: "create",
        targetPath: path,
        remoteMutation: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: reserved, path, intendedContent: intended },
        intendedContent: intended,
      },
    }],
  };
  let current = await authority(c.state);
  let saved = await c.raw.persistOperationIntent(durableIntent, current.persistenceRevision, current.semanticGeneration);
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  const authorized = await c.raw.advanceOperationEffect(operationId, "effect:h-u2-restart", "dispatch-authorized", undefined, saved.persistenceRevision, saved.semanticGeneration);
  assert.equal(authorized.status, "saved");

  const world = new DriveWorld();
  world.addFile(String(reserved), String(path), intended, "1");
  const mutationSpy = {
    reserveFileCreateIdentity: async () => { throw new Error("restart must not reserve a new identity"); },
    reserveFolderCreateIdentity: async () => { throw new Error("restart must not reserve a new identity"); },
    createReserved: async () => { throw new Error("restart must not redispatch physical create"); },
    updateExisting: async () => { throw new Error("restart must not redispatch update"); },
    moveExisting: async () => { throw new Error("restart must not redispatch move"); },
    trashExisting: async () => { throw new Error("restart must not redispatch trash"); },
  };
  const restartedRaw = new PersistentSynchronizationStateStore(c.storage);
  const restartedState = new IntegratedSynchronizationStateStore(restartedRaw);
  const legacy = remoteLegacy(simpleLocal(path, bytes), world);
  const firstRestart = await coordinator(legacy, restartedState, { reliableRemoteMutationPort: mutationSpy }).executeOperation(uploadCreate(path, intended, "h-u2-restart"));
  assert.equal(firstRestart.status, "committed");
  current = await authority(restartedState);
  const recoveredEffect = current.operationIntents.find(value => value.operationId === operationId)?.effects[0];
  assert.equal(recoveredEffect?.stage, "state-committed");
  assert.equal(recoveredEffect?.descriptor.kind, "remote-file");
  if (recoveredEffect?.descriptor.kind === "remote-file" && recoveredEffect.descriptor.remoteMutation.kind === "reserved-file-create") assert.equal(recoveredEffect.descriptor.remoteMutation.reservedRemoteObjectId, reserved);
  const canonical = await trusted(restartedState);
  assert.equal(canonical.remoteMappings.find(value => value.path === path)?.remoteObjectId, reserved);

  const semanticBefore = current.semanticGeneration;
  const persistenceBefore = current.persistenceRevision;
  const secondRaw = new PersistentSynchronizationStateStore(c.storage);
  const secondState = new IntegratedSynchronizationStateStore(secondRaw);
  const repeated = await recoverOutstandingDurableIntents(legacy as never, secondState, secondState, context, managedRemote, {});
  assert.equal(repeated.status, "recovered");
  if (repeated.status === "recovered") { assert.equal(repeated.changed, false); assert.equal(repeated.recoveredCount, 0); }
  const after = await authority(secondState);
  assert.equal(after.semanticGeneration, semanticBefore, "repeated restart must not repeat semantic commit");
  assert.equal(after.persistenceRevision, persistenceBefore, "completed durable intent must not be rewritten on repeated restart");
});

test("H-I4 D LOCAL mutation uses H logical mapping and B crash-safe transaction for portable configuration", async () => {
  const logical = vp(`${CONFIG_REMOTE_NAMESPACE}/hotkeys.json`);
  const bytes = new Uint8Array([10, 11, 12, 13]);
  const intended = proof(bytes);
  const remoteId = rid("remote:h-u2-local");
  const c = await cState({ convergedPath: logical });
  const rawLocal = new MemoryLocal();
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  const scoped = new ScopedLocalVault(rawLocal, scope);
  const hTransaction = new IntegratedLocalTransactionalMutationPort(rawLocal.adapter, rawLocal, scope);
  const canonicalLocal = new CanonicalEvidenceLocalVault(scoped, {}, hTransaction);
  const world = new DriveWorld();
  world.addFile(String(remoteId), String(logical), intended, "1");
  const legacy = remoteLegacy(canonicalLocal, world, { downloadBytes: bytes });
  const planned: PlannedOperation = {
    operationId: opid("h-u2-local-portable"), kind: "download-create", path: logical, targetSide: "local", remoteObjectId: remoteId,
    contentVersion: { path: logical, entityKind: "file", remoteObjectId: remoteId, content: { hash: intended.hash, sizeBytes: intended.sizeBytes } },
    destructive: false, preconditions: [{ kind: "base-trusted" }], reasons: [],
  } as PlannedOperation;
  const result = await coordinator(legacy, c.state, { localTransactionalMutationPort: canonicalLocal }).executeOperation(planned);
  assert.equal(result.status, "committed");
  assert.deepEqual([...rawLocal.files.get(".obsidian/hotkeys.json")!], [...bytes]);
  assert.equal(rawLocal.files.has(`${CONFIG_REMOTE_NAMESPACE}/hotkeys.json`), false, "synthetic REMOTE namespace must never become a literal filesystem target");
  assert.ok(rawLocal.adapterLog.some(value => value.startsWith("write:.obsidian/.hotkeys.json.brain-sync-stage-")), "B stage file is a physical sibling in the active configuration directory");
  assert.ok(rawLocal.adapterLog.some(value => value.includes("->.obsidian/hotkeys.json")), "B verified stage is atomically promoted to the physical target");
  const durable = await authority(c.state);
  const tx = durable.localTransactions.find(value => value.operationId === opid("h-u2-local-portable"));
  assert.equal(tx?.path, logical, "C persists D's logical transaction identity rather than H's physical path");
  assert.equal(tx?.stage, "completed");
  const effect = durable.operationIntents.find(value => value.operationId === opid("h-u2-local-portable"))?.effects[0];
  assert.equal(effect?.descriptor.kind, "local-file");
  if (effect?.descriptor.kind === "local-file") assert.equal(effect.descriptor.targetPath, logical);
  assert.equal(effect?.stage, "state-committed");
  const canonical = await trusted(c.state);
  assert.equal(canonical.base.find(value => value.path === logical)?.content?.hash, intended.hash, "canonical BASE advances only after verified local bytes");
});

test("H-I8 missing writable C, A reliable REMOTE, or B LOCAL transaction seam fails closed without legacy mutation", async () => {
  const path = vp("h-u2-fail-closed.md");
  const bytes = new Uint8Array([21, 22, 23]);
  const intended = proof(bytes);
  const remoteId = rid("remote:h-u2-fail-closed");

  const readOnlyC = await cState({ convergedPath: path, existingRemoteObjectId: remoteId, existingContent: intended });
  const readOnlyWorld = new DriveWorld();
  readOnlyWorld.addFile(String(remoteId), String(path), intended);
  let remoteMutationCalls = 0;
  const remoteSpy = {
    trashExisting: async () => { remoteMutationCalls += 1; return { status: "verified-effect", applicationProof: { kind: "trash", remoteObjectId: remoteId, path, trashed: true } }; },
  };
  const fallback = new TrustedStateSynchronizationAuthorityStore(readOnlyC.state, context);
  const readOnlyResult = await coordinator(remoteLegacy(simpleLocal(path, bytes), readOnlyWorld), readOnlyC.state, { reliableRemoteMutationPort: remoteSpy }, fallback).executeOperation({
    operationId: opid("h-u2-missing-c"), kind: "trash-remote", path, targetSide: "remote", remoteObjectId: remoteId, destructive: true,
    preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous" }], reasons: [],
  } as PlannedOperation);
  assert.equal(readOnlyResult.status, "recovery-required");
  assert.equal(remoteMutationCalls, 0, "read-only C fallback cannot authorize physical mutation");

  const missingA = await cState({ convergedPath: path });
  const missingAWorld = new DriveWorld();
  const rawRemote = { value: 0 };
  const missingAResult = await coordinator(remoteLegacy(simpleLocal(path, bytes), missingAWorld, { rawRemoteCounter: rawRemote }), missingA.state, {}).executeOperation(uploadCreate(path, intended, "h-u2-missing-a"));
  assert.ok(missingAResult.status === "blocked" || missingAResult.status === "recovery-required");
  assert.equal(rawRemote.value, 0, "absence of A's reliable port never falls back to legacy Drive mutation");

  const missingB = await cState({ convergedPath: path });
  let rawLocalCreates = 0;
  const missingBLocal = simpleLocal(vp("other.md"), bytes) as LocalVaultPort & { createFile: LocalVaultPort["createFile"] };
  missingBLocal.createFile = async value => { rawLocalCreates += 1; return { path: value }; };
  const missingBWorld = new DriveWorld();
  missingBWorld.addFile(String(remoteId), String(path), intended, "1");
  const missingBResult = await coordinator(remoteLegacy(missingBLocal, missingBWorld, { downloadBytes: bytes }), missingB.state, {}).executeOperation({
    operationId: opid("h-u2-missing-b"), kind: "download-create", path, targetSide: "local", remoteObjectId: remoteId,
    contentVersion: { path, entityKind: "file", remoteObjectId: remoteId, content: { hash: intended.hash, sizeBytes: intended.sizeBytes } },
    destructive: false, preconditions: [{ kind: "base-trusted" }], reasons: [],
  } as PlannedOperation);
  assert.ok(missingBResult.status === "blocked" || missingBResult.status === "recovery-required");
  assert.equal(rawLocalCreates, 0, "absence of B transaction seam never falls back to raw LOCAL create");
});
