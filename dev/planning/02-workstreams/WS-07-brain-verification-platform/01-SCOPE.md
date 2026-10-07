# Scope — BRAIN Verification Platform

## Authorized capabilities

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

**BVP-VER-002 — PHX-CI is the canonical acceptance system.** Authoritative coding-agent branch and primary-stage verification MUST use the installed PHX-CI deployed runtime selected from the exact target branch's `phx-ci.json` framework pin and invoked through that runtime's `scripts/Invoke-PhxCi.ps1` operator front door. Production/operator verification MUST NOT depend on a mutable PHX-CI source checkout.

**BVP-VER-003 — Project-specific checks remain small and durable.** The repository MAY contain the generic BVP architecture guard and metrics scripts under `dev/scripts/`, but MUST NOT create one-off task/scenario verifier scripts. After BVP-S03, guard and metrics execution MUST be wired into the repository check that PHX-CI runs so every accepted implementation session is mechanically architecture-checked.

**BVP-VER-004 — PHX-CI evidence is canonical.** PHX-CI MUST capture exact framework identity, target HEAD/base/change set, stage results, full test/build/repository/artifact results, and final verdict in the configured current `dev/_ca-output.md` surface and immutable `dev/Test-Results/<runId>/` historical evidence. Acceptance workflows that authorize publication MUST use PHX-CI's race-protected evidence publication rather than hand-built evidence commits.

**BVP-VER-005 — Child-session and primary-stage gates.** Every implementation child session MUST pass authoritative PHX-CI remote-branch verification before supervisor integration. Every primary BVP stage MUST then pass a separate integrated PHX-CI acceptance gate before the next primary stage begins.

**BVP-VER-006 — Routine developer checks are not acceptance.** `task ci` MAY be used during active development when a PHX-CI source checkout is intentionally available, but worker self-tests and source-mode checks do not replace the deployed-runtime operator acceptance gate.

### 3.9 Legacy-Harness Retirement and Archive

**BVP-MIG-001 — Historical preservation.** Legacy validation-harness documents/evidence MUST be moved, not silently deleted, when their historical value remains material.

**BVP-MIG-002 — Active-authority removal.** Every `dev/**` artifact whose purpose or active instructions implement/govern the superseded internal validation harness MUST be moved beneath `archive/pre-standard-dev-layout-2026-10/DEV/archive/legacy-validation-harness/**` or replaced with a clean non-legacy active artifact before replacement implementation begins.

**BVP-MIG-003 — Mixed documents.** If an active file mixes valid project authority with legacy-harness authority (for example the decision register or project-state record), archive the original complete file and create a clean active replacement containing the still-valid authority plus explicit supersession of the legacy harness.

**BVP-MIG-004 — Archive inertness.** Normal supervisor/coding-agent repository grounding MUST exclude `archive/**`. Active documents MUST NOT link to archived implementation prompts as current authority.

**BVP-MIG-005 — Legacy code removal.** The legacy `src/validation/**` system, scenario-specific validation tests, shipping-plugin validation UI/runtime integration, and supervisor-classified harness-only production seams MUST be removed from active production/test execution. Any retain/delete classification needed for retirement MUST be resolved by the supervisor before worker dispatch; a coding agent may not decide that a listed deletion should be retained or that an unlisted surface is safe to remove. Archived source snapshots are optional because Git history already preserves source history; active legacy implementation must not coexist as a second available platform.


## Responsibilities and boundaries

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

Owns the machine-readable boundary, architecture guard, architecture metrics, and PHX-CI consumer integration. These surfaces are intentionally outside ordinary coding-agent ownership.

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

**BVP-INV-012.** All authoritative verification/CI-like acceptance for this subsystem is local PHX-CI deployed-runtime verification, not GitHub Actions; project-specific architecture guard/metrics remain repository-controlled PowerShell invoked through PHX-CI's repository check.


## Explicit non-goals

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

