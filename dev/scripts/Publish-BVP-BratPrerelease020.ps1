# Publish the owner-approved BRAT-only BVP validation prerelease.
# Nonvalidation engineering release packaging. Does not run PHX-CI, modify a vault,
# dispatch BVP physical tests, or change any existing GitHub releases.
# Source/artifact provenance is pinned to the already PHX-qualified BVP mobile agent.
[CmdletBinding()]
param(
  [string]$StagedZip = 'C:\temp\aae9b8222b41417ab1b14938050683c3\ios-validation-only-0.1.19.zip'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repository = 'woodpk/gdrive-sync-obsidian-plugin'
$tag = '0.1.20-bvp.1'
$sourceSha = '2bf51ca15aec9c752e3ac7769fcf3ac237df99df'
$expectedMainSha = '90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7'
$expectedOriginalManifestSha = 'd4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965'
$runRoot = Join-Path 'C:\temp' ([guid]::NewGuid().ToString('N'))
$assetRoot = Join-Path $runRoot 'release-assets'
$ghCommand = Get-Command gh.exe -ErrorAction SilentlyContinue
if ($null -eq $ghCommand) { throw 'GH_CLI_REQUIRED: Install GitHub CLI (gh), authenticate it, then run this unchanged command.' }
if (-not (Test-Path -LiteralPath $StagedZip -PathType Leaf)) { throw ('PINNED_VALIDATION_ZIP_NOT_FOUND=' + $StagedZip) }
New-Item -ItemType Directory -Path $assetRoot -Force -ErrorAction Stop | Out-Null
Expand-Archive -LiteralPath $StagedZip -DestinationPath $assetRoot -ErrorAction Stop
$main = Join-Path $assetRoot 'main.js'
$manifest = Join-Path $assetRoot 'manifest.json'
$identity = Join-Path $assetRoot 'build-identity.json'
foreach ($path in @($main, $manifest, $identity)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw ('MISSING_VALIDATION_ASSET=' + $path) }
}
$allFiles = @(Get-ChildItem -LiteralPath $assetRoot -File -Recurse)
if ($allFiles.Count -ne 3) { throw 'VALIDATION_ARCHIVE_CONTAINS_UNEXPECTED_FILES' }
$oldMainSha = (Get-FileHash -LiteralPath $main -Algorithm SHA256).Hash.ToLowerInvariant()
$oldManifestSha = (Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant()
if ($oldMainSha -cne $expectedMainSha -or $oldManifestSha -cne $expectedOriginalManifestSha) {
  throw 'ORIGINAL_STAGED_VALIDATION_ARTIFACT_HASH_MISMATCH'
}
$m = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json -Depth 20
$id = Get-Content -LiteralPath $identity -Raw | ConvertFrom-Json -Depth 20
if ($m.id -cne 'brain-google-drive-sync' -or $m.version -cne '0.1.19' -or
    $m.isDesktopOnly -ne $false -or $id.sourceCommit -cne $sourceSha -or
    $id.artifactSha256 -cne $expectedMainSha -or
    $id.manifestSha256 -cne $expectedOriginalManifestSha -or
    $id.artifactSize -ne (Get-Item -LiteralPath $main).Length) {
  throw 'PINNED_RELEASE_PROVENANCE_MISMATCH'
}
# BRAT expects the GitHub release tag and manifest.version to agree.
# Keep the executable's pinned source bytes identical; change ONLY prerelease
# version metadata in the separately staged release assets.
$m.version = $tag
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($manifest, (($m | ConvertTo-Json -Depth 20) + "`n"), $utf8)
$newManifestSha = (Get-FileHash -LiteralPath $manifest -Algorithm SHA256).Hash.ToLowerInvariant()
$id.manifestSha256 = $newManifestSha
[System.IO.File]::WriteAllText($identity, (($id | ConvertTo-Json -Depth 20) + "`n"), $utf8)
if ((Get-FileHash -LiteralPath $main -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedMainSha) {
  throw 'VALIDATION_EXECUTABLE_CHANGED_UNEXPECTEDLY'
}
$hashFile = Join-Path $assetRoot 'release-sha256.txt'
$hashText = @(
  ('main.js  ' + $expectedMainSha),
  ('manifest.json  ' + $newManifestSha),
  ('build-identity.json  ' + (Get-FileHash -LiteralPath $identity -Algorithm SHA256).Hash.ToLowerInvariant()),
  ('sourceCommit  ' + $sourceSha),
  ('tag  ' + $tag)
) -join "`n"
[System.IO.File]::WriteAllText($hashFile, ($hashText + "`n"), $utf8)
$notesFile = Join-Path $runRoot 'RELEASE-NOTES.md'
$notes = @"
# BRAIN $tag — BVP validation-only preview for BRAT

**TEST-ONLY. NOT A SHIPPING OR PRODUCTION PLUGIN RELEASE.**

Contains the bounded BVP automatic device-command/observation agent
inside the Obsidian plugin. The PHX-CI controller remains on Windows;
it is NOT installed as an iPhone executable.

* Production plugin entrypoint: inherited from exact source $sourceSha.
* Validation main.js SHA-256: $expectedMainSha (unchanged from original validated 0.1.19 BVP build).
* Validation manifest.json SHA-256: $newManifestSha (version metadata $tag).
* Source remains the source qualified for the validation-only 0.1.19 build.
* No authorization to run physical batteries, synchronize personal data, or install in a production vault.
* The Windows BVP participant and physical bridge must use matching validation-only
  asset hashes before any future authorized two-device S09A run.

BRAT install assets: main.js and manifest.json.
Optional BVP provenance asset: build-identity.json.
"@
[System.IO.File]::WriteAllText($notesFile, $notes, $utf8)
Write-Output ('READY_RELEASE_TAG=' + $tag)
Write-Output ('READY_VALIDATION_MAIN_SHA256=' + $expectedMainSha)
Write-Output ('READY_VALIDATION_MANIFEST_SHA256=' + $newManifestSha)
Write-Output ('RELEASE_ASSETS_DIR=' + $assetRoot)
# Fail closed if auth, repository, immutable source, or release identity differs.
& $ghCommand.Source auth status
if ($LASTEXITCODE -ne 0) { throw 'GITHUB_CLI_NOT_AUTHENTICATED' }
$resolvedSource = @(& $ghCommand.Source api ('repos/' + $repository + '/commits/' + $sourceSha) --jq '.sha')
if ($LASTEXITCODE -ne 0 -or $resolvedSource.Count -ne 1 -or $resolvedSource[0].Trim() -cne $sourceSha) {
  throw 'GITHUB_ORIGINAL_SOURCE_NOT_ACCESSIBLE'
}
& $ghCommand.Source release view $tag --repo $repository --json tagName 1>$null 2>$null
if ($LASTEXITCODE -eq 0) { throw 'RELEASE_ALREADY_EXISTS: inspect GitHub instead of overwriting or retrying.' }
Write-Output 'BRAT WARNING: Other installations tracking the latest release of this repository may also select this test-only prerelease.'
$approval = Read-Host 'PUBLISH the 0.1.20-bvp.1 TEST-ONLY GitHub prerelease and four exact assets? Type YES'
if ($approval -cne 'YES') { throw 'RELEASE_PUBLICATION_CANCELED' }
$assets = @(
  ($main + '#main.js'), ($manifest + '#manifest.json'),
  ($identity + '#build-identity.json'), ($hashFile + '#release-sha256.txt')
)
& $ghCommand.Source release create $tag @assets --repo $repository --target $sourceSha --title ('BRAIN ' + $tag + ' — BVP validation only') --notes-file $notesFile --prerelease --latest=false
$publishExit = $LASTEXITCODE
if ($publishExit -ne 0) {
  throw 'RELEASE_PUBLICATION_UNCERTAIN: inspect existing GitHub release, tag and uploaded assets; DO NOT retry automatically.'
}
$publishedRaw = @(& $ghCommand.Source release view $tag --repo $repository --json tagName,isPrerelease,assets)
if ($LASTEXITCODE -ne 0 -or $publishedRaw.Count -eq 0) { throw 'RELEASE_CREATED_BUT_POSTPUBLICATION_CHECK_UNAVAILABLE; inspect manually.' }
$published = ($publishedRaw -join [Environment]::NewLine) | ConvertFrom-Json -Depth 20
$names = @($published.assets | ForEach-Object { $_.name })
if ($published.tagName -cne $tag -or $published.isPrerelease -ne $true -or
    @($names | Where-Object { $_ -notin @('main.js','manifest.json','build-identity.json','release-sha256.txt') }).Count -gt 0 -or
    $names.Count -ne 4) {
  throw 'RELEASE_CREATED_BUT_CONTENTS_UNEXPECTED; reconcile without repeating publication.'
}
Write-Output 'BVP_BRAT_PRERELEASE_PUBLICATION=PASS'
Write-Output ('RELEASE_URL=https://github.com/' + $repository + '/releases/tag/' + $tag)
Write-Output ('RELEASE_TAG=' + $tag)
Write-Output 'NO_DEVICE_INSTALL_NO_PHYSICAL_BATTERY_NO_GITHUB_ACTIONS'
