import type { App, DataAdapter, TAbstractFile } from "obsidian";
import type { SyncAttentionPersistence, SyncAttentionRecord } from "./sync-attention-ledger";
import { DEFAULT_SYNC_ATTENTION_RETENTION, parseSyncAttentionRecordsCsv, renderSyncAttentionRecordsCsv } from "./sync-attention-ledger";
import { syncPlanErrorsOperationalPaths, syncPlanErrorsPathsEquivalent, type SyncPlanErrorsRelocationJournal } from "./sync-plan-errors-path";

export { syncPlanErrorsOperationalPaths } from "./sync-plan-errors-path";

export interface SyncPlanErrorsCsvInitialization {
  readonly migratedLegacyRecords: boolean;
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function recordCopy(record: SyncAttentionRecord): SyncAttentionRecord { return { ...record }; }
function stagePath(path: string): string { return syncPlanErrorsOperationalPaths(path)[1]!; }
function backupPath(path: string): string { return syncPlanErrorsOperationalPaths(path)[2]!; }

/** Mobile-safe, serialized, crash-conscious vault persistence for sync-plan-errors.csv. */
export class SyncPlanErrorsCsvPersistence implements SyncAttentionPersistence {
  private records?: SyncAttentionRecord[];
  private saveChain = Promise.resolve();
  private unsubscribe?: () => void;
  private disposed = false;
  private internalMutationDepth = 0;

  constructor(
    private readonly app: App,
    private csvPath: string,
    private readonly onPersistenceFailure: (error: unknown) => void = () => undefined,
  ) {
    syncPlanErrorsOperationalPaths(csvPath);
  }

  path(): string { return this.csvPath; }

  async initialize(legacy: readonly SyncAttentionRecord[] = []): Promise<SyncPlanErrorsCsvInitialization> {
    try {
      return await this.enqueue(async () => {
        await this.ensureParent(this.csvPath);
        const recovered = await this.recoverFile(this.csvPath);
        const exists = recovered !== undefined;
        const current = recovered ?? [];
        const merged = this.mergeLegacy(current, legacy);
        if (!exists || merged.changed) await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv(merged.records));
        this.records = merged.records.map(recordCopy);
        return { migratedLegacyRecords: legacy.length > 0 };
      });
    } finally {
      this.installDeletionMonitor();
    }
  }

  async initializePendingRelocation(
    journal: SyncPlanErrorsRelocationJournal,
    activePath: string,
    legacy: readonly SyncAttentionRecord[] = [],
  ): Promise<SyncPlanErrorsCsvInitialization> {
    if (syncPlanErrorsPathsEquivalent(journal.sourcePath, journal.destinationPath)) {
      throw new Error("Pending sync plan errors relocation has cross-platform-equivalent locations.");
    }
    if (activePath !== journal.sourcePath && activePath !== journal.destinationPath) {
      throw new Error("Sync plan errors relocation journal does not match the configured active location.");
    }
    const fallbackPath = activePath === journal.sourcePath ? journal.destinationPath : journal.sourcePath;
    try {
      return await this.enqueue(async () => {
        await this.ensureParent(activePath);
        let current = await this.recoverFile(activePath);
        if (current === undefined) {
          const fallback = await this.recoverFile(fallbackPath);
          if (fallback === undefined) throw new Error("Pending sync plan errors relocation has no recoverable authoritative CSV.");
          current = fallback;
          await this.replaceFile(activePath, renderSyncAttentionRecordsCsv(current));
        }
        const merged = this.mergeLegacy(current, legacy);
        if (merged.changed) await this.replaceFile(activePath, renderSyncAttentionRecordsCsv(merged.records));
        this.csvPath = activePath;
        this.records = merged.records.map(recordCopy);
        return { migratedLegacyRecords: legacy.length > 0 };
      });
    } finally {
      this.installDeletionMonitor();
    }
  }

  async loadSyncAttention(): Promise<readonly SyncAttentionRecord[]> {
    if (this.records) return this.records.map(recordCopy);
    return this.enqueue(async () => {
      await this.ensureParent(this.csvPath);
      const recovered = await this.recoverFile(this.csvPath);
      if (recovered === undefined) {
        await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv([]));
        this.records = [];
      } else this.records = recovered;
      return this.records.map(recordCopy);
    });
  }

  async saveSyncAttention(records: readonly SyncAttentionRecord[]): Promise<void> {
    const payload = records.map(recordCopy);
    await this.enqueue(async () => {
      await this.ensureParent(this.csvPath);
      await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv(payload));
      this.records = payload.map(recordCopy);
    });
  }

  async relocate(nextPath: string, commitActiveLocation: () => Promise<void> = async () => undefined): Promise<void> {
    if (nextPath === this.csvPath) return;
    if (syncPlanErrorsPathsEquivalent(nextPath, this.csvPath)) {
      throw new Error("Sync plan errors relocation cannot use a cross-platform-equivalent destination.");
    }
    syncPlanErrorsOperationalPaths(nextPath);
    await this.enqueue(async () => {
      const priorPath = this.csvPath;
      const sourceRecords = this.records ?? (await this.recoverFile(priorPath));
      if (!sourceRecords) throw new Error("Sync plan errors source CSV is unavailable during relocation.");
      await this.ensureParent(nextPath);
      const existingDestination = await this.recoverFile(nextPath);
      const mergedRecords = this.mergeRecordSets(sourceRecords, existingDestination ?? []);
      await this.replaceFile(nextPath, renderSyncAttentionRecordsCsv(mergedRecords));
      const destination = await this.recoverFile(nextPath);
      if (!destination) throw new Error("Sync plan errors destination CSV was not durably established.");
      const validatedDestination = this.mergeRecordSets(destination);
      if (renderSyncAttentionRecordsCsv(validatedDestination) !== renderSyncAttentionRecordsCsv(mergedRecords)) {
        throw new Error("Sync plan errors destination CSV did not validate after relocation merge.");
      }
      await commitActiveLocation();
      this.csvPath = nextPath;
      this.records = destination.map(recordCopy);
      await this.removeFileAndResidue(priorPath);
    });
  }

  async cleanupRelocationSource(sourcePath: string): Promise<void> {
    if (syncPlanErrorsPathsEquivalent(sourcePath, this.csvPath)) {
      throw new Error("Cannot clean a cross-platform-equivalent active sync plan errors CSV location.");
    }
    await this.enqueue(async () => {
      const active = await this.recoverFile(this.csvPath);
      if (!active) throw new Error("Active sync plan errors destination is unavailable during relocation finalization.");
      this.records = active.map(recordCopy);
      await this.removeFileAndResidue(sourcePath);
    });
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const write = this.saveChain.catch(() => undefined).then(operation);
    this.saveChain = write.then(() => undefined, () => undefined);
    return write;
  }

  private async ensureParent(path: string): Promise<void> {
    const parent = parentPath(path);
    if (!parent) return;
    let current = "";
    for (const component of parent.split("/")) {
      current = current ? `${current}/${component}` : component;
      if (!await this.app.vault.adapter.exists(current, true)) await this.app.vault.adapter.mkdir(current);
      const stat = await this.app.vault.adapter.stat(current);
      if (!stat || stat.type !== "folder") throw new Error(`Sync plan errors parent is not a vault folder: ${current}`);
    }
  }

  private async replaceFile(path: string, text: string): Promise<void> {
    const adapter: DataAdapter = this.app.vault.adapter;
    const stage = stagePath(path);
    const backup = backupPath(path);
    let backedUp = false;
    this.internalMutationDepth += 1;
    try {
      await this.recoverFile(path);
      await adapter.write(stage, text);
      if (await adapter.exists(path, true)) { await adapter.rename(path, backup); backedUp = true; }
      await adapter.rename(stage, path);
      if (backedUp && await adapter.exists(backup, true)) await adapter.remove(backup);
    } catch (error) {
      try {
        if (!await adapter.exists(path, true) && backedUp && await adapter.exists(backup, true)) await adapter.rename(backup, path);
        if (await adapter.exists(stage, true)) await adapter.remove(stage);
      } catch { /* preserve the original persistence failure */ }
      throw error;
    } finally {
      this.internalMutationDepth -= 1;
    }
  }

  private async recoverFile(path: string): Promise<SyncAttentionRecord[] | undefined> {
    const adapter = this.app.vault.adapter;
    const stage = stagePath(path), backup = backupPath(path);
    this.internalMutationDepth += 1;
    try {
      const canonicalExists = await adapter.exists(path, true);
      const backupExists = await adapter.exists(backup, true);
      const stageExists = await adapter.exists(stage, true);
      if (canonicalExists) {
        const records = parseSyncAttentionRecordsCsv(await adapter.read(path));
        if (stageExists) await adapter.remove(stage);
        if (backupExists) await adapter.remove(backup);
        return records;
      }
      if (backupExists) {
        const records = parseSyncAttentionRecordsCsv(await adapter.read(backup));
        await adapter.rename(backup, path);
        if (stageExists) await adapter.remove(stage);
        return records;
      }
      if (stageExists) {
        const records = parseSyncAttentionRecordsCsv(await adapter.read(stage));
        await adapter.rename(stage, path);
        return records;
      }
      return undefined;
    } finally {
      this.internalMutationDepth -= 1;
    }
  }

  private async removeFileAndResidue(path: string): Promise<void> {
    this.internalMutationDepth += 1;
    try {
      for (const candidate of syncPlanErrorsOperationalPaths(path)) {
        if (await this.app.vault.adapter.exists(candidate, true)) await this.app.vault.adapter.remove(candidate);
      }
    } finally {
      this.internalMutationDepth -= 1;
    }
  }

  private mergeRecordSets(...sets: readonly SyncAttentionRecord[][]): SyncAttentionRecord[] {
    const byKey = new Map<string, SyncAttentionRecord>();
    for (const records of sets) {
      for (const incoming of records) {
        const prior = byKey.get(incoming.key);
        if (!prior) { byKey.set(incoming.key, recordCopy(incoming)); continue; }
        const newer = incoming.lastSeenAtMs > prior.lastSeenAtMs ? incoming : prior;
        const current = prior.current || incoming.current;
        const resolvedCandidates = [prior.resolvedAtMs, incoming.resolvedAtMs].filter((value): value is number => value !== undefined);
        byKey.set(incoming.key, {
          ...newer,
          firstSeenAtMs: Math.min(prior.firstSeenAtMs, incoming.firstSeenAtMs),
          lastSeenAtMs: Math.max(prior.lastSeenAtMs, incoming.lastSeenAtMs),
          occurrenceCount: Math.max(prior.occurrenceCount, incoming.occurrenceCount),
          current,
          ...(current
            ? { resolvedAtMs: undefined }
            : resolvedCandidates.length ? { resolvedAtMs: Math.max(...resolvedCandidates) } : {}),
        });
      }
    }
    const all = [...byKey.values()];
    const current = all.filter(record => record.current);
    const resolved = all.filter(record => !record.current)
      .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs || a.key.localeCompare(b.key))
      .slice(0, DEFAULT_SYNC_ATTENTION_RETENTION);
    return [...current, ...resolved]
      .sort((a, b) => a.lastSeenAtMs - b.lastSeenAtMs || a.key.localeCompare(b.key))
      .map(recordCopy);
  }

  private mergeLegacy(current: readonly SyncAttentionRecord[], legacy: readonly SyncAttentionRecord[]): { readonly records: SyncAttentionRecord[]; readonly changed: boolean } {
    const records = current.map(recordCopy);
    let changed = false;
    for (const incoming of legacy) {
      const index = records.findIndex(record => record.key === incoming.key);
      if (index < 0) { records.push(recordCopy(incoming)); changed = true; continue; }
      const prior = records[index]!;
      if (incoming.lastSeenAtMs <= prior.lastSeenAtMs && (!incoming.current || prior.current)) continue;
      records[index] = {
        ...prior,
        ...incoming,
        firstSeenAtMs: Math.min(prior.firstSeenAtMs, incoming.firstSeenAtMs),
        occurrenceCount: Math.max(prior.occurrenceCount, incoming.occurrenceCount),
        current: prior.current || incoming.current,
        ...((prior.current || incoming.current) ? { resolvedAtMs: undefined } : {}),
      };
      changed = true;
    }
    return { records, changed };
  }

  private installDeletionMonitor(): void {
    if (this.unsubscribe || this.disposed) return;
    const recreate = (path: string): void => {
      const affected = path === this.csvPath || this.csvPath.startsWith(`${path}/`);
      if (!affected || this.disposed || this.internalMutationDepth > 0) return;
      const payload = (this.records ?? []).map(recordCopy);
      void this.saveSyncAttention(payload).catch(error => this.onPersistenceFailure(error));
    };
    const deleted = this.app.vault.on("delete", (file: TAbstractFile) => recreate(file.path));
    const renamed = this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
      if (oldPath === this.csvPath && file.path === backupPath(this.csvPath)) return;
      recreate(oldPath);
    });
    this.unsubscribe = () => { this.app.vault.offref(deleted); this.app.vault.offref(renamed); };
  }
}
