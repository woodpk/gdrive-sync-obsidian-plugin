# Phase 6 live clean-state reset + baseline revalidation

## Agent
`codex-desktop-p6-clean-state-reset-01`

## Goal
Clear only the obsolete synchronization authority that blocked `P6-LIVE-A03`, while preserving the installed `0.1.8` plugin, `data.json`, OAuth/SecretStorage, vault/device identities, remote pairing, settings, and vault content. Then rerun only baseline checks A01–A03.

This is an **environment repair**, not a source-code repair. Minimize investigation and output. Do not modify the repository, plugin source, release assets, or ordinary BRAIN content.

## Known-good installed files
Directory:
`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync`

Contains exactly:
- `main.js`
- `manifest.json`
- `data.json`

Expected release:
- version `0.1.8`
- `main.js` SHA-256 `da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`
- `manifest.json` SHA-256 `f5860b515a5f8a6fa195d81e5f9741e6e6b5ac81b29401e64ad171275eeda477`

Current `data.json` already has:
- `firstSyncCompleted=false`
- `recoveryInProgress=false`
- configured OAuth client/redirect
- existing `vaultIdentity`, `deviceIdentity`, and `remoteRootId`

**Do not delete or manually edit `data.json`. Do not clear Obsidian SecretStorage. Do not reauthenticate unless the preserved credentials independently prove unusable.**

## Exact state to reset
Current runtime uses IndexedDB database:
`brain-google-drive-sync:vault:658641f0-a189-4e10-b076-4f6ab92087ed:device:b95a836c5e2dd07d478c33a26eda9daa`

Object store:
`sync-state`

Obsolete active key:
`current-state`

Do not delete the database, object store, unrelated backup keys, text-version databases, or any other browser storage.

## Procedure

1. **Stop synchronization activity.** Disable the BRAIN Google Drive Sync plugin in Obsidian (or otherwise ensure its runtime is unloaded). Do not uninstall it.

2. **Preservation proof.** Record SHA-256 for `main.js`, `manifest.json`, and `data.json`. Make an external backup copy of `data.json` only as a precaution. Do not expose OAuth secrets/tokens in evidence.

3. **Reset atomically through the browser IndexedDB API.** Do **not** manipulate Electron LevelDB/IndexedDB files on disk.

   Open the exact database above, start one `readwrite` transaction on `sync-state`, read `current-state`, and require that it exists. In the same transaction:
   - write the exact existing value to a unique backup key such as `reset-backup:<UTC timestamp>`;
   - delete only `current-state`.

   Require transaction completion. Then read back and prove:
   - `current-state` is absent;
   - the new backup key exists;
   - no other keys were intentionally changed/deleted.

   If the exact database/store/key cannot be resolved confidently, **STOP** rather than guessing.

4. **Preservation proof before reload.** While the plugin remains disabled/quiescent, require the three plugin-directory file hashes to match step 2 exactly. In particular, `data.json` must be byte-identical across the reset itself.

5. **Reload/re-enable the plugin.** Do not click Authenticate. Confirm runtime initializes and the existing configured vault/device/remote identities remain present. Confirm preserved authentication works by a non-destructive Drive-backed operation; if credentials fail naturally, report that separately rather than clearing them.

6. **Rerun only A01–A03 from the prior live campaign.** Do not run later mutation scenarios yet.
   - **A01:** installed `0.1.8` identity/hashes still match.
   - **A02:** runtime initializes with preserved configuration/authentication.
   - **A03:** run `Verify/Reconcile Vault` and inspect the resulting plan/diagnostics.

   Required A03 success condition: the runtime must no longer fail immediately because of the legacy pre-authority state. It should treat persistence as current-architecture uninitialized/new-installation state and produce the safe first-sync/reconciliation behavior defined by the current product.

   **Do not execute any destructive operation.** If A03 presents any destructive or unexpectedly broad action, stop and report it. If the preview is safe but requires explicit execution to establish the trustworthy first-sync baseline, stop at the preview and return the exact operation summary for supervisor authorization.

## Hard prohibitions
- no repository/source changes
- no new release/build
- no `data.json` deletion/manual editing
- no SecretStorage/token clearing
- no deauthorization/re-pairing unless separately authorized
- no deletion of the IndexedDB database/store
- no raw LevelDB-file manipulation
- no ordinary BRAIN file mutation
- no iPhone testing yet
- no full automated test suite
- no broad exploratory debugging unless this exact reset fails

## Output
Return only:
1. reset result (`PASS`/`FAIL`);
2. backup key created;
3. before/after plugin-file hash preservation result;
4. auth/pairing continuity result;
5. A01/A02/A03 results;
6. A03 plan operation counts/types if a preview is produced;
7. exact blocker if anything fails.

Success terminator:
`PHASE 6 CLEAN-STATE RESET PASS — 0.1.8 PRESERVED — AUTH/PAIRING PRESERVED — A03 READY FOR SUPERVISOR DECISION`
