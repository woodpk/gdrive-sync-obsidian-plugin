import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";
import { runDelayedExternalBrowserProbe, runDirectExternalBrowserProbe, EXTERNAL_BROWSER_TEST_URL } from "../src/diagnostics/browser-probes";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = state; }
}
async function traceLogger() {
  const logger = new DiagnosticLogger({ persistence: new MemoryDiagnostics(), level: "trace", retentionLimit: 100, consoleMirror: false, platform: "mobile" });
  await logger.initialize();
  return logger;
}

test("direct external-browser probe is synchronous, fixed-destination, _external, and OAuth-independent", async () => {
  const logger = await traceLogger();
  const calls: unknown[][] = [];
  let returned = false;
  runDirectExternalBrowserProbe(logger, (...args) => { assert.equal(returned, false); calls.push(args); });
  returned = true;
  assert.deepEqual(calls, [[EXTERNAL_BROWSER_TEST_URL, "_external"]]);
  assert.deepEqual(logger.snapshot().map(event => event.event), [
    "direct-probe-button-pressed", "direct-probe-enter", "browser-launch-requested", "browser-launch-context",
    "browser-launch-invoke", "browser-launch-return", "direct-probe-exit",
  ]);
});

test("delayed external-browser probe crosses a controlled microtask before the same fixed _external launch", async () => {
  const logger = await traceLogger();
  const calls: unknown[][] = [];
  const pending = runDelayedExternalBrowserProbe(logger, (...args) => { calls.push(args); });
  assert.equal(calls.length, 0, "launch must not occur synchronously before the controlled Promise boundary");
  await pending;
  assert.deepEqual(calls, [[EXTERNAL_BROWSER_TEST_URL, "_external"]]);
  const events = logger.snapshot().map(event => event.event);
  assert.ok(events.indexOf("delayed-probe-async-boundary-enter") < events.indexOf("delayed-probe-async-boundary-exit"));
  assert.ok(events.indexOf("delayed-probe-async-boundary-exit") < events.indexOf("browser-launch-invoke"));
});

test("OAuth settings button establishes attempt ID before authenticate and the real path exposes required diagnostic boundaries", async () => {
  const root = join(__dirname, "..", "..");
  const [settingsSource, mainSource, runtimeSource, authSource, probeSource, launcherSource] = await Promise.all([
    readFile(join(root, "src", "product", "settings-tab.ts"), "utf8"),
    readFile(join(root, "src", "main.ts"), "utf8"),
    readFile(join(root, "src", "product", "runtime.ts"), "utf8"),
    readFile(join(root, "src", "drive", "auth.ts"), "utf8"),
    readFile(join(root, "src", "diagnostics", "browser-probes.ts"), "utf8"),
    readFile(join(root, "src", "drive", "oauth-return.ts"), "utf8"),
  ]);

  const buttonStart = settingsSource.indexOf("setButtonText(\"Authenticate\")");
  const buttonEnd = settingsSource.indexOf("BRAIN vault identity", buttonStart);
  const button = settingsSource.slice(buttonStart, buttonEnd);
  assert.ok(button.indexOf("authenticationButtonPressed()") >= 0);
  assert.ok(button.indexOf("authenticationButtonPressed()") < button.indexOf("authenticate(attemptId)"));

  for (const marker of [
    "authenticate-click-handler-enter", "plugin-authenticate-enter", "runtime-initialize-start", "runtime-initialize-complete",
    "runtime-authenticate-call-start", "runtime-authenticate-call-return", "callback-received", "callback-processing-start",
  ]) assert.match(mainSource, new RegExp(marker));
  for (const marker of ["initialize-enter", "oauth-boundary-create-enter", "oauth-boundary-create-exit", "runtime-initialized", "runtime-authenticate-enter", "runtime-authenticate-exit"]) {
    assert.match(runtimeSource, new RegExp(marker));
  }
  for (const marker of [
    "transaction-preparation-started", "pkce-state-generation-start", "pkce-verifier-generation-start", "pkce-sha256-start",
    "authorization-request-constructed", "transaction-preparation-completed",
  ]) assert.match(authSource, new RegExp(marker));

  assert.equal(REQUIRED_DRIVE_SCOPE, "https://www.googleapis.com/auth/drive.file");
  assert.match(mainSource, /Platform\.isMobileApp\s*\?\s*\{ openExternal: openAuthorizationInExternalBrowser \}\s*:\s*undefined/);
  assert.match(launcherSource, /launcher\(url, "_external"\)/);
  assert.doesNotMatch(launcherSource, /about:blank|ReservedAuthorizationWindow|AuthorizationWindowReservation|WindowProxy|location\.replace/);
  assert.doesNotMatch(`${mainSource}\n${runtimeSource}\n${authSource}\n${probeSource}`, /from ["'](?:node:|electron|fs|path|os)/);
  assert.doesNotMatch(probeSource, /beginAuthorization|clientSecret|pkce|oauthClient|GoogleOAuthSession/);
});

test("callback diagnostics record only presence/classification semantics and never callback values", async () => {
  const root = join(__dirname, "..", "..");
  const mainSource = await readFile(join(root, "src", "main.ts"), "utf8");
  const start = mainSource.indexOf("private async completeGoogleAuthorizationWithDiagnostics");
  const end = mainSource.indexOf("private async createManagedRemote", start);
  const callback = mainSource.slice(start, end);
  assert.match(callback, /codePresent: Boolean\(input\.code\)/);
  assert.match(callback, /statePresent: Boolean\(input\.state\)/);
  assert.match(callback, /errorPresent: Boolean\(input\.error\)/);
  assert.doesNotMatch(callback, /safeMessage:\s*input\.(?:code|state)|JSON\.stringify\(input\)/);
});
