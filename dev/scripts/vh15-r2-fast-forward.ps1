param(
    [string]$Remote = "origin",
    [string]$CanonicalBranch = "phase6-vh15-validation-mode-runtime-canary",
    [string]$R2Branch = "phase6-vh15-r2-run-scoped-plan-handoff",
    [string]$ToolingBranch = "phase6-vh15-r2-promotion-tooling",
    [string]$ExpectedOldSha = "6372184d2649e21369001ea28cc583e6636781c5",
    [string]$TargetSha = "fbe9dfca58840e49ebcb3a14b97d4c569770cf6e",
    [string]$OutputPath = "dev/_ca-ouput.md"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$script:RunStatus = "BLOCKED"
$script:FailureReason = ""
$script:CanonicalBefore = ""
$script:CanonicalAfter = ""
$script:R2RemoteHead = ""
$script:R2EvidenceStatus = ""
$script:PromotionAction = "not-attempted"
$script:StartedUtc = [DateTime]::UtcNow.ToString("o")
$script:FinishedUtc = ""
$script:RepoRoot = ""

function Invoke-Git {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    $stderrPath = Join-Path ([System.IO.Path]::GetTempPath()) ("vh15-r2-git-stderr-" + [Guid]::NewGuid().ToString("N") + ".txt")
    $priorErrorActionPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5.1 promotes native stderr to ErrorRecord objects.
        # Git writes normal progress to stderr even when it exits 0. Temporarily
        # disable terminating-error promotion for the native invocation and use
        # Git's process exit code as the sole command-success authority.
        $ErrorActionPreference = "Continue"
        $output = @(& git @Arguments 2> $stderrPath)
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = $priorErrorActionPreference

        $stderrText = if (Test-Path -LiteralPath $stderrPath) {
            [System.IO.File]::ReadAllText($stderrPath).Trim()
        }
        else {
            ""
        }

        if ($exitCode -ne 0) {
            $stdoutText = ($output | Out-String).Trim()
            $detail = @($stdoutText, $stderrText) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
            throw "git $($Arguments -join ' ') failed with exit code $exitCode. $($detail -join ' ')"
        }

        if (-not [string]::IsNullOrWhiteSpace($stderrText)) {
            Write-Host $stderrText
        }

        return $output
    }
    finally {
        $ErrorActionPreference = $priorErrorActionPreference
        Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-RemoteHead {
    param(
        [Parameter(Mandatory = $true)][string]$RemoteName,
        [Parameter(Mandatory = $true)][string]$BranchName
    )

    $lines = @(Invoke-Git -Arguments @("ls-remote", "--heads", $RemoteName, "refs/heads/$BranchName"))
    if ($lines.Count -ne 1) {
        throw "Expected exactly one remote head for $RemoteName/$BranchName; found $($lines.Count)."
    }

    $parts = [string]$lines[0] -split "\s+"
    if ($parts.Count -lt 2 -or $parts[0] -notmatch "^[0-9a-f]{40}$") {
        throw "Could not parse remote head for $RemoteName/$BranchName."
    }
    return $parts[0]
}

function Assert-ExpectedRepository {
    param([Parameter(Mandatory = $true)][string]$RemoteName)

    $remoteUrl = ((Invoke-Git -Arguments @("remote", "get-url", $RemoteName)) | Select-Object -Last 1).Trim()
    $normalized = $remoteUrl -replace "\\", "/"
    if (
        $normalized -notmatch "github\.com[:/]woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$"
    ) {
        throw "Remote '$RemoteName' does not resolve to woodpk/gdrive-sync-obsidian-plugin."
    }
}

function Test-Ancestor {
    param(
        [Parameter(Mandatory = $true)][string]$Ancestor,
        [Parameter(Mandatory = $true)][string]$Descendant
    )

    & git merge-base --is-ancestor $Ancestor $Descendant 2>$null
    return ($LASTEXITCODE -eq 0)
}

function Publish-Report {
    $script:FinishedUtc = [DateTime]::UtcNow.ToString("o")

    $safeFailure = $script:FailureReason.Replace("`r", " ").Replace("`n", " ").Trim()
    if ([string]::IsNullOrWhiteSpace($safeFailure)) {
        $safeFailure = "none"
    }

    $reportLines = @(
        "STATUS: $script:RunStatus",
        "",
        "# VH15-R2 Canonical Fast-Forward Promotion",
        "",
        "- Repository: woodpk/gdrive-sync-obsidian-plugin",
        "- Canonical branch: $CanonicalBranch",
        "- Expected pre-promotion SHA: $ExpectedOldSha",
        "- Approved R2 target SHA: $TargetSha",
        "- Approved R2 branch: $R2Branch",
        "- Tooling/evidence branch: $ToolingBranch",
        "- Promotion action: $script:PromotionAction",
        "- Canonical before: $script:CanonicalBefore",
        "- R2 remote head: $script:R2RemoteHead",
        "- R2 evidence first line: $script:R2EvidenceStatus",
        "- Canonical after: $script:CanonicalAfter",
        "- Started UTC: $script:StartedUtc",
        "- Finished UTC: $script:FinishedUtc",
        "- Failure reason: $safeFailure",
        "",
        "## Promotion invariant",
        "",
        "The canonical branch is permitted to move only from the exact expected pre-promotion SHA",
        "to the exact supervisor-approved R2 target SHA, and only by a non-forced fast-forward.",
        "",
        "## Report publication",
        "",
        "This report is committed and pushed by the promotion script to:",
        "",
        "$ToolingBranch`:$OutputPath",
        "",
        "The report commit SHA is intentionally resolved independently from the remote branch head",
        "by the supervisor after script termination."
    )

    $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("vh15-r2-promotion-report-" + [Guid]::NewGuid().ToString("N"))
    $worktreeAdded = $false
    try {
        [void](Invoke-Git -Arguments @("fetch", $Remote, $ToolingBranch))
        [void](Invoke-Git -Arguments @("worktree", "add", "--detach", $tempRoot, "$Remote/$ToolingBranch"))
        $worktreeAdded = $true

        $reportFile = Join-Path $tempRoot ($OutputPath -replace "/", [System.IO.Path]::DirectorySeparatorChar)
        $reportDirectory = Split-Path -Parent $reportFile
        if (-not (Test-Path -LiteralPath $reportDirectory)) {
            New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
        }

        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText(
            $reportFile,
            ($reportLines -join [Environment]::NewLine) + [Environment]::NewLine,
            $utf8NoBom
        )

        Push-Location $tempRoot
        try {
            [void](Invoke-Git -Arguments @("add", "--", $OutputPath))

            & git diff --cached --quiet -- $OutputPath
            if ($LASTEXITCODE -eq 0) {
                throw "Report publication produced no staged change at $OutputPath."
            }

            $gitName = (& git config user.name 2>$null)
            $gitEmail = (& git config user.email 2>$null)
            if ([string]::IsNullOrWhiteSpace([string]$gitName) -or [string]::IsNullOrWhiteSpace([string]$gitEmail)) {
                throw "git user.name and user.email must be configured so the report commit can be created."
            }

            [void](Invoke-Git -Arguments @("commit", "-m", "docs: record VH15-R2 canonical fast-forward"))
            $reportCommit = ((Invoke-Git -Arguments @("rev-parse", "HEAD")) | Select-Object -Last 1).Trim()

            [void](Invoke-Git -Arguments @("push", $Remote, "HEAD:refs/heads/$ToolingBranch"))

            $publishedHead = Get-RemoteHead -RemoteName $Remote -BranchName $ToolingBranch
            if ($publishedHead -ne $reportCommit) {
                throw "Tooling report push verification failed: remote head $publishedHead != report commit $reportCommit."
            }

            Write-Host "Report pushed: $ToolingBranch -> $publishedHead"
            Write-Host "Report path: $OutputPath"
        }
        finally {
            Pop-Location
        }
    }
    finally {
        if ($worktreeAdded) {
            & git worktree remove --force $tempRoot 2>$null | Out-Null
        }
        elseif (Test-Path -LiteralPath $tempRoot) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

$mainError = $null

try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "git is not available on PATH."
    }

    $script:RepoRoot = ((Invoke-Git -Arguments @("rev-parse", "--show-toplevel")) | Select-Object -Last 1).Trim()
    Set-Location $script:RepoRoot

    Assert-ExpectedRepository -RemoteName $Remote

    [void](Invoke-Git -Arguments @("fetch", $Remote, "--prune"))

    $script:CanonicalBefore = Get-RemoteHead -RemoteName $Remote -BranchName $CanonicalBranch
    $script:R2RemoteHead = Get-RemoteHead -RemoteName $Remote -BranchName $R2Branch

    if ($script:R2RemoteHead -ne $TargetSha) {
        throw "Approved R2 branch drifted: expected $TargetSha but remote head is $script:R2RemoteHead."
    }

    [void](Invoke-Git -Arguments @("cat-file", "-e", "$TargetSha^{commit}"))

    $evidencePath = "dev/evidence/_ca-output-agt-ca-p6-vh15-r2-run-scoped-plan-handoff-01.md"
    $evidenceSpec = $TargetSha + ":" + $evidencePath
    $evidenceLines = @(Invoke-Git -Arguments @("show", $evidenceSpec))
    if ($evidenceLines.Count -lt 1) {
        throw "Approved R2 evidence file is empty or unavailable at target SHA."
    }
    $script:R2EvidenceStatus = ([string]$evidenceLines[0]).Trim()
    if ($script:R2EvidenceStatus -ne "STATUS: COMPLETE") {
        throw "Approved R2 evidence does not begin with STATUS: COMPLETE."
    }

    if ($script:CanonicalBefore -eq $TargetSha) {
        $script:PromotionAction = "already-at-target"
    }
    elseif ($script:CanonicalBefore -eq $ExpectedOldSha) {
        if (-not (Test-Ancestor -Ancestor $ExpectedOldSha -Descendant $TargetSha)) {
            throw "Target SHA is not a descendant of the expected canonical head; refusing non-fast-forward promotion."
        }

        $script:PromotionAction = "fast-forward-push"
        [void](Invoke-Git -Arguments @("push", $Remote, "$TargetSha`:refs/heads/$CanonicalBranch"))
    }
    else {
        throw "Canonical branch drifted: expected $ExpectedOldSha (or already-promoted $TargetSha) but found $script:CanonicalBefore."
    }

    $script:CanonicalAfter = Get-RemoteHead -RemoteName $Remote -BranchName $CanonicalBranch
    if ($script:CanonicalAfter -ne $TargetSha) {
        throw "Canonical promotion verification failed: expected $TargetSha but remote head is $script:CanonicalAfter."
    }

    $script:RunStatus = "COMPLETE"
}
catch {
    $script:RunStatus = "BLOCKED"
    $script:FailureReason = $_.Exception.Message
    $mainError = $_
}
finally {
    try {
        Publish-Report
    }
    catch {
        Write-Error "Promotion report publication failed: $($_.Exception.Message)"
        exit 2
    }
}

if ($null -ne $mainError) {
    Write-Error "VH15-R2 canonical promotion blocked: $script:FailureReason"
    exit 1
}

Write-Host ""
Write-Host "STATUS: COMPLETE" -ForegroundColor Green
Write-Host "Canonical branch: $CanonicalBranch"
Write-Host "Canonical head:   $script:CanonicalAfter"
Write-Host "Expected target:  $TargetSha"
Write-Host "Evidence report:  $ToolingBranch`:$OutputPath"
exit 0
