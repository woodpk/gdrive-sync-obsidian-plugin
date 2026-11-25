import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import type { DataAdapter } from "obsidian";
import {
  contractId, generateDeviceIdentity, BoundedAuditHistory, CanonicalEvidenceLocalVault,
  DeterministicSynchronizationPlanner, InMemoryRunLeasePort, MemoryAuditPersistence,
  MemoryTextVersionPersistence, ProductController, ProductPathScope,
  ScopedLocalTransactionalMutationPort, ScopedLocalVault,
  IndexedDbInventoryObservationStore, VerifiedInventoryBaselineCoordinator,
  InventoryBackedSnapshotAssembler, buildInventoryPlanningBoundary,
  inventoryContinuityFingerprint, createObsidianGoogleDriveBoundary,
  ProductSynchronizationExecutor, ProductTextVersionStore,
  ProductionSynchronizationPlanner, ThreeWayConflictResolver,
  IndexedDbInventoryAwareStateByteStorage, PersistentSynchronizationStateStore,
  createInitialAuthorityState, SynchronizationStateAuthorityAdapter,
  type BinaryContentSource, type ObservationToken, type VaultPath, type LocalVaultPort,
  type LocalVaultChange, type LocalObservation, type LocalVaultListing, type LocalReadResult,
  type LocalMutationReceipt, type PathValidationResult, type ConfigurationClassification,
  type Unsubscribe, type LocalLifecycleEvent, type PersistenceRevision,
  type SemanticStateGeneration, type RemoteObjectId, type ManagedRemoteIdentity,
  type VaultIdentity, type ProtocolVersion, type ObsidianGoogleDriveBoundaryOptions,
} from "../../src/product/local-vault-boundary-seam";
import { FakeDatabase, withRangeOnly } from "../fixtures/deterministic-indexeddb";

const vp = (v: string) => v as VaultPath;
const tok = (v: string) => v as ObservationToken;
const source = (v: Uint8Array): BinaryContentSource => ({
  sizeBytes: v.byteLength, async *openChunks() { yield new Uint8Array(v); },
});
const encode = (s: string) => new TextEncoder().encode(s);
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function collect(content: BinaryContentSource): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  for await (const part of content.openChunks()) parts.push(Uint8Array.from(part));
  return Uint8Array.from(Buffer.concat(parts));
}

// Byte-backed local fixture derived from local-transaction-safety.test.ts.
// The production transactional mutation port is used, not fake effect receipts.
class MemoryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  private readonly versions = new Map<string, number>();
  private readonly listeners = new Set<(change: LocalVaultChange) => void>();
  onRename?: (from: string, to: string) => void;
  constructor(initial: Record<string, Uint8Array> = {}) { for (const [p, v] of Object.entries(initial)) this.files.set(p, new Uint8Array(v)); }
  readonly adapter = {
    exists: async (p: string) => this.files.has(p),
    writeBinary: async (p: string, b: ArrayBuffer) => { this.files.set(p, new Uint8Array(b)); this.bump(p); },
    appendBinary: async (p: string, b: ArrayBuffer) => { const a = this.files.get(p); if (!a) throw new Error("missing append target"); const x = new Uint8Array(b), n = new Uint8Array(a.length + x.length); n.set(a); n.set(x, a.length); this.files.set(p, n); this.bump(p); },
    rename: async (from: string, to: string) => { const v = this.files.get(from); if (!v) throw new Error(`missing rename source ${from}`); this.files.set(to, v); this.files.delete(from); this.bump(from); this.bump(to); this.emit({ kind: "renamed", fromPath: vp(from), toPath: vp(to) }); this.onRename?.(from, to); },
    remove: async (p: string) => { this.files.delete(p); this.bump(p); },
    trashLocal: async (p: string) => { this.files.delete(p); this.bump(p); },
  } as unknown as DataAdapter;
  activeConfigurationDirectory = async () => vp(".cfg");
  async enumerate(): Promise<LocalVaultListing> { const entries: LocalObservation[] = []; for (const p of this.files.keys()) entries.push(await this.observe(vp(p))); return { entries, completeness: { status: "complete" } }; }
  async observe(path: VaultPath): Promise<LocalObservation> { const v = this.files.get(String(path)); return v ? { status: "present", side: "local", path, entityKind: "file", stability: "stable", content: { sizeBytes: v.length, advisoryModifiedTimeMs: 1000 }, observationToken: this.current(path) } : { status: "absent", side: "local", path }; }
  async readFile(path: VaultPath, expected?: ObservationToken): Promise<LocalReadResult> { const v = this.files.get(String(path)); if (!v) throw new Error("missing"); const t = this.current(path); if (expected && expected !== t) throw new Error(`Local observation became stale: ${String(path)}`); return { content: source(v), evidence: { sizeBytes: v.length, advisoryModifiedTimeMs: 1000 }, stability: "stable", observationToken: t }; }
  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { this.files.set(String(path), await collect(content)); this.bump(String(path)); return { path, observationToken: this.current(path) }; }
  async replaceFile(path: VaultPath, content: BinaryContentSource, expected?: ObservationToken): Promise<LocalMutationReceipt> { if (expected && expected !== this.current(path)) throw new Error("stale"); this.files.set(String(path), await collect(content)); this.bump(String(path)); return { path, observationToken: this.current(path) }; }
  createFolder = async (path: VaultPath): Promise<LocalMutationReceipt> => ({ path });
  async move(from: VaultPath, to: VaultPath): Promise<LocalMutationReceipt> { await (this.adapter as any).rename(String(from), String(to)); return { path: to, observationToken: this.current(to) }; }
  async trash(path: VaultPath): Promise<void> { await (this.adapter as any).trashLocal(String(path)); }
  validatePath = async (path: VaultPath): Promise<PathValidationResult> => ({ status: "compatible", normalizedComparisonPath: String(path).toLowerCase() });
  classifyConfiguration = async (): Promise<ConfigurationClassification> => ({ classification: "unknown", reason: "test" });
  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }
  mutateWithoutObservationChange(path: string, v: Uint8Array): void { this.files.set(path, new Uint8Array(v)); }
  emitUserModify(path: string): void { this.bump(path); this.emit({ kind: "modified", path: vp(path) }); }
  private emit(change: LocalVaultChange): void { for (const listener of this.listeners) listener(change); }
  private bump(path: string): void { this.versions.set(path, (this.versions.get(path) ?? 0) + 1); }
  private current(path: VaultPath): ObservationToken { return tok(`${String(path)}|same-size|same-mtime|g${this.versions.get(String(path)) ?? 0}`); }
}

const FOLDER = "application/vnd.google-apps.folder";
const ACCOUNT = "integration-account";
const PATH = vp("note.md");
const ID = contractId<"RemoteObjectId">("stable-file-A") as RemoteObjectId;
const REMOTE: ManagedRemoteIdentity = {
  rootId: contractId<"RemoteObjectId">("integration-root") as RemoteObjectId,
  vaultIdentity: contractId<"VaultIdentity">("integration-vault") as VaultIdentity,
  protocolVersion: contractId<"ProtocolVersion">("1") as ProtocolVersion,
};
const initial = "first\nmiddle\nlast\n";
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => ({
  status, headers: { "content-type": "application/json", ...headers },
  arrayBuffer: encode(JSON.stringify(value)).buffer as ArrayBuffer,
});
type FileMetadata = {
  id: string; name: string; mimeType: string; parents: string[]; trashed: boolean;
  version: string; ownedByMe: boolean; appProperties: Record<string, string>;
  size?: string; sha256Checksum?: string;
};

/** Synthetic HTTP provider; revision, checksum and Changes derive from stored bytes. */
class ByteProvider {
  bytes = encode(initial);
  revision = 1;
  account = ACCOUNT;
  refuseChanges = false;
  readonly seen: Array<{ method: string; path: string; url: string }> = [];
  readonly rejected: string[] = [];
  readonly applied: Array<{ revision: number; hash: string; bytes: number }> = [];
  beforeWrite?: () => Promise<void>;
  private session?: { path: string; size: number };
  get cursor() { return "cursor-" + this.revision; }
  private metadata(): FileMetadata {
    return { id: String(ID), name: String(PATH), mimeType: "text/plain",
      parents: ["integration-content"], trashed: false, version: String(this.revision),
      ownedByMe: true, appProperties: { brainManagedRootId: String(REMOTE.rootId), brainSyncDomain: "content" },
      size: String(this.bytes.byteLength), sha256Checksum: digest(this.bytes) };
  }
  private roots(): FileMetadata[] {
    const folder = (id: string, name: string, parents: string[], appProperties: Record<string, string>): FileMetadata =>
      ({ id, name, parents, mimeType: FOLDER, trashed: false, version: "1", ownedByMe: true, appProperties });
    return [
      folder(String(REMOTE.rootId), "BRAIN Sync", ["root"], { brainSyncRole: "brain-sync-root",
        brainVaultIdentity: String(REMOTE.vaultIdentity), brainProtocolVersion: String(REMOTE.protocolVersion) }),
      folder("integration-content", "vault", [String(REMOTE.rootId)], { brainSyncRole: "brain-sync-content" }),
      folder("integration-config", "__brain_sync_portable_config__", [String(REMOTE.rootId)], { brainSyncRole: "brain-sync-portable-config" }),
    ];
  }
  readonly request: ObsidianGoogleDriveBoundaryOptions["requestUrl"] = async req => {
    const u = new URL(req.url), method = req.method ?? "GET", p = u.pathname;
    this.seen.push({ method, path: p, url: req.url });
    try {
      assert.equal(req.headers?.authorization, "Bearer integration-token");
      assert.equal(u.origin, "https://www.googleapis.com");
      if (method === "PATCH" && p === "/upload/drive/v3/files/" + ID) {
        assert.equal(u.searchParams.get("uploadType"), "resumable");
        assert.equal(typeof req.body, "string");
        assert.deepEqual(JSON.parse(String(req.body)), { name: String(PATH) });
        assert.equal(this.session, undefined, "unexpected parallel upload");
        const size = Number(req.headers?.["x-upload-content-length"]);
        assert.ok(Number.isSafeInteger(size) && size > 0);
        await this.beforeWrite?.();
        const path = "/upload-session/" + this.revision;
        this.session = { path, size };
        return json({}, 200, { location: u.origin + path });
      }
      if (method === "PUT" && this.session?.path === p) {
        const session = this.session;
        assert.ok(req.body instanceof ArrayBuffer, "content PUT must contain actual bytes");
        const bytes = new Uint8Array(req.body);
        assert.equal(bytes.byteLength, session.size);
        assert.equal(req.headers?.["content-range"], "bytes 0-" + (session.size - 1) + "/" + session.size);
        this.bytes = Uint8Array.from(bytes);
        this.revision++;
        this.applied.push({ revision: this.revision, hash: digest(this.bytes), bytes: this.bytes.byteLength });
        this.session = undefined;
        return json(this.metadata());
      }
      assert.equal(method, "GET", "existing-file update must not create, trash, replace or delete");
      if (p === "/drive/v3/about") return json({ user: { permissionId: this.account } });
      if (p === "/drive/v3/changes/startPageToken") return json({ startPageToken: this.cursor });
      if (p === "/drive/v3/changes") {
        if (this.refuseChanges) return json({ error: { message: "unavailable Changes" } }, 503);
        const token = /^cursor-(\d+)$/.exec(u.searchParams.get("pageToken") ?? "");
        assert.ok(token);
        const prior = Number(token[1]);
        assert.ok(prior >= 1 && prior <= this.revision);
        return json({ changes: prior === this.revision ? [] :
          [{ fileId: String(ID), removed: false, file: this.metadata() }], newStartPageToken: this.cursor });
      }
      const all = [...this.roots(), this.metadata()];
      if (p.startsWith("/drive/v3/files/")) {
        const id = decodeURIComponent(p.slice("/drive/v3/files/".length));
        if (u.searchParams.get("alt") === "media") {
          assert.equal(id, String(ID));
          const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers?.range ?? "");
          assert.ok(range, "download must use bounded range");
          const first = Number(range[1]), last = Math.min(Number(range[2]), this.bytes.length - 1);
          assert.ok(first <= last);
          return { status: 206, headers: { "content-type": "application/octet-stream",
            "content-range": "bytes " + first + "-" + last + "/" + this.bytes.length },
            arrayBuffer: Uint8Array.from(this.bytes.slice(first, last + 1)).buffer as ArrayBuffer };
        }
        const file = all.find(x => x.id === id);
        return file ? json(file) : json({ error: { message: "not found" } }, 404);
      }
      if (p === "/drive/v3/files") {
        const q = u.searchParams.get("q") ?? "";
        const parent = /^'([^']+)' in parents/.exec(q);
        const name = /(?:^| and )name='([^']+)'/.exec(q);
        const role = /appProperties has \{ key='brainSyncRole' and value='([^']+)' \}/.exec(q);
        const marker = /^appProperties has \{ key='brainManagedRootId' and value='([^']+)' \} and trashed=false$/.exec(q);
        assert.ok(parent || marker, "unexpected list query " + q);
        assert.equal(u.searchParams.has("pageToken"), false);
        const files = all.filter(x => (!parent || x.parents.includes(parent[1]!)) &&
          (!marker || x.appProperties.brainManagedRootId === marker[1]) &&
          (!name || x.name === name[1]) && (!role || x.appProperties.brainSyncRole === role[1]));
        return json({ files, incompleteSearch: false });
      }
      throw new Error("unexpected provider path " + p);
    } catch (e) {
      this.rejected.push(method + " " + p + ": " + String(e));
      throw e;
    }
  };
}

async function device(provider: ByteProvider, seed: number) {
  const deviceIdentity = generateDeviceIdentity(bytes => bytes.fill(seed));
  const dbName = "integration-device-" + seed;
  const factory = new FakeDatabase(true).openFactory();
  const local = new MemoryLocal();
  const textPersistence = new MemoryTextVersionPersistence();
  const leasePort = new InMemoryRunLeasePort();
  await new IndexedDbInventoryObservationStore(dbName, factory, { allowSchemaUpgrade: true }).continuityRootHint();
  const newRaw = () => new PersistentSynchronizationStateStore(new IndexedDbInventoryAwareStateByteStorage(dbName, factory));
  assert.equal((await newRaw().saveTrusted(createInitialAuthorityState({
    persistenceRevision: contractId<"StateRevision">("state:1") as PersistenceRevision,
    semanticGeneration: contractId<"SemanticStateGeneration">("semantic:1") as SemanticStateGeneration,
    vaultIdentity: REMOTE.vaultIdentity, deviceIdentity,
  }))).status, "saved");

  async function open() {
    const raw = newRaw(), state = new SynchronizationStateAuthorityAdapter(raw);
    const context = { expectation: "existing-pairing" as const,
      expectedVaultIdentity: REMOTE.vaultIdentity, expectedDeviceIdentity: deviceIdentity };
    const loaded = await state.load(context);
    if (loaded.status !== "trusted") throw new Error("untrusted device initialization: " + loaded.status);
    let firstSync = !loaded.state.changeCursor, recoveryActive = false;
    const secrets = new Map<string, string>([
      ["brain-gdrive-paired-account", ACCOUNT],
      ["brain-gdrive-oauth-tokens", JSON.stringify({ accessToken: "integration-token",
        expiresAtMs: Date.now() + 86400000, tokenType: "Bearer",
        scope: "https://www.googleapis.com/auth/drive.file", inventoryGrantEpoch: "b".repeat(32) })],
    ]);
    const boundary = createObsidianGoogleDriveBoundary({
      oauth: { clientId: "synthetic-integration", redirectUri: "https://callback.invalid" },
      managedRemoteIdentity: () => REMOTE,
      secretStorage: { getSecret: key => secrets.get(key) ?? null, setSecret: (key, value) => { secrets.set(key, value); } },
      retryPolicy: { maxAttempts: 1, maxConcurrency: 1, baseDelayMs: 0, maxDelayMs: 0 },
      requestUrl: provider.request,
    });
    const scope = new ProductPathScope(await local.activeConfigurationDirectory(), () => ({ userExclusionPatterns: [] }));
    const canonicalLocal = new CanonicalEvidenceLocalVault(new ScopedLocalVault(local, scope),
      { staleRetryDelayMs: 0 }, new ScopedLocalTransactionalMutationPort(local.adapter, local, scope));
    const inventory = new IndexedDbInventoryObservationStore(dbName, factory, { allowSchemaUpgrade: false });
    const fingerprint = () => {
      const grant = boundary.oauth.inventoryGrantBinding();
      assert.ok(grant);
      return inventoryContinuityFingerprint(grant, scope.inventoryScopeFingerprint());
    };
    const observePlanningBoundary = async () => {
      const policy = fingerprint(), prior = await inventory.continuityRootHint();
      const knownDomains = prior && prior.deviceIdentity === deviceIdentity &&
        prior.vaultIdentity === REMOTE.vaultIdentity && prior.managedRootId === REMOTE.rootId &&
        prior.protocolVersion === REMOTE.protocolVersion && prior.scopePolicyFingerprint === policy
        ? { contentRootId: prior.contentDomainRootId, configRootId: prior.configDomainRootId } : undefined;
      const observed = await buildInventoryPlanningBoundary({ drive: boundary.drive, remoteIdentity: REMOTE,
        deviceIdentity, vaultIdentity: REMOTE.vaultIdentity, scopePolicyFingerprint: policy, knownDomains });
      assert.equal(fingerprint(), policy);
      return observed;
    };
    const snapshots = new InventoryBackedSnapshotAssembler({
      local: canonicalLocal, drive: boundary.drive, state, stateContext: context,
      remoteIdentity: async () => REMOTE, inventory, currentFence: async () => (await observePlanningBoundary()).fence,
      observePlanningBoundary, observePlanningHorizon: async () => {
        const policy = fingerprint(), horizon = await boundary.drive.observeInventoryPlanningHorizon();
        if (!horizon.ok) throw new Error("inventory horizon unavailable");
        assert.equal(fingerprint(), policy);
        return { ...horizon.value, scopePolicyFingerprint: policy };
      },
      refresh: new VerifiedInventoryBaselineCoordinator(boundary.metadataReader, inventory),
      provenanceReader: boundary.metadataReader, pathIncluded: path => scope.isManagedLogical(path),
      fullReconcileRequired: () => firstSync, reliableChanges: boundary.drive, authorityStore: state,
    });
    const versions = new ProductTextVersionStore(textPersistence, canonicalLocal, boundary.drive);
    const conflicts = new ThreeWayConflictResolver(versions, versions, deviceIdentity);
    let controller!: ProductController;
    const executor = new ProductSynchronizationExecutor(canonicalLocal, boundary.drive, state, context,
      () => controller.currentRunEvidence(), versions);
    controller = new ProductController({
      vaultIdentity: REMOTE.vaultIdentity, deviceIdentity, stateContext: context, stateStore: state, authorityStore: state,
      snapshotAssembler: snapshots, executor, conflictResolver: conflicts,
      reliableRemoteMutationPort: boundary.drive, localTransactionalMutationPort: canonicalLocal,
      remoteFolderCreateRecoveryReadPort: boundary.drive,
      plannerForTrigger: trigger => new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger })),
      leasePort, audit: new BoundedAuditHistory(new MemoryAuditPersistence()), holderId: dbName,
      firstSyncActive: () => firstSync, inventoryContinuityEnabled: () => true,
      automaticExecutionAllowed: () => ({ allowed: !firstSync }),
      onTrustedBaselineEstablished: async () => { firstSync = false; },
      recoveryActive: () => recoveryActive, onRecoveryGateChanged: async active => { recoveryActive = active; },
      onFullReconciliationCompleted: async () => undefined,
    });
    return { controller, raw, inventory, local, deviceIdentity };
  }
  return { open, local };
}
type Device = Awaited<ReturnType<Awaited<ReturnType<typeof device>>["open"]>>;
async function authority(d: Device) {
  const result = await d.raw.loadAuthority();
  if (result.status !== "trusted") throw new Error("canonical authority unavailable: " + result.status);
  return result.state;
}
async function run(d: Device, initialRun = false) {
  const before = d.controller.latestProductionRunReceipt()?.runId;
  const manual = initialRun ? await d.controller.previewVerifyReconcile() : undefined;
  if (initialRun) {
    assert.ok(manual, JSON.stringify(d.controller.currentSurface().status));
    assert.equal((await d.controller.requestPreviewAction({ kind: "execute-plan", planId: manual.planId })).status, "accepted");
  } else await d.controller.runAutomatic("local-change");
  const receipt = d.controller.latestProductionRunReceipt();
  assert.ok(receipt, JSON.stringify(d.controller.currentSurface().status));
  assert.notEqual(receipt.runId, before);
  assert.equal(receipt.terminal, "complete", JSON.stringify({ status: d.controller.currentSurface().status, receipt }));
  assert.equal(receipt.requiredEffectsCommittedAndVerified, true);
  const plan = manual ?? d.controller.currentSurface().planPreview;
  assert.ok(plan && plan.planId === receipt.planId);
  assert.equal(receipt.committedOperationCount, plan.operations.length);
  return plan.operations.filter(op => op.kind !== "noop").map(op => op.kind);
}
async function stateProof(d: Device, provider: ByteProvider, expected: string) {
  const state = await authority(d);
  assert.equal(state.changeCursor, provider.cursor);
  assert.equal(state.deviceIdentity, d.deviceIdentity);
  const base = state.base.find(x => x.path === PATH);
  assert.ok(base && base.localExisted && base.remoteExisted);
  assert.equal(base.remoteObjectId, ID);
  assert.equal(base.content?.hash, "sha256:" + digest(encode(expected)));
  assert.equal(state.remoteMappings.find(x => x.path === PATH)?.remoteObjectId, ID);
  for (const intent of state.operationIntents) {
    assert.ok(intent.effects.every(effect => effect.stage === "state-committed"));
    assert.equal(intent.semanticAuthority.generation, state.semanticGeneration);
  }
  const fence = await d.inventory.continuityRootHint(); assert.ok(fence);
  assert.equal(fence.deviceIdentity, d.deviceIdentity);
  const publication = await d.inventory.publicationSnapshot(fence);
  if (publication.status !== "trusted-fence") throw new Error("inventory publication untrusted: " + publication.status);
  assert.ok(publication.value.activeGeneration);
  assert.equal(publication.value.canonicalCursor, state.changeCursor);
  assert.equal(publication.value.activeManifest?.terminalCursor, state.changeCursor);
  assert.equal(publication.value.persistenceRevision, state.persistenceRevision);
  assert.equal(publication.value.semanticGeneration, state.semanticGeneration);
  const lease = await d.inventory.openRead();
  if (lease.status !== "verified-observation") throw new Error("inventory lease unavailable: " + lease.status);
  try {
    const observed = await lease.value.getById(ID);
    assert.equal(observed.status, "verified-observation");
    assert.ok(observed.value);
    assert.equal(observed.value.remoteObjectId, ID);
    assert.equal(observed.value.revision, String(provider.revision));
    assert.equal(observed.value.content?.hash, "sha256:" + digest(encode(expected)));
    assert.equal(observed.value.content?.sizeBytes, encode(expected).byteLength);
  } finally { await lease.value.release(); }
  assert.deepEqual(d.local.files.get(String(PATH)), encode(expected));
}
async function edit(d: Device, value: string) {
  await d.local.replaceFile(PATH, source(encode(value)));
  d.local.emitUserModify(String(PATH));
}
async function update(d: Device, provider: ByteProvider, expected: string, kind: "upload-update" | "clean-text-merge") {
  const start = provider.seen.length, revision = provider.revision, effects = provider.applied.length;
  let intentObserved = false;
  provider.beforeWrite = async () => {
    const state = await authority(d);
    assert.ok(state.operationIntents.some(intent => intent.effects.some(effect => effect.stage === "dispatch-authorized")),
      "durable dispatch authorization must precede HTTP mutation");
    intentObserved = true;
  };
  try { assert.deepEqual(await run(d), [kind]); }
  finally { provider.beforeWrite = undefined; }
  assert.ok(intentObserved);
  assert.equal(provider.revision, revision + 1);
  assert.deepEqual(provider.bytes, encode(expected));
  assert.deepEqual(provider.applied.slice(effects), [{ revision: revision + 1, hash: digest(encode(expected)), bytes: encode(expected).byteLength }]);
  const requests = provider.seen.slice(start);
  const patch = requests.findIndex(x => x.method === "PATCH");
  const put = requests.findIndex(x => x.method === "PUT");
  assert.ok(patch > 0 && put > patch);
  assert.equal(requests[patch]!.path, "/upload/drive/v3/files/" + ID);
  assert.ok(requests.slice(0, patch).some(x => x.method === "GET" && x.path === "/drive/v3/files/" + ID && !x.url.includes("alt=media")));
  assert.ok(requests.slice(put + 1).some(x => x.method === "GET" && x.path === "/drive/v3/files/" + ID && !x.url.includes("alt=media")));
  assert.deepEqual(requests.filter(x => x.method !== "GET").map(x => x.method), ["PATCH", "PUT"]);
  const state = await authority(d);
  assert.equal(state.base.find(x => x.path === PATH)?.content?.hash, "sha256:" + digest(encode(expected)));
  assert.equal(state.base.find(x => x.path === PATH)?.remoteObjectId, ID);
  assert.ok(state.operationIntents.every(intent => intent.effects.every(effect => effect.stage === "state-committed")));
}

test("DEC339 final integration: controller HTTP same-ID update, durable Changes, reverse and clean merge", async () => {
  withRangeOnly();
  const provider = new ByteProvider();
  const backingA = await device(provider, 1), backingB = await device(provider, 2);
  let a = await backingA.open(); const b = await backingB.open();
  try {
    await run(a, true); await run(b, true);
    await run(a); await run(b);
    await stateProof(a, provider, initial); await stateProof(b, provider, initial);
    assert.notEqual(a.deviceIdentity, b.deviceIdentity);
    assert.equal(provider.applied.length, 0);
    const one = "changed-first\nmiddle\nlast\n";
    await edit(a, one); await update(a, provider, one, "upload-update");
    await run(a); assert.deepEqual(await run(b), ["download-update"]);
    await stateProof(a, provider, one); await stateProof(b, provider, one);
    const two = "changed-first\nmiddle\nchanged-last\n";
    await edit(b, two); await update(b, provider, two, "upload-update");
    await run(b);
    // Reconstruct the controller, adapter and stores without resetting durable device state.
    await a.controller.beginRuntimeDisposal();
    a = await backingA.open();
    assert.deepEqual(await run(a), ["download-update"]);
    await stateProof(a, provider, two); await stateProof(b, provider, two);
    await edit(a, "merged-first\nmiddle\nchanged-last\n");
    await edit(b, "changed-first\nmiddle\nmerged-last\n");
    await update(a, provider, "merged-first\nmiddle\nchanged-last\n", "upload-update");
    const merged = "merged-first\nmiddle\nmerged-last\n";
    await update(b, provider, merged, "clean-text-merge");
    await run(b); assert.deepEqual(await run(a), ["download-update"]);
    await stateProof(a, provider, merged); await stateProof(b, provider, merged);
    const effectCount = provider.applied.length;
    assert.deepEqual(await run(a), []); assert.deepEqual(await run(b), []);
    assert.equal(effectCount, 4);
    assert.equal(provider.applied.length, effectCount);
    assert.deepEqual(provider.rejected, []);
    assert.equal(provider.seen.some(x => x.method === "POST" || x.method === "DELETE" || x.path.includes("generateIds")), false);
  } finally { await a.controller.beginRuntimeDisposal(); await b.controller.beginRuntimeDisposal(); }
});
