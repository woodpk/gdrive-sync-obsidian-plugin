# LAT-02 — Bounded Local Observation Concurrency Evidence

## Start state

- Exact base SHA: `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`
- Branch: `phase6-latency-opt-02-local-observation-concurrency`
- Starting status: `CLEAN` — the newly created branch was verified identical to the exact base (`ahead_by=0`, `behind_by=0`, no changed files) before product/test edits.

## Implementation evidence

- Final implementation SHA before evidence closure: `42785a535b8c0f8802269df55b324287b27f45f7`.
- Chosen global concurrency cap: `4` child-observation units per enumeration.
- Rationale: four provides material overlap while remaining conservatively below the required maximum of eight and preserves resource headroom for iOS/mobile runtimes. The mechanism is one small private enumeration-scoped work queue rather than a generalized concurrency framework.
- Changed files:
  - `src/local/obsidian-local-vault.ts`
  - `test/obsidian-local-vault-concurrency.test.ts`
  - `dev/evidence/_ca-output-agt-p6-latency-opt-02.md`
- Before: `enumerate()` awaited each independent child observation and recursive folder traversal serially.
- After: one `BoundedAsyncWorkQueue` is created for the enumeration and admits at most four active child-observation units across the complete recursive traversal. Folder descendants re-enter the same queue, so concurrency cannot multiply per directory.
- Determinism: every queued child receives a hierarchical traversal-order key derived from the adapter's logical folder/file order. Observations and failure/uncertainty records are sorted by those keys before the listing is returned, so promise completion order cannot reorder `entries`, `uncertainties`, or the composed partial-completeness reason.
- Fail-closed behavior remains in place: child path normalization/cross-platform validation occurs before observation; exclusions remain unchanged; the access boundary remains mandatory; listed-kind/observed-kind mismatch still marks the path/subtree uncertain; malformed/failed listings and repeated directories remain partial/uncertain rather than becoming absence; unexpected queue-task rejection is retained and surfaced after already-started independent work drains rather than being converted to a successful complete listing.
- Stability proof is unchanged in production: `stabilityDelayMs` still defaults to `150` ms, and every file `observe()` still performs the existing first metadata observation, waits the stability interval, performs the second metadata observation, and reports stable only when both observations agree. The focused tests prove two metadata observations occur per file and that an mtime change between them still produces `stability: "unstable"`.
- The concurrent region performs only enumeration/access/stat observation work. No local write, append, rename, remove, trash, mkdir, FileManager mutation, Drive request, durable-state save, OAuth/PKCE path, or mobile lifecycle cancellation/background behavior was changed or introduced into it.

## Validation evidence

Validation was executed in the repository's GitHub Actions environment because the available local shell could not resolve GitHub. The draft validation PR was used only to trigger the existing Phase 6 verification workflow and was not merged.

Validated implementation SHA: `42785a535b8c0f8802269df55b324287b27f45f7`.

GitHub Actions run: `34847152787` / job `103985778753`.

Required/stronger checks:

- `npm ci`: **PASS**.
- `npm run typecheck`: **PASS**.
- `npx tsc -p tsconfig.test.json`: **PASS**.
- Node test execution: **PASS**. Repository `npm test` compiles the test project and executes `node --test .test-build/test/*.test.js`, so the run exercised the new focused LAT-02 test file and the complete existing suite in the same Node test runner.
- Focused LAT-02 cases: **PASS** — six deterministic tests prove overlapping independent file observations, cap enforcement at four, two-observation stability proof and stale/unstable classification, completion-order-independent result ordering, completion-order-independent failure/uncertainty ordering, one global cap through nested recursion, preserved exclusion/unsafe-path behavior, and zero mutation API use during enumeration.
- Directly relevant existing regressions: **PASS** as part of the complete Node test run, including `test/obsidian-local-vault.test.ts`, `test/phase6-alpha-ios-adapter-boundary.test.ts`, `test/phase6-alpha-ios-content-reader.test.ts`, `test/mobile-safety.test.ts`, and `test/local-failure-semantics.test.ts`.
- Existing Phase 6 focused regression steps in the workflow: **PASS**.
- `npm run build`: **PASS**.
- `npm run check`: **PASS**. This independently reran typecheck, the complete compiled Node test suite, and production build.
- `git diff --check`: **PASS**.

No branch-caused, pre-existing-at-base, or environment/tooling-specific validation failure remains. No live Drive/device validation was performed.

## Scope confirmation

Final base-to-implementation diff is bounded to the local enumeration concurrency implementation, its focused tests, and this evidence record. No mutation path, durable-state path, Drive request path, authoritative precondition path, OAuth/PKCE/diagnostic-control path, or mobile lifecycle cancellation/background path changed. LAT-03 work was not started.

Blockers: none.
