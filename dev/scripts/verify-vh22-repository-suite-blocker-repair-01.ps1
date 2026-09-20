# VH22/C09 Repository-Suite Blocker Repair 01 - internal local verifier
# This is a task-local verification helper, not a current-build launcher.
# It does not invoke or modify phx-ci and does not use GitHub Actions.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "phase6-vh22-repository-suite-blocker-repair-01"
$SourceBranch = "phase6-vh22-c09-scenario-correction-02"
$RepairInputSha = "5c33bb4e982fe2a211e48e3c082f2e01ce357368"
$EvidenceRepoPath = "dev/_ca-output.md"
$TaskEvidenceRepoPath = "dev/evidence/_ca-output-agt-ca-p6-vh22-repository-suite-blocker-repair-01.md"
$VerifierRepoPath = "dev/scripts/verify-vh22-repository-suite-blocker-repair-01.ps1"

$FocusedCompiledTests = @(
    ".test-build/test/phase6-alpha-portable-collision.test.js",
    ".test-build/test/phase6-foundation-failure-provenance.test.js",
    ".test-build/test/phase6-log06-diagnostic-bundle-operator-surface.test.js"
)

$AllowedDelta = @(
    "test/phase6-alpha-portable-collision.test.ts",
    "test/phase6-foundation-failure-provenance.test.ts",
    "test/phase6-log06-diagnostic-bundle-operator-surface.test.ts",
    $VerifierRepoPath,
    $EvidenceRepoPath,
    $TaskEvidenceRepoPath
)

$script:StartedAt = Get-Date
$script:RepoRoot = ""
$script:TranscriptPath = ""
$script:TranscriptStarted = $false
$script:ImplementationSha = ""
$script:ImplementationTree = ""
$script:ChangedFiles = @()
$script:StepResults = New-Object System.Collections.Generic.List[object]
$script:StepOutputs = @{}

function Get-NativeOutput {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    $captured = @(& $Command @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = ($captured | Out-String).TrimEnd()
    if ($exitCode -ne 0) {
        throw ("Command failed ({0}): {1} {2}{3}{4}" -f $exitCode, $Command, ($Arguments -join " "), [Environment]::NewLine, $text)
    }
    return $text
}

function Invoke-NativeStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    Write-Host ""
    Write-Host ("=== {0} ===" -f $Name) -ForegroundColor Cyan
    Write-Host ("COMMAND: {0} {1}" -f $Command, ($Arguments -join " "))

    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $captured = New-Object System.Collections.Generic.List[string]
    & $Command @Arguments 2>&1 | ForEach-Object {
        $line = [string]$_
        $captured.Add($line) | Out-Null
        Write-Host $line
    }
    $exitCode = $LASTEXITCODE
    $timer.Stop()

    $text = $captured -join [Environment]::NewLine
    $script:StepOutputs[$Name] = $text
    $script:StepResults.Add([pscustomobject]@{
        Name = $Name
        Command = ("{0} {1}" -f $Command, ($Arguments -join " ")).Trim()
        ExitCode = $exitCode
        Status = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }
        Seconds = [Math]::Round($timer.Elapsed.TotalSeconds, 2)
    }) | Out-Null

    if ($exitCode -ne 0) {
        throw ("{0} failed with exit code {1}." -f $Name, $exitCode)
    }

    Write-Host ("PASS: {0}" -f $Name) -ForegroundColor Green
    return $text
}

function Stop-VerificationTranscript {
    if ($script:TranscriptStarted) {
        try { Stop-Transcript | Out-Null } catch {}
        $script:TranscriptStarted = $false
    }
}

function Require-ExactFullSuiteTotals {
    param(
        [Parameter(Mandatory = $true)][string]$Output,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $required = @(
        "(?m)^# tests 993\s*$",
        "(?m)^# pass 993\s*$",
        "(?m)^# fail 0\s*$",
        "(?m)^# cancelled 0\s*$",
        "(?m)^# skipped 0\s*$",
        "(?m)^# todo 0\s*$"
    )

    foreach ($pattern in $required) {
        if ($Output -notmatch $pattern) {
            throw ("{0} did not report the required raw 993/993 passing totals. Missing pattern: {1}" -f $Label, $pattern)
        }
    }
}

function Get-RawSuiteSummary {
    param([Parameter(Mandatory = $true)][string]$Output)

    return (($Output -split "\r?\n") | Where-Object {
        $_ -match "^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) "
    }) -join [Environment]::NewLine
}

function Get-ImplementationHead {
    $candidate = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD")
    $evidenceOnlyPaths = @($EvidenceRepoPath, $TaskEvidenceRepoPath)

    while ($candidate -ne $RepairInputSha) {
        $changed = Get-NativeOutput -Command "git" -Arguments @("diff-tree", "--no-commit-id", "--name-only", "-r", $candidate)
        $files = @()
        if (-not [string]::IsNullOrWhiteSpace($changed)) {
            $files = $changed -split "\r?\n"
        }

        if ($files.Count -gt 0 -and @($files | Where-Object { $_ -notin $evidenceOnlyPaths }).Count -eq 0) {
            $candidate = Get-NativeOutput -Command "git" -Arguments @("rev-parse", ("{0}^" -f $candidate))
            continue
        }

        return $candidate
    }

    return $candidate
}

function Write-Evidence {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("COMPLETE", "BLOCKED")][string]$Status,
        [Parameter(Mandatory = $false)][string]$Blocker = ""
    )

    Stop-VerificationTranscript

    $finishedAt = Get-Date
    $transcript = ""
    if ($script:TranscriptPath -and (Test-Path -LiteralPath $script:TranscriptPath)) {
        $transcript = Get-Content -LiteralPath $script:TranscriptPath -Raw
    }

    $fullSuiteOutput = if ($script:StepOutputs.ContainsKey("Complete npm test")) { [string]$script:StepOutputs["Complete npm test"] } else { "" }
    $fullSuiteSummary = if ($fullSuiteOutput) { Get-RawSuiteSummary -Output $fullSuiteOutput } else { "NOT RUN" }

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add(("STATUS: {0}" -f $Status))
    $lines.Add("TASK: VH22/C09 Repository-Suite Blocker Repair 01")
    $lines.Add(("REPAIR_INPUT_SHA: {0}" -f $RepairInputSha))
    $lines.Add(("IMPLEMENTATION_SHA_BEFORE_EVIDENCE_ONLY_COMMIT: {0}" -f $script:ImplementationSha))
    $lines.Add(("IMPLEMENTATION_TREE_SHA: {0}" -f $script:ImplementationTree))
    $lines.Add(("EXPECTED_BRANCH: {0}" -f $ExpectedBranch))
    $lines.Add("GITHUB_ACTIONS_USED: NO")
    $lines.Add("PRODUCTION_SOURCE_MODIFIED: NO")
    $lines.Add("")
    $lines.Add("ROOT_CAUSE_DISPOSITION:")
    $lines.Add("477/478: TEST PORTABILITY DEFECT — expected paths used node:path.join against /vault while production intentionally resolves to an absolute platform path with node:path.resolve. Expectations now use resolve; containment semantics are unchanged.")
    $lines.Add("641: TEST REPRESENTATION DEFECT — Windows checkout CRLF conversion changes working-tree prefix bytes. Canonical Git blob bytes retain every approved predecessor prefix hash; C15 now reads exact HEAD blobs with git show and hashes those bytes without normalization.")
    $lines.Add("775: TEST SOURCE-BOUNDARY DEFECT — the method-extraction regex assumed LF-only boundaries. The boundary now accepts CRLF or LF while all substantive authority/audit/attention and no-Drive/no-sync/no-clear assertions remain intact.")
    $lines.Add("")
    $lines.Add("CHANGED_FILE_MANIFEST:")
    foreach ($file in $script:ChangedFiles) {
        $lines.Add(("  - {0}" -f $file))
    }
    $lines.Add("")
    $lines.Add("VERIFICATION_STEPS:")
    foreach ($step in $script:StepResults) {
        $lines.Add(("  {0} | exit {1} | {2} | {3}s | {4}" -f $step.Status, $step.ExitCode, $step.Name, $step.Seconds, $step.Command))
    }
    $lines.Add("")
    $lines.Add("FULL_RAW_TEST_TOTALS:")
    $lines.Add($fullSuiteSummary)

    if (-not [string]::IsNullOrWhiteSpace($Blocker)) {
        $lines.Add("")
        $lines.Add("BLOCKER:")
        $lines.Add($Blocker)
    }

    $lines.Add("")
    $lines.Add(("STARTED_LOCAL: {0}" -f $script:StartedAt.ToString("o")))
    $lines.Add(("FINISHED_LOCAL: {0}" -f $finishedAt.ToString("o")))
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

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllLines($evidencePath, $lines, $utf8NoBom)
    [System.IO.File]::WriteAllLines($taskEvidencePath, $lines, $utf8NoBom)

    Write-Host ""
    Write-Host "Evidence written:" -ForegroundColor Yellow
    Write-Host ("  {0}" -f $evidencePath)
    Write-Host ("  {0}" -f $taskEvidencePath)
}

function Commit-And-Push-Evidence {
    & git add -- $EvidenceRepoPath $TaskEvidenceRepoPath
    if ($LASTEXITCODE -ne 0) { throw "Unable to stage evidence files." }

    $staged = Get-NativeOutput -Command "git" -Arguments @("diff", "--cached", "--name-only")
    $stagedFiles = @()
    if (-not [string]::IsNullOrWhiteSpace($staged)) {
        $stagedFiles = $staged -split "\r?\n"
    }

    $unexpectedStaged = @($stagedFiles | Where-Object { $_ -notin @($EvidenceRepoPath, $TaskEvidenceRepoPath) })
    if ($unexpectedStaged.Count -gt 0) {
        throw ("Unexpected staged files before evidence commit:" + [Environment]::NewLine + ($unexpectedStaged -join [Environment]::NewLine))
    }

    if ($stagedFiles.Count -gt 0) {
        & git commit -m "docs(evidence): record VH22 repository-suite blocker repair 01"
        if ($LASTEXITCODE -ne 0) { throw "Evidence commit failed." }
    }

    & git push origin $ExpectedBranch
    if ($LASTEXITCODE -ne 0) { throw "Evidence push failed." }

    $finalHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD")
    Write-Host ("FINAL_BRANCH_HEAD_AFTER_EVIDENCE_COMMIT: {0}" -f $finalHead) -ForegroundColor Yellow
}

try {
    $script:RepoRoot = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "--show-toplevel")
    Set-Location -LiteralPath $script:RepoRoot

    $gitDir = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "--git-dir")
    if (-not [System.IO.Path]::IsPathRooted($gitDir)) {
        $gitDir = Join-Path $script:RepoRoot $gitDir
    }
    $script:TranscriptPath = Join-Path $gitDir "vh22-repository-suite-blocker-repair-01-transcript.txt"
    Start-Transcript -Path $script:TranscriptPath -Force | Out-Null
    $script:TranscriptStarted = $true

    Write-Host "VH22/C09 REPOSITORY-SUITE BLOCKER REPAIR 01 - LOCAL VERIFICATION" -ForegroundColor Yellow
    Write-Host ("Repository: {0}" -f $script:RepoRoot)
    Write-Host ("Expected branch: {0}" -f $ExpectedBranch)
    Write-Host "GitHub Actions are not used."

    $actualBranch = Get-NativeOutput -Command "git" -Arguments @("branch", "--show-current")
    if ($actualBranch -ne $ExpectedBranch) {
        throw ("Wrong branch. Expected '{0}' but found '{1}'." -f $ExpectedBranch, $actualBranch)
    }

    $initialStatus = Get-NativeOutput -Command "git" -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($initialStatus)) {
        throw ("Working tree must be clean before verification." + [Environment]::NewLine + $initialStatus)
    }

    Invoke-NativeStep -Name "Fetch origin metadata" -Command "git" -Arguments @("fetch", "origin", "--prune") | Out-Null

    $sourceHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", ("origin/{0}" -f $SourceBranch))
    if ($sourceHead -ne $RepairInputSha) {
        throw ("BASE DRIFT: origin/{0} is {1}; required {2}." -f $SourceBranch, $sourceHead, $RepairInputSha)
    }

    $localHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", "HEAD")
    $remoteHead = Get-NativeOutput -Command "git" -Arguments @("rev-parse", ("origin/{0}" -f $ExpectedBranch))
    if ($localHead -ne $remoteHead) {
        throw ("Local repair HEAD {0} does not equal origin/{1} {2}." -f $localHead, $ExpectedBranch, $remoteHead)
    }

    $mergeBase = Get-NativeOutput -Command "git" -Arguments @("merge-base", $RepairInputSha, "HEAD")
    if ($mergeBase -ne $RepairInputSha) {
        throw ("Repair branch is not rooted at exact input SHA {0}." -f $RepairInputSha)
    }

    $script:ImplementationSha = Get-ImplementationHead
    if ($script:ImplementationSha -eq $RepairInputSha) {
        throw "No implementation commit exists above the exact repair input SHA."
    }
    $script:ImplementationTree = Get-NativeOutput -Command "git" -Arguments @("rev-parse", ("{0}^{tree}" -f $script:ImplementationSha))

    $changedText = Get-NativeOutput -Command "git" -Arguments @("diff", "--name-only", ("{0}...HEAD" -f $RepairInputSha))
    $script:ChangedFiles = @()
    if (-not [string]::IsNullOrWhiteSpace($changedText)) {
        $script:ChangedFiles = $changedText -split "\r?\n"
    }

    $unexpected = @($script:ChangedFiles | Where-Object { $_ -notin $AllowedDelta })
    if ($unexpected.Count -gt 0) {
        throw ("Unauthorized repair delta:" + [Environment]::NewLine + ($unexpected -join [Environment]::NewLine))
    }

    $productionChanges = @($script:ChangedFiles | Where-Object { $_ -like "src/*" })
    if ($productionChanges.Count -gt 0) {
        throw ("PRODUCTION DEFECT / SCOPE EXPANSION REQUIRED" + [Environment]::NewLine + ($productionChanges -join [Environment]::NewLine))
    }

    Write-Host ""
    Write-Host "Toolchain:" -ForegroundColor Cyan
    Write-Host ("  {0}" -f (Get-NativeOutput -Command "git" -Arguments @("--version")))
    Write-Host ("  node {0}" -f (Get-NativeOutput -Command "node" -Arguments @("--version")))
    Write-Host ("  npm {0}" -f (Get-NativeOutput -Command "npm.cmd" -Arguments @("--version")))

    Invoke-NativeStep -Name "npm ci" -Command "npm.cmd" -Arguments @("ci") | Out-Null
    Invoke-NativeStep -Name "npm run typecheck" -Command "npm.cmd" -Arguments @("run", "typecheck") | Out-Null
    Invoke-NativeStep -Name "npx tsc -p tsconfig.test.json" -Command "npx.cmd" -Arguments @("tsc", "-p", "tsconfig.test.json") | Out-Null

    foreach ($compiledTest in $FocusedCompiledTests) {
        if (-not (Test-Path -LiteralPath (Join-Path $script:RepoRoot $compiledTest))) {
            throw ("Focused compiled test missing: {0}" -f $compiledTest)
        }
    }

    Invoke-NativeStep -Name "Affected compiled test files" -Command "node" -Arguments @(
        "--test",
        $FocusedCompiledTests[0],
        $FocusedCompiledTests[1],
        $FocusedCompiledTests[2]
    ) | Out-Null

    $fullTest = Invoke-NativeStep -Name "Complete npm test" -Command "npm.cmd" -Arguments @("test")
    Require-ExactFullSuiteTotals -Output $fullTest -Label "Complete npm test"

    Invoke-NativeStep -Name "npm run build" -Command "npm.cmd" -Arguments @("run", "build") | Out-Null

    $fullCheck = Invoke-NativeStep -Name "npm run check" -Command "npm.cmd" -Arguments @("run", "check")
    Require-ExactFullSuiteTotals -Output $fullCheck -Label "npm run check"

    Invoke-NativeStep -Name "git diff --check input...HEAD" -Command "git" -Arguments @("diff", "--check", ("{0}...HEAD" -f $RepairInputSha)) | Out-Null

    $statusAfterVerification = Get-NativeOutput -Command "git" -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($statusAfterVerification)) {
        throw ("Verification altered tracked/untracked repository content before evidence write." + [Environment]::NewLine + $statusAfterVerification)
    }

    Write-Host ""
    Write-Host "STATUS: COMPLETE" -ForegroundColor Green
    Write-Evidence -Status "COMPLETE"
    Commit-And-Push-Evidence
    exit 0
}
catch {
    $blocker = $_.Exception.Message
    Write-Host ""
    Write-Host "STATUS: BLOCKED" -ForegroundColor Red
    Write-Host $blocker -ForegroundColor Red

    try {
        if ($script:RepoRoot) {
            Write-Evidence -Status "BLOCKED" -Blocker $blocker
            Commit-And-Push-Evidence
        }
    }
    catch {
        Stop-VerificationTranscript
        Write-Host ("Evidence persistence failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
    }

    exit 1
}
finally {
    Stop-VerificationTranscript
}
