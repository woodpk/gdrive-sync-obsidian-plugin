# Stage 2A Build Session 05 / Phase 5 Corrected Evidence Receipt

## Build Identification

- Agent/session: `agt-CA-P5-01`
- Build/session: `Stage 2A Build Session 05 / Phase 5 — Integrated Synchronization Product`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Required base branch: `master`
- Required exact baseline SHA: `372f17f9c69d23feb9909aa08d7566a077a4163b`
- Phase 5 branch: `stage-2a-phase-5-integrated-product`
- Pull request: `#7` — open and unmerged
- Corrective-work-order starting head: `d3d50850108bbcafc2f2188ed6d30da76313db37`
- Final executable/documentation head verified before evidence-only commits: `0230c0450f8d7ddfac2f3e56ed3391107c243810`
- Final GitHub Actions workflow run: `32777527719`
- Final verification job: `97591913559`
- PR merge/test SHA executed by Actions: `a310a2a9d33dceab141d519d491a345d4684c414`

This receipt records the corrective work ordered in C1–C7 and the Phase 5 work that had previously been stopped by rejected blocker conclusions. It does not claim supervisory approval.

## Correction IDs Completed

### C1 — Carry newly allocated Drive identity through authoritative execution

**Completed.**

The supervisor-authorized frozen-contract revision was applied exactly to `src/contracts/execution.ts`:

- imported `RemoteObjectId`;
- added `resultingRemoteObjectId?: RemoteObjectId` to `VerifiedExecutionReceipt`.

`StateCommitCoordinator` now selects stable remote identity in this order:

1. verified execution-produced `receipt.resultingRemoteObjectId`;
2. `operation.remoteObjectId`;
3. `operation.contentVersion?.remoteObjectId`;
4. prior BASE remote identity.

`ProductSynchronizationExecutor` now performs real `upload-create` for files and folders. File creation reads the planned stable local source from `operation.contentVersion.path`, creates through `GoogleDrivePort`, re-observes the created target, verifies stable identity/content evidence, and returns durable verified success carrying the new Drive ID. Folder creation likewise creates and re-observes the allocated stable identity.

The controller's former whole-plan guard that rejected every plan containing `upload-create` was removed.

The new receipt field is not used as a general mutation payload and the ID is not encoded in `verificationEvidenceRef`.

### C2 — Production BASE text and clean-merge materialization

**Completed.**

Created `src/product/text-version-store.ts` as device-local operational materialization behind the existing Phase 2 `TextVersionProvider` and `MergeOutputEvidenceProvider` seams.

The store:

- persists recognized `.md`/`.txt` text only in a device-local IndexedDB database separate from synchronized state, ordinary plugin settings, audit history, and authentication storage;
- keys exact versions by stable hash or revision evidence rather than timestamps;
- can retain recognized text while consuming existing lazy `BinaryContentSource` chunks;
- retrieves exact retained versions for later three-way BASE use;
- persists actual `mergedText` under the resulting merge evidence before clean merge can become executable;
- fails closed when an exact required version cannot be retrieved.

Production runtime now constructs `ThreeWayConflictResolver` with the real materialization store for both text-version and merge-output evidence seams. The prior production `readText: async () => undefined` placeholder is gone.

`ProductSynchronizationExecutor` retains recognized text across upload-create, upload-update, download-create, download-update, first-sync identical BASE establishment, and clean-text-merge.

`clean-text-merge` now obtains the exact retained merge materialization, replaces LOCAL, verifies LOCAL, updates REMOTE through the existing Drive boundary, re-observes/verifies REMOTE stable identity/content, retains the synchronized merge as future BASE, and only then returns durable verified success. Partial/uncertain outcomes do not become authoritative success.

No merged bytes were added to `PlannedOperation`; no BASE bytes were added to the frozen state contract; no whole-file `readBinary()` fallback was introduced.

### C3 — First-sync identical collision establishes BASE

**Completed.**

For a no-BASE `sameVersion(local, remote)` collision, the deterministic planner still emits non-mutating `noop` with `safe-union-identical`, but now carries the identical observed remote `contentVersion`, including stable remote identity.

`StateCommitCoordinator` now handles that verified no-op by:

- establishing a BASE entry with `localExisted: true` and `remoteExisted: true`;
- retaining synchronized evidence;
- retaining stable remote object ID;
- establishing/updating the remote mapping;
- removing contradictory tombstone state;
- not claiming that content was mutated.

The executor also retains recognized text for future BASE use before the no-op can become authoritative success.

### C4 — First-sync lifecycle gate

**Completed.**

`IntegratedProductController` now supports `onTrustedBaselineEstablished`.

The callback is reached only after a reviewed manual synchronization has fully completed the authoritative execution path: every executable operation accounted, no unresolved/blocked/recovery operation left, no stale-precondition/replan condition, candidate Changes cursor committed when present, and synchronization state reloaded as trusted.

`Phase5ProductRuntime` binds the callback to persist `firstSyncCompleted: true` through the existing settings repository. It does not automatically enable startup/resume, local-change, or periodic synchronization; user controls remain independently disabled until chosen.

A conflict/blocked/failed/partial/recovery execution does not open the gate.

### C5 — Full-reconciliation Changes cursor without a gap

**Completed.**

`ProductSnapshotAssembler` now calls `GoogleDrivePort.getStartCursor()` before the full remote reconciliation listing. The cursor is returned as candidate `nextCursor` only; the assembler does not persist it.

The controller persists that cursor only after all corresponding plan effects/state transitions are durably accounted for. Cursor-acquisition failure is mapped conservatively rather than manufacturing a cursor.

### C6 — Conflict preservation and user resolution

**Completed for available Phase 5 implementation/test environment.**

The controller now retains current `ConflictAssessment` objects in a private registry keyed by `ConflictId`, repopulates the product surface from the same resolver used for planning, removes stale registry entries on fresh planning, and revalidates preserved versions immediately before any resolution.

Explicit resolution is translated into ordinary planned operations and executed through `CrashSafeExecutionCoordinator` plus `StateCommitCoordinator`:

- keep local → `upload-update` of preserved local authority to the stable original remote object;
- keep remote → `download-update` of preserved remote authority to the original local path;
- keep both → deterministic collision-safe `download-create` of preserved remote alternate to a local conflict-copy path, committed as local-only BASE without reusing the source Drive ID, followed by `upload-update` preserving the local original as authoritative; next ordinary reconciliation plans `upload-create` for the local-only conflict copy;
- manual → accepted only when the supplied resolved version is currently observable, then propagated through ordinary upload-update;
- accept clean merge → uses the C2 materialized merge and ordinary verified execution path.

Successful resolution audits `conflict-resolved` and removes the resolved conflict from the active surface. Conflict copies are not automatically deleted.

`SyncAttentionModal` now consumes the live controller/product surface and exposes actionable keep-local, keep-remote, and keep-both controls instead of the prior contract-blocked message. `main.ts` passes the live controller rather than a dead snapshot.

### C7 — Repair and expand Phase 5 conformance tests

**Completed.**

The nonexistent `SynchronizationPlan.createdFrom` fixture property was removed.

The former blocker assertions for `upload-create` and `clean-text-merge` were replaced by positive conformance tests. Added/expanded direct Phase 5 coverage verifies:

- verified upload-create and authoritative new Drive-ID mapping;
- real clean-text-merge materialization and two-sided verification;
- first-sync identical no-op BASE establishment;
- reviewed successful first-sync completion gate and cursor commit;
- unresolved reviewed sync cannot open the gate;
- full baseline cursor acquisition before listing;
- keep-local resolution;
- keep-remote resolution;
- keep-both local-only conflict-copy semantics and next-reconcile upload-create planning;
- stale conflict-resolution rejection before mutation;
- bounded audit retention;
- mobile Wi-Fi fail-closed policy;
- desktop network-policy nonrestriction;
- combined settings/audit persistence;
- Web Locks writer exclusion and actual release completion;
- unresolved conflict/recovery nonmutation.

## Additional Corrective Defect Repaired During Verification

A direct Phase 5 lease test exposed that `WebLocksRunLeasePort.release()` signaled its callback gate but returned before the browser lock-manager request had actually completed. The lease was corrected so `release()` awaits actual lock-request completion. This was a real implementation defect discovered by the correction suite and is included in the final green gate.

## Targeted Repository Verification

The corrective pass inspected each C1–C7 implementation surface and confirmed:

- `src/contracts/**` changed only at `src/contracts/execution.ts` for the explicitly authorized C1 `resultingRemoteObjectId` member;
- no product-controller whole-plan `upload-create` refusal remains;
- no production `readText: async () => undefined` placeholder remains;
- no production clean-text-merge blocking placeholder remains;
- no unconditional `resolve-conflict` rejection remains;
- `SynchronizationPlan.createdFrom` is absent from the corrected Phase 5 fixtures;
- `firstSyncCompleted: true` has a real trusted-baseline transition in runtime/controller integration;
- full reconciliation acquires its candidate Changes cursor before listing and persistence remains controller-owned after complete execution;
- conflict-copy `download-create` with `operation.path !== operation.contentVersion.path` is committed as local-only state and does not map the source remote ID to the new logical path;
- established stock-iOS bounded-read and external-reference fail-closed safeguards remain present and pass the mobile/platform architecture suite.

## Final Clean-Checkout Verification

GitHub Actions workflow `Phase 1 CI` run `32777527719`, job `97591913559`, executed the complete Phase 5 repository gate against PR merge/test SHA `a310a2a9d33dceab141d519d491a345d4684c414`, which merged branch head `0230c0450f8d7ddfac2f3e56ed3391107c243810` onto the exact required master baseline `372f17f9c69d23feb9909aa08d7566a077a4163b` for verification.

### `npm ci`

- Result: `PASS`.
- 14 packages added.
- 15 packages audited.
- 0 vulnerabilities.

### `npm run typecheck`

- Result: `PASS`.
- `tsc --noEmit` completed successfully.

### `npm test`

- Result: `PASS`.
- Total: `136`.
- Passed: `136`.
- Failed: `0`.
- Cancelled: `0`.
- Skipped: `0`.
- Todo: `0`.

Phase 5 tests explicitly visible in the final logs as passing include tests 121–136 covering the C1–C7 integration outcomes and retained safety policies.

### `npm run build`

- Result: `PASS`.
- `tsc -p tsconfig.build.json && node scripts/finalize-build.mjs` completed successfully.

## Corrective-Pass Change Manifest — Git Evidence

Git compare `d3d50850108bbcafc2f2188ed6d30da76313db37...0230c0450f8d7ddfac2f3e56ed3391107c243810` reported the following executable/documentation correction changes before evidence-only commits.

### Created

- `src/product/text-version-store.ts`
- `test/phase5-controller.test.ts`

### Modified

- `dev/planning-and-building/phase-1-shared-contracts.md`
- `src/contracts/execution.ts`
- `src/core/commit-coordinator.ts`
- `src/core/planner.ts`
- `src/main.ts`
- `src/product/history-modal.ts`
- `src/product/index.ts`
- `src/product/product-controller.ts`
- `src/product/production-executor.ts`
- `src/product/runtime.ts`
- `src/product/snapshot-assembler.ts`
- `src/product/web-lock-run-lease.ts`
- `test/phase5-product.test.ts`

### Deleted

None.

Final evidence-only commits additionally modify/create the required evidence artifacts themselves; the cumulative evidence manifest must include:

- `dev/evidence/_ca-output.md` — modified;
- `dev/evidence/_ca-output-CA-P5.md` — created;
- `dev/evidence/_ca-blocker.md` — modified.

## Live / External Verification

The following are **NOT AVAILABLE IN THIS SESSION**:

- real Windows Obsidian OAuth and synchronization;
- physical iPhone/iOS Obsidian OAuth and synchronization;
- deployed Azure Static Web Apps OAuth callback round trip;
- real user Google Drive first-sync/incremental-sync run;
- physical-device network transition testing;
- actual multi-instance Obsidian Web Locks validation;
- large-vault/large-file physical-device memory/stress validation.

These are distinguished from implementation defects and proven platform limitations. They are not reported as successful and are not relabeled as accepted frozen-contract blockers.

## Remaining Proven Platform Limitations

### Stock-iOS arbitrary-file bounded-memory reads

Phase 4 evidence established that stock Obsidian iOS does not expose a supported general-purpose arbitrary-file chunk/offset read mechanism for every required BRAIN file type. Phase 5 keeps the mobile local boundary fail-closed rather than substituting whole-file `readBinary()` or an unproven byte-range assumption.

### Stock-iOS external-reference containment proof

Phase 4 evidence established that stock Obsidian iOS does not expose the link-aware/canonical-path metadata required to prove that a vault path cannot resolve through a symlink/alias/external reference outside the vault. The mobile/generic adapter continues to fail closed when no proving guard is available.

## Remaining Genuine Blocker

No accepted C1/C2/C6 frozen-contract blocker remains.

The remaining blocker classification is solely the two objectively demonstrated stock-iOS platform limitations above. All conformant Phase 5 implementation work available within the repository/test environment has been completed and the full available acceptance gate is green.

## Phase 5 Completion Status

`BLOCKED — PROVEN PLATFORM LIMITATION`

This status does not claim supervisory approval. PR #7 remains open and unmerged; Phase 6 and Stage 3 have not been started.
