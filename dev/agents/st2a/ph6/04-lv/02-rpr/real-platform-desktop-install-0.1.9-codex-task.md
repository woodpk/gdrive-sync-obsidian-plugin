# PHASE 6 PRE-LIVE REPAIR PRERELEASE 0.1.9 — DESKTOP CODEX INSTALL TASK

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-install-0.1.9-01`

Your assignment is to install the newly published GitHub prerelease `0.1.9` into the existing Windows Obsidian plugin directory while preserving the current device-local plugin configuration, pairing, authentication authority, synchronization/recovery state, and reset state.

This is an **installation/update task**, not a coding task and not a repository-integration task.

Do not modify repository source code.
Do not reset synchronization state.
Do not clear authentication.
Do not delete plugin data.
Do not perform live synchronization.
Do not resume A03 in this task.
Do not begin Stage 3.

---

## 1. TARGET INSTALLATION

Exact installed plugin directory:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync\`

GitHub repository:

`woodpk/gdrive-sync-obsidian-plugin`

Required release:

`0.1.9`

Required plugin ID:

`brain-google-drive-sync`

Install only from the authoritative published GitHub `0.1.9` prerelease assets.

Do not install from a development branch, integration checkout, local build, or another release when the authoritative `0.1.9` release exists.

---

## 2. RELEASE AUTHORITY GATE

The cloud release task must be complete before installation.

Do **not** assume release asset IDs, sizes, or hashes in advance.

Before touching the installed plugin, independently retrieve GitHub metadata for release/tag `0.1.9` and require:

- tag `0.1.9` exists;
- release exists;
- `prerelease = true`;
- `draft = false`;
- title is exactly:
  `0.1.9 — Phase 6 Pre-Live Repair Physical Validation Build`;
- release contains at least:
  - `main.js`;
  - `manifest.json`;
- release tag target is the exact verified release-preparation commit reported by the cloud release task;
- released `manifest.json` reports:
  - `id = "brain-google-drive-sync"`;
  - `version = "0.1.9"`;
  - `isDesktopOnly = false`.

Record:

- release URL;
- release ID;
- tag target SHA;
- each required asset ID;
- asset size;
- GitHub-provided digest when available.

Download the required assets and independently compute SHA-256 for each.

Require exact agreement with the GitHub digest where GitHub supplies one.

If the release is missing, draft, not marked prerelease, the title/tag identity is wrong, the tag target does not match the cloud task's verified prep SHA, required assets are missing, manifest identity is wrong, or asset integrity cannot be established, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not substitute 0.1.8.
Do not build your own 0.1.9 replacement.

---

## 3. CURRENT LIVE-VALIDATION STATE — PRESERVE EXACTLY

The previous controlled Windows reset intentionally preserved local plugin settings, OAuth authority, vault/device identity, and managed-remote pairing while removing stale indexed synchronization state.

The last controlled physical-validation attempt reached A03 and transitioned to `recovery-required`; the plugin was then disabled while the pre-live repairs were implemented.

The purpose of this installation task is to replace only release runtime artifacts so the corrected candidate can later resume the existing physical-validation sequence at A03.

Do **not** restart the validation sequence from the beginning.
Do **not** perform another reset.
Do **not** run Verify/Reconcile or Sync Now during installation.
Do **not** alter Drive content.

---

## 4. CRITICAL LOCAL-STATE / SECRET PRESERVATION

The installation directory and Obsidian runtime may contain device-local state that MUST NOT be overwritten, cleared, printed, or exposed.

Preserve all non-release runtime/config/state files.

At minimum preserve:

- `data.json` if present;
- current plugin settings;
- vault identity;
- device identity;
- managed-remote/root pairing identity;
- synchronization/recovery state;
- change cursors, journals, tombstones, checkpoints, audit/diagnostic state where present;
- any device-local persisted state outside the release assets;
- OAuth token authority stored through Obsidian SecretStorage.

Known SecretStorage identifiers include:

- OAuth token record: `brain-gdrive-oauth-tokens`;
- Google client secret: `brain-google-client-secret`.

Do **not** print, export, log, move, clear, or inspect the secret values themselves.
Only establish presence/continuity through safe application-visible state when needed.

Do not delete the plugin directory and recreate it.
Do not clear `data.json`.
Do not deauthorize.
Do not reauthenticate unless separately authorized after installation.

---

## 5. START GATE — LOCAL INSTALLATION INVENTORY

Before modifying anything:

1. confirm the exact plugin directory exists;
2. enumerate filenames in that directory;
3. read current installed `manifest.json` if present;
4. record the currently installed version;
5. compute size and SHA-256 of current installed `main.js` and `manifest.json` if present;
6. identify all non-release/device-local files that will be preserved, by filename only;
7. compute SHA-256 of `data.json` if present **for preservation comparison only**;
8. do not display or reproduce `data.json` contents;
9. determine whether Obsidian is currently running and whether the plugin is enabled/loaded;
10. confirm the authoritative downloaded 0.1.9 assets passed Section 2 integrity checks before replacing anything.

If the installation path is missing or the release assets cannot be verified, stop without modifying the plugin.

---

## 6. OBSIDIAN PROCESS SAFETY

Do not replace `main.js` while the plugin is actively executing.

Preferred order:

1. ensure user work is not at risk;
2. if Obsidian is open and the plugin can be safely disabled/unloaded without triggering synchronization, disable/unload it;
3. otherwise close Obsidian gracefully;
4. do not forcibly terminate Obsidian if that risks unsaved user work;
5. if safe unload/close cannot be established, stop and ask the user to close Obsidian rather than risk filesystem/runtime corruption.

The plugin was intentionally left disabled after the prior failed A03 validation. If it remains disabled, preserve that safety posture during file replacement.

---

## 7. PRE-INSTALL BACKUP

Before replacing release artifacts, create a timestamped backup outside the active plugin directory containing the currently installed release artifacts at minimum:

- `main.js`;
- `manifest.json`;
- `styles.css` only if currently installed and it will be replaced.

Do not move, delete, or replace the only copy of device-local state files.

Record the backup path.

The historical installed 0.1.8 main artifact was:

- size `699431` bytes;
- SHA-256 `da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`.

Use that only as historical comparison evidence. Do not require it if the current installed artifact has legitimately changed or if the user has already altered the installation.

---

## 8. AUTHORIZED FILE REPLACEMENT

Replace only the runtime files actually supplied by the verified `0.1.9` release and required for installation.

Expected:

- `main.js`;
- `manifest.json`.

If the exact published 0.1.9 release includes a supported `styles.css`, install/replace it as well; otherwise do not create one.

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
2. installed manifest reports `version = 0.1.9`;
3. installed manifest reports `id = brain-google-drive-sync`;
4. installed `main.js` byte size exactly matches the verified GitHub release asset size;
5. installed `main.js` SHA-256 exactly matches the independently verified release asset SHA-256;
6. installed `manifest.json` byte size exactly matches the verified release asset size;
7. installed `manifest.json` SHA-256 exactly matches the independently verified release asset SHA-256;
8. `data.json` SHA-256 is unchanged from the pre-update value if it existed;
9. every identified device-local file remains present;
10. no repository development file was introduced;
11. the backup exists and is readable.

If any integrity or preservation check fails:

- do not launch/reload the new plugin;
- restore the previous release artifacts from backup;
- leave device-local state untouched;
- report the exact failure.

---

## 10. NON-MUTATING DESKTOP LOAD CHECK

After filesystem verification succeeds:

1. launch/reopen Obsidian or safely reload/enable the plugin;
2. confirm the BRAIN vault opens normally;
3. confirm `BRAIN Google Drive Sync` loads without an immediate plugin-load/runtime exception;
4. confirm Obsidian recognizes version `0.1.9` where exposed;
5. confirm existing plugin settings are retained;
6. confirm existing vault/device/remote pairing appears retained;
7. confirm authentication authority appears retained without exposing secret values;
8. confirm the plugin reaches a coherent status surface.

Because the prior A03 attempt legitimately left synchronization authority at `recovery-required`, do **not** treat `recovery-required` itself as an installation failure. The repaired product is expected to handle that state during the subsequent supervisor-directed Verify/Reconcile flow.

Do not click:

- `Sync Now`;
- `Verify/Reconcile Vault`;
- `Authenticate`;
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
- recovery/synchronization-state presence.

Do not claim those states are semantically repaired merely because they remain present. Semantic recovery will occur in the later physical-validation task beginning at A03.

---

## 12. COMPLETION RESPONSE

Return:

- exact target installation path;
- prior installed version;
- installed version `0.1.9`;
- GitHub release URL/ID;
- tag target SHA;
- release `main.js` asset ID / size / SHA-256 / GitHub digest;
- release `manifest.json` asset ID / size / SHA-256 / GitHub digest;
- installed `main.js` size/SHA-256 and match result;
- installed `manifest.json` size/SHA-256 and match result;
- release artifact filenames replaced;
- preserved device-local filenames only;
- `data.json` result if applicable: `UNCHANGED SHA-256` or precise blocker, without contents;
- backup location;
- Obsidian/plugin load result;
- settings continuity result;
- vault/device/remote pairing continuity result;
- authentication-presence continuity result without secret disclosure;
- current synchronization/recovery status surface;
- confirmation no live synchronization/Verify-Reconcile was initiated;
- confirmation no reset/deauthorization/reauthentication occurred;
- confirmation no repository branch was mutated;
- any blocker.

End exactly:

`WINDOWS DESKTOP PLUGIN UPDATED TO 0.1.9 — LOCAL STATE/AUTHORITY PRESERVED — READY TO RESUME PHASE 6 PHYSICAL VALIDATION AT A03`

---

## 13. STOP

Stop after the verified installation and non-mutating load/continuity check.

Do not run A03.
Do not perform live Google Drive synchronization.
Do not begin iPhone installation unless separately assigned.
Do not modify repository code or branches.
Do not perform another state reset.
Do not begin Stage 3.
