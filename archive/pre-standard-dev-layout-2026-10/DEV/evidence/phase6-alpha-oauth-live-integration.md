# Phase 6 Alpha — Live OAuth Repair Integration Evidence

Status: `APPROVED AND INTEGRATED`; Phase 6 supported-runtime validation remains in progress; Stage 3 has not begun.

## Repair identity

- repair agent: `codex-P6-ALPHA-OAUTH-LIVE-01`
- repair branch: `phase6-alpha-oauth-live-fix`
- required repair base: `phase6-integration` @ `8a0ec575f808c610c29ee4e307deb8194ae451c9`
- approved repair commit: `c9b2583b9b4ad29905ea35cca1203f4bf7851a86`
- repair commit parent: `8a0ec575f808c610c29ee4e307deb8194ae451c9`
- integration method: fast-forward only
- post-integration production/test tree: `c9b2583b9b4ad29905ea35cca1203f4bf7851a86`
- `master` remained unchanged
- Phase 6 integration PR `#15` remained open, draft, and unmerged

The later unrelated user commit on `phase6-alpha-oauth-live-fix` was deliberately excluded from integration. Only the supervisor-approved repair commit above was fast-forwarded into `phase6-integration`.

## Live supported-runtime findings and repair

Real Windows Obsidian testing established two OAuth defects/diagnostic gaps:

1. a falsy/null return from the browser-open call was incorrectly treated as proof that the system browser did not open, even though the browser had actually opened;
2. the configured Google OAuth Web application client reached token exchange but failed with only the generic surface result `token-exchange-failed`.

The bounded repair:

- treats falsy/null browser-open return values as inconclusive rather than as launch failure, while preserving actual thrown launch errors;
- preserves Google HTTP 4xx responses through the Obsidian `requestUrl` bridge using `throw: false`;
- exposes only structured, sanitized OAuth diagnostics;
- wires the Google Web client secret through Obsidian SecretStorage only;
- adds masked Save/Clear controls for that device-local secret;
- preserves the exact `https://www.googleapis.com/auth/drive.file` scope requirement;
- preserves the previously approved one-handler OAuth protocol lifecycle repair.

Sanitized live token-exchange evidence before the root-cause repair:

- phase: `token-exchange`
- HTTP status: `400`
- OAuth error: `invalid_request`
- sanitized description: `client_secret is missing.`

Confirmed root cause: the configured Google OAuth client is a Web application client using the Azure HTTPS callback, and the production token exchange did not supply the client secret even though the OAuth session already supported SecretStorage-backed secret use.

After wiring the secret-storage path and entering the secret directly into Obsidian SecretStorage on the Windows device, the full live OAuth path completed successfully:

- system browser authorization: PASS
- Google user authorization/consent: PASS
- deployed Azure callback return: PASS
- Obsidian protocol return: PASS
- Google token exchange: PASS
- exact `drive.file` scope enforcement: PASS
- Obsidian completion surface: `Google authentication completed.`
- token-record presence: confirmed only as a boolean; token value was not read

No authorization code, PKCE verifier, access token, refresh token, client-secret value, password, MFA value, cookie, or vault content was recorded in source, diagnostics, evidence, test output, or Git.

No managed remote was created or paired. No `Sync Now`, `Verify/Reconcile Vault`, automatic synchronization, or vault synchronization was performed during this repair validation.

## Repair verification before integration

The approved repair reported and the supervisor directly reviewed:

- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: PASS
- `npm test`: PASS — 248/248 tests, 0 failed, 0 cancelled, 0 skipped, 0 todo
- `npm run build`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- built `main.js` size: `286740` bytes
- built `main.js` SHA-256: `ed3a0bc41236b6fb988e3018b928fca36fc6e8fcacb05507eebf10c905ab4993`
- installed Windows Obsidian artifact matched the built size/hash exactly
- existing `data.json` was preserved

Supervisor review result for the bounded repair: `APPROVE`.

## Fresh combined integration CI

After the approved commit was fast-forwarded into `phase6-integration`, PR `#15` generated a fresh combined clean-checkout gate.

- workflow: `Phase 1 CI`
- run ID: `32995246926`
- job ID: `98262611241`
- PR head: `phase6-integration` @ `c9b2583b9b4ad29905ea35cca1203f4bf7851a86`
- unchanged `master` base: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- exact generated PR merge SHA checked out by Actions: `cde66410a9efc5086741dc53859cd8e150aade9e`
- checkout log: `Merge c9b2583b9b4ad29905ea35cca1203f4bf7851a86 into 54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- Node: `v22.23.2`
- npm: `10.9.8`
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: PASS
- `npm test`: PASS — 248/248 tests, 0 failed, 0 cancelled, 0 skipped, 0 todo
- `npm run build`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- generated `main.js` size: `286740` bytes
- generated `main.js` SHA-256: `ed3a0bc41236b6fb988e3018b928fca36fc6e8fcacb05507eebf10c905ab4993`
- workflow/job conclusion: `SUCCESS`

The fresh integration artifact exactly reproduced the physically installed and successfully authenticated Windows artifact.

## Current Phase 6 state

The following supported-runtime evidence is now established:

- Windows Obsidian plugin packaging/install/load: PASS
- real-user Google OAuth on Windows: PASS
- deployed Azure callback return on Windows: PASS
- OAuth protocol-handler lifecycle on Windows: PASS

The following remain outside this completed OAuth repair and are not represented as passes here:

- managed remote creation/pairing and live Drive-domain validation
- first synchronization preview/execute
- broader real Windows synchronization scenarios
- real iPhone/iOS Obsidian validation
- physical interruption/disk-full/large-vault and other remaining Phase 6 acceptance work

Stage 3 remains unauthorized and has not begun.
