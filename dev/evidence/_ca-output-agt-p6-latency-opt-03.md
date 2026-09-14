# Phase 6 LAT-03 — Run-Scoped Local Evidence Reuse Evidence

## Identity and predecessor gate

- Agent: `agt-ca-p6-lat03-run-scoped-local-evidence-01`
- Work package: `LAT-03`
- Branch: `phase6-latency-opt-03-run-scoped-local-evidence`
- Frozen common ancestor: `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`
- Approved predecessor: `LAT02_HEAD = abe4e85b953e2871cae5c2f2e214d721a25007d1`
- Continuation input: `CONTINUATION_SHA = 8dae25d3ea620f4fb676b46e72f9fda7fc361e25`
- Continuation preserved the accepted LAT-03 optimization and repaired only the confirmed asynchronous invalidation defect.

## Final changed-file manifest

The exact LAT-02-to-final-work delta contains only:

- `src/local/obsidian-local-vault.ts`
- `test/obsidian-local-vault-evidence-reuse.test.ts`
- `dev/evidence/_ca-output-agt-p6-latency-opt-03.md`

Temporary GitHub Actions validation/helper files were removed or restored byte-for-byte and are absent from the final LAT-02-to-HEAD diff.

## LAT-03 optimization and validity boundary

The adapter retains a private in-memory stable-observation record only for read-only reuse. Reuse requires the same adapter instance, exact normalized path, exact expected observation token, exact observation epoch, exact local generation, exact cached proof identity, and a fresh live `adapter.stat()` whose file kind/size/mtime still match the cached stable observation. The exact token is recomputed from the current stat and current generation.

The reusable evidence is private runtime memory only. It is never serialized, persisted, promoted into synchronization authority, shared across runtime restart, or used as physical-mutation authority. No TTL or elapsed-time assumption participates in correctness.

## Continuation 02 confirmed defect

At `CONTINUATION_SHA`, `reusableReadOnlyObservation()` checked the cached epoch/token and generation before awaiting `adapter.stat(key)`, then accepted the returned metadata using the generation captured before that await.

That left an asynchronous invalidation window: a `modify`, `create`, `delete`, `rename`, lifecycle/epoch transition, or a new observation epoch could clear/replace the cache and/or advance generation/epoch while the stat promise was pending. If the returned filesystem metadata still matched the old stat, the pre-await cached observation could be returned even though its proof had been invalidated during the live check.

## Continuation 02 repair

The repair keeps the existing single-stat read-only fast path but re-establishes proof validity after the asynchronous stat completes and before cached evidence can be returned.

Reusable evidence is now revalidated on **both sides of the asynchronous `adapter.stat()` boundary**.

After `await adapter.stat(key)`, reuse requires all of the following to remain true:

- `this.observationEpoch === cached.epoch`;
- `this.generationFor(path) === cached.generation`;
- `this.reusableStableObservations.get(key) === cached`, proving the exact cached proof object is still the current entry rather than one cleared/replaced during the await;
- the live stat is still a file and matches the cached stat;
- recomputing `statToken(key, currentStat, currentGeneration)` equals the expected token.

If any post-await condition fails, the old proof is not reused and execution falls back to the existing conservative full observation/token path. Cache cleanup is conditional on the entry still being the same captured proof, so an asynchronously installed newer valid entry is not accidentally deleted.

No lock, TTL, persisted cache, public contract, mutation-authority change, or LAT-02 concurrency change was introduced.

## Invalidation preserved

Reusable evidence continues to be invalidated by:

- a new observation epoch;
- local `create`, `modify`, and `delete` events;
- `rename` for both old and new paths;
- descendant invalidation when an affected path is an ancestor of cached paths;
- generation mismatch;
- changed/missing/failed live stat proof;
- lifecycle transitions including `vault-ready`, `suspend`, `resume`, and `unload`;
- explicit adapter disposal;
- adapter/plugin/runtime reinitialization.

## Deterministic race coverage

`test/obsidian-local-vault-evidence-reuse.test.ts` now contains a one-shot promise/barrier around the next path `stat()` call. The tests do not rely on sleeps or timing thresholds.

Continuation 02 adds deterministic proof for:

1. **Generation invalidation during pending stat** — establish stable reusable evidence, block the fast-path stat, fire same-path `modify` without changing returned metadata, release the stat, and prove the old proof is rejected. The operation falls back to the full two-stat path and rejects the stale token.
2. **Epoch/cache replacement during pending stat** — block the old fast-path stat, begin a new enumeration epoch that can preserve the opaque token while replacing the cache proof, release the old stat, and prove the pre-epoch cached object is not returned. A fresh conservative observation is required.
3. **No resource fetch before stale rejection** — block the read/content stale-check stat, invalidate generation while pending, release it, and prove stale rejection occurs before any resource fetch begins.
4. **Unchanged fast path remains optimized** — the existing structural test still proves unchanged same-token reads use one live stat rather than another two-stat stability window.
5. **Mutation boundary remains live** — the existing mutation test still proves cached read-only evidence cannot authorize the physical replacement and that full mutation-boundary observation checks execute before displacement.

Existing tests continue to cover create/modify/delete/rename invalidation, changed-stat fallback, changes before byte consumption, changes during streaming, disposal/reinitialization, and bounded LAT-02 concurrency.

## Structural observation reduction retained

For one stable enumeration followed by two unchanged same-token read-only admissions:

- pre-LAT-03: 2 enumeration stats + 4 repeated proof stats = **6 stats**;
- LAT-03: 2 enumeration stats + one live stat per repeated proof = **4 stats**.

Continuation 02 does not change that optimized unchanged path. It only closes the invalidation race around the asynchronous live stat.

## Mutation and final-verification safety preserved

The following remain unchanged and live:

- `ObsidianLocalVaultAdapter.assertToken()` performs a full fresh observation and is not routed through reusable read-only evidence;
- mutation precondition checks before staging/commit;
- the immediate pre-displacement token check;
- staged SHA-256 verification;
- exact expected-target verification;
- final committed-content reread/hash verification;
- durable local-transaction persistence/checkpoint ordering;
- stale-observation rejection;
- recovery reconstruction and contradiction checks;
- final convergence verification;
- LAT-02 bounded local observation concurrency;
- Drive/remote behavior and authoritative execution layering.

The diagnostic authorization/browser surfaces and prepared-launch behavior remain untouched, including Prepare Google authorization (diagnostic), Launch prepared authorization (diagnostic), Test external browser, and Test delayed external browser.

## Continuation 02 validation

Validation-only GitHub Actions run: `34897529360`
Job: `104155257419`
Validation head: `b248ed9fea6c62a2855816d6403d219fe799e905`
Clean repaired implementation/test commit: `2dfee1ca1622f10fae18b5cd44e0468835874944`
Post-validation workflow-restored pre-evidence head: `00f2c77f28df94622298b45a09dab19cf807e981`

Results:

- `npm ci` — **PASS**
- `npm run typecheck` — **PASS**
- `npx tsc -p tsconfig.test.json` — **PASS**
- complete `npm test` — **PASS**
- focused LAT-03 reusable-evidence tests — **PASS**
- LAT-02 bounded-concurrency tests — **PASS**
- existing local-vault stale-token tests — **PASS**
- iOS content-reader tests — **PASS**
- local transaction safety tests — **PASS**
- local recovery matrix — **PASS**
- retained C1 and diagnostic/OAuth/browser/export focused regressions — **PASS**
- production build — **PASS**
- `npm run check` — **PASS**
- `git diff --check abe4e85b953e2871cae5c2f2e214d721a25007d1..HEAD` — **PASS**
- artifact identity and CI evidence upload — **PASS**

The temporary exact-validation workflow was restored to predecessor blob `8fe7a10cc82cbaafb2f07d1f6d20dc85e87da52b` after the successful run and is not in the final diff.

## Validation-infrastructure note

An initial temporary patch-helper attempt failed before changing product source because its exact multiline source matcher did not find the target. The failure was confined to validation/patch infrastructure and was corrected by a bounded method-level matcher. The successful repair commit is `2dfee1ca1622f10fae18b5cd44e0468835874944`.

A later formatting-only helper also failed before changing product source and was removed. It did not alter the validated implementation, tests, or final permanent diff.

## Final safety assessment

No unresolved LAT-03 safety concern remains from Continuation 02. The asynchronous invalidation race is closed: reusable evidence must remain the same exact epoch/generation/cache proof before and after the awaited live stat, or the fast path fails conservative.

Final validated implementation/test SHA: `2dfee1ca1622f10fae18b5cd44e0468835874944`.
The branch-head commit containing this evidence record is the LAT-03 Continuation 02 closure SHA reported by the agent in its final response.
