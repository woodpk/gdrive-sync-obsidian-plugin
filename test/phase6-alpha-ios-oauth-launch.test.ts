import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";
import type { GoogleOAuthSession } from "../src/drive/auth";
import {
  beginGoogleAuthorization,
  openAuthorizationInExternalBrowser,
  openAuthorizationInSystemBrowser,
} from "../src/drive/oauth-return";

const finalAuthorizationUrl = "https://accounts.example/authorize?request=final";

test("iOS OAuth launch: final authorization URL is handed directly to Obsidian's external-browser target", () => {
  const calls: unknown[][] = [];
  const unusedReturn = new Proxy({}, {
    get() { throw new Error("launcher return value must not be inspected"); },
    set() { throw new Error("launcher return value must not be mutated"); },
  });

  assert.doesNotThrow(() => openAuthorizationInExternalBrowser(finalAuthorizationUrl, (...args) => {
    calls.push(args);
    return unusedReturn;
  }));

  assert.deepEqual(calls, [[finalAuthorizationUrl, "_external"]]);
  assert.notEqual(calls[0]?.[0], "about:blank");
});

test("iOS OAuth launch: unavailable external-browser capability fails clearly", () => {
  const previousOpen = globalThis.open;
  Object.defineProperty(globalThis, "open", { value: undefined, configurable: true, writable: true });
  try {
    assert.throws(
      () => openAuthorizationInExternalBrowser(finalAuthorizationUrl),
      /external browser could not be opened.*no browser launch mechanism is available/i,
    );
  } finally {
    Object.defineProperty(globalThis, "open", { value: previousOpen, configurable: true, writable: true });
  }
});

test("iOS OAuth launch: exactly one prepared transaction launches its final URL exactly once", async () => {
  const order: string[] = [];
  let transactionCount = 0;
  let launchCount = 0;
  const oauth = {
    async beginAuthorization() {
      transactionCount++;
      order.push("transaction-ready");
      return { url: finalAuthorizationUrl, state: "state-safe", expiresAtMs: 1234 };
    },
  } as unknown as GoogleOAuthSession;

  const result = await beginGoogleAuthorization(oauth, {
    openExternal(url: string): void {
      launchCount++;
      assert.equal(url, finalAuthorizationUrl);
      order.push("external-launch");
    },
  });

  assert.deepEqual(order, ["transaction-ready", "external-launch"]);
  assert.equal(transactionCount, 1);
  assert.equal(launchCount, 1);
  assert.deepEqual(result, { state: "state-safe", expiresAtMs: 1234 });
});

test("iOS OAuth launch: preparation and synchronous or asynchronous launcher failures propagate", async () => {
  const preparationFailure = new Error("preparation-failed");
  let launchCount = 0;
  const failingOAuth = {
    async beginAuthorization() { throw preparationFailure; },
  } as unknown as GoogleOAuthSession;
  await assert.rejects(
    () => beginGoogleAuthorization(failingOAuth, { openExternal() { launchCount++; } }),
    error => error === preparationFailure,
  );
  assert.equal(launchCount, 0);

  const readyOAuth = {
    async beginAuthorization() {
      return { url: finalAuthorizationUrl, state: "state-safe", expiresAtMs: 1234 };
    },
  } as unknown as GoogleOAuthSession;
  const synchronousFailure = new Error("synchronous-launch-failed");
  await assert.rejects(
    () => beginGoogleAuthorization(readyOAuth, { openExternal() { throw synchronousFailure; } }),
    error => error === synchronousFailure,
  );

  const asynchronousFailure = new Error("asynchronous-launch-failed");
  await assert.rejects(
    () => beginGoogleAuthorization(readyOAuth, { async openExternal() { throw asynchronousFailure; } }),
    error => error === asynchronousFailure,
  );
});

test("iOS OAuth launch: mobile selects _external while desktop retains its validated direct launcher", async () => {
  const desktopCalls: unknown[][] = [];
  openAuthorizationInSystemBrowser(finalAuthorizationUrl, (...args) => { desktopCalls.push(args); });
  assert.deepEqual(desktopCalls, [[finalAuthorizationUrl, "_blank", "noopener,noreferrer"]]);

  const root = join(__dirname, "..", "..");
  const [launcherSource, mainSource, runtimeSource] = await Promise.all([
    readFile(join(root, "src", "drive", "oauth-return.ts"), "utf8"),
    readFile(join(root, "src", "main.ts"), "utf8"),
    readFile(join(root, "src", "product", "runtime.ts"), "utf8"),
  ]);
  const authenticateStart = mainSource.indexOf("private async authenticate(): Promise<void>");
  const authenticateEnd = mainSource.indexOf("private async createManagedRemote", authenticateStart);
  const authenticateSource = mainSource.slice(authenticateStart, authenticateEnd);

  assert.match(authenticateSource, /Platform\.isMobileApp\s*\?\s*\{ openExternal: openAuthorizationInExternalBrowser \}\s*:\s*undefined/);
  assert.match(runtimeSource, /authenticate\(browser: AuthorizationBrowserLauncher = \{ openExternal: openAuthorizationInSystemBrowser \}\)/);
  assert.match(launcherSource, /launcher\(url, "_external"\)/);
  assert.doesNotMatch(launcherSource, /about:blank|ReservedAuthorizationWindow|AuthorizationWindowReservation|WindowProxy|location\.replace/);
  assert.equal(REQUIRED_DRIVE_SCOPE, "https://www.googleapis.com/auth/drive.file");
  assert.doesNotMatch(`${launcherSource}\n${mainSource}\n${runtimeSource}`, /from ["'](?:node:|electron|fs|path|os)/);
});
