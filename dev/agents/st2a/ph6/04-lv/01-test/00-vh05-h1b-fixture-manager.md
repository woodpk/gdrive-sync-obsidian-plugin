> [!IMPORTANT]
> ## OWNER-LOCKED REPLACEMENT — VALIDATION / VERIFICATION TOOLING
> This block **replaces and supersedes every instruction in this file** that authorizes creating, modifying, extending, generating, or printing custom/bespoke validation or verification code or scripts. Product implementation requirements unrelated to validation/verification tooling remain unchanged.
>
> **Immediately before every action that would author, materially modify, generate, or print any script or code artifact whose purpose is wholly or partly validation or verification**—including a verifier, validator, harness, runner, launcher, repository-check tool, evidence-verification tool, test-orchestration tool, watcher, acceptance-gate tool, or similar code—the agent MUST freshly retrieve and read **in full** the current original Google Drive document named `agent-led-software-engineering-operating-protocol`.
>
> A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading **even earlier in the same session** does not satisfy this gate. The current Drive original MUST be fetched and re-read immediately before **each** such script/code-authoring action. If it cannot be fetched and read, that validation/verification-tooling authoring action is **BLOCKED**.
>
> The freshly-read protocol controls. PHX-CI is the primary, central, non-substitutable repository-verification pipeline wherever that protocol assigns PHX-CI authority. Bespoke/task-specific validation or verification tooling may not replace, bypass, duplicate, or demote PHX-CI; supplementary tooling is permitted only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own.

# VH05 — H1B Deterministic Fixture Manager

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