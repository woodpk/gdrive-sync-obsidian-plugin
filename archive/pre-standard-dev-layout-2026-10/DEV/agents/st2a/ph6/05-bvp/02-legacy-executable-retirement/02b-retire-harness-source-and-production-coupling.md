# BVP-S02B — Retire Legacy Harness Source and Production Coupling

## 0. Status

**Agent name:** `agt-brain-bvp-s02-legacy-retirement-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Primary work package:** BVP-S02 — Legacy Executable Retirement  
**Exact accepted predecessor / implementation input SHA:** `ff87c49752844f1e52d884bcf4af94dea01c6eff`  
**Required branch:** `bvp-s02b-retire-harness-source`  
**Accepted implementation SHA:** `64035ae6b36ef1b6372e3153a815dbe8be72668a`  
**Accepted PHX-CI evidence SHA:** `9a04f3a20ef0448731b79d6f5f915a20107f37c1`  
**Accepted integration SHA:** `dd8f5f7d65598a2ec175627a6749316119b521c0`

This file is a historical contract record. It authorizes no new work and MUST NOT be re-executed.

## 1. Objective

Remove the supervisor-classified executable legacy validation harness and its harness-only production correlation/runtime/UI coupling while preserving ordinary synchronization behavior, reusable production diagnostics/contracts, and all unclassified repository surfaces.

No replacement BVP implementation belonged to this child.

## 2. Required End State

The accepted result required:

- `src/validation/**` absent;
- the H6C-only `src/diagnostics/production-diagnostic-correlation.ts` seam absent;
- legacy validation runtime/settings/controller coupling removed from the three approved production files;
- no residual active production identifier/reference to the superseded harness;
- all unlisted source/tests/build/governance surfaces unchanged;
- ordinary production build and tests passing through PHX-CI.

## 3. Fixed Retirement Classification

### Required deletions

Exactly these 29 `src/validation/**` files were classified for deletion:

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

### Required production results

The completed production edits were fixed to these exact blobs:

- `src/main.ts` → `dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7`
- `src/product/settings-tab.ts` → `e6a56451a3a6723d223c09175cc901c46f527985`
- `src/product/product-controller-base.ts` → `fee7c40e715d277cea2b5e26059a86753bb316a0`

The controller target was the historical known-good production blob `cb17f9686ea8a580f38de151e9049d94a7c2bd84:src/product/product-controller-base.ts`.

These exact results were part of the retirement classification, not ordinary implementation discretion.

## 4. Required Semantics and Invariants

- Removing the harness could not alter synchronization policy or runtime semantics unrelated to the harness.
- General production diagnostics and reusable product contracts remained product assets unless explicitly classified otherwise.
- No old harness runtime/UI/control/evidence/orchestration identifier could remain reachable in active production source.
- No new validation mode, replacement scenario runner, testing bypass, coordinator, persistence system, or BVP implementation could be introduced.
- Any unexpected dependency outside the fixed surface was a supervisor blocker, not worker authority to broaden scope.

## 5. Dependencies

This child depended on accepted/integrated S02A and its exact predecessor state.

## 6. Engineering Discretion

The supervisor had already resolved the retain/delete classification and fixed the three production target blobs. Worker discretion was limited to safe execution/verification mechanics. There was no authority to substitute equivalent hand-edited production variants, retain a listed legacy file, or remove an unlisted reusable surface.

## 7. Material Edge / Failure Cases

The child would have been BLOCKED if:

- an unlisted source/test/build edit was required to restore compilation;
- a listed legacy surface proved to contain product authority not captured by the fixed classification;
- removal exposed an unresolved shared contract requiring redesign;
- the three target production blobs could not be produced from the accepted predecessor without additional changes.

## 8. Acceptance Criteria

Acceptance required:

- exactly 30 deletions + 3 production modifications;
- `src/validation/**` absent;
- exact three production blob hashes;
- zero residual active-source occurrences of the legacy runtime/control/orchestration identifiers covered by the task;
- no changes outside the fixed surface;
- authoritative PHX-CI install/typecheck/full tests/build/repository/artifact checks passing;
- canonical evidence publication.

## 9. Non-Goals

This child did not:

- implement `test-platform/**`;
- build the BVP simulator, runner, DSL, evidence engine, live agent, transport, or scenario catalog;
- perform live Drive/device validation;
- begin S03 or Stage 3.

## 10. Historical Completion

Accepted implementation: `64035ae6b36ef1b6372e3153a815dbe8be72668a`  
Accepted PHX-CI evidence: `9a04f3a20ef0448731b79d6f5f915a20107f37c1`  
Accepted integration: `dd8f5f7d65598a2ec175627a6749316119b521c0`

## 11. Stop

No work is authorized by this file.
