[CmdletBinding()] `
param( `
    [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-fA-F]{40}$')][string]$ReviewedBranchHead, `
    [Parameter(Mandatory = $true)][ValidatePattern('^[0-9a-fA-F]{40}$')][string]$ImplementationHead `
); `
Set-StrictMode -Version Latest; `
$ErrorActionPreference = 'Stop'; `
$Branch = 'phase6-vh25-d02-scenario'; `
$FrozenBase = 'c6daa20ad287f395a99cf88943465a9ecc3159dd'; `
$VerifierRelativePath = 'dev\scripts\verify-vh25-d02.ps1'; `
$repoRootLines = @(& git rev-parse --show-toplevel 2>&1); $repoRootExit = $LASTEXITCODE; `
if ($repoRootExit -ne 0) { throw "Unable to resolve repository root; git exit code $repoRootExit." }; `
$repoRoot = (($repoRootLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim(); `
if ([string]::IsNullOrWhiteSpace($repoRoot)) { throw 'Run this bootstrap from inside the gdrive-sync-obsidian-plugin repository.' }; `
$repoRoot = [IO.Path]::GetFullPath($repoRoot).TrimEnd('\','/'); `
$fetchOutput = @(& git -C $repoRoot fetch origin --prune --tags 2>&1); $fetchExit = $LASTEXITCODE; `
foreach ($line in $fetchOutput) { Write-Host ([string]$line) }; `
if ($fetchExit -ne 0) { throw "git fetch failed with exit code $fetchExit." }; `
$integrationLines = @(& git -C $repoRoot rev-parse 'refs/remotes/origin/phase6-integration' 2>&1); $integrationExit = $LASTEXITCODE; `
if ($integrationExit -ne 0) { throw "Unable to resolve origin/phase6-integration; git exit code $integrationExit." }; `
$integrationHead = (($integrationLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim(); `
if ($integrationHead -cne $FrozenBase) { throw "origin/phase6-integration is $integrationHead; required $FrozenBase." }; `
$taskLines = @(& git -C $repoRoot rev-parse ("refs/remotes/origin/" + $Branch) 2>&1); $taskExit = $LASTEXITCODE; `
if ($taskExit -ne 0) { throw "Unable to resolve origin/$Branch; git exit code $taskExit." }; `
$taskHead = (($taskLines | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim(); `
if ($taskHead -cne $ReviewedBranchHead) { throw "origin/$Branch is $taskHead; supervisor-reviewed HEAD required $ReviewedBranchHead." }; `
& git -C $repoRoot merge-base --is-ancestor $ImplementationHead $ReviewedBranchHead; $ancestorExit = $LASTEXITCODE; `
if ($ancestorExit -ne 0) { throw "Implementation HEAD $ImplementationHead is not contained in reviewed branch HEAD $ReviewedBranchHead." }; `
$pwshCommand = Get-Command pwsh.exe -ErrorAction SilentlyContinue; `
if ($null -eq $pwshCommand) { $pwshCommand = Get-Command pwsh -ErrorAction SilentlyContinue }; `
if ($null -eq $pwshCommand) { throw 'PowerShell 7 (pwsh) is required for the committed D02 verifier.' }; `
$tempBase = if ([string]::IsNullOrWhiteSpace($env:TEMP)) { [IO.Path]::GetTempPath() } else { $env:TEMP }; `
$tempWorktree = Join-Path $tempBase ('gdrive-sync-d02-loader-' + [Guid]::NewGuid().ToString('N')); `
try { `
    $addOutput = @(& git -C $repoRoot worktree add --detach $tempWorktree $ReviewedBranchHead 2>&1); $addExit = $LASTEXITCODE; `
    foreach ($line in $addOutput) { Write-Host ([string]$line) }; `
    if ($addExit -ne 0) { throw "Unable to create D02 loader worktree from reviewed SHA $ReviewedBranchHead; git exit code $addExit." }; `
    $verifier = Join-Path $tempWorktree $VerifierRelativePath; `
    if (-not (Test-Path -LiteralPath $verifier -PathType Leaf)) { throw "Committed D02 verifier is missing at reviewed SHA: $verifier" }; `
    & $pwshCommand.Source -NoProfile -File $verifier -RepoRoot $repoRoot -ImplementationHead $ImplementationHead -PublicationMode no-push; $verificationExit = $LASTEXITCODE; `
    if ($verificationExit -ne 0) { throw "VH25 D02 verification failed with exit code $verificationExit." }; `
} finally { `
    if (Test-Path -LiteralPath $tempWorktree) { `
        $removeOutput = @(& git -C $repoRoot worktree remove --force $tempWorktree 2>&1); $removeExit = $LASTEXITCODE; `
        foreach ($line in $removeOutput) { Write-Host ([string]$line) }; `
        if ($removeExit -ne 0) { Write-Warning "Temporary D02 loader worktree could not be removed automatically: $tempWorktree" }; `
    }; `
    $pruneOutput = @(& git -C $repoRoot worktree prune 2>&1); $pruneExit = $LASTEXITCODE; `
    foreach ($line in $pruneOutput) { Write-Host ([string]$line) }; `
    if ($pruneExit -ne 0) { Write-Warning "git worktree prune failed with exit code $pruneExit." }; `
}; `
Write-Host 'VH25 D02 local PHX-CI verification completed successfully.' -ForegroundColor Green