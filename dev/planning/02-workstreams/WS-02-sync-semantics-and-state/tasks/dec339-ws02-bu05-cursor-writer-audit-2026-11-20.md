# DEC-339 / WS-02 / BU-05 — Canonical Cursor Writer and Recovery Path Audit

**Date:** 2026-11-20  
**Owner direction:** Do not transfer an incomplete BU-05 to Reviewer.  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Build candidate (pre-audit record):** `6e83113dac76828f3ef3e6127c341d7bd9bf36a9`  
**Status:** BUILDER SOURCE/TEST CANDIDATE; FULL PHX-CI QUALIFICATION PENDING.

## Source-bound writer inventory

| Writer or state transition | Production path | Required canonical/backup/inventory behavior | BU-05 disposition |
| --- | --- | --- | --- |
| Shipping post-execution cursor | `src/product/product-controller-base.ts` `commitCursor`, shared `commitTrustedCursorWithCas` | Compare trusted source cursor to planned predecessor or already-learned terminal; refusing unrelated opaque token; CAS via shared `SynchronizationStateAuthorityAdapter` and version-aware IndexedDB; preserve BASE/intents | **Implementation amended**. Direct test verifies accepted winner, stale loser refusal, persistent cursor, inventory invalidation |
| Shipping Changes-learning batch author | `src/product/product-controller.ts` `persistLearnedRemoteBatch` | Persist learned batch before cursor mirror; verify predecessor against last durable learned batch or canonical cursor; same ID cannot represent conflicting tokens; retry may not overwrite unrelated cursor | **Implementation amended**. Direct test verifies first batch persists, conflicting duplicate and stale predecessor fail, restarted state retains winning cursor and learned batch |
| Canonical learned-batch API | `src/state/persistent-state-store.ts` `appendLearnedRemoteBatch` | CAS expected persistence/semantic revision; atomic canonical cursor and batch; stale loser blocked; inventory invalidation | **Existing production**. Original BU-05 adversarial two-writer test retained unchanged |
| General canonical authority writes | `src/state/persistent-state-store.ts` `saveAuthority` and `saveTrusted` | Trusted read/validation, CAS with no overwrite on stale revision; change in cursor/identity must invalidate ready inventory generation | **Existing production**. Prior BU-01/02 tests plus BU-05 accepted winner/refused writer path |
| Production compatibility adapter | `src/product/synchronization-adapters.ts` `saveTrusted`, `saveAuthority`, `replaceRecoveryState` | Preserve canonical BASE/effects during legacy projection, CAS against v2-aware bytes, no implicit activation | **Existing production**. BU-02 and new shipping-path tests use this exact adapter |
| Canonical byte-state writers | `src/state/indexeddb-inventory-authority-storage.ts` `write` and `compareAndSwap` | Inventory control and canonical state one IDB read-write transaction when v2 schema present; never leave a ready generation after unfenced cursor/identity change | **Existing production**. BU-01/02 atomic tests, BU-05 stale and corrupt-recovery tests retained |
| Inventory-authority publication | `src/state/verified-inventory-integration.ts`, `src/state/indexeddb-inventory-storage.ts` | Atomic inventory generation + terminal cursor + canonical authority publication, or fail-closed stale | **Existing dormant production**. Prior DEC-339 baseline and changes integration tests; no live activation |
| Backup-first state recovery | `src/state/persistent-state-store.ts` `createRecoveryBackup`, `replaceRecoveryState` | Corrupt source backed up before CAS; explicit expected vault/device fence must match candidate **before** backup/write; no automatic generation reactivation | **Implementation amended** for identity guard. Original BU-05 backup-integrity test plus new wrong pairing/missing identity test |
| Explicit authority migrations | `src/state/persistent-state-store.ts` `migrate`, `migrateToAuthority`, `migrateAuthorityV1ToV1_1` | Explicit backup-first CAS, validation; never automatically trigger live upgrade or pretend v1-only rollback is safe | **Existing production**, not newly invoked; migration contract and genuine WebView runtime verification remain separate WS-02 integration gates |
| Operation journal and verified BASE commits | `src/core/commit-coordinator.ts`, `src/product/synchronization-adapters.ts`, `src/state/persistent-state-store.ts` | Preserve current cursor while journaling, stage progression and BASE commits; CAS, semantic validation and unresolved intent gates | **Existing production**, covered by existing durable-intent and state-authority suites; no code change |

## Safety invariants and current proof limits

- **Never infer ordering of Google Changes tokens.** The current cursor must match the exact predecessor of a new write; a previously learned terminal cursor may be legitimately committed already. Reject incompatible replay and stale observations, even if a CAS operation could otherwise succeed from a newer observed revision.
- **No new cursor storage or planner.** The established controller, authority adapter, version-aware IndexedDB and durable recovery implementations remain the only production writers.
- **No bypass of recovery pairing identity.** Recovery from corrupt bytes cannot infer the original vault/device identity from untrusted source. Explicit expected identities must match the proposed trusted replacement before backup or CAS.
- **R1 historical PASS is not new qualification.** The prior `d8e9b739-6353-44cd-a4b0-5695c4c09228` tested the smaller two-test candidate only. The expanded code/test candidate requires an entirely new PHX-CI software-only run and independent review *after complete implementation*.
- **Not completed by BU-05:** genuine multi-tab/WebView blocked IndexedDB upgrade verification, full live rollback/cutover behavior, scope-owner/advisory consumer wiring, remote metadata transport seam, shadow parity and gated planner cutover. These are explicit future WS-02/WS-03/WS-05/WS-07 gates, not implicitly satisfied or waived.

## Additional recovery identity boundary
- A source envelope whose checksum is valid but whose stored vault/device identity disagrees with the proposed recovery target is **not** permission to overwrite it. The recovery method refuses before backup or CAS, even when the mismatched context would otherwise cause a recovery-required load result.
- The BU-05 suite includes a direct foreign-pairing takeover refusal test and asserts both canonical bytes and backup record count are unchanged. This complements the corrupt-source candidate identity test and does not allow live recovery.

## Mandatory gate

Run all required software verification exclusively through existing pinned repository-controlled PHX-CI in software-only mode, publish immutable evidence, repair any failure, and only then return to independent blind-first Reviewer review. No GitHub Actions, PR #157/master merge, activation, live database migration, actual Drive/vault operations, physical testing, installation or release.
