[CmdletBinding()]
param(
    [string]$PhxCiRepo = "D:\dev-tools\phx-ci",
    [string]$BrainRepo = "D:\obsidian-brain-dev"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$phxTargetBranch = "ci-2-r1-verification-integrity"
$phxExpectedTargetHead = "f3e66abd3d83f5c4f1680677f5b0574ee510ec9e"
$phxCandidateBranch = "refactor/split-verification-status"
$phxCandidateHead = "c8792047e8a994218dc7d61f4e6da4a24fe205df"

$brainTargetBranch = "ci-3-phx-ci-obsidian-pilot"
$brainExpectedTargetHead = "4ca8726ebfa47d5858538dd607dd8abd92c14d62"
$brainCandidateBranch = "ci-4-split-verification-status"
$brainCandidateHead = "00627e6e6f3d670bbf6555303b451a69d9faf4ad"

$vh22EvidenceBranch = "phase6-vh22-c09-scenario-correction-02"
$vh22EvidenceCommit = "5c33bb4e982fe2a211e48e3c082f2e01ce357368"

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    $output = @(& git.exe -C $Repo @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $text = ($output -join "`n").Trim()

    if (-not $AllowFailure -and $exitCode -ne 0) {
        throw "git -C `"$Repo`" $($Arguments -join ' ') failed with exit code $exitCode.`n$text"
    }

    [pscustomobject]@{
        ExitCode = $exitCode
        Output = $text
    }
}

function Assert-Repository {
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$ExpectedRemotePattern
    )

    if (-not (Test-Path -LiteralPath $Repo -PathType Container)) {
        throw "Repository directory not found: $Repo"
    }

    $inside = Invoke-Git -Repo $Repo -Arguments @("rev-parse", "--is-inside-work-tree")
    if ($inside.Output -ne "true") {
        throw "Not a Git working tree: $Repo"
    }

    $origin = (Invoke-Git -Repo $Repo -Arguments @("remote", "get-url", "origin")).Output
    if ($origin -notmatch $ExpectedRemotePattern) {
        throw "Unexpected origin for $Repo`: $origin"
    }
}

function Get-RemoteHead {
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$Branch
    )

    $result = Invoke-Git -Repo $Repo -Arguments @(
        "ls-remote",
        "--heads",
        "origin",
        "refs/heads/$Branch"
    )

    if ([string]::IsNullOrWhiteSpace($result.Output)) {
        throw "Remote branch not found: origin/$Branch"
    }

    return (($result.Output -split "\s+")[0]).Trim()
}

function Assert-RemoteHead {
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$Branch,
        [Parameter(Mandatory)][string]$Expected
    )

    $actual = Get-RemoteHead -Repo $Repo -Branch $Branch
    if ($actual -ne $Expected) {
        throw "Remote drift detected for origin/$Branch. Expected $Expected; actual $actual"
    }
}

function Assert-Ancestor {
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$Ancestor,
        [Parameter(Mandatory)][string]$Descendant,
        [Parameter(Mandatory)][string]$Description
    )

    $result = Invoke-Git -Repo $Repo -Arguments @(
        "merge-base",
        "--is-ancestor",
        $Ancestor,
        $Descendant
    ) -AllowFailure

    if ($result.ExitCode -ne 0) {
        throw "$Description is not a fast-forward: $Ancestor is not an ancestor of $Descendant"
    }
}

function Promote-ExactRef {
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$TargetBranch,
        [Parameter(Mandatory)][string]$ExpectedTargetHead,
        [Parameter(Mandatory)][string]$CandidateHead
    )

    $lease = "--force-with-lease=refs/heads/${TargetBranch}:$ExpectedTargetHead"
    $refspec = "${CandidateHead}:refs/heads/$TargetBranch"

    Invoke-Git -Repo $Repo -Arguments @(
        "push",
        $lease,
        "origin",
        $refspec
    ) | Out-Null

    $actual = Get-RemoteHead -Repo $Repo -Branch $TargetBranch
    if ($actual -ne $CandidateHead) {
        throw "Promotion verification failed for origin/$TargetBranch. Expected $CandidateHead; actual $actual"
    }
}

Write-Host ""
Write-Host "PHX-CI / BRAIN INFRASTRUCTURE PROMOTION" -ForegroundColor Cyan
Write-Host "No checkout switching or working-tree modification will be performed."
Write-Host ""

# ---------- Full preflight before any remote write ----------

Assert-Repository `
    -Repo $PhxCiRepo `
    -ExpectedRemotePattern '(?i)(?:github\.com[/:])woodpk/phx-ci(?:\.git)?$'

Assert-Repository `
    -Repo $BrainRepo `
    -ExpectedRemotePattern '(?i)(?:github\.com[/:])woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$'

Write-Host "Fetching current remote state..." -ForegroundColor Cyan
Invoke-Git -Repo $PhxCiRepo -Arguments @("fetch", "origin", "--prune") | Out-Null
Invoke-Git -Repo $BrainRepo -Arguments @("fetch", "origin", "--prune") | Out-Null

Write-Host "Verifying exact candidate and target heads..." -ForegroundColor Cyan
Assert-RemoteHead -Repo $PhxCiRepo -Branch $phxCandidateBranch -Expected $phxCandidateHead
Assert-RemoteHead -Repo $PhxCiRepo -Branch $phxTargetBranch -Expected $phxExpectedTargetHead
Assert-RemoteHead -Repo $BrainRepo -Branch $brainCandidateBranch -Expected $brainCandidateHead
Assert-RemoteHead -Repo $BrainRepo -Branch $brainTargetBranch -Expected $brainExpectedTargetHead
Assert-RemoteHead -Repo $BrainRepo -Branch $vh22EvidenceBranch -Expected $vh22EvidenceCommit

Write-Host "Verifying fast-forward ancestry..." -ForegroundColor Cyan
Assert-Ancestor `
    -Repo $PhxCiRepo `
    -Ancestor $phxExpectedTargetHead `
    -Descendant $phxCandidateHead `
    -Description "phx-ci promotion"

Assert-Ancestor `
    -Repo $BrainRepo `
    -Ancestor $brainExpectedTargetHead `
    -Descendant $brainCandidateHead `
    -Description "BRAIN CI bridge promotion"

Write-Host "Verifying approved phx-ci evidence..." -ForegroundColor Cyan
$phxEvidence = (Invoke-Git -Repo $PhxCiRepo -Arguments @(
    "show",
    "${phxCandidateHead}:dev/_ca-output.md"
)).Output

$phxEvidenceFirstLine = (($phxEvidence -split "`n")[0]).Trim()
if ($phxEvidenceFirstLine -ne "STATUS: COMPLETE") {
    throw "phx-ci candidate evidence is not COMPLETE. First line: '$phxEvidenceFirstLine'"
}

Write-Host "Verifying BRAIN bridge pins the approved framework SHA..." -ForegroundColor Cyan
$bridge = (Invoke-Git -Repo $BrainRepo -Arguments @(
    "show",
    "${brainCandidateHead}:dev/scripts/run-phx-ci.ps1"
)).Output

$escapedFrameworkHead = [regex]::Escape($phxCandidateHead)
if ($bridge -notmatch "FrameworkHead\s*=\s*`"$escapedFrameworkHead`"") {
    throw "BRAIN candidate bridge does not pin final approved phx-ci SHA $phxCandidateHead"
}

Write-Host "Verifying VH22 acceptance evidence..." -ForegroundColor Cyan
$vh22JsonText = (Invoke-Git -Repo $BrainRepo -Arguments @(
    "show",
    "${vh22EvidenceCommit}:dev/_ca-output.json"
)).Output

$vh22 = $vh22JsonText | ConvertFrom-Json
if ([string]$vh22.verification.changeSet.status -ne "PASS") {
    throw "VH22 acceptance change-set status is not PASS."
}
if ([string]$vh22.verification.repository.status -ne "FAIL") {
    throw "VH22 acceptance repository status is not FAIL."
}
if ([string]$vh22.verification.overall.status -ne "BLOCKED") {
    throw "VH22 acceptance overall status is not BLOCKED."
}
if ($null -ne $vh22.buildResult) {
    throw "VH22 acceptance buildResult is not truthful null."
}
if ($null -ne $vh22.repositoryGateResult) {
    throw "VH22 acceptance repositoryGateResult is not truthful null."
}

Write-Host ""
Write-Host "All promotion gates passed." -ForegroundColor Green
Write-Host ""

# ---------- Promotion 1: phx-ci framework ----------

Write-Host "Promoting phx-ci..." -ForegroundColor Cyan
Promote-ExactRef `
    -Repo $PhxCiRepo `
    -TargetBranch $phxTargetBranch `
    -ExpectedTargetHead $phxExpectedTargetHead `
    -CandidateHead $phxCandidateHead

Write-Host "phx-ci promoted:" -ForegroundColor Green
Write-Host "  origin/$phxTargetBranch"
Write-Host "  -> $phxCandidateHead"
Write-Host ""

# ---------- Promotion 2: BRAIN CI infrastructure ----------

try {
    Write-Host "Promoting BRAIN CI infrastructure..." -ForegroundColor Cyan
    Promote-ExactRef `
        -Repo $BrainRepo `
        -TargetBranch $brainTargetBranch `
        -ExpectedTargetHead $brainExpectedTargetHead `
        -CandidateHead $brainCandidateHead
}
catch {
    Write-Host ""
    Write-Host "PARTIAL PROMOTION STATE" -ForegroundColor Yellow
    Write-Host "phx-ci WAS promoted successfully to $phxCandidateHead."
    Write-Host "BRAIN CI infrastructure was NOT confirmed promoted."
    throw
}

Write-Host "BRAIN CI infrastructure promoted:" -ForegroundColor Green
Write-Host "  origin/$brainTargetBranch"
Write-Host "  -> $brainCandidateHead"
Write-Host ""

# ---------- Final remote verification ----------

Invoke-Git -Repo $PhxCiRepo -Arguments @("fetch", "origin", "--prune") | Out-Null
Invoke-Git -Repo $BrainRepo -Arguments @("fetch", "origin", "--prune") | Out-Null

Assert-RemoteHead -Repo $PhxCiRepo -Branch $phxTargetBranch -Expected $phxCandidateHead
Assert-RemoteHead -Repo $BrainRepo -Branch $brainTargetBranch -Expected $brainCandidateHead

Write-Host "PROMOTION COMPLETE" -ForegroundColor Green
Write-Host ""
Write-Host "Approved phx-ci line:"
Write-Host "  $phxTargetBranch @ $phxCandidateHead"
Write-Host ""
Write-Host "Approved BRAIN CI infrastructure line:"
Write-Host "  $brainTargetBranch @ $brainCandidateHead"
Write-Host ""
Write-Host "No local branch checkout was changed."
