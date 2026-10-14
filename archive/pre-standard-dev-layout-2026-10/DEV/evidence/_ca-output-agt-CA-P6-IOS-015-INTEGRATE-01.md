# Coding-Agent Evidence — Phase 6 Alpha `0.1.5` Integration and Master Promotion

## Identity and authority

- agent: `agt-CA-P6-IOS-015-INTEGRATE-01`
- repository: `woodpk/gdrive-sync-obsidian-plugin`
- approved repair PR: `#27`
- approved implementation commit: `7fba7fbc568c4512e54740f549d44c434b7b2a79`
- approved evidence head: `5e4b328ff31682060035ab199d95aa3712c1ee12`
- prepared version: `0.1.5`
- promotion PR: [#28](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/28)

This pass integrated the independently approved repair into `phase6-integration`, completed evidence-only repository reconciliation needed for a clean promotion, and opened the promotion PR to `master`. It did not merge or modify `master`, create a tag/release, alter synchronization or OAuth behavior, or begin Stage 3.

## Starting topology and pre-mutation verification

- local branch/head: `phase6-alpha-ios-adapter-boundary-refactor` @ `5e4b328ff31682060035ab199d95aa3712c1ee12`
- `origin/phase6-alpha-ios-adapter-boundary-refactor`: `5e4b328ff31682060035ab199d95aa3712c1ee12`
- `origin/phase6-integration`: `523ba96cc6e975645cfd319fa7bb62b9c1399176`
- `origin/master`: `4454d153980d0e80b1697c7d4a4e1dccc7cb8529`
- PR #27: OPEN, UNMERGED, MERGEABLE, base `phase6-integration`, exact approved head `5e4b328ff31682060035ab199d95aa3712c1ee12`
- PR #27 plugin verification: run `33206200542`, **323/323 PASS**
- PR #27 Azure preview run `33206200550`: failed only at the previously observed staging-environment capacity boundary
- tag `0.1.5`: absent
- GitHub release `0.1.5`: absent

All required approved SHAs and branch relationships matched before mutation. `master` had not changed from the expected pre-promotion SHA.

## PR housekeeping

### PR #26

- starting state: OPEN, UNMERGED, head `c252526da0fd6752da154c8dcdba8cf468140bab`
- action: closed without merging, with a comment recording supersession by PR #27
- final state: CLOSED, UNMERGED
- no implementation or historical evidence from PR #26 was modified or deleted

### PR #27 metadata

The PR #27 description was corrected without changing source or commits. It now records the final iOS canonical streamed-content-reader purpose, version `0.1.5`, implementation/evidence SHAs, focused/local/GitHub results, all build-verifier results, approved artifact identity, PR #26 supersession, and pending physical validation.

## PR #27 integration

- merge mechanism: guarded normal GitHub merge commit; no squash, rebase, force-push, or history rewrite
- exact head guard: `5e4b328ff31682060035ab199d95aa3712c1ee12`
- PR #27 merge commit: `91c0c12f06b397f25b5dad115b437c6db49bb8d3`
- initial resulting `phase6-integration` head: `91c0c12f06b397f25b5dad115b437c6db49bb8d3`
- approved evidence head ancestry: PASS
- PR #27 final state: MERGED into `phase6-integration`
- PR #26 final state: CLOSED, UNMERGED
- `master` after PR #27 merge: unchanged at `4454d153980d0e80b1697c7d4a4e1dccc7cb8529`

## Post-merge local verification

Verification at PR #27 merge commit `91c0c12f06b397f25b5dad115b437c6db49bb8d3`:

- typecheck: **PASS**
- focused `test/phase6-alpha-ios-content-reader.test.ts`: **6/6 PASS**
- full Windows suite: **321/323**, exactly the two established drive-prefix assertions and no additional failure
- build: **PASS**
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `git diff --check`: **PASS**
- `manifest.json`, `package.json`, and `package-lock.json`: version `0.1.5`
- `main.js`: `358620` bytes
- `main.js` SHA-256: `e467de6c96c76c1006897926a98f63e0dec0acc67354553560b00b4edf3cb478`

Qualified Windows assertions:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`

## Clean promotion reconciliation

Promotion PR #28 was initially opened at integration head `91c0c12f06b397f25b5dad115b437c6db49bb8d3`. GitHub identified one conflict with `master`, isolated to the append-only cumulative ledger `dev/evidence/_ca-output.md`; there were no product, test, version, OAuth, Azure-workflow, or synchronization conflicts.

The unchanged `master` history was merged into `phase6-integration`, and both evidence append histories were preserved. Reconciliation commit:

`ca9436632da3039c580cfdc070ab8a1838697fbe`

The tree delta from `91c0c12f06b397f25b5dad115b437c6db49bb8d3` to `ca9436632da3039c580cfdc070ab8a1838697fbe` is exactly:

- `dev/evidence/_ca-output-agt-CA-P6-OAUTH-HOUSEKEEPING-01.md`
- `dev/evidence/_ca-output.md`

No production, test, version, OAuth, callback, or workflow file changed in that reconciliation. The complete local verification suite was rerun at `ca9436632da3039c580cfdc070ab8a1838697fbe` with the same results and byte-identical artifact.

## Azure Static Web Apps observations

- PR #26 close-preview run `33211857228`: **FAIL**, close action could not run because `deployment_token was not provided`
- PR #27 close-preview run `33211929861`: **FAIL**, same missing deployment-token condition
- integration push deployment run `33212471617`: **PASS**

The successful branch deployment does not prove the two PR preview environments were retired. No Azure resource, credential, workflow, callback, redirect URI, or OAuth configuration was altered.

`AZURE STAGING HOUSEKEEPING: MANUAL AZURE-SIDE CLEANUP STILL REQUIRED`

## Promotion PR and CI

- PR: [#28 — Phase 6 Alpha: promote iOS sync repairs for 0.1.5](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/28)
- head branch: `phase6-integration`
- verified promotion candidate head: `ca9436632da3039c580cfdc070ab8a1838697fbe`
- base branch: `master`
- base SHA: `4454d153980d0e80b1697c7d4a4e1dccc7cb8529`
- mergeability after reconciliation: MERGEABLE
- state: OPEN, UNMERGED
- workflow: `Phase 1 CI`
- run ID: `33212472938`
- tested SHA: `ca9436632da3039c580cfdc070ab8a1838697fbe`
- result: **PASS**
- GitHub tests: **323/323 PASS**
- GitHub build and all five package verifiers: **PASS**
- GitHub artifact: `358620` bytes, SHA-256 `e467de6c96c76c1006897926a98f63e0dec0acc67354553560b00b4edf3cb478`

This evidence record is committed after the tested promotion candidate by construction and therefore advances the PR head with documentation only. The final evidence-only head and its resulting CI state are reported in the operator handoff and PR metadata.

## Final restrictions preserved

- `master` remains unmodified at `4454d153980d0e80b1697c7d4a4e1dccc7cb8529`
- no `0.1.5` tag exists
- no `0.1.5` release exists
- no other tag or release was created
- no physical iPhone validation was performed or claimed
- no product repair, synchronization semantic change, OAuth change, callback change, Azure configuration change, performance work, Phase 6 closure, or Stage 3 work occurred

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION
