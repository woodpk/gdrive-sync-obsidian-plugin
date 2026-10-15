# Independent Adversarial Reassessment — S09 G1-04 / G1-05 after PHX-CI

## 1. Assignment and strict independence

You are the **genuinely independent architecture, security, correctness, data-integrity and governance reviewer** for `woodpk/gdrive-sync-obsidian-plugin`. Assess whether the **G1-04/G1-05-corrected S09 G1 software candidate** may be *presented to the owner* for a separate **software-only integration decision** under the locked DEC-344 owner risk acceptance.

This is **STRICTLY READ-ONLY**. Use the connected GitHub connector and governing source documents to inspect the actual repository, original evidence, source and history. Do not trust previous agent reports or PHX-CI PASS as proof of safety. Do **not** edit files or state, create commits/PRs, run tests/scripts/builds/PHX-CI, merge, approve an artifact digest, install/activate software, access live Drive/vault, conduct physical S09 or begin Stage 3. **Stop after the findings report.** This reviewer must not become the corrective implementation agent.

## 2. Immutable review identity and evidence

| Identity | Exact value |
|---|---|
| Repository | `woodpk/gdrive-sync-obsidian-plugin` |
| **PHX-CI verified source SHA — REVIEW CODE AT THIS SHA** | `9beb958afd20acb0c6d5fdf9e44010ff8a88b490` |
| **Verified Git tree** | `a5d0de16680817b9a94f0ed86be3e639beaee99d` |
| Accepted pre-correction `master` baseline | `b1e2ebaee3077e34a4eefaf601ee8124078b7400` |
| Branch | `fix/s09-g104-g105-pairing-namespace-atomic-persistence-20261015` |
| Original G1-04/G1-05 implementation/tests | `e6184713cc21c3801ad4ee88b47c8bf3cfebb35a` |
| Corrective persistence-reconciliation implementation/tests | `d6e471dee4a41de5407dad3eec1076479d86232a` |
| **PHX-CI run ID** | `a0a8d8f7-f464-4063-825c-5517ea20b328` |
| Pinned PHX-CI runtime | `69c4aa077d4a1a46d1e85e59f39d36285be99e83` (`0.2.0-dev.2`) |
| **Original evidence-publication commit** | `6533cf3098eb9931d7595319f41121bac73bc537` — direct child of verified source |
| Previous independent-review **REJECTED** source | `c3a6c4c98ca542f524b6249671c13a3fbe9729e8` |
| Previous G1-03 PHX-CI PASS | `d3926ce1-24f6-4747-9459-b843e26e4c17` |

**Evidence at original publication commit:** `dev/_ca-output.json`, `dev/_ca-output.md` and immutable timestamped `dev/test-results/20261015T224903Z-operator-fix-s09-g104-g105-pairing-namespace-atomic-persistence-20261015-9beb958afd20.{json,md,log}`. Inspect all three original timestamped files, verify source/evidence parent lineage, stage outcomes and actual executed test names. Do not substitute branch HEAD after administrative commits for the tested source.

Published PHX-CI reports **COMPLETE / PASS, 11/11 stages exit 0**, focused BVP **403/403**, full product **1003/1003**, typecheck, build, repository checks and artifact verification PASS. Development-only `main.js`: **910255 bytes**, SHA-256 `d1ac446a8257461fc292d18f7c0563bf861bcf17f06562a76f358427c7ca59bd`. This is *not* an approved production artifact.

Preserve and contrast earlier corrective run `dcac84f4-8b9e-43d5-ae02-4233f52f36eb`, evidence commit `1c880d02f3dcd9c821fc1da0319d4d884b2e6cf3`, tested source `4b28d31c450e3a9152b61cea8a3cdfcaaf26757b`: **BLOCKED** on product test #561, NOT a PASS. Verify that `d6e471...` actually resolves its underlying shared-repository recovery regression, not merely the fixture.

## 3. Governing material to read independently

Read the original Agent-Led Software Engineering Operating Protocol (https://docs.google.com/document/d/1cbJV1WIVkhIy86zZLkvw6Gkk-bKjSyLCWU9whlhfLRc), especially sections 5, 21, 27, 35 and 37; the Agent-Led Software Product Construction Manual (https://docs.google.com/document/d/1b5BJF216CxJozFbDjGcK25zlNzlO-Q-8QyGG5hp5u14); and these **actual repository sources at the relevant immutable SHA**:

- `dev/authority/decision-register.yaml`: DEC-340 through DEC-344; DEC-344 remains locked owner acceptance of **only** DEC-340-01.
- `dev/authority/governance/locks/testing-platform-boundary.yaml`, target-system requirements including `STATE-011` and `FIRST-005`, S09 build decomposition (`dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md`) and applicable BVP/verification plans.
- `dev/research/s09-g1-data-json-integrity-investigation-2026-10-14.md`, `dev/reviews/s09-g1-dec343-review-findings-20261014.md`, existing G1-02/G1-03 review records and `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-g103-post-phxci-independent-reassessment.md`.
- `dev/state/current-state.yaml`, `dev/state/handoffs/current-engineering-handoff.md`, direct original PHX-CI evidence and relevant source/test history.

**DEC-340-01 remains CONFIRMED / UNFIXED / OWNER RISK ACCEPTED NON-BLOCKING under DEC-344** for *consideration* of genuine PHX-CI-verified software-only integration; it is **not repaired**, does not nullify past REJECTs or exempt new findings, and does not authorize a merge or release.

## 4. Required adversarial technical assessment

**A. G1-04 remote-pairing authority separation.** Trace settings UI actions, runtime `createManagedRemote`/`pairManagedRemote`, deauthorization, OAuth clearing, `remoteRootId`, `firstSyncCompleted`, per-pairing epoch/namespace, legacy existing-installation state keys, IndexedDB canonical state and text-version storage, and actual planner/executor operation selection. Establish whether completed pairing is blocked from remote rebinding until correctly durable deauthorization; whether every newly paired remote obtains a genuinely fresh state/text namespace with no old trusted BASE; whether legacy state remains accessible **only** in its prior legitimate pairing; and whether interleavings, partial writes, failures or repeated UI actions permit unsafe reuse. **Demand specific code/test evidence for first sync to an empty newly paired remote being an upload-create/safe-union, not a trusted-absence trash-local/deletion.** If no such end-to-end regression exists, disclose precisely the coverage gap; do not assert an actual bug without proof.

**B. G1-05 durability and rejected save isolation.** Inspect `src/product/plugin-data.ts`, `src/product/runtime.ts`, their actual host persistence interfaces and every audit/diagnostic/attention/settings writer. Follow `saveChain`, confirmed persisted snapshot/absence, `uncertainWrite`, failed `saveData`, subsequent `loadData`/`dataFileExists` reconciliation, in-memory publication timing and credential teardown. Prove no failed deauthorization or settings update leaks into a later unrelated whole-document write; assess failed-before-write, failed-after-write, unreadable/readback race, honest disk state vs cached state, concurrent/lost updates, restarts and legitimate recovery. Review the original failing shared-repository test #561 and corrected fixture critically; distinguish synthetic host behavior from a genuine Obsidian host/disk guarantee.

**C. Inherited G1-01/G1-02/G1-03 controls.** Verify malformed/missing/null/partial `data.json` fail-closed behavior before any write, legitimate new-install and optional migration, completed identity shape/whitespace checks, disabled settings controls, proper deauthorize-and-repair ordering, and identity continuity. Check compatibility with historical persisted schemas. Original physical `data.json` disappearance/corruption **root cause remains unproven**.

**D. DEC-343/architecture.** Inspect `test-platform/src/repository-check.ts`, `test-platform/src/architecture-governance.ts`, guards, targeted test coverage, and the production artifact path. Verify development artifact observation is distinct from release-allowlist approval; frozen changes require authorized governance classification, and default/promotion remain fail-closed. Separately disclose accepted, unfixed DEC-340-01.

**E. Independent fresh attack and evidence provenance.** Inspect actual changed code, tests and 57 changed paths against the master baseline, full original PHX-CI stage outputs, 403/403 and 1003/1003 claims, regression execution, immutable SHA/tree, exact evidence lineage, and artifact bytes/hash. Search for other material safety, security, architectural or regression defects; separate proven counterexamples, static inferences, observed test results and unverified physical behavior. Administrative evidence-layout differences alone do not warrant a fresh PHX-CI run under Operating Protocol section 37.1.

## 5. Required report and stop gate

Return **one independent verdict: APPROVE / REJECT / INDETERMINATE** on **software-only integration eligibility** for this *exact* source under DEC-344. Include:

1. G1-04 pairing/namespace, legacy compatibility and **specific safe-union/delete-planner assessment**.
2. G1-05 atomic persistence, uncertain-save reconciliation, failure handling and observed/untested host guarantees.
3. G1-01–G1-03 inherited controls; DEC-343, and the separate DEC-340-01 accepted-unfixed disclosure.
4. Forensic PHX-CI source/tree/base/runtime/run/evidence ancestry, all stage results, test counts, development-only artifact identity.
5. Each material finding's severity, **immutable source path and line**, causal mechanism, supporting proof, bounded correction and evidence limits.
6. Whether the candidate should be **presented** for a distinct owner authorization to merge. The reviewer must **not authorize or perform a merge**.

No production artifact/hash approval, release, installation, activation, live Google Drive/vault operations, physical S09, claimed historical root-cause closure, or Stage 3. **Stop after the independent report.**

**Exact tasking location:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md`, S09 G1; this assignment file.
