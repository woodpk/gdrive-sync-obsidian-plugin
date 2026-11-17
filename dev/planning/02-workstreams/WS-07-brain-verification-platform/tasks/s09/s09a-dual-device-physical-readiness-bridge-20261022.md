# S09A — Two-device PHX-CI physical readiness bridge (2026-10-22)

## Status

**IMPLEMENTED AND PHX-CI SOFTWARE-QUALIFIED; NO PHYSICAL DISPATCH.**

Owner-directed continuation of S09A's real Windows/iPhone testing. Do not issue a Reviewer handoff without an explicit subsequent Owner instruction.

The shipping BRAIN 0.1.19 artifact is unchanged. The separate BVP validation artifact is pinned to source `2bf51ca15aec9c752e3ac7769fcf3ac237df99df`, main.js SHA-256 `90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7`, manifest SHA-256 `d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965`. The Owner's staging run passed, but no iOS validation-only artifact is confirmed installed.

## Current implemented bounded scope

- First published new contract tests under `test-platform/test/s09a-physical-dual-bridge.test.ts` before the bridge correction.
- Registered the new module under the existing S09 deterministic PHX-CI test family; no second harness.
- `test-platform/test/batteries/phxci-physical-bridge.ts` accepts the **exact** pre-registered `s09a-dual-device-readiness` battery in the existing disposable Windows BVP plugin relay, with exact private-to-public per-device identity matching.
- The new strict two-device evidence projection requires the two source-derived logical device identities, checks each registered observation/capture before redacting private captures, pseudonymizes the two identities including installation-observation keys, preserves a missing-iOS BLOCKED result, and refuses a false COMPLETED result without both installed-device measurements.
- Added a separate CLI entrypoint `--run-approved-s09a-dual-readiness` with S09A-specific physical approval and installed-iOS confirmation gates. The repository PowerShell operator now exposes `-RunS09ADualPhysicalReadiness`; its corrected single-dispatch/owner-consent implementation is included in the later accepted descendant source and PHX-CI qualification recorded below.
- Existing Windows-only physical smoke semantics, per-device lease, C:\\temp scratch, PHX-CI source guard, release hashes, and BVP architecture isolation are retained.
- NO scenarios beyond the existing two observe/assert pairs are authorized; no production synchronization action, first sync, fixture write, network/offline manipulation, or Google authorization mutation is authorized.

## Nonphysical qualification

Use a fresh isolated clone of `fix/s09-bvp-live-controller-20261022` at the frozen candidate commit, a pinned `69c4aa077d4a1a46d1e85e59f39d36285be99e83` PHX-CI runtime, and the existing repository-controlled `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1 -ExpectedSourceSha <frozen-SHA>` **with no physical switches**.

The operator's default focused stage is `npm run test:bvp-root`; the repository stage runs `npm test`. Both run under PHX-CI and publish original canonical evidence. Original PHX-CI software qualification **PASS**: frozen implementation `c51791b9f6cf6336398d318f0330bb7cc7e65d29`, run `f8dd3c00-74fd-4607-813c-0383c65ef603`, published evidence commit `2669543eb7339cb099429f20fee46a9a88cb4f31`; 484 focused tests and 1,292 repository tests passed, 11/11 stages PASS. Preserve this run; do not rerun solely for administration. Any subsequent substantive operator implementation requires its own focused qualification.

## Outstanding physical gates

1. Owner-authorized installation of **validation-only**, not shipping, `main.js`, `manifest.json`, `build-identity.json` into the already isolated iPhone/iPad Obsidian test vault, after backup/identity checks. Shipping build already installed is insufficient.
2. Proof of independent on-device OAuth and explicit pairing to the intended disposable managed test remote on iOS; no auth token export.
3. Repository-controlled S09A-only PHX-CI physical operator switch is implemented (initial physical-switch commit `3bb4017309949f03f11c8a0976d89977e24a56be`; corrected single-dispatch/owner-consent commit `f272b41aaf5e23f01d6b73731797bfc15a474eee`). The previously pending software-qualification requirement is **SATISFIED** by later descendant source `b1ef092cf5ce73c7811b5726ee803add2538df2c`, PHX-CI run `cf399e60-fcdf-4165-b947-3fbc14e7d9ad`, evidence commit `479b660e97df95387492346431e949c10fa4daee`: 634/634 focused tests and 1,292/1,292 product tests passed, including the S09A dual-physical operator and safety cases. The physical path still requires exact owner `YES`, a local iOS device ID, existing mailbox confirmation, and both installed validation-only plugins. No physical S09A operator execution has occurred.
4. Exact private device ID supplied to the controller only in its authorized local process, redacted public SHA-256 pseudonyms in evidence. Device ID must not be misrepresented as a token.
5. Existing and owned BVP command-mailbox root confirmation; it may create control-plane metadata records, even though the readiness scenario does not synchronize product files.
6. Real installed source SHA/manifest/artifact checks and acknowledgement of the explicit BVP-only metadata-effect budget; bound run ID, PHX publication, live device receipts, no duplicate dispatch after uncertainty.
7. If actual iOS status differs from expected idle-ready, preserve the observed FAIL/BLOCKED rather than changing the assertion or treating the missing mobile status-bar UI as success.

## Relevant negative limits

No new test framework, test runner, GitHub Actions, extra physical coordination service, PHX-CI runtime or configuration change, personal vault operation, or Stage 3 authorization. Preserve the owner-deferred Reviewer handoff.

## 2026-10-22 operator continuation

Test-first operator contract commit: `e3eeaedb97475e6e40d89f1b82463461e1799f77`. Physical switch implementation: `3bb4017309949f03f11c8a0976d89977e24a56be`; corrective single-dispatch/owner-consent commit: `f272b41aaf5e23f01d6b73731797bfc15a474eee`. Existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` retains default nonphysical PHX software qualification and the Windows-only route. The software-qualification prerequisite for `-RunS09ADualPhysicalReadiness` is now satisfied by the later descendant qualification recorded in the 2026-11-16 reconciliation below; the switch remains prohibited until both iOS/Windows validation-only artifacts are installed and observed and exact physical effects are separately approved. The `0.1.19` shipping artifact and the original S09A PHX software PASS remain unchanged.

## 2026-10-23 — BRAT iOS prerelease cross-device provenance correction (historical Builder state; later qualification reconciled)

The Owner reports that **BVP-only** BRAT prerelease `0.1.20-bvp.1` is now installed on the iPhone. This is an operator report, **not** physical proof of isolated-vault identity, executable bytes, on-device Google OAuth, pairing, runtime readiness, or device receipts. Nothing authorizes a physical battery yet. The GitHub release is a TEST-ONLY prerelease.

The already PHX-CI-qualified, disposable Windows BVP installation must remain unchanged. It has source `2bf51ca15aec9c752e3ac7769fcf3ac237df99df`, main.js SHA-256 `90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7`, and manifest SHA-256 `d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965`. The published iOS BRAT prerelease has the **same main.js bytes and source** but manifest SHA-256 `1788bcaa4a9dd05d22ec03b0ba56bd3a72d4fa4541e2e5ec74c1a43253ce54a5` because its version metadata identifies `0.1.20-bvp.1`. The prior controller's single-manifest assumption would have rejected this legitimate iOS receipt as a mismatch.

**Bounded correction requirements:** (1) Maintain separate immutable, allowlisted source/main/Windows-manifest/iOS-manifest identities, never accept a version string or owner-provided hash as independent proof. (2) Each real device must measure its installed files locally, and the PHX-CI-controlled live runner must correlate each resulting receipt against that device's exact expected manifest, common source, main hash, command and private device identity; no downgrades or hash bypasses. (3) Evidence projection must preserve the distinct verified manifest hashes and one-way pseudonymize private device IDs. Missing/mismatching receipts must remain FAILED/BLOCKED and may never fabricate physical readiness. (4) Preserve shipping plugin, installed Windows plugin, scenario vocabulary, OAuth tokens, managed root, relay scope, and PHX-CI runtime unchanged. (5) Preserve explicit owner consent, no Reviewer dispatch, and no physical S09A until new substantive PHX-CI PASS evidence and installed-device readiness gates are satisfied.

**Test-first coverage:** exact paired hashes PASS; Windows/iOS wrong/stale manifest FAIL; source/main/device mismatch FAIL; missing/extra/invalid per-device policy FAIL; missing iOS receipt retains blocked semantics; privacy projection rejects forged release/source/artifact claims and cannot leak raw identities. Tests were committed before the implementation change. New code is limited to external BVP controller, live-runner receipt correlation, static test-only release identities, and tests. The installed BVP plugin source and emitted executable remain frozen.

**Historical qualification status at 2026-10-23: PENDING.** At that point, no new PHX-CI run had yet qualified the material correction, and the prior 11/11 PASS run `712959ed-e64c-40ae-b06f-bfd7eccf0244` remained evidence only for its exact earlier source. That historical fact is preserved.

## 2026-11-16 — Administrative qualification reconciliation

The pending S09A operator-software qualification is now reconciled as **SATISFIED BY LATER DESCENDANT PHX-CI EVIDENCE**. Corrected operator commit `f272b41aaf5e23f01d6b73731797bfc15a474eee` is an ancestor of accepted source `b1ef092cf5ce73c7811b5726ee803add2538df2c`. PHX-CI run `cf399e60-fcdf-4165-b947-3fbc14e7d9ad` qualified that descendant under runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, with 634/634 focused tests and 1,292/1,292 product tests passing; the focused run explicitly included the S09A dual-device physical route, owner-gated PHX-CI-only entrypoint, device-identity validation, fail-closed missing-iOS behavior, privacy projection, and physical-scope containment cases. Original evidence is preserved at commit `479b660e97df95387492346431e949c10fa4daee` under `dev/test-results/cf399e60-fcdf-4165-b947-3fbc14e7d9ad/`.

This reconciliation does **not** rewrite the original blocked run or its failure, does not claim that the S09A physical battery has executed, does not establish live iPhone/Google compatibility, and does not authorize physical dispatch. It removes only the obsolete requirement to perform another software-only PHX-CI run before beginning the already-defined iPhone installation/binding and owner-gated physical-readiness setup. Per the operating protocol's administrative-rerun rule, no redundant SUT rerun is required solely to repair this bookkeeping state.


## 2026-11-16 — Canonical 0.1.20-bvp.3 physical-readiness rebinding

Owner reported both the disposable Windows vault `D:\\~TESTING\\bvp-2` and the isolated iPad vault configured with canonical BVP prerelease `0.1.20-bvp.3`, independent Google OAuth, the intended shared managed remote, automatic synchronization disabled, and first synchronization not yet completed. The Windows installed `build-identity.json` was read directly and reported:

- source commit `dedd783c1ce6efa1abd2bd5f34ed4e499321558e`
- `main.js` SHA-256 `772ca4e37222b14f3907ee0ce373589907b52760771006c1e3f58e34a9eaa2e1`
- manifest SHA-256 `332b2f0f7bd8674a7775a9eefd1fd7629439926e1a89b1c08f0955b4226ac96b`
- artifact size 1,018,010 bytes

The S09A controller allowlist is therefore being advanced from the superseded 0.1.19/0.1.20-bvp.1 identities to the exact canonical `0.1.20-bvp.3` identities on both Windows and iOS/iPadOS. The active Windows physical relay binding is changed to `D:\\~TESTING\\bvp-2\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay`; the historical S08F relay shape remains accepted only for read-only reconciliation of immutable old evidence.

S09A readiness explicitly requires the new Windows vault to remain **pre-first-sync** (`firstSyncCompleted=false`) with startup/local-change/periodic automatic synchronization disabled. This does not authorize first synchronization. Historical non-S09A Windows-smoke semantics remain unchanged.

**Test-change integrity:** prior cross-device hash tests were not weakened; their old artifact literals were replaced by the exact Owner-observed canonical release identities, while negative cases continue to inject independently wrong hashes/source/device identities. New source-inspection coverage requires the bvp-2 relay, pre-first-sync S09A gate, and dedicated physical branch selection.

**Ten-family adequacy:** nominal canonical dual-device identity/idle-ready path; malformed/wrong hash and identity boundaries; forbidden initial-sync/other-battery transitions; retry/recovery preserved by existing bridge authority; duplicate identity/order protections; persisted installed-build and data.json checks; private-to-public identity/security projection; existing relay/live-runner integration; architecture/path allowlist invariants; fail-closed physical dispatch and no-sync/destructive boundary are all covered by the existing S09A focused family plus the new rebinding assertions. No production synchronization behavior changes.

This is a substantive validation-controller change and therefore requires a new exact-source PHX-CI PASS before any physical dispatch. No physical command has been sent by this rebinding work.
