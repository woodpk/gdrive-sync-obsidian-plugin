# WS-02 / DEC-339 / BU-06 — R4 independent blind-source reassessment

**Reviewer:** `review-brain-10`  
**Phase:** Frozen source-only assessment before R4 tests/evidence/history/Builder narrative examination (the two browser test files are the implementation under review for this test-only BU).  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** Real Multi-Context IndexedDB Upgrade and Rollback Gate  
**Source branch:** `build/dec339-ws02-bu06-real-multicontext-upgrade-rollback-20261122`  
**Frozen reviewed source SHA:** `621d324511d33d2b429a9b57968b8c1019159c6a`  
**Frozen reviewed source tree:** `88cb5f915c03bf50a64d79ba7554fd6b8b853ffb`  
**Incoming feature-local handoff:** count **3**, sender BUILDER, recipient REVIEWER, state commit `593e386fd79385444fcdc21c56a45f67a1a64bea`. The handoff artifact commit `ffc17083a8a9ccfc4c17f2664ca0fdcabc396e32` is a child of the state commit and current remote branch HEAD; recipient/count/source/tree at the frozen state are consistent.

## Independent authoritative scope

The neutral BU-06 plan `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu06-real-multicontext-upgrade-rollback-2026-11-22.md` requires genuine Windows Edge IndexedDB interactions with two independent same-origin browsing contexts: cooperative production v1 connection closure on `versionchange`, additive production v2 schema upgrade, explicit v1 `VersionError` afterward, exact canonical/backup bytes through v2-aware rollback reads, a deliberately nonclosing **independent-context** v1 connection causing fail-closed v2 blocked status, followed by release, late completion/retry, and preservation of bytes. It adds no production behavior, new build framework, inventory activation, live migration, physical Drive/vault operation or deployment.

## Exact frozen source assessment

1. `tests/browser/dec339-real-idb-context-harness.ts` imports the actual production `IndexedDbStateByteStorage`, `IndexedDbInventoryObservationStore`, `IndexedDbInventoryAwareStateByteStorage` and `PersistentSynchronizationStateStore`. All IndexedDB calls use native browser `indexedDB`; the intentionally uncooperative `openBlocker` is a raw v1 handle with `onversionchange = () => undefined`.
2. `tests/integration/dec339-indexeddb-real-browser-upgrade.test.ts` bundles that code with existing esbuild into a local HTTP server, launches installed Microsoft Edge with a disposable profile, and creates two same-origin iframes `a` and `b`. Per-frame readiness is awaited. Commands carry unique IDs; the response handler checks both `event.source === expectedSource` and `frameId === expectedFrameId`; failures/timeouts reject. The root only sends `ok: true` after all awaited browser operations have completed. The Node test independently asserts the returned statuses/bytes before PASS.
3. **Prior R3 blocker-topology finding B-01 is corrected in source.** The blocked test sequence is now `seedLegacy(a)`, `openBlocker(a)`, `upgradeSnapshot(b)`, `closeBlocker(a)`, `retry(b)`. The separate context owning the stubborn handle is A; the production v2 upgrader is B. The result includes actual command-response frame identities and completion sequence. Node asserts blocker=A, upgrader=B, release=A, non-equality of blocker/upgrader, and that `blockedUpgrade` resolved `recovery-required` **before** release resolved. This establishes the required adversarial cross-context topology rather than merely same-frame multiple-handle blocking.
4. The cooperative path separately seeds real v1 authority/backup in A and upgrades in B. It asserts v2, subsequent explicit v1 `VersionError`, and byte-identical canonical/backup reads by the v2-compatible adapter.
5. After the cross-context blocker releases, a bounded delay and retry exercise the actual production inventory store, which clears its cached rejected open and closes any late successful rejected request. The test checks resulting v2, compatible canonical bytes, and backup bytes. No raw fake IndexedDB object replaces real production classes. No new shipping runtime activation is present.

## Blind provisional disposition

**PROVISIONAL SOURCE PASS WITH MINOR QUALIFICATIONS** for this bounded browser-backed verification gate. No remaining acceptance-blocking defect was found in the corrected cross-context test design. Final independent verdict requires inspection of R4 original PHX-CI results, exact source/tree, test integrity and R3→R4 changes after this report is frozen.

**M-01, nonblocking scope:** Two isolated same-origin iframes in one Edge profile are distinct browsing contexts and meet this BU's explicit requirement, but they are **not** separate Obsidian application/WebView processes and do not prove deployed cross-process or mobile behavior. Do not overclaim live device migration/rollback readiness.
**M-02, nonblocking evidence granularity:** Late completion is checked indirectly: after release the successful retry, schema=2, canonical and backup bytes demonstrate a usable intact DB. The test does not instrument and count the orphaned blocked request's late `onsuccess` closure. The existing production code explicitly closes late success; deferred instrumentation, if desired, is not part of BU-06's required contract.
**M-03, nonblocking harness assurance:** Ready-frame source identity is not independently checked at the initial `ready` notification, although subsequent command replies are source/frame-validated and strict, and the local isolated origin constrains unwanted traffic. This does not defeat the tested cross-context topology.

**Blind separation:** Mandatory planning and state metadata embed Builder status and R4 qualification claims, incidentally visible during incoming identity verification. Those claims were not used as evidence; conclusions above derive from exact frozen source and required contracts. The previous R3 B-01 finding was already known to this reviewer from this conversation. No R4 PHX-CI result/logs, historical R3→R4 comparison, or R4 Builder handoff prose was read before this blind report was frozen. This report must not be retrospectively edited.
