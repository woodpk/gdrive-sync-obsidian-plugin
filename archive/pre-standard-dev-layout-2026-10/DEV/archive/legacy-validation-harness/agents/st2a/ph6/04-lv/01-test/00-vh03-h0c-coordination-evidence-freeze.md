# VH03 — H0C Coordination, Evidence, and Harness Contract Freeze

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh03-coordination-evidence-freeze-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh03-coordination-evidence-freeze`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh03-coordination-evidence-freeze-01.md`

## Assignment
Add the remaining H0 contracts under `src/validation/`: cross-device coordination message/state semantics and canonical scenario evidence/verdict records. Add the validation barrel export and a version/freeze marker for `phase6-live-validation-harness-v1`. Freeze the complete H0 surface for H1–H5.

## Executable base gate
At execution, `git fetch origin --prune`; resolve `BASE_SHA` as exact head of `origin/phase6-vh02-driver-plan-fault-verifier-contracts`; hard-stop unless its evidence file `dev/evidence/_ca-output-agt-ca-p6-vh02-driver-plan-fault-verifier-contracts-01.md` begins `STATUS: COMPLETE`. Create the required branch from that exact SHA. No prompt value must be filled in before dispatch.

## Authority / boundaries
Read the complete harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, VH01/VH02 source/evidence, diagnostics code, plugin-data persistence, and relevant tests. Do not modify `src/contracts/**`.

Required end state: all H0 contracts are exported, mobile-safe, versioned, tested for run/scenario/device binding, PASS/FAIL/BLOCKED/PAUSED semantics, evidence privacy structure, and stale/mismatched coordination rejection. No harness implementation modules are built in this session.

## Verification / evidence
Run focused contract tests, `npm run check`, and `git diff --check`. Commit implementation/tests first, then write this task's evidence file with first line exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, and blockers; commit evidence separately.

Stop without merge/promotion/release/live validation or VH04.