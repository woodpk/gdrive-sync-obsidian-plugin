# VH19 — C06 Correction 01 — Register Through Actual H6B Runtime

Agent: `agt-ca-p6-vh19-c06-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh19-c06.md`  
Rejected prior branch: `phase6-vh19-c06-scenario`  
Rejected prior HEAD: `c69342b4ac4a9cdc000a75cd39e97aca5af36ca6`  
Required correction branch: `phase6-vh19-c06-scenario-correction-01`  
Correction evidence: `dev/evidence/_ca-output-agt-ca-p6-vh19-c06-scenario-01-correction-01.md`

## REJECTION

The prior C06 implementation is rejected because it existed as a standalone scenario/class path without executable registration through the actual H6B runtime composition. Passing isolated tests did not demonstrate that the production validation runner could discover and execute C06 using the fixed shared bindings.

The original C06 acceptance semantics remain unchanged.

## EXECUTABLE BASE GATE

Run `git fetch origin --prune` and require the exact canonical VH15 head:

`fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

Require VH15-R2 evidence at that SHA to begin `STATUS: COMPLETE`.

Create `phase6-vh19-c06-scenario-correction-01` from exactly that SHA. Do not base on, merge, or promote the rejected C06 branch.

## FROZEN BOUNDARIES

Do not modify repaired H6B shared code, frozen H0 contracts, `src/contracts/**`, C06 acceptance text, or production synchronization semantics.

Do not create a parallel scenario runner/registry, substitute production driver, substitute assertion engine, or caller-supplied authorization.

No live Drive/mobile validation.

## CORRECTION WORK ORDER

Implement/register only C06 through the established scenario extension/registration mechanism consumed by the actual repaired `ValidationModeRuntime`.

The registered executable scenario must use explicit authority cycle identifiers and the fixed H6B lifecycle:

production preview → runtime-retained exact plan → fixed plan assertion → retained assertion authorization → fixed production execution.

Preserve original C06 behavior: deterministic Windows fixture creation → Windows production sync → mobile production sync → expected mobile `download-create` → one remote object → identical bytes/hash → converged authority → no duplicate/conflict.

Focused tests must prove both:

1. C06 is discoverable/executable through the actual runtime registration/composition rather than only direct class/helper invocation; and
2. duplicate or unexpected-plan conditions fail closed before execution.

## ACCEPTANCE / VERIFICATION

Required:

- C06 maps one-to-one to `C06-windows-create-ios-download.md`.
- Actual H6B runtime registration discovers and executes it.
- No standalone alternate runner remains.
- No fixed production/assertion binding is overridden.
- Exact previewed plan is the one asserted/authorized/executed.
- Focused tests pass.
- `npm run check` passes.
- `git diff --check` passes.
- Diff limited to C06 scenario/registration/test/evidence surfaces necessary for this correction.

Commit implementation/tests first; evidence separately with exact `STATUS: COMPLETE` or `STATUS: BLOCKED` first line and exact base/implementation SHAs, changed files, verification results, deviations, blockers.

## FINAL STOP

Push and stop. Do not merge/promote/release, perform physical validation, begin VH23, or alter peer scenarios.
