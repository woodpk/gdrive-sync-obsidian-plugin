# BVP-S02B — Retire Exact Legacy Harness Source and Production Coupling

## 0. Status


**Agent name:** `agt-brain-bvp-s02-legacy-retirement-01`
**Prompt maturity:** EXECUTABLE  
**Primary work package:** BVP-S02 — Legacy Executable Retirement  
**Exact accepted predecessor / implementation input SHA:** `ff87c49752844f1e52d884bcf4af94dea01c6eff`  
**Required branch:** `bvp-s02b-retire-harness-source`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

BVP-S02A is accepted and integrated. Its accepted implementation was `cbc9b086432b9b521ab9246db4386f08b7533c55`, PHX-CI evidence was `3a5c4577179fcd5e57e336c97c7632c54be639f5`, and its exact 33 test/support deletions are present in this input SHA.

The supervisor has completed the S02B classification. The worker has no authority to alter it.

## 1. Objective

Remove the exact supervisor-classified executable harness and H6C-only production correlation seam from the accepted post-S02A repository state.

Do not create any replacement BVP implementation in this child.

## 2. Exact Base / Drift Gate

`S02B_INPUT_SHA = ff87c49752844f1e52d884bcf4af94dea01c6eff`

The task file is persisted on a later `phase6-integration` tasking head. Before editing:

1. fetch/prune origin;
2. verify `S02B_INPUT_SHA` is an ancestor of current `origin/phase6-integration`;
3. verify every path changed after `S02B_INPUT_SHA` on `phase6-integration` is under `dev/**`;
4. hard-stop if any post-input change exists under:
   - `src/**`;
   - `test/**`;
   - `package.json`;
   - `package-lock.json`;
   - `tsconfig*.json`;
   - Taskfiles;
   - `phx-ci.json`;
   - other executable/build surfaces;
5. create `bvp-s02b-retire-harness-source` from exactly `S02B_INPUT_SHA`, not from the later tasking tip.

If any gate fails: **BLOCKED. Do not adapt.**

## 3. Supervisor-Verified Current Source State

At exact `S02B_INPUT_SHA`, the current blobs are:

- `src/main.ts` = `42a3b10bc3bb5113cdb8abb360d2e29b76d88229`
- `src/product/settings-tab.ts` = `04c4313c45895419e23ec7a42f68a8c2b79f7c68`
- `src/product/product-controller-base.ts` = `876d30eec5eb36ca16fee375581c85f3c7a5fa16`
- `src/diagnostics/production-diagnostic-correlation.ts` = `02b4e42bd479f1bed0d868a6898e4141cfe8cc3b`

These have been reconfirmed after accepted S02A. The 33 S02A test/support deletions are already integrated and are not part of this child's writable surface.

## 4. Exact Required Deletions

Delete exactly these 29 files:

- `src/validation/c-series-composition.ts`
- `src/validation/coordination-evidence-contracts.ts`
- `src/validation/cross-device-coordinator.ts`
- `src/validation/driver-plan-fault-verifier-contracts.ts`
- `src/validation/fixture-manager.ts`
- `src/validation/human-checkpoint-resume-controller.ts`
- `src/validation/index.ts`
- `src/validation/plan-assertion-engine.ts`
- `src/validation/production-diagnostic-correlation.ts`
- `src/validation/production-path-driver.ts`
- `src/validation/run-sandbox-checkpoint-contracts.ts`
- `src/validation/safety-sandbox.ts`
- `src/validation/scenario-evidence-recorder.ts`
- `src/validation/scenario-runner-contracts.ts`
- `src/validation/scenario-runner-core.ts`
- `src/validation/scenario-runner-durable-state.ts`
- `src/validation/scenario-runner-module-adapter.ts`
- `src/validation/scenario-runner.ts`
- `src/validation/scenarios/c03-ios-update-windows-download.ts`
- `src/validation/scenarios/c04-ios-move-windows-move.ts`
- `src/validation/scenarios/c05-ios-delete-windows-trash.ts`
- `src/validation/scenarios/c06-windows-create-ios-download.ts`
- `src/validation/scenarios/c07-windows-update-ios-download.ts`
- `src/validation/scenarios/c08-windows-move-ios-move.ts`
- `src/validation/scenarios/c09-windows-delete-ios-trash.ts`
- `src/validation/state-ambiguity-cancel-fault-hooks.ts`
- `src/validation/state-convergence-verifier.ts`
- `src/validation/transport-coverage-faults.ts`
- `src/validation/validation-mode-runtime.ts`

Also delete exactly:

- `src/diagnostics/production-diagnostic-correlation.ts`

No exception is permitted.

## 5. Exact Required Production Results

The following exact results are mandatory:

- `src/main.ts` → Git blob `dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7`
- `src/product/settings-tab.ts` → Git blob `e6a56451a3a6723d223c09175cc901c46f527985`
- `src/product/product-controller-base.ts` → Git blob `fee7c40e715d277cea2b5e26059a86753bb316a0`

For `src/product/product-controller-base.ts`, the required result is exactly the historical production blob:

`cb17f9686ea8a580f38de151e9049d94a7c2bd84:src/product/product-controller-base.ts`

Do not produce an equivalent hand-edited variant; the blob must match exactly.

For `src/main.ts` and `src/product/settings-tab.ts`, the exact target hashes above are authoritative. Do not make any additional cleanup/refactoring changes.

## 6. Exact Writable Surface

Only these paths are writable:

### Deletions

- the exact 29 `src/validation/**` paths in §4;
- `src/diagnostics/production-diagnostic-correlation.ts`.

### Modifications

- `src/main.ts`;
- `src/product/settings-tab.ts`;
- `src/product/product-controller-base.ts`.

No other repository path may be added, modified, or deleted by the worker.

In particular, frozen in this child:

- all remaining `src/**`;
- all `test/**`;
- `src/testing/fakes.ts`;
- all remaining `src/diagnostics/**`;
- `src/contracts/**`;
- `src/core/**`;
- `src/state/**`;
- package/build configuration;
- Taskfiles;
- `phx-ci.json`;
- planning/governance;
- `dev/archive/**`;
- `dev/_ca-output.md`;
- all `dev/scripts/**`.

If an unexpected dependency, compile failure, test failure, or build failure appears to require any frozen-path edit: **BLOCKED. Do not repair it in this child.**

## 7. Worker Verification

Before push, verify:

1. all 30 required deletion paths are absent;
2. `src/validation/**` no longer exists;
3. the three modified production files have exactly the required target blob hashes;
4. `git diff --name-status S02B_INPUT_SHA...HEAD` contains exactly:
   - 30 deletions;
   - 3 modifications;
   - zero additions;
5. no other path changed;
6. active `src/**` contains zero occurrences of:
   - `ValidationModeRuntime`
   - `validationRuntime`
   - `validationModeEnabled`
   - `setValidationModeEnabled`
   - `validationScenarioIds`
   - `startValidationScenario`
   - `resumeValidationScenario`
   - `currentDiagnosticCorrelation`
   - `ProductionDiagnosticCorrelation`
   - `scenario-runner`
   - `cross-device-coordinator`
   - `scenario-evidence-recorder`
7. run repository-native tests/build checks available to the worker.

Do not create a task-specific verifier script.

If local build/test tooling is unavailable, report the unavailable checks honestly and still stop at `READY FOR LOCAL PHX-CI VERIFICATION` provided the static frozen-surface checks pass. PHX-CI owns authoritative acceptance.

## 8. Required Worker Stop State

Push `bvp-s02b-retire-harness-source`.

Final response must report:

- exact `S02B_INPUT_SHA`;
- implementation SHA;
- branch;
- confirmation of exactly 30 deletions + 3 modifications;
- the three final Git blob hashes;
- complete changed-path list;
- retired-identifier search result;
- verification actually performed;
- unavailable checks marked `NOT AVAILABLE IN THIS SESSION`;
- confirmation that no task-specific verifier or evidence file was created/modified;
- final state:

`READY FOR LOCAL PHX-CI VERIFICATION`

Do not claim acceptance.

## 9. Hard Prohibitions

Do not:

- touch any path outside §6;
- reclassify any listed file;
- preserve any listed deletion;
- delete any unlisted file;
- repair fallout outside §6;
- create `test-platform/**`;
- build the simulator, scenario DSL, runner, live-device agent, mailbox, or replacement evidence system;
- introduce replacement validation runtime/UI;
- create scenario-specific production hooks;
- create a new runner/router/state machine/coordinator/persistence subsystem;
- use GitHub Actions;
- perform live Drive mutation;
- perform physical-device validation;
- begin BVP-S03;
- begin Stage 3.

## 10. Acceptance After Worker Stop

After the worker pushes and reports `READY FOR LOCAL PHX-CI VERIFICATION`, the operator runs the installed PHX-CI deployed runtime against `bvp-s02b-retire-harness-source` with the current `origin/phase6-integration` as the base authority and publication mode `push`.

Only PHX-CI evidence plus supervisor review may accept and integrate 02B.

Then and only then may 02V be rebound and executed.
