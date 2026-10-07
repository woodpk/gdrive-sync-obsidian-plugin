# VH09 — H3B Scenario Evidence Recorder

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh09-evidence-recorder-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh09-evidence-recorder`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh09-evidence-recorder-01.md`

## Assignment
Implement canonical machine-readable and human-readable scenario evidence production. Capture build/platform/device/run/scenario identity, pre/post diagnostic references, fixture hashes/sizes, expected and actual plans, relevant operation/intent/effect/request/remote IDs, revisions, timing, faults/checkpoints, assertions, verdict, and evidence integrity hash. Preserve existing diagnostic privacy rules.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. This prompt requires no pre-dispatch edits.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, H0 contracts, current diagnostics/audit code, and relevant tests. Do not modify `src/contracts/**` or serialize credentials/full private note or binary content.

Required end state: deterministic serialization and integrity hashing, required-field validation, safe redaction, per-scenario records plus suite aggregation, and a structural rule that missing mandatory evidence cannot be emitted as PASS.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write this task's evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.