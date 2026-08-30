import assert from "node:assert/strict";
import test from "node:test";
import type { ChangeCursor, ContentEvidence, DeviceIdentity, ManagedRemoteIdentity, PlanOperationKind, PlannedOperation, RemoteObjectId, StateLoadContext, SynchronizationPlan, VaultIdentity, VaultPath } from "../src/contracts";
import { contractId } from "../src/contracts";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import type { AuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController, type PlannerFactory } from "../src/product/product-controller";
import { DEFAULT_SETTINGS, PluginDataRepository } from "../src/product/plugin-data";
import { createSyncAttentionCsvFile, parseSyncAttentionRecordsCsv, SyncAttentionLedger, SYNC_ATTENTION_CSV_FILENAME, type SyncAttentionPersistence, type SyncAttentionRecord } from "../src/product/sync-attention-ledger";
import { DiagnosticLogger, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";
import { MeaningfulNotificationFilter } from "../src/product/notification-policy";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const vault = id<"VaultIdentity">("vault:mixed-plan") as VaultIdentity;
const device = id<"DeviceIdentity">("device:mixed-plan") as DeviceIdentity;
const root = id<"RemoteObjectId">("root:mixed-plan") as RemoteObjectId;
const managed: ManagedRemoteIdentity = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const evidence = (text: string): ContentEvidence => ({ hash: sha256Text(text), sizeBytes: new TextEncoder().encode(text).byteLength });

function operation(kind: PlanOperationKind, value: string, reasonCode = "fixture", options: Partial<PlannedOperation> = {}): PlannedOperation {
  const vaultPath = path(value);
  return {
    operationId: id<"OperationId">(`operation:${kind}:${value}`), kind, path: vaultPath,
    destructive: kind.startsWith("trash-"), preconditions: [], reasons: [{ code: reasonCode, summary: `${reasonCode} requires attention.` }],
    ...options,
  };
}
function upload(value: string): PlannedOperation {
  const vaultPath = path(value);
  return operation("upload-create", value, "safe-upload", { targetSide: "remote", contentVersion: { path: vaultPath, entityKind: "file", content: evidence(value) } });
}
function plan(trigger: SynchronizationPlan["trigger"], operations: readonly PlannedOperation[], gate: NonNullable<SynchronizationPlan["globalExecutionGate"]> = "none", checkpoint = false): SynchronizationPlan {
  return {
    planId: id<"PlanId">(`plan:${trigger}:${operations.map(item => String(item.operationId)).join(":")}`), trigger, operations,
    executionDisposition: gate === "globally-blocked" ? "blocked" : operations.some(item => ["blocked-unsafe", "unresolved-conflict"].includes(item.kind)) || checkpoint ? "requires-user-approval" : "safe-auto-eligible",
    recoveryCheckpointRequired: checkpoint, globalExecutionGate: gate,
  };
}

class MemoryAttention implements SyncAttentionPersistence {
  records: SyncAttentionRecord[] = [];
  saves = 0;
  async loadSyncAttention(): Promise<readonly SyncAttentionRecord[]> { return this.records.map(record => ({ ...record })); }
  async saveSyncAttention(records: readonly SyncAttentionRecord[]): Promise<void> { this.saves += 1; this.records = records.map(record => ({ ...record })); }
}

interface ControllerHarness {
  readonly controller: IntegratedProductController;
  readonly state: PersistentSynchronizationStateStore;
  readonly executed: PlannedOperation[];
  readonly ledger: SyncAttentionLedger;
  readonly persistence: MemoryAttention;
}

async function harness(plans: readonly SynchronizationPlan[], options: {
  readonly firstSync?: boolean;
  readonly cursor?: ChangeCursor;
  readonly diagnostics?: DiagnosticLogger;
  readonly persistence?: SyncAttentionPersistence;
  readonly auditPersistence?: AuditPersistence;
  readonly staleDevice?: boolean;
  readonly plannerForTrigger?: PlannerFactory;
  readonly beforeExecute?: (operation: PlannedOperation) => Promise<void>;
  readonly onBaseline?: () => Promise<void>;
} = {}): Promise<ControllerHarness> {
  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  if (!options.firstSync) {
    const initial = createInitialTrustedState({ stateRevision: id<"StateRevision">("state:mixed:0"), vaultIdentity: vault, deviceIdentity: device });
    await state.saveTrusted({ ...initial, changeCursor: options.cursor, knownDevices: initial.knownDevices.map(entry => ({ ...entry, stale: options.staleDevice ?? entry.stale })) });
  }
  let planIndex = 0;
  const executed: PlannedOperation[] = [];
  const memory = options.persistence instanceof MemoryAttention ? options.persistence : new MemoryAttention();
  const ledger = new SyncAttentionLedger(options.persistence ?? memory, 20);
  const assembly = async () => ({
    input: { snapshots: [], state: await state.load(options.firstSync ? { expectation: "new-installation" } : context) },
    managedRemote: managed, remoteEnumeration: { status: "complete" as const }, mode: "full" as const,
    nextCursor: id<"ChangeCursor">("cursor:candidate") as ChangeCursor,
  });
  const controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: options.firstSync ? { expectation: "new-installation" } : context,
    stateStore: state, snapshotAssembler: { assemble: assembly, assembleFull: assembly } as never,
    executor: {
      validatePreconditions: async () => ({ status: "valid" as const }),
      execute: async (candidate: PlannedOperation) => {
        executed.push(candidate);
        await options.beforeExecute?.(candidate);
        return { status: "durable-verified-success" as const, receipt: { operationId: candidate.operationId, durable: true as const, integrityVerified: true as const, evidence: candidate.contentVersion?.content, resultingRemoteObjectId: candidate.remoteObjectId ?? id<"RemoteObjectId">(`remote:${String(candidate.path)}`), verificationEvidenceRef: "mixed-plan-fixture" } };
      },
      failureScope: () => "global" as const,
    } as never,
    conflictResolver: { assess: async () => ({ kind: "none" as const }) },
    plannerForTrigger: options.plannerForTrigger ?? (() => new ProductionSynchronizationPlanner({ plan: async () => plans[Math.min(planIndex++, plans.length - 1)]! })),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) }, audit: new BoundedAuditHistory(options.auditPersistence ?? new MemoryAuditPersistence(), 50),
    holderId: "mixed-plan-test", attentionLedger: ledger, diagnostics: options.diagnostics, onTrustedBaselineEstablished: options.onBaseline,
  });
  return { controller, state, executed, ledger, persistence: memory };
}

test("mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability", async () => {
  const oldCursor = id<"ChangeCursor">("cursor:old") as ChangeCursor;
  const blocked = operation("blocked-unsafe", "editing.md", "local-file-not-stable");
  const safe = upload("safe.md");
  const h = await harness([
    plan("periodic", [blocked, safe]),
    plan("periodic", [blocked, operation("noop", "safe.md", "equal-current-content")]),
  ], { cursor: oldCursor });
  await h.controller.runAutomatic("periodic");
  assert.deepEqual(h.executed.map(item => item.kind), ["upload-create"]);
  assert.equal(h.controller.currentSurface().status.kind, "attention-required");
  let loaded = await h.state.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") { assert.equal(loaded.state.changeCursor, oldCursor); assert.ok(loaded.state.base.some(entry => entry.path === safe.path)); }
  await h.controller.runAutomatic("periodic");
  assert.equal(h.executed.filter(item => item.kind === "upload-create").length, 1, "already committed upload must not duplicate");
  loaded = await h.state.load(context);
  if (loaded.status === "trusted") assert.equal(loaded.state.changeCursor, oldCursor, "partial run must not advance cursor");
});

test("automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers", async () => {
  let diagnosticState: DiagnosticStoreState | undefined;
  const diagnostics = new DiagnosticLogger({
    persistence: { loadDiagnostics: async () => diagnosticState, saveDiagnostics: async state => { diagnosticState = state; } },
    level: "trace", retentionLimit: 200, consoleMirror: false, platform: "mobile",
  });
  await diagnostics.initialize();
  const periodicPlan = plan("periodic", [upload("periodic-first.md")]);
  const localPlan = plan("local-change", [upload("local-second.md")]);
  let planningActive = 0;
  let maximumPlanningActive = 0;
  const plannerTriggers: SynchronizationPlan["trigger"][] = [];
  let firstPlannerEntered!: () => void;
  let releaseFirstPlanner!: () => void;
  const firstPlannerEntry = new Promise<void>(resolve => { firstPlannerEntered = resolve; });
  const firstPlannerRelease = new Promise<void>(resolve => { releaseFirstPlanner = resolve; });
  let firstMutationEntered!: () => void;
  let releaseFirstMutation!: () => void;
  const firstMutationEntry = new Promise<void>(resolve => { firstMutationEntered = resolve; });
  const firstMutationRelease = new Promise<void>(resolve => { releaseFirstMutation = resolve; });
  let mutationActive = 0;
  let maximumMutationActive = 0;
  const plannerForTrigger: PlannerFactory = trigger => ({ plan: async () => {
    plannerTriggers.push(trigger);
    planningActive += 1;
    maximumPlanningActive = Math.max(maximumPlanningActive, planningActive);
    try {
      if (plannerTriggers.length === 1) { firstPlannerEntered(); await firstPlannerRelease; }
      return trigger === "periodic" ? periodicPlan : localPlan;
    } finally { planningActive -= 1; }
  } });
  const h = await harness([], {
    diagnostics,
    plannerForTrigger,
    beforeExecute: async candidate => {
      mutationActive += 1;
      maximumMutationActive = Math.max(maximumMutationActive, mutationActive);
      try {
        if (candidate.operationId === periodicPlan.operations[0]?.operationId) { firstMutationEntered(); await firstMutationRelease; }
      } finally { mutationActive -= 1; }
    },
  });
  const syncingPlanIds: string[] = [];
  h.controller.onSurface(surface => { if (surface.status.kind === "syncing") syncingPlanIds.push(String(surface.status.planId)); });

  const first = h.controller.runAutomatic("periodic");
  await firstPlannerEntry;
  const second = h.controller.runAutomatic("local-change");
  await Promise.resolve();
  assert.deepEqual(plannerTriggers, ["periodic"], "a queued trigger cannot start a competing planner");
  releaseFirstPlanner();
  await firstMutationEntry;
  assert.deepEqual(plannerTriggers, ["periodic"], "the coalesced reconciliation waits for the first execution to finish");
  releaseFirstMutation();
  await Promise.all([first, second]);
  await diagnostics.flush();

  assert.equal(maximumPlanningActive, 1);
  assert.equal(maximumMutationActive, 1);
  assert.deepEqual(plannerTriggers, ["periodic", "local-change"]);
  assert.deepEqual(syncingPlanIds, [String(periodicPlan.planId), String(localPlan.planId)]);
  assert.deepEqual(h.executed.map(item => String(item.operationId)), [String(periodicPlan.operations[0]?.operationId), String(localPlan.operations[0]?.operationId)]);
  assert.equal(new Set(h.executed.map(item => String(item.operationId))).size, 2, "each actual mutation executes once");

  const starts = diagnostics.snapshot().filter(event => event.event === "automatic-sync-attempt-started");
  assert.equal(starts.length, 2);
  assert.deepEqual(starts.map(event => event.fields?.trigger), ["periodic", "local-change"]);
  assert.equal(new Set(starts.map(event => event.runId)).size, 2);
  for (const start of starts) {
    assert.ok(diagnostics.snapshot().some(event => event.runId === start.runId && event.event === "planning-start" && event.fields?.trigger === start.fields?.trigger));
    assert.ok(diagnostics.snapshot().some(event => event.runId === start.runId && event.event === "sync-run-complete"));
  }
});

test("conflict and all-blocked plans isolate affected paths without mutating them", async () => {
  const conflict = operation("unresolved-conflict", "conflict.md", "unresolved-text");
  const safe = upload("unrelated.md");
  const mixed = await harness([plan("periodic", [conflict, safe])]);
  await mixed.controller.runAutomatic("periodic");
  assert.deepEqual(mixed.executed.map(item => String(item.path)), ["unrelated.md"]);
  const only = await harness([plan("periodic", [operation("blocked-unsafe", "only.md", "local-file-not-stable")])]);
  await only.controller.runAutomatic("periodic");
  assert.equal(only.executed.length, 0);
  assert.equal(only.controller.currentSurface().status.kind, "attention-required");
});

test("global recovery and destructive approval gates cannot execute a safe subset automatically", async () => {
  const recovery = await harness([plan("periodic", [upload("safe.md"), operation("recovery-required", "__state__", "untrusted-base")], "globally-blocked")]);
  await recovery.controller.runAutomatic("periodic");
  assert.equal(recovery.executed.length, 0);
  const destructive = await harness([plan("periodic", [upload("safe.md"), operation("trash-remote", "delete.md")], "destructive-approval-required", true)]);
  await destructive.controller.runAutomatic("periodic");
  assert.equal(destructive.executed.length, 0);
  const preview = await destructive.controller.previewManual();
  assert.ok(preview);
  assert.equal((await destructive.controller.request({ kind: "execute-plan", planId: preview.planId })).status, "rejected");
});

test("stale-device destructive work is isolated while independent safe work commits without cursor advancement", async () => {
  const oldCursor = id<"ChangeCursor">("cursor:stale-old") as ChangeCursor;
  const deletion = operation("trash-remote", "stale-delete.md", "attested-local-deletion", { remoteObjectId: id<"RemoteObjectId">("remote:stale-delete") });
  const h = await harness([plan("periodic", [deletion, upload("independent-safe.md")])], { cursor: oldCursor, staleDevice: true });
  await h.controller.runAutomatic("periodic");
  assert.deepEqual(h.executed.map(item => String(item.path)), ["independent-safe.md"]);
  const current = await h.ledger.current();
  assert.ok(current.some(record => String(record.path) === "stale-delete.md" && record.reasonCode === "stale-device-destructive-gate"));
  const status = h.controller.currentSurface().status;
  assert.equal(status.kind, "attention-required");
  if (status.kind === "attention-required") {
    assert.equal(status.phase, "completed");
    assert.equal(status.safeOperationsCommitted, 1);
  }
  const loaded = await h.state.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") assert.equal(loaded.state.changeCursor, oldCursor);
});

test("ordinary authorized deletion still executes automatically", async () => {
  const deletion = operation("trash-remote", "ordinary-delete.md", "attested-local-deletion", { remoteObjectId: id<"RemoteObjectId">("remote:delete") });
  const h = await harness([plan("periodic", [deletion])]);
  await h.controller.runAutomatic("periodic");
  assert.deepEqual(h.executed.map(item => item.kind), ["trash-remote"]);
});

test("partial first-sync safe union commits progress but cannot complete baseline or cursor authority", async () => {
  let baselineCompletions = 0;
  const h = await harness([plan("manual", [upload("first-safe.md"), operation("blocked-unsafe", "first-blocked.md", "local-file-not-stable")])], { firstSync: true, onBaseline: async () => { baselineCompletions += 1; } });
  const preview = await h.controller.previewManual();
  assert.ok(preview);
  assert.equal((await h.controller.request({ kind: "execute-plan", planId: preview.planId })).status, "accepted");
  assert.equal(baselineCompletions, 0);
  const loaded = await h.state.load({ expectation: "new-installation" });
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") { assert.equal(loaded.state.changeCursor, undefined); assert.ok(loaded.state.base.some(entry => String(entry.path) === "first-safe.md")); }
});

test("transient unstable path clears from current attention after a later stable retry", async () => {
  const unstable = operation("blocked-unsafe", "live-edit.md", "local-file-not-stable");
  const h = await harness([plan("periodic", [unstable, upload("other.md")]), plan("periodic", [upload("live-edit.md")])]);
  await h.controller.runAutomatic("periodic");
  assert.ok((await h.ledger.current()).some(record => String(record.path) === "live-edit.md"));
  await h.controller.runAutomatic("periodic");
  assert.equal((await h.ledger.current()).some(record => String(record.path) === "live-edit.md"), false);
  assert.ok(h.executed.some(item => String(item.path) === "live-edit.md"));
});

test("dependency isolation skips a child of a blocked parent while unrelated work proceeds", async () => {
  const h = await harness([plan("periodic", [operation("blocked-unsafe", "blocked-folder", "parent-create-blocked"), upload("blocked-folder/child.md"), upload("independent.md")])]);
  await h.controller.runAutomatic("periodic");
  assert.deepEqual(h.executed.map(item => String(item.path)), ["independent.md"]);
  const attention = await h.ledger.current();
  assert.ok(attention.some(record => String(record.path) === "blocked-folder/child.md" && record.reasonCode === "dependency-on-skipped-operation"));
});

test("attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely", async () => {
  const persistence = new MemoryAttention();
  const ledger = new SyncAttentionLedger(persistence, 1);
  const special = path("=SUM(1,2), \"quoted\"\nUnicode-雪.md");
  const entry = { timestampMs: 1, runId: 7, trigger: "periodic", path: special, category: "blocked-unsafe" as const, reasonCode: "@formula", humanReason: "+reason, \"quoted\"\nnext line 雪" };
  await ledger.recordSkipped([entry]);
  await ledger.recordSkipped([{ ...entry, timestampMs: 2 }]);
  await ledger.recordSkipped([
    { ...entry, path: path("two.md"), timestampMs: 3 },
    { ...entry, path: path("three.md"), timestampMs: 4 },
  ]);
  assert.equal((await ledger.current()).length, 3, "active issues are not subject to the history bound");
  assert.equal((await ledger.all()).length, 3);
  assert.equal((await ledger.all()).find(record => record.path === special)?.occurrenceCount, 2);
  const csv = await ledger.renderCsv();
  assert.match(csv, /"'=SUM\(1,2\), ""quoted""\nUnicode-雪\.md"/u);
  assert.match(csv, /"'@formula"/u);
  assert.match(csv, /"'\+reason, ""quoted""\nnext line 雪"/u);
  assert.match(csv, /two\.md/u);
  assert.match(csv, /three\.md/u);
  const exported = createSyncAttentionCsvFile(csv);
  assert.equal(exported.name, SYNC_ATTENTION_CSV_FILENAME);
  assert.equal(exported.type, "text/csv;charset=utf-8");
  assert.equal(exported.size, new TextEncoder().encode(csv).byteLength);
  await ledger.resolvePath(special);
  await ledger.resolvePath(path("two.md"));
  assert.deepEqual((await ledger.current()).map(record => String(record.path)), ["three.md"]);
  assert.equal((await ledger.all()).length, 2);
  assert.equal((await ledger.all()).filter(record => !record.current).length, 1, "resolved history is trimmed to its configured bound");
  await ledger.resolvePath(path("three.md"));
  assert.equal((await ledger.current()).length, 0);
  assert.equal((await ledger.all()).length, 1);
  assert.ok(persistence.saves > 0, "only plugin-owned persistence is used; no vault adapter participates");
});

test("a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it", async () => {
  const target = "superseded.md";
  const h = await harness([
    plan("periodic", [operation("blocked-unsafe", target, "local-file-not-stable")]),
    plan("periodic", [operation("blocked-unsafe", target, "local-path-inaccessible")]),
    plan("periodic", [upload(target)]),
  ]);
  await h.controller.runAutomatic("periodic");
  await h.controller.runAutomatic("periodic");
  const currentAfterReplacement = await h.ledger.current();
  assert.equal(currentAfterReplacement.length, 1);
  assert.equal(currentAfterReplacement[0]?.reasonCode, "local-path-inaccessible");
  const afterReplacement = await h.ledger.all();
  assert.equal(afterReplacement.find(record => record.reasonCode === "local-file-not-stable")?.current, false);
  assert.equal(afterReplacement.find(record => record.reasonCode === "local-path-inaccessible")?.current, true);
  const csvAfterReplacement = await h.ledger.renderCsv();
  const csvRecords = parseSyncAttentionRecordsCsv(csvAfterReplacement);
  assert.equal(csvRecords.find(record => record.reasonCode === "local-file-not-stable")?.current, false);
  assert.equal(csvRecords.find(record => record.reasonCode === "local-path-inaccessible")?.current, true);
  const status = h.controller.currentSurface().status;
  assert.equal(status.kind, "attention-required");
  if (status.kind === "attention-required") assert.equal(status.attentionCount, 1);

  await h.controller.runAutomatic("periodic");
  assert.equal((await h.ledger.current()).some(record => String(record.path) === target), false);
  const history = (await h.ledger.all()).filter(record => String(record.path) === target);
  assert.equal(history.length, 2);
  assert.equal(history.every(record => !record.current), true);
});

test("ledger persistence failure is surfaced but does not roll back authorized safe work", async () => {
  const failing: SyncAttentionPersistence = { loadSyncAttention: async () => [], saveSyncAttention: async () => { throw new Error("device-local metadata write failed"); } };
  const h = await harness([plan("periodic", [operation("blocked-unsafe", "blocked.md", "local-file-not-stable"), upload("safe.md")])], { persistence: failing });
  await h.controller.runAutomatic("periodic");
  assert.deepEqual(h.executed.map(item => String(item.path)), ["safe.md"]);
  const status = h.controller.currentSurface().status;
  assert.equal(status.kind, "attention-required");
  if (status.kind === "attention-required") assert.equal(status.ledgerAvailable, false);
});

test("one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution", async () => {
  let saveCalls = 0;
  const persisted: unknown[] = [];
  const repository = new PluginDataRepository({
    loadData: async () => undefined,
    saveData: async payload => {
      saveCalls += 1;
      if (saveCalls === 1 || saveCalls === 3) throw new Error(`fixture persistence failure ${saveCalls}`);
      persisted.push(payload);
    },
  });

  await assert.rejects(repository.saveSettings({ ...DEFAULT_SETTINGS, oauthClientId: "failed-caller" }), /fixture persistence failure 1/);
  await repository.saveDiagnostics({ records: [], nextSequence: 1, nextAttemptId: 1, nextRunId: 1 });
  assert.equal(saveCalls, 2, "a later queued write must actually invoke host.saveData");
  assert.equal(persisted.length, 1);

  const h = await harness(
    [plan("periodic", [operation("blocked-unsafe", "attention-write-fails.md", "local-file-not-stable"), upload("safe-after-failure.md")])],
    { persistence: repository, auditPersistence: repository },
  );
  await h.controller.runAutomatic("periodic");
  assert.deepEqual(h.executed.map(item => String(item.path)), ["safe-after-failure.md"], "plan audit persisted after the shared attention write failed");
  assert.equal(saveCalls, 5, "plan and operation audit writes continued through the shared repository");
  const status = h.controller.currentSurface().status;
  assert.equal(status.kind, "attention-required");
  if (status.kind === "attention-required") assert.equal(status.ledgerAvailable, false);

  const callsBeforeLaterWrite = saveCalls;
  await repository.saveSettings({ ...DEFAULT_SETTINGS, oauthClientId: "later-write-succeeds" });
  assert.equal(saveCalls, callsBeforeLaterWrite + 1);
  assert.equal((await repository.loadSettings()).oauthClientId, "later-write-succeeds");
});

test("serialized plugin repository writes keep per-call immutable payload snapshots", async () => {
  const payloads: Array<{ settings?: { oauthClientId?: string } }> = [];
  let releaseFirst!: () => void;
  let firstStarted!: () => void;
  const firstStartedPromise = new Promise<void>(resolve => { firstStarted = resolve; });
  const firstReleasePromise = new Promise<void>(resolve => { releaseFirst = resolve; });
  const repository = new PluginDataRepository({
    loadData: async () => undefined,
    saveData: async payload => {
      payloads.push(payload as { settings?: { oauthClientId?: string } });
      if (payloads.length === 1) { firstStarted(); await firstReleasePromise; }
    },
  });

  const first = repository.saveSettings({ ...DEFAULT_SETTINGS, oauthClientId: "queued-a" });
  await firstStartedPromise;
  const second = repository.saveSettings({ ...DEFAULT_SETTINGS, oauthClientId: "queued-b" });
  const third = repository.saveSettings({ ...DEFAULT_SETTINGS, oauthClientId: "queued-c" });
  assert.equal(payloads[0]?.settings?.oauthClientId, "queued-a");
  releaseFirst();
  await Promise.all([first, second, third]);
  assert.deepEqual(payloads.map(payload => payload.settings?.oauthClientId), ["queued-a", "queued-b", "queued-c"]);
});

test("automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets", async () => {
  let diagnosticState: DiagnosticStoreState | undefined;
  const diagnostics = new DiagnosticLogger({
    persistence: { loadDiagnostics: async () => diagnosticState, saveDiagnostics: async state => { diagnosticState = state; } },
    level: "trace", retentionLimit: 200, consoleMirror: false, platform: "mobile",
  });
  await diagnostics.initialize();
  const privatePath = "SENTINEL_PRIVATE_PATH.md";
  const h = await harness([plan("periodic", [operation("blocked-unsafe", privatePath, "local-file-not-stable"), upload("safe.md")])], { diagnostics });
  await h.controller.runAutomatic("periodic");
  await diagnostics.flush();
  const events = diagnostics.snapshot();
  const runIds = new Set(events.filter(event => event.component.startsWith("sync.")).map(event => event.runId));
  assert.equal(runIds.size, 1);
  assert.equal(runIds.has(undefined), false);
  assert.ok(events.some(event => event.event === "planning-start" && event.fields?.trigger === "periodic"));
  const terminal = events.find(event => event.event === "sync-run-complete");
  assert.equal(terminal?.fields?.result, "partial");
  assert.equal(terminal?.fields?.safeCommittedCount, 1);
  assert.equal(terminal?.fields?.skippedCount, 1);
  assert.equal(terminal?.fields?.attentionReasonCodes, "local-file-not-stable");
  assert.doesNotMatch(diagnostics.renderText(), /SENTINEL_PRIVATE_PATH|access_token|client_secret/i);
});

test("controller surface emits no premature completion and exactly one terminal mixed-run notice", async () => {
  const filter = new MeaningfulNotificationFilter();
  const h = await harness([plan("periodic", [operation("blocked-unsafe", "mixed-attention.md", "local-file-not-stable"), upload("mixed-safe.md")])]);
  const observed: Array<{ readonly kind: string; readonly phase?: string; readonly notice?: string }> = [];
  h.controller.onSurface(surface => {
    const notice = filter.next(surface);
    observed.push({
      kind: surface.status.kind,
      ...(surface.status.kind === "attention-required" ? { phase: surface.status.phase } : {}),
      ...(notice ? { notice } : {}),
    });
  });
  await h.controller.runAutomatic("periodic");
  const notices = observed.flatMap(item => item.notice ? [item.notice] : []);
  assert.equal(notices.length, 1);
  assert.match(notices[0]!, /1 path\(s\) requiring attention; 1 safe operation\(s\) synchronized/u);
  assert.ok(observed.some(item => item.kind === "attention-required" && item.phase === "planned" && !item.notice));
  assert.ok(observed.some(item => item.kind === "attention-required" && item.phase === "completed" && Boolean(item.notice)));
});

test("notification identity suppresses the same attention but reports changed paths and reasons with identical counts", async () => {
  let diagnosticState: DiagnosticStoreState | undefined;
  const diagnostics = new DiagnosticLogger({
    persistence: { loadDiagnostics: async () => diagnosticState, saveDiagnostics: async state => { diagnosticState = state; } },
    level: "trace", retentionLimit: 200, consoleMirror: false, platform: "mobile",
  });
  await diagnostics.initialize();
  const filter = new MeaningfulNotificationFilter();
  const pathA = "PRIVATE_ATTENTION_A.md";
  const pathB = "PRIVATE_ATTENTION_B.md";
  const h = await harness([
    plan("periodic", [operation("blocked-unsafe", pathA, "local-file-not-stable")]),
    plan("periodic", [operation("blocked-unsafe", pathA, "local-file-not-stable")]),
    plan("periodic", [operation("blocked-unsafe", pathA, "local-path-inaccessible")]),
    plan("periodic", [operation("blocked-unsafe", pathB, "local-file-not-stable")]),
  ], { diagnostics });
  const notices: string[] = [];
  let prematureCompletionNotices = 0;
  h.controller.onSurface(surface => {
    const notice = filter.next(surface);
    if (surface.status.kind === "attention-required" && surface.status.phase === "planned" && notice) prematureCompletionNotices += 1;
    if (notice) notices.push(notice);
  });
  await h.controller.runAutomatic("periodic");
  assert.equal(notices.length, 1);
  assert.match(notices[0]!, /no unsafe paths were changed/u);
  const firstStatus = h.controller.currentSurface().status;
  assert.equal(firstStatus.kind, "attention-required");
  if (firstStatus.kind === "attention-required") {
    assert.match(firstStatus.attentionIdentity, /^sha256:[0-9a-f]{64}$/u);
    assert.doesNotMatch(firstStatus.attentionIdentity, /PRIVATE_ATTENTION/u);
  }
  await h.controller.runAutomatic("periodic");
  assert.equal(notices.length, 1, "the same unresolved terminal attention result is deduplicated");
  await h.controller.runAutomatic("periodic");
  assert.equal(notices.length, 2, "the same path with a different reason has a different identity");
  await h.ledger.resolvePath(path(pathA));
  await h.controller.runAutomatic("periodic");
  assert.equal(notices.length, 3, "a replacement path with the same counts still emits a notice");
  assert.equal(prematureCompletionNotices, 0);
  await diagnostics.flush();
  assert.doesNotMatch(diagnostics.renderText(), /PRIVATE_ATTENTION_A|PRIVATE_ATTENTION_B/u);
});

test("startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID", async () => {
  for (const trigger of ["startup-resume", "local-change", "periodic"] as const) {
    let diagnosticState: DiagnosticStoreState | undefined;
    const diagnostics = new DiagnosticLogger({
      persistence: { loadDiagnostics: async () => diagnosticState, saveDiagnostics: async state => { diagnosticState = state; } },
      level: "trace", retentionLimit: 100, consoleMirror: false, platform: "mobile",
    });
    await diagnostics.initialize();
    const h = await harness([plan(trigger, [operation("blocked-unsafe", `${trigger}.md`, "local-file-not-stable")])], { diagnostics });
    await h.controller.runAutomatic(trigger);
    await diagnostics.flush();
    const relevant = diagnostics.snapshot().filter(event => event.component.startsWith("sync."));
    assert.ok(relevant.length > 0);
    assert.equal(relevant.every(event => typeof event.runId === "number"), true);
    assert.ok(relevant.some(event => event.event === "automatic-sync-attempt-started" && event.fields?.trigger === trigger));
    assert.ok(relevant.some(event => event.event === "sync-run-complete" && event.fields?.result === "partial"));
  }
});
