# BRAIN Verification Platform — Minimum Sound Build Decomposition

## 1. Status and Authority

**Status:** Authoritative Stage-1 build decomposition  
**Governing specification:** `BRAIN Verification Platform — Target-System Specification`  
**Workflow:** Workflow A / Stage 2A controlled session-based construction  
**Date:** 2026-09-23  

This decomposition follows the Agent-Led Software Product Construction Manual: phases exist only where dependency order, stable-boundary establishment, risk isolation, independent testability, or meaningful integration requires separation. Detailed coding prompts must be refreshed against the actual repository immediately before each session begins.

## 2. Ordered Dependency Model

```text
P0  Authority Reset + Legacy Quarantine
 |
 v
P1  Hard Boundary + Architecture Guard + Verification Foundation
 |
 v
P2  Deterministic Virtual World
 |
 v
P3  Declarative Runner + Assertions + Evidence
 |
 v
P4  Deterministic Requirement Coverage
 |
 v
P5  Thin Live-Device Validation + Stage-3 Readiness
```

No later phase may begin merely because predecessor code exists. The predecessor's acceptance gate, including architecture guard and metrics, must pass first.

## 3. Shared Contracts Frozen Before New Platform Construction

### 3.1 Production/Test Dependency Contract

- `src/**` is production.
- `test-platform/**` is verification infrastructure.
- production must never import the test platform;
- ordinary shipping build excludes all test-platform implementation;
- any production seam visible to the platform is explicitly enumerated and within the fixed budget.

### 3.2 Architecture Governance Contract

The machine-readable boundary, architecture guard, metrics collector, and PHX-CI consumer pin/integration are supervisor-owned frozen surfaces. Ordinary coding sessions cannot modify them. Authoritative acceptance uses the deployed PHX-CI operator front door, not a task-specific verifier.

### 3.3 Scenario Contract

Ordinary scenarios are typed declarative data interpreted by one common runner. A scenario does not introduce a new runtime lifecycle, persistence mechanism, transport protocol, production interface, or PowerShell verifier.

### 3.4 External-Reality Contract

Deterministic adapters model external reality but do not decide synchronization policy. Production synchronization code remains the decision authority.

### 3.5 Live Command Contract

A live validation agent executes one bounded addressed command and returns one bounded result/observation. The external controller owns the scenario sequence and verdict.

### 3.6 Evidence Contract

Scenario evidence records observed reality and assertions; it does not authorize product state transitions. A production run receipt/equivalent terminal observation must originate from production execution authority.

## 4. Phase P0 — Authority Reset and Legacy Quarantine

### 4.1 Objective

Remove the superseded internal validation harness from active authority and active executable use while preserving historical evidence and all still-valid product behavior.

### 4.2 Required End State

- accepted BVP planning documents are active under `dev/planning-and-building/` and `dev/governance/`;
- `DEC-301`–`DEC-310` are superseded rather than simultaneously active;
- all old `dev/**` harness tasking/planning/evidence is moved beneath `dev/archive/legacy-validation-harness/**` according to the archive plan;
- active project-state/handoff authority no longer points at the old harness;
- `src/validation/**` legacy architecture and shipping validation UI/runtime integration are removed from active execution;
- production synchronization behavior, general diagnostics, and useful non-harness tests remain intact;
- ordinary production build contains no validation scenario runner or validation-mode UI.

### 4.3 Principal Invariants

- historical evidence is preserved;
- no product behavior is redesigned merely because the test harness is removed;
- no replacement framework implementation begins before quarantine is complete;
- archived content is non-authoritative.

### 4.4 Dependencies

Accepted BVP Stage-1 planning package.

### 4.5 Acceptance Criteria

- archive manifest has zero unclassified legacy-harness `dev/**` matches;
- active authority contains explicit supersession/adoption records;
- production typecheck/build/test suite passes after legacy harness detachment, excluding tests whose only subject was the removed framework;
- repository search proves production no longer constructs or exposes the legacy `ValidationModeRuntime`/scenario runner UI;
- final P0 acceptance is captured through installed PHX-CI, not GitHub Actions.

### 4.6 Non-Goals

- do not implement the replacement runner/simulator;
- do not redesign synchronization;
- do not use this phase to delete ordinary product tests or diagnostics.

## 5. Phase P1 — Hard Boundary, Architecture Guard, and Verification Foundation

### 5.1 Objective

Make the simple replacement architecture mechanically enforceable before substantial new platform code exists.

### 5.2 Required End State

- top-level `test-platform/**` skeleton exists and is excluded from ordinary shipping build;
- active `dev/governance/testing-platform-boundary.yaml` is installed;
- `dev/scripts/Test-TestingArchitectureGuard.ps1` enforces import/bundle/scenario/archive/frozen-surface rules;
- `dev/scripts/Get-TestingArchitectureMetrics.ps1` measures required budgets and deltas;
- the installed PHX-CI deployed runtime is the canonical branch/stage verification entrypoint;
- architecture guard and metrics are themselves tested with deterministic negative fixtures/cases;
- PHX-CI canonical evidence output is `dev/_ca-output.md` / `dev/_ca-output.json` with immutable history under `dev/test-results/`;
- no scenario-specific PowerShell verifier exists.

### 5.3 Principal Invariants

- guard failure blocks acceptance even when tests pass;
- governance files are supervisor-owned;
- GitHub Actions are not used;
- complexity budgets are executable policy, not prose only.

### 5.4 Dependencies

P0.

### 5.5 Acceptance Criteria

PHX-CI repository checks must execute the guard/metrics. The guard demonstrably fails for at least:

- a production import from `test-platform/**`;
- a test-platform file entering production bundle inputs;
- a scenario identifier/source inserted into production;
- an unapproved production import surface;
- a scenario-specific `.ps1` verifier;
- a hard complexity-budget violation;
- an active authority link treating `dev/archive/**` as current tasking.

It also passes the compliant baseline.

### 5.6 Non-Goals

- no complete simulator;
- no scenario catalog migration;
- no live-device transport.

## 6. Phase P2 — Deterministic Virtual World

### 6.1 Objective

Create the smallest stateful simulated external environment capable of running real production synchronization semantics deterministically across multiple logical devices.

### 6.2 Required End State

- stateful in-memory local vault implementation;
- stateful in-memory managed Google Drive implementation with stable IDs, listing/change behavior, moves/trash/content identity, and completeness/ambiguity controls;
- per-device state/authority stores and identities;
- controllable time/order/fault facilities required by target-specification testing;
- runtime reconstruction/restart capability over retained simulated state;
- a small programmatic world-builder API for tests/scenarios;
- proof that the real production planner/executor/state logic runs against these boundaries rather than a duplicated policy engine.

### 6.3 Principal Invariants

- adapters describe external reality only;
- no synchronization decision logic migrates into the simulator;
- multi-device state remains independently authoritative per device;
- faults preserve production uncertainty semantics.

### 6.4 Dependencies

P1.

### 6.5 Acceptance Criteria

At minimum, direct tests demonstrate:

- upload/create and download/create through production logic;
- stable remote identity across move;
- two independent device states against one remote;
- listing completeness failure without deletion inference;
- ambiguous remote mutation outcome;
- state/cursor corruption/loss controls;
- runtime destruction/reconstruction without losing simulated external reality;
- architecture metrics remain within P1 budgets.

### 6.6 Non-Goals

- no declarative scenario suite yet;
- no real Google Drive or real Obsidian runtime automation;
- no platform-specific UI testing.

## 7. Phase P3 — Declarative Runner, Assertions, and Evidence

### 7.1 Objective

Provide one small external runner and typed scenario language that can express ordinary verification without scenario-specific orchestration programs.

### 7.2 Required End State

- typed declarative scenario model with a small frozen initial step vocabulary;
- one external runner that executes deterministic scenarios against P2;
- generic fixture operations;
- generic observations/assertions for plan/effect/content/hash/identity/state/conflict/safety outcomes;
- canonical scenario result/evidence serialization;
- requirement/invariant traceability metadata on scenarios;
- bounded external checkpoint representation designed for later live execution without becoming a distributed workflow engine.

### 7.3 Principal Invariants

- scenarios remain data;
- runner owns sequence/verdict;
- diagnostics are corroborative, not an authority protocol;
- missing required evidence is never PASS;
- ordinary scenario size and change-surface limits are enforced.

### 7.4 Dependencies

P2.

### 7.5 Acceptance Criteria

- at least one multi-device conflict/merge canary is expressed in the declarative model with no custom scenario class;
- deliberately wrong expected content/identity/plan causes a deterministic failure;
- scenario result maps to target requirement IDs;
- one ordinary new canary scenario can be added without changing platform core;
- hard scenario LOC and architecture budgets are enforced by P1 guard.

### 7.6 Non-Goals

- do not migrate the full requirement suite yet;
- do not add a plugin/module router;
- do not create durable per-device scenario state.

## 8. Phase P4 — Deterministic Requirement Coverage

### 8.1 Objective

Move the bulk of Phase-6 semantic, failure, recovery, safety, transfer, and lifecycle proof into fast deterministic scenarios driven by the P3 model.

### 8.2 Required End State

Executable deterministic coverage maps the BRAIN product target specification to scenarios for all requirements that do not intrinsically require real Windows/iOS/provider behavior, including:

- reconciliation semantics;
- concurrent text/binary conflict behavior;
- delete-vs-modify;
- rename/move identity;
- stale/offline state semantics that can be proven from state/reality rather than physical radio state;
- crash/commit-order/restart recovery;
- ambiguous remote outcomes;
- corrupt/incompatible state and cursor loss;
- partial remote listing/coverage failures;
- destructive circuit breaker;
- cancellation;
- path/scope/configuration behavior where platform APIs are not the subject of the test;
- retry/quota/disk/network failure classification through modeled boundaries;
- large-file/large-vault bounded-behavior logic to the extent measurable without a physical mobile runtime.

### 8.3 Principal Invariants

- scenario additions normally change only scenario/fixture/test surfaces;
- core-change tripwire is active;
- no old C/D/E/F custom orchestration is recreated;
- archived scenario documents are traceability history, not architecture templates.

### 8.4 Dependencies

P3.

### 8.5 Acceptance Criteria

- BRAIN target specification §13.2–§13.5 and the deterministic portions of §13.4/§13.7 have explicit executable mappings;
- every scenario is ≤200 logical lines unless an explicitly approved architecture exception exists;
- no scenario-specific PowerShell exists;
- architecture metrics show platform-core growth is bounded and scenario growth dominates new coverage;
- representative mutation tests prove important scenarios fail when production behavior is intentionally perturbed in a controlled test fixture or expectation is inverted.

### 8.6 Non-Goals

- no claim that simulation proves actual iOS filesystem, browser OAuth, suspension, installed-build packaging, or real network/provider behavior;
- do not retain one live physical test per historical scenario merely for symmetry.

## 9. Phase P5 — Thin Live-Device Validation and Stage-3 Readiness

### 9.1 Objective

Add only the physical validation capability required to prove real Windows/iOS/Obsidian/provider behavior, then integrate deterministic and live evidence into the Phase-6 Stage-3 handoff.

### 9.2 Required End State

- a separate validation artifact/entrypoint composed from production code plus a thin `test-platform/**` device agent;
- bounded command/result protocol with run/device/sequence identity;
- external runner live executor;
- minimal cross-device command transport/desktop relay if needed, with no developer backend/additional OAuth scope;
- production-owned run receipt/equivalent narrow terminal observation within the production seam budget;
- explicit human checkpoint handling for true OS/provider actions;
- strategic physical Windows/iOS scenarios covering the product target specification's required platform behaviors;
- final combined requirement/evidence map ready for independent Stage 3.

### 9.3 Principal Invariants

- device agent is not a scenario runner;
- production shipping build remains clean;
- physical transitions are not synthetically overstated;
- cross-device transport has no synchronization authority;
- live-agent/core budgets remain enforced.

### 9.4 Dependencies

P4. A narrowly needed production run-receipt seam may be introduced here only through the explicit P5 session and must remain within the frozen production-seam budget.

### 9.5 Acceptance Criteria

- production build and validation build are demonstrably distinct;
- Windows and iOS validation artifacts execute the installed production path;
- stale/duplicate/wrong-device commands are rejected;
- required live flows cover authentication/pairing, upload, download, representative conflict, interruption/resume, UI-critical status, lifecycle behavior, and representative resource/platform behavior required by the BRAIN target specification;
- architecture guard/metrics pass after the complete platform is integrated;
- canonical local PowerShell verification passes and writes complete evidence;
- Stage-3 traceability has no unassigned material requirement.

### 9.6 Non-Goals

- no general UI automation framework unless a later explicit architecture decision establishes a concrete unmet requirement;
- no attempt to automate impossible/safety-sensitive OS actions merely to claim 100% unattended execution;
- no new test-framework architecture after coverage is achieved.

## 10. Planned Stage-2A Session Sequence

The phases above are expected to require the following bounded sessions. These are planning identities, not stale executable prompts; exact base SHAs and current file locations are bound immediately before dispatch.

| Session | Phase | Purpose |
| --- | --- | --- |
| `BVP-S01` | P0 | Active authority transition + complete `dev/**` legacy archive |
| `BVP-S02` | P0 | Remove legacy executable harness and production UI/runtime coupling |
| `BVP-S03` | P1 | Install physical boundary, guard, metrics, generic PowerShell verification |
| `BVP-S04` | P2 | Build deterministic multi-device virtual world |
| `BVP-S05` | P3 | Build declarative scenario model, runner, assertions, evidence |
| `BVP-S06` | P4 | Migrate reconciliation/conflict/delete/move/stale semantic coverage |
| `BVP-S07` | P4 | Migrate crash/recovery/fault/destructive/path/scale coverage |
| `BVP-S08` | P5 | Build thin live-device agent, production run receipt, command transport |
| `BVP-S09` | P5 | Physical Windows/iOS coverage, final integration, traceability closure |

A session may be split only if actual repository evidence shows the bounded unit is too large for one agent turn. Splitting must preserve the same phase ownership and cannot introduce new architecture.

## 11. Recurring Anti-Drift Dispatch Rule

- `BVP-S01` through `BVP-S03` establish the architecture enforcement layer.
- From `BVP-S04` onward, every session runs architecture guard + metrics.
- After `BVP-S04`/`S05`, after `S06`/`S07`, and after `S08`/`S09`, the supervisor performs the mandatory repository architecture review before the next wave/Stage-3 handoff.
- A failed architecture review blocks subsequent dispatch even if functional verification is green.