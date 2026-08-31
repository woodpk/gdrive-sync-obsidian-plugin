# Phase 6 Synchronization Foundation v1.2 — Remote Folder Restart Observation

Status: **bounded corrected candidate for independent supervisor review**  
Temporary correction agent: `agt-CA-P6-SYNC-ORCHESTRATION-01`  
Correction branch: `phase6-sync-foundation-v1.2-remote-folder-recovery-observation`  
Approved v1.1 foundation SHA: `e6e74b6503e95219b3070044a86be2dd7e41bd5d`  
Source blocker SHA: `bec4b64bb84fc147db39c004f959f8e09db5945e`  
Corrected candidate identifier: `phase6-sync-foundation-v1.2`

## 1. Bounded correction

The approved v1.1 folder-create foundation correctly persists restart-safe LOCAL and REMOTE folder-create descriptors, including exact reserved Drive identity and intended parent identity. Workstream D subsequently proved that the frozen read-side contracts could not reconstruct the actual current REMOTE parent relationship after process death. Generic `RemoteObservation` and `RemoteEntry` expose path/object/content evidence but not actual parent Drive identity. Consequently D could not satisfy `verifyRemoteFolderCreate()` after `dispatch-authorized` or `outcome-unknown` without inventing observed parent authority from the persisted expectation.

The supervisor determined that no product decision is required and authorized one serialized shared-foundation correction only. Workstream D implementation remains paused.

## 2. New frozen seam

`src/contracts/synchronization-folder-create-foundation.ts` now defines:

- `RemoteFolderCreateRecoveryReadPort` — a dedicated read-only recovery seam accepting the persisted `RemoteFolderCreatePhysicalMutationDescriptor` and returning an authoritative `RemoteFolderCreateObservation`;
- `recoverRemoteFolderCreate()` — a shared helper that performs the read then delegates to the unchanged `verifyRemoteFolderCreate()` verifier.

The read contract is deliberately folder-specific. Generic `RemoteObservation`, `RemoteEntry`, and ordinary reconciliation DTOs are unchanged.

## 3. Observation authority

The persisted descriptor supplies expectations only. In particular, `descriptor.parentRemoteObjectId` is not observed evidence.

A conforming `RemoteFolderCreateRecoveryReadPort` implementation must establish physical reality from Drive and obey these semantics:

- if the reserved object exists, `folder` carries its actual observed path, path-comparison key, exact object ID, and actual current parent Drive object ID;
- if another object occupies the intended logical target, return `occupied` rather than absence;
- `authoritative-absent` is permitted only after both the exact reserved identity and every competing intended-path occupant are authoritatively excluded;
- duplicate/ambiguous path evidence, missing parent evidence, partial/inaccessible observation, or network/read failure returns `unobservable`;
- the seam performs no Drive mutation.

The unchanged verifier therefore remains the authority boundary:

`persisted descriptor -> read-only physical observation -> verifyRemoteFolderCreate() -> verified-effect | verified-not-applied | conflict-preserved | outcome-unknown`.

## 4. Restart lifecycle

The corrected frozen chain is representable for both may-have-dispatched stages:

`REMOTE FOLDER INTENT PERSISTED -> DISPATCH AUTHORIZED / OUTCOME UNKNOWN -> PROCESS DEATH -> LOAD SAME RESERVED ID -> READ-ONLY RECOVERY OBSERVATION -> ACTUAL OBJECT/PATH/PARENT EVIDENCE -> UNCHANGED VERIFIER -> CONSERVATIVE OUTCOME -> RETRY / CONFLICT / COMMIT POLICY`.

No redispatch is justified merely because a response was lost.

## 5. Compatibility

This correction is additive and preserves all approved v1 and v1.1 semantics, including A–H, R1–R6, exact reserved folder identity, authoritative v1.1 persistence, conservative unknown handling, application-versus-convergence separation, and the authoritative commit boundary.

It does not redesign Drive mutation protocol, BASE, state, local transactions, lifecycle, merge, planning, or execution.

## 6. Workstream boundary

This candidate defines shared contract authority only.

- Workstream A remains responsible for the concrete Drive implementation of `RemoteFolderCreateRecoveryReadPort`.
- Workstream D may later consume the seam only after independent supervisor approval of this exact v1.2 candidate.
- No A production implementation is included here.
- No D orchestration implementation is resumed here.

## 7. Predictive coverage

`test/phase6-folder-remote-recovery-observation-foundation.test.ts` covers:

1. correct reserved folder / correct parent;
2. correct reserved folder / wrong parent;
3. correct reserved ID / wrong structural path;
4. reserved ID missing / intended path occupied;
5. reserved ID missing / intended path authoritatively clear;
6. duplicate/ambiguous logical path;
7. incomplete parent/path observation;
8. restart from `dispatch-authorized` without redispatch;
9. restart from `outcome-unknown` without redispatch;
10. proof that persisted intended parent authority alone cannot become observed parent authority.

## 8. Approval boundary

This document records a corrected candidate, not approval. The candidate must receive independent supervisor review before any worker consumes it. No merge, release, tag, Stage 3 work, OAuth/Azure change, Drive-scope expansion, or physical-device validation is authorized by this correction.
