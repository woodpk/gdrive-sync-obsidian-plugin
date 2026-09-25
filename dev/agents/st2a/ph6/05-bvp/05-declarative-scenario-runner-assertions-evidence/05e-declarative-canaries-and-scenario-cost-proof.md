# BVP-S05E — Declarative Canaries and Scenario-Cost Proof

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence  
**Predecessor:** accepted S05D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Prove that the S04/S05 platform can express and execute ordinary multi-device synchronization tests as declarative data, and prove that adding a second ordinary scenario does not require a platform-core change.

## 2. Required End State

At least two representative deterministic canaries exist and pass through the common scenario model/runner/assertion/evidence path.

The canary set must include:

- at least one multi-device merge/conflict-style scenario exercising real production synchronization semantics;
- a second ordinary scenario that uses the already-frozen vocabulary/core and is implemented by scenario/fixture/test data only.

A deliberately wrong expectation for a canary must fail deterministically.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S05D predecessor SHA;
- task branch;
- actual scenario/fixture catalog locations;
- actual focused runner command;
- exact scenario/test writable allowlist;
- PHX-CI base/pin/runtime;
- current architecture metrics baseline;
- size-gate confirmation.

The platform core is treated as frozen for the second-scenario proof unless a genuinely missing generic capability causes a BLOCKED return.

## 4. Canary Semantics

### 4.1 First canary

Use the existing generic vocabulary to exercise a meaningful multi-device production-path merge/conflict behavior.

The canary must assert objective results such as final content/identity/conflict classification/state rather than only successful command completion.

### 4.2 Second ordinary canary

Add another ordinary scenario after the common core is already sufficient.

Its implementation must require no change to:

- runner core;
- scenario vocabulary;
- generic assertion/evidence engine;
- virtual-world core;
- production source;
- transport/persistence architecture.

Scenario-specific fixture data/helpers are permitted only inside the scenario/fixture layer.

### 4.3 Cost tripwire

Each ordinary scenario:

- targets ≤120 logical lines;
- hard-fails architecture acceptance above 200 logical lines;
- introduces zero scenario-specific PowerShell;
- introduces zero scenario-specific production source.

If an ordinary scenario requires a new platform abstraction/core capability, STOP and report the missing generic capability rather than silently changing core.

## 5. Invariants

- Scenarios remain data.
- No scenario ID branches appear in core runner/world/production.
- Production semantics are executed by real production logic.
- Evidence uses the canonical S05C model.
- Checkpoint representation is not required unless the canary semantically needs a generic checkpoint.
- Architecture metrics distinguish scenario growth from core growth.

## 6. Material Edge / Failure Cases

Tests/evidence must prove:

- first canary passes with correct expectations;
- an inverted/wrong expectation fails;
- second canary passes;
- second canary's change surface is scenario/fixture/test only;
- no core files need modification for the second canary;
- each scenario remains below hard LOC limit;
- scenario-specific PowerShell count remains zero;
- production scenario-specific source remains zero.

## 7. Engineering Discretion

The agent may choose the exact representative canary subjects provided they satisfy the required merge/conflict and second-ordinary-scenario proof and map to real BRAIN requirements.

Scenario data syntax follows accepted S05A; do not redesign it for stylistic preference.

## 8. Dependencies

Consumes all accepted S04 and S05A–S05D capabilities.

Successful completion freezes the P3 common core for scenario-dominant S06/S07 coverage.

## 9. Acceptance Criteria

Acceptance requires two declarative canaries, wrong-expectation detection, scenario-only second addition, scenario-cost compliance, no core/production/PowerShell growth for the second ordinary scenario, requirement traceability, architecture guard/metrics PASS, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not:

- migrate full reconciliation coverage;
- add S06/S07 scenario batches;
- expand the vocabulary merely for convenience;
- add live execution;
- modify production source.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, canary requirement mappings/results, wrong-expectation result, second-scenario change-surface proof, per-scenario LOC, core metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin S06.
