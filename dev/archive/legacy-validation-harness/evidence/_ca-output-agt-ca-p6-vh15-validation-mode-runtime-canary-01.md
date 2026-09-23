STATUS: COMPLETE

# VH15 — H6B Validation-Mode Runtime Wiring and Isolation Canary

Agent: `agt-ca-p6-vh15-validation-mode-runtime-canary-01`
Repository: `woodpk/gdrive-sync-obsidian-plugin`
Branch: `phase6-vh15-validation-mode-runtime-canary`

## Base and correction provenance

- Original VH15 predecessor HEAD / `BASE_SHA`: `8c3d6e79db0d7dcf882d0a66a9bbd8b39bc3a30b`
- Original predecessor evidence gate: PASS — `dev/evidence/_ca-output-agt-ca-p6-vh14-module-integration-runner-01.md` began exactly `STATUS: COMPLETE`.
- VH15-R1 exact continuation input: `R1_INPUT_SHA = 254aee562456046a4d0742ddcbf819569f2bfd3f`
- R1 drift gate: PASS — `phase6-vh15-validation-mode-runtime-canary` resolved exactly to `R1_INPUT_SHA` before correction.
- R1 did not restart from the original VH15 base and did not redo accepted unaffected VH15 work.

## Corrected implementation identity

- Corrected implementation SHA: `4659be2ba38759ce5ef66c90901a55207b2d5a64`
- Corrected implementation tree: `54b0992fedd0558d5aaa3e0b3239a14cb1e72a28`
- R1 implementation/test commit:
  - `4659be2ba38759ce5ef66c90901a55207b2d5a64` — `fix: classify validation iPad runtime correctly`
- Original accepted VH15 implementation checkpoints remain in ancestry:
  - `efbd49bf52dd4e2522f832849ab1606038cc0033` — `feat: wire validation mode runtime canary`
  - `3a7d319106078ddfd0ecda4cb3cbc763146e9078` — `fix: import validation module id from frozen runner contracts`

## VH15-R1 C1 correction

Confirmed defect:

- `BrainGoogleDriveSyncPlugin.validationDevicePlatform()` used regex literals containing escaped backslashes, so normal `iPad` and iPadOS desktop-style `Macintosh` user agents did not match the intended word-boundary expressions.
- On iPad, the validation checkpoint/resume `ValidationDeviceIdentity.platform` could therefore be recorded incorrectly as `iphone`.

Repair:

- Added exported pure `classifyValidationDevicePlatform(...): ValidationDevicePlatform` to `src/validation/validation-mode-runtime.ts`.
- The classifier imports `ValidationDevicePlatform` from the frozen `run-sandbox-checkpoint-contracts` vocabulary.
- Classification is deterministic:
  - `isDesktopApp === true` → `windows-desktop`;
  - mobile user agent containing the word `iPad` → `ipad`;
  - mobile desktop-style `Macintosh` user agent with `maxTouchPoints > 1` → `ipad`;
  - otherwise mobile → `iphone`.
- The production classifier uses real regex word-boundary tokens:
  - `/\biPad\b/i`
  - `/\bMacintosh\b/i`
- `src/main.ts` now delegates device classification to this pure classifier using `Platform.isDesktopApp`, `navigator.userAgent`, and `navigator.maxTouchPoints`.
- This keeps validation checkpoint/resume device identity aligned with the frozen platform vocabulary and actual participating installation/device class.

## R1 changed-file manifest

Exact R1 implementation/test delta from `R1_INPUT_SHA` to corrected implementation SHA:

- `src/main.ts`
- `src/validation/validation-mode-runtime.ts`
- `test/validation-mode-runtime-canary.test.ts`

Final R1 evidence closure additionally changes only:

- `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md`

No unrelated R1 source or test file changed.

## Cumulative VH15 changed-file manifest

Relative to original VH15 `BASE_SHA`, the corrected VH15 branch changes only:

- `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md`
- `src/main.ts`
- `src/product/settings-tab.ts`
- `src/validation/index.ts`
- `src/validation/scenario-runner-module-adapter.ts`
- `src/validation/validation-mode-runtime.ts`
- `test/validation-mode-runtime-canary.test.ts`

Frozen boundaries remain intact:

- `src/validation/run-sandbox-checkpoint-contracts.ts`: unchanged.
- `src/contracts/**`: unchanged.
- No frozen H0 contract was modified by R1.

## Preserved accepted VH15 behavior

R1 preserves the accepted VH15 architecture and boundaries:

- validation mode remains disabled by default on every plugin load;
- harness composition remains lazy and validation-only;
- ordinary Sync now, Verify/Reconcile, automatic sync, recovery, authentication, planning, and execution paths remain unchanged;
- ordinary runtime receives no sandbox/fault authority;
- validation-off execution cannot reach harness module delegates;
- the runtime production-path delegate continues to use `ValidationProductionPathDriver`;
- the production-path driver binding remains non-overridable;
- C03–F03 identifiers remain frozen while executable scenario definitions remain owned by H7–H10;
- device-local validation runner/resume state remains isolated from production synchronization state;
- no external service, Appium dependency, OAuth-scope change, background-execution assumption, release behavior, or live Drive/mobile execution was added.

## Focused R1 regression coverage

`test/validation-mode-runtime-canary.test.ts` now directly exercises the exported production classifier.

The platform-classification regression proves all required cases:

1. desktop runtime → `windows-desktop`;
2. ordinary iPhone user agent → `iphone`;
3. explicit `iPad` user agent → `ipad`;
4. iPadOS desktop-style `Macintosh` user agent with `maxTouchPoints > 1` → `ipad`;
5. `Macintosh` without the touch condition does not falsely classify as `ipad` and resolves to `iphone`.

The same focused VH15 file continues to prove:

- validation mode is disabled by default and cannot touch production or durable harness state;
- after explicit activation, the local/fake canary reaches the real production-path driver;
- unbound sandbox/fault authority fails closed and disabling validation drops harness controls;
- the validation wrapper does not replace or intercept the ordinary production controller.

The tests call `classifyValidationDevicePlatform` directly and do not duplicate the classifier regex.

## Verification

Because this execution environment does not provide a network-clonable local repository shell, verification again used the repository's existing GitHub Actions Phase 6 verification workflow against an exact-tree-equivalent temporary PR merge commit.

Temporary verification PR: #127
PR final state: CLOSED / NOT MERGED
Corrected PR head: `4659be2ba38759ce5ef66c90901a55207b2d5a64`

Required verification workflow:

- Workflow: `Phase 6 Alpha Diagnostic Verification`
- Run: `35353696625`
- Job: `105627725039`
- Result: PASS

Exact-tree proof:

- Corrected implementation SHA: `4659be2ba38759ce5ef66c90901a55207b2d5a64`
- Corrected implementation tree: `54b0992fedd0558d5aaa3e0b3239a14cb1e72a28`
- Temporary PR merge commit: `a78d126fc9f416aa8802e11fdd707671f0ebfb76`
- Temporary PR merge tree: `54b0992fedd0558d5aaa3e0b3239a14cb1e72a28`
- Tree equality: PASS.

The successful CI therefore exercised the exact corrected implementation tree.

Observed verification results:

- dependency install: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- complete `npm test`: PASS — 980 tests, 980 passed, 0 failed
- focused VH15 tests in the complete run:
  - test 865 — `VH15 classifies validation device platforms deterministically`: PASS
  - test 866 — validation mode disabled-by-default/isolation: PASS
  - test 867 — production-path-driver local canary after activation: PASS
  - test 868 — sandbox/fault fail-closed isolation and disablement: PASS
  - test 869 — ordinary production-controller non-interception: PASS
- pre-existing focused C1 first-sync regression group: PASS — 21 tests, 21 passed, 0 failed
- pre-existing focused callback/diagnostic/OAuth/export group: PASS — 46 tests, 46 passed, 0 failed
- `npm run build`: PASS
  - `BUILD_VERIFY_ENTRYPOINT=PASS`
  - `BUILD_VERIFY_SYNTAX=PASS`
  - `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
  - `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
  - `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `npm run check`: PASS — included a second complete 980/980 test pass and production build verification
- `git diff --check`: PASS
- built `main.js`: 946606 bytes
- built `main.js` SHA-256: `be1662b17434539255331cd05a5cf9d73386ccec67d58dcfc01ec4e16892b639`

## Environment-specific auxiliary workflow result

The unrelated `Azure Static Web Apps CI/CD` workflow also triggered from the temporary PR:

- Run: `35353696628`
- Build/deploy job: `105627724195`
- Result: failure during Azure staging deployment.

The reported Azure condition was unchanged from the prior VH15 verification:

`This Static Web App already has the maximum number of staging environments ... Please remove one and try again.`

This R1 correction changed neither the OAuth callback application nor the Azure workflow/deployment configuration. The Azure staging-capacity condition is therefore not a VH15-R1 blocker.

## Deviations

- No local shell execution was available in this session; required verification was performed by GitHub Actions against an exact-tree-equivalent PR merge commit.
- The focused VH15 platform/isolation regressions were executed as named tests within the complete repository test command and again through `npm run check`; no temporary test-only workflow or repository file was introduced.
- No live Google Drive, Windows Obsidian, iPhone/iPad, release, promotion, or physical validation was performed.

## Blockers

None within VH15-R1 scope.

## Stop

Stopped after C1 correction, implementation/test commit, successful exact-tree verification, closure of the temporary unmerged PR, and final evidence update. No merge, promotion, release, live Drive/mobile validation, VH16/C03 execution, or later harness work was performed.
