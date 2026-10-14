# Integrated Synchronization Product and User Workflows

**Workstream:** WS-05  
**Source lineage:** accepted Phase 5 from the original Stage-1 minimum sound build decomposition.

## Objective

Integrate the Phase 2 synchronization/state engine with the Phase 3 Google Drive/OAuth boundary and Phase 4 Obsidian local/platform boundary to produce the complete user-facing synchronization product defined by the target specification.

## Dependency position

Phases 2, 3, and 4, all completed against Phase 1 shared contracts.

## Required end state

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

## Acceptance boundary

The workstream is complete only when the required end state exists and the verification obligations in `04-VERIFICATION-PLAN.md` are satisfied. This artifact preserves the accepted phase boundary; it does not redefine product behavior.
