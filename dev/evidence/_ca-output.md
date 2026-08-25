# Cumulative Coding-Agent Evidence — Phases 1–5

This file is the cumulative construction-evidence ledger for `woodpk/gdrive-sync-obsidian-plugin`. Earlier phase evidence is retained rather than declared superseded. Detailed phase records remain authoritative historical evidence at their preserved paths/commits; this ledger records their identity and carries the evidence chain forward into Phase 5.

Phase 6 and Stage 3 have **not** begun.

---

## Phase 1 — Repository Foundation and Frozen Shared Contracts

### Recovered historical evidence

The original Phase 1 `_ca-output.md` was recovered from Git history at commit:

`91f740bf3d6ad1a93524dc0a1ea77dfeba22eb9b`

That historical record identifies:

- build/session: `Stage 2A Build Session 01 / Phase 1 — Repository Foundation and Frozen Shared Contracts`;
- baseline: `0f88f8f11d10caf492237b323aec1b550fc2b052`;
- final pushed implementation SHA before the Phase 1 evidence-only commit: `40af4c2a73576f931868453f03857af25bd207d9`;
- final post-lockfile CI run: `32662829150`;
- `npm ci`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 14/14 Phase 1 tests;
- `npm run build`: PASS.

Phase 1 established the mobile-compatible Obsidian plugin foundation, reproducible build/test tooling, frozen shared contracts under `src/contracts/**`, test fakes, architecture/mobile-safety checks, and `dev/phase-1-shared-contracts.md`.

The complete recovered Phase 1 evidence remains available through the immutable historical Git object above; its prior failed intermediate CI attempts and corrective steps remain part of the record and are not rewritten here as passes.

---

## Phase 2 — Core Synchronization Semantics and Durable State

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P2.md`

That record identifies:

- session: `Stage 2A Build Session 02 / Phase 2 — Core Synchronization Semantics and Durable State`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final implementation head verified by Phase 2 CI: `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`.

Phase 2 established deterministic LOCAL/REMOTE/BASE planning, safe-union initialization, timestamp-independent truth, conservative deletion authority, conflict/three-way-merge semantics, identity-preserving move recognition, destructive safety policy, durable/versioned synchronization state, tombstones/stale-device protection, operation journaling, crash-safe verified commit order, run serialization, cancellation/pause/deferred reconciliation, and precondition validation.

The full Phase 2 implementation inventory and verification history are preserved in `_ca-output-CA-P2.md`.

---

## Phase 3 — Google Drive and OAuth Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P3.md`

That record identifies:

- session: `Stage 2A Build Session 03 / Phase 3 — Google Drive and OAuth Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- verified Phase 3 code head: `6e4621345809b30e8b4161f1e52f6344f7474c33`;
- final code verification run: `32713423290`;
- verification job: `97389515202`.

Phase 3 established the `drive.file` OAuth/Drive implementation, PKCE/state transaction integrity, device-local secret storage, same-device authorization return seams, stable managed-root identity/protocol metadata, explicit pairing and account binding, Changes API support, complete/partial reconciliation semantics, lazy bounded downloads, resumable uploads, identity-preserving Drive moves, recoverable Drive trash, and structured bounded retry/error signaling.

The full Phase 3 implementation, official-documentation basis, limitations, and verification record remain preserved in `_ca-output-CA-P3.md`.

---

## Phase 4 — Obsidian Local, Platform, and Configuration Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P4.md`

That record identifies:

- session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final corrected implementation head recorded in Phase 4 evidence: `4d06581fa91ba9643496a67296b5002925581ba2`;
- verification run for the recorded correction: `32731187369`;
- verification job: `97443556511`.

Phase 4 established the production local-vault boundary, path/exclusion/configuration policy, atomic local replacement semantics, Obsidian FileManager move/trash behavior, startup/lifecycle event handling, desktop external-reference containment checks, and mobile-safe fail-closed behavior.

### Preserved stock-iOS platform limitations

The Phase 4 evidence established two limitations that remain authoritative and were not weakened during Phase 5:

1. stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range reading for every required file type; unsafe whole-file `readBinary()` fallback is prohibited;
2. stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required safety guarantee; the implementation fails closed where proof capability is unavailable.

The full Phase 4 evidence remains preserved in `_ca-output-CA-P4.md`.

---

## Phase 5 — Integrated Product, Accepted Repairs, Group D Acceptance, and G2R Closure

### Integrated history and corrective baselines

- original Group D baseline: `70b4952c82987e1de8a1455166b090b2a4f57918`;
- accepted G1 trigger-semantics checkpoint: `c12350f0ad00a117a7116d529bc04ebedce09352`;
- prior G2 evidence-only master: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`;
- G2R correction-pass baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`;
- G2R final dynamically tested implementation/test SHA: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`.

Retained Group repair evidence:

- `dev/evidence/_ca-output-agt-CA-P5-GROUP-A-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-B-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-C-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`.

Phase 5-specific evidence:

`dev/evidence/_ca-output-CA-P5.md`

Current blocker/limitation record:

`dev/evidence/_ca-blocker.md`

### Historical checkpoints retained, not current

- original Group D dynamically tested checkpoint `ee431c408c64cddf3bcc8642c3015179fefb9b91`: 177/177 tests;
- accepted G1 checkpoint `c12350f0ad00a117a7116d529bc04ebedce09352`: 178/178 tests;
- prior G2 dynamically tested checkpoint `7aab9a90c885f33a371576ef602e7a5d352b1d07`: 209/209 tests, run `32811319438`, job `97691056148`.

Those are historical only. The current authoritative G2R gate is below.

### G2R corrections

**C1 — Scenario 30 production cross-instance lease evidence**

Scenario 30 now creates two distinct production `WebLocksRunLeasePort` instances over one controlled shared fake Web Locks manager. Two real `IntegratedProductController` runs prove that the first controller holds the production vault lock, the second cannot mutate while that lock is held, and the lock is released for later acquisition. `InMemoryRunLeasePort` is no longer Scenario 30 primary evidence.

**C2 — Scenario 47 runtime-owned notification delivery evidence**

Scenario 47 now initializes `Phase5ProductRuntime` with controlled external boundaries and exercises the runtime-owned controller surface subscription. Ordinary pause/resume surface transitions produce no host notification; a recovery-required transition traverses the runtime-owned `MeaningfulNotificationFilter` and reaches `ProductRuntimeHost.notify`. The primary acceptance path no longer reconstructs that listener/filter wiring in the test.

**C3 — cumulative evidence preservation**

The complete Phase 1–4 cumulative text from `c12350f0ad00a117a7116d529bc04ebedce09352:dev/evidence/_ca-output.md` is restored above without condensation or deletion. Phase 5 is updated after those preserved sections rather than replacing earlier phase evidence.

### Acceptance map

`test/phase5-acceptance-map.test.ts` retains exact scenarios 1 through 50 and source-verifies each primary executable test reference. Rows 30 and 47 now point to the corrected production-path tests described above. The acceptance-map self-check passed in the final G2R gate.

### Final G2R dynamically tested implementation/test checkpoint

Exact SHA:

`3aab3647b57baad7df0b31cc40042325fcfa0e4f`

Authoritative GitHub Actions gate:

- workflow: `Phase 1 CI`;
- run ID: `32854213913`;
- job ID: `97822114191`;
- clean checkout confirmed exact SHA `3aab3647b57baad7df0b31cc40042325fcfa0e4f`;
- `npm ci`: **PASS** — 14 packages installed, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 209 tests / 209 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**.

The actual job log was inspected. Scenario 30 passed as test 169; corrected runtime-owned Scenario 47 passed as test 173; the acceptance-map self-check passed as test 121.

No production source file changed during G2R.

### G2R exact change manifest

Correction-pass compare baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`.

### Created

- none.

### Modified

- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase5-acceptance-map.test.ts`
- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P5.md`
- `dev/evidence/_ca-blocker.md`
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`

### Deleted

- none.

### Remote Branches Deleted

No branches were created or deleted during G2R.

Historical Group D cleanup deleted:

- `agt-stg-2a-phase-1-01`;
- `ca-c1-verification`;
- `master-temp-should-fail`;
- `phase5-fix-group-a`;
- `phase5-fix-group-b`;
- `phase5-fix-group-c`;
- `stage-2a-integration-234`;
- `stage-2a-phase-2-core-sync-state`;
- `stage-2a-phase-3-drive-oauth`;
- `stage-2a-phase-4-obsidian-local`;
- `stage-2a-phase-5-integrated-product`.

Historical cleanup evidence:

- workflow: `Group D Branch Cleanup`;
- run ID: `32805742158`;
- job ID: `97675382231`;
- result: PASS.

Final remote branch enumeration is verified after the evidence-only commits and recorded in the agent handoff. Required state remains exactly `master`.

---

## Current Unavailable Live / Physical Validation

These are **not** recorded as passes:

- real Windows Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real iPhone/iOS Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real-user Google OAuth authentication — `NOT AVAILABLE IN THIS SESSION`;
- deployed Azure callback validation — `NOT AVAILABLE IN THIS SESSION`;
- live production Google Drive synchronization — `NOT AVAILABLE IN THIS SESSION`;
- physical network interruption during transfer — `NOT AVAILABLE IN THIS SESSION`;
- physical disk-full behavior — `NOT AVAILABLE IN THIS SESSION`;
- physical large-vault / large-file stress testing — `NOT AVAILABLE IN THIS SESSION`.

---

## Current Completion State

`COMPLETE WITH NON-BLOCKING FINDINGS`

G2R C1, C2, and C3 are dynamically verified at `3aab3647b57baad7df0b31cc40042325fcfa0e4f`. Phase 5 scenarios 1–50 retain primary executable evidence, including corrected Scenario 30 and Scenario 47 mappings. Remaining findings are the two explicitly preserved stock-iOS fail-closed platform limitations and the live/physical validations marked `NOT AVAILABLE IN THIS SESSION`. No supervisory approval is claimed.

---

## Phase 6 — agt-CA-P6-C-01 — Drive / OAuth / Security / Remote Failure

### Identification and branch discipline

- Agent: `agt-CA-P6-C-01`.
- Assignment: Google Drive / OAuth / Security / Remote-Failure Hardening.
- Repository: `woodpk/gdrive-sync-obsidian-plugin`.
- Required launch baseline: `origin/master == 54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1` — **VERIFIED** before branch creation.
- Authoritative Phase 5 dynamically tested implementation/test checkpoint beneath evidence-only commits: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`.
- Isolated branch: `phase6-c-drive-security`, created exactly from required master baseline.
- Final dynamically tested Agent-C implementation/test head: `782d95e09c4961de8699bf142aae20886608567a`.
- Draft PR: `#13` — `Phase 6 C — Drive / OAuth / Security hardening`, targeting `master`; not merged.
- Stage 3: **NOT PERFORMED**.

The branch-local evidence append is an evidence-only commit after the dynamically tested Agent-C implementation/test head. As with prior evidence-only commits, a file cannot embed the SHA of the commit that hashes that same file without self-reference; the final branch evidence head is therefore independently verifiable from GitHub and is reported in the worker handoff.

### Authority and repository ingestion

Before production modification, Agent C inspected the current repository and required authorities, including the target-system specification, Stage 1 decomposition, decision register, Phase 1 frozen shared contracts, current project state, Phase 6 supervisor handoff, Phase 3 evidence, Phase 5 evidence, current Drive/OAuth production code and tests, callback source/configuration, and current external integration seams. Current repository facts, not predecessor prose, controlled implementation mechanics.

### Exact change manifest

Modified production/security surface:

- `src/drive/auth.ts` — added fail-closed exact-scope validation for newly exchanged tokens, persisted tokens, and refreshed tokens.
- `oauth-callback/staticwebapp.config.json` — tightened callback CSP with `base-uri 'none'`, `form-action 'none'`, and `frame-ancestors 'none'`; removed unused `style-src` permission.

Created Agent-C tests:

- `test/phase6-c-auth-security.test.ts`.
- `test/phase6-c-callback-security.test.ts`.

Modified evidence only after successful CI:

- `dev/evidence/_ca-output.md` — this append; all prior Phase 1–5 evidence retained.

No frozen contract, core, state, local, product, `src/main.ts`, planning/specification/decision, project-state, or peer-agent file was modified.

### Defect found and repaired

**Owned defect — OAuth token-grant broadening was not rejected exactly.**

The authorization request already requested exactly `https://www.googleapis.com/auth/drive.file` with `include_granted_scopes=false`, but the token-exchange acceptance check only required the returned scope list to *contain* `drive.file`. A response granting `drive.file` plus a broader Drive scope therefore could have been persisted. Refresh and previously persisted token use likewise did not re-enforce exact-scope equality.

Repair:

- require the effective granted scope set to contain exactly one scope, `https://www.googleapis.com/auth/drive.file`;
- reject a broadened authorization-code token grant before persistence;
- clear and refuse any previously persisted broader-scope token before remote use;
- clear and refuse a refresh response that broadens an exact grant;
- preserve valid refresh behavior when Google omits `scope` and the existing stored grant is already exact.

Regression evidence: Agent-C tests 210–213 in CI run `32878440429` all passed.

### §13.6 authentication and security evidence

Applicable requirements include `AUTH-001`–`AUTH-012`, `PRIV-001`–`PRIV-004`, `INV-011`, `INV-014`, and the authentication/security completion-evidence requirements.

Verified automated/source evidence:

- authorization request uses exactly `https://www.googleapis.com/auth/drive.file`; existing Phase 3 test 113 passed;
- broader token grants now fail closed and are not persisted; Agent-C test 210 passed;
- pre-existing broader-scope persisted token is cleared before remote use; Agent-C test 211 passed;
- refresh cannot silently broaden the grant; Agent-C test 212 passed;
- omitted refresh scope safely inherits only an already-exact stored scope; Agent-C test 213 passed;
- high-entropy transaction state and PKCE S256 remain exercised by test 113;
- state mismatch fails before token exchange; test 114 passed;
- device-local SecretStorage token/client-secret handling remains exercised by test 115;
- production Obsidian HTTP boundary remains `requestUrl` based and mobile-neutral; test 117 passed;
- wrong-account production behavior remains explicit repair/re-pair required; test 107 and integrated test 123 passed;
- revoked authentication remains fail-closed through integrated execution; tests 122 and 138 passed;
- frozen synchronized payload contracts expose no authentication-secret fields; test 37 passed;
- configuration policy protects secrets/device identity/synchronization state; test 31 passed;
- diagnostic export remains metadata-only; test 100 passed;
- audit remains bounded metadata, not full content; test 175 passed;
- no developer telemetry or vault-content transport was found in the owned Drive/OAuth/callback source inspected for this assignment;
- no committed production OAuth client credential/token literal was found in the owned production source; client IDs/secrets are supplied through user configuration/SecretStorage rather than embedded credentials.

System/external-browser behavior remains represented by the `AuthorizationBrowserLauncher.openExternal` production seam and the same-device Obsidian protocol return path. Actual device browser behavior is a live-validation item below and is not claimed from fakes.

### Callback evidence

The actual `oauth-callback/**` source was inspected.

Automated/static evidence now proves that the represented deployment artifact:

- consumes only OAuth return `state`, `code`, or `error` parameters;
- immediately removes the query string from browser history;
- hands the OAuth return to `obsidian://brain-gdrive-oauth`;
- contains no access-token, refresh-token, client-secret, token-exchange, Drive API, fetch/XHR, localStorage, sessionStorage, IndexedDB, vault-content, note-content, or binary-payload capability;
- has `Cache-Control: no-store` and `Referrer-Policy: no-referrer`;
- is CSP-limited to no default resource loading, inline bootstrap script, Obsidian navigation, no base URI, no forms, and no framing.

Agent-C callback tests 214–215 passed. This is source/deployment-artifact evidence only; the live Azure deployment was not available and is not claimed as validated.

### Remote-domain / identity / failure evidence

Applicable requirements include `REM-001`–`REM-010`, `CHANGE-004`–`CHANGE-007`, `MOVE-002`, remote portions of `FAIL-002`–`FAIL-004`, and `INV-002`/`INV-010`.

Existing production-boundary and integrated tests were inventoried rather than duplicated. The clean Phase 6 CI gate reconfirmed:

- dedicated managed-root creation with stable vault/protocol/config-role metadata — test 105;
- Changes API start/incremental cursor path retaining Drive object identity — test 106;
- explicit account binding and wrong-account blocking — test 107;
- managed-root identity/protocol mismatch detection — test 108;
- partial reconciliation listing never reporting completeness — test 109;
- ID-preserving remote move and recoverable Drive-trash transport — test 110;
- invalid Changes cursor emits conservative recovery signal — test 120;
- integrated safe fallback from invalid cursor to full reconciliation with fresh cursor commit — test 162;
- incomplete remote/local observation cannot become deletion authority — test 163;
- missing expected managed root blocks integrated planning/mutation rather than silent recreation — test 165;
- managed-object cross-domain/out-of-domain/provenance ambiguity is recovery-required rather than guessed — tests 131–136;
- integrated snapshot/planning domain remains confined to the paired managed BRAIN Sync root — test 143.

The Drive adapter still contains no same-name-folder auto-adoption path; pairing uses explicit root identity and expected vault identity. No path in the inspected owned production code manages the external BRAIN asset repository as part of the BRAIN Sync domain.

### §13.4 remote-transfer evidence

Applicable requirements include remote portions of `XFER-001`, `XFER-002`, `XFER-004`, `XFER-007`, `XFER-008`, plus `FAIL-002`–`FAIL-004`.

The clean Phase 6 CI gate reconfirmed production Drive-boundary/integrated evidence for:

- lazy range-chunked downloads — test 111;
- resumable create consuming bounded chunks and verifying returned size/integrity evidence — test 112;
- bounded Retry-After handling — test 118;
- Drive storage quota exhaustion classified without destructive retry/fallback — test 119;
- authentication revocation after lazy transfer begins stops without cursor/local authoritative commit — test 138;
- transient failure after lazy transfer begins becomes deferred and does not commit cursor/local authority — test 139;
- rate limit after lazy transfer begins remains retryable/deferred with preserved taxonomy — test 140;
- local source change/staleness is rejected by the local/transfer precondition boundary — tests 19, 43, and 44;
- uncertain mutation outcomes remain non-authoritative in durable state — test 62;
- operation success remains ordered behind durable integrity-verified receipts — tests 61 and 102.

Inspection of `GoogleHttpTransport` reconfirmed bounded concurrency, exponential backoff with jitter, `Retry-After`, 429/rate classification, 5xx/network retry bounds, 401 token invalidation, 410 cursor recovery, quota exhaustion, permission/conflict/not-found taxonomy. Inspection of the resumable Drive implementation reconfirmed that chunk mutation requests do not blindly retry ambiguous writes: the adapter queries resumable-session offset/outcome before continuing or returning uncertainty/recovery.

No HTTP success response by itself was promoted to authoritative synchronization success; final authority remains behind transfer/content verification and the frozen execution/commit boundary.

### Remote failure / ambiguity matrix

Automated/source evidence in the current suite covers:

- network/transient failure → bounded retry then safe deferred/transient result;
- authentication revoked → authentication-required, token cleared, no authoritative remote mutation completion;
- wrong Google account → explicit repair/re-pair required;
- missing/inaccessible managed root → recovery/error signal, no silent recreation;
- unsupported/missing protocol metadata → recovery/incompatible-protocol handling;
- lost/invalid cursor → recovery/full-reconciliation fallback, not deletion evidence;
- partial listing → explicit partial completeness, not absence/deletion authority;
- ambiguous resumable upload outcome → session-offset/outcome query before continuation;
- 429/rate-limit exhaustion → bounded retry/rate-limited taxonomy;
- 5xx/transient exhaustion → transient failure;
- Drive quota full → quota-exhausted with no destructive fallback;
- remote identity/provenance ambiguity → conflict/recovery, never guessed.

No cross-boundary production defect was exposed by this wave's full regression gate.

### Test inventory and tests added/strengthened

Agent C inventoried existing Phase 3 OAuth, callback, Changes API, Drive, transport tests and Phase 5 auth/recovery/Drive-domain/transfer integration tests. Existing tests that already exercised the production boundary were retained rather than duplicated.

Added:

- `test/phase6-c-auth-security.test.ts` — 4 exact-scope/fail-closed regression tests;
- `test/phase6-c-callback-security.test.ts` — 2 callback isolation/deployment-policy tests.

Full suite grew from the Phase 5 authoritative 209 tests to 215 tests. All 215 passed in the Agent-C clean gate.

### Complete validation / build command history

Local/container execution of repository npm commands was **NOT EXECUTED** because the available local execution environment could not resolve/access GitHub to obtain the repository. No local pass is claimed.

Authoritative clean-checkout validation was executed by the draft-PR GitHub Actions workflow:

- workflow: `Phase 1 CI`;
- run ID: `32878440429`;
- job ID: `97901931603`;
- PR: `#13`;
- branch implementation/test head: `782d95e09c4961de8699bf142aae20886608567a`;
- exact PR merge SHA checked out by Actions: `7222424a72374b044c4afa6b90a79b18f39dba97`;
- `npm ci` — **PASS**; 14 packages added, 15 audited, 0 vulnerabilities;
- `npm run typecheck` — **PASS** (`tsc --noEmit`);
- `npm test` — **PASS**; 215 tests, 215 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo;
- `npm run build` — **PASS** (`tsc -p tsconfig.build.json && node scripts/finalize-build.mjs`);
- workflow/job conclusion — **SUCCESS**.

`npm run check` was not separately executed because the repository CI runs its three component commands (`typecheck`, `test`, `build`) individually and all passed in the same clean checkout.

No intermediate test/build failure occurred in this Agent-C implementation gate. No failed run has been omitted.

### Live / physical validation — explicitly not executed

The following remain:

`NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / LIVE SERVICE VALIDATION`

1. **Real-user Google OAuth on Windows Obsidian**
   - Prerequisites: user-owned Google OAuth client configured for exact `drive.file`; Windows Obsidian with the plugin; registered callback/return URI.
   - Actions: start authorization from the plugin, verify system/external browser opens, authenticate, approve consent, return through callback/Obsidian protocol, confirm authenticated account and explicit managed-root pairing.
   - Expected: no desktop-token-import step; exact requested scope; successful state/PKCE correlation; credentials stored only in device SecretStorage.
   - Safety observations: wrong state/account must fail closed; local vault remains usable if auth fails.
   - Pass criteria: same-device authentication succeeds and remote mutation remains blocked until correct pairing/identity validation.
   - Evidence: screen capture/redacted logs showing account hint, scope consent, callback return, final authenticated/pairing state; never capture tokens/secrets.

2. **Real-user Google OAuth on iPhone/iOS Obsidian**
   - Prerequisites: same user-owned OAuth app/callback; iPhone with supported Obsidian/plugin version.
   - Actions: initiate auth entirely on iPhone; complete consent in external/system browser; return to Obsidian; validate account and pair remote.
   - Expected: no desktop token transfer or desktop-generated credential code; state/PKCE validation succeeds on initiating device.
   - Safety/pass criteria: identical fail-closed requirements as Windows; local editing remains available if auth/return fails.
   - Evidence: redacted iPhone screen recording/screenshots and plugin status/audit metadata without secrets.

3. **Deployed Azure Static Web Apps callback validation**
   - Prerequisites: user-controlled Azure Static Web Apps deployment from `oauth-callback/**`, registered HTTPS redirect URI.
   - Actions: inspect deployed response headers; execute valid and invalid/missing callback queries; inspect browser history/navigation and hosting logs/settings where available.
   - Expected: `no-store`, `no-referrer`, hardened CSP; valid return redirects only to Obsidian protocol; malformed return stops; no token exchange/storage, vault traffic, telemetry, or content handling.
   - Pass criteria: deployed behavior matches checked-in artifact and no authorization material persists server-side.
   - Evidence: redacted response headers, deployment commit/version, callback navigation result, and hosting configuration/log evidence excluding authorization codes/tokens.

4. **Live production Google Drive synchronization / remote domain**
   - Prerequisites: authenticated supported device, dedicated test BRAIN Sync remote, non-production test vault content.
   - Actions: create/pair root explicitly; upload/download; rename/move; trash; perform Changes reconciliation; externally perturb managed structure; test missing root in a disposable remote.
   - Expected: stable Drive IDs survive moves; only managed domain is touched; missing/ambiguous root/domain enters recovery; no same-name auto-adoption; external BRAIN asset repository remains untouched.
   - Pass criteria: behavior and Drive IDs/metadata match required semantics with no destructive fallback.
   - Evidence: redacted Drive object IDs/appProperties, plugin preview/audit, before/after object metadata.

5. **Physical network interruption / ambiguous remote mutation**
   - Prerequisites: disposable live Drive test object and ability to interrupt connectivity during upload.
   - Actions: interrupt network during resumable upload at multiple points, restore connectivity, resume/reconcile.
   - Expected: no duplicate/blind create, session offset/outcome is re-established, uncertain work never becomes authoritative success prematurely.
   - Pass criteria: final bytes exactly match intended content or operation remains safely retryable/recovery-required; no data loss/duplicate mutation.
   - Evidence: redacted operation/audit timeline, Drive object count/ID, final content hash/size.

6. **Live Drive rate/quota conditions**
   - Prerequisites: controlled test environment capable of producing real 429/quota responses without risking production data.
   - Actions: exercise service throttling/quota failure and retry behavior.
   - Expected: Retry-After/backoff respected, retry remains bounded, quota failure stops affected writes, local content remains intact.
   - Pass criteria: no destructive fallback or cursor/authority advancement for failed work.
   - Evidence: redacted response status/retry metadata and plugin audit/status.

### Secrets / telemetry inspection result

Owned production and callback source inspection found no developer-owned OAuth credentials, embedded access/refresh tokens, external analytics/telemetry endpoint, vault-content logger, or callback-side token/content persistence. Existing synchronized contracts/configuration and integrated metadata-only audit/diagnostic tests passed in the full gate.

### Cross-boundary supervisor repairs

`NONE DISCOVERED`.

No defect requiring edits to `src/contracts/**`, `src/core/**`, `src/state/**`, `src/local/**`, `src/product/**`, or `src/main.ts` was exposed by Agent C's hardening and full regression gate. Therefore no `CROSS-BOUNDARY SUPERVISOR REPAIR REQUIRED` item is open from this workstream.

### Remaining findings / blockers

- Live Windows/iPhone OAuth, deployed Azure callback, live Drive synchronization, and physical network/quota conditions remain unexecuted exactly as stated above; no fake/local fixture is represented as live-service proof.
- The two stock-iOS platform limitations carried from Phase 4/5 remain outside Agent C's owned Drive/OAuth surface and were not altered.
- No automated Agent-C blocker remains in the owned surface after repair and regression.

### Completion status

`COMPLETE WITH NON-BLOCKING FINDINGS`

Agent C completed the assigned automatable Drive/OAuth/security/remote-failure hardening, repaired the owned exact-scope acceptance defect, strengthened callback isolation, passed the full clean repository gate, pushed the isolated branch, created draft PR #13, and stopped without merging or performing Stage 3.
