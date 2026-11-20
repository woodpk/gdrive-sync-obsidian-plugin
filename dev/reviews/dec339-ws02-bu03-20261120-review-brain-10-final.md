# WS-02 / DEC-339 / BU-03 — Independent final review

**Verdict: PASS WITH MINOR FINDINGS — BOUNDED BUILD UNIT ACCEPTED**

- **Reviewer:** review-brain-10
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin`
- **Feature:** WS-02/DEC-339/BU-03 — Local Inventory Scope-Change, Resume and Recovery-Hint Invalidation
- **Frozen qualified source:** `3d9ea7fc7bb2c852aebf944a2b7e80462bc1cae2`
- **Frozen Git tree:** `3f3f81b96c36a056f89f8e18acf74d845ea5c47e`
- **Feature handoff before review:** count 1, Builder→Reviewer, published state commit `f471ab5656ea10a15156c3f096ad07fac0a0746b`
- **Frozen blind source report:** `dev/reviews/dec339-ws02-bu03-20261120-review-brain-10-blind-source.md`, immutable publication commit `fb308302f4cc001e0e9c73e93bcac78b947fcf95`.
- **Review boundary:** BU-03 software-only local-hint invalidation seam, not the full WS-02 storage gate or DEC-339 activation.

## Independent source assessment

The blind source assessment was published before opening authored tests, source changes/history, prior findings, or the original PHX-CI reports. Normative authority: bounded task `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu03-local-hint-invalidation-2026-11-20.md`, WS-02 architecture, locked DEC-339 and target state/inventory invariants.

`src/state/verified-local-inventory.ts` adds only `invalidateForScopeChange()` near lines 85–93, which increments `localChangeEpoch` **before** awaiting `inventory.invalidateLocalSnapshot("effective-local-scope-changed")`. Existing `refresh()` captures that epoch before fresh enumeration, checks it before persisting the local snapshot and again after persistence, invalidating and returning `stale` on mismatch. It uses a full fresh `LocalVaultPort.enumerate()` and filters by the caller-supplied effective `included()` predicate. Existing `subscribe()` invalidates on `onChange`, `resume`, and `vault-ready` events. These observer hints never count as deletion, absence, BASE or write authorization.

`src/state/indexeddb-inventory-storage.ts` implements local-marker invalidation through the `inventory-control/local-active` key only; independent remote inventory control, canonical cursor, BASE, durable operation intents and effects are not mutated by local invalidation. A subsequent `readLocalHint()` requires the same current valid generation/identity/authority and an unimpaired complete local marker; excluded or removed rows are not interpreted as proven absence. `src/product/runtime.ts` remains on the existing legacy planner; no `VerifiedLocalInventoryCoordinator` activation, live scope-owner callback binding, or new Google Drive/vault mutation behavior was introduced.

**Source-level result: no blocking defect established within the explicitly bounded BU-03 contract.**

## Exact-source PHX-CI evidence

- **Original run:** `747e471f-fc04-4669-b69d-b34075c1c66a`
- **Evidence publication:** `288a05c00a0be9ecda8f23fc4945c95ebb436d91`
- **Canonical evidence:** `dev/test-results/747e471f-fc04-4669-b69d-b34075c1c66a/result.md`, `result.json`, `terminal.log`
- **Pinned runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`; framework `0.2.0-dev.2`.
- Directly inspected original reports and terminal output. They bind expected HEAD, verified HEAD and Git tree **exactly** to the frozen source and tree named above; result is **13/13 stages PASS, focused 634/634 PASS, product 1321/1321 PASS**, native exit 0, typecheck/build/artifact/repository guards PASS. No live or physical testing was performed or claimed.
- Comparison from accepted BU-02 closeout `b4f764fe7993b944023ef28a7f601e776d6ae13d` to qualified source is one commit ahead and none behind. Feature delta: ten-line single-source addition to `src/state/verified-local-inventory.ts`, 99 test lines in existing `tests/integration/dec339-local-observation-integration.test.ts`, and planning/state. No test-script, provider, planner, or executor change. No test oracle was weakened.

## Adversarial test assessment and ten-family coverage

Directly inspected the original `tests/integration/dec339-local-observation-integration.test.ts` including new cases around lines 155–251 and preexisting cases around lines 19–152; also checked the existing IndexedDB local replacement, invalidation and hint-reader implementation.

| Family | Independent result |
| --- | --- |
| 1. Nominal refresh | Covered — new included local path becomes advisory after fresh scan |
| 2. Negative/boundary | Covered — previously included path excluded by policy no longer returns advisory |
| 3. Allowed/forbidden transitions | Covered — advisory→stale on scope or lifecycle event; new refresh returns advisory for included paths and unknown for excluded |
| 4. Retry/recovery | Covered — repeated refresh after invalidation; persistent cache is not treated as authoritative; no new background retry engine |
| 5. Concurrency/race | Covered — scope change *during* enumeration increments epoch, stale publication refused; post-save epoch check also present |
| 6. Persistence/integrity | Covered for BU-03 — local invalidation affects only LOCAL_POINTER; remote inventory stays verified; canonical/backup/intent state untouched |
| 7. Identity/security/trust | Covered by unchanged identity-fenced read and advisory-only classification; no authentication/provider change |
| 8. Contract/compatibility | Covered — existing `LocalVaultPort` events, `IndexedDbInventoryObservationStore` contract, one new explicit coordinator seam |
| 9. Architecture/invariants | Covered — no production runtime activation, new planner, additional verification script, or budget change; PHX-CI repository guard PASS |
| 10. End-to-end/fail-closed | Covered in deterministic local coordinator→IndexedDB hint→invalidation→fresh enumeration tests; physical provider and real-device testing intentionally N/A to bounded BU-03 |

**Test caveat:** The `resume` and `vault-ready` event invalidation is launched asynchronously by `subscribe()` (fire-and-forget with rejection suppressed) and the regression awaits an observed stale result. This establishes eventual invalidation once persistence succeeds, **not immediate revocation at the instant the event fires**. Only `invalidateForScopeChange()` is an explicitly awaited seam. The later product integration must establish that its scope and resume boundaries do not consume a still-advisory hint before their invalidation is complete. Because the coordinator remains dormant and hints have no authorization role, this is not a BU-03 acceptance blocker.

## Minor findings / prospective work

1. **M-01 — Deferred live scope-owner wiring (nonblocking):** `invalidateForScopeChange()` must be invoked by the future integrated scope owner for **every** effective inclusion/exclusion policy change and awaited before consuming refreshed local hints. This BU intentionally does not wire that future caller. A missing notification cannot be detected inside the coordinator.
2. **M-02 — Lifecycle timing (nonblocking, integrate carefully):** Resume/vault-ready invalidation uses a non-awaited event callback; tests assert eventual invalidation rather than a synchronous barrier. Prior to activating local hints, ensure every consumer remains advisory-only and never uses still-uninvalidated hints as stability, absence, deletion or mutation proof. If the future product requires an immediate cache visibility barrier, introduce a separately qualified design at the integration boundary.
3. **M-03 — Wider WS-02 gates (nonblocking):** Real browser/multi-WebView IDB upgrade behavior, full legacy writer inventory, cursor and recovery/rollback semantics and actual integrated scope-change/resume lifecycle require subsequent independent qualification. This review does not discharge them.
4. **M-04 — Source isolation disclosure:** Neutral task planning and handoff-state metadata incidentally exposed Builder descriptions/result claims before the blind report was frozen. The substantive blind assessment was independently derived from frozen production source; authored tests/original PHX-CI output/source comparison were opened only after publication.

## Final verdict and operating boundary

**PASS WITH MINOR FINDINGS — BU-03 SOFTWARE FEATURE ACCEPTED** at immutable source `3d9ea7fc7bb2c852aebf944a2b7e80462bc1cae2` with original PASS PHX-CI run `747e471f-fc04-4669-b69d-b34075c1c66a`. No production/test/fixture/script/evidence modification or software execution was performed by Reviewer. The Builder must preserve evidence, close out BU-03 and carry the four findings into later work. This is **not** complete WS-02 acceptance, DEC-339 activation, PR #157/master merge authorization, live database migration, Drive/vault operation, device test, installation, promotion or release approval.
