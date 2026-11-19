# WS-02 / DEC-339 / BU-01 — Frozen independent blind production-source assessment

**Reviewer:** review-brain-10. **Date:** 2026-11-19. **Phase:** PASS 1 (blind source review, before authored test and PHX-CI examination).

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** IndexedDB Connection Upgrade and Cursor Interoperability (strictly bounded BU-01)  
**Qualified source SHA:** `c19b8885007cfd62b954fd6cb60221fb6901e9b2`  
**Qualified source tree:** `44e4b66a56298d17b70a2f48803728678e21fa4c`, directly checked against GitHub commit/tree  
**Published handoff state:** `8839f36f26f3015be6bdabf515095a0cce0a2bff`; feature-local handoff count **1**, recipient **REVIEWER**; feature branch `build/dec339-ws02-storage-safety-20261119`.

## Neutral requirements and acceptance boundary

Owner-authorized BU-01 requires the existing v1 IndexedDB byte-store connection to relinquish its handle on `versionchange` so the dormant, additive v2 inventory schema may upgrade; explicit v1 reopening after v2 upgrade must fail closed; a blocked/failed opening must not permanently poison future attempts; canonical bytes/backups/BASE/pending effects/cursor must not be modified by schema opening. The existing v2-aware adapter is the intended rollback-compatible reader, but actual broad rollback/cursor-writer reconciliation, realistic browser cross-context upgrade, local-hint invalidation, complete WS-02 integration and DEC-339 planner activation are **out of this BU's acceptance scope**. The authoritative TSS includes `STATE-009`–`STATE-015`, `CHANGE-005`; locked DEC-339 states inventory remains advisory and cannot independently authorize destructive writes.

## Source observations

1. `src/state/indexeddb-state-storage.ts`, lines 89–121, still opens legacy v1 explicitly via `indexedDb.open(databaseName,1)`. It now registers `database.onversionchange` on successful open, calls `database.close()`, and clears the cached `database` promise. The preceding request's `failed` flag closes any late success after `onblocked` or `onerror`; these failure paths clear the cached promise and reject the caller, permitting later retry. There is **no automatic v1→v2 schema upgrade**, no silent v2 backfill, no reset, and no fallback to treating missing state as valid.
2. The existing v1 `read`, `write`, `compareAndSwap`, `backup` operations (lines 54–87) remain confined to the `sync-state` store and retain transactional CAS/backup semantics. An in-flight transaction may fail when the database closes for upgrade; rejection rather than invented canonical success is the appropriate fail-closed outcome.
3. `src/state/indexeddb-inventory-storage.ts`, around lines 146–160 and 211–235, uses schema version 2 and an additive `createSchema` only for missing stores. It does not rewrite the `sync-state` canonical record or existing backup keys on schema upgrade. Its existing `onversionchange` closes the v2 handle and resets its cached open. This module remains dormant/non-authoritative at product runtime.
4. `src/state/indexeddb-inventory-authority-storage.ts`, lines 77–159, opens without forcing a version so an explicitly deployed v2-aware rollback adapter can read both v1 and v2; v1-only code is intentionally not made a silent downgrade path. The v2-aware canonical writer uses read-write transactions and invalidates a ready inventory control pointer when unfenced canonical identity/cursor differs. It retains canonical CAS and backup operations.
5. `src/product/runtime.ts`, around lines 251–263, still constructs `IndexedDbStateByteStorage` and does not switch the production runtime to the inventory-aware adapter. Thus the changed code is a compatibility handshake for an otherwise dormant future v2 upgrade, not permission to activate inventory or mutate live state.

## Provisional adversarial findings

**No proven acceptance-blocking defect** on the bounded, source-only upgrade interoperability path. Closing the v1 connection in the versionchange callback and clearing the cached open is the necessary prerequisite. A subsequent explicit version-1 open after upgrade should reject with `VersionError`, which is fail-closed and expressly required.

- **BL-01 — Testing/environment qualification gap, not source defect:** Real browser or multi-context IndexedDB `blocked`/versionchange event scheduling was not demonstrable from static TypeScript source alone. The task appropriately reserves realistic blocked-upgrade behavior for a later WS-02 gate. Pass 2 must verify the synthetic test does not overstate this proof.
- **BL-02 — Lifecycle boundary to verify:** Ensure an `onblocked`-rejected request that later succeeds closes its handle and a second attempt is not permanently stuck behind the prior cached rejected promise. Implementation visibly handles both via `failed` and `this.database = undefined`. Unit oracle quality must be checked in Pass 2.
- **BL-03 — Evidence boundary:** No conclusion about cursor-writer comprehensiveness, v2 rollback in actual deployed binary, multi-context upgrade reliability, DEC-339 activation, or hardware/device testing is appropriate for BU-01.

**Provisional result:** **PASS WITH MINOR SCOPE/TESTING QUALIFICATIONS**, subject to Pass 2 direct test and PHX-CI review. The feature is NOT yet accepted solely by this report.

## Blind evidence separation disclosure

The neutral planning task `dec339-storage-upgrade-interoperability-2026-11-19.md` and feature-local `current-state.yaml` embed Builder-run status/verification summaries and an explicit test trace. These statements were incidentally visible while reading required neutral scope/hand-off records. They were **not** treated as proof of test behavior or qualification. Prior to publishing this assessment, no authored test source, Builder narrative-specific file, PHX-CI result file/terminal log, prior independent findings, or source compare/history diff was opened. The source analysis above rests on exact frozen production code and normative requirements alone.

**Frozen.** Subsequent changes of conclusion must be documented independently in a separate final report; do not alter this document as a retrospective rewrite.
