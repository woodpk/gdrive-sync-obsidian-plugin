import assert from "node:assert/strict";
import test from "node:test";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";

class MemorySecrets {
  readonly values = new Map<string,string>();
  getSecret(id:string){ return this.values.get(id) ?? null; }
  setSecret(id:string,v:string){ this.values.set(id,v); }
  deleteSecret(id:string){ this.values.delete(id); }
}

function expiredSession(fetcher: typeof fetch) {
  const backing = new MemorySecrets();
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({ accessToken:"expired", refreshToken:"refresh-authority", expiresAtMs:0, tokenType:"Bearer", scope:REQUIRED_DRIVE_SCOPE }));
  return { backing, oauth: new GoogleOAuthSession({ clientId:"c", redirectUri:"https://cb" }, new ObsidianSecretStore(backing), fetcher, () => 10_000) };
}

test("OAuth request uses exact drive.file scope, high-entropy state, and PKCE S256", async () => {
  const secrets = new MemorySecrets();
  const oauth = new GoogleOAuthSession({ clientId:"user-client", redirectUri:"https://example.azurestaticapps.net/oauth/callback" }, new ObsidianSecretStore(secrets));
  const request = await oauth.beginAuthorization();
  const url = new URL(request.url);
  assert.equal(url.searchParams.get("scope"), REQUIRED_DRIVE_SCOPE);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok((url.searchParams.get("code_challenge") ?? "").length >= 43);
  assert.ok(request.state.length >= 43);
  assert.equal(url.searchParams.getAll("scope").length, 1);
});

test("OAuth callback rejects mismatched state before token exchange", async () => {
  let calls = 0;
  const oauth = new GoogleOAuthSession({ clientId:"user-client", redirectUri:"https://example.azurestaticapps.net/oauth/callback" }, new ObsidianSecretStore(new MemorySecrets()), async () => { calls++; return new Response(); });
  await oauth.beginAuthorization();
  const result = await oauth.completeAuthorization({ code:"code", state:"wrong" });
  assert.deepEqual(result, { ok:false, reason:"state-mismatch" });
  assert.equal(calls, 0);
});

test("OAuth token exchange keeps client secret and tokens in SecretStorage", async () => {
  const backing = new MemorySecrets(); const store = new ObsidianSecretStore(backing); store.set("brain-google-client-secret", "user-owned-secret");
  let body = "";
  const oauth = new GoogleOAuthSession({ clientId:"user-client", redirectUri:"https://example.azurestaticapps.net/oauth/callback", clientSecretStorageKey:"brain-google-client-secret" }, store, async (_url, init) => {
    body = String(init?.body ?? ""); return new Response(JSON.stringify({ access_token:"access", refresh_token:"refresh", expires_in:3600, token_type:"Bearer", scope:REQUIRED_DRIVE_SCOPE }), { status:200, headers:{"content-type":"application/json"} });
  });
  const request = await oauth.beginAuthorization(); const result = await oauth.completeAuthorization({ code:"code", state:request.state });
  assert.equal(result.ok, true); assert.match(body, /code_verifier=/); assert.match(body, /client_secret=user-owned-secret/);
  assert.ok(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID)?.includes("refresh"));
});

test("expired transaction is rejected without exchanging a code", async () => {
  let calls=0; let now=1000;
  const oauth=new GoogleOAuthSession({clientId:"c",redirectUri:"https://example.azurestaticapps.net/oauth/callback"},new ObsidianSecretStore(new MemorySecrets()),async()=>{calls++;return new Response();},()=>now);
  const request=await oauth.beginAuthorization(10); now=1011;
  const result=await oauth.completeAuthorization({code:"code",state:request.state});
  assert.deepEqual(result,{ok:false,reason:"expired-transaction"}); assert.equal(calls,0);
});

test("transient refresh transport failure preserves refresh authority and is classified deferred", async () => {
  const { backing, oauth } = expiredSession(async () => { throw new TypeError("network unavailable"); });
  assert.equal(await oauth.accessToken(), undefined);
  assert.equal(oauth.accessTokenFailure(), "transient");
  const persisted = JSON.parse(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID)!) as { refreshToken?: string; accessToken?: string };
  assert.equal(persisted.refreshToken, "refresh-authority");
  assert.equal(persisted.accessToken, "expired");
});

test("malformed, 429, and 5xx refresh responses preserve refresh authority", async () => {
  for (const response of [
    new Response("not-json", { status: 200 }),
    new Response(JSON.stringify({ error:"temporarily_unavailable" }), { status: 429, headers:{"content-type":"application/json"} }),
    new Response(JSON.stringify({ error:"server_error" }), { status: 503, headers:{"content-type":"application/json"} }),
  ]) {
    const { backing, oauth } = expiredSession(async () => response.clone());
    assert.equal(await oauth.accessToken(), undefined);
    assert.equal(oauth.accessTokenFailure(), "transient");
    const persisted = JSON.parse(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID)!) as { refreshToken?: string };
    assert.equal(persisted.refreshToken, "refresh-authority");
  }
});

test("invalid_grant definitively clears refresh authority", async () => {
  const { backing, oauth } = expiredSession(async () => new Response(JSON.stringify({ error:"invalid_grant" }), { status:400, headers:{"content-type":"application/json"} }));
  assert.equal(await oauth.accessToken(), undefined);
  assert.equal(oauth.accessTokenFailure(), "authentication-required");
  assert.equal(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID), null);
});

test("known rejected access token is invalidated without erasing a valid refresh token", () => {
  const { backing, oauth } = expiredSession(async () => new Response());
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({ accessToken:"rejected", refreshToken:"refresh-authority", expiresAtMs:99_999, tokenType:"Bearer", scope:REQUIRED_DRIVE_SCOPE }));
  oauth.invalidateAccessToken();
  const persisted = JSON.parse(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID)!) as { refreshToken?: string; accessToken?: string; expiresAtMs?: number };
  assert.equal(persisted.refreshToken, "refresh-authority");
  assert.equal(persisted.accessToken, "");
  assert.equal(persisted.expiresAtMs, 0);
});
