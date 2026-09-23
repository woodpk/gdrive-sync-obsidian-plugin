# BVP-S02 — Remove Legacy Executable Harness and Production Coupling

## 0. Agent Identity and Assignment

Agent: `agt-brain-bvp-s02-remove-legacy-harness-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `bvp-s02-remove-legacy-harness`  
Exact required base SHA: `6da8794b947c51b6e5cc4a15a467215d2fe37831`

Task classification: `IMPLEMENTATION / RETIREMENT`

Assignment:

> Remove the superseded internal Phase-6 validation harness from active executable source and production UI/runtime coupling, remove its obsolete harness-only tests, and leave the ordinary BRAIN synchronization product building and testing cleanly. Do not build the replacement BRAIN Verification Platform in this session.

This is BVP-S02 from the authoritative BVP decomposition. BVP-S01 is complete and its canonical evidence at `dev/_ca-output.md` begins exactly `STATUS: COMPLETE`.

## 1. Authority and Anti-Drift Inputs

Read first:

1. `dev/planning-and-building/target-system-specification.md`
2. `dev/planning-and-building/decision-register.yaml`
3. `dev/planning-and-building/project-state.yaml`
4. `dev/planning-and-building/testing-platform-target-system-specification.md`
5. `dev/planning-and-building/testing-platform-build-decomposition.md`
6. `dev/planning-and-building/testing-platform-build-session-specifications.md`
7. `dev/governance/testing-platform-boundary.yaml`
8. `dev/_ca-output.md`

`dev/archive/**` is historical/non-authoritative. Do not use the archived validation harness as current architecture or a template. You may inspect an archived artifact only when necessary to determine whether an active dependency is truly harness-only; do not reintroduce its architecture.

The following replacement rules are controlling:

- production `src/**` must not depend on the future `test-platform/**`;
- no scenario orchestration, distributed runner state, cross-device coordination, test persistence, evidence aggregation, or scenario-specific production code may survive merely for the retired harness;
- do not create any replacement runner/router/state machine/coordinator in S02;
- do not weaken production synchronization safety, authority, recovery, diagnostics, or user behavior merely to make retirement easier;
- do not increase any BVP complexity budget;
- GitHub Actions must not be used.

## 2. Base / Drift Gate

Before editing:

1. fetch/prune origin;
2. resolve `origin/phase6-integration`;
3. hard-stop unless it equals exactly `6da8794b947c51b6e5cc4a15a467215d2fe37831`;
4. verify `dev/_ca-output.md` begins exactly `STATUS: COMPLETE`;
5. create `bvp-s02-remove-legacy-harness` from exactly `6da8794b947c51b6e5cc4a15a467215d2fe37831`.

Do not substitute a later branch tip. If `phase6-integration` has moved, STOP and report the new SHA for supervisor re-grounding.

Do not modify the user's active checkout destructively. Use the repository execution mode already established for agent work; local verification must be safe for an active checkout.

## 3. Confirmed Retirement Surface

The supervisor re-grounded S02 against exact base `6da8794b947c51b6e5cc4a15a467215d2fe37831` and confirmed:

### 3.1 Legacy executable harness

`src/validation/**` contains **29 files** and is the superseded executable harness. Remove that active tree unless a file is proven to be general production functionality; any proposed exception requires explicit evidence in `dev/_ca-output.md` and must not preserve harness architecture.

Confirmed families include:

- scenario runner contracts/core/durable state/module adapter/composition;
- C-series scenario implementations;
- fixture manager / safety sandbox;
- production-path driver / plan assertion engine;
- state/convergence verifier;
- evidence recorder;
- cross-device coordinator;
- human checkpoint/resume controller;
- validation-mode runtime;
- harness fault/coverage modules and harness-only contracts.

### 3.2 Production coupling

`src/main.ts` currently:

- imports `ValidationModeRuntime`, `classifyValidationDevicePlatform`, `ValidationModeActionResult`, and `validationDeviceIdentity`;
- stores `validationRuntime`;
- constructs the validation runtime in `onload()`;
- injects validation host callbacks into `BrainSyncSettingsTab`;
- disables validation runtime on unload;
- contains validation-device/platform, enable/disable, scenario start/resume, and result-notice methods.

Remove those harness-only imports, fields, construction, callbacks, methods, and unload behavior without altering ordinary synchronization behavior.

`src/product/settings-tab.ts` currently exposes validation methods on `ProductSettingsHost` and renders a **Validation harness** settings section. Remove the harness-only host surface and UI completely.

### 3.3 Harness-only tests

The active repository contains **32 `test/validation*` files** whose subject is the retired harness. Remove obsolete harness-only tests/support modules.

Do not remove ordinary production tests merely because they mention diagnostics, synchronization plans, faults, or recovery. The subject must be the retired harness.

## 4. Mandatory Dependency Audit

Do not assume the confirmed surfaces are exhaustive.

Before deletion and again after deletion, search the active repository outside `dev/archive/**` for at least:

- `src/validation`
- `./validation/`
- `../validation/`
- `ValidationModeRuntime`
- `validationRuntime`
- `validationModeEnabled`
- `setValidationModeEnabled`
- `validationScenarioIds`
- `startValidationScenario`
- `resumeValidationScenario`
- `scenario-runner`
- `cross-device-coordinator`
- `scenario-evidence-recorder`

Classify every remaining hit. After S02, no active production or active test code may depend on the retired harness.

Also inspect package/build/test configuration for explicit validation-harness inclusion. Remove only obsolete harness-specific wiring.

## 5. Preserve — Do Not Delete by Association

S02 is a retirement task, not a synchronization redesign.

Preserve unless independently proven harness-only and safely removable:

- `src/contracts/**`;
- `src/core/**`;
- `src/state/**`;
- Google Drive/OAuth production code;
- Obsidian/local production code;
- normal product runtime/controller/planner/executor/recovery behavior;
- general diagnostic logger/event infrastructure;
- production diagnostic instrumentation that remains useful independent of the retired harness;
- normal product tests;
- `src/testing/fakes.ts` for now, unless a minimal compile/test correction requires otherwise.

In particular, do **not** delete `src/diagnostics/production-diagnostic-correlation.ts` merely because H6C introduced or consumed it. First determine whether it remains a legitimate general production diagnostic facility; preserve it if it does. S02 does not optimize or redesign diagnostics.

## 6. Required Implementation

At minimum:

1. remove active `src/validation/**` legacy harness implementation;
2. remove harness runtime construction and all validation-mode UI/control coupling from `src/main.ts`;
3. remove validation-harness host methods and settings UI from `src/product/settings-tab.ts`;
4. remove obsolete `test/validation*` harness tests/support files;
5. repair only direct compile/test fallout from that retirement;
6. update any active non-archived documentation/current-state text that incorrectly says the executable legacy harness remains active;
7. create one committed repository-controlled PowerShell verifier under `dev/scripts/` for this S02 session;
8. write canonical evidence to `dev/_ca-output.md`.

Do not create `test-platform/**` yet. That begins in BVP-S03.

## 7. Verification Requirements

The committed S02 verifier must run locally and capture complete command output, exit codes, and evidence.

Required checks:

1. base/branch identity and clean execution context;
2. `npm ci`;
3. `npm run typecheck`;
4. complete remaining `npm test`;
5. `npm run build`;
6. `npm run check` if not redundant in the verifier structure;
7. `git diff --check`;
8. repository status/changed-path evidence;
9. explicit proof that active `src/validation/**` is absent;
10. explicit proof that active `test/validation*` harness files are absent;
11. explicit proof that `src/main.ts` and `src/product/settings-tab.ts` no longer expose the retired validation runtime/UI;
12. explicit active-repository search proving no unclassified references to the retired harness remain outside `dev/archive/**`;
13. build-artifact inspection proving the shipping `main.js` contains no legacy validation-harness runtime/scenario surface;
14. evidence that general production diagnostics and ordinary synchronization tests remain intact.

The verifier must write `dev/_ca-output.md` beginning exactly:

- `STATUS: COMPLETE` on success; or
- `STATUS: BLOCKED` on failure.

No GitHub Actions.

## 8. Required Local Bootstrap

Provide a **small paste-ready PowerShell bootstrap** that:

- fetches `phase6-integration` and the S02 branch as applicable;
- checks out/runs verification safely without destructive changes to the user's active checkout;
- executes the committed S02 verification script;
- commits/pushes `dev/_ca-output.md` when verification passes;
- cleans up temporary worktrees/temporary branches it creates.

Prefer radical simplicity: the bootstrap delegates complexity to the committed verifier.

## 9. Proactive Review Requirement

Do not merely delete the named files and wait for compile errors.

After removing the confirmed harness family, proactively inspect the highest-likelihood residual error families:

- orphaned imports/types;
- settings-host interface mismatch;
- stale constructor callbacks;
- stale validation strings/UI labels;
- build/test configuration still compiling deleted files;
- product tests accidentally importing harness helpers;
- shipping bundle still containing harness identifiers;
- active `dev/**` references that incorrectly claim the old harness is executable authority.

Repair those within S02 scope before declaring readiness.

## 10. Hard Prohibitions

Do not:

- redesign synchronization;
- alter `src/contracts/**` semantics;
- build the new simulator, scenario DSL, runner, live-device agent, command mailbox, or evidence engine;
- add a replacement validation runtime inside the shipping plugin;
- add scenario-specific production hooks;
- add a new test persistence/state machine/router/coordinator;
- use GitHub Actions;
- perform live Google Drive mutation or physical-device validation;
- begin BVP-S03;
- begin Stage 3.

## 11. Evidence and Handoff

Commit implementation to `bvp-s02-remove-legacy-harness`.

Your final handoff must report:

- exact base SHA;
- implementation SHA;
- evidence SHA if separate;
- exact removed source/test surfaces;
- any preserved file that appeared harness-related and why it was retained;
- every verification command and exit code;
- final legacy-reference search result;
- shipping-bundle inspection result;
- `dev/_ca-output.md` status;
- any blocker.

Do not merge/promote to `phase6-integration`. Stop for supervisor review.

## 12. Completion Condition

S02 is complete only when the ordinary plugin builds/tests successfully with the legacy executable harness and harness UI/runtime gone, with no replacement framework introduced.

Then stop.
