import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";

class MemorySecrets {
  readonly values = new Map<string,string>();
  getSecret(id:string){ return this.values.get(id) ?? null; }
  setSecret(id:string,value:string){ this.values.set(id,value); }
  deleteSecret(id:string){ this.values.delete(id); }
}

const broaderScope = `${REQUIRED_DRIVE_SCOPE} https://www.googleapis.com/auth/drive.metadata.readonly`;

function tokenJson(scope:string, expiresAtMs:number, refreshToken="refresh") {
  return JSON.stringify({ accessToken:"access", refreshToken, expiresAtMs, tokenType:"Bearer", scope });
}

test("Phase 6 C: authorization rejects a token grant broader than exact drive.file", async () => {
  const backing = new MemorySecrets();
  const oauth = new GoogleOAuthSession(
    { clientId:"user-client", redirectUri:"https://example.azurestaticapps.net/oauth/callback" },
    new ObsidianSecretStore(backing),
    async () => new Response(JSON.stringify({
      access_token:"access",
      refresh_token:"refresh",
      expires_in:3600,
      token_type:"Bearer",
      scope:broaderScope,
    }), { status:200, headers:{"content-type":"application/json"} }),
  );
  const request = await oauth.beginAuthorization();
  const result = await oauth.completeAuthorization({ code:"code", state:request.state });
  assert.deepEqual(result, { ok:false, reason:"token-exchange-failed", detail:"oauth-scope-grant-not-exact-drive-file" });
  assert.equal(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID), null);
});

test("Phase 6 C: previously persisted broader-scope token fails closed before remote use", async () => {
  const backing = new MemorySecrets();
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, tokenJson(broaderScope, Date.now() + 3_600_000));
  const oauth = new GoogleOAuthSession(
    { clientId:"user-client", redirectUri:"https://example.azurestaticapps.net/oauth/callback" },
    new ObsidianSecretStore(backing),
  );
  assert.equal(await oauth.accessToken(), undefined);
  assert.equal(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID), null);
});

test("Phase 6 C: refresh cannot silently broaden an exact drive.file grant", async () => {
  let now = 10_000;
  const backing = new MemorySecrets();
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, tokenJson(REQUIRED_DRIVE_SCOPE, now + 1_000));
  const oauth = new GoogleOAuthSession(
    { clientId:"user-client", redirectUri:"https://example.azurestaticapps.net/oauth/callback" },
    new ObsidianSecretStore(backing),
    async () => new Response(JSON.stringify({
      access_token:"refreshed-access",
      expires_in:3600,
      token_type:"Bearer",
      scope:broaderScope,
    }), { status:200, headers:{"content-type":"application/json"} }),
    () => now,
  );
  assert.equal(await oauth.accessToken(), undefined);
  assert.equal(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID), null);
});

test("Phase 6 C: refresh remains valid when Google omits scope and existing grant is exact", async () => {
  const now = 20_000;
  const backing = new MemorySecrets();
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, tokenJson(REQUIRED_DRIVE_SCOPE, now + 1_000));
  const oauth = new GoogleOAuthSession(
    { clientId:"user-client", redirectUri:"https://example.azurestaticapps.net/oauth/callback" },
    new ObsidianSecretStore(backing),
    async () => new Response(JSON.stringify({ access_token:"refreshed-access", expires_in:3600, token_type:"Bearer" }), { status:200, headers:{"content-type":"application/json"} }),
    () => now,
  );
  assert.equal(await oauth.accessToken(), "refreshed-access");
  assert.equal(oauth.tokens()?.scope, REQUIRED_DRIVE_SCOPE);
});

test("Phase 6 C: exact reauthorization never carries forward a broader-scope refresh token", async () => {
  let now = 30_000;
  let fetchCalls = 0;

  const backing = new MemorySecrets();
  backing.setSecret(
    GoogleOAuthSession.TOKEN_SECRET_ID,
    tokenJson(broaderScope, now + 3_600_000, "broader-refresh")
  );

  const oauth = new GoogleOAuthSession(
    {
      clientId: "user-client",
      redirectUri: "https://example.azurestaticapps.net/oauth/callback"
    },
    new ObsidianSecretStore(backing),
    async () => {
      fetchCalls += 1;
      return new Response(
        JSON.stringify({
          access_token: "new-exact-access",
          expires_in: 3600,
          token_type: "Bearer",
          scope: REQUIRED_DRIVE_SCOPE
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    },
    () => now
  );

  const request = await oauth.beginAuthorization();
  const completion = await oauth.completeAuthorization({
    code: "code",
    state: request.state
  });

  assert.deepEqual(completion, { ok: true });
  assert.equal(oauth.tokens()?.scope, REQUIRED_DRIVE_SCOPE);
  assert.equal(oauth.tokens()?.refreshToken, undefined);
  assert.equal(fetchCalls, 1);

  now += 3_601_000;

  assert.equal(await oauth.accessToken(), undefined);
  assert.equal(fetchCalls, 1);
  assert.equal(
    backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID),
    null
  );
});
