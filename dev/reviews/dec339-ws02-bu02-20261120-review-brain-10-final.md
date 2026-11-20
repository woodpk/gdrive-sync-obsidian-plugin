# WS-02 / DEC-339 / BU-02 — Independent final review

**Verdict: PASS WITH MINOR FINDINGS — BOUNDED BUILD UNIT ACCEPTED.**

- **Reviewer:** `review-brain-10`; review date 2026-11-20
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin`
- **Feature:** WS-02/DEC-339/BU-02 — v2-Aware Legacy Runtime and Cursor-Recovery Interoperability
- **Frozen exact qualified source:** `346f087202d76df89411d7e8cd79b8eecd2167b0`
- **Frozen qualified tree:** `5bf2072ff7ff719b9fa8caab9c27d298b05548fc`
- **Original handoff:** count 1, recipient REVIEWER, state commit `7bfbf48b08f35426a9ae24d1717fb21c66627513`
- **Frozen blind assessment:** `dev/reviews/dec339-ws02-bu02-20261120-review-brain-10-blind-source.md`, immutable publication commit `1b7f00cd5c92038e73037d98e21c3067e45f8abc`

## Independent source verdict

**PASS within bounded BU-02 requirements.** Production `src/product/runtime.ts` now selects the existing version-agnostic `IndexedDbInventoryAwareStateByteStorage` for the original `PersistentSynchronizationStateStore`, retaining schema policy version 1, the same pairing namespace, the same diagnostics injection and `SynchronizationStateAuthorityAdapter`. It neither activates inventory nor replaces the legacy planner/executor.

`src/state/indexeddb-inventory-authority-storage.ts` opens without requesting schema 2, retains canonical `sync-state/current-state` reads, bytewise CAS and historical backups, and in the same read-write transaction as a successful canonical update invalidates an active inventory pointer on changed canonical cursor or vault/device identity. Stale CAS does not write or invalidate. The old explicit-v1 adapter still fails closed on v2 databases; the dormant v2 inventory store remains separately gated. No independent source-level BU-02 blocker was found.

## Original exact-source PHX-CI assessment

**Run:** `bec72225-365c-47ae-bb87-f3336cb96fef`  
**Evidence publication:** `9f9baae544593719cf606d1023a72ffa848c2def`  
**Original evidence:** `dev/test-results/bec72225-365c-47ae-bb87-f3336cb96fef/result.md`, `result.json`, `terminal.log`.  
**Pinned PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`.

Original reports and terminal output were inspected after the blind report was frozen. They confirm exact checkout/expected HEAD `346f087202d76df89411d7e8cd79b8eecd2167b0`, exact Git tree `5bf2072ff7ff719b9fa8caab9c27d298b05548fc`, **13/13 PHX-CI stages PASS, 634/634 focused tests PASS, 1318/1318 product tests PASS, typecheck/build/artifact/repository guards PASS**, native exit code zero. Verification used local PHX-CI; no GitHub Actions, live provider/vault or physical tests executed.

The original R1 at source `2f4cdc9949ffba16465ee73a1c1e83445b4f1d55`, run `f5464803-6b77-4ffd-bf9c-29cde7b4f91d`, evidence commit `f0484b63cb16c2c6310ad3e52aefe19f88d4058c`, correctly remains **BLOCKED** (focused and product each two failures). Its failures and the superseding exact-source R2 PASS are preserved separately. Comparison from accepted BU-01 closeout `719e9035e3741e485f85c5471915e4039c0c4436` to qualified BU-02 source is ahead seven commits, behind zero; production delta is limited to `src/product/runtime.ts`, with a newly added regression section in the existing indexedDB integration test. Deletion of the reintroduced redundant fifth launcher restores rather than weakens the fixed PowerShell budget. The unrelated guard and logging oracles were not widened/disabled.

## Tests, trace and ten-family adequacy

Directly examined the five added cases in `tests/integration/dec339-indexeddb-transaction-integration.test.ts` lines 455–667, existing BU-01 versionchange tests and original `FakeDatabase` behavior:

1. **Nominal:** Real persistent authority reopens a simulated schema-v2 pairing through the v2-aware adapter, saves/reads advanced cursor — **covered**.
2. **Negative/boundary:** Old explicit-v1 reader rejects v2, stale canonical CAS cannot install invalid replacement bytes — **covered**.
3. **State transitions:** v1 connection receives `versionchange`, releases; v2 upgrade retains state; active inventory invalidated upon legacy cursor advance — **covered**.
4. **Retry/recovery/idempotency:** Previous BU-01 blocked/late-open retry tests retained; new restart with v2-aware adapter retains committed pending operation intent — **covered**. Cancellation N/A to synchronous connection-release handler.
5. **Concurrency/stale:** CAS precondition rejects stale bytes, ready inventory cannot authorize stale-cursor observation — **covered in deterministic software**; cross-WebView browser-realism remains a later WS-02 gate.
6. **Persistence/restart/integrity:** Original backup bytes, BASE, vault/device identity, cursor and operation intent persist across upgraded reads and cursor writes — **covered**.
7. **Identity/security/trust:** Unchanged canonical envelope validity, identity fences and fail-closed authority parsing retained — **covered by original design/full suite**.
8. **Contracts/integration/compatibility:** Unchanged `StateByteStorage` contract and `SynchronizationStateAuthorityAdapter.saveTrusted` cursor mirroring through v2-aware bytes — **covered**.
9. **Architecture/ownership/invariants:** No inventory planner activation, new authority or shipping mutation capability; repository checks PASS — **covered**.
10. **End-to-end/fail-closed/destructive:** Synthetic end-to-end IndexedDB authority path (including product adapter) and persistent rejection of stale/unsupported operations — **covered within BU-02**. Real Google/vault/device operations are not applicable and expressly unauthorized.

**Test-change integrity:** The explicit test-only `onversionchange` callback is delivered to the *actual previously opened connection* before v2 upgrade; old v1 post-upgrade `VersionError` expectation remains unchanged. This repairs fake scheduling fidelity without loosening the safety oracle. The extra PowerShell operator was removed, not replaced by a guard relaxation. Diagnostic source-window test keeps unchanged diagnostic injection.

## Nonblocking findings and follow-up

- **M-01 — Test environment realism:** `FakeDatabase` requires synthetic `onversionchange` and does not prove actual cross-WebView/multi-context blocked-upgrade event ordering. Real browser-capable interop coverage is required before the **full WS-02 storage integration gate**, not the bounded BU-02 acceptance.
- **M-02 — Integration breadth:** Other legacy cursor paths, scoped recovery/local hints, v2-aware rollback deployment and pending-effect stress in genuinely upgraded/multi-instance environments remain workstream responsibilities. No claim of complete WS-02 or DEC-339 planner activation is allowed.
- **M-03 — Blind metadata exposure:** Neutral planning and mandatory state records embed Builder result summaries; they were incidentally visible before publishing the blind report, but not relied upon as test/PHX-CI proof. Authored tests and original PHX-CI outputs were first examined after blind publication.

**Final disposition:** **PASS WITH MINOR FINDINGS — BU-02 ACCEPTED** for software-only exact qualified source `346f087202d76df89411d7e8cd79b8eecd2167b0`. No corrective production changes or requalification required on this bounded feature. Builder shall close out BU-02, carry M-01/M-02 to next approved WS-02 units, and keep the broader WS-02/DEC-339 integration gates incomplete. This review does not approve PR #157/master merge, inventory activation, live IndexedDB migration, real Drive/vault operations, physical testing, installation, promotion or release. Reviewer made no source, test, script or evidence changes and executed no software validation.
