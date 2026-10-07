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
9. Phase 9 — retired `dev/archive/`, `dev/evidence/`, `dev/governance/`, and `dev/planning-and-building/`; verified exact external-archive preservation for all 366 retired source blobs; removed remaining live retired-script/path exceptions; and completed the active-reference sweep without compatibility aliases.
10. Phase 10 — implementation preparation is complete: canonical `dev/` structure enforcement now executes inside the PHX-CI repository check; negative coverage rejects noncanonical top-level `dev/` entries; canonical `Invoke-PHXCI-*` operator scripts are classified as permitted operational tooling rather than validation authority; and PHX-CI-consumed tests prove repository standardization did not alter shipping/product build inputs or committed `main.js` bytes. Authoritative deployed-runtime PHX-CI execution remains pending.

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

## Phase 9 verification boundary

- Authoritative Phase-9 branch: `dev-directory-standardization-phase9-r2`, based directly on completed Phase-8 head `2d18de7b9828fc1a6bc205a614330d10b6ea8497`.
- The earlier out-of-sequence `dev-directory-standardization-phase9` branch remains historical and is not the authoritative continuation.
- Retired top-level legacy-tree source blobs checked: **366**.
- Exact archived blob matches: **366**.
- Missing archived source blobs: **0**.
- No compatibility aliases were created.
- Critical active authority/config/build/PHX-CI/BVP surfaces have no stale live bindings to the retired paths or Phase-8 validator/helper scripts.
- No authoritative PHX-CI acceptance run is claimed for Phase 9.

## Phase 10 execution boundary

- Source branch: `dev-directory-standardization-phase10`.
- Verification base: `dev-directory-standardization-phase9-r2`.
- PHX-CI runtime pin: `69c4aa077d4a1a46d1e85e59f39d36285be99e83`.
- The owner-facing action must be a small direct invocation of the deployed PHX-CI operator front door.
- `-PublicationMode push` is required so PHX-CI itself publishes canonical evidence back to the branch.
- The owner returns only the complete console output; the engineering agent retrieves and inspects repository-published evidence directly.
- No Phase-10 PASS or migration closure is claimed until the authoritative PHX-CI run is green and its canonical evidence has been inspected.

## Immediate next action

Run the audited small deployed-runtime PHX-CI operator command against `dev-directory-standardization-phase10`, using `origin/dev-directory-standardization-phase9-r2` as the explicit base and publication mode `push`. Return the complete console output only.

Do not begin S09 or Stage 3 until Phase 10 closes green.
