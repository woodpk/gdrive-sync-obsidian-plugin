# Phase 6 LAT-03 — Run-Scoped Local Evidence Reuse Evidence

## Identity and predecessor gate

- Agent: `agt-ca-p6-lat03-run-scoped-local-evidence-01`
- Work package: `LAT-03`
- Branch: `phase6-latency-opt-03-run-scoped-local-evidence`
- Frozen common ancestor: `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`
- Resolved predecessor branch: `phase6-latency-opt-02-local-observation-concurrency`
- Resolved `LAT02_HEAD`: `abe4e85b953e2871cae5c2f2e214d721a25007d1`
- Predecessor ancestry proof: GitHub compare reported merge base `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7` for the frozen common base versus `LAT02_HEAD`.
- Required predecessor evidence was read at `LAT02_HEAD`: `dev/evidence/_ca-output-agt-p6-latency-opt-02.md`. It reported required LAT-02 focused/full validation as PASS and no blocker.
- Final implementation/test tree before this evidence-only commit: `a3d55db1c0840aef27802e5b54387db6590e0f5e`.

## Changed files

Implementation delta from exact `LAT02_HEAD` before this evidence-only closure contained exactly:

- `src/local/obsidian-local-vault.ts`
- `test/obsidian-local-vault-evidence-reuse.test.ts`

This evidence file is the only additional closure artifact:

- `dev/evidence/_ca-output-agt-p6-latency-opt-03.md`

A temporary validation-only edit to `.github/workflows/phase6-alpha-diagnostic-ci.yml` was used to run the exact focused LAT-03 set and was then restored byte-for-byte to its predecessor blob (`8fe7a10cc82cbaafb2f07d1f6d20dc85e87da52b`). It is not part of the LAT-03 implementation delta.

## Implemented optimization and validity boundary

The adapter now retains a private in-memory stable-observation record only for read-only reuse. Reuse requires all of the following to match at the moment of use:

- the same adapter instance;
- the current observation epoch;
- the exact normalized vault path;
- the exact expected observation token;
- the exact current local generation for that path;
- a fresh live `adapter.stat()` whose file kind, size, and advisory mtime still match the stable observation;
- recomputation of the exact observation token from that current stat and generation.

When those conditions hold, an expected-token read-only operation can replace another complete two-stat stability window with the single current-stat comparison. If the reusable proof is absent, mismatched, changed, inaccessible, or otherwise uncertain, the path falls back to the prior conservative full observation/token check.

The reusable evidence is private runtime memory only. It is not serialized, persisted, added to synchronization state, or shared across adapter/plugin/runtime restart.

## Invalidation

Reusable evidence is invalidated conservatively by:

- the start of a new local enumeration/observation epoch;
- an Obsidian `create` event affecting the path;
- an Obsidian `modify` event affecting the path;
- an Obsidian `delete` event affecting the path;
- an Obsidian `rename` event for both the old path and new path;
- descendant invalidation when an affected path is an ancestor of cached paths;
- any local generation mismatch;
- any failed/missing/changed live stat comparison;
- lifecycle transitions emitted by the adapter (`vault-ready`, `suspend`, `resume`, `unload`);
- explicit adapter disposal;
- adapter/plugin/runtime reinitialization naturally creates a new empty evidence map.

No TTL or elapsed-time assumption participates in correctness.

## Deterministic structural observation reduction

`test/obsidian-local-vault-evidence-reuse.test.ts` measures adapter stat calls rather than elapsed time.

For one unchanged file followed by two repeated same-path/same-token read-only admissions:

- pre-LAT-03 structure: initial stable enumeration = 2 stats; each expected-token `readFile()` re-ran the full two-stat stability proof = 4 more; total = **6 stat calls**;
- LAT-03 structure: initial stable enumeration = 2 stats; each expected-token `readFile()` performs one fresh current-stat comparison = 2 more; total = **4 stat calls**.

Therefore each repeated unchanged read-only proof changes from **2 stats + one stability window** to **1 live stat + no repeated stability window**, a 50% reduction in stat calls for that proof while retaining a live current-state comparison.

The same single-stat read-only proof is used for bounded content-stream stale checks while its exact token/generation/stat identity remains current; uncertainty immediately falls back to the conservative path.

## Mutation-boundary and final-verification checks explicitly preserved

LAT-03 does not use reusable evidence as mutation authority.

The following remain live/unoptimized:

- `ObsidianLocalVaultAdapter.assertToken()` still performs a fresh full `observe()` rather than the read-only reuse helper.
- `replaceFile()` still invokes that live `assertToken()` before staging and again immediately before target displacement.
- The LAT-03 test captures the target stat count at the first physical displacement and proves the path-validation observation plus both mutation `assertToken()` checks retain their complete two-stat proofs (6 target stats before rename).
- Local transactional `verifyExpectedTarget` logic remains unchanged and continues to establish authoritative current target state at commit time.
- SHA-256 verification of staged content remains unchanged.
- Exact expected-target canonical content verification before commit remains unchanged.
- Final target reread/hash verification after rename/swap remains unchanged.
- Durable local-transaction persistence/checkpoint ordering remains unchanged.
- Recovery reconstruction and contradiction checks remain unchanged.
- Canonical evidence cache-bypass behavior remains unchanged.
- Final convergence verification remains unchanged.

## Focused deterministic coverage

New LAT-03 tests prove:

- unchanged same-token evidence reduces repeated read-only observation work structurally;
- create/modify/delete generation events invalidate same-path evidence;
- rename invalidates both source and destination evidence;
- changed stat evidence is not reused and falls back to stale rejection;
- a change after read admission but before byte consumption is rejected before resource fetch;
- a change during byte streaming remains stale-detected;
- cached read-only evidence cannot authorize a write and full mutation-boundary checks remain live;
- disposed/reinitialized adapters cannot inherit reusable evidence.

The focused cloud command also directly executed:

- `test/obsidian-local-vault-evidence-reuse.test.ts`
- `test/obsidian-local-vault.test.ts`
- `test/phase6-alpha-ios-content-reader.test.ts`
- `test/obsidian-local-vault-concurrency.test.ts`
- `test/workstreams/local/local-transaction-safety.test.ts`
- `test/workstreams/local/local-recovery-matrix.test.ts`

This retains the LAT-02 bounded-concurrency regression coverage and the existing transaction/final-verification/recovery safety matrix.

## Validation results

### Exact focused/full Phase 6 validation

Validation-only GitHub Actions run: `34888947084`
Job: `104126478392`
Validated implementation source/tests plus a temporary CI-only focused-test step; the temporary workflow edit was subsequently reverted with no implementation/test change.

Results:

- `npm ci` — PASS
- `npm run typecheck` — PASS
- `npx tsc -p tsconfig.test.json` — PASS
- `npm test` / full top-level automated suite — PASS
- focused LAT-03 + local/mobile transaction/recovery + LAT-02 concurrency `node --test` command — PASS
- directly retained Phase 6 focused suites — PASS
- `npm run build` — PASS
- `npm run check` — PASS
- `git diff --check` — PASS
- artifact identity step — PASS
- evidence/artifact upload step — PASS

### Independent exact-tree CI confirmation

Phase 1 CI run: `34888763674`
Job: `104125884041`
Head: `a34fe59985d46f9926abdb9250683ae580c208ca`

The tree at that head is the same implementation/test tree restored at final implementation commit `a3d55db1c0840aef27802e5b54387db6590e0f5e` after the temporary validation workflow was removed. Results:

- dependency install — PASS
- typecheck — PASS
- complete configured test command — PASS
- production build — PASS

### Local execution environment limitation

A direct local-shell clone attempt failed before repository checkout with:

`Could not resolve host: github.com`

This was classified as environment-specific network/DNS unavailability, not a branch or product failure. Repository-accessible GitHub Actions performed the required executable validation instead. The failure was not hidden or counted as a product pass/fail result.

## Safety assessment

No unresolved LAT-03 safety concern was found.

Reusable evidence remains read-only, exact-token/generation/stat scoped, event/lifecycle invalidated, non-persistent, and fail-conservative. Physical mutation authorization and final committed-result verification continue to use live authoritative checks.
