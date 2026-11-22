# WS-02 / DEC-339 / BU-05 — Cursor Writer Concurrency and Backup-First Recovery Gates

**Date:** 2026-11-20  
**Builder:** `build-brain-67`  
**Branch:** `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`  
**Baseline:** BU-04 independently accepted and closed at `5027e724765fbd915fa88714ba35b4bd97aeea99`  
**Status:** **BUILDER-QUALIFIED R7 PASS after R4 independent CORRECTION REQUIRED; independent Reviewer acceptance PENDING.** Whole WS-02 and DEC-339 integration gates remain open.

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

The expanded BU-05 now covers the shipping `commitCursor` path, durable Changes-learning cursor continuity, stale writer refusal, and backup-first recovery identity fencing. Genuine concurrent browser/WebView `versionchange` upgrade behavior, complete live pre-/post-migration rollback behavior, scope-owner wiring, local hint consumers, and shadow-mode end-to-end activation remain separate WS-02/WS-05 gate items. No real vault, Drive account or database is authorized by this BU. The current legacy planner/executor remains authoritative, and inventory activation is prohibited.

## Next mandatory action

Dispatch BU-05 to an independent Reviewer for a blind-first source assessment of frozen corrected R7 source `c47c88cde35dc827263e3ff7b1366a47bc41acb6` / tree `12d35229a727377583a134522f34d59a3acdac7c`, then review authored tests, prior R4 findings, correction history, and canonical R7 PHX-CI evidence only after the blind source assessment is frozen. Previously accepted BU-01 through BU-04 evidence and review reports remain unchanged. No master merge, PR #157 merge, live schema migration, inventory activation, physical testing, installation, release or promotion.

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
- R3 qualification ran on source `241e2659e7a56188be6565971dcdb542b5e51e4e` / tree `2ca31085b3c529a0df083444e94bbf07b3b4c3f3`, run `fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea`, evidence-only commit `279066e06404d695ab599e4d49629b10dd958923`. It was **BLOCKED, exit 201**: focused tests 634/634 PASS; full product suite 1330 PASS / 2 FAIL. Both failures were the same H-I6 restart-consumption regression: after durable Changes learning and a failed cursor mirror, restart resumed from the durable terminal token but the cursor-mirror gate rejected a canonical cursor that legitimately lagged behind an unambiguous durable learned-batch chain.

## R4 corrective qualification PASS and Reviewer handoff readiness (2026-11-21)

- R4 production correction commit: `9319472e7b3a075c1ddfccad87c1913d6d3758dc`; Git tree `4f9d90d7a899937114ee714fb4a0715efe78cb61`.
- Correction: `persistLearnedRemoteBatch` now permits cursor catch-up only through a complete, unique, non-cyclic durable learned-batch token chain. Missing links, forks, cycles, unrelated cursors and incompatible duplicate batch IDs remain fail-closed. No test oracle was weakened.
- Pinned PHX-CI runtime: `4cf0c865c7b189641e2acebc0a6ad757b6f01992`. Canonical R4 run: `99a90abf-16fd-4e31-a5ca-0d05589de610`; direct evidence-only publication commit: `8b9baeeb15e9ae57772e3e4fd43e1f3ad8d50689`.
- **Verified R4 result:** all 13 mandatory stages PASS; focused 634/634 PASS; full product suite 1332/1332 PASS; typecheck, build, artifact, repository and change-set checks PASS; overall PASS/exit 0. Built artifact `main.js` SHA-256 `a6bfcff1955e97022309c7c0a778a9ae8f043f7a62d0a2bfb8793b77b6d30d6e`.
- The evidence publication commit changes only `dev/_ca-output.md` and the immutable `dev/test-results/99a90abf-16fd-4e31-a5ca-0d05589de610/` evidence set. Frozen implementation identity remains `9319472e...`; do not substitute the later evidence/documentation HEAD as the reviewed implementation source.
- Builder→Independent Reviewer handoff is now permitted. The previously superseded handoff count **1** remains historical; the next outbound handoff is count **2**. Reviewer must freeze a blind source assessment before reading Builder narratives, authored tests, or PHX-CI evidence.


## R4 independent correction required → R7 corrected qualification PASS (2026-11-21 through 2026-11-22)

- Independent R4 review of source `9319472e7b3a075c1ddfccad87c1913d6d3758dc` returned **CORRECTION REQUIRED** with two blocking findings: F-01 allowed a conflicting learned-batch cursor edge to become durable before later cursor-mirror rejection; F-02 allowed same-ID/same-endpoint replay with changed observations to be treated as compatible.
- R5 first qualification attempt was blocked before SUT execution by a transient GitHub fetch reset. The later genuine R5 PHX-CI run on source `88fdb7ae26a63047817c5861191960a845c1af62` / tree `1d49e613e2b190e8bea0914f4237639958c15e34` reached the SUT and exposed a focused BVP recovery regression: the proposed history validator incorrectly treated legitimate non-advancing Changes observations as cursor cycles.
- R6 corrected that recovery regression, but its full product run exposed a Builder-authored fixture error: the new test incorrectly assumed `seeded()` established a non-null canonical cursor. That failure was not treated as an implementation acceptance signal; the Builder stopped iterative qualification and performed a complete cursor/history/writer audit before another run.
- The R7 correction replaces ad hoc token-graph reasoning with one durable-frontier model over opaque Drive tokens. Cursor-advancing learned batches form one ordered, unique, acyclic component around the canonical cursor; zero-advance batches remain durable observations without being modeled as cursor edges. New batches must begin at the durable frontier; stale predecessors, detached histories, forks, merges, cycles, and out-of-order retained observations fail closed.
- F-02 is closed through one canonical semantic batch normalization/equivalence contract covering ordered complete `RemoteChange` observations, including advisory metadata, while deliberately excluding persistence revision from semantic observation identity. Snapshot batch ID generation and replay comparison now use the same normalization.
- The correction also closes bypasses discovered during the full audit: the low-level `appendLearnedRemoteBatch` writer enforces logical predecessor continuity in addition to CAS; the generic `saveAuthority` CAS boundary makes already-durable batch content immutable and refuses unreduced batch deletion; snapshot incremental reads derive their cursor from the validated durable frontier rather than the last array element; exact replay is accepted only when related to the same retained cursor history.
- Adversarial coverage now includes: prewrite fork refusal, detached-history refusal, observation-order refusal, zero-advance observations carrying real changes, stale zero-advance writes behind a pending frontier, exact direct replay, incompatible direct replay, same-ID payload/advisory tampering, generic CAS payload rewrite, unreduced-batch deletion, direct-writer logical staleness with a current persistence revision, restart catch-up, BASE/intent preservation, and existing recovery/rebaseline scenarios.
- Frozen R7 implementation source: `c47c88cde35dc827263e3ff7b1366a47bc41acb6`; Git tree: `12d35229a727377583a134522f34d59a3acdac7c`.
- Canonical software-only PHX-CI R7 run: `ba32978e-3536-43bf-8b0a-4ffb4e456c22`, runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, evidence-only child commit `aa773cf65c5724182273c28cd603b97ef4a358a1`.
- **Verified R7 result:** 13/13 required stages PASS; focused BVP **634/634 PASS**; full product **1336/1336 PASS**; typecheck/build/artifacts/check/change-set/repository PASS; overall PASS/exit 0. Built `main.js`: 926008 bytes, SHA-256 `6825b343e8dfc38bdceda66b86dddeacc59f2fce6b773db349074036ff64531b`. Physical dispatch remained disabled.
- Evidence publication is exactly one child of the frozen source and changes only `dev/_ca-output.md` plus `dev/test-results/ba32978e-3536-43bf-8b0a-4ffb4e456c22/{result.json,result.md,terminal.log}`; it is not the implementation source.
- **Current gate:** new independent blind-first correction review. Builder qualification does not accept BU-05. Whole WS-02/DEC-339 remain incomplete; genuine multi-WebView/browser upgrade behavior and live scope-owner/integration gates remain open. No master merge, activation, live migration, real Drive/vault/device operations, physical testing, installation, promotion, or release.
