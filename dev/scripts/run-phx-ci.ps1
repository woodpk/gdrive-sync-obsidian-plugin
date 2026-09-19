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

    [string]$ExpectedArtifact = "main.js",

    [switch]$NoPush
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string[]]$Args,
        [switch]$AllowFailure
    )

    $output = & git.exe -C $RepoRoot @Args 2>&1
    $code = $LASTEXITCODE
    $text = ($output | Out-String).Trim()

    if (-not $AllowFailure -and $code -ne 0) {
        throw "git $($Args -join ' ') failed (exit $code).`n$text"
    }

    [pscustomobject]@{
        ExitCode = $code
        Output   = $text
    }
}

function Assert-CleanWorkingTree {
    $status = (Invoke-Git -Args @("status", "--porcelain=v1", "--untracked-files=all")).Output
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw "Repository must be clean before verification.`n$status"
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

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd("\", "/")
$FrameworkRoot = [IO.Path]::GetFullPath($FrameworkRoot).TrimEnd("\", "/")

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

# Framework integrity gate.
$frameworkStatus = (& git.exe -C $FrameworkRoot status --porcelain=v1 --untracked-files=all | Out-String).Trim()
if (-not [string]::IsNullOrWhiteSpace($frameworkStatus)) {
    throw "phx-ci working tree is not clean.`n$frameworkStatus"
}

$actualFrameworkHead = (& git.exe -C $FrameworkRoot rev-parse HEAD | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $actualFrameworkHead -ne $FrameworkHead) {
    throw "phx-ci HEAD mismatch. Expected $FrameworkHead; actual $actualFrameworkHead"
}

$actualFrameworkVersion = (Get-Content -LiteralPath (Join-Path $FrameworkRoot "VERSION") -Raw).Trim()
if ($actualFrameworkVersion -ne $FrameworkVersion) {
    throw "phx-ci VERSION mismatch. Expected $FrameworkVersion; actual $actualFrameworkVersion"
}

# Never switch away from a dirty repository.
Assert-CleanWorkingTree

Invoke-Git -Args @("fetch", "origin", "--prune") | Out-Null

$remoteHead = (Invoke-Git -Args @("rev-parse", "origin/$Branch")).Output
if ($remoteHead -ne $ExpectedHead) {
    throw "Remote branch HEAD mismatch. Expected $ExpectedHead; origin/$Branch is $remoteHead"
}

$localBranch = Invoke-Git -Args @("show-ref", "--verify", "--quiet", "refs/heads/$Branch") -AllowFailure
if ($localBranch.ExitCode -eq 0) {
    Invoke-Git -Args @("switch", $Branch) | Out-Null
}
else {
    Invoke-Git -Args @("switch", "--track", "-c", $Branch, "origin/$Branch") | Out-Null
}

Invoke-Git -Args @("pull", "--ff-only", "origin", $Branch) | Out-Null

$actualHead = (Invoke-Git -Args @("rev-parse", "HEAD")).Output
if ($actualHead -ne $ExpectedHead) {
    throw "Local HEAD mismatch after pull. Expected $ExpectedHead; actual $actualHead"
}

$baseGate = Invoke-Git -Args @("merge-base", "--is-ancestor", $BaseSha, "HEAD") -AllowFailure
if ($baseGate.ExitCode -ne 0) {
    throw "Required base $BaseSha is not an ancestor of HEAD."
}

foreach ($sha in $RequiredAncestors) {
    if ([string]::IsNullOrWhiteSpace($sha)) { continue }
    $gate = Invoke-Git -Args @("merge-base", "--is-ancestor", $sha, "HEAD") -AllowFailure
    if ($gate.ExitCode -ne 0) {
        throw "Required ancestor $sha is not an ancestor of HEAD."
    }
}

Assert-CleanWorkingTree

$resultsDir = Join-Path $RepoRoot "dev\test-results"
New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null

$safeRunName = ($RunName -replace "[^A-Za-z0-9._-]", "-").Trim("-")
if ([string]::IsNullOrWhiteSpace($safeRunName)) {
    throw "RunName does not contain a usable filename component."
}

$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$shortHead = $ExpectedHead.Substring(0, [Math]::Min(12, $ExpectedHead.Length))
$resultStem = "$stamp-$safeRunName-$shortHead"

$tempRoot = Join-Path $env:TEMP "phx-ci-run-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

$tempTaskFile = Join-Path $tempRoot "Taskfile.yml"
$tempLog = Join-Path $tempRoot "$resultStem.log"
$runtimeDir = Join-Path $RepoRoot ".phx-ci"
$runtimeBackup = Join-Path $tempRoot "preexisting-phx-ci"

$evidenceMd = Join-Path $RepoRoot "dev\_ca-output.md"
$evidenceJson = Join-Path $RepoRoot "dev\_ca-output.json"

$resultMd = Join-Path $resultsDir "$resultStem.md"
$resultJson = Join-Path $resultsDir "$resultStem.json"
$resultLog = Join-Path $resultsDir "$resultStem.log"

# phx-ci writes dev/_ca-output.* during the run. These are expected verification outputs,
# not pre-run dirtiness. Historical results are also valid committed delta on later runs.
$effectiveAllowed = @(
    $AllowedChangedFiles
    "dev/_ca-output.md"
    "dev/_ca-output.json"
    "dev/test-results/**"
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Sort-Object -Unique

$repoYaml = Convert-ToYamlSingleQuoted (Convert-ToForwardSlash $RepoRoot)
$frameworkYaml = Convert-ToYamlSingleQuoted (Convert-ToForwardSlash $FrameworkRoot)
$nodeTaskfileYaml = Convert-ToYamlSingleQuoted ((Convert-ToForwardSlash $FrameworkRoot) + "/taskfiles/node.yml")
$focusedYaml = Convert-ToYamlSingleQuoted $FocusedTest
$allowedYaml = Convert-ToYamlSingleQuoted ($effectiveAllowed -join ";")
$forbiddenYaml = Convert-ToYamlSingleQuoted (($ForbiddenAncestors | Where-Object { $_ }) -join ";")
$requiredYaml = Convert-ToYamlSingleQuoted (($RequiredFiles | Where-Object { $_ }) -join ";")
$predecessorYaml = Convert-ToYamlSingleQuoted $PredecessorEvidenceMarker
$branchYaml = Convert-ToYamlSingleQuoted $Branch
$headYaml = Convert-ToYamlSingleQuoted $ExpectedHead
$baseYaml = Convert-ToYamlSingleQuoted $BaseSha
$artifactYaml = Convert-ToYamlSingleQuoted $ExpectedArtifact
$frameworkVersionYaml = Convert-ToYamlSingleQuoted $FrameworkVersion
$evidenceYaml = Convert-ToYamlSingleQuoted (Convert-ToForwardSlash $evidenceMd)

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
      PHX_EXPECTED_BRANCH: $branchYaml
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

# Preserve any pre-existing phx-ci runtime directory, while guaranteeing a fresh run.
$runtimeWasPresent = Test-Path -LiteralPath $runtimeDir
if ($runtimeWasPresent) {
    $trackedRuntime = (Invoke-Git -Args @("ls-files", "--", ".phx-ci")).Output
    if (-not [string]::IsNullOrWhiteSpace($trackedRuntime)) {
        throw ".phx-ci contains tracked files; refusing to move it."
    }
    Move-Item -LiteralPath $runtimeDir -Destination $runtimeBackup
}

# Keep the framework's generated .phx-ci directory out of Git status even on old branches
# that predate the repository .gitignore rule.
$gitExcludeRaw = (Invoke-Git -Args @("rev-parse", "--git-path", "info/exclude")).Output
$gitExcludePath = if ([IO.Path]::IsPathRooted($gitExcludeRaw)) {
    $gitExcludeRaw
}
else {
    Join-Path $RepoRoot $gitExcludeRaw
}

$excludeExisted = Test-Path -LiteralPath $gitExcludePath
$excludeOriginal = if ($excludeExisted) {
    [IO.File]::ReadAllText($gitExcludePath)
}
else {
    ""
}

New-Item -ItemType Directory -Path (Split-Path -Parent $gitExcludePath) -Force | Out-Null
$separator = if ($excludeOriginal.Length -gt 0 -and -not $excludeOriginal.EndsWith("`n")) { "`r`n" } else { "" }
[IO.File]::WriteAllText(
    $gitExcludePath,
    $excludeOriginal + $separator + "# temporary phx-ci runner exclusion`r`n.phx-ci/`r`n"
)

$oldEvidenceRunId = ""
if (Test-Path -LiteralPath $evidenceMd -PathType Leaf) {
    $oldRunLine = Get-Content -LiteralPath $evidenceMd | Where-Object { $_ -like "- Run ID:*" } | Select-Object -First 1
    if ($oldRunLine) {
        $oldEvidenceRunId = ($oldRunLine -replace "^- Run ID:\s*", "").Trim()
    }
}

$ciExit = 999
$taskInvocationFailed = $false

try {
    Set-Content -LiteralPath $tempLog -Value @(
        "phx-ci standardized local verification"
        "Run name: $RunName"
        "Repository: $RepoRoot"
        "Branch: $Branch"
        "Expected/tested HEAD: $ExpectedHead"
        "Base SHA: $BaseSha"
        "Framework HEAD: $FrameworkHead"
        "Framework version: $FrameworkVersion"
        "Task executable: $($taskCommand.Source)"
        "Started UTC: $((Get-Date).ToUniversalTime().ToString('o'))"
        ""
        "===== task ci output ====="
        ""
    ) -Encoding utf8

    Push-Location $RepoRoot
    try {
        & $taskCommand.Source -t $tempTaskFile ci *>> $tempLog
        $ciExit = $LASTEXITCODE
    }
    catch {
        $taskInvocationFailed = $true
        Add-LogLine -Path $tempLog -Text ""
        Add-LogLine -Path $tempLog -Text "Runner caught task invocation exception:"
        Add-LogLine -Path $tempLog -Text $_.Exception.ToString()
    }
    finally {
        Pop-Location
    }

    Add-LogLine -Path $tempLog -Text ""
    Add-LogLine -Path $tempLog -Text "===== task ci finished ====="
    Add-LogLine -Path $tempLog -Text "Task exit code: $ciExit"
    Add-LogLine -Path $tempLog -Text "Ended UTC: $((Get-Date).ToUniversalTime().ToString('o'))"

    # Remove only the framework-owned runtime directory created by this run.
    if (Test-Path -LiteralPath $runtimeDir) {
        Remove-Item -LiteralPath $runtimeDir -Recurse -Force
    }

    # Record and restore any unexpected verification-created working-tree changes.
    $expectedWorktreePaths = @(
        "dev/_ca-output.md"
        "dev/_ca-output.json"
    )

    $modifiedTracked = @(
        (Invoke-Git -Args @("diff", "--name-only")).Output -split "`n" |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )
    $untracked = @(
        (Invoke-Git -Args @("ls-files", "--others", "--exclude-standard")).Output -split "`n" |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    )

    $unexpectedTracked = @($modifiedTracked | Where-Object { $_ -notin $expectedWorktreePaths })
    $unexpectedUntracked = @($untracked | Where-Object { $_ -notin $expectedWorktreePaths })

    if ($unexpectedTracked.Count -or $unexpectedUntracked.Count) {
        Add-LogLine -Path $tempLog -Text ""
        Add-LogLine -Path $tempLog -Text "===== verification-created unexpected Git changes ====="
        foreach ($path in $unexpectedTracked) {
            Add-LogLine -Path $tempLog -Text "TRACKED: $path"
            Invoke-Git -Args @("restore", "--worktree", "--", $path) | Out-Null
        }
        foreach ($path in $unexpectedUntracked) {
            Add-LogLine -Path $tempLog -Text "UNTRACKED: $path"
            $full = [IO.Path]::GetFullPath((Join-Path $RepoRoot $path))
            if (-not $full.StartsWith($RepoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Refusing to remove unexpected path outside repository: $full"
            }
            if (Test-Path -LiteralPath $full) {
                Remove-Item -LiteralPath $full -Recurse -Force
            }
        }
    }

    $postTaskBranch = (Invoke-Git -Args @("branch", "--show-current")).Output
    $postTaskHead = (Invoke-Git -Args @("rev-parse", "HEAD")).Output
    if ($postTaskBranch -ne $Branch -or $postTaskHead -ne $ExpectedHead) {
        throw "Verification changed repository identity unexpectedly. Branch=$postTaskBranch HEAD=$postTaskHead"
    }

    if (-not (Test-Path -LiteralPath $evidenceMd -PathType Leaf)) {
        throw "phx-ci did not produce $evidenceMd"
    }

    $newRunLine = Get-Content -LiteralPath $evidenceMd | Where-Object { $_ -like "- Run ID:*" -or $_ -like "Run ID:*" } | Select-Object -First 1
    $newEvidenceRunId = if ($newRunLine) {
        ($newRunLine -replace "^-?\s*Run ID:\s*", "").Trim()
    }
    else {
        ""
    }

    if ([string]::IsNullOrWhiteSpace($newEvidenceRunId)) {
        throw "Verification evidence does not contain a current phx-ci Run ID; refusing to publish possibly stale evidence."
    }
    if ($oldEvidenceRunId -and $newEvidenceRunId -eq $oldEvidenceRunId) {
        throw "Verification evidence Run ID did not change; refusing to publish stale evidence."
    }

    Copy-Item -LiteralPath $evidenceMd -Destination $resultMd -Force
    if (Test-Path -LiteralPath $evidenceJson -PathType Leaf) {
        Copy-Item -LiteralPath $evidenceJson -Destination $resultJson -Force
    }

    Copy-Item -LiteralPath $tempLog -Destination $resultLog -Force
}
finally {
    # Restore exact pre-run Git exclude contents.
    if ($excludeExisted) {
        [IO.File]::WriteAllText($gitExcludePath, $excludeOriginal)
    }
    elseif (Test-Path -LiteralPath $gitExcludePath) {
        Remove-Item -LiteralPath $gitExcludePath -Force
    }

    # Restore any pre-existing phx-ci runtime directory exactly where it was.
    if ($runtimeWasPresent -and (Test-Path -LiteralPath $runtimeBackup)) {
        if (Test-Path -LiteralPath $runtimeDir) {
            Remove-Item -LiteralPath $runtimeDir -Recurse -Force
        }
        Move-Item -LiteralPath $runtimeBackup -Destination $runtimeDir
    }
}

$statusLine = (Get-Content -LiteralPath $evidenceMd -First 1).Trim()
$verificationStatus = if ($statusLine -eq "STATUS: COMPLETE" -and $ciExit -eq 0 -and -not $taskInvocationFailed) {
    "COMPLETE"
}
else {
    "BLOCKED"
}

# Publication is intentionally independent from verification success.
# A BLOCKED run is still useful evidence and is published.
$publishPaths = @(
    "dev/_ca-output.md"
    "dev/_ca-output.json"
    "dev/test-results/$([IO.Path]::GetFileName($resultMd))"
    "dev/test-results/$([IO.Path]::GetFileName($resultJson))"
    "dev/test-results/$([IO.Path]::GetFileName($resultLog))"
) | Where-Object {
    Test-Path -LiteralPath (Join-Path $RepoRoot $_)
}

foreach ($path in $publishPaths) {
    Invoke-Git -Args @("add", "--", $path) | Out-Null
}

# Refuse to publish anything outside the evidence/result allowlist.
$staged = @(
    (Invoke-Git -Args @("diff", "--cached", "--name-only")).Output -split "`n" |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)
$unexpectedStaged = @($staged | Where-Object { $_ -notin $publishPaths })
if ($unexpectedStaged.Count) {
    Invoke-Git -Args @("restore", "--staged", "--", ".") | Out-Null
    throw "Refusing to commit unexpected staged paths: $($unexpectedStaged -join ', ')"
}

if ($staged.Count -eq 0) {
    throw "No verification evidence was staged for publication."
}

$commitMessage = "test(ci): publish $RunName verification for $shortHead"
Invoke-Git -Args @("commit", "-m", $commitMessage) | Out-Null
$evidenceCommit = (Invoke-Git -Args @("rev-parse", "HEAD")).Output

$published = $false
$pushError = ""

if (-not $NoPush) {
    Invoke-Git -Args @("fetch", "origin", "--prune") | Out-Null
    $remoteBeforePush = (Invoke-Git -Args @("rev-parse", "origin/$Branch")).Output
    if ($remoteBeforePush -ne $ExpectedHead) {
        $pushError = "Remote branch advanced during verification. Expected pre-publication remote HEAD $ExpectedHead; found $remoteBeforePush. Evidence commit remains local."
    }
    else {
        $push = Invoke-Git -Args @("push", "origin", "HEAD:$Branch") -AllowFailure
        if ($push.ExitCode -eq 0) {
            $published = $true
        }
        else {
            $pushError = "git push failed. Evidence commit remains local. $($push.Output)"
        }
    }
}

$finalStatus = (Invoke-Git -Args @("status", "--porcelain=v1", "--untracked-files=all")).Output
$workingTreeClean = [string]::IsNullOrWhiteSpace($finalStatus)

Write-Host ""
Write-Host "PHX-CI RUN RESULT"
Write-Host "Verification: $verificationStatus"
Write-Host "Task exit code: $ciExit"
Write-Host "Tested HEAD: $ExpectedHead"
Write-Host "Evidence commit: $evidenceCommit"
Write-Host "Evidence published: $(if ($NoPush) { 'NO (-NoPush)' } elseif ($published) { 'YES' } else { 'NO' })"
Write-Host "Working tree clean: $(if ($workingTreeClean) { 'YES' } else { 'NO' })"
Write-Host "Evidence: $resultMd"
Write-Host "Transcript: $resultLog"
if ($pushError) {
    Write-Host "Publication issue: $pushError"
}
Write-Host ""

[pscustomobject]@{
    VerificationStatus = $verificationStatus
    TaskExitCode       = $ciExit
    TestedHead         = $ExpectedHead
    EvidenceCommit     = $evidenceCommit
    Published          = $published
    WorkingTreeClean   = $workingTreeClean
    EvidencePath       = $resultMd
    TranscriptPath     = $resultLog
    PublicationIssue   = $pushError
}
