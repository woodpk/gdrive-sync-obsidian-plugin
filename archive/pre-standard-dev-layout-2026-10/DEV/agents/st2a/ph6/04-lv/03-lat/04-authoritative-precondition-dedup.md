# Phase 6 Latency Optimization — LAT-04 Authoritative Precondition Deduplication

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-lat04-authoritative-precondition-dedup-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-04`

Task classification:

`IMPLEMENTATION / SAFETY-SENSITIVE OPTIMIZATION`

Assignment:

> Remove redundant authoritative precondition-validation work performed for the same operation while preserving one exact, fail-closed validation boundary as close as practicable to physical-effect authorization/dispatch. The optimized path must reject any stale LOCAL, REMOTE, BASE, identity, revision, or semantic-authority evidence exactly as safely as the current path.

This is one bounded build session. Do not combine it with local-enumeration or remote-planning optimizations.

---

## 1. Exact Base / Drift Gate

Use exactly:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required branch:

`phase6-latency-opt-04-precondition-dedup`

Create the branch directly from `COMMON_BASE_SHA`. Record exact starting SHA and status before changes. If the exact base is unavailable, stop.

---

## 2. Required Reading

Before editing, inspect the complete call chain for one planned physical operation:

- `src/core/execution-coordinator.ts`
- `src/core/execution-coordinator-base.ts`
- `src/product/authoritative-production-executor.ts`
- `src/product/authoritative-production-executor-base.ts`
- `src/product/production-executor.ts`
- `src/product/operation-isolation.ts`
- `src/product/synchronization-adapters.ts`
- `src/state/persistent-state-store.ts`
- relevant frozen execution/synchronization contracts under `src/contracts/`.

Inspect focused tests:

- `test/phase2-execution.test.ts`
- `test/workstreams/orchestration/v1.2-authoritative-boundary.test.ts`
- `test/workstreams/orchestration/v1.2-authoritative-commit-lifecycle.test.ts`
- `test/workstreams/orchestration/v1.2-production-authority-path.test.ts`
- `test/workstreams/orchestration/v1.2-production-lifecycle-composition.test.ts`
- `test/workstreams/local/local-transaction-safety.test.ts`
- `test/phase6-b-destructive-safety.test.ts`.

At the frozen base, `AuthorityCompleteExecutionCoordinator.executeOperation()` performs authoritative precondition validation and the production authoritative executor validates again on its `execute()` path. Confirm the exact behavior before changing it.

---

## 3. Core Safety Requirement

This optimization is acceptable only if **validation work is deduplicated without widening the time-of-check/time-of-use authority window in a way that can authorize stale mutation**.

The resulting design must satisfy all of these:

1. Exactly one authoritative validation result is relied upon to authorize a normal physical operation.
2. That validation must include all currently required LOCAL/REMOTE/BASE/identity/revision/semantic-generation authority.
3. Any state/authority generation or observation evidence that changes before physical authorization must cause stale/block/recovery behavior, never mutation under old authority.
4. If the implementation must await between validation and physical dispatch, any evidence whose validity can change across that await must either remain protected by an exact token/CAS/lease guarantee or be rechecked narrowly at the dispatch boundary. A narrow dispatch guard is allowed; duplicating the entire validation pipeline is not the target state.
5. Durable intent persistence, effect authorization, physical-result classification, integrity verification, canonical commit, and finalization remain unchanged in meaning and ordering.
6. Destructive operations retain every existing destructive/recovery checkpoint.

Do not trade safety for a lower validation count.

---

## 4. Required Implementation Outcome

Refactor the private orchestration/executor composition so that the same full precondition set is not evaluated twice for one unchanged operation.

Constraints:

- Prefer a private/internal composition change. Do not alter frozen public contracts unless the existing repository explicitly marks the affected contract as extensible and the change is demonstrably backward-compatible. If a frozen-contract change appears necessary, stop and report instead.
- Preserve existing diagnostic lifecycle meaning. If precondition-validation diagnostics currently fire twice solely because of duplication, normalize them so the trace accurately represents the single authoritative validation and any narrower dispatch guard.
- Preserve result taxonomy (`valid`, `stale`, `blocked`, `recovery-required`, etc.).
- Preserve all operation kinds, including no-op authority handling, upload/download create/update, moves, clean merge, and trash paths.
- Do not change retry behavior.
- Do not cache a successful validation for later runs.

A valid implementation may use a private one-shot validated-operation context/token or another internal mechanism, but it must be impossible to accidentally reuse that authority for another operation or later run.

---

## 5. Required Adversarial Tests

Add focused tests that prove both the optimization and its safety.

At minimum prove:

- a normal physical operation no longer executes the same full authoritative validation pipeline twice;
- an unchanged valid operation still succeeds;
- LOCAL observation/token changes before authorization prevent mutation;
- REMOTE revision/object identity changes before authorization prevent mutation;
- BASE/semantic generation changes before authorization prevent mutation;
- a deliberately injected change at the closest possible validation-to-dispatch race point cannot produce mutation under stale authority;
- stale/recovery cases do not persist a new physical effect as if validation had succeeded;
- destructive operation gates remain intact;
- durable-intent/effect lifecycle ordering is unchanged;
- diagnostics do not falsely report a successful validation after a stale dispatch guard fails.

Use spies/counters/barriers to demonstrate **one full validation pass** rather than relying on elapsed time.

If removing one pass exposes a race that cannot be closed without repeating the whole validation, stop and document that result. Do not force the optimization through.

---

## 6. Scope Boundaries

Expected production scope is limited to the authority-complete execution coordinator/executor composition and directly necessary tests/diagnostics.

Do not modify:

- local enumeration/concurrency;
- local stability interval;
- Drive reconciliation/change-feed planning;
- state schemas;
- physical transaction algorithms except a narrowly necessary dispatch guard;
- retry/backoff semantics;
- conflict resolution;
- mobile lifecycle/background cancellation behavior;
- OAuth/PKCE/two-tap auth;
- the prepared-authorization diagnostic helper or any diagnostic browser/auth buttons/functions.

Do not parallelize operations or physical effects.

---

## 7. Validation

Run:

`npm ci`

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

Run the directly affected focused orchestration/authority/destructive-safety tests with `node --test`.

Then run:

`npm run check`

Classify all failures accurately. Never weaken a stale-authority or destructive-safety test to obtain a pass.

---

## 8. Evidence Contract

Create:

`dev/evidence/_ca-output-agt-p6-latency-opt-04.md`

Include:

- exact base SHA;
- branch name;
- final SHA;
- changed files;
- a concise before/after call-chain description;
- deterministic count showing duplicate full validation was removed;
- exact final authority/dispatch guard that remains;
- results of race/stale-authority tests;
- confirmation durable lifecycle and destructive gates were not weakened;
- focused-test and full-check results;
- any reason the optimization had to be reduced or rejected for safety.

Commit implementation, tests, and evidence.

---

## 9. Hard Stop Conditions

Stop rather than broadening scope if:

- safety requires a frozen-contract redesign;
- the only way to reduce validation is to trust stale evidence across an unprotected await;
- destructive/recovery semantics would need to change;
- unrelated failing architecture must be redesigned.

A safe conclusion of "duplicate validation cannot yet be removed under the current contract" is preferable to an unsafe implementation.

---

## 10. Final Response

After committing and validating, report succinctly:

- branch;
- final SHA;
- changed files;
- before/after full-validation count;
- focused/full test status;
- whether the final dispatch authority boundary remained fail-closed;
- blocker, if any.

Do not begin integration or another latency work package.
