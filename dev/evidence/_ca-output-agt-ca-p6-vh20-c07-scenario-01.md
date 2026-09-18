STATUS: BLOCKED

# VH20 — C07 Windows Edit → Mobile Download/Update

Agent: `agt-ca-p6-vh20-c07-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Branch: `phase6-vh20-c07-scenario`

## Executable base gate

- Required predecessor branch: `phase6-vh15-validation-mode-runtime-canary`
- Resolved exact `BASE_SHA`: `6372184d2649e21369001ea28cc583e6636781c5`
- Predecessor evidence: `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md`
- Evidence first line: `STATUS: COMPLETE`
- Gate result: PASS
- Required branch was created from exactly `BASE_SHA`.

## Authorities inspected

The blocked determination was made after inspecting the repository state at the exact base, including:

- `dev/planning-and-building/phase6-live-validation-harness-plan.md`
- `dev/planning-and-building/decision-register.yaml` — DEC-301 through DEC-310
- `dev/agents/st2a/ph6/04-lv/01-test/00-live-validation-protocol.md`
- `dev/agents/st2a/ph6/04-lv/01-test/C07-windows-update-ios-download.md`
- `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md`
- current H6 runner, module-adapter, validation-mode runtime, production-path driver, plan-assertion, fixture, sandbox, verifier, coordinator, and evidence APIs.

## Blocking shared-contract deficiency

C07 requires the harness to:

1. obtain the actual production synchronization plan;
2. assert that exact observed plan against the scenario contract before mutation;
3. hard-stop on any unexpected/stale plan;
4. execute only the exact asserted plan through the production execution path; and
5. independently verify the post-mutation replacement/content/state result.

The frozen H6 extension surface cannot currently carry the required plan/authorization data across those runner steps.

### Concrete incompatibility

- `ValidationRunnerStepDefinition.input` is immutable scenario-definition data fixed before execution.
- `ValidationRunnerDelegatedStepResult` can return lifecycle/proof/evidence information but cannot return an observed `SynchronizationPlan` or a `ValidationPlanExecutionAuthorization` for a later step.
- `ValidationModeRuntime` binds `production-path-driver` internally and expressly rejects overriding that module.
- The H6B production delegate maps `plan-observed` to generic `completed` and discards the observed plan from the runner/module boundary.
- A later `execute-asserted-plan` operation requires `request.input.authorization`.
- `ValidationProductionPathDriver` correctly rejects execution unless that authorization belongs to the exact run, is asserted, and names the same plan ID most recently observed by that driver.

Therefore no static C07 scenario definition can legally supply the later execution authorization, because the authorization does not exist until the actual runtime plan has been observed and asserted.

### Why a local workaround is prohibited

The defect cannot be bypassed within VH20 without violating governing authority:

- performing preview/assert/execute inside one scenario-specific module would move production execution or assertion responsibility across the frozen module ownership boundaries from DEC-303;
- replacing or shadowing the production driver would violate DEC-302 and the fixed non-overridable H6B production binding;
- executing before the plan assertion would violate DEC-305 and the shared protocol's pre-mutation hard stop;
- precomputing or fabricating an authorization would defeat the stale-plan protection enforced by `ValidationProductionPathDriver`.

## CONTRACT CHANGE REQUEST

A supervisor-owned H6/H0 extension is required before C07 can be implemented safely.

The extension must preserve existing module ownership while providing a run-scoped way for the exact observed production `SynchronizationPlan` and the resulting `ValidationPlanExecutionAuthorization` to flow:

`production preview -> plan assertion -> authoritative production execution`

The flow must remain bound to the exact validation run and plan ID, must not make the production driver overridable, and must preserve the existing stale-plan rejection behavior.

The exact storage/mechanical representation is an engineering decision for the shared-contract owner; VH20 does not redefine it locally.

## Implementation / test changes

None. No production, harness, frozen-contract, test, or scenario-text file was modified because doing so before resolving the shared-contract deficiency would either be non-executable or violate the frozen architecture.

## Verification

- Executable base/evidence gate: PASS.
- Static repository/contract inspection: BLOCKED as described above.
- Focused C07 tests: NOT RUN — no compliant C07 implementation can be constructed against the current frozen extension surface.
- `npm run check`: NOT RUN — implementation did not begin after the mandatory contract hard stop.
- `git diff --check`: NOT AVAILABLE through the connected repository API in this session; only this evidence file is intentionally added on the blocked branch.
- Live Google Drive/mobile validation: NOT RUN, as required.

## Changed files

Evidence-only blocked branch delta:

- `dev/evidence/_ca-output-agt-ca-p6-vh20-c07-scenario-01.md`

No implementation SHA exists because implementation was correctly stopped before an unauthorized shared-contract change.

## Stop

Stopped at the shared-contract hard gate. No merge, promotion, release, physical C07 execution, or C07 PASS claim was performed.
