# BRAIN Verification Platform — Target-System Specification

> **BVP-S01 live rebind:** persisted to `phase6-integration` from live starting HEAD `efb9a0bb88084d706dc535f2826e4df956cfd57d` on 2026-09-23. The original planning snapshot was repository-grounded from the supplied archive; BVP-S01 revalidated the active integration line before persistence.

## 1. Document Status, Authority, and Purpose

**Status:** Authoritative replacement Stage-1 target-system specification  
**Project:** `woodpk/gdrive-sync-obsidian-plugin`  
**Subsystem:** Automated testing / Phase-6 construction verification support  
**Workflow:** Agent-Led Software Product Construction Manual — Workflow A  
**Date:** 2026-09-23  

This document defines the required finished **BRAIN Verification Platform (BVP)** that replaces the oversized Phase-6 internal validation harness. It defines the outcome, architecture boundaries, anti-drift controls, verification semantics, and completion evidence for the replacement testing system.

It is subordinate to the authoritative BRAIN product target-system specification. It does not redefine synchronization product behavior. Where this document discusses tests, simulation, validation builds, faults, or device automation, those facilities exist only to prove the product requirements already established by the BRAIN target-system specification.

The governing authority order for this subsystem is:

1. later explicit user decisions;
2. the BRAIN product `target-system-specification.md`;
3. the active project decision register after the legacy-harness decisions are superseded;
4. this BVP target-system specification;
5. the BVP build decomposition and requirement-coverage artifact;
6. current repository state as evidence of implementation state;
7. build-session prompts generated from the current repository immediately before execution.

Legacy material moved beneath `dev/archive/**` is historical evidence only. It is not implementation authority and MUST NOT be used as a design template unless a later supervisor explicitly identifies a specific archived item as historical evidence needed for a bounded question.

### 1.1 Why Replacement Is Required

Repository inspection at planning time established that the legacy validation subsystem contains approximately 12,700 lines of TypeScript under `src/validation/**` plus approximately 12,300 lines of validation-specific automated tests. The shipping plugin currently imports the validation runtime from `src/main.ts` and exposes legacy validation-harness controls through the production settings surface.

The replacement exists to preserve required verification capability while eliminating a second application-like orchestration system inside the plugin. The BVP therefore prioritizes:

- direct testing of production synchronization code;
- deterministic execution outside the shipping plugin wherever physical platform behavior is not required;
- a narrow, physically separated live-device validation mechanism only where real Obsidian/Windows/iOS behavior must be observed;
- declarative test scenarios rather than scenario-specific orchestration programs;
- objective evidence and fail-closed safety;
- mechanically enforced architecture and complexity boundaries.

### 1.2 Normative Language

`MUST`, `MUST NOT`, `REQUIRED`, and `PROHIBITED` are normative. `SHOULD` identifies a strong preference that may change only if the resulting design remains within all hard architecture, safety, and complexity gates. `MAY` identifies ordinary engineering discretion.

## 2. Product Definition

The BVP is a repository-controlled automated verification platform for the BRAIN Google Drive Sync Obsidian plugin. It has two execution modes that share one declarative scenario/assertion model:

1. **Deterministic virtual-world execution** — runs the real production synchronization planner/executor/state logic against stateful in-memory implementations of local-vault, Google Drive, state, time/fault, and related external boundaries.
2. **Thin live-device execution** — runs only the minimum commands and observations that genuinely require installed Obsidian runtimes, with Windows/iOS participants executing bounded commands rather than hosting a general scenario engine.

The external test controller owns scenario sequencing, assertions, evidence aggregation, and test verdicts. The live-device participants do not own the scenario state machine.

The BVP is **not part of the user product**. Ordinary production builds and the distributed `main.js` MUST NOT contain the BVP scenario runner, simulated world, scenario catalog, test evidence engine, cross-device orchestration, or validation-only controls.

## 3. Required Capabilities

### 3.1 Physical Architecture and Separation

**BVP-ARCH-001 — Separate root.** All replacement platform implementation MUST live outside production `src/**` under a dedicated top-level `test-platform/**` tree, except for the explicitly bounded production-facing test seam permitted below.

**BVP-ARCH-002 — One-way dependency.** `test-platform/**` MAY import approved production contracts/implementation surfaces. Production `src/**` MUST NOT import `test-platform/**`.

**BVP-ARCH-003 — Shipping exclusion.** Production build output MUST NOT bundle, copy, dynamically load, or otherwise ship `test-platform/**` code or scenario definitions.

**BVP-ARCH-004 — No scenario code in production.** Scenario IDs, scenario step programs, scenario fixtures, scenario verdict logic, and scenario-specific control flow are PROHIBITED in production `src/**`.

**BVP-ARCH-005 — Validation build isolation.** Any code that must execute inside Obsidian solely for live automated validation MUST be built from `test-platform/**` as a separate validation artifact or validation-only entrypoint. It MUST NOT become ordinary production runtime behavior.

**BVP-ARCH-006 — Narrow production seam.** If live validation requires a production-side seam that cannot be implemented entirely outside `src/**`, that seam MUST be a small read/control facade over already-existing production authority. It MUST NOT implement scenario orchestration, test persistence, cross-device coordination, test evidence aggregation, alternate synchronization policy, or test-only mutation semantics.

**BVP-ARCH-007 — Enumerated seam.** Every production file/member exposed to the BVP MUST be enumerated in the machine-readable architecture boundary manifest. Unlisted cross-boundary dependencies fail verification.

**BVP-ARCH-008 — No alternate engine.** The BVP MUST invoke the real production planner, authoritative executor, state authority, local-vault boundary, Google Drive boundary, conflict logic, and safety policy for any claim about synchronization semantics. It MUST NOT implement a second synchronization algorithm.

### 3.2 Deterministic Virtual-World Executor

**BVP-SIM-001 — Stateful in-memory boundaries.** The BVP MUST provide stateful in-memory implementations of the production external boundaries required to run complete synchronization behavior without live Google Drive or Obsidian filesystem dependencies.

**BVP-SIM-002 — Multi-device worlds.** A deterministic test world MUST support at least two independent device states sharing one simulated managed remote while preserving independent device-local state, identity, cursors, tombstones, and authority.

**BVP-SIM-003 — Production semantics.** Simulated boundaries model external effects and observations; they MUST NOT decide synchronization policy. Planner/executor decisions remain production code decisions.

**BVP-SIM-004 — Deterministic time/order.** Tests MUST be able to control relevant clocks, operation ordering, network/fault outcomes, and external observations without wall-clock sleeps being required for semantic correctness.

**BVP-SIM-005 — Drive identity.** The simulated Drive MUST model stable remote object IDs, moves, revisions/content identity, trash/existence, change-feed behavior, listing completeness, and ambiguous-result states sufficiently to exercise the product requirements that depend on them.

**BVP-SIM-006 — Local identity/state.** The simulated local side MUST model path/content observations, unreadable/inaccessible conditions, moves, trash, path compatibility, active writes/stability evidence, and configuration/scope behavior needed by target-specification tests.

**BVP-SIM-007 — Durable-state faultability.** The simulated authority/state layer MUST permit controlled corruption, truncation, version incompatibility, cursor loss, stale device state, and commit-interruption conditions without modifying primary user data.

**BVP-SIM-008 — Restartability.** Deterministic tests MUST be able to destroy and reconstruct runtime objects around persisted simulated external/state data so crash/restart behavior is tested rather than merely mocked as a return value.

### 3.3 Declarative Scenario Model

**BVP-SCN-001 — Scenarios are data.** Ordinary test scenarios MUST be expressed as typed declarative step definitions interpreted by the common runner rather than custom scenario orchestration classes.

**BVP-SCN-002 — Small vocabulary.** The initial step vocabulary MUST remain intentionally small and capability-oriented, covering fixture setup/change, production sync/preview/execute/reconcile, external/fault transition, checkpoint/restart, observation, and assertion.

**BVP-SCN-003 — Generic step semantics.** A new ordinary scenario MUST NOT require new runner lifecycle concepts, new persistence systems, new command transports, or a new evidence schema.

**BVP-SCN-004 — Scenario isolation.** Scenario-specific helpers may exist only within the scenario/fixture layer and MUST NOT introduce scenario-specific behavior into production or the platform core.

**BVP-SCN-005 — Traceability.** Each scenario MUST identify the product requirement(s), invariant(s), or completion-evidence item(s) it proves.

### 3.4 External Runner

**BVP-RUN-001 — External authority.** Scenario sequencing, test state, pass/fail determination, retries that belong to the test process, and suite orchestration MUST be owned by the external BVP runner, not by production plugin runtime code.

**BVP-RUN-002 — Two executors.** The runner MUST be able to execute the same scenario/assertion concepts through the deterministic executor and the live-device executor where applicable.

**BVP-RUN-003 — Fail closed.** Missing observations, ambiguous command ownership, stale run identity, unsupported operation, or unavailable required evidence MUST produce FAIL/BLOCKED rather than optimistic PASS.

**BVP-RUN-004 — Bounded resumability.** The external runner MAY persist enough non-secret run state to resume a physical validation sequence after a human/device interruption. This persistence MUST NOT become a distributed general-purpose workflow engine.

**BVP-RUN-005 — No hidden product authority.** Runner state and test expectations are never synchronization authority and cannot force production state to match a test expectation.

### 3.5 Assertions and Evidence

**BVP-EVID-001 — Objective observations.** Assertions MUST derive from observable production plans/results, content/hash/identity, authoritative state, remote state, conflicts, diagnostics, and device lifecycle outcomes as applicable.

**BVP-EVID-002 — Production run receipt.** Live or deterministic execution MUST expose a narrow production-owned run receipt or equivalent authoritative terminal observation sufficient to identify the production run, trigger/plan identity as needed, terminal classification, and committed/verified outcome without reconstructing authority from ad-hoc test logs.

**BVP-EVID-003 — Diagnostics are corroborative.** Diagnostic logs MAY provide detailed corroboration but MUST NOT be the sole protocol by which test orchestration manufactures or infers production success.

**BVP-EVID-004 — Canonical result.** Each scenario execution MUST produce a machine-readable result plus concise human-readable evidence containing scenario identity, execution mode, build/device identity where applicable, relevant inputs/fixtures, observations, assertions, terminal verdict, and failure/blocking reason.

**BVP-EVID-005 — Privacy.** Evidence MUST NOT contain OAuth secrets, authorization codes, refresh/access tokens, full unrelated note content, or unrelated user data.

**BVP-EVID-006 — Traceability aggregation.** The platform MUST be able to aggregate scenario evidence into requirement/evidence status suitable for Stage-3 traceability.

### 3.6 Fault and Failure Injection

**BVP-FAULT-001 — Boundary faults only.** Deterministic fault injection MUST occur at understood production external/commit boundaries and MUST not bypass product safety logic.

**BVP-FAULT-002 — Physical uncertainty preservation.** An injected ambiguous network outcome after a simulated or real remote mutation MUST preserve the same uncertainty the product would face; the injector cannot simply relabel the effect as success or failure.

**BVP-FAULT-003 — No production reachability.** Fault controls used solely by the BVP MUST not be reachable from ordinary shipping-plugin execution.

**BVP-FAULT-004 — Real transitions remain real.** Tests whose evidentiary purpose is an OS/provider transition—such as actual iOS app termination, actual authorization revocation, or physical resource/platform behavior—MUST NOT claim that a deterministic synthetic substitute proves the physical transition.

### 3.7 Thin Live-Device Validation

**BVP-LIVE-001 — Command agent, not scenario engine.** A validation-only device agent MAY execute single bounded commands and observations such as fixture mutation, preview, execute, reconcile, observe, lifecycle checkpoint, and named fault activation. It MUST NOT contain the global scenario state machine.

**BVP-LIVE-002 — Production path.** Live commands that claim synchronization behavior MUST invoke the installed production synchronization path.

**BVP-LIVE-003 — Run/sequence identity.** Every live command/result MUST bind to a run identity, target device identity, and monotonically controlled command/sequence identity sufficient to reject duplicates and stale commands.

**BVP-LIVE-004 — Cross-device transport.** Cross-device command transport MAY use the user's existing Drive authority or another already-permitted local mechanism, but it MUST require no developer-hosted backend and no additional OAuth scope. Transport records are test control metadata, not synchronization authority or vault content.

**BVP-LIVE-005 — Desktop relay allowed.** If the external host cannot safely access device-local Google credentials, a thin Windows validation agent MAY relay controller commands to the shared cross-device command mailbox. The relay MUST remain stateless with respect to scenario meaning beyond run/sequence safety.

**BVP-LIVE-006 — Human checkpoints.** Actual OS/provider actions that cannot be safely automated may remain explicit checkpoints. The runner MUST make the required action, stop condition, and evidence needed for resumption unambiguous.

**BVP-LIVE-007 — Mobile reality.** The platform MUST not assume unsupported true iOS background execution. Physical validation must tolerate foreground-only execution, suspension, termination, and later resumption.

### 3.8 Verification and Repository Evidence

**BVP-VER-001 — No GitHub Actions.** GitHub Actions MUST NOT be used for BVP build, test, CI-like verification, or evidence collection.

**BVP-VER-002 — Repository-controlled PowerShell.** Required build/test/architecture/verification work MUST execute through repository-controlled PowerShell `.ps1` scripts under `dev/scripts/`.

**BVP-VER-003 — Canonical verification script.** One generic BVP verification entrypoint MUST perform architecture guards, complexity checks, type/build/test execution, relevant scenario checks, repository checks, and evidence collection. Scenario-specific PowerShell verifier scripts are prohibited.

**BVP-VER-004 — Evidence output.** Verification MUST capture complete relevant terminal output, commands/results, exit codes, architecture metrics, and verification evidence in `dev/_ca-output.md`; task-specific persistence MUST commit/push that evidence when the governing workflow requires it.

**BVP-VER-005 — Bootstrap.** Every coding/verification work order that requires local execution MUST provide a small paste-ready PowerShell bootstrap that fetches/updates the correct branch, runs the committed verification script, and performs only authorized cleanup. The wrapper MUST delegate complexity to committed scripts.

### 3.9 Legacy-Harness Retirement and Archive

**BVP-MIG-001 — Historical preservation.** Legacy validation-harness documents/evidence MUST be moved, not silently deleted, when their historical value remains material.

**BVP-MIG-002 — Active-authority removal.** Every `dev/**` artifact whose purpose or active instructions implement/govern the superseded internal validation harness MUST be moved beneath `dev/archive/legacy-validation-harness/**` or replaced with a clean non-legacy active artifact before replacement implementation begins.

**BVP-MIG-003 — Mixed documents.** If an active file mixes valid project authority with legacy-harness authority (for example the decision register or project-state record), archive the original complete file and create a clean active replacement containing the still-valid authority plus explicit supersession of the legacy harness.

**BVP-MIG-004 — Archive inertness.** Normal supervisor/coding-agent repository grounding MUST exclude `dev/archive/**`. Active documents MUST NOT link to archived implementation prompts as current authority.

**BVP-MIG-005 — Legacy code removal.** The legacy `src/validation/**` system, scenario-specific validation tests, and shipping-plugin validation UI/runtime integration MUST be removed from active production/test execution after any reusable general-purpose production semantics are safely separated. Archived source snapshots are optional because Git history already preserves source history; active legacy implementation must not coexist as a second available platform.

## 4. Anti-Drift Governance — Hard Requirements

The following controls are part of the target architecture, not optional process advice.

### 4.1 Machine-Readable Boundary

**BVP-GOV-001.** The repository MUST contain `dev/governance/testing-platform-boundary.yaml` (or an equivalently named supervisor-approved file) defining at minimum:

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
- active planning/tasking treats `dev/archive/**` as current authority;
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

**BVP-GOV-007.** The architecture-boundary manifest, complexity budgets, architecture guard, and verification entrypoint are supervisor-owned frozen surfaces. Normal coding-agent sessions MUST NOT modify them. An authorized governance-change session must be explicitly identified as such and must record the user/supervisor authority permitting the change.

### 4.7 Recurring Architecture Gate

**BVP-GOV-008.** Every implementation session runs the mechanical architecture guard. In addition, after no more than **two implementation sessions**, the supervisor MUST perform a repository-level architecture review comparing the actual dependency graph, metrics, boundaries, and build output with this specification before dispatching further work.

### 4.8 Architecture Evidence

**BVP-GOV-009.** Every local-verification evidence record for BVP work MUST include:

- architecture guard result;
- current architecture metrics;
- metric delta from the work-package base where applicable;
- statement of whether any frozen governance file changed;
- statement of whether any new production seam or platform-level abstraction was introduced.

A green functional test suite cannot override a failed architecture guard.

## 5. Observable Behavior

### 5.1 Deterministic Semantic Scenario

A scenario establishes two device states and a shared remote, applies defined independent changes, invokes the real production synchronization behavior, and asserts the resulting content, identities, conflict classification, state, and safety result. The scenario itself contains no custom runner state machine.

### 5.2 Crash / Ambiguous Outcome

The test world can interrupt execution at named external/commit boundaries, reconstruct runtime objects from surviving state/reality, and verify that the product resumes/reconciles according to its target requirements. Test infrastructure does not mark an uncertain physical result as success merely to continue the scenario.

### 5.3 Live Windows/iOS Scenario

The external runner assigns a run and ordered commands. Each validation-only device agent executes only its addressed bounded command through the production path and returns a typed observation/result. The external runner decides the next step and final verdict.

### 5.4 Physical Human Checkpoint

When the scenario requires an actual OS/provider transition the runner pauses with an explicit requested action, expected resume condition, and evidence requirement. After the operator performs the action, the runner resumes from its bounded external checkpoint; the mobile plugin does not carry a durable distributed scenario machine.

### 5.5 Ordinary Production Build

Building the ordinary plugin produces no BVP runner, scenarios, simulator, command mailbox, validation UI, validation-mode setting, or test-only faults. Production behavior is unchanged except for any narrowly approved general diagnostic/run-receipt seam that is itself safe and within the production seam budget.

## 6. Responsibilities and Boundaries

### 6.1 Production Plugin

Owns synchronization product behavior, production plans, execution, state, local/Drive interactions, diagnostics, and any general production run receipt. It does not own test scenarios or test orchestration.

### 6.2 BVP Scenario Catalog

Owns typed declarative scenarios and fixture descriptions linked to target requirements.

### 6.3 BVP External Runner

Owns scenario sequencing, executor selection, checkpoints, assertions, verdicts, and evidence aggregation.

### 6.4 Deterministic World

Owns controllable implementations of external reality and fault behavior. It does not own synchronization policy.

### 6.5 Live Validation Agent

Owns validation-build-only execution of bounded commands inside Obsidian and returns observations/results. It does not interpret whole scenario meaning.

### 6.6 Command Transport

Moves addressed run/sequence commands and results. It does not own synchronization or scenario authority.

### 6.7 Architecture Governance

Owns the machine-readable boundary, architecture guard, metrics, and local PowerShell verification entrypoint. These surfaces are intentionally outside ordinary coding-agent ownership.

## 7. Data, State, and Authority

### 7.1 Scenario Definitions

Scenarios are source-controlled test specifications. They are not runtime synchronization state.

### 7.2 Simulated World State

Simulated local/remote/device state is authoritative only for the test world. Production code consumes it through the same interfaces it would use for real external observations.

### 7.3 Live Command State

Live command records contain only run/sequence/target/command arguments and bounded results required for test coordination. They contain no OAuth secrets and do not become product state.

### 7.4 Test Checkpoint State

External-run checkpoints may record scenario step position and references to prior results for resumability. They remain bounded test-controller state and do not migrate into device synchronization authority.

### 7.5 Evidence

Evidence records what was observed. Evidence does not authorize product mutations.

## 8. System Invariants

**BVP-INV-001.** Production source never depends on the BVP implementation tree.

**BVP-INV-002.** Production shipping artifacts never contain scenario/test-platform code.

**BVP-INV-003.** A test cannot PASS by executing a duplicate synchronization implementation.

**BVP-INV-004.** Ordinary scenarios are declarative and do not own independent runner lifecycles.

**BVP-INV-005.** Test faults cannot create stronger certainty than the physical/semantic boundary provides.

**BVP-INV-006.** Live device agents execute commands; the external runner owns scenario state.

**BVP-INV-007.** Test evidence cannot become synchronization authority.

**BVP-INV-008.** Archived legacy-harness material cannot silently regain active authority.

**BVP-INV-009.** Architecture/complexity guard failure blocks acceptance even when functional tests pass.

**BVP-INV-010.** No ordinary coding agent can unilaterally weaken architecture budgets or frozen anti-drift controls.

**BVP-INV-011.** Adding an ordinary scenario does not require scenario-specific production code or PowerShell infrastructure.

**BVP-INV-012.** All verification/CI-like execution for this subsystem is local repository-controlled PowerShell, not GitHub Actions.

## 9. Failure and Validation Behavior

| Condition | Required response |
| --- | --- |
| Production imports `test-platform/**` | Architecture verification fails. |
| Shipping bundle contains BVP code | Architecture verification fails. |
| Scenario requires new platform abstraction | Stop and route architecture review; do not implement silently. |
| Hard LOC/module/seam budget exceeded | Stop and route architecture-change request. |
| Required deterministic observation unavailable | FAIL/BLOCKED; never assume success. |
| Live device receives stale/wrong run command | Ignore/reject and record mismatch. |
| Live command result ambiguous | Preserve ambiguity; runner may reconcile/observe but cannot relabel. |
| iOS is suspended/terminated | Resume through external checkpoint/next command; no requirement for background execution. |
| Old archived prompt conflicts with active BVP authority | Ignore archived prompt; active authority controls. |
| Verification environment lacks a dynamic capability | Record the unavailable check accurately; do not fabricate pass/failure. |
| Architecture guard/metrics script itself changed in ordinary work | Reject the work package unless explicitly authorized governance change. |

## 10. Fixed Decisions — Implementation May Not Reinterpret

- The oversized internal `src/validation/**` architecture is superseded and will not be extended.
- The replacement platform is physically rooted outside production `src/**`.
- Production-to-test-platform dependency is prohibited.
- Ordinary production build output excludes the platform and validation-only agent.
- Deterministic virtual-world testing is the primary mechanism for synchronization semantics, recovery, safety, and fault coverage that does not intrinsically require physical platform behavior.
- Real Windows/iOS testing remains required where the product target specification requires platform evidence.
- Scenarios are declarative by default.
- The external runner owns scenario sequencing/verdicts.
- Live-device code is a thin validation-only command agent, not a general runner.
- No developer-hosted automation backend and no expanded Google OAuth scope are introduced solely for validation.
- GitHub Actions are not used; repository-controlled PowerShell under `dev/scripts/` owns local verification/evidence.
- `dev/archive/**` is historical and non-authoritative.
- Anti-drift guards, budgets, and recurring architecture reviews are mandatory acceptance gates.

## 11. Engineering Discretion

Subject to the fixed boundaries above, implementation may choose:

- exact TypeScript DSL syntax for scenario declarations;
- exact in-memory data structures;
- exact runner CLI shape;
- exact test framework reuse versus Node built-in test integration;
- exact validation-build bundling mechanism;
- exact bounded command transport representation;
- exact evidence serialization format;
- exact deterministic clock/fault primitive;
- private helper/module decomposition within the LOC and abstraction budgets;
- whether existing `src/testing/fakes.ts` concepts are moved/adapted or replaced;
- exact names of generic step handlers and assertions.

Engineering discretion does not include changing dependency direction, placing scenario/framework code back in production, adding a second sync engine, weakening safety/evidence semantics, bypassing complexity gates, or turning the device agent into another distributed workflow system.

## 12. Non-Goals

The BVP does not require:

- a general-purpose workflow engine;
- an extensible plugin/module framework for test modules;
- a durable distributed scenario state machine on each device;
- production validation settings/UI in the shipping plugin;
- scenario-specific production interfaces;
- scenario-specific PowerShell scripts;
- Appium as the primary testing architecture;
- a developer-hosted automation service;
- a second OAuth/token export path for the external runner;
- exact automation of OS actions that cannot safely be automated;
- replacement of existing product diagnostics/audit features that serve real users;
- replacement of useful ordinary production/unit tests unrelated to the legacy harness;
- preservation of the old C/D/E/F implementation shape merely for historical continuity.

## 13. Completion Evidence

The BVP is complete only when objective evidence proves all of the following.

### 13.1 Architecture and Anti-Drift

- legacy active harness authority is archived/superseded;
- legacy `src/validation/**` runtime and shipping UI integration are removed;
- production build excludes `test-platform/**`;
- architecture guard passes;
- complexity metrics are within hard budgets;
- frozen governance files are present and protected by work-package rules;
- no scenario-specific production source or PowerShell verifier exists.

### 13.2 Deterministic Test Capability

- multi-device stateful virtual world exists;
- real production planner/executor/state semantics run against it;
- deterministic fault/restart controls exist;
- target-specification reconciliation, crash/state, transfer, destructive-safety, and relevant lifecycle requirements are mapped to executable deterministic scenarios;
- failures demonstrate that the scenarios actually detect incorrect outcomes rather than always passing.

### 13.3 Live Platform Capability

- separate validation artifact/entrypoint runs on Windows and iOS Obsidian without entering the ordinary shipping bundle;
- device agent accepts bounded addressed commands and returns objective results;
- cross-device command transport rejects stale/mismatched commands;
- representative Windows/iOS workflows required by the product target specification execute through the production path;
- external checkpoints cover genuinely physical transitions without inventing background execution.

### 13.4 Evidence and Verification

- canonical local PowerShell verification completes successfully;
- `dev/_ca-output.md` contains commands, outputs/results, exit codes, architecture metrics, and required verification evidence;
- scenario evidence maps to the BRAIN target specification's §13 completion-evidence categories;
- a Stage-3 validator can trace each material product requirement to implementation and validation evidence without relying on legacy harness claims.

## 14. Stage-1 Handoff Rule

Detailed Stage-2A coding prompts MUST NOT be treated as permanently valid repository instructions. This specification and the compact build/session decomposition persist the required outcomes; immediately before each session, the supervisor must inspect the actual repository produced by the previous accepted session, bind the exact base SHA and concrete affected files, and issue the smallest executable prompt consistent with the then-current state.