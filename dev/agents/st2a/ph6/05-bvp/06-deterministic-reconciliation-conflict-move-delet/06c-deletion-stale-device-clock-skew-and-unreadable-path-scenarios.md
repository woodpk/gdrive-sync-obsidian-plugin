# BVP-S06C — Deletion, Stale-Device, Clock-Skew, and Unreadable-Path Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage  
**Predecessor:** accepted S06B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for deletion authority, stale-device safety, clock-skew non-authority, and unreadable/local-observation uncertainty.

## 2. Required End State

Executable scenarios cover:

- ordinary local deletion from an established synchronized base;
- ordinary remote deletion from an established synchronized base;
- both sides deleted;
- absence with no trustworthy base where deletion must not be inferred unsafely;
- unreadable/inaccessible local path;
- wall-clock skew that must not override stronger identity/state authority;
- stale device returning after newer shared state exists, proving no resurrection or destructive overwrite contrary to target policy.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S06B predecessor SHA;
- task branch;
- current product requirement IDs/target clauses for deletion/staleness/clock authority/unreadable paths;
- exact scenario/fixture/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current architecture metrics baseline.

No core change is authorized.

## 4. Required Semantics

### 4.1 Established-base deletions

Where authoritative state proves one side deleted a previously synchronized object, scenarios must prove production applies the target-required corresponding deletion/trash behavior without harming unrelated data.

### 4.2 Both deleted

Both-deleted state converges without recreation.

### 4.3 No-base absence safety

Absence on one side without sufficient trusted base/coverage cannot be treated as authoritative deletion merely for convenience.

### 4.4 Unreadable local path

Unreadable/inaccessible is not equivalent to absent.

The scenario must prove the product blocks/defers or otherwise follows the target-safe behavior rather than propagating destructive deletion from uncertainty.

### 4.5 Clock skew

Large local/remote clock differences must not become primary authority where product rules say timestamps are advisory only.

### 4.6 Stale device

A device returning with stale local/state information must not resurrect content that authoritative shared/newer state says was deleted, nor destroy newer valid content because its timestamps/state are stale.

Exact outcomes follow the product target specification and production authority model.

## 5. Invariants

- Absence, unreadable, and incomplete observation remain distinct.
- Timestamps do not replace authoritative identity/state/base semantics.
- Stale-device scenarios preserve newer authoritative user data.
- Scenario-only change surface remains default.
- No production synchronization changes are made to make tests pass.

## 6. Material Edge / Failure Cases

Scenarios must prove:

- local deletion propagation;
- remote deletion propagation;
- both-deleted no recreation;
- no-base absence does not cause unsafe deletion;
- unreadable path does not masquerade as deletion;
- extreme clock skew does not flip authority improperly;
- stale returning device cannot resurrect/degrade authoritative newer state;
- wrong expected destructive/non-destructive outcome fails.

If a required observation cannot be expressed by the frozen core, return `BLOCKED`.

## 7. Engineering Discretion

The agent may choose clock values, stale-state fixture chronology, and file contents while preserving the authoritative distinctions above.

## 8. Dependencies

Consumes accepted S06A/B and frozen S04/S05 platform.

## 9. Acceptance Criteria

All required scenarios execute deterministically through real production logic, target safety/authority semantics are asserted, wrong expectations fail, no core/production changes occur, scenario budgets and architecture metrics pass, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover:

- move/path collisions (06D);
- exclusions/unknown/empty folders (06E);
- corrupt state/cursor/root recovery (S07B);
- actual physical offline duration or clock APIs.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario results, per-scenario LOC, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06D.
