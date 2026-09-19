# VH22 — C09 Correction 01 — Remove Scenario-Owned Production Driver

Agent: `agt-ca-p6-vh22-c09-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh22-c09.md`  
Rejected prior branch: `phase6-vh22-c09-scenario`  
Rejected prior HEAD: `49f31d6e3c6661b8a1a05922ed5f8b4514b835fc`  
Required correction branch: `phase6-vh22-c09-scenario-correction-01`  
Correction evidence: `dev/evidence/_ca-output-agt-ca-p6-vh22-c09-scenario-01-correction-01.md`

## REJECTION

The prior C09 implementation is rejected because it supplied its own production driver despite the fixed H6B production-driver binding, bypassing the runtime ownership boundary. Required proof/evidence for execution through the actual shared path was therefore not established.

The original C09 acceptance requirements remain authoritative.

## EXECUTABLE BASE GATE

Run `git fetch origin --prune` and require:

`origin/phase6-vh15-validation-mode-runtime-canary == fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

Require VH15-R2 evidence at that SHA to begin exactly `STATUS: COMPLETE`.

Create `phase6-vh22-c09-scenario-correction-01` from exactly that SHA. Do not branch from or merge the rejected C09 implementation.

## FROZEN BOUNDARIES

Do not modify repaired H6B runtime/handoff code, frozen H0 contracts, `src/contracts/**`, C09 acceptance text, or production synchronization semantics.

The scenario must not provide, override, wrap as a substitute, or otherwise replace the fixed `production-path-driver` or `plan-assertion-engine`. No caller-created execution authorization.

No live Drive/mobile validation.

## CORRECTION WORK ORDER

Reimplement only C09 through the actual repaired `ValidationModeRuntime` extension/registration surface.

Use explicit authority cycles and the fixed H6B lifecycle:

production preview → exact retained plan → fixed plan assertion → retained assertion-derived authorization → fixed production execution.

Preserve original C09 semantics: trusted fixture → Windows delete → Windows then mobile production synchronization → exact remote object trashed → mobile recoverable deletion → tombstone/deletion authority convergence → live-path absence → no unrelated mutation.

Focused tests must use the actual H6B composition and prove:

- successful exact-object destructive flow;
- wrong-object destructive plan rejection;
- unexpected destructive plan hard-stop before execution.

## ACCEPTANCE / VERIFICATION

Required:

- C09 one-to-one with `C09-windows-delete-ios-trash.md`.
- No scenario-owned production driver or substitute assertion engine remains.
- Exact previewed plan is asserted/authorized/executed by the shared runtime.
- Focused tests pass.
- `npm run check` passes.
- `git diff --check` passes.
- Diff limited to C09 scenario/test/evidence surfaces required by this correction.

Commit implementation/tests first. Commit correction evidence separately, beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, and record exact base/implementation SHAs, changed files, commands/results, deviations, and blockers.

## FINAL STOP

Push and stop. Do not merge/promote/release, run physical validation, begin VH23, or modify any peer scenario.
