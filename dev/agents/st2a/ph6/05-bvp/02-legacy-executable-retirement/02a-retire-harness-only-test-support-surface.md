# BVP-S02A — Retire Exact Harness-Only Test / Support Surface

## 0. Status

**Agent name:** `agt-brain-bvp-s02-legacy-retirement-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Primary work package:** BVP-S02 — Legacy Executable Retirement  
**Exact input SHA:** `6da8794b947c51b6e5cc4a15a467215d2fe37831`  
**Required branch:** `bvp-s02a-retire-harness-tests`  
**Accepted implementation SHA:** `cbc9b086432b9b521ab9246db4386f08b7533c55`  
**PHX-CI evidence SHA:** `3a5c4577179fcd5e57e336c97c7632c54be639f5`  
**Accepted integration SHA:** `ff87c49752844f1e52d884bcf4af94dea01c6eff`

This file is a historical contract record. It authorizes no new work and MUST NOT be re-executed.

## 1. Objective

Remove only the supervisor-classified tests/support whose subject was the superseded internal validation harness, while proving that production code, ordinary product tests, build configuration, planning/governance, and PHX-CI integration were unchanged.

## 2. Required End State

The accepted result required:

- all 33 classified harness-only test/support paths to be absent;
- no production source change;
- no replacement BVP implementation;
- no build/configuration or PHX-CI change;
- the remaining repository to pass authoritative PHX-CI verification.

## 3. Fixed Retirement Classification

The following 33 paths were the complete writable/deletion set for this child:

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

No other worker change was authorized.

## 4. Required Semantics and Invariants

- Retirement removed obsolete verification architecture, not product behavior.
- A compile/test failure caused by deletion could not authorize opportunistic repair in another surface.
- Unlisted tests were presumed product/repository assets and remained untouched.
- Production source had to remain byte-for-byte unchanged by this child.
- New BVP implementation was prohibited until legacy executable retirement completed.

## 5. Dependencies

This child depended on accepted S01 authority/archive closure and its exact input SHA.

## 6. Engineering Discretion

Because the supervisor had already classified the complete deletion set, implementation discretion was intentionally limited to safe Git/file deletion mechanics and verification. The worker had no authority to reclassify, replace, refactor, or compensate outside the fixed surface.

## 7. Material Edge / Failure Cases

The child would have been BLOCKED if deletion exposed a dependency requiring any unlisted source/test/build change. It would also have failed if any listed path remained, any unlisted path changed, or production behavior was modified to accommodate the retirement.

## 8. Acceptance Criteria

Acceptance required objective evidence of:

- exactly 33 deletions and no other implementation changes;
- all listed paths absent;
- production source unchanged;
- repository-native checks available to the worker;
- authoritative PHX-CI install/typecheck/tests/build/repository/artifact verification passing;
- canonical evidence publication and preserved control checkout.

## 9. Non-Goals

This child did not:

- remove `src/validation/**`;
- remove production runtime/UI coupling;
- modify diagnostics or product code;
- create `test-platform/**`;
- create any replacement runner/simulator/evidence system;
- begin S02B or later work.

## 10. Historical Completion

Accepted implementation: `cbc9b086432b9b521ab9246db4386f08b7533c55`  
Accepted PHX-CI evidence: `3a5c4577179fcd5e57e336c97c7632c54be639f5`  
Accepted integration: `ff87c49752844f1e52d884bcf4af94dea01c6eff`

## 11. Stop

No work is authorized by this file.
