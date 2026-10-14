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

Authoritative executable acceptance is through PHX-CI under DEC-334. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.
