import { performance } from "node:perf_hooks";
import { ProductionSynchronizationPlanner } from "../../src/core/production-planner";
import { buildInventoryPlanningBoundary, buildInventoryPlanningFence, selectPlanningAssembler } from "../../src/product/inventory-planning-cutover";
import { ProductPathScope } from "../../src/product/path-scope";
import { SynchronizationStateAuthorityAdapter } from "../../src/product/synchronization-adapters";
import { IndexedDbInventoryAwareStateByteStorage } from "../../src/state/indexeddb-inventory-authority-storage";
import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  inventoryContinuityFingerprint,
  type ChangeCursor,
  type ContentHash,
  type DeviceIdentity,
  type InventoryGeneration,
  type InventoryIdentityFence,
  type PersistenceRevision,
  type ProtocolVersion,
  type RemoteIngestionBatchId,
  type SemanticStateGeneration,
  type VaultIdentity,
  type VaultPath,
} from "../../src/contracts";
import { DeterministicSynchronizationPlanner } from "../../src/core/planner";
import { ThreeWayConflictResolver } from "../../src/core/conflict-resolver";
import { GoogleOAuthSession } from "../../src/drive/auth";
import { createObsidianGoogleDriveBoundary } from "../../src/drive/runtime";
import { InventoryBackedSnapshotAssembler } from "../../src/product/inventory-backed-snapshot-assembler";
import { ProductSnapshotAssembler } from "../../src/product/snapshot-assembler";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import { IndexedDbStateByteStorage } from "../../src/state/indexeddb-state-storage";
import {
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
} from "../../src/state/persistent-state-store";
import { VerifiedInventoryBaselineCoordinator } from "../../src/state/verified-inventory-integration";
import { FakeDatabase, withRangeOnly } from "../fixtures/dec339-inventory-idb-fixtures";

const FOLDER = "application/vnd.google-apps.folder";
const vault = contractId<"VaultIdentity">("vault:step4") as VaultIdentity;
const device = contractId<"DeviceIdentity">("device:step4") as DeviceIdentity;
const root = contractId<"RemoteObjectId">("root");
const contentRoot = contractId<"RemoteObjectId">("content");
const configRoot = contractId<"RemoteObjectId">("config");
const protocol = contractId<"ProtocolVersion">("1") as ProtocolVersion;
const notePath = contractId<"VaultPath">("alpha.md") as VaultPath;
const noteId = contractId<"RemoteObjectId">("stable-alpha");
const rev = (value: string) => contractId<"StateRevision">(value) as PersistenceRevision;
const sem = (value: string) => contractId<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const gen = (value: string) => value as InventoryGeneration;
const batch = (value: string) =>
  contractId<"RemoteIngestionBatchId">(value) as RemoteIngestionBatchId;

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string): string | null { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string): void { this.values.set(id, value); }
  deleteSecret(id: string): void { this.values.delete(id); }
}

interface ServerFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly parents: string[];
  readonly trashed: boolean;
  readonly version?: string;
  readonly size?: string;
  readonly sha256Checksum?: string;
  readonly appProperties: Record<string, string>;
}

class ObservationServer {
  private version = 1;
  private hash = "11".repeat(32);
  private token = "changes:step4:0";
  private changes: Array<{ fileId: string; removed: boolean; file: ServerFile }> = [];
  private readonly extra: ServerFile[];
  domainFault: "none" | "partial" | "duplicate" | "exact" | "repeated" = "none";
  account = "permission-step4";
  constructor(extraFiles = 0, private readonly personalOwned = false) {
    const folder: ServerFile = { id: "nested-folder", name: "nested", mimeType: FOLDER,
      parents: [String(contentRoot)], trashed: false, version: "1",
      appProperties: { brainManagedRootId: String(root), brainSyncDomain: "content" } };
    this.extra = extraFiles === 0 ? [] : [folder, ...Array.from({ length: extraFiles }, (_, i) => ({
      id: "extra-" + i, name: "note-" + i + ".md", mimeType: "text/plain",
      parents: [folder.id], trashed: false, version: "1", size: "5",
      sha256Checksum: "11".repeat(32), appProperties: {
        brainManagedRootId: String(root), brainSyncDomain: "content",
      },
    }))];
  }
  extraBaseline() {
    return this.extra.map(file => ({
      path: contractId<"VaultPath">(file.mimeType === FOLDER ? file.name : "nested/" + file.name) as VaultPath,
      entityKind: file.mimeType === FOLDER ? "folder" as const : "file" as const,
      localExisted: true, remoteExisted: true,
      remoteObjectId: contractId<"RemoteObjectId">(file.id),
      content: file.mimeType === FOLDER ? undefined : {
        hash: contractId<"ContentHash">("sha256:" + file.sha256Checksum) as ContentHash,
        revision: file.version, sizeBytes: Number(file.size),
      },
    }));
  }
  readonly calls: Array<{ readonly url: string; readonly method: string }> = [];

  private rootFile(): ServerFile {
    return {
      id: String(root), name: "BRAIN Sync", mimeType: FOLDER, parents: ["drive-root"],
      trashed: false,
      appProperties: {
        brainSyncRole: "brain-sync-root",
        brainVaultIdentity: String(vault),
        brainProtocolVersion: String(protocol),
      },
    };
  }

  private contentFile(): ServerFile {
    return {
      id: String(contentRoot), name: "vault", mimeType: FOLDER, parents: [String(root)],
      trashed: false, appProperties: { brainSyncRole: "brain-sync-content" },
    };
  }

  private configFile(): ServerFile {
    return {
      id: String(configRoot), name: "__brain_sync_portable_config__", mimeType: FOLDER,
      parents: [String(root)], trashed: false,
      appProperties: { brainSyncRole: "brain-sync-portable-config" },
    };
  }

  note(): ServerFile {
    return {
      id: String(noteId), name: String(notePath), mimeType: "text/plain",
      parents: [String(contentRoot)], trashed: false,
      version: String(this.version), size: String(this.version === 1 ? 5 : 9),
      sha256Checksum: this.hash,
      appProperties: {
        brainManagedRootId: String(root),
        brainSyncDomain: "content",
      },
    };
  }

  currentCursor(): ChangeCursor {
    return contractId<"ChangeCursor">(this.token) as ChangeCursor;
  }

  currentContent() {
    return {
      hash: contractId<"ContentHash">("sha256:" + this.hash) as ContentHash,
      revision: String(this.version),
      sizeBytes: this.version === 1 ? 5 : 9,
    };
  }

  advanceSameId(): void {
    this.version = 2;
    this.hash = "22".repeat(32);
    this.token = "changes:step4:1";
    this.changes = [{ fileId: String(noteId), removed: false, file: this.note() }];
  }

  private normalize(url: string): string {
    return decodeURIComponent(url).replace(/\+/g, " ");
  }

  private response(body: unknown, status = 200) {
    const bytes = new TextEncoder().encode(JSON.stringify(body, (_key, value: unknown) =>
      this.personalOwned && value && typeof value === "object" && !Array.isArray(value) &&
      "id" in value && "mimeType" in value && "parents" in value
        ? { ...value, ownedByMe: true } : value));
    return Promise.resolve({
      status,
      headers: { "content-type": "application/json" },
      arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });
  }

  async request(request: { readonly url: string; readonly method?: string }) {
    const method = request.method ?? "GET";
    this.calls.push({ url: request.url, method });
    const normalized = this.normalize(request.url);
    const url = new URL(request.url);

    if (normalized.includes("/drive/v3/about?"))
      return this.response({ user: { permissionId: this.account } });
    if (normalized.includes("/drive/v3/changes/startPageToken"))
      return this.response({ startPageToken: this.token });
    if (normalized.includes("/drive/v3/changes?")) {
      const requested = url.searchParams.get("pageToken");
      if (requested === this.token)
        return this.response({ changes: [], newStartPageToken: this.token });
      if (requested === "changes:step4:0" && this.token === "changes:step4:1")
        return this.response({ changes: [...this.changes], newStartPageToken: this.token });
      throw new Error("unexpected synthetic Changes cursor");
    }

    if (normalized.includes("/drive/v3/files/root?")) return this.response(this.rootFile());
    if (normalized.includes("/drive/v3/files/content?")) return this.response(this.contentFile());
    if (normalized.includes("/drive/v3/files/config?")) return this.response(this.domainFault === "exact" ? { ...this.configFile(), parents: ["different-root"] } : this.configFile());
    if (normalized.includes("/drive/v3/files/stable-alpha?")) return this.response(this.note());
    const extra = this.extra.find(file => url.pathname === "/drive/v3/files/" + file.id);
    if (extra) return this.response(extra);

    if (url.pathname === "/drive/v3/files") {
      const q = this.normalize(url.searchParams.get("q") ?? "");
      if (q.includes("'root' in parents") && q.includes("brain-sync-content")) {
        if (this.domainFault === "partial") return this.response({ files: [this.contentFile()], incompleteSearch: true });
        if (this.domainFault === "duplicate") return this.response({ files: [this.contentFile(), { ...this.contentFile(), id: "duplicate-content" }], incompleteSearch: false });
        if (this.domainFault === "repeated") return this.response({ files: [], incompleteSearch: false, nextPageToken: "loop" });
        return this.response({ files: [this.contentFile()], incompleteSearch: false });
      }
      if (q.includes("'root' in parents") && q.includes("__brain_sync_portable_config__"))
        return this.response({ files: [this.configFile()], incompleteSearch: false });
      if (q.includes("'content' in parents") && q.includes("__brain_sync_portable_config__"))
        return this.response({ files: [], incompleteSearch: false });
      if (q.includes("'content' in parents"))
        return this.response({ files: [this.note(), ...this.extra.filter(file => file.parents[0] === "content")], incompleteSearch: false });
      if (q.includes("'nested-folder' in parents"))
        return this.response({ files: this.extra.filter(file => file.parents[0] === "nested-folder"), incompleteSearch: false });
      if (q.includes("'config' in parents"))
        return this.response({ files: [], incompleteSearch: false });
      if (q.includes("brainManagedRootId")) {
        const files = [this.note(), ...this.extra];
        const offset = Number(url.searchParams.get("pageToken") ?? "0");
        const next = offset + 25;
        return this.response({ files: files.slice(offset, next), incompleteSearch: false,
          ...(next < files.length ? { nextPageToken: String(next) } : {}) });
      }
    }
    throw new Error("unexpected Step-4 request: " + method + " " + request.url);
  }
}

async function environment() {
  withRangeOnly();
  const server = new ObservationServer();
  const secrets = new MemorySecrets();
  secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "step4-active",
    refreshToken: "step4-refresh",
    expiresAtMs: Date.now() + 5 * 60_000,
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file",
  }));
  secrets.setSecret("brain-gdrive-paired-account", "permission-step4");

  const boundary = createObsidianGoogleDriveBoundary({
    oauth: { clientId: "step4", redirectUri: "https://callback.invalid" },
    secretStorage: secrets,
    requestUrl: request => server.request(request),
    managedRemoteIdentity: () => ({
      rootId: root, vaultIdentity: vault, protocolVersion: protocol,
    }),
  });
  const accountKey = await boundary.drive.pairedInventoryAccountKey();
  assert.ok(accountKey);
  assert.match(accountKey, /^sha256:[0-9a-f]{64}$/);
  assert.notEqual(accountKey, "permission-step4");

  const observedRoots = await boundary.drive.observeManagedDomainRootIds({
    rootId: root, vaultIdentity: vault, protocolVersion: protocol,
  });
  assert.equal(observedRoots.ok, true);
  if (observedRoots.ok) {
    assert.equal(observedRoots.value.contentRootId, contentRoot);
    assert.equal(observedRoots.value.configRootId, configRoot);
  }

  const fence: InventoryIdentityFence = {
    vaultIdentity: vault,
    deviceIdentity: device,
    pairedAccountKey: accountKey,
    managedRootId: root,
    protocolVersion: protocol,
    contentDomainRootId: contentRoot,
    configDomainRootId: configRoot,
    scopePolicyFingerprint: "scope:step4",
    inventorySchemaVersion: 1,
  };

  const factory = new FakeDatabase().openFactory();
  const bytes = new IndexedDbStateByteStorage("device:step4:test", factory);
  const stateStore = new PersistentSynchronizationStateStore(bytes);
  const initial = createInitialAuthorityState({
    persistenceRevision: rev("state:step4:1"),
    semanticGeneration: sem("semantic:step4:1"),
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  assert.equal((await stateStore.saveTrusted(initial)).status, "saved");
  const inventory = new IndexedDbInventoryObservationStore("device:step4:test", factory);
  const coordinator = new VerifiedInventoryBaselineCoordinator(boundary.metadataReader, inventory);
  assert.equal((await coordinator.publishBaseline(fence, gen("step4:g0"))).status, "published");

  const local = {
    enumerate: async () => ({
      entries: [{
        status: "present" as const,
        side: "local" as const,
        path: notePath,
        entityKind: "file" as const,
        stability: "stable" as const,
        content: server.currentContent(),
      }],
      completeness: { status: "complete" as const },
    }),
  };
  const stateContext = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const remoteIdentity = async () => ({
    rootId: root, vaultIdentity: vault, protocolVersion: protocol,
  });
  const ordinary = () => new ProductSnapshotAssembler(
    local as never, boundary.drive, stateStore, stateContext, remoteIdentity,
  );
  const inventoryBacked = (currentFence: () => Promise<InventoryIdentityFence> = async () => fence) =>
    new InventoryBackedSnapshotAssembler({
      local: local as never,
      drive: boundary.drive,
      state: stateStore,
      stateContext,
      remoteIdentity,
      inventory,
      currentFence,
      provenanceReader: boundary.metadataReader,
    });
  return { server, boundary, fence, stateStore, inventory, coordinator, ordinary, inventoryBacked };
}

function planner() {
  return new DeterministicSynchronizationPlanner(new ThreeWayConflictResolver({
    readText: async version => version.content?.revision,
  }));
}

async function assertParity(env: Awaited<ReturnType<typeof environment>>): Promise<void> {
  const inventoryAssembly = await env.inventoryBacked().assemble();
  const ordinaryAssembly = await env.ordinary().assembleFull();
  assert.deepEqual(inventoryAssembly.input.snapshots, ordinaryAssembly.input.snapshots);
  assert.deepEqual(inventoryAssembly.input.state, ordinaryAssembly.input.state);
  assert.equal(inventoryAssembly.nextCursor, ordinaryAssembly.nextCursor);
  const inventoryPlan = await planner().plan(inventoryAssembly.input);
  const ordinaryPlan = await planner().plan(ordinaryAssembly.input);
  assert.deepEqual(inventoryPlan, ordinaryPlan);
}

test("DEC339 Step 4 exact production boundary yields snapshot and plan parity before and after same-ID Changes publication", async () => {
  const env = await environment();
  await assertParity(env);

  env.server.advanceSameId();
  assert.equal((await env.coordinator.publishIncremental(
    env.fence,
    gen("step4:g1"),
    batch("step4:batch:1"),
  )).status, "published");

  await assertParity(env);
  const read = await env.inventory.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status === "verified-observation") {
    const entity = await read.value.getById(noteId);
    assert.equal(entity.status, "verified-observation");
    assert.ok(entity.value);
    assert.equal(entity.value.remoteObjectId, noteId);
    assert.equal(entity.value.revision, "2");
    assert.equal(entity.value.content?.hash, "sha256:" + "22".repeat(32));
    await read.value.release();
  }

  assert.equal(env.server.calls.some(call => call.method !== "GET"), false,
    "observation-only Step 4 must not dispatch provider mutations");
  assert.equal(env.server.calls.some(call => call.url.includes("/drive/v3/about")), true,
    "production paired-account boundary must participate in the comparison chain");
});

test("DEC339 Step 4 wrong-fence uncertainty blocks ordinary enabled planning; explicit full remains independent", async () => {
  const env = await environment();
  const wrongFence = { ...env.fence, pairedAccountKey: "sha256:" + "0".repeat(64) };
  await assert.rejects(env.inventoryBacked(async () => wrongFence).assemble(), /metadata-enabled synchronization blocked/);
  const explicit = await env.inventoryBacked(async () => wrongFence).assembleFull();
  const ordinary = await env.ordinary().assembleFull();
  assert.deepEqual(explicit.input.snapshots, ordinary.input.snapshots);
  assert.deepEqual(await planner().plan(explicit.input), await planner().plan(ordinary.input));
});

test("DEC339 Step 4 partial fresh LOCAL observation remains uncertainty on both observation paths", async () => {
  const env = await environment();
  const partialLocal = {
    enumerate: async () => ({
      entries: [],
      completeness: { status: "partial" as const, reason: "step4-local-read-interrupted" },
    }),
  };
  const stateContext = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const remoteIdentity = async () => ({
    rootId: root, vaultIdentity: vault, protocolVersion: protocol,
  });
  const inventoryAssembly = await new InventoryBackedSnapshotAssembler({
    local: partialLocal as never,
    drive: env.boundary.drive,
    state: env.stateStore,
    stateContext,
    remoteIdentity,
    inventory: env.inventory,
    currentFence: async () => env.fence,
    provenanceReader: env.boundary.metadataReader,
  }).assemble();
  const ordinaryAssembly = await new ProductSnapshotAssembler(
    partialLocal as never,
    env.boundary.drive,
    env.stateStore,
    stateContext,
    remoteIdentity,
  ).assembleFull();

  assert.deepEqual(inventoryAssembly.input.snapshots, ordinaryAssembly.input.snapshots);
  const snapshot = inventoryAssembly.input.snapshots.find(item => item.path === notePath);
  assert.equal(snapshot?.local.status, "unknown");
  const inventoryPlan = await planner().plan(inventoryAssembly.input);
  const ordinaryPlan = await planner().plan(ordinaryAssembly.input);
  assert.deepEqual(inventoryPlan, ordinaryPlan);
  assert.equal(inventoryPlan.operations.some(operation => operation.kind === "trash-remote"), false);
});

/**
 * Step 6 BU-01 prerequisite: independent paired observations using shipping
 * production composition, not a surrogate inventory flag or planner. The
 * provider boundary and IndexedDB are synthetic; no real Google traffic.
 * Explicit setup is measured separately; it is not a shipping migration.
 */
type RequestClass = "account" | "startCursor" | "changes" | "exactId" |
  "parentListing" | "markedCensus" | "other";
const requestClasses: readonly RequestClass[] = [
  "account", "startCursor", "changes", "exactId", "parentListing", "markedCensus", "other",
];
function requestClass(raw: string): RequestClass {
  const url = new URL(raw);
  if (url.pathname === "/drive/v3/about") return "account";
  if (url.pathname === "/drive/v3/changes/startPageToken") return "startCursor";
  if (url.pathname === "/drive/v3/changes") return "changes";
  if (url.pathname.startsWith("/drive/v3/files/")) return "exactId";
  if (url.pathname === "/drive/v3/files") {
    const q = url.searchParams.get("q") ?? "";
    if (q.includes("brainManagedRootId")) return "markedCensus";
    if (q.includes(" in parents")) return "parentListing";
  }
  return "other";
}
function physicalTreeRead(raw: string): boolean {
  const url = new URL(raw);
  const q = url.searchParams.get("q") ?? "";
  return url.pathname === "/drive/v3/files" &&
    (q.includes("'content' in parents") || q.includes("'config' in parents") || q.includes("'nested-folder' in parents"));
}
type BoundarySample = { readonly purpose: RequestClass; readonly ms: number;
  readonly physicalTree: boolean; readonly method: string; readonly sharedAncestor: boolean;
  readonly responsePayloadBytes: number; readonly requestUrlUtf8Bytes: number };
function logicalBytes(db: FakeDatabase, authority: boolean): number {
  let total = 0;
  for (const [name, table] of db.tables) {
    if ((name === "sync-state") !== authority) continue;
    for (const [key, value] of table.records) {
      total += Buffer.byteLength(key, "utf8");
      total += value instanceof Uint8Array ? value.byteLength :
        Buffer.byteLength(JSON.stringify(value) ?? "null", "utf8");
    }
  }
  return total;
}

async function pairedEnvironment(enabled: boolean, establish = enabled, extraFiles = 0, continuity = false) {
  withRangeOnly();
  const server = new ObservationServer(extraFiles, continuity);
  const extraBase = server.extraBaseline();
  const samples: BoundarySample[] = [];
  const db = new FakeDatabase();
  const factory = db.openFactory();
  const databaseName = "step6:isolated";
  const raw = new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage(databaseName, factory),
  );
  const state = new SynchronizationStateAuthorityAdapter(raw);
  const remote = { rootId: root, vaultIdentity: vault, protocolVersion: protocol };
  const context = {
    expectation: "existing-pairing" as const,
    expectedVaultIdentity: vault, expectedDeviceIdentity: device,
  };
  let localContent = server.currentContent();
  const originalContent = localContent;
  let localReads = 0;
  let partialLocal = false;
  let inventoryConstructions = 0;
  let scopeExclusions: string[] = [];
  let censusFault = false;
  let changesFault = false;
  let advanceAfterChanges = false;
  let swapAccountAfterChanges = false;
  let corruptDomainAfterChanges = false;
  let changeDuringCensus = false;
  let accountDuringCensus = false;
  let domainDuringCensus = false;
  let scopeDuringCensus = false;
  const scope = new ProductPathScope(contractId<"VaultPath">(".obsidian") as VaultPath,
    () => ({ userExclusionPatterns: scopeExclusions }));
  const local = {
    enumerate: async () => {
      localReads++;
      return partialLocal
        ? { entries: [], completeness: { status: "partial" as const, reason: "synthetic-local-uncertainty" } }
        : { entries: [{
          status: "present" as const, side: "local" as const, path: notePath,
          entityKind: "file" as const, stability: "stable" as const, content: localContent,
        }, ...extraBase.map(entry => ({ status: "present" as const, side: "local" as const,
          path: entry.path, entityKind: entry.entityKind, stability: "stable" as const,
          content: entry.content }))], completeness: { status: "complete" as const } };
    },
  };
  const secrets = new MemorySecrets();
  secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "step6-synthetic-active", refreshToken: "step6-synthetic-refresh",
    expiresAtMs: Date.now() + 5 * 60_000, tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file",
  }));
  secrets.setSecret("brain-gdrive-paired-account", "permission-step4");
  const boundary = createObsidianGoogleDriveBoundary({
    oauth: { clientId: "step6-synthetic", redirectUri: "https://callback.invalid" },
    secretStorage: secrets,
    managedRemoteIdentity: () => remote,
    requestUrl: async request => {
      const method = request.method ?? "GET";
      const purpose = requestClass(request.url);
      const started = performance.now();
      let responsePayloadBytes = 0;
      try {
        // All requests terminate here; no mutation is allowed in this BU.
        if (method !== "GET") throw new Error("unexpected synthetic provider mutation");
        if (changeDuringCensus && purpose === "markedCensus") {
          changeDuringCensus = false;
          server.advanceSameId();
        }
        if (purpose === "markedCensus") {
          if (accountDuringCensus) { accountDuringCensus = false; server.account = "different-provider-account"; }
          if (domainDuringCensus) { domainDuringCensus = false; server.domainFault = "exact"; }
          if (scopeDuringCensus) { scopeDuringCensus = false; scopeExclusions = ["other/**"]; }
        }
        if ((censusFault && purpose === "markedCensus") || (changesFault && purpose === "changes")) {
          const payload = new TextEncoder().encode(JSON.stringify({ error: { message: "synthetic denied census" } }));
          responsePayloadBytes = payload.byteLength;
          return { status: 403, headers: { "content-type": "application/json" },
            arrayBuffer: payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) };
        }
        const response = await server.request(request);
        responsePayloadBytes = response.arrayBuffer.byteLength;
        if (purpose === "changes" && advanceAfterChanges) {
          advanceAfterChanges = false;
          server.advanceSameId();
        }
        if (purpose === "changes" && swapAccountAfterChanges) {
          swapAccountAfterChanges = false;
          server.account = "different-provider-account";
        }
        if (purpose === "changes" && corruptDomainAfterChanges) {
          corruptDomainAfterChanges = false;
          server.domainFault = "exact";
        }
        return response;
      } finally {
        samples.push({ purpose, method, physicalTree: physicalTreeRead(request.url),
          responsePayloadBytes, requestUrlUtf8Bytes: new TextEncoder().encode(request.url).byteLength,
          sharedAncestor: new URL(request.url).pathname === "/drive/v3/files/nested-folder",
          ms: performance.now() - started });
      }
    },
  });
  const initial = createInitialAuthorityState({
    persistenceRevision: rev("state:step6:1"), semanticGeneration: sem("semantic:step6:1"),
    vaultIdentity: vault, deviceIdentity: device,
  });
  // Establish the same already-synchronized logical state in both worlds.
  // Do not allow inventory publication to masquerade as a successful sync.
  const saved = await raw.saveTrusted({
    ...initial, changeCursor: server.currentCursor(),
    base: [{ path: notePath, entityKind: "file", localExisted: true, remoteExisted: true,
      remoteObjectId: noteId, content: originalContent }, ...extraBase],
    remoteMappings: [{ path: notePath, entityKind: "file", remoteObjectId: noteId },
      ...extraBase.map(({ path, entityKind, remoteObjectId }) => ({ path, entityKind, remoteObjectId }))],
  });
  assert.equal(saved.status, "saved");
  const fingerprint = () => continuity
    ? inventoryContinuityFingerprint(boundary.oauth.inventoryGrantBinding()!, scope.inventoryScopeFingerprint())
    : scope.inventoryScopeFingerprint();
  const currentFence = () => buildInventoryPlanningFence({
    drive: boundary.drive, remoteIdentity: remote, deviceIdentity: device,
    vaultIdentity: vault, scopePolicyFingerprint: fingerprint(),
  });
  const observePlanningBoundary = async () => {
    const observedFingerprint = fingerprint();
    // Advisory reads must preserve production's no-schema-upgrade contract.
    const hint = await new IndexedDbInventoryObservationStore(databaseName, factory,
      { allowSchemaUpgrade: false }).continuityRootHint();
    const knownDomains = hint && hint.scopePolicyFingerprint === observedFingerprint &&
      hint.deviceIdentity === device && hint.vaultIdentity === vault &&
      hint.managedRootId === root
      ? { contentRootId: hint.contentDomainRootId, configRootId: hint.configDomainRootId } : undefined;
    const observed = await buildInventoryPlanningBoundary({
      drive: boundary.drive, remoteIdentity: remote, deviceIdentity: device,
      vaultIdentity: vault, scopePolicyFingerprint: observedFingerprint,
      ...(knownDomains ? { knownDomains } : {}),
    });
    if (fingerprint() !== observedFingerprint) throw new Error("scope changed during boundary");
    return observed;
  };
  const observePlanningHorizon = async () => {
    const before = fingerprint();
    const actual = await boundary.drive.observeInventoryPlanningHorizon();
    if (!actual.ok || before !== fingerprint()) throw new Error("final horizon untrusted");
    return { pairedAccountKey: actual.value.pairedAccountKey,
      scopePolicyFingerprint: before, cursor: actual.value.cursor };
  };
  const legacy = (owner: PersistentSynchronizationStateStore = state) => new ProductSnapshotAssembler(
    local as never, boundary.drive, owner, context, async () => remote,
    path => scope.isManagedLogical(path), () => false, undefined, boundary.drive, owner,
  );
  const inventoryStore = (allowSchemaUpgrade: boolean) =>
    new IndexedDbInventoryObservationStore(databaseName, factory, { allowSchemaUpgrade });
  const storage = establish ? inventoryStore(true) : undefined;
  async function measure<T>(action: () => Promise<T>) {
    const offset = samples.length;
    const memoryBefore = process.memoryUsage();
    const cpuBefore = process.cpuUsage();
    const start = performance.now();
    const value = await action();
    const wallMs = performance.now() - start;
    const cpuElapsed = process.cpuUsage(cpuBefore);
    const memoryAfter = process.memoryUsage();
    const observed = samples.slice(offset);
    const counts = Object.fromEntries(requestClasses.map(purpose => [
      purpose, observed.filter(s => s.purpose === purpose).length,
    ])) as Record<RequestClass, number>;
    return { value, metrics: {
      count: observed.length, counts, wallMs,
      processCpuMs: (cpuElapsed.user + cpuElapsed.system) / 1000,
      simulatedHttpMs: observed.reduce((sum, s) => sum + s.ms, 0),
      physicalTreeReads: observed.filter(s => s.physicalTree).length,
      sharedAncestorReads: observed.filter(s => s.sharedAncestor).length,
      writes: observed.filter(s => s.method !== "GET").length,
      heapBefore: memoryBefore.heapUsed, heapAfter: memoryAfter.heapUsed,
      rssBefore: memoryBefore.rss, rssAfter: memoryAfter.rss,
      providerResponsePayloadBytes: observed.reduce((sum, sample) => sum + sample.responsePayloadBytes, 0),
      requestUrlUtf8Bytes: observed.reduce((sum, sample) => sum + sample.requestUrlUtf8Bytes, 0),
      contentResponsePayloadBytes: 0, // Metadata-only synthetic boundary, no file-content transfer.
      networkWireBytesMeasured: false, // HTTP payload and URL bytes exclude headers, compression and TLS.
      authorityLogicalBytes: logicalBytes(db, true), inventoryLogicalBytes: logicalBytes(db, false),
    } };
  }
  const setup = await measure(async () => {
    if (!storage) return;
    const result = await new VerifiedInventoryBaselineCoordinator(boundary.metadataReader, storage)
      .publishBaseline(await currentFence(), gen("step6:g0"));
    assert.equal(result.status, "published");
  });
  const selected = (owner: PersistentSynchronizationStateStore = state) =>
    selectPlanningAssembler<ProductSnapshotAssembler>(enabled, () => legacy(owner), () => {
      inventoryConstructions++;
      const inventory = inventoryStore(false);
      return new InventoryBackedSnapshotAssembler({
        local: local as never, drive: boundary.drive, state: owner, stateContext: context,
        remoteIdentity: async () => remote, inventory, currentFence,
        observePlanningBoundary, observePlanningHorizon,
        refresh: new VerifiedInventoryBaselineCoordinator(boundary.metadataReader, inventory),
        pathIncluded: path => scope.isManagedLogical(path), fullReconcileRequired: () => false,
        provenanceReader: boundary.metadataReader, reliableChanges: boundary.drive,
        authorityStore: owner,
      });
    });
  const plan = async (assembler: ProductSnapshotAssembler, full = false) => measure(async () => {
    const assembly = full ? await assembler.assembleFull() : await assembler.assemble();
    const planned = await new ProductionSynchronizationPlanner(planner()).plan(assembly.input);
    return { assembly, planned };
  });
  const refresh = async () => {
    assert.ok(storage);
    return measure(async () => new VerifiedInventoryBaselineCoordinator(boundary.metadataReader, storage)
      .publishIncremental(await currentFence(), gen("step6:g1"), batch("step6:batch:1")));
  };
  const publicationProof = async () => {
    assert.ok(storage);
    const fence = await currentFence();
    const publication = await inventoryStore(false).publicationSnapshot(fence);
    const authority = await raw.loadAuthority();
    const planning = await state.load(context);
    assert.equal(publication.status, "trusted-fence");
    assert.equal(authority.status, "trusted");
    assert.equal(planning.status, "trusted");
    if (publication.status !== "trusted-fence" || authority.status !== "trusted" || planning.status !== "trusted")
      throw new Error("synthetic inventory prerequisite not trusted");
    assert.ok(publication.value.activeManifest);
    assert.ok(publication.value.activeGeneration);
    assert.equal(publication.value.canonicalCursor, server.currentCursor());
    assert.equal(publication.value.persistenceRevision, authority.state.persistenceRevision);
    assert.equal(publication.value.semanticGeneration, authority.state.semanticGeneration);
    return { activeGenerationPresent: true, cursorMatches: true, publicationMatchesDurableAuthority: true,
      planningRevisionEqualsPersistence: String(planning.state.stateRevision) === String(publication.value.persistenceRevision),
      planningRevisionIsSemanticCas: String(planning.state.stateRevision).startsWith("semantic-cas:") };
  };
  return { server, raw, state, db, setup, samples, selected, legacy, plan, refresh, publicationProof,
    localReads: () => localReads, inventoryConstructions: () => inventoryConstructions,
    makeLocalPartial: () => { partialLocal = true; },
    setLocalContent: (content: typeof localContent) => { localContent = content; },
    setScopeExclusions: (patterns: string[]) => { scopeExclusions = patterns; },
    denyCensus: () => { censusFault = true; },
    denyChanges: () => { changesFault = true; },
    allowChanges: () => { changesFault = false; },
    raceAfterNextChanges: () => { advanceAfterChanges = true; },
    swapAccountAfterNextChanges: () => { swapAccountAfterChanges = true; },
    corruptDomainAfterNextChanges: () => { corruptDomainAfterChanges = true; },
    changeDuringNextCensus: () => { changeDuringCensus = true; },
    changeAccountDuringCensus: () => { accountDuringCensus = true; },
    changeDomainDuringCensus: () => { domainDuringCensus = true; },
    changeScopeDuringCensus: () => { scopeDuringCensus = true; },
    removeInventoryRow: () => {
      const table = db.tables.get("inventory-entities");
      assert.ok(table);
      const key = [...table.records.keys()].find(key => key.includes(String(noteId)));
      assert.ok(key);
      table.records.delete(key);
    },
    changePairedAccount: () => secrets.setSecret("brain-gdrive-paired-account", "other-account"),
    reauthorize: () => {
      const raw = secrets.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID);
      assert.ok(raw);
      secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID,
        JSON.stringify({ ...JSON.parse(raw), inventoryGrantEpoch: "a".repeat(32) }));
    },
    reopen: () => new SynchronizationStateAuthorityAdapter(new PersistentSynchronizationStateStore(
      new IndexedDbInventoryAwareStateByteStorage(databaseName, factory))),
  };
}
type PairedWorld = Awaited<ReturnType<typeof pairedEnvironment>>;
type MeasuredPlan = Awaited<ReturnType<PairedWorld["plan"]>>;
function comparePlanObservations(left: MeasuredPlan, right: MeasuredPlan): void {
  assert.deepEqual(left.value.assembly.input.snapshots, right.value.assembly.input.snapshots);
  assert.deepEqual(left.value.planned, right.value.planned);
  assert.equal(left.value.assembly.nextCursor, right.value.assembly.nextCursor);
  assert.equal(left.metrics.writes, 0);
  assert.equal(right.metrics.writes, 0);
}
function assertOptimized(measured: MeasuredPlan): void {
  // "full" is the production assembler's mode for its inventory-projected
  // listing. It is NOT by itself evidence that the inventory was consumed.
  assert.equal(measured.value.assembly.mode, "full");
  assert.equal(measured.metrics.physicalTreeReads, 0, "must not silently use physical listing");
  assert.equal(measured.metrics.counts.changes, 0, "must not silently use legacy Changes");
  assert.ok(measured.metrics.counts.markedCensus > 0, "actual fresh provider provenance required");
  assert.equal(measured.metrics.counts.startCursor, 2, "independent initial and final live cursor proof");
  assert.equal(measured.metrics.counts.account, 2, "one fresh account observation per proof boundary");
  assert.equal(measured.metrics.counts.parentListing, 4, "two complete uniqueness queries per proof boundary");
  assert.equal(measured.metrics.counts.exactId, 6 + measured.metrics.sharedAncestorReads,
    "one exact observation of each root/domain per boundary plus fresh census ancestors");
  assert.equal(measured.metrics.count, 14 + measured.metrics.counts.markedCensus + measured.metrics.sharedAncestorReads,
    "no redundant provider validation in successful steady planning");
}
function reportMeasurements(t: import("node:test").TestContext, phase: string,
  worlds: readonly { mode: "legacy" | "inventory" | "full"; metrics: MeasuredPlan["metrics"] }[]): void {
  for (const world of worlds) {
    assert.equal(Object.values(world.metrics.counts).reduce((sum, n) => sum + n, 0), world.metrics.count);
    assert.ok(world.metrics.wallMs >= 0 && world.metrics.simulatedHttpMs >= 0);
  }
  // Native PHX-CI test evidence only. Numeric measurements and fixed labels;
  // the existing direct BVP privacy filter is not changed by this prerequisite.
  t.diagnostic("DEC339_STEP6_METRICS " + JSON.stringify({ phase, simulated: true, worlds }));
}

test("DEC339 Step 6 disabled gate remains legacy Changes with no inventory allocation; explicit full stays physical", async t => {
  const legacy = await pairedEnvironment(false);
  const full = await pairedEnvironment(false);
  const incremental = await legacy.plan(legacy.selected());
  const physical = await full.plan(full.selected(), true);
  comparePlanObservations(incremental, physical);
  assert.equal(incremental.value.assembly.mode, "incremental");
  assert.ok(incremental.metrics.counts.changes > 0);
  assert.equal(legacy.inventoryConstructions(), 0);
  assert.equal(incremental.metrics.inventoryLogicalBytes, 0);
  assert.ok(physical.metrics.physicalTreeReads > 0);
  assert.equal(legacy.localReads(), 1);
  assert.equal(full.localReads(), 1);
  reportMeasurements(t, "steady", [{ mode: "legacy", metrics: incremental.metrics },
    { mode: "full", metrics: physical.metrics }]);
});

test("DEC339 Step 6 real production state adapter must use verified enabled inventory after restart, not silently fall back", async t => {
  const legacy = await pairedEnvironment(false);
  const enabled = await pairedEnvironment(true);
  const full = await pairedEnvironment(false);
  const ordinary = await legacy.plan(legacy.selected());
  const optimized = await enabled.plan(enabled.selected(enabled.reopen()));
  const physical = await full.plan(full.selected(), true);
  comparePlanObservations(ordinary, optimized);
  comparePlanObservations(ordinary, physical);
  assert.equal(enabled.inventoryConstructions(), 1);
  assert.ok(enabled.setup.metrics.inventoryLogicalBytes > 0);
  assert.equal(enabled.localReads(), 1);
  t.diagnostic("DEC339_STEP6_PATH_PROOF " + JSON.stringify({ ...await enabled.publicationProof(),
    assemblyMode: optimized.value.assembly.mode, changes: optimized.metrics.counts.changes,
    physicalTreeReads: optimized.metrics.physicalTreeReads, markedCensus: optimized.metrics.counts.markedCensus }));
  reportMeasurements(t, "setup", [{ mode: "inventory", metrics: enabled.setup.metrics }]);
  reportMeasurements(t, "steady", [{ mode: "legacy", metrics: ordinary.metrics },
    { mode: "inventory", metrics: optimized.metrics }, { mode: "full", metrics: physical.metrics }]);
  assertOptimized(optimized);
});

test("DEC339 Step 6 refreshed same-ID observation matches legacy Changes and full planning, including refresh cost", async t => {
  const legacy = await pairedEnvironment(false);
  const enabled = await pairedEnvironment(true);
  const full = await pairedEnvironment(false);
  for (const world of [legacy, enabled, full]) world.server.advanceSameId();
  const refresh = await enabled.refresh();
  assert.equal(refresh.value.status, "published");
  const ordinary = await legacy.plan(legacy.selected());
  const optimized = await enabled.plan(enabled.selected(enabled.reopen()));
  const physical = await full.plan(full.selected(), true);
  comparePlanObservations(ordinary, optimized);
  comparePlanObservations(ordinary, physical);
  assert.ok(ordinary.value.planned.operations.some(operation => operation.kind === "download-update"));
  assert.ok(refresh.metrics.counts.changes > 0);
  reportMeasurements(t, "refresh", [{ mode: "inventory", metrics: refresh.metrics }]);
  reportMeasurements(t, "changed", [{ mode: "legacy", metrics: ordinary.metrics },
    { mode: "inventory", metrics: optimized.metrics }, { mode: "full", metrics: physical.metrics }]);
  assertOptimized(optimized);
});

test("DEC339 Step 6 missing inventory and changed scope cannot substitute an unverified listing", async () => {
  const missing = await pairedEnvironment(true, false);
  await assert.rejects(missing.plan(missing.selected()), /metadata-enabled synchronization blocked/);
  assert.equal(missing.db.version, 1, "enabled reads must not migrate existing storage");
  assert.equal(logicalBytes(missing.db, false), 0);
  const enabled = await pairedEnvironment(true);
  enabled.setScopeExclusions(["unrelated/**"]);
  const rebuilt = await enabled.plan(enabled.selected());
  assert.equal(rebuilt.value.assembly.mode, "full");
  assert.ok(rebuilt.metrics.physicalTreeReads > 0);
  assert.ok(rebuilt.metrics.counts.markedCensus > 0);
  assert.equal(rebuilt.metrics.writes, 0);
  await enabled.publicationProof();
  assertOptimized(await enabled.plan(enabled.selected(enabled.reopen())));
});
test("DEC339 Step 6 stale provider horizon refreshes verified inventory before planning", async t => {
  const enabled = await pairedEnvironment(true);
  const legacy = await pairedEnvironment(false);
  enabled.server.advanceSameId(); legacy.server.advanceSameId();
  const refreshed = await enabled.plan(enabled.selected());
  const physical = await enabled.plan(enabled.legacy(), true);
  const ordinary = await legacy.plan(legacy.selected());
  comparePlanObservations(refreshed, physical);
  comparePlanObservations(refreshed, ordinary);
  assert.equal(refreshed.value.assembly.mode, "full");
  assert.ok(refreshed.metrics.counts.changes > 0);
  assert.ok(refreshed.metrics.counts.markedCensus > 0);
  await enabled.publicationProof();
  reportMeasurements(t, "automatic-refresh-and-plan", [{ mode: "inventory", metrics: refreshed.metrics },
    { mode: "legacy", metrics: ordinary.metrics }, { mode: "full", metrics: physical.metrics }]);
  assertOptimized(await enabled.plan(enabled.selected(enabled.reopen())));
});

test("DEC339 Step 6 partial fresh local observation does not become deletion authority", async () => {
  const legacy = await pairedEnvironment(false);
  const enabled = await pairedEnvironment(true);
  legacy.makeLocalPartial(); enabled.makeLocalPartial();
  const ordinary = await legacy.plan(legacy.selected());
  const selected = await enabled.plan(enabled.selected());
  comparePlanObservations(ordinary, selected);
  assert.equal(selected.value.assembly.input.snapshots[0]?.local.status, "unknown");
  assert.equal(selected.value.planned.operations.some(operation => operation.kind === "trash-remote"), false);
});

test("DEC339 Step 6 failed required provider provenance cannot certify inventory or Changes-only success", async () => {
  const enabled = await pairedEnvironment(true);
  enabled.denyCensus();
  const start = enabled.samples.length;
  await assert.rejects(enabled.plan(enabled.selected()), /root-wide managed provenance unproven/);
  const attempted = enabled.samples.slice(start);
  assert.ok(attempted.some(sample => sample.purpose === "markedCensus"));
  assert.equal(attempted.some(sample => sample.purpose === "changes" || sample.physicalTree), false);
  assert.ok(enabled.samples.every(sample => sample.method === "GET"));
});

test("DEC339 Step 6 failed refresh preserves prior cursor and permits a bounded verified retry", async () => {
  const enabled = await pairedEnvironment(true);
  const before = await enabled.raw.exportDiagnosticState();
  enabled.server.advanceSameId();
  enabled.denyChanges();
  await assert.rejects(enabled.plan(enabled.selected()), /verified inventory refresh failed/);
  assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
  enabled.allowChanges();
  const result = await enabled.plan(enabled.selected());
  assert.equal(result.value.assembly.mode, "full");
  await enabled.publicationProof();
  assertOptimized(await enabled.plan(enabled.selected(enabled.reopen())));
});

test("DEC339 Step 6 damaged persisted row is rebuilt before planning with unchanged canonical cursor", async () => {
  const enabled = await pairedEnvironment(true);
  const before = await enabled.raw.loadAuthority();
  enabled.removeInventoryRow();
  const rebuilt = await enabled.plan(enabled.selected());
  assert.ok(rebuilt.metrics.physicalTreeReads > 0);
  assert.equal(rebuilt.value.assembly.mode, "full");
  const after = await enabled.raw.loadAuthority();
  assert.equal(before.status, "trusted");
  assert.equal(after.status, "trusted");
  if (before.status !== "trusted" || after.status !== "trusted") throw new Error("authority lost");
  assert.equal(after.state.changeCursor, before.state.changeCursor);
  assert.deepEqual(after.state.base, before.state.base);
  assert.deepEqual(after.state.learnedRemoteBatches, before.state.learnedRemoteBatches);
  await enabled.publicationProof();
  assertOptimized(await enabled.plan(enabled.selected(enabled.reopen())));
});

test("DEC339 Step 6 rebaseline cannot skip unlearned provider cursor advance", async () => {
  const enabled = await pairedEnvironment(true);
  const before = await enabled.raw.exportDiagnosticState();
  enabled.removeInventoryRow();
  enabled.setScopeExclusions(["unrelated/**"]);
  enabled.server.advanceSameId();
  await assert.rejects(enabled.plan(enabled.selected()), /rebaseline-would-advance-canonical-cursor-without-learned-changes/);
  assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
  const rollback = await enabled.plan(enabled.legacy());
  assert.equal(rollback.value.assembly.mode, "incremental");
  assert.ok(rollback.value.planned.operations.some(operation => operation.kind === "download-update"));
});

test("DEC339 Step 6 provider horizon racing final census blocks stale plan", async () => {
  const enabled = await pairedEnvironment(true);
  enabled.changeDuringNextCensus();
  const start = enabled.samples.length;
  await assert.rejects(enabled.plan(enabled.selected()), /metadata fence or provider horizon changed|root-wide managed provenance unproven/);
  assert.ok(enabled.samples.slice(start).some(sample => sample.purpose === "markedCensus"));
  assert.equal(enabled.samples.slice(start).some(sample => sample.purpose === "changes"), false);
});

test("DEC339 Step 6 wrong paired account cannot trigger rebuild or legacy planning", async () => {
  const enabled = await pairedEnvironment(true);
  const before = await enabled.raw.exportDiagnosticState();
  enabled.changePairedAccount();
  const start = enabled.samples.length;
  await assert.rejects(enabled.plan(enabled.selected()), /metadata-enabled synchronization blocked/);
  assert.equal(enabled.samples.slice(start).some(sample => sample.purpose === "changes" || sample.physicalTree), false);
  assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
});


for (const size of [24, 128]) {
  test("DEC339 Step 6 matched nested " + size + " file workload shares fresh ancestors across complete census pages", async t => {
    const legacy = await pairedEnvironment(false, false, size);
    const enabled = await pairedEnvironment(true, true, size);
    const full = await pairedEnvironment(false, false, size);
    const ordinary = await legacy.plan(legacy.selected());
    const optimized = await enabled.plan(enabled.selected(enabled.reopen()));
    const physical = await full.plan(full.selected(), true);
    comparePlanObservations(ordinary, optimized);
    comparePlanObservations(ordinary, physical);
    assert.equal(optimized.value.assembly.input.snapshots.length, size + 2);
    assertOptimized(optimized);
    assert.equal(optimized.metrics.sharedAncestorReads, 1);
    assert.equal(optimized.metrics.counts.markedCensus, Math.ceil((size + 2) / 25));
    assert.ok(optimized.metrics.count < 53, "bounded steady planning cost must improve on prior one-file 53-request path");
    reportMeasurements(t, "nested-" + size, [{ mode: "legacy", metrics: ordinary.metrics },
      { mode: "inventory", metrics: optimized.metrics }, { mode: "full", metrics: physical.metrics }]);
    reportMeasurements(t, "nested-setup-" + size, [{ mode: "inventory", metrics: enabled.setup.metrics }]);
    const repeat = await enabled.plan(enabled.selected());
    assertOptimized(repeat);
    assert.equal(repeat.metrics.sharedAncestorReads, 1, "a new run must reread shared ancestors");
    assert.equal(repeat.metrics.counts.markedCensus, optimized.metrics.counts.markedCensus);
  });
}

test("DEC339 Step 6 combined boundary rejects incomplete, duplicate, cyclic-page and contradictory exact domain observations", async () => {
  for (const fault of ["partial", "duplicate", "repeated", "exact"] as const) {
    const enabled = await pairedEnvironment(true);
    const before = await enabled.raw.exportDiagnosticState();
    const start = enabled.samples.length;
    enabled.server.domainFault = fault;
    await assert.rejects(enabled.plan(enabled.selected()), /metadata-enabled synchronization blocked/);
    assert.equal(enabled.samples.slice(start).some(sample => sample.physicalTree || sample.purpose === "changes"), false);
    assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
  }
});

test("DEC339 Step 6 combined proof rechecks account, domain and scope after census", async () => {
  for (const change of ["account", "domain", "scope"] as const) {
    const enabled = await pairedEnvironment(true);
    const before = await enabled.raw.exportDiagnosticState();
    if (change === "account") enabled.changeAccountDuringCensus();
    else if (change === "domain") enabled.changeDomainDuringCensus();
    else enabled.changeScopeDuringCensus();
    const start = enabled.samples.length;
    await assert.rejects(enabled.plan(enabled.selected()), /metadata-enabled synchronization blocked/);
    const observed = enabled.samples.slice(start);
    assert.equal(observed.filter(sample => sample.purpose === "account").length, 2);
    assert.equal(observed.filter(sample => sample.purpose === "markedCensus").length, 1);
    assert.equal(observed.some(sample => sample.physicalTree || sample.purpose === "changes"), false);
    assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
  }
});

/**
 * DEC-365 correction: real product adapter + actual synthetic HTTP boundary,
 * isolated per-device IndexedDB, and the existing independent legacy/full worlds.
 * These tests do not simulate a second planner or assume provider omniscience.
 */
test("DEC365 unchanged verified inventory uses one Changes replay, no census, and retains identical planning", async t => {
  const enabled = await pairedEnvironment(true, true, 24, true);
  const legacy = await pairedEnvironment(false, false, 24);
  const full = await pairedEnvironment(false, false, 24);
  const optimized = await enabled.plan(enabled.selected(enabled.reopen()));
  const ordinary = await legacy.plan(legacy.selected());
  const physical = await full.plan(full.selected(), true);
  comparePlanObservations(optimized, ordinary);
  comparePlanObservations(optimized, physical);
  assert.equal(optimized.value.assembly.mode, "incremental");
  assert.equal(optimized.value.assembly.inventoryContinuity, true);
  assert.equal(optimized.metrics.counts.markedCensus, 0);
  assert.equal(optimized.metrics.physicalTreeReads, 0);
  assert.equal(optimized.metrics.counts.changes, 1);
  assert.equal(optimized.metrics.counts.parentListing, 0,
    "stable domain IDs must not be rediscovered by name");
  assert.ok(optimized.metrics.count < ordinary.metrics.count,
    `unchanged inventory must beat legacy request count: ${optimized.metrics.count} vs ${ordinary.metrics.count}`);
  assert.ok(optimized.metrics.providerResponsePayloadBytes < ordinary.metrics.providerResponsePayloadBytes,
    `unchanged inventory must beat legacy response payload: ${optimized.metrics.providerResponsePayloadBytes} vs ${ordinary.metrics.providerResponsePayloadBytes}`);
  assert.equal(optimized.metrics.writes, 0);
  const active = await enabled.publicationProof();
  assert.equal(active.cursorMatches, true);
  reportMeasurements(t, "continuity-steady", [
    { mode: "legacy", metrics: ordinary.metrics },
    { mode: "inventory", metrics: optimized.metrics },
    { mode: "full", metrics: physical.metrics },
  ]);
});

test("DEC365 stale Changes refreshes verified stable ID without any routine marked census", async t => {
  const enabled = await pairedEnvironment(true, true, 24, true);
  const legacy = await pairedEnvironment(false, false, 24);
  const full = await pairedEnvironment(false, false, 24);
  for (const world of [enabled, legacy, full]) world.server.advanceSameId();
  const optimized = await enabled.plan(enabled.selected());
  const ordinary = await legacy.plan(legacy.selected());
  const physical = await full.plan(full.selected(), true);
  comparePlanObservations(optimized, ordinary);
  comparePlanObservations(optimized, physical);
  assert.equal(optimized.value.assembly.inventoryContinuity, true);
  assert.equal(optimized.metrics.counts.markedCensus, 0);
  assert.equal(optimized.metrics.counts.changes, 1);
  assert.ok(optimized.metrics.counts.parentListing >= 1);
  assert.ok(optimized.metrics.physicalTreeReads >= 1,
    "only affected parent directory may need complete fresh occupancy");
  assert.ok(optimized.metrics.count < ordinary.metrics.count,
    `leaf inventory must beat legacy request count: ${optimized.metrics.count} vs ${ordinary.metrics.count}`);
  assert.ok(optimized.value.planned.operations.some(op => op.kind === "download-update"));
  await enabled.publicationProof();
  reportMeasurements(t, "continuity-leaf-delta", [
    { mode: "legacy", metrics: ordinary.metrics },
    { mode: "inventory", metrics: optimized.metrics },
    { mode: "full", metrics: physical.metrics },
  ]);
});

test("DEC365 repeated unchanged planning is idempotent and avoids generation/cursor churn", async () => {
  const enabled = await pairedEnvironment(true, true, 24, true);
  const first = await enabled.plan(enabled.selected());
  const authority = await enabled.raw.loadAuthority();
  const second = await enabled.plan(enabled.selected(enabled.reopen()));
  const after = await enabled.raw.loadAuthority();
  assert.equal(first.value.assembly.inventoryContinuity, true);
  assert.equal(second.value.assembly.inventoryContinuity, true);
  assert.equal(first.metrics.counts.markedCensus, 0);
  assert.equal(second.metrics.counts.markedCensus, 0);
  assert.equal(first.metrics.counts.changes, 1);
  assert.equal(second.metrics.counts.changes, 1);
  assert.deepEqual(after, authority);
  assert.deepEqual(second.value.planned, first.value.planned);
});

test("DEC365 reauthorization never reuses the old generation without a complete new baseline", async () => {
  const enabled = await pairedEnvironment(true, true, 0, true);
  const before = await enabled.publicationProof();
  assert.equal(before.cursorMatches, true);
  enabled.reauthorize();
  const start = enabled.samples.length;
  const rebuilt = await enabled.plan(enabled.selected());
  const newRequests = enabled.samples.slice(start);
  assert.ok(newRequests.some(x => x.purpose === "markedCensus"),
    "a changed grant requires fresh complete physical marked provenance");
  assert.ok(newRequests.some(x => x.physicalTree), "rebaseline must enumerate the full managed domain");
  assert.equal(rebuilt.value.assembly.inventoryContinuity, true);
  assert.equal(rebuilt.metrics.writes, 0);
});

test("DEC365 explicit full reconciliation still physically lists managed objects", async () => {
  const enabled = await pairedEnvironment(true, true, 24, true);
  const full = await enabled.plan(enabled.selected(), true);
  assert.equal(full.value.assembly.mode, "full");
  assert.equal(full.value.assembly.inventoryContinuity, undefined);
  assert.ok(full.metrics.physicalTreeReads > 0);
  assert.equal(full.metrics.writes, 0);
});

test("DEC365 failed Changes read preserves complete durable state and permits retry", async () => {
  const enabled = await pairedEnvironment(true, true, 0, true);
  const before = await enabled.raw.exportDiagnosticState();
  enabled.denyChanges();
  await assert.rejects(enabled.plan(enabled.selected()), /verified inventory refresh failed/);
  assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
  enabled.allowChanges();
  const retry = await enabled.plan(enabled.selected());
  assert.equal(retry.value.assembly.inventoryContinuity, true);
  assert.equal(retry.metrics.counts.markedCensus, 0);
});

test("DEC365 BASE-independent persistence-only revision does not force remote metadata reconstruction", async () => {
  const enabled = await pairedEnvironment(true, true, 0, true);
  const before = await enabled.raw.loadAuthority();
  if (before.status !== "trusted") throw new Error("source authority unavailable");
  const saved = await enabled.raw.saveAuthority(before.state,
    before.state.persistenceRevision, before.state.semanticGeneration);
  assert.equal(saved.status, "saved");
  const after = await enabled.plan(enabled.selected());
  assert.equal(after.value.assembly.inventoryContinuity, true);
  assert.equal(after.metrics.counts.markedCensus, 0);
  assert.equal(after.metrics.physicalTreeReads, 0);
  assert.equal(after.metrics.counts.changes, 1);
});

test("DEC365 provider horizon advancing after replay rejects publication without cursor loss", async () => {
  const enabled = await pairedEnvironment(true, true, 0, true);
  const before = await enabled.raw.exportDiagnosticState();
  enabled.raceAfterNextChanges();
  await assert.rejects(enabled.plan(enabled.selected()), /verified inventory refresh failed/);
  assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
  const restored = await enabled.plan(enabled.selected());
  assert.equal(restored.value.assembly.inventoryContinuity, true);
  assert.equal(restored.metrics.counts.markedCensus, 0);
});

test("DEC365 steady remote request count does not scale with unchanged nested vault size", async t => {
  const observations: Array<{ size: number; count: number; payloadBytes: number }> = [];
  for (const size of [24, 128]) {
    const enabled = await pairedEnvironment(true, true, size, true);
    const optimized = await enabled.plan(enabled.selected());
    assert.equal(optimized.value.assembly.inventoryContinuity, true);
    assert.equal(optimized.metrics.counts.markedCensus, 0);
    assert.equal(optimized.metrics.physicalTreeReads, 0);
    assert.equal(optimized.metrics.counts.changes, 1);
    observations.push({ size, count: optimized.metrics.count,
      payloadBytes: optimized.metrics.providerResponsePayloadBytes });
    reportMeasurements(t, "continuity-nested-" + size,
      [{ mode: "inventory", metrics: optimized.metrics }]);
  }
  assert.equal(observations[0]!.count, observations[1]!.count,
    "steady network request count must not scale with unchanged remote object count");
  assert.equal(observations[0]!.payloadBytes, observations[1]!.payloadBytes,
    "steady provider response metadata payload must not scale with unchanged object count");
});

test("DEC365 final account check detects remote account switch after complete replay", async () => {
  const enabled = await pairedEnvironment(true, true, 0, true);
  const before = await enabled.raw.exportDiagnosticState();
  enabled.swapAccountAfterNextChanges();
  await assert.rejects(enabled.plan(enabled.selected()),
    /metadata-enabled synchronization blocked/);
  assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
});

test("DEC365 reader independent exact root proof rejects changed domain after Changes read", async () => {
  const enabled = await pairedEnvironment(true, true, 0, true);
  const before = await enabled.raw.exportDiagnosticState();
  enabled.corruptDomainAfterNextChanges();
  await assert.rejects(enabled.plan(enabled.selected()), /verified inventory refresh failed/);
  assert.deepEqual(await enabled.raw.exportDiagnosticState(), before);
});
