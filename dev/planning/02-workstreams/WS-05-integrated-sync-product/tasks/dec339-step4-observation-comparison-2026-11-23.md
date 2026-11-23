# DEC-339 Step 4 — Observation-Only Comparison

**Authorized:** Owner, 2026-11-23.  
**Branch:** `build/dec339-step4-observation-comparison-20261123`  
**Starting source:** `d8fdf66db0aeb7c44fafb42ccd5cbee706682425`  
**Status:** BUILDER ACTIVE — isolated software comparison only.

## Objective

Compare the dormant inventory-backed observation/planning path against the existing authoritative LOCAL/REMOTE/BASE observation and planning path without enabling inventory-based dispatch. Step 4 is an evidence gate, not planner cutover.

## Required comparison contract

For complete, unambiguous fixtures:

1. inventory-backed and existing assemblers must produce exactly equivalent LOCAL/REMOTE/BASE snapshots and planning-relevant metadata;
2. the existing deterministic planner, when fed each observation set, must produce semantically equivalent plans;
3. baseline followed by continuous Changes publication must retain comparison equivalence across an ordinary same-ID content update;
4. no inventory-backed result may authorize execution or dispatch.

For ambiguous, partial, stale, wrong-fence, provenance-unproven, invalidated-local or otherwise uncertain fixtures:

- inventory-backed observation may fall back to the existing complete physical path or fail/block more conservatively;
- it must never yield a more permissive plan, stronger absence claim, deletion authority or mutation authority than the existing path;
- missing proof or disparity requires fallback/block, never optimistic planning.

## Step-3 accepted findings carried forward

- **M-01:** software-only provider/IndexedDB fixtures remain software proof only; do not claim live Google/browser/device behavior.
- **M-02:** this gate must exercise production account-key derivation and the exact Step-2 `createObsidianGoogleDriveBoundary` metadata reader path through provider baseline/Changes into isolated inventory storage.
- **M-03:** local-hint refresh/invalidation remains in integrated verification scope; comparison must preserve fresh local enumeration and prove invalidated/partial local hints cannot become authority.

## Implementation shape

Prefer **test-only composition** of existing production classes. Do not introduce a second planner, comparator runtime, OAuth client, dispatch path or shipping feature flag merely to collect parity evidence. Production code changes are permitted only if a demonstrated defect prevents the already-approved observation-only contract.

## Explicit non-goals

- No ProductRuntime planner cutover.
- No inventory-backed dispatch or executor mutation authority.
- No live pairing/database migration.
- No live Drive/vault/device operations.
- No physical testing, installation, promotion, release or master/PR #157 merge.
- No targeted executor-read optimization.
- No GitHub Actions or alternate validation framework.

## Mandatory verification scope

Executable coverage must establish:

- exact snapshot equivalence on complete/unambiguous baseline observations;
- exact plan semantic equivalence on those observations;
- equivalence after baseline + Changes same-ID revision progression;
- production account-binding → Step-2 boundary → reader → storage → comparison composition;
- local fresh-enumeration/advisory invalidation behavior remains non-authoritative;
- stale/partial/ambiguous/provenance-failed cases fall back or block and are never more permissive;
- no inventory result reaches dispatch/executor authority;
- persistence/restart and cursor/generation integrity remain preserved through existing focused storage coverage.

All executable software validation runs only through pinned PHX-CI.

## Acceptance boundary

Exact-source PHX-CI PASS followed by blind-first independent Reviewer acceptance. Step 5 may not begin until Step 4 is accepted. Step 4 acceptance does not authorize planner cutover, activation, migration, merge, installation, physical testing, promotion or release.
