[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RepositoryRoot,
    [Parameter(Mandatory = $true)][string]$Branch,
    [Parameter(Mandatory = $true)][string]$CandidateSha
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$VerificationBase = '39cf1ff62fb927aba9d2ee49f99724d9ce1f2856'
$EvidenceRel = 'dev/evidence/2026-10-02-BVP-S08F-4f9c69c'
$TaskRel = 'dev/agents/st2a/ph6/05-bvp/08-thin-live-device-agent-production-receipt-comman/08f-desktop-live-canary-and-production-bundle-isolation-proof.md'
$SourceRel = 'src/drive/google-drive-port.ts'
$TestRel = 'test/workstreams/drive/phase6-remote-protocol.test.ts'
$VerifierRel = $EvidenceRel + '/Invoke-S08FPrerequisiteVerification.ps1'
$PassJsonRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.json'
$PassMdRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.md'
$PassLogRel = $EvidenceRel + '/S08F-PREREQ-VERIFY.log'
$FailJsonRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-FAIL.json'
$FailMdRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-FAIL.md'

$ArtifactRebindTestRel = 'test-platform/test/s08b-validation-build-entrypoint.test.ts'
$AllowedChangedPaths = @($TaskRel, $SourceRel, $TestRel, $VerifierRel, $ArtifactRebindTestRel)
$SourceDiffCheckPaths = @($TaskRel, $SourceRel, $TestRel, $VerifierRel, $ArtifactRebindTestRel)
$RequiredVerificationStageNames = @(
    'toolchain',
    'rerun-recognition-self-check',
    'repository-identity',
    'change-scope',
    'defect-causality',
    'disposable-worktree',
    'dependencies',
    'typecheck',
    'product-test-compile',
    'focused-folder-recovery',
    'complete-product-suite',
    'bvp-compile',
    'complete-bvp-suite',
    'architecture-guard',
    'architecture-metrics',
    'repository-check',
    'production-build',
    'production-artifact',
    'validation-artifact-build',
    'validation-artifact',
    'repository-mutation-audit'
)

$Stages = [System.Collections.Generic.List[object]]::new()
$Log = [System.Text.StringBuilder]::new()
$NativePathOverride = $null
$GitPath = $null
$NodePath = $null
$NpmPath = $null
$PwshPath = $null
$WorktreeCreated = $false
$EvidenceCommit = $null
$ExistingEvidenceCommit = $null
$ExistingEvidence = $null
$ProductionArtifact = $null
$ValidationArtifact = $null
$AlreadyVerified = $false
$HarnessError = $null
$FinalOverall = 'FAIL'

$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('brain-s08f-prereq-' + [guid]::NewGuid().ToString('N'))
$Worktree = Join-Path $TempRoot 'worktree'
$LocalReportDir = Join-Path $TempRoot 'report'
$LocalJson = Join-Path $LocalReportDir 'result.json'
$LocalMd = Join-Path $LocalReportDir 'result.md'
$LocalLog = Join-Path $LocalReportDir 'result.log'

function Write-LogLine {
    param([string]$Text = '')
    Write-Host $Text
    [void]$script:Log.AppendLine($Text)
}

function Add-Stage {
    param(
        [string]$Name,
        [ValidateSet('PASS','FAIL','BLOCKED','SKIPPED','INDETERMINATE')][string]$Status,
        [string]$Classification,
        [string]$Summary,
        [string]$Command = '',
        [Nullable[int]]$ExitCode = $null,
        [object]$Evidence = $null
    )
    $entry = [pscustomobject]@{
        name = $Name
        status = $Status
        classification = $Classification
        summary = $Summary
        command = $Command
        exitCode = $ExitCode
        evidence = $Evidence
    }
    $script:Stages.Add($entry)
    Write-LogLine ('[{0}] {1}: {2}' -f $Status, $Name, $Summary)
    return $entry
}

function Get-Stage {
    param([string]$Name)
    return @($script:Stages | Where-Object { $_.name -eq $Name } | Select-Object -Last 1)
}

function Stage-Passed {
    param([string]$Name)
    $stage = @(Get-Stage $Name)
    return $stage.Count -eq 1 -and $stage[0].status -eq 'PASS'
}

function Has-BlockingResult {
    return @($script:Stages | Where-Object { $_.status -in @('FAIL','BLOCKED','INDETERMINATE') }).Count -gt 0
}

function Invoke-Native {
    param(
        [string]$File,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [hashtable]$Environment = @{}
    )

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $File
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    if (-not [string]::IsNullOrWhiteSpace([string]$script:NativePathOverride)) {
        $psi.Environment['PATH'] = $script:NativePathOverride
    }
    foreach ($key in @($Environment.Keys)) {
        $psi.Environment[[string]$key] = [string]$Environment[$key]
    }
    foreach ($argument in @($Arguments)) {
        [void]$psi.ArgumentList.Add([string]$argument)
    }

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()

    return [pscustomobject]@{
        exitCode = [int]$process.ExitCode
        stdout = $stdoutTask.GetAwaiter().GetResult()
        stderr = $stderrTask.GetAwaiter().GetResult()
        command = $File + ' ' + (@($Arguments) -join ' ')
    }
}

function Write-NativeResult {
    param([object]$Result)
    if (-not [string]::IsNullOrEmpty([string]$Result.stdout)) {
        $Result.stdout.TrimEnd() -split '\r?\n' | ForEach-Object { Write-LogLine ([string]$_) }
    }
    if (-not [string]::IsNullOrEmpty([string]$Result.stderr)) {
        $Result.stderr.TrimEnd() -split '\r?\n' | ForEach-Object { Write-LogLine ([string]$_) }
    }
}

function Invoke-ProcessStage {
    param(
        [string]$Name,
        [string]$Classification,
        [string]$File,
        [string[]]$Arguments,
        [string]$WorkingDirectory,
        [bool]$Enabled = $true,
        [string]$BlockedReason = 'A required prerequisite did not pass.',
        [hashtable]$Environment = @{}
    )

    $commandText = $File + ' ' + (@($Arguments) -join ' ')
    if (-not $Enabled) {
        Add-Stage -Name $Name -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary $BlockedReason -Command $commandText | Out-Null
        return 125
    }

    Write-LogLine
    Write-LogLine ('===== {0} =====' -f $Name.ToUpperInvariant())
    Write-LogLine ('Command: {0}' -f $commandText)

    try {
        $result = Invoke-Native -File $File -Arguments $Arguments -WorkingDirectory $WorkingDirectory -Environment $Environment
        Write-NativeResult $result
        if ($result.exitCode -eq 0) {
            Add-Stage -Name $Name -Status 'PASS' -Classification $Classification -Summary 'Stage completed successfully.' -Command $commandText -ExitCode 0 | Out-Null
        } else {
            Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('Stage failed with exit code {0}.' -f $result.exitCode) -Command $commandText -ExitCode $result.exitCode | Out-Null
        }
        return [int]$result.exitCode
    } catch {
        Add-Stage -Name $Name -Status 'INDETERMINATE' -Classification 'HARNESS PROCESS ERROR' -Summary $_.Exception.Message -Command $commandText | Out-Null
        return 126
    }
}

function Invoke-TestTreeStage {
    param(
        [string]$Name,
        [string]$Classification,
        [string]$Root,
        [bool]$Enabled,
        [string]$BlockedReason
    )

    if (-not $Enabled) {
        Add-Stage -Name $Name -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary $BlockedReason | Out-Null
        return 125
    }
    if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
        Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('Compiled test root is missing: ' + $Root) | Out-Null
        return 126
    }

    $files = @([System.IO.Directory]::EnumerateFiles($Root, '*.test.js', [System.IO.SearchOption]::AllDirectories) | Sort-Object)
    if ($files.Count -eq 0) {
        Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('No compiled test files were found under ' + $Root) | Out-Null
        return 127
    }

    Write-LogLine
    Write-LogLine ('===== {0} =====' -f $Name.ToUpperInvariant())
    Write-LogLine ('Discovered test files: {0}' -f $files.Count)

    $batchSize = 40
    $batchCount = [int][Math]::Ceiling($files.Count / [double]$batchSize)
    $failures = [System.Collections.Generic.List[object]]::new()

    for ($offset = 0; $offset -lt $files.Count; $offset += $batchSize) {
        $last = [Math]::Min($offset + $batchSize - 1, $files.Count - 1)
        $batch = @($files[$offset..$last])
        $batchNumber = [int]($offset / $batchSize) + 1
        Write-LogLine ('--- batch {0}/{1}: {2} files ---' -f $batchNumber, $batchCount, $batch.Count)
        try {
            $result = Invoke-Native -File $script:NodePath -Arguments (@('--test') + $batch) -WorkingDirectory $script:Worktree
            Write-NativeResult $result
            if ($result.exitCode -ne 0) {
                $failures.Add([pscustomobject]@{
                    batch = $batchNumber
                    exitCode = $result.exitCode
                    files = $batch
                })
            }
        } catch {
            $failures.Add([pscustomobject]@{
                batch = $batchNumber
                exitCode = 126
                files = $batch
                error = $_.Exception.Message
            })
            Write-LogLine ('HARNESS PROCESS ERROR: ' + $_.Exception.Message)
        }
    }

    if ($failures.Count -eq 0) {
        Add-Stage -Name $Name -Status 'PASS' -Classification $Classification -Summary ('All {0} compiled test files passed across {1} batch(es).' -f $files.Count, $batchCount) -ExitCode 0 -Evidence ([pscustomobject]@{ testFileCount = $files.Count; batchCount = $batchCount }) | Out-Null
        return 0
    }

    Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('{0} of {1} test batch(es) failed; all batches were attempted.' -f $failures.Count, $batchCount) -ExitCode 1 -Evidence ([pscustomobject]@{ testFileCount = $files.Count; batchCount = $batchCount; failedBatches = @($failures) }) | Out-Null
    return 1
}

function Get-Sha256 {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Convert-StagesForReport {
    return @($script:Stages | ForEach-Object {
        [ordered]@{
            name = $_.name
            status = $_.status
            classification = $_.classification
            summary = $_.summary
            command = $_.command
            exitCode = $_.exitCode
            evidence = $_.evidence
        }
    })
}

function Test-CanonicalPassReport {
    param([object]$Report)

    $reasons = [System.Collections.Generic.List[string]]::new()
    if ($null -eq $Report) { $reasons.Add('report-missing'); return [pscustomobject]@{ ok=$false; reasons=@($reasons) } }
    if ([int]$Report.schemaVersion -ne 2) { $reasons.Add('schema-version') }
    if ([string]$Report.overall -ne 'PASS') { $reasons.Add('overall') }
    if ([string]$Report.verificationBase -ne $VerificationBase) { $reasons.Add('verification-base') }
    if ([string]$Report.candidateSha -ne $CandidateSha) { $reasons.Add('candidate-sha') }
    if ([string]$Report.branch -ne $Branch) { $reasons.Add('branch') }
    if ($Report.physicalMutationAttempted -ne $false) { $reasons.Add('physical-mutation-flag') }

    $stages = @($Report.stages)
    foreach ($requiredName in $RequiredVerificationStageNames) {
        $matches = @($stages | Where-Object { [string]$_.name -eq $requiredName })
        if ($matches.Count -ne 1 -or [string]$matches[0].status -ne 'PASS') {
            $reasons.Add('required-stage:' + $requiredName)
        }
    }

    $production = $Report.productionArtifact
    if ($null -eq $production) {
        $reasons.Add('production-artifact-missing')
    } else {
        $productionHash = [string]$production.sha256
        if ([int64]$production.sizeBytes -le 0 -or $productionHash -notmatch '^[0-9a-f]{64}
    param(
        [string]$Directory,
        [string]$Overall,
        [string]$JsonName,
        [string]$MdName,
        [string]$LogName
    )

    [void][System.IO.Directory]::CreateDirectory($Directory)

    $report = [ordered]@{
        schemaVersion = 2
        generatedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
        overall = $Overall
        verificationBase = $VerificationBase
        candidateSha = $CandidateSha
        branch = $Branch
        productionArtifact = $ProductionArtifact
        validationArtifact = $ValidationArtifact
        existingEvidenceCommit = $ExistingEvidenceCommit
        stages = Convert-StagesForReport
        diagnosticWorkspace = $TempRoot
        physicalMutationAttempted = $false
    }

    $jsonPath = Join-Path $Directory $JsonName
    $mdPath = Join-Path $Directory $MdName
    $logPath = Join-Path $Directory $LogName

    [System.IO.File]::WriteAllText($jsonPath, (($report | ConvertTo-Json -Depth 30) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))

    $md = [System.Text.StringBuilder]::new()
    [void]$md.AppendLine('# S08F Multi-Root Folder Recovery Prerequisite Verification')
    [void]$md.AppendLine()
    [void]$md.AppendLine('- Overall: ' + $Overall)
    [void]$md.AppendLine('- Candidate: ' + $CandidateSha)
    [void]$md.AppendLine('- Verification base: ' + $VerificationBase)
    [void]$md.AppendLine('- Physical mutation attempted: false')
    if ($null -ne $ProductionArtifact) {
        [void]$md.AppendLine('- Production main.js: ' + $ProductionArtifact.sizeBytes + ' bytes / ' + $ProductionArtifact.sha256)
    }
    if ($null -ne $ValidationArtifact) {
        [void]$md.AppendLine('- Validation main.js: ' + $ValidationArtifact.actualSize + ' bytes / ' + $ValidationArtifact.actualSha256)
    }
    [void]$md.AppendLine()
    [void]$md.AppendLine('| Stage | Status | Classification | Summary |')
    [void]$md.AppendLine('|---|---|---|---|')
    foreach ($stage in @($script:Stages)) {
        $summary = ([string]$stage.summary).Replace('|','\|').Replace([char]13,' ').Replace([char]10,' ')
        [void]$md.AppendLine('| ' + $stage.name + ' | ' + $stage.status + ' | ' + $stage.classification + ' | ' + $summary + ' |')
    }
    [System.IO.File]::WriteAllText($mdPath, $md.ToString(), [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($logPath, $script:Log.ToString(), [System.Text.UTF8Encoding]::new($false))

    return [pscustomobject]@{
        json = $jsonPath
        markdown = $mdPath
        log = $logPath
    }
}

function Print-FinalSummary {
    param([string]$Overall)

    Write-LogLine
    Write-LogLine '============================================================'
    Write-LogLine 'S08F PREREQUISITE VERIFICATION RESULT'
    Write-LogLine '============================================================'
    foreach ($stage in @($script:Stages)) {
        Write-LogLine ('{0,-34} {1,-13} {2}' -f $stage.name, $stage.status, $stage.summary)
    }
    Write-LogLine '------------------------------------------------------------'
    Write-LogLine ('OVERALL: {0}' -f $Overall)
    Write-LogLine ('CANDIDATE: {0}' -f $CandidateSha)
    Write-LogLine ('EVIDENCE COMMIT: {0}' -f $(if ($EvidenceCommit) { $EvidenceCommit } elseif ($ExistingEvidenceCommit) { $ExistingEvidenceCommit } else { '<none>' }))
    if ($null -ne $ProductionArtifact) {
        Write-LogLine ('PRODUCTION MAIN.JS: {0} bytes / {1}' -f $ProductionArtifact.sizeBytes, $ProductionArtifact.sha256)
    }
    if ($null -ne $ValidationArtifact) {
        Write-LogLine ('VALIDATION MAIN.JS: {0} bytes / {1}' -f $ValidationArtifact.actualSize, $ValidationArtifact.actualSha256)
    }
    if ($Overall -eq 'PASS') {
        Write-LogLine 'BLOCKING DEFECTS: NONE'
        Write-LogLine 'RECOMMENDED NEXT ACTION: independent review of the bounded prerequisite repair before physical S08F recovery resumes.'
    } else {
        $blocking = @($script:Stages | Where-Object { $_.status -in @('FAIL','BLOCKED','INDETERMINATE') })
        Write-LogLine ('BLOCKING DEFECT COUNT: {0}' -f $blocking.Count)
        Write-LogLine ('DIAGNOSTIC WORKSPACE PRESERVED: {0}' -f $TempRoot)
        Write-LogLine 'RECOMMENDED NEXT ACTION: engineering agent diagnoses and repairs the demonstrated blocker before another owner execution.'
    }
    Write-LogLine '============================================================'
}

try {
    [void][System.IO.Directory]::CreateDirectory($TempRoot)
    [void][System.IO.Directory]::CreateDirectory($LocalReportDir)

    Write-LogLine '============================================================'
    Write-LogLine 'S08F PROTOCOL-ALIGNED PREREQUISITE VERIFIER'
    Write-LogLine '============================================================'
    Write-LogLine ('Candidate: {0}' -f $CandidateSha)
    Write-LogLine ('Verification base: {0}' -f $VerificationBase)
    Write-LogLine ('Repository: {0}' -f $RepositoryRoot)
    Write-LogLine 'Physical mutation authorized: NO'

    $git = Get-Command git -ErrorAction SilentlyContinue
    $node = Get-Command node -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue

    $toolIssues = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-Path -LiteralPath $RepositoryRoot -PathType Container)) { $toolIssues.Add('repository-root-unavailable') }
    if ($null -eq $git) { $toolIssues.Add('git-unavailable') }
    if ($null -eq $node) { $toolIssues.Add('node-unavailable') }
    if ($null -eq $npm) { $toolIssues.Add('npm-unavailable') }
    if ($null -eq $pwsh) { $toolIssues.Add('pwsh-unavailable') }

    if ($toolIssues.Count -gt 0) {
        Add-Stage -Name 'toolchain' -Status 'BLOCKED' -Classification 'TOOLCHAIN UNAVAILABLE' -Summary ($toolIssues -join ', ') | Out-Null
    } else {
        $script:GitPath = $git.Source
        $script:NodePath = $node.Source
        $script:NpmPath = $npm.Source
        $script:PwshPath = $pwsh.Source

        $pathParts = [System.Collections.Generic.List[string]]::new()
        foreach ($candidatePath in @(
            (Split-Path -Parent $script:NodePath),
            (Split-Path -Parent $script:GitPath),
            (Split-Path -Parent $script:PwshPath),
            (Join-Path $env:SystemRoot 'System32'),
            $env:SystemRoot,
            (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0')
        )) {
            if (-not [string]::IsNullOrWhiteSpace([string]$candidatePath) -and (Test-Path -LiteralPath $candidatePath -PathType Container) -and -not $pathParts.Contains($candidatePath)) {
                [void]$pathParts.Add($candidatePath)
            }
        }
        $script:NativePathOverride = $pathParts -join [System.IO.Path]::PathSeparator

        $nodeProbe = Invoke-Native -File $script:NodePath -Arguments @('--version') -WorkingDirectory $RepositoryRoot
        $npmProbe = Invoke-Native -File $script:NpmPath -Arguments @('--version') -WorkingDirectory $RepositoryRoot
        $pwshProbe = Invoke-Native -File $script:PwshPath -Arguments @('-NoProfile','-Command','$PSVersionTable.PSVersion.ToString()') -WorkingDirectory $RepositoryRoot
        $gitProbe = Invoke-Native -File $script:GitPath -Arguments @('--version') -WorkingDirectory $RepositoryRoot

        $failedToolProbes = @(@($nodeProbe,$npmProbe,$pwshProbe,$gitProbe) | Where-Object { $_.exitCode -ne 0 })
        if ($failedToolProbes.Count -gt 0) {
            Add-Stage -Name 'toolchain' -Status 'BLOCKED' -Classification 'TOOLCHAIN PROBE FAILED' -Summary ('One or more controlled child-process probes failed. PATH=' + $script:NativePathOverride) -Evidence ([pscustomobject]@{ node = $nodeProbe; npm = $npmProbe; pwsh = $pwshProbe; git = $gitProbe }) | Out-Null
        } else {
            Add-Stage -Name 'toolchain' -Status 'PASS' -Classification 'TOOLCHAIN READY' -Summary ('Node {0}; npm {1}; PowerShell {2}; Git {3}; deterministic child PATH established.' -f $nodeProbe.stdout.Trim(), $npmProbe.stdout.Trim(), $pwshProbe.stdout.Trim(), $gitProbe.stdout.Trim()) -Evidence ([pscustomobject]@{ path = $script:NativePathOverride }) | Out-Null
        }
    }

    if (Stage-Passed 'toolchain') {
        $syntheticValid = New-SyntheticValidPassReport
        $validModel = Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-child',$CandidateSha) -ChangedPaths @($EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.json') -Report $syntheticValid
        $outOfScopeModel = Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-child',$CandidateSha) -ChangedPaths @($EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.json','src/drive/unexpected.ts') -Report $syntheticValid
        $mergeModel = Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-child',$CandidateSha,'another-parent') -ChangedPaths @($EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.json') -Report $syntheticValid
        $incompleteReport = New-SyntheticValidPassReport
        $incompleteReport.stages = @($incompleteReport.stages | Where-Object { $_.name -ne 'complete-product-suite' })
        $incompleteModel = Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-child',$CandidateSha) -ChangedPaths @($EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.json') -Report $incompleteReport
        if ($validModel.ok -and -not $outOfScopeModel.ok -and -not $mergeModel.ok -and -not $incompleteModel.ok) {
            Add-Stage -Name 'rerun-recognition-self-check' -Status 'PASS' -Classification 'FAIL-CLOSED RERUN RECOGNITION' -Summary 'Synthetic valid evidence is accepted while out-of-scope, multi-parent, and incomplete-report evidence is rejected.' | Out-Null
        } else {
            Add-Stage -Name 'rerun-recognition-self-check' -Status 'FAIL' -Classification 'RERUN RECOGNITION SELF-CHECK FAILED' -Summary 'Synthetic evidence recognition did not fail closed.' -Evidence ([pscustomobject]@{ valid=$validModel; outOfScope=$outOfScopeModel; merge=$mergeModel; incomplete=$incompleteModel }) | Out-Null
        }
    } else {
        Add-Stage -Name 'rerun-recognition-self-check' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain verification did not pass.' | Out-Null
    }

    if (Stage-Passed 'toolchain' -and Stage-Passed 'rerun-recognition-self-check') {
        Write-LogLine
        Write-LogLine '===== REPOSITORY IDENTITY / RERUN SAFETY ====='

        $fetch = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune') -WorkingDirectory $RepositoryRoot
        Write-NativeResult $fetch

        if ($fetch.exitCode -ne 0) {
            Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'FETCH FAILED' -Summary ('Unable to refresh task branch; git exit ' + $fetch.exitCode) -ExitCode $fetch.exitCode | Out-Null
        } else {
            $candidateProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'cat-file','-e',($CandidateSha + '^{commit}')) -WorkingDirectory $RepositoryRoot
            $remoteProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch)) -WorkingDirectory $RepositoryRoot
            $remoteHead = $remoteProbe.stdout.Trim()

            if ($candidateProbe.exitCode -ne 0 -or $remoteProbe.exitCode -ne 0) {
                Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'SOURCE IDENTITY UNAVAILABLE' -Summary 'Candidate commit or refreshed remote branch could not be resolved.' -Evidence ([pscustomobject]@{ candidateExit = $candidateProbe.exitCode; remoteExit = $remoteProbe.exitCode }) | Out-Null
            } elseif ($remoteHead -eq $CandidateSha) {
                Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'EXACT CANDIDATE AT BRANCH HEAD' -Summary ('Remote task branch is exactly the requested candidate ' + $CandidateSha + '.') | Out-Null
            } else {
                $parentsProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-list','--parents','-n','1',$remoteHead) -WorkingDirectory $RepositoryRoot
                $commitTokens = @($parentsProbe.stdout.Trim() -split '\s+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                $pathsProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff-tree','--no-commit-id','--name-only','-r',$remoteHead) -WorkingDirectory $RepositoryRoot
                $childPaths = @($pathsProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                $evidenceProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($remoteHead + ':' + $PassJsonRel)) -WorkingDirectory $RepositoryRoot
                $existing = $null
                if ($evidenceProbe.exitCode -eq 0) {
                    try { $existing = $evidenceProbe.stdout | ConvertFrom-Json } catch { $existing = $null }
                }

                if ($parentsProbe.exitCode -eq 0 -and $pathsProbe.exitCode -eq 0) {
                    $recognition = Test-EvidenceChildRecognitionModel -CommitLineTokens $commitTokens -ChangedPaths $childPaths -Report $existing
                } else {
                    $recognition = [pscustomobject]@{ ok=$false; reasons=@('git-topology-inspection-failed'); outsideEvidence=@() }
                }

                if ($recognition.ok) {
                    $script:AlreadyVerified = $true
                    $script:ExistingEvidenceCommit = $remoteHead
                    $script:ExistingEvidence = $existing
                    Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'ALREADY VERIFIED EVIDENCE CHILD' -Summary ('Remote head is a single-parent evidence-only child ' + $remoteHead + ' with complete canonical PASS evidence for requested candidate ' + $CandidateSha + '.') -Evidence ([pscustomobject]@{ changedPaths=$childPaths; recognition=$recognition }) | Out-Null
                    Add-Stage -Name 'existing-evidence' -Status 'PASS' -Classification 'CANONICAL PASS EVIDENCE' -Summary 'Existing canonical PASS evidence passed topology, scope, schema, required-stage, physical-mutation, and artifact-identity validation; verification rerun is unnecessary.' -Evidence $existing | Out-Null
                } else {
                    Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'UNEXPECTED BRANCH DRIFT' -Summary ('Requested candidate=' + $CandidateSha + '; remoteHead=' + $remoteHead + '. Existing child failed strict PASS-evidence recognition: ' + (@($recognition.reasons) -join ',')) -Evidence ([pscustomobject]@{ commitTokens=$commitTokens; changedPaths=$childPaths; recognition=$recognition }) | Out-Null
                }
            }
        }
    } else {
        Add-Stage -Name 'repository-identity'        Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain verification did not pass.' | Out-Null
    }

    if ($script:AlreadyVerified) {
        $script:ProductionArtifact = $script:ExistingEvidence.productionArtifact
        $script:ValidationArtifact = $script:ExistingEvidence.validationArtifact
        $script:FinalOverall = 'PASS'
    } elseif (Stage-Passed 'repository-identity') {
        Write-LogLine
        Write-LogLine '===== SCOPE / CONTRACT / CAUSALITY ====='

        $ancestor = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'merge-base','--is-ancestor',$VerificationBase,$CandidateSha) -WorkingDirectory $RepositoryRoot
        $changedResult = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff','--name-only',$VerificationBase,$CandidateSha,'--') -WorkingDirectory $RepositoryRoot
        $changed = @($changedResult.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

        $unexpected = @($changed | Where-Object {
            $value = [string]$_
            ($script:AllowedChangedPaths -notcontains $value) -and (-not $value.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal))
        })
        $contractChanges = @($changed | Where-Object { ([string]$_).StartsWith('src/contracts/', [System.StringComparison]::Ordinal) })

        $diffArgs = @('-C',$RepositoryRoot,'diff','--check',$VerificationBase,$CandidateSha,'--') + $SourceDiffCheckPaths
        $diffCheck = Invoke-Native -File $script:GitPath -Arguments $diffArgs -WorkingDirectory $RepositoryRoot
        Write-NativeResult $diffCheck

        $scopePass = $ancestor.exitCode -eq 0 -and $changedResult.exitCode -eq 0 -and $unexpected.Count -eq 0 -and $contractChanges.Count -eq 0 -and $diffCheck.exitCode -eq 0
        $scopeEvidence = [pscustomobject]@{
            changedPaths = $changed
            unexpectedPaths = $unexpected
            contractChanges = $contractChanges
            ancestorExitCode = $ancestor.exitCode
            diffCheckExitCode = $diffCheck.exitCode
            diffCheckPaths = $SourceDiffCheckPaths
        }
        if ($scopePass) {
            Add-Stage -Name 'change-scope' -Status 'PASS' -Classification 'BOUNDED PREREQUISITE' -Summary 'Candidate descends from the blocked physical-evidence anchor; changes are confined to authorized prerequisite/evidence paths; frozen contracts are unchanged; source/task/verifier diff-check passes.' -Evidence $scopeEvidence | Out-Null
        } else {
            Add-Stage -Name 'change-scope' -Status 'FAIL' -Classification 'SCOPE OR CONTRACT VIOLATION' -Summary 'Candidate failed ancestry, path-boundary, contract-freeze, or source diff-check validation.' -Evidence $scopeEvidence | Out-Null
        }

        $baseSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($VerificationBase + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
        $candidateSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
        $candidateTest = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $TestRel)) -WorkingDirectory $RepositoryRoot

        $causalPass = $baseSource.exitCode -eq 0 -and $candidateSource.exitCode -eq 0 -and $candidateTest.exitCode -eq 0 -and
            $baseSource.stdout.Contains('const root=await this.uniqueManagedRoot()') -and
            $candidateSource.stdout.Contains('const expectedParent=await this.getFile(descriptor.parentRemoteObjectId)') -and
            $candidateSource.stdout.Contains('target-parent-identity-mismatch') -and
            $candidateTest.stdout.Contains('rootSearch.value,0') -and
            $candidateTest.stdout.Contains('mutations.value,0')

        if ($causalPass) {
            Add-Stage -Name 'defect-causality' -Status 'PASS' -Classification 'OWNING DEFECT REPAIRED' -Summary 'Base used account-global root uniqueness after reserved-ID absence; candidate anchors recovery to exact parent observation/root ancestry; regression asserts no global root search and no Drive mutation.' | Out-Null
        } else {
            Add-Stage -Name 'defect-causality' -Status 'FAIL' -Classification 'CAUSAL REPAIR PROOF INCOMPLETE' -Summary 'Base-to-candidate causal markers do not prove the assigned repair and regression boundaries.' | Out-Null
        }
    } else {
        Add-Stage -Name 'change-scope' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity did not pass.' | Out-Null
        Add-Stage -Name 'defect-causality' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity did not pass.' | Out-Null
    }

    if (-not $script:AlreadyVerified) {
        if (Stage-Passed 'repository-identity' -and Stage-Passed 'change-scope') {
            Write-LogLine
            Write-LogLine '===== DISPOSABLE EXACT-SHA WORKTREE ====='
            $worktreeCreate = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'worktree','add','--detach',$Worktree,$CandidateSha) -WorkingDirectory $RepositoryRoot
            Write-NativeResult $worktreeCreate
            if ($worktreeCreate.exitCode -eq 0) {
                $script:WorktreeCreated = $true
                Add-Stage -Name 'disposable-worktree' -Status 'PASS' -Classification 'EXACT-SHA DISPOSABLE WORKTREE' -Summary ('Created GUID-isolated detached worktree at ' + $Worktree + '.') | Out-Null
            } else {
                Add-Stage -Name 'disposable-worktree' -Status 'BLOCKED' -Classification 'WORKTREE CREATION FAILED' -Summary ('git worktree add failed with exit ' + $worktreeCreate.exitCode) -ExitCode $worktreeCreate.exitCode | Out-Null
            }
        } else {
            Add-Stage -Name 'disposable-worktree' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity and bounded scope must pass before detached execution.' | Out-Null
        }

        $worktreeReady = Stage-Passed 'disposable-worktree'

        $dependencyCode = Invoke-ProcessStage -Name 'dependencies' -Classification 'DEPENDENCY INSTALL' -File $script:NpmPath -Arguments @('ci','--no-audit','--no-fund','--loglevel','info') -WorkingDirectory $Worktree -Enabled $worktreeReady -BlockedReason 'Disposable worktree is unavailable.'
        $dependenciesReady = $dependencyCode -eq 0

        [void](Invoke-ProcessStage -Name 'typecheck' -Classification 'TYPECHECK' -File $script:NpmPath -Arguments @('run','typecheck') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.')

        $productCompileCode = Invoke-ProcessStage -Name 'product-test-compile' -Classification 'PRODUCT TEST COMPILE' -File $script:NodePath -Arguments @('node_modules/typescript/bin/tsc','-p','tsconfig.test.json') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $productCompiled = $productCompileCode -eq 0

        [void](Invoke-ProcessStage -Name 'focused-folder-recovery' -Classification 'FOCUSED RECOVERY REGRESSION' -File $script:NodePath -Arguments @(
            '--test',
            '.test-build/test/workstreams/drive/phase6-remote-protocol.test.js',
            '.test-build/test/phase6-folder-remote-recovery-observation-foundation.test.js',
            '.test-build/test/workstreams/orchestration/v1.2-remote-folder-restart.test.js'
        ) -WorkingDirectory $Worktree -Enabled $productCompiled -BlockedReason 'Product test compilation did not pass.')

        [void](Invoke-TestTreeStage -Name 'complete-product-suite' -Classification 'COMPLETE PRODUCT TEST SUITE' -Root (Join-Path $Worktree '.test-build/test') -Enabled $productCompiled -BlockedReason 'Product test compilation did not pass.')

        $bvpCompileCode = Invoke-ProcessStage -Name 'bvp-compile' -Classification 'BVP COMPILE' -File $script:NodePath -Arguments @('node_modules/typescript/bin/tsc','-p','test-platform/tsconfig.json') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $bvpCompiled = $bvpCompileCode -eq 0

        [void](Invoke-TestTreeStage -Name 'complete-bvp-suite' -Classification 'COMPLETE BVP TEST SUITE' -Root (Join-Path $Worktree '.test-build/bvp/test-platform/test') -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        [void](Invoke-ProcessStage -Name 'architecture-guard' -Classification 'ARCHITECTURE GUARD' -File $script:NodePath -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-guard.test.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        [void](Invoke-ProcessStage -Name 'architecture-metrics' -Classification 'ARCHITECTURE METRICS' -File $script:NodePath -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-metrics.test.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        $contextPath = Join-Path $TempRoot 'verification-context.json'
        if ($worktreeReady) {
            $context = [ordered]@{
                schemaVersion = 1
                targetHead = $CandidateSha
                baseSha = $VerificationBase
                changedPaths = @((Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff','--name-only',$VerificationBase,$CandidateSha,'--') -WorkingDirectory $RepositoryRoot).stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            }
            [System.IO.File]::WriteAllText($contextPath, (($context | ConvertTo-Json -Depth 5) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
        }

        [void](Invoke-ProcessStage -Name 'repository-check' -Classification 'REPOSITORY CHECK' -File $script:NodePath -Arguments @('.test-build/bvp/test-platform/src/repository-check.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.' -Environment @{
            PHX_VERIFICATION_CONTEXT_PATH = $contextPath
            BVP_CHANGE_CLASS = 'ordinary'
            PWSH = $script:PwshPath
        })

        $buildCode = Invoke-ProcessStage -Name 'production-build' -Classification 'PRODUCTION BUILD' -File $script:NpmPath -Arguments @('run','build') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $buildReady = $buildCode -eq 0

        if ($buildReady) {
            try {
                $mainJs = Join-Path $Worktree 'main.js'
                if (-not (Test-Path -LiteralPath $mainJs -PathType Leaf)) {
                    Add-Stage -Name 'production-artifact' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT MISSING' -Summary 'Production build returned success but main.js is missing.' | Out-Null
                } else {
                    $mainText = [System.IO.File]::ReadAllText($mainJs)
                    $forbiddenMarkers = @(@(
                        'BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL',
                        '__BRAIN_BVP_MAILBOX_RUNTIME__',
                        '__BRAIN_BVP_DEVICE_AGENT_FACTORY__',
                        'BRAIN BVP Mailbox'
                    ) | Where-Object { $mainText.Contains($_) })
                    $script:ProductionArtifact = [pscustomobject]@{
                        sizeBytes = (Get-Item -LiteralPath $mainJs).Length
                        sha256 = Get-Sha256 $mainJs
                        forbiddenMarkerHits = $forbiddenMarkers
                    }
                    if ($script:ProductionArtifact.sizeBytes -gt 0 -and $forbiddenMarkers.Count -eq 0) {
                        Add-Stage -Name 'production-artifact' -Status 'PASS' -Classification 'PRODUCTION BUNDLE ISOLATED' -Summary ('Generated main.js is {0} bytes / {1}; validation marker hits=0.' -f $script:ProductionArtifact.sizeBytes, $script:ProductionArtifact.sha256) -Evidence $script:ProductionArtifact | Out-Null
                    } else {
                        Add-Stage -Name 'production-artifact' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT INVALID' -Summary ('Production artifact isolation failed; forbidden marker count=' + $forbiddenMarkers.Count) -Evidence $script:ProductionArtifact | Out-Null
                    }
                }
            } catch {
                Add-Stage -Name 'production-artifact' -Status 'INDETERMINATE' -Classification 'ARTIFACT INSPECTION ERROR' -Summary $_.Exception.Message | Out-Null
            }
        } else {
            Add-Stage -Name 'production-artifact' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Production build did not pass.' | Out-Null
        }

        $validationEnabled = $buildReady -and $bvpCompiled
        $validationBuildCode = Invoke-ProcessStage -Name 'validation-artifact-build' -Classification 'VALIDATION ARTIFACT BUILD' -File $script:NodePath -Arguments @('.test-build/bvp/test-platform/src/live-device/build-validation-artifact.js') -WorkingDirectory $Worktree -Enabled $validationEnabled -BlockedReason 'Production build and BVP compilation must both pass.'

        if ($validationBuildCode -eq 0) {
            try {
                $validationDir = Join-Path $Worktree '.test-build/bvp-live-device/plugin'
                $identityPath = Join-Path $validationDir 'build-identity.json'
                $artifactPath = Join-Path $validationDir 'main.js'
                if (-not (Test-Path -LiteralPath $identityPath -PathType Leaf) -or -not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
                    Add-Stage -Name 'validation-artifact' -Status 'FAIL' -Classification 'VALIDATION ARTIFACT MISSING' -Summary 'Validation artifact or build identity is missing after successful builder execution.' | Out-Null
                } else {
                    $identity = Get-Content -LiteralPath $identityPath -Raw | ConvertFrom-Json
                    $actualSize = (Get-Item -LiteralPath $artifactPath).Length
                    $actualHash = Get-Sha256 $artifactPath
                    $script:ValidationArtifact = [pscustomobject]@{
                        sourceCommit = [string]$identity.sourceCommit
                        artifactSize = [int64]$identity.artifactSize
                        artifactSha256 = [string]$identity.artifactSha256
                        actualSize = $actualSize
                        actualSha256 = $actualHash
                        manifestSha256 = [string]$identity.manifestSha256
                        testPlatformInputs = @($identity.testPlatformInputs)
                    }
                    $validIdentity = $script:ValidationArtifact.sourceCommit -eq $CandidateSha -and
                        $script:ValidationArtifact.artifactSize -eq $actualSize -and
                        $script:ValidationArtifact.artifactSha256 -eq $actualHash
                    if ($validIdentity) {
                        Add-Stage -Name 'validation-artifact' -Status 'PASS' -Classification 'EXACT VALIDATION ARTIFACT' -Summary ('Validation main.js source={0}; size={1}; sha256={2}.' -f $CandidateSha, $actualSize, $actualHash) -Evidence $script:ValidationArtifact | Out-Null
                    } else {
                        Add-Stage -Name 'validation-artifact' -Status 'FAIL' -Classification 'VALIDATION ARTIFACT IDENTITY MISMATCH' -Summary 'Validation build identity does not exactly match the candidate and generated artifact.' -Evidence $script:ValidationArtifact | Out-Null
                    }
                }
            } catch {
                Add-Stage -Name 'validation-artifact' -Status 'INDETERMINATE' -Classification 'VALIDATION ARTIFACT INSPECTION ERROR' -Summary $_.Exception.Message | Out-Null
            }
        } else {
            Add-Stage -Name 'validation-artifact' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Validation artifact builder did not pass.' | Out-Null
        }

        if ($worktreeReady) {
            $status = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'status','--porcelain','--untracked-files=all') -WorkingDirectory $Worktree
            $statusLines = @($status.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            if ($status.exitCode -eq 0 -and $statusLines.Count -eq 0) {
                Add-Stage -Name 'repository-mutation-audit' -Status 'PASS' -Classification 'NO UNEXPECTED REPOSITORY MUTATION' -Summary 'Verification left the detached candidate worktree clean; generated build/test artifacts are repository-ignored.' | Out-Null
            } elseif ($status.exitCode -eq 0) {
                Add-Stage -Name 'repository-mutation-audit' -Status 'FAIL' -Classification 'UNEXPECTED REPOSITORY MUTATION' -Summary ('Verification produced unexpected tracked/untracked changes: ' + ($statusLines -join '; ')) -Evidence $statusLines | Out-Null
            } else {
                Add-Stage -Name 'repository-mutation-audit' -Status 'INDETERMINATE' -Classification 'GIT STATUS FAILED' -Summary ('Unable to inspect detached worktree status; git exit ' + $status.exitCode) | Out-Null
            }
        } else {
            Add-Stage -Name 'repository-mutation-audit' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Disposable worktree is unavailable.' | Out-Null
        }

        $requiredStageNames = $RequiredVerificationStageNames

        $missingRequired = [System.Collections.Generic.List[string]]::new()
        $nonPassRequired = [System.Collections.Generic.List[string]]::new()
        foreach ($name in $requiredStageNames) {
            $stage = @(Get-Stage $name)
            if ($stage.Count -eq 0) {
                $missingRequired.Add($name)
            } elseif ($stage[-1].status -ne 'PASS') {
                $nonPassRequired.Add($name + '=' + $stage[-1].status)
            }
        }

        if ($missingRequired.Count -eq 0 -and $nonPassRequired.Count -eq 0) {
            Add-Stage -Name 'acceptance-gate' -Status 'PASS' -Classification 'ALL REQUIRED VERIFICATION PASSED' -Summary 'Every required verification layer passed; canonical evidence publication is authorized.' | Out-Null
            $script:FinalOverall = 'PASS'
        } else {
            Add-Stage -Name 'acceptance-gate' -Status 'FAIL' -Classification 'REQUIRED VERIFICATION INCOMPLETE' -Summary ('Required stages not PASS. Missing=' + ($missingRequired -join ',') + '; nonPass=' + ($nonPassRequired -join ',')) -Evidence ([pscustomobject]@{ missing = @($missingRequired); nonPass = @($nonPassRequired) }) | Out-Null
            $script:FinalOverall = 'FAIL'
        }

        if ($script:FinalOverall -eq 'PASS') {
            Write-LogLine
            Write-LogLine '===== PASS-ONLY CANONICAL EVIDENCE PUBLICATION ====='

            $evidenceDir = Join-Path $Worktree ($EvidenceRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
            [void][System.IO.Directory]::CreateDirectory($evidenceDir)

            Remove-Item -LiteralPath (Join-Path $Worktree ($FailJsonRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath (Join-Path $Worktree ($FailMdRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Force -ErrorAction SilentlyContinue

            $canonical = Write-ReportFiles -Directory $evidenceDir -Overall 'PASS' -JsonName ([System.IO.Path]::GetFileName($PassJsonRel)) -MdName ([System.IO.Path]::GetFileName($PassMdRel)) -LogName ([System.IO.Path]::GetFileName($PassLogRel))

            $evidenceStatus = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'status','--porcelain','--untracked-files=all') -WorkingDirectory $Worktree
            $evidenceLines = @($evidenceStatus.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            $outsideEvidence = @($evidenceLines | Where-Object {
                $line = [string]$_
                if ($line.Length -lt 4) { return $true }
                $relative = $line.Substring(3).Replace('\','/')
                return -not $relative.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal)
            })

            if ($evidenceStatus.exitCode -ne 0 -or $outsideEvidence.Count -gt 0) {
                Add-Stage -Name 'evidence-preparation' -Status 'FAIL' -Classification 'EVIDENCE SCOPE VIOLATION' -Summary ('PASS evidence preparation produced out-of-scope changes: ' + ($outsideEvidence -join '; ')) -Evidence $evidenceLines | Out-Null
                $script:FinalOverall = 'FAIL'
            } else {
                Add-Stage -Name 'evidence-preparation' -Status 'PASS' -Classification 'EVIDENCE-ONLY MUTATION' -Summary 'Canonical PASS evidence is the only residual repository mutation.' -Evidence $canonical | Out-Null
                $canonical = Write-ReportFiles -Directory $evidenceDir -Overall 'PASS' -JsonName ([System.IO.Path]::GetFileName($PassJsonRel)) -MdName ([System.IO.Path]::GetFileName($PassMdRel)) -LogName ([System.IO.Path]::GetFileName($PassLogRel))

                $remoteRefresh = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune') -WorkingDirectory $RepositoryRoot
                $remoteNowProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch)) -WorkingDirectory $RepositoryRoot
                $remoteNow = $remoteNowProbe.stdout.Trim()

                if ($remoteRefresh.exitCode -ne 0 -or $remoteNowProbe.exitCode -ne 0 -or $remoteNow -ne $CandidateSha) {
                    Add-Stage -Name 'evidence-publication' -Status 'BLOCKED' -Classification 'BRANCH LEASE LOST' -Summary ('Remote branch changed before PASS evidence publication. Expected ' + $CandidateSha + '; observed ' + $remoteNow + '. No evidence commit was published.') | Out-Null
                    $script:FinalOverall = 'FAIL'
                } else {
                    $add = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'add','--',$EvidenceRel) -WorkingDirectory $Worktree
                    if ($add.exitCode -ne 0) {
                        Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE STAGING FAILED' -Summary ('git add failed with exit ' + $add.exitCode) | Out-Null
                        $script:FinalOverall = 'FAIL'
                    } else {
                        $commit = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'commit','-m','test(bvp): record S08F prerequisite verification evidence') -WorkingDirectory $Worktree
                        Write-NativeResult $commit
                        if ($commit.exitCode -ne 0) {
                            Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE COMMIT FAILED' -Summary ('Evidence commit failed with exit ' + $commit.exitCode) | Out-Null
                            $script:FinalOverall = 'FAIL'
                        } else {
                            $headProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD') -WorkingDirectory $Worktree
                            $script:EvidenceCommit = $headProbe.stdout.Trim()
                            $parentProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD^') -WorkingDirectory $Worktree
                            $committedPathsProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'diff-tree','--no-commit-id','--name-only','-r','HEAD') -WorkingDirectory $Worktree
                            $committedPaths = @($committedPathsProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                            $nonEvidenceCommitted = @($committedPaths | Where-Object { -not ([string]$_).StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal) })

                            if ($headProbe.exitCode -ne 0 -or $parentProbe.exitCode -ne 0 -or $parentProbe.stdout.Trim() -ne $CandidateSha -or $nonEvidenceCommitted.Count -gt 0) {
                                Add-Stage -Name 'evidence-publication' -Status 'FAIL' -Classification 'EVIDENCE COMMIT INVARIANT FAILED' -Summary 'Prepared evidence commit is not a direct evidence-only child of the verified candidate; it was not pushed.' -Evidence ([pscustomobject]@{ parent = $parentProbe.stdout.Trim(); committedPaths = $committedPaths }) | Out-Null
                                $script:FinalOverall = 'FAIL'
                            } else {
                                $push = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'push','origin',('HEAD:refs/heads/' + $Branch)) -WorkingDirectory $Worktree
                                Write-NativeResult $push
                                if ($push.exitCode -eq 0) {
                                    Add-Stage -Name 'evidence-publication' -Status 'PASS' -Classification 'CANONICAL EVIDENCE PUBLISHED' -Summary ('Published direct evidence-only child ' + $script:EvidenceCommit + ' for verified candidate ' + $CandidateSha + '.') | Out-Null
                                } else {
                                    Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE PUSH FAILED' -Summary ('Evidence commit exists locally at ' + $script:EvidenceCommit + ' but push failed with exit ' + $push.exitCode + '. Diagnostic workspace is preserved.') | Out-Null
                                    $script:FinalOverall = 'FAIL'
                                }
                            }
                        }
                    }
                }
            }
        } else {
            Add-Stage -Name 'evidence-publication' -Status 'SKIPPED' -Classification 'PASS-ONLY PUBLICATION' -Summary 'Canonical evidence publication is intentionally skipped because verification did not reach PASS.' | Out-Null
        }
    }

    if ($script:AlreadyVerified) {
        $script:FinalOverall = 'PASS'
    } elseif ($script:FinalOverall -eq 'PASS' -and -not (Stage-Passed 'evidence-publication')) {
        $script:FinalOverall = 'FAIL'
    }

} catch {
    $script:HarnessError = $_.Exception.ToString()
    Add-Stage -Name 'harness-terminal' -Status 'INDETERMINATE' -Classification 'HARNESS ERROR' -Summary $_.Exception.Message | Out-Null
    $script:FinalOverall = 'FAIL'
} finally {
    try {
        $local = Write-ReportFiles -Directory $LocalReportDir -Overall $script:FinalOverall -JsonName 'result.json' -MdName 'result.md' -LogName 'result.log'
        if ($script:FinalOverall -eq 'FAIL') {
            Write-LogLine ('Local structured report: ' + $local.json)
        }
    } catch {
        if ($script:FinalOverall -eq 'PASS' -and ((Stage-Passed 'evidence-publication') -or $script:AlreadyVerified)) {
            Write-Host ('WARNING: best-effort post-publication local report failed without changing the published PASS verdict: ' + $_.Exception.Message)
        } else {
            Write-Host ('Unable to persist verdict-affecting local structured report: ' + $_.Exception.Message)
            $script:FinalOverall = 'FAIL'
        }
    }

    Print-FinalSummary -Overall $script:FinalOverall
    if ($script:FinalOverall -eq 'FAIL') {
        try { [System.IO.File]::WriteAllText($LocalLog, $script:Log.ToString(), [System.Text.UTF8Encoding]::new($false)) } catch {}
    }

    if ($script:FinalOverall -eq 'PASS') {
        if ($script:WorktreeCreated) {
            try {
                $remove = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'worktree','remove','--force',$Worktree) -WorkingDirectory $RepositoryRoot
                if ($remove.exitCode -ne 0) {
                    Write-Host ('WARNING: successful verification worktree cleanup failed; preserved at ' + $Worktree)
                }
            } catch {
                Write-Host ('WARNING: successful verification worktree cleanup failed: ' + $_.Exception.Message)
            }
        }
        Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
        [System.Environment]::Exit(0)
    } else {
        [System.Environment]::Exit(20)
    }
}
) { $reasons.Add('production-artifact-identity') }
        if (@($production.forbiddenMarkerHits).Count -ne 0) { $reasons.Add('production-artifact-markers') }
    }

    $validation = $Report.validationArtifact
    if ($null -eq $validation) {
        $reasons.Add('validation-artifact-missing')
    } else {
        $artifactHash = [string]$validation.artifactSha256
        $actualHash = [string]$validation.actualSha256
        if ([string]$validation.sourceCommit -ne $CandidateSha) { $reasons.Add('validation-source-commit') }
        if ([int64]$validation.artifactSize -le 0 -or [int64]$validation.actualSize -le 0 -or [int64]$validation.artifactSize -ne [int64]$validation.actualSize) { $reasons.Add('validation-size') }
        if ($artifactHash -notmatch '^[0-9a-f]{64}
    param(
        [string]$Directory,
        [string]$Overall,
        [string]$JsonName,
        [string]$MdName,
        [string]$LogName
    )

    [void][System.IO.Directory]::CreateDirectory($Directory)

    $report = [ordered]@{
        schemaVersion = 2
        generatedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
        overall = $Overall
        verificationBase = $VerificationBase
        candidateSha = $CandidateSha
        branch = $Branch
        productionArtifact = $ProductionArtifact
        validationArtifact = $ValidationArtifact
        existingEvidenceCommit = $ExistingEvidenceCommit
        stages = Convert-StagesForReport
        diagnosticWorkspace = $TempRoot
        physicalMutationAttempted = $false
    }

    $jsonPath = Join-Path $Directory $JsonName
    $mdPath = Join-Path $Directory $MdName
    $logPath = Join-Path $Directory $LogName

    [System.IO.File]::WriteAllText($jsonPath, (($report | ConvertTo-Json -Depth 30) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))

    $md = [System.Text.StringBuilder]::new()
    [void]$md.AppendLine('# S08F Multi-Root Folder Recovery Prerequisite Verification')
    [void]$md.AppendLine()
    [void]$md.AppendLine('- Overall: ' + $Overall)
    [void]$md.AppendLine('- Candidate: ' + $CandidateSha)
    [void]$md.AppendLine('- Verification base: ' + $VerificationBase)
    [void]$md.AppendLine('- Physical mutation attempted: false')
    if ($null -ne $ProductionArtifact) {
        [void]$md.AppendLine('- Production main.js: ' + $ProductionArtifact.sizeBytes + ' bytes / ' + $ProductionArtifact.sha256)
    }
    if ($null -ne $ValidationArtifact) {
        [void]$md.AppendLine('- Validation main.js: ' + $ValidationArtifact.actualSize + ' bytes / ' + $ValidationArtifact.actualSha256)
    }
    [void]$md.AppendLine()
    [void]$md.AppendLine('| Stage | Status | Classification | Summary |')
    [void]$md.AppendLine('|---|---|---|---|')
    foreach ($stage in @($script:Stages)) {
        $summary = ([string]$stage.summary).Replace('|','\|').Replace([char]13,' ').Replace([char]10,' ')
        [void]$md.AppendLine('| ' + $stage.name + ' | ' + $stage.status + ' | ' + $stage.classification + ' | ' + $summary + ' |')
    }
    [System.IO.File]::WriteAllText($mdPath, $md.ToString(), [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($logPath, $script:Log.ToString(), [System.Text.UTF8Encoding]::new($false))

    return [pscustomobject]@{
        json = $jsonPath
        markdown = $mdPath
        log = $logPath
    }
}

function Print-FinalSummary {
    param([string]$Overall)

    Write-LogLine
    Write-LogLine '============================================================'
    Write-LogLine 'S08F PREREQUISITE VERIFICATION RESULT'
    Write-LogLine '============================================================'
    foreach ($stage in @($script:Stages)) {
        Write-LogLine ('{0,-34} {1,-13} {2}' -f $stage.name, $stage.status, $stage.summary)
    }
    Write-LogLine '------------------------------------------------------------'
    Write-LogLine ('OVERALL: {0}' -f $Overall)
    Write-LogLine ('CANDIDATE: {0}' -f $CandidateSha)
    Write-LogLine ('EVIDENCE COMMIT: {0}' -f $(if ($EvidenceCommit) { $EvidenceCommit } elseif ($ExistingEvidenceCommit) { $ExistingEvidenceCommit } else { '<none>' }))
    if ($null -ne $ProductionArtifact) {
        Write-LogLine ('PRODUCTION MAIN.JS: {0} bytes / {1}' -f $ProductionArtifact.sizeBytes, $ProductionArtifact.sha256)
    }
    if ($null -ne $ValidationArtifact) {
        Write-LogLine ('VALIDATION MAIN.JS: {0} bytes / {1}' -f $ValidationArtifact.actualSize, $ValidationArtifact.actualSha256)
    }
    if ($Overall -eq 'PASS') {
        Write-LogLine 'BLOCKING DEFECTS: NONE'
        Write-LogLine 'RECOMMENDED NEXT ACTION: independent review of the bounded prerequisite repair before physical S08F recovery resumes.'
    } else {
        $blocking = @($script:Stages | Where-Object { $_.status -in @('FAIL','BLOCKED','INDETERMINATE') })
        Write-LogLine ('BLOCKING DEFECT COUNT: {0}' -f $blocking.Count)
        Write-LogLine ('DIAGNOSTIC WORKSPACE PRESERVED: {0}' -f $TempRoot)
        Write-LogLine 'RECOMMENDED NEXT ACTION: engineering agent diagnoses and repairs the demonstrated blocker before another owner execution.'
    }
    Write-LogLine '============================================================'
}

try {
    [void][System.IO.Directory]::CreateDirectory($TempRoot)
    [void][System.IO.Directory]::CreateDirectory($LocalReportDir)

    Write-LogLine '============================================================'
    Write-LogLine 'S08F PROTOCOL-ALIGNED PREREQUISITE VERIFIER'
    Write-LogLine '============================================================'
    Write-LogLine ('Candidate: {0}' -f $CandidateSha)
    Write-LogLine ('Verification base: {0}' -f $VerificationBase)
    Write-LogLine ('Repository: {0}' -f $RepositoryRoot)
    Write-LogLine 'Physical mutation authorized: NO'

    $git = Get-Command git -ErrorAction SilentlyContinue
    $node = Get-Command node -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue

    $toolIssues = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-Path -LiteralPath $RepositoryRoot -PathType Container)) { $toolIssues.Add('repository-root-unavailable') }
    if ($null -eq $git) { $toolIssues.Add('git-unavailable') }
    if ($null -eq $node) { $toolIssues.Add('node-unavailable') }
    if ($null -eq $npm) { $toolIssues.Add('npm-unavailable') }
    if ($null -eq $pwsh) { $toolIssues.Add('pwsh-unavailable') }

    if ($toolIssues.Count -gt 0) {
        Add-Stage -Name 'toolchain' -Status 'BLOCKED' -Classification 'TOOLCHAIN UNAVAILABLE' -Summary ($toolIssues -join ', ') | Out-Null
    } else {
        $script:GitPath = $git.Source
        $script:NodePath = $node.Source
        $script:NpmPath = $npm.Source
        $script:PwshPath = $pwsh.Source

        $pathParts = [System.Collections.Generic.List[string]]::new()
        foreach ($candidatePath in @(
            (Split-Path -Parent $script:NodePath),
            (Split-Path -Parent $script:GitPath),
            (Split-Path -Parent $script:PwshPath),
            (Join-Path $env:SystemRoot 'System32'),
            $env:SystemRoot,
            (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0')
        )) {
            if (-not [string]::IsNullOrWhiteSpace([string]$candidatePath) -and (Test-Path -LiteralPath $candidatePath -PathType Container) -and -not $pathParts.Contains($candidatePath)) {
                [void]$pathParts.Add($candidatePath)
            }
        }
        $script:NativePathOverride = $pathParts -join [System.IO.Path]::PathSeparator

        $nodeProbe = Invoke-Native -File $script:NodePath -Arguments @('--version') -WorkingDirectory $RepositoryRoot
        $npmProbe = Invoke-Native -File $script:NpmPath -Arguments @('--version') -WorkingDirectory $RepositoryRoot
        $pwshProbe = Invoke-Native -File $script:PwshPath -Arguments @('-NoProfile','-Command','$PSVersionTable.PSVersion.ToString()') -WorkingDirectory $RepositoryRoot
        $gitProbe = Invoke-Native -File $script:GitPath -Arguments @('--version') -WorkingDirectory $RepositoryRoot

        $failedToolProbes = @(@($nodeProbe,$npmProbe,$pwshProbe,$gitProbe) | Where-Object { $_.exitCode -ne 0 })
        if ($failedToolProbes.Count -gt 0) {
            Add-Stage -Name 'toolchain' -Status 'BLOCKED' -Classification 'TOOLCHAIN PROBE FAILED' -Summary ('One or more controlled child-process probes failed. PATH=' + $script:NativePathOverride) -Evidence ([pscustomobject]@{ node = $nodeProbe; npm = $npmProbe; pwsh = $pwshProbe; git = $gitProbe }) | Out-Null
        } else {
            Add-Stage -Name 'toolchain' -Status 'PASS' -Classification 'TOOLCHAIN READY' -Summary ('Node {0}; npm {1}; PowerShell {2}; Git {3}; deterministic child PATH established.' -f $nodeProbe.stdout.Trim(), $npmProbe.stdout.Trim(), $pwshProbe.stdout.Trim(), $gitProbe.stdout.Trim()) -Evidence ([pscustomobject]@{ path = $script:NativePathOverride }) | Out-Null
        }
    }

    if (Stage-Passed 'toolchain') {
        Write-LogLine
        Write-LogLine '===== REPOSITORY IDENTITY / RERUN SAFETY ====='

        $fetch = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune') -WorkingDirectory $RepositoryRoot
        Write-NativeResult $fetch

        if ($fetch.exitCode -ne 0) {
            Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'FETCH FAILED' -Summary ('Unable to refresh task branch; git exit ' + $fetch.exitCode) -ExitCode $fetch.exitCode | Out-Null
        } else {
            $candidateProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'cat-file','-e',($CandidateSha + '^{commit}')) -WorkingDirectory $RepositoryRoot
            $remoteProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch)) -WorkingDirectory $RepositoryRoot
            $remoteHead = $remoteProbe.stdout.Trim()

            if ($candidateProbe.exitCode -ne 0 -or $remoteProbe.exitCode -ne 0) {
                Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'SOURCE IDENTITY UNAVAILABLE' -Summary 'Candidate commit or refreshed remote branch could not be resolved.' -Evidence ([pscustomobject]@{ candidateExit = $candidateProbe.exitCode; remoteExit = $remoteProbe.exitCode }) | Out-Null
            } elseif ($remoteHead -eq $CandidateSha) {
                Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'EXACT CANDIDATE AT BRANCH HEAD' -Summary ('Remote task branch is exactly the requested candidate ' + $CandidateSha + '.') | Out-Null
            } else {
                $parentProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',($remoteHead + '^')) -WorkingDirectory $RepositoryRoot
                $parent = if ($parentProbe.exitCode -eq 0) { $parentProbe.stdout.Trim() } else { '' }
                $evidenceProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($remoteHead + ':' + $PassJsonRel)) -WorkingDirectory $RepositoryRoot
                $existing = $null
                if ($evidenceProbe.exitCode -eq 0) {
                    try { $existing = $evidenceProbe.stdout | ConvertFrom-Json } catch { $existing = $null }
                }

                if ($parent -eq $CandidateSha -and $null -ne $existing -and [string]$existing.overall -eq 'PASS' -and [string]$existing.candidateSha -eq $CandidateSha) {
                    $script:AlreadyVerified = $true
                    $script:ExistingEvidenceCommit = $remoteHead
                    $script:ExistingEvidence = $existing
                    Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'ALREADY VERIFIED EVIDENCE CHILD' -Summary ('Remote head is the direct evidence-only child ' + $remoteHead + ' for requested candidate ' + $CandidateSha + '.') | Out-Null
                    Add-Stage -Name 'existing-evidence' -Status 'PASS' -Classification 'CANONICAL PASS EVIDENCE' -Summary 'Existing canonical PASS evidence matches the requested candidate; verification rerun is unnecessary.' -Evidence $existing | Out-Null
                } else {
                    Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'UNEXPECTED BRANCH DRIFT' -Summary ('Requested candidate=' + $CandidateSha + '; remoteHead=' + $remoteHead + '; directParent=' + $parent + '. No matching canonical PASS evidence child was proven.') | Out-Null
                }
            }
        }
    } else {
        Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain verification did not pass.' | Out-Null
    }

    if ($script:AlreadyVerified) {
        $script:ProductionArtifact = $script:ExistingEvidence.productionArtifact
        $script:ValidationArtifact = $script:ExistingEvidence.validationArtifact
        $script:FinalOverall = 'PASS'
    } elseif (Stage-Passed 'repository-identity') {
        Write-LogLine
        Write-LogLine '===== SCOPE / CONTRACT / CAUSALITY ====='

        $ancestor = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'merge-base','--is-ancestor',$VerificationBase,$CandidateSha) -WorkingDirectory $RepositoryRoot
        $changedResult = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff','--name-only',$VerificationBase,$CandidateSha,'--') -WorkingDirectory $RepositoryRoot
        $changed = @($changedResult.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

        $unexpected = @($changed | Where-Object {
            $value = [string]$_
            ($script:AllowedChangedPaths -notcontains $value) -and (-not $value.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal))
        })
        $contractChanges = @($changed | Where-Object { ([string]$_).StartsWith('src/contracts/', [System.StringComparison]::Ordinal) })

        $diffArgs = @('-C',$RepositoryRoot,'diff','--check',$VerificationBase,$CandidateSha,'--') + $SourceDiffCheckPaths
        $diffCheck = Invoke-Native -File $script:GitPath -Arguments $diffArgs -WorkingDirectory $RepositoryRoot
        Write-NativeResult $diffCheck

        $scopePass = $ancestor.exitCode -eq 0 -and $changedResult.exitCode -eq 0 -and $unexpected.Count -eq 0 -and $contractChanges.Count -eq 0 -and $diffCheck.exitCode -eq 0
        $scopeEvidence = [pscustomobject]@{
            changedPaths = $changed
            unexpectedPaths = $unexpected
            contractChanges = $contractChanges
            ancestorExitCode = $ancestor.exitCode
            diffCheckExitCode = $diffCheck.exitCode
            diffCheckPaths = $SourceDiffCheckPaths
        }
        if ($scopePass) {
            Add-Stage -Name 'change-scope' -Status 'PASS' -Classification 'BOUNDED PREREQUISITE' -Summary 'Candidate descends from the blocked physical-evidence anchor; changes are confined to authorized prerequisite/evidence paths; frozen contracts are unchanged; source/task/verifier diff-check passes.' -Evidence $scopeEvidence | Out-Null
        } else {
            Add-Stage -Name 'change-scope' -Status 'FAIL' -Classification 'SCOPE OR CONTRACT VIOLATION' -Summary 'Candidate failed ancestry, path-boundary, contract-freeze, or source diff-check validation.' -Evidence $scopeEvidence | Out-Null
        }

        $baseSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($VerificationBase + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
        $candidateSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
        $candidateTest = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $TestRel)) -WorkingDirectory $RepositoryRoot

        $causalPass = $baseSource.exitCode -eq 0 -and $candidateSource.exitCode -eq 0 -and $candidateTest.exitCode -eq 0 -and
            $baseSource.stdout.Contains('const root=await this.uniqueManagedRoot()') -and
            $candidateSource.stdout.Contains('const expectedParent=await this.getFile(descriptor.parentRemoteObjectId)') -and
            $candidateSource.stdout.Contains('target-parent-identity-mismatch') -and
            $candidateTest.stdout.Contains('rootSearch.value,0') -and
            $candidateTest.stdout.Contains('mutations.value,0')

        if ($causalPass) {
            Add-Stage -Name 'defect-causality' -Status 'PASS' -Classification 'OWNING DEFECT REPAIRED' -Summary 'Base used account-global root uniqueness after reserved-ID absence; candidate anchors recovery to exact parent observation/root ancestry; regression asserts no global root search and no Drive mutation.' | Out-Null
        } else {
            Add-Stage -Name 'defect-causality' -Status 'FAIL' -Classification 'CAUSAL REPAIR PROOF INCOMPLETE' -Summary 'Base-to-candidate causal markers do not prove the assigned repair and regression boundaries.' | Out-Null
        }
    } else {
        Add-Stage -Name 'change-scope' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity did not pass.' | Out-Null
        Add-Stage -Name 'defect-causality' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity did not pass.' | Out-Null
    }

    if (-not $script:AlreadyVerified) {
        if (Stage-Passed 'repository-identity' -and Stage-Passed 'change-scope') {
            Write-LogLine
            Write-LogLine '===== DISPOSABLE EXACT-SHA WORKTREE ====='
            $worktreeCreate = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'worktree','add','--detach',$Worktree,$CandidateSha) -WorkingDirectory $RepositoryRoot
            Write-NativeResult $worktreeCreate
            if ($worktreeCreate.exitCode -eq 0) {
                $script:WorktreeCreated = $true
                Add-Stage -Name 'disposable-worktree' -Status 'PASS' -Classification 'EXACT-SHA DISPOSABLE WORKTREE' -Summary ('Created GUID-isolated detached worktree at ' + $Worktree + '.') | Out-Null
            } else {
                Add-Stage -Name 'disposable-worktree' -Status 'BLOCKED' -Classification 'WORKTREE CREATION FAILED' -Summary ('git worktree add failed with exit ' + $worktreeCreate.exitCode) -ExitCode $worktreeCreate.exitCode | Out-Null
            }
        } else {
            Add-Stage -Name 'disposable-worktree' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity and bounded scope must pass before detached execution.' | Out-Null
        }

        $worktreeReady = Stage-Passed 'disposable-worktree'

        $dependencyCode = Invoke-ProcessStage -Name 'dependencies' -Classification 'DEPENDENCY INSTALL' -File $script:NpmPath -Arguments @('ci','--no-audit','--no-fund','--loglevel','info') -WorkingDirectory $Worktree -Enabled $worktreeReady -BlockedReason 'Disposable worktree is unavailable.'
        $dependenciesReady = $dependencyCode -eq 0

        [void](Invoke-ProcessStage -Name 'typecheck' -Classification 'TYPECHECK' -File $script:NpmPath -Arguments @('run','typecheck') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.')

        $productCompileCode = Invoke-ProcessStage -Name 'product-test-compile' -Classification 'PRODUCT TEST COMPILE' -File $script:NodePath -Arguments @('node_modules/typescript/bin/tsc','-p','tsconfig.test.json') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $productCompiled = $productCompileCode -eq 0

        [void](Invoke-ProcessStage -Name 'focused-folder-recovery' -Classification 'FOCUSED RECOVERY REGRESSION' -File $script:NodePath -Arguments @(
            '--test',
            '.test-build/test/workstreams/drive/phase6-remote-protocol.test.js',
            '.test-build/test/phase6-folder-remote-recovery-observation-foundation.test.js',
            '.test-build/test/workstreams/orchestration/v1.2-remote-folder-restart.test.js'
        ) -WorkingDirectory $Worktree -Enabled $productCompiled -BlockedReason 'Product test compilation did not pass.')

        [void](Invoke-TestTreeStage -Name 'complete-product-suite' -Classification 'COMPLETE PRODUCT TEST SUITE' -Root (Join-Path $Worktree '.test-build/test') -Enabled $productCompiled -BlockedReason 'Product test compilation did not pass.')

        $bvpCompileCode = Invoke-ProcessStage -Name 'bvp-compile' -Classification 'BVP COMPILE' -File $script:NodePath -Arguments @('node_modules/typescript/bin/tsc','-p','test-platform/tsconfig.json') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $bvpCompiled = $bvpCompileCode -eq 0

        [void](Invoke-TestTreeStage -Name 'complete-bvp-suite' -Classification 'COMPLETE BVP TEST SUITE' -Root (Join-Path $Worktree '.test-build/bvp/test-platform/test') -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        [void](Invoke-ProcessStage -Name 'architecture-guard' -Classification 'ARCHITECTURE GUARD' -File $script:NodePath -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-guard.test.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        [void](Invoke-ProcessStage -Name 'architecture-metrics' -Classification 'ARCHITECTURE METRICS' -File $script:NodePath -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-metrics.test.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        $contextPath = Join-Path $TempRoot 'verification-context.json'
        if ($worktreeReady) {
            $context = [ordered]@{
                schemaVersion = 1
                targetHead = $CandidateSha
                baseSha = $VerificationBase
                changedPaths = @((Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff','--name-only',$VerificationBase,$CandidateSha,'--') -WorkingDirectory $RepositoryRoot).stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            }
            [System.IO.File]::WriteAllText($contextPath, (($context | ConvertTo-Json -Depth 5) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
        }

        [void](Invoke-ProcessStage -Name 'repository-check' -Classification 'REPOSITORY CHECK' -File $script:NodePath -Arguments @('.test-build/bvp/test-platform/src/repository-check.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.' -Environment @{
            PHX_VERIFICATION_CONTEXT_PATH = $contextPath
            BVP_CHANGE_CLASS = 'ordinary'
            PWSH = $script:PwshPath
        })

        $buildCode = Invoke-ProcessStage -Name 'production-build' -Classification 'PRODUCTION BUILD' -File $script:NpmPath -Arguments @('run','build') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $buildReady = $buildCode -eq 0

        if ($buildReady) {
            try {
                $mainJs = Join-Path $Worktree 'main.js'
                if (-not (Test-Path -LiteralPath $mainJs -PathType Leaf)) {
                    Add-Stage -Name 'production-artifact' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT MISSING' -Summary 'Production build returned success but main.js is missing.' | Out-Null
                } else {
                    $mainText = [System.IO.File]::ReadAllText($mainJs)
                    $forbiddenMarkers = @(@(
                        'BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL',
                        '__BRAIN_BVP_MAILBOX_RUNTIME__',
                        '__BRAIN_BVP_DEVICE_AGENT_FACTORY__',
                        'BRAIN BVP Mailbox'
                    ) | Where-Object { $mainText.Contains($_) })
                    $script:ProductionArtifact = [pscustomobject]@{
                        sizeBytes = (Get-Item -LiteralPath $mainJs).Length
                        sha256 = Get-Sha256 $mainJs
                        forbiddenMarkerHits = $forbiddenMarkers
                    }
                    if ($script:ProductionArtifact.sizeBytes -gt 0 -and $forbiddenMarkers.Count -eq 0) {
                        Add-Stage -Name 'production-artifact' -Status 'PASS' -Classification 'PRODUCTION BUNDLE ISOLATED' -Summary ('Generated main.js is {0} bytes / {1}; validation marker hits=0.' -f $script:ProductionArtifact.sizeBytes, $script:ProductionArtifact.sha256) -Evidence $script:ProductionArtifact | Out-Null
                    } else {
                        Add-Stage -Name 'production-artifact' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT INVALID' -Summary ('Production artifact isolation failed; forbidden marker count=' + $forbiddenMarkers.Count) -Evidence $script:ProductionArtifact | Out-Null
                    }
                }
            } catch {
                Add-Stage -Name 'production-artifact' -Status 'INDETERMINATE' -Classification 'ARTIFACT INSPECTION ERROR' -Summary $_.Exception.Message | Out-Null
            }
        } else {
            Add-Stage -Name 'production-artifact' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Production build did not pass.' | Out-Null
        }

        $validationEnabled = $buildReady -and $bvpCompiled
        $validationBuildCode = Invoke-ProcessStage -Name 'validation-artifact-build' -Classification 'VALIDATION ARTIFACT BUILD' -File $script:NodePath -Arguments @('.test-build/bvp/test-platform/src/live-device/build-validation-artifact.js') -WorkingDirectory $Worktree -Enabled $validationEnabled -BlockedReason 'Production build and BVP compilation must both pass.'

        if ($validationBuildCode -eq 0) {
            try {
                $validationDir = Join-Path $Worktree '.test-build/bvp-live-device/plugin'
                $identityPath = Join-Path $validationDir 'build-identity.json'
                $artifactPath = Join-Path $validationDir 'main.js'
                if (-not (Test-Path -LiteralPath $identityPath -PathType Leaf) -or -not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
                    Add-Stage -Name 'validation-artifact' -Status 'FAIL' -Classification 'VALIDATION ARTIFACT MISSING' -Summary 'Validation artifact or build identity is missing after successful builder execution.' | Out-Null
                } else {
                    $identity = Get-Content -LiteralPath $identityPath -Raw | ConvertFrom-Json
                    $actualSize = (Get-Item -LiteralPath $artifactPath).Length
                    $actualHash = Get-Sha256 $artifactPath
                    $script:ValidationArtifact = [pscustomobject]@{
                        sourceCommit = [string]$identity.sourceCommit
                        artifactSize = [int64]$identity.artifactSize
                        artifactSha256 = [string]$identity.artifactSha256
                        actualSize = $actualSize
                        actualSha256 = $actualHash
                        manifestSha256 = [string]$identity.manifestSha256
                        testPlatformInputs = @($identity.testPlatformInputs)
                    }
                    $validIdentity = $script:ValidationArtifact.sourceCommit -eq $CandidateSha -and
                        $script:ValidationArtifact.artifactSize -eq $actualSize -and
                        $script:ValidationArtifact.artifactSha256 -eq $actualHash
                    if ($validIdentity) {
                        Add-Stage -Name 'validation-artifact' -Status 'PASS' -Classification 'EXACT VALIDATION ARTIFACT' -Summary ('Validation main.js source={0}; size={1}; sha256={2}.' -f $CandidateSha, $actualSize, $actualHash) -Evidence $script:ValidationArtifact | Out-Null
                    } else {
                        Add-Stage -Name 'validation-artifact' -Status 'FAIL' -Classification 'VALIDATION ARTIFACT IDENTITY MISMATCH' -Summary 'Validation build identity does not exactly match the candidate and generated artifact.' -Evidence $script:ValidationArtifact | Out-Null
                    }
                }
            } catch {
                Add-Stage -Name 'validation-artifact' -Status 'INDETERMINATE' -Classification 'VALIDATION ARTIFACT INSPECTION ERROR' -Summary $_.Exception.Message | Out-Null
            }
        } else {
            Add-Stage -Name 'validation-artifact' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Validation artifact builder did not pass.' | Out-Null
        }

        if ($worktreeReady) {
            $status = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'status','--porcelain','--untracked-files=all') -WorkingDirectory $Worktree
            $statusLines = @($status.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            if ($status.exitCode -eq 0 -and $statusLines.Count -eq 0) {
                Add-Stage -Name 'repository-mutation-audit' -Status 'PASS' -Classification 'NO UNEXPECTED REPOSITORY MUTATION' -Summary 'Verification left the detached candidate worktree clean; generated build/test artifacts are repository-ignored.' | Out-Null
            } elseif ($status.exitCode -eq 0) {
                Add-Stage -Name 'repository-mutation-audit' -Status 'FAIL' -Classification 'UNEXPECTED REPOSITORY MUTATION' -Summary ('Verification produced unexpected tracked/untracked changes: ' + ($statusLines -join '; ')) -Evidence $statusLines | Out-Null
            } else {
                Add-Stage -Name 'repository-mutation-audit' -Status 'INDETERMINATE' -Classification 'GIT STATUS FAILED' -Summary ('Unable to inspect detached worktree status; git exit ' + $status.exitCode) | Out-Null
            }
        } else {
            Add-Stage -Name 'repository-mutation-audit' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Disposable worktree is unavailable.' | Out-Null
        }

        $requiredStageNames = @(
            'toolchain',
            'repository-identity',
            'change-scope',
            'defect-causality',
            'disposable-worktree',
            'dependencies',
            'typecheck',
            'product-test-compile',
            'focused-folder-recovery',
            'complete-product-suite',
            'bvp-compile',
            'complete-bvp-suite',
            'architecture-guard',
            'architecture-metrics',
            'repository-check',
            'production-build',
            'production-artifact',
            'validation-artifact-build',
            'validation-artifact',
            'repository-mutation-audit'
        )

        $missingRequired = [System.Collections.Generic.List[string]]::new()
        $nonPassRequired = [System.Collections.Generic.List[string]]::new()
        foreach ($name in $requiredStageNames) {
            $stage = @(Get-Stage $name)
            if ($stage.Count -eq 0) {
                $missingRequired.Add($name)
            } elseif ($stage[-1].status -ne 'PASS') {
                $nonPassRequired.Add($name + '=' + $stage[-1].status)
            }
        }

        if ($missingRequired.Count -eq 0 -and $nonPassRequired.Count -eq 0) {
            Add-Stage -Name 'acceptance-gate' -Status 'PASS' -Classification 'ALL REQUIRED VERIFICATION PASSED' -Summary 'Every required verification layer passed; canonical evidence publication is authorized.' | Out-Null
            $script:FinalOverall = 'PASS'
        } else {
            Add-Stage -Name 'acceptance-gate' -Status 'FAIL' -Classification 'REQUIRED VERIFICATION INCOMPLETE' -Summary ('Required stages not PASS. Missing=' + ($missingRequired -join ',') + '; nonPass=' + ($nonPassRequired -join ',')) -Evidence ([pscustomobject]@{ missing = @($missingRequired); nonPass = @($nonPassRequired) }) | Out-Null
            $script:FinalOverall = 'FAIL'
        }

        if ($script:FinalOverall -eq 'PASS') {
            Write-LogLine
            Write-LogLine '===== PASS-ONLY CANONICAL EVIDENCE PUBLICATION ====='

            $evidenceDir = Join-Path $Worktree ($EvidenceRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
            [void][System.IO.Directory]::CreateDirectory($evidenceDir)

            Remove-Item -LiteralPath (Join-Path $Worktree ($FailJsonRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath (Join-Path $Worktree ($FailMdRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Force -ErrorAction SilentlyContinue

            $canonical = Write-ReportFiles -Directory $evidenceDir -Overall 'PASS' -JsonName ([System.IO.Path]::GetFileName($PassJsonRel)) -MdName ([System.IO.Path]::GetFileName($PassMdRel)) -LogName ([System.IO.Path]::GetFileName($PassLogRel))

            $evidenceStatus = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'status','--porcelain','--untracked-files=all') -WorkingDirectory $Worktree
            $evidenceLines = @($evidenceStatus.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            $outsideEvidence = @($evidenceLines | Where-Object {
                $line = [string]$_
                if ($line.Length -lt 4) { return $true }
                $relative = $line.Substring(3).Replace('\','/')
                return -not $relative.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal)
            })

            if ($evidenceStatus.exitCode -ne 0 -or $outsideEvidence.Count -gt 0) {
                Add-Stage -Name 'evidence-preparation' -Status 'FAIL' -Classification 'EVIDENCE SCOPE VIOLATION' -Summary ('PASS evidence preparation produced out-of-scope changes: ' + ($outsideEvidence -join '; ')) -Evidence $evidenceLines | Out-Null
                $script:FinalOverall = 'FAIL'
            } else {
                Add-Stage -Name 'evidence-preparation' -Status 'PASS' -Classification 'EVIDENCE-ONLY MUTATION' -Summary 'Canonical PASS evidence is the only residual repository mutation.' -Evidence $canonical | Out-Null
                $canonical = Write-ReportFiles -Directory $evidenceDir -Overall 'PASS' -JsonName ([System.IO.Path]::GetFileName($PassJsonRel)) -MdName ([System.IO.Path]::GetFileName($PassMdRel)) -LogName ([System.IO.Path]::GetFileName($PassLogRel))

                $remoteRefresh = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune') -WorkingDirectory $RepositoryRoot
                $remoteNowProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch)) -WorkingDirectory $RepositoryRoot
                $remoteNow = $remoteNowProbe.stdout.Trim()

                if ($remoteRefresh.exitCode -ne 0 -or $remoteNowProbe.exitCode -ne 0 -or $remoteNow -ne $CandidateSha) {
                    Add-Stage -Name 'evidence-publication' -Status 'BLOCKED' -Classification 'BRANCH LEASE LOST' -Summary ('Remote branch changed before PASS evidence publication. Expected ' + $CandidateSha + '; observed ' + $remoteNow + '. No evidence commit was published.') | Out-Null
                    $script:FinalOverall = 'FAIL'
                } else {
                    $add = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'add','--',$EvidenceRel) -WorkingDirectory $Worktree
                    if ($add.exitCode -ne 0) {
                        Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE STAGING FAILED' -Summary ('git add failed with exit ' + $add.exitCode) | Out-Null
                        $script:FinalOverall = 'FAIL'
                    } else {
                        $commit = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'commit','-m','test(bvp): record S08F prerequisite verification evidence') -WorkingDirectory $Worktree
                        Write-NativeResult $commit
                        if ($commit.exitCode -ne 0) {
                            Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE COMMIT FAILED' -Summary ('Evidence commit failed with exit ' + $commit.exitCode) | Out-Null
                            $script:FinalOverall = 'FAIL'
                        } else {
                            $headProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD') -WorkingDirectory $Worktree
                            $script:EvidenceCommit = $headProbe.stdout.Trim()
                            $parentProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD^') -WorkingDirectory $Worktree
                            $committedPathsProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'diff-tree','--no-commit-id','--name-only','-r','HEAD') -WorkingDirectory $Worktree
                            $committedPaths = @($committedPathsProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                            $nonEvidenceCommitted = @($committedPaths | Where-Object { -not ([string]$_).StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal) })

                            if ($headProbe.exitCode -ne 0 -or $parentProbe.exitCode -ne 0 -or $parentProbe.stdout.Trim() -ne $CandidateSha -or $nonEvidenceCommitted.Count -gt 0) {
                                Add-Stage -Name 'evidence-publication' -Status 'FAIL' -Classification 'EVIDENCE COMMIT INVARIANT FAILED' -Summary 'Prepared evidence commit is not a direct evidence-only child of the verified candidate; it was not pushed.' -Evidence ([pscustomobject]@{ parent = $parentProbe.stdout.Trim(); committedPaths = $committedPaths }) | Out-Null
                                $script:FinalOverall = 'FAIL'
                            } else {
                                $push = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'push','origin',('HEAD:refs/heads/' + $Branch)) -WorkingDirectory $Worktree
                                Write-NativeResult $push
                                if ($push.exitCode -eq 0) {
                                    Add-Stage -Name 'evidence-publication' -Status 'PASS' -Classification 'CANONICAL EVIDENCE PUBLISHED' -Summary ('Published direct evidence-only child ' + $script:EvidenceCommit + ' for verified candidate ' + $CandidateSha + '.') | Out-Null
                                } else {
                                    Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE PUSH FAILED' -Summary ('Evidence commit exists locally at ' + $script:EvidenceCommit + ' but push failed with exit ' + $push.exitCode + '. Diagnostic workspace is preserved.') | Out-Null
                                    $script:FinalOverall = 'FAIL'
                                }
                            }
                        }
                    }
                }
            }
        } else {
            Add-Stage -Name 'evidence-publication' -Status 'SKIPPED' -Classification 'PASS-ONLY PUBLICATION' -Summary 'Canonical evidence publication is intentionally skipped because verification did not reach PASS.' | Out-Null
        }
    }

    if ($script:AlreadyVerified) {
        $script:FinalOverall = 'PASS'
    } elseif ($script:FinalOverall -eq 'PASS' -and -not (Stage-Passed 'evidence-publication')) {
        $script:FinalOverall = 'FAIL'
    }

} catch {
    $script:HarnessError = $_.Exception.ToString()
    Add-Stage -Name 'harness-terminal' -Status 'INDETERMINATE' -Classification 'HARNESS ERROR' -Summary $_.Exception.Message | Out-Null
    $script:FinalOverall = 'FAIL'
} finally {
    try {
        $local = Write-ReportFiles -Directory $LocalReportDir -Overall $script:FinalOverall -JsonName 'result.json' -MdName 'result.md' -LogName 'result.log'
        if ($script:FinalOverall -eq 'FAIL') {
            Write-LogLine ('Local structured report: ' + $local.json)
        }
    } catch {
        Write-Host ('Unable to persist local structured report: ' + $_.Exception.Message)
        $script:FinalOverall = 'FAIL'
    }

    Print-FinalSummary -Overall $script:FinalOverall
    if ($script:FinalOverall -eq 'FAIL') {
        try { [System.IO.File]::WriteAllText($LocalLog, $script:Log.ToString(), [System.Text.UTF8Encoding]::new($false)) } catch {}
    }

    if ($script:FinalOverall -eq 'PASS') {
        if ($script:WorktreeCreated) {
            try {
                $remove = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'worktree','remove','--force',$Worktree) -WorkingDirectory $RepositoryRoot
                if ($remove.exitCode -ne 0) {
                    Write-Host ('WARNING: successful verification worktree cleanup failed; preserved at ' + $Worktree)
                }
            } catch {
                Write-Host ('WARNING: successful verification worktree cleanup failed: ' + $_.Exception.Message)
            }
        }
        Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
        [System.Environment]::Exit(0)
    } else {
        [System.Environment]::Exit(20)
    }
}
 -or $actualHash -ne $artifactHash) { $reasons.Add('validation-hash') }
    }

    return [pscustomobject]@{ ok=($reasons.Count -eq 0); reasons=@($reasons) }
}

function Test-EvidenceChildRecognitionModel {
    param(
        [string[]]$CommitLineTokens,
        [string[]]$ChangedPaths,
        [object]$Report
    )

    $reasons = [System.Collections.Generic.List[string]]::new()
    if (@($CommitLineTokens).Count -ne 2) {
        $reasons.Add('parent-count')
    } elseif ([string]$CommitLineTokens[1] -ne $CandidateSha) {
        $reasons.Add('parent-identity')
    }

    $outsideEvidence = @(@($ChangedPaths) | Where-Object {
        -not ([string]$_).StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal)
    })
    if ($outsideEvidence.Count -ne 0) { $reasons.Add('non-evidence-path') }

    $reportCheck = Test-CanonicalPassReport -Report $Report
    if (-not $reportCheck.ok) {
        foreach ($reason in @($reportCheck.reasons)) { $reasons.Add('report:' + [string]$reason) }
    }

    return [pscustomobject]@{ ok=($reasons.Count -eq 0); reasons=@($reasons); outsideEvidence=@($outsideEvidence) }
}

function New-SyntheticValidPassReport {
    $syntheticStages = @($RequiredVerificationStageNames | ForEach-Object { [pscustomobject]@{ name=$_; status='PASS' } })
    return [pscustomobject]@{
        schemaVersion = 2
        overall = 'PASS'
        verificationBase = $VerificationBase
        candidateSha = $CandidateSha
        branch = $Branch
        physicalMutationAttempted = $false
        productionArtifact = [pscustomobject]@{ sizeBytes=1; sha256=('a' * 64); forbiddenMarkerHits=@() }
        validationArtifact = [pscustomobject]@{ sourceCommit=$CandidateSha; artifactSize=1; actualSize=1; artifactSha256=('b' * 64); actualSha256=('b' * 64) }
        stages = $syntheticStages
    }
}

function Write-ReportFiles {
    param(
        [string]$Directory,
        [string]$Overall,
        [string]$JsonName,
        [string]$MdName,
        [string]$LogName
    )

    [void][System.IO.Directory]::CreateDirectory($Directory)

    $report = [ordered]@{
        schemaVersion = 2
        generatedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
        overall = $Overall
        verificationBase = $VerificationBase
        candidateSha = $CandidateSha
        branch = $Branch
        productionArtifact = $ProductionArtifact
        validationArtifact = $ValidationArtifact
        existingEvidenceCommit = $ExistingEvidenceCommit
        stages = Convert-StagesForReport
        diagnosticWorkspace = $TempRoot
        physicalMutationAttempted = $false
    }

    $jsonPath = Join-Path $Directory $JsonName
    $mdPath = Join-Path $Directory $MdName
    $logPath = Join-Path $Directory $LogName

    [System.IO.File]::WriteAllText($jsonPath, (($report | ConvertTo-Json -Depth 30) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))

    $md = [System.Text.StringBuilder]::new()
    [void]$md.AppendLine('# S08F Multi-Root Folder Recovery Prerequisite Verification')
    [void]$md.AppendLine()
    [void]$md.AppendLine('- Overall: ' + $Overall)
    [void]$md.AppendLine('- Candidate: ' + $CandidateSha)
    [void]$md.AppendLine('- Verification base: ' + $VerificationBase)
    [void]$md.AppendLine('- Physical mutation attempted: false')
    if ($null -ne $ProductionArtifact) {
        [void]$md.AppendLine('- Production main.js: ' + $ProductionArtifact.sizeBytes + ' bytes / ' + $ProductionArtifact.sha256)
    }
    if ($null -ne $ValidationArtifact) {
        [void]$md.AppendLine('- Validation main.js: ' + $ValidationArtifact.actualSize + ' bytes / ' + $ValidationArtifact.actualSha256)
    }
    [void]$md.AppendLine()
    [void]$md.AppendLine('| Stage | Status | Classification | Summary |')
    [void]$md.AppendLine('|---|---|---|---|')
    foreach ($stage in @($script:Stages)) {
        $summary = ([string]$stage.summary).Replace('|','\|').Replace([char]13,' ').Replace([char]10,' ')
        [void]$md.AppendLine('| ' + $stage.name + ' | ' + $stage.status + ' | ' + $stage.classification + ' | ' + $summary + ' |')
    }
    [System.IO.File]::WriteAllText($mdPath, $md.ToString(), [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($logPath, $script:Log.ToString(), [System.Text.UTF8Encoding]::new($false))

    return [pscustomobject]@{
        json = $jsonPath
        markdown = $mdPath
        log = $logPath
    }
}

function Print-FinalSummary {
    param([string]$Overall)

    Write-LogLine
    Write-LogLine '============================================================'
    Write-LogLine 'S08F PREREQUISITE VERIFICATION RESULT'
    Write-LogLine '============================================================'
    foreach ($stage in @($script:Stages)) {
        Write-LogLine ('{0,-34} {1,-13} {2}' -f $stage.name, $stage.status, $stage.summary)
    }
    Write-LogLine '------------------------------------------------------------'
    Write-LogLine ('OVERALL: {0}' -f $Overall)
    Write-LogLine ('CANDIDATE: {0}' -f $CandidateSha)
    Write-LogLine ('EVIDENCE COMMIT: {0}' -f $(if ($EvidenceCommit) { $EvidenceCommit } elseif ($ExistingEvidenceCommit) { $ExistingEvidenceCommit } else { '<none>' }))
    if ($null -ne $ProductionArtifact) {
        Write-LogLine ('PRODUCTION MAIN.JS: {0} bytes / {1}' -f $ProductionArtifact.sizeBytes, $ProductionArtifact.sha256)
    }
    if ($null -ne $ValidationArtifact) {
        Write-LogLine ('VALIDATION MAIN.JS: {0} bytes / {1}' -f $ValidationArtifact.actualSize, $ValidationArtifact.actualSha256)
    }
    if ($Overall -eq 'PASS') {
        Write-LogLine 'BLOCKING DEFECTS: NONE'
        Write-LogLine 'RECOMMENDED NEXT ACTION: independent review of the bounded prerequisite repair before physical S08F recovery resumes.'
    } else {
        $blocking = @($script:Stages | Where-Object { $_.status -in @('FAIL','BLOCKED','INDETERMINATE') })
        Write-LogLine ('BLOCKING DEFECT COUNT: {0}' -f $blocking.Count)
        Write-LogLine ('DIAGNOSTIC WORKSPACE PRESERVED: {0}' -f $TempRoot)
        Write-LogLine 'RECOMMENDED NEXT ACTION: engineering agent diagnoses and repairs the demonstrated blocker before another owner execution.'
    }
    Write-LogLine '============================================================'
}

try {
    [void][System.IO.Directory]::CreateDirectory($TempRoot)
    [void][System.IO.Directory]::CreateDirectory($LocalReportDir)

    Write-LogLine '============================================================'
    Write-LogLine 'S08F PROTOCOL-ALIGNED PREREQUISITE VERIFIER'
    Write-LogLine '============================================================'
    Write-LogLine ('Candidate: {0}' -f $CandidateSha)
    Write-LogLine ('Verification base: {0}' -f $VerificationBase)
    Write-LogLine ('Repository: {0}' -f $RepositoryRoot)
    Write-LogLine 'Physical mutation authorized: NO'

    $git = Get-Command git -ErrorAction SilentlyContinue
    $node = Get-Command node -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }
    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue

    $toolIssues = [System.Collections.Generic.List[string]]::new()
    if (-not (Test-Path -LiteralPath $RepositoryRoot -PathType Container)) { $toolIssues.Add('repository-root-unavailable') }
    if ($null -eq $git) { $toolIssues.Add('git-unavailable') }
    if ($null -eq $node) { $toolIssues.Add('node-unavailable') }
    if ($null -eq $npm) { $toolIssues.Add('npm-unavailable') }
    if ($null -eq $pwsh) { $toolIssues.Add('pwsh-unavailable') }

    if ($toolIssues.Count -gt 0) {
        Add-Stage -Name 'toolchain' -Status 'BLOCKED' -Classification 'TOOLCHAIN UNAVAILABLE' -Summary ($toolIssues -join ', ') | Out-Null
    } else {
        $script:GitPath = $git.Source
        $script:NodePath = $node.Source
        $script:NpmPath = $npm.Source
        $script:PwshPath = $pwsh.Source

        $pathParts = [System.Collections.Generic.List[string]]::new()
        foreach ($candidatePath in @(
            (Split-Path -Parent $script:NodePath),
            (Split-Path -Parent $script:GitPath),
            (Split-Path -Parent $script:PwshPath),
            (Join-Path $env:SystemRoot 'System32'),
            $env:SystemRoot,
            (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0')
        )) {
            if (-not [string]::IsNullOrWhiteSpace([string]$candidatePath) -and (Test-Path -LiteralPath $candidatePath -PathType Container) -and -not $pathParts.Contains($candidatePath)) {
                [void]$pathParts.Add($candidatePath)
            }
        }
        $script:NativePathOverride = $pathParts -join [System.IO.Path]::PathSeparator

        $nodeProbe = Invoke-Native -File $script:NodePath -Arguments @('--version') -WorkingDirectory $RepositoryRoot
        $npmProbe = Invoke-Native -File $script:NpmPath -Arguments @('--version') -WorkingDirectory $RepositoryRoot
        $pwshProbe = Invoke-Native -File $script:PwshPath -Arguments @('-NoProfile','-Command','$PSVersionTable.PSVersion.ToString()') -WorkingDirectory $RepositoryRoot
        $gitProbe = Invoke-Native -File $script:GitPath -Arguments @('--version') -WorkingDirectory $RepositoryRoot

        $failedToolProbes = @(@($nodeProbe,$npmProbe,$pwshProbe,$gitProbe) | Where-Object { $_.exitCode -ne 0 })
        if ($failedToolProbes.Count -gt 0) {
            Add-Stage -Name 'toolchain' -Status 'BLOCKED' -Classification 'TOOLCHAIN PROBE FAILED' -Summary ('One or more controlled child-process probes failed. PATH=' + $script:NativePathOverride) -Evidence ([pscustomobject]@{ node = $nodeProbe; npm = $npmProbe; pwsh = $pwshProbe; git = $gitProbe }) | Out-Null
        } else {
            Add-Stage -Name 'toolchain' -Status 'PASS' -Classification 'TOOLCHAIN READY' -Summary ('Node {0}; npm {1}; PowerShell {2}; Git {3}; deterministic child PATH established.' -f $nodeProbe.stdout.Trim(), $npmProbe.stdout.Trim(), $pwshProbe.stdout.Trim(), $gitProbe.stdout.Trim()) -Evidence ([pscustomobject]@{ path = $script:NativePathOverride }) | Out-Null
        }
    }

    if (Stage-Passed 'toolchain') {
        Write-LogLine
        Write-LogLine '===== REPOSITORY IDENTITY / RERUN SAFETY ====='

        $fetch = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune') -WorkingDirectory $RepositoryRoot
        Write-NativeResult $fetch

        if ($fetch.exitCode -ne 0) {
            Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'FETCH FAILED' -Summary ('Unable to refresh task branch; git exit ' + $fetch.exitCode) -ExitCode $fetch.exitCode | Out-Null
        } else {
            $candidateProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'cat-file','-e',($CandidateSha + '^{commit}')) -WorkingDirectory $RepositoryRoot
            $remoteProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch)) -WorkingDirectory $RepositoryRoot
            $remoteHead = $remoteProbe.stdout.Trim()

            if ($candidateProbe.exitCode -ne 0 -or $remoteProbe.exitCode -ne 0) {
                Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'SOURCE IDENTITY UNAVAILABLE' -Summary 'Candidate commit or refreshed remote branch could not be resolved.' -Evidence ([pscustomobject]@{ candidateExit = $candidateProbe.exitCode; remoteExit = $remoteProbe.exitCode }) | Out-Null
            } elseif ($remoteHead -eq $CandidateSha) {
                Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'EXACT CANDIDATE AT BRANCH HEAD' -Summary ('Remote task branch is exactly the requested candidate ' + $CandidateSha + '.') | Out-Null
            } else {
                $parentProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',($remoteHead + '^')) -WorkingDirectory $RepositoryRoot
                $parent = if ($parentProbe.exitCode -eq 0) { $parentProbe.stdout.Trim() } else { '' }
                $evidenceProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($remoteHead + ':' + $PassJsonRel)) -WorkingDirectory $RepositoryRoot
                $existing = $null
                if ($evidenceProbe.exitCode -eq 0) {
                    try { $existing = $evidenceProbe.stdout | ConvertFrom-Json } catch { $existing = $null }
                }

                if ($parent -eq $CandidateSha -and $null -ne $existing -and [string]$existing.overall -eq 'PASS' -and [string]$existing.candidateSha -eq $CandidateSha) {
                    $script:AlreadyVerified = $true
                    $script:ExistingEvidenceCommit = $remoteHead
                    $script:ExistingEvidence = $existing
                    Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'ALREADY VERIFIED EVIDENCE CHILD' -Summary ('Remote head is the direct evidence-only child ' + $remoteHead + ' for requested candidate ' + $CandidateSha + '.') | Out-Null
                    Add-Stage -Name 'existing-evidence' -Status 'PASS' -Classification 'CANONICAL PASS EVIDENCE' -Summary 'Existing canonical PASS evidence matches the requested candidate; verification rerun is unnecessary.' -Evidence $existing | Out-Null
                } else {
                    Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'UNEXPECTED BRANCH DRIFT' -Summary ('Requested candidate=' + $CandidateSha + '; remoteHead=' + $remoteHead + '; directParent=' + $parent + '. No matching canonical PASS evidence child was proven.') | Out-Null
                }
            }
        }
    } else {
        Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain verification did not pass.' | Out-Null
    }

    if ($script:AlreadyVerified) {
        $script:ProductionArtifact = $script:ExistingEvidence.productionArtifact
        $script:ValidationArtifact = $script:ExistingEvidence.validationArtifact
        $script:FinalOverall = 'PASS'
    } elseif (Stage-Passed 'repository-identity') {
        Write-LogLine
        Write-LogLine '===== SCOPE / CONTRACT / CAUSALITY ====='

        $ancestor = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'merge-base','--is-ancestor',$VerificationBase,$CandidateSha) -WorkingDirectory $RepositoryRoot
        $changedResult = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff','--name-only',$VerificationBase,$CandidateSha,'--') -WorkingDirectory $RepositoryRoot
        $changed = @($changedResult.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })

        $unexpected = @($changed | Where-Object {
            $value = [string]$_
            ($script:AllowedChangedPaths -notcontains $value) -and (-not $value.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal))
        })
        $contractChanges = @($changed | Where-Object { ([string]$_).StartsWith('src/contracts/', [System.StringComparison]::Ordinal) })

        $diffArgs = @('-C',$RepositoryRoot,'diff','--check',$VerificationBase,$CandidateSha,'--') + $SourceDiffCheckPaths
        $diffCheck = Invoke-Native -File $script:GitPath -Arguments $diffArgs -WorkingDirectory $RepositoryRoot
        Write-NativeResult $diffCheck

        $scopePass = $ancestor.exitCode -eq 0 -and $changedResult.exitCode -eq 0 -and $unexpected.Count -eq 0 -and $contractChanges.Count -eq 0 -and $diffCheck.exitCode -eq 0
        $scopeEvidence = [pscustomobject]@{
            changedPaths = $changed
            unexpectedPaths = $unexpected
            contractChanges = $contractChanges
            ancestorExitCode = $ancestor.exitCode
            diffCheckExitCode = $diffCheck.exitCode
            diffCheckPaths = $SourceDiffCheckPaths
        }
        if ($scopePass) {
            Add-Stage -Name 'change-scope' -Status 'PASS' -Classification 'BOUNDED PREREQUISITE' -Summary 'Candidate descends from the blocked physical-evidence anchor; changes are confined to authorized prerequisite/evidence paths; frozen contracts are unchanged; source/task/verifier diff-check passes.' -Evidence $scopeEvidence | Out-Null
        } else {
            Add-Stage -Name 'change-scope' -Status 'FAIL' -Classification 'SCOPE OR CONTRACT VIOLATION' -Summary 'Candidate failed ancestry, path-boundary, contract-freeze, or source diff-check validation.' -Evidence $scopeEvidence | Out-Null
        }

        $baseSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($VerificationBase + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
        $candidateSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
        $candidateTest = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $TestRel)) -WorkingDirectory $RepositoryRoot

        $causalPass = $baseSource.exitCode -eq 0 -and $candidateSource.exitCode -eq 0 -and $candidateTest.exitCode -eq 0 -and
            $baseSource.stdout.Contains('const root=await this.uniqueManagedRoot()') -and
            $candidateSource.stdout.Contains('const expectedParent=await this.getFile(descriptor.parentRemoteObjectId)') -and
            $candidateSource.stdout.Contains('target-parent-identity-mismatch') -and
            $candidateTest.stdout.Contains('rootSearch.value,0') -and
            $candidateTest.stdout.Contains('mutations.value,0')

        if ($causalPass) {
            Add-Stage -Name 'defect-causality' -Status 'PASS' -Classification 'OWNING DEFECT REPAIRED' -Summary 'Base used account-global root uniqueness after reserved-ID absence; candidate anchors recovery to exact parent observation/root ancestry; regression asserts no global root search and no Drive mutation.' | Out-Null
        } else {
            Add-Stage -Name 'defect-causality' -Status 'FAIL' -Classification 'CAUSAL REPAIR PROOF INCOMPLETE' -Summary 'Base-to-candidate causal markers do not prove the assigned repair and regression boundaries.' | Out-Null
        }
    } else {
        Add-Stage -Name 'change-scope' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity did not pass.' | Out-Null
        Add-Stage -Name 'defect-causality' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity did not pass.' | Out-Null
    }

    if (-not $script:AlreadyVerified) {
        if (Stage-Passed 'repository-identity' -and Stage-Passed 'change-scope') {
            Write-LogLine
            Write-LogLine '===== DISPOSABLE EXACT-SHA WORKTREE ====='
            $worktreeCreate = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'worktree','add','--detach',$Worktree,$CandidateSha) -WorkingDirectory $RepositoryRoot
            Write-NativeResult $worktreeCreate
            if ($worktreeCreate.exitCode -eq 0) {
                $script:WorktreeCreated = $true
                Add-Stage -Name 'disposable-worktree' -Status 'PASS' -Classification 'EXACT-SHA DISPOSABLE WORKTREE' -Summary ('Created GUID-isolated detached worktree at ' + $Worktree + '.') | Out-Null
            } else {
                Add-Stage -Name 'disposable-worktree' -Status 'BLOCKED' -Classification 'WORKTREE CREATION FAILED' -Summary ('git worktree add failed with exit ' + $worktreeCreate.exitCode) -ExitCode $worktreeCreate.exitCode | Out-Null
            }
        } else {
            Add-Stage -Name 'disposable-worktree' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Repository identity and bounded scope must pass before detached execution.' | Out-Null
        }

        $worktreeReady = Stage-Passed 'disposable-worktree'

        $dependencyCode = Invoke-ProcessStage -Name 'dependencies' -Classification 'DEPENDENCY INSTALL' -File $script:NpmPath -Arguments @('ci','--no-audit','--no-fund','--loglevel','info') -WorkingDirectory $Worktree -Enabled $worktreeReady -BlockedReason 'Disposable worktree is unavailable.'
        $dependenciesReady = $dependencyCode -eq 0

        [void](Invoke-ProcessStage -Name 'typecheck' -Classification 'TYPECHECK' -File $script:NpmPath -Arguments @('run','typecheck') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.')

        $productCompileCode = Invoke-ProcessStage -Name 'product-test-compile' -Classification 'PRODUCT TEST COMPILE' -File $script:NodePath -Arguments @('node_modules/typescript/bin/tsc','-p','tsconfig.test.json') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $productCompiled = $productCompileCode -eq 0

        [void](Invoke-ProcessStage -Name 'focused-folder-recovery' -Classification 'FOCUSED RECOVERY REGRESSION' -File $script:NodePath -Arguments @(
            '--test',
            '.test-build/test/workstreams/drive/phase6-remote-protocol.test.js',
            '.test-build/test/phase6-folder-remote-recovery-observation-foundation.test.js',
            '.test-build/test/workstreams/orchestration/v1.2-remote-folder-restart.test.js'
        ) -WorkingDirectory $Worktree -Enabled $productCompiled -BlockedReason 'Product test compilation did not pass.')

        [void](Invoke-TestTreeStage -Name 'complete-product-suite' -Classification 'COMPLETE PRODUCT TEST SUITE' -Root (Join-Path $Worktree '.test-build/test') -Enabled $productCompiled -BlockedReason 'Product test compilation did not pass.')

        $bvpCompileCode = Invoke-ProcessStage -Name 'bvp-compile' -Classification 'BVP COMPILE' -File $script:NodePath -Arguments @('node_modules/typescript/bin/tsc','-p','test-platform/tsconfig.json') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $bvpCompiled = $bvpCompileCode -eq 0

        [void](Invoke-TestTreeStage -Name 'complete-bvp-suite' -Classification 'COMPLETE BVP TEST SUITE' -Root (Join-Path $Worktree '.test-build/bvp/test-platform/test') -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        [void](Invoke-ProcessStage -Name 'architecture-guard' -Classification 'ARCHITECTURE GUARD' -File $script:NodePath -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-guard.test.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        [void](Invoke-ProcessStage -Name 'architecture-metrics' -Classification 'ARCHITECTURE METRICS' -File $script:NodePath -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-metrics.test.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.')

        $contextPath = Join-Path $TempRoot 'verification-context.json'
        if ($worktreeReady) {
            $context = [ordered]@{
                schemaVersion = 1
                targetHead = $CandidateSha
                baseSha = $VerificationBase
                changedPaths = @((Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff','--name-only',$VerificationBase,$CandidateSha,'--') -WorkingDirectory $RepositoryRoot).stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            }
            [System.IO.File]::WriteAllText($contextPath, (($context | ConvertTo-Json -Depth 5) + [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
        }

        [void](Invoke-ProcessStage -Name 'repository-check' -Classification 'REPOSITORY CHECK' -File $script:NodePath -Arguments @('.test-build/bvp/test-platform/src/repository-check.js') -WorkingDirectory $Worktree -Enabled $bvpCompiled -BlockedReason 'BVP compilation did not pass.' -Environment @{
            PHX_VERIFICATION_CONTEXT_PATH = $contextPath
            BVP_CHANGE_CLASS = 'ordinary'
            PWSH = $script:PwshPath
        })

        $buildCode = Invoke-ProcessStage -Name 'production-build' -Classification 'PRODUCTION BUILD' -File $script:NpmPath -Arguments @('run','build') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $buildReady = $buildCode -eq 0

        if ($buildReady) {
            try {
                $mainJs = Join-Path $Worktree 'main.js'
                if (-not (Test-Path -LiteralPath $mainJs -PathType Leaf)) {
                    Add-Stage -Name 'production-artifact' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT MISSING' -Summary 'Production build returned success but main.js is missing.' | Out-Null
                } else {
                    $mainText = [System.IO.File]::ReadAllText($mainJs)
                    $forbiddenMarkers = @(@(
                        'BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL',
                        '__BRAIN_BVP_MAILBOX_RUNTIME__',
                        '__BRAIN_BVP_DEVICE_AGENT_FACTORY__',
                        'BRAIN BVP Mailbox'
                    ) | Where-Object { $mainText.Contains($_) })
                    $script:ProductionArtifact = [pscustomobject]@{
                        sizeBytes = (Get-Item -LiteralPath $mainJs).Length
                        sha256 = Get-Sha256 $mainJs
                        forbiddenMarkerHits = $forbiddenMarkers
                    }
                    if ($script:ProductionArtifact.sizeBytes -gt 0 -and $forbiddenMarkers.Count -eq 0) {
                        Add-Stage -Name 'production-artifact' -Status 'PASS' -Classification 'PRODUCTION BUNDLE ISOLATED' -Summary ('Generated main.js is {0} bytes / {1}; validation marker hits=0.' -f $script:ProductionArtifact.sizeBytes, $script:ProductionArtifact.sha256) -Evidence $script:ProductionArtifact | Out-Null
                    } else {
                        Add-Stage -Name 'production-artifact' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT INVALID' -Summary ('Production artifact isolation failed; forbidden marker count=' + $forbiddenMarkers.Count) -Evidence $script:ProductionArtifact | Out-Null
                    }
                }
            } catch {
                Add-Stage -Name 'production-artifact' -Status 'INDETERMINATE' -Classification 'ARTIFACT INSPECTION ERROR' -Summary $_.Exception.Message | Out-Null
            }
        } else {
            Add-Stage -Name 'production-artifact' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Production build did not pass.' | Out-Null
        }

        $validationEnabled = $buildReady -and $bvpCompiled
        $validationBuildCode = Invoke-ProcessStage -Name 'validation-artifact-build' -Classification 'VALIDATION ARTIFACT BUILD' -File $script:NodePath -Arguments @('.test-build/bvp/test-platform/src/live-device/build-validation-artifact.js') -WorkingDirectory $Worktree -Enabled $validationEnabled -BlockedReason 'Production build and BVP compilation must both pass.'

        if ($validationBuildCode -eq 0) {
            try {
                $validationDir = Join-Path $Worktree '.test-build/bvp-live-device/plugin'
                $identityPath = Join-Path $validationDir 'build-identity.json'
                $artifactPath = Join-Path $validationDir 'main.js'
                if (-not (Test-Path -LiteralPath $identityPath -PathType Leaf) -or -not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
                    Add-Stage -Name 'validation-artifact' -Status 'FAIL' -Classification 'VALIDATION ARTIFACT MISSING' -Summary 'Validation artifact or build identity is missing after successful builder execution.' | Out-Null
                } else {
                    $identity = Get-Content -LiteralPath $identityPath -Raw | ConvertFrom-Json
                    $actualSize = (Get-Item -LiteralPath $artifactPath).Length
                    $actualHash = Get-Sha256 $artifactPath
                    $script:ValidationArtifact = [pscustomobject]@{
                        sourceCommit = [string]$identity.sourceCommit
                        artifactSize = [int64]$identity.artifactSize
                        artifactSha256 = [string]$identity.artifactSha256
                        actualSize = $actualSize
                        actualSha256 = $actualHash
                        manifestSha256 = [string]$identity.manifestSha256
                        testPlatformInputs = @($identity.testPlatformInputs)
                    }
                    $validIdentity = $script:ValidationArtifact.sourceCommit -eq $CandidateSha -and
                        $script:ValidationArtifact.artifactSize -eq $actualSize -and
                        $script:ValidationArtifact.artifactSha256 -eq $actualHash
                    if ($validIdentity) {
                        Add-Stage -Name 'validation-artifact' -Status 'PASS' -Classification 'EXACT VALIDATION ARTIFACT' -Summary ('Validation main.js source={0}; size={1}; sha256={2}.' -f $CandidateSha, $actualSize, $actualHash) -Evidence $script:ValidationArtifact | Out-Null
                    } else {
                        Add-Stage -Name 'validation-artifact' -Status 'FAIL' -Classification 'VALIDATION ARTIFACT IDENTITY MISMATCH' -Summary 'Validation build identity does not exactly match the candidate and generated artifact.' -Evidence $script:ValidationArtifact | Out-Null
                    }
                }
            } catch {
                Add-Stage -Name 'validation-artifact' -Status 'INDETERMINATE' -Classification 'VALIDATION ARTIFACT INSPECTION ERROR' -Summary $_.Exception.Message | Out-Null
            }
        } else {
            Add-Stage -Name 'validation-artifact' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Validation artifact builder did not pass.' | Out-Null
        }

        if ($worktreeReady) {
            $status = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'status','--porcelain','--untracked-files=all') -WorkingDirectory $Worktree
            $statusLines = @($status.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            if ($status.exitCode -eq 0 -and $statusLines.Count -eq 0) {
                Add-Stage -Name 'repository-mutation-audit' -Status 'PASS' -Classification 'NO UNEXPECTED REPOSITORY MUTATION' -Summary 'Verification left the detached candidate worktree clean; generated build/test artifacts are repository-ignored.' | Out-Null
            } elseif ($status.exitCode -eq 0) {
                Add-Stage -Name 'repository-mutation-audit' -Status 'FAIL' -Classification 'UNEXPECTED REPOSITORY MUTATION' -Summary ('Verification produced unexpected tracked/untracked changes: ' + ($statusLines -join '; ')) -Evidence $statusLines | Out-Null
            } else {
                Add-Stage -Name 'repository-mutation-audit' -Status 'INDETERMINATE' -Classification 'GIT STATUS FAILED' -Summary ('Unable to inspect detached worktree status; git exit ' + $status.exitCode) | Out-Null
            }
        } else {
            Add-Stage -Name 'repository-mutation-audit' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Disposable worktree is unavailable.' | Out-Null
        }

        $requiredStageNames = @(
            'toolchain',
            'repository-identity',
            'change-scope',
            'defect-causality',
            'disposable-worktree',
            'dependencies',
            'typecheck',
            'product-test-compile',
            'focused-folder-recovery',
            'complete-product-suite',
            'bvp-compile',
            'complete-bvp-suite',
            'architecture-guard',
            'architecture-metrics',
            'repository-check',
            'production-build',
            'production-artifact',
            'validation-artifact-build',
            'validation-artifact',
            'repository-mutation-audit'
        )

        $missingRequired = [System.Collections.Generic.List[string]]::new()
        $nonPassRequired = [System.Collections.Generic.List[string]]::new()
        foreach ($name in $requiredStageNames) {
            $stage = @(Get-Stage $name)
            if ($stage.Count -eq 0) {
                $missingRequired.Add($name)
            } elseif ($stage[-1].status -ne 'PASS') {
                $nonPassRequired.Add($name + '=' + $stage[-1].status)
            }
        }

        if ($missingRequired.Count -eq 0 -and $nonPassRequired.Count -eq 0) {
            Add-Stage -Name 'acceptance-gate' -Status 'PASS' -Classification 'ALL REQUIRED VERIFICATION PASSED' -Summary 'Every required verification layer passed; canonical evidence publication is authorized.' | Out-Null
            $script:FinalOverall = 'PASS'
        } else {
            Add-Stage -Name 'acceptance-gate' -Status 'FAIL' -Classification 'REQUIRED VERIFICATION INCOMPLETE' -Summary ('Required stages not PASS. Missing=' + ($missingRequired -join ',') + '; nonPass=' + ($nonPassRequired -join ',')) -Evidence ([pscustomobject]@{ missing = @($missingRequired); nonPass = @($nonPassRequired) }) | Out-Null
            $script:FinalOverall = 'FAIL'
        }

        if ($script:FinalOverall -eq 'PASS') {
            Write-LogLine
            Write-LogLine '===== PASS-ONLY CANONICAL EVIDENCE PUBLICATION ====='

            $evidenceDir = Join-Path $Worktree ($EvidenceRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
            [void][System.IO.Directory]::CreateDirectory($evidenceDir)

            Remove-Item -LiteralPath (Join-Path $Worktree ($FailJsonRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath (Join-Path $Worktree ($FailMdRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))) -Force -ErrorAction SilentlyContinue

            $canonical = Write-ReportFiles -Directory $evidenceDir -Overall 'PASS' -JsonName ([System.IO.Path]::GetFileName($PassJsonRel)) -MdName ([System.IO.Path]::GetFileName($PassMdRel)) -LogName ([System.IO.Path]::GetFileName($PassLogRel))

            $evidenceStatus = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'status','--porcelain','--untracked-files=all') -WorkingDirectory $Worktree
            $evidenceLines = @($evidenceStatus.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            $outsideEvidence = @($evidenceLines | Where-Object {
                $line = [string]$_
                if ($line.Length -lt 4) { return $true }
                $relative = $line.Substring(3).Replace('\','/')
                return -not $relative.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal)
            })

            if ($evidenceStatus.exitCode -ne 0 -or $outsideEvidence.Count -gt 0) {
                Add-Stage -Name 'evidence-preparation' -Status 'FAIL' -Classification 'EVIDENCE SCOPE VIOLATION' -Summary ('PASS evidence preparation produced out-of-scope changes: ' + ($outsideEvidence -join '; ')) -Evidence $evidenceLines | Out-Null
                $script:FinalOverall = 'FAIL'
            } else {
                Add-Stage -Name 'evidence-preparation' -Status 'PASS' -Classification 'EVIDENCE-ONLY MUTATION' -Summary 'Canonical PASS evidence is the only residual repository mutation.' -Evidence $canonical | Out-Null
                $canonical = Write-ReportFiles -Directory $evidenceDir -Overall 'PASS' -JsonName ([System.IO.Path]::GetFileName($PassJsonRel)) -MdName ([System.IO.Path]::GetFileName($PassMdRel)) -LogName ([System.IO.Path]::GetFileName($PassLogRel))

                $remoteRefresh = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune') -WorkingDirectory $RepositoryRoot
                $remoteNowProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch)) -WorkingDirectory $RepositoryRoot
                $remoteNow = $remoteNowProbe.stdout.Trim()

                if ($remoteRefresh.exitCode -ne 0 -or $remoteNowProbe.exitCode -ne 0 -or $remoteNow -ne $CandidateSha) {
                    Add-Stage -Name 'evidence-publication' -Status 'BLOCKED' -Classification 'BRANCH LEASE LOST' -Summary ('Remote branch changed before PASS evidence publication. Expected ' + $CandidateSha + '; observed ' + $remoteNow + '. No evidence commit was published.') | Out-Null
                    $script:FinalOverall = 'FAIL'
                } else {
                    $add = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'add','--',$EvidenceRel) -WorkingDirectory $Worktree
                    if ($add.exitCode -ne 0) {
                        Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE STAGING FAILED' -Summary ('git add failed with exit ' + $add.exitCode) | Out-Null
                        $script:FinalOverall = 'FAIL'
                    } else {
                        $commit = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'commit','-m','test(bvp): record S08F prerequisite verification evidence') -WorkingDirectory $Worktree
                        Write-NativeResult $commit
                        if ($commit.exitCode -ne 0) {
                            Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE COMMIT FAILED' -Summary ('Evidence commit failed with exit ' + $commit.exitCode) | Out-Null
                            $script:FinalOverall = 'FAIL'
                        } else {
                            $headProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD') -WorkingDirectory $Worktree
                            $script:EvidenceCommit = $headProbe.stdout.Trim()
                            $parentProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD^') -WorkingDirectory $Worktree
                            $committedPathsProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'diff-tree','--no-commit-id','--name-only','-r','HEAD') -WorkingDirectory $Worktree
                            $committedPaths = @($committedPathsProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                            $nonEvidenceCommitted = @($committedPaths | Where-Object { -not ([string]$_).StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal) })

                            if ($headProbe.exitCode -ne 0 -or $parentProbe.exitCode -ne 0 -or $parentProbe.stdout.Trim() -ne $CandidateSha -or $nonEvidenceCommitted.Count -gt 0) {
                                Add-Stage -Name 'evidence-publication' -Status 'FAIL' -Classification 'EVIDENCE COMMIT INVARIANT FAILED' -Summary 'Prepared evidence commit is not a direct evidence-only child of the verified candidate; it was not pushed.' -Evidence ([pscustomobject]@{ parent = $parentProbe.stdout.Trim(); committedPaths = $committedPaths }) | Out-Null
                                $script:FinalOverall = 'FAIL'
                            } else {
                                $push = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'push','origin',('HEAD:refs/heads/' + $Branch)) -WorkingDirectory $Worktree
                                Write-NativeResult $push
                                if ($push.exitCode -eq 0) {
                                    Add-Stage -Name 'evidence-publication' -Status 'PASS' -Classification 'CANONICAL EVIDENCE PUBLISHED' -Summary ('Published direct evidence-only child ' + $script:EvidenceCommit + ' for verified candidate ' + $CandidateSha + '.') | Out-Null
                                } else {
                                    Add-Stage -Name 'evidence-publication' -Status 'INDETERMINATE' -Classification 'EVIDENCE PUSH FAILED' -Summary ('Evidence commit exists locally at ' + $script:EvidenceCommit + ' but push failed with exit ' + $push.exitCode + '. Diagnostic workspace is preserved.') | Out-Null
                                    $script:FinalOverall = 'FAIL'
                                }
                            }
                        }
                    }
                }
            }
        } else {
            Add-Stage -Name 'evidence-publication' -Status 'SKIPPED' -Classification 'PASS-ONLY PUBLICATION' -Summary 'Canonical evidence publication is intentionally skipped because verification did not reach PASS.' | Out-Null
        }
    }

    if ($script:AlreadyVerified) {
        $script:FinalOverall = 'PASS'
    } elseif ($script:FinalOverall -eq 'PASS' -and -not (Stage-Passed 'evidence-publication')) {
        $script:FinalOverall = 'FAIL'
    }

} catch {
    $script:HarnessError = $_.Exception.ToString()
    Add-Stage -Name 'harness-terminal' -Status 'INDETERMINATE' -Classification 'HARNESS ERROR' -Summary $_.Exception.Message | Out-Null
    $script:FinalOverall = 'FAIL'
} finally {
    try {
        $local = Write-ReportFiles -Directory $LocalReportDir -Overall $script:FinalOverall -JsonName 'result.json' -MdName 'result.md' -LogName 'result.log'
        if ($script:FinalOverall -eq 'FAIL') {
            Write-LogLine ('Local structured report: ' + $local.json)
        }
    } catch {
        Write-Host ('Unable to persist local structured report: ' + $_.Exception.Message)
        $script:FinalOverall = 'FAIL'
    }

    Print-FinalSummary -Overall $script:FinalOverall
    if ($script:FinalOverall -eq 'FAIL') {
        try { [System.IO.File]::WriteAllText($LocalLog, $script:Log.ToString(), [System.Text.UTF8Encoding]::new($false)) } catch {}
    }

    if ($script:FinalOverall -eq 'PASS') {
        if ($script:WorktreeCreated) {
            try {
                $remove = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'worktree','remove','--force',$Worktree) -WorkingDirectory $RepositoryRoot
                if ($remove.exitCode -ne 0) {
                    Write-Host ('WARNING: successful verification worktree cleanup failed; preserved at ' + $Worktree)
                }
            } catch {
                Write-Host ('WARNING: successful verification worktree cleanup failed: ' + $_.Exception.Message)
            }
        }
        Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
        [System.Environment]::Exit(0)
    } else {
        [System.Environment]::Exit(20)
    }
}
