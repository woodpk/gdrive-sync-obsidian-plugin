# WS-02 / DEC-339 / BU-04 — Final independent adversarial review

**VERDICT: CORRECTION REQUIRED — NOT ACCEPTED.**

**Reviewer:** review-brain-10  
**Feature:** WS-02/DEC-339/BU-04 — Immediate Advisory-Hint Visibility Barrier During Asynchronous Invalidation  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Frozen reviewed source:** `4c0cc689b9c949969f5fda82a96a14b5394e5fd0`  
**Frozen tree:** `1eb7d975f6504bfcde2cd2130eef02f0413d475a`  
**Incoming handoff:** count 1, Builder→Reviewer, state commit `31176ab5b676f758121fdb2438261a8b92ad350c`  
**Frozen blind report:** `dev/reviews/dec339-ws02-bu04-20261120-review-brain-10-blind-source.md`, report commit `d58fec39779ade8f45828342253c9dea69e0bd01`.

## Final substantive conclusion

The implementation correctly adds a coordinator-local immediate gate when an asynchronous invalidation begins and guards against a notification racing an in-flight hint read. **But it does not fail closed if persistence of invalidation fails.** This was independently identified in the frozen blind production-source assessment and remains unaddressed after examination of the original tests and PHX-CI evidence.

### F-01 — MAJOR; acceptance-blocking: rejected invalidation restores visibility of obsolete hints

**Requirement:** BU-04 planning `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu04-advisory-hint-visibility-2026-11-20.md` explicitly requires a fail-closed advisory-hint visibility barrier while asynchronous local-state invalidation is unresolved. WS-02 and DEC-339 architecture requires that old observations never become proof of current file state or authorized effects. An IDB invalidation that rejects has not successfully revoked the old local marker; it must not cause stale local observations to be exposed anew.

**Cause in exact source:**
- `src/state/verified-local-inventory.ts` lines 97–107: `trackInvalidation()` sets `invalidationPending = true` and advances the epoch, but its `job.finally()` unconditionally deletes the tracked job and clears the pending flag once the job settles, including rejection. There is no sticky invalidation-failure/recovery-required state.
- Lines 130–139: `subscribe()` discards a rejected invalidation using `.catch(() => undefined)`; no caller learns of the failed persistence.
- Lines 118–127: `readAdvisoryHint()` only checks `invalidationPending`, job count and epoch *during the current read*. A new read after the failure has no indication that the last epoch's invalidation failed, so it delegates to the raw backing store.
- `src/state/indexeddb-inventory-storage.ts` lines 679–689: the backing invalidation changes only `inventory-control/local-active` inside an IDB transaction. If open/transaction fails before the marker becomes `invalid`, it remains `complete`. The raw `readLocalHint()` lines 691–720 can still return that old `advisory` row.

**Concrete counterexample:**
1. Previously published `LOCAL_POINTER` is complete; coordinator returns advisory hint for path P.
2. File change/resume event occurs, immediately setting pending state and increasing epoch.
3. IndexedDB invalidation rejects before the marker commits. Coordinator's `finally` clears its only gate, and event callback swallows the error.
4. A new `readAdvisoryHint(fence,P)` starts *after* rejection; since no job is pending, it delegates to `readLocalHint`, which sees a still-complete marker and returns the stale hint as `advisory`.
5. A failed explicit `invalidateForScopeChange()` similarly clears the guard after throwing, unless the caller supplies an external protection, which this coordinator consumer seam cannot assume.

**Impact:** Violates the advertised fail-closed local-hint visibility guarantee exactly under a persistence-failure situation. This does not independently prove destructive file loss: hints remain non-authoritative and the coordinator is not wired into shipping ProductRuntime. Nevertheless, BU-04's specific safety purpose is to keep stale hints hidden; F-01 defeats that contract and therefore blocks acceptance of this Build Unit.

**Builder corrections required:**
1. Preserve a sticky, coordinator-visible invalidated/recovery-required state after any failed backing invalidation. Do not clear it just because the promise settled. New advisory reads must return `stale` or `recovery-required`, never resurrect the old raw `advisory` result.
2. Define an explicit, verifiable repair procedure: after fault resolution, rerun a fresh full local enumeration and successfully replace the local snapshot under the current identity/cursor/epoch/scope, or otherwise demonstrate a successful durable invalidation before allowing advisory reuse. Avoid an unrecoverable permanent lockout.
3. Preserve immediate gating on all events, `onChange`, `resume`, `vault-ready`, and awaited scope invalidation; protect across multiple overlapping invalidation requests so completion/failure of one cannot prematurely expose hints from another.
4. Add deterministic adversarial regression(s) in existing test suites: previously advisory hint, injected *rejected* backing invalidation, read after failure must stay stale; successful repair/re-enumeration restores only current included observations; overlapping invalidations remain closed; source error paths do not mutate canonical BASE, cursor, remote inventory or durable intents. Test an event failure as well as the awaited scope-change path.
5. Freeze corrected immutable source/tree, run original full substantive PHX-CI software qualification via existing approved operator, preserve and publish canonical evidence, then issue a **new** Builder→Independent Reviewer handoff for both blind-first and evidence passes. Do not weaken the intended stale-hint oracle or change script/guard budget.

## Original exact-source PHX-CI evidence

**Run ID:** `76cc9c7b-23f4-4c5e-925b-ea08e6b2d1f8`  
**Evidence commit:** `5e4ea101cc3e3b7f3bdafc4346fd5a587f11acba`  
**Canonical original evidence:** `dev/test-results/76cc9c7b-23f4-4c5e-925b-ea08e6b2d1f8/result.md`, `result.json`, `terminal.log`  
**PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`

The original `result.md`, `result.json` and `terminal.log` were inspected *after* blind publication. They establish an actual Windows local software-only qualification: expected HEAD, verified HEAD and tree are the exact frozen identities; **13/13 required stages PASS, focused 634/634 PASS, product 1323/1323 PASS, typecheck/build/artifacts/repository checks PASS, original exit 0**. These results are genuine, immutable and preserved, but do not contradict a concrete untested failure mode. No Reviewer software execution was performed.

Source comparison from independently accepted BU-03 closeout `c3bfbb8cbb0aa3dbb775e524607275dac4760e1b` to frozen BU-04 is two commits ahead, none behind. The production delta is isolated to `src/state/verified-local-inventory.ts` (39 insertions, 7 deletions); 101 additions to the existing local-observation integration test; planning and state only. There is no new shipping planner, provider access, scripts or installation activation.

## Authored test inspection, ten-family assessment and oracle integrity

Reviewed `tests/integration/dec339-local-observation-integration.test.ts` lines 254–353:
- The first new case delays backing invalidation after a resume notification and correctly proves coordinator advisory reads immediately return stale while the raw store still considers the marker complete. After successful release it refreshes and returns advisory again.
- The second case holds an in-flight raw hint read, emits an `onChange` event, releases the read and correctly requires the result to be stale.
- **Neither case rejects the backing invalidation promise.** Both assume eventual success. Therefore the missing sticky-failure test is substantive, not a duplicate of existing assertions. No oracle has been intentionally weakened; coverage simply does not reach the failed-persistence branch.

| Required family | Assessment |
| --- | --- |
| 1 Nominal | PASS — healthy advisory→event→successful invalidation→fresh advisory |
| 2 Negative/boundary | **GAP/BLOCKER** — failed IDB invalidation must not re-expose stale advisory |
| 3 Allowed/forbidden state transitions | **GAP/BLOCKER** — no terminal failed-invalidation visibility state |
| 4 Retry/recovery | **GAP/BLOCKER** — no demonstrated safe recovery after failed invalidation |
| 5 Concurrency/races | PARTIAL — pending-write and in-flight read races covered; overlapping failures and settled rejection not |
| 6 Persistence/integrity | PARTIAL — successful invalidation confined to local pointer; failed durable transaction not tested |
| 7 Identity/security/trust | PASS for existing unchanged identity-fenced backing reader; failure-latch absence is trust-safety finding F-01 |
| 8 Contracts/compatibility | PASS for additive coordinator consumer seam; raw IDB contract unchanged |
| 9 Architecture/invariants | PASS — no new planner/executor, no live activation, PHX-CI repository guards PASS |
| 10 End-to-end/fail-closed/destructive | **GAP/BLOCKER** — coordinator→failing storage→subsequent advisory consumer path not covered |

## Other limitations, not separate BU-04 blockers

- Coordinator pending/failure state is instance-local. Raw `IndexedDbInventoryObservationStore.readLocalHint()` and separate coordinator instances do not observe it. The planning explicitly reserves all-consumer wiring and cross-context proof for a separate WS-02 integration gate. Do not claim systemwide visibility.
- Real multi-WebView/browser IndexedDB versionchange/blocking, complete legacy cursor/rollback/recovery and local-scope owner wiring are still outside this BU. No broader WS-02 or DEC-339 activation authority is granted.
- **Blind information-isolation disclosure:** the required neutral feature planning and feature-local YAML handoff record contain Builder-produced status/result summaries incidentally visible during Pass 1. Source finding F-01 is independently reproducible from the frozen production logic; tests, prior findings, original PHX-CI evidence and source history were not opened until after the blind report was published.

**FINAL VERDICT: CORRECTION REQUIRED.** No Reviewer edits to production source, tests, fixtures, scripts or original PHX-CI evidence; no verification, GitHub Actions, merge, live vault/Drive/device operations, installation, activation, promotion or release occurred. Accepted BU-01/BU-02/BU-03 identities remain intact. Builder must correct and freshly qualify **BU-04 only**, then return for independent reassessment.
