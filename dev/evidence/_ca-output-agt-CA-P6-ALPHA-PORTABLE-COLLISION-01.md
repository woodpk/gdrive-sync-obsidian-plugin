# Coding-Agent Evidence — Phase 6 Alpha Portable-Config Collision Correction

## Evidence purpose

This file is the mandatory build-agent-specific evidence record for `agt-CA-P6-ALPHA-PORTABLE-COLLISION-01`. It is being added solely to satisfy the governing build-review evidence requirements. This evidence-only addition does not change production behavior, test behavior, build behavior, dependency state, workflow behavior, synchronization semantics, or the previously verified implementation.

## Identity and branch state

- agent ID: `agt-CA-P6-ALPHA-PORTABLE-COLLISION-01`
- starting repair SHA: `69e2a0053bae695655784ddedb8ae8e7c460734b`
- repair branch: `phase6-alpha-windows-bounded-read-fix`
- tested implementation SHA: `b9207fb6a7836f462386c14bfbb4018fafca9218`
- authoritative integration branch during the correction: `phase6-integration`
- Stage 2A controlled correction; Stage 3 not begun

## Confirmed defect and root cause

After the Windows bounded local-file reader repair removed the original mass HTTP-range blockers, the supported-runtime preview still contained four `blocked-unsafe` portable-configuration paths under the synthetic namespace `__brain_sync_portable_config__` even though the physical BRAIN vault root did not contain that namespace.

The already-recorded root cause was in the desktop containment boundary. `ProductPathScope` correctly reserves `__brain_sync_portable_config__`, and `ScopedLocalVault.hasOrdinaryNamespaceCollision()` correctly treats every underlying observation other than confirmed `absent` as collision evidence. However, `DesktopExternalReferenceGuard.resolveSafePath()` propagated a direct-child `ENOENT`/`ENOTDIR` during `observe`. `ObsidianLocalVaultAdapter.observe()` therefore classified a provably missing reserved root as `unknown`, and the scope correctly but falsely treated that `unknown` observation as a collision.

Supervisor/user-supplied `Test-Path=False` evidence established that the physical `__brain_sync_portable_config__` root was absent in the real BRAIN vault.

## Implemented semantic correction

`DesktopExternalReferenceGuard.resolveSafePath()` was changed so that only ordinary filesystem nonexistence (`ENOENT` or `ENOTDIR`) can terminate containment successfully after the target is proven lexically inside the canonical vault root and every existing traversed ancestor has already passed `lstat` plus `realpath` containment checks. This allows the ordinary local adapter to continue to its existence check and establish truthful `status: absent`.

The correction did not weaken fail-closed behavior. Permission/access errors, I/O errors, lexical escape, symlink/junction detection, canonical resolution outside the vault, and all other uncertainty still propagate as failures. `ScopedLocalVault.hasOrdinaryNamespaceCollision()` was not changed and continues to treat every non-`absent` observation as collision evidence.

## Exact correction-session change manifest before this evidence-only repair

### Created

- `test/phase6-alpha-portable-collision.test.ts`

### Modified

- `src/local/desktop-external-reference-guard.ts`
- `dev/evidence/phase6-alpha-windows-bounded-read-output.md`
- `dev/evidence/_ca-output.md`

### Deleted

- none

No production synchronization architecture, OAuth code, portable-configuration allowlist, planner safety rule, generic HTTP-range reader, mobile boundary, frozen contract, build configuration, or dependency file was changed by the portable-collision correction.

## Verification already performed

The implementation verification remains associated with tested implementation SHA `b9207fb6a7836f462386c14bfbb4018fafca9218` and is not being re-run solely for this evidence repair.

- GitHub Actions workflow run: `33021180627`
- verification job: `98351653267`
- tested checkout SHA: `b9207fb6a7836f462386c14bfbb4018fafca9218`
- `npm ci`: **PASS** — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: **PASS**
- `npm test`: **PASS** — 264 tests, 264 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo
- focused portable-collision regressions: tests 238–244, all **PASS**
- `npm run build`: **PASS**
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- generated `main.js` size: `291248` bytes
- generated `main.js` SHA-256: `64a5f0274fce550656a45d0ad44203c58685d888a9b62eb10fc644b6ce889711`

The same full suite retained the earlier Windows bounded Node filesystem reader regressions, generic HTTP `206` acceptance, HTTP `200` whole-file-fallback rejection, mobile Node/Electron isolation, planner destructive-safety/recovery behavior, and OAuth lifecycle/security coverage.

## Supervisor/user-supplied physical evidence already recorded

The following physical evidence was supplied by the supervisor/user after installation of the earlier Windows bounded-read repair. It is recorded here as supplied evidence and is not represented as a physical action performed by this cloud CA:

- the previous `expected HTTP 206, received HTTP 200` blocker count fell from `263` to `0`;
- the first-sync preview became `271 upload-create` and `4 blocked-unsafe` out of `275` total operations;
- the physical BRAIN vault root check for `__brain_sync_portable_config__` returned `False`;
- the first-sync preview was not executed;
- physical installation of the final post-collision-fix artifact and the corresponding preview-only retest remain pending supervisor/user.

## Cloud-agent limitations and safety boundary

- this cloud CA did not access the real BRAIN vault or `.obsidian` directory;
- this cloud CA did not access OAuth secrets, tokens, authorization codes, PKCE material, SecretStorage contents, or vault-note bodies;
- no first synchronization was executed or authorized by this correction session;
- no upload, download, trash, move, rename, or other synchronization mutation was performed by this evidence repair;
- stock-iOS bounded local reading is not claimed solved by this Windows correction;
- Stage 3 has not begun.

## Evidence-only repair manifest

This file itself is created during a later evidence-only repair because the independent review gate requires both the canonical evidence ledger and an agent-specific build-output record. The evidence-only repair is restricted to:

### Created

- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-PORTABLE-COLLISION-01.md`

### Modified

- `dev/evidence/_ca-output.md` — append-only evidence-closure note only

### Deleted

- none

No production source, test source, build configuration, dependency file, workflow, secret, or user-vault content is modified by this evidence-only repair.

---

## Rejection correction — canonical-resolution failures remain fail-closed

### Rejected head and defect

- rejected branch head: `a1049fafef5a655dd6a32091ed2c62c3ae9cb643`
- rejected tested implementation: `b9207fb6a7836f462386c14bfbb4018fafca9218`
- rejection ID: C1 — unresolved canonical-path failures were incorrectly converted into safe absence

The rejected implementation placed both `lstat(current)` and `realpath(current)` inside one missing-path `try/catch`. As a result, `ENOENT` or `ENOTDIR` from `realpath()` after a successful `lstat()` was incorrectly accepted as evidence that the component was safely missing. That violated fail-closed canonical containment: once `lstat()` proves the component exists, `realpath()` must also succeed and resolve inside the canonical vault root.

### Exact C1/C2 source and test correction

- `src/local/desktop-external-reference-guard.ts` now catches `ENOENT`/`ENOTDIR` only around `lstat(current)`. A genuinely missing component may terminate containment as a safe absence candidate after all previously existing ancestors have passed `lstat` plus `realpath` containment.
- after `lstat(current)` succeeds, symbolic-link/junction detection and `realpath(current)` occur outside the missing-path catch. Any `realpath` failure now propagates unchanged, including `ENOENT` and `ENOTDIR`.
- outside-vault canonical resolution remains blocked by `ExternalFilesystemReferenceError`.
- `test/phase6-alpha-portable-collision.test.ts` adds a focused regression proving that an existing component whose `realpath()` fails with either `ENOENT` or `ENOTDIR` remains fail-closed.
- all previous portable-collision regressions remain present; `ScopedLocalVault.hasOrdinaryNamespaceCollision()`, the synthetic namespace, the portable allowlist, Windows bounded reader, generic HTTP-range reader, mobile isolation, and frozen/public contracts were not modified.

### Clean verification of corrected implementation

A temporary branch-scoped workflow was used without retargeting PR #19. GitHub Actions performed a clean checkout of exact SHA:

`8b7f320b0a9af86a933b200245694ee9c47ee854`

Verification identity:

- workflow: `Phase 6 Alpha Portable Collision CI`
- run ID: `33023650014`
- job ID: `98359805718`
- checkout HEAD: `8b7f320b0a9af86a933b200245694ee9c47ee854`
- runner: Ubuntu 24.04
- Node: `v22.23.2`
- npm: `10.9.8`

Commands/results:

- `npm ci`: **PASS** — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: **PASS**
- `npm test`: **PASS** — 265 tests, 265 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo
- new canonical-resolution regression: test 241, **PASS**
- portable-collision regressions: tests 238–245, all **PASS**
- `npm run build`: **PASS**
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- generated `main.js` size: `291213` bytes
- generated `main.js` SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`

The inspected full test log also confirms the existing desktop bounded-read tests remain PASS, the generic HTTP range path still accepts valid partial-content behavior and rejects whole-file `HTTP 200` fallback, mobile Node/Electron isolation remains PASS, and planner destructive-safety/recovery coverage remains PASS.

### Post-verification cleanup and boundaries

- temporary verification workflow removal commit: `e3505cedf4f4ee61639de2488bdc079eb8908d37`
- no production or test file changed after the dynamically tested implementation tree `8b7f320b0a9af86a933b200245694ee9c47ee854`; subsequent changes are workflow cleanup and evidence only
- final physical installation of the newly built artifact remains pending supervisor/user
- final preview-only Windows validation remains pending supervisor/user
- no synchronization was executed
- no OAuth secret/token or real BRAIN vault content was accessed
- Stage 3 has not begun
