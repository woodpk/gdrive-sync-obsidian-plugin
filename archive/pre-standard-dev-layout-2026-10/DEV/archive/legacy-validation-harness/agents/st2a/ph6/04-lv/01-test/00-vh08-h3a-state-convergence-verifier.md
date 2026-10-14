# VH08 — H3A State and Convergence Verifier

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh08-state-convergence-verifier-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh08-state-convergence-verifier`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh08-state-convergence-verifier-01.md`

## Assignment
Implement objective postcondition verification using existing read-only local, remote, state, and diagnostic seams. Verify requested bytes/hash/path, stable remote identity, live/trash/absence, BASE/mappings/tombstones, revisions, outstanding intents/effects, cursor/completeness, conflict provenance, terminal run result, unrelated mutations, and final convergence when observable. Missing required proof is never PASS.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. No pre-dispatch substitution is required.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, H0 contracts, state store/authority adapters, Drive/local read seams, diagnostics, and relevant tests. Do not modify `src/contracts/**` or mutate synchronization authority to obtain proof.

Required end state: focused tests prove PASS only from complete authoritative observations and distinguish FAIL from BLOCKED/not-observable conservatively.

## Verification / evidence
Run focused tests, `npm run check`, and `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.