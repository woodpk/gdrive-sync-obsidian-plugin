[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$RepoRoot,
    [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedSha
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$branch = 'build/dec339-step6-metadata-bvp-20261124'
$base = '62fb2632017c0744f16fe95467d39d35ae655b16'
$pin = '4cf0c865c7b189641e2acebc0a6ad757b6f01992'
$focused = 'node node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test ".test-build/tests/**/dec339-*.test.js" ".test-build/tests/adversarial/plugin-data-integrity-regression.test.js" ".test-build/tests/adversarial/s09-g1-runtime-authority-interleavings.test.js"'
$oldPath = $env:Path
$oldExt = $env:PATHEXT
$oldPurpose = $env:BRAIN_ARTIFACT_PURPOSE
$log = Join-Path 'C:\temp' ('DEC339-BU01-' + [guid]::NewGuid().ToString('N') + '.log')
$transcribing = $false
$lock = $null
$nativeExit = $null
$status = 'NOT EXECUTED'
try {
    Start-Transcript -Path $log | Out-Null
    $transcribing = $true
    $task = Get-Command task.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    $taskPath = if ($task) { $task.Source } else { Join-Path $env:USERPROFILE '.dotnet\tools\task.exe' }
    if (-not (Test-Path -LiteralPath $taskPath -PathType Leaf)) { throw 'Task executable unavailable' }
    $taskDir = Split-Path $taskPath -Parent
    $env:Path = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Windows\System32;C:\Windows;C:\Program Files\PowerShell\7;C:\Program Files\dotnet;$taskDir"
    $env:PATHEXT = '.COM;.EXE;.BAT;.CMD'
    $env:BRAIN_ARTIFACT_PURPOSE = 'development'
    Write-Host "Task executable: $taskPath"
    Write-Host "PATH length: $($env:Path.Length)"
    $lock = [IO.File]::Open((Join-Path (Split-Path $RepoRoot -Parent) 'operator.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    $operator = Join-Path $env:LOCALAPPDATA "PHX-CI\runtimes\$pin\scripts\Invoke-PhxCi.ps1"
    if (-not (Test-Path -LiteralPath $operator -PathType Leaf)) { throw 'Pinned PHX-CI runtime missing' }
    $remote = & git.exe -C $RepoRoot remote get-url origin
    if ($LASTEXITCODE -ne 0 -or $remote -ne 'https://github.com/woodpk/gdrive-sync-obsidian-plugin.git') { throw 'Repository identity mismatch' }
    $dirty = @(& git.exe -C $RepoRoot status --porcelain=v1 --untracked-files=all)
    if ($LASTEXITCODE -ne 0 -or $dirty.Count -ne 0) { throw 'Control checkout is not clean' }
    $head = & git.exe -C $RepoRoot rev-parse HEAD
    if ($LASTEXITCODE -ne 0 -or $head -ne $ExpectedSha) { throw 'Control checkout SHA mismatch' }
    $config = Get-Content -LiteralPath (Join-Path $RepoRoot 'phx-ci.json') -Raw | ConvertFrom-Json
    if ($config.repositoryIdentity -ne 'woodpk/gdrive-sync-obsidian-plugin' -or $config.framework.sha -ne $pin -or $config.framework.pinPolicy -ne 'exact') { throw 'PHX-CI configuration identity mismatch' }
    $ref = @(& git.exe -C $RepoRoot ls-remote --exit-code --refs origin "refs/heads/$branch")
    if ($LASTEXITCODE -ne 0 -or $ref.Count -ne 1 -or ($ref[0] -split '\s+')[0] -ne $ExpectedSha) { throw 'Remote candidate SHA changed' }
    & 'C:\Program Files\PowerShell\7\pwsh.exe' -NoLogo -NoProfile -File $operator -RepoRoot $RepoRoot -Branch $branch -BaseRef $base -FocusedTestCommand $focused -PublicationMode push
    $nativeExit = $LASTEXITCODE
    $status = if ($nativeExit -eq 0) { 'PHX-CI PASS' } else { 'PHX-CI NON-SUCCESS' }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($null -ne $lock) { $lock.Dispose() }
    $env:Path = $oldPath
    $env:PATHEXT = $oldExt
    $env:BRAIN_ARTIFACT_PURPOSE = $oldPurpose
    Write-Host '========== BU-01 CORRECTION VERIFICATION SUMMARY =========='
    [pscustomobject]@{
        Overall = $status
        Source = $ExpectedSha
        Runtime = $pin
        NativeExit = $nativeExit
        Transcript = $log
    } | Format-List
    if ($transcribing) { Stop-Transcript | Out-Null }
}
