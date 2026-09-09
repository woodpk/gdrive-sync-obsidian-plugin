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

R1 fixed the `$PSScriptRoot` parameter-binding defect, but the verifier still exited before creating the disposable directory or launching the watcher.

Confirmed failure:

```text
$PSVersionTable.PSVersion.ToString() + | + $PSVersionTable.PSEdition
                                      ~
You must provide a value expression following the '+' operator.
```

The nested `powershell.exe -Command` runtime query is unnecessary and its quoting is invalid under the actual Windows PowerShell 5.1 command-line path.

## 2. ROOT-CAUSE AUDIT — DO NOT PATCH ONLY THE LAST ERROR

Before editing, inspect the ENTIRE verifier as Windows PowerShell 5.1 code. Treat the following as known/high-probability defects that must be corrected or explicitly disproven before execution:

1. **Nested runtime query** — remove it. The verifier is itself required to run under Windows PowerShell 5.1 Desktop, so assert the current host directly from `$PSVersionTable`.

2. **Backslash is not PowerShell's string escape character.** Audit every string that uses `\"`, `\\`, or similar C/JSON-style escaping. In PowerShell single-quoted strings, backslashes are literal characters. In particular, the current verifier's manually quoted `Start-Process` arguments use forms like `'\"{0}\"'`, which can produce literal backslash-quote sequences rather than valid native-process quoting.

3. **`Start-Process -ArgumentList` quoting** — make subprocess launch robust for repository/temp paths containing spaces and Unicode. Do not rely on an array of incorrectly pre-escaped strings. Use a Windows PowerShell 5.1-safe construction and prove the watcher receives each intended argument exactly. If useful, use `System.Diagnostics.ProcessStartInfo` or one correctly quoted argument string rather than layered quoting.

4. **Path literals with doubled backslashes** — audit expected relative-path strings such as `Nested Space\\子` and `Nested Space\\子\\nested.txt`. In PowerShell these contain two literal separators; the watcher will normally report one separator. Construct paths with `Join-Path` or single `\` separators and compare normalized relative paths.

5. **Synchronous/native exit-code handling** — ensure `$LASTEXITCODE`, process `ExitCode`, `HasExited`, and `Refresh()` are read only in contexts where they are valid and cannot retain stale values from a prior command.

6. **FileSystemWatcher timing/races** — fixed sleeps alone must not make the verifier flaky. Prefer bounded polling/deadlines for required events/log records. Duplicate events are acceptable; missing required semantic events are not.

7. **Unicode/spaces** — verify both script path and disposable paths containing spaces/Unicode survive all process-boundary argument parsing intact.

8. **JSON/CSV parsing on Windows PowerShell 5.1** — validate the actual emitted JSONL and CSV using 5.1-compatible cmdlets/types; do not assume PowerShell 7 behavior.

9. **Stop/cleanup** — ensure stop-flag shutdown, event-subscriber cleanup, watcher disposal, child-process termination checks, and disposable-directory deletion all execute even after a failed assertion.

10. **Privacy/containment** — retain the existing requirements: no absolute validation-root leakage, no plugin-state contents in logs, sibling-prefix (`Vault` vs `Vault-Other`) and normalized `..` escapes rejected, rename old/new paths handled through the same containment helper.

You are authorized to correct ALL verifier-only PowerShell 5.1 plumbing, quoting, timing, assertion, and cleanup defects discovered in this audit in this same task.

Do not stop after the first verifier-only failure. Iterate locally until the verifier reaches every substantive watcher assertion.

## 3. FILE SCOPE

Primary authorized file:

`dev/evidence/2026-09-07T0010-P6LIVE/verify-watchers-windows-powershell.ps1`

Do not change `watchers.ps1` merely to make the verifier pass.

If, after the verifier itself is demonstrably sound, execution reaches the actual watcher and proves a genuine watcher defect, STOP and report that exact defect. Do not silently broaden scope into watcher changes.

## 4. REQUIRED WINDOWS VERIFICATION

Run the final verifier under the machine's actual Windows PowerShell 5.1 Desktop runtime.

The verifier must reach and exercise all substantive scenarios:

- current-host runtime assertion: Windows PowerShell 5.1 / Desktop;
- watcher subprocess launch with paths containing spaces/Unicode;
- create event;
- change event;
- rename event with correct old/new relative paths;
- delete event;
- nested Unicode/spaced path;
- sibling-prefix containment rejection;
- normalized escape/outside-root rejection;
- plugin-state size/SHA-256 telemetry without content leakage;
- resource CSV sampling;
- stop-flag shutdown;
- watcher clean exit;
- event subscriber/watcher cleanup;
- disposable directory cleanup;
- no absolute validation-root leakage;
- no unsupported `Path.GetRelativePath` runtime exception.

PASS requires:

- verifier exit code `0`;
- JSON result `PASS`;
- every substantive assertion actually reached;
- no hidden/ignored stderr exception;
- no surviving watcher process or disposable verification directory.

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
- substantive assertion/event counts;
- watcher process exit/cleanup result;
- confirmation working tree is clean;
- confirmation no real BRAIN sync, Google Drive mutation, reset, reinstall, reauthentication, B01, later B–O, or Stage 3 work occurred.

If all assertions pass, end exactly:

`PHASE 6 WINDOWS WATCHER COMPATIBILITY REPAIR R2 VERIFIED PASS — READY FOR SUPERVISOR REVIEW — B01 NOT STARTED`

If a genuine watcher defect is reached, end exactly:

`PHASE 6 WINDOWS WATCHER COMPATIBILITY REPAIR R2 BLOCKED — GENUINE WATCHER DEFECT — SUPERVISOR DECISION REQUIRED — B01 NOT STARTED`
