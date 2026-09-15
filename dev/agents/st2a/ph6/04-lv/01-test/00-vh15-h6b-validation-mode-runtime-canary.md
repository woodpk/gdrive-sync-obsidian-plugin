# VH15 — H6B Validation-Mode Runtime Wiring and Isolation Canary

Agent: `agt-ca-p6-vh15-validation-mode-runtime-canary-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh15-validation-mode-runtime-canary`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md`

## Assignment
Wire the integrated harness into the actual Obsidian plugin runtime behind explicit validation-mode activation, with the smallest practical operator surface to enable/disable validation mode and start/resume a scenario. Validation controls must be disabled by default and must not alter ordinary Sync now, automatic sync, recovery, authentication, or production planning/execution semantics. Add a local/fake runtime canary and isolation tests; do not execute live Drive/mobile scenarios.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh14-module-integration-runner`; hard-stop unless `dev/evidence/_ca-output-agt-ca-p6-vh14-module-integration-runner-01.md` there begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. No prompt value is filled before dispatch.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, VH14 evidence, `src/main.ts`, runtime/settings composition, and relevant tests. Do not modify `src/contracts/**`. Do not add external services, Appium, OAuth scope, or background-execution assumptions.

Required end state: built plugin exposes harness controls only after explicit activation; ordinary runtime cannot reach sandbox/fault authority; local/fake canary uses the production-path driver; validation-off behavior remains unchanged.

## Verification / evidence
Run focused runtime/isolation tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write evidence beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live physical validation.