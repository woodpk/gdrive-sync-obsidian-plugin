# Verification Plan — Core Synchronization Semantics and Durable State

## Objective completion evidence

- Deterministic automated tests cover the complete reconciliation matrix required by Target Specification §13.2 using local/remote fakes.
- Tests prove clock skew cannot alter conflict/winner classification.
- Tests prove no-base absence, unreadable/unknown observation, corrupt state, or partial knowledge cannot become deletion authority.
- Tests prove first-sync deletion cannot occur.
- Tests prove true text conflict, binary conflict, and delete-vs-modify preserve required content.
- Tests prove stale-device/tombstone logic prevents unsafe resurrection or destructive authorization.
- Tests cover identity-preserving rename classification and ambiguous-rename refusal.
- State tests cover corruption, incompatible versions, checkpoint semantics, migration safety, clone/restore identity concerns, and crash-ordering around durable commits.
- Circuit-breaker tests distinguish ordinary small deletions from suspicious destructive plans and require approval/checkpoint semantics for the latter.
- Core tests run without live Google Drive or a real Obsidian vault.

## Verification authority

Authoritative software-change acceptance is through the pinned PHX-CI under **DEC-338**. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.

## DEC-339 integration-specific evidence (2026-11-17)

Through existing PHX-CI, prove v1/v2 upgrade, blocked/version-mismatched opens, backup and tested rollback-aware legacy mode, cursor CAS/writer races, interrupted publication, preserved BASE/intents and safe invalidation. Also verify `VerifiedLocalInventoryCoordinator` captures **all in-scope local file/folder hints** from fresh enumeration, invalidates on file change/resume/scope or generation drift, and **never** treats unreadable/absent hints as authoritative deletion or stability evidence. The [single WS-05 integration plan](../WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md) defines the dependent cutover gates. This documentation update does not execute tests or authorize activation.

## DEC-364 / DEC-339 BU01-F03 — bounded continuity (2026-11-24; historical pre-research design)
Ten-family mapping in F03 §9; PHX-CI verifies crash/CAS, repeat unchanged, cursor history, policy change, stale lease, wrong pairing, restart and rollback, no partial publication.
Canonical prospective design: `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`. Documentation only; no authorization to build.

### DEC-365 — operative research-supported design
Add no-census normal-path and same-cursor/no-churn assertions plus fault injection for detected discrepancy, crash/CAS and policy/permission changes. Silent feed omission is tested through targeted-effect safeguards and periodic/explicit reconciliation, not impossible immediate detection. See the canonical F03 technical design §2.1. Earlier pending-proof and documentation-only restrictions are superseded for implementation; activation, live use and release remain unauthorized.
