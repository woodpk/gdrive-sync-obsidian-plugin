# Phase 6 Alpha Live OAuth Debugging and Repair

- Agent: `codex-P6-ALPHA-OAUTH-LIVE-01`
- Required starting integration SHA: `8a0ec575f808c610c29ee4e307deb8194ae451c9`
- Repair branch: `phase6-alpha-oauth-live-fix`
- Base ancestry: the repair branch was created directly from the required SHA.
- Starting-tree exception: the working tree contained pre-existing staged scratch/prompt files and unrelated untracked files. Work stopped at the gate; the user explicitly directed the agent to ignore the two scratch files and continue. No unrelated item was reset, discarded, edited by this repair, or included in the intended commit set.

## Files inspected and causal trace

The exact current implementations inspected before repair were:

- `src/main.ts`
- `src/product/runtime.ts`
- `src/drive/auth.ts`
- `src/drive/oauth-return.ts`
- `src/drive/runtime.ts`
- `src/drive/obsidian-http.ts`
- `src/product/settings-tab.ts`
- `src/product/plugin-data.ts`
- directly relevant Phase 3, Phase 5, Phase 6 Alpha lifecycle, and Phase 6 C OAuth/security tests
- package/build scripts and the installed Obsidian plugin package

The traced production path was:

1. the settings Authenticate button or `authenticate-google` command calls the plugin-lifetime `authenticate` method;
2. runtime initialization replaces the current Google boundary/session without registering a protocol handler;
3. `beginGoogleAuthorization` creates state, PKCE verifier/challenge, and an expiring in-memory transaction;
4. the browser launcher opens Google's authorization endpoint;
5. Google redirects to the Azure-hosted callback;
6. the hosted callback returns through the Obsidian protocol action;
7. the single plugin-lifetime protocol handler dereferences the current runtime/session at callback time;
8. the current session validates transaction expiry/state and sends the authorization-code exchange through the Obsidian `requestUrl` bridge;
9. the token response is parsed, exact `drive.file` scope is enforced, and tokens are saved only through Obsidian SecretStorage;
10. a sanitized completion result is retained and surfaced by an Obsidian Notice.

## Live behavior before and during repair

The first proven defect was that `globalThis.open(...)` opened a browser but returned a falsy value. Production code interpreted the return value as proof of failure and displayed `The system browser could not be opened.`

After the browser-return repair, the real browser/Google/hosted-callback/Obsidian handoff completed but the plugin initially surfaced only `token-exchange-failed`. Structured diagnostics first classified this as a transport/service failure. A secret-free probe established that Obsidian `requestUrl` was throwing a response-shaped object for HTTP 400 and withholding the body. Inspection of the installed Obsidian API declaration established that `RequestUrlParam.throw` defaults to true.

After setting `throw: false`, the next real flow produced this sanitized evidence:

- phase: `token-exchange`
- HTTP status: `400`
- Google OAuth error: `invalid_request`
- sanitized description: `client_secret is missing.`

This was conclusive. The configured Google client is a Web application client because it uses the Azure HTTPS redirect. `GoogleOAuthSession` already supported a client secret stored behind a SecretStorage key, but production runtime composition did not supply that key and settings had no secure entry surface.

The bounded root-cause repair wired the existing secret-storage seam into production and added a masked, device-local Save/Clear settings control. The user entered the previously retained client secret directly in Obsidian; it was never provided to the agent or recorded. A presence-only runtime check confirmed a nonempty secret record without reading or displaying its value.

The final real OAuth cycle completed successfully. Obsidian retained `Google authentication completed.` and a presence-only check confirmed that a token record exists. No token value was read. A success result is emitted only after the exact `https://www.googleapis.com/auth/drive.file` scope invariant passes.

## Production changes

- `src/drive/oauth-return.ts`: treats falsy/null browser return values as inconclusive while still surfacing an unavailable launcher or thrown launch exception.
- `src/product/runtime.ts`: uses the safe browser launcher and supplies the device-local Google client-secret storage key to the current OAuth session.
- `src/drive/obsidian-http.ts`: sends `throw: false` so Google HTTP failures remain structured responses available to the safe parser.
- `src/drive/auth.ts`: adds structured token-exchange diagnostics, strict sanitization/length limits, safe formatting, response parsing without raw-body exposure, and the stable SecretStorage ID used for the Web client secret.
- `src/main.ts`: retains the last sanitized OAuth result, displays failures for 30 seconds, and provides a command to copy only the sanitized diagnostic.
- `src/product/settings-tab.ts`: adds a masked local-only Google client-secret control backed directly by Obsidian SecretStorage; the value is never added to plugin settings.

## Regression coverage

- `test/phase6-alpha-oauth-live.test.ts` covers falsy browser returns, thrown launch errors, HTTP status/error/description diagnostics, redaction of code/verifier/tokens/client secret/query URLs, malformed response safety, generic transport safety, unchanged exact-scope success, retained/copyable safe diagnostics, and SecretStorage-only Web client-secret wiring.
- `test/phase3-obsidian-http.test.ts` covers `throw: false` and preservation of a Google HTTP 400 JSON response.
- `test/phase6-c-auth-security.test.ts` preserves and asserts the exact-scope rejection with structured diagnostics.
- all existing Alpha Bug #3 lifecycle tests remained unchanged and passing.

## Final verification

Commands executed after the final root-cause repair:

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

Results:

- `npm ci`: PASS; 16 packages added, 17 audited, 0 vulnerabilities.
- `npm run typecheck`: PASS.
- `npm test`: PASS; 248 total, 248 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.
- `npm run build`: PASS.
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- built `main.js`: 286,740 bytes
- built SHA-256: `ed3a0bc41236b6fb988e3018b928fca36fc6e8fcacb05507eebf10c905ab4993`

## Installation and live boundary

- Installed directory: the required Windows BRAIN vault plugin directory.
- Installed `main.js`: 286,740 bytes.
- Installed SHA-256: `ed3a0bc41236b6fb988e3018b928fca36fc6e8fcacb05507eebf10c905ab4993`.
- Installed artifact exactly matched the verified build.
- Existing `data.json` was preserved.
- Plugin enabled and settings rendered without initialization exception.
- Final sanitized completion: `Google authentication completed.`
- Client-secret record present: yes, checked only as a boolean.
- OAuth token record present: yes, checked only as a boolean.
- Managed remote paired: no.
- Startup automatic sync: disabled.
- Local-change automatic sync: disabled.
- Periodic automatic sync: disabled.
- First synchronization completed: no.

## Conclusions and limits

- Alpha Bug #1 live packaging/load: physically validated by exact artifact install and successful plugin execution.
- Alpha Bug #2 root cause: confirmed and repaired. The Web application token exchange required the client secret; production omitted its SecretStorage key.
- Alpha Bug #3: intact. There remains exactly one plugin-lifetime registration; runtime initialization performs no registration; callback dispatch remains current-session based; repeated Authenticate attempts caused no duplicate-action error; all lifecycle regressions passed.
- Remaining external Google/Azure configuration work for this OAuth flow: none.
- No authorization code, PKCE verifier, access token, refresh token, client-secret value, credential, cookie, or vault content was recorded in source, test output, diagnostics, evidence, or Git.
- No managed remote was created or paired. `Sync Now` and `Verify/Reconcile Vault` were not run. No automatic synchronization was enabled and no vault synchronization occurred.
- iOS/mobile physical validation was not performed.
- Stage 3 did not begin.

