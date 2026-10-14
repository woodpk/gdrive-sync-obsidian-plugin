# PHASE 6 REAL-PLATFORM VALIDATION — DESKTOP CODEX INSTALL TASK

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-install-0.1.8-01`

Your assignment is to update the already-installed BRAIN Google Drive Sync Obsidian plugin on the Windows desktop from the current installed prerelease to the published GitHub prerelease `0.1.8`, while preserving all device-local plugin data, authentication state, synchronization state, and user configuration.

This is an **installation/update task**, not a coding task and not a repository-integration task.

Do not modify repository source code.
Do not change synchronization behavior.
Do not delete or reset plugin data.
Do not begin Stage 3.
Do not perform any destructive Google Drive synchronization action merely to prove installation.
Do not checkout, reset, merge, rebase, cherry-pick, or otherwise mutate repository branches as part of this task.

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

Use the published GitHub release assets as the installation authority.

Do not install from a development branch, integration branch, local build, or arbitrary repository checkout when the authoritative `0.1.8` release assets exist.

---

## 2. AUTHORITATIVE RELEASE / BRANCH STATE

The cloud release task is complete and independently supervisor-reviewed.

### 2.1 Phase 6 branch/reorganization context

The user reorganized repository planning/tasking material after the original release-input point.

Use the following as provenance context only:

- H-FINAL source/test authority: `cb0c81b2ddb941446f821d71274aa58af28007ec`
- H-FINAL closure authority: `669e01273acc55def047da4b9d9a0532726d68c0`
- reconciled Phase 6 integration reference after the user's directory/tasking reorganization: `1e30616ca928dc8664e47525301c50cfc6bc7048`
- release preparation commit: `371b18f5574ef4ed56cd5f22c4a2cea26fae8c95`
- final release evidence commit: `aa96b63c86a01d288a10e0369720ce7f29dcc31d`
- release branch: `phase6-real-platform-release-0.1.8`

The release preparation commit was based on an earlier authorized release-input ancestor. Independent comparison from that release-input ancestor through the reconciled Phase 6 integration reference shows only `dev/**` tasking/evidence/reorganization changes, including moves into `dev/agents/**`; it shows no `src/**`, `test/**`, `src/contracts/**`, or `scripts/**` product-behavior changes.

Therefore the branch reorganization does **not** invalidate the published `0.1.8` product artifacts.

Do not rebuild `0.1.8` from the newer integration branch merely to align commit ancestry.
Do not treat later task-prompt/evidence-only commits as product drift.

### 2.2 Exact GitHub prerelease authority

Authoritative release:

- tag: `0.1.8`
- tag target: `371b18f5574ef4ed56cd5f22c4a2cea26fae8c95`
- release ID: `383806642`
- release URL: `https://github.com/woodpk/gdrive-sync-obsidian-plugin/releases/tag/0.1.8`
- title: `0.1.8 — Phase 6 H-FINAL Physical Validation Build`
- `prerelease=true`
- `draft=false`

Authoritative assets:

### `main.js`

- asset ID: `548067614`
- size: `699431` bytes
- SHA-256: `da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`
- GitHub digest: `sha256:da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`

This `main.js` hash is the exact already-approved H-FINAL production artifact hash.

### `manifest.json`

- asset ID: `548067617`
- size: `275` bytes
- SHA-256: `f5860b515a5f8a6fa195d81e5f9741e6e6b5ac81b29401e64ad171275eeda477`
- GitHub digest: `sha256:f5860b515a5f8a6fa195d81e5f9741e6e6b5ac81b29401e64ad171275eeda477`

### 2.3 GitHub Actions status clarification

Two cloud verification workflows have an aggregate GitHub conclusion of `failure`, but the failures occurred only in later evidence-commit/branch-normalization plumbing after the release verification steps succeeded.

For run `34078499227`:

- exact SHA/drift gates — PASS
- dependency install — PASS
- typecheck — PASS
- test TypeScript compilation — PASS
- complete repository tests — PASS
- production build — PASS
- full repository check — PASS
- release asset identity — PASS
- tag/prerelease creation — PASS
- independent published-asset verification — PASS
- later evidence-commit/branch-normalization step — FAIL

For run `34078857654`:

- exact SHA/release/branch gates — PASS
- clean verification — PASS
- independent existing-published-asset verification — PASS
- later evidence-commit/branch-normalization step — FAIL

The evidence-plumbing issue was superseded by the direct final evidence commit:

`aa96b63c86a01d288a10e0369720ce7f29dcc31d`

The supervisor independently reviewed this condition and accepted the release for physical validation.

Do **not** reject or rebuild `0.1.8` merely because those workflow runs display an overall red/failure conclusion.

---

## 3. START GATE

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
9. confirm the tag still targets exactly `371b18f5574ef4ed56cd5f22c4a2cea26fae8c95`;
10. record the GitHub release URL/ID, asset IDs, sizes, and digests;
11. independently compute SHA-256 for the downloaded `main.js` and `manifest.json` and require exact equality to the authoritative values in Section 2.2.

If the release is missing, the tag target differs, the plugin ID differs, version is not `0.1.8`, asset integrity does not match, or the installed path cannot be verified, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not substitute another release.
Do not install `0.1.7` again.
Do not build your own replacement from repository source unless explicitly reauthorized.

---

## 4. CRITICAL LOCAL-STATE PRESERVATION RULE

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

## 5. FILES AUTHORIZED TO REPLACE

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

## 6. SAFE UPDATE PROCEDURE

Perform the update conservatively.

### 6.1 Pre-update evidence

Before changing files, record:

- exact directory path;
- current directory listing;
- current installed version;
- SHA-256 and size of current `main.js` and `manifest.json` if present;
- names of preserved device-local files;
- SHA-256 of `data.json` if it exists, for preservation verification only — do not expose its contents because it may contain sensitive configuration or token-related material.

Do not print or copy secret values into logs or the completion response.

### 6.2 Obsidian process safety

If Obsidian is running, avoid replacing plugin runtime files while the plugin is actively loaded unless the environment can safely disable/unload the plugin first.

Preferred order:

1. save any open vault work;
2. disable/unload the `BRAIN Google Drive Sync` plugin in Obsidian if safely automatable, otherwise ensure Obsidian is closed before file replacement;
3. replace the release artifacts;
4. restart/reload Obsidian only after filesystem verification succeeds.

Do not forcibly terminate Obsidian if doing so risks unsaved user work.
If safe unload/close cannot be established automatically, stop and ask the user to close Obsidian rather than risking corruption.

### 6.3 Backup

Before replacement, create a local backup of the currently installed release artifacts only, for example a timestamped folder outside the active plugin directory or a sibling backup folder.

Back up at minimum:

- current `main.js`;
- current `manifest.json`;
- `styles.css` if currently installed and about to be replaced.

Do not move/delete the only copy of `data.json` or other device-local state as part of the backup process.

### 6.4 Replacement

Copy the verified `0.1.8` release artifacts into:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync`

Replace the old `main.js` and `manifest.json` in place.

Use an atomic/safe replacement approach where practical on Windows rather than leaving a partially written runtime artifact.

---

## 7. POST-INSTALL FILESYSTEM VERIFICATION

Before reopening/reloading the plugin, verify:

1. installed `manifest.json` is valid JSON;
2. installed manifest reports version `0.1.8`;
3. installed manifest plugin ID is `brain-google-drive-sync`;
4. installed `main.js` size is exactly `699431` bytes;
5. installed `main.js` SHA-256 is exactly `da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`;
6. installed `manifest.json` size is exactly `275` bytes;
7. installed `manifest.json` SHA-256 is exactly `f5860b515a5f8a6fa195d81e5f9741e6e6b5ac81b29401e64ad171275eeda477`;
8. `data.json` SHA-256 is unchanged from pre-update if `data.json` existed;
9. every preserved device-local file remains present;
10. no repository-development files were introduced into the plugin directory;
11. the prior release-artifact backup exists and is readable.

If any integrity or preservation check fails, do not launch the plugin. Restore the previous release artifacts from the backup while leaving device-local state untouched, then report the failure.

---

## 8. DESKTOP OBSIDIAN LOAD CHECK

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

## 9. VERIFICATION OF NO LOCAL STATE RESET

Specifically establish that the update did not perform an accidental fresh install.

Where visible/safely inspectable, verify continuity of:

- plugin configuration;
- device identity;
- paired vault/remote identity;
- authentication-state presence without exposing secret values;
- synchronization/recovery state presence.

Do not claim semantic validity of those states merely because files are present; this task only proves the release update preserved them.

---

## 10. COMPLETION RESPONSE

Return:

- target installation path;
- previous installed version;
- new installed version;
- GitHub `0.1.8` release URL/ID;
- confirmed tag target;
- release `main.js` asset ID / size / SHA-256 / GitHub digest;
- release `manifest.json` asset ID / size / SHA-256 / GitHub digest;
- installed `main.js` size/SHA-256 and exact match result;
- installed `manifest.json` size/SHA-256 and exact match result;
- list of release artifact files replaced;
- list of local device-state/config files preserved by filename only;
- `data.json` preservation result if applicable (`UNCHANGED SHA-256`), but do not report its contents;
- backup location;
- Obsidian/plugin load result;
- whether existing settings/pairing were retained;
- confirmation no live synchronization was initiated;
- confirmation no repository branch mutation was performed;
- any blocker or abnormal condition.

End exactly:

`WINDOWS DESKTOP PLUGIN UPDATED TO 0.1.8 — LOCAL STATE PRESERVED — READY FOR SUPERVISOR-DIRECTED PHYSICAL SYNC VALIDATION`

---

## 11. STOP

Stop after the verified installation and non-mutating load check.

Do not perform live Google Drive synchronization.
Do not begin iPhone installation/update unless separately assigned.
Do not perform performance optimization.
Do not modify repository code.
Do not mutate repository branches.
Do not begin Stage 3.
