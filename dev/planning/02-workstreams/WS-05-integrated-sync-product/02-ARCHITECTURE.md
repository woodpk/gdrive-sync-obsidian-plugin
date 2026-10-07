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

## Dependency direction

Phases 2, 3, and 4, all completed against Phase 1 shared contracts.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.
