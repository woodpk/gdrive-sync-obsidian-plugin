# DEC-351 / WS-07 — Final Independent Architectural, Security, Correctness, Test-Adequacy and Governance Review

**FINAL VERDICT: CORRECTION REQUIRED — NOT ACCEPTED.** The original R4 Windows PHX-CI qualification is genuine and must remain intact. The independently inspected authored test suite does **not** meet the complete DEC-351 negative end-to-end acceptance requirement, and there is an additional source/test contract gap in handling requests with a valid output path but invalid scenario selection. These are bounded corrections; the narrow CLI architecture itself is substantially sound.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`. **Branch:** `build/bvp-powershell-interface-20261024`. **Feature:** `WS-07/BVP_DIRECT_SCENARIO_ID_CLI`. **Reviewer:** independent Reviewer, 2026-10-24. **Reviewed immutable source SHA:** `d8a681ce07155dbfa7e121afd01ac59c9e8056a5`; **verified tree:** `033582d4d778cb8c0df2fc7043a669da0877f691`.

## Authorization and frozen Pass 1

Intake remote branch HEAD was identical to supplied state commit `2db2c7fe35dd6a33f9ac0392a1396641578afe1f`; `dev/state/current-state.yaml` documented `handoff-count:1`, BUILDER→REVIEWER, exact feature ID and source SHA, and source ancestry was verified. Pass 1 inspected only DEC-351/DEC-350 and related neutral decisions, Sections 1–4 of normative feature task, WS-07 architecture and frozen boundary, and immutable executable source. No candidate authored tests, prior findings, Builder explanation, source diff/history or PHX-CI evidence were inspected during Pass 1.

Frozen blind-source report: `dev/reviews/dec351-direct-scenario-cli-20261024-independent-blind-source.md` published **before Pass 2** at `ab5d5eee634a1c41e86845abc14d019e68acf1a7`; Git comparison confirmed source-report publication was branch HEAD before Pass 2 completion. The chat's previous reviews are on **other** BVP features; no zero-prior-exposure claim is made for the broader architecture.

## Original immutable PHX-CI R4 evidence — independently corroborated PASS

- Original run ID **`50538bf3-5c5e-4026-8021-07b4d3d6bb95`**, original evidence commit **`49b409da71d308ccc29fcdbc457dd4ec757fd2f9`**.
- Original flat evidence JSON `dev/test-results/20261024T204840Z-operator-build-bvp-powershell-interface-20261024-d8a681ce0715.json`; Git blob `de7b6c8ec24454d0e736deee1758524b76f400c4`. Read at the immutable publication commit. `repository.verifiedHead=d8a681ce07155dbfa7e121afd01ac59c9e8056a5`; verified tree `033582d4d778cb8c0df2fc7043a669da0877f691`.
- Fixed PHX runtime SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, framework `0.2.0-dev.2` from `phx-ci.json`; Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1.
- Exactly **11/11 PHX stages PASS**, exit 0: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts. Change-set PASS, repository PASS, overall COMPLETE/PASS.
- Original focused tests **544/544 PASS**, zero fail/skipped; full product tests **1292/1292 PASS**, zero fail/skipped. Suites overlap and must not be added together. All eight DEC-351 named tests independently located as PASS in the **original focused-stage stdout**, not merely claimed by Builder.
- Frozen architecture checks PASS: framework core **4145/4500**, live-device agent/relay **950/950** (no headroom); `shippingArtifactExit=0`, `guardExit=0`, `metricsExit=0`, `BVP_REPOSITORY_CHECK_RESULT=PASS`, 0 scenario-specific PowerShell scripts. Evidence marks `changeClass=authorized-governance`; this class reflects the previously amended DEC-349 baseline and is not to be generalized as authorization for new frozen changes.
- Git comparison proved source→original evidence commit changed **only** `dev/_ca-output.{json,md}` and the original `dev/test-results` three-file evidence publication; evidence→intake state changed **planning and handoff state only**, not qualified implementation/tests. No Reviewer test execution or verification mutation.

**PHX-CI PASS is legitimate.** It does not itself prove that all normative negative/fail-closed test families are adequately asserted.

## Exact implementation findings

**Positive findings:** `test-platform/test/batteries/run-deterministic-scenario.ts` is a small direct Node entrypoint; dispatch is via an exact static `getDeterministicScenario()` and the existing `DeterministicScenarioRunner.canonical().run(definition)`, without a second runner, production/plugin code, new transport, dynamic imports or physical dispatch. `deterministic-scenario-registry.ts` statically maps **70** deterministic modules with source-path identity, definition/schema validation, unique IDs/source guards and read-only ordered listing. Argument parser rejects duplicate/missing/unknown flags, malformed/traversal/UNC paths and live-only IDs. Exact result/evidence ID, mode and terminal status are checked; the file includes only the canonical privacy-filtered evidence, omitting raw captures. Successful execution has exit 0 and other scenario outcomes map to nonzero. Existing battery test registration and CLI remain in place; neither accepted runner nor production `src/**` was changed.

### DEC351-F01 — HIGH — End-to-end noncompleted scenario verdict is not tested

**Normative requirement:** Section 3 of the task expressly requires regression tests proving *unsupported/blocked/failed scenario statuses accurately classified and nonzero*, and an **end-to-end single-scenario fixture ... plus intentional failing oracle**. Section 4 requires trustworthy scenario result/evidence/diagnostic/exit propagation.

**Observed tests:** `test-platform/test/bvp-scenario-id-cli.test.ts` test “DEC-351 independent invocation isolation and status mapping” invokes the compiled CLI twice for the same **completed** `s06a-fresh-local-only` scenario and then directly calls the exported helper `exitCodeForScenarioStatus("failed"/"blocked"/"unsupported")`, asserting each returns 1. Other CLI tests execute completed scenarios, reject invalid request selectors before dispatch, or force a result-file collision. **No authored DEC-351 test invokes a valid selected scenario through the compiled CLI that actually returns a `failed`, `blocked` or `unsupported` scenario verdict and verifies the persisted canonical classification/diagnostic/verdict and process exit together.** A helper-only mapping check and preflight rejection are not a runtime oracle for post-dispatch failure behavior.

**Impact:** This misses the normative end-to-end fail-closed negative outcome and evidence/exit integration contract. All eight tests can PASS while a future wrapper regression suppresses, misserializes or misclassifies a real failed/blocked scenario after dispatch. This is a **material mandatory test-family inadequacy**, not an assertion that the present simple mapping helper is wrong.

**Required to close:** Author an independent adversarial fixture/test mechanism respecting the static authorized catalog and **without adding arbitrary user-selected modules, untrusted injection flags, physical/live paths or a second runner**. Exercise an actual noncompleted `DeterministicScenarioRunner` result end-to-end at the compiled Node boundary, asserting stdout, result file, canonical machine verdict/classification/diagnostic, matched actual step observations and nonzero exit; include a meaningful intentionally failing oracle. If all public static scenarios naturally pass, use a bounded test-only mechanism/design justified and explicitly scoped without silently widening the production CLI surface. Do not weaken any nominal, catalog, mode or privacy oracle.

### DEC351-F02 — MODERATE — Valid-path selection rejection leaves no durable result; output collision is detected only after dispatch

**Normative basis:** Sections 2–3 call for a stable, bounded `--result-file` JSON interface, classification/diagnostic/exit for preflight faults, invalid run data rejected **before** the runner, safe persistence handling and no unverified PASS.

**Observed source:** In `run-deterministic-scenario.ts`, `main` wraps `parseRequest()` and catalog selection in one `catch` that only prints `BVP_DIAGNOSTIC {...}` to stderr and exits 1. When argv is structurally valid with a usable result path but the named scenario is unknown or live-only, the specified result-file is not written. Existing “DEC-351 rejects malformed, unknown, repeated and live-only args before dispatch” test at about L94–116 expressly asserts **absence** of that file in all these cases. This leaves a caller relying on the documented JSON file without a durable machine result for a known-path selection failure. The textual error is safe and no scenario dispatch occurs, so privacy/no-live safety is preserved.

A second boundary issue: the `flag:"wx"` exclusive creation protecting previous results is performed **after** `run(definition)`, so a known existing output path still incurs a full in-memory scenario execution before a known persistence rejection; the collision tests prove no prior result clobbering and exactly one 0/one 1 for concurrent same-path requests, but do not prove pre-dispatch collision rejection. Since only isolated in-memory deterministic effects are possible, this is not a physical-effect or replay vulnerability in the authorized scope.

**Required to close:** Define/document whether a valid parsed output destination receives a sanitized failure envelope for post-parse unknown/live-only selector rejection; provide a corresponding test proving safe durable diagnosis with nonzero exit, while malformed/missing-path requests remain stderr-only and dispatch-free. Move known output collisions to a protected pre-dispatch check or document and test that dispatch-before-output-failure is explicitly acceptable under the DEC-351 contract, preserving atomic no-clobber race safety. Do not attempt a write/erase policy that corrupts an existing prior result.

### DEC351-F03 — INFORMATIONAL — R4 governance class and budget sensitivity

The PHX evidence uses `changeClass=authorized-governance` with `BVP_REPOSITORY_CHECK_RESULT=PASS`; this appears associated with DEC-349's existing explicitly Owner-authorized frozen-budget amendment (4,000→4,500, 750→950), not a new DEC-351 modification of frozen guard/pin. The exact source-to-evidence comparison did not show any newly changed frozen guard files. The next Builder should document the baseline-class distinction without using that label as a standing bypass for ordinary future changes. At **950/950** live-device LOC, no extra modification of live-device is authorized without headroom or an Owner decision.

## Ten mandatory test families — independent assessment

| Family | Assessment | Grounding |
|---|---|---|
| 1. Nominal/success | ADEQUATE | Exact `s06a-fresh-local-only` compiled CLI run, canonical completed evidence/exit |
| 2. Boundary/negative/malformed | PARTIAL | Extensive arg/live-only rejection; F02 valid-file preflight envelope ambiguity |
| 3. Legal/forbidden state transitions | ADEQUATE for source | Registered deterministic-only catalog; no live fallback; no extra scenario dispatch on bad selection |
| 4. Repeat/retry/cancel/recovery | ADEQUATE within deterministic scope | Separate invocations reproduce canonical evidence; no persisted shared world; duplicate file fails |
| 5. Concurrency/race/order | ADEQUATE bounded | Two simultaneous isolated runs and same-output race winner/no overwrite |
| 6. Persistence/restart/data integrity | PARTIAL | Exclusive `wx` preserves previous evidence; valid-path selection failure has no durable file; collision detected after run |
| 7. Identity/security/trust/privacy | ADEQUATE for synthetic tests | Strict ID/path selector, no raw capture, private IDs filtered; no real vault/Drive/physical permission |
| 8. Public contract/integration/compatibility | PARTIAL | Compiled Node/registry/runner tests pass; F01 lacks real noncompleted scenario end-to-end file/verdict integration |
| 9. Architecture/ownership/invariants | ADEQUATE with bounded note | Fixed runtime/pin and exact source, guard PASS, 4145/4500 and 950/950, existing battery compatibility |
| 10. End-to-end/fail-closed/destructive safety | **INADEQUATE for acceptance** | F01 intentional failing scenario oracle missing; preflight negative/collision checks do not substitute for post-dispatch failed/blocked canonical result |

## Disposition and permitted Builder corrective scope

**CORRECTION REQUIRED — NOT ACCEPTED.** Do not invalidate the legitimate exact-source R4 PHX-CI PASS; it qualified exactly what was tested, but the independent mandatory ten-family completeness requirement is not met. Restore Builder custody at **handoff-count 2** after publishing the reports and state. Builder should first derive a narrow F01 test plan and clarify the F02 valid-path failure contract against DEC-351; then author tests before bounded fixes, keep catalog and existing engine intact, use pinned Windows PHX-CI solely for engineering-change verification and publish fresh original immutable evidence before another Reviewer handoff.

No Reviewer production, test, script, manifest, PHX-CI evidence or physical work. No integration/merge, release, install, PowerShell library build, real device/Drive/vault use or dependent feature authorization. This verdict concerns only DEC-351.
