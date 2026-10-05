> [!IMPORTANT]
> ## OWNER-LOCKED REPLACEMENT — VALIDATION / VERIFICATION TOOLING
> This block **replaces and supersedes every instruction in this file** that authorizes creating, modifying, extending, generating, or printing custom/bespoke validation or verification code or scripts. Product implementation requirements unrelated to validation/verification tooling remain unchanged.
>
> **Immediately before every action that would author, materially modify, generate, or print any script or code artifact whose purpose is wholly or partly validation or verification**—including a verifier, validator, harness, runner, launcher, repository-check tool, evidence-verification tool, test-orchestration tool, watcher, acceptance-gate tool, or similar code—the agent MUST freshly retrieve and read **in full** the current original Google Drive document named `agent-led-software-engineering-operating-protocol`.
>
> A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading **even earlier in the same session** does not satisfy this gate. The current Drive original MUST be fetched and re-read immediately before **each** such script/code-authoring action. If it cannot be fetched and read, that validation/verification-tooling authoring action is **BLOCKED**.
>
> The freshly-read protocol controls. PHX-CI is the primary, central, non-substitutable repository-verification pipeline wherever that protocol assigns PHX-CI authority. Bespoke/task-specific validation or verification tooling may not replace, bypass, duplicate, or demote PHX-CI; supplementary tooling is permitted only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own.

# VH03 — H0C Coordination, Evidence, and Harness Contract Freeze

Agent: `agt-ca-p6-vh03-coordination-evidence-freeze-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh03-coordination-evidence-freeze`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh03-coordination-evidence-freeze-01.md`

## Assignment
Add the remaining H0 contracts under `src/validation/`: cross-device coordination message/state semantics and canonical scenario evidence/verdict records. Add the validation barrel export and a version/freeze marker for `phase6-live-validation-harness-v1`. Freeze the complete H0 surface for H1–H5.

## Executable base gate
At execution, `git fetch origin --prune`; resolve `BASE_SHA` as exact head of `origin/phase6-vh02-driver-plan-fault-verifier-contracts`; hard-stop unless its evidence file `dev/evidence/_ca-output-agt-ca-p6-vh02-driver-plan-fault-verifier-contracts-01.md` begins `STATUS: COMPLETE`. Create the required branch from that exact SHA. No prompt value must be filled in before dispatch.

## Authority / boundaries
Read the complete harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, VH01/VH02 source/evidence, diagnostics code, plugin-data persistence, and relevant tests. Do not modify `src/contracts/**`.

Required end state: all H0 contracts are exported, mobile-safe, versioned, tested for run/scenario/device binding, PASS/FAIL/BLOCKED/PAUSED semantics, evidence privacy structure, and stale/mismatched coordination rejection. No harness implementation modules are built in this session.

## Verification / evidence
Run focused contract tests, `npm run check`, and `git diff --check`. Commit implementation/tests first, then write this task's evidence file with first line exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, and blockers; commit evidence separately.

Stop without merge/promotion/release/live validation or VH04.