# BVP-S05A — Typed Scenario Contract and Small Step Vocabulary

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence  
**Predecessor:** accepted BVP-S04 primary-stage gate

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Define the small typed declarative scenario data model that later BVP execution will interpret.

Scenarios are source-controlled **data describing test intent**, not custom orchestration programs, executable scenario classes, or alternate synchronization logic.

## 2. Required End State

The accepted scenario contract can express, without implementing a runner yet:

- scenario identity and human description;
- product requirement/invariant/completion-evidence traceability;
- execution-mode applicability where needed;
- ordered declarative steps;
- typed step-specific inputs;
- fixture setup/change operations;
- production preview/sync/execute/reconcile invocation intent;
- external-reality/fault transitions;
- checkpoint/restart intent;
- observation requests;
- assertion intent;
- explicit expected blocking/failure conditions where appropriate.

The initial step vocabulary remains intentionally small and capability-oriented.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S04 predecessor SHA;
- exact task branch;
- actual S04 world/public test API and production operation entrypoints available for later execution;
- exact scenario-contract/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- size-gate confirmation.

Binding may not turn repository-specific implementation details into scenario-specific orchestration concepts.

## 4. Required Scenario Semantics

### 4.1 Scenarios are data

A scenario definition must be serializable/inspectable structured data whose meaning comes from the common vocabulary.

Do not encode sequence logic in callbacks, per-scenario classes, arbitrary functions, or scenario-specific runner code.

### 4.2 Small capability vocabulary

The initial vocabulary must cover only generic capability families needed by the BVP target specification:

1. establish/mutate deterministic fixture reality;
2. invoke a production synchronization capability;
3. change modeled external/fault/lifecycle state;
4. checkpoint/restart runtime when required;
5. observe objective state/result;
6. assert expected behavior.

The exact type names and syntax are engineering discretion.

### 4.3 Strong typing / invalid-state reduction

Step variants must make their required inputs explicit and prevent unrelated fields from being freely combined.

Unknown/unsupported step kinds must not be representable as silently valid executable scenarios.

### 4.4 Traceability

Every scenario must carry one or more target requirement/invariant/evidence identifiers sufficient for later aggregation.

Historical C03–F03 IDs may appear only as optional migration traceability labels; they do not define architecture or scenario identity authority.

### 4.5 Executor neutrality

The scenario contract must not embed deterministic-world implementation objects or live-device transport objects.

Where the same semantic action may later execute through deterministic or live executors, the scenario represents the capability intent rather than one executor's mechanics.

## 5. Invariants

- No runner lifecycle is implemented here.
- No persistence/checkpoint storage implementation is introduced.
- No evidence aggregation implementation is introduced.
- No scenario-specific production seam is created.
- No scenario-specific PowerShell exists.
- No plugin/router/module framework is introduced.
- Scenario definitions cannot authorize product mutations outside normal production operations.

## 6. Material Edge / Failure Cases

Contract tests must establish at least:

- valid representative scenario can be constructed;
- traceability metadata is required where the contract requires it;
- each step family requires its own essential fields;
- unsupported/unknown step types fail validation/type exhaustiveness rather than defaulting to no-op;
- deterministic/live applicability metadata cannot silently cause required steps to disappear;
- scenario ordering is explicit;
- a scenario cannot embed arbitrary executable callbacks as its orchestration mechanism.

Where compile-time typing is the primary guarantee, use compile-time/type-level tests or deterministic construction validation appropriate to the repository.

## 7. Engineering Discretion

The agent may choose:

- discriminated-union/type syntax;
- exact names for scenario/step records;
- whether limited runtime schema validation is necessary;
- file/module decomposition;
- helper constructors that preserve declarative data semantics.

Do not introduce dependencies or a general schema/plugin framework unless already available and justified by the fixed contract.

## 8. Dependencies

Consumes the semantic capabilities proven by S04 but does not execute them yet.

05B will interpret these types; therefore public step semantics must be stable enough that the runner does not need scenario-specific branching outside the frozen vocabulary.

## 9. Acceptance Criteria

Acceptance requires:

- typed declarative scenario model exists;
- initial vocabulary covers all six generic capability families above;
- traceability metadata is represented;
- invalid/unsupported step semantics fail closed;
- no runner/persistence/evidence/live architecture is introduced;
- architecture guard/metrics pass;
- authoritative PHX-CI passes focused/full verification.

## 10. Non-Goals

Do not implement:

- deterministic runner;
- observations/assertion execution;
- evidence serialization;
- checkpoint storage/resume;
- canary scenario catalog beyond minimal type fixtures/tests;
- S06/S07 requirement coverage;
- live-device executor.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, frozen step vocabulary, tests/results, architecture metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 05B.
