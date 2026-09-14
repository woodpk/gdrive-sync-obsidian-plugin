# Phase 6 Latency Optimization — LAT-03 Run-Scoped Local Evidence Reuse

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-lat03-run-scoped-local-evidence-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-03`

Task classification:

`IMPLEMENTATION`

Assignment:

> Reduce repeated local observation/stability work after LAT-02 by safely reusing already-established local evidence only within its exact validity boundary. Reuse must be tied to exact observation identity/generation and must never replace the live checks that authorize a physical mutation or prove a final committed result.

This is one bounded build session. It begins only after LAT-02 is complete.

---

## 1. Self-Resolving Predecessor Gate

Frozen common ancestor:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required predecessor branch:

`phase6-latency-opt-02-local-observation-concurrency`

Required predecessor evidence:

`dev/evidence/_ca-output-agt-p6-latency-opt-02.md`

Required branch for this session:

`phase6-latency-opt-03-run-scoped-local-evidence`

Do **not** ask the operator for a predecessor SHA. Resolve it yourself:

1. `git fetch origin phase6-latency-opt-02-local-observation-concurrency`
2. Resolve the fetched remote-tracking branch tip to `LAT02_HEAD`.
3. Verify `COMMON_BASE_SHA` is an ancestor of `LAT02_HEAD` with `git merge-base --is-ancestor`.
4. Verify the predecessor evidence file exists at `LAT02_HEAD` with `git cat-file -e`.
5. Inspect that evidence and confirm LAT-02 reports its required focused/full validation rather than a blocker.
6. Create `phase6-latency-opt-03-run-scoped-local-evidence` directly from `LAT02_HEAD`.

If any gate fails, stop. Do not substitute another branch, base, or manually supplied SHA.

---

## 2. Required Reading

Inspect at minimum:

- `src/local/obsidian-local-vault.ts`
- `src/local/local-vault-access-boundary.ts`
- `src/product/canonical-local-vault.ts`
- `src/product/production-executor.ts`
- `src/product/authoritative-production-executor-base.ts`
- `src/product/snapshot-assembler.ts`
- the LAT-02 implementation and tests;
- `test/obsidian-local-vault.test.ts`
- `test/phase6-alpha-ios-content-reader.test.ts`
- `test/workstreams/local/local-transaction-safety.test.ts`
- `test/workstreams/local/local-recovery-matrix.test.ts`.

The current local observation token is a stale-precondition mechanism. Treat it as authority to compare against current state, not as permission to assume the filesystem cannot change.

---

## 3. Safety Rule for This Optimization

The optimization may remove **redundant proof work**, but it may not remove **mutation-boundary proof**.

Evidence reuse is allowed only when all of these are true:

- it is scoped to the current adapter/run evidence lifetime and never persisted as new authority;
- it is keyed by exact path plus exact observation identity/token and any relevant local generation;
- any local create/modify/delete/rename event affecting that path invalidates the reusable evidence immediately;
- lifecycle disposal/reinitialization invalidates it;
- it is never reused across plugin/runtime restart;
- it is never used to bypass an exact live check immediately before a physical mutation;
- it is never used to bypass final post-mutation verification;
- uncertainty or inability to prove validity falls back to the existing conservative path.

If you cannot meet those conditions without changing frozen contracts or introducing ambiguous authority, stop rather than weaken safety.

---

## 4. Required Optimization Target

Inspect the exact LAT-02 code and identify repeated local work within a single planning/execution flow, especially patterns where:

- `enumerate()` has already established a stable observation;
- `readFile(path, expectedToken)` or another read path immediately re-establishes the same stability proof;
- `assertToken()` or content-reading helpers re-observe unchanged local state multiple times before any mutation boundary;
- the same exact stable observation is requested repeatedly by read-only planning logic.

Implement the smallest private mechanism that avoids redundant stability waiting/read-only observation while preserving exact stale detection.

Preferred approach, if supported by the code after inspection:

1. Reuse an exact stable observation only for subsequent **read-only** work while the token/generation is still demonstrably current.
2. When an expected observation token is already known, a cheap current-token/stat/generation comparison may replace a second full stability window for read-only access if that comparison is sufficient to prove the original stable observation has not changed.
3. Keep live verification before physical mutation and after physical commit exactly intact.
4. Keep canonical SHA-256 content proof where the architecture requires it.

Do not introduce a TTL-based cache whose correctness depends primarily on elapsed time.

Do not cache Google Drive evidence in this work package.

---

## 5. Required Tests

Add deterministic focused tests proving:

- an already-stable unchanged path does not pay the same redundant stability proof repeatedly during the allowed read-only reuse window;
- exact same-path/same-token evidence can be reused only while its local generation/evidence identity remains current;
- modify, create, delete, and rename events invalidate affected reusable evidence;
- a mismatched token or changed stat falls back/fails stale rather than reusing old evidence;
- a change that occurs between stable observation and byte read is still detected;
- a change that occurs during byte streaming is still detected under the existing content-source safety rules;
- local transaction precondition verification still performs a live check before physical commit;
- final committed content is still reread/hashed/verified where required;
- no cache/reuse survives adapter disposal/reinitialization;
- LAT-02 bounded-concurrency behavior remains intact.

Use counters/barriers rather than timing thresholds. Include a test that would fail if the implementation reused stale evidence to authorize a write.

---

## 6. Explicitly Preserve These Expensive Checks

Do not optimize away:

- SHA-256 verification of staged content when required by the transaction contract;
- exact expected-target verification before commit;
- final content verification after rename/swap;
- durable local-transaction persistence checkpoints;
- stale-observation rejection;
- final convergence verification;
- recovery reconstruction checks.

The goal is to avoid repeated *equivalent read-only observation/stability work*, not to reduce durable mutation safety.

---

## 7. Out of Scope / Prohibited

Do not:

- change remote/Drive metadata behavior;
- change authoritative precondition-validation layering; LAT-04 owns that;
- parallelize physical mutations;
- change state schemas or durable lifecycle ordering;
- persist a new cache;
- cache evidence across runs/restarts;
- weaken path/exclusion/collision policies;
- modify lifecycle cancellation/background semantics;
- modify OAuth/PKCE/mobile two-tap auth or diagnostic authorization/browser controls;
- perform live Drive/device tests;
- merge shared branches.

---

## 8. Validation

Run:

`npm ci`

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

Run focused LAT-03 tests plus directly affected local/mobile transaction tests with `node --test`.

Then run:

`npm run check`

If the full gate fails, independently classify whether the failure is branch-caused, pre-existing, or environment-specific. Do not hide failures.

---

## 9. Evidence Contract

Create:

`dev/evidence/_ca-output-agt-p6-latency-opt-03.md`

Record:

- resolved `LAT02_HEAD`;
- proof it descends from `COMMON_BASE_SHA`;
- this branch name;
- final SHA;
- changed files;
- exact reusable-evidence validity boundary;
- exact invalidation events;
- structural before/after observation/stability counts from deterministic tests;
- explicit list of mutation-boundary and final-verification checks that remain live;
- focused and full validation results;
- any unresolved safety concern.

Commit implementation, tests, and evidence.

---

## 10. Acceptance Criteria

Accept only if:

- redundant read-only local stability/observation work is measurably reduced in deterministic tests;
- stale local changes remain detectable;
- no persisted/cross-run cache exists;
- no physical mutation is authorized from cached evidence alone;
- stage/final integrity verification remains intact;
- LAT-02 concurrency remains bounded and deterministic;
- relevant safety tests and full repository gate pass.

---

## 11. Stop / Final Response

Stop after LAT-03 is committed and validated.

Report succinctly:

- resolved LAT-02 SHA;
- branch;
- final SHA;
- changed files;
- before/after structural observation count;
- focused/full test status;
- blocker, if any.

Do not continue into integration or another optimization work package.
