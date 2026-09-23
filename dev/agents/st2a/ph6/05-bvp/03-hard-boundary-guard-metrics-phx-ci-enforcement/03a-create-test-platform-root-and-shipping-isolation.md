# BVP-S03A — Create test-platform root and prove production shipping isolation

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** EXECUTABLE  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement  
**Exact accepted predecessor / implementation input SHA:** `376ab75477c863cceb63ff82475f352a8f4ec4cc`  
**Required branch:** `bvp-s03a-test-platform-root-isolation`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

BVP-S02 is accepted and closed. Its integrated S02 implementation was verified by PHX-CI and closed at the exact predecessor above. This child begins P1/S03 and owns only the initial physical `test-platform/**` root plus a minimal build/test smoke surface and proof that the ordinary production bundle remains exclusive.

Do not implement the architecture guard, metrics, PHX-CI repository-check wiring, simulator, runner, scenario DSL, evidence engine, live-device agent, or any production validation seam in this child.

## 1. Objective

Create the smallest useful top-level `test-platform/**` TypeScript build/test skeleton outside production `src/**`, and prove the existing ordinary production build remains unchanged and does not ship that platform code.

Required end state:

> A separate `test-platform/**` root exists and can compile/run one trivial smoke test; production `main.js` still builds only from `src/main.ts`, retains the accepted S02 artifact hash, and contains no test-platform sentinel or dependency; no runner/simulator or production seam exists.

## 2. Exact Base / Drift Gate

`S03A_INPUT_SHA = 376ab75477c863cceb63ff82475f352a8f4ec4cc`

The executable prompt is persisted on a later supervisor tasking commit. Before editing:

1. fetch/prune origin;
2. verify `S03A_INPUT_SHA` is an ancestor of current `origin/phase6-integration`;
3. verify every path changed after `S03A_INPUT_SHA` on `phase6-integration` is under `dev/**` only;
4. hard-stop if any post-input change exists under `src/**`, `test/**`, `test-platform/**`, `package.json`, `package-lock.json`, `tsconfig*.json`, `scripts/**`, Taskfiles, `phx-ci.json`, or another executable/build surface;
5. create `bvp-s03a-test-platform-root-isolation` from exactly `S03A_INPUT_SHA`, not from the later tasking tip.

If any gate fails: **BLOCKED. Do not adapt.**

## 3. Supervisor-Verified Current Repository State

At exact `S03A_INPUT_SHA`:

- `test-platform/**` has zero entries;
- `src/validation/**` has zero entries;
- `src/diagnostics/production-diagnostic-correlation.ts` is absent;
- `package.json` Git blob = `c42d0ad9ac6b161db881de291a718aad7095994a`;
- `tsconfig.json` Git blob = `843a728e1f241899eb689e54a027543223477e91`;
- `tsconfig.test.json` Git blob = `aa974e4cfc0af6d4e9c11ebd32538e6db19adfb0`;
- `scripts/build.mjs` Git blob = `d6f37b93e708e3888aa2827da9bb41229d5cc183`;
- `scripts/verify-build.mjs` Git blob = `6265f6c207228a7336091584b19eaa0bce7505dc`;
- `phx-ci.json` Git blob = `249de042bd0985473028e8da755ee71473f7fe25`;
- accepted S02 production artifact: `main.js` size `872862` bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`;
- ordinary production build entrypoint is exactly `src/main.ts`;
- root `tsconfig.json` includes only `src/**/*.ts` and `test/**/*.ts`, so `test-platform/**` is not part of ordinary production typecheck;
- BVP architecture guard and metrics scripts do not yet exist by design; they belong to 03B/03C.

## 4. Exact Writable Surface

Only these paths are writable:

### Add

- `test-platform/tsconfig.json`
- `test-platform/src/platform-root.ts`
- `test-platform/test/platform-root.test.ts`

### Modify

- `package.json`

No other path may be added, modified, or deleted by the worker.

In particular, frozen in this child:

- all `src/**`;
- all existing `test/**`;
- `tsconfig.json`;
- `tsconfig.test.json`;
- `package-lock.json`;
- `scripts/build.mjs`;
- `scripts/verify-build.mjs`;
- all Taskfiles;
- `phx-ci.json`;
- `dev/governance/testing-platform-boundary.yaml`;
- all `dev/scripts/**`;
- all planning/tasking/governance/archive/evidence files;
- `main.js` as a tracked source change (it may be regenerated locally for proof but must not be committed).

If implementation appears to require any frozen path: **BLOCKED. Do not repair or broaden scope.**

## 5. Exact Implementation Contract

Implement only this minimal skeleton:

1. `test-platform/tsconfig.json`
   - must compile only the new `test-platform/src/**` and `test-platform/test/**` TypeScript;
   - must emit to a disposable top-level build directory named `.test-platform-build`;
   - must not alter or depend on root production TypeScript inclusion;
   - may extend the root compiler options only if its own include/output/module settings are explicitly overridden so platform compilation is isolated.

2. `test-platform/src/platform-root.ts`
   - must contain a unique exported non-shipping marker exactly:
     `BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL`;
   - may contain only trivial platform-root/smoke functionality;
   - must not import production synchronization code yet;
   - must not contain runner, simulator, scenario, persistence, evidence, transport, device-agent, or production-seam behavior.

3. `test-platform/test/platform-root.test.ts`
   - must be one deterministic Node test proving the platform-root module compiles/imports and exposes the expected sentinel;
   - no product synchronization behavior is tested here.

4. `package.json`
   - add one repository-level script named `test:bvp-root`;
   - that script must compile `test-platform/tsconfig.json` and run the emitted smoke test with Node's built-in test runner;
   - do not change `typecheck`, `test`, `build`, `verify:build`, or `check`;
   - do not add dependencies.

No other functionality is authorized.

## 6. Shipping-Isolation Proof

Before push, the worker must prove all of the following from its branch:

1. `npm ci` succeeds if dependency installation is available in the worker environment.
2. `npm run test:bvp-root` passes.
3. `npm run typecheck` passes.
4. `npm test` passes.
5. `npm run build` passes.
6. regenerated production `main.js` has exactly:
   - size `872862` bytes;
   - SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.
7. regenerated production `main.js` contains zero occurrences of:
   - `BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL`;
   - `test-platform`.
8. `git status --porcelain` after verification contains no tracked/generated production artifact change and no `.test-platform-build/**` content intended for commit.
9. branch diff from `S03A_INPUT_SHA` contains exactly the four authorized paths from §4.
10. no `src/**`, existing `test/**`, build script, PHX-CI, Taskfile, governance, or dev/evidence path changed.

If worker-local tooling is unavailable, report each unavailable command honestly. Static scope checks must still pass. PHX-CI remains authoritative acceptance.

Do not create a child-specific verifier script.

## 7. PHX-CI Acceptance

The worker pushes `bvp-s03a-test-platform-root-isolation` and stops at:

`READY FOR LOCAL PHX-CI VERIFICATION`

The operator then runs the installed deployed PHX-CI runtime selected by the task branch's actual `phx-ci.json`:

- branch: `bvp-s03a-test-platform-root-isolation`;
- base authority: `origin/phase6-integration`;
- publication mode: `push`.

At dispatch time the exact pin is:

- PHX-CI version: `0.2.0-dev.2`;
- framework SHA: `f5123d21cc13511a5ee1185cfc4e1689785188ed`.

The supervisor must independently review the PHX-CI evidence before acceptance/promotion.

The short `C:\phx-tmp` TEMP/TMP workaround remains permitted if needed for the known PHX-CI Windows long-path defect; it changes only disposable verification location, not semantics.

## 8. Size Gate

This child remains within DEC-325:

- one contract family: physical platform-root/build-test isolation;
- three new platform files plus one package-script modification;
- expected net new non-test implementation well below 1000 LOC;
- no production seam;
- no runner/simulator.

Do not split further.

## 9. Required Worker Handoff

Report:

- exact `S03A_INPUT_SHA`;
- task branch;
- implementation SHA;
- exact changed paths;
- `test:bvp-root`, typecheck, full test, build, artifact hash, sentinel search results;
- any unavailable checks as `NOT AVAILABLE IN THIS SESSION`;
- explicit confirmation that no out-of-allowlist path was edited;
- final state `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not merge/promote.
Do not begin 03B.
Do not begin S04.
