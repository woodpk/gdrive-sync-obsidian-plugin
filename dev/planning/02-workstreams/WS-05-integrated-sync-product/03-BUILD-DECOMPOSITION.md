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

## DEC-362 corrective prerequisite (2026-11-18)

[Stable Drive-ID Content-Update Correction](tasks/stable-drive-id-content-update-correction-2026-11-18.md) is the immediate prerequisite to DEC-339 planner cutover. WS-05 owns integration of WS-03's corrected same-ID Drive update into the existing authoritative executor, durable-intent/recovery lifecycle, BASE commit, clean-merge propagation and cross-device convergence.

Required end state:

- existing-file upload/update and clean merge retain the same established `remoteObjectId`;
- authoritative state cannot commit a successor/replacement ID for an ordinary content revision;
- ambiguous update outcome resolves against the exact original ID and intended revision/content evidence;
- sequential second-device pull, concurrent clean merge, restart/recovery and Changes ingestion converge without an artificial identity transition;
- existing planner/conflict/deletion/move semantics remain unchanged except where the defective replacement-ID assumption is removed.

Do not begin DEC-339 planner activation until this corrective unit has exact-source PHX-CI PASS and independent acceptance.


## DEC-339 remaining integration (2026-11-17)

**Canonical plan:** [Minimal Production Inventory Integration](tasks/dec339-inventory-production-integration-2026-11-17.md). D339-05/06 modules already exist dormant. After WS-02 storage/cursor **and local-hint** qualification and WS-03 authenticated metadata transport, complete **isolated storage-only shadow** and **observation-only parity** stages before wiring **default-off** inventory-backed assembly with safe physical fallback; measure safety and usefulness before independent review and separately Owner-authorized cutover. **Defer, do not cancel, D339-06 executor targeted reads** to their separate proof/activation gate. Keep the accepted planner, executor and Phase-5 behavior.

## DEC-364 / DEC-339 BU01-F03 — bounded continuity (2026-11-24; historical pre-research design)
Step 6 retains the Owner-approved two BUs. BU-01 includes prior F01/F02 repairs, F03 contract/provider/storage/planner correction, then BVP integration, comparative measurements, PHX-CI and independent review. BU-02 is complete simulated lifecycle after BU-01 acceptance/closeout. F03 serial checkpoints follow contract→provider→durable integration→planning→tests/metrics; not extra BUs.
Canonical prospective design: `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`. Documentation only; no authorization to build.

### DEC-365 — operative research-supported design
Research hold resolved; implementation authorized, not started. Begin increment A contract freeze, then provider, durable integration and planning, then test/metrics and qualification. BU-02 remains after acceptance. See canonical F03 design §2.1. Earlier pending-proof and documentation-only restrictions are superseded for implementation; activation, live use and release remain unauthorized.

## Step 6 BU-01 accepted and closed — 2026-11-24

Current status superseding the preceding implementation-not-started checkpoint: **BU-01 software-only PASS WITH MINOR FINDINGS, Builder closeout complete**, exact accepted source `c6dac8033567cb617f598b2340c5ee61ccb9dd9e`, original PHX-CI `284f768b-9b6d-40bc-b99a-619c66e39f9f`, final independent review `35a4573d94d2f89757bb2d482833d5e32df7956b`, handoff-count 2 retained. See [canonical Step 6 plan and closeout](tasks/dec339-step6-metadata-bvp-2026-11-24.md). M01 scoped Changes residual and M02 limited simulated planning measurements remain nonblocking and must carry forward. BU-02 full simulated multi-device lifecycle is not started and awaits separate Owner authorization; Step 6 remains incomplete. DEC-362 incorporation, D339-06, activation, migration, live/physical operations, installation, merge, promotion and release remain independently gated.
