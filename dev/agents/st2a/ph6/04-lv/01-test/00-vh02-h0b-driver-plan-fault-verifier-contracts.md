> [!IMPORTANT]
> ## OWNER-LOCKED REPLACEMENT — VALIDATION / VERIFICATION TOOLING
> This block **replaces and supersedes every instruction in this file** that authorizes creating, modifying, extending, generating, or printing custom/bespoke validation or verification code or scripts. Product implementation requirements unrelated to validation/verification tooling remain unchanged.
>
> **Immediately before every action that would author, materially modify, generate, or print any script or code artifact whose purpose is wholly or partly validation or verification**—including a verifier, validator, harness, runner, launcher, repository-check tool, evidence-verification tool, test-orchestration tool, watcher, acceptance-gate tool, or similar code—the agent MUST freshly retrieve and read **in full** the current original Google Drive document named `agent-led-software-engineering-operating-protocol`.
>
> A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading **even earlier in the same session** does not satisfy this gate. The current Drive original MUST be fetched and re-read immediately before **each** such script/code-authoring action. If it cannot be fetched and read, that validation/verification-tooling authoring action is **BLOCKED**.
>
> The freshly-read protocol controls. PHX-CI is the primary, central, non-substitutable repository-verification pipeline wherever that protocol assigns PHX-CI authority. Bespoke/task-specific validation or verification tooling may not replace, bypass, duplicate, or demote PHX-CI; supplementary tooling is permitted only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own.

# VH02 — H0B Driver, Plan, Fault, and Verifier Contracts

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