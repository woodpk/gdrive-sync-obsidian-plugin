# VH15-R3 local verification and evidence persistence
# Windows PowerShell 5.1 compatible. GitHub Actions are prohibited for this task.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "phase6-vh15-r3-runtime-derived-plan-identity-binding"
$BaseSha = "fbe9dfca58840e49ebcb3a14b97d4c569770cf6e"
$ImplementationSha = "598f43b53455f29255deecbd0384fbc8bcee55d3"
$FocusedR3Test = ".test-build/test/validation-mode-runtime-remote-identity-binding.test.js"
$FocusedR2Test = ".test-build/test/validation-mode-runtime-plan-handoff.test.js"
$EvidenceRepoPath = "dev/_ca-output.md"

$AllowedChangedFiles = @(
    "src/validation/validation-mode-runtime.ts",
    "test/validation-mode-runtime-remote-identity-binding.test.ts",
    "dev/scripts/vh15-r3-local-verification.ps1",
    $EvidenceRepoPath
)

$FrozenFiles = @(
    "src/validation/driver-plan-fault-verifier-contracts.ts",
    "src/validation/plan-assertion-engine.ts",
    "src/validation/scenario-runner-contracts.ts",
    "src/validation/scenario-runner-module-adapter.ts",
    "src/validation/scenario-runner.ts",
    "src/validation/production-path-driver.ts"
)

$script:EvidenceLines = New-Object System.Collections.Generic.List[string]
$script:StepResults = New-Object System.Collections.Generic.List[string]
$script:RepoRoot = ""
$script:EvidencePath = ""
$script:VerifiedHead = ""
$script:VerifiedTree = ""
$script:ChangedFiles = @()
$script:MainJsHash = ""
$script:MainJsBytes = ""
$script:Failure = ""
$script:StartTime = Get-Date

function Add-EvidenceLine {
    param([Parameter(Mandatory = $true)][string]$Line)
    $script:EvidenceLines.Add($Line) | Out-Null
}

function Render-Command {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    $rendered = New-Object System.Collections.Generic.List[string]
    $rendered.Add($File) | Out-Null
    foreach ($argument in $Arguments) {
        if ($argument -match "[\s`"']") {
            $escaped = $argument.Replace('"', '\"')
            $rendered.Add('"' + $escaped + '"') | Out-Null
        }
        else {
            $rendered.Add($argument) | Out-Null
        }
    }
    return ($rendered -join " ")
}

function Invoke-CapturedNative {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    Write-Host ""
    Write-Host "=== $Label ===" -ForegroundColor Cyan
    $commandText = Render-Command -File $File -Arguments $Arguments
    Write-Host $commandText

    Add-EvidenceLine ""
    Add-EvidenceLine "### $Label"
    Add-EvidenceLine ""
    Add-EvidenceLine "COMMAND: $commandText"
    Add-EvidenceLine ""
    Add-EvidenceLine '~~~text'

    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $output = & $File @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $timer.Stop()

    foreach ($line in @($output)) {
        $text = [string]$line
        Write-Host $text
        Add-EvidenceLine $text
    }

    Add-EvidenceLine '~~~'
    Add-EvidenceLine ""
    Add-EvidenceLine "EXIT_CODE: $exitCode"
    Add-EvidenceLine ("DURATION_SECONDS: {0}" -f [Math]::Round($timer.Elapsed.TotalSeconds, 2))

    if ($exitCode -ne 0) {
        $script:StepResults.Add("FAIL | $Label | exit $exitCode") | Out-Null
        throw "$Label failed with native exit code $exitCode."
    }

    $script:StepResults.Add("PASS | $Label | exit 0") | Out-Null
    return @($output)
}

function Read-NativeValue {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    $output = & $File @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw ("Native command failed ({0}): {1}" -f $exitCode, (Render-Command -File $File -Arguments $Arguments))
    }
    return (($output | Out-String).Trim())
}

function Get-ChangedFiles {
    $text = Read-NativeValue -File "git" -Arguments @("diff", "--name-only", "$BaseSha..HEAD")
    if ([string]::IsNullOrWhiteSpace($text)) {
        return @()
    }
    return @($text -split "\r?\n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Assert-Scope {
    $changed = Get-ChangedFiles
    $script:ChangedFiles = @($changed)

    $unexpected = @($changed | Where-Object { $_ -notin $AllowedChangedFiles })
    if ($unexpected.Count -gt 0) {
        throw ("Unexpected R3 changed files:" + [Environment]::NewLine + ($unexpected -join [Environment]::NewLine))
    }

    $frozen = New-Object System.Collections.Generic.List[string]
    foreach ($path in $changed) {
        if ($path -like "src/contracts/*") {
            $frozen.Add($path) | Out-Null
        }
        elseif ($path -in $FrozenFiles) {
            $frozen.Add($path) | Out-Null
        }
    }
    if ($frozen.Count -gt 0) {
        throw ("Frozen R3 surface changed:" + [Environment]::NewLine + (($frozen | Select-Object -Unique) -join [Environment]::NewLine))
    }

    $scenarioChanges = @($changed | Where-Object {
        $_ -match "(^|/)(C03|C04|C05|C06|C07|C08|C09)(-|\.|/)"
    })
    if ($scenarioChanges.Count -gt 0) {
        throw ("C03-C09 scenario implementation/task files changed unexpectedly:" + [Environment]::NewLine + ($scenarioChanges -join [Environment]::NewLine))
    }
}

function Get-UnrelatedDirtyFiles {
    $status = Read-NativeValue -File "git" -Arguments @("status", "--porcelain")
    if ([string]::IsNullOrWhiteSpace($status)) {
        return @()
    }

    $unrelated = New-Object System.Collections.Generic.List[string]
    foreach ($line in ($status -split "\r?\n")) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        $path = $line.Substring(3).Trim()
        if ($path -ne $EvidenceRepoPath) {
            $unrelated.Add($line) | Out-Null
        }
    }
    return @($unrelated)
}

function Write-EvidenceFile {
    param([Parameter(Mandatory = $true)][string]$Status)

    $finish = Get-Date
    $header = New-Object System.Collections.Generic.List[string]
    $header.Add("STATUS: $Status") | Out-Null
    $header.Add("") | Out-Null
    $header.Add("# VH15-R3 — Runtime-Derived Remote-Identity Plan Binding Local Verification") | Out-Null
    $header.Add("") | Out-Null
    $header.Add("BRANCH: $ExpectedBranch") | Out-Null
    $header.Add("BASE_SHA: $BaseSha") | Out-Null
    $header.Add("IMPLEMENTATION_SHA: $ImplementationSha") | Out-Null
    $header.Add("VERIFIED_HEAD_SHA: $script:VerifiedHead") | Out-Null
    $header.Add("VERIFIED_TREE_SHA: $script:VerifiedTree") | Out-Null
    $header.Add("STARTED_LOCAL: $($script:StartTime.ToString('o'))") | Out-Null
    $header.Add("FINISHED_LOCAL: $($finish.ToString('o'))") | Out-Null
    $header.Add("MAIN_JS_BYTES: $script:MainJsBytes") | Out-Null
    $header.Add("MAIN_JS_SHA256: $script:MainJsHash") | Out-Null
    $header.Add("") | Out-Null
    $header.Add("## Changed-file manifest from BASE_SHA") | Out-Null
    $header.Add("") | Out-Null
    foreach ($path in $script:ChangedFiles) {
        $header.Add("- $path") | Out-Null
    }
    $header.Add("") | Out-Null
    $header.Add("FROZEN_SURFACE_CHECK: PASS") | Out-Null
    $header.Add("GITHUB_ACTIONS_USED: NO") | Out-Null
    $header.Add("") | Out-Null
    $header.Add("## Step summary") | Out-Null
    $header.Add("") | Out-Null
    foreach ($step in $script:StepResults) {
        $header.Add("- $step") | Out-Null
    }
    if (-not [string]::IsNullOrWhiteSpace($script:Failure)) {
        $header.Add("") | Out-Null
        $header.Add("## Failure") | Out-Null
        $header.Add("") | Out-Null
        $header.Add($script:Failure) | Out-Null
    }
    $header.Add("") | Out-Null
    $header.Add("## Complete command output") | Out-Null

    $all = New-Object System.Collections.Generic.List[string]
    foreach ($line in $header) { $all.Add($line) | Out-Null }
    foreach ($line in $script:EvidenceLines) { $all.Add($line) | Out-Null }

    [System.IO.File]::WriteAllLines(
        $script:EvidencePath,
        $all,
        (New-Object System.Text.UTF8Encoding($false))
    )
}

function Publish-Evidence {
    param([Parameter(Mandatory = $true)][string]$Status)

    $unrelated = Get-UnrelatedDirtyFiles
    if ($unrelated.Count -gt 0) {
        Write-Host "Evidence was written but will not be committed because unrelated working-tree changes exist:" -ForegroundColor Red
        foreach ($line in $unrelated) { Write-Host $line -ForegroundColor Red }
        return
    }

    & git add -- $EvidenceRepoPath
    if ($LASTEXITCODE -ne 0) { throw "git add of $EvidenceRepoPath failed." }

    & git diff --cached --quiet
    $stagedDifference = $LASTEXITCODE
    if ($stagedDifference -eq 0) {
        Write-Host "Evidence file is unchanged; no evidence commit is required."
    }
    elseif ($stagedDifference -eq 1) {
        $message = if ($Status -eq "COMPLETE") {
            "docs: record VH15-R3 local verification"
        }
        else {
            "docs: record blocked VH15-R3 local verification"
        }
        & git commit -m $message
        if ($LASTEXITCODE -ne 0) { throw "Evidence commit failed." }
    }
    else {
        throw "Unable to determine staged evidence state."
    }

    & git push origin ("HEAD:" + $ExpectedBranch)
    if ($LASTEXITCODE -ne 0) { throw "Evidence push failed." }
}

$finalStatus = "BLOCKED"

try {
    $repoRoot = Read-NativeValue -File "git" -Arguments @("rev-parse", "--show-toplevel")
    $script:RepoRoot = $repoRoot
    Set-Location -LiteralPath $repoRoot
    $script:EvidencePath = Join-Path $repoRoot $EvidenceRepoPath

    Write-Host "VH15-R3 LOCAL VERIFICATION" -ForegroundColor Yellow
    Write-Host "Repository: $repoRoot"
    Write-Host "Expected branch: $ExpectedBranch"
    Write-Host "GitHub Actions: prohibited / not used"

    $branch = Read-NativeValue -File "git" -Arguments @("branch", "--show-current")
    if ($branch -ne $ExpectedBranch) {
        throw "Wrong branch. Expected '$ExpectedBranch' but found '$branch'."
    }

    $initialStatus = Read-NativeValue -File "git" -Arguments @("status", "--porcelain")
    if (-not [string]::IsNullOrWhiteSpace($initialStatus)) {
        throw ("Working tree must be clean before verification." + [Environment]::NewLine + $initialStatus)
    }

    Invoke-CapturedNative -Label "Fetch origin metadata" -File "git" -Arguments @("fetch", "origin", "--prune") | Out-Null

    $remoteHead = Read-NativeValue -File "git" -Arguments @("rev-parse", "origin/$ExpectedBranch")
    $localHead = Read-NativeValue -File "git" -Arguments @("rev-parse", "HEAD")
    if ($remoteHead -ne $localHead) {
        throw "Local HEAD $localHead does not equal origin/$ExpectedBranch $remoteHead."
    }

    & git cat-file -e ($BaseSha + "^{commit}")
    if ($LASTEXITCODE -ne 0) { throw "Required BASE_SHA is unavailable locally: $BaseSha" }
    & git merge-base --is-ancestor $BaseSha HEAD
    if ($LASTEXITCODE -ne 0) { throw "BASE_SHA is not an ancestor of HEAD." }

    & git cat-file -e ($ImplementationSha + "^{commit}")
    if ($LASTEXITCODE -ne 0) { throw "Required implementation SHA is unavailable locally: $ImplementationSha" }
    & git merge-base --is-ancestor $ImplementationSha HEAD
    if ($LASTEXITCODE -ne 0) { throw "Implementation SHA is not an ancestor of HEAD." }

    $script:VerifiedHead = Read-NativeValue -File "git" -Arguments @("rev-parse", "HEAD")
    $script:VerifiedTree = Read-NativeValue -File "git" -Arguments @("rev-parse", "HEAD^{tree}")

    Assert-Scope

    Add-EvidenceLine ""
    Add-EvidenceLine "### Toolchain"
    Add-EvidenceLine ""
    Add-EvidenceLine ("git: " + (Read-NativeValue -File "git" -Arguments @("--version")))
    Add-EvidenceLine ("node: " + (Read-NativeValue -File "node.exe" -Arguments @("--version")))
    Add-EvidenceLine ("npm: " + (Read-NativeValue -File "npm.cmd" -Arguments @("--version")))

    Invoke-CapturedNative -Label "Dependency installation from lockfile" -File "npm.cmd" -Arguments @("ci") | Out-Null
    Invoke-CapturedNative -Label "Test TypeScript compilation" -File "npx.cmd" -Arguments @("tsc", "-p", "tsconfig.test.json") | Out-Null

    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $FocusedR3Test))) {
        throw "Focused R3 compiled test not found: $FocusedR3Test"
    }
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $FocusedR2Test))) {
        throw "Focused R2 compiled test not found: $FocusedR2Test"
    }

    Invoke-CapturedNative -Label "Focused VH15-R3 remote-identity binding tests" -File "node.exe" -Arguments @($FocusedR3Test) | Out-Null
    Invoke-CapturedNative -Label "Existing VH15-R2 plan-handoff regressions" -File "node.exe" -Arguments @($FocusedR2Test) | Out-Null
    Invoke-CapturedNative -Label "Complete automated test suite" -File "npm.cmd" -Arguments @("test") | Out-Null
    Invoke-CapturedNative -Label "TypeScript typecheck" -File "npm.cmd" -Arguments @("run", "typecheck") | Out-Null
    Invoke-CapturedNative -Label "Production build" -File "npm.cmd" -Arguments @("run", "build") | Out-Null
    Invoke-CapturedNative -Label "Full repository check" -File "npm.cmd" -Arguments @("run", "check") | Out-Null
    Invoke-CapturedNative -Label "R3 delta whitespace check" -File "git" -Arguments @("diff", "--check", "$BaseSha..HEAD") | Out-Null
    Invoke-CapturedNative -Label "Working-tree whitespace check" -File "git" -Arguments @("diff", "--check") | Out-Null

    Assert-Scope

    $unrelated = Get-UnrelatedDirtyFiles
    if ($unrelated.Count -gt 0) {
        throw ("Verification changed tracked repository files unexpectedly:" + [Environment]::NewLine + ($unrelated -join [Environment]::NewLine))
    }

    $mainPath = Join-Path $repoRoot "main.js"
    if (-not (Test-Path -LiteralPath $mainPath)) {
        throw "Production build did not produce main.js."
    }
    $script:MainJsHash = (Get-FileHash -LiteralPath $mainPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $script:MainJsBytes = [string](Get-Item -LiteralPath $mainPath).Length

    $script:StepResults.Add("PASS | Changed-file manifest and frozen-surface scope checks | exit 0") | Out-Null
    $script:StepResults.Add("PASS | main.js SHA-256 recorded | exit 0") | Out-Null

    $finalStatus = "COMPLETE"
}
catch {
    $script:Failure = $_.Exception.Message
    $finalStatus = "BLOCKED"
    Write-Host ""
    Write-Host "STATUS: BLOCKED" -ForegroundColor Red
    Write-Host $script:Failure -ForegroundColor Red
}
finally {
    if (-not [string]::IsNullOrWhiteSpace($script:RepoRoot)) {
        try {
            if ([string]::IsNullOrWhiteSpace($script:VerifiedHead)) {
                $script:VerifiedHead = Read-NativeValue -File "git" -Arguments @("rev-parse", "HEAD")
            }
            if ([string]::IsNullOrWhiteSpace($script:VerifiedTree)) {
                $script:VerifiedTree = Read-NativeValue -File "git" -Arguments @("rev-parse", "HEAD^{tree}")
            }
            if ($script:ChangedFiles.Count -eq 0) {
                try { Assert-Scope } catch {}
            }

            Write-EvidenceFile -Status $finalStatus
            Publish-Evidence -Status $finalStatus
        }
        catch {
            Write-Host "Evidence persistence failed: $($_.Exception.Message)" -ForegroundColor Red
            $finalStatus = "BLOCKED"
        }
    }

    Write-Host ""
    Write-Host "FINAL STATUS: $finalStatus"
}

if ($finalStatus -eq "COMPLETE") {
    exit 0
}
exit 1
