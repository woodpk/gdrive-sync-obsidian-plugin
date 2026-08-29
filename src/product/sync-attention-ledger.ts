import type { PlanOperationKind, VaultPath } from "../contracts";
import { sha256Text } from "../util/sha256";

export const DEFAULT_SYNC_ATTENTION_RETENTION = 500;
export const SYNC_ATTENTION_CSV_FILENAME = "brain-sync-attention.csv";

export interface SyncAttentionRecord {
  readonly key: string;
  readonly firstSeenAtMs: number;
  readonly lastSeenAtMs: number;
  readonly runId?: number;
  readonly trigger: string;
  readonly path: VaultPath;
  readonly category: PlanOperationKind;
  readonly reasonCode: string;
  readonly humanReason: string;
  readonly occurrenceCount: number;
  readonly current: boolean;
}

export interface SyncAttentionPersistence {
  loadSyncAttention(): Promise<readonly SyncAttentionRecord[]>;
  saveSyncAttention(records: readonly SyncAttentionRecord[]): Promise<void>;
}

export interface SkippedPathAttention {
  readonly timestampMs?: number;
  readonly runId?: number;
  readonly trigger: string;
  readonly path: VaultPath;
  readonly category: PlanOperationKind;
  readonly reasonCode: string;
  readonly humanReason: string;
}

function keyOf(value: Pick<SkippedPathAttention, "path" | "category" | "reasonCode">): string {
  return `${String(value.path)}\u0000${value.category}\u0000${value.reasonCode}`;
}

function formulaSafe(value: string): string {
  return /^[\t\r\n ]*[=+\-@]/u.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | undefined): string {
  const raw = formulaSafe(value === undefined ? "" : String(value));
  return `"${raw.replace(/"/g, '""')}"`;
}

/** Complete current state plus bounded resolved history. It is not stored through the vault adapter. */
export class SyncAttentionLedger {
  private records?: SyncAttentionRecord[];

  constructor(private readonly persistence: SyncAttentionPersistence, private readonly resolvedHistoryLimit = DEFAULT_SYNC_ATTENTION_RETENTION) {
    if (!Number.isSafeInteger(resolvedHistoryLimit) || resolvedHistoryLimit < 1) throw new Error("resolved sync attention history retention must be positive");
  }

  async current(): Promise<readonly SyncAttentionRecord[]> {
    return (await this.load()).filter(record => record.current).map(record => ({ ...record }));
  }

  async all(): Promise<readonly SyncAttentionRecord[]> {
    return (await this.load()).map(record => ({ ...record }));
  }

  /** Privacy-safe identity for notification deduplication; the path-bearing source never leaves this ledger. */
  async currentIdentity(): Promise<string> {
    const identities = (await this.load())
      .filter(record => record.current)
      .map(record => [String(record.path), record.category, record.reasonCode, record.humanReason].join("\u0000"))
      .sort();
    return String(sha256Text(JSON.stringify(identities)));
  }

  async recordSkipped(values: readonly SkippedPathAttention[]): Promise<void> {
    if (!values.length) return;
    const records = (await this.load()).map(record => ({ ...record }));
    const incomingByPath = new Map<string, Set<string>>();
    for (const value of values) {
      const path = String(value.path);
      const keys = incomingByPath.get(path) ?? new Set<string>();
      keys.add(keyOf(value));
      incomingByPath.set(path, keys);
    }
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index]!;
      const authoritativeKeys = incomingByPath.get(String(record.path));
      if (record.current && authoritativeKeys && !authoritativeKeys.has(record.key)) records[index] = { ...record, current: false };
    }
    for (const value of values) {
      const key = keyOf(value);
      const at = value.timestampMs ?? Date.now();
      const index = records.findIndex(record => record.key === key);
      const next: SyncAttentionRecord = index >= 0
        ? { ...records[index]!, lastSeenAtMs: at, runId: value.runId, trigger: value.trigger, humanReason: value.humanReason, occurrenceCount: records[index]!.occurrenceCount + 1, current: true }
        : { key, firstSeenAtMs: at, lastSeenAtMs: at, runId: value.runId, trigger: value.trigger, path: value.path, category: value.category, reasonCode: value.reasonCode, humanReason: value.humanReason, occurrenceCount: 1, current: true };
      if (index >= 0) records[index] = next; else records.push(next);
    }
    await this.persistBounded(records);
  }

  async resolvePath(path: VaultPath): Promise<void> {
    const records = (await this.load()).map(record => ({ ...record }));
    let changed = false;
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index]!;
      if (record.current && record.path === path) { records[index] = { ...record, current: false }; changed = true; }
    }
    if (changed) await this.persistBounded(records);
  }

  async renderCsv(): Promise<string> {
    const header = ["timestamp", "run_identifier", "vault_relative_path", "planned_category", "reason_code", "human_readable_reason", "trigger", "first_seen", "occurrence_count", "status"];
    const rows = (await this.all()).map(record => [
      new Date(record.lastSeenAtMs).toISOString(), record.runId, String(record.path), record.category, record.reasonCode,
      record.humanReason, record.trigger, new Date(record.firstSeenAtMs).toISOString(), record.occurrenceCount, record.current ? "current" : "resolved",
    ]);
    return [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  private async load(): Promise<SyncAttentionRecord[]> {
    if (!this.records) this.records = [...await this.persistence.loadSyncAttention()].filter(record => record && typeof record === "object").map(record => ({ ...record }));
    return this.records;
  }

  private async persistBounded(records: SyncAttentionRecord[]): Promise<void> {
    const current = records.filter(record => record.current);
    const resolved = records.filter(record => !record.current)
      .sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs)
      .slice(0, this.resolvedHistoryLimit);
    const retained = [...current, ...resolved].sort((a, b) => a.lastSeenAtMs - b.lastSeenAtMs);
    await this.persistence.saveSyncAttention(retained.map(record => ({ ...record })));
    this.records = retained;
  }
}

export function createSyncAttentionCsvFile(csv: string): File {
  return new File([csv], SYNC_ATTENTION_CSV_FILENAME, { type: "text/csv;charset=utf-8" });
}

export function copySyncAttentionCsv(csv: string): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard;
  return clipboard?.writeText ? clipboard.writeText(csv) : Promise.reject(new Error("clipboard API is unavailable on this device"));
}

export function shareSyncAttentionCsv(csv: string): Promise<void> {
  const navigatorLike = globalThis.navigator;
  if (!navigatorLike?.share) return Promise.reject(new Error("file sharing is unavailable on this device"));
  const file = createSyncAttentionCsvFile(csv);
  if (navigatorLike.canShare && !navigatorLike.canShare({ files: [file] })) return Promise.reject(new Error("this device cannot share the attention CSV file"));
  return navigatorLike.share({ files: [file] });
}
