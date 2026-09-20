[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Repo = "woodpk/gdrive-sync-obsidian-plugin"
$MasterSha = "b1b3a4bd70cd14be49ae9085a8305f5825fccf4f"
$TagPrefix = "archive/branch-cleanup-20260920"

$Frozen = [ordered]@{
    "archive/phase6-legacy-history" = "3bf5aa979c3c60f81f6bc35a013207f2ccf18c64"
    "ci-3-phx-ci-obsidian-pilot" = "67a37b1743fd046ac95791fd33486378606f8622"
    "ci-4-split-verification-status" = "00627e6e6f3d670bbf6555303b451a69d9faf4ad"
    "phase6-vh14-module-integration-runner" = "8c3d6e79db0d7dcf882d0a66a9bbd8b39bc3a30b"
    "phase6-vh15-r2-promotion-tooling" = "11933c2951c28c97e0a900e66c369bfb98bbbb09"
    "phase6-vh15-r2-run-scoped-plan-handoff" = "fbe9dfca58840e49ebcb3a14b97d4c569770cf6e"
    "phase6-vh15-r3-runtime-derived-plan-identity-binding" = "a3e222379b52bfce38682f4059445a3a6c8dac1b"
    "phase6-vh15-validation-mode-runtime-canary" = "fbe9dfca58840e49ebcb3a14b97d4c569770cf6e"
    "phase6-vh16-c03-scenario" = "90e6e0ad6121e32e426828126840ebaeb2a24cb7"
    "phase6-vh16-c03-scenario-correction-01" = "6f9b5a0225c5bce5c07bedb7904edca39035f242"
    "phase6-vh17-c04-scenario" = "b01275262e97cfa66ac9e38844e3b4af77877167"
    "phase6-vh17-c04-scenario-correction-01" = "68ce67099c18e3f8830d4efebb144706471a7814"
    "phase6-vh18-c05-scenario" = "dce455831e430ef1a24377372863ef2d1ad54f6a"
    "phase6-vh18-c05-scenario-correction-01" = "70ba6d6bf0da537b630e8642d84823daeeb624f5"
    "phase6-vh19-c06-scenario" = "c69342b4ac4a9cdc000a75cd39e97aca5af36ca6"
    "phase6-vh19-c06-scenario-correction-01" = "fb983f9a67523b625998df7bf5a6dba870e5bb47"
    "phase6-vh20-c07-scenario" = "98d7507baab230f4dfd4caeea3a6e67198b66bfe"
    "phase6-vh20-c07-scenario-correction-01" = "ffeedf1cbfd334381e2316a8326c6daaa5e03bf8"
    "phase6-vh21-c08-scenario" = "b281c74f05094e15410d22cfbcf878f0d9495e1f"
    "phase6-vh21-c08-scenario-correction-01" = "6aafd865a37f55d87b5a57c03d53c0f847363a94"
    "phase6-vh22-c09-scenario" = "49f31d6e3c6661b8a1a05922ed5f8b4514b835fc"
    "phase6-vh22-c09-scenario-correction-01" = "cbd8946ef6defc20ab3286e4f540877c16c606fc"
    "phase6-vh22-c09-scenario-correction-02" = "5c33bb4e982fe2a211e48e3c082f2e01ce357368"
    "phase6-vh22-repository-suite-blocker-repair-01" = "f94cadc247230164a5a5bac3aaef4111b2ea5b8f"
    "temp-vh21-c08-focused-verification-01" = "bf636fc603a5410f709b7ad2821400a1d78ef896"
    "tmp-vh22-c09-correction-focused-verification" = "770ee083b048cdbc705c7fb7cd787f6050ad79f5"
    "tmp-vh22-c09-focused-verification" = "0c2d5d3bf640a7d6ff232b20ded884a715020aa7"
}

$DeleteOrder = @(
    "temp-vh21-c08-focused-verification-01",
    "tmp-vh22-c09-correction-focused-verification",
    "tmp-vh22-c09-focused-verification",
    "phase6-vh16-c03-scenario",
    "phase6-vh17-c04-scenario",
    "phase6-vh18-c05-scenario",
    "phase6-vh19-c06-scenario",
    "phase6-vh20-c07-scenario",
    "phase6-vh21-c08-scenario",
    "phase6-vh22-c09-scenario",
    "phase6-vh22-c09-scenario-correction-01",
    "phase6-vh16-c03-scenario-correction-01",
    "phase6-vh17-c04-scenario-correction-01",
    "phase6-vh18-c05-scenario-correction-01",
    "phase6-vh19-c06-scenario-correction-01",
    "phase6-vh20-c07-scenario-correction-01",
    "phase6-vh21-c08-scenario-correction-01",
    "phase6-vh14-module-integration-runner",
    "phase6-vh15-r2-promotion-tooling",
    "phase6-vh15-r2-run-scoped-plan-handoff",
    "phase6-vh15-r3-runtime-derived-plan-identity-binding",
    "phase6-vh15-validation-mode-runtime-canary",
    "phase6-vh22-c09-scenario-correction-02",
    "phase6-vh22-repository-suite-blocker-repair-01",
    "ci-4-split-verification-status",
    "ci-3-phx-ci-obsidian-pilot",
    "archive/phase6-legacy-history"
)

$Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..")).TrimEnd("\", "/")

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    $output = @(& git.exe -C $Root @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = ($output -join "`n").Trim()

    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed (exit $exitCode).`n$text"
    }

    [pscustomobject]@{
        ExitCode = $exitCode
        Text = $text
    }
}

function Get-RemoteBranches {
    $map = [ordered]@{}
    $text = (Invoke-Git -Arguments @("ls-remote", "--heads", "origin")).Text

    foreach ($line in ($text -split "`n")) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        if ($line -notmatch '^([0-9a-f]{40})\s+refs/heads/(.+)$') {
            throw "Unexpected remote branch ref: $line"
        }
        $map[$Matches[2]] = $Matches[1]
    }

    return $map
}

function Get-LocalBranches {
    $map = [ordered]@{}
    $text = (Invoke-Git -Arguments @(
        "for-each-ref",
        "--format=%(refname:short)`t%(objectname)",
        "refs/heads/"
    )).Text

    foreach ($line in ($text -split "`n")) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        if ($line -notmatch '^(.+)\t([0-9a-f]{40})$') {
            throw "Unexpected local branch ref: $line"
        }
        $map[$Matches[1]] = $Matches[2]
    }

    return $map
}

function Get-CheckedOutLocalBranches {
    $checked = [ordered]@{}
    $text = (Invoke-Git -Arguments @("worktree", "list", "--porcelain")).Text
    $currentWorktree = ""

    foreach ($line in ($text -split "`n")) {
        if ($line -match '^worktree (.+)    param([Parameter(Mandatory)][string]$Tag)

    $text = (Invoke-Git -Arguments @(
        "ls-remote",
        "--tags",
        "origin",
        "refs/tags/$Tag"
    )).Text

    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    if ($text -notmatch '^([0-9a-f]{40})\s+refs/tags/.+$') {
        throw "Unexpected remote tag ref: $text"
    }

    return $Matches[1]
}

function Assert-RemoteCleanupState {
    $remote = Get-RemoteBranches
    $names = @($remote.Keys | Sort-Object)

    if ($names.Count -ne 2 -or
        $names[0] -ne "master" -or
        $names[1] -ne "phase6-integration") {
        throw "Remote cleanup state has changed. Expected only master and phase6-integration; actual: $($names -join ', ')"
    }

    if ($remote["master"] -ne $MasterSha) {
        throw "Remote master drift. Expected $MasterSha; actual $($remote["master"])"
    }

    return $remote
}

function Assert-AllPreservationTags {
    foreach ($entry in $Frozen.GetEnumerator()) {
        $branch = [string]$entry.Key
        $expected = [string]$entry.Value
        $tag = "$TagPrefix/$branch"
        $actual = Get-RemoteTagSha -Tag $tag

        if ($actual -ne $expected) {
            throw "Preservation tag mismatch: $tag expected $expected; actual '$actual'"
        }
    }
}

if ((Invoke-Git -Arguments @("rev-parse", "--is-inside-work-tree")).Text -ne "true") {
    throw "Script location does not resolve to a Git working tree: $Root"
}

if ($Frozen.Count -ne 27 -or $DeleteOrder.Count -ne 27) {
    throw "Frozen branch map and deletion order must each contain exactly 27 entries."
}

if (@($DeleteOrder | Sort-Object -Unique).Count -ne 27) {
    throw "Deletion order contains duplicate entries."
}

foreach ($name in $DeleteOrder) {
    if (-not $Frozen.Contains($name)) {
        throw "Deletion order contains an unknown branch: $name"
    }
}

$origin = (Invoke-Git -Arguments @("remote", "get-url", "origin")).Text
if ($origin -notmatch '(?i)(?:github\.com[/:])woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$') {
    throw "Unexpected origin: $origin"
}

$dirty = (Invoke-Git -Arguments @(
    "status",
    "--porcelain=v1",
    "--untracked-files=no"
)).Text
if (-not [string]::IsNullOrWhiteSpace($dirty)) {
    throw "Tracked/index state must be clean before local branch cleanup.`n$dirty"
}

Invoke-Git -Arguments @("fetch", "origin", "--prune", "--tags") | Out-Null

$remoteBefore = Assert-RemoteCleanupState
Assert-AllPreservationTags

$currentResult = Invoke-Git -Arguments @(
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD"
) -AllowFailure

if ($currentResult.ExitCode -ne 0) {
    throw "Detached HEAD is not allowed for this cleanup. Check out master or phase6-integration first."
}

$currentBranch = $currentResult.Text
if ($currentBranch -ne "master" -and $currentBranch -ne "phase6-integration") {
    throw "Current branch must be master or phase6-integration before cleanup. Current: $currentBranch"
}

$locals = Get-LocalBranches
$candidates = [Collections.Generic.List[string]]::new()
$unrelated = [Collections.Generic.List[string]]::new()

foreach ($name in $locals.Keys) {
    if ($Frozen.Contains($name)) {
        $candidates.Add([string]$name)
        continue
    }

    if ($name -ne "master" -and $name -ne "phase6-integration") {
        $unrelated.Add([string]$name)
    }
}

# Fail closed before deleting anything: every targeted local branch must still be
# exactly the frozen branch tip, its remote recovery tag must independently verify,
# and it must not be checked out in any Git worktree.
$checkedOut = Get-CheckedOutLocalBranches
foreach ($name in $candidates) {
    if ($checkedOut.Contains($name)) {
        throw "Retired local branch is checked out in a worktree: $name at $($checkedOut[$name]). No local branches were deleted."
    }
    $expected = [string]$Frozen[$name]
    $actual = [string]$locals[$name]
    $tag = "$TagPrefix/$name"
    $tagSha = Get-RemoteTagSha -Tag $tag

    if ($actual -ne $expected) {
        throw "Local branch drift: $name expected $expected; actual $actual. No local branches were deleted."
    }

    if ($tagSha -ne $expected) {
        throw "Recovery tag mismatch for $name: $tag expected $expected; actual '$tagSha'. No local branches were deleted."
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "DRY RUN — no local branch refs will be deleted." -ForegroundColor Yellow
}
else {
    Write-Host "LOCAL PHASE 6 BRANCH CLEANUP" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Retained local branch names:" -ForegroundColor Cyan
Write-Host "  master"
Write-Host "  phase6-integration"

if ($unrelated.Count -gt 0) {
    Write-Host ""
    Write-Host "Unrelated local branches — LEFT UNTOUCHED:" -ForegroundColor Yellow
    foreach ($name in ($unrelated | Sort-Object)) {
        Write-Host "  $name @ $($locals[$name])"
    }
}

Write-Host ""
Write-Host "Retired Phase 6 local branches:" -ForegroundColor Cyan

if ($candidates.Count -eq 0) {
    Write-Host "  None present."
}
else {
    foreach ($name in $DeleteOrder) {
        if (-not $locals.Contains($name)) {
            continue
        }

        $expected = [string]$Frozen[$name]
        $tag = "$TagPrefix/$name"

        if ($DryRun) {
            Write-Host "  WOULD DELETE LOCAL BRANCH  $name @ $expected"
            Write-Host "    recovery: $tag -> $expected"
        }
        else {
            # update-ref uses the expected old SHA as a compare-and-delete guard.
            # If the local branch moves after preflight, deletion fails rather than
            # removing a different branch tip.
            Invoke-Git -Arguments @(
                "update-ref",
                "-d",
                "refs/heads/$name",
                $expected
            ) | Out-Null

            $check = Invoke-Git -Arguments @(
                "show-ref",
                "--verify",
                "--quiet",
                "refs/heads/$name"
            ) -AllowFailure

            if ($check.ExitCode -eq 0) {
                throw "Local branch deletion verification failed: $name"
            }

            Write-Host "  DELETED / VERIFIED ABSENT  $name @ $expected" -ForegroundColor Green
        }
    }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN PASS — all targeted local branches match their immutable recovery tags." -ForegroundColor Green
    Write-Host "Would delete: $($candidates.Count) retired Phase 6 local branch(es)."
    Write-Host "Would leave untouched: $($unrelated.Count) unrelated local branch(es)."
    Write-Host "Remote branches/tags are not modified by this script."
    return
}

$localsAfter = Get-LocalBranches
$remainingRetired = @($Frozen.Keys | Where-Object { $localsAfter.Contains($_) })
if ($remainingRetired.Count -gt 0) {
    throw "Retired Phase 6 local branches remain after cleanup: $($remainingRetired -join ', ')"
}

# Reconfirm that the completed remote cleanup/recovery state remained intact.
Invoke-Git -Arguments @("fetch", "origin", "--prune", "--tags") | Out-Null
$remoteAfter = Assert-RemoteCleanupState
Assert-AllPreservationTags

Write-Host ""
Write-Host "LOCAL PHASE 6 BRANCH CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "Deleted retired local branches: $($candidates.Count)"
Write-Host "Unrelated local branches left untouched: $($unrelated.Count)"
Write-Host "Current branch: $currentBranch"
Write-Host "Remote branches remain: master, phase6-integration"
Write-Host "All 27 remote preservation tags remain verified."
) {
            $currentWorktree = $Matches[1]
            continue
        }

        if ($line -match '^branch refs/heads/(.+)    param([Parameter(Mandatory)][string]$Tag)

    $text = (Invoke-Git -Arguments @(
        "ls-remote",
        "--tags",
        "origin",
        "refs/tags/$Tag"
    )).Text

    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    if ($text -notmatch '^([0-9a-f]{40})\s+refs/tags/.+$') {
        throw "Unexpected remote tag ref: $text"
    }

    return $Matches[1]
}

function Assert-RemoteCleanupState {
    $remote = Get-RemoteBranches
    $names = @($remote.Keys | Sort-Object)

    if ($names.Count -ne 2 -or
        $names[0] -ne "master" -or
        $names[1] -ne "phase6-integration") {
        throw "Remote cleanup state has changed. Expected only master and phase6-integration; actual: $($names -join ', ')"
    }

    if ($remote["master"] -ne $MasterSha) {
        throw "Remote master drift. Expected $MasterSha; actual $($remote["master"])"
    }

    return $remote
}

function Assert-AllPreservationTags {
    foreach ($entry in $Frozen.GetEnumerator()) {
        $branch = [string]$entry.Key
        $expected = [string]$entry.Value
        $tag = "$TagPrefix/$branch"
        $actual = Get-RemoteTagSha -Tag $tag

        if ($actual -ne $expected) {
            throw "Preservation tag mismatch: $tag expected $expected; actual '$actual'"
        }
    }
}

if ((Invoke-Git -Arguments @("rev-parse", "--is-inside-work-tree")).Text -ne "true") {
    throw "Script location does not resolve to a Git working tree: $Root"
}

if ($Frozen.Count -ne 27 -or $DeleteOrder.Count -ne 27) {
    throw "Frozen branch map and deletion order must each contain exactly 27 entries."
}

if (@($DeleteOrder | Sort-Object -Unique).Count -ne 27) {
    throw "Deletion order contains duplicate entries."
}

foreach ($name in $DeleteOrder) {
    if (-not $Frozen.Contains($name)) {
        throw "Deletion order contains an unknown branch: $name"
    }
}

$origin = (Invoke-Git -Arguments @("remote", "get-url", "origin")).Text
if ($origin -notmatch '(?i)(?:github\.com[/:])woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$') {
    throw "Unexpected origin: $origin"
}

$dirty = (Invoke-Git -Arguments @(
    "status",
    "--porcelain=v1",
    "--untracked-files=no"
)).Text
if (-not [string]::IsNullOrWhiteSpace($dirty)) {
    throw "Tracked/index state must be clean before local branch cleanup.`n$dirty"
}

Invoke-Git -Arguments @("fetch", "origin", "--prune", "--tags") | Out-Null

$remoteBefore = Assert-RemoteCleanupState
Assert-AllPreservationTags

$currentResult = Invoke-Git -Arguments @(
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD"
) -AllowFailure

if ($currentResult.ExitCode -ne 0) {
    throw "Detached HEAD is not allowed for this cleanup. Check out master or phase6-integration first."
}

$currentBranch = $currentResult.Text
if ($currentBranch -ne "master" -and $currentBranch -ne "phase6-integration") {
    throw "Current branch must be master or phase6-integration before cleanup. Current: $currentBranch"
}

$locals = Get-LocalBranches
$candidates = [Collections.Generic.List[string]]::new()
$unrelated = [Collections.Generic.List[string]]::new()

foreach ($name in $locals.Keys) {
    if ($Frozen.Contains($name)) {
        $candidates.Add([string]$name)
        continue
    }

    if ($name -ne "master" -and $name -ne "phase6-integration") {
        $unrelated.Add([string]$name)
    }
}

# Fail closed before deleting anything: every targeted local branch must still be
# exactly the frozen branch tip, and its remote recovery tag must independently verify.
foreach ($name in $candidates) {
    $expected = [string]$Frozen[$name]
    $actual = [string]$locals[$name]
    $tag = "$TagPrefix/$name"
    $tagSha = Get-RemoteTagSha -Tag $tag

    if ($actual -ne $expected) {
        throw "Local branch drift: $name expected $expected; actual $actual. No local branches were deleted."
    }

    if ($tagSha -ne $expected) {
        throw "Recovery tag mismatch for $name: $tag expected $expected; actual '$tagSha'. No local branches were deleted."
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "DRY RUN — no local branch refs will be deleted." -ForegroundColor Yellow
}
else {
    Write-Host "LOCAL PHASE 6 BRANCH CLEANUP" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Retained local branch names:" -ForegroundColor Cyan
Write-Host "  master"
Write-Host "  phase6-integration"

if ($unrelated.Count -gt 0) {
    Write-Host ""
    Write-Host "Unrelated local branches — LEFT UNTOUCHED:" -ForegroundColor Yellow
    foreach ($name in ($unrelated | Sort-Object)) {
        Write-Host "  $name @ $($locals[$name])"
    }
}

Write-Host ""
Write-Host "Retired Phase 6 local branches:" -ForegroundColor Cyan

if ($candidates.Count -eq 0) {
    Write-Host "  None present."
}
else {
    foreach ($name in $DeleteOrder) {
        if (-not $locals.Contains($name)) {
            continue
        }

        $expected = [string]$Frozen[$name]
        $tag = "$TagPrefix/$name"

        if ($DryRun) {
            Write-Host "  WOULD DELETE LOCAL BRANCH  $name @ $expected"
            Write-Host "    recovery: $tag -> $expected"
        }
        else {
            # update-ref uses the expected old SHA as a compare-and-delete guard.
            # If the local branch moves after preflight, deletion fails rather than
            # removing a different branch tip.
            Invoke-Git -Arguments @(
                "update-ref",
                "-d",
                "refs/heads/$name",
                $expected
            ) | Out-Null

            $check = Invoke-Git -Arguments @(
                "show-ref",
                "--verify",
                "--quiet",
                "refs/heads/$name"
            ) -AllowFailure

            if ($check.ExitCode -eq 0) {
                throw "Local branch deletion verification failed: $name"
            }

            Write-Host "  DELETED / VERIFIED ABSENT  $name @ $expected" -ForegroundColor Green
        }
    }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN PASS — all targeted local branches match their immutable recovery tags." -ForegroundColor Green
    Write-Host "Would delete: $($candidates.Count) retired Phase 6 local branch(es)."
    Write-Host "Would leave untouched: $($unrelated.Count) unrelated local branch(es)."
    Write-Host "Remote branches/tags are not modified by this script."
    return
}

$localsAfter = Get-LocalBranches
$remainingRetired = @($Frozen.Keys | Where-Object { $localsAfter.Contains($_) })
if ($remainingRetired.Count -gt 0) {
    throw "Retired Phase 6 local branches remain after cleanup: $($remainingRetired -join ', ')"
}

# Reconfirm that the completed remote cleanup/recovery state remained intact.
Invoke-Git -Arguments @("fetch", "origin", "--prune", "--tags") | Out-Null
$remoteAfter = Assert-RemoteCleanupState
Assert-AllPreservationTags

Write-Host ""
Write-Host "LOCAL PHASE 6 BRANCH CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "Deleted retired local branches: $($candidates.Count)"
Write-Host "Unrelated local branches left untouched: $($unrelated.Count)"
Write-Host "Current branch: $currentBranch"
Write-Host "Remote branches remain: master, phase6-integration"
Write-Host "All 27 remote preservation tags remain verified."
) {
            $checked[$Matches[1]] = $currentWorktree
        }
    }

    return $checked
}

function Get-RemoteTagSha {
    param([Parameter(Mandatory)][string]$Tag)

    $text = (Invoke-Git -Arguments @(
        "ls-remote",
        "--tags",
        "origin",
        "refs/tags/$Tag"
    )).Text

    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    if ($text -notmatch '^([0-9a-f]{40})\s+refs/tags/.+$') {
        throw "Unexpected remote tag ref: $text"
    }

    return $Matches[1]
}

function Assert-RemoteCleanupState {
    $remote = Get-RemoteBranches
    $names = @($remote.Keys | Sort-Object)

    if ($names.Count -ne 2 -or
        $names[0] -ne "master" -or
        $names[1] -ne "phase6-integration") {
        throw "Remote cleanup state has changed. Expected only master and phase6-integration; actual: $($names -join ', ')"
    }

    if ($remote["master"] -ne $MasterSha) {
        throw "Remote master drift. Expected $MasterSha; actual $($remote["master"])"
    }

    return $remote
}

function Assert-AllPreservationTags {
    foreach ($entry in $Frozen.GetEnumerator()) {
        $branch = [string]$entry.Key
        $expected = [string]$entry.Value
        $tag = "$TagPrefix/$branch"
        $actual = Get-RemoteTagSha -Tag $tag

        if ($actual -ne $expected) {
            throw "Preservation tag mismatch: $tag expected $expected; actual '$actual'"
        }
    }
}

if ((Invoke-Git -Arguments @("rev-parse", "--is-inside-work-tree")).Text -ne "true") {
    throw "Script location does not resolve to a Git working tree: $Root"
}

if ($Frozen.Count -ne 27 -or $DeleteOrder.Count -ne 27) {
    throw "Frozen branch map and deletion order must each contain exactly 27 entries."
}

if (@($DeleteOrder | Sort-Object -Unique).Count -ne 27) {
    throw "Deletion order contains duplicate entries."
}

foreach ($name in $DeleteOrder) {
    if (-not $Frozen.Contains($name)) {
        throw "Deletion order contains an unknown branch: $name"
    }
}

$origin = (Invoke-Git -Arguments @("remote", "get-url", "origin")).Text
if ($origin -notmatch '(?i)(?:github\.com[/:])woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$') {
    throw "Unexpected origin: $origin"
}

$dirty = (Invoke-Git -Arguments @(
    "status",
    "--porcelain=v1",
    "--untracked-files=no"
)).Text
if (-not [string]::IsNullOrWhiteSpace($dirty)) {
    throw "Tracked/index state must be clean before local branch cleanup.`n$dirty"
}

Invoke-Git -Arguments @("fetch", "origin", "--prune", "--tags") | Out-Null

$remoteBefore = Assert-RemoteCleanupState
Assert-AllPreservationTags

$currentResult = Invoke-Git -Arguments @(
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD"
) -AllowFailure

if ($currentResult.ExitCode -ne 0) {
    throw "Detached HEAD is not allowed for this cleanup. Check out master or phase6-integration first."
}

$currentBranch = $currentResult.Text
if ($currentBranch -ne "master" -and $currentBranch -ne "phase6-integration") {
    throw "Current branch must be master or phase6-integration before cleanup. Current: $currentBranch"
}

$locals = Get-LocalBranches
$candidates = [Collections.Generic.List[string]]::new()
$unrelated = [Collections.Generic.List[string]]::new()

foreach ($name in $locals.Keys) {
    if ($Frozen.Contains($name)) {
        $candidates.Add([string]$name)
        continue
    }

    if ($name -ne "master" -and $name -ne "phase6-integration") {
        $unrelated.Add([string]$name)
    }
}

# Fail closed before deleting anything: every targeted local branch must still be
# exactly the frozen branch tip, and its remote recovery tag must independently verify.
foreach ($name in $candidates) {
    $expected = [string]$Frozen[$name]
    $actual = [string]$locals[$name]
    $tag = "$TagPrefix/$name"
    $tagSha = Get-RemoteTagSha -Tag $tag

    if ($actual -ne $expected) {
        throw "Local branch drift: $name expected $expected; actual $actual. No local branches were deleted."
    }

    if ($tagSha -ne $expected) {
        throw "Recovery tag mismatch for $name: $tag expected $expected; actual '$tagSha'. No local branches were deleted."
    }
}

Write-Host ""
if ($DryRun) {
    Write-Host "DRY RUN — no local branch refs will be deleted." -ForegroundColor Yellow
}
else {
    Write-Host "LOCAL PHASE 6 BRANCH CLEANUP" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Retained local branch names:" -ForegroundColor Cyan
Write-Host "  master"
Write-Host "  phase6-integration"

if ($unrelated.Count -gt 0) {
    Write-Host ""
    Write-Host "Unrelated local branches — LEFT UNTOUCHED:" -ForegroundColor Yellow
    foreach ($name in ($unrelated | Sort-Object)) {
        Write-Host "  $name @ $($locals[$name])"
    }
}

Write-Host ""
Write-Host "Retired Phase 6 local branches:" -ForegroundColor Cyan

if ($candidates.Count -eq 0) {
    Write-Host "  None present."
}
else {
    foreach ($name in $DeleteOrder) {
        if (-not $locals.Contains($name)) {
            continue
        }

        $expected = [string]$Frozen[$name]
        $tag = "$TagPrefix/$name"

        if ($DryRun) {
            Write-Host "  WOULD DELETE LOCAL BRANCH  $name @ $expected"
            Write-Host "    recovery: $tag -> $expected"
        }
        else {
            # update-ref uses the expected old SHA as a compare-and-delete guard.
            # If the local branch moves after preflight, deletion fails rather than
            # removing a different branch tip.
            Invoke-Git -Arguments @(
                "update-ref",
                "-d",
                "refs/heads/$name",
                $expected
            ) | Out-Null

            $check = Invoke-Git -Arguments @(
                "show-ref",
                "--verify",
                "--quiet",
                "refs/heads/$name"
            ) -AllowFailure

            if ($check.ExitCode -eq 0) {
                throw "Local branch deletion verification failed: $name"
            }

            Write-Host "  DELETED / VERIFIED ABSENT  $name @ $expected" -ForegroundColor Green
        }
    }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "DRY RUN PASS — all targeted local branches match their immutable recovery tags." -ForegroundColor Green
    Write-Host "Would delete: $($candidates.Count) retired Phase 6 local branch(es)."
    Write-Host "Would leave untouched: $($unrelated.Count) unrelated local branch(es)."
    Write-Host "Remote branches/tags are not modified by this script."
    return
}

$localsAfter = Get-LocalBranches
$remainingRetired = @($Frozen.Keys | Where-Object { $localsAfter.Contains($_) })
if ($remainingRetired.Count -gt 0) {
    throw "Retired Phase 6 local branches remain after cleanup: $($remainingRetired -join ', ')"
}

# Reconfirm that the completed remote cleanup/recovery state remained intact.
Invoke-Git -Arguments @("fetch", "origin", "--prune", "--tags") | Out-Null
$remoteAfter = Assert-RemoteCleanupState
Assert-AllPreservationTags

Write-Host ""
Write-Host "LOCAL PHASE 6 BRANCH CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "Deleted retired local branches: $($candidates.Count)"
Write-Host "Unrelated local branches left untouched: $($unrelated.Count)"
Write-Host "Current branch: $currentBranch"
Write-Host "Remote branches remain: master, phase6-integration"
Write-Host "All 27 remote preservation tags remain verified."
