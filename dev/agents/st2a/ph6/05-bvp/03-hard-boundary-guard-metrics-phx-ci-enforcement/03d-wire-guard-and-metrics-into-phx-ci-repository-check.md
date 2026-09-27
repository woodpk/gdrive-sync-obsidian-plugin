# BVP-S03D — Wire Guard and Metrics into PHX-CI Repository Check

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
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

## 3. Execution-Time Binding

The semantic contract above and below remains fixed. The current repository-grounded execution binding is:

### 3.1 Accepted predecessor and task coordinates

- accepted S03C implementation SHA: `85c2bc294f252a76e6e36170237f66967bc46617`;
- accepted S03C PHX-CI evidence / promoted predecessor SHA: `f76e65db6640df20d80e470f7773489d2f3d8cc4`;
- current tasking base / `phase6-integration` SHA at S03D branch creation: `f48c3812511dd63803f894c3895025c699f1ae1d`;
- task branch: `bvp-s03d-phx-ci-repository-check`;
- PHX-CI base authority: `origin/phase6-integration`;
- current PHX-CI framework/runtime SHA: `2db2f3369ddb8e3ad6037861e116eaf83c8e2b1a`.

The task branch was created from the exact tasking base above. Do not substitute another base or re-resolve an alternate predecessor.

### 3.2 Canonical repository-check integration

The exact PHX-CI runtime at the bound SHA uses `PHX_REPOSITORY_CHECK_COMMAND` for the repository-check stage. Its Node/TypeScript default is `npm run check`, and the managed consumer integration may persist an explicit repository-check override through `phx-ci.json.commands.repositoryCheck` and the generated `Taskfile.phx-ci.yml` include variable.

S03D will use the explicit durable override:

`node test-platform/repository-check.mjs`

The consumer integration remains owned by PHX-CI; S03D changes only the consumer configuration required to select the BRAIN repository-check command.

### 3.3 Accepted architecture-check interfaces

- architecture guard: `dev/scripts/Test-TestingArchitectureGuard.ps1`;
  - repository root: `-RepoRoot <path>`;
  - verified changed paths: `-ChangedPath <string[]>`;
  - explicit change classification: `-ChangeClass ordinary|authorized-governance`;
- architecture metrics/budget evaluator: `dev/scripts/Get-TestingArchitectureMetrics.ps1`;
  - repository root: `-RepoRoot <path>`;
  - authoritative comparison base when available: `-BaseSha <sha>`.

The accepted guard/metrics implementation and substantive semantics are read-only in S03D.

### 3.4 PHX-CI authoritative verification context

During authoritative isolated repository-check execution the bound runtime exposes:

`PHX_VERIFICATION_CONTEXT_PATH`

The referenced schema-version-1 JSON contains the exact PHX-CI-owned:

- `targetHead`;
- `baseSha`;
- `changedPaths`.

S03D must consume those values directly. It must not invoke Git to fetch, resolve, merge-base, diff, or derive competing verification coordinates.

Outside authoritative isolated verification, the variable may be absent. The repository check may run guard/metrics without base/change-set deltas in that local-development mode, but it must never fabricate authoritative coordinates.

The explicit BVP change class is supplied through `BVP_CHANGE_CLASS`, defaulting to `ordinary`. `authorized-governance` is used only for an explicitly authorized governance-changing verification run such as this S03D work. The value is forwarded unchanged to the accepted guard.

### 3.5 Concrete implementation and test surfaces

S03D implementation is bounded to:

1. `test-platform/repository-check.mjs` — generic BRAIN repository-check orchestration;
2. `test-platform/test/repository-check-integration.test.ts` — deterministic integration/failure/context tests;
3. `phx-ci.json` — durable repository-check command override only;
4. `Taskfile.phx-ci.yml` — generated consumer variable corresponding to that override only;
5. `package.json` — focused S03D test command only;
6. `dev/governance/testing-platform-boundary.yaml` — add the new persistent repository-check orchestration surface to `supervisor_owned_frozen_surfaces` only;
7. this S03D task file and `00-session-index.md` for execution-state binding only.

Do not modify `Taskfile.yml`, either accepted architecture PowerShell script, production `src/**`, PHX-CI source, or other planning/implementation surfaces.

Focused integration command:

`npm run test:bvp-repository-check`

### 3.6 Size-gate confirmation

S03D introduces one platform-level contract family only: canonical repository-check orchestration. It adds one substantive non-test implementation file and remains below the child-session split threshold. No additional PowerShell script is permitted; the accepted BVP PowerShell count/budget remains unchanged.

Binding may not change guard semantics, metric definitions, hard budgets, evidence authority, or S03D non-goals.

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

## Invariants

- Guard and metrics remain the accepted S03B/S03C contracts; wiring cannot weaken or reinterpret them.
- PHX-CI remains the single canonical acceptance orchestrator.
- Repository-check integration consumes PHX-CI's verified repository/base/change-set authority rather than creating a competing Git authority.
- Architecture failure remains acceptance-blocking regardless of functional-test success.
- Canonical PHX-CI evidence remains the evidence publication mechanism.
- No task-specific BVP verifier or second CI path is introduced.

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