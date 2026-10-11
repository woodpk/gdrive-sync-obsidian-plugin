/** D339-07B2: provider/Changes fault matrix; PHX-CI alone runs this file. */
import assert from "node:assert/strict";
import test from "node:test";
import { contractId } from "../src/contracts/common";
import type { InventoryIdentityFence, InventoryGeneration } from "../src/contracts/verified-metadata-inventory";
import { VerifiedMetadataInventoryReader } from "../src/drive/verified-metadata-inventory-reader";
import { GoogleDriveInventoryMetadataSource } from "../src/drive/inventory-metadata-source";
import type { InventoryDriveFile, InventoryDriveChangesPage, InventoryDriveFetch,
  InventoryDriveListPage, InventoryMetadataSource } from "../src/drive/inventory-metadata-source";
import type { GoogleHttpTransport } from "../src/drive/transport";
import type { GoogleDriveAdapter } from "../src/drive/google-drive-port";

const id = (s: string) => contractId<"RemoteObjectId">(s);
const tok = (s: string) => contractId<"ChangeCursor">(s);
const gen = (s: string) => s as InventoryGeneration;
const fence: InventoryIdentityFence = {
  vaultIdentity: contractId<"VaultIdentity">("vault:B2"), deviceIdentity: contractId<"DeviceIdentity">("device:B2"),
  pairedAccountKey: "opaque:B2", managedRootId: id("managed"),
  protocolVersion: contractId<"ProtocolVersion">("1"), contentDomainRootId: id("content"),
  configDomainRootId: id("config"), scopePolicyFingerprint: "B2", inventorySchemaVersion: 2,
};
const folder = "application/vnd.google-apps.folder";
const entry = (id: string, name: string, parent: string, domain = "content", mimeType = "text/plain"): InventoryDriveFile => ({
  id, name, parents: [parent], trashed: false, mimeType, version: "1",
  appProperties: { brainManagedRootId: "managed", brainSyncDomain: domain },
});
const roots: InventoryDriveFile[] = [
  { id: "content", name: "content", mimeType: folder, parents: ["managed"], trashed: false, appProperties: {} },
  { id: "config", name: "config", mimeType: folder, parents: ["managed"], trashed: false, appProperties: {} },
];
type Page = InventoryDriveFetch<InventoryDriveListPage>;
type ChangePage = InventoryDriveFetch<InventoryDriveChangesPage>;
const okList = (files: InventoryDriveFile[], next?: string): Page =>
  ({ status: "ok", value: { files, incompleteSearch: false, ...(next ? { nextPageToken: next } : {}) } });
const okChange = (changes: InventoryDriveChangesPage["changes"], next: string, terminal = false): ChangePage =>
  ({ status: "ok", value: { changes, ...(terminal ? { newStartPageToken: next } : { nextPageToken: next }) } });
class Source implements InventoryMetadataSource {
  files = new Map<string, InventoryDriveFile>();
  children = new Map<string, InventoryDriveFile[]>();
  marked: InventoryDriveFile[] = [];
  pages?: Map<string, Page>;
  changes = new Map<string, ChangePage>();
  listingCalls: string[] = [];
  changeCalls: string[] = [];
  fenceCalls = 0;
  valid = true;
  constructor() {
    const dir = entry("dir", "A", "content", "content", folder), doc = entry("doc", "doc.md", "dir");
    this.files = new Map([...roots, dir, doc].map(x => [x.id, x]));
    this.children = new Map([["content", [dir]], ["dir", [doc]], ["config", []]]);
    this.marked = [dir, doc];
    this.changes.set("t0", okChange([], "t1", true));
  }
  async verifyFence(): Promise<InventoryDriveFetch<void>> {
    this.fenceCalls++;
    return this.valid ? { status: "ok", value: undefined } : { status: "incompatible", reason: "account-mismatch" };
  }
  async getStartToken(): Promise<InventoryDriveFetch<string>> { return { status: "ok", value: "t0" }; }
  async getFile(key: string): Promise<InventoryDriveFetch<InventoryDriveFile>> {
    const value = this.files.get(key);
    return value ? { status: "ok", value } : { status: "unknown", reason: "unobserved-parent" };
  }
  async listChildren(parent: string, token?: string): Promise<Page> {
    this.listingCalls.push(parent + ":" + (token ?? ""));
    if (parent === "content" && this.pages) return this.pages.get(token ?? "") ??
      { status: "recovery-required", reason: "unprovided-page" };
    return okList(this.children.get(parent) ?? []);
  }
  async listMarked(): Promise<Page> { return okList(this.marked); }
  async listChanges(token: string): Promise<ChangePage> {
    this.changeCalls.push(token);
    return this.changes.get(token) ?? { status: "recovery-required", reason: "unprovided-changes" };
  }
}
const read = (p: Source) => new VerifiedMetadataInventoryReader(p);

test("B2-A05 baseline consumes 3 list pages and 3 Changes pages through one terminal cursor", async () => {
  const p = new Source(), dir = p.files.get("dir")!;
  p.pages = new Map([["", okList([dir], "list-1")], ["list-1", okList([], "list-2")],
    ["list-2", okList([])]]);
  p.changes = new Map([["t0", okChange([], "changes-1")],
    ["changes-1", okChange([], "changes-2")], ["changes-2", okChange([], "t2", true)]]);
  const result = await read(p).baseline(fence, gen("p0"));
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.deepEqual(p.listingCalls.slice(0, 3), ["content:", "content:list-1", "content:list-2"]);
  assert.deepEqual(p.changeCalls, ["t0", "changes-1", "changes-2"]);
  assert.equal(result.value.terminalCursor, tok("t2"));
  assert.equal(result.value.replayedEvents, 0);
  assert.equal(result.value.entities.length, 4);
  assert.equal(result.value.coverage.every(x => x.terminalCursor === tok("t2")), true);
  assert.equal(result.value.publishAuthorized, false);
});
test("B2-A05 partial middle or terminal list page never yields complete coverage", async () => {
  for (const bad of ["mid", "last"]) {
    const p = new Source(), dir = p.files.get("dir")!;
    const partial: Page = { status: "ok", value: { files: [], incompleteSearch: true } };
    p.pages = new Map([["", okList([dir], "mid")],
      ["mid", bad === "mid" ? partial : okList([], "last")],
      ["last", bad === "last" ? partial : okList([])]]);
    const outcome = await read(p).baseline(fence, gen(bad));
    assert.equal(outcome.status, "partial", bad);
    assert.deepEqual(p.changeCalls, [], bad);
    assert.ok(p.listingCalls.includes("content:" + bad), bad);
  }
});
test("B2-A05 failed continuation page stops baseline without requesting a Changes token", async () => {
  const p = new Source();
  p.pages = new Map([["", okList([p.files.get("dir")!], "middle")],
    ["middle", { status: "recovery-required", reason: "page-timeout" }]]);
  assert.equal((await read(p).baseline(fence, gen("fail"))).status, "recovery-required");
  assert.deepEqual(p.listingCalls, ["content:", "content:middle"]);
  assert.deepEqual(p.changeCalls, []);
});
test("B2-A06 missing, ambiguous or cycling Changes terminal never produces a baseline", async () => {
  for (const continuation of ["missing", "both", "cycle"]) {
    const p = new Source();
    p.changes.set("t0", continuation === "missing" ? { status: "ok", value: { changes: [] } } :
      continuation === "both" ? { status: "ok", value: {
        changes: [], nextPageToken: "t2", newStartPageToken: "t3" } } : okChange([], "t0"));
    assert.equal((await read(p).baseline(fence, gen(continuation))).status, "recovery-required");
    assert.deepEqual(p.changeCalls, ["t0"]);
  }
});
test("B2-A06 incremental 3-page replay materializes exact stable-ID update only at terminal", async () => {
  const p = new Source(), prior = await read(p).baseline(fence, gen("before"));
  assert.equal(prior.status, "ok");
  if (prior.status !== "ok") return;
  const newer = { ...p.files.get("doc")!, version: "8" };
  p.files.set("doc", newer); p.children.set("dir", [newer]); p.marked = [p.files.get("dir")!, newer];
  p.changes = new Map([["t1", okChange([], "step-1")],
    ["step-1", okChange([{ fileId: "doc", removed: false, file: newer }], "step-2")],
    ["step-2", okChange([], "t9", true)]]);
  p.changeCalls = [];
  const delta = await read(p).incremental(fence, gen("after"), tok("t1"), prior.value.entities);
  assert.equal(delta.status, "ok");
  if (delta.status !== "ok") return;
  assert.deepEqual(p.changeCalls, ["t1", "step-1", "step-2"]);
  assert.equal(delta.value.inputCursor, tok("t1"));
  assert.equal(delta.value.terminalCursor, tok("t9"));
  assert.equal(delta.value.overlays.length, 1);
  assert.equal(delta.value.overlays[0]?.kind, "upsert");
  assert.equal(delta.value.learnedChanges.length, 1);
  assert.equal(delta.value.publishAuthorized, false);
});
test("B2-A06 duplicate same-ID updates reduce to final version without extra overlay", async () => {
  const p = new Source(), prior = await read(p).baseline(fence, gen("pre"));
  assert.equal(prior.status, "ok");
  if (prior.status !== "ok") return;
  const v2 = { ...p.files.get("doc")!, version: "2" }, v3 = { ...v2, version: "3" };
  p.children.set("dir", [v3]); p.marked = [p.files.get("dir")!, v3];
  p.changes.set("t1", okChange([{ fileId: "doc", removed: false, file: v2 },
    { fileId: "doc", removed: false, file: v3 }], "t2", true));
  const delta = await read(p).incremental(fence, gen("post"), tok("t1"), prior.value.entities);
  assert.equal(delta.status, "ok");
  if (delta.status !== "ok") return;
  assert.equal(delta.value.overlays.length, 1);
  const overlay = delta.value.overlays[0];
  assert.equal(overlay?.kind, "upsert");
  if (overlay?.kind === "upsert") assert.equal(overlay.entity.revision, "3");
  assert.equal(delta.value.learnedChanges.length, 2);
});
test("B2-A06 positively outside account-wide event excludes; unknown ancestor fails closed", async () => {
  for (const proven of [true, false]) {
    const p = new Source(), prior = await read(p).baseline(fence, gen("base"));
    assert.equal(prior.status, "ok");
    if (prior.status !== "ok") return;
    const outside = { ...entry("outside-doc", "x.md", "outside"), appProperties: {} };
    if (proven) p.files.set("outside", { id: "outside", name: "Other", mimeType: folder,
      parents: [], trashed: false, appProperties: {} });
    p.changes.set("t1", okChange([{ fileId: outside.id, removed: false, file: outside }], "t2", true));
    const delta = await read(p).incremental(fence, gen("delta"), tok("t1"), prior.value.entities);
    assert.equal(delta.status, proven ? "ok" : "unknown");
    if (delta.status === "ok") {
      assert.deepEqual(delta.value.overlays, []);
      assert.deepEqual(delta.value.learnedChanges, []);
      assert.equal(delta.value.terminalCursor, tok("t2"));
    }
  }
});
test("B2-A05 raw HTTP list rejects missing completeness and preserves GET-only pagination", async () => {
  const calls: Array<{ url: URL; method: string }> = [];
  const http = { request: async (url: string, init: RequestInit = {}) => {
    const parsed = new URL(url);
    calls.push({ url: parsed, method: init.method ?? "GET" });
    const token = parsed.searchParams.get("pageToken");
    const body = token === null ? { files: [], incompleteSearch: false, nextPageToken: "p2" } :
      token === "p2" ? { files: [], incompleteSearch: false, nextPageToken: "p3" } :
        { files: [] };
    return { ok: true as const, value: new Response(JSON.stringify(body), { status: 200 }) };
  } } as Pick<GoogleHttpTransport, "request">;
  const source = new GoogleDriveInventoryMetadataSource({} as GoogleDriveAdapter, http, async () => "opaque:B2");
  const a = await source.listChildren("dir");
  const b = await source.listChildren("dir", "p2");
  const c = await source.listChildren("dir", "p3");
  assert.equal(a.status, "ok"); assert.equal(b.status, "ok"); assert.equal(c.status, "partial");
  if (a.status === "ok" && b.status === "ok") {
    assert.equal(a.value.nextPageToken, "p2"); assert.equal(b.value.nextPageToken, "p3");
  }
  assert.deepEqual(calls.map(x => x.url.searchParams.get("pageToken")), [null, "p2", "p3"]);
  assert.equal(calls.every(x => x.url.searchParams.get("fields")?.includes("incompleteSearch")), true);
  assert.deepEqual(calls.map(x => x.method), ["GET", "GET", "GET"]);
});
