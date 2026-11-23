# DEC-339 Step 5 — Gated Planner Cutover: Final independent adversarial review

**VERDICT: CORRECTION REQUIRED — FEATURE NOT ACCEPTED**  
**Reviewer:** `review-brain-10`  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Source branch:** `build/dec339-step5-gated-planner-cutover-20261123`  
**Frozen reviewed source SHA:** `85eef2acaab0244bb8a03b95598e5d2b3434b556`  
**Frozen source Git tree:** `aea8f6e32225295efbc04023da9e37230a6e75ca`  
**Incoming state:** `cd3117d64aa48b113421083bf71a23e8f87044ab`, feature-local handoff count **1**, BUILDER→REVIEWER  
**Frozen blind report:** `dev/reviews/dec339-step5-gated-planner-cutover-20261123-review-brain-10-blind-source.md`, publication commit `380b760b5d18241d21f224f7223249f7dafee0be`  
**Normative plan:** `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step5-gated-planner-cutover-2026-11-23.md`.

## F-01 — MAJOR, acceptance-blocking: gate-toggle fast return bypasses other mandatory settings transitions

**Source:** `src/product/runtime.ts` `applySettingsChange(previous,next)`, approximately lines 455–520.

The **first** branch reinitializes and returns whenever the persisted `verifiedInventoryPlanningEnabled` gate changes:
```ts
if (previous.verifiedInventoryPlanningEnabled !== next.verifiedInventoryPlanningEnabled) {
  await this.initialize();
  return;
}
```

The remainder of this same method handles independent, required transitions: exclusion-policy changes set `scopeReconcileRequired: true`, invalidate advisory local inventory hints, and notify the controller that scope changed during a run; `syncPlanErrorsDirectory` changes journal and relocate operational CSV state with source/destination protection; scheduler/audit state also reacts to changed settings.

**Deterministic source counterexample:** Starting from a paired runtime with established BASE/cursor and `scopeReconcileRequired=false`, persist a single valid settings mutation changing `verifiedInventoryPlanningEnabled` from false to true **and** `userExclusionPatterns`. Call `applySettingsChange(previous,next)`. The method initializes and exits before setting the required full-reconciliation flag or notifying the controller of scope change. Fresh fence fingerprint protects against reusing old-scope inventory, but the **legacy authoritative incremental** snapshot route can continue under the old canonical scope policy/BASE without the required complete reconstruction. This is a distinct mandatory safety property. Similarly, a gate toggle with a `syncPlanErrorsDirectory` change bypasses the durable relocation journal and file movement, risking omission of operational error records or failure to protect both paths. No source enforces a one-setting-only `applySettingsChange` precondition; `PluginDataRepository.patchSettings` and `mutateSettings` explicitly allow multi-field transitions.

**Required narrow correction:** Rework gate-toggle reinitialization ordering so **all other changed-field safety transitions are executed exactly once** (or explicitly reject multi-field updates before committing them, if the Owner approves such an API restriction). In particular a simultaneous scope edit must durably require full reconciliation, promptly invalidate local advisory hints as applicable, and guard in-flight work; a simultaneous operational-errors-directory change must preserve the existing relocation journal and path protections. Keep the selector default off, one planner/controller/executor, non-migrating v1 behavior, and no second cursor writer. Add adversarial tests exercising actual `ProductRuntime.applySettingsChange` for both combined cases, including post-reinitialize state, durable settings, and proof that mandatory safety action did not get skipped. Test with the gate turning both on and off. Preserve accepted old lifecycle invariants.

**This is not covered by the narrower Owner DEC-363 provider concurrent-write risk exception.** No live Drive race, device concurrency or physical test is needed to demonstrate the source-level branch omission.

## Positive source and test findings

1. `src/product/plugin-data.ts` defines `verifiedInventoryPlanningEnabled?: boolean`, defaults false and restores true only when explicitly persisted true. Legacy data remains gate off. Existing serialized settings persistence remains the owner.
2. `src/product/inventory-planning-cutover.ts` evaluates only the selected assembler factory; `buildInventoryPlanningFence` combines vault/device identity, current paired Google account opaque binding, actual managed-domain root IDs from the existing adapter, managed root/protocol and effective deterministic scope fingerprint.
3. `src/product/runtime.ts` gate-off keeps original `ProductSnapshotAssembler`; gate-on constructs one `InventoryBackedSnapshotAssembler` with shared Drive boundary, authority, planner, controller and executor. It owns a `VerifiedLocalInventoryCoordinator`, subscribes to local and lifecycle events and unsubscribes during disposal. No separate OAuth client, cursor owner or inventory baseline publisher is added.
4. `IndexedDbInventoryObservationStore(...,{allowSchemaUpgrade:false})` refuses an established v1 schema rather than migrating to v2 on opt-in. Existing full/recovery assembly remains physical; verified inventory is advisory observation only and executor preconditions stay owned by the legacy controller.
5. The new `tests/integration/dec339-step5-gated-planner-cutover.test.ts` has **seven tests** for legacy defaults, selector off/on, fence fields, absent pairing/wrong vault, scope fingerprint, and v1 nonmigration. These are substantive and pass, but **none calls `ProductRuntime.applySettingsChange`** or performs combined scope/operational settings changes, so they do not close F-01. Selected preexisting runtime interleavings and plugin-data tests likewise do not exercise gate-plus-exclusion or gate-plus-relocation `applySettingsChange` transitions. The test file primarily tests the selector/fence functions rather than instantiated runtime assembly; direct runtime lifecycle assertions would also improve assurance.

## Original exact-source PHX-CI qualification

**Run:** `a344a2a4-2390-4721-bba0-7491260a0b9f`  
**Evidence-only direct child:** `e251de6c11ff471e4499113edaae70df3c59073c`  
**Original files:** `dev/test-results/a344a2a4-2390-4721-bba0-7491260a0b9f/result.md`, `result.json`, `terminal.log` and `dev/_ca-output.md`.  
**Pinned PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`.

Read original result Markdown/JSON/full terminal log **after** the blind report was published. They verify the exact source SHA/tree stated above, **13/13 required stages PASS**, focused **62/62 PASS**, full product **1354/1354 PASS**, typecheck/build/artifacts/repository PASS, original exit 0. `main.js` **1036802 bytes**, SHA-256 `e2940ba3c78cbef2ebcee2681a8449f2592d7024d8662fa2ed85b3282e2c3fe5`. Evidence is the exact implementation's **direct child**, changing only `dev/_ca-output.md` and the three run-evidence files, not tested production source or tests. Source history comparison from accepted Step-4 closeout `f936961a4b9dbcb8b23e887771d27bbba7e7ac55` is 23 commits ahead, none behind, with modifications confined to the expected runtime/Drive/scope/settings/inventory-storage modules, 7 new Step-5 tests, selected Step-4 boundary test improvements, focused selector, and `dev/**`. No weakening of source-bound PHX-CI guards or adoption of GitHub Actions found. Earlier `0e464e25-c193-417e-9398-2d5a050da727` was BLOCKED by a test/TypeScript product error and is retained separately, not called PASS.

**Important:** Valid exact-source PHX-CI PASS is evidence of completed asserted tests, **not** independent acceptance of an untested settings-transition bypass.

## Ten-family independent adequacy

| Mandatory family | Verdict |
| --- | --- |
| 1. Nominal | PASS for opt-in selector/fence helpers; direct production runtime gate integration test would strengthen proof |
| 2. Negative/boundary | **BLOCKER F-01:** combined gate+scope or gate+relocation transition silently skips safety handler |
| 3. Legal/forbidden transitions | **BLOCKER F-01:** scope reconciliation and operational relocation remain required even when gate changes |
| 4. Repetition/recovery | PARTIAL: legacy settings migration and existing runtime lifecycle tests pass, gate-toggling transitions not directly exercised |
| 5. Concurrency/staleness | PARTIAL: old runtime generation/disposal guarded; combined scope change bypasses run-change notification |
| 6. Persistence/integrity | PASS for default-off settings and existing-only v1 schema; F-01 can omit required durable reconciliation/relocation state |
| 7. Identity/security | PASS: paired-account/root/protocol/domain/scope fence with fail-closed missing key |
| 8. Contracts/compatibility | PASS for opt-in additive setting, existing Drive boundary and same planner/executor |
| 9. Architecture/invariants | PASS: no added cursor writer, targeted reads, live migration or inventory publication on construction |
| 10. E2E/fail-closed | **BLOCKER F-01:** software runtime can proceed after co-changing exclusions without required complete reconciliation |

## Other nonblocking follow-up

- **M-01:** The fire-and-forget initial local inventory refresh captures `this.localInventory` late, not the instance created by that initializer. A retired async fence may run a refresh on a newer coordinator; add lifecycle-epoch/instance capture if strengthened in a narrow repair, and test reinitialize/disposal races.
- **M-02:** Existing-only `indexedDB.open(name)` may create an empty database at an absent name, although it refuses v1→v2 migration and cannot activate untrusted inventory. Do not describe this as literally zero database-side effects.
- **M-03:** Early inventory uncertainty can fall back to legacy incremental assembly instead of forcing new full physical listing; this preserves historical authoritative behavior but requires full-reconcile/scope markers to remain correct. This makes F-01 more consequential.

## Final disposition and write restriction

**CORRECTION REQUIRED — DEC-339 STEP 5 NOT ACCEPTED** for frozen `85eef2acaab0244bb8a03b95598e5d2b3434b556`/`aea8f6e32225295efbc04023da9e37230a6e75ca`, due to independently source-demonstrable F-01. Builder should narrowly correct the skipped settings transitions, add adversarial runtime tests, publish a new exact frozen SHA/tree with substantive software-only PHX-CI qualification, preserve all prior evidence, and issue a new Builder→Reviewer handoff. Reviewer must independently recheck the changed source and test oracle in the next round. No accepted Step-4 work needs to be rebuilt.

**Explicit write boundary:** User permits Reviewer to write **only independent `dev/reviews/` reports**. Thus the reviewer does not edit `dev/state/current-state.yaml` or assert that handoff count 2/recipient BUILDER was already committed. Current feature-local count remains 1/recipient REVIEWER until an authorized state publisher carries this verdict into the handoff state; the prepared text handoff is not a fabricated committed state transition. No Reviewer source/test/script/evidence change or executable verification occurred.

No Step-6 authorization, `master`/PR #157 merge, inventory activation or live migration, physical Drive/vault/device operations, installation, promotion or release is granted.
