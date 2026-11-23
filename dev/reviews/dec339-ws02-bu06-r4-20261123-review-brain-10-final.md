# WS-02 / DEC-339 / BU-06 R4 — Final independent review

**VERDICT: PASS WITH MINOR FINDINGS — BOUNDED BU-06 ACCEPTED**

**Reviewer:** `review-brain-10`  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** Real Multi-Context IndexedDB Upgrade and Rollback Gate  
**Branch:** `build/dec339-ws02-bu06-real-multicontext-upgrade-rollback-20261122`  
**Frozen qualified source SHA:** `621d324511d33d2b429a9b57968b8c1019159c6a`  
**Frozen qualified Git tree:** `88cb5f915c03bf50a64d79ba7554fd6b8b853ffb`  
**Incoming state commit:** `593e386fd79385444fcdc21c56a45f67a1a64bea`; count **3**, BUILDER→REVIEWER; published neutral handoff artifact at child commit `ffc17083a8a9ccfc4c17f2664ca0fdcabc396e32`.  
**Frozen independent blind source assessment:** `dev/reviews/dec339-ws02-bu06-r4-20261123-review-brain-10-blind-source.md`, publication commit `9b8a2c2ffa949cc98b6892f1dac60181fd3db58f`.

## Source finding and prior blocker disposition

**R3 B-01 — RESOLVED in R4.** Directly reviewed the test-only new source `tests/integration/dec339-indexeddb-real-browser-upgrade.test.ts` at frozen R4 SHA, and the unchanged real browser harness/production IndexedDB classes. The blocked scenario now calls `openBlocker` from frame **A**, production `upgradeSnapshot` from independent same-origin frame **B**, then `closeBlocker` from A. Root event handler rejects any command response whose `event.source` and asserted `frameId` differ from the requested frame. It records completion ordering and independently asserts the blocked result from B preceded the release completion in A. This discharges the exact independent-context topology defect that blocked R3.

The separate cooperative scenario exercises production v1 authority/backup in A, additive v2 upgrade in B, explicit legacy-v1 `VersionError` afterward, and exact-byte preservation of canonical authority and historical backup through the compatible v2 reader. The blocked scenario requires a `recovery-required` response prior to releasing A's deliberately nonclosing v1 handle, then a successful production inventory-store retry in B, v2 schema version, identical canonical authority bytes and identical backup bytes. The browser uses native installed Windows Edge IndexedDB with existing esbuild-bundled production classes and isolated same-origin iframes, not fake IndexedDB.

**No new acceptance-blocking source or harness defect identified** within the bounded BU-06 requirements. Product runtime, storage classes and planner are unchanged by this BU, and inventory remains dormant.

## R4 exact-source PHX-CI qualification

- **Original R4 run:** `492c25a7-21d9-41fa-9eed-34d19ae4db93`
- **Evidence-only direct child:** `f693c0b170d76c3062d57d097ab6aa57f26abcfd`
- **Original canonical evidence:** `dev/test-results/492c25a7-21d9-41fa-9eed-34d19ae4db93/result.md`, `result.json`, `terminal.log`
- **Pinned runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`; framework `0.2.0-dev.2`.
- Directly inspected original Markdown, JSON and full terminal log **after** the blind source report was published. They confirm exact expected and verified source `621d324511d33d2b429a9b57968b8c1019159c6a` and tree `88cb5f915c03bf50a64d79ba7554fd6b8b853ffb`; **13/13 required stages PASS**, focused **634/634 PASS**, full product **1339/1339 PASS**, native build/typecheck/artifact/check/repository stages PASS, original task exit 0, no physical dispatch. Native real Edge browser test PASS in **5280.9031 ms**. `main.js` **927076 bytes**, SHA-256 `4bde1bad5045ba8f732d6e072b63110aadcb9ab8265d1454bb2a7dd9c860d828`. Evidence commit is exactly one child of reviewed source and modifies **only** `dev/_ca-output.md` and the three original R4 evidence files, not source or tests.

## Test-change integrity and historical findings

R3→R4 compare is ten commits ahead and zero behind; the only non-`dev/**` change is `tests/integration/dec339-indexeddb-real-browser-upgrade.test.ts` (83 lines added, 33 removed). It strengthens command response provenance and adds explicit separate-frame, completion ordering and blocker-release checks; no tested production path, original oracle, repository guard, script or dependency is weakened. R1 original PHX-CI BLOCKED because Windows Edge profile cleanup `EBUSY`; R2 BLOCKED because frame-ready `about:blank` race; R3 PHX-CI PASS but independent B-01 rejection due to same-context blocker/opener. Those historical identities and outcomes remain preserved, not relabeled.

## Mandatory ten-family adequacy, bounded BU-06

| Family | Independent result |
| --- | --- |
| 1. Nominal | PASS — real two-context cooperative versionchange and v1→v2 upgrade |
| 2. Negative/boundary | PASS — stale explicit v1 `VersionError`, nonclosing frame A blocks frame B |
| 3. Allowed/forbidden transitions | PASS — version=2 after upgrade, fail-closed blocked open, compatible v2 read |
| 4. Retry/recovery | PASS — blocked rejection before release, successful retry after release, original bytes intact |
| 5. Concurrency/races | PASS — independent A/B context topology, response frame/source fencing and completion order; real multi-process remains separate |
| 6. Persistence/integrity | PASS — byte-for-byte canonical and backup preservation in both paths |
| 7. Identity/security/trust | PASS — isolated random database names, same-origin guard, response source/window matching; no live identity/service mutation |
| 8. Interfaces/compatibility | PASS — real shipping IDB classes in browser harness; version-agnostic v2-aware rollback reader |
| 9. Architecture/invariants | PASS — no production changes, inventory activation, extra dependency/launcher or weakened guard |
| 10. E2E/fail-closed | PASS within real Windows Edge two-browsing-context storage gate; physical Obsidian/device migration outside scope |

## Minor findings / future integration boundaries

**M-01 — Distinct browsing contexts, not distinct Obsidian/WebView processes.** The test uses two same-origin iframes inside one Edge browser/profile. It satisfies this BU's requested real multi-context IndexedDB gate, but not a real multi-process/device deployment or live database migration. Do not promote it as such.

**M-02 — Indirect late-handle proof.** Production `onblocked` rejects, and a later success closes the abandoned open; test checks the end state via successful retry, schema 2 and unchanged bytes, rather than instrumenting and counting the abandoned request's late success/close. No unsafe condition is established, and required recovery outcome is verified.

**M-03 — Remaining whole-workstream tasks.** Actual scope-owner and local-hint consumer wiring, broader generic cursor-writer predecessor audit, rollback/migration policy, full WS-02 integration review and eventual DEC-339 shadow/parity/cutover remain separately gated. Neither a real-Edge unit PASS nor per-BU acceptance authorizes inventory activation.

## Final disposition

**PASS WITH MINOR FINDINGS — BU-06 ACCEPTED** only for frozen R4 source/tree and exact original R4 PHX-CI evidence named above. Builder may close out this bounded unit and carry the minor findings forward. No unnecessary rerun of already-qualified R4 software is needed. **Full WS-02 and DEC-339 remain INCOMPLETE**. No permission for `master`/PR #157 merge, inventory activation, live IndexedDB migration, physical Drive/vault/device operations, installation, promotion, deployment or release is granted.

Independent reviewer did not execute verification or change production code, test files, fixtures, scripts or original evidence. Blind separation limitation: neutral planning/state embed Builder qualification summaries, incidentally visible during required identity verification, but source conclusions were frozen before original test results and history were opened.
