# DEC-339 / WS-02 / BU-02 — v2-Aware Legacy Runtime and Cursor-Recovery Interoperability

**Date:** 2026-11-20. **Owner authorization:** 2026-11-19 continue approved DEC-339 integration sequence.  
**Builder:** `build-brain-67`. **Branch:** `build/dec339-ws02-bu02-v2-legacy-cursor-safety-20261120`.  
**Baseline:** accepted BU-01 closeout `719e9035e3741e485f85c5471915e4039c0c4436`.  
**Status:** **BU-02 independently ACCEPTED AND BUILDER CLOSED** (PASS WITH MINOR FINDINGS, 2026-11-20). Wider WS-02/DEC-339 gates remain incomplete.

## Bounded requirement and architecture

The production `ProductRuntime` presently instantiates `IndexedDbStateByteStorage`, which explicitly requests schema version 1 and cannot reopen a pairing database after the dormant inventory schema has advanced to v2. The existing `IndexedDbInventoryAwareStateByteStorage` deliberately opens without forcing schema version and performs canonical CAS/backup against `sync-state`, with invalidation of active inventory control when a canonical cursor or identity update is not atomically paired to its generation.

**BU-02 change:** use this already-implemented v2-aware state byte adapter for the **legacy production planner**. Opening a legacy pairing in v1 must not upgrade it; opening v2 must not enable inventory, migrate vault state, authorize a remote read/write, or bypass an existing authority/BASE/intent check. Normal canonical cursor writes in the legacy path must invalidate previously published inventory rather than leave stale local inventory actionable. Preserve existing source components and authoritative executor; do not create a new state authority or default-on planner cutover.

**Critical limitation:** This change is code-only for future compatibility. It is not authorization to install it into an active device/vault, run live migration, activate v2 inventory or promote a release. Real multi-WebView IndexedDB upgrade blocking and complete scoped recovery remain future gates.

## Mandatory requirement-to-test mapping

| Test family | Applicable BU-02 oracle / scope |
| --- | --- |
| 1 Nominal | Real `PersistentSynchronizationStateStore` reopened with v2-aware byte adapter on schema-v2 test database; cursor save succeeds |
| 2 Negative | v1-only adapter rejects upgraded database; stale CAS refuses to overwrite authoritative bytes |
| 3 State transitions | v1→v2 schema publication, legacy non-inventory authority open, cursor advance invalidates active inventory |
| 4 Retries/recovery | Restarts from upgraded bytes, preserves original backup; pending journal retained across repeated saves |
| 5 Concurrency/stale | Stale original CAS cannot mutate canonical authority; inventory control/mismatched authority never becomes actionable |
| 6 Persistence/integrity | Restarted authority, BASE and operation intents retain exact values; backup bytes unchanged |
| 7 Identity/security | Vault/device identity from canonical envelope unchanged; unchanged validation and fail-closed ID fences apply |
| 8 Contracts/compatibility | Existing `StateByteStorage` interface, two adapters and production runtime constructor wiring, no schema write on open |
| 9 Architecture | No new planner/executor, PHX-CI/PowerShell guard unchanged, only runtime storage constructor is selected |
| 10 E2E/fail-closed | Simulated v1/v2 storage and production-state API; real provider/vault/device operations **NOT MATERIALLY APPLICABLE** and unauthorized |

Relevant executable regression tests added to `tests/integration/dec339-indexeddb-transaction-integration.test.ts`; preserve BU-01's tests and other source oracles. Existing full PHX-CI suites qualify other unchanged state writers and architecture, but do not magically prove real-browser scheduling. The test fixture is synthetic; this limitation is explicit.

## Qualification and boundary

- Software verification **only with pinned PHX-CI** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, using the existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` with `-SoftwareOnlyBranch`; no new verification scripts, architecture budget adjustments or GitHub Actions.
- Preserve immutable BU-01 accepted SHA and its original R2 evidence, independent review and handoff count 2.
- Freeze an exact BU-02 implementation SHA/tree for PHX-CI; handle any failure via Builder repair and new exact-source rerun. Once fully qualified, hand off **only BU-02** to an independent blind-first Reviewer.
- Retain Reviewer M-01 (real multi-context IDB scheduling) for a future explicit browser-capable test gate; do not claim the entire WS-02 storage step or DEC-339 activation is complete.
- No master merge, PR #157 merge, live pairing/database migration, physical testing, Drive/vault activity, installation, activation or release.

## BU-02 authored implementation and verification readiness

- Production diff: `src/product/runtime.ts` selects the existing version-agnostic `IndexedDbInventoryAwareStateByteStorage` instead of the v1-only byte store; all planner, executor, scope, OAuth and activation paths are otherwise unchanged.
- Regression diff: `tests/integration/dec339-indexeddb-transaction-integration.test.ts` adds v2-aware canonical authority read/advance, preservation of schema-v1 state and backups, stale CAS and pending intent preservation, no implicit schema migration, plus a test of `SynchronizationStateAuthorityAdapter.saveTrusted` mirroring cursor progress into the same v2-aware canonical bytes.
- Last code/test source commit before this documentation update: `26713f9bbdb48ad4701e778f6e13991215f6aa63`.
- **Evidence state:** PHX-CI has not been run against BU-02. No tests or correctness checks were executed outside the approved PHX-CI framework, no Reviewer assignment was issued, and no qualification or acceptance is claimed.
- Pending final requirements include verifying actual test discovery, TypeScript typecheck, full immutable source/test PHX-CI result, and independent blind-first acceptance. Real browser/WebView two-context scheduling remains an explicitly deferred M-01 gate rather than an assumed success.

## R1 PHX-CI failure and causal corrections (2026-11-20)

**Original immutable failed run:** `f5464803-6b77-4ffd-bf9c-29cde7b4f91d`; frozen source `2f4cdc9949ffba16465ee73a1c1e83445b4f1d55`; GitHub evidence commit `f0484b63cb16c2c6310ad3e52aefe19f88d4058c`. Focused 632/634, product 1316/1318; typecheck PASS, change-set FAIL, repository FAIL, overall BLOCKED. Never relabel it.

**Observed independent defects and repairs:**

1. An unnecessary fifth PowerShell file `dev/scripts/Invoke-PHXCI-DEC339-WS02.ps1` was reintroduced by the BU-01 state publication *after* BU-01's already-accepted software source. It causes both `BVP_POWERSHELL_SCRIPT_COUNT` (5 exceeds 4) and the exact P1 script-inventory mismatch. Delete this script; reuse the pinned existing PHX-CI front door; leave both guard test oracles and the four-script ceiling intact. Preserve original historical commits and Reviewer acceptance.
2. The new upgraded-pairing test reused the cached legacy IDB connection without a `versionchange` signal. The synthetic `FakeDatabase` cannot autonomously deliver the real browser event. Deliver the test's explicit versionchange to the actual cached connection and assert it closes before opening/upgrading v2; then retain the negative assertion that a subsequent *fresh* explicit v1 open rejects with `VersionError`. The production v1 adapter already implements this necessary close behavior; no oracle weakening.
3. The unchanged LOG-03 production DiagnosticLogger composition test locates the diagnostic injection within a bounded source-text window of the state constructor. Newly added explanatory comments lengthened the window beyond the original 400-character bound without changing actual wiring. Relocate/shorten the comment outside the constructor, retaining the same `this.host.diagnostics` argument and the unmodified tracing test.

The corrected candidate requires fresh PHX-CI software-only qualification; no source/test or check is accepted merely because it is committed. Full WS-02 and DEC-339 gates remain incomplete; no live vault/Drive, installation or promotion.

## R2 exact-source qualification (2026-11-20)

- Qualified source SHA: `346f087202d76df89411d7e8cd79b8eecd2167b0`; exact source tree: `5bf2072ff7ff719b9fa8caab9c27d298b05548fc`.
- PHX-CI run: `bec72225-365c-47ae-bb87-f3336cb96fef`; original canonical evidence published at `9f9baae544593719cf606d1023a72ffa848c2def`, under `dev/test-results/bec72225-365c-47ae-bb87-f3336cb96fef/`.
- Read-back R2 outcome: 13/13 required stages PASS, focused 634/634 PASS, product 1318/1318 PASS, typecheck/build/artifact/repository checks PASS, overall PASS, exit 0. Physical dispatch disabled. No GitHub Actions or replacement script introduced. The R2 evidence commit changes only evidence records, not the qualified source tree.
- R1 original BLOCKED evidence remains preserved under the earlier run/commit; source defects, test fixture ordering and comment-window failure were corrected without lowering any guard or testing requirement.
- **Builder-qualified is not independently accepted.** This document preserves requirements-to-test continuity for the Reviewer’s post-blind evidence pass; the Reviewer must first freeze and publish its blind source assessment without reviewing this Builder narrative or test/PHX-CI details.
- Review scope is strictly BU-02: version-aware legacy `ProductRuntime` state adapter, canonical cursor/BASE and recovery-intent continuity, and fail-closed inventory pointer invalidation. Real browser multi-context IndexedDB upgrade blocking, local hint scope/resume, full WS-02 cursor/recovery gate, all DEC-339 planner activation and live promotion remain unverified/not authorized.

## Independent acceptance and Builder closeout (2026-11-20)

- Reviewer `review-brain-10` independently accepted BU-02 with PASS WITH MINOR FINDINGS, frozen report `dev/reviews/dec339-ws02-bu02-20261120-review-brain-10-final.md`, publication commit `84f408a2fb8fea0b5e2df5389369cc5587cd8f4d`; blind report commit `1b7f00cd5c92038e73037d98e21c3067e45f8abc`.
- Reviewer→Builder handoff count **2**, state commit `55bd8c5004e93bab0c200c0b8f31e749fb02ad32` verified directly in GitHub. No extra handoff count consumed by administrative closeout.
- Exact accepted source `346f087202d76df89411d7e8cd79b8eecd2167b0`, tree `5bf2072ff7ff719b9fa8caab9c27d298b05548fc`, original R2 PASS PHX-CI `bec72225-365c-47ae-bb87-f3336cb96fef` committed at `9f9baae544593719cf606d1023a72ffa848c2def`. R1 BLOCKED run `f5464803-6b77-4ffd-bf9c-29cde7b4f91d` remains immutable and correctly failed.
- Carry M-01 real browser/multi-WebView IndexedDB versionchange and upgrade-blocking, M-02 full cursor-writer/recovery/rollback/local inventory interoperability, and M-03 blind-phase metadata provenance observation to later gates. BU-02 closeout requires no new verification, implementation or merge.
- Next authorized dependency-safe WS-02 work is BU-03. Never infer completion of WS-02 or DEC-339 inventory activation from BU-02 acceptance.
