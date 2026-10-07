# Coding-Agent Evidence — Phase 6 Alpha Windows Repair Integration

## Identity

- agent ID: `agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01`
- repository: `woodpk/gdrive-sync-obsidian-plugin`
- integration branch: `phase6-integration`
- approved repair branch: `phase6-alpha-windows-bounded-read-fix`
- pre-integration integration SHA: `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`
- approved repair SHA: `bcdcf935de0fb49b518d90d7f886b932175f0015`
- dynamically tested repair implementation/test SHA: `8b7f320b0a9af86a933b200245694ee9c47ee854`
- post-fast-forward integration SHA before evidence-only commits: `bcdcf935de0fb49b518d90d7f886b932175f0015`
- construction state: Stage 2A Phase 6 Alpha integration; Stage 3 not begun

## Topology proof and integration method

Pre-integration remote verification established:

- `phase6-alpha-windows-bounded-read-fix` = `bcdcf935de0fb49b518d90d7f886b932175f0015`
- `phase6-integration` = `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`
- `master` = `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- PR #19 was open, draft, unmerged, head `phase6-alpha-windows-bounded-read-fix`, base `phase6-integration`
- PR #15 was open, draft, unmerged, head `phase6-integration`, base `master`

The compare from integration base to approved repair returned `ahead`, 14 commits ahead, 0 behind, with merge base exactly `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`. This proved the approved repair was a direct fast-forward descendant.

Integration used a non-forced fast-forward ref update only. No merge commit, rebase, cherry-pick, squash, conflict resolution, force-push, or history rewrite was used. Immediately after the fast-forward, `phase6-integration` resolved exactly to `bcdcf935de0fb49b518d90d7f886b932175f0015`.

## Approved repair summary

The approved branch contains the related Windows Phase 6 Alpha corrections already independently reviewed and approved:

1. Windows desktop local-file reading uses a desktop-only bounded Node filesystem reader behind the isolated desktop composition boundary, retaining fixed-position bounded reads, canonical SHA-256, stale-file detection, path containment, no whole-file fallback, and mobile isolation.
2. The synthetic portable-configuration namespace `__brain_sync_portable_config__` no longer falsely collides when its physical ordinary-vault root is genuinely absent.
3. Final fail-closed containment semantics distinguish `lstat` from `realpath`: `lstat` `ENOENT`/`ENOTDIR` may prove a genuinely missing component after prior existing ancestors passed containment, but once `lstat` succeeds, `realpath` is mandatory and every `realpath` failure propagates, including `ENOENT` and `ENOTDIR`.
4. Symlink/junction/reparse escape, lexical escape, permission/access uncertainty, canonical resolution outside the vault, and actual/uncertain reserved-namespace occupancy remain blocked.
5. `ScopedLocalVault.hasOrdinaryNamespaceCollision()` remains unchanged and treats every non-`absent` observation as collision evidence.
6. The generic HTTP range reader and mobile-required runtime isolation remain unchanged.

## Prior clean automated verification of approved repair

Exact dynamically tested implementation/test tree:

`8b7f320b0a9af86a933b200245694ee9c47ee854`

- workflow: `Phase 6 Alpha Portable Collision CI`
- run: `33023650014`
- job: `98359805718`
- clean checkout: `8b7f320b0a9af86a933b200245694ee9c47ee854`
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: PASS
- `npm test`: PASS — 265 tests / 265 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo
- `npm run build`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `main.js` size: `291213` bytes
- `main.js` SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`

Subsequent commits through approved repair head `bcdcf935de0fb49b518d90d7f886b932175f0015` were workflow cleanup and evidence finalization only; no production or test file changed after the dynamically tested tree.

## Supervisor/user-supplied physical supported-runtime evidence

The following is recorded as **supervisor/user-supplied physical supported-runtime evidence**. This cloud integration agent did not perform these Windows actions.

### Local reproduction of approved artifact

On local branch `phase6-alpha-windows-bounded-read-fix`, the user confirmed checkout head `bcdcf935de0fb49b518d90d7f886b932175f0015` and successfully ran:

- `npm ci`
- `npm run build`

Local build verifier:

- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`

Locally reproduced `main.js`:

- size: `291213` bytes
- SHA-256: `EC8F4A572EB14ADDDAADB0D0656CED5A3761E373FC6A0A1C78F383D6CF667391`

This exactly reproduced the approved CI artifact identity.

### Installed artifact and plugin load

The user copied that exact `main.js` to the real Windows BRAIN plugin directory. Installed verification remained:

- size: `291213` bytes
- SHA-256: `EC8F4A572EB14ADDDAADB0D0656CED5A3761E373FC6A0A1C78F383D6CF667391`

After reopening Obsidian, BRAIN Google Drive Sync loaded successfully and reported:

`idle-ready`

### Real first-sync preview

The user invoked `BRAIN Google Drive Sync: Sync now`. The preview completed successfully with:

- total planned operations: `275`
- disposition: `safe-auto-eligible`
- `upload-create`: `274`
- `noop`: `1`
- `blocked-unsafe`: `0`
- conflicts: `0`
- deletion operations: `0`
- trash operations: `0`
- no destructive operation category

The single no-op was:

`__brain_sync_portable_config__/hotkeys.json`

Reason:

`Neither side currently contains the never-established path.`

This is correct non-mutating behavior for an allowlisted portable item absent on both sides.

The physical preview demonstrates that the original 263 Windows bounded-read blockers remain eliminated and the later four false portable-config blockers are also eliminated. The resulting first-sync plan is a non-destructive safe union.

The user closed the preview with the X and did **not** click Execute. No first synchronization occurred. Automatic synchronization remains disabled pending successful reviewed first synchronization.

**PHYSICAL WINDOWS REPAIR ACCEPTANCE: PASS**

This PASS applies to the repair installation/load/preview acceptance only. First synchronization execution is not recorded as PASS because it has not occurred.

## Fresh combined integration verification

After `phase6-integration` was fast-forwarded to `bcdcf935de0fb49b518d90d7f886b932175f0015`, existing Phase 6 PR #15 against `master` generated a fresh clean combined gate.

- workflow: `Phase 1 CI`
- run ID: `33031435312`
- job ID: `98384624285`
- job conclusion: SUCCESS
- PR head contained: `phase6-integration` @ `bcdcf935de0fb49b518d90d7f886b932175f0015`
- unchanged master base: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- exact generated PR merge SHA checked out: `44ebd6add7fe80f2233bffa2861e7f7d9be73043`
- checkout log: `Merge bcdcf935de0fb49b518d90d7f886b932175f0015 into 54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- Node: `v22.23.2`
- npm: `10.9.8`
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: PASS
- `npm test`: PASS — 265 tests / 265 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo
- portable-collision tests 238–245: PASS, including canonical-resolution fail-closed test 241
- existing Windows bounded-reader coverage: PASS
- generic HTTP whole-file `200` fallback remains fail-closed: PASS
- mobile Node/Electron isolation: PASS
- planner destructive-safety/recovery coverage: PASS
- `npm run build`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- integrated `main.js` size: `291213` bytes
- integrated `main.js` SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`

The fresh combined integration build reproduced the approved artifact identity exactly; no unexplained artifact drift occurred.

## Safety and scope boundary

- this cloud integration agent did not access OAuth secret values, access/refresh tokens, authorization codes, PKCE values, SecretStorage contents, or vault-note bodies;
- this cloud integration agent did not access or operate the user's physical BRAIN vault;
- no synchronization was executed by this integration session;
- no first-sync Execute action was authorized or performed;
- first synchronization remains outstanding;
- physical iPhone/iOS validation remains outstanding;
- the accepted stock-iOS bounded-read and external-reference-containment limitations remain unresolved and are not represented as PASS;
- PR #15 remains required to stay open and unmerged;
- `master` must remain unchanged;
- Stage 3 has not begun.

---

## Evidence provenance correction — C1/C3 closure

This append-only correction supersedes only the earlier incomplete integration-session change-manifest and resulting branch/PR-state characterization. It does not alter the approved implementation, physical Windows acceptance, or automated verification above.

### Rejected-review starting state

Direct repository inspection before this correction verified:

- `phase6-integration` = `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90`;
- `master` = `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`.

The approved repair head `bcdcf935de0fb49b518d90d7f886b932175f0015` is the merge base and direct ancestor of that rejected-review integration head. GitHub compare reports exactly six commits ahead and zero behind.

### Complete committed integration-session history after the approved repair head

The actual post-fast-forward committed history from `bcdcf935de0fb49b518d90d7f886b932175f0015` through rejected-review head `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90` is:

1. `fb6e4f1d0d8a2932ae8c671e8891aeacf641212b` — `docs: add Windows repair integration evidence`
   - created `dev/evidence/_ca-output-agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01.md`.
2. `9668bead31e8cac300528319abf2322da6f2ab36` — `ci: finalize Windows repair integration evidence`
   - created the initial temporary revision of `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.
3. `14b2fb1b7134364976b806eb7a156e9241a3e524` — `ci: remove invalid Windows integration evidence finalizer`
   - deleted that initial temporary workflow revision.
4. `3da2b67345a26d76e1c3ce8b476ef208db66b807` — `ci: stage Windows integration evidence finalizer`
   - created `.github/phase6-alpha-windows-evidence-finalize.sh`.
5. `8f85afa7aef5eb4befee671fe5f23ff7f12d8455` — `ci: run Windows integration evidence finalizer`
   - created a subsequent temporary revision of `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.
6. `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90` — `docs: record approved Windows first-sync repair integration`
   - modified `dev/evidence/_ca-output.md`;
   - modified `dev/evidence/phase6-integration-manifest.md`;
   - deleted `.github/phase6-alpha-windows-evidence-finalize.sh`;
   - deleted `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.

The temporary workflow/script changes above were actual committed repository changes during the integration/evidence-finalization session and therefore belong in the historical change manifest even though they do not survive in the final rejected tree.

### Final net repository change from approved repair head through rejected-review head

For compare `bcdcf935de0fb49b518d90d7f886b932175f0015...cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90`, GitHub reports only these persistent net changes:

**Created**

- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01.md`.

**Modified**

- `dev/evidence/_ca-output.md`;
- `dev/evidence/phase6-integration-manifest.md`.

**Deleted in final net tree**

- none.

### Session-transient created/deleted paths

The complete historical manifest additionally includes these paths, both of which were created and later deleted within the six-commit session:

- `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`;
- `.github/phase6-alpha-windows-evidence-finalize.sh`.

Direct final-tree lookup at the rejected-review head returned `404 Not Found` for both paths, confirming both are absent from that tree.

### Resulting GitHub state at rejected review

Direct GitHub inspection established:

- `phase6-integration`: `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90`;
- `master`: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- PR #15: open, draft, unmerged; head = `phase6-integration`; base = `master`;
- PR #19: closed; GitHub `merged = true`; head SHA = `bcdcf935de0fb49b518d90d7f886b932175f0015`; `merge_commit_sha = bcdcf935de0fb49b518d90d7f886b932175f0015`.

Repository ancestry shows the approved repair head itself became contained in `phase6-integration`; no separate production merge commit was introduced for PR #19. PR #19 was not reopened, reclosed, retargeted, or otherwise modified merely to change its displayed state.

### Preserved verification boundary

No production/test rerun is required for this evidence-only correction. The preserved combined gate remains run `33031435312`, job `98384624285`, with 265/265 tests PASS, typecheck PASS, build PASS, all five build-verifier checks PASS, `main.js` size `291213` bytes, and SHA-256 `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`.

No production source, test source, package/dependency file, build configuration, or persistent workflow file is authorized to change in this correction. No synchronization is executed, and Stage 3 remains not begun.
