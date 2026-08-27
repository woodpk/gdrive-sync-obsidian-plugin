import assert from "node:assert/strict";
import test from "node:test";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import {
  DiagnosticLogger,
  type DiagnosticLogLevel,
  type DiagnosticPersistence,
  type DiagnosticStoreState,
} from "../src/diagnostics/diagnostic-logger";
import { instrumentAuthorizationBrowserLauncher } from "../src/diagnostics/oauth-diagnostics";

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

async function loggerAt(level: DiagnosticLogLevel, options: { consoleMirror?: boolean; consoleSink?: (line: string) => void; retentionLimit?: number } = {}) {
  const persistence = new MemoryDiagnostics();
  let wall = 0;
  let mono = 0;
  const logger = new DiagnosticLogger({
    persistence,
    level,
    retentionLimit: options.retentionLimit ?? 100,
    consoleMirror: options.consoleMirror ?? false,
    platform: "mobile",
    now: () => new Date(1_700_000_000_000 + wall++),
    monotonicNow: () => mono++,
    consoleSink: options.consoleSink,
  });
  await logger.initialize();
  return { logger, persistence };
}

const levels: readonly [DiagnosticLogLevel, readonly string[]][] = [
  ["off", []],
  ["error", ["error"]],
  ["warn", ["error", "warn"]],
  ["info", ["error", "warn", "info"]],
  ["debug", ["error", "warn", "info", "debug"]],
  ["trace", ["error", "warn", "info", "debug", "trace"]],
];

for (const [configured, expected] of levels) {
  test(`diagnostic logger level ${configured} retains the required severity/detail prefix`, async () => {
    const { logger } = await loggerAt(configured);
    logger.error("diagnostics", "error-event");
    logger.warn("diagnostics", "warn-event");
    logger.info("diagnostics", "info-event");
    logger.debug("diagnostics", "debug-event");
    logger.trace("diagnostics", "trace-event");
    assert.deepEqual(logger.snapshot().map(event => event.level), expected);
  });
}

test("diagnostic logger sequence is monotonic and bounded retention drops oldest while keeping newest", async () => {
  const { logger } = await loggerAt("trace", { retentionLimit: 100 });
  for (let index = 0; index < 105; index++) logger.info("diagnostics", `event-${index}`);
  const snapshot = logger.snapshot();
  assert.equal(snapshot.length, 100);
  assert.equal(snapshot[0]?.sequence, 6);
  assert.equal(snapshot.at(-1)?.sequence, 105);
  for (let index = 1; index < snapshot.length; index++) assert.ok(snapshot[index]!.sequence > snapshot[index - 1]!.sequence);
});

test("diagnostic clear removes records without resetting sequence or attempt identity", async () => {
  const { logger } = await loggerAt("trace");
  const firstAttempt = logger.beginAttempt("test");
  logger.info("diagnostics", "before-clear");
  const priorSequence = logger.snapshot().at(-1)!.sequence;
  logger.clear();
  assert.equal(logger.summary().count, 0);
  const secondAttempt = logger.beginAttempt("test");
  logger.info("diagnostics", "after-clear");
  assert.equal(secondAttempt, firstAttempt + 1);
  assert.ok(logger.snapshot()[0]!.sequence > priorSequence);
});

test("diagnostic export is deterministic JSON-lines in authoritative sequence order", async () => {
  const { logger } = await loggerAt("trace");
  logger.info("diagnostics", "second", { result: "ok", count: 2 });
  logger.debug("diagnostics", "third", { enabled: true, retentionLimit: 100 });
  const first = logger.renderText();
  const second = logger.renderText();
  assert.equal(first, second);
  const parsed = first.split("\n").map(line => JSON.parse(line) as { sequence: number });
  assert.deepEqual(parsed.map(item => item.sequence), [1, 2]);
});

test("console mirroring follows current level and mirrors only the same sanitized rendered record", async () => {
  const lines: string[] = [];
  const { logger } = await loggerAt("warn", { consoleMirror: true, consoleSink: line => lines.push(line) });
  logger.info("diagnostics", "not-retained", { safeMessage: "access_token=SENTINEL_ACCESS" });
  logger.warn("diagnostics", "retained", { safeMessage: "refresh_token=SENTINEL_REFRESH" });
  assert.equal(lines.length, 1);
  assert.equal(lines[0], logger.renderText());
  assert.doesNotMatch(lines[0]!, /SENTINEL_ACCESS|SENTINEL_REFRESH/);
});

test("diagnostic field allowlist and sanitization prevent representative OAuth secrets from reaching export", async () => {
  const { logger } = await loggerAt("trace");
  logger.info("diagnostics", "secret-boundary", {
    safeMessage: "client_secret=SENTINEL_SECRET access_token=SENTINEL_ACCESS refresh_token=SENTINEL_REFRESH authorization_code=SENTINEL_CODE oauth_state=SENTINEL_STATE pkce_verifier=SENTINEL_VERIFIER pkce_challenge=SENTINEL_CHALLENGE https://accounts.google.com/o/oauth2/v2/auth?state=SENTINEL_URL_STATE&code=SENTINEL_URL_CODE",
    clientSecretConfigured: true,
  });
  logger.info("diagnostics", "unknown-field-boundary", {
    accessToken: "SENTINEL_UNKNOWN_ACCESS",
    fullAuthorizationUrl: "https://accounts.example/?code=SENTINEL_UNKNOWN_CODE",
  } as never);
  const exported = logger.renderText();
  for (const sentinel of [
    "SENTINEL_SECRET", "SENTINEL_ACCESS", "SENTINEL_REFRESH", "SENTINEL_CODE", "SENTINEL_STATE",
    "SENTINEL_VERIFIER", "SENTINEL_CHALLENGE", "SENTINEL_URL_STATE", "SENTINEL_URL_CODE",
    "SENTINEL_UNKNOWN_ACCESS", "SENTINEL_UNKNOWN_CODE",
  ]) assert.equal(exported.includes(sentinel), false, `${sentinel} must be absent`);
  assert.match(exported, /clientSecretConfigured/);
});

async function representativeOAuth(level: DiagnosticLogLevel) {
  const { logger } = await loggerAt(level);
  const attempt = logger.beginAttempt("test");
  const secrets = new Map<string, string>();
  const oauth = new GoogleOAuthSession(
    { clientId: "configured-client", redirectUri: "https://callback.example/" },
    new ObsidianSecretStore({
      getSecret: id => secrets.get(id) ?? null,
      setSecret: (id, value) => { secrets.set(id, value); },
    }),
    async () => new Response("{}", { status: 500 }),
  );
  oauth.setDiagnosticLogger(logger);
  const request = await oauth.beginAuthorization();
  const browser = instrumentAuthorizationBrowserLauncher(logger, { openExternal() {} }, {
    target: "_external",
    launcher: "external-browser",
    browserApiPresent: true,
  });
  await browser.openExternal(request.url);
  logger.endAttempt(attempt);
  return logger.snapshot();
}

test("Info < Debug < Trace by internal decision visibility and execution granularity, not duplicate labels", async () => {
  const info = await representativeOAuth("info");
  const debug = await representativeOAuth("debug");
  const trace = await representativeOAuth("trace");

  assert.ok(info.some(event => event.event === "authentication-attempt-started"));
  assert.ok(info.some(event => event.event === "browser-launch-requested"));
  assert.equal(info.some(event => event.event === "transaction-preparation-completed"), false);

  const debugContext = debug.find(event => event.event === "transaction-preparation-completed");
  assert.equal(debugContext?.fields?.transactionPrepared, true);
  assert.equal(debugContext?.fields?.clientIdConfigured, true);
  assert.ok(debug.some(event => event.event === "browser-launch-context"));
  assert.equal(debug.some(event => event.event === "pkce-sha256-start"), false);

  assert.ok(trace.some(event => event.event === "pkce-state-generation-start"));
  assert.ok(trace.some(event => event.event === "pkce-verifier-generation-complete"));
  assert.ok(trace.some(event => event.event === "pkce-sha256-start"));
  assert.ok(trace.some(event => event.event === "authorization-request-constructed"));
  assert.ok(trace.some(event => event.event === "browser-launch-invoke"));
  assert.ok(trace.some(event => event.event === "browser-launch-return"));
  assert.ok(trace.length > debug.length && debug.length > info.length);
});

test("rich Error records preserve safe diagnosis fields at Error-only detail", async () => {
  const { logger } = await loggerAt("error");
  const attempt = logger.beginAttempt("test");
  logger.failure("oauth.browser", "browser-launch-throw", new Error("https://accounts.example/?code=SENTINEL_CODE"), {
    operation: "external-browser-launch",
    stage: "launcher-call",
    classification: "browser-launch-failure",
    runtimeInitialized: true,
    retryable: true,
    recoveryIntended: false,
  }, attempt);
  const event = logger.snapshot()[0]!;
  assert.equal(event.level, "error");
  assert.equal(event.attemptId, attempt);
  assert.equal(event.fields?.stage, "launcher-call");
  assert.equal(event.fields?.classification, "browser-launch-failure");
  assert.equal(event.fields?.runtimeInitialized, true);
  assert.equal(event.fields?.retryable, true);
  assert.doesNotMatch(logger.renderText(), /SENTINEL_CODE/);
});
