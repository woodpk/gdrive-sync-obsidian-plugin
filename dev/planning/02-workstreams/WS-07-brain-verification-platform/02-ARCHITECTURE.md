# Architecture — BRAIN Verification Platform

## DEC-351 architecture interpretation — direct deterministic scenario-ID CLI

This is an **interface-only** feature within existing BVP architecture and frozen limits, not an exception to the contracts below. A narrow, generic Node/TypeScript entrypoint and compile-time deterministic scenario definition lookup may be added under `test-platform/test/batteries/**` **only** to resolve exact `scenario.id` to an existing immutable `ScenarioDefinition` and call `DeterministicScenarioRunner.canonical().run(definition)`. Source-discovered catalog completeness and duplicate/mode protection must be tested. The public `run(scenario)` method is already present; the missing functionality is *CLI name resolution*, not scenario execution. Read-only ID discovery may reuse the catalog. No changes to core runner, typed step execution, production `src/**`, existing battery behavior, new orchestrator/plugin router, live/physical dispatch, hardware simulator assumptions, code-size budgets, PHX-CI pin or frozen guard are authorized. A needed deviation must stop for review under BVP-GOV-005 through BVP-GOV-009. Detailed prospective Build Unit: `tasks/bvp-direct-scenario-id-cli-2026-10-24.md`; source changes require PHX-CI and independent Reviewer qualification.

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

**BVP-GOV-002.** The repository-controlled guard in `test-platform/src/architecture-governance.ts`, consumed by `test-platform/src/repository-check.ts` under PHX-CI, MUST fail verification when any applicable condition occurs:

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

**BVP-GOV-003.** The repository-controlled metrics implementation in `test-platform/src/architecture-governance.ts`, consumed by `test-platform/src/repository-check.ts` under PHX-CI, MUST calculate and persist at least:

- production-only source LOC;
- production code whose sole purpose is the BVP seam;
- BVP core framework LOC excluding tests/scenario definitions;
- validation-device-agent LOC;
- scenario definition LOC by scenario;
- count of platform core runtime modules;
- count/list of production modules imported by the BVP;
- PowerShell script count/LOC for the BVP;
- before/after delta for the current work package when a base SHA is supplied.

**BVP-GOV-004 — Current hard budgets (owner-amended by DEC-349, DEC-353 and DEC-355, 2026-10-25).** Only an explicit Owner-authorized architecture change may alter them:

- production BVP-only seam: **maximum 350 logical source lines across maximum 4 production files**;
- BVP framework core (runner, DSL interpreter, generic assertions/evidence, adapters/orchestration excluding tests, scenario definitions, and device agent): **maximum 4,850 logical TypeScript source lines**;
- live-device agent/relay subset: **maximum 1,250 logical TypeScript source lines**;
- individual ordinary declarative scenario: **target ≤120 logical lines; hard maximum 200 logical lines**;
- scenario-specific PowerShell scripts: **0**;
- BVP PowerShell operational/invocation scripts, if any: **maximum 4 scripts and 1,500 logical lines combined**; standalone PowerShell validation authority is prohibited.
- scenario-specific production source files/classes/interfaces: **0**.

Tests themselves are not constrained by these LOC budgets; correctness evidence must not be discouraged by a test-code ceiling.

**DEC-349 authorization (governance-bound):** The Owner explicitly selected Option 2 on 2026-10-23 for BVP diagnostic/error communication. The actual PHX-CI R1 footprint was 4,079 core and 778 live-device logical lines; the previous 4,000/750 ceilings blocked the upgrade. The amended 4,500/950 limits grant +500 core and +200 live-device lines, leaving 421/172 lines of remaining capacity at the measured R1 source for substantive, safe diagnostic work. Only those two ceilings change. The existing manifest-based metrics, fail-above-budget guard, no-scenario-specific scripts rule, zero competing verification authority, source isolation, and all other budgets remain enforced. The frozen manifest change must be qualified as `authorized-governance` through the unchanged Windows PHX-CI engineering gate, not with the `ordinary` change class. Unused headroom is not an implementation objective; if further growth is needed, obtain another Owner decision rather than hiding code or bypassing metrics.

**DEC-353 Owner authorization (2026-10-25):** Following DEC-352 R2 independent findings, the Owner approved the bounded, read-only historical-run and unbound-device telemetry extension within the existing authenticated BVP mailbox and then separately approved a **+50** framework-core increase **4,500 → 4,550**. The live-device agent/relay hard ceiling remains **950**. No other budgets, authority contracts, PHX-CI pins, guard algorithms, physical dispatch authority or shipping code changed. The current machine-readable `testing-platform-boundary.yaml` must enforce 4,550 and 950. An eventual PHX-CI PASS does not itself authorize release or physical execution.

**DEC-355 Owner authorization (2026-10-25):** For implementation of DEC-354 Option B verified archive and bounded active diagnostic retention, the Owner explicitly raised both hard budgets by **300 logical TypeScript lines**: framework core **4,550→4,850** and live-device agent/relay **950→1,250**. The machine-readable frozen guard and exact one-line-over tests enforce these limits. This does not waive safe archival proof, protection of unresolved evidence, PHX-CI or Reviewer qualification, or shipping/physical/release restrictions.

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

## DEC-339 verification boundary — design only

The prospective inventory safety/equivalence/performance gates are specified in `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md`, §11. WS-07 supplies deterministic virtual-world tests and a small number of authorized physical checks where needed; **PHX-CI exclusively executes or coordinates every executable validation**. The current production seam allowlist, scenario LOC, platform budgets and frozen BVP governance remain unchanged. Test cases must challenge stale or partial inventory, duplicate same-name siblings, cursor/CAS crash windows, loss of access, uncertain effects and safety equivalence, not create a second CI/verification engine.

## Prospective S09 fixed-PHX-CI physical battery consumer (2026-10-20)

**Owner constraint DEC-345:** PHX-CI is an **unchanged** immutable external tool. The implementation, tests, evidence-adapter plumbing and operator interface reside only in BRAIN. Do not modify `woodpk/phx-ci`, its pinned runtime, or BRAIN's frozen PHX-CI pin/configuration; do not reinstate `dev/scripts/Invoke-BVP-Battery.ps1`. Reuse `run-live-battery.ts`, the single BVP scenario runner, checkpoint v2, live executor and late-receipt recovery.

**Invocation:** PHX-CI's existing `test-focused` stage is the only approved software-execution entry. Its command must retain the full deterministic BVP suite (`npm run test:bvp-root`) and conditionally invoke the BRAIN-owned live adapter in the **same** focused stage for separately Owner-authorized physical attempts. All existing PHX-CI gates remain in force; BVP return 3 is not remapped to 0.

**Evidence transport hypothesis:** PHX-CI's already-published focused-stage stdout (within its existing structured evidence JSON) can contain strictly bounded privacy-reviewed serialized existing BVP result/checkpoint bytes. A future attempt uses Git to recover them by immutable published PHX evidence commit/path with exact integrity/ancestry/source/device checks. Never rely on a disposable worktree, mutable `dev/_ca-output.json`, a made-up run path or external unverified data. A BRAIN adapter may frame data but may not issue authoritative verdicts, push its own test results or create a second canonical evidence schema.

**Identity and safety:** each PHX-CI run has a new PHX run ID; BVP run ID, scenario digest, original validation-device artifact source/SHA, device identities and relay scope stay stable. Evidence-only branch advancement must be proven not to change relevant source; no side-effect retry after uncertain effect. Human checkpoint/late receipt modes remain exclusive. Any size/privacy/evidence-publication limit is BLOCKED, not an excuse to change PHX-CI or weaken the architecture guard.

**Status:** architecture drafted for BRAIN implementation; mechanism unproven until two separate actual PHX-CI runs of safe simulated devices publish/read back exact artifacts. Physical S09 and Stage 3 are not authorized. Detailed interface and child decomposition: `tasks/s09/s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`.


## DEC-357 frozen Windows controller authentication architecture (2026-10-28)

**One authoritative control plane, not an Obsidian IPC bridge.** The browser-safe BVP validation device reporter stores and retries immutable diagnostic-pending records in the existing authenticated Drive mailbox. Separately, a single Windows-only Node process uses its **own Google Desktop OAuth PKCE credentials**, protected at rest with current-user DPAPI, to observe the **pre-existing** BVP mailbox. It must not create another mailbox if the `drive.file` authorization cannot see that mailbox. Only this Node controller, under the original `wx` OS exclusive lock and an already-existing exact run/device/generation lease, promotes pending records to ACTIVE. The reporter confirms delivery only after ACTIVE; controller inbox write does not attest event resolution. Event-specific proof, capacity, 90-day window, verified archival and byte-preserving retirement remain DEC-356/354 governed.

**Frozen interfaces:** `WindowsOAuthOptions`, `WindowsDpapiSecrets`, `authorizeWindowsController`, `createWindowsControllerRequest` in `test-platform/src/windows-controller-auth.ts`; `runWindowsDiagnosticControllerOnce(AuthenticatedDriveRequest, {relayRoot,deviceId})` in `test-platform/src/windows-diagnostic-controller.ts`; `WindowsControllerCycleOptions`, `withWindowsControllerProcessLock`, `runWindowsControllerCycle`, and the actual `--authorize|--once|--serve` Node CLI in `test-platform/src/run-windows-diagnostic-controller.ts`. The reporter/controller relay scopes are explicit and must not accidentally dispatch commands from the diagnostics-only controller. The live scenario executor alone creates the lease; the controller checks it. No two independent Windows hosts and no Google Drive-global atomic locking claim.

**Mandatory separation:** no `src/**` edits or unapproved production imports, no Node modules in the generated device/mobile bundle, no privilege escalation or copy of Obsidian refresh tokens, no second verification system. Preserve framework-core **4850** and live-device **1250** frozen logical LOC ceilings, guard and pinned PHX-CI. The current candidate **has not been PHX-CI verified**. Real separate OAuth file visibility remains **unverified** and blocks live activation. Detailed design, risks, contracts, negative matrix and dependencies: [DEC-357 build unit](tasks/bvp-windows-controller-oauth-2026-10-28.md).

