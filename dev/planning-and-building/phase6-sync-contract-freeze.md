# Phase 6 Synchronization Contract Freeze Candidate

Status: **candidate only — independent supervisor approval pending**  
Contract version: `phase6-sync-foundation-v1.1`  
Previous supervisor-approved foundation: `6984915d2989827edf00def64a04c102c4e08785` (`phase6-sync-foundation-v1`)  
Rejected v1.1 candidate: `c9a7f9c2fe77d134bed1659111d58b9a53d3eda3`  
Authority-store implementation checkpoint: `750100f95c8a32a6deb6909cd03ebbee3682d650`  
Branch: `phase6-sync-architecture-foundation`

This manifest does not authorize parallel continuation. The exact supervisor-approved workstream-base SHA will be identified externally after review and must be the single repository snapshot used by every later or resumed affected workstream.

## 1. Frozen files

- `src/contracts/common.ts`
- `src/contracts/synchronization-foundation.ts`
- `src/contracts/synchronization-folder-create-foundation.ts`
- `src/contracts/state.ts`
- `src/contracts/snapshot.ts`
- `src/contracts/plan.ts`
- `src/contracts/local-vault.ts`
- `src/contracts/google-drive.ts`
- `src/contracts/execution.ts`
- `src/contracts/conflict.ts`
- `src/contracts/status-audit-actions.ts`
- `src/contracts/index.ts`

Later agents must not modify `src/contracts/**` independently after approval. Compatibility adapters belong in the owning workstream.

## 2. Frozen callable authority surface

| Contract | Frozen guarantee | Consumers |
|---|---|---|
| `ExactBaseAuthority` | Exact path + semantic generation + BASE fingerprint authority. | C, D |
| `IdentityAuthorityProof` | Exact unique logical path/object authority under one semantic generation. | A, C, D |
| `OperationPrecondition` | Can carry exact BASE/identity proofs. Legacy nominal markers remain compatibility-only planning DTO values. | D |
| `ExecutableOperationPrecondition` / `ExecutablePlannedOperation` | Structurally exclude nominal `base-trusted` / `identity-unambiguous`; only this form enters the frozen authoritative execution seam. | D |
| `AuthoritativeSynchronizationExecutor` / `AuthorityCompleteSuccessCommitter` | New synchronization execution/commit accepts only authority-complete operations. Existing legacy executor/committer interfaces are compatibility-only. | D |
| `CanonicalFileContentProof` | Exact SHA-256 plus byte-size authority. | A, B, C, D |
| `FileCommonStateProof` | File BASE healing requires current LOCAL/REMOTE canonical equality plus current identity/revision authority. | B, C, D |
| `FolderCommonStateProof` / `AbsenceCommonStateProof` | Structural and absence authority remain distinct from file-content authority. | B, C, D |
| `DurableRemoteChangeBatch` / `learnedRemoteBatches` | Multiple unresolved learned batches remain durable until safely reduced. | A, C, D |
| `RemoteMutationIdentity` | Durable identity for file/folder create, preservation-safe file update, remote move, and remote trash; file create/update binds exact intended canonical content. | A, C, D |
| `RemoteMutationOutcome` | `verified-effect`, `verified-not-applied`, `conflict-preserved`, and `outcome-unknown` are distinct. | A, C, D |
| `RemoteMutationApplicationProof` | Proves safe physical materialization/effect only; not logical path convergence. | A, C, D |
| `RemotePathConvergenceAuthority` | Separately proves conflict-free path authority or records preserved conflict. | C, D |
| `ReliableRemoteMutationPort` | Sole authoritative synchronization mutation seam for create/update/move/trash. | A, D |
| `GoogleDrivePort` raw mutations | Compatibility transport only; raw `create/update/move/trash` results are non-authoritative for new synchronization. | A only |
| `RecoverablePhysicalMutationDescriptor` / `RecoverableMutationEffect` / `RecoverableOperationIntent` | v1 durable file/move/trash authority; preserved as compatibility surface for already-reviewed v1 behavior. | compatibility only for new/resumed v1.1 |
| `SynchronizationAuthorityMetadata` / `SynchronizationAuthorityLoadResult` / `SynchronizationAuthorityStore` | v1 authoritative persistence surface; preserved for compatibility but does not authorize folder-containing v1.1 work. | compatibility only for new/resumed v1.1 |
| `FolderCreatePathAuthority` | Exact empty-folder path/parent/path-comparison authority with expected absence. | A, B, C, D |
| `LocalFolderCreatePhysicalMutationDescriptor` | Durable LOCAL empty-folder create identity/path/authority without file-content evidence. | B, C, D |
| `RemoteFolderCreatePhysicalMutationDescriptor` | Durable REMOTE empty-folder create identity/path/parent plus reserved Drive identity before dispatch. | A, C, D |
| `RecoverablePhysicalMutationDescriptorV1_1` / `RecoverableMutationEffectV1_1` / `RecoverableOperationIntentV1_1` | Authoritative v1.1 durable physical-effect family including LOCAL and REMOTE folder create while retaining v1 members. | A, B, C, D, G |
| `SynchronizationAuthorityMetadataV1_1` | Canonical metadata for new/resumed v1.1 synchronization; `operationIntents` are folder-capable `RecoverableOperationIntentV1_1[]`. | C, D |
| `SynchronizationAuthorityLoadResultV1_1` / `SynchronizationAuthorityStoreV1_1` | Frozen v1.1 load/save/BASE-transition authority seam; folder intent survives durable save/load without sidecars or shadow state. | C, D |
| `recoverableOperationV1_1RestartRecoveryDirectives` | Shared restart classification for every v1.1 physical effect using durable dispatch-stage semantics. | C, D, G |
| `recoverableOperationV1_1IsComplete` | Shared logical completion rule: every required effect must be `state-committed`. | C, D, G |
| `verifyLocalFolderCreate` / `verifyRemoteFolderCreate` | Conservative structural/identity verification: verified effect, verified not applied where proven, conflict preserved, or outcome unknown. | A, B, C, D, G |
| `folderCreateRestartRecoveryDirective` | Individual folder effects inherit the same durable pre-dispatch versus may-have-dispatched recovery classification. | C, D, G |
| `folderCreateEligibleForAuthoritativeCommit` | Physical folder verification is insufficient; logical path convergence is mandatory before authoritative state commit. | C, D |
| `LocalMutationTransaction` | Exact file create-vs-replace pre-state plus canonical new evidence and durable swap stage. | B, C, D |
| `LocalIntegrityReconciliationPort` | Authoritative integrity read bypasses metadata/observation-token evidence cache and re-reads actual bytes. | B, E, G |
| `SynchronizationFaultPoint` | Deterministic crash injection covers dispatch and local swap boundaries. | A, B, C, D, G |
| `SemanticStateValidator` | Known codes plus fail-closed extensibility for newly discovered contradictions. | C |

## 3. Fixed mutation lifecycle

Every v1.1 mutation must satisfy:

`PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE AUTHORITY STORE -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`

There may be no private sidecar authority needed to make this chain executable.

### Upload create/update

- operation reaches execution only after nominal authority is replaced by exact authority where history/identity is required;
- exact intended file SHA-256 + size is persisted before dispatch;
- create uses one reserved identity;
- update uses immutable candidate preservation;
- lost-response recovery verifies against the durable intended version, never current LOCAL.

### Download create/update

- coherent remote read supplies verified source evidence;
- local physical mutation is a durable create/replace transaction with exact pre-state and intended new evidence.

### Folder create / empty-directory preservation

- LOCAL and REMOTE folder create are first-class recoverable physical effects under the v1.1 descriptor family;
- `SynchronizationAuthorityMetadataV1_1.operationIntents` carries those effects directly and `SynchronizationAuthorityStoreV1_1` saves/loads them as authoritative state;
- folder proof is structural/path/identity based and never requires file hashes or a child file;
- LOCAL durable intent records target/parent/path-normalization authority and expected absence;
- REMOTE durable intent additionally records the intended parent Drive identity and pre-reserved Drive folder object ID before dispatch;
- process restart loads the same operation identity, intent identity, effect identity, durable stage, folder path authority, and verification reference;
- REMOTE restart additionally loads the exact same parent and pre-reserved intended Drive folder IDs; no identity is reconstructed from current path state;
- `intent-persisted` is definitely pre-dispatch; `dispatch-authorized` or later means the create may have occurred and must be reconciled;
- lost REMOTE responses reconcile the same reserved identity rather than issuing an unrelated second create;
- same-logical-path occupancy by an incompatible or non-authoritative object is preserved as conflict/unknown rather than ordinary success;
- a folder-containing logical operation is complete only when every required effect is `state-committed`;
- verified physical existence does not authorize BASE/state advancement unless logical path convergence is separately established.

### Move

- durable descriptor carries target side, `fromPath`, `toPath`, stable remote ID where applicable, and exact identity authority;
- remote move uses `ReliableRemoteMutationPort.moveExisting` and explicit outcome classification.

### Trash

- durable descriptor carries target side, path, stable remote ID where applicable, and exact BASE/deletion authority;
- remote trash uses `ReliableRemoteMutationPort.trashExisting` and explicit outcome classification.

### Clean text merge

A logical clean merge is not one opaque completion bit. It contains at least two separately staged physical effects. A restart after one side commits sees the other side as unfinished and cannot classify the logical operation complete.

## 4. V1.1 authoritative persistence traces

### LOCAL folder

`LocalFolderCreatePhysicalMutationDescriptor -> RecoverableMutationEffectV1_1 -> RecoverableOperationIntentV1_1 -> SynchronizationAuthorityMetadataV1_1 -> SynchronizationAuthorityStoreV1_1.saveAuthority -> restart/loadAuthority -> recoverableOperationV1_1RestartRecoveryDirectives -> verifyLocalFolderCreate -> PathConvergenceState -> folderCreateEligibleForAuthoritativeCommit`.

The frozen store round trip preserves the durable effect stage and structural path authority without a worker-local sidecar.

### REMOTE folder

`RemoteFolderCreatePhysicalMutationDescriptor -> RecoverableMutationEffectV1_1 -> RecoverableOperationIntentV1_1 -> SynchronizationAuthorityMetadataV1_1 -> SynchronizationAuthorityStoreV1_1.saveAuthority -> restart/loadAuthority -> recoverableOperationV1_1RestartRecoveryDirectives -> verifyRemoteFolderCreate -> PathConvergenceState -> folderCreateEligibleForAuthoritativeCommit`.

The round trip preserves `intentId`, `effectId`, `parentRemoteObjectId`, `remoteMutation.reservedRemoteObjectId`, target path/path authority, durable stage, and verification reference. A restarted process therefore reconciles the same intended Drive folder identity.

## 5. Remote application versus convergence

A physical mutation may be safely materialized without the logical path being conflict-free.

For example, if predecessor R0, independent RI, and writer candidate RW are all preserved, RW may have a valid `RemoteMutationApplicationProof`, while `RemotePathConvergenceAuthority` remains `conflict-preserved`. Ordinary convergence requires both verified non-destructive application and explicit conflict-free path authority.

The same distinction applies to folder creation: observing the intended physical directory object is not enough to commit synchronization state unless path convergence is authoritative.

## 6. Local integrity/cache invariant

Fast-path metadata-based canonical evidence caching is permitted only as an optimization. Workstream B must implement an authoritative integrity path via `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()`.

At Verify/Reconcile and policy-selected integrity opportunities, the implementation must re-read bytes even if byte length and mtime are unchanged, no watcher event arrived, and the cached observation token is unchanged. A missed H0→H1 change therefore cannot make stale H0 permanent authority.

## 7. Legacy compatibility rule

The repository contains existing planner/executor/Drive/persistence interfaces that predate this freeze. Their presence does not authorize the new synchronization path to use weaker semantics.

- `base-trusted` and `identity-unambiguous` may exist only in compatibility planning DTOs until Workstream D migrates them; `ExecutablePlannedOperation` cannot contain them.
- existing `SynchronizationExecutor` / `AuthoritativeSuccessCommitter` remain compatibility seams for current code; new synchronization uses the authority-complete variants.
- raw `GoogleDrivePort.create/update/move/trash` are transport primitives; new synchronization mutations use `ReliableRemoteMutationPort` only.
- pre-v1.1 `RecoverableOperationIntent`, `SynchronizationAuthorityMetadata`, `SynchronizationAuthorityLoadResult`, and `SynchronizationAuthorityStore` remain compatibility surfaces for already-reviewed v1 behavior; they are not the authoritative persistence route for new/resumed v1.1 folder-containing synchronization.
- new/resumed v1.1 C/D work must exchange synchronization authority through `SynchronizationAuthorityMetadataV1_1` / `SynchronizationAuthorityStoreV1_1`; routing folder intent through a private sidecar, untyped blob, cast-through-unknown, replacement store, branch-local metadata, or shadow contract is a freeze violation.

## 8. Cross-contract invariants retained from accepted A–H and R1–R6 foundation

1. Persistence revision and semantic authority remain distinct.
2. File BASE healing requires canonical SHA-256 equality.
3. Folder proof is structural/identity authority and does not borrow file-content evidence.
4. Remote-ingestion progress cannot discard unresolved learned facts.
5. Duplicate logical paths remain explicit.
6. Existing-object remote content update does not assume undocumented atomic Drive CAS.
7. Dispatch possibility is durable before the external call.
8. Local file create/replace recovery authority remains explicit.
9. Unknown mutation outcome never becomes retryable-not-applied by assumption.
10. Semantic contradiction always has a fail-closed representation.
11. PR #33 operation-local stale isolation remains fixed.
12. Physical application and logical path convergence remain distinct.
13. Folder-create operation identity and reserved remote identity survive authoritative persistence/restart unchanged.
14. Logical completion requires every required physical effect to reach `state-committed`.

## 9. Workstream effects

- **A** has the frozen retry-safe REMOTE folder identity and verification contracts.
- **B** has the frozen LOCAL structural folder-create contracts.
- **C** can persist and recover LOCAL and REMOTE folder-create physical effects, exact identities, stages, and verification references through the authoritative v1.1 store without a sidecar.
- **D** can plan, journal, save, reload, classify, verify/recover, converge, and commit empty-folder synchronization using the same authoritative v1.1 metadata/store contract.
- **G** can model folder persistence/restart, identity preservation, pre/post-dispatch classification, and shared completion semantics without production ownership.

The seven-workstream decomposition remains sound; worker count and ownership are unchanged. No workstream is authorized to resume until independent supervisor approval establishes one exact v1.1 workstream-base SHA.

## 10. Contract change rule

If an approved workstream cannot meet acceptance criteria using this surface, it stops and submits `CONTRACT CHANGE REQUEST`. It must not edit or shadow the frozen contracts on its branch.

## 11. Approval state

This remains a **candidate**, not an operative freeze. Parallel continuation remains unauthorized until the independent supervisor explicitly approves one exact candidate head and identifies that SHA as the common workstream base.
