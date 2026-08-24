# Stage 2A Build Session 03 / Phase 3 — Google Drive and OAuth Boundary

## Build Identification

- Build/session identifier: `Stage 2A Build Session 03 / Phase 3`.
- Repository: `woodpk/gdrive-sync-obsidian-plugin`.
- Assigned branch: `stage-2a-phase-3-drive-oauth`.
- Exact supervisor-approved baseline SHA: `e16719196269b4b31f8f1a4997722cdd1c916058`.
- Verified Phase 3 code head SHA: `6e4621345809b30e8b4161f1e52f6344f7474c33`.
- Implementation history: 24 branch commits after the approved baseline through the verified code head; Git compare confirms the branch is based directly on the approved baseline with no behind commits.
- Pull request: `#5` — `Stage 2A Phase 3 — Google Drive and OAuth boundary`.
- PR base: `master` at `e16719196269b4b31f8f1a4997722cdd1c916058`.
- PR remains open and unmerged for supervisory acceptance/integration.
- Final code verification workflow: `Phase 1 CI`.
- Final code verification workflow run ID: `32713423290`.
- Final code verification job ID: `97389515202`.
- GitHub merge/test SHA checked out by Actions: `8f55c7fd65cdfeade3ccce5780dcda2646bc4bea`.

## Phase 3 Implementation Summary

Implemented the production Google Drive/OAuth boundary behind the frozen Phase 1 `GoogleDrivePort` without modifying `src/contracts/**`.

Implemented capabilities include:

- exact `https://www.googleapis.com/auth/drive.file` OAuth authorization requests;
- high-entropy OAuth transaction state and S256 PKCE challenge/verifier handling;
- one-shot callback/session correlation with transaction expiry and mismatch rejection;
- on-device authorization-code exchange and refresh-token handling;
- device-local token/client-secret storage through Obsidian `SecretStorage` abstraction;
- hosted HTTPS callback artifact for user-controlled Azure Static Web Apps that receives only authorization return parameters, removes the query string from browser history, does not perform token exchange, and redirects to the Obsidian protocol return handler;
- Obsidian protocol-return registration seam for `obsidian://brain-gdrive-oauth`;
- production Obsidian boundary factory that composes OAuth and Drive HTTP over Obsidian `requestUrl` and secrets over `SecretStorage`;
- dedicated managed `BRAIN Sync` Drive root with stable vault identity, protocol version, and a distinct managed content-root role in Drive `appProperties`;
- explicit root-ID pairing and independent managed-root identity/protocol validation;
- Google-account identity binding using Drive user permission ID (email fallback) so account changes block remote mutations until explicit re-pair;
- missing/invalid managed root and content-root conditions surfaced as recovery-required rather than silently recreated;
- complete managed-domain recursive reconciliation listing with explicit partial completion when enumeration fails after partial progress;
- Drive `getStartPageToken` / Changes API page handling with stable Drive IDs, path evidence, and conservative recovery signaling on unusable cursors or managed-root structural changes;
- managed path observation and ambiguity detection;
- lazy range-based download through `BinaryContentSource` using bounded 256 KiB chunks;
- resumable create/update upload consuming `BinaryContentSource` incrementally with 256 KiB chunking, upload-offset recovery checks after ambiguous outcomes, and returned Drive size/MD5/revision integrity evidence;
- identity-preserving Drive move/rename using file ID plus parent/name update rather than delete/recreate;
- recoverable deletion using `trashed: true` PATCH only; no hard-delete or trash-purge path was introduced;
- bounded request concurrency, exponential backoff plus jitter, `Retry-After` handling, structured authentication/rate/quota/permission/not-found/conflict/recovery signaling, and bounded retry attempts;
- no developer telemetry and no production logging of credentials/content was introduced.

## OAuth / Platform Decisions and Official Documentation Basis

The selected shared Windows/iOS return design is a user-controlled hosted HTTPS authorization callback plus Obsidian protocol handoff, with the authorization-code exchange performed on the initiating device. This avoids desktop token transfer, avoids a developer-controlled backend, and does not depend on a desktop loopback listener for iOS.

Material current-source decisions:

- Google OAuth installed/native-app guidance: `https://developers.google.com/identity/protocols/oauth2/native-app` — external browser authorization, anti-CSRF `state`, PKCE/S256, and current redirect-flow constraints informed the transaction design.
- Google OAuth web-server guidance: `https://developers.google.com/identity/protocols/oauth2/web-server` — exact HTTPS redirect registration and authorization-code exchange requirements informed the hosted-return shape.
- Google Drive authorization scopes: `https://developers.google.com/drive/api/guides/api-specific-auth` — the implementation requests only `drive.file`.
- Google Drive resumable uploads: `https://developers.google.com/drive/api/guides/manage-uploads` — resumable-session and chunk/recovery semantics informed upload behavior.
- Google Drive downloads: `https://developers.google.com/drive/api/guides/manage-downloads` — HTTP range/media semantics informed bounded lazy downloads.
- Google Drive Changes API: `https://developers.google.com/drive/api/guides/manage-changes` and the v3 Changes reference — start-page-token/page-token behavior informed incremental change transport.
- Google Drive error guidance: `https://developers.google.com/drive/api/guides/handle-errors` — bounded exponential backoff and quota/rate handling informed transport policy.
- Obsidian Secret Storage: `https://docs.obsidian.md/plugins/guides/secret-storage` — `SecretStorage` is the supported secure plugin secret boundary rather than `data.json`; because `SecretStorage` is present from Obsidian API 1.11.4, `manifest.json` and `versions.json` were raised from `1.6.6` to `1.11.4`.
- Obsidian `requestUrl` and current plugin/mobile guidance — Google HTTP is composed through `requestUrl` in the production Phase 3 factory rather than depending on browser CORS or Node/Electron APIs.
- Current Obsidian API declaration was checked for `app.secretStorage` and `registerObsidianProtocolHandler`; required mobile runtime source remains free of Node/Electron/Windows-only imports.

The hosted callback is authentication infrastructure only. It contains no vault-content handling, token persistence, token exchange, telemetry, fetch/XHR, localStorage, or sessionStorage.

## Exact Repository Verification Results

Authoritative GitHub Actions run `32713423290`, job `97389515202`, against verified Phase 3 code head `6e4621345809b30e8b4161f1e52f6344f7474c33`:

- `npm ci` — `PASS`; 14 packages added, 15 audited, 0 vulnerabilities.
- `npm run typecheck` — `PASS`; executed `tsc --noEmit`.
- `npm test` — `PASS`; executed `tsc -p tsconfig.test.json && node --test .test-build/test/*.test.js`.
- Tests: `32` executed, `32` passed, `0` failed, `0` cancelled, `0` skipped, `0` todo.
- `npm run build` — `PASS`; executed `tsc -p tsconfig.build.json && node scripts/finalize-build.mjs`.

Phase 3 tests were explicitly discovered/executed in the decoded log. They cover hosted callback isolation, managed-root creation/identity/protocol mismatch, Changes API cursor/change identity, account-change mutation blocking, partial-listing safety, ID-preserving move, Drive trash, lazy range download, resumable incremental upload, exact OAuth scope/state/PKCE, callback mismatch/expiry, SecretStorage-backed token/client-secret handling, Obsidian requestUrl OAuth exchange, Retry-After backoff, quota exhaustion, and invalid-cursor recovery.

An earlier PR run (`32712633064`, job `97387123474`) correctly failed typecheck on a DOM `BodyInit` typing incompatibility for `Uint8Array`; that defect was repaired by normalizing portable binary request bodies to `ArrayBuffer`. A later test run exposed an overbroad synthetic query matcher that recursively returned the content root during test listing; that was a test-fixture defect and was repaired before the final successful run. Neither issue remains in the final verified head.

## Acceptance-Criteria Mapping

- `AUTH-001`–`AUTH-003`: user-owned client configuration, exact `drive.file`, no developer credentials — implemented/tested at boundary.
- `AUTH-004`–`AUTH-008`: same-device hosted-return architecture, external-browser launcher seam, state+PKCE, callback correlation — implemented/tested except final live browser lifecycle demonstration.
- `AUTH-009`–`AUTH-010`: token/client-secret material isolated behind Obsidian `SecretStorage`; no synchronized payload fields — implemented/tested.
- `AUTH-011`–`AUTH-012`: invalid/revoked authorization and account changes block remote operations/re-pair — implemented/tested at adapter/transport boundary.
- `REM-001`–`REM-009`: dedicated root, stable vault/Drive identity, explicit pairing, versioned remote metadata/content separation, missing-root recovery, no arbitrary same-name adoption — implemented/tested at boundary.
- `REM-010`: Drive history remains supplementary; no correctness dependency introduced.
- `CHANGE-004`–`CHANGE-007`: start cursor, Changes pages, conservative cursor recovery, honest full-listing completeness — implemented/tested at Drive boundary.
- Remote portions of `XFER-001`, `XFER-004`, `XFER-007`, `XFER-008`: bounded range/resumable transfer, returned integrity evidence, ambiguous upload offset recovery, backoff/rate/quota handling — implemented/tested.
- `XFER-002`: the frozen Drive boundary cannot itself re-stat a local source; it consumes the planned `BinaryContentSource`. Local source-stability validation remains with the local/orchestration phases as decomposed.
- `MOVE-002`: Drive move/rename preserves object ID — implemented/tested.
- Remote recoverable deletion: Drive trash PATCH only — implemented/tested.
- `FAIL-002`–`FAIL-004`: transient retry, quota/rate handling, storage quota safe failure — implemented/tested at Drive boundary.
- `PRIV-001`–`PRIV-004`: no telemetry/content logging/token persistence outside SecretStorage; hosted callback is content-blind — implemented/tested/integration-inspected.
- `INV-002`, `INV-010`, `INV-011`, `INV-014`: partial listing cannot be reported complete, move preserves Drive identity, secrets remain outside sync contracts, and Phase 3 runtime source has no Node/Electron/Windows-only import — verified.

## File Change Manifest From Git Compare

Created:

- `oauth-callback/index.html`
- `oauth-callback/staticwebapp.config.json`
- `src/drive/auth.ts`
- `src/drive/google-drive-port.ts`
- `src/drive/index.ts`
- `src/drive/oauth-return.ts`
- `src/drive/obsidian-http.ts`
- `src/drive/runtime.ts`
- `src/drive/transport.ts`
- `test/phase3-callback.test.ts`
- `test/phase3-changes.test.ts`
- `test/phase3-drive.test.ts`
- `test/phase3-oauth.test.ts`
- `test/phase3-obsidian-http.test.ts`
- `test/phase3-transport.test.ts`

Modified:

- `dev/evidence/_ca-output.md` — this Phase 3 evidence append only; prior evidence retained.
- `manifest.json` — minimum Obsidian app version raised to `1.11.4` for SecretStorage support.
- `tsconfig.test.json` — Phase 3 runtime modules included in test compilation.
- `versions.json` — minimum app version mapping aligned to `1.11.4`.

Deleted:

- None.

Frozen contract status: `UNCHANGED`. Git compare shows no changes under `src/contracts/**` for Phase 3.

## Live Windows / iPhone Validation Boundary

No real Google OAuth credentials, user-controlled Azure Static Web Apps deployment, Windows Obsidian interactive runtime, or iPhone Obsidian interactive runtime were available to this coding-agent session. Therefore no live authorization claim is made.

Verified in this phase instead:

- protocol/security construction against current official Google/Obsidian guidance;
- exact OAuth scope/state/PKCE/callback/token-exchange behavior by automated tests;
- hosted callback isolation by source/test inspection;
- device-local SecretStorage boundary and requestUrl composition;
- mobile-import safety by repository test;
- complete repository gate in GitHub Actions.

Carry-forward required for Phase 5/6 integration/hardening: deploy/configure the user-controlled Azure Static Web Apps callback and user-owned Google OAuth client, wire the injected authorization browser launcher to the actual Obsidian user-action surface, then demonstrate same-device authorization and full lifecycle behavior on both Windows Obsidian and iPhone/iOS Obsidian using non-disclosed user-controlled credentials.

This is a live-platform validation carry-forward, not a frozen-contract change request.

## Deviations / Blockers / Limitations

- No frozen-contract change request is required.
- No Phase 2 synchronization policy, Phase 4 local-vault behavior, Phase 5 orchestration/UI, or external BRAIN asset management was implemented.
- The exact external-system-browser launcher is intentionally exposed as a Phase 3 platform seam because current public Obsidian API exposes the protocol return handler but does not provide a documented cross-platform system-browser launcher in the inspected API surface. Final UI/lifecycle integration must bind that seam and live-test it on Windows/iOS.
- The production Phase 3 factory composes Google HTTP through Obsidian `requestUrl`; transfer responses remain bounded because the Drive adapter requests/downloads fixed-size ranges and uploads fixed-size chunks rather than whole files.
- This evidence-only commit uses `[skip ci]` after the final code head passed the full gate so evidence metadata can name the definitive run/job without creating an infinite self-referential verification cycle. No executable source/test/config change is included in the evidence-only commit.

## Final Worker Status

`COMPLETE WITH NON-BLOCKING FINDINGS`

Phase 3 production code and automated verification are complete within the assigned boundary. The only carry-forward is the explicitly permitted real Windows/iPhone authorization/lifecycle demonstration using user-controlled OAuth/callback infrastructure. No supervisory approval is claimed.
