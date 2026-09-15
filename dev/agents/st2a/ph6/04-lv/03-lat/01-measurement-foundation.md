# Phase 6 Latency Optimization — LAT-01 Measurement and Safety Characterization Foundation

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-lat01-measurement-foundation-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-01`

Task classification:

`TEST / MEASUREMENT FOUNDATION`

Your assignment is to create a deterministic, non-flaky measurement foundation for the Phase 6 latency-optimization work. The foundation must make the expensive synchronization pathways measurable by counts, ordering, concurrency, and bounded stage-duration instrumentation without changing synchronization behavior.

This is one bounded build session. Do not implement the optimizations owned by LAT-02 through LAT-05.

---

## 1. Exact Base / Drift Gate

Use exactly:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required branch:

`phase6-latency-opt-01-measurement-foundation`

Before changing anything:

1. Fetch the repository.
2. Verify that `COMMON_BASE_SHA` exists locally.
3. Create the required branch directly from that exact SHA.
4. Record `git rev-parse HEAD` and `git status --short` in the evidence file before implementation.

If you cannot start from that exact SHA, stop. Do not substitute a branch tip.

---

## 2. Governing Architecture and Safety Constraints

Read before editing:

- `dev/planning-and-building/agent-led-software-product-construction-manual.md`
- `dev/agents/stage-1-target-system-specification-and-build-decomposition/stage-1-build-decomposition.md`
- `src/local/obsidian-local-vault.ts`
- `src/product/snapshot-assembler.ts`
- `src/core/execution-coordinator.ts`
- `src/product/authoritative-production-executor-base.ts`
- `src/product/authoritative-production-executor.ts`
- `src/local/local-vault-access-boundary.ts`

The latency program must preserve all existing synchronization-safety semantics, especially:

- LOCAL / REMOTE / BASE reconciliation authority;
- fail-closed ambiguity and incomplete observation;
- exact precondition and stale-observation rejection;
- durable intent/effect lifecycle and recovery;
- persistence/semantic CAS authority;
- SHA-256/content-integrity verification;
- duplicate and topology safety;
- conflict preservation;
- destructive-operation gates;
- no normal mutation while recovery authority is unresolved.

Do not modify those semantics in LAT-01.

Also preserve all existing OAuth and diagnostic behavior. In particular, do not remove, rename, merge, or repurpose the diagnostic authorization/browser functions or their UI controls, including prepared authorization, prepared launch, external-browser probe, delayed external-browser probe, or the independence of production and diagnostic prepared-launch state.

Do not change the current mobile lifecycle cancellation/background behavior in this work package. That is a separate Phase 6 repair.

---

## 3. Problem to Characterize

Phase 6 live validation has shown that very small vaults and very small file transfers can take multiple seconds even when byte transfer is trivial. Code inspection identifies several likely contributors:

- local file observation includes a deliberate stability window;
- recursive local enumeration currently performs child inspection serially;
- local reads and stale-token checks can trigger additional observations;
- planning can issue multiple Google Drive metadata requests;
- authoritative operation validation can be repeated around execution;
- local transactional mutation intentionally stages, verifies, persists, commits, and verifies again.

LAT-01 must establish deterministic tests/instrumentation that can prove whether later optimization branches actually reduce redundant work while retaining the required safety boundaries.

---

## 4. Allowed Scope

Prefer test-only changes. Production diagnostic code may be changed only if a small, semantics-neutral stage-timing field/event is necessary and is already consistent with the repository's structured diagnostic architecture.

Expected primary scope:

- a new focused latency-characterization test file, preferably `test/phase6-latency-measurement-foundation.test.ts`;
- existing test helpers or a narrowly scoped new test helper if needed;
- existing diagnostic code only if required for deterministic stage attribution;
- `dev/evidence/_ca-output-agt-p6-latency-opt-01.md`.

Do not modify synchronization algorithms, physical mutation behavior, retry behavior, lifecycle behavior, Drive semantics, state schemas, frozen public contracts, OAuth, or UI behavior.

---

## 5. Required Measurement Coverage

Create deterministic tests or test helpers that can observe at least these categories without relying on real network timing:

1. **Local observation work**
   - number of `observe`/stat-equivalent calls attributable to planning;
   - number of deliberate stability windows entered;
   - whether independent observations are serial or overlapping;
   - repeated observation of the same unchanged path within one logical operation when the existing architecture performs it.

2. **Planning remote work**
   - managed-root validation calls;
   - reconciliation/change-feed calls;
   - repeated remote observation/metadata calls where a stable test fixture can expose them.

3. **Authoritative execution work**
   - number of authoritative precondition-validation passes around one physical operation;
   - state/authority load checkpoints needed to establish the validation boundary.

4. **Local transaction safety checkpoints**
   - stage, verify, persistence, commit, and convergence verification must remain distinguishable so later work cannot "optimize" them away accidentally.

Use counters, deferred promises/barriers, deterministic fake adapters, or existing repository test doubles. Do not use a wall-clock assertion such as "must finish in N milliseconds" as the primary test oracle. CI scheduling variance must not make this suite flaky.

A timing field may be recorded for diagnostics, but correctness assertions should be structural: counts, causal ordering, overlap, and preserved safety checkpoints.

---

## 6. Required Safety Assertions

The LAT-01 tests must make it possible for subsequent optimization work to prove all of the following:

- uncertain/partial observations still fail closed;
- a changed observation token still invalidates stale work;
- a changed remote revision/identity still invalidates stale work;
- no physical mutation begins before the required final authorization boundary;
- durable local transaction stages remain observable and ordered;
- no optimization can claim success merely by skipping integrity verification.

If an existing focused test already provides one of these proofs, reuse it and document the linkage rather than duplicating large test fixtures.

---

## 7. Validation

Install dependencies if necessary with:

`npm ci`

Required validation:

`npm run typecheck`

Compile the test build:

`npx tsc -p tsconfig.test.json`

Run the new focused LAT-01 test and any directly affected existing focused tests with `node --test` against `.test-build/test/...`.

Then run the repository gate:

`npm run check`

All failures must be classified as one of:

- product/test defect introduced by this branch;
- pre-existing repository failure independently reproduced at `COMMON_BASE_SHA`;
- environment/tooling failure.

Do not weaken tests to obtain green results.

---

## 8. Evidence Contract

Create:

`dev/evidence/_ca-output-agt-p6-latency-opt-01.md`

It must contain:

- agent/work-package identity;
- exact base SHA;
- branch name;
- final implementation SHA;
- files changed;
- what each measurement proves;
- baseline structural counts/ordering observed by the deterministic fixtures;
- focused test commands/results;
- full `npm run check` result;
- explicit statement that synchronization semantics and production mutation behavior were not changed;
- any blocker or unresolved measurement gap.

Commit the evidence file with the implementation/test changes.

---

## 9. Hard Prohibitions

Do not:

- optimize production synchronization behavior in this session;
- reduce or remove the local stability requirement;
- cache synchronization evidence across runs;
- parallelize physical mutations;
- remove integrity hashing or final verification;
- weaken CAS/precondition checks;
- modify mobile background/cancellation semantics;
- modify OAuth/PKCE or diagnostic buttons/functions;
- perform live Google Drive mutations;
- perform real-device validation;
- merge to `phase6-integration` or any other shared branch.

---

## 10. Stop / Output Contract

Stop after the branch is committed and all available validation is complete.

Your final response must report, succinctly:

- branch;
- exact final SHA;
- changed files;
- focused-test result;
- full-check result;
- one-sentence description of the measurement foundation;
- any blocker.

Do not continue into LAT-02 or any other optimization work package.
