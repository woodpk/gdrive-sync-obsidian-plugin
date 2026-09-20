# Phase 6 Branch Consolidation / Cleanup 01 — Execution Continuation

Agent: `agt-ca-p6-branch-consolidation-cleanup-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Task class: `SUPERVISORY REPOSITORY HOUSEKEEPING — CONTINUATION`  
Predecessor tasking: `dev/agents/st2a/ph6/00-sup/phase6-branch-consolidation-cleanup-01.md`

## 0. Why the prior execution stopped

The prior stop was caused by an execution-environment capability mismatch, not by repository drift or a repository defect.

Confirmed state at the stop:

- `master` remained `b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`.
- `phase6-integration` remained `cd5b457ff5dd06b1e844b214e2d2f78593601db0`.
- all 27 retiring branch heads matched the frozen inventory;
- there were no open pull requests;
- no destructive mutation occurred;
- the connected GitHub operations available to the agent could not create tag refs or delete branch refs;
- the agent container did not have authenticated/network Git transport.

Therefore the prior task was structurally unexecutable as written because it required the agent itself to perform remote tag creation and remote branch deletion.

That limitation is now handled explicitly.

**Do not report this same capability limitation as BLOCKED again.**

The agent is now authorized and required to prepare a repository-controlled PowerShell executor for the authenticated Windows operator to run locally. The local operator step is part of the designed workflow, not a failure.

GitHub Actions remain prohibited.

---

## 1. Continuation base gate

Fetch/re-read the remote repository through the connected GitHub interface.

Require:

- `master == b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`;
- `phase6-integration == cd5b457ff5dd06b1e844b214e2d2f78593601db0` at the start of continuation, unless the only newer commits are this continuation tasking file or later cleanup-preparation commits created under this task;
- `54afee918f9f55ea828ce507b8acadcd780f6ff7` remains an ancestor of `phase6-integration`;
- the 27 retiring branch heads still match the frozen inventory in the predecessor tasking.

Hard-stop only on actual repository drift, conflicting branch-head movement, unexpected product changes, or contradictory remote state.

Lack of tag/delete capability inside the agent environment is **not** a hard-stop condition.

---

## 2. Correct execution model

Use a two-stage workflow.

### Stage A — agent-controlled, non-destructive preparation

The agent must prepare and commit the cleanup infrastructure using the connected GitHub write surface available to it.

No branch deletion and no tag creation occurs in Stage A.

Authorized integration-facing files:

- `.gitignore`
- `dev/scripts/run-phx-ci.ps1`
- `dev/test-results/.gitkeep`
- `dev/archive/phase6-legacy-history.md`
- `dev/scripts/run-phase6-branch-cleanup-01.ps1`
- `dev/evidence/_ca-output-agt-ca-p6-branch-consolidation-cleanup-01.md`
- `dev/_ca-output.md` only if required by repository-controlled verification

Do not modify `src/**` or `test/**`.

Do not create or use GitHub Actions.

Do not create another PHX-CI current-build runner.

### Stage B — authenticated local operator execution

The repository-controlled script:

`dev/scripts/run-phase6-branch-cleanup-01.ps1`

will perform the remote tag creation, remote tag verification, remote branch deletion, final branch-count verification, evidence completion, commit, and push from the user's authenticated Windows clone.

When Stage A is ready, return **USER ACTION REQUIRED**, with exactly one normal invocation command:

`./dev/scripts/run-phase6-branch-cleanup-01.ps1`

Do not call the task BLOCKED merely because this operator step is required.

After the user reports completion, resume using the connected GitHub read surface, verify the resulting remote state independently, and only then mark the task COMPLETE.

---

## 3. CI infrastructure migration — exact disposition

The CI source branch is:

`ci-3-phx-ci-obsidian-pilot@67a37b1743fd046ac95791fd33486378606f8622`

Required migration:

1. Copy the exact current core bridge:
   `dev/scripts/run-phx-ci.ps1`
2. Preserve its PHX-CI framework pin:
   `60688ea1b09f181c089ac04e33c39b3090dc9605`
3. Add `.phx-ci/` to the integration `.gitignore` without removing existing entries.
4. Add `dev/test-results/.gitkeep` if the directory otherwise has no durable tracked placeholder.

Do **not** copy the CI pilot `Taskfile.yml` unchanged.

Reason: that file is pilot-branch-specific and hard-codes:

- `PHX_EXPECTED_BRANCH: ci-3-phx-ci-obsidian-pilot`;
- the old pilot base SHA;
- a pilot-only allowed-file set.

The permanent core bridge already generates the per-build Task configuration dynamically and is the authoritative architecture. Copying the pilot `Taskfile.yml` would reintroduce a dependency on a branch that this cleanup is explicitly retiring.

Do **not** migrate:

- `dev/scripts/run-vh22-c09-phx-ci.ps1` — VH22 is closed and its target branch will be retired;
- `dev/scripts/st2a-ph6-04-lv-01-test-vh22-c09-correction-02-ci-infrastructure-promotion.ps1` — historical promotion tooling;
- CI-branch-generated `dev/_ca-output.md` merely to match that branch.

Preservation tags provide historical recoverability for all omitted CI-branch-only material.

---

## 4. Archive manifest migration

Read:

`archive/phase6-legacy-history@3bf5aa979c3c60f81f6bc35a013207f2ccf18c64:dev/archive/phase6-legacy-history.md`

Copy that file into `phase6-integration` without importing the archive branch's tree/history.

Append a retirement section stating:

- the active `archive/phase6-legacy-history` branch is being retired;
- its exact head `3bf5aa979c3c60f81f6bc35a013207f2ccf18c64` is preserved by:
  `archive/branch-cleanup-20260920/archive/phase6-legacy-history`;
- historical branch heads remain reachable through that preservation tag and the historical merge DAG.

Do not merge `archive/phase6-legacy-history` into integration.

---

## 5. Required local cleanup executor

Create:

`dev/scripts/run-phase6-branch-cleanup-01.ps1`

This is the only operator-run cleanup entrypoint.

The script must be idempotent and fail closed.

It must not use `git reset --hard`, `git clean`, stash, force-push, history rewrite, or GitHub Actions.

It must not terminate the parent terminal with `exit`.

### 5.1 Repository / authentication preflight

The script must:

1. resolve the repository root from its own location rather than assuming the caller's current directory;
2. verify the origin is `woodpk/gdrive-sync-obsidian-plugin`;
3. require a clean tracked/index state before remote mutation;
4. run `git fetch origin --prune --tags`;
5. verify `gh` is available;
6. verify authenticated GitHub access with a harmless read such as:
   `gh auth status` and/or `gh repo view woodpk/gdrive-sync-obsidian-plugin`;
7. verify the default branch is still `master`;
8. verify no open PR has a retiring branch as its head.

If authentication/network is unavailable on the user's machine, stop before creating tags or deleting branches and report the exact reason.

### 5.2 Frozen retained refs

Require before destructive operations:

- `origin/master == b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`;
- current `origin/phase6-integration` contains `54afee918f9f55ea828ce507b8acadcd780f6ff7`;
- the cleanup preparation commit containing this script is present on `origin/phase6-integration`.

Never move `master`.

### 5.3 Frozen retiring branch map

Embed the exact 27-name → SHA map from the predecessor tasking file.

Re-fetch immediately before tagging.

Every remote retiring branch must resolve exactly to its frozen SHA.

If any differs, stop before creating or deleting any remote ref.

### 5.4 Preservation tags

For every retiring branch create a **lightweight** tag:

`archive/branch-cleanup-20260920/<original-branch-name>`

The tag must point directly to the exact frozen commit SHA.

For each tag:

- if the remote tag does not exist, create it locally at the exact SHA and push it;
- if it already exists, require that it resolves to the exact SHA;
- never force-update a tag;
- after push, verify with the remote, not just local refs.

Do not delete any branch until **all 27 preservation tags** are remotely verified.

### 5.5 Branch deletion

Only after all preservation tags verify:

Delete all 27 retiring remote branches.

Never delete:

- `master`
- `phase6-integration`

Delete temporary/focused branches first, then rejected/blocked/superseded work, then completed-but-unpromoted work, then contained/promoted historical work, then CI branches, and `archive/phase6-legacy-history` last.

Use normal remote branch deletion. No force-ref rewrite.

### 5.6 Final remote-state verification

After deletion:

1. `git fetch origin --prune --tags`;
2. query GitHub/remote branches again;
3. require exactly two remote branches:
   - `master`
   - `phase6-integration`
4. verify all 27 preservation tags still resolve exactly;
5. verify `master` is unchanged;
6. verify integration contains the approved VH22 promotion merge and cleanup preparation commit;
7. verify no open PR references a deleted head.

If any final condition fails, report the exact mismatch. Do not represent cleanup as COMPLETE.

---

## 6. Evidence behavior

The operator script must maintain:

`dev/evidence/_ca-output-agt-ca-p6-branch-consolidation-cleanup-01.md`

Before destructive mutation it may write:

`STATUS: IN-PROGRESS`

After successful final verification it must write first line exactly:

`STATUS: COMPLETE`

The evidence must include:

- retained branch names and SHAs;
- all 27 retired branch names;
- all 27 frozen SHAs;
- all 27 preservation tag names;
- remote tag verification result for every tag;
- deletion result for every branch;
- final remote branch list;
- final branch count;
- CI migration result;
- archive manifest result;
- confirmation no product source/test files changed;
- confirmation no GitHub Actions were used.

After COMPLETE evidence is generated, the script may commit only the evidence/update files required by this cleanup and push that commit to `phase6-integration`.

Before committing/pushing final evidence, re-fetch and require that `origin/phase6-integration` has not advanced unexpectedly since the cleanup-preparation commit.

---

## 7. Agent verification after user execution

After the user reports that the operator script completed, independently verify through the connected GitHub read surface:

1. branch list contains exactly `master` and `phase6-integration`;
2. `master` is still `b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`;
3. integration contains `54afee918f9f55ea828ce507b8acadcd780f6ff7`;
4. the final cleanup evidence begins `STATUS: COMPLETE`;
5. CI core bridge exists on integration and pins PHX-CI `60688ea1b09f181c089ac04e33c39b3090dc9605`;
6. archive manifest exists on integration;
7. all preservation tags are readable and resolve correctly.

Only then return:

`PHASE 6 BRANCH CONSOLIDATION CLEANUP 01 COMPLETE — 2 ACTIVE BRANCHES REMAIN`

---

## 8. Immediate next action

Proceed now with Stage A.

Do not redo the already-successful 29-branch inventory analysis from scratch.

Do not stop because the agent cannot itself create/delete remote refs.

Prepare the integration housekeeping files and the single authenticated-local cleanup executor, commit them through the available connected GitHub write surface, verify their contents, and then return USER ACTION REQUIRED with the one invocation command.
