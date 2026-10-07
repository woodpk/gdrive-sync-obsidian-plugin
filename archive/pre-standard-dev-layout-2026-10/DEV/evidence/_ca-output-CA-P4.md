# Stage 2A Build Session 04 / Phase 4 Evidence

## Build Identification

- Worker: `agt-CA-P2-03`
- Build/session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Assigned branch: `stage-2a-phase-4-obsidian-local`
- Pull request: `#4` — open, draft, unmerged
- Exact supervisor-approved Phase 4 baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`
- Frozen `src/contracts/**`: `UNCHANGED`

## Phase 4 Recovery State Carried Forward

The Phase 4 recovery established two stock-iOS platform limitations and one desktop-specific resolution.

### Stock-iOS bounded-memory local-read limitation

The plugin implementation uses explicit sequential HTTP byte-range requests and fails closed unless the runtime proves proper bounded partial-content semantics with HTTP `206`, exact `Content-Range`, bounded returned byte count, and no `readBinary()` whole-file fallback.

Current stock Obsidian Mobile remains a demonstrated platform limitation for arbitrary BRAIN file types because the documented Capacitor 5.x local-resource handler does not provide general arbitrary-extension byte-range semantics and the public filesystem generation lacks a supported chunk/offset read primitive. C1 does not claim this limitation is resolved.

### External-reference safety state

Desktop external-reference safety remains implemented behind the isolated `DesktopExternalReferenceGuard`, using desktop-only filesystem metadata/canonical-path checks without importing Node/Electron APIs into the mobile-neutral adapter.

Current stock iOS remains unable to prove that apparent vault objects do not traverse symlink/alias/external filesystem references because the supported mobile boundary lacks link-aware/canonical-path metadata. C1 does not claim that platform capability gap is resolved. Instead, C1 changes generic/mobile behavior to fail closed when no proving guard is available.

---

## C1 Rejection Correction — Fail-Closed External-Reference Capability

### Correction Identification

- Correction ID: `C1`
- Worker: `agt-CA-P2-03`
- Rejection/correction base SHA: `e577bf1366001de3871a868bd549630b1060f2df`
- Final implementation branch SHA verified before evidence-only updates: `4d06581fa91ba9643496a67296b5002925581ba2`
- Branch: `stage-2a-phase-4-obsidian-local`
- PR: `#4` — open, draft, unmerged
- GitHub Actions workflow run: `32731187369`
- Verification job: `97443556511`
- PR merge/test SHA observed in the verification logs: `2dc01ff9ade1f8e9c935568f626770d7bd748f6d`
- Frozen `src/contracts/**`: `UNCHANGED`

### C1 Behavior Implemented

`src/local/obsidian-local-vault.ts` now makes lack of an external-reference proof capability fail closed.

- `UnavailableExternalReferenceGuard` blocks synchronization path access with `LocalPlatformCapabilityError("external-reference-detection", ...)` when no platform-specific proving guard is supplied.
- The adapter's stored `externalReferenceGuard` is required rather than optional.
- Constructor fallback installs the blocking guard rather than silently omitting the containment check.
- Production observation and mutation source/target paths invoke the guard mandatorily; optional chaining is not used for those checks.
- Generic/mobile adapter access without a proving guard is therefore blocked instead of reaching `DataAdapter.exists`, `stat`, read, rename, trash, or mutation operations as a valid contained path.
- Existing desktop construction continues to inject `DesktopExternalReferenceGuard`, so ordinary contained desktop paths remain available.
- When a listed folder cannot be safely observed/traversed, enumeration records the inability and returns `LocalVaultListing.completeness.status === "partial"` rather than falsely claiming complete subtree coverage.
- No production unsafe override, bypass flag, user-disable switch, syntactic-path substitute, or mobile Node import was added.

### Directly Necessary Test Fallout

Existing fake-runtime tests that intentionally represent a filesystem known to contain no external references explicitly inject a permissive **test-only** `ExternalReferenceGuard`. This is test-fixture declaration, not a production bypass.

The C1-targeted tests executed and passed:

1. `generic adapter without an external-reference guard fails closed before ordinary path observation`;
2. `generic adapter without an external-reference guard blocks create replace move and trash`;
3. `blocked folder subtree makes enumeration partial rather than falsely complete`.

The same CI run also executed and passed the existing desktop external-reference tests and mobile import-isolation tests.

### Verification Actually Performed

GitHub Actions run `32731187369`, job `97443556511`, executed the repository gate against PR #4.

- `npm ci` — **PASS**; 14 packages added, 15 audited, 0 vulnerabilities.
- `npm run typecheck` — **PASS**; `tsc --noEmit` completed successfully.
- `npm test` — **PASS**.
- Tests: **52 passed / 0 failed / 0 skipped / 0 cancelled / 0 todo**.
- `npm run build` — **PASS**; `tsc -p tsconfig.build.json && node scripts/finalize-build.mjs` completed successfully.

The workflow logs explicitly show:

- desktop external-reference tests as tests 13–16;
- mobile-import isolation tests as tests 33–35;
- C1 fail-closed tests as tests 48–50.

### Git-Derived C1 Implementation Inventory

GitHub compare:

`e577bf1366001de3871a868bd549630b1060f2df...4d06581fa91ba9643496a67296b5002925581ba2`

**Created**

None.

**Modified**

- `src/local/obsidian-local-vault.ts`
- `test/local-failure-semantics.test.ts`
- `test/obsidian-local-vault.test.ts`

**Deleted**

None.

### Complete C1 Correction-Pass Change Manifest Including Evidence

The evidence-only commits after implementation SHA `4d06581fa91ba9643496a67296b5002925581ba2` modify only the two required evidence files. Therefore the complete C1 correction-pass file inventory is:

**Created**

None.

**Modified**

- `src/local/obsidian-local-vault.ts`
- `test/local-failure-semantics.test.ts`
- `test/obsidian-local-vault.test.ts`
- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P4.md`

**Deleted**

None.

No file under `src/contracts/**` changed during C1.

### Remaining Stock-iOS Platform Limitations

C1 does **not** characterize either remaining stock-iOS limitation as resolved:

1. strict bounded-memory arbitrary-file local reads remain unavailable/proven-unsatisfied on the current stock Obsidian Mobile host for non-media extensions because the documented Capacitor 5.x local-resource handler does not provide general byte-range semantics and its public filesystem generation lacks supported chunk/offset reads;
2. supported mobile proof against symlink/alias/external-reference traversal remains unavailable because the public mobile boundary lacks link-aware/canonical-path metadata even though Obsidian permits externally resolving symlinks/junctions.

C1 makes the second limitation safe at the implementation boundary by blocking unverified path access rather than proceeding without proof.

## Final Worker Status for This Correction

`C1 EVIDENCE CORRECTION COMPLETED — IMPLEMENTATION ALREADY VERIFIED`

This evidence records the already-observed executable verification run `32731187369` / job `97443556511` against implementation SHA `4d06581fa91ba9643496a67296b5002925581ba2`. An evidence-only commit necessarily changes the branch head after that implementation SHA; the final pushed evidence-bearing branch SHA is verified after commit and reported in the completion response rather than creating a self-referential evidence loop.

Independent supervisory approval is not claimed.
