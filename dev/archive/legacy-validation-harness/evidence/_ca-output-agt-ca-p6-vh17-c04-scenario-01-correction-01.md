STATUS: COMPLETE

# VH17 — C04 Correction 01 — Real H6B Runner Orchestration

Agent: `agt-ca-p6-vh17-c04-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh17-c04.md`  
Correction tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh17-c04-correction-01.md`  
Rejected prior branch: `phase6-vh17-c04-scenario`  
Rejected prior HEAD: `b01275262e97cfa66ac9e38844e3b4af77877167`  
Correction branch: `phase6-vh17-c04-scenario-correction-01`

## Executable base gate

- Required corrected VH15-R2 head: `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`
- Resolved exact `origin/phase6-vh15-validation-mode-runtime-canary` head: `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`
- VH15-R2 evidence: `dev/evidence/_ca-output-agt-ca-p6-vh15-r2-run-scoped-plan-handoff-01.md`
- Evidence gate: PASS — begins exactly `STATUS: COMPLETE`.
- Correction branch was created from exactly `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`.
- The rejected C04 branch was not used as a base and its executor implementation was not merged or cherry-picked.

## Implementation identity

- Final implementation/test SHA before correction evidence: `b2b1a7502d933fafd29bc29a79013e4db4219b76`
- Implementation tree: `ba215e5905b2173ae56848071007d511a3f7dd69`
- Implementation delta from the exact corrected base is limited to:
  1. `src/validation/scenarios/c04-ios-move-windows-move.ts`
  2. `test/validation-c04-ios-move-windows-move-correction.test.ts`
- No `src/contracts/**` file changed.
- No H6B runtime/handoff file changed.
- No frozen harness contract changed.
- No C04 acceptance text changed.
- No production synchronization source changed.

## Rejection corrected

The rejected implementation directly orchestrated preview, assertion, and execution from a C04 executor. Correction 01 removes that authority pattern entirely.

The corrected C04 package is declarative and routes every production mutation phase through the repaired H6B runtime:

1. production preview;
2. run/scenario/cycle-scoped exact plan retention inside `ValidationModeRuntime`;
3. fixed `plan-assertion-engine` evaluation of that retained plan;
4. authorization retention inside the repaired H6B handoff;
5. fixed `production-path-driver` execution consuming that retained authorization.

Scenario code:

- does not import or call `assertValidationPlan`;
- does not call `ValidationProductionPathDriver.dispatch`;
- does not construct `ValidationPlanExecutionAuthorization`;
- does not supply an `authorization` field to execution steps;
- does not override `production-path-driver`;
- does not override `plan-assertion-engine`.

## Explicit C04 authority cycles

The corrected definition uses four explicit independent authority cycles:

- `c04-authority-mobile-lineage`
- `c04-authority-windows-lineage`
- `c04-authority-mobile-move`
- `c04-authority-windows-move`

Each cycle is encoded as:

`preview-manual -> assert-observed-plan -> execute-asserted-plan`

with the same `authorityCycleId` across the three fixed-module steps.

This proves plan identity remains H6B-owned from observation through assertion/authorization/execution and prevents a scenario-local authorization bypass.

## C04 semantic mapping

The corrected package maps one-to-one to `C04-ios-move-windows-move.md`:

- internally establishes deterministic trusted fixture lineage at `test-ios-c02.md`;
- uses mobile production synchronization to establish the remote fixture;
- hands off to Windows and uses Windows production synchronization to establish the trusted two-device lineage;
- independently verifies lineage and captures the stable Drive object ID;
- performs the mobile local rename/move to `test-ios-c04-renamed.md`;
- requires an `identity-preserving-move` plan targeting remote from the old path to the new path;
- independently verifies old remote path absence, unchanged content, and preservation of the stable Drive ID;
- hands off to Windows;
- requires an `identity-preserving-move` plan targeting local from the old path to the new path;
- independently verifies final cross-device content/path/authority convergence;
- requires the old path absent on both devices and remote;
- requires both devices to retain the same Drive identity at the new path;
- requires the old path to have neither mapping nor tombstone;
- records final scenario evidence.

Delete/create, update, conflict, trash, blocked, and recovery substitutions are forbidden during the two move authority cycles.

## Scenario-owned extension points only

The C04 module overrides are limited to the existing H6B extension points owned by C04 behavior:

- `fixture-manager`
- `cross-device-coordinator`
- `state-convergence-verifier`
- `scenario-evidence-recorder`

The fixture delegate owns deterministic fixture setup and the local mobile move only.

The coordination delegate owns participant handoff only.

The verifier delegate uses the existing `StateConvergenceVerifier.verify` seam and a read-only stable-remote-identity source to establish and then re-check the Drive ID.

The evidence delegate records the final C04 evidence reference.

Neither fixed production/assertion module is present in the override object.

## Focused tests

`test/validation-c04-ios-move-windows-move-correction.test.ts` instantiates the real repaired `ValidationModeRuntime` and therefore the real H6B composition.

Focused cases:

1. `VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles`
   - PASS
   - proves all four authority cycles run through the fixed runtime;
   - proves each executed plan ID exactly equals the plan ID returned by its preceding production preview;
   - proves participant handoff ordering;
   - proves trusted lineage, mobile move, remote stable identity, old-path absence, and final cross-device authority checks are requested.

2. `VH17 correction C04 unexpected move plan fails in fixed assertion before execution`
   - PASS
   - substitutes `download-update` for the required mobile identity-preserving move;
   - runner returns FAIL from the fixed assertion path;
   - substituted plan is never executed;
   - Windows move phase is never reached.

3. `VH17 correction C04 rejects delete/create substitution and never executes substituted plan`
   - PASS
   - supplies remote trash + upload-create instead of identity-preserving move;
   - fixed assertion rejects the plan;
   - substituted plan is never executed;
   - only the two trusted-lineage plans were executed;
   - stable Drive identity had already been established before the rejected substitution.

## Verification

Direct repository cloning was unavailable in the execution environment because external DNS/network access from the shell is disabled.

Verification therefore used temporary draft PR #139 solely to trigger the repository's existing `Phase 6 Alpha Diagnostic Verification` workflow.

- Temporary PR: #139
- Final state: CLOSED / NOT MERGED
- PR head: `b2b1a7502d933fafd29bc29a79013e4db4219b76`
- PR merge commit used by GitHub Actions: `86f14b1f79bc9dfa31c859d2749b92dc55fc7cd7`
- Required workflow run: `35417801869`
- Required workflow job: `105829696912`
- Required workflow result: PASS

The `phase6-integration` target had one target-only commit not contained in the corrected VH15-R2 base. Comparison of the correction implementation head to the PR merge commit shows that this target-only delta consists only of seven tasking Markdown files:

- `dev/agents/st2a/ph6/04-lv/01-test/00-vh16-c03-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh17-c04-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh18-c05-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh19-c06-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh20-c07-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh21-c08-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh22-c09-correction-01.md`

No source, test, dependency, package, build, or workflow file differs between the correction implementation head and the CI merge tree. The CI result therefore exercises the correction implementation/test content with only tasking-document additions from the target.

Observed verification results:

- dependency install: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- complete `npm test`: PASS — 992 tests, 992 passed, 0 failed
  - focused VH17 correction test 817: PASS
  - focused VH17 correction test 818: PASS
  - focused VH17 correction test 819: PASS
- focused C1 regression group: PASS — 21 tests, 21 passed, 0 failed
- focused callback/diagnostic/OAuth/export group: PASS — 46 tests, 46 passed, 0 failed
- `npm run build`: PASS
  - `BUILD_VERIFY_ENTRYPOINT=PASS`
  - `BUILD_VERIFY_SYNTAX=PASS`
  - `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
  - `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
  - `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `npm run check`: PASS
  - second complete 992/992 test pass
  - second production build verification PASS
- `git diff --check`: PASS
- built `main.js`: 965891 bytes
- built `main.js` SHA-256: `6fa672f2f5d7e2dae249b5ea1546f18fc47386e456ff9eb83410258dea6a2583`

The first temporary-PR verification attempt, run `35417770336`, stopped at TypeScript because `allowedBackgroundKinds` inferred as `readonly string[]`. That C04-local typing defect was corrected in `b2b1a7502d933fafd29bc29a79013e4db4219b76`; the final run above passed completely.

## Auxiliary Azure workflow

The unrelated `Azure Static Web Apps CI/CD` workflow run `35417801861` failed in deployment with the existing platform-capacity condition:

`This Static Web App already has the maximum number of staging environments ... Please remove one and try again.`

It also emitted `Could not detect the language from repo.`

Correction 01 does not modify the Azure application, deployment workflow, or callback resources. This auxiliary deployment failure is not a VH17 correction blocker.

## Deviations

- No live Google Drive, Windows Obsidian, iPhone/iPad, release, promotion, or physical C04 execution was performed.
- Shell-level local verification was unavailable due disabled external network/DNS access; required repository verification was performed through the existing GitHub Actions workflow.
- The CI merge tree includes only target-side tasking Markdown beyond the exact correction implementation tree; no executable repository content differs.

## Blockers

None within VH17 Correction 01 scope.

## Final stop

Correction 01 is complete. Stop after the separate evidence commit. Do not merge, promote, release, begin VH23, or claim physical C04 PASS.
