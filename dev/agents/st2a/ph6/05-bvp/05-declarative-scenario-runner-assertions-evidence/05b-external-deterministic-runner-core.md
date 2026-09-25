# BVP-S05B — External Deterministic Runner Core

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence  
**Predecessor:** accepted S05A

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Implement one small external deterministic runner that interprets the S05A scenario vocabulary against the accepted S04 virtual world and owns scenario sequence and terminal verdict.

## 2. Required End State

The runner can:

- accept one typed declarative scenario;
- establish a fresh deterministic execution context/world;
- interpret supported step kinds in declared order;
- invoke the real production path through S04 for production-operation steps;
- apply fixture/external-state transitions through generic S04 controls;
- request observations and assertions through stable generic hooks that 05C may extend;
- stop deterministically on unsupported, failed, blocked, or missing-required-result conditions;
- return a typed execution result sufficient for 05C evidence enrichment;
- execute without scenario-specific orchestration classes or distributed state.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S05A predecessor SHA;
- task branch;
- actual scenario types/vocabulary;
- actual S04 world-builder and production-operation surfaces;
- exact runner/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- size-gate confirmation.

Binding may not add new step families merely because one implementation strategy would prefer them.

## 4. Required Runner Semantics

### 4.1 External authority

The runner owns:

- current scenario step position during execution;
- deterministic dispatch of each declared step;
- propagation of failure/blocking;
- terminal scenario execution classification.

Production code remains authority for synchronization behavior and product results.

### 4.2 Ordered execution

Steps execute in declared order unless the frozen scenario semantics explicitly describe another deterministic behavior.

No hidden background scenario state machine may alter sequence.

### 4.3 Fail closed

The runner MUST NOT return PASS when:

- a step kind is unsupported;
- a required executor capability is unavailable;
- a required production result/observation is missing;
- a step returns an ambiguous state that the scenario requires to be resolved before assertion;
- a step fails or blocks and no explicit scenario semantics allow continuation.

Unsupported operation is not a no-op.

### 4.4 Generic dispatch

Dispatch is by the frozen generic step vocabulary, not by scenario identity.

Adding an ordinary scenario must not require adding an `if scenarioId == ...` branch to runner core.

### 4.5 Production-path fidelity

Production-operation steps invoke accepted S04 composition over real production planner/executor/state logic.

The runner cannot directly mutate product synchronization state to manufacture expected outcomes.

### 4.6 Deterministic execution

No wall-clock sleeps are needed for semantic correctness. The runner uses S04 deterministic controls.

## Invariants

- The external runner is the sole owner of scenario sequencing and verdict state.
- Production code remains the sole authority for synchronization decisions and product results.
- Dispatch is by frozen generic step semantics, never by scenario identity.
- Unsupported or missing required capability/evidence cannot become PASS.
- The runner carries no durable distributed/per-device scenario state.
- Deterministic execution does not depend on wall-clock sleeps.

## 5. Result Semantics

The core result must distinguish at least:

- completed/pass-candidate execution;
- assertion/step failure where known;
- blocked/unavailable required capability/evidence;
- unsupported/invalid scenario/step.

05C may add canonical evidence fields, but 05B must not collapse these states into one boolean that loses failure meaning.

## 6. Material Edge / Failure Cases

Tests must cover:

- valid multi-step scenario executes in order;
- unsupported step fails/blocks deterministically;
- missing required result does not PASS;
- production-operation failure propagates;
- fixture failure propagates;
- same scenario produces deterministic execution ordering across repeated runs;
- runner dispatch does not depend on scenario ID;
- deliberate wrong/unknown step cannot be silently skipped;
- runner does not persist distributed/per-device scenario state.

## 7. Engineering Discretion

The agent may choose:

- internal dispatch structure;
- handler registry limited to the frozen step vocabulary;
- async control flow;
- internal execution-context shape;
- private error/result types.

Do not introduce a general plugin/module router or extensibility framework.

## 8. Dependencies

Consumes accepted S04 world and S05A scenario contract.

05C will add generic observation/assertion/evidence semantics; keep runner extension points narrow and vocabulary-driven rather than prebuilding a large framework.

## 9. Acceptance Criteria

Acceptance requires one common runner, deterministic ordered dispatch, fail-closed unsupported/missing-result behavior, real production-path invocation through S04, no scenario-ID-specific logic, no distributed state, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- canonical evidence aggregation;
- broad assertion library;
- checkpoint persistence;
- live executor;
- scenario catalog migration;
- plugin/router system;
- new production seams.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, runner result states, focused tests/results, architecture metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 05C.