# DEC-339 Step 6 / BU-01 — Independent blind-first review assignment

**Date:** 2026-11-24
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Feature:** WS-05 / DEC-339 Step 6 / BU-01 — paired planning and verified metadata continuity
**Branch:** `build/dec339-step6-metadata-bvp-20261124`
**Frozen source SHA:** `c6dac8033567cb617f598b2340c5ee61ccb9dd9e`
**Frozen source tree:** `eb725a2c17c00449b3213d72047b8e25bda6ff50`
**Incoming handoff-count:** 1
**Role:** Independent Reviewer, read-only. No Builder work.

## Phase 1 — blind production-source review

Before examining Builder-authored tests, correction reports, F03 technical-design narrative, benchmark measurements, PHX-CI evidence, or previous run outcomes:

1. Read `AGENTS.md`, the target system specification, normative DEC-339 Step 6 requirements, and the DEC-339 / DEC-364 / DEC-365 decisions (requirements only; defer Builder-authored outcome notes). Follow repository restrictions, especially the ban on GitHub Actions.
2. Inspect the immutable frozen implementation source and its production callers/consumers independently. Determine the actual production diff and trace authorization, provider, state, planner, snapshot and executor paths. Do not inspect Builder tests yet.
3. Independently judge correctness of account/grant/namespace/scope/corpus identity; complete paginated Changes replay, removal and changed-ID processing; root/domain and affected-namespace proof; trusted baseline and atomic learned-batch/cursor CAS; concurrent drift and horizon checks; restart, rollback and nonmigration; strict fail-closed incomplete/missing/denied/cross-scope proof; explicit/periodic full reconciliation; local and BASE semantics; stable IDs, mutation authority and unchanged independent executor safeguards.
4. Assess whether eligible ordinary unchanged and changed-file paths avoid root-wide provider census without losing necessary safety. Identify unsupported provider visibility assumptions and limits of the scoped Changes contract. Source reasoning only; do not consult benchmarks.
5. **Freeze and publish an independent blind source assessment under `dev/reviews/` before Phase 2.** Report all material findings without tuning them to Builder tests.

## Phase 2 — tests, PHX-CI evidence, final verdict

Only after Phase 1 is published:

1. Read F03 technical design, readiness and earlier attempts; inspect Builder-authored native/BVP tests, discovery, strict oracles, and ten test families: nominal, negative, transitions, retry/recovery, races, persistence, security, contract integration, architecture, and fail-closed end-to-end.
2. Verify original exact-source PHX-CI evidence: source `c6dac8033567cb617f598b2340c5ee61ccb9dd9e`, tree `eb725a2c17c00449b3213d72047b8e25bda6ff50`, pinned runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, run `284f768b-9b6d-40bc-b99a-619c66e39f9f`, evidence-only commit `257fed676f44371ef6fc88b5c0c510d8a024a6ad`, and original `dev/test-results/284f768b-9b6d-40bc-b99a-619c66e39f9f/{result.json,result.md,terminal.log}`. Check source/evidence parent and that only evidence files changed. Check focused 638/638, native full 1403/1403, no skips, all 13 stages, typecheck, build, artifact, repository and overall PASS with operator exit 0.
3. Independently evaluate synthetic request counts and provider-response bytes against same-world legacy, scaling and non-continuity setup/refresh/full costs. Do not treat provider payload bytes as wire-byte or live-provider proof. Verify no normal eligible marked census and no weakened safety oracle.
4. Confirm original failed runs remain immutable history, and the v1 test-fixture correction retained a strict nonmigration rejection. Physical dispatch is disabled. Never substitute GitHub Actions or a new validation harness for PHX-CI.
5. Publish final independent verdict **PASS**, **PASS WITH MINOR FINDINGS**, or **CORRECTION REQUIRED**, with findings and BU-01 acceptance recommendation. Do not close or begin BU-02 as part of review.

## Hard limits

The reviewer is read-only as to production/tests/verification scripts. Review report and handoff-state commits may be documentation-only. No live Drive/vault/device operations, physical tests, inventory activation, migrations, default-branch merge, installation, promotion or release. Direct BVP operator work, if separately authorized, requires current operator runbook and API audit first.
