# WS-02 / DEC-339 / BU-05 — R9 frozen independent blind production-source assessment

**Reviewer:** `review-brain-10`  
**Phase:** BLIND production-source review, published before authored R9 tests, previous R7 report, R8 failure, source history/diffs or original PHX-CI evidence are opened.  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** WS-02/DEC-339/BU-05 — Cursor Writer Concurrency and Backup-First Recovery Gates  
**Frozen qualified source:** `0533ab2edc8f8631c72aee5bf5a3b1b23d1beb1b`  
**Frozen source Git tree:** `702e8e5d875b31f0f1d9cfb099a06c75b1f9b779` (direct Git commit check)  
**Source branch:** `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`  
**Incoming handoff:** count **6**, BUILDER → REVIEWER, verified against current remote `dev/state/current-state.yaml`.  
**Normative assignment:** `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu05-r9-independent-review-2026-11-22.md`.

## Source-only requirements

The R9 assignment, WS-02 architecture and target durable-state/Changes invariants require that *every* canonical v1.1 write route preserve existing learned remote Changes batch identity/content; prevent unproven batch retirement, authority downgrade and pairing replacement; accept authorized complete-reduction retirement and legitimate cursor-only CAS updates; refuse stale writers; and preserve BASE/mappings/pending intents, canonical backup-first recovery, atomic inventory invalidation and R7's linked token-chain semantics. Inventory remains dormant; no live migration, Drive/vault/device operations, installation, merge or activation are authorized.

## Independent R9 source observations

**P1-01 — Shared prior-batch transition rule.** `src/state/persistent-state-store.ts` adds `durableRemoteBatchTransitionIssues(current,candidate)` around lines 283–316. For each existing durable batch, a same-ID retained candidate must match full semantic batch identity and its original checkpoint persistence revision. Removing an existing batch is refused unless the *currently persisted* state has complete corresponding reduction and, for nonempty Changes, at least one durable fact reference. This uses old trusted-state authority rather than a same-write invented reduction.

**P1-02 — Legacy generic trusted-state write closes the formerly unprotected route.** `saveTrustedCore()` around lines 514–553 now checks whether the currently stored envelope is durable v1.1. If so, the replacement must remain a durable v1.1 authority state with the same vault and device identities and must pass `durableRemoteBatchTransitionIssues` **before** byte-CAS. Candidate semantic validation already checks that the replacement's learned history remains unique, ordered, linear and connected. This directly closes the prior observed path by which same-ID/different Changes payload or unproven removal could otherwise pass the generic legacy writer.

**P1-03 — Authority writer reuses exactly the same rule.** `saveAuthorityCore()` around lines 635–668 validates current authority, expected persistence revision and optional semantic generation, exact pairing identity, invokes the *same shared helper*, validates the whole candidate and commits through atomic byte CAS. R9 does not leave a divergent second policy in the two major state-write methods.

**P1-04 — Recovery and permitted operations remain.** Valid cursor-only `saveTrusted()` candidate copies the existing batches and therefore does not trip the shared helper; existing production cursor-write call `commitTrustedCursorWithCas()` retains expected predecessor or terminal-token gate and expected revision. The explicit `recordRemoteBatchReduction()` and `retireLearnedRemoteBatch()` remain available, and a complete previously durable reduction permits retirement. Recovery `replaceRecoveryState()` remains backup-before-CAS and pairing-fenced. Canonical mapping, BASE, operation intents and remote inventory are not directly mutated by this change beyond their existing disciplined state transitions.

**P1-05 — R7 safeguards preserved.** `src/product/product-controller.ts` checks exact same-ID replay content and starts new batches at the validated frontier; `src/contracts/synchronization-foundation.ts` rejects forks, duplicate predecessors, cycles, disconnected advancing history and out-of-order observations, with zero-advance batches as observations, not edges. `src/product/snapshot-assembler.ts` derives incremental cursor from validated history rather than last array position. `saveAuthorityCore` and `saveTrustedCore` share a common durable-batch immutability rule; this is strictly an extension of safety, not an inventory cutover.

## Source-only concerns for Phase 2

**M-01 — Generic legacy writer is a powerful API, not a full cursor-specific transaction type.** `saveTrusted(state, expectedRevision?)` has a public optional expected revision, and direct callers can propose a cursor value; the *shipping* cursor helper separately checks the expected predecessor and invokes it with an expected revision, while storage byte-CAS protects against a read/write race. This historical broad contract is not the F-03 immutability bypass after R9. Phase 2 should check that tested shipping cursor transitions and stale writes remain guarded; do not assume the generic API's caller-specific semantics from production source alone.

**M-02 — Real storage/browser and integrator gates.** A passing synthetic fixture cannot substitute for live cross-WebView IDB upgrade arbitration, complete migration/rollback or an activated inventory/planner path. These remain outside bounded BU-05.

## Frozen blind result

**PROVISIONAL SOURCE-LEVEL PASS WITH MINOR FINDINGS, subject to Phase 2 tests, original exact-source PHX-CI qualification, historical integrity, and any newly established defects.** The earlier R7 F-03 shared-boundary failure appears corrected by inspection of the actual frozen source. This is **not** final acceptance.

## Blind separation disclosure

The task assignment and scoped handoff/state contain Builder-authored descriptions and claimed qualification status, incidentally visible while verifying identity and scope. These were **not treated as independent evidence**. No authored tests, prior R7 review source, R8 failure report, original PHX-CI report/log, or source-history diff was opened during this pass. Prior R7 defect context is necessarily known from this same reviewer conversation. This blind report must not be changed in light of Phase 2 outcomes.
