# Architecture — BRAIN Verification Platform

## Frozen shared contracts

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


## Anti-drift governance

## 4. Anti-Drift Governance — Hard Requirements

The following controls are part of the target architecture, not optional process advice.

### 4.1 Machine-Readable Boundary

**BVP-GOV-001.** The repository MUST contain `dev/authority/governance/locks/testing-platform-boundary.yaml` (or an equivalently named supervisor-approved file) defining at minimum:

- production root(s);
- testing-platform root;
- validation-build root/entrypoint;
- approved production seams visible to the platform;
- forbidden import directions;
- shipping-bundle exclusions;
- complexity budgets;
- prohibited scenario-specific surfaces;
- supervisor-owned governance files;
- archive exclusion rules.

### 4.2 Architecture Guard

**BVP-GOV-002.** `dev/scripts/Test-TestingArchitectureGuard.ps1` MUST fail verification when any applicable condition occurs:

- production imports from `test-platform/**`;
- shipping build includes test-platform code;
- scenario definitions or scenario IDs enter production `src/**`;
- unapproved production seams are imported by the platform;
- validation-only UI/runner/fault controls become part of the normal production build;
- scenario-specific PowerShell verification scripts appear;
- active planning/tasking treats `archive/**` as current authority;
- a normal scenario-only work package changes frozen platform-core/governance surfaces without explicit authorization;
- hard complexity budgets are exceeded.

### 4.3 Complexity Metrics and Budgets

**BVP-GOV-003.** `dev/scripts/Get-TestingArchitectureMetrics.ps1` MUST calculate and persist at least:

- production-only source LOC;
- production code whose sole purpose is the BVP seam;
- BVP core framework LOC excluding tests/scenario definitions;
- validation-device-agent LOC;
- scenario definition LOC by scenario;
- count of platform core runtime modules;
- count/list of production modules imported by the BVP;
- PowerShell script count/LOC for the BVP;
- before/after delta for the current work package when a base SHA is supplied.

**BVP-GOV-004 — Initial hard budgets.** Unless the user explicitly approves an architecture-budget change:

- production BVP-only seam: **maximum 350 logical source lines across maximum 4 production files**;
- BVP framework core (runner, DSL interpreter, generic assertions/evidence, adapters/orchestration excluding tests, scenario definitions, and device agent): **maximum 4,000 logical TypeScript source lines**;
- live-device agent/relay subset: **maximum 750 logical TypeScript source lines**;
- individual ordinary declarative scenario: **target ≤120 logical lines; hard maximum 200 logical lines**;
- scenario-specific PowerShell scripts: **0**;
- BVP PowerShell verification/governance scripts: **maximum 4 scripts and 1,500 logical lines combined**;
- scenario-specific production source files/classes/interfaces: **0**.

Tests themselves are not constrained by these LOC budgets; correctness evidence must not be discouraged by a test-code ceiling.

If a legitimate requirement cannot be met within a hard budget, implementation MUST stop and surface an architecture-change request. A coding agent may not raise the budget or weaken the guard on its own.

### 4.4 Forbidden Unapproved Abstractions

**BVP-GOV-005.** A coding agent MUST stop and request supervisor/user architecture approval before adding any new platform-level:

- general scenario runner or second runner;
- durable distributed scenario-state machine;
- module router/plugin system;
- cross-device coordination protocol distinct from the frozen command transport;
- evidence schema family distinct from the canonical scenario result;
- persistence subsystem beyond the bounded external-run checkpoint need;
- alternate synchronization model/engine;
- new production testing bypass or mutation authority.

Ordinary private helpers, adapters implementing frozen ports, assertions, fixture generators, and declarative step handlers do not require such approval while budgets and boundaries remain satisfied.

### 4.5 Scenario-Cost Tripwire

**BVP-GOV-006.** After the common platform is established, an ordinary new scenario work package is expected to modify only scenario definitions, scenario fixtures/data, and directly associated tests. If it requires a platform-core change, new production seam, new transport capability, new persistence concept, or more than 200 lines in one scenario, that scenario work MUST stop for supervisor architecture review before the core is changed.

### 4.6 Frozen Governance Ownership

**BVP-GOV-007.** The architecture-boundary manifest, complexity budgets, architecture guard, architecture metrics, and PHX-CI consumer pin/integration are supervisor-owned frozen surfaces. Normal coding-agent sessions MUST NOT modify them. An authorized governance-change session must be explicitly identified as such and must record the user/supervisor authority permitting the change.

### 4.7 Recurring Architecture Gate

**BVP-GOV-008.** Every implementation child session runs the mechanical architecture guard through the repository check exercised by PHX-CI. In addition, after no more than **two implementation child sessions**, the supervisor MUST perform a repository-level architecture review comparing the actual dependency graph, metrics, boundaries, and build output with this specification before dispatching further work.

### 4.8 Supervisor-Bound Dispatch Surface

**BVP-GOV-009.** Every executable child-session prompt MUST bind an exact predecessor SHA and exact writable-path allowlist after supervisor inspection of the then-current repository. Workers MUST NOT expand the allowlist, reclassify ambiguous files, weaken a frozen surface, or treat an unexpected dependency as implicit permission to edit. Any required out-of-allowlist change is BLOCKED and returns to the supervisor.

### 4.9 Child-Session Size Gate

**BVP-GOV-010.** BVP-S01 through BVP-S09 are primary work packages and MUST be decomposed into child sessions small enough for one coding-agent execution/review cycle. At dispatch, the supervisor MUST split a child again when the expected work introduces more than one new platform-level contract family, more than six substantive non-test implementation files, or approximately 1000 net new non-test LOC, except for mechanical deletion/move sessions and declarative-scenario batches.

### 4.10 Architecture Evidence

**BVP-GOV-011.** Every authoritative PHX-CI acceptance evidence record for BVP work MUST include:

- architecture guard result;
- current architecture metrics;
- metric delta from the work-package base where applicable;
- statement of whether any frozen governance file changed;
- statement of whether any new production seam or platform-level abstraction was introduced.

A green functional test suite cannot override a failed architecture guard.


## Canonical governance lock

The machine-readable boundary is `dev/authority/governance/locks/testing-platform-boundary.yaml`. Production remains under `src/**`; verification infrastructure remains under `test-platform/**`; ordinary production must not import or ship the test platform.
