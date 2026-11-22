# WS-02 / DEC-339 / BU-05 — R9 Final independent review

**VERDICT: PASS WITH MINOR FINDINGS — BOUNDED BU-05 ACCEPTED**

- **Reviewer:** `review-brain-10`
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin`
- **Source branch:** `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`
- **Feature:** Cursor Writer Concurrency and Backup-First Recovery Gates
- **Exact accepted R9 source:** `0533ab2edc8f8631c72aee5bf5a3b1b23d1beb1b`
- **Accepted Git tree:** `702e8e5d875b31f0f1d9cfb099a06c75b1f9b779`
- **Incoming handoff:** count 6, BUILDER → REVIEWER, feature-local state `dev/state/current-state.yaml`
- **Blind assessment:** `dev/reviews/dec339-ws02-bu05-r9-20261122-review-brain-10-blind-source.md`, immutable publication `e36a4765b505fd761178db3fd0cd2417f06c751b`.
- **Authoritative review assignment:** `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu05-r9-independent-review-2026-11-22.md`.

## Independent source findings and correction disposition

**R4 F-01 — RESOLVED.** `src/product/product-controller.ts` validates a newly learned remote Changes batch starting at the complete, unique durable cursor frontier, then validates the *proposed* complete ordered batch history **before** durable `saveAuthority`. The shared `inspectDurableCursorHistory` contract rejects forked successors, duplicate predecessors, cycles, detached edges and unordered histories. No lexical ordering is applied to opaque change tokens.

**R4 F-02 — RESOLVED.** Replay equivalence uses the exact normalized ordered Changes payload and checkpoint identity, not only batch ID or terminal cursor. `src/product/snapshot-assembler.ts` derives deterministic batch identity from the observation payload and the cursor endpoints, excluding `persistenceRevision` as required CAS-only context. Identical replay remains idempotent while different contents, including advisory attributes, are refused.

**R7 F-03 — RESOLVED in R9.** `src/state/persistent-state-store.ts` `durableRemoteBatchTransitionIssues(current,candidate)` now enforces exactly one existing-batch immutability/retirement policy at both `saveAuthorityCore()` and the previously vulnerable `saveTrustedCore()`. Once the currently stored state is durable v1.1, the generic canonical writer refuses a non-v1.1 downgrade, change of vault/device identity, a same-ID rewrite of checkpoint/complete Changes contents, and removal of an existing batch without **previously persisted complete reduction** and required fact references. Both call paths validate the candidate and enforce byte-CAS before committing. No material F-03 bypass remains in this bounded source.

**No other acceptance-blocking production defect identified** within the R9 bounded feature. Backup-first recovery retains exact pairing fences, original-byte preservation before CAS and refuse-on-race behavior. The shipping cursor helper remains predecessor/CAS-bound. Previously accepted remote-inventory invalidation remains atomic with the canonical byte update. No planner activation or remote/vault effect path was introduced.

## Authored R9 tests and ten-family adequacy

Directly inspected `tests/integration/dec339-indexeddb-transaction-integration.test.ts`, including new R9 cases around lines 1374–1577, existing R7 fork/content/cursor regression cases, and the actual generic `saveTrusted`, `saveAuthority` and low-level batch storage methods.

| Family | Result |
| --- | --- |
| 1. Nominal | PASS — legitimate durable Changes learning, exact replay, successful cursor-only catch-up, complete reduction/retirement |
| 2. Negative/boundary | PASS — direct `saveTrusted` same-ID incompatible Changes rejected, unproven removal refused, same-id replay and stale predecessor refused |
| 3. State transitions | PASS — valid retention, bounded cursor catch-up, authorized complete reduction before retirement; forbidden downgrade/pairing replacement guarded in production source |
| 4. Retry/recovery | PASS — restart confirms failed tamper/removal changed nothing, explicit backup-first recovery identity tests retained |
| 5. Concurrency/staleness | PASS within deterministic software — expected-revision byte-CAS, no stale cursor overwrite and fork rejection; actual multi-WebView arbitration remains separately deferred |
| 6. Persistence/integrity | PASS — durable batch contents, canonical cursor, BASE, mappings, intents and pairing identity unchanged after refusal; inventory stale after permitted canonical change |
| 7. Identity/security/trust | PASS — vault/device pairing and no-v1.1-downgrade guards, foreign-state recovery refusal |
| 8. API/contracts | PASS — shared immutable-batch invariant across both full-envelope state write APIs, low-level writer and shipping controller |
| 9. Architecture/invariants | PASS — no active inventory cutover, change in provider access, weakening of architecture/repository guards or GitHub Actions |
| 10. E2E/fail-closed | PASS for bounded simulated storage→canonical writers→restart/inventory and recovery; physical device and live Drive/vault testing outside scope |

In particular, the new direct `PersistentSynchronizationStateStore.saveTrusted()` regression writes an actual batch, attempts to replace the existing batch's Changes payload while preserving ID/tokens, attempts unproven removal, checks exact failure status and persistence across a *new store instance*, then verifies legitimate complete-reduction retirement and cursor-only catch-up. It also asserts BASE, mappings, intents, pairing identities and stale-inventory behavior.

**Test-change integrity:** R7→R9 source comparison shows 15 descendant commits, no divergence. Changed production is limited to `src/state/persistent-state-store.ts` (shared invariant and guards); tests were strengthened by 206 additions and one deletion in the existing integration suite. No changes to requirements, semantic validators, repository-check scripts, shipping planner or guard files were found that weaken the acceptance oracle. R8's previous blocked typecheck reflects Builder test TypeScript excess-property errors; they are not retrospectively relabeled PASS.

## Original PHX-CI qualification

- **R9 run:** `f7af01fb-f687-44b0-9e61-e1a0b5bab6d9`
- **Evidence-only commit:** `7aed3813d3bb94c0738aad337a53a77104f26335`
- **Canonical originals:** `dev/test-results/f7af01fb-f687-44b0-9e61-e1a0b5bab6d9/result.md`, `result.json`, `terminal.log`, `dev/_ca-output.md`
- **Pinned PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`.
- Direct examination of original evidence confirms source/tree both match the exact frozen R9 identities; **13/13 required stages PASS**, focused **634/634 PASS**, full product **1338/1338 PASS**, typecheck/build/artifacts/change-set/repository PASS, original exit **0**. `main.js` **927076 bytes**, SHA-256 **`4bde1bad5045ba8f732d6e072b63110aadcb9ab8265d1454bb2a7dd9c860d828`**, according to original recorded build evidence; physical dispatch disabled.
- Evidence commit is exactly one Git child of R9 source SHA and modifies only `dev/_ca-output.md` and three original R9 test-evidence files — no product/test modifications. Prior R1–R7 qualified/blocked evidence and original independent rejection reports remain preserved; R8 `a1f6f798-e02a-4c3d-8f9e-7c49ee13446f` was correctly **BLOCKED** by typecheck (exit 2) before dependent tests ran.

## Nonblocking findings and deferred integration gates

**M-01 — Legacy generic writer remains broad.** The public `saveTrusted(state, expectedRevision?)` contract permits callers to supply arbitrary new cursor values and optionally omit a revision argument. Unlike the shipping cursor helper, it does not independently require the caller's expected opaque-token predecessor. R9's objective is immutable learned-batch facts and pairing preservation; the shipping Changes cursor path already imposes a predecessor fence and CAS revision. Maintain caller-level predecessor audits during full WS-02 integration. This minor finding does **not** indicate that the fixed F-03 same-ID overwrite route remains open.

**M-02 — Real integration boundary.** The original verification uses controlled synthetic IndexedDB, not genuine cross-WebView upgrade races or live pre/post-migration rollback. All-consumer hint routing and scope-owner wiring, inventory-backed planner activation, integrated performance/observation comparisons and full WS-02/DEC-339 cutover remain separate gates. A BU-05 PASS cannot mark them accepted.

**M-03 — Blind information isolation disclosure.** The committed assignment and required handoff/state records exposed Builder-authored status and claimed run summaries incidentally while proving identity. The source-level assessment was derived from the code alone and frozen/published before reading tests, prior independent reports, R8 evidence, or R9 original PHX-CI files.

## Final disposition

**PASS WITH MINOR FINDINGS — BU-05 ACCEPTED** for exactly `0533ab2edc8f8631c72aee5bf5a3b1b23d1beb1b` / `702e8e5d875b31f0f1d9cfb099a06c75b1f9b779`. Builder may close out this bounded BU, retain M-01/M-02 for the larger WS-02 review, and continue only separately approved downstream work. No need to rerun accepted R9 software qualification. This does **not** accept full WS-02 or DEC-339, approve `master`/PR #157 promotion, activate inventory, authorize live IndexedDB migration, Drive/vault/device operations, physical tests, installation, deployment or release.

Reviewer modified only its own review reports and narrowly required handoff recipient/count metadata, and executed no software verification.
