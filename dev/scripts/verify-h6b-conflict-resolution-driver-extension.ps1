# H6B conflict-resolution production-path extension verifier.
# Thin task-specific gate over the installed immutable PHX-CI runtime front door.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$RepoRoot,

    [Parameter(Mandatory)]
    [string]$ImplementationHead,

    [string]$BaseSha = "4b57ce65eb771a2a6ed2cc3375178db41d899084",

    [ValidateSet('no-push', 'push')]
    [string]$PublicationMode = 'no-push',

    [string]$RuntimeStoreRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or later is required. Current version: $($PSVersionTable.PSVersion)"
}

$ExpectedBranch = 'phase6-h6b-conflict-resolution-driver-extension'
$FocusedTestCommand = 'node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-driver-plan-fault-verifier-contracts.test.js .test-build/test/validation-production-path-driver.test.js .test-build/test/validation-mode-runtime-plan-handoff.test.js .test-build/test/validation-mode-runtime-canary.test.js'

function Assert-FullSha {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value
    )
    if ($Value -notmatch '^[0-9a-fA-F]{40}$') {
        throw "$Name must be a full 40-character Git SHA; received '$Value'."
    }
}

function Invoke-GitText {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $output = @(& git -C $script:RepoRoot @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
    if ($exitCode -ne 0) {
        throw "git -C '$script:RepoRoot' $($Arguments -join ' ') failed with exit code $exitCode.$([Environment]::NewLine)$text"
    }
    return $text
}

function Invoke-GitCheck {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string[]]$Arguments
    )
    Write-Host ""
    Write-Host "===== $Label ====="
    $output = @(& git -C $script:RepoRoot @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host ([string]$line) }
    Write-Host "EXIT CODE: $exitCode"
    if ($exitCode -ne 0) {
        throw "$Label failed with exit code $exitCode."
    }
}

Assert-FullSha -Name 'ImplementationHead' -Value $ImplementationHead
Assert-FullSha -Name 'BaseSha' -Value $BaseSha

$script:RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
if (-not (Test-Path -LiteralPath $script:RepoRoot -PathType Container)) {
    throw "Repository root not found: $script:RepoRoot"
}

$actualRoot = [IO.Path]::GetFullPath((Invoke-GitText @('rev-parse','--show-toplevel'))).TrimEnd('\','/')
if (-not [string]::Equals($script:RepoRoot, $actualRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "RepoRoot is not the repository top level. Requested '$script:RepoRoot'; actual '$actualRoot'."
}

$fetchOutput = @(& git -C $script:RepoRoot fetch origin --prune --tags 2>&1)
$fetchExit = $LASTEXITCODE
foreach ($line in $fetchOutput) { Write-Host ([string]$line) }
if ($fetchExit -ne 0) { throw "git fetch failed with exit code $fetchExit." }

$remoteRef = "refs/remotes/origin/$ExpectedBranch"
$remoteHead = Invoke-GitText @('rev-parse',$remoteRef)
Assert-FullSha -Name 'remote branch HEAD' -Value $remoteHead

& git -C $script:RepoRoot merge-base --is-ancestor $BaseSha $ImplementationHead
$baseAncestorExit = $LASTEXITCODE
if ($baseAncestorExit -ne 0) {
    throw "Required base is not an ancestor of implementation HEAD: $BaseSha !<= $ImplementationHead"
}

& git -C $script:RepoRoot merge-base --is-ancestor $ImplementationHead $remoteHead
$implementationAncestorExit = $LASTEXITCODE
if ($implementationAncestorExit -ne 0) {
    throw "Implementation HEAD is not contained in origin/${ExpectedBranch}: $ImplementationHead !<= $remoteHead"
}

Invoke-GitCheck -Label 'H6B committed diff check' -Arguments @('diff','--check',"$BaseSha..$remoteHead")

$configText = Invoke-GitText @('show',($remoteHead + ':phx-ci.json'))
try {
    $config = $configText | ConvertFrom-Json -ErrorAction Stop
}
catch {
    throw "phx-ci.json at origin/$ExpectedBranch is invalid JSON: $($_.Exception.Message)"
}
if (-not ($config.PSObject.Properties.Name -contains 'framework') -or $null -eq $config.framework) {
    throw 'phx-ci.json does not contain framework configuration.'
}
if ([string]$config.framework.pinPolicy -cne 'exact') {
    throw "Unsupported PHX-CI framework pin policy: $([string]$config.framework.pinPolicy)"
}
$expectedFrameworkSha = [string]$config.framework.sha
Assert-FullSha -Name 'phx-ci.json.framework.sha' -Value $expectedFrameworkSha

if ([string]::IsNullOrWhiteSpace($RuntimeStoreRoot)) {
    if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        throw 'LOCALAPPDATA is unavailable; specify -RuntimeStoreRoot explicitly.'
    }
    $RuntimeStoreRoot = Join-Path (Join-Path $env:LOCALAPPDATA 'PHX-CI') 'runtimes'
}
$RuntimeStoreRoot = [IO.Path]::GetFullPath($RuntimeStoreRoot).TrimEnd('\','/')
if (-not (Test-Path -LiteralPath $RuntimeStoreRoot -PathType Container)) {
    throw "PHX-CI runtime store not found: $RuntimeStoreRoot"
}

$runtimeRoot = Join-Path $RuntimeStoreRoot $expectedFrameworkSha
if (-not (Test-Path -LiteralPath $runtimeRoot -PathType Container)) {
    throw "Required PHX-CI runtime $expectedFrameworkSha is not installed under $RuntimeStoreRoot."
}
$manifestPath = Join-Path $runtimeRoot 'phx-ci-runtime.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Installed PHX-CI runtime manifest is missing: $manifestPath"
}
try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -ErrorAction Stop
}
catch {
    throw "Installed PHX-CI runtime manifest is invalid JSON: $($_.Exception.Message)"
}
if ([string]$manifest.sourceCommit -cne $expectedFrameworkSha) {
    throw "Installed PHX-CI runtime manifest mismatch. Required $expectedFrameworkSha; manifest declares $([string]$manifest.sourceCommit)."
}

$frontDoor = Join-Path $runtimeRoot 'scripts\Invoke-PhxCi.ps1'
if (-not (Test-Path -LiteralPath $frontDoor -PathType Leaf)) {
    throw "Installed PHX-CI runtime front door is missing: $frontDoor"
}

$powerShellPath = (Get-Process -Id $PID).Path
if ([string]::IsNullOrWhiteSpace($powerShellPath) -or -not (Test-Path -LiteralPath $powerShellPath -PathType Leaf)) {
    throw 'Unable to resolve the current PowerShell executable for PHX-CI runtime invocation.'
}

Write-Host ""
Write-Host "===== Installed PHX-CI runtime ====="
Write-Host "Runtime SHA: $expectedFrameworkSha"
Write-Host "Runtime root: $runtimeRoot"
Write-Host "Branch: $ExpectedBranch"
Write-Host "Remote HEAD: $remoteHead"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Base SHA: $BaseSha"
Write-Host "Publication mode: $PublicationMode"

$runtimeOutput = @(
    & $powerShellPath -NoProfile -File $frontDoor `
        -RepoRoot $script:RepoRoot `
        -Branch $ExpectedBranch `
        -BaseRef $BaseSha `
        -FocusedTestCommand $FocusedTestCommand `
        -PublicationMode $PublicationMode `
        -RuntimeStoreRoot $RuntimeStoreRoot 2>&1
)
$runtimeExit = $LASTEXITCODE
foreach ($line in $runtimeOutput) { Write-Host ([string]$line) }
$runtimeText = ($runtimeOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed with exit code $runtimeExit."
}

$changeSetPass = $runtimeText -match '(?m)^Change-set verification:\s+PASS\s*$'
$repositoryPass = $runtimeText -match '(?m)^Repository verification:\s+PASS\s*$'
$overallPass = $runtimeText -match '(?m)^Overall verification:\s+PASS\s*$'
$frontDoorPass = $runtimeText -match '(?m)^PHX-CI RESULT:\s+PASS\s*$'
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw 'Installed PHX-CI runtime exited successfully without authoritative PASS / PASS / PASS output.'
}

Write-Host ""
Write-Host "H6B VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
