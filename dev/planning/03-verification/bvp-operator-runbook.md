# BVP Operator Runbook — Mandatory Fresh-Session Read

**Audience:** every BRAIN Builder/agent producing an owner-facing BVP command, interpreting BVP results, resuming BVP work, or handing this project to a new chat session.  
**Last source audit:** 2026-10-24 at BRAIN commit `d78385e485ec966505c8d5122e99a3121840c16a`; full source analysis `dev/research/bvp-operator-api-audit-2026-10-24.md`.  
**Authority:** later Owner instruction (2026-10-24) favors driving existing Node/TypeScript BVP directly from PowerShell; the earlier comprehensive PowerShell-interface build is **not** necessary merely to run available BVP batteries. Governing protocol and PHX-CI qualification requirements still apply to **software changes**.  
**Verification level:** the earlier DEC-350 operator API audit remains source-only, while the DEC-351 compiled deterministic scenario-ID CLI passed Windows PHX-CI R5 and final independent software review. No physical-device/iOS acceptance or deployment authority.

## DEC-351 public scenario-ID CLI — R5 software-accepted; evidence closeout complete

The original DEC-351 CLI candidate `d8a681ce07155dbfa7e121afd01ac59c9e8056a5` passed Windows PHX-CI R4 11/11 and 544/544 BVP tests. **Independent Reviewer verdict: CORRECTION REQUIRED**, not accepted (DEC351-F01/F02/F03). Corrective Builder source **`b532a9339fb631ffa03c3f74917e8370af138cff`** completed Windows PHX-CI run **`0c59579a-7625-4a8f-bad3-9aba147bea37`** with 11/11 stages PASS, 547/547 BVP tests PASS, 1292/1292 product tests PASS, Overall PASS exit 0. Original evidence was published at **`bb40d7dd884ff12e73bc32786ea7e87731169f73`**. The corrected source received R5 **PASS WITH MINOR FINDINGS — SOFTWARE FEATURE ACCEPTED** at independent review commit `5d380c0a2c66aee72de3c0556f8099d771d57bc9`; it is **not** merge, installation, release or physical acceptance.

Planned/source-level CLI: `node .test-build/bvp/test-platform/test/batteries/run-deterministic-scenario.js --scenario <exact-id> --result-file <absolute-new-json>` or standalone `--list-scenarios`. It uses the existing `DeterministicScenarioRunner.canonical().run(scenario)` through a compile-time list of exactly 70 deterministic scenario definitions. No live/physical or third-party iPhone simulator is involved.

**DEC351-F02 resolved contract for correction candidate:** A malformed request, including a malformed output path, is rejected with safe stderr only. After successful structural argument parsing, the CLI atomically reserves the result file with exclusive create **before** any catalog lookup or scenario dispatch. A known output-file collision rejects without execution and cannot overwrite earlier results. An unknown/live-only scenario ID with a valid new destination writes `{schemaVersion:1,requestedScenarioId,executionMode:"deterministic",requestStatus:"rejected",result:null,diagnostic}`, reports a safe `BVP_DIAGNOSTIC` on stderr and exits nonzero. A `result:null` envelope is **not a scenario verdict**, not canonical runner evidence and never PASS. An actual selected scenario's canonical machine evidence is persisted without raw captures; noncompleted verdicts propagate to nonzero exit and stdout status/classification. Stranded empty/incomplete files after crash are not valid evidence.

**DEC351-F01 corrective tests:** compiled CLI processes with a *fixed test-only Node preloader* introduce an intentionally wrong assertion and genuine blocked/unsupported operations while still invoking the real deterministic runner. This test bootstrap is not a CLI flag, not dynamically loaded by public source, and does not expand the registered 70 scenarios or authorize real-device access.

**DEC351-F03 governance provenance:** DEC-349 expressly authorized two *pre-existing* frozen budget increases (core 4,000→4,500, live 750→950), accepted before DEC-351. The prior R4 source-to-evidence PHX-CI run used the approved `authorized-governance` class because its comparison against `master` still includes those DEC-349 amendments. DEC-351 itself changed **no frozen guard/manifest/pin** and is an ordinary CLI feature, not a new governance amendment. Continue to enforce all numerical limits and the immutable PHX-CI pin. Never generalize the old classification into a bypass or approval for future ordinary work.

See `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-direct-scenario-id-cli-2026-10-24.md` and `dev/state/current-state.yaml` for exact current source, corrections and qualification. **Windows PHX-CI PASS and independent R5 software acceptance are confirmed.** Original R5 evidence is mirrored without byte changes at `dev/test-results/0c59579a-7625-4a8f-bad3-9aba147bea37/` (see `provenance.md`). Owner-reserved promotion/deployment and physical activity remain unauthorized.

## WS-07 / DEC-352 BVP runtime error observability — R5 SOFTWARE QUALIFIED, R2 REVIEW PENDING

This authorized validation-only change uses the existing BVP mailbox/relay and direct installed plugin runtime, not a new operator CLI. Source is on `build/bvp-poll-error-observability-20261025`. The R1 and R2 original software qualification runs were BLOCKED and remain published. The R3 software qualification of immutable source `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64` passed all 11 PHX-CI stages; 559 focused BVP tests and 1,292 product tests passed. Exact original run/evidence identities are tracked in the feature task and feature-scoped state. **Final independent Reviewer assessment is now required**, and no physical BVP battery or device command is authorized by this software PASS. The ordinary/authorized-governance distinction remains: the `origin/master` diff contains older DEC-349 owner-approved frozen budget changes; DEC-352 grants no new frozen-budget change. See the task in `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-runtime-poll-error-observability-2026-10-25.md`.

**R1 independent review supersession (2026-10-25):** Review of original R3 source `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64` returned **CORRECTION REQUIRED — NOT ACCEPTED** for origin-run drift (F01), remote diagnostic duplicate creation after ambiguous responses (F02), and missing sustained-outage/recovery proof (F03). Reviewer procedure (F04) is disclosed as not perfectly blind; original evidence (F05) has been mirrored byte-identically under the original run ID with provenance. See original independent reports under `dev/reviews/bvp-runtime-error-observability-20261025-r1-*.md`. Builder corrections and adversarial test additions are committed on the same feature branch but **no PHX-CI validation has run against those corrections**. This is software-only work; do not execute the existing BVP live CLI or any physical operation. Follow the pinned PHX-CI launcher with the exact newly frozen source and preserve the first run's PASS only for its historic SHA.

**Latest DEC-352 qualifier:** R3 original PHX-CI PASS qualifies source `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64` for independent final review only. This is not Reviewer acceptance, Owner merge/installation authorization, a validated iPhone receiver, or permission for a live BVP test. The `dev/state/current-state.yaml` feature-scoped handoff-count/role govern independent Reviewer transfer; the unrelated top-level active Build Unit counter is unchanged.

**R5 qualification supersession (2026-10-25):** Following R1 independent CORRECTION REQUIRED and one corrective compiler-blocked R4, the exact R5 corrective source `5465f3a44a10943d71dd6aa39f73cad47efd076b` (tree `9452eb587b4e5bd09fb28b0e13545bea7e688a29`) passed unchanged pinned Windows PHX-CI run `096ba9a5-aba5-41e8-84b9-1c7990d906e6`: 11/11 stages PASS, focused BVP 566/566 and product 1,292/1,292 PASS; change-set/repository/overall PASS, exit 0. Original evidence commit `2c028c9b69941b15634fd3ec79b1e8f923cc9689`, original run-ID exact-blob mirror under `dev/test-results/096ba9a5-aba5-41e8-84b9-1c7990d906e6/`. **R2 independent Reviewer acceptance is pending**, with feature handoff-count 3. Source-first blind Reviewer pass must avoid Builder narrative (including nonnormative history here and in task) until its written independent assessment is frozen. Neither PHX-CI PASS nor this runbook authorizes physical tests, personal Drive/vault operations, merge, prerelease, install or promotion.

## DEC-352 R6 PHX-CI BLOCKED; R7 corrections require new qualification (2026-10-25)

- Original immutable R6 source `2bb4e3a1fb211b83579dc797e21ee047a869606a`, tree `a0b20bb8cfffaed12534af6f24580086e9809f77`; PHX-CI run `e5dfbe24-7a98-4ad6-9e0e-3a7dd7ff9d2d`; original published evidence commit `06f488c2ab64e532ce0967113f8ec9a72f8c9ac0` and flat `dev/test-results/20261025T215430Z-operator-build-bvp-poll-error-observability-20261025-2bb4e3a1fb21.{json,md,log}`.
- Actual R6 verdict: **change-set FAIL, repository PASS, overall BLOCKED exit 201**; focused 567/571 PASS, four test failures; product 1292/1292 PASS; typecheck PASS; build/repository-check/check/artifacts NOT REACHED. Do not reuse R5 success or relabel R6 BLOCKED as PASS.
- R7 narrow corrections: update two architecture assertions from 4500 to DEC-353 exact core 4550 and preserve one-over-limit rejection; distinguish invalid JSON from typed invalid diagnostic metadata; replace superseded local-only unbound-test expectation with null-run-preserving delivery expectation. Committed source/tests under existing BVP feature; still **NOT PHX-CI VERIFIED**. Handoff count 4, recipient BUILDER.
- Next software-only PHX-CI must use unchanged repository script `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1`, pinned framework `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, an exact immutable new candidate source SHA on `build/bvp-poll-error-observability-20261025`, and `-SoftwareOnlyBranch` plus `-SoftwareOnlyGovernance`. No human physical YES step, no iPhone/iPad, no live Google Drive/vault operation. R7 run is allowed under the protocol's substantive-failure rerun exception, but only after the exact source is frozen.

## DEC-352 R2 corrective build — unverified, Owner DEC-353 budget in force (2026-10-25)

- The R2 independent final verdict is **CORRECTION REQUIRED — NOT ACCEPTED** for the earlier R5 source. Owner separately approved DEC-353: historical-run and unbound known-device validation-only diagnostic retrieval through the existing authenticated mailbox, plus frozen framework-core budget **4,500 → 4,550**. Live-device budget remains **950**; the Owner published the lock change directly on the feature branch.
- Under the same DEC-352 feature handoff count **4**, Builder committed tests FIRST at `44b31bb8d6ca9516d430eae85998b939a6bbde1b`, page-token fixture correction at `64d5ca6b852f3fe0f45261c1e7fb463f07849c3c`, then new bounded source. Tested behaviors are **NOT YET VERIFIED BY PHX-CI**.
- The read-only Windows relay now obtains at most 25 records per device and poll, persists a device-scoped page cursor after successful inbox writes, and can collect originating run A after run B lease supersession without dispatching commands for run A. Unbound errors with known device and unknown run remain honestly unbound. Reporting-failure diagnostics stay local-only to prevent recursive publication. Remote cloud history is not deleted; unresolved records remain intact.
- Previous original R5 `096ba9a5-aba5-41e8-84b9-1c7990d906e6` verified source `5465f3a44a10943d71dd6aa39f73cad47efd076b` only; its PASS is **not** evidence for R2 corrections. Next step is exact new source HEAD software-only Windows PHX-CI through existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` with `-SoftwareOnlyGovernance -SoftwareOnlyBranch build/bvp-poll-error-observability-20261025`, no physical flag or device operations. Owner controls execution. Do not hand off for review without complete original PHX-CI PASS, source/tree and evidence publication. No merge, release, prerelease, installation or live Drive/vault/physical use is authorized.

## New successor Build Unit — result-close stdout finalization (IN PROGRESS, UNVERIFIED)

The separately authorized software-only successor `WS-07/BVP_CLI_RESULT_FINALIZATION` is under development on branch `build/bvp-cli-result-finalization-20261024`. It corrects the accepted DEC-351 M-03 observation that a `completed` summary can be printed before FileHandle.close succeeds. **No PHX-CI run or independent review exists yet for the successor**; its source and test edits must never be represented as accepted. Predecessor DEC-351 at `b532a9339fb631ffa03c3f74917e8370af138cff` remains the last accepted immutable feature. See `tasks/bvp-cli-result-finalization-2026-10-24.md`. No operator or physical activation is granted.

## 0. Mandatory agent re-entry procedure — do this before EVERY BVP-related answer

1. Fetch **current remote** `woodpk/gdrive-sync-obsidian-plugin`; read repository root **`AGENTS.md` first** and follow its current protocol refresh gate. Do not treat prior chat memory as fresh authority.
2. Read this entire runbook. Then read `dev/research/bvp-operator-api-audit-2026-10-24.md`, `dev/state/current-state.yaml`, `dev/authority/decision-register.yaml` applicable BVP decisions, current `test-platform/test/batteries/{run-deterministic-battery,run-live-battery,deterministic-battery-registry,battery-registry}.ts`, and `test-platform/src/scenario/scenario-runner.ts`. **Refresh if actual source/branch differs from the pinned audit.**
3. Inspect `package.json`, `test-platform/tsconfig.json`, the frozen BVP authority / Owner physical prohibitions, and the target branch HEAD; inspect a selected battery's source/test module and its mode before proposing execution.
4. Decide explicitly whether the user is asking to **operate BVP** (existing Node runner, no PHX-CI front door) or **qualify changed software** (PHX-CI exclusively, published evidence, independent Reviewer). Never silently substitute one for the other.
5. State precisely what the command can prove; declare **NOT VERIFIED** for unrun commands, absent output, unexposed API, untested simulator behavior or incompatible mode. No fabricated PASS, no rerun of uncertain physical effects.
6. Before printing any validation-related PowerShell/launcher code, freshly re-read the current original Google Drive operating protocol as required by `AGENTS.md`; audit the **exact displayed text** (PowerShell 7.6.6 quoting, trailing backticks, continuation, argv shape, exit propagation, path isolation, rerun safety and privacy). Do **not** claim a script was run merely because it was inspected.
7. Update this runbook and its traceability if source API/CLI flags change. For any BVP issue after handoff, consult this manual first and the current source second; do not restart speculative interface-library development.

## 1. What BVP is and how PowerShell talks to it

BVP is primarily **TypeScript** and compiled to **CommonJS JavaScript**. PowerShell does **not** call TypeScript methods directly. For exposed APIs, PowerShell invokes `node.exe` on a compiled BVP JavaScript command-line entrypoint with exact argv and output paths. BVP (Node) does the testing, classification, and output; PowerShell only prepares the controlled working directory, binds approved arguments, captures exit/output, and reports the **unchanged** verdict.

The current two important source entrypoints:

| Intended operation | Compiled JS relative to repository | Availability |
| --- | --- | --- |
| Named deterministic battery | `.test-build/bvp/test-platform/test/batteries/run-deterministic-battery.js` | **Source-confirmed reachable**; direct operational use possible after compile/preflight |
| One exact deterministic scenario ID | `.test-build/bvp/test-platform/test/batteries/run-deterministic-scenario.js` | **DEC-351 R5 independently accepted for Windows software-only**; 70 known deterministic IDs, no live dispatch |
| Live battery / real relay | `.test-build/bvp/test-platform/test/batteries/run-live-battery.js` | Source-confirmed CLI exists; **not authorized for real Windows/iOS/Drive/vault execution**, and NOT the generic iPhone/iPad simulator |

The prior `dev/scripts/Invoke-BVP-Battery.ps1` and `Invoke-BVP-Deterministic-Battery.ps1` **throw on purpose**; never send the owner to those retired scripts. Proposed `Get-BvpBattery`, `Invoke-BvpScenario`, `Bvp.psm1` etc. **do not exist**. The older PowerShell library plan is historical/unimplemented.

## 2. Supported direct operations and current access gaps

**Existing named deterministic batteries** (current registry is the source of truth):

- `platform-core`
- `s06-sync-semantics`
- `s07-fault-recovery-safety`
- `s08-live-platform-infrastructure` (software tests of live infrastructure **only**)
- `s09-late-completion-recovery` (software tests of late-result/bridge mechanisms **only**)
- `all-platform-tests` (normal suite)
- `bvp-private-tap-canary` (**deliberate failure/privacy canary; not routine**)

**Still not public:** general battery list/help, live-only or arbitrary non-deterministic scenario-ID execution, typed device commands, interactive result query, persisted PowerShell config, or complete S09 live-battery simulation. **DEC-351 now exposes exact-ID dispatch and read-only discovery for 70 deterministic definitions**, not all 84 TS definitions. Those exist only as TS contracts or proposed functionality. If requested, inspect the precise TS entrypoint and introduce **only** the smallest needed, source-audited TypeScript CLI accessibility change through the normal governed Builder/PHX-CI/Reviewer process; do not claim a fictitious flag, hardcode a second runner, or invent a PowerShell API clone.

**Windows-hosted simulation:** `DeterministicScenarioRunner.canonical().run(scenario)` creates an in-memory multi-device virtual world. Its device names are **logical labels**, not native iPhone/iPadOS emulation. Scenario mode must include `deterministic`; live-only definitions cannot automatically use this executor. Some scenario steps are unsupported in deterministic mode (for example physical connectivity toggles and large-pattern fixture operation). Report those honestly. The internal PHX-only `s09-br02-simulated-checkpoint` fixture is not a public simulator option.

### DEC-351 direct deterministic scenario-ID interface — source contract, not a paste-ready launcher

Use only the existing compiled CLI in a freshly grounded, authorized disposable checkout. This is one selected scenario, not a test battery or live controller:

```text
node <compiled-run-deterministic-scenario.js> --scenario <exact-stable-id> --result-file <new-absolute-json-file>
```

Read-only listing: `node <compiled-run-deterministic-scenario.js> --list-scenarios`. The list enumerates 70 deterministic definitions without dispatch. Unknown/live-only IDs with a valid new destination return `requestStatus:"rejected", result:null` and a safe diagnostic, exit nonzero. Malformed argv is stderr-only; existing output files are never overwritten, and the output is atomically reserved before dispatch.

**M-02:** A post-selection runner exception also uses `requestStatus:"rejected"` but `diagnostic.phase:"scenario-execution", diagnostic.effect:"unknown"`; the latter is authoritative and does NOT establish absence of execution. **M-03:** Successful stdout may be printed before `output.close()`, whose failure changes process exit to nonzero. Always require actual process exit **0**, complete JSON, correct requested/actual scenario identity, canonical machine evidence, deterministic mode and `result.status:"completed"`. Missing/incomplete output, `result:null`, or nonzero exit is **NOT VERIFIED** regardless of stdout. **M-04:** 950/950 live budget remains at its ceiling; no physical/third-party iOS simulation or live Drive/vault acceptance. Never claim this software-only command proves those capabilities.

## 3. Mandatory preparation for a Windows operational deterministic battery

**Do not paste this whole section as a single unreviewed script.** It is the source-checked order and argument contract for generating a new, specifically audited operator command.

1. Resolve fresh actual remote HEAD and desired authorized source branch. Use a **new** `C:\temp\<GUID>\` root for this invocation, with separate disposable clone/worktree and result directory. Keep the user's control checkout clean; no %LOCALAPPDATA% run outputs; do not alter production vaults/Drive.
2. Require `git`, `node`, `npm` and correct Windows PowerShell 7.6.6 environment; check `git rev-parse HEAD`, `node --version` and `npm --version`. If using a remote branch, fetch fresh and detach at the **actual** selected HEAD; do not hardcode an old snapshot SHA that will fail on an ordinary branch advancement. If source must be immutable for a given authorization, verify the pinned SHA rather than switching silently.
3. In the disposable repository, `npm ci` using the checked-in lockfile; then **compile only** using repository TypeScript `node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json`. Successful compilation is not BVP run PASS or PHX-CI source qualification.
4. Confirm the compiled file `.test-build/bvp/test-platform/test/batteries/run-deterministic-battery.js` exists **inside that same checkout**. Check the selected battery is exactly one of the registry's current names, and record the source SHA and selected test module list. `bvp-private-tap-canary` must not be selected for routine acceptance.
5. Choose new output files under this invocation's root: e.g. `results/bvp-battery-result.json`, `results/bvp-test-output.tap`, plus full operator terminal transcript with a clear status/exit summary. No sensitive values or authentic device IDs in shared evidence.
6. Spawn `node` on the **compiled** deterministic runner, passing **exactly**:
   ```text
   node <compiled-run-deterministic-battery.js> --battery <registry-name> --result-file <absolute-result-json-path> --tap-file <absolute-output-tap-path>
   ```
   These three flags are required. PowerShell variables must be passed as discrete native argv elements; never concatenate shell text into an eval/Invoke-Expression call. This displayed line is an argument *shape*, **not** a paste-ready terminal script.
7. Immediately capture the actual `$LASTEXITCODE`, then parse the result file and structural TAP if present; verify `result.status`, `result.exitCode`, battery name and artifact completeness. Preserve output even on failure; distinguish compile failure, launch failure, file-write failure, test failure, missing/partial evidence, and interrupted child.
8. BVP operation result is completed only if Node exit 0, `result.status='completed'`, `result.exitCode=0`, selected battery identity matches, and required output artifacts exist and are consistent. The runner emits a privacy-safe structural TAP summary; it intentionally suppresses raw test names, exceptions and child stderr. An absent result is **UNVERIFIED**, not PASS.
9. Do not merge, install, release, promote, or represent BVP's run as source-change PHX-CI/Reviewer acceptance. Provide the result/TAP/transcript absolute paths under the new run root and a clear limited-scope verdict.

### Common failure interpretations

| Symptom | First source-grounded investigation |
| --- | --- |
| Compiled `.js` missing | Compilation absent/failed; wrong root or path; check `test-platform/tsconfig.json` `outDir`. |
| `unknown deterministic battery` | Registry changed or supplied name invalid; reload `deterministic-battery-registry.ts` and list supported names. |
| `missing required argument --...` | Required three-flag argv incomplete; do not invent defaults. |
| Nonzero process exit with `result.status=failed` | Actual test failure or child-process problem; inspect sanitized diagnostic and structural TAP. |
| Exit 0 but result absent/malformed/mismatched | **NOT VERIFIED**; preserve evidence and investigate, no success claim. |
| Diagnostic says `deterministic-subprocess-launch-failed` | Check Node executable, compiled test paths, child launch; raw subprocess errors are deliberately suppressed. |
| Child TAP names/stack traces absent | Expected intentional privacy filter; do not disable redaction to make logs verbose. |
| A named live scenario cannot run deterministically | Mode or step mismatch, **not** evidence that iOS simulation succeeded. |
| User asks to run a single declarative scenario ID | The approved DEC-351 compiled CLI supports **one exact deterministic ID**; live-only or unknown IDs fail closed. Verify actual exit and complete matching JSON, not stdout alone. |

## 4. Live runner API — source reference ONLY, no owner execution authority

Live registry contains `windows-live-smoke`, S09A–S09E physical scenarios. Its Node CLI requires `--battery`, `--result-file`, `--device-map-json`, `--run-id`, `--relay-root`, `--validation-source-commit`, `--checkpoint-file`. Optional `--validation-build-identity-file`, `--resume-evidence-json`, `--recover-timed-out-result-file`, `--result-timeout-ms`, `--production-result-timeout-ms`, `--poll-interval-ms`. Default standard timeout 60 seconds, production result 600 seconds, poll 250 milliseconds. Source commit must be 40 hex characters; all required device labels mapped; IDs unique and at most 128 characters under `createLiveScenarioExecutor`.

**Safety:** live controller creates relay/authority files and can dispatch real device commands. Physical iPhone/iPad, live Drive mailboxes and personal/test vault mutation are not authorized in the current Windows-first simulated campaign. **Do not supply an executable live command** unless Owner scope and applicable software/install/identity gates are freshly proven. Do not equate an internal PHX-only simulated BR02 fixture with ordinary user simulation.

The live executor's `result.status` `completed` exits 0; `blocked` with pending human checkpoint exits 3; other noncompleted states exit 1. **3 is not PASS**. A timeout or unknown receipt means potential uncertain effects. Resume/late-completion requires the exact original blocked run, source/device/command identity, terminal receipt and no pending relay commands; `--recover-timed-out-result-file` and `--resume-evidence-json` cannot coexist. Never auto-repeat physical execution on uncertainty.

## 5. Architecture and qualification separation

| Task type | Execute through | Verdict authority |
| --- | --- | --- |
| Owner-directed **BVP operation** on existing accepted source | Underlying **BVP compiled Node CLI** via audited PowerShell terminal instructions | BVP's own result for the bounded test performed; simulation clearly labelled |
| Changed BRAIN source/test/code or new CLI | Existing pinned, local **PHX-CI** engineering workflow; `phx-ci.json`, repository-controlled script, published `dev/_ca-output.md` and historical `dev/test-results/<runId>/` | PHX-CI PASS + governed independent final Reviewer; not raw Node console output |
| Physical device/Drive/vault acceptance | **Deferred** until new explicit Owner authorization and applicable installed-product gates | Never imply proof from deterministic/simulated success |

No GitHub Actions. Existing `AGENTS.md` fresh-protocol authoring requirement remains intact.

## 6. New-session handoff and trust checklist

On every new ChatGPT BRAIN build or BVP session, require fresh inspection of:

```text
woodpk/gdrive-sync-obsidian-plugin/AGENTS.md
woodpk/gdrive-sync-obsidian-plugin/dev/planning/03-verification/bvp-operator-runbook.md
woodpk/gdrive-sync-obsidian-plugin/dev/research/bvp-operator-api-audit-2026-10-24.md
woodpk/gdrive-sync-obsidian-plugin/dev/state/current-state.yaml
```

Use the **current** remote branch/commit; a static earlier commit identifies the audited version, not current HEAD. Even if the generic external `session-inits` cannot be edited, the repo-level `AGENTS.md` requirement and canonical state pointer form a durable discoverability path. There is **no technical guarantee** that a fresh ChatGPT session will autonomously open any repository file without first being told to ground the repository; a BRAIN assignment or handoff must invoke/verify this step. If context lacks the manual or repo cannot be fetched, say `BVP_MANUAL_NOT_READ` and **do not improvise a launcher**.

**Change trigger:** when `test-platform/test/batteries/**`, `test-platform/src/scenario/**`, `test-platform/src/virtual-world/**`, `test-platform/src/live-device/**`, `package.json`, `tsconfig`, BVP decision authority or the live/physical safety boundary changes, verify every affected mapping and update this manual before recommending execution.

## DEC-352 R3-F04 local-only publication failure recovery — operator procedure

A `drive-mailbox` diagnostic with `phase:"diagnostic-publication"` represents **failure of the diagnostic transport itself**. It is written to the BVP validation-only journal, but deliberately excluded from automatic remote `flush()` and from remote recovery-event generation, preventing recursively failing publication attempts. An absent Windows inbox event never proves that this failure did not occur, and is NOT delivery confirmation or a PASS.

For an **already-authorized validation-device inspection**, the authoritative local record is the installed BVP validation plugin's `<vault-config>/plugins/brain-google-drive-sync/.bvp-relay/runtime-errors.json` (path rooted in that device's Obsidian vault configuration, not the product sync tree). Inspect it via the device's approved local validation-file access or a controlled export; do not infer access to another device, run custom production synchronization, expose raw paths/identities or use personal Drive. Read-only observation must retain `eventId`, allowlisted classification, `diagnostic.component`, `diagnostic.phase`, source `origin` including literal `runId:null`, `firstAt`/`lastAt`, `occurrences`, and `deliveredCount`. Specifically, `deliveredCount:0` on a publication failure means **not remotely delivered**, by design; it does not by itself mean no failure occurred. The reporter's local `BvpJournalError` fallback code (`bvp-journal-corrupt` or `bvp-journal-persistence-failed`) is an explicit blocked/unavailable condition if the journal itself cannot be read or saved, never a successful remote acknowledgment. Follow approved device-evidence privacy handling.

No physical iOS, live personal Drive/vault inspection, release or debug command is authorized by this paragraph. Any such operation requires separate Owner approval and the governing physical-readiness gates.

