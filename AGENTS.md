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

PHX-CI is the sole authorized executable software-validation system, including task-specific, physical, artifact, evidence, build, test, policy, and acceptance checks. Every such executable check MUST run within or be coordinated by PHX-CI; no standalone verifier, alternate harness, GitHub Actions workflow, or supplementary verification authority is permitted. If an essential check is unsupported, validation is BLOCKED until the designated PHX-CI owner supplies an authorized capability.

No task prompt may authorize an agent to bypass this gate.

## Mandatory independent testing lifecycle

The current external PTAR v2.0 is binding on every NEW or SUBSTANTIVELY REVISED test, fixture, battery, test-specific discovery check, and test-authoring prompt. Read its canonical link in `dev/authority/external-authorities.md` and the current Operating Protocol and Construction Manual.

The supervisor freezes normative behavior and assigns a distinct Pre-Build Test Author to commit test-owned files on an isolated branch before production implementation. The Coding Agent may not write or alter those tests. After implementation, a FRESH blind Phase 0 reviewer receives only neutral specification/source inputs, publishes a frozen report-only Git commit, and stops. A separately authorized Post-Build Test Author may then create further adversarial test-owned commits. A different Independent PHX-CI Test Execution Agent alone executes the exact supervisor-integrated candidate, and a separate Independent Acceptance Reviewer assesses source, requirements, tests, and original PHX-CI evidence.

New test source defaults to `tests/<category>/` using unit, integration, contracts, architecture, adversarial, or e2e categories; fixtures and support are separate. Historical `test/` and frozen `test-platform/` remain unchanged until independently authorized migration. Any placement exception must be documented with a real native/architectural reason and PHX-CI discovery mapping. For every test handoff record source/base SHA, author branch/commit/tree, changed paths, requirement-to-test mapping, runner/discovery scope, and blockers; a test-file presence check or commit is never proof of PHX-CI PASS.

## Change authority

This governance file is owner-locked. It may not be weakened, bypassed, or removed without explicit human software-owner authorization.
