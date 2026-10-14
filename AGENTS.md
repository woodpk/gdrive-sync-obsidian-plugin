# OWNER-LOCKED VALIDATION / VERIFICATION GOVERNANCE

This file applies to every engineering agent, every persisted task prompt under `dev/planning/02-workstreams/**/tasks/**`, and every branch of this repository.

## Mandatory fresh-protocol gate

Before authoring, generating, modifying, extending, or printing **any code or script whose purpose is wholly or partly validation or verification**, including any verifier, validator, validation/verification harness, test-orchestration harness, runner, launcher, evidence verifier/publisher, repository-check script, acceptance-gate script, or similar tooling, the agent MUST:

1. **Freshly retrieve and read the current original Google Drive document named `agent-led-software-engineering-operating-protocol` immediately before that script-authoring action.**
2. A cached copy, repository copy, uploaded snapshot, memory, prior-chat reading, or earlier reading in the same session DOES NOT satisfy this requirement.
3. If the agent will author or materially modify more than one validation/verification-related script, it MUST re-fetch and re-read the current Drive original before **each** such script-authoring action.
4. Apply the current protocol exactly, including its PHX-CI authority, owner-execution, rerun, evidence-recovery, mutation-safety, and script-audit rules.
5. If the current Drive original cannot be fetched and read, validation/verification script authoring is **BLOCKED**. Do not fall back to an older copy or invent a substitute process.

## Legacy custom-validation instructions are void

Any instruction in a persisted workstream task or archived historical prompt that directs an agent to create, build, implement, extend, modify, or rely upon bespoke/custom validation or verification code contrary to the freshly-read current operating protocol is **VOID AND SUPERSEDED** by this file.

Archived pre-standard prompts are historical evidence only and are never current task authority merely because they remain accessible under `archive/**`.

PHX-CI is the primary, central, non-substitutable repository-validation pipeline whenever the current protocol assigns that authority to PHX-CI. A task-specific or physical-validation tool may exist only when the freshly-read current protocol permits it for a responsibility PHX-CI does not own, and it MUST remain supplementary.

No task prompt may authorize an agent to bypass this gate.

## Change authority

This governance file is owner-locked. It may not be weakened, bypassed, or removed without explicit human software-owner authorization.
