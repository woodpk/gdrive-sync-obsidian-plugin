# Phase 6 Synchronization Contract Freeze Candidate

Status: **candidate only — independent supervisor approval pending**  
Contract version: `phase6-sync-foundation-v1`  
Pre-continuation contract checkpoint: `8b575e7439fdd601166e3bdb6e335992364da3fc`  
Branch: `phase6-sync-architecture-foundation`

This manifest does not authorize parallel implementation. The exact **supervisor-approved workstream base SHA** will be identified externally after review and must be the single repository snapshot used by every later workstream. No worker may branch from the older code-only checkpoint merely because it contains the contract source.

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

After approval, later agents must not modify `src/contracts/**` independently. Compatibility adapters belong in the owning workstream, not in frozen contracts.

## 2. Frozen semantic guarantees

| Contract | Guarantee | Consumers |
|---|---|---|
| `PersistenceRevision` | Sequences serialized state-document CAS only; it is not BASE/plan authority. | C, D |
| `SemanticStateGeneration` | Changes when synchronization authority changes, independently of journal-only persistence. | C, D |
| `ExactBaseAuthority` | History-dependent/destructive work binds to exact path, semantic generation, and BASE fingerprint. | C, D |
| `IdentityAuthorityProof` | Identity-dependent work binds path/object uniqueness to a semantic generation. | A, C, D |
| `FileCommonStateProof` | File BASE healing requires current LOCAL/REMOTE canonical SHA-256 equality, current observation/revision identity, and unambiguous object identity. | B, C, D |
| `FolderCommonStateProof` | Structural BASE healing is distinct from file content proof. | B, C, D |
| `AbsenceCommonStateProof` | Absence healing requires explicit local absence and complete remote-absence authority; it is not inferred from path/timestamp/object metadata. | C, D |
| `AuthoritativeBaseTransition` | BASE changes only through explicit common-state/verified-operation/deletion authority. | C, D |
| `PathConvergenceState` | Per-path convergence/attention/conflict remains separate from remote-feed progress. | C, D, E |
| `RemoteChangeProtocolPage` | Intermediate `nextPageToken` and terminal `newStartPageToken` are distinct complete-page states. | A, C, D |
| `RemoteIngestionCheckpoint` | Terminal token represents a completely learned durable batch, not universal path convergence. | A, C, D |
| `DurableRemoteChangeBatch` / `learnedRemoteBatches` | Multiple unresolved learned batches remain durable until their required facts are reduced into later authoritative state. Latest-only replacement is prohibited. | A, C, D |
| `RemoteLogicalPathResolution` | Same-path object multiplicity is explicit; no arbitrary winner. | A, D |
| `RemoteMutationIdentity` | Create has durable reserved identity; existing-object update uses a reserved immutable candidate tied to predecessor object/revision. | A, C, D |
| `RemoteMutationApplicationProof` | A conflict-free update acknowledgment carries preservation/concurrency proof; observing writer bytes alone is insufficient. | A, C, D |
| `RemoteMutationOutcome` | Applied, conflict-preserved, not-applied, and unknown are distinct. | A, C, D |
| `ReliableRemoteMutationPort` | Exposes retry-safe create and preservation-safe existing-object update outcomes with cancellation. | A, D |
| `CoherentRemoteReadPort` | Materialized bytes prove one expected remote revision or return changed/unknown. | A, B, D |
| `RecoverableOperationIntent` | Durable operation stages distinguish persisted intent from durable dispatch authority and later uncertain/verified/committed states. | C, D |
| `RestartRecoveryDirective` | `intent-persisted` may retire as unattempted; once `dispatch-authorized` is durable, restart must assume mutation may have occurred and reconcile physical reality. | C, D |
| `LocalMutationTransaction` | Create versus replace records exact target pre-state authority, canonical new evidence, transaction kind, and durable swap stage. | B, C, D |
| `LocalTransactionalMutationPort` | Separates stage+verify, commit, and restart recovery as explicit outcomes. | B, C, D |
| `LocalMutationProvenance` | Self-generated events correlate by exact operation/transaction/result, never timing alone. | B, E |
| `SynchronizationFaultPoint` | Deterministic crash injection covers pre-dispatch authority, post-dispatch authority/pre-call, call-before-response, response-before-verification, verification/commit, and local swap boundaries. | A, B, C, D, G |
| `TextMergeResourcePolicy` | Unknown/oversized inputs fail closed to preservation/conflict rather than unbounded merge. | D, F |
| `SemanticStateValidator` | Known critical issue codes remain stable and `other-semantic-inconsistency` permits newly discovered contradictions to fail closed. | C |
| `SynchronizationAuthorityMetadata` / `SynchronizationAuthorityStore` | Separates persistence and semantic guards and persists lossless learned-batch backlog, path state, intents, and local transactions. | C, D |

## 3. Remote update preservation rule

Current official Drive v3 documentation exposes monotonically increasing `File.version` but does not document a Drive-specific atomic `version == expected` or `If-Match` precondition for the file-content `files.update` path. Resumable-upload status provides transport recovery, not a content-version compare-and-swap. Ordinary blob revision history may be purged and therefore cannot be the primary correctness guarantee.

Accordingly, Workstream A must not implement an in-place read/check/PATCH protocol and then call it conflict-free merely because its own bytes are observed afterward. The frozen contract requires an **immutable-candidate preservation protocol** for existing-object content updates: the intended new bytes are materialized under a durable candidate identity without destroying the observed predecessor; path/authority convergence must preserve every version whose loss cannot be excluded. A later implementation may return `verified-applied` as ordinary conflict-free success only with `RemoteMutationApplicationProof` sufficient to demonstrate this preservation. Otherwise it returns conflict-preserved or outcome-unknown.

If a later official Drive capability supplies an actually documented atomic equivalent, adopting it requires a central contract-change review; workers may not infer it locally.

## 4. Fixed cross-contract invariants

1. Persisted-document CAS and semantic synchronization authority remain distinct.
2. Exact BASE evidence, not general state availability, authorizes history-dependent actions.
3. File BASE healing requires canonical SHA-256 equality; size, timestamps, path, object ID, or optional evidence alone cannot authorize it.
4. Folder and two-sided absence/common authority are distinct from file-content authority.
5. A whole Drive batch becomes learned only after all pages and the terminal token are durable.
6. Advancing ingestion may never discard the only durable fact needed for an unresolved earlier path; multiple learned batches remain durable until safely reduced.
7. Duplicate logical paths and ambiguous mutation outcomes remain explicit.
8. Existing-object remote updates cannot silently destroy an intervening version and later be labeled conflict-free based on final writer bytes.
9. Remote create retries reuse one durable reserved identity.
10. Observation is read-only; migration/stamping is explicit mutation.
11. Staged local content is verified before old target displacement; create and replace recovery authority are distinguishable.
12. `dispatch-authorized` is durably written before an external mutation call and means the mutation may have occurred even if the call had not yet started when the process died.
13. Pending/uncertain intent is consumed on restart before new automatic mutation.
14. Events accelerate reconciliation but do not authorize absence/deletion.
15. Cancellation is advisory; correctness survives cancellation never being observed.
16. Automatic merge is resource-bounded and fail-closed.
17. Semantic validation always has a fail-closed representation for a newly discovered contradictory state.
18. PR #33 operation-local stale isolation, pending-intent retirement, per-pass observation coherence, scoped uncertainty, and diagnostic privacy remain intact.

## 5. Workstream-base semantics

The following identities are deliberately different:

- **contract version**: semantic label `phase6-sync-foundation-v1`;
- **pre-continuation contract checkpoint**: historical implementation checkpoint `8b575e7439fdd601166e3bdb6e335992364da3fc`;
- **current candidate branch head**: advances as contract/tests/governing artifacts/evidence are corrected;
- **supervisor-approved workstream base SHA**: one exact final repository snapshot selected externally after independent approval.

The worker prompts will provide the approved SHA. Every A–G branch must start from that one SHA, which must contain the final contracts, architecture, freeze candidate, ownership manifest, adversarial matrix, re-entry state/handoff, tests, and evidence. No artifact in this repository attempts to contain its own future commit SHA.

## 6. Implementation discretion

Owning workstreams may choose private data structures, helpers, storage encoding, bounded retry/backoff, batching, and algorithms provided the frozen semantics and cross-platform constraints hold. They may add workstream-private types outside `src/contracts/**` and workstream-local fakes/adapters inside their permitted test namespace.

They may not:

- redefine semantic generation as persistence revision;
- collapse intermediate/terminal Drive tokens;
- replace unresolved learned remote history with only the newest batch;
- use path as remote identity or silently pick a duplicate candidate;
- interpret final writer bytes as proof that an in-place remote overwrite was conflict-free;
- treat unknown mutation outcome as retryable-not-applied;
- treat a file as common without canonical SHA-256 equality;
- erase create/replace distinction from local transaction pre-state;
- persist a stage saying mutation could not have happened after dispatch became possible;
- use event timing as self-mutation proof;
- swap unverified local content;
- require cancellation for crash correctness;
- bypass exact BASE/destructive authority;
- continue with a semantic contradiction merely because no dedicated named issue code exists;
- advance learned/converged state merely to silence retries.

## 7. Contract change request

If an approved workstream cannot meet its acceptance criteria using this surface, it must stop and submit a `CONTRACT CHANGE REQUEST`. It must not modify or shadow the contract locally.

```text
CONTRACT CHANGE REQUEST
Workstream / agent:
Approved workstream base SHA:
Contract version:
Affected contract:
Current limitation:
Why the required end state cannot be implemented:
Required semantic capability:
Proposed minimal contract change:
Affected workstreams:
Compatibility and migration consequences:
New/changed adversarial tests:
```

The supervisor decides whether to reject the request, amend the foundation centrally, or serialize affected work before parallel work resumes.

## 8. Approval state

This is **not** an operative freeze and is not supervisor-approved. Parallel implementation remains unauthorized until the independent reviewer explicitly approves one exact candidate head and identifies that exact SHA as the workstream base.
