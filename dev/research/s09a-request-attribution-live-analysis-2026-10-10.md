# S09A physical request-attribution analysis — 2026-10-10

**Disposition:** S09A bounded physical canary **COMPLETE**; request-attribution measurements extracted and reconciled. This report authorizes **no new physical run or change to production synchronization semantics**. Other S09 acceptance gates remain open.

## Source and provenance

- Owner-exported BRAIN Windows Obsidian **sanitized device diagnostic log**, JSON Lines, 2,000 retained events (sequences 640–2639). The October 10 run is **complete in the exported retention window**: diagnostic run ID `9`, 321 retained events, sequences 2319–2639. Earlier October 9 run 7 is **partially retained** and must not be analyzed as a complete control.
- Physical BVP scenario: `battery-s09a-request-attribution-03`; controller run ID `bvp-s09a-request-attribution-91213c1ce4274ebead2bc7e9b0c9794c`. Installed instrumented plugin SHA: `261520fd44fcec46b1e392a620481e8b14c72848`.
- PHX-CI physical run `0ddaa1b0-f249-449f-b4d1-5d1c8e5c2f2c`; verified source HEAD `bd0b53c349fd1bf1f4c4d96efa322b857ada2cb9`; PHX-CI evidence commit `d19380b45d33d2b5689ae974a3c282d3cda73762`; all stages PASS.
- Product receipt: `terminal=complete`, `requiredEffectsCommittedAndVerified=true`, `committedOperationCount=25`, `skippedOperationCount=0`. Safety assertions 8/8 PASS. Reviewed plan: 23 no-ops and **two exact approved upload-create targets** (parent folder, canary Markdown file). Read-only Google Drive inspection independently confirmed both objects afterward.

## Production HTTP request totals

| Endpoint class | Requests |
| --- | ---: |
| `drive.files.list` | 108 |
| `drive.files.get` | 90 |
| `drive.about` | 19 |
| `drive.files.generate-ids` | 2 |
| `drive.changes` | 1 |
| `drive.files.create` | 1 |
| `drive.upload.resumable-session` | 1 |
| `drive.upload.resumable` | 1 |
| **Total** | **223** |

All **223** transport events match the monitor's `requestCount=223`; 221 HTTP 200, two expected/not-found HTTP 404, **no retries**. `list + get = 198/223 (88.79%)`. Transport-event `latencyMs` sums to **32,939.6 ms**; the monitor reports **33,989 ms** summed request duration (difference 1,049.4 ms). These are independently measured timing fields; neither is wall-clock time. Diagnostic run elapsed approximately **42.33 seconds**.

## Per-operation attribution

| Operation index | Kind | Wall ms | Requests | List | Get | About | Other reads | Writes | 404 | Full reconciliations | Reconciliation wall ms | Complete |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2 | `upload-create` | 14,116 | 107 | 50 | 45 | 10 | 1 | 1 | 1 | 1 | 3,996 | yes |
| 3 | `upload-create` | 12,103 | 81 | 40 | 32 | 6 | 1 | 2 | 1 | 1 | 3,881 | yes |
| 1 and 4–25 | 23 `noop`s | 813 (aggregate) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | yes |
| **All operations** | | **27,032** | **188** | **90** | **77** | **16** | **2** | **3** | **2** | **2** | **7,877** | **25/25** |

The **188** operation-scoped requests are 84.30% of the 223 run requests. Of those, **167** are `files.list/files.get` (88.83%). Each write-bearing operation caused one full remote reconciliation; both together consumed **7.877 seconds of measured reconciliation wall time**. Numeric indices are not raw-path evidence; do not rely on them alone to establish which object was created.

## Request-purpose / caller-class totals

| Classified request purpose | Requests | Summed ms |
| --- | ---: | ---: |
| `managed-root-account` | 34 | 4,000 |
| `precondition-validation` | 33 | 5,388 |
| `mutation-dispatch` | 26 | 4,936 |
| `create-result-verification` | 25 | 3,147 |
| `full-reconciliation-tree` | 24 | 4,132 |
| `reconciliation-provenance` | 21 | 3,168 |
| `intent-preparation` | 18 | 2,615 |
| `parent-path-resolution` | 5 | 746 |
| `reserved-id-observation` | 2 | 201 |
| `unattributed` | 35 | 5,656 |
| **Total** | **223** | **33,989** |

These are **mutually exclusive scope labels**, not proven duplicate reads or requests safe to remove. For example, `mutation-dispatch` is a diagnostic purpose that includes contextually classified reads, not necessarily 26 write HTTP calls.

## Attribution completeness — explicit limitation

The final `sync.attribution/run-request-attribution` record states:

- `attributionComplete=false`
- `unattributedRequestCount=35`
- `incompleteOperationCount=0`
- `reconciliationCount=2`

The 35 unscoped `drive.http` events occur at **21:11:50.795–21:11:55.649 UTC**, strictly before `sync.controller/execution-start` at **21:12:05.057 UTC**. Breakdown: **18 list, 13 get, 3 about, 1 changes**. They belong to the pre-execution planning window by timestamp, but lack precise semantic scopes; this **does not** make the entire run fully attributed. All 188 post-start HTTP events reconcile to the 188 operation-scoped requests, and all 25 operation summaries report `attributionComplete=true`. The remaining gap is planning-scope measurement, **not a reason to rerun or repeat the completed canary**.

## Design implications and boundaries

The observed expensive areas are repeated managed-root and precondition checks, remote-tree discovery/provenance reads and two complete per-effect reconciliations. They make a **measured case to design** DEC-339's per-device verified metadata inventory, but no diagnostic alone proves any existing guard redundant.

- **WS-02:** specify durable indexed file/folder inventory schema; stable IDs, parent IDs, content/revision and provenance evidence; coverage/freshness/authority generations; cursor+inventory atomicity; migration/rollback and recovery while keeping BASE/history separate.
- **WS-03:** specify a complete root/domain baseline; Google Drive Changes API incremental application and lost-cursor fallback; duplicate same-name sibling handling; targeted ID/parent and provenance observations; explicit revalidation when coverage is missing.
- **WS-05:** integrate trusted proofs with the existing single planner/executor; preserve precondition, path uniqueness, convergence, durable intents, physical verification, uncertain-effect recovery, and fail-closed gates.
- **WS-07:** define PHX-CI-owned equivalence and negative tests (stale/partial/missing inventory, wrong account/root, duplicate names, cursor loss, concurrent changes, post-dispatch ambiguity, crash/recovery) and benchmark request totals, request-purpose counts and wall time against these **actual** baseline observations.

**No confirmed throughput-improvement estimate** can be derived by directly comparing the earlier 1,737-request, 23-effect initial sync with this 223-request, two-create canary: workloads differ. Planning-level instrumentation should be enhanced for end-to-end semantic attribution before asserting complete request-purpose coverage. Inventory implementation has **not** begun.

## Evidence handling

The raw owner-exported device diagnostic log is retained in the conversation attachment and **not copied into the repository**; this document preserves derived aggregate results only. No additional live synchronization or PHX-CI rerun is needed to create this research report.
