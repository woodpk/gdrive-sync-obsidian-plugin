# WS-07 — BVP_ERROR_REPORTING_UPGRADE: Final independent review

**FINAL VERDICT: CORRECTION REQUIRED — NOT ACCEPTED.**

**Independent Reviewer:** `review-brain-09` | **Date:** 2026-10-23.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`; feature branch `build/bvp-error-diagnostics-20261023`.

**Required planning path:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-error-communication-upgrade-2026-10-23.md`.

**Source SHA:** `fd9ccf9f99ebc73de54f3553fd62b265ed0f86fb`. **Verified tree:** `cc994da01fc9242b265b1a3e443432cf07e1ddae`.

**Incoming authorization:** `dev/state/current-state.yaml` at `290a48953fd9923fd7b12288e6f864bd80e8f7ba`; `handoff-count: 1`, `handoff-owner-role: BUILDER`, `handoff-recipient-role: REVIEWER`, feature ID `woodpk/gdrive-sync-obsidian-plugin/WS-07/BVP_ERROR_REPORTING_UPGRADE`. At intake, branch was exactly at that state commit and submitted source was its ancestor.

**Frozen source-only Pass 1:** `dev/reviews/bvp-error-reporting-20261023-review-brain-09-source.md`, independently published at `ab4ab736fda751982b7e022f2d2918af2a962ef2`, before consulting candidate tests, source history, Builder explanations or PHX-CI results.

## 1. Original immutable PHX-CI qualification — independently CONFIRMED PASS

- **Run ID:** `612f2abd-560c-4375-8458-e2a1586bea40`.
- **Original evidence publication commit:** `b212c36cd98f2f035d539a84434834c25ae99a75`.
- **Original history JSON:** `dev/test-results/20261023T221410Z-operator-build-bvp-error-diagnostics-20261023-fd9ccf9f99eb.json`; fetched at original publication commit; Git blob `0752531237505284a6e14f37952bee8945ec4d06`.
- **Exact PHX-verified candidate:** source `fd9ccf9f99ebc73de54f3553fd62b265ed0f86fb`, tree `cc994da01fc9242b265b1a3e443432cf07e1ddae`, no reinterpretation of later evidence/status commits as source.
- **Framework:** `0.2.0-dev.2`, fixed `phx-ci.json` runtime SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`; Windows/PowerShell 7.6.6, Node v22.23.2.
- **All ELEVEN required stages PASS (exit 0):** preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check and artifacts.
- **Focused tests:** `515/515 PASS`, zero failed/skipped. **Full repository tests:** `1292/1292 PASS`, zero failed/skipped. Suites overlap and must not be summed as distinct cases.
- **Verdicts:** change-set PASS, independent repository PASS, overall PHX-CI **COMPLETE/PASS**, exit 0.
- **Architecture:** Original `repository-check` stdout ends `BVP_REPOSITORY_CHECK_RESULT=PASS`, `guardExit=0`, `metricsExit=0`, `changeClass=authorized-governance`. Exact DEC-349 ceilings `4500` core and `950` live-device, unchanged remaining budgets, original scripts/code checks and existing pin qualified. No PHX-CI source/pin change or physical device operation detected.
- Original artifact stage recorded `main.js` 922631 bytes, observed SHA-256 `6bb0012cb21a244a2f53a44b7bdcf3203b6284070bb3b725d7b32d919c2b881d` — observational only, **not approval for production installation or release**.
- Original source→evidence commit comparison consisted only of `dev/_ca-output.{md,json}` and the immutable three-file `dev/test-results/` publication; evidence→incoming state had planning/status changes, not production/test changes. The exact feature source identity therefore remains grounded.

**This genuine PHX-CI PASS is not withdrawn or downgraded. Independent acceptance is a separate requirements/adequacy gate.**

## 2. Mandatory ten-family adequacy — independently assessed

Reviewed the actual source and direct requirements-derived assertions in `test-platform/test/bvp-diagnostics.test.ts` (16 named tests), `s08c-device-command-agent.test.ts`, `s08d-drive-mailbox-relay.test.ts`, `s08e-external-live-executor.test.ts`, `scenario-evidence.test.ts`, `s08e-prerequisite-runner-executor-seam.test.ts`, existing architecture/installed-validation guards, and the Builder fault/coverage map `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-diagnostics-fault-coverage-2026-10-23.md` (14 mapped fault groups). The builder coverage map's historical `R4 pending` annotation is stale relative to the verified later R6 evidence; original R6 is authoritative for execution status.

| Test family | Review adequacy and limitation |
| --- | --- |
| 01. Nominal/success | ADEQUATE for existing flow regression: full BVP and product suite PASS; normal summary/exit checks exist |
| 02. Negative/boundary/malformed | PARTIAL: adversarial classifications, HTTP 401/403/429/503, malformed inbox and preflight covered; malformed relay **outbox/sent** JSON exception not shown to yield diagnostic envelope |
| 03. Valid/invalid transitions | ADEQUATE for tested scenario/agent expected-result and mailbox generation semantics |
| 04. Retry, crash, cancellation/recovery | PARTIAL: sequence claim, uncertain handler/finalization and no-replay cases covered; cleanup/finalization exception **after observed result** lacks protected result-return path |
| 05. Concurrency, order, stale/races | ADEQUATE for existing device-agent/relay authority tests; this new diagnostic contract does not prove hop-by-hop correlated status across all boundaries |
| 06. Persistence/restart/integrity | PARTIAL: CLI result-write failure is tested; runner disposal failure and raw deterministic TAP-output privacy not challenged |
| 07. Identity/security/privacy | **INSUFFICIENT** for requirement that all shared/stdout output excludes private data; unfiltered deterministic child stdout/stderr remains reachable |
| 08. Interface and compatibility | PARTIAL: versioned safe diagnostic helper and stored canonical evidence are tested, but no complete run/scenario/step-index/command-correlation/per-hop machine contract is asserted |
| 09. Architecture/ownership/governance | ADEQUATE: DEC-349 exact two-budget amendment with `authorized-governance`, unchanged PHX pin and original repository-check PASS |
| 10. End-to-end/fail-closed/adversarial | PARTIAL: mock live/Drive and Windows software-only tests cover many named failures, but actual relay ordinary exceptions are not converted to structured safe outcome; no physical or real Google Drive evidence claimed |

**The source-level negative cases below remain decisive even with a green suite.** The tests often assert the deliberately narrower helper shape rather than the normative expanded diagnostic schema.

## 3. Material independent findings

### ER-01 — HIGH — Diagnostic schema omits required correlation and per-hop observation contract

**Source:** `test-platform/src/live-device/diagnostic-contract.ts:7–22,35–48`; `test-platform/src/scenario/scenario-runner.ts:17–31,130–151`; direct positive test `test-platform/test/bvp-diagnostics.test.ts:34–57`.

**Contract:** DEC-348 and the authoritative planning file's **Bounded shared diagnostic contract** and **Hop/phase accounting** require safe run ID, scenario/battery ID, step index/ID, execution mode, component and correlation token; cause class, retriability disposition and status per hop `confirmed`/`not-observed`/`unknown`, and the first missing evidence boundary.

**Observed:** The only shared `BvpDiagnostic` contains schemaVersion, classification, component, phase, lastConfirmedBoundary, firstUnconfirmedBoundary, single `effect` status, recommendedAction and optional stepId. It contains **no** run ID, scenario/battery ID, step index, execution mode, command correlation token, cause/retriability category or per-hop status. Some identity context exists separately in the scenario envelope or device command, but independently inspected relay/agent diagnostics can be consumed outside such envelopes and there is no defined stable full correlation projection. The explicit `deepStrictEqual` test at `bvp-diagnostics.test.ts:34–57` codifies that narrowed shape and never asserts the required fields. Even though phase and last/first boundary are useful, they are not a complete per-hop evidence and cause contract.

**Required correction:** Add a privacy-safe *bounded* correlation identity and structured per-hop/cause/retriability projection, or a formally versioned composite interface that demonstrably supplies exactly those normative fields for **every** supported execution mode and interface. Trace explicit tests to real observed fields, including unknown-after-publication and never-published distinctions. Do not infer device receipt or operation from controller-side intent.

### ER-02 — HIGH — Ordinary relay failures throw rather than producing structured diagnostic outcomes

**Source:** `test-platform/src/live-device/drive-mailbox.ts:131–163` (`createWindowsMailboxRelay().pumpCore`), `pollDeviceMailboxOnce` at L112–114; `test-platform/src/live-device/validation-entrypoint.ts` periodic calling code.

**Observed:** The relay catches and constructs `BvpDiagnostic` only if the thrown error is a `MailboxUnavailableError`. It explicitly `throw e` for all other errors. The same pump parses untrusted outbox and sent-file JSON, explicitly throws `relay-command-invalid` / `relay-pending-invalid`, and performs adapter read/write/rename operations which can reject. Consequently malformed outbox/sent payloads and ordinary filesystem faults escape the relay diagnostic boundary instead of returning phase/last-confirmed/first-unconfirmed and UNKNOWN effect classification. Device polling likewise rethrows unexpected errors. Periodic caller catch/suppression can turn these into an absent operator report. Existing tests assert the expected throw for an oversized command and demonstrate some `MailboxUnavailableError` branches, but do not establish the required structured envelope for these ordinary failures.

**Required correction:** Normalize non-secret malformed-command, read/write/rename and unexpected relay/device polling exceptions into safe distinct classifications, preserving the current phase, last confirmed boundary, first unconfirmed and unknown effect, without raw exception messages or automatic redispatch. Add tests asserting returned/persisted structured diagnostics and intact queued/sent state. Re-throwing may remain appropriate for an internal programmer fault only if a verified outer boundary converts and reports it safely.

### ER-03 — HIGH — Raw deterministic subprocess stdout/stderr bypasses privacy-safe diagnostics

**Source:** `test-platform/test/batteries/run-deterministic-battery.ts:44–75`.

**Observed:** The deterministic runner explicitly streams the Node TAP test subprocess stdout unchanged to `process.stdout.write(chunk)` and stderr unchanged to `process.stderr.write(chunk)`, while persisting raw TAP in the requested TAP file. These data are not run through the diagnostic allowlist/redaction/screening and may contain arbitrary test exception text, fixture names, personal paths, tokens or other private data. The newly sanitized **outer exception** only protects top-level failures, not child output. The positive privacy tests at `bvp-diagnostics.test.ts:182–199` exercise invalid battery rejection **before** child launch, not a child emitting sensitive content. The comments stating raw child output will not print are inconsistent with these actual streaming calls. DEC-348 specifically prohibits private values/raw exception stacks in printed/shared output.

**Required correction:** Design an approved test-runner stdout/stderr/TAP policy that preserves necessary local diagnostic evidence without publishing unreviewed secret-bearing bytes. Assert a deliberately secret-bearing *child TAP failure* does not appear in terminal/shared evidence while preserving truthful nonzero exit, failed test details and actionable bounded diagnostics. Do not simply discard mandatory test evidence or manufacture success.

### ER-04 — MODERATE — Runner unsupported-mode and cleanup failures omit or bypass failure diagnostics

**Source:** `test-platform/src/scenario/scenario-runner.ts:74–112,115–160`.

**Observed:** Unsupported `execution-mode-not-applicable` returns a scenario classification but no structured diagnostic. Both invalid-scenario and finish paths await `executor.dispose` and/or `device.dispose` outside a protective conversion. An exception during disposal can therefore reject the `run()` Promise after step outcomes were observed and prevent returning the promised canonical result/evidence. This is a materially different boundary from a step exception, which is caught and classified at L121–142. The committed diagnostic tests exercise step exceptions, result-file failures and expected assertions but not disposal throws.

**Required correction:** Preserve original failure or successful result context while reporting cleanup/finalization as a separate bounded uncertainty event with safe exit and durable evidence, with fail-closed status; return a structured unsupported-mode diagnosis. Add tests injecting both types of cleanup exception. If cleanup uncertainty affects external effects, never imply that nothing happened.

## 4. Corrective governance and restrictions

**Disposition: CORRECTION REQUIRED** for ER-01–ER-04. Genuine PHX-CI R6 PASS is retained as an **immutable tested reference**, not an acceptance waiver. All findings concern actual source behavior or absent normative fields, not hypothetical hardware conclusions.

Builder should (1) refresh GitHub and verify exact handoff count/recipient, (2) author additional adversarial tests *before* changing implementation, including full correlation/per-hop diagnostics, malformed outbox/sent file, filesystem persistence, deterministic child-output privacy and disposal failures, (3) repair only within DEC-348/349 authorized scope, preserving source/test isolation and no new runner/evidence authority, (4) respect the 4500/950 frozen amended ceilings, (5) requalify the exact new candidate only through the pinned PHX-CI's governed **software-change** gate and original immutable evidence, and (6) obtain a new neutral independent Reviewer handoff only after substantive qualification PASS. Do not advance the dependent PowerShell interface library as accepted work until this feature's review gate passes.

No changes to production/tests/scripts/fixtures/original PHX evidence by Reviewer; no software validation executed. PHX-CI was not used to **operate** BVP. No physical iOS/iPad, live vault/Drive, installation, merge, release or Stage 3 authorized.
