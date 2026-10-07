# VH06 — H2A Production-Path Driver

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh06-production-path-driver-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh06-production-path-driver`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh06-production-path-driver-01.md`

## Assignment
Implement the harness adapter that invokes the existing production planning, reviewed execution, Verify/Reconcile, status, and run-lifecycle seams. Inspect the actual product-controller/runtime APIs and use them directly or add only the smallest testability seam necessary. Do not duplicate planner/executor policy and do not write synchronization authority directly.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from that exact SHA. No supervisor-supplied SHA or pre-dispatch prompt edit is needed.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared live protocol, H0 contracts, `src/product/product-controller.ts`, `product-controller-base.ts`, `runtime.ts`, authoritative executor code, and relevant tests. Do not modify `src/contracts/**`.

Required end state: focused tests prove harness planning/execution delegates to the real production path, observes actual production results/status, and cannot manufacture success or bypass reviewed-plan authority.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording resolved base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.