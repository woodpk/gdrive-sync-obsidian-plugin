# VH28 D05 offline/reconnect scenario verifier.
# Thin task-specific gate over the installed immutable PHX-CI runtime front door.

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

$ExpectedBranch = 'phase6-vh28-d05-scenario'
$IntegrationRef = 'refs/remotes/origin/phase6-integration'
$PreservationBranch = 'phase6-vh28-d05-scenario-pre-h6b-restart'
$PreservationHead = '38df16aa5bb5cb28f068d448d4cdeacdabc9deee'
$TaskEvidencePath = 'dev/evidence/_ca-output-agt-ca-p6-vh28-d05-scenario-01.md'
$FocusedTestCommand = 'node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-d05-offline-reconnect.test.js'
$AllowedImplementationPaths = @(
    'dev/scripts/verify-vh28-d05.ps1',
    'src/validation/scenarios/d05-offline-reconnect.ts',
    'test/validation-d05-offline-reconnect.test.ts'
)
$PeerEvidence = @(
    [pscustomobject]@{ Branch = 'phase6-vh24-d01-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh24-d01-scenario-01.md' },
    [pscustomobject]@{ Branch = 'phase6-vh25-d02-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh25-d02-scenario-01.md' },
    [pscustomobject]@{ Branch = 'phase6-vh26-d03-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh26-d03-scenario-01.md' },
    [pscustomobject]@{ Branch = 'phase6-vh27-d04-scenario'; Path = 'dev/evidence/_ca-output-agt-ca-p6-vh27-d04-scenario-01.md' },
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

function Invoke-Fetch {
    $output = @(& git -C $script:RepoRoot fetch origin --prune --tags 2>&1)
    $exitCode = $LASTEXITCODE
    foreach ($line in $output) { Write-Host ([string]$line) }
    if ($exitCode -ne 0) {
        throw "git fetch origin --prune --tags failed with exit code $exitCode."
    }
}

function Assert-FrozenIntegration {
    $integrationHead = Invoke-GitText @('rev-parse',$IntegrationRef)
    Assert-FullSha -Name 'origin/phase6-integration HEAD' -Value $integrationHead
    if ($integrationHead -cne $BaseSha) {
        throw "D-SERIES COMMON BASE MISMATCH: expected $BaseSha; origin/phase6-integration is $integrationHead."
    }
}

function Get-GitPathList {
    param([Parameter(Mandatory)][string]$Range)
    $text = Invoke-GitText @('diff','--name-only',$Range)
    if ([string]::IsNullOrWhiteSpace($text)) { return @() }
    return @($text -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Assert-ExactImplementationPaths {
    $changedPaths = @(Get-GitPathList -Range "$BaseSha..$ImplementationHead")
    $actual = @($changedPaths | Sort-Object -CaseSensitive)
    $expected = @($AllowedImplementationPaths | Sort-Object -CaseSensitive)
    if (($actual -join [Environment]::NewLine) -cne ($expected -join [Environment]::NewLine)) {
        throw "VH28 D05 implementation path gate failed.$([Environment]::NewLine)Expected:$([Environment]::NewLine)$($expected -join [Environment]::NewLine)$([Environment]::NewLine)Actual:$([Environment]::NewLine)$($actual -join [Environment]::NewLine)"
    }

    $prohibitedExact = @(
        'src/validation/driver-plan-fault-verifier-contracts.ts',
        'src/validation/production-path-driver.ts',
        'src/validation/plan-assertion-engine.ts',
        'src/validation/validation-mode-runtime.ts'
    )
    $prohibitedPrefixes = @(
        'src/contracts/',
        'src/product/',
        'src/drive/',
        'src/sync/',
        'src/validation/scenarios/d01-',
        'src/validation/scenarios/d02-',
        'src/validation/scenarios/d03-',
        'src/validation/scenarios/d04-',
        'src/validation/scenarios/d06-'
    )
    foreach ($path in $changedPaths) {
        if ($prohibitedExact -ccontains $path) {
            throw "VH28 D05 implementation changes prohibited shared path: $path"
        }
        foreach ($prefix in $prohibitedPrefixes) {
            if ($path.StartsWith($prefix, [StringComparison]::Ordinal)) {
                throw "VH28 D05 implementation changes prohibited shared/peer path: $path"
            }
        }
    }
}

function Assert-TaskEvidenceAfterImplementation {
    $implementationEvidenceSpec = "{0}:{1}" -f $ImplementationHead, $TaskEvidencePath
    & git -C $script:RepoRoot cat-file -e $implementationEvidenceSpec 2>$null
    $evidenceAtImplementationExit = $LASTEXITCODE
    if ($evidenceAtImplementationExit -eq 0) {
        throw "Dedicated task evidence must not exist at ImplementationHead $ImplementationHead."
    }

    $remoteEvidenceSpec = "{0}:{1}" -f $script:remoteHead, $TaskEvidencePath
    & git -C $script:RepoRoot cat-file -e $remoteEvidenceSpec 2>$null
    $evidenceAtRemoteExit = $LASTEXITCODE
    if ($evidenceAtRemoteExit -ne 0) {
        throw "Dedicated task evidence is missing after ImplementationHead: $TaskEvidencePath"
    }

    $tailPaths = @(Get-GitPathList -Range "$ImplementationHead..$script:remoteHead")
    $unexpectedTail = @($tailPaths | Where-Object { $_ -cne $TaskEvidencePath })
    if ($unexpectedTail.Count -ne 0) {
        throw "Unexpected paths exist between ImplementationHead and pre-verification branch HEAD:$([Environment]::NewLine)$($unexpectedTail -join [Environment]::NewLine)"
    }
}

function Assert-PreservationBranch {
    $preservationRef = "refs/remotes/origin/$PreservationBranch"
    $preserved = Invoke-GitText @('rev-parse',$preservationRef)
    Assert-FullSha -Name 'preservation branch HEAD' -Value $preserved
    if ($preserved -cne $PreservationHead) {
        throw "VH28 D05 preservation branch drift: expected $PreservationHead; observed $preserved."
    }
}

function Assert-PeerCommonBases {
    foreach ($peer in $PeerEvidence) {
        $peerRef = "refs/remotes/origin/$($peer.Branch)"
        & git -C $script:RepoRoot show-ref --verify --quiet $peerRef
        $peerRefExit = $LASTEXITCODE
        if ($peerRefExit -ne 0) {
            Write-Host "Peer evidence unavailable: origin/$($peer.Branch) does not exist."
            continue
        }

        $peerHead = Invoke-GitText @('rev-parse',$peerRef)
        $peerEvidenceSpec = "{0}:{1}" -f $peerHead, $peer.Path
        & git -C $script:RepoRoot cat-file -e $peerEvidenceSpec 2>$null
        $peerEvidenceExit = $LASTEXITCODE
        if ($peerEvidenceExit -ne 0) {
            Write-Host "Peer evidence unavailable on origin/$($peer.Branch): $($peer.Path)"
            continue
        }

        $peerText = Invoke-GitText @('show',$peerEvidenceSpec)
        $match = [regex]::Match(
            $peerText,
            '(?m)^.*D_SERIES_COMMON_BASE_SHA\s*[:=]\s*.*?([0-9a-fA-F]{40}).*$'
        )
        if (-not $match.Success) {
            throw "Peer evidence on origin/$($peer.Branch) does not record D_SERIES_COMMON_BASE_SHA."
        }
        $peerBase = $match.Groups[1].Value
        if ($peerBase -cne $BaseSha) {
            throw "D-SERIES COMMON BASE MISMATCH in origin/$($peer.Branch): expected $BaseSha; evidence records $peerBase."
        }
        Write-Host "Peer common base PASS: $($peer.Branch) -> $peerBase"
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

Invoke-Fetch
Assert-FrozenIntegration
Assert-PreservationBranch
Assert-PeerCommonBases

$remoteRef = "refs/remotes/origin/$ExpectedBranch"
$script:remoteHead = Invoke-GitText @('rev-parse',$remoteRef)
Assert-FullSha -Name 'remote branch HEAD' -Value $script:remoteHead

& git -C $script:RepoRoot merge-base --is-ancestor $BaseSha $ImplementationHead
$baseAncestorExit = $LASTEXITCODE
if ($baseAncestorExit -ne 0) {
    throw "Required D-series common base is not an ancestor of implementation HEAD: $BaseSha !<= $ImplementationHead"
}

& git -C $script:RepoRoot merge-base --is-ancestor $ImplementationHead $script:remoteHead
$implementationAncestorExit = $LASTEXITCODE
if ($implementationAncestorExit -ne 0) {
    throw ("Implementation HEAD is not contained in origin/{0}: {1} !<= {2}" -f $ExpectedBranch, $ImplementationHead, $script:remoteHead)
}

Assert-ExactImplementationPaths
Assert-TaskEvidenceAfterImplementation
Invoke-GitCheck -Label 'VH28 D05 implementation diff check' -Arguments @('diff','--check',"$BaseSha..$ImplementationHead")
Invoke-GitCheck -Label 'VH28 D05 branch diff check' -Arguments @('diff','--check',"$BaseSha..$script:remoteHead")

$configText = Invoke-GitText @('show',($script:remoteHead + ':phx-ci.json'))
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
Write-Host "Remote HEAD: $script:remoteHead"
Write-Host "Implementation HEAD: $ImplementationHead"
Write-Host "D-series common base: $BaseSha"
Write-Host "Publication mode: $PublicationMode"

$runtimeArgs = @(
    '-NoProfile',
    '-File', $frontDoor,
    '-RepoRoot', $script:RepoRoot,
    '-Branch', $ExpectedBranch,
    '-BaseRef', $BaseSha,
    '-FocusedTestCommand', $FocusedTestCommand,
    '-PublicationMode', $PublicationMode,
    '-RuntimeStoreRoot', $RuntimeStoreRoot
)
$runtimeOutput = @(& $powerShellPath @runtimeArgs 2>&1)
$runtimeExit = $LASTEXITCODE
foreach ($line in $runtimeOutput) { Write-Host ([string]$line) }
$runtimeText = ($runtimeOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine

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

$script:RuntimeText = $runtimeText
$phxVerdict = Get-LastRuntimeField -Pattern '^PHX-CI RESULT:\s+([A-Z]+)(?:\s+\(exit code \d+\))?\s*$'
$changeSetVerdict = Get-LastRuntimeField -Pattern '^Change-set verification:\s+([^\r\n]+?)\s*$'
$repositoryVerdict = Get-LastRuntimeField -Pattern '^Repository verification:\s+([^\r\n]+?)\s*$'
$overallVerdict = Get-LastRuntimeField -Pattern '^Overall verification:\s+([^\r\n]+?)\s*$'
$taskExitCode = Get-LastRuntimeField -Pattern '^Task exit code:\s+([^\r\n]+?)\s*$'
$evidenceCommit = Get-LastRuntimeField -Pattern '^Evidence commit:\s*([^\r\n]*?)\s*$'
$localEvidenceBranch = Get-LastRuntimeField -Pattern '^Local evidence branch:\s*([^\r\n]+?)\s*$' -DefaultValue '<none reported>'
if ($localEvidenceBranch -eq '<none reported>') {
    $localEvidenceBranch = Get-LastRuntimeField -Pattern '^Publication issue:\s+.*?local branch\s+([^\s.]+)' -DefaultValue '<none reported>'
}
$publicationStatus = Get-LastRuntimeField -Pattern '^Evidence published:\s*([^\r\n]+?)\s*$'
$publicationIssue = Get-LastRuntimeField -Pattern '^Publication issue:\s*([^\r\n]+?)\s*$' -DefaultValue '<none reported>'

$failureSummary = @(
    "PHX-CI verdict: $phxVerdict",
    "Change-set verification: $changeSetVerdict",
    "Repository verification: $repositoryVerdict",
    "Overall verification: $overallVerdict",
    "Task exit code: $taskExitCode",
    "Evidence commit: $evidenceCommit",
    "Local evidence branch: $localEvidenceBranch",
    "Evidence published: $publicationStatus",
    "Publication issue: $publicationIssue",
    "Runtime process exit code: $runtimeExit"
) -join [Environment]::NewLine

$changeSetPass = $changeSetVerdict -ceq 'PASS'
$repositoryPass = $repositoryVerdict -ceq 'PASS'
$overallPass = $overallVerdict -ceq 'PASS'
$frontDoorPass = $phxVerdict -ceq 'PASS'

if ($runtimeExit -ne 0) {
    throw "Installed PHX-CI runtime failed.$([Environment]::NewLine)$failureSummary"
}
if (-not ($changeSetPass -and $repositoryPass -and $overallPass -and $frontDoorPass)) {
    throw "Installed PHX-CI runtime did not establish authoritative PASS / PASS / PASS.$([Environment]::NewLine)$failureSummary"
}

Write-Host ""
Write-Host "===== Post-verification authority gates ====="
Invoke-Fetch
Assert-FrozenIntegration
Assert-PreservationBranch
Assert-PeerCommonBases

Write-Host ""
Write-Host "VH28 D05 VERIFICATION: PASS"
Write-Host "Change-set verification: PASS"
Write-Host "Repository verification: PASS"
Write-Host "Overall verification: PASS"
