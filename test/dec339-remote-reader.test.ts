import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type ChangeCursor, type RemoteObjectId } from "../src/contracts/common";
import type { InventoryGeneration, InventoryIdentityFence } from "../src/contracts/verified-metadata-inventory";
import {
  type InventoryDriveChange, type InventoryDriveFile, type InventoryDriveFetch,
  type InventoryDriveListPage, type InventoryDriveChangesPage, type InventoryMetadataSource,
  GoogleDriveInventoryMetadataSource,
} from "../src/drive/inventory-metadata-source";
import { VerifiedMetadataInventoryReader } from "../src/drive/verified-metadata-inventory-reader";
import type { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import type { GoogleHttpTransport } from "../src/drive/transport";

const id = (s: string) => contractId<"RemoteObjectId">(s) as RemoteObjectId;
const cursor = (s: string) => contractId<"ChangeCursor">(s) as ChangeCursor;
const generation = (s: string) => s as InventoryGeneration;
const fence: InventoryIdentityFence = {
  vaultIdentity: contractId<"VaultIdentity">("vault:test"),
  deviceIdentity: contractId<"DeviceIdentity">("device:test"),
  pairedAccountKey: "opaque-account-key",
  managedRootId: id("managed"),
  protocolVersion: contractId<"ProtocolVersion">("1"),
  contentDomainRootId: id("content"),
  configDomainRootId: id("config"),
  scopePolicyFingerprint: "scope:1", inventorySchemaVersion: 1,
};
const folder = "application/vnd.google-apps.folder";
const root = (id: string, name: string, role: string): InventoryDriveFile => ({
  id, name, mimeType: folder, parents: ["managed"], trashed: false,
  appProperties: { brainSyncRole: role },
});
const item = (id: string, name: string, parent: string,
  domain: "content" | "portable-config", kind = "text/plain"): InventoryDriveFile => ({
  id, name, mimeType: kind, parents: [parent], trashed: false,
  version: "1", appProperties: {
    brainManagedRootId: "managed", brainSyncDomain: domain,
  },
});
class Provider implements InventoryMetadataSource {
  files = new Map<string, InventoryDriveFile>();
  children = new Map<string, InventoryDriveFile[]>();
  marked: InventoryDriveFile[] = [];
  events: InventoryDriveChange[] = [];
  token = "t1";
  partial = false;
  nextPage?: string;
  verified = true;
  constructor() {
    const c = root("content", "vault", "brain-sync-content");
    const p = root("config", "__brain_sync_portable_config__", "brain-sync-portable-config");
    const dir = item("dir", "A", "content", "content", folder);
    const doc = item("doc", "doc.md", "dir", "content");
    this.files = new Map([c, p, dir, doc].map(x => [x.id, x]));
    this.children = new Map([["content", [dir]], ["dir", [doc]], ["config", []]]);
    this.marked = [dir, doc];
  }
  async verifyFence(): Promise<InventoryDriveFetch<void>> {
    return this.verified ? { status: "ok", value: undefined } :
      { status: "incompatible", reason: "paired-fence-invalid" };
  }
  async getStartToken(): Promise<InventoryDriveFetch<string>> {
    return { status: "ok", value: "t0" };
  }
  async getFile(objectId: string): Promise<InventoryDriveFetch<InventoryDriveFile>> {
    const f = this.files.get(objectId);
    return f ? { status: "ok", value: f } : { status: "unknown", reason: "not-visible" };
  }
  async listChildren(parent: string, token?: string, name?: string):
    Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    return { status: "ok", value: {
      files: (this.children.get(parent) ?? []).filter(f => name === undefined || f.name === name),
      incompleteSearch: this.partial && parent === "dir",
      ...(this.nextPage && parent === "dir" ? { nextPageToken: this.nextPage } : {}),
    } };
  }
  async listMarked(): Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    return { status: "ok", value: { files: this.marked, incompleteSearch: false } };
  }
  async listChanges(): Promise<InventoryDriveFetch<InventoryDriveChangesPage>> {
    return { status: "ok", value: { changes: this.events, newStartPageToken: this.token } };
  }
}
const reader = (provider: Provider) => new VerifiedMetadataInventoryReader(provider);

test("baseline retains stable IDs, parent ancestry, domain coverage, cursor and no publication authority", async () => {
  const p = new Provider();
  const result = await reader(p).baseline(fence, generation("g1"));
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.value.entities.length, 4);
  assert.equal(result.value.entities.find(e => e.remoteObjectId === id("doc"))?.logicalPath, "A/doc.md");
  assert.equal(result.value.entities.find(e => e.remoteObjectId === id("config"))?.parentRemoteObjectId, null);
  assert.equal(result.value.coverage.filter(c => c.scopeKind === "domain").length, 2);
  assert.ok(result.value.coverage.every(c => c.visibility === "app-visible"));
  assert.equal(result.value.inputCursor, cursor("t0"));
  assert.equal(result.value.terminalCursor, cursor("t1"));
  assert.equal(result.value.publishAuthorized, false);
});

test("duplicate same-name siblings remain separate IDs and are explicitly reported ambiguous", async () => {
  const p = new Provider();
  const same = item("doc-other", "DOC.md", "dir", "content");
  p.files.set(same.id, same);
  p.children.get("dir")?.push(same);
  p.marked.push(same);
  const result = await reader(p).baseline(fence, generation("g1"));
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.value.entities.filter(e => String(e.logicalPath).toLowerCase() === "a/doc.md").length, 2);
    assert.equal(result.value.normalizedSiblingCollisions.length, 1);
  }
});

test("missing provider completeness never yields a complete baseline", async () => {
  const p = new Provider(); p.partial = true;
  assert.equal((await reader(p).baseline(fence, generation("g1"))).status, "partial");
});

test("cyclic page tokens cannot be interpreted as exhausted pagination", async () => {
  const p = new Provider(); p.nextPage = "loop";
  assert.equal((await reader(p).baseline(fence, generation("g1"))).status, "recovery-required");
});

test("root-wide marked object outside traversed scope defeats apparent completeness", async () => {
  const p = new Provider();
  const escaped = item("escaped", "outside", "other-parent", "content");
  p.files.set(escaped.id, escaped); p.marked.push(escaped);
  assert.equal((await reader(p).baseline(fence, generation("g1"))).status, "recovery-required");
});

test("tracked ID loss of access is not synthesized as a deletion during baseline replay", async () => {
  const p = new Provider();
  p.events = [{ fileId: "doc", removed: true }];
  assert.equal((await reader(p).baseline(fence, generation("g1"))).status, "unknown");
});

test("unclassifiable unknown-ID account-wide loss of access never gets silently ignored", async () => {
  const p = new Provider();
  p.events = [{ fileId: "outside-unknown", removed: true }];
  assert.equal((await reader(p).baseline(fence, generation("g1"))).status, "unknown");
});

test("provably outside account-wide file change can be excluded without masking tracked rows", async () => {
  const p = new Provider();
  const externalRoot: InventoryDriveFile = {
    id: "external", name: "Other", mimeType: folder, parents: [], trashed: false,
    appProperties: {},
  };
  const external = { ...item("external-child", "elsewhere.md", "external", "content"),
    appProperties: {} };
  p.files.set("external", externalRoot);
  p.events = [{ fileId: "external-child", removed: false, file: external }];
  const result = await reader(p).baseline(fence, generation("g1"));
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.value.entities.length, 4);
    assert.equal(result.value.replayedEvents, 1);
  }
});

test("fresh file update replays by ID and rechecks affected same-parent occupancy", async () => {
  const p = new Provider();
  const updated = { ...p.files.get("doc")!, version: "2" };
  p.files.set("doc", updated);
  p.children.set("dir", [updated]);
  p.marked = [p.files.get("dir")!, updated];
  p.events = [{ fileId: "doc", removed: false, file: updated }];
  const result = await reader(p).baseline(fence, generation("g2"));
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(result.value.entities.find(e => e.remoteObjectId === id("doc"))?.revision, "2");
    assert.equal(result.value.replayedEvents, 1);
  }
});

test("incremental edits preserve predecessor as read-only input and invalidate affected occupancy", async () => {
  const p = new Provider();
  const base = await reader(p).baseline(fence, generation("g1"));
  assert.equal(base.status, "ok");
  if (base.status !== "ok") return;
  p.token = "t2";
  const updated = { ...p.files.get("doc")!, version: "3" };
  p.events = [{ fileId: "doc", removed: false, file: updated }];
  const delta = await reader(p).incremental(fence, generation("g2"), cursor("t1"), base.value.entities);
  assert.equal(delta.status, "ok");
  if (delta.status === "ok") {
    assert.equal(delta.value.overlays.length, 1);
    assert.deepEqual(delta.value.invalidatedParentIds, [id("dir")]);
    assert.equal(delta.value.publishAuthorized, false);
    assert.equal(delta.value.terminalCursor, cursor("t2"));
  }
});

test("targeted query requires exact object, exhaustive unique siblings and root-wide provenance", async () => {
  const p = new Provider();
  const result = await reader(p).targeted(fence, generation("g1"), {
    remoteObjectId: id("doc"), parentRemoteObjectId: id("dir"),
    name: "doc.md", domain: "content", purpose: "effect-convergence",
  });
  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.deepEqual(result.value.siblingIds, [id("doc")]);
    assert.equal(result.value.rootWideMarkedProvenanceRechecked, true);
    assert.equal(result.value.executorProofAuthorized, false);
    assert.equal(result.value.appVisibleOnly, true);
  }
});

test("targeted sibling ambiguity refuses sole-occupancy claim", async () => {
  const p = new Provider();
  const sibling = item("duplicate", "doc.md", "dir", "content");
  p.children.get("dir")?.push(sibling);
  assert.equal((await reader(p).targeted(fence, generation("g1"), {
    remoteObjectId: id("doc"), parentRemoteObjectId: id("dir"),
    name: "doc.md", domain: "content", purpose: "precondition",
  })).status, "unknown");
});

test("paired identity loss or stale revision defeats targeted read", async () => {
  const p = new Provider();
  p.verified = false;
  assert.equal((await reader(p).baseline(fence, generation("g1"))).status, "incompatible");
  p.verified = true;
  assert.equal((await reader(p).targeted(fence, generation("g1"), {
    remoteObjectId: id("doc"), parentRemoteObjectId: id("dir"), name: "doc.md",
    domain: "content", purpose: "precondition", expectedRevision: "wrong",
  })).status, "stale");
});

test("Drive HTTP source requests incompleteSearch, rejects partial pages and never sends writes", async () => {
  const seen: Array<{ url: string; method: string }> = [];
  const transport = { request: async (url: string, init: RequestInit = {}) => {
    seen.push({ url, method: init.method ?? "GET" });
    return { ok: true as const, value: new Response(JSON.stringify({
      files: [item("doc", "doc.md", "dir", "content")], incompleteSearch: true,
    }), { status: 200, headers: { "content-type": "application/json" } }) };
  } } as unknown as Pick<GoogleHttpTransport, "request">;
  const drive = { validateManagedRoot: async () => ({ ok: true as const,
    value: { status: "valid" as const,
      identity: { rootId: fence.managedRootId, vaultIdentity: fence.vaultIdentity,
        protocolVersion: fence.protocolVersion } } }) } as unknown as Pick<GoogleDriveAdapter, "validateManagedRoot">;
  const source = new GoogleDriveInventoryMetadataSource(drive, transport, async () => "opaque-account-key");
  const response = await source.listChildren("dir");
  assert.equal(response.status, "partial");
  assert.match(seen[0].url, /incompleteSearch/);
  assert.deepEqual(seen.map(x => x.method), ["GET"]);
});

test("provider rejects both terminal and continuation tokens on one Changes page", async () => {
  const transport = { request: async () => ({ ok: true as const,
    value: new Response(JSON.stringify({
      changes: [], nextPageToken: "next", newStartPageToken: "terminal",
    }), { status: 200 }) }) } as unknown as Pick<GoogleHttpTransport, "request">;
  const source = new GoogleDriveInventoryMetadataSource({} as GoogleDriveAdapter,
    transport, async () => "opaque-account-key");
  assert.equal((await source.listChanges("previous")).status, "recovery-required");
});
