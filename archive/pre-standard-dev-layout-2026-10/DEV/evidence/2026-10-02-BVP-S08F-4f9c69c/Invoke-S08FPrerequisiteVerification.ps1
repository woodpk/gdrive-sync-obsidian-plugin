[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RepositoryRoot,
    [Parameter(Mandatory = $true)][string]$Branch,
    [Parameter(Mandatory = $true)][string]$CandidateSha
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$InputCandidateSha = $CandidateSha

$VerificationBase = '39cf1ff62fb927aba9d2ee49f99724d9ce1f2856'
$EvidenceRel = 'dev/evidence/2026-10-02-BVP-S08F-4f9c69c'
$TaskRel = 'dev/agents/st2a/ph6/05-bvp/08-thin-live-device-agent-production-receipt-comman/08f-desktop-live-canary-and-production-bundle-isolation-proof.md'
$SourceRel = 'src/drive/google-drive-port.ts'
$TestRel = 'test/workstreams/drive/phase6-remote-protocol.test.ts'
$VerifierRel = $EvidenceRel + '/Invoke-S08FPrerequisiteVerification.ps1'
$PassJsonRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.json'
$PassMdRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-PASS.md'
$PassLogRel = $EvidenceRel + '/S08F-PREREQ-VERIFY.log'
$CanonicalEvidencePaths = @($PassJsonRel,$PassMdRel,$PassLogRel)
$FailJsonRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-FAIL.json'
$FailMdRel = $EvidenceRel + '/S08F-PREREQ-VERIFY-FAIL.md'

$ArtifactRebindTestRel = 'test-platform/test/s08b-validation-build-entrypoint.test.ts'
$DownstreamRecoveryTestRel = 'test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts'
$AllowedChangedPaths = @($TaskRel, $SourceRel, $TestRel, $VerifierRel, $ArtifactRebindTestRel, $DownstreamRecoveryTestRel)
$SourceDiffCheckPaths = @($TaskRel, $SourceRel, $TestRel, $VerifierRel, $ArtifactRebindTestRel, $DownstreamRecoveryTestRel)
$CoreVerificationStageNames = @(
    'toolchain',
    'rerun-recognition-self-check',
    'publication-verdict-self-check',
    'publication-lease-self-check',
    'repository-identity',
    'change-scope',
    'defect-causality',
    'disposable-worktree',
    'dependencies',
    'artifact-rebind-build',
    'artifact-rebind',
    'post-rebind-scope',
    'post-rebind-causality',
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
$CanonicalPassStageNames = @($CoreVerificationStageNames) + @('acceptance-gate','evidence-preparation')

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
$AcceptedProductionSha256 = $null
$ArtifactRebindCommit = $null
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

function Has-ObjectProperty {
    param([object]$Object,[string]$Name)
    return $null -ne $Object -and $null -ne $Object.PSObject.Properties[$Name]
}

function Get-ObjectProperty {
    param([object]$Object,[string]$Name)
    if (-not (Has-ObjectProperty $Object $Name)) { return $null }
    return $Object.PSObject.Properties[$Name].Value
}

function Get-CandidateRecognitionFacts {
    param([string]$Candidate)

    $reasons=[System.Collections.Generic.List[string]]::new()
    $parentsProbe=Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-list','--parents','-n','1',$Candidate) -WorkingDirectory $RepositoryRoot
    $pathsProbe=Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff-tree','--no-commit-id','--name-only','-r',$Candidate) -WorkingDirectory $RepositoryRoot
    $testProbe=Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($Candidate + ':' + $ArtifactRebindTestRel)) -WorkingDirectory $RepositoryRoot

    $parentTokens=@()
    $changedPaths=@()
    $acceptedHash=$null

    if ($parentsProbe.exitCode -ne 0) { $reasons.Add('candidate-parent-inspection-failed') }
    else { $parentTokens=@($parentsProbe.stdout.Trim() -split '\s+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) }

    if ($pathsProbe.exitCode -ne 0) { $reasons.Add('candidate-path-inspection-failed') }
    else { $changedPaths=@($pathsProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) }

    if ($testProbe.exitCode -ne 0) {
        $reasons.Add('candidate-s08b-read-failed')
    } else {
        $hashPattern='(?ms)const\s+acceptedProductionSha256\s*=\s*\r?\n?\s*"([0-9a-f]{64})"\s*;'
        $matches=@([regex]::Matches($testProbe.stdout,$hashPattern))
        if ($matches.Count -ne 1) { $reasons.Add('candidate-s08b-hash-cardinality') }
        else { $acceptedHash=[string]$matches[0].Groups[1].Value }
    }

    return [pscustomobject]@{
        ok=($reasons.Count -eq 0)
        reasons=@($reasons)
        parentTokens=@($parentTokens)
        changedPaths=@($changedPaths)
        acceptedProductionSha256=$acceptedHash
    }
}

function Test-CanonicalPassReport {
    param([object]$Report,[object]$CandidateFacts)

    $reasons=[System.Collections.Generic.List[string]]::new()
    if ($null -eq $Report) { $reasons.Add('report-missing'); return [pscustomobject]@{ok=$false;reasons=@($reasons)} }
    foreach($requiredProperty in @('schemaVersion','overall','verificationBase','inputCandidateSha','candidateSha','branch','physicalMutationAttempted','acceptedProductionSha256','artifactRebindCommit','stages','productionArtifact','validationArtifact')) {
        if (-not (Has-ObjectProperty $Report $requiredProperty)) { $reasons.Add('missing-property:' + $requiredProperty) }
    }
    if ($reasons.Count -gt 0) { return [pscustomobject]@{ok=$false;reasons=@($reasons)} }

    if ([int](Get-ObjectProperty $Report 'schemaVersion') -ne 2) { $reasons.Add('schema-version') }
    if ([string](Get-ObjectProperty $Report 'overall') -ne 'PASS') { $reasons.Add('overall') }
    if ([string](Get-ObjectProperty $Report 'verificationBase') -ne $VerificationBase) { $reasons.Add('verification-base') }

    $reportInputCandidate=[string](Get-ObjectProperty $Report 'inputCandidateSha')
    $reportCandidate=[string](Get-ObjectProperty $Report 'candidateSha')
    $reportRebind=[string](Get-ObjectProperty $Report 'artifactRebindCommit')
    $acceptedHash=[string](Get-ObjectProperty $Report 'acceptedProductionSha256')

    if ($reportInputCandidate -notmatch '^[0-9a-f]{40}$') { $reasons.Add('input-candidate-sha') }
    if ($reportCandidate -ne $CandidateSha) { $reasons.Add('candidate-sha') }
    if ([string](Get-ObjectProperty $Report 'branch') -ne $Branch) { $reasons.Add('branch') }
    if ((Get-ObjectProperty $Report 'physicalMutationAttempted') -ne $false) { $reasons.Add('physical-mutation-flag') }
    if ($acceptedHash -notmatch '^[0-9a-f]{64}$') { $reasons.Add('accepted-production-hash-format') }

    if ($null -eq $CandidateFacts -or -not (Has-ObjectProperty $CandidateFacts 'ok') -or $CandidateFacts.ok -ne $true) {
        $reasons.Add('candidate-facts-unproven')
    } else {
        if ([string]$CandidateFacts.acceptedProductionSha256 -ne $acceptedHash) { $reasons.Add('candidate-s08b-hash-mismatch') }
        if ([string]::IsNullOrWhiteSpace($reportRebind)) {
            if ($reportInputCandidate -ne $reportCandidate) { $reasons.Add('unexpected-input-candidate') }
        } else {
            if ($reportRebind -ne $reportCandidate -or $reportInputCandidate -eq $reportCandidate) { $reasons.Add('artifact-rebind-identity') }
            $candidateParents=@($CandidateFacts.parentTokens)
            if ($candidateParents.Count -ne 2 -or [string]$candidateParents[0] -ne $reportCandidate -or [string]$candidateParents[1] -ne $reportInputCandidate) { $reasons.Add('artifact-rebind-lineage') }
            $candidatePaths=@($CandidateFacts.changedPaths)
            if ($candidatePaths.Count -ne 1 -or [string]$candidatePaths[0] -ne $ArtifactRebindTestRel) { $reasons.Add('artifact-rebind-scope') }
        }
    }

    $stages=@((Get-ObjectProperty $Report 'stages'))
    foreach($requiredName in $CanonicalPassStageNames) {
        $matches=@($stages | Where-Object { (Get-ObjectProperty $_ 'name') -eq $requiredName })
        if ($matches.Count -ne 1 -or [string](Get-ObjectProperty $matches[0] 'status') -ne 'PASS') { $reasons.Add('required-stage:' + $requiredName) }
    }
    if (@($stages | Where-Object { [string](Get-ObjectProperty $_ 'status') -ne 'PASS' }).Count -ne 0) { $reasons.Add('non-pass-stage-present') }

    $production=Get-ObjectProperty $Report 'productionArtifact'
    if ($null -eq $production) {
        $reasons.Add('production-artifact-missing')
    } else {
        foreach($name in @('sizeBytes','sha256','forbiddenMarkerHits')) { if (-not (Has-ObjectProperty $production $name)) { $reasons.Add('production-missing:' + $name) } }
        if ((Has-ObjectProperty $production 'sizeBytes') -and [int64](Get-ObjectProperty $production 'sizeBytes') -le 0) { $reasons.Add('production-size') }
        if ((Has-ObjectProperty $production 'sha256') -and [string](Get-ObjectProperty $production 'sha256') -notmatch '^[0-9a-f]{64}$') { $reasons.Add('production-hash') }
        if ($acceptedHash -ne [string](Get-ObjectProperty $production 'sha256')) { $reasons.Add('accepted-production-hash') }
        if ((Has-ObjectProperty $production 'forbiddenMarkerHits') -and @((Get-ObjectProperty $production 'forbiddenMarkerHits')).Count -ne 0) { $reasons.Add('production-markers') }
    }

    $productionStage=@($stages | Where-Object { [string](Get-ObjectProperty $_ 'name') -eq 'production-artifact' })
    if ($productionStage.Count -eq 1) {
        $stageEvidence=Get-ObjectProperty $productionStage[0] 'evidence'
        if ($null -eq $stageEvidence) { $reasons.Add('production-stage-evidence-missing') }
        elseif ([string](Get-ObjectProperty $stageEvidence 'sha256') -ne [string](Get-ObjectProperty $production 'sha256') -or
                [int64](Get-ObjectProperty $stageEvidence 'sizeBytes') -ne [int64](Get-ObjectProperty $production 'sizeBytes')) { $reasons.Add('production-stage-artifact-mismatch') }
    }

    $validation=Get-ObjectProperty $Report 'validationArtifact'
    if ($null -eq $validation) {
        $reasons.Add('validation-artifact-missing')
    } else {
        foreach($name in @('sourceCommit','artifactSize','artifactSha256','actualSize','actualSha256')) { if (-not (Has-ObjectProperty $validation $name)) { $reasons.Add('validation-missing:' + $name) } }
        if ((Has-ObjectProperty $validation 'sourceCommit') -and [string](Get-ObjectProperty $validation 'sourceCommit') -ne $CandidateSha) { $reasons.Add('validation-source') }
        if ((Has-ObjectProperty $validation 'artifactSize') -and (Has-ObjectProperty $validation 'actualSize')) {
            $artifactSize=[int64](Get-ObjectProperty $validation 'artifactSize'); $actualSize=[int64](Get-ObjectProperty $validation 'actualSize')
            if ($artifactSize -le 0 -or $actualSize -le 0 -or $artifactSize -ne $actualSize) { $reasons.Add('validation-size') }
        }
        if ((Has-ObjectProperty $validation 'artifactSha256') -and (Has-ObjectProperty $validation 'actualSha256')) {
            $artifactHash=[string](Get-ObjectProperty $validation 'artifactSha256'); $actualHash=[string](Get-ObjectProperty $validation 'actualSha256')
            if ($artifactHash -notmatch '^[0-9a-f]{64}$' -or $actualHash -ne $artifactHash) { $reasons.Add('validation-hash') }
        }
    }

    $validationStage=@($stages | Where-Object { [string](Get-ObjectProperty $_ 'name') -eq 'validation-artifact' })
    if ($validationStage.Count -eq 1) {
        $stageEvidence=Get-ObjectProperty $validationStage[0] 'evidence'
        if ($null -eq $stageEvidence) { $reasons.Add('validation-stage-evidence-missing') }
        elseif ([string](Get-ObjectProperty $stageEvidence 'sourceCommit') -ne [string](Get-ObjectProperty $validation 'sourceCommit') -or
                [string](Get-ObjectProperty $stageEvidence 'actualSha256') -ne [string](Get-ObjectProperty $validation 'actualSha256') -or
                [int64](Get-ObjectProperty $stageEvidence 'actualSize') -ne [int64](Get-ObjectProperty $validation 'actualSize')) { $reasons.Add('validation-stage-artifact-mismatch') }
    }

    $rebindStage=@($stages | Where-Object { [string](Get-ObjectProperty $_ 'name') -eq 'artifact-rebind' })
    if ($rebindStage.Count -eq 1) {
        $stageEvidence=Get-ObjectProperty $rebindStage[0] 'evidence'
        if ($null -eq $stageEvidence) { $reasons.Add('artifact-rebind-stage-evidence-missing') }
        elseif (-not [string]::IsNullOrWhiteSpace($reportRebind)) {
            $stagePaths=@((Get-ObjectProperty $stageEvidence 'changedPaths'))
            if ((Get-ObjectProperty $stageEvidence 'changed') -ne $true -or
                [string](Get-ObjectProperty $stageEvidence 'inputCandidate') -ne $reportInputCandidate -or
                [string](Get-ObjectProperty $stageEvidence 'verifiedCandidate') -ne $reportCandidate -or
                [string](Get-ObjectProperty $stageEvidence 'productionSha256') -ne $acceptedHash -or
                $stagePaths.Count -ne 1 -or [string]$stagePaths[0] -ne $ArtifactRebindTestRel) { $reasons.Add('artifact-rebind-stage-mismatch') }
        }
    }

    return [pscustomobject]@{ok=($reasons.Count -eq 0);reasons=@($reasons)}
}

function Test-EvidenceChildRecognitionModel {
    param([string[]]$CommitLineTokens,[string[]]$ChangedPaths,[object]$Report,[object]$CandidateFacts)

    $reasons=[System.Collections.Generic.List[string]]::new()
    if (@($CommitLineTokens).Count -ne 2) { $reasons.Add('parent-count') }
    elseif ([string]$CommitLineTokens[1] -ne $CandidateSha) { $reasons.Add('parent-identity') }

    $paths=@($ChangedPaths)
    $unexpected=@($paths | Where-Object { $CanonicalEvidencePaths -notcontains [string]$_ })
    $missing=@($CanonicalEvidencePaths | Where-Object { $paths -notcontains [string]$_ })
    if ($unexpected.Count -ne 0) { $reasons.Add('noncanonical-evidence-path') }
    if ($missing.Count -ne 0) { $reasons.Add('missing-canonical-evidence-path') }

    $reportCheck=Test-CanonicalPassReport -Report $Report -CandidateFacts $CandidateFacts
    if (-not $reportCheck.ok) { foreach($reason in @($reportCheck.reasons)) { $reasons.Add('report:' + [string]$reason) } }

    return [pscustomobject]@{ok=($reasons.Count -eq 0);reasons=@($reasons);unexpectedPaths=@($unexpected);missingPaths=@($missing)}
}

function New-SyntheticValidPassReport {
    $syntheticInput='1111111111111111111111111111111111111111'
    $accepted='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    $validationHash='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    $syntheticStages=@($CanonicalPassStageNames | ForEach-Object { [pscustomobject]@{name=$_;status='PASS';evidence=$null} })
    (@($syntheticStages | Where-Object { $_.name -eq 'production-artifact' }))[0].evidence=[pscustomobject]@{sizeBytes=1;sha256=$accepted;forbiddenMarkerHits=@()}
    (@($syntheticStages | Where-Object { $_.name -eq 'validation-artifact' }))[0].evidence=[pscustomobject]@{sourceCommit=$CandidateSha;artifactSize=1;artifactSha256=$validationHash;actualSize=1;actualSha256=$validationHash}
    (@($syntheticStages | Where-Object { $_.name -eq 'artifact-rebind' }))[0].evidence=[pscustomobject]@{inputCandidate=$syntheticInput;verifiedCandidate=$CandidateSha;previousSha256=('d' * 64);productionSha256=$accepted;changed=$true;changedPaths=@($ArtifactRebindTestRel)}
    return [pscustomobject]@{
        schemaVersion=2
        overall='PASS'
        verificationBase=$VerificationBase
        inputCandidateSha=$syntheticInput
        candidateSha=$CandidateSha
        branch=$Branch
        physicalMutationAttempted=$false
        acceptedProductionSha256=$accepted
        artifactRebindCommit=$CandidateSha
        stages=$syntheticStages
        productionArtifact=[pscustomobject]@{sizeBytes=1;sha256=$accepted;forbiddenMarkerHits=@()}
        validationArtifact=[pscustomobject]@{sourceCommit=$CandidateSha;artifactSize=1;artifactSha256=$validationHash;actualSize=1;actualSha256=$validationHash}
    }
}

function New-SyntheticCandidateFacts {
    return [pscustomobject]@{
        ok=$true
        reasons=@()
        parentTokens=@($CandidateSha,'1111111111111111111111111111111111111111')
        changedPaths=@($ArtifactRebindTestRel)
        acceptedProductionSha256='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }
}

function Resolve-LocalReportFailureVerdict {
    param([string]$CurrentOverall,[bool]$AuthoritativePassAlreadyExists)
    if ($CurrentOverall -eq 'PASS' -and $AuthoritativePassAlreadyExists) { return 'PASS' }
    return 'FAIL'
}
function Invoke-PublicationLeaseRaceSelfCheck {
    $root=Join-Path $TempRoot 'publication-lease-self-check'
    $work=Join-Path $root 'work'
    $origin=Join-Path $root 'origin.git'
    [void][System.IO.Directory]::CreateDirectory($root)

    $steps=[System.Collections.Generic.List[object]]::new()
    function Run-LeaseStep {
        param([string[]]$Arguments,[string]$WorkingDirectory)
        $result=Invoke-Native -File $script:GitPath -Arguments $Arguments -WorkingDirectory $WorkingDirectory
        $steps.Add($result)
        return $result
    }

    $initWork=Run-LeaseStep -Arguments @('init',$work) -WorkingDirectory $root
    if ($initWork.exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='work-init';steps=@($steps)} }
    if ((Run-LeaseStep -Arguments @('-C',$work,'config','user.email','s08f-verifier@example.invalid') -WorkingDirectory $work).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='user-email';steps=@($steps)} }
    if ((Run-LeaseStep -Arguments @('-C',$work,'config','user.name','S08F Verifier') -WorkingDirectory $work).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='user-name';steps=@($steps)} }
    if ((Run-LeaseStep -Arguments @('-C',$work,'commit','--allow-empty','-m','base') -WorkingDirectory $work).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='base-commit';steps=@($steps)} }
    $baseProbe=Run-LeaseStep -Arguments @('-C',$work,'rev-parse','HEAD') -WorkingDirectory $work
    $base=$baseProbe.stdout.Trim()
    if ((Run-LeaseStep -Arguments @('-C',$work,'commit','--allow-empty','-m','candidate') -WorkingDirectory $work).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='candidate-commit';steps=@($steps)} }
    $candidateProbe=Run-LeaseStep -Arguments @('-C',$work,'rev-parse','HEAD') -WorkingDirectory $work
    $candidate=$candidateProbe.stdout.Trim()

    if ((Run-LeaseStep -Arguments @('init','--bare',$origin) -WorkingDirectory $root).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='origin-init';steps=@($steps)} }
    if ((Run-LeaseStep -Arguments @('-C',$work,'remote','add','origin',$origin) -WorkingDirectory $work).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='remote-add';steps=@($steps)} }
    if ((Run-LeaseStep -Arguments @('-C',$work,'push','origin','HEAD:refs/heads/lease') -WorkingDirectory $work).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='initial-push';steps=@($steps)} }

    if ((Run-LeaseStep -Arguments @('-C',$work,'commit','--allow-empty','-m','evidence') -WorkingDirectory $work).exitCode -ne 0) { return [pscustomobject]@{ok=$false;reason='evidence-commit';steps=@($steps)} }
    $evidenceProbe=Run-LeaseStep -Arguments @('-C',$work,'rev-parse','HEAD') -WorkingDirectory $work
    $evidence=$evidenceProbe.stdout.Trim()
    $fastForwardProof=Run-LeaseStep -Arguments @('-C',$work,'merge-base','--is-ancestor',$base,$evidence) -WorkingDirectory $work

    $remoteBeforeProbe=Run-LeaseStep -Arguments @('--git-dir',$origin,'rev-parse','refs/heads/lease') -WorkingDirectory $root
    $remoteBefore=$remoteBeforeProbe.stdout.Trim()
    if ($remoteBeforeProbe.exitCode -ne 0 -or $remoteBefore -ne $candidate) {
        return [pscustomobject]@{ok=$false;reason='race-precondition';expectedRemote=$candidate;observedRemote=$remoteBefore;steps=@($steps)}
    }

    $reset=Run-LeaseStep -Arguments @('--git-dir',$origin,'update-ref','refs/heads/lease',$base,$candidate) -WorkingDirectory $root
    if ($reset.exitCode -ne 0) {
        return [pscustomobject]@{ok=$false;reason='race-reset';expectedOld=$candidate;newValue=$base;stderr=$reset.stderr;stdout=$reset.stdout;steps=@($steps)}
    }

    $remoteResetProbe=Run-LeaseStep -Arguments @('--git-dir',$origin,'rev-parse','refs/heads/lease') -WorkingDirectory $root
    $remoteReset=$remoteResetProbe.stdout.Trim()
    if ($remoteResetProbe.exitCode -ne 0 -or $remoteReset -ne $base) {
        return [pscustomobject]@{ok=$false;reason='race-reset-observation';expectedRemote=$base;observedRemote=$remoteReset;steps=@($steps)}
    }

    $leasedPush=Run-LeaseStep -Arguments @('-C',$work,'push',('--force-with-lease=refs/heads/lease:' + $candidate),'origin','HEAD:refs/heads/lease') -WorkingDirectory $work
    $remoteAfterProbe=Run-LeaseStep -Arguments @('--git-dir',$origin,'rev-parse','refs/heads/lease') -WorkingDirectory $root
    $remoteAfter=$remoteAfterProbe.stdout.Trim()

    return [pscustomobject]@{
        ok=($fastForwardProof.exitCode -eq 0 -and $leasedPush.exitCode -ne 0 -and $remoteAfterProbe.exitCode -eq 0 -and $remoteAfter -eq $base)
        reason='race-injection'
        base=$base
        candidate=$candidate
        evidence=$evidence
        remoteBefore=$remoteBefore
        remoteReset=$remoteReset
        leasedPushExit=$leasedPush.exitCode
        leasedPushStderr=$leasedPush.stderr
        remoteAfter=$remoteAfter
        steps=@($steps)
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
        inputCandidateSha = $InputCandidateSha
        candidateSha = $CandidateSha
        branch = $Branch
        acceptedProductionSha256 = $AcceptedProductionSha256
        artifactRebindCommit = $ArtifactRebindCommit
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
    Write-LogLine ('INPUT CANDIDATE: {0}' -f $InputCandidateSha)
    Write-LogLine ('VERIFIED CANDIDATE: {0}' -f $CandidateSha)
    Write-LogLine ('ARTIFACT REBIND COMMIT: {0}' -f $(if ($ArtifactRebindCommit) { $ArtifactRebindCommit } else { '<none>' }))
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
    Write-LogLine ('Input candidate: {0}' -f $InputCandidateSha)
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
        $syntheticValid=New-SyntheticValidPassReport
        $syntheticFacts=New-SyntheticCandidateFacts
        $syntheticEvidencePaths=@($CanonicalEvidencePaths)

        $validModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha) -ChangedPaths $syntheticEvidencePaths -Report $syntheticValid -CandidateFacts $syntheticFacts
        $outOfScopeModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha) -ChangedPaths (@($syntheticEvidencePaths)+@('src/drive/unexpected.ts')) -Report $syntheticValid -CandidateFacts $syntheticFacts
        $verifierMutationModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha) -ChangedPaths (@($syntheticEvidencePaths)+@($VerifierRel)) -Report $syntheticValid -CandidateFacts $syntheticFacts
        $mergeModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha,'other-parent') -ChangedPaths $syntheticEvidencePaths -Report $syntheticValid -CandidateFacts $syntheticFacts

        $incomplete=New-SyntheticValidPassReport
        $incomplete.stages=@($incomplete.stages | Where-Object { $_.name -ne 'complete-product-suite' })
        $incompleteModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha) -ChangedPaths $syntheticEvidencePaths -Report $incomplete -CandidateFacts $syntheticFacts

        $fabricated=[pscustomobject]@{schemaVersion=2;overall='PASS';candidateSha=$CandidateSha}
        $fabricatedModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha) -ChangedPaths $syntheticEvidencePaths -Report $fabricated -CandidateFacts $syntheticFacts

        $unrelatedInput=New-SyntheticValidPassReport
        $unrelatedInput.inputCandidateSha='2222222222222222222222222222222222222222'
        $unrelatedInputModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha) -ChangedPaths $syntheticEvidencePaths -Report $unrelatedInput -CandidateFacts $syntheticFacts

        $contradictoryProduction=New-SyntheticValidPassReport
        $contradictoryProductionStage=@($contradictoryProduction.stages | Where-Object { $_.name -eq 'production-artifact' })
        $contradictoryProductionStage[0].evidence.sha256='cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
        $contradictoryProductionModel=Test-EvidenceChildRecognitionModel -CommitLineTokens @('synthetic-evidence-child',$CandidateSha) -ChangedPaths $syntheticEvidencePaths -Report $contradictoryProduction -CandidateFacts $syntheticFacts

        $recognitionSelfCheckEvidence=[pscustomobject]@{
            valid=$validModel
            outOfScope=$outOfScopeModel
            verifierMutation=$verifierMutationModel
            multiParent=$mergeModel
            incomplete=$incompleteModel
            fabricated=$fabricatedModel
            unrelatedInput=$unrelatedInputModel
            contradictoryProduction=$contradictoryProductionModel
        }

        if ($validModel.ok -and
            -not $outOfScopeModel.ok -and
            -not $verifierMutationModel.ok -and
            -not $mergeModel.ok -and
            -not $incompleteModel.ok -and
            -not $fabricatedModel.ok -and
            -not $unrelatedInputModel.ok -and
            -not $contradictoryProductionModel.ok) {
            Add-Stage -Name 'rerun-recognition-self-check' -Status 'PASS' -Classification 'FAIL-CLOSED RERUN RECOGNITION' -Summary 'Coherent canonical evidence is accepted; out-of-scope, semantic-verifier, multi-parent, incomplete, fabricated, false-lineage, and contradictory-artifact evidence is rejected.' -Evidence $recognitionSelfCheckEvidence | Out-Null
        } else {
            Add-Stage -Name 'rerun-recognition-self-check' -Status 'FAIL' -Classification 'RERUN RECOGNITION SELF-CHECK FAILED' -Summary 'One or more synthetic evidence attacks were not rejected, or the coherent model was rejected.' -Evidence $recognitionSelfCheckEvidence | Out-Null
        }

        if ((Resolve-LocalReportFailureVerdict -CurrentOverall 'PASS' -AuthoritativePassAlreadyExists $true) -eq 'PASS' -and
            (Resolve-LocalReportFailureVerdict -CurrentOverall 'PASS' -AuthoritativePassAlreadyExists $false) -eq 'FAIL' -and
            (Resolve-LocalReportFailureVerdict -CurrentOverall 'FAIL' -AuthoritativePassAlreadyExists $true) -eq 'FAIL') {
            Add-Stage -Name 'publication-verdict-self-check' -Status 'PASS' -Classification 'POST-PUBLICATION VERDICT STABILITY' -Summary 'Injected report-failure decision model preserves authoritative published PASS and fails closed before publication.' | Out-Null
        } else {
            Add-Stage -Name 'publication-verdict-self-check' -Status 'FAIL' -Classification 'POST-PUBLICATION VERDICT SELF-CHECK FAILED' -Summary 'Post-publication report-failure decision model is unsafe.' | Out-Null
        }
    } else {
        Add-Stage -Name 'rerun-recognition-self-check' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain verification did not pass.' | Out-Null
        Add-Stage -Name 'publication-verdict-self-check' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain verification did not pass.' | Out-Null
    }

    if (Stage-Passed 'toolchain') {
        try {
            $leaseSelfCheck=Invoke-PublicationLeaseRaceSelfCheck
            if ($leaseSelfCheck.ok) {
                Add-Stage -Name 'publication-lease-self-check' -Status 'PASS' -Classification 'ATOMIC BRANCH LEASE RACE REJECTION' -Summary 'Synthetic remote reset between pre-check and push was rejected by the exact lease while the local publication remained a fast-forward from the reset ancestor.' -Evidence $leaseSelfCheck | Out-Null
            } else {
                Add-Stage -Name 'publication-lease-self-check' -Status 'FAIL' -Classification 'ATOMIC BRANCH LEASE SELF-CHECK FAILED' -Summary ('Synthetic lease race test failed at ' + $leaseSelfCheck.reason + '.') -Evidence $leaseSelfCheck | Out-Null
            }
        } catch {
            Add-Stage -Name 'publication-lease-self-check' -Status 'INDETERMINATE' -Classification 'ATOMIC BRANCH LEASE SELF-CHECK ERROR' -Summary $_.Exception.Message | Out-Null
        }
    } else {
        Add-Stage -Name 'publication-lease-self-check' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain verification did not pass.' | Out-Null
    }

    if (Stage-Passed 'toolchain' -and Stage-Passed 'rerun-recognition-self-check' -and Stage-Passed 'publication-verdict-self-check' -and Stage-Passed 'publication-lease-self-check') {
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
                $parentsProbe=Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'rev-list','--parents','-n','1',$remoteHead) -WorkingDirectory $RepositoryRoot
                $commitTokens=@($parentsProbe.stdout.Trim() -split '\s+' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                $pathsProbe=Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff-tree','--no-commit-id','--name-only','-r',$remoteHead) -WorkingDirectory $RepositoryRoot
                $childPaths=@($pathsProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                $evidenceProbe=Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($remoteHead + ':' + $PassJsonRel)) -WorkingDirectory $RepositoryRoot
                $existing=$null; if ($evidenceProbe.exitCode -eq 0) { try { $existing=$evidenceProbe.stdout | ConvertFrom-Json } catch { $existing=$null } }
                $candidateFacts=Get-CandidateRecognitionFacts -Candidate $CandidateSha
                if ($parentsProbe.exitCode -eq 0 -and $pathsProbe.exitCode -eq 0 -and $candidateFacts.ok) {
                    $recognition=Test-EvidenceChildRecognitionModel -CommitLineTokens $commitTokens -ChangedPaths $childPaths -Report $existing -CandidateFacts $candidateFacts
                } else {
                    $recognition=[pscustomobject]@{ok=$false;reasons=@('git-topology-or-candidate-facts-inspection-failed');candidateFacts=$candidateFacts}
                }
                if ($recognition.ok) {
                    $script:AlreadyVerified=$true; $script:ExistingEvidenceCommit=$remoteHead; $script:ExistingEvidence=$existing
                    Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'ALREADY VERIFIED EVIDENCE CHILD' -Summary ('Remote head is a single-parent evidence-only child ' + $remoteHead + ' with complete canonical PASS evidence for requested candidate ' + $CandidateSha + '.') -Evidence ([pscustomobject]@{changedPaths=$childPaths;recognition=$recognition}) | Out-Null
                    Add-Stage -Name 'existing-evidence' -Status 'PASS' -Classification 'CANONICAL PASS EVIDENCE' -Summary 'Existing evidence passed topology, path-scope, schema, required-stage, physical-mutation, and artifact-identity validation.' -Evidence $existing | Out-Null
                } else {
                    Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'UNEXPECTED BRANCH DRIFT' -Summary ('Requested candidate=' + $CandidateSha + '; remoteHead=' + $remoteHead + '; strict recognition failed: ' + (@($recognition.reasons) -join ',')) -Evidence ([pscustomobject]@{commitTokens=$commitTokens;changedPaths=$childPaths;recognition=$recognition}) | Out-Null
                }
            }
        }
    } else {
        Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Toolchain or verifier self-check did not pass.' | Out-Null
    }

    if ($script:AlreadyVerified) {
        $script:ProductionArtifact = $script:ExistingEvidence.productionArtifact
        $script:ValidationArtifact = $script:ExistingEvidence.validationArtifact
        $script:AcceptedProductionSha256 = [string]$script:ExistingEvidence.acceptedProductionSha256
        $script:ArtifactRebindCommit = [string]$script:ExistingEvidence.artifactRebindCommit
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
        $downstreamTest = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $DownstreamRecoveryTestRel)) -WorkingDirectory $RepositoryRoot
        $forbiddenFallback = 'else if(expectedParent.signal.kind==="not-found"){const root=await this.uniqueManagedRoot()'
        $causalPass = $baseSource.exitCode -eq 0 -and $candidateSource.exitCode -eq 0 -and $candidateTest.exitCode -eq 0 -and $downstreamTest.exitCode -eq 0 -and
            $baseSource.stdout.Contains('const root=await this.uniqueManagedRoot()') -and
            $candidateSource.stdout.Contains('const expectedParent=await this.getFile(descriptor.parentRemoteObjectId)') -and
            $candidateSource.stdout.Contains('if(!expectedParent.ok)return') -and
            -not $candidateSource.stdout.Contains($forbiddenFallback) -and
            $candidateSource.stdout.Contains('expected-parent-identity-incomplete') -and
            $candidateSource.stdout.Contains('expected-parent-identity-mismatch') -and
            $candidateSource.stdout.Contains('expected-parent-live-state-incomplete') -and
            $candidateSource.stdout.Contains('observedExpectedParentTrashed!==false') -and
            $candidateSource.stdout.Contains('target-parent-identity-mismatch') -and
            $candidateTest.stdout.Contains('expected-parent-unobservable:not-found') -and
            $candidateTest.stdout.Contains('mismatched exact-parent response identity remains unobservable') -and
            $candidateTest.stdout.Contains('missing exact-parent response identity remains unobservable') -and
            $candidateTest.stdout.Contains('missing explicit exact-parent live state remains unobservable') -and
            $candidateTest.stdout.Contains('parentPathSearch.value,0') -and
            $candidateTest.stdout.Contains('rootSearch.value,0') -and
            $candidateTest.stdout.Contains('mutations.value,0') -and
            $downstreamTest.stdout.Contains('missing or replaced expected parent remains recovery-pending and non-redispatchable') -and
            $downstreamTest.stdout.Contains('expected-parent-identity-mismatch') -and
            $downstreamTest.stdout.Contains('expected-parent-identity-incomplete') -and
            $downstreamTest.stdout.Contains('expected-parent-live-state-incomplete') -and
            $downstreamTest.stdout.Contains('assert.equal(result.status, "recovery-required")')

        if ($causalPass) {
            Add-Stage -Name 'defect-causality' -Status 'PASS' -Classification 'OWNING DEFECT REPAIRED' -Summary 'Candidate requires successful exact-parent JSON to prove requested identity, explicit live state, folder shape, ancestry, and resolved path identity; malformed/missing/replaced parent regressions remain read-only and recovery-pending.' | Out-Null
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

        $rebindBuildCode = Invoke-ProcessStage -Name 'artifact-rebind-build' -Classification 'PRE-VERIFICATION PRODUCTION BUILD' -File $script:NodePath -Arguments @('scripts/build.mjs') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $rebindBuildReady = $rebindBuildCode -eq 0
        if ($rebindBuildReady) {
            try {
                $rebindMain = Join-Path $Worktree 'main.js'
                $rebindTestPath = Join-Path $Worktree ($ArtifactRebindTestRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
                if (-not (Test-Path -LiteralPath $rebindMain -PathType Leaf)) { throw 'pre-verification production build returned success but main.js is missing' }
                if (-not (Test-Path -LiteralPath $rebindTestPath -PathType Leaf)) { throw 'S08B validation-build test is missing' }
                $observedProductionHash = Get-Sha256 $rebindMain
                $testText = [System.IO.File]::ReadAllText($rebindTestPath)
                $hashPattern = '(?ms)(const\s+acceptedProductionSha256\s*=\s*\r?\n?\s*")([0-9a-f]{64})("\s*;)'
                $hashMatches = @([regex]::Matches($testText,$hashPattern))
                if ($hashMatches.Count -ne 1) { throw ('expected exactly one acceptedProductionSha256 constant; observed ' + $hashMatches.Count) }
                $currentAcceptedHash = [string]$hashMatches[0].Groups[2].Value
                if ($currentAcceptedHash -eq $observedProductionHash) {
                    $script:AcceptedProductionSha256 = $observedProductionHash
                    Add-Stage -Name 'artifact-rebind' -Status 'PASS' -Classification 'ARTIFACT IDENTITY ALREADY CURRENT' -Summary ('S08B accepted production SHA already equals deterministic build hash ' + $observedProductionHash + '; no implementation child commit required.') -Evidence ([pscustomobject]@{ inputCandidate=$InputCandidateSha; verifiedCandidate=$CandidateSha; productionSha256=$observedProductionHash; changed=$false }) | Out-Null
                } else {
                    $replacement = $hashMatches[0].Groups[1].Value + $observedProductionHash + $hashMatches[0].Groups[3].Value
                    $newText = $testText.Substring(0,$hashMatches[0].Index) + $replacement + $testText.Substring($hashMatches[0].Index + $hashMatches[0].Length)
                    [System.IO.File]::WriteAllText($rebindTestPath,$newText,[System.Text.UTF8Encoding]::new($false))
                    $changedProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'diff','--name-only','--') -WorkingDirectory $Worktree
                    $changedPaths = @($changedProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                    $diffCheckProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'diff','--check','--',$ArtifactRebindTestRel) -WorkingDirectory $Worktree
                    if ($changedProbe.exitCode -ne 0 -or $diffCheckProbe.exitCode -ne 0 -or $changedPaths.Count -ne 1 -or $changedPaths[0] -ne $ArtifactRebindTestRel) { throw ('artifact rebind scope invariant failed: ' + ($changedPaths -join ',')) }
                    $addProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'add','--',$ArtifactRebindTestRel) -WorkingDirectory $Worktree
                    if ($addProbe.exitCode -ne 0) { throw 'unable to stage bounded artifact rebind' }
                    $commitProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'commit','-m','test(bvp): rebind accepted S08F production bundle hash after review repair') -WorkingDirectory $Worktree
                    Write-NativeResult $commitProbe
                    if ($commitProbe.exitCode -ne 0) { throw ('artifact rebind commit failed with exit ' + $commitProbe.exitCode) }
                    $headProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD') -WorkingDirectory $Worktree
                    $parentProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'rev-parse','HEAD^') -WorkingDirectory $Worktree
                    $pathsProbe = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'diff-tree','--no-commit-id','--name-only','-r','HEAD') -WorkingDirectory $Worktree
                    $commitPaths = @($pathsProbe.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
                    if ($headProbe.exitCode -ne 0 -or $parentProbe.exitCode -ne 0 -or $pathsProbe.exitCode -ne 0 -or $parentProbe.stdout.Trim() -ne $InputCandidateSha -or $commitPaths.Count -ne 1 -or $commitPaths[0] -ne $ArtifactRebindTestRel) { throw 'artifact rebind commit invariant failed' }
                    $script:ArtifactRebindCommit = $headProbe.stdout.Trim()
                    $script:CandidateSha = $script:ArtifactRebindCommit
                    $script:AcceptedProductionSha256 = $observedProductionHash
                    Add-Stage -Name 'artifact-rebind' -Status 'PASS' -Classification 'BOUNDED TEST-ONLY ARTIFACT REBIND' -Summary ('Created local test-only implementation child ' + $script:ArtifactRebindCommit + ' binding S08B production SHA ' + $currentAcceptedHash + ' -> ' + $observedProductionHash + '. Nothing has been pushed.') -Evidence ([pscustomobject]@{ inputCandidate=$InputCandidateSha; verifiedCandidate=$script:CandidateSha; previousSha256=$currentAcceptedHash; productionSha256=$observedProductionHash; changed=$true; changedPaths=$commitPaths }) | Out-Null
                }
            } catch {
                Add-Stage -Name 'artifact-rebind' -Status 'FAIL' -Classification 'BOUNDED ARTIFACT REBIND FAILED' -Summary $_.Exception.Message | Out-Null
            }
        } else {
            Add-Stage -Name 'artifact-rebind' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Pre-verification production build did not pass.' | Out-Null
        }

        if (Stage-Passed 'artifact-rebind') {
            $postAncestor = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'merge-base','--is-ancestor',$VerificationBase,$CandidateSha) -WorkingDirectory $RepositoryRoot
            $postChangedResult = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'diff','--name-only',$VerificationBase,$CandidateSha,'--') -WorkingDirectory $RepositoryRoot
            $postChanged = @($postChangedResult.stdout -split '\r?\n' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
            $postUnexpected = @($postChanged | Where-Object { $value=[string]$_; ($script:AllowedChangedPaths -notcontains $value) -and (-not $value.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal)) })
            $postContracts = @($postChanged | Where-Object { ([string]$_).StartsWith('src/contracts/', [System.StringComparison]::Ordinal) })
            $postDiffArgs = @('-C',$RepositoryRoot,'diff','--check',$VerificationBase,$CandidateSha,'--') + $SourceDiffCheckPaths
            $postDiff = Invoke-Native -File $script:GitPath -Arguments $postDiffArgs -WorkingDirectory $RepositoryRoot
            if ($postAncestor.exitCode -eq 0 -and $postChangedResult.exitCode -eq 0 -and $postUnexpected.Count -eq 0 -and $postContracts.Count -eq 0 -and $postDiff.exitCode -eq 0) {
                Add-Stage -Name 'post-rebind-scope' -Status 'PASS' -Classification 'FINAL CANDIDATE SCOPE PROOF' -Summary ('Final verification candidate ' + $CandidateSha + ' remains within the authorized prerequisite/evidence/test surfaces and frozen contracts are unchanged.') -Evidence ([pscustomobject]@{ changedPaths=$postChanged; unexpectedPaths=$postUnexpected; contractChanges=$postContracts }) | Out-Null
            } else {
                Add-Stage -Name 'post-rebind-scope' -Status 'FAIL' -Classification 'FINAL CANDIDATE SCOPE VIOLATION' -Summary 'Final candidate failed ancestry, scope, contract-freeze, or diff-check validation.' -Evidence ([pscustomobject]@{ changedPaths=$postChanged; unexpectedPaths=$postUnexpected; contractChanges=$postContracts; ancestorExit=$postAncestor.exitCode; diffExit=$postDiff.exitCode }) | Out-Null
            }
            $postBaseSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($VerificationBase + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
            $postSource = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $SourceRel)) -WorkingDirectory $RepositoryRoot
            $postTest = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $TestRel)) -WorkingDirectory $RepositoryRoot
            $postDownstream = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $DownstreamRecoveryTestRel)) -WorkingDirectory $RepositoryRoot
            $postRebindTest = Invoke-Native -File $script:GitPath -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $ArtifactRebindTestRel)) -WorkingDirectory $RepositoryRoot
            $forbiddenFallback = 'else if(expectedParent.signal.kind==="not-found"){const root=await this.uniqueManagedRoot()'
            $postCause = $postBaseSource.exitCode -eq 0 -and $postSource.exitCode -eq 0 -and $postTest.exitCode -eq 0 -and $postDownstream.exitCode -eq 0 -and $postRebindTest.exitCode -eq 0 -and
                $postBaseSource.stdout.Contains('const root=await this.uniqueManagedRoot()') -and $postSource.stdout.Contains('if(!expectedParent.ok)return') -and -not $postSource.stdout.Contains($forbiddenFallback) -and
                $postSource.stdout.Contains('expected-parent-identity-incomplete') -and $postSource.stdout.Contains('expected-parent-identity-mismatch') -and $postSource.stdout.Contains('expected-parent-live-state-incomplete') -and $postSource.stdout.Contains('observedExpectedParentTrashed!==false') -and
                $postTest.stdout.Contains('expected-parent-unobservable:not-found') -and $postTest.stdout.Contains('mismatched exact-parent response identity remains unobservable') -and $postTest.stdout.Contains('missing exact-parent response identity remains unobservable') -and $postTest.stdout.Contains('missing explicit exact-parent live state remains unobservable') -and $postTest.stdout.Contains('parentPathSearch.value,0') -and $postTest.stdout.Contains('rootSearch.value,0') -and $postTest.stdout.Contains('mutations.value,0') -and
                $postDownstream.stdout.Contains('missing or replaced expected parent remains recovery-pending and non-redispatchable') -and $postDownstream.stdout.Contains('expected-parent-identity-mismatch') -and $postDownstream.stdout.Contains('expected-parent-identity-incomplete') -and $postDownstream.stdout.Contains('expected-parent-live-state-incomplete') -and $postDownstream.stdout.Contains('assert.equal(result.status, "recovery-required")') -and
                $postRebindTest.stdout.Contains($AcceptedProductionSha256)
            if ($postCause) { Add-Stage -Name 'post-rebind-causality' -Status 'PASS' -Classification 'FINAL CANDIDATE CAUSAL REPAIR PROOF' -Summary 'Final candidate preserves the CRITICAL fail-closed parent-observation repair, downstream recovery-pending proof, and exact observed production hash rebind.' | Out-Null }
            else { Add-Stage -Name 'post-rebind-causality' -Status 'FAIL' -Classification 'FINAL CANDIDATE CAUSAL PROOF INCOMPLETE' -Summary 'Final candidate does not prove all review-correction and artifact-rebind invariants.' | Out-Null }
        } else {
            Add-Stage -Name 'post-rebind-scope' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Artifact rebind stage did not pass.' | Out-Null
            Add-Stage -Name 'post-rebind-causality' -Status 'BLOCKED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Artifact rebind stage did not pass.' | Out-Null
        }

        [void](Invoke-ProcessStage -Name 'typecheck' -Classification 'TYPECHECK' -File $script:NpmPath -Arguments @('run','typecheck') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.')

        $productCompileCode = Invoke-ProcessStage -Name 'product-test-compile' -Classification 'PRODUCT TEST COMPILE' -File $script:NodePath -Arguments @('node_modules/typescript/bin/tsc','-p','tsconfig.test.json') -WorkingDirectory $Worktree -Enabled $dependenciesReady -BlockedReason 'Dependency installation did not pass.'
        $productCompiled = $productCompileCode -eq 0

        [void](Invoke-ProcessStage -Name 'focused-folder-recovery' -Classification 'FOCUSED RECOVERY REGRESSION' -File $script:NodePath -Arguments @(
            '--test',
            '.test-build/test/workstreams/drive/phase6-remote-protocol.test.js',
            '.test-build/test/phase6-folder-remote-recovery-observation-foundation.test.js',
            '.test-build/test/workstreams/orchestration/v1.2-remote-folder-restart.test.js',
            '.test-build/test/workstreams/orchestration/v1.2-durable-intent-recovery.test.js'
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
                    if ($script:ProductionArtifact.sizeBytes -gt 0 -and $forbiddenMarkers.Count -eq 0 -and $script:ProductionArtifact.sha256 -eq $AcceptedProductionSha256) {
                        Add-Stage -Name 'production-artifact' -Status 'PASS' -Classification 'PRODUCTION BUNDLE ISOLATED AND DETERMINISTIC' -Summary ('Generated main.js is {0} bytes / {1}; validation marker hits=0; final hash exactly reproduces the S08B-bound pre-verification hash.' -f $script:ProductionArtifact.sizeBytes, $script:ProductionArtifact.sha256) -Evidence $script:ProductionArtifact | Out-Null
                    } else {
                        Add-Stage -Name 'production-artifact' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT INVALID OR NONDETERMINISTIC' -Summary ('Production artifact check failed; forbidden marker count={0}; expectedSha={1}; actualSha={2}.' -f $forbiddenMarkers.Count,$AcceptedProductionSha256,$script:ProductionArtifact.sha256) -Evidence $script:ProductionArtifact | Out-Null
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

        $requiredStageNames = $CoreVerificationStageNames

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
                return $CanonicalEvidencePaths -notcontains $relative
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

                if ($remoteRefresh.exitCode -ne 0 -or $remoteNowProbe.exitCode -ne 0 -or $remoteNow -ne $InputCandidateSha) {
                    Add-Stage -Name 'evidence-publication' -Status 'BLOCKED' -Classification 'BRANCH LEASE LOST' -Summary ('Remote branch changed before PASS evidence publication. Expected input candidate lease ' + $InputCandidateSha + '; observed ' + $remoteNow + '. Neither local artifact-rebind child nor evidence was published.') | Out-Null
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
                            $nonEvidenceCommitted = @($committedPaths | Where-Object { $CanonicalEvidencePaths -notcontains [string]$_ })
                            $missingCanonicalCommitted = @($CanonicalEvidencePaths | Where-Object { $committedPaths -notcontains [string]$_ })

                            if ($headProbe.exitCode -ne 0 -or $parentProbe.exitCode -ne 0 -or $parentProbe.stdout.Trim() -ne $CandidateSha -or $nonEvidenceCommitted.Count -gt 0 -or $missingCanonicalCommitted.Count -gt 0) {
                                Add-Stage -Name 'evidence-publication' -Status 'FAIL' -Classification 'EVIDENCE COMMIT INVARIANT FAILED' -Summary 'Prepared evidence commit is not a direct evidence-only child of the verified candidate; it was not pushed.' -Evidence ([pscustomobject]@{ parent = $parentProbe.stdout.Trim(); committedPaths = $committedPaths }) | Out-Null
                                $script:FinalOverall = 'FAIL'
                            } else {
                                $publishFastForward = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'merge-base','--is-ancestor',$InputCandidateSha,'HEAD') -WorkingDirectory $Worktree
                                if ($publishFastForward.exitCode -ne 0) {
                                    Add-Stage -Name 'evidence-publication' -Status 'FAIL' -Classification 'PUBLICATION NOT FAST-FORWARD' -Summary ('Prepared publication HEAD is not a descendant of exact input lease ' + $InputCandidateSha + '; it was not pushed.') | Out-Null
                                    $script:FinalOverall = 'FAIL'
                                } else {
                                    $leaseArgument='--force-with-lease=refs/heads/' + $Branch + ':' + $InputCandidateSha
                                    $push = Invoke-Native -File $script:GitPath -Arguments @('-C',$Worktree,'push',$leaseArgument,'origin',('HEAD:refs/heads/' + $Branch)) -WorkingDirectory $Worktree
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
        $authoritativePassAlreadyExists=(Stage-Passed 'evidence-publication') -or $script:AlreadyVerified
        $resolvedVerdict=Resolve-LocalReportFailureVerdict $script:FinalOverall $authoritativePassAlreadyExists
        if ($resolvedVerdict -eq 'PASS') { Write-Host ('WARNING: best-effort post-publication local report failed without changing the authoritative PASS verdict: ' + $_.Exception.Message) }
        else { Write-Host ('Unable to persist verdict-affecting local structured report: ' + $_.Exception.Message); $script:FinalOverall='FAIL' }
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
