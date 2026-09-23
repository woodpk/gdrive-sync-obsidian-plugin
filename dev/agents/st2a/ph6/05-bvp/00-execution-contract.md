# BVP Stage-2A Child-Session Execution Contract

## Authority

This contract applies to every task under `dev/agents/st2a/ph6/05-bvp/**`.

Read before execution:

1. `dev/planning-and-building/target-system-specification.md`
2. `dev/planning-and-building/decision-register.yaml`
3. `dev/planning-and-building/testing-platform-target-system-specification.md`
4. `dev/planning-and-building/testing-platform-build-decomposition.md`
5. `dev/planning-and-building/testing-platform-session-decomposition.md`
6. `dev/governance/testing-platform-boundary.yaml`
7. the current child-session task file.

`dev/archive/**` is historical/non-authoritative and is excluded from normal implementation grounding.

## Prompt Maturity Rule

A child task marked **PREPLANNED / NOT-YET-EXECUTABLE** MUST NOT be executed as written.

Before dispatch, the supervisor MUST inspect the actual accepted repository and edit the task to bind:

- exact predecessor/integration SHA;
- exact task branch;
- exact relevant current files/types/interfaces/tests;
- exact writable-path allowlist;
- exact retain/delete decisions where classification is required;
- exact PHX-CI base/branch facts;
- any existing focused test command that is appropriate.

The supervisor then changes the task status to **EXECUTABLE**.

A worker has no authority to perform this binding or expand it.

## Child-Session Size Gate

Before dispatch, split the task again when repository grounding shows that the child is expected to introduce:

- more than one new platform-level contract family; or
- more than six substantive non-test implementation files; or
- approximately more than 1000 net new non-test LOC.

Mechanical deletion/move sessions and declarative-scenario batches are exempt from the file/LOC split threshold but not from the one-contract-family rule or exact writable-surface requirement.

## Writable-Surface Rule

Every executable child task MUST contain an exact writable-path allowlist.

If the worker believes another path is required:

1. do not edit it;
2. record the dependency/blocker;
3. return `BLOCKED`;
4. stop for supervisor re-grounding.

The worker MUST NOT decide that an extra file is safe, harness-only, general-purpose, necessary cleanup, or implicitly included.

## PHX-CI Acceptance Contract

GitHub Actions are prohibited.

The consumer is already PHX-CI-enabled. At planning time it is pinned in `phx-ci.json` to PHX-CI `0.2.0-dev.2`, exact framework SHA `f5123d21cc13511a5ee1185cfc4e1689785188ed`. Runtime authority always comes from the **target branch's actual `phx-ci.json`**, not this prose.

Authoritative task-branch verification uses the installed deployed runtime:

`%LOCALAPPDATA%\PHX-CI\runtimes\<framework.sha>\scripts\Invoke-PhxCi.ps1`

which on the current operator machine is under:

`C:\Users\woodpk\AppData\Local\PHX-CI\runtimes\<framework.sha>\scripts\Invoke-PhxCi.ps1`

PHX-CI production/operator verification owns:

- exact remote target HEAD;
- exact consumer PHX-CI pin/runtime selection;
- target/base/change-set resolution;
- detached consumer verification worktree;
- install/typecheck/focused test/full test/build/repository checks;
- artifact verification;
- evidence rendering;
- control-checkout preservation;
- race-protected evidence publication.

### Task-branch operator shape

After the worker pushes a task branch and stops at `READY FOR LOCAL PHX-CI VERIFICATION`, the operator runs the deployed-runtime front door against that branch. The dispatching supervisor must supply the correct current base authority; in the default serial BVP flow this is the still-unchanged accepted `origin/phase6-integration`.

Publication mode for acceptance is `push` so PHX-CI evidence is preserved on the verified task branch.

### Concrete operator command shape

At planning time the consumer is pinned to framework SHA:

`f5123d21cc13511a5ee1185cfc4e1689785188ed`

and the corresponding installed runtime is expected at:

`C:\Users\woodpk\AppData\Local\PHX-CI\runtimes\f5123d21cc13511a5ee1185cfc4e1689785188ed\scripts\Invoke-PhxCi.ps1`

The operator must still read the **target branch's actual** `phx-ci.json` before each run; if the pin changes, use that exact installed runtime instead.

Normal task-branch acceptance command shape:

```powershell
pwsh -NoProfile -File "$env:LOCALAPPDATA\PHX-CI\runtimes\<framework.sha>\scripts\Invoke-PhxCi.ps1" `
  -RepoRoot "<consumer-repository-root>" `
  -Branch "<task-branch>" `
  -BaseRef "origin/phase6-integration" `
  -PublicationMode push
```

For a primary-stage integrated gate, run the same deployed-runtime front door against `phase6-integration` with the supervisor-bound appropriate base authority for that stage.

Do not create a task-specific verifier script.

### Primary-stage acceptance

After all accepted children for one primary stage are integrated, the corresponding `*V` task runs authoritative PHX-CI against the integrated `phase6-integration` head and independently reviews the resulting evidence, architecture guard, metrics, bundle separation, and stage-specific completion criteria.

No next primary stage begins before the `*V` gate passes.

## Architecture Enforcement

Beginning with accepted BVP-S03:

- `Test-TestingArchitectureGuard.ps1` and `Get-TestingArchitectureMetrics.ps1` are durable supervisor-owned project checks;
- they must be invoked through the repository check that PHX-CI executes;
- every PHX-CI acceptance therefore fails if architecture/budget policy fails;
- workers may not modify guard, metrics, boundary, PHX-CI pin/integration, or budgets unless the child is explicitly a supervisor-authorized governance-change task.

After no more than two implementation children, the supervisor performs a repository-level architecture review before further dispatch.

## Worker Stop State

A worker implementation session ends with one of:

- `READY FOR LOCAL PHX-CI VERIFICATION` — implementation/test branch pushed; no acceptance claim;
- `BLOCKED` — exact blocker and unchanged out-of-scope surface reported.

Only PHX-CI evidence plus supervisor review can make a child accepted.