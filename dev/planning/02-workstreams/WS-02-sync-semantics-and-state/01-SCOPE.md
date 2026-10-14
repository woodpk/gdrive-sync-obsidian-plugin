# Scope — Core Synchronization Semantics and Durable State

## Authorized responsibility

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

## Starting assumptions and prerequisites

- Phase 1 is complete.
- Shared snapshot, plan, state, conflict, execution-result, and adapter contracts are frozen.
- Google Drive and Obsidian implementations may still be incomplete; this phase must be testable through fakes/contract implementations.

## Explicit exclusions

- Do not implement live Google OAuth or Drive REST transport.
- Do not implement concrete Obsidian vault filesystem behavior.
- Do not implement final UI, onboarding, or settings screens.
- Do not embed platform-specific policy in the domain engine.

## Boundary rule

Implementation within this workstream remains subordinate to the target-system specification, the decision register, inherited repository contracts, and dependency ownership recorded in `00-WORKSTREAM.md`.
