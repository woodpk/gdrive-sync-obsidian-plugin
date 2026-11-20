# WS-02 / DEC-339 / BU-03 — Local Inventory Scope-Change, Resume and Recovery-Hint Invalidation

**Date:** 2026-11-20  
**Builder:** `build-brain-67`  
**Source baseline:** accepted BU-02 closeout `b4f764fe7993b944023ef28a7f601e776d6ae13d`  
**Branch:** `build/dec339-ws02-bu03-local-hint-invalidation-20261120`  
**Status:** **BUILDER-QUALIFIED; independent Reviewer final acceptance PENDING.** Full WS-02/DEC-339 integration gates remain incomplete.

## Scope and design

Extend the already implemented `VerifiedLocalInventoryCoordinator` with an **explicit awaited scope-change invalidation seam**. The caller must invoke `invalidateForScopeChange()` whenever the effective local path-inclusion/exclusion policy changes. Its local observation epoch advances *before* the existing store invalidation; in-flight full enumeration detects the epoch mismatch, refuses publishing a snapshot captured under the old scope and returns `stale`. The storage invalidates only the `LOCAL_POINTER`, not the independent remote inventory, BASE, canonical cursor, operation intents or effects. A new refresh must use fresh local enumeration and the new scope.

Also qualify the already implemented `subscribe()` invalidation behavior for `resume` and `vault-ready` lifecycle events. Neither event may allow stale local hints to authorize changes or revoke remote proof. On refresh after lifecycle invalidation, local hints remain advisory; normal planning still requires full physical local enumeration. This BU does **not** wire coordinator into live `ProductRuntime`, change the actual scope owner's callbacks, or activate inventory.

## Diff/requirements mapping

- Source: `src/state/verified-local-inventory.ts` — one explicit scope-change invalidation method; no planner/executor/provider changes.
- Tests: `tests/integration/dec339-local-observation-integration.test.ts` — old included path revoked on scope change and re-enumerated correctly; mid-enumeration scope change blocks stale publication; `resume` and `vault-ready` invalidate local hints while independent remote evidence remains readable.
- The separate original BU-01 and BU-02 acceptance and immutable PHX-CI evidence remain unchanged.

## Ten required test families and gates

1. Nominal: refreshed local hints reflect new included path set.
2. Negative: excluded stale row must never return `advisory` after a scope change.
3. State transitions: `advisory → stale → advisory/unknown` on invalidation and new enumeration.
4. Retry/recovery: refresh after invalidation restores eligible hints, does not restore excluded paths.
5. Concurrency/races: scope mutation during enumeration fails closed through epoch mismatch.
6. Persistence/integrity: local invalidation preserves remote inventory and canonical state; existing restart tests remain applicable.
7. Identity/security/trust: existing inventory identity fence and canonical checks unchanged; no local hint is deletion or absence proof.
8. Contracts/compatibility: existing `LocalVaultPort` observer, `IndexedDbInventoryObservationStore` API retained; add one coordinator notification method.
9. Architecture/invariants: no production cutover, no new planner/executor, no extra verification script or budget change.
10. End-to-end/fail-closed: local observation coordinator → IndexedDB advisory hint → invalidation → fresh scan tested in deterministic software; actual Drive/vault/device mutations not applicable or authorized.

**Proof boundaries:** Calls to the new scope-change seam from a future live scope owner still require a separate integration BU and default-off validation; not claimed by these tests. Reviewer M-01's real cross-browser/WebView IDB blocker/versionchange behavior and Reviewer M-02's remaining cursor writers and recovery/rollback remain deferred, explicitly required for full WS-02 acceptance. A scope change that an owner fails to report cannot be detected automatically by this coordinator; the future caller must bind all effective policy changes.

## Mandatory next gate

Run the **pinned PHX-CI** exact-source software-only operator `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1`, with frozen SHA, no physical dispatch. Do not run standalone tests, GitHub Actions or separate scripts. Correct failures and preserve evidence; then request an independent blind-first Reviewer assessment only after complete original PHX-CI PASS. No master/PR #157 merge, inventory activation, live DB migration, provider/vault operations, installation, release or physical testing.

## BU-03 original exact-source software qualification (2026-11-20)

- Qualified source `3d9ea7fc7bb2c852aebf944a2b7e80462bc1cae2`, exact source tree `3f3f81b96c36a056f89f8e18acf74d845ea5c47e`.
- Original pinned PHX-CI run `747e471f-fc04-4669-b69d-b34075c1c66a`, evidence-only publication `288a05c00a0be9ecda8f23fc4945c95ebb436d91`, `dev/test-results/747e471f-fc04-4669-b69d-b34075c1c66a/`.
- Read-back exact result: **13/13 stages PASS; focused 634/634 PASS; product 1321/1321 PASS; typecheck/build/artifact/repository PASS; exit 0; physical dispatch disabled.** Original evidence commit adds only evidence records, with no changes to source or tests.
- This completes **Builder software qualification of BU-03 only**. Independent Reviewer blind-first source assessment and final evaluation are mandatory before acceptance. This result does not establish that a live scope owner invokes the new invalidation seam, or complete cross-WebView upgrade blocking, cursor-writer/rollback/recovery integration, or inventory planner activation.
