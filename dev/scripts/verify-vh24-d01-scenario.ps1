# VH24 D01 clean-text-merge authoritative local verifier.
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
    [string]$PublicationMode = 'no-push',

    [string]$RuntimeStoreRoot = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or later is required. Current version: $($PSVersionTable.PSVersion)"
}

$ExpectedBranch = 'phase6-vh24-d01-scenario'
$IntegrationBranch = 'phase6-integration'
$ExpectedCommonBase = 'c6daa20ad287f395a99cf88943465a9ecc3159dd'
$AllowedImplementationPaths = @(
    'src/validation/scenarios/d01-clean-text-merge.ts',
    'test/validation-d01-clean-text-merge.test.ts',
    'dev/scripts/verify-vh24-d01-scenario.ps1'
)
$AllowedEvidencePaths = @(
    'dev/evidence/_ca-output-agt-ca-p6-vh24-d01-scenario-01.md',
    'dev/_ca-output.md',
    'dev/_ca-output.json'
)
$PeerEvidence = @(
    @{ Branch = 'phase6-vh25-d02-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh25-d02-scenario-01.md' },
    @{ Branch = 'phase6-vh26-d03-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh26-d03-scenario-01.md' },
    @{ Branch = 'phase6-vh27-d04-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh27-d04-scenario-01.md' },
    @{ Branch = 'phase6-vh28-d05-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh28-d05-scenario-01.md' },
    @{ Branch = 'phase6-vh29-d06-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh29-d06-scenario-01.md' }
)
$FocusedTestCommand = 'node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-d01-clean-text-merge.test.js'

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
    param([Parameter(Mandatory)][string]$Label)

    Write-Host ""
    Write-Host "===== $Label ====="
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

function Get-GitLines {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $text = Invoke-GitText $Arguments
    if ([string]::IsNullOrWhiteSpace($text)) {
        return @()
    }
    return @($text -split "\r?\n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Assert-GitAncestor {
    param(
        [Parameter(Mandatory)][string]$Ancestor,
        [Parameter(Mandatory)][string]$Descendant,
        [Parameter(Mandatory)][string]$Label
    )

    $output = @(& git -C $script:RepoRoot merge-base --is-ancestor $Ancestor $Descendant 2>&1)
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        return
    }
    $text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
    if ($exitCode -eq 1) {
        throw "$Label ancestry check failed: $Ancestor !<= $Descendant"
    }
    throw "$Label ancestry command failed with exit code $exitCode.$([Environment]::NewLine)$text"
}

function Test-IsEvidencePublicationPath {
    param([Parameter(Mandatory)][string]$Path)

    foreach ($allowed in $AllowedEvidencePaths) {
        if ($Path -ceq $allowed) {
            return $true
        }
    }
    return $Path.StartsWith('dev/test-results/', [StringComparison]::Ordinal)
}

function Get-ProtectedSurfaceReason {
    param([Parameter(Mandatory)][string]$Path)

    if ($Path.StartsWith('src/contracts/', [StringComparison]::Ordinal)) {
        return 'src/contracts/**'
    }
    if ($Path -ceq 'src/validation/production-path-driver.ts') {
        return 'frozen H6B production-path-driver'
    }
    if ($Path -ceq 'src/validation/plan-assertion-engine.ts') {
        return 'frozen H6B plan-assertion-engine'
    }
    if ($Path -ceq 'src/validation/validation-mode-runtime.ts') {
        return 'validation-mode-runtime'
    }
    if ($Path -clike 'src/validation/*contract*.ts') {
        return 'shared validation contracts'
    }
    if (
        $Path.StartsWith('src/validation/scenarios/', [StringComparison]::Ordinal)
        -and $Path -cne 'src/validation/scenarios/d01-clean-text-merge.ts'
    ) {
        return 'peer D-series scenario'
    }
    if (
        $Path.StartsWith('src/product/', [StringComparison]::Ordinal)
        -or $Path.StartsWith('src/core/', [StringComparison]::Ordinal)
        -or $Path.StartsWith('src/state/', [StringComparison]::Ordinal)
    ) {
        return 'production synchronization semantics'
    }
    return $null
}

function Assert-FrozenIntegration {
    $integrationHead = Invoke-GitText @('rev-parse',("refs/remotes/origin/" + $IntegrationBranch))
    Assert-FullSha -Name "origin/$IntegrationBranch HEAD" -Value $integrationHead
    if ($integrationHead -cne $ExpectedCommonBase) {
        throw "D-SERIES COMMON BASE MISMATCH: origin/$IntegrationBranch is $integrationHead; required $ExpectedCommonBase."
    }
    if ($BaseSha -cne $ExpectedCommonBase) {
        throw "D-SERIES COMMON BASE MISMATCH: verifier BaseSha is $BaseSha; required $ExpectedCommonBase."
    }
    Write-Host "Frozen D-series integration confirmed: $integrationHead"
}

function Assert-ImplementationSurface {
    param([Parameter(Mandatory)][string]$TaskRemoteHead)

    $implementationRange = @(Get-GitLines @('diff','--name-only',("$BaseSha..$ImplementationHead")))
    $unexpectedImplementation = @()
    $protectedViolations = @()

    foreach ($path in $implementationRange) {
        if ($AllowedImplementationPaths -ccontains $path) {
            continue
        }
        if (Test-IsEvidencePublicationPath -Path $path) {
            continue
        }
        $unexpectedImplementation += $path
        $reason = Get-ProtectedSurfaceReason -Path $path
        if (-not [string]::IsNullOrWhiteSpace([string]$reason)) {
            $protectedViolations += ("{0} [{1}]" -f $path, $reason)
        }
    }

    if ($protectedViolations.Count -gt 0) {
        throw ("Protected VH24 surface modified in BaseSha..ImplementationHead: " + ($protectedViolations -join ', '))
    }
    if ($unexpectedImplementation.Count -gt 0) {
        throw ("Unauthorized VH24 implementation path(s) in BaseSha..ImplementationHead: " + ($unexpectedImplementation -join ', '))
    }

    $missingImplementation = @(
        $AllowedImplementationPaths |
            Where-Object { -not ($implementationRange -ccontains $_) }
    )
    if ($missingImplementation.Count -gt 0) {
        throw ("Required VH24 implementation path(s) missing from BaseSha..ImplementationHead: " + ($missingImplementation -join ', '))
    }

    $revListArguments = @('rev-list','-1',$TaskRemoteHead,'--') + $AllowedImplementationPaths
    $latestImplementationCommit = Invoke-GitText $revListArguments
    Assert-FullSha -Name 'latest task implementation commit' -Value $latestImplementationCommit
    if ($latestImplementationCommit -cne $ImplementationHead) {
        throw "ImplementationHead is not the latest task implementation commit. Required $latestImplementationCommit; received $ImplementationHead."
    }

    $postImplementation = @(Get-GitLines @('diff','--name-only',("$ImplementationHead..$TaskRemoteHead")))
    $unexpectedPostImplementation = @(
        $postImplementation |
            Where-Object { -not (Test-IsEvidencePublicationPath -Path $_) }
    )
    if ($unexpectedPostImplementation.Count -gt 0) {
        throw ("Only VH24 evidence/publication artifacts may change after ImplementationHead; observed: " + ($unexpectedPostImplementation -join ', '))
    }

    Write-Host ("Implementation paths confirmed: " + ($AllowedImplementationPaths -join ', '))
    if ($postImplementation.Count -gt 0) {
        Write-Host ("Post-implementation publication paths confirmed: " + ($postImplementation -join ', '))
    }
    else {
        Write-Host "Post-implementation publication paths confirmed: <none>"
    }
}

function Assert-TaskAuthority {
    param([Parameter(Mandatory)][string]$TaskRemoteHead)

    Assert-FullSha -Name "origin/$ExpectedBranch HEAD" -Value $TaskRemoteHead
    Assert-GitAncestor -Ancestor $BaseSha -Descendant $ImplementationHead -Label 'common-base -> implementation'
    Assert-GitAncestor -Ancestor $ImplementationHead -Descendant $TaskRemoteHead -Label 'implementation -> task remote'
    Assert-ImplementationSurface -TaskRemoteHead $TaskRemoteHead
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
        $evidenceExit = $LASTEXITCODE
        if ($evidenceExit -ne 0) {
            Write-Host "Peer evidence not available; skipped: $peerBranch/$peerPath"
            continue
        }

        $peerEvidenceText = Invoke-GitText @('show',("{0}:{1}" -f $peerRef, $peerPath))
        $match = [regex]::Match(
            $peerEvidenceText,
            'D_SERIES_COMMON_BASE_SHA[^0-9a-fA-F]+([0-9a-fA-F]{40})',
            [Text.RegularExpressions.RegexOptions]::IgnoreCase
        )
        if (-not $match.Success) {
            throw "Available peer evidence does not record D_SERIES_COMMON_BASE_SHA: $peerBranch/$peerPath"
        }

        $peerBase = $match.Groups[1].Value.ToLowerInvariant()
        if ($peerBase -cne $ExpectedCommonBase.ToLowerInvariant()) {
            throw "D-SERIES COMMON BASE MISMATCH: $peerBranch records $peerBase; required $ExpectedCommonBase."
        }
        Write-Host "Peer common-base evidence confirmed: $peerBranch -> $peerBase"
    }
}

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
    if ($regexMatches.Count -eq 0) {
        return $DefaultValue
    }
    return $regexMatches[$regexMatches.Count - 1].Groups[1].Value.Trim()
}

Assert-FullSha -Name 'ImplementationHead' -Value $ImplementationHead
Assert-FullSha -Name 'BaseSha' -Value $BaseSha
Assert-FullSha -Name 'ExpectedCommonBase' -Value $ExpectedCommonBase

if ($BaseSha -cne $ExpectedCommonBase) {
    throw "D-SERIES COMMON BASE MISMATCH: BaseSha is $BaseSha; required $ExpectedCommonBase."
}

$script:RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
if (-not (Test-Path -LiteralPath $script:RepoRoot -PathType Container)) {
    throw "Repository root not found: $script:RepoRoot"
}

$actualRoot = [IO.Path]::GetFullPath((Invoke-GitText @('rev-parse','--show-toplevel'))).TrimEnd('\','/')
if (-not [string]::Equals($script:RepoRoot, $actualRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "RepoRoot is not the repository top level. Requested '$script:RepoRoot'; actual '$actualRoot'."
}

Write-Host "VH24 D01 authoritative local verification"
Write-Host "Expected task branch: $ExpectedBranch"
Write-Host "D_SERIES_COMMON_BASE_SHA: $ExpectedCommonBase"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "GitHub Actions: PROHIBITED / NOT USED"

Invoke-Fetch -Label 'Fetch current remote state'
Assert-FrozenIntegration

$taskRemoteHead = Invoke-GitText @('rev-parse',("refs/remotes/origin/" + $ExpectedBranch))
Assert-TaskAuthority -TaskRemoteHead $taskRemoteHead
Assert-PeerCommonBaseConsistency
Invoke-GitCheck -Label 'VH24 implementation diff check' -Arguments @('diff','--check',("$BaseSha..$ImplementationHead"))

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
Write-Host "===== Installed immutable PHX-CI runtime ====="
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
$script:RuntimeText = ($runtimeOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine

$phxVerdict = Get-LastRuntimeField -Pattern '^PHX-CI RESULT:\s+([A-Z]+)(?:\s+\(exit code \d+\))?\s*$'
$changeSetVerdict = Get-LastRuntimeField -Pattern '^Change-set verification:\s+([^\r\n]+?)\s*$'
$repositoryVerdict = Get-LastRuntimeField -Pattern '^Repository verification:\s+([^\r\n]+?)\s*$'
$overallVerdict = Get-LastRuntimeField -Pattern '^Overall verification:\s+([^\r\n]+?)\s*$'
$taskExitCode = Get-LastRuntimeField -Pattern '^Task exit code:\s+([^\r\n]+?)\s*$'
$evidenceCommit = Get-LastRuntimeField -Pattern '^Evidence commit:\s*([^\r\n]+?)\s*$' -DefaultValue '<none reported>'
$publicationStatus = Get-LastRuntimeField -Pattern '^(?:Evidence publication status|Evidence published):\s*([^\r\n]+?)\s*$' -DefaultValue '<not reported>'
$localEvidenceBranch = Get-LastRuntimeField -Pattern '^Local evidence branch:\s*([^\r\n]+?)\s*$' -DefaultValue '<none reported>'
$publicationIssue = Get-LastRuntimeField -Pattern '^Publication issue:\s*([^\r\n]+?)\s*$' -DefaultValue '<none reported>'

if ($localEvidenceBranch -eq '<none reported>' -and $publicationIssue -ne '<none reported>') {
    $branchMatch = [regex]::Match($publicationIssue, 'local branch\s+([^\s.]+)')
    if ($branchMatch.Success) {
        $localEvidenceBranch = $branchMatch.Groups[1].Value
    }
}

$resultSummary = @(
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

Write-Host ""
Write-Host "===== PHX-CI authoritative result ====="
Write-Host $resultSummary

$authoritativePass = (
    $runtimeExit -eq 0
    -and $phxVerdict -ceq 'PASS'
    -and $changeSetVerdict -ceq 'PASS'
    -and $repositoryVerdict -ceq 'PASS'
    -and $overallVerdict -ceq 'PASS'
)

if (-not $authoritativePass) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$resultSummary"
}

Invoke-Fetch -Label 'Re-fetch remote state after PHX-CI'
Assert-FrozenIntegration

$taskRemoteHead = Invoke-GitText @('rev-parse',("refs/remotes/origin/" + $ExpectedBranch))
Assert-TaskAuthority -TaskRemoteHead $taskRemoteHead
Assert-PeerCommonBaseConsistency

Write-Host ""
Write-Host "Authoritative PHX-CI decision: PASS / PASS / PASS"
Write-Host "VH24 D01 VERIFICATION: PASS"
