# DEC-339 Step 3 — Storage-Only Shadow Stage

**Authorized:** Owner, 2026-11-23.  
**Branch:** `build/dec339-step3-storage-shadow-20261123`  
**Starting source:** `6da5fce9554a798a7b98884b6e3300c4b263bcab`  
**Status:** BUILDER ACTIVE — software-only, isolated test state.

## Objective

Exercise the existing DEC-339 inventory storage and local-observation components together in an isolated shadow path while the legacy planner/executor remains the sole behavioral authority. This step also owns the intentionally deferred `DEC362-14` continuity proof; it is not a separate Build Unit.

## Required acceptance proof — DEC362-14

Prove on the assembled software path that an established managed Drive object `A` remains the same stable ID across:

`same-ID content update of A → Drive Changes observation of A → verified inventory publication of A`

The resulting persisted inventory must retain `A`, advance the applicable revision/content evidence, and must not synthesize an old-ID removal/new-ID creation transition.

Fail closed when Changes continuity, identity fence, provenance, cursor, provider completeness, or persistence publication is not trustworthy. A failed/partial observation may not advance the trusted inventory/canonical cursor.

## Step-3 scope

1. Reuse existing `VerifiedMetadataInventoryReader`, `IndexedDbInventoryObservationStore`, inventory publication coordination, and `VerifiedLocalInventoryCoordinator`.
2. Exercise full baseline publication followed by one or more Changes-driven incremental publications in isolated test state.
3. Exercise fresh local enumeration, advisory local snapshot refresh, and invalidation on relevant local/lifecycle scope changes.
4. Preserve canonical authority coupling: generation/cursor publication must remain atomic/fail-closed under the existing storage contracts.
5. Keep the legacy `ProductSnapshotAssembler` / planner / executor as sole behavioral authority. No inventory-backed dispatch or mutation authority is introduced.
6. Do not write shadow inventory/cursors into any live production pairing.

## Explicit non-goals

- No planner cutover or `ProductRuntime` activation.
- No live IndexedDB migration on the Owner's production profile.
- No live Google Drive, vault, device, installation, release, promotion, or physical testing.
- No second OAuth client or scope change.
- No targeted executor-read optimization.
- No new validation framework or GitHub Actions.

## Verification requirements

The Builder must add requirements-derived executable coverage for:

- nominal baseline → same-ID Changes → persisted inventory continuity;
- same-ID revision/content advancement without identity succession;
- missing/invalid cursor, incomplete/ambiguous provider evidence, wrong fence/account/root, and persistence failure refusing publication;
- repeated/incremental replay and stale predecessor/generation rejection;
- local advisory refresh and invalidation remaining non-authoritative;
- legacy planner/executor behavior remaining unchanged and solely authoritative;
- storage/restart integrity using existing IndexedDB integration mechanisms where materially applicable.

All executable validation runs only through the pinned PHX-CI runtime. Test-oracle weakening is prohibited.

## Acceptance boundary

Exact-source PHX-CI PASS followed by blind-first independent Reviewer acceptance. Step 4 may not begin until this Step-3 acceptance is complete. This step does not authorize planner cutover, master/PR #157 merge, activation, migration, installation, release, or live/physical operations.
