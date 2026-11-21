# WS-02 / DEC-339 / BU-05 — Cursor Writer Concurrency and Backup-First Recovery Gates

**Date:** 2026-11-20  
**Builder:** `build-brain-67`  
**Branch:** `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`  
**Baseline:** BU-04 independently accepted and closed at `5027e724765fbd915fa88714ba35b4bd97aeea99`  
**Status:** **BUILDER IN PROGRESS — prior Reviewer handoff superseded by Owner before independent review; expanded BU-05 source NOT YET PHX-CI-QUALIFIED.** Whole WS-02 and DEC-339 integration gates remain open.

## Purpose and bounded implementation

The accepted earlier WS-02 BUs provide a v2-aware production canonical byte-store and atomic invalidation of a published remote-inventory generation after nonfenced authority changes. BU-05 independently qualifies **two high-risk production pathways** through adversarial integration tests, without changing the previously accepted production logic:

1. **Concurrent learned-remote batch writer versus canonical cursor change:** two separate `PersistentSynchronizationStateStore` instances on the same version-aware IndexedDB pairing. A later stale `appendLearnedRemoteBatch` call must return `stale-persistence`, never overwrite the winning canonical cursor or leave an active old inventory generation. Restarted authority must preserve BASE and pending operation intents.
2. **Backup-first recovery from corrupted durable canonical bytes:** after an accepted inventory generation, preserve the original pre-corruption backup, write a deliberately invalid canonical envelope, verify fail-closed recovery-required and remote-inventory invalidation, then exercise `replaceRecoveryState` with an existing-pairing identity fence. The failed persisted bytes must be durably backed up before replacement; restarted recovery must preserve exact trusted cursor, BASE, pending intents, vault and device identities. Previous published inventory must not be reactivated by the restoration.

**Source diff (expanded Owner-directed scope):** `src/state/persistent-state-store.ts` (fail-closed recovery identity fence), `src/product/product-controller-base.ts` (shipping `commitCursor` CAS predecessor guard), `src/product/product-controller.ts` (shipping durable Changes-learning batch/cursor continuity), and `tests/integration/dec339-indexeddb-transaction-integration.test.ts` (direct production-path regressions). The original two tests remain unmodified. No GitHub Actions or new scripts. New source and tests are NOT qualified until a fresh pinned PHX-CI run.

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

## Owner-directed completion before review — expanded BU-05 (2026-11-20)

Owner explicitly required finishing **all** BU-05 work before any independent Reviewer handoff. The earlier Builder→Reviewer handoff at `f0c2bc38319ec934c6c3bfcaf3d0bd15b7a49984` (handoff count **1**) is superseded *prospectively*, without deleting, decrementing or reusing that counter. The original source `8d7785aa0e40bfaab3c446183422c64242aee070` and PHX-CI PASS `d8e9b739-6353-44cd-a4b0-5695c4c09228` remain immutable **historical partial-scope evidence**, not qualification for the expanded source.

### Completed implementation scope and acceptance requirements for this BU

1. **Shipping `commitCursor` path:** factor the exact existing CAS write into `commitTrustedCursorWithCas` used by `ProductControllerBase.commitCursor`, then fail closed when the currently trusted canonical cursor is neither the snapshot's expected predecessor nor its already-learned terminal token. Never interpret opaque Drive tokens as orderable strings, and never allow a stale run to overwrite a newer cursor. Preserve BASE/intents and canonical-v2 invalidation.
2. **Shipping Changes-learning writer:** `persistLearnedRemoteBatch` must reject an unrelated terminal batch predecessor, refuse incompatible duplicate batch IDs, and reject an unrelated canonical cursor on retry rather than mirroring an old terminal token. Preserve durable already-learned-batch chaining when canonical cursor still lags an earlier batch's terminal token.
3. **Backup-first recovery identity:** `replaceRecoveryState` must require explicit expected vault and device identities and match them against the trusted replacement candidate *before* any backup or CAS; wrong/missing pairing evidence fails closed even when source bytes are corrupt. Preserve original prior backups and inventory invalidation; do not implicitly re-enable the inventory.
4. **Direct tests against shipping paths:** add candidate tests for commitCursor's exact production helper, durable Changes-learning writer, and refused wrong-device/wrong-vault recovery before write, in addition to the originally authored stale learned writer and backup integrity tests. Keep prior test oracles unchanged and all historical evidence preserved.
5. **Qualification:** freeze a new full source/tree; run all full software-only PHX-CI stages and authoritatively publish original evidence. Correct real defects, repeat only as prescribed. Independent blind-first review is *not* requested until complete implementation and new PASS.

### Remaining WS-02/DEC-339 gates outside this BU

Real cross-WebView/browser `versionchange` upgrade blocking, complete pre-/post-migration rollback and live scope-owner/consumer integration are not demonstrated by these synthetic code-path tests. They remain separately required for full WS-02 acceptance. This BU does not waive them or authorize live database migration, activation, provider/vault activity, merge or release.

### Final pre-qualification security correction

The recovery identity fence also rejects a readable **existing foreign pairing** before creating a backup or replacing canonical bytes, preventing a mismatched state from being treated as ordinary corruption. A dedicated test asserts that the original record and backup count remain unchanged. This is an additional fail-closed protection, not authorization for automated recovery. The final revised source **requires new PHX-CI qualification**.

## R2 BLOCKED and corrective R3 candidate (2026-11-20)

- Original full PHX-CI R2 run `d0260a16-e6f9-470d-a39c-bc0225e1e1a3` on source `d32e0219b2002ea054e48eea073ce2563d2cbde3` (tree `87f092cb4267c96869be9678a3d45dce4622bcc2`), evidence-only commit `e25b5aedf753250dc2f358e935ee28da13e6f705`. **BLOCKED, exit 201**; typecheck **FAIL, exit 2** from three TS2339 errors in `src/product/product-controller.ts` lines 51, 54, 55. Focused/product tests and build were not executed. Original PHX-CI JSON, Markdown and full terminal log preserved without modification.
- Cause: `SynchronizationAuthorityMetadataV1_1` is a limited remote-learning metadata model that has no canonical `changeCursor` property. The R2 implementation incorrectly used it for the cursor predecessor guard.
- R3 correction: retrieve trusted current canonical state through existing `options.stateStore.load(options.stateContext)`, fail closed unless trusted, compare its `changeCursor` to the learned batch predecessor or accepted terminal token, while preserving metadata-store learned-batch listing and CAS revision checks. No test assertions or frozen PHX-CI guard changed.
- R3 qualification **NOT YET RUN**. R1 was only for earlier partial BU-05; R2 was BLOCKED. Neither qualifies R3. The Builder retains ownership; independent review is prohibited until entire corrected BU-05 candidate passes full pinned PHX-CI.
