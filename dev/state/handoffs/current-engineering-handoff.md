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
6. Phase 6 — retired legacy agent/prompt hierarchies and retained only future S09 task contracts under WS-07.
7. Phase 7 — moved all 105 historical PHX-CI run triples, without rewriting their Git blobs, into exact `dev/Test-Results/<runId>/` directories; retired lowercase `dev/test-results/`; removed redundant `dev/_ca-output.json`; and rebound PHX-CI history to `dev/Test-Results`.
8. Phase 8 — archived all five legacy `dev/scripts/*.ps1` files under `archive/pre-standard-dev-layout-2026-10/DEV/scripts/` with unchanged Git blobs; moved BVP architecture guard/metrics implementation into `test-platform/src/architecture-governance.ts`; rebound `test-platform/src/repository-check.ts` and the guard/metrics/integration tests to that PHX-CI-consumed TypeScript surface; and updated the BVP governance lock/specification to prohibit standalone PowerShell validation authority.

## Evidence model

- Current work-unit surface: `dev/_ca-output.md`
- Historical PHX-CI runs: `dev/Test-Results/<runId>/result.md`, `result.json`, and `terminal.log`
- Historical run count migrated in Phase 7: **105**
- Historical evidence blobs rewritten during migration: **0**
- The removed root `dev/_ca-output.json` was byte-identical to the canonical S08V result JSON for run `cf16c8cc-179d-4fb9-8ca4-96aaad0bb742`.

## Phase 8 verification boundary

- GitHub comparison recognizes the five retired active PowerShell files as zero-content-change renames into the external archive.
- No authoritative PHX-CI run was executed or claimed for Phase 8.
- The last accepted substantive software verification remains the previously accepted green source/run recorded in canonical state.
- Comprehensive migration verification remains reserved for Phase 10, after Phase 9 finishes the atomic path-reference sweep.

## Immediate next action

Execute standardization Phase 9: update every path-bound reference atomically. Sweep active authority, target/workstream planning, state, BVP governance/tests/metrics/repository-check, PHX-CI configuration, Taskfiles, AGENTS documentation, and code for references to retired `dev/governance`, lowercase `dev/test-results`, `dev/archive`, `dev/agents`, `dev/planning-and-building`, the retired PowerShell validators, and other obsolete paths. Do not create compatibility aliases.

Do not begin S09 or Stage 3 as part of this migration. Phase 10 remains the final comprehensive PHX-CI verification gate.
