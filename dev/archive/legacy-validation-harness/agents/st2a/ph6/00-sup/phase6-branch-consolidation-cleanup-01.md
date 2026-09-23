# Phase 6 Branch Consolidation / Cleanup 01

Agent: `agt-ca-p6-branch-consolidation-cleanup-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Task class: `SUPERVISORY REPOSITORY HOUSEKEEPING`  
Execution authority: branch/history cleanup only  
Target final active remote branch count: **2**

Final branches that must remain:

1. `master`
2. `phase6-integration`

No other remote branch may remain when this task completes.

This task must preserve recoverability of every retired branch head and must not promote unreviewed product work merely to reduce branch count.

GitHub Actions must not be used.

---

## 1. Current authoritative state

Supervisor-reviewed state immediately before this tasking file:

- `master` head: `b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`
- approved/promoted VH22 integration merge: `54afee918f9f55ea828ce507b8acadcd780f6ff7`
- `phase6-integration` contains `master` as an ancestor.
- VH22 is accepted and promoted.
- No open pull requests were present at review time.
- There were 29 remote branches.

Because this tasking file itself is committed on `phase6-integration`, do not require the branch to remain exactly at `54afee...`. At execution, require that:

1. `origin/phase6-integration` contains `54afee918f9f55ea828ce507b8acadcd780f6ff7` as an ancestor;
2. this tasking file exists on the resolved integration head;
3. no unexpected product/source changes have appeared after that promotion other than explicit supervisory/tasking or cleanup preparation.

Hard-stop on unexplained drift.

Do not force-push, reset, rewrite, or rebase either retained branch.

---

## 2. Frozen branch inventory

Re-fetch all remote refs before changing anything.

The following branch heads were observed during supervisor review. Every retiring branch must still resolve to the listed SHA unless it has moved only because of a supervisor-authored cleanup/tasking commit that is explicitly explained and reviewed.

| Branch | Reviewed head | Disposition |
|---|---|---|
| `master` | `b1b3a4bd70cd14be49ae9085a8305f5825fccf4f` | KEEP |
| `phase6-integration` | contains promotion merge `54afee918f9f55ea828ce507b8acadcd780f6ff7` | KEEP |
| `archive/phase6-legacy-history` | `3bf5aa979c3c60f81f6bc35a013207f2ccf18c64` | TAG/PRESERVE, THEN DELETE |
| `ci-3-phx-ci-obsidian-pilot` | `67a37b1743fd046ac95791fd33486378606f8622` | MIGRATE REQUIRED CI ASSETS, TAG, DELETE |
| `ci-4-split-verification-status` | `00627e6e6f3d670bbf6555303b451a69d9faf4ad` | TAG, DELETE |
| `phase6-vh14-module-integration-runner` | `8c3d6e79db0d7dcf882d0a66a9bbd8b39bc3a30b` | TAG, DELETE |
| `phase6-vh15-r2-promotion-tooling` | `11933c2951c28c97e0a900e66c369bfb98bbbb09` | TAG, DELETE |
| `phase6-vh15-r2-run-scoped-plan-handoff` | `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e` | TAG, DELETE |
| `phase6-vh15-r3-runtime-derived-plan-identity-binding` | `a3e222379b52bfce38682f4059445a3a6c8dac1b` | TAG, DELETE; DO NOT PROMOTE |
| `phase6-vh15-validation-mode-runtime-canary` | `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e` | TAG, DELETE |
| `phase6-vh16-c03-scenario` | `90e6e0ad6121e32e426828126840ebaeb2a24cb7` | REJECTED/SUPERSEDED; TAG, DELETE |
| `phase6-vh16-c03-scenario-correction-01` | `6f9b5a0225c5bce5c07bedb7904edca39035f242` | COMPLETE BUT NOT SUPERVISOR-PROMOTED; TAG, DELETE |
| `phase6-vh17-c04-scenario` | `b01275262e97cfa66ac9e38844e3b4af77877167` | REJECTED/SUPERSEDED; TAG, DELETE |
| `phase6-vh17-c04-scenario-correction-01` | `68ce67099c18e3f8830d4efebb144706471a7814` | COMPLETE BUT NOT SUPERVISOR-PROMOTED; TAG, DELETE |
| `phase6-vh18-c05-scenario` | `dce455831e430ef1a24377372863ef2d1ad54f6a` | REJECTED/SUPERSEDED; TAG, DELETE |
| `phase6-vh18-c05-scenario-correction-01` | `70ba6d6bf0da537b630e8642d84823daeeb624f5` | COMPLETE BUT NOT SUPERVISOR-PROMOTED; TAG, DELETE |
| `phase6-vh19-c06-scenario` | `c69342b4ac4a9cdc000a75cd39e97aca5af36ca6` | REJECTED/SUPERSEDED; TAG, DELETE |
| `phase6-vh19-c06-scenario-correction-01` | `fb983f9a67523b625998df7bf5a6dba870e5bb47` | COMPLETE BUT NOT SUPERVISOR-PROMOTED; TAG, DELETE |
| `phase6-vh20-c07-scenario` | `98d7507baab230f4dfd4caeea3a6e67198b66bfe` | BLOCKED/SUPERSEDED; TAG, DELETE |
| `phase6-vh20-c07-scenario-correction-01` | `ffeedf1cbfd334381e2316a8326c6daaa5e03bf8` | COMPLETE BUT NOT SUPERVISOR-PROMOTED; TAG, DELETE |
| `phase6-vh21-c08-scenario` | `b281c74f05094e15410d22cfbcf878f0d9495e1f` | BLOCKED/SUPERSEDED; TAG, DELETE |
| `phase6-vh21-c08-scenario-correction-01` | `6aafd865a37f55d87b5a57c03d53c0f847363a94` | COMPLETE BUT NOT SUPERVISOR-PROMOTED; TAG, DELETE |
| `phase6-vh22-c09-scenario` | `49f31d6e3c6661b8a1a05922ed5f8b4514b835fc` | REJECTED/SUPERSEDED; TAG, DELETE |
| `phase6-vh22-c09-scenario-correction-01` | `cbd8946ef6defc20ab3286e4f540877c16c606fc` | REJECTED/SUPERSEDED; TAG, DELETE |
| `phase6-vh22-c09-scenario-correction-02` | `5c33bb4e982fe2a211e48e3c082f2e01ce357368` | ALREADY CONTAINED IN INTEGRATION; TAG, DELETE |
| `phase6-vh22-repository-suite-blocker-repair-01` | `f94cadc247230164a5a5bac3aaef4111b2ea5b8f` | APPROVED/PROMOTED; TAG, DELETE |
| `temp-vh21-c08-focused-verification-01` | `bf636fc603a5410f709b7ad2821400a1d78ef896` | TEMPORARY; TAG, DELETE |
| `tmp-vh22-c09-correction-focused-verification` | `770ee083b048cdbc705c7fb7cd787f6050ad79f5` | TEMPORARY; TAG, DELETE |
| `tmp-vh22-c09-focused-verification` | `0c2d5d3bf640a7d6ff232b20ded884a715020aa7` | TEMPORARY; TAG, DELETE |

If any retiring branch head has changed, stop before deletion and report the drift.

---

## 3. Preservation rule — mandatory before branch deletion

Every retiring branch, including branches already reachable from `phase6-integration`, must first receive a permanent recovery tag at its exact frozen tip.

Use this namespace:

`archive/branch-cleanup-20260920/<original-branch-name>`

Example:

`archive/branch-cleanup-20260920/phase6-vh16-c03-scenario-correction-01`

Requirements:

1. Tag the exact remote branch head SHA, not a local approximation.
2. Push the tag successfully before deleting that branch.
3. Re-fetch and verify the remote tag resolves to the exact frozen SHA.
4. If a tag name already exists, require it to resolve to the exact same SHA; otherwise hard-stop.
5. Never move or force-update a preservation tag.
6. Record branch → SHA → preservation tag in cleanup evidence.

The tag for `archive/phase6-legacy-history` preserves that branch's entire historical reachability DAG. Do not merge the archival branch into `master` or `phase6-integration`.

---

## 4. Do not merge unreviewed scenario branches merely for cleanup

Branch-count reduction is not authorization to promote product work.

In particular, the COMPLETE correction branches for VH16 through VH21 have not been supervisor-promoted into `phase6-integration` in this session.

Therefore:

- do not merge or cherry-pick them during housekeeping;
- preserve each exact head by the required archival tag;
- delete the active branch only after its tag is verified;
- future supervision may recreate a working branch exactly from its tag if that work is later reviewed.

Rejected, BLOCKED, superseded, and temporary branches are likewise preserved by tag and then deleted, not merged.

---

## 5. CI infrastructure consolidation required before deleting CI branches

The local CI bridge is generic repository infrastructure and must not remain dependent on a dedicated CI branch.

Before deleting `ci-3-phx-ci-obsidian-pilot`, migrate the current required CI infrastructure into `phase6-integration`.

Authoritative source for migration:

`ci-3-phx-ci-obsidian-pilot@67a37b1743fd046ac95791fd33486378606f8622`

At minimum inspect and reconcile:

- `.gitignore`
- `Taskfile.yml`
- `dev/scripts/run-phx-ci.ps1`
- `dev/test-results/.gitkeep`

The final core bridge must retain the corrected PHX-CI framework pin:

`60688ea1b09f181c089ac04e33c39b3090dc9605`

Do **not** blindly merge the CI branch.

Do **not** import CI-branch-only transient evidence or obsolete promotion tooling merely because it exists there.

Specifically review before importing:

- `dev/_ca-output.md` — generated/transient; do not overwrite authoritative integration evidence just to match the CI branch.
- `dev/scripts/st2a-ph6-04-lv-01-test-vh22-c09-correction-02-ci-infrastructure-promotion.ps1` — historical promotion tooling; preservation by branch tag is sufficient unless a current generic dependency is proven.
- `dev/scripts/run-vh22-c09-phx-ci.ps1` — VH22 is closed and the branch it targets will be retired. Do not leave a user-facing current-build runner that points at a deleted branch.

The permanent CI architecture after consolidation must remain:

1. one permanent core bridge: `dev/scripts/run-phx-ci.ps1`;
2. at most one current-build runner when there is an active build;
3. no dependency on `ci-3-phx-ci-obsidian-pilot` or `ci-4-split-verification-status`;
4. no GitHub Actions.

If no active post-VH22 build has yet been selected, it is acceptable for the cleanup result to contain the permanent core bridge without a stale VH22-specific current-build runner. Do not invent the next build.

---

## 6. Archive manifest preservation

Before deleting `archive/phase6-legacy-history`:

1. preserve its exact branch head with the required recovery tag;
2. copy `dev/archive/phase6-legacy-history.md` into `phase6-integration` if it is not already present;
3. append a short retirement note stating that the active archive branch was replaced by the immutable preservation tag;
4. do not merge the archive branch tree or history into integration.

This keeps the human-readable legacy index available while the tag preserves the actual DAG.

---

## 7. Cleanup working branch

Do not perform integration modifications directly on `master`.

Create one temporary cleanup working branch from the current `origin/phase6-integration`, for example:

`maintenance/phase6-branch-cleanup-01`

This temporary branch may exist during execution but must be deleted before task completion.

Allowed integration-facing changes are limited to repository housekeeping/infrastructure:

- CI bridge consolidation from Section 5;
- archive manifest preservation from Section 6;
- cleanup evidence/manifest;
- one internal repo-controlled PowerShell verifier if needed.

Do not modify product source under `src/**` or product tests under `test/**`.

After verification, promote the cleanup commit(s) to `phase6-integration` only by a non-forced fast-forward or a normal merge that preserves history. Never rewrite `phase6-integration`.

Do not move `master`.

---

## 8. Verification before destructive branch deletion

Before deleting any remote branch, prove all of the following:

1. `master` still resolves exactly to `b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`.
2. `phase6-integration` contains promotion merge `54afee918f9f55ea828ce507b8acadcd780f6ff7`.
3. The cleanup changes contain no `src/**` or `test/**` product changes.
4. The permanent CI bridge exists on `phase6-integration`.
5. The bridge no longer depends on a CI infrastructure branch.
6. The PHX-CI pin is `60688ea1b09f181c089ac04e33c39b3090dc9605`.
7. The legacy archive manifest is present on integration.
8. Every retiring branch has a verified recovery tag at the exact branch tip.
9. There are no open pull requests whose head is one of the branches scheduled for deletion.
10. Repository verification/build/test checks required by the changed CI infrastructure pass locally.
11. No GitHub Actions were used.

All build/test/verification work must use repository-controlled PowerShell under `dev/scripts/`, capture complete command output and exit codes, and write the summary/evidence to `dev/_ca-output.md`. An internal verifier is allowed; do not create a second user-facing current-build runner.

Hard-stop if any check fails.

---

## 9. Deletion order

Only after Sections 3–8 pass:

1. delete temporary verification branches first;
2. delete rejected/blocked/superseded scenario branches;
3. delete completed-but-unpromoted correction branches after their tags are verified;
4. delete contained/promoted historical VH branches;
5. delete `ci-4-split-verification-status`;
6. delete `ci-3-phx-ci-obsidian-pilot` only after CI consolidation is proven;
7. delete `archive/phase6-legacy-history` last among retired historical branches;
8. delete the temporary `maintenance/phase6-branch-cleanup-01` branch last.

Never delete:

- `master`
- `phase6-integration`

Do not use force deletion/ref updates against retained branches.

---

## 10. Final-state gate

Task is COMPLETE only if the remote branch list contains exactly:

```text
master
phase6-integration
```

Required final checks:

- branch count = 2;
- `master` unchanged at the reviewed SHA;
- `phase6-integration` contains the approved VH22 merge and cleanup-only integration changes;
- all retired heads remain recoverable through immutable archival tags;
- no open PR references a deleted head branch;
- no product source/test changes were introduced by cleanup;
- local CI infrastructure is self-contained on integration and no longer branch-dependent;
- evidence records every deleted branch, frozen SHA, tag, and deletion result.

Evidence path:

`dev/evidence/_ca-output-agt-ca-p6-branch-consolidation-cleanup-01.md`

First line must be exactly:

`STATUS: COMPLETE`

or:

`STATUS: BLOCKED`

If anything prevents exact two-branch final state, stop and report BLOCKED. Do not partially delete unpreserved branches.

---

## 11. Final response

Return only:

- final `master` SHA;
- final `phase6-integration` SHA;
- final remote branch count/list;
- number of preservation tags created;
- CI infrastructure consolidation result;
- archive preservation result;
- evidence path;
- any blocker.

End exactly:

`PHASE 6 BRANCH CONSOLIDATION CLEANUP 01 COMPLETE — 2 ACTIVE BRANCHES REMAIN`
