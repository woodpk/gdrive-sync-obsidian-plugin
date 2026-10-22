# PHX-CI-only verifier invocation for the BRAIN Windows direct-relay correction.
# PHX-CI owns software qualification and the separately owner-approved Windows BVP smoke.
# Reconciles the precisely identified prior timeout only after authenticated late receipt; never rewrites the prior PHX verdict.
# Never edits the installed plugin, pairing, product sync, or independent evidence.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ExpectedSourceSha,
  [switch]$RunWindowsPhysicalSmoke
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
if ($LASTEXITCODE -ne 0 -or $base.Count -ne 1 -or $base[0].Trim() -notmatch '^[a-f0-9]{40}
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
$physicalCommand = 'npm run test:bvp-root && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --reconcile-second-windows-timeout && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --run-approved-windows-smoke'
try {
  $env:BRAIN_ARTIFACT_PURPOSE = 'development'
  $env:BVP_CHANGE_CLASS = 'ordinary'
  # First, the complete ordinary PHX-CI software qualification must PASS.
  & $phxFrontDoor -RepoRoot $repository -Branch $branch -BaseRef 'origin/master' -PublicationMode push -FocusedTestCommand $qualifiedCommand -TempRoot $runRoot
  $code = $LASTEXITCODE
  if ($RunWindowsPhysicalSmoke -and $code -eq 0) {
    # The original PASS has now been published as an evidence-only descendant.
    # Fast-forward ONLY this disposable control clone, never an owner's checkout.
    & git.exe -C $repository fetch origin --prune
    if ($LASTEXITCODE -ne 0) { throw 'Unable to refresh published software-qualification evidence.' }
    & git.exe -C $repository merge --ff-only ('origin/' + $branch)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to fast-forward isolated control clone; physical battery not dispatched.' }
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
) {
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
$physicalCommand = 'npm run test:bvp-root && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --reconcile-second-windows-timeout && node .test-build/bvp/test-platform/test/batteries/phxci-physical-bridge.js --run-approved-windows-smoke'
try {
  $env:BRAIN_ARTIFACT_PURPOSE = 'development'
  $env:BVP_CHANGE_CLASS = 'ordinary'
  # First, the complete ordinary PHX-CI software qualification must PASS.
  & $phxFrontDoor -RepoRoot $repository -Branch $branch -BaseRef 'origin/master' -PublicationMode push -FocusedTestCommand $qualifiedCommand -TempRoot $runRoot
  $code = $LASTEXITCODE
  if ($RunWindowsPhysicalSmoke -and $code -eq 0) {
    # The original PASS has now been published as an evidence-only descendant.
    # Fast-forward ONLY this disposable control clone, never an owner's checkout.
    & git.exe -C $repository fetch origin --prune
    if ($LASTEXITCODE -ne 0) { throw 'Unable to refresh published software-qualification evidence.' }
    & git.exe -C $repository merge --ff-only ('origin/' + $branch)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to fast-forward isolated control clone; physical battery not dispatched.' }
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
