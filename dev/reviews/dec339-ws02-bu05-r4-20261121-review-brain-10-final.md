# WS-02 / DEC-339 / BU-05 R4 — Independent final review

**VERDICT: CORRECTION REQUIRED — NOT ACCEPTED**

**Independent reviewer:** `review-brain-10`  
**Feature:** Cursor Writer Concurrency and Backup-First Recovery Gates  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Frozen implementation SHA:** `9319472e7b3a075c1ddfccad87c1913d6d3758dc`  
**Frozen implementation Git tree:** `4f9d90d7a899937114ee714fb4a0715efe78cb61`  
**Incoming handoff:** count 2, BUILDER → REVIEWER, branch `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`.  
**Frozen blind report:** `dev/reviews/dec339-ws02-bu05-r4-20261121-review-brain-10-blind-source.md`; immutable report commit `0a99fa45f03507b9640250e8f82144786ac181e3`.  
**Assignment:** `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu05-r4-independent-review-2026-11-21.md`.

## Source findings: correction required

**F-01 — MAJOR: forked durable Changes history can be committed before being rejected.**

- **Evidence:** `src/product/product-controller.ts` lines 83–110 validates an incoming NEW batch by checking a path through the *existing* durable batches from current canonical cursor to the incoming batch's starting token. It does not require that the newly appended edge preserve unique successors at that starting token. `appendDurableRemoteChangeBatch` in `src/contracts/synchronization-foundation.ts` lines 154–162 deduplicates by batch ID, not by predecessor edge. `DurableSemanticStateValidator` in `src/state/persistent-state-store.ts` around lines 358–362 rejects duplicate batch IDs but does not reject forked starting tokens. The code durably saves the candidate through `authorityStore.saveAuthority` before performing the final chain check in its cursor mirror loop (controller lines 113–127).
- **Reproducible interleaving from the implementation:** trusted canonical cursor C; previously persisted batch `batch-A: C→D`, canonical cursor still C after an interrupted mirror; new batch `batch-B: C→E` with distinct ID arrives. `hasUnambiguousDurableCursorChain(existing, C, C)` returns true trivially. Batch B is committed, leaving two persisted outgoing edges from C. The later mirror chain `C→E` detects two successors and throws `recovery-required`, but the forked durable backlog remains written. A restart now sees contradictory learned history, potentially preventing recovery of the previously valid `C→D` chain. Nothing in the current source or tested contracts prohibits this sequence.
- **Normative failure:** durable learned-batch history must be complete and unambiguous before acceptance; reject forked/unrelated/incompatible histories without contaminating durable recovery evidence. See R4 assignment, `CHANGE-005`, `STATE-009/010/011/012`, `DEC-339`.
- **Correction:** reject an incoming batch whose start token already has a conflicting outgoing edge or whose addition would create an inconsistent/ambiguous chain **before** `saveAuthority`. Validate the entire proposed durable chain in context of the canonical cursor and existing backlog; fail closed on forks, loops/cycles, missing links, incompatible replays and unrelated cursors without writing the contradictory batch. Consider cross-writer interleavings and rely on existing CAS revisions for arbitration. Regression must show unchanged canonical cursor, learned backlog, BASE and intents after a refused fork, including restart and subsequent completion of the original valid chain.

**F-02 — MAJOR: same batch ID and cursor endpoints can hide incompatible changed payload.**

- **Evidence:** `src/product/product-controller.ts` lines 72–75 checks a duplicate `batchId` only for equal `startingToken` and `terminalStartToken`. It does not compare `changes` (the material remote observations in the `DurableRemoteChangeBatch` contract). It then treats the batch as `existing` and bypasses durable learning. `appendDurableRemoteChangeBatch` likewise suppresses same-ID input regardless of payload, and the existing semantic validator only ensures unique IDs within stored batches.
- **Concrete counterexample:** durable batch ID X records `C→D` with changes `[file-P]`; a replay with ID X and the same `C→D` but changes `[file-Q]` is accepted as compatible, leaving P rather than Q in persisted observations. Successful cursor mirror may report success while the caller's ostensibly equivalent fully read changes were never committed. Since the ID does not authenticate content equality in the inspected source, this violates the stated incompatible replay and durable observation integrity guarantee even though the cursor endpoints match.
- **Correction:** compare replayed batches against their durable equivalents using exact, deterministic normalized checkpoint/content semantics, or introduce an explicit cryptographic commitment to the complete batch that is enforced in the contract. Reject incompatible same-ID replays *before* any state or cursor write. Preserve compatible idempotent retry. Add negative tests for changed contents with identical ID and endpoints, as well as valid identical retry.

These findings were identified in the independently frozen blind source assessment and confirmed after inspection of authored tests; they are **not** disproved by the PHX-CI PASS. There is no basis to downgrade them to Owner-accepted concurrency residual risk: both arise deterministically in durable metadata-processing code, not the narrowly waived DEC-362 provider write race.

## Correctness strengths retained

- `src/product/product-controller-base.ts` `commitTrustedCursorWithCas` permits equality with exact expected predecessor or already committed target, followed by canonical CAS; stale external cursor cannot be overwritten through this path.
- `src/product/product-controller.ts` performs an equality-based, unique and visited-token chain walk for the edges it examines; no invalid lexical ordering of opaque Drive change tokens occurs. It rejects missing links, simple cycles and unrelated cursor positions at the mirroring stage. F-01 concerns the earlier *durable write* boundary.
- `src/state/persistent-state-store.ts` `saveAuthorityCore` checks identity, semantic validity and persistence/semantic revisions before a storage CAS; the v2-aware IDB byte adapter atomically invalidates an active inventory on a canonical cursor/identity write.
- `replaceRecoveryState` refuses missing/mismatched expected vault/device identity and a parseable foreign pairing before any backup/replacement. A corrupt source is backed up first and replaced only by CAS, preserving identity fences and preexisting backup records.
- ProductRuntime retains the legacy planner, and this reviewed change does not activate inventory, permit real database upgrades or authorize physical execution.

## Direct tests and ten-family adequacy

Reviewed `tests/integration/dec339-indexeddb-transaction-integration.test.ts` lines 672–907, including stale two-writer learned-batch CAS, backup-first corrupt-state replacement and restart, production cursor CAS predecessor, shipping Changes-learning unrelated cursor and same-ID **different endpoint** replay, wrong/missing pairing identity, and readable foreign pairing refusal.

The existing replay regression changes `terminalStartToken` for a repeated ID; **it does not vary `changes` while holding the ID and both endpoints fixed**. The unrelated-cursor regression begins with canonical cursor already advanced; **it does not exercise the critical valid-but-not-yet-mirrored C→D learned batch followed by a conflicting C→E edge**. Neither is redundant coverage.

| Test family | Assessment |
| --- | --- |
| 1. Nominal | PASS — normal cursor commit and recovery |
| 2. Negative/boundary | BLOCKER — forked predecessor and same-token/content-incompatible replay missing |
| 3. Legal/forbidden transitions | BLOCKER — contradictory durable batch may be saved before mirror denial |
| 4. Retry/recovery | PARTIAL — legitimate restart and backup recovery covered, but fork-poisoned restart not |
| 5. Concurrency/staleness | PARTIAL — stale persistence CAS and shipping stale predecessor covered; divergent learned forks not |
| 6. Persistence/integrity | BLOCKER — durable history mutation can precede failure, and same-ID payload mismatch is not checked |
| 7. Identity/security/trust | PASS — vault/device pairing and foreign pairing backup guards |
| 8. Contracts/compatibility | PARTIAL — existing API preserved, batch identity does not bind complete content |
| 9. Architecture/invariants | PASS — no extra planner, unapproved inventory activation, or guard change |
| 10. End-to-end/fail-closed | PARTIAL — restart, recovery and refusals covered, but refusal-after-durable-fork fails closed too late |

### R3→R4 test-change integrity

Independent GitHub comparison from `241e2659e7a56188be6565971dcdb542b5e51e4e` to `9319472e7b3a075c1ddfccad87c1913d6d3758dc` shows **2 commits ahead, 0 behind**. Production change is `src/product/product-controller.ts` (51 added, 6 removed); other changes are original historical R3 PHX-CI evidence and `dev/_ca-output.md`. **No authored tests, repository guards, scripts, frozen requirements or policy files changed** between R3 and R4; thus no evidence of oracle/guard weakening to manufacture a PASS. The H-I6 repair improved handling of complete unique noncyclic token chains but left F-01/F-02 untested. Do not relax existing oracles when correcting them.

## Original PHX-CI evidence and immutable history

**R4:** Run `99a90abf-16fd-4e31-a5ca-0d05589de610`; evidence-only commit `8b9baeeb15e9ae57772e3e4fd43e1f3ad8d50689`; original `result.md`, `result.json`, full `terminal.log` directly examined. Exact expected and verified HEAD match frozen SHA; verified tree matches frozen tree. All **13/13 required stages PASS**, focused **634/634 PASS**, full product **1332/1332 PASS**, typecheck/build/artifacts/repository checks PASS, overall PASS and task exit 0, software-only. Comparing implementation SHA to evidence commit shows one descendant commit changing **only** `dev/_ca-output.md` and three files beneath `dev/test-results/99a90abf-16fd-4e31-a5ca-0d05589de610/`. Evidence publication has not changed product source.

**History retained and independently confirmed via original run reports:**
- Partial-scope R1 PASS: source `8d7785aa0e40bfaab3c446183422c64242aee070`, run `d8e9b739-6353-44cd-a4b0-5695c4c09228`. Does not qualify expanded source.
- Expanded R2 BLOCKED: source `d32e0219b2002ea054e48eea073ce2563d2cbde3`, run `d0260a16-e6f9-470d-a39c-bc0225e1e1a3`: TypeScript typecheck failure, subsequent test/build stages blocked.
- R3 BLOCKED: source `241e2659e7a56188be6565971dcdb542b5e51e4e`, run `fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea`: 634 focused PASS, product TEST FAIL, remaining dependent stages blocked.
- R4 PASS: as above, 1332 product PASS. True PHX-CI result, not independent feature acceptance.

## Required next action

Builder must fix **F-01 and F-02** within BU-05; retain established cursor CAS, trusted identity/recovery fences, backup-first semantics, inventory invalidation and source/verification architecture. Add explicit focused adversarial integration cases for the durable-fork and same-ID payload-replay scenarios, including rejected-write state invariance, restart, and good idempotent retry. Then freeze a new exact candidate, perform full software-only PHX-CI through the existing approved local operator, preserve original evidence and submit a new Builder→Reviewer count-advanced handoff. No independent acceptance is granted now.

**Final disposition: CORRECTION REQUIRED.** Full WS-02 and DEC-339 remain incomplete. No Reviewer production/test/script/PHX-CI changes or executable validation occurred. No GitHub Actions, physical operations, master/PR #157 merge, inventory cutover, migration, install, promotion or release authorized.

**Blind source isolation disclosure:** Mandatory assignment/planning/state files exposed embedded Builder run/history statuses before the blind report was published; independent source findings were drawn from source, and authored tests/PHX-CI files/compare history were first opened only after the blind report was frozen.
