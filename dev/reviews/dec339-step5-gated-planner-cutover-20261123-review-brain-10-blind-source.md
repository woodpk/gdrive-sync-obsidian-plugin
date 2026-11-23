# DEC-339 Step 5 — Gated Planner Cutover: Frozen independent blind source assessment

**Reviewer:** `review-brain-10`  
**Phase:** source-only BLIND, frozen before opening authored Step-5 tests, prior findings, Builder implementation narrative, source history/diff or original PHX-CI evidence.  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature branch:** `build/dec339-step5-gated-planner-cutover-20261123`  
**Exact frozen source SHA:** `85eef2acaab0244bb8a03b95598e5d2b3434b556`  
**Exact frozen Git tree:** `aea8f6e32225295efbc04023da9e37230a6e75ca`, verified from immutable GitHub commit.  
**Incoming state commit:** `cd3117d64aa48b113421083bf71a23e8f87044ab`; count **1**, owner BUILDER, recipient REVIEWER, branch HEAD matches.  
**Neutral normative feature plan:** `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step5-gated-planner-cutover-2026-11-23.md`.

## Normative contract

Step 5 is a **default-off, explicitly persisted, read-only planning-observation selector**. Off must construct existing `ProductSnapshotAssembler` without touching inventory. On may construct one `InventoryBackedSnapshotAssembler` using the same Drive/OAuth boundary, canonical authority, existing planner/controller/executor, a complete live-derived fence (vault, device, account, managed root, both actual domain roots, protocol, effective scope, schema v1), and advisory local-event/lifecycle invalidation. It must never create inventory baseline/Changes publication owner, activate targeted executor reads, migrate a live database or bypass durable Changes→recovery→reassembly→planning→verified-execution preconditions. An effective scope policy change must not preserve old hint authority or bypass full reconciliation. Missing/unverifiable inventory must fall back/stop conservatively.

## Positive source observations

1. `src/product/plugin-data.ts` extends settings with optional `verifiedInventoryPlanningEnabled`, explicitly default false; loading normalizes to true **only if literally true**, keeping legacy data off. Persistence uses existing serialized settings owner and no new UI control.
2. `src/product/inventory-planning-cutover.ts` has a single simple `selectPlanningAssembler(enabled,legacy,inventory)` that evaluates **only one** factory; `buildInventoryPlanningFence` requires the current opaque paired-account key and verified actual content/config domain IDs from the existing `GoogleDriveAdapter`, plus vault/device/root/protocol/scope/schema.
3. `src/drive/google-drive-port.ts` `observeManagedDomainRootIds` is read-only and first validates current paired account/managed root before returning the two actual provider domain root IDs; no second OAuth client or Drive scope appears. `src/product/path-scope.ts` computes a stable SHA-256 fingerprint over config directory, effective user exclusions, operational exclusions and portable paths.
4. `src/product/runtime.ts` retains a shared state database, authority, `ProductController`, existing `ProductionSynchronizationPlanner`/`DeterministicSynchronizationPlanner` and `ProductSynchronizationExecutor`. Gate-off selects ordinary snapshot assembler; gate-on uses `IndexedDbInventoryObservationStore(...,{allowSchemaUpgrade:false})`, so legacy v1 pairing is not upgraded merely by opting in. It constructs `InventoryBackedSnapshotAssembler` and a runtime-owned `VerifiedLocalInventoryCoordinator` with subscribed local/lifecycle invalidations, unsubscribing on disposal. Opportunistic local refresh is allowed only when a verified remote generation exists (the coordinator checks `publicationSnapshot` and active generation first).
5. The pre-existing inventory-backed assembler validates canonical cursor/fence/generation against provider and durable state, performs root-wide managed provenance and rechecks after assembly; full recovery and forced full reconciliation bypass inventory. Its listing/coverage paths do not supply effect authorization. No new shipping inventory baseline/Changes publication, direct executor read selector, or mutation authority is visible in Step-5 source.

## F-01 — MAJOR / potential acceptance blocker: cutover-gate setting change bypasses co-occurring mandatory scope and operational change handling

**Frozen source:** `src/product/runtime.ts`, `applySettingsChange(previous,next)` approximately lines 455–520.

The first conditional is:
```ts
if (previous.verifiedInventoryPlanningEnabled !== next.verifiedInventoryPlanningEnabled) {
  await this.initialize();
  return;
}
```
This **returns before** the method's existing `userExclusionPatterns` change handler, which durably sets `scopeReconcileRequired: true`, invalidates advisory local hints, and calls `controller.noteChangeDuringRun()`. It also bypasses the existing `syncPlanErrorsDirectory` relocation/journal protocol and scheduler/audit-setting refresh when those fields change in the same persisted settings transition.

**Concrete scenario:** Beginning with `verifiedInventoryPlanningEnabled=false`, `scopeReconcileRequired=false`, and an established canonical cursor/BASE, submit a single legitimate settings object that changes both `verifiedInventoryPlanningEnabled` to true **and** `userExclusionPatterns`. `applySettingsChange(previous,next)` calls `initialize()` and returns. A new runtime may be initialized with the new fingerprint (which correctly rejects old inventory rows) but the required `scopeReconcileRequired` marker is **never set** and the new controller is **never told** the scope changed. It can therefore use the existing canonical incremental route without the full reconciliation otherwise required for inclusion/exclusion changes. The old local coordinator is disposed, reducing hint exposure, but **this does not substitute for canonical scope reconciliation or running-change notification**.

Likewise, if `syncPlanErrorsDirectory` changes in the same update, the old journal/relocation branch never runs; a newly initialized attention store can observe the new location without executing the approved relocation protocol. There is no source-level assertion that one update can contain only the inventory setting; indeed `applySettingsChange` accepts entire previous/next `BrainSyncSettings` values, and the standard settings persistence layer accepts `patchSettings` and `mutateSettings` with multiple changed properties.

**Required narrow repair if in scope:** Preserve serialization and runtime reinitialization on gate toggle **without skipping** the existing scope-reconciliation marker, scope/lifecycle invalidation and operational relocation logic for co-occurring settings changes. No redundant inventory authority owner is needed. Add adversarial tests invoking `applySettingsChange` with gate+exclusion and gate+SyncPlanErrors-directory co-changes, showing identical required safety transitions to standalone changes. If the governance formally prohibits multi-setting updates, that precondition must be enforced at this API boundary rather than merely assumed.

This is a deterministic local settings-transition defect and is not covered by an Owner exception for provider concurrency risk. **Provisional: CORRECTION REQUIRED for F-01 unless Phase 2 proves a hard one-field transition contract or an already-enforced compensating precondition.**

## Other blind qualifications

**Q-01:** An asynchronous fire-and-forget local `currentFence().then(...this.localInventory?.refresh(...))` in initialization does not capture the particular coordinator instance; a retired initializer could complete against a newer coordinator if same pairing. Inventory identity and generation checks should prevent authority escalation, but lifecycle-race tests must determine whether unexpected advisory refresh writes can occur after teardown; no blocking defect yet established.

**Q-02:** Non-upgrading `indexedDB.open(databaseName)` can physically create an empty v1 database if called for a name that does not yet exist, even though the store rejects missing v2 schema. This is **not** an established live migration or canonical overwrite, but the term “no database change” must be used carefully: the promised invariant is no v1→v2 migration/no canonical mutation, not necessarily no empty DB object creation.

**Q-03:** `InventoryBackedSnapshotAssembler` can use the legacy incremental fallback under early uncertainty; this retains the preexisting authoritative planner but is not always a newly performed full physical enumeration. Preserve explicit full-reconcile/recovery fencing, and check negative cases in Phase 2.

## Provisional blind disposition

**SOURCE-LEVEL CORRECTION REQUIRED for F-01 unless the mandatory test/governance evidence resolves the co-occurring-settings bypass.** Other Step-5 source architecture broadly follows the approved default-off, one-planner, no-migration approach. Final review remains pending test adequacy, exact PHX-CI and source-integrity assessment. This report must remain unchanged after Phase 2.

**Blind-separation record:** The required neutral task document and feature-local `current-state.yaml` contain Builder-maintained implementation/verification claim fields, incidentally visible while establishing identity. They were not used as correctness proof. No authored Step-5 test file, PHX-CI result/terminal log, previous review verdict or source comparison/history was opened before this assessment was frozen.
