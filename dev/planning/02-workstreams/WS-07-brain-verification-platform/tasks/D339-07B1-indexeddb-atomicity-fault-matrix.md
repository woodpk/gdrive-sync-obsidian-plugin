# DEC-339 / D339-07B1 — IndexedDB Generation, Cursor, and Crash-Atomicity Fault Matrix

## 0. Assignment identity, exact sources, and maturity

- **Agent:** `agt-brain-dec339-d339-07b1-idb-crash-cursor-01`.
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin` only.
- **Workstream/unit:** WS-07 / D339-07B1, the bounded first child of D339-07B.
- **Task classification:** IMPLEMENTATION — TEST-ONLY.
- **Maturity:** EXECUTABLE AFTER exact immutable task-prompt commit binding supplied by supervisor; do not substitute a moving planning ref.
- **Exact source/base (accepted predecessor):** `e14b25273321cd1d603ac7bc02996d97d8fc4ce9`, the D339-07A/corrective-suite-alignment PHX-CI published evidence commit.
- **Required already-created source branch:** `dec339/d339-07b1-idb-crash-cursor-01`, initially at that exact base commit. Check branch head before editing; never silently substitute a later tip.
- **Accepted implementation tested:** `59ceba8b71bd5f59436793d192c07d9e4581d086`, PHX-CI run `bdc80034-567e-4411-bb5d-9494ca6868a1`, 11/11 stages COMPLETE/PASS, artifact `main.js` SHA-256 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`.
- **Fixed work-package scope:** prove previously underexercised crash/cursor/lineage behavior of the *existing* inventory storage and authoritative publication implementation. Do not make source behavior changes in this task.

## 1. Required grounding / authority

Read at the **exact source commit** before implementation:

1. `AGENTS.md`, DEC-339 governing decision and target specification §7.9, `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md` §§4–6, 8, 10–11, especially findings A01/A02/A08 in `dev/reviews/dec339-inventory-architecture-adversarial-review-2026-10-10.md`.
2. WS-07 `03-BUILD-DECOMPOSITION.md` D339-07 and `04-VERIFICATION-PLAN.md`, BVP frozen lock `dev/authority/governance/locks/testing-platform-boundary.yaml`, D339-07A accepted evidence.
3. `test/dec339-indexeddb-transaction.test.ts` **all fixture/test definitions**, notably `FakeDatabase`, `withRangeOnly`, `seeded`, `candidate`, `simulatedBaseline`, `simulatedDelta` and D339-04B tests at the end of that file. Identify which fault boundaries existing tests already prove and add only missing decisive counterexamples.
4. Production behavior being challenged: `src/state/indexeddb-inventory-storage.ts` `stage/openRead/publishAtomically`, `src/state/indexeddb-inventory-authority-storage.ts` `read/write/compareAndSwap`, `src/state/verified-inventory-integration.ts` `publishBaseline/publishIncremental`, and `src/state/persistent-state-store.ts` `saveTrusted/saveAuthority/appendLearnedRemoteBatch/prepareInventoryAuthorityPublication`. Treat their actual signatures and transactions as authoritative; do not invent test-only product APIs.
5. The **complete original** connected `agent-led-software-engineering-operating-protocol` and agent-led construction manual; re-fetch the original protocol **immediately before editing this test file**, including §§19, 21.1, 27.1, 35.1, 37.1. If unavailable, STOP before test authoring.

## 2. Test implementation contract

**One writable tracked file only:** MODIFY `test/dec339-indexeddb-transaction.test.ts`. The currently embedded deterministic fake may be minimally extended **inside that same file** to support realistically ordered transaction-abort and CAS-failure injection; its atomic rollback must remain faithful to IndexedDB transactional all-or-nothing behavior. It is a PHX-CI-executed test fixture, not a new verification framework. Do not create a second fake storage implementation.

Within a target of **5–8 concise, independently failing new tests** and **≤220 net new logical lines**, prove as many of the following *real source-connected* cases as the existing seam permits:

1. **Abort at the commit boundary** (A02): staged or partially executed replacement never advances either the active generation pointer or canonical/learned Changes cursor. Inject a genuine transaction-abort/constraint/error before completion; reopen via the production `IndexedDbInventoryObservationStore` and production `PersistentSynchronizationStateStore` and show exact old pair remains. An exception by itself is **not** proof of rollback.
2. **Race with an ordinary trusted/authority writer** (A02): during/around a staged generation publish, exercise the available `saveTrusted` and/or `saveAuthority` and `appendLearnedRemoteBatch` guards, confirming that no API can leave active inventory paired with the wrong cursor/semantic generation. Assert exact persisted old-or-new pair, never merely a returned status.
3. **Multi-generation ancestry** (A01): publish a complete baseline then at least **two** COW deltas, pin an older reader across publication, mask or replace an older stable-ID row; verify newest reader walks the ancestor chain and does not re-expose masked historical rows, while the already-open reader retains its earlier coherent view. Unknown ancestry/partial masks fail closed.
4. **Restart and upgrade compatibility** (A08): after a v1→v2 upgrade, exercise the version-aware reader and legacy open, distinguishing safe v1 fail-closed `VersionError` from successful v2 canonical reads. A blocked upgrade, versionchange condition or attempted v1 rollback cannot cause deletion/reset/re-pair. Do not claim old-version binary rollback support not actually implemented.
5. **Fault classification and state preservation:** if an injected IndexedDB transaction fault or authority CAS invalidates a publication, verify no new durable learned-batch state, no generation advancement, no misleading `verified-observation` about an incomplete candidate, and preserved pending durable intents where observable.

**No falsified parity:** if an explicit required fault cannot be modeled using the existing fake without changing product or framework code, report **UNPROVEN / REQUIRES SEPARATE REPAIR OR SCOPE** with exact missing seam. Never assert PASS solely by type-casting or mocking a production `publishAtomically` success response. Do not infer physical Google Drive, device memory or global visibility claims from these tests.

## 3. Immutable scope boundary

- **Writable source:** `test/dec339-indexeddb-transaction.test.ts` only.
- **Read-only:** all production `src/**`, BVP `test-platform/**`, every other existing test, `dev/authority/**`, `dev/scripts/**`, PHX-CI config/runtime, releases, `main.js`, user or Google Drive state.
- **Evidence:** PHX-CI alone may publish its normal `dev/_ca-output.*` and `dev/test-results/**` to the task branch; never edit PASS records by hand.
- **Size / stop:** if adding a realistic fault mechanism requires more than the stated ≤220 logical LOC, modifying another file, or relaxing a production check, stop and return a grounded smaller corrective task. This is NOT a product-repair authorization.
- **Feature flag:** inventory/targeted optimization stays disabled by default; no plugin installation, live Drive/vault operation, mutation, S09A canary, Stage 3, D339-08 or independent feature review.

## 4. Exclusive PHX-CI verification and acceptance

When complete, commit/push test-only changes on the dedicated branch, then use the installed pinned PHX-CI runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83` against exact source HEAD and base `e14b25273321cd1d603ac7bc02996d97d8fc4ce9`, in a disposable `C:\temp-<new-32hex-GUID>\` workspace preserving the user's checkout.

Focused selection MUST non-trivially compile and execute `test/dec339-indexeddb-transaction.test.ts` through PHX-CI's Node/TypeScript adapter, with the related `test/dec339-remote-reader.test.ts` and original D339-07A focused tests if feasible in one request; run standard PHX-CI full typecheck, full product tests, BVP suite/architecture/repository check, build, approved exact shipping digest and artifact checks. Never introduce GitHub Actions, ad hoc validators, a second test runner or a diagnostic script outside PHX-CI.

The owner's launcher must receive all applicable Section 19 pre-/post-print audits and a Section 37.1 rerun check. Preserve a failed run's complete evidence, classify substantive failures from tooling/administrative ones, and do not request an administrative-only rerun.

**Pass boundary:** exact tested source SHA, full canonical PHX-CI PASS, complete evidence commit/run ID and case outcomes; all new tests truly executed, existing invariants remain intact, and unproven cases identified. An observed production defect is **BLOCKED_PRODUCT_DEFECT**, requiring a separate precisely scoped production corrective assignment, not weakening assertions or widening this file's allowlist.

## 5. Handoff

Report exact source/evidence identities, new cases, demonstrated old/new cursor pairs, any unproven A01/A02/A08 case and next 07B child. D339-07B is not complete after 07B1: provider/Changes faults (A05/A06), planner/effect comparisons, D339-07C matched-workload performance and D339-08 integrated independent-review/rollout decisions remain outstanding.
