import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type ChangeCursor,
  type ContentHash,
  type MutationIntentId,
  type RemoteIngestionBatchId,
  type RemoteObjectId,
  type RemoteRevisionId,
  type SemanticStateGeneration,
  type VaultPath,
} from "../../src/contracts";
import { GoogleOAuthSession, ObsidianSecretStore } from "../../src/drive/auth";
import { GoogleDriveAdapter } from "../../src/drive/google-drive-port";
import { GoogleDriveInventoryMetadataSource } from "../../src/drive/inventory-metadata-source";
import { VerifiedMetadataInventoryReader } from "../../src/drive/verified-metadata-inventory-reader";
import { GoogleHttpTransport, type PortableRequestInit } from "../../src/drive/transport";
import type { DriveResult } from "../../src/contracts/google-drive";
import { IndexedDbInventoryAwareStateByteStorage } from "../../src/state/indexeddb-inventory-authority-storage";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import { VerifiedInventoryBaselineCoordinator } from "../../src/state/verified-inventory-integration";
import { PersistentSynchronizationStateStore } from "../../src/state/persistent-state-store";
import {
  FakeDatabase,
  c,
  fence,
  g,
  seeded,
  withRangeOnly,
} from "../fixtures/dec339-inventory-idb-fixtures";

const FOLDER = "application/vnd.google-apps.folder";
const HASH1 = "11".repeat(32);
const HASH2 = "22".repeat(32);
const STABLE_ID = contractId<"RemoteObjectId">("stable-file-A") as RemoteObjectId;
const NOTE_PATH = contractId<"VaultPath">("note.md") as VaultPath;

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string): string | null { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string): void { this.values.set(id, value); }
  deleteSecret(id: string): void { this.values.delete(id); }
}

const ok = (body: unknown, status = 200, headers: Record<string, string> = {}):
  Promise<DriveResult<Response>> => Promise.resolve({
    ok: true,
    value: new Response(body === undefined ? undefined : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    }),
  });

interface ServerFile {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  trashed: boolean;
  version?: string;
  size?: string;
  sha256Checksum?: string;
  appProperties: Record<string, string>;
}

/**
 * Deterministic Drive protocol fixture shared by the real mutation adapter and
 * real metadata source. It models provider state, not product behavior.
 */
class Step3DriveServer {
  readonly root: ServerFile = {
    id: String(fence.managedRootId), name: "BRAIN Sync", mimeType: FOLDER,
    parents: ["drive-root"], trashed: false,
    appProperties: {
      brainSyncRole: "brain-sync-root",
      brainVaultIdentity: String(fence.vaultIdentity),
      brainProtocolVersion: String(fence.protocolVersion),
    },
  };
  readonly content: ServerFile = {
    id: String(fence.contentDomainRootId), name: "vault", mimeType: FOLDER,
    parents: [String(fence.managedRootId)], trashed: false,
    appProperties: { brainSyncRole: "brain-sync-content" },
  };
  readonly config: ServerFile = {
    id: String(fence.configDomainRootId), name: "__brain_sync_portable_config__", mimeType: FOLDER,
    parents: [String(fence.managedRootId)], trashed: false,
    appProperties: { brainSyncRole: "brain-sync-portable-config" },
  };
  current: ServerFile = this.file("1", HASH1, "5");
  terminal: ChangeCursor = c("changes:step3-baseline");
  changes: Array<{ fileId: string; removed: boolean; file: ServerFile }> = [];
  incompleteChanges = false;
  readonly seen: Array<{ url: string; method: string }> = [];

  private file(version: string, sha256Checksum: string, size: string): ServerFile {
    return {
      id: String(STABLE_ID), name: String(NOTE_PATH), mimeType: "text/plain",
      parents: [String(fence.contentDomainRootId)], trashed: false,
      version, size, sha256Checksum,
      appProperties: {
        brainManagedRootId: String(fence.managedRootId),
        brainSyncDomain: "content",
      },
    };
  }

  private listForQuery(q: string): ServerFile[] {
    if (q.includes("brainSyncRole") && q.includes("brain-sync-content")) return [this.content];
    if (q.includes("brainSyncRole") && q.includes("brain-sync-portable-config")) return [this.config];
    if (q.includes("appProperties has") && q.includes("brainManagedRootId")) return [this.current];
    if (q.includes(`'${this.root.id}' in parents`) &&
        q.includes("__brain_sync_portable_config__")) return [this.config];
    if (q.includes(`'${this.content.id}' in parents`)) {
      if (q.includes("__brain_sync_portable_config__")) return [];
      if (q.includes("name=") && !q.includes("note.md")) return [];
      return [this.current];
    }
    if (q.includes(`'${this.config.id}' in parents`)) return [];
    return [];
  }

  async handle(url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> {
    const method = (init.method ?? "GET").toUpperCase();
    this.seen.push({ url, method });

    if (url === "https://upload.example/step3/stable-file-A") {
      assert.equal(method, "PUT");
      this.current = this.file("2", HASH2, "9");
      this.terminal = c("changes:step3-after-update");
      this.changes = [{ fileId: this.current.id, removed: false, file: this.current }];
      return ok(this.current);
    }

    const parsed = new URL(url);
    const pathname = parsed.pathname;

    if (pathname === "/drive/v3/about")
      return ok({ user: { permissionId: "acct-step3" } });

    if (pathname === "/upload/drive/v3/files/stable-file-A") {
      assert.equal(method, "PATCH");
      assert.equal(parsed.searchParams.get("uploadType"), "resumable");
      return ok({}, 200, { location: "https://upload.example/step3/stable-file-A" });
    }

    if (pathname === "/drive/v3/changes/startPageToken")
      return ok({ startPageToken: String(this.terminal) });

    if (pathname === "/drive/v3/changes") {
      if (this.incompleteChanges)
        return Promise.resolve({ ok: false, signal: { kind: "transient-failure", detail: "step3-incomplete-changes" } });
      return ok({
        changes: [...this.changes],
        newStartPageToken: String(this.terminal),
      });
    }

    if (pathname.startsWith("/drive/v3/files/")) {
      const id = decodeURIComponent(pathname.slice("/drive/v3/files/".length));
      const value = id === this.root.id ? this.root :
        id === this.content.id ? this.content :
        id === this.config.id ? this.config :
        id === this.current.id ? this.current : undefined;
      return value ? ok(value) :
        Promise.resolve({ ok: false, signal: { kind: "not-found" } });
    }

    if (pathname === "/drive/v3/files") {
      const q = parsed.searchParams.get("q") ?? "";
      return ok({ files: this.listForQuery(q), incompleteSearch: false });
    }

    throw new Error(`unexpected Step-3 Drive fixture request: ${method} ${url}`);
  }
}

class StubTransport extends GoogleHttpTransport {
  constructor(private readonly server: Step3DriveServer) {
    const secrets = new MemorySecrets();
    super(new GoogleOAuthSession(
      { clientId: "step3", redirectUri: "https://callback.invalid" },
      new ObsidianSecretStore(secrets),
    ));
  }
  override request(url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> {
    return this.server.handle(url, init);
  }
}

function assembledStep3(server = new Step3DriveServer()) {
  const backing = new MemorySecrets();
  backing.setSecret("brain-gdrive-paired-account", "acct-step3");
  const secrets = new ObsidianSecretStore(backing);
  const transport = new StubTransport(server);
  const drive = new GoogleDriveAdapter(
    new GoogleOAuthSession({ clientId: "step3", redirectUri: "https://callback.invalid" }, secrets),
    transport,
    secrets,
    undefined,
    () => ({
      rootId: fence.managedRootId,
      vaultIdentity: fence.vaultIdentity,
      protocolVersion: fence.protocolVersion,
    }),
  );
  const source = new GoogleDriveInventoryMetadataSource(
    drive,
    transport,
    async () => fence.pairedAccountKey,
  );
  return { server, drive, reader: new VerifiedMetadataInventoryReader(source) };
}

function stableUpdateIdentity() {
  const intendedContent = {
    algorithm: "sha256" as const,
    hash: contractId<"ContentHash">("sha256:" + HASH2) as ContentHash,
    sizeBytes: 9,
  };
  return {
    kind: "existing-file-content-update" as const,
    intentId: contractId<"MutationIntentId">("intent:step3-stable-update") as MutationIntentId,
    remoteObjectId: STABLE_ID,
    expectedRevision: contractId<"RemoteRevisionId">("1") as RemoteRevisionId,
    path: NOTE_PATH,
    updateProtocol: "stable-object-in-place" as const,
    intendedContent,
    identityAuthority: {
      status: "unique" as const,
      generation: contractId<"SemanticStateGeneration">("semantic:step3") as SemanticStateGeneration,
      path: NOTE_PATH,
      remoteObjectId: STABLE_ID,
    },
  };
}

const updateBytes: BinaryContentSource = {
  sizeBytes: 9,
  async *openChunks() { yield new Uint8Array(9); },
};

test("DEC362-14 / DEC339 Step 3 proves real same-ID update -> Changes -> persisted inventory continuity", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const storage = await seeded(factory);
  const assembled = assembledStep3();

  const baselineGeneration = g("step3-real-baseline");
  const baseline = await new VerifiedInventoryBaselineCoordinator(assembled.reader, storage)
    .publishBaseline(fence, baselineGeneration);
  assert.equal(baseline.status, "published");

  let read = await storage.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status !== "verified-observation") return;
  const before = await read.value.getById(STABLE_ID);
  assert.equal(before.status, "verified-observation");
  if (before.status === "verified-observation") {
    assert.equal(before.value.remoteObjectId, STABLE_ID);
    assert.equal(before.value.revision, "1");
    assert.equal(before.value.content?.hash, "sha256:" + HASH1);
  }
  await read.value.release();

  const mutation = await assembled.drive.updateExisting(stableUpdateIdentity(), updateBytes);
  assert.equal(mutation.status, "verified-effect");
  if (mutation.status === "verified-effect")
    assert.equal(mutation.applicationProof.remoteObjectId, STABLE_ID);

  const generation = g("step3-real-after-update");
  const batchId = contractId<"RemoteIngestionBatchId">(
    "step3-real-same-id-batch",
  ) as RemoteIngestionBatchId;
  const incremental = await new VerifiedInventoryBaselineCoordinator(assembled.reader, storage)
    .publishIncremental(fence, generation, batchId);
  assert.equal(incremental.status, "published");

  const restarted = new IndexedDbInventoryObservationStore("device:idb:test", factory);
  read = await restarted.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status !== "verified-observation") return;
  const after = await read.value.getById(STABLE_ID);
  assert.equal(after.status, "verified-observation");
  if (after.status === "verified-observation") {
    assert.equal(after.value.remoteObjectId, STABLE_ID,
      "ordinary content update must not synthesize remote identity succession");
    assert.equal(after.value.revision, "2");
    assert.equal(after.value.content?.hash, "sha256:" + HASH2);
    assert.equal(after.value.content?.sizeBytes, 9);
  }
  await read.value.release();

  const authority = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", factory)).loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status === "trusted") {
    assert.equal(authority.state.changeCursor, c("changes:step3-after-update"));
    assert.equal(authority.state.learnedRemoteBatches.length, 1);
    const learned = authority.state.learnedRemoteBatches[0]!;
    assert.equal(learned.checkpoint.batchId, batchId);
    assert.equal(learned.changes.length, 1);
    const change = learned.changes[0]!;
    assert.equal(change.kind, "upsert");
    if (change.kind === "upsert") assert.equal(change.entry.remoteObjectId, STABLE_ID);
  }

  assert.ok(assembled.server.seen.some(({ url, method }) =>
    method === "PATCH" &&
    url.includes("/upload/drive/v3/files/stable-file-A") &&
    url.includes("uploadType=resumable")),
  "the continuity proof must traverse the accepted same-ID provider mutation endpoint");
  assert.equal(assembled.server.seen.some(({ method }) => method === "DELETE"), false);
});

test("DEC339 Step 3 refuses a Changes continuity failure without advancing inventory or cursor", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const storage = await seeded(factory);
  const assembled = assembledStep3();

  const baseline = await new VerifiedInventoryBaselineCoordinator(assembled.reader, storage)
    .publishBaseline(fence, g("step3-gap-baseline"));
  assert.equal(baseline.status, "published");

  const before = await storage.publicationSnapshot(fence);
  assert.equal(before.status, "trusted-fence");
  if (before.status !== "trusted-fence") return;

  const mutation = await assembled.drive.updateExisting(stableUpdateIdentity(), updateBytes);
  assert.equal(mutation.status, "verified-effect");
  assembled.server.incompleteChanges = true;

  const result = await new VerifiedInventoryBaselineCoordinator(assembled.reader, storage)
    .publishIncremental(
      fence,
      g("step3-gap-after-update"),
      contractId<"RemoteIngestionBatchId">("step3-gap-batch") as RemoteIngestionBatchId,
    );
  assert.notEqual(result.status, "published");

  const after = await storage.publicationSnapshot(fence);
  assert.equal(after.status, "trusted-fence");
  if (after.status === "trusted-fence") {
    assert.equal(after.value.activeGeneration, before.value.activeGeneration);
    assert.equal(after.value.canonicalCursor, before.value.canonicalCursor);
  }
});
