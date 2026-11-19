# DEC-339 / WS-02 — Storage Upgrade Interoperability and Cursor-Safety Qualification

**Authorized:** Owner, 2026-11-19. **Builder:** `build-brain-67`.
**Starting SHA:** `d554b58a19f09a17354dee6f9af571ea060c9db1`.
**Branch:** `build/dec339-ws02-storage-safety-20261119`.
**Status:** BUILDER IN PROGRESS; **NO PHX-CI QUALIFICATION YET**.

## Bounded first increment

The shipping v1 IndexedDB byte-store connection must relinquish its connection on `versionchange`, permitting a separately authorized additive v2 schema upgrade without retaining a connection that blocks the upgrade. The v1-only reader must still refuse already upgraded v2 databases; rollback after upgrade requires the existing v2-aware adapter. A blocked or failed open must be retryable without treating an absent or unreadable canonical record as trustworthy. Preserve canonical bytes, backups, stable state identities, cursor, BASE, and pending effects. Inventory rows remain dormant/advisory; no planner activation, provider access, live migration, install, release, or master merge.

## Requirement-to-test trace

- **Nominal / compatibility:** `tests/unit/dec339-indexeddb-transaction-core.test.ts` legacy close → additive v2 opening → v2-aware canonical-byte read; existing v1→v2 publication tests.
- **Negative and forbidden states:** the same test refuses v1-only reopen after upgrade; blocked opens fail and can retry; existing v1 rejection and invalid/partial inventory tests remain unchanged.
- **Transitions / repetition / cancellation:** repeated v1 open after invalidation must fail safely; blocked open may retry. No automatic live migration/rollback is performed.
- **Concurrency / races:** versionchange must release an active legacy connection. Fixture dispatches the event explicitly; a true cross-context IndexedDB blocker/release scenario remains an unverified platform-realism limitation requiring PHX-CI/browser-capable coverage before full WS-02 qualification.
- **Persistence / restart / integrity:** canonical bytes and backup survive additive upgrade; existing inventory/CAS/abort/restart test suites retain their original oracles.
- **Identity / authorization / trust:** existing authority fencing, paired identity, cursor and inventory trust validators are unchanged.
- **Contracts / architecture:** storage API remains `StateByteStorage`; the old v1-only schema opening remains fail-closed, and `IndexedDbInventoryAwareStateByteStorage` is the v2 rollback path.
- **End-to-end / destructive safeguards:** no live migrations or mutations. Existing full inventory publication and canonical cursor tests cover storage-level atomicity; overall planner/executor safety is an additional future integration gate.

**Ten-family explicit disposition (for this first increment):**
1. Nominal — new migration interoperability test.
2. Negative/boundary — new blocked-open and downgrade rejection tests.
3. Legal/forbidden transitions — versionchange release, refused legacy reopen.
4. Idempotency/retry/cancellation/recovery — blocked retry and existing CAS/recovery suites; cancellation is **NOT MATERIALLY APPLICABLE** to the synchronous connection release handler.
5. Concurrency/races/stale — explicit versionchange handler and existing cursor writer race tests; real multi-tab upgrade blocking still needs separately applicable coverage.
6. Persistence/restart/data integrity — canonical/backup preservation and existing durable-pair restart tests.
7. Identity/security/trust — existing envelope/identity fences unchanged and guarded by preexisting tests.
8. Contracts/integration/compatibility — legacy/v2 reader behavior tests.
9. Architecture/ownership/invariants — byte-store abstraction retained and dormant inventory remains non-authoritative.
10. E2E/fail-closed/destructive — real device/provider operations **NOT MATERIALLY APPLICABLE** to this connection-lifecycle increment; software fail-closed tests apply.

## Further WS-02 work before final qualification

Inspect and, where necessary, repair every canonical cursor writer, safe legacy/v2 fallback, blocked version upgrades in realistic IDB implementation, exact rollback behavior, scope change/resume local-hint invalidation, incomplete/ambiguous authority and preservation of BASE, intents and durable effects. Test each materially applicable family and execute all software qualification **only through pinned PHX-CI**. No PASS or Reviewer handoff is claimed by this record.
