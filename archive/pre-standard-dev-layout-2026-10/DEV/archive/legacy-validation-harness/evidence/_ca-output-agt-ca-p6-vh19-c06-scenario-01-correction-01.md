STATUS: COMPLETE

# VH19 — C06 Correction 01 — Register Through Actual H6B Runtime

Agent: `agt-ca-p6-vh19-c06-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Correction branch: `phase6-vh19-c06-scenario-correction-01`

## Base / rejection isolation

- Required canonical VH15 HEAD / `BASE_SHA`: `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`
- Canonical branch resolved exactly to that SHA at execution.
- VH15 evidence at the canonical head begins exactly `STATUS: COMPLETE`.
- VH15-R2 handoff evidence: `dev/evidence/_ca-output-agt-ca-p6-vh15-r2-run-scoped-plan-handoff-01.md`
- VH15-R2 evidence begins exactly `STATUS: COMPLETE`.
- The correction branch was created directly from exactly `BASE_SHA`.
- The rejected branch `phase6-vh19-c06-scenario` / rejected HEAD `c69342b4ac4a9cdc000a75cd39e97aca5af36ca6` was not used as a base, merged, cherry-picked, or promoted.

## Implementation identity

Exact implementation/test SHA before evidence:

`a4271fa48a7bb2aa9b456bed7552ac4c74661a2d`

Relative to exact `BASE_SHA`, the implementation is 6 commits ahead, 0 behind, and changes only:

1. `src/validation/scenarios/c06-windows-create-ios-download.ts`
2. `test/validation-c06-h6b-registration.test.ts`

No repaired H6B shared source changed.  
No frozen H0 contract changed.  
No file under `src/contracts/**` changed.  
No C06 acceptance text or shared protocol changed.  
No peer scenario changed.

The correction evidence file is committed separately after the implementation/test SHA.

## Corrected architecture

C06 is no longer implemented as an alternate runnable scenario class or parallel runner.

`createC06ValidationModeRegistration(...)` supplies the established H6B extension surfaces consumed by the actual repaired `ValidationModeRuntime`:

- `definitions`: exactly one `C06_SCENARIO_DEFINITION`;
- `moduleOverrides`: only C06-owned non-fixed fixture, verifier, cross-device handoff, and evidence delegates.

The registration does **not** supply either fixed H6B binding:

- no `production-path-driver` override;
- no `plan-assertion-engine` override.

The C06 source does not import `ValidationProductionPathDriver` or `assertValidationPlan`, does not instantiate another scenario runner, and does not create or pass a `ValidationPlanExecutionAuthorization`.

Global multi-scenario routing/registry work remains outside this correction and was not begun.

## Fixed H6B plan-authority lifecycle

C06 has two explicit and independent authority cycles:

- Windows cycle: `c06:windows-sync`
- Mobile cycle: `c06:mobile-sync`

Each synchronization phase is encoded declaratively as the repaired H6B lifecycle:

1. fixed `production-path-driver` / `preview-manual` with the phase's `authorityCycleId`;
2. fixed `plan-assertion-engine` / `assert-observed-plan` with the same cycle;
3. fixed `production-path-driver` / `execute-asserted-plan` with the same cycle.

Execution-step input contains only `authorityCycleId`; caller-supplied `authorization` is absent.

Therefore the exact plan observed by the fixed H6B production preview is retained by the repaired runtime, that retained plan is evaluated by the fixed H6B assertion binding, the resulting retained authorization is consumed by fixed H6B execution, and the fixed production driver independently enforces the retained plan ID.

## C06 one-to-one behavior

The registered scenario preserves the authoritative `C06-windows-create-ios-download.md` behavior:

1. Create deterministic Windows text fixture `test-win-c06.md` through the harness fixture-manager seam.
2. Re-hash the fixture and require its exact deterministic descriptor hash.
3. Windows production cycle requires exactly one non-destructive `upload-create` for the registered C06 fixture path; only background `noop` is permitted.
4. Conflicts, destructive actions, blocked/recovery operations, and every unexpected production operation are forbidden by the fixed assertion expectation.
5. After Windows execution, the existing verifier seam must establish exact Windows bytes/hash and exact remote bytes/hash.
6. The remote-content assertion intentionally omits a preselected remote object ID, so the fixed `StateConvergenceVerifier` requires exactly one occupant at the C06 logical path and fails on duplicate occupants.
7. Only after unique-remote proof succeeds is the stable remote object ID resolved and the run handed off to mobile.
8. Mobile production cycle requires exactly one non-destructive `download-create` for the same C06 path and hard-stops on any unexpected plan.
9. Final verification requires:
   - identical Windows/mobile bytes and hash;
   - exactly one remote object with the same bytes/hash;
   - trusted BASE content and the same stable remote object identity on both devices;
   - one live file mapping and no tombstone on both devices;
   - no outstanding durable effects on either device;
   - cross-device path/content/authority convergence.
10. PASS evidence is recorded only after both objective verification phases pass.

No live Google Drive or physical device validation was performed by this correction.

## Focused actual-runtime coverage

`test/validation-c06-h6b-registration.test.ts` uses the real repaired `ValidationModeRuntime`, the real H6A runner composition, and the C06 registration object.

### Test 817 — actual runtime discovery/execution

`VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles`

Proves:

- disabled runtime exposes no installed scenario;
- after explicit validation-mode enablement, `installedScenarioIds()` discovers exactly `C06`;
- `startScenario("C06")` runs through the actual H6B composition and reaches PASS under deterministic test doubles for physical module boundaries;
- production call ordering is exactly:
  - Windows preview;
  - Windows fixed execute;
  - mobile preview;
  - mobile fixed execute;
- executed plan IDs are exactly the two plan IDs returned by the corresponding production previews;
- the registration contains no production-driver or assertion-engine override;
- both execute steps contain only their explicit authority-cycle identifier and no authorization;
- deterministic fixture identity/name/hash, unique-remote proof, handoff, final stable authority, and evidence recording are exercised.

### Test 818 — duplicate hard stop

`VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution`

Proves that failure of the path-based unique-remote-object verification terminates C06 after Windows execution and before mobile handoff, mobile preview, or mobile execution.

### Test 819 — unexpected mobile plan hard stop

`VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution`

Supplies `download-update` where C06 requires `download-create` and proves the **fixed H6B assertion binding** returns FAIL before any mobile execution request. Only the earlier Windows previewed plan is executed.

## Verification

The repository's `Phase 6 Alpha Diagnostic Verification` workflow is configured to trigger only for pull requests targeting `phase6-integration`.

The correction implementation branch itself remained based on exact canonical VH15-R2. A temporary draft PR was opened against `phase6-integration` solely to execute the existing CI workflow and was not merged.

Temporary CI PR: **#143**  
Final PR state: **CLOSED / NOT MERGED**  
Verified correction head: `a4271fa48a7bb2aa9b456bed7552ac4c74661a2d`  
CI target SHA for the temporary verification PR: `4d4042aa168a9b83b00a929556a736dc9db7bd3e`  
Synthetic PR merge checked out by the successful workflow: `080850beb63b66e4bab540b92d7664de18155e85`  
Workflow: `Phase 6 Alpha Diagnostic Verification`  
Run: **35417958103** / run #533  
Job: **105830131644**  
Result: **SUCCESS**

Observed required results:

- dependency install: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- complete `npm test`: **992 passed / 0 failed**
- C06 focused cases in the complete run:
  - test 817: PASS
  - test 818: PASS
  - test 819: PASS
- existing focused C1 group: **21 passed / 0 failed**
- existing focused callback/diagnostic/OAuth/export group: **46 passed / 0 failed**
- production build: PASS
  - `BUILD_VERIFY_ENTRYPOINT=PASS`
  - `BUILD_VERIFY_SYNTAX=PASS`
  - `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
  - `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
  - `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `npm run check`: PASS
  - complete suite repeated: **992 passed / 0 failed**
  - C06 tests 817–819 passed again
  - production build verification repeated successfully
- `git diff --check`: PASS
- built `main.js`: **965891 bytes**
- built `main.js` SHA-256: `6fa672f2f5d7e2dae249b5ea1546f18fc47386e456ff9eb83410258dea6a2583`

The unrelated Azure Static Web Apps workflow also triggered from temporary PR activity and produced failures. This correction did not modify the Azure callback application, Azure workflow, deployment configuration, or OAuth surface; those auxiliary workflow results are outside VH19 Correction 01 acceptance.

## Verification corrections before final implementation SHA

Two CI attempts before the successful final implementation exposed correction-local defects and were repaired before `IMPLEMENTATION_SHA` was frozen:

1. a generated import contained literal `\\n` text and failed TypeScript parsing;
2. one helper retained an overly broad nullable delegate-return type and failed strict typechecking.

Both were confined to the new C06 source. The successful verification above ran after both corrections. No H6B/shared/product contract was changed to resolve them.

## Deviations

- No local network-cloned repository shell is available in this execution environment, so required npm/check/build verification was executed using the repository's existing GitHub Actions workflow.
- Because that workflow triggers only on `phase6-integration`, CI necessarily exercised the correction through an unmerged synthetic PR merge. The correction branch ancestry itself remains exactly rooted at canonical VH15-R2, and the canonical-base implementation diff remains limited to the two C06 files listed above.
- Global C-series aggregation/routing was not implemented because the task explicitly prohibits beginning VH23.

## Blockers

None within VH19 Correction 01 scope.

## Final stop

VH19 C06 Correction 01 stops here. No merge, promotion, release, live Drive/mobile validation, physical PASS claim, VH23 work, or peer-scenario modification was performed.
