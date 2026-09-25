# BVP-S06A — Initialization and One-Sided Synchronization Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage  
**Predecessor:** accepted BVP-S05 primary-stage gate

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for initialization and ordinary one-sided synchronization semantics using the frozen S04/S05 virtual world, scenario vocabulary, runner, assertions, and evidence model.

This child proves product behavior. It does not extend platform architecture.

## 2. Required End State

Executable declarative scenarios cover, at minimum:

- fresh local-only initialization;
- fresh remote-only initialization;
- fresh equal local/remote initialization;
- divergent local/remote initialization with no trusted prior base;
- ordinary local-only modification after an established synchronized base;
- ordinary remote-only modification after an established synchronized base;
- no-op/equal state where no mutation is required;
- relevant preview/plan classification where the product contract exposes it.

Each scenario maps to the current product target requirement(s)/invariant(s) it proves.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S05 predecessor SHA;
- exact task branch;
- current scenario/fixture catalog paths;
- exact current production requirement IDs and target-spec clauses for this coverage family;
- exact writable-path allowlist limited by the scenario-only default;
- PHX-CI base/pin/runtime;
- focused scenario command if established;
- current architecture metrics baseline.

Binding may not add platform-core work to this child.

## 4. Required Semantics

### 4.1 Fresh local-only

When the managed remote has no corresponding object and the local file is eligible/stable, the scenario must prove the production path performs the target-required local→remote initialization behavior without inventing a pre-existing base.

### 4.2 Fresh remote-only

When local state lacks the remote object, the scenario must prove the production path performs the target-required remote→local initialization behavior.

### 4.3 Fresh equal state

Equal local/remote content and identity state must not cause unnecessary destructive or duplicate work.

### 4.4 Divergent no-base state

When local and remote both exist but no authoritative synchronized base supports a safe one-sided overwrite assumption, the scenario must assert the target-required conservative/conflict/preservation behavior.

Do not encode the answer in the simulator; production code decides.

### 4.5 Established-base one-sided changes

With an authoritative prior synchronized base:

- local-only modification must produce the target-required remote update;
- remote-only modification must produce the target-required local update.

The opposite side must not be overwritten based on timestamps alone where target authority rules prohibit that.

## 5. Invariants

- Scenarios are declarative data only.
- S05 common core is frozen for ordinary scenarios.
- No scenario-specific production source or PowerShell.
- No custom runner, fault framework, persistence, or evidence family.
- The simulator provides external facts; production code decides reconciliation.
- Requirement traceability is explicit.
- Each ordinary scenario remains ≤200 logical lines and should target ≤120.

## 6. Material Edge / Failure Cases

Scenarios/tests must demonstrate:

- correct one-sided initial creation in each direction;
- equal/no-op behavior;
- divergent no-base case does not silently select a winner without product authority;
- established-base local-only update;
- established-base remote-only update;
- deliberately wrong expected outcome causes scenario failure;
- missing required observation cannot PASS.

If expressing any required case needs a new generic step/assertion/world capability, return `BLOCKED` identifying the exact missing generic capability. Do not change core in this child.

## 7. Engineering Discretion

The agent may choose:

- exact scenario grouping;
- fixture naming/content;
- whether closely related cases share generic fixture helpers;
- exact assertions within the accepted generic assertion vocabulary.

Do not redesign scenario syntax or runner/core for convenience.

## 8. Dependencies

Consumes accepted S04/S05 platform and current BRAIN reconciliation requirements.

Later S06 children build on the same frozen core.

## 9. Acceptance Criteria

Acceptance requires all required scenarios to execute deterministically, map to current requirements, fail on wrong expectations, stay within scenario budgets, make no platform-core/production/governance changes, preserve architecture metrics, and pass authoritative PHX-CI.

## 10. Non-Goals

Do not cover:

- concurrent merge/conflict/delete-vs-modify (06B);
- deletion/stale/clock-skew/unreadable semantics (06C);
- move/collision semantics (06D);
- exclusions/unknown/empty-folder coverage (06E);
- crash/fault/recovery coverage (S07);
- physical platform behavior.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario results, wrong-expectation proof, per-scenario LOC, architecture delta, unavailable checks, and confirmation of no out-of-allowlist/core changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06B.
