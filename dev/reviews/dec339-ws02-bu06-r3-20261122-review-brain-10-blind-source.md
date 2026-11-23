# WS-02 / DEC-339 / BU-06 R3 — Frozen independent blind source assessment

**Reviewer:** `review-brain-10`  
**Feature:** Real Multi-Context IndexedDB Upgrade and Rollback Gate  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Branch:** `build/dec339-ws02-bu06-real-multicontext-upgrade-rollback-20261122`  
**Frozen source SHA:** `9ff52fd316cbb23ca7cc8e9d5730221a85b04d5c`  
**Frozen Git tree:** `82400e34216d682a516dfe694a19f2528c546e48` — verified directly from GitHub commit  
**Incoming handoff:** feature-local count **1**, sender BUILDER, recipient REVIEWER; assignment and handoff artifact verified from the feature branch.  
**Phase:** Independent source/harness inspection **before opening R1–R3 original PHX-CI evidence, Builder execution narratives, historical diffs or earlier review findings**.

## Governing contract and phase boundary

The committed `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu06-r3-independent-review-2026-11-22.md`, BU-06 neutral planning and WS-02 architecture require *real Edge IndexedDB* behaviors across two **independent same-origin browsing contexts**, including a cooperative v1→v2 upgrade, actual refusal of legacy explicit v1 after upgrade, exact canonical and backup byte preservation, a **noncooperating stale v1 connection in an independent context** blocking the v2 opener, and safe completion/retry after that blocker is released. No production source change, activation, physical Drive/vault/device use or release is authorized.

Because the *new browser-backed test/harness is itself the deliverable of BU-06*, the Phase-1 source review necessarily inspected its authored implementation (`tests/browser/dec339-real-idb-context-harness.ts` and `tests/integration/dec339-indexeddb-real-browser-upgrade.test.ts`) as **source under review**, not its execution results. Original PHX-CI evidence and Builder narratives remained unopened.

## Source observations

1. The harness imports and invokes the **actual production** `IndexedDbStateByteStorage`, `IndexedDbInventoryObservationStore`, `IndexedDbInventoryAwareStateByteStorage` and `PersistentSynchronizationStateStore`. Browser native `globalThis.indexedDB` is used, not FakeDatabase. The Node test bundles this harness with existing esbuild, serves it at a fresh loopback HTTP origin and launches installed Windows Microsoft Edge headless with a per-run isolated browser profile.
2. Root HTML creates two same-origin iframes `a` and `b` with independent JS module maps. The explicit `ready` handshake, origin checks, per-command ID/timeout and root overall timeout guard against the prior initial `about:blank` command race and missing responses. The root posts `ok: true` only after all awaited command results are received; the Node assertions then check each returned status and byte array before declaring the test passed. A browser crash before a result and browser timeout are treated as failures.
3. Cooperative scenario: `seedLegacy` in frame **A**, `upgradeSnapshot` in frame **B**, then explicit legacy reopen in A, compatible v2 read and backup check in B. It checks schema v2, exact canonical bytes and backup byte equality. This genuinely exercises *cross-context* cooperative versionchange closure.
4. Production `src/state/indexeddb-state-storage.ts` closes a live v1 handle on `versionchange`; explicit `indexedDb.open(name,1)` after upgrade fails with `VersionError`. Production v2 inventory store performs additive schema upgrade without rewriting `sync-state`. The v2-aware canonical adapter opens without a fixed schema version and preserves canonical CAS/backup bytes.
5. The blocked scenario intentionally opens a raw v1 handle whose `onversionchange` handler does **not** close. The production v2 store returns `recovery-required` upon a blocked opening and remains retryable after release. The test asserts resulting v2 schema and canonical/backup bytes.

## B-01 — MAJOR / acceptance-blocking: blocked-upgrade scenario does not test a blocker in an independent browsing context

**Source:** `tests/integration/dec339-indexeddb-real-browser-upgrade.test.ts`, `rootHtml()` lines ~148–156.

**Concrete source flow:**
```javascript
const blockedSeed = await command(a, "seedLegacy", blockedDb);
const blocker = await command(b, "openBlocker", blockedDb);
const blockedUpgrade = await command(b, "upgradeSnapshot", blockedDb);
const close = await command(b, "closeBlocker", blockedDb);
await delay(500);
const retry = await command(b, "upgradeSnapshot", blockedDb);
```

Both **the noncooperating blocker** and **the v2 upgrading opener** operate in frame **B**, the same browsing context. Frame A's production legacy connection cooperatively closes on `versionchange`. Consequently the `blockedUpgrade` assertion proves IndexedDB can report `blocked` with *multiple connections inside one browsing context*, but **does not prove a noncooperating legacy context prevents a distinct context's production v2 open**, the exact cross-context rollback/blocked-upgrade evidence the BU-06 plan and R3 assignment request.

The test can pass even if the browser cross-context blocked-open behavior of a genuinely separate stale WebView is faulty. Real Edge execution, real storage classes, and correct byte checks do not close this missing topology proof.

**Required narrow correction:** Place the deliberately uncooperative `openBlocker` in frame **A** (or a third independent same-origin context), while opening/upgrading the production v2 inventory in frame **B**. Release the blocker from its originating context A, then prove the B opener can safely handle late completion/retry. Keep canonical/backup byte, schema version, error classification and legacy v1 refusal assertions. Ensure the test proves the blocked response happens **before** closing the separate-context blocker and that all browser commands are awaited. Re-run exact-source substantive Windows PHX-CI qualification after corrected test code and issue a fresh Builder→Reviewer handoff. Do not change production code to solve a harness topology error.

## Other review qualifications

- **Q-01 — Browser-test scope:** The experiment uses two same-origin iframes within one Edge browser/profile, rather than two actual Obsidian/WebView application processes. The neutral plan authorizes independent same-origin *browsing contexts*; genuine mobile/Obsidian multi-WebView deployment and live database migration remain separate gates.
- **Q-02 — Late completion proof:** `onblocked` rejects immediately, then the test releases a blocker, sleeps 500 ms and retries. The production opener closes late success after a rejected blocked request. This proves eventual safe usable v2 bytes after release but does not directly count or assert that orphaned late-success DB handle was closed. Ensure corrections do not claim stronger runtime instrumentation than is actually observed.
- **Q-03 — Test cleanup:** Edge-process shutdown and retryable temporary profile cleanup are present; the source does not indicate production source modification or a new verification framework.

**Provisional verdict: CORRECTION REQUIRED — B-01**, subject to Phase 2 examination of original test/PHX-CI and exact qualification. No result or runtime acceptance is inferred from successful code compilation alone. The blind report is frozen and must not be revised after evidence inspection.

**Isolation disclosure:** Incoming state/assignment/handoff contain Builder status and evidence summaries, unavoidably visible during required task/identity verification; they were not treated as proof. The new browser test is an authorized source deliverable of BU-06, so its source code was inspected during Pass 1. Original PHX-CI reports/logs, Builder R1/R2 narratives and historical comparisons remained unopened until this report was published.
