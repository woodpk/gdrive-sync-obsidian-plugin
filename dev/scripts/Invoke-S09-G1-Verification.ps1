[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $ExpectedSha
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$exitCode = 90
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runRoot = Split-Path -Parent $repoRoot
$branch = "fix/s09-g104-g105-pairing-namespace-atomic-persistence-20261015"
$base = "b1e2ebaee3077e34a4eefaf601ee8124078b7400"
$runtimeSha = "69c4aa077d4a1a46d1e85e59f39d36285be99e83"
$runtime = Join-Path $env:LOCALAPPDATA "PHX-CI\runtimes\$runtimeSha\scripts\Invoke-PhxCi.ps1"
$transcript = Join-Path $runRoot "s09-g1-verification-terminal.log"
$oldPurpose = $env:BRAIN_ARTIFACT_PURPOSE
$oldClass = $env:BVP_CHANGE_CLASS
$transcriptActive = $false

try {
    Start-Transcript -Path $transcript -Force | Out-Null
    $transcriptActive = $true
    Write-Host "SOURCE ROOT: $repoRoot"
    Write-Host "OPERATOR TRANSCRIPT: $transcript"
    if (-not (Test-Path -LiteralPath $runtime -PathType Leaf)) {
        throw "Pinned PHX-CI runtime is absent: $runtime"
    }
    $source = (& git -C $repoRoot rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or $source -cne $ExpectedSha) {
        throw "Source mismatch (expected $ExpectedSha; actual $source)"
    }
    $dirty = & git -C $repoRoot status --porcelain
    if ($LASTEXITCODE -ne 0 -or $dirty) {
        throw "Source checkout is not clean"
    }
    $pin = (Get-Content -LiteralPath (Join-Path $repoRoot "phx-ci.json") -Raw | ConvertFrom-Json).framework.sha
    if ($pin -cne $runtimeSha) {
        throw "Runtime pin mismatch: $pin"
    }

    $env:BRAIN_ARTIFACT_PURPOSE = "development"
    $env:BVP_CHANGE_CLASS = "authorized-governance"
    & pwsh.exe -NoProfile -File $runtime -RepoRoot $repoRoot -Branch $branch -BaseRef $base -FocusedTestCommand "npm run test:bvp-root" -PublicationMode push -TempRoot $runRoot
    $exitCode = [int] $LASTEXITCODE
    Write-Host "PHX-CI COMMAND EXIT: $exitCode"
    if ($exitCode -eq 0) {
        & git -C $repoRoot fetch origin $branch
        if ($LASTEXITCODE -ne 0) {
            $exitCode = 91
            Write-Host "FINAL: BLOCKED - evidence fetch failed (91)"
        } else {
            $published = (& git -C $repoRoot rev-parse "origin/$branch").Trim()
            & git -C $repoRoot merge-base --is-ancestor $source $published
            if ($LASTEXITCODE -ne 0) {
                $exitCode = 91
                Write-Host "FINAL: BLOCKED - published head does not descend from verified source (91)"
            } else {
                $evidenceRef = "origin/" + $branch + ":dev/_ca-output.md"
                $evidence = & git -C $repoRoot show $evidenceRef
                if ($LASTEXITCODE -ne 0 -or ($evidence -join [Environment]::NewLine) -notmatch "(?m)^-\s*Overall verification: PASS\s*$") {
                    $exitCode = 91
                    Write-Host "FINAL: BLOCKED - published PHX-CI evidence does not confirm PASS (91)"
                } else {
                    Write-Host "VERIFIED SOURCE: $source"
                    Write-Host "PUBLISHED HEAD: $published"
                    Write-Host "FINAL: PASS (0)"
                }
            }
        }
    } else {
        Write-Host "FINAL: BLOCKED - PHX-CI returned $exitCode; inspect published dev/_ca-output.md"
    }
}
catch {
    $exitCode = 90
    Write-Host "FINAL: OPERATOR/PREFLIGHT BLOCKED (90): $($_.Exception.Message)"
}
finally {
    $env:BRAIN_ARTIFACT_PURPOSE = $oldPurpose
    $env:BVP_CHANGE_CLASS = $oldClass
    if ($transcriptActive) {
        try { Stop-Transcript | Out-Null } catch { Write-Host "Transcript close failed: $($_.Exception.Message)" }
    }
}
exit $exitCode
