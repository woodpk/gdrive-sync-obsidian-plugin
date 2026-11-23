# DEC-339 / WS-02 / BU-06 — Real Multi-Context IndexedDB Upgrade and Rollback Gate

**Date:** 2026-11-22  
**Status:** BUILDER-QUALIFIED R3 PASS — independent Reviewer acceptance PENDING.  
**Branch:** `build/dec339-ws02-bu06-real-multicontext-upgrade-rollback-20261122`  
**Baseline:** BU-05 independently accepted/closed at `38b9eb88057d338e78425677f8742f5af6560015`; accepted source `0533ab2edc8f8631c72aee5bf5a3b1b23d1beb1b`.

## Purpose

Close the remaining WS-02 storage-realism gate that prior BU-01 through BU-05 reviews deliberately deferred: prove the actual browser IndexedDB implementation behaves safely across independent browsing contexts during v1→v2 upgrade, blocked upgrade, late completion, retry, and v2-aware rollback access.

This unit does **not** activate inventory, migrate a live user database, wire product scope owners, or alter Drive/vault behavior.

## Required end state

Using the real Chromium/Edge IndexedDB implementation on Windows, not the deterministic fake:

1. A production `IndexedDbStateByteStorage` v1 connection in one browser context receives `versionchange`, closes, and permits the production v2 inventory store in another context to complete the additive upgrade.
2. After upgrade, the old explicit-v1 reader fails closed with `VersionError`.
3. `IndexedDbInventoryAwareStateByteStorage` reads exactly the canonical bytes that existed before upgrade.
4. An independent stale v1 connection that intentionally refuses to close causes the production v2 open to report recovery-required/blocked rather than inventing an empty or trusted state.
5. After the blocker closes, late completion/retry is safe and deterministic; the v2-aware path becomes usable without canonical byte loss or replacement.
6. No test relies on lexical ordering of cursor tokens, inventory activation, or provider/vault operations.
7. Existing BU-01–BU-05 state/cursor/recovery protections remain unchanged.

## Implementation approach

- Reuse the existing npm/TypeScript/esbuild toolchain; add no dependency and no PowerShell launcher.
- Add a browser-only test harness under `tests/browser/` that imports the real production IndexedDB storage classes.
- Add a Node integration test under `tests/integration/` that:
  - bundles the harness with the already-installed esbuild;
  - serves it from a loopback HTTP origin;
  - launches installed Microsoft Edge headless on Windows;
  - orchestrates two independent same-origin browsing contexts;
  - captures one structured result and complete browser stderr/stdout diagnostics;
  - fails on Windows if Edge is unavailable; skips only on non-Windows development hosts.
- The browser test remains part of the normal `npm test` / PHX-CI software-only qualification. No second verification framework is introduced.

## Mandatory evidence

- Real-context successful v1→v2 arbitration.
- Explicit old-v1 reopen refusal after v2.
- Exact canonical-byte preservation through v2-aware read.
- Real blocked upgrade from a non-cooperating stale context.
- Safe close/late-completion/retry.
- Full existing PHX-CI software suite on the frozen source.
- Independent blind-first review after Builder qualification.

## Carry-forward / non-goals

- BU-05 minor finding concerning broader generic cursor-writer predecessor behavior remains a whole-WS-02 integration audit item.
- Live scope-owner and local-hint consumer wiring remains the next WS-02/05 integration unit after this storage gate.
- No inventory activation/cutover, master/PR #157 merge, live DB migration, real Drive/vault/device operations, physical testing, installation, promotion or release.


## Builder qualification history

- R1 source `b17a2c803090f718fbaa7a31438a153d980613ec` / tree `e9fc839c1bf760b219c0df30c42ad70464ffc963`, PHX-CI run `7b9ad4ec-d23e-433e-99ea-475e17399c90`, evidence `b5bfb1f55df65abdb5ea7e5182bc74454c31cd08`: change-set PASS; repository FAIL because Windows cleanup attempted to remove the Edge profile before Crashpad released `CrashpadMetrics-active.pma`. Browser/product assertions did not fail.
- R2 source `a278479987e7fb46ea02f22221c53ff4425e51a4` / tree `882480fc60d3aab46b3ce94c1f8faea6f5d5a86c`, PHX-CI run `e2b30f3d-2faa-45e6-be88-ae604e8cebcf`, evidence `dab102eb2f68e763d5f2866079aae8e1904205c5`: change-set PASS; repository FAIL because the harness could send `seedLegacy` to the iframe's initial `about:blank` document before the real frame listener was installed. No production assertion failure.
- R3 corrected the browser harness with an explicit ready handshake from the actual `/frame.html` document, bounded command/result waits, and robust Edge shutdown/profile cleanup. No production code changed in BU-06.
- Frozen R3 source: `9ff52fd316cbb23ca7cc8e9d5730221a85b04d5c`; tree: `82400e34216d682a516dfe694a19f2528c546e48`.
- Canonical R3 PHX-CI: run `6b7e7ed4-4f2a-423f-b43e-bf9b797035a5`, evidence-only child `ab4a458e4e8ee27c82ffd29ecc92a2164e5cbd22`, pinned runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`.
- **Verified R3 result:** 13/13 required stages PASS; focused **634/634 PASS**; full product **1339/1339 PASS**; real Windows Edge multi-context test PASS in ~9.8s; build/check/repository PASS; `main.js` 927076 bytes, SHA-256 `4bde1bad5045ba8f732d6e072b63110aadcb9ab8265d1454bb2a7dd9c860d828`; physical dispatch disabled.
- Evidence publication is exactly one child of the frozen R3 source and changes only `dev/_ca-output.md` and the new `dev/test-results/6b7e7ed4-4f2a-423f-b43e-bf9b797035a5/` bundle.
- **Current gate:** independent blind-first review of BU-06 R3. Builder qualification does not accept BU-06. Full WS-02/DEC-339 remain incomplete.
