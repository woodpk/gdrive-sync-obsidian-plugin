# WS-07 / BVP_ERROR_REPORTING_UPGRADE — R9 Final Independent Review

**FINAL VERDICT: CORRECTION REQUIRED — COMPLETE FEATURE NOT ACCEPTED.**

**Reviewer:** review-brain-09. **Date:** 2026-10-23. **Repository:** `woodpk/gdrive-sync-obsidian-plugin`. **Branch:** `build/bvp-error-diagnostics-20261023`.

**Immutable reviewed source:** `0248133bdcdc9b43cde5f142db3326fde21f4bd2`. **Original PHX-CI verified tree:** `801b8a836d03f76fe1314e3fe8ed2b334fcf20f8`.

**Intake authorization:** `dev/state/current-state.yaml` at `dd31bb3113f5f7934a177fa76af3d9e70ad471e7`; confirmed branch HEAD equal to incoming state; `handoff-count: 3`, recipient REVIEWER, exact feature `WS-07/BVP_ERROR_REPORTING_UPGRADE`; source is an ancestor of intake commit.

**Frozen source-only Pass 1:** `dev/reviews/bvp-error-reporting-20261023-review-brain-09-r9-source.md`, published independently at `798619b4d90b4618320a4892715d64a7d9ee2d24`, *before* opening authored tests, prior review, source history or PHX-CI results. Pass 1 found no immediately established HIGH issue; Pass 2 disclosed two **additional**, ordinary-failure acceptance gaps in exact source/test oracles. The Pass-1 record was not modified.

**Normative authority:** DEC-346/347/348/349; `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-error-communication-upgrade-2026-10-23.md` (“Required outcome”, “Bounded shared diagnostic contract”, “Required fault/acceptance matrix”, “Definition of done”); WS-07 architecture; `dev/authority/governance/locks/testing-platform-boundary.yaml`. The governing decision is explicit: **every failed or blocked operation** reports stable meaningful cause/classification, confirmed/unconfirmed boundary, safe correlation and action; the diagnostic requirement is not restricted to caught exceptions.

## 1. Immutable original PHX-CI qualification — genuine PASS, not acceptance

- Fixed runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`; `phx-ci.json` fixed framework `0.2.0-dev.2`; no PHX-CI edits.
- Original verified run `74235852-a729-43f2-8282-438206f294da`; original Git-published evidence commit `349f6c80dfc71debd6a7bb612452d7f418d40e3c`.
- Original immutable flat result JSON `dev/test-results/20261024T031847Z-operator-build-bvp-error-diagnostics-20261023-0248133bdcdc.json`, fetched from exact publication commit, Git blob `1e06e14ba22eda63eda0411d81347bb206ad1013`; current latest state also contains the canonical per-run history directory.
- PHX stage history independently read: **11/11 required stages PASS**, exit 0, source SHA and verified tree exact; change-set PASS, repository PASS, overall COMPLETE/PASS.
- Focused BVP suite **527/527 PASS**, zero failed/skipped; full product suite **1292/1292 PASS**, zero failed/skipped. These suites overlap; counts must not be combined as independent tests.
- Windows 11, PowerShell 7.6.6, Node v22.23.2. Repository-check includes `BVP_REPOSITORY_CHECK_RESULT=PASS`, `guardExit=0`, `metricsExit=0`, `changeClass=authorized-governance`. DEC-349 two authorized limits (4500 core, 950 live) preserved, with other guards unchanged. No physical iOS/Obsidian/vault/Drive execution was credited.
- Immutable source-to-evidence comparison: source→evidence publication made only canonical `dev/_ca-output` and three `dev/test-results` artifacts; evidence→incoming state changed planning/status plus canonical extra copies, **not** SUT/test bytes.

**Original PHX-CI PASS is valid and retained.** A green engineering test suite is not evidence of untested DEC-348 requirements.

## 2. Previous corrective topics ER-01 through ER-04 — CLOSED at implementation-and-regression level

**ER-01 diagnostic context/hops:** CLOSED. `test-platform/src/diagnostic-types.ts` + browser-safe `live-device/diagnostic-contract.ts` now define and sanitize source/run/correlation identity, scenario/step/mode, cause/retriability, last/first boundary and bounded confirmed/not-observed/unknown hops. Scenario runner embeds identity into step result/evidence; mailbox/agent/relay derive opaque run/command tokens where available; unknown remote delivery is not promoted to confirmed. `bvp-diagnostics.test.ts` checks exact bounded fields and hostile identity; device/mailbox tests check distinct envelopes. Capability remains Windows software/mock, not physical.

**ER-02 ordinary relay/poll exceptions:** CLOSED. `drive-mailbox.ts` maps outbox/sent malformed records, read, rename, inbox write, publication, cleanup and polling errors to bounded `status:unavailable`, safe phase, first/last boundary and unknown effect. Tests `s08d-drive-mailbox-relay.test.ts` exercise malformed and secret-bearing read/rename/write errors, do not delete uncertain state, and check polling failures. Prior oversize assertion now expects explicit safe error with original no-dispatch and pending file invariant preserved.

**ER-03 deterministic TAP stdout/stderr privacy:** CLOSED for output redaction. `run-deterministic-battery.ts` retains structural TAP ordinal and counts only, suppresses raw child stderr; nested Node test context removed so the adversarial child actually executes. `bvp-private-tap-canary.test.ts` and `bvp-diagnostics.test.ts` independently assert a failing child emits synthetic secret-bearing stderr/stack, yet stdout, sanitized TAP and persisted result contain none; child exit 1 and `not ok` retained. **A separate completeness defect remains: NEW-01 below.**

**ER-04 cleanup/unsupported mode:** CLOSED for the original failure. `scenario-runner.ts` protects both device and executor disposal, returns `cleanupDiagnostic` without stripping original step result, converts clean-run cleanup to a non-PASS terminal result and emits structured unsupported-mode diagnostics. Tests inject both executor and virtual-device disposal exceptions and verify the original verdict, canonical cleanup status and privacy. **A distinct expected-outcome-mismatch failure is not covered: NEW-02 below.**

## 3. NEW independent acceptance blockers

### NEW-01 — HIGH — Ordinary failing deterministic test battery has no diagnostic contract

**Exact source:** `test-platform/test/batteries/run-deterministic-battery.ts`, `main()` around lines 104–135. Child TAP result is reduced to `{ status: exitCode === 0 ? "completed" : "failed", exitCode, durationMs, signal?, error? }` and terminal stdout `{battery,status,exitCode,durationMs}`. **If Node exits normally with code 1 because a test fails, there is no `diagnostic`, no `classification`, no `phase`, no `lastConfirmedBoundary`, no `firstUnconfirmedBoundary`, no correlation/identity and no `recommendedAction` in the machine-readable result or human-facing summary.** The safe `main().catch` diagnostic is only for exceptions thrown by the battery runner, not the ordinary nonzero child exit.

**Specific authored-test gap:** `test-platform/test/bvp-diagnostics.test.ts` “deterministic child TAP with private error text...” around L421–444 verifies the privacy fix, `result.result.status==="failed"`, `result.result.exitCode===1`, numeric `not ok` and `# fail 1`, but never asserts a diagnostic/classification/phase for this **actual failed battery**. Thus the test is useful and green yet cannot demonstrate DEC-348's explicit “for every BVP execution mode, a failure or BLOCKED verdict” requirement. The structural sanitized TAP gives a numbered failure but is not a substitute for the stable structured diagnostic contract or next action.

**Required:** for normal child exit != 0, write and display a bounded `BvpDiagnostic` with stable test-battery-failure class, truthful `test-subprocess-completed`/test-verdict boundary, privacy-safe identity, cause/retry and action; distinguish launch errors and observed test failures, while preserving the real exit code, sanitized TAP counts and no raw text. Add regression asserting the new fields on the existing secret-bearing child failure (not just on preflight exception).

### NEW-02 — HIGH — Expected-outcome mismatch with completed step manufactures a failed verdict without diagnostic

**Exact source:** `test-platform/src/scenario/scenario-runner.ts`, around L165–197. A diagnostic is synthesized **only if `actual.status !== "completed"`**. For a completed step whose declared `step.expect` requires `blocked`/`failed` (or another non-success expectation), `matchedExpectation=false` but `actual` has no diagnostic. The branch calls `finish("failed", "expected-outcome-not-observed", `step ... completed but expected ...`)` without passing a diagnostic. `finish()` only includes diagnostic when explicitly provided. `buildScenarioEvidence()` projects `machine.verdict.diagnostic` only when `execution.diagnostic !== undefined`. As a result this ordinary scenario failure contains a classification and potentially sensitive free-form reason but **no last/first boundary, cause, retriability, correlation token, effect certainty or recommendedAction** in the canonical verdict. This contradicts DEC-348's uniform failure contract, and can occur in deterministic or external execution without throwing.

**Test gap:** Existing `scenario-runner.test.ts` and the new `bvp-diagnostics.test.ts` exercise expected, blocked and failing observation/assertion paths; no supplied regression asserts a structured verdict diagnostic specifically for a **completed actual step that violates a non-success expectation**. A passing aggregate suite does not close this branch.

**Required:** create a safe `expected-outcome-not-observed` diagnostic with scenario/run/step identity, observed completion, an accurate boundary and actionable next step; preserve `status:failed`, outcome mismatch and objective evidence. Add a focused test with completed step + declared expected non-success asserting `result.diagnostic`, `evidence.machine.verdict.diagnostic`, phase/identity/last/first boundary, and sanitized reason. Never reinterpret success as the expected failure.

## 4. Independent mandatory ten-family assessment

| Test family | Assessment |
| --- | --- |
| 1 nominal/success | ADEQUATE — existing software success paths and product suites PASS |
| 2 negative/malformed | PARTIAL — diverse preflight/relay/privacy/receipt tests, but NEW-01 and NEW-02 negative terminal branches lack diagnostic assertions |
| 3 state transitions | PARTIAL — device/relay transitions strong, expected-success-versus-expected-failure result branch incomplete |
| 4 retry/idempotency/recovery | ADEQUATE for reviewed software/simulator boundaries; unknown effect remains nonreplayable |
| 5 concurrency/order/races | ADEQUATE for mocked relay/device, including serialized pump and stale authority |
| 6 durable persistence/restart/integrity | PARTIAL — error file and TAP persist tests PASS, but ordinary failed battery persists no structured failure diagnosis |
| 7 identity/security/privacy | ADEQUATE within disposable fixtures for verified sanitized console/TAP/identity projections; no real-device identity assurance |
| 8 API/schema/integration/compatibility | PARTIAL — typed diagnostic contract works where invoked, but nonzero deterministic child exit and expectation mismatch bypass it |
| 9 architecture/governance | ADEQUATE — exact pin, DEC-349 limits, frozen boundary and unchanged authoritative PHX gates PASS |
| 10 end-to-end/fail-closed | PARTIAL — privacy and mock fail-closed paths tested, but two common failed outcomes omit mandatory machine-readable boundaries/action |

## 5. Governance and return

**CORRECTION REQUIRED.** Do not treat ER-01 through ER-04 as still uncorrected; their fixes are substantial and supported. Do not treat original PHX-CI PASS as invalid. The new NEW-01 and NEW-02 acceptance blockers are source-grounded, addressable in bounded BRAIN-side code, and require new requirements-first tests and independent exact-source requalification.

The Builder must refresh handoff state, create tests before code for both missed terminal result paths, correct within DEC-348/349 and source/bundle boundaries, use pinned Windows PHX-CI solely for engineering **change verification** (not for BVP operation), publish original immutable evidence for the corrected source, and re-submit a neutral handoff after substantive PASS. Dependently planned PowerShell library cannot proceed under this feature's acceptance gate. No source/test/script/fixture/evidence modifications by Reviewer, no test execution, and no release/install/merge/physical/Drive/vault/Stage 3 action.
