# Current Engineering Handoff — 2026-10-10

## Active status

Stage 2A / WS-07 / BVP-S09A physical Windows/iOS validation remains **BLOCKED**, not accepted. The investigation branch `bvp-s09a-request-attribution-01` was confirmed at `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`; the installed instrumented plugin source is `261520fd44fcec46b1e392a620481e8b14c72848` (previously green PHX-CI evidence head `bd743b9a5791bcb81b57540272866a06c23ed43f`). The most recent PHX-CI run `0305ae37-f999-4938-b3ef-50cee012f4ae` is **BLOCKED**: focused S09A battery failed, full repository tests passed; it is not a green verification run.

Previous Windows initial synchronization completed 23 verified durable effects (zero skipped), while recording 1,737 production Google HTTP requests over ~227 seconds. Per-operation attribution instrumentation was implemented and previously verified, but has not yet been successfully measured in a physical execution. S09A `live03` reviewed a plan of 23 no-ops plus two `upload-create` operations, then **stopped before physical execution** at `require-one-nonnoop`.

The approved canary is `BVP-VALIDATION/bvp-s09a-request-attribution-fa6eef85-live02/s09a-attribution-canary.md`. The second opaque path hash resolves to its parent `BVP-VALIDATION/bvp-s09a-request-attribution-fa6eef85-live02`. A read-only local scan found the canary file; **remote parent-folder occupancy and provenance have not been independently established**. Do not silently broaden the one-operation authorization to two or rerun the failed physical scenario.

A separate `data.json` corruption/loss incident required recovery of original pairing/device identity with IndexedDB preserved. Subsequent authority observations were trusted, but the corruption cause remains unknown. Do not reset, re-pair, or reauthenticate as a shortcut. S09A iOS acceptance, later S09, and Stage 3 are still pending.

## Future architecture — approved for planning only

DEC-339 and Target Specification §7.9 record the agreed per-device compact, persistent **file/folder metadata inventory**, updated from a trustworthy baseline plus Google Drive Changes API. Preserve BASE/history as distinct authority, existing durable-intent/ID retry guarantees, fail-closed partial/stale/ambiguous handling, and independent verification obligations. WS-02 owns state/authority, WS-03 Drive metadata/change detection, WS-05 integration, WS-07 PHX-CI verification. Exact data schema, indexing/migration, and safe targeted-proof substitutions are future design work. No implementation or new physical mutation is authorized by this planning update.

## Next action

Read-only establish whether the canary parent directory already exists in the exact managed Drive domain and whether planner identity/provenance is correct. Then determine the narrowest safe scenario correction with explicit owner authorization. New source and validation changes require PHX-CI; no GitHub Actions or separate validation framework.

This handoff supersedes the October 7 directory-standardization next action; migration history remains in Git history and existing PHX-CI records.
