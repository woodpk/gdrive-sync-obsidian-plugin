# Build Decomposition — Core Synchronization Semantics and Durable State

## Status

The original project was constructed before adoption of the canonical workstream directory standard. The accepted Phase 2 definition below is therefore preserved as this workstream's source decomposition. Existing accepted implementation is not reopened merely by this migration.

For future unfinished or corrective work, the active supervisor must split work into execution-sized build units against current repository reality before dispatch; durable task prompts, if genuinely needed, belong only under this workstream's optional `tasks/` directory.

## Accepted source decomposition

## Core Synchronization Semantics and Durable State

### 6.1 Objective

Implement the deterministic synchronization decision model and the durable operational-state/recovery model that make data-safe bidirectional synchronization possible independently of concrete Google Drive and Obsidian I/O.

### 6.2 Starting Assumptions and Prerequisites

- Phase 1 is complete.
- Shared snapshot, plan, state, conflict, execution-result, and adapter contracts are frozen.
- Google Drive and Obsidian implementations may still be incomplete; this phase must be testable through fakes/contract implementations.

### 6.3 Required End State

- LOCAL + REMOTE + trustworthy BASE/history observations deterministically produce an explicit synchronization plan without mutating either side.
- Change truth uses identity, state, hashes/content evidence, and relevant metadata; timestamps remain advisory only.
- Safe-union first-sync semantics are implemented, including no first-sync deletion and preserve-both handling for divergent no-base collisions.
- Text concurrent modification supports BASE/LOCAL/REMOTE three-way merge classification; clean merges and unresolved conflicts are distinguished correctly.
- Binary conflicts and true text conflicts preserve both complete versions; delete-vs-modify preserves modification.
- Rename/move recognition is identity/evidence based and never guesses ambiguous identity.
- Attested deletion, tombstones, stale-device protection, recoverable-delete planning, destructive circuit breaking, and no-force-bypass policy are represented in the core planning/safety model.
- Persistent operational state supports vault/device identity, base/history, remote-object mappings, tombstones, operation/checkpoint state, schema/version information, recovery state, and backup/export evidence as required by the target.
- Missing, corrupt, truncated, incompatible, or internally inconsistent state is recognized as untrusted and enters non-destructive recovery rather than empty-base behavior.
- State persistence and operation bookkeeping are crash-consistent: durable state cannot claim success ahead of durable verified effects.
- Core logic supports cancellation, stale-precondition invalidation, later reconciliation, and per-path isolation semantics required by the target.

### 6.4 Principal Contracts and Invariants Introduced or Preserved

- `PLAN-001` through `PLAN-009` planning semantics.
- `CHANGE-001` through `CHANGE-003` local/base change truth.
- `FIRST-001` through `FIRST-005` first-sync decision semantics; product workflow completion occurs in Phase 5.
- `STATE-001` through `STATE-017` operational-state semantics.
- `CONFLICT-001` through `CONFLICT-011` conflict/merge semantics at the domain level.
- `MOVE-001`, `MOVE-003`, and `MOVE-005` identity/evidence semantics.
- `DELETE-001` through `DELETE-010` destructive-safety semantics.
- `XFER-005` checkpoint semantics and the state-facing portion of `XFER-001`/`XFER-004`.
- `INV-001` through `INV-009`, `INV-015`, `INV-016`, and `INV-019` as core invariants.

### 6.5 Dependencies

Phase 1 only.

### 6.6 Acceptance Criteria

- Deterministic automated tests cover the complete reconciliation matrix required by Target Specification §13.2 using local/remote fakes.
- Tests prove clock skew cannot alter conflict/winner classification.
- Tests prove no-base absence, unreadable/unknown observation, corrupt state, or partial knowledge cannot become deletion authority.
- Tests prove first-sync deletion cannot occur.
- Tests prove true text conflict, binary conflict, and delete-vs-modify preserve required content.
- Tests prove stale-device/tombstone logic prevents unsafe resurrection or destructive authorization.
- Tests cover identity-preserving rename classification and ambiguous-rename refusal.
- State tests cover corruption, incompatible versions, checkpoint semantics, migration safety, clone/restore identity concerns, and crash-ordering around durable commits.
- Circuit-breaker tests distinguish ordinary small deletions from suspicious destructive plans and require approval/checkpoint semantics for the latter.
- Core tests run without live Google Drive or a real Obsidian vault.

### 6.7 Non-Goals

- Do not implement live Google OAuth or Drive REST transport.
- Do not implement concrete Obsidian vault filesystem behavior.
- Do not implement final UI, onboarding, or settings screens.
- Do not embed platform-specific policy in the domain engine.

## DEC-339 work units — D339-01 bound for dispatch; later units design only

Ground in `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md`. After independent design review, capacity-size and SHA-bind: **D339-01** inventory contracts, invariants, proof result types and owner API; **D339-02** additive indexed storage, atomic generation/cursor publication and backup-safe migration; **D339-04** single-owner integration of storage with Drive deltas and recovery-safe publication. D339-01 precedes WS-03 and WS-05 consumers; D339-04 follows D339-02 and WS-03 D339-03. No work order may consume guessed predecessor state. Historical accepted Phase-2 scope stays closed.


### D339-01 dispatch binding (prepared, not yet executed)

- Pinned prompt document: `tasks/D339-01-inventory-contracts.md`, at planning source commit `ea96219e81fb8fc3cd57a48f6e64eb230c8b60de` (read by immutable commit, not moving branch).
- Exact implementation base: `44368eb7bb94b751c069c09a95012b9179155f0c`.
- Precreated implementation branch: `dec339/d339-01-inventory-contracts-01` at that exact base.
- Scope: additive inventory contract, pure validation foundation, focused deterministic tests and evidence only; exact writable path list and PHX-CI gates are in the task document. No D339-02–08 source implementation, production cutover, or physical test is authorized here.
- Status: **task prepared; agent not dispatched; code not implemented; verification not run**.
