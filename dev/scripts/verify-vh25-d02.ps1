# VH25 D02 concurrent overlapping text conflict verifier.
# Thin task-specific gate over the installed immutable PHX-CI runtime front door.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$RepoRoot,

    [Parameter(Mandatory)]
    [string]$ImplementationHead,

    [string]$BaseSha = "c6daa20ad287f395a99cf88943465a9ecc3159dd",

    [ValidateSet('no-push', 'push')]
    [string]$PublicationMode = 'no-push',

    [string]$RuntimeStoreRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or later is required. Current version: $($PSVersionTable.PSVersion)"
}

$ExpectedBranch = 'phase6-vh25-d02-scenario'
$FocusedTestCommand = 'npm run typecheck && node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-d02-true-text-conflict.test.js'

$RequiredIntegrationHead = 'c6daa20ad287f395a99cf88943465a9ecc3159dd'
$RequiredPreservationBranch = 'phase6-vh25-d02-scenario-pre-h6b-restart'
$RequiredPreservationHead = '863a73008b556003a15ba5f1757e45285c3a1a54'
$ImplementationPaths = @(
    'src/validation/scenarios/d02-true-text-conflict.ts',
    'test/validation-d02-true-text-conflict.test.ts',
    'dev/scripts/verify-vh25-d02.ps1',
    'dev/scripts/bootstrap-vh25-d02.ps1'
)
$WaveDPeers = @(
    [pscustomobject]@{ Label = 'VH24/D01'; Branch = 'phase6-vh24-d01-scenario'; Evidence = 'dev/evidence/_ca-output-agt-ca-p6-vh24-d01-scenario-01.md' },
    [pscustomobject]@{ Label = 'VH26/D03'; Branch = 'phase6-vh26-d03-scenario'; Evidence = 'dev/evidence/_ca-output-agt-ca-p6-vh26-d03-scenario-01.md' },
    [pscustomobject]@{ Label = 'VH27/D04'; Branch = 'phase6-vh27-d04-scenario'; Evidence = 'dev/evidence/_ca-output-agt-ca-p6-vh27-d04-scenario-01.md' },
    [pscustomobject]@{ Label = 'VH28/D05'; Branch = 'phase6-vh28-d05-scenario'; Evidence = 'dev/evidence/_ca-output-agt-ca-p6-vh28-d05-scenario-01.md' },
    [pscustomobject]@{ Label = 'VH29/D06'; Branch = 'phase6-vh29-d06-scenario'; Evidence = 'dev/evidence/_ca-output-agt-ca-p6-vh29-d06-scenario-01.md' }
)

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

function Get-GitHistoryTouchedPaths {
    param([Parameter(Mandatory)][string]$Range)

    $output = @(& git -C $script:RepoRoot log --format= --name-only $Range -- 2>&1)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Unable to inspect Git history paths for range $Range; git exit code $exitCode."
    }

    return @(
        $output |
            ForEach-Object { ([string]$_).Trim() } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
            Sort-Object -Unique
    )
}

function Assert-D02TaskAuthority {
    param(
        [Parameter(Mandatory)][string]$RemoteHead,
        [Parameter(Mandatory)][string]$Phase
    )

    Assert-FullSha -Name "$Phase remote task HEAD" -Value $RemoteHead

    Assert-D02TaskAuthority -RemoteHead $remoteHead -Phase 'Pre-PHX'
Assert-D02PreservationBranch -Phase 'Pre-PHX'
Assert-WaveDPeerCommonBase -Phase 'Pre-PHX'

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
$script:RuntimeText = $runtimeText

function Get-LastRuntimeField {
    param(
        [Parameter(Mandatory)][string]$Pattern,
        [string]$DefaultValue = '<unavailable>'
    )

    $regexMatches = [regex]::Matches(
        $script:RuntimeText,
        $Pattern,
        [Text.RegularExpressions.RegexOptions]::Multiline
    )
    if ($regexMatches.Count -eq 0) { return $DefaultValue }
    return $regexMatches[$regexMatches.Count - 1].Groups[1].Value.Trim()
}

$phxVerdict = Get-LastRuntimeField -Pattern '^PHX-CI RESULT:\s+([A-Z]+)(?:\s+\(exit code \d+\))?\s*$'
$changeSetVerdict = Get-LastRuntimeField -Pattern '^Change-set verification:\s+([^\r\n]+?)\s*$'
$repositoryVerdict = Get-LastRuntimeField -Pattern '^Repository verification:\s+([^\r\n]+?)\s*$'
$overallVerdict = Get-LastRuntimeField -Pattern '^Overall verification:\s+([^\r\n]+?)\s*$'
$taskExitCode = Get-LastRuntimeField -Pattern '^Task exit code:\s+([^\r\n]+?)\s*$'
$evidenceCommit = Get-LastRuntimeField -Pattern '^Evidence commit:\s*([^\r\n]*?)\s*$' -DefaultValue '<not reported>'
$publicationStatus = Get-LastRuntimeField -Pattern '^Evidence published:\s*([^\r\n]+?)\s*$' -DefaultValue '<not reported>'
$localEvidenceBranch = Get-LastRuntimeField -Pattern '^Local evidence branch:\s*([^\r\n]+?)\s*$' -DefaultValue '<not reported>'
if ($localEvidenceBranch -eq '<not reported>') {
    $localEvidenceBranch = Get-LastRuntimeField -Pattern '^Publication issue:\s+.*?local branch\s+(.+?)\.\s*$' -DefaultValue '<none reported>'
}
$publicationIssue = Get-LastRuntimeField -Pattern '^Publication issue:\s*([^\r\n]+?)\s*$' -DefaultValue '<none reported>'

$failureSummary = @(
    "PHX-CI verdict: $phxVerdict",
    "Change-set verification: $changeSetVerdict",
    "Repository verification: $repositoryVerdict",
    "Overall verification: $overallVerdict",
    "Task exit code: $taskExitCode",
    "Evidence commit: $evidenceCommit",
    "Evidence publication status: $publicationStatus",
    "Local evidence branch: $localEvidenceBranch",
    "Publication issue: $publicationIssue",
    "Runtime process exit code: $runtimeExit"
) -join [Environment]::NewLine

$authoritativePass = (
    $runtimeExit -eq 0 -and
    $phxVerdict -eq 'PASS' -and
    $changeSetVerdict -eq 'PASS' -and
    $repositoryVerdict -eq 'PASS' -and
    $overallVerdict -eq 'PASS'
)

if (-not $authoritativePass) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

$finalFetch = @(& git -C $script:RepoRoot fetch origin --prune --tags 2>&1)
$finalFetchExit = $LASTEXITCODE
foreach ($line in $finalFetch) { Write-Host ([string]$line) }
if ($finalFetchExit -ne 0) {
    throw "Final git fetch failed with exit code $finalFetchExit."
}

$finalIntegrationHead = Invoke-GitText @('rev-parse','refs/remotes/origin/phase6-integration')
if ($finalIntegrationHead -cne $RequiredIntegrationHead) {
    throw "D-SERIES COMMON BASE MISMATCH after verification: origin/phase6-integration is $finalIntegrationHead; required $RequiredIntegrationHead."
}

$finalRemoteHead = Invoke-GitText @('rev-parse',$remoteRef)
Assert-D02TaskAuthority -RemoteHead $finalRemoteHead -Phase 'Post-PHX'
Assert-D02PreservationBranch -Phase 'Post-PHX'
Assert-WaveDPeerCommonBase -Phase 'Post-PHX'

Write-Host ""
Write-Host "VH25 D02 VERIFICATION: PASS"
Write-Host "PHX-CI verdict: $phxVerdict"
Write-Host "Change-set verification: $changeSetVerdict"
Write-Host "Repository verification: $repositoryVerdict"
Write-Host "Overall verification: $overallVerdict"
Write-Host "Evidence publication status: $publicationStatus"
Write-Host "phase6-integration frozen: PASS ($finalIntegrationHead)"
Write-Host "preservation branch frozen: PASS ($RequiredPreservationHead)"
