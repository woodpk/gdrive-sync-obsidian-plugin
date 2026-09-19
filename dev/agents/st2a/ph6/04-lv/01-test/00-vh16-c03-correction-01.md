# VH16 — C03 Correction 01 — Real H6B Runtime Integration

Agent: `agt-ca-p6-vh16-c03-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh16-c03.md`  
Rejected prior branch: `phase6-vh16-c03-scenario`  
Rejected prior HEAD: `90e6e0ad6121e32e426828126840ebaeb2a24cb7`  
Required correction branch: `phase6-vh16-c03-scenario-correction-01`  
Correction evidence: `dev/evidence/_ca-output-agt-ca-p6-vh16-c03-scenario-01-correction-01.md`

## REJECTION

The prior C03 implementation is rejected because it introduced a scenario-owned/custom production driver/router and thereby bypassed the fixed H6B validation runtime composition. It did not prove C03 through the actual repaired production-preview → exact-plan assertion → retained authorization → fixed production-execution path.

The original C03 acceptance requirements remain in force. This correction changes only the implementation route required to satisfy them.

## EXECUTABLE BASE GATE

Run `git fetch origin --prune`.

The exact correction base is:

`fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

Hard-stop unless:

1. `origin/phase6-vh15-validation-mode-runtime-canary` resolves exactly to that SHA; and
2. `dev/evidence/_ca-output-agt-ca-p6-vh15-r2-run-scoped-plan-handoff-01.md` at that SHA begins exactly `STATUS: COMPLETE`.

Create `phase6-vh16-c03-scenario-correction-01` from exactly that SHA. Do not branch from, merge, or rebase the rejected C03 branch.

## FROZEN BOUNDARIES

Do not modify the repaired H6B handoff mechanism, frozen H0 contracts, `src/contracts/**`, scenario acceptance text, or production synchronization semantics.

Do not create or inject a replacement `production-path-driver`, replacement `plan-assertion-engine`, scenario-local production router, or caller-supplied execution authorization.

Do not run physical Drive/mobile validation.

## CORRECTION WORK ORDER

Implement only C03 and its focused tests through the actual repaired `ValidationModeRuntime` composition.

The scenario must use the fixed H6B lifecycle for each mutation cycle:

1. production preview under an explicit C03 `authorityCycleId`;
2. runtime retention of the exact observed `SynchronizationPlan`;
3. fixed plan-assertion step against the C03 expected plan;
4. runtime-retained assertion-derived authorization;
5. `execute-asserted-plan` through the fixed production-path driver.

Remove the rejected custom driver/router pattern rather than adapting it.

Preserve the original C03 semantics: mobile edit → mobile production sync → Windows production sync → Windows plan requiring the expected `download-update`; then verify bytes/hash, remote identity, verified replacement/state commit ordering, and no unrelated change.

Focused tests must exercise the real H6B runtime composition, prove the success path, and prove representative unexpected-plan/mismatch behavior hard-stops before production execution.

## ACCEPTANCE / VERIFICATION

Required before `STATUS: COMPLETE`:

- C03 remains one-to-one with `C03-ios-update-windows-download.md`.
- No scenario-owned production driver/router or substitute assertion engine exists.
- The exact previewed plan is the plan asserted and authorized by the repaired runtime.
- Execution cannot proceed without the fixed assertion-derived authorization.
- Focused C03 tests pass.
- `npm run check` passes.
- `git diff --check` passes.
- Diff is limited to C03 scenario/test/evidence surfaces required by this correction.

Commit implementation/tests first. Commit correction evidence separately, beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, with exact base SHA, implementation SHA, changed files, commands/results, deviations, and blockers.

## FINAL STOP

Stop after pushing the correction branch and evidence. Do not merge, promote, release, run physical validation, begin VH23, or modify any peer C-series scenario.
