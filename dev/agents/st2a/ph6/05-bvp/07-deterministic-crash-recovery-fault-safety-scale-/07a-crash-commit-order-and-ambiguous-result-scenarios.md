# BVP-S07A — Crash, Commit-Order, and Ambiguous-Result Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** accepted BVP-S06 primary-stage gate

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for interruption at critical effect/state boundaries and for remote outcomes whose physical result is genuinely uncertain.

The scenarios must prove production recovery semantics; they must not create a new crash/fault framework or encode recovery policy in test infrastructure.

## 2. Required End State

Executable scenarios cover, at minimum:

- interruption before a physical mutation is authorized/applied;
- interruption after durable intent/state records exist but before physical mutation;
- interruption after physical mutation but before canonical product state commit/finalization;
- interruption during/after state commit where the target specification requires restart proof;
- remote mutation returning an ambiguous outcome where effect may have occurred;
- restart/reconciliation after each relevant interruption using fresh runtime objects over retained simulated reality/state.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S06 predecessor SHA;
- exact task branch;
- current product requirement IDs and production execution/state commit boundaries relevant to this coverage;
- accepted S04 fault/restart controls and S05 scenario vocabulary;
- exact scenario/fixture/test writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current architecture metrics baseline.

No new generic fault framework is authorized.

## 4. Required Semantics

### 4.1 Boundary fidelity

Faults/interruption must occur at real or faithfully represented production external/commit boundaries.

Do not simulate a crash by merely changing the expected return value when the evidentiary purpose is retained physical/state reality across restart.

### 4.2 Before-effect interruption

If interruption occurs before physical effect authorization/application, later recovery must observe that the effect did not occur and act according to production state/intent semantics.

### 4.3 After-effect / before-finalization interruption

If the physical effect occurred but canonical state was not finalized, later recovery must reconcile against observed external reality rather than blindly replaying or assuming failure.

### 4.4 Ambiguous outcome

The test infrastructure must preserve uncertainty:

- one variant where the physical effect occurred;
- one variant where it did not;
- the immediate caller cannot know which solely from the ambiguous response;
- later production observation/recovery resolves the state safely.

The injector cannot relabel ambiguity into success/failure for test convenience.

### 4.5 Fresh-runtime recovery

Recovery proof requires destruction/reconstruction of runtime objects over retained state and external reality.

## 5. Invariants

- Product recovery logic decides what to do.
- Fault injection cannot bypass product safety/authorization.
- Ambiguity remains ambiguity until observation proves reality.
- Test scenarios do not directly commit product state.
- No scenario-specific core or production source is added.
- Scenario-only default remains in force.

## 6. Material Edge / Failure Cases

Scenarios must prove representative cases for:

- no effect before mutation;
- durable intent without physical effect;
- physical effect without final canonical state;
- ambiguous effect-applied;
- ambiguous effect-not-applied;
- repeated restart/recovery is idempotent/safe where required;
- recovery does not duplicate destructive/remote effects;
- wrong expected recovery state fails deterministically.

If the frozen platform lacks a required generic boundary hook, return `BLOCKED` with the exact missing primitive.

## 7. Engineering Discretion

The agent may choose representative production operations/boundaries and fixture data based on current target requirements, while using the already-accepted generic fault controls.

## 8. Dependencies

Consumes S04 restart/fault/ambiguity capabilities, S05 runner/evidence, and accepted S06 core freeze.

## 9. Acceptance Criteria

Required crash/commit-order/ambiguity scenarios pass against real production logic; restart is genuine; uncertainty is preserved; duplicate effects are prevented as required; wrong expectations fail; scenario/core budgets pass; authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover corrupt state/cursor/root recovery (07B), device authority/cancellation (07C), transfer/retry (07D), quota/disk/destructive/config/lifecycle (07E), or scale/resource measurement (07F).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, mapped requirements, interruption boundaries exercised, scenario results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07B.
