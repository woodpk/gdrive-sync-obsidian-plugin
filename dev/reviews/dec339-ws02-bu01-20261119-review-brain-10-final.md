# WS-02 / DEC-339 / BU-01 — Final independent review

**Verdict: PASS WITH MINOR FINDINGS — BOUNDED BUILD UNIT ACCEPTED**

**Reviewer:** review-brain-10 · **Date:** 2026-11-19
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Scope:** IndexedDB Connection Upgrade and Cursor Interoperability, first bounded WS-02 increment only
**Frozen qualified source:** `c19b8885007cfd62b954fd6cb60221fb6901e9b2`
**Frozen Git tree:** `44e4b66a56298d17b70a2f48803728678e21fa4c`
**Frozen blind report:** `dev/reviews/dec339-ws02-bu01-20261119-review-brain-10-blind-source.md`, commit `322b86b71b57b2d0b620b35e51a9aca4174054a0`
**Incoming handoff:** count 1; state commit `8839f36f26f3015be6bdabf515095a0cce0a2bff`; Reviewer recipient confirmed from remote; feature branch `build/dec339-ws02-storage-safety-20261119`.

## Frozen production-source assessment and final conclusion

The blind production-source pass was independently published before the authored tests, original PHX-CI records or commit comparison were opened. Final evidence confirms its provisional nonblocking disposition.

1. `src/state/indexeddb-state-storage.ts` lines 89–121: v1 legacy IndexedDB open attaches `onversionchange` and closes the live handle on upgrade request; cached connection is cleared; blocked/error paths reject and permit retry. A later explicit v1 open against a v2 database must reject rather than simulate a rollback. No canonical-byte mutation is performed by opening.
2. Existing v1 `read/write/compareAndSwap/backup` remain transactional and structurally unchanged.
3. `src/state/indexeddb-inventory-storage.ts` lines 146–160, 211–235: additive schema v2, versionchange closure, retryable failed/blocked opens and canonical state store/backup preservation.
4. `src/state/indexeddb-inventory-authority-storage.ts` lines 77–159: version-agnostic open for the separate v2-compatible rollback reader; canonical read/CAS/backup and atomic stale-inventory invalidation retained.
5. `src/product/runtime.ts` around line 257 still constructs the v1 byte store, so this increment does **not** activate inventory-backed planning, upgrade a live vault, migrate real data or permit provider mutation.

**No acceptance-blocking defect is proven within this BU-01 contract.** Exactly-scoped limitations follow below.

## Original PHX-CI qualification and test-change integrity

**Qualified run:** `9a728c86-4f89-450d-9ef7-5c54c59c9c66`  
**Evidence commit:** `d9c7e01cf107d03abefa1c869d33976a75cf3fbe`  
**Original reports:** `dev/test-results/9a728c86-4f89-450d-9ef7-5c54c59c9c66/result.md`, `result.json`, `terminal.log`  
**PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`; original Windows local runner, no GitHub Actions.

Original `result.md`, `result.json` and `terminal.log` were inspected directly. Expected and verified source/tree exactly equal `c19b8885007cfd62b954fd6cb60221fb6901e9b2`/`44e4b66a56298d17b70a2f48803728678e21fa4c`. All **13/13** required stages PASS, focused **634/634** PASS, product **1313/1313** PASS, native exits 0, build/typecheck/artifact/repository checks PASS. The original R1 `ad1f838c-bca9-4135-a72a-be9b8383da2f` at source `43c6f5d4ac68e832e5c6d8e6b60a912664a88073` remains **BLOCKED**, not retrospectively relabeled; redundant fifth PowerShell launcher was removed without altering frozen architecture budget or weakening guards. Exact source comparison from `d554b58a19f09a17354dee6f9af571ea060c9db1` is ahead nine commits without divergence; changed test, fixture and source paths correspond to this bounded connection-lifecycle scope.

Tests examined:
- `tests/unit/dec339-indexeddb-transaction-core.test.ts` lines 240–319, covering legacy v1 close, additive v2 schema, unchanged canonical bytes and original backup, refused v1 reopen, retry from blocked v1 open, v2-aware late-success closure/retry, and v2 inventory late-success closure/upgrade.
- `tests/fixtures/dec339-inventory-idb-fixtures.ts` FakeDatabase explicitly models `onblocked`, late-open continuation, version upgrade, `VersionError`, close counting and transaction snapshots. These are **synthetic event scheduling oracles**, not proof of real browser cross-context blocking behavior.
- `tests/integration/dec339-indexeddb-transaction-integration.test.ts` around lines 401–445, proving cursor writer's active-inventory invalidation for an unfenced append.
- Existing inventory baseline, CAS, abort/restart, publication, identity fencing and cursor tests remain qualified by the full suite; they do not imply the remaining WS-02 full integration gate is complete.

## Ten-family adequacy — BU-01 only

| Test family | Reviewer disposition |
| --- | --- |
| 1. Nominal | PASS — v1 close, additive v2 open, canonical/backup read |
| 2. Negative / boundary | PASS — explicit VersionError downgrade refusal and blocked-open rejection |
| 3. Legal / forbidden state transitions | PASS — versionchange closes legacy; failed opens do not create trusted state |
| 4. Retry / recovery / cancellation | PASS for blocked-open retry and late success cleanup; cancellation N/A to synchronous close callback |
| 5. Concurrency / stale races | PASS for deterministic upgrade signal and retry; genuine browser multi-context blocking retained for later full WS-02 gate |
| 6. Persistence / restart / integrity | PASS — preserved canonical/backup and existing CAS/integrity regression tests |
| 7. Identity / authentication / trust | PASS within unchanged identity fences and fail-closed canonical read; no OAuth/provider change |
| 8. Contracts / integration / compatibility | PASS — StateByteStorage, legacy v1 fail-closed and separate v2-aware reader |
| 9. Architecture / invariants | PASS — inventory remains dormant, no shipping activation, 13/13 PHX-CI stages |
| 10. End-to-end / fail-closed / destructive | PASS for bounded synthetic software upgrade; real vault/provider/physical dispatch N/A to BU-01 and not claimed |

## Minor findings / deferred gates

**M-01 — MINOR, explicitly deferred:** The FakeDatabase emits `onversionchange` manually and simulates blocked/late-open behavior. The tests prove program logic under those events, not multi-tab/Obsidian-WebView real IndexedDB upgrade scheduling. Add realistic browser-capable upgrade/blocker coverage before the **whole WS-02 storage gate**, not as a BU-01 acceptance prerequisite.

**M-02 — MINOR, broader workstream boundary:** The BU proves basic v1/v2 cursor interoperability and representative unfenced cursor invalidation but does not exhaustively establish all legacy cursor writer paths, real upgrade/rollback operational states, local-hint scope/resume invalidation, or pending effects under more complex recovery cases. Those remain explicitly assigned to subsequent WS-02 Build Units. Do not mark WS-02 or DEC-339 activation complete.

**M-03 — Scope/provenance notice:** In the original neutral planning/state records, Builder-supplied run summaries were incidentally visible during blind-source grounding. Those were not relied upon as independent evidence; tests/evidence/diffs were opened only *after* the blind report had been frozen/published.

## Final acceptance scope and next role

**PASS WITH MINOR FINDINGS — WS-02/DEC-339/BU-01 ACCEPTED** at the exact frozen source SHA and original PHX-CI run. No production source, tests, scripts, original evidence, validation execution, live state or device operations were altered by the Reviewer. Builder shall verify state/handoff identities, close this bounded BU with minor findings carried forward, and continue the next separately approved WS-02 Build Unit. Broader WS-02 integration, DEC-339 inventory planner cutover/activation, PR #157 merge, live Drive/vault operations, physical testing, install and release remain **NOT AUTHORIZED by this verdict**. The completed original PHX-CI run should not be repeated needlessly.
