> [!IMPORTANT]
> ## OWNER-LOCKED REPLACEMENT — VALIDATION / VERIFICATION TOOLING
> This block **replaces and supersedes every instruction in this file** that authorizes creating, modifying, extending, generating, or printing custom/bespoke validation or verification code or scripts. Product implementation requirements unrelated to validation/verification tooling remain unchanged.
>
> **Immediately before every action that would author, materially modify, generate, or print any script or code artifact whose purpose is wholly or partly validation or verification**—including a verifier, validator, harness, runner, launcher, repository-check tool, evidence-verification tool, test-orchestration tool, watcher, acceptance-gate tool, or similar code—the agent MUST freshly retrieve and read **in full** the current original Google Drive document named `agent-led-software-engineering-operating-protocol`.
>
> A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading **even earlier in the same session** does not satisfy this gate. The current Drive original MUST be fetched and re-read immediately before **each** such script/code-authoring action. If it cannot be fetched and read, that validation/verification-tooling authoring action is **BLOCKED**.
>
> The freshly-read protocol controls. PHX-CI is the primary, central, non-substitutable repository-verification pipeline wherever that protocol assigns PHX-CI authority. Bespoke/task-specific validation or verification tooling may not replace, bypass, duplicate, or demote PHX-CI; supplementary tooling is permitted only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own.

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