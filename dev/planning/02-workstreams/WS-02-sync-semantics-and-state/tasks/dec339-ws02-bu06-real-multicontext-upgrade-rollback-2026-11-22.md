# DEC-339 / WS-02 / BU-06 — Real Multi-Context IndexedDB Upgrade and Rollback Gate

**Date:** 2026-11-22  
**Status:** ACTIVE BUILDER UNIT — software-only.  
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
