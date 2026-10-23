# PHX-CI-only verifier invocation for the BRAIN Windows direct-relay correction.
# PHX-CI owns software qualification and the separately owner-approved Windows BVP smoke.
# Reconciles the precisely identified prior timeout only after authenticated late receipt; never rewrites the prior PHX verdict.
# Never edits the installed plugin, pairing, product sync, or independent evidence.
[CmdletBinding()]
param(
  # Optional immutable pin for callers that require it. By default this
  # operator binds the freshly checked-out remote commit on each invocation.
  # Never pin a prior evidence commit in a reusable bootstrap.
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ExpectedSourceSha,
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._/-]{0,120}$')]
  [string]$SoftwareOnlyBranch,
  [switch]$SoftwareOnlyGovernance,
  [switch]$RunWindowsPhysicalSmoke,
  [switch]$UseRecoveredSoftwareEvidence,
  [switch]$RecoverPreviouslyDispatchedWindowsSmoke,
  [switch]$RunS09AReadinessSoftware,
  [switch]$RunS09ADualPhysicalReadiness
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$branch = 'fix/s09-bvp-live-controller-20261022'
# Explicit software-only feature verification cannot select any physical or recovery mode.
if ($SoftwareOnlyGovernance -and -not $SoftwareOnlyBranch) {
  throw 'Governance qualification requires an explicit software-only branch.'
}
if ($SoftwareOnlyBranch -and (
    $RunWindowsPhysicalSmoke -or $UseRecoveredSoftwareEvidence -or
    $RecoverPreviouslyDispatchedWindowsSmoke -or $RunS09AReadinessSoftware -or
    $RunS09ADualPhysicalReadiness)) {
  throw 'Software-only BVP verification cannot be combined with physical, recovery or S09A modes.'
}
if ($SoftwareOnlyBranch -and ($SoftwareOnlyBranch -match '\.\.|//|@\{|/\.|\.lock$')) {
  throw 'Invalid software-only feature branch.'
}
if ($SoftwareOnlyBranch) { $branch = $SoftwareOnlyBranch }
$framework = '69c4aa077d4a1a46d1e85e59f39d36285be99e83'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd([char[]]@('\', '/'))
$runRoot = Split-Path -Parent $repository
$phxFrontDoor = Join-Path $env:LOCALAPPDATA ('PHX-CI\runtimes\' + $framework + '\scripts\Invoke-PhxCi.ps1')
if ($runRoot -cnotmatch '^C:\\temp\\[a-f0-9]{32}$') {
  throw "Unsafe operator run root; expected C:\temp\<GUID>."
}
if (-not (Test-Path -LiteralPath $phxFrontDoor -PathType Leaf)) {
  throw "Pinned PHX-CI front door not installed: $phxFrontDoor"
}
$local = @(& git.exe -C $repository rev-parse HEAD)
if ($LASTEXITCODE -ne 0 -or $local.Count -ne 1 -or $local[0].Trim() -cnotmatch '^[a-f0-9]{40}$') {
  throw 'Local source commit unavailable.'
}
if (-not $PSBoundParameters.ContainsKey('ExpectedSourceSha')) {
  $ExpectedSourceSha = $local[0].Trim()
}
if ($local[0].Trim() -cne $ExpectedSourceSha) {
  throw 'Caller-pinned source differs from local commit; no verification dispatched.'
}
$currentBranch = @(& git.exe -C $repository branch --show-current)
if ($LASTEXITCODE -ne 0 -or $currentBranch.Count -ne 1 -or $currentBranch[0].Trim() -cne $branch) {
  throw 'Unexpected local branch or detached checkout.'
}
$dirty = @(& git.exe -C $repository status --porcelain=v1 --untracked-files=all)
if ($LASTEXITCODE -ne 0 -or $dirty.Count -ne 0) {
  throw 'Source checkout is not clean; no PHX-CI verification started.'
}
# Fetch BOTH required refs explicitly. Single-branch clones do not track
# origin/master automatically; PHX-CI must never depend on clone defaults.
& git.exe -C $repository fetch origin --prune '+refs/heads/master:refs/remotes/origin/master' ('+refs/heads/' + $branch + ':refs/remotes/origin/' + $branch)
if ($LASTEXITCODE -ne 0) { throw 'Cannot refresh required master and feature refs.' }
$base = @(& git.exe -C $repository rev-parse --verify 'refs/remotes/origin/master^{commit}')
if ($LASTEXITCODE -ne 0 -or $base.Count -ne 1 -or $base[0].Trim() -notmatch '^[a-f0-9]{40}$') {
  throw 'PHX-CI origin/master baseline missing; no validation dispatched.'
}
$remote = @(& git.exe -C $repository rev-parse ('refs/remotes/origin/' + $branch))
if ($LASTEXITCODE -ne 0 -or $remote.Count -ne 1 -or $remote[0].Trim() -cne $ExpectedSourceSha) {
  throw 'Remote branch advanced or differs from the frozen source; no verification started.'
}
$priorPurpose = [Environment]::GetEnvironmentVariable('BRAIN_ARTIFACT_PURPOSE', 'Process')
$priorClass = [Environment]::GetEnvironmentVariable('BVP_CHANGE_CLASS', 'Process')
$priorConsent = [Environment]::GetEnvironmentVariable('BVP_OWNER_PHYSICAL_APPROVAL', 'Process')
$priorExisting = [Environment]::GetEnvironmentVariable('BVP_EXISTING_MAILBOX_ROOT_CONFIRMED', 'Process')
$priorScratch = [Environment]::GetEnvironmentVariable('BVP_WINDOWS_SMOKE_SCRATCH', 'Process')
$priorIosId = [Environment]::GetEnvironmentVariable('BVP_IOS_DEVICE_ID', 'Process')
$priorIosApproval = [Environment]::GetEnvironmentVariable('BVP_S09A_DUAL_OWNER_APPROVAL', 'Process')
$priorIosReady = [Environment]::GetEnvironmentVariable('BVP_IOS_VALIDATION_READY_CONFIRMED', 'Process')
$qualifiedCommand = if ($RunS09AReadinessSoftware) {
  'node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s09a-dual-device-readiness.test.js'
} else {
  'npm run test:bvp-root'
}
$recoveryCommand = 'npm run test:bvp-root && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --recover-privacy-blocked-windows-smoke'
$physicalCommand = 'node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --reconcile-second-windows-timeout && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --run-approved-windows-smoke'
# Exactly one physical PHX invocation below; select only the separately authorized battery.
$dualPhysicalCommand = if ($RunS09ADualPhysicalReadiness) {
  'node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --run-approved-s09a-dual-readiness'
} else { $physicalCommand }
try {
  if ($RunS09AReadinessSoftware -and ($RunWindowsPhysicalSmoke -or $UseRecoveredSoftwareEvidence -or $RecoverPreviouslyDispatchedWindowsSmoke -or $RunS09ADualPhysicalReadiness)) {
    throw 'S09A software readiness tests are strictly nonphysical and cannot be combined with a physical run or evidence recovery.'
  }
  if ($RunS09ADualPhysicalReadiness -and ($RunWindowsPhysicalSmoke -or $UseRecoveredSoftwareEvidence -or $RecoverPreviouslyDispatchedWindowsSmoke)) {
    throw 'Dual-device physical operation cannot combine with Windows smoke or recovery.'
  }
  # Perform input-only validation before spending time in PHX-CI or requesting
  # approval. Invalid input has no external effects and is safely rerunnable.
  if ($RunS09ADualPhysicalReadiness) {
    $iosId = (Read-Host 'iPhone BRAIN test-vault Device identity (32 lowercase hexadecimal digits; device: prefix optional)').Trim()
    if ($iosId -cmatch '^[a-f0-9]{32}$') { $iosId = 'device:' + $iosId }
    if ($iosId -cnotmatch '^device:[a-f0-9]{32}$') { throw 'Invalid iOS device identity; no test dispatched.' }
  }
  $env:BRAIN_ARTIFACT_PURPOSE = 'development'
  # DEC-349: only the owner's expressly approved frozen budget change is governance-class.
  $env:BVP_CHANGE_CLASS = if ($SoftwareOnlyGovernance) { 'authorized-governance' } else { 'ordinary' }
  if ($RecoverPreviouslyDispatchedWindowsSmoke) {
    if ($RunWindowsPhysicalSmoke -or $UseRecoveredSoftwareEvidence -or $RunS09ADualPhysicalReadiness) {
      throw 'Retrospective evidence recovery cannot be combined with a new physical dispatch.'
    }
    # PHX-CI-only read of the prior interrupted smoke: no device command is sent.
    & $phxFrontDoor -RepoRoot $repository -Branch $branch -BaseRef 'origin/master' -PublicationMode push -FocusedTestCommand $recoveryCommand -TempRoot $runRoot
    $code = $LASTEXITCODE
  } elseif ($UseRecoveredSoftwareEvidence) {
    if (-not $RunWindowsPhysicalSmoke) { throw 'Recovery evidence may be reused only for physical continuation.' }
    # Recovery verifies immutable PHX-CI observations; its original aggregate verdict stays BLOCKED.
    $qualifiedSource = 'fface1c3233312eb2356c9cebca7c2957e55918f'
    $evidenceCommit = 'd78c4698895bbc762cabebd74edf8c448af4c242'
    & git.exe -C $repository merge-base --is-ancestor $evidenceCommit HEAD
    if ($LASTEXITCODE -ne 0) { throw 'Published PHX-CI evidence not ancestral; physical run not dispatched.' }
    $sinceQualification = @(& git.exe -C $repository diff --name-only $qualifiedSource HEAD)
    if ($LASTEXITCODE -ne 0 -or
        @($sinceQualification | Where-Object { $_ -notmatch '^(dev/_ca-output\.(md|json)|dev/test-results/|dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection\.ps1$)' }).Count -ne 0) {
      throw 'Implementation or tests changed since original software checks; evidence reuse denied.'
    }
    $evidenceLines = @(& git.exe -C $repository show ($evidenceCommit + ':dev/_ca-output.json'))
    if ($LASTEXITCODE -ne 0 -or $evidenceLines.Count -eq 0) {
      throw 'Original PHX-CI JSON is unreadable; physical run not dispatched.'
    }
    $evidence = ($evidenceLines -join [Environment]::NewLine) | ConvertFrom-Json -Depth 100
    if ($evidence.runId -cne 'e231a5b5-7a14-42e2-b8ae-766f062fac0c' -or
        $evidence.status -cne 'BLOCKED' -or
        $evidence.repository.verifiedHead -cne $qualifiedSource -or
        $evidence.verification.changeSet.status -cne 'PASS' -or
        $evidence.verification.repository.status -cne 'PASS' -or
        $evidence.verification.overall.classification -cne 'REPOSITORY-GATE FAILURE') {
      throw 'Original PHX-CI identity or substantive verdict is not the expected one.'
    }
    foreach ($stageName in @('typecheck','test-focused','test','build','artifacts')) {
      $found = @($evidence.stages | Where-Object { $_.name -ceq $stageName -and $_.result -ceq 'PASS' -and $_.exitCode -eq 0 })
      if ($found.Count -ne 1) { throw ('Original software stage cannot be reused: ' + $stageName) }
    }
    $gate = @($evidence.stages | Where-Object { $_.name -ceq 'repository-check' -and $_.result -ceq 'FAIL' -and $_.exitCode -eq 1 })
    if ($gate.Count -ne 1 -or
        $gate[0].stdout -notmatch 'SHIPPING_ARTIFACT_MODE=approved-artifact-enforcement' -or
        $gate[0].stdout -notmatch 'BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=0 metricsExit=0') {
      throw 'Original gate failure is not the known launcher artifact-mode error.'
    }
    $focused = @($evidence.stages | Where-Object { $_.name -ceq 'test-focused' })[0]
    $full = @($evidence.stages | Where-Object { $_.name -ceq 'test' })[0]
    if ($focused.stdout -notmatch '(?m)^# pass 464\r?$' -or
        $full.stdout -notmatch '(?m)^# pass 1292\r?$') {
      throw 'Original software PASS tallies are unverified.'
    }
    Write-Output 'SOFTWARE_EVIDENCE_RECOVERED=464_FOCUSED_PASS_1292_REPOSITORY_PASS_BUILD_PASS_PREVIOUS_PHX_BLOCKED'
    $code = 0
  } else {
    & $phxFrontDoor -RepoRoot $repository -Branch $branch -BaseRef 'origin/master' -PublicationMode push -FocusedTestCommand $qualifiedCommand -TempRoot $runRoot
    $code = $LASTEXITCODE
  }
  if (($RunWindowsPhysicalSmoke -or $RunS09ADualPhysicalReadiness) -and $code -eq 0) {
    # The original software checks passed; recovered PHX aggregate remains BLOCKED.
    # Fast-forward ONLY this disposable control clone, never an owner's checkout.
    & git.exe -C $repository fetch origin --prune
    if ($LASTEXITCODE -ne 0) { throw 'Unable to refresh published software-qualification evidence.' }
    & git.exe -C $repository merge --ff-only ('origin/' + $branch)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to fast-forward isolated control clone; physical battery not dispatched.' }
    # After PHX-CI publishes evidence, only evidence may differ from frozen source.
    # Fail closed on concurrent implementation updates instead of unverified smoke.
    $publishedChanges = @(& git.exe -C $repository diff --name-only $ExpectedSourceSha HEAD)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect post-qualification source changes; physical battery not dispatched.' }
    $unexpectedPublishedPaths = @($publishedChanges | Where-Object { $_ -notmatch '^(dev/_ca-output\.(md|json)|dev/test-results/)' })
    if ($unexpectedPublishedPaths.Count -ne 0) { throw 'Non-evidence changes after qualification; physical battery not dispatched.' }
    $postQualificationDirty = @(& git.exe -C $repository status --porcelain=v1 --untracked-files=all)
    if ($LASTEXITCODE -ne 0 -or $postQualificationDirty.Count -ne 0) { throw 'Dirty qualification checkout; physical battery not dispatched.' }
    $approvalPrompt = if ($RunS09ADualPhysicalReadiness) {
      'Confirm exact BVP validation-only builds on BOTH disposable Windows and iPhone vaults, independent OAuth and intended managed test root, automatic sync disabled, existing BVP mailbox; authorize TWO status observations and BVP mailbox metadata writes (type YES)'
    } else {
      'Confirm Google Drive already contains BRAIN BVP Mailbox and Windows Obsidian BVP is open; authorize ONE smoke fixture/control run (type YES)'
    }
    $confirmation = Read-Host $approvalPrompt
    if ($confirmation -cne 'YES') { throw 'Physical test not authorized; no device dispatch.' }
    if ($RunS09ADualPhysicalReadiness) {
      $env:BVP_IOS_DEVICE_ID = $iosId
      $env:BVP_S09A_DUAL_OWNER_APPROVAL = 'YES'
      $env:BVP_IOS_VALIDATION_READY_CONFIRMED = 'YES'
    }
    $env:BVP_OWNER_PHYSICAL_APPROVAL = 'YES'
    $env:BVP_EXISTING_MAILBOX_ROOT_CONFIRMED = 'YES'
    $env:BVP_WINDOWS_SMOKE_SCRATCH = Join-Path 'C:\temp' ([guid]::NewGuid().ToString('N'))
    & $phxFrontDoor -RepoRoot $repository -Branch $branch -BaseRef 'origin/master' -PublicationMode push -FocusedTestCommand $dualPhysicalCommand -TempRoot $runRoot
    $code = $LASTEXITCODE
  }
} finally {
  if ($null -eq $priorPurpose) { Remove-Item Env:\BRAIN_ARTIFACT_PURPOSE -ErrorAction SilentlyContinue }
  else { $env:BRAIN_ARTIFACT_PURPOSE = $priorPurpose }
  if ($null -eq $priorClass) { Remove-Item Env:\BVP_CHANGE_CLASS -ErrorAction SilentlyContinue }
  else { $env:BVP_CHANGE_CLASS = $priorClass }
  foreach ($entry in @(
    @{ Name = 'BVP_OWNER_PHYSICAL_APPROVAL'; Value = $priorConsent },
    @{ Name = 'BVP_EXISTING_MAILBOX_ROOT_CONFIRMED'; Value = $priorExisting },
    @{ Name = 'BVP_WINDOWS_SMOKE_SCRATCH'; Value = $priorScratch },
    @{ Name = 'BVP_IOS_DEVICE_ID'; Value = $priorIosId },
    @{ Name = 'BVP_S09A_DUAL_OWNER_APPROVAL'; Value = $priorIosApproval },
    @{ Name = 'BVP_IOS_VALIDATION_READY_CONFIRMED'; Value = $priorIosReady }
  )) {
    if ($null -eq $entry.Value) { Remove-Item ('Env:' + $entry.Name) -ErrorAction SilentlyContinue }
    else { [Environment]::SetEnvironmentVariable($entry.Name, [string]$entry.Value, 'Process') }
  }
}
Write-Output ('PHX-CI_EXIT_CODE=' + $code)
Write-Output ('FROZEN_SOURCE_SHA=' + $ExpectedSourceSha)
Write-Output ('RUN_ROOT=' + $runRoot)
$global:LASTEXITCODE = $code
if ($code -ne 0) {
  if ($SoftwareOnlyBranch) {
    Write-Warning 'PHX-CI software-only qualification did not pass; physical dispatch was disabled.'
  } else {
    Write-Warning 'PHX-CI did not pass; physical effects may be uncertain if a live run began. Do not retry without reconciling its original evidence.'
  }
}
