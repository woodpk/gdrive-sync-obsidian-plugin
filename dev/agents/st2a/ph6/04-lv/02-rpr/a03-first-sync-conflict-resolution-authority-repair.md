# PHASE 6 A03 FIRST-SYNC CONFLICT-RESOLUTION AUTHORITY REPAIR

## REJECTION

Build rejected for `C1`.

Installed/rejected production build:

`0.1.9`

Exact rejected product SHA:

`REPAIR_INPUT_SHA = f0369d342a65294e8f4b14c44009b93f4157654a`

Live hard-stop evidence:

`051f7cdbdcab027e919d53c366eed2ae23564c62`

Agent:

`agt-ca-p6-a03-first-sync-conflict-resolution-authority-repair-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Create the repair branch from exactly `REPAIR_INPUT_SHA`. Do not substitute a branch tip, `phase6-integration`, or the later evidence commit.

A03 physical validation proved a production deadlock in first-sync conflict resolution. A safe reviewed first-sync plan executed all non-conflict work and established trusted authority for converged paths, but `Keep local` on the remaining `__brain_sync_portable_config__/app.json` conflict failed twice with `recovery-required`, including after trusted authority existed globally. The remote object was never changed or duplicated.

## SCOPE

Correct `C1` and only directly necessary consequential edits.

This is a bounded first-sync conflict-resolution authority repair.

Do not redesign synchronization contracts, first-sync safe-union semantics, durable intent recovery, conflict policy, Drive update protocol, portable-config scope, release/install flow, or live-test orchestration.

Do not weaken ordinary synchronization authority requirements for normal `upload-update`, `download-update`, move, trash, or clean-merge operations.

Do not make package-version or release metadata changes.

Do not begin a new prerelease, installation, physical validation, or Stage 3.

## CORRECTIONS

### C1 — reviewed first-sync conflict resolution requires authority that cannot yet exist

**FILE**

Primary production seam:

`src/product/product-controller-base.ts`

Authority-completion seam, only if directly necessary:

`src/core/execution-coordinator.ts`

Directly necessary executor/authority helper files may be modified only when required to implement the contract below without weakening unrelated mutations.

**LOCATION**

`ProductControllerBase.resolveConflict()` and the conflict-resolution operation construction path used by `resolutionOperations()`.

`resolveAuthorityCompleteOperation()` / `AuthorityCompleteExecutionCoordinator.executeOperation()` only to the minimum extent required for a reviewed first-sync conflict resolution to cross the exact-authority boundary safely.

**DEFECT**

For a first-sync both-present divergent conflict with no trusted BASE, the product correctly records an unresolved conflict and intentionally does not create canonical BASE or remote mapping authority for that path.

When the user explicitly chooses a resolution such as `Keep local`, the controller currently constructs an ordinary `upload-update` carrying `base-trusted` plus exact local/remote preconditions. The authority-completion layer then treats that resolution like an ordinary post-BASE update and requires current-generation converged path authority plus a unique trusted remote mapping.

Those prerequisites cannot exist for the unresolved first-sync conflict path before the resolution succeeds. The workflow is therefore circular:

1. conflict resolution is required to establish convergence for the path;
2. execution requires the path to already be converged;
3. execution returns `recovery-required` before physical mutation;
4. the conflict cannot be resolved and first sync cannot complete.

The live failure reproduced twice for `__brain_sync_portable_config__/app.json`. After safe reconciliation established trusted authority for the other paths, exported authority contained 12 BASE entries and 12 remote mappings but intentionally no BASE/mapping for this unresolved path. `Keep local` still failed identically and the remote object remained unchanged.

**AUTHORITY**

Preserve all frozen Phase 6 safety invariants, especially:

- first sync is safe union and cannot invent deletion authority;
- unresolved conflicts preserve complete versions and require explicit user resolution;
- state must never claim completion before durable verified physical mutation;
- exact remote identity must be preserved for an existing remote object update;
- durable mutation intent/recovery semantics remain fail-closed;
- ordinary post-BASE mutations continue to require current trusted BASE/identity authority;
- timestamps never choose a winner.

**REQUIRED CHANGE**

Implement a narrow, explicit authority path for **user-reviewed resolution of a currently registered unresolved conflict when that path has no trusted BASE because it is still awaiting first-sync convergence**.

The repaired behavior must satisfy all of the following:

1. A reviewed first-sync conflict resolution may execute without pre-existing BASE/path-convergence authority for that same unresolved path.
2. This exception must apply only to the exact conflict-resolution operation generated from the current registered conflict and explicit user choice; it must not make ordinary planner-generated updates executable without BASE.
3. The resolution must bind to exact fresh conflict evidence before physical mutation:
   - exact logical path;
   - exact LOCAL current version, including canonical content evidence and observation token when available;
   - exact REMOTE object identity;
   - exact REMOTE current content evidence and revision when available;
   - unambiguous single-object identity at that path;
   - the exact explicit user-selected resolution.
4. If any bound LOCAL or REMOTE evidence is stale, ambiguous, missing, or changed, refuse mutation and require a fresh plan/resolution rather than weakening the precondition.
5. `Keep local` for an existing remote object must retain the existing immutable-candidate-preservation update protocol and stable remote identity behavior. Do not replace it with delete/recreate or blind overwrite logic.
6. Only after the physical resolution is durably verified may canonical BASE, remote mapping, path convergence, journal/finalization state, and first-sync completion advance for that path.
7. Restart/retry behavior must remain idempotent and recoverable under the existing durable-intent machinery.
8. The same bounded authority model must cover the symmetric first-sync conflict-resolution choices that require mutation (`Keep remote`, `Keep both`, or manual exact-current-local resolution) when they arise from the same no-BASE unresolved-conflict state, without broadening authority for unrelated operations.
9. Existing conflict behavior for already-trusted/post-BASE conflicts must remain unchanged.
10. No special case may be keyed to `app.json`, portable-config paths, or this live fixture. The repair must apply to the semantic state: reviewed unresolved conflict + exact two-sided evidence + no trusted BASE for that path.

**RELATED CHANGES**

Add focused permanent regression coverage proving at minimum:

- first-sync both-present divergent file conflict is produced with no BASE/mapping for the conflict path;
- executing safe non-conflict operations can establish trusted authority for other paths while leaving the conflict path unresolved;
- explicit `Keep local` then succeeds authoritatively without requiring pre-existing BASE for that conflict path;
- existing remote object identity is preserved;
- the resulting remote content exactly matches the chosen local version;
- canonical BASE/mapping/path-convergence authority is created only after verified mutation;
- the conflict is removed only after authoritative completion;
- stale LOCAL evidence rejects resolution without mutation;
- stale/changed REMOTE revision or identity rejects resolution without mutation;
- ambiguous/duplicate REMOTE identity rejects resolution without mutation;
- ordinary non-conflict `upload-update` without trusted BASE remains rejected;
- post-BASE conflict resolution continues through the existing authority path;
- a retry/restart at a durable intermediate point does not duplicate or blindly replay the remote update.

Use existing fakes/helpers where possible. Do not create a parallel synchronization architecture for the test.

**CONSTRAINTS**

The reviewer has already established the root cause. Do not spend the repair session rediscovering whether the live conflict was legitimate or whether the remote fixture was contaminated.

The conflict itself was legitimate. The defect is specifically the impossible authority prerequisite imposed on its explicit first-sync resolution.

Do not solve the defect by:

- pre-populating canonical BASE/mapping before physical resolution;
- marking the path converged before verified mutation;
- deleting/recreating the remote object;
- dropping exact REMOTE revision/object checks;
- dropping stable LOCAL source checks;
- bypassing durable intent/effect verification;
- globally treating `identity-unambiguous` as sufficient replacement for trusted identity authority;
- weakening `resolveAuthorityCompleteOperation()` for all update operations;
- special-casing portable configuration.

**ACCEPTANCE**

`C1` is complete only when a focused first-sync divergent-conflict fixture can perform the user-reviewed resolution through the production controller/executor path and reach authoritative completion while all ordinary authority gates remain intact.

The exact live failure shape must no longer be possible:

- trusted authority may exist globally;
- the unresolved conflict path may correctly have no BASE/mapping before resolution;
- explicit `Keep local` must not fail merely because that conflict path lacks pre-existing convergence authority;
- the operation must either complete with exact verified chosen-version convergence or fail closed because exact current conflict evidence changed.

## VERIFICATION

Run/check:

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`
- focused regression tests covering `C1`
- full `npm test`
- `npm run build`
- `npm run check`
- `git diff --check`

Because the current Phase 6 GitHub Actions workflow has previously masked test failures through `tee`, do not rely on workflow conclusion alone.

Inspect the raw test/check output and explicitly prove:

- full suite `# fail 0`;
- zero `not ok` lines;
- focused `C1` suite `# fail 0`;
- `npm run check` embedded tests `# fail 0`;
- zero `not ok` lines in the embedded check run.

The full test count must be at least the currently approved 711-test baseline. Explain any count difference.

Confirm:

- no package-version change;
- no release/tag publication;
- no desktop installation;
- no live Drive mutation;
- no A03/B–O execution;
- no Stage 3 activity.

Use GitHub Actions for authoritative clean-environment verification if available. Keep any verification PR unmerged.

## CHANGE_MANIFEST

Report every file created, modified, or deleted by this correction pass.

Production changes must be limited to the minimum authority/conflict-resolution seam required by `C1` plus directly necessary regression tests and evidence.

## COMPLETION_RESPONSE

Return:

- exact repair branch;
- exact `REPAIR_INPUT_SHA` actually used;
- exact final repair HEAD SHA;
- correction ID completed;
- concise root-cause-to-fix summary;
- complete change manifest;
- focused verification commands/results;
- full raw test totals and zero-`not ok` proof;
- `npm run check` raw embedded test totals;
- build result and `main.js` size/SHA-256;
- GitHub Actions run/job/artifact IDs and artifact digest when used;
- confirmation ordinary non-conflict authority requirements remain enforced;
- confirmation no release/install/live test/merge/Stage 3 occurred;
- any remaining blocker or verification limitation.

End exactly:

`C1 FIRST-SYNC CONFLICT-RESOLUTION AUTHORITY REPAIR COMPLETE — READY FOR SUPERVISOR REVIEW — LIVE VALIDATION NOT RESUMED`

## STOP

Stop after `C1` and directly necessary consequential edits are implemented and verified.

Do not publish a new prerelease.
Do not install the repair.
Do not resume A03.
Do not begin B–O.
Do not merge into `phase6-integration`.
Do not begin Stage 3.
