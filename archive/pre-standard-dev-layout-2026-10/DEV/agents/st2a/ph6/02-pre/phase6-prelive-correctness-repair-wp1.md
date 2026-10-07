# PHASE 6 PRE-LIVE CORRECTNESS REPAIR — WP1

## AGENT

`agt-ca-p6-prelive-correctness-wp1-01`

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Create a repair branch from exactly:

`INPUT_SHA = ee7d92359228967eb3a0e68310f644ec3f647ce4`

Do not substitute a branch tip.

## ASSIGNMENT

Fix the three confirmed synchronization-correctness defects below. Keep the repair minimal; do not redesign contracts, legacy migration, release/install, or live-test orchestration.

### C1 — genuine recovery entry is unreachable

`ProductController` wraps ordinary/recovery assembly with durable-intent recovery. A persisted `recovery-required` state can therefore be rejected by durable recovery before `ProductControllerBase.createPlan()` can enter its reconstruction flow.

Required behavior:
- clean `uninitialized && !reconstruction` still reaches first-sync planning without preview-time state writes;
- trusted existing authority still performs durable-intent recovery before planning;
- genuinely recovery-required persisted state must be allowed to reach the existing explicit reconstruction flow and reviewed reconstruction plan;
- reconstruction must remain fail-closed and must not silently convert untrusted state into trusted state before reviewed execution.

Primary files likely include `src/product/product-controller.ts` and focused controller/recovery tests. Change other production files only if mechanically necessary.

### C2 — verified-not-applied durable effects can wedge recovery

A physical mutation outcome that is authoritatively `verified-not-applied` is currently persisted through `recordPhysicalResult()` as `outcome-unknown`. That leaves durable authority implying unresolved physical uncertainty even though absence/non-application was proven, causing restart recovery to keep treating the effect as ambiguous.

Required behavior:
- distinguish verified non-application from genuine outcome uncertainty in durable lifecycle handling;
- never mark a proven non-effect as an applied effect;
- allow the operation to be safely retired/replanned under renewed authority when no effect occurred;
- preserve the existing fail-closed rules for `outcome-unknown`, conflict-preserved, dispatch-authorized ambiguity, and partially applied multi-effect operations;
- do not weaken crash safety or permit blind retries.

Trace `operation-isolation.ts`, authoritative executor/recovery code, and directly related frozen semantics before editing. Add regression coverage for restart behavior after a verified non-effect.

### C3 — structural file/folder transitions and folder-move ordering

The planner compares folder evidence as always equal. This can hide file↔folder type changes relative to BASE. Separately, moving a non-empty folder can produce descendant remote moves before the destination parent exists, leading to `move-parent-absent`.

Required behavior:
- entity-kind changes are never classified as unchanged merely because folder content evidence is empty;
- file↔folder replacement must resolve conservatively without unsafe overwrite/deletion inference;
- folder move/rename plans must enforce parent-before-descendant ordering or otherwise avoid dispatching a child move before its destination parent is authoritative;
- preserve stable remote identity, safe-union behavior, conflict preservation, destructive safeguards, and deterministic plan IDs.

Primary surface: `src/core/planner.ts` plus execution ordering/dependency logic only if necessary. Add regressions for both type transitions and a non-empty folder rename/move.

## VERIFICATION

Run the smallest directly affected tests first, then:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`

Do not add temporary workflows merely to execute a single test.

## CHANGE MANIFEST

Report every production/test file created, modified, or deleted.

## COMPLETION

Return:
- C1/C2/C3 completed or blocked individually;
- concise root cause and fix for each;
- actual verification results;
- change manifest;
- resulting commit SHA;
- any remaining blocker.

## STOP

Stop after these three defects and directly necessary regression fallout are corrected and verified. Do not publish, install, live-test, optimize performance, or begin Stage 3.