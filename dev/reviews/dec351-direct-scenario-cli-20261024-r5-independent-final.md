# WS-07 / DEC-351 — R5 FINAL Independent Review: Direct Scenario-ID CLI

**FINAL INDEPENDENT VERDICT: PASS WITH MINOR FINDINGS — ACCEPT the corrected immutable DEC-351 deterministic scenario-ID CLI for Windows software-only implementation, testing and governance closeout.** This accepts the reviewed candidate, **not** real/third-party iOS emulation, physical testing, personal Google Drive/vault interaction, master merge, installation, production release or permission to initiate another Build Unit.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`; **feature branch:** `build/bvp-powershell-interface-20261024`. **Reviewer:** Independent WS-07 Reviewer, **date:** 2026-10-24.

**Intake authorized state:** `f392fd48625df52c2a92acfc734713dcd2e2f418` (`handoff-count:3`, BUILDER→REVIEWER, exact feature `woodpk/gdrive-sync-obsidian-plugin/WS-07/BVP_DIRECT_SCENARIO_ID_CLI`). Remote branch HEAD matched this commit at intake. **Reviewed source:** `b532a9339fb631ffa03c3f74917e8370af138cff`. **Verified source Git tree:** `b220cb95e24a09cc6faa3befa9252b97ece07ea2`.

## Review sequence, source-only freeze and independence limitation

Pass 1 used only neutral DEC-351, DEC-350/349, normative Sections 1–4 of the task, current BVP architecture, frozen manifest and exact CLI/registry/underlying-runner source. It did not read this candidate's tests, historical independent review, Builder explanations/history, source diff or PHX-CI evidence. Source-only assessment was **PUBLISHED FIRST** as `dev/reviews/dec351-direct-scenario-cli-20261024-r5-independent-source.md` at `e53d8e676e266abfa736262fdd4c8fb528acbd13`. It is frozen and not modified by Pass 2.

The reviewer has seen an earlier DEC-351 review in this conversation, so this is a *strict current-candidate access-ordered source-only pass*, not a fresh-session with no prior feature knowledge. This constraint is expressly disclosed rather than claiming perfect historical blindness.

## 1. Independently verified original immutable PHX-CI qualification

- **R5 original PHX run:** `0c59579a-7625-4a8f-bad3-9aba147bea37`.
- **Original publication commit:** `bb40d7dd884ff12e73bc32786ea7e87731169f73`. Original evidence JSON: `dev/test-results/20261024T220132Z-operator-build-bvp-powershell-interface-20261024-b532a9339fb6.json`, Git blob `02868842829f6d212238123d853d621abf1fe042`; original matching `.md` and terminal `.log` published in the same evidence-only commit. Retrieved the original JSON at the **evidence commit**, not from a mutable aggregate.
- Evidence `repository.verifiedHead=b532a9339fb631ffa03c3f74917e8370af138cff`, `repository.verifiedTree=b220cb95e24a09cc6faa3befa9252b97ece07ea2` exactly. Original evidence commit is the direct descendant of source with changes confined to `dev/_ca-output.md/.json` and three original `dev/test-results` files. Original evidence→intake state changed planning/runbook/state only, with **no source/test changes**.
- **PHX pinned runtime SHA:** `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, framework `0.2.0-dev.2`, unchanged `phx-ci.json`. Original Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1.
- **11/11 stages PASS, exit 0** (preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts). Change-set PASS, repository PASS, overall COMPLETE/PASS.
- Focused BVP **547/547 PASS**, zero fail/skip; full product **1292/1292 PASS**, zero fail/skip. Counts overlap; never combine into an invented distinct-test sum. Original focused-stage stdout individually marks **PASS** for all 11 DEC-351 test cases, including the three newly added F01/F02 tests.
- Repository-check output: `BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0 context=authoritative changeClass=authorized-governance`. Metrics **framework core 4145/4500 PASS**, **live-device agent/relay 950/950 PASS**. The approved DEC-349 budget manifest predates this DEC-351 change; no new frozen-source change appears in candidate source→evidence diff. `authorized-governance` is **not** a standing permission for subsequent normal changes.
- All statements concern software-only tests on Windows. No original physical-device testing, personal Drive/vault activity or new third-party iOS simulator is represented or authorized.

## 2. Previous independent findings — final decisions

### DEC351-F01 — HIGH — CLOSED

Previous issue: helper-only exit-code mapping without a real noncompleted scenario through the compiled public CLI. Exact corrected tests are in `test-platform/test/bvp-scenario-id-cli.test.ts` test `DEC351 F01 canonical failed, blocked and unsupported scenarios propagate through compiled CLI`.

`test-platform/test/fixtures/dec351-cli-failure-preload.ts` is a **fixed test-only Node `--require` file** not imported by public runtime or selected via CLI flags. Its bounded in-process mutation of the existing `s06a-fresh-local-only` definition supplies genuine deterministic canonical outcomes using the original runner:
- `failed`: intentionally wrong seeded-file size oracle at `assert-size` causes `assertion-mismatch`, observed failed assertion with `matchedExpectation:false`;
- `blocked`: missing production plan `inputRef` at `execute` causes `missing-required-result`, preserving the earlier valid assertion observation;
- `unsupported`: unsupported input reference at `preview` causes `production-input-reference-unsupported`, with no later assertions falsely reported as executed.

Each compiled child process must exit 1 and create the exact requested result containing status/classification, typed diagnostic identity/phase/effect, and the **identical canonical `machine.verdict` diagnosis**; stdout status/classification must also agree. The preload's marker proves genuine existing runner dispatch; no second runner or dynamic public plug-in route. The PHX original focused stdout confirms this exact authored test PASS. **Material original acceptance blocker CLOSED.**

### DEC351-F02 — MODERATE — CLOSED

Corrected CLI `test-platform/test/batteries/run-deterministic-scenario.ts` now parses the strict public argv, then **atomically reserves output with `open(path,"wx")` BEFORE catalog selection and BEFORE `run()`**. If reservation fails, it returns safe `scenario-result-persistence-failed` phase `result-reservation`, effect `none-confirmed`, exit 1 without dispatch. The existing-file test checks original content is unchanged and a preload marker remains absent; concurrent same-file test expects one actual success and one failure, no overwrite.

For structurally valid args naming a nonexistent/live-only ID, a **new** exclusive destination contains a safe `{schemaVersion:1,requestedScenarioId,executionMode:"deterministic",requestStatus:"rejected",result:null,diagnostic}` request envelope. It is explicitly *not fabricated canonical scenario evidence*, prints `BVP_DIAGNOSTIC` and exits 1 without dispatch. Test asserts real JSON, safe classification, `effect:"none-confirmed"`, no verdict/captures and absent dispatch marker. Malformed/incomplete argv with no validated path still fails stderr-only with no result. All relevant PHX authored tests PASS. **Material original contract gap CLOSED.**

### DEC351-F03 — INFORMATIONAL — CLOSED AS GOVERNANCE EXPLANATION

DEC-349 Owner-amended preexisting core 4000→4500 and live 750→950 limits before DEC-351. Earlier ordinary-class comparison against a baseline predating DEC-349 produced a frozen-surface flag, but the qualified R5 uses the previously Owner-authorized `authorized-governance` class, not new modified frozen manifest, guard or runtime. Task/runbook record the limitation. This is *not* blanket future approval. **Documentary question CLOSED**, with standing 950/950 caution.

## 3. Mandatory ten-family independent adequacy

| Family | Conclusion for authorized Windows simulated scope | Concrete negative/positive oracle |
| --- | --- | --- |
| 1. Nominal/success | ADEQUATE | Exact `s06a-fresh-local-only` selected through compiled CLI, one canonical completed result/exit |
| 2. Boundary, malformed, negative | ADEQUATE | Unknown/malformed/duplicate/mixed flags, traversal, unknown ID and live-only ID rejected before runner; selection-rejection file when path valid |
| 3. Allowed/forbidden transitions | ADEQUATE | Deterministic-only catalog, no live fallback, no fake PASS, explicit request failure distinct from canonical scenario verdict |
| 4. Retry/isolation/repeat | ADEQUATE | Independent repeated process invocations have isolated virtual worlds and equivalent evidence; existing-path invocation no redispatch |
| 5. Concurrency/race/order | ADEQUATE | Distinct-file concurrent processes independently PASS; same-file atomic `wx` collision produces exactly one exit 0 and one exit 1 |
| 6. Persistence/integrity/restart | ADEQUATE within scope | Exclusive prior-result protection, rejection JSON for known destination, failed reserve nonzero/no dispatch; source identity/canonical consistency checks |
| 7. Identity/security/privacy | ADEQUATE within synthetic scope | Strict exact ID and path validation, canonical machine projection without raw captures, no live/device/vault dispatch, malformed/live-only selector |
| 8. Public interface/schema/integration | ADEQUATE | Compiled CommonJS Node CLI, JSON schema, 70 source-catalog entries/inventory test, existing canonical runner and retained existing battery CLI |
| 9. Architecture/governance/ownership | ADEQUATE for code; MINOR ADMIN FOLLOW-UP | Original PHX 11/11 PASS, core 4145/4500, live 950/950, frozen unchanged, source/evidence ancestry. See M-01 canonical mirror organization below |
| 10. End-to-end/fail-closed safety | ADEQUATE | Actual compiled CLI failed/blocked/unsupported tests preserve honest canonical verdict and exit 1; preflight and result-collision operations cannot dispatch |

**No missing substantive ten-family code/test blocker remains in this revised candidate.**

## 4. Nonblocking review notes and explicit limitations

**M-01 — Administrative evidence organization still needed for full closeout.** The original R5 flat `.json/.log/.md` files are immutably published and verified, and `dev/_ca-output.md` is present in that evidence-only commit, sufficient for independent exact-source verification. However the task's Section 3 additionally asks for a per-run history folder `dev/test-results/<runId>/`. A direct GitHub read of **`dev/test-results/0c59579a-7625-4a8f-bad3-9aba147bea37/result.json`** on the current reviewed handoff commit returned NOT_FOUND. Do **not** claim this mirror exists. Builder should publish an **identical-byte provenance-preserving administrative copy** of the original evidence files under this run-ID directory, with provenance/source/evidence commit retained, as part of feature closeout. Such a mirror is **not a new PHX run**, does not change the qualified source and need not trigger software requalification. Software acceptance here is separated from that pending record-organization obligation. If governance treats directory shape as a hard closeout gate, closeout remains incomplete until it is satisfied.

**M-02 — Ambiguous wrapper status on unexpected execution exception.** The CLI also uses `requestStatus:"rejected"` for caught post-selection runner exceptions with `result:null`, while its diagnostic explicitly says `phase:"scenario-execution"`, `effect:"unknown"`. Treat the diagnostic phase/effect as authoritative and do not infer that a selected scenario was never invoked from `requestStatus` alone. No untested real-device path is possible within DEC-351, and this does not invalidate F01's truthful *returned* noncompleted outcomes. A future separately authorized contract refinement could use an unambiguous request-level status for post-dispatch exceptions.

**M-03 — Terminal stdout before file-handle close.** On normal successful write the CLI prints a completed summary and only then attempts `output.close()`; an exceptional close error adjusts exit code to nonzero but cannot retract already printed stdout. Operators must require **actual exit 0 + valid complete result JSON + matching canonical evidence**, not stdout alone, and reject empty/incomplete files. This is a bounded low-likelihood failure-path observability risk; an optional future test of close-failure injection would improve negative coverage without inventing new validation authority.

**M-04 — Live LOC at ceiling and simulation limits.** Live-device code at 950/950 under DEC-349 leaves no unused margin; no Owner-approved increase is implied. The deterministic virtual world is not native iOS/iPad emulation, real Drive/Obsidian testing or a third-party simulator. No physical acceptance evidence.

## 5. Final decision, scope and handoff

**PASS WITH MINOR FINDINGS — SOFTWARE FEATURE ACCEPTED** at source `b532a9339fb631ffa03c3f74917e8370af138cff`, tree `b220cb95e24a09cc6faa3befa9252b97ece07ea2`, supported by actual original PHX 11-stage PASS and the independent ten-family assessment above. DEC351-F01, F02 and F03 are **CLOSED**. No blocker remains against the feature's *software-code independent review gate*. **Administrative evidence-folder organization M-01 remains OPEN for Builder closeout**, and this review must not be portrayed as satisfying that exact folder requirement until published.

After this final report is published, advance the authorized `dev/state/current-state.yaml` handoff **3→4**, owner REVIEWER to recipient BUILDER, preserving the immutable exact reviewed source and original evidence run. Builder is to verify current remote, read this full report, satisfy M-01 by provenance-preserving administrative evidence publication, and perform only authorized status/runbook closeout. Neither this verdict nor the prior PHX PASS grants a merge, installation, release, real device/Drive/vault operation, full PowerShell library, or new feature dispatch.

Reviewer performed **no** code, test, verification-script, architecture-manifest, original PHX evidence changes and **no** software test execution.
