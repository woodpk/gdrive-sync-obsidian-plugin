# Architecture — Google Drive and OAuth Boundary

## Inherited architecture

The frozen shared contracts established by WS-01 are inherited. This workstream may implement behind those contracts but may not silently redefine them.

## Workstream-owned contracts and invariants

- `AUTH-001` through `AUTH-012`.
- `REM-001` through `REM-010`.
- `CHANGE-004` through `CHANGE-007`.
- Remote-facing portions of `XFER-001`, `XFER-002`, `XFER-004`, `XFER-007`, and `XFER-008`.
- Remote-facing portions of `MOVE-002` and recoverable deletion behavior.
- `FAIL-002` through `FAIL-004` for remote/API failure handling.
- `PRIV-001` through `PRIV-004` as applied to authentication, API, callback, and diagnostics.
- `INV-002`, `INV-010`, `INV-011`, and `INV-014` at the Drive/auth boundary.


## Approved Drive metadata-inventory boundary (planning only)

WS-03 provides exact managed-root/domain-scoped Google Drive file/folder ID, parent, revision, provenance, completeness and Changes API evidence for Target Specification §7.9. Drive permits same-name siblings; `files.generateIds` and creation with a reserved ID protect retry identity, **not** name/parent uniqueness. The existing managed-root, `drive.file` scope, duplicate-path detection, uncertain-outcome recovery and full reconciliation remain mandatory. Reuse proven mappings and narrow ID reads instead of repeated broad traversal only where completeness, uniqueness, current authority and convergence are preserved; record request attribution and validate equivalence through PHX-CI before optimization.

## Dependency direction

Phase 1 only. Phase 3 may execute in parallel with Phases 2 and 4.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.

## DEC-339 detailed design — pending independent architecture review

See `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md`. WS-03 owns managed-root/account/domain-verified two-domain baseline capture with pre-scan Changes token and post-scan catch-up; remote ID/parent/name/revision/provenance reads; paginated Changes classification with identity continuity; duplicate-sibling-aware targeted occupancy and convergence observations; and explicit partial/inaccessible/out-of-domain outcomes. It does not own the IndexedDB authority/CAS implementation or declare BASE/deletions. A reserved Drive ID is **not** a path-occupancy proof. Shared typed boundary is supplied first by WS-02 D339-01.
