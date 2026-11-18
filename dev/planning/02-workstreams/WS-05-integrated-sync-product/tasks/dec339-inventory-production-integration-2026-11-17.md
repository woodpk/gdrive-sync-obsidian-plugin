# DEC-339 — Minimal Production Inventory Integration

**Date:** 2026-11-17; **alignment correction:** 2026-11-17  
**Status:** Owner-directed **planning only**. Dormant inventory software is on `master`; the shipping runtime still uses the legacy assembler and IndexedDB v1 state adapter. **No** implementation dispatch, live pairing/database migration, Drive/vault activity, physical testing, installation, activation or release is authorized here.

## Goal and existing components

Use the existing **device-local metadata inventory for every in-scope LOCAL file/folder and its known managed REMOTE counterpart**. Verified remote metadata may feed the current snapshot assembler; persisted local metadata is **advisory only**. **Retain** fresh local enumeration and stability checks, trusted BASE/history, the existing planner, three-way merge/conflict resolution, durable-intent recovery, authoritative executor and full Drive reconciliation. Inventory never authorizes deletion, mutation, BASE, or recovery.

Authority: [Target Specification §7.9](../../../01-target-system/target-system-specification.md), [DEC-339/340/341/342/343](../../../../authority/decision-register.yaml) and the [reviewed DEC-339 design, especially §§4, 8, 11–12](../../../../research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md). Historical combined DEC-339/DEC-340 review was **REJECT** for deferred DEC-340-01 (verification-integrity). Software-only promotion to master did **not** authorize activation or release.

**Reuse, do not rebuild:**
- **WS-02:** `indexeddb-inventory-storage.ts`, `indexeddb-inventory-authority-storage.ts`, `verified-inventory-integration.ts`, validators and **`verified-local-inventory.ts` (`VerifiedLocalInventoryCoordinator`)**. Local rows must be scoped to the same effective exclusions, refreshed from fresh vault enumeration, and invalidated on local changes/resume. They cannot prove absence or local stability.
- **WS-03:** `inventory-metadata-source.ts`, `verified-metadata-inventory-reader.ts`; use the existing production authenticated `drive.file` boundary, not another OAuth client.
- **WS-05:** `inventory-backed-snapshot-assembler.ts`, `verified-inventory-planning-projection.ts`; retain `snapshot-assembler.ts` for full/recovery fallback.
- **Later, separate gate:** D339-06 `inventory-targeted-convergence-read.ts` remains a **DEC-339 objective**, **deferred but not cancelled**. It may replace an eligible remote verification **read only** after dedicated proof-equivalence, PHX-CI qualification, independent review and Owner authorization. Do not change the executor lifecycle in this initial integration.

## Minimal dependency-ordered sequence

| Step / owner | Work and gate |
| --- | --- |
| **1. WS-02 — storage safety** | Qualify v1→v2 IndexedDB migration, blocked upgrades, backup and **v2-aware legacy/rollback mode**; an old v1-only binary is not rollback-safe. Account for **every** canonical cursor writer, including `persistLearnedRemoteBatch`, `commitCursor` and state-store APIs. Pair inventory generation+cursor in one transaction or invalidate unusable inventory; preserve BASE and pending effects. |
| **2. WS-03 — remote metadata seam** | Connect the already-implemented provider reader to **existing** authenticated Drive transport. Preserve two-domain full baseline, paginated Changes continuity, ID/parent/path occupancy, root-wide provenance, `incompleteSearch` and explicit unknown/inaccessible outcomes; no scope expansion or remote writes. |
| **3. WS-02/05 — storage-only shadow stage** | In **isolated test state**, exercise additive storage, baseline/Changes publication and `VerifiedLocalInventoryCoordinator` refresh/invalidation. Keep the **legacy planner/executor** as sole behavioral authority. **Never publish shadow inventory or its canonical cursor into a live production pairing**; live migration needs separate Owner approval. |
| **4. WS-05 — observation-only comparison** | Maintain a baseline plus Changes in isolated/explicitly authorized observation mode, and compare inventory-backed versus existing LOCAL/REMOTE/BASE observations, plans and failures without inventory-based dispatch. Require **exact equivalence** on complete, unambiguous fixtures; ambiguous/partial cases may be **more conservative, never more permissive**. Missing proof or disparity requires safe fallback or block, not optimistic planning. |
| **5. WS-05 — gated planner cutover** | After equivalent observation evidence, wire one **default-off, opt-in** inventory assembler/refresh owner into `ProductRuntime`. Preserve current Changes-learning → outstanding-intent recovery → reassembly-if-changed lifecycle, fresh LOCAL enumeration, BASE, preconditions and full/recovery reconciliation. If inventory cannot prove the required horizon, fall back to complete physical reconciliation **or block**. Leave targeted executor read optimization off. |
| **6. WS-07 / independent review — qualify before activation** | **Software changes:** exact-source build/tests/artifact checks via existing pinned **PHX-CI** (DEC-338), then blind-first independent Reviewer acceptance. **Operational BVP scenarios:** run the existing BVP interface **directly**, not through PHX-CI (DEC-350), using Windows and the existing iPhone/iPad simulation by default (DEC-347); mark simulated results as simulated. Compare actual request purpose/count, wall/HTTP latency and memory/storage against the **current incremental Changes path** and full reconciliation where relevant. Genuine iOS/hardware behavior remains **unverified** until separately authorized physical testing. |

## Non-negotiable stops and release boundary

- The inventory is **device-local**; never sync its rows/cursors as ordinary vault/config files. Same-name siblings and app-scoped `drive.file` visibility never establish global uniqueness or absence.
- Wrong account/root/device/scope, cursor gaps, corruption, ambiguous ancestry, incomplete listings, uncertain effects, pending intents or failed root-wide provenance **block or require proven full fallback**. Do not weaken existing pre-/post-mutation and independent convergence checks.
- Preserve tested **v2-aware legacy-observation rollback** after any approved upgrade. Do not reset unknown state, erase evidence, or assume old binary compatibility.
- **DEC-340-01** remains an uncorrected/deferred verification-integrity finding until independently resolved; PHX-CI development artifact observations are **not** release-approved artifact hashes (DEC-340–343).
- S09/`data.json` integrity and physical acceptance, exact-artifact release approval, live migration/physical testing and installation/release are **independent Owner gates** under DEC-342 and later governing decisions. Recheck their current disposition; this plan does not satisfy or waive them.
- No GitHub Actions, extra planner/executor, second BVP runner, independent verification framework, frozen-core/budget change, or change to historical accepted Phase-2/3/5 software/evidence.

**Ownership:** This is **one WS-05 integration planning task** coordinating WS-02, WS-03, WS-05 and WS-07; not a new workstream or a repeat of D339-01–11 builds. On separately authorized implementation dispatch, divide work into the **fewest execution-sized, dependency-safe Build Units**, bind exact source SHA/writable paths and retain the mandatory Builder→PHX-CI→independent Reviewer sequence. Historical decisions/reviews and unrelated WS-07 state remain intact.
