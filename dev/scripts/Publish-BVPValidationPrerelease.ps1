# BRAIN BVP 0.1.20-bvp.2: exact-source packaging and GitHub prerelease publication ONLY.
# No PHX-CI invocation, test execution, plugin installation, OAuth, Drive requests, or synchronization.
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

$repository = 'woodpk/gdrive-sync-obsidian-plugin'
$operatorBranch = 'release/bvp-0.1.20-bvp.2-publication-20261116'
$sourceBranch = 'feature/bvp-drivefile-cross-client-readonly-20261115'
$sourceSha = 'b1ef092cf5ce73c7811b5726ee803add2538df2c'
$sourceTree = 'b353df77de37e9c4a1c12a71ef2aac4b9fb4d109'
$version = '0.1.20-bvp.2'
$assets = @('main.js','manifest.json','build-identity.json','release-sha256.txt')
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$runRoot = Join-Path ([IO.Path]::GetTempPath()) ('brain-bvp-release-' + [guid]::NewGuid().ToString('N'))
$sourceRoot = Join-Path $runRoot 'accepted-source'
$stageRoot = Join-Path $runRoot 'staged-assets'
$downloadRoot = Join-Path $runRoot 'published-download'
$evidence = Join-Path $repoRoot 'dev\_ca-output.md'
$log = [Collections.Generic.List[string]]::new()
$state = 'NOT_PUBLISHED'
$publicationAttempted = $false
$published = $false
$verified = $false
$worktreeCreated = $false
$problem = ''
$evidenceProblem = ''
$originalPath = $env:Path
$originalLive = $env:BVP_DEC359_LIVE_RUN
$originalVersion = $env:BVP_VALIDATION_PRERELEASE_VERSION
$originalGhPrompt = $env:GH_PROMPT_DISABLED
$releaseUrl = ''
$hashes = [ordered]@{}

function Note([string]$message) {
  $script:log.Add($message)
  Write-Host $message
}

function Run([string]$label, [string]$command, [string[]]$arguments, [string]$directory) {
  $script:log.Add(('COMMAND [{0}]: {1} {2}' -f $label,$command,($arguments -join ' ')))
  Push-Location -LiteralPath $directory
  try {
    $outputItems = @(& $command @arguments 2>&1)
    $code = [int]$LASTEXITCODE
  } finally {
    Pop-Location
  }
  $output = ($outputItems | Out-String -Width 4096).TrimEnd()
  $script:log.Add(('EXIT [{0}]: {1}' -f $label,$code))
  $script:log.Add(('OUTPUT [{0}]:' -f $label))
  $script:log.Add($output)
  if ($code -ne 0) { throw ('{0} failed (exit {1}); full output preserved in release evidence.' -f $label,$code) }
  return $output.Trim()
}

function FileDigest([string]$file) {
  return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
}

New-Item -ItemType Directory -Path $runRoot -ErrorAction Stop | Out-Null
Note ('RELEASE: ' + $version)
Note ('ACCEPTED SOURCE: ' + $sourceSha)
Note ('LOCAL EVIDENCE: ' + $runRoot)

try {
  if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7 or newer is required.' }
  foreach ($program in @('git.exe','node.exe','npm.cmd','gh.exe')) {
    if (-not (Get-Command $program -CommandType Application -ErrorAction SilentlyContinue)) {
      throw ('Required program is unavailable: ' + $program)
    }
  }
  $nodeExe = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
  $env:Path = [IO.Path]::GetDirectoryName($nodeExe) + [IO.Path]::PathSeparator + $originalPath
  $env:BVP_DEC359_LIVE_RUN = 'NO'
  $env:BVP_VALIDATION_PRERELEASE_VERSION = $version
  $env:GH_PROMPT_DISABLED = '1'

  $actualRoot = Run 'repository root' 'git.exe' @('-C',$repoRoot,'rev-parse','--show-toplevel') $repoRoot
  if ([IO.Path]::GetFullPath($actualRoot).TrimEnd('\','/') -ine $repoRoot.TrimEnd('\','/')) {
    throw 'Script directory is not the expected Git checkout root.'
  }
  # Do not record the remote URL: a misconfigured HTTPS remote might embed a credential.
  $remoteUrl = (& git.exe -C $repoRoot remote get-url origin 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $remoteUrl) { throw 'Unable to resolve the origin URL.' }
  $log.Add('Origin URL identity inspected without recording its potentially sensitive value.')
  if ($remoteUrl -notmatch '^(https://github[.]com/|git@github[.]com:|ssh://git@github[.]com/|git://github[.]com/)woodpk/gdrive-sync-obsidian-plugin([.]git)?/?$') {
    throw 'Git origin is not the expected BRAIN repository.'
  }
  $dirty = Run 'operator checkout cleanliness' 'git.exe' @('-C',$repoRoot,'status','--porcelain=v1','--untracked-files=all') $repoRoot
  if ($dirty) { throw 'The operator checkout is not clean.' }
  $actualBranch = Run 'operator branch name' 'git.exe' @('-C',$repoRoot,'branch','--show-current') $repoRoot
  if ($actualBranch -cne $operatorBranch) { throw 'Operator must execute from the dedicated release publication branch.' }
  $remoteOperator = Run 'remote operator SHA' 'git.exe' @('-C',$repoRoot,'rev-parse',('origin/' + $operatorBranch)) $repoRoot
  $localOperator = Run 'local operator SHA' 'git.exe' @('-C',$repoRoot,'rev-parse','HEAD') $repoRoot
  if ($localOperator -cne $remoteOperator) { throw 'Operator checkout differs from the published release script branch.' }

  $existingTag = Run 'preexisting release tag' 'git.exe' @('-C',$repoRoot,'ls-remote','--tags','origin',('refs/tags/' + $version)) $repoRoot
  if ($existingTag) { throw 'Release tag already exists; refusing to republish or overwrite.' }

  $null = Run 'fetch accepted source' 'git.exe' @('-C',$repoRoot,'fetch','--no-tags','origin',$sourceBranch) $repoRoot
  $actualTree = Run 'accepted source tree' 'git.exe' @('-C',$repoRoot,'rev-parse',($sourceSha + '^{tree}')) $repoRoot
  if ($actualTree -cne $sourceTree) { throw 'Accepted source tree differs from independently accepted identity.' }
  $null = Run 'create isolated source worktree' 'git.exe' @('-C',$repoRoot,'worktree','add','--detach',$sourceRoot,$sourceSha) $repoRoot
  $worktreeCreated = $true
  $checkedOut = Run 'isolated source HEAD' 'git.exe' @('-C',$sourceRoot,'rev-parse','HEAD') $sourceRoot
  if ($checkedOut -cne $sourceSha) { throw 'Isolated checkout has incorrect source identity.' }
  $sourceDirty = Run 'isolated source cleanliness' 'git.exe' @('-C',$sourceRoot,'status','--porcelain=v1','--untracked-files=all') $sourceRoot
  if ($sourceDirty) { throw 'Isolated accepted source worktree is not clean.' }

  Note 'Building release assets from exact accepted source; no tests or PHX-CI are being run.'
  $null = Run 'install locked packaging dependencies' 'npm.cmd' @('ci','--no-audit','--no-fund') $sourceRoot
  $compiler = Join-Path $sourceRoot 'node_modules\typescript\bin\tsc'
  if (-not [IO.File]::Exists($compiler)) { throw 'Locked TypeScript compiler is absent.' }
  $null = Run 'compile validation artifact builder' 'node.exe' @($compiler,'-p','test-platform/tsconfig.json') $sourceRoot
  $builder = Join-Path $sourceRoot '.test-build\bvp\test-platform\src\build-validation-artifact.js'
  if (-not [IO.File]::Exists($builder)) { throw 'Existing accepted validation artifact builder is absent.' }
  $null = Run 'generate validation-only Obsidian bundle' 'node.exe' @($builder) $sourceRoot

  $generated = Join-Path $sourceRoot '.test-build\bvp-live-device\plugin'
  $identity = Get-Content -LiteralPath (Join-Path $generated 'build-identity.json') -Raw | ConvertFrom-Json
  $manifest = Get-Content -LiteralPath (Join-Path $generated 'manifest.json') -Raw | ConvertFrom-Json
  if ($identity.schemaVersion -ne 1 -or $identity.sourceCommit -cne $sourceSha -or
      $identity.artifact -cne 'main.js' -or $manifest.version -cne $version -or
      $manifest.id -cne 'brain-google-drive-sync' -or $manifest.isDesktopOnly -ne $false) {
    throw 'Generated release identity or manifest does not correspond to the accepted source.'
  }
  New-Item -ItemType Directory -Path $stageRoot -ErrorAction Stop | Out-Null
  foreach ($asset in @('main.js','manifest.json','build-identity.json')) {
    $from = Join-Path $generated $asset
    if (-not [IO.File]::Exists($from)) { throw ('Generated asset is missing: ' + $asset) }
    Copy-Item -LiteralPath $from -Destination (Join-Path $stageRoot $asset) -ErrorAction Stop
    $hashes[$asset] = FileDigest (Join-Path $stageRoot $asset)
  }
  if ($identity.artifactSha256 -cne $hashes['main.js'] -or
      $identity.manifestSha256 -cne $hashes['manifest.json'] -or
      $identity.artifactSize -ne (Get-Item -LiteralPath (Join-Path $stageRoot 'main.js')).Length) {
    throw 'Generated artifact hashes or size disagree with the embedded source identity.'
  }
  $checksumLines = foreach ($asset in @('main.js','manifest.json','build-identity.json')) {
    $hashes[$asset] + '  ' + $asset
  }
  [IO.File]::WriteAllText((Join-Path $stageRoot 'release-sha256.txt'),(($checksumLines -join [Environment]::NewLine) + [Environment]::NewLine),[Text.UTF8Encoding]::new($false))
  $hashes['release-sha256.txt'] = FileDigest (Join-Path $stageRoot 'release-sha256.txt')

  Note 'Exactly four staged assets, with SHA-256 identities:'
  foreach ($asset in $assets) { Note ('  ' + $asset + '  ' + $hashes[$asset]) }
  Note ('STAGED ASSETS: ' + $stageRoot)
  Note 'This is package creation and identity recording, NOT a new software qualification.'
  $state = 'PREPARED_AWAITING_OWNER_EXACT_BYTE_APPROVAL'

  $approval = 'PUBLISH ' + $version + ' ' + $hashes['release-sha256.txt'].Substring(0,12)
  $answer = Read-Host ('To approve these exact bytes and publish, type: ' + $approval)
  if ($answer -cne $approval) {
    Note 'Exact-byte approval was not supplied. No GitHub release attempted.'
  } else {
    Note ('OWNER EXACT-BYTE APPROVAL RECORDED: ' + $approval)
    $tagAgain = Run 'prepublish remote tag check' 'git.exe' @('-C',$repoRoot,'ls-remote','--tags','origin',('refs/tags/' + $version)) $repoRoot
    if ($tagAgain) { throw 'Release tag appeared concurrently; refusing publication.' }
    $notesPath = Join-Path $runRoot 'release-notes.md'
    $notes = @(
      ('BRAIN BVP ' + $version + ' - validation-only prerelease'),
      '',
      'TEST-ONLY: Not a general production plugin release.',
      ('Accepted source commit: ' + $sourceSha),
      ('Accepted source tree: ' + $sourceTree),
      ('Validation bundle main.js SHA-256: ' + $hashes['main.js']),
      ('Validation manifest.json SHA-256: ' + $hashes['manifest.json']),
      'Windows/iOS installation, OAuth, pairing, physical BVP operation and synchronization are separate and not performed by this release process.',
      'This packaging operation does not claim a new PHX-CI qualification.'
    )
    [IO.File]::WriteAllLines($notesPath,$notes,[Text.UTF8Encoding]::new($false))
    $paths = @($assets | ForEach-Object { Join-Path $stageRoot $_ })
    $publicationAttempted = $true
    $releaseUrl = Run 'create GitHub prerelease with exact assets' 'gh.exe' (
      @('release','create',$version) + $paths +
      @('--repo',$repository,'--target',$sourceSha,'--prerelease','--latest=false',
        '--title',('BRAIN BVP ' + $version + ' (validation only)'),'--notes-file',$notesPath)
    ) $repoRoot
    $published = $true
    $state = 'PUBLISHED_READBACK_PENDING'

    $result = Run 'read back published prerelease' 'gh.exe' @('release','view',$version,'--repo',$repository,'--json','tagName,isDraft,isPrerelease,assets,url') $repoRoot
    $release = $result | ConvertFrom-Json
    if ($release.tagName -cne $version -or $release.isDraft -ne $false -or $release.isPrerelease -ne $true) {
      throw 'GitHub release metadata does not describe the expected published prerelease.'
    }
    $observedNames = @($release.assets | ForEach-Object { $_.name } | Sort-Object)
    if (($observedNames -join '|') -cne (@($assets | Sort-Object) -join '|')) {
      throw 'Published asset names do not match the approved four-asset package.'
    }
    $remoteTag = Run 'published tag identity' 'git.exe' @('-C',$repoRoot,'ls-remote','--tags','origin',('refs/tags/' + $version)) $repoRoot
    $remoteDeref = Run 'annotated tag dereference' 'git.exe' @('-C',$repoRoot,'ls-remote','--tags','origin',('refs/tags/' + $version + '^{}')) $repoRoot
    $tagText = if ($remoteDeref) { $remoteDeref } else { $remoteTag }
    $tagCommit = ($tagText -split '\s+')[0]
    if ($tagCommit -cne $sourceSha) { throw 'Published tag does not point to the accepted source SHA.' }
    New-Item -ItemType Directory -Path $downloadRoot -ErrorAction Stop | Out-Null
    $null = Run 'download published asset copies' 'gh.exe' @('release','download',$version,'--repo',$repository,'--dir',$downloadRoot) $repoRoot
    foreach ($asset in $assets) {
      $downloaded = Join-Path $downloadRoot $asset
      if (-not [IO.File]::Exists($downloaded)) { throw ('Published asset is unavailable: ' + $asset) }
      $actualHash = FileDigest $downloaded
      if ($actualHash -cne $hashes[$asset]) { throw ('Published asset differs from exact approved bytes: ' + $asset) }
    }
    $verified = $true
    $state = 'PUBLISHED_EXACT_BYTES_CONFIRMED'
    $releaseUrl = [string]$release.url
    Note ('RELEASE PUBLISHED: ' + $releaseUrl)
    Note 'Exact published tag and all four downloaded assets match the approved source and SHA-256 values.'
    Note 'STOP AT PUBLICATION. No installation or physical testing performed.'
  }
} catch {
  $problem = $_.Exception.Message
  $state = if ($published -or $publicationAttempted) { 'PUBLICATION_ATTEMPTED_RECONCILIATION_REQUIRED' } else { 'NOT_PUBLISHED_BLOCKED' }
  Note ('RELEASE BLOCKER: ' + $problem)
  if ($publicationAttempted) { Note 'Inspect the remote GitHub tag/release before ANY retry. Never overwrite an existing release.' }
} finally {
  try {
    if ($worktreeCreated) {
      $null = Run 'remove isolated build worktree' 'git.exe' @('-C',$repoRoot,'worktree','remove','--force',$sourceRoot) $repoRoot
    }
  } catch {
    Note ('TEMPORARY WORKTREE CLEANUP ISSUE: ' + $_.Exception.Message)
  }
  $env:Path = $originalPath
  [Environment]::SetEnvironmentVariable('BVP_DEC359_LIVE_RUN',$originalLive,'Process')
  [Environment]::SetEnvironmentVariable('BVP_VALIDATION_PRERELEASE_VERSION',$originalVersion,'Process')
  [Environment]::SetEnvironmentVariable('GH_PROMPT_DISABLED',$originalGhPrompt,'Process')

  try {
    $record = [Collections.Generic.List[string]]::new()
    $record.Add('')
    $record.Add('## BRAIN BVP ' + $version + ' release-operator record')
    $record.Add('')
    $record.Add('- Status: ' + $state)
    $record.Add('- Accepted source SHA: ' + $sourceSha)
    $record.Add('- Accepted source tree: ' + $sourceTree)
    $record.Add('- Operator branch: ' + $operatorBranch)
    $record.Add('- GitHub release: ' + $(if ($releaseUrl) { $releaseUrl } else { 'NOT CONFIRMED' }))
    $record.Add('- New PHX-CI run: NONE; no software-validation result claimed')
    $record.Add('- Physical devices, OAuth, Drive, sync and vault installation: NOT TOUCHED')
    $record.Add('- Local staging/evidence location: ' + $runRoot)
    $record.Add('- Publication attempt: ' + $publicationAttempted)
    $record.Add('- Postpublication byte readback: ' + $verified)
    foreach ($asset in $assets) {
      if ($hashes.Contains($asset)) { $record.Add('- SHA256 ' + $asset + ': ' + $hashes[$asset]) }
    }
    if ($problem) { $record.Add('- Blocker: ' + $problem) }
    $record.Add('')
    $record.Add('~~~~text')
    foreach ($line in $log) { $record.Add($line) }
    $record.Add('~~~~')
    Add-Content -LiteralPath $evidence -Value ($record -join [Environment]::NewLine) -Encoding utf8
    $null = Run 'stage release evidence only' 'git.exe' @('-C',$repoRoot,'add','--','dev/_ca-output.md') $repoRoot
    $null = Run 'commit release evidence only' 'git.exe' @('-C',$repoRoot,'commit','-m',('docs(release): record BVP ' + $version + ' publication state')) $repoRoot
    $null = Run 'push release-operator evidence branch' 'git.exe' @('-C',$repoRoot,'push','origin',('HEAD:refs/heads/' + $operatorBranch)) $repoRoot
    Note 'Release record committed and pushed to the separate operator branch.'
  } catch {
    $evidenceProblem = $_.Exception.Message
    Note ('EVIDENCE PERSISTENCE BLOCKER: ' + $evidenceProblem)
    Note ('Local staged artifacts and release-operation detail retained: ' + $runRoot)
  }
}

Write-Host ('FINAL RELEASE STATE: ' + $state)
Write-Host ('RELEASE URL: ' + $(if ($releaseUrl) { $releaseUrl } else { 'NONE CONFIRMED' }))
Write-Host ('STAGING/EVIDENCE: ' + $runRoot)
if ($problem -or $evidenceProblem) {
  throw ('Release operator requires reconciliation: ' + $problem + ' ' + $evidenceProblem)
}
