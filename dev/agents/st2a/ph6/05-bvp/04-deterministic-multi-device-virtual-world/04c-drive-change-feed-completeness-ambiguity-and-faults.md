# BVP-S04C — Drive Change Feed, Completeness, Ambiguity, and Boundary Faults

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Extend the deterministic Drive simulation with production-faithful change-feed, listing-completeness, ambiguous-result, and boundary-fault behavior required to exercise recovery and safety semantics later.

## 2. Required End State

The simulated Drive can deterministically model:

- change cursor/token progression;
- ordered remote change observations as required by production contracts;
- listing/change-feed completeness versus explicitly incomplete/uncertain coverage;
- stale/invalid/lost cursor conditions where production logic handles them;
- provider/network failures at understood Drive boundaries;
- remote mutation outcomes that may be known-success, known-failure, or ambiguous;
- ambiguous outcome where the remote physical effect may have occurred but the caller cannot know from the response alone.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S04B predecessor SHA;
- task branch;
- current Drive/change-feed production interfaces and result/error classifications;
- exact extension/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- size-gate confirmation.

Binding may not invent new product uncertainty semantics.

## 4. Required Behavior and Semantics

### 4.1 Change-feed fidelity

Remote mutations produce deterministic change events/cursor progression matching the production contract's observable shape.

Change ordering must be controllable/reproducible without wall-clock timing.

### 4.2 Completeness is explicit

A listing/change observation must distinguish complete knowledge from incomplete/uncertain coverage when the production contract does.

Incomplete coverage MUST NOT be silently presented as authoritative absence.

This is crucial for later deletion safety tests.

### 4.3 Cursor loss / invalidity

The simulation must be able to present lost/invalid/stale cursor conditions that production recovery logic must handle.

The simulator reports the external condition; it does not choose the recovery policy.

### 4.4 Ambiguous remote effect

For an injected ambiguous mutation:

- the remote effect MAY have occurred;
- the caller receives an outcome that does not prove success or failure;
- later observation/reconciliation can reveal the actual retained remote state;
- the simulator must not relabel the ambiguous result merely to simplify the test.

This preserves BVP-FAULT-002.

### 4.5 Boundary faults

Fault injection occurs at explicit external/provider boundaries understood by the production Drive contract.

It may model transient/permanent provider/network classes needed later, but cannot bypass production retry, authorization, safety, or commit logic.

## 5. Invariants

- Fault controls change external observations/effects only.
- Fault controls cannot directly set product planner/executor decisions.
- Ambiguity never becomes artificial certainty.
- Partial listing never becomes implicit deletion proof.
- Cursor/revision/change ordering is deterministic.
- No live provider dependency exists.

## 6. Material Edge / Failure Cases

Required deterministic tests include:

- mutation emits expected change event;
- multiple mutations yield deterministic change order;
- valid cursor advances;
- invalid/lost cursor state is observable;
- complete listing is distinguishable from partial/incomplete listing;
- partial listing omits data without claiming authoritative absence;
- known mutation failure leaves known remote state;
- known success mutates expected remote state;
- ambiguous result with effect applied;
- ambiguous result with effect not applied;
- subsequent observation can distinguish retained reality;
- injected transient/permanent failures preserve production-facing classifications.

## 7. Engineering Discretion

The agent may choose:

- cursor representation;
- internal event log;
- deterministic fault scripting primitives;
- helper APIs used by tests/world builder;
- internal scheduling of modeled outcomes.

Do not create a generalized fault framework/plugin system beyond what the frozen BVP boundary requires.

## 8. Dependencies

Consumes S04B core Drive state and the production Drive/change contracts.

Later S04E and S07 will consume these capabilities; they must remain generic boundary controls rather than scenario-specific behaviors.

## 9. Acceptance Criteria

Acceptance requires all semantics above, explicit completeness and ambiguity proof, production-port fidelity, no policy duplication, deterministic tests, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- product recovery policy;
- per-device state store;
- global world composition;
- scenario runner/DSL;
- persistent scenario fault programs;
- live Google Drive faults.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, bound interfaces, focused tests/results, ambiguity/completeness cases, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 04D.
