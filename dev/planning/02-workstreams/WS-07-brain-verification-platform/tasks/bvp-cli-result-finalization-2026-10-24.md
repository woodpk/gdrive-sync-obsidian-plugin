# WS-07 — BVP CLI Result Finalization (Build Unit)

**Feature identity:** woodpk/gdrive-sync-obsidian-plugin / WS-07 / `BVP_CLI_RESULT_FINALIZATION`
**Builder working branch:** `build/bvp-cli-result-finalization-20261024`
**Base:** `f34139ba380f2f9d39871a4ab4f31ede0dad531f` (DEC-351 independent accepted, closeout complete).
**Owner authorization:** 2026-10-24 — begin the next Build Unit immediately; software-only, preserving all separate physical/security/release gates.
**Status:** Owner withheld the previous premature Reviewer handoff. Builder is completing full feature coverage. Prior R2 PHX-CI PASS applies only to the earlier source; latest expanded test matrix is UNVERIFIED.
**Normative basis:** DEC-351, its R5 accepted public CLI contract, final review `dev/reviews/dec351-direct-scenario-cli-20261024-r5-independent-final.md` (M-03), AGENTS.md, governing Protocol/Manual and current WS-07 frozen architecture/PHX-CI rules.

## Required behavior and defect

M-03: The compiled Node CLI presently prints a successful `completed` stdout summary before the reserved output FileHandle is closed. A close failure can therefore produce apparent terminal success before the process eventually exits nonzero, even when the operator correctly rejects the run. This unit improves fail-closed operator observability without changing the existing scenario runner, result JSON schema or exit mapping.

On **all executed canonical outcomes** (completed, failed, blocked, unsupported), stdout summary is emitted **only after successful output close**; a close failure must set exit code nonzero and must not emit a successful-looking summary. Full canonical JSON and result identity remain unchanged. Neither result-file existence nor stdout alone establishes success. If output write, dispatch, reservation or close fails, preserve safe diagnostics and fail closed; original unknown/selection-rejection semantics remain unchanged.

**No scope for M-02:** changing the accepted post-selection `requestStatus` enum is a separate public contract decision. M-04 physical/live scope also remains untouched.

## Exact writable surfaces

1. `test-platform/test/bvp-scenario-id-cli.test.ts` — append real compiled child-process control and post-write close-fault regressions.
2. `test-platform/test/fixtures/bvp-cli-close-fault-preload.ts` — hardcoded test-only `node --require` instrumentation of Node FileHandle.close; not part of public CLI or scenario catalog. No runtime environment flag or arbitrary path in the shipping CLI.
3. `test-platform/test/batteries/run-deterministic-scenario.ts` — defer console success summary until result close has succeeded; retain all existing error/evidence/exit semantics.
4. This task, `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md`, `dev/state/current-state.yaml`, and `dev/planning/03-verification/bvp-operator-runbook.md` — planning/state/runbook only.
5. `dev/test-results/<actual-phxci-run-id>/`, `dev/_ca-output.md` — original PHX-CI evidence publication only.

Every other path, particularly `src/**`, `test-platform/src/**`, scenario catalog, frozen governance, `phx-ci.json` and owner-locked `AGENTS.md`, is excluded. No GitHub Actions or alternate harness.

## Ten-family test mapping

| Family | Contract and evidence approach |
| --- | --- |
| 1 Nominal | Existing compiled exact-ID scenario completes with exit 0 and matching canonical JSON; new success control maintains completed stdout. |
| 2 Negative/boundary | Inject actual FileHandle.close failure after completed JSON write; require nonzero exit and no misleading stdout. |
| 3 Legal/forbidden transitions | Terminal summary only after successful close; no transition to apparent completed success on close failure. |
| 4 Retry/cancellation/recovery | Existing distinct-file isolation and repeatability regression; preserve fail-closed stranded result and collision handling. |
| 5 Concurrency/order | Existing concurrent distinct-file and atomic same-path collision tests; new ordering fault before summary is emitted. |
| 6 Persistence/integrity | Inspect complete canonical result on normal close; close-failure cannot be deemed successful even if JSON exists. |
| 7 Identity/security/trust | Existing exact scenario identity, privacy filtering, live-only rejection, no direct Drive/vault; no new trusted output. |
| 8 Contracts/integration | Compile actual public Node CLI; preserve argc flags, machine schema, scenarios and canonical status/exit semantics. |
| 9 Architecture/ownership | No changes outside allowed files; PHX-CI guard/metrics, TS packaging and shipping exclusion required. |
| 10 End-to-end/fail closed | Actual compiled CLI with injected close error must not print apparent PASS, exit zero, or dispatch physical effects. |

Existing DEC-351 tests remain governing regression oracles. The new test must demonstrate an actual nonzero child process and absent success stdout; no relaxed assertion or test bypass is acceptable.

## Qualification and independent acceptance

Builder first writes/commits tests and test-only fixture, then corrects CLI, self-reviews, and uses **only installed pinned PHX-CI** via existing repository-controlled operator scripts on Windows 11/PowerShell 7.6.6 for full substantive 11-stage verification. Capture actual source SHA, Git tree, runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, test discovery/counts, raw terminal, run ID, exit, immutable evidence and actual published paths. No standalone Node, tsc, npm or bespoke validation execution.

Only after genuine PHX-CI PASS and canonical publication can Builder increment this **new** feature's handoff-count 0→1, publish recipient REVIEWER, and issue the exact blind-safe Builder→Reviewer prompt. No software acceptance, physical run, master merge, release, or new subsequent unit implied before that.

## Source/test construction record (not verification)

- Test-first authored commit: `6cb3fa5edcd13841c80fafba16e74fa9305f87fd` — compiled CLI end-to-end regression uses a local hardcoded Node `--require` fixture to intercept `fs.promises.open("wx")` and throw *after* real FileHandle.close. Requires child exit 1, empty stdout despite `completed` canonical JSON already written, redacted `result-close` diagnostic; verifies normal close still emits correctly matching completed summary and exit 0. Original DEC-351 tests unchanged except appended new test.
- Implemented source commit: `7848906496db4c58ada79c9aa3ec953cf5643712` — holds pending status summary in memory until `await output.close()` succeeds; after close fault discards pending stdout, emits privacy-safe `scenario-result-persistence-failed` diagnostic in `result-close` phase and exits nonzero. Original request parsing, canonical runner/status machine evidence, reservations, public argv and schema unchanged.
- Review for semantic risk: early `return` paths still close in `finally` and cannot emit a deferred success; noncompleted canonical statuses continue to print only after successful close with nonzero status; result-close failure with syntactically valid file must be rejected by actual exit and corroborating evidence. No no-success-to-success oracle relaxation.
- **No executable validation performed.** Local Windows pinned PHX-CI is mandatory next. Invoke installed `69c4aa077d4a1a46d1e85e59f39d36285be99e83` using its verified `scripts/Invoke-PhxCi.ps1`, `-FocusedTestCommand 'npm run test:bvp-root'`, **`-BaseRef f34139ba380f2f9d39871a4ab4f31ede0dad531f`** to isolate the new Build Unit from previous DEC-349 frozen-budget changes. Never use `authorized-governance` as a blanket exception; the new change is ordinary, no lock/pin/guard change.

## Full-feature initial build continuation — owner instruction 2026-10-24

Owner required that the **entire feature** be fully implemented before final Reviewer access. The earlier published Builder-to-Reviewer handoff was withheld before a Reviewer assessment. Builder restored in dev/state/current-state.yaml; previously published handoff-count 1 remains historical, not rewound.

The earlier substantive PHX-CI R2 run f8a19dc9-976a-437d-91c9-372d61c64da6 PASSED all 11 stages, 548 focused tests, 1292 product tests and repository guards on exact source c82041d3022fa23e3db2b7e3a50032453f7e6e14, published at b10bdd06882f16ffec0120ea44226e95e60ef32d. This does not qualify tests subsequently changed.

Builder added required negative outcome coverage at 404b4a3f83ad7c18b25e18c5c7c5759974ec40ad. Beyond the completed-status close-fault regression, it exercises failed, blocked and unsupported canonical scenarios with *both normal close and injected failed close*, plus unknown and live-only selection rejections under close fault. It preserves request/result identity, correct exit status, privacy-safe diagnostics, canonical evidence semantics and no misleading pre-close stdout. The public CLI implementation was unchanged in this continuation; tests are not accepted before a new exact-source PHX-CI PASS. M-02 (post-dispatch exception envelope semantics) and M-04 (physical/iOS readiness) remain distinct from this close-finalization contract.

Mandatory next action: Builder runs installed pinned PHX-CI with BRAIN_ARTIFACT_PURPOSE=development and BVP_CHANGE_CLASS=ordinary, focused npm run test:bvp-root, base f34139ba380f2f9d39871a4ab4f31ede0dad531f, exact new remote HEAD. Preserve prior original evidence. Do not request Reviewer until complete feature qualification and Owner's stated full-feature threshold are satisfied.
