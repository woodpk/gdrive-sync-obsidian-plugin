> [!IMPORTANT]
> ## OWNER-LOCKED REPLACEMENT — VALIDATION / VERIFICATION TOOLING
> This block **replaces and supersedes every instruction in this file** that authorizes creating, modifying, extending, generating, or printing custom/bespoke validation or verification code or scripts. Product implementation requirements unrelated to validation/verification tooling remain unchanged.
>
> **Immediately before every action that would author, materially modify, generate, or print any script or code artifact whose purpose is wholly or partly validation or verification**—including a verifier, validator, harness, runner, launcher, repository-check tool, evidence-verification tool, test-orchestration tool, watcher, acceptance-gate tool, or similar code—the agent MUST freshly retrieve and read **in full** the current original Google Drive document named `agent-led-software-engineering-operating-protocol`.
>
> A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading **even earlier in the same session** does not satisfy this gate. The current Drive original MUST be fetched and re-read immediately before **each** such script/code-authoring action. If it cannot be fetched and read, that validation/verification-tooling authoring action is **BLOCKED**.
>
> The freshly-read protocol controls. PHX-CI is the primary, central, non-substitutable repository-verification pipeline wherever that protocol assigns PHX-CI authority. Bespoke/task-specific validation or verification tooling may not replace, bypass, duplicate, or demote PHX-CI; supplementary tooling is permitted only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own.

# VH04 — H1A Validation Safety Sandbox

Agent: `agt-ca-p6-vh04-safety-sandbox-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh04-safety-sandbox`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh04-safety-sandbox-01.md`

## Assignment
Implement the validation safety sandbox against the frozen H0 contracts. It must issue run-scoped ownership, authorize setup/cleanup only for provably harness-owned disposable surfaces, reject ambiguous or out-of-scope paths, and retain provenance proving what the harness created and may remove. Sandbox authority must never become production synchronization authority.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless `dev/evidence/_ca-output-agt-ca-p6-vh03-coordination-evidence-freeze-01.md` there begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. No supervisor-supplied SHA is needed.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, live protocol, H0 contracts, current path/local/plugin-data code, and relevant tests. Do not edit `src/contracts/**` or unrelated production policy.

Required end state: negative tests prove the sandbox refuses unrelated vault content, canonical external BRAIN assets, credentials, primary/non-disposable state, ambiguous ownership, and unsafe cleanup while allowing only properly owned disposable validation surfaces.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, with resolved base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.