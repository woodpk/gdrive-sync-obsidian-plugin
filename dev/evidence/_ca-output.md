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

# Stage 2A Build Session 04 / Phase 4 Evidence

## Build Identification

- Worker: `agt-CA-P2-03`
- Build/session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Assigned branch: `stage-2a-phase-4-obsidian-local`
- Exact supervisor-approved baseline SHA: `e16719196269b4b31f8f1a4997722cdd1c916058`
- Implementation head verified before this evidence append: `b3ea2a0fb136e8c31da520034b85e75eaba278d9`
- Verification PR: `#4` — `Stage 2A Phase 4: Obsidian local platform boundary`
- Verification workflow run before this evidence append: `32712404279`
- Verification job before this evidence append: `97386439658`
- Frozen shared contracts: `UNCHANGED`

The evidence-file append itself creates a later branch commit and therefore necessarily triggers a later PR CI run. The final worker handoff records that later evidence-commit SHA and its latest successful workflow run/job. This section records the implementation-head run that existed when the evidence text was authored rather than fabricating a future self-referential run identifier.

## Implementation Summary

Phase 4 production code now provides the frozen `LocalVaultPort` behind an Obsidian-mobile-safe boundary without implementing Phase 2 synchronization policy, Phase 3 Drive/OAuth behavior, or Phase 5 orchestration.

Implemented capabilities include:

- whole-vault raw `DataAdapter.list()` enumeration, including ordinary text, unknown/binary extensions, hidden files, and empty directories;
- explicit complete/partial enumeration truthfulness;
- explicit visible/configurable exclusion policy with conservative operational-noise defaults and a runtime-discovered active-configuration-directory boundary;
- selective configuration classification with a deliberately small portable allowlist, unknown-by-default behavior, device-local workspace/cache/runtime handling, and protected secret/device/sync-state handling;
- Windows/iOS comparison/path preflight for separators, Unicode NFC equivalence, case collisions, invalid/reserved Windows names, traversal/external references, component limits, and conservative path length;
- local observation that distinguishes confirmed absence, present stable/unstable objects, unreadable, inaccessible, and unknown states;
- opaque observation tokens for stale-precondition checking without treating timestamps as synchronization authority;
- staged mobile-compatible create/replace using `writeBinary` + incremental `appendBinary`, with backup/rollback protection of a previously valid destination;
- explicit folder creation for empty-directory preservation;
- Obsidian `FileManager.renameFile()` for local moves so Obsidian link-update behavior remains available;
- Obsidian `FileManager.trashFile()` for recoverable deletion according to user trash configuration;
- local create/modify/delete/rename event seams with startup suppression until `workspace.onLayoutReady()`;
- vault-ready, suspend, resume, and unload lifecycle seams;
- non-destructive disposal and no remote/auth/network dependency for ordinary local enumeration/mutation behavior.

## Current Obsidian API / Platform Basis

The installed project package is Obsidian `1.13.1`; implementation choices were checked against the installed/current TypeScript definitions and current public Obsidian documentation.

- `Vault.configDir` is used as the runtime source of the active configuration directory; policy does not assume `.obsidian`.
- Mobile-required I/O stays on the platform-neutral `DataAdapter` and `FileManager` surfaces; no Node `fs`, Node streams, Electron, PowerShell, .NET, or Windows-only runtime import was introduced.
- Current `DataAdapter` exposes `writeBinary` and `appendBinary`; Phase 4 consumes `BinaryContentSource` incrementally for writes.
- `FileManager.renameFile()` is the Obsidian-supported rename surface intended to preserve link-management semantics.
- `FileManager.trashFile()` applies Obsidian trash semantics rather than hard-deleting ordinary synchronized content.
- The current public `Stat` contract exposes `type: 'file' | 'folder'` plus ordinary file metadata and does not expose a portable symlink/junction/alias discriminator.

## Large-File Read Evidence and Platform Blocker

The production `readFile()` intentionally does **not** call `DataAdapter.readBinary()`, because the mobile `CapacitorAdapter.readBinary()` contract returns a whole `ArrayBuffer` and therefore cannot prove bounded large-file memory use.

Instead, production code lazily opens `fetch(adapter.getResourcePath(path))`, requires a `ReadableStream`, and yields stream chunks through the frozen `BinaryContentSource`. Automated tests prove that:

- fetching does not begin merely by obtaining `LocalReadResult`;
- production `readBinary()` is not invoked by the selected read path;
- a streaming runtime can expose multiple incremental chunks through `BinaryContentSource`.

However, current public Obsidian mobile evidence reports that iOS may deliver a local resource fetch as one entire-file stream chunk. That means the selected public mobile-safe API does **not** establish the strict product guarantee of bounded memory for arbitrarily large iOS local reads. Wrapping that one large chunk in a lazy `AsyncIterable` would not change the actual memory behavior, so Phase 4 does not claim `XFER-006`/`XFER-007` complete.

This is a concrete **platform blocker**, not a frozen-contract defect: the frozen `BinaryContentSource` is capable of incremental consumption, but the currently supported public iOS source API does not guarantee bounded incremental production. Resolving it requires a supervisor-approved platform approach that provides true ranged/chunked local read on iOS (for example, a future supported Obsidian API or an explicitly approved mobile-native capability); no frozen-contract change is currently requested.

## External-Reference / Symlink Platform Limitation

`FILE-007` requires unsupported symlink/junction/alias/external references never to be followed outside the vault. Phase 4 blocks path traversal, absolute/URL/drive-path references, and other explicit external forms. The current mobile-safe public `DataAdapter.stat()`/`Stat` surface, however, exposes only `file` versus `folder` and provides no portable symlink/junction/alias discriminator. Therefore the worker cannot objectively prove raw-filesystem external-reference detection on both Windows and iOS using only the supported frozen mobile-safe boundary.

This is recorded as a second platform limitation requiring supervisory resolution or later platform evidence. The implementation does not add a desktop-only `FileSystemAdapter` escape hatch because doing so would violate the first-class iOS boundary.

## Verification Performed

Authoritative GitHub Actions run `32712404279`, job `97386439658`, executed the required repository gate against PR #4 and completed successfully:

- `npm ci` — `PASS`; 14 packages installed, 15 audited, 0 vulnerabilities reported.
- `npm run typecheck` — `PASS`; `tsc --noEmit` completed successfully.
- `npm test` — `PASS`; 40 tests discovered/executed, 40 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.
- `npm run build` — `PASS`; `tsc -p tsconfig.build.json && node scripts/finalize-build.mjs` completed successfully.

Phase 4-specific executed tests include coverage for:

- raw text/binary/unknown-extension/hidden/empty-folder enumeration and active-config/default-noise separation;
- complete versus partial enumeration;
- confirmed absent versus inaccessible/unreadable/unknown observations;
- unstable mid-write file rejection;
- stale observation tokens;
- lazy resource streaming without production `readBinary()`;
- multi-chunk incremental writes;
- stage/backup rollback on replacement failure;
- storage-exhaustion-style staging failure preserving the existing destination byte-for-byte;
- empty-folder creation;
- `FileManager` move/trash behavior;
- startup event suppression, local change/rename events, suspend/resume seams, unload, and non-destructive disposal;
- separator, reserved/invalid-name, external-reference, case-collision, Unicode-collision, and path-length validation;
- configuration portable/unknown/device-local/protected classification;
- existing repository mobile-import guard proving no Node/Electron/Windows-only runtime imports.

## Acceptance-Criteria Mapping

- Whole-vault enumeration and explicit completeness: `PASS` in automated tests for supported `DataAdapter` objects.
- Unknown/binary files, hidden files, empty directories: `PASS`.
- Explicit/configurable exclusions and runtime config-directory separation: `PASS`.
- Selective config classifier and secret/device/sync-state protection: `PASS`.
- Windows/iOS path comparison/collision/name preflight: `PASS` for representable path conditions.
- Present/absent/unreadable/inaccessible/unknown distinction: `PASS`.
- Stability/precondition token mechanics: `PASS`.
- Incremental bounded write consumption: `PASS` using `appendBinary`.
- Safe staged create/replace and rollback preservation: `PASS` in deterministic failure tests.
- Recoverable trash and Obsidian-supported move: `PASS` at API-boundary tests.
- Local change and lifecycle seams: `PASS` at automated boundary tests; real-device lifecycle behavior remains unverified.
- Offline/local-first independence from Drive/auth: `PASS` architecturally; local adapter has no Drive/OAuth dependency.
- Non-destructive unload: `PASS`.
- BRAIN asset boundary: `PASS` architecturally; Phase 4 contains no remote asset repository integration or semantic/AI asset handling.
- Strict bounded-memory iOS local read: `BLOCKED` by current public mobile API behavior described above.
- Portable symlink/junction/alias detection sufficient to prove `FILE-007`: `BLOCKED` by the current public mobile-safe `Stat` surface described above.

## Real-Platform Evidence

No physical Windows Obsidian or iPhone/iOS Obsidian instance was available to this worker through the permitted tools. No device evidence is fabricated.

Carry forward to Phase 5/6 real-device validation:

- Windows and iPhone startup/vault-ready/suspend/resume behavior;
- actual Obsidian link-update behavior after a remote-requested local rename;
- user-selected local trash behavior;
- storage exhaustion behavior on physical platforms;
- local-resource stream chunk behavior and memory profile on current iOS Obsidian;
- any platform-native evidence capable of distinguishing symlink/junction/alias objects without a desktop-only dependency.

## Actual Git Change Set Before Evidence Append

Created:

- `src/local/config-policy.ts`
- `src/local/exclusions.ts`
- `src/local/obsidian-local-vault.ts`
- `src/local/path-policy.ts`
- `test/local-failure-semantics.test.ts`
- `test/local-policy.test.ts`
- `test/obsidian-local-vault.test.ts`

Modified before this append: none relative to the assigned baseline.

Deleted: none.

This evidence append additionally modifies:

- `dev/evidence/_ca-output.md`

No file under `src/contracts/**` was changed.

## Implementation Commits

- `65c9df245cfe309c2822de47ec653e29d9d66f1a`
- `8c95c8f5731bb5c34fac8c792d3a5c77d43df056`
- `e643a936d9b262c13f50aeaf3f777e5aa8259c0f`
- `b89e7d5f11af90970648b21dcd578294464a54c3`
- `16f8f1989b3bf5da59a010fc18826434df066e82`
- `2e6702bcb80b4183d711d002f4d262e8315f074e`
- `6d65a9ece37761fabffae937ff053233efa8b7ba`
- `32772b118c5ada0244c92ea580291bdcda57f8ab`
- `b3ea2a0fb136e8c31da520034b85e75eaba278d9`

## Deviations, Blockers, and Final Worker Status

- The first PR CI run (`32712052644`) found four Phase 4 test failures in path/exclusion classification. Those defects were repaired before the successful implementation-head gate above.
- No frozen-contract revision was made or requested.
- No synchronization policy, Drive/OAuth behavior, final orchestration/UI, or external BRAIN asset management was introduced.
- Strict iOS bounded local reads remain unproven/blocked by the current public mobile API behavior.
- Portable symlink/junction/alias discrimination remains unproven/blocked by the current public mobile-safe metadata API.
- Independent supervisory acceptance remains outside this worker's authority.

Final worker status: `BLOCKED` — the implemented/testable Phase 4 boundary is green, but two explicit platform guarantees cannot truthfully be claimed complete with the currently supported public mobile API surface.

---

# Phase 4 C1 Rejection Correction — Fail-Closed External-Reference Capability

## Correction Identification

- Rejection/correction base SHA: `e577bf1366001de3871a868bd549630b1060f2df`
- Correction implementation head verified before evidence updates: `4d06581fa91ba9643496a67296b5002925581ba2`
- Branch: `stage-2a-phase-4-obsidian-local`
- PR: `#4` — open, draft, unmerged
- Verification workflow run: `32731187369`
- Verification job: `97443556511`
- Frozen `src/contracts/**`: `UNCHANGED`

## C1 Implemented

C1 corrected the Phase 4 mobile-neutral local adapter from fail-open to fail-closed when the runtime cannot prove containment against symlink/alias/junction/external filesystem references.

In `src/local/obsidian-local-vault.ts`:

- added a blocking `UnavailableExternalReferenceGuard` that throws `LocalPlatformCapabilityError("external-reference-detection", ...)`;
- made the adapter's stored `externalReferenceGuard` required rather than optional;
- constructor now installs the blocking guard whenever no platform-specific guard is supplied;
- production observation and mutation source/target guard invocations are mandatory and no longer use optional chaining;
- folder observations that cannot establish safe traversal now add an enumeration failure so the subtree yields `partial` completeness instead of a false `complete` result;
- existing desktop construction still injects `DesktopExternalReferenceGuard` and remains available for contained desktop paths.

No unsafe bypass flag, user override, syntactic-path substitute, mobile Node import, or frozen-contract change was added.

## Directly Necessary Test Fallout

Ordinary fake-filesystem tests now explicitly inject a permissive **test-only** guard representing a fixture known to contain no external references.

Targeted C1 tests in `test/obsidian-local-vault.test.ts` execute and prove:

- `generic adapter without an external-reference guard fails closed before ordinary path observation`;
- `generic adapter without an external-reference guard blocks create replace move and trash`;
- `blocked folder subtree makes enumeration partial rather than falsely complete`.

The first test also verifies the underlying fake `exists/stat` operations are not reached for the blocked path. The mutation test verifies no write/rename/trash operation is performed and existing content remains intact. The subtree test verifies recursion does not enter the blocked folder.

Existing desktop external-reference tests and mobile import-isolation tests remain part of the same required gate.

## Verification Actually Performed

GitHub Actions run `32731187369`, job `97443556511`, checked out PR #4 merge/test SHA `2dc01ff9ade1f8e9c935568f626770d7bd748f6d` and executed:

- `npm ci` — `PASS`; 14 packages added, 15 audited, 0 vulnerabilities;
- `npm run typecheck` — `PASS`;
- `npm test` — `PASS`; 52 tests executed, 52 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo;
- `npm run build` — `PASS`.

The logs explicitly show:

- desktop external-reference tests as tests 13–16;
- mobile-import isolation tests as tests 33–35;
- C1 fail-closed tests as tests 48–50.

## Git-Derived C1 Change Inventory Before Evidence Updates

GitHub compare: `e577bf1366001de3871a868bd549630b1060f2df...4d06581fa91ba9643496a67296b5002925581ba2`

Created:

- none

Modified:

- `src/local/obsidian-local-vault.ts`
- `test/local-failure-semantics.test.ts`
- `test/obsidian-local-vault.test.ts`

Deleted:

- none

The completed correction pass additionally modifies both required evidence files:

- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P4.md`

The final Git-derived correction-pass inventory including these evidence files is verified after both evidence updates and reported in the completion response.

## Remaining Stock-iOS Platform Limitations

C1 does not weaken or claim resolution of the two demonstrated stock-iOS platform gaps:

1. strict bounded-memory arbitrary-file local reads remain unavailable on the current stock Obsidian Mobile host for non-media extensions because its documented Capacitor 5.x local-resource handler does not provide general byte-range semantics and its public filesystem generation lacks chunk/offset reads;
2. supported mobile proof against symlink/alias/external-reference traversal remains unavailable because the public mobile boundary lacks link-aware/canonical-path metadata even though Obsidian permits externally resolving symlinks/junctions.

C1 changes the second limitation's implementation behavior from unsafe omission of the check to explicit fail-closed blocking.

## C1 Correction Status

`IMPLEMENTED AND VERIFIED`

The exact SHA of the evidence-bearing commit cannot be embedded in that commit's own contents. The final pushed branch SHA and the final evidence-bearing PR workflow run/job are verified after commit and reported in the completion response. Independent supervisory approval is not claimed.
