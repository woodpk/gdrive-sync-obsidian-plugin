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


## Approved inventory-backed integration direction (planning only)

WS-05 integrates WS-02's local authoritative-state/inventory boundary with WS-03's incremental and targeted Drive observations (Target Specification §7.9), reducing redundant metadata requests without adding a second planner or execution engine. Every mutation still requires exact precondition/parent/occupancy evidence, durable intent, verified physical result before committed state, and fail-closed uncertainty handling. Stale data or cursor coverage triggers re-observation or conservative full reconciliation. This direction does **not** change the current S09A one-canary mutation authorization.

## Dependency direction

Phases 2, 3, and 4, all completed against Phase 1 shared contracts.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.
