# PHX-CI-owned build staging followed by a bounded deployment into the isolated BVP vault.
# Does not start Obsidian, run a physical scenario, or modify data.json / .bvp-relay.
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$SourceHead
)

$ErrorActionPreference = 'Stop'
$branch = 'bvp-s09a-request-attribution-01'
$base = 'ec1e2e1a27577587aa3ab14cced01f0804eb2e58'
$repo = 'C:\temp-efa3366f1b3c42828c0919ec2542f647'
$vault = 'D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b'
$plugin = Join-Path $vault '.obsidian\plugins\brain-google-drive-sync'
$relay = Join-Path $plugin '.bvp-relay'
$runtime = Join-Path $env:LOCALAPPDATA 'PHX-CI\runtimes\69c4aa077d4a1a46d1e85e59f39d36285be99e83\scripts\Invoke-PhxCi.ps1'
$stage = Join-Path 'D:\bvp-s09a-install-staging' $SourceHead
$marker = Join-Path $stage '.phxci-success'
$backupRoot = 'D:\bvp-s09a-install-backups'
$code = 0
$reason = ''
$backup = $null

function Block([int]$number, [string]$message) {
  $script:code = $number
  $script:reason = $message
  Write-Host "DEPLOYMENT: BLOCKED ($number): $message"
}

if (-not (Test-Path -LiteralPath $repo -PathType Container) -or
    -not (Test-Path -LiteralPath $runtime -PathType Leaf) -or
    -not (Test-Path -LiteralPath $plugin -PathType Container) -or
    -not (Test-Path -LiteralPath $relay -PathType Container) -or
    -not (Test-Path -LiteralPath (Join-Path $plugin 'data.json') -PathType Leaf)) {
  Block 90 'Expected repository, pinned PHX-CI, installed plugin, relay or data.json is missing.'
}
if ($code -eq 0 -and (Get-Process -Name Obsidian -ErrorAction SilentlyContinue)) {
  Block 91 'Close all Obsidian processes before replacing plugin files. No process was stopped.'
}
if ($code -eq 0) {
  $origin = @(git.exe -C $repo remote get-url origin)
  $originExit = $LASTEXITCODE
  $head = @(git.exe -C $repo rev-parse HEAD)
  $headExit = $LASTEXITCODE
  $name = @(git.exe -C $repo branch --show-current)
  $nameExit = $LASTEXITCODE
  $dirty = @(git.exe -C $repo status --porcelain --untracked-files=all)
  $dirtyExit = $LASTEXITCODE
  if ($originExit -ne 0 -or $headExit -ne 0 -or $nameExit -ne 0 -or $dirtyExit -ne 0 -or
      $origin.Count -ne 1 -or $head.Count -ne 1 -or $name.Count -ne 1 -or
      $origin[0].Trim() -cnotin @('https://github.com/woodpk/gdrive-sync-obsidian-plugin', 'https://github.com/woodpk/gdrive-sync-obsidian-plugin.git') -or
      $name[0].Trim() -cne $branch -or $dirty.Count -ne 0) {
    Block 92 'Repository identity or clean checkout constraint failed.'
  }
}
if ($code -eq 0) {
  git.exe -C $repo fetch origin "+refs/heads/${branch}:refs/remotes/origin/${branch}"
  if ($LASTEXITCODE -ne 0) { Block 93 'Git fetch failed.' }
}
if ($code -eq 0) {
  $remote = @(git.exe -C $repo rev-parse "refs/remotes/origin/$branch")
  $remoteExit = $LASTEXITCODE
  git.exe -C $repo merge-base --is-ancestor HEAD "refs/remotes/origin/$branch"
  $ffCode = $LASTEXITCODE
  if ($remoteExit -ne 0 -or $remote.Count -ne 1 -or $ffCode -ne 0) {
    Block 94 'Remote source cannot be safely resolved or fast-forwarded.'
  } elseif ($remote[0].Trim() -cne $SourceHead) {
    if (-not (Test-Path -LiteralPath $marker -PathType Leaf)) {
      Block 94 'Remote branch moved before the first PHX-CI build.'
    } else {
      git.exe -C $repo merge-base --is-ancestor $SourceHead $remote[0].Trim()
      $ancestryExit = $LASTEXITCODE
      $delta = @(git.exe -C $repo diff --name-only $SourceHead $remote[0].Trim())
      $deltaExit = $LASTEXITCODE
      $unexpected = @($delta | Where-Object { $_ -cnotmatch '^dev/(?:_ca-output\\.(?:md|json)$|test-results/)' })
      if ($ancestryExit -ne 0 -or $deltaExit -ne 0 -or $unexpected.Count -ne 0) {
        Block 94 'Post-verification remote history is not evidence-only; staging retained.'
      }
    }
  }
}
if ($code -eq 0) {
  git.exe -C $repo merge --ff-only "refs/remotes/origin/$branch"
  if ($LASTEXITCODE -ne 0) { Block 95 'Fast-forward failed.' }
}
if ($code -eq 0) {
  $now = @(git.exe -C $repo rev-parse HEAD)
  $nowExit = $LASTEXITCODE
  git.exe -C $repo merge-base --is-ancestor $base $SourceHead
  $baseExit = $LASTEXITCODE
  if ($nowExit -ne 0 -or $now.Count -ne 1 -or $now[0].Trim() -cne $SourceHead -or $baseExit -ne 0) {
    Block 96 'Source SHA or ancestry mismatch.'
  }
}

if ($code -eq 0 -and -not (Test-Path -LiteralPath $marker -PathType Leaf)) {
  if (Test-Path -LiteralPath $stage) {
    Block 97 "Incomplete preexisting staging directory is preserved: $stage"
  } else {
    [void](New-Item -ItemType Directory -Path $stage -Force)
    $priorClass = [Environment]::GetEnvironmentVariable('BVP_CHANGE_CLASS', 'Process')
    $priorStage = [Environment]::GetEnvironmentVariable('BVP_S09A_STAGE', 'Process')
    # All source compilation, validation-artifact construction and staging occur inside PHX-CI.
    $focused = 'node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/test-platform/src/live-device/build-validation-artifact.js && node -e "require(''node:fs'').cpSync(''.test-build/bvp-live-device/plugin'',process.env.BVP_S09A_STAGE,{recursive:true})"'
    try {
      $env:BVP_CHANGE_CLASS = 'authorized-governance'
      $env:BVP_S09A_STAGE = $stage
      pwsh.exe -NoProfile -File $runtime -RepoRoot $repo -Branch $branch -BaseRef $base -PublicationMode push -FocusedTestCommand $focused
      $verifyExit = $LASTEXITCODE
    } finally {
      if ($null -eq $priorClass) { Remove-Item Env:\BVP_CHANGE_CLASS -ErrorAction SilentlyContinue } else { $env:BVP_CHANGE_CLASS = $priorClass }
      if ($null -eq $priorStage) { Remove-Item Env:\BVP_S09A_STAGE -ErrorAction SilentlyContinue } else { $env:BVP_S09A_STAGE = $priorStage }
    }
    if ($verifyExit -ne 0) {
      Block 98 "PHX-CI did not pass (exit $verifyExit). Staging preserved at $stage. No installation performed."
    } else {
      [System.IO.File]::WriteAllText($marker, "source=$SourceHead`nframework=69c4aa077d4a1a46d1e85e59f39d36285be99e83`n", [System.Text.UTF8Encoding]::new($false))
    }
  }
}

if ($code -eq 0) {
  try {
    $identityFile = Join-Path $stage 'build-identity.json'
    $stageMain = Join-Path $stage 'main.js'
    $stageManifest = Join-Path $stage 'manifest.json'
    $markerText = Get-Content -LiteralPath $marker -Raw
    $identity = Get-Content -LiteralPath $identityFile -Raw | ConvertFrom-Json
    $manifest = Get-Content -LiteralPath $stageManifest -Raw | ConvertFrom-Json
    $actualHash = (Get-FileHash -LiteralPath $stageMain -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($markerText -cnotmatch [regex]::Escape("source=$SourceHead") -or
        $identity.sourceCommit -cne $SourceHead -or
        $identity.artifactSha256 -cne $actualHash -or
        $manifest.id -cne 'brain-google-drive-sync') {
      Block 99 'Staged source, artifact digest, plugin identity or PHX-CI marker disagrees.'
    }
  } catch {
    Block 100 "Cannot establish staging integrity: $($_.Exception.Message)"
  }
}

if ($code -eq 0 -and (Get-Process -Name Obsidian -ErrorAction SilentlyContinue)) {
  Block 102 'Obsidian started during PHX-CI; staging is preserved and installation is deferred.'
}

if ($code -eq 0) {
  try {
    $targetMain = Join-Path $plugin 'main.js'
    $installedHash = (Get-FileHash -LiteralPath $targetMain -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($installedHash -ceq $actualHash) {
      Write-Host "DEPLOYMENT: ALREADY INSTALLED; no files changed; source=$SourceHead"
    } else {
      $backup = Join-Path $backupRoot ([guid]::NewGuid().ToString('N'))
      [void](New-Item -ItemType Directory -Path $backup)
      foreach ($name in @('main.js', 'manifest.json', 'build-identity.json', 'data.json')) {
        $current = Join-Path $plugin $name
        if (Test-Path -LiteralPath $current -PathType Leaf) {
          Copy-Item -LiteralPath $current -Destination (Join-Path $backup $name) -ErrorAction Stop
        }
      }
      $copyStarted = $true
      foreach ($name in @('main.js', 'manifest.json', 'build-identity.json')) {
        Copy-Item -LiteralPath (Join-Path $stage $name) -Destination (Join-Path $plugin $name) -Force -ErrorAction Stop
      }
      $newHash = (Get-FileHash -LiteralPath $targetMain -Algorithm SHA256).Hash.ToLowerInvariant()
      if ($newHash -cne $actualHash) { throw 'Post-copy main.js digest mismatched staged artifact.' }
      Write-Host "DEPLOYMENT: INSTALLED source=$SourceHead"
      Write-Host "Validation artifact SHA256: $newHash"
      Write-Host "Backup: $backup"
    }
  } catch {
    $failure = $_.Exception.Message
    $rollback = 'not-required'
    if ($copyStarted -and $backup) {
      try {
        foreach ($name in @('main.js', 'manifest.json', 'build-identity.json')) {
          $prior = Join-Path $backup $name
          $target = Join-Path $plugin $name
          if (Test-Path -LiteralPath $prior -PathType Leaf) {
            Copy-Item -LiteralPath $prior -Destination $target -Force -ErrorAction Stop
          } elseif ($name -eq 'build-identity.json' -and (Test-Path -LiteralPath $target -PathType Leaf)) {
            Remove-Item -LiteralPath $target -Force -ErrorAction Stop
          }
        }
        if ((Get-FileHash -LiteralPath (Join-Path $plugin 'main.js') -Algorithm SHA256).Hash.ToLowerInvariant() -cne $installedHash) {
          throw 'Restored main.js did not match its prior digest.'
        }
        $rollback = 'PASS'
      } catch { $rollback = "FAILED: $($_.Exception.Message)" }
    }
    Block 101 "Installation failed: $failure; rollback=$rollback; backup=$backup; staged artifact=$stage."
  }
}

if ($code -eq 0) {
  Write-Host 'No live synchronization performed. data.json and relay were not overwritten.'
  Write-Host 'Open the isolated Obsidian vault with the validation plugin enabled, but do not manually synchronize.'
  Write-Host "PHX-CI staged artifact: $stage"
}
Write-Host "FINAL DEPLOYMENT EXIT: $code"
exit $code