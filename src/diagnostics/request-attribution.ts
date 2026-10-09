import type { PlannedOperation } from "../contracts";
import type { DiagnosticLogger, SafeDiagnosticFields } from "./diagnostic-logger";

export type RequestPurpose =
  | "full-reconciliation-tree" | "reconciliation-provenance"
  | "parent-path-resolution" | "reserved-id-observation"
  | "create-result-verification" | "precondition-validation"
  | "managed-root-account" | "unattributed";

export interface RequestAttributionScope {
  readonly runId: number;
  readonly operationIndex: number;
  readonly operationKind: string;
  readonly purpose: RequestPurpose;
}

export interface RequestMeasurement {
  readonly runId?: number;
  readonly scope?: RequestAttributionScope;
  readonly endpoint: string;
  readonly method: string;
  readonly elapsedMs: number;
  readonly attempts: number;
  readonly status?: number;
  readonly failed: boolean;
}

type Counts = { count: number; ms: number };
type Totals = {
  requests: number; failed: number; missing: number; retries: number; ms: number;
  endpoints: Map<string, Counts>; purposes: Map<RequestPurpose, Counts>;
};
type Operation = Totals & {
  index: number; kind: string; started: number; ended: boolean;
  scope: RequestAttributionScope; passes: number; passMs: number; passFailed: number; unknownDuringOperation: boolean;
};
type Run = Totals & {
  operations: Map<string, Operation>; byIndex: Map<number, Operation>;
  unattributed: number; closed: boolean; completedOperations: number;
};
const purposes: readonly RequestPurpose[] = [
  "full-reconciliation-tree", "reconciliation-provenance", "parent-path-resolution",
  "reserved-id-observation", "create-result-verification", "precondition-validation",
  "managed-root-account", "unattributed",
];
function empty(): Totals {
  return { requests: 0, failed: 0, missing: 0, retries: 0, ms: 0,
    endpoints: new Map(), purposes: new Map() };
}
function count(map: Map<string, Counts>, key: string, ms: number): void {
  const value = map.get(key) ?? { count: 0, ms: 0 };
  value.count++; value.ms += ms; map.set(key, value);
}
function add(t: Totals, value: RequestMeasurement, purpose: RequestPurpose): void {
  t.requests++; if (value.failed) t.failed++;
  if (value.status === 404) t.missing++;
  t.retries += Math.max(0, value.attempts - 1);
  const ms = Number.isFinite(value.elapsedMs) ? Math.max(0, value.elapsedMs) : 0;
  t.ms += ms;
  const endpoint = ["drive.files.list", "drive.files.get", "drive.about"].includes(value.endpoint)
    ? value.endpoint : value.method === "GET" || value.method === "HEAD" ? "other-read" : "write";
  count(t.endpoints, endpoint, ms);
  count(t.purposes, purpose, ms);
}
function keys(t: Totals): SafeDiagnosticFields {
  const e = (key: string) => t.endpoints.get(key)?.count ?? 0;
  const p = (key: RequestPurpose) => t.purposes.get(key)?.count ?? 0;
  const pm = (key: RequestPurpose) => Math.round(t.purposes.get(key)?.ms ?? 0);
  const em = (key: string) => Math.round(t.endpoints.get(key)?.ms ?? 0);
  return {
    requestCount: t.requests, failedRequestCount: t.failed,
    notFoundRequestCount: t.missing, retryCount: t.retries,
    summedRequestMs: Math.round(t.ms), listRequestCount: e("drive.files.list"),
    getRequestCount: e("drive.files.get"), aboutRequestCount: e("drive.about"),
    otherReadRequestCount: e("other-read"), writeRequestCount: e("write"),
    fullTreeRequestCount: p("full-reconciliation-tree"),
    provenanceRequestCount: p("reconciliation-provenance"),
    parentPathRequestCount: p("parent-path-resolution"),
    reservedIdRequestCount: p("reserved-id-observation"),
    createVerifyRequestCount: p("create-result-verification"),
    preconditionRequestCount: p("precondition-validation"),
    rootAccountRequestCount: p("managed-root-account"),
    unattributedRequestCount: p("unattributed"),
    listRequestMs: em("drive.files.list"), getRequestMs: em("drive.files.get"),
    aboutRequestMs: em("drive.about"),
    otherReadRequestMs: em("other-read"), writeRequestMs: em("write"),
    fullTreeRequestMs: pm("full-reconciliation-tree"),
    provenanceRequestMs: pm("reconciliation-provenance"),
    parentPathRequestMs: pm("parent-path-resolution"),
    reservedIdRequestMs: pm("reserved-id-observation"),
    createVerifyRequestMs: pm("create-result-verification"),
    preconditionRequestMs: pm("precondition-validation"),
    rootAccountRequestMs: pm("managed-root-account"),
    unattributedRequestMs: pm("unattributed"),
  };
}

export class RequestAttributionMonitor {
  private runs = new Map<number, Run>();
  constructor(private logger: DiagnosticLogger, private now: () => number = () => globalThis.performance?.now?.() ?? Date.now()) {}
  private run(id: number): Run {
    let r = this.runs.get(id);
    if (!r) { r = { ...empty(), operations: new Map(), byIndex: new Map(), unattributed: 0, closed: false, completedOperations: 0 }; this.runs.set(id, r); }
    return r;
  }
  start(id: number, op: PlannedOperation, index: number): void {
    try {
      const r = this.run(id), key = String(op.operationId);
      if (r.closed || r.operations.has(key)) return;
      const scope = Object.freeze({ runId: id, operationIndex: index,
        operationKind: op.kind, purpose: "precondition-validation" as const });
      const entry: Operation = { ...empty(), scope, index, kind: op.kind,
        started: this.now(), ended: false, passes: 0, passMs: 0, passFailed: 0, unknownDuringOperation: false };
      r.operations.set(key, entry); r.byIndex.set(index, entry);
    } catch { /* Measurement is non-authoritative. */ }
  }
  scopeFor(id: number | undefined, op: PlannedOperation): RequestAttributionScope | undefined {
    return id === undefined ? undefined : this.runs.get(id)?.operations.get(String(op.operationId))?.scope;
  }
  observe(value: RequestMeasurement): void {
    try {
      if (value.runId === undefined) return;
      const r = this.run(value.runId);
      if (r.closed) return;
      const scope = value.scope;
      const entry = scope?.runId === value.runId ? r.byIndex.get(scope.operationIndex) : undefined;
      const valid = !!entry && !entry.ended && entry.kind === scope?.operationKind;
      const purpose = valid && purposes.includes(scope!.purpose) ? scope!.purpose : "unattributed";
      add(r, value, purpose);
      if (valid) add(entry!, value, purpose);
      else {
        r.unattributed++;
        for (const active of r.operations.values()) if (!active.ended) active.unknownDuringOperation = true;
      }
    } catch { /* Measurement is non-authoritative. */ }
  }
  reconciliation(scope: RequestAttributionScope | undefined, ms: number, failed: boolean): void {
    try {
      if (!scope) return;
      const entry = this.runs.get(scope.runId)?.byIndex.get(scope.operationIndex);
      if (!entry || entry.ended || entry.kind !== scope.operationKind) return;
      entry.passes++; entry.passMs += Number.isFinite(ms) ? Math.max(0, ms) : 0;
      if (failed) entry.passFailed++;
    } catch { /* Measurement is non-authoritative. */ }
  }
  finish(id: number, op: PlannedOperation, result?: string): void {
    try {
      const entry = this.runs.get(id)?.operations.get(String(op.operationId));
      if (!entry || entry.ended) return;
      entry.ended = true;
      const run = this.runs.get(id)!;
      run.operations.delete(String(op.operationId));
      run.byIndex.delete(entry.index);
      run.completedOperations++;
      this.logger.syncInfo("sync.attribution", "operation-request-attribution", id, {
        attributionVersion: 1, operationIndex: entry.index, operationKind: entry.kind,
        operationWallMs: Math.round(Math.max(0, this.now() - entry.started)),
        reconciliationCount: entry.passes, reconciliationWallMs: Math.round(entry.passMs),
        reconciliationFailureCount: entry.passFailed, attributionComplete: !entry.unknownDuringOperation,
        ...(result ? { result } : {}), ...keys(entry),
      });
    } catch { /* Measurement is non-authoritative. */ }
  }
  close(id: number): void {
    try {
      const r = this.runs.get(id); if (!r || r.closed) return;
      r.closed = true;
      const incomplete = [...r.operations.values()].filter(op => !op.ended).length;
      this.logger.syncInfo("sync.attribution", "run-request-attribution", id, {
        attributionVersion: 1, operationCount: r.completedOperations + r.operations.size,
        incompleteOperationCount: incomplete,
        attributionComplete: incomplete === 0 && r.unattributed === 0,
        ...keys(r),
      });
    } catch { /* Measurement is non-authoritative. */ }
    finally { this.runs.delete(id); }
  }
}

const monitors = new WeakMap<DiagnosticLogger, RequestAttributionMonitor>();
export function registerRequestAttributionMonitor(logger: DiagnosticLogger, monitor: RequestAttributionMonitor): void { monitors.set(logger, monitor); }
export function requestAttributionMonitorFor(logger?: DiagnosticLogger): RequestAttributionMonitor | undefined { return logger ? monitors.get(logger) : undefined; }
