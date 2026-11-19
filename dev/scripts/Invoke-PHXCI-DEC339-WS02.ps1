# PHX-CI-only software qualification launcher for DEC-339 WS-02.
# This script does not run builds/tests/checks except through the pinned PHX-CI front door.
# No live Drive/vault, device, deployment or release operations are authorized.
[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^[a-f0-9]{40}$')]
  [string]$ExpectedSourceSha
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd([char[]]@('\', '/'))
$branch = 'build/dec339-ws02-storage-safety-20261119'
$exitCode = 1
try {
  $config = Get-Content -LiteralPath (Join-Path $repo 'phx-ci.json') -Raw | ConvertFrom-Json
  if ($config.repositoryIdentity -cne 'woodpk/gdrive-sync-obsidian-plugin' -or
      $config.framework.sha -cne '4cf0c865c7b189641e2acebc0a6ad757b6f01992') {
    throw 'Repository identity or approved PHX-CI runtime pin changed; do not dispatch.'
  }
  $front = Join-Path $env:LOCALAPPDATA ('PHX-CI\runtimes\' + $config.framework.sha + '\scripts\Invoke-PhxCi.ps1')
  if (-not (Test-Path -LiteralPath $front -PathType Leaf)) {
    throw "Pinned PHX-CI runtime not installed: $front"
  }
  $head = (& git.exe -C $repo rev-parse HEAD | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $head -cne $ExpectedSourceSha) {
    throw "Local HEAD not the explicitly pinned candidate. Expected $ExpectedSourceSha, actual $head"
  }
  $selected = (& git.exe -C $repo branch --show-current | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $selected -cne $branch) {
    throw 'Wrong feature branch; do not dispatch PHX-CI.'
  }
  $dirty = @(& git.exe -C $repo status --porcelain=v1 --untracked-files=all)
  if ($LASTEXITCODE -ne 0 -or $dirty.Count -gt 0) {
    throw 'Working tree is not clean; do not dispatch PHX-CI.'
  }
  & git.exe -C $repo fetch origin --prune ('+refs/heads/' + $branch + ':refs/remotes/origin/' + $branch) '+refs/heads/master:refs/remotes/origin/master'
  if ($LASTEXITCODE -ne 0) { throw 'Failed to refresh remote source and master baseline.' }
  $remote = (& git.exe -C $repo rev-parse ('refs/remotes/origin/' + $branch) | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $remote -cne $ExpectedSourceSha) {
    throw 'Remote candidate is not the pinned SHA; do not dispatch PHX-CI.'
  }
  $tempRoot = Join-Path 'C:\temp' ([guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  $env:BRAIN_ARTIFACT_PURPOSE = 'development'
  $env:BVP_CHANGE_CLASS = 'ordinary'
  Remove-Item Env:BVP_OWNER_PHYSICAL_APPROVAL -ErrorAction SilentlyContinue
  Write-Host "PHX-CI source=$ExpectedSourceSha branch=$branch framework=$($config.framework.sha)"
  Write-Host "PHX-CI run-root=$tempRoot; all executable qualification is PHX-CI-owned."
  & $front -RepoRoot $repo -Branch $branch -BaseRef 'origin/master' -PublicationMode push -FocusedTestCommand 'npm run test:bvp-root' -TempRoot $tempRoot
  $exitCode = $LASTEXITCODE
  if ($null -eq $exitCode) { $exitCode = 1 }
  Write-Host "PHX-CI launcher exit=$exitCode"
} catch {
  Write-Error -ErrorAction Continue "PHX-CI dispatch BLOCKED: $($_.Exception.Message)"
  $exitCode = 1
}
exit [int]$exitCode
