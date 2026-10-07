# Current Engineering Handoff

## Current state

The completed automated testing platform remains anchored to exact green source SHA `5b57c1ded6d314810ac2cca2a363342e67d9bee3` with accepted full fresh PHX-CI run `38b52d07-dce9-4e2f-aa61-3fd7188703f7`.

The repository is in the separate canonical `dev/**` standardization migration. Product behavior and BVP architecture are not being reopened.

## Completed standardization phases

1. Phase 1 — complete inventory/disposition of all original `dev/**` files.
2. Phase 2 — canonical directory skeleton and READMEs.
3. Phase 3 — canonical authority hierarchy.
4. Phase 4 — canonical target-system/workstream/verification planning hierarchy.
5. Phase 5 — canonical current state and concise handoff.
6. Phase 6 — retired the legacy agent/prompt hierarchies from active `dev/`; archived their original green-source blobs under `archive/pre-standard-dev-layout-2026-10/DEV/`; retained only seven future S09 contracts under the canonical WS-07 `tasks/s09/` directory.

## Current authority and continuity

- Decisions: `dev/authority/decision-register.yaml`
- Target system: `dev/planning/01-target-system/target-system-specification.md`
- Workstream decomposition: `dev/planning/02-workstreams/00-INDEX.md`
- BVP subsystem: `dev/planning/01-target-system/bvp-subsystem-specification.md`
- BVP governance lock: `dev/authority/governance/locks/testing-platform-boundary.yaml`
- Current continuity state: `dev/state/current-state.yaml`

The retained S09 task contracts are `PREPLANNED / NOT-YET-EXECUTABLE`. They must be repository-grounded and rebound immediately before dispatch.

## Immediate next action

Execute standardization Phase 7: reorganize the 105 legacy PHX-CI run triples into exact `dev/Test-Results/<runId>/` directories and retire lowercase `dev/test-results/` plus redundant `dev/_ca-output.json`.

Do not begin S09 or Stage 3 as part of this migration. Final comprehensive PHX-CI verification remains reserved for the completed repository-wide standardization.
