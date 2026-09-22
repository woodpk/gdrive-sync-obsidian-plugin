# H6B conflict-resolution production-path extension verifier.
# Thin task-specific launcher over the centralized PHX-CI consumer workflow.

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$RepoRoot,

    [Parameter(Mandatory)]
    [string]$FrameworkRoot,

    [Parameter(Mandatory)]
    [string]$ImplementationHead,

    [string]$BaseSha = "4b57ce65eb771a2a6ed2cc3375178db41d899084"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or later is required. Current version: $($PSVersionTable.PSVersion)"
}

$ExpectedBranchRef = 'refs/remotes/origin/phase6-h6b-conflict-resolution-driver-extension'
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

function Write-LogLine {
    param([AllowEmptyString()][string]$Text)
    Write-Host $Text
    Add-Content -LiteralPath $script:LogPath -Value $Text -Encoding utf8
}

function Invoke-CapturedNative {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$WorkingDirectory
    )
    Write-LogLine ''
    Write-LogLine "===== $Label ====="
    Write-LogLine ("COMMAND: {0} {1}" -f $Executable, ($Arguments -join ' '))
    $previous = Get-Location
    try {
        Set-Location -LiteralPath $WorkingDirectory
        $output = @(& $Executable @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        Set-Location -LiteralPath $previous.Path
    }
    foreach ($line in $output) { Write-LogLine ([string]$line) }
    Write-LogLine "EXIT CODE: $exitCode"
    if ($exitCode -ne 0) { throw "$Label failed with exit code $exitCode." }
}

Assert-FullSha -Name 'ImplementationHead' -Value $ImplementationHead
Assert-FullSha -Name 'BaseSha' -Value $BaseSha

$script:RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
$FrameworkRoot = [IO.Path]::GetFullPath($FrameworkRoot).TrimEnd('\','/')

if (-not (Test-Path -LiteralPath $script:RepoRoot -PathType Container)) { throw "Repository root not found: $script:RepoRoot" }
if (-not (Test-Path -LiteralPath $FrameworkRoot -PathType Container)) { throw "PHX-CI framework root not found: $FrameworkRoot" }

$actualRoot = [IO.Path]::GetFullPath((Invoke-GitText @('rev-parse','--show-toplevel'))).TrimEnd('\','/')
if (-not [string]::Equals($script:RepoRoot, $actualRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "RepoRoot is not the repository top level. Requested '$script:RepoRoot'; actual '$actualRoot'."
}

$head = Invoke-GitText @('rev-parse','HEAD')
if ($head -ne $ImplementationHead) { throw "H6B verification HEAD mismatch. Expected $ImplementationHead; actual $head." }

& git -C $script:RepoRoot merge-base --is-ancestor $BaseSha $ImplementationHead
$ancestorExit = $LASTEXITCODE
if ($ancestorExit -ne 0) { throw "Required base is not an ancestor of implementation HEAD: $BaseSha !<= $ImplementationHead" }

$sourceHead = Invoke-GitText @('rev-parse',$ExpectedBranchRef)
& git -C $script:RepoRoot merge-base --is-ancestor $ImplementationHead $sourceHead
$sourceExit = $LASTEXITCODE
if ($sourceExit -ne 0) { throw "Implementation HEAD is not contained in $ExpectedBranchRef." }

$statusBefore = Invoke-GitText @('status','--porcelain=v1')
if (-not [string]::IsNullOrWhiteSpace($statusBefore)) {
    throw "H6B verification requires a clean committed implementation checkout before PHX-CI runs.$([Environment]::NewLine)$statusBefore"
}

$configPath = Join-Path $script:RepoRoot 'phx-ci.json'
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { throw 'Missing phx-ci.json.' }
$config = Get-Content -LiteralPath $configPath -Raw -Encoding utf8 | ConvertFrom-Json
$expectedFrameworkSha = [string]$config.framework.sha
Assert-FullSha -Name 'phx-ci.json.framework.sha' -Value $expectedFrameworkSha

$frameworkHeadOutput = @(& git -C $FrameworkRoot rev-parse HEAD 2>&1)
$frameworkExit = $LASTEXITCODE
$frameworkHead = (($frameworkHeadOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
if ($frameworkExit -ne 0) { throw "Unable to resolve PHX-CI framework HEAD: $frameworkHead" }
if ($frameworkHead -ne $expectedFrameworkSha) {
    throw "PHX-CI framework pin mismatch. Expected $expectedFrameworkSha; actual $frameworkHead."
}

$taskCommand = Get-Command task.exe, task -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $taskCommand) { throw 'Go Task executable was not found.' }

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$shortHead = $ImplementationHead.Substring(0,12)
$script:LogPath = Join-Path $script:RepoRoot "dev/test-results/$timestamp-h6b-conflict-resolution-driver-extension-$shortHead.log"
New-Item -ItemType Directory -Path (Split-Path -Parent $script:LogPath) -Force | Out-Null
Set-Content -LiteralPath $script:LogPath -Value @(
    'H6B conflict-resolution production-path extension PHX-CI verification',
    "Repository: $script:RepoRoot",
    "Implementation HEAD: $ImplementationHead",
    "Base: $BaseSha",
    "Framework HEAD: $frameworkHead",
    "Started UTC: $((Get-Date).ToUniversalTime().ToString('o'))"
) -Encoding utf8

Invoke-CapturedNative -Label 'H6B committed diff check' -Executable 'git' -Arguments @('-C',$script:RepoRoot,'diff','--check',"$BaseSha..$ImplementationHead") -WorkingDirectory $script:RepoRoot

$priorFrameworkRoot = [Environment]::GetEnvironmentVariable('PHX_FRAMEWORK_ROOT','Process')
$priorFocused = [Environment]::GetEnvironmentVariable('PHX_FOCUSED_TEST_COMMAND','Process')
try {
    [Environment]::SetEnvironmentVariable('PHX_FRAMEWORK_ROOT',$FrameworkRoot,'Process')
    [Environment]::SetEnvironmentVariable('PHX_FOCUSED_TEST_COMMAND',$FocusedTestCommand,'Process')
    Invoke-CapturedNative -Label 'H6B centralized PHX-CI' -Executable ([string]$taskCommand.Source) -Arguments @('ci') -WorkingDirectory $script:RepoRoot
}
finally {
    [Environment]::SetEnvironmentVariable('PHX_FRAMEWORK_ROOT',$priorFrameworkRoot,'Process')
    [Environment]::SetEnvironmentVariable('PHX_FOCUSED_TEST_COMMAND',$priorFocused,'Process')
}

$evidenceJsonPath = Join-Path $script:RepoRoot 'dev/_ca-output.json'
$evidenceMarkdownPath = Join-Path $script:RepoRoot 'dev/_ca-output.md'
foreach ($requiredEvidence in @($evidenceJsonPath,$evidenceMarkdownPath)) {
    if (-not (Test-Path -LiteralPath $requiredEvidence -PathType Leaf)) {
        throw "PHX-CI did not produce required canonical evidence: $requiredEvidence"
    }
}

$evidence = Get-Content -LiteralPath $evidenceJsonPath -Raw -Encoding utf8 | ConvertFrom-Json
if ([string]$evidence.status -ne 'COMPLETE') { throw "PHX-CI status is not COMPLETE: $($evidence.status)" }
if ([string]$evidence.verification.changeSet.status -ne 'PASS' -or
    [string]$evidence.verification.repository.status -ne 'PASS' -or
    [string]$evidence.verification.overall.status -ne 'PASS') {
    throw ("PHX-CI did not report PASS / PASS / PASS. Observed: {0} / {1} / {2}" -f
        $evidence.verification.changeSet.status,
        $evidence.verification.repository.status,
        $evidence.verification.overall.status)
}

Invoke-CapturedNative -Label 'H6B working-tree diff check after PHX-CI evidence' -Executable 'git' -Arguments @('-C',$script:RepoRoot,'diff','--check') -WorkingDirectory $script:RepoRoot

Write-LogLine ''
Write-LogLine 'H6B VERIFICATION: PASS'
Write-LogLine 'Change-set verification: PASS'
Write-LogLine 'Repository verification: PASS'
Write-LogLine 'Overall verification: PASS'
Write-LogLine "PHX-CI run ID: $($evidence.runId)"
Write-LogLine "Verification log: $script:LogPath"

[pscustomobject]@{
    Status = 'PASS'
    ImplementationHead = $ImplementationHead
    BaseSha = $BaseSha
    FrameworkHead = $frameworkHead
    ChangeSetVerification = [string]$evidence.verification.changeSet.status
    RepositoryVerification = [string]$evidence.verification.repository.status
    OverallVerification = [string]$evidence.verification.overall.status
    EvidenceRunId = [string]$evidence.runId
    LogPath = $script:LogPath
}
