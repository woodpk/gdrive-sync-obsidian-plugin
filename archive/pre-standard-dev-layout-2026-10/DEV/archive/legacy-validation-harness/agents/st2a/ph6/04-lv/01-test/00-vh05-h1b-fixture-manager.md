# VH05 — H1B Deterministic Fixture Manager

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh05-fixture-manager-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh05-fixture-manager`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh05-fixture-manager-01.md`

## Assignment
Implement deterministic fixture creation/edit/move/delete/hash/restore/cleanup through the frozen sandbox contracts. Support text, opaque binary, empty-folder, large-file, exclusion/path-collision, deletion, and versioned fixtures required by C03–F03. Do not log private fixture payloads; use safe descriptors, sizes, and hashes.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. No prompt field is filled in before dispatch.

## Authority / boundaries
Read the complete harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared live protocol, H0 contracts, current local-vault/util code, and relevant tests. Do not modify `src/contracts/**`; all mutation authorization must come from the sandbox contract.

Required end state: focused tests prove deterministic bytes/hashes, bounded large-fixture generation, text/binary/folder/version helpers, safe restore/cleanup, and refusal when ownership is absent or ambiguous.

## Verification / evidence
Run focused tests, `npm run check`, and `git diff --check`. Commit implementation/tests first. Then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording resolved base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.