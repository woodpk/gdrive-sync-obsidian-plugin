import assert from "node:assert/strict";
import test from "node:test";
import type { App, DataAdapter } from "obsidian";
import { contractId, type VaultPath } from "../src/contracts";
import { normalizedComparisonPath } from "../src/local/path-policy";
import { DEFAULT_SETTINGS, PluginDataRepository } from "../src/product/plugin-data";
import {
  DEFAULT_SYNC_ATTENTION_RETENTION,
  parseSyncAttentionRecordsCsv,
  renderSyncAttentionRecordsCsv,
  type SyncAttentionRecord,
} from "../src/product/sync-attention-ledger";
import { SyncPlanErrorsCsvPersistence } from "../src/product/sync-plan-errors-csv";
import {
  normalizeSyncPlanErrorsRelocationJournal,
  resolveSyncPlanErrorsPath,
  syncPlanErrorsOperationalPaths,
  withManagedSyncPlanErrorsExclusion,
} from "../src/product/sync-plan-errors-path";

const vp = (value: string) => contractId<"VaultPath">(value) as VaultPath;

function record(path: string, options: {
  readonly reasonCode?: string;
  readonly firstSeenAtMs?: number;
  readonly lastSeenAtMs?: number;
  readonly occurrenceCount?: number;
  readonly current?: boolean;
  readonly resolvedAtMs?: number;
} = {}): SyncAttentionRecord {
  const reasonCode = options.reasonCode ?? "local-file-not-stable";
  const current = options.current ?? true;
  return {
    key: `${path}\0blocked-unsafe\0${reasonCode}`,
    firstSeenAtMs: options.firstSeenAtMs ?? 1,
    lastSeenAtMs: options.lastSeenAtMs ?? 2,
    runId: 3,
    trigger: "periodic",
    path: vp(path),
    category: "blocked-unsafe",
    reasonCode,
    humanReason: "Preserved planning-error history.",
    occurrenceCount: options.occurrenceCount ?? 1,
    current,
    ...(current ? {} : { resolvedAtMs: options.resolvedAtMs ?? options.lastSeenAtMs ?? 2 }),
  };
}

class NormalizingMemoryVault {
  readonly files = new Map<string, string>();
  readonly folders = new Set<string>();
  readonly writes: string[] = [];
  readonly renames: Array<[string, string]> = [];
  readonly removals: string[] = [];
  readonly app: App;

  constructor() {
    const key = (path: string) => normalizedComparisonPath(path);
    const adapter = {
      exists: async (path: string) => this.files.has(key(path)) || this.folders.has(key(path)),
      read: async (path: string) => {
        const value = this.files.get(key(path));
        if (value === undefined) throw new Error(`missing ${path}`);
        return value;
      },
      write: async (path: string, value: string) => {
        this.writes.push(path);
        this.files.set(key(path), value);
      },
      mkdir: async (path: string) => { this.folders.add(key(path)); },
      stat: async (path: string) => this.folders.has(key(path))
        ? { type: "folder", ctime: 0, mtime: 0, size: 0 }
        : this.files.has(key(path))
          ? { type: "file", ctime: 0, mtime: 0, size: this.files.get(key(path))!.length }
          : null,
      rename: async (from: string, to: string) => {
        this.renames.push([from, to]);
        const value = this.files.get(key(from));
        if (value === undefined) throw new Error(`missing ${from}`);
        this.files.delete(key(from));
        this.files.set(key(to), value);
      },
      remove: async (path: string) => {
        this.removals.push(path);
        this.files.delete(key(path));
      },
    } as unknown as DataAdapter;
    this.app = {
      vault: {
        adapter,
        on: () => ({ event: "unused" }),
        offref: () => undefined,
      },
      secretStorage: { getSecret: () => null },
    } as unknown as App;
  }

  setFile(path: string, value: string): void { this.files.set(normalizedComparisonPath(path), value); }
  getFile(path: string): string | undefined { return this.files.get(normalizedComparisonPath(path)); }
  hasFile(path: string): boolean { return this.files.has(normalizedComparisonPath(path)); }
  resetMutations(): void { this.writes.length = 0; this.renames.length = 0; this.removals.length = 0; }
}

class ExactMemoryVault {
  readonly files = new Map<string, string>();
  readonly folders = new Set<string>();
  readonly app: App;

  constructor() {
    const adapter = {
      exists: async (path: string) => this.files.has(path) || this.folders.has(path),
      read: async (path: string) => {
        const value = this.files.get(path);
        if (value === undefined) throw new Error(`missing ${path}`);
        return value;
      },
      write: async (path: string, value: string) => { this.files.set(path, value); },
      mkdir: async (path: string) => { this.folders.add(path); },
      stat: async (path: string) => this.folders.has(path)
        ? { type: "folder", ctime: 0, mtime: 0, size: 0 }
        : this.files.has(path)
          ? { type: "file", ctime: 0, mtime: 0, size: this.files.get(path)!.length }
          : null,
      rename: async (from: string, to: string) => {
        const value = this.files.get(from);
        if (value === undefined) throw new Error(`missing ${from}`);
        this.files.delete(from);
        this.files.set(to, value);
      },
      remove: async (path: string) => { this.files.delete(path); },
    } as unknown as DataAdapter;
    this.app = { vault: { adapter, on: () => ({ event: "unused" }), offref: () => undefined } } as unknown as App;
  }
}

test("case-only and Unicode-equivalent relocations are rejected before journal or filesystem mutation on a normalizing adapter", async () => {
  for (const [sourcePath, destinationPath] of [
    ["Errors/sync-plan-errors.csv", "errors/sync-plan-errors.csv"],
    ["Cafe\u0301/sync-plan-errors.csv", "Caf\u00e9/sync-plan-errors.csv"],
  ] as const) {
    const vault = new NormalizingMemoryVault();
    const original = renderSyncAttentionRecordsCsv([record("preserved.md", { occurrenceCount: 4 })]);
    vault.setFile(sourcePath, original);
    const persistence = new SyncPlanErrorsCsvPersistence(vault.app, sourcePath);
    await persistence.initialize();
    vault.resetMutations();
    await assert.rejects(() => persistence.relocate(destinationPath), /cross-platform-equivalent/u);
    assert.equal(vault.getFile(sourcePath), original);
    assert.equal(vault.getFile(destinationPath), original, "normalizing filesystem resolves both spellings to the same surviving physical file");
    assert.deepEqual(vault.writes, []);
    assert.deepEqual(vault.renames, []);
    assert.deepEqual(vault.removals, []);
    assert.deepEqual(parseSyncAttentionRecordsCsv(vault.getFile(sourcePath)!).map(item => [String(item.path), item.occurrenceCount]), [["preserved.md", 4]]);
    assert.throws(
      () => withManagedSyncPlanErrorsExclusion({
        ...DEFAULT_SETTINGS,
        syncPlanErrorsDirectory: sourcePath.slice(0, sourcePath.lastIndexOf("/")),
        managedSyncPlanErrorsExclusion: sourcePath,
        syncPlanErrorsRelocation: { sourcePath, destinationPath },
        userExclusionPatterns: [sourcePath, destinationPath],
      }),
      /cross-platform-equivalent/u,
      "the durable relocation journal is rejected before it can be saved",
    );
    persistence.dispose();
  }
});

test("persisted case-only and Unicode-equivalent relocation journals are defensively rejected", async () => {
  for (const relocation of [
    { sourcePath: "Errors/sync-plan-errors.csv", destinationPath: "errors/sync-plan-errors.csv" },
    { sourcePath: "Cafe\u0301/sync-plan-errors.csv", destinationPath: "Caf\u00e9/sync-plan-errors.csv" },
  ]) {
    assert.throws(() => normalizeSyncPlanErrorsRelocationJournal(relocation), /cross-platform-equivalent/u);
    const repository = new PluginDataRepository({
      loadData: async () => ({ settings: { syncPlanErrorsRelocation: relocation } }),
      saveData: async () => undefined,
    });
    await assert.rejects(() => repository.loadSettings(), /cross-platform-equivalent/u);
  }
});

test("complete canonical, stage, and backup paths must all satisfy cross-platform path policy", () => {
  assert.deepEqual(resolveSyncPlanErrorsPath(""), { directory: "", path: "sync-plan-errors.csv" });
  assert.deepEqual(resolveSyncPlanErrorsPath("operations/brain"), { directory: "operations/brain", path: "operations/brain/sync-plan-errors.csv" });
  assert.equal(syncPlanErrorsOperationalPaths("operations/brain/sync-plan-errors.csv").length, 3);

  const canonicalTooLong = "a".repeat(220);
  assert.throws(() => resolveSyncPlanErrorsPath(canonicalTooLong), /path-too-long|compatibility limit/u);

  const transactionTooLong = "b".repeat(202);
  const canonical = `${transactionTooLong}/sync-plan-errors.csv`;
  assert.ok(canonical.length <= 240, "canonical path itself still fits the conservative Windows limit");
  assert.ok(`${canonical}.brain-sync-backup`.length > 240, "backup transaction path crosses the limit");
  assert.throws(() => resolveSyncPlanErrorsPath(transactionTooLong), /path-too-long|compatibility limit/u);
});

test("invalid complete relocation paths are rejected before durable journal or filesystem mutation", () => {
  const sourcePath = "sync-plan-errors.csv";
  const destinationDirectory = "c".repeat(202);
  const destinationPath = `${destinationDirectory}/sync-plan-errors.csv`;
  assert.throws(() => normalizeSyncPlanErrorsRelocationJournal({ sourcePath, destinationPath }), /path-too-long|compatibility limit/u);
  assert.throws(() => withManagedSyncPlanErrorsExclusion({
    ...DEFAULT_SETTINGS,
    managedSyncPlanErrorsExclusion: sourcePath,
    userExclusionPatterns: [sourcePath],
    syncPlanErrorsRelocation: { sourcePath, destinationPath },
  }), /path-too-long|compatibility limit/u);
});

test("relocation merges pre-existing valid destination history without fake occurrence increments", async () => {
  const vault = new ExactMemoryVault();
  const sourcePath = "sync-plan-errors.csv";
  const destinationPath = "99-System/sync-plan-errors.csv";
  vault.files.set(sourcePath, renderSyncAttentionRecordsCsv([
    record("source-current.md", { occurrenceCount: 2, lastSeenAtMs: 10 }),
    record("duplicate.md", { occurrenceCount: 3, lastSeenAtMs: 20 }),
    record("source-resolved.md", { current: false, lastSeenAtMs: 15, resolvedAtMs: 16 }),
  ]));
  vault.folders.add("99-System");
  vault.files.set(destinationPath, renderSyncAttentionRecordsCsv([
    record("destination-current.md", { occurrenceCount: 7, lastSeenAtMs: 12 }),
    record("duplicate.md", { occurrenceCount: 5, lastSeenAtMs: 20 }),
    record("destination-resolved.md", { current: false, lastSeenAtMs: 17, resolvedAtMs: 18 }),
  ]));
  const persistence = new SyncPlanErrorsCsvPersistence(vault.app, sourcePath);
  await persistence.initialize();
  let destinationValidatedBeforeCommit = false;
  await persistence.relocate(destinationPath, async () => {
    const destination = parseSyncAttentionRecordsCsv(vault.files.get(destinationPath)!);
    destinationValidatedBeforeCommit = destination.some(item => String(item.path) === "source-current.md")
      && destination.some(item => String(item.path) === "destination-current.md");
    assert.equal(vault.files.has(sourcePath), true, "source cleanup waits until merged destination validation and active-location commit");
  });
  assert.equal(destinationValidatedBeforeCommit, true);
  assert.equal(vault.files.has(sourcePath), false);
  const merged = parseSyncAttentionRecordsCsv(vault.files.get(destinationPath)!);
  assert.deepEqual(new Set(merged.map(item => String(item.path))), new Set([
    "source-current.md", "destination-current.md", "duplicate.md", "source-resolved.md", "destination-resolved.md",
  ]));
  assert.equal(merged.find(item => String(item.path) === "duplicate.md")?.occurrenceCount, 5, "relocation merge uses max observed count rather than incrementing it");
  assert.equal(merged.find(item => String(item.path) === "source-current.md")?.current, true);
  assert.equal(merged.find(item => String(item.path) === "destination-current.md")?.current, true);
  assert.equal(merged.find(item => String(item.path) === "source-resolved.md")?.current, false);
  assert.equal(merged.find(item => String(item.path) === "destination-resolved.md")?.current, false);
  persistence.dispose();
});

test("relocation merge bounds resolved history while preserving every current record", async () => {
  const vault = new ExactMemoryVault();
  const sourcePath = "sync-plan-errors.csv";
  const destinationPath = "archive/sync-plan-errors.csv";
  const current = [record("source-current.md", { lastSeenAtMs: 10 }), record("destination-current.md", { lastSeenAtMs: 11 })];
  const resolved = Array.from({ length: DEFAULT_SYNC_ATTENTION_RETENTION + 5 }, (_, index) =>
    record(`resolved-${index}.md`, { current: false, lastSeenAtMs: 100 + index, resolvedAtMs: 1000 + index }));
  vault.files.set(sourcePath, renderSyncAttentionRecordsCsv([current[0]!, ...resolved.slice(0, 250)]));
  vault.folders.add("archive");
  vault.files.set(destinationPath, renderSyncAttentionRecordsCsv([current[1]!, ...resolved.slice(250)]));
  const persistence = new SyncPlanErrorsCsvPersistence(vault.app, sourcePath);
  await persistence.initialize();
  await persistence.relocate(destinationPath);
  const merged = parseSyncAttentionRecordsCsv(vault.files.get(destinationPath)!);
  assert.equal(merged.filter(item => item.current).length, 2);
  assert.equal(merged.filter(item => !item.current).length, DEFAULT_SYNC_ATTENTION_RETENTION);
  assert.equal(merged.some(item => String(item.path) === "source-current.md"), true);
  assert.equal(merged.some(item => String(item.path) === "destination-current.md"), true);
  persistence.dispose();
});

test("restarting relocation after a durable merged destination is idempotent", async () => {
  const vault = new ExactMemoryVault();
  const sourcePath = "sync-plan-errors.csv";
  const destinationPath = "99-System/sync-plan-errors.csv";
  vault.files.set(sourcePath, renderSyncAttentionRecordsCsv([
    record("source.md", { occurrenceCount: 4, lastSeenAtMs: 10 }),
    record("same.md", { occurrenceCount: 2, lastSeenAtMs: 20 }),
  ]));
  vault.folders.add("99-System");
  vault.files.set(destinationPath, renderSyncAttentionRecordsCsv([
    record("destination.md", { occurrenceCount: 3, lastSeenAtMs: 11 }),
    record("same.md", { occurrenceCount: 6, lastSeenAtMs: 20 }),
  ]));

  const first = new SyncPlanErrorsCsvPersistence(vault.app, sourcePath);
  await first.initialize();
  await assert.rejects(() => first.relocate(destinationPath, async () => { throw new Error("simulated crash before active-location commit"); }), /simulated crash/u);
  first.dispose();
  assert.equal(vault.files.has(sourcePath), true);
  const once = parseSyncAttentionRecordsCsv(vault.files.get(destinationPath)!);
  assert.equal(once.find(item => String(item.path) === "same.md")?.occurrenceCount, 6);

  const restarted = new SyncPlanErrorsCsvPersistence(vault.app, sourcePath);
  await restarted.initialize();
  await restarted.relocate(destinationPath);
  const twice = parseSyncAttentionRecordsCsv(vault.files.get(destinationPath)!);
  assert.deepEqual(twice, once, "re-merging source with an already merged destination is idempotent");
  restarted.dispose();
});

test("invalid destination CSV is never overwritten and source remains authoritative", async () => {
  const vault = new ExactMemoryVault();
  const sourcePath = "sync-plan-errors.csv";
  const destinationPath = "99-System/sync-plan-errors.csv";
  const sourceCsv = renderSyncAttentionRecordsCsv([record("source.md", { occurrenceCount: 2 })]);
  const invalidDestination = "not valid CSV";
  vault.files.set(sourcePath, sourceCsv);
  vault.folders.add("99-System");
  vault.files.set(destinationPath, invalidDestination);
  const persistence = new SyncPlanErrorsCsvPersistence(vault.app, sourcePath);
  await persistence.initialize();
  await assert.rejects(() => persistence.relocate(destinationPath), /header is missing or incompatible/u);
  assert.equal(vault.files.get(destinationPath), invalidDestination);
  assert.equal(vault.files.get(sourcePath), sourceCsv);
  persistence.dispose();
});
