# WS-07 — BVP Direct Scenario-ID CLI (Build Unit)

**Status:** BUILDER SOURCE IMPLEMENTED / TESTS AUTHORED FIRST / PHX-CI NOT_RUN / REVIEWER NOT_AUTHORIZED / NO ACCEPTANCE CLAIM.  
**Owner directive:** 2026-10-24: make individual BVP scenarios callable by their stable scenario ID through a small public Node CLI, reusing the existing TypeScript BVP scenario runner. **Persist planning/decisions/state first; do not start development in this planning action.**  
**Decision:** DEC-351; preserve DEC-350, DEC-347/348 and applicable prior frozen boundaries.  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin` / WS-07; exact bound preimplementation source HEAD `d3f48e253c39e848b390aa4befed2b7cdb66cc04`, feature branch `build/bvp-powershell-interface-20261024`; source extension for the existing battery's test list explicitly rebound at `ce46ba777206a94e3c3a92f4b8d3a0d3a3dd86d5` (no new authority, no guard changes).  
**Intended development scope:** one bounded Builder implementation session for code + meaningful authored tests; PHX-CI qualification, evidence publication, independent Reviewer and integration are **separate subsequent gates**, not promised inside the one window.

**Authorized implementation writable paths (exact, not a general pattern):**
- `test-platform/test/bvp-scenario-id-cli.test.ts` — test-first contract/adversarial tests;
- `test-platform/test/batteries/deterministic-battery-registry.ts` — mandatory inclusion of the new test in the existing platform-core and all-platform-tests battery groups (no battery API change);
- `test-platform/test/batteries/deterministic-scenario-registry.ts` — static type-safe catalog;
- `test-platform/test/batteries/run-deterministic-scenario.ts` — thin public Node CLI;
- `dev/state/current-state.yaml` — continuity only;
- THIS task contract — status/evidence only;
- `dev/planning/03-verification/bvp-operator-runbook.md` — accurate not-yet-qualified operator documentation only, not acceptance assertions.

Frozen manifest, production `src/**`, PHX-CI configuration, existing scenario runner, all other existing tests/registries and all other paths are NOT writable under this implementation slice. The core runner `run(scenario)` is already public; do not edit it. This is an Owner-dispatched Builder continuation, not a Reviewer handoff; preserve handoff-count 6, no independent acceptance before PHX-CI PASS.

## 1. Exact source-grounded gap

BVP already has **individual-scenario execution**, not a private/unimplemented runner method. `test-platform/src/scenario/scenario-runner.ts` exports public `DeterministicScenarioRunner.canonical().run(scenario: ScenarioDefinition)`. `test-platform/scenarios/**` exports typed definitions whose `id` is validated by `scenario-contract.ts`. Individual Node `test()` registrations call the runner: e.g. `test-platform/test/s06a-initialization-one-sided.test.ts` imports `freshLocalOnlyScenario` (ID `s06a-fresh-local-only`) and registers one named Node test that invokes `.run(scenario)`. The `run-deterministic-battery.ts` CLI currently selects registered **test files by battery name**, not scenario IDs. `node --test-name-pattern` can filter named tests but does not provide a stable BVP-owned scenario-ID/JSON result command.

**Requirement:** expose a **narrow, public deterministic scenario-ID CLI dispatcher** that resolves exactly one known definition and passes it unchanged into that existing runner. Do not rewrite the scenario engine, add a second runner, reinterpret assertions, run every battery, use test-name substrings as an authorization selector or build a PowerShell library.

## 2. Contract and placement (planned, subject to guard/identity preflight)

- Generic, reusable entrypoint proposal: `test-platform/test/batteries/run-deterministic-scenario.ts`; compiled CommonJS `.test-build/bvp/test-platform/test/batteries/run-deterministic-scenario.js` under existing `test-platform/tsconfig.json`.
- Stable CLI contract: `node <compiled-entrypoint> --scenario <exact-scenario-id> --result-file <absolute-result-json>`. Read-only discovery: `--list-scenarios` with a bounded JSON list of stable `id`, `mode`, and description/status; discovery must never invoke scenarios and must reject execution-only flags. **No other flags** by implication; reject unknown, repeated, malformed, missing or incompatible argv before any scenario effect.
- Small static **deterministic scenario catalog** (tentative `test-platform/test/batteries/deterministic-scenario-registry.ts`) importing source definitions, mapping each `ScenarioDefinition.id` exactly once to its actual object. Names/paths are compile-time code, not evaluated shell strings, `eval`, dynamic untrusted imports, or a general plugin/module router. Catalog every currently supported deterministic scenario definition under `test-platform/scenarios/**`, and fail CI tests on missing/duplicate identifiers, wrong mode or unregistered newly added deterministic definition. Catalog is a locator, not a second runner/engine.
- TypeScript runner invocation: `DeterministicScenarioRunner.canonical().run(selectedDefinition)`, **once**, with canonical existing evidence/diagnostics, explicit supported mode; reject `live`-only definitions, unknown IDs, invalid run data and source drift **before** invoking the runner. No automatic fallback to live transport.
- Single bounded result file: identity (`requestedScenarioId`, actual `result.scenarioId`, `executionMode:deterministic`), unaltered canonical BVP status/classification/diagnostic and **privacy-safe** canonical machine evidence. Do not expose unsanitized captures, raw fixture contents, credentials, unredacted device/vault IDs, raw child exceptions or sensitive filesystem paths. Console output is brief/safe; deterministic `completed` exit 0, every `failed`/`blocked`/`unsupported`, preflight, write, exception or integrity fault is nonzero. Uncertain/incomplete output is NOT VERIFIED. Do not call a blocked result PASS.
- PowerShell caller only launches compiled Node in a fresh disposable `C:\temp\<GUID>\` run/checkout, passes distinct argv elements and preserves `$LASTEXITCODE`, result, and source identity. **No .ps1/.psm1 adapter implementation** required for this feature.
- Preserve `src/**` shipping exclusion; no production seams, `test-platform/src/scenario/scenario-runner.ts` changes, lock/budget increases, PHX-CI config/pin or GitHub Actions. Any absolutely necessary deviation is a new scoped decision, not implied permission.

## 3. Mandatory implementation discipline

1. **Before writing validation/verification-related code, freshly read the current original operating protocol** linked in root `AGENTS.md`. Current docs, cached copies and chat context do not satisfy its immediate-before-authoring gate.
2. Ground fresh GitHub remote/branch, commit, current accepted state, relevant WS-07 scope/architecture, DEC-351, frozen manifest, both CLI runners, scenario definitions/DSL, existing registries/tests; inventory all deterministic scenario definitions and actual IDs. Rebind this preplanned contract to exact predecessor SHA and **exact writable-path allowlist** before authorizing code edits. Do not begin from stale pinned source.
3. Author contract and adversarial tests **first** and maintain ten-family test-adequacy traceability. At minimum:
   - nominal independent execution of an exact scenario ID with correct canonical result/evidence and no other scenario run;
   - deterministic registry coverage for every declared deterministic scenario; duplicate ID/mode mismatch/new definition omission fails closed;
   - unknown, malformed, missing/duplicated flags, empty ID, path-injection/shell metacharacter requests, and `live`-only ID rejection without execution;
   - unsupported/blocked/failed scenario statuses accurately classified and nonzero, no synthetic PASS;
   - repeated calls have isolated in-memory worlds and stable independent results; scenario definitions stay immutable;
   - simultaneous independent requests do not leak state or mix evidence; test result-persistence errors/no success reports;
   - privacy of stdout/result, no raw secret/capture/device/absolute vault path leaks;
   - stable JSON schema and compiled CLI compatibility; exact source/identity traceability; no direct mutation of production or private vaults;
   - shipping exclusion, architecture guard, TS core/live budgets, zero new scenario-specific scripts; existing battery CLI behavior preserved;
   - end-to-end single-scenario fixture against the existing production planner/executor virtual world, plus intentional failing oracle and no unapproved physical side effects.
4. Keep implementation generic and minimal, within existing 4,500 logical TS BVP-core limit and all other unchanged architecture limits. No new third-party dependencies and **no claim of an actual third-party iPhone simulator**. External simulator discussion/requirements are **separate and unresolved**; do not assume logical in-memory devices are third-party iOS emulation.
5. Qualify changed software only with the existing pinned Windows PHX-CI via repository-controlled `dev/scripts/` operators; publish exact source SHA, original `dev/_ca-output.md`, `dev/test-results/<runId>/`, tests, architecture metrics, and exit codes. Node CLI operational testing is distinct from software-change acceptance. Run complete verification/repair loop to genuine PASS before issuing independent Reviewer handoff.
6. After source qualification and independent Reviewer acceptance, update `dev/planning/03-verification/bvp-operator-runbook.md`, audit parity/status, and current state with tested CLI invocation and source/evidence identity. No merge/release/installation/physical dispatch without separate authorization.

## 4. Acceptance and explicit non-goals

**Acceptance:** One named deterministic scenario can be invoked by exact `scenario.id` through public compiled Node CLI, isolated from other scenarios, returning trustworthy existing BVP result/evidence/diagnostics/exit. Every deterministic scenario is discoverable/resolvable or the catalog completeness gate fails. Disallowed/live IDs cannot execute or fall back to physical. Named deterministic battery CLI remains fully compatible. PHX-CI full PASS and independent Reviewer final acceptance required for finished source change.

**Not in scope:** BVP comprehensive PowerShell API or persistent profile system; implementation/replacement of scenario runner; full physical/live scenario-ID entry; any real Windows Obsidian, Google Drive, iPhone/iPad or third-party simulator interaction; system-wide PHX-CI changes; new simulator dependency; frozen architecture-budget or guard changes; production/plugin behavior; unrelated source refactors. A future **explicit** follow-on may expose authorized live scenario-by-ID routing, but NOT through this deterministic-first front door.

## 5. Actual Builder execution record — unqualified source

- Initial bounded source HEAD: `d3f48e253c39e848b390aa4befed2b7cdb66cc04`.
- Test-first authored/committed: `2169929b40db0ea142c10e73c674a84573c13def`, `test-platform/test/bvp-scenario-id-cli.test.ts`, covering catalog completeness/uniqueness, exact ID execution, read-only discovery, unknown/malformed/live-only selectors, repeat/output-overwrite behavior, result/evidence privacy and status mapping.
- Implementation: `test-platform/test/batteries/deterministic-scenario-registry.ts` (70 static source-bound deterministic scenarios); `test-platform/test/batteries/run-deterministic-scenario.ts` (read-only discovery; strict `--scenario` plus `--result-file`; invokes existing `DeterministicScenarioRunner.canonical().run(definition)` without runner modifications). Existing `deterministic-battery-registry.ts` explicitly includes the new test in both `platform-core` and `all-platform-tests`.
- Current code source includes TypeScript strict-typing and diagnostic identity corrections through `da37997e1b0f303d0b46ebbcbf5866cb05eace62`. **Not PHX-CI verified**; branch may advance for documentation/state.
- Existing `test-platform/src/scenario/scenario-runner.ts`, production `src/**`, frozen governance/PHX-CI configuration and operating PowerShell scripts were not changed.
- Test adequacy mapped to required ten families: nominal (exact selected ID), boundary (missing/empty/duplicate/unknown flags), adversarial (live-only/traversal rejection), negative/error (nonzero status and safe diagnostic), state/repeatability (separate runs and no prior-result overwrite), interaction/integration (compiled CLI/Node and existing scenario runner), privacy/security (sanitized machine evidence, no captures), regression (existing battery registry, all-platform inclusion), concurrency (separate invocations via independent Node processes; simultaneous collision remains an explicit future review/PHX-CI test-adequacy check), and environment/architecture (source registry coverage with tests; PHX-CI frozen guard/metrics still pending). **This is authored-test coverage, not executed PASS or independent adequacy acceptance.**
- **Qualification blocker:** The connected GitHub interface cannot execute on the Owner's Windows 11 environment; no genuine repository-controlled PHX-CI run, terminal evidence, change-set PASS, or independent final Reviewer decision exists. Do not issue a Reviewer handoff or merge before exact-source Windows PHX-CI PASS and independent final review. Any runtime defect found must be repaired within authorized scope and requalified.

## 6. Handoff readiness

The Builder has committed source and authored tests on the bounded branch. Next, verify current remote source/evidence identity and conduct the **first Windows PHX-CI qualification** using the existing repository-controlled local scripts. Repair genuine failures and repeat PHX-CI until exact candidate PASS; then and only then issue the independent final Reviewer handoff. Until those gates pass, the code is unqualified and may not be promoted or represented as accepted. Handoff-count remains unchanged.
