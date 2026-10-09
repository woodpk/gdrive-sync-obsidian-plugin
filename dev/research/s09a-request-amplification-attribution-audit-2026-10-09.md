# S09A production request amplification — diagnostic attribution audit

**Date:** 2026-10-09  
**Status:** investigation / attribution not fully closed; no behavior changes authorized by this report  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Audited source:** `76f243929eed929a0a548c24ea309fa616e965b3` (PHX-CI evidence head `c2720ce15a76f52fa9d8a6e089a9e2e86e215891`)  
**Physical S09A run:** `bvp-s09a-windows-initial-sync-20261009T113754861Z-eadfbfe3`  
**Scope:** strictly production request-amplification investigation and bounded telemetry design. No new live synchronization, state mutation, caching, concurrency change, or relaxation of authority verification.

## 1. Ground-truth observations

Operator-supplied read-only reports from persisted `data.json` (diagnostic level `info`, retention 2,000), corroborated by original BVP and subsequent late-receipt evidence:

| Metric | Observed |
|---|---:|
| Relevant retained events in UTC window | 1,914 |
| Completed production Google HTTP request events | 1,737 |
| `drive.files.list GET` | 833 (123.91 summed request seconds) |
| `drive.files.get GET` | 680 (65.49 summed request seconds) |
| `drive.about GET` | 167 (10.38 summed request seconds) |
| `drive.files.generate-ids GET` | 21 |
| `drive.files.create POST` | 8 |
| Resumable upload sessions `POST` | 13 |
| Resumable upload `PUT` | 13 |
| Change API `GET` | 2 |
| HTTP 404 `drive.files.get` | 21, one attempt apiece |
| Production run elapsed | 226.977 seconds, starting 11:38:29.005Z, ending 11:42:15.982Z |
| Execution phase | approximately 205.85 seconds from 11:38:50.131Z to completion |
| Confirmed durable effect result | 23 committed, 0 skipped, all required effects verified |

Calculated: 1,513 metadata `list/get` calls = **87.10% of all recorded HTTP calls**. Their summed request latency is **189.40 seconds**, versus approximately 221.23 seconds for all categories. **Sums are not wall-clock durations** because calls can overlap, and do not include all processing or scheduling overhead.

No individual retained HTTP latency explains a multi-minute stall: the maximum reported request latency was about 1.04 seconds. Calls were continuous over the execution phase, with repeated single-attempt 404 responses every ~9–11 seconds. This disproves a single stalled HTTP request as the main explanation, but does not on its own prove which internal routine generated each request.

The 21 ID-generation calls, 21 non-retryable 404s, and 8 metadata creates + 13 file uploads support a hypothesis of *reserved-ID absence observations on 21 new remote objects*. Exact request-to-operation correlation is not preserved at `info`, so this remains an inference.

**Important boundary:** the instrumented BVP mailbox transport in `test-platform/src/live-device/build-validation-artifact.ts` is constructed as `new GoogleHttpTransport(oauth, fetcher)` **without a diagnostic logger**. The observed `drive.http` events arise from the production diagnostic transport, not that separate mailbox transport. The existing run therefore already distinguishes production metadata requests from BVP mailbox traffic more clearly than previously assumed; mailbox timings still require their own diagnostics if separately suspected.

## 2. Source-established amplification chain

**A. Per-effect convergence verifies via complete remote reconciliation.**

- `src/product/authoritative-production-executor-base.ts`: `dispatchEffect()` reaches `convergenceFor()` after a physically verified effect (around lines 834–840).
- `verifyRemote()` calls `reads.drive.listForReconciliation(...)` (around lines 473–476), then searches the complete resulting remote entry set for the target path/object identity. This is repeated for each dispatched remote effect that takes this path.
- `src/drive/google-drive-port.ts`, `listForReconciliation()` (around lines 211–245) performs root/domain resolution, recursively lists both content and portable configuration domains, validates merged entries, and calls `validateManagedObjectProvenance()`.

**B. Each full reconciliation can cause many nested requests.**

- `listDomainReadOnly()` (around line 517) issues paginated `drive.files.list` requests **per folder** in the subtree, not one snapshot lookup.
- `validateManagedObjectProvenance()` (around lines 536–537) calls `managedObjectsForRoot()` and traverses ancestry with `findDomainAncestor()`. Its local `metadataCache` is recreated for each reconciliation; it is not a persistent cross-reconciliation cache.
- `listForReconciliation()` also clears its planning `pathCache` on each call. This does **not** imply caching is safe to add; it establishes that the current implementation recomputes independent evidence each time.

**C. Creation and account identity checks contribute additional reads.**

- `createReserved()` (around lines 298–302) checks the reserved ID before mutation, validates the configured root and parent, dispatches creation, then checks/validates the resulting object.
- `verifyReservedCreate()` (around line 403) revalidates ancestry, managed root, domain, and path.
- `validateManagedRoot()` → `guardPairedAccount()` → `currentAccountKey()` (around lines 200, 499–500) performs a Google `about` request. Some higher-level operations invoke these checks repeatedly.
- `resolveUniqueParent()`, `rootForFile()`, `pathForFile()`, and `domainRoots()` can each invoke further `getFile` or folder-list requests.

**Strong source-grounded hypothesis:** repeated full-tree convergence scans with repeated identity/domain/ancestry validation drive a large share of the 833 list and 680 get calls. This aligns with near-continuous production HTTP activity over ~206 seconds. It has **not** been demonstrated that a particular fraction of those requests is redundant or safely removable.

## 3. Exact attribution still missing

| Unknown | Why existing data cannot settle it | Required boundary |
|---|---|---|
| Full reconciliations per effect and elapsed time | `drive.semantic` is logged at `trace`, not at retained `info`; no per-pass counters | `verifyRemote` and `listForReconciliation` |
| Lists issued by folder traversal vs path-parent lookup vs provenance | HTTP logs have endpoint and duration, not trusted semantic caller class | `listDomainReadOnly`, `children`, `managedObjectsForRoot` |
| `getFile` calls from reserved-ID checks vs root validation vs ancestry | Same HTTP endpoint; request IDs lack semantic call attribution at `info` | `getFile` with explicit safe caller class |
| Time per physical operation and phase | Existing operation/effect boundaries are predominantly `syncTrace`; those events are not retained at `info` | Existing `ExecutionDiagnosticEmitter`, `ExecutionLifecycleObserver` |
| Safe unavoidable verification vs accidental duplicate reads | No proof at present of identical authority generation/revision, same observed state, and same verification purpose | Audited state semantics and tests **after** measuring |
| Mailbox relay/polling delay | The mailbox transport is separately constructed without production logger; polling failures in instrumented build are caught | Separate **BVP-only** relay timer diagnostics, if needed |

Existing `src/diagnostics/diagnostic-logger.ts` retains a default 2,000 events (maximum 5,000). Simply setting the plugin to `trace` during a run generating 1,737 HTTP completions would risk rotating away the beginning of the run. Therefore bulk unbounded trace logging is **not an acceptable attribution strategy**.

## 4. Bounded instrumentation specification — diagnostic only

Design the smallest additive, optional measurement capability **without invoking production effects or weakening any fail-closed checks**:

1. **Exact scope.** Attach an immutable, sanitized, explicit **operation/effect attribution context** (numeric run/operation index; categorical phase; no raw path or OAuth data) at the already-existing execution observer. Prefer explicit propagation at the chosen adapter boundary. Do not use an unscoped global “current operation” counter: simultaneous HTTP activity could contaminate counts.
2. **Categorical request counters.** Within a single operation, count `drive.files.list`, `drive.files.get`, `drive.about`, other reads, and writes; distinguish `full-reconciliation-tree`, `reconciliation-provenance`, `parent-path-resolution`, `reserved-id-observation`, `create-result-verification`, `precondition-validation`, and `unattributed`. Enumerated subphases must have stable categorical meaning.
3. **Elapsed wall time.** Record start/end duration by **operation** and key nested subphase; include request count, summed request latency and failure/retry count **separately**, never label summed request latency as wall time.
4. **Bounded output.** Aggregate in memory; emit at most **one compact `info` summary per physical operation**, plus one `info` run summary. Use allowlisted numeric/categorical fields. Do not emit all request details again, dump raw URLs, serialize object IDs, increase persistent diagnostic retention unilaterally, or emit a new stream on each folder.
5. **Completeness and provenance.** Include instrumented source commit, run ID, operation index/kind, whether counters cover the complete operation, and a diagnostic instrumentation version. Report unaccounted requests separately; fail the **attribution result** closed if categories or samples are missing, but never fail or alter a production sync because telemetry failed.
6. **Independence.** Distinguish an explicit managed-root account validation from a remote-tree scan and from a per-effect convergence proof. Do not combine events from the separate BVP mailbox transport with production transport counts.
7. **No semantics change.** No bypass, caching, coalescing, reordered effects, changes to parallelism, mutations, persistence format, reconciliation scope, or changed physical verification outcomes. Instrumentation must not throw into execution paths.
8. **Verification before live action.** Deterministic tests with nested paths and concurrent unrelated requests; prove counts by category match a fake transport's actual calls, preserve outcomes and exceptions, assert sanitization, and verify low-volume bounded output. Then run existing PHX-CI locally (no GitHub Actions). A physical follow-up requires separate explicit authorization and a safe non-initial-sync scenario.

## 5. Proposed exact touch points

| Priority | File / boundary | Observation required |
|---|---|---|
| P0 | `src/product/authority-execution-diagnostics.ts` plus `src/product/authoritative-production-executor-base.ts` | Per-operation start/end, precondition, dispatch, convergence; numeric index and operation kind; existing observer, not new orchestration |
| P0 | `src/drive/google-drive-port.ts::listForReconciliation` | Total pass count, wall elapsed, subtree page count, provenance-list/ancestor reads; successful/partial/failed classification |
| P0 | `src/drive/google-drive-port.ts::children/getFile/domainRoots/resolveUniqueParent` | Per-caller-class counts and safe latencies with explicit context |
| P1 | `src/drive/transport.ts` | Confirm counted request categories with exact HTTP completions (existing HTTP instrumentation); avoid duplicate event streams |
| P1 | `src/diagnostics/diagnostic-logger.ts` | Allowlist minimal new sanitized counter keys only if needed; unchanged safety/retention semantics |
| P1 | BVP deterministic tests | Exact counter attribution, concurrent traffic isolation, disabled-logger behavior, exception isolation and fidelity |
| P2 | BVP relay/poll path | Only if independent timing analysis still leaves a genuine result-delivery delay |

The BVP architecture guard freezes complexity budgets (framework core 4,000 logical lines, live agent/relay 750) and disallows extra platforms, bypasses and budget relaxation. The audit does not authorize altering those locks. Any implementation must explicitly check the existing budgets and preserve existing verification semantics.

## 6. Acceptance / decision boundary

**Minimum quantitative answer required** before proposing performance changes:

- Table by physical operation: index/kind, wall time, reconciliation passes, `list/get/about` requests, summed HTTP latency, 404 count, verification result, and instrumented/covered status.
- Table by semantic caller class: number of requests and their time, classified independently of raw endpoint.
- Coverage: every recorded production HTTP request either attributed to a safe category or counted as **unattributed**; reconcile totals to transport record counts for the same run without double counting.
- For each targeted optimization, demonstrate independently that the saved read is repeated work rather than a required independent authority or convergence proof. Maintain negative ambiguity/stale-authority tests and crash/recovery safety checks.
- Only then evaluate approaches such as safe reuse of proof within an unchanged authority generation. No optimization is approved by this audit.

**Present disposition:** production sync COMPLETE (23 verified, 0 skipped); original S09A battery verdict BLOCKED unchanged; controller lease released; PHX-CI test-focused failure separately traced to the missing `s09a-late-completion-recovery.test.js` deterministic registry entry; no further test/live run performed as part of this audit.
