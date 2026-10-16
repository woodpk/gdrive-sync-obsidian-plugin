# S09 G1 — Invariant-Driven Settings Lifecycle Correction Round

Date: 2026-10-16. Repository: `woodpk/gdrive-sync-obsidian-plugin`.

## Reviewer-first assessment and decision

The independent reviewer REJECTED exact previous source `436afeee8897fc34764bbdddcdad0eea0be3365d` despite its legitimate PHX-CI 11/11 PASS. **F-01 MAJOR:** delayed create/pair could commit after completed deauthorization because it did not compare the pairing namespace. **F-02 MAJOR:** the UI built and queued a whole managed-exclusion array before acquiring the settings transaction, so relocation could undo a newer user exclusion. The reviewer also identified inadequate full-workflow concurrency audit, incomplete authority boundaries, incomplete adversarial scenarios and premature reliance on PHX-CI coverage. **The reviewer's diagnosis takes precedence over the implementing agent's prior self-assessment.**

**Status:** Corrective production source changes staged on the branch; **not yet test-writer accepted, not PHX-CI verified, not independently approved**. Previous PHX-CI evidence at `76651dbe3d91c1ffb2fb083b68ff742dff7e02e4` applies ONLY to the older rejected source.

## Writer and asynchronous-authority inventory

| Ownership | Actual writers / phases | Authority required |
|---|---|---|
| `src/product/settings-tab.ts` | Ordinary UI switches and text inputs; vault identity; **directory-only relocation Apply**; **user-rule-only exclusion edit**; Create/Pair/Deauthorize events | User intent only; managed metadata never captured before transaction |
| `src/main.ts` | `settingsUpdateChain`, `applySettingsPatch`, `mutateSettings`, runtime side-effect notification | Latest committed snapshot; managed exclusion derived at commit, scope-reconcile marker/version committed with edit |
| `src/product/plugin-data.ts` | `mutateSettings` / `persist` save queue, audit/diagnostics/attention; legacy standalone `saveSettings` | One serialized durable document; writes after failure must reconcile uncertainty before continuation; legacy full-snapshot API is not a production call path and remains a review concern |
| `src/product/runtime.ts` | Initialization device identity, managed exclusion normalization, CSV relocation recovery, full reconciliation completion, trusted baseline, recovery gate; create/pair remote after Drive awaits; deauthorize; relocation journal/transition/finalize | Latest durable settings, full identity tuple and runtime generation where appropriate; journal protects both paths; callback cannot retire a newer scope generation |
| `src/product/product-controller-base.ts` | Full snapshot assembly, delayed plan execution and full-reconciliation completion callback | Carry scope policy generation observed **before** assembling a plan to delayed completion |
| `src/drive/auth.ts` | Async authorization preparation, token exchange, refresh, invalidation, token deletion | In-flight requests may not restore token state after revocation; old runtime sessions must also be retired |
| `src/product/sync-plan-errors-path.ts` | Pure managed-path/user-rule derivation, pending journal handling | UI-visible rules exclude generated managed paths; transaction supplies current active/journal paths |
| Scheduler / scope readers | `ProductSyncScheduler`, `ProductPathScope`, controller callbacks and planner | Live settings evaluated for authorization and scope; no mutable stale snapshot may authorize a destructive effect |

## Shared invariants and corrective implementation

**INV-A / pairing authority:** In-flight Create/Pair binds `deviceIdentity`, `vaultIdentity`, `remoteRootId`, and `pairingStateNamespace` **before any asynchronous Drive operation**. Final `mutateSettings(latest)` compares the complete tuple and refuses any retired epoch, including unpaired → deauthorized-unpaired, repeat pairing, R2 or vault/device transition. Returned managed remote must match requested identity. A remote created remotely but not authorized locally is not automatically deleted.

**INV-B / user-vs-managed exclusion ownership:** UI carries only user-rule intents or only a relocation-directory intent. `main.ts` normalizes managed rules against the durable snapshot inside `mutateSettings`. Relocation journaling in runtime must use `latest.userExclusionPatterns` and preserve both operational paths; the previous `next.userExclusionPatterns` replay is removed. CSV transition/finalize preserves new user rules and never masks failed relocation as successful.

**INV-C / scope receipt:** User exclusion changes atomically set `scopeReconcileRequired` and advance durable `scopeReconcileGeneration`; full reconciliation captures version **before snapshot acquisition** and can clear the marker only if the committed generation remains identical. Old receipts cannot erase later user policy edits. Missing optional version is normalized to zero for existing installations.

**INV-D / authorization lifetime:** `runtimeGeneration` retires asynchronous initialization when deauthorization, unloading/disposal or a superseding initialization occurs. The complete opening pairing epoch is checked after awaits and before dependent side effects. Runtime tracks created OAuth sessions until revocation or supersession; superseding initialization/disposal retires pending operations without erasing valid tokens. OAuth session token exchange/refresh/PKCE preparation checks its revocation generation before applying post-await effects. Clear Tokens revokes transaction authority as well as stored tokens.

**INV-E / durability:** Repository `mutateSettings` remains the latest-state persistence authority; rejected/unconfirmed saves may not be treated as committed. Old-pairing runtime completion callbacks remain bound. Recovery and crash journal rules are retained; no automatic deletion or live mutation is authorized by this source-only correction.

## Mandatory independent PHX-CI test-writer handoff

The **PHX-CI test writer, not this implementing agent**, must independently inspect all affected code/semantics; identify static defects and recommendations **before** test-authoring; determine comprehensive interleaving, failure, restart and lifecycle coverage; create and own all verification batteries/files/artifacts under governance; then validate exact source with pinned PHX-CI after test-writer corrections are resolved. Use actual UI event paths where practical, not just direct host mutations. Preserve the original evidence, previous rejection, and software-only/physical acceptance distinction.

No implementing-agent tests, PHX-CI run, test result, independent review request or merge is claimed in this round.

## Adversarial residual checklist / decision blockers

- Check that a deauthorization or re-pair while a slow initialize, PKCE, token exchange, token refresh, relocation or full run is suspended cannot resurrect stale authority or restore excluded content eligibility.
- Check both orders of user-exclusion change versus relocation; verify source/destination journal and runtime protections remain effective after failures and restart. Challenge stale tab instances and repeated rapid edits.
- Check scope-generation durability, overflow and old-run completion, including failed-before-write and failed-after-write outcomes.
- Inspect the historical public `PluginDataRepository.saveSettings(snapshot)` compatibility API for possible future stale-writer bypass; no production caller was found in the inventoried main/runtime/UI paths.
- Revalidate inherited G1-01–G1-06, safe-union versus R1 BASE, authentic repo/branch/evidence identity, and frozen PHX-CI architecture. Historical physical `data.json` disappearance/corruption root cause is unresolved.
- Separate **source inspected**, **test-writer findings**, **PHX-CI PASS**, **independent adjudication**, and **owner integration** as distinct gates. DEC-344 does not waive F-01/F-02.

**Exact tasking:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md`, S09 G1. No master merge, release, artifact promotion, live Drive/vault, physical S09 or Stage 3.
