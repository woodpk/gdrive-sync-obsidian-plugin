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


## Approved metadata-inventory evolution (planning only)

WS-02 owns the durable device-local metadata inventory, distinct from authoritative BASE/history, in Target Specification §7.9. Persist stable file/folder and parent mappings with revisions/provenance, observation coverage/freshness, and crash-consistent change-cursor incorporation. Missing, stale, partial, ambiguous, or corrupt inventory cannot establish absence or authorize destructive decisions. Define safe migration/reconstruction before implementation; do not retroactively reopen accepted Phase-2 evidence.

## Dependency direction

Phase 1 only.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.

## DEC-339 detailed design — pending independent architecture review

The engineering design is persisted at `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md` (baseline `ce2a7accb80f12334ae50cbb73d46fb97dbe96fa`). WS-02 owns the shared inventory record/proof vocabulary, device-scoped IndexedDB v2 additive migration, indexed data, identity/coverage/freshness fences, shadow-generation CAS, and atomic inventory+cursor+compatibility-state transaction. Existing BASE/history, tombstones, durable intents and semantic-generation authority remain separate and cannot be modified by a cache hit. These interfaces must be frozen before dependent WS-03/05 coding. The design is not an implementation authorization or accepted review verdict.
