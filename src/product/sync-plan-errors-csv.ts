import type { App, DataAdapter, TAbstractFile } from "obsidian";
import type { SyncAttentionPersistence, SyncAttentionRecord } from "./sync-attention-ledger";
import { parseSyncAttentionRecordsCsv, renderSyncAttentionRecordsCsv } from "./sync-attention-ledger";

export interface SyncPlanErrorsCsvInitialization {
  readonly migratedLegacyRecords: boolean;
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function recordCopy(record: SyncAttentionRecord): SyncAttentionRecord { return { ...record }; }

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
        const exists = await this.app.vault.adapter.exists(this.csvPath, true);
        const current = exists ? parseSyncAttentionRecordsCsv(await this.app.vault.adapter.read(this.csvPath)) : [];
        const merged = this.mergeLegacy(current, legacy);
        if (!exists || merged.changed) await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv(merged.records));
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
      if (!await this.app.vault.adapter.exists(this.csvPath, true)) {
        await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv([]));
        this.records = [];
      } else this.records = parseSyncAttentionRecordsCsv(await this.app.vault.adapter.read(this.csvPath));
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

  async relocate(nextPath: string): Promise<void> {
    if (nextPath === this.csvPath) return;
    await this.enqueue(async () => {
      const priorPath = this.csvPath;
      const records = this.records ?? (await this.readIfPresent(priorPath));
      await this.ensureParent(nextPath);
      await this.replaceFile(nextPath, renderSyncAttentionRecordsCsv(records));
      this.csvPath = nextPath;
      this.records = records.map(recordCopy);
      if (await this.app.vault.adapter.exists(priorPath, true)) await this.app.vault.adapter.remove(priorPath);
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
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const stage = `${path}.brain-sync-stage-${id}`;
    const backup = `${path}.brain-sync-backup-${id}`;
    let backedUp = false;
    this.internalMutationDepth += 1;
    try {
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

  private async readIfPresent(path: string): Promise<SyncAttentionRecord[]> {
    return await this.app.vault.adapter.exists(path, true)
      ? parseSyncAttentionRecordsCsv(await this.app.vault.adapter.read(path))
      : [];
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
      if (oldPath === this.csvPath && file.path.startsWith(`${this.csvPath}.brain-sync-backup-`)) return;
      recreate(oldPath);
    });
    this.unsubscribe = () => { this.app.vault.offref(deleted); this.app.vault.offref(renamed); };
  }
}
