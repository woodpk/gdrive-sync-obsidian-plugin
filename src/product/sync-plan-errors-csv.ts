import type { App, DataAdapter, TAbstractFile } from "obsidian";
import type { SyncAttentionPersistence, SyncAttentionRecord } from "./sync-attention-ledger";
import { parseSyncAttentionRecordsCsv, renderSyncAttentionRecordsCsv } from "./sync-attention-ledger";
import type { SyncPlanErrorsRelocationJournal } from "./sync-plan-errors-path";

export interface SyncPlanErrorsCsvInitialization {
  readonly migratedLegacyRecords: boolean;
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function recordCopy(record: SyncAttentionRecord): SyncAttentionRecord { return { ...record }; }
function stagePath(path: string): string { return `${path}.brain-sync-stage`; }
function backupPath(path: string): string { return `${path}.brain-sync-backup`; }

export function syncPlanErrorsOperationalPaths(path: string): readonly string[] {
  return [path, stagePath(path), backupPath(path)];
}

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
  ) {}

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
    await this.enqueue(async () => {
      const priorPath = this.csvPath;
      const records = this.records ?? (await this.recoverFile(priorPath));
      if (!records) throw new Error("Sync plan errors source CSV is unavailable during relocation.");
      await this.ensureParent(nextPath);
      await this.replaceFile(nextPath, renderSyncAttentionRecordsCsv(records));
      const destination = await this.recoverFile(nextPath);
      if (!destination) throw new Error("Sync plan errors destination CSV was not durably established.");
      await commitActiveLocation();
      this.csvPath = nextPath;
      this.records = destination.map(recordCopy);
      await this.removeFileAndResidue(priorPath);
    });
  }

  async cleanupRelocationSource(sourcePath: string): Promise<void> {
    await this.enqueue(async () => {
      if (sourcePath === this.csvPath) throw new Error("Cannot clean the active sync plan errors CSV location.");
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
