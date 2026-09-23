# BVP-S02A — Retire Exact Harness-Only Test/Support Surface

## 0. Status


**Agent name:** `agt-brain-bvp-s02-legacy-retirement-01`
**Prompt maturity:** COMPLETE  
**Primary work package:** BVP-S02 — Legacy Executable Retirement  
**Exact input SHA:** `6da8794b947c51b6e5cc4a15a467215d2fe37831`  
**Required branch:** `bvp-s02a-retire-harness-tests`  
**Accepted implementation SHA:** `cbc9b086432b9b521ab9246db4386f08b7533c55`  
**PHX-CI evidence SHA:** `3a5c4577179fcd5e57e336c97c7632c54be639f5`  
**Accepted integration SHA:** `ff87c49752844f1e52d884bcf4af94dea01c6eff`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

## 1. Objective

Delete the supervisor-classified harness-only test/support surface **without changing any production source, build configuration, planning/governance file, or PHX-CI integration**.

This child exists specifically to reduce S02 to a one-turn mechanical deletion plus full CI proof.

## 2. Drift Gate

The task prompt is stored on a later `phase6-integration` planning/tasking head. Before editing:

1. fetch origin;
2. verify the exact input SHA is an ancestor of current `origin/phase6-integration`;
3. verify every path changed after the input SHA on `phase6-integration` is under `dev/**`;
4. hard-stop if `src/**`, `test/**`, package/build configuration, Taskfiles, or `phx-ci.json` changed after the input SHA;
5. create the task branch from the exact input SHA, not from the later tasking tip.

## 3. Exact Writable Surface

Delete exactly these 33 paths and no others:

- `test/phase6-h6c-production-diagnostic-correlation.test.ts`
- `test/validation-c-series-composition.test.ts`
- `test/validation-c03-ios-update-windows-download.test.ts`
- `test/validation-c04-ios-move-windows-move-correction.test.ts`
- `test/validation-c05-ios-delete-windows-trash.test.ts`
- `test/validation-c06-h6b-registration.test.ts`
- `test/validation-c07-windows-update-ios-download.test.ts`
- `test/validation-c08-windows-move-ios-move.test.ts`
- `test/validation-c09-windows-delete-ios-trash.test.ts`
- `test/validation-coordination-evidence-contracts.test.ts`
- `test/validation-cross-device-coordinator.test.ts`
- `test/validation-driver-plan-fault-verifier-contracts.test.ts`
- `test/validation-fixture-manager.test.ts`
- `test/validation-human-checkpoint-resume.test.ts`
- `test/validation-mode-runtime-canary.test.ts`
- `test/validation-mode-runtime-plan-handoff.test.ts`
- `test/validation-plan-assertion-engine.test.ts`
- `test/validation-production-diagnostic-fixture.ts`
- `test/validation-production-path-driver.test.ts`
- `test/validation-run-sandbox-checkpoint-contracts.test.ts`
- `test/validation-safety-sandbox.test.ts`
- `test/validation-scenario-evidence-recorder.test.ts`
- `test/validation-scenario-runner-canary-suite.test.ts`
- `test/validation-scenario-runner-canary-suite.ts`
- `test/validation-scenario-runner-canary-support.ts`
- `test/validation-scenario-runner-contracts.test.ts`
- `test/validation-scenario-runner-core.test.ts`
- `test/validation-scenario-runner-durable-state.test.ts`
- `test/validation-scenario-runner-integration.test.ts`
- `test/validation-scenario-runner-module-adapter.test.ts`
- `test/validation-state-ambiguity-cancel-fault-hooks.test.ts`
- `test/validation-state-convergence-verifier.test.ts`
- `test/validation-transport-coverage-faults.test.ts`

No file may be added or modified by the worker.

PHX-CI evidence will later add its configured evidence files during local acceptance; that evidence mutation is owned by PHX-CI, not the worker implementation.

## 4. Frozen Surface

Everything not listed in §3 is frozen, including all `src/**`, all remaining `test/**`, `package*.json`, `tsconfig*.json`, build scripts, Taskfiles, `phx-ci.json`, planning/governance, and `dev/archive/**`.

If removal causes a compile/test/build failure that appears to require another repository edit: **BLOCKED. Do not repair it in this child.**

## 5. Worker Verification

Confirm:

- all 33 listed paths are absent;
- `git diff --name-status` contains exactly 33 deletions;
- no production source changed;
- repository-native tests available to the worker are run.

Push the branch and stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

## 6. Authoritative Acceptance

The local operator verifies `bvp-s02a-retire-harness-tests` through installed PHX-CI deployed-runtime Path C with publication mode `push`.

PHX-CI must pass install, typecheck, focused/full tests, build, repository checks, artifact checks, Git gates, and evidence.

Do not create any verifier script.

## 7. Stop

Do not begin S02B. Do not delete `src/validation/**` in this child. Do not merge/promote.