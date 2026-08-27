# Phase 6 Supervisor Integration Manifest

Status: automated integration gate complete; required supported-runtime/live validation remains outstanding; Stage 3 not performed.

## Frozen reviewed inputs

- Agent A: `phase6-a-platform-scale` @ `88a60f538a3de6d66b2240473da25e1d25431009`.
- Agent B: `phase6-b-state-recovery` @ `1b0e1b09ccc770f9eb9d3a35e0a61dc944578595`.
- Agent C: `phase6-c-drive-security` @ `42116bf1eb14ad1bb4d9456cd06432a97c7d2328`; dynamically tested corrected code/test head `959f9c1c405c70975328d4c732b407b211b0b5ac`, followed only by C repair evidence.
- Integration baseline: `master` @ `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`.
- Integrated code/test/evidence tree tested by the supervisor: `926147bea7adc567168154c00a1250f787980430`.

## Evidence preservation and reconciliation

The three workers intentionally used branch-local copies of `dev/evidence/_ca-output.md`. To prevent one branch's append from overwriting another during integration, the exact reviewed branch evidence snapshots are preserved as:

- `dev/evidence/phase6-agent-a-branch-output.md`
- `dev/evidence/phase6-agent-b-branch-output.md`
- `dev/evidence/phase6-agent-c-branch-output.md`

The pre-Phase-6 cumulative `dev/evidence/_ca-output.md` remains intact. The integration commit also retains the three reviewed branch heads as Git parents, so the original branch-local `_ca-output.md` histories remain reachable. This manifest is the supervisor-level reconciliation index for the three independent Phase 6 evidence streams; no worker evidence was overwritten or silently discarded.

## Combined automated integration gate

Draft PR: `#15` — `phase6-integration` -> `master`.

GitHub Actions:

- workflow: `Phase 1 CI`;
- run ID: `32887406318`;
- job ID: `97930979816`;
- integration head tested: `926147bea7adc567168154c00a1250f787980430`;
- exact PR merge SHA checked out by Actions: `6721bec00f4da268c971a714325e96c0ac13b9c2`;
- `npm ci`: **PASS** — 14 packages added, 15 audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 233 tests / 233 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**;
- workflow/job conclusion: **SUCCESS**.

The 233-test integrated suite includes the approved A, B, and corrected C Phase 6 tests together in one clean checkout. In particular, the corrected OAuth regression proving that exact reauthorization cannot carry forward a broader-scope refresh token passed in the integrated run.

## Phase 6 acceptance status

The automated/in-repository portion of Phase 6 is supervisor-verified and has no known Critical or Major construction-scope defect from the reviewed A/B/C work.

Phase 6 is **NOT YET COMPLETE** because the governing Phase 6 acceptance criteria explicitly require supported-runtime/live evidence that CI and fakes cannot substitute for. The following remain unexecuted and are not represented as passes:

- real Windows Obsidian synchronization;
- real iPhone/iOS Obsidian synchronization;
- real-user Google OAuth on supported devices;
- deployed Azure Static Web Apps callback behavior;
- live Google Drive synchronization/domain behavior;
- physical network interruption / ambiguous remote mutation;
- physical disk-full behavior;
- representative physical large-vault / large-file constrained-resource testing, including iOS behavior;
- live Drive rate/quota behavior where safely reproducible.

The two established stock-iOS fail-closed limitations remain unchanged: bounded arbitrary-file byte-range local reading and equivalent symlink/alias/external-reference containment are not proven for every required stock-iOS case, and unsafe fallback remains prohibited.

## Stop boundary

Stage 3 has not been performed and is not authorized from this evidence alone. The next Phase 6 action is supported-runtime/live validation against the integrated codebase. Phase 6 may receive final supervisor closure only after the required runtime evidence is recorded and any defects discovered there are repaired and reverified.

---

## Alpha Bug #3 — Supported-Runtime Discovery and Approved Repair Integration

Alpha Bug #3 was discovered during supported-runtime alpha debugging: repeated Google Authenticate attempts in real Windows Obsidian exposed incorrect lifecycle ownership of the `brain-gdrive-oauth` protocol handler. The separately reviewed repair moved protocol registration to plugin lifetime and dynamically delegates callbacks to the current runtime/OAuth session.

### Approved repair integrated

- repair agent: `agt-CA-P6-ALPHA-OAUTH-LIFECYCLE-01`;
- approved repair branch: `phase6-alpha-oauth-lifecycle-fix`;
- approved repair head: `ca245e2198f1b8311b3edc3e419379c8c982ede6`;
- production/test implementation head within that history: `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951`;
- pre-integration `phase6-integration` head: `717c35b5fcd7a97bec110ac18f02cec3f821590c`;
- integration method: fast-forward only;
- dynamically tested integration head before the subsequent evidence-only commit: `ca245e2198f1b8311b3edc3e419379c8c982ede6`.

The complete approved repair history is now contained in `phase6-integration`. No production or test change was introduced by the integration operation itself beyond the already approved repair history.

### Fresh combined automated integration verification

PR `#15` generated a fresh combined integration gate after the fast-forward:

- workflow: `Phase 1 CI`;
- run ID: `32929111162`;
- job ID: `98057781846`;
- PR head metadata: `phase6-integration` @ `ca245e2198f1b8311b3edc3e419379c8c982ede6`;
- exact generated PR merge SHA checked out by Actions: `2433141fb106d72b4a71e61c8be5d83893d37620`;
- `npm ci`: **PASS** — 14 packages added, 15 audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 239 tests / 239 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- Alpha Bug #3 lifecycle coverage executed as tests 214–219 and all passed;
- `npm run build`: **PASS**;
- workflow/job conclusion: **SUCCESS**;
- actual job steps and full job log inspected.

The integration suite therefore now contains the approved 239-test lifecycle coverage. The automated build PASS remains only evidence that the repository's existing build command completed; it does not establish real Obsidian plugin packaging correctness.

### Remaining Phase 6 / debugging state

- live/physical Phase 6 validation remains incomplete; prior unavailable checks are not converted into PASS by this integration CI;
- Alpha Bug #1 remains unresolved: packaging/build output is not yet formally repaired for real Obsidian runtime installation;
- Alpha Bug #2 remains unresolved: `token-exchange-failed` has not yet been diagnosed from sanitized live token-endpoint evidence;
- PR `#15` remains open/draft/unmerged pending further Phase 6 work;
- Stage 3 remains unauthorized and has not begun.

---

## Alpha Bug #1 — Approved Packaging Repair Integration

This append-only record establishes the approved packaging repair integration while preserving all earlier Phase 6 A/B/C and Alpha Bug #3 history above.

### Approved repair integrated

- repair agent: `agt-CA-P6-ALPHA-PACKAGING-01`;
- approved repair branch: `phase6-alpha-packaging-fix`;
- approved repair head: `b256c3c05b5f2c9536856bf32a9556066990e3b6`;
- production/build implementation head within that history: `9e3ee932548954a60324b06ebccc82303a1d46b2`;
- pre-integration `phase6-integration` head: `11b7bddbe71d2dbfb6eb0d6d6b703442f0967d8c`;
- integration method: **fast-forward only**; no merge commit, rebase, cherry-pick, squash, conflict resolution, force-push, or history rewrite was used;
- immediately after the fast-forward and before the subsequent evidence-only commit, `phase6-integration` resolved exactly to `b256c3c05b5f2c9536856bf32a9556066990e3b6`;
- dynamically tested integration tree: `b256c3c05b5f2c9536856bf32a9556066990e3b6`.

### Fresh combined automated integration verification

PR `#15` generated a fresh combined integration gate after the fast-forward:

- workflow: `Phase 1 CI`;
- run ID: `32932878480`;
- job ID: `98068347964`;
- PR head: `phase6-integration` @ `b256c3c05b5f2c9536856bf32a9556066990e3b6`;
- exact generated PR merge SHA checked out by Actions: `bc9b396709160dcb63d9f38a734f9c5dfa73c74e`;
- checkout log confirms the merge ref combined `b256c3c05b5f2c9536856bf32a9556066990e3b6` into unchanged `master` base `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: **PASS** — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 239 tests / 239 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**;
- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js` size: `279758` bytes;
- generated `main.js` SHA-256: `fce84d639c71375f06a03c9b600b8c1869b599e697627d28c85056d3d8eb1cf0`;
- workflow/job conclusion: **SUCCESS**;
- actual job steps and complete job log were inspected.

The fresh combined build reproduced the approved artifact identity exactly. Alpha Bug #1 is now **repository/build repaired**, but real Windows Obsidian installation/load validation of the integrated packaging remains outstanding and is not represented as PASS by CI. Real iPhone/iOS validation also remains outstanding.

### Remaining Phase 6 / debugging state

- Alpha Bug #2 remains unresolved and untouched: `token-exchange-failed` has not yet been diagnosed from sanitized live token-endpoint evidence;
- real Windows Obsidian installation/load validation remains outstanding;
- real iPhone/iOS validation remains outstanding;
- PR `#15` remains unmerged;
- Stage 3 has not begun;
- no supervisory approval is claimed by this integration evidence.

---

## Alpha Bug #2 — Live OAuth Root-Cause Repair and Approved Integration

This append-only record establishes the approved live OAuth repair while preserving all earlier historical statements above.

### Approved repair integrated

- repair agent: `codex-P6-ALPHA-OAUTH-LIVE-01`;
- repair branch: `phase6-alpha-oauth-live-fix`;
- required repair base: `phase6-integration` @ `8a0ec575f808c610c29ee4e307deb8194ae451c9`;
- approved repair head: `c9b2583b9b4ad29905ea35cca1203f4bf7851a86`;
- approved repair head parent: `8a0ec575f808c610c29ee4e307deb8194ae451c9`;
- integration method: **fast-forward only**;
- dynamically tested integration tree: `c9b2583b9b4ad29905ea35cca1203f4bf7851a86`;
- a later unrelated user commit on the repair branch was intentionally excluded from integration;
- `master` remained unchanged and PR `#15` remained open/draft/unmerged.

Detailed live-repair evidence is preserved in:

- `dev/evidence/_codex-P6-ALPHA-OAUTH-LIVE-01.md`;
- `dev/evidence/phase6-alpha-oauth-live-integration.md`.

### Live supported-runtime finding and root cause

Real Windows Obsidian OAuth reached the Google token endpoint and, after sanitized diagnostics were added, produced:

- phase: `token-exchange`;
- HTTP status: `400`;
- OAuth error: `invalid_request`;
- sanitized description: `client_secret is missing.`

The root cause was therefore confirmed: the configured Google OAuth client is a Web application client using the Azure HTTPS callback, and production did not wire the client-secret storage key into the Web-client token exchange.

The approved repair:

- removed the false browser-launch failure caused by treating a falsy/null `window.open` return as proof of failure;
- preserved actual thrown browser-launch errors;
- set the Obsidian `requestUrl` bridge to preserve Google HTTP 4xx responses for safe parsing;
- added structured, sanitized OAuth diagnostics without raw request/response logging;
- wired the Web client secret only through Obsidian SecretStorage;
- added masked device-local Save/Clear controls for that secret;
- preserved exact `https://www.googleapis.com/auth/drive.file` scope enforcement;
- preserved Alpha Bug #3's single plugin-lifetime protocol-handler lifecycle.

After the secret was entered directly into Obsidian SecretStorage on the Windows device, the live flow completed successfully:

- system-browser authorization: **PASS**;
- Google authorization/consent: **PASS**;
- deployed Azure callback: **PASS**;
- Obsidian protocol return: **PASS**;
- Google token exchange: **PASS**;
- exact `drive.file` scope enforcement: **PASS**;
- final Obsidian notice: `Google authentication completed.`

No authorization code, PKCE verifier, access token, refresh token, client-secret value, password, MFA value, cookie, or vault content was recorded. No managed remote was created or paired and no synchronization was performed during the OAuth repair validation.

### Fresh combined automated integration verification

After the approved repair was fast-forwarded into `phase6-integration`, PR `#15` generated a fresh clean-checkout combined gate:

- workflow: `Phase 1 CI`;
- run ID: `32995246926`;
- job ID: `98262611241`;
- PR head: `phase6-integration` @ `c9b2583b9b4ad29905ea35cca1203f4bf7851a86`;
- unchanged `master` base: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- exact generated PR merge SHA checked out by Actions: `cde66410a9efc5086741dc53859cd8e150aade9e`;
- checkout: `Merge c9b2583b9b4ad29905ea35cca1203f4bf7851a86 into 54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- Node: `v22.23.2`;
- npm: `10.9.8`;
- `npm ci`: **PASS** — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 248 tests / 248 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**;
- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js` size: `286740` bytes;
- generated `main.js` SHA-256: `ed3a0bc41236b6fb988e3018b928fca36fc6e8fcacb05507eebf10c905ab4993`;
- workflow/job conclusion: **SUCCESS**;
- actual job steps and complete job log were inspected.

The integration artifact exactly reproduced the Windows artifact that was installed and used for successful live Google authentication.

### Updated supported-runtime state

Now established in Windows supported-runtime validation:

- Alpha Bug #1 packaging/install/load: **PASS**;
- Alpha Bug #2 OAuth token-exchange root cause: **CONFIRMED AND REPAIRED**;
- real-user Google OAuth on Windows: **PASS**;
- deployed Azure callback return on Windows: **PASS**;
- Alpha Bug #3 protocol-handler lifecycle: **PASS**.

Still outstanding and not represented as passes by this section:

- managed remote creation/pairing and live Drive-domain validation;
- first synchronization preview/execute;
- broader Windows synchronization scenarios;
- real iPhone/iOS Obsidian validation;
- remaining physical interruption, disk-full, constrained-resource/large-vault, and other Phase 6 acceptance work.

Stage 3 remains unauthorized and has not begun.

---

## Approved Windows First-Sync Repair Integration — Bounded Read + Portable Configuration

### Approved repair

- integration agent: `agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01`;
- repair branch: `phase6-alpha-windows-bounded-read-fix`;
- approved repair head: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- independently reviewed result: `APPROVE`;
- dynamically tested production/test tree: `8b7f320b0a9af86a933b200245694ee9c47ee854`;
- pre-integration `phase6-integration`: `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`;
- integration method: **fast-forward only**;
- fast-forwarded integration tree before evidence-only commits: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- no merge commit, rebase, cherry-pick, squash, conflict resolution, or force-push.

The approved repair integrates the Windows desktop bounded local-file reader, the portable-config false-collision correction, and the final fail-closed canonical-resolution correction. Missing-path acceptance is restricted to `lstat` `ENOENT`/`ENOTDIR`; after successful `lstat`, `realpath` must succeed and remain inside the canonical vault root. Reserved-namespace occupancy/uncertainty remains blocked and mobile isolation remains unchanged.

### Prior approved clean repair verification

- workflow: `Phase 6 Alpha Portable Collision CI`;
- run: `33023650014`;
- job: `98359805718`;
- exact checkout: `8b7f320b0a9af86a933b200245694ee9c47ee854`;
- tests: `265/265 PASS`;
- typecheck/build: PASS;
- all five build-verifier checks: PASS;
- `main.js`: `291213` bytes;
- SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`;
- later repair-branch commits through `bcdcf935...` were workflow cleanup/evidence only; no production/test file changed after the tested tree.

### Physical Windows acceptance

Recorded from **supervisor/user-supplied physical supported-runtime evidence**:

- local branch head: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- local `npm ci` and build: PASS;
- local/installed artifact: `291213` bytes, SHA-256 `EC8F4A572EB14ADDDAADB0D0656CED5A3761E373FC6A0A1C78F383D6CF667391`;
- plugin load status: `idle-ready`;
- preview: `275` planned operations, disposition `safe-auto-eligible`;
- `274 upload-create`, `1 noop`, `0 blocked-unsafe`;
- no conflicts, deletes, trash, or destructive operation category;
- no-op path: `__brain_sync_portable_config__/hotkeys.json`;
- no-op reason: `Neither side currently contains the never-established path.`;
- preview closed without Execute; no synchronization occurred.

**PHYSICAL WINDOWS REPAIR ACCEPTANCE: PASS**

### Fresh combined integration gate

- PR: `#15` — `phase6-integration` -> `master`;
- workflow: `Phase 1 CI`;
- run: `33031435312`;
- job: `98384624285`;
- tested generated PR merge SHA: `44ebd6add7fe80f2233bffa2861e7f7d9be73043`;
- merge contained integration head `bcdcf935de0fb49b518d90d7f886b932175f0015` over unchanged master `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: PASS;
- typecheck: PASS;
- tests: `265/265 PASS`, 0 fail/cancelled/skipped/todo;
- build: PASS;
- all five build-verifier checks: PASS;
- integrated `main.js`: `291213` bytes;
- SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`.

### Remaining Phase 6 boundary

- first-sync Execute has not occurred and first synchronization remains outstanding;
- physical iPhone/iOS validation remains outstanding;
- accepted stock-iOS fail-closed limitations remain unresolved;
- PR `#15` remains open/unmerged;
- `master` remains unchanged;
- Stage 3 has not begun.

Any subsequent commits after `bcdcf935de0fb49b518d90d7f886b932175f0015` in this integration session are evidence/documentation-only and must not change production/test/build behavior.

---

## Evidence provenance correction — C1/C2 closure

This append-only correction explicitly supersedes the final characterization immediately above that all post-`bcdcf935...` commits were ordinary evidence/documentation-only changes. Production and test immutability remains true, but the complete committed session history also contained temporary CI finalization files that were later removed.

### Complete post-fast-forward committed history through rejected review

From approved repair head `bcdcf935de0fb49b518d90d7f886b932175f0015` through rejected-review head `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90`, the committed history is exactly:

1. `fb6e4f1d0d8a2932ae8c671e8891aeacf641212b` — `docs: add Windows repair integration evidence`
   - created `dev/evidence/_ca-output-agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01.md`.
2. `9668bead31e8cac300528319abf2322da6f2ab36` — `ci: finalize Windows repair integration evidence`
   - created an initial temporary revision of `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.
3. `14b2fb1b7134364976b806eb7a156e9241a3e524` — `ci: remove invalid Windows integration evidence finalizer`
   - deleted that initial temporary workflow revision.
4. `3da2b67345a26d76e1c3ce8b476ef208db66b807` — `ci: stage Windows integration evidence finalizer`
   - created `.github/phase6-alpha-windows-evidence-finalize.sh`.
5. `8f85afa7aef5eb4befee671fe5f23ff7f12d8455` — `ci: run Windows integration evidence finalizer`
   - created a subsequent temporary revision of `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.
6. `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90` — `docs: record approved Windows first-sync repair integration`
   - modified `dev/evidence/_ca-output.md` and `dev/evidence/phase6-integration-manifest.md`;
   - deleted `.github/phase6-alpha-windows-evidence-finalize.sh` and `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.

### Corrected history characterization

- Production and test source did not change after approved repair head `bcdcf935de0fb49b518d90d7f886b932175f0015`.
- The final net repository state at rejected-review head `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90` differs from `bcdcf935...` only by three evidence-document paths: agent evidence created, cumulative evidence modified, and this integration manifest modified.
- However, the intermediate committed history contained the temporary CI workflow/script files listed above. Those paths were real repository changes during the integration/evidence-finalization session.
- Both temporary paths were fully removed before the rejected-review head and are absent from its final tree.
- Therefore the intermediate workflow/script commits must not be characterized as ordinary evidence-document edits. The earlier blanket “evidence/documentation-only” characterization is superseded by this distinction.

### Final net repository change at rejected review

**Created**

- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01.md`.

**Modified**

- `dev/evidence/_ca-output.md`;
- `dev/evidence/phase6-integration-manifest.md`.

**Deleted in final net tree**

- none.

### Session-transient created/deleted paths

- `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`;
- `.github/phase6-alpha-windows-evidence-finalize.sh`.

The preserved combined production/test gate remains run `33031435312`, job `98384624285`, with 265/265 tests PASS, typecheck PASS, build PASS, all five build-verifier checks PASS, `main.js` size `291213` bytes, and SHA-256 `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`. No production/test rerun is required for this evidence-only correction.

---

## iOS OAuth repair fast-forward integration - 2026-08-27

Integration agent: `codex-P6-ALPHA-IOS-OAUTH-INTEGRATE-01`.

### Topology

- integration branch: `phase6-integration`;
- pre-integration SHA: `73453011c54abdca9ff2548803c025fae9886e74`;
- approved repair branch: `phase6-alpha-ios-oauth-launch-fix`;
- approved repair head and post-fast-forward source SHA: `d499bb504e7b1092b4dc6d4fba5bf2523151d248`;
- implementation correction: `11212541b663d2953fd0c1f405a60be4fd57243e`;
- method: fast-forward only;
- approved head ancestry: verified;
- push: pending the separate authorized push step.

### Approved repair net change relative to the integration base

**Created**

- `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01.md`;
- `test/phase6-alpha-ios-oauth-launch.test.ts`.

**Modified**

- `dev/evidence/_ca-output.md`;
- `src/drive/oauth-return.ts`;
- `src/main.ts`;
- `src/product/runtime.ts`;
- `test/phase6-alpha-oauth-lifecycle.test.ts`.

**Deleted**

- none.

### Integration verification

- typecheck: PASS;
- focused OAuth/mobile gate: 25/25 PASS;
- full suite: qualified PASS, 268/270, with only the two known pre-existing Windows drive-qualified assertions;
- build: PASS;
- all five build verifiers: PASS;
- `main.js`: `291948` bytes;
- SHA-256: `f290076abdd02e59e11f24c3cfdff5f47ad22917aac06c5a69ad7a7ff07a9106`;
- `git diff --check`: PASS.

### Integration evidence-pass net change

**Created**

- `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-INTEGRATE-01.md`.

**Modified**

- `dev/evidence/_ca-output.md`;
- `dev/evidence/phase6-integration-manifest.md`.

**Deleted**

- none.

Physical iPhone OAuth validation remains pending. No iPhone pairing or synchronization, performance work, Stage 3 work, release mutation, `master` modification, or PR `#15` merge occurred.
