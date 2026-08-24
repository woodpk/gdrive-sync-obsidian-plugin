# Stage 2A Build Session 04 / Phase 4 Evidence

## Build Identification

- Worker: `agt-CA-P2-04`
- Build/session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`
- Recovery directive: `CA-P4 RECOVERY DIRECTIVE — RESOLVE PHASE 4 PLATFORM BLOCKERS`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Assigned branch: `stage-2a-phase-4-obsidian-local`
- Pull request: `#4` — open, draft, unmerged
- Exact supervisor-approved Phase 4 baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`
- Pre-recovery branch SHA: `6250d59832939859037578e0cea8bb4d9d329965`
- Recovery implementation SHA verified before this evidence update: `39e8ade1961d3d1a8c12183a3f812c2e71ec81b9`
- Recovery verification workflow run: `32722967354`
- Recovery verification job: `97418107585`
- Frozen `src/contracts/**`: `UNCHANGED`

The evidence-file update itself creates a later branch commit and therefore may trigger a later PR workflow run. The identifiers above refer to the executable recovery implementation that was fully verified before this evidence text was committed; the final worker handoff records the later evidence-commit SHA and final branch/run state.

## Authority Re-Ingestion

Before recovery changes, the worker re-read the current branch versions of:

- `dev/planning-and-building/agent-led-software-product-construction-manual.md`
- `dev/planning-and-building/target-system-specification.md`
- `dev/planning-and-building/decision-register.yaml`
- `dev/planning-and-building/stage-1-build-decomposition.md`
- `dev/planning-and-building/phase-1-shared-contracts.md`

PR #4 and the current Phase 4 implementation were then inspected directly. No frozen-contract defect was found. The existing `BinaryContentSource` and `LocalVaultPort` contracts already permit the required platform-specific implementation strategies behind the product boundary.

## Former Blocker 1 — Strict Bounded-Memory iOS Local Reads

### Investigation Performed

The recovery investigated the required strategies in order.

#### Strategy A — HTTP byte ranges

The installed project package is Obsidian `1.13.1`. Current Obsidian Help credits identify the mobile host as using Capacitor `5.x`.

The Capacitor iOS `WebViewAssetHandler.swift` source was inspected at relevant versions:

- Capacitor `5.0.0` and `5.7.8`: the HTTP `Range`/`206 Partial Content` path is gated by `isMediaExtension(...)`; ordinary `.md`, `.json`, `.bin`, arbitrary unknown extensions, and many other BRAIN file types fall through to a complete-file `Data(contentsOf:)` response with HTTP `200`.
- Capacitor `6.2.1`: the handler accepts a `Range` header independently of the media-extension whitelist and uses `FileHandle.seek` plus bounded `readData(ofLength:)`, returning HTTP `206`, `Content-Range`, and `Content-Length`.

Therefore a correct plugin can use explicit byte ranges only when the actual host proves proper partial-content semantics. A generic `fetch(...).body` stream is not evidence of bounded memory.

### Implementation Chosen

`src/local/obsidian-local-vault.ts` now implements `BinaryContentSource.openChunks()` as sequential explicit byte-range requests with a default maximum range of 256 KiB.

For every range it:

- checks the stale observation token before requesting bytes;
- requests an exact `Range: bytes=start-end` interval;
- requires HTTP `206`;
- requires an exact matching `Content-Range` with the expected total file size;
- validates `Content-Length` when present;
- rejects an individual response/yield that exceeds the configured bound;
- requires exactly the requested number of bytes;
- re-checks stale-source evidence between ranges and after final consumption;
- never falls back to `DataAdapter.readBinary()`.

A runtime that ignores `Range` and returns HTTP `200` is rejected with `LocalPlatformCapabilityError("bounded-local-read", ...)`. The implementation therefore no longer silently mistakes a whole-file WebView response for a bounded stream.

### Strategy B — Native/internal copy to a range-capable temporary resource

Capacitor 5 Filesystem documentation exposes `copy(...)`, but the public Obsidian `DataAdapter.copy(...)` contract does not establish that the current Obsidian mobile adapter performs that operation as a native bounded copy rather than through another implementation path. No public Obsidian `CapacitorAdapter` implementation or stock-device evidence available to this worker proves the required memory behavior.

Additionally, using an extension-masqueraded temporary media file would require proving crash-safe cleanup and that the temporary representation can never become synchronized or persistent user content. Those requirements cannot be established from the current public Obsidian adapter contract alone.

Strategy B was therefore not implemented on speculation.

### Strategy C — Other existing mobile-native capability

Capacitor 5 Filesystem's public `readFile(...)` API is whole-file and has no chunk size, byte offset, or byte length controls. Capacitor added native `readFileInChunks(...)` only in `7.1.0`, and offset/length partial reads only in `8.1.0`. Current Obsidian documents Capacitor `5.x`.

No supported Obsidian plugin API was found that exposes a stock-mobile native chunked/offset file primitive in the current host. No undocumented `window.Capacitor` global or arbitrary native plugin was assumed.

### Tests Added / Updated

`test/obsidian-local-vault.test.ts` now objectively proves:

- obtaining `LocalReadResult` performs no eager fetch;
- sequential bounded ranges reconstruct exact original bytes;
- each produced unit stays within the configured range bound;
- the exact range progression is observable;
- HTTP `200` / ignored Range is rejected rather than accepted;
- malformed `Content-Range` evidence is rejected;
- stale-source validation works before consumption and between ranges;
- production `readBinary()` whole-file fallback is not invoked.

### Blocker Status

**REMAINS — DEMONSTRATED STOCK-iOS PLATFORM LIMITATION.**

The plugin-side implementation is now safe and fail-closed, but current stock Obsidian Mobile's documented Capacitor 5.x host cannot provide strict bounded reads for arbitrary BRAIN file extensions through `getResourcePath()`, and its public Filesystem generation lacks chunk/offset reads.

The smallest platform decision required is one of:

1. require a stock Obsidian Mobile host whose embedded Capacitor local-resource handler supports arbitrary-extension HTTP byte ranges (Capacitor 6.x behavior or later), and validate that behavior on the supported Obsidian release; or
2. require Obsidian Mobile to expose a supported native chunked/offset local-read primitive equivalent to Capacitor Filesystem `readFileInChunks` / offset-length reads.

Without one of those host capabilities, `XFER-006`/`XFER-007` cannot truthfully be satisfied for arbitrary large iOS files.

## Former Blocker 2 — Symlink / Junction / Alias / External-Reference Safety

### Investigation Performed — Desktop

Current Obsidian API definitions expose the desktop `FileSystemAdapter` and `getBasePath()`. The recovery therefore split the low-level implementation by platform rather than forcing desktop through the mobile metadata surface.

### Desktop Implementation Chosen

New desktop-only modules:

- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`

The desktop guard uses isolated Node filesystem/path APIs and:

- derives/canonicalizes the vault base path;
- walks each existing path component with `lstat` before traversal;
- rejects symbolic-link/junction components (`isSymbolicLink()`; Windows junctions are represented through the link/reparse filesystem surface);
- resolves existing components with `realpath` and rejects canonical paths outside the canonical vault root, covering other filesystem indirection/reparse cases that resolve externally;
- permits an uncreated mutation target only after every existing ancestor passes the same checks.

`ObsidianLocalVaultAdapter` now has a private Phase-4-only `ExternalReferenceGuard` seam. Observation/traversal and mutation source/target paths consult this guard before following the path. This does not change any frozen contract.

`src/local/desktop-local-vault.ts` constructs the local adapter with `DesktopExternalReferenceGuard` from the desktop adapter's `getBasePath()`.

### Mobile Import Isolation

`test/mobile-safety.test.ts` was strengthened so that:

- Node/Electron/Windows-only imports remain prohibited in every mobile-required runtime source file;
- Node filesystem imports are confined to the declared desktop-only guard module;
- the mobile-neutral `obsidian-local-vault.ts` cannot import the desktop factory/guard;
- frozen contract secret-field checks remain intact.

### Desktop Tests Added

`test/desktop-external-reference-guard.test.ts` proves:

- ordinary files/directories and safe new targets are accepted;
- a real filesystem symlink to an outside directory is blocked before traversal;
- a Windows-style junction/reparse link indication is blocked;
- non-link canonical resolution outside the vault is blocked.

`test/obsidian-local-vault.test.ts` also proves the injected guard prevents folder traversal before adapter observation/mutation proceeds.

### Investigation Performed — iOS/Mobile

The current public Obsidian `DataAdapter.stat()`/`Stat` contract exposes ordinary `file`/`folder` metadata, not `lstat`, `readlink`, symlink/junction/alias metadata, or canonical resolved paths.

Generic iOS sandboxing cannot establish the required invariant. Obsidian's current official help explicitly documents that symlinks and junctions can be placed in a vault specifically to store files outside the vault. Community reports also document symbolic links working on iPhone/iPad. Therefore Condition 2 (outside traversal is architecturally impossible) cannot be claimed.

No supported stock-Obsidian-mobile plugin capability was found that supplies `lstat`/`readlink`/`realpath`-equivalent evidence sufficient for Condition 1. The current Capacitor 5 Filesystem `stat` surface likewise reports only file/directory metadata.

### Blocker Status

- **Windows/Desktop: RESOLVED** behind an isolated desktop-specific guard.
- **iOS/Mobile: REMAINS — DEMONSTRATED STOCK-iOS PLATFORM LIMITATION.**

The smallest platform/product decision required is one of:

1. require Obsidian Mobile to expose a supported link-aware/canonical-path primitive (`lstat`/`readlink`/`realpath` equivalent) that allows the plugin to prove a vault object does not resolve outside the synchronization boundary; or
2. change the supported iOS product environment so that the absence of externally resolving vault references is an enforceable and independently verifiable precondition before synchronization can run.

Without one of those decisions/capabilities, `FILE-007` cannot truthfully be proved on current stock iOS.

## Recovery Verification

Authoritative GitHub Actions run `32722967354`, job `97418107585`, checked out PR #4 merge/test SHA `f7e3eb828722686327b251d6c606e391f37d0a9b` and executed the complete repository gate.

- `npm ci` — **PASS**; 14 packages added, 15 audited, 0 vulnerabilities.
- `npm run typecheck` — **PASS**; `tsc --noEmit` completed successfully.
- `npm test` — **PASS**; 50 tests executed, 50 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.
- `npm run build` — **PASS**; `tsc -p tsconfig.build.json && node scripts/finalize-build.mjs` completed successfully.

An earlier recovery CI run `32722833715` correctly failed typecheck on three new test-fixture `Response` body typings. Those test-only typing defects were repaired before the successful authoritative run above.

## Actual Git-Derived Change Inventory

The inventories below come from GitHub commit comparison, not recollection.

### Recovery-Only Compare

Comparison: `6250d59832939859037578e0cea8bb4d9d329965...39e8ade1961d3d1a8c12183a3f812c2e71ec81b9`

Created:

- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`
- `test/desktop-external-reference-guard.test.ts`

Modified:

- `src/local/obsidian-local-vault.ts`
- `test/mobile-safety.test.ts`
- `test/obsidian-local-vault.test.ts`

Deleted:

- none

This evidence file is additionally modified by the current evidence commit.

### Complete Phase 4 Compare Against Supervisor Baseline

Comparison: `e16719196269b4b31f8f1a4997722cdd1c916058...39e8ade1961d3d1a8c12183a3f812c2e71ec81b9`

Created:

- `dev/evidence/_ca-output-CA-P4.md`
- `src/local/config-policy.ts`
- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`
- `src/local/exclusions.ts`
- `src/local/obsidian-local-vault.ts`
- `src/local/path-policy.ts`
- `test/desktop-external-reference-guard.test.ts`
- `test/local-failure-semantics.test.ts`
- `test/local-policy.test.ts`
- `test/obsidian-local-vault.test.ts`

Modified:

- `dev/evidence/_ca-output.md`
- `test/mobile-safety.test.ts`

Deleted:

- none

No `src/contracts/**` file changed.

## Source / Runtime Evidence References

- Obsidian Help, Credits — current host credits list Capacitor `5.x`: `https://obsidian.md/help/credits`
- Capacitor iOS `WebViewAssetHandler.swift`, `5.7.8` — range handling restricted to media extensions: `https://github.com/ionic-team/capacitor/blob/5.7.8/ios/Capacitor/Capacitor/WebViewAssetHandler.swift`
- Capacitor iOS `WebViewAssetHandler.swift`, `6.2.1` — general Range handling via `FileHandle`: `https://github.com/ionic-team/capacitor/blob/6.2.1/ios/Capacitor/Capacitor/WebViewAssetHandler.swift`
- Capacitor 5 Filesystem API — no chunk/offset read primitive: `https://capacitorjs.com/docs/v5/apis/filesystem` (also mirrored in the archived v5 documentation)
- Current Capacitor Filesystem docs — `readFileInChunks` since `7.1.0`; offset/length since `8.1.0`: `https://github.com/ionic-team/capacitor-filesystem`
- Obsidian Help, Symbolic links and junctions — explicitly permits vault symlinks/junctions whose targets are outside the vault: `https://obsidian.md/help/symlinks`
- Obsidian forum mobile report — symbolic links working on iPhone/iPad: `https://forum.obsidian.md/t/integrating-microsoft-office-documents/32055/2`

## Scope / Architecture Integrity

- Frozen contracts unchanged.
- Phase 2 synchronization policy not implemented.
- Phase 3 Drive/OAuth behavior not implemented.
- Phase 5 orchestration/UI not implemented.
- No external BRAIN asset repository behavior introduced.
- Desktop Node imports are isolated from mobile-required modules and guarded by automated architecture tests.
- The plugin now fails closed where current mobile host capabilities cannot establish a mandatory safety guarantee; no whole-file async-wrapper workaround or silent compliance claim is used.

## Final Worker Status

`BLOCKED — PROVEN PLATFORM LIMITATION`

The recovery resolved desktop external-reference detection and hardened local reads so they are objectively bounded whenever the host supplies correct byte-range semantics. The mandatory iOS guarantees remain unsatisfied because current stock Obsidian Mobile documents a Capacitor 5.x host that lacks arbitrary-extension resource ranges and public chunk/offset reads, while the same public mobile boundary also lacks link-aware/canonical-path metadata even though Obsidian permits vault symlinks to external content.

Independent supervisory acceptance is not claimed.
