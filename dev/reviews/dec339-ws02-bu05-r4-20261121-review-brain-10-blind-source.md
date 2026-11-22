# WS-02 / DEC-339 / BU-05 R4 — Independent frozen blind production-source assessment

**Reviewer:** `review-brain-10`  
**Phase:** 1 — source-only, frozen before opening authored BU-05 tests, PHX-CI reports/logs, R3/R4 history/diffs or prior BU-05 review reports.  
**Feature:** Cursor Writer Concurrency and Backup-First Recovery Gates  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Source SHA:** `9319472e7b3a075c1ddfccad87c1913d6d3758dc`  
**Git tree:** `4f9d90d7a899937114ee714fb4a0715efe78cb61` (independently obtained from Git commit)  
**Incoming handoff:** count 2, sender BUILDER, recipient REVIEWER on `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`. Verified current branch state.  
**Assigned scope:** `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu05-r4-independent-review-2026-11-21.md`, committed on branch administrative HEAD rather than within the frozen source.

## Independent neutral acceptance basis

Authoritative R4 assignment, bounded WS-02 BU-05 planning, WS-02 architecture, locked DEC-339, and target-system `CHANGE-005`, `STATE-009/010/011/012/013/015`, `XFER-005` and inventory fail-closed invariants require: no unrelated or stale opaque Changes-token overwrite; durable, continuous, uniquely linked, noncyclic learned-batch catch-up; no ambiguous/forked or incompatible durable batch history accepted; canonical CAS and remote-inventory invalidation; backup-first recovery fenced by exact vault/device pairing; no inferred deletion or destructive authority from unknown state. This is a *bounded software-only BU*, not permission to finish WS-02, activate DEC-339, or perform any physical operation.

## Observed conforming source

1. `src/product/product-controller-base.ts` `commitTrustedCursorWithCas` around lines 287–305 loads trusted canonical authority, permits a cursor write only when current cursor equals the expected predecessor or target terminal token (idempotent retry), then uses `saveTrusted` with expected `stateRevision` CAS. The shipping controller calls this helper, so tests can exercise the actual production cursor guard. Opaque tokens are compared by equality, never lexically ordered.
2. `src/product/product-controller.ts` `hasUnambiguousDurableCursorChain` around lines 39–61 walks exact `startingToken → terminalStartToken` links, demands exactly one outgoing successor at each traversed token, and tracks visited tokens to fail closed on cycles/loops. `persistLearnedRemoteBatch` around lines 63–131 reads trusted canonical cursor instead of misusing the limited authority metadata read model, requires a reachable durable history for new and replayed batches, and uses CAS saves with bounded stale-revision retries for the canonical mirror.
3. `src/state/persistent-state-store.ts` `saveAuthorityCore` around lines 565–584 requires valid identity/schema, expected persistence revision/semantic generation, and storage-level atomic CAS. `src/state/indexeddb-inventory-authority-storage.ts` performs that CAS and invalidates a ready inventory pointer in the same transaction on unfenced canonical cursor/identity changes.
4. `src/state/persistent-state-store.ts` `replaceRecoveryState` around lines 743–776 checks explicit expected vault and device identities and matching replacement state **before backup or CAS**; rejects a parseable current state belonging to a different pairing; requires the currently loaded state to be objectively recovery-required; makes a backup of the *actual source bytes before replacement*; CAS rejects a concurrent replacement. It does not silently re-enable an invalid inventory generation.
5. `src/product/runtime.ts` continues to use the legacy planner and v2-aware canonical state byte store; no DEC-339 inventory planning cutover, Google Drive/device operation, release or deployment is added.

## Source concern S-01 — Forked durable Changes history can be written before rejection

**Location:** `src/product/product-controller.ts` `persistLearnedRemoteBatch` lines ~83–127, `src/contracts/synchronization-foundation.ts` `appendDurableRemoteChangeBatch` lines ~154–162, and `src/state/persistent-state-store.ts` `DurableSemanticStateValidator` lines ~358–362.

**Mechanism:** For a new batch ID, code first proves that the batch's starting token is reachable from current canonical cursor **using only the existing backlog**. It does **not** check whether the new batch's starting token already has an outgoing successor with a different ID/terminal. It then saves the appended batch durably. Only afterward does the canonical mirror catch-up attempt run `hasUnambiguousDurableCursorChain` on the extended backlog. When that detects multiple successors for one token, it throws `recovery-required`, **after** the contradictory forked durable record has already been committed. Validator currently enforces unique batch IDs but not unique startingToken edges.

**Concrete sequence:** Canonical cursor C; existing durable batch `A: C→D` (previously learned but canonical cursor still C); a conflicting new batch ID `B: C→E` arrives. New-batch precheck `chain(C,C)` returns true. `saveAuthority` durably commits both edges `C→D` and `C→E`. Subsequent chain to E detects two successors and refuses mirroring, but leaves a fork in durable learned-history metadata. A subsequent legitimate restart catch-up via D can likewise be prevented by that poisoned fork. **This may violate the explicit requirement to reject forked durable histories before they become trusted persisted history.** This is not a claim of physical deletion or cursor overwrite, but a high-risk recoverability and fail-closed persistence concern.

**Required Pass-2 decision:** Determine whether tests and exact contracts already guarantee such a fork is impossible at this entrypoint, or if this is a genuine source-level acceptance blocker. If not excluded by a proven invariant, Builder must reject a competing outgoing edge **before** persisting the new batch, and test that the original durable backlog/canonical cursor/BASE/intents remain unchanged after a rejected fork.

## Source concern S-02 — Same batch ID and tokens but different changes are treated as a compatible replay

`persistLearnedRemoteBatch` currently checks an existing ID's `startingToken` and `terminalStartToken` only; `DurableRemoteChangeBatch` also includes `changes`. A replay with the same batch ID and token endpoints but a materially different changes payload is accepted as `existing` and bypasses re-learning, without verifying equality of the changed facts. The shared `appendDurableRemoteChangeBatch` helper similarly deduplicates solely by ID. If the authority contract treats a batch ID as identifying the entire observed batch, this is an **incompatible duplicate** and should fail closed. Pass 2 must establish whether batch IDs/changes are deterministically bound by some other enforced invariant; otherwise require exact payload-equivalence proof (with normalized well-defined fields) before accepting same-ID replay and add negative coverage.

## Blind disposition

**Provisional CORRECTION REQUIRED**, conditional on Pass-2 confirmation of S-01/S-02 and independent test/evidence inspection. The new cursor CAS, linked-token walk, and backup-first identity fences visibly address the stated primary regressions, but a successful PHX-CI run cannot substitute for verifying whether conflicting remote Changes records can be durably learned. No R4 qualification or final acceptance claimed at this phase.

## Blind information-isolation disclosure

The mandatory committed review assignment, the current feature handoff state and the normative BU-05 planning document contain embedded Builder result/history descriptions that were incidentally visible when establishing scope and identity. Those claims were not used as test, history or evidence proof. The substantive observations above derive from **frozen production code and neutral required invariants**; no authored tests, full PHX-CI result/log files, comparison diffs or earlier BU-05 review reports were opened before freezing this report. This is a disclosure of imperfect *narrative* blind isolation, not a claim of a perfectly isolated review.

**Immutable first pass.** Final findings must be separately recorded; this report must not be silently rewritten after tests/evidence are opened.
