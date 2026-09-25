# BVP-S03D — Wire Guard and Metrics into PHX-CI Repository Check

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement  
**Predecessor child:** accepted S03C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This prompt is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Make the accepted S03 architecture guard and metrics/budget evaluator mandatory repository checks for every subsequent PHX-CI acceptance, without creating a second verifier/orchestration path.

## 2. Required End State

When complete:

- the existing consumer repository-check path executed by PHX-CI invokes the accepted architecture guard and metrics/budget evaluator;
- every PHX-CI child/stage acceptance after S03 fails when either architecture check fails;
- successful runs expose guard result and current metrics/budget status in canonical PHX-CI evidence;
- the integration uses PHX-CI's existing target/base/change-set authority rather than inventing independent Git resolution;
- supervisor-owned governance surfaces are established/frozen for later ordinary work;
- no task-specific BVP verifier script or parallel CI framework is created.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor fills:

- exact accepted S03C predecessor SHA;
- exact task branch;
- exact current repository-check entrypoint(s) used by PHX-CI;
- exact accepted guard and metrics script paths/interfaces;
- exact mechanism PHX-CI already provides for repository root, target/base identity, and changed paths;
- exact writable-path allowlist for the integration;
- current target-branch `phx-ci.json` pin/runtime and base authority;
- focused integration test command if an existing appropriate one exists.

Binding may adapt to the actual PHX-CI consumer integration shape but may not create a different acceptance architecture.

## Dependencies

S03D depends on the accepted S03B guard and S03C metrics/budget evaluator as already-complete project checks, plus the existing PHX-CI consumer repository-check integration surface. It may wire those accepted checks into that surface but may not redesign their semantics or create a substitute verifier.

## 4. Required Behavior and Semantics

### 4.1 Mandatory invocation

The canonical repository-check path must execute both:

1. architecture guard;
2. architecture metrics/hard-budget evaluation.

Neither may be best-effort, advisory, or skipped because functional tests passed.

### 4.2 Failure propagation

A nonzero guard or hard-budget result must cause the repository-check stage to fail and therefore block PHX-CI acceptance.

Do not catch/translate a failure into success. Diagnostics may be made concise, but the failing status must be preserved.

### 4.3 Correct execution context

Use the repository root/change-set/base information already owned by PHX-CI/consumer repository-check integration.

- Guard frozen-surface checks must receive the actual verified change-set where the repository-check contract exposes it.
- Metrics delta must receive the actual verified base SHA where the integration exposes it.
- Do not fetch/re-resolve a competing target/base that could disagree with PHX-CI.
- If the current repository-check interface cannot supply a hard datum required to enforce the frozen contract safely, return `BLOCKED` for supervisor/PHX-CI contract resolution rather than silently weakening the check.

### 4.4 Evidence visibility

PHX-CI's normal logs/canonical evidence must make it possible to determine:

- architecture guard PASS/FAIL;
- current required metrics;
- hard-budget PASS/FAIL;
- metric delta where applicable;
- whether frozen-governance surfaces changed;
- whether a new production seam/platform-level abstraction was introduced where the existing metrics/guard can determine it.

Do not build a second evidence publication system.

### 4.5 Frozen governance after S03

After integration, ordinary work must treat the boundary manifest, guard, metrics, hard budgets, and PHX-CI consumer integration as supervisor-owned frozen surfaces.

This child may make the wiring changes explicitly necessary to establish that state; it may not change the substantive guard rules or hard budget values accepted in 03B/03C.

## 5. Required Integration Tests

Tests must establish at least:

- compliant repository-check path invokes both checks and passes;
- a controlled guard violation makes repository check fail;
- a controlled hard-budget violation makes repository check fail;
- a functional test PASS cannot override either architecture failure;
- base/change-set coordinates are passed from the verified PHX-CI/repository-check context rather than independently guessed;
- ordinary production build/test commands remain otherwise unchanged;
- no task-specific verifier script is required.

Use existing repository/PHX-CI test surfaces where possible; do not introduce an alternate verification harness.

## 6. Engineering Discretion

The agent may choose the smallest integration mechanism consistent with the actual repository-check architecture discovered at dispatch.

Discretion includes mechanical Taskfile/script wiring, argument plumbing, and test organization.

It does not include:

- changing guard semantics;
- changing metrics definitions/budgets;
- modifying PHX-CI source as a substitute for consumer integration unless higher authority explicitly requires it;
- adding a new BVP CI runner;
- changing product code.

## 7. Material Edge / Failure Cases

The child must handle safely:

- paths with spaces;
- missing guard/metrics script → repository check fails, not skips;
- guard/metrics output diagnostics without losing original exit status;
- unavailable/missing base/change-set data required for a rule → BLOCKED/fail closed according to the accepted interface contract;
- repeated repository-check execution without dirtying the control repository.

## 8. Acceptance Criteria

S03D is complete only when:

- canonical repository check invokes accepted guard + metrics;
- both failures propagate to PHX-CI failure;
- no independent target/base resolution exists;
- no one-off verifier/evidence path exists;
- full PHX-CI branch verification passes on compliant repository;
- canonical evidence contains architecture/metrics results;
- production behavior/build remains unchanged;
- changes stay within dispatch-bound governance/integration scope.

## 9. Non-Goals

Do not:

- redesign PHX-CI;
- modify product synchronization;
- change BVP budgets or guard rules;
- build simulator/runner/scenario/live components;
- create GitHub Actions;
- add task-specific verifier scripts.

## 10. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, exact repository-check integration point, positive/failing integration tests, PHX-CI focused/full results available to the worker, and any unavailable checks.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 03V or S04.