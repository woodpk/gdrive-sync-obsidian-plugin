# Pre-DEC-339 Platform Baseline — Option A Integration Assessment

**Date:** 2026-10-12  
**Branch:** `integration/pre-dec339-platform-baseline-20261012`  
**Status:** `STAGED / PHX-CI AND INDEPENDENT REVIEW PENDING`

## Decision and boundaries

The owner selected **Option A**: assess and integrate the prerequisite platform as an independently accepted change, and **only afterwards** consider the separately verified DEC-339 feature. This is not unconditional permission to merge a large unreviewed history. No production feature activation, live Drive/vault changes, release, plugin installation, or Stage 3.

## Exact source and lineage

- Current `master` when grounded: `caf4a03418b89b57893e3bd5d4c6f89c28604242`.
- Last pre-DEC-339 candidate source: `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`.
- Common ancestor with `master`: `7b4297adceb2fd6268a5801a207b7dce1f7b7728`.
- Master-exclusive: **26** governance commits, covering the owner-locked `AGENTS.md` and retired `dev/agents/**` prompts.
- Pre-feature candidate-exclusive: **1,612** commits. Against `master`, recursive tree comparison reports **1,171 added paths, 450 deleted paths, 33 changed shared paths**, and 183 identical blobs.
- This branch starts with a **two-parent synthetic reconciliation merge** `9b0a911079b3ff688028681505f91cdf43c431f9` (first parent `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`, second `caf4a03418b89b57893e3bd5d4c6f89c28604242`) whose **tree is byte-identical to the pre-DEC-339 source**: `44776b0f2f92e25f296151f3874fbd13dd6cb16b`. This approach retains historical reachability without reactivating obsolete task prompts and makes no product-code edits.

## Platform contents and risk boundaries

The prerequisite body includes a move from in-production validation tooling to separate `test-platform/**` (147 added test-platform files), retired 21 legacy `src/validation/**` files, four added production modules (diagnostics request attribution; three controlled product validation seams), changes to 16 other production files, and changed `package.json`, `package-lock.json`, `phx-ci.json`, `Taskfile.phx-ci.yml`, `AGENTS.md`, historical test suites, and a standardization of `dev/**` including 528 files relocated/retained under `archive/**`.

The exact governing PHX-CI pin at baseline: framework `0.2.0-dev.2`, `69c4aa077d4a1a46d1e85e59f39d36285be99e83` (from `phx-ci.json`). BVP architecture lock: `dev/authority/governance/locks/testing-platform-boundary.yaml` (not changed in staging).

**Owner-locked governance reconciliation:** `AGENTS.md` is not byte-identical to `master`. The pre-feature version redirects the fresh-protocol gate from live `dev/agents/**` into canonical `dev/planning/02-workstreams/**/tasks/**` and explicitly voids instructions in the historical archive; the master version voids the original legacy task prompts. Both prohibit bespoke PHX-CI replacement scripts and prohibit weakening without owner permission. **Semantic preservation is the intended resolution**, but independent review must explicitly approve this owner-locked surface and archival handling before promotion; ancestry alone is not enough.

## Existing verification and evidence caveat

At the pre-feature source `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`, `dev/_ca-output.md` is a historical `STATUS: BLOCKED` output from PHX-CI run `0305ae37-f999-4938-b3ef-50cee012f4ae`, which verified an **earlier source** `bd743b9a5791bcb81b57540272866a06c23ed43f` and failed a **live S09A focused battery**, while the repository suite passed. **It is neither a baseline-integrity PASS nor proof of an uncorrected baseline defect.** Subsequent S09A physical evidence exists but has separate scope. Do not rerun a physical canary merely for administrative baseline promotion.

## Required acceptance gates, in order

1. **Fresh PHX-CI verification against the isolated candidate**: exact source SHA, `-BaseRef 32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`, existing project-owned BVP focused test command (no ad hoc validation framework), full repository tests, standard artifact checks, publication mode `push`. Pin framework exact as above and inspect published run-ID, stage results, artifact SHA and unchanged control checkout.
2. **Administrative evidence closure**: retain PHX-CI-published original result JSON/Markdown/terminal bytes; arrange canonical per-run evidence directory by exact blob reuse if publisher uses timestamped flat paths; never rerun full tests solely for evidence path issues.
3. **Independent adversarial platform assessment**: inspect the non-DEC-339 1,612-commit body as platform modernization, especially BVP boundary, full `dev/**` and archive governance, PHX-CI identity/config/scripts, production diagnostics and validation seams, loss of legacy `src/validation/**`, shipping build and artifact guard, test/evidence traceability, and master-only AGENTS semantics. Review may produce corrections on this branch, then require new PHX-CI and independent reassessment.
4. **Promotion decision**: only after green candidate PHX-CI and independent acceptance, prepare an explicit `master` promotion gate checked against the exact contemporary master SHA, no force updates; verify results and source ancestry. **Do not automatically merge**.
5. **Separate DEC-339 change**: after accepting baseline on master, promote feature delta from `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b` to `dadd62e93ba1c97cfc89ddf9fe604e3d5dc9c902`, with preserved original evidence/review, separate PHX-CI, approval gates, no shipping inventory cutover.

## Current state, restrictions, and next action

**Current:** isolated platform candidate staged; no new baseline PHX-CI run yet; independent platform review not yet complete; master unchanged. The previously verified DEC-339 isolated integration remains on separate branch `integration/dec339-postreview-master-reconcile-20261012` and is not the platform candidate.

**Next:** invoke the pinned, deployed PHX-CI operator on the exact platform candidate HEAD through a disposable source clone, using project-controlled `npm run test:bvp-root` as focused command; publish result on this isolated branch. Require owner-operated execution and return complete terminal output. No custom validation script, no GitHub Actions, no non-PHX-CI repository tests or build.
