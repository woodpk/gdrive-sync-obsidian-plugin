# VH25 D02 local bootstrap.
# Safe for Windows PowerShell 5.1. It preserves the active checkout by using a detached temporary worktree.
# The verifier itself requires PowerShell 7 and runs through the installed immutable PHX-CI runtime.

[CmdletBinding()]
param(
    [string]$ImplementationHead = "4d65af27e485ffb76da75576e3123f7b6516ab3f"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Branch = "phase6-vh25-d02-scenario"
$VerifierRelativePath = "dev\scripts\verify-vh25-d02.ps1"

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )
    & $Command @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Command failed with exit code $exitCode. Command: $Command $($Arguments -join ' ')"
    }
}

$repoRoot = (& git rev-parse --show-toplevel 2>&1 | Out-String).Trim()
$repoRootExit = $LASTEXITCODE
if ($repoRootExit -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    throw "Run this bootstrap from inside the gdrive-sync-obsidian-plugin repository."
}
$repoRoot = [IO.Path]::GetFullPath($repoRoot).TrimEnd('\','/')

Invoke-Native -Command "git" -Arguments @("-C", $repoRoot, "fetch", "origin", "--prune", "--tags")

$remoteHead = (& git -C $repoRoot rev-parse "origin/$Branch" 2>&1 | Out-String).Trim()
$remoteHeadExit = $LASTEXITCODE
if ($remoteHeadExit -ne 0 -or $remoteHead -notmatch '^[0-9a-fA-F]{40}$') {
    throw "Unable to resolve origin/$Branch."
}

& git -C $repoRoot merge-base --is-ancestor $ImplementationHead $remoteHead
$ancestorExit = $LASTEXITCODE
if ($ancestorExit -ne 0) {
    throw "Implementation HEAD $ImplementationHead is not contained in origin/$Branch at $remoteHead."
}

$pwshCommand = Get-Command pwsh.exe -ErrorAction SilentlyContinue
if ($null -eq $pwshCommand) {
    $pwshCommand = Get-Command pwsh -ErrorAction SilentlyContinue
}
if ($null -eq $pwshCommand) {
    throw "PowerShell 7 (pwsh) is required for the committed D02 verifier."
}

$tempBase = if ([string]::IsNullOrWhiteSpace($env:TEMP)) { [IO.Path]::GetTempPath() } else { $env:TEMP }
$tempWorktree = Join-Path $tempBase ("gdrive-sync-d02-" + [Guid]::NewGuid().ToString("N"))

try {
    Invoke-Native -Command "git" -Arguments @("-C", $repoRoot, "worktree", "add", "--detach", $tempWorktree, "origin/$Branch")
    $verifier = Join-Path $tempWorktree $VerifierRelativePath
    if (-not (Test-Path -LiteralPath $verifier -PathType Leaf)) {
        throw "Committed D02 verifier is missing from the task branch: $verifier"
    }

    & $pwshCommand.Source -NoProfile -File $verifier -RepoRoot $tempWorktree -ImplementationHead $ImplementationHead -PublicationMode push
    $verificationExit = $LASTEXITCODE
    if ($verificationExit -ne 0) {
        throw "VH25 D02 verification failed with exit code $verificationExit."
    }
}
finally {
    if (Test-Path -LiteralPath $tempWorktree) {
        & git -C $repoRoot worktree remove --force $tempWorktree
        $removeExit = $LASTEXITCODE
        if ($removeExit -ne 0) {
            Write-Warning "Temporary D02 worktree could not be removed automatically: $tempWorktree"
        }
    }
    & git -C $repoRoot worktree prune
}

Write-Host ""
Write-Host "VH25 D02 local PHX-CI verification completed successfully." -ForegroundColor Green
Write-Host "Verified branch: $Branch"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Control checkout was not switched, reset, cleaned, or stashed."
