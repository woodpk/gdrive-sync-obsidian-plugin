import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contractId, type BinaryContentSource, type ContentHash, type MutationIntentId, type RemoteObjectId, type RemoteRevisionId, type VaultIdentity, type VaultPath } from "../../src/contracts";
import type { DriveResult, ManagedRemoteIdentity } from "../../src/contracts/google-drive";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../../src/diagnostics/diagnostic-logger";
import { GoogleOAuthSession, ObsidianSecretStore } from "../../src/drive/auth";
import { GoogleDriveAdapter } from "../../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../../src/drive/transport";

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string) { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string) { this.values.set(id, value); }
  deleteSecret(id: string) { this.values.delete(id); }
}

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

class StubTransport extends GoogleHttpTransport {
  constructor(private readonly handler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>) {
    const backing = new MemorySecrets();
    super(new GoogleOAuthSession({ clientId: "c", redirectUri: "https://callback.invalid" }, new ObsidianSecretStore(backing)));
  }
  override request(url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> { return this.handler(url, init); }
}

async function logger(): Promise<DiagnosticLogger> {
  const result = new DiagnosticLogger({
    persistence: new MemoryDiagnostics(),
    level: "trace",
    retentionLimit: 500,
    consoleMirror: false,
    platform: "mobile",
  });
  await result.initialize();
  return result;
}

const ok = (body: unknown, status = 200, headers: Record<string, string> = {}) => Promise.resolve({
  ok: true,
  value: new Response(body === undefined ? undefined : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } }),
} as DriveResult<Response>);
const failure = (kind: "not-found" | "transient-failure" | "conflict", detail: string = kind) => Promise.resolve({ ok: false, signal: { kind, detail } } as DriveResult<Response>);
const id = (value: string) => contractId<"RemoteObjectId">(value) as RemoteObjectId;
const path = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const intent = (value: string) => contractId<"MutationIntentId">(value) as MutationIntentId;
const revision = (value: string) => contractId<"RemoteRevisionId">(value) as RemoteRevisionId;
const contentHash = (value: string) => contractId<"ContentHash">(value) as ContentHash;
const vault = (value: string) => contractId<"VaultIdentity">(value) as VaultIdentity;
const norm = (url: string) => decodeURIComponent(url).replace(/\+/g, " ");
const folderMime = "application/vnd.google-apps.folder";
const root = () => ({ id: "root", name: "BRAIN Sync", mimeType: folderMime, trashed: false, appProperties: { brainSyncRole: "brain-sync-root", brainVaultIdentity: "vault-1", brainProtocolVersion: "1" } });
const contentRoot = () => ({ id: "content", name: "vault", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-content" } });
const configRoot = () => ({ id: "config", name: "__brain_sync_portable_config__", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-portable-config" } });
const privateFolder = () => ({ id: "private", name: "private", mimeType: folderMime, parents: ["content"], trashed: false, appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const originalFile = () => ({ id: "pred", name: "SECRET-target.md", mimeType: "text/plain", parents: ["private"], trashed: false, size: "3", sha256Checksum: "old", version: "old-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const changedFile = () => ({ ...originalFile(), size: "4", sha256Checksum: "abc", version: "new-revision" });
const unrelatedFile = () => ({ ...changedFile(), id: "third", sha256Checksum: "third" });

function updateIdentity(secretPath = "private/SECRET-target.md") {
  const target = path(secretPath);
  return {
    kind: "existing-file-content-update",
    intentId: intent("intent:" + secretPath),
    remoteObjectId: id("pred"),
    expectedRevision: revision("old-revision"),
    path: target,
    updateProtocol: "stable-object-in-place",
    intendedContent: { algorithm: "sha256", hash: contentHash("sha256:abc"), sizeBytes: 4 },
    identityAuthority: { status: "unique", generation: contractId<"SemanticStateGeneration">("generation:1"), path: target, remoteObjectId: id("pred") },
  } as never;
}

const bytes: BinaryContentSource = { sizeBytes: 4, async *openChunks() { yield new Uint8Array([1, 2, 3, 4]); } };
type UpdateScenario = "success" | "missing-from-list" | "upload-ambiguous" | "post-list-stale" | "third-occupant";

async function updateFixture(scenario: UpdateScenario) {
  const diagnostics = await logger();
  diagnostics.beginSyncRun("log03-test");
  let applied = false;
  let uploadCalls = 0;
  let metaPatchCalls = 0;
  let listCalls = 0;
  const identity = { rootId: id("root"), vaultIdentity: vault("vault-1"), protocolVersion: contractId<"ProtocolVersion">("1") };
  const handler = async (url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> => {
    const decoded = norm(url);
    if (decoded.includes("/about?")) return ok({ user: { permissionId: "acct" } });
    if (url === "https://upload.example/session") {
      const headers = new Headers(init.headers);
      if (headers.get("content-range") === "bytes */4") return failure("transient-failure", "status-unobservable");
      applied = true;
      return scenario === "upload-ambiguous" ? failure("transient-failure", "upload-response-lost") : ok(changedFile());
    }
    if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files/pred?")) {
      assert.equal(init.method, "PATCH");
      uploadCalls++;
      return ok({}, 200, { location: "https://upload.example/session" });
    }
    if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) throw new Error("replacement object must never be created");
    if (url.includes("/files/pred?")) {
      if (init.method === "PATCH") { metaPatchCalls++; throw new Error("predecessor trash must never be dispatched"); }
      return ok(applied ? changedFile() : originalFile());
    }
    if (url.includes("/files/private?")) return ok(privateFolder());
    if (url.includes("/files/content?")) return ok(contentRoot());
    if (url.includes("/files/config?")) return ok(configRoot());
    if (url.includes("/files/root?")) return ok(root());
    if (decoded.includes("'root' in parents") && decoded.includes("brain-sync-content")) return ok({ files: [contentRoot()] });
    if (decoded.includes("'root' in parents") && decoded.includes("name='__brain_sync_portable_config__'")) return ok({ files: [configRoot()] });
    if (decoded.includes("'content' in parents") && decoded.includes("name='private'")) return ok({ files: [privateFolder()] });
    if (decoded.includes("'private' in parents") && decoded.includes("name='SECRET-target.md'")) {
      listCalls++;
      if (scenario === "missing-from-list") return ok({ files: [] });
      if (scenario === "third-occupant") return ok({ files: [originalFile(), unrelatedFile()] });
      if (scenario === "post-list-stale" && applied) return ok({ files: [originalFile()] });
      return ok({ files: [applied ? changedFile() : originalFile()] });
    }
    throw new Error("unexpected request: " + decoded + " " + (init.method ?? "GET"));
  };
  const backing = new MemorySecrets();
  backing.setSecret("brain-gdrive-paired-account", "acct");
  const secrets = new ObsidianSecretStore(backing);
  const adapter = new GoogleDriveAdapter(
    new GoogleOAuthSession({ clientId: "c", redirectUri: "https://callback.invalid" }, secrets),
    new StubTransport(handler), secrets, diagnostics, () => identity as ManagedRemoteIdentity,
  );
  const outcome = await adapter.updateExisting(updateIdentity(), bytes);
  return { diagnostics, outcome, uploadCalls, metaPatchCalls, listCalls };
}

function semanticEvents(diagnostics: DiagnosticLogger) {
  return diagnostics.snapshot().filter(event => event.component === "drive.semantic");
}

test("LOG-03 same-ID observation refuses missing path occupant before any upload", async () => {
  const { diagnostics, outcome, uploadCalls, metaPatchCalls } = await updateFixture("missing-from-list");
  assert.equal(outcome.status, "conflict-preserved");
  assert.equal(uploadCalls, 0);
  assert.equal(metaPatchCalls, 0);
  const events = semanticEvents(diagnostics);
  assert.ok(events.some(event => event.event === "drive-exact-id-observation-result" && event.fields?.stage === "stable-update-before" && event.fields?.result === "present"));
  assert.ok(events.some(event => event.event === "drive-update-topology-observed" && event.fields?.stage === "stable-update-before"));
  assert.equal(diagnostics.renderText().includes("private/SECRET-target.md"), false);
  assert.equal(diagnostics.renderText().includes("intent:private/SECRET-target.md"), false);
});

test("LOG-03 ambiguous same-ID upload response is resolved by exact-ID post-observation", async () => {
  const { diagnostics, outcome, uploadCalls, metaPatchCalls } = await updateFixture("upload-ambiguous");
  assert.equal(outcome.status, "verified-effect");
  assert.equal(uploadCalls, 1);
  assert.equal(metaPatchCalls, 0);
  const events = semanticEvents(diagnostics);
  assert.ok(events.some(event => event.event === "drive-update-same-id-upload-result" && event.fields?.result === "uncertain" && event.fields?.driveSignal === "transient-failure"));
  assert.ok(events.some(event => event.event === "drive-exact-id-observation-result" && event.fields?.stage === "stable-update-after"));
  assert.ok(events.some(event => event.event === "drive-update-convergence" && event.fields?.result === "verified-effect"));
});

test("LOG-03 exact-ID metadata and stale path topology fail closed", async () => {
  const { diagnostics, outcome, uploadCalls, metaPatchCalls } = await updateFixture("post-list-stale");
  assert.equal(outcome.status, "outcome-unknown");
  assert.equal(uploadCalls, 1);
  assert.equal(metaPatchCalls, 0);
  assert.ok(semanticEvents(diagnostics).some(event => event.event === "drive-update-topology-observed" && event.fields?.stage === "stable-update-after"));
});

test("LOG-03 independent third occupant blocks update without uploading or deleting", async () => {
  const { diagnostics, outcome, uploadCalls, metaPatchCalls } = await updateFixture("third-occupant");
  assert.equal(outcome.status, "conflict-preserved");
  assert.equal(uploadCalls, 0);
  assert.equal(metaPatchCalls, 0);
  assert.ok(semanticEvents(diagnostics).some(event => event.event === "drive-update-topology-observed" && event.fields?.occupancyCount === 2));
});

test("LOG-03 successful stable-ID update records causal stages without candidate replacement", async () => {
  const { diagnostics, outcome, uploadCalls, metaPatchCalls } = await updateFixture("success");
  assert.equal(outcome.status, "verified-effect");
  assert.equal(uploadCalls, 1);
  assert.equal(metaPatchCalls, 0);
  const names = semanticEvents(diagnostics).map(event => event.event);
  for (const expected of [
    "drive-update-entered",
    "drive-update-same-id-upload-dispatch",
    "drive-update-same-id-upload-result",
    "drive-update-topology-observed",
    "drive-update-convergence",
  ]) assert.ok(names.includes(expected), expected + " missing");
  assert.equal(names.some(name => name.includes("predecessor-retirement") || name.includes("candidate-upload")), false);
});

test("LOG-03 create, move, and trash emit semantic operation events without exposing raw logical names", async () => {
  const diagnostics = await logger();
  const backing = new MemorySecrets();
  backing.setSecret("brain-gdrive-paired-account", "acct");
  const secrets = new ObsidianSecretStore(backing);
  const existing = { id: "move-id", name: "SECRET-old.md", mimeType: "text/plain", parents: ["content"], trashed: false, size: "1", version: "1", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } };
  const handler = async (url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> => {
    const decoded = norm(url);
    if (url.includes("/about?")) return ok({ user: { permissionId: "acct" } });
    if (url.includes("/files/move-id?")) {
      if (init.method === "PATCH") return ok({ ...existing, name: "SECRET-new.md", version: "2" });
      return ok(existing);
    }
    if (url.includes("/files/content?")) return ok(contentRoot());
    if (url.includes("/files/root?")) return ok(root());
    if (decoded.includes("'root' in parents") && decoded.includes("brain-sync-content")) return ok({ files: [contentRoot()] });
    if (decoded.includes("'root' in parents") && decoded.includes("name='__brain_sync_portable_config__'")) return ok({ files: [configRoot()] });
    if (init.method === "POST" && url.includes("/drive/v3/files?")) return ok({ id: "created-folder", name: "SECRET-folder", mimeType: folderMime, parents: ["content"], trashed: false });
    if (url.includes("/files/trash-id?") && init.method === "PATCH") return ok({ id: "trash-id", trashed: true });
    throw new Error(`unexpected request: ${decoded} ${init.method ?? "GET"}`);
  };
  const adapter = new GoogleDriveAdapter(new GoogleOAuthSession({ clientId: "c", redirectUri: "https://callback.invalid" }, secrets), new StubTransport(handler), secrets, diagnostics);
  const created = await adapter.create(id("root"), { path: path("SECRET-folder"), entityKind: "folder" });
  const moved = await adapter.move(id("move-id"), path("SECRET-old.md"), path("SECRET-new.md"));
  const trashed = await adapter.trash(id("trash-id"));
  assert.equal(created.ok, true);
  assert.equal(moved.ok, true);
  assert.equal(trashed.ok, true);
  const events = semanticEvents(diagnostics);
  for (const expected of ["drive-create-started", "drive-create-result", "drive-move-started", "drive-move-result", "drive-trash-started", "drive-trash-result"]) assert.ok(events.some(event => event.event === expected), `${expected} missing`);
  const rendered = diagnostics.renderText();
  for (const sentinel of ["SECRET-folder", "SECRET-old.md", "SECRET-new.md"]) assert.equal(rendered.includes(sentinel), false, `${sentinel} must not enter diagnostics`);
});

test("LOG-03 reconciliation and change-page diagnostics are bounded summaries with no raw entry path, query, or cursor payload", async () => {
  const diagnostics = await logger();
  const backing = new MemorySecrets();
  backing.setSecret("brain-gdrive-paired-account", "acct");
  const secrets = new ObsidianSecretStore(backing);
  const managedEntry = { id: "managed-file", name: "SENTINEL-private.md", mimeType: "text/plain", parents: ["content"], trashed: false, size: "5", sha256Checksum: "abc", version: "7", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } };
  const handler = async (url: string): Promise<DriveResult<Response>> => {
    const decoded = norm(url);
    if (url.includes("/about?")) return ok({ user: { permissionId: "acct" } });
    if (url.includes("/files/root?")) return ok(root());
    if (url.includes("/files/content?")) return ok(contentRoot());
    if (decoded.includes("'root' in parents") && decoded.includes("brain-sync-content")) return ok({ files: [contentRoot()] });
    if (decoded.includes("'root' in parents") && decoded.includes("name='__brain_sync_portable_config__'")) return ok({ files: [configRoot()] });
    if (decoded.includes("'content' in parents") && decoded.includes("trashed=false")) return ok({ files: [managedEntry] });
    if (decoded.includes("'config' in parents") && decoded.includes("trashed=false")) return ok({ files: [] });
    if (decoded.includes("appProperties has") && decoded.includes("brainManagedRootId")) return ok({ files: [managedEntry] });
    if (url.includes("/changes?")) return ok({ changes: [], newStartPageToken: "SENTINEL-next-cursor" });
    throw new Error(`unexpected request: ${decoded}`);
  };
  const adapter = new GoogleDriveAdapter(new GoogleOAuthSession({ clientId: "c", redirectUri: "https://callback.invalid" }, secrets), new StubTransport(handler), secrets, diagnostics);
  const listing = await adapter.listForReconciliation(id("root"));
  assert.equal(listing.ok, true);
  if (listing.ok) { assert.equal(listing.value.completeness.status, "complete"); assert.equal(listing.value.entries.length, 1); }
  const identity = { rootId: id("root"), vaultIdentity: vault("vault-1"), protocolVersion: contractId<"ProtocolVersion">("1") } as ManagedRemoteIdentity;
  const page = await adapter.readChangePage(identity, contractId<"ChangeCursor">("SENTINEL-request-cursor"));
  assert.equal(page.ok, true);
  const events = semanticEvents(diagnostics);
  assert.ok(events.some(event => event.event === "drive-reconciliation-enumeration-result" && event.fields?.remoteCompleteness === "complete" && event.fields?.count === 1));
  assert.ok(events.some(event => event.event === "drive-change-page-result" && event.fields?.changeCount === 0 && event.fields?.classification === "terminal"));
  const rendered = diagnostics.renderText();
  for (const sentinel of ["SENTINEL-private.md", "SENTINEL-request-cursor", "SENTINEL-next-cursor", "pageToken="]) assert.equal(rendered.includes(sentinel), false, `${sentinel} must not enter diagnostics`);
});

test("LOG-03 production composition routes the same host DiagnosticLogger through LOG-02, LOG-03, LOG-04, and LOG-05 seams", () => {
  const driveRuntime = readFileSync("src/drive/runtime.ts", "utf8");
  const productRuntime = readFileSync("src/product/runtime.ts", "utf8");
  assert.match(driveRuntime, /new GoogleHttpTransport\([^;]*options\.diagnostics\)/s);
  assert.match(driveRuntime, /new GoogleDriveAdapter\([^;]*options\.diagnostics, options\.managedRemoteIdentity\)/s);
  assert.match(productRuntime, /createObsidianGoogleDriveBoundary\(\{[\s\S]*?diagnostics: this\.host\.diagnostics/);
  assert.match(productRuntime, /new PersistentSynchronizationStateStore\([\s\S]{0,400}?this\.host\.diagnostics/);
  assert.match(productRuntime, /new ProductSnapshotAssembler\([\s\S]{0,800}?this\.host\.diagnostics/);
  assert.match(productRuntime, /new ProductController\(\{[\s\S]*?diagnostics: this\.host\.diagnostics/);
});
