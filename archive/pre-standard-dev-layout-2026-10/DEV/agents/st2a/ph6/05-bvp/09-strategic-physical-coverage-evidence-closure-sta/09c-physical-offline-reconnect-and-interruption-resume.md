# BVP-S09C — Physical Offline / Reconnect and Interruption / Resume

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Predecessor:** accepted S09B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten physical-evidence contract. Dispatch binding supplies exact device/run/checkpoint coordinates only.

## 1. Objective

Prove real network/lifecycle behavior that deterministic simulation cannot substitute for: actual offline/reconnect and actual application suspension/termination/restart/resume on the relevant Windows/iOS runtimes.

## 2. Required End State

Physical evidence demonstrates:

- at least one real offline condition during a bounded synchronization-related workflow;
- production behavior while provider/network access is unavailable;
- actual reconnect and safe continuation/reconciliation;
- actual Obsidian/app interruption/termination at a meaningful checkpoint;
- later app restart/foreground resume using bounded external checkpoint state;
- no assumption of unsupported iOS background execution;
- no duplicate/destructive effects caused by interruption/resume;
- exact production/device results supporting the claimed behavior.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S09B build/device state;
- exact device(s) on which offline and lifecycle transitions will be performed;
- exact disposable fixture/run identities;
- exact offline mechanism/operator action appropriate to the platform;
- exact app suspension/termination/restart actions;
- exact pre-transition stop conditions;
- exact resume observations/commands;
- exact evidence output paths/writable allowlist;
- current PHX-CI repository verification baseline.

## 4. Required Physical Semantics

### 4.1 Actual offline transition

The network/provider unavailability must be physically real for the selected device/runtime. A simulated S04 network fault does not satisfy this physical-evidence requirement.

### 4.2 Offline production behavior

Production must classify/block/retry/defer according to current product semantics without asserting false success.

### 4.3 Actual reconnect

After physical connectivity returns, production must safely observe/reconcile and reach the target-required state without test infrastructure forcing product state.

### 4.4 Actual interruption / termination

The app/runtime must actually be suspended/terminated/restarted where that lifecycle transition is the evidentiary point.

Do not substitute a method call that merely simulates restart.

### 4.5 External resume authority

The external runner/checkpoint records the next test action. The device does not preserve a distributed scenario engine in the background.

### 4.6 Mobile reality

On iOS, foreground-only execution, suspension, termination, and later resumption are valid realities. The test must not require unsupported continuous background execution.

## 5. Invariants

- Physical transitions remain physical.
- External checkpoints remain test state only.
- Ambiguous/failed effects remain non-success until reconciled.
- No duplicate command/effect after resume.
- Disposable fixtures only.
- Deterministic S07 crash/recovery evidence remains complementary semantic proof.

## 6. Material Edge / Failure Cases

Evidence must detect:

- false success while offline;
- stale transport command replay after reconnect;
- duplicate remote mutation after interruption;
- app restart losing required production state improperly;
- app restart depending on device-local scenario state;
- inability to reconnect/reconcile;
- required iOS action unavailable in the actual environment.

Unavailable physical capability yields `BLOCKED`, not synthetic substitution.

## 7. Evidence Requirements

Record:

- exact run/device/build identity;
- pre-transition state/receipt;
- operator offline/termination action;
- observed offline/lifecycle state;
- checkpoint representation;
- resume/reconnect action;
- post-resume production receipt/state;
- content/identity effect;
- duplicate/staleness safety result;
- terminal verdict.

## 8. Engineering / Operator Discretion

The operator may choose the safest platform-supported method for toggling connectivity and terminating/restarting the app, while preserving the exact semantic transition required.

## 9. Dependencies

Consumes S08 external checkpoints/live executor and S07 deterministic recovery semantics.

## 10. Acceptance Criteria

Acceptance requires actual offline/reconnect and actual lifecycle interruption/resume evidence, fail-closed offline behavior, safe no-duplicate recovery, no iOS-background assumption, exact traceability, and supervisor review.

Any repository evidence change must pass authoritative PHX-CI.

## 11. Non-Goals

Do not claim broad provider outage testing; do not perform path/resource/large transfer (09D) or auth/lifecycle revocation/uninstall (09E).

## 12. Handoff / Stop

Report exact transition actions, device/build/run identities, before/after receipts/state, checkpoint/resume evidence, duplicate-safety result, blockers, evidence paths, and any evidence commit.

Stop at the supervisor-reviewed S09C physical evidence gate.

Do not begin 09D.
