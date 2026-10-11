# DEC-339 D339-07C — matched benchmark source audit

## Binding and scope

- Exact accepted predecessor: `edb628410c7f1a541c2966f282dc3eec1421bc0b`; D339-07B2 tested source `84a8d90b59f54330ba93092dcc3550b6015d8ef5`; 11/11 PHX-CI PASS, run `91784b87-1d85-4434-9d4a-69f99176d7ed`.
- D339-07C planning authority: `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/D339-07C-matched-inventory-performance-measurement.md`, initial task commit `e3ceadcc6deaefa97b2c2c6927ee59529b863c40`.
- Implementation branch: `dec339/d339-07c-matched-benchmark-01`; source `9ec9f9e40d784c7954ebc7580c16ee6e5d15f4a9`.
- Writable source diff: **two created product-test files only**: `test/dec339-matched-optimizer-benchmark.test.ts` (159 logical lines), `test/dec339-benchmark-observability.test.ts` (144 logical lines). No product, other tests, scripts, PHX-CI runtime, BVP lock, or feature-gate change.

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

29/29 checked fixture/source/scope assertions passed on read-only static inspection, including paired fixture construction, complete visibility/terminal cursor, exact production planner semantics, bounded tests (≤250 lines each), fallback branch call verification and no effect dispatch. This is **not** an executable validation substitute. PHX-CI compilation, runtime behavior, BVP and product suites, build and repo/artifact verification remain **NOT RUN** on source `9ec9f9e40d784c7954ebc7580c16ee6e5d15f4a9`. If any failure arises, inspect all results and re-audit consolidated tests before the next run. No previous accepted 07B2 or S09A rerun for bookkeeping.

**Next human action**: execute a single owner PHX-CI command on exact source `9ec9f9e40d784c7954ebc7580c16ee6e5d15f4a9`, source branch above, base `edb628410c7f1a541c2966f282dc3eec1421bc0b`, installed runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, focused two 07C modules and accepted 07A/B regressions and BVP, then the standard suite. Only after PASS assess measurements and prepare D339-07 integrated closure and independent D339-08; keep optimization dormant.
