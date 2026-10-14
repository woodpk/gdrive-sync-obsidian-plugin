# VH22/C09 — Repository-Suite Blocker Repair 01

Agent: `agt-ca-p6-vh22-repository-suite-blocker-repair-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Task class: `BOUNDED TEST/VERIFICATION REPAIR`  
Required repair branch: `phase6-vh22-repository-suite-blocker-repair-01`  
Exact repair input SHA: `5c33bb4e982fe2a211e48e3c082f2e01ce357368`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh22-repository-suite-blocker-repair-01.md`

## 1. Assignment

Repair exactly the four repository-wide automated-test failures that are currently blocking VH22 promotion after the C09 focused verification itself passed.

The accepted VH22/phx-ci result is:

- change-set verification: `PASS`
- repository verification: `FAIL`
- overall verification: `BLOCKED`
- full suite: 993 tests, 989 pass, 4 fail
- failing test numbers: 477, 478, 641, 775

This task is not a C09 scenario redesign and is not a production-behavior change unless repository evidence proves one of the four failures is caused by a genuine production defect.

Expected repair class: test portability / repository-verification correctness.

Do not use GitHub Actions.

Do not begin VH23.

---

## 2. Executable Base Gate

Run:

`git fetch origin --prune`

Require:

`origin/phase6-vh22-c09-scenario-correction-02 == 5c33bb4e982fe2a211e48e3c082f2e01ce357368`

Hard-stop on drift.

Require that commit to contain the accepted VH22 evidence with:

- change-set `PASS`
- repository `FAIL`
- overall `BLOCKED`
- exactly 4 full-suite failures

Create:

`phase6-vh22-repository-suite-blocker-repair-01`

from exactly:

`5c33bb4e982fe2a211e48e3c082f2e01ce357368`

Do not branch from a local tip, `phase6-integration`, the CI infrastructure branch, or an earlier C09 implementation SHA.

Do not reset, stash, clean, rewrite, or discard unexpected work.

---

## 3. Confirmed Failure Surface

### Failure family A — tests 477 and 478

File:

`test/phase6-alpha-portable-collision.test.ts`

Tests:

- `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
- `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`

Observed Windows mismatch:

```text
actual:   C:\vault\__brain_sync_portable_config__
expected: \vault\__brain_sync_portable_config__
```

and:

```text
actual:   C:\vault\notes\missing.md
expected: \vault\notes\missing.md
```

Repository inspection shows production `DesktopExternalReferenceGuard.resolveSafePath(...)` deliberately uses Node `resolve(...)`, while the failing test expectation is constructed with `join(...)`.

Required repair direction:

- preserve production containment semantics;
- make the test expectation platform-correct and consistent with the production resolver;
- do not weaken external-reference containment;
- do not modify production code merely to force Unix-like path formatting on Windows.

### Failure family B — test 641

File:

`test/phase6-foundation-failure-provenance.test.ts`

Test:

`foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes`

Observed failure:

```text
src/contracts/common.ts predecessor prefix changed
expected: 4048ceca9bd2a5022ededf7406a736360330572c
actual:   9621d55e03ea006f339792780716c1a95bdda01d
```

The current test hashes bytes read from the checked-out working-tree file.

Required diagnosis/repair:

1. prove whether the mismatch is caused by Windows checkout/EOL representation versus canonical Git blob bytes;
2. preserve the invariant that predecessor-approved repository bytes remain immutable;
3. if EOL sensitivity is confirmed, make the test inspect the canonical Git object/blob bytes or an equivalently exact repository representation;
4. do not normalize arbitrary text and thereby weaken byte-integrity proof;
5. do not alter `src/contracts/common.ts` or replace the approved expected predecessor hash merely to make the test green.

If the canonical Git blob itself violates the approved predecessor prefix, stop and report a genuine contract-history defect instead of rewriting authority.

### Failure family C — test 775

File:

`test/phase6-log06-diagnostic-bundle-operator-surface.test.ts`

Test:

`LOG-06 operator wiring is one local clipboard command and runtime bundle collection does not invoke Drive or synchronization`

Observed failure:

```text
The input did not match:
/this\.state \? await this\.state\.loadAuthority\(\)/

Input:
''
```

Current test extracts `exportDiagnosticBundleText(...)` with a source-text regex whose method-boundary pattern assumes LF-only line endings.

Current production method still contains the required authority/audit/attention reads.

Required repair direction:

- make the source inspection EOL-independent or otherwise robust to Windows checkout representation;
- preserve the substantive LOG-06 assertions;
- do not remove the checks that bundle collection avoids Drive/synchronization work;
- do not modify `src/product/runtime.ts` unless independent evidence proves production behavior is actually wrong.

---

## 4. Initial Authorized Change Surface

Production source changes are initially prohibited.

Authorized implementation/test files:

- `test/phase6-alpha-portable-collision.test.ts`
- `test/phase6-foundation-failure-provenance.test.ts`
- `test/phase6-log06-diagnostic-bundle-operator-surface.test.ts`

Authorized verification/evidence files:

- one repository-controlled internal PowerShell verifier under `dev/scripts/` if required;
- `dev/_ca-output.md`
- `dev/evidence/_ca-output-agt-ca-p6-vh22-repository-suite-blocker-repair-01.md`

Do not create a second user-facing current-build runner.

Do not create a bootstrap/launcher script.

The established user-facing CI flow remains one current-build runner feeding `dev/scripts/run-phx-ci.ps1`.

If any production source file is genuinely required, stop and report:

`PRODUCTION DEFECT / SCOPE EXPANSION REQUIRED`

with exact evidence before modifying production code.

---

## 5. Required Repair Semantics

The repair must make the tests portable without weakening what they prove.

### Path tests

The expected path must reflect the same absolute-resolution semantics used by production on the active platform.

Do not replace exact path assertions with vague suffix-only checks.

### Immutable-prefix test

The test must continue proving exact predecessor byte identity.

The proof must be independent of working-tree line-ending conversion.

Do not:

- update the expected hash to the Windows checkout hash;
- hash a lossy normalized representation;
- reduce the prefix length;
- remove the immutable-prefix assertion.

### LOG-06 wiring test

The test must remain capable of detecting removal of:

- state authority load;
- audit history load;
- attention load;
- prohibition on Drive/synchronization calls;
- prohibition on diagnostic clearing.

Only the brittle source-text boundary mechanism should change if that is the confirmed root cause.

---

## 6. Required Verification

Use local PowerShell only. GitHub Actions are prohibited.

If a task-local verifier is needed, it must be repository-controlled under `dev/scripts/` and must be an internal verification helper, not another current-build launcher.

Run at minimum:

1. `npm ci`
2. `npm run typecheck`
3. `npx tsc -p tsconfig.test.json`
4. the three affected compiled test files
5. complete `npm test`
6. `npm run build`
7. `npm run check`
8. `git diff --check 5c33bb4e982fe2a211e48e3c082f2e01ce357368...HEAD`

Acceptance requires:

- affected focused tests all pass;
- full suite reports exactly 993 tests unless an intentional test-count change is justified;
- expected target is 993 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- no Windows-specific exception allowlist is used to reinterpret a failing suite as passing;
- build/check/typecheck/test compilation pass;
- no production source changes;
- diff remains inside authorized scope plus evidence/internal verifier.

If the complete suite exposes a new failure not present in the accepted 4-failure baseline, stop and report it rather than broadening scope.

---

## 7. Evidence

Write:

`dev/_ca-output.md`

and:

`dev/evidence/_ca-output-agt-ca-p6-vh22-repository-suite-blocker-repair-01.md`

First line must be exactly:

`STATUS: COMPLETE`

or:

`STATUS: BLOCKED`

Record:

- exact repair input SHA;
- implementation SHA before evidence-only commit;
- final branch HEAD;
- changed-file manifest;
- root cause/disposition for each of 477, 478, 641, 775;
- exact verification commands;
- exit codes;
- focused test results;
- raw complete-suite totals;
- build/check results;
- confirmation GitHub Actions were not used;
- confirmation production source was not modified.

Commit implementation/tests first.

Commit evidence separately.

Push the repair branch.

---

## 8. Stop Boundary

Do not:

- merge or promote;
- modify CI infrastructure branches;
- modify `phx-ci`;
- change C09 scenario semantics;
- run live Drive/mobile validation;
- begin VH23;
- begin Stage 3;
- suppress known failures;
- declare VH22 promoted.

Supervisor will independently review this repair and then run the authoritative promoted phx-ci flow.

---

## 9. Final Response

Return:

- branch;
- exact final HEAD;
- changed-file manifest;
- root-cause disposition for 477/478, 641, and 775;
- focused results;
- full raw test totals;
- typecheck/build/check results;
- evidence paths;
- confirmation no production source changed;
- confirmation no GitHub Actions were used;
- blocker, if any.

End exactly:

`VH22 REPOSITORY-SUITE BLOCKER REPAIR 01 COMPLETE — READY FOR SUPERVISOR REVIEW — NOT PROMOTED`
