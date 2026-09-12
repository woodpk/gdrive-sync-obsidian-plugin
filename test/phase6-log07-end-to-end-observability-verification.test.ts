import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  contractId,
  type BinaryContentSource,
  type ContentHash,
  type MutationIntentId,
  type PlannedOperation,
  type RemoteObjectId,
  type RemoteRevisionId,
  type SemanticStateGeneration,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthorityStoreV1_1,
  type VaultIdentity,
  type VaultPath,
} from "../src/contracts";
import { REQUIRED_DRIVE_SCOPE, type ManagedRemoteIdentity } from "../src/contracts/google-drive";
import { AuthorityCompleteExecutionCoordinator } from "../src/core/execution-coordinator";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { renderDiagnosticBundle } from "../src/diagnostics/diagnostic-bundle";
import {
  DiagnosticLogger,
  type DiagnosticPersistence,
  type DiagnosticStoreState,
} from "../src/diagnostics/diagnostic-logger";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport } from "../src/drive/transport";
import { createAuthoritativeProductExecutor } from "../src/product/authoritative-production-executor-base";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { authoritativeDiagnostics, withExecutionLifecycleObserver } from "../src/product/authority-execution-diagnostics";
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

const id = <T extends string>(value: string) => contractId<T>(value);
const RAW_PATH = "private/SECRET-target.md";
const TARGET_PATH = id<"VaultPath">(RAW_PATH) as VaultPath;
const INTENDED = { algorithm: "sha256" as const, hash: id<"ContentHash">("sha256:abc") as ContentHash, sizeBytes: 4 };
const OLD = { hash: id<"ContentHash">("sha256:old") as ContentHash, sizeBytes: 3, revision: id<"RemoteRevisionId">("old-revision") as RemoteRevisionId };
const OPERATION_ID = id<"OperationId">("op:log07:normal-update");
const INTENT_ID = id<"MutationIntentId">(`intent:${String(OPERATION_ID)`) as MutationIntentId;
const PLAN_ID = id<"PlanId">("plan:log07:normal-update");
const GENERATION = id<"SemanticStateGeneration">("generation:log07:1") as SemanticStateGeneration;
const MANAGED_REMOTE = {
  rootId: id<"RemoteObjectId">("root") as RemoteObjectId,
  vaultIdentity: id<"VaultIdentity">("vault-log07") as VaultIdentity,
  protocolVersion: id<"ProtocolVersion">("1"),
} as ManagedRemoteIdentity;
const STATE_CONTEXT = {
  expectation: "existing-pairing",
  expectedVaultIdentity: MANAGED_REMOTE.vaultIdentity,
  expectedDeviceIdentity: id<"DeviceIdentity">("device-log07"),
} as StateLoadContext;
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
  async saveDiagnostics(): Promise<void> { throw new Error("SENTINEL-diagnostic-persistence-failure"); }
}

async function makeLogger(persistence: DiagnosticPersistence = new MemoryDiagnostics()): Promise<DiagnosticLogger> {
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

function seededSession(backing: MemorySecrets, fetcher: typeof fetch): GoogleOAuthSession {
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "SENTINEL_ACCESS_TOKEN",
    refreshToken: "SENTINEL_REFRESH_TOKEN",
    expiresAtMs: Date.now() + 3_600_000,
    tokenType: "Bearer",
    scope: REQUIRED_DRIVE_SCOPE,
  }));
  backing.setSecret("brain-gdrive-paired-account", "acct-log07");
  return new GoogleOAuthSession(
    { clientId: "SENTINEL_CLIENT_ID", redirectUri: "https://callback.invalid/?code=SENTINEL_CODE" },
    new ObsidianSecretStore(backing),
    fetcher,
  );
}

async function bundleText(diagnostics: DiagnosticLogger, authorityLoad: unknown = { status: "uninitialized" }): Promise<string> {
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

const root = () => ({ id: "root", name: "BRAIN Sync", mimeType: folderMime, trashed: false, appProperties: { brainSyncRole: "brain-sync-root", brainVaultIdentity: "vault-log07", brainProtocolVersion: "1" } });
const contentRoot = () => ({ id: "content", name: "vault", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-content" } });
const configRoot = () => ({ id: "config", name: "__brain_sync_portable_config__", mimeType: folderMime, parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-portable-config" } });
const privateFolder = () => ({ id: "private", name: "private", mimeType: folderMime, parents: ["content"], trashed: false, appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const predecessor = (trashed = false) => ({ id: "pred", name: "SECRET-target.md", mimeType: "text/plain", parents: ["private"], trashed, size: "3", sha256Checksum: "old", version: "old-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const candidate = () => ({ id: "cand", name: "SECRET-target.md", mimeType: "text/plain", parents: ["private"], trashed: false, size: "4", sha256Checksum: "abc", version: "candidate-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const third = () => ({ id: "third", name: "SECRET-target.md", mimeType: "text/plain", parents: ["private"], trashed: false, size: "4", sha256Checksum: "third", version: "third-revision", appProperties: { brainManagedRootId: "root", brainSyncDomain: "content" } });
const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => new Response(body === undefined ? undefined : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const errorResponse = (status: number, reason: string) => jsonResponse({ error: { errors: [{ reason }] } }, status);
const normalized = (url: string) => decodeURIComponent(url).replace(/\+/g, " ");

type UpdateScenario = "success" | "candidate-missing-from-list" | "retirement-ambiguous" | "post-list-stale" | "third-occupant";

function updateIdentity(intentId: MutationIntentId = INTENT_ID) {
  return {
    kind: "existing-file-content-update",
    intentId,
    remoteObjectId: id<"RemoteObjectId">("pred"),
    expectedRevision: id<"RemoteRevisionId">("old-revision"),
    path: TARGET_PATH,
    updateProtocol: "immutable-candidate-preservation",
    candidateRemoteObjectId: id<"RemoteObjectId">("cand"),
    intendedContent: INTENDED,
    identityAuthority: { status: "unique", generation: GENERATION, path: TARGET_PATH, remoteObjectId: id<"RemoteObjectId">("pred") },
  } as never;
}

async function updateWorld(scenario: UpdateScenario, diagnostics?: DiagnosticLogger) {
  let candidateGets = 0;
  let retired = false;
  let retirementPatchCalls = 0;
  const requests: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    requests.push(`${method} ${url}`);
    const decoded = normalized(url);
    if (url === "https://upload.example/session") return jsonResponse(candidate());
    if (url.startsWith("https://www.googleapis.com/upload/drive/v3/files?")) return jsonResponse({}, 200, { location: "https://upload.example/session" });
    if (url.includes("/files/pred?")) {
      if (method === "PATCH") {
        retirementPatchCalls += 1;
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
    if (decoded.includes("'private' in parents") && decoded.includes("name='SECRET-target.md'")) {
      if (!retired) {
        if (scenario === "candidate-missing-from-list") return jsonResponse({ files: [predecessor(false)] });
        if (scenario === "third-occupant") return jsonResponse({ files: [predecessor(false), candidate(), third()] });
        return jsonResponse({ files: [predecessor(false), candidate()] });
      }
      if (scenario === "post-list-stale") return jsonResponse({ files: [predecessor(false), candidate()] });
      return jsonResponse({ files: [candidate()] });
    }
    throw new Error(`unexpected LOG-07 request: ${method} ${decoded}`);
  };
  const backing = new MemorySecrets();
  const session = seededSession(backing, fetcher);
  const secrets = new ObsidianSecretStore(backing);
  const transport = new GoogleHttpTransport(
    session,
    fetcher,
    { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, maxConcurrency: 2 },
    async () => undefined,
    () => 0,
    () => 0,
    diagnostics,
    () => requests.length,
  );
  const adapter = new GoogleDriveAdapter(session, transport, secrets, diagnostics);
  return {
    adapter,
    requests,
    retirementPatchCalls: () => retirementPatchCalls,
    run: (cancellation?: { cancelled: boolean }) => adapter.updateExisting(updateIdentity(), bytes, cancellation as never),
  };
}

class MemoryAuthority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1;
  private revision = 1;
  constructor() {
    this.value = {
      persistenceRevision: "persist:1",
      semanticGeneration: GENERATION,
      learnedRemoteBatches: [],
      learnedRemoteReductions: [],
      pathConvergence: [],
      localTransactions: [],
      operationIntents: [],
    } as unknown as SynchronizationAuthorityMetadataV1_1;
  }
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidateState: SynchronizationAuthorityMetadataV1_1) {
    this.revision += 1;
    const persistenceRevision = `persist:${this.revision}` as never;
    this.value = { ...candidateState, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: this.value.semanticGeneration } as never;
  }
  async commitBaseTransition() {
    return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration } as never;
  }
}

function updateOperation(): PlannedOperation {
  return {
    operationId: OPERATION_ID,
    kind: "upload-update",
    path: TARGET_PATH,
    targetSide: "remote",
    remoteObjectId: id<"RemoteObjectId">("pred"),
    contentVersion: {
      path: TARGET_PATH,
      entityKind: "file",
      content: INTENDED,
      observationToken: id<"ObservationToken">("observation:log07"),
      remoteObjectId: id<"RemoteObjectId">("pred"),
    },
    destructive: false,
    preconditions: [
      { kind: "path-observation", side: "local", path: TARGET_PATH, expected: "present", entityKind: "file", observationToken: id<"ObservationToken">("observation:log07") },
      { kind: "content-evidence", side: "local", path: TARGET_PATH, expected: INTENDED },
      { kind: "path-observation", side: "remote", path: TARGET_PATH, expected: "present", entityKind: "file" },
      { kind: "content-evidence", side: "remote", path: TARGET_PATH, expected: OLD },
      { kind: "remote-object", remoteObjectId: id<"RemoteObjectId">("pred"), expectedRevision: id<"RemoteRevisionId">("old-revision") },
      { kind: "identity-authority", proof: { status: "unique", generation: GENERATION, path: TARGET_PATH, remoteObjectId: id<"RemoteObjectId">("pred") } },
      { kind: "file-stable", path: TARGET_PATH, observationToken: id<"ObservationToken">("observation:log07") },
    ],
    reasons: [],
  } as unknown as PlannedOperation;
}

async function normalUpdateExecutionWorld() {
  const diagnostics = await makeLogger();
  const composed = authoritativeDiagnostics(diagnostics);
  assert.ok(composed.logger && composed.observer);
  const runId = diagnostics.beginSyncRun("log07-normal-update");
  composed.logger.syncInfo("sync.controller", "execution-start", runId, { planId: String(PLAN_ID), operationCount: 1, stage: "execution" });
  composed.logger.syncTrace("sync.execute", "operation-start", runId, { planId: String(PLAN_ID), operationIndex: 1 });
  composed.logger.syncTrace("sync.execute", "operation-precondition-validation-start", runId, { planId: String(PLAN_ID), operationIndex: 1 });

  const driveWorld = await updateWorld("success", diagnostics);
  const rawAuthority = new MemoryAuthority();
  const authority = withExecutionLifecycleObserver(rawAuthority, composed.observer);
  let canonical: any = {
    schemaVersion: 1,
    stateRevision: "state:1",
    vaultIdentity: MANAGED_REMOTE.vaultIdentity,
    deviceIdentity: STATE_CONTEXT.expectedDeviceIdentity,
    base: [{ path: TARGET_PATH, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: id<"RemoteObjectId">("pred"), content: OLD }],
    remoteMappings: [{ path: TARGET_PATH, remoteObjectId: id<"RemoteObjectId">("pred"), entityKind: "file" }],
    tombstones: [],
    operations: [],
    knownDevices: [],
  };
  const stateStore = {
    load: async () => ({ status: "trusted", state: canonical }),
    saveTrusted: async (candidateState: any, expected?: string) => {
      if (expected !== undefined && expected !== String(canonical.stateRevision)) return { status: "stale-revision", actualRevision: canonical.stateRevision };
      canonical = candidateState;
      return { status: "saved", stateRevision: candidateState.stateRevision };
    },
  } as never;
  let reconciled = false;
  const legacy = {
    local: {
      readFile: async () => ({ content: bytes, evidence: INTENDED, observationToken: id<"ObservationToken">("observation:log07") }),
      observe: async () => ({ status: "present", side: "local", path: TARGET_PATH, entityKind: "file", content: INTENDED, stability: "stable", observationToken: id<"ObservationToken">("observation:log07") }),
    },
    drive: {
      listForReconciliation: async () => ({ ok: true, value: { entries: reconciled ? [{ path: TARGET_PATH, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("cand"), content: { ...INTENDED, revision: id<"RemoteRevisionId">("candidate-revision") }, trashed: false }] : [{ path: TARGET_PATH, entityKind: "file", remoteObjectId: id<"RemoteObjectId">("pred"), content: OLD, trashed: false }], completeness: { status: "complete" } } }),
    },
    runEvidence: () => ({ managedRemote: MANAGED_REMOTE, remoteEnumerationComplete: true }),
    validatePreconditions: async () => ({ status: "valid" }),
    versionStillCurrent: async () => true,
  } as never;
  const reliable = {
    reserveFileCreateIdentity: async (_root: unknown, intentId: MutationIntentId, path: VaultPath, intendedContent: unknown) => ({ ok: true, value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: id<"RemoteObjectId">("cand"), path, intendedContent } }),
    reserveFolderCreateIdentity: async () => { throw new Error("not used"); },
    createReserved: async () => { throw new Error("not used"); },
    updateExisting: async (identity: never, content: BinaryContentSource, cancellation?: never) => {
      const result = await driveWorld.adapter.updateExisting(identity, content, cancellation);
      if (result.status === "verified-effect") reconciled = true;
      return result;
    },
    moveExisting: async () => { throw new Error("not used"); },
    trashExisting: async () => { throw new Error("not used"); },
  } as never;
  const executor = createAuthoritativeProductExecutor(legacy, authority, stateStore, STATE_CONTEXT, MANAGED_REMOTE, { reliableRemoteMutationPort: reliable } as never);
  const coordinator = new AuthorityCompleteExecutionCoordinator(authority, executor, new StateCommitCoordinator(stateStore, STATE_CONTEXT), stateStore, STATE_CONTEXT);
  const result = await coordinator.executeOperation(updateOperation() as never);
  return { diagnostics, rawAuthority, result, canonical, driveWorld };
}

const RECOVERY_VAULT = id<"VaultIdentity">("vault:log07:recovery") as VaultIdentity;
const RECOVERY_DEVICE = id<"DeviceIdentity">("device:log07:recovery");
const RECOVERY_CONTEXT: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: RECOVERY_VAULT, expectedDeviceIdentity: RECOVERY_DEVICE };
const RECOVERY_REMOTE: ManagedRemoteIdentity = { rootId: id<"RemoteObjectId">("root:log07:recovery"), vaultIdentity: RECOVERY_VAULT, protocolVersion: id<"ProtocolVersion">("1") };

function recoveryIntent(generation: SemanticStateGeneration) {
  const operationId = id<"OperationId">("op:log07:recovery");
  const intentId = id<"MutationIntentId">("intent:log07:recovery") as MutationIntentId;
  const target = id<"VaultPath">("recovery-log07.md");
  return {
    logicalKind: "single-effect",
    operationId,
    intentId,
    semanticAuthority: { generation },
    effects: [{
      effectId: "effect:log07:recovery",
      stage: "intent-persisted",
      descriptor: {
        kind: "remote-file",
        targetSide: "remote",
        mutationKind: "create",
        targetPath: target,
        intendedContent: { algorithm: "sha256", hash: id<"ContentHash">("sha256:recovery"), sizeBytes: 7 },
        remoteMutation: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: id<"RemoteObjectId">("remote:log07:reserved"), path: target, intendedContent: { algorithm: "sha256", hash: id<"ContentHash">("sha256:recovery"), sizeBytes: 7 } },
      },
    }],
  } as never;
}

async function recoveryWorld(staleGeneration: boolean) {
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const store = new SynchronizationStateAuthorityAdapter(raw);
  const diagnostics = await makeLogger();
  const current = id<"SemanticStateGeneration">("semantic:log07:current") as SemanticStateGeneration;
  const intentGeneration = staleGeneration ? id<"SemanticStateGeneration">("semantic:log07:stale") as SemanticStateGeneration : current;
  const trusted: DurableSynchronizationAuthorityState = {
    ...createInitialAuthorityState({ persistenceRevision: id<"StateRevision">("persistence:log07:1") as StateRevision, semanticGeneration: current, vaultIdentity: RECOVERY_VAULT, deviceIdentity: RECOVERY_DEVICE }),
    operationIntents: [recoveryIntent(intentGeneration)],
  };
  assert.equal((await raw.saveTrusted(trusted)).status, "saved");
  let controller!: ProductController;
  const assembly = { input: { snapshots: [], state: { status: "uninitialized" as const } }, managedRemote: RECOVERY_REMOTE, remoteEnumeration: { status: "complete" as const }, mode: "full" as const, reconstruction: true as const, recoveryReason: "LOG-07 recovery verification" };
  const assembler = { assemble: async () => assembly, assembleFull: async () => assembly, assembleRecovery: async () => assembly } as never;
  const local = { observe: async (path: any) => ({ status: "absent", side: "local", path }) } as never;
  const drive = { observe: async (_root: any, path: any) => ({ ok: true, value: { status: "absent", side: "remote", path } }), listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "complete" } } }) } as never;
  const executor = new ProductSynchronizationExecutor(local, drive, store, RECOVERY_CONTEXT, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: RECOVERY_VAULT,
    deviceIdentity: RECOVERY_DEVICE,
    stateContext: RECOVERY_CONTEXT,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: assembler,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: trigger => ({ plan: async () => ({ planId: id<"PlanId">("plan:log07:recovery"), trigger, operations: [], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" }) } as never),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "log07-recovery",
    recoveryActive: () => true,
    diagnostics,
  });
  let thrown: unknown;
  try { await controller.previewVerifyReconcile(); } catch (error) { thrown = error; }
  return { store, diagnostics, thrown };
}

function trace(bundle: string): any[] { return JSON.parse(bundle).structuredTrace as any[]; }
function event(bundle: string, name: string) { return trace(bundle).find(item => item.event === name); }

// Scenario 1
test("LOG-07 scenario 1: normal remote update is reconstructible through execution, Drive, HTTP, durable effect, canonical commit, and terminal result", async () => {
  const h = await normalUpdateExecutionWorld();
  assert.equal(h.result.status, "committed");
  assert.equal(h.rawAuthority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
  assert.equal(h.canonical.remoteMappings.some((value: any) => String(value.remoteObjectId) === "cand"), true);
  const bundle = await bundleText(h.diagnostics, await h.rawAuthority.loadAuthority());
  for (const expected of ["operation-entry", "durable-intent-persistence-complete", "physical-dispatch-start", "drive-update-candidate-upload-dispatch", "google-http-request-started", "drive-update-predecessor-retirement-dispatch", "physical-result-classified", "state-commit-complete", "durable-finalization-complete", "operation-complete"]) {
    assert.ok(event(bundle, expected), `${expected} missing from serialized bundle`);
  }
  const parsed = JSON.parse(bundle);
  assert.ok(parsed.causalIndex.runs[0].planIds.includes(String(PLAN_ID)));
  assert.ok(parsed.causalIndex.runs[0].operationIds.includes(String(OPERATION_ID)));
  assert.ok(parsed.causalIndex.runs[0].intentIds.includes(String(INTENT_ID)));
  assert.ok(parsed.causalIndex.runs[0].requestIds.length > 0);
  assert.equal(bundle.includes(RAW_PATH), false);
});

// Scenarios 2-5
test("LOG-07 scenarios 2-5: divergent exact-ID/path observations, ambiguous retirement, stale post-trash visibility, and third-candidate contamination remain distinct in exported bundles", async () => {
  for (const scenario of ["candidate-missing-from-list", "retirement-ambiguous", "post-list-stale", "third-occupant"] as const) {
    const diagnostics = await makeLogger();
    diagnostics.beginSyncRun(`log07-${scenario}`);
    const world = await updateWorld(scenario, diagnostics);
    const outcome = await world.run();
    const bundle = await bundleText(diagnostics);
    if (scenario === "candidate-missing-from-list") {
      assert.equal(outcome.status, "conflict-preserved");
      assert.equal(world.retirementPatchCalls(), 0);
      assert.equal(event(bundle, "drive-exact-id-observation-result") !== undefined, true);
      assert.ok(trace(bundle).some(item => item.event === "drive-update-topology-observed" && item.fields?.stage === "pre-retirement" && item.fields?.occupancyCount === 1));
      assert.ok(trace(bundle).some(item => item.event === "drive-update-retirement-branch" && item.fields?.result === "retirement-not-reached"));
    } else if (scenario === "retirement-ambiguous") {
      assert.equal(outcome.status, "verified-effect");
      assert.equal(world.retirementPatchCalls(), 1);
      assert.ok(trace(bundle).some(item => item.event === "drive-update-predecessor-retirement-dispatch" && item.fields?.result === "transport-failure"));
      assert.ok(trace(bundle).some(item => item.event === "google-http-request-failed" && item.fields?.endpointClass === "drive.files.patch"));
      assert.ok(trace(bundle).some(item => item.event === "drive-exact-id-observation-result" && item.fields?.stage === "predecessor-after-retirement" && item.fields?.trashed === true));
    } else if (scenario === "post-list-stale") {
      assert.equal(outcome.status, "outcome-unknown");
      assert.ok(trace(bundle).some(item => item.event === "drive-exact-id-observation-result" && item.fields?.stage === "predecessor-after-retirement" && item.fields?.trashed === true));
      assert.ok(trace(bundle).some(item => item.event === "drive-update-topology-observed" && item.fields?.stage === "post-retirement" && item.fields?.occupancyCount === 2));
    } else {
      assert.equal(outcome.status, "conflict-preserved");
      assert.equal(world.retirementPatchCalls(), 0);
      assert.ok(trace(bundle).some(item => item.event === "drive-update-retirement-branch" && item.fields?.reason === "independent-occupant-present" && item.fields?.occupancyCount === 3));
    }
  }
});

// Scenario 6
test("LOG-07 scenario 6: repaired production controller emits restart/outstanding-intent recovery lifecycle into the exported bundle", async () => {
  const h = await recoveryWorld(false);
  assert.equal(h.thrown, undefined);
  const authority = await h.store.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") throw new Error("trusted authority required");
  assert.equal(authority.state.operationIntents.length, 0);
  const bundle = await bundleText(h.diagnostics, authority);
  for (const expected of ["outstanding-recovery-preverification-entry", "recovery-intent-selected", "recovery-authority-generation", "recovery-intent-validation-succeeded", "recovery-unattempted-intent-retirement", "outstanding-recovery-final-result"]) assert.ok(event(bundle, expected), `${expected} missing`);
});

// Scenario 7
test("LOG-07 scenario 7: semantic-generation rejection is explicit in the exported recovery trace", async () => {
  const h = await recoveryWorld(true);
  assert.ok(h.thrown, "stale-generation recovery must fail closed");
  const bundle = await bundleText(h.diagnostics, await h.store.loadAuthority());
  assert.ok(trace(bundle).some(item => item.event === "recovery-authority-generation" && item.fields?.semanticGeneration !== item.fields?.intentSemanticGeneration));
  assert.ok(trace(bundle).some(item => item.event === "recovery-intent-validation-failed" && String(item.fields?.reason).includes("stale semantic generation")));
  assert.ok(trace(bundle).some(item => item.event === "outstanding-recovery-final-result" && item.fields?.result === "recovery-required"));
});

// Scenario 8
test("LOG-07 scenario 8: cancellation remains distinct from transport failure and successful mutation", async () => {
  const diagnostics = await makeLogger();
  diagnostics.beginSyncRun("log07-cancel");
  const world = await updateWorld("success", diagnostics);
  const result = await world.run({ cancelled: true });
  assert.equal(result.status, "verified-not-applied");
  assert.equal(world.requests.length, 0);
  const bundle = await bundleText(diagnostics);
  assert.ok(trace(bundle).some(item => item.event === "drive-update-convergence" && item.fields?.result === "verified-not-applied" && item.fields?.reason === "cancelled-before-dispatch"));
  assert.equal(trace(bundle).some(item => item.event === "google-http-request-failed"), false);
});

// Scenario 9
test("LOG-07 scenario 9: retry/rate-limit transport evidence preserves one request ID, attempts, classification, and chosen delay", async () => {
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
  const session = seededSession(backing, fetcher);
  const transport = new GoogleHttpTransport(session, fetcher, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, maxConcurrency: 1 }, async ms => { sleeps.push(ms); }, () => 0, () => 0, diagnostics, () => calls);
  const result = await transport.request("https://www.googleapis.com/drive/v3/files/SENTINEL_OBJECT?fields=id&access_token=SENTINEL_QUERY", { method: "GET" });
  assert.equal(result.ok, true);
  const bundle = await bundleText(diagnostics);
  const http = trace(bundle).filter(item => item.component === "drive.http");
  assert.equal(new Set(http.map(item => item.fields?.requestId)).size, 1);
  assert.deepEqual(http.filter(item => item.event === "google-http-attempt-started").map(item => item.fields?.attemptNumber), [1, 2, 3]);
  assert.ok(http.some(item => item.fields?.classification === "rate-limited"));
  assert.ok(http.some(item => item.fields?.classification === "transient-http-failure"));
  assert.equal(sleeps.length, 2);
  assert.equal(bundle.includes("SENTINEL_OBJECT"), false);
  assert.equal(bundle.includes("SENTINEL_QUERY"), false);
});

// Scenario 10 + non-authority equivalence
test("LOG-07 scenario 10: diagnostic persistence failure remains non-authoritative and diagnostics enabled/disabled preserve mutation outcome and request sequence", async () => {
  const failingDiagnostics = await makeLogger(new ThrowingDiagnostics());
  failingDiagnostics.beginSyncRun("log07-persistence-failure");
  const withDiagnostics = await updateWorld("success", failingDiagnostics);
  const withResult = await withDiagnostics.run();
  await failingDiagnostics.flush();

  const withoutDiagnostics = await updateWorld("success", undefined);
  const withoutResult = await withoutDiagnostics.run();
  assert.equal(withResult.status, "verified-effect");
  assert.equal(withoutResult.status, withResult.status);
  assert.deepEqual(withoutDiagnostics.requests.map(value => value.replace(/https:\/\/upload\.example\/session.*/, "UPLOAD")), withDiagnostics.requests.map(value => value.replace(/https:\/\/upload\.example\/session.*/, "UPLOAD")));
  assert.equal(withDiagnostics.retirementPatchCalls(), withoutDiagnostics.retirementPatchCalls());
  const bundle = await bundleText(failingDiagnostics);
  assert.ok(event(bundle, "drive-update-convergence"));
  assert.equal(bundle.includes("SENTINEL-diagnostic-persistence-failure"), false);
});

// Scenario 11 + boundedness/telemetry review
test("LOG-07 scenario 11: secret/content/path adversarial injection is excluded, trace is bounded, and no telemetry destination is introduced", async () => {
  const diagnostics = await makeLogger();
  const runId = diagnostics.beginSyncRun("log07-privacy");
  diagnostics.syncError("drive.http", "privacy-probe", runId, {
    path: "Private/SENTINEL_RAW_PATH.md",
    authorization: "Bearer SENTINEL_BEARER",
    rawUrl: "https://drive.invalid/files?code=SENTINEL_CODE&access_token=SENTINEL_TOKEN",
    body: "SENTINEL_FILE_CONTENT",
    requestBody: "SENTINEL_REQUEST_BODY",
    cookie: "SENTINEL_COOKIE",
  } as never);
  for (let index = 0; index < 700; index += 1) diagnostics.syncTrace("sync.execute", "bounded-probe", runId, { count: index });
  const bundle = await bundleText(diagnostics, {
    status: "trusted",
    state: {
      schemaVersion: 1,
      authoritySchemaVersion: 2,
      stateRevision: "state:privacy",
      persistenceRevision: "persist:privacy",
      semanticGeneration: "generation:privacy",
      vaultIdentity: "SENTINEL_VAULT_ID",
      deviceIdentity: "SENTINEL_DEVICE_ID",
      base: [{ path: "Private/SENTINEL_RAW_PATH.md", entityKind: "file", localExisted: true, remoteExisted: true }],
      remoteMappings: [], tombstones: [], baseAuthority: [], pathConvergence: [], learnedRemoteBatches: [], learnedRemoteReductions: [], operationIntents: [], localTransactions: [], operations: [], knownDevices: [],
    },
  });
  for (const forbidden of ["Private/SENTINEL_RAW_PATH.md", "SENTINEL_BEARER", "SENTINEL_CODE", "SENTINEL_TOKEN", "SENTINEL_FILE_CONTENT", "SENTINEL_REQUEST_BODY", "SENTINEL_COOKIE", "SENTINEL_VAULT_ID", "SENTINEL_DEVICE_ID"]) assert.equal(bundle.includes(forbidden), false, `${forbidden} leaked`);
  assert.ok(JSON.parse(bundle).structuredTrace.length <= 500);
  const runtime = readFileSync("src/product/runtime.ts", "utf8");
  const diagnosticBundle = readFileSync("src/diagnostics/diagnostic-bundle.ts", "utf8");
  assert.equal(/telemetry|analytics|sentry|datadog|segment\.io/i.test(`${runtime}\n${diagnosticBundle}`), false);
});
