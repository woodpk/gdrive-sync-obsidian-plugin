[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9a-f]{40}$')]
    [string]$CandidateSha,

    [string]$RepoRoot = 'D:\\obsidian-brain-dev'
)

$ErrorActionPreference = 'Stop'

$branch = 'bvp-s08f-desktop-live-canary'
$base = '4f9c69c38c12c09d2f06f3f966dc8519ed45a99f'
$runtimeSha = '69c4aa077d4a1a46d1e85e59f39d36285be99e83'
$runtime = Join-Path $env:LOCALAPPDATA "PHX-CI\\runtimes\\$runtimeSha\\scripts\\Invoke-PhxCi.ps1"
$tempRoot = 'C:\\temp-' + [guid]::NewGuid().ToString('N')

git -C $RepoRoot fetch origin $branch --prune
if ($LASTEXITCODE -ne 0) {
    Write-Host 'BLOCKED: unable to fetch the authoritative S08F branch; PHX-CI was not invoked.'
    return
}

$remoteHead = (git -C $RepoRoot rev-parse "origin/$branch").Trim()
if ($LASTEXITCODE -ne 0) {
    Write-Host 'BLOCKED: unable to resolve the authoritative S08F branch; PHX-CI was not invoked.'
    return
}
if ($remoteHead -cne $CandidateSha) {
    Write-Host "BLOCKED: S08F branch drift detected; expected $CandidateSha but origin/$branch is $remoteHead; PHX-CI was not invoked."
    return
}
if (-not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
    Write-Host "BLOCKED: required PHX-CI runtime is unavailable at $runtime; PHX-CI was not invoked."
    return
}

$focused = "`$env:BVP_S08F_PHYSICAL_EXECUTION='1'; `$env:BVP_S08F_BRANCH_HEAD='$CandidateSha'; npm run build; if (`$LASTEXITCODE -eq 0) { node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json }; if (`$LASTEXITCODE -eq 0) { node --experimental-default-type=commonjs --test .test-build/bvp/test-platform/test/s08f-post-repair-product-authority-recovery.test.js }"

$oldChangeClass = $env:BVP_CHANGE_CLASS
try {
    $env:BVP_CHANGE_CLASS = 'authorized-governance'
    Write-Host "PHX-CI candidate: $CandidateSha"
    Write-Host "PHX-CI runtime: $runtimeSha"
    Write-Host "PHX-CI base: $base"
    Write-Host "PHX-CI temp root: $tempRoot"

    & $runtime `
        -RepoRoot $RepoRoot `
        -Branch $branch `
        -PublicationMode push `
        -BaseRef $base `
        -FocusedTestCommand $focused `
        -TempRoot $tempRoot

    $phxExit = $LASTEXITCODE
    Write-Host "PHX-CI process exit code: $phxExit"
}
finally {
    if ($null -eq $oldChangeClass) {
        Remove-Item Env:BVP_CHANGE_CLASS -ErrorAction SilentlyContinue
    }
    else {
        $env:BVP_CHANGE_CLASS = $oldChangeClass
    }
}
