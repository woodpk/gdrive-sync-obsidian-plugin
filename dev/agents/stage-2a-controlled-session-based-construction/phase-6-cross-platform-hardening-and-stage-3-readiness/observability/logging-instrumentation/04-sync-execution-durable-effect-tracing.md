# Phase 6 Logging Instrumentation — LOG-04 Sync Execution and Durable-Effect Tracing

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log04-sync-execution-durable-effect-tracing-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-04`
- Task classification: `IMPLEMENTATION`
- Prompt maturity: `PREPLANNED / NOT-YET-EXECUTABLE`

Assignment:

> Instrument the synchronization execution path with the frozen LOG-01 observability contract so a diagnostic trace can reconstruct each planned operation from authority resolution and precondition validation through durable intent persistence, effect authorization, physical-result classification, verification, canonical state commit/finalization, and final operation result, without changing synchronization semantics or entering the Google Drive transport/state-store ownership of peer work packages.

This task owns execution/durable-effect lifecycle tracing only.

## 1. Base / Drift Gate

Deferred execution-critical binding:

`COMMON_BASE_SHA = <deferred: exact supervisor-approved LOG-01 output SHA>`

Required semantic predecessor:

> The exact approved LOG-01 shared observability contract.

Required branch:

`phase6-logging-log04-sync-execution-durable-effect-tracing`

Binding authority: supervisor only. Execution is prohibited until `COMMON_BASE_SHA` is supplied exactly.

Before editing:

1. Resolve and verify `COMMON_BASE_SHA`.
2. Verify repository identity and clean working tree.
3. Create the required branch from exactly that SHA.
4. Inspect the current execution flow and tests, especially `src/product/authority-execution-diagnostics.ts`, `src/product/authoritative-production-executor-base.ts`, bounded relevant regions of `src/core/execution-coordinator.ts`, `src/product/product-controller-base.ts` call/correlation behavior, and durable-effect lifecycle tests.
5. Read the approved LOG-01 component/field/correlation contract and use it unchanged.

Do not substitute any branch tip or another W1 output. Stop on material drift or frozen-contract mismatch.

## 2. Governing Authority

Correctness is governed by:

1. Later explicit supervisor decisions.
2. Target-system operation-commit ordering and invariants, especially validate -> mutate -> verify -> authoritative state commit, no success before durable verification, explainability, recovery safety, and local-only diagnostics.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`, revision `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`.
5. Logging-instrumentation session contract.
6. Approved LOG-01 frozen observability contract.
7. This prompt.
8. Repository code/tests as current-state evidence.

Instrumentation may expose existing defects; it must not repair or reinterpret them here.

## 3. Temporal / Dependency Context

This is Wave `W1`, parallel with `LOG-02` and `LOG-05`.

All W1 agents:

- start from the same exact LOG-01 base;
- consume the same frozen diagnostic contract;
- own disjoint semantic surfaces;
- must not wire shared runtime composition roots.

The supervisor will review each output independently and integrate only approved SHAs. Shared composition wiring occurs later in `LOG-03`.

Completion of this task does not authorize integration or successor work.

## 4. Scope

Primary in-scope surfaces:

- `src/product/authority-execution-diagnostics.ts`;
- `src/product/authoritative-production-executor-base.ts`;
- bounded execution-lifecycle regions of `src/core/execution-coordinator.ts`;
- focused execution/durable-effect tests;
- narrowly necessary execution-local diagnostic helper code.

A minimal diagnostic-only change in `src/product/product-controller-base.ts` is allowed only if required to propagate an already-existing `runId`, `planId`, or operation correlation into the owned execution surface without changing control flow. Prefer existing correlation seams.

Out of scope:

- `src/drive/transport.ts`;
- `src/drive/google-drive-port.ts`;
- state-store/CAS/change-feed/recovery internals owned by `LOG-05`;
- `src/drive/runtime.ts`, broad `src/product/runtime.ts`, or `src/main.ts` composition/UI wiring;
- synchronization bug repair;
- live testing.

## 5. Required Behavior

### 5.1 Operation-level causal identity

For every execution attempt, diagnostics must preserve causal association among the existing synchronization `runId` and, when available:

- `planId`;
- `operationId`;
- `intentId`;
- `effectId`;
- safe `pathKey`;
- `operationKind`/direction/target side;
- destructive/non-destructive classification.

Use the frozen LOG-01 names and helpers. Do not persist raw vault paths.

### 5.2 Authority resolution and precondition tracing

Make visible, without duplicating sensitive/raw state:

- operation entry;
- exact-authority resolution success/failure;
- precondition validation start/result;
- stale/recovery-required/blocked classifications;
- failed-precondition type/count evidence already represented safely by the existing diagnostics layer.

Existing validation behavior and failure mapping must remain unchanged.

### 5.3 Durable-intent lifecycle tracing

For physical operations, record the important durable lifecycle boundaries in causal order:

- intent preparation;
- durable intent persistence result;
- each effect identity/descriptor class;
- transition from `intent-persisted` to `dispatch-authorized`;
- physical dispatch start;
- physical result classification: `verified-effect`, `verified-not-applied`, `conflict-preserved`, `outcome-unknown`, or equivalent existing result;
- transition to `effect-verified` or `outcome-unknown` when persisted;
- verification evidence reference when safe/available;
- restart/recovery path entry when the executor consumes an existing intent;
- convergence re-verification before success;
- durable finalization to `state-committed` after canonical commit.

Use `fromStage`/`toStage` and the frozen identifiers rather than inventing parallel stage names.

### 5.4 Canonical commit boundary

The trace must make the target-system commit contract observable:

1. precondition validation;
2. physical mutation/result;
3. physical/convergence verification;
4. canonical commit attempt/result;
5. durable effect finalization;
6. final coordinated operation result.

Record the commit result/classification and safe state revision/generation identifiers available at this layer, but do not change commit ordering or pull state-store logic into this work package.

### 5.5 Failure and uncertainty visibility

Trace the exact existing branch/reason for:

- stale precondition;
- blocked operation;
- recovery-required result;
- retryable failure;
- uncertain/outcome-unknown result;
- cancellation;
- canonical state unavailable after physical verification;
- durable intent missing or at unexpected stage;
- convergence failure after a physical result;
- durable finalization failure.

The trace must distinguish “physical effect happened but authority did not commit” from “no verified physical effect.” Do not infer facts that the current code cannot prove.

### 5.6 Non-authoritative diagnostics

Diagnostics must not:

- change the order in which durable intent/effect state is saved;
- change whether an operation executes;
- change error/failure mapping;
- trigger recovery;
- introduce retries;
- swallow an existing error;
- promote an uncertain result to success.

## 6. Ownership and Shared Contracts

Owned semantic surface:

- execution/durable-effect diagnostic events inside the files identified in Section 4.

Frozen shared contract:

- LOG-01 event fields/component taxonomy/path privacy/correlation semantics.

Protected peer surfaces:

- Google HTTP transport (`LOG-02`);
- state/CAS/change-feed/durable recovery internals (`LOG-05`);
- Drive adapter semantics (`LOG-03` later);
- shared runtime composition and UI.

Avoid edits to `src/product/operation-isolation.ts` unless inspection proves the only accurate stage-transition observation point exists there and no peer owns that exact mutable region. If such an edit is materially required, stop and return the ownership need to the supervisor instead of expanding scope automatically.

If LOG-01 lacks required semantics, stop rather than changing it.

## 7. Architecture and Dependency Constraints

- Keep current execution APIs and return types behaviorally unchanged.
- Add no dependencies.
- Use existing diagnostic observer/logger seams where possible.
- Any new diagnostic parameter must be optional/backward-compatible so shared composition need not change in W1.
- Do not duplicate durable state as diagnostic state.
- Avoid high-volume per-chunk/per-byte events; this layer records semantic lifecycle boundaries.
- Preserve mobile compatibility.
- Safe identifiers/hashes may be logged; raw paths/file contents may not.

## 8. Required Implementation Work

1. Trace the current end-to-end operation execution lifecycle in code before editing.
2. Extend the existing authoritative execution diagnostics rather than creating a second execution logger.
3. Add bounded structured events at the exact durable-intent/effect, physical-result, convergence, commit, and finalization boundaries required by Section 5.
4. Ensure correlation fields persist through normal dispatch and existing-intent/recovery execution paths.
5. Use the LOG-01 path-key helper where path correlation is useful; never emit raw path.
6. Add focused tests that assert event order, correlation identity, stage transitions, failure classification, and no semantic changes.
7. Reconcile all changed files to the ownership boundary.

## 9. Tests and Verification

Focused tests must prove at minimum:

- a successful physical operation emits ordered evidence from validation through intent/effect, verified physical result, canonical commit, durable finalization, and final success;
- one `operationId`/`intentId`/`effectId` remains correlated throughout that lifecycle;
- a stale precondition emits no physical-dispatch success evidence;
- `outcome-unknown` remains distinguishable from verified success and is not logged as committed;
- a physical verified effect followed by canonical commit failure is distinguishable from no-effect failure;
- existing-intent/restart execution emits recovery-path evidence without falsely logging redispatch when the code only re-observes;
- cancellation/blocked/recovery-required branches retain their existing result semantics;
- raw path text and file contents do not appear in rendered events;
- diagnostics do not alter execution return values or lifecycle transitions.

Run:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

Record focused non-zero test counts and inspect the complete diff from resolved `COMMON_BASE_SHA`.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log04-sync-execution-durable-effect-tracing-01.md`

Include:

- identity/work-package/task type/Wave `W1`;
- resolved exact common base SHA;
- branch and final implementation/evidence SHAs;
- complete changed-file list;
- frozen LOG-01 contract consumed;
- lifecycle boundaries instrumented;
- exact event/correlation behavior demonstrated;
- focused/full test commands/counts/results;
- typecheck/build/diff-check results;
- limitations/unavailable checks;
- confirmation no execution/state semantics were changed;
- confirmation no raw paths/secrets/file content entered diagnostics/evidence;
- confirmation no live Drive mutation occurred;
- exact stop state.

Commit implementation and evidence. Do not claim approval.

## 11. Prohibitions

- No live sync/Drive mutation/B01 rerun.
- No current B01 defect repair.
- No Google transport or Drive-adapter instrumentation.
- No state-store/recovery peer-surface edits.
- No LOG-01 schema changes.
- No shared composition wiring.
- No change to operation ordering, result mapping, retry/recovery behavior, or canonical commit semantics.
- No dependency changes.
- No raw paths, secrets, request bodies, or file contents in diagnostics/tests/evidence.
- No unrelated refactor/cleanup/formatting churn.
- No merge, release, B02–O, iPhone validation, or Stage 3.

## 12. Hard-Stop Conditions

Stop if:

- the deferred common base is unresolved or mismatched;
- material drift invalidates the task;
- LOG-01 cannot represent required events;
- accurate instrumentation requires peer-owned state/transport/Drive changes;
- adding logging would change execution semantics or ordering;
- safe instrumentation would require raw content/secrets;
- an ownership overlap with another W1 stream appears;
- mandatory verification cannot be completed;
- unexplained repository changes appear.

Do not improvise around the blocker.

## 13. Completion and Return to Supervisor

Return the exact resolved base, branch, implementation/evidence SHAs, changed files, focused/full verification results, and concise causal lifecycle now observable. Then stop for independent supervisory review.

Do not integrate or begin another work package.