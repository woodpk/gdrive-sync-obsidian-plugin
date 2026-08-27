import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import type { GoogleOAuthSession } from "../src/drive/auth";
import {
  beginGoogleAuthorization,
  reserveAuthorizationInSystemBrowser,
  type ReservedAuthorizationWindow,
} from "../src/drive/oauth-return";

function reservationHarness(options: { readonly replaceFailure?: Error } = {}) {
  const events: string[] = [];
  let opener: unknown = { plugin: true };
  const reserved: ReservedAuthorizationWindow = {
    get opener() { return opener; },
    set opener(value: unknown) { opener = value; },
    location: {
      replace(url: string): void {
        events.push(`navigate:${url}`);
        if (options.replaceFailure) throw options.replaceFailure;
      },
    },
    close(): void { events.push("close"); },
  };
  return { events, reserved, opener: () => opener };
}

test("iOS OAuth launch: mobile reservation opens synchronously and navigates the same window once", async () => {
  const harness = reservationHarness();
  const openCalls: string[][] = [];

  const browser = reserveAuthorizationInSystemBrowser((url, target) => {
    openCalls.push([url, target]);
    harness.events.push("reserve");
    return harness.reserved;
  });

  assert.deepEqual(openCalls, [["about:blank", "_blank"]]);
  assert.equal(harness.opener(), null);
  assert.deepEqual(harness.events, ["reserve"]);

  await browser.openExternal("https://accounts.example/authorize");
  assert.deepEqual(harness.events, ["reserve", "navigate:https://accounts.example/authorize"]);
  assert.throws(() => browser.openExternal("https://accounts.example/again"), /already been used/);
  browser.cancel?.();
  assert.deepEqual(harness.events, ["reserve", "navigate:https://accounts.example/authorize"]);
});

test("iOS OAuth launch: a blocked or absent reservation fails with a clear launch error", () => {
  assert.throws(
    () => reserveAuthorizationInSystemBrowser(() => null),
    /blocked the authorization window/,
  );
});

test("iOS OAuth launch: PKCE transaction preparation completes before exactly one browser navigation", async () => {
  const order: string[] = [];
  let beginCalls = 0;
  const oauth = {
    async beginAuthorization() {
      beginCalls++;
      order.push("transaction-ready");
      return { url: "https://accounts.example/authorize", state: "state-safe", expiresAtMs: 1234 };
    },
  } as unknown as GoogleOAuthSession;

  const result = await beginGoogleAuthorization(oauth, {
    openExternal(url: string): void {
      assert.equal(url, "https://accounts.example/authorize");
      order.push("navigate");
    },
  });

  assert.deepEqual(order, ["transaction-ready", "navigate"]);
  assert.equal(beginCalls, 1);
  assert.deepEqual(result, { state: "state-safe", expiresAtMs: 1234 });
});

test("iOS OAuth launch: asynchronous preparation and navigation failures propagate and close the reservation", async () => {
  const preparation = reservationHarness();
  const preparationBrowser = reserveAuthorizationInSystemBrowser(() => preparation.reserved);
  const preparationFailure = new Error("preparation-failed");
  const failingOAuth = {
    async beginAuthorization() { throw preparationFailure; },
  } as unknown as GoogleOAuthSession;

  await assert.rejects(() => beginGoogleAuthorization(failingOAuth, preparationBrowser), error => error === preparationFailure);
  assert.deepEqual(preparation.events, ["close"]);

  const navigationFailure = new Error("navigation-failed");
  const navigation = reservationHarness({ replaceFailure: navigationFailure });
  const navigationBrowser = reserveAuthorizationInSystemBrowser(() => navigation.reserved);
  const readyOAuth = {
    async beginAuthorization() {
      return { url: "https://accounts.example/authorize", state: "state-safe", expiresAtMs: 1234 };
    },
  } as unknown as GoogleOAuthSession;

  await assert.rejects(() => beginGoogleAuthorization(readyOAuth, navigationBrowser), error => error === navigationFailure);
  assert.deepEqual(navigation.events, ["navigate:https://accounts.example/authorize", "close"]);

  const asynchronousFailure = new Error("asynchronous-launch-failed");
  let cancellations = 0;
  await assert.rejects(
    () => beginGoogleAuthorization(readyOAuth, {
      async openExternal() { throw asynchronousFailure; },
      cancel() { cancellations++; },
    }),
    error => error === asynchronousFailure,
  );
  assert.equal(cancellations, 1);
});

test("iOS OAuth launch: plugin reserves only on mobile before its first await while desktop keeps direct launch", async () => {
  const root = join(__dirname, "..", "..");
  const [mainSource, runtimeSource] = await Promise.all([
    readFile(join(root, "src", "main.ts"), "utf8"),
    readFile(join(root, "src", "product", "runtime.ts"), "utf8"),
  ]);
  const authenticateStart = mainSource.indexOf("private async authenticate(): Promise<void>");
  const authenticateEnd = mainSource.indexOf("private async createManagedRemote", authenticateStart);
  const authenticateSource = mainSource.slice(authenticateStart, authenticateEnd);
  const reserveIndex = authenticateSource.indexOf("Platform.isMobileApp ? reserveAuthorizationInSystemBrowser() : undefined");
  const firstAwaitIndex = authenticateSource.indexOf("await this.runtime?.initialize()");

  assert.ok(reserveIndex >= 0);
  assert.ok(firstAwaitIndex > reserveIndex);
  assert.match(runtimeSource, /authenticate\(browser: AuthorizationBrowserLauncher = \{ openExternal: openAuthorizationInSystemBrowser \}\)/);
  assert.doesNotMatch(`${mainSource}\n${runtimeSource}`, /from ["'](?:node:|electron|fs|path|os)/);
});
