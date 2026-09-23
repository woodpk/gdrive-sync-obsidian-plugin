[CmdletBinding()]
param(
    [string]$RepositoryRoot = (Get-Location).Path,
    [string]$Branch = 'phase6-integration'
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("brain-bvp-s01-" + [guid]::NewGuid().ToString('N'))
$remoteRef = "origin/$Branch"

try {
    & git -C $repo fetch --prune origin $Branch
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "git fetch failed with exit code $code" }

    $originSha = (& git -C $repo rev-parse $remoteRef).Trim()
    $code = $LASTEXITCODE
    if ($code -ne 0 -or -not $originSha) { throw "cannot resolve $remoteRef" }

    & git -C $repo worktree add --detach $tempRoot $originSha
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "temporary worktree creation failed with exit code $code" }

    & (Join-Path $tempRoot 'dev/scripts/Invoke-BvpS01AuthorityArchiveVerification.ps1') -RepositoryRoot $tempRoot -ExpectedRemoteBranch $remoteRef

    & git -C $repo fetch origin $Branch
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "pre-push fetch failed with exit code $code" }

    $latestSha = (& git -C $repo rev-parse $remoteRef).Trim()
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "cannot re-resolve $remoteRef" }
    if ($latestSha -ne $originSha) { throw "phase6-integration advanced during verification: started $originSha, now $latestSha" }

    & git -C $tempRoot add -- dev/_ca-output.md
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "git add evidence failed with exit code $code" }

    & git -C $tempRoot diff --cached --quiet -- dev/_ca-output.md
    $diffCode = $LASTEXITCODE
    if ($diffCode -eq 0) { throw 'verifier produced no evidence change to commit' }
    if ($diffCode -ne 1) { throw "git diff --cached failed with exit code $diffCode" }

    & git -C $tempRoot commit -m 'verify(bvp): close S01 authority archive gate'
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "evidence commit failed with exit code $code" }

    & git -C $tempRoot push origin "HEAD:refs/heads/$Branch"
    $code = $LASTEXITCODE
    if ($code -ne 0) { throw "evidence push failed with exit code $code" }

    Write-Host 'BVP-S01 verified and evidence pushed to phase6-integration.'
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        & git -C $repo worktree remove --force $tempRoot | Out-Null
    }
}
