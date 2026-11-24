# Architecture — Integrated Synchronization Product and User Workflows

## Inherited architecture

The frozen shared contracts established by WS-01 are inherited. This workstream may implement behind those contracts but may not silently redefine them.

## Workstream-owned contracts and invariants

- Complete product realization of `SYS-001` through `SYS-008`.
- Complete `SYNC-001` through `SYNC-013` behavior.
- Execution realization of `PLAN-001` through `PLAN-009`.
- Product realization of `FIRST-001` through `FIRST-007`.
- Integration of all `STATE`, `XFER`, `CONFLICT`, `MOVE`, `DELETE`, `CONFIG`, `FAIL`, `PRIV`, `ASSET`, and `LIFE` requirements through their established boundaries.
- `UI-001` through `UI-008`.
- All `INV-001` through `INV-020` must remain true in the integrated system.


## Approved inventory-backed integration direction (dormant software; activation pending)

WS-05 integrates WS-02's local authoritative-state/inventory boundary with WS-03's incremental and targeted Drive observations (Target Specification §7.9), reducing redundant metadata requests without adding a second planner or execution engine. Every mutation still requires exact precondition/parent/occupancy evidence, durable intent, verified physical result before committed state, and fail-closed uncertainty handling. Stale data or cursor coverage triggers re-observation or conservative full reconciliation. This direction does **not** change the current S09A one-canary mutation authorization.

## Dependency direction

Phases 2, 3, and 4, all completed against Phase 1 shared contracts.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.

## DEC-362 stable remote identity prerequisite (2026-11-18)

The integrated executor must preserve an established managed file's Google Drive ID across ordinary content update and clean-text-merge propagation. The accepted execution lifecycle remains: reviewed plan → exact precondition revalidation → durable intent → provider mutation → independent convergence/content verification → authoritative BASE/state commit. **What changes is the remote mutation primitive:** an update to an existing logical file must target the existing `remoteObjectId`, not manufacture a replacement object and retire its predecessor.

Recovery must resolve uncertain outcomes against the exact established ID and durable intent. It may not infer identity succession from name/path equality. A newly generated Drive ID is valid for a true create, not as the normal next identity of an existing file. DEC-339 planner cutover/activation remains blocked until this correction is PHX-CI-qualified and independently accepted.

Canonical task: [stable Drive-ID content-update correction](tasks/stable-drive-id-content-update-correction-2026-11-18.md).


## DEC-339 minimal integration boundary (2026-11-17)

Dormant `InventoryBackedSnapshotAssembler` and the verified projection preserve the **same** planner and executor. WS-05 owns one default-off runtime assembly/refresh choice **after isolated storage-only shadow and observation-only equivalence stages**. Integrate WS-02's local metadata hints through the existing `VerifiedLocalInventoryCoordinator`, without treating them as absence/stability authority. Preserve the original full/recovery assembler, fresh LOCAL observations, BASE/history, durable-intent recovery and independent executor preconditions. WS-02 storage/cursor safety and WS-03 metadata transport must be qualified first; cached inventory never authorizes mutation or deletion.

Follow the [single integration plan](tasks/dec339-inventory-production-integration-2026-11-17.md). Keep D339-06 targeted executor reads disabled in the initial cutover, **but retain their future separately gated DEC-339 objective**; activation requires new exact-source verification, independent review and Owner approval.

## DEC-364 / DEC-339 BU01-F03 — bounded continuity (2026-11-24)
Inventory-backed planning consumes WS-02 verified generation plus WS-03 complete scoped replay/targeted evidence only under proven eligibility. Independent initial/final provider boundary and durable publication checks; no global census on eligible ordinary path, no cache-only mutation proof, no silent fallback. Unsupported/uncertain proof retains census or blocks. Explicit full/recovery remains physical.
Canonical prospective design: `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`. Documentation only; no authorization to build.
