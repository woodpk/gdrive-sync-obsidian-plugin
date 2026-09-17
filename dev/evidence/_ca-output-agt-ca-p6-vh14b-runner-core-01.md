STATUS: COMPLETE

# VH14-B — Pure Runner Core / State Machine Evidence

## Identity and accepted base

- Agent: `agt-ca-p6-vh14b-runner-core-01`
- Branch: `phase6-vh14-b-runner-core`
- Exact authorized Package A base: `e52b653a49490ebd1d7a8c456dad896de44dc4a7`
- Implementation/test checkpoint: `0cb33c7dfb4c96e95a76b35717cafc9db2079f25`
- Implementation/test tree: `b55ce27f25c1761839c5debfc7ae79499b929919`
- Final evidence/branch head: the evidence-only commit containing this file; its exact SHA/tree is returned to the supervisor because a commit cannot embed its own identity.

The branch was verified clean and equal to its pushed remote before evidence closure. Package A is an exact ancestor, and the B delta is limited to the two implementation/test files plus this evidence file.

## Implemented behavior

`src/validation/scenario-runner-core.ts` implements the deterministic H6A orchestration state machine through Package A's contracts only.

The core:

- returns the exact frozen C03–F03 scenario tuple by identity;
- starts a single scenario or a non-empty ordered suite;
- durably preserves run, scenario, suite position, current step, completed steps/scenarios, lifecycle, proof state, and revision-CAS authority;
- validates scenario definitions, identities, prerequisite result coverage, lifecycle transitions, request identity, and expected revision;
- represents `RUNNING`, `PASS`, `FAIL`, `BLOCKED`, `PAUSED-HUMAN-ACTION`, and `RESUMABLE`;
- stops on failed/blocked prerequisites, delegated failures/blocks, invalid transitions, terminal states, stale revisions, mismatched definitions, or missing completion proof;
- permits suite advancement only after the active scenario has received both delegated verifier success and delegated evidence success;
- never derives verification/evidence success from operation completion;
- prevents a paused human-action step from completing directly: it must first become `RESUMABLE` and then use VH13 durable adoption;
- after VH13 `consumeResume` reports `resumed`, reloads durable runner state and accepts only an exact, revision-advanced `running` adoption of the requested resume step;
- supports deterministic fresh-process continuation through a caller-supplied immutable scenario-definition catalog, with suite order remaining durable authority;
- delegates every prerequisite, step, and human-resume operation through Package A interfaces and imports no VH04–VH13 concrete implementation;
- contains no filesystem, Drive, production-sync, physical-observation, evidence-recorder, fault-injection, or synchronization-engine semantics.

## Focused tests

`test/validation-scenario-runner-core.test.ts` contains ten focused cases covering:

1. exact frozen C03–F03 enumeration;
2. deterministic single-scenario lifecycle, revision, run/scenario/current-step identity, and proof accumulation;
3. fresh-core single-scenario reconstruction from durable state plus immutable definitions;
4. failed, blocked, and incomplete prerequisite handling without step execution;
5. strict proof matching and the prohibition on manufactured PASS;
6. ordered-suite advancement, per-scenario proof reset, and fresh-core suite continuation;
7. terminal suite failure and rejection of subsequent execution;
8. human pause, transition to `RESUMABLE`, fresh-core restart, and exact VH13 durable resume adoption before returning `RUNNING`;
9. explicit `RESUMABLE` representation and stale-request rejection before module work;
10. fail-closed CAS-race behavior using the actual durable state rather than uncommitted proposed progress.

## Durable checkpoints

| Purpose | Commit | Tree | Push result |
| --- | --- | --- | --- |
| Compile-clean runner skeleton | `d8df19e76092690f3ddf10fbbb36952d1a1f595f` | `9132f3b79027ba1748365558a174f715951ea69f` | pushed |
| Lifecycle and ordered-suite behavior | `9bd59464bde21783305fbae49ebdf0f78fd6a4b8` | `6af9f82d8c7e0314055cfa410a48f7ba2bd29bc6` | pushed |
| Focused state-machine tests | `80095ac6daf10b01300b30a78163df2ef97b3e92` | `e5869eb8d7f3fe2d077df98dd6a4d35c1e7be717` | pushed |
| Deterministic restart/resume correction | `0cb33c7dfb4c96e95a76b35717cafc9db2079f25` | `b55ce27f25c1761839c5debfc7ae79499b929919` | pushed |

## Exact changed-file manifest

Relative to exact Package A base `e52b653a49490ebd1d7a8c456dad896de44dc4a7`, Package B changes exactly:

- `src/validation/scenario-runner-core.ts`;
- `test/validation-scenario-runner-core.test.ts`;
- `dev/evidence/_ca-output-agt-ca-p6-vh14b-runner-core-01.md`.

Package B did not edit Package A contracts, C/D/E/I-owned files, the validation barrel, frozen H0, `src/contracts/**`, or the supervisor orchestration manifest.

## Verification

Required gates run at exact implementation checkpoint `0cb33c7dfb4c96e95a76b35717cafc9db2079f25`:

- `npm run typecheck` — PASS.
- `node_modules/.bin/tsc.cmd -p tsconfig.test.json` — PASS (complete test TypeScript compilation).
- `node --test .test-build/test/validation-scenario-runner-core.test.js` — PASS: 10 passed, 0 failed, 0 skipped/cancelled/todo.
- `git diff --check e52b653a49490ebd1d7a8c456dad896de44dc4a7..HEAD` — PASS.
- Frozen-boundary diff over `src/contracts/**`, the three frozen H0 contract files, Package A's runner contracts, `src/validation/index.ts`, and `dev/evidence/vh14-orchestration-state.json` — empty / PASS.

The complete repository suite/build/check and executable integrated canary remain Package I responsibilities; no claim is made that those final integration gates have occurred.

## Safety and ownership confirmation

- No second synchronization engine was created.
- VH11 uncertainty is never converted to physical truth by the core.
- Verification and evidence results are accepted only as explicit delegated proofs.
- VH13's exact run/checkpoint/resume-step adoption is required to be durable before cleanup; B accepts resume only after reloading the already-adopted durable runner step.
- No live validation, release, promotion, integration merge, or VH15 work occurred.

## Deviations and blockers

- The isolated worktree reused the repository's existing locked `node_modules` through a local ignored junction solely to execute verification; no dependency or tracked-file change resulted.
- A post-checkpoint recovery audit found the process-local definition catalog and stale post-adoption CAS risks. Both were corrected in pushed checkpoint `0cb33c7...` and are covered by fresh-core regression tests.
- Remaining Package B blockers: none.
