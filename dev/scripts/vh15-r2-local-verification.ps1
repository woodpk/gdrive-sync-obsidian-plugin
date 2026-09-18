# VH15-R2 local verification
# Replaces GitHub Actions verification for this repair.
# This script performs no branch creation, merge, promotion, release,
# or live Google Drive validation.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "phase6-vh15-r2-run-scoped-plan-handoff"
$R2InputSha = "6372184d2649e21369001ea28cc583e6636781c5"
$ImplementationSha = "4f2d202b2dfb7bd3c5bd25566dccafdc507703d5"
$FocusedCompiledTest = ".test-build/test/validation-mode-runtime-plan-handoff.test.js"
$ScriptRepoPath = "dev/scripts/vh15-r2-local-verification.ps1"
$ExpectedEvidencePath = "dev/evidence/_ca-output-agt-ca-p6-vh15-r2-run-scoped-plan-handoff-01.md"

$script:StepResults = New-Object System.Collections.Generic.List[object]
$script:TranscriptStarted = $false
$script:StartTime = Get-Date
$script:RepoRoot = $null
$script:ReportPath = $null
$script:TranscriptPath = $null
$script:ExitCode = 1

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

function Write-LocalReport {
    param(
        [Parameter(Mandatory = $true)][string]$Status,
        [Parameter(Mandatory = $false)][string]$Failure = ""
    )

    if ([string]::IsNullOrWhiteSpace($script:ReportPath)) {
        return
    }

    $headSha = ""
    $treeSha = ""
    $branch = ""
    $mainHash = ""
    $gitStatus = ""

    try { $headSha = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD") } catch {}
    try { $treeSha = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD^{tree}") } catch {}
    try { $branch = Get-NativeOutput -Command "git" -Arguments @("branch", "--show-current") } catch {}
    try { $gitStatus = Get-NativeOutput -Command "git" -Arguments @("status", "--porcelain") } catch {}

    $mainPath = Join-Path $script:RepoRoot "main.js"
    if (Test-Path -LiteralPath $mainPath) {
        try { $mainHash = (Get-FileHash -LiteralPath $mainPath -Algorithm SHA256).Hash.ToLowerInvariant() } catch {}
    }

    $finish = Get-Date
    $duration = [Math]::Round(($finish - $script:StartTime).TotalSeconds, 2)

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add("STATUS: $Status")
    $lines.Add("TASK: VH15-R2 run-scoped plan/assertion/authorization handoff repair")
    $lines.Add("EXPECTED_BRANCH: $ExpectedBranch")
    $lines.Add("ACTUAL_BRANCH: $branch")
    $lines.Add("R2_INPUT_SHA: $R2InputSha")
    $lines.Add("IMPLEMENTATION_SHA: $ImplementationSha")
    $lines.Add("VERIFIED_HEAD_SHA: $headSha")
    $lines.Add("VERIFIED_TREE_SHA: $treeSha")
    $lines.Add("MAIN_JS_SHA256: $mainHash")
    $lines.Add("STARTED_LOCAL: $($script:StartTime.ToString('o'))")
    $lines.Add("FINISHED_LOCAL: $($finish.ToString('o'))")
    $lines.Add("DURATION_SECONDS: $duration")
    $lines.Add("TRANSCRIPT: $script:TranscriptPath")
    $lines.Add("TEMP_BRANCH_CREATED: NO")
    $lines.Add("")
    $lines.Add("STEPS:")

    foreach ($step in $script:StepResults) {
        $lines.Add("  $($step.Status) | $($step.Name) | $($step.Seconds)s")
    }

    $lines.Add("")
    if ([string]::IsNullOrWhiteSpace($gitStatus)) {
        $lines.Add("FINAL_GIT_STATUS: CLEAN")
    }
    else {
        $lines.Add("FINAL_GIT_STATUS: DIRTY")
        $lines.Add($gitStatus)
    }

    if (-not [string]::IsNullOrWhiteSpace($Failure)) {
        $lines.Add("")
        $lines.Add("FAILURE:")
        $lines.Add($Failure)
    }

    [System.IO.File]::WriteAllLines(
        $script:ReportPath,
        $lines,
        (New-Object System.Text.UTF8Encoding($false))
    )

    Write-Host ""
    Write-Host "Local verification report:" -ForegroundColor Yellow
    Write-Host "  $script:ReportPath"
    Write-Host "Transcript:"
    Write-Host "  $script:TranscriptPath"
}

try {
    $repoRoot = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "--show-toplevel")
    $script:RepoRoot = $repoRoot
    Set-Location -LiteralPath $repoRoot

    $gitDir = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "--git-dir")
    if (-not [System.IO.Path]::IsPathRooted($gitDir)) {
        $gitDir = Join-Path $repoRoot $gitDir
    }

    $script:ReportPath = Join-Path $gitDir "vh15-r2-local-verification-results.txt"
    $script:TranscriptPath = Join-Path $gitDir "vh15-r2-local-verification-transcript.txt"

    Start-Transcript -Path $script:TranscriptPath -Force | Out-Null
    $script:TranscriptStarted = $true

    Write-Host "VH15-R2 LOCAL VERIFICATION" -ForegroundColor Yellow
    Write-Host "Repository: $repoRoot"
    Write-Host "Expected branch: $ExpectedBranch"
    Write-Host "No temporary branch will be created."

    $actualBranch = Get-NativeOutput -Command "git" -Arguments @("branch", "--show-current")
    if ($actualBranch -ne $ExpectedBranch) {
        throw "Wrong branch. Expected '$ExpectedBranch' but found '$actualBranch'."
    }

    $initialStatus = Get-NativeOutput -Command "git" -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($initialStatus)) {
        throw ("Working tree is not clean. Commit, stash, or discard local changes before verification.{0}{1}" -f [Environment]::NewLine, $initialStatus)
    }

    Invoke-VerificationStep -Name "Fetch origin metadata" -Action {
        & git fetch origin --prune
    }

    $remoteRef = "origin/$ExpectedBranch"
    $remoteHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", $remoteRef)
    $localHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD")
    if ($remoteHead -ne $localHead) {
        throw "Local HEAD ($localHead) does not equal $remoteRef ($remoteHead). Run 'git pull --ff-only origin $ExpectedBranch' and rerun."
    }

    & git cat-file -e ($R2InputSha + "^{commit}")
    if ($LASTEXITCODE -ne 0) {
        throw "Required R2 input commit is unavailable locally: $R2InputSha"
    }

    & git merge-base --is-ancestor $R2InputSha HEAD
    if ($LASTEXITCODE -ne 0) {
        throw "R2 input SHA is not an ancestor of HEAD."
    }

    & git cat-file -e ($ImplementationSha + "^{commit}")
    if ($LASTEXITCODE -ne 0) {
        throw "Expected implementation commit is unavailable locally: $ImplementationSha"
    }

    & git merge-base --is-ancestor $ImplementationSha HEAD
    if ($LASTEXITCODE -ne 0) {
        throw "Expected implementation SHA is not an ancestor of HEAD."
    }

    $changedFilesText = Get-NativeOutput -Command "git" -Arguments @("diff", "--name-only", "$R2InputSha..HEAD")
    $changedFiles = @()
    if (-not [string]::IsNullOrWhiteSpace($changedFilesText)) {
        $changedFiles = $changedFilesText -split "\r?\n"
    }

    $allowedFiles = @(
        "src/validation/validation-mode-runtime.ts",
        "test/validation-mode-runtime-plan-handoff.test.ts",
        $ScriptRepoPath,
        $ExpectedEvidencePath
    )

    $unexpectedFiles = @($changedFiles | Where-Object { $_ -notin $allowedFiles })
    if ($unexpectedFiles.Count -gt 0) {
        throw ("Unexpected files exist in the R2 delta:{0}{1}" -f [Environment]::NewLine, ($unexpectedFiles -join [Environment]::NewLine))
    }

    $frozenContractChanges = @($changedFiles | Where-Object {
        $_ -like "src/contracts/*" -or
        $_ -like "src/validation/*contracts.ts"
    })
    if ($frozenContractChanges.Count -gt 0) {
        throw ("Frozen contract files changed unexpectedly:{0}{1}" -f [Environment]::NewLine, ($frozenContractChanges -join [Environment]::NewLine))
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

    Invoke-VerificationStep -Name "Focused VH15-R2 authority-handoff regression tests" -Action {
        & node $FocusedCompiledTest
    }

    Invoke-VerificationStep -Name "Complete automated test suite" -Action {
        & npm.cmd test
    }

    Invoke-VerificationStep -Name "Production build" -Action {
        & npm.cmd run build
    }

    Invoke-VerificationStep -Name "Full repository check" -Action {
        & npm.cmd run check
    }

    Invoke-VerificationStep -Name "R2 delta whitespace check" -Action {
        & git diff --check "$R2InputSha..HEAD"
    }

    Invoke-VerificationStep -Name "Working-tree whitespace check" -Action {
        & git diff --check
    }

    $finalStatus = Get-NativeOutput -Command "git" -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($finalStatus)) {
        throw ("Verification changed tracked repository files unexpectedly.{0}{1}" -f [Environment]::NewLine, $finalStatus)
    }

    $mainPath = Join-Path $repoRoot "main.js"
    if (-not (Test-Path -LiteralPath $mainPath)) {
        throw "Expected production artifact does not exist after build: main.js"
    }

    $headSha = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD")
    $treeSha = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD^{tree}")
    $mainHash = (Get-FileHash -LiteralPath $mainPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $mainLength = (Get-Item -LiteralPath $mainPath).Length

    Write-Host ""
    Write-Host "Artifact identity:" -ForegroundColor Cyan
    Write-Host "  HEAD:           $headSha"
    Write-Host "  TREE:           $treeSha"
    Write-Host "  main.js bytes:  $mainLength"
    Write-Host "  main.js SHA256: $mainHash"

    Write-LocalReport -Status "PASS"

    Write-Host ""
    Write-Host "STATUS: PASS" -ForegroundColor Green
    Write-Host "All required VH15-R2 local verification checks passed."
    Write-Host "No temporary branch was created, so no branch cleanup is required."
    $script:ExitCode = 0
}
catch {
    $message = $_.Exception.Message
    Write-Host ""
    Write-Host "STATUS: FAIL" -ForegroundColor Red
    Write-Host $message -ForegroundColor Red

    try {
        Write-LocalReport -Status "FAIL" -Failure $message
    }
    catch {
        Write-Host "Unable to write local verification report: $($_.Exception.Message)" -ForegroundColor Red
    }

    $script:ExitCode = 1
}
finally {
    if ($script:TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch {}
    }
}

exit $script:ExitCode
