import assert from "node:assert/strict";
import test from "node:test";

import {
  contractId,
  type BinaryContentSource,
  type MutationIntentId,
  type ObservationToken,
  type SemanticStateGeneration,
  type StateLoadContext,
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
const planId = cid<"PlanId">("plan:log07:update");
const intended = { algorithm: "sha256" as const, hash: cid<"ContentHash">("sha256:abc"), sizeBytes: 4 };
const predecessorEvidence = { hash: cid<"ContentHash">("sha256:old"), sizeBytes: 3, revision: "old-revision" };
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

type UpdateScenario = "success" | "candidate-direct-only" | "retirement-ambiguous" | "post-list-stale" | "third-candidate";
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
  let uploaded = false;
  let retired = false;
  let patchCalls = 0;
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    requests.push(`${method} ${url}`);
    const decoded = normalize(url);
    if (url.includes("/files/generateIds?")) return jsonResponse({ ids: ["cand"] });
    if (url === "https://upload.example/session") { uploaded = true; return jsonResponse(candidate()); }
    if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) return jsonResponse({}, 200, { location: "https://upload.example/session" });
    if (url.includes("/files/pred?")) {
      if (method === "PATCH") {
        patchCalls += 1;
        retired = true;
        return scenario === "retirement-ambiguous" ? errorResponse(503, "backendError") : jsonResponse(predecessor(true));
      }
      return jsonResponse(predecessor(retired));
    }
    if (url.includes("/files/cand?")) return uploaded ? jsonResponse(candidate()) : errorResponse(404, "notFound");
    if (url.includes("/files/private?")) return jsonResponse(privateFolder());
    if (url.includes("/files/content?")) return jsonResponse(contentRoot());
    if (url.includes("/files/config?")) return jsonResponse(configRoot());
    if (url.includes("/files/root?")) return jsonResponse(root());
    if (decoded.includes("'root' in parents") && decoded.includes("brain-sync-content")) return jsonResponse({ files: [contentRoot()] });
    if (decoded.includes("'root' in parents") && decoded.includes("name='__brain_sync_portable_config__'")) return jsonResponse({ files: [configRoot()] });
    if (decoded.includes("'content' in parents") && decoded.includes("name='private'")) return jsonResponse({ files: [privateFolder()] });
    if (decoded.includes("'private' in parents") && decoded.includes("name='PRIVATE-target.md'")) {
      if (!retired) {
        if (!uploaded || scenario === "candidate-direct-only") return jsonResponse({ files: [predecessor(false)] });
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
  return { adapter, requests, patchCalls: () => patchCalls, run: (cancellation?: { cancelled: boolean }) => adapter.updateExisting(updateIdentity(), bytes, cancellation as never) };
}

const executionVault = cid<"VaultIdentity">("vault-log07") as VaultIdentity;
const executionDevice = cid<"DeviceIdentity">("device:log07:execution");
const executionContext: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: executionVault, expectedDeviceIdentity: executionDevice };
const executionRemote: ManagedRemoteIdentity = { rootId: cid<"RemoteObjectId">("root"), vaultIdentity: executionVault, protocolVersion: cid<"ProtocolVersion">("1") };
const localToken = cid<"ObservationToken">("obs:log07:local") as ObservationToken;
const baseFingerprint = cid<"BaseFingerprint">("base:log07:predecessor");
function plannedUpdateOperation() {
  return {
    operationId,
    kind: "upload-update",
    path: targetPath,
    targetSide: "remote",
    remoteObjectId: cid<"RemoteObjectId">("pred"),
    contentVersion: { path: targetPath, entityKind: "file", content: intended, observationToken: localToken },
    destructive: false,
    preconditions: [
      { kind: "base-trusted" },
      { kind: "remote-enumeration-complete" },
      { kind: "identity-unambiguous", path: targetPath },
      { kind: "path-observation", side: "local", path: targetPath, expected: "present", observationToken: localToken },
      { kind: "content-evidence", side: "local", path: targetPath, expected: intended },
      { kind: "file-stable", path: targetPath },
      { kind: "path-observation", side: "remote", path: targetPath, expected: "present" },
      { kind: "content-evidence", side: "remote", path: targetPath, expected: predecessorEvidence },
      { kind: "remote-object", remoteObjectId: cid<"RemoteObjectId">("pred"), expectedRevision: "old-revision" },
    ],
    reasons: [{ code: "local-modified", summary: "LOG-07 production remote-update verification." }],
  } as never;
}
async function productionUpdateWorld() {
  const diagnostics = await makeLogger();
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage(), undefined, undefined, diagnostics);
  const store = new SynchronizationStateAuthorityAdapter(raw, diagnostics);
  const initial: DurableSynchronizationAuthorityState = {
    ...createInitialAuthorityState({
      persistenceRevision: cid<"PersistenceRevision">("persist:log07:1") as never,
      semanticGeneration: generation,
      vaultIdentity: executionVault,
      deviceIdentity: executionDevice,
    }),
    base: [{ path: targetPath, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: cid<"RemoteObjectId">("pred"), content: predecessorEvidence }],
    remoteMappings: [{ path: targetPath, remoteObjectId: cid<"RemoteObjectId">("pred"), entityKind: "file" }],
    baseAuthority: [{ path: targetPath, fingerprint: baseFingerprint }],
    pathConvergence: [{ path: targetPath, state: { status: "converged", generation, baseFingerprint } }],
  };
  assert.equal((await raw.saveTrusted(initial)).status, "saved");
  const driveWorld = await updateWorld("success", diagnostics);
  const local = {
    observe: async (path: VaultPath) => ({ status: "present", side: "local", path, entityKind: "file", content: intended, stability: "stable", observationToken: localToken }),
    readFile: async () => ({ content: bytes, evidence: intended }),
    validatePath: async () => ({ status: "valid" }),
  } as never;
  let controller!: ProductController;
  const executor = new ProductSynchronizationExecutor(local, driveWorld.adapter, store, executionContext, () => controller.currentRunEvidence());
  const assembled = async () => ({
    input: { snapshots: [], state: await store.load(executionContext) },
    managedRemote: executionRemote,
    remoteEnumeration: { status: "complete" as const },
    localEnumeration: { status: "complete" as const },
    mode: "full" as const,
  });
  controller = new ProductController({
    vaultIdentity: executionVault,
    deviceIdentity: executionDevice,
    stateContext: executionContext,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: { assemble: assembled, assembleFull: assembled, assembleRecovery: assembled } as never,
    executor,
    reliableRemoteMutationPort: driveWorld.adapter,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: trigger => ({ plan: async () => ({ planId, trigger, operations: [plannedUpdateOperation()], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" }) } as never),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "log07-s1",
    recoveryActive: () => false,
    diagnostics,
  });
  const runId = diagnostics.beginSyncRun("log07-s1-production");
  const plan = await controller.previewManual(runId);
  assert.ok(plan);
  const action = await controller.requestPreviewAction({ kind: "execute-plan", planId: plan!.planId }, runId);
  assert.equal(action.status, "accepted");
  return { diagnostics, store, driveWorld };
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
async function recoveryWorld() {
  const diagnostics = await makeLogger();
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage(), undefined, undefined, diagnostics);
  const store = new SynchronizationStateAuthorityAdapter(raw, diagnostics);
  const current = cid<"SemanticStateGeneration">("semantic:log07:current") as SemanticStateGeneration;
  const trusted: DurableSynchronizationAuthorityState = {
    ...createInitialAuthorityState({ persistenceRevision: cid<"PersistenceRevision">("persist:log07:1") as never, semanticGeneration: current, vaultIdentity: recoveryVault, deviceIdentity: recoveryDevice }),
    operationIntents: [outstandingIntent(current)],
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
async function generationAdvanceRecoveryWorld() {
  const diagnostics = await makeLogger();
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage(), undefined, undefined, diagnostics);
  const store = new SynchronizationStateAuthorityAdapter(raw, diagnostics);
  const before = cid<"SemanticStateGeneration">("semantic:log07:generation:1") as SemanticStateGeneration;
  const trusted: DurableSynchronizationAuthorityState = {
    ...createInitialAuthorityState({ persistenceRevision: cid<"PersistenceRevision">("persist:log07:generation:1") as never, semanticGeneration: before, vaultIdentity: recoveryVault, deviceIdentity: recoveryDevice }),
    changeCursor: cid<"ChangeCursor">("cursor:log07:before"),
    operationIntents: [outstandingIntent(before)],
  };
  assert.equal((await raw.saveTrusted(trusted)).status, "saved");
  const batch = {
    checkpoint: {
      batchId: cid<"RemoteIngestionBatchId">("remote-batch:log07:generation"),
      startingToken: cid<"ChangeCursor">("cursor:log07:before"),
      terminalStartToken: cid<"ChangeCursor">("cursor:log07:after"),
      persistenceRevision: trusted.persistenceRevision,
      status: "learned" as const,
    },
    changes: [{ kind: "removed" as const, remoteObjectId: cid<"RemoteObjectId">("remote:log07:changed"), lastKnownPath: cid<"VaultPath">("changed-log07.md") }],
  };
  let controller!: ProductController;
  const assembly = async () => ({
    input: { snapshots: [], state: await store.load(recoveryContext) },
    managedRemote: recoveryRemote,
    remoteEnumeration: { status: "complete" as const },
    mode: "incremental" as const,
    remoteChangeBatch: batch,
  });
  const local = { observe: async (path: any) => ({ status: "absent", side: "local", path }) } as never;
  const drive = { observe: async (_root: any, path: any) => ({ ok: true, value: { status: "absent", side: "remote", path } }), listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "complete" } } }) } as never;
  const executor = new ProductSynchronizationExecutor(local, drive, store, recoveryContext, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: recoveryVault,
    deviceIdentity: recoveryDevice,
    stateContext: recoveryContext,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: { assemble: assembly, assembleFull: assembly, assembleRecovery: assembly } as never,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: trigger => ({ plan: async () => ({ planId: cid<"PlanId">("plan:log07:generation"), trigger, operations: [], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" }) } as never),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "log07-s7",
    recoveryActive: () => false,
    diagnostics,
  });
  const plan = await controller.previewManual();
  return { store, diagnostics, plan, surface: controller.currentSurface(), before };
}

test("LOG07-S1 production controller/executor/Drive composition proves remote-update lifecycle end to end", async () => {
  const world = await productionUpdateWorld();
  const authority = await world.store.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") throw new Error("trusted authority required");
  const text = await makeBundle(world.diagnostics, authority);
  const parsed = JSON.parse(text);
  const records = events(text);
  const eventNames = records.map(value => value.event).join(",");
  assert.ok(authority.state.base.some(entry => entry.path === targetPath && entry.remoteObjectId === cid<"RemoteObjectId">("cand")), `candidate canonical commit missing; events=${eventNames}`);
  assert.equal(authority.state.operationIntents.length, 1);
  assert.ok(authority.state.operationIntents[0]?.effects.every(effect => effect.stage === "state-committed"));
  assert.ok(parsed.authorityState.base.records.some((entry: any) => entry.remoteObjectId === "cand"));
  assert.ok(parsed.authorityState.operationJournal.records.some((entry: any) => entry.operationId === String(operationId) && entry.status === "completed"));
  for (const expected of [
    "operation-start",
    "drive-update-candidate-upload-dispatch",
    "drive-update-candidate-upload-result",
    "drive-update-candidate-verification",
    "drive-update-predecessor-retirement-dispatch",
    "drive-update-convergence",
    "physical-verification-complete",
    "state-commit-complete",
    "durable-finalization-complete",
    "operation-complete",
    "sync-run-complete",
  ]) assert.ok(records.some(value => value.event === expected), `${expected} missing; events=${eventNames}`);
  assert.ok(records.some(v => v.event === "drive-update-candidate-verification" && v.fields?.candidateVerified === true));
  assert.ok(records.some(v => v.event === "drive-update-convergence" && v.fields?.result === "verified-effect" && v.fields?.reason === "candidate-sole-live-occupant"));
  assert.ok(records.some(v => v.event === "state-commit-complete" && v.fields?.result === "committed"));
  assert.ok(records.some(v => v.event === "durable-finalization-complete" && v.fields?.toStage === "state-committed"));
  const index = parsed.causalIndex.runs[0];
  assert.ok(index.planIds.includes(String(planId)) && index.operationIds.includes(String(operationId)) && index.intentIds.length > 0 && index.requestIds.length > 0);
  assert.equal(world.driveWorld.patchCalls(), 1);
  assert.equal(text.includes(rawPath), false);
});

test("LOG07-S2 candidate direct GET can diverge from path LIST without inventing retirement", async () => {
  const diagnostics = await makeLogger();
  diagnostics.beginSyncRun("log07-candidate-direct-only");
  const world = await updateWorld("candidate-direct-only", diagnostics);
  const result = await world.run();
  const text = await makeBundle(diagnostics);
  const records = events(text);
  assert.equal(result.status, "conflict-preserved");
  assert.equal(world.patchCalls(), 0);
  assert.ok(records.some(v => v.event === "drive-exact-id-observation-result" && v.fields?.stage === "candidate-after-upload" && v.fields?.result === "present"));
  assert.ok(records.some(v => v.event === "drive-update-topology-observed" && v.fields?.stage === "pre-retirement" && v.fields?.occupancyCount === 1));
  assert.ok(records.some(v => v.event === "drive-update-retirement-branch" && v.fields?.result === "retirement-not-reached" && v.fields?.reason === "candidate-not-listed-at-logical-path"));
  assert.equal(records.some(v => v.event === "drive-update-predecessor-retirement-dispatch"), false);
  assert.ok(records.some(v => v.event === "drive-update-convergence" && v.fields?.result === "conflict-preserved"));
});

test("LOG07-S3/S4/S5 ambiguous retirement, delayed path visibility, and third-candidate contamination remain distinct", async () => {
  for (const scenario of ["retirement-ambiguous", "post-list-stale", "third-candidate"] as const) {
    const diagnostics = await makeLogger();
    diagnostics.beginSyncRun(`log07-${scenario}`);
    const world = await updateWorld(scenario, diagnostics);
    const result = await world.run();
    const records = events(await makeBundle(diagnostics));
    if (scenario === "retirement-ambiguous") {
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

test("LOG07-S6 repaired production controller exports outstanding-intent recovery lifecycle", async () => {
  const world = await recoveryWorld();
  assert.equal(world.thrown, undefined);
  const authority = await world.store.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") throw new Error("trusted authority required");
  assert.equal(authority.state.operationIntents.length, 0);
  const records = events(await makeBundle(world.diagnostics, authority));
  for (const expected of ["outstanding-recovery-preverification-entry", "recovery-intent-selected", "recovery-authority-generation", "recovery-intent-validation-succeeded", "recovery-unattempted-intent-retirement", "outstanding-recovery-final-result"]) assert.ok(records.some(v => v.event === expected), `${expected} missing`);
});

test("LOG07-S7 remote-change learning advances generation before durable recovery rejects the prior-generation intent", async () => {
  const world = await generationAdvanceRecoveryWorld();
  assert.equal(world.plan, undefined);
  assert.equal(world.surface.status.kind, "recovery-required");
  const authority = await world.store.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") throw new Error("trusted authority required");
  assert.notEqual(authority.state.semanticGeneration, world.before);
  assert.equal(authority.state.operationIntents.length, 1);
  assert.equal(authority.state.operationIntents[0]?.semanticAuthority.generation, world.before);
  assert.equal(authority.state.learnedRemoteBatches.length, 1);
  const text = await makeBundle(world.diagnostics, authority);
  const parsed = JSON.parse(text);
  const records = events(text);
  assert.equal(parsed.authorityState.semanticGeneration, String(authority.state.semanticGeneration));
  assert.equal(parsed.authorityState.outstandingOperationIntents.records[0]?.semanticGeneration, String(world.before));
  assert.ok(records.some(v => v.event === "adapter-semantic-generation-before" && v.fields?.semanticGeneration === String(world.before)));
  assert.ok(records.some(v => v.event === "adapter-semantic-generation-after" && v.fields?.semanticGeneration !== String(world.before)));
  assert.ok(records.some(v => v.event === "remote-update-preverification-entry" && v.fields?.semanticGeneration === String(authority.state.semanticGeneration)));
  assert.ok(records.some(v => v.event === "remote-update-preverification-validation-failed" && v.fields?.semanticGeneration === String(world.before) && v.fields?.reason === "persisted durable intent belongs to stale semantic generation"));
  assert.ok(records.some(v => v.event === "outstanding-recovery-final-result" && v.fields?.result === "recovery-required" && v.fields?.reason === "persisted durable intent belongs to stale semantic generation"));
});

test("LOG07-S8 cancellation is distinct and causes no HTTP dispatch", async () => {
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

test("LOG07-S9 retry/rate-limit evidence keeps one request ID and distinct attempt decisions", async () => {
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

test("LOG07-S10 diagnostic persistence failure does not change mutation outcome or request sequence", async () => {
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

test("LOG07-S11 adversarial private path/content/header-like values do not leak and retention remains bounded", async () => {
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
      remoteMappings: [],
      tombstones: [],
      baseAuthority: [],
      pathConvergence: [],
      learnedRemoteBatches: [],
      learnedRemoteReductions: [],
      operationIntents: [],
      localTransactions: [],
      operations: [],
      knownDevices: [],
    },
  });
  for (const forbidden of ["Private/PRIVATE_RAW_PATH.md", "private-authorization-marker", "private-query-marker", "PRIVATE_FILE_CONTENT", "PRIVATE_REQUEST_BODY", "private-cookie-marker", "PRIVATE_VAULT_ID", "PRIVATE_DEVICE_ID"]) assert.equal(text.includes(forbidden), false, `${forbidden} leaked`);
  assert.ok(JSON.parse(text).structuredTrace.length <= 500);
});
