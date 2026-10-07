# PHASE 6 A03 REPAIR PRERELEASE 0.1.10 — WINDOWS DESKTOP CODEX INSTALL TASK

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-install-0.1.10-01`

Your assignment is to install the newly published GitHub prerelease `0.1.10` into the existing Windows Obsidian plugin directory while preserving the current device-local plugin configuration, pairing, authentication authority, synchronization/recovery state, and the preserved A03 live-validation checkpoint.

This is an **installation/update task only**.

Do not modify repository source code.
Do not reset synchronization state.
Do not clear authentication.
Do not delete plugin data.
Do not perform live synchronization.
Do not run Verify/Reconcile.
Do not resume A03 in this task.
Do not begin B–O.
Do not begin Stage 3.

---

## 1. TARGET INSTALLATION

Exact installed plugin directory:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync\`

GitHub repository:

`woodpk/gdrive-sync-obsidian-plugin`

Required release:

`0.1.10`

Required plugin ID:

`brain-google-drive-sync`

Install only from the authoritative published GitHub `0.1.10` prerelease assets.

Do not install from:

- a development branch;
- `phase6-integration`;
- a local build;
- the repair branch;
- prerelease `0.1.9`;
- any later release.

---

## 2. RELEASE AUTHORITY GATE

The cloud release task for `0.1.10` must be complete before installation.

Cloud release task identity:

`agt-ca-p6-real-platform-release-0.1.10-01`

Authoritative promoted release input used by that task:

`05a99001607f48896062d0aac6ee507fc892691a`

Supervisor-approved C1-R1 repair incorporated by that promotion:

`145ff6898225c5737fea7dfbab2b79dc4ae7b02f`

Do **not** assume the final `0.1.10` release-preparation SHA, release ID, asset IDs, sizes, or hashes in advance. Retrieve and verify them from the completed cloud release and GitHub.

Before touching the installed plugin, independently retrieve GitHub metadata for release/tag `0.1.10` and require:

- tag `0.1.10` exists;
- release exists;
- `prerelease = true`;
- `draft = false`;
- title is exactly:
  `0.1.10 — Phase 6 A03 Conflict-Resolution Repair Physical Validation Build`;
- release contains at least:
  - `main.js`;
  - `manifest.json`;
- release tag target exactly equals `RELEASE_0_1_10_PREP_SHA` reported by the completed cloud release task;
- released `manifest.json` reports:
  - `id = "brain-google-drive-sync"`;
  - `version = "0.1.10"`;
  - `isDesktopOnly = false`.

Record:

- release URL;
- release ID;
- tag target SHA;
- `RELEASE_0_1_10_PREP_SHA` from the cloud release completion;
- each required asset ID;
- each required asset size;
- GitHub-provided digest when available.

Download the required assets and independently compute SHA-256 for each.

Require exact agreement with the GitHub digest where GitHub supplies one and exact agreement with the cloud release task's independently recorded artifact hashes.

If the release is missing, draft, not a prerelease, title/tag identity is wrong, tag target does not match the cloud release's verified prep SHA, required assets are missing, manifest identity is wrong, or asset integrity cannot be established, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not substitute `0.1.9`.
Do not build your own `0.1.10` replacement.

---

## 3. CURRENT LIVE-VALIDATION STATE — PRESERVE EXACTLY

The existing Windows installation is the preserved Phase 6 physical-validation device.

The last installed prerelease is expected to be `0.1.9`.

The preserved Phase 6 session reached A03. During A03, first-sync conflict resolution for:

`__brain_sync_portable_config__/app.json`

failed with `recovery-required` and the live campaign stopped. That failure led to the C1/C1-R1 repair campaign now incorporated into `0.1.10`.

The purpose of this installation task is only to replace the published runtime release artifacts so a later explicitly authorized task can resume physical validation at the preserved A03 checkpoint.

Do **not**:

- restart A01/A02;
- reset state;
- clear/recreate pairing;
- run Verify/Reconcile;
- click Sync Now;
- resolve the A03 conflict;
- alter Google Drive content;
- modify test fixtures.

A03 remains paused until a separate validation task authorizes resumption.

---

## 4. CRITICAL LOCAL-STATE / SECRET PRESERVATION

The installation directory and Obsidian runtime contain device-local state that must not be overwritten, cleared, printed, or exposed.

Preserve all non-release runtime/config/state files.

At minimum preserve:

- `data.json` if present;
- current plugin settings;
- vault identity;
- device identity;
- managed-remote/root pairing identity;
- synchronization/recovery state;
- change cursors;
- mutation journals/intents;
- tombstones;
- checkpoints;
- audit/diagnostic state where present;
- any other device-local persisted state outside the release assets;
- OAuth token authority stored through Obsidian SecretStorage.

Known SecretStorage identifiers include:

- OAuth token record: `brain-gdrive-oauth-tokens`;
- Google client secret: `brain-google-client-secret`.

Do not print, export, log, move, clear, or inspect the secret values themselves.
Only establish presence/continuity through safe application-visible state where needed.

Do not delete and recreate the plugin directory.
Do not clear `data.json`.
Do not deauthorize.
Do not reauthenticate.
Do not perform another state reset.

---

## 5. START GATE — LOCAL INSTALLATION INVENTORY

Before modifying anything:

1. confirm the exact plugin directory exists;
2. enumerate filenames in that directory;
3. read current installed `manifest.json` if present;
4. record the currently installed version;
5. if the current installed version is not `0.1.9`, stop and report the observed version before changing anything;
6. compute byte size and SHA-256 of current installed `main.js` and `manifest.json` if present;
7. identify all non-release/device-local files that will be preserved, by filename only;
8. compute SHA-256 of `data.json` if present **for preservation comparison only**;
9. do not display or reproduce `data.json` contents;
10. determine whether Obsidian is currently running and whether the plugin is enabled/loaded;
11. confirm the authoritative downloaded `0.1.10` assets passed Section 2 integrity checks before replacing anything.

Historical comparison only — the previously installed `0.1.9` release assets were:

- `main.js` SHA-256: `9d45d5b3ba26218d3a47dae62ac2c0798133937197811cae185b0aee022128b2`;
- `manifest.json` SHA-256: `9cbccf935b8f9d5a637bbe900cfb01a9455ca1d8537fac007f1e76761d087f40`.

Use these only as historical evidence. Do not fail solely because current installed hashes differ if there is a documented legitimate reason; report any difference before installation.

If the installation path is missing or the `0.1.10` release assets cannot be authoritatively verified, stop without modifying the plugin.

---

## 6. OBSIDIAN PROCESS SAFETY

Do not replace `main.js` while the plugin is actively executing.

Preferred order:

1. ensure user work is not at risk;
2. determine whether the plugin is currently disabled from the prior A03 hard stop;
3. if Obsidian is open and the plugin is disabled/unloaded, preserve that posture during file replacement;
4. if the plugin is loaded, safely disable/unload it without triggering synchronization;
5. otherwise close Obsidian gracefully;
6. do not forcibly terminate Obsidian if unsaved user work could be lost;
7. if safe unload/close cannot be established, stop and ask the user to close Obsidian rather than risk corruption.

Do not trigger synchronization merely to establish whether the plugin is loaded.

---

## 7. PRE-INSTALL BACKUP

Before replacing release artifacts, create a timestamped backup outside the active plugin directory containing the currently installed release artifacts at minimum:

- `main.js`;
- `manifest.json`;
- `styles.css` only if currently installed and it will be replaced.

Preferred backup root if the existing Phase 6 convention is still available:

`D:\obsidian-brain-dev\dev\evidence\plugin-install-backups\brain-google-drive-sync\`

Use a new timestamped child directory identifying `0.1.9-before-0.1.10`.

Do not move, delete, or replace the only copy of device-local state files.

Record the exact backup path.

---

## 8. AUTHORIZED FILE REPLACEMENT

Replace only the runtime files actually supplied by the verified `0.1.10` release and required for installation.

Expected:

- `main.js`;
- `manifest.json`.

If the exact published `0.1.10` release includes a supported `styles.css`, install/replace it as well; otherwise do not create one.

Do not copy repository development files into the plugin directory.

Do not copy:

- `src/**`;
- `test/**`;
- `dev/**`;
- `.github/**`;
- `package.json`;
- `package-lock.json`;
- `node_modules/**`;
- TypeScript source;
- build scripts.

Use safe/atomic replacement where practical on Windows.

---

## 9. POST-INSTALL FILESYSTEM VERIFICATION

Before reloading the plugin, verify:

1. installed `manifest.json` parses as valid JSON;
2. installed manifest reports `version = 0.1.10`;
3. installed manifest reports `id = brain-google-drive-sync`;
4. installed `main.js` byte size exactly matches the independently verified GitHub release asset size;
5. installed `main.js` SHA-256 exactly matches the independently verified `0.1.10` release asset SHA-256;
6. installed `manifest.json` byte size exactly matches the independently verified release asset size;
7. installed `manifest.json` SHA-256 exactly matches the independently verified release asset SHA-256;
8. `data.json` SHA-256 is unchanged from the pre-update value if it existed;
9. every identified device-local file remains present;
10. no repository development file was introduced;
11. the backup exists and is readable.

If any integrity or preservation check fails:

- do not launch/reload the new plugin;
- restore the previous release artifacts from backup;
- leave device-local state untouched;
- report the exact failure;
- stop.

---

## 10. NON-MUTATING DESKTOP LOAD CHECK

After filesystem verification succeeds:

1. launch/reopen Obsidian or safely reload/enable the plugin only as needed to prove runtime load;
2. confirm the BRAIN vault opens normally;
3. confirm `BRAIN Google Drive Sync` loads without an immediate plugin-load/runtime exception;
4. confirm Obsidian recognizes version `0.1.10` where exposed;
5. confirm existing plugin settings are retained;
6. confirm existing vault/device/remote pairing appears retained;
7. confirm authentication authority appears retained without exposing secret values;
8. confirm the plugin reaches a coherent status surface;
9. record the current synchronization/recovery status without attempting to repair or advance it.

Because the preserved A03 checkpoint may legitimately present synchronization/recovery state from the prior hard stop, do not treat `recovery-required` by itself as an installation failure.

Do not click:

- `Sync Now`;
- `Verify/Reconcile Vault`;
- `Authenticate`;
- any conflict resolution action;
- deauthorization/reset controls.

Do not create/edit/delete/rename synchronization fixtures.
Do not intentionally mutate the managed Google Drive remote.

This task proves only correct installation and local-state continuity.

---

## 11. NO-RESET CONTINUITY CHECK

Establish, without exposing sensitive contents, that the update did not turn the installation into a fresh device.

Where safely observable, verify continuity of:

- settings;
- device identity;
- vault identity;
- managed remote pairing;
- authentication-state presence;
- synchronization/recovery-state presence;
- preserved A03 context to the extent safely visible without executing synchronization.

Do not claim the repaired synchronization semantics are physically validated merely because the plugin loads and state is preserved. That proof belongs to the subsequent A03 validation task.

---

## 12. REPOSITORY / LIVE-TEST BOUNDARIES

This desktop install task must not mutate the GitHub repository.

Do not:

- commit;
- push;
- merge;
- tag;
- create releases;
- edit `phase6-integration`;
- edit repair/release branches;
- create repository evidence commits.

Local installation evidence may be recorded only in the existing external/local Phase 6 evidence area if needed for the task and only without secrets.

Do not resume A03.
Do not begin B–O.
Do not begin iPhone installation unless separately assigned.
Do not begin Stage 3.

---

## 13. COMPLETION RESPONSE

Return:

- exact target installation path;
- prior installed version;
- installed version `0.1.10`;
- GitHub release URL/ID;
- `RELEASE_0_1_10_PREP_SHA`;
- tag target SHA;
- release `main.js` asset ID / size / SHA-256 / GitHub digest;
- release `manifest.json` asset ID / size / SHA-256 / GitHub digest;
- installed `main.js` size/SHA-256 and exact-match result;
- installed `manifest.json` size/SHA-256 and exact-match result;
- release artifact filenames replaced;
- preserved device-local filenames only;
- `data.json` result if applicable: `UNCHANGED SHA-256` or precise blocker, without contents;
- backup location;
- Obsidian/plugin load result;
- settings continuity result;
- vault/device/remote pairing continuity result;
- authentication-presence continuity result without secret disclosure;
- current synchronization/recovery status surface;
- confirmation no `Sync Now`, Verify/Reconcile, conflict resolution, or live synchronization was initiated;
- confirmation no reset/deauthorization/reauthentication occurred;
- confirmation no repository branch or release was mutated;
- confirmation A03 remains paused;
- any blocker.

End exactly:

`WINDOWS DESKTOP PLUGIN UPDATED TO 0.1.10 — LOCAL STATE/AUTHORITY AND A03 CHECKPOINT PRESERVED — READY FOR SEPARATELY AUTHORIZED A03 PHYSICAL-VALIDATION RESUMPTION`

---

## 14. STOP

Stop after the verified installation and non-mutating load/continuity check.

Do not run A03.
Do not perform live Google Drive synchronization.
Do not begin B–O.
Do not begin iPhone installation unless separately assigned.
Do not modify repository code or branches.
Do not perform another state reset.
Do not begin Stage 3.
