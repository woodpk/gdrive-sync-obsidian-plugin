# Architecture — Cross-Platform Hardening and Stage 3 Readiness

## Inherited architecture

The frozen shared contracts established by WS-01 are inherited. This workstream may implement behind those contracts but may not silently redefine them.

## Workstream-owned contracts and invariants

No new product semantics are introduced. Phase 6 validates and hardens all requirements and all `INV-001` through `INV-020` against the complete implementation.

## Dependency direction

Phase 5.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.
