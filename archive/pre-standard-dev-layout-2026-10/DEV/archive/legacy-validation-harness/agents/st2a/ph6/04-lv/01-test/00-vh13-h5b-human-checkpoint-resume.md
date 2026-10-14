# VH13 — H5B Human Checkpoint and Resume Controller

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh13-human-checkpoint-resume-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh13-human-checkpoint-resume`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh13-human-checkpoint-resume-01.md`

## Assignment
Implement named durable checkpoints for the approved external actions: real offline/reconnect, actually stale-device waiting, real Obsidian termination/restart, genuine authentication restoration, and F03 disable/uninstall/reinstall/device-unlink actions. Persist only non-secret run state, verify observable postconditions before resuming, and remain safely paused on ambiguity or timeout.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from that exact SHA. No prompt edit or supplied SHA is needed.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, H0 checkpoint/coordination contracts, plugin-data/runtime/scheduler code, and relevant tests. Do not modify `src/contracts/**` or persist credentials/private payloads.

Required end state: tests prove restart-safe resume, exact one-action checkpoint state, duplicate acknowledgement resistance, safe device-switch boundaries, postcondition verification where observable, and indefinite safe pause rather than guessed completion.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.