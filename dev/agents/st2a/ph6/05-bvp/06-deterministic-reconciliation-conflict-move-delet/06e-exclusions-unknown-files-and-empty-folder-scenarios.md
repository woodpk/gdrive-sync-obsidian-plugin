# BVP-S06E — Exclusions, Unknown Files, and Empty-Folder Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage  
**Predecessor:** accepted S06D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Complete the non-fault reconciliation-coverage stage with declarative deterministic scenarios for configured scope/exclusions, unmanaged/unknown files, and empty-folder semantics.

## 2. Required End State

Executable scenarios cover current product requirements for:

- excluded local paths/files;
- excluded remote/managed-scope observations where applicable;
- device-specific/nonportable workspace/cache/token exclusions where current product scope defines them;
- unknown/unmanaged remote files that must not become managed synchronization authority accidentally;
- unknown local files outside managed scope;
- empty folders where the product's representation/platform rules define behavior;
- changes in scope/exclusion configuration where deterministic policy can be proven without physical runtime evidence.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S06D predecessor SHA;
- task branch;
- current scope/exclusion/unknown-file/empty-folder requirement IDs and target clauses;
- exact scenario/fixture/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current architecture metrics baseline.

No core change is authorized.

## 4. Required Semantics

### 4.1 Exclusions are policy inputs

Excluded content must remain outside managed synchronization according to the product target specification.

Tests must distinguish “excluded by configuration/policy” from “missing/unreadable/deleted.”

### 4.2 Unknown/unmanaged remote content

Remote content not owned/recognized by the managed synchronization authority must not be deleted, adopted, or mutated merely because it appears in the shared Drive area unless target rules explicitly define adoption.

### 4.3 Unknown local content

Local content outside managed scope/exclusions remains untouched by synchronization.

### 4.4 Empty folders

Where the product does not represent empty folders remotely, scenarios must prove no false file/deletion semantics are inferred. Where explicit folder behavior exists, assert the current target policy exactly.

### 4.5 Configuration/scope change

If product requirements define transitions when exclusions/scope change, scenarios may prove those semantics provided they use existing generic configuration fixture controls and do not require a new core concept.

## 5. Invariants

- Excluded/unknown content is not treated as deletion evidence.
- Unmanaged data is not destroyed.
- Scenario-only default remains intact.
- No new scope engine or production bypass exists.
- No scenario-specific PowerShell.

## 6. Material Edge / Failure Cases

Tests/scenarios must include representative:

- excluded local file remains unsynchronized;
- excluded existing managed candidate does not trigger unsafe deletion/adoption;
- unknown remote object remains untouched;
- unknown local file remains untouched;
- empty-folder behavior matches target policy;
- wrong expectation about excluded/unknown mutation fails.

## 7. Engineering Discretion

The agent may choose representative exclusion patterns and fixtures based on the current product target/config contract.

## 8. Dependencies

Consumes accepted S06A–D and frozen S04/S05 platform.

## 9. Acceptance Criteria

All required remaining non-fault reconciliation scenarios are mapped and passing; excluded/unknown data safety is proven; no platform-core/production change occurs; scenarios remain within budget; architecture metrics show coverage growth primarily in scenario/test surfaces; authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover S07 crash/fault/resource/recovery families or physical platform path/resource evidence.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario results, per-scenario LOC, architecture/core delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06V or S07.
