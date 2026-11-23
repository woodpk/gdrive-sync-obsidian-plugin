# DEC-339 Step 4 — Observation-Only Comparison

**Authorized:** Owner, 2026-11-23.  
**Branch:** `build/dec339-step4-observation-comparison-20261123`  
**Starting source:** `d8fdf66db0aeb7c44fafb42ccd5cbee706682425`  
**Status:** ACCEPTED / CLOSED — independent Reviewer PASS WITH MINOR FINDINGS on 2026-11-23.

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


## Builder ten-family adequacy

1. **Nominal/success** — exact production Step-2 boundary → account-key derivation → verified reader → isolated IndexedDB publication → inventory-backed assembly is compared against existing full assembly, and both feed the existing deterministic planner.
2. **Negative/boundary/malformed/unsupported** — wrong-fence comparison forces ordinary physical fallback; existing focused projection/assembler suites cover malformed, incomplete, duplicate-path, provenance and coverage failures.
3. **Legal/forbidden transitions** — baseline and Changes-driven incremental publication are exercised; no comparison result receives dispatch authority.
4. **Repetition/idempotency/retry/recovery** — Step-3 continuity and focused storage suites remain selected, preserving replay/recovery and batch-continuity coverage.
5. **Concurrency/order/stale state** — existing selected projection/storage tests cover changed authority, stale cursor/generation and invalidation races; Step 4 adds no mutable production owner.
6. **Persistence/restart/data integrity** — accepted Step-3 restart proof remains selected; Step-4 uses actual isolated IndexedDB publication rather than fabricated inventory rows.
7. **Identity/authorization/security/trust** — production paired-account opaque derivation and exact `createObsidianGoogleDriveBoundary` metadata reader are inside the parity chain.
8. **Contracts/integration/backward compatibility** — existing authoritative assembler/planner outputs are the oracle; complete/unambiguous inventory observations must be exactly equivalent.
9. **Architecture/ownership/invariants** — no production source changes, second planner, second OAuth client, runtime flag, controller or executor path is introduced.
10. **End-to-end/fail-closed/destructive safety** — same-ID baseline→Changes publication is followed by observation/plan parity; partial LOCAL and wrong-fence cases cannot become more permissive or authorize deletion.

## Source-readiness notes

- Accepted Step-3 closeout `d8fdf66db0aeb7c44fafb42ccd5cbee706682425` is the direct Step-4 base.
- Step-4 implementation is test-only by design; shipping runtime remains unchanged and legacy planning/execution stays authoritative.
- Focused PHX-CI selection includes the Step-4 parity gate, existing inventory assembler/projection tests, local invalidation coverage and accepted Step-3 continuity proof.
- No live provider/database/device operation is used or authorized.


## Accepted closeout

- **Accepted source SHA:** `41653ada82c90d898c730e181290ca155ff1574f`
- **Accepted Git tree:** `315d87203ea83681f4ea75edd52d8f911c009eeb`
- **PHX-CI run:** `9d34351e-227f-4082-8ab6-46b7eae3b36e`
- **Evidence commit:** `f512e523b11f769769f9a6afd113ff541f7b3984`
- **Formal acceptance record:** `dev/reviews/dec339-step4-observation-comparison-20261123-review-brain-10-g01-resolution-acceptance.md`
- **Formal acceptance commit:** `243b3edcd41058c65e00bd1d6baf3bfdb85b046d`
- **Handoff-count at closeout:** `2` — no increment for the G-01 administrative confirmation.
- **G-01:** resolved; incorrect state-only tree transcription corrected to the actual qualified tree with no software/test change and no PHX-CI rerun.

Carry forward to later integration gates: software-only Drive/IndexedDB fixtures are not live provider/browser/device proof; conservative legacy fallback is not always a forced complete physical listing; local scope/lifecycle invalidation coverage remains distributed across existing suites; broader malformed-provider combinations remain primarily covered by focused projection/reader suites.

**Step 5 remains separately Owner-gated and is not authorized by this closeout.**
