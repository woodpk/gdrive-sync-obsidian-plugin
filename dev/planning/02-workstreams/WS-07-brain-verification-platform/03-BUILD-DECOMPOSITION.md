# Build Decomposition — BRAIN Verification Platform

## Current successor unit — DEC-357 / BVP_WINDOWS_CONTROLLER_OAUTH (Owner-approved 2026-10-28)

This is a **distinct new bounded WS-07 unit**, not the earlier DEC-351 CLI finalization task and not just DEC-356 F01 bookkeeping. The earlier heading below labeled “Current Owner-directed Build Unit — CLI result finalization” is **historical/parallel scope** for a separate branch; it is **not** the next assignment on `build/bvp-poll-error-observability-20261025`.

**Canonical contract:** [DEC-357 Windows controller OAuth](tasks/bvp-windows-controller-oauth-2026-10-28.md). **Owner decision:** Option A (separate Windows Node Desktop OAuth PKCE / Windows current-user DPAPI), rejecting Option B (privileged Obsidian→Node IPC). **Predecessor:** DEC-352/354/355/356 and R5 F01 **CORRECTION REQUIRED**.

| Ordered unit | Work and dependency | Required gate |
| --- | --- | --- |
| WCO-01 | Freeze reporter vs authoritative Windows controller/lease boundary (DEC-356) | Test-first pending→ACTIVE, durable inbox, explicit no-command-dispatch |
| WCO-02 | Separate Windows Desktop OAuth PKCE, DPAPI and refresh, depends WCO-01 | Test-first scope, credential at-rest, callback/replay, missing auth |
| WCO-03 | Authenticated existing-mailbox-only access and failure classification, depends WCO-02 | Test-first missing root does not create a second mailbox; cursor expiry, auth/rate failures |
| WCO-04 | Real compiled Windows Node CLI/process singleton/lease-aware startup, depends WCO-03 | Actual-process and assembled fake-Drive/controller oracles, restart/contender/orphan lock |
| WCO-05 | Source impact/budget/architecture review; freeze SHA, unchanged owner-operated software-only Windows PHX-CI | Original evidence and actual 11-stage, focused/product results; **NOT RUN** |
| WCO-06 | Fresh independent blind-first Reviewer acceptance, then separate Owner decision | **NOT STARTED**; no premature deployment or physical use |

The WCO-01–04 draft implementation/test files already exist, but their presence is **not proof of PASS**. Preserve the frozen WCO-001–011 requirements and architecture boundaries. No owner PHX-CI run until all relevant `dev/` planning/specifications/state reflect this new cycle. PHX-CI is the sole execution authority for qualification. Handoff-count **10**, recipient **BUILDER**, remains unchanged until a real cross-role transition.


## Current Owner-directed Build Unit — CLI result finalization (2026-10-24)

**Current Builder task:** [`BVP_CLI_RESULT_FINALIZATION`](tasks/bvp-cli-result-finalization-2026-10-24.md). The Owner authorized starting the next Build Unit after accepted DEC-351 closeout. The repository had no scheduled successor. This bounded **software-only** defect-hardening unit addresses the independent R5 M-03 finding: stdout summary must not announce a completed scenario before the result FileHandle successfully closes. Preserve DEC-351's public CLI and schema; add meaningful real compiled-CLI close-fault regression via a test-only local preloader; implement the smallest correction; qualify with the exact pinned PHX-CI and obtain separate final independent review. No new external simulator, real-device execution, authentication, live Drive/vault use, framework changes, budget amendment, product merge or release.

**Predecessor:** DEC-351 independent PASS WITH MINOR FINDINGS accepted at `b532a9339fb631ffa03c3f74917e8370af138cff`, Builder administrative closeout `f34139ba380f2f9d39871a4ab4f31ede0dad531f`. Existing DEC-351 handoff-count 4 is historical; the new feature starts handoff-count 0 on the separate branch. M-02 and M-04 remain deferred and are not modified by this unit.

**Authority precedence:** DEC-350 paused the formerly proposed complete PowerShell-library implementation; DEC-351 supersedes the old “not authorized to start PowerShell Build Unit” status **only for the new narrow scenario CLI**. Historical PowerShell plans below remain historical. No frozen governance modification, third-party iPhone simulator claim/integration, physical/Drive/vault dispatch or PHX-CI runtime change is authorized. Canonical future operator instructions: `dev/planning/03-verification/bvp-operator-runbook.md`.

## Durable future task contracts

### Owner-directed operational BVP modernization — DEC-346/347/348 (2026-10-23)

**Governed architecture budget change DEC-349 (Owner Option 2):** Core BVP framework 4,000 → **4,500** and live-device agent/relay 750 → **950** logical TS lines, solely to implement the error-communication feature without forced code compression. See [WS-07 Architecture](02-ARCHITECTURE.md) and [error communication task](tasks/bvp-error-communication-upgrade-2026-10-23.md); original R1 PHX-CI was BLOCKED at 4,079/778 lines. Authorization changes only the manifest's two numeric ceilings, not the governance guard. The next engineering gate is Windows PHX-CI **authorized-governance** qualification; no physical mobile dispatch or Reviewer handoff before PASS.


The new owner-locked priorities are (1) a complete minimal PowerShell **interface to all existing BVP API commands**, (2) all BVP operational testing on Windows Obsidian or the existing Windows-hosted iPhone/iPad simulator with iOS/iPad scenarios connected to that simulator, and (3) materially better structured error communication. For this third priority, the **authoritative new planning contract** is [BVP Error Communication and Diagnostic Upgrade](tasks/bvp-error-communication-upgrade-2026-10-23.md), with the complementary [PowerShell API and persistent configuration build plan](tasks/bvp-powershell-interface-library-2026-10-23.md). **Current 2026-10-24 status:** The **BVP Error Communication and Diagnostic Upgrade** is independently **ACCEPTED/CLOSED for Windows software-only development** (R10 source `7b7382ce303d097080dd5117638dba32f3ca9a82`, PHX-CI 11/11 PASS, 529/529 focused, 1292/1292 product, final Reviewer `PASS WITH BOUNDED FINDINGS`). The separate **BVP PowerShell Interface Library** was subsequently **PAUSED by DEC-350**; the **narrow scenario-ID Node CLI** is now the only Owner-authorized next feature under DEC-351, without source implementation yet; Windows-first simulation expansion and physical S09 acceptance are not represented as completed. Do not use PHX-CI to launch routine BVP tests, revive physical S09 dispatch without new Owner authorization, or claim simulator evidence is actual iOS OS/hardware evidence. Older physical S09 plans remain historical/deferred and do not override DEC-346/347/348.

The active new bounded task contract is the DEC-351 scenario-ID CLI under `tasks/`; older preplanned physical task contracts BVP-S09A through S09V remain under `tasks/s09/`. They remain `PREPLANNED / NOT-YET-EXECUTABLE` and must be re-grounded against current repository reality, current authority, and current PHX-CI/physical-validation requirements immediately before dispatch. Completed or superseded historical prompts are preserved only in the external pre-standard archive.

### R10 independent error-diagnostics feature closeout — not a primary-stage/physical acceptance

- Authoritative record: `tasks/bvp-error-communication-upgrade-2026-10-23.md`, final Reviewer `dev/reviews/bvp-error-reporting-20261024-review-brain-09-r10-final.md`, handoff-count **6** returned to BUILDER at `ef7e9c2a5d17cd1eaea96b58fad8faf67749e552`.
- Exact source/tree `7b7382ce303d097080dd5117638dba32f3ca9a82` / `324e20aa9c7fe69f346baab3b8468c4b4b`, original PHX-CI run `937b3682-acb1-47d6-801a-cb397ad96ae7`, original evidence `aeb9a20166c33541a4a6086f462a0cf44acd3b9b`. Independent Reviewer CLOSED ER-01–ER-04, NEW-01/NEW-02; ten test families ADEQUATE within Windows software scope.
- **Do not** infer master merge, release, installation, iPhone/iPad physical readiness, live Google Drive/vault validation, Stage 3, or automatic permission to start a comprehensive PowerShell library. The separate DEC-351 narrow CLI is now Owner-authorized for the next bounded Builder implementation. Owner explicitly prohibits another review handoff for this accepted diagnostic feature. No PHX-CI rerun for this administrative closeout.

## Primary decomposition

## 1. Status and Authority

**Status:** Authoritative Stage-1 build decomposition  
**Governing specification:** `BRAIN Verification Platform — Target-System Specification`  
**Workflow:** Workflow A / Stage 2A controlled session-based construction  
**Date:** 2026-09-23  

This decomposition follows the Agent-Led Software Product Construction Manual: phases exist only where dependency order, stable-boundary establishment, risk isolation, independent testability, or meaningful integration requires separation. The nine BVP work packages are decomposed into bounded child sessions later in this canonical workstream artifact; detailed executable child prompts must be refreshed against the actual repository immediately before each session begins.

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

No later primary phase may begin merely because predecessor code exists. Every implementation child must pass PHX-CI before integration, and the predecessor primary phase's integrated PHX-CI acceptance gate—including architecture guard and metrics from S03 onward—must pass first.

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

- accepted BVP planning documents are active under `dev/planning/` and governance authority under `dev/authority/governance/`;
- `DEC-301`–`DEC-310` are superseded rather than simultaneously active;
- all old `dev/**` harness tasking/planning/evidence is moved beneath `archive/pre-standard-dev-layout-2026-10/DEV/**` according to the archive plan;
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
- active `dev/authority/governance/locks/testing-platform-boundary.yaml` is installed;
- `test-platform/src/architecture-governance.ts` implements the repository-controlled architecture guard for import/bundle/scenario/archive/frozen-surface rules;
- `test-platform/src/architecture-governance.ts` implements architecture metrics and budget/delta measurement;
- the installed PHX-CI deployed runtime is the canonical branch/stage verification entrypoint;
- architecture guard and metrics are consumed by `test-platform/src/repository-check.ts` under PHX-CI and are themselves tested with deterministic negative fixtures/cases;
- PHX-CI current work-unit evidence is `dev/_ca-output.md` with immutable historical runs under `dev/test-results/<runId>/`;
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
- an active authority link treating `archive/**` as current tasking.

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

## Execution-sized child-session decomposition

# BRAIN Verification Platform — Child-Session Decomposition

## 1. Purpose

The existing BVP-S01 through BVP-S09 specifications are **primary Stage-2A work packages**, not one-turn coding sessions. This document decomposes them into bounded child sessions sized for one coding-agent execution/review cycle while preserving the manual's minimum-sound high-level phase structure.

Historical child task files were created under the pre-standard task hierarchy and are slated for external archival. This canonical file now contains the durable child-session decomposition. Any future durable task prompt, when genuinely required, belongs only under this workstream's optional `tasks/` directory and must be repository-grounded immediately before dispatch.

## 2. Verification Model

Every implementation child:

1. starts from an exact supervisor-approved predecessor;
2. owns one coherent responsibility;
3. has an exact writable-path allowlist at dispatch;
4. pushes its task branch;
5. receives authoritative local verification through the installed PHX-CI deployed-runtime operator front door;
6. is independently reviewed before integration.

Every primary S01-S09 work package ends with a `V` acceptance gate. S01 is already complete under its historical verifier; S02 onward use PHX-CI.

## 3. Session Map

| Primary | Child | Capability | Completion |
|---|---|---|---|
| S01 | 01A | Persist BVP authority and decision supersession | BVP planning authority active; legacy decisions superseded; no product source touched. |
| S01 | 01B | Archive legacy dev harness material | Legacy dev artifacts archived; active authority clean; archive manifest complete. |
| S01 | 01V | Authority/archive acceptance | Historical S01 evidence COMPLETE; S02 may begin. |
| S02 | 02A | Retire harness-only test/support surface | Harness-only tests absent; all production source byte-for-byte unchanged; PHX-CI passes. |
| S02 | 02B | Retire harness source and production coupling | src/validation absent; H6C-only seam absent; main/settings/controller exact target hashes; PHX-CI passes. |
| S02 | 02V | Primary-stage PHX-CI acceptance | Integrated phase6-integration passes PHX-CI; no legacy runtime/UI/bundle identifiers; no replacement platform started. |
| S03 | 03A | Create test-platform root and shipping isolation | Separate root exists; production build remains unchanged/exclusive; no runner/simulator. |
| S03 | 03B | Implement architecture guard | Guard fails prohibited dependency/bundle/scenario/archive/script/frozen-surface cases and passes compliant baseline. |
| S03 | 03C | Implement architecture metrics and budget gates | Required metrics/deltas produced; hard budgets fail closed. |
| S03 | 03D | Wire guard and metrics into PHX-CI repository check | Repository check invokes guard+metrics; frozen governance established; no task-specific verifier. |
| S03 | 03V | Primary-stage PHX-CI acceptance and architecture baseline | PHX-CI complete; negative guard tests pass; baseline metrics recorded; supervisor architecture review complete. |
| S04 | 04A | Stateful in-memory local vault | Local observation/read/write/move/trash/listing/path/config behaviors covered; no sync policy in adapter. |
| S04 | 04B | Stateful in-memory Drive core | Stable remote IDs/revisions and core mutation/read semantics proven. |
| S04 | 04C | Drive change feed, completeness, ambiguity and faults | Change feed/completeness/ambiguity semantics proven without policy duplication. |
| S04 | 04D | Per-device durable state, deterministic time/order, restart | Two device-local authorities survive runtime reconstruction over retained simulated reality. |
| S04 | 04E | Virtual-world composition over real production logic | Create/upload/download/two-device/move/partial-listing/ambiguous/restart production-path canaries pass. |
| S04 | 04V | Primary-stage PHX-CI acceptance | PHX-CI complete; S04 acceptance canaries pass; guard/metrics stable. |
| S05 | 05A | Typed scenario contract and small step vocabulary | Scenario contracts exist as data definitions; no runner/router/persistence. |
| S05 | 05B | External deterministic runner core | Runner owns sequence/verdict; unsupported/missing observations block/fail; no distributed state. |
| S05 | 05C | Generic observations, assertions and canonical evidence | Wrong expectations fail; evidence is deterministic/private/traceable. |
| S05 | 05D | Bounded checkpoint/resume representation | Checkpoint state is bounded/non-secret/external and cannot become product authority. |
| S05 | 05E | Declarative canaries and scenario-cost proof | Two canaries run; second scenario is scenario-only; LOC/change-surface tripwire proven. |
| S05 | 05V | Primary-stage PHX-CI acceptance | PHX-CI complete; guard/metrics within budget; runner/core frozen for scenario-only work. |
| S06 | 06A | Initialization and one-sided synchronization scenarios | Mapped initialization/ordinary-sync scenarios pass with no core changes. |
| S06 | 06B | Merge, conflict and delete-vs-modify scenarios | Conflict/merge preservation semantics mapped and passing. |
| S06 | 06C | Deletion, stale-device, clock-skew and unreadable-path scenarios | Safety/authority scenarios pass with scenario-only changes. |
| S06 | 06D | Move/rename identity and path-collision scenarios | Move identity/collision scenarios pass; no timestamp/path guessing policy introduced. |
| S06 | 06E | Exclusions, unknown files and empty-folder scenarios | Remaining non-fault reconciliation scope scenarios mapped and passing. |
| S06 | 06V | Primary-stage PHX-CI acceptance and coverage reconciliation | PHX-CI complete; scenario size/change-surface rules pass; no missing S06 semantic coverage. |
| S07 | 07A | Crash, commit-order and ambiguous-result scenarios | Recovery/uncertainty scenarios pass without new fault framework. |
| S07 | 07B | State/cursor/listing/root recovery scenarios | State/recovery fail-closed semantics mapped and passing. |
| S07 | 07C | Device authority and cancellation scenarios | Authority/cancellation scenarios pass with frozen core. |
| S07 | 07D | Transfer integrity and retry/backoff scenarios | Transfer/retry scenarios pass deterministically. |
| S07 | 07E | Quota/disk, destructive safety, config and lifecycle deterministic scenarios | Safety/resource/config scenarios mapped and passing. |
| S07 | 07F | Deterministic scale and resource measurement | Required scale cases execute and record bounded measurements; architecture unchanged. |
| S07 | 07V | Primary-stage PHX-CI acceptance and mandatory architecture review | PHX-CI complete; deterministic mappings reconciled; architecture review authorizes or blocks S08. |
| S08 | 08A | Narrow production run-receipt seam | Seam enumerated, <=350 LOC/4 files, no scenario/test authority in production; boundary re-frozen. |
| S08 | 08B | Validation-only Obsidian build/entrypoint | Validation build loads separately; production main.js excludes agent/transport/scenarios. |
| S08 | 08C | Bounded device command agent and sequence safety | Agent executes single commands only; no scenario state machine; original <=750 LOC subset budget was tracked; DEC-349 now sets the current live-device ceiling at 950 for diagnostic upgrades. |
| S08 | 08D | Minimal command mailbox and Windows relay | Transport is run-scoped control metadata, no new OAuth scope/token export/product authority. |
| S08 | 08E | External live executor and human checkpoints | Scenario authority stays external; unavailable OS/provider actions become explicit checkpoints. |
| S08 | 08F | Platform construction closure and production-bundle isolation proof | Automated S08A–E platform-contract checks, architecture guard/metrics, full PHX-CI gates, and production-bundle exclusion pass; no real Obsidian/Drive/vault/product execution occurs. |
| S08 | 08V | Primary-stage PHX-CI acceptance and architecture review | Integrated S08 testing-platform construction passes PHX-CI, frozen architecture/budget checks, production-seam/transport/runner/checkpoint review, and production-bundle isolation; supervisor may then authorize S09 physical validation. |
| S09 | 09A | Windows/iOS install, authentication and pairing baseline | Bound device/build identities recorded; Windows+iOS baseline evidence complete. |
| S09 | 09B | Physical bidirectional synchronization and representative conflict | Cross-device convergence/conflict evidence complete. |
| S09 | 09C | Physical offline/reconnect and interruption/resume | Physical lifecycle/network evidence complete. |
| S09 | 09D | Physical path/platform and resource/large-transfer coverage | Platform/resource evidence complete without inventing automation architecture. |
| S09 | 09E | Physical auth revocation and lifecycle safety | Security/lifecycle physical evidence complete. |
| S09 | 09F | Requirement/evidence traceability closure | Traceability has no material gaps; blockers surfaced; Stage-3 package prepared. |
| S09 | 09V | Final PHX-CI, architecture closure and Stage-3 handoff | PHX-CI complete; all budgets/boundaries pass; Phase 6 evidence complete; Stage 3 ready but not started. |

## 4. Dependency Rule

Default sequencing is serial through `phase6-integration`: accepted child → PHX-CI evidence → supervisor review/integration → repository-ground next child.

Scenario-only batches in S06/S07 MAY be parallelized later only if the supervisor proves non-overlapping writable surfaces and frozen core contracts before dispatch. Parallelism is never inferred merely because task files already exist.

## 5. Dispatch Split Rule

The preplanned decomposition is a ceiling, not a command to keep a task large. If dispatch-time repository inspection shows a child would cross the size gate or touch more than one architecture/contract family, split it again and update this document/index before execution.

## 6. Primary-Stage Gate

No primary stage is complete because all child agents report completion. The stage is complete only after its integrated `V` task passes PHX-CI and the supervisor confirms stage-specific architecture/coverage evidence.

## Dispatch/verification rules retained from the accepted session specification

## How to Use This Document

BVP-S01 through BVP-S09 are **primary Stage-2A work packages**, not assumptions that one coding agent can complete an entire primary stage in one execution turn. The authoritative child-session decomposition is this file. Historical pre-standard task files are non-authoritative migration material; any future durable task prompt belongs only under this workstream's optional `tasks/` directory.

Later child task files are pre-generated only as **PREPLANNED / NOT-YET-EXECUTABLE** scope contracts. In accordance with the governing construction manual, immediately before execution the supervisor MUST inspect the actual accepted repository, bind the exact predecessor SHA, confirm exact types/tests/current paths, set an exact writable-path allowlist, confirm the child still satisfies the session-size gate, and mark that child prompt EXECUTABLE.

Every dispatched child session MUST:

- use a dedicated task branch from the exact supervisor-approved predecessor;
- use no GitHub Actions;
- receive no authority to expand its writable surface or classify extra files;
- push its implementation branch and pass authoritative verification through the installed PHX-CI deployed-runtime operator front door before supervisor integration;
- use `dev/_ca-output.md` for current work-unit evidence where required and `dev/test-results/<runId>/` for immutable historical PHX-CI execution evidence;
- from BVP-S03 onward, pass architecture guard and metrics through the repository check executed by PHX-CI;
- treat `archive/**` as historical/non-authoritative;
- return BLOCKED rather than weakening boundaries, raising budgets, or editing unlisted paths.

Each primary BVP stage also ends with a separate integrated PHX-CI acceptance task before the next primary stage begins.

## Prospective DEC-339 verification unit — design only, not executable

Ground in `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md`. After D339-01 freezes contracts, plan **D339-07** PHX-CI-owned deterministic/fault, negative safety, equivalence and comparable-workload scenarios, integrated with WS-02/03/05 units; **D339-08** is the later integrated PHX-CI + independent review/controlled rollout gate. Do not reactivate S09A–V preplanned prompts, rerun the completed S09A canary, bypass the frozen BVP architecture guard, or add scenario-specific PowerShell verification. Existing physical S09A Windows/iOS acceptance remains open.

## S09 fixed-PHX-CI consumer bridge — two software-only Build Units (Owner direction 2026-10-20)

This prerequisite **does not replace or activate** S09A–S09V. It preserves accepted S09 G1 closeout and existing S08 engine. PHX-CI is a pinned **read-only external tool**: no changes to PHX-CI or to BRAIN `phx-ci.json` / `Taskfile.phx-ci.yml`. Use only PHX-CI's existing focused stage and canonical publication. If its fixed interface cannot support required privacy/continuity/evidence, BLOCKED is mandatory.

| Build Unit | Exact code-writing boundary | Required work and exit gate |
| --- | --- | --- |
| **S09-BR01 — Test-first adapter implementation** | First new requirement-derived tests under `test-platform/test/**` in a separate test-first commit; then exactly one implementation file: `test-platform/test/batteries/phxci-physical-bridge.ts` | Freeze expected interface by authored tests before implementation; preserve expected-RED evidence (only via PHX-CI if run). Then implement bounded evidence stdout transport, original BVP result/checkpoint handling, identity and committed PHX evidence lookup, authorized initial/resume/late-receipt dispatch through existing BVP runner. Preserve deterministic BVP focused coverage. Require PHX-CI PASS for the completed unit, without physical devices. |
| **S09-BR02 — Test hardening and integration qualification** | Additional/revised test files only beneath `test-platform/test/**` | Extend BR01's preserved test-first suite with adversarial ten-family negative/integrity/security/replay/timeout/compatibility coverage; simulated two-invocation PHX-CI proof (original checkpoint BLOCKED, later eligible PASS), full PHX-CI regression and final independent Reviewer acceptance. |

**There is no S09-BR03 or S09-BR04.** PHX-CI verification is required per Build Unit and independent Reviewer acceptance is the final gate, not another Build Unit. If BR02 finds an implementation defect, return a scoped correction to BR01 and rerun qualification; do not allow BR02 to edit production-independent implementation files or invent another work unit. A one-file implementation limitation must be surfaced for Owner decision rather than silently changing additional files.

The detailed durable work-unit contract is `tasks/s09/s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`. Both units remain **PLANNED / NOT-YET-DISPATCHED** until exact predecessor SHAs and writable-path allowlists are rebound. No physical invocation, release, installed-device modification, S09A rerun or Stage 3 authorization follows from either software unit.
