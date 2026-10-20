# S09 G1-07 — independent REJECT validation and bounded runtime-write repair

**Date:** 2026-10-16
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Reviewed immutable source:** `aecd0b15497789869df8cb57094bcdec3a2bfe6d`
**Prior PHX-CI run:** `95725e97-1e5d-4883-a86f-a4370b49e932` — original historical PASS for *that exact source*, evidence commit `5448e214dfc18d7d7f08cb78f5c9270b8d34a621`.

## Finding adjudication

**G1-07 — MODERATE / BLOCKING, CONFIRMED by source reasoning, not physically reproduced.** The prior UI-only `settingsUpdateChain` and repository `patchSettings` did not serialize concurrent `ProductRuntimeHost.saveSettings(completeSnapshot)` against live UI patches. The runtime full-reconciliation callback could read `periodicEnabled=true`, wait while UI persisted `false`, and then persist a full old snapshot with `true`. Similar stale whole-document writers existed for recovery/baseline, startup normalization, scope reconciliation, sync-plan-errors relocation, and remote pairing/deauthorization. Mere physical `saveData` serialization did not ensure logical field atomicity.

**G1-06 — historical MAJOR, independently reported as CORRECTED.** Legacy partial-pairing isolation and safe-union simulation remain outside this repair's implementation scope. Physical Drive/Obsidian/IndexedDB validation still pending S09 physical acceptance.

## Bounded implementation

- `src/product/plugin-data.ts`: introduce `mutateSettings(transform)`, evaluated inside the existing `saveChain` against the latest committed snapshot with identity guards, cloned arrays, and the existing failed/uncertain-write protection. `patchSettings` delegates to this common owner.
- `src/main.ts`: replace obsolete whole-settings runtime callback with the common transactional host mutation seam. UI patches apply against latest persisted state; automatic synchronization flags are reevaluated *inside* the mutation after concurrent recovery/first-sync changes.
- `src/product/runtime.ts`: convert runtime settings authors (initial device identity, startup exclusion normalization, recovery/full-reconciliation/first-sync callbacks, exclusion and relocation journals, managed-root create/pair, and deauthorization) to latest-state transactional mutations. Relocation retains durable journal ordering, explicit source/destination checks, and explicit exclusions; pairing retains fresh-epoch/deauthorization safety. Post-run completion callbacks are bound to their original pairing to prevent stale R1 callbacks from changing R2.
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`: deterministic two-way interleaving of actual runtime full-reconciliation completion vs UI-style settings edit over real `PluginDataRepository`, delayed durable write, restart check, and rejection of stale R1 completion after replacement R2 pairing.
- `test/plugin-data-integrity-regression.test.ts`: failed-before-write and failed-after-write runtime mutation isolation, later UI patch behavior and restart. Existing G1-01–G1-07 regressions remain in scope for PHX-CI.
- `test/phase6-alpha-oauth-lifecycle.test.ts` and existing runtime test fixtures updated for shared host mutation contract.

## Verification and governance boundary

**STAGED ONLY; NEW CORRECTIVE SOURCE IS NOT PHX-CI VERIFIED.** Source inspection and new tests are not a PHX-CI result. The prior run PASS remains true but is not proof of correctness of these new commits.

The next actual software-verification authority is only pinned PHX-CI runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, base `b1e2ebaee3077e34a4eefaf601ee8124078b7400`, focused `npm run test:bvp-root`, full repository tests and all existing gates, `PublicationMode=push`, development classification. Run on final exact source SHA; preserve BLOCKED/PASS evidence distinctly. If PASS, request a genuinely independent READ-ONLY reassessment of this bounded G1-07 correction and inherited controls. Follow Section 37.1; no owner rerun for purely administrative evidence changes once substantive results are conclusive.

DEC-340-01 remains **CONFIRMED / UNFIXED / owner-risk-accepted nonblocking** under locked DEC-344 for software-only integration consideration, not a waiver for G1-07. No software-only merge authorization, release-artifact digest approval, installation, activation, live Drive/vault, physical S09 acceptance, historical `data.json` corruption root-cause conclusion, or Stage 3.

**Exact Tasking Location:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md` — S09 G1 plugin-data integrity mitigation; prior independent reassessment `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-g106-g107-post-phxci-independent-reassessment.md`.
