# LAT-04 Authoritative Precondition Deduplication — Final Evidence

- Agent: `agt-ca-p6-lat04-authoritative-precondition-dedup-01`
- Branch: `phase6-latency-opt-04-precondition-dedup`
- COMMON_BASE_SHA: `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`
- R1_INPUT_SHA: `22c7df6f1c879ff790eb546b319c5bfd232335da`
- Validated implementation SHA: `0fc054de17432544c146182f7f651e0800e3e22f`
- Final evidence-closure SHA: reported externally after this evidence commit; a Git commit cannot contain its own final hash without changing that hash.

## Final base-to-head changed-file manifest

- `src/core/execution-coordinator.ts`
- `src/product/authoritative-production-executor-base.ts`
- `src/product/authoritative-production-executor.ts`
- `src/product/operation-isolation.ts`
- `test/workstreams/orchestration/lat04-authoritative-precondition-dedup.test.ts`
- `test/phase6-log07-end-to-end-observability-verification.test.ts`
- `dev/evidence/_ca-output-agt-p6-latency-opt-04.md`

Temporary `.github/workflows/lat04-branch-validation.yml`, `dev/evidence/_lat04-typecheck-debug.txt`, `dev/evidence/_lat04-fullcheck-debug.txt`, and `dev/evidence/_lat04-focused-debug.txt` were removed before final validation and are absent from the final base-to-head diff.

## Before / after authority validation

Before LAT-04, the normal production composition performed two full authority-complete precondition validations for one unchanged physical operation: coordinator validation followed by production-executor validation. LAT-04 reduces the deterministic count from **2 -> 1**. The single surviving full pass is the production executor's `validateExact()` path at its `execute()` boundary.

After durable effect authorization, LAT-04 retains a narrower dispatch guard over volatile ordinary evidence (LOCAL observation/token/content stability and applicable REMOTE revision/object/path evidence). The guard does not rerun BASE/identity/semantic authority resolution. Persisted semantic generation is separately checked by the durable dispatch-authorization CAS boundary. Guard rejection is persisted/classified as verified-not-applied/non-applied where required, never as successful mutation.

## Reject/Fix 02 diagnostic correction

The rejected LAT-04 tree skipped coordinator-owned full validation for the optimized production executor, as intended, but a throw from the surviving executor-owned validation fell into the generic execute catch and was misclassified as later content mutation. The correction restores the generic coordinator validation try/catch for non-marker executors and adds a private one-shot execute-boundary throw-provenance handoff for optimized production executors. Only the exact exception thrown during executor-owned precondition validation is consumable as `operation-precondition-validation-failed`; pending-journal, content-mutation, uncertain-state-journal, and commit exceptions retain their prior exact stages. The frozen public `AuthoritativeSynchronizationExecutor` contract is unchanged.

A dedicated LAT-04 regression proves the execute-boundary validation throw produces `operation-precondition-validation-failed:threw`, does not produce `content-mutation-failed:threw`, performs one full validation pass, and causes zero physical mutation.

## LOG07 retained-trace fixture correction

Exact common-base verification showed LOG07-S1 passes unchanged at `COMMON_BASE_SHA`. LAT-04's required dispatch-edge volatile-evidence observation adds legitimate Drive trace records that exceed S1's previous test-only 500-record trace capacity and evict the genuine early `operation-start` record. Only the S1 production-update fixture is configured to retain 1000 records. LOG07-S11 remains unchanged and continues proving the ordinary 500-record retention bound. No LOG07 event/stage assertion was removed, renamed, relaxed, or otherwise weakened; production diagnostic retention behavior is unchanged.

## Safety verification

Focused verification confirms: unchanged valid execution succeeds; one full validation pass; LOCAL token drift prevents mutation; REMOTE revision drift prevents mutation; REMOTE object-identity drift prevents mutation; semantic-generation drift fails closed; the closest validation-to-dispatch race cannot mutate under stale authority; stale/recovery cases do not persist a new physical effect as success; destructive gates remain intact; clean-merge guard handling remains intact; durable intent -> dispatch authorization -> physical classification/verification -> canonical commit/finalization ordering remains intact; and diagnostics do not falsely report successful validation after guard failure.

## Final validation

Executed after temporary workflow/debug-file removal on the exact implementation tree:

- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- focused LAT-04 + authority + destructive-safety + Phase 6 exact-stage diagnostic + LOG07 suite: PASS
- `npm run check`: PASS
- `git diff --check 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7..HEAD`: PASS on final closure SHA

No public execution contract, stale-authority assertion, destructive-safety assertion, retry/backoff semantics, conflict semantics, local enumeration/concurrency, Drive planning, lifecycle/background behavior, OAuth/PKCE behavior, prepared-authorization helper, or browser diagnostic control was weakened or redesigned.
