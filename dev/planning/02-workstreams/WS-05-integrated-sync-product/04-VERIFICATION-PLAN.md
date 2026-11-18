# Verification Plan — Integrated Synchronization Product and User Workflows

## Objective completion evidence

- End-to-end automated integration scenarios cover first sync, additional-device pairing, ordinary local edit, ordinary remote change, offline edit/reconnect, text merge, true text conflict, binary conflict, rename/move, deletion, delete-vs-modify, suspicious bulk destruction, recovery mode, cancellation, and stale-precondition re-planning.
- Manual and automatic synchronization demonstrably use the same planning semantics; no alternate unsafe mutation path exists.
- Status, preview, conflict, recovery, audit/history, notification, pause/resume, and Verify/Reconcile flows operate against real product state rather than UI-only mock behavior.
- Transfer verification precedes authoritative success-state commit in integrated tests.
- Auth revocation, wrong account, missing remote root, corrupt state, lost cursor, partial remote listing, local unreadability, disk/quota exhaustion, network/rate failure, invalid path, and repeated per-path failure produce the specified product response.
- First-sync and corrupt-state integration tests prove destructive propagation remains disabled until trustworthy state exists.
- The integrated product builds successfully and remains loadable on both desktop and mobile Obsidian targets.

## Verification authority

Authoritative software-change acceptance is through the pinned PHX-CI under **DEC-338**. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.

## DEC-339 integration-specific evidence (2026-11-17)

Verify **two distinct preactivation stages**: (1) storage-only shadow/local-hint capture with no behavioral authority and (2) observation-only baseline plus Changes comparison without inventory-based dispatch. Compare legacy versus inventory-backed LOCAL/REMOTE/BASE snapshots, planner operations and destructive safety on identical inputs: **exact equivalence** for complete/unambiguous cases and **never more permissive** for ambiguous/partial cases. Verify fresh local enumeration remains authoritative despite persisted hints; cover cursor drift, provenance, incomplete scopes, restart/recovery, rollback-aware fallback and full reconciliation. Measure actual request counts/latency against the **existing incremental** path and relevant resource budgets. Qualify software through PHX-CI (DEC-338); conduct BVP operational scenarios **directly** (DEC-350) using Windows-first simulation (DEC-347). Physical iOS remains unverified without Owner authorization. D339-06 executor targeted reads remain a separate future proof gate. See [the integration plan](tasks/dec339-inventory-production-integration-2026-11-17.md).
