# DEC-339 D339-07C — matched benchmark source audit

## Binding and scope

- Exact accepted predecessor: `edb628410c7f1a541c2966f282dc3eec1421bc0b`; D339-07B2 tested source `84a8d90b59f54330ba93092dcc3550b6015d8ef5`; 11/11 PHX-CI PASS, run `91784b87-1d85-4434-9d4a-69f99176d7ed`.
- D339-07C planning authority: `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/D339-07C-matched-inventory-performance-measurement.md`, initial task commit `e3ceadcc6deaefa97b2c2c6927ee59529b863c40`.
- Implementation branch: `dec339/d339-07c-matched-benchmark-01`; source `c77f1b71c5c5e7c27c7a288312e3ab4ed6b9b279`.
- Writable source diff: **two created product-test files only**: `test/dec339-matched-optimizer-benchmark.test.ts` (159 logical lines), `test/dec339-benchmark-observability.test.ts` (150 logical lines). No product, other tests, scripts, PHX-CI runtime, BVP lock, or feature-gate change.

## Matched case / proof audit (assertions not yet PHX-CI results)

| Case | Production method and real branch | Required assertion | Limit |
| --- | --- | --- | --- |
| flat-small: 1 file | `ProductSnapshotAssembler.assembleFull` vs `InventoryBackedSnapshotAssembler.assemble` and `ProductionSynchronizationPlanner.plan` | identical input/plan/cursor/BASE/tombstone, OFF one reconciliation and ON zero, ON lease read | logical provider call count, not real HTTP |
| nested-medium: 24 files | same plus nested `readInventoryRemoteListing` coverage/parent walk | plan parity and actual folder traversal; no writes | simulated provider/IndexedDB reads |
| flat-large: 128 files | same with increasing materialized snapshots | plan parity and response-size/memory observation | not a measured mobile safe memory limit |
| full-required | `InventoryBackedSnapshotAssembler.assemble` explicit full-reconcile bypass | true full-list fallback, cache not opened | no physical run |
| pending-effect | `assemble` trusted state outstanding-op branch | full-list fallback and semantic parity | full controller durable lifecycle not tested |
| stale-cursor | `assemble` snapshot cursor/manifest mismatch | full-list fallback, no cache use | controlled frozen authority |
| partial-coverage | `readInventoryRemoteListing` incomplete coverage | lease released, full-list fallback | deterministic fixture |
| fence-race | `assemble` final scope policy drift | real final-fence rejection and canonical reassembly | single-process race |

Metrics from PHX-CI terminal evidence have prefix `D339_07C_METRIC=`: controlled OFF/ON labels, case/scale, exact semantic/plan equality, logical full-reconciliation calls, local/authority/inventory read counts, elapsed wall milliseconds, pre/post Node heap/RSS observation, serialized inventory JSON byte estimate. Explicit **UNMEASURED**: endpoint/purpose HTTP counts, summed network latency, per-operation HTTP latency, full-run attribution coverage, actual IndexedDB durable bytes, and true process peak memory. This is *not* a genuine Drive network speedup claim or device budget and does not replay S09A.

## Proactive audit and next gate

20/20 final checked fixture/source/scope assertions passed on read-only static inspection, including paired fixture construction, complete visibility/terminal cursor, exact production planner semantics, bounded tests (≤250 lines each), fallback branch call verification and no effect dispatch. This is **not** an executable validation substitute. PHX-CI compilation, runtime behavior, BVP and product suites, build and repo/artifact verification remain **NOT RUN** on source `c77f1b71c5c5e7c27c7a288312e3ab4ed6b9b279`. If any failure arises, inspect all results and re-audit consolidated tests before the next run. No previous accepted 07B2 or S09A rerun for bookkeeping.

**Next human action**: execute a single owner PHX-CI command on exact source `c77f1b71c5c5e7c27c7a288312e3ab4ed6b9b279`, source branch above, base `edb628410c7f1a541c2966f282dc3eec1421bc0b`, installed runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, focused two 07C modules and accepted 07A/B regressions and BVP, then the standard suite. Only after PASS assess measurements and prepare D339-07 integrated closure and independent D339-08; keep optimization dormant.

**Final source extension:** The fallback module now also asserts the actual `ProductionSynchronizationPlanner` plan equality on all five fallback scenarios; it uses the same existing deterministic planner implementation (no custom planner or verification runner). Final source at the SHA above; 160/151 physical lines in the two allowed modules. No executable validation has occurred.


## PHX-CI accepted measurements and strict conclusion

- **PHX-CI acceptance:** run `2f20a8c8-3644-47cf-ad7a-b6081b806bec`, exact tested source `c77f1b71c5c5e7c27c7a288312e3ab4ed6b9b279`, evidence commit `97c136ec656f98601c6b51a1d35d391128f246e4`. Eleven of eleven stages PASS (preflight, Node preflight, Node project files, install, typecheck, focused tests, product tests, build, repository check, check, artifacts). Focused **34/34**, BVP **395/395**, product **961/961**, zero failed/skipped. `main.js` 904453 bytes, SHA256 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`, unchanged; only routine evidence added after source. Control checkout preserved.
- **Eight unique benchmark cases passed, each executed in both focused and product test stages** (22 metric records total = 11 unique metric lines per stage). Three matched cases: **1, 24 nested, 128 flat files**. For all three, actual `ProductionSynchronizationPlanner.plan` inputs, plans and cursor compared equal, zero mutations, OFF one logical full-reconciliation listing, ON zero, ON one inventory lease and three pointer reads. Plans contain respectively 2, 26 and 129 operations. The inventory's read operations remain nonzero; savings is **one mocked listForReconciliation call per fixture**, NOT measured Google API HTTP requests.
- **Five fallback cases** (full required, pending effect, stale cursor, partial coverage, scope-fence race) preserve exactly matched plan inputs and production plans: OFF one and ON one logical full listing, no writes. Guarded fallbacks are not treated as speedups.
- **Timing observations**: controlled in-process samples from the first test stage were OFF→ON `flat-small 2.3475→0.9887 ms`, `nested-medium 0.3952→0.4868 ms`, `flat-large 0.3060→0.6276 ms`; fallbacks ON included extra guard overhead. These micro-benchmarks have no stable repeated measurements, no network, no latency distributions and no optimization throughput guarantee; **do not claim a wall-time speedup**.
- **Memory/storage observations**: the test logged pre/post Node heap/RSS (not process/device peak), estimated JSON row bytes 863 (1-file), 8,989 (24-file), 43,046 (128-file); not actual persisted IndexedDB allocation or combined planning-memory peaks. The result records all `providerHTTPCounts`, `providerHTTPMs`, `perOperationLatency`, `attributedRequestCoverage`, `durableIndexedDbBytes` and `actualProcessPeakMemory` as **UNMEASURED**.
- **Disposition:** D339-07C's bounded **software verification assignment COMPLETE/PASS**; no additional rerun for administrative preference. Physical request/purpose attribution and actual network-latency reduction, resource budgets on Windows/iOS, full controller intent/recovery proof, independent adversarial review and activation authorization are **UNPROVEN, explicitly carried into D339-08**. Feature stays dormant. No manual S09A physical canary repetition.
