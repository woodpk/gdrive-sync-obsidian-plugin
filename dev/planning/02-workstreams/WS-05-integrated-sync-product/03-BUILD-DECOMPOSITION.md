# Build Decomposition — Integrated Synchronization Product and User Workflows

## Status

The original project was constructed before adoption of the canonical workstream directory standard. The accepted Phase 5 definition below is therefore preserved as this workstream's source decomposition. Existing accepted implementation is not reopened merely by this migration.

For future unfinished or corrective work, the active supervisor must split work into execution-sized build units against current repository reality before dispatch; durable task prompts, if genuinely needed, belong only under this workstream's optional `tasks/` directory.

## Accepted source decomposition

## Integrated Synchronization Product and User Workflows

### 9.1 Objective

Integrate the Phase 2 synchronization/state engine with the Phase 3 Google Drive/OAuth boundary and Phase 4 Obsidian local/platform boundary to produce the complete user-facing synchronization product defined by the target specification.

### 9.2 Starting Assumptions and Prerequisites

- Phases 2, 3, and 4 have independently passed their acceptance criteria.
- Shared contracts from Phase 1 remain authoritative or have been centrally revised and persisted by the supervisor lineage.
- No parallel workstream has introduced unreviewed contract drift.

### 9.3 Required End State

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

### 9.4 Principal Contracts and Invariants Introduced or Preserved

- Complete product realization of `SYS-001` through `SYS-008`.
- Complete `SYNC-001` through `SYNC-013` behavior.
- Execution realization of `PLAN-001` through `PLAN-009`.
- Product realization of `FIRST-001` through `FIRST-007`.
- Integration of all `STATE`, `XFER`, `CONFLICT`, `MOVE`, `DELETE`, `CONFIG`, `FAIL`, `PRIV`, `ASSET`, and `LIFE` requirements through their established boundaries.
- `UI-001` through `UI-008`.
- All `INV-001` through `INV-020` must remain true in the integrated system.

### 9.5 Dependencies

Phases 2, 3, and 4, all completed against Phase 1 shared contracts.

### 9.6 Acceptance Criteria

- End-to-end automated integration scenarios cover first sync, additional-device pairing, ordinary local edit, ordinary remote change, offline edit/reconnect, text merge, true text conflict, binary conflict, rename/move, deletion, delete-vs-modify, suspicious bulk destruction, recovery mode, cancellation, and stale-precondition re-planning.
- Manual and automatic synchronization demonstrably use the same planning semantics; no alternate unsafe mutation path exists.
- Status, preview, conflict, recovery, audit/history, notification, pause/resume, and Verify/Reconcile flows operate against real product state rather than UI-only mock behavior.
- Transfer verification precedes authoritative success-state commit in integrated tests.
- Auth revocation, wrong account, missing remote root, corrupt state, lost cursor, partial remote listing, local unreadability, disk/quota exhaustion, network/rate failure, invalid path, and repeated per-path failure produce the specified product response.
- First-sync and corrupt-state integration tests prove destructive propagation remains disabled until trustworthy state exists.
- The integrated product builds successfully and remains loadable on both desktop and mobile Obsidian targets.

### 9.7 Non-Goals

- Do not add features outside the target-system specification.
- Do not optimize away safety checks merely to improve throughput.
- Do not perform final large-scale mobile/performance/fault hardening that requires the complete integrated system; that belongs in Phase 6.
- Do not perform Stage 3 independent validation within the construction phase.

