# BVP-S02B — Retire Exact Legacy Harness Source and Production Coupling

## 0. Status

**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S02 — Legacy Executable Retirement  
**Required predecessor:** accepted/integrated BVP-S02A

> DO NOT EXECUTE until the supervisor binds the exact accepted S02A predecessor SHA and confirms the hashes below still match.

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

## 1. Objective

Remove the exact supervisor-classified executable harness and H6C-only production correlation seam. There is **no worker classification authority**.

## 2. Dispatch Binding Required

Before marking EXECUTABLE, the supervisor MUST:

- bind exact accepted S02A integration SHA;
- confirm S02A changed only the 33 test/support deletions;
- confirm current blobs for `src/main.ts`, `src/product/settings-tab.ts`, and `src/product/product-controller-base.ts`;
- reconfirm the exact final target hashes;
- bind exact task branch.

Any mismatch requires supervisor re-analysis; the worker does not adapt.

## 3. Exact Required Deletions

Delete all 29 files under the supervisor-frozen legacy harness list:

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

Also delete:

- `src/diagnostics/production-diagnostic-correlation.ts`

No exception is permitted.

## 4. Exact Required Production Results

At the original S02 input SHA, the supervisor derived these exact target blobs:

- `src/main.ts` → `dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7`
- `src/product/settings-tab.ts` → `e6a56451a3a6723d223c09175cc901c46f527985`
- `src/product/product-controller-base.ts` → `fee7c40e715d277cea2b5e26059a86753bb316a0`

The ProductControllerBase target is exactly the pre-H6C production blob from:

`cb17f9686ea8a580f38de151e9049d94a7c2bd84:src/product/product-controller-base.ts`

The dispatch supervisor must reconfirm these hashes against the accepted S02A state before execution.

## 5. Exact Writable Surface

Only:

- the 29 listed `src/validation/**` deletions;
- `src/diagnostics/production-diagnostic-correlation.ts` deletion;
- the three exact production files in §4.

No other file is writable.

Unexpected dependency/failure requiring another edit = BLOCKED.

## 6. Required End State

- active `src/validation/**` does not exist;
- H6C-only production correlation seam does not exist;
- ordinary settings surface contains no validation-harness UI;
- ordinary plugin runtime contains no validation runtime;
- shipping build contains no legacy harness/scenario runtime;
- no replacement BVP framework is created.

## 7. Acceptance

Worker pushes the implementation and stops at `READY FOR LOCAL PHX-CI VERIFICATION`.

Installed PHX-CI then verifies the remote branch with publication mode `push`. No task-specific verifier script is permitted.

Do not begin S03. Do not merge/promote.
