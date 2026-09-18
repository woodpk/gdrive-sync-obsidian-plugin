STATUS: COMPLETE

# VH17 — C04 Mobile Rename/Move → Windows Move

Agent: `agt-ca-p6-vh17-c04-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Branch: `phase6-vh17-c04-scenario`

## Base gate

- Required predecessor branch: `origin/phase6-vh15-validation-mode-runtime-canary`
- Resolved exact predecessor HEAD / `BASE_SHA`: `6372184d2649e21369001ea28cc583e6636781c5`
- Predecessor evidence: `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md`
- Gate result: PASS — predecessor evidence begins exactly `STATUS: COMPLETE`.
- Required VH17 branch was created from exactly `BASE_SHA`.

## Implementation identity

- Final implementation/test SHA before evidence: `8ba65070e3d24a2eb98d7b6d7766c2577e6e9e9a`
- Implementation tree: `d09e45032a3396022e053045b65217638c9de820`
- Implementation delta from `BASE_SHA`: exactly two files, both VH17-owned:
  - `src/validation/scenarios/c04-ios-move-windows-move.ts`
  - `test/validation-c04-ios-move-windows-move.test.ts`
- No file under `src/contracts/**` changed.
- No frozen H0 harness contract, scenario authority text, central runtime, shared registry, or production synchronization implementation changed.

## Implemented end state

- Added one scenario-local C04 definition/registration package for `C04`; central C-series registry integration remains owned by VH23.
- Encoded the required trusted prerequisite lineage internally rather than requiring live C03 completion:
  1. deterministic harness-owned mobile text fixture at `test-ios-c02.md`;
  2. mobile production preview/assert/execute requires `upload-create`;
  3. Windows production preview/assert/execute requires `download-create` carrying the stable Drive object ID;
  4. objective verification requires both devices, remote content, BASE authority, live mappings, no tombstones, no outstanding effects, and cross-device authority/content agreement before the C04 move begins.
- Performed the mobile rename/move through `ValidationFixtureManager.move()` to `test-ios-c04-renamed.md`.
- Mobile production planning must expose exactly an `identity-preserving-move` to the remote with the original Drive ID, old path, and new path before execution is authorized.
- After mobile production execution, objective verification requires:
  - old remote path absent;
  - new remote path live under the same Drive ID;
  - unchanged deterministic SHA-256/size;
  - mobile BASE/mapping moved to the new path;
  - old path represented by neither mapping nor tombstone;
  - no outstanding durable mutation effect.
- Windows production planning must expose exactly an `identity-preserving-move` to local storage with the same Drive ID and old/new paths before execution is authorized.
- Final verification requires:
  - unchanged bytes on both participants and remote;
  - new path present on both participants;
  - old path absent on both participants and remote;
  - same stable Drive ID at the new remote path;
  - both participant BASE/mappings bound to that stable Drive ID;
  - no old-path tombstone or live mapping;
  - no outstanding durable effects;
  - cross-device authority/content convergence.
- Move-only plan assertions explicitly forbid upload/create, update, download/create, download/update, clean-merge, trash/delete, unresolved-conflict, blocked, and recovery operations. A delete/create substitution therefore hard-stops before production execution.

## Focused deterministic tests

`test/validation-c04-ios-move-windows-move.test.ts` contains three VH17 tests:

1. `VH17 C04 is registered exactly as C04 and self-establishes trusted lineage instead of requiring live C03`
2. `VH17 C04 establishes trusted lineage, preserves the Drive ID, and requires identity-preserving move plans on mobile and Windows`
3. `VH17 C04 fails closed before remote mutation when mobile rename is represented as delete/create substitution`

The mismatch test proves the mobile delete/create plan is rejected after the disposable local fixture move but before the second mobile production execute, and Windows move planning/execution is never reached.

## Verification

Verification used temporary unmerged PR #131 solely to trigger the repository's existing `Phase 6 Alpha Diagnostic Verification` workflow.

- Temporary PR: #131
- Final PR state: CLOSED / NOT MERGED
- Final implementation SHA: `8ba65070e3d24a2eb98d7b6d7766c2577e6e9e9a`
- Temporary PR merge commit: `a9798a6e6ddfb272d4d6a9c76a586da949a944d8`
- Implementation tree: `d09e45032a3396022e053045b65217638c9de820`
- Temporary PR merge tree: `d09e45032a3396022e053045b65217638c9de820`
- Exact-tree equality: PASS.
- Required workflow run: `35358369494`
- Required workflow job: `105643224232`
- Required workflow result: PASS.

Observed required verification results:

- dependency install: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- complete `npm test`: PASS — 983 tests, 983 passed, 0 failed
  - VH17 focused test 817: PASS
  - VH17 focused test 818: PASS
  - VH17 focused test 819: PASS
- pre-existing focused C1 regression group: PASS — 21 tests, 21 passed, 0 failed
- pre-existing focused callback/diagnostic/OAuth/export group: PASS — 46 tests, 46 passed, 0 failed
- `npm run build`: PASS
  - `BUILD_VERIFY_ENTRYPOINT=PASS`
  - `BUILD_VERIFY_SYNTAX=PASS`
  - `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
  - `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
  - `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `npm run check`: PASS — second complete 983/983 test pass plus production build verification
- `git diff --check`: PASS
- built `main.js`: 946606 bytes
- built `main.js` SHA-256: `be1662b17434539255331cd05a5cf9d73386ccec67d58dcfc01ec4e16892b639`

The first temporary-PR CI attempt (`35358284416`) stopped at TypeScript compilation on two VH17-local typing defects. Those were corrected only within the two VH17-owned files, and the final exact-tree run above passed completely.

## Environment-specific auxiliary workflow

The unrelated `Azure Static Web Apps CI/CD` run `35358369480` failed during deployment with the pre-existing platform condition:

`This Static Web App already has the maximum number of staging environments ... Please remove one and try again.`

That auxiliary workflow also emitted its own language-detection message. VH17 changed neither the Azure callback application nor its workflow/deployment configuration; the required Phase 6 verification workflow passed completely.

## Deviations

- This ChatGPT session did not have a network-clonable local repository shell, so the required commands were executed by the repository's existing GitHub Actions verification workflow against an exact-tree-equivalent temporary PR merge commit.
- The three focused C04 tests were executed as named cases within the complete `npm test` run and again by `npm run check`.
- No live Google Drive, Windows Obsidian, iPhone/iPad, release, promotion, or physical scenario execution was performed.

## Blockers

None within VH17 scope.

## Stop

Stopped after implementation/test completion, exact-tree verification, closure of the temporary unmerged verification PR, and separate evidence recording. No merge, promotion, release, live validation, or C04 physical PASS claim was performed.
