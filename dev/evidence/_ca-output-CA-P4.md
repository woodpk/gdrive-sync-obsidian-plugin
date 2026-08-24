# Stage 2A Build Session 04 / Phase 4 Evidence

## Build Identification

- Worker: `agt-CA-P2-03`
- Build/session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Assigned branch: `stage-2a-phase-4-obsidian-local`
- Exact supervisor-approved baseline SHA: `e16719196269b4b31f8f1a4997722cdd1c916058`
- Phase 4 branch head before creation of this dedicated evidence file: `eb9ecd71183fc54f4e731d8ed3aec6780a510f04`
- Verification PR: `#4` — `Stage 2A Phase 4: Obsidian local platform boundary`
- Latest successful verification workflow run before creation of this dedicated evidence file: `32712821933`
- Latest successful verification job before creation of this dedicated evidence file: `97387694931`
- Frozen shared contracts: `UNCHANGED`

Creating this dedicated evidence file necessarily produces a later branch commit and may trigger a later PR CI run. The identifiers above record the final implementation/evidence state that existed immediately before this file was created rather than fabricating a future self-referential commit/run identifier.

## Implementation Summary

Phase 4 production code provides the frozen `LocalVaultPort` behind an Obsidian-mobile-safe boundary without implementing Phase 2 synchronization policy, Phase 3 Drive/OAuth behavior, or Phase 5 orchestration.

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

This is a concrete **platform blocker**, not a frozen-contract defect: the frozen `BinaryContentSource` is capable of incremental consumption, but the currently supported public iOS source API does not guarantee bounded incremental production. Resolving it requires a supervisor-approved platform approach that provides true ranged/chunked local read on iOS; no frozen-contract change is currently requested.

## External-Reference / Symlink Platform Limitation

`FILE-007` requires unsupported symlink/junction/alias/external references never to be followed outside the vault. Phase 4 blocks path traversal, absolute/URL/drive-path references, and other explicit external forms. The current mobile-safe public `DataAdapter.stat()`/`Stat` surface, however, exposes only `file` versus `folder` and provides no portable symlink/junction/alias discriminator. Therefore the worker cannot objectively prove raw-filesystem external-reference detection on both Windows and iOS using only the supported frozen mobile-safe boundary.

This is recorded as a second platform limitation requiring supervisory resolution or later platform evidence. The implementation does not add a desktop-only `FileSystemAdapter` escape hatch because doing so would violate the first-class iOS boundary.

## Verification Performed

Authoritative GitHub Actions run `32712821933`, job `97387694931`, executed the required repository gate against PR #4 and completed successfully:

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

## Actual Git Change Set

Created implementation/test files:

- `src/local/config-policy.ts`
- `src/local/exclusions.ts`
- `src/local/obsidian-local-vault.ts`
- `src/local/path-policy.ts`
- `test/local-failure-semantics.test.ts`
- `test/local-policy.test.ts`
- `test/obsidian-local-vault.test.ts`

Evidence files:

- `dev/evidence/_ca-output.md` was previously appended with Phase 4 evidence.
- `dev/evidence/_ca-output-CA-P4.md` is this dedicated Phase 4 evidence artifact created at the user's direction.

Deleted: none.

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
- `689b04089b391c913a8e201eec1447d6a3eb704e`
- `eb9ecd71183fc54f4e731d8ed3aec6780a510f04`

## Deviations, Blockers, and Final Worker Status

- The first PR CI run (`32712052644`) found four Phase 4 test failures in path/exclusion classification. Those defects were repaired before the successful final gates above.
- No frozen-contract revision was made or requested.
- No synchronization policy, Drive/OAuth behavior, final orchestration/UI, or external BRAIN asset management was introduced.
- Strict iOS bounded local reads remain unproven/blocked by the current public mobile API behavior.
- Portable symlink/junction/alias discrimination remains unproven/blocked by the current public mobile-safe metadata API.
- Independent supervisory acceptance remains outside this worker's authority.

Final worker status: `BLOCKED` — the implemented/testable Phase 4 boundary is green, but two explicit platform guarantees cannot truthfully be claimed complete with the currently supported public mobile API surface.
