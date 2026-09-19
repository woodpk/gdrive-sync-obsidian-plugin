# VH22 C09 Correction 02 local bootstrap
# Prepares the local repository, runs repository-controlled verification,
# persists the resulting evidence, and pushes it. No GitHub Actions are used.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Branch = "phase6-vh22-c09-scenario-correction-02"
$Verifier = ".\dev\scripts\verify-vh22-c09-correction-02.ps1"
$Evidence = "dev/_ca-output.md"
$TaskEvidence = "dev/evidence/_ca-output-agt-ca-p6-vh22-c09-scenario-01-correction-02.md"

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE: $Command $($Arguments -join ' ')"
    }
}

$repoRoot = (& git rev-parse --show-toplevel 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    throw "Run this bootstrap from inside the gdrive-sync-obsidian-plugin repository."
}
Set-Location -LiteralPath $repoRoot

$dirty = (& git status --porcelain 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect git working-tree status."
}
if (-not [string]::IsNullOrWhiteSpace($dirty)) {
    throw "Working tree must be clean before the C09 correction bootstrap runs."
}

Invoke-Native -Command "git" -Arguments @("fetch", "origin", "--prune")

& git show-ref --verify --quiet "refs/heads/$Branch"
$localBranchExists = $LASTEXITCODE -eq 0
if ($localBranchExists) {
    Invoke-Native -Command "git" -Arguments @("switch", $Branch)
}
else {
    Invoke-Native -Command "git" -Arguments @("switch", "--track", "-c", $Branch, "origin/$Branch")
}

Invoke-Native -Command "git" -Arguments @("pull", "--ff-only", "origin", $Branch)

if (-not (Test-Path -LiteralPath $Verifier)) {
    throw "Verification script is missing: $Verifier"
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Verifier
$verificationExit = $LASTEXITCODE
if ($verificationExit -ne 0) {
    Write-Host ""
    Write-Host "C09 correction verification did not complete successfully." -ForegroundColor Red
    Write-Host "Evidence was left in $Evidence and $TaskEvidence for review."
    exit $verificationExit
}

if (-not (Test-Path -LiteralPath $Evidence)) {
    throw "Verification completed without producing $Evidence."
}
if (-not (Test-Path -LiteralPath $TaskEvidence)) {
    throw "Verification completed without producing $TaskEvidence."
}

$firstLine = Get-Content -LiteralPath $Evidence -TotalCount 1
if ($firstLine -ne "STATUS: COMPLETE") {
    throw "Verification evidence does not begin exactly 'STATUS: COMPLETE'. Actual: $firstLine"
}

Invoke-Native -Command "git" -Arguments @("add", "--", $Evidence, $TaskEvidence)

& git diff --cached --quiet
$hasEvidenceChanges = $LASTEXITCODE -ne 0
if ($hasEvidenceChanges) {
    Invoke-Native -Command "git" -Arguments @(
        "commit",
        "-m",
        "docs(evidence): record VH22 C09 correction 02 verification"
    )
}
else {
    Write-Host "Evidence already matches the committed repository state; no evidence commit required." -ForegroundColor Yellow
}

Invoke-Native -Command "git" -Arguments @("push", "origin", $Branch)

Write-Host ""
Write-Host "VH22 C09 Correction 02 verification complete." -ForegroundColor Green
Write-Host "Branch: $Branch"
Write-Host "Evidence: $Evidence"
Write-Host "Task evidence: $TaskEvidence"
Write-Host "No temporary branch was created, so no branch cleanup is required."
