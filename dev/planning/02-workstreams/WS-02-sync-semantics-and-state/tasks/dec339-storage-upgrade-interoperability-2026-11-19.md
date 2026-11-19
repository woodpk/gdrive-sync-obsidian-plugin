# DEC-339 / WS-02 — Storage Upgrade Interoperability and Cursor-Safety Qualification

**Authorized:** Owner, 2026-11-19. **Builder:** `build-brain-67`.
**Starting SHA:** `d554b58a19f09a17354dee6f9af571ea060c9db1`.
**Branch:** `build/dec339-ws02-storage-safety-20261119`.
**Status:** BUILDER CORRECTION; R1 PHX-CI **BLOCKED**, R2 exact-source qualification pending.

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

## R1 software qualification — original outcome retained

- Exact source: `43c6f5d4ac68e832e5c6d8e6b60a912664a88073`, tree `877ebfcebde2a41ea1e9b8c95a95b73d17f67227`.
- Original pinned PHX-CI run: `ad1f838c-bca9-4135-a72a-be9b8383da2f`; evidence commit `428da1bc90f9b26aa88ba30570cdc1de31e5df17`.
- Exact verdict: focused 631/634; 3 failures, product 1313/1313 PASS, TypeScript typecheck PASS, change-set FAIL, repository PASS, overall BLOCKED (exit 201).
- Two guard failures were directly caused by adding `dev/scripts/Invoke-PHXCI-DEC339-WS02.ps1` (fifth PowerShell script against the frozen four-script budget and mismatch against the P1 exact-script inventory). Remove the extra script; **do not** alter any guard, budget, inventory manifest or test oracle.
- Independently, the preexisting `s08e-external-live-executor` test **production execution has a separate bounded receipt deadline from routine commands** reported `failed` instead of `completed`. No evidence yet establishes why; it must PASS in the next full PHX-CI qualification or be investigated and corrected without suppressing safety expectations.
- R1 original failure evidence is immutable; this remediation does not relabel it or assert software acceptance. The existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` software-only mode is the repository-controlled PHX-CI launcher. Because that operator requires `C:\\temp\\<GUID>\\<repo>` placement, its owner bootstrap creates a throwaway clone at that shape, freezes the new source SHA, and calls it with `-SoftwareOnlyBranch` and `-ExpectedSourceSha`. No physical flags are used. Preserve the run root for diagnosis and publish results through PHX-CI.
