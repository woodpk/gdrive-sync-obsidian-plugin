STATUS: BLOCKED

# VH21 — C08 Windows Rename/Move → Mobile Move

Agent: `agt-ca-p6-vh21-c08-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Branch: `phase6-vh21-c08-scenario`

## Base gate

- Resolved `origin/phase6-vh15-validation-mode-runtime-canary` / `BASE_SHA`: `6372184d2649e21369001ea28cc583e6636781c5`.
- Required predecessor evidence exists at `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md` and begins exactly `STATUS: COMPLETE`.
- Required branch was created from exactly `BASE_SHA`.
- Branch/base comparison before this evidence-only commit: identical; zero commits ahead/behind.

## CONTRACT CHANGE REQUEST

C08 cannot be implemented as an executable preview → assertion → execute scenario through the currently established H6 extension points without changing a shared harness orchestration/data-flow contract or bypassing the approved production-path/plan-assertion ownership.

### Confirmed contract deficiency

The approved C08 flow requires, independently on Windows and then mobile:

1. request the actual production preview;
2. assert that exact observed plan contains only the expected identity-preserving move (plus permitted no-op background work), with the stable remote Drive ID and no delete/create substitution or unrelated mutation;
3. execute only the authorization produced by that successful assertion.

The current shared seams cannot carry the required authority from step 1 through step 3:

- `ValidationProductionPathDriver.dispatch(...)` correctly returns `{ status: "plan-observed", plan }` for a preview and internally records that observed `planId`.
- `productionDelegate(...)` in `src/validation/validation-mode-runtime.ts` converts both `plan-observed` and `request-accepted` into only `{ status: "completed", evidenceRefs: [] }`. The actual observed `SynchronizationPlan` is discarded at the runner boundary.
- `ValidationRunnerApprovedModuleDelegate.execute(...)` receives only the current run/step identity, operation string, and the definition's predeclared `input`; there is no approved prior-step output/scenario-context binding.
- `assertValidationPlan(...)` requires the actual observed `SynchronizationPlan` to produce a `ValidationPlanExecutionAuthorization`.
- the fixed runtime `execute-asserted-plan` operation requires that authorization in `step.input.authorization`, and `ValidationProductionPathDriver` correctly rejects execution unless its `planId` is the exact plan previously observed by that driver for the same validation run.
- `ValidationModeRuntime` explicitly forbids overriding the `production-path-driver` runtime binding, so C08 cannot repair the missing handoff by replacing the approved production driver.

Therefore an immutable scenario definition cannot precompute a valid execution authorization: the authorization can exist only after the real production preview is observed and successfully asserted.

### Why a scenario-local workaround is not authorized

A C08-only side channel that directly calls the raw production controller, duplicates preview/execution behavior inside another module, mutates shared step inputs out-of-band, or manufactures/precomputes an authorization would violate the governing boundaries:

- DEC-302 requires the harness to use the approved production planner/executor/state/local/Drive seams and forbids a shadow policy or production mutation bypass.
- DEC-305 requires assertion of the actual production plan before mutation and a fail-closed stop on unexpected plan content.
- the VH21 assignment prohibits changing shared harness helpers for a scenario-local workaround and explicitly requires a `CONTRACT CHANGE REQUEST` when established extension points are insufficient.
- C08 specifically requires deterministic delete/create-substitution and unexpected-plan hard stops, so omitting this authority handoff is not an acceptable partial implementation.

The existing planner itself already provides the required production move semantics: `src/core/planner.ts` emits `identity-preserving-move` at the destination path, with `fromPath`, `toPath`, the stable `remoteObjectId`, and `targetSide: "remote"` for a proven Windows/local move or `targetSide: "local"` for the corresponding proven remote/mobile move. The blocker is only the harness orchestration handoff needed to assert and authorize those actual plans.

## Minimum shared contract capability requested

Provide one approved H6/H7 orchestration mechanism that binds the actual result of a production preview to the subsequent plan-assertion step and then binds the resulting `ValidationPlanExecutionAuthorization` to the subsequent fixed `execute-asserted-plan` step, without allowing scenario packages to replace the production driver or manufacture authorization.

At minimum the mechanism must preserve:

- exact `ValidationRunIdentity` and step/scenario association;
- the exact observed `SynchronizationPlan` / `planId`;
- assertion failure as a pre-mutation hard stop;
- authorization only from a matched assertion of that exact plan;
- execution through the existing non-overridable `ValidationProductionPathDriver`;
- isolation between Windows and mobile preview/assert/execute cycles in the same C08 scenario;
- no new synchronization authority, production policy, or alternate execution path.

The concrete storage/binding mechanics remain shared-harness engineering discretion.

## Acceptance gate after shared-contract repair

C08 becomes implementable through established extension points when a scenario package can, without shared-helper modification:

1. establish its trusted harness-owned `test-win-c06.md` lineage internally;
2. rename/move it to `test-win-c08-renamed.md` on Windows through the fixture manager/local-vault boundary;
3. preview the Windows production plan and pass the exact observed plan to the plan assertion engine;
4. execute only the authorization returned by that assertion;
5. prove the same remote Drive object ID moved to the new path with unchanged bytes/hash and old-path absence;
6. hand off to the mobile participant;
7. preview/assert/execute the corresponding production local move with the same stable Drive ID;
8. prove old-path absence, new-path byte/hash equality, cross-device authority/convergence, and unrelated-mutation absence;
9. hard-stop before execution for delete+create substitution or any unexpected plan operation.

## Changed files

Implementation/test changes: none — hard stop occurred before authorized implementation.

Evidence-only change:

- `dev/evidence/_ca-output-agt-ca-p6-vh21-c08-scenario-01.md`

No `src/contracts/**`, frozen H0 harness contract, shared harness helper, scenario acceptance file, production source, or test file was modified.

## Implementation SHA

Not applicable — no implementation/test commit was created because the contract-deficiency hard stop occurred before implementation.

## Verification

No focused C08 tests, `npm run check`, or `git diff --check` were run for an implementation because no implementation was authorized after the contract-deficiency gate failed.

Repository inspection/contract reconciliation performed against exact `BASE_SHA` established:

- C08 authoritative package semantics;
- DEC-301–DEC-310;
- complete Phase 6 harness plan;
- shared live-validation protocol;
- VH15 evidence;
- current scenario runner contracts/module adapter/runtime;
- production-path driver;
- plan-assertion engine;
- fixture manager;
- state/convergence verifier;
- production planner move classification.

No live Google Drive, Windows Obsidian, iPhone/iPad, merge, promotion, or release action was performed.

## Deviations

None. The task's explicit contract-deficiency stop rule was followed.

## Blocker

`CONTRACT CHANGE REQUEST` — establish an approved preview-plan → assertion → execution-authorization handoff across runner/module steps before C08 or other mutation scenarios that require fail-closed preview assertion can be implemented safely.

## Stop

Stopped at the contract-deficiency hard gate. C08 was not implemented and C08 PASS is not claimed.
