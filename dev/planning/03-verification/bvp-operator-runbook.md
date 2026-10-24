# BVP Operator Runbook — Mandatory Fresh-Session Read

**Audience:** every BRAIN Builder/agent producing an owner-facing BVP command, interpreting BVP results, resuming BVP work, or handing this project to a new chat session.  
**Last source audit:** 2026-10-24 at BRAIN commit `d78385e485ec966505c8d5122e99a3121840c16a`; full source analysis `dev/research/bvp-operator-api-audit-2026-10-24.md`.  
**Authority:** later Owner instruction (2026-10-24) favors driving existing Node/TypeScript BVP directly from PowerShell; the earlier comprehensive PowerShell-interface build is **not** necessary merely to run available BVP batteries. Governing protocol and PHX-CI qualification requirements still apply to **software changes**.  
**Verification level:** source-audited instructions, **NOT YET locally Windows-executed or PHX-CI-qualified for this manual**. No physical-device authority granted.

## DEC-351 public scenario-ID CLI — SOURCE COMMITTED, NOT PHX-CI QUALIFIED

DEC-351's small TypeScript/Node CLI **now exists in source** under `test-platform/test/batteries/run-deterministic-scenario.ts`, with a compile-time catalog of 70 deterministic scenario definitions at `test-platform/test/batteries/deterministic-scenario-registry.ts`. Its intended compiled location is `.test-build/bvp/test-platform/test/batteries/run-deterministic-scenario.js`. The implementation delegates exactly one selected definition to existing public `DeterministicScenarioRunner.canonical().run(scenario)`; the core runner is unchanged. Source supports **`--scenario <exact-id> --result-file <absolute-new-json-path>`** or standalone read-only **`--list-scenarios`**. Preflight rejects unknown/live-only IDs and malformed/duplicate flags. It writes a privacy-safe canonical machine-evidence projection; it will not overwrite an earlier result. The regression test `test-platform/test/bvp-scenario-id-cli.test.ts` was authored before implementation and registered in `platform-core`/`all-platform-tests`. **Neither its compilation nor test execution has been PHX-CI verified, and no independent Reviewer has accepted it.** These arguments and paths are a *source-level prospective contract*, NOT an already-verified owner launch command. Existing accepted battery execution remains the conservative operational path until genuine Windows PHX-CI PASS and independent review. New runbook/branch readers must refresh current HEAD. The separate question of a third-party iPhone simulator remains unresolved.

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

**Not yet a public CLI:** generic list/help, run arbitrary one of 84 TS scenario definitions by ID, enumerate typed device commands, interactive result query, persisted PowerShell config, or simulate *each* live S09 battery on virtual devices. Those exist only as TS contracts or proposed functionality. If requested, inspect the precise TS entrypoint and introduce **only** the smallest needed, source-audited TypeScript CLI accessibility change through the normal governed Builder/PHX-CI/Reviewer process; do not claim a fictitious flag, hardcode a second runner, or invent a PowerShell API clone.

**Windows-hosted simulation:** `DeterministicScenarioRunner.canonical().run(scenario)` creates an in-memory multi-device virtual world. Its device names are **logical labels**, not native iPhone/iPadOS emulation. Scenario mode must include `deterministic`; live-only definitions cannot automatically use this executor. Some scenario steps are unsupported in deterministic mode (for example physical connectivity toggles and large-pattern fixture operation). Report those honestly. The internal PHX-only `s09-br02-simulated-checkpoint` fixture is not a public simulator option.

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
| User asks to run single declarative scenario ID | No current public generic scenario CLI; require controlled minimal TS dispatcher if genuinely necessary. |

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
