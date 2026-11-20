# WS-02 / DEC-339 / BU-04 — Frozen independent blind production-source assessment

**Reviewer:** review-brain-10  
**Review phase:** Pass 1 BLIND, frozen before authored tests, previous findings, Builder evidence narratives, source-history comparisons or PHX-CI evidence files were opened  
**Feature:** Immediate Advisory-Hint Visibility Barrier During Asynchronous Invalidation  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Frozen qualified source SHA:** `4c0cc689b9c949969f5fda82a96a14b5394e5fd0`  
**Frozen qualified source Git tree:** `1eb7d975f6504bfcde2cd2130eef02f0413d475a`; directly verified against GitHub commit/tree  
**Incoming feature handoff:** count 1, sender BUILDER, recipient REVIEWER, state commit `31176ab5b676f758121fdb2438261a8b92ad350c`, matching current remote branch HEAD `build/dec339-ws02-bu04-local-hint-visibility-barrier-20261120`.

## Normative boundary

Under `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu04-advisory-hint-visibility-2026-11-20.md`, the coordinator-mediated `readAdvisoryHint(fence,path)` must hide pre-event advisory hints **immediately** on `onChange`/`resume`/`vault-ready`, even before asynchronous IndexedDB invalidation finishes. It must fail closed when an invalidation races an in-flight read, and `refresh` must refuse overlapping invalidation until safe. The persistent inventory/canonical state is unchanged, inventory stays advisory and dormant, and direct store callers are outside this new coordinator seam. The WS-02 architecture and locked DEC-339 forbid cached local hints from establishing absence, stability, BASE or destructive-mutation authority. No real runtime wiring, provider/vault dispatch, physical testing, database migration or planner activation is authorized.

## Independently observed source

1. `src/state/verified-local-inventory.ts` lines 19–27 introduce coordinator-local `invalidationPending` and `invalidationJobs`, while retaining `localChangeEpoch`.
2. Lines 97–107 `trackInvalidation()` increases the epoch and sets the pending gate **synchronously** before awaiting the backing `invalidateLocalSnapshot()` promise. `subscribe()` (129–139) uses it for local change, resume and vault-ready events; `invalidateForScopeChange()` (109–111) awaits it.
3. `readAdvisoryHint()` (118–127) checks pending gate before the raw store read, captures the epoch, delegates to `readLocalHint()`, then rejects if the epoch/gate changed while the read was outstanding. `refresh()` (30–90) rejects pending invalidation at entry, after authority lookup and before/after local-snapshot replacement.
4. `src/state/indexeddb-inventory-storage.ts` lines 679–689 implements backing invalidation as a transaction on the local marker `LOCAL_POINTER` only. Its `readLocalHint()` (691–720) can continue to return `advisory` if that durable marker remains `complete` and otherwise matches authority/identity. None of the added coordinator fields is persisted across instances.
5. `src/product/runtime.ts` remains on the legacy planner; it does not instantiate or wire the local-hint coordinator. The work is an inert software-only seam, not a live product barrier.

## BLIND FINDING F-01 — MAJOR / CORRECTION REQUIRED: rejected invalidation re-exposes stale hints

**Requirement violated:** The BU-04 purpose is a *fail-closed visibility barrier* for stale local hints while asynchronous invalidation is unresolved. A failed durable invalidation must not silently make the old complete marker safe again.

**Exact cause:** `trackInvalidation()` lines 101–105 invokes `job.finally` and **unconditionally removes the job and clears `invalidationPending` when the promise settles, including rejection**. For `subscribe()`, the rejection is swallowed by `.catch(() => undefined)` at line 132. There is no persistent or coordinator-local `invalid`/recovery-required latch. Once the rejected job settles, `readAdvisoryHint()` sees no pending jobs and delegates straight to the backing `readLocalHint()`. If the IDB invalidation failed before changing `LOCAL_POINTER`, the old `complete` marker can still return `advisory` for a path whose local state/scope is now stale.

**Deterministic source-level interleaving:** (1) Fresh local hint for file F exists with local marker `complete`. (2) Vault resume or file-change event fires; epoch advances and pending gate correctly hides F. (3) The backing invalidation transaction rejects (e.g., IndexedDB transaction/open failure) before persisting `invalid`. (4) `trackInvalidation().finally` clears the gate, callback catches/swallow error. (5) Consumer calls `coordinator.readAdvisoryHint(fence,F)` before any successful refresh; it returns the still-persisted old `advisory` hint. No physical change or malicious actor is needed. The same lifetime issue applies to failed awaited `invalidateForScopeChange()`; its rejection may be noticed by the caller but does not protect later reads.

**Required correction:** Make invalidation failure *sticky fail-closed* at the coordinator consumer boundary, surviving promise settlement. Do not expose previously published advisory hints after any failed invalidation until a separately proven fresh full enumeration and successful local-snapshot replacement have repaired the marker under current authority/epoch/scope. Consider whether a permanently stale gate vs explicit fault latch/recovery state best avoids deadlock while preserving legitimate retry. Do not rely on the changed backing storage transaction having succeeded when it rejected. Add a focused adversarial test with a previously readable hint, a rejected/delayed backing invalidation, then a read **after rejection**: expect `stale` or `recovery-required`, never `advisory`. Verify successful repair is possible without dropping canonical/remote state, and overlapping invalidations cannot release the latch early.

## Additional bounded qualifications

- The pending barrier is coordinator-instance-local; raw `IndexedDbInventoryObservationStore.readLocalHint()` and other coordinator instances do not inherit it. The BU planning explicitly treats this as a future product-integration routing obligation, not an implementation defect in this dormant seam.
- Even successful `subscribe()` invalidation is not an awaited lifecycle barrier at the owner boundary. This BU can support a coordinator-mediated immediate read refusal; it does not prove future caller wiring or cross-context visibility.
- The original neutral planning and state metadata embed Builder/result summaries that were incidentally visible during mandatory neutral-source/identity inspection. They were not used as proof. No authored test code, prior review, full PHX-CI output or source-history diff was opened before this report.

**Frozen provisional verdict:** **CORRECTION REQUIRED — F-01**, pending independent Pass 2 examination of exact qualified tests/evidence. The frozen report is not the final handoff; any reclassification must be recorded in a separate final report, not by rewriting this source assessment.
