import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";
import {
  DiagnosticLogger,
  type DiagnosticPersistence,
  type DiagnosticStoreState,
} from "../src/diagnostics/diagnostic-logger";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleHttpTransport } from "../src/drive/transport";

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string) { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string) { this.values.set(id, value); }
  deleteSecret(id: string) { this.values.delete(id); }
}

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

function session(fetcher: typeof fetch = fetch): GoogleOAuthSession {
  const backing = new MemorySecrets();
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "access-authority",
    refreshToken: "refresh-authority",
    expiresAtMs: Date.now() + 3_600_000,
    tokenType: "Bearer",
    scope: REQUIRED_DRIVE_SCOPE,
  }));
  return new GoogleOAuthSession(
    { clientId: "configured-client", redirectUri: "https://callback.example/" },
    new ObsidianSecretStore(backing),
    fetcher,
  );
}

async function diagnosticLogger(options: { consoleMirror?: boolean; consoleSink?: (line: string) => void } = {}) {
  const persistence = new MemoryDiagnostics();
  let wall = 0;
  const logger = new DiagnosticLogger({
    persistence,
    level: "trace",
    retentionLimit: 500,
    consoleMirror: options.consoleMirror ?? false,
    platform: "mobile",
    now: () => new Date(1_700_000_000_000 + wall++),
    monotonicNow: () => wall,
    consoleSink: options.consoleSink,
  });
  await logger.initialize();
  return logger;
}

function driveEvents(logger: DiagnosticLogger) {
  return logger.snapshot().filter(event => event.component === "drive.http");
}

const policy = { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, maxConcurrency: 2 } as const;

function responseWithReason(status: number, reason: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: { errors: [{ reason }] } }), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("LOG-02 success trace has one stable request identity, run correlation, status, provider ID, and bounded latency", async () => {
  const logger = await diagnosticLogger();
  const runId = logger.beginSyncRun("log02-test");
  let mono = 0;
  const transport = new GoogleHttpTransport(
    session(),
    async () => new Response("{}", { status: 200, headers: { "x-goog-request-id": "provider-request-123" } }),
    policy,
    async () => undefined,
    () => 0,
    () => 0,
    logger,
    () => { mono += 5; return mono; },
  );

  const result = await transport.request("https://www.googleapis.com/drive/v3/files/remote-object-SECRET?fields=id,name", { method: "GET" });
  assert.equal(result.ok, true);

  const events = driveEvents(logger);
  assert.deepEqual(events.map(event => event.event), [
    "google-http-request-started",
    "google-http-attempt-started",
    "google-http-response-received",
    "google-http-request-succeeded",
  ]);
  const requestIds = new Set(events.map(event => event.fields?.requestId));
  assert.equal(requestIds.size, 1);
  assert.equal(typeof [...requestIds][0], "string");
  assert.ok(events.every(event => event.runId === runId));
  const success = events.at(-1)!;
  assert.equal(success.fields?.method, "GET");
  assert.equal(success.fields?.endpointClass, "drive.files.get");
  assert.equal(success.fields?.httpStatus, 200);
  assert.equal(success.fields?.attemptNumber, 1);
  assert.equal(success.fields?.maxAttempts, 3);
  assert.equal(success.fields?.replaySafe, true);
  assert.equal(success.fields?.providerRequestId, "provider-request-123");
  assert.equal(success.fields?.result, "success");
  assert.equal(typeof success.fields?.latencyMs, "number");
  assert.doesNotMatch(logger.renderText(), /remote-object-SECRET|fields=id,name/);
});

test("LOG-02 safe endpoint classes cover repository Drive transport shapes without retaining identifiers or query values", async () => {
  const logger = await diagnosticLogger();
  const transport = new GoogleHttpTransport(session(), async () => new Response("{}", { status: 200 }), policy, async () => undefined, () => 0, () => 0, logger, () => 1);
  const cases: ReadonlyArray<{ url: string; method: string; expected: string }> = [
    { url: "https://www.googleapis.com/drive/v3/about?fields=user(SECRET)", method: "GET", expected: "drive.about" },
    { url: "https://www.googleapis.com/drive/v3/files/SECRET_OBJECT?fields=id", method: "GET", expected: "drive.files.get" },
    { url: "https://www.googleapis.com/drive/v3/files/SECRET_OBJECT?alt=media", method: "GET", expected: "drive.files.download" },
    { url: "https://www.googleapis.com/drive/v3/files?q=SECRET_QUERY", method: "GET", expected: "drive.files.list" },
    { url: "https://www.googleapis.com/drive/v3/files?fields=SECRET_QUERY", method: "POST", expected: "drive.files.create" },
    { url: "https://www.googleapis.com/drive/v3/files/SECRET_OBJECT?fields=SECRET_QUERY", method: "PATCH", expected: "drive.files.patch" },
    { url: "https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=SECRET", method: "GET", expected: "drive.files.generate-ids" },
    { url: "https://www.googleapis.com/drive/v3/changes?pageToken=SECRET_CURSOR", method: "GET", expected: "drive.changes" },
    { url: "https://www.googleapis.com/drive/v3/changes/startPageToken?supportsAllDrives=false", method: "GET", expected: "drive.changes" },
    { url: "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=SECRET", method: "POST", expected: "drive.upload.resumable-session" },
    { url: "https://www.googleapis.com/upload/drive/v3/files/SECRET_OBJECT?uploadType=resumable&fields=SECRET", method: "PATCH", expected: "drive.upload.resumable-session" },
    { url: "https://www.googleapis.com/upload/drive/v3/files/SECRET_OBJECT?uploadType=resumable&upload_id=SECRET_UPLOAD", method: "PUT", expected: "drive.upload.resumable" },
    { url: "https://www.googleapis.com/drive/v3/unknown/SECRET_OBJECT?token=SECRET_QUERY", method: "GET", expected: "drive.unrecognized" },
  ];

  for (const item of cases) {
    const before = driveEvents(logger).length;
    const result = await transport.request(item.url, { method: item.method });
    assert.equal(result.ok, true);
    const started = driveEvents(logger).slice(before).find(event => event.event === "google-http-request-started");
    assert.equal(started?.fields?.endpointClass, item.expected);
    assert.equal(started?.fields?.method, item.method);
  }

  const rendered = logger.renderText();
  for (const sentinel of ["SECRET_OBJECT", "SECRET_QUERY", "SECRET_CURSOR", "SECRET_UPLOAD", "user(SECRET)"]) {
    assert.equal(rendered.includes(sentinel), false, `${sentinel} must not enter diagnostics`);
  }
});

test("LOG-02 retries 5xx and network failures with one requestId, increasing attempts, and unchanged computed delays", async () => {
  const logger = await diagnosticLogger();
  const sleeps: number[] = [];
  let calls = 0;
  let mono = 0;
  const transport = new GoogleHttpTransport(
    session(),
    async () => {
      calls++;
      if (calls === 1) return responseWithReason(503, "backendError");
      if (calls === 2) throw new TypeError("network failure with https://secret.example/?access_token=SENTINEL");
      return new Response("{}", { status: 200 });
    },
    policy,
    async ms => { sleeps.push(ms); },
    () => 0,
    () => 0,
    logger,
    () => ++mono,
  );

  const result = await transport.request("https://www.googleapis.com/drive/v3/files/remote-id", { method: "GET" });
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [5, 10]);

  const events = driveEvents(logger);
  const requestIds = new Set(events.map(event => event.fields?.requestId));
  assert.equal(requestIds.size, 1);
  assert.deepEqual(events.filter(event => event.event === "google-http-attempt-started").map(event => event.fields?.attemptNumber), [1, 2, 3]);
  assert.deepEqual(events.filter(event => event.event === "google-http-retry-scheduled").map(event => event.fields?.retryDelayMs), [5, 10]);
  assert.ok(events.some(event => event.event === "google-http-network-failure" && event.fields?.classification === "network-exception"));
  assert.doesNotMatch(logger.renderText(), /SENTINEL|secret\.example/);
});

test("LOG-02 preserves Retry-After timing and records the exact chosen retry delay", async () => {
  const logger = await diagnosticLogger();
  const sleeps: number[] = [];
  let calls = 0;
  const transport = new GoogleHttpTransport(
    session(),
    async () => ++calls === 1
      ? responseWithReason(429, "rateLimitExceeded", { "retry-after": "2" })
      : new Response("{}", { status: 200 }),
    policy,
    async ms => { sleeps.push(ms); },
    () => 0,
    () => 0,
    logger,
    () => 1,
  );

  const result = await transport.request("https://www.googleapis.com/drive/v3/files?q=safe", { method: "GET" });
  assert.equal(result.ok, true);
  assert.deepEqual(sleeps, [2000]);
  const retry = driveEvents(logger).find(event => event.event === "google-http-retry-scheduled");
  assert.equal(retry?.fields?.classification, "rate-limited");
  assert.equal(retry?.fields?.retryDecision, "retry-after-backoff");
  assert.equal(retry?.fields?.retryDelayMs, 2000);
  assert.equal(retry?.fields?.httpStatus, 429);
});

test("LOG-02 observes 401 access-token invalidation and safe replay without disclosing token material", async () => {
  const logger = await diagnosticLogger();
  const backing = new MemorySecrets();
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "SENTINEL_REJECTED_ACCESS",
    refreshToken: "SENTINEL_REFRESH_AUTHORITY",
    expiresAtMs: Date.now() + 3_600_000,
    tokenType: "Bearer",
    scope: REQUIRED_DRIVE_SCOPE,
  }));
  let refreshCalls = 0;
  const oauth = new GoogleOAuthSession(
    { clientId: "configured-client", redirectUri: "https://callback.example/" },
    new ObsidianSecretStore(backing),
    async () => {
      refreshCalls++;
      return new Response(JSON.stringify({
        access_token: "SENTINEL_FRESH_ACCESS",
        expires_in: 3600,
        token_type: "Bearer",
        scope: REQUIRED_DRIVE_SCOPE,
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  );
  let driveCalls = 0;
  const transport = new GoogleHttpTransport(
    oauth,
    async () => ++driveCalls === 1 ? new Response("", { status: 401 }) : new Response("{}", { status: 200 }),
    policy,
    async () => undefined,
    () => 0,
    () => 0,
    logger,
    () => 1,
  );

  const result = await transport.request("https://www.googleapis.com/drive/v3/files/object-id", { method: "GET" });
  assert.equal(result.ok, true);
  assert.equal(driveCalls, 2);
  assert.equal(refreshCalls, 1);
  const retry = driveEvents(logger).find(event => event.event === "google-http-retry-scheduled");
  assert.equal(retry?.fields?.classification, "authentication-rejected");
  assert.equal(retry?.fields?.retryDecision, "retry-after-token-invalidation");
  assert.equal(retry?.fields?.retryDelayMs, 0);
  const rendered = logger.renderText();
  for (const sentinel of ["SENTINEL_REJECTED_ACCESS", "SENTINEL_REFRESH_AUTHORITY", "SENTINEL_FRESH_ACCESS"]) assert.equal(rendered.includes(sentinel), false);
});

test("LOG-02 exposes existing terminal Drive classifications without changing returned signals", async () => {
  const cases: ReadonlyArray<{ status: number; reason: string; signal: string; classification: string }> = [
    { status: 404, reason: "notFound", signal: "not-found", classification: "not-found" },
    { status: 409, reason: "conflict", signal: "conflict", classification: "conflict" },
    { status: 412, reason: "conditionNotMet", signal: "conflict", classification: "conflict" },
    { status: 410, reason: "gone", signal: "recovery-required", classification: "recovery-required" },
    { status: 403, reason: "storageQuotaExceeded", signal: "quota-exhausted", classification: "quota-exhausted" },
    { status: 403, reason: "insufficientPermissions", signal: "permission-denied", classification: "permission-denied" },
    { status: 429, reason: "rateLimitExceeded", signal: "rate-limited", classification: "rate-limited" },
    { status: 503, reason: "backendError", signal: "transient-failure", classification: "transient-http-failure" },
    { status: 400, reason: "badRequest", signal: "transient-failure", classification: "http-failure" },
  ];

  for (const item of cases) {
    const logger = await diagnosticLogger();
    const transport = new GoogleHttpTransport(
      session(),
      async () => responseWithReason(item.status, item.reason),
      { ...policy, maxAttempts: 1 },
      async () => undefined,
      () => 0,
      () => 0,
      logger,
      () => 1,
    );
    const result = await transport.request("https://www.googleapis.com/drive/v3/files/object-id", { method: "GET" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.signal.kind, item.signal);
    const failed = driveEvents(logger).find(event => event.event === "google-http-request-failed");
    assert.equal(failed?.fields?.driveSignal, item.signal);
    assert.equal(failed?.fields?.classification, item.classification);
    assert.equal(failed?.fields?.httpStatus, item.status);
    if (item.status === 429 || item.status >= 500) assert.equal(failed?.fields?.retryDecision, "retry-budget-exhausted");
  }
});

test("LOG-02 preserves non-replay-safe POST behavior and records that automatic replay was refused", async () => {
  const logger = await diagnosticLogger();
  let calls = 0;
  const sleeps: number[] = [];
  const transport = new GoogleHttpTransport(
    session(),
    async () => { calls++; throw new TypeError("response lost after create"); },
    { ...policy, maxAttempts: 5 },
    async ms => { sleeps.push(ms); },
    () => 0,
    () => 0,
    logger,
    () => 1,
  );
  const result = await transport.request("https://www.googleapis.com/drive/v3/files", { method: "POST", body: "{}" });
  assert.equal(result.ok, false);
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
  const failed = driveEvents(logger).find(event => event.event === "google-http-request-failed");
  assert.equal(failed?.fields?.replaySafe, false);
  assert.equal(failed?.fields?.retryDecision, "not-replay-safe");
});

test("LOG-02 excludes raw URL/query, authorization and arbitrary headers, bodies, and token-like provider values", async () => {
  const logger = await diagnosticLogger();
  const transport = new GoogleHttpTransport(
    session(),
    async (_url, init) => {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer access-authority");
      return responseWithReason(409, "SENTINEL_RESPONSE_BODY", {
        "x-goog-request-id": "access_token=SENTINEL_PROVIDER_TOKEN",
        "x-private-response": "SENTINEL_RESPONSE_HEADER",
      });
    },
    policy,
    async () => undefined,
    () => 0,
    () => 0,
    logger,
    () => 1,
  );
  const result = await transport.request(
    "https://www.googleapis.com/drive/v3/files/SENTINEL_OBJECT_ID?fields=SENTINEL_QUERY&access_token=SENTINEL_URL_TOKEN",
    {
      method: "PATCH",
      headers: {
        authorization: "Bearer SENTINEL_CALLER_AUTH",
        "x-private-request": "SENTINEL_REQUEST_HEADER",
      },
      body: "SENTINEL_REQUEST_BODY",
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.signal.kind, "conflict");
    assert.equal(result.signal.detail, "SENTINEL_RESPONSE_BODY");
  }

  const rendered = logger.renderText();
  for (const sentinel of [
    "SENTINEL_OBJECT_ID",
    "SENTINEL_QUERY",
    "SENTINEL_URL_TOKEN",
    "SENTINEL_CALLER_AUTH",
    "SENTINEL_REQUEST_HEADER",
    "SENTINEL_REQUEST_BODY",
    "SENTINEL_RESPONSE_BODY",
    "SENTINEL_RESPONSE_HEADER",
    "SENTINEL_PROVIDER_TOKEN",
  ]) assert.equal(rendered.includes(sentinel), false, `${sentinel} must be absent from diagnostics`);
  const response = driveEvents(logger).find(event => event.event === "google-http-response-received");
  assert.equal(response?.fields?.providerRequestId, "access_token=[redacted]");
  assert.equal(response?.fields?.endpointClass, "drive.files.patch");
});

test("LOG-02 diagnostic sink failure is non-authoritative and cannot change transport success", async () => {
  const logger = await diagnosticLogger({
    consoleMirror: true,
    consoleSink: () => { throw new Error("diagnostic sink unavailable"); },
  });
  let calls = 0;
  const transport = new GoogleHttpTransport(
    session(),
    async () => { calls++; return new Response("{}", { status: 200 }); },
    policy,
    async () => undefined,
    () => 0,
    () => 0,
    logger,
    () => 1,
  );
  const result = await transport.request("https://www.googleapis.com/drive/v3/about", { method: "GET" });
  assert.equal(result.ok, true);
  assert.equal(calls, 1);
});
