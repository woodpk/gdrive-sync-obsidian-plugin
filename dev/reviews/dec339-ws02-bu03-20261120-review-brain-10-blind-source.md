# WS-02 / DEC-339 / BU-03 — Frozen independent blind production-source assessment

**Reviewer:** review-brain-10  
**Phase:** Pass 1, independent source-only, frozen before authored tests, prior findings, source history or PHX-CI evidence  
**Feature:** Local Inventory Scope-Change, Resume and Recovery-Hint Invalidation — bounded BU-03 only  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Exact frozen source SHA:** `3d9ea7fc7bb2c852aebf944a2b7e80462bc1cae2`  
**Exact source tree:** `3f3f81b96c36a056f89f8e18acf74d845ea5c47e` (independently verified via GitHub commit's `tree.sha`)  
**Incoming published state / remote head:** `f471ab5656ea10a15156c3f096ad07fac0a0746b`; BU-03 handoff-count **1**, sender **BUILDER**, recipient **REVIEWER**  
**Branch:** `build/dec339-ws02-bu03-local-hint-invalidation-20261120`.

## Neutral acceptance contract

The committed BU-03 planning and WS-02 architecture require explicit, awaited invalidation of *advisory local inventory hints* whenever a future owner changes effective local path scope, with safe refusal to publish an in-flight enumeration collected under the old scope. Existing local change, `resume` and `vault-ready` event handlers must invalidate local hints without revoking independent remote inventory proof, canonical BASE, cursor, operation intents or effects. Fresh local enumeration alone establishes live local state; local hints cannot prove absence, deletion, file stability or authorize physical effects. The unit expressly **does not connect this seam to the shipping ProductRuntime or every policy change callback** and does not activate the inventory. Whole-WS-02 real multi-WebView IndexedDB upgrades, cursor/rollback recovery, scope-owner integration and DEC-339 activation remain separate future gates.

Governing DEC-339, WS-02 architecture, TSS `CHANGE-005`, `STATE-009`–`STATE-015` and `INV-001/002/003/009/015/016/019` preserve fail-closed semantics and separation of non-authoritative inventory from trustworthy BASE.

## Frozen source findings

1. **Scope invalidation seam is explicit and awaited.** `src/state/verified-local-inventory.ts` lines 85–93 adds `invalidateForScopeChange(): Promise<void>`: it increments the shared coordinator `localChangeEpoch` *before* awaiting `inventory.invalidateLocalSnapshot("effective-local-scope-changed")`. The caller is obliged to await it. There is no automatic subscription to the actual policy owner and no claim of default-on inventory integration.
2. **In-flight scan is guarded.** The same source's `refresh()` (lines 28–83) captures `localChangeEpoch` and trusted remote generation/canonical cursor/revisions; after a complete local enumeration and before replacing the persisted snapshot it rechecks all of those plus the epoch (lines 62–71). It rechecks the epoch *again after* `replaceLocalSnapshot()` (lines 74–77), invalidating/returning stale on any intervening scope/change event. An absent/incomplete scan cannot be recorded as authority. Observed local `absent` records are never persisted as tombstones. An invalidation failure in the explicit seam propagates to its caller rather than falsely succeeding.
3. **Resume/vault-ready and local-change event handling already present.** `subscribe()` (lines 95–107) increments that same epoch and requests local invalidation on `onChange`, `resume` and `vault-ready`; it does not react to unrelated lifecycle events, initiate a remote request or mutate authoritative data. This existing asynchronous event path catches storage invalidation errors without surfacing them to the event caller: test coverage should establish correct fail-closed behavior when persistence succeeds, and the wider system must not rely on local hints as proof.
4. **Storage invalidation changes only a local pointer.** `src/state/indexeddb-inventory-storage.ts` `invalidateLocalSnapshot()` (lines 680–692) uses a `readwrite` transaction over **only `inventory-control`** and changes `LOCAL_POINTER` from complete to invalid if present. It does not write `sync-state/current-state`, canonical BASE, cursor, durable intents, `inventory-control/active`, remote inventory records or covered-generation proofs. `readLocalHint()` (lines 695 onward) requires a current complete local marker plus trusted canonical fence, pointer generation, cursor and revision; otherwise returns stale/unknown, not authoritative absence. `replaceLocalSnapshot()` (lines 625–677) retains the freshness/fence and canonical trust checks within its transaction.
5. **Effective path filtering remains a caller-supplied policy.** `src/product/path-scope.ts` dynamically evaluates included/excluded paths; `VerifiedLocalInventoryCoordinator` uses its injected `included` callback during fresh enumeration. `src/product/runtime.ts` does not instantiate or invoke that coordinator, so this bounded unit cannot be mistaken for a live production callback integration.

## Provisional finding / boundaries

**Source-only provisional verdict: PASS, subject to independent authored-test adequacy and exact qualified PHX-CI evidence.** No acceptance-defeating defect has been established within the narrowly authorized coordinator seam. The epoch/check-before-and-after publication pattern appropriately rejects an in-progress stale scope scan.

**M-01 — Deferred, explicit scope integration limitation:** A policy change not forwarded by the future runtime owner to `invalidateForScopeChange()` cannot automatically be detected. This is deliberately excluded from BU-03 and must be addressed before activation.

**M-02 — Deferred live scheduler / failure limitation:** `subscribe()` invalidation is fire-and-forget and catches errors. A storage outage could leave a previously complete local hint pointer until an authorized later invalidation succeeds. The coordinator does not elevate such hints to authoritative local state; the user-visible activation gate must ensure physical mutation never relies on these hints. Do not treat the synthetic event seam as proof of real WebView behavior.

**M-03 — Concurrency proof requirement:** Inspect tests to ensure an actual scope change during a withheld in-progress enumeration rejects stale publication, an excluded row becomes non-advisory and remote inventory proof/canonical state survive. No such test evidence has yet been opened in this phase.

## Isolation disclosure

The required neutral planning document and feature-local handoff metadata contain embedded Builder status and run identifiers; those fields were incidentally present when verifying the contract and recipient. They were not used as proof of source quality or verification. Prior to freezing this assessment, no authored tests, original PHX-CI result/terminal logs, source history/diffs, or prior independent review findings were inspected. The frozen preliminary conclusions here must not be retroactively edited after Pass 2.
