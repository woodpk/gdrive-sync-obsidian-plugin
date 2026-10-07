# Architecture — Repository Foundation and Frozen Shared Contracts

## Inherited architecture

## 4. Shared Contracts That Must Be Frozen Before Parallel Work

Phase 1 must establish stable shared behavioral contracts for the following concepts before Phases 2, 3, and 4 begin in parallel. Exact interface/type names remain implementation discretion and must be determined from the repository created during Phase 1.

### 4.1 Snapshot and Observation Contract

The shared representation must distinguish local and remote existence, successful observation versus unreadable/inaccessible state, content/change evidence, stable remote identity, prior trustworthy base state, tombstone/deletion history, file stability, enumeration completeness, and identity/path ambiguity.

### 4.2 Synchronization Plan Contract

The shared plan representation must support the target specification's complete operation vocabulary, including no-op, upload/create, upload/update, download/create, download/update, rename/move, clean merge, unresolved conflict, recoverable deletion/trash, blocked/unsafe action, and recovery-required state. Planned operations must carry preconditions and enough reason/evidence metadata for preview, execution validation, testing, safety policy, and audit.

### 4.3 Local Vault Boundary Contract

The synchronization core must interact with the local vault through a boundary capable of safe enumeration, read, write/replace, rename/move, recoverable deletion, path validation, configuration classification, and change observation without depending directly on desktop-only APIs.

### 4.4 Google Drive Boundary Contract

The synchronization core must interact with Google Drive through a boundary capable of managed-root identity, stable Drive IDs, file/folder CRUD semantics, identity-preserving moves, recoverable trash, content transfer, metadata, incremental changes, complete reconciliation listing, retry/rate-limit signaling, and remote protocol/version information.

### 4.5 Durable State Contract

The state boundary must represent trustworthy base/history, device and vault identity, remote-object mapping, tombstones, change cursors, checkpoint/operation status, schema version, recovery state, and enough integrity information to distinguish valid state from missing, corrupt, incompatible, or uncertain state.

### 4.6 Conflict and Merge Contract

The planner/executor boundary must distinguish clean merge from unresolved conflict and must preserve provenance sufficient to retain both complete conflicting versions. No shared contract may encode newest-timestamp-wins semantics.

### 4.7 Execution Result and Commit Contract

Operation results must distinguish durable success, retryable failure, blocked/unsafe state, cancellation, stale-precondition invalidation, and uncertain outcome. Successful synchronization state may be committed only after the underlying mutation is durable and transfer integrity is verified.

### 4.8 Status, Audit, and User-Action Contract

The product surface must be able to consume stable status/plan/conflict/recovery/audit semantics without reimplementing synchronization policy in the UI. User actions such as Execute, conflict resolution, destructive-plan approval, pause/resume, and Verify/Reconcile must flow through shared product contracts rather than bypass the planner/executor.

### 4.9 Parallel Ownership Rule

After Phase 1, the Phase 2 agent owns synchronization semantics and operational-state implementation; the Phase 3 agent owns Google Drive and OAuth implementation; the Phase 4 agent owns Obsidian-local/platform/configuration implementation. A parallel agent must not independently change a frozen shared contract. Any required contract change must be returned to the supervising lineage, reconciled centrally, persisted, and communicated to all affected workstreams before dependent work continues.


## Workstream-owned contracts and invariants

- Preserve the target specification's authority over donor code.
- Preserve mobile-safe dependency direction.
- Freeze snapshot, plan, local-vault, Drive, state, conflict, execution-result, status, and audit semantics before parallel work begins.
- Keep product policy in synchronization/planning contracts rather than transport or UI adapters.
- Ensure no shared interface embeds timestamp-winner, unsafe deletion, broad Drive-scope, desktop-token-transfer, or other superseded donor semantics.

## Dependency direction

None beyond the authoritative Stage 1 artifacts and donor/source grounding.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.
