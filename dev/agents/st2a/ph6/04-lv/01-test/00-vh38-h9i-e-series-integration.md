> [!IMPORTANT]
> ## OWNER-LOCKED REPLACEMENT — VALIDATION / VERIFICATION TOOLING
> This block **replaces and supersedes every instruction in this file** that authorizes creating, modifying, extending, generating, or printing custom/bespoke validation or verification code or scripts. Product implementation requirements unrelated to validation/verification tooling remain unchanged.
>
> **Immediately before every action that would author, materially modify, generate, or print any script or code artifact whose purpose is wholly or partly validation or verification**—including a verifier, validator, harness, runner, launcher, repository-check tool, evidence-verification tool, test-orchestration tool, watcher, acceptance-gate tool, or similar code—the agent MUST freshly retrieve and read **in full** the current original Google Drive document named `agent-led-software-engineering-operating-protocol`.
>
> A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading **even earlier in the same session** does not satisfy this gate. The current Drive original MUST be fetched and re-read immediately before **each** such script/code-authoring action. If it cannot be fetched and read, that validation/verification-tooling authoring action is **BLOCKED**.
>
> The freshly-read protocol controls. PHX-CI is the primary, central, non-substitutable repository-verification pipeline wherever that protocol assigns PHX-CI authority. Bespoke/task-specific validation or verification tooling may not replace, bypass, duplicate, or demote PHX-CI; supplementary tooling is permitted only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own.

# VH38 — H9I E-Series Harness Integration

Agent: `agt-ca-p6-vh38-e-series-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh38-e-series-integration`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh38-e-series-integration-01.md`

## Assignment
Integrate the independently built E01–E07 harness scenarios into one H9 E-series package, register them through the H6 runner extension point, and verify their combined recovery/fault/cancellation isolation without executing real-device or live-failure scenarios.

## Executable base / input gate
At execution, run `git fetch origin --prune`. Use exact head of `origin/phase6-vh15-validation-mode-runtime-canary` as integration base only if its evidence begins `STATUS: COMPLETE`. Verify branches `phase6-vh31-e01-scenario`, `phase6-vh32-e02-scenario`, `phase6-vh33-e03-scenario`, `phase6-vh34-e04-scenario`, `phase6-vh35-e05-scenario`, `phase6-vh36-e06-scenario`, and `phase6-vh37-e07-scenario` each exist and their own evidence files begin `STATUS: COMPLETE`. Create the required branch from the H6B base and merge those exact verified heads; record every SHA. No prompt editing is required.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, shared protocol/OBS-01, E01–E07 package files, VH15 and all seven scenario evidence files, and merged source/tests. Preserve physical-uncertainty semantics, disposable-state/remote boundaries, human restart/auth checkpoints, circuit-breaker preview-only rule, and production cancellation semantics. Resolve conflicts without redefining frozen H0 contracts or production policy; stop with `CONTRACT CHANGE REQUEST` if a genuine shared deficiency exists.

Required end state: all seven E scenarios are uniquely registered and independently invocable; injected faults remain scenario-bound/validation-only; E01/E06 checkpoints remain resumable; no scenario can leak fault state into another run.

## Verification / evidence
Run all E-series harness tests plus `npm run check` and `git diff --check`. Commit only necessary integration/registry corrections, then evidence beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base/input SHAs, merge/conflict resolution, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without promotion/release/live validation or E01–E07 PASS claims.