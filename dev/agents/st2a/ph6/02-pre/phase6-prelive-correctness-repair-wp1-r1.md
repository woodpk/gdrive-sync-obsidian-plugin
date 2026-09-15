# PHASE 6 PRE-LIVE CORRECTNESS REPAIR — WP1-R1

## AGENT

`agt-ca-p6-prelive-correctness-wp1-r1-01`

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Continue the existing WP1 repair branch from exactly:

`INPUT_SHA = 8fe56cbd50231f85b48c2ecc7b42694387bc195f`

Do not restart from the original WP1 base and do not substitute a branch tip.

## DISPOSITION

C2 is accepted statically and must not be redesigned.

C1 and C3 require one bounded correction pass.

## C1-R1 — reconstruction bypass is too broad after recovery state becomes trusted

Current WP1 behavior returns every `assembly.reconstruction` directly from `authorityLearningAssembler()` before durable-intent recovery.

That is correct only for the initial reconstruction preview while the persisted canonical state is objectively `recovery-required`.

After reviewed reconstruction execution begins, `ensureTrustedState()` replaces the recovery-required state with current trusted authority while the external recovery gate may remain active until reconstruction fully completes. A later Verify/Reconcile during that recovery session still uses `assembleRecovery()`, but persisted authority is now trusted and may contain outstanding durable intents from partial/interrupted reconstruction work. Those intents must be recovered before new planning.

### Required behavior

- Initial genuine recovery entry:
  - persisted state is `recovery-required`;
  - reconstruction preview reaches the planner;
  - no durable-intent recovery is attempted before review;
  - preview performs no state replacement/write.
- Clean first sync:
  - `uninitialized && !reconstruction` continues to bypass durable recovery and remains non-mutating at preview.
- Recovery already in progress after state replacement:
  - if persisted state is now `trusted`, reconstruction planning must again run the existing durable-intent recovery path before the planner;
  - outstanding intents must not be bypassed merely because the assembly is marked `reconstruction`.
- Unexpected reconstruction over `uninitialized` or other non-trusted/non-recovery-required persisted state remains fail-closed.

Use a read-only persisted-state distinction; do not create authority or mutate state merely to decide which branch applies.

### Regression

Extend the focused controller regression to prove both phases:
1. first recovery-required reconstruction preview bypasses durable recovery and leaves state recovery-required;
2. after the recovery state is replaced with trusted authority while the recovery gate remains active, a subsequent reconstruction preview traverses durable-intent recovery before planning.

Do not weaken ordinary trusted-authority recovery or clean first-sync behavior.

## C3-R1 — parent-first ordering alone does not make nested folder moves complete

WP1 currently reorders nested `identity-preserving-move` operations so an ancestor destination move occurs first.

For a non-empty folder, moving the parent changes descendant logical paths transitively on the target side. The already-planned child-file move still carries exact preconditions against the old child path. After the parent move, that old-path evidence is stale, so the child operation can fail precondition validation and leave the run partial/attention-required even though physical reality is already structurally converged.

The current C3 regression checks plan order only; it does not execute the plan.

### Required behavior

A proven non-empty folder rename/move must complete authoritatively in one reviewed plan without:
- dispatching an unsafe duplicate descendant move;
- failing a descendant solely because the ancestor move already carried it to the destination;
- leaving canonical BASE/remote mappings at stale descendant paths;
- fabricating success without exact post-move evidence.

Choose the smallest correct implementation that preserves durable mutation/recovery semantics. Acceptable designs include either:
- coalescing transitively covered descendant moves into the verified ancestor folder move while atomically rebasing the affected trusted descendant state; or
- retaining descendant logical operations but recognizing exact already-converged descendants after the ancestor move and committing their state without redispatch, under exact identity/content authority.

Do not merely reorder operations again. Do not weaken preconditions globally.

Preserve:
- stable remote identity;
- deterministic plan IDs;
- conflict preservation;
- destructive safety;
- crash/restart durability;
- both LOCAL-target and REMOTE-target folder-move semantics.

### Regression

Add execution-level coverage, not just planner-order coverage.

At minimum prove with a folder containing a file descendant that:
1. a local folder rename propagated to REMOTE completes without child `stale-precondition`/`move-parent-absent` and leaves trusted descendant BASE/mapping paths at the new subtree;
2. a remote folder rename propagated to LOCAL likewise completes without a redundant failing child move;
3. no extra descendant physical move is dispatched when the ancestor folder move has already carried the descendant structurally, unless exact evidence proves a separate move is actually required.

Reuse existing authoritative execution fixtures where possible; do not build a parallel fake architecture.

## C2 PRESERVATION

Do not change the accepted C2 semantics unless directly required by a compile/test fallout. If touched, report why and prove:
- exact `verified-not-applied` with no progressed sibling retires the no-effect intent;
- a partially progressed multi-effect intent remains durable/fail-closed;
- genuine `outcome-unknown` remains unresolved.

## VERIFICATION

Run the directly affected tests first, then all of:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`

If the local execution container cannot materialize the private repository, do not stop with static-only verification. Open a temporary **draft PR** from the repair branch to `phase6-integration` solely to trigger the repository's existing verification workflow. Do not merge it. Do not add or modify workflow files. Record the exact run/job conclusion and close the draft PR after evidence is collected.

A green executable verification surface is required for WP1-R1 completion.

## CHANGE MANIFEST

Report every file created, modified, or deleted relative to `INPUT_SHA`.

## COMPLETION

Return:
- C1-R1 and C3-R1 completed or blocked individually;
- whether C2 remained unchanged;
- concise root cause/fix;
- actual executable verification evidence;
- exact workflow run/job IDs if CI was used;
- change manifest;
- resulting commit SHA;
- any remaining blocker.

## STOP

Stop after WP1-R1 is corrected and dynamically verified. Do not publish, install, resume live testing, begin WP2, optimize performance, or begin Stage 3.