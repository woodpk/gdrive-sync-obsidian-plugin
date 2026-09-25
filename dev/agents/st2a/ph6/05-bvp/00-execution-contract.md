# BVP Stage-2A Child-Session Execution Contract

## 1. Authority and Purpose

This contract applies to every task under `dev/agents/st2a/ph6/05-bvp/**`.

The prompt tree is a **prewritten Stage-2A build program**. Each child prompt must already contain the complete stable implementation contract for that child before dispatch: objective, required behavior and semantics, invariants, dependencies, engineering discretion, material edge/failure cases, objective acceptance criteria, and non-goals.

Execution-time binding is limited to facts that cannot legitimately be known until predecessor work has been accepted. Binding MUST NOT redefine, narrow, broaden, or redesign the prewritten semantic contract.

Read before execution:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`;
2. `dev/planning-and-building/target-system-specification.md`;
3. `dev/planning-and-building/decision-register.yaml`;
4. `dev/planning-and-building/testing-platform-target-system-specification.md`;
5. `dev/planning-and-building/testing-platform-build-decomposition.md`;
6. `dev/planning-and-building/testing-platform-requirement-coverage.md`;
7. `dev/planning-and-building/testing-platform-session-decomposition.md`;
8. `dev/planning-and-building/testing-platform-build-session-specifications.md`;
9. `dev/governance/testing-platform-boundary.yaml`;
10. the current child-session task file.

`dev/archive/**` is historical/non-authoritative and is excluded from normal implementation grounding.

## 2. Prewritten Contract Rule

Every child task must distinguish:

### 2.1 Stable prewritten contract

The prompt MUST predefine, to the extent relevant for that child:

- objective and why the child exists;
- required end state;
- required behavior and observable semantics;
- contracts and invariants introduced or preserved;
- architectural and ownership boundaries;
- dependencies on accepted predecessor capabilities;
- material edge cases and failure behavior;
- implementation discretion intentionally left to the coding agent;
- objective verification and acceptance criteria;
- explicit non-goals and prohibited scope.

These semantics are part of the planned BVP build contract. They are not to be rediscovered by the worker and are not rewritten at dispatch merely because repository coordinates changed.

### 2.2 Dispatch-bound execution facts

A task marked **PREPLANNED / NOT-YET-EXECUTABLE** becomes executable only after the supervisor inspects the actual accepted predecessor repository and fills the task's runtime-binding block with the facts required by BVP-GOV-009 and the current verification system:

- exact accepted predecessor/integration SHA;
- exact task branch;
- exact current concrete files/types/interfaces/tests that instantiate the already-defined semantic scope;
- exact writable-path allowlist;
- current PHX-CI base authority and target-branch framework pin/runtime;
- existing focused test command when one is appropriate;
- any immutable artifact/hash coordinate that the prewritten contract explicitly requires.

The supervisor may clarify repository coordinates and mechanical execution facts only. If current repository reality makes the prewritten semantic contract materially impossible, contradictory, or incomplete, the task remains BLOCKED and returns to product/supervisor authority rather than being silently redesigned during binding.

A worker has no authority to perform this binding or expand it.

## 3. Child-Session Size Gate

Before dispatch, split the task again when repository grounding shows that the child is expected to introduce:

- more than one new platform-level contract family; or
- more than six substantive non-test implementation files; or
- approximately more than 1000 net new non-test LOC.

Mechanical deletion/move sessions and declarative-scenario batches are exempt from the file/LOC split threshold but not from the one-contract-family rule or exact writable-surface requirement.

A split may divide execution capacity, but it MUST preserve the parent child's semantic ownership, invariants, and required end state.

## 4. Writable-Surface Rule

Every executable child task MUST contain an exact writable-path allowlist derived from the prewritten scope and the actual accepted predecessor repository.

The allowlist is an execution safety boundary, not a substitute for the semantic contract and not authority to perform arbitrary edits inside listed files.

If the worker believes another path is required:

1. do not edit it;
2. identify the exact dependency and why the current contract cannot be completed within the allowlist;
3. return `BLOCKED`;
4. stop for supervisor re-grounding.

The worker MUST NOT decide that an extra file is safe, harness-only, general-purpose, necessary cleanup, or implicitly included.

## 5. Engineering-Discretion Rule

Within the prewritten contract and dispatch-bound writable surface, the coding agent retains ordinary engineering discretion over implementation mechanics that cannot materially change required behavior, architecture, compatibility, security, authority, or operational outcomes.

Unless a child prompt expressly freezes a choice because the BVP specification or repository contract requires it, the worker MAY choose:

- private helper/module decomposition;
- internal names;
- equivalent local algorithms/data structures;
- test organization;
- refactoring mechanically necessary to implement the required result cleanly.

The worker MUST NOT reinterpret fixed behavior, public/shared contracts, authority boundaries, dependency direction, failure semantics, architecture budgets, or non-goals.

## 6. PHX-CI Acceptance Contract

GitHub Actions are prohibited.

Runtime authority comes from the **target branch's actual `phx-ci.json`**. Do not rely on a framework SHA embedded in old prose.

Authoritative task-branch verification uses the installed deployed runtime selected by that exact framework pin:

`%LOCALAPPDATA%\PHX-CI\runtimes\<framework.sha>\scripts\Invoke-PhxCi.ps1`

PHX-CI production/operator verification owns:

- exact remote target HEAD;
- exact consumer PHX-CI pin/runtime selection;
- target/base/change-set resolution;
- detached consumer verification worktree;
- install/typecheck/focused test/full test/build/repository checks;
- artifact verification;
- canonical evidence rendering;
- control-checkout preservation;
- race-protected evidence publication.

Normal task-branch acceptance shape:

```powershell
pwsh -NoProfile -File "$env:LOCALAPPDATA\PHX-CI\runtimes\<framework.sha>\scripts\Invoke-PhxCi.ps1" `
  -RepoRoot "<consumer-repository-root>" `
  -Branch "<task-branch>" `
  -BaseRef "<supervisor-bound-base-ref>" `
  -PublicationMode push
```

A child may define an existing focused command to pass through PHX-CI's public focused-test input. Do not create a task-specific verifier script.

## 7. Primary-Stage Acceptance

After all accepted implementation children for one primary stage are integrated, the corresponding `*V` task runs authoritative PHX-CI against the integrated `phase6-integration` head and independently evaluates the stage-specific semantic completion contract.

From accepted BVP-S03 onward, every acceptance must also confirm architecture guard and metrics/budgets.

No next primary stage begins before the integrated `*V` gate passes.

## 8. Architecture Enforcement

Beginning with accepted BVP-S03:

- `Test-TestingArchitectureGuard.ps1` and `Get-TestingArchitectureMetrics.ps1` are durable supervisor-owned project checks;
- they are invoked through the repository check that PHX-CI executes;
- architecture/budget failure blocks acceptance regardless of functional test status;
- ordinary workers may not modify the guard, metrics, boundary manifest, PHX-CI pin/integration, or budgets unless the child is explicitly an authorized governance-change task.

After no more than two implementation children, the supervisor performs the repository-level architecture review required by BVP-GOV-008 before further dispatch.

## 9. Evidence and Worker Stop States

Worker implementation sessions end in exactly one of:

- `READY FOR LOCAL PHX-CI VERIFICATION` — the bounded implementation is complete, pushed, and ready for authoritative acceptance; no acceptance claim is made;
- `BLOCKED` — a concrete contract, authority, dependency, execution-binding, or writable-surface condition prevents correct completion.

The worker reports the implementation SHA, actual changed paths, verification performed, unavailable materially relevant checks, and any blocker/deviation required by the child prompt.

Only PHX-CI evidence plus supervisor review can make a child accepted.

## 10. Anti-Drift Rule

Dispatch binding and corrective work MUST preserve the prewritten child contract.

Do not:

- replace a semantic contract with a list of mechanical edits;
- add new behavioral requirements after implementation merely because a reviewer discovers an unplanned edge case;
- narrow the worker to one observed symptom when the prewritten contract already governs the broader behavior;
- convert ordinary implementation discretion into reviewer-prescribed code unless a specific mechanism is itself required by authority;
- use execution-time binding to redesign the child.

If a material requirement was genuinely absent from the prewritten child contract, treat that as a planning/authority defect and repair the contract before further implementation rather than serially extending the finish line through micro-corrections.
