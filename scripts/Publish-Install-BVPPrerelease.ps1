# BRAIN test-only BRAT prerelease publication + Windows vault installation.
# Owner-directed release operation; not a PHX-CI validator and never initiates sync.
# Run from a clean, isolated clone after closing Obsidian.
[CmdletBinding()]
param(
  [string]$VaultPath = 'D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b',
  [ValidatePattern('^\d+\.\d+\.\d+-bvp\.[1-9]\d*$')]
  [string]$Version = '0.1.20-bvp.2'
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$started = Get-Date
$stage = 'Initialization'
$status = 'BLOCKED'
$failure = ''
$nextAction = ''
$exitCode = 1
$runRoot = ''
$logPath = ''
$source = 'NOT_RESOLVED'
$releaseUrl = 'NOT_CREATED'
$published = $false
$publicationAttempted = $false
$installed = $false
$locationPushed = $false
$transcribing = $false
$steps = [Collections.Generic.List[string]]::new()
$repoName = 'woodpk/gdrive-sync-obsidian-plugin'
$branch = 'release/bvp-0.1.20-bvp.2-preparation-20261116'
$assetNames = @('main.js','manifest.json','build-identity.json','release-sha256.txt')
$backupDirectory = ''
$priorLive = [Environment]::GetEnvironmentVariable('BVP_DEC359_LIVE_RUN','Process')

function Invoke-ReleaseCommand {
  param([string]$Executable,[string[]]$Arguments,[string]$Operation)
  $script:stage = $Operation
  if ($script:logPath) {
    Add-Content -LiteralPath $script:logPath -Value ("COMMAND [{0}]: {1} {2}" -f $Operation,$Executable,($Arguments -join ' ')) -Encoding UTF8
  }
  $out = @(& $Executable @Arguments 2>&1)
  $nativeExit = $LASTEXITCODE
  foreach ($item in $out) {
    $line = [string]$item
    if ($script:logPath) { Add-Content -LiteralPath $script:logPath -Value $line -Encoding UTF8 }
    [Console]::Out.WriteLine($line)
  }
  if ($null -eq $nativeExit) { $nativeExit = 1 }
  $script:steps.Add(("{0}: {1} (exit {2})" -f $Operation,$(if ($nativeExit -eq 0) {'PASS'} else {'FAIL'}),$nativeExit))
  if ($nativeExit -ne 0) { throw "$Operation returned exit $nativeExit. See preserved command log." }
  return ($out | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
}

function Assert-ByteIdentity {
  param([string]$First,[string]$Second,[string]$Description)
  if (-not [IO.File]::Exists($First) -or -not [IO.File]::Exists($Second)) {
    throw "${Description}: required artifact missing."
  }
  $a = (Get-FileHash -LiteralPath $First -Algorithm SHA256).Hash
  $b = (Get-FileHash -LiteralPath $Second -Algorithm SHA256).Hash
  if ($a -cne $b) { throw "${Description}: published and built file hashes disagree." }
}

try {
  if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7 or newer is required.' }
  if ($Version -cne '0.1.20-bvp.2') { throw 'Only the owner-approved 0.1.20-bvp.2 prerelease may be published.' }
  $runRoot = Join-Path 'C:\temp' ('bvp-release-' + [guid]::NewGuid().ToString('N'))
  [IO.Directory]::CreateDirectory($runRoot) | Out-Null
  $logPath = Join-Path $runRoot 'commands-complete.log'
  $transcript = Join-Path $runRoot 'terminal-complete.log'
  Start-Transcript -LiteralPath $transcript -ErrorAction Stop | Out-Null
  $transcribing = $true

  $stage = 'Preflight'
  $repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
  $resolvedVault = [IO.Path]::GetFullPath($VaultPath).TrimEnd([char[]]@('\','/'))
  if ($resolvedVault -cne 'D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b') {
    throw 'Vault path differs from the owner-authorized exact target.'
  }
  if (-not [IO.Directory]::Exists($resolvedVault) -or -not [IO.Directory]::Exists((Join-Path $resolvedVault '.obsidian'))) {
    throw 'The exact Windows vault or its .obsidian configuration directory does not exist.'
  }
  if (@(Get-Process -Name Obsidian -ErrorAction SilentlyContinue).Count -gt 0) {
    throw 'Close Obsidian completely before installing plugin files. No release or install attempted.'
  }
  foreach ($exe in @('git.exe','node.exe','npm.cmd','gh.exe')) {
    if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { throw "Required tool not available: $exe" }
  }
  $actualRepo = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'rev-parse','--show-toplevel') 'Repository root').Trim().Replace('/','\')
  if ([IO.Path]::GetFullPath($actualRepo).TrimEnd('\') -ine $repo.TrimEnd('\')) {
    throw 'Script must run from its own repository checkout.'
  }
  $currentBranch = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'branch','--show-current') 'Branch identity').Trim()
  if ($currentBranch -cne $branch) { throw "Wrong branch: $currentBranch" }
  $source = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'rev-parse','HEAD') 'Exact source SHA').Trim()
  if ($source -cnotmatch '^[0-9a-f]{40}$') { throw 'Git did not return a full commit SHA.' }
  $dirty = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'status','--porcelain=v1','--untracked-files=all') 'Clean checkout').Trim()
  if ($dirty) { throw 'Checkout contains uncommitted changes; release is blocked.' }
  $env:BVP_DEC359_LIVE_RUN = 'NO'
  Push-Location -LiteralPath $repo -ErrorAction Stop
  $locationPushed = $true
  $steps.Add('Repository working directory: PASS')
  Invoke-ReleaseCommand 'gh.exe' @('auth','status','--hostname','github.com') 'GitHub authentication' | Out-Null
  $currentTag = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'ls-remote','--tags','origin',("refs/tags/" + $Version)) 'Existing tag check').Trim()
  $existingTag = [bool]$currentTag
  if ($existingTag) {
    $deref = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'ls-remote','--tags','origin',("refs/tags/" + $Version + '^{}')) 'Annotated tag check').Trim()
    $tagText = if ($deref) { $deref } else { $currentTag }
    $tagCommit = ($tagText -split '\s+')[0]
    if ($tagCommit -cne $source) { throw 'Existing release tag points to a different source; refusing to overwrite.' }
  }

  $stage = 'Build validation-only prerelease assets'
  Invoke-ReleaseCommand 'npm.cmd' @('ci','--no-audit','--no-fund') 'Install locked build dependencies' | Out-Null
  Invoke-ReleaseCommand 'node.exe' @('scripts/prepare-bvp-prerelease.mjs','--source-sha',$source,'--version',$Version) 'Build BVP-only prerelease' | Out-Null
  $packageRoot = Join-Path $repo ('.test-build\bvp-prerelease\' + $Version)
  $identity = Get-Content -LiteralPath (Join-Path $packageRoot 'build-identity.json') -Raw | ConvertFrom-Json
  $manifest = Get-Content -LiteralPath (Join-Path $packageRoot 'manifest.json') -Raw | ConvertFrom-Json
  if ($identity.sourceCommit -cne $source -or $identity.artifact -cne 'main.js' -or
      $manifest.version -cne $Version -or $manifest.id -cne 'brain-google-drive-sync' -or
      $manifest.isDesktopOnly -ne $false) { throw 'Built asset metadata does not match the approved source and plugin.' }
  foreach ($asset in $assetNames) {
    if (-not [IO.File]::Exists((Join-Path $packageRoot $asset))) { throw "Build did not produce $asset" }
  }
  $hashLines = @(Get-Content -LiteralPath (Join-Path $packageRoot 'release-sha256.txt'))
  if ($hashLines.Count -ne 3) { throw 'Expected exactly three SHA-256 checksum entries.' }
  foreach ($asset in $assetNames | Where-Object { $_ -ne 'release-sha256.txt' }) {
    $hash = (Get-FileHash -LiteralPath (Join-Path $packageRoot $asset) -Algorithm SHA256).Hash.ToLowerInvariant()
    if (-not @($hashLines | Where-Object { $_ -ceq ($hash + '  ' + $asset) }).Count) {
      throw "Checksum manifest does not match $asset"
    }
  }
  $steps.Add('Artifact identity and checksums: PASS')

  $stage = 'Publish or reuse GitHub prerelease'
  if (-not $existingTag) {
    $publicationAttempted = $true
    $notesFile = Join-Path $runRoot 'release-notes.md'
    @(
      '# BRAIN BVP validation-only prerelease ' + $Version,
      '',
      'For isolated BRAIN BVP testing only; not the production Obsidian plugin.',
      'Source commit: ' + $source,
      'Contains validation-only BVP device runtime and diagnostic updates.',
      'Physical testing and synchronization remain separately controlled.'
    ) | Set-Content -LiteralPath $notesFile -Encoding UTF8
    $files = @($assetNames | ForEach-Object { Join-Path $packageRoot $_ })
    Invoke-ReleaseCommand 'gh.exe' (@('release','create',$Version) + $files +
      @('--repo',$repoName,'--target',$source,'--prerelease',
        '--title',("BRAIN BVP " + $Version + " (validation only)"),
        '--notes-file',$notesFile)) 'Publish GitHub prerelease' | Out-Null
  } else {
    $steps.Add('GitHub prerelease: EXISTING TAG — verifying identical bytes')
  }
  $releaseText = Invoke-ReleaseCommand 'gh.exe' @('release','view',$Version,'--repo',$repoName,
    '--json','tagName,isDraft,isPrerelease,assets,url') 'Inspect published release'
  $release = $releaseText | ConvertFrom-Json
  if ($release.tagName -cne $Version -or $release.isDraft -ne $false -or $release.isPrerelease -ne $true) {
    throw 'Published GitHub release is not the expected public prerelease.'
  }
  $releaseAssets = @($release.assets | ForEach-Object { $_.name } | Sort-Object)
  if (($releaseAssets -join ',') -cne ((@($assetNames | Sort-Object)) -join ',')) {
    throw 'Published release assets differ from the four required artifacts.'
  }
  $remoteTag = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'ls-remote','--tags','origin',("refs/tags/" + $Version)) 'Published tag source').Trim()
  $remoteDeref = (Invoke-ReleaseCommand 'git.exe' @('-C',$repo,'ls-remote','--tags','origin',("refs/tags/" + $Version + '^{}')) 'Published tag dereference').Trim()
  $remoteTagText = if ($remoteDeref) { $remoteDeref } else { $remoteTag }
  $remoteCommit = ($remoteTagText -split '\s+')[0]
  if ($remoteCommit -cne $source) { throw 'Published tag source differs from the package source.' }
  $releaseUrl = [string]$release.url
  $published = $true

  $download = Join-Path $runRoot 'downloaded-release'
  [IO.Directory]::CreateDirectory($download) | Out-Null
  Invoke-ReleaseCommand 'gh.exe' @('release','download',$Version,'--repo',$repoName,'--dir',$download) 'Download exact GitHub assets' | Out-Null
  foreach ($asset in $assetNames) {
    Assert-ByteIdentity (Join-Path $packageRoot $asset) (Join-Path $download $asset) $asset
  }
  $steps.Add('Published asset SHA-256 identity: PASS')

  $stage = 'Install downloaded prerelease in authorized Windows vault'
  if (@(Get-Process -Name Obsidian -ErrorAction SilentlyContinue).Count -gt 0) {
    throw 'Obsidian was reopened; installation stopped without changing plugin files.'
  }
  $pluginsRoot = Join-Path $resolvedVault '.obsidian\plugins'
  if (-not [IO.Directory]::Exists($pluginsRoot)) { [IO.Directory]::CreateDirectory($pluginsRoot) | Out-Null }
  $pluginRoot = Join-Path $pluginsRoot 'brain-google-drive-sync'
  if ([IO.Directory]::Exists($pluginRoot)) {
    $attributes = [IO.File]::GetAttributes($pluginRoot)
    if (($attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw 'Plugin directory is a reparse point; refusing an unsafe installation.'
    }
    $oldManifest = Join-Path $pluginRoot 'manifest.json'
    if ([IO.File]::Exists($oldManifest)) {
      $old = Get-Content -LiteralPath $oldManifest -Raw | ConvertFrom-Json
      if ($old.id -cne 'brain-google-drive-sync') { throw 'Existing plugin has the wrong identity.' }
    }
  } else { [IO.Directory]::CreateDirectory($pluginRoot) | Out-Null }
  $backupDirectory = Join-Path $runRoot 'previous-installed-plugin'
  [IO.Directory]::CreateDirectory($backupDirectory) | Out-Null
  $installAssets = @('main.js','manifest.json','build-identity.json')
  $previous = @{}
  foreach ($name in $installAssets) {
    $original = Join-Path $pluginRoot $name
    $previous[$name] = [IO.File]::Exists($original)
    if ($previous[$name]) { Copy-Item -LiteralPath $original -Destination (Join-Path $backupDirectory $name) -ErrorAction Stop }
  }
  try {
    foreach ($name in $installAssets) {
      $temporary = Join-Path $pluginRoot ('.' + $name + '.incoming-' + [guid]::NewGuid().ToString('N'))
      try {
        Copy-Item -LiteralPath (Join-Path $download $name) -Destination $temporary -ErrorAction Stop
        [IO.File]::Move($temporary,(Join-Path $pluginRoot $name),$true)
      } finally {
        if ([IO.File]::Exists($temporary)) { Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue }
      }
    }
    foreach ($name in $installAssets) {
      Assert-ByteIdentity (Join-Path $download $name) (Join-Path $pluginRoot $name) $name
    }
  } catch {
    $installProblem = $_.Exception.Message
    $rollbackErrors = [Collections.Generic.List[string]]::new()
    foreach ($name in $installAssets) {
      try {
        $target = Join-Path $pluginRoot $name
        if ($previous[$name]) { Copy-Item -LiteralPath (Join-Path $backupDirectory $name) -Destination $target -Force -ErrorAction Stop }
        elseif ([IO.File]::Exists($target)) { Remove-Item -LiteralPath $target -Force -ErrorAction Stop }
      } catch { $rollbackErrors.Add(("{0}: {1}" -f $name,$_.Exception.Message)) }
    }
    if ($rollbackErrors.Count) { throw "Install failed ($installProblem); rollback incomplete: $($rollbackErrors -join '; ')" }
    throw "Install failed ($installProblem); previous plugin files restored."
  }
  $installed = $true
  $steps.Add('Windows vault plugin file installation: PASS')
  $status = 'SUCCESS'
  $exitCode = 0
  $nextAction = 'Reopen Obsidian only when ready; do not initiate synchronization without authorization.'
} catch {
  $failure = ('{0}: {1}' -f $stage,$_.Exception.Message)
  $status = if (($published -or $publicationAttempted) -and -not $installed) { 'PARTIAL' } else { 'BLOCKED' }
  $nextAction = if ($published) {
    'Release exists; inspect preserved evidence and reconcile asset/install state before retrying.'
  } elseif ($publicationAttempted) {
    'Publication was attempted; inspect the GitHub tag and release before any retry.'
  } else { 'Inspect preserved evidence and resolve the reported build/publication blocker.' }
  $exitCode = 1
} finally {
  if ($locationPushed) {
    try { Pop-Location -ErrorAction Stop } catch { $failure += '; working directory restoration failed'; $status = 'FAILED'; $exitCode = 1 }
  }
  try { [Environment]::SetEnvironmentVariable('BVP_DEC359_LIVE_RUN',$priorLive,'Process') }
  catch { $failure += '; environment variable restoration failed'; $status = 'FAILED'; $exitCode = 1 }
  $duration = ((Get-Date) - $started).ToString('hh\:mm\:ss')
  $fields = @(
    [pscustomobject]@{ Field = 'Status'; Value = $status },
    [pscustomobject]@{ Field = 'Duration'; Value = $duration },
    [pscustomobject]@{ Field = 'Version'; Value = $Version },
    [pscustomobject]@{ Field = 'Source SHA'; Value = $source },
    [pscustomobject]@{ Field = 'GitHub published'; Value = $published },
    [pscustomobject]@{ Field = 'Publication attempted'; Value = $publicationAttempted },
    [pscustomobject]@{ Field = 'Release URL'; Value = $releaseUrl },
    [pscustomobject]@{ Field = 'Windows installed'; Value = $installed },
    [pscustomobject]@{ Field = 'Target vault'; Value = $VaultPath },
    [pscustomobject]@{ Field = 'Last stage'; Value = $stage },
    [pscustomobject]@{ Field = 'Failure'; Value = $(if ($failure) { $failure } else { 'None' }) },
    [pscustomobject]@{ Field = 'Stages'; Value = ($steps -join ' | ') },
    [pscustomobject]@{ Field = 'Backup'; Value = $backupDirectory },
    [pscustomobject]@{ Field = 'Evidence'; Value = $runRoot },
    [pscustomobject]@{ Field = 'Next action'; Value = $nextAction },
    [pscustomobject]@{ Field = 'Exit code'; Value = $exitCode }
  )
  try {
    $summary = $fields | Format-Table -Wrap -AutoSize | Out-String -Width 230
    [Console]::Out.WriteLine('========== BRAIN RELEASE + WINDOWS INSTALL REPORT ==========')
    [Console]::Out.WriteLine($summary)
    [Console]::Out.WriteLine('===========================================================')
    if ($runRoot -and [IO.Directory]::Exists($runRoot)) {
      Set-Content -LiteralPath (Join-Path $runRoot 'final-summary.txt') -Value $summary -Encoding UTF8
    }
  } catch {
    $exitCode = 1
    try { [Console]::Error.WriteLine(("FALLBACK: {0}; source={1}; failure={2}; evidence={3}" -f $status,$source,$failure,$runRoot)) } catch {}
  }
  if ($transcribing) {
    try { Stop-Transcript -ErrorAction Stop | Out-Null }
    catch { $exitCode = 1; try { [Console]::Error.WriteLine("Transcript finalization failed. Evidence: $runRoot") } catch {} }
  }
  $global:LASTEXITCODE = [int]$exitCode
}
