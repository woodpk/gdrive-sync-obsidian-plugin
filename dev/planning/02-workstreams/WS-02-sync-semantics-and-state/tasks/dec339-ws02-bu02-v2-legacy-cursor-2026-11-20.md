# DEC-339 / WS-02 / BU-02 — v2-Aware Legacy Runtime and Cursor-Recovery Interoperability

**Date:** 2026-11-20. **Owner authorization:** 2026-11-19 continue approved DEC-339 integration sequence.  
**Builder:** `build-brain-67`. **Branch:** `build/dec339-ws02-bu02-v2-legacy-cursor-safety-20261120`.  
**Baseline:** accepted BU-01 closeout `719e9035e3741e485f85c5471915e4039c0c4436`.  
**Status:** BUILDER IMPLEMENTATION; **NOT YET PHX-CI VERIFIED OR REVIEWER ACCEPTED**.

## Bounded requirement and architecture

The production `ProductRuntime` presently instantiates `IndexedDbStateByteStorage`, which explicitly requests schema version 1 and cannot reopen a pairing database after the dormant inventory schema has advanced to v2. The existing `IndexedDbInventoryAwareStateByteStorage` deliberately opens without forcing schema version and performs canonical CAS/backup against `sync-state`, with invalidation of active inventory control when a canonical cursor or identity update is not atomically paired to its generation.

**BU-02 change:** use this already-implemented v2-aware state byte adapter for the **legacy production planner**. Opening a legacy pairing in v1 must not upgrade it; opening v2 must not enable inventory, migrate vault state, authorize a remote read/write, or bypass an existing authority/BASE/intent check. Normal canonical cursor writes in the legacy path must invalidate previously published inventory rather than leave stale local inventory actionable. Preserve existing source components and authoritative executor; do not create a new state authority or default-on planner cutover.

**Critical limitation:** This change is code-only for future compatibility. It is not authorization to install it into an active device/vault, run live migration, activate v2 inventory or promote a release. Real multi-WebView IndexedDB upgrade blocking and complete scoped recovery remain future gates.

## Mandatory requirement-to-test mapping

| Test family | Applicable BU-02 oracle / scope |
| --- | --- |
| 1 Nominal | Real `PersistentSynchronizationStateStore` reopened with v2-aware byte adapter on schema-v2 test database; cursor save succeeds |
| 2 Negative | v1-only adapter rejects upgraded database; stale CAS refuses to overwrite authoritative bytes |
| 3 State transitions | v1→v2 schema publication, legacy non-inventory authority open, cursor advance invalidates active inventory |
| 4 Retries/recovery | Restarts from upgraded bytes, preserves original backup; pending journal retained across repeated saves |
| 5 Concurrency/stale | Stale original CAS cannot mutate canonical authority; inventory control/mismatched authority never becomes actionable |
| 6 Persistence/integrity | Restarted authority, BASE and operation intents retain exact values; backup bytes unchanged |
| 7 Identity/security | Vault/device identity from canonical envelope unchanged; unchanged validation and fail-closed ID fences apply |
| 8 Contracts/compatibility | Existing `StateByteStorage` interface, two adapters and production runtime constructor wiring, no schema write on open |
| 9 Architecture | No new planner/executor, PHX-CI/PowerShell guard unchanged, only runtime storage constructor is selected |
| 10 E2E/fail-closed | Simulated v1/v2 storage and production-state API; real provider/vault/device operations **NOT MATERIALLY APPLICABLE** and unauthorized |

Relevant executable regression tests added to `tests/integration/dec339-indexeddb-transaction-integration.test.ts`; preserve BU-01's tests and other source oracles. Existing full PHX-CI suites qualify other unchanged state writers and architecture, but do not magically prove real-browser scheduling. The test fixture is synthetic; this limitation is explicit.

## Qualification and boundary

- Software verification **only with pinned PHX-CI** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, using the existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` with `-SoftwareOnlyBranch`; no new verification scripts, architecture budget adjustments or GitHub Actions.
- Preserve immutable BU-01 accepted SHA and its original R2 evidence, independent review and handoff count 2.
- Freeze an exact BU-02 implementation SHA/tree for PHX-CI; handle any failure via Builder repair and new exact-source rerun. Once fully qualified, hand off **only BU-02** to an independent blind-first Reviewer.
- Retain Reviewer M-01 (real multi-context IDB scheduling) for a future explicit browser-capable test gate; do not claim the entire WS-02 storage step or DEC-339 activation is complete.
- No master merge, PR #157 merge, live pairing/database migration, physical testing, Drive/vault activity, installation, activation or release.
