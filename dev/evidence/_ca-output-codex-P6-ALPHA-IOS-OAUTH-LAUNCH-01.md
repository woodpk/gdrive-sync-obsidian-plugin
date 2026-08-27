# Phase 6 Alpha iOS OAuth Browser-Launch Repair Evidence

Agent: `codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01`  
Date: 2026-08-27

## Starting state

- required integration branch: `phase6-integration`;
- exact required and observed starting SHA: `73453011c54abdca9ff2548803c025fae9886e74`;
- `origin/phase6-integration`: `73453011c54abdca9ff2548803c025fae9886e74` after `git fetch origin` and `git pull --ff-only origin phase6-integration`;
- initial `git status --short --branch`: clean;
- repair branch created from that exact state: `phase6-alpha-ios-oauth-launch-fix`.

## Human-provided reproduced defect

The following is the user's physical-device observation, not a reproduction performed by this coding agent:

> On stock iPhone Obsidian, tapping Authenticate produced no visible browser/web-authentication handoff and no Google authorization flow.

The installed plugin otherwise loaded and rendered settings. The configured OAuth client ID, redirect URI, and client-secret presence were confirmed by the user. No secret value was read or recorded.

## Diagnosis

The existing tap path entered an async function, reinitialized the runtime, generated the PKCE challenge through asynchronous Web Crypto, and only then called `window.open`. WebKit documents `window.open()` as user-activation-gated and documents that user activation normally is not propagated through asynchronous executors. The physical symptom—normal return but no visible window—is the expected popup-blocking outcome when the open occurs outside the tap's transient activation.

The old launcher was therefore insufficient on iOS even though it remained functional on Windows: its global call was valid, but its timing was after multiple `await` boundaries. Its test also deliberately accepted a falsy host return, so it could not prove a visible handoff.

Primary evidence consulted:

- WebKit, “The User Activation API”: `https://webkit.org/blog/13862/the-user-activation-api/`;
- WebKit, “Meet Face ID and Touch ID for the Web”: `https://webkit.org/blog/11312/meet-face-id-and-touch-id-for-the-web/`;
- the public Obsidian API types, which expose platform detection but no documented cross-platform external-browser launcher replacing the existing browser-global mechanism: `https://github.com/obsidianmd/obsidian-api`.

Selected mechanism:

1. on `Platform.isMobileApp`, synchronously reserve one blank target window before the first `await` in the Authenticate handler;
2. detach its opener immediately;
3. initialize the current runtime and create/store exactly one PKCE transaction;
4. navigate the already-reserved window to that transaction's authorization URL exactly once;
5. close the reservation and propagate a safe error if preparation or navigation fails;
6. preserve the existing direct `noopener,noreferrer` system-browser launch as the desktop default.

This keeps browser-host mechanics injectable and separate from token processing. Callback registration, current-session callback delegation, token exchange, device-local SecretStorage, and exact `drive.file` scope are unchanged.

Alternatives rejected:

- Electron `shell.openExternal`: unavailable on stock iOS and prohibited by the mobile boundary;
- calling `window.open` after PKCE preparation with different feature flags: does not repair lost transient activation;
- Obsidian `Workspace.openLinkText`: documented for workspace/internal link navigation, not as a supported external OAuth browser handoff;
- navigating the Obsidian WebView itself: risks an embedded-user-agent OAuth flow and abandons the required external return path;
- synchronous custom PKCE hashing or long-lived eagerly prepared transactions: adds unnecessary security-sensitive code or transaction-staleness complexity.

## Complete change manifest

Created:

- `test/phase6-alpha-ios-oauth-launch.test.ts`;
- `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01.md`.

Modified:

- `src/drive/oauth-return.ts`;
- `src/main.ts`;
- `src/product/runtime.ts`;
- `test/phase6-alpha-oauth-lifecycle.test.ts`;
- `dev/evidence/_ca-output.md`.

Deleted:

- none.

The ignored build product `main.js` was regenerated for verification but is not a tracked repository change.

## Tests added or updated

New behavioral coverage proves:

- mobile reservation occurs synchronously and navigates the same detached window once;
- blocked reservation produces a clear safe error;
- transaction preparation precedes browser navigation and occurs once;
- preparation failure, synchronous navigation failure, and asynchronous launcher rejection propagate and cancel correctly;
- `Platform.isMobileApp` reserves before the Authenticate handler's first `await`;
- desktop retains the existing direct launcher;
- no Node/Electron import enters the mobile-required launch path.

The existing lifecycle test was updated only to accept the injected `mobileBrowser` argument while continuing to prove one plugin-lifetime protocol registration and current-session callback delegation. Existing live OAuth tests continue to prove safe diagnostics, SecretStorage use, and exact `drive.file` scope.

## Verification

Repository gate:

- `git fetch origin`: PASS;
- `git checkout phase6-integration`: PASS;
- `git pull --ff-only origin phase6-integration`: PASS;
- local/integration SHA equality and clean tree: PASS;
- branch creation: PASS.

Pre-change aggregate baseline on this Windows checkout:

- `npm run check` with the Node installation added to process `PATH`: FAIL at `npm test` with 263/265 passing;
- the two failures were pre-existing Windows drive-qualified path expectation failures in `phase6-alpha-portable-collision.test.ts` (“direct missing child…” and “nested missing target…”); no build was reached by the aggregate script.

Post-change commands and results:

- `npm run typecheck`: PASS;
- `tsc -p tsconfig.test.json` followed by the four focused test files (`phase6-alpha-ios-oauth-launch`, `phase6-alpha-oauth-live`, `phase6-alpha-oauth-lifecycle`, and `mobile-safety`): PASS, 25/25;
- `npm test`: 268/270 PASS, with only the same two pre-existing Windows path-expectation failures above;
- `npm run build`: PASS;
- `npm run check`: typecheck PASS, then 268/270 tests with only the same two baseline failures; aggregate exits before its build step;
- `git diff --check`: PASS apart from Git's informational LF-to-CRLF working-copy warnings.

No unrelated production or test change was made to hide or repair those baseline path assertions. A clean Linux PR gate remains required for combined verification.

Relevant new test names:

- `iOS OAuth launch: mobile reservation opens synchronously and navigates the same window once`;
- `iOS OAuth launch: a blocked or absent reservation fails with a clear launch error`;
- `iOS OAuth launch: PKCE transaction preparation completes before exactly one browser navigation`;
- `iOS OAuth launch: asynchronous preparation and navigation failures propagate and close the reservation`;
- `iOS OAuth launch: plugin reserves only on mobile before its first await while desktop keeps direct launch`.

## Build artifact

- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js` size: `292679` bytes;
- generated `main.js` SHA-256: `beb7fad248761eafc97c62bbcfb65c1a1b2f31fa7e1c31e67c28daaf95fcad4b`.

## Safety and remaining validation

- exact Google scope remains `https://www.googleapis.com/auth/drive.file`;
- no OAuth client-secret value, token, authorization code, PKCE verifier, complete authorization URL, cookie, credential, or vault content was printed, copied, logged, committed, or placed in evidence;
- no Google Cloud or Azure configuration changed;
- no token was transferred between devices;
- no managed remote was created or paired;
- no synchronization was performed;
- no release/tag was changed or created;
- Stage 3 did not begin;
- **physical iPhone Authenticate-button validation remains required** after independent review and supervisor publication of a later BRAT prerelease;
- that physical validation must confirm that one tap visibly hands off to Safari/the external Google authorization flow and that the existing callback returns control to the same iPhone Obsidian instance; iPhone pairing and synchronization remain outside this repair validation.
