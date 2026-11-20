# WS-02 / DEC-339 / BU-05 — Cursor Writer Concurrency and Backup-First Recovery Gates

**Date:** 2026-11-20  
**Builder:** `build-brain-67`  
**Branch:** `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`  
**Baseline:** BU-04 independently accepted and closed at `5027e724765fbd915fa88714ba35b4bd97aeea99`  
**Status:** **BUILDER-QUALIFIED; independent Reviewer final acceptance PENDING.** Whole WS-02 and DEC-339 integration gates remain open.

## Purpose and bounded implementation

The accepted earlier WS-02 BUs provide a v2-aware production canonical byte-store and atomic invalidation of a published remote-inventory generation after nonfenced authority changes. BU-05 independently qualifies **two high-risk production pathways** through adversarial integration tests, without changing the previously accepted production logic:

1. **Concurrent learned-remote batch writer versus canonical cursor change:** two separate `PersistentSynchronizationStateStore` instances on the same version-aware IndexedDB pairing. A later stale `appendLearnedRemoteBatch` call must return `stale-persistence`, never overwrite the winning canonical cursor or leave an active old inventory generation. Restarted authority must preserve BASE and pending operation intents.
2. **Backup-first recovery from corrupted durable canonical bytes:** after an accepted inventory generation, preserve the original pre-corruption backup, write a deliberately invalid canonical envelope, verify fail-closed recovery-required and remote-inventory invalidation, then exercise `replaceRecoveryState` with an existing-pairing identity fence. The failed persisted bytes must be durably backed up before replacement; restarted recovery must preserve exact trusted cursor, BASE, pending intents, vault and device identities. Previous published inventory must not be reactivated by the restoration.

**Source diff:** `tests/integration/dec339-indexeddb-transaction-integration.test.ts` only, plus this planning and state continuity. This BU is a verification/requirements hardening increment; no production logic should be modified unless a real defect is revealed by PHX-CI. No GitHub Actions or new scripts. Tests are authored now but **not independently executed** until the pinned PHX-CI run.

## Mandatory ten-family coverage

| Family | Concrete expectation |
| --- | --- |
| 1. Nominal | Winning canonical save and correctly recovered replacement persist across restart |
| 2. Negative | Stale learned-batch writer refuses to overwrite newer cursor; corrupt authority is recovery-required |
| 3. Transitions | Canonical cursor progression invalidates active inventory; corrupted → recovery-required → backup-first replacement → trusted |
| 4. Retry/recovery | Restarted authority after winning write/recovery preserves state; original and new backup records remain |
| 5. Concurrency/staleness | Two independent state-store instances sharing IDB; stale persistence revision fails; no stale inventory |
| 6. Persistence/integrity | Backup byte-for-byte integrity; BASE/intent/cursor/device/vault identity intact across recovery |
| 7. Identity/authorization | Existing pairing expectedVaultIdentity/expectedDeviceIdentity passed to recovery; guard remains intact |
| 8. API/contracts | Existing `appendLearnedRemoteBatch`, `saveAuthority`, `createRecoveryBackup`, `replaceRecoveryState` APIs |
| 9. Architecture | No new planner, source change, PowerShell file, guard change, or activation |
| 10. E2E/fail-closed | Deterministic shared IndexedDB fixture from conflicting cursor writers through recovery to restarted state |

## Deferred work — expressly NOT accepted by this BU

The requirement to account for **every** canonical cursor writer (including the actual shipping `commitCursor` path), v2 schema upgrade behavior with genuine concurrent browser/WebView contexts, full recovery/rollback state-machine transitions, scope owner wiring, local hint consumers and shadow mode end-to-end remain separate WS-02/WS-05 gate items. This BU only adds negative/recovery tests for already-shipping implementations; it does **not** close those broader requirements. No real vault, Drive account or database will be accessed. The current legacy planner/executor remains authoritative, and inventory activation is prohibited.

## Next mandatory action

Freeze an exact BU-05 source SHA/tree, then qualify the candidate exclusively using existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` in `-SoftwareOnlyBranch` mode and pinned runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`. Preserve full original R1 evidence, fix legitimate tests/source failures, and request a blind-first independent Reviewer only after a conclusive PASS. Previously accepted BU-01 through BU-04 original evidence and review reports must remain unchanged. No master merge, PR #157 merge, live schema migration, inventory activation, physical testing, installation, release or promotion.

## Original PHX-CI R1 qualification and Builder→Reviewer transition (2026-11-20)

- Frozen exact candidate: `8d7785aa0e40bfaab3c446183422c64242aee070`, Git tree `d993895c7e22baaf12f62ae09693017d96a488bc`.
- The pinned PHX-CI operator already executed this source successfully: original run `d8e9b739-6353-44cd-a4b0-5695c4c09228`, published evidence-only commit `0508d6fe96d97cf44e18a47f7a407040e529357c`. Original result JSON, result Markdown and complete terminal log under `dev/test-results/d8e9b739-6353-44cd-a4b0-5695c4c09228/` inspected directly in GitHub.
- **Verified result:** 13/13 mandatory stages PASS, focused 634/634 PASS, product 1328/1328 PASS, typecheck/build/architecture/repository checks PASS, overall PASS/exit 0. Product/fixture code, authoritative state and tests were not changed by the evidence commit; physical dispatch disabled.
- Owner's subsequent bootstrap rejected the newer evidence-only HEAD `0508d6fe...` due to its exact-source pin. This was an appropriate safety stop, not a failed PHX-CI rerun. No second run is needed for the unchanged candidate.
- Builder→Independent Reviewer feature-local handoff count **1**. The Reviewer must publish a frozen blind-first source assessment *before* studying the authored tests, Builder narratives, earlier findings or PHX-CI evidence, then assess ten-family adequacy and original R1 evidence and publish a final verdict. This does **not** constitute independent acceptance.
- The remaining full cursor-writer matrix, genuine browser/WebView IDB upgrade conflicts, local hint/scope owner integration and rollback/recovery gates remain outside the accepted scope and **not satisfied** by BU-05 qualification. No master merge, activation, live migration, physical tests or release.
