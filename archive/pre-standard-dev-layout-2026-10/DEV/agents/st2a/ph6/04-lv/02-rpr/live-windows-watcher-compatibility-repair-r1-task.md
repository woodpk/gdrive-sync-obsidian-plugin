# PHASE 6 LIVE VALIDATION — WINDOWS WATCHER COMPATIBILITY REPAIR R1

## 0. AGENT / SCOPE

Agent: `codex-desktop-p6-live-watcher-compat-repair-r1-01`

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Exact rejected repair input:

`R1_INPUT_SHA = 6072fb55294a0807b43e002e2fc128613c44265e`

Create a repair branch from exactly that SHA. Do not substitute a branch tip.

This is a tiny validation-tooling correction only. Do not modify product source/tests/releases/install artifacts. Do not perform B01, live synchronization, Google Drive mutation, reset, reinstall, reauthentication, or Stage 3 work.

## 1. CONFIRMED FAILURE

The required Windows runtime verification was executed on the validation desktop under:

- Windows PowerShell `5.1.26100.9168`
- `PSEdition = Desktop`

The verifier failed before creating its disposable directory or watcher process:

`Join-Path : Cannot bind argument to parameter 'Path' because it is an empty string.`

Failure location: the parameter default in:

`dev/evidence/2026-09-07T0010-P6LIVE/verify-watchers-windows-powershell.ps1`

where `WatcherPath` defaults using `Join-Path $PSScriptRoot 'watchers.ps1'` during parameter binding.

The working tree remained clean and no real-world mutation occurred.

## 2. REQUIRED CORRECTION

Make the minimum Windows PowerShell 5.1-compatible correction so the default watcher path is resolved only after the script parameter block has completed and `$PSScriptRoot` is available.

Preferred shape:

- make `WatcherPath` optional without evaluating `Join-Path $PSScriptRoot ...` in its default expression;
- immediately after `param(...)`, if `WatcherPath` is null/empty, set it from `Join-Path -Path $PSScriptRoot -ChildPath 'watchers.ps1'`;
- preserve explicit caller-supplied `WatcherPath` behavior.

Do not weaken any verifier assertion.
Do not bypass the Windows PowerShell 5.1/Desktop gate.
Do not remove disposable cleanup, containment, event, privacy, resource, stop-flag, or absolute-path-leakage checks.

Unless actual execution exposes a separate watcher defect, do not modify `watchers.ps1` in this R1 correction.

## 3. REQUIRED WINDOWS VERIFICATION

On the actual validation Windows desktop, from the exact corrected repair HEAD, run:

`dev/evidence/2026-09-07T0010-P6LIVE/verify-watchers-windows-powershell.ps1`

using the machine's Windows PowerShell 5.1 Desktop runtime.

Require:

- PowerShell version begins `5.1.`;
- `PSEdition = Desktop`;
- verifier exits `0` and returns `result = PASS`;
- create/change/rename/delete assertions pass;
- nested Unicode/spaced path assertion passes;
- sibling-prefix containment rejection passes;
- plugin-state size/SHA-only privacy assertion passes;
- resource sampling assertion passes;
- stop-flag clean shutdown passes;
- no absolute validation-root leakage appears in the filesystem log;
- disposable directory is removed;
- no real BRAIN vault or Google Drive mutation occurs.

If verification fails, stop and report the exact failure. Do not begin B01.

## 4. COMPLETION REPORT

Return:

- exact input SHA;
- repair branch and final HEAD;
- changed-file manifest;
- Windows PowerShell exact version/edition;
- verifier exit code/result;
- substantive verifier assertions/results;
- cleanup result;
- confirmation no product/source/test/release/install files changed;
- confirmation no live sync/Drive mutation/reset/reinstall/reauth/B01/Stage 3 occurred.

End on success:

`PHASE 6 WINDOWS WATCHER COMPATIBILITY REPAIR R1 COMPLETE — WINDOWS POWERSHELL 5.1 VERIFICATION PASS — READY FOR SUPERVISOR REVIEW`

## 5. STOP

Stop after the Windows verifier result. Do not begin B01.