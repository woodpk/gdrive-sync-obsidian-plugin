# WS-02 / DEC-339 / BU-06 R3 — Final independent adversarial review

**VERDICT: CORRECTION REQUIRED — BU-06 NOT ACCEPTED**

**Reviewer:** `review-brain-10`  
**Feature:** Real Multi-Context IndexedDB Upgrade and Rollback Gate  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Frozen reviewed source:** `9ff52fd316cbb23ca7cc8e9d5730221a85b04d5c`  
**Frozen tree:** `82400e34216d682a516dfe694a19f2528c546e48`  
**Incoming handoff:** count 1, BUILDER→REVIEWER  
**Blind review:** `dev/reviews/dec339-ws02-bu06-r3-20261122-review-brain-10-blind-source.md`, published at `a2359cc35d4876b68bb813b95dfa3edd4a395f32`.

## B-01 — MAJOR, acceptance blocking: noncooperating blocker and v2 opener share the same browsing context

**Requirement:** `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu06-real-multicontext-upgrade-rollback-2026-11-22.md` and R3 assignment demand *real Windows Edge IndexedDB* v1→v2 behavior **across independent same-origin browsing contexts**, including a noncooperating stale v1 context blocking a v2 inventory opener in another context. This is the sole key workstream-realism gate deferred by BU-01–05.

**Frozen source evidence:** `tests/integration/dec339-indexeddb-real-browser-upgrade.test.ts` root browser script, around lines 148–156:
```js
const blockedSeed = await command(a, "seedLegacy", blockedDb);
const blocker = await command(b, "openBlocker", blockedDb);
const blockedUpgrade = await command(b, "upgradeSnapshot", blockedDb);
const close = await command(b, "closeBlocker", blockedDb);
await delay(500);
const retry = await command(b, "upgradeSnapshot", blockedDb);
```
The raw IDB v1 nonclosing handle is opened and held by **frame B** itself, and the tested production `IndexedDbInventoryObservationStore` v2 opening is also performed **in frame B**. Frame A's separate production v1 handle has a cooperative `versionchange` callback and therefore does not act as a noncooperating *other-context blocker*.

**Consequence:** The passing `blockedUpgrade.status === "recovery-required"` assertion proves actual Edge/IndexedDB *same-context multiple-handle* blocking, not the separately required blocking interaction between a noncooperating **context A** and a production inventory opener in **context B**. Passing this test cannot establish the required adversarial multi-context topology even if every status, canonical byte and backup assertion succeeds. It is a genuine evidence/test-scenario gap, not a claim of a defect in the production IndexedDB storage classes.

**Required Builder correction:** Move the deliberately noncooperating `openBlocker` operation to **frame A** (or another independent frame) while the v2 `upgradeSnapshot` remains in **frame B**, and invoke `closeBlocker` from that blocker-owning context. Retain the production v1 `seedLegacy` in A and its cooperative closure, the explicit blocked status before release, post-release late completion/retry, exact v2 canonical and historical backup bytes, and schema 2 checks. Preserve the cooperative A→B case and `VersionError` assertion. Add a direct assertion or sufficiently explicit diagnostics identifying blocker context A and opener B, to prevent regression to same-context topology. Run fresh substantive Windows PHX-CI against the corrected exact test/harness tree and submit a new Builder→Reviewer handoff. Production code need not be modified to correct this test-design issue.

## What the existing R3 test does prove

- The test bundles and uses **actual production** `IndexedDbStateByteStorage`, `IndexedDbInventoryObservationStore`, `IndexedDbInventoryAwareStateByteStorage` and `PersistentSynchronizationStateStore` in native Microsoft Edge via loopback HTTP, not a fake IndexedDB database.
- It uses two real same-origin browsing contexts (frames A and B), per-frame ready handshakes, command IDs, origin restrictions, timeouts and post-command status assertions.
- The **cooperative** scenario seeds v1 in A, opens v2 in B and checks `VersionError` for the explicit stale-v1 reopening, schema version 2, and exact original canonical/backup bytes.
- The **noncooperative** scenario proves a stale unclosed v1 connection can block v2 *within the same browser frame*; it does not prove the required other-frame blocker.
- Node waits for the browser's completed result before asserting; browser exits, command timeouts and test errors fail instead of reporting an early PASS.
- The fixture's Edge shutdown and retrying temporary-profile cleanup address the historical Windows `EBUSY` failure mode. A fixed 500-ms delay after blocker release is not itself an explicit proof that the abandoned blocked request's late-success handle closed; final usable v2 state and preserved bytes are nevertheless asserted.

## Exact-source PHX-CI and original historical qualification

**R3 run:** `6b7e7ed4-4f2a-423f-b43e-bf9b797035a5`  
**Evidence-only commit:** `ab4a458e4e8ee27c82ffd29ecc92a2164e5cbd22`  
**Original files:** `dev/test-results/6b7e7ed4-4f2a-423f-b43e-bf9b797035a5/result.md`, `result.json`, `terminal.log`.  
**Pinned PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`.

Original R3 evidence confirms exact verified HEAD and tree equal `9ff52fd316cbb23ca7cc8e9d5730221a85b04d5c` / `82400e34216d682a516dfe694a19f2528c546e48`, required stages **13/13 PASS**, focused **634/634 PASS**, full product **1339/1339 PASS**, typecheck, build, artifacts and repository checks PASS, overall PASS / exit 0. The Edge browser test itself reports PASS in ~9806 ms. Original built `main.js` is **927076 bytes**, SHA-256 `4bde1bad5045ba8f732d6e072b63110aadcb9ab8265d1454bb2a7dd9c860d828`. The evidence commit is the **immediate Git child** of the frozen implementation and changes only `dev/_ca-output.md` and three canonical run-evidence files, no production or authored tests. No live/physical operations performed.

**R1:** source `b17a2c803090f718fbaa7a31438a153d980613ec`, run `7b9ad4ec-d23e-433e-99ea-475e17399c90`, evidence `b5bfb1f55df65abdb5ea7e5182bc74454c31cd08`: overall BLOCKED due to repository test stage failure/Edge profile cleanup `EBUSY`, not counted as qualified.  
**R2:** source `a278479987e7fb46ea02f22221c53ff4425e51a4`, run `e2b30f3d-2faa-45e6-be88-ae604e8cebcf`, evidence `dab102eb2f68e763d5f2866079aae8e1904205c5`: BLOCKED due to initial `about:blank` readiness race, not qualified.  
**R1→R3 source comparison:** 6 descendant commits, no divergence; only test harness and `dev/**` modifications. R3 adds explicit real-frame readiness handshake and bounded per-command waits while preserving substantive IndexedDB assertions; no production-source or repository-guard change or weakening of original expected storage/byte results found.

## Ten-family independent adequacy

| Family | Result |
| --- | --- |
| 1. Nominal | PASS — real A→B cooperative v1→v2 additive upgrade, v2 schema and byte-preserving compatible reader |
| 2. Negative / boundary | **GAP B-01** — intentionally stubborn v1 handle blocks same-context B, not an independent legacy context |
| 3. Legal / forbidden transitions | PASS for real v1 `VersionError` after upgrade; full cross-context refusal not established |
| 4. Retry/recovery | PARTIAL — after-release retry succeeds in native Edge, but uncooperative cross-context late completion missing |
| 5. Concurrency/races | **GAP B-01** — wrong browsing-context topology for the principal adversarial blocker scenario |
| 6. Persistence/integrity | PASS — canonical and original backup bytes compared exactly in both existing scenarios |
| 7. Identity/security/trust | PASS for isolated test DB names and same-origin command fencing; no live user vault/provider |
| 8. Contracts/integration | PASS for real production storage class imports and browser IDB; no production change |
| 9. Architecture/invariants | PASS — dormant inventory, no new dependency/PowerShell launcher or altered architectural guard |
| 10. End-to-end/fail-closed | PARTIAL — real Edge multi-context cooperative path, same-context blocker only; required separate-context adversary missing |

## Final disposition

**CORRECTION REQUIRED — BU-06 NOT ACCEPTED.** One narrowly scoped browser-test topology correction is required; do not rebuild production IndexedDB software or redo accepted BU-01–05. Preserve all R1–R3 historical evidence, freeze and qualify corrected test source, and issue a NEW Builder→Reviewer final-review handoff. No Reviewer software execution, production/test/script/evidence edits, Github Actions, physical dispatch or activation occurred. **Full WS-02 and DEC-339 remain incomplete**, and there is no authority to merge to master/PR #157, migrate a live database, run real Drive/vault/device operations, install, promote or release.

**Blind separation:** Only committed task/plan/handoff and frozen production/harness sources were examined before publishing the blind source assessment `a2359cc35d4876b68bb813b95dfa3edd4a395f32`. Authored test *implementation* was necessarily the subject of BU-06's blind source inspection; no R1–R3 run evidence, Builder narratives or source-history diff was inspected before publication.
