# WS-02 / DEC-339 / BU-04 — Corrected R2 independent blind production-source assessment

**Reviewer:** `review-brain-10`  
**Phase:** Blind/source-only assessment of the exact corrected candidate; frozen before inspecting authored corrective tests, comparison/history, or original R2 PHX-CI reports.  
**Feature:** Immediate Advisory-Hint Visibility Barrier During Asynchronous Invalidation; F-01 corrected candidate only.  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Frozen corrected source:** `8850dab0970862783f4a7e5beb4f214b83dd4acc`  
**Frozen source tree:** `14e2d7aa2d0507abb60b2aed5e7155fe409795ac`; exact Git commit/tree identity verified using GitHub.  
**Incoming handoff:** count **3**, sender BUILDER, recipient REVIEWER, `dev/state/current-state.yaml` at state commit and branch head `abb1ffd41f12b0305ded9ec6b82ec06fa14db7df`.

## Authoritative scope and requirements

The bounded BU-04 plan `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu04-advisory-hint-visibility-2026-11-20.md`, locked DEC-339, and WS-02 architecture require immediate coordinator-mediated denial of old local advisory hints on file change, resume, vault-ready and effective scope changes, even before IndexedDB invalidation commits; denial across a racing read; and safe restoration only after fresh, complete and authoritative local observation. Local hints must never prove absence, stability, BASE, remote truth, or authorize destructive effects. This BU cannot activate inventory in shipping ProductRuntime, or approve broader WS-02 completion or DEC-339 cutover.

## Source-only corrected behavior

1. `src/state/verified-local-inventory.ts` lines 19–32 introduces `invalidationFailed` (sticky) and `advisoryReady` (initially **false**). A newly constructed coordinator cannot inherit advisory authority from persisted hints without conducting its own complete current-scope enumeration.
2. `trackInvalidation()` lines 108–131 first increments the change epoch, revokes advisory readiness, and sets pending **synchronously**. Synchronous errors set the fault latch; rejected async jobs set the latch in `catch`; `finally` only removes the finished job and recomputes pending, **not** the fault latch. Success of a different overlapping job cannot itself clear a previous failure. The event subscriber swallows a rejected promise but the fault state remains observable at the read seam.
3. `readAdvisoryHint()` lines 142–156 returns `recovery-required` when the fault latch is set and `stale` when not ready/pending; it also rechecks epoch, fault, and gate after awaiting the original identity-fenced raw read. A rejected IDB invalidation can no longer expose a previously persisted complete local marker through this coordinator after its temporary pending gate clears. This directly addresses F-01's causal path.
4. `refresh()` lines 34–101 first revokes advisory readiness; checks for pending jobs before and after obtaining a trusted authority snapshot; performs fresh complete enumeration and filters current included paths; verifies epoch/generation/cursor/persistence/semantic authority before durable replacement and guards the post-publication race. It clears the fault and makes advisory hints readable **only after** a successful replacement and no observed racing invalidation. Incomplete, stale, and exception paths do not clear the fault and route invalidation through the same tracked mechanism.
5. The underlying `src/state/indexeddb-inventory-storage.ts` still persists local-marker invalidation in `LOCAL_POINTER` alone. Its direct `readLocalHint` is not gated by a different coordinator's process-local state, a deliberately deferred integration boundary. `src/product/runtime.ts` does not wire the coordinator or activate inventory. No producer of physical effects is introduced by the corrected seam.

## Independent blind conclusion and residual questions

**Provisional source verdict: F-01 causal defect CORRECTED; no proven blocker within BU-04's coordinator-mediated scope, subject to Pass 2 tests/evidence assessment.** The existing local pointer can remain complete on a rejected invalidation, but the corrected coordinator now latches denial until a fresh successful local-snapshot publication. This is a source-level assessment, not acceptance or a claim of PHX-CI qualification.

Pass 2 must specifically inspect (i) rejected lifecycle invalidation with the backing local marker still complete and subsequent read denied, (ii) overlapping failed/successful jobs, (iii) synchronous invalidation failures, (iv) failed/partial recovery and successful fresh replacement, (v) cold-instance default denial and (vi) test-oracle integrity. The full WS-02 cross-context IDB and all-consumer binding responsibilities remain **out of scope**.

## Blind independence disclosure

Review of the required neutral planning and feature-local state metadata incidentally exposed Builder-maintained repair and PHX-CI summary statements. These were **not used as proof**: the conclusion above follows from the exact production source and architectural constraints. No authored corrective test source, original R2 PHX-CI report/terminal file, source history/diff, or earlier independent report was fetched during this pass. The historical F-01 mechanism is already known from the previous review in this conversation and is not confused with new R2 evidence. This report is frozen; new findings belong only in the separate final report.
