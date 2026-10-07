STATUS: COMPLETE

# VH20 — C07 Correction 01 — Resume After Shared H6B Repair

Agent: `agt-ca-p6-vh20-c07-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Branch: `phase6-vh20-c07-scenario-correction-01`

## Base / resume gate

- Required canonical base: `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`
- Resolved `origin/phase6-vh15-validation-mode-runtime-canary`: `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`
- VH15 evidence first line: `STATUS: COMPLETE`
- VH15-R2 shared-handoff evidence: `STATUS: COMPLETE`
- Gate result: PASS
- Correction branch was created from exactly the required canonical base.
- The prior blocked C07 branch / HEAD `98d7507baab230f4dfd4caeea3a6e67198b66bfe` was not used as the implementation base.

## Implementation identity

Final implementation/test SHA before evidence:

`15010d0edb65155459cd86d94c0618c61b4edef8`

Implementation/test commits:

1. `6b31756fa7871c995ac5c1f04c89ece2fc382501` — `feat: implement VH20 C07 scenario`
2. `15010d0edb65155459cd86d94c0618c61b4edef8` — `fix: correct C07 focused test readonly type`

The second commit fixes one test-only TypeScript annotation exposed by the first verification attempt. It does not change C07 behavior or production/runtime code.

## Changed implementation/test files

Exact implementation delta from the required base to the final implementation SHA is limited to:

- `src/validation/scenarios/c07-windows-update-ios-download.ts`
- `test/validation-c07-windows-update-ios-download.test.ts`

No `src/contracts/**`, frozen H0 harness contract, shared H6B runtime, peer scenario, original C07 scenario text, or production synchronization file was modified.

## C07 implementation

C07 is implemented one-to-one with `C07-windows-update-ios-download.md` using the repaired H6B runtime composition.

The scenario deterministically self-establishes a trusted harness-owned C06-equivalent baseline for:

- target fixture: `test-win-c06.md`;
- unrelated sentinel: `c07-unrelated-sentinel.md`.

It then performs the required sequence:

1. establish target and sentinel on Windows;
2. Windows production preview/assert/execute for baseline upload;
3. hand off to mobile;
4. mobile production preview/assert/execute for baseline download;
5. objectively verify the trusted two-device baseline;
6. edit only the target on Windows and verify its new deterministic hash;
7. Windows production preview/assert/execute for exactly one target `upload-update`;
8. hand off to mobile;
9. mobile production preview/assert/execute for exactly one target `download-update`;
10. objectively verify replacement/convergence;
11. record scenario evidence through the existing evidence module seam.

The final verification contract requires:

- exact edited target bytes/hash on Windows;
- exact same target bytes/hash on mobile after replacement;
- exact same target bytes/hash on remote;
- mobile trusted BASE containing the edited target content;
- one live mobile target mapping and no tombstone;
- no outstanding mobile durable effect;
- exact unchanged sentinel bytes/state on Windows, mobile, and remote;
- cross-device target content convergence;
- live cross-device target authority without tombstone.

## Shared H6B authority lifecycle

C07 uses four explicit run-scoped authority cycles:

- `c07-establish-windows`
- `c07-establish-mobile`
- `c07-windows-update`
- `c07-mobile-download-update`

Every executable production phase flows through the frozen shared lifecycle:

`production preview -> exact retained plan -> fixed assertion -> retained assertion-derived authorization -> fixed production execution`

C07 does not override or replace either fixed shared module:

- `production-path-driver`
- `plan-assertion-engine`

C07 execute-step inputs contain only the applicable `authorityCycleId`; they do not contain or synthesize an execution authorization.

## Focused C07 coverage

The focused test file exercises the actual repaired `ValidationModeRuntime` composition.

Four C07 tests pass:

1. real H6B fixed plan handoff succeeds through trusted baseline, Windows update, mobile `download-update`, and exact convergence;
2. an unexpected production plan fails at the fixed H6B assertion before any production execution;
3. a newer preview in the same authority cycle invalidates the prior assertion-derived authorization and blocks before execution;
4. the package preserves the authoritative logical fixture name and C07-only module ownership.

The C07 tests ran successfully in both the full `npm test` invocation and the second full test invocation inside `npm run check`.

## Verification

Temporary verification PR: #138  
Final implementation head verified: `15010d0edb65155459cd86d94c0618c61b4edef8`  
Phase 6 workflow: `Phase 6 Alpha Diagnostic Verification`  
Workflow run: `35417859988`  
Job: `105829858972`  
Result: PASS

Observed results:

- dependency install: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- full `npm test`: PASS — 993 tests, 993 passed, 0 failed
- C07 focused tests in the full run: 4 passed, 0 failed
- focused C1 regression group: PASS — 21 tests, 21 passed, 0 failed
- focused callback/diagnostic/OAuth/export group: PASS — 46 tests, 46 passed, 0 failed
- `npm run build`: PASS
  - `BUILD_VERIFY_ENTRYPOINT=PASS`
  - `BUILD_VERIFY_SYNTAX=PASS`
  - `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
  - `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
  - `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `npm run check`: PASS
  - repeated full tests: 993 passed, 0 failed
  - repeated C07 focused tests: 4 passed, 0 failed
  - repeated production build: PASS
- `git diff --check`: PASS
- built `main.js`: 965891 bytes
- built `main.js` SHA-256: `6fa672f2f5d7e2dae249b5ea1546f18fc47386e456ff9eb83410258dea6a2583`

### Verification checkout reconciliation

The repository verification workflow is configured to run only for pull requests targeting `phase6-integration`. The temporary unmerged PR was therefore targeted there only for verification.

The workflow checkout was synthetic merge `0b8f3c4fd544942b57516249ff0cfb655850be13`.

Direct comparison from the final implementation SHA to that synthetic merge proves the only added differences are seven supervisor tasking Markdown files:

- `dev/agents/st2a/ph6/04-lv/01-test/00-vh16-c03-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh17-c04-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh18-c05-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh19-c06-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh20-c07-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh21-c08-correction-01.md`
- `dev/agents/st2a/ph6/04-lv/01-test/00-vh22-c09-correction-01.md`

No source, test, H6B runtime, frozen contract, or production file differs between the implementation head and the CI checkout. The CI results therefore exercise the exact C07 implementation/test content together with documentation-only supervisor tasking.

PR #138 was closed after verification and was not merged.

## Initial verification correction

The first verification run at implementation SHA `6b31756fa7871c995ac5c1f04c89ece2fc382501` stopped during TypeScript typecheck on one C07 test-only annotation:

`readonly Array<...>`

It was corrected to:

`ReadonlyArray<...>`

No production or scenario semantics changed. The corrected implementation SHA `15010d0edb65155459cd86d94c0618c61b4edef8` then passed the complete verification gate above.

## Deviations

- Verification used the repository's GitHub Actions workflow because this session did not expose a local repository shell.
- No separate C07-only command is defined in the repository workflow; the four focused C07 tests were executed and observed by name within the complete `npm test` run and again within `npm run check`.
- No physical Windows/iPhone/iPad or Google Drive validation was run.

## Blockers

None.

## Final stop

Stopped after C07 implementation, focused regression coverage, complete verification, closure of the temporary unmerged verification PR, and separate correction evidence preparation.

No merge, promotion, release, physical C07 validation, C07 physical PASS claim, VH23 work, or peer-scenario modification was performed.
