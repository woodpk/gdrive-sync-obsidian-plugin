# VH22 — PHX-CI Git-Gate Windows Normalization Repair 01

Agent: `agt-phx-ci-vh22-git-gate-windows-normalization-repair-01`  
Primary repository: `woodpk/phx-ci`  
Local framework repository: `D:\dev-tools\phx-ci`  
Task class: `BOUNDED CI-FRAMEWORK REPAIR`  
Required repair branch: `repair/vh22-git-gate-windows-normalization-01`  
Exact approved framework base: `c8792047e8a994218dc7d61f4e6da4a24fe205df`  
Approved framework line: `ci-2-r1-verification-integrity`  
Framework version: `0.2.0-dev.2`

Reference product repository: `woodpk/gdrive-sync-obsidian-plugin`  
Reference VH22 repair branch: `phase6-vh22-repository-suite-blocker-repair-01`  
Exact verified product HEAD: `29f11394f9da3f7ff5db58a8e5359cc32686acb4`  
Published CI evidence commit: `d22c96c1c53771162f374e466a32afb8dfe976c8`

Do not use GitHub Actions.

Do not modify the product repository in this task.

Do not promote or repin anything. Stop for supervisor review after the framework candidate is verified and pushed.

---

## 1. Assignment

Repair exactly two confirmed Windows defects in the PHX-CI Git/repository gate that caused an otherwise fully passing VH22 repair run to end as `Overall verification: BLOCKED`.

The product repair itself has already demonstrated:

- change-set verification: `PASS`
- repository verification: `PASS`
- focused repaired tests: 31/31 PASS
- complete repository suite: 993/993 PASS
- typecheck: PASS
- build: PASS
- repository check: PASS
- production source changes: none

The run was blocked only by the PHX-CI `check` stage.

This task repairs that framework defect only.

---

## 2. Confirmed CI Failure Evidence

At product evidence commit:

`d22c96c1c53771162f374e466a32afb8dfe976c8`

the canonical evidence reports:

```text
Change-set verification: PASS
Repository verification: PASS
Overall verification: BLOCKED
Failure classification: REPOSITORY-GATE FAILURE
```

The failing `check` stage emitted:

```text
repository expected 'C:/Users/.../gdrive-sync-obsidian-plugin' but was 'C:/Users/.../gdrive-sync-obsidian-plugin'
changed file is not allowed: ev/_ca-output.json
```

The apparent equality in the first message is caused by path-separator normalization mismatch. The missing leading `d` in the second message is caused by destructive trimming before porcelain parsing.

No product/test repair is authorized here.

---

## 3. Defect A — Git Porcelain Leading-Whitespace Corruption

Current file:

`scripts/common/Test-GitGate.ps1`

Current helper behavior joins native Git output and applies whole-output:

```powershell
.Trim()
```

Later, `git status --porcelain=v1` output is parsed with:

```powershell
$_.Substring(3)
```

For a first porcelain line such as:

```text
 M dev/_ca-output.json
```

whole-output `.Trim()` removes the significant leading status-space and produces:

```text
M dev/_ca-output.json
```

Then `Substring(3)` yields:

```text
ev/_ca-output.json
```

This exactly matches the observed failure.

### Required correction

Preserve Git porcelain status-column bytes before path extraction.

The repair must:

- stop whole-output trimming from removing significant leading porcelain whitespace;
- continue returning clean scalar values for Git commands such as `rev-parse`, `branch --show-current`, and `merge-base`;
- preserve existing allowlist/prohibited-path semantics;
- preserve forward-slash normalization of repository-relative paths;
- remain correct for tracked modifications and untracked `??` entries.

A small dedicated raw/line-preserving Git-output path or a narrowly parameterized helper is acceptable.

Do not solve this by adding special cases for `dev/_ca-output.json`.

Do not weaken the changed-file gate.

---

## 4. Defect B — Absolute Windows Repository Path Comparison

Current `Test-GitGate.ps1` supports `ExpectedRepository` as either:

- repository leaf name; or
- an absolute repository path.

On Windows:

- Git commonly reports repository roots with `/`;
- `.NET [IO.Path]::GetFullPath(...)` commonly yields `\`.

The current comparison does not normalize both sides to the same canonical representation before equality comparison.

That caused a gate failure even though the rendered expected and actual paths denoted the same directory.

### Required correction

Canonicalize absolute path comparisons before equality evaluation.

The repair must:

- preserve existing leaf-name matching behavior;
- compare absolute paths case-insensitively on Windows as the current gate intends;
- normalize both slash directions consistently;
- remove only non-semantic trailing directory separators;
- not silently resolve a different repository as equivalent;
- keep the exact mismatch diagnostic useful.

Do not disable the repository identity gate.

---

## 5. Exact Base / Drift Gate

In `D:\dev-tools\phx-ci`:

1. run `git fetch origin --prune`;
2. require:
   `origin/ci-2-r1-verification-integrity == c8792047e8a994218dc7d61f4e6da4a24fe205df`;
3. require local working tree/index clean before creating the repair branch;
4. require `VERSION == 0.2.0-dev.2`;
5. create:
   `repair/vh22-git-gate-windows-normalization-01`
   from exactly:
   `c8792047e8a994218dc7d61f4e6da4a24fe205df`.

Hard-stop on unexpected drift.

Do not reset, stash, clean, rewrite, or discard unexpected work.

---

## 6. Authorized Change Surface

Primary authorized files:

- `scripts/common/Test-GitGate.ps1`
- `tests/Invoke-VerificationIntegritySelfTest.ps1`

Minimal supporting framework test/evidence changes are allowed only if directly required.

Evidence:

- `dev/_ca-output.md`

Do not modify:

- evidence schema;
- split PASS/FAIL/BLOCKED semantics;
- Task pipeline sequencing;
- framework version;
- BRAIN/product repository;
- BRAIN bridge;
- current-build runner;
- GitHub Actions/workflows.

Do not create a new user-facing launcher/bootstrap script.

---

## 7. Mandatory Regression Tests

Extend the existing verification-integrity self-test with deterministic regressions that fail against the approved base and pass after the correction.

At minimum prove all of the following.

### R11 — first tracked porcelain entry retains exact path

Create a temporary Git fixture where the first/only working-tree status line is a tracked modification:

```text
 M allowed.txt
```

Run `Test-GitGate.ps1` with:

`-AllowedChangedFiles allowed.txt`

Require PASS.

Also prove the gate would still reject the same modified file when it is not allowlisted.

### R12 — first untracked porcelain entry retains exact path

Create an untracked file whose path is:

`dev/_ca-output.json`

Ensure it is the first/only status entry.

Run the gate with that exact allowlist path.

Require PASS and prove the path is not truncated to:

`ev/_ca-output.json`

Also prove a genuinely unallowlisted untracked file remains rejected.

### R13 — Windows absolute path separator equivalence

Use the temporary repository absolute path as `ExpectedRepository`.

Construct one representation with Windows backslashes and one with forward slashes.

Require both representations to identify the same repository successfully.

Do not bypass the leaf-name form; retain an assertion that leaf-name repository identity still passes.

### R14 — different absolute repository remains rejected

Supply a genuinely different absolute path.

Require the repository gate to fail.

This prevents path normalization from weakening repository identity.

### R15 — existing committed-delta gates remain unchanged

Existing R5-R9 behavior must continue to pass unchanged:

- allowed committed delta passes;
- out-of-scope committed delta fails;
- prohibited committed delta fails;
- BLOCKED predecessor evidence fails;
- COMPLETE predecessor evidence passes.

---

## 8. Verification

Use local PowerShell only.

GitHub Actions are prohibited.

Run at minimum:

1. focused integrity suite:
   `pwsh -NoProfile -File .\tests\Invoke-VerificationIntegritySelfTest.ps1 -FrameworkRoot D:\dev-tools\phx-ci`
2. complete framework self-tests:
   `task self-test`
3. canonical framework CI:
   `task ci`
4. the existing split-verification verification script with integration skipped:
   `pwsh -NoProfile -File .\dev\scripts\Invoke-SplitVerificationStatusVerification.ps1 -SkipIntegration`
5. `git diff --check c8792047e8a994218dc7d61f4e6da4a24fe205df...HEAD`

Acceptance requires every command to exit 0.

Inspect evidence rather than relying only on terminal color/status.

Canonical framework evidence must remain:

- change-set: PASS
- repository: PASS
- overall: PASS
- top-level: COMPLETE

No framework status semantics may change.

---

## 9. Evidence / Commit Discipline

Commit implementation/tests first.

Then write/update:

`dev/_ca-output.md`

with:

- exact approved base SHA;
- implementation SHA before evidence-only commit;
- changed-file manifest;
- exact root cause for Defect A;
- exact root cause for Defect B;
- regression-test names/results;
- complete framework self-test result;
- canonical `task ci` result;
- split-verification verification result;
- confirmation GitHub Actions were not used;
- confirmation product repository was not modified;
- any blocker.

First line must be exactly:

`STATUS: COMPLETE`

or:

`STATUS: BLOCKED`

Commit evidence separately.

Push only:

`repair/vh22-git-gate-windows-normalization-01`

Do not force-push.

---

## 10. Stop Boundary

Stop after candidate framework repair, verification, evidence commit, and branch push.

Do not:

- advance `ci-2-r1-verification-integrity`;
- merge to main/default;
- modify `woodpk/gdrive-sync-obsidian-plugin`;
- repin the BRAIN bridge;
- rerun the VH22 product repair;
- promote VH22;
- begin VH23.

Those actions require supervisor review of the exact candidate framework SHA.

---

## 11. Completion Gate

Complete only if:

1. Defect A is repaired without weakening changed-file enforcement.
2. Defect B is repaired without weakening repository identity enforcement.
3. R11-R15 all pass.
4. Existing verification-integrity tests pass.
5. Full framework self-tests pass.
6. Canonical `task ci` passes.
7. Split-verification verification with `-SkipIntegration` passes.
8. Framework evidence is COMPLETE.
9. No GitHub Actions were used.
10. No product repository changes occurred.
11. Candidate branch is pushed.
12. Exact final remote candidate SHA is reported.

If any item fails:

`BLOCKED — DO NOT REPRESENT FRAMEWORK REPAIR AS COMPLETE`

---

## 12. Final Response

Return only:

- framework repair branch;
- exact final candidate SHA;
- changed-file manifest;
- Defect A repair summary;
- Defect B repair summary;
- R11-R15 results;
- complete framework self-test result;
- canonical `task ci` result;
- split-verification verification result;
- evidence path/commit;
- confirmation no GitHub Actions were used;
- confirmation product repository was untouched;
- remaining blocker, if any.

End exactly:

`PHX-CI GIT-GATE WINDOWS NORMALIZATION REPAIR 01 COMPLETE — READY FOR SUPERVISOR REVIEW — NOT PROMOTED`
