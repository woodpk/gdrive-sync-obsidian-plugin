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
$AllowedImplementationPaths = @($TaskRel, $SourceRel, $TestRel, $VerifierRel, 'main.js')
$Results = [System.Collections.Generic.List[object]]::new()
$Log = [System.Text.StringBuilder]::new()
$ProductionIdentity = $null
$ValidationIdentity = $null
$VerifiedCandidateSha = $CandidateSha
$ArtifactCommit = $null
$EvidenceCommit = $null
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('brain-s08f-prereq-' + [guid]::NewGuid().ToString('N'))
$Worktree = Join-Path $TempRoot 'w'

function Write-LogLine {
  param([string]$Text = '')
  Write-Host $Text
  [void]$script:Log.AppendLine($Text)
}

function Add-Stage {
  param(
    [string]$Name,
    [ValidateSet('PASS','FAIL','BLOCKED','SKIPPED')][string]$Status,
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
  $script:Results.Add($entry)
  Write-LogLine ('[{0}] {1}: {2}' -f $Status, $Name, $Summary)
}

function Invoke-External {
  param(
    [string]$Name,
    [string]$Classification,
    [string]$File,
    [string[]]$Arguments,
    [string]$WorkingDirectory,
    [bool]$Enabled = $true
  )
  $commandText = $File + ' ' + (($Arguments | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + $_.Replace('"','\"') + '"' } else { $_ }
  }) -join ' ')
  if (-not $Enabled) {
    Add-Stage -Name $Name -Status 'SKIPPED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Stage was not executed because a required dependency stage was unavailable.' -Command $commandText
    return 125
  }

  Write-LogLine
  Write-LogLine ('===== {0} =====' -f $Name.ToUpperInvariant())
  Write-LogLine ('Command: {0}' -f $commandText)
  $code = 99
  Push-Location $WorkingDirectory
  try {
    & $File @Arguments 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }
  } catch {
    Write-LogLine ('EXCEPTION: ' + $_.Exception.ToString())
    $code = 99
  } finally {
    Pop-Location
  }

  if ($code -eq 0) {
    Add-Stage -Name $Name -Status 'PASS' -Classification $Classification -Summary 'Stage completed successfully.' -Command $commandText -ExitCode $code
  } else {
    Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('Stage failed with exit code {0}.' -f $code) -Command $commandText -ExitCode $code
  }
  return $code
}

function Invoke-TestTree {
  param(
    [string]$Name,
    [string]$Classification,
    [string]$NodePath,
    [string]$Root,
    [string]$WorkingDirectory,
    [bool]$Enabled = $true
  )
  if (-not $Enabled) {
    Add-Stage -Name $Name -Status 'SKIPPED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Compiled test tree was unavailable.'
    return 125
  }
  if (-not (Test-Path -LiteralPath $Root -PathType Container)) {
    Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('Compiled test root is missing: ' + $Root)
    return 126
  }

  $files = @([System.IO.Directory]::EnumerateFiles($Root, '*.test.js', [System.IO.SearchOption]::AllDirectories) | Sort-Object)
  if ($files.Count -eq 0) {
    Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('No compiled tests found under ' + $Root)
    return 127
  }

  Write-LogLine
  Write-LogLine ('===== {0} =====' -f $Name.ToUpperInvariant())
  Write-LogLine ('Discovered tests: {0}' -f $files.Count)
  $batchSize = 40
  $batchCount = [int][Math]::Ceiling($files.Count / [double]$batchSize)
  $failedBatches = [System.Collections.Generic.List[object]]::new()

  Push-Location $WorkingDirectory
  try {
    for ($offset = 0; $offset -lt $files.Count; $offset += $batchSize) {
      $last = [Math]::Min($offset + $batchSize - 1, $files.Count - 1)
      $batch = @($files[$offset..$last])
      $batchNumber = [int]($offset / $batchSize) + 1
      Write-LogLine ('--- {0} batch {1}/{2}: {3} test files ---' -f $Name, $batchNumber, $batchCount, $batch.Count)
      $nodeArguments = @('--test') + $batch; & $NodePath @nodeArguments 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
      $code = $LASTEXITCODE
      if ($null -eq $code) { $code = 0 }
      if ($code -ne 0) {
        $failedBatches.Add([pscustomobject]@{ batch = $batchNumber; exitCode = $code; files = $batch })
      }
    }
  } catch {
    $failedBatches.Add([pscustomobject]@{ batch = -1; exitCode = 99; files = @(); exception = $_.Exception.ToString() })
    Write-LogLine ('EXCEPTION: ' + $_.Exception.ToString())
  } finally {
    Pop-Location
  }

  if ($failedBatches.Count -eq 0) {
    Add-Stage -Name $Name -Status 'PASS' -Classification $Classification -Summary ('All {0} compiled test files passed across {1} batch(es).' -f $files.Count, $batchCount) -ExitCode 0 -Evidence ([pscustomobject]@{ testFileCount = $files.Count; batchCount = $batchCount })
    return 0
  }

  Add-Stage -Name $Name -Status 'FAIL' -Classification $Classification -Summary ('{0} of {1} test batch(es) failed; all batches were still attempted.' -f $failedBatches.Count, $batchCount) -ExitCode 1 -Evidence ([pscustomobject]@{ testFileCount = $files.Count; batchCount = $batchCount; failedBatches = @($failedBatches) })
  return 1
}

function Get-Sha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Current-Failures {
  return @($script:Results | Where-Object { $_.status -in @('FAIL','BLOCKED') })
}

Write-LogLine '============================================================'
Write-LogLine 'S08F MULTI-ROOT FOLDER RECOVERY PREREQUISITE VERIFIER'
Write-LogLine '============================================================'
Write-LogLine ('Input candidate: {0}' -f $CandidateSha)
Write-LogLine ('Verification base: {0}' -f $VerificationBase)
Write-LogLine ('Repository: {0}' -f $RepositoryRoot)

$git = Get-Command git -ErrorAction SilentlyContinue
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($null -eq $npm) { $npm = Get-Command npm -ErrorAction SilentlyContinue }

$toolIssues = [System.Collections.Generic.List[string]]::new()
if (-not (Test-Path -LiteralPath $RepositoryRoot -PathType Container)) { $toolIssues.Add('repository-root-unavailable') }
if ($null -eq $git) { $toolIssues.Add('git-unavailable') }
if ($null -eq $node) { $toolIssues.Add('node-unavailable') }
if ($null -eq $npm) { $toolIssues.Add('npm-unavailable') }

if ($toolIssues.Count -eq 0) {
  $nodeDir = Split-Path -Parent $node.Source
  if (-not (($env:PATH -split ';') -contains $nodeDir)) { $env:PATH = $nodeDir + ';' + $env:PATH }
  $nodeVersion = ((& $node.Source --version 2>&1) -join '').Trim()
  $npmVersion = ((& $npm.Source --version 2>&1) -join '').Trim()
  Add-Stage -Name 'toolchain' -Status 'PASS' -Classification 'TOOLCHAIN READY' -Summary ('Node {0}; npm {1}; controlled child Node PATH established.' -f $nodeVersion, $npmVersion)
} else {
  Add-Stage -Name 'toolchain' -Status 'BLOCKED' -Classification 'TOOLCHAIN UNAVAILABLE' -Summary ($toolIssues -join ', ')
}

$identityReady = $toolIssues.Count -eq 0
$remoteHead = ''
if ($identityReady) {
  Write-LogLine
  Write-LogLine '===== REPOSITORY IDENTITY ====='
  $refspec = '+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch
  & $git.Source -C $RepositoryRoot fetch origin $refspec --prune 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
  $fetchCode = $LASTEXITCODE
  if ($fetchCode -ne 0) {
    Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'FETCH FAILED' -Summary ('git fetch failed with exit ' + $fetchCode) -ExitCode $fetchCode
    $identityReady = $false
  } else {
    $remoteHead = ((& $git.Source -C $RepositoryRoot rev-parse ('refs/remotes/origin/' + $Branch) 2>&1) -join [Environment]::NewLine).Trim()
    $resolveCode = $LASTEXITCODE
    if ($resolveCode -ne 0 -or $remoteHead -ne $CandidateSha) {
      Add-Stage -Name 'repository-identity' -Status 'BLOCKED' -Classification 'SOURCE IDENTITY MISMATCH' -Summary ('Expected ' + $CandidateSha + '; observed ' + $remoteHead) -ExitCode $resolveCode
      $identityReady = $false
    } else {
      Add-Stage -Name 'repository-identity' -Status 'PASS' -Classification 'EXACT SOURCE IDENTITY' -Summary ('Remote task branch is exactly ' + $CandidateSha + '.')
    }
  }
}

$scopeReady = $false
if ($identityReady) {
  Write-LogLine
  Write-LogLine '===== CHANGE SCOPE / CONTRACT FREEZE ====='
  & $git.Source -C $RepositoryRoot merge-base --is-ancestor $VerificationBase $CandidateSha 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
  $ancestorCode = $LASTEXITCODE
  $changed = @(& $git.Source -C $RepositoryRoot diff --name-only $VerificationBase $CandidateSha --)
  $diffCheckOutput = ((& $git.Source -C $RepositoryRoot diff --check $VerificationBase $CandidateSha -- 2>&1) -join [Environment]::NewLine)
  $diffCheckCode = $LASTEXITCODE
  $unexpected = @($changed | Where-Object {
    $value = [string]$_
    ($script:AllowedImplementationPaths -notcontains $value) -and (-not $value.StartsWith($script:EvidenceRel + '/', [System.StringComparison]::Ordinal))
  })
  $contractChanges = @($changed | Where-Object { ([string]$_).StartsWith('src/contracts/', [System.StringComparison]::Ordinal) })
  $scopeReady = $ancestorCode -eq 0 -and $diffCheckCode -eq 0 -and $unexpected.Count -eq 0 -and $contractChanges.Count -eq 0
  $scopeEvidence = [pscustomobject]@{
    changedPaths = $changed
    unexpectedPaths = $unexpected
    contractChanges = $contractChanges
    ancestorExitCode = $ancestorCode
    diffCheckExitCode = $diffCheckCode
    diffCheckOutput = $diffCheckOutput
  }
  if ($scopeReady) {
    Add-Stage -Name 'change-scope' -Status 'PASS' -Classification 'BOUNDED PREREQUISITE' -Summary 'Candidate is descended from the blocked physical-evidence anchor; changed paths are authorized; frozen synchronization contracts are unchanged; diff-check passes.' -Evidence $scopeEvidence
  } else {
    Add-Stage -Name 'change-scope' -Status 'FAIL' -Classification 'SCOPE OR CONTRACT VIOLATION' -Summary 'Candidate failed ancestry, path-boundary, contract-freeze, or diff-check validation.' -Evidence $scopeEvidence
  }

  $baseSource = ((& $git.Source -C $RepositoryRoot show ($VerificationBase + ':' + $SourceRel) 2>&1) -join [Environment]::NewLine)
  $baseShowCode = $LASTEXITCODE
  $candidateSource = ((& $git.Source -C $RepositoryRoot show ($CandidateSha + ':' + $SourceRel) 2>&1) -join [Environment]::NewLine)
  $candidateShowCode = $LASTEXITCODE
  $candidateTest = ((& $git.Source -C $RepositoryRoot show ($CandidateSha + ':' + $TestRel) 2>&1) -join [Environment]::NewLine)
  $testShowCode = $LASTEXITCODE
  $causalPass = $baseShowCode -eq 0 -and $candidateShowCode -eq 0 -and $testShowCode -eq 0 -and
    $baseSource.Contains('const root=await this.uniqueManagedRoot()') -and
    $candidateSource.Contains('const expectedParent=await this.getFile(descriptor.parentRemoteObjectId)') -and
    $candidateSource.Contains('target-parent-identity-mismatch') -and
    $candidateTest.Contains('rootSearch.value,0') -and
    $candidateTest.Contains('mutations.value,0')
  if ($causalPass) {
    Add-Stage -Name 'defect-causality' -Status 'PASS' -Classification 'OWNING DEFECT REPAIRED' -Summary 'Base used account-global root uniqueness after reserved-ID absence; candidate anchors recovery to exact parent observation/root ancestry and regression asserts no global root search or mutation.'
  } else {
    Add-Stage -Name 'defect-causality' -Status 'FAIL' -Classification 'CAUSAL REPAIR PROOF INCOMPLETE' -Summary 'Static base-to-candidate causal markers did not all match expected repair boundaries.'
  }
}

$worktreeReady = $false
if ($identityReady -and $scopeReady) {
  [void][System.IO.Directory]::CreateDirectory($TempRoot)
  Write-LogLine
  Write-LogLine '===== DISPOSABLE WORKTREE ====='
  & $git.Source -C $RepositoryRoot worktree add --detach $Worktree $CandidateSha 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
  $worktreeCode = $LASTEXITCODE
  if ($worktreeCode -eq 0) {
    $worktreeReady = $true
    Add-Stage -Name 'disposable-worktree' -Status 'PASS' -Classification 'EXACT-SHA DISPOSABLE WORKTREE' -Summary ('Created ' + $Worktree + '.') -ExitCode 0
  } else {
    Add-Stage -Name 'disposable-worktree' -Status 'BLOCKED' -Classification 'WORKTREE CREATION FAILED' -Summary ('git worktree add failed with exit ' + $worktreeCode) -ExitCode $worktreeCode
  }
} else {
  Add-Stage -Name 'disposable-worktree' -Status 'SKIPPED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Source identity/scope preconditions did not pass.'
}

$depsCode = 125
$typeCode = 125
$productCompileCode = 125
$focusedCode = 125
$productSuiteCode = 125
$bvpCompileCode = 125
$bvpSuiteCode = 125
$architectureGuardCode = 125
$architectureMetricsCode = 125
$repositoryCheckCode = 125
$buildCode = 125

if ($worktreeReady) {
  $depsCode = Invoke-External -Name 'dependencies' -Classification 'DEPENDENCY INSTALL' -File $npm.Source -Arguments @('ci','--no-audit','--no-fund','--loglevel','info') -WorkingDirectory $Worktree
  $depsReady = $depsCode -eq 0

  $typeCode = Invoke-External -Name 'typecheck' -Classification 'TYPECHECK' -File $npm.Source -Arguments @('run','typecheck') -WorkingDirectory $Worktree -Enabled $depsReady
  $productCompileCode = Invoke-External -Name 'product-test-compile' -Classification 'PRODUCT TEST COMPILE' -File $node.Source -Arguments @('node_modules/typescript/bin/tsc','-p','tsconfig.test.json') -WorkingDirectory $Worktree -Enabled $depsReady

  $focusedReady = $depsReady -and $productCompileCode -eq 0
  $focusedCode = Invoke-External -Name 'focused-folder-recovery' -Classification 'FOCUSED RECOVERY REGRESSION' -File $node.Source -Arguments @(
    '--test',
    '.test-build/test/workstreams/drive/phase6-remote-protocol.test.js',
    '.test-build/test/phase6-folder-remote-recovery-observation-foundation.test.js',
    '.test-build/test/workstreams/orchestration/v1.2-remote-folder-restart.test.js'
  ) -WorkingDirectory $Worktree -Enabled $focusedReady

  $productSuiteCode = Invoke-TestTree -Name 'complete-product-suite' -Classification 'COMPLETE PRODUCT TEST SUITE' -NodePath $node.Source -Root (Join-Path $Worktree '.test-build/test') -WorkingDirectory $Worktree -Enabled $focusedReady

  $bvpCompileCode = Invoke-External -Name 'bvp-compile' -Classification 'BVP COMPILE' -File $node.Source -Arguments @('node_modules/typescript/bin/tsc','-p','test-platform/tsconfig.json') -WorkingDirectory $Worktree -Enabled $depsReady
  $bvpReady = $depsReady -and $bvpCompileCode -eq 0
  $bvpSuiteCode = Invoke-TestTree -Name 'complete-bvp-suite' -Classification 'COMPLETE BVP TEST SUITE' -NodePath $node.Source -Root (Join-Path $Worktree '.test-build/bvp/test-platform/test') -WorkingDirectory $Worktree -Enabled $bvpReady

  $architectureGuardCode = Invoke-External -Name 'architecture-guard' -Classification 'ARCHITECTURE GUARD' -File $node.Source -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-guard.test.js') -WorkingDirectory $Worktree -Enabled $bvpReady
  $architectureMetricsCode = Invoke-External -Name 'architecture-metrics' -Classification 'ARCHITECTURE METRICS' -File $node.Source -Arguments @('--test','.test-build/bvp/test-platform/test/architecture-metrics.test.js') -WorkingDirectory $Worktree -Enabled $bvpReady
  $repositoryCheckCode = Invoke-External -Name 'repository-check' -Classification 'REPOSITORY CHECK' -File $node.Source -Arguments @('.test-build/bvp/test-platform/src/repository-check.js') -WorkingDirectory $Worktree -Enabled $bvpReady

  $buildCode = Invoke-External -Name 'production-build' -Classification 'PRODUCTION BUILD' -File $npm.Source -Arguments @('run','build') -WorkingDirectory $Worktree -Enabled $depsReady

  if ($buildCode -eq 0) {
    try {
      $mainJs = Join-Path $Worktree 'main.js'
      if (-not (Test-Path -LiteralPath $mainJs -PathType Leaf)) { throw 'main.js missing after successful production build.' }
      $sourceText = [System.IO.File]::ReadAllText($mainJs)
      $forbidden = @('BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox') | Where-Object { $sourceText.Contains($_) }
      $ProductionIdentity = [pscustomobject]@{
        sizeBytes = (Get-Item -LiteralPath $mainJs).Length
        sha256 = Get-Sha256 $mainJs
        forbiddenMarkerHits = @($forbidden)
      }
      if ($ProductionIdentity.sizeBytes -le 0 -or $forbidden.Count -ne 0) { throw ('Production artifact isolation failed: ' + ($ProductionIdentity | ConvertTo-Json -Compress)) }
      Add-Stage -Name 'production-artifact-identity' -Status 'PASS' -Classification 'PRODUCTION BUNDLE ISOLATED' -Summary ('Production main.js size={0}; sha256={1}; validation marker hits=0.' -f $ProductionIdentity.sizeBytes, $ProductionIdentity.sha256) -Evidence $ProductionIdentity
    } catch {
      Add-Stage -Name 'production-artifact-identity' -Status 'FAIL' -Classification 'PRODUCTION ARTIFACT INVALID' -Summary $_.Exception.Message
    }
  } else {
    Add-Stage -Name 'production-artifact-identity' -Status 'SKIPPED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Production build did not pass.'
  }

  $preArtifactFailures = @(Current-Failures)
  $canMaterialize = $preArtifactFailures.Count -eq 0 -and $buildCode -eq 0
  if ($canMaterialize) {
    try {
      Write-LogLine
      Write-LogLine '===== DERIVED PRODUCTION ARTIFACT COMMIT ====='
      & $git.Source -C $Worktree diff --check -- main.js 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
      if ($LASTEXITCODE -ne 0) { throw 'main.js diff-check failed.' }
      & $git.Source -C $Worktree diff --quiet -- main.js
      $mainChanged = $LASTEXITCODE -ne 0
      if ($mainChanged) {
        $dirtyBeforeArtifact = @(& $git.Source -C $Worktree status --porcelain --untracked-files=all)
        $unexpectedDirty = @($dirtyBeforeArtifact | Where-Object {
          $line = [string]$_
          if ($line.Length -lt 4) { return $true }
          $value = $line.Substring(3).Replace('\','/')
          return $value -ne 'main.js'
        })
        if ($unexpectedDirty.Count -ne 0) { throw ('Unexpected worktree changes before artifact commit: ' + ($unexpectedDirty -join '; ')) }

        & $git.Source -C $Worktree add -- main.js 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
        if ($LASTEXITCODE -ne 0) { throw 'git add main.js failed.' }
        & $git.Source -C $Worktree commit -m 'build(sync): refresh bundle for multi-root folder recovery' 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
        if ($LASTEXITCODE -ne 0) { throw 'derived production artifact commit failed.' }
        $ArtifactCommit = ((& $git.Source -C $Worktree rev-parse HEAD 2>&1) -join [Environment]::NewLine).Trim()
        $VerifiedCandidateSha = $ArtifactCommit
        Add-Stage -Name 'production-artifact-materialization' -Status 'PASS' -Classification 'DERIVED ARTIFACT COMMIT' -Summary ('Created derived production artifact commit ' + $ArtifactCommit + '.') -Evidence ([pscustomobject]@{ parentCandidate = $CandidateSha; artifactCommit = $ArtifactCommit; productionArtifact = $ProductionIdentity })
      } else {
        $VerifiedCandidateSha = $CandidateSha
        Add-Stage -Name 'production-artifact-materialization' -Status 'PASS' -Classification 'BUNDLE ALREADY CURRENT' -Summary 'Production build reproduced the tracked main.js exactly; no derived artifact commit was required.'
      }
    } catch {
      Add-Stage -Name 'production-artifact-materialization' -Status 'FAIL' -Classification 'DERIVED ARTIFACT COMMIT FAILED' -Summary $_.Exception.Message
    }
  } else {
    Add-Stage -Name 'production-artifact-materialization' -Status 'SKIPPED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Implementation/test/build gates did not all pass; no shipping artifact commit was created.'
    & $git.Source -C $Worktree restore --worktree --staged -- main.js 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
  }

  $artifactReady = @($Results | Where-Object { $_.name -eq 'production-artifact-materialization' -and $_.status -eq 'PASS' }).Count -eq 1
  $validationCode = Invoke-External -Name 'validation-artifact-build' -Classification 'VALIDATION ARTIFACT BUILD' -File $node.Source -Arguments @('.test-build/bvp/test-platform/src/live-device/build-validation-artifact.js') -WorkingDirectory $Worktree -Enabled ($artifactReady -and $bvpReady)

  if ($validationCode -eq 0) {
    try {
      $validationDir = Join-Path $Worktree '.test-build/bvp-live-device/plugin'
      $identityPath = Join-Path $validationDir 'build-identity.json'
      $artifactPath = Join-Path $validationDir 'main.js'
      if (-not (Test-Path -LiteralPath $identityPath -PathType Leaf)) { throw 'Validation build identity missing.' }
      if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) { throw 'Validation artifact main.js missing.' }
      $identity = Get-Content -LiteralPath $identityPath -Raw | ConvertFrom-Json
      $actualHash = Get-Sha256 $artifactPath
      $actualSize = (Get-Item -LiteralPath $artifactPath).Length
      $ValidationIdentity = [pscustomobject]@{
        sourceCommit = [string]$identity.sourceCommit
        artifactSize = [int64]$identity.artifactSize
        artifactSha256 = [string]$identity.artifactSha256
        actualSize = $actualSize
        actualSha256 = $actualHash
        manifestSha256 = [string]$identity.manifestSha256
        testPlatformInputs = @($identity.testPlatformInputs)
      }
      if ($ValidationIdentity.sourceCommit -ne $VerifiedCandidateSha) { throw ('Validation source commit mismatch. Expected ' + $VerifiedCandidateSha + '; observed ' + $ValidationIdentity.sourceCommit) }
      if ($ValidationIdentity.artifactSize -ne $actualSize -or $ValidationIdentity.artifactSha256 -ne $actualHash) { throw 'Validation artifact identity does not match actual validation main.js.' }
      Add-Stage -Name 'validation-artifact-identity' -Status 'PASS' -Classification 'EXACT VALIDATION ARTIFACT' -Summary ('Validation main.js source={0}; size={1}; sha256={2}.' -f $ValidationIdentity.sourceCommit, $actualSize, $actualHash) -Evidence $ValidationIdentity
    } catch {
      Add-Stage -Name 'validation-artifact-identity' -Status 'FAIL' -Classification 'VALIDATION ARTIFACT INVALID' -Summary $_.Exception.Message
    }
  } else {
    Add-Stage -Name 'validation-artifact-identity' -Status 'SKIPPED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'Validation artifact build did not pass.'
  }

  $postArtifactRepositoryCheck = Invoke-External -Name 'post-artifact-repository-check' -Classification 'POST-ARTIFACT REPOSITORY CHECK' -File $node.Source -Arguments @('.test-build/bvp/test-platform/src/repository-check.js') -WorkingDirectory $Worktree -Enabled ($artifactReady -and $bvpReady)
}

if ($worktreeReady) {
  $dirty = @(& $git.Source -C $Worktree status --porcelain --untracked-files=all)
  $outsideEvidence = @($dirty | Where-Object {
    $line = [string]$_
    if ($line.Length -lt 4) { return $true }
    $value = $line.Substring(3).Replace('\','/')
    return -not $value.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal)
  })
  if ($outsideEvidence.Count -eq 0) {
    Add-Stage -Name 'repository-mutation-audit' -Status 'PASS' -Classification 'EVIDENCE-ONLY RESIDUAL MUTATION' -Summary 'After derived artifact materialization, no residual tracked/untracked change exists outside the authorized S08F evidence root.' -Evidence ([pscustomobject]@{ status = $dirty })
  } else {
    Add-Stage -Name 'repository-mutation-audit' -Status 'FAIL' -Classification 'OUT-OF-SCOPE RESIDUAL MUTATION' -Summary ('Unexpected residual worktree changes: ' + ($outsideEvidence -join '; ')) -Evidence ([pscustomobject]@{ status = $dirty; outsideEvidence = $outsideEvidence })
  }
}

$preEvidenceFailures = @(Current-Failures)
$preEvidenceSkipped = @($Results | Where-Object { $_.status -eq 'SKIPPED' })
$Overall = if ($preEvidenceFailures.Count -eq 0 -and $preEvidenceSkipped.Count -eq 0) { 'PASS' } else { 'FAIL' }

if ($worktreeReady) {
  try {
    Write-LogLine
    Write-LogLine '===== EVIDENCE PERSISTENCE ====='
    $evidenceDir = Join-Path $Worktree ($EvidenceRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    [void][System.IO.Directory]::CreateDirectory($evidenceDir)

    $passJson = Join-Path $evidenceDir 'S08F-PREREQ-VERIFY-PASS.json'
    $passMd = Join-Path $evidenceDir 'S08F-PREREQ-VERIFY-PASS.md'
    $failJson = Join-Path $evidenceDir 'S08F-PREREQ-VERIFY-FAIL.json'
    $failMd = Join-Path $evidenceDir 'S08F-PREREQ-VERIFY-FAIL.md'
    $logPath = Join-Path $evidenceDir 'S08F-PREREQ-VERIFY.log'
    Remove-Item -LiteralPath $passJson,$passMd,$failJson,$failMd,$logPath -Force -ErrorAction SilentlyContinue

    $report = [ordered]@{
      schemaVersion = 1
      generatedAtUtc = [DateTimeOffset]::UtcNow.ToString('o')
      overall = $Overall
      verificationBase = $VerificationBase
      inputCandidateSha = $CandidateSha
      verifiedCandidateSha = $VerifiedCandidateSha
      branch = $Branch
      productionArtifactCommit = $ArtifactCommit
      productionArtifact = $ProductionIdentity
      validationArtifact = $ValidationIdentity
      stages = @($Results)
      diagnosticWorkspace = $TempRoot
    }
    $jsonText = $report | ConvertTo-Json -Depth 30
    $targetJson = if ($Overall -eq 'PASS') { $passJson } else { $failJson }
    $targetMd = if ($Overall -eq 'PASS') { $passMd } else { $failMd }
    [System.IO.File]::WriteAllText($targetJson, $jsonText + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($logPath, $Log.ToString(), [System.Text.UTF8Encoding]::new($false))

    $md = [System.Text.StringBuilder]::new()
    [void]$md.AppendLine('# S08F Multi-Root Folder Recovery Prerequisite Verification')
    [void]$md.AppendLine()
    [void]$md.AppendLine('- Overall: **' + $Overall + '**')
    [void]$md.AppendLine('- Verification base: ' + $VerificationBase)
    [void]$md.AppendLine('- Input candidate: ' + $CandidateSha)
    [void]$md.AppendLine('- Verified candidate: ' + $VerifiedCandidateSha)
    if ($null -ne $ProductionIdentity) {
      [void]$md.AppendLine('- Production main.js: ' + $ProductionIdentity.sizeBytes + ' bytes / ' + $ProductionIdentity.sha256)
    }
    if ($null -ne $ValidationIdentity) {
      [void]$md.AppendLine('- Validation main.js: ' + $ValidationIdentity.actualSize + ' bytes / ' + $ValidationIdentity.actualSha256)
    }
    [void]$md.AppendLine()
    [void]$md.AppendLine('| Stage | Status | Classification | Summary |')
    [void]$md.AppendLine('|---|---|---|---|')
    foreach ($stage in $Results) {
      $summary = ([string]$stage.summary).Replace('|','\|').Replace([char]13,' ').Replace([char]10,' ')
      [void]$md.AppendLine('| ' + $stage.name + ' | ' + $stage.status + ' | ' + $stage.classification + ' | ' + $summary + ' |')
    }
    [System.IO.File]::WriteAllText($targetMd, $md.ToString(), [System.Text.UTF8Encoding]::new($false))

    $statusAfterEvidence = @(& $git.Source -C $Worktree status --porcelain --untracked-files=all)
    $outside = @($statusAfterEvidence | Where-Object {
      $line = [string]$_
      if ($line.Length -lt 4) { return $true }
      $value = $line.Substring(3).Replace('\','/')
      return -not $value.StartsWith($EvidenceRel + '/', [System.StringComparison]::Ordinal)
    })
    if ($outside.Count -ne 0) { throw ('Evidence persistence produced out-of-scope changes: ' + ($outside -join '; ')) }

    & $git.Source -C $RepositoryRoot fetch origin ('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch) --prune 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
    if ($LASTEXITCODE -ne 0) { throw 'Final branch refresh failed.' }
    $remoteBeforePublish = ((& $git.Source -C $RepositoryRoot rev-parse ('refs/remotes/origin/' + $Branch) 2>&1) -join [Environment]::NewLine).Trim()
    if ($remoteBeforePublish -ne $CandidateSha) { throw ('Branch drifted before publication. Expected ' + $CandidateSha + '; observed ' + $remoteBeforePublish) }

    & $git.Source -C $Worktree add -- $EvidenceRel 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
    if ($LASTEXITCODE -ne 0) { throw 'git add evidence failed.' }
    & $git.Source -C $Worktree commit -m 'test(bvp): record S08F multi-root recovery prerequisite verification' 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
    if ($LASTEXITCODE -ne 0) { throw 'Evidence commit failed.' }
    $EvidenceCommit = ((& $git.Source -C $Worktree rev-parse HEAD 2>&1) -join [Environment]::NewLine).Trim()

    & $git.Source -C $Worktree push origin ('HEAD:refs/heads/' + $Branch) 2>&1 | ForEach-Object { Write-LogLine ([string]$_) }
    if ($LASTEXITCODE -ne 0) { throw 'Evidence push failed.' }
    Add-Stage -Name 'evidence-publication' -Status 'PASS' -Classification 'EVIDENCE COMMIT PUBLISHED' -Summary ('Published evidence commit ' + $EvidenceCommit + '.')
  } catch {
    Add-Stage -Name 'evidence-publication' -Status 'FAIL' -Classification 'EVIDENCE PUBLICATION FAILED' -Summary $_.Exception.Message
    $Overall = 'FAIL'
  }
} else {
  Add-Stage -Name 'evidence-publication' -Status 'SKIPPED' -Classification 'PREREQUISITE NOT SATISFIED' -Summary 'No disposable worktree was available for evidence generation.'
  $Overall = 'FAIL'
}

Write-LogLine
Write-LogLine '============================================================'
Write-LogLine 'S08F PREREQUISITE VERIFICATION RESULT'
Write-LogLine '============================================================'
foreach ($stage in $Results) {
  Write-LogLine ('{0,-34} {1,-8} {2}' -f $stage.name, $stage.status, $stage.summary)
}
Write-LogLine '------------------------------------------------------------'
Write-LogLine ('OVERALL: {0}' -f $Overall)
Write-LogLine ('INPUT CANDIDATE: {0}' -f $CandidateSha)
Write-LogLine ('VERIFIED CANDIDATE: {0}' -f $VerifiedCandidateSha)
Write-LogLine ('PRODUCTION ARTIFACT COMMIT: {0}' -f $(if ($ArtifactCommit) { $ArtifactCommit } else { '<none>' }))
Write-LogLine ('EVIDENCE COMMIT: {0}' -f $(if ($EvidenceCommit) { $EvidenceCommit } else { '<none>' }))
Write-LogLine ('DIAGNOSTIC WORKSPACE: {0}' -f $TempRoot)
if ($null -ne $ProductionIdentity) { Write-LogLine ('PRODUCTION MAIN.JS: {0} bytes / {1}' -f $ProductionIdentity.sizeBytes, $ProductionIdentity.sha256) }
if ($null -ne $ValidationIdentity) { Write-LogLine ('VALIDATION MAIN.JS: {0} bytes / {1}' -f $ValidationIdentity.actualSize, $ValidationIdentity.actualSha256) }
Write-LogLine '============================================================'

[Environment]::ExitCode = if ($Overall -eq 'PASS') { 0 } else { 20 }
