# Phase 6 Synchronization Contract Freeze Candidate

Status: **candidate only — supervisor approval pending**  
Contract version: `phase6-sync-foundation-v1`  
Foundation implementation SHA: `PENDING_FOUNDATION_IMPLEMENTATION_COMMIT`  
Branch: `phase6-sync-architecture-foundation`

This manifest does not authorize parallel implementation. After independent approval, the listed shared contracts become frozen inputs to the later workstreams.

## 1. Frozen files

- `src/contracts/common.ts`
- `src/contracts/synchronization-foundation.ts`
- existing contract files consumed by the workstreams:
  - `src/contracts/state.ts`
  - `src/contracts/snapshot.ts`
  - `src/contracts/plan.ts`
  - `src/contracts/local-vault.ts`
  - `src/contracts/google-drive.ts`
  - `src/contracts/execution.ts`
  - `src/contracts/conflict.ts`
  - `src/contracts/status-audit-actions.ts`
  - `src/contracts/index.ts`

Later agents must not modify `src/contracts/**` independently. Compatibility adapters belong in the owning workstream, not in frozen contracts.

## 2. Frozen semantic guarantees

| Contract | Guarantee | Consumers |
|---|---|---|
| `PersistenceRevision` | Sequences serialized state-document CAS only; it is not BASE/plan authority. | C, D |
| `SemanticStateGeneration` | Changes when synchronization authority changes, independently of journal-only persistence. | C, D |
| `ExactBaseAuthority` | History-dependent/destructive work binds to exact path, semantic generation, and BASE fingerprint. | C, D |
| `PathConvergenceState` | Per-path convergence/attention/conflict remains separate from remote feed progress. | C, D, E |
| `RemoteChangeProtocolPage` | Intermediate `nextPageToken` and terminal `newStartPageToken` are distinct, complete-page states. | A, C, D |
| `RemoteIngestionCheckpoint` | Terminal token represents a completely learned, durable batch, not universal path convergence. | A, C, D |
| `RemoteLogicalPathResolution` | Same-path object multiplicity is explicit; no arbitrary winner. | A, D |
| `RemoteMutationIdentity` | Create has durable reserved ID/intent; update has exact object/revision intent. | A, C, D |
| `RemoteMutationOutcome` | Applied, not-applied, and unknown are distinct; unknown is never ordinary retry success. | A, C, D |
| `ReliableRemoteMutationPort` | Exposes reserved create and explicit update outcomes with cancellation. | A, D |
| `RecoverableOperationIntent` | Durable stage and identity are sufficient for restart reconciliation before new mutation authority. | C, D |
| `RestartRecoveryDirective` | Noncommitted/ambiguous stages reconcile physical reality; verified effect may finish state commit. | C |
| `LocalMutationTransaction` | Staging, verification, backup, swap, and cleanup boundaries are durable and recoverable. | B, C, D |
| `LocalMutationProvenance` | Self-generated events correlate by exact operation/transaction/result, never timing alone. | B, E |
| `SynchronizationCancellationSignal` | Cooperative cancellation can propagate without becoming crash-correctness authority. | A, B, D, E, F |
| `SynchronizationLifecycleState` | No new work begins while suspending/suspended/unloading. | B, E |
| `SynchronizationFaultPoint` | Deterministic crash injection exists at journal/mutation/verification/commit and local-swap boundaries. | A, B, C, D, G |
| `TextMergeResourcePolicy` | Unknown/oversized inputs fail closed to preservation/conflict rather than unbounded merge. | D, F |
| `SemanticStateValidator` | Semantic inconsistencies are explicit recovery issues, not trusted shape-valid state. | C |

## 3. Fixed cross-contract invariants

1. Persisted-document CAS and semantic synchronization authority remain distinct.
2. Exact BASE evidence, not general state availability, authorizes history-dependent actions.
3. LOCAL==REMOTE with current canonical/unambiguous proof may heal obsolete BASE.
4. A whole Drive batch becomes learned only after all pages and the terminal token are durable.
5. Learned change progress does not falsely mark unresolved paths converged.
6. Duplicate logical paths and ambiguous mutation outcomes remain explicit.
7. A remote create retry reuses one durable reserved identity.
8. Observation is read-only; migration/stamping is explicit mutation.
9. Staged local content is verified before the old target is displaced.
10. Pending/uncertain intent is consumed on restart before new automatic mutation.
11. Events accelerate reconciliation but do not authorize absence/deletion.
12. Cancellation is advisory; correctness survives cancellation never being observed.
13. Automatic merge is resource-bounded and fail-closed.
14. Path-local failure isolation and global recovery/destructive gates from existing Phase 6 remain intact.

## 4. Implementation discretion

Owning workstreams may choose private data structures, helpers, storage encoding, retry backoff, batching, and algorithms provided the frozen observable semantics and cross-platform constraints hold. They may add workstream-private types outside `src/contracts/**`.

They may not:

- redefine semantic generation as persistence revision;
- collapse intermediate/terminal Drive tokens;
- use path as remote identity;
- silently pick a duplicate candidate;
- treat unknown mutation outcome as retryable-not-applied;
- use event timing as self-mutation proof;
- swap unverified local content;
- require cancellation for crash correctness;
- bypass exact BASE/destructive authority;
- advance learned/converged state merely to silence retries.

## 5. Contract change request

If an approved workstream cannot meet its acceptance criteria using this surface, it must stop and submit a `CONTRACT CHANGE REQUEST` to the supervisor. It must not modify or shadow the contract locally.

Required format:

```text
CONTRACT CHANGE REQUEST
Workstream / agent:
Foundation version / SHA:
Affected contract:
Current limitation:
Why the required end state cannot be implemented:
Required semantic capability:
Proposed minimal contract change:
Affected workstreams:
Compatibility and migration consequences:
New/changed adversarial tests:
```

The supervisor decides whether to reject, amend the foundation centrally, or serialize the affected work before parallel work resumes. Every affected branch must then rebase/restart from the newly approved foundation according to supervisor direction.

## 6. Approval state

This is not yet an operative freeze. It becomes authoritative only when the independent supervisor returns explicit approval for the exact foundation implementation SHA recorded above.

