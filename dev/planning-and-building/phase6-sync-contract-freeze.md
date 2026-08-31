# Phase 6 Synchronization Contract Freeze Candidate

Status: **candidate only — independent supervisor approval pending**  
Contract version: `phase6-sync-foundation-v1.1`  
Previous supervisor-approved foundation: `6984915d2989827edf00def64a04c102c4e08785` (`phase6-sync-foundation-v1`)  
Folder-create correction implementation checkpoint: `6ee8d689f92f9ad2aec88ac359f84ae0ca21ebf8`  
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
| `RecoverablePhysicalMutationDescriptor` | v1 durable physical intent for local/remote file mutation, move, and trash. | C, D |
| `FolderCreatePathAuthority` | Exact empty-folder path/parent/path-comparison authority with expected absence. | A, B, C, D |
| `LocalFolderCreatePhysicalMutationDescriptor` | Durable LOCAL empty-folder create identity/path/authority without file-content evidence. | B, C, D |
| `RemoteFolderCreatePhysicalMutationDescriptor` | Durable REMOTE empty-folder create identity/path/parent plus reserved Drive identity before dispatch. | A, C, D |
| `RecoverablePhysicalMutationDescriptorV1_1` / `RecoverableMutationEffectV1_1` / `RecoverableOperationIntentV1_1` | Additive v1.1 durable physical-effect family including LOCAL and REMOTE folder create while preserving v1 compatibility. | A, B, C, D, G |
| `verifyLocalFolderCreate` / `verifyRemoteFolderCreate` | Conservative structural/identity verification: verified effect, verified not applied where proven, conflict preserved, or outcome unknown. | A, B, C, D, G |
| `folderCreateRestartRecoveryDirective` | Folder effects inherit the same durable pre-dispatch versus may-have-dispatched recovery classification. | C, D, G |
| `folderCreateEligibleForAuthoritativeCommit` | Physical folder verification is insufficient; logical path convergence is also mandatory before authoritative state commit. | C, D |
| `RecoverableMutationEffect` | Per-effect durable stage/verification state. | C, D |
| `RecoverableOperationIntent` | Single-effect operations carry one effect; clean merge carries at least two separately staged physical effects. | C, D |
| `LocalMutationTransaction` | Exact file create-vs-replace pre-state plus canonical new evidence and durable swap stage. | B, C, D |
| `LocalIntegrityReconciliationPort` | Authoritative integrity read bypasses metadata/observation-token evidence cache and re-reads actual bytes. | B, E, G |
| `SynchronizationFaultPoint` | Deterministic crash injection covers dispatch and local swap boundaries. | A, B, C, D, G |
| `SemanticStateValidator` | Known codes plus fail-closed extensibility for newly discovered contradictions. | C |

## 3. Fixed mutation lifecycle

Every v1.1 mutation must satisfy:

`PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`

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
- folder proof is structural/path/identity based and never requires file hashes or a child file;
- LOCAL durable intent records target/parent/path-normalization authority and expected absence;
- REMOTE durable intent additionally records the intended parent Drive identity and pre-reserved Drive folder object ID before dispatch;
- `intent-persisted` is definitely pre-dispatch; `dispatch-authorized` or later means the create may have occurred and must be reconciled;
- lost REMOTE responses reconcile the same reserved identity rather than issuing an unrelated second create;
- same-logical-path occupancy by an incompatible or non-authoritative object is preserved as conflict/unknown rather than ordinary success;
- verified physical existence does not authorize BASE/state advancement unless logical path convergence is separately established.

### Move

- durable descriptor carries target side, `fromPath`, `toPath`, stable remote ID where applicable, and exact identity authority;
- remote move uses `ReliableRemoteMutationPort.moveExisting` and explicit outcome classification.

### Trash

- durable descriptor carries target side, path, stable remote ID where applicable, and exact BASE/deletion authority;
- remote trash uses `ReliableRemoteMutationPort.trashExisting` and explicit outcome classification.

### Clean text merge

A logical clean merge is not one opaque completion bit. It contains at least two separately staged physical effects. A restart after one side commits sees the other side as unfinished and cannot classify the logical operation complete.

## 4. Remote application versus convergence

A physical mutation may be safely materialized without the logical path being conflict-free.

For example, if predecessor R0, independent RI, and writer candidate RW are all preserved, RW may have a valid `RemoteMutationApplicationProof`, while `RemotePathConvergenceAuthority` remains `conflict-preserved`. Ordinary convergence requires both:

1. verified non-destructive application; and
2. explicit conflict-free path authority (`no-independent-candidate` or authoritatively equivalent candidates).

The same distinction applies to folder creation: observing the intended physical directory object is not enough to commit synchronization state unless path convergence is authoritative.

## 5. Local integrity/cache invariant

Fast-path metadata-based canonical evidence caching is permitted only as an optimization. Workstream B must implement an authoritative integrity path via `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()`.

At Verify/Reconcile and policy-selected integrity opportunities, the implementation must re-read bytes even if:

- byte length is unchanged;
- mtime is unchanged/restored;
- no watcher event arrived;
- cached observation token is unchanged.

A missed H0→H1 change therefore cannot make stale H0 permanent authority.

## 6. Legacy compatibility rule

The repository contains existing planner/executor/Drive interfaces that predate this freeze. Their presence does not authorize the new synchronization path to use weaker semantics.

- `base-trusted` and `identity-unambiguous` may exist only in compatibility planning DTOs until Workstream D migrates them; `ExecutablePlannedOperation` cannot contain them.
- existing `SynchronizationExecutor` / `AuthoritativeSuccessCommitter` remain compatibility seams for current code; new synchronization uses the authority-complete variants.
- raw `GoogleDrivePort.create/update/move/trash` are transport primitives; new synchronization mutations use `ReliableRemoteMutationPort` only.
- pre-v1.1 recoverable descriptors remain compatibility authority for the already-reviewed file/move/trash surface, but new or resumed empty-folder synchronization must use the v1.1 folder-capable descriptor family rather than inventing a private folder transaction.

Workstream implementation that routes around these frozen safe seams is a contract violation.

## 7. Cross-contract invariants retained from accepted A–H and R1–R6 foundation

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

## 8. Workstream effects

- **A** can implement retry-safe REMOTE folder creation behind the frozen remote mutation seam using the durable reserved identity and parent/path authority.
- **B** can implement LOCAL folder create/verification using structural path authority without a private file-like transaction type.
- **C** can persist and recover both LOCAL and REMOTE folder-create physical effects and their durable stages.
- **D** can plan, journal, authorize dispatch, verify/recover, and commit empty-folder synchronization using only frozen shared contracts while keeping physical effect separate from path convergence.
- **G** can inject folder-create pre-dispatch, post-dispatch, lost-response, collision, wrong-identity, and pre-state-commit crash cases without production ownership.

The seven-workstream decomposition remains sound; worker count and ownership are unchanged. No workstream is authorized to resume until independent supervisor approval establishes one exact v1.1 workstream-base SHA.

## 9. Contract change rule

If an approved workstream cannot meet acceptance criteria using this surface, it stops and submits `CONTRACT CHANGE REQUEST`. It must not edit or shadow the frozen contracts on its branch.

## 10. Approval state

This remains a **candidate**, not an operative freeze. Parallel continuation remains unauthorized until the independent supervisor explicitly approves one exact candidate head and identifies that SHA as the common workstream base.
