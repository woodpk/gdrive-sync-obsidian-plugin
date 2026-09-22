# VH27 D04 authoritative local verification.
# Thin task-specific gate over the installed immutable PHX-CI runtime front door.
# GitHub Actions are prohibited and are not used.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$RepoRoot,

    [Parameter(Mandatory)]
    [string]$ImplementationHead,

    [string]$BaseSha = "c6daa20ad287f395a99cf88943465a9ecc3159dd",

    [ValidateSet('no-push', 'push')]
    [string]$PublicationMode = 'push',

    [string]$RuntimeStoreRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or later is required. Current version: $($PSVersionTable.PSVersion)"
}

$ExpectedBranch = 'phase6-vh27-d04-scenario'
$IntegrationBranch = 'phase6-integration'
$PreservationBranch = 'phase6-vh27-d04-scenario-pre-h6b-restart'
$PreH6bHead = '889e6f91eddea343cec033b341d2792db1729438'
$EvidencePath = 'dev/evidence/_ca-output-agt-ca-p6-vh27-d04-scenario-01.md'
$AllowedImplementationPaths = @(
    'src/validation/scenarios/d04-delete-vs-independent-modify.ts',
    'test/validation-d04-delete-vs-independent-modify.test.ts',
    'dev/scripts/verify-vh27-d04.ps1'
)
$PeerEvidence = @(
    @{ Branch = 'phase6-vh24-d01-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh24-d01-scenario-01.md' },
    @{ Branch = 'phase6-vh25-d02-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh25-d02-scenario-01.md' },
    @{ Branch = 'phase6-vh26-d03-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh26-d03-scenario-01.md' },
    @{ Branch = 'phase6-vh28-d05-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh28-d05-scenario-01.md' },
    @{ Branch = 'phase6-vh29-d06-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh29-d06-scenario-01.md' }
)
$FocusedTestCommand = 'node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-d04-delete-vs-independent-modify.test.js'

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

function Invoke-Fetch {
    Write-Host ""
    Write-Host "===== Fetch current remote state ====="
    $output = @(& git -C $script:RepoRoot fetch origin --prune --tags 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host ([string]$line) }
    Write-Host "EXIT CODE: $exitCode"
    if ($exitCode -ne 0) {
        throw "git fetch failed with exit code $exitCode."
    }
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

function Assert-FrozenIntegration {
    $integrationHead = Invoke-GitText @('rev-parse',("refs/remotes/origin/" + $IntegrationBranch))
    if ($integrationHead -cne $BaseSha) {
        throw "D-SERIES COMMON BASE MISMATCH: origin/$IntegrationBranch is $integrationHead; required $BaseSha."
    }
    Write-Host "Frozen integration confirmed: $integrationHead"
}

function Get-GitLines {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $text = Invoke-GitText $Arguments
    if ([string]::IsNullOrWhiteSpace($text)) { return @() }
    return @($text -split "\r?\n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Assert-ImplementationSurface {
    $changed = @(Get-GitLines @('diff','--name-only',("$BaseSha..$ImplementationHead")))
    $unexpected = @($changed | Where-Object { $_ -notin $AllowedImplementationPaths })
    if ($unexpected.Count -gt 0) {
        throw ("Unauthorized VH27 implementation path(s): " + ($unexpected -join ', '))
    }
    $missing = @($AllowedImplementationPaths | Where-Object { $_ -notin $changed })
    if ($missing.Count -gt 0) {
        throw ("Required VH27 implementation path(s) missing from implementation range: " + ($missing -join ', '))
    }

    $postImplementation = @(Get-GitLines @('diff','--name-only',("$ImplementationHead..$taskRemoteHead")))
    $unexpectedPost = @($postImplementation | Where-Object { $_ -cne $EvidencePath })
    if ($unexpectedPost.Count -gt 0) {
        throw ("Only dedicated VH27 evidence may appear after ImplementationHead; observed: " + ($unexpectedPost -join ', '))
    }
    Write-Host ("Implementation surface confirmed: " + ($changed -join ', '))
}

function Assert-PeerCommonBaseConsistency {
    foreach ($peer in $PeerEvidence) {
        $peerBranch = [string]$peer.Branch
        $peerPath = [string]$peer.Path
        $peerRef = "refs/remotes/origin/$peerBranch"

        & git -C $script:RepoRoot show-ref --verify --quiet $peerRef
        $refExit = $LASTEXITCODE
        if ($refExit -ne 0) {
            Write-Host "Peer branch not available; skipped: $peerBranch"
            continue
        }

        & git -C $script:RepoRoot cat-file -e ("{0}:{1}" -f $peerRef, $peerPath) 2>$null
        $evidenceExistsExit = $LASTEXITCODE
        if ($evidenceExistsExit -ne 0) {
            Write-Host "Peer evidence not available; skipped: $peerBranch/$peerPath"
            continue
        }

        $peerEvidenceText = Invoke-GitText @('show',("{0}:{1}" -f $peerRef, $peerPath))
        $match = [regex]::Match(
            $peerEvidenceText,
            'D_SERIES_COMMON_BASE_SHA[^0-9a-fA-F]+([0-9a-fA-F]{40})'
        )
        if (-not $match.Success) {
            throw "Available peer evidence does not record D_SERIES_COMMON_BASE_SHA: $peerBranch/$peerPath"
        }
        $peerBase = $match.Groups[1].Value.ToLowerInvariant()
        if ($peerBase -cne $BaseSha.ToLowerInvariant()) {
            throw "D-SERIES COMMON BASE MISMATCH: $peerBranch records $peerBase; required $BaseSha."
        }
        Write-Host "Peer common-base evidence confirmed: $peerBranch -> $peerBase"
    }
}

Assert-FullSha -Name 'ImplementationHead' -Value $ImplementationHead
Assert-FullSha -Name 'BaseSha' -Value $BaseSha
Assert-FullSha -Name 'PreH6bHead' -Value $PreH6bHead

$script:RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
if (-not (Test-Path -LiteralPath $script:RepoRoot -PathType Container)) {
    throw "Repository root not found: $script:RepoRoot"
}

$actualRoot = [IO.Path]::GetFullPath((Invoke-GitText @('rev-parse','--show-toplevel'))).TrimEnd('\','/')
if (-not [string]::Equals($script:RepoRoot, $actualRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "RepoRoot is not the repository top level. Requested '$script:RepoRoot'; actual '$actualRoot'."
}

Write-Host "VH27 D04 authoritative local verification"
Write-Host "Expected task branch: $ExpectedBranch"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Pre-H6B preservation branch: $PreservationBranch"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "GitHub Actions: PROHIBITED / NOT USED"

Invoke-Fetch
Assert-FrozenIntegration

$taskRemoteHead = Invoke-GitText @('rev-parse',("refs/remotes/origin/" + $ExpectedBranch))
$preservedRemoteHead = Invoke-GitText @('rev-parse',("refs/remotes/origin/" + $PreservationBranch))
if ($preservedRemoteHead -cne $PreH6bHead) {
    throw "Pre-H6B preservation branch drifted: $preservedRemoteHead != $PreH6bHead"
}

& git -C $script:RepoRoot merge-base --is-ancestor $BaseSha $ImplementationHead
$baseAncestorExit = $LASTEXITCODE
if ($baseAncestorExit -ne 0) {
    throw "Required D-series common base is not an ancestor of implementation HEAD: $BaseSha !<= $ImplementationHead"
}

& git -C $script:RepoRoot merge-base --is-ancestor $ImplementationHead $taskRemoteHead
$implementationAncestorExit = $LASTEXITCODE
if ($implementationAncestorExit -ne 0) {
    throw ("Implementation HEAD is not contained in origin/{0}: {1} !<= {2}" -f $ExpectedBranch, $ImplementationHead, $taskRemoteHead)
}

Assert-ImplementationSurface
Assert-PeerCommonBaseConsistency
Invoke-GitCheck -Label 'VH27 committed diff check' -Arguments @('diff','--check',("$BaseSha..$ImplementationHead"))

$configText = Invoke-GitText @('show',($taskRemoteHead + ':phx-ci.json'))
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
Write-Host "Task remote HEAD before PHX-CI: $taskRemoteHead"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Base SHA: $BaseSha"
Write-Host "Publication mode: $PublicationMode"
Write-Host "Focused command: $FocusedTestCommand"

$runtimeArguments = @(
    '-NoProfile',
    '-File', $frontDoor,
    '-RepoRoot', $script:RepoRoot,
    '-Branch', $ExpectedBranch,
    '-BaseRef', $BaseSha,
    '-FocusedTestCommand', $FocusedTestCommand,
    '-PublicationMode', $PublicationMode,
    '-RuntimeStoreRoot', $RuntimeStoreRoot
)
$runtimeOutput = @(& $powerShellPath @runtimeArguments 2>&1)
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

$phxVerdict = Get-LastRuntimeField -Pattern '^PHX-CI RESULT:\s+([A-Z]+)(?:\s+\(exit code \d+\))?\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"

$changeSetVerdict = Get-LastRuntimeField -Pattern '^Change-set verification:\s+([^\r\n]+?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"

$repositoryVerdict = Get-LastRuntimeField -Pattern '^Repository verification:\s+([^\r\n]+?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"

$overallVerdict = Get-LastRuntimeField -Pattern '^Overall verification:\s+([^\r\n]+?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"

$taskExitCode = Get-LastRuntimeField -Pattern '^Task exit code:\s+([^\r\n]+?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"

$evidenceCommit = Get-LastRuntimeField -Pattern '^Evidence commit:\s*([^\r\n]*?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"

$localEvidenceBranch = Get-LastRuntimeField -Pattern '^Local evidence branch:\s*([^\r\n]+?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"
 -DefaultValue '<none reported>'
$publicationIssue = Get-LastRuntimeField -Pattern '^Publication issue:\s*([^\r\n]+?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"
 -DefaultValue '<none reported>'
$publicationStatus = Get-LastRuntimeField -Pattern '^Evidence published:\s*([^\r\n]+?)\s*

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"
 -DefaultValue '<not reported>'
if ($localEvidenceBranch -eq '<none reported>' -and $publicationIssue -ne '<none reported>') {
    $branchMatch = [regex]::Match($publicationIssue, 'local branch\s+([^\s.]+)')
    if ($branchMatch.Success) { $localEvidenceBranch = $branchMatch.Groups[1].Value }
}
$failureSummary = @(
    "PHX-CI verdict: $phxVerdict",
    "Change-set verification: $changeSetVerdict",
    "Repository verification: $repositoryVerdict",
    "Overall verification: $overallVerdict",
    "Task exit code: $taskExitCode",
    "Evidence commit: $evidenceCommit",
    "Local evidence branch: $localEvidenceBranch",
    "Publication status: $publicationStatus",
    "Publication issue: $publicationIssue",
    "Runtime process exit code: $runtimeExit"
) -join [Environment]::NewLine

$changeSetPass = $changeSetVerdict -eq 'PASS'
$repositoryPass = $repositoryVerdict -eq 'PASS'
$overallPass = $overallVerdict -eq 'PASS'
$frontDoorPass = $phxVerdict -eq 'PASS'

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Invoke-Fetch
Assert-FrozenIntegration

Write-Host ""
Write-Host "VH27 D04 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "Pre-H6B preserved HEAD: $PreH6bHead"
