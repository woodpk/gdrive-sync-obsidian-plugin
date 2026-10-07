# Causal trace and root-cause gate

## Causal statement

A03 `Keep local` selected an `upload-update`. `ProductControllerBase.resolveConflict` created the reviewed first-sync update operation; `authoritative-production-executor-base.prepareEffects` reserved candidate identity `1dY96...` and persisted an `existing-file-content-update` descriptor. `GoogleDriveAdapter.updateExisting` then used a Drive **create** upload for that reserved candidate rather than an in-place update of predecessor `17BE...`.

The former adapter verification deliberately required the predecessor to remain live and accepted the exact two-live-object topology as `verified-effect`. `verifyPreservedRemoteUpdateConvergence` likewise declared predecessor plus candidate converged. That allowed canonical BASE/mapping commit to advance to `1dY96...` while `17BE...` remained an untrashed child with the identical parent/name.

On B01, `listDomainReadOnly` queried `trashed=false` and emitted both live files at the same logical path. `ProductSnapshotAssembler` groups remote entries by path before consulting mapping and correctly marked more than one distinct ID ambiguous. The planner converted that identity ambiguity to `blocked-unsafe`. Mapping cannot safely select one member of an unexplained duplicate set without weakening the fail-closed rule for genuine concurrent candidates.

Therefore:

- A03 predecessor preservation as a second **live same-path occupant** was the defect.
- Immutable candidate creation itself remains the crash-safe materialization mechanism.
- Historical preservation must use recoverable Drive trash (or another non-current namespace), not a second live synchronization occupant.
- Snapshot ambiguity and B01 `blocked-unsafe` behavior are correct against the invalid topology.
- The mechanism is general to every remote file `upload-update`, including ordinary notes and portable configuration; it is not specific to `app.json`.

## Code trace

1. `src/product/product-controller-base.ts` — `resolveConflict`: reviewed no-BASE `Keep local` becomes `upload-update` with first-sync resolution authority.
2. `src/product/authoritative-production-executor-base.ts` — `prepareEffects`: reserves a new candidate ID and persists predecessor ID/revision, candidate ID, intended content, and unique identity authority.
3. `src/drive/google-drive-port.ts:175` — `updateExisting`: materializes the reserved candidate with a Drive create upload.
4. Former `src/drive/google-drive-port.ts` update verification: returned success with predecessor and candidate both live.
5. Former `src/product/remote-update-convergence.ts`: accepted exactly predecessor plus candidate as converged.
6. State commit advanced BASE/mapping to the candidate, leaving predecessor outside current authority but still planner-visible.
7. `src/drive/google-drive-port.ts:302` — `listDomainReadOnly`: lists all live (`trashed=false`) objects in both managed domains.
8. `src/product/snapshot-assembler.ts:287-293`: multiple distinct same-path IDs become unknown remote state plus ambiguous identity.
9. `src/core/planner.ts:141`: ambiguous identity becomes `identity-ambiguous` / `blocked-unsafe`.

## Rejected alternatives

- No evidence supports a stale retry/orphan: each object has one creation revision, and the newer object's time/bytes/identity match A03 exactly.
- The path normalizer maps both objects correctly; both truly have the same name and parent.
- BASE/mapping are coherent and correctly point to the selected 376-byte candidate; they are not sufficient authority to erase an unexplained physical duplicate.
- Ordinary and portable-config domains share the same update implementation, proving this is not a portable path exception.

Root cause is conclusively proven from live topology, A03/B01 state evidence, and the production create/verify/convergence code path.
