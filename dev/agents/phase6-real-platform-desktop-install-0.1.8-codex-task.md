# PHASE 6 REAL-PLATFORM VALIDATION — DESKTOP CODEX INSTALL TASK

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-install-0.1.8-01`

Your assignment is to update the already-installed BRAIN Google Drive Sync Obsidian plugin on the Windows desktop from the current installed prerelease to the newly published GitHub prerelease `0.1.8`, while preserving all device-local plugin data, authentication state, synchronization state, and user configuration.

This is an **installation/update task**, not a coding task.

Do not modify repository source code.
Do not change synchronization behavior.
Do not delete or reset plugin data.
Do not begin Stage 3.
Do not perform any destructive Google Drive synchronization action merely to prove installation.

---

## 1. TARGET INSTALLATION

Exact installed plugin directory:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync`

GitHub repository:

`woodpk/gdrive-sync-obsidian-plugin`

Required release:

`0.1.8`

Required plugin ID:

`brain-google-drive-sync`

The cloud release actor must complete first and provide/establish the authoritative `0.1.8` GitHub prerelease.

Do not install from a development branch or arbitrary repository checkout when the `0.1.8` release assets exist.
Use the published GitHub release assets as the installation authority.

---

## 2. START GATE

Before modifying the installed plugin:

1. confirm the target plugin directory exists;
2. enumerate the files currently present in that directory;
3. read the currently installed `manifest.json` if present;
4. record the currently installed plugin version;
5. identify device-local/runtime files that must be preserved, especially `data.json` or any other current plugin data/state/config files not supplied as release assets;
6. confirm GitHub release `0.1.8` exists and is published as a prerelease;
7. confirm release `0.1.8` contains at least:
   - `main.js`
   - `manifest.json`;
8. confirm the release `manifest.json` reports:
   - `id = "brain-google-drive-sync"`;
   - `version = "0.1.8"`;
   - `isDesktopOnly = false`;
9. record the GitHub release URL/ID, asset IDs, sizes, and digests if available;
10. independently compute SHA-256 for the downloaded `main.js` and `manifest.json` and compare against the cloud actor's reported values and GitHub digests when available.

If the release is missing, the plugin ID differs, version is not `0.1.8`, asset integrity does not match, or the installed path cannot be verified, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not substitute another release.
Do not install `0.1.7` again.
Do not build your own replacement from repository source unless explicitly reauthorized.

---

## 3. CRITICAL LOCAL-STATE PRESERVATION RULE

The installed plugin directory may contain device-local state that MUST NOT be overwritten or deleted.

Preserve all non-release runtime/config/state files unless an authoritative migration requirement explicitly says otherwise.

At minimum:

- preserve `data.json` if it exists;
- preserve OAuth/access/refresh-token storage or references;
- preserve device identity;
- preserve vault/remote pairing identity;
- preserve synchronization base/history;
- preserve Drive change cursors;
- preserve pending/checkpoint/journal state;
- preserve tombstones/recovery state;
- preserve audit/diagnostic state unless it is itself a generated disposable file and there is an explicit reason to rotate it;
- preserve all user settings not represented by the release artifacts.

Do NOT solve an installation problem by deleting the plugin directory and recreating it from scratch.
Do NOT delete `data.json` to force reauthentication.
Do NOT clear plugin state unless the supervisor explicitly authorizes that action after a demonstrated compatibility defect.

The normal update operation is to replace release artifact files in place while leaving local device data intact.

---

## 4. FILES AUTHORIZED TO REPLACE

Replace only files actually supplied by the authoritative `0.1.8` release and required for the installed plugin.

Expected authorized replacements:

- `main.js`
- `manifest.json`

If the `0.1.8` release also contains an intentionally supported `styles.css`, replace/install it only if it is actually present in the release.

Do not copy repository development files into the plugin directory.
Do not copy:

- `src/**`;
- `test/**`;
- `package.json`;
- `package-lock.json`;
- `node_modules/**`;
- `dev/**`;
- `.github/**`;
- TypeScript source;
- build scripts.

The installed Obsidian plugin directory should contain runtime/plugin artifacts and preserved device-local data only.

---

## 5. SAFE UPDATE PROCEDURE

Perform the update conservatively.

### 5.1 Pre-update evidence

Before changing files, record:

- exact directory path;
- current directory listing;
- current installed version;
- SHA-256 and size of current `main.js` and `manifest.json` if present;
- names of preserved device-local files;
- SHA-256 of `data.json` if it exists, for preservation verification only — do not expose its contents because it may contain sensitive configuration or token-related material.

Do not print or copy secret values into logs or the completion response.

### 5.2 Obsidian process safety

If Obsidian is running, avoid replacing plugin runtime files while the plugin is actively loaded unless the environment can safely disable/unload the plugin first.

Preferred order:

1. save any open vault work;
2. disable/unload the `BRAIN Google Drive Sync` plugin in Obsidian if safely automatable, otherwise ensure Obsidian is closed before file replacement;
3. replace the release artifacts;
4. restart/reload Obsidian only after filesystem verification succeeds.

Do not forcibly terminate Obsidian if doing so risks unsaved user work.
If safe unload/close cannot be established automatically, stop and ask the user to close Obsidian rather than risking corruption.

### 5.3 Backup

Before replacement, create a local backup of the currently installed release artifacts only, for example a timestamped folder outside the active plugin directory or a sibling backup folder.

Back up at minimum:

- current `main.js`;
- current `manifest.json`;
- `styles.css` if currently installed and about to be replaced.

Do not move/delete the only copy of `data.json` or other device-local state as part of the backup process.

### 5.4 Replacement

Copy the verified `0.1.8` release artifacts into:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync`

Replace the old `main.js` and `manifest.json` in place.

Use an atomic/safe replacement approach where practical on Windows rather than leaving a partially written runtime artifact.

---

## 6. POST-INSTALL FILESYSTEM VERIFICATION

Before reopening/reloading the plugin, verify:

1. installed `manifest.json` is valid JSON;
2. installed manifest reports version `0.1.8`;
3. installed manifest plugin ID is `brain-google-drive-sync`;
4. installed `main.js` byte size equals the release asset size;
5. installed `main.js` SHA-256 equals the authoritative `0.1.8` release hash;
6. installed `manifest.json` SHA-256 equals the authoritative `0.1.8` release hash;
7. `data.json` SHA-256 is unchanged from pre-update if `data.json` existed;
8. every preserved device-local file remains present;
9. no repository-development files were introduced into the plugin directory;
10. the prior release-artifact backup exists and is readable.

If any integrity or preservation check fails, do not launch the plugin. Restore the previous release artifacts from the backup while leaving device-local state untouched, then report the failure.

---

## 7. DESKTOP OBSIDIAN LOAD CHECK

After filesystem verification succeeds:

1. launch/reopen Obsidian or reload the plugin using the safest available mechanism;
2. confirm the BRAIN vault opens normally;
3. confirm `BRAIN Google Drive Sync` loads without an immediate plugin-load/runtime exception;
4. confirm Obsidian recognizes the installed plugin version as `0.1.8` where the UI exposes version information;
5. confirm existing plugin settings/pairing appear retained rather than reset;
6. confirm the plugin reaches an ordinary status surface rather than failing during initialization.

This task is **not yet the live synchronization validation task**.

Do not click `Sync now` merely because the plugin loaded.
Do not create, delete, rename, or modify vault test data for synchronization in this task.
Do not intentionally alter the Google Drive managed remote.
Do not reauthenticate unless the plugin independently reports that existing authentication is invalid and the supervisor authorizes proceeding into the next physical-validation step.

If the plugin fails to load, preserve all local state and collect only privacy-safe diagnostics sufficient to identify the failure; do not wipe/reinitialize the plugin.

---

## 8. VERIFICATION OF NO LOCAL STATE RESET

Specifically establish that the update did not perform an accidental fresh install.

Where visible/safely inspectable, verify continuity of:

- plugin configuration;
- device identity;
- paired vault/remote identity;
- authentication-state presence (without exposing secret values);
- synchronization/recovery state presence.

Do not claim semantic validity of those states merely because files are present; this task only proves the release update preserved them.

---

## 9. COMPLETION RESPONSE

Return:

- target installation path;
- previous installed version;
- new installed version;
- GitHub `0.1.8` release URL/ID;
- release `main.js` asset ID / size / SHA-256 / GitHub digest if available;
- release `manifest.json` asset ID / size / SHA-256 / GitHub digest if available;
- installed `main.js` size/SHA-256 and exact match result;
- installed `manifest.json` size/SHA-256 and exact match result;
- list of release artifact files replaced;
- list of local device-state/config files preserved by filename only;
- `data.json` preservation result if applicable (`UNCHANGED SHA-256`), but do not report its contents;
- backup location;
- Obsidian/plugin load result;
- whether existing settings/pairing were retained;
- confirmation no live synchronization was initiated;
- any blocker or abnormal condition.

End exactly:

`WINDOWS DESKTOP PLUGIN UPDATED TO 0.1.8 — LOCAL STATE PRESERVED — READY FOR SUPERVISOR-DIRECTED PHYSICAL SYNC VALIDATION`

---

## 10. STOP

Stop after the verified installation and non-mutating load check.

Do not perform live Google Drive synchronization.
Do not begin iPhone installation/update unless separately assigned.
Do not perform performance optimization.
Do not modify repository code.
Do not begin Stage 3.
