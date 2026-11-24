import assert from "node:assert/strict";
import test from "node:test";
import { inventoryContinuityFingerprint, inventoryContinuityGrant } from "../../src/contracts/verified-metadata-inventory";
import { REQUIRED_DRIVE_SCOPE } from "../../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore } from "../../src/drive/auth";

class Secrets {
  readonly entries = new Map<string, string>();
  getSecret(name: string) { return this.entries.get(name) ?? null; }
  setSecret(name: string, value: string) { this.entries.set(name, value); }
  deleteSecret(name: string) { this.entries.delete(name); }
}
const token = (epoch?: string) => JSON.stringify({
  accessToken: "sensitive-access-token", refreshToken: "sensitive-refresh-token",
  expiresAtMs: 9999999999999, tokenType: "Bearer", scope: REQUIRED_DRIVE_SCOPE,
  ...(epoch ? { inventoryGrantEpoch: epoch } : {}),
});
const scope = "sha256:" + "b".repeat(64);

test("DEC365 continuity fingerprint is strictly versioned and binds opaque grant plus policy", () => {
  const grant = "sha256:" + "a".repeat(64);
  const value = inventoryContinuityFingerprint(grant, scope);
  assert.equal(value, "dec339-continuity-v1:" + grant + ":" + scope);
  assert.equal(inventoryContinuityGrant(value), grant);
  assert.equal(inventoryContinuityGrant("scope:legacy"), undefined);
  assert.equal(inventoryContinuityGrant(value + ":extra"), undefined);
  assert.throws(() => inventoryContinuityFingerprint("wrong", scope),
    /invalid-inventory-continuity-namespace/);
});

test("DEC365 existing exact-scope grant receives stable local epoch without persisting plaintext token in fingerprint", () => {
  const secrets = new Secrets();
  secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, token());
  const auth = new GoogleOAuthSession({ clientId: "client-a", redirectUri: "https://callback.invalid" },
    new ObsidianSecretStore(secrets));
  const before = auth.inventoryGrantBinding();
  assert.match(before ?? "", /^sha256:[a-f0-9]{64}$/);
  assert.equal(auth.inventoryGrantBinding(), before);
  const persisted = JSON.parse(secrets.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID)!);
  assert.match(persisted.inventoryGrantEpoch, /^[a-f0-9]{32}$/);
  const fingerprint = inventoryContinuityFingerprint(before!, scope);
  assert.equal(fingerprint.includes("sensitive-"), false);
});

test("DEC365 reauthorization and app switch invalidate the same device's inventory namespace", () => {
  const secrets = new Secrets();
  secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, token("a".repeat(32)));
  const current = new GoogleOAuthSession({ clientId: "client-a", redirectUri: "https://callback.invalid" },
    new ObsidianSecretStore(secrets));
  const old = current.inventoryGrantBinding();
  secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, token("b".repeat(32)));
  const renewed = current.inventoryGrantBinding();
  assert.notEqual(renewed, old);
  const switched = new GoogleOAuthSession({ clientId: "client-b", redirectUri: "https://callback.invalid" },
    new ObsidianSecretStore(secrets));
  assert.notEqual(switched.inventoryGrantBinding(), renewed);
});

test("DEC365 wrong or missing OAuth grant cannot qualify continuity", () => {
  const secrets = new Secrets();
  const auth = new GoogleOAuthSession({ clientId: "client-a", redirectUri: "https://callback.invalid" },
    new ObsidianSecretStore(secrets));
  assert.equal(auth.inventoryGrantBinding(), undefined);
  secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "token", expiresAtMs: 9999999999, tokenType: "Bearer", scope: "https://www.googleapis.com/auth/drive",
  }));
  assert.equal(auth.inventoryGrantBinding(), undefined);
  assert.equal(secrets.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID)?.includes("inventoryGrantEpoch"), false);
});

test("DEC365 ordinary token refresh preserves the inventory grant epoch", async () => {
  const secrets = new Secrets();
  secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "expired", refreshToken: "ref", expiresAtMs: 0, tokenType: "Bearer",
    scope: REQUIRED_DRIVE_SCOPE, inventoryGrantEpoch: "c".repeat(32),
  }));
  const auth = new GoogleOAuthSession({ clientId: "client-a", redirectUri: "https://callback.invalid" },
    new ObsidianSecretStore(secrets), async () => new Response(JSON.stringify({
      access_token: "refreshed", expires_in: 3600, scope: REQUIRED_DRIVE_SCOPE,
    }), { status: 200, headers: { "content-type": "application/json" } }), () => 10000);
  const before = auth.inventoryGrantBinding();
  assert.equal(await auth.accessToken(), "refreshed");
  assert.equal(auth.inventoryGrantBinding(), before);
});
