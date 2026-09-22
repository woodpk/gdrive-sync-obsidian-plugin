# VH23 — H7I C-Series Harness Integration

Agent: `agt-ca-p6-vh23-c-series-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh23-c-series-integration`  
Task path: `dev/agents/st2a/ph6/04-lv/01-test/00-vh23-h7i-c-series-integration.md`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh23-c-series-integration-01.md`  
Local verification launcher: `dev/scripts/verify-vh23-c-series-integration.ps1`

## Assignment

Integrate the six accepted-but-still-parallel C03–C08 correction lines into the current Phase 6 integration state, preserve the already-integrated accepted C09 implementation, and add the minimum shared H7 C-series registration/composition surface needed for C03–C09 to coexist in the actual H6/H6B validation runtime.

Then verify the combined C-series implementation locally through the repository's pinned centralized PHX-CI consumer workflow.

This is an integration/composition task. It is not permission to redesign C03–C09 behavior, H6B plan authority, frozen H0 contracts, production synchronization, or PHX-CI.

Do not run physical Google Drive/mobile validation.

---

## 1. Authoritative current state

The repository has completed two supervisory changes after the original VH23 task was written:

1. Phase 6 branch cleanup intentionally deleted the live VH15–VH22 scenario branches while preserving accepted heads under immutable archive tags.
2. The complete `01-test/` task set was migrated to pinned local PHX-CI verification and promoted to `phase6-integration`.

The exact supervisor-approved pre-VH23 base is:

`SUPERVISOR_BASE_SHA = 931d94f840ccb1824baed731c6e85d823173f932`

At that SHA:

- the PHX-CI prompt migration evidence is `STATUS: COMPLETE`;
- `phx-ci.json`, `Taskfile.phx-ci.yml`, and `Taskfile.yml` are present;
- the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` is absent;
- C09 source/test are already present and accepted;
- C03–C08 scenario source/test/evidence are not yet integrated;
- the accepted C03–C08 correction heads remain available through immutable archive tags.

Do **not** restore deleted VH15–VH22 branch refs.

---

## 2. Executable task-provenance and base gate

Run:

`git fetch origin --prune --tags`

Resolve:

`TASKING_REF_SHA = origin/phase6-integration`

Hard-stop unless all of the following are true:

1. `SUPERVISOR_BASE_SHA` is an ancestor of `TASKING_REF_SHA`.
2. The exact changed-path set from `SUPERVISOR_BASE_SHA..TASKING_REF_SHA` is only:
   `dev/agents/st2a/ph6/04-lv/01-test/00-vh23-h7i-c-series-integration.md`
3. `dev/evidence/_ca-output-agt-ca-p6-01-test-phx-ci-prompt-migration-01.md` at `SUPERVISOR_BASE_SHA` begins exactly `STATUS: COMPLETE`.
4. The task file being executed is byte-identical to the task file stored at `TASKING_REF_SHA`. Prove this by comparing the local task-file blob/hash with:
   `git rev-parse "${TASKING_REF_SHA}:dev/agents/st2a/ph6/04-lv/01-test/00-vh23-h7i-c-series-integration.md"`
5. `phx-ci.json`, `Taskfile.phx-ci.yml`, and `Taskfile.yml` exist at `TASKING_REF_SHA`.
6. `dev/scripts/run-phx-ci.ps1` does not exist at `TASKING_REF_SHA`.
7. The accepted VH22 repository-repair head `f94cadc247230164a5a5bac3aaef4111b2ea5b8f` is an ancestor of `TASKING_REF_SHA`.
8. `phase6-vh23-c-series-integration` does not already exist on origin.

If any gate fails, stop with `STATUS: BLOCKED`. Do not substitute `master`, an old VH15 branch, a deleted scenario branch, or another branch tip.

Create `phase6-vh23-c-series-integration` from exactly `TASKING_REF_SHA`.

Record both `SUPERVISOR_BASE_SHA` and `TASKING_REF_SHA` in evidence.

---

## 3. Immutable accepted C-series inputs

The repaired H6B common ancestor is:

`VH15_R2_SHA = fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

Verify every archive ref resolves to the exact SHA below.

| Scenario | Immutable archive ref | Accepted archive HEAD | Accepted implementation/test SHA |
|---|---|---|---|
| C03 | `archive/branch-cleanup-20260920/phase6-vh16-c03-scenario-correction-01` | `6f9b5a0225c5bce5c07bedb7904edca39035f242` | `5f99e1dad3675d1f69e22cbd0c2a22d7b1b3a054` |
| C04 | `archive/branch-cleanup-20260920/phase6-vh17-c04-scenario-correction-01` | `68ce67099c18e3f8830d4efebb144706471a7814` | `b2b1a7502d933fafd29bc29a79013e4db4219b76` |
| C05 | `archive/branch-cleanup-20260920/phase6-vh18-c05-scenario-correction-01` | `70ba6d6bf0da537b630e8642d84823daeeb624f5` | `8f97550f15592113d35d326bbfdf87dd675f2ca3` |
| C06 | `archive/branch-cleanup-20260920/phase6-vh19-c06-scenario-correction-01` | `fb983f9a67523b625998df7bf5a6dba870e5bb47` | `a4271fa48a7bb2aa9b456bed7552ac4c74661a2d` |
| C07 | `archive/branch-cleanup-20260920/phase6-vh20-c07-scenario-correction-01` | `ffeedf1cbfd334381e2316a8326c6daaa5e03bf8` | `15010d0edb65155459cd86d94c0618c61b4edef8` |
| C08 | `archive/branch-cleanup-20260920/phase6-vh21-c08-scenario-correction-01` | `6aafd865a37f55d87b5a57c03d53c0f847363a94` | `f6f8719c5aa64818170e120731b3ff0706e7e2df` |

Also verify:

- C09 correction-02 archive:
  `archive/branch-cleanup-20260920/phase6-vh22-c09-scenario-correction-02`
  → `5c33bb4e982fe2a211e48e3c082f2e01ce357368`
- accepted VH22 repository-suite repair archive:
  `archive/branch-cleanup-20260920/phase6-vh22-repository-suite-blocker-repair-01`
  → `f94cadc247230164a5a5bac3aaef4111b2ea5b8f`

C09 is already represented by the current integration ancestry. Do **not** merge either C09 archive ref into VH23.

---

## 4. Mandatory archive-scope proof before any merge

The accepted C03–C08 archive heads were independently audited by the supervisor and are expected to differ from `VH15_R2_SHA` only by their own scenario source, focused test, and evidence file.

Re-prove that invariant locally before merging.

The exact required delta for each archive HEAD is:

### C03
- `src/validation/scenarios/c03-ios-update-windows-download.ts`
- `test/validation-c03-ios-update-windows-download.test.ts`
- `dev/evidence/_ca-output-agt-ca-p6-vh16-c03-scenario-01-correction-01.md`

### C04
- `src/validation/scenarios/c04-ios-move-windows-move.ts`
- `test/validation-c04-ios-move-windows-move-correction.test.ts`
- `dev/evidence/_ca-output-agt-ca-p6-vh17-c04-scenario-01-correction-01.md`

### C05
- `src/validation/scenarios/c05-ios-delete-windows-trash.ts`
- `test/validation-c05-ios-delete-windows-trash.test.ts`
- `dev/evidence/_ca-output-agt-ca-p6-vh18-c05-scenario-01-correction-01.md`

### C06
- `src/validation/scenarios/c06-windows-create-ios-download.ts`
- `test/validation-c06-h6b-registration.test.ts`
- `dev/evidence/_ca-output-agt-ca-p6-vh19-c06-scenario-01-correction-01.md`

### C07
- `src/validation/scenarios/c07-windows-update-ios-download.ts`
- `test/validation-c07-windows-update-ios-download.test.ts`
- `dev/evidence/_ca-output-agt-ca-p6-vh20-c07-scenario-01-correction-01.md`

### C08
- `src/validation/scenarios/c08-windows-move-ios-move.ts`
- `test/validation-c08-windows-move-ios-move.test.ts`
- `dev/evidence/_ca-output-agt-ca-p6-vh21-c08-scenario-01-correction-01.md`

For each scenario:

1. require the archive evidence file first line to be exactly `STATUS: COMPLETE`;
2. compare `VH15_R2_SHA..<archive HEAD>`;
3. require the changed-path set to equal exactly the three paths listed above;
4. compare `VH15_R2_SHA..<accepted implementation/test SHA>`;
5. require the changed-path set to equal exactly the scenario source + focused test paths only.

If any archive contains any additional changed path, stop with:

`ARCHIVE SCOPE DRIFT — SUPERVISOR REVIEW REQUIRED`

Do not merge it.

---

## 5. Current-integration pre-merge proof

Before merging C03–C08, prove the VH23 base has:

- `src/validation/scenarios/c09-windows-delete-ios-trash.ts`
- `test/validation-c09-windows-delete-ios-trash.test.ts`

and does **not** yet have any C03–C08 scenario source/test/evidence paths listed in Section 4.

Require `f94cadc247230164a5a5bac3aaef4111b2ea5b8f` to be an ancestor of `TASKING_REF_SHA`.

For C09 acceptance authority, use the accepted VH22 repository-suite history:

`dev/test-results/20260920T044300Z-vh22-repository-suite-blocker-repair-01-29f11394f9da.md`

at the archived VH22 repair ref. It must begin `STATUS: COMPLETE` and report:

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: PASS

Do not treat the earlier blocked C09 correction evidence as the final acceptance authority.

---

## 6. Integration procedure — preserve accepted history

Merge the exact accepted archive HEADs in scenario order:

1. C03
2. C04
3. C05
4. C06
5. C07
6. C08

Use true non-fast-forward merges of the exact immutable archive refs so accepted history remains reachable.

Do not:

- merge deleted/original scenario branch names;
- cherry-pick reconstructed patches;
- copy files manually in place of the accepted histories;
- rebase the archive lines;
- re-merge C09.

Because the accepted archive scopes are disjoint from current tasking/PHX-CI files, **any merge conflict is unexpected**.

If any C03–C08 merge conflicts:

1. abort that merge;
2. do not manually resolve it;
3. record the conflicting paths;
4. stop with `STATUS: BLOCKED — UNEXPECTED ACCEPTED-LINE CONFLICT`.

After each successful merge:

- require no unmerged paths;
- run `git diff --check`;
- record the merge commit SHA;
- prove the before→after changed-path set is only that scenario's three accepted paths;
- push the VH23 branch before beginning the next merge.

After all six merges, prove that the cumulative merge-only delta from `TASKING_REF_SHA` consists exactly of the 18 accepted C03–C08 paths and nothing else.

---

## 7. H7 C-series composition work

After the six accepted lines are merged cleanly, implement only the minimum shared H7 composition needed for C03–C09.

Use the existing H6/H6B extension architecture:

- `ValidationModeRuntime`
- immutable `ValidationRunnerScenarioDefinition` registrations;
- the existing module-adapter/prerequisite seams;
- fixed H6B `production-path-driver`;
- fixed H6B `plan-assertion-engine`.

Required behavior:

1. C03, C04, C05, C06, C07, C08, and C09 are each registered exactly once.
2. The deterministic C-series suite order is exactly:
   `C03 → C04 → C05 → C06 → C07 → C08 → C09`.
3. Every scenario remains independently invocable by its own scenario ID.
4. Scenario-owned prerequisite behavior and non-fixed module delegates are routed by the current run's scenario identity without state/delegate bleed between scenarios.
5. Fixed H6B production/assertion bindings remain global and non-overridable.
6. No scenario may supply caller-created execution authorization.
7. No duplicate scenario ID, duplicate alias, or alternate C-series runner/registry is introduced.
8. C09 remains the exact already-integrated accepted implementation.
9. Accepted C03–C08 scenario semantics remain unchanged.

Prefer a new bounded shared C-series composition/registry surface plus focused integration tests.

Do not modify the accepted C03–C09 scenario source files merely to simplify central composition.

If central composition cannot be completed without changing an accepted scenario's behavior, H6B authority semantics, frozen H0 contracts, or production synchronization semantics, stop with:

`CONTRACT CHANGE REQUEST`

Do not work around the incompatibility locally.

---

## 8. Frozen boundaries

Read and apply:

- the Phase 6 live-validation harness plan;
- DEC-301–DEC-310;
- `00-live-validation-protocol.md`;
- the current PHX-CI consumer configuration;
- VH15-R2 evidence;
- all accepted C03–C08 correction evidence;
- accepted VH22/C09 repository-suite evidence;
- current H6/H6B runner/runtime/module-adapter source and tests.

Do not modify:

- `src/contracts/**`;
- frozen H0 contract semantics;
- H6B plan-retention/assertion/authorization semantics;
- production synchronization semantics;
- scenario acceptance/specification files C03–C09;
- PHX-CI framework code;
- `phx-ci.json`;
- `Taskfile.phx-ci.yml`;
- `Taskfile.yml`;
- GitHub Actions workflows.

Do not restore `dev/scripts/run-phx-ci.ps1`.

Do not run physical Drive/mobile validation.

---

## 9. Required focused integration tests

Add focused H7 integration tests that prove at minimum:

- all seven IDs C03–C09 are registered exactly once;
- deterministic suite order is C03 through C09;
- each scenario can be selected independently;
- duplicate registration fails closed;
- scenario-specific non-fixed module routing cannot execute another scenario's operation accidentally;
- prerequisite routing does not bleed between scenarios;
- fixed `production-path-driver` and `plan-assertion-engine` cannot be replaced by the C-series composition;
- representative unexpected-plan execution remains stopped before production execution;
- C09 remains the current accepted C09 implementation and is not replaced by an archived predecessor;
- C03–C08 accepted focused suites remain green after combination.

Do not claim these automated tests are physical scenario PASS results.

---

## 10. Local PHX-CI verification

GitHub Actions are prohibited.

Create:

`dev/scripts/verify-vh23-c-series-integration.ps1`

This must be a **thin task-specific launcher** over the centralized PHX-CI framework pinned by `phx-ci.json.framework.sha`. It must not duplicate PHX-CI core sequencing.

The launcher must:

1. run locally under PowerShell;
2. validate the PHX-CI checkout HEAD exactly equals `phx-ci.json.framework.sha`;
3. verify the exact VH23 branch, `TASKING_REF_SHA`, and implementation HEAD;
4. preserve the user's active/control checkout — no reset, clean, switch, or stash;
5. run the required focused C03–C09 integration/change-set tests;
6. run complete repository verification through PHX-CI;
7. require applicable typecheck, test compilation, focused tests, full repository tests, build, repository checks, artifact checks, and `git diff --check`;
8. capture complete command output and exit codes;
9. write canonical PHX-CI evidence to:
   - `dev/_ca-output.md`
   - `dev/_ca-output.json`
10. preserve historical run evidence under `dev/test-results/`;
11. require:
   - Change-set verification: PASS
   - Repository verification: PASS
   - Overall verification: PASS
12. therefore require final `PASS / PASS / PASS`.

If the agent execution environment cannot run the required local PowerShell/PHX-CI verification, do not substitute GitHub Actions and do not mark COMPLETE.

Instead:

- commit/push the implementation and verifier;
- write `STATUS: BLOCKED` evidence describing only the environmental verification blocker;
- provide a small Windows PowerShell 5.1-compatible paste-ready bootstrap that creates a detached temporary worktree and invokes the committed verifier through `pwsh`;
- stop for local verification.

---

## 11. Commit discipline

Use recoverable commits.

At minimum:

1. one merge commit for each accepted C03–C08 archive line;
2. H7 composition/registry implementation and focused tests;
3. VH23 verification launcher;
4. verification/evidence-only commit after authoritative local results are known.

Do not rewrite accepted archive history.

Do not force-push.

---

## 12. VH23 evidence

Write:

`dev/evidence/_ca-output-agt-ca-p6-vh23-c-series-integration-01.md`

First line exactly:

`STATUS: COMPLETE`

or:

`STATUS: BLOCKED`

Record at minimum:

- `SUPERVISOR_BASE_SHA`;
- resolved `TASKING_REF_SHA`;
- proof that the executed task file matched `TASKING_REF_SHA`;
- PHX-CI migration evidence status;
- every archive ref and verified archive HEAD;
- every accepted implementation/test SHA;
- archive-scope proof for C03–C08;
- six merge commit SHAs;
- confirmation C09 was inherited and not re-merged;
- H7 composition files changed;
- focused integration test results;
- exact implementation SHA before final evidence;
- PHX-CI change-set status;
- PHX-CI repository status;
- PHX-CI overall status;
- build/repository/artifact results;
- `git diff --check` result;
- deviations;
- blockers.

`STATUS: COMPLETE` is forbidden unless:

- all six accepted C03–C08 lines were integrated;
- C03–C09 are coherently registered exactly once;
- focused integration gates pass;
- PHX-CI reports `PASS / PASS / PASS`;
- no frozen boundary was violated.

---

## 13. Final stop

Push the VH23 branch and evidence, then stop.

Do not:

- promote to `phase6-integration`;
- merge VH23 into another branch;
- release;
- run physical Drive/mobile validation;
- claim physical C03–C09 PASS;
- begin VH24.
