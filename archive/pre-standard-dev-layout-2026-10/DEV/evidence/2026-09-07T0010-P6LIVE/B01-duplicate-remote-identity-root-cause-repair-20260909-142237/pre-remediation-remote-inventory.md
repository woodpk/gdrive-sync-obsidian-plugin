# B01 duplicate remote identity — pre-remediation inventory

- Captured read-only: 2026-09-09
- Logical path: `__brain_sync_portable_config__/app.json`
- Managed root: `1kwJe5rq6DFhcZFBa-JjC0X0AaN3gbW1B`
- Portable-config parent: `1nM0RhMPB4qMDHfvxCTVDvU9YZYReN5G2`
- Live targeted Drive mutation during this task: none

## Planner-visible objects

| Role established from A03/state | Drive object ID | Parent ID | Name | MIME | Created / modified (advisory) | Size | SHA-256 from fetched bytes | Drive revision identity | Live ordinary listing |
|---|---|---|---|---|---|---:|---|---|---|
| A03 predecessor; not current mapping | `17BEbRR4zvjNN7ul3bjOfr37rTiY3gBN3` | `1nM0RhMPB4qMDHfvxCTVDvU9YZYReN5G2` | `app.json` | `application/json` | `2026-08-27T03:16:22.936Z` / same | 351 | `ce2304324355039203028525c098a12887521a851c24bbaa6aee3a14700f8891` | `0B0aJZGoaaV1YK3ZrOEllemE0VVVOcnJGUFVHVGxJRlhaMDJnPQ` | yes |
| A03 current candidate; current BASE/mapping | `1dY96IomB5CC76N0UtyLclKvIzgZSMXKu` | `1nM0RhMPB4qMDHfvxCTVDvU9YZYReN5G2` | `app.json` | `application/json` | `2026-09-09T00:11:29.320Z` / same | 376 | `633ad96b092359349fe8a91c5343b3631b197e16da775e4e5c04c28be5babeea` | `0B0aJZGoaaV1YR2o1WEpaeVdwR3hNc3FEN0xWamhKK2Joc3JzPQ` | yes |

Both objects were returned by a fresh direct listing of the portable-config folder after the repair tests. That listing returns four live children total: the two `app.json` objects plus one unique `core-plugins.json` and one unique `appearance.json`. The ordinary content root contains ten unique direct files. No other same-logical-path live duplicate was found in the bounded managed-root inventory.

The connector metadata surface did not expose `trashed` or plugin `appProperties` directly. Live-child visibility proves both objects remain untrashed/planner-visible. Independent raw fetches proved the exact parent, name, MIME, timestamps, and sizes. The production candidate-creation code stamps `brainManagedRootId` and `brainSyncDomain=portable-config`; the connector did not expose enough metadata to assert the predecessor's property values, so none are invented here.

The current durable state remains `state:86` / `semantic:13`, with BASE and remote mapping pointing to candidate `1dY96...`, no tombstone, no pending durable intent, recovery false, and attention zero before B01 planning. A03 named predecessor `17BE...`, candidate `1dY96...`, resolution plan `plan:899f1dc52d3f67ed20515fc7fe4ed5248ba402c821fe08517ef63574bcd7cde4`, and operation `op:65be6365f4ca4b11552fa0b95252bc2d3ee14ddf41fb4e28f210deab2d720908`.

Incremental Changes state was not required to reproduce the defect: the manual full reconciliation's ordinary `trashed=false` domain listing returned both objects and snapshot assembly treated both as current occupancy.

## Exact B01 planner evidence

- Plan: `plan:aaaac2cd8943bafcd7913f36eb7039cde07b97bb7858ebae41d5f32333ca3b87`
- Counts: 14 total = 12 noop + 1 `upload-update` + 1 `blocked-unsafe`
- Intended operation: `upload-update` for `test-file-01.md`
- Blocking operation: `blocked-unsafe` for `__brain_sync_portable_config__/app.json`
- Reason code: `identity-ambiguous`
- Exact reason: `multiple distinct remote objects occupy the same logical path`
- Execution: not performed

Primary prior evidence: `../B01-0.1.11-local-edit-upload-human-20260909-131639/B01-FAIL-HARD-STOP.md`, `../B01-0.1.11-local-edit-upload-human-20260909-131639/sync-plan-errors.csv`, and `../A03-0.1.11-resumption-20260908-193926/A03-0.1.11-PASS.md`.
