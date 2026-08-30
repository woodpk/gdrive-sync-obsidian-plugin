# Phase 6 Synchronization Contract Freeze Candidate

Status: **candidate only — independent supervisor approval pending**  
Contract version: `phase6-sync-foundation-v1`  
Rejected supervisor candidate: `0d84f542a556800d93020b4000072da8faa3f740`  
Branch: `phase6-sync-architecture-foundation`

This manifest does not authorize parallel implementation. The exact supervisor-approved workstream-base SHA will be identified externally after review and must be the single repository snapshot used by every later workstream.

## 1. Frozen files

- `src/contracts/common.ts`
- `src/contracts/synchronization-foundation.ts`
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
| `ReliableRemoteMutationPort` | Sole authoritative v1 synchronization mutation seam for create/update/move/trash. | A, D |
| `GoogleDrivePort` raw mutations | Compatibility transport only; raw `create/update/move/trash` results are non-authoritative for new synchronization. | A only |
| `RecoverablePhysicalMutationDescriptor` | Durable physical intent for local/remote file mutation, move, and trash. | C, D |
| `RecoverableMutationEffect` | Per-effect durable stage/verification state. | C, D |
| `RecoverableOperationIntent` | Single-effect operations carry one effect; clean merge carries at least two separately staged physical effects. | C, D |
| `LocalMutationTransaction` | Exact create-vs-replace pre-state plus canonical new evidence and durable swap stage. | B, C, D |
| `LocalIntegrityReconciliationPort` | Authoritative integrity read bypasses metadata/observation-token evidence cache and re-reads actual bytes. | B, E, G |
| `SynchronizationFaultPoint` | Deterministic crash injection covers dispatch and local swap boundaries. | A, B, C, D, G |
| `SemanticStateValidator` | Known codes plus fail-closed extensibility for newly discovered contradictions. | C |

## 3. Fixed mutation lifecycle

Every v1 mutation must satisfy:

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

Observing writer bytes alone is never sufficient.

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

Workstream implementation that routes around these frozen safe seams is a contract violation.

## 7. Cross-contract invariants retained from accepted A–H foundation

1. Persistence revision and semantic authority remain distinct.
2. File BASE healing requires canonical SHA-256 equality.
3. Remote-ingestion progress cannot discard unresolved learned facts.
4. Duplicate logical paths remain explicit.
5. Existing-object remote content update does not assume undocumented atomic Drive CAS.
6. Dispatch possibility is durable before the external call.
7. Local create/replace recovery authority remains explicit.
8. Unknown mutation outcome never becomes retryable-not-applied by assumption.
9. Semantic contradiction always has a fail-closed representation.
10. PR #33 operation-local stale isolation remains fixed.

## 8. Workstream effects

- **A** implements every remote mutation kind behind the safe frozen port and adapts raw Drive transport without exposing it as synchronization authority.
- **B** implements exact local transaction behavior and the cache-bypassing integrity read.
- **C** persists exact plan authority, mutation descriptors/effects, intended content, dispatch stages, and convergence/conflict state.
- **D** converts compatibility planning output to exact executable authority, journals physical effects before dispatch, and separates application proof from path convergence.
- **G** models R1–R6 adversarial cases without production changes.

The seven-workstream decomposition remains sound; worker count is unchanged.

## 9. Contract change rule

If an approved workstream cannot meet acceptance criteria using this surface, it stops and submits `CONTRACT CHANGE REQUEST`. It must not edit or shadow the frozen contracts on its branch.

## 10. Approval state

This remains a **candidate**, not an operative freeze. Parallel implementation remains unauthorized until the independent supervisor explicitly approves one exact candidate head and identifies that SHA as the common workstream base.
