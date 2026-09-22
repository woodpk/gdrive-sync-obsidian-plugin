# Phase 6 01-test PHX-CI prompt migration verifier.
# This script verifies documentation/tasking migration only. It is not a CI engine.

[CmdletBinding()]
param(
    [string]$RepoRoot = "",
    [string]$BaseSha = "e9a107bb21cabbe7556862ba8193c892fea2808c"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "PowerShell 7 or later is required. Current version: $($PSVersionTable.PSVersion)"
}

$ExpectedMarkdownCount = 82
$TargetRelative = 'dev/agents/st2a/ph6/04-lv/01-test'
$VerifierRelative = 'dev/scripts/verify-phase6-01-test-phx-ci-migration.ps1'
$EvidenceRelative = 'dev/evidence/_ca-output-agt-ca-p6-01-test-phx-ci-prompt-migration-01.md'
$violations = [System.Collections.Generic.List[string]]::new()
$classCounts = [ordered]@{}

function Add-Violation {
    param([Parameter(Mandatory)][string]$Message)
    $script:violations.Add($Message)
    Write-Host "VIOLATION: $Message" -ForegroundColor Red
}

function Invoke-GitText {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $output = @(& git -C $script:RepoRoot @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).TrimEnd()
    if ($exitCode -ne 0) {
        throw "git -C '$script:RepoRoot' $($Arguments -join ' ') failed with exit code $exitCode" + [Environment]::NewLine + $text + ""
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
        Add-Violation "$Label failed with exit code $exitCode."
    }
}

function Get-VhNumber {
    param([Parameter(Mandatory)][string]$Name)
    if ($Name -match '^00-vh(?<n>\d{2})-') {
        return [int]$Matches.n
    }
    return $null
}

function Get-DocumentClass {
    param(
        [Parameter(Mandatory)][System.IO.FileInfo]$File,
        [Parameter(Mandatory)][string]$Text
    )
    $name = $File.Name
    if ($name -eq '00-live-validation-protocol.md') { return 'live-validation protocol / shared operational instruction' }
    if ($name -match 'correction' -or $name -eq '01-vh14i-final-integration-verify.md') { return 'historical/correction task prompt' }
    if ($name -match 'independent.*verification') { return 'independent verification task prompt' }
    if ($name -match 'integration') { return 'integration task prompt' }
    if ($name -match '^[BCDEF]\d{2}-') { return 'scenario acceptance/specification document' }
    if ($name -match '^00-vh\d{2}-') { return 'executable agent task prompt' }
    return 'unclassified'
}

function Test-ContainsAll {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][hashtable]$Checks
    )
    foreach ($key in $Checks.Keys) {
        if ($Text -notmatch $Checks[$key]) {
            Add-Violation "$Path is missing required PHX-CI migration marker: $key"
        }
    }
}

function Test-LineIsHistoricalOrProhibitive {
    param([Parameter(Mandatory)][string]$Line)
    return $Line -match '(?i)prohibited|historical|retired|do\s+\*\*not\*\*|do not|must not|does not exist|no GitHub Actions|use no GitHub Actions|not used|non-executable|current verification policy override'
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $rootOutput = @(& git rev-parse --show-toplevel 2>&1)
    $rootExit = $LASTEXITCODE
    if ($rootExit -ne 0) { throw "Unable to resolve repository root with git rev-parse --show-toplevel." }
    $RepoRoot = (($rootOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
}

$script:RepoRoot = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\','/')
if (-not (Test-Path -LiteralPath $script:RepoRoot -PathType Container)) {
    throw "Repository root not found: $script:RepoRoot"
}

$actualTop = [IO.Path]::GetFullPath((Invoke-GitText @('rev-parse','--show-toplevel'))).TrimEnd('\','/')
if (-not [string]::Equals($script:RepoRoot, $actualTop, [StringComparison]::OrdinalIgnoreCase)) {
    throw "RepoRoot is not the Git repository top level. Requested '$script:RepoRoot'; actual '$actualTop'."
}

$head = Invoke-GitText @('rev-parse','HEAD')
$branch = Invoke-GitText @('branch','--show-current')
Write-Host "Phase 6 01-test PHX-CI prompt migration verifier"
Write-Host "Repository: $script:RepoRoot"
Write-Host "Branch: $branch"
Write-Host "HEAD: $head"
Write-Host "Base: $BaseSha"

if ($BaseSha -notmatch '^[0-9a-fA-F]{40}$') {
    Add-Violation "BaseSha is not a full 40-character Git SHA: $BaseSha"
} else {
    $baseType = Invoke-GitText @('cat-file','-t',$BaseSha)
    if ($baseType -ne 'commit') { Add-Violation "BaseSha does not resolve to a commit: $BaseSha" }
}

$targetRoot = Join-Path $script:RepoRoot $TargetRelative
if (-not (Test-Path -LiteralPath $targetRoot -PathType Container)) {
    throw "Target directory not found: $targetRoot"
}

$mdFiles = @(Get-ChildItem -LiteralPath $targetRoot -Recurse -File -Filter '*.md' | Sort-Object FullName)
Write-Host "TOTAL_MARKDOWN_FILES: $($mdFiles.Count)"
if ($mdFiles.Count -ne $ExpectedMarkdownCount) {
    Add-Violation "Expected exactly $ExpectedMarkdownCount Markdown files under $TargetRelative; found $($mdFiles.Count)."
}

$futureChecks = @{
    'GitHub Actions prohibition' = '(?i)GitHub Actions are prohibited'
    'PHX-CI framework' = 'PHX-CI'
    'exact framework pin' = 'phx-ci\.json\.framework\.sha'
    'PowerShell launcher' = 'dev/scripts/[^\s]+\.ps1'
    'focused verification' = '(?i)focused'
    'repository verification' = '(?i)repository verification'
    'canonical Markdown evidence' = 'dev/_ca-output\.md'
    'canonical JSON evidence' = 'dev/_ca-output\.json'
    'PASS triple' = 'PASS / PASS / PASS'
    'git diff check' = 'git diff --check'
    'active checkout preservation' = '(?i)active/control checkout'
}

$historicalOverrideRegex = '(?i)Current verification policy override'
$protocolChecks = @{
    'local-only policy' = '(?i)GitHub Actions are prohibited'
    'PHX-CI framework' = 'PHX-CI'
    'exact framework pin' = 'phx-ci\.json\.framework\.sha'
    'canonical Markdown evidence' = 'dev/_ca-output\.md'
    'canonical JSON evidence' = 'dev/_ca-output\.json'
    'PASS triple' = 'PASS / PASS / PASS'
    'retired runner prohibition' = 'dev/scripts/run-phx-ci\.ps1'
}

foreach ($file in $mdFiles) {
    $relative = [IO.Path]::GetRelativePath($script:RepoRoot, $file.FullName).Replace('\','/')
    try {
        $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding utf8
    } catch {
        Add-Violation "$relative could not be parsed as UTF-8 text: $($_.Exception.Message)"
        continue
    }

    $class = Get-DocumentClass -File $file -Text $text
    if (-not $classCounts.Contains($class)) { $classCounts[$class] = 0 }
    $classCounts[$class]++
    Write-Host ("REVIEWED: {0} | {1}" -f $class, $relative)

    if ($class -eq 'unclassified') {
        Add-Violation "$relative could not be classified into the required migration categories."
    }

    if ($file.Name -eq '00-live-validation-protocol.md') {
        Test-ContainsAll -Path $relative -Text $text -Checks $protocolChecks
    }

    $vh = Get-VhNumber -Name $file.Name
    if ($null -ne $vh -and $vh -ge 23) {
        Test-ContainsAll -Path $relative -Text $text -Checks $futureChecks
        if (($class -eq 'integration task prompt' -or $class -eq 'independent verification task prompt') -and
            ($text -notmatch '(?i)Authoritative verification|mandatory local execution/evidence framework|pinned centralized PHX-CI|centralized PHX-CI framework')) {
            Add-Violation "$relative does not explicitly make PHX-CI authoritative/mandatory for integration or independent verification."
        }
    }

    if (($null -ne $vh -and $vh -lt 23) -or $file.Name -eq '01-vh14i-final-integration-verify.md') {
        if ($class -ne 'scenario acceptance/specification document' -and $text -match '(?i)verification|npm run check|npm test|build') {
            if ($text -notmatch $historicalOverrideRegex) {
                Add-Violation "$relative is a reusable historical executable task without the current PHX-CI policy override."
            }
        }
    }

    $lines = $text -split '\r?\n'
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match '(?i)GitHub Actions' -and -not (Test-LineIsHistoricalOrProhibitive -Line $line)) {
            Add-Violation ("{0}:{1} contains an active/current GitHub Actions instruction: {2}" -f $relative, ($i + 1), $line.Trim())
        }
        if ($line -match 'dev/scripts/run-phx-ci\.ps1' -and -not (Test-LineIsHistoricalOrProhibitive -Line $line)) {
            Add-Violation ("{0}:{1} contains an active/current retired-runner instruction: {2}" -f $relative, ($i + 1), $line.Trim())
        }
    }

    if (($class -eq 'executable agent task prompt' -or $class -eq 'integration task prompt' -or $class -eq 'independent verification task prompt' -or $class -eq 'historical/correction task prompt') -and
        $text -match 'STATUS: COMPLETE' -and $text -notmatch 'PASS / PASS / PASS') {
        Add-Violation "$relative allows or discusses COMPLETE without an unambiguous PHX-CI PASS / PASS / PASS gate."
    }
}

Write-Host ""
Write-Host "CLASSIFICATION_COUNTS:"
foreach ($entry in $classCounts.GetEnumerator()) {
    Write-Host ("  {0}: {1}" -f $entry.Key, $entry.Value)
}

$changedText = Invoke-GitText @('diff','--name-only',"$BaseSha..HEAD")
$changed = @($changedText -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$allowedEvidence = [regex]::Escape($EvidenceRelative)
$allowedVerifier = [regex]::Escape($VerifierRelative)
$allowedDocsPrefix = '^dev/agents/st2a/ph6/04-lv/01-test/.+\.md$'
foreach ($path in $changed) {
    $normalized = $path.Replace('\','/')
    $allowed = $normalized -match $allowedDocsPrefix -or $normalized -match "^$allowedVerifier$" -or $normalized -match "^$allowedEvidence$"
    if (-not $allowed) {
        Add-Violation "Changed path is outside the permitted migration scope: $normalized"
    }
}
Write-Host "CHANGED_FILES_FROM_BASE: $($changed.Count)"
foreach ($path in $changed) { Write-Host "  $path" }

$worktreeStatus = Invoke-GitText @('status','--porcelain=v1')
if (-not [string]::IsNullOrWhiteSpace($worktreeStatus)) {
    foreach ($statusLine in ($worktreeStatus -split '\r?\n')) {
        if ([string]::IsNullOrWhiteSpace($statusLine)) { continue }
        $pathPart = if ($statusLine.Length -gt 3) { $statusLine.Substring(3).Trim() } else { $statusLine.Trim() }
        if ($pathPart -match ' -> ') { $pathPart = ($pathPart -split ' -> ')[-1] }
        $normalized = $pathPart.Trim('"').Replace('\','/')
        $allowed = $normalized -match $allowedDocsPrefix -or $normalized -eq $VerifierRelative -or $normalized -eq $EvidenceRelative
        if (-not $allowed) {
            Add-Violation "Working-tree path is outside permitted migration scope: $normalized"
        }
    }
}

Invoke-GitCheck -Label 'git diff --check base..HEAD' -Arguments @('diff','--check',"$BaseSha..HEAD")
Invoke-GitCheck -Label 'git diff --check working tree' -Arguments @('diff','--check')

if ($violations.Count -gt 0) {
    Write-Host ""
    Write-Host "MIGRATION_VERIFIER_RESULT: FAIL" -ForegroundColor Red
    Write-Host "VIOLATION_COUNT: $($violations.Count)"
    exit 1
}

Write-Host ""
Write-Host "MIGRATION_VERIFIER_RESULT: PASS" -ForegroundColor Green
Write-Host "TOTAL_MARKDOWN_FILES: $($mdFiles.Count)"
Write-Host "FUTURE_VH23_PLUS_POLICY: PASS"
Write-Host "ACTIVE_GITHUB_ACTIONS_INSTRUCTIONS: NONE"
Write-Host "ACTIVE_RETIRED_RUNNER_INSTRUCTIONS: NONE"
Write-Host "CANONICAL_EVIDENCE_POLICY: PASS"
Write-Host "ALLOWED_PATH_SCOPE: PASS"
Write-Host "GIT_DIFF_CHECK: PASS"
exit 0
