# BVP-S07F — Deterministic Scale and Resource Measurement

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** accepted S07E

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add bounded host-side deterministic large-file/large-vault execution and resource measurements sufficient to prove required algorithmic/behavioral scale characteristics without turning the BVP into a benchmark framework.

## 2. Required End State

Deterministic coverage executes representative scale cases required by the current product target, including as applicable:

- large individual file transfer/content handling;
- larger managed file counts/vault listings;
- bounded multi-operation synchronization;
- memory/time/resource measurements available in the host environment;
- evidence that safety/identity/integrity semantics remain correct under scale.

Measurements are recorded as evidence; they do not become unsupported universal performance guarantees.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07E predecessor SHA;
- task branch;
- current scale/resource requirements and any explicit thresholds already defined by product authority;
- exact scale scenario/test/evidence paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline;
- machine/environment facts needed to interpret host-side measurements.

Binding may not invent new performance SLAs.

## 4. Required Semantics

### 4.1 Correctness first

Scale cases must still assert content integrity, identity, state, and safety outcomes. A fast run with wrong synchronization semantics is failure.

### 4.2 Bounded measurement

Record only measurements that can be gathered deterministically/reproducibly enough for construction evidence, such as elapsed host time, peak/approximate memory where available, operation counts, and relevant file/vault sizes.

### 4.3 Threshold authority

If the product target defines a hard threshold, enforce it.

If no hard threshold exists, record the measurement without inventing a pass/fail SLA. Functional completion and absence of pathological/unbounded behavior may still be required where specified.

### 4.4 No benchmark framework

Do not create generalized benchmarking infrastructure, historical performance databases, dashboards, or statistical harnesses merely for this child.

### 4.5 Physical-resource boundary

Host deterministic scale cannot prove actual iOS constrained-resource behavior. Representative physical mobile evidence remains S09D.

## 5. Invariants

- Scenario/core architecture stays frozen.
- Measurements do not redefine product requirements.
- Correctness assertions remain mandatory.
- No wall-clock sleeps are used as semantic control.
- No production source changes for test instrumentation unless separately authorized by existing product diagnostics contracts.

## 6. Material Edge / Failure Cases

Required proof includes representative:

- large file content remains intact;
- larger file-count/vault scenario completes with correct state;
- bounded measurements are emitted;
- explicit existing product thresholds, if any, are enforced;
- missing measurement capability is reported honestly rather than fabricated;
- scale run does not require a new runner/benchmark subsystem.

## 7. Engineering Discretion

The agent may choose representative sizes/counts that satisfy current target requirements and remain practical for PHX-CI, plus simple host measurement APIs available in the existing toolchain.

## 8. Dependencies

Consumes frozen S04/S05 platform and deterministic coverage patterns from S06/S07A–E.

## 9. Acceptance Criteria

Required scale cases execute correctly, measurements are captured with environment context, no invented SLA is introduced, architecture remains unchanged, metrics/budgets pass, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not:

- build a performance benchmark product;
- claim mobile physical-resource proof;
- add new platform abstractions;
- optimize production code merely because a measurement is aesthetically undesirable unless an actual requirement fails.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, scale cases/sizes, correctness results, measurements/environment, explicit threshold results if applicable, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07V or S08.
