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


## Builder ten-family adequacy

1. **Nominal/success** — new assembled integration test traverses the accepted `GoogleDriveAdapter.updateExisting()` same-ID mutation path, Drive Changes, `VerifiedMetadataInventoryReader`, and atomic IndexedDB inventory publication while retaining the same Drive ID and advancing revision/content evidence.
2. **Negative/boundary/malformed/unsupported** — new continuity-gap case refuses publication; existing focused reader/storage suites cover malformed/partial provider data, cursor discontinuity, duplicate/ambiguous identities, wrong scope, and incomplete coverage.
3. **Legal/forbidden transitions** — baseline and incremental publication require coherent predecessor generation/cursor; illegal or incomplete transitions do not publish.
4. **Repetition/idempotency/retry/recovery** — existing indexed-storage focused coverage includes duplicate generation, stale CAS, batch replay/immutability, recovery and cursor-writer races; same-ID mutation recovery remains inherited from accepted DEC-362.
5. **Concurrency/order/stale state** — existing focused storage coverage rejects stale predecessor/generation and forked/discontinuous Changes edges. DEC-363's narrowly Owner-accepted post-final-check provider race remains unchanged.
6. **Persistence/restart/data integrity** — new nominal test reopens IndexedDB after incremental publication and verifies stable ID/revision/hash/cursor; existing focused coverage exercises persisted-row corruption, backup/recovery and restart.
7. **Identity/authorization/security/trust** — the assembled proof uses the real Drive managed-root/account validation and exact-ID mutation path; existing reader cases retain fence/root/provenance fail-closed behavior.
8. **Contracts/integration/backward compatibility** — accepted DEC-362 source is an ancestor of this candidate; Step 3 changes no production interface and keeps the legacy planner/executor authoritative.
9. **Architecture/ownership/invariants** — no second planner/executor, OAuth client, validation framework or live storage path is introduced; the shadow stage composes existing dormant components only.
10. **End-to-end/fail-closed/destructive safety** — software-only end-to-end chain proves same-ID mutation → Changes → persisted inventory; incomplete Changes cannot advance inventory/cursor; no DELETE or live provider operation is permitted.

## Source-readiness notes

- Accepted DEC-362 source `640845815dc85672c2411b1b7d3ae48f17a86bc2` is an ancestor of the Step-3 branch.
- No production source modification is required for this stage; the integration objective is satisfied by exercising already-built dormant components together in isolated state.
- The PHX-CI focused selector is `npm run test:focused:dec339-step3`; full repository verification remains PHX-CI-owned.
- No live Drive, vault, device, production pairing, migration, planner cutover, installation or release action is part of this candidate.
