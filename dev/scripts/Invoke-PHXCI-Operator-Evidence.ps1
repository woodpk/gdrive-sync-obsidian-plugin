[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$ExpectedCandidateSha,
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$AcceptedBaseSha,
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f]{40}$')][string]$RuntimeSha,
    [Parameter(Mandatory)][ValidatePattern('^[0-9a-f-]{36}$')][string]$GdcId,
    [Parameter(Mandatory)][string]$SourceBranch,
    [string]$FocusedTestCommand = 'npm run test:bvp-root',
    [string]$RepositoryUrl = 'https://github.com/woodpk/gdrive-sync-obsidian-plugin.git',
    [string]$RuntimeStoreRoot = '',
    [string]$TempParent = 'C:\temp'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# PHX-CI operator/evidence transport only. No independent software validation.
$runId = [guid]::NewGuid().ToString('N')
$root = Join-Path $TempParent $runId
$repo = Join-Path $root 'repo'
$log = Join-Path $root 'operator-terminal.log'
$evidenceBranch = "evidence/gdc-$GdcId/operator-$runId"
$phxExit = $null
$published = $false
$operatorError = $null
$transcriptStarted = $false
New-Item -ItemType Directory -Path $root -Force | Out-Null
try {
    Start-Transcript -LiteralPath $log -Force | Out-Null
    $transcriptStarted = $true
    Write-Host "RUN ROOT: $root"
    Write-Host "GDC: $GdcId"
    Write-Host "CANDIDATE: $ExpectedCandidateSha"
    Write-Host "RUNTIME: $RuntimeSha"
    Write-Host "OPERATOR EVIDENCE BRANCH: $evidenceBranch"
    & git.exe clone --quiet --single-branch --branch $SourceBranch $RepositoryUrl $repo
    if ($LASTEXITCODE -ne 0) { throw "Git clone failed, exit code $LASTEXITCODE" }
    $actual = (& git.exe -C $repo rev-parse HEAD)
    if ($LASTEXITCODE -ne 0 -or [string]$actual -cne $ExpectedCandidateSha) {
        throw "Candidate SHA mismatch: actual $actual, required $ExpectedCandidateSha"
    }
    if ([string]::IsNullOrWhiteSpace($RuntimeStoreRoot)) {
        $RuntimeStoreRoot = Join-Path $env:LOCALAPPDATA 'PHX-CI\runtimes'
    }
    $front = Join-Path (Join-Path $RuntimeStoreRoot $RuntimeSha) 'scripts\Invoke-PhxCi.ps1'
    if (-not (Test-Path -LiteralPath $front -PathType Leaf)) {
        throw "Pinned PHX-CI entrypoint unavailable: $front"
    }
    # Child PowerShell keeps PHX-CI's own exit isolated from evidence transport.
    & pwsh -NoProfile -File $front -RepoRoot $repo -Branch $SourceBranch -BaseRef $AcceptedBaseSha -FocusedTestCommand $FocusedTestCommand -PublicationMode push -TempRoot $root
    $phxExit = $LASTEXITCODE
    Write-Host "PHX-CI EXIT CODE: $phxExit"
} catch {
    $operatorError = $_.Exception.Message
    Write-Warning "OPERATOR ERROR: $operatorError"
} finally {
    if ($transcriptStarted) {
        Write-Host "OPERATOR LOG: $log"
        Stop-Transcript | Out-Null
    }
}
# Publish transport diagnostics independently of candidate and canonical PHX-CI evidence.
# Never amend, rebase, force-push, or move the exact source candidate.
if (Test-Path -LiteralPath (Join-Path $repo '.git')) {
    try {
        & git.exe -C $repo switch --quiet --create $evidenceBranch $ExpectedCandidateSha
        if ($LASTEXITCODE -ne 0) { throw 'Unable to create evidence-only branch' }
        $relative = "dev/test-results/operator-$runId/operator-terminal.log"
        $destination = Join-Path $repo ($relative.Replace('/', [IO.Path]::DirectorySeparatorChar))
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $log -Destination $destination -Force
        $summary = [ordered]@{
            schemaVersion = 1
            gdcId = $GdcId
            exactCandidateSha = $ExpectedCandidateSha
            acceptedBaseSha = $AcceptedBaseSha
            runtimeSha = $RuntimeSha
            focusedTestCommand = $FocusedTestCommand
            phxCiExitCode = $phxExit
            operatorError = $operatorError
            canonicalPublicationRequested = $true
            canonicalPublicationConfirmed = $false
            evidenceBranch = $evidenceBranch
        } | ConvertTo-Json -Depth 4
        Set-Content -LiteralPath (Join-Path (Split-Path -Parent $destination) 'operator-metadata.json') -Value $summary -Encoding utf8NoBOM
        & git.exe -C $repo add -- $relative "dev/test-results/operator-$runId/operator-metadata.json"
        if ($LASTEXITCODE -ne 0) { throw 'Unable to stage operator evidence' }
        & git.exe -C $repo commit --quiet -m "evidence: capture PHX-CI operator output $runId"
        if ($LASTEXITCODE -ne 0) { throw 'Unable to commit operator evidence; Git author identity may be missing' }
        & git.exe -C $repo push origin "HEAD:refs/heads/$evidenceBranch"
        if ($LASTEXITCODE -ne 0) { throw 'GitHub operator-evidence push failed' }
        $published = $true
        $commit = (& git.exe -C $repo rev-parse HEAD).Trim()
        Write-Host "OPERATOR EVIDENCE COMMIT: $commit"
        Write-Host "OPERATOR EVIDENCE BRANCH: $evidenceBranch"
    } catch {
        Write-Warning "OPERATOR EVIDENCE NOT PUBLISHED: $($_.Exception.Message)"
    }
} else {
    Write-Warning 'OPERATOR EVIDENCE NOT PUBLISHED: clone unavailable'
}
Write-Host "PHX-CI EXIT CODE: $(if ($null -eq $phxExit) { 'NOT_STARTED' } else { $phxExit })"
Write-Host "OPERATOR EVIDENCE PUBLISHED: $published"
Write-Host "LOCAL OPERATOR LOG: $log"
if (-not $published -or $null -ne $operatorError -or $null -eq $phxExit -or $phxExit -ne 0) {
    throw 'Operator/PHX-CI execution did not achieve complete success; preserve the printed run root and evidence.'
}
