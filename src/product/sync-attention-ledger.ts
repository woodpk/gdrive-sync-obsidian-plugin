import type { PlanOperationKind, VaultPath } from "../contracts";
import { contractId } from "../contracts";
import { sha256Text } from "../util/sha256";
import { SYNC_PLAN_ERRORS_CSV_FILENAME } from "./sync-plan-errors-path";

export const DEFAULT_SYNC_ATTENTION_RETENTION = 500;
export const SYNC_ATTENTION_CSV_FILENAME = SYNC_PLAN_ERRORS_CSV_FILENAME;

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
  readonly resolvedAtMs?: number;
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
  if (value.startsWith("'")) return `'${value}`;
  return /^[\t\r\n ]*[=+\-@]/u.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | undefined): string {
  const raw = formulaSafe(value === undefined ? "" : String(value));
  return `"${raw.replace(/"/g, '""')}"`;
}

const CSV_HEADER = [
  "vault_relative_path", "status", "reason_code", "human_readable_reason", "planned_category",
  "first_seen", "last_seen", "occurrence_count", "last_run_identifier", "trigger", "resolved_at",
] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/u, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("sync plan errors CSV contains an unterminated quoted field");
  if (cell || row.length) { row.push(cell.replace(/\r$/u, "")); rows.push(row); }
  return rows;
}

function unprotectFormula(value: string): string {
  if (value.startsWith("''")) return value.slice(1);
  return /^'(?=[\t\r\n ]*[=+\-@])/u.test(value) ? value.slice(1) : value;
}

export function renderSyncAttentionRecordsCsv(records: readonly SyncAttentionRecord[]): string {
  const rows = records.map(record => [
    String(record.path), record.current ? "current" : "resolved", record.reasonCode, record.humanReason, record.category,
    new Date(record.firstSeenAtMs).toISOString(), new Date(record.lastSeenAtMs).toISOString(), record.occurrenceCount,
    record.runId, record.trigger, record.resolvedAtMs === undefined ? "" : new Date(record.resolvedAtMs).toISOString(),
  ]);
  return [CSV_HEADER, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function parseSyncAttentionRecordsCsv(text: string): SyncAttentionRecord[] {
  const rows = parseCsv(text);
  if (!rows.length || rows[0]!.join("\u0000") !== CSV_HEADER.join("\u0000")) {
    throw new Error("sync plan errors CSV header is missing or incompatible");
  }
  return rows.slice(1).filter(row => row.some(Boolean)).map((row, index) => {
    if (row.length !== CSV_HEADER.length) throw new Error(`sync plan errors CSV row ${index + 2} has an invalid column count`);
    const [rawPath, status, rawReason, rawHuman, rawCategory, firstSeen, lastSeen, count, runId, rawTrigger, resolvedAt] = row;
    const path = unprotectFormula(rawPath!);
    const reasonCode = unprotectFormula(rawReason!);
    const humanReason = unprotectFormula(rawHuman!);
    const category = unprotectFormula(rawCategory!) as PlanOperationKind;
    const trigger = unprotectFormula(rawTrigger!);
    const firstSeenAtMs = Date.parse(firstSeen!);
    const lastSeenAtMs = Date.parse(lastSeen!);
    const occurrenceCount = Number(count);
    const parsedRunId = runId ? Number(runId) : undefined;
    const resolvedAtMs = resolvedAt ? Date.parse(resolvedAt) : undefined;
    if (!path || !reasonCode || !humanReason || !category || !trigger || !Number.isFinite(firstSeenAtMs) || !Number.isFinite(lastSeenAtMs) || !Number.isSafeInteger(occurrenceCount) || occurrenceCount < 1 || (parsedRunId !== undefined && !Number.isSafeInteger(parsedRunId)) || (resolvedAtMs !== undefined && !Number.isFinite(resolvedAtMs))) {
      throw new Error(`sync plan errors CSV row ${index + 2} contains invalid data`);
    }
    const recordPath = contractId<"VaultPath">(path) as VaultPath;
    const current = status === "current";
    if (!current && status !== "resolved") throw new Error(`sync plan errors CSV row ${index + 2} has an invalid status`);
    return {
      key: keyOf({ path: recordPath, category, reasonCode }), firstSeenAtMs, lastSeenAtMs,
      ...(parsedRunId === undefined ? {} : { runId: parsedRunId }), trigger, path: recordPath, category,
      reasonCode, humanReason, occurrenceCount, current,
      ...(resolvedAtMs === undefined ? {} : { resolvedAtMs }),
    };
  });
}

/** Complete current state plus bounded resolved history, persisted by the injected device-local repository. */
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
      if (record.current && authoritativeKeys && !authoritativeKeys.has(record.key)) records[index] = { ...record, current: false, resolvedAtMs: Date.now() };
    }
    for (const value of values) {
      const key = keyOf(value);
      const at = value.timestampMs ?? Date.now();
      const index = records.findIndex(record => record.key === key);
      const next: SyncAttentionRecord = index >= 0
        ? { ...records[index]!, lastSeenAtMs: at, runId: value.runId, trigger: value.trigger, humanReason: value.humanReason, occurrenceCount: records[index]!.occurrenceCount + 1, current: true, resolvedAtMs: undefined }
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
      if (record.current && record.path === path) { records[index] = { ...record, current: false, resolvedAtMs: Date.now() }; changed = true; }
    }
    if (changed) await this.persistBounded(records);
  }

  async renderCsv(): Promise<string> {
    return renderSyncAttentionRecordsCsv(await this.all());
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
