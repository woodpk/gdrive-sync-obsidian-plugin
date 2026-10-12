# Current Engineering Handoff — Platform Baseline Promotion (2026-10-12)

## Immediate current task

Owner chose **Option A**: independently validate and review the platform version that directly preceded DEC-339 before promoting DEC-339 as a separate feature. Branch `integration/pre-dec339-platform-baseline-20261012` contains the exact pre-feature product/platform tree and the `master` governance history as a second parent; merging to `master` is **not approved at this stage**.

- Pre-feature source: `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`; staged two-parent commit: `9b0a911079b3ff688028681505f91cdf43c431f9`.
- Master was `caf4a03418b89b57893e3bd5d4c6f89c28604242` at staging.
- Pre-feature-only commits: **1,612**. Master-exclusive governance commits: **26**.
- Frozen `AGENTS.md` wording differs as paths were standardized: independent owner-locked governance review required.
- Historical pre-feature `dev/_ca-output.md` is `BLOCKED` for earlier S09A live-focused run, **not** a baseline acceptance verdict; new PHX-CI run is mandatory.
- PHX-CI operator runtime: `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, version `0.2.0-dev.2`.
- No live Drive/vault activity, install, release, Stage 3, master push, or DEC-339 activation.

**Exact tasking:** `dev/authority/reconciliations/pre-dec339-platform-baseline-integration-2026-10-12.md`, *Required acceptance gates*. Immediate owner operation is the pinned PHX-CI verification of the branch with `npm run test:bvp-root` as the existing focused suite, `-BaseRef 32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`, and publication `push`. After PASS, inspect evidence and commission the independent platform review.

---

## Historical 2026-10-07 standardization handoff (preserved; not current authority)

# Current Engineering Handoff

## Current state

The completed automated testing platform remains historically anchored to exact green source SHA `5b57c1ded6d314810ac2cca2a363342e67d9bee3`. The formerly recorded PHX-CI run ID `38b52d07-dce9-4e2f-aa61-3fd7188703f7` is not present among the 105 canonical `dev/test-results/` run directories after migration, so canonical state no longer asserts that missing run ID; Phase 10 will establish a new authoritative source/run/evidence identity.

The repository is in the separate canonical `dev/**` standardization migration. Product behavior and BVP architecture are not being reopened.

## Completed standardization phases

1. Phase 1 — complete inventory/disposition of all original `dev/**` files.
2. Phase 2 — canonical directory skeleton and READMEs.
3. Phase 3 — canonical authority hierarchy.
4. Phase 4 — canonical target-system/workstream/verification planning hierarchy.
5. Phase 5 — canonical current state and concise handoff.
6. Phase 6 — retired legacy agent/prompt hierarchies and retained only future S09 task contracts under WS-07.
7. Phase 7 — historically moved all 105 PHX-CI run triples into `dev/Test-Results/<runId>/`, retiring the then-existing lowercase directory; preserved their Git blobs unchanged; removed redundant `dev/_ca-output.json`; and rebound PHX-CI history to `dev/test-results`.
8. Phase 8 — archived all five legacy `dev/scripts/*.ps1` files under `archive/pre-standard-dev-layout-2026-10/DEV/scripts/` with unchanged Git blobs; moved BVP architecture guard/metrics implementation into `test-platform/src/architecture-governance.ts`; rebound `test-platform/src/repository-check.ts` and the guard/metrics/integration tests to that PHX-CI-consumed TypeScript surface; and updated the BVP governance lock/specification to prohibit standalone PowerShell validation authority.
9. Phase 9 — retired `dev/archive/`, `dev/evidence/`, `dev/governance/`, and `dev/planning-and-building/`; verified exact external-archive preservation for all 366 retired source blobs; removed remaining live retired-script/path exceptions; and completed the active-reference sweep without compatibility aliases.
10. Phase 10 — implementation preparation is complete: canonical `dev/` structure enforcement now executes inside the PHX-CI repository check; negative coverage rejects noncanonical top-level `dev/` entries; and the repository check now validates the post-build `main.js` SHA-256 against the accepted pre-migration artifact, with a negative regression for mismatch. No new repository PowerShell launcher was added; the owner boundary uses the deployed PHX-CI operator front door directly. Authoritative deployed-runtime PHX-CI execution remains pending.

## Evidence model

- Current work-unit surface: `dev/_ca-output.md`
- Historical PHX-CI runs: `dev/test-results/<runId>/result.md`, `result.json`, and `terminal.log`
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

**2026-10-08 lowercase normalization:** The active BVP branch has restored `dev/test-results/` as the current evidence path under the updated shared manuals and explicit owner decision. All historical evidence blobs were preserved; the Phase 7 account above records the earlier migration rather than current casing authority.


## Focused-test failure and bounded repair — 2026-10-12

- PHX-CI source `e554e49098ac86a446f9665a782aa8c8087237f9`: `BLOCKED` (test-focused **384/388 PASS**, **4 FAIL**; full repository **850/850 PASS**). Run `ceedd28f-408b-47c6-bea1-ac57a4599f63`, published evidence commit `bce853340cdccc1695e857b51ca08d86890341b0`. Remaining build/repository-check/artifact stages did not execute; they are not accepted.
- Verified four focused failures in the original terminal evidence: stale script-count expectation 2 versus 3 allowed scripts; missing pre-existing `s09a-request-attribution` from two live-battery expected lists; omission of pre-existing `s09a-attribution-live-guard.test.js` from deterministic battery registry.
- Smallest owned correction: three test/BVP registry files only, repair commit `2bf6e97f75c6dddd714cdeaadfb9c756a39bbae3`. No product source, frozen architecture limit or PHX-CI configuration changed. **No PASS is claimed for the repaired source yet.**
- Original failed-run evidence was copied byte-for-byte to `dev/test-results/ceedd28f-408b-47c6-bea1-ac57a4599f63/`; originals remain. Administrative evidence reorganization did not rerun tests.
- Next: PHX-CI exact corrected candidate, focused `npm run test:bvp-root` and full repository suite, base `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`, publication `push`; then independent platform assessment. Master remains untouched.
