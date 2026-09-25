# BVP-S04A — Stateful In-Memory Local Vault

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted BVP-S03 primary-stage gate

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Implement the deterministic in-memory local-vault boundary required to run real production synchronization logic without a live Obsidian filesystem.

The adapter models local external reality. It MUST NOT decide synchronization policy, conflict policy, deletion policy, authority, or reconciliation outcomes.

## 2. Required End State

When complete, the deterministic local-vault implementation can represent and expose the local-side behaviors needed by later BVP tests:

- file existence and absence;
- byte/text content;
- path identity and path changes;
- create/write/update;
- move/rename;
- trash/delete semantics appropriate to the production port;
- directory/listing observations required by production code;
- unreadable/inaccessible paths;
- path compatibility/case/Unicode conditions required by product tests;
- active-write/stability observations when the production boundary exposes them;
- configuration/scope/exclusion observations consumed through the production local-vault contract.

The implementation is stateful across multiple production operations within one test world.

## 3. Dispatch Binding — Hard Data Only

Before execution, the supervisor binds:

- exact accepted S03 predecessor SHA;
- exact task branch;
- exact current production local-vault port/interface(s);
- exact current relevant production types/contracts and existing testing helpers;
- exact intended S04 local-vault implementation/test paths;
- exact writable-path allowlist;
- exact PHX-CI base authority and target-branch framework pin/runtime;
- exact focused test command if one already exists;
- confirmation that the child remains within BVP-GOV-010.

Binding may not alter the required local-vault semantics below.

## 4. Required Behavior and Semantics

### 4.1 Port fidelity

The adapter must implement the same production boundary contract consumed by real synchronization logic. Later production code must be able to use it without a BVP-specific alternate synchronization API.

### 4.2 Stateful reality

Operations must change retained local-vault state so later observations see the resulting reality.

A write followed by read/list/observation must reflect the write unless a separately injected failure/condition says otherwise.

### 4.3 Path and identity behavior

The model must preserve enough local path/content identity to exercise:

- rename/move without silently converting the event into delete+unrelated-create unless the production boundary itself provides only those observations;
- case/Unicode/path compatibility distinctions required by the product contract;
- path collisions and inaccessible paths later injected by scenarios.

Do not invent stronger local identity than the production interface legitimately exposes.

### 4.4 Read/write/trash semantics

Operations must faithfully model observable success/failure states the production local-vault boundary can encounter.

The adapter may simulate external outcomes but must not reinterpret them into synchronization decisions.

### 4.5 Scope/configuration semantics

Where production local observation depends on exclusions, configured vault scope, or path eligibility, expose those facts through the same boundary semantics production uses. The adapter must not independently choose synchronization policy.

## 5. Invariants

- No synchronization/reconciliation policy is implemented in the adapter.
- No scenario sequencing or verdict logic is implemented here.
- No durable distributed workflow state is introduced.
- No production source imports BVP implementation.
- No wall-clock sleep is required for correctness.
- Simulated local reality remains distinct per logical device once multi-device composition exists.
- Fault/error states remain observations for production logic, not pre-decided outcomes.

## 6. Material Edge / Failure Cases

Tests must establish representative behavior for:

- missing file;
- existing file;
- overwrite/update;
- move/rename;
- trash/delete;
- unreadable/inaccessible file;
- incompatible/colliding path condition;
- listing that contains multiple paths;
- excluded/out-of-scope path where the production port represents that state;
- write/read byte fidelity;
- repeated observation after mutation.

If the current production interface cannot represent a required BVP target behavior, return `BLOCKED` with the exact missing contract rather than adding a BVP-only synchronization interface.

## 7. Engineering Discretion

The agent may choose:

- internal in-memory data structures;
- content storage representation;
- helper/module decomposition;
- deterministic IDs used only inside local simulation where legitimate;
- test organization;
- private fixture builders.

Do not change production port semantics merely to simplify the simulator.

## 8. Dependencies

Requires accepted S03 architecture guard/metrics/PHX-CI enforcement.

Later S04 children will consume this adapter; therefore its external behavior must be generic and production-port-aligned, not scenario-specific.

## 9. Acceptance Criteria

Acceptance requires:

- the adapter satisfies the bound production local-vault contract;
- deterministic tests cover the required behaviors and edge cases above;
- no synchronization policy appears in the adapter;
- no production code or frozen governance surface changes unless explicitly bound by higher authority;
- architecture guard/metrics remain within budget;
- authoritative PHX-CI passes focused + full repository verification.

## 10. Non-Goals

Do not implement:

- Google Drive simulation;
- change feed;
- per-device durable synchronization state;
- deterministic global time/fault scheduler beyond the minimum local facts this adapter itself needs;
- world composition;
- scenario DSL/runner/evidence;
- live-device validation.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, actual changed paths, bound production port(s), focused tests/results, unavailable checks, and confirmation that no out-of-allowlist path changed.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 04B.
