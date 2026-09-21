[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$RepoRoot,

    [Parameter(Mandatory)]
    [string]$FrameworkRoot,

    [Parameter(Mandatory)]
    [string]$BaseSha,

    [Parameter(Mandatory)]
    [string]$FocusedTestCommand,

    [string]$LogPath = ""
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-FullSha {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$Value
    )

    if ($Value -notmatch '^[0-9a-fA-F]{40}$') {
        throw ("{0} must be a full 40-character Git SHA; received '{1}'." -f $Name, $Value)
    }
}

function Resolve-Application {
    param([Parameter(Mandatory)][string[]]$Names)

    foreach ($name in $Names) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) {
            return [string]$command.Source
        }
    }

    throw ("Required executable not found: {0}" -f ($Names -join ', '))
}

function Write-RunLine {
    param([AllowEmptyString()][string]$Text)

    Write-Host $Text
    if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
        Add-Content -LiteralPath $LogPath -Value $Text -Encoding utf8
    }
}

function Invoke-NativeStep {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Executable,
        [Parameter(Mandatory)][string[]]$Arguments,
        [string]$WorkingDirectory = ""
    )

    Write-RunLine ""
    Write-RunLine ("===== {0} =====" -f $Label)
    Write-RunLine ("COMMAND: {0} {1}" -f $Executable, ($Arguments -join ' '))

    $oldLocation = $null
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $oldLocation = Get-Location
        Set-Location -LiteralPath $WorkingDirectory
    }

    try {
        $output = @(& $Executable @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        if ($null -ne $oldLocation) {
            Set-Location -LiteralPath $oldLocation.Path
        }
    }

    foreach ($line in $output) {
        Write-RunLine ([string]$line)
    }
    Write-RunLine ("EXIT CODE: {0}" -f $exitCode)

    if ($exitCode -ne 0) {
        throw ("{0} failed with exit code {1}." -f $Label, $exitCode)
    }

    return $output
}

function Invoke-GitText {
    param(
        [Parameter(Mandatory)][string[]]$Arguments
    )

    $output = @(& $script:GitExecutable -C $RepoRoot @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).TrimEnd()

    if ($exitCode -ne 0) {
        throw ("git -C '{0}' {1} failed with exit code {2}: {3}" -f $RepoRoot, ($Arguments -join ' '), $exitCode, $text)
    }

    return $text
}

function Test-AllowedPath {
    param(
        [Parameter(Mandatory)][string]$Path
    )

    $normalized = $Path.Replace('\', '/')
    $exact = @(
        'phx-ci.json',
        'Taskfile.phx-ci.yml',
        'Taskfile.yml',
        'dev/scripts/Invoke-PhxCiS07ConsumerVerification.ps1',
        'dev/scripts/run-phx-ci.ps1',
        'dev/_ca-output.md',
        'dev/_ca-output.json'
    )

    if ($exact -contains $normalized) {
        return $true
    }
    if ($normalized.StartsWith('dev/test-results/', [StringComparison]::OrdinalIgnoreCase)) {
        return $true
    }

    return $false
}

Assert-FullSha -Name 'BaseSha' -Value $BaseSha

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
$FrameworkRoot = [IO.Path]::GetFullPath($FrameworkRoot).TrimEnd('\', '/')

if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    throw ("Repository root not found: {0}" -f $RepoRoot)
}
if (-not (Test-Path -LiteralPath $FrameworkRoot -PathType Container)) {
    throw ("Framework root not found: {0}" -f $FrameworkRoot)
}
if ([string]::IsNullOrWhiteSpace($FocusedTestCommand)) {
    throw 'FocusedTestCommand cannot be empty.'
}

$script:GitExecutable = Resolve-Application -Names @('git.exe', 'git')
$taskExecutable = Resolve-Application -Names @('task.exe', 'task')

$actualRoot = Invoke-GitText -Arguments @('rev-parse', '--show-toplevel')
$actualRoot = [IO.Path]::GetFullPath($actualRoot).TrimEnd('\', '/')
if (-not [string]::Equals($RepoRoot, $actualRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw ("RepoRoot must be the repository top level. Requested '{0}', actual '{1}'." -f $RepoRoot, $actualRoot)
}

$head = Invoke-GitText -Arguments @('rev-parse', 'HEAD')
$origin = Invoke-GitText -Arguments @('remote', 'get-url', 'origin')
if ($origin -notmatch '(?i)(?:/|:)woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$') {
    throw ("Unexpected BRAIN origin: {0}" -f $origin)
}

$configPath = Join-Path $RepoRoot 'phx-ci.json'
$managedTaskfilePath = Join-Path $RepoRoot 'Taskfile.phx-ci.yml'
$rootTaskfilePath = Join-Path $RepoRoot 'Taskfile.yml'
foreach ($required in @($configPath, $managedTaskfilePath, $rootTaskfilePath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw ("Required consumer integration file is missing: {0}" -f $required)
    }
}

$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if ([string]$config.repositoryIdentity -ne 'woodpk/gdrive-sync-obsidian-plugin') {
    throw ("Unexpected repositoryIdentity in phx-ci.json: {0}" -f $config.repositoryIdentity)
}
if ([string]$config.adapter -ne 'node-typescript') {
    throw ("Unexpected adapter in phx-ci.json: {0}" -f $config.adapter)
}
if ([string]$config.framework.sha -ne 'f27088d51bfb62b4d6f14a1adc2213415766c24a') {
    throw ("Unexpected framework SHA in phx-ci.json: {0}" -f $config.framework.sha)
}
if ([string]$config.framework.version -ne '0.2.0-dev.2') {
    throw ("Unexpected framework version in phx-ci.json: {0}" -f $config.framework.version)
}
if (@($config.expectedArtifacts).Count -ne 1 -or [string]$config.expectedArtifacts[0] -ne 'main.js') {
    throw 'phx-ci.json expectedArtifacts must be exactly main.js for BRAIN.'
}

$frameworkOutput = @(& $script:GitExecutable -C $FrameworkRoot rev-parse HEAD 2>&1)
$frameworkHeadExit = $LASTEXITCODE
$frameworkHead = (($frameworkOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
if ($frameworkHeadExit -ne 0) {
    throw ("Unable to resolve framework HEAD: {0}" -f $frameworkHead)
}
if ($frameworkHead -ne [string]$config.framework.sha) {
    throw ("Framework checkout does not match BRAIN pin. Expected {0}; actual {1}." -f $config.framework.sha, $frameworkHead)
}

if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = [IO.Path]::GetFullPath($LogPath)
    $logParent = Split-Path -Parent $LogPath
    if (-not [string]::IsNullOrWhiteSpace($logParent)) {
        New-Item -ItemType Directory -Path $logParent -Force | Out-Null
    }
    Set-Content -LiteralPath $LogPath -Value @(
        'BRAIN S07 consumer verification',
        ("Repository: {0}" -f $RepoRoot),
        ("HEAD: {0}" -f $head),
        ("Base: {0}" -f $BaseSha),
        ("Framework: {0}" -f $frameworkHead),
        ("Started UTC: {0}" -f (Get-Date).ToUniversalTime().ToString('o'))
    ) -Encoding utf8
}

$previousFrameworkRoot = [Environment]::GetEnvironmentVariable('PHX_FRAMEWORK_ROOT', 'Process')
$previousFocused = [Environment]::GetEnvironmentVariable('PHX_FOCUSED_TEST_COMMAND', 'Process')

try {
    [Environment]::SetEnvironmentVariable('PHX_FRAMEWORK_ROOT', $FrameworkRoot, 'Process')
    [Environment]::SetEnvironmentVariable('PHX_FOCUSED_TEST_COMMAND', $FocusedTestCommand, 'Process')
    Invoke-NativeStep -Label 'BRAIN canonical Task CI' -Executable $taskExecutable -Arguments @('ci') -WorkingDirectory $RepoRoot | Out-Null
}
finally {
    [Environment]::SetEnvironmentVariable('PHX_FRAMEWORK_ROOT', $previousFrameworkRoot, 'Process')
    [Environment]::SetEnvironmentVariable('PHX_FOCUSED_TEST_COMMAND', $previousFocused, 'Process')
}

$evidenceJsonPath = Join-Path $RepoRoot 'dev/_ca-output.json'
if (-not (Test-Path -LiteralPath $evidenceJsonPath -PathType Leaf)) {
    throw ("Canonical PHX-CI JSON evidence was not produced: {0}" -f $evidenceJsonPath)
}

$evidence = Get-Content -LiteralPath $evidenceJsonPath -Raw | ConvertFrom-Json
if ([string]$evidence.status -ne 'COMPLETE') {
    throw ("BRAIN canonical verification did not complete: {0}" -f $evidence.status)
}
if ([string]$evidence.verification.changeSet.status -ne 'PASS') {
    throw ("BRAIN change-set verification did not pass: {0}" -f $evidence.verification.changeSet.status)
}
if ([string]$evidence.verification.repository.status -ne 'PASS') {
    throw ("BRAIN repository verification did not pass: {0}" -f $evidence.verification.repository.status)
}
if ([string]$evidence.verification.overall.status -ne 'PASS') {
    throw ("BRAIN overall verification did not pass: {0}" -f $evidence.verification.overall.status)
}

$requiredStages = @(
    'preflight',
    'node-preflight',
    'node-project-files',
    'install',
    'typecheck',
    'test-focused',
    'test',
    'build',
    'repository-check',
    'check',
    'artifacts'
)

foreach ($stageName in $requiredStages) {
    $matches = @($evidence.stages | Where-Object { [string]$_.name -eq $stageName })
    if ($matches.Count -ne 1) {
        throw ("Expected exactly one evidence stage '{0}', found {1}." -f $stageName, $matches.Count)
    }
    if ([string]$matches[0].result -ne 'PASS') {
        throw ("Evidence stage '{0}' did not pass: {1}" -f $stageName, $matches[0].result)
    }
}

Invoke-NativeStep -Label 'BRAIN diff check from S07 migration base' -Executable $script:GitExecutable -Arguments @('-C', $RepoRoot, 'diff', '--check', ("{0}..HEAD" -f $BaseSha)) | Out-Null

$changedRaw = Invoke-GitText -Arguments @('diff', '--name-only', ("{0}..HEAD" -f $BaseSha))
$changedPaths = @(
    $changedRaw -split '[\r\n]+' |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)
$unexpected = @($changedPaths | Where-Object { -not (Test-AllowedPath -Path $_) })
if ($unexpected.Count -gt 0) {
    throw ("S07 BRAIN diff contains unrelated paths: {0}" -f ($unexpected -join ', '))
}

Write-RunLine ""
Write-RunLine 'BRAIN S07 CONSUMER VERIFICATION: PASS'
Write-RunLine ("Verified HEAD: {0}" -f $head)
Write-RunLine ("Evidence run ID: {0}" -f $evidence.runId)
Write-RunLine ("Changed paths from base: {0}" -f ($changedPaths -join ', '))

[pscustomobject]@{
    Status = 'PASS'
    VerifiedHead = $head
    EvidenceRunId = [string]$evidence.runId
    ChangeSetVerification = [string]$evidence.verification.changeSet.status
    RepositoryVerification = [string]$evidence.verification.repository.status
    OverallVerification = [string]$evidence.verification.overall.status
    ChangedPaths = @($changedPaths)
}
