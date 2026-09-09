# PHASE 6 LIVE VALIDATION — WINDOWS WATCHER COMPATIBILITY REPAIR R2

## 0. AGENT / SCOPE

Execute on the Windows validation desktop with Codex.

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Exact R2 input SHA:

`08b9605a2d9976092f3a8c65f6bc2df420ac989f`

Create/use repair branch:

`codex/phase6-windows-watcher-compat-repair-r2`

This is verifier/tooling repair only.

Do not modify product source, product tests, release/install artifacts, plugin state, Google Drive, authentication, or synchronization behavior.
Do not start B01 or any later B–O validation.
Do not begin Stage 3.

## 1. CONFIRMED R1 FAILURE

The prior R1 successfully fixed the `$PSScriptRoot` parameter-binding problem, but the verifier still exits before creating the disposable directory or launching the watcher.

Confirmed failure:

```text
$PSVersionTable.PSVersion.ToString() + | + $PSVersionTable.PSEdition
                                      ~
You must provide a value expression following the '+' operator.
```

The verifier's nested `powershell.exe -Command` runtime query loses the quoted `"|"` argument during command-line parsing.

## 2. REQUIRED CORRECTION

Keep the correction bounded to:

`dev/evidence/2026-09-07T0010-P6LIVE/verify-watchers-windows-powershell.ps1`

Do not change `watchers.ps1` unless execution reaches the actual watcher and proves a separate watcher defect; if that occurs, STOP and report it rather than silently broadening scope.

Remove the fragile nested `powershell.exe -Command` runtime-version query.

Because the verifier itself is required to be launched under the actual Windows PowerShell 5.1 Desktop runtime, validate the current host directly with `$PSVersionTable`, for example by deriving the version and edition from the verifier process itself and asserting:

- version starts with `5.1.`;
- edition is `Desktop`.

Continue to use `%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe` when the verifier intentionally launches the watcher subprocess.

## 3. AVOID ANOTHER ONE-ERROR LOOP

Before rerunning, inspect the complete verifier for Windows PowerShell 5.1 command-line/quoting compatibility, especially:

- `Start-Process -ArgumentList` construction;
- paths containing spaces and Unicode;
- nested process invocation;
- JSON parsing;
- stop-flag shutdown;
- cleanup and exit-code handling.

You are authorized to correct additional **verifier-only plumbing/quoting defects** discovered during this R2 execution so the verifier can reach and execute all substantive watcher assertions in one task.

Do not stop after each verifier-harness defect if it is plainly verifier-only and can be corrected without touching product code or watcher behavior. Iterate locally on the verifier until either:

1. all substantive watcher assertions execute and PASS; or
2. execution reaches the actual watcher and reveals a genuine watcher defect or another condition that would require changing `watchers.ps1` or broader scope.

If case 2 occurs, stop and report the exact failure without changing `watchers.ps1`.

## 4. REQUIRED WINDOWS VERIFICATION

Run the final verifier from exact R2 repair HEAD under the actual Windows PowerShell 5.1 Desktop runtime.

The verifier must reach and exercise all of its substantive scenarios, including at minimum:

- create event;
- change event;
- rename event with old/new relative paths;
- delete event;
- nested Unicode/spaced path;
- sibling-prefix containment rejection (`Vault` vs `Vault-Other`);
- plugin-state size/SHA-256 telemetry without content leakage;
- resource CSV sampling;
- stop-flag shutdown;
- watcher process clean exit;
- disposable cleanup;
- no absolute validation-root leakage;
- no `GetRelativePath` runtime exception.

PASS requires verifier exit code `0` and JSON result `PASS`.

## 5. COMPLETION REPORT

Return:

- exact input SHA;
- repair branch;
- final repair HEAD and parent;
- exact changed-file manifest;
- concise description of every verifier-only correction made;
- Windows PowerShell version and edition;
- verifier exit code;
- verifier JSON result;
- substantive assertion summary/counts;
- watcher process exit/cleanup result;
- confirmation working tree is clean;
- confirmation no real BRAIN sync, Google Drive mutation, reset, reinstall, reauthentication, B01, later B–O, or Stage 3 work occurred.

If all assertions pass, end exactly:

`PHASE 6 WINDOWS WATCHER COMPATIBILITY REPAIR R2 VERIFIED PASS — READY FOR SUPERVISOR REVIEW — B01 NOT STARTED`

If execution reaches a genuine watcher defect or otherwise cannot complete without broader scope, end exactly:

`PHASE 6 WINDOWS WATCHER COMPATIBILITY REPAIR R2 BLOCKED — SUPERVISOR DECISION REQUIRED — B01 NOT STARTED`
