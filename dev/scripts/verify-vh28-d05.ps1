# VH28 D05 authoritative local verification.
# Thin task-local launcher over the installed PHX-CI production runtime.

[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$RuntimeStoreRoot = "C:\phx-ci\runtimes",
    [string]$Branch = "phase6-vh28-d05-scenario"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$FrozenBaseSha = '4b57ce65eb771a2a6ed2cc3375178db41d899084'
$ExpectedBranch = 'phase6-vh28-d05-scenario'
$FocusedTestCommand = 'node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-d05-offline-reconnect.test.js'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or later is required. Current version: $($PSVersionTable.PSVersion)"
}
if ($Branch -ne $ExpectedBranch) {
    throw "VH28 D05 verification must target $ExpectedBranch; received $Branch."
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

function Assert-FullSha {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value
    )
    if ($Value -notmatch '^[0-9a-fA-F]{40}$') {
        throw "$Name must be a full 40-character Git SHA; received '$Value'."
    }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $rootOutput = @(& git rev-parse --show-toplevel 2>&1)
    $rootExit = $LASTEXITCODE
    if ($rootExit -ne 0) {
        throw "Unable to resolve repository root with git rev-parse --show-toplevel."
    }
    $RepoRoot = (($rootOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
}

$script:RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
$RuntimeStoreRoot = [IO.Path]::GetFullPath($RuntimeStoreRoot).TrimEnd('\','/')

if (-not (Test-Path -LiteralPath $script:RepoRoot -PathType Container)) {
    throw "Repository root not found: $script:RepoRoot"
}
if (-not (Test-Path -LiteralPath $RuntimeStoreRoot -PathType Container)) {
    throw "Installed PHX-CI runtime store not found: $RuntimeStoreRoot"
}

$actualRoot = [IO.Path]::GetFullPath((Invoke-GitText @('rev-parse','--show-toplevel'))).TrimEnd('\','/')
if (-not [string]::Equals($script:RepoRoot, $actualRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "RepoRoot must be the repository top level. Requested '$script:RepoRoot'; actual '$actualRoot'."
}

& git -C $script:RepoRoot fetch origin --prune
$fetchExit = $LASTEXITCODE
if ($fetchExit -ne 0) {
    throw "git fetch origin --prune failed with exit code $fetchExit."
}

$integrationHead = Invoke-GitText @('rev-parse','origin/phase6-integration^{commit}')
if ($integrationHead -ne $FrozenBaseSha) {
    throw "D-SERIES COMMON BASE MISMATCH: expected $FrozenBaseSha; origin/phase6-integration is $integrationHead."
}

$targetHead = Invoke-GitText @('rev-parse',("origin/{0}^{{commit}}" -f $Branch))
Assert-FullSha -Name 'targetHead' -Value $targetHead

& git -C $script:RepoRoot merge-base --is-ancestor $FrozenBaseSha $targetHead
$ancestorExit = $LASTEXITCODE
if ($ancestorExit -ne 0) {
    throw "VH28 D05 branch does not descend from frozen common base $FrozenBaseSha."
}

$configText = Invoke-GitText @('show',("{0}:phx-ci.json" -f $targetHead))
try {
    $config = $configText | ConvertFrom-Json -ErrorAction Stop
}
catch {
    throw "phx-ci.json at target HEAD is not valid JSON: $($_.Exception.Message)"
}

$frameworkSha = [string]$config.framework.sha
Assert-FullSha -Name 'phx-ci.json.framework.sha' -Value $frameworkSha
if ([string]$config.framework.pinPolicy -ne 'exact') {
    throw "phx-ci.json framework pin policy must be exact."
}

$runtimeRoot = Join-Path $RuntimeStoreRoot $frameworkSha
$frontDoor = Join-Path $runtimeRoot 'scripts/Invoke-PhxCi.ps1'
$manifestPath = Join-Path $runtimeRoot 'phx-ci-runtime.json'
if (-not (Test-Path -LiteralPath $frontDoor -PathType Leaf)) {
    throw "Required installed PHX-CI runtime front door is missing: $frontDoor"
}
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Required installed PHX-CI runtime manifest is missing: $manifestPath"
}

Write-Host "VH28 D05 authoritative verification"
Write-Host "Repository: $script:RepoRoot"
Write-Host "Branch: $Branch"
Write-Host "Target HEAD: $targetHead"
Write-Host "Frozen common base: $FrozenBaseSha"
Write-Host "Installed PHX-CI runtime: $runtimeRoot"
Write-Host "Focused command: $FocusedTestCommand"
Write-Host ""

& pwsh -NoProfile -File $frontDoor `
    -RepoRoot $script:RepoRoot `
    -Branch $Branch `
    -PublicationMode push `
    -FocusedTestCommand $FocusedTestCommand `
    -BaseRef origin/phase6-integration `
    -RuntimeStoreRoot $RuntimeStoreRoot
$verificationExit = $LASTEXITCODE
Write-Host "PHX-CI FRONT DOOR EXIT CODE: $verificationExit"
if ($verificationExit -ne 0) {
    throw "Installed PHX-CI verification failed with exit code $verificationExit."
}

& git -C $script:RepoRoot fetch origin --prune
$postFetchExit = $LASTEXITCODE
if ($postFetchExit -ne 0) {
    throw "Post-verification git fetch failed with exit code $postFetchExit."
}

$postIntegrationHead = Invoke-GitText @('rev-parse','origin/phase6-integration^{commit}')
if ($postIntegrationHead -ne $FrozenBaseSha) {
    throw "D-SERIES COMMON BASE MISMATCH: origin/phase6-integration moved to $postIntegrationHead during verification."
}

$evidenceJsonText = Invoke-GitText @('show',("origin/{0}:dev/_ca-output.json" -f $Branch))
try {
    $evidence = $evidenceJsonText | ConvertFrom-Json -ErrorAction Stop
}
catch {
    throw "Published dev/_ca-output.json is not valid JSON: $($_.Exception.Message)"
}

$changeSetStatus = [string]$evidence.verification.changeSet.status
$repositoryStatus = [string]$evidence.verification.repository.status
$overallStatus = [string]$evidence.verification.overall.status
if (
    [string]$evidence.status -ne 'COMPLETE' -or
    $changeSetStatus -ne 'PASS' -or
    $repositoryStatus -ne 'PASS' -or
    $overallStatus -ne 'PASS'
) {
    throw "VH28 D05 PHX-CI did not produce COMPLETE with PASS / PASS / PASS. Observed: $changeSetStatus / $repositoryStatus / $overallStatus."
}

Write-Host ""
Write-Host "VH28 D05 VERIFICATION: PASS"
Write-Host "Change-set verification: $changeSetStatus"
Write-Host "Repository verification: $repositoryStatus"
Write-Host "Overall verification: $overallStatus"
Write-Host "PHX-CI run ID: $($evidence.runId)"
