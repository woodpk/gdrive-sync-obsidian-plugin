# WCO-06 / DEC-357 — FINAL Independent Architectural, Security, Correctness and Governance Review

**FINAL VERDICT: CORRECTION REQUIRED — NOT ACCEPTED as a governed feature qualification.**

**Date:** 2026-11-14 (review session; PHX original run ended 2026-11-15 UTC)  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Branch:** `build/bvp-poll-error-observability-20261025`  
**Feature:** `WS-07/BVP_WINDOWS_CONTROLLER_OAUTH`, locked DEC-357, WCO-06  
**Exact immutable source:** `07f8b20c12e4ab769c4bb8e8b386663d9f02f7f0`  
**Source Git tree:** `759cc887985823293cd75fa4239c10096a45fdcc`  
**Incoming handoff state:** `6b2fd7d761d1f872370d9fd407f872e53acb340d`, feature handoff-count **13**, BUILDER→REVIEWER.  

The implementation has strong software-only correction evidence and **genuine 13/13-stage PHX-CI PASS**, but its verification authority **was repinned** from the previously approved `69c4aa077d4a1a46d1e85e59f39d36285be99e83` to `4cf0c865c7b189641e2acebc0a6ad757b6f01992` in the source branch without an identifiable explicit Owner exception to locked DEC-357's prohibition. This is a **governance acceptance blocker**, distinct from the actual test results. The Owner's later approval to *freeze the tested source* does not explicitly amend the prior verification pin restriction. The review cannot substitute inference for documented Owner authorization.

## 1. Exact remote authority and two-phase review record

The branch compared **IDENTICAL** to supplied intake state at start. The Git commit object verifies source tree `759cc887985823293cd75fa4239c10096a45fdcc` directly; the DEC-357 canonical state feature block authorized handoff-count 13 and recipient REVIEWER. The source is an ancestor of the evidence/state commits. Read locked DEC-357, inherited DEC-356/354/355, BVP-WCO-001 through BVP-WCO-011, WS-07 architecture and machine-readable frozen guard. Exact source was inspected independently.

**Frozen Pass 1 assessment:** `dev/reviews/bvp-windows-controller-oauth-20261114-wco06-source.md`, publication commit `7d79ca8612bdc056b8ab92b6e5c9bfbaa2733bc0`. It was committed **before** reading current candidate tests, previous review report contents, source history/changes or original PHX-CI results in this turn. Pass 2 then inspected `windows-controller-cancellation-adversarial.test.ts`, `windows-controller-oauth.test.ts`, S08D relay and architecture suite, DEC-354 retention tests, original evidence, source history, runtime pin evolution and governance records.

**Independence limitation:** This same conversation contains earlier DEC-352/DEC-357 reviews. It is therefore not possible to certify genuinely fresh zero-prior-exposure blindness, although the exact candidate Pass 1 was source-before-tests/evidence. Requirements/task metadata were treated as normative only, not evidence. If the governance contract demands complete historic-context independence, commission a fresh-session Reviewer on the corrected candidate.

## 2. Direct original PHX-CI provenance

- **Run ID:** `e579438f-8a22-434d-8284-ef966f6db535`.
- **Original evidence publication commit:** `6b7c67e0639cba184e875d6184497bad781317fd`.
- **Original canonical result:** `dev/test-results/e579438f-8a22-434d-8284-ef966f6db535/result.json`, blob `1022480e6949f0c7fbcacbcf108689c50ae31f4f`; original `result.md` blob `f177b10d3fc1ff8ae3d632dd38c6b44cda6f936d`; `terminal.log` blob `e21709ead955555df18a1b40c82d57edfaf831f3`. `dev/_ca-output.md` was published in the same source-child evidence commit.
- The verified head and Git tree recorded in original result are **exact** source `07f8b20c12e4ab769c4bb8e8b386663d9f02f7f0` and tree `759cc887985823293cd75fa4239c10096a45fdcc`. Source→evidence comparison is one commit containing exactly `dev/_ca-output.md` plus three original evidence files; evidence→incoming state is two administrative commits with no production/tests/script modifications.
- **13/13 ordered stages PASS** (not 11/11): `authority-check`, `preflight`, `node-preflight`, `node-project-files`, `install`, `typecheck`, `test-focused`, `test`, `artifact-preparation`, `build`, `artifacts`, `check`, `repository-check`; each exit code 0, change-set PASS, repository PASS, overall PASS.
- **Focused BVP 628/628 PASS**, full product **1292/1292 PASS**, zero failure/cancellation/skip, overlapping suites not additive.
- Original Windows environment: NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1.
- Architecture metrics **framework core 4849/4850 PASS** (**one logical LOC margin**), live agent/relay **1239/1250 PASS** (**eleven logical LOC margin**); repository-check guard `BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0 context=authoritative changeClass=authorized-governance`.
- **Actual PHX-CI runtime in this original run:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`, exact pin recorded in source `phx-ci.json` and original log. This differs from previous locked DEC-357 runtime and is the issue addressed below.
- No Reviewer test execution, PHX run, live Google account access, device test, install, merge or release occurred.

## 3. Implemented source and test strengths

The validated source correctly separates the generated Windows/iOS **reporter-only Obsidian artifact** from the separate **Windows Node authoritative controller** and its per-device/local-owner `wx` locks. The controller obtains independent Desktop OAuth code with S256 PKCE, high-entropy single-use state, local `127.0.0.1` callback, exact `drive.file` scope, and protects the refresh token via Windows current-user DPAPI under a constrained LocalAppData directory. Native PowerShell/NTFS ACL verification restricts allow grants to current-user and SYSTEM and blocks broadening. New asynchronous subprocess handling enforces I/O timeouts and cancellation. Device pending records are promoted under controller authority only; remote mailbox root lookup refuses to create a second mailbox. Original run A/device/event and archive/retirement proof are retained.

**Corrective tests in original PHX-CI output PASS:** `WCO-R1-F01` #604–613 for hung refresh/Drive, delayed token response, PKCE timeout, actual compiled `--once` with injected non-settling fetch, SIGINT-style signal cancellation, async DPAPI/ACL, 500ms overall controller cycle and no late token write; `WCO-R1-F02` #462 canonical lease vs temporary lock artifacts; `WCO-R1-F03` #626–628 restrictive token path, broadened NTFS ACL denial and async request refusal; `WCO-R2-F03` #615 native NTFS ACL readback. The assembled reporter→fake Google Drive→separate Windows OAuth controller→ACTIVE→durable inbox test also PASS. These genuinely remedy the main *software* defects in the prior review; the original PHX verdict should not be contradicted.

## 4. Findings and acceptance limits

### WCO06-F01 — HIGH / BLOCKING GOVERNANCE — Current verification pin change has no verified Owner amendment

**Locked authority:** DEC-357 specifically prohibits PHX-CI runtime/pin changes under the Option A feature; BVP-WCO-009 calls for unchanged PHX-CI pin and architecture guards; BVP-WCO-011 requires qualification through the unchanged pinned Owner-operated Windows PHX-CI. Historical original DEC-357 software qualification used runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`; the canonical task, WS-07 verification and operator runbook identify that pin. The DEC-357 feature state still asserts `NO_GITHUB_ACTIONS_NO_BUDGET_OR_PIN_CHANGE_NO_PRODUCTION_SYNC_CHANGES`.

**Independent repository evidence:** Commit `3ef9c7c3168d8048046acfdc80cff8332eb4380e` (`build(ci): repin PHX-CI to 4cf0c865c7b1`, 2026-11-14 21:27 UTC) changes **frozen** `phx-ci.json` from `69c4aa077d4a1a46d1e85e59f39d36285be99e83` to `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, with a formatting-only reordering of the repository-check command. The working source's repository-controlled PowerShell launcher `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` also embeds the new pin. Original qualifying evidence confirms verification on **that new runtime**, with **13** stages instead of the prior **11**. The actual result is technically PASS and source matched — the issue is **authority**.

No explicit locked DEC-357 amendment, governing Owner pin authorization, or permission to change this frozen surface was found in the authoritative decision register, canonical task, WS-07 architecture, operator runbook, or current feature state reviewed. The state says `2026-11-14_APPROVED_FREEZE_NO_BUILDER_SOURCE_CHANGES`; a freeze **after** a pin change is not an explicit exception to the no-pin-change rule. Reviewer cannot invent approval merely because this runtime is installed or original evidence passed.

**Required resolution:** Obtain a separately recorded, explicit Owner determination authorizing the new runtime/pin and its scope **or** restore the authorized pin and requalify the exact source against it. If the Owner ratifies the new runtime as the qualification authority, update locked governance/source of truth through a properly authorized change and determine whether a newly bound PHX run is necessary; do not silently present the current run as compliant with the old frozen pin. Protect all original evidence. No Reviewer software changes authorized.

### WCO06-F02 — MINOR SOURCE LIMIT — The hard cycle deadline depends on cancellation cooperation of local filesystem I/O

`boundedCycle` schedules `AbortController.abort()` and **awaits** `cycleCore`. OAuth and Drive `fetcher` requests are raced against deadlines, and PowerShell/DPAPI subprocesses are killed on abort and awaited until child close. However the Windows relay's asynchronous `readFile/readdir/writeFile/rename/rm` calls are not AbortSignal-aware. A never-resolving local filesystem operation could hold the controller root lock beyond `cycleTimeoutMs`; this is outside the deterministic nonsettling network tests. It is not a demonstrated failure of normal Windows local IO, and the main prior network/credential timeout blocker is substantively corrected. For future hard real-time guarantees add explicit post-abort controlled recovery or an external watchdog that cannot permit concurrent authoritative controller execution while an old operation may still mutate state. No speculative lock takeover of hung work.

### WCO06-F03 — MINOR SECURITY BOUNDARY — Same-user reparse-point and filesystem TOCTOU caveats

`securedTokenLocation` and native ACL checks materially improve token confidentiality and default fail-closed behavior. However multiple independent path/ACL checks cannot guarantee against a same-user adversary changing a directory reparse point between validation and open/rename. This is a documented trust-boundary limitation under a **trusted single Windows operator user**, not evidence that another Windows user can read DPAPI ciphertext or tokens. Preserve Windows current-user ownership and restrict live usage until Owner-governed compatibility acceptance; require reparse-point/open-by-handle protection if the threat model expands.

### WCO06-F04 — PROCEDURAL / EXTERNAL — Blind context and real cross-client visibility

This conversation contains past DEC-357/DEC-352 reviews: true never-exposed Reviewer blindness was not possible. WCO-06 source was frozen before this round's authored tests, source diff and original PHX results, but a new session is necessary if absolute independence is a hard procedural acceptance criterion. Separate OAuth `drive.file` access to the original Obsidian-owned mailbox has **not** been tested against real Google; this remains an expressly Owner-reserved later live compatibility gate, not a defect the simulated software tests can close.

## 5. Mandatory ten-family test adequacy

| Family | Assessment | Supporting evidence / qualification |
| --- | --- | --- |
| 1. Nominal | ADEQUATE for mock Windows software | Actual assembled reporter/controller fake Drive stage→ACTIVE and inbox; valid PKCE/DPAPI flow |
| 2. Negative/malformed | ADEQUATE for tested scope | Corrupt token, unsafe path, broad NTFS ACL, invisible root, wrong callback, missing lease, expired page cursor |
| 3. State transitions | ADEQUATE | Offline pending, authorization, admitted ACTIVE, durable inbox, recovery, archive and no false ACK |
| 4. Idempotency/retry | ADEQUATE | Reserved remote event, retry reconciliation, repeated controller cycles, single PKCE exchange |
| 5. Concurrency/order | ADEQUATE on authorized one-root model | OS locks, process contest, orphan lock, callback replay, bounded network abort; no multi-host lease claimed |
| 6. Persistence/restart | ADEQUATE for mocked Windows software | DPAPI restarts, controller lock release/reacquire, no late token replacement, durable relay inbox/journal |
| 7. Identity/security/privacy | ADEQUATE for trusted operator model | Exact event/run/device hash, S256, single-use state, constrained LocalAppData and read-back NTFS ACL |
| 8. Compatibility/interfaces | PARTIAL — Owner-gated external proof | Separate OAuth `drive.file` root visibility never proved against real Google; no new root allowed |
| 9. Architecture/governance | **INADEQUATE / BLOCKING** | Runtime/consumer pin changed despite explicit frozen no-pin-change contract; no explicit Owner waiver verified |
| 10. End-to-end/fail-closed | ADEQUATE simulated; NOT full live | Fake Drive end-to-end, timeout locks/UNKNOWN, no physical/live Google; uncancellable FS edge caveat |

**Ten-family software implementation coverage is strong; full governed feature acceptance remains BLOCKED by Family 9 authority.**

## 6. Final Reviewer→Builder disposition

**CORRECTION REQUIRED — NOT ACCEPTED until WCO06-F01 is resolved by explicit Owner governance action or properly requalified unchanged-authority verification.** Do not alter original evidence, ship, run real OAuth/Drive, command physical devices, install, merge, deploy or release. The source's original PASS can be used as technical evidence, not as retroactive verification-pin authorization.

After this report is published, update **only** the feature-specific `bvp_windows_controller_oauth_2026_10_28` fields in `dev/state/current-state.yaml` from handoff-count **13→14**, sender REVIEWER, recipient BUILDER, status `WCO06_CORRECTION_REQUIRED_REVIEWER_TO_BUILDER`, source SHA unchanged. Preserve all unrelated BVP feature blocks, production/tests/scripts, frozen PHX result, and authority decisions.

**Builder next:** refresh the live branch and read both independent reports; request the Owner's explicit pin-governance determination without presuming approval; implement only authorized configuration/governance corrections; if immutable candidate identity or authority changes, run the required exact-source full local Windows PHX-CI and publish fresh original evidence; then hand to a genuinely new independent Reviewer for blind-first acceptance where mandatory. Maintain 4850/1250 limits (only **one LOC core headroom**), no Github Actions, no live operation. Reviewer performed no software validation and no production/test/script/original-evidence edits.
