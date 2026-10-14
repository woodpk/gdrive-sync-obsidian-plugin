# P6-LIVE-A03 0.1.9 portable-config diagnosis

## Outcome

Primary classification: `LIVE_TEST_BASELINE_CONTAMINATION`.

The A03 `unresolved-conflict` for `__brain_sync_portable_config__/app.json` is semantically correct. Both LOCAL and REMOTE are present, their canonical content evidence differs, and the reset left synchronization state `uninitialized` with no BASE entry. The three control paths follow the same production rules: `appearance.json` and `core-plugins.json` are byte-identical on both sides and therefore `noop`; `hotkeys.json` is absent on both sides and therefore `noop`.

No production observation defect, planner defect, or conflict-classification defect was found. No code repair is required.

## Evidence boundary

The original in-memory A03 `PathSnapshot` objects and LOCAL observation tokens were not persisted. This report therefore distinguishes:

- direct historical evidence: the committed A03 preview, `state.status = uninitialized`, the preview operation/reason, durable audit events, and the pre-reset state supplied earlier in this validation sequence;
- read-only reconstruction: current LOCAL stat/hash evidence and current REMOTE metadata/hash/revision evidence.

The reconstruction is strongly tied to the A03 moment. The LOCAL files' modification times precede the A03 conflict audit event at `2026-09-07T20:52:40.861Z`, and the REMOTE objects have not been modified since `2026-08-27`. No exact historical token is fabricated.

## Four-path comparison

| Logical path | LOCAL exists | LOCAL hash | REMOTE exists | REMOTE hash | BASE | Expected first-sync result | Actual A03 result | Match? |
| --- | ---: | --- | ---: | --- | --- | --- | --- | --- |
| `__brain_sync_portable_config__/app.json` | yes (376 B) | `633ad96b…babeea` | yes (351 B) | `ce230432…0f8891` | uninitialized; no entry | `unresolved-conflict` | `unresolved-conflict` | yes |
| `__brain_sync_portable_config__/appearance.json` | yes (54 B) | `1a52f841…64dd4d` | yes (54 B) | `1a52f841…64dd4d` | uninitialized; no entry | `noop` | `noop` | yes |
| `__brain_sync_portable_config__/core-plugins.json` | yes (696 B) | `763cf20a…14276` | yes (696 B) | `763cf20a…14276` | uninitialized; no entry | `noop` | `noop` | yes |
| `__brain_sync_portable_config__/hotkeys.json` | no | — | no | — | uninitialized; no entry | `noop` | `noop` | yes |

Full hashes and revision IDs are in the adjacent JSON evidence files.

## Exact `app.json` finding

This is Case E: both sides are present and different.

- LOCAL physical mapping: `.obsidian/app.json` under the active `.obsidian` directory.
- LOCAL: file, readable, stable across the bounded observation, 376 bytes, SHA-256 `633ad96b092359349fe8a91c5343b3631b197e16da775e4e5c04c28be5babeea`.
- REMOTE: file ID `17BEbRR4zvjNN7ul3bjOfr37rTiY3gBN3`, 351 bytes, SHA-256 `ce2304324355039203028525c098a12887521a851c24bbaa6aee3a14700f8891`, one returned revision, created/modified `2026-08-27T03:16:22.936Z`.
- BASE: `uninitialized`; no entry.
- Identity: one live object at the expected path; no live same-path duplicate.

The REMOTE object belongs to portable-config domain folder `1nM0RhMPB4qMDHfvxCTVDvU9YZYReN5G2`, whose parent is the installed plugin's paired managed root `1kwJe5rq6DFhcZFBa-JjC0X0AaN3gbW1B`. The direct-child enumeration returned exactly three live objects and no nested folders under a 1000-entry scan cap, so current domain enumeration was complete.

## Contamination evidence

The REMOTE `app.json`, `appearance.json`, and `core-plugins.json` objects were created on `2026-08-27`, eleven days before A03. Durable plugin audit history also records earlier `opaque-binary` conflicts for this exact `app.json` logical path on `2026-08-28` and `2026-08-29`. A pre-reset state capture contains trusted BASE/mapping entries for the same REMOTE `appearance.json` and `core-plugins.json` object IDs, demonstrating earlier synchronization activity in this portable-config domain. The precise action that originally created REMOTE `app.json` cannot be proven from retained evidence, so causation is not inferred from its timestamp alone.

The clean-state reset removed current IndexedDB authority state but did not remove these pre-existing Drive objects. That made A03 a no-BASE safe-union attempt against an already-populated REMOTE portable-config domain.

## Production source trace

Installed artifact lineage is exact: installed `main.js` is 722,333 bytes with SHA-256 `9d45d5b3ba26218d3a47dae62ac2c0798133937197811cae185b0aee022128b2`, matching the published 0.1.9 asset. Tag `0.1.9` points to commit `f0369d342a65294e8f4b14c44009b93f4157654a`. GitHub comparison shows that commit differs from integrated source commit `e7c6eebacbec1c882a25a18e4617e2d492e78188` only in `manifest.json`, `package.json`, and `package-lock.json`, so the relevant production source below is the exact release implementation.

1. `src/local/config-policy.ts:10-15,65-75` defines the four-file allowlist and policy IDs.
2. `src/product/path-scope.ts:38-61` maps `__brain_sync_portable_config__/<name>` to `<active config directory>/<name>`; `:77-118` observes all four allowlisted paths and carries path-scoped uncertainty.
3. `src/product/runtime.ts:158-202` obtains the runtime active configuration directory, builds `ScopedLocalVault` plus canonical SHA-256 enrichment, and wires the snapshot assembler/conflict resolver.
4. `src/drive/google-drive-port.ts:14-30,48-59` defines the managed portable-config domain and REMOTE evidence; `:120-130,218-225` validates and completely enumerates the distinct domain; `:227-231` maps its objects into the logical namespace.
5. `src/product/snapshot-assembler.ts:260-297` assembles LOCAL, REMOTE, BASE, completeness, and identity without flattening uncertainty.
6. `src/core/planner.ts:223-255` applies first-sync safe-union rules. Equal sides become `noop`; divergent both-present with no BASE enters the conflict resolver.
7. `src/core/conflict-resolver.ts:223-234` returns `opaque-binary` when both sides exist but BASE is absent; `src/core/planner.ts:162-178` converts that assessment into `unresolved-conflict`.
8. `src/product/product-controller-base.ts:481-493` records the conflict for explicit resolution without mutating either version.

The smallest implicated production component is none: the observations, snapshot assembly, planner branch, and conflict resolver all agree with physical reality.

## Required next step

A03 must be rerun only after the supervisor authorizes and defines a clean REMOTE portable-config baseline reset. That cleanup is an external test-fixture correction, not a code repair. This task performed no synchronization, plan generation/execution, conflict resolution, configuration change, local-state change, or Drive mutation.
