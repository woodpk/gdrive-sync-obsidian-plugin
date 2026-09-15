import type { DriveResult, DriveSignal } from "../contracts/google-drive";
import { sanitizeDiagnosticText, type DiagnosticLogger, type SafeDiagnosticFields } from "../diagnostics/diagnostic-logger";
import { GoogleOAuthSession, type FetchLike } from "./auth";

export interface RetryPolicy { readonly maxAttempts: number; readonly baseDelayMs: number; readonly maxDelayMs: number; readonly maxConcurrency: number; }
export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxAttempts: 5, baseDelayMs: 500, maxDelayMs: 15_000, maxConcurrency: 3 };
export type Sleeper = (ms: number) => Promise<void>;
export type Random = () => number;
export type PortableRequestInit = Omit<RequestInit, "body"> & { readonly body?: BodyInit | Uint8Array };

class Semaphore {
  private active = 0; private readonly waiting: Array<() => void> = [];
  constructor(private readonly limit: number) {}
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>(resolve => this.waiting.push(resolve));
    this.active++;
    try { return await work(); }
    finally { this.active--; this.waiting.shift()?.(); }
  }
}

function retryAfterMs(response: Response, nowMs: number): number | undefined {
  const raw = response.headers.get("retry-after"); if (!raw) return undefined;
  const seconds = Number(raw); if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw); return Number.isFinite(date) ? Math.max(0, date - nowMs) : undefined;
}
async function errorReason(response: Response): Promise<string> {
  try {
    const body = await response.clone().json() as { error?: { errors?: Array<{ reason?: string }>; status?: string; message?: string } };
    return body.error?.errors?.[0]?.reason ?? body.error?.status ?? body.error?.message ?? `http-${response.status}`;
  } catch { return `http-${response.status}`; }
}
function quotaReason(reason: string): boolean { return /storageQuotaExceeded|quotaExceeded/i.test(reason) && !/rateLimit/i.test(reason); }
function rateReason(reason: string): boolean { return /rateLimitExceeded|userRateLimitExceeded|sharingRateLimitExceeded/i.test(reason); }
function portableBody(body: PortableRequestInit["body"]): BodyInit | null | undefined {
  if (!(body instanceof Uint8Array)) return body;
  return body.slice().buffer as ArrayBuffer;
}
function automaticReplaySafe(init: PortableRequestInit): boolean {
  return (init.method ?? "GET").toUpperCase() !== "POST";
}

const PROVIDER_REQUEST_ID_HEADERS = ["x-goog-request-id", "x-guploader-uploadid"] as const;
let fallbackRequestSequence = 1;

function requestCorrelationId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") return `drive-http:${globalThis.crypto.randomUUID()}`;
  } catch {
    // Fall back to a runtime-local sequence if the Web Crypto surface is unavailable.
  }
  return `drive-http:${Date.now().toString(36)}:${fallbackRequestSequence++}`;
}

function providerRequestId(response: Response): string | undefined {
  for (const name of PROVIDER_REQUEST_ID_HEADERS) {
    const raw = response.headers.get(name);
    if (!raw) continue;
    const sanitized = sanitizeDiagnosticText(raw);
    if (sanitized) return sanitized;
  }
  return undefined;
}

function endpointClass(url: string, method: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path === "/drive/v3/about") return "drive.about";
    if (path === "/drive/v3/files/generateIds") return "drive.files.generate-ids";
    if (path === "/drive/v3/changes" || path === "/drive/v3/changes/startPageToken") return "drive.changes";

    if (/^\/upload\/drive\/v3\/files(?:\/[^/]+)?$/.test(path)) {
      if (method === "PUT" || parsed.searchParams.has("upload_id")) return "drive.upload.resumable";
      if (parsed.searchParams.get("uploadType") === "resumable") return "drive.upload.resumable-session";
      return "drive.upload.unrecognized";
    }

    if (path === "/drive/v3/files") {
      if (method === "GET") return "drive.files.list";
      if (method === "POST") return "drive.files.create";
      return "drive.files.collection";
    }

    if (/^\/drive\/v3\/files\/[^/]+$/.test(path)) {
      if (method === "GET" && parsed.searchParams.get("alt") === "media") return "drive.files.download";
      if (method === "GET") return "drive.files.get";
      if (method === "PATCH") return "drive.files.patch";
      return "drive.files.item";
    }
  } catch {
    // A malformed or nonstandard URL is represented only by the safe fallback class.
  }
  return "drive.unrecognized";
}

function responseClassification(status: number, reason: string): string {
  if (status === 401) return "authentication-rejected";
  if (status === 404) return "not-found";
  if (status === 409 || status === 412) return "conflict";
  if (status === 410) return "recovery-required";
  if (quotaReason(reason)) return "quota-exhausted";
  if (status === 429 || rateReason(reason)) return "rate-limited";
  if (status === 403) return "permission-denied";
  if (status >= 500) return "transient-http-failure";
  return "http-failure";
}

type DiagnosticSeverity = "trace" | "debug" | "info" | "warn";

export class GoogleHttpTransport {
  private readonly semaphore: Semaphore;
  constructor(
    private readonly oauth: GoogleOAuthSession,
    private readonly fetcher: FetchLike = fetch,
    private readonly policy: RetryPolicy = DEFAULT_RETRY_POLICY,
    private readonly sleep: Sleeper = ms => new Promise(resolve => setTimeout(resolve, ms)),
    private readonly random: Random = Math.random,
    private readonly now: () => number = () => Date.now(),
    private readonly diagnostics?: DiagnosticLogger,
    private readonly monotonicNow: () => number = () => globalThis.performance?.now?.() ?? Date.now(),
  ) { this.semaphore = new Semaphore(Math.max(1, policy.maxConcurrency)); }

  request(url: string, init: PortableRequestInit = {}, retry = true): Promise<DriveResult<Response>> {
    return this.semaphore.run(async () => {
      const replaySafe = retry && automaticReplaySafe(init);
      const method = (init.method ?? "GET").toUpperCase();
      const requestId = requestCorrelationId();
      const safeEndpointClass = endpointClass(url, method);
      const requestStarted = this.monotonicNow();
      const runId = this.currentRunId();
      const commonFields: SafeDiagnosticFields = {
        requestId,
        method,
        endpointClass: safeEndpointClass,
        replaySafe,
        maxAttempts: this.policy.maxAttempts,
      };
      this.emit("debug", "google-http-request-started", commonFields, runId);

      for (let attempt = 0; attempt < this.policy.maxAttempts; attempt++) {
        const attemptNumber = attempt + 1;
        const token = await this.oauth.accessToken();
        if (!token) {
          const signal: DriveSignal = this.oauth.accessTokenFailure() === "transient"
            ? { kind: "transient-failure", detail: "oauth-refresh-deferred" }
            : { kind: "authentication-required", detail: "missing-or-expired-token" };
          this.emit("warn", "google-http-request-failed", {
            ...commonFields,
            attemptNumber,
            latencyMs: this.elapsedMs(requestStarted),
            classification: signal.kind === "transient-failure" ? "oauth-refresh-deferred" : "oauth-token-unavailable",
            retryDecision: "not-retryable",
            driveSignal: signal.kind,
            result: "failure",
          }, runId);
          return { ok: false, signal };
        }

        const attemptStarted = this.monotonicNow();
        this.emit("trace", "google-http-attempt-started", { ...commonFields, attemptNumber }, runId);
        let response: Response;
        try {
          const headers = new Headers(init.headers); headers.set("authorization", `Bearer ${token}`);
          const { body, ...rest } = init;
          response = await this.fetcher(url, { ...rest, headers, body: portableBody(body) });
        } catch {
          const latencyMs = this.elapsedMs(attemptStarted);
          this.emit("trace", "google-http-network-failure", {
            ...commonFields,
            attemptNumber,
            latencyMs,
            classification: "network-exception",
          }, runId);
          if (!replaySafe || attempt + 1 >= this.policy.maxAttempts) {
            const signal: DriveSignal = { kind: "transient-failure", detail: "network-failure" };
            this.emit("warn", "google-http-request-failed", {
              ...commonFields,
              attemptNumber,
              latencyMs: this.elapsedMs(requestStarted),
              classification: "network-exception",
              retryDecision: replaySafe ? "retry-budget-exhausted" : "not-replay-safe",
              driveSignal: signal.kind,
              result: "failure",
            }, runId);
            return { ok: false, signal };
          }
          const delayMs = this.retryDelayMs(attempt);
          this.emit("debug", "google-http-retry-scheduled", {
            ...commonFields,
            attemptNumber,
            latencyMs,
            classification: "network-exception",
            retryDecision: "retry-after-backoff",
            retryDelayMs: delayMs,
          }, runId);
          await this.sleep(delayMs); continue;
        }

        const safeProviderRequestId = providerRequestId(response);
        if (response.ok || response.status === 308) {
          const attemptLatencyMs = this.elapsedMs(attemptStarted);
          this.emit("trace", "google-http-response-received", {
            ...commonFields,
            attemptNumber,
            latencyMs: attemptLatencyMs,
            httpStatus: response.status,
            classification: "http-success",
            ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
          }, runId);
          this.emit("info", "google-http-request-succeeded", {
            ...commonFields,
            attemptNumber,
            latencyMs: this.elapsedMs(requestStarted),
            httpStatus: response.status,
            retryDecision: "complete",
            result: "success",
            ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
          }, runId);
          return { ok: true, value: response };
        }

        if (response.status === 401) {
          const attemptLatencyMs = this.elapsedMs(attemptStarted);
          this.emit("trace", "google-http-response-received", {
            ...commonFields,
            attemptNumber,
            latencyMs: attemptLatencyMs,
            httpStatus: response.status,
            classification: "authentication-rejected",
            ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
          }, runId);
          this.oauth.invalidateAccessToken();
          if (replaySafe && attempt + 1 < this.policy.maxAttempts) {
            this.emit("debug", "google-http-retry-scheduled", {
              ...commonFields,
              attemptNumber,
              latencyMs: attemptLatencyMs,
              httpStatus: response.status,
              classification: "authentication-rejected",
              retryDecision: "retry-after-token-invalidation",
              retryDelayMs: 0,
              ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
            }, runId);
            continue;
          }
          const signal: DriveSignal = { kind: "authentication-required", detail: "google-rejected-token" };
          this.emit("warn", "google-http-request-failed", {
            ...commonFields,
            attemptNumber,
            latencyMs: this.elapsedMs(requestStarted),
            httpStatus: response.status,
            classification: "authentication-rejected",
            retryDecision: replaySafe ? "retry-budget-exhausted" : "not-replay-safe",
            driveSignal: signal.kind,
            result: "failure",
            ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
          }, runId);
          return { ok: false, signal };
        }

        const reason = await errorReason(response);
        const classification = responseClassification(response.status, reason);
        const attemptLatencyMs = this.elapsedMs(attemptStarted);
        this.emit("trace", "google-http-response-received", {
          ...commonFields,
          attemptNumber,
          latencyMs: attemptLatencyMs,
          httpStatus: response.status,
          classification,
          ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
        }, runId);

        if (response.status === 404) {
          const signal: DriveSignal = { kind: "not-found" };
          return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, "not-retryable", safeProviderRequestId);
        }
        if (response.status === 409 || response.status === 412) {
          const signal: DriveSignal = { kind: "conflict", detail: reason };
          return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, "not-retryable", safeProviderRequestId);
        }
        if (response.status === 410) {
          const signal: DriveSignal = { kind: "recovery-required", detail: "drive-change-cursor-invalid" };
          return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, "not-retryable", safeProviderRequestId);
        }
        if (quotaReason(reason)) {
          const signal: DriveSignal = { kind: "quota-exhausted", detail: reason };
          return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, "not-retryable", safeProviderRequestId);
        }
        if (response.status === 429 || rateReason(reason)) {
          const serverDelay = retryAfterMs(response, this.now());
          if (!replaySafe || attempt + 1 >= this.policy.maxAttempts) {
            const signal: DriveSignal = { kind: "rate-limited", retryAfterMs: serverDelay };
            return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, replaySafe ? "retry-budget-exhausted" : "not-replay-safe", safeProviderRequestId);
          }
          const delayMs = this.retryDelayMs(attempt, serverDelay);
          this.emit("debug", "google-http-retry-scheduled", {
            ...commonFields,
            attemptNumber,
            latencyMs: attemptLatencyMs,
            httpStatus: response.status,
            classification,
            retryDecision: "retry-after-backoff",
            retryDelayMs: delayMs,
            ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
          }, runId);
          await this.sleep(delayMs); continue;
        }
        if (response.status === 403) {
          const signal: DriveSignal = { kind: "permission-denied", detail: reason };
          return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, "not-retryable", safeProviderRequestId);
        }
        if (response.status >= 500) {
          if (!replaySafe || attempt + 1 >= this.policy.maxAttempts) {
            const signal: DriveSignal = { kind: "transient-failure", detail: reason };
            return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, replaySafe ? "retry-budget-exhausted" : "not-replay-safe", safeProviderRequestId);
          }
          const delayMs = this.retryDelayMs(attempt, retryAfterMs(response, this.now()));
          this.emit("debug", "google-http-retry-scheduled", {
            ...commonFields,
            attemptNumber,
            latencyMs: attemptLatencyMs,
            httpStatus: response.status,
            classification,
            retryDecision: "retry-after-backoff",
            retryDelayMs: delayMs,
            ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
          }, runId);
          await this.sleep(delayMs); continue;
        }
        const signal: DriveSignal = { kind: "transient-failure", detail: reason };
        return this.finalFailure(signal, commonFields, requestStarted, attemptNumber, runId, response, classification, "not-retryable", safeProviderRequestId);
      }

      const signal: DriveSignal = { kind: "transient-failure", detail: "retry-budget-exhausted" };
      this.emit("warn", "google-http-request-failed", {
        ...commonFields,
        attemptNumber: this.policy.maxAttempts,
        latencyMs: this.elapsedMs(requestStarted),
        classification: "retry-budget-exhausted",
        retryDecision: "retry-budget-exhausted",
        driveSignal: signal.kind,
        result: "failure",
      }, runId);
      return { ok: false, signal };
    });
  }

  private finalFailure(
    signal: DriveSignal,
    commonFields: SafeDiagnosticFields,
    requestStarted: number,
    attemptNumber: number,
    runId: number | undefined,
    response: Response,
    classification: string,
    retryDecision: string,
    safeProviderRequestId?: string,
  ): DriveResult<Response> {
    this.emit("warn", "google-http-request-failed", {
      ...commonFields,
      attemptNumber,
      latencyMs: this.elapsedMs(requestStarted),
      httpStatus: response.status,
      classification,
      retryDecision,
      driveSignal: signal.kind,
      result: "failure",
      ...(safeProviderRequestId ? { providerRequestId: safeProviderRequestId } : {}),
    }, runId);
    return { ok: false, signal };
  }

  private retryDelayMs(attempt: number, minimum?: number): number {
    const exponential = Math.min(this.policy.maxDelayMs, this.policy.baseDelayMs * 2 ** attempt);
    const jittered = exponential * (0.5 + this.random() * 0.5);
    return Math.max(minimum ?? 0, jittered);
  }

  private elapsedMs(started: number): number {
    return Math.max(0, Math.round((this.monotonicNow() - started) * 1000) / 1000);
  }

  private currentRunId(): number | undefined {
    try { return this.diagnostics?.currentSyncRunId(); }
    catch { return undefined; }
  }

  private emit(severity: DiagnosticSeverity, event: string, fields: SafeDiagnosticFields, runId?: number): void {
    const logger = this.diagnostics;
    if (!logger) return;
    try {
      if (runId !== undefined) {
        if (severity === "trace") logger.syncTrace("drive.http", event, runId, fields);
        else if (severity === "debug") logger.syncDebug("drive.http", event, runId, fields);
        else if (severity === "info") logger.syncInfo("drive.http", event, runId, fields);
        else logger.syncWarn("drive.http", event, runId, fields);
      } else {
        if (severity === "trace") logger.trace("drive.http", event, fields);
        else if (severity === "debug") logger.debug("drive.http", event, fields);
        else if (severity === "info") logger.info("drive.http", event, fields);
        else logger.warn("drive.http", event, fields);
      }
    } catch {
      // Diagnostics are non-authoritative and must never change transport behavior.
    }
  }
}

export const withRemoteId = (signal: DriveSignal, id: import("../contracts/common").RemoteObjectId): DriveSignal => signal.kind === "not-found" ? { ...signal, remoteObjectId: id } : signal;
