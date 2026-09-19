[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$RepoRoot,

    [Parameter(Mandatory)]
    [string]$Branch,

    [Parameter(Mandatory)]
    [string]$ExpectedHead,

    [Parameter(Mandatory)]
    [string]$BaseSha,

    [Parameter(Mandatory)]
    [string]$RunName,

    [Parameter(Mandatory)]
    [string]$FocusedTest,

    [Parameter(Mandatory)]
    [string[]]$AllowedChangedFiles,

    [string[]]$RequiredAncestors = @(),

    [string[]]$ForbiddenAncestors = @(),

    [string[]]$RequiredFiles = @(),

    [string]$PredecessorEvidenceMarker = "",

    [string]$FrameworkRoot = "D:\dev-tools\phx-ci",

    [string]$FrameworkHead = "f3e66abd3d83f5c4f1680677f5b0574ee510ec9e",

    [string]$FrameworkVersion = "0.2.0-dev.2",

    [string]$ExpectedTaskVersion = "3.53.1",

    [string]$ExpectedArtifact = "main.js",

    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-GitAt {
    param(
        [Parameter(Mandatory)][string]$WorkingTree,
        [Parameter(Mandatory)][string[]]$Args,
        [switch]$AllowFailure
    )

    $output = & git.exe -C $WorkingTree @Args 2>&1
    $code = $LASTEXITCODE
    $text = ($output | Out-String).Trim()

    if (-not $AllowFailure -and $code -ne 0) {
        throw "git -C '$WorkingTree' $($Args -join ' ') failed (exit $code).`n$text"
    }

    [pscustomobject]@{
        ExitCode = $code
        Output   = $text
    }
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

function Assert-CleanWorkingTree {
    param([Parameter(Mandatory)][string]$WorkingTree)

    $status = (Invoke-GitAt -WorkingTree $WorkingTree -Args @("status", "--porcelain=v1", "--untracked-files=all")).Output
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw "Repository must be clean before verification.`n$status"
    }
}

function Remove-StalePhxRuntime {
    param([Parameter(Mandatory)][string]$WorkingTree)

    $runtimeDir = Join-Path $WorkingTree ".phx-ci"
    if (-not (Test-Path -LiteralPath $runtimeDir)) {
        return
    }

    $tracked = (Invoke-GitAt -WorkingTree $WorkingTree -Args @("ls-files", "--", ".phx-ci")).Output
    if (-not [string]::IsNullOrWhiteSpace($tracked)) {
        throw ".phx-ci contains Git-tracked files; refusing automatic runtime cleanup.`n$tracked"
    }

    $lastError = $null
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Remove-Item -LiteralPath $runtimeDir -Recurse -Force -ErrorAction Stop
            return
        }
        catch {
            $lastError = $_
            if ($attempt -lt 3) {
                Start-Sleep -Milliseconds 200
            }
        }
    }

    throw "Unable to remove phx-ci runtime directory after 3 attempts: $runtimeDir`n$($lastError.Exception.Message)"
}

function Test-PathRule {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Rule
    )

    $normalizedPath = $Path.Replace("\", "/")
    $normalizedRule = $Rule.Replace("\", "/")

    if ($normalizedRule.EndsWith("/")) {
        return $normalizedPath.StartsWith($normalizedRule, [StringComparison]::OrdinalIgnoreCase)
    }

    if ($normalizedRule.Contains("*") -or $normalizedRule.Contains("?")) {
        return $normalizedPath -like $normalizedRule
    }

    return $normalizedPath -ieq $normalizedRule
}

function Assert-OnlyAllowedPaths {
    param(
        [Parameter(Mandatory)][string[]]$Paths,
        [Parameter(Mandatory)][string[]]$Rules,
        [Parameter(Mandatory)][string]$Context
    )

    $violations = [Collections.Generic.List[string]]::new()
    foreach ($path in $Paths) {
        if ([string]::IsNullOrWhiteSpace($path)) {
            continue
        }

        $matched = $false
        foreach ($rule in $Rules) {
            if ([string]::IsNullOrWhiteSpace($rule)) {
                continue
            }
            if (Test-PathRule -Path $path -Rule $rule) {
                $matched = $true
                break
            }
        }

        if (-not $matched) {
            $violations.Add($path)
        }
    }

    if ($violations.Count -gt 0) {
        throw "$Context contains non-permitted paths: $($violations -join ', ')"
    }
}

function Convert-ToYamlSingleQuoted {
    param([AllowEmptyString()][string]$Value)
    "'" + $Value.Replace("'", "''") + "'"
}

function Convert-ToForwardSlash {
    param([string]$Value)
    $Value.Replace("\", "/")
}

function Add-LogLine {
    param([string]$Path, [string]$Text)
    Add-Content -LiteralPath $Path -Value $Text -Encoding utf8
}

function Get-EvidenceRunId {
    param([Parameter(Mandatory)][string]$EvidencePath)

    if (-not (Test-Path -LiteralPath $EvidencePath -PathType Leaf)) {
        return ""
    }

    $line = Get-Content -LiteralPath $EvidencePath |
            Where-Object { $_ -match '^\s*-?\s*Run ID:\s*' } |
            Select-Object -First 1

    if (-not $line) {
        return ""
    }

    return ($line -replace '^\s*-?\s*Run ID:\s*', '').Trim()
}

function Write-FallbackEvidence {
    param(
        [Parameter(Mandatory)][string]$EvidencePath,
        [Parameter(Mandatory)][string]$ProjectRoot,
        [Parameter(Mandatory)][string]$ProjectName,
        [Parameter(Mandatory)][string]$VerifiedHead,
        [Parameter(Mandatory)][string]$SourceBuildHead,
        [Parameter(Mandatory)][string]$Base,
        [Parameter(Mandatory)][string]$Reason
    )

    $runId = "runner-fallback-$([guid]::NewGuid().ToString('D'))"
    $now = (Get-Date).ToUniversalTime().ToString('o')
    $jsonPath = [IO.Path]::ChangeExtension($EvidencePath, '.json')
    New-Item -ItemType Directory -Path (Split-Path -Parent $EvidencePath) -Force | Out-Null

    @(
        "STATUS: BLOCKED",
        "",
        "# phx-ci runner fallback evidence - $ProjectName",
        "",
        "- Run ID: $runId",
        "- Repository: $ProjectRoot",
        "- Verified HEAD: $VerifiedHead",
        "- Source build HEAD: $SourceBuildHead",
        "- Base SHA: $Base",
        "- Generated: $now",
        "",
        "Final verdict: BLOCKED",
        "Failure classification: RUNNER/FRAMEWORK FAILURE",
        "Reason: $Reason"
    ) | Set-Content -LiteralPath $EvidencePath -Encoding utf8NoBOM

    [ordered]@{
        schemaVersion = 'runner-fallback-1'
        runId = $runId
        status = 'BLOCKED'
        repository = [ordered]@{
            path = $ProjectRoot
            name = $ProjectName
            verifiedHead = $VerifiedHead
            sourceBuildHead = $SourceBuildHead
            baseSha = $Base
        }
        endedAt = $now
        finalVerdict = 'BLOCKED'
        failureClassification = 'RUNNER/FRAMEWORK FAILURE'
        reason = $Reason
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $jsonPath -Encoding utf8NoBOM
}

function Set-RunnerBlockedEvidence {
    param(
        [Parameter(Mandatory)][string]$EvidencePath,
        [Parameter(Mandatory)][string]$Reason
    )

    if (-not (Test-Path -LiteralPath $EvidencePath -PathType Leaf)) {
        throw "Cannot mark missing evidence BLOCKED: $EvidencePath"
    }

    $lines = @(Get-Content -LiteralPath $EvidencePath)
    if ($lines.Count -eq 0) {
        $lines = @("STATUS: BLOCKED")
    }
    else {
        $lines[0] = "STATUS: BLOCKED"
    }

    $lines += @(
        "",
        "## Core-runner safety gate",
        "",
        "- Result: BLOCKED",
        "- Failure classification: RUNNER SAFETY FAILURE",
        "- Reason: $Reason"
    )
    $lines | Set-Content -LiteralPath $EvidencePath -Encoding utf8NoBOM

    $jsonPath = [IO.Path]::ChangeExtension($EvidencePath, '.json')
    if (Test-Path -LiteralPath $jsonPath -PathType Leaf) {
        try {
            $model = Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json
            $model.status = 'BLOCKED'
            $model.finalVerdict = 'BLOCKED'
            $model.failureClassification = 'RUNNER SAFETY FAILURE'
            if ($model.PSObject.Properties.Name -contains 'runnerSafetyFailure') {
                $model.runnerSafetyFailure = $Reason
            }
            else {
                $model | Add-Member -NotePropertyName runnerSafetyFailure -NotePropertyValue $Reason
            }
            $model | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $jsonPath -Encoding utf8NoBOM
        }
        catch {
            # Preserve truthful Markdown evidence even if supplemental JSON cannot be amended.
            Remove-Item -LiteralPath $jsonPath -Force -ErrorAction SilentlyContinue
        }
    }
}

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd("\", "/")
$FrameworkRoot = [IO.Path]::GetFullPath($FrameworkRoot).TrimEnd("\", "/")

Assert-FullSha -Name "ExpectedHead" -Value $ExpectedHead
Assert-FullSha -Name "BaseSha" -Value $BaseSha
Assert-FullSha -Name "FrameworkHead" -Value $FrameworkHead
foreach ($sha in $RequiredAncestors) {
    if (-not [string]::IsNullOrWhiteSpace($sha)) {
        Assert-FullSha -Name "RequiredAncestor" -Value $sha
    }
}
foreach ($sha in $ForbiddenAncestors) {
    if (-not [string]::IsNullOrWhiteSpace($sha)) {
        Assert-FullSha -Name "ForbiddenAncestor" -Value $sha
    }
}

if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    throw "Repository not found: $RepoRoot"
}
if (-not (Test-Path -LiteralPath $FrameworkRoot -PathType Container)) {
    throw "phx-ci framework not found: $FrameworkRoot"
}

$taskCommand = Get-Command task.exe -ErrorAction SilentlyContinue
if (-not $taskCommand) {
    $taskCommand = Get-Command task -ErrorAction SilentlyContinue
}
if (-not $taskCommand) {
    throw "Task is not available on PATH."
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    throw "Branch cannot be empty."
}
if ([string]::IsNullOrWhiteSpace($FocusedTest)) {
    throw "FocusedTest cannot be empty."
}

$branchFormat = Invoke-GitAt -WorkingTree $RepoRoot -Args @("check-ref-format", "--branch", $Branch) -AllowFailure
if ($branchFormat.ExitCode -ne 0) {
    throw "Invalid Git branch name: $Branch"
}

# Control-plane invariant: the primary checkout is never switched, cleaned, restored, reset, or
# otherwise edited by this script. Local current-build runner edits are therefore harmless.
$controlBranchBefore = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("branch", "--show-current")).Output
$controlHeadBefore = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("rev-parse", "HEAD")).Output

$originUrl = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("remote", "get-url", "origin")).Output
if ($originUrl -notmatch '(?i)(?:/|:)woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$') {
    throw "RepoRoot origin is not woodpk/gdrive-sync-obsidian-plugin: $originUrl"
}

# Framework integrity gate.
$frameworkStatus = (Invoke-GitAt -WorkingTree $FrameworkRoot -Args @("status", "--porcelain=v1", "--untracked-files=all")).Output
if (-not [string]::IsNullOrWhiteSpace($frameworkStatus)) {
    throw "phx-ci working tree is not clean.`n$frameworkStatus"
}

$actualFrameworkHead = (Invoke-GitAt -WorkingTree $FrameworkRoot -Args @("rev-parse", "HEAD")).Output
if ($actualFrameworkHead -ne $FrameworkHead) {
    throw "phx-ci HEAD mismatch. Expected $FrameworkHead; actual $actualFrameworkHead"
}

$frameworkVersionPath = Join-Path $FrameworkRoot "VERSION"
$nodeTaskfilePath = Join-Path $FrameworkRoot "taskfiles\node.yml"
if (-not (Test-Path -LiteralPath $frameworkVersionPath -PathType Leaf)) {
    throw "phx-ci VERSION file is missing: $frameworkVersionPath"
}
if (-not (Test-Path -LiteralPath $nodeTaskfilePath -PathType Leaf)) {
    throw "phx-ci Node adapter is missing: $nodeTaskfilePath"
}

$actualFrameworkVersion = (Get-Content -LiteralPath $frameworkVersionPath -Raw).Trim()
if ($actualFrameworkVersion -ne $FrameworkVersion) {
    throw "phx-ci VERSION mismatch. Expected $FrameworkVersion; actual $actualFrameworkVersion"
}

$actualTaskVersion = (& $taskCommand.Source --version 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Task version check failed: $actualTaskVersion"
}
if ($actualTaskVersion -notmatch ('(?<!\d)' + [regex]::Escape($ExpectedTaskVersion) + '(?!\d)')) {
    throw "Task version mismatch. Expected $ExpectedTaskVersion; actual '$actualTaskVersion'."
}

Invoke-GitAt -WorkingTree $RepoRoot -Args @("fetch", "origin", "--prune") | Out-Null

$remoteRefCheck = Invoke-GitAt -WorkingTree $RepoRoot -Args @("show-ref", "--verify", "--quiet", "refs/remotes/origin/$Branch") -AllowFailure
if ($remoteRefCheck.ExitCode -ne 0) {
    throw "Remote branch does not exist: origin/$Branch"
}

$remoteHead = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("rev-parse", "origin/$Branch")).Output

$expectedExists = Invoke-GitAt -WorkingTree $RepoRoot -Args @("cat-file", "-e", "$ExpectedHead^{commit}") -AllowFailure
if ($expectedExists.ExitCode -ne 0) {
    throw "ExpectedHead is not available as a commit: $ExpectedHead"
}

$expectedAncestor = Invoke-GitAt -WorkingTree $RepoRoot -Args @("merge-base", "--is-ancestor", $ExpectedHead, $remoteHead) -AllowFailure
if ($expectedAncestor.ExitCode -ne 0) {
    throw "origin/$Branch no longer contains the expected build HEAD $ExpectedHead. Refusing to test a different build."
}

# Repeated runs are allowed only when commits after ExpectedHead contain prior CI evidence/results.
$publicationOnlyRules = @(
    "dev/_ca-output.md",
    "dev/_ca-output.json",
    "dev/test-results/**"
)
if ($remoteHead -ne $ExpectedHead) {
    $postBuildDeltaRaw = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("diff", "--name-only", "$ExpectedHead..$remoteHead")).Output
    $postBuildDelta = @($postBuildDeltaRaw -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Assert-OnlyAllowedPaths -Paths $postBuildDelta -Rules $publicationOnlyRules -Context "Commits after ExpectedHead on origin/$Branch"
}

$baseGate = Invoke-GitAt -WorkingTree $RepoRoot -Args @("merge-base", "--is-ancestor", $BaseSha, $remoteHead) -AllowFailure
if ($baseGate.ExitCode -ne 0) {
    throw "Required base $BaseSha is not an ancestor of origin/$Branch ($remoteHead)."
}

foreach ($sha in $RequiredAncestors) {
    if ([string]::IsNullOrWhiteSpace($sha)) {
        continue
    }
    $gate = Invoke-GitAt -WorkingTree $RepoRoot -Args @("merge-base", "--is-ancestor", $sha, $remoteHead) -AllowFailure
    if ($gate.ExitCode -ne 0) {
        throw "Required ancestor $sha is not an ancestor of origin/$Branch ($remoteHead)."
    }
}

$safeRunName = ($RunName -replace "[^A-Za-z0-9._-]", "-").Trim("-")
if ([string]::IsNullOrWhiteSpace($safeRunName)) {
    throw "RunName does not contain a usable filename component."
}

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$shortSourceHead = $ExpectedHead.Substring(0, 12)
$resultStem = "$stamp-$safeRunName-$shortSourceHead"
$tempRoot = Join-Path $env:TEMP "phx-ci-run-$([guid]::NewGuid().ToString('N'))"
$worktreeRoot = Join-Path $tempRoot "gdrive-sync-obsidian-plugin"
$tempTaskFile = Join-Path $tempRoot "Taskfile.yml"
$tempLog = Join-Path $tempRoot "$resultStem.log"

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

$worktreeRegistered = $false
$preserveTemp = $false
$evidenceCommit = ""
$evidenceSafelyPreserved = $false
$published = $false
$pushError = ""
$cleanupIssue = ""
$verificationStatus = "BLOCKED"
$ciExit = 999
$taskInvocationFailed = $false

try {
    Invoke-GitAt -WorkingTree $RepoRoot -Args @("worktree", "add", "--detach", $worktreeRoot, $remoteHead) | Out-Null
    $worktreeRegistered = $true

    $worktreeHead = (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("rev-parse", "HEAD")).Output
    if ($worktreeHead -ne $remoteHead) {
        throw "Temporary verification worktree HEAD mismatch. Expected $remoteHead; actual $worktreeHead"
    }

    Remove-StalePhxRuntime -WorkingTree $worktreeRoot
    Assert-CleanWorkingTree -WorkingTree $worktreeRoot

    $resultsDir = Join-Path $worktreeRoot "dev\test-results"
    New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null

    $evidenceMd = Join-Path $worktreeRoot "dev\_ca-output.md"
    $evidenceJson = Join-Path $worktreeRoot "dev\_ca-output.json"
    $resultMd = Join-Path $resultsDir "$resultStem.md"
    $resultJson = Join-Path $resultsDir "$resultStem.json"
    $resultLog = Join-Path $resultsDir "$resultStem.log"

    $oldEvidenceRunId = Get-EvidenceRunId -EvidencePath $evidenceMd

    # Framework-generated runtime/evidence paths are permitted working-tree changes during the run.
    $effectiveAllowed = @(
        $AllowedChangedFiles
        "dev/_ca-output.md"
        "dev/_ca-output.json"
        "dev/test-results/**"
        ".phx-ci/**"
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique

    $repoYaml = Convert-ToYamlSingleQuoted (Convert-ToForwardSlash $worktreeRoot)
    $frameworkYaml = Convert-ToYamlSingleQuoted (Convert-ToForwardSlash $FrameworkRoot)
    $nodeTaskfileYaml = Convert-ToYamlSingleQuoted ((Convert-ToForwardSlash $FrameworkRoot) + "/taskfiles/node.yml")
    $focusedYaml = Convert-ToYamlSingleQuoted $FocusedTest
    $allowedYaml = Convert-ToYamlSingleQuoted ($effectiveAllowed -join ";")
    $forbiddenYaml = Convert-ToYamlSingleQuoted (($ForbiddenAncestors | Where-Object { $_ }) -join ";")
    $requiredYaml = Convert-ToYamlSingleQuoted (($RequiredFiles | Where-Object { $_ }) -join ";")
    $predecessorYaml = Convert-ToYamlSingleQuoted $PredecessorEvidenceMarker
    $headYaml = Convert-ToYamlSingleQuoted $remoteHead
    $baseYaml = Convert-ToYamlSingleQuoted $BaseSha
    $artifactYaml = Convert-ToYamlSingleQuoted $ExpectedArtifact
    $frameworkVersionYaml = Convert-ToYamlSingleQuoted $FrameworkVersion
    $evidenceYaml = Convert-ToYamlSingleQuoted (Convert-ToForwardSlash $evidenceMd)

    # The temporary worktree is intentionally detached. The core runner independently proves
    # source branch -> exact commit identity before Task starts, so Task's branch check is omitted.
    $taskfile = @"
version: '3'

includes:
  phx-node:
    taskfile: $nodeTaskfileYaml
    flatten: true
    vars:
      PHX_FRAMEWORK_ROOT: $frameworkYaml
      PHX_PROJECT_ROOT: $repoYaml
      PHX_PROJECT_NAME: 'gdrive-sync-obsidian-plugin'
      PHX_EXPECTED_FRAMEWORK_VERSION: $frameworkVersionYaml
      PHX_FOCUSED_TEST_COMMAND: $focusedYaml
      PHX_EXPECTED_ARTIFACTS: $artifactYaml
      PHX_EXPECTED_REPOSITORY: $repoYaml
      PHX_EXPECTED_BRANCH: ''
      PHX_EXPECTED_HEAD: $headYaml
      PHX_EXPECTED_BASE_SHA: $baseYaml
      PHX_REQUIRE_CLEAN_TREE: false
      PHX_ALLOWED_CHANGED_FILES: $allowedYaml
      PHX_PROHIBITED_CHANGED_FILES: '.github/workflows/'
      PHX_REQUIRED_FILES: $requiredYaml
      PHX_PREDECESSOR_EVIDENCE_MARKER: $predecessorYaml
      PHX_FORBIDDEN_ANCESTORS: $forbiddenYaml
      PHX_EVIDENCE_ABSOLUTE: $evidenceYaml
"@

    Set-Content -LiteralPath $tempTaskFile -Value $taskfile -Encoding utf8NoBOM

    Set-Content -LiteralPath $tempLog -Value @(
        "phx-ci standardized local verification",
        "Run name: $RunName",
        "Source branch: $Branch",
        "Source build HEAD: $ExpectedHead",
        "Verification checkout HEAD: $remoteHead",
        "Base SHA: $BaseSha",
        "Control repository: $RepoRoot",
        "Verification worktree: $worktreeRoot",
        "Framework HEAD: $FrameworkHead",
        "Framework version: $FrameworkVersion",
        "Task version: $actualTaskVersion",
        "Task executable: $($taskCommand.Source)",
        "Started UTC: $((Get-Date).ToUniversalTime().ToString('o'))",
        "",
        "===== task ci output =====",
        ""
    ) -Encoding utf8

    Push-Location $worktreeRoot
    try {
        & $taskCommand.Source -t $tempTaskFile ci *>> $tempLog
        $ciExit = $LASTEXITCODE
    }
    catch {
        $taskInvocationFailed = $true
        Add-LogLine -Path $tempLog -Text ""
        Add-LogLine -Path $tempLog -Text "Runner caught Task invocation exception:"
        Add-LogLine -Path $tempLog -Text $_.Exception.ToString()
    }
    finally {
        Pop-Location
    }

    Add-LogLine -Path $tempLog -Text ""
    Add-LogLine -Path $tempLog -Text "===== task ci finished ====="
    Add-LogLine -Path $tempLog -Text "Task exit code: $ciExit"
    Add-LogLine -Path $tempLog -Text "Ended UTC: $((Get-Date).ToUniversalTime().ToString('o'))"

    # Runtime records have already served their purpose; never publish .phx-ci itself.
    Remove-StalePhxRuntime -WorkingTree $worktreeRoot

    if (-not (Test-Path -LiteralPath $evidenceMd -PathType Leaf)) {
        Write-FallbackEvidence `
            -EvidencePath $evidenceMd `
            -ProjectRoot $worktreeRoot `
            -ProjectName "gdrive-sync-obsidian-plugin" `
            -VerifiedHead $remoteHead `
            -SourceBuildHead $ExpectedHead `
            -Base $BaseSha `
            -Reason "Task/phx-ci did not produce canonical Markdown evidence. See the run transcript."
        $taskInvocationFailed = $true
    }

    $newEvidenceRunId = Get-EvidenceRunId -EvidencePath $evidenceMd
    if ([string]::IsNullOrWhiteSpace($newEvidenceRunId)) {
        Write-FallbackEvidence `
            -EvidencePath $evidenceMd `
            -ProjectRoot $worktreeRoot `
            -ProjectName "gdrive-sync-obsidian-plugin" `
            -VerifiedHead $remoteHead `
            -SourceBuildHead $ExpectedHead `
            -Base $BaseSha `
            -Reason "Canonical evidence did not contain a run ID. See the run transcript."
        $newEvidenceRunId = Get-EvidenceRunId -EvidencePath $evidenceMd
        $taskInvocationFailed = $true
    }

    if ($oldEvidenceRunId -and $newEvidenceRunId -eq $oldEvidenceRunId) {
        Write-FallbackEvidence `
            -EvidencePath $evidenceMd `
            -ProjectRoot $worktreeRoot `
            -ProjectName "gdrive-sync-obsidian-plugin" `
            -VerifiedHead $remoteHead `
            -SourceBuildHead $ExpectedHead `
            -Base $BaseSha `
            -Reason "Evidence run ID did not change; stale evidence was rejected. See the run transcript."
        $taskInvocationFailed = $true
    }

    # Detect any working-tree changes produced by install/test/build steps other than canonical
    # evidence. In the isolated worktree these can be safely discarded after being recorded, but
    # they force the overall result to BLOCKED.
    $expectedEvidencePaths = @(
        "dev/_ca-output.md",
        "dev/_ca-output.json"
    )

    $modifiedTracked = @(
    (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("diff", "--name-only")).Output -split "`n" |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    $stagedTracked = @(
    (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("diff", "--cached", "--name-only")).Output -split "`n" |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    $untracked = @(
    (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("ls-files", "--others", "--exclude-standard")).Output -split "`n" |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    $unexpectedTracked = @(($modifiedTracked + $stagedTracked) | Sort-Object -Unique | Where-Object { $_ -notin $expectedEvidencePaths })
    $unexpectedUntracked = @($untracked | Sort-Object -Unique | Where-Object { $_ -notin $expectedEvidencePaths })

    if ($unexpectedTracked.Count -gt 0 -or $unexpectedUntracked.Count -gt 0) {
        $unexpected = @(($unexpectedTracked + $unexpectedUntracked) | Sort-Object -Unique)
        $reason = "Verification commands changed non-evidence working-tree paths: $($unexpected -join ', ')"
        Add-LogLine -Path $tempLog -Text ""
        Add-LogLine -Path $tempLog -Text $reason
        Set-RunnerBlockedEvidence -EvidencePath $evidenceMd -Reason $reason
        $taskInvocationFailed = $true

        foreach ($path in $unexpectedTracked) {
            Invoke-GitAt -WorkingTree $worktreeRoot -Args @("restore", "--staged", "--worktree", "--", $path) -AllowFailure | Out-Null
        }
        foreach ($path in $unexpectedUntracked) {
            $full = [IO.Path]::GetFullPath((Join-Path $worktreeRoot $path))
            if (-not $full.StartsWith($worktreeRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Refusing to remove unexpected path outside temporary verification worktree: $full"
            }
            if (Test-Path -LiteralPath $full) {
                Remove-Item -LiteralPath $full -Recurse -Force
            }
        }
    }

    # Preserve immutable historical copies only after all core-runner safety gates have finalized
    # the canonical verdict.
    Copy-Item -LiteralPath $evidenceMd -Destination $resultMd -Force
    if (Test-Path -LiteralPath $evidenceJson -PathType Leaf) {
        Copy-Item -LiteralPath $evidenceJson -Destination $resultJson -Force
    }
    Copy-Item -LiteralPath $tempLog -Destination $resultLog -Force

    Add-Content -LiteralPath $resultMd -Encoding utf8 -Value @(
        "",
        "## Core-runner provenance",
        "",
        "- Source branch: $Branch",
        "- Source build HEAD requested: $ExpectedHead",
        "- Verification checkout HEAD: $remoteHead",
        "- Evidence publication target: origin/$Branch"
    )

    $statusLine = (Get-Content -LiteralPath $evidenceMd -First 1).Trim()
    $verificationStatus = if ($statusLine -eq "STATUS: COMPLETE" -and $ciExit -eq 0 -and -not $taskInvocationFailed) {
        "COMPLETE"
    }
    else {
        "BLOCKED"
    }

    # Before publication, permit only canonical evidence and this run's immutable history files.
    $permittedPostRun = @(
        "dev/_ca-output.md",
        "dev/_ca-output.json",
        "dev/test-results/$([IO.Path]::GetFileName($resultMd))",
        "dev/test-results/$([IO.Path]::GetFileName($resultJson))",
        "dev/test-results/$([IO.Path]::GetFileName($resultLog))"
    )

    $remainingModified = @(
    (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("diff", "--name-only")).Output -split "`n" |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    $remainingStaged = @(
    (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("diff", "--cached", "--name-only")).Output -split "`n" |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    $remainingUntracked = @(
    (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("ls-files", "--others", "--exclude-standard")).Output -split "`n" |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    $remainingPaths = @(($remainingModified + $remainingStaged + $remainingUntracked) | Sort-Object -Unique)
    Assert-OnlyAllowedPaths -Paths $remainingPaths -Rules $permittedPostRun -Context "Post-run publication state"

    $publishPaths = @($permittedPostRun | Where-Object {
        Test-Path -LiteralPath (Join-Path $worktreeRoot $_)
    })

    foreach ($path in $publishPaths) {
        Invoke-GitAt -WorkingTree $worktreeRoot -Args @("add", "--", $path) | Out-Null
    }

    $staged = @(
    (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("diff", "--cached", "--name-only")).Output -split "`n" |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    Assert-OnlyAllowedPaths -Paths $staged -Rules $permittedPostRun -Context "Staged verification publication"

    if ($staged.Count -eq 0) {
        throw "No verification evidence was staged for publication."
    }

    # Prevent a race: publication may only extend the exact remote commit that was tested.
    Invoke-GitAt -WorkingTree $RepoRoot -Args @("fetch", "origin", "--prune") | Out-Null
    $remoteBeforePublish = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("rev-parse", "origin/$Branch")).Output
    if ($remoteBeforePublish -ne $remoteHead) {
        throw "origin/$Branch advanced during verification from $remoteHead to $remoteBeforePublish. Evidence was not committed or pushed because it no longer extends the exact tested remote state."
    }

    $commitMessage = "test(ci): publish $RunName verification for $shortSourceHead"
    Invoke-GitAt -WorkingTree $worktreeRoot -Args @("commit", "-m", $commitMessage) | Out-Null
    $evidenceCommit = (Invoke-GitAt -WorkingTree $worktreeRoot -Args @("rev-parse", "HEAD")).Output

    if ($NoPush) {
        $localEvidenceBranch = "phx-ci-evidence/$safeRunName-$stamp"
        Invoke-GitAt -WorkingTree $RepoRoot -Args @("branch", $localEvidenceBranch, $evidenceCommit) | Out-Null
        $evidenceSafelyPreserved = $true
        $pushError = "Push disabled. Evidence preserved on local branch $localEvidenceBranch."
    }
    else {
        $push = Invoke-GitAt -WorkingTree $worktreeRoot -Args @("push", "origin", "HEAD:refs/heads/$Branch") -AllowFailure
        if ($push.ExitCode -eq 0) {
            $published = $true
            $evidenceSafelyPreserved = $true
        }
        else {
            $localEvidenceBranch = "phx-ci-evidence/$safeRunName-$stamp"
            Invoke-GitAt -WorkingTree $RepoRoot -Args @("branch", $localEvidenceBranch, $evidenceCommit) | Out-Null
            $evidenceSafelyPreserved = $true
            $pushError = "git push failed. Evidence preserved on local branch $localEvidenceBranch. $($push.Output)"
        }
    }
}
catch {
    $preserveTemp = $true
    $originalMessage = $_.Exception.Message
    if ($worktreeRegistered -and (Test-Path -LiteralPath $worktreeRoot)) {
        throw "$originalMessage`nTemporary verification state preserved at: $worktreeRoot"
    }
    throw
}
finally {
    if ($worktreeRegistered -and $evidenceSafelyPreserved -and -not $preserveTemp) {
        $removeResult = Invoke-GitAt -WorkingTree $RepoRoot -Args @("worktree", "remove", "--force", $worktreeRoot) -AllowFailure
        if ($removeResult.ExitCode -eq 0) {
            Invoke-GitAt -WorkingTree $RepoRoot -Args @("worktree", "prune") -AllowFailure | Out-Null
            if (Test-Path -LiteralPath $tempRoot) {
                Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        else {
            $cleanupIssue = "Could not remove temporary verification worktree. Preserved at $worktreeRoot. $($removeResult.Output)"
        }
    }
    elseif (-not $worktreeRegistered) {
        if (Test-Path -LiteralPath $tempRoot) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}


$controlBranchAfter = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("branch", "--show-current")).Output
$controlHeadAfter = (Invoke-GitAt -WorkingTree $RepoRoot -Args @("rev-parse", "HEAD")).Output
$controlCheckoutPreserved = ($controlBranchAfter -ceq $controlBranchBefore) -and ($controlHeadAfter -ceq $controlHeadBefore)
if (-not $controlCheckoutPreserved) {
    throw "Core runner changed the primary checkout unexpectedly. Branch/HEAD before: '$controlBranchBefore' @ $controlHeadBefore; after: '$controlBranchAfter' @ $controlHeadAfter"
}

Write-Host ""
Write-Host "PHX-CI RUN RESULT"
Write-Host "Verification: $verificationStatus"
Write-Host "Task exit code: $ciExit"
Write-Host "Source branch: $Branch"
Write-Host "Source build HEAD: $ExpectedHead"
Write-Host "Verification checkout HEAD: $remoteHead"
Write-Host "Evidence commit: $evidenceCommit"
Write-Host "Evidence published: $(if ($NoPush) { 'NO (-NoPush)' } elseif ($published) { 'YES' } else { 'NO' })"
Write-Host "Control checkout preserved: YES"
if ($pushError) {
    Write-Host "Publication issue: $pushError"
}
if ($cleanupIssue) {
    Write-Host "Cleanup issue: $cleanupIssue"
}
Write-Host ""

[pscustomobject]@{
    VerificationStatus       = $verificationStatus
    TaskExitCode             = $ciExit
    SourceBranch             = $Branch
    SourceBuildHead          = $ExpectedHead
    VerificationCheckoutHead = $remoteHead
    EvidenceCommit           = $evidenceCommit
    Published                = $published
    ControlCheckoutPreserved    = $controlCheckoutPreserved
    PublicationIssue         = $pushError
    CleanupIssue             = $cleanupIssue
}
