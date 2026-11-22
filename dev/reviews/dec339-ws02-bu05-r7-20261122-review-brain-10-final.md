# WS-02 / DEC-339 / BU-05 R7 — Independent final adversarial review

**VERDICT: CORRECTION REQUIRED — BU-05 NOT ACCEPTED**  
**Reviewer:** `review-brain-10`  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Review assignment:** `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu05-r7-independent-review-2026-11-22.md`  
**Frozen R7 source SHA:** `c47c88cde35dc827263e3ff7b1366a47bc41acb6`  
**Frozen R7 Git tree:** `12d35229a727377583a134522f34d59a3acdac7c`  
**Incoming state:** `80ede331990a03bc522739166b1beb5f1eeeeb1d`, handoff count 4, recipient REVIEWER  
**Frozen blind assessment:** `dev/reviews/dec339-ws02-bu05-r7-20261122-review-brain-10-blind-source.md`, publication commit `bb9db11319079ab9dbab429aaf295032a9c9291e`.

## F-03 — MAJOR, acceptance-blocking: legacy generic canonical writer can rewrite a durable learned batch

**Exact source:** `src/state/persistent-state-store.ts` `saveTrustedCore()` (lines ~479–504) compared against `saveAuthorityCore()` (lines ~591–640).

The public `PersistentSynchronizationStateStore.saveTrusted(state, expectedRevision)` API accepts an entire v1.1 durable authority envelope as its `TrustedSynchronizationState` argument. It validates the **candidate's internal semantic consistency** and the current byte-CAS revision, but never compares the candidate's existing learned batch IDs and complete change payloads with **currently persisted** batches. The R7 `DurableSemanticStateValidator` checks unique IDs and ordered/cyclic history, not content immutability relative to prior bytes. In contrast, `saveAuthorityCore()` explicitly checks all retained durable batch content/checkpoint identities against the previously stored version and disallows unproven removal.

**Reproducible logical counterexample from the frozen source:**
1. Load a trusted authority document with canonical cursor D, durable batch X for `C→D`, change payload P, and an exact current `stateRevision`.
2. Construct `{ ...loaded.state, learnedRemoteBatches: [ {...batchX, changes: Q} ] }`, with Q a well-formed different remote-change payload and all other state/cursor fields unchanged.
3. Invoke `saveTrusted(candidate, loaded.state.stateRevision)` on the same underlying persisted state. Its internal validator accepts the now internally consistent single `C→D` edge; the CAS sees the expected current bytes and can commit **Q in place of P for existing batch ID X**.
4. A later restart now treats Q as previously learned history, silently losing original P despite unchanged batch identity. Similarly, removing a nonreduced learned batch can bypass the stricter `saveAuthorityCore` retirement check when the remaining state is internally valid.

This violates the R7 assignment's explicit **generic authority-CAS-path bypass-resistance** and existing durable batch identity/content immutability requirements. The shipping `commitTrustedCursorWithCas()` invokes `saveTrusted`, so the method is part of the active canonical update surface. Neither a second device nor live provider interaction is required.

**Required Builder correction:** enforce the same existing-batch immutability and proven-retirement rules on *all canonical write APIs* that accept a v1.1 authority envelope, including `saveTrustedCore()`. Preserve existing legitimate cursor-only `saveTrusted` transitions, current-state identity/version/CAS checks, atomic inventory invalidation and recovery behavior. Avoid a second conflicting policy implementation: share a narrowly scoped invariant helper with `saveAuthorityCore` if appropriate. Add an adversarial regression that creates a truly durable learned batch, then calls **direct `PersistentSynchronizationStateStore.saveTrusted`** with current CAS revision but changed `changes`, same batch ID and tokens; it must refuse and leave original bytes, BASE, mapping, cursor, intents and inventory untouched. Also cover unproven batch removal, valid cursor-only commit and valid authorized batch retirement through its designated path. Freeze a new exact source and requalify with substantive PHX-CI.

## Historical blocking findings R4 F-01 and F-02 — CLOSED in R7's normal authority pathways

- **R4 F-01 (conflicting cursor edge persisted before rejection):** `product-controller.ts` calculates the validated durable frontier, requires new batch starting token exactly at that frontier, checks the proposed complete history before `saveAuthority`. `inspectDurableCursorHistory` rejects multiple outgoing/incoming edges, cycles, disconnected components and out-of-order batch arrays; the semantic validator rechecks all history on authority persistence. Tests in `tests/integration/dec339-indexeddb-transaction-integration.test.ts` around lines 849–990 cover fork, detached edge, ordering, unchanged persistent backlog/cursor/BASE/intents and recoverable continuation. **Correction established.**
- **R4 F-02 (same-ID same-endpoint different payload accepted):** `durableRemoteChangeBatchSemanticallyEquivalent` compares all ordered remote Changes and relevant checkpoint identity; `snapshot-assembler.ts` creates a deterministic SHA-256 batch ID from canonical starting/terminal tokens and changes, excluding the CAS persistence revision. The controller, low-level batch API and `saveAuthorityCore` reject incompatible replay. Tests around lines 991–1139 vary change path, remote ID, content and advisory metadata while keeping IDs/endpoints fixed; legitimate identical replay is idempotent. **Correction established for those pathways.** F-03 identifies a **distinct generic canonical writer bypass**, so this is not acceptance of the entire immutable-durable-batch contract.

## Other source observations and nonblocking qualifications

The low-level `appendLearnedRemoteBatch()` accepts new advancing batches only if their predecessor equals the *canonical* cursor, whereas the controller accepts the validated durable frontier when the canonical cursor lags. This may intentionally restrict the low-level writer to a narrower atomic cursor+batch transition. That asymmetry is **M-01, nonblocking** unless later integration relies on the direct API for pending-chain continuation; document the intended caller contract and test it when integrating.

The existing pairing/vault identity guards, backup-first `replaceRecoveryState()`, canonical cursor CAS predecessor protection, v2-aware local IndexedDB inventory invalidation, legacy planner and no live inventory activation remain intact. No new physical operations are authorized.

## Original PHX-CI evidence — genuinely PASS, not independent acceptance

**Run:** `ba32978e-3536-43bf-8b0a-4ffb4e456c22`  
**Evidence-only publication:** `aa773cf65c5724182273c28cd603b97ef4a358a1`  
**Original evidence:** `dev/test-results/ba32978e-3536-43bf-8b0a-4ffb4e456c22/result.md`, `result.json`, `terminal.log` and `dev/_ca-output.md`  
**Pinned runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`

Independently opened original Markdown, JSON and full terminal log after the blind report was published. All **13/13 stages PASS**, focused **634/634 PASS**, product **1336/1336 PASS**, typecheck/build/artifacts/change-set/repository PASS, exit 0, physical dispatch disabled. Original `main.js`: **926008 bytes**, SHA-256 `6825b343e8dfc38bdceda66b86dddeacc59f2fce6b773db349074036ff64531b`. Expected and verified HEAD/tree exactly match frozen R7 source/tree. Evidence commit is its **direct child**, with changed files restricted to `dev/_ca-output.md` and the three run evidence files; no production or test modification by evidence publication. R4→R7 Git comparison is ahead 36, behind zero; changes to production/contracts/tests align with R4 findings. Historical R1 partial PASS, R2 and R3 BLOCKED, R4 PASS then independent reject, R5 and R6 BLOCKED, and R7 PASS remain distinct and preserved.

**Test-change integrity:** R7 adds substantive adversarial tests and stronger semantic validators; no change weakening repository/script guards found in R4→R7 changed-file comparison. However, R7 tests explicitly test generic **`saveAuthority`** immutability (line ~1101), **not the separate `saveTrusted` full-envelope API**, leaving F-03 untested. Passing tests do not disprove F-03.

## Ten-family independent adequacy

| Family | Verdict |
| --- | --- |
| 1. Nominal | PASS: valid linked Changes learning, cursor catch-up, idempotent replay |
| 2. Negative/boundary | GAP/BLOCKER: direct `saveTrusted` incompatible learned-batch overwrite/removal is not refused |
| 3. Legal/illegal transitions | GAP/BLOCKER: generic trusted-state writer bypasses immutable-batch transition |
| 4. Retry/recovery | PASS for tested restart through durable frontier; corrupted-pairing backup-first recovery and intent retention preserved |
| 5. Concurrency/staleness | PASS for tested stale cursor/learned-batch CAS and fork guards; genuine cross-WebView arbitration remains a separate WS-02 gate |
| 6. Persistence/integrity | GAP/BLOCKER: persisted Changes evidence can be rewritten under existing ID through `saveTrusted` |
| 7. Identity/security/trust | PASS for tested exact vault/device/recovery pairing fences, subject to F-03 record trust |
| 8. API/contracts | GAP/BLOCKER: different public state-write APIs enforce inconsistent existing-batch invariants |
| 9. Architecture/invariants | PASS: no new planner or unauthorized inventory cutover; fixed guards and existing BVP budget PASS |
| 10. End-to-end/fail-closed | PARTIAL: controller and authority paths tested, untested generic canonical write can corrupt historical evidence |

## Final disposition

**CORRECTION REQUIRED** on R7 frozen source `c47c88cde35dc827263e3ff7b1366a47bc41acb6` because of F-03. The previous R4 F-01/F-02 corrections are substantively closed; Builder should narrowly repair F-03 and test this exact bypass without rebuilding unrelated work. After a new qualified source SHA/tree and original PHX-CI PASS, a **new Builder → independent Reviewer** handoff is required. Do not alter historical evidence or weaken test oracles.

This finding is **not** covered by the Owner's DEC-363 narrow provider concurrent-write risk exception; it is a deterministic local durable-history integrity bypass. BU-05, full WS-02 and DEC-339 remain unaccepted/incomplete. This review grants no master/PR #157 merge, inventory activation, live migration, Drive/vault/device/physical operation, installation, promotion or release. Reviewer made no production, test, fixture, script or original evidence changes and ran no software validation.

**Blind separation disclosure:** The R7 assignment/feature state and neutral planning embed Builder status/evidence summaries, incidentally visible during handoff/source grounding. No authored R7 tests, original PHX-CI logs or history/diffs were opened until after publication of the independent blind report `bb9db11319079ab9dbab429aaf295032a9c9291e`.
