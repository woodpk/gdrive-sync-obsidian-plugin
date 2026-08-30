# Coding-Agent Evidence — Phase 6 Alpha Mixed-Plan Isolation and Sync-Attention Ledger

## Identity and repository control

- agent ID: `agt-CA-P6-MIXED-PLAN-ISOLATION-01`
- repository: `woodpk/gdrive-sync-obsidian-plugin`
- repair branch: `phase6-alpha-mixed-plan-isolation`
- pull request: [#29](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/29), targeting `phase6-integration`, left open and unmerged
- exact starting `master` / released `0.1.5` SHA: `34fa2e65d86878788434a6527e18d9f54ed64f3e`
- starting `phase6-integration` SHA: `229488ba4b7580644f70a29c4dd0ee3670447da2`
- dynamically verified implementation SHA: `0efacd7ac4b579e98d2202dc2d325ad25b7f0f51`
- prepared version: `0.1.6`
- `master` and `phase6-integration` were not modified; no tag or release was created

The evidence record and canonical ledger are committed after the implementation SHA, so the final PR head is necessarily a later evidence-only commit. The exact pushed PR head is reported in the operator handoff and GitHub PR state.

## Product-authority decision

Locked decision `DEC-300` records that a path-local problem is isolated together with any operation whose dependency on it cannot be disproven, while unrelated independently safe work continues. It separately preserves global execution gates for recovery/untrusted authority, stale-plan authority, authentication/managed-remote authority, and checkpoint-backed suspicious destruction.

The planner now emits a required `globalExecutionGate` independent from `executionDisposition`:

- `none`: path attention can be skipped while independent safe work executes;
- `destructive-approval-required`: automatic execution cannot begin; exact reviewed plan/checkpoint approval remains mandatory;
- `globally-blocked`: no subset may execute.

An all-path-attention plan is partial/attention-required, not a global error, and performs no mutation. A mixed plan commits safe operations operation-by-operation while blocked/conflicted/dependent paths remain uncommitted and retryable.

## Attention ledger and user surface

`SyncAttentionLedger` uses the existing serialized `PluginDataRepository` owner (`Plugin.loadData` / `Plugin.saveData`) as bounded device-local operational storage. It does not use the vault adapter, does not enter managed synchronization scope, and cannot create a vault-change feedback loop.

Records include last/first seen timestamps, run ID when available, trigger, exact vault-relative path, operation category, reason code, human-readable reason, occurrence count, and current/resolved status. Records are deduplicated by path/category/reason, bounded to 500 by default, and resolved after later authoritative operation commit. Historical resolved entries remain bounded; current status no longer falsely reports a reconciled path.

The existing **Open synchronization attention** command/modal displays current paths and exposes:

- **Copy attention CSV**;
- **Share attention CSV file**, producing `brain-sync-attention.csv` with MIME type `text/csv;charset=utf-8`.

CSV serialization quotes every cell, doubles embedded quotes, preserves commas/newlines/Unicode, and prefixes formula-like fields with an apostrophe. The ledger contains no note/file contents, OAuth tokens, authorization codes, PKCE material, secrets, or Drive IDs.

Ledger persistence failure is caught and surfaced through `attention-required` status with `ledgerAvailable=false`; it does not roll back or prevent already-authorized safe work.

## Execution, cursor, first-sync, and diagnostics semantics

- Every successful safe operation retains the existing pending-journal → mutation → verification → authoritative state-commit sequence.
- Explicit attention operations are pre-seeded into dependency isolation, so a dependent operation is skipped even if it appears earlier in plan order. Parent/subtree, move source/target, destination/precondition overlap, and destructive overlap are handled conservatively.
- Runtime path-local failures join the skipped dependency set; unrelated later operations continue.
- Partial runs do not commit the candidate Drive cursor.
- Already committed safe work remains in authoritative BASE/journal state and is not duplicated merely because a later re-plan remains partial.
- Partial first-sync safe-union progress is retained, but the cursor/trustworthy baseline and `firstSyncCompleted` gate are not committed/opened.
- `local-file-not-stable` remains fail-closed and retryable; a later stable successful operation resolves its current ledger entry.
- `attention-required` distinguishes successful partial work from global `error`/`recovery-required`; repeated unchanged attention is not re-notified across planning/syncing transitions.
- Startup/resume, local-change, and periodic automatic runs each allocate a normal diagnostic run ID and emit correlated planning/execution/terminal evidence.
- Ordinary diagnostics contain only aggregate counts and reason codes (`safeCommittedCount`, `skippedCount`, `attentionCount`, `attentionReasonCodes`) and never vault paths or content. Exact paths exist only in the explicit device-local attention ledger.

## Changed files in implementation commit

Modified:

- `dev/planning-and-building/decision-register.yaml`
- `manifest.json`
- `package.json`
- `package-lock.json`
- `src/contracts/plan.ts`
- `src/contracts/status-audit-actions.ts`
- `src/core/destructive-safety.ts`
- `src/core/planner.ts`
- `src/core/production-planner.ts`
- `src/core/semantic-identifiers.ts`
- `src/diagnostics/diagnostic-logger.ts`
- `src/main.ts`
- `src/product/history-modal.ts`
- `src/product/notification-policy.ts`
- `src/product/plugin-data.ts`
- `src/product/product-controller.ts`
- `src/product/runtime.ts`
- `test/contracts.test.ts`
- `test/phase2-safety-policy.test.ts`
- `test/phase5-acceptance-map.test.ts`
- `test/phase5-controller.test.ts`
- `test/phase5-product.test.ts`
- `test/phase5-recovery-auth.test.ts`
- `test/phase5-second-rejection.test.ts`
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`
- `test/phase6-b-destructive-safety.test.ts`

Created:

- `src/product/operation-isolation.ts`
- `src/product/sync-attention-ledger.ts`
- `test/phase6-alpha-mixed-plan-isolation.test.ts`

Deleted: none.

Generated `main.js` and `.test-build/**` are ignored verification outputs, not Git changes.

## Predictive focused verification

Focused suite: `test/phase6-alpha-mixed-plan-isolation.test.ts`

Result: **12/12 PASS**.

It proves mixed automatic safe-subset commit, conflict isolation, all-blocked no-mutation behavior, global recovery blocking, destructive checkpoint authority, ordinary deletion, cursor conservatism, no duplicate upload on re-plan, partial first-sync safety, unstable-file retry/resolution, dependency isolation, ledger bounding/deduplication/resolution/CSV safety/real file creation, persistence-failure isolation, sanitized automatic lifecycle aggregates, notification deduplication, and run IDs for all three automatic triggers.

## Complete local verification

- `npm run typecheck`: **PASS**
- focused mixed-plan/attention-ledger suite: **12/12 PASS**
- `npm test`: **333/335 PASS**, with exactly the two previously qualified Windows drive-prefix assertions and no new failure
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS** (executed by the build script)
- `git diff --check` / staged diff check: **PASS** (informational LF-to-CRLF warnings only)

Qualified pre-existing Windows assertions:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`

Both retain the established Windows drive-qualified actual path versus drive-less expected-path mismatch; no related source/test was modified.

Package verifiers:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Artifact:

```text
manifest.json version: 0.1.6
main.js byte size: 372981
main.js SHA-256: 5903eb849f6ceca67caef17bcac2c6f87b7a9236ed9f6b2de960f54e4f2c1576
manifest.json byte size: 283
manifest.json SHA-256: 8f2ac175a1e6526c95436083d7fbf2df90311cd1ba5224ad689cc4709eebb4e5
```

GitHub/Linux CI independently verified evidence head `8eeaa80fba6850ef00e208b48d404b6892259cbc` in successful **Phase 6 Alpha Diagnostic Verification** run [33231490680](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33231490680): `npm ci`, typecheck, **335/335** full tests, **38/38** existing focused callback/diagnostic/OAuth/export tests, build, complete `npm run check`, diff check, and all five package verifiers passed. Linux reproduced `main.js` at exactly `372981` bytes and SHA-256 `5903eb849f6ceca67caef17bcac2c6f87b7a9236ed9f6b2de960f54e4f2c1576`; the uploaded workflow artifact ZIP digest was `61988aac2ec8e0505c95848c4fe77ce889f163c7d5bfd4c681a40a8063bcc862`.

The separate Azure Static Web Apps preview run [33231490677](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33231490677) failed only because the existing Static Web App had reached its maximum staging-environment count. The exact service response was `This Static Web App already has the maximum number of staging environments`; this is the known preview-capacity infrastructure condition, not plugin source/test/build failure. No Azure configuration or environment was changed.

## Remaining limitations and explicit non-actions

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## PR #29 rejection repair — four bounded corrections

Starting rejected head: `479b701328385baf03a197c164d025508e70767f`.

Verified implementation repair commit: `9f439bf3f0fbd44344168afdb361c82876158457`.

### Corrected failure mechanisms

1. **Shared persistence queue poisoning:** `PluginDataRepository` now snapshots each full payload before enqueueing, serializes it behind a recovered queue tail, rejects the individual failed write to its caller, and permits later writes to invoke `host.saveData` normally. A production-representative test uses one repository for settings, diagnostics, attention, and audit; an attention write failure no longer prevents plan audit persistence or independent safe execution. A concurrent queued-write test proves per-call payload snapshots remain `queued-a`, `queued-b`, and `queued-c` rather than observing later mutable state.
2. **False pre-execution completion notice:** `attention-required` now has deterministic `planned` and `completed` phases plus `safeOperationsCommitted`. Planned attention emits no completion notice. Terminal mixed execution emits one accurate completion-with-attention notice; an all-attention run truthfully reports that no unsafe paths changed; unchanged retries remain deduplicated.
3. **Stale-device over-blocking:** stale-device destructive operations become path-local `blocked-unsafe` entries with reason `stale-device-destructive-gate`; unrelated non-destructive operations may commit. The wrapper preserves any pre-existing recovery/destructive-approval global gate and checkpoint. Dependency isolation, destructive circuit-breaker authority, and cursor conservatism remain intact.
4. **Current-attention eviction:** every deduplicated current unresolved record is retained and exported. The configured bound now applies only to resolved history. Resolution removes paths from the current set, trims only resolved history, and leaves the current count complete.

### Exact implementation/test files changed

- `src/contracts/status-audit-actions.ts`
- `src/core/planner.ts`
- `src/core/production-planner.ts`
- `src/product/notification-policy.ts`
- `src/product/plugin-data.ts`
- `src/product/product-controller.ts`
- `src/product/sync-attention-ledger.ts`
- `test/phase2-planner.test.ts`
- `test/phase2-safety-policy.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase6-alpha-mixed-plan-isolation.test.ts`
- `test/phase6-b-destructive-safety.test.ts`

No files were created or deleted by the repair implementation commit.

### Repair regression and local verification

- `npm run typecheck`: **PASS**
- focused `phase6-alpha-mixed-plan-isolation` suite: **16/16 PASS**
- full Windows suite: **337/339 PASS**
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS**
- `git diff --check`: **PASS** (line-ending conversion warnings only)

The only Windows failures are the unchanged, previously qualified drive-prefix expectation mismatches:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`

Package verification:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Artifact:

```text
manifest.json version: 0.1.6
manifest.json byte size: 283
manifest.json SHA-256: 8f2ac175a1e6526c95436083d7fbf2df90311cd1ba5224ad689cc4709eebb4e5
main.js byte size: 374188
main.js SHA-256: 2d417f5c2a9e09669dd6b689a78c3067628dcf5a96d75eb3ffd6fed93428d7bb
```

GitHub/Linux CI independently verified evidence head `da85659c71edd7fa4368cb6f17c923c061db0e63` in successful **Phase 6 Alpha Diagnostic Verification** run [33233714856](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33233714856): typecheck, **339/339** full tests, **38/38** existing focused callback/diagnostic/OAuth/export tests, production build, complete repository check, diff check, and all five package verifiers passed. Linux reproduced `main.js` at exactly `374188` bytes and SHA-256 `2d417f5c2a9e09669dd6b689a78c3067628dcf5a96d75eb3ffd6fed93428d7bb`. Uploaded workflow artifact `9709269773` has ZIP digest `sha256:4fbc2038d1c650ba6d44f699c262ff4adae2fb8cd83a2cdecfe4b03d548d74c1`.

The separate Azure Static Web Apps preview run [33233714911](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33233714911) failed with the unchanged infrastructure response: `This Static Web App already has the maximum number of staging environments`. It is not a source/test/build failure; no Azure configuration or environment was changed.

PR #29 remains open and unmerged. No `master` or `phase6-integration` modification, tag, release, Azure/OAuth change, physical testing, Phase 6 completion, or Stage 3 work occurred.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

- PR #29 remains open and unmerged for adversarial review.
- `master` and `phase6-integration` remain unchanged.
- no `0.1.6` tag or GitHub release was created.
- no OAuth, Azure, Drive scope/transport, canonical hashing, three-way merge, or unrelated scheduling architecture changed.
- no performance optimization, Phase 6 completion, or Stage 3 work began.

---

## PR #29 final pre-physical-test repair

Starting head: `6d9d84c0b876e97d936cc207e7eafd6cc6530099`.

Verified implementation repair commit: `700b3523d040379b3ab48c3e15c0a07214ee6858`.

### Three bounded corrections

1. **Complete automatic lifecycle coordination:** `IntegratedProductController` now owns one central automatic trigger drain spanning planning through terminal execution. Startup/resume, local-change, periodic, and execution-requested reconciliation enter the same queue. A trigger arriving during planning or execution is coalesced by deterministic reconciliation priority and drained only after the active lifecycle completes. Only actual drained runs receive diagnostic run IDs. The automatic executor receives the exact `PlannedRun` created by its lifecycle, preventing mutable `this.planned` cross-contamination. Manual previews remain outside this automatic drain and no user-review lease is held. `ProductSyncScheduler` now delegates lifecycle opportunities to the controller instead of retaining a separate startup-only serializer.
2. **Privacy-safe attention identity:** the ledger computes a deterministic SHA-256 identity over the sorted current path/category/reason set. Only the hash reaches `SynchronizationStatus` and the notification deduplication key; paths remain confined to the device-local ledger. The identity is stable for an unchanged condition and changes for additions, removals, changed paths, or changed reasons. Planned attention still emits no completion notice. When ledger persistence is unavailable, a path-free hashed plan fallback preserves correct notification differentiation without blocking safe work.
3. **Path-scoped reason supersession:** every `recordSkipped` batch is authoritative only for the paths it contains. For each such path, formerly current keys absent from the fresh key set move to resolved history before fresh records are inserted/reactivated. Paths absent from the incremental batch are untouched. Successful reconciliation still resolves every current reason for the successfully committed path. Resolved history remains subject to the existing bound; current state and CSV status remain truthful.

### Exact files changed

- `src/contracts/status-audit-actions.ts`
- `src/product/notification-policy.ts`
- `src/product/product-controller.ts`
- `src/product/scheduler.ts`
- `src/product/sync-attention-ledger.ts`
- `test/phase5-scheduler-acceptance.test.ts`
- `test/phase6-alpha-mixed-plan-isolation.test.ts`

No files were created or deleted.

### Predictive regression evidence

The focused suite now contains **18 tests**, including controlled planner and mutation barriers proving periodic plus local-change attempts cannot overlap or overwrite plans, the second trigger becomes a later reconciliation, plan/operation order remains exact, each mutation executes once, and actual diagnostic run IDs remain associated with their originating trigger. Existing local-change-during-active-run behavior remains green in the full suite.

Additional tests prove unchanged attention does not spam, path A replaced by path B with identical counts emits a new notice, a changed reason on the same path emits a new notice, planned attention emits no completion notice, notification identity is a path-free SHA-256 value, ordinary diagnostics contain neither test path, obsolete reasons become resolved CSV history, current counts remain truthful, and successful later reconciliation clears current attention while retaining bounded history.

### Complete verification

- `npm run typecheck`: **PASS**
- focused mixed-plan/attention/concurrency suite: **18/18 PASS**
- Windows `npm test`: **339/341 PASS**
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS**
- `git diff --check`: **PASS** (informational line-ending conversion warnings only)

The only Windows failures remain the two unchanged, previously qualified drive-prefix expectation mismatches:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`

Package verification:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Artifact:

```text
manifest.json version: 0.1.6
manifest.json byte size: 283
manifest.json SHA-256: 8f2ac175a1e6526c95436083d7fbf2df90311cd1ba5224ad689cc4709eebb4e5
main.js byte size: 377230
main.js SHA-256: 169f936b44ae1472ac33eb971372da790c5b4fc91c36ec779ab21e5e33a733ae
```

GitHub/Linux **Phase 6 Alpha Diagnostic Verification** run [33236278937](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33236278937) passed on implementation head `700b3523d040379b3ab48c3e15c0a07214ee6858`: typecheck, **341/341** full tests, **38/38** established workflow-focused tests, production build, full repository check, diff check, and all five package verifiers. Linux reproduced the exact `377230`-byte artifact and SHA-256 above. Workflow artifact `9710015034` has ZIP digest `sha256:a7a677c61d5fffeb3ce790ad451672ca662722691e6a329551d8f63e2ba91b49`.

The separate Azure preview run [33236278904](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33236278904) failed only with the unchanged infrastructure condition: `This Static Web App already has the maximum number of staging environments`. No Azure behavior/configuration was changed.

PR #29 metadata was updated to the actual **18/18** focused result, **339/341** qualified Windows result, **341/341** Linux result/run, and final artifact identity. PR #29 remains open and unmerged. No protected branch, tag, release, OAuth/Azure behavior, physical testing, Phase 6 completion, or Stage 3 work occurred.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## Approved integration and 0.1.6 promotion preparation

Supervisor status for PR #29: **APPROVE**.

PR #29 was guarded at exact approved head `9aa425d088411ab0c95da1aa8c91275bbf4e67b2`, verified open, unmerged, non-draft, mergeable, and based on `phase6-integration`, then merged normally without squash or rebase. The PR #29 merge commit and resulting source integration SHA are both `acee2ad373b5a6c0938fa39393f286f05af1fad8`. The pre-merge integration SHA was `229488ba4b7580644f70a29c4dd0ee3670447da2`; approved head ancestry was verified after the merge. `master` remained `34fa2e65d86878788434a6527e18d9f54ed64f3e`.

Fresh post-merge local verification on Windows:

- version metadata: `0.1.6` in `manifest.json`, `package.json`, and `package-lock.json`;
- typecheck: **PASS**;
- focused mixed-plan/attention/concurrency suite: **18/18 PASS**;
- full suite: **339/341 PASS**, with only the two unchanged established Windows drive-prefix expectation mismatches;
- build: **PASS**;
- all five package verifiers: **PASS**;
- `git diff --check`: **PASS**;
- `main.js`: `377230` bytes;
- `main.js` SHA-256: `169f936b44ae1472ac33eb971372da790c5b4fc91c36ec779ab21e5e33a733ae`.

The final PR #29 Linux verification run [33236567999](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33236567999) passed **341/341**, typecheck, build, complete repository check, diff check, and all package verifiers while reproducing the exact artifact above. The separate Azure preview failure remained the known maximum-staging-environments capacity condition and was not an application verification failure.

Promotion PR [#30](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/30) was opened from `phase6-integration` to `master` and is intentionally left open and unmerged for supervisor review. This integration/promotion evidence pass modifies only:

- `dev/evidence/_ca-output-agt-CA-P6-MIXED-PLAN-ISOLATION-01.md`;
- `dev/evidence/_ca-output.md`;
- `dev/evidence/phase6-integration-manifest.md`.

No product code, test, version, OAuth/Azure configuration, tag, release, physical iPhone state, or Stage 3 state was changed by the integration evidence pass.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## Approved master promotion and 0.1.6 prerelease preparation

Supervisor status for promotion PR #30: **APPROVE**.

PR #30 was guarded at exact approved head `233573a2f0abc1a91855a8dcfcb3f091658f38c6`, verified open, unmerged, non-draft, mergeable, clean, and based on `master`, then merged normally without squash or rebase. The PR #30 merge commit and promoted source `master` SHA are `251f9345488a56f1b4cfa71129b96e3f083fa916`. Approved head ancestry was verified after the merge.

Fresh promoted-build verification:

- version metadata: `0.1.6` in `manifest.json`, `package.json`, and `package-lock.json`;
- typecheck: **PASS**;
- focused mixed-plan/attention/concurrency suite: **18/18 PASS**;
- Windows full suite: **339/341 qualified PASS**, with only the two unchanged established drive-prefix expectation mismatches;
- production build and all five package verifiers: **PASS**;
- `git diff --check`: **PASS**;
- `main.js`: `377230` bytes;
- `main.js` SHA-256: `169f936b44ae1472ac33eb971372da790c5b4fc91c36ec779ab21e5e33a733ae`;
- release `manifest.json`: `284` bytes on the Windows release surface;
- release `manifest.json` SHA-256: `bda99947f74fbbbb072613c14056729fd09cca0eee6882e50ed5b33f7cc7b718`.

Promoted-master **Phase 1 CI** run [33238942414](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33238942414) passed **341/341**, typecheck, production build, and all package verifiers while reproducing the exact `main.js` identity above.

This prerelease evidence pass modifies only:

- `dev/evidence/_ca-output-agt-CA-P6-MIXED-PLAN-ISOLATION-01.md`;
- `dev/evidence/_ca-output.md`;
- `dev/evidence/phase6-integration-manifest.md`.

The authorized prerelease is `0.1.6`, will target the resulting evidence-only `master` commit, and will attach exactly the BRAT assets `main.js` and `manifest.json`. Release notes must state that automated verification passed and physical iPhone validation remains pending. No product code, tests, version metadata, OAuth/Azure configuration, physical testing, or Stage 3 work is changed by this evidence pass.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION
