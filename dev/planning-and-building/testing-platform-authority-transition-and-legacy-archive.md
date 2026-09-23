# BRAIN Verification Platform — Authority Transition and Legacy Archive Plan

## 1. Purpose

This document defines the mandatory transition from the superseded internal live-validation harness to the BRAIN Verification Platform (BVP). It executes **after the replacement planning package is accepted and persisted** and **before any new BVP implementation is allowed to begin**.

The transition is intentionally destructive only to **active authority and active legacy implementation**, not to historical evidence. Historical material is preserved beneath `dev/archive/**` and in Git history.

## 2. Required Authority Change

The following legacy architecture decisions are superseded as a set:

- `DEC-301` — internal plugin/runtime harness as primary automation platform;
- `DEC-302` — legacy harness production-path driver framing;
- `DEC-303` — scenario runner/sandbox/fixture manager/driver/assertion/coordinator/fault/verifier/evidence/checkpoint module decomposition;
- `DEC-304` — legacy harness mutation-sandbox framing;
- `DEC-305` — legacy harness plan-assertion execution framing;
- `DEC-306` — legacy harness fault-layer framing;
- `DEC-307` — internal-harness cross-device coordination ownership;
- `DEC-308` — legacy internal-harness checkpoint/resume ownership;
- `DEC-309` — legacy harness evidence ownership/schema framing;
- `DEC-310` — legacy harness-specific mobile participant framing.

The safety intent embedded in those decisions is not discarded. Where still required, it is re-expressed in the BVP target-system specification under the new architecture: production-path fidelity, objective evidence, physical uncertainty preservation, safe disposable fixtures, real platform evidence, and bounded checkpoints remain required without retaining the old runner architecture.

The active decision register must retain the historical supersession record but must not leave `DEC-301`–`DEC-310` appearing as simultaneously locked current architecture.

## 3. Archive Destination and Inertness

All superseded `dev/**` material is moved beneath:

`dev/archive/legacy-validation-harness/`

The archive SHOULD preserve original relative paths beneath that root where practical, for example:

`dev/agents/st2a/ph6/04-lv/01-test/00-vh14-h6a-module-integration-runner.md`

becomes:

`dev/archive/legacy-validation-harness/agents/st2a/ph6/04-lv/01-test/00-vh14-h6a-module-integration-runner.md`

`dev/archive/**` is excluded from normal coding-agent/supervisor grounding searches, current-task discovery, architecture guards, and prompt authority. The archive may be consulted only when a supervisor explicitly asks a historical question.

## 4. Mandatory `dev/**` Archive Scope

### 4.1 Entire Legacy Harness Task/Scenario Tree

Move the complete current tree:

`dev/agents/st2a/ph6/04-lv/01-test/**`

This archive move intentionally includes the old shared protocol, VH implementation/correction prompts, integration prompts, and C/D/E/F scenario documents. The replacement platform will preserve required scenario semantics through the new active BVP requirement/coverage artifacts rather than leaving old harness tasking active.

At planning time this tree contains 82 files in the supplied repository archive.

### 4.2 Legacy Harness Planning Authority

Move:

`dev/planning-and-building/phase6-live-validation-harness-plan.md`

### 4.3 Mixed Active Authority

The current files below mix valid project material with obsolete harness architecture:

- `dev/planning-and-building/decision-register.yaml`
- `dev/planning-and-building/project-state.yaml`

For each:

1. move/copy the complete pre-transition version to the legacy archive;
2. create a clean active replacement at the original path;
3. preserve all still-valid non-harness project authority;
4. explicitly record the supersession of the old harness and adoption of the BVP specification/decomposition;
5. ensure no active field names the legacy harness plan as current authority.

### 4.4 Mixed Supervisor/Handoff Material

Any active handoff/communication file whose current instructions materially depend on the legacy harness architecture must be archived whole and replaced with a clean active version rather than partially edited in place. The supplied archive includes at least:

- `dev/agents/agent-to-agent-communication.md`

The transition session must search for additional mixed files rather than assume this list is complete.

### 4.5 Legacy Harness Evidence Under `dev/**`

Move legacy harness-specific evidence and state records beneath the archive, including files whose names or contents correspond to VH/H0–H11 harness work, scenario-runner state, validation-mode runtime, legacy coordination, fixture/sandbox, plan-assertion, evidence-recorder, convergence-verifier, or legacy cross-device coordinator work.

The supplied archive contains at least 32 obvious files under `dev/evidence/**` matching these families, including `dev/evidence/vh14-orchestration-state.json`. The transition MUST discover by content as well as filename so differently named legacy evidence is not left active accidentally.

Current `dev/_ca-output.md` / `.json` must be assessed. If their canonical content represents the legacy harness workstream, archive those versions and initialize the active evidence file for the BVP transition rather than carrying old harness completion claims forward as current BVP evidence.

### 4.6 Additional Discovery Rule

The archive operation MUST search all active `dev/**` (excluding existing `dev/archive/**`) for obsolete harness concepts, including at minimum:

- `phase6-live-validation-harness`;
- `ValidationScenarioRunner` / `scenario runner` when referring to the superseded system;
- `validation-mode-runtime`;
- `cross-device coordinator`;
- `fixture manager` as a legacy module;
- `plan assertion engine` as a legacy module;
- `scenario evidence recorder`;
- `state convergence verifier` as a legacy module;
- `human checkpoint/resume controller` as a legacy module;
- H0–H11 legacy harness decomposition;
- VH01–VH44 legacy tasking;
- active links into the archived `01-test` task tree.

Every match must be classified as one of:

1. archive/move;
2. valid non-legacy content to preserve in a clean replacement;
3. historical reference intentionally retained in active authority solely to document supersession.

There must be **zero unclassified matches** before the transition passes.

## 5. New Active Planning Locations

Persist the accepted replacement planning package under active planning authority, using repository names chosen by the supervisor. Recommended paths:

- `dev/planning-and-building/testing-platform-target-system-specification.md`
- `dev/planning-and-building/testing-platform-build-decomposition.md`
- `dev/planning-and-building/testing-platform-requirement-coverage.md`
- `dev/planning-and-building/testing-platform-build-session-specifications.md`
- `dev/governance/testing-platform-boundary.yaml`

The active `project-state.yaml` must identify these as the current Phase-6 testing-platform authority and explicitly identify `dev/archive/**` as historical/non-authoritative.

## 6. Legacy Implementation Retirement Outside `dev/**`

The documentation archive is the first environment-preparation stage. A subsequent bounded session removes the old executable architecture:

- `src/validation/**` legacy framework/scenarios;
- legacy validation-specific production imports and runtime construction in `src/main.ts`;
- legacy harness controls in the production settings surface;
- obsolete validation-specific tests that test only the superseded framework;
- obsolete build/config references used only by that framework.

General production diagnostics, production synchronization behavior, production tests, and reusable contracts MUST NOT be removed merely because legacy validation code consumed them.

Source history does not need a duplicate source-code archive under `dev/archive/**`; Git history already preserves removed implementation. Only documents/evidence whose historical review value depends on remaining accessible under `dev/**` require the explicit archive move.

## 7. Transition Acceptance Gate

The environment is ready for new BVP implementation only when:

1. replacement planning documents are active;
2. old harness decisions are formally superseded;
3. the entire old `dev/agents/st2a/ph6/04-lv/01-test/**` tree is under `dev/archive/**`;
4. the old harness plan is archived;
5. mixed authority files have clean replacements;
6. harness-specific evidence/state under `dev/**` is archived;
7. a repository search finds no active unclassified old-harness authority/tasking references;
8. `dev/archive/**` is explicitly excluded from normal task discovery/grounding;
9. the transition manifest records every moved/replaced file;
10. local PowerShell verification records the result in the new active `dev/_ca-output.md`.

No replacement BVP implementation begins before this gate passes.