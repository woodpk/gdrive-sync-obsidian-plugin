# P6-LIVE-A03 — 0.1.10 Resumption Pre-Action Snapshot

- Agent: `codex-desktop-p6-a03-resume-0.1.10-01`
- Snapshot timestamp: `2026-09-08T15:44:16.0771312-04:00`
- Installed plugin: `brain-google-drive-sync` version `0.1.10`
- Installed `main.js`: 733916 bytes; SHA-256 `f5ed8bf4eaaed81502fca50845fb5ed66234655389b0896d19d4d7edda2eefa4`
- Installed-build identity gate: PASS
- `data.json`: 61764 bytes; SHA-256 `a41ddefad879183b7fd80999f13e6cd064d75350dfec7622049bdf477992cd4c`
- Local `.obsidian/app.json`: 376 bytes; SHA-256 `633ad96b092359349fe8a91c5343b3631b197e16da775e4e5c04c28be5babeea`
- Device identity present: true
- Vault identity present: true
- Managed remote pairing present: true
- `firstSyncCompleted`: false
- `scopeReconcileRequired`: true
- `recoveryInProgress`: false
- Persisted sync-attention count: 0
- Audit record count: 126
- Diagnostic record count: 96
- Runtime initialized under 0.1.10 without a post-initialization diagnostic error.
- Product status surface reported immediately before review: `idle-ready`

## Preserved trusted-authority checkpoint

The last 0.1.9 bounded-reconcile export preserved immediately before installation reports:

- authority schema: 2
- state status: trusted
- state revision: `state:42`
- persistence revision: `state:42`
- semantic generation: `semantic:12`
- BASE entries: 12
- remote mappings: 12
- pending authority operations: 0
- tombstones: 0
- no BASE/mapping authority yet for `__brain_sync_portable_config__/app.json`

A fresh 0.1.10 diagnostics export was captured from the product at the review gate:

- export size: 11686 UTF-8 bytes
- export SHA-256: `c9b97e0607657a984546d10f4c146ff740c58b58e5237cf6f384abfd6e42e8d5`
- credential-pattern scan: PASS
- authority schema: 2
- state status: trusted
- state revision: `state:42`
- persistence revision: `state:42`
- semantic generation: `semantic:12`
- BASE entries: 12
- remote mappings: 12
- authority operations: 25 completed / 0 pending
- tombstones: 0
- known devices: 1
- learned remote batches: 0
- local transactions: 0
- BASE authority for portable `app.json`: absent
- remote mapping for portable `app.json`: absent

The raw export was not written to evidence because it contains persistent identity metadata. No state reset or synchronization action has occurred.

## Remote portable-config observation

- Direct parent listing count: 3 objects (`app.json`, `appearance.json`, `core-plugins.json`)
- Live `app.json` count: exactly 1
- Current object ID: `17BEbRR4zvjNN7ul3bjOfr37rTiY3gBN3`
- Current size: 351 bytes
- Current SHA-256: `ce2304324355039203028525c098a12887521a851c24bbaa6aee3a14700f8891`
- Created: `2026-08-27T03:16:22.936Z`
- Modified: `2026-08-27T03:16:22.936Z`
- Current revision ID: `0B0aJZGoaaV1YK3ZrOEllemE0VVVOcnJGUFVHVGxJRlhaMDJnPQ`
- Available revision count: 1
- Previous revision: none

## Pending UI evidence gate

The product's attention CSV was copied from the `BRAIN synchronization attention` modal and sanitized locally:

- export size: 420 UTF-8 bytes
- export SHA-256: `0aab011a4ea338a80b306008a2285973ec219e7d8d50504c2bd1c66d5050c7cb`
- credential-pattern scan: PASS
- current attention rows: 1
- target path: `__brain_sync_portable_config__/app.json`
- target status: `current`
- target category: `unresolved-conflict`
- reason: `opaque-binary`
- occurrence count: 3
- last trigger: `verify-reconcile`
- resolved: false

The raw CSV was not written to evidence because it contains run identifiers and timestamps. Native Obsidian control is not exposed to the automation interface, so the fresh reviewed plan requires the user to operate Obsidian while Codex reviews the resulting screenshots/evidence.

No Verify/Reconcile, Keep local, Sync Now, reset, reauthentication, deauthorization, or manual Drive mutation has been performed in this resumption task.
