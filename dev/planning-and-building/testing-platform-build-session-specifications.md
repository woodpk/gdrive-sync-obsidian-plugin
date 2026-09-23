# BRAIN Verification Platform — Stage-2A Build-Session Specifications

## 1. How to Use This Document

BVP-S01 through BVP-S09 are **primary Stage-2A work packages**, not assumptions that one coding agent can complete an entire primary stage in one execution turn. The authoritative child-session decomposition is `dev/planning-and-building/testing-platform-session-decomposition.md`, with task files under `dev/agents/st2a/ph6/05-bvp/**`.

Later child task files are pre-generated only as **PREPLANNED / NOT-YET-EXECUTABLE** scope contracts. In accordance with the governing construction manual, immediately before execution the supervisor MUST inspect the actual accepted repository, bind the exact predecessor SHA, confirm exact types/tests/current paths, set an exact writable-path allowlist, confirm the child still satisfies the session-size gate, and mark that child prompt EXECUTABLE.

Every dispatched child session MUST:

- use a dedicated task branch from the exact supervisor-approved predecessor;
- use no GitHub Actions;
- receive no authority to expand its writable surface or classify extra files;
- push its implementation branch and pass authoritative verification through the installed PHX-CI deployed-runtime operator front door before supervisor integration;
- use PHX-CI canonical evidence in `dev/_ca-output.md`, `dev/_ca-output.json`, and `dev/test-results/`;
- from BVP-S03 onward, pass architecture guard and metrics through the repository check executed by PHX-CI;
- treat `dev/archive/**` as historical/non-authoritative;
- return BLOCKED rather than weakening boundaries, raising budgets, or editing unlisted paths.

Each primary BVP stage also ends with a separate integrated PHX-CI acceptance task before the next primary stage begins.

## BVP-S01 — Authority Transition and Complete Legacy `dev/**` Archive

### Objective

Make the replacement BVP planning package the active testing-platform authority and move all superseded legacy-harness `dev/**` material into `dev/archive/legacy-validation-harness/**` before new platform implementation.

### Required End State

- BVP planning artifacts are persisted in active planning/governance paths;
- `DEC-301`–`DEC-310` are superseded in the active decision register with historical traceability retained;
- active project state names the BVP, not the old harness, as current testing-platform authority;
- entire `dev/agents/st2a/ph6/04-lv/01-test/**` tree is archived;
- old harness plan is archived;
- harness-specific evidence/state under `dev/**` is archived;
- mixed handoff/authority files are archived and clean replacements created;
- a generated archive manifest records every moved/replaced path and reason;
- repository search has zero unclassified active legacy-harness references.

### Fixed Boundaries

Do not alter product source or tests in this session. Do not reinterpret archived material as active authority. Do not delete historical evidence merely to make searches pass.

### Verification

Historical note: S01 was completed before DEC-323 and used its committed S01 verifier. Future child/stage acceptance uses PHX-CI.

### Stop

Stop after the authority/archive acceptance gate passes. Do not begin source-code retirement.

---

## BVP-S02 — Remove Legacy Executable Harness and Production Coupling

### Objective

Remove the exact supervisor-classified legacy validation framework, harness-only tests, and harness-only production coupling while preserving every non-authorized production/test surface unchanged.

### Repository Surfaces Known at Planning Time

The supplied repository snapshot contains:

- `src/validation/**` legacy framework/scenarios;
- `src/main.ts` imports/construction of `ValidationModeRuntime`;
- `src/product/settings-tab.ts` production validation-harness controls;
- numerous `test/validation-*.test.ts` tests whose subject is the legacy framework;
- the H6C-only production diagnostic-correlation seam later supervisor-classified for deletion.

The executable child prompts contain the supervisor-decided exact delete/retain boundaries. `src/testing/fakes.ts` and every unlisted path are frozen for S02 unless a later supervisor explicitly rebinds the task before dispatch.

### Required End State

- `src/validation/**` legacy architecture is no longer part of active source;
- shipping plugin has no validation-mode scenario UI/runtime;
- obsolete framework-only tests are removed from active suite;
- all non-authorized production/test paths remain unchanged;
- no replacement framework is built yet;
- ordinary production build behavior remains unchanged except the exact supervisor-defined harness retirement edits.

### Fixed Boundaries

No synchronization redesign. No new runner. No new production test bypass. No test-platform implementation. No compile/test-fallout repair outside the exact child-session writable allowlist: any such need is BLOCKED and returns to the supervisor.

### Verification

Child-session and integrated S02 acceptance use PHX-CI. The S02 child prompts define the exact retirement surfaces; PHX-CI runs typecheck, full tests, build, repository checks, artifact verification, and evidence.

### Stop

Stop when the product builds/tests without the legacy harness.

---

## BVP-S03 — Install Hard Architecture Boundary, Guard, Metrics, and PHX-CI Enforcement

### Objective

Create the enforcement layer that makes future drift mechanically fail before substantive platform implementation begins.

### Required End State

- `test-platform/**` root skeleton exists outside `src/**`;
- machine-readable boundary is active;
- architecture guard exists and is independently tested;
- architecture metrics script exists and enforces hard budgets;
- PHX-CI is wired as the canonical branch/stage verifier;
- production build excludes `test-platform/**`;
- normal work cannot modify frozen governance surfaces without explicit authorization;
- no scenario-specific PowerShell verifier exists.

### Required Negative Tests

Demonstrate guard failure for prohibited import direction, shipping inclusion, scenario code in production, unapproved production seam, per-scenario PowerShell, archive authority dependency, and budget overrun.

### Fixed Boundaries

This is an authorized governance-construction stage. Once accepted, the boundary, guard, metrics, and PHX-CI consumer integration become frozen supervisor-owned surfaces for ordinary sessions.

### Verification

Run the guard against both compliant baseline and controlled negative fixtures, wire guard/metrics into the repository check exercised by PHX-CI, then pass authoritative PHX-CI branch/stage acceptance with metrics and evidence.

### Stop

Stop after the guard is proven effective. Do not implement the simulator in this session.

---

## BVP-S04 — Deterministic Multi-Device Virtual World

### Objective

Build stateful in-memory external boundaries that let real production synchronization logic execute deterministically for multiple logical devices.

### Required End State

- in-memory local-vault model;
- in-memory Google Drive model with stable IDs/revisions/moves/trash/listing/change-feed/completeness/ambiguity;
- per-device durable state/identity/cursor/tombstone support;
- deterministic time/order/fault controls;
- runtime reconstruction over retained state/reality;
- small world-builder/test API;
- production planner/executor/state code proven to run against these adapters.

### Fixed Boundaries

The virtual world may model external behavior; it may not decide synchronization policy. Do not add scenario runner/persistence/live transport. Do not change frozen governance surfaces.

### Verification

At minimum prove production-path create/upload/download, two-device independence, remote-ID-preserving move, partial-listing safety, ambiguous outcome, cursor/state fault controls, and restart/reconstruction. Run architecture guard/metrics and record delta.

### Stop

Stop with a tested virtual-world foundation, not a scenario framework.

---

## BVP-S05 — Declarative Scenario Model, External Runner, Assertions, and Evidence

### Objective

Create one small external runner and one typed declarative scenario model over S04.

### Required End State

- small typed step vocabulary;
- one external deterministic runner;
- generic fixture mutations;
- generic observations/assertions;
- canonical machine/human scenario evidence;
- target requirement/invariant metadata;
- bounded external checkpoint representation;
- at least one clean-merge/conflict-style canary expressed declaratively;
- adding a second ordinary canary requires no core change.

### Fixed Boundaries

No module router/plugin system. No durable distributed state machine. No scenario classes that reimplement the runner. No production changes except an explicitly pre-authorized seam if the supervisor proves it is already required; default is zero production changes.

### Verification

Deliberately incorrect expectations must fail. Scenario hard-LOC and allowed-change-surface rules must be exercised. Guard/metrics evidence required.

### Stop

Stop after the declarative model is proven extensible through data, not new framework architecture.

---

## BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage

### Objective

Encode the high-value synchronization semantics as declarative scenarios without changing platform core unless a genuinely missing generic primitive is first surfaced to the supervisor.

### Required Coverage

At minimum map and execute target requirements for:

- fresh local/remote/equal/divergent initialization;
- ordinary local/remote modifications;
- clean text merge;
- true text conflict;
- binary conflict;
- delete-vs-modify both directions;
- ordinary local/remote deletion and both-deleted state;
- no-base absence safety;
- unreadable local path safety;
- clock-skew non-authority;
- stale-device resurrection/destruction prevention;
- identity-preserving moves and ambiguous move blocking;
- path/case/Unicode collision behavior;
- exclusions/unknown files/empty folders.

### Fixed Boundaries

Normal writable surface is scenario/fixture/test content only. If core or production changes are required, STOP and return the exact missing generic capability to the supervisor; do not change core within this session.

### Verification

All scenarios execute; each maps to target requirement IDs; each ordinary scenario remains under the hard size limit; architecture core metrics should remain effectively stable relative to S05.

### Stop

Stop after semantic coverage is complete and evidence recorded.

---

## BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage

### Objective

Encode the remaining non-physical Phase-6 evidence categories using the same frozen runner/world.

### Required Coverage

At minimum:

- crash before/during/after mutation and state commit;
- ambiguous remote result;
- corrupt/truncated/incompatible state;
- lost cursor;
- partial remote listing;
- remote-root loss/recovery signaling;
- clone/restore/stale device authority;
- safe cancellation;
- transfer integrity and file-changing-during-transfer;
- retry/backoff/rate-limit classification;
- modeled quota/local-disk failures;
- destructive circuit breaker and recovery checkpoint;
- configuration/scope/lifecycle invariants that do not intrinsically require installed-runtime evidence;
- large-file/large-vault deterministic scale behavior measurable in the host environment.

### Fixed Boundaries

Same scenario-only default change surface as S06. No new runner, persistence subsystem, fault framework, or evidence family without prior architecture approval.

### Verification

Target §13.2–§13.5 deterministic mappings must have no material unassigned item. Architecture/core delta is reviewed before P5 begins.

### Stop

Stop for mandatory supervisor architecture review before live-device implementation.

---

## BVP-S08 — Thin Live-Device Agent, Production Run Receipt, and Command Transport

### Objective

Add the minimum validation-only in-Obsidian capability needed for real Windows/iOS execution while keeping scenario authority external.

### Required End State

- separate validation artifact/entrypoint under `test-platform/**`;
- thin device command agent with bounded command vocabulary;
- run/device/sequence duplicate/staleness protection;
- external runner live executor;
- minimal Drive-backed command mailbox/desktop relay or equivalently simple no-backend transport selected from actual repository constraints;
- narrow production-owned terminal run receipt/equivalent observation if needed, within 350 LOC/4-file production-seam budget;
- ordinary production bundle contains none of the validation-only device agent/transport/UI;
- live-agent subset remains ≤750 logical TypeScript LOC.

### Fixed Boundaries

No scenario engine on device. No device-local distributed suite state. No new OAuth scope. No token export to host. No developer-hosted backend. Any required production seam must be enumerated in the boundary allowlist by this explicitly authorized seam-change session and then re-frozen.

### Verification

Desktop validation build can execute bounded commands through production; stale/duplicate commands fail; production build remains clean; transport records cannot be interpreted as vault content/sync authority; architecture guard and budgets pass.

### Stop

Stop before migrating full physical scenario coverage.

---

## BVP-S09 — Strategic Physical Coverage, Final Integration, and Stage-3 Traceability Closure

### Objective

Use the S08 live executor only for product behavior that genuinely requires real Windows/iOS/provider evidence, then close Phase-6 evidence and architecture conformance.

### Required Physical Coverage

At minimum satisfy the BRAIN target specification's real-platform obligations for:

- Windows and iPhone/iOS plugin loading/build compatibility;
- same-device authentication and pairing;
- upload and download in both relevant directions;
- representative concurrent conflict handling;
- offline/reconnect behavior;
- actual app interruption/termination and resume;
- UI-critical status/preview/execution behavior;
- representative path/platform differences;
- representative large transfer/resource behavior on mobile;
- real auth revocation/restoration where required;
- disable/uninstall/reinstall/device unlink non-destructive behavior.

Use explicit human checkpoints where an OS/provider action cannot be safely automated.

### Final Closure

- reconcile deterministic + live evidence to every material target requirement;
- run complete canonical local PowerShell verification;
- record final architecture metrics/deltas;
- prove production bundle exclusion and budget compliance;
- prove no active legacy harness authority remains outside `dev/archive/**`;
- update `dev/_ca-output.md` with complete final construction evidence;
- prepare Stage-3 handoff without performing Stage 3 itself.

### Fixed Boundaries

Do not add architecture merely to eliminate a bounded human checkpoint. Do not reintroduce one-live-scenario-per-historical-ID as a requirement unless the product target actually needs distinct physical evidence.

### Stop

Stop when Phase-6 construction evidence is complete and the repository is ready for independent Stage 3.