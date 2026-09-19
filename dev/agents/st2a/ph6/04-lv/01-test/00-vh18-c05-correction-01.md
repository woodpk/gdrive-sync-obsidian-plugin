# VH18 — C05 Correction 01 — Remove Direct Helper Bypass

Agent: `agt-ca-p6-vh18-c05-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh18-c05.md`  
Rejected prior branch: `phase6-vh18-c05-scenario`  
Rejected prior HEAD: `dce455831e430ef1a24377372863ef2d1ad54f6a`  
Required correction branch: `phase6-vh18-c05-scenario-correction-01`  
Correction evidence: `dev/evidence/_ca-output-agt-ca-p6-vh18-c05-scenario-01-correction-01.md`

## REJECTION

The prior C05 implementation is rejected because its direct scenario helper bypassed the actual fixed H6B runtime composition for preview/assert/authorization/execution. The test surface therefore did not prove the scenario through the production-owned validation path.

The original C05 functional requirements remain authoritative.

## EXECUTABLE BASE GATE

Fetch/prune origin and require `origin/phase6-vh15-validation-mode-runtime-canary` to equal exactly:

`fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

Require VH15-R2 evidence at that SHA to begin `STATUS: COMPLETE`.

Create `phase6-vh18-c05-scenario-correction-01` directly from that SHA. Do not base on or merge the rejected C05 branch.

## FROZEN BOUNDARIES

No changes to H6B shared handoff/runtime, frozen H0 contracts, `src/contracts/**`, scenario text, or production sync semantics.

No direct helper may perform the production preview/assert/execute chain outside `ValidationModeRuntime`. No substitute production driver/assertion engine. No caller-generated execution authorization.

No physical Drive/mobile validation.

## CORRECTION WORK ORDER

Reimplement only C05 against the repaired H6B extension surface.

Each production mutation cycle must use an explicit `authorityCycleId` and the fixed lifecycle:

production preview → exact plan retained by runtime → fixed plan assertion → assertion-derived retained authorization → fixed production execution.

Preserve original C05 behavior: trusted harness-owned fixture → mobile delete → production sync → attested exact remote trash → recoverable Windows deletion/trash → coherent tombstone/deletion authority → no live remote object → no unrelated mutation.

Focused tests must use the actual H6B runtime composition and prove:

- successful expected destructive plan and convergence;
- unsafe/unexpected destructive plan hard-stops before physical execution;
- exact-object/tombstone assertions are retained.

## ACCEPTANCE / VERIFICATION

Required:

- C05 one-to-one with `C05-ios-delete-windows-trash.md`.
- No direct helper bypass remains.
- No fixed runtime binding is overridden.
- Previewed plan identity is the asserted/authorized/executed plan.
- Focused tests pass.
- `npm run check` passes.
- `git diff --check` passes.
- Diff stays within C05 scenario/test/evidence ownership.

Commit implementation/tests first; correction evidence separately with first line exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, exact SHAs, changed files, command results, deviations, blockers.

## FINAL STOP

Push and stop. No merge/promotion/release, no live validation, no VH23, no peer-scenario work.
