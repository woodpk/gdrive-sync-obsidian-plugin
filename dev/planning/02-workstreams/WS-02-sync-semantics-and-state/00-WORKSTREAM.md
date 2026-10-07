# Core Synchronization Semantics and Durable State

**Workstream:** WS-02  
**Source lineage:** accepted Phase 2 from the original Stage-1 minimum sound build decomposition.

## Objective

Implement the deterministic synchronization decision model and the durable operational-state/recovery model that make data-safe bidirectional synchronization possible independently of concrete Google Drive and Obsidian I/O.

## Dependency position

Phase 1 only.

## Required end state

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

## Acceptance boundary

The workstream is complete only when the required end state exists and the verification obligations in `04-VERIFICATION-PLAN.md` are satisfied. This artifact preserves the accepted phase boundary; it does not redefine product behavior.
