# VH26 / D03 local verification.
# Thin task-specific gate over the installed immutable PHX-CI runtime front door.
# GitHub Actions are prohibited.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$RepoRoot,

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

$ExpectedBranch = 'phase6-vh26-d03-scenario'
$IntegrationRef = 'refs/remotes/origin/phase6-integration'
$TaskEvidencePath = 'dev/evidence/_ca-output-agt-ca-p6-vh26-d03-scenario-01.md'
$FocusedTestCommand = 'node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-d03-concurrent-binary-conflict.test.js'

$AllowedImplementationPaths = @(
    'src/validation/scenarios/d03-concurrent-binary-conflict.ts',
    'test/validation-d03-concurrent-binary-conflict.test.ts',
    'dev/scripts/verify-vh26-d03-scenario.ps1'
)

$PeerEvidence = @(
    [pscustomobject]@{ Branch = 'phase6-vh24-d01-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh24-d01-scenario-01.md' },
    [pscustomobject]@{ Branch = 'phase6-vh25-d02-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh25-d02-scenario-01.md' },
    [pscustomobject]@{ Branch = 'phase6-vh27-d04-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh27-d04-scenario-01.md' },
    [pscustomobject]@{ Branch = 'phase6-vh28-d05-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh28-d05-scenario-01.md' },
    [pscustomobject]@{ Branch = 'phase6-vh29-d06-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh29-d06-scenario-01.md' }
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
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )
    $output = @(& git -C $script:RepoRoot @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "git -C '$script:RepoRoot' $($Arguments -join ' ') failed with exit code $exitCode.$([Environment]::NewLine)$text"
    }
    return [pscustomobject]@{ ExitCode = $exitCode; Text = $text }
}

function Invoke-GitRequiredText {
    param([Parameter(Mandatory)][string[]]$Arguments)
    return (Invoke-GitText -Arguments $Arguments).Text
}

function Fetch-Origin {
    $output = @(& git -C $script:RepoRoot fetch origin --prune --tags 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host ([string]$line) }
    if ($exitCode -ne 0) {
        throw "git fetch origin --prune --tags failed with exit code $exitCode."
    }
}

function Assert-FrozenIntegration {
    param([Parameter(Mandatory)][string]$Stage)

    Fetch-Origin
    $integrationHead = Invoke-GitRequiredText @('rev-parse', $IntegrationRef)
    if ($integrationHead -cne $BaseSha) {
        throw "D-SERIES COMMON BASE MISMATCH at $Stage. origin/phase6-integration is $integrationHead; required $BaseSha."
    }
    Write-Host "Frozen integration check ($Stage): PASS - $integrationHead"
}

function Get-CommitChangedPaths {
    param([Parameter(Mandatory)][string]$Commit)
    $text = Invoke-GitRequiredText @('diff-tree','--no-commit-id','--name-only','-r',$Commit)
    if ([string]::IsNullOrWhiteSpace($text)) { return @() }
    return @($text -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Test-EvidenceOnlyPath {
    param([Parameter(Mandatory)][string]$Path)
    $normalized = $Path.Replace('\','/')
    return $normalized -eq 'dev/_ca-output.md' -or
        $normalized -eq 'dev/_ca-output.json' -or
        $normalized -eq $TaskEvidencePath -or
        $normalized.StartsWith('dev/test-results/', [StringComparison]::OrdinalIgnoreCase)
}

function Get-ImplementationHead {
    param([Parameter(Mandatory)][string]$RemoteHead)

    $candidate = $RemoteHead
    while ($candidate -cne $BaseSha) {
        $paths = @(Get-CommitChangedPaths -Commit $candidate)
        if ($paths.Count -gt 0 -and @($paths | Where-Object { -not (Test-EvidenceOnlyPath -Path $_) }).Count -eq 0) {
            $candidate = Invoke-GitRequiredText @('rev-parse', "$candidate^")
            continue
        }
        return $candidate
    }
    return $candidate
}

function Assert-PeerCommonBases {
    foreach ($peer in $PeerEvidence) {
        $peerRef = "refs/remotes/origin/$($peer.Branch)"
        $exists = Invoke-GitText -Arguments @('show-ref','--verify','--quiet',$peerRef) -AllowFailure
        if ($exists.ExitCode -ne 0) { continue }

        $evidenceSpec = "{0}:{1}" -f $peerRef, $peer.Path
        $evidence = Invoke-GitText -Arguments @('show',$evidenceSpec) -AllowFailure
        if ($evidence.ExitCode -ne 0) { continue }

        $baseLines = @($evidence.Text -split '\r?\n' | Where-Object { $_ -match 'D_SERIES_COMMON_BASE_SHA' })
        if ($baseLines.Count -eq 0) {
            throw "Wave D peer evidence exists but does not record D_SERIES_COMMON_BASE_SHA: $($peer.Path) on $($peer.Branch)"
        }
        foreach ($baseLine in $baseLines) {
            $shaMatch = [regex]::Match($baseLine, '[0-9a-fA-F]{40}')
            if (-not $shaMatch.Success) {
                throw "Wave D peer evidence has an unparsable D_SERIES_COMMON_BASE_SHA line: $baseLine"
            }
            $peerBase = $shaMatch.Value
            if ($peerBase -cne $BaseSha) {
                throw "D-SERIES COMMON BASE MISMATCH. $($peer.Branch) records $peerBase; required $BaseSha."
            }
        }
    }
}

function Invoke-GitDiffCheck {
    param([Parameter(Mandatory)][string]$Range)
    Write-Host ""
    Write-Host "===== git diff --check $Range ====="
    $output = @(& git -C $script:RepoRoot diff --check $Range 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host ([string]$line) }
    Write-Host "EXIT CODE: $exitCode"
    if ($exitCode -ne 0) {
        throw "git diff --check $Range failed with exit code $exitCode."
    }
}

Assert-FullSha -Name 'BaseSha' -Value $BaseSha

$script:RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
if (-not (Test-Path -LiteralPath $script:RepoRoot -PathType Container)) {
    throw "Repository root not found: $script:RepoRoot"
}

$actualRoot = [IO.Path]::GetFullPath((Invoke-GitRequiredText @('rev-parse','--show-toplevel'))).TrimEnd('\','/')
if (-not [string]::Equals($script:RepoRoot, $actualRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "RepoRoot is not the repository top level. Requested '$script:RepoRoot'; actual '$actualRoot'."
}

Write-Host "VH26 / D03 LOCAL PHX-CI VERIFICATION"
Write-Host "Repository: $script:RepoRoot"
Write-Host "Task branch: $ExpectedBranch"
Write-Host "Required D-series common base: $BaseSha"
Write-Host "GitHub Actions: PROHIBITED / NOT USED"

Assert-FrozenIntegration -Stage 'pre-verification'
Assert-PeerCommonBases

$remoteRef = "refs/remotes/origin/$ExpectedBranch"
$remoteHead = Invoke-GitRequiredText @('rev-parse',$remoteRef)
Assert-FullSha -Name 'remote task branch HEAD' -Value $remoteHead

$mergeBase = Invoke-GitRequiredText @('merge-base',$BaseSha,$remoteHead)
if ($mergeBase -cne $BaseSha) {
    throw "D03 branch is not rooted at the exact replacement D-series common base: $BaseSha"
}

$implementationHead = Get-ImplementationHead -RemoteHead $remoteHead
Assert-FullSha -Name 'implementation HEAD' -Value $implementationHead
if ($implementationHead -cne $remoteHead) {
    Write-Host "Evidence-only continuation detected. Implementation HEAD: $implementationHead"
}
if ($implementationHead -cne $BaseSha) {
    $implementationMergeBase = Invoke-GitRequiredText @('merge-base',$BaseSha,$implementationHead)
    if ($implementationMergeBase -cne $BaseSha) {
        throw "D03 implementation HEAD is not descended from the exact common base."
    }
}

$changedText = Invoke-GitRequiredText @('diff','--name-only',"$BaseSha..$implementationHead")
$changedPaths = @()
if (-not [string]::IsNullOrWhiteSpace($changedText)) {
    $changedPaths = @($changedText -split '\r?\n')
}
$implementationChangedPaths = @($changedPaths | Where-Object { -not (Test-EvidenceOnlyPath -Path $_) })
$unexpected = @($implementationChangedPaths | Where-Object { $_ -notin $AllowedImplementationPaths })
if ($unexpected.Count -gt 0) {
    throw ("D03 implementation delta contains unauthorized paths:" + [Environment]::NewLine + ($unexpected -join [Environment]::NewLine))
}
foreach ($required in $AllowedImplementationPaths) {
    if ($required -notin $implementationChangedPaths) {
        throw "D03 required implementation/verification path is missing from the implementation delta: $required"
    }
}

$frozenChanges = @($implementationChangedPaths | Where-Object {
    $_ -like 'src/contracts/*' -or
    $_ -eq 'src/validation/production-path-driver.ts' -or
    $_ -eq 'src/validation/plan-assertion-engine.ts' -or
    $_ -eq 'src/validation/validation-mode-runtime.ts' -or
    $_ -like 'src/validation/*contracts.ts'
})
if ($frozenChanges.Count -gt 0) {
    throw ("D03 changed frozen/shared H6B authority unexpectedly:" + [Environment]::NewLine + ($frozenChanges -join [Environment]::NewLine))
}

Invoke-GitDiffCheck -Range "$BaseSha..$implementationHead"

$configText = Invoke-GitRequiredText @('show',($implementationHead + ':phx-ci.json'))
try {
    $config = $configText | ConvertFrom-Json -ErrorAction Stop
}
catch {
    throw "phx-ci.json at implementation HEAD is invalid JSON: $($_.Exception.Message)"
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
Write-Host "Remote HEAD before PHX-CI: $remoteHead"
Write-Host "Implementation HEAD: $implementationHead"
Write-Host "Base SHA: $BaseSha"
Write-Host "Publication mode: $PublicationMode"

$invokeArgs = @(
    '-NoProfile',
    '-File', $frontDoor,
    '-RepoRoot', $script:RepoRoot,
    '-Branch', $ExpectedBranch,
    '-BaseRef', $BaseSha,
    '-FocusedTestCommand', $FocusedTestCommand,
    '-PublicationMode', $PublicationMode,
    '-RuntimeStoreRoot', $RuntimeStoreRoot
)
$runtimeOutput = @(& $powerShellPath @invokeArgs 2>&1)
$runtimeExit = $LASTEXITCODE
foreach ($line in $runtimeOutput) { Write-Host ([string]$line) }
$runtimeText = ($runtimeOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine

function Get-LastRuntimeField {
    param(
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Pattern,
        [string]$DefaultValue = '<unavailable>'
    )
    $matches = [regex]::Matches(
        $Text,
        $Pattern,
        [Text.RegularExpressions.RegexOptions]::Multiline
    )
    if ($matches.Count -eq 0) { return $DefaultValue }
    return $matches[$matches.Count - 1].Groups[1].Value.Trim()
}

$phxVerdict = Get-LastRuntimeField -Text $runtimeText -Pattern '^PHX-CI RESULT:\s+([A-Z]+)(?:\s+\(exit code \d+\))?\s*$'
$changeSetVerdict = Get-LastRuntimeField -Text $runtimeText -Pattern '^Change-set verification:\s+([^\r\n]+?)\s*$'
$repositoryVerdict = Get-LastRuntimeField -Text $runtimeText -Pattern '^Repository verification:\s+([^\r\n]+?)\s*$'
$overallVerdict = Get-LastRuntimeField -Text $runtimeText -Pattern '^Overall verification:\s+([^\r\n]+?)\s*$'
$taskExitCode = Get-LastRuntimeField -Text $runtimeText -Pattern '^Task exit code:\s+([^\r\n]+?)\s*$'
$evidenceCommit = Get-LastRuntimeField -Text $runtimeText -Pattern '^Evidence commit:\s*([^\r\n]*?)\s*$'
$evidencePublished = Get-LastRuntimeField -Text $runtimeText -Pattern '^Evidence published:\s*([^\r\n]*?)\s*$'
$localEvidenceBranch = Get-LastRuntimeField -Text $runtimeText -Pattern '^Publication issue:\s+.*?local branch\s+([^\s.]+)' -DefaultValue '<none reported>'
$publicationIssue = Get-LastRuntimeField -Text $runtimeText -Pattern '^Publication issue:\s*([^\r\n]*?)\s*$' -DefaultValue '<none reported>'

$failureSummary = @(
    "PHX-CI verdict: $phxVerdict",
    "Change-set verification: $changeSetVerdict",
    "Repository verification: $repositoryVerdict",
    "Overall verification: $overallVerdict",
    "Task exit code: $taskExitCode",
    "Evidence commit: $evidenceCommit",
    "Evidence published: $evidencePublished",
    "Local evidence branch: $localEvidenceBranch",
    "Publication issue: $publicationIssue",
    "Runtime process exit code: $runtimeExit"
) -join [Environment]::NewLine

$authoritativePass = $runtimeExit -eq 0 -and
    $phxVerdict -ceq 'PASS' -and
    $changeSetVerdict -ceq 'PASS' -and
    $repositoryVerdict -ceq 'PASS' -and
    $overallVerdict -ceq 'PASS'

if (-not $authoritativePass) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Assert-FrozenIntegration -Stage 'post-verification'
Assert-PeerCommonBases

Write-Host ""
Write-Host "VH26 D03 VERIFICATION: PASS"
Write-Host "D_SERIES_COMMON_BASE_SHA: $BaseSha"
Write-Host "IMPLEMENTATION_HEAD: $implementationHead"
Write-Host "PHX-CI verdict: $phxVerdict"
Write-Host "Change-set verification: $changeSetVerdict"
Write-Host "Repository verification: $repositoryVerdict"
Write-Host "Overall verification: $overallVerdict"
