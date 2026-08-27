# Phase 6 Alpha iOS OAuth External-Browser Correction Evidence

Agent: `codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01`

Correction IDs: `G1 / C1–C3`

Date: 2026-08-27

## Topology and starting state

- required integration base: `phase6-integration`;
- original clean starting SHA: `73453011c54abdca9ff2548803c025fae9886e74`;
- existing repair branch: `phase6-alpha-ios-oauth-launch-fix`;
- rejected branch/PR head at correction start: `dff3baa7aa89827cd7103eb8a27bfd2ddc2fa191`;
- local and `origin/phase6-alpha-ios-oauth-launch-fix` both matched that rejected head;
- correction-start `git status --short --branch`: clean;
- existing PR: `#20`, head `phase6-alpha-ios-oauth-launch-fix`, base `phase6-integration`.

## Physical observation and proof boundary

The following remains a human-provided physical-device fact, not a reproduction performed by this coding agent:

> On stock iPhone Obsidian, tapping Authenticate produced no visible browser/web-authentication handoff and no Google authorization flow.

That observation proves the prior physical build did not visibly hand off OAuth. It does not by itself establish a transient-user-activation root cause. Physical iPhone OAuth launch validation for the corrected build is **NOT AVAILABLE IN THIS SESSION**.

## Rejection diagnosis

The rejected repair opened `about:blank` with target `_blank`, retained a returned `Window`/window-like object, and later mutated its location. That design did not establish the required external/default-browser boundary and could instead rely on an Obsidian-controlled browsing surface.

Obsidian 1.9.10 documents the supported developer mechanism:

`window.open(url, "_external")`

Obsidian states that `_external` bypasses Web Viewer and opens the URL in the user's default browser. Authority:

`https://obsidian.md/changelog/2025-08-18-desktop-v1.9.10/`

The plugin declares `minAppVersion: 1.11.4`, which is newer than the version introducing that mechanism.

No claim is made that asynchronous work inherently destroys WebKit user activation. The established defect in the rejected repair is the unsupported browser-boundary design, not a proven activation-expiry mechanism.

## C1–C3 corrections

### C1 — external launcher

- removed `ReservedAuthorizationWindow`, `AuthorizationWindowReservation`, the blank-window reservation, location mutation, and reservation cancellation;
- restored `AuthorizationBrowserLauncher` to the single `openExternal(url)` contract;
- added an injectable `openAuthorizationInExternalBrowser`;
- the mobile launcher hands the final authorization URL directly to `window.open(url, "_external")`;
- it ignores the return value and surfaces a clear safe error if no launch capability exists;
- the existing desktop launcher remains `window.open(url, "_blank", "noopener,noreferrer")`.

### C2 — platform routing and OAuth invariants

- `BrainGoogleDriveSyncPlugin.authenticate()` initializes the current runtime as before;
- on `Platform.isMobileApp`, it injects `{ openExternal: openAuthorizationInExternalBrowser }`;
- on desktop it passes `undefined`, preserving the runtime's validated desktop default;
- `beginGoogleAuthorization` still creates one state/PKCE transaction first and hands that transaction's final URL to the selected launcher once;
- callback registration, current-session completion delegation, token exchange, SecretStorage, and exact scope are unchanged.

### C3 — tests and evidence

Reservation-confirming tests were replaced with browser-boundary tests that prove:

- final URL plus target `_external`;
- no `about:blank`;
- no use or mutation of a returned window object;
- clear missing-capability failure;
- one transaction and one launch in order;
- preparation, synchronous launch, and asynchronous launch errors propagate;
- desktop retains `_blank` plus `noopener,noreferrer`;
- mobile selects the external launcher;
- no Node/Electron import enters the mobile launch path;
- exact `drive.file` scope, callback registration, and current-session lifecycle remain intact.

## Complete correction-pass manifest

Created:

- none.

Modified:

- `src/drive/oauth-return.ts`;
- `src/main.ts`;
- `test/phase6-alpha-ios-oauth-launch.test.ts`;
- `test/phase6-alpha-oauth-lifecycle.test.ts`;
- `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01.md`;
- `dev/evidence/_ca-output.md`.

Deleted:

- none.

`src/product/runtime.ts` required no new correction-pass edit: the existing injected-launcher default already preserves desktop behavior and accepts the mobile launcher. The ignored `main.js` build product was regenerated but is not a tracked repository change.

## Final branch manifest relative to phase6-integration

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

## Verification commands and observed results

- `npm run typecheck`: **PASS**.
- `tsc -p tsconfig.test.json` followed by focused execution of `phase6-alpha-ios-oauth-launch`, `phase6-alpha-oauth-live`, `phase6-alpha-oauth-lifecycle`, and `mobile-safety`: **PASS, 25/25**.
- `npm test`: **268/270 PASS; 2 FAIL**.
- `npm run build`: **PASS**.
- `npm run check`: typecheck PASS, then **268/270 tests; 2 FAIL**; aggregate exits before its build step.
- `git diff --check`: PASS, apart from informational working-copy LF-to-CRLF warnings.

The only full-suite failures are the same two pre-existing Windows drive-qualified path assertions established before both the original repair and this correction:

- `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`;
- `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`.

No unrelated synchronization test or code was changed to manufacture a green result.

Relevant corrected test names:

- `iOS OAuth launch: final authorization URL is handed directly to Obsidian's external-browser target`;
- `iOS OAuth launch: unavailable external-browser capability fails clearly`;
- `iOS OAuth launch: exactly one prepared transaction launches its final URL exactly once`;
- `iOS OAuth launch: preparation and synchronous or asynchronous launcher failures propagate`;
- `iOS OAuth launch: mobile selects _external while desktop retains its validated direct launcher`.

## Build artifact

- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js` size: `291948` bytes;
- generated `main.js` SHA-256: `f290076abdd02e59e11f24c3cfdff5f47ad22917aac06c5a69ad7a7ff07a9106`.

## Final static inspection and safety boundary

- mobile production OAuth path contains `_external`;
- production OAuth code contains no `about:blank` reservation;
- mobile handoff requires no returned `Window` or `WindowProxy`;
- exact scope remains `https://www.googleapis.com/auth/drive.file`;
- no Node/Electron dependency entered the mobile path;
- no OAuth secret, token, authorization code, PKCE verifier, complete authorization URL, credential, cookie, or vault content was recorded;
- no Google Cloud or Azure configuration was modified;
- no callback, pairing, synchronization, Drive semantics, release, tag, integration, `master`, performance, or Stage 3 work occurred.

## Remaining validation

Physical iPhone OAuth launch is **NOT AVAILABLE IN THIS SESSION**. After independent approval and a supervisor-controlled BRAT prerelease, a human must confirm that tapping Authenticate on stock iPhone Obsidian opens the final Google authorization request in the external/default browser, the human flow completes, and the existing callback returns to the same iPhone Obsidian session. No iPhone pairing or synchronization is authorized as part of this correction.
