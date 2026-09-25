# BVP-S04B — Stateful In-Memory Drive Core

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04A

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Implement the stateful in-memory managed-Google-Drive boundary required for deterministic production-path synchronization tests.

The simulation models remote external reality. It MUST NOT implement reconciliation or synchronization policy.

## 2. Required End State

The Drive model must support the production-observable remote behaviors required by BVP-SIM-005:

- stable managed remote object IDs;
- create/upload;
- update/content replacement;
- download/read;
- revision/content identity as required by production contracts;
- move/rename while retaining stable remote identity;
- trash/existence state;
- listing of managed remote objects;
- parent/path metadata required by production code;
- deterministic state retention across multiple operations.

Change-feed, completeness controls, ambiguity, and fault injection beyond core mutation/read behavior belong to 04C.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S04A predecessor SHA;
- exact task branch;
- exact current production Drive port/interface(s) and relevant remote records;
- exact current reusable test helpers/adapters;
- exact implementation/test paths and writable allowlist;
- exact PHX-CI base/pin/runtime;
- focused test command if established;
- size-gate confirmation.

No binding may redefine remote identity or production-port semantics.

## 4. Required Behavior and Semantics

### 4.1 Production-port fidelity

The model must implement the same production Drive boundary consumed by real synchronization logic.

It cannot expose a BVP-only higher-level “sync” API that shortcuts production planner/executor decisions.

### 4.2 Stable remote identity

Once created, a managed remote object's ID remains stable across content updates and moves/renames unless the actual production/provider contract says otherwise.

A move must not be modeled as an unrelated object replacement when product semantics depend on stable identity.

### 4.3 Revision / content identity

Remote revision/content identity must evolve deterministically in response to content mutation and remain stable when no relevant mutation occurs.

The exact representation may match the production contract's revision/etag/hash model.

### 4.4 Trash/existence

Trash and existence state must be independently observable as required by production logic. A trashed object must not silently become a brand-new unrelated object if later restored/observed unless the production contract dictates that.

### 4.5 Listing

Listing returns the modeled remote reality faithfully. Ordinary core listing is complete in this child; explicit incomplete/partial listing behavior belongs to 04C.

## 5. Invariants

- Remote simulation never chooses local-vs-remote authority.
- No conflict/merge decision occurs in Drive simulation.
- Stable IDs/revisions are deterministic.
- State persists until explicitly mutated or later world reconstruction rules say otherwise.
- No live Google Drive API or credential is used.
- No new OAuth scope or token handling is introduced.

## 6. Material Edge / Failure Cases

Tests must cover at least:

- create then fetch/download;
- update changes content/revision but preserves object ID;
- move/rename preserves object ID;
- trash changes observable state;
- multiple objects with distinct IDs;
- listing reflects current modeled state;
- repeated read without mutation is stable;
- invalid/missing ID produces the production-appropriate failure classification.

## 7. Engineering Discretion

The agent may choose:

- internal object store;
- ID/revision generators;
- path/parent representation;
- helper decomposition;
- deterministic fixture builders.

Do not infer future change-feed/fault architecture prematurely.

## 8. Dependencies

Requires accepted S04A and the production Drive boundary frozen by the product architecture.

Later S04C extends this model; therefore keep core mutation/read semantics generic and separable from change-feed/fault controls.

## 9. Acceptance Criteria

Acceptance requires deterministic proof of stable remote identity, revision/content mutation semantics, move/trash/read/list behavior, production-port compatibility, no policy duplication, no live provider dependency, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- change cursors/feed;
- partial listing;
- ambiguous outcomes;
- injected network/provider faults;
- per-device state;
- world orchestration;
- scenario runner/DSL;
- live-device transport.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, bound Drive port(s), changed paths, focused tests/results, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 04C.
