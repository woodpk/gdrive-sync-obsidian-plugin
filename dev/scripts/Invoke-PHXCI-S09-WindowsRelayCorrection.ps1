# WS-07 DEC-357 Windows SOFTWARE-ONLY PHX-CI operator (replaces retired physical launcher mode).
# Only the installed, exact-pinned PHX-CI may execute software verification.
[CmdletBinding()]
param(
    [string]$RepoRoot = '',
    [string]$ExpectedSourceSha = '',
    [string]$SoftwareOnlyBranch = '',
    [switch]$SoftwareOnlyGovernance
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$script:targetBranch = 'build/bvp-poll-error-observability-20261025'
$script:requiredRuntime = '4cf0c865c7b189641e2acebc0a6ad757b6f01992'
$script:phase = 'INITIALIZATION'
$script:repo = ''
$script:runRoot = ''
$script:phxLog = 'NOT_CREATED'
$script:summaryPath = 'NOT_CREATED'
$script:source = 'NOT_VERIFIED'
$script:base = 'NOT_VERIFIED'
$script:dispatched = $false
$script:phxCode = 'NOT_RUN'
$script:changeSet = 'NOT_RUN'
$script:repositoryStatus = 'NOT_RUN'
$script:overall = 'NOT_RUN'
$script:evidenceCommit = 'NOT_REPORTED'
$script:publication = 'NOT_REPORTED'
$script:status = 'BLOCKED'
$script:exitCode = 1
$script:problems = [Collections.Generic.List[string]]::new()
$script:exceptions = [Collections.Generic.List[string]]::new()

function Add-Problem {
    param([string]$Step, [string]$Detail)
    $script:problems.Add(('[{0}] {1}' -f $Step, $Detail))
}
function Read-GitFact {
    param([string]$Step, [string[]]$Arguments)
    $nativeOutput = @(& git.exe -C $script:repo @Arguments 2>&1)
    $nativeExit = $LASTEXITCODE
    if ($nativeExit -ne 0) {
        Add-Problem -Step $Step -Detail ('git exit {0}: {1}' -f $nativeExit, (($nativeOutput | ForEach-Object { [string]$_ }) -join ' '))
        return $null
    }
    return (($nativeOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine).Trim()
}
function Read-PhxField {
    param([string]$Content, [string]$Label)
    $pattern = '(?m)^' + [regex]::Escape($Label) + ':\s*(.*?)\s*$'
    $found = [regex]::Match($Content, $pattern)
    if ($found.Success) { return $found.Groups[1].Value.Trim() }
    return 'NOT_REPORTED'
}

try {
    do {
        $script:phase = 'WORKSPACE'
        if (-not [string]::IsNullOrEmpty($SoftwareOnlyBranch) -and $SoftwareOnlyBranch -cne $script:targetBranch) {
            Add-Problem -Step $script:phase -Detail 'Only the designated software-only feature branch is supported.'
            break
        }
        if (-not $SoftwareOnlyGovernance) {
            Add-Problem -Step $script:phase -Detail 'Explicit -SoftwareOnlyGovernance is required; physical and recovery paths are unavailable.'
            break
        }
        if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
            Add-Problem -Step $script:phase -Detail 'A disposable RepoRoot must be provided.'
            break
        }
        $script:repo = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
        $script:runRoot = Split-Path -Parent $script:repo
        if ($script:runRoot -cnotmatch '^C:\\temp\\[0-9a-f]{32}$' -or (Split-Path -Leaf $script:repo) -cne 'repo') {
            Add-Problem -Step $script:phase -Detail 'Expected C:\temp\<new-32-hex-GUID>\repo; original checkout is never used.'
            break
        }
        $script:phxLog = Join-Path $script:runRoot 'phxci-console-full.log'
        $script:summaryPath = Join-Path $script:runRoot 'operator-summary.txt'
        if (-not (Test-Path -LiteralPath $script:repo -PathType Container) -or
            $ExpectedSourceSha -cnotmatch '^[a-f0-9]{40}$') {
            Add-Problem -Step $script:phase -Detail 'Repository directory missing or expected source SHA invalid.'
            break
        }
        if (-not (Get-Command git.exe -CommandType Application -ErrorAction SilentlyContinue) -or
            -not (Get-Command pwsh.exe -CommandType Application -ErrorAction SilentlyContinue)) {
            Add-Problem -Step $script:phase -Detail 'Git and PowerShell 7 are required.'
            break
        }

        $script:phase = 'LOCAL_IDENTITY'
        $top = Read-GitFact -Step $script:phase -Arguments @('rev-parse', '--show-toplevel')
        if ($null -eq $top) { break }
        if ([IO.Path]::GetFullPath($top).TrimEnd('\', '/') -ine $script:repo) {
            Add-Problem -Step $script:phase -Detail 'RepoRoot must equal the Git top-level directory.'
            break
        }
        $script:source = Read-GitFact -Step $script:phase -Arguments @('rev-parse', 'HEAD')
        if ($null -eq $script:source) { break }
        if ($script:source -cne $ExpectedSourceSha) {
            Add-Problem -Step $script:phase -Detail ('Source changed from expected HEAD; actual: {0}' -f $script:source)
            break
        }
        $localBranch = Read-GitFact -Step $script:phase -Arguments @('branch', '--show-current')
        if ($null -eq $localBranch) { break }
        if ($localBranch -cne $script:targetBranch) {
            Add-Problem -Step $script:phase -Detail ('Unexpected branch: {0}' -f $localBranch)
            break
        }
        $dirty = Read-GitFact -Step $script:phase -Arguments @('status', '--porcelain=v1', '--untracked-files=all')
        if ($null -eq $dirty) { break }
        if ($dirty.Length -gt 0) {
            Add-Problem -Step $script:phase -Detail 'Disposable checkout is dirty or contains untracked files.'
            break
        }
        $origin = Read-GitFact -Step $script:phase -Arguments @('remote', 'get-url', 'origin')
        if ($null -eq $origin) { break }
        if ($origin -cnotmatch '^https://github\.com/woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$') {
            Add-Problem -Step $script:phase -Detail 'Git origin differs from the approved BRAIN remote.'
            break
        }

        $script:phase = 'REMOTE_IDENTITY'
        $fetchArgs = @('fetch', 'origin', '--prune',
            '+refs/heads/master:refs/remotes/origin/master',
            ('+refs/heads/' + $script:targetBranch + ':refs/remotes/origin/' + $script:targetBranch))
        $fetchOutput = @(& git.exe -C $script:repo @fetchArgs 2>&1)
        $fetchCode = $LASTEXITCODE
        if ($fetchCode -ne 0) {
            Add-Problem -Step $script:phase -Detail ('Git fetch failed with exit {0}: {1}' -f $fetchCode, (($fetchOutput | ForEach-Object { [string]$_ }) -join ' '))
            break
        }
        $remoteHead = Read-GitFact -Step $script:phase -Arguments @('rev-parse', ('refs/remotes/origin/' + $script:targetBranch))
        if ($null -eq $remoteHead) { break }
        if ($remoteHead -cne $ExpectedSourceSha) {
            Add-Problem -Step $script:phase -Detail ('Remote branch moved to {0}; verification not dispatched.' -f $remoteHead)
            break
        }
        $script:base = Read-GitFact -Step $script:phase -Arguments @('rev-parse', 'refs/remotes/origin/master')
        if ($null -eq $script:base -or $script:base -cnotmatch '^[a-f0-9]{40}$') {
            Add-Problem -Step $script:phase -Detail 'Cannot establish origin/master.'
            break
        }

        $script:phase = 'RUNTIME_IDENTITY'
        $config = Get-Content -LiteralPath (Join-Path $script:repo 'phx-ci.json') -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
        if ($config.repositoryIdentity -cne 'woodpk/gdrive-sync-obsidian-plugin' -or
            $config.framework.sha -cne $script:requiredRuntime -or
            $config.framework.pinPolicy -cne 'exact') {
            Add-Problem -Step $script:phase -Detail 'Project configuration does not pin the approved exact runtime.'
            break
        }
        if ([string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
            Add-Problem -Step $script:phase -Detail 'LOCALAPPDATA is missing.'
            break
        }
        $installed = Join-Path $env:LOCALAPPDATA ('PHX-CI\runtimes\' + $script:requiredRuntime)
        $operator = Join-Path $installed 'scripts\Invoke-PhxCi.ps1'
        $manifestPath = Join-Path $installed 'phx-ci-runtime.json'
        if (-not (Test-Path -LiteralPath $operator -PathType Leaf) -or
            -not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
            Add-Problem -Step $script:phase -Detail 'Exact installed PHX-CI operator or manifest is missing.'
            break
        }
        $manifest = Get-Content -LiteralPath $manifestPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
        if ($manifest.sourceCommit -cne $script:requiredRuntime) {
            Add-Problem -Step $script:phase -Detail 'Installed PHX-CI manifest sourceCommit is incorrect.'
            break
        }

        $script:phase = 'PHXCI_EXECUTION'
        # Never permit a physical/recovery selector in this bounded public entrypoint.
        # The child invocation cannot inherit an approval to perform physical effects.
        $env:BRAIN_ARTIFACT_PURPOSE = 'development'
        $env:BVP_CHANGE_CLASS = 'authorized-governance'
        $env:BVP_OWNER_PHYSICAL_APPROVAL = 'NO'
        $env:BVP_EXISTING_MAILBOX_ROOT_CONFIRMED = 'NO'
        $env:BVP_S09A_DUAL_OWNER_APPROVAL = 'NO'
        $env:BVP_IOS_VALIDATION_READY_CONFIRMED = 'NO'
        $pwshPath = (Get-Command pwsh.exe -CommandType Application -ErrorAction Stop).Source
        $invokeArgs = @('-NoLogo', '-NoProfile', '-NonInteractive', '-File', $operator,
            '-RepoRoot', $script:repo, '-Branch', $script:targetBranch,
            '-BaseRef', 'origin/master', '-PublicationMode', 'push',
            '-FocusedTestCommand', 'npm run test:bvp-root', '-TempRoot', $script:runRoot, '-Diagnostic')
        $script:dispatched = $true
        & $pwshPath @invokeArgs *> $script:phxLog
        $script:phxCode = $LASTEXITCODE

        $script:phase = 'PHXCI_RESULT'
        if (-not (Test-Path -LiteralPath $script:phxLog -PathType Leaf)) {
            Add-Problem -Step $script:phase -Detail 'No PHX-CI transcript could be recovered.'
            break
        }
        $outputText = Get-Content -LiteralPath $script:phxLog -Raw -ErrorAction Stop
        $footerAt = $outputText.LastIndexOf('PHX-CI RUN RESULT', [StringComparison]::Ordinal)
        if ($footerAt -lt 0) {
            Add-Problem -Step $script:phase -Detail 'Authoritative PHX-CI footer absent; no verification PASS can be claimed.'
            break
        }
        $footer = $outputText.Substring($footerAt)
        $script:changeSet = Read-PhxField -Content $footer -Label 'Change-set verification'
        $script:repositoryStatus = Read-PhxField -Content $footer -Label 'Repository verification'
        $script:overall = Read-PhxField -Content $footer -Label 'Overall verification'
        $script:evidenceCommit = Read-PhxField -Content $footer -Label 'Evidence commit'
        $script:publication = Read-PhxField -Content $footer -Label 'Evidence published'
        if ($script:phxCode -eq 0 -and $script:changeSet -ceq 'PASS' -and
            $script:repositoryStatus -ceq 'PASS' -and $script:overall -in @('PASS', 'COMPLETE') -and
            $script:publication -ceq 'YES' -and $script:evidenceCommit -cmatch '^[a-f0-9]{40}$') {
            $script:status = 'PASS'
            $script:exitCode = 0
        }
        else {
            Add-Problem -Step $script:phase -Detail 'PHX-CI is not fully PASS with published original evidence; inspect its authoritative result.'
            if ($script:phxCode -is [int] -and $script:phxCode -ne 0) { $script:exitCode = [int]$script:phxCode }
        }
    } while ($false)
}
catch {
    $message = ([string]$_.Exception.Message -replace '[\r\n]+', ' ')
    $script:exceptions.Add(('[{0}] {1}: {2}' -f $script:phase, $_.Exception.GetType().Name, $message))
    $script:status = 'BLOCKED'
    $script:exitCode = 1
}
finally {
    try {
        $report = [Collections.Generic.List[string]]::new()
        $report.Add('========== BRAIN PHX-CI OPERATOR REPORT ==========')
        $report.Add(('STATUS: {0}' -f $script:status))
        $report.Add(('BRANCH: {0}' -f $script:targetBranch))
        $report.Add(('EXPECTED SOURCE: {0}' -f $ExpectedSourceSha))
        $report.Add(('OBSERVED SOURCE: {0}' -f $script:source))
        $report.Add(('MASTER TIP: {0}' -f $script:base))
        $report.Add(('RUNTIME SHA: {0}' -f $script:requiredRuntime))
        $report.Add(('PHX-CI STARTED: {0}' -f $script:dispatched))
        $report.Add(('PHX-CI EXIT: {0}' -f $script:phxCode))
        $report.Add(('CHANGE-SET: {0}' -f $script:changeSet))
        $report.Add(('REPOSITORY: {0}' -f $script:repositoryStatus))
        $report.Add(('OVERALL: {0}' -f $script:overall))
        $report.Add(('EVIDENCE COMMIT: {0}' -f $script:evidenceCommit))
        $report.Add(('EVIDENCE PUBLISHED: {0}' -f $script:publication))
        $report.Add(('RECORDED PROBLEMS: {0}' -f $script:problems.Count))
        for ($i = 0; $i -lt $script:problems.Count; $i++) { $report.Add(('  {0}. {1}' -f ($i + 1), $script:problems[$i])) }
        $report.Add(('CAUGHT EXCEPTIONS: {0}' -f $script:exceptions.Count))
        for ($i = 0; $i -lt $script:exceptions.Count; $i++) { $report.Add(('  {0}. {1}' -f ($i + 1), $script:exceptions[$i])) }
        if ($script:problems.Count -eq 0 -and $script:exceptions.Count -eq 0) { $report.Add('ERROR DETAILS: NONE') }
        $report.Add(('COMPLETE PHX-CI LOG: {0}' -f $script:phxLog))
        $report.Add(('PRESERVED WORKSPACE: {0}' -f $script:runRoot))
        $report.Add('PHYSICAL DISPATCH: DISABLED')
        $report.Add('NEXT STEP: If BLOCKED, inspect original PHX-CI evidence; only PASS permits Reviewer handoff.')
        $report.Add('===================================================')
        if ($script:summaryPath -ne 'NOT_CREATED') {
            try { [IO.File]::WriteAllLines($script:summaryPath, [string[]]$report) }
            catch { $report.Add(('SUMMARY FILE ERROR: {0}' -f $_.Exception.Message)) }
        }
        foreach ($line in $report) { [Console]::Out.WriteLine($line) }
    }
    catch {
        try { [Console]::Out.WriteLine(('BRAIN OPERATOR REPORT FAILED: {0}; execution BLOCKED' -f $_.Exception.Message)) }
        catch { }
        $script:exitCode = 1
    }
}
exit $script:exitCode
