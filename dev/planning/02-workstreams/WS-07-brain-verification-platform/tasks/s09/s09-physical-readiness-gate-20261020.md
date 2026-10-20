# WS-07 S09 — Physical readiness and authorization gate (2026-10-20)

**Status: PREPARED / BLOCKED FOR EXECUTION.** This is a *read-only grounding and future gate contract*, not a reactivation of preplanned S09A–S09V, not an executable physical test assignment, not a software-verification result, and not release/installation/activation authority.

## 1. Source of truth and current baseline

Repository: `woodpk/gdrive-sync-obsidian-plugin`.

- Software-only S09 G1 integration: PR #153 MERGED into `master` at `067857effe1d930b25db4dd7879601a0f918e1b2`. Initial post-merge state commit: `d37edb9a1219a30616ea465fb8b0d7cda8d1ec03`; obtain fresh `master` HEAD before any later execution.
- Accepted exact production/test source: `9c100e4702190fe5e7908ea76f2f10068dc6e548`, tree `4c92e604228ae8a383bbb077a5535aa5e104607f`.
- Genuine PHX-CI qualification: `ba2e1467-ded5-48bb-9d86-4ee2de7b2f42`, PASS 11/11, original publication `18e2b38ec8da83395146dafbd6bdae1f3bdfbd20`, unchanged original run files under `dev/test-results/ba2e1467-ded5-48bb-9d86-4ee2de7b2f42/`.
- Independent review: `dev/reviews/s09-g1-20261020-review-brain-09-final.md`, commit `b45ed296b88e8423fa45a4ac29c2f478a01d9d7d`; verdict PASS WITH MINOR FINDINGS for the bounded **software** mitigation only. M-01 source-review isolation limitation, M-02 risk-accepted but unfixed DEC-340-01, M-03 unverified physical/runtime conditions remain retained.
- Governing physical scope: `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md` (especially prospective DEC-339 and S09 rules), `04-VERIFICATION-PLAN.md`, active product target specification §13 and `dev/authority/decision-register.yaml`. The former `tasks/s09/09a-...` through `09v-...` are **PREPLANNED / NOT-YET-EXECUTABLE**, and the current decomposition explicitly prohibits reactivating them or rerunning the old S09A canary automatically.

This contract is *not* a replacement Build Unit or a dispatch authorization. The old S09 G1 handoff-count remains 6; no new cross-role transfer is made by this planning step.

## 2. Existing physical evidence — preserve its distinct verdicts

1. Historical Windows initial-sync BVP run `bvp-s09a-windows-initial-sync-20261009T113754861Z-eadfbfe3` is **BLOCKED**, `device-result-unavailable`, due to a 60-second controller wait. Its original `result.json`, `result.md` and attempt records must remain unchanged. The separate `supplemental-late-completion.md` reports that production subsequently completed and verified 23 effects and preserved the canary; it **does not** establish the missing post-sync BVP observation/assertion steps or retroactively turn the battery PASS.
2. `dev/research/s09a-request-attribution-live-analysis-2026-10-10.md` records a different bounded Windows request-attribution **canary COMPLETE**, with one exact run having 25 committed operations and a measured 223 HTTP requests, 35 not attributed to a request-purpose scope. That supports only its bounded claims. It is not Windows+iOS baseline acceptance and is not permission for another run.
3. `04-VERIFICATION-PLAN.md` separately records an S09A canary issue involving an unexpected second `upload-create` hash resolving to the canary parent folder; remote existence/authority is **not independently established** under that decision. Preserve the safety guard and distinguish this from the separately completed attribution canary; resolve contradictory or stale run interpretations using the original *specific run* evidence before physical dispatch.
4. Historical physical data.json loss/corruption **root cause is unproved**, as distinguished from the accepted fail-closed software mitigation; see `dev/research/s09-g1-data-json-integrity-investigation-2026-10-14.md`.
5. `dev/scripts/README.md` says historical `Invoke-BVP-Battery.ps1` / `Invoke-BVP-Deterministic-Battery.ps1` are fail-closed compatibility sentinels. The live physical battery operator remains **BLOCKED** until a genuine PHX-CI-owned or explicitly PHX-CI-coordinated adapter is approved and available; direct Node battery execution is not verification authority. Current `test-platform/src/live-device/` implementation and live scenarios do not by themselves prove that a deployable, physically accepted artifact or PHX-CI adapter exists.

## 3. Required bindings before physical execution (currently NOT established)

All columns below are mandatory, scoped to **one** bounded future authorization. Resolve by original artifacts or deliberate Owner-approved physical fixture selection; do not infer from historical machines/accounts/roots.

| Binding | Current disposition | Evidence required |
| --- | --- | --- |
| Fresh integrated source / permitted verification base | `master` software integrated; future HEAD must be rechecked | Immutable Git source/tree, accepted source ancestry, current PHX-CI runtime, relevant current code/test evidence |
| S08 live-device infrastructure and physical-run adapter | Components and tests exist; **live PHX-CI execution route not accepted** | Named installed PHX-CI-owned adapter/version, successful PHX-CI-only qualification and no standalone validation shortcut |
| Windows installed Obsidian build | UNBOUND | Exact device/runtime/version, isolated vault, artifact manifest and `main.js` SHA, successful runtime load observation |
| iOS installed Obsidian build | UNBOUND | Exact device/runtime/version, independently loaded artifact, iOS-specific capability/permission observations |
| Validation-only artifact for each device | NOT PREPARED / NOT AUTHORIZED TO INSTALL | Source-built reproducible `build-identity.json`, `main.js` and `manifest.json` hashes; production-vs-validation build separation; explicit controlled-install approval |
| Google account / OAuth authority per device | UNBOUND / NO CREDENTIALS IN GIT | Authorized disposable account and managed root; same-device OAuth, no token export or shared secrets |
| Disposable local/remote fixtures | UNBOUND | Explicitly isolated Windows and iOS test vaults, bounded disposable Drive root, empty/safe starting state, object ID/path/parent allowlist, owner approval for any mutations |
| Identity and preservation preconditions | UNBOUND | Distinct device IDs, pairing namespace/remote identity, a read-only data.json existence/identity baseline before and after; fail closed on ambiguous existing state |
| Historical canary dispositions | OPEN | Exact-run reconciliation of completed versus blocked evidence; check unresolved parent-folder authority without automatically recreating a folder or rerunning canary |
| Physical operation budget and rollback | UNBOUND | Exact action allowlist, capped writes/requests/time, no personal vault or unrelated Drive data, stop conditions, authority/receipt/cleanup plan |
| Run/checkpoint/evidence binding | UNBOUND | Run ID, command device mapping, physical checkpoints, PHX-CI-owned attempt/result storage, bounded authorized resume semantics and final signed evidence |
| Human Owner execution authorization | **NOT GRANTED** | Explicit approval of devices, vault/Drive fixtures, authentication/install permissions, allowed read/write operations and physical-run scope |

Historical Windows device/relay identifiers in old BVP logs are evidence for their *old* runs, not current binding. iOS readiness or dual-device pairing cannot be inferred from a Windows-only canary. No new artifact digest has been authorized for product shipping.

## 4. Nonexecuting prerequisite sequence

**P0 — Read-only evidence reconciliation (allowed now).** Verify current source/evidence and each distinct S09A historical run; inventory exact S08 contracts, device-command scope, existing scenario preconditions, post-timeout recovery controls and the physical evidence already accepted. Do not convert old BLOCKED verdicts to PASS or fill current identity fields from old run metadata.

**P1 — PHX-CI physical integration gap decision (no live run).** If current PHX-CI has no authenticated physical adapter, author a bounded *software-only* adapter work-unit proposal grounded against the deployed PHX-CI runtime and the existing BVP command transport, without a new correctness oracle/PowerShell scenario verifier or remote operations. Any adapter implementation/test change must use PHX-CI qualification and independent final Reviewer acceptance before subsequent physical execution. An adapter is not implied to be already present.

**P2 — Owner-governed physical binding (separate future gate).** Bind exact non-secret machine/Obsidian/version, Windows+iOS test vault, disposable Drive root, device identities, OAuth-account configuration, data.json preservation checks, generated artifact hashes, operation budgets and allowlisted physical commands. Submit a precise physical authorization scope; no defaults from a prior canary.

**P3 — Only after separate approval, produce an executable physical contract.** The designated Builder must refresh GitHub and normative requirements, prove S08 predecessor sufficiency and PHX-CI adapter availability, confirm all P2 preconditions, bind an exclusive run ID and explicit writable surfaces/checkpoints, and use PHX-CI as the sole software-validation authority. Start with no-mutation inventory/physical load/auth/pairing observations as separately approved before any write-bearing synchronizations. A physical run is independently gated from software artifact release/promotion.

**P4 — Later scope only.** Subsequent S09B–S09V physical evidence and Stage 3 are **not initiated** by P0–P3. No installed-product activation, personal-vault migration, durable account changes, managed-root creation or remote deletion may be inferred from software-only merge or this file.

## 5. Fail-closed physical checkpoint contract (future only)

Before *any* physical action, the operator must receive: exact device, action, expected objective observation, approved root/path ID(s), evidence capture mechanism, failure/timeout stop condition, and a human confirmation requirement. Never store token/authorization code, personal vault contents or secrets in repository evidence. Specifically:

- Observation or credential/identity ambiguity -> **BLOCKED**, no write.
- Unknown remote child or nonempty personal-root collision -> **STOP**, preserve existing state; no inferred absence/deletion.
- Unexpected additional planned effect or unapproved parent creation -> **STOP** before execution.
- Timed-out production receipt -> **device-result-unavailable**, not effect failure; do not re-dispatch the command before exact source/run/lease/receipt reconciliation.
- data.json missing/invalid/uncertain -> **STOP**; preserve bytes and cause evidence, no default overwrite or re-pairing.
- After a separately approved run, require device receipts, observed state/identity, exact original attempt logs and any supplemental late results without rewriting original verdicts.

## 6. Readiness verdict and next permitted action

**Current readiness: PREPARATION DOCUMENTED; PHYSICAL EXECUTION BLOCKED.** No new live testing, installation, Drive/vault mutation, PHX-CI execution, release approval or Stage 3 took place while preparing this contract.

The next permissible engineering action is a **read-only S08/PHX-CI adapter capability and physical-evidence dependency inventory**, then (only if needed) a separately grounded software-only adapter Build Unit; this is *not* activation of S09A. Any real physical execution requires the explicit Owner approvals and complete bindings above.
