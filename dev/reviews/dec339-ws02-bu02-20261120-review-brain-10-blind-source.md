# WS-02 / DEC-339 / BU-02 — Frozen independent blind production-source assessment

**Reviewer:** `review-brain-10`  
**Review phase:** Pass 1 — source-only, frozen **before** authored tests, prior independent findings, source history/changes or original PHX-CI evidence were opened  
**Feature:** v2-Aware Legacy Runtime and Cursor-Recovery Interoperability (BU-02 only)  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Frozen candidate SHA:** `346f087202d76df89411d7e8cd79b8eecd2167b0`  
**Frozen candidate Git tree:** `5bf2072ff7ff719b9fa8caab9c27d298b05548fc` (Git commit tree verified directly)  
**Feature branch:** `build/dec339-ws02-bu02-v2-legacy-cursor-safety-20261120`  
**Published incoming state:** `7bfbf48b08f35426a9ae24d1717fb21c66627513`, feature-local `handoff-count: 1`, sender BUILDER, recipient REVIEWER; remote branch HEAD equals incoming state.

## Normative requirements and scope

The BU-02 neutral planning task `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu02-v2-legacy-cursor-2026-11-20.md`, locked DEC-339, WS-02 architecture and Target System Specification `CHANGE-005`, `STATE-009`–`STATE-015` and `INV-001`/002/003/009/015/016/019 establish a small but material runtime wiring contract. The existing shipping *legacy* planner must persist canonical authority using a v2-aware IndexedDB byte-store adapter which does not force an upgrade merely by opening a v1 pairing database, yet can read/write existing schema v2. An ordinary legacy unfenced cursor or vault/device identity change must atomically invalidate any already active inventory control, leaving inventory advisory rather than authoritative. Existing BASE, backup, identity, durable intent/effect and cursor checks must survive; no planner/executor replacement, inventory activation, provider dispatch, live schema migration or release is authorized. A later WS-02 gate separately covers real multi-WebView IndexedDB scheduling, broader cursor-writer inventory and local-hint recovery.

## Independently inspected frozen production source

**P1-01 Runtime adapter selection — conforms.** `src/product/runtime.ts` import near line 18 and constructor near lines 253–267 instantiate `new IndexedDbInventoryAwareStateByteStorage(pairingStorageKey("brain-google-drive-sync", current))` inside the existing `PersistentSynchronizationStateStore` with original schema policy `1`, original `this.host.diagnostics`, and the unchanged `SynchronizationStateAuthorityAdapter`. Product planning/scheduling, Drive boundary and recovery setup are not replaced. No inventory open or v2 schema migration is triggered by this constructor selection.

**P1-02 Safe schema interoperability — conforms.** `src/state/indexeddb-inventory-authority-storage.ts` lines 130–159 opens `indexedDb.open(databaseName)` *without a forced version*, creates only the existing `sync-state` object store if necessary on a new database, and closes/retries on versionchange, error and blocked open. Therefore new legacy pairings can remain v1 while an existing upgraded pairing can read the same canonical state in v2. The separate explicit-v1 legacy adapter `src/state/indexeddb-state-storage.ts` continues to reject a downgrade when schema v2 exists.

**P1-03 Canonical bytes and transactional integrity — conforms.** The v2-aware adapter reads from `sync-state/current-state`, retains byte-wise CAS in a single transaction and writes backups under separate keys in the same store. `src/state/persistent-state-store.ts` retains original trust/integrity parsing, durable authority, canonical BASE/intent/cursor semantics and CAS-based persistence. The runtime does not adopt inventory as an independent decision authority.

**P1-04 Stale inventory invalidation — conforms for relevant fields.** `src/state/indexeddb-inventory-authority-storage.ts` lines 13–35 evaluates the old/new canonical envelope's `state.vaultIdentity`, `deviceIdentity` and `changeCursor`. Both `write()` (lines 95–104) and successful `compareAndSwap()` (106–119) place any `inventory-control/active` invalidation and authoritative byte replacement in the *same* read-write transaction spanning `sync-state` and `inventory-control`. The failure-to-match CAS does not update either record. A missing/not-ready inventory pointer is not promoted by the legacy writer. Merely opening the byte store does not make dormant inventory actionable.

**P1-05 Existing v2 inventory publication — outside new wiring, guarded.** `src/state/indexeddb-inventory-storage.ts` preserves additive `DB_VERSION=2` and the separate authority-plus-inventory atomic publication; BU-02 does not install or enable that coordinator in ProductRuntime.

## Blind findings / risks to assess in Pass 2

1. **No demonstrated production-source acceptance blocker** within the bounded new runtime adapter wiring and already-extant storage primitives.
2. **M-01 (deferred integration, not a BU-02 defect):** a real browser/WebView upgrade blocker and inter-context `versionchange` race cannot be proved by static source alone. This remains for a separate, later WS-02 gate and should not be presented as already proven.
3. **M-02 (test adequacy question):** `inventoryRelevantState()` compares only cursor/vault/device identity for ready-inventory invalidation. That matches the specifically authorized BU-02 unfenced cursor/identity updates; tests must show current-state invalidation on an actual `SynchronizationStateAuthorityAdapter.saveTrusted()` path and no accidental inventory activation. Additional state, scope and local-hint invalidation is reserved for later BUs.
4. **M-03 (fail-closed verification question):** verify that an unsuccessful CAS preserves both canonical bytes and active inventory; backup, pending durable effects and schema version must survive v2-aware restart.

**Frozen provisional verdict:** **SOURCE-LEVEL PASS, subject to authored test/10-family and exact-source PHX-CI assessment.** This is not final feature acceptance, does not qualify live operations and does not authorize broader WS-02 or DEC-339 integration.

## Blind separation disclosure

The committed neutral planning task and feature-specific YAML handoff metadata also contain Builder-maintained implementation/evidence status, and the required read exposed some of that metadata incidentally. Their test/run claims were not used to reach this independent source finding. Prior to freezing/publishing this report, **no authored tests, full PHX-CI evidence, prior reviewer findings or source history/diff were inspected**. Subsequent findings belong to a separate final report; this blind report must not be rewritten after Pass 2.
