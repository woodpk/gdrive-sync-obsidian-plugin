# PHX-CI-only verifier invocation for the BRAIN Windows direct-relay correction.
# PHX-CI owns software qualification and the separately owner-approved Windows BVP smoke.
# Reconciles the precisely identified prior timeout only after authenticated late receipt; never rewrites the prior PHX verdict.
# Never edits the installed plugin, pairing, product sync, or independent evidence.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ExpectedSourceSha,
  [switch]$RunWindowsPhysicalSmoke,
  [switch]$UseRecoveredSoftwareEvidence,
  [switch]$RecoverPreviouslyDispatchedWindowsSmoke
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$branch = 'fix/s09-bvp-live-controller-20261022'
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
if ($LASTEXITCODE -ne 0 -or $local.Count -ne 1 -or $local[0].Trim() -cne $ExpectedSourceSha) {
  throw 'Local source commit differs from the authorized exact source.'
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
$qualifiedCommand = 'npm run test:bvp-root'
$recoveryCommand = 'npm run test:bvp-root && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --recover-privacy-blocked-windows-smoke'
$physicalCommand = 'node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --reconcile-second-windows-timeout && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --run-approved-windows-smoke'
try {
  $env:BRAIN_ARTIFACT_PURPOSE = 'development'
  $env:BVP_CHANGE_CLASS = 'ordinary'
  if ($RecoverPreviouslyDispatchedWindowsSmoke) {
    if ($RunWindowsPhysicalSmoke -or $UseRecoveredSoftwareEvidence) {
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
  if ($RunWindowsPhysicalSmoke -and $code -eq 0) {
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
    $confirmation = Read-Host 'Confirm Google Drive already contains BRAIN BVP Mailbox and Windows Obsidian BVP is open; authorize ONE smoke fixture/control run (type YES)'
    if ($confirmation -cne 'YES') { throw 'Physical Windows smoke canceled without dispatch.' }
    $env:BVP_OWNER_PHYSICAL_APPROVAL = 'YES'
    $env:BVP_EXISTING_MAILBOX_ROOT_CONFIRMED = 'YES'
    $env:BVP_WINDOWS_SMOKE_SCRATCH = Join-Path 'C:\temp' ([guid]::NewGuid().ToString('N'))
    & $phxFrontDoor -RepoRoot $repository -Branch $branch -BaseRef 'origin/master' -PublicationMode push -FocusedTestCommand $physicalCommand -TempRoot $runRoot
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
    @{ Name = 'BVP_WINDOWS_SMOKE_SCRATCH'; Value = $priorScratch }
  )) {
    if ($null -eq $entry.Value) { Remove-Item ('Env:' + $entry.Name) -ErrorAction SilentlyContinue }
    else { [Environment]::SetEnvironmentVariable($entry.Name, [string]$entry.Value, 'Process') }
  }
}
Write-Output ('PHX-CI_EXIT_CODE=' + $code)
Write-Output ('FROZEN_SOURCE_SHA=' + $ExpectedSourceSha)
Write-Output ('RUN_ROOT=' + $runRoot)
$global:LASTEXITCODE = $code
if ($code -ne 0) { Write-Warning 'PHX-CI did not pass; physical effects may be uncertain if a live run began. Do not retry without reconciling its original evidence.' }
