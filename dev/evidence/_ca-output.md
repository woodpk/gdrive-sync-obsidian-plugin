# Coding-Agent Evidence Handoff

## Current Build Identification

- Coding/build agent: `agt-CA-P5-01`
- Build/session: `Stage 2A Phase 5 — Integrated synchronization product`
- Active corrective assignment: `second supervisory Phase 5 rejection / C1–C8 corrective work order`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Repository URL: `https://github.com/woodpk/gdrive-sync-obsidian-plugin`
- Active branch: `stage-2a-phase-5-integrated-product`
- Supervisor-approved base branch: `master`
- Required base SHA: `372f17f9c69d23feb9909aa08d7566a077a4163b`
- Pull request: `#7` — `Stage 2A Phase 5 — Integrated synchronization product`
- Pull request state at this evidence update: `OPEN / UNMERGED`
- Pre-evidence implementation/test head: `7c90f333976ec8f04c39ab794e7e0a901bac2584`
- PR merge/test SHA corresponding to that head: `cab50306d52a19b394a66c36ab7985f13feaa3ee`
- Current build disposition: `INCOMPLETE`
- Phase 6 / Stage 3 work: `NOT STARTED`

This file is the current coding-agent evidence record for the active Phase 5 build run. Earlier Phase 1/Phase 2 evidence previously contained in this file has been superseded here because it no longer described the active build state.

## Governing Corrective Scope

The active second supervisory rejection requires correction and proof across these areas:

1. all-path blocked disposition vs mixed path-local partial progress;
2. recovery-completion authority after conflict-resolution subplans;
3. retained text materialization requiring canonical content evidence;
4. reserved portable-configuration namespace and physical/logical domain separation;
5. persisted scope-change reconciliation behavior;
6. incremental Drive removal identity after restart;
7. execution-time authentication failure classification;
8. explicit Phase 5 scenarios 1–50 acceptance coverage.

The coding agent has implemented substantial corrective work in all eight areas, but the newest acceptance-test head has not yet passed the full repository gate. Therefore this handoff does **not** claim Phase 5 completion or supervisory approval.

## Implementation Completed in This Run

### C1 — blocked disposition and path-local partial work

- `DeterministicSynchronizationPlanner.finish()` now preserves a globally `blocked` plan when every planned operation is `blocked-unsafe`.
- Recovery-required plans remain globally blocked.
- Mixed plans containing both safe operations and path-local blockers remain `requires-user-approval`, allowing reviewed safe partial progress while preventing automatic execution.
- The change preserves semantic ID generation and does not introduce clock-based plan identity.
- Added targeted acceptance coverage for:
  - all `blocked-unsafe` => `blocked`;
  - recovery-required => `blocked`;
  - mixed safe + blocked => `requires-user-approval`;
  - automatic execution refuses mixed approval-required plans before mutation.

### C2 — recovery-completion authority

- Conflict-resolution subplans now explicitly clear reconstruction authority by creating a resolution assembly with:
  - `nextCursor: undefined`;
  - `reconstruction: false`.
- Recovery completion now requires a reviewed full reconstruction with a candidate cursor.
- A cursorless conflict-resolution plan cannot clear recovery.
- Recovery gate clearing and `recovery-completed` audit emission remain tied to the authoritative reviewed reconstruction path.
- Added dedicated recovery/controller acceptance tests covering cursorless recovery-derived conflict resolution and fresh full-reconcile authority.

### C3 — canonical retained text materialization

- `ProductTextVersionStore` uses canonical SHA-256 content evidence for retained text authority.
- Retained text is validated against the requested canonical hash before use.
- Revision-only retained text is rejected as non-authoritative materialization.
- `persistText()` refuses revision-only versions for authoritative retained text storage.
- Corrupt retained text cannot fabricate a clean three-way merge.
- Existing canonical matching/mismatch tests remain in place and new targeted tests cover revision-only refusal.

### C4 — portable configuration namespace hardening

Local side:

- `ProductPathScope` / `ScopedLocalVault` treat `__brain_sync_portable_config__` as a reserved logical namespace.
- Ordinary vault content physically occupying that prefix is surfaced as an explicit collision rather than being redirected into the active Obsidian configuration directory.
- Reads through a colliding reserved path fail closed.
- Active Obsidian configuration directory remains runtime-discovered rather than hard-coded.

Drive side:

- Portable configuration now has a physically distinct marked managed-root child using role metadata `brain-sync-portable-config`.
- Ordinary synchronized vault content remains under the separate marked `brain-sync-content` / `vault` domain.
- Existing unmarked same-name portable-config infrastructure is refused as ambiguous rather than adopted or silently reclassified.
- An ordinary synchronized `vault/__brain_sync_portable_config__` collision is refused.
- Cross-domain config/vault reclassification is refused.
- Full reconciliation lists the ordinary content and portable-config domains separately.
- Drive change processing recognizes both managed domain roots.
- Phase 3 fixtures were updated to model the marked configuration root while preserving prior safety expectations.
- A later-page Drive listing interruption still returns a truthful partial listing containing evidence already observed rather than discarding partial truth.

### C5 — persisted scope-change reconciliation

- Plugin settings now persist `scopeReconcileRequired`.
- Runtime setting changes that alter user exclusion patterns can set the persisted full-reconciliation gate.
- `ProductSnapshotAssembler` accepts a scope-reconcile predicate and forces full assembly rather than incremental Changes processing while that gate is active.
- Successful complete full reconciliation invokes the full-reconciliation completion callback, which is the path intended to clear the persisted scope gate.
- Partial/failed full runs do not signal scope reconciliation completion.
- User exclusions remain dynamic in runtime path scope so the next plan sees current settings without an Obsidian restart.

### C6 — restart-safe remote removal identity

- `GoogleDriveAdapter.readChanges()` now preserves removed events by stable `remoteObjectId` even when the in-memory `pathCache` is empty after restart.
- `lastKnownPath` is now optional rather than required for removed events.
- `ProductSnapshotAssembler` removes stable IDs from reconstructed remote baseline state using persisted remote mappings/base identity and does not require an in-memory path cache to recognize the deletion.
- Tests cover:
  - removed Drive event after adapter restart with empty cache;
  - incremental assembler removal by stable ID with no `lastKnownPath`.

### C7 — execution-time authentication state

Executor:

- Drive `authentication-required` signals are preserved as `authentication-required:<detail>` through precondition and mutation failure mapping instead of being collapsed into a generic blocked reason.

Controller:

- `IntegratedProductController` recognizes authentication-prefixed execution failures before generic path/global blocked handling.
- Mid-run authentication loss transitions product status to `authentication-required`.
- The run stops globally rather than continuing path-local work under invalid credentials.
- The candidate Drive cursor is not committed on this failure path.
- Dedicated controller-level auth acceptance tests were added.

### C8 — Phase 5 acceptance/lifecycle coverage

New acceptance-oriented test files were added for:

- second supervisory rejection C1/C3/C4/C5/C6 invariants;
- recovery authority and full-reconcile completion behavior;
- scheduler lifecycle/debounce/periodic behavior;
- controller execution-time authentication mapping;
- explicit numbered Phase 5 scenario mapping 1–50.

The acceptance mapping file explicitly enumerates all original Phase 5 scenarios 1–50 and ties them to automated repository coverage or the established platform-bound validation limitations where applicable.

## Other Phase 5 Product Work Present on the Branch

The Phase 5 branch also contains the integrated product implementation developed earlier in the same build phase, including:

- production composition of local vault, path scope, canonical evidence decorator, Drive adapter, snapshot assembler, planner, text version store, conflict resolver, executor, durable state store, controller, scheduler, settings UI, history/attention UI, network policy, notifications, and Web Locks run lease;
- incremental pure-TypeScript SHA-256 with no Node crypto dependency and bounded chunked source consumption;
- canonical local SHA-256 observation decoration and mutation receipts;
- Drive `sha256Checksum` canonical evidence while retaining remote revision as secondary evidence;
- exact planner/executor preconditions for local token/content, remote ID/revision/content, moves, downloads, uploads, trash, and clean merges;
- semantic SHA-derived plan/operation identifiers based on mutation-relevant intent rather than time;
- crash-safe pending journal -> execution -> verified authoritative commit ordering;
- safe-union first-sync/recovery planning and recovery-state backup/CAS replacement;
- persistent recovery gate and backup ID;
- live audit-retention mutation and immediate trimming;
- user exclusion settings and portable configuration allowlist presentation;
- conflict keep-local, keep-remote, keep-both, clean merge acceptance, and manual-current-local resolution;
- deterministic collision-safe conflict copy naming with provenance;
- path-local partial execution semantics and cursor non-advancement on incomplete progress;
- first-sync completion gating before automatic synchronization becomes eligible;
- meaningful notification filtering;
- metadata-only diagnostic export/copy path;
- non-destructive unload/deauthorization behavior.

## Repository Change Manifest

The following manifest is derived from GitHub compare of required base `372f17f9c69d23feb9909aa08d7566a077a4163b` to pre-evidence head `7c90f333976ec8f04c39ab794e7e0a901bac2584`.

### Files Added

- `src/core/semantic-identifiers.ts`
- `src/product/audit-history.ts`
- `src/product/canonical-local-vault.ts`
- `src/product/history-modal.ts`
- `src/product/index.ts`
- `src/product/network-policy.ts`
- `src/product/notification-policy.ts`
- `src/product/path-scope.ts`
- `src/product/plan-modal.ts`
- `src/product/plugin-data.ts`
- `src/product/product-controller.ts`
- `src/product/production-executor.ts`
- `src/product/runtime.ts`
- `src/product/scheduler.ts`
- `src/product/settings-tab.ts`
- `src/product/snapshot-assembler.ts`
- `src/product/text-version-store.ts`
- `src/product/web-lock-run-lease.ts`
- `src/util/sha256.ts`
- `test/phase5-acceptance-map.test.ts`
- `test/phase5-auth-controller.test.ts`
- `test/phase5-controller.test.ts`
- `test/phase5-product.test.ts`
- `test/phase5-recovery-auth.test.ts`
- `test/phase5-scheduler-acceptance.test.ts`
- `test/phase5-second-rejection.test.ts`

### Files Modified

- `dev/evidence/_ca-output.md`
- `dev/planning-and-building/phase-1-shared-contracts.md`
- `scripts/finalize-build.mjs`
- `src/contracts/execution.ts`
- `src/core/commit-coordinator.ts`
- `src/core/conflict-resolver.ts`
- `src/core/planner.ts`
- `src/drive/google-drive-port.ts`
- `src/main.ts`
- `src/state/persistent-state-store.ts`
- `test/mobile-safety.test.ts`
- `test/phase3-changes.test.ts`
- `test/phase3-drive.test.ts`
- `tsconfig.build.json`

### Files Deleted

None in the base-to-current Phase 5 compare.

## Verification History for This Corrective Run

### Most recent fully green implementation checkpoint before the newest acceptance tests

Implementation head:

- `57b7b35bdd2facb8ed4c83bd44373a201656dbf3`

GitHub Actions:

- Workflow: `Phase 1 CI`
- Run ID: `32787942959`
- Job ID: `97623584566`
- PR merge/test SHA: `faae76f54a26a1fb12c6f9095b78226a7d805254`

Results:

- `npm ci` — `PASS`
  - 14 packages added;
  - 15 packages audited;
  - 0 vulnerabilities.
- `npm run typecheck` — `PASS`
- `npm test` — `PASS`
  - tests: `137`
  - passed: `137`
  - failed: `0`
  - cancelled: `0`
  - skipped: `0`
  - todo: `0`
- `npm run build` — `PASS`

This checkpoint verified the corrective production implementation through the Drive-domain/partial-listing repair, but it predates the newly added second-rejection acceptance suites. It is therefore historical supporting evidence, **not** the final gate for the current head.

### Latest attempted gate on the current pre-evidence head

Implementation/test head:

- `7c90f333976ec8f04c39ab794e7e0a901bac2584`

GitHub Actions:

- Workflow: `Phase 1 CI`
- Run ID: `32788673978`
- Job ID: `97625734968`
- PR merge/test SHA: `cab50306d52a19b394a66c36ab7985f13feaa3ee`

Results:

- `npm ci` — `PASS`
  - 14 packages added;
  - 15 packages audited;
  - 0 vulnerabilities.
- `npm run typecheck` — `FAIL`
- `npm test` — `SKIPPED` because typecheck failed.
- `npm run build` — `SKIPPED` because typecheck failed.

Exact current typecheck defects:

1. `test/phase5-scheduler-acceptance.test.ts(25,25)` — TS2352: test stub conversion to `typeof setTimeout` is not sufficiently overlapping; Node timer typing requires `__promisify__`.
2. `test/phase5-scheduler-acceptance.test.ts(37,26)` — TS2352: test stub conversion to `setInterval`/timer overload is not sufficiently overlapping.

These failures are located in newly added scheduler acceptance-test stubs. The current repository head is therefore not eligible for a completion claim until those test typing defects are repaired and the complete gate is rerun successfully.

## Current Acceptance / Completion Status

### C1

- Production correction: `IMPLEMENTED`
- Targeted tests: `ADDED`
- Final-current-head gate: `NOT GREEN`

### C2

- Production correction: `IMPLEMENTED`
- Recovery authority tests: `ADDED`
- Final-current-head gate: `NOT GREEN`

### C3

- Production correction: `IMPLEMENTED`
- Canonical/revision-only retained-text tests: `ADDED`
- Final-current-head gate: `NOT GREEN`

### C4

- Production correction: `IMPLEMENTED`
- Local/Drive namespace tests: `ADDED`
- Inherited Phase 3 compatibility restored at prior green checkpoint.
- Final-current-head gate: `NOT GREEN`

### C5

- Production correction: `IMPLEMENTED`
- Full-reconcile scope-gate tests: `ADDED`
- Final-current-head gate: `NOT GREEN`

### C6

- Production correction: `IMPLEMENTED`
- Restart-safe stable-ID removal tests: `ADDED`
- Final-current-head gate: `NOT GREEN`

### C7

- Production correction: `IMPLEMENTED`
- Controller-level mid-run auth tests: `ADDED`
- Final-current-head gate: `NOT GREEN`

### C8

- Explicit scenarios 1–50 acceptance mapping: `ADDED`
- Scheduler/lifecycle/auth/recovery acceptance suites: `ADDED`
- Final-current-head gate: `NOT GREEN`

## Remaining Work Before Phase 5 Can Be Re-Handed Off as Complete

1. Repair the two scheduler acceptance-test timer typing errors at `test/phase5-scheduler-acceptance.test.ts`.
2. Run the full authoritative GitHub Actions gate on the exact repaired implementation/test head.
3. Require all of the following on that exact head:
   - `npm ci` pass;
   - `npm run typecheck` pass;
   - `npm test` pass with zero failures/skips attributable to the build contract;
   - `npm run build` pass.
4. Inspect the final run/job logs and record:
   - exact branch head SHA;
   - exact PR merge/test SHA;
   - workflow run ID;
   - job ID;
   - exact test counts.
5. Reinspect the final base-to-head diff and current evidence files.
6. Update this file again at the end of that build run.
7. Restore/update any additional required Phase 5 evidence artifacts if required by the active supervisory handoff rules.
8. Update PR #7 description only after the final authoritative gate is green.
9. Keep PR #7 open and unmerged for supervisory review.

## Proven Platform Limitations Preserved

The corrective work has not removed or bypassed the two previously established stock-iOS fail-closed limitations:

### Stock-iOS arbitrary-file bounded-memory read limitation

The public stock Obsidian iOS environment does not expose a supported general arbitrary-file chunk/offset read API for every BRAIN file type. The implementation must not substitute whole-file `readBinary()` materialization or Node filesystem access. Unsupported cases remain fail-closed.

### Stock-iOS external-reference containment-proof limitation

The public stock-iOS boundary does not expose sufficient link-aware/canonical-path metadata to prove that arbitrary symlink/alias/external-reference traversal cannot escape the vault for every path. The generic/mobile boundary remains fail-closed rather than introducing an unsafe bypass.

These limitations are candidates for a later final disposition of `BLOCKED — PROVEN PLATFORM LIMITATION` only after the implementation/test head itself passes the complete available verification gate.

## NOT AVAILABLE IN THIS SESSION

The following validation remains unavailable in this customer-facing ChatGPT build environment and is not represented as executed:

- real Windows Obsidian OAuth/synchronization;
- physical iPhone/iOS Obsidian OAuth/synchronization;
- deployed Azure callback validation;
- real-user Google Drive first-sync/incremental synchronization;
- physical network transition testing;
- actual multi-instance Obsidian Web Locks validation across independent application instances;
- physical-device large-vault / large-file stress testing.

These unavailable validations are not used to fabricate a PASS result and are not substituted for the automated repository gate.

## Scope / Safety Statement

- PR #7 remains open and unmerged.
- No Phase 6 work was started.
- No Stage 3 work was started.
- The stock-iOS safety limitations remain fail-closed.
- No force-sync or safety bypass was introduced.
- The current build status is `INCOMPLETE` because the latest exact implementation/test head does not yet pass typecheck and therefore has not completed the required test/build gate.

## Evidence Integrity

This evidence was fully rewritten to reflect the active Phase 5 build run rather than the stale earlier Phase 1/Phase 2 handoff content.

Authoritative current-state references used for this update:

- required base: `372f17f9c69d23feb9909aa08d7566a077a4163b`;
- pre-evidence head: `7c90f333976ec8f04c39ab794e7e0a901bac2584`;
- PR: `#7`, open/unmerged;
- latest green historical checkpoint: head `57b7b35bdd2facb8ed4c83bd44373a201656dbf3`, run `32787942959`, job `97623584566`, 137/137 tests and build pass;
- latest attempted current-head gate: run `32788673978`, job `97625734968`, typecheck failure in scheduler acceptance-test timer stubs; tests/build skipped.

This file must be updated again every time this coding agent finishes a subsequent build run.