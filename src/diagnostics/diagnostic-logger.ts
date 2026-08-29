export const DIAGNOSTIC_LOG_LEVELS = ["off", "error", "warn", "info", "debug", "trace"] as const;
export type DiagnosticLogLevel = typeof DIAGNOSTIC_LOG_LEVELS[number];
export type RetainedDiagnosticLevel = Exclude<DiagnosticLogLevel, "off">;
export type DiagnosticPlatform = "desktop" | "mobile" | "unknown";

export const DEFAULT_DIAGNOSTIC_RETENTION = 2000;
export const MIN_DIAGNOSTIC_RETENTION = 100;
export const MAX_DIAGNOSTIC_RETENTION = 5000;

export type DiagnosticComponent =
  | "diagnostics"
  | "diagnostics.browser-probe"
  | "oauth.settings"
  | "oauth.plugin"
  | "oauth.runtime"
  | "oauth.transaction"
  | "oauth.browser"
  | "oauth.callback"
  | "runtime"
  | "sync.controller"
  | "sync.plan"
  | "sync.execute"
  | "drive"
  | "recovery"
  | "portable-config";

export type DiagnosticFieldKey =
  | "operation"
  | "stage"
  | "source"
  | "target"
  | "launcher"
  | "method"
  | "result"
  | "reason"
  | "classification"
  | "errorName"
  | "safeMessage"
  | "retryable"
  | "recoveryIntended"
  | "runtimeInitialized"
  | "clientIdConfigured"
  | "redirectUriConfigured"
  | "clientSecretConfigured"
  | "callbackRegistrationActive"
  | "browserApiPresent"
  | "transactionPrepared"
  | "scopeExact"
  | "deviceIdentityPresent"
  | "vaultIdentityPresent"
  | "remoteRootPresent"
  | "storeReady"
  | "asyncBoundary"
  | "codePresent"
  | "statePresent"
  | "errorPresent"
  | "count"
  | "runMode"
  | "trigger"
  | "planDisposition"
  | "stateStatus"
  | "localCount"
  | "remoteCount"
  | "snapshotCount"
  | "operationCount"
  | "operationIndex"
  | "operationKind"
  | "direction"
  | "preconditionCount"
  | "conflictCount"
  | "blockedCount"
  | "attentionCount"
  | "skippedCount"
  | "safeCommittedCount"
  | "attentionReasonCodes"
  | "destructiveCount"
  | "uploadCount"
  | "downloadCount"
  | "moveCount"
  | "trashCount"
  | "noopCount"
  | "localCompleteness"
  | "remoteCompleteness"
  | "reviewed"
  | "reconstruction"
  | "cursorPresent"
  | "retentionLimit"
  | "enabled";
export type DiagnosticFieldValue = string | number | boolean | null;
export type SafeDiagnosticFields = Partial<Record<DiagnosticFieldKey, DiagnosticFieldValue>>;

export interface DiagnosticEvent {
  readonly timestamp: string;
  readonly sequence: number;
  readonly level: RetainedDiagnosticLevel;
  readonly component: DiagnosticComponent;
  readonly event: string;
  readonly attemptId?: number;
  readonly runId?: number;
  readonly platform: DiagnosticPlatform;
  readonly elapsedMs?: number;
  readonly fields?: SafeDiagnosticFields;
}

export interface DiagnosticStoreState {
  readonly records: readonly DiagnosticEvent[];
  readonly nextSequence: number;
  readonly nextAttemptId: number;
  readonly nextRunId?: number;
}

export interface DiagnosticPersistence {
  loadDiagnostics(): Promise<unknown>;
  saveDiagnostics(state: DiagnosticStoreState): Promise<void>;
}

export interface DiagnosticSummary {
  readonly count: number;
  readonly oldest?: Pick<DiagnosticEvent, "sequence" | "timestamp">;
  readonly newest?: Pick<DiagnosticEvent, "sequence" | "timestamp">;
}

export interface DiagnosticLoggerOptions {
  readonly persistence: DiagnosticPersistence;
  readonly level: DiagnosticLogLevel;
  readonly retentionLimit: number;
  readonly consoleMirror: boolean;
  readonly platform: DiagnosticPlatform;
  readonly now?: () => Date;
  readonly monotonicNow?: () => number;
  readonly consoleSink?: (line: string) => void;
}

const LEVEL_RANK: Record<DiagnosticLogLevel, number> = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};
const ALLOWED_FIELD_KEYS = new Set<string>([
  "operation", "stage", "source", "target", "launcher", "method", "result", "reason", "classification",
  "errorName", "safeMessage", "retryable", "recoveryIntended", "runtimeInitialized", "clientIdConfigured",
  "redirectUriConfigured", "clientSecretConfigured", "callbackRegistrationActive", "browserApiPresent",
  "transactionPrepared", "scopeExact", "deviceIdentityPresent", "vaultIdentityPresent", "remoteRootPresent",
  "storeReady", "asyncBoundary", "codePresent", "statePresent", "errorPresent", "count", "retentionLimit", "enabled",
  "runMode", "trigger", "planDisposition", "stateStatus", "localCount", "remoteCount", "snapshotCount",
  "operationCount", "operationIndex", "operationKind", "direction", "preconditionCount", "conflictCount", "blockedCount", "attentionCount", "skippedCount", "safeCommittedCount", "attentionReasonCodes",
  "destructiveCount", "uploadCount", "downloadCount", "moveCount", "trashCount", "noopCount",
  "localCompleteness", "remoteCompleteness", "reviewed", "reconstruction", "cursorPresent",
]);
const URL_WITH_QUERY = /https?:\/\/[^\s<>"']*\?[^\s<>"']*/gi;
const SENSITIVE_ASSIGNMENT = /\b(access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|authorization[_ -]?code|oauth[_ -]?state|pkce[_ -]?(?:verifier|challenge)|code[_ -]?(?:verifier|challenge)|cookie|password|passcode)\s*([:=])\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
const OAUTH_QUERY_VALUE = /([?&](?:code|state|code_challenge|code_verifier|access_token|refresh_token)=)[^&#\s]+/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const JWT_LIKE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const MAX_TEXT_LENGTH = 320;

export function sanitizeDiagnosticText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  let sanitized = value
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
    .replace(URL_WITH_QUERY, "[redacted-url]")
    .replace(OAUTH_QUERY_VALUE, "$1[redacted]")
    .replace(SENSITIVE_ASSIGNMENT, (_match, key: string, separator: string) => `${key}${separator}[redacted]`)
    .replace(BEARER_TOKEN, "Bearer [redacted]")
    .replace(JWT_LIKE, "[redacted-token]")
    .replace(/\s+/g, " ")
    .trim();
  if (!sanitized) return undefined;
  if (sanitized.length > MAX_TEXT_LENGTH) sanitized = `${sanitized.slice(0, MAX_TEXT_LENGTH - 1)}…`;
  return sanitized;
}

export function normalizeDiagnosticError(error: unknown, classification = "unexpected-failure"): SafeDiagnosticFields {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Non-Error failure";
  return {
    errorName: sanitizeDiagnosticText(name) ?? "Error",
    safeMessage: sanitizeDiagnosticText(message) ?? "Failure details were unavailable after sanitization.",
    classification: sanitizeDiagnosticText(classification) ?? "unexpected-failure",
  };
}

function normalizedRetention(value: number): number {
  if (!Number.isSafeInteger(value)) return DEFAULT_DIAGNOSTIC_RETENTION;
  return Math.min(MAX_DIAGNOSTIC_RETENTION, Math.max(MIN_DIAGNOSTIC_RETENTION, value));
}
function isDiagnosticLevel(value: unknown): value is DiagnosticLogLevel {
  return typeof value === "string" && (DIAGNOSTIC_LOG_LEVELS as readonly string[]).includes(value);
}
function safeInteger(value: unknown, fallback: number): number {
  return Number.isSafeInteger(value) && Number(value) >= 1 ? Number(value) : fallback;
}
function sanitizeFields(fields?: SafeDiagnosticFields | Record<string, unknown>): SafeDiagnosticFields | undefined {
  if (!fields) return undefined;
  const result: Partial<Record<DiagnosticFieldKey, DiagnosticFieldValue>> = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!ALLOWED_FIELD_KEYS.has(key)) continue;
    if (typeof raw === "string") {
      const sanitized = sanitizeDiagnosticText(raw);
      if (sanitized !== undefined) result[key as DiagnosticFieldKey] = sanitized;
    } else if (typeof raw === "number" && Number.isFinite(raw)) result[key as DiagnosticFieldKey] = raw;
    else if (typeof raw === "boolean" || raw === null) result[key as DiagnosticFieldKey] = raw;
  }
  return Object.keys(result).length ? result : undefined;
}
function parsePersistedEvent(value: unknown): DiagnosticEvent | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.timestamp !== "string" || !Number.isSafeInteger(record.sequence) || Number(record.sequence) < 1) return undefined;
  if (!isDiagnosticLevel(record.level) || record.level === "off") return undefined;
  if (typeof record.component !== "string" || typeof record.event !== "string") return undefined;
  const platform: DiagnosticPlatform = record.platform === "desktop" || record.platform === "mobile" ? record.platform : "unknown";
  const attemptId = Number.isSafeInteger(record.attemptId) && Number(record.attemptId) >= 1 ? Number(record.attemptId) : undefined;
  const runId = Number.isSafeInteger(record.runId) && Number(record.runId) >= 1 ? Number(record.runId) : undefined;
  const elapsedMs = typeof record.elapsedMs === "number" && Number.isFinite(record.elapsedMs) && record.elapsedMs >= 0 ? record.elapsedMs : undefined;
  return {
    timestamp: record.timestamp,
    sequence: Number(record.sequence),
    level: record.level,
    component: record.component as DiagnosticComponent,
    event: sanitizeDiagnosticText(record.event) ?? "invalid-event",
    ...(attemptId !== undefined ? { attemptId } : {}),
    ...(runId !== undefined ? { runId } : {}),
    platform,
    ...(elapsedMs !== undefined ? { elapsedMs } : {}),
    ...(record.fields && typeof record.fields === "object" && !Array.isArray(record.fields)
      ? { fields: sanitizeFields(record.fields as Record<string, unknown>) }
      : {}),
  };
}
function sortedFields(fields: SafeDiagnosticFields | undefined): SafeDiagnosticFields | undefined {
  if (!fields) return undefined;
  const ordered: Partial<Record<DiagnosticFieldKey, DiagnosticFieldValue>> = {};
  for (const key of Object.keys(fields).sort()) ordered[key as DiagnosticFieldKey] = fields[key as DiagnosticFieldKey] as DiagnosticFieldValue;
  return ordered;
}

export function renderDiagnosticEvent(event: DiagnosticEvent): string {
  return JSON.stringify({
    timestamp: event.timestamp,
    sequence: event.sequence,
    level: event.level,
    component: event.component,
    event: event.event,
    ...(event.attemptId !== undefined ? { attemptId: event.attemptId } : {}),
    ...(event.runId !== undefined ? { runId: event.runId } : {}),
    platform: event.platform,
    ...(event.elapsedMs !== undefined ? { elapsedMs: event.elapsedMs } : {}),
    ...(event.fields ? { fields: sortedFields(event.fields) } : {}),
  });
}

export class DiagnosticLogger {
  private records: DiagnosticEvent[] = [];
  private nextSequence = 1;
  private nextAttemptId = 1;
  private nextRunId = 1;
  private activeAttemptId?: number;
  private readonly attemptStarted = new Map<number, number>();
  private readonly runStarted = new Map<number, number>();
  private level: DiagnosticLogLevel;
  private retentionLimit: number;
  private consoleMirror: boolean;
  private persistChain = Promise.resolve();

  constructor(private readonly options: DiagnosticLoggerOptions) {
    this.level = options.level;
    this.retentionLimit = normalizedRetention(options.retentionLimit);
    this.consoleMirror = options.consoleMirror;
  }

  async initialize(): Promise<void> {
    const raw = await this.options.persistence.loadDiagnostics();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const state = raw as Record<string, unknown>;
    const parsed = Array.isArray(state.records) ? state.records.map(parsePersistedEvent).filter((event): event is DiagnosticEvent => Boolean(event)) : [];
    parsed.sort((a, b) => a.sequence - b.sequence);
    this.records = parsed.slice(-this.retentionLimit);
    const highestSequence = this.records.reduce((max, event) => Math.max(max, event.sequence), 0);
    this.nextSequence = Math.max(safeInteger(state.nextSequence, highestSequence + 1), highestSequence + 1);
    this.nextAttemptId = safeInteger(state.nextAttemptId, 1);
    this.nextRunId = safeInteger(state.nextRunId, 1);
  }

  configure(input: { readonly level: DiagnosticLogLevel; readonly retentionLimit: number; readonly consoleMirror: boolean }): void {
    this.level = input.level;
    this.retentionLimit = normalizedRetention(input.retentionLimit);
    this.consoleMirror = input.consoleMirror;
    if (this.records.length > this.retentionLimit) this.records = this.records.slice(-this.retentionLimit);
    this.queuePersist();
  }

  beginAttempt(source = "user"): number {
    const attemptId = this.nextAttemptId++;
    this.activeAttemptId = attemptId;
    this.attemptStarted.set(attemptId, this.monotonicNow());
    this.queuePersist();
    this.info("oauth.settings", "authentication-attempt-started", { source }, attemptId);
    return attemptId;
  }
  activateAttempt(attemptId: number): void {
    if (!Number.isSafeInteger(attemptId) || attemptId < 1) return;
    this.activeAttemptId = attemptId;
    if (!this.attemptStarted.has(attemptId)) this.attemptStarted.set(attemptId, this.monotonicNow());
  }
  currentAttemptId(): number | undefined { return this.activeAttemptId; }
  endAttempt(attemptId = this.activeAttemptId): void {
    if (attemptId === undefined) return;
    this.attemptStarted.delete(attemptId);
    if (this.activeAttemptId === attemptId) this.activeAttemptId = undefined;
  }

  beginSyncRun(source = "manual-sync"): number {
    const runId = this.nextRunId++;
    this.runStarted.set(runId, this.monotonicNow());
    this.queuePersist();
    this.syncInfo("sync.controller", "synchronization-run-started", runId, { source });
    return runId;
  }
  endSyncRun(runId: number): void { this.runStarted.delete(runId); }

  syncError(component: DiagnosticComponent, event: string, runId: number, fields?: SafeDiagnosticFields): void { this.record("error", component, event, fields, undefined, runId); }
  syncWarn(component: DiagnosticComponent, event: string, runId: number, fields?: SafeDiagnosticFields): void { this.record("warn", component, event, fields, undefined, runId); }
  syncInfo(component: DiagnosticComponent, event: string, runId: number, fields?: SafeDiagnosticFields): void { this.record("info", component, event, fields, undefined, runId); }
  syncDebug(component: DiagnosticComponent, event: string, runId: number, fields?: SafeDiagnosticFields): void { this.record("debug", component, event, fields, undefined, runId); }
  syncTrace(component: DiagnosticComponent, event: string, runId: number, fields?: SafeDiagnosticFields): void { this.record("trace", component, event, fields, undefined, runId); }
  syncFailure(component: DiagnosticComponent, event: string, runId: number, error: unknown, context: SafeDiagnosticFields = {}): void {
    const classification = typeof context.classification === "string" ? context.classification : "synchronization-failure";
    this.syncError(component, event, runId, {
      ...context,
      classification,
      errorName: error instanceof Error ? "Error" : "NonErrorFailure",
      safeMessage: "Synchronization failure details suppressed.",
    });
  }

  error(component: DiagnosticComponent, event: string, fields?: SafeDiagnosticFields, attemptId = this.activeAttemptId): void { this.record("error", component, event, fields, attemptId); }
  warn(component: DiagnosticComponent, event: string, fields?: SafeDiagnosticFields, attemptId = this.activeAttemptId): void { this.record("warn", component, event, fields, attemptId); }
  info(component: DiagnosticComponent, event: string, fields?: SafeDiagnosticFields, attemptId = this.activeAttemptId): void { this.record("info", component, event, fields, attemptId); }
  debug(component: DiagnosticComponent, event: string, fields?: SafeDiagnosticFields, attemptId = this.activeAttemptId): void { this.record("debug", component, event, fields, attemptId); }
  trace(component: DiagnosticComponent, event: string, fields?: SafeDiagnosticFields, attemptId = this.activeAttemptId): void { this.record("trace", component, event, fields, attemptId); }

  failure(
    component: DiagnosticComponent,
    event: string,
    error: unknown,
    context: SafeDiagnosticFields = {},
    attemptId = this.activeAttemptId,
  ): void {
    this.error(component, event, { ...context, ...normalizeDiagnosticError(error, typeof context.classification === "string" ? context.classification : undefined) }, attemptId);
  }

  clear(): void {
    this.records = [];
    this.queuePersist();
  }
  summary(): DiagnosticSummary {
    const oldest = this.records[0];
    const newest = this.records[this.records.length - 1];
    return {
      count: this.records.length,
      ...(oldest ? { oldest: { sequence: oldest.sequence, timestamp: oldest.timestamp } } : {}),
      ...(newest ? { newest: { sequence: newest.sequence, timestamp: newest.timestamp } } : {}),
    };
  }
  snapshot(): readonly DiagnosticEvent[] { return this.records.map(event => ({ ...event, ...(event.fields ? { fields: { ...event.fields } } : {}) })); }
  renderText(): string { return this.records.map(renderDiagnosticEvent).join("\n"); }
  async flush(): Promise<void> { await this.persistChain; }

  private record(level: RetainedDiagnosticLevel, component: DiagnosticComponent, event: string, fields?: SafeDiagnosticFields, attemptId?: number, runId?: number): void {
    if (this.level === "off" || LEVEL_RANK[level] > LEVEL_RANK[this.level]) return;
    const sanitizedEvent = sanitizeDiagnosticText(event) ?? "invalid-event";
    const safeFields = sanitizeFields(fields);
    const elapsedMs = attemptId !== undefined ? this.elapsedMs(attemptId) : runId !== undefined ? this.runElapsedMs(runId) : undefined;
    const retained: DiagnosticEvent = {
      timestamp: this.now().toISOString(),
      sequence: this.nextSequence++,
      level,
      component,
      event: sanitizedEvent,
      ...(attemptId !== undefined ? { attemptId } : {}),
      ...(runId !== undefined ? { runId } : {}),
      platform: this.options.platform,
      ...(elapsedMs !== undefined ? { elapsedMs } : {}),
      ...(safeFields ? { fields: safeFields } : {}),
    };
    this.records.push(retained);
    if (this.records.length > this.retentionLimit) this.records.splice(0, this.records.length - this.retentionLimit);
    const rendered = renderDiagnosticEvent(retained);
    if (this.consoleMirror) (this.options.consoleSink ?? (line => console.log(line)))(rendered);
    this.queuePersist();
  }
  private elapsedMs(attemptId: number): number | undefined {
    const started = this.attemptStarted.get(attemptId);
    if (started === undefined) return undefined;
    return Math.max(0, Math.round((this.monotonicNow() - started) * 1000) / 1000);
  }
  private runElapsedMs(runId: number): number | undefined {
    const started = this.runStarted.get(runId);
    if (started === undefined) return undefined;
    return Math.max(0, Math.round((this.monotonicNow() - started) * 1000) / 1000);
  }
  private now(): Date { return this.options.now?.() ?? new Date(); }
  private monotonicNow(): number { return this.options.monotonicNow?.() ?? globalThis.performance?.now?.() ?? Date.now(); }
  private queuePersist(): void {
    const state: DiagnosticStoreState = {
      records: this.snapshot(),
      nextSequence: this.nextSequence,
      nextAttemptId: this.nextAttemptId,
      nextRunId: this.nextRunId,
    };
    this.persistChain = this.persistChain
      .then(() => this.options.persistence.saveDiagnostics(state))
      .catch(() => undefined);
  }
}
