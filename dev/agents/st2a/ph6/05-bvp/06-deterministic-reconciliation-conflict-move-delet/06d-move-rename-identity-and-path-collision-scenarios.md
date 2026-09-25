# BVP-S06D — Move / Rename Identity and Path-Collision Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage  
**Predecessor:** accepted S06C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for stable-identity move/rename behavior, ambiguous move safety, and case/Unicode/path collision handling.

## 2. Required End State

Executable scenarios cover:

- local move/rename of an established managed object;
- remote move/rename preserving stable remote identity;
- two-sided/competing move conditions where target semantics define resolution or safe blocking;
- ambiguous move identity where path/timestamp evidence is insufficient;
- destination collision;
- case-only and Unicode-normalization-sensitive path conditions where product/platform policy requires deterministic handling;
- incompatible/invalid path behavior where deterministic policy is product-defined.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S06C predecessor SHA;
- task branch;
- current move/path/identity requirement IDs and target clauses;
- exact scenario/fixture/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current architecture metrics baseline.

No core change is authorized.

## 4. Required Semantics

### 4.1 Stable identity

A move/rename must be proven using the strongest production identity available—especially stable remote object ID/state mapping—rather than treating every path change as unrelated delete/create.

### 4.2 No path/timestamp guessing

When identity is ambiguous, the product must not invent a move solely from similar names, timestamps, or convenient path heuristics if the target specification requires blocking/preservation.

### 4.3 Collisions

When a destination path is already occupied or incompatible, the scenario must prove the target-required safe behavior: preserve data, block, conflict, or choose a deterministic compatible result as specified.

### 4.4 Case / Unicode

Scenarios must exercise the product's target semantics for platform-relevant case/Unicode path equivalence/collision without assuming all filesystems normalize identically.

This deterministic proof covers policy/adapter semantics, not final physical platform validation.

## 5. Invariants

- Stable remote identity is not replaced by timestamps.
- Ambiguity cannot be silently resolved into destructive movement.
- No duplicate move algorithm exists in scenario/world code.
- Scenario-only default remains intact.
- No scenario-specific production path-handling code.

## 6. Material Edge / Failure Cases

Required proof includes:

- local rename maps to same managed identity as required;
- remote move retains remote ID and maps correctly;
- collision does not overwrite unrelated content unsafely;
- ambiguous move blocks/preserves as required;
- case-only path condition behaves per target policy;
- Unicode-equivalent/colliding path condition behaves per target policy;
- wrong expected identity/path result fails.

## 7. Engineering Discretion

The agent may choose representative path strings/Unicode forms and scenario grouping, provided they exercise the actual current product requirements and remain portable in the deterministic test environment.

## 8. Dependencies

Consumes accepted S04 Drive stable-ID semantics and S06A–C coverage on the frozen S05 runner.

## 9. Acceptance Criteria

Required move/collision scenarios pass through real production logic, identity semantics are objectively asserted, ambiguity remains safe, requirement mapping is complete, no core/production changes occur, scenario/architecture budgets pass, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not claim deterministic simulation proves actual Windows/iOS filesystem behavior; physical representative cases belong to S09D.

Do not cover exclusions/unknown/empty folders (06E) or crash/fault recovery (S07).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario results, per-scenario LOC, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06E.
