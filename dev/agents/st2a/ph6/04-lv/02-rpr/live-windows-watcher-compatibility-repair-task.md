# PHASE 6 LIVE VALIDATION — WINDOWS WATCHER COMPATIBILITY REPAIR

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-live-watcher-compat-repair-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Authoritative task input / current accepted A03 evidence head:

`9a83ec9396bff483bd34be468a188c5e77111ba9`

Your assignment is to repair and verify the Windows live-validation watcher used for Phase 6 physical testing so it works under the actual Windows PowerShell runtime available on the validation desktop.

This is **validation-tooling repair only**.

Do not modify product source.
Do not modify synchronization tests.
Do not change release/install artifacts.
Do not perform live synchronization.
Do not mutate Google Drive.
Do not reset plugin state.
Do not reauthenticate.
Do not begin B01 or later B–O validation.
Do not begin Stage 3.

---

## 1. CONFIRMED DEFECT

During accepted A03 `0.1.11` physical validation, the watcher launched but failed on its first filesystem event because Windows PowerShell did not provide:

`[System.IO.Path]::GetRelativePath(...)`

The current watcher is:

`dev/evidence/2026-09-07T0010-P6LIVE/watchers.ps1`

The failure degraded local side-effect telemetry for A03, although A03 remained independently provable by other evidence.

The repair must make the watcher compatible with the actual Windows PowerShell runtime used on the desktop without requiring PowerShell 7 merely to run Phase 6 monitoring.

---

## 2. REQUIRED BEHAVIOR

Preserve the watcher’s existing purpose:

- recursively observe the designated validation/vault path;
- record created/changed/deleted/renamed events as JSONL;
- record paths relative to the validation root;
- record the old relative path for rename events;
- monitor plugin `data.json` creation/change/rename without exposing its contents;
- record only size and SHA-256 for plugin state observations;
- sample Obsidian process/resource information periodically;
- stop cleanly when `stop-watchers.flag` appears;
- unregister event subscribers and dispose watchers during cleanup.

The repaired watcher must not:

- read or log vault file contents;
- print OAuth tokens, client secrets, or raw plugin state;
- modify the monitored vault/plugin data except for evidence files under the explicitly supplied evidence directory;
- trigger synchronization or Obsidian actions.

---

## 3. REQUIRED COMPATIBILITY REPAIR

Replace the unsupported `System.IO.Path.GetRelativePath` dependency with the smallest correct compatibility implementation.

Preferred characteristics:

1. works in Windows PowerShell 5.1 / .NET Framework-era runtime;
2. handles ordinary child files/directories correctly;
3. handles renamed old/new paths correctly;
4. normalizes output to a stable relative path without silently accepting a path outside the requested validation root;
5. does not use naïve string replacement that can misclassify sibling prefixes such as `C:\Vault` versus `C:\Vault-Other`;
6. remains safe for spaces and Unicode path components;
7. does not introduce an external dependency.

A bounded helper based on normalized full paths / URI-relative-path semantics or another demonstrably correct Windows PowerShell-compatible method is acceptable.

If an observed event path cannot safely be reduced to a path beneath `ValidationPath`, fail closed for that event by recording a clear non-secret error/containment indicator rather than inventing a relative path.

Do not redesign the monitoring architecture.

---

## 4. SCOPE

Primary authorized tooling file:

`dev/evidence/2026-09-07T0010-P6LIVE/watchers.ps1`

You may add **one directly necessary validation script or fixture under `dev/evidence/`** if needed to prove compatibility without touching real vault state.

Do not modify:

- `src/**`;
- `test/**` product tests;
- `manifest.json`;
- `package.json`;
- release branches/tags/assets;
- physical plugin installation files;
- actual synchronization state.

Do not rewrite historical A03 evidence files.

---

## 5. SYNTHETIC VERIFICATION — REQUIRED BEFORE ANY LATER LIVE TEST

Verify the repaired watcher against disposable temporary directories only.

At minimum:

1. create a temporary validation root and temporary plugin-data file;
2. create a separate temporary evidence directory;
3. start the watcher under the same Windows PowerShell executable/runtime that failed during A03;
4. generate controlled filesystem events inside the temporary validation root:
   - create file;
   - change file;
   - rename file;
   - create nested directory/file;
   - delete file;
5. change the temporary plugin-data file;
6. create `stop-watchers.flag` and verify clean shutdown;
7. inspect generated evidence.

Required proof:

- watcher remains running through the generated events;
- `filesystem-events.jsonl` contains valid JSON records;
- relative paths are correct and do not contain the absolute validation root;
- rename record contains correct old and new relative paths;
- nested paths are correct;
- plugin-state log records event/size/SHA-256 but no file contents;
- `resource-samples.csv` remains valid;
- no `GetRelativePath` runtime exception occurs;
- cleanup leaves no lingering watcher event subscriptions/processes attributable to the test;
- disposable test directories can be removed after verification.

Also exercise at least one sibling-prefix containment case to prove the compatibility helper does not treat a path outside the root as a legitimate child.

Do not point this synthetic verification at the real BRAIN vault.

---

## 6. REPOSITORY / EVIDENCE RULE

Work from exactly:

`9a83ec9396bff483bd34be468a188c5e77111ba9`

Create a bounded repair branch, suggested:

`phase6-live-windows-watcher-compat-repair`

Do not commit directly to `phase6-integration`.

Commit only the authorized validation-tooling change(s) and concise non-secret verification evidence if appropriate.

Do not merge the repair branch.
Do not create a release.
Do not install anything.

Return the repair HEAD for supervisor review.

---

## 7. ACCEPTANCE CRITERIA

PASS only if all are true:

- Windows PowerShell compatibility defect is removed;
- synthetic create/change/rename/delete/nested-path monitoring works;
- containment/relative-path handling is correct;
- plugin-data monitoring remains content-blind;
- resource sampling still works;
- clean stop/cleanup works;
- no production source/test/release/install/live-sync change occurs.

If any requirement cannot be proven, stop and report the blocker. Do not compensate by beginning B01 without working telemetry.

---

## 8. COMPLETION RESPONSE

Return:

- agent identity;
- exact input SHA;
- repair branch;
- final repair HEAD;
- exact changed-file manifest;
- concise root-cause/fix explanation;
- Windows PowerShell version used for verification;
- synthetic actions performed;
- event-log verification summary;
- containment/sibling-prefix test result;
- plugin-data privacy result;
- cleanup result;
- confirmation no real BRAIN synchronization or Drive mutation occurred;
- confirmation B01/B–O/Stage 3 were not started;
- any blocker.

End exactly:

`PHASE 6 WINDOWS WATCHER COMPATIBILITY REPAIR COMPLETE — READY FOR SUPERVISOR REVIEW — LIVE B01 NOT STARTED`

---

## 9. STOP

Stop after watcher repair and disposable verification.

Do not begin B01.
Do not perform live synchronization.
Do not begin Stage 3.
