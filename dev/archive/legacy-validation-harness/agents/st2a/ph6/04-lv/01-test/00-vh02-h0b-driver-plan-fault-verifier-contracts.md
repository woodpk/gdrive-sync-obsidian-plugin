# VH02 — H0B Driver, Plan, Fault, and Verifier Contracts

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh02-driver-plan-fault-verifier-contracts-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh02-driver-plan-fault-verifier-contracts`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh02-driver-plan-fault-verifier-contracts-01.md`

## Assignment
Add the second frozen harness contract slice under `src/validation/`: production-path driver request/result contracts, plan-assertion contracts, deterministic fault specification/result semantics, and state/convergence assertion/result contracts. Physical uncertainty must remain explicit; no fault result may convert a possibly dispatched mutation into definite success or definite not-applied.

## Executable base gate
At execution, `git fetch origin --prune`; resolve `BASE_SHA` as exact head of `origin/phase6-vh01-run-sandbox-checkpoint-contracts`; hard-stop unless `dev/evidence/_ca-output-agt-ca-p6-vh01-run-sandbox-checkpoint-contracts-01.md` exists there and begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. No pre-dispatch prompt editing is allowed or needed.

## Authority / boundaries
Read the complete harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared live-validation protocol, current product controller/executor/runtime code, and relevant tests. `src/contracts/**` is frozen; stop with `CONTRACT CHANGE REQUEST` if truly blocked by it.

Required end state: contracts compose with VH01, compile on mobile, prevent invalid certainty/verdict combinations where practical, and have focused valid/invalid-state tests. Do not implement the driver, assertion engine, fault adapters, or verifier yet.

## Verification / evidence
Run focused tests, `npm run check`, and `git diff --check`. Commit implementation/tests, then write the evidence file with first line exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording resolved base SHA, implementation SHA, changed files, commands/results, deviations, and blockers; commit evidence separately.

Stop without merge/promotion/release/live validation or VH03.