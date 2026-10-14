# Phase 6 Latency Optimization — LAT-02 Bounded Local Observation Concurrency

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-lat02-local-observation-concurrency-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-02`

Task classification:

`IMPLEMENTATION`

Assignment:

> Reduce local-vault planning latency by allowing independent **read-only local observations** to overlap under one explicit global concurrency bound, while preserving every existing path-safety, stability, uncertainty, deterministic-enumeration, and fail-closed rule. Do not parallelize physical mutations and do not remove the deliberate file-stability observation window.

This is one bounded build session.

---

## 1. Exact Base / Drift Gate

Use exactly:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required branch:

`phase6-latency-opt-02-local-observation-concurrency`

Create the required branch directly from that exact SHA. Record the starting SHA and clean/dirty status in the evidence file before editing.

If the exact base cannot be used, stop. Do not substitute the current tip of `phase6-integration` or another branch.

---

## 2. Required Reading

Before editing, inspect:

- `dev/planning-and-building/agent-led-software-product-construction-manual.md`
- `dev/agents/stage-1-target-system-specification-and-build-decomposition/stage-1-build-decomposition.md`
- `src/local/obsidian-local-vault.ts`
- `src/local/path-policy.ts`
- `src/local/exclusions.ts`
- `src/local/config-policy.ts`
- `test/obsidian-local-vault.test.ts`
- `test/phase6-alpha-ios-adapter-boundary.test.ts`
- `test/phase6-alpha-ios-content-reader.test.ts`
- `test/mobile-safety.test.ts`
- `test/local-failure-semantics.test.ts`

Current production behavior to preserve: file observation uses a deliberate stability interval (`stabilityDelayMs`, default 150 ms) between metadata observations. Enumeration currently awaits child inspection serially. The optimization target is the serial composition of independent read-only observations, not the stability rule itself.

---

## 3. Safety Invariants — Non-Negotiable

Preserve all current synchronization-safety behavior, including:

- every enumerated child must still be normalized and cross-platform validated;
- external-reference/mobile access-boundary checks remain mandatory;
- exclusions and portable-configuration classification remain unchanged;
- file stability must still be established by the existing two-observation rule before a file is represented as stable;
- uncertainty may never be converted to absence;
- a child listed as one entity kind but observed as another must still make enumeration partial/uncertain as it does now;
- repeated/cyclic directory detection remains fail-closed;
- deterministic contents/completeness/uncertainty results must not depend on promise completion order;
- no physical mutation is made concurrent in this task.

Also preserve all OAuth, PKCE, mobile two-tap authorization, and diagnostic browser/prepared-launch buttons/functions. Do not touch mobile lifecycle cancellation/background behavior in this work package.

---

## 4. Required Implementation

Optimize `ObsidianLocalVaultAdapter.enumerate()` so independent read-only child observation can overlap.

Required properties:

1. Use a **single bounded concurrency mechanism for one enumeration**, not unbounded `Promise.all` recursion.
2. The maximum number of concurrently active child-observation units must be explicit and **must not exceed 8**. A lower fixed cap is acceptable if justified in evidence; do not make it user-configurable in this work package.
3. The bound must apply across recursive traversal, not independently per directory in a way that permits multiplicative concurrency.
4. Preserve deterministic output. Results and uncertainty reporting must be ordered by the same stable logical traversal/path ordering regardless of which observation finishes first.
5. Preserve the existing 150 ms default stability interval for every file observation that requires stability proof.
6. Folder recursion may overlap only to the extent safely controlled by the same global bound. No mutation, write, rename, delete, trash, state save, or Drive call may be introduced into the concurrent region.
7. Exceptions/rejections from one child must be captured with the same fail-closed semantics as today; they must not abort collection in a way that hides other independently observed uncertainty unless the existing contract requires global failure.
8. Do not change public/frozen contracts merely to implement the concurrency mechanism. Prefer a private helper/semaphore/work queue.

The implementation should be simple enough to reason about. Avoid a generalized concurrency framework unless the repository already has one that fits exactly.

---

## 5. Required Tests

Add focused tests in `test/obsidian-local-vault.test.ts` or one narrowly named new test file.

Prove deterministically, without fragile wall-clock thresholds:

- two or more independent file observations can be in flight at the same time;
- concurrency never exceeds the chosen bound;
- the stability phase still occurs for every observed file and still requires the second metadata observation;
- deterministic result ordering is preserved even when completion order is intentionally reversed;
- deterministic uncertainty/failure ordering is preserved when several children produce different failures;
- nested directories do not cause concurrency to exceed the global cap;
- a changed file during its stability interval remains unstable/stale exactly as before;
- excluded/unsafe paths remain excluded/blocked as before;
- no local mutation method is invoked by enumeration.

Use barriers/deferred promises/counters where possible. Do not make "elapsed time < N ms" the correctness oracle.

Run the directly affected existing mobile/local safety tests as focused regressions.

---

## 6. Out of Scope / Prohibited

Do not:

- remove or shorten the default stability interval;
- add run-scoped caching/evidence reuse; LAT-03 owns that work;
- change `readFile()`/`assertToken()` evidence-reuse behavior except where absolutely necessary to compile the enumeration refactor;
- change Drive request behavior;
- change authoritative precondition validation;
- parallelize synchronization operations or physical local/remote mutations;
- change durable transaction ordering;
- change state schemas or CAS semantics;
- change conflict/destructive/recovery rules;
- change mobile lifecycle cancellation/background semantics;
- remove/alter OAuth diagnostic controls/functions;
- perform live Drive or device validation;
- merge into shared branches.

If correct bounded concurrency requires a frozen-contract change or substantial cross-layer redesign, stop and report the blocker instead of expanding scope.

---

## 7. Validation

Use:

`npm ci`

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

Run focused tests with `node --test` for the changed/new local-vault tests and directly relevant mobile/local safety tests.

Then run:

`npm run check`

Do not weaken tests to obtain green results. Classify any failure as branch-caused, pre-existing-at-base, or environment/tooling-specific.

---

## 8. Evidence Contract

Create:

`dev/evidence/_ca-output-agt-p6-latency-opt-02.md`

Include:

- exact base SHA;
- branch name;
- chosen global concurrency cap and why;
- final SHA;
- exact changed files;
- concise before/after structural behavior (serial independent observations vs bounded overlap);
- proof that each file still receives the stability check;
- proof that deterministic ordering and fail-closed uncertainty remain intact;
- focused test commands/results;
- full `npm run check` result;
- explicit confirmation that no mutation path, durable-state path, OAuth path, or lifecycle path changed.

Commit code, tests, and evidence.

---

## 9. Acceptance Criteria

Accept only if all are true:

- independent local read-only observations overlap;
- global in-flight observation work is bounded at or below 8;
- no stability proof was removed or weakened;
- outputs remain deterministic under reversed completion order;
- uncertainty remains fail-closed;
- existing safety/mobile tests pass;
- full repository check passes or any unrelated environment failure is independently demonstrated;
- diff remains bounded to this concern.

---

## 10. Stop / Final Response

Stop after committing and validating LAT-02.

Report only:

- branch;
- final SHA;
- concurrency cap;
- changed files;
- focused test result;
- full-check result;
- blockers, if any.

Do not begin LAT-03.
