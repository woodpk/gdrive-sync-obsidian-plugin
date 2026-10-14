# Scope — Integrated Synchronization Product and User Workflows

## Authorized responsibility

- The user can complete guided first-device setup, same-device authentication, remote creation/pairing, vault/device identity establishment, exclusions review, first-sync preview, explicit execution, and successful base establishment.
- Additional devices can independently authenticate, explicitly pair to the correct BRAIN remote, and safely reconcile their local vault using safe-union/stale-device semantics.
- Manual `Sync now`, configurable startup/resume sync, local-change-triggered sync, periodic remote reconciliation, pause/resume, and bidirectional normal operation function through one shared planning/execution path.
- Manual synchronization always previews before execution; automatic synchronization executes only ordinary safe plans and blocks conditions requiring user intervention.
- The executor revalidates operation preconditions, uses real local/remote adapters, verifies transfers, commits durable state in the required order, handles cancellation, and re-plans stale work.
- Remote changes during a run invalidate affected work; local changes during a run are captured for a subsequent pass.
- Conflicts create and retain deterministic preserved alternatives; the user can keep local, keep remote, keep both, accept clean merge where relevant, or manually resolve. Resolution becomes new authoritative content and propagates normally.
- Suspicious destructive plans are blocked before mutation, provide a reviewable plan and recoverable checkpoint, and require explicit approval without a global unsafe force bypass.
- Recovery mode provides actionable reconstruction/preview rather than silent reset.
- The product exposes required current status, meaningful notifications, bounded privacy-safe audit/history, conflict/recovery management, and on-demand Verify/Reconcile Vault.
- Failure modes from the target specification are surfaced coherently without impairing local editing.
- Device removal/deauthorization and plugin lifecycle behavior remain non-destructive.

## Starting assumptions and prerequisites

- Phases 2, 3, and 4 have independently passed their acceptance criteria.
- Shared contracts from Phase 1 remain authoritative or have been centrally revised and persisted by the supervisor lineage.
- No parallel workstream has introduced unreviewed contract drift.

## Explicit exclusions

- Do not add features outside the target-system specification.
- Do not optimize away safety checks merely to improve throughput.
- Do not perform final large-scale mobile/performance/fault hardening that requires the complete integrated system; that belongs in Phase 6.
- Do not perform Stage 3 independent validation within the construction phase.

## Boundary rule

Implementation within this workstream remains subordinate to the target-system specification, the decision register, inherited repository contracts, and dependency ownership recorded in `00-WORKSTREAM.md`.
