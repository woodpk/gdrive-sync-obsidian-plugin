# Coding-Agent Evidence Handoff

## Build Identification

- Correction/build-session identifier: `Stage 2A Phase 1 rejection correction — C1 large-file transfer contracts`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Repository URL: `https://github.com/woodpk/gdrive-sync-obsidian-plugin`
- Git remote destination: `https://github.com/woodpk/gdrive-sync-obsidian-plugin.git`
- Authoritative branch/ref: `master`
- Effective correction base SHA: `88b25f4fe2351af0ff1046ef0a9a3573241c0b3b`
- C1 implementation commit SHA: `ad4362e6ec27d5c804d656a667d9080b9f964132`
- Verified current-master baseline used for CI: `a0d8dc7b25368ae7aaf0f207afcd12711f3d671a`
- Verification PR: `#2` — `C1 verification gate`
- Verification branch head SHA: `745473f39fc5665b01bf4ba5889ca155617a3531`
- GitHub PR merge/test SHA executed by Actions: `4f2e05205170d0bfbc90257a9308d8970ab37d9e`
- GitHub Actions workflow run ID: `32675993586`
- GitHub Actions verification job ID: `97284094328`

Before verification, GitHub compare confirmed that C1 commit `ad4362e6ec27d5c804d656a667d9080b9f964132` is an ancestor of current `master`. From C1 through verification baseline `a0d8dc7b25368ae7aaf0f207afcd12711f3d671a`, only `dev/evidence/_ca-output.md` and `dev/prompts/rejection-fix-prompt-spec.md` changed. No product source, tests, package configuration, or `.github/workflows/phase1-ci.yml` changed after C1 and before verification.

## Corrections Implemented

C1 was implemented at the frozen-contract level only, with directly necessary fake/test/documentation fallout:

- added exported `BinaryContentSource` in `src/contracts/common.ts` with optional `sizeBytes` and lazy `openChunks(): AsyncIterable<Uint8Array>`;
- changed `LocalReadResult` to expose `content: BinaryContentSource` instead of whole-file `bytes: Uint8Array`;
- changed `LocalVaultPort.createFile` and `replaceFile` to accept `BinaryContentSource`;
- changed `RemoteDownload` to expose `content: BinaryContentSource`;
- changed `RemoteCreateRequest` and `RemoteUpdateRequest` content to `BinaryContentSource`;
- updated local fake signatures to compile against the corrected frozen local boundary;
- added a contract test using a lazy `BinaryContentSource` whose async iterable yields multiple separate `Uint8Array` chunks;
- updated `dev/phase-1-shared-contracts.md` to describe the lazy/chunked platform-neutral transfer boundary.

No Phase 2, Phase 3, or Phase 4 production behavior was implemented. Synchronization, conflict, persistence, OAuth, and state semantics were not changed.

## Files Created

None in the permanent C1 `master` change set.

The temporary verification-only branch contained `dev/evidence/_ci-verification-trigger.md`; PR #2 was closed without merge, so that artifact is not part of the permanent `master` change set.

## Files Modified

Permanent C1 implementation/evidence files:

- `dev/evidence/_ca-output.md`
- `dev/phase-1-shared-contracts.md`
- `src/contracts/common.ts`
- `src/contracts/google-drive.ts`
- `src/contracts/local-vault.ts`
- `src/testing/fakes.ts`
- `test/contracts.test.ts`

## Files Deleted

None.

## Verification Performed

### Current-master grounding

- Current `master` verification baseline: `a0d8dc7b25368ae7aaf0f207afcd12711f3d671a`.
- C1 implementation commit `ad4362e6ec27d5c804d656a667d9080b9f964132` is an ancestor of that baseline.
- Compare `ad4362e6ec27d5c804d656a667d9080b9f964132...a0d8dc7b25368ae7aaf0f207afcd12711f3d671a` showed only:
  - `dev/evidence/_ca-output.md`
  - `dev/prompts/rejection-fix-prompt-spec.md`
- No executable product/test/package/workflow file changed post-C1 before verification.

### Verification PR and GitHub Actions execution

- Verification PR: `#2`.
- PR base: `master` at `a0d8dc7b25368ae7aaf0f207afcd12711f3d671a`.
- PR head: `ca-c1-verification` at `745473f39fc5665b01bf4ba5889ca155617a3531`.
- GitHub merge/test SHA checked out by Actions: `4f2e05205170d0bfbc90257a9308d8970ab37d9e`.
- Workflow: `Phase 1 CI`.
- Workflow run ID: `32675993586`.
- Verify job ID: `97284094328`.
- PR #2 was closed without merging after successful verification.

### Required Phase 1 gate — authoritative GitHub Actions results

#### `npm ci`

- Result: `PASS`.
- Job step: `Install dependencies from lockfile`.
- Log evidence: `npm ci` executed, added 14 packages, audited 15 packages, and reported `found 0 vulnerabilities`.

#### `npm run typecheck`

- Result: `PASS`.
- Job step: `Typecheck`.
- Log evidence: executed `tsc --noEmit` and completed successfully.

#### `npm test`

- Result: `PASS`.
- Job step: `Test`.
- Log evidence: executed `tsc -p tsconfig.test.json && node --test .test-build/test/*.test.js`.
- Tests discovered/executed: `15`.
- Passed: `15`.
- Failed: `0`.
- Cancelled: `0`.
- Skipped: `0`.
- The new C1 test executed and passed explicitly as:
  - `ok 5 - local and Drive transfer contracts accept lazy multi-chunk binary content`

#### `npm run build`

- Result: `PASS`.
- Job step: `Production build`.
- Log evidence: executed `tsc -p tsconfig.build.json && node scripts/finalize-build.mjs` after the successful test step; the build step completed successfully and was not skipped.

### Historical local-execution limitation

The ChatGPT-local execution environment previously could not resolve `registry.npmjs.org`, so the full npm gate could not be executed locally. That limitation is superseded by the successful authoritative GitHub Actions verification above and is not a remaining project blocker.

## Acceptance-Criteria Status

`PASS`

1. `BinaryContentSource` exported shared contract — `PASS`.
2. Local reads return `BinaryContentSource` — `PASS`.
3. Local create/replace accept `BinaryContentSource` — `PASS`.
4. Drive downloads return `BinaryContentSource` — `PASS`.
5. Drive create/update content uses `BinaryContentSource` — `PASS`.
6. Affected frozen signatures do not require complete-file materialization — `PASS`.
7. Fake/test seams compile against corrected contracts — `PASS` via GitHub Actions typecheck/test compilation.
8. Multi-chunk lazy-source test executes and passes — `PASS`; explicit test #5 in workflow logs.
9. `dev/phase-1-shared-contracts.md` records corrected frozen boundary — `PASS`.
10. Complete Phase 1 gate (`npm ci`, `npm run typecheck`, `npm test`, `npm run build`) passes — `PASS` via GitHub Actions run `32675993586`, job `97284094328`.

This evidence does not claim supervisory approval.

## Frozen-Contract / Architecture Status

The transfer contract change was made under the explicit supervisor-issued C1 correction. Only the affected transfer abstraction and directly necessary fake/test/documentation surfaces changed. No unrelated frozen contract or architectural boundary was changed.

## Deviations

- `master` advanced during the original correction attempt. A non-fast-forward ref update was rejected; no force push was used. The correction was reapplied on top of the then-current `master` to preserve unrelated work.
- A temporary verification branch and PR were created solely to trigger and observe the existing pull-request GitHub Actions workflow. The PR was closed without merge; the trigger artifact did not enter `master`.

## Known Issues and Unverified Matters

- No known C1 source-level or verification defect remains.
- The GitHub Actions gate directly verified the current master-derived repository state containing C1.
- Independent supervisory inspection/approval remains outside this coding-agent evidence record.

## Evidence Integrity and Push Verification

- Required repository: `woodpk/gdrive-sync-obsidian-plugin`.
- Required remote: `https://github.com/woodpk/gdrive-sync-obsidian-plugin.git`.
- Authoritative branch: `master`.
- C1 implementation commit: `ad4362e6ec27d5c804d656a667d9080b9f964132`.
- Verified master baseline: `a0d8dc7b25368ae7aaf0f207afcd12711f3d671a`.
- Verification PR: `#2`, closed without merge.
- Verification merge/test SHA: `4f2e05205170d0bfbc90257a9308d8970ab37d9e`.
- Workflow run: `32675993586`.
- Verification job: `97284094328`.
- Full required gate: `PASS`.
- Test result: `15 passed / 0 failed`.
- Multi-chunk C1 test: executed and `PASS`.
- The concrete SHA of this evidence update is verified after Git commits this file and is reported in the completion response.

---

# Stage 2A Build Session 02 / Phase 2 Evidence

## Build Identification

- Build/session: `Stage 2A Build Session 02 / Phase 2 — Core Synchronization Semantics and Durable State`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Assigned branch: `stage-2a-phase-2-core-sync-state`
- Exact supervisor-approved baseline SHA: `e16719196269b4b31f8f1a4997722cdd1c916058`
- Final verified implementation head before evidence update: `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`
- Implementation range: `e16719196269b4b31f8f1a4997722cdd1c916058..5be0dca6eb97d2842c63b16540d9c938dd96ecb6`
- Additional hardening commits made during final review include `1d6b5cb0e6cc0da2bdb4520a5b80161d13635269`, `8f54f62f5be3551611454d6d9870dde80dd0b8f4`, `cda4ea7039ab357068bfdf5644a861988226605e`, `ee12169d7a1da69cd263dc82a56e90acb178c1c0`, `0bb8947aa2118fc15a6ddf9387a12ae2475b3829`, `80737eb54c6a35eb570da1e1347c2176836f4594`, `3e080a5df1149dc993484506407e1526c0b53a20`, `965dd2cc539b4c7eafa6c9ebad732827cb090b08`, and `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`.
- Pull request: `#3` (open, unmerged)
- Final implementation verification workflow run: `32712075905`
- Verification job: `97385435543`
- PR merge/test SHA executed by that run: `2274a4dfc832a7e3fc2fbb114751d74a00ebebad`
- Frozen Phase 1 contracts: `unchanged`

## Phase 2 Implementation

Implemented only the Phase 2-owned synchronization/state boundary:

- deterministic LOCAL + REMOTE + BASE reconciliation planning over the frozen `PlanningInput`/`SynchronizationPlan` contract;
- safe-union first-sync semantics, including one-sided copy, equal no-base no-op, divergent no-base conflict, and no initialization deletion authority;
- timestamp-independent content/change classification;
- conservative blocking for unreadable/inaccessible/unknown local or remote observations, incomplete/failed/unknown remote absence, untrusted base, identity ambiguity, and stale-device/tombstone resurrection;
- three-way text merge and unresolved conflict provenance behind the frozen `ConflictResolver` contract;
- opaque/binary conflict and delete-vs-modify preservation semantics;
- stable-ID and trusted-content/history-based identity-preserving move classification, including explicit refusal when multiple candidates make identity ambiguous;
- trusted both-side deletion represented as an absence-guarded no-op state transition that removes prior base/mapping and records a durable `deletedOn: "both"` tombstone only after verified commit;
- attested recoverable-delete planning plus mass-destruction circuit breaking;
- default destructive thresholds: `25` destructive operations, `20%` affected paths, and `3x` recent destructive average, with state-integrity/rebuild as an independent breaker signal;
- approval scoped to the exact plan and a concrete recovery checkpoint; no force-sync bypass;
- stale returning-device guards that prevent destructive propagation until reconciliation clears staleness;
- bounded/configurable tombstone retention with a 90-day default, while prohibiting expiry when any known device is stale and retaining undated tombstones conservatively;
- stable random device-ID generation using Web Crypto or an injected secure random source rather than hardware fingerprinting;
- non-destructive device-removal state transition that preserves shared content/base/tombstone evidence;
- mobile-neutral persistent synchronization state using a UTF-8 JSON integrity envelope and injectable byte-storage abstraction;
- production mobile-safe `IndexedDbStateByteStorage`, including transactionally atomic compare-and-swap for concurrent state-writer detection and atomic record replacement;
- schema/version and checksum integrity validation, internal-consistency validation, clone/restore identity checks, stale-revision/concurrent-write detection, backup/export, and migration assessment/migration-with-backup behavior;
- migration compare-and-swap refusal if state changes after assessment/backup;
- durable Drive change-cursor and known/stale-device metadata persistence;
- pending/completed/uncertain operation-journal semantics with checkpoint provenance;
- `CrashSafeExecutionCoordinator` enforcing precondition validation → pending journal → mutation/verification → authoritative verified-success commit, with stale-precondition re-plan signaling and uncertain-result journaling;
- verified-success-only authoritative commit ordering, preserving checkpoint provenance through completion;
- in-process run serialization plus an injectable cross-instance lease boundary, cancellation semantics, pause/resume, and deferred reconciliation signaling.

No Phase 3 Google Drive/OAuth production implementation, Phase 4 Obsidian local/platform/configuration adapter, Phase 5 UI/orchestration, or real-device testing was added.

## Engineering Decisions

- Three-way merge: deterministic line-oriented BASE/LOCAL/REMOTE LCS-derived edit hunks; only provably non-overlapping/equivalent edits auto-merge. Overlapping incompatible edits remain unresolved.
- Text auto-merge classification is deliberately limited to `.md` and `.txt`; other formats remain opaque/binary at this phase.
- State serialization uses a platform-neutral UTF-8 JSON envelope with explicit schema version and integrity checksum. Production bytes are persisted in IndexedDB rather than Node/Electron/Windows-only storage.
- State writer coordination uses optimistic revision checks plus byte-level transactional compare-and-swap in the production IndexedDB store so a writer cannot successfully replace state if another writer changed the exact source state after it was read.
- Destructive-safety defaults are 25 operations, 20% of managed paths, and 3x recent destructive activity, with state-integrity/rebuild as an independent signal. They are conservative Phase 2 parameters subject to later integrated/stress validation.
- Tombstone retention defaults to 90 days but cannot expire while any known device is stale; timestamps remain advisory and are not synchronization winner authority.
- Proven local rename/move may use unique stable identity or exact trusted content-hash evidence; duplicate candidates are blocked rather than guessed.
- Trusted both-side deletion uses the frozen `noop` vocabulary with explicit absence/base/completeness preconditions and a private reason code to drive the durable tombstone transition, avoiding any frozen-contract change.
- Cross-process run exclusion remains behind the Phase 2 `RunLeasePort` semantic boundary so Phase 4/5 can supply the platform-specific durable lease without coupling the core to a concrete local adapter.

## Verification Performed

GitHub Actions workflow `Phase 1 CI`, run `32712075905`, job `97385435543` executed the complete repository gate on PR #3 at implementation head `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`:

- `npm ci` — `PASS`; 14 packages installed, 0 vulnerabilities reported.
- `npm run typecheck` — `PASS`; `tsc --noEmit` completed successfully.
- `npm test` — `PASS`; `65` tests executed, `65` passed, `0` failed, `0` cancelled, `0` skipped, `0` todo.
- `npm run build` — `PASS`; `tsc -p tsconfig.build.json && node scripts/finalize-build.mjs` completed successfully.

The final logs explicitly show the new Phase 2 hardening tests executing and passing, including stale-precondition mutation refusal, verified-success ordering, uncertain-operation journaling, ambiguous remote/local move refusal, stale-device destructive blocking, atomic concurrent-write detection, and both-deleted tombstone transition.

Historical correction runs are retained as evidence rather than hidden:

- run `32686088720` exposed an earlier planner TypeScript narrowing defect; repaired before later green gates;
- run `32711664922` exposed a TypeScript narrowing defect introduced during final stale-device hardening; repaired in `0bb8947aa2118fc15a6ddf9387a12ae2475b3829` before the final green gate;
- successful run `32712075905` is the authoritative implementation gate recorded here.

Direct local cloning/npm execution was not usable because the customer-facing container could not resolve `github.com`; this is not a remaining verification blocker because the required GitHub Actions gate executed all repository commands successfully.

## Acceptance-Criteria Mapping

- Reconciliation matrix / safe union / one-sided and divergent content — `PASS`.
- Both-deleted and no-base both-absent semantics, including durable trusted-deletion tombstone transition — `PASS`.
- Local-only, remote-only, and concurrent modification classification — `PASS`.
- Clock skew/advisory timestamp changes cannot select a winner — `PASS`.
- Three-way clean merge and true text conflict preservation — `PASS`.
- Binary conflict preservation and delete-vs-modify preservation — `PASS`.
- Attested local/remote deletion and no-base non-deletion — `PASS`.
- Unreadable, inaccessible, and unknown local observations cannot authorize deletion — `PASS`.
- Partial, failed, and unknown remote enumeration cannot authorize remote-absence deletion — `PASS`.
- Recovery-required state disables destructive propagation — `PASS`.
- Identity-preserving move, unique historical hash recognition, and ambiguous candidate refusal — `PASS`.
- Empty-folder entity-kind semantics — `PASS`.
- Tombstone + stale-device resurrection blocking — `PASS`.
- Returning stale current device cannot authorize destructive propagation — `PASS`.
- Bounded/configurable tombstone retention and stale-device retention safety — `PASS`.
- Ordinary deletion auto-eligibility versus suspicious destructive-plan approval/checkpoint requirement — `PASS`.
- Circuit-breaker absolute-count, percentage, abnormal-divergence, and state-integrity/rebuild signals — `PASS`.
- Reviewed destructive approval is scoped to exact plan and concrete recovery checkpoint — `PASS`.
- True new install versus missing expected state — `PASS`.
- Malformed, truncated, internally inconsistent, integrity-failed, and incompatible state recovery — `PASS`.
- Clone/restore suspicion and stale state-revision write detection — `PASS`.
- Atomic concurrent state-write detection after read but before write — `PASS`.
- Production mobile-safe IndexedDB state persistence compiles under the runtime/mobile architecture guard — `PASS`.
- Stable random device identity without hardware fingerprinting — `PASS`.
- Drive change cursor and known/stale-device state persistence — `PASS`.
- Non-destructive device removal — `PASS`.
- Migration assessment, backup-before-migration, unsafe downgrade refusal, and concurrent-change migration refusal semantics — `PASS` at the Phase 2 storage/policy level.
- Diagnostic export excludes authentication secret/full-content categories by explicit projection — `PASS`.
- Pending/uncertain/completed operation journal with checkpoint provenance — `PASS`.
- Preconditions are validated before mutation; stale preconditions prevent execution and require re-plan — `PASS`.
- Durable integrity-verified success ordering and checkpoint preservation — `PASS`.
- Uncertain mutation outcome is journaled uncertain and never becomes authoritative synchronized state — `PASS`.
- Run serialization, lease exclusion semantics, cancellation, pause, and later-reconciliation signal — `PASS`.
- Mobile runtime import guard / no Node-Electron-Windows runtime dependency — `PASS` within the 65-test repository suite.
- Frozen `src/contracts/**` remained unchanged — `PASS` by baseline-to-head Git compare.
- No Phase 3/4 concrete adapter dependency was introduced — `PASS` by source/change-set inspection and compilation.
- No credentials or external telemetry were introduced — `PASS` by source/change-set inspection and existing secret/mobile safety tests.

The frozen `PlanningInput` contract contains no explicit exclusion/out-of-scope marker; therefore the acceptance phrase “excluded/out-of-scope signals when represented in the supplied planning input” is not independently applicable in Phase 2 beyond respecting the snapshots actually supplied by adapter boundaries. No frozen-contract revision was required.

## Files Created

Derived from Git compare `e16719196269b4b31f8f1a4997722cdd1c916058...5be0dca6eb97d2842c63b16540d9c938dd96ecb6`:

- `src/core/commit-coordinator.ts`
- `src/core/conflict-resolver.ts`
- `src/core/destructive-safety.ts`
- `src/core/execution-coordinator.ts`
- `src/core/planner.ts`
- `src/core/production-planner.ts`
- `src/core/run-coordinator.ts`
- `src/state/indexeddb-state-storage.ts`
- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `test/phase2-conflict.test.ts`
- `test/phase2-execution.test.ts`
- `test/phase2-planner-edge.test.ts`
- `test/phase2-planner.test.ts`
- `test/phase2-safety-policy.test.ts`
- `test/phase2-state-hardening.test.ts`
- `test/phase2-state.test.ts`

## Files Modified

- `tsconfig.test.json`
- `dev/evidence/_ca-output.md` (this Phase 2 evidence section)

## Files Deleted

None.

## Frozen-Contract Status

`UNCHANGED` — the baseline-to-head compare contains no file under `src/contracts/**`. No supervisor-approved contract revision was required.

## Deviations / Limitations / Deferred Work

- The assigned branch was discovered already containing Phase 2 work after creation; the implementation was therefore repository-grounded, reviewed, repaired, and hardened in place rather than discarded. No force reset or overwrite of unrelated branch work was performed.
- CI-detected TypeScript defects encountered during implementation/hardening were repaired before the final green implementation gate; failed runs are recorded above.
- Live Google Drive/OAuth, concrete Obsidian filesystem/configuration behavior, final product orchestration/UI, and Windows/iPhone real-device verification are intentionally deferred to their assigned later phases.
- Numeric destructive thresholds, tombstone-retention duration, and the merge implementation are Phase 2 engineering decisions and remain subject to later integrated/stress validation; they do not weaken the fixed target semantics.
- Cross-process/device run-lease durability depends on the Phase 4/5 host supplying the platform-specific production `RunLeasePort`; Phase 2 defines/tests the exclusion semantics and separately provides transactional IndexedDB durability for synchronization state itself.

## Worker Status

`COMPLETE` for Stage 2A Build Session 02 / Phase 2. The implementation head passed the required repository gate before this evidence-only `[skip ci]` commit. This is not whole-product completion and does not claim supervisory approval.

---

# Stage 2A Build Session 05 / Phase 5 — Current Corrective Session Evidence

## Build Identification

- Agent/session: `agt-CA-P5-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Required baseline: `master == 372f17f9c69d23feb9909aa08d7566a077a4163b`
- Branch: `stage-2a-phase-5-integrated-product`
- Pull request: `#7` — required to remain open and unmerged
- Corrective session began from the previously documented Phase 5 state and continued on the existing Phase 5 branch.
- Latest pushed branch head before this evidence-consolidation commit: `eb9939ac6daf29d244a1c23e23e1d84bb080efd7`
- Current corrective work order scope: C1–C9 plus directly necessary consequential Phase 5 repairs.
- Current completion classification: `INCOMPLETE`.

This section supersedes the older Phase 5 section that previously described C1–C7 as final and green. The implementation has advanced beyond that older verified head; therefore the older `136/136` run is historical evidence only and is not the acceptance gate for the present corrective session.

## Corrective Work Implemented in This Session

### C1 — Canonical SHA-256 content evidence

Substantial implementation completed and pushed:

- added a dependency-free, incremental, mobile-safe SHA-256 implementation in `src/util/sha256.ts`;
- canonical evidence representation is `sha256:<lowercase-hex>`;
- hashing operates incrementally over `BinaryContentSource` chunks rather than requiring whole-file buffering;
- local evidence computation was moved behind a production decorator/cache keyed by exact observation token;
- Drive metadata/transfer evidence was aligned toward the same canonical SHA-256 representation;
- recognized-text materialization now verifies retained content against canonical SHA-256 evidence and rejects corrupt/mismatched retained material instead of trusting a key alone.

No Node-only crypto dependency or whole-file mobile hashing fallback was introduced.

### C2 — Exact-version mutation preconditions and second validation boundary

Substantial implementation completed and pushed:

- planner operations now carry exact LOCAL observation/content preconditions where applicable;
- REMOTE mutation intent carries stable remote object identity plus revision/content evidence where available;
- merge provenance, delete intent, and move endpoints are represented in mutation-relevant preconditions;
- `ProductSynchronizationExecutor.execute()` revalidates preconditions again after pending-journal persistence and immediately before crossing mutation authority;
- remote updates carry planned expected remote revision;
- stale version/revision mismatches fail as stale/blocked/recovery outcomes instead of mutating newer reality;
- conflict-resolution operations use the same exact-version revalidation discipline.

### C3 — Recovery reconstruction and conservative destructive-authority gate

Substantial implementation completed and pushed:

- recovery can assemble a fresh LOCAL + REMOTE safe-union reconstruction candidate instead of feeding corrupt state back through ordinary destructive planning;
- full recovery reconstruction uses a pre-list Drive Changes cursor candidate;
- `PersistentSynchronizationStateStore` gained exact-byte backup/recovery replacement support with compare-and-swap protection;
- a persistent recovery gate prevents automatic/destructive authority from silently returning while reconstruction is incomplete;
- recovery entry/completion is surfaced through controller/audit/runtime diagnostics;
- automatic synchronization refuses to execute a reconstruction without review.

### C4 — Symmetric managed scope and portable configuration

Substantial implementation completed and pushed:

- user exclusions are persisted and applied through a symmetric managed-scope boundary rather than only on one side;
- active Obsidian configuration directory is resolved at runtime;
- only the explicit portable configuration allowlist is projected into synchronization scope;
- portable configuration is mapped through a private reserved remote namespace rather than exposing unrelated device-local configuration;
- unknown configuration, workspace/session state, secrets, sync operational state, and third-party settings remain excluded/device-local by default.

### C5 — Live runtime settings

Substantial implementation completed and pushed:

- periodic scheduler configuration can be refreshed without plugin restart;
- local debounce/periodic settings are read dynamically;
- audit retention can be changed live and the bounded audit projection can trim to the new retention limit;
- user exclusions/settings changes propagate into the live product runtime.

### C6 — Conflict-resolution UX and provenance-safe copies

Substantial implementation completed and pushed:

- conflict attention UI exposes keep-local, keep-remote, keep-both, and manual-current-local resolution paths through the live controller;
- manual resolution obtains a stable current local version rather than manufacturing a version reference;
- conflict-copy naming carries attributable provenance information rather than a weak generic token;
- copy allocation checks for collisions and chooses a free deterministic variant rather than overwriting an existing conflict copy;
- preserved remote conflict content is validated against the original remote object/path before it is copied to a new local conflict-copy path;
- stale conflict selections remain rejected before mutation.

### C7 — Path-isolated execution progress

Substantial implementation completed and pushed:

- path-local blocked operations can be isolated so unrelated reviewed safe work can continue;
- partial progress does not advance the Drive Changes cursor while unaccounted path work remains;
- recovery-required, uncertain, authentication/global Drive failure, stale-state, and stale-precondition conditions still stop the run globally;
- controller status communicates safe partial progress and remaining blocked paths rather than silently claiming full completion.

One final disposition semantic is still being reconciled in tests: a plan whose only meaningful work is blocked must remain globally non-executable, while mixed safe+blocked plans may permit isolated safe progress.

### C8 — Semantic plan and operation identifiers

Substantial implementation completed and pushed:

- deterministic SHA-based identifiers now fingerprint mutation intent rather than path/kind alone;
- operation fingerprints incorporate content/version evidence, remote identity/revision, preconditions, move endpoints, conflict identity, destructive flag, and relevant reasons;
- plan fingerprints incorporate trigger, disposition/checkpoint requirements, and ordered semantic operation identities;
- conflict-resolution plans use the same semantic identifier machinery.

### C9 — Required Phase 5 product-level acceptance suite

`INCOMPLETE`.

The exact Phase 5 acceptance scenarios were recovered and existing tests were being realigned to the corrected semantics, but the explicit product-level automated mapping for every required numbered scenario was not completed before this evidence update.

Therefore this session does not claim C9 completion, a final acceptance count, or final Phase 5 completion.

## Additional Defects Found and Repaired During This Session

- A TypeScript union-narrowing defect in conflict-resolution audit handling was exposed by CI and repaired.
- A missing executor `localPathState` integration method was exposed by CI and repaired.
- Keep-both remote-version validation initially attempted to validate the preserved Drive object at the newly generated local copy path; this was corrected so the remote object is validated at its original remote path before local copy materialization.
- Earlier Web Locks release-ordering hardening remains in the branch; this session did not weaken it.

## Verification Chronology for This Corrective Session

All results below are retained; failed runs are not hidden.

### GitHub Actions run `32781708948`

- Workflow: `Phase 1 CI`
- Job: `97604998148`
- `npm ci` — `PASS`; 14 packages added, 15 audited, 0 vulnerabilities.
- `npm run typecheck` — `FAIL`.
- Failure: `src/product/product-controller.ts` referenced `.path` on the `ConflictAssessment` union without preserving the `kind !== "none"` narrowing.
- `npm test` — skipped because typecheck failed.
- `npm run build` — skipped because typecheck failed.
- The narrowing defect was repaired before subsequent runs.

### GitHub Actions run `32782160842`

- Workflow: `Phase 1 CI`
- Job: `97606356328`
- `npm ci` — `PASS`; 14 packages added, 15 audited, 0 vulnerabilities.
- `npm run typecheck` — `FAIL`.
- Failure: `IntegratedProductController` referenced `ProductSynchronizationExecutor.localPathState` before that integration helper existed.
- `npm test` — skipped.
- `npm run build` — skipped.
- The missing helper/integration was repaired before the next run.

### GitHub Actions run `32782473350` — latest completed run inspected before the final two corrective commits

- Workflow: `Phase 1 CI`
- Job: `97607301082`
- PR merge/test SHA: `09c9f7ef226269c427aadde26666cfadca574bb0`
- Branch head represented by that merge/test run: `20c9d3e507e34089bd5076c79f56451f5249237b`
- `npm ci` — `PASS`; 14 packages added, 15 audited, 0 vulnerabilities.
- `npm run typecheck` — `PASS`.
- `npm test` — `FAIL` with `137` total tests: `134 passed / 3 failed / 0 cancelled / 0 skipped / 0 todo`.
- `npm run build` — skipped because tests failed.

The three observed test failures were:

1. stale current-device destructive planning still expected the historical whole-plan disposition `blocked`; the corrected path-isolation semantics changed that disposition and require the test/final semantic to distinguish all-blocked from mixed safe+blocked plans;
2. unresolved reviewed synchronization expected request rejection, while the corrected controller treats unresolved work as safe partial/no-mutation progress; the required invariant is that it must not open the first-sync trusted-completion gate;
3. keep-both conflict resolution was rejected because remote exact-version preconditions were evaluated at the new local copy path rather than the original remote source path.

After that completed run, corrective commits including `29a9318a518569a69d93293dea403d70421922d0` and current pre-evidence head `eb9939ac6daf29d244a1c23e23e1d84bb080efd7` were pushed to address the latter test/integration failures. A completed clean-checkout CI run validating those latest commits was not obtained before this evidence consolidation.

## Verification Status

The authoritative status for the current branch is therefore:

- current implementation work: **pushed**;
- latest completed CI typecheck: **PASS** on the immediately prior tested head;
- latest completed CI tests: **NOT GREEN** (`134/137` on run `32782473350`);
- latest completed production build: **NOT EXECUTED** on that run because tests failed;
- post-failure corrective commits: **pushed but not yet covered by a completed authoritative green gate**;
- C9 full numbered acceptance mapping: **INCOMPLETE**.

The older Phase 5 run `32777527719` with `136/136` and a passing production build remains valid historical evidence for its older implementation head, but it is superseded as a current acceptance claim because substantial C1–C8 code changed afterward.

## Live / External Verification

The following remain `NOT AVAILABLE IN THIS SESSION`:

- real Windows Obsidian OAuth and synchronization;
- physical iPhone/iOS Obsidian OAuth and synchronization;
- deployed Azure Static Web Apps OAuth callback round trip;
- real-user Google Drive first-sync/incremental synchronization;
- physical-device network-transition testing;
- actual multi-instance Obsidian Web Locks validation;
- large-vault/large-file physical-device memory/stress validation.

These are separate from source/test defects and are not reported as successful.

## Proven Stock-iOS Platform Limitations Preserved

The corrective work did not deliberately weaken the two previously established fail-closed limitations:

1. stock Obsidian iOS cannot currently provide/prove the required general bounded-memory arbitrary-file local-read mechanism for every required BRAIN file type;
2. stock Obsidian iOS does not expose sufficient link-aware/canonical-path metadata to prove containment against symlink/alias/external-reference traversal.

No whole-file unsafe fallback, Node-only mobile dependency, or unproven external-reference bypass was intentionally introduced.

## Evidence Consolidation Directive

Per the supervisor's current evidence directive, `dev/evidence/_ca-output.md` is the sole authoritative coding-agent evidence file for this branch/build session.

The redundant Phase 5 evidence files are removed from the branch:

- `dev/evidence/_ca-output-CA-P5.md` — delete;
- `dev/evidence/_ca-blocker.md` — delete.

All future material build output, blockers, non-blockers, verification results, and completion evidence for this session must be recorded in this `_ca-output.md` section rather than split across parallel evidence files.

## Remaining Work Before Phase 5 Can Be Truthfully Closed

- finish C9 with explicit automated/evidence mapping for every required Phase 5 numbered acceptance scenario;
- reconcile the final all-blocked-versus-mixed-path-blocked execution-disposition semantics and corresponding tests without weakening path isolation;
- run the complete clean-checkout gate on the final implementation head:
  - `npm ci`
  - `npm run typecheck`
  - `npm test`
  - `npm run build`
- record the final tested branch head, PR merge/test SHA, workflow run/job IDs, test totals, and exact change manifest in this file;
- keep PR #7 open and unmerged for supervisory review.

## Completion Status

`INCOMPLETE`

C1–C8 contain substantial corrective implementation that has been pushed to GitHub, but C9 and the mandatory final clean verification/evidence pass remain unfinished. This session therefore does not claim `BLOCKED — PROVEN PLATFORM LIMITATION`, Phase 5 completion, or supervisory approval.