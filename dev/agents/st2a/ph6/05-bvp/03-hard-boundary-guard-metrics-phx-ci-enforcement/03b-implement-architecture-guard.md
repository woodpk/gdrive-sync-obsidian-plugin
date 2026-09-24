# BVP-S03B — Implement architecture guard

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** EXECUTABLE  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement  
**Exact accepted predecessor / implementation input SHA:** `fdc5f8a0f72f57492eea10590cecfa7e80aa1ee6`  
**Required branch:** `bvp-s03b-architecture-guard`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

BVP-S03A is accepted and promoted. This child owns only the generic repository architecture guard plus deterministic negative/positive tests for that guard. It does not own architecture metrics/budget calculation (03C) or PHX-CI repository-check wiring (03D).

## 1. Objective

Implement `dev/scripts/Test-TestingArchitectureGuard.ps1` as the durable BVP architecture-boundary guard and prove it with deterministic tests that run through PHX-CI's focused-test stage.

Required end state:

> The guard passes the current compliant repository and deterministically rejects prohibited production→test-platform dependencies, production bundle inclusion of test-platform code, scenario identifiers/control surfaces in production, unapproved test-platform→production import surfaces, scenario-specific PowerShell, archive-as-current-authority links, and unauthorized frozen-governance changes when supplied as changed paths.

Do not implement architecture metrics or complexity-budget evaluation in this child; those belong to 03C.

## 2. Exact Base / Drift Gate

`S03B_INPUT_SHA = fdc5f8a0f72f57492eea10590cecfa7e80aa1ee6`

The executable prompt is persisted on a later supervisor tasking commit. Before editing:

1. fetch/prune origin;
2. verify `S03B_INPUT_SHA` is an ancestor of current `origin/phase6-integration`;
3. verify every path changed after `S03B_INPUT_SHA` on `phase6-integration` is under `dev/**` only;
4. hard-stop if any later change touches production/test/build/Taskfile/PHX-CI/test-platform executable surfaces;
5. create `bvp-s03b-architecture-guard` from exactly `S03B_INPUT_SHA`.

If any gate fails: **BLOCKED. Do not adapt.**

## 3. Supervisor-Verified Current State

At exact `S03B_INPUT_SHA`:

- accepted S03A platform root exists under `test-platform/**`;
- `package.json` Git blob = `126fd397714255792875a51c04548b78aa1c435c`;
- `test-platform/tsconfig.json` Git blob = `f5727a9ce13a52940858af7fb68cd049fafcbd3d`;
- `test-platform/src/platform-root.ts` Git blob = `b3029fd0479d170ff630c618631335c2e10b1b22`;
- `test-platform/test/platform-root.test.ts` Git blob = `33150b31756c67b8083fd28b7c329c722289e783`;
- `dev/governance/testing-platform-boundary.yaml` Git blob = `be7d9b532d67419844cadfbcbc35dddd522a7c36`;
- `Taskfile.phx-ci.yml` Git blob = `e8b8befdd72df88b498a0b3218326ad7e921f23c`;
- `Taskfile.yml` Git blob = `688384d9068d858246431408bac35eebe49216a2`;
- `phx-ci.json` Git blob = `249de042bd0985473028e8da755ee71473f7fe25`;
- no architecture guard exists yet;
- no architecture metrics script exists yet;
- production `main.js` accepted hash remains `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

## 4. Exact Writable Surface

Only these paths are writable:

- add `dev/scripts/Test-TestingArchitectureGuard.ps1`;
- add `test-platform/test/architecture-guard.test.ts`;
- modify `package.json`.

No other path may be added, modified, or deleted.

Frozen in this child:

- all `src/**`;
- all existing `test/**`;
- all other `test-platform/**`;
- `dev/governance/testing-platform-boundary.yaml`;
- all planning/tasking/archive/evidence files;
- `dev/scripts/**` except the one new guard;
- `scripts/**`;
- `tsconfig*.json`;
- `package-lock.json`;
- all Taskfiles;
- `phx-ci.json`;
- `.gitignore`.

If another path appears necessary: **BLOCKED.**

## 5. Guard Contract

The guard must be a generic repository check, not a task verifier.

### Inputs

It must support:

- repository root input, defaulting safely to the repository containing the script;
- optional changed-path input used only for frozen-surface/change-class enforcement;
- deterministic nonzero exit on violations;
- concise violation output identifying the violated rule and path.

It must not fetch, checkout, reset, clean, stash, commit, push, create/remove worktrees, publish evidence, or mutate the repository.

### Baseline rules

At minimum, fail when:

1. any production `src/**` source imports/requires/dynamically imports `test-platform/**`;
2. ordinary production build configuration/entrypoints include or reference `test-platform/**`, or built `main.js` contains the S03A non-shipping sentinel when the artifact exists;
3. production `src/**` introduces BVP/validation scenario IDs, scenario-runner controls, or scenario-specific execution controls;
4. `test-platform/**` imports production `src/**` through an unapproved surface; because the current manifest defines no concrete production-import allowlist entries, the current accepted set is empty;
5. any PowerShell script appears under `test-platform/**`, including scenario-specific verification scripts;
6. active BVP planning/tasking files link to `dev/archive/**` as current executable/task authority; historical prose references alone must not cause false positives;
7. when changed paths are supplied for a normal/non-governance work package, a path listed by `supervisor_owned_frozen_surfaces` in `dev/governance/testing-platform-boundary.yaml` is changed.

The compliant current repository must pass.

Do not implement hard LOC/module budgets here; 03C owns metrics and budget failure.

## 6. Deterministic Tests

Add `test-platform/test/architecture-guard.test.ts`.

The test must invoke the real PowerShell guard against disposable temporary fixture repositories/directories and prove at least:

- compliant baseline fixture: PASS;
- production import from `test-platform/**`: FAIL;
- production build input/reference to `test-platform/**`: FAIL;
- production scenario ID/control insertion: FAIL;
- unapproved test-platform import from `src/**`: FAIL;
- PowerShell file beneath `test-platform/**`: FAIL;
- active task link treating `dev/archive/**` as current authority: FAIL;
- supplied changed path touching a supervisor-owned frozen surface in normal mode: FAIL;
- historical/non-authoritative prose mentioning `dev/archive/**` without executable/current-authority linkage: PASS.

Fixtures should be generated programmatically inside the Node test's temporary directories; do not add fixture files/directories to the repository.

Tests must clean their own temporary state or use OS temp locations outside the repository.

## 7. PHX-CI-Native Test Surface

Modify `package.json` only to add:

`test:bvp-architecture-guard`

It must:

1. compile the existing `test-platform/tsconfig.json`;
2. run only the emitted architecture-guard Node test from `.test-build/bvp/test/**`.

Do not change existing `typecheck`, `test`, `test:bvp-root`, `build`, `verify:build`, or `check` scripts.

Authoritative acceptance is one PHX-CI run using:

- branch: `bvp-s03b-architecture-guard`;
- base authority: `origin/phase6-integration`;
- focused command: `npm run test:bvp-architecture-guard`;
- publication mode: `push`.

Do not create or run a parallel verifier.

At dispatch time the PHX-CI pin remains:

- version `0.2.0-dev.2`;
- framework SHA `f5123d21cc13511a5ee1185cfc4e1689785188ed`.

## 8. Size / Ownership Gate

This child remains within DEC-325:

- one platform-level contract family: architecture guard;
- one non-test implementation script;
- one Node test;
- one package-script modification;
- no production seam;
- no metrics collector;
- no PHX-CI wiring.

After acceptance, the new guard becomes a supervisor-owned frozen surface under the existing boundary manifest.

## 9. Required Handoff

Report:

- exact input SHA;
- branch and implementation SHA;
- exact changed paths;
- positive baseline result;
- each required negative-case result;
- exact focused command;
- any unavailable worker-local checks;
- confirmation of no out-of-allowlist edits;
- final state `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not merge/promote.
Do not begin 03C.
