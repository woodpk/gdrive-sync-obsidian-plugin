import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type BinaryContentSource,
  type MutationIntentId,
  type SemanticStateGeneration,
  type StateLoadContext,
  type StateRevision,
  type VaultIdentity,
  type VaultPath,
} from "../src/contracts";
import { REQUIRED_DRIVE_SCOPE, type ManagedRemoteIdentity } from "../src/contracts/google-drive";
import { renderDiagnosticBundle } from "../src/diagnostics/diagnostic-bundle";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport } from "../src/drive/transport";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { authoritativeDiagnostics, executionDiagnosticEmitterFor, withExecutionLifecycleObserver } from "../src/product/authority-execution-diagnostics";
import { DEFAULT_SETTINGS } from "../src/product/plugin-data";
import { ProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { SynchronizationStateAuthorityAdapter } from "../src/product/synchronization-adapters";
import {
  createInitialAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  type DurableSynchronizationAuthorityState,
} from "../src/state/persistent-state-store";

const cid = <T extends string>(value: string) => contractId<T>(value);
const rawPath = "private/PRIVATE-target.md";
const targetPath = cid<"VaultPath">(rawPath) as VaultPath;
const generation = cid<"SemanticStateGeneration">("generation:log07:1") as SemanticStateGeneration;
const operationId = cid<"OperationId">("op:log07:update");
const intentId = cid<"MutationIntentId">(`intent:${String(operationId)}`) as MutationIntentId;
const effectId = `effect:${String(operationId)}:remote-file`;
const planId = cid<"PlanId">("plan:log07:update");
const intended = { algorithm: "sha256" as const, hash: cid<"ContentHash">("sha256:abc"), sizeBytes: 4 };
const bytes: BinaryContentSource = { sizeBytes: 4, async *openChunks() { yield new Uint8Array([1, 2, 3, 4]); } };
const folderMime = "application/vnd.google-apps.folder";

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(key: string) { return this.values.get(key) ?? null; }
  setSecret(key: string, value: string) { this.values.set(key, value); }
  deleteSecret(key: string) { this.values.delete(key); }
}
class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}
class ThrowingDiagnostics implements DiagnosticPersistence {
  async loadDiagnostics(): Promise<unknown> { return undefined; }
  async saveDiagnostics(): Promise<void> { throw new Error("diagnostic-store-unavailable"); }
}

async function makeLogger(persistence: DiagnosticPersistence = new MemoryDiagnostics()) {
  let tick = 0;
  const value = new DiagnosticLogger({
    persistence,
    level: "trace",
    retentionLimit: 500,
    consoleMirror: false,
    platform: "desktop",
    now: () => new Date(1_780_000_000_000 + tick++),
    monotonicNow: () => tick,
  });
  await value.initialize();
  return value;
}
function makeSession(backing: MemorySecrets, fetcher: typeof fetch) {
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "test-access",
    refreshToken: "test-refresh",
    expiresAtMs: Date.now() + 3_600_000,
    tokenType: "Bearer",
    scope: REQUIRED_DRIVE_SCOPE,
  }));
  return new GoogleOAuthSession({ clientId: "test-client", redirectUri: "https://callback.invalid/" }, new ObsidianSecretStore(backing), fetcher);
}
async function makeBundle(diagnostics: DiagnosticLogger, authorityLoad: unknown = { status: "uninitialized" }) {
  return renderDiagnosticBundle({
    identity: { pluginId: "brain-google-drive-sync", pluginVersion: "log07", platform: "desktop", runtime: "obsidian" },
    generatedAt: new Date("2026-09-11T20:00:00.000Z"),
    settings: DEFAULT_SETTINGS,
    readiness: { productControllerReady: true, stateAuthorityReady: true, auditHistoryReady: true, attentionLedgerReady: true },
    authorityLoad: authorityLoad as never,
    audit: [],
    attention: [],
    diagnostics,
  });
}
function events(text: string): any[] { return JSON.parse(text).structuredTrace as any[]; }

const root = () => ({ id: "root", name: "BRAIN Sync", mimeType: folderMime, trashed: false, appProperties: { brainSyncRole: "brain-sync-root", brainVaultIdentity: "vault-log07", brainProtocolVersion: "1" } });
const contentRoot = () => ({ id: "content", name: "vault", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-content" } });
const configRoot = () => ({ id: "config", name: "__brain_sync_portable_config__", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-portable-config" } });
const privateFolder = () => ({ id: "private", name: "private", mimeType: folderMime, parents: ["content"], trashed: false, appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const predecessor = (trashed = false) => ({ id: "pred", name: "PRIVATE-target.md", mimeType: "text/plain", parents: ["private"], trashed, size: "3", sha256Checksum: "old", version: "old-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const candidate = () => ({ id: "cand", name: "PRIVATE-target.md", mimeType: "text/plain", parents: ["private"], trashed: false, size: "4", sha256Checksum: "abc", version: "candidate-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const third = () => ({ id: "third", name: "PRIVATE-target.md", mimeType: "text/plain", parents: ["private"], trashed: false, size: "4", sha256Checksum: "third", version: "third-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const errorResponse = (status: number, reason: string) => jsonResponse({ error: { errors: [{ reason }] } }, status);
const normalize = (url: string) => decodeURIComponent(url).replace(/\+/g, " ");

type UpdateScenario = "success" | "candidate-missing" | "retirement-ambiguous" | "post-list-stale" | "third-candidate";
function updateIdentity() {
  return {
    kind: "existing-file-content-update",
    intentId,
    remoteObjectId: cid<"RemoteObjectId">("pred"),
    expectedRevision: cid<"RemoteRevisionId">("old-revision"),
    path: targetPath,
    updateProtocol: "immutable-candidate-preservation",
    candidateRemoteObjectId: cid<"RemoteObjectId">("cand"),
    intendedContent: intended,
    identityAuthority: { status: "unique", generation, path: targetPath, remoteObjectId: cid<"RemoteObjectId">("pred") },
  } as never;
}
async function updateWorld(scenario: UpdateScenario, diagnostics?: DiagnosticLogger) {
  let candidateGets = 0;
  let retired = false;
  let patchCalls = 0;
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    requests.push(`${method} ${url}`);
    const decoded = normalize(url);
    if (url === "https://upload.example/session") return jsonResponse(candidate());
    if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) return jsonResponse({}, 200, { location: "https://upload.example/session" });
    if (url.includes("/files/pred?")) {
      if (method === "PATCH") {
        patchCalls += 1;
        retired = true;
        return scenario === "retirement-ambiguous" ? errorResponse(503, "backendError") : jsonResponse(predecessor(true));
      }
      return jsonResponse(predecessor(retired));
    }
    if (url.includes("/files/cand?")) {
      candidateGets += 1;
      return candidateGets === 1 ? errorResponse(404, "notFound") : jsonResponse(candidate());
    }
    if (url.includes("/files/private?")) return jsonResponse(privateFolder());
    if (url.includes("/files/content?")) return jsonResponse(contentRoot());
    if (url.includes("/files/config?")) return jsonResponse(configRoot());
    if (url.includes("/files/root?")) return jsonResponse(root());
    if (decoded.includes("'root' in parents") && decoded.includes("brain-sync-content")) return jsonResponse({ files: [contentRoot()] });
    if (decoded.includes("'root' in parents") && decoded.includes("name='__brain_sync_portable_config__'")) return jsonResponse({ files: [configRoot()] });
    if (decoded.includes("'content' in parents") && decoded.includes("name='private'")) return jsonResponse({ files: [privateFolder()] });
    if (decoded.includes("'private' in parents") && decoded.includes("name='PRIVATE-target.md'")) {
      if (!retired) {
        if (scenario === "candidate-missing") return jsonResponse({ files: [predecessor(false)] });
        if (scenario === "third-candidate") return jsonResponse({ files: [predecessor(false), candidate(), third()] });
        return jsonResponse({ files: [predecessor(false), candidate()] });
      }
      return scenario === "post-list-stale" ? jsonResponse({ files: [predecessor(false), candidate()] }) : jsonResponse({ files: [candidate()] });
    }
    throw new Error(`unexpected request ${method} ${decoded}`);
  };
  const backing = new MemorySecrets();
  const oauth = makeSession(backing, fetcher);
  const transport = new GoogleHttpTransport(oauth, fetcher, { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, maxConcurrency: 2 }, async () => undefined, () => 0, () => 0, diagnostics, () => requests.length);
  const adapter = new GoogleDriveAdapter(oauth, transport, new ObsidianSecretStore(backing), diagnostics);
  return { requests, patchCalls: () => patchCalls, run: (cancellation?: { cancelled: boolean }) => adapter.updateExisting(updateIdentity(), bytes, cancellation as never) };
}

function diagnosticOperation() {
  return { operationId, kind: "upload-update", path: targetPath, targetSide: "remote", remoteObjectId: cid<"RemoteObjectId">("pred"), contentVersion: { path: targetPath, entityKind: "file", content: intended }, destructive: false, preconditions: [], reasons: [] } as never;
}

const recoveryVault = cid<"VaultIdentity">("vault:log07:recovery") as VaultIdentity;
const recoveryDevice = cid<"DeviceIdentity">("device:log07:recovery");
const recoveryContext: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: recoveryVault, expectedDeviceIdentity: recoveryDevice };
const recoveryRemote: ManagedRemoteIdentity = { rootId: cid<"RemoteObjectId">("root:log07:recovery"), vaultIdentity: recoveryVault, protocolVersion: cid<"ProtocolVersion">("1") };
function outstandingIntent(intentGeneration: SemanticStateGeneration) {
  const recoveryIntentId = cid<"MutationIntentId">("intent:log07:recovery") as MutationIntentId;
  const recoveryPath = cid<"VaultPath">("recovery-log07.md");
  const proof = { algorithm: "sha256" as const, hash: cid<"ContentHash">("sha256:recovery"), sizeBytes: 7 };
  return {
    logicalKind: "single-effect",
    operationId: cid<"OperationId">("op:log07:recovery"),
    intentId: recoveryIntentId,
    semanticAuthority: { generation: intentGeneration },
    effects: [{ effectId: "effect:log07:recovery", stage: "intent-persisted", descriptor: { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: recoveryPath, intendedContent: proof, remoteMutation: { kind: "reserved-file-create", intentId: recoveryIntentId, reservedRemoteObjectId: cid<"RemoteObjectId">("remote:log07:reserved"), path: recoveryPath, intendedContent: proof } } }],
  } as never;
}
async function recoveryWorld(stale: boolean) {
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const store = new SynchronizationStateAuthorityAdapter(raw);
  const diagnostics = await makeLogger();
  const current = cid<"SemanticStateGeneration">("semantic:log07:current") as SemanticStateGeneration;
  const intentGeneration = stale ? cid<"SemanticStateGeneration">("semantic:log07:stale") as SemanticStateGeneration : current;
  const trusted: DurableSynchronizationAuthorityState = {
    ...createInitialAuthorityState({ persistenceRevision: cid<"StateRevision">("persist:log07:1") as StateRevision, semanticGeneration: current, vaultIdentity: recoveryVault, deviceIdentity: recoveryDevice }),
    operationIntents: [outstandingIntent(intentGeneration)],
  };
  assert.equal((await raw.saveTrusted(trusted)).status, "saved");
  let controller!: ProductController;
  const assembly = { input: { snapshots: [], state: { status: "uninitialized" as const } }, managedRemote: recoveryRemote, remoteEnumeration: { status: "complete" as const }, mode: "full" as const, reconstruction: true as const, recoveryReason: "LOG-07" };
  const local = { observe: async (path: any) => ({ status: "absent", side: "local", path }) } as never;
  const drive = { observe: async (_root: any, path: any) => ({ ok: true, value: { status: "absent", side: "remote", path } }), listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "complete" } } }) } as never;
  const executor = new ProductSynchronizationExecutor(local, drive, store, recoveryContext, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: recoveryVault,
    deviceIdentity: recoveryDevice,
    stateContext: recoveryContext,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: { assemble: async () => assembly, assembleFull: async () => assembly, assembleRecovery: async () => assembly } as never,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: trigger => ({ plan: async () => ({ planId: cid<"PlanId">("plan:log07:recovery"), trigger, operations: [], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" }) } as never),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "log07",
    recoveryActive: () => true,
    diagnostics,
  });
  let thrown: unknown;
  try { await controller.previewVerifyReconcile(); } catch (error) { thrown = error; }
  return { store, diagnostics, thrown };
}

test("LOG-07 scenario 1: one serialized bundle spans execution IDs, Drive semantics, HTTP requests, durable effect, commit, and terminal result", async () => {
  const diagnostics = await makeLogger();
  const composed = authoritativeDiagnostics(diagnostics);
  assert.ok(composed.logger && composed.observer);
  const runId = diagnostics.beginSyncRun("log07-normal");
  composed.logger.syncInfo("sync.controller", "execution-start", runId, { planId: String(planId), operationCount: 1 });
  composed.logger.syncTrace("sync.execute", "operation-start", runId, { planId: String(planId), operationIndex: 1 });
  const wrapped = withExecutionLifecycleObserver({ loadAuthority: async () => ({ status: "trusted", state: { persistenceRevision: "p1", semanticGeneration: generation, operationIntents: [], learnedRemoteBatches: [], learnedRemoteReductions: [], pathConvergence: [], localTransactions: [] } }), saveAuthority: async () => ({ status: "saved", persistenceRevision: "p2", semanticGeneration: generation }), commitBaseTransition: async () => ({ status: "saved", persistenceRevision: "p2", semanticGeneration: generation }) } as never, composed.observer);
  wrapped.executionLifecycleObserver?.(diagnosticOperation(), "operation-start");
  const emit = executionDiagnosticEmitterFor(wrapped);
  assert.ok(emit);
  emit(diagnosticOperation(), "sync.effect", "durable-intent-persistence-complete", { intentId: String(intentId), effectId, toStage: "intent-persisted", result: "saved" });
  emit(diagnosticOperation(), "sync.effect", "physical-dispatch-start", { intentId: String(intentId), effectId, fromStage: "dispatch-authorized" });
  const world = await updateWorld("success", diagnostics);
  assert.equal((await world.run()).status, "verified-effect");
  emit(diagnosticOperation(), "sync.effect", "physical-result-classified", { intentId: String(intentId), effectId, result: "verified-effect", toStage: "effect-verified" });
  emit(diagnosticOperation(), "state.commit", "state-commit-complete", { intentId: String(intentId), effectId, result: "saved" });
  emit(diagnosticOperation(), "sync.effect", "durable-finalization-complete", { intentId: String(intentId), effectId, fromStage: "effect-verified", toStage: "state-committed", result: "saved" });
  wrapped.executionLifecycleObserver?.(diagnosticOperation(), "operation-complete", "committed");
  const text = await makeBundle(diagnostics);
  const records = events(text);
  for (const expected of ["durable-intent-persistence-complete", "physical-dispatch-start", "drive-update-candidate-upload-dispatch", "google-http-request-started", "drive-update-predecessor-retirement-dispatch", "physical-result-classified", "state-commit-complete", "durable-finalization-complete", "operation-complete"]) assert.ok(records.some(value => value.event === expected), `${expected} missing`);
  const index = JSON.parse(text).causalIndex.runs[0];
  assert.ok(index.planIds.includes(String(planId)) && index.operationIds.includes(String(operationId)) && index.intentIds.includes(String(intentId)) && index.requestIds.length > 0);
  assert.equal(text.includes(rawPath), false);
});

test("LOG-07 scenarios 2-5: exact-ID/list divergence, ambiguous retirement, delayed path visibility, and third-candidate contamination remain distinct", async () => {
  for (const scenario of ["candidate-missing", "retirement-ambiguous", "post-list-stale", "third-candidate"] as const) {
    const diagnostics = await makeLogger();
    diagnostics.beginSyncRun(`log07-${scenario}`);
    const world = await updateWorld(scenario, diagnostics);
    const result = await world.run();
    const records = events(await makeBundle(diagnostics));
    if (scenario === "candidate-missing") {
      assert.equal(result.status, "conflict-preserved");
      assert.equal(world.patchCalls(), 0);
      assert.ok(records.some(v => v.event === "drive-exact-id-observation-result" && v.fields?.stage === "candidate-after-upload" && v.fields?.result === "present"));
      assert.ok(records.some(v => v.event === "drive-update-topology-observed" && v.fields?.stage === "pre-retirement" && v.fields?.occupancyCount === 1));
    } else if (scenario === "retirement-ambiguous") {
      assert.equal(result.status, "verified-effect");
      assert.equal(world.patchCalls(), 1);
      assert.ok(records.some(v => v.event === "drive-update-predecessor-retirement-dispatch" && v.fields?.result === "transport-failure"));
      assert.ok(records.some(v => v.event === "google-http-request-failed" && v.fields?.endpointClass === "drive.files.patch"));
      assert.ok(records.some(v => v.event === "drive-exact-id-observation-result" && v.fields?.stage === "predecessor-after-retirement" && v.fields?.trashed === true));
    } else if (scenario === "post-list-stale") {
      assert.equal(result.status, "outcome-unknown");
      assert.ok(records.some(v => v.event === "drive-exact-id-observation-result" && v.fields?.stage === "predecessor-after-retirement" && v.fields?.trashed === true));
      assert.ok(records.some(v => v.event === "drive-update-topology-observed" && v.fields?.stage === "post-retirement" && v.fields?.occupancyCount === 2));
    } else {
      assert.equal(result.status, "conflict-preserved");
      assert.equal(world.patchCalls(), 0);
      assert.ok(records.some(v => v.event === "drive-update-retirement-branch" && v.fields?.reason === "independent-occupant-present" && v.fields?.occupancyCount === 3));
    }
  }
});

test("LOG-07 scenario 6: repaired production controller exports outstanding-intent recovery lifecycle", async () => {
  const world = await recoveryWorld(false);
  assert.equal(world.thrown, undefined);
  const authority = await world.store.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") throw new Error("trusted authority required");
  assert.equal(authority.state.operationIntents.length, 0);
  const records = events(await makeBundle(world.diagnostics, authority));
  for (const expected of ["outstanding-recovery-preverification-entry", "recovery-intent-selected", "recovery-authority-generation", "recovery-intent-validation-succeeded", "recovery-unattempted-intent-retirement", "outstanding-recovery-final-result"]) assert.ok(records.some(v => v.event === expected), `${expected} missing`);
});

test("LOG-07 scenario 7: stale semantic generation is explicitly rejected in the exported recovery trace", async () => {
  const world = await recoveryWorld(true);
  assert.ok(world.thrown);
  const records = events(await makeBundle(world.diagnostics, await world.store.loadAuthority()));
  assert.ok(records.some(v => v.event === "recovery-authority-generation"));
  assert.ok(records.some(v => v.event === "recovery-intent-validation-failed" && String(v.fields?.reason).includes("stale semantic generation")));
  assert.ok(records.some(v => v.event === "outstanding-recovery-final-result" && v.fields?.result === "recovery-required"));
});

test("LOG-07 scenario 8: cancellation is distinct and causes no HTTP dispatch", async () => {
  const diagnostics = await makeLogger();
  diagnostics.beginSyncRun("log07-cancel");
  const world = await updateWorld("success", diagnostics);
  const result = await world.run({ cancelled: true });
  assert.equal(result.status, "verified-not-applied");
  assert.equal(world.requests.length, 0);
  const records = events(await makeBundle(diagnostics));
  assert.ok(records.some(v => v.event === "drive-update-convergence" && v.fields?.result === "verified-not-applied" && v.fields?.reason === "cancelled-before-dispatch"));
  assert.equal(records.some(v => v.component === "drive.http"), false);
});

test("LOG-07 scenario 9: retry/rate-limit evidence keeps one request ID and distinct attempt decisions", async () => {
  const diagnostics = await makeLogger();
  diagnostics.beginSyncRun("log07-retry");
  const backing = new MemorySecrets();
  let calls = 0;
  const sleeps: number[] = [];
  const fetcher: typeof fetch = async () => {
    calls += 1;
    if (calls === 1) return errorResponse(429, "rateLimitExceeded");
    if (calls === 2) return errorResponse(503, "backendError");
    return jsonResponse({});
  };
  const oauth = makeSession(backing, fetcher);
  const transport = new GoogleHttpTransport(oauth, fetcher, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, maxConcurrency: 1 }, async ms => { sleeps.push(ms); }, () => 0, () => 0, diagnostics, () => calls);
  assert.equal((await transport.request("https://www.googleapis.com/drive/v3/files/private-id?fields=id&code=private-marker", { method: "GET" })).ok, true);
  const text = await makeBundle(diagnostics);
  const http = events(text).filter(v => v.component === "drive.http");
  assert.equal(new Set(http.map(v => v.fields?.requestId)).size, 1);
  assert.deepEqual(http.filter(v => v.event === "google-http-attempt-started").map(v => v.fields?.attemptNumber), [1, 2, 3]);
  assert.ok(http.some(v => v.fields?.classification === "rate-limited"));
  assert.ok(http.some(v => v.fields?.classification === "transient-http-failure"));
  assert.equal(sleeps.length, 2);
  assert.equal(text.includes("private-id"), false);
  assert.equal(text.includes("private-marker"), false);
});

test("LOG-07 scenario 10: diagnostic persistence failure does not change mutation outcome or request sequence", async () => {
  const failing = await makeLogger(new ThrowingDiagnostics());
  failing.beginSyncRun("log07-persistence");
  const enabled = await updateWorld("success", failing);
  const enabledResult = await enabled.run();
  await failing.flush();
  const disabled = await updateWorld("success");
  const disabledResult = await disabled.run();
  assert.equal(enabledResult.status, "verified-effect");
  assert.equal(disabledResult.status, enabledResult.status);
  assert.deepEqual(disabled.requests, enabled.requests);
  assert.equal(disabled.patchCalls(), enabled.patchCalls());
  assert.ok(events(await makeBundle(failing)).some(v => v.event === "drive-update-convergence"));
});

test("LOG-07 scenario 11: adversarial private path/content/header-like values do not leak and retention remains bounded", async () => {
  const diagnostics = await makeLogger();
  const runId = diagnostics.beginSyncRun("log07-privacy");
  diagnostics.syncError("drive.http", "privacy-probe", runId, {
    path: "Private/PRIVATE_RAW_PATH.md",
    authorization: "private-authorization-marker",
    rawUrl: "https://drive.invalid/?code=private-query-marker",
    body: "PRIVATE_FILE_CONTENT",
    requestBody: "PRIVATE_REQUEST_BODY",
    cookie: "private-cookie-marker",
  } as never);
  for (let index = 0; index < 700; index += 1) diagnostics.syncTrace("sync.execute", "bounded-probe", runId, { count: index });
  const text = await makeBundle(diagnostics, {
    status: "trusted",
    state: {
      schemaVersion: 1,
      authoritySchemaVersion: 2,
      stateRevision: "state:p",
      persistenceRevision: "persist:p",
      semanticGeneration: "generation:p",
      vaultIdentity: "PRIVATE_VAULT_ID",
      deviceIdentity: "PRIVATE_DEVICE_ID",
      base: [{ path: "Private/PRIVATE_RAW_PATH.md", entityKind: "file", localExisted: true, remoteExisted: true }],
      remoteMappings: [], tombstones: [], baseAuthority: [], pathConvergence: [], learnedRemoteBatches: [], learnedRemoteReductions: [], operationIntents: [], localTransactions: [], operations: [], knownDevices: [],
    },
  });
  for (const forbidden of ["Private/PRIVATE_RAW_PATH.md", "private-authorization-marker", "private-query-marker", "PRIVATE_FILE_CONTENT", "PRIVATE_REQUEST_BODY", "private-cookie-marker", "PRIVATE_VAULT_ID", "PRIVATE_DEVICE_ID"]) assert.equal(text.includes(forbidden), false, `${forbidden} leaked`);
  assert.ok(JSON.parse(text).structuredTrace.length <= 500);
});
