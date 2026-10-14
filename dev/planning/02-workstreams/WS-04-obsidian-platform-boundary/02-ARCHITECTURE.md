# Architecture — Obsidian Local, Platform, and Configuration Boundary

## Inherited architecture

The frozen shared contracts established by WS-01 are inherited. This workstream may implement behind those contracts but may not silently redefine them.

## Workstream-owned contracts and invariants

- `SYS-002` through `SYS-004` and `SYS-007` at the platform boundary.
- Local-trigger/lifecycle portions of `SYNC-003`, `SYNC-004`, `SYNC-006`, `SYNC-007`, `SYNC-011`, and `SYNC-012`.
- Local-facing portions of `XFER-002`, `XFER-003`, and `XFER-006`.
- `FILE-001` through `FILE-015`.
- `CONFIG-001` through `CONFIG-009`.
- Local-facing portions of `MOVE-004` and recoverable deletion.
- `FAIL-001`, `FAIL-005`, `FAIL-006`, and `FAIL-007` at the local/platform boundary.
- `ASSET-001` through `ASSET-008`.
- `LIFE-001` and `LIFE-002`.
- `INV-003`, `INV-012` through `INV-014`, `INV-017`, `INV-018`, and `INV-020` at the local/platform boundary.

## Dependency direction

Phase 1 only. Phase 4 may execute in parallel with Phases 2 and 3.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.
