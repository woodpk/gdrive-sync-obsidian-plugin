# Coding-Agent Evidence — Phase 6 Alpha Sync Plan Error Artifact and Transient Local-Edit Repair

## Identity and repository control

- agent ID: `agt-CA-P6-ALPHA-PLAN-ERRORS-STABILITY-01`
- repository: `woodpk/gdrive-sync-obsidian-plugin`
- repair branch: `phase6-alpha-plan-errors-stability`
- pull request: [#31](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/31), targeting `phase6-integration`, left open and unmerged
- exact starting released `master` SHA: `77336110893ff31e4029d962584ba25fc22ce7c8`
- initial rejected implementation SHA: `70ee18890603f478dfe19b9926d712b25376e84f`
- C1/C2 repair implementation SHA: `ece64f993ed50de4c2bc3810639d942e597ef7e0`
- prepared version: `0.1.7`
- `master` and `phase6-integration` were not modified; no tag or release was created

This record and the cumulative evidence ledger are committed after the implementation SHA. Consequently, the final PR head is a later evidence-only commit; GitHub PR state and the operator handoff report that exact pushed head.

## Established failure mechanisms and corrections

### Transient stale observation

The local adapter correctly rejected a read when the file's observation token changed during canonical SHA-256 collection. The production evidence decorator previously converted that expected edit race immediately into `local-unknown`, creating persistent attention even when the next reconciliation succeeded.

`CanonicalEvidenceLocalVault` now explicitly recognizes `LocalStaleObservationError`, re-observes only the affected path, and retries with deterministic bounded parameters (three attempts, short bounded backoff by default). Every read still requires the exact current observation token, and a post-hash observation must match before the hash is accepted. A stable retry uses only newly validated evidence and creates no attention record. Exhaustion retains path-local presence without stale content evidence, and the planner classifies it as `local-file-not-stable`; unrelated safe work remains eligible.

### Cross-path contamination

The prior decorator also changed the entire local enumeration to `partial` when canonical hashing failed for one already-discovered file. Snapshot assembly therefore treated unrelated local absence, including portable-configuration logical absence, as unknown and copied the failing file's error across paths.

Canonical content-evidence completeness is now represented on the individual observation. Only the wrapped directory enumerator determines listing completeness. Genuine directory/subtree/access incompleteness remains fail-closed, while one discovered file's hash failure cannot invalidate absence evidence for unrelated paths.

## Persistent `sync-plan-errors.csv`

The user-facing attention source of truth is now an automatically maintained vault file named exactly `sync-plan-errors.csv`.

- A safe vault-relative containing-directory setting resolves to the vault root by default or, for example, `99-System/sync-plan-errors.csv`. Absolute/native/URI, traversal, unsafe cross-platform, reserved portable-configuration, and filename-shaped inputs are rejected.
- Runtime initialization reconciles the exact visible managed exclusion before creating or monitoring the CSV. The product path scope also enforces a dynamic exact operational exclusion even if the visible entry is removed or corrupt.
- Existing unrelated user exclusions are preserved. Relocation first persists a source/destination journal with both exact visible exclusions, keeps both canonical and deterministic transaction paths in the runtime operational exclusion set, establishes and validates the destination, durably changes the active location, cleans the source, and only then clears the journal and old protection.
- The mobile-safe implementation uses only Obsidian `App.vault.adapter` operations. It creates parent directories and the exact header automatically, recreates the file after deletion or configured-parent deletion/rename, and serializes immutable write payloads through a failure-recoverable queue.
- Replacement uses deterministic same-directory `.brain-sync-stage` and `.brain-sync-backup` transaction names. Every initialization, load, and replacement recovers residue first: a valid canonical wins and stale residue is removed; a missing canonical restores the last committed backup; a stage is promoted only when no backup exists and it parses successfully; invalid residue fails safely without fabricating blank history. Immediate rollback remains best effort, but restart correctness no longer depends on catch/finally execution.
- The CSV records path, current/resolved status, reason, category, first/last seen, occurrence count, run identifier, trigger, and `resolved_at`. Formula-like and leading-apostrophe values are protected reversibly; commas, quotes, line breaks, and Unicode round-trip through strict parsing.
- Every current unresolved record is retained. Only resolved history is bounded. Repeated conditions deduplicate, changed reasons supersede prior current reasons into history, and a later successful operation resolves the path with a timestamp.
- Existing plugin-data attention records migrate once into the CSV. Legacy data is cleared only after successful CSV initialization; failures are surfaced without revoking already-authorized safe synchronization.
- Ordinary diagnostic telemetry remains path-free. A CSV persistence failure is logged only with sanitized aggregate classification and surfaced to the user.

## Changed files

Implementation and version:

- `manifest.json`
- `package.json`
- `package-lock.json`
- `src/core/planner.ts`
- `src/product/canonical-local-vault.ts`
- `src/product/path-scope.ts`
- `src/product/plugin-data.ts`
- `src/product/product-controller.ts`
- `src/product/runtime.ts`
- `src/product/settings-tab.ts`
- `src/product/sync-attention-ledger.ts`
- `src/product/sync-plan-errors-csv.ts` (created)
- `src/product/sync-plan-errors-path.ts` (created)

Predictive regression coverage:

- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase6-alpha-mixed-plan-isolation.test.ts`
- `test/phase6-alpha-plan-errors-stability.test.ts` (created)

Evidence-only files are this record and `dev/evidence/_ca-output.md`.

## Predictive and adversarial verification

Focused mixed-plan/stability suite: **35/35 PASS**. In addition to the original transient-edit, path-locality, ledger, CSV, exclusion, migration, and write-queue coverage, it now proves deterministic recovery for canonical-missing backup+stage, canonical-present stale residue, valid-stage-only, and unrecoverable residue. It simulates hard restarts at all three relocation boundaries, proves source/destination authority ordering, proves both pending locations remain excluded, and verifies live journal/destination/active/source-cleanup ordering.

Local Windows verification:

- `npm run typecheck`: PASS
- full suite: **356/358**, qualified PASS
- the only failures are the two unchanged established Windows drive-prefix expectation mismatches:
  1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
  2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`
- `npm run build`: PASS
- `npm run verify:build`: all five verifiers PASS
- `git diff --check`: PASS

GitHub/Linux **Phase 6 Alpha Diagnostic Verification** run [33268697386](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33268697386) passed **358/358**, typecheck, complete repository check, build, diff check, and all five package verifiers. It reproduced the exact artifact below.

The separate Azure Static Web Apps preview run [33268697361](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33268697361) failed only because the Static Web App has the maximum number of staging environments. No Azure/OAuth/workflow change was made; this is not a plugin source or verification failure.

Adversarial inspection additionally confirmed bounded retry/no starvation, no competing automatic lifecycle, exact path-local failure classification, serialized relocation under the CSV persistence owner, durable journal-before-copy ordering, active-after-valid-destination ordering, cleanup-before-journal-clear ordering, deterministic interrupted-replacement restart recovery, duplicate-free managed exclusions, preserved unrelated user exclusions, internal protection for canonical/stage/backup paths, resolved/current truth, exact remote exclusion, and portable-configuration isolation.

## Artifact identity and remaining authority

- `manifest.json` version: `0.1.7`
- `manifest.json`: `283` bytes; SHA-256 `fd4cd2d3572b86ad2fea72e27c336f2ce8ee7d3c99979a1abbf220f4eaeb8279`
- `main.js`: `404546` bytes
- `main.js` SHA-256: `c98eb80d9c6d7e90baa925ed8fd8e72e5ca771c0720813e9b8f2fb1e6e42ef01`
- PR #31 remains open and unmerged for supervisor adversarial review.
- No protected branch, tag, release, OAuth/Azure configuration, physical device, Phase 6 completion, or Stage 3 state was changed.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

## PR #31 rejection repair manifest and closure status

Modified for C1/C2 implementation and predictive coverage:

- `src/main.ts`
- `src/product/plugin-data.ts`
- `src/product/runtime.ts`
- `src/product/sync-plan-errors-csv.ts`
- `src/product/sync-plan-errors-path.ts`
- `test/phase6-alpha-plan-errors-stability.test.ts`

Modified for corrected evidence:

- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-PLAN-ERRORS-STABILITY-01.md`
- `dev/evidence/_ca-output.md`

No file was created or deleted by the rejection repair. The final evidence-only PR head is necessarily later than the implementation SHA because a commit cannot truthfully contain its own hash; the pushed PR state and completion response report it exactly.

Unavailable checks or remaining product blockers: none within the authorized coding/verification scope. The Azure preview-capacity failure is separate infrastructure state, not a source/build failure.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION


---

## PR #31 cloud continuation closure — `agt-CA-P6-ALPHA-PLAN-ERRORS-STABILITY-CLOUD-CONT-01`

This section continues the existing repair from inherited branch head `51b270225b94ced2f66e626b97e00853bfdb9218`. The continuation agent directly inspected the C1/C2 production lifecycle and hard-restart regression coverage and found no remaining implementation defect requiring another source or test change. The last product/test implementation commit therefore remains `ece64f993ed50de4c2bc3810639d942e597ef7e0`; the inherited commit after it was evidence-only.

### C1 — crash-safe CSV relocation verification

PASS by direct implementation and adversarial test inspection. Pending relocation state is durably journaled with exact source and destination paths; restart reconstructs both visible/operational exclusions before scheduler activity; destination establishment/validation precedes the active-location transition; the source remains until the destination and active setting are durable; source cleanup precedes journal clearing; all three hard-restart boundaries converge while preserving prior records and unrelated user exclusions; pending relocation failure leaves both locations protected.

### C2 — crash-safe CSV replacement/recovery verification

PASS by direct implementation and adversarial test inspection. Stage/backup paths are deterministic (`.brain-sync-stage` / `.brain-sync-backup`); recovery runs before absent/blank initialization; a valid canonical wins and stale residue is cleaned; canonical-missing + backup restores committed history; canonical-missing + valid stage with no backup promotes stage; unrecoverable residue fails safely instead of fabricating blank authoritative history; genuinely residue-free first initialization may create the empty/header CSV; relocation uses the same recovery semantics.

### Hard-restart regression verification

The existing tests construct restart residue directly rather than depending on an exception handler completing. They cover canonical missing + backup + stage, canonical present + stale residue, canonical missing + valid stage only, unrecoverable residue, relocation restart after journal creation, after destination creation, and after active-location change, both locations excluded throughout the pending transaction, prior error-record preservation, and unrelated user-exclusion preservation. No test addition was required.

### Continuation verification

One-shot GitHub/Linux continuation workflow run `33273517297` executed from workflow-creation commit `3d3287bcfd647e5687324b30e14e869a30fc612b` against the unchanged product/test tree:

- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npm test`: **358/358 PASS**, 0 fail
- focused repair command (run after the full suite establishes the repository test harness): `node --test .test-build/test/phase6-alpha-mixed-plan-isolation.test.js .test-build/test/phase6-alpha-plan-errors-stability.test.js` — **35/35 PASS**, 0 fail
- `npm run build`: PASS
- `npm run verify:build`: PASS
- `git diff --check`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `main.js`: `404546` bytes; SHA-256 `c98eb80d9c6d7e90baa925ed8fd8e72e5ca771c0720813e9b8f2fb1e6e42ef01`
- `manifest.json`: `275` bytes; SHA-256 `79127c33d5e7df64776f0bdd076cf58d37ac53f20de1e4bd533f750273c3e547`

The exact-head artifact independently downloaded from prior successful run `33268831441` / job `99143544637` matches the continuation product tree for `main.js`: `404546` bytes / `c98eb80d9c6d7e90baa925ed8fd8e72e5ca771c0720813e9b8f2fb1e6e42ef01`. Its Linux-checkout `manifest.json` is `275` bytes / `79127c33d5e7df64776f0bdd076cf58d37ac53f20de1e4bd533f750273c3e547`. Earlier prose that used a different final-head `main.js` identity is superseded. The historical `283`-byte / `fd4cd2d...` manifest identity is not used as the exact GitHub/Linux final-head artifact identity.

Inherited local Windows verification remains **356/358 qualified PASS**. It was not re-executed by this cloud continuation agent. The only two inherited failures are the established Windows drive-prefix expectation mismatches for the direct-missing-child and nested-missing-target portable-collision assertions; no new Windows failure is claimed.

### Continuation change boundary and limitations

- additional implementation changes required: **NO**
- additional source/test files changed by this continuation: **none**
- continuation repository changes: this append to the two required evidence files plus a session-transient verification workflow that is removed before final-head review
- no new branch or PR was created
- PR #31 remains required to stay open and unmerged against `phase6-integration`
- no `phase6-integration`, `master`, tag, release, OAuth/Azure behavior, physical device, synchronization, Phase 6 completion, or Stage 3 state was modified
- final evidence/cleanup commit is necessarily subsequent to this text and cannot contain its own Git SHA; the exact final pushed PR head is recorded in PR #31 metadata and the completion response after GitHub returns it

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION


### Cloud-continuation execution-history reconciliation

The continuation's repository-side closure history is recorded explicitly:

- `8eada2467fc1d6e92660e3346823eba9e78ce095` — created the first temporary PR31 continuation verifier. Run `33273425975` reached the 35-test selection but produced **31/35** because four runtime-importing relocation tests could not resolve the Obsidian runtime module when the focused files were invoked before the repository's normal full-test harness. The evidence-writing step was skipped. This was a temporary verifier/harness-order failure; no production or test source changed and it is not represented as C1/C2 product failure.
- `3d3287bcfd647e5687324b30e14e869a30fc612b` — corrected only the temporary verifier order so the normal full repository test harness runs before the same 35-test focused command.
- continuation verification run `33273517297` — **SUCCESS**: full **358/358 PASS**, focused PR31 repair **35/35 PASS**, typecheck/build/explicit build verification/diff check PASS, five build verifiers PASS, `main.js` `404546` bytes / SHA-256 `c98eb80d9c6d7e90baa925ed8fd8e72e5ca771c0720813e9b8f2fb1e6e42ef01`, Linux `manifest.json` `275` bytes / SHA-256 `79127c33d5e7df64776f0bdd076cf58d37ac53f20de1e4bd533f750273c3e547`.
- `52f8e8fe6c05798ccb65f4f909504ef3397f4021` — appended the continuation verification/C1/C2 closure to both required evidence files.
- `b92a2835a26d68ad9e7b3765053c3c7f1ebb8bc2` — removed the temporary continuation verifier from the branch.
- `a82b9e18094b36fc9c20b2933a961d4f7fd95245` — created this temporary self-removing evidence-finalizer solely to append this reconciliation. It is removed in the same subsequent evidence commit, so no continuation workflow remains in the final net tree.

The subsequent evidence-finalization commit cannot contain its own Git hash without self-reference. Its exact SHA is therefore reported in PR #31 metadata and the completion response after GitHub returns it. Across this cloud continuation, **no production source, test source, version metadata, build configuration, dependency, OAuth/Azure behavior, synchronization authority, `phase6-integration`, or `master` was modified**. The final net repository change relative to inherited head `51b270225b94ced2f66e626b97e00853bfdb9218` is limited to these two evidence files.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION
