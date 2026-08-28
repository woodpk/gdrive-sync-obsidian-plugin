# Phase 6 Alpha — Windows Bounded Local-File Reading Repair

## Identity and starting state

- agent: `codex-P6-ALPHA-WINDOWS-BOUNDED-READ-01`
- required integration branch: `phase6-integration`
- exact verified starting integration SHA: `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`
- repair branch: `phase6-alpha-windows-bounded-read-fix`
- starting working tree: clean
- construction stage: Stage 2A controlled correction; Stage 3 not begun

## Mandatory authority ingestion proof — recorded before implementation

The following current repository authorities were read completely before implementation inspection or code editing:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. `dev/planning-and-building/phase-6-supervisor-handoff.md`
5. `dev/planning-and-building/project-state.yaml`
6. `dev/evidence/_ca-output.md`
7. `dev/evidence/phase6-integration-manifest.md`
8. `dev/evidence/phase6-alpha-oauth-live-integration.md`

Manual verification:

- blob: `02adedab577f397d98fb9666166270358a581761`
- title: `Agent-Led Software Product Construction Manual`
- first sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`
- last sentence: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`
- headings: H1 `1`; H2 `11`; H3 `67`; H4 `43`; H5+ `0`; total `122`
- H2 sequence: Purpose; Operating Principles; Navigation and Entry; Stage 0 — Product Discovery and Requirements Elicitation; Stage 1 — Target-System Specification and Minimum Sound Build Decomposition; Stage 2A — Controlled Session-Based Construction; Stage 2B — Autonomous Product Construction; Stage 3 — Independent Product and System Validation; Cross-Stage Handoff Rules; Re-Entry and Recovery; Recommended Default Workflow
- embedded prompt headings present: Stage 0 Agent Prompt; Stage 1 Agent Prompt; Stage 2A Build-Prompt Expansion Template; Autonomous Build Prompt; Stage 3 Validation Prompt

The controlling re-entry conclusion is to resume the active Phase 6 Stage 2A supported-runtime correction from current repository state, preserve all frozen safety/mobile/OAuth contracts, and not restart discovery, redesign the product, or begin Stage 3.

## Implementation and verification record

### Physically reproduced defect and causal trace

The controlling live reproduction was a preview-only first-sync plan of `275` operations: `263 blocked-unsafe` and `12 upload-create`. Ordinary files failed canonical evidence with the sanitized reason `expected HTTP 206, received HTTP 200; whole-file fallback prohibited`. Repository inspection confirmed this causal chain:

1. desktop runtime correctly selected `createDesktopLocalVaultAdapter` behind `Platform.isDesktopApp`;
2. that composition injected only `DesktopExternalReferenceGuard`;
3. `ObsidianLocalVaultAdapter.readFile` therefore still constructed `ResourceFetchContentSource`;
4. real Windows Obsidian returned HTTP 200 for the resource URL despite the Range request;
5. the generic reader correctly failed closed;
6. `CanonicalEvidenceLocalVault` correctly converted the hash failure to unknown evidence;
7. the planner correctly produced `blocked-unsafe` rather than trusting missing evidence.

The repair changes the desktop content-reading composition, not the generic reader, canonical-evidence rule, or planner.

### Files inspected

- `src/local/obsidian-local-vault.ts`
- `src/local/desktop-local-vault.ts`
- `src/local/desktop-external-reference-guard.ts`
- `src/product/canonical-local-vault.ts`
- `src/product/runtime.ts`
- `src/util/sha256.ts`
- `src/contracts/common.ts`
- `src/contracts/local-vault.ts`
- `test/obsidian-local-vault.test.ts`
- `test/desktop-external-reference-guard.test.ts`
- `test/mobile-safety.test.ts`
- `test/local-failure-semantics.test.ts`
- package/build/test configuration and the eight mandatory authorities listed above

### Files changed and why

- `src/local/obsidian-local-vault.ts` — added a private content-source factory seam. Its default remains the existing validated HTTP-206 `ResourceFetchContentSource`; no frozen public contract changed.
- `src/local/desktop-local-vault.ts` — added the desktop-only Node file-handle reader and injected it into desktop composition. It uses explicit-position bounded reads, trustworthy expected size, premature-EOF checks, before/between/after observation-token checks, open-handle identity/size/time checks, and `finally`-based closure.
- `src/local/desktop-external-reference-guard.ts` — exposed the already-checked lexical target from the same guard so the reader does not introduce a second unchecked resolver.
- `test/desktop-bounded-local-read.test.ts` — created focused regression coverage for exact bounded multi-chunk bytes, partial OS reads, final partial chunk, zero bytes, premature EOF, filesystem failure, stale token, open-handle mutation, early termination, handle closure, canonical SHA-256, unsafe failure classification, and zero use of resource URL/fetch under desktop composition.
- `test/mobile-safety.test.ts` — retained and strengthened the architecture boundary by recognizing Node subpath imports and enumerating exactly the two permitted desktop-only source files.
- `dev/evidence/phase6-alpha-windows-bounded-read-output.md` — created this detailed correction record.
- `dev/evidence/_ca-output.md` — append-only canonical evidence update pending final live result.
- deleted: none.

### Corrected desktop/mobile architecture

`Phase5ProductRuntime` still uses only its existing `Platform.isDesktopApp`-guarded dynamic import. Desktop constructs one `DesktopExternalReferenceGuard` and supplies both that guard and `DesktopBoundedContentSourceFactory` to the mobile-neutral adapter. The desktop source opens a read-only Node file handle only after containment validation, reads no more than the configured chunk bound at explicit offsets, and supplies exact chunks through the frozen `BinaryContentSource` contract. The generic/mobile-neutral adapter statically imports no desktop module and, absent injection, still requires validated HTTP 206 partial content and rejects HTTP 200 without whole-file fallback. Stock-iOS bounded reading is not claimed solved.

Stale protection is equivalent or stronger: the source checks the same opaque observation token before opening, before each chunk, and after the final handle check; it also compares file-handle type, size, `mtimeMs`, `ctimeMs`, device, and inode before and after consumption. `CanonicalEvidenceLocalVault` remains unchanged and re-observes after hashing. Timestamps remain stale predicates/advisory metadata only, never winner or authority evidence.

Containment remains enforced by the existing lexical, component `lstat`, symlink/junction, and canonical `realpath` checks. The reader obtains its physical target from that same guard, re-checks after open before reading, and checks again before accepting completion.

### Automated verification

Clean dependency command actually executed with installed Node on PATH:

`$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' ci`

Result: **PASS** — 16 packages added, 17 audited, 0 vulnerabilities.

Final commands:

- `$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' run typecheck` — **PASS**.
- `$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' test` — **PASS**: 257 tests, 257 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo.
- `$env:Path='C:\Program Files\nodejs;' + $env:Path; & 'C:\Program Files\nodejs\npm.cmd' run build` — **PASS**.

Build verifier:

- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `BUILD_ARTIFACT_SIZE=291294`
- `BUILD_ARTIFACT_SHA256=0ef0b40012dc0a1da3a922b3b8b7e1c0812298a2f1b3fd81e0bce68d9d207241`

### Repository/build evidence boundary

The original bounded-read coding agent established repository/build evidence through the verified repair branch and automated suite described above. The cloud coding environment did **not** itself have authority to claim that it installed the artifact into the user's physical BRAIN vault, inspected the user's live `data.json`, inspected Obsidian SecretStorage, or directly operated the user's Windows Obsidian application. Any earlier wording in this document that implied those physical steps had already been performed by the coding agent is superseded by this correction. Git history preserves the earlier wording; history has not been rewritten.

### Supervisor/user physical evidence supplied after repository build

Source: **supervisor/user supplied supported-runtime evidence**, produced after the bounded-read build was installed on the real Windows Obsidian system. It is recorded here as supplied evidence, not as a physical action performed by the cloud coding agent.

- the repaired plugin loaded successfully and reached `idle-ready`;
- the user invoked `BRAIN Google Drive Sync: Sync now`;
- planning completed and the preview opened;
- preview totals were `275` total operations, `271 upload-create`, and `4 blocked-unsafe`;
- the prior `expected HTTP 206, received HTTP 200` bounded-read blocker count was **0**;
- the remaining four blockers were `__brain_sync_portable_config__/app.json`, `__brain_sync_portable_config__/appearance.json`, `__brain_sync_portable_config__/core-plugins.json`, and `__brain_sync_portable_config__/hotkeys.json`;
- the supervisor/user checked the real BRAIN vault root for `__brain_sync_portable_config__` and `Test-Path` returned `False`;
- the first-sync preview was **not executed** and the first synchronization did not occur.

This supplied physical evidence proves that the Windows bounded-read repair removed the original mass HTTP-range blocking defect and separately exposed a false reserved portable-configuration collision. It does **not** authorize a claim by this cloud agent that it personally verified the installed artifact hash, `data.json`, SecretStorage, or the user's local filesystem.

### Physical validation status after the portable-collision source correction

A **new** artifact is produced by the portable-collision correction. Physical installation of that new artifact and a new preview-only first-sync check remain pending supervisor/user review and execution. No live result for the new artifact is claimed here.

### Safety confirmations

- first synchronization has not been executed;
- no upload, download, trash, move, or other synchronization mutation has been authorized;
- no user vault content has been copied into evidence;
- no OAuth secret, token, authorization code, or other credential was read or exposed;
- automatic synchronization remains disabled;
- stock-iOS bounded local reading has **not** been claimed solved;
- Stage 3 has not begun.
