# Architecture — Core Synchronization Semantics and Durable State

## Inherited architecture

The frozen shared contracts established by WS-01 are inherited. This workstream may implement behind those contracts but may not silently redefine them.

## Workstream-owned contracts and invariants

- `PLAN-001` through `PLAN-009` planning semantics.
- `CHANGE-001` through `CHANGE-003` local/base change truth.
- `FIRST-001` through `FIRST-005` first-sync decision semantics; product workflow completion occurs in Phase 5.
- `STATE-001` through `STATE-017` operational-state semantics.
- `CONFLICT-001` through `CONFLICT-011` conflict/merge semantics at the domain level.
- `MOVE-001`, `MOVE-003`, and `MOVE-005` identity/evidence semantics.
- `DELETE-001` through `DELETE-010` destructive-safety semantics.
- `XFER-005` checkpoint semantics and the state-facing portion of `XFER-001`/`XFER-004`.
- `INV-001` through `INV-009`, `INV-015`, `INV-016`, and `INV-019` as core invariants.


## Approved metadata-inventory evolution (dormant software; cutover pending)

WS-02 owns the durable device-local metadata inventory, distinct from authoritative BASE/history, in Target Specification §7.9. Persist stable file/folder and parent mappings with revisions/provenance, observation coverage/freshness, and crash-consistent change-cursor incorporation. Missing, stale, partial, ambiguous, or corrupt inventory cannot establish absence or authorize destructive decisions. Prove safe migration/reconstruction before activation; do not retroactively reopen accepted Phase-2 evidence.

## Dependency direction

Phase 1 only.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.

## DEC-339 implementation boundary (2026-11-17)

The [reviewed architecture](../../../research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md) now has dormant inventory contracts, IndexedDB v2 storage, inventory-aware byte adapter, baseline/incremental coordinator and validation. **Do not rebuild these modules.** WS-02's remaining contribution is to qualify v1→v2 migration/rollback, all legacy cursor writers, atomic inventory+cursor publication/invalidation, pending-intent preservation, and the existing `VerifiedLocalInventoryCoordinator` for device-local in-scope file/folder hints. Local rows are refreshed using fresh enumeration, invalidated on local changes/resume, and never prove absence or file stability. Trustworthy BASE/history remains separate.

Use the [single WS-05 integration plan](../WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md). Existing accepted Phase-2 authority is not reopened.

## DEC-364 / DEC-339 BU01-F03 — bounded continuity (2026-11-24; historical pre-research design)
Reuse existing IndexedDB generation, lease, coverage, publicationSnapshot, prepareRemoteRebaseline and publishAtomically lifecycle. Salt the policy fingerprint to distinguish old receipts from new eligibility; bind account/app/grant epoch, device/vault, roots, protocol/schema/corpus, scope and authority revisions. Same-token empty replay reuses generation without churn; changed cursor requires durable batch and atomic CAS. Rebaseline cannot skip learned history. Unknown visibility fails closed.
Canonical prospective design: `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`. Documentation only; no authorization to build.

### DEC-365 — operative research-supported design
Use policy-salted continuity namespace, exact app/grant and durable revision binding. Retain full baseline and periodic/explicit recovery; detected inconsistencies invalidate. Silent provider faults remain a residual observational limitation, not an indefinite prerequisite. See the canonical F03 technical design §2.1. Earlier pending-proof and documentation-only restrictions are superseded for implementation; activation, live use and release remain unauthorized.
