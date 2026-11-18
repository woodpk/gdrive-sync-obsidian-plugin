# DEC-339 — Minimal Production Inventory Integration

**Date:** 2026-11-17  
**Status:** Owner-directed **planning only**. DEC-339 software exists dormant on `master`; production still uses the legacy snapshot assembler and IndexedDB v1 state adapter. This plan does not authorize implementation dispatch, database migration, activation, live Drive/vault operations, physical testing, installation or release.

## Goal

Use the existing device-local inventory as a verified **remote-observation input** to the current sync pipeline. **Retain** the existing planner, three-way merge/conflict resolver, BASE/history, durable-intent recovery, authoritative executor and full reconciliation fallback. Inventory never independently authorizes mutation, deletion or BASE.

This follows [Target Specification §7.9](../../../01-target-system/target-system-specification.md), locked [DEC-339/342](../../../../authority/decision-register.yaml), and the [reviewed design](../../../../research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md). Historical DEC-339/DEC-340 combined review was **REJECT** for deferred DEC-340-01 verification-integrity finding. Software-only promotion to master did not authorize activation/release; changed integration source requires its own qualification.

## Reuse; do not rebuild

- **WS-02, state:** `indexeddb-inventory-storage.ts`, `indexeddb-inventory-authority-storage.ts`, `verified-inventory-integration.ts`, existing inventory validators and contracts.
- **WS-03, Drive:** `inventory-metadata-source.ts`, `verified-metadata-inventory-reader.ts`, existing production OAuth/`drive.file` transport. No second OAuth system.
- **WS-05, product:** `inventory-backed-snapshot-assembler.ts`, `verified-inventory-planning-projection.ts`; retain `snapshot-assembler.ts` for full/recovery fallback.
- **Deferred:** D339-06 `inventory-targeted-convergence-read.ts`. No executor mutation/recovery redesign in this integration.

## Smallest safe sequence

| Step | Owner | Work and acceptance |
| --- | --- | --- |
| **1. Storage safety** | WS-02 | Qualify IndexedDB v1→v2 migration, blocked upgrades, backup, and a tested **v2-aware legacy-observation/rollback mode**; an old v1-only binary is not rollback-safe. Audit **all** canonical cursor-changing paths, notably `persistLearnedRemoteBatch`, `commitCursor` and state-store writers. Publish generation+cursor atomically or invalidate inventory before it can be trusted. Prove BASE and pending durable effects survive. |
| **2. Drive metadata boundary** | WS-03 | Connect the already-implemented read-only metadata reader to **existing authenticated** Drive transport, reusing baseline, paginated Changes, stable IDs/parents, root-wide provenance and explicit unknown classifications; no new permission or remote writes. |
| **3. Compare in isolation** | WS-05 | Run inventory coordinator against isolated test state. Compare inventory-backed observations, plans and safety/fallback with the current assembler on identical inputs. **Do not publish a shadow baseline into a live production pairing**: existing coordinator publication changes canonical cursor state. |
| **4. Gated runtime composition** | WS-05 | Add a **default-off, opt-in** inventory assembler/refresh owner in `ProductRuntime`. Preserve fresh LOCAL enumeration, trustworthy BASE, recovery-first durable-intent handling, existing planner/executor, and full/recovery physical reconciliation. Stale, incomplete, ambiguous or unverified inventory must safely fall back or block. |
| **5. Acceptance and activation decision** | WS-07 and independent Reviewer | Use existing PHX-CI/BVP to verify exact-source safety equivalence, failure/restart cases, and **measured** request counts/latency versus the existing incremental Changes path (not only full enumeration). Measure relevant Windows/iOS memory/storage; obtain independent review and **separate explicit Owner** migration, activation and release decisions. |

## Stops and reversibility

- Keep an independently verified **legacy observation mode compatible with v2 storage** after any approved schema migration. The old complete reconciliation path must remain available. If its necessary proof fails, block/recover—do not downgrade to unsafe cached/incremental assertions.
- Wrong account/device/root/scope, cursor gaps, invalid coverage, duplicates/unknown parentage, incomplete app-visible search, root-wide provenance failure, pending recovery, or uncertain physical effect **never** establishes absence or authorizes dispatch.
- Do not change merge/conflict semantics, planner policy, executor mutation authority, recovery journals, OAuth scope or UI workflows in this cutover.
- Preserve existing PHX-CI and BVP governance, exact-source evidence under `dev/test-results/<runId>/` and current work-unit evidence where applicable. No GitHub Actions, new test framework, second planner/executor, or task-specific verification system.

## Ownership and dispatch

**One WS-05 integration task** coordinates WS-02, WS-03 and WS-07 contributions; no new workstream and no restart of implemented D339-01–11 units. Any authorized Builder dispatch must bind the then-current source SHA, minimal writable paths and independent review/PHX-CI gates. Historical accepted Phase-2/3/5 scopes, decisions, review evidence and unrelated active WS-07 work remain unchanged.
