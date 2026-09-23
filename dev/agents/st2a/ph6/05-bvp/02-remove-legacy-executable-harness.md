# BVP-S02 — Exact Retirement of Legacy Executable Harness

## 0. Agent Identity and Assignment

Agent: `agt-brain-bvp-s02-remove-legacy-harness-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `bvp-s02-remove-legacy-harness`  
Exact implementation base: `6da8794b947c51b6e5cc4a15a467215d2fe37831`

Task classification: `IMPLEMENTATION / EXACT RETIREMENT`

Assignment:

> Perform the exact supervisor-specified retirement below. You have **no authority to classify additional code as harness code, preserve any listed deletion, delete any unlisted file, redesign anything, or repair failures outside the exact writable surface**. If the prescribed change set does not build and test cleanly, record `STATUS: BLOCKED` and stop for supervisor re-analysis.

BVP-S01 is complete. This S02 prompt intentionally removes worker architectural discretion.

---

## 1. Controlling Authority

Read:

1. `dev/planning-and-building/target-system-specification.md`
2. `dev/planning-and-building/decision-register.yaml`
3. `dev/planning-and-building/testing-platform-target-system-specification.md`
4. `dev/planning-and-building/testing-platform-build-decomposition.md`
5. `dev/governance/testing-platform-boundary.yaml`
6. `dev/_ca-output.md` at the exact S02 input SHA

Do **not** use `dev/archive/**` for architecture, classification, or implementation decisions.

The supervisor has already performed the S02 classification. The worker executes it; the worker does not revise it.

---

## 2. Exact Base / Drift Gate

`S02_INPUT_SHA = 6da8794b947c51b6e5cc4a15a467215d2fe37831`

The current `phase6-integration` branch is allowed to be ahead of `S02_INPUT_SHA` only because the supervisor persisted S02 tasking and removed one stale decision-register line.

Before editing:

1. fetch/prune origin;
2. verify `S02_INPUT_SHA` is an ancestor of `origin/phase6-integration`;
3. verify the **only paths changed** in `S02_INPUT_SHA..origin/phase6-integration` are:
   - `dev/agents/st2a/ph6/05-bvp/02-remove-legacy-executable-harness.md`
   - `dev/planning-and-building/decision-register.yaml`
4. verify there are **zero** post-S01 changes under `src/**`, `test/**`, `scripts/**`, `package.json`, `package-lock.json`, `tsconfig*.json`, or other executable/build surfaces;
5. verify `dev/_ca-output.md` at `S02_INPUT_SHA` begins exactly `STATUS: COMPLETE`;
6. create `bvp-s02-remove-legacy-harness` from exactly `S02_INPUT_SHA`.

If any gate fails: **STOP. Do not adapt.**

The task prompt may be read from current `origin/phase6-integration`; the implementation branch must still be created from `S02_INPUT_SHA`.

---

## 3. Supervisor-Frozen Classification

There are **no exceptions** to the classifications in this section.

### 3.1 Delete all 29 legacy harness source files

Delete exactly these files:

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

After deletion, active `src/validation/**` must not exist.

### 3.2 Delete the H6C harness-only production correlation seam

Delete exactly:

- `src/diagnostics/production-diagnostic-correlation.ts`

Supervisor determination: this file was introduced by H6C to establish exact terminal correlation for the superseded harness. Its only production consumer is the H6C correlation code added to `ProductControllerBase`; all other consumers are within the retired harness/tests. It is therefore part of the legacy harness coupling and is **not retained** in S02.

### 3.3 Restore ProductControllerBase exactly to the pre-H6C production version

At `S02_INPUT_SHA`:

- current blob: `876d30eec5eb36ca16fee375581c85f3c7a5fa16`

Required final blob:

- `fee7c40e715d277cea2b5e26059a86753bb316a0`

That required blob is exactly:

`cb17f9686ea8a580f38de151e9049d94a7c2bd84:src/product/product-controller-base.ts`

Restore `src/product/product-controller-base.ts` to that exact blob. Do not hand-edit a different approximation.

This exact restoration removes the H6C-only:

- `ProductionDiagnosticCorrelationTracker` import/state;
- `currentDiagnosticCorrelation()`;
- `diagnosticSnapshot()`;
- manual/verify-reconcile correlation binding additions;
- H6C conflict-resolution diagnostic-run correlation additions.

No other ProductController behavior is authorized to change.

### 3.4 Edit src/main.ts to the exact supervisor-derived result

At `S02_INPUT_SHA`:

- base blob: `42a3b10bc3bb5113cdb8abb360d2e29b76d88229`

Required final blob:

- `dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7`

The required result is produced **only** by removing these existing harness elements:

1. imports from `./validation/validation-mode-runtime`;
2. import from `./validation/run-sandbox-checkpoint-contracts`;
3. `private validationRuntime?: ValidationModeRuntime;`;
4. construction of `new ValidationModeRuntime(...)`;
5. the five settings-host callbacks:
   - `validationModeEnabled`
   - `setValidationModeEnabled`
   - `validationScenarioIds`
   - `startValidationScenario`
   - `resumeValidationScenario`
6. `this.validationRuntime?.setEnabled(false);` from `onunload()`;
7. these complete private methods:
   - `validationDevicePlatform`
   - `setValidationModeEnabled`
   - `startValidationScenario`
   - `resumeValidationScenario`
   - `noticeValidationResult`

Do not make any other `src/main.ts` change. Final Git blob hash must equal the required hash above.

### 3.5 Edit src/product/settings-tab.ts to the exact supervisor-derived result

At `S02_INPUT_SHA`:

- base blob: `04c4313c45895419e23ec7a42f68a8c2b79f7c68`

Required final blob:

- `e6a56451a3a6723d223c09175cc901c46f527985`

Remove **only**:

1. these `ProductSettingsHost` members:
   - `validationModeEnabled()`
   - `setValidationModeEnabled(...)`
   - `validationScenarioIds()`
   - `startValidationScenario(...)`
   - `resumeValidationScenario()`
2. the complete settings UI section beginning with:
   - `containerEl.createEl("h3", { text: "Validation harness" });`
   and ending immediately before:
   - `containerEl.createEl("h3", { text: "Portable configuration allowlist" });`

Do not make any other settings-tab change. Final Git blob hash must equal the required hash above.

### 3.6 Delete exactly 33 harness-only test/support files

Delete:

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

No other test file may be deleted or edited.

---

## 4. Exact Writable Surface

The worker may change **only** the following implementation/evidence paths:

### Required deletions

- the 29 exact `src/validation/**` files listed in §3.1;
- `src/diagnostics/production-diagnostic-correlation.ts`;
- the 33 exact test/support files listed in §3.6.

### Required modifications

- `src/main.ts` — must end at exact blob `dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7`;
- `src/product/settings-tab.ts` — must end at exact blob `e6a56451a3a6723d223c09175cc901c46f527985`;
- `src/product/product-controller-base.ts` — must end at exact blob `fee7c40e715d277cea2b5e26059a86753bb316a0`;
- `dev/_ca-output.md` — canonical S02 evidence.

### Required addition

- `dev/scripts/Invoke-BvpS02LegacyHarnessRetirementVerification.ps1`

**No other repository path is writable in S02.**

In particular, the following are explicitly frozen for this session:

- all other `src/**`;
- all other `test/**`;
- `src/testing/fakes.ts`;
- every other `src/diagnostics/**` file;
- `src/contracts/**`;
- `src/core/**`;
- `src/state/**`;
- `package.json`;
- `package-lock.json`;
- `tsconfig.json`;
- `tsconfig.test.json`;
- build scripts;
- active planning/governance documents;
- `dev/archive/**`.

If compilation, tests, build, or verification appear to require changing any frozen path: **do not change it. Mark BLOCKED and stop.**

---

## 5. No Worker Classification Authority

The worker must not:

- decide that a listed deletion should be preserved;
- decide that an unlisted file is “also harness-only” and delete it;
- decide that an unlisted production/test file is “safe” to modify;
- preserve H6C production correlation because it seems generically useful;
- create a replacement seam because deleting the old one causes inconvenience;
- alter test/build configuration to hide failures;
- update planning documents to reinterpret S02;
- perform opportunistic cleanup/refactoring.

There is **no “unless proven,” “if appropriate,” “as needed,” or “repair fallout” authority** in this task.

Unexpected dependency = BLOCKER.  
Unexpected compile failure requiring unlisted edits = BLOCKER.  
Unexpected test failure requiring unlisted edits = BLOCKER.  
Unexpected build failure requiring unlisted edits = BLOCKER.

Return evidence; do not solve beyond the frozen change set.

---

## 6. Mandatory Verification Script

Create exactly:

`dev/scripts/Invoke-BvpS02LegacyHarnessRetirementVerification.ps1`

It must fail closed and write `dev/_ca-output.md`.

It must verify at least:

1. task branch descends from exact `S02_INPUT_SHA`;
2. changed-path allowlist is exact:
   - source/test diff contains only the 66 supervisor-authorized source/test paths;
   - dev diff contains only the S02 verifier and `dev/_ca-output.md`;
3. all 63 required deletions are absent;
4. `src/validation/**` does not exist;
5. exact final blob hashes:
   - `src/main.ts` = `dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7`
   - `src/product/settings-tab.ts` = `e6a56451a3a6723d223c09175cc901c46f527985`
   - `src/product/product-controller-base.ts` = `fee7c40e715d277cea2b5e26059a86753bb316a0`
6. `src/diagnostics/production-diagnostic-correlation.ts` is absent;
7. active `src/**` and `test/**` contain zero occurrences of these retired identifiers:
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
8. `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.test.json`, and build scripts are byte-for-byte unchanged from `S02_INPUT_SHA`;
9. `src/testing/fakes.ts` is byte-for-byte unchanged from `S02_INPUT_SHA`;
10. all other `src/**` and `test/**` paths outside the 66-path authorized set are unchanged from `S02_INPUT_SHA`;
11. `npm ci`;
12. `npm run typecheck`;
13. complete remaining `npm test`;
14. `npm run build`;
15. `npm run check`;
16. `git diff --check`;
17. shipping `main.js` contains none of the retired harness identifiers above.

Capture complete command output and exit codes.

Evidence must begin exactly:

- `STATUS: COMPLETE` if every check passes;
- `STATUS: BLOCKED` otherwise.

A failure is evidence to return to the supervisor; it is **not permission to broaden the implementation**.

---

## 7. Implementation Procedure

Perform only this sequence:

1. pass §2 drift gate;
2. create task branch from exact `S02_INPUT_SHA`;
3. apply the exact deletions in §3.1, §3.2, and §3.6;
4. restore `src/product/product-controller-base.ts` to the exact required historical production blob;
5. remove only the enumerated harness blocks from `src/main.ts` and verify its target blob hash;
6. remove only the enumerated harness blocks from `src/product/settings-tab.ts` and verify its target blob hash;
7. create the exact S02 verifier path;
8. run the verifier;
9. if COMPLETE, commit implementation/evidence and push the task branch;
10. stop for supervisor review.

Do not perform a “proactive cleanup” pass beyond these steps. The supervisor has already performed the classification pass.

---

## 8. Local Bootstrap Requirement

In the final handoff, provide a **small paste-ready PowerShell bootstrap** that delegates to the committed verifier and does not destructively alter the user's active checkout.

The bootstrap itself is not a new repository artifact in S02.

It should only:

- fetch the task branch;
- create/use a temporary detached worktree;
- execute `dev/scripts/Invoke-BvpS02LegacyHarnessRetirementVerification.ps1`;
- if verification passes and evidence changed, commit/push the evidence to the S02 task branch;
- clean up its temporary worktree.

Do not place verification logic in the bootstrap.

---

## 9. Hard Prohibitions

Do not:

- change any path outside §4;
- redesign synchronization;
- alter contract semantics;
- create `test-platform/**`;
- build the simulator, scenario DSL, runner, live-device agent, mailbox, or replacement evidence system;
- introduce any replacement validation runtime into the shipping plugin;
- introduce scenario-specific production hooks;
- create a new runner/router/state machine/coordinator/persistence subsystem;
- use GitHub Actions;
- perform live Drive mutation;
- perform physical-device validation;
- begin BVP-S03;
- begin Stage 3.

---

## 10. Handoff

Report:

- exact `S02_INPUT_SHA`;
- implementation SHA;
- evidence SHA if separate;
- verifier path;
- confirmation that all 63 required deletions occurred;
- the three final required blob hashes;
- exact changed-path list;
- every verification command and exit code;
- final retired-identifier search result;
- shipping-bundle inspection result;
- `dev/_ca-output.md` status;
- blocker, if any.

Do **not** report discretionary classification decisions because none are delegated.

Do not merge/promote to `phase6-integration`. Stop for supervisor review.

---

## 11. Completion Condition

S02 is COMPLETE only if the exact supervisor-frozen change set passes every verifier check without touching any unlisted path.

If it does not, S02 is BLOCKED and returns to the supervisor. The worker does not broaden scope.
