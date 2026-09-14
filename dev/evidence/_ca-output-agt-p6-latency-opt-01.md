# LAT-01 Measurement and Safety Characterization Foundation — Evidence

## Identity and scope

- Agent: `agt-ca-p6-lat01-measurement-foundation-01`
- Work package: `LAT-01`
- Classification: `TEST / MEASUREMENT FOUNDATION`
- Branch: `phase6-latency-opt-01-measurement-foundation`
- Common base: `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`
- Continuation / frozen failing SHA: `177b4d29f60c1ddae1749b65720b944332c1b9b0`
- Corrected implementation/test SHA used for closure validation: `c2ca3d35a73dc64c7c1193e598d0386355d740a1`
- Corrected-head closure validation: GitHub Actions run `34881736002`, job `104102409466`

The frozen common-base-to-`177b4d29...` diff contained only `test/phase6-latency-measurement-foundation.test.ts`; no production synchronization source was modified. Temporary workflow files used solely to reproduce/validate this work are removed before final branch closure and are not part of the intended final manifest.

The exact final branch commit SHA is reported by the supervisor-visible final execution report after this evidence file and the temporary-validation files are committed/removed; a Git commit cannot contain its own resulting SHA without a circular hash dependency.

## Exact reproduced failure at `177b4d29...`

Supervisor-authorized frozen-SHA reproduction explicitly checked out `177b4d29f60c1ddae1749b65720b944332c1b9b0`, ran `npm ci`, `npm run typecheck`, `npx tsc -p tsconfig.test.json`, and then:

```text
node --test .test-build/test/phase6-latency-measurement-foundation.test.js
```

The first failing test was:

```text
LAT-01 local enumeration measures exact observation work and proves independent file observations are serial
```

Exact structural mismatch:

```text
actual:   { exists: 2, stat: 4, list: 1, stabilityWindows: 0 }
expected: { exists: 2, stat: 4, list: 1, stabilityWindows: 2 }
```

The compiled stack location was `.test-build/test/phase6-latency-measurement-foundation.test.js:119:12`.

The next LAT-01 test exposed the same fixture defect for an unchanged read boundary: the observed `exists`, `stat`, and `list` counts matched, while `stabilityWindows` was `0` rather than `2`.

Frozen focused reproduction artifact/run: run `34881029401`; focused artifact `lat01-frozen-177b4d29-focused`. The full-suite reproduction at the same frozen SHA reproduced the same first failure.

### Causal classification

**LAT-01 fixture defect, not a production synchronization defect.**

The measurement adapter used a one-based per-path stat counter:

```ts
const call = (statCalls.get(raw) ?? 0) + 1;
statCalls.set(raw, call);
```

but attempted to count completed two-stat stability windows with the impossible predicate:

```ts
if (call % 2 === 2) {
```

Modulo 2 can only yield 0 or 1, so the fixture's `stabilityWindows` counter could never increment. Production `ObsidianLocalVaultAdapter.observe` performs the structural sequence `first stat -> stability delay -> second stat`; therefore every even one-based stat call completes exactly one stability window.

### Bounded correction

The only LAT-01 test correction was:

```diff
-if (call % 2 === 2) {
+if (call % 2 === 0) {
```

Correction commit: `c2ca3d35a73dc64c7c1193e598d0386355d740a1`.

No elapsed-time threshold was introduced and no expected production behavior was weakened.

## Deterministic structural measurement baselines

### LOCAL observation / stability

For enumeration of the two deterministic file entries `a.md` and `b.md`:

- `exists = 2`
- `stat = 4`
- `list = 1`
- completed stability windows = `2`
- `a.md` completes its stability window before observation of `b.md` begins, characterizing the current independent-file observation path as serial.

For `observe(a.md)` followed by `readFile(a.md, first.observationToken)` with unchanged content:

- `exists = 2`
- `stat = 4`
- `list = 0`
- completed stability windows = `2`

This captures the current repeated observation work at the local read boundary rather than caching it away.

### Planning / REMOTE work

Full assembly baseline:

- remote identity acquisition = `1`
- managed-root validation = `1`
- trusted/canonical state load = `1`
- start cursor acquisition = `1`
- local enumeration = `1`
- full reconciliation listing = `1`
- LOCAL enumeration and REMOTE reconciliation listing are structurally overlapped before either listing is released.

Incremental assembly baseline with a trusted cursor:

- remote identity acquisition = `1`
- managed-root validation = `1`
- trusted/canonical state load = `1`
- local enumeration = `1`
- terminal change-page traversal = `1`
- start cursor acquisition = `0`
- full reconciliation listing = `0`

### Authoritative execution

For the measured production-authoritative upload-create path, immediately before the first physical `createReserved` dispatch:

- authority loads = `8`
- authority saves = `2`
- identity/canonical-state loads = `3`
- legacy physical-precondition validation passes = `2`

After successful canonical commit/finalization:

- authority loads = `13`
- authority saves = `4`
- identity/canonical-state loads = `5`
- legacy physical-precondition validation passes = `2`
- physical dispatches = `1`

A separate LAT-01 stale-final-authorization measurement asserts `stale-precondition` and zero physical execution/mutation.

### Production call-chain basis

The counts above characterize, rather than redesign, the existing authoritative call chain. `AuthorityCompleteExecutionCoordinator` loads authoritative and canonical/identity state, resolves authority-complete operation evidence, invokes authoritative precondition validation, executes only after successful validation, reloads canonical/authority readiness around commit, commits canonical state, and finalizes durable effects. The production executor's durable lifecycle adds the existing intent persistence, dispatch-authorization, physical-result/effect-verification, and finalization authority checkpoints. These repeated loads/validations are intentionally frozen as a LAT-01 baseline for later optimization work; LAT-01 does not eliminate or reorder them.

## Safety-evidence linkage

The following existing assertions were inspected and were run in the corrected-head focused safety command.

1. **LOCAL stale observation/token rejection** — `test/obsidian-local-vault.test.ts`, test `expected observation token rejects stale local versions before consumption`: obtains an observation token, changes the target mtime, and asserts `readFile(..., first.observationToken)` rejects with `LocalStaleObservationError`.

2. **Reviewed first-sync LOCAL stale evidence blocks REMOTE mutation** — `test/phase6-a03-first-sync-conflict-resolution-authority.test.ts`, test `C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation`: changes LOCAL after the reviewed conflict, asserts the resolution is rejected, and asserts `updateCalls` remains empty.

3. **REMOTE revision and identity invalidation** — the same A03 suite, test `C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation`: independently changes the revision or replaces the remote identity, then asserts rejection and zero remote update calls for both variants.

4. **BASE / semantic-generation stale authority** — `test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts`, test `D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed`: an intent carrying a stale semantic generation returns `recovery-required`. `test/workstreams/orchestration/v1.2-authoritative-boundary.test.ts` also asserts unavailable exact BASE convergence authority returns `recovery-required` before validation/execution.

5. **Validation-to-dispatch stale evidence prevents mutation** — `v1.2-authoritative-boundary.test.ts`, test `D authoritative coordinator isolates stale exact precondition before physical execution`: a `stale` precondition result becomes `stale-precondition`, with executor execution count `0` and committer count `0`. `v1.2-production-authority-path.test.ts` further asserts an independent REMOTE observation disagreement vetoes mutation.

6. **Durable dispatch ordering and uncertain-effect recovery** — `test/workstreams/orchestration/v1.2-mutation-lifecycle.test.ts`: the mutation lifecycle asserts durable intent persistence and `dispatch-authorized` precede dispatcher invocation, uncertain post-dispatch outcomes remain durable, restart does not blindly redispatch, and canonical state commit requires the exact durable verification reference.

7. **LOCAL transaction ordering and integrity verification** — `test/workstreams/local/local-transaction-safety.test.ts`: corrupt staged bytes are blocked before target displacement; successful create stages/verifies before commit; replace rechecks authoritative/canonical old bytes even when the observation token is unchanged; contradictory recovery returns `outcome-unknown` rather than guessing.

8. **Canonical commit / durable-effect finalization ordering** — `test/workstreams/orchestration/v1.2-authoritative-commit-lifecycle.test.ts`: canonical BASE/state commit observes effects at `effect-verified`, only then finalizes them as `state-committed`; stale canonical CAS leaves the effect at `effect-verified`; restart after canonical commit does not repeat the semantic commit.

9. **Final convergence verification** — `test/workstreams/orchestration/v1.2-effect-verified-convergence.test.ts`: restart with durable `effect-verified` evidence re-observes physical convergence; divergent physical reality returns `recovery-required`, performs zero redispatch, performs zero canonical save, and preserves the prior verification evidence.

10. **Destructive/recovery gates** — `test/phase6-b-destructive-safety.test.ts`: reconstructed/untrusted state makes destructive work suspicious and approval/recovery-gated; approval is scoped to an exact reviewed plan/checkpoint; stale device state injects the destructive safety gate rather than silently executing.

## Corrected-head validation results

GitHub Actions run `34881736002`, job `104102409466`, explicitly checked out corrected implementation/test SHA `c2ca3d35a73dc64c7c1193e598d0386355d740a1` and completed successfully.

Commands/results:

- `npm ci` — **PASS**
- `npm run typecheck` — **PASS**
- `npx tsc -p tsconfig.test.json` — **PASS**
- `node --test .test-build/test/phase6-latency-measurement-foundation.test.js` — **PASS**
- Focused safety command covering the ten suites listed below — **PASS**
- literal `npm run check` — **PASS**
- literal `git diff --check 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7..HEAD` — **PASS**

Focused safety compiled paths executed:

```text
.test-build/test/obsidian-local-vault.test.js
.test-build/test/phase6-a03-first-sync-conflict-resolution-authority.test.js
.test-build/test/workstreams/orchestration/v1.2-authoritative-boundary.test.js
.test-build/test/workstreams/orchestration/v1.2-durable-intent-recovery.test.js
.test-build/test/workstreams/orchestration/v1.2-production-authority-path.test.js
.test-build/test/workstreams/orchestration/v1.2-mutation-lifecycle.test.js
.test-build/test/workstreams/orchestration/v1.2-authoritative-commit-lifecycle.test.js
.test-build/test/workstreams/orchestration/v1.2-effect-verified-convergence.test.js
.test-build/test/workstreams/local/local-transaction-safety.test.js
.test-build/test/phase6-b-destructive-safety.test.js
```

After this evidence commit and temporary-workflow cleanup, final-head verification is performed separately against the resulting clean LAT-01 SHA so the final branch does not retain validation infrastructure.

## Scope / semantic confirmation

- No production synchronization source was modified by LAT-01.
- No synchronization, authority/CAS, destructive-safety, recovery, local-stability, mutation, or mobile lifecycle semantics were changed.
- OAuth/PKCE behavior is unchanged.
- `Prepare Google authorization (diagnostic)`, `Launch prepared authorization (diagnostic)`, `Test external browser`, `Test delayed external browser`, and their prepared-launch diagnostic functionality are unchanged.
- No live Google Drive mutation or real-device validation was performed.
- LAT-02 through LAT-05 were not begun.
- Temporary GitHub Actions workflows were validation infrastructure only and are removed from the final common-base-to-branch manifest.
