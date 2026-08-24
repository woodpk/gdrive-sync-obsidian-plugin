import type { DriveResult, DriveSignal } from "../contracts/google-drive";
import { GoogleOAuthSession, type FetchLike } from "./auth";

export interface RetryPolicy { readonly maxAttempts: number; readonly baseDelayMs: number; readonly maxDelayMs: number; readonly maxConcurrency: number; }
export const DEFAULT_RETRY_POLICY: RetryPolicy = { maxAttempts: 5, baseDelayMs: 500, maxDelayMs: 15_000, maxConcurrency: 3 };
export type Sleeper = (ms: number) => Promise<void>;
export type Random = () => number;

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

export class GoogleHttpTransport {
  private readonly semaphore: Semaphore;
  constructor(
    private readonly oauth: GoogleOAuthSession,
    private readonly fetcher: FetchLike = fetch,
    private readonly policy: RetryPolicy = DEFAULT_RETRY_POLICY,
    private readonly sleep: Sleeper = ms => new Promise(resolve => setTimeout(resolve, ms)),
    private readonly random: Random = Math.random,
    private readonly now: () => number = () => Date.now(),
  ) { this.semaphore = new Semaphore(Math.max(1, policy.maxConcurrency)); }

  request(url: string, init: RequestInit = {}, retry = true): Promise<DriveResult<Response>> {
    return this.semaphore.run(async () => {
      for (let attempt = 0; attempt < this.policy.maxAttempts; attempt++) {
        const token = await this.oauth.accessToken();
        if (!token) return { ok: false, signal: { kind: "authentication-required", detail: "missing-or-expired-token" } };
        let response: Response;
        try {
          const headers = new Headers(init.headers); headers.set("authorization", `Bearer ${token}`);
          response = await this.fetcher(url, { ...init, headers });
        } catch {
          if (!retry || attempt + 1 >= this.policy.maxAttempts) return { ok: false, signal: { kind: "transient-failure", detail: "network-failure" } };
          await this.delay(attempt); continue;
        }
        if (response.ok || response.status === 308) return { ok: true, value: response };
        if (response.status === 401) { this.oauth.clearTokens(); return { ok: false, signal: { kind: "authentication-required", detail: "google-rejected-token" } }; }
        const reason = await errorReason(response);
        if (response.status === 404) return { ok: false, signal: { kind: "not-found" } };
        if (response.status === 409 || response.status === 412) return { ok: false, signal: { kind: "conflict", detail: reason } };
        if (response.status === 410) return { ok: false, signal: { kind: "recovery-required", detail: "drive-change-cursor-invalid" } };
        if (quotaReason(reason)) return { ok: false, signal: { kind: "quota-exhausted", detail: reason } };
        if (response.status === 429 || rateReason(reason)) {
          const serverDelay = retryAfterMs(response, this.now());
          if (!retry || attempt + 1 >= this.policy.maxAttempts) return { ok: false, signal: { kind: "rate-limited", retryAfterMs: serverDelay } };
          await this.delay(attempt, serverDelay); continue;
        }
        if (response.status === 403) return { ok: false, signal: { kind: "permission-denied", detail: reason } };
        if (response.status >= 500) {
          if (!retry || attempt + 1 >= this.policy.maxAttempts) return { ok: false, signal: { kind: "transient-failure", detail: reason } };
          await this.delay(attempt, retryAfterMs(response, this.now())); continue;
        }
        return { ok: false, signal: { kind: "transient-failure", detail: reason } };
      }
      return { ok: false, signal: { kind: "transient-failure", detail: "retry-budget-exhausted" } };
    });
  }

  private async delay(attempt: number, minimum?: number): Promise<void> {
    const exponential = Math.min(this.policy.maxDelayMs, this.policy.baseDelayMs * 2 ** attempt);
    const jittered = exponential * (0.5 + this.random() * 0.5);
    await this.sleep(Math.max(minimum ?? 0, jittered));
  }
}

export const withRemoteId = (signal: DriveSignal, id: import("../contracts/common").RemoteObjectId): DriveSignal => signal.kind === "not-found" ? { ...signal, remoteObjectId: id } : signal;
