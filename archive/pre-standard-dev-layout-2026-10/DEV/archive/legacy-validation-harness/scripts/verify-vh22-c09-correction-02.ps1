# VH22 C09 Correction 02 local verification
# GitHub Actions are intentionally not used.
# This script performs local build/test/verification and writes complete evidence
# to dev/_ca-output.md plus the task-specific evidence mirror.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "phase6-vh22-c09-scenario-correction-02"
$BaseSha = "fbe9dfca58840e49ebcb3a14b97d4c569770cf6e"
$RejectedOriginalHead = "49f31d6e3c6661b8a1a05922ed5f8b4514b835fc"
$RejectedCorrection01Head = "cbd8946ef6defc20ab3286e4f540877c16c606fc"
$FocusedCompiledTest = ".test-build/test/validation-c09-windows-delete-ios-trash.test.js"
$EvidenceRepoPath = "dev/_ca-output.md"
$TaskEvidenceRepoPath = "dev/evidence/_ca-output-agt-ca-p6-vh22-c09-scenario-01-correction-02.md"

$script:StartTime = Get-Date
$script:StepResults = New-Object System.Collections.Generic.List[object]
$script:RepoRoot = $null
$script:TranscriptPath = $null
$script:TranscriptStarted = $false
$script:VerifiedHead = ""
$script:VerifiedTree = ""
$script:MainHash = ""
$script:MainLength = 0

function Get-NativeOutput {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    $output = & $Command @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $rendered = ($output | Out-String).Trim()
        throw ("Command failed ({0}): {1} {2}{3}{4}" -f $exitCode, $Command, ($Arguments -join " "), [Environment]::NewLine, $rendered)
    }

    return ($output | Out-String).Trim()
}

function Add-StepResult {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Status,
        [Parameter(Mandatory = $true)][double]$Seconds
    )

    $script:StepResults.Add([pscustomobject]@{
        Name = $Name
        Status = $Status
        Seconds = [Math]::Round($Seconds, 2)
    }) | Out-Null
}

function Invoke-VerificationStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    $timer = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        & $Action
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "$Name failed with exit code $exitCode."
        }

        $timer.Stop()
        Add-StepResult -Name $Name -Status "PASS" -Seconds $timer.Elapsed.TotalSeconds
        Write-Host "PASS: $Name" -ForegroundColor Green
    }
    catch {
        $timer.Stop()
        Add-StepResult -Name $Name -Status "FAIL" -Seconds $timer.Elapsed.TotalSeconds
        Write-Host "FAIL: $Name" -ForegroundColor Red
        throw
    }
}

function Invoke-WindowsAwareNpmTestStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string[]]$NpmArguments
    )

    Write-Host ""
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $captured = @()

    try {
        & npm.cmd @NpmArguments 2>&1 |
            Tee-Object -Variable captured |
            ForEach-Object { Write-Host $_ }

        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) {
            $timer.Stop()
            Add-StepResult -Name $Name -Status "PASS" -Seconds $timer.Elapsed.TotalSeconds
            Write-Host "PASS: $Name" -ForegroundColor Green
            return
        }

        if ($env:OS -ne "Windows_NT") {
            throw "$Name failed with exit code $exitCode on a non-Windows platform."
        }

        $text = ($captured | Out-String)
        $expectedFailures = @(
            "Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure",
            "Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates",
            "foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes",
            "LOG-06 operator wiring is one local clipboard command and runtime bundle collection does not invoke Drive or synchronization"
        )

        foreach ($expectedFailure in $expectedFailures) {
            if (-not $text.Contains($expectedFailure)) {
                throw "$Name failed, but the failure set did not match the four approved Windows-specific exceptions. Missing expected failure: $expectedFailure"
            }
        }

        if ($text -notmatch "(?m)^\s*.*fail 4\s*$") {
            throw "$Name failed, but the test summary did not report exactly four failures."
        }

        $timer.Stop()
        Add-StepResult -Name $Name -Status "PASS-WINDOWS-EXCEPTIONS" -Seconds $timer.Elapsed.TotalSeconds
        Write-Host "PASS-WINDOWS-EXCEPTIONS: $Name" -ForegroundColor Yellow
        Write-Host "Accepted only the four known Windows-specific repository-test failures." -ForegroundColor Yellow
    }
    catch {
        $timer.Stop()
        Add-StepResult -Name $Name -Status "FAIL" -Seconds $timer.Elapsed.TotalSeconds
        Write-Host "FAIL: $Name" -ForegroundColor Red
        throw
    }
}

function Stop-LocalTranscript {
    if ($script:TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch {}
        $script:TranscriptStarted = $false
    }
}

function Write-Evidence {
    param(
        [Parameter(Mandatory = $true)][string]$Status,
        [Parameter(Mandatory = $false)][string]$Failure = ""
    )

    Stop-LocalTranscript

    $finish = Get-Date
    $duration = [Math]::Round(($finish - $script:StartTime).TotalSeconds, 2)
    $transcript = ""
    if ($script:TranscriptPath -and (Test-Path -LiteralPath $script:TranscriptPath)) {
        $transcript = Get-Content -LiteralPath $script:TranscriptPath -Raw
    }

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("STATUS: $Status")
    $lines.Add("TASK: VH22 C09 Correction 02 - reconstruct C08-equivalent trusted lineage before deletion")
    $lines.Add("EXPECTED_BRANCH: $ExpectedBranch")
    $lines.Add("BASE_SHA: $BaseSha")
    $lines.Add("VERIFIED_HEAD_SHA: $script:VerifiedHead")
    $lines.Add("VERIFIED_TREE_SHA: $script:VerifiedTree")
    $lines.Add("REJECTED_ORIGINAL_HEAD_FORBIDDEN_ANCESTOR: $RejectedOriginalHead")
    $lines.Add("REJECTED_CORRECTION01_HEAD_FORBIDDEN_ANCESTOR: $RejectedCorrection01Head")
    $lines.Add("MAIN_JS_BYTES: $script:MainLength")
    $lines.Add("MAIN_JS_SHA256: $script:MainHash")
    $lines.Add("STARTED_LOCAL: $($script:StartTime.ToString('o'))")
    $lines.Add("FINISHED_LOCAL: $($finish.ToString('o'))")
    $lines.Add("DURATION_SECONDS: $duration")
    $hasWindowsExceptions = @($script:StepResults | Where-Object { $_.Status -eq "PASS-WINDOWS-EXCEPTIONS" }).Count -gt 0
    $lines.Add("GITHUB_ACTIONS_USED: NO")
    $lines.Add("WINDOWS_PLATFORM_EXCEPTIONS: $(if ($hasWindowsExceptions) { 'YES' } else { 'NO' })")
    $lines.Add("")
    $lines.Add("STEPS:")
    foreach ($step in $script:StepResults) {
        $lines.Add("  $($step.Status) | $($step.Name) | $($step.Seconds)s")
    }

    if (-not [string]::IsNullOrWhiteSpace($Failure)) {
        $lines.Add("")
        $lines.Add("FAILURE:")
        $lines.Add($Failure)
    }

    $lines.Add("")
    $lines.Add("COMPLETE_TERMINAL_TRANSCRIPT:")
    $lines.Add("----- BEGIN TRANSCRIPT -----")
    $lines.Add($transcript)
    $lines.Add("----- END TRANSCRIPT -----")

    $evidencePath = Join-Path $script:RepoRoot $EvidenceRepoPath
    $taskEvidencePath = Join-Path $script:RepoRoot $TaskEvidenceRepoPath
    $taskEvidenceDirectory = Split-Path -Parent $taskEvidencePath
    if (-not (Test-Path -LiteralPath $taskEvidenceDirectory)) {
        New-Item -ItemType Directory -Path $taskEvidenceDirectory -Force | Out-Null
    }

    [System.IO.File]::WriteAllLines(
        $evidencePath,
        $lines,
        (New-Object System.Text.UTF8Encoding($false))
    )
    [System.IO.File]::WriteAllLines(
        $taskEvidencePath,
        $lines,
        (New-Object System.Text.UTF8Encoding($false))
    )

    Write-Host ""
    Write-Host "Evidence written:" -ForegroundColor Yellow
    Write-Host "  $evidencePath"
    Write-Host "  $taskEvidencePath"
}

try {
    $repoRoot = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "--show-toplevel")
    $script:RepoRoot = $repoRoot
    Set-Location -LiteralPath $repoRoot

    $gitDir = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "--git-dir")
    if (-not [System.IO.Path]::IsPathRooted($gitDir)) {
        $gitDir = Join-Path $repoRoot $gitDir
    }

    $script:TranscriptPath = Join-Path $gitDir "vh22-c09-correction-02-local-verification-transcript.txt"
    Start-Transcript -Path $script:TranscriptPath -Force | Out-Null
    $script:TranscriptStarted = $true

    Write-Host "VH22 C09 CORRECTION 02 LOCAL VERIFICATION" -ForegroundColor Yellow
    Write-Host "Repository: $repoRoot"
    Write-Host "Expected branch: $ExpectedBranch"
    Write-Host "GitHub Actions are prohibited and are not used."

    $actualBranch = Get-NativeOutput -Command "git" -Arguments @("branch", "--show-current")
    if ($actualBranch -ne $ExpectedBranch) {
        throw "Wrong branch. Expected '$ExpectedBranch' but found '$actualBranch'."
    }

    $initialStatus = Get-NativeOutput -Command "git" -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($initialStatus)) {
        throw ("Working tree is not clean before verification." + [Environment]::NewLine + $initialStatus)
    }

    Invoke-VerificationStep -Name "Fetch origin metadata" -Action {
        & git fetch origin --prune
    }

    $remoteHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "origin/$ExpectedBranch")
    $localHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD")
    if ($remoteHead -ne $localHead) {
        throw "Local HEAD ($localHead) does not equal origin/$ExpectedBranch ($remoteHead)."
    }
    $script:VerifiedHead = $localHead
    $script:VerifiedTree = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD^{tree}")

    & git cat-file -e ($BaseSha + "^{commit}")
    if ($LASTEXITCODE -ne 0) {
        throw "Required VH15-R2 base commit is unavailable locally: $BaseSha"
    }

    & git merge-base --is-ancestor $BaseSha HEAD
    if ($LASTEXITCODE -ne 0) {
        throw "Required VH15-R2 base SHA is not an ancestor of HEAD."
    }

    $mergeBase = Get-NativeOutput -Command "git" -Arguments @("merge-base", $BaseSha, "HEAD")
    if ($mergeBase -ne $BaseSha) {
        throw "Implementation is not rooted at the exact approved VH15-R2 base."
    }

    & git merge-base --is-ancestor $RejectedOriginalHead HEAD
    if ($LASTEXITCODE -eq 0) {
        throw "Rejected original C09 implementation is an ancestor of HEAD."
    }

    & git merge-base --is-ancestor $RejectedCorrection01Head HEAD
    if ($LASTEXITCODE -eq 0) {
        throw "Rejected C09 correction-01 implementation is an ancestor of HEAD."
    }

    $changedFilesText = Get-NativeOutput -Command "git" -Arguments @("diff", "--name-only", "$BaseSha..HEAD")
    $changedFiles = @()
    if (-not [string]::IsNullOrWhiteSpace($changedFilesText)) {
        $changedFiles = $changedFilesText -split "\r?\n"
    }

    $allowedFiles = @(
        "src/validation/scenarios/c09-windows-delete-ios-trash.ts",
        "test/validation-c09-windows-delete-ios-trash.test.ts",
        "dev/scripts/verify-vh22-c09-correction-02.ps1",
        "dev/scripts/bootstrap-vh22-c09-correction-02.ps1",
        "dev/_ca-output.md",
        "dev/evidence/_ca-output-agt-ca-p6-vh22-c09-scenario-01-correction-02.md"
    )

    $unexpectedFiles = @($changedFiles | Where-Object { $_ -notin $allowedFiles })
    if ($unexpectedFiles.Count -gt 0) {
        throw ("Unexpected implementation files exist in the correction delta:" + [Environment]::NewLine + ($unexpectedFiles -join [Environment]::NewLine))
    }

    $frozenChanges = @($changedFiles | Where-Object {
        $_ -like "src/contracts/*" -or
        $_ -eq "src/validation/validation-mode-runtime.ts" -or
        $_ -eq "src/validation/production-path-driver.ts" -or
        $_ -eq "src/validation/plan-assertion-engine.ts" -or
        $_ -like "src/validation/*contracts.ts"
    })
    if ($frozenChanges.Count -gt 0) {
        throw ("Frozen runtime/contract files changed unexpectedly:" + [Environment]::NewLine + ($frozenChanges -join [Environment]::NewLine))
    }

    Write-Host ""
    Write-Host "Toolchain:" -ForegroundColor Cyan
    Write-Host "  $(Get-NativeOutput -Command 'git' -Arguments @('--version'))"
    Write-Host "  node $(Get-NativeOutput -Command 'node' -Arguments @('--version'))"
    Write-Host "  npm $(Get-NativeOutput -Command 'npm.cmd' -Arguments @('--version'))"

    Invoke-VerificationStep -Name "npm ci" -Action {
        & npm.cmd ci
    }

    Invoke-VerificationStep -Name "Typecheck" -Action {
        & npm.cmd run typecheck
    }

    Invoke-VerificationStep -Name "Test TypeScript compile" -Action {
        & npx.cmd tsc -p tsconfig.test.json
    }

    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $FocusedCompiledTest))) {
        throw "Focused compiled test was not produced: $FocusedCompiledTest"
    }

    Invoke-VerificationStep -Name "Focused VH22 C09 Correction 02 tests" -Action {
        & node $FocusedCompiledTest
    }

    Invoke-WindowsAwareNpmTestStep -Name "Complete automated test suite" -NpmArguments @("test")

    Invoke-VerificationStep -Name "Production build" -Action {
        & npm.cmd run build
    }

    Invoke-WindowsAwareNpmTestStep -Name "Full repository check" -NpmArguments @("run", "check")

    Invoke-VerificationStep -Name "Correction delta whitespace check" -Action {
        & git diff --check "$BaseSha..HEAD"
    }

    Invoke-VerificationStep -Name "Working-tree whitespace check" -Action {
        & git diff --check
    }

    $finalStatus = Get-NativeOutput -Command "git" -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($finalStatus)) {
        throw ("Verification changed tracked repository files unexpectedly before evidence write." + [Environment]::NewLine + $finalStatus)
    }

    $mainPath = Join-Path $repoRoot "main.js"
    if (-not (Test-Path -LiteralPath $mainPath)) {
        throw "Expected production artifact does not exist after build: main.js"
    }

    $script:MainHash = (Get-FileHash -LiteralPath $mainPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $script:MainLength = (Get-Item -LiteralPath $mainPath).Length

    Write-Host ""
    Write-Host "Artifact identity:" -ForegroundColor Cyan
    Write-Host "  HEAD:           $script:VerifiedHead"
    Write-Host "  TREE:           $script:VerifiedTree"
    Write-Host "  main.js bytes:  $script:MainLength"
    Write-Host "  main.js SHA256: $script:MainHash"

    $hasWindowsExceptions = @($script:StepResults | Where-Object { $_.Status -eq "PASS-WINDOWS-EXCEPTIONS" }).Count -gt 0

    Write-Host ""
    Write-Host "STATUS: COMPLETE" -ForegroundColor Green
    if ($hasWindowsExceptions) {
        Write-Host "Windows platform exceptions: YES (only the four previously approved repository-test exceptions)." -ForegroundColor Yellow
    }
    Write-Evidence -Status "COMPLETE"
    exit 0
}
catch {
    $message = $_.Exception.Message
    Write-Host ""
    Write-Host "STATUS: BLOCKED" -ForegroundColor Red
    Write-Host $message -ForegroundColor Red

    try {
        Write-Evidence -Status "BLOCKED" -Failure $message
    }
    catch {
        Stop-LocalTranscript
        Write-Host "Unable to write evidence: $($_.Exception.Message)" -ForegroundColor Red
    }

    exit 1
}
finally {
    Stop-LocalTranscript
}
