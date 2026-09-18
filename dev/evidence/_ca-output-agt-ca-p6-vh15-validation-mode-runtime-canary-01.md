STATUS: COMPLETE

# VH15 — H6B Validation-Mode Runtime Wiring and Isolation Canary

Agent: `agt-ca-p6-vh15-validation-mode-runtime-canary-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Branch: `phase6-vh15-validation-mode-runtime-canary`

## Base gate

- Required predecessor branch: `origin/phase6-vh14-module-integration-runner`
- Resolved exact predecessor HEAD / `BASE_SHA`: `8c3d6e79db0d7dcf882d0a66a9bbd8b39bc3a30b`
- Predecessor evidence: `dev/evidence/_ca-output-agt-ca-p6-vh14-module-integration-runner-01.md`
- Gate result: PASS — predecessor evidence begins exactly `STATUS: COMPLETE`.
- Required VH15 branch was created from exactly `BASE_SHA`.

## Implementation identity

- Implementation SHA: `3a7d319106078ddfd0ecda4cb3cbc763146e9078`
- Implementation tree: `7ef76abc1039791537965a33115d5b182d3c5689`
- Implementation commits:
  - `efbd49bf52dd4e2522f832849ab1606038cc0033` — `feat: wire validation mode runtime canary`
  - `3a7d319106078ddfd0ecda4cb3cbc763146e9078` — `fix: import validation module id from frozen runner contracts`

## Changed files

Implementation/test changes relative to `BASE_SHA`:

- `src/main.ts`
- `src/product/settings-tab.ts`
- `src/validation/index.ts`
- `src/validation/scenario-runner-module-adapter.ts`
- `src/validation/validation-mode-runtime.ts`
- `test/validation-mode-runtime-canary.test.ts`

No file under `src/contracts/**` changed.

## Implemented end state

- Added a validation-only runtime gate that is disabled by default on every plugin load.
- Harness composition is lazy: runner state stores, module delegates, and the production-path driver are not constructed until explicit validation-mode activation and an operation requiring the harness.
- Added a session-local Settings operator surface:
  - explicit validation-mode enable/disable toggle;
  - scenario selector/start control visible only while validation mode is enabled;
  - durable-current-scenario resume control visible only while validation mode is enabled.
- Validation-mode disablement drops the live harness composition without deleting its device-local durable runner checkpoint.
- Ordinary product runtime and ordinary Sync now / Verify-Reconcile / automatic sync / recovery / authentication command paths were not replaced, wrapped, or redirected.
- The runtime production-path delegate uses `ValidationProductionPathDriver`, which in turn delegates to the actual production controller seam.
- The H6A module-operation request now carries its exact scenario step ID so the runtime production-path delegate preserves run + step provenance.
- Sandbox, fixture, fault, coordination, verifier, evidence, and human-checkpoint runtime authorities fail closed unless explicitly supplied by their owning scenario/runtime packages. In particular, ordinary runtime receives no sandbox/fault authority and validation-off execution cannot reach any harness module delegate.
- C03–F03 identifiers remain the frozen scenario vocabulary. Executable scenario definitions remain owned by H7–H10; VH15 does not invent substitute live definitions. Attempting to start a scenario whose definition is not installed returns an explicit unavailable result rather than fabricating execution.
- Device-local runner and resume-adoption persistence uses isolated IndexedDB CAS stores only when harness composition is activated.
- No external service, Appium dependency, OAuth scope change, background-execution assumption, release behavior, or live Drive/mobile execution was added.

## Focused local/fake canary and isolation coverage

`test/validation-mode-runtime-canary.test.ts` adds four focused cases:

1. validation mode is disabled by default and cannot touch production or durable harness state;
2. after explicit activation, a local/fake C03 canary reaches the real `ValidationProductionPathDriver` and completes without executing a production mutation;
3. unbound sandbox/fault authority fails closed and disabling validation mode hides/drops harness controls;
4. the validation wrapper does not replace or intercept the ordinary production controller.

The canary definition exists only in the test and is not installed into the built plugin as a substitute for H7–H10 scenario definitions.

## Verification

Verification was executed by the repository's existing GitHub Actions Phase 6 verification workflow because this ChatGPT execution environment does not provide a network-clonable local repository shell.

Temporary verification PR: #127  
PR state after verification: CLOSED / NOT MERGED  
Required verification workflow: `Phase 6 Alpha Diagnostic Verification`  
Workflow run: `35349575822`  
Job: `105614208088`  
Result: PASS

The temporary PR merge commit was `c6ad39166e7d95fae937f90b85890d75ca84ad11`. Its tree was exactly `7ef76abc1039791537965a33115d5b182d3c5689`, identical to the implementation SHA tree, because `phase6-integration` was an ancestor of the VH15 branch. The CI therefore exercised the exact implementation tree.

Observed command/results:

- dependency install: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- `npm test`: PASS — 979 tests, 979 passed, 0 failed
  - VH15 focused test 865: PASS
  - VH15 focused test 866: PASS
  - VH15 focused test 867: PASS
  - VH15 focused test 868: PASS
- focused pre-existing Phase 6 regression groups in the workflow: PASS
- `npm run build`: PASS
  - `BUILD_VERIFY_ENTRYPOINT=PASS`
  - `BUILD_VERIFY_SYNTAX=PASS`
  - `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
  - `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
  - `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `npm run check`: PASS
- `git diff --check`: PASS
- built `main.js`: 946419 bytes
- built `main.js` SHA-256: `982a45040453ccb43b4b325b0481845aa3677b3688a81f57668dc8953de6e311`

## Environment-specific auxiliary workflow result

The unrelated `Azure Static Web Apps CI/CD` workflow also triggered from the temporary PR and failed in deployment because the Azure Static Web App had already reached its maximum number of staging environments:

`This Static Web App already has the maximum number of staging environments ... Please remove one and try again.`

This was an external deployment-capacity condition, not a VH15 TypeScript/build/test failure. VH15 did not modify the OAuth callback application, Azure workflow, or deployment configuration. The required Phase 6 verification workflow passed completely.

## Deviations

- No local shell execution was available in this session. Required build/test/check/whitespace verification was therefore performed in GitHub Actions against an exact-tree-equivalent PR merge commit.
- No live Google Drive, Windows Obsidian, iPhone/iPad, release, promotion, or physical validation was performed, as required.
- Executable C03–F03 production scenario definitions are intentionally not introduced by VH15; H7–H10 remain their owners.

## Blockers

None within VH15 scope.

## Stop

Stopped after implementation, local/fake canary and isolation verification, required repository verification, separate evidence recording, and closure of the temporary unmerged verification PR. No merge, promotion, release, or live physical validation was performed.
