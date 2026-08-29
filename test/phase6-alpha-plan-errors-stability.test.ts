import assert from "node:assert/strict";
import test from "node:test";
import type { App, DataAdapter, TAbstractFile } from "obsidian";
import { contractId, type LocalVaultPort, type ManagedRemoteIdentity, type ObservationToken, type VaultPath } from "../src/contracts";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { InMemoryRunLeasePort } from "../src/core/run-coordinator";
import { LocalStaleObservationError } from "../src/local/obsidian-local-vault";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { CanonicalEvidenceLocalVault } from "../src/product/canonical-local-vault";
import { DEFAULT_SETTINGS } from "../src/product/plugin-data";
import { ProductPathScope, ScopedLocalVault } from "../src/product/path-scope";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { SyncAttentionLedger, parseSyncAttentionRecordsCsv } from "../src/product/sync-attention-ledger";
import { SyncPlanErrorsCsvPersistence } from "../src/product/sync-plan-errors-csv";
import { resolveSyncPlanErrorsPath, withManagedSyncPlanErrorsExclusion } from "../src/product/sync-plan-errors-path";
import { sha256Bytes } from "../src/util/sha256";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";

const vp = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const token = (value: string) => contractId<"ObservationToken">(value) as ObservationToken;
const bytes = (value: string) => new TextEncoder().encode(value);
const source = (value: Uint8Array) => ({ sizeBytes: value.byteLength, async *openChunks() { yield value; } });
const present = (path: VaultPath, observationToken: ObservationToken) => ({
  status: "present" as const, side: "local" as const, path, entityKind: "file" as const,
  content: { sizeBytes: 4 }, stability: "stable" as const, observationToken,
});

test("transient canonical stale observation retries to stable evidence without persistent attention", async () => {
  const path = vp("editing.md"), first = token("first"), second = token("second"), content = bytes("done");
  let current = first, reads = 0;
  const inner = {
    async enumerate() { return { entries: [present(path, first)], completeness: { status: "complete" as const } }; },
    async observe() { return present(path, current); },
    async readFile(_path: VaultPath, expected?: ObservationToken) {
      reads += 1;
      if (expected === first) { current = second; throw new LocalStaleObservationError(path); }
      return { content: source(content), evidence: { sizeBytes: content.byteLength }, stability: "stable" as const, observationToken: second };
    },
  } as unknown as LocalVaultPort;
  const listing = await new CanonicalEvidenceLocalVault(inner, { staleRetryAttempts: 3, staleRetryDelayMs: 0 }).enumerate();
  assert.equal(reads, 2);
  assert.equal(listing.completeness.status, "complete");
  assert.equal(listing.entries[0]?.status, "present");
  if (listing.entries[0]?.status === "present") {
    assert.equal(listing.entries[0].stability, "stable");
    assert.equal(listing.entries[0].content?.hash, sha256Bytes(content));
  }
});

test("persistent canonical instability is path-local local-file-not-stable and does not change listing completeness", async () => {
  const path = vp("still-editing.md");
  let generation = 0;
  const observation = () => present(path, token(`token-${generation}`));
  const inner = {
    async enumerate() { return { entries: [observation()], completeness: { status: "complete" as const } }; },
    async observe() { generation += 1; return observation(); },
    async readFile() { generation += 1; throw new LocalStaleObservationError(path); },
  } as unknown as LocalVaultPort;
  const listing = await new CanonicalEvidenceLocalVault(inner, { staleRetryAttempts: 2, staleRetryDelayMs: 0 }).enumerate();
  assert.equal(listing.completeness.status, "complete");
  const local = listing.entries[0]!;
  assert.equal(local.status, "present");
  if (local.status === "present") assert.equal(local.stability, "unstable");
  const planner = new DeterministicSynchronizationPlanner({ assess: async () => ({ kind: "none" as const }) });
  const plan = await planner.plan({
    state: { status: "uninitialized" },
    snapshots: [{ path, local, remote: { status: "absent", side: "remote", path }, base: { status: "uninitialized" }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" } }],
  });
  assert.equal(plan.operations[0]?.kind, "blocked-unsafe");
  assert.equal(plan.operations[0]?.reasons[0]?.code, "local-file-not-stable");
});

test("one path content-evidence failure does not contaminate unrelated portable paths, while real listing incompleteness still does", async () => {
  const bad = vp("bad.md"), portable = vp("__brain_sync_portable_config__/appearance.json"), badToken = token("bad");
  const make = (completeness: { status: "complete" } | { status: "partial"; reason: string }) => new CanonicalEvidenceLocalVault({
    async enumerate() { return { entries: [present(bad, badToken)], completeness }; },
    async readFile() { throw new Error("one file could not be read"); },
    async observe() { return present(bad, badToken); },
  } as unknown as LocalVaultPort, { staleRetryDelayMs: 0 });
  const identity = { rootId: contractId<"RemoteObjectId">("root"), vaultIdentity: contractId<"VaultIdentity">("vault"), protocolVersion: contractId<"ProtocolVersion">("1") } as ManagedRemoteIdentity;
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    getStartCursor: async () => ({ ok: true as const, value: contractId<"ChangeCursor">("cursor") }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [{ path: portable, entityKind: "file" as const, remoteObjectId: contractId<"RemoteObjectId">("portable-id"), content: { hash: sha256Bytes(bytes("remote")) }, trashed: false }], completeness: { status: "complete" as const } } }),
  };
  const state = { load: async () => ({ status: "uninitialized" as const }) };
  const complete = await new ProductSnapshotAssembler(make({ status: "complete" }), drive as never, state as never, { expectation: "new-installation" }, async () => identity).assembleFull();
  assert.equal(complete.localEnumeration?.status, "complete");
  assert.equal(complete.input.snapshots.find(item => item.path === portable)?.local.status, "absent");
  assert.equal(complete.input.snapshots.find(item => item.path === bad)?.local.status, "unknown");
  const partial = await new ProductSnapshotAssembler(make({ status: "partial", reason: "directory listing failed" }), drive as never, state as never, { expectation: "new-installation" }, async () => identity).assembleFull();
  assert.equal(partial.localEnumeration?.status, "partial");
  assert.equal(partial.input.snapshots.find(item => item.path === portable)?.local.status, "unknown");
});

class MemoryVault {
  readonly files = new Map<string, string>();
  readonly folders = new Set<string>();
  failNextFinalRename = false;
  private readonly listeners = new Map<string, Set<(...args: any[]) => void>>();
  readonly app: App;
  constructor() {
    const adapter = {
      exists: async (path: string) => this.files.has(path) || this.folders.has(path),
      read: async (path: string) => { const value = this.files.get(path); if (value === undefined) throw new Error(`missing ${path}`); return value; },
      write: async (path: string, value: string) => { this.files.set(path, value); },
      mkdir: async (path: string) => { this.folders.add(path); },
      stat: async (path: string) => this.folders.has(path) ? { type: "folder", ctime: 0, mtime: 0, size: 0 } : this.files.has(path) ? { type: "file", ctime: 0, mtime: 0, size: this.files.get(path)!.length } : null,
      rename: async (from: string, to: string) => {
        if (this.failNextFinalRename && to.endsWith("sync-plan-errors.csv") && from.includes(".brain-sync-stage-")) { this.failNextFinalRename = false; throw new Error("simulated mobile adapter write failure"); }
        const value = this.files.get(from); if (value === undefined) throw new Error(`missing ${from}`); this.files.delete(from); this.files.set(to, value);
      },
      remove: async (path: string) => { this.files.delete(path); },
    } as unknown as DataAdapter;
    const vault = {
      adapter,
      on: (event: string, listener: (...args: any[]) => void) => { const values = this.listeners.get(event) ?? new Set(); values.add(listener); this.listeners.set(event, values); return { event, listener }; },
      offref: (ref: { event: string; listener: (...args: any[]) => void }) => this.listeners.get(ref.event)?.delete(ref.listener),
    };
    this.app = { vault } as unknown as App;
  }
  deleteAsUser(path: string): void {
    this.files.delete(path);
    if (this.folders.delete(path)) for (const file of [...this.files.keys()]) if (file.startsWith(`${path}/`)) this.files.delete(file);
    for (const listener of this.listeners.get("delete") ?? []) listener({ path } as TAbstractFile);
  }
}

interface EditingFile { readonly path: VaultPath; readonly text: string; generation: number; staleReads: number; persistentlyUnstable?: boolean; }

async function controllerFixture(files: EditingFile[]) {
  const vaultStorage = new MemoryVault();
  const csvPersistence = new SyncPlanErrorsCsvPersistence(vaultStorage.app, "sync-plan-errors.csv");
  await csvPersistence.initialize();
  const ledger = new SyncAttentionLedger(csvPersistence);
  const byPath = new Map(files.map(file => [String(file.path), file]));
  const observation = (file: EditingFile) => present(file.path, token(`${String(file.path)}:${file.generation}`));
  const inner = {
    async activeConfigurationDirectory() { return vp(".obsidian"); },
    async enumerate() { return { entries: [...byPath.values()].map(observation), completeness: { status: "complete" as const } }; },
    async observe(path: VaultPath) { const file = byPath.get(String(path)); return file ? observation(file) : { status: "absent" as const, side: "local" as const, path }; },
    async readFile(path: VaultPath, expected?: ObservationToken) {
      const file = byPath.get(String(path)); if (!file) throw new Error("missing local file");
      if (expected !== observation(file).observationToken) throw new LocalStaleObservationError(path);
      if (file.persistentlyUnstable || file.staleReads > 0) { file.staleReads = Math.max(0, file.staleReads - 1); file.generation += 1; throw new LocalStaleObservationError(path); }
      const content = bytes(file.text);
      return { content: source(content), evidence: { sizeBytes: content.byteLength }, stability: "stable" as const, observationToken: observation(file).observationToken };
    },
    async validatePath(path: VaultPath) { return { status: "compatible" as const, normalizedComparisonPath: String(path).toLocaleLowerCase("en-US") }; },
    onChange() { return () => undefined; }, onLifecycle() { return () => undefined; },
  } as unknown as LocalVaultPort;
  const local = new CanonicalEvidenceLocalVault(inner, { staleRetryAttempts: 3, staleRetryDelayMs: 0 });
  const remote = new Map<string, { readonly id: ReturnType<typeof contractId<"RemoteObjectId">>; readonly evidence: { readonly hash: ReturnType<typeof sha256Bytes>; readonly sizeBytes: number } }>();
  const uploaded: string[] = [];
  const identity = { rootId: contractId<"RemoteObjectId">("root:stability"), vaultIdentity: contractId<"VaultIdentity">("vault:stability"), protocolVersion: contractId<"ProtocolVersion">("1") } as ManagedRemoteIdentity;
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    getStartCursor: async () => ({ ok: true as const, value: contractId<"ChangeCursor">("cursor:stability") }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [...remote].map(([raw, value]) => ({ path: vp(raw), entityKind: "file" as const, remoteObjectId: value.id, content: value.evidence, trashed: false })), completeness: { status: "complete" as const } } }),
    observe: async (_root: unknown, path: VaultPath) => {
      const value = remote.get(String(path));
      return value
        ? { ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: value.id, content: value.evidence, stability: "stable" as const } }
        : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path } };
    },
    create: async (_root: unknown, request: { readonly path: VaultPath; readonly content?: { openChunks(): AsyncIterable<Uint8Array> }; readonly expectedEvidence?: { readonly hash?: ReturnType<typeof sha256Bytes>; readonly sizeBytes?: number } }) => {
      const chunks: Uint8Array[] = [];
      if (request.content) for await (const chunk of request.content.openChunks()) chunks.push(chunk);
      const combined = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0));
      let offset = 0; for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.byteLength; }
      const evidence = { hash: sha256Bytes(combined), sizeBytes: combined.byteLength };
      assert.equal(evidence.hash, request.expectedEvidence?.hash, "only the canonical stable source may upload");
      const id = contractId<"RemoteObjectId">(`remote:${String(request.path)}`);
      remote.set(String(request.path), { id, evidence }); uploaded.push(String(request.path));
      return { ok: true as const, value: { remoteObjectId: id, path: request.path, evidence } };
    },
  };
  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const stateContext = { expectation: "new-installation" as const, expectedVaultIdentity: identity.vaultIdentity, expectedDeviceIdentity: contractId<"DeviceIdentity">("device:stability") };
  const assembler = new ProductSnapshotAssembler(local, drive as never, state, stateContext, async () => identity);
  const conflicts = new ThreeWayConflictResolver({ readText: async () => undefined });
  let controller!: IntegratedProductController;
  const executor = new ProductSynchronizationExecutor(local, drive as never, state, stateContext, () => controller.currentRunEvidence());
  controller = new IntegratedProductController({
    vaultIdentity: identity.vaultIdentity, deviceIdentity: stateContext.expectedDeviceIdentity, stateContext, stateStore: state,
    snapshotAssembler: assembler, executor, conflictResolver: conflicts,
    plannerForTrigger: trigger => new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger })),
    leasePort: new InMemoryRunLeasePort(), audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 50), holderId: "stability-test", attentionLedger: ledger,
  });
  return { controller, ledger, csvPersistence, vaultStorage, uploaded };
}

async function executeReviewed(controller: IntegratedProductController) {
  const plan = await controller.previewManual(); assert.ok(plan);
  const result = await controller.request({ kind: "execute-plan", planId: plan.planId }); assert.equal(result.status, "accepted");
  return plan;
}

test("ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row", async () => {
  const fixture = await controllerFixture([{ path: vp("edited.md"), text: "stable content", generation: 1, staleReads: 1 }]);
  const plan = await executeReviewed(fixture.controller);
  assert.equal(plan.operations.some(operation => operation.kind === "upload-create"), true);
  assert.deepEqual(fixture.uploaded, ["edited.md"]);
  assert.equal((await fixture.ledger.all()).length, 0);
  assert.equal(parseSyncAttentionRecordsCsv(fixture.vaultStorage.files.get("sync-plan-errors.csv")!).length, 0);
  fixture.csvPersistence.dispose();
});

test("exhausted edit instability is isolated into the CSV while an independent safe upload commits", async () => {
  const unstable: EditingFile = { path: vp("unstable.md"), text: "changing", generation: 1, staleReads: 0, persistentlyUnstable: true };
  const fixture = await controllerFixture([unstable, { path: vp("safe.md"), text: "safe", generation: 1, staleReads: 0 }]);
  const plan = await executeReviewed(fixture.controller);
  assert.equal(plan.operations.find(operation => operation.path === unstable.path)?.reasons[0]?.code, "local-file-not-stable");
  assert.deepEqual(fixture.uploaded, ["safe.md"]);
  const current = parseSyncAttentionRecordsCsv(fixture.vaultStorage.files.get("sync-plan-errors.csv")!);
  assert.equal(current.length, 1); assert.equal(String(current[0]?.path), "unstable.md"); assert.equal(current[0]?.current, true);
  unstable.persistentlyUnstable = false;
  await executeReviewed(fixture.controller);
  assert.equal(fixture.uploaded.includes("unstable.md"), true);
  const resolved = parseSyncAttentionRecordsCsv(fixture.vaultStorage.files.get("sync-plan-errors.csv")!);
  assert.equal(resolved.find(record => String(record.path) === "unstable.md")?.current, false);
  assert.ok(resolved.find(record => String(record.path) === "unstable.md")?.resolvedAtMs);
  fixture.csvPersistence.dispose();
});

async function eventually(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  assert.fail("condition did not become true");
}

test("sync-plan-errors.csv is automatically created, durable, recreated, relocatable, and fail-safe excluded", async () => {
  const vault = new MemoryVault();
  const settings = withManagedSyncPlanErrorsExclusion({ ...DEFAULT_SETTINGS, userExclusionPatterns: ["private/**"] });
  assert.equal(settings.managedSyncPlanErrorsExclusion, "sync-plan-errors.csv");
  assert.deepEqual(settings.userExclusionPatterns, ["private/**", "sync-plan-errors.csv"]);
  const movedSettings = withManagedSyncPlanErrorsExclusion(settings, "99-System");
  assert.deepEqual(movedSettings.userExclusionPatterns, ["private/**", "99-System/sync-plan-errors.csv"], "directory changes replace only the managed exclusion");
  const protectedPaths = new Set([settings.managedSyncPlanErrorsExclusion]);
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }), () => protectedPaths);
  assert.equal(scope.isManagedLogical(vp("sync-plan-errors.csv")), false, "internal exclusion does not depend on the visible setting");
  let rawChange: ((change: { readonly kind: "created"; readonly path: VaultPath }) => void) | undefined, scheduledChanges = 0;
  const scoped = new ScopedLocalVault({ onChange: (listener: typeof rawChange) => { rawChange = listener; return () => undefined; } } as unknown as LocalVaultPort, scope);
  scoped.onChange(() => { scheduledChanges += 1; });
  rawChange?.({ kind: "created", path: vp("sync-plan-errors.csv") });
  assert.equal(scheduledChanges, 0, "CSV creation is filtered before it can become a synchronization trigger");

  const persistence = new SyncPlanErrorsCsvPersistence(vault.app, "sync-plan-errors.csv");
  await persistence.initialize();
  assert.ok(vault.files.get("sync-plan-errors.csv")?.startsWith('"vault_relative_path","status"'));
  const ledger = new SyncAttentionLedger(persistence, 2);
  await ledger.recordSkipped([{ timestampMs: 1, runId: 4, trigger: "periodic", path: vp("=SUM(1,2),雪.md"), category: "blocked-unsafe", reasonCode: "local-file-not-stable", humanReason: "+editing, retry later" }]);
  const onDisk = vault.files.get("sync-plan-errors.csv")!;
  assert.equal(parseSyncAttentionRecordsCsv(onDisk).length, 1);
  assert.match(onDisk, /"'=SUM\(1,2\),雪\.md"/u);
  vault.deleteAsUser("sync-plan-errors.csv");
  await eventually(() => vault.files.has("sync-plan-errors.csv"));
  assert.equal(parseSyncAttentionRecordsCsv(vault.files.get("sync-plan-errors.csv")!).length, 1);

  await persistence.relocate("99-System/sync-plan-errors.csv");
  assert.equal(vault.files.has("sync-plan-errors.csv"), false);
  assert.equal(vault.folders.has("99-System"), true);
  assert.equal(parseSyncAttentionRecordsCsv(vault.files.get("99-System/sync-plan-errors.csv")!).length, 1);
  vault.deleteAsUser("99-System");
  await eventually(() => vault.files.has("99-System/sync-plan-errors.csv"));
  assert.equal(parseSyncAttentionRecordsCsv(vault.files.get("99-System/sync-plan-errors.csv")!).length, 1, "deleting the configured directory recreates the directory and ledger");
  persistence.dispose();

  const restarted = new SyncPlanErrorsCsvPersistence(vault.app, "99-System/sync-plan-errors.csv");
  await restarted.initialize();
  assert.equal((await new SyncAttentionLedger(restarted).current()).length, 1, "the vault CSV is the restart source of truth");
  restarted.dispose();
});

test("configured sync plan errors directory rejects unsafe values and legacy records migrate into the persistent CSV", async () => {
  for (const unsafe of ["../outside", "C:\\outside", "/absolute", "https://example.com/x", "folder/../other", "custom.csv", "__brain_sync_portable_config__/errors"]) {
    assert.throws(() => resolveSyncPlanErrorsPath(unsafe));
  }
  assert.deepEqual(resolveSyncPlanErrorsPath("operations/brain"), { directory: "operations/brain", path: "operations/brain/sync-plan-errors.csv" });
  const vault = new MemoryVault();
  const legacy = [{ key: "legacy.md\0blocked-unsafe\0legacy", firstSeenAtMs: 1, lastSeenAtMs: 2, runId: 3, trigger: "manual", path: vp("legacy.md"), category: "blocked-unsafe" as const, reasonCode: "legacy", humanReason: "Migrated prior attention", occurrenceCount: 1, current: true }];
  const persistence = new SyncPlanErrorsCsvPersistence(vault.app, "operations/brain/sync-plan-errors.csv");
  const result = await persistence.initialize(legacy);
  assert.equal(result.migratedLegacyRecords, true);
  assert.equal((await persistence.loadSyncAttention())[0]?.reasonCode, "legacy");
  persistence.dispose();
});

test("one failed persistent CSV replacement reaches its caller but does not poison later ledger writes", async () => {
  const vault = new MemoryVault();
  const persistence = new SyncPlanErrorsCsvPersistence(vault.app, "sync-plan-errors.csv");
  await persistence.initialize();
  const ledger = new SyncAttentionLedger(persistence);
  vault.failNextFinalRename = true;
  await assert.rejects(() => ledger.recordSkipped([{ trigger: "periodic", path: vp("first.md"), category: "blocked-unsafe", reasonCode: "local-file-not-stable", humanReason: "Retry later" }]), /simulated mobile adapter write failure/u);
  await ledger.recordSkipped([{ trigger: "periodic", path: vp("second.md"), category: "blocked-unsafe", reasonCode: "local-file-not-stable", humanReason: "Retry later" }]);
  const persisted = parseSyncAttentionRecordsCsv(vault.files.get("sync-plan-errors.csv")!);
  assert.deepEqual(persisted.map(record => String(record.path)), ["second.md"]);
  persistence.dispose();
});
