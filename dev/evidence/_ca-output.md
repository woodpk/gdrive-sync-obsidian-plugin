# Coding-Agent Evidence Handoff

## Build Identification

- Build/session or phase identifier: `Stage 2A Build Session 01 / Phase 1 — Repository Foundation and Frozen Shared Contracts`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Repository URL: `https://github.com/woodpk/gdrive-sync-obsidian-plugin`
- Verified Git clone URL / remote destination: `https://github.com/woodpk/gdrive-sync-obsidian-plugin.git`
- Branch/ref used for the build: `agt-stg-2a-phase-1-01`
- Base commit SHA: `0f88f8f11d10caf492237b323aec1b550fc2b052`
- Final pushed implementation commit SHA before this evidence-only commit: `40af4c2a73576f931868453f03857af25bd207d9`
- Additional substantive implementation commit SHAs:
  - `3ab40905f2041a1ef37bf2c1647b116550135f9f` — establish mobile-compatible plugin foundation
  - `c571ac14056c6ab558816a506ad665449bf67984` — freeze Phase 1 shared contracts
  - `f138f1e7b076c9a92c4055516c0707306e801d7a` — add Phase 1 contract tests and parallel handoff
  - `359065c481b3a932b8987d6fb1bef4a47e951fcc` — simplify the test/build toolchain after npm resolver failure
  - `a9204743fd69cefdbddbf474697de98a4a840896` — repair planner fake contract signature
  - `bc42cf7c767acf8cbab3e584624acbdaf5eb644c` — repair Node test compiler interop
  - `0ed7e578378df4d4e80f9338e96584dc01806120` — repair mobile-safety repository-root resolution
  - `bb9f7b0b0da8cdd1a5017b7faf2bc401793b2afa` — persist reproducible npm lockfile
  - `d699e3bc77509c7416642e8323822557b37be456` — update the Phase 1 handoff with verification evidence
  - `40af4c2a73576f931868453f03857af25bd207d9` — finalize Phase 1 verification status

The concrete commit SHA that contains this evidence artifact is necessarily determined only after Git hashes this file and commit. Git commit IDs are hashes of the commit/tree contents, so a commit cannot truthfully embed its own SHA without an impossible self-referential hash fixed point. The supervising agent should use the verified remote branch head as the authoritative evidence-commit SHA; the final handoff response records that concrete SHA after push verification.

## Implemented Scope

Phase 1 established the mobile-compatible Obsidian plugin repository foundation and froze the shared source-level contracts required before parallel Phase 2/3/4 work. It added the minimal plugin entry point, reproducible dependency/build/test configuration, mobile-safety guards, test doubles, contract tests, and the persisted `dev/phase-1-shared-contracts.md` parallel-work handoff. It did not implement reconciliation policy, live OAuth/Drive behavior, the production local adapter, merge execution, durable production persistence, or product UI.

## Files Created

The following inventory was derived from the actual Git compare from base commit `0f88f8f11d10caf492237b323aec1b550fc2b052` to the Phase 1 implementation head, plus this required evidence artifact. The implementation compare reported every implementation path as `added`.

- `.github/workflows/phase1-ci.yml`
- `.gitignore`
- `README.md`
- `dev/evidence/_ca-output.md`
- `dev/phase-1-shared-contracts.md`
- `manifest.json`
- `package-lock.json`
- `package.json`
- `scripts/finalize-build.mjs`
- `src/contracts/common.ts`
- `src/contracts/conflict.ts`
- `src/contracts/execution.ts`
- `src/contracts/google-drive.ts`
- `src/contracts/index.ts`
- `src/contracts/local-vault.ts`
- `src/contracts/plan.ts`
- `src/contracts/snapshot.ts`
- `src/contracts/state.ts`
- `src/contracts/status-audit-actions.ts`
- `src/main.ts`
- `src/testing/fakes.ts`
- `test/contracts.test.ts`
- `test/mobile-safety.test.ts`
- `tsconfig.build.json`
- `tsconfig.json`
- `tsconfig.test.json`
- `versions.json`

## Files Modified

- `dev/evidence/_ca-output.md` — included here as explicitly required by the evidence-handoff instructions; relative to the assignment base Git classifies it as `added`, not as modification of a pre-existing file.

No pre-existing repository file was modified relative to the assignment base.

## Files Deleted

None.

## Verification Performed

### Repository / Push-Destination Verification

- Validation operation: retrieve repository metadata for `woodpk/gdrive-sync-obsidian-plugin` and inspect `clone_url`, default branch, and push permission.
- Result: `PASS`
- Relevant result: repository clone URL resolved exactly to `https://github.com/woodpk/gdrive-sync-obsidian-plugin.git`; default branch is `master`; the connected GitHub identity has push/admin access.

### Actual Assignment Change-Set Inspection

- Validation operation: GitHub compare `0f88f8f11d10caf492237b323aec1b550fc2b052...40af4c2a73576f931868453f03857af25bd207d9` and PR changed-filename inspection.
- Result: `PASS`
- Relevant result: implementation head was 10 commits ahead, 0 behind; compare reported 26 implementation files, all `added`, with 0 modified/deleted paths. The file inventory above was reconciled against that result before the evidence artifact was added.

### CI Run `32662569481`

- Validation operation: initial clean GitHub Actions Phase 1 gate.
- Result: `FAIL`
- Relevant result: checkout and Node setup passed; npm 10.9.8 failed during initial lockfile bootstrap with `Cannot read properties of null (reading 'edgesOut')`; install/typecheck/test/build were therefore not executed in that run. The test toolchain was simplified rather than treating this tooling failure as a product pass.

### CI Run `32662651224`

- Validation operation: lockfile generation, `npm ci`, `npm run typecheck`.
- Result: `FAIL`
- Relevant result: lockfile generation passed, `npm ci` passed with 0 vulnerabilities, but typecheck failed because `FakeSynchronizationPlanner.plan` did not accept the required `PlanningInput`; tests/build were skipped. The contract fake was repaired.

### CI Run `32662691939`

- Validation operation: clean dependency setup, `npm run typecheck`, `npm test`.
- Result: `FAIL`
- Relevant result: dependency setup and repository typecheck passed. Test compilation failed because Node built-in `assert`/`test` default imports required CommonJS interop; production build was skipped. `tsconfig.test.json` was repaired.

### CI Run `32662723021`

- Validation operation: clean dependency setup, `npm run typecheck`, `npm test`.
- Result: `FAIL`
- Relevant result: `npm ci` and typecheck passed; 13 of 14 tests passed. The sole failing mobile-safety test resolved `manifest.json` one directory too shallow from compiled test output. The repository-root calculation was repaired; production build was skipped in this run.

### CI Run `32662762609`

- Validation operation: clean dependency bootstrap/install, `npm run typecheck`, `npm test`, `npm run build`.
- Result: `PASS`
- Relevant result: dependency setup passed, strict TypeScript checking passed, all 14 Phase 1 contract/mobile-safety tests passed, and production build passed. The workflow generated and pushed the reproducible `package-lock.json` in commit `bb9f7b0b0da8cdd1a5017b7faf2bc401793b2afa`.

### Final Post-Lockfile CI Run `32662829150`

- Exact command: `npm ci`
- Result: `PASS`
- Relevant result: clean dependency installation succeeded from the committed lockfile.

- Exact command: `npm run typecheck`
- Result: `PASS`
- Relevant result: strict TypeScript checking completed successfully.

- Exact command: `npm test`
- Result: `PASS`
- Relevant result: all 14 Phase 1 contract/mobile-safety tests passed; 0 failed, 0 skipped.

- Exact command: `npm run build`
- Result: `PASS`
- Relevant result: production plugin build completed successfully.

The test suite includes contract-family checks and architecture/mobile-safety checks for required operation vocabulary, unsafe uncertainty vs confirmed absence, adapter test seams, `drive.file`, authentication/managed-root identity separation, partial remote enumeration, recovery-state distinction, absence of newest-wins conflict behavior, required execution outcomes, verified-success commit gating, required status/action surface without force-sync, mobile manifest compatibility, prohibited runtime imports, and exclusion of authentication secret fields from frozen payload contracts.

No separate live Google Drive integration test or real-device Obsidian runtime test was part of the assigned Phase 1 scope and therefore was not executed.

## Acceptance-Criteria Status

`PASS`

Phase 1 acceptance criteria implemented and objectively verified within the coding-agent assignment were:

- repository foundation exists and is reproducibly installable/buildable;
- plugin manifest is mobile-compatible;
- all required shared contract families exist and compile;
- Phase 2/3/4 test seams exist without requiring live adapters;
- mobile-runtime architecture guards exist and pass;
- contract tests pass;
- production build passes;
- shared-contract handoff is persisted.

No assigned Phase 1 criterion is known to be unsatisfied. This is not a claim of supervisory approval; independent supervisor review remains required.

## Frozen-Contract / Architecture Status

The build established the Phase 1 frozen shared contracts and preserved the higher-authority architectural boundaries used to define them. No previously frozen Phase 1 contract was unilaterally changed by a downstream worker, and no supervisor-approved exception was required during this build.

The implementation preserves the intended dependency direction: Phase 2 consumes contract ports, Phase 3 implements the Google Drive boundary, Phase 4 implements the local-vault boundary, and UI/orchestration must act through the product-control surface rather than bypassing policy.

## Deviations

- The initial test/build mechanics used a Vitest/esbuild-oriented dependency graph. Clean CI exposed an npm 10.9.8 dependency-resolution crash before product verification. The Phase 1 toolchain was reduced to TypeScript plus Node's built-in test runner and a minimal build-finalization script. The required end state—strict type checking, automated tests, reproducible clean install, mobile-compatible runtime boundary, and production plugin build—was preserved and subsequently passed clean CI.
- The repository foundation used selective architectural adaptation from donor projects rather than a direct donor fork because directly forking would have imported later-phase implementation and explicitly incompatible product semantics. This does not change the required Phase 1 end state.

## Known Issues and Unverified Matters

- No known Phase 1 implementation defect remains after the final clean CI gate.
- Live Google OAuth/Drive behavior, full local Obsidian adapter behavior, reconciliation semantics, conflict execution, durable production state, and product UI are intentionally unimplemented because they belong to later phases.
- Independent supervisory inspection/acceptance has not yet occurred; this evidence artifact is only an inspection index.

## Evidence Integrity and Push Verification

- Actual Git compare inspected before evidence creation: `0f88f8f11d10caf492237b323aec1b550fc2b052...40af4c2a73576f931868453f03857af25bd207d9`.
- Pre-evidence compare status: `ahead`; 10 commits ahead, 0 behind.
- Pre-evidence implementation paths: 26 total; all classified by GitHub as `added`; no modified or deleted paths.
- PR changed-filename list reconciled against the compare inventory; no implementation path was omitted.
- Verification statements above correspond to observed GitHub Actions runs and observed outcomes; failed intermediate validations are explicitly recorded as failures rather than rewritten as passes.
- Base SHA verified: `0f88f8f11d10caf492237b323aec1b550fc2b052`.
- Final pushed implementation SHA before evidence-only commit verified: `40af4c2a73576f931868453f03857af25bd207d9`.
- Required remote verified: `https://github.com/woodpk/gdrive-sync-obsidian-plugin.git`.
- Required branch/ref: `agt-stg-2a-phase-1-01`.
- This evidence artifact is committed directly to that designated remote branch/ref. The concrete evidence-commit SHA and final remote branch-head reachability are verified after this file is committed and are reported in the final coding-agent handoff; this unavoidable post-hash fact cannot be embedded into the same Git commit that determines it.
