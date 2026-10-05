> [!IMPORTANT]
> ## OWNER-LOCKED REPLACEMENT — VALIDATION / VERIFICATION TOOLING
> This block **replaces and supersedes every instruction in this file** that authorizes creating, modifying, extending, generating, or printing custom/bespoke validation or verification code or scripts. Product implementation requirements unrelated to validation/verification tooling remain unchanged.
>
> **Immediately before every action that would author, materially modify, generate, or print any script or code artifact whose purpose is wholly or partly validation or verification**—including a verifier, validator, harness, runner, launcher, repository-check tool, evidence-verification tool, test-orchestration tool, watcher, acceptance-gate tool, or similar code—the agent MUST freshly retrieve and read **in full** the current original Google Drive document named `agent-led-software-engineering-operating-protocol`.
>
> A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading **even earlier in the same session** does not satisfy this gate. The current Drive original MUST be fetched and re-read immediately before **each** such script/code-authoring action. If it cannot be fetched and read, that validation/verification-tooling authoring action is **BLOCKED**.
>
> The freshly-read protocol controls. PHX-CI is the primary, central, non-substitutable repository-verification pipeline wherever that protocol assigns PHX-CI authority. Bespoke/task-specific validation or verification tooling may not replace, bypass, duplicate, or demote PHX-CI; supplementary tooling is permitted only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own.

# VH10 — H4A Transport, Auth, Rate, and Coverage Fault Injection

Agent: `agt-ca-p6-vh10-transport-coverage-faults-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh10-transport-coverage-faults`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh10-transport-coverage-faults-01.md`

## Assignment
Implement validation-mode-only deterministic fault adapters for offline/network failure, authentication-required/invalid-auth, rate-limit/quota-style responses, and incomplete remote enumeration/completeness failure. Reuse existing Drive/HTTP and operational-failure seams; ordinary production construction must be unable to activate these faults.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from that SHA. No placeholder data is filled before dispatch.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, H0 fault contracts, Drive transport/client code, execution failure provenance, network policy, and relevant tests. Do not modify `src/contracts/**`.

Required end state: fault activation is explicit and scenario-bound, deterministic one-shot/repeat behavior is testable, production classifications remain semantically correct, and validation-off execution is byte/behavior neutral. No injected cause may fabricate stronger physical-effect certainty.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, with base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.