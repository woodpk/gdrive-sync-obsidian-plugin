import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type ChangeCursor, type RemoteObjectId } from "../../src/contracts/common";
import { inventoryContinuityFingerprint, type InventoryGeneration, type InventoryIdentityFence } from "../../src/contracts/verified-metadata-inventory";
import {
  type InventoryDriveChange, type InventoryDriveFile, type InventoryDriveFetch,
  type InventoryDriveListPage, type InventoryDriveChangesPage, type InventoryMetadataSource,
  GoogleDriveInventoryMetadataSource,
} from "../../src/drive/inventory-metadata-source";
import { VerifiedMetadataInventoryReader } from "../../src/drive/verified-metadata-inventory-reader";
import type { GoogleDriveAdapter } from "../../src/drive/google-drive-port";
import type { GoogleHttpTransport } from "../../src/drive/transport";

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
  currentStartToken = false;
  markedCalls = 0;
  childrenCalls: string[] = [];
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
    return { status: "ok", value: this.currentStartToken ? this.token : "t0" };
  }
  async getFile(objectId: string): Promise<InventoryDriveFetch<InventoryDriveFile>> {
    const f = this.files.get(objectId);
    return f ? { status: "ok", value: f } : { status: "unknown", reason: "not-visible" };
  }
  async listChildren(parent: string, token?: string, name?: string):
    Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    this.childrenCalls.push(parent);
    return { status: "ok", value: {
      files: (this.children.get(parent) ?? []).filter(f => name === undefined || f.name === name),
      incompleteSearch: this.partial && parent === "dir",
      ...(this.nextPage && parent === "dir" ? { nextPageToken: this.nextPage } : {}),
    } };
  }
  async listMarked(): Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    this.markedCalls++;
    return { status: "ok", value: { files: this.marked, incompleteSearch: false } };
  }
  async listChanges(_token?: string): Promise<InventoryDriveFetch<InventoryDriveChangesPage>> {
    return { status: "ok", value: { changes: this.events, newStartPageToken: this.token } };
  }
}
const reader = (provider: Provider) => new VerifiedMetadataInventoryReader(provider);

test("D339-10 fresh root-wide managed census rejects out-of-domain marked file", async () => {
  const p = new Provider();
  const moved = item("escaped", "escaped.md", "outside", "content");
  p.files.set("outside", { id: "outside", name: "Elsewhere", mimeType: folder,
    parents: [], trashed: false, appProperties: {} });
  p.marked.push(moved);
  const proof = await reader(p).verifyRootWideManagedProvenance(fence);
  assert.equal(proof.status, "recovery-required");
  assert.match(proof.reason, /outside-expected-domain/);
});

test("D339-10 fresh root-wide managed census rejects incomplete or untrusted provider evidence", async () => {
  const p = new Provider();
  assert.equal((await reader(p).verifyRootWideManagedProvenance(fence)).status, "ok");
  p.verified = false;
  assert.equal((await reader(p).verifyRootWideManagedProvenance(fence)).status, "incompatible");
  p.verified = true;
  p.marked = [{ ...p.marked[0]!, appProperties: { brainManagedRootId: "managed",
    brainSyncDomain: "portable-config" } }];
  assert.equal((await reader(p).verifyRootWideManagedProvenance(fence)).status, "recovery-required");
});

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
  p.marked = [p.files.get("dir")!, updated];
  p.children.set("dir", [updated]);
  const delta = await reader(p).incremental(fence, generation("g2"), cursor("t1"), base.value.entities);
  assert.equal(delta.status, "ok");
  if (delta.status === "ok") {
    assert.equal(delta.value.overlays.length, 1);
    assert.deepEqual(delta.value.invalidatedParentIds, [id("dir")]);
    assert.equal(delta.value.publishAuthorized, false);
    assert.equal(delta.value.terminalCursor, cursor("t2"));
  }
});

test("verified trashed stable-ID becomes an observational mask, not a deletion proof", async () => {
  const p = new Provider();
  const baseline = await reader(p).baseline(fence, generation("g1"));
  assert.equal(baseline.status, "ok");
  if (baseline.status !== "ok") return;
  const trashed = { ...p.files.get("doc")!, trashed: true };
  p.files.set("doc", trashed);
  p.children.set("dir", []);
  p.marked = [p.files.get("dir")!];
  p.events = [{ fileId: "doc", removed: true, file: trashed }];
  p.token = "t2";
  const delta = await reader(p).incremental(fence, generation("g2"), cursor("t1"), baseline.value.entities);
  assert.equal(delta.status, "ok");
  if (delta.status === "ok") {
    assert.deepEqual(delta.value.overlays.map(row => row.kind), ["mask"]);
    assert.deepEqual(delta.value.learnedChanges.map(change => change.kind), ["removed"]);
    assert.equal(delta.value.publishAuthorized, false);
    assert.equal(delta.value.coverage.every(c => c.visibility === "app-visible"), true);
  }
});

test("bare removed event never turns a previously tracked file into a deletion claim", async () => {
  const p = new Provider();
  const baseline = await reader(p).baseline(fence, generation("g1"));
  assert.equal(baseline.status, "ok");
  if (baseline.status !== "ok") return;
  p.events = [{ fileId: "doc", removed: true }];
  assert.equal((await reader(p).incremental(fence, generation("g2"), cursor("t1"),
    baseline.value.entities)).status, "unknown");
});

test("incremental root-wide census refuses an unobserved marked entrant", async () => {
  const p = new Provider();
  const baseline = await reader(p).baseline(fence, generation("g1"));
  assert.equal(baseline.status, "ok");
  if (baseline.status !== "ok") return;
  p.marked.push(item("unexpected", "entered.md", "dir", "content"));
  assert.equal((await reader(p).incremental(fence, generation("g2"), cursor("t1"),
    baseline.value.entities)).status, "unknown");
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
    assert.equal(result.value.observedLogicalPath, "A/doc.md");
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

test("targeted normalized case collisions cannot masquerade as unique occupancy", async () => {
  const p = new Provider();
  p.children.get("dir")?.push(item("different-case", "DOC.md", "dir", "content"));
  assert.equal((await reader(p).targeted(fence, generation("g1"), {
    remoteObjectId: id("doc"), parentRemoteObjectId: id("dir"),
    name: "doc.md", domain: "content", purpose: "precondition",
  })).status, "unknown");
});

test("new folder in the Changes scan window requires subtree rebaseline", async () => {
  const p = new Provider();
  p.events = [{ fileId: "new-folder", removed: false,
    file: item("new-folder", "created", "content", "content", folder) }];
  assert.equal((await reader(p).baseline(fence, generation("g1"))).status, "unknown");
});

test("targeted exact-ID and sibling metadata must match across separate reads", async () => {
  const p = new Provider();
  const diverged = { ...p.files.get("doc")!, version: "2" };
  p.children.set("dir", [diverged]);
  assert.equal((await reader(p).targeted(fence, generation("g1"), {
    remoteObjectId: id("doc"), parentRemoteObjectId: id("dir"),
    name: "doc.md", domain: "content", purpose: "effect-convergence",
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


test("DEC339 F02 fresh census reads shared ancestors once per invocation and rejects contradictory fresh evidence", async () => {
  const p = new Provider();
  const original = p.getFile.bind(p);
  const reads: string[] = [];
  p.getFile = async key => { reads.push(key); return original(key); };
  for (let i = 0; i < 64; i++) {
    const extra = item("sibling-" + i, "sibling-" + i + ".md", "dir", "content");
    p.files.set(extra.id, extra); p.marked.push(extra);
  }
  const r = reader(p);
  assert.equal((await r.verifyRootWideManagedProvenance(fence)).status, "ok");
  assert.deepEqual(reads, ["dir"]);
  assert.equal((await r.verifyRootWideManagedProvenance(fence)).status, "ok");
  assert.deepEqual(reads, ["dir", "dir"], "no cross-run ancestor cache");
  p.files.set("dir", { ...p.files.get("dir")!, parents: ["config"] });
  const contradictory = await r.verifyRootWideManagedProvenance(fence);
  assert.equal(contradictory.status, "recovery-required");
  assert.equal(contradictory.reason, "managed-object-ancestor-contradicts-census");
  assert.deepEqual(reads, ["dir", "dir", "dir"]);
});

test("DEC339 F02 fresh census rejects inaccessible shared ancestor and duplicate marked ID", async () => {
  const p = new Provider();
  p.files.delete("dir");
  const r = reader(p);
  assert.equal((await r.verifyRootWideManagedProvenance(fence)).status, "recovery-required");
  p.marked.push(p.marked[0]!);
  const duplicate = await r.verifyRootWideManagedProvenance(fence);
  assert.equal(duplicate.status, "recovery-required");
  assert.equal(duplicate.reason, "duplicate-managed-provenance-identity");
});

/** DEC-365 independent provider-level test family: app-owned private corpus only. */
const continuityFence = {
  ...fence,
  scopePolicyFingerprint: inventoryContinuityFingerprint("sha256:" + "a".repeat(64), "sha256:" + "b".repeat(64)),
};
function continuityProvider(): Provider {
  const p = new Provider();
  p.currentStartToken = true;
  p.files = new Map([...p.files].map(([id, file]) => [id, { ...file, ownedByMe: true }]));
  p.children = new Map([...p.children].map(([id, children]) =>
    [id, children.map(file => p.files.get(file.id) ?? { ...file, ownedByMe: true })]));
  p.marked = p.marked.map(file => p.files.get(file.id) ?? { ...file, ownedByMe: true });
  return p;
}
async function continuityBaseline(p: Provider) {
  const baseline = await reader(p).baseline(continuityFence, generation("continuity-base"));
  if (baseline.status !== "ok") throw new Error("continuity fixture baseline failed: " + baseline.reason);
  assert.ok(baseline.value.coverage.every(x => x.proofBasis === "physical-baseline"));
  return baseline.value;
}

test("DEC365 nominal unchanged replay reuses ID graph without any global marked census", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  const markedBefore = p.markedCalls;
  const childrenBefore = p.childrenCalls.length;
  const result = await reader(p).incremental(continuityFence, generation("continuity-next"),
    cursor("t1"), base.entities);
  if (result.status !== "ok") throw new Error("unchanged continuity rejected: " + result.reason);
  assert.equal(result.value.terminalCursor, cursor("t1"));
  assert.deepEqual(result.value.overlays, []);
  assert.deepEqual(result.value.invalidatedParentIds, []);
  assert.equal(result.value.learnedChanges.length, 0);
  assert.equal(p.markedCalls, markedBefore);
  assert.equal(p.childrenCalls.length, childrenBefore);
  assert.ok(result.value.coverage.every(x => x.proofBasis === "changes-continuity"));
});

test("DEC365 same-ID leaf edit rereads only affected parent, preserving unrelated scope", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  p.token = "t2";
  const updated = { ...p.files.get("doc")!, version: "2" };
  p.files.set("doc", updated);
  p.children.set("dir", [updated]);
  p.marked = [p.files.get("dir")!, updated];
  p.events = [{ fileId: "doc", removed: false, file: updated }];
  p.childrenCalls = [];
  const before = p.markedCalls;
  const result = await reader(p).incremental(continuityFence, generation("continuity-edit"),
    cursor("t1"), base.entities);
  if (result.status !== "ok") throw new Error("changed continuity rejected: " + result.reason);
  assert.equal(p.markedCalls, before);
  assert.deepEqual(p.childrenCalls, ["dir"]);
  assert.equal(result.value.learnedChanges.length, 1);
  assert.equal(result.value.overlays.length, 1);
  assert.equal(result.value.coverage.find(x => x.scopeId === id("dir"))?.proofBasis, "affected-parent");
  assert.equal(result.value.coverage.find(x => x.scopeId === id("content"))?.proofBasis, "changes-continuity");
});

test("DEC365 unmarked extra occupant in affected parent defeats incremental completeness", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  const updated = { ...p.files.get("doc")!, version: "2" };
  p.files.set("doc", updated);
  p.children.set("dir", [updated, { ...item("foreign", "foreign.md", "dir", "content"), ownedByMe: true,
    appProperties: {} }]);
  p.events = [{ fileId: "doc", removed: false, file: updated }];
  p.token = "t2";
  const result = await reader(p).incremental(continuityFence, generation("continuity-foreign"),
    cursor("t1"), base.entities);
  assert.equal(result.status, "unknown");
  assert.equal(p.markedCalls, 1, "no extra census may hide an affected-parent contradiction");
});

test("DEC365 access loss is not proof of a deletion", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  p.events = [{ fileId: "doc", removed: true }];
  p.token = "t2";
  assert.equal((await reader(p).incremental(continuityFence, generation("continuity-loss"),
    cursor("t1"), base.entities)).status, "unknown");
});

test("DEC365 changed managed folder conservatively requires complete rebaseline", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  const moved = { ...p.files.get("dir")!, name: "Other" };
  p.files.set("dir", moved);
  p.events = [{ fileId: "dir", removed: false, file: moved }];
  p.token = "t2";
  const result = await reader(p).incremental(continuityFence, generation("continuity-folder"),
    cursor("t1"), base.entities);
  assert.equal(result.status, "unknown");
});

test("DEC365 incomplete or repeated Changes pages never authorize a candidate", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  const original = p.listChanges.bind(p);
  p.listChanges = async token => token === "t1" ?
    { status: "ok", value: { changes: [], nextPageToken: "page1" } } :
    { status: "ok", value: { changes: [], nextPageToken: "page1" } };
  assert.equal((await reader(p).incremental(continuityFence, generation("continuity-cycle"),
    cursor("t1"), base.entities)).status, "recovery-required");
  p.listChanges = original;
});

test("DEC365 empty intermediate Changes pages correctly reach terminal without global rediscovery", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  p.token = "t2";
  p.listChanges = async token => ({ status: "ok", value: token === "t1" ?
    { changes: [], nextPageToken: "page2" } :
    { changes: [], newStartPageToken: "t2" } });
  const before = p.markedCalls;
  const result = await reader(p).incremental(continuityFence, generation("continuity-empty-pages"),
    cursor("t1"), base.entities);
  if (result.status !== "ok") throw new Error("empty-page replay rejected: " + result.reason);
  assert.equal(p.markedCalls, before);
  assert.equal(result.value.terminalCursor, cursor("t2"));
  assert.equal(result.value.overlays.length, 0);
  assert.equal(result.value.learnedChanges.length, 0);
});

test("DEC365 silent provider omission cannot be instantly detected; explicit full baseline finds escaped marker", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  const escaped = { ...item("escaped", "elsewhere.md", "outside", "content"), ownedByMe: true };
  p.marked.push(escaped);
  p.files.set("escaped", escaped);
  p.events = []; // model an out-of-contract silent visibility failure
  const noChange = await reader(p).incremental(continuityFence, generation("continuity-silent"),
    cursor("t1"), base.entities);
  assert.equal(noChange.status, "ok", "normal feed trust does not magically reveal unreported changes");
  assert.equal((await reader(p).baseline(continuityFence,
    generation("continuity-physical-reconcile"))).status, "recovery-required",
    "periodic/explicit full proof must discover an escaped marked object");
});

test("DEC365 corpus exclusion refuses app-owned but Shared Drive metadata", async () => {
  const p = continuityProvider();
  const base = await continuityBaseline(p);
  p.token = "t2";
  const updated = { ...p.files.get("doc")!, version: "2", driveId: "shared-drive" };
  p.files.set("doc", updated);
  p.events = [{ fileId: "doc", removed: false, file: updated }];
  assert.equal((await reader(p).incremental(continuityFence, generation("continuity-corpus"),
    cursor("t1"), base.entities)).status, "unknown");
});

test("DEC365 Changes transport explicitly requests corpus removals, bounded app-visible fields and complete page tokens", async () => {
  const seen: string[] = [];
  const transport = { request: async (url: string) => {
    seen.push(url);
    return { ok: true as const, value: new Response(JSON.stringify({
      changes: [], newStartPageToken: "opaque:next",
    }), { status: 200 }) };
  } } as unknown as Pick<GoogleHttpTransport, "request">;
  const source = new GoogleDriveInventoryMetadataSource({} as GoogleDriveAdapter,
    transport, async () => "opaque-account-key");
  const result = await source.listChanges("opaque:previous");
  assert.equal(result.status, "ok");
  const url = new URL(seen[0]!);
  assert.equal(url.searchParams.get("includeRemoved"), "true");
  assert.equal(url.searchParams.get("includeCorpusRemovals"), "true");
  assert.equal(url.searchParams.get("restrictToMyDrive"), "false");
  assert.equal(url.searchParams.get("supportsAllDrives"), "false");
  assert.equal(url.searchParams.get("pageToken"), "opaque:previous");
  assert.match(url.searchParams.get("fields") ?? "", /ownedByMe/);
  assert.match(url.searchParams.get("fields") ?? "", /driveId/);
});

test("DEC365 Drive-level change event cannot be silently classified as personal file delta", async () => {
  const source = new GoogleDriveInventoryMetadataSource({} as GoogleDriveAdapter, {
    request: async () => ({ ok: true as const, value: new Response(JSON.stringify({
      changes: [{ changeType: "drive", driveId: "shared-drive", fileId: "opaque-file", removed: true }],
      newStartPageToken: "t2",
    }), { status: 200 }) }),
  } as unknown as Pick<GoogleHttpTransport, "request">, async () => "opaque-account-key");
  const result = await source.listChanges("t1");
  assert.equal(result.status, "recovery-required");
});
