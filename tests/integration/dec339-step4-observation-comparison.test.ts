import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
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
    const bytes = new TextEncoder().encode(JSON.stringify(body));
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
      return this.response({ user: { permissionId: "permission-step4" } });
    if (normalized.includes("/drive/v3/changes/startPageToken"))
      return this.response({ startPageToken: this.token });
    if (normalized.includes("/drive/v3/changes?"))
      return this.response({ changes: [...this.changes], newStartPageToken: this.token });

    if (normalized.includes("/drive/v3/files/root?")) return this.response(this.rootFile());
    if (normalized.includes("/drive/v3/files/content?")) return this.response(this.contentFile());
    if (normalized.includes("/drive/v3/files/config?")) return this.response(this.configFile());
    if (normalized.includes("/drive/v3/files/stable-alpha?")) return this.response(this.note());

    if (url.pathname === "/drive/v3/files") {
      const q = this.normalize(url.searchParams.get("q") ?? "");
      if (q.includes("'root' in parents") && q.includes("brain-sync-content"))
        return this.response({ files: [this.contentFile()], incompleteSearch: false });
      if (q.includes("'root' in parents") && q.includes("__brain_sync_portable_config__"))
        return this.response({ files: [this.configFile()], incompleteSearch: false });
      if (q.includes("'content' in parents") && q.includes("__brain_sync_portable_config__"))
        return this.response({ files: [], incompleteSearch: false });
      if (q.includes("'content' in parents"))
        return this.response({ files: [this.note()], incompleteSearch: false });
      if (q.includes("'config' in parents"))
        return this.response({ files: [], incompleteSearch: false });
      if (q.includes("brainManagedRootId"))
        return this.response({ files: [this.note()], incompleteSearch: false });
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

  const fence: InventoryIdentityFence = {
    vaultIdentity: vault,
    deviceIdentity: device,
    pairedAccountKey: accountKey,
    managedRootId: root,
    protocolVersion: protocol,
    contentDomainRootId: contentRoot,
    configDomainRootId: configRoot,
    scopePolicyFingerprint: "scope:step4",
    inventorySchemaVersion: 2,
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

test("DEC339 Step 4 wrong-fence uncertainty falls back to the existing physical observation and cannot become more permissive", async () => {
  const env = await environment();
  const wrongFence = { ...env.fence, pairedAccountKey: "sha256:" + "0".repeat(64) };
  const fallback = await env.inventoryBacked(async () => wrongFence).assemble();
  const ordinary = await env.ordinary().assembleFull();
  assert.deepEqual(fallback.input.snapshots, ordinary.input.snapshots);
  assert.deepEqual(await planner().plan(fallback.input), await planner().plan(ordinary.input));
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
