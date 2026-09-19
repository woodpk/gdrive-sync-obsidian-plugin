# VH20 — C07 Correction 01 — Resume After Shared H6B Repair

Agent: `agt-ca-p6-vh20-c07-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh20-c07.md`  
Prior blocked branch: `phase6-vh20-c07-scenario`  
Prior blocked HEAD: `98d7507baab230f4dfd4caeea3a6e67198b66bfe`  
Required correction branch: `phase6-vh20-c07-scenario-correction-01`  
Correction evidence: `dev/evidence/_ca-output-agt-ca-p6-vh20-c07-scenario-01-correction-01.md`

## PRIOR VERDICT / RESUME AUTHORITY

The prior VH20 output correctly stopped `BLOCKED` because the then-current H6B runtime could not carry the exact previewed production plan through assertion-derived authorization into fixed production execution. Do not repair or work around that deficiency locally.

VH15-R2 has now repaired the shared H6B seam. Resume the original C07 assignment against the repaired canonical base.

## EXECUTABLE BASE GATE

Run `git fetch origin --prune`. Require:

`origin/phase6-vh15-validation-mode-runtime-canary == fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

and require the VH15-R2 evidence at that SHA to begin exactly `STATUS: COMPLETE`.

Create `phase6-vh20-c07-scenario-correction-01` from exactly that SHA. Do not use the prior blocked C07 branch as the implementation base.

## FROZEN BOUNDARIES

The shared H6B repair is frozen for this task. Do not modify it.

Do not modify frozen H0 contracts, `src/contracts/**`, C07 scenario text, or production synchronization semantics. Do not introduce any scenario-local workaround, custom production driver/router, substitute plan assertion engine, or caller-created execution authorization.

No live validation.

## CORRECTION WORK ORDER

Execute the original C07 build now that the required shared runtime capability exists.

Use the actual repaired `ValidationModeRuntime` with explicit authority cycle identifiers and the fixed lifecycle:

production preview → exact plan retained → fixed assertion → assertion-derived retained authorization → fixed production execution.

Implement C07 only: trusted fixture → Windows edit → Windows production sync → mobile production sync → expected mobile `download-update` → verified replacement → exact content/hash equality with remote → no unrelated mutation.

Focused tests must exercise the real H6B composition and include successful execution plus stale/unexpected-plan hard-stop before production execution.

## ACCEPTANCE / VERIFICATION

Required:

- C07 one-to-one with `C07-windows-update-ios-download.md`.
- No workaround for H6B exists in C07 code.
- Exact plan identity and assertion-derived authorization are provided by the shared runtime.
- Focused tests pass.
- `npm run check` passes.
- `git diff --check` passes.
- Changes limited to C07 scenario/test/evidence surfaces.

Commit implementation/tests first, then correction evidence separately. Evidence begins exactly `STATUS: COMPLETE` or `STATUS: BLOCKED` and records exact base/implementation SHAs, files, command results, deviations, blockers.

## FINAL STOP

Push and stop. Do not merge/promote/release, run physical validation, begin VH23, or modify peer scenarios.
