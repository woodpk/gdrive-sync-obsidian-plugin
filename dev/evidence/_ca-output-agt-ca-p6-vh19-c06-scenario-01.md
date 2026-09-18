STATUS: COMPLETE

# VH19 — C06 Windows Create → Mobile Download/Create

Agent: `agt-ca-p6-vh19-c06-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Branch: `phase6-vh19-c06-scenario`

## Base gate

- Required predecessor: `origin/phase6-vh15-validation-mode-runtime-canary`
- Resolved exact `BASE_SHA`: `6372184d2649e21369001ea28cc583e6636781c5`
- Required predecessor evidence: `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md`
- Gate result: PASS — predecessor evidence begins exactly `STATUS: COMPLETE`.
- The required VH19 branch was created from exactly `BASE_SHA`.
- Final implementation branch is 3 commits ahead of `BASE_SHA` and 0 commits behind.

## Implementation identity

- Implementation SHA: `721fdc8db4ea73253bb77b6130e8ed46d3daa2ec`
- Implementation/test commits:
  - `9284df0c0c419d5721c3c4f14ad9676d0ad517d0` — `feat: add C06 validation scenario`
  - `d2fc0c3fcdf84d78d14e2b16a298ccc97cf0a03e` — `test: cover C06 validation scenario`
  - `721fdc8db4ea73253bb77b6130e8ed46d3daa2ec` — `chore: keep C06 harness dependencies type-only`

## Changed files

Implementation/test delta from `BASE_SHA` to `IMPLEMENTATION_SHA`:

- `src/validation/c06-windows-create-ios-download.ts` — added
- `test/validation-c06-windows-create-ios-download.test.ts` — added

Evidence closure additionally adds only:

- `dev/evidence/_ca-output-agt-ca-p6-vh19-c06-scenario-01.md`

No file under `src/contracts/**` changed. No frozen H0 harness contract changed. The authoritative C06 scenario text and shared protocol were not modified.

## Implemented C06 contract

The C06 adapter is bound explicitly to scenario identity `C06` and fixture `test-win-c06.md`.

Execution remains scenario orchestration only:

1. create a deterministic text fixture through the existing `ValidationFixtureManager`, which retains the H1 sandbox/ownership authority;
2. independently re-hash the Windows fixture and require the descriptor hash to match;
3. request the Windows manual production preview through `ValidationProductionPathDriver`;
4. assert the observed production plan with `assertValidationPlan` before execution:
   - exactly one required `upload-create` for the C06 path;
   - only background `noop` is permitted;
   - conflicts are forbidden;
   - destructive operations are forbidden;
   - every other operation kind is forbidden;
5. execute only the returned asserted-plan authorization through the production driver;
6. before mobile handoff, call the existing `StateConvergenceVerifier` to require:
   - exact Windows fixture bytes/hash;
   - exact remote bytes/hash;
   - exactly one live remote occupant at the logical C06 path (the verifier's path-based `remote-content` proof fails on multiple occupants);
7. request the mobile manual production preview through its production driver;
8. hard-stop before execution unless the observed mobile plan contains exactly one required `download-create` for the C06 path, with only background no-op allowed and no conflict/destructive/other operation;
9. execute only the asserted mobile plan through the production driver;
10. use `StateConvergenceVerifier` for final proof of:
    - exact Windows bytes/hash;
    - exact mobile bytes/hash;
    - exactly one remote object with the same bytes/hash;
    - trusted BASE content evidence on both devices;
    - live file mapping and no tombstone on both devices;
    - no outstanding durable mutation effects on either device;
    - cross-device content/path convergence and non-tombstoned authority.

The adapter does not implement planning, execution, Drive mutation, local-vault mutation policy, or state authority. It delegates those responsibilities through the approved harness seams.

## Focused deterministic tests

`test/validation-c06-windows-create-ios-download.test.ts` adds three C06-focused cases:

1. **Success path** — deterministic fixture creation/hash, Windows `upload-create` preview/execute, pre-mobile unique-remote proof, mobile `download-create` preview/execute, and final convergence proof.
2. **Duplicate hard-stop** — when the unique-remote-object verification fails, C06 returns FAIL at `remote-single-object` and makes zero mobile production calls.
3. **Unexpected-plan hard-stop** — when mobile preview is `download-update` rather than `download-create`, C06 returns FAIL at `mobile-plan` and never submits mobile execution.

The tests also inspect the verifier requests to confirm that the remote proof is path-based without a preselected remote object ID, so the existing verifier's multiple-occupant check remains authoritative for duplicate detection.

## Verification

Verification used the repository's existing GitHub Actions `Phase 6 Alpha Diagnostic Verification` workflow because this ChatGPT execution environment cannot network-clone the repository for local npm execution.

Temporary verification PR: #128  
PR final state: CLOSED / NOT MERGED  
PR base: `phase6-integration`  
Verified implementation head: `721fdc8db4ea73253bb77b6130e8ed46d3daa2ec`  
Successful workflow run: `35357736937` (run #501)  
Job: `105641121189`  
Job result: PASS

The workflow checked out temporary PR merge commit `6cd4405990adfec1293a6d88520fc01a1e4e3e61`, recorded as the merge of implementation head `721fdc8db4ea73253bb77b6130e8ed46d3daa2ec` into `phase6-integration` base `a7620ecf698ceed827304d345f59f4cdee190482`. Repository comparison established that the integration base is an ancestor of the implementation branch (0 commits behind), so the PR merge does not introduce competing base-side content.

Observed results:

- dependency install: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- complete `npm test`: PASS — 983 tests, 983 passed, 0 failed
- C06 focused tests in the complete run:
  - test 817 — success path: PASS
  - test 818 — duplicate/single-object hard-stop: PASS
  - test 819 — unexpected mobile plan hard-stop: PASS
- existing focused C1 group: PASS — 21 tests, 21 passed, 0 failed
- existing focused callback/diagnostic/OAuth/export group: PASS — 46 tests, 46 passed, 0 failed
- production build: PASS
  - `BUILD_VERIFY_ENTRYPOINT=PASS`
  - `BUILD_VERIFY_SYNTAX=PASS`
  - `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
  - `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
  - `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `npm run check`: PASS
  - C06 tests 817–819 passed again
  - complete test pass repeated: 983 passed, 0 failed
  - production build verification repeated successfully
- `git diff --check`: PASS
- built `main.js`: 946606 bytes
- built `main.js` SHA-256: `be1662b17434539255331cd05a5cf9d73386ccec67d58dcfc01ec4e16892b639`

### Auxiliary Azure workflow

The unrelated `Azure Static Web Apps CI/CD` workflow failed during its deployment path. Its logs report both callback-app language detection failure and the existing Azure condition:

`This Static Web App already has the maximum number of staging environments ... Please remove one and try again.`

VH19 did not modify the callback application, Azure workflow, deployment configuration, or OAuth surface. The required Phase 6 verification workflow passed completely.

## Scope / deviations

- No live Google Drive synchronization was run.
- No Windows/iPhone/iPad physical validation was run.
- No physical C06 PASS is claimed by this implementation task.
- No merge or promotion was performed.
- No C07 or later scenario work was begun.
- C06 is implemented in its own scenario-owned source/test files so parallel C-series agents do not contend over shared harness/runtime files.
- No alternate synchronization engine or policy was introduced.

## Blockers

None within VH19 implementation scope.

## Stop

Stopped after C06 implementation, deterministic focused coverage, repository verification, closure of the temporary unmerged verification PR, and separate evidence recording. Physical Windows/mobile C06 execution remains a later integrated live-validation activity and is not represented as completed here.
