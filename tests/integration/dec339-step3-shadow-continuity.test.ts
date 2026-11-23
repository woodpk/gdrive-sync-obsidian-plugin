import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ChangeCursor,
  type InventoryGeneration,
  type InventoryIdentityFence,
  type RemoteIngestionBatchId,
} from "../../src/contracts";
import {
  type InventoryDriveChange,
  type InventoryDriveChangesPage,
  type InventoryDriveFetch,
  type InventoryDriveFile,
  type InventoryDriveListPage,
  type InventoryMetadataSource,
} from "../../src/drive/inventory-metadata-source";
import { VerifiedMetadataInventoryReader } from "../../src/drive/verified-metadata-inventory-reader";
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

const folder = "application/vnd.google-apps.folder";
const hash1 = "11".repeat(32);
const hash2 = "22".repeat(32);

function root(id: string, name: string, role: string): InventoryDriveFile {
  return {
    id, name, mimeType: folder, parents: [String(fence.managedRootId)], trashed: false,
    appProperties: { brainSyncRole: role },
  };
}

function file(version: string, hash: string): InventoryDriveFile {
  return {
    id: "stable-file-A",
    name: "note.md",
    mimeType: "text/plain",
    parents: [String(fence.contentDomainRootId)],
    trashed: false,
    version,
    size: version === "1" ? "5" : "9",
    sha256Checksum: hash,
    appProperties: {
      brainManagedRootId: String(fence.managedRootId),
      brainSyncDomain: "content",
    },
  };
}

class Step3Provider implements InventoryMetadataSource {
  readonly contentRoot = root(String(fence.contentDomainRootId), "vault", "brain-sync-content");
  readonly configRoot = root(String(fence.configDomainRootId),
    "__brain_sync_portable_config__", "brain-sync-portable-config");
  current = file("1", hash1);
  terminal: ChangeCursor = c("changes:step3-baseline");
  events: InventoryDriveChange[] = [];
  incompleteChanges = false;

  async verifyFence(_fence: InventoryIdentityFence): Promise<InventoryDriveFetch<void>> {
    return { status: "ok", value: undefined };
  }

  async getStartToken(): Promise<InventoryDriveFetch<string>> {
    return { status: "ok", value: "changes:step3-start" };
  }

  async getFile(objectId: string): Promise<InventoryDriveFetch<InventoryDriveFile>> {
    if (objectId === this.contentRoot.id) return { status: "ok", value: this.contentRoot };
    if (objectId === this.configRoot.id) return { status: "ok", value: this.configRoot };
    if (objectId === this.current.id) return { status: "ok", value: this.current };
    return { status: "unknown", reason: "not-visible" };
  }

  async listChildren(parent: string, _token?: string, name?: string):
    Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    const values = parent === this.contentRoot.id ? [this.current] : [];
    return { status: "ok", value: {
      files: values.filter(item => name === undefined || item.name === name),
      incompleteSearch: false,
    } };
  }

  async listMarked(): Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    return { status: "ok", value: { files: [this.current], incompleteSearch: false } };
  }

  async listChanges(_token: string): Promise<InventoryDriveFetch<InventoryDriveChangesPage>> {
    if (this.incompleteChanges)
      return { status: "partial", reason: "incomplete-step3-changes-page" };
    return { status: "ok", value: {
      changes: [...this.events],
      newStartPageToken: String(this.terminal),
    } };
  }

  applySameIdContentUpdate(): void {
    this.current = file("2", hash2);
    this.terminal = c("changes:step3-after-update");
    this.events = [{ fileId: this.current.id, removed: false, file: this.current }];
  }
}

async function publishBaseline(
  provider: Step3Provider,
  storage: IndexedDbInventoryObservationStore,
): Promise<VerifiedInventoryBaselineCoordinator> {
  const reader = new VerifiedMetadataInventoryReader(provider);
  const coordinator = new VerifiedInventoryBaselineCoordinator(reader, storage);
  const result = await coordinator.publishBaseline(fence, g("step3-baseline"));
  assert.equal(result.status, "published");
  return coordinator;
}

test("DEC362-14 / DEC339 Step 3 preserves stable ID across content update -> Changes -> persisted inventory", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const storage = await seeded(factory);
  const provider = new Step3Provider();
  await publishBaseline(provider, storage);

  let read = await storage.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status !== "verified-observation") return;
  const before = await read.value.getById(contractId<"RemoteObjectId">("stable-file-A"));
  assert.equal(before.status, "verified-observation");
  if (before.status === "verified-observation") {
    assert.equal(before.value.remoteObjectId, contractId<"RemoteObjectId">("stable-file-A"));
    assert.equal(before.value.revision, "1");
    assert.equal(before.value.content?.hash, "sha256:" + hash1);
  }
  await read.value.release();

  provider.applySameIdContentUpdate();
  const generation = g("step3-after-update");
  const batchId = contractId<"RemoteIngestionBatchId">("step3-same-id-batch") as RemoteIngestionBatchId;
  const result = await new VerifiedInventoryBaselineCoordinator(
    new VerifiedMetadataInventoryReader(provider), storage,
  ).publishIncremental(fence, generation, batchId);
  assert.equal(result.status, "published");

  const restarted = new IndexedDbInventoryObservationStore("device:idb:test", factory);
  read = await restarted.openRead();
  assert.equal(read.status, "verified-observation");
  if (read.status !== "verified-observation") return;
  const after = await read.value.getById(contractId<"RemoteObjectId">("stable-file-A"));
  assert.equal(after.status, "verified-observation");
  if (after.status === "verified-observation") {
    assert.equal(after.value.remoteObjectId, contractId<"RemoteObjectId">("stable-file-A"),
      "ordinary content revision must preserve the established Drive identity");
    assert.equal(after.value.revision, "2");
    assert.equal(after.value.content?.hash, "sha256:" + hash2);
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
    if (change.kind === "upsert")
      assert.equal(change.entry.remoteObjectId, contractId<"RemoteObjectId">("stable-file-A"));
  }
});

test("DEC339 Step 3 refuses incomplete Changes without advancing inventory generation or canonical cursor", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const storage = await seeded(factory);
  const provider = new Step3Provider();
  await publishBaseline(provider, storage);

  const before = await storage.publicationSnapshot(fence);
  assert.equal(before.status, "trusted-fence");
  if (before.status !== "trusted-fence") return;

  provider.applySameIdContentUpdate();
  provider.incompleteChanges = true;
  const result = await new VerifiedInventoryBaselineCoordinator(
    new VerifiedMetadataInventoryReader(provider), storage,
  ).publishIncremental(
    fence,
    g("step3-incomplete-update"),
    contractId<"RemoteIngestionBatchId">("step3-incomplete-batch") as RemoteIngestionBatchId,
  );
  assert.notEqual(result.status, "published");

  const after = await storage.publicationSnapshot(fence);
  assert.equal(after.status, "trusted-fence");
  if (after.status === "trusted-fence") {
    assert.equal(after.value.activeGeneration, before.value.activeGeneration);
    assert.equal(after.value.canonicalCursor, before.value.canonicalCursor);
  }
});
