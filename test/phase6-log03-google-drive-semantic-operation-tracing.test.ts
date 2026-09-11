import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type BinaryContentSource, type ChangeCursor, type ContentHash, type MutationIntentId, type RemoteObjectId, type RemoteRevisionId, type VaultIdentity, type VaultPath } from "../src/contracts";
import type { DriveResult, ManagedRemoteIdentity } from "../src/contracts/google-drive";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";

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
const failure = (kind: "not-found" | "transient-failure" | "conflict", detail = kind) => Promise.resolve({ ok: false, signal: { kind, detail } } as DriveResult<Response>);
const id = (value: string) => contractId<"RemoteObjectId">(value) as RemoteObjectId;
const path = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const intent = (value: string) => contractId<"MutationIntentId">(value) as MutationIntentId;
const revision = (value: string) => contractId<"RemoteRevisionId">(value) as RemoteRevisionId;
const contentHash = (value: string) => contractId<"ContentHash">(value) as ContentHash;
const vault = (value: string) => contractId<"VaultIdentity">(value) as VaultIdentity;
const changeCursor = (value: string) => contractId<"ChangeCursor">(value) as ChangeCursor;
const norm = (url: string) => decodeURIComponent(url).replace(/\+/g, " ");
const folderMime = "application/vnd.google-apps.folder";
const root = () => ({ id: "root", name: "BRAIN Sync", mimeType: folderMime, trashed: false, appProperties: { brainSyncRole: "brain-sync-root", brainVaultIdentity: "vault-1", brainProtocolVersion: "1" } });
const contentRoot = () => ({ id: "content", name: "vault", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-content" } });
const configRoot = () => ({ id: "config", name: "__brain_sync_portable_config__", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-portable-config" } });
const notesFolder = () => ({ id: "notes", name: "notes", mimeType: folderMime, parents: ["content"], trashed: false, appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const predecessorFile = (trashed = false) => ({ id: "pred", name: "target.md", mimeType: "text/plain", parents: ["notes"], trashed, size: "3", sha256Checksum: "old", version: "old-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const candidateFile = () => ({ id: "cand", name: "target.md", mimeType: "text/plain", parents: ["notes"], trashed: false, size: "4", sha256Checksum: "abc", version: "candidate-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const thirdFile = () => ({ id: "third", name: "target.md", mimeType: "text/plain", parents: ["notes"], trashed: false, size: "4", sha256Checksum: "third", version: "third-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });

function updateIdentity(secretPath = "private/SECRET-target.md") {
  const target = path(secretPath);
  return {
    kind: "existing-file-content-update",
    intentId: intent(`intent:${secretPath}`),
    remoteObjectId: id("pred"),
    expectedRevision: revision("old-revision"),
    path: target,
    updateProtocol: "immutable-candidate-preservation",
    candidateRemoteObjectId: id("cand"),
    intendedContent: { algorithm: "sha256", hash: contentHash("sha256:abc"), sizeBytes: 4 },
    identityAuthority: { status: "unique", generation: contractId<"SemanticStateGeneration">("generation:1"), path: target, remoteObjectId: id("pred") },
  } as never;
}

const bytes: BinaryContentSource = { sizeBytes: 4, async *openChunks() { yield new Uint8Array([1, 2, 3, 4]); } };

type UpdateScenario = "success" | "candidate-missing-from-list" | "retirement-ambiguous" | "post-list-stale" | "third-occupant";

async function updateFixture(scenario: UpdateScenario) {
  const diagnostics = await logger();
  diagnostics.beginSyncRun("log03-test");
  let candidateGets = 0;
  let retired = false;
  let retirementPatchCalls = 0;
  const handler = async (url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> => {
    const decoded = norm(url);
    if (url === "https://upload.example/session") return ok(candidateFile());
    if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) return ok({}, 200, { location: "https://upload.example/session" });
    if (url.includes("/files/pred?")) {
      if (init.method === "PATCH") {
        retirementPatchCalls += 1;
        retired = true;
        if (scenario === "retirement-ambiguous") return failure("transient-failure", "response-lost");
        return ok(predecessorFile(true));
      }
      return ok(predecessorFile(retired));
    }
    if (url.includes("/files/cand?")) {
      candidateGets += 1;
      if (candidateGets === 1) return failure("not-found");
      return ok(candidateFile());
    }
    if (url.includes("/files/notes?")) return ok(notesFolder());
    if (url.includes("/files/content?")) return ok(contentRoot());
    if (url.includes("/files/config?")) return ok(configRoot());
    if (url.includes("/files/root?")) return ok(root());
    if (decoded.includes("'root' in parents") && decoded.includes("brain-sync-content")) return ok({ files: [contentRoot()] });
    if (decoded.includes("'root' in parents") && decoded.includes("name='__brain_sync_portable_config__'")) return ok({ files: [configRoot()] });
    if (decoded.includes("'content' in parents") && decoded.includes("name='private'")) return ok({ files: [{ id: "private", name: "private", mimeType: folderMime, parents: ["content"], trashed: false }] });
    if (url.includes("/files/private?")) return ok({ id: "private", name: "private", mimeType: folderMime, parents: ["content"], trashed: false });
    if (decoded.includes("'private' in parents") && decoded.includes("name='SECRET-target.md'")) {
      if (!retired) {
        if (scenario === "candidate-missing-from-list") return ok({ files: [predecessorFile(false)] });
        if (scenario === "third-occupant") return ok({ files: [predecessorFile(false), candidateFile(), thirdFile()] });
        return ok({ files: [predecessorFile(false), candidateFile()] });
      }
      if (scenario === "post-list-stale") return ok({ files: [predecessorFile(false), candidateFile()] });
      return ok({ files: [candidateFile()] });
    }
    throw new Error(`unexpected request: ${decoded} ${init.method ?? "GET"}`);
  };
  const backing = new MemorySecrets();
  const secrets = new ObsidianSecretStore(backing);
  const adapter = new GoogleDriveAdapter(new GoogleOAuthSession({ clientId: "c", redirectUri: "https://callback.invalid" }, secrets), new StubTransport(handler), secrets, diagnostics);
  const outcome = await adapter.updateExisting(updateIdentity(), bytes);
  return { diagnostics, outcome, retirementPatchCalls };
}

function semanticEvents(diagnostics: DiagnosticLogger) {
  return diagnostics.snapshot().filter(event => event.component === "drive.semantic");
}

test("LOG-03 exposes candidate direct-GET success while pre-retirement path listing omits the candidate without changing the existing branch", async () => {
  const { diagnostics, outcome, retirementPatchCalls } = await updateFixture("candidate-missing-from-list");
  assert.equal(outcome.status, "conflict-preserved");
  assert.equal("reason" in outcome ? outcome.reason : undefined, "update-path-contains-independent-candidate");
  assert.equal(retirementPatchCalls, 0);
  const events = semanticEvents(diagnostics);
  assert.ok(events.some(event => event.event === "drive-exact-id-observation-result" && event.fields?.stage === "candidate-after-upload" && event.fields?.result === "present"));
  assert.ok(events.some(event => event.event === "drive-update-topology-observed" && event.fields?.stage === "pre-retirement" && event.fields?.occupancyCount === 1));
  assert.ok(events.some(event => event.event === "drive-update-retirement-branch" && event.fields?.result === "retirement-not-reached" && event.fields?.reason === "candidate-not-listed-at-logical-path"));
  assert.equal(diagnostics.renderText().includes("private/SECRET-target.md"), false);
  assert.equal(diagnostics.renderText().includes("intent:private/SECRET-target.md"), false);
});

test("LOG-03 distinguishes an ambiguous predecessor retirement response from later physical verification", async () => {
  const { diagnostics, outcome, retirementPatchCalls } = await updateFixture("retirement-ambiguous");
  assert.equal(outcome.status, "verified-effect");
  assert.equal(retirementPatchCalls, 1);
  const events = semanticEvents(diagnostics);
  assert.ok(events.some(event => event.event === "drive-update-predecessor-retirement-dispatch" && event.fields?.result === "transport-failure" && event.fields?.driveSignal === "transient-failure"));
  assert.ok(events.some(event => event.event === "drive-exact-id-observation-result" && event.fields?.stage === "predecessor-after-retirement" && event.fields?.trashed === true));
  assert.ok(events.some(event => event.event === "drive-update-convergence" && event.fields?.result === "verified-effect"));
});

test("LOG-03 exposes post-trash exact-ID and logical-path disagreement without changing convergence outcome", async () => {
  const { diagnostics, outcome, retirementPatchCalls } = await updateFixture("post-list-stale");
  assert.equal(outcome.status, "outcome-unknown");
  assert.equal("reason" in outcome ? outcome.reason : undefined, "update-candidate-is-not-sole-live-path-occupant-after-retirement");
  assert.equal(retirementPatchCalls, 1);
  const events = semanticEvents(diagnostics);
  assert.ok(events.some(event => event.event === "drive-exact-id-observation-result" && event.fields?.stage === "predecessor-after-retirement" && event.fields?.trashed === true));
  assert.ok(events.some(event => event.event === "drive-update-topology-observed" && event.fields?.stage === "post-retirement" && event.fields?.occupancyCount === 2));
});

test("LOG-03 distinguishes an independent third occupant and never reaches predecessor retirement", async () => {
  const { diagnostics, outcome, retirementPatchCalls } = await updateFixture("third-occupant");
  assert.equal(outcome.status, "conflict-preserved");
  assert.equal(retirementPatchCalls, 0);
  const branch = semanticEvents(diagnostics).find(event => event.event === "drive-update-retirement-branch");
  assert.equal(branch?.fields?.reason, "independent-occupant-present");
  assert.equal(branch?.fields?.occupancyCount, 3);
  assert.match(String(branch?.fields?.occupantRemoteObjectIds), /third/);
});

test("LOG-03 successful immutable-candidate update records causal stages while preserving verified-effect result", async () => {
  const { diagnostics, outcome, retirementPatchCalls } = await updateFixture("success");
  assert.equal(outcome.status, "verified-effect");
  assert.equal(retirementPatchCalls, 1);
  const names = semanticEvents(diagnostics).map(event => event.event);
  for (const expected of [
    "drive-update-entered",
    "drive-update-candidate-upload-dispatch",
    "drive-update-candidate-upload-result",
    "drive-update-finalization-entered",
    "drive-update-candidate-verification",
    "drive-update-topology-observed",
    "drive-update-predecessor-retirement-dispatch",
    "drive-update-predecessor-retirement-observed",
    "drive-update-convergence",
  ]) assert.ok(names.includes(expected), `${expected} missing`);
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
  const page = await adapter.readChangePage(identity, changeCursor("SENTINEL-request-cursor"));
  assert.equal(page.ok, true);
  const events = semanticEvents(diagnostics);
  assert.ok(events.some(event => event.event === "drive-reconciliation-enumeration-result" && event.fields?.remoteCompleteness === "complete" && event.fields?.count === 1));
  assert.ok(events.some(event => event.event === "drive-change-page-result" && event.fields?.changeCount === 0 && event.fields?.classification === "terminal"));
  const rendered = diagnostics.renderText();
  for (const sentinel of ["SENTINEL-private.md", "SENTINEL-request-cursor", "SENTINEL-next-cursor", "pageToken="]) assert.equal(rendered.includes(sentinel), false, `${sentinel} must not enter diagnostics`);
});
