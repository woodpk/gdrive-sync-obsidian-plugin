import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import type { OAuthCallbackInput, OAuthCompletion } from "../src/drive/auth";
import { OBSIDIAN_OAUTH_ACTION, registerGoogleOAuthReturn, type ObsidianProtocolRegistrar } from "../src/drive/oauth-return";
import { DEFAULT_SETTINGS, type BrainSyncSettings } from "../src/product/plugin-data";

class CapturingRegistrar implements ObsidianProtocolRegistrar {
  registrations = 0;
  handler?: (params: Record<string, string>) => void | Promise<void>;

  registerObsidianProtocolHandler(action: string, handler: (params: Record<string, string>) => void | Promise<void>): void {
    assert.equal(action, OBSIDIAN_OAUTH_ACTION);
    this.registrations++;
    if (this.handler) throw new Error(`duplicate registration: ${action}`);
    this.handler = handler;
  }

  async fire(params: Record<string, string>): Promise<void> {
    assert.ok(this.handler);
    await this.handler(params);
  }
}

async function loadRuntimeClass() {
  const shimDir = join(".test-build", "node_modules", "obsidian");
  await mkdir(shimDir, { recursive: true });
  await writeFile(
    join(shimDir, "index.js"),
    'class Notice { constructor(message) { this.message = message; } }\nmodule.exports = { Notice, Platform: { isDesktopApp: false, isMobile: true }, requestUrl: async () => { throw new Error("requestUrl should not execute in this harness"); } };\n',
    "utf8",
  );
  const module = await import("../src/product/runtime");
  return module.Phase5ProductRuntime;
}

function runtimeHost(settings: BrainSyncSettings, registrationCounter?: { value: number }) {
  const secretStorage = { getSecret: () => null, setSecret: () => undefined, deleteSecret: () => undefined };
  const plugin = {
    registerObsidianProtocolHandler: () => {
      if (registrationCounter) registrationCounter.value++;
    },
  };
  const data = { load: async () => [], save: async () => undefined };
  return {
    app: { secretStorage } as never,
    plugin: plugin as never,
    settings: () => settings,
    data: data as never,
    saveSettings: async (next: BrainSyncSettings) => { settings = next; },
    notify: () => undefined,
  };
}

test("T1 repeated runtime initialization never registers the plugin-global OAuth protocol action", async () => {
  const Phase5ProductRuntime = await loadRuntimeClass();
  const registrationCounter = { value: 0 };
  const settings: BrainSyncSettings = {
    ...DEFAULT_SETTINGS,
    deviceIdentity: "device:alpha-lifecycle",
    oauthClientId: "client",
    oauthRedirectUri: "https://example.test/oauth/callback",
  };
  const runtime = new Phase5ProductRuntime(runtimeHost(settings, registrationCounter));

  await runtime.initialize();
  await runtime.initialize();

  assert.equal(registrationCounter.value, 0);
  await runtime.disposeProduct();
});

test("T2/T4/T5 one stable registration delegates a callback only to the current completion target", async () => {
  const registrar = new CapturingRegistrar();
  let sessionACalls = 0;
  let sessionBCalls = 0;
  const notifications: OAuthCompletion[] = [];
  let current = async (_input: OAuthCallbackInput): Promise<OAuthCompletion> => {
    sessionACalls++;
    return { ok: false, reason: "missing-transaction" };
  };

  registerGoogleOAuthReturn(registrar, input => current(input), result => notifications.push(result));
  assert.equal(registrar.registrations, 1);

  current = async input => {
    sessionBCalls++;
    assert.deepEqual(input, { code: "callback-code", state: "state-b", error: undefined });
    return { ok: true };
  };

  await registrar.fire({ code: "callback-code", state: "state-b" });

  assert.equal(registrar.registrations, 1);
  assert.equal(sessionACalls, 0);
  assert.equal(sessionBCalls, 1);
  assert.deepEqual(notifications, [{ ok: true }]);
});

test("T4/T5 runtime completion seam dereferences the current OAuth session at callback execution time", async () => {
  const Phase5ProductRuntime = await loadRuntimeClass();
  const settings: BrainSyncSettings = { ...DEFAULT_SETTINGS, deviceIdentity: "device:current-session" };
  const runtime = new Phase5ProductRuntime(runtimeHost(settings));
  let sessionACalls = 0;
  let sessionBCalls = 0;
  const sessionA = {
    completeAuthorization: async (_input: OAuthCallbackInput): Promise<OAuthCompletion> => {
      sessionACalls++;
      return { ok: false, reason: "missing-transaction" };
    },
  };
  const sessionB = {
    completeAuthorization: async (input: OAuthCallbackInput): Promise<OAuthCompletion> => {
      sessionBCalls++;
      assert.equal(input.state, "state-current");
      return { ok: true };
    },
  };

  Object.assign(runtime as unknown as Record<string, unknown>, { boundary: { oauth: sessionA } });
  const stablePluginDelegate = (input: OAuthCallbackInput) => runtime.completeGoogleAuthorization(input);
  Object.assign(runtime as unknown as Record<string, unknown>, { boundary: { oauth: sessionB } });

  const result = await stablePluginDelegate({ code: "code-current", state: "state-current" });

  assert.deepEqual(result, { ok: true });
  assert.equal(sessionACalls, 0);
  assert.equal(sessionBCalls, 1);
  await runtime.disposeProduct();
});

test("T3 Authenticate-after-initialization path cannot register the OAuth action again", async () => {
  const root = join(__dirname, "..", "..");
  const mainSource = await readFile(join(root, "src", "main.ts"), "utf8");
  const runtimeSource = await readFile(join(root, "src", "product", "runtime.ts"), "utf8");
  const authenticateStart = mainSource.indexOf("private async authenticate(): Promise<void>");
  const createRemoteStart = mainSource.indexOf("private async createManagedRemote", authenticateStart);
  const authenticateSource = mainSource.slice(authenticateStart, createRemoteStart);

  assert.ok(authenticateStart >= 0 && createRemoteStart > authenticateStart);
  assert.match(authenticateSource, /runtime\?\.initialize\(\)/);
  assert.match(authenticateSource, /runtime\?\.authenticate\(\)/);
  assert.doesNotMatch(authenticateSource, /registerGoogleOAuthReturn/);
  assert.doesNotMatch(runtimeSource, /registerGoogleOAuthReturn\s*\(/);
});

test("T2/T6 registration is once per plugin lifetime and relies on lifecycle cleanup rather than manual registry mutation", async () => {
  const lifetimeA = new CapturingRegistrar();
  const lifetimeB = new CapturingRegistrar();
  const complete = async (): Promise<OAuthCompletion> => ({ ok: true });

  registerGoogleOAuthReturn(lifetimeA, complete);
  registerGoogleOAuthReturn(lifetimeB, complete);

  assert.equal(lifetimeA.registrations, 1);
  assert.equal(lifetimeB.registrations, 1);

  const root = join(__dirname, "..", "..");
  const mainSource = await readFile(join(root, "src", "main.ts"), "utf8");
  const runtimeSource = await readFile(join(root, "src", "product", "runtime.ts"), "utf8");
  const oauthReturnSource = await readFile(join(root, "src", "drive", "oauth-return.ts"), "utf8");
  assert.equal((mainSource.match(/registerGoogleOAuthReturn\s*\(/g) ?? []).length, 1);
  assert.doesNotMatch(`${mainSource}\n${runtimeSource}\n${oauthReturnSource}`, /unregisterObsidianProtocolHandler|protocolHandlers?\s*\[/);
});

test("T7 lifecycle repair adds no secret-bearing diagnostics and preserves safe completion notices", async () => {
  const root = join(__dirname, "..", "..");
  const sources = await Promise.all([
    readFile(join(root, "src", "main.ts"), "utf8"),
    readFile(join(root, "src", "product", "runtime.ts"), "utf8"),
    readFile(join(root, "src", "drive", "oauth-return.ts"), "utf8"),
    readFile(join(root, "test", "phase6-alpha-oauth-lifecycle.test.ts"), "utf8"),
  ]);
  const combined = sources.join("\n");

  assert.doesNotMatch(combined, /console\.(?:log|debug|info|warn|error)\s*\(/);
  assert.doesNotMatch(combined, /access[_-]?token\s*[:=]|refresh[_-]?token\s*[:=]|client[_-]?secret\s*[:=]|code[_-]?verifier\s*[:=]/i);
  assert.match(sources[0], /Google authentication completed\./);
  assert.match(sources[0], /Google authentication failed: \$\{result\.reason\}/);
});
