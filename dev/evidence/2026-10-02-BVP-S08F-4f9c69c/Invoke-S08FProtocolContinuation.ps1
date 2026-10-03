[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RepositoryRoot,
    [Parameter(Mandatory = $true)][string]$Branch,
    [Parameter(Mandatory = $true)][string]$CandidateSha,
    [string]$VaultPath = 'D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b',
    [int]$DebugPort = 63311
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$evidenceRelative = 'dev/evidence/2026-10-02-BVP-S08F-4f9c69c'
$sourceCommit = 'e1067f5159a316f328c492837b8c6ff59e08d226'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('brain-s08f-' + [guid]::NewGuid().ToString('N'))
$worktree = Join-Path $tempRoot 'w'
$helper = Join-Path $tempRoot 's08f-physical-canary.mjs'
$results = [System.Collections.Generic.List[object]]::new()
$overall = 'BLOCKED'
$evidenceCommit = ''
$preserve = $true
$physicalExit = $null
$git = $null
$node = $null
$npm = $null
$script:nativePathOverride = $null

function Add-Result {
    param(
        [string]$Stage,
        [ValidateSet('PASS','FAIL','BLOCKED','SKIPPED','INDETERMINATE')][string]$Status,
        [string]$Command,
        [AllowNull()][Nullable[int]]$ExitCode,
        [string]$Classification,
        [string]$Summary,
        [AllowNull()][string]$Evidence
    )
    [void]$results.Add([pscustomobject]@{
        stage = $Stage
        status = $Status
        command = $Command
        exitCode = $ExitCode
        classification = $Classification
        summary = $Summary
        evidence = $Evidence
    })
    Write-Host ('[{0}] {1}: {2}' -f $Status,$Stage,$Summary)
}

function Invoke-Native {
    param([string]$File,[string[]]$Arguments,[string]$WorkingDirectory = $RepositoryRoot)
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $File
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    if (-not [string]::IsNullOrWhiteSpace([string]$script:nativePathOverride)) {
        $psi.Environment['PATH'] = $script:nativePathOverride
    }
    foreach ($argument in $Arguments) { [void]$psi.ArgumentList.Add($argument) }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    return [pscustomobject]@{
        exitCode = $process.ExitCode
        stdout = $stdoutTask.GetAwaiter().GetResult()
        stderr = $stderrTask.GetAwaiter().GetResult()
        command = $File + ' ' + ($Arguments -join ' ')
    }
}

function Remote-Head {
    param([string]$Git)
    $result = Invoke-Native -File $Git -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch))
    if ($result.exitCode -ne 0) { return $null }
    return $result.stdout.Trim()
}

function Changed-Paths {
    param([string]$Git)
    $tracked = Invoke-Native -File $Git -Arguments @('-C',$worktree,'diff','--name-only')
    $untracked = Invoke-Native -File $Git -Arguments @('-C',$worktree,'ls-files','--others','--exclude-standard')
    $items = @()
    if ($tracked.exitCode -eq 0) { $items += @($tracked.stdout.Split([Environment]::NewLine,[System.StringSplitOptions]::RemoveEmptyEntries)) }
    if ($untracked.exitCode -eq 0) { $items += @($untracked.stdout.Split([Environment]::NewLine,[System.StringSplitOptions]::RemoveEmptyEntries)) }
    return @($items | Sort-Object -Unique)
}

try {
    Write-Host '============================================================'
    Write-Host 'S08F PROTOCOL CONTINUATION HARNESS'
    Write-Host '============================================================'
    Write-Host ('Candidate: {0}' -f $CandidateSha)
    Write-Host ('Disposable vault: {0}' -f $VaultPath)
    Write-Host ('Diagnostic root: {0}' -f $tempRoot)

    $git = Get-Command git -ErrorAction SilentlyContinue
    $node = Get-Command node -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
    $ready = $null -ne $git -and $null -ne $node -and $null -ne $npm
    if ($ready) {
        $pathParts = [System.Collections.Generic.List[string]]::new()
        foreach ($candidatePath in @(
            (Split-Path -Parent $node.Source),
            (Split-Path -Parent $git.Source),
            (Join-Path $env:SystemRoot 'System32'),
            $env:SystemRoot,
            (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0')
        )) {
            if (-not [string]::IsNullOrWhiteSpace([string]$candidatePath) -and (Test-Path -LiteralPath $candidatePath -PathType Container) -and -not $pathParts.Contains($candidatePath)) {
                [void]$pathParts.Add($candidatePath)
            }
        }
        $script:nativePathOverride = $pathParts -join [System.IO.Path]::PathSeparator
    }

    if (-not $ready) {
        Add-Result 'toolchain' 'BLOCKED' 'Get-Command git,node,npm' $null 'ENVIRONMENT FAILURE' 'Required Git/Node/npm toolchain is unavailable.' $null
    } else {
        $nodeVersion = Invoke-Native $node.Source @('--version')
        $webSocket = Invoke-Native $node.Source @('-e','process.stdout.write(typeof WebSocket)')
        if ($nodeVersion.exitCode -eq 0 -and $webSocket.exitCode -eq 0 -and $webSocket.stdout.Trim() -eq 'function') {
            Add-Result 'toolchain' 'PASS' ($nodeVersion.command + ' ; ' + $webSocket.command) 0 'TOOLCHAIN READY' ('Node {0}; WebSocket available; controlled child PATH established.' -f $nodeVersion.stdout.Trim()) $script:nativePathOverride
        } else {
            $ready = $false
            Add-Result 'toolchain' 'BLOCKED' ($nodeVersion.command + ' ; ' + $webSocket.command) $webSocket.exitCode 'ENVIRONMENT FAILURE' 'Node WebSocket runtime requirement is not satisfied.' ($nodeVersion.stderr + $webSocket.stderr)
        }
    }

    if ($ready -and (Test-Path -LiteralPath $RepositoryRoot -PathType Container)) {
        $fetch = Invoke-Native $git.Source @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune')
        $remote = if ($fetch.exitCode -eq 0) { Remote-Head $git.Source } else { $null }
        if ($fetch.exitCode -eq 0 -and $remote -eq $CandidateSha) {
            $dirty = Invoke-Native $git.Source @('-C',$RepositoryRoot,'status','--porcelain=v1','--untracked-files=all')
            Add-Result 'repository-identity' 'PASS' $fetch.command 0 'EXACT SOURCE IDENTITY' ('Remote task branch is exactly {0}; control-checkout dirtiness is non-authoritative.' -f $CandidateSha) $dirty.stdout.Trim()
        } else {
            $ready = $false
            Add-Result 'repository-identity' 'BLOCKED' $fetch.command $fetch.exitCode 'REPOSITORY-STATE FAILURE' ('Expected remote HEAD {0}; observed {1}.' -f $CandidateSha,$remote) $fetch.stderr.Trim()
        }
    } elseif ($ready) {
        $ready = $false
        Add-Result 'repository-identity' 'BLOCKED' ('Test-Path ' + $RepositoryRoot) $null 'REPOSITORY-STATE FAILURE' 'Repository root is unavailable.' $null
    }

    if ($ready) {
        $required = @($evidenceRelative + '/Invoke-S08FProtocolContinuation.ps1')
        foreach ($index in 1..5) { $required += ($evidenceRelative + '/s08f-physical-canary.part' + $index + '.mjs.txt') }
        $missing = @()
        foreach ($item in $required) {
            $probe = Invoke-Native $git.Source @('-C',$RepositoryRoot,'cat-file','-e',($CandidateSha + ':' + $item))
            if ($probe.exitCode -ne 0) { $missing += $item }
        }
        if ($missing.Count -eq 0) {
            Add-Result 'required-artifacts' 'PASS' 'git cat-file -e candidate:path' 0 'HARNESS ARTIFACTS PRESENT' 'Harness and all five helper fragments are present at the candidate SHA.' $null
        } else {
            $ready = $false
            Add-Result 'required-artifacts' 'BLOCKED' 'git cat-file -e candidate:path' 1 'EVIDENCE FAILURE' ('Missing: ' + ($missing -join ', ')) $null
        }
    }

    if ($ready) {
        [void][System.IO.Directory]::CreateDirectory($tempRoot)
        $addWorktree = Invoke-Native $git.Source @('-C',$RepositoryRoot,'worktree','add','--detach',$worktree,$CandidateSha)
        if ($addWorktree.exitCode -eq 0) {
            Add-Result 'disposable-worktree' 'PASS' $addWorktree.command 0 'DISPOSABLE EXACT-SHA WORKTREE' ('Created {0}.' -f $worktree) $worktree
        } else {
            $ready = $false
            Add-Result 'disposable-worktree' 'BLOCKED' $addWorktree.command $addWorktree.exitCode 'REPOSITORY-STATE FAILURE' 'Unable to create the disposable exact-SHA worktree.' $addWorktree.stderr.Trim()
        }
    }

    if ($ready) {
        $npmVersion = Invoke-Native $npm.Source @('--version') $worktree
        $npmRegistry = Invoke-Native $npm.Source @('config','get','registry') $worktree
        $lockCheckScript = "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));const l=JSON.parse(fs.readFileSync('package-lock.json','utf8'));const r=l.packages&&l.packages[''];let code=0;if(!r){console.error('package-lock root package missing');code=31}else if(JSON.stringify(p.devDependencies||{})!==JSON.stringify(r.devDependencies||{})){console.error('root devDependencies differ between package.json and package-lock.json');code=32}else{const m=l.packages&&l.packages['node_modules/moment'];if(p.overrides&&p.overrides.moment&&(!m||m.version!==p.overrides.moment)){console.error('moment override mismatch');code=33}};if(code===0)console.log('lockfileVersion='+l.lockfileVersion+' root-devDependencies=match');process.exitCode=code"
        $lockCheck = Invoke-Native $node.Source @('-e',$lockCheckScript) $worktree
        if ($npmVersion.exitCode -eq 0 -and $npmRegistry.exitCode -eq 0 -and $lockCheck.exitCode -eq 0) {
            Add-Result 'dependency-preflight' 'PASS' 'npm --version ; npm config get registry ; static package-lock consistency' 0 'DEPENDENCY CONFIG READY' ('npm {0}; registry {1}; lock/package root consistency passed.' -f $npmVersion.stdout.Trim(),$npmRegistry.stdout.Trim()) $lockCheck.stdout.Trim()
        } else {
            Add-Result 'dependency-preflight' 'FAIL' 'npm --version ; npm config get registry ; static package-lock consistency' 1 'DEPENDENCY CONFIGURATION FAILURE' 'Independent dependency preflight found a tool/config/lockfile problem.' ($npmVersion.stdout + $npmVersion.stderr + $npmRegistry.stdout + $npmRegistry.stderr + $lockCheck.stdout + $lockCheck.stderr)
        }
        $install = Invoke-Native $npm.Source @('ci','--no-audit','--no-fund','--loglevel','verbose') $worktree
        if ($install.exitCode -eq 0) {
            Add-Result 'dependencies' 'PASS' $install.command 0 'DEPENDENCIES READY' 'npm ci completed in the disposable worktree.' $null
        } else {
            $ready = $false
            Add-Result 'dependencies' 'FAIL' $install.command $install.exitCode 'DEPENDENCY FAILURE' 'npm ci failed.' ($install.stdout + $install.stderr)
        }
    } else {
        Add-Result 'dependencies' 'BLOCKED' 'npm ci --no-audit --no-fund' $null 'UPSTREAM PREREQUISITE BLOCKED' 'Dependency installation was blocked.' $null
    }

    if ($ready) {
        $compile = Invoke-Native $node.Source @('node_modules/typescript/bin/tsc','-p','test-platform/tsconfig.json') $worktree
        if ($compile.exitCode -eq 0) {
            Add-Result 'focused-compile' 'PASS' $compile.command 0 'FOCUSED COMPILE PASS' 'Accepted S08 test-platform sources compile.' $compile.stdout.Trim()
        } else {
            $ready = $false
            Add-Result 'focused-compile' 'FAIL' $compile.command $compile.exitCode 'VERIFICATION-HARNESS DEFECT' 'S08 test-platform compile failed.' ($compile.stdout + $compile.stderr)
        }
    } else {
        Add-Result 'focused-compile' 'BLOCKED' 'node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json' $null 'UPSTREAM PREREQUISITE BLOCKED' 'Focused compile was blocked.' $null
    }

    if ($ready) {
        $builder = [System.Text.StringBuilder]::new()
        foreach ($index in 1..5) {
            $part = Join-Path (Join-Path $worktree $evidenceRelative) ('s08f-physical-canary.part' + $index + '.mjs.txt')
            [void]$builder.AppendLine([System.IO.File]::ReadAllText($part))
        }
        [System.IO.File]::WriteAllText($helper,$builder.ToString(),[System.Text.UTF8Encoding]::new($false))
        $syntax = Invoke-Native $node.Source @('--check',$helper) $worktree
        $self = if ($syntax.exitCode -eq 0) { Invoke-Native $node.Source @($helper,'--self-check') $worktree } else { $null }
        if ($syntax.exitCode -eq 0 -and $null -ne $self -and $self.exitCode -eq 0) {
            Add-Result 'harness-self-review' 'PASS' ($syntax.command + ' ; ' + $self.command) 0 'HARNESS SELF-REVIEW PASS' 'Assembled helper passed syntax and bootstrap self-checks.' $self.stdout.Trim()
        } else {
            $ready = $false
            $code = if ($syntax.exitCode -ne 0) { $syntax.exitCode } elseif ($null -ne $self) { $self.exitCode } else { 1 }
            $detail = $syntax.stdout + $syntax.stderr
            if ($null -ne $self) { $detail += $self.stdout + $self.stderr }
            Add-Result 'harness-self-review' 'FAIL' 'node --check helper ; node helper --self-check' $code 'VERIFICATION-HARNESS DEFECT' 'Physical helper failed its pre-execution self-review.' $detail
        }
    } else {
        Add-Result 'harness-self-review' 'BLOCKED' 'node --check helper ; node helper --self-check' $null 'UPSTREAM PREREQUISITE BLOCKED' 'Harness self-review was blocked.' $null
    }

    if ($ready) {
        $evidenceDir = Join-Path $worktree $evidenceRelative
        $physical = Invoke-Native $node.Source @(
            $helper,'--vault',$VaultPath,'--worktree',$worktree,'--evidence-dir',$evidenceDir,
            '--debug-port',[string]$DebugPort,'--source-commit',$sourceCommit,'--branch-head',$CandidateSha
        ) $worktree
        $physicalExit = $physical.exitCode
        if ($physical.stdout) { Write-Host $physical.stdout.TrimEnd() }
        if ($physical.stderr) { Write-Warning $physical.stderr.TrimEnd() }
        if ($physical.exitCode -eq 0) {
            Add-Result 'physical-canary' 'PASS' $physical.command 0 'PHYSICAL CANARY COMPLETE' 'Lifecycle-aware S08F retry completed canary, cleanup, safety proof, evidence capture, and production-bundle restoration.' $physical.stdout.Trim()
        } elseif ($physical.exitCode -eq 20) {
            Add-Result 'physical-canary' 'BLOCKED' $physical.command 20 'PHYSICAL CANARY BLOCKED' 'Physical helper stopped safely at a blocking condition.' ($physical.stdout + $physical.stderr)
        } else {
            Add-Result 'physical-canary' 'FAIL' $physical.command $physical.exitCode 'PHYSICAL CANARY FAILURE' 'Physical helper demonstrated a canary or harness failure.' ($physical.stdout + $physical.stderr)
        }
    } else {
        Add-Result 'physical-canary' 'BLOCKED' 'node repository-controlled-S08F-helper' $null 'UPSTREAM PREREQUISITE BLOCKED' 'Physical mutation was not attempted.' $null
    }

    if (Test-Path -LiteralPath $worktree -PathType Container) {
        $changes = @(Changed-Paths $git.Source)
        $unexpected = @($changes | Where-Object { -not $_.Replace('\','/').StartsWith($evidenceRelative + '/') })
        if ($unexpected.Count -eq 0) {
            Add-Result 'repository-mutation-audit' 'PASS' 'git diff --name-only ; git ls-files --others --exclude-standard' 0 'AUTHORIZED EVIDENCE-ONLY MUTATION' 'All worktree changes are confined to the authorized S08F evidence root.' ($changes -join [Environment]::NewLine)
        } else {
            Add-Result 'repository-mutation-audit' 'FAIL' 'git diff --name-only ; git ls-files --others --exclude-standard' 1 'REPOSITORY-STATE FAILURE' ('Unexpected paths: ' + ($unexpected -join ', ')) ($changes -join [Environment]::NewLine)
        }
    } else {
        Add-Result 'repository-mutation-audit' 'BLOCKED' 'git diff --name-only ; git ls-files --others --exclude-standard' $null 'UPSTREAM PREREQUISITE BLOCKED' 'No disposable worktree exists to audit.' $null
    }

    $auditPass = @($results | Where-Object { $_.stage -eq 'repository-mutation-audit' -and $_.status -eq 'PASS' }).Count -eq 1
    if ($auditPass -and (Test-Path -LiteralPath $worktree -PathType Container)) {
        $changes = @(Changed-Paths $git.Source)
        if ($changes.Count -gt 0) {
            $refresh = Invoke-Native $git.Source @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune')
            $remote = if ($refresh.exitCode -eq 0) { Remote-Head $git.Source } else { $null }
            if ($refresh.exitCode -eq 0 -and $remote -eq $CandidateSha) {
                $add = Invoke-Native $git.Source @('-C',$worktree,'add','--',$evidenceRelative)
                $message = if ($physicalExit -eq 0) { 'test(bvp): record S08F lifecycle-aware physical canary evidence' } else { 'test(bvp): record S08F lifecycle-aware blocked physical evidence' }
                $commit = if ($add.exitCode -eq 0) { Invoke-Native $git.Source @('-C',$worktree,'commit','-m',$message) } else { $null }
                $head = if ($null -ne $commit -and $commit.exitCode -eq 0) { Invoke-Native $git.Source @('-C',$worktree,'rev-parse','HEAD') } else { $null }
                $push = if ($null -ne $head -and $head.exitCode -eq 0) { Invoke-Native $git.Source @('-C',$worktree,'push','origin',('HEAD:refs/heads/' + $Branch)) } else { $null }
                if ($null -ne $push -and $push.exitCode -eq 0) {
                    $evidenceCommit = $head.stdout.Trim()
                    Add-Result 'evidence-publication' 'PASS' 'git add/commit/push S08F evidence' 0 'EVIDENCE COMMIT PUBLISHED' ('Published evidence commit {0}.' -f $evidenceCommit) $evidenceCommit
                } else {
                    $detail = ''
                    foreach ($item in @($add,$commit,$head,$push)) { if ($null -ne $item) { $detail += $item.stdout + $item.stderr } }
                    Add-Result 'evidence-publication' 'FAIL' 'git add/commit/push S08F evidence' 1 'EVIDENCE FAILURE' 'Could not deterministically publish physical evidence.' $detail
                }
            } else {
                Add-Result 'evidence-publication' 'BLOCKED' 'git fetch/rev-parse before evidence push' $refresh.exitCode 'REPOSITORY-STATE FAILURE' ('Branch drift before publication. Expected {0}; observed {1}.' -f $CandidateSha,$remote) $refresh.stderr.Trim()
            }
        } else {
            Add-Result 'evidence-publication' 'SKIPPED' 'git add/commit/push S08F evidence' 0 'NO EVIDENCE MUTATION' 'No evidence changes were produced.' $null
        }
    } else {
        Add-Result 'evidence-publication' 'BLOCKED' 'git add/commit/push S08F evidence' $null 'UPSTREAM PREREQUISITE BLOCKED' 'Evidence publication was blocked by mutation-audit state.' $null
    }

    $physicalPass = @($results | Where-Object { $_.stage -eq 'physical-canary' -and $_.status -eq 'PASS' }).Count -eq 1
    $publishPass = @($results | Where-Object { $_.stage -eq 'evidence-publication' -and $_.status -eq 'PASS' }).Count -eq 1
    $hasFail = @($results | Where-Object { $_.status -eq 'FAIL' }).Count -gt 0
    $hasBlocked = @($results | Where-Object { $_.status -eq 'BLOCKED' }).Count -gt 0

    if ($physicalPass -and $publishPass -and -not $hasFail -and -not $hasBlocked) {
        $overall = 'READY FOR LOCAL PHX-CI VERIFICATION'
        $preserve = $false
    } elseif ($hasFail) {
        $overall = 'FAIL'
    } else {
        $overall = 'BLOCKED'
    }
} catch {
    $overall = 'HARNESS ERROR'
    Add-Result 'harness-terminal' 'FAIL' '<internal harness>' $null 'VERIFICATION-HARNESS DEFECT' 'Unexpected exception was converted into HARNESS ERROR.' $_.Exception.ToString()
} finally {
    if (-not $preserve -and (Test-Path -LiteralPath $worktree -PathType Container) -and $null -ne $git) {
        $cleanup = Invoke-Native $git.Source @('-C',$RepositoryRoot,'worktree','remove','--force',$worktree)
        if ($cleanup.exitCode -eq 0) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            $preserve = $true
            $overall = 'FAIL'
            Add-Result 'cleanup' 'FAIL' $cleanup.command $cleanup.exitCode 'REPOSITORY-STATE FAILURE' 'Disposable worktree cleanup failed; workspace retained.' $cleanup.stderr.Trim()
        }
    }

    Write-Host ''
    Write-Host '============================================================'
    Write-Host 'S08F PROTOCOL CONTINUATION RESULT'
    Write-Host '============================================================'
    foreach ($result in $results) {
        Write-Host ('{0,-28} {1,-13} {2}' -f $result.stage,$result.status,$result.classification)
        Write-Host ('  Summary: {0}' -f $result.summary)
        Write-Host ('  Command: {0}' -f $result.command)
        Write-Host ('  Exit: {0}' -f $(if ($null -eq $result.exitCode) { '<none>' } else { $result.exitCode }))
        if ($result.status -ne 'PASS' -and -not [string]::IsNullOrWhiteSpace([string]$result.evidence)) {
            Write-Host '  Evidence:'
            Write-Host ([string]$result.evidence)
        }
    }
    Write-Host '------------------------------------------------------------'
    Write-Host ('OVERALL: {0}' -f $overall)
    Write-Host ('VERIFIED SOURCE: {0}' -f $CandidateSha)
    Write-Host ('EVIDENCE COMMIT: {0}' -f $(if ($evidenceCommit) { $evidenceCommit } else { '<none>' }))
    Write-Host ('DIAGNOSTIC WORKSPACE: {0}' -f $(if ($preserve) { $tempRoot } else { '<cleaned>' }))
    Write-Host '------------------------------------------------------------'
    if ($overall -eq 'READY FOR LOCAL PHX-CI VERIFICATION') {
        Write-Host 'Recommended next action: run authoritative local PHX-CI against the published evidence commit.'
        [Environment]::ExitCode = 0
    } elseif ($overall -eq 'BLOCKED') {
        Write-Host 'Recommended next action: diagnose the reported blocking stage; do not replay a failed sequence.'
        [Environment]::ExitCode = 20
    } else {
        Write-Host 'Recommended next action: repair the demonstrated owning defect before further physical mutation.'
        [Environment]::ExitCode = 21
    }
    Write-Host '============================================================'
    $finalExitCode = if ($overall -eq 'READY FOR LOCAL PHX-CI VERIFICATION') { 0 } elseif ($overall -eq 'BLOCKED') { 20 } else { 21 }
}
exit $finalExitCode
