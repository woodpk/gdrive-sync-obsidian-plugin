import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";
import {
  formatOAuthDiagnosticSuffix,
  GoogleOAuthSession,
  ObsidianSecretStore,
  type OAuthCompletion,
} from "../src/drive/auth";
import { openAuthorizationInSystemBrowser } from "../src/drive/oauth-return";

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string): string | null { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string): void { this.values.set(id, value); }
  deleteSecret(id: string): void { this.values.delete(id); }
}

test("Alpha OAuth live: a falsy browser return still counts as an initiated launch", () => {
  const calls: unknown[][] = [];
  assert.doesNotThrow(() => openAuthorizationInSystemBrowser("https://accounts.example/authorize", (...args) => {
    calls.push(args);
    return null;
  }));
  assert.deepEqual(calls, [["https://accounts.example/authorize", "_blank", "noopener,noreferrer"]]);
  assert.doesNotThrow(() => openAuthorizationInSystemBrowser("https://accounts.example/authorize", () => false));
});

test("Alpha OAuth live: an actual browser launch exception is surfaced", () => {
  assert.throws(
    () => openAuthorizationInSystemBrowser("https://accounts.example/authorize", () => { throw new Error("host-launch-failed"); }),
    /host-launch-failed/,
  );
});

test("Alpha OAuth live: token endpoint failure exposes only structured sanitized diagnostics", async () => {
  const authorizationCode = "authorization-code-secret-123";
  const accessToken = "access-token-secret-456";
  const refreshToken = "refresh-token-secret-789";
  const clientSecret = "client-secret-value-987";
  let verifier = "";
  const backing = new MemorySecrets();
  const secrets = new ObsidianSecretStore(backing);
  secrets.set("oauth-client-secret", clientSecret);
  const oauth = new GoogleOAuthSession(
    { clientId: "user-client", redirectUri: "https://callback.example/", clientSecretStorageKey: "oauth-client-secret" },
    secrets,
    async (_url, init) => {
      const form = new URLSearchParams(String(init?.body));
      verifier = form.get("code_verifier") ?? "";
      const errorDescription = [
        "Client rejected\u0000\n",
        `code=${authorizationCode}`,
        `code_verifier=${verifier}`,
        `access_token=${accessToken}`,
        `refresh_token=${refreshToken}`,
        `client_secret=${clientSecret}`,
        "https://accounts.example/help?code=leak&token=leak",
      ].join(" ");
      return new Response(JSON.stringify({
        error: "invalid_client",
        error_description: errorDescription,
        access_token: accessToken,
        refresh_token: refreshToken,
      }), { status: 400, headers: { "content-type": "application/json" } });
    },
  );
  const request = await oauth.beginAuthorization();
  const completion = await oauth.completeAuthorization({ code: authorizationCode, state: request.state });

  assert.equal(completion.ok, false);
  if (completion.ok) return;
  assert.deepEqual(completion.diagnostic && {
    phase: completion.diagnostic.phase,
    classification: completion.diagnostic.classification,
    httpStatus: completion.diagnostic.httpStatus,
    oauthError: completion.diagnostic.oauthError,
  }, {
    phase: "token-exchange",
    classification: "http-error",
    httpStatus: 400,
    oauthError: "invalid_client",
  });
  assert.match(completion.diagnostic?.errorDescription ?? "", /Client rejected/);
  assert.match(completion.diagnostic?.errorDescription ?? "", /\[redacted\]/);
  assert.match(completion.diagnostic?.errorDescription ?? "", /\[redacted-url\]/);
  const visible = `Google authentication failed: ${completion.reason}${formatOAuthDiagnosticSuffix(completion)}`;
  for (const secret of [authorizationCode, verifier, accessToken, refreshToken, clientSecret, "code=leak", "token=leak"]) {
    assert.ok(secret);
    assert.equal(JSON.stringify(completion).includes(secret), false, `completion leaked ${secret}`);
    assert.equal(visible.includes(secret), false, `visible diagnostic leaked ${secret}`);
  }
  assert.doesNotMatch(visible, /[\u0000-\u001f\u007f-\u009f]/);
  assert.ok((completion.diagnostic?.errorDescription?.length ?? 0) <= 240);
  assert.equal(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID), null);
});

test("Alpha OAuth live: malformed token response keeps safe status without raw response data", async () => {
  const rawSecret = "raw-service-secret-must-not-leak";
  const oauth = new GoogleOAuthSession(
    { clientId: "user-client", redirectUri: "https://callback.example/" },
    new ObsidianSecretStore(new MemorySecrets()),
    async () => new Response(`<html>${rawSecret}</html>`, { status: 502, headers: { "content-type": "text/html" } }),
  );
  const request = await oauth.beginAuthorization();
  const completion = await oauth.completeAuthorization({ code: "callback-code", state: request.state });
  assert.deepEqual(completion, {
    ok: false,
    reason: "token-exchange-failed",
    detail: "malformed-token-response",
    diagnostic: { phase: "token-exchange", classification: "malformed-response", httpStatus: 502 },
  } satisfies OAuthCompletion);
  assert.equal(JSON.stringify(completion).includes(rawSecret), false);
});

test("Alpha OAuth live: transport failure produces a generic secret-free classification", async () => {
  const transportDetail = "network exception containing private-material";
  const oauth = new GoogleOAuthSession(
    { clientId: "user-client", redirectUri: "https://callback.example/" },
    new ObsidianSecretStore(new MemorySecrets()),
    async () => { throw new Error(transportDetail); },
  );
  const request = await oauth.beginAuthorization();
  const completion = await oauth.completeAuthorization({ code: "callback-code", state: request.state });
  assert.deepEqual(completion, {
    ok: false,
    reason: "token-exchange-failed",
    detail: "transport-or-service-failure",
    diagnostic: { phase: "token-exchange", classification: "transport-or-service-failure" },
  } satisfies OAuthCompletion);
  assert.equal(JSON.stringify(completion).includes(transportDetail), false);
});

test("Alpha OAuth live: successful exact drive.file exchange remains unchanged", async () => {
  const oauth = new GoogleOAuthSession(
    { clientId: "user-client", redirectUri: "https://callback.example/" },
    new ObsidianSecretStore(new MemorySecrets()),
    async () => new Response(JSON.stringify({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "Bearer",
      scope: REQUIRED_DRIVE_SCOPE,
    }), { status: 200, headers: { "content-type": "application/json" } }),
  );
  const request = await oauth.beginAuthorization();
  assert.deepEqual(await oauth.completeAuthorization({ code: "callback-code", state: request.state }), { ok: true });
  assert.equal(oauth.tokens()?.scope, REQUIRED_DRIVE_SCOPE);
});

test("Alpha OAuth live: failure diagnostic remains visible and copyable without console logging", async () => {
  const mainSource = await readFile(join(__dirname, "..", "..", "src", "main.ts"), "utf8");
  assert.match(mainSource, /lastOAuthDiagnosticText/);
  assert.match(mainSource, /result\.ok \? 5_000 : 30_000/);
  assert.match(mainSource, /id: "copy-last-oauth-diagnostic"/);
  assert.match(mainSource, /navigator\.clipboard\.writeText\(this\.lastOAuthDiagnosticText\)/);
  assert.doesNotMatch(mainSource, /console\.(?:log|debug|info|warn|error)\s*\(/);
});

test("Alpha OAuth live: Web client secret is wired through Obsidian SecretStorage and never plugin data", async () => {
  const root = join(__dirname, "..", "..");
  const [authSource, runtimeSource, settingsSource, pluginDataSource] = await Promise.all([
    readFile(join(root, "src", "drive", "auth.ts"), "utf8"),
    readFile(join(root, "src", "product", "runtime.ts"), "utf8"),
    readFile(join(root, "src", "product", "settings-tab.ts"), "utf8"),
    readFile(join(root, "src", "product", "plugin-data.ts"), "utf8"),
  ]);

  assert.match(authSource, /GOOGLE_OAUTH_CLIENT_SECRET_ID = "brain-google-client-secret"/);
  assert.match(runtimeSource, /clientSecretStorageKey: GOOGLE_OAUTH_CLIENT_SECRET_ID/);
  assert.match(settingsSource, /text\.inputEl\.type = "password"/);
  assert.match(settingsSource, /secretStorage\.setSecret\(GOOGLE_OAUTH_CLIENT_SECRET_ID, secret\)/);
  assert.doesNotMatch(pluginDataSource, /oauthClientSecret|clientSecret/);
  assert.doesNotMatch(settingsSource, /updateSettings\([^)]*clientSecret/);
});
