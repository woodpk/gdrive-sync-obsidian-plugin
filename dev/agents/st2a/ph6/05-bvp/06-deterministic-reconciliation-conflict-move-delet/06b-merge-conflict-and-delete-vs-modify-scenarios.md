# BVP-S06B — Merge, Conflict, and Delete-vs-Modify Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage  
**Predecessor:** accepted S06A

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for concurrent text merge/conflict, binary conflict, and delete-vs-modify preservation semantics using the frozen S04/S05 core.

## 2. Required End State

Executable scenarios cover:

- clean concurrent text merge where edits are non-overlapping and product semantics permit automatic merge;
- true overlapping text conflict that cannot be safely merged;
- binary concurrent conflict where content cannot be line-merged;
- local delete vs remote modify;
- remote delete vs local modify.

Each scenario proves the current product target requirement and preservation/safety invariant, including identities/conflict artifacts/state where relevant.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S06A predecessor SHA;
- task branch;
- current requirement IDs/target clauses for merge/conflict/delete-vs-modify;
- exact scenario/fixture/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current architecture metrics baseline.

No core change is authorized.

## 4. Required Semantics

### 4.1 Clean text merge

The scenario must start from a common synchronized base, apply independent non-overlapping edits, invoke production synchronization, and assert the target-required merged result plus authoritative state/identity effects.

The scenario must not implement merge logic itself.

### 4.2 True text conflict

Apply overlapping incompatible edits from a common base and prove the product preserves both user changes according to the target conflict policy rather than silently selecting one side.

Assertions must cover conflict classification and resulting preserved content/artifacts/state as required by the product contract.

### 4.3 Binary conflict

Concurrent incompatible binary changes must exercise the product's keep-both/preservation policy. No text-merge path may be assumed.

### 4.4 Delete-vs-modify

For both directions:

- deletion on one side plus modification on the other must preserve the modified content according to target policy;
- the scenario must prove no unsafe destruction occurs merely because one side is absent;
- authority must come from production state/base semantics, not timestamps.

## 5. Invariants

- Merge/conflict policy remains production code.
- Scenario data contains expected outcomes, not implementation logic.
- No scenario-specific production helper/seam.
- No custom merge engine in test-platform.
- No platform-core change unless supervisor separately authorizes a generic missing primitive after BLOCKED.
- Canonical evidence records conflict/preservation observations.

## 6. Material Edge / Failure Cases

Required proof includes:

- clean merge succeeds and contains both non-overlapping edits;
- deliberately changed expected merged content fails;
- overlapping text conflict is not falsely classified as clean merge;
- binary conflict preserves both versions as required;
- local-delete/remote-modify preserves modified remote content;
- remote-delete/local-modify preserves modified local content;
- conflict results remain deterministic across repeated runs.

## 7. Engineering Discretion

The agent may choose representative fixture contents and exact scenario decomposition while preserving the semantic distinctions above.

Do not add generic merge/conflict abstractions unless they already exist in the frozen core.

## 8. Dependencies

Consumes accepted S06A and frozen S04/S05 infrastructure.

## 9. Acceptance Criteria

All required scenarios pass against real production logic, wrong expectations fail, preservation/conflict semantics are objectively asserted, requirement traceability is complete, scenario budgets pass, core metrics remain stable, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover:

- ordinary deletion/stale/clock-skew/unreadable cases (06C);
- move/path collisions (06D);
- exclusions/unknown/empty folders (06E);
- crash/fault recovery (S07);
- live physical conflict evidence.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario/conflict results, wrong-expectation proof, per-scenario LOC, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06C.
