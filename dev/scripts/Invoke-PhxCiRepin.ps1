[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$ConsumerRepositoryRoot,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$TargetBranch,

    [Parameter(Mandatory)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$PhxCiSha,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$PhxCiSourceRoot,

    [ValidatePattern('^$|^[0-9a-fA-F]{40}$')]
    [string]$ExpectedTargetHead = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$script:GitPath = $null
$script:AllowedPaths = @('phx-ci.json', 'Taskfile.phx-ci.yml', 'Taskfile.yml')

function Get-CanonicalPath {
    param([Parameter(Mandatory)][string]$Path)

    $full = [IO.Path]::GetFullPath($Path)
    $root = [IO.Path]::GetPathRoot($full)
    while ($full.Length -gt $root.Length -and
        ($full.EndsWith([string][IO.Path]::DirectorySeparatorChar) -or
         $full.EndsWith([string][IO.Path]::AltDirectorySeparatorChar))) {
        $full = $full.Substring(0, $full.Length - 1)
    }
    return $full
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string]$WorkingTree,
        [Parameter(Mandatory)][Alias('Args')][string[]]$GitArguments,
        [switch]$AllowFailure,
        [switch]$PreserveLines
    )

    $output = @(& $script:GitPath -C $WorkingTree @GitArguments 2>&1)
    $code = $LASTEXITCODE
    $lines = @($output | ForEach-Object { [string]$_ })
    $text = ($lines -join [Environment]::NewLine).TrimEnd()

    if (-not $AllowFailure -and $code -ne 0) {
        throw ("git -C '{0}' {1} failed with exit code {2}: {3}" -f $WorkingTree, ($GitArguments -join ' '), $code, $text)
    }

    return [pscustomobject]@{
        ExitCode = $code
        Lines = if ($PreserveLines) { $lines } else { @() }
        Text = $text
    }
}

function Get-ControlSnapshot {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    return [pscustomobject]@{
        Branch = (Invoke-Git -WorkingTree $RepositoryRoot -Args @('branch', '--show-current')).Text
        Head = (Invoke-Git -WorkingTree $RepositoryRoot -Args @('rev-parse', 'HEAD')).Text
        Status = (Invoke-Git -WorkingTree $RepositoryRoot -Args @('status', '--porcelain=v1', '--untracked-files=all')).Text
    }
}

function Assert-RepositoryRoot {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $RepositoryRoot -PathType Container)) {
        throw "$Name does not exist: $RepositoryRoot"
    }

    $top = (Invoke-Git -WorkingTree $RepositoryRoot -Args @('rev-parse', '--show-toplevel')).Text
    if (-not (Get-CanonicalPath $top).Equals((Get-CanonicalPath $RepositoryRoot), [StringComparison]::OrdinalIgnoreCase)) {
        throw "$Name must be the Git top-level directory. Requested '$RepositoryRoot'; Git reported '$top'."
    }
}

function Get-ChangedPaths {
    param([Parameter(Mandatory)][string]$WorkingTree)

    $paths = [Collections.Generic.List[string]]::new()
    foreach ($arguments in @(
        @('diff', '--name-only'),
        @('diff', '--cached', '--name-only'),
        @('ls-files', '--others', '--exclude-standard')
    )) {
        $result = Invoke-Git -WorkingTree $WorkingTree -Args $arguments -PreserveLines
        foreach ($line in @($result.Lines)) {
            $path = ([string]$line).TrimEnd([char]13)
            if (-not [string]::IsNullOrWhiteSpace($path) -and -not $paths.Contains($path)) {
                $paths.Add($path)
            }
        }
    }
    return @($paths)
}

function Write-RepinSkipped {
    param([Parameter(Mandatory)][string]$Reason)

    Write-Host 'REPIN SKIPPED'
    Write-Host ("Reason: {0}" -f $Reason)
    Write-Host 'No changes were made.'
}

function Get-FrameworkShaAtCommit {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Commit
    )

    $show = Invoke-Git -WorkingTree $RepositoryRoot -Args @('show', "$Commit`:phx-ci.json") -AllowFailure
    if ($show.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($show.Text)) {
        throw "target branch does not contain a readable phx-ci.json at $Commit."
    }

    try {
        $config = $show.Text | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        throw "target branch phx-ci.json is invalid JSON at $Commit: $($_.Exception.Message)"
    }

    if ($null -eq $config.framework -or [string]::IsNullOrWhiteSpace([string]$config.framework.sha)) {
        throw "target branch phx-ci.json does not contain framework.sha at $Commit."
    }
    return ([string]$config.framework.sha).ToLowerInvariant()
}

function Invoke-RepinMain {
    $gitCommand = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($null -eq $gitCommand) {
        $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    }
    if ($null -eq $gitCommand) {
        throw 'Git is required but was not found on PATH.'
    }
    $script:GitPath = [string]$gitCommand.Source

    $consumerRoot = Get-CanonicalPath $ConsumerRepositoryRoot
    $phxRoot = Get-CanonicalPath $PhxCiSourceRoot
    Assert-RepositoryRoot -RepositoryRoot $consumerRoot -Name 'ConsumerRepositoryRoot'
    Assert-RepositoryRoot -RepositoryRoot $phxRoot -Name 'PhxCiSourceRoot'

    $branchCheck = Invoke-Git -WorkingTree $consumerRoot -Args @('check-ref-format', '--branch', $TargetBranch) -AllowFailure
    if ($branchCheck.ExitCode -ne 0) {
        throw "TargetBranch is not a valid Git branch name: $TargetBranch"
    }

    $before = Get-ControlSnapshot -RepositoryRoot $consumerRoot
    $tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("phx-ci-repin-{0}" -f [guid]::NewGuid().ToString('N'))
    $consumerWorktree = Join-Path $tempRoot 'consumer'
    $phxWorktree = Join-Path $tempRoot 'phx-ci'
    $consumerWorktreeAdded = $false
    $phxWorktreeAdded = $false
    $cleanupProblems = [Collections.Generic.List[string]]::new()

    try {
        $fetchTarget = Invoke-Git -WorkingTree $consumerRoot -Args @('fetch', '--prune', 'origin', $TargetBranch) -AllowFailure
        if ($fetchTarget.ExitCode -ne 0) {
            throw "Git fetch failed for origin/$TargetBranch (exit $($fetchTarget.ExitCode)): $($fetchTarget.Text)"
        }

        $remoteRef = "refs/remotes/origin/$TargetBranch"
        $remoteResult = Invoke-Git -WorkingTree $consumerRoot -Args @('rev-parse', '--verify', "$remoteRef^{commit}") -AllowFailure
        if ($remoteResult.ExitCode -ne 0 -or $remoteResult.Text -notmatch '^[0-9a-fA-F]{40}$') {
            throw "target branch cannot be resolved: origin/$TargetBranch"
        }
        $remoteHead = $remoteResult.Text.ToLowerInvariant()

        if (-not [string]::IsNullOrWhiteSpace($ExpectedTargetHead) -and
            $remoteHead -cne $ExpectedTargetHead.ToLowerInvariant()) {
            Write-RepinSkipped -Reason ("expected target HEAD {0}, but origin/{1} is {2}" -f $ExpectedTargetHead.ToLowerInvariant(), $TargetBranch, $remoteHead)
            return 0
        }

        $currentPin = Get-FrameworkShaAtCommit -RepositoryRoot $consumerRoot -Commit $remoteHead
        if ($currentPin -ceq $PhxCiSha.ToLowerInvariant()) {
            Write-RepinSkipped -Reason ("origin/{0} is already pinned to PHX-CI {1}" -f $TargetBranch, $PhxCiSha.ToLowerInvariant())
            return 0
        }

        $phxFetch = Invoke-Git -WorkingTree $phxRoot -Args @('fetch', '--prune', 'origin') -AllowFailure
        if ($phxFetch.ExitCode -ne 0) {
            throw "Git fetch failed for PHX-CI source repository (exit $($phxFetch.ExitCode)): $($phxFetch.Text)"
        }

        $phxCommit = Invoke-Git -WorkingTree $phxRoot -Args @('cat-file', '-e', "$PhxCiSha^{commit}") -AllowFailure
        if ($phxCommit.ExitCode -ne 0) {
            $phxSpecificFetch = Invoke-Git -WorkingTree $phxRoot -Args @('fetch', 'origin', $PhxCiSha) -AllowFailure
            if ($phxSpecificFetch.ExitCode -ne 0) {
                throw "PHX-CI source SHA cannot be materialized: $PhxCiSha"
            }
            $phxCommit = Invoke-Git -WorkingTree $phxRoot -Args @('cat-file', '-e', "$PhxCiSha^{commit}") -AllowFailure
            if ($phxCommit.ExitCode -ne 0) {
                throw "PHX-CI source SHA cannot be materialized: $PhxCiSha"
            }
        }

        New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

        $addConsumer = Invoke-Git -WorkingTree $consumerRoot -Args @('worktree', 'add', '--detach', $consumerWorktree, $remoteHead) -AllowFailure
        if ($addConsumer.ExitCode -ne 0) {
            throw "consumer repin worktree creation failed (exit $($addConsumer.ExitCode)): $($addConsumer.Text)"
        }
        $consumerWorktreeAdded = $true

        $addPhx = Invoke-Git -WorkingTree $phxRoot -Args @('worktree', 'add', '--detach', $phxWorktree, $PhxCiSha.ToLowerInvariant()) -AllowFailure
        if ($addPhx.ExitCode -ne 0) {
            throw "PHX-CI source SHA cannot be materialized in a detached worktree (exit $($addPhx.ExitCode)): $($addPhx.Text)"
        }
        $phxWorktreeAdded = $true

        $bootstrapPath = Join-Path $phxWorktree 'scripts/Bootstrap-PhxCiRepository.ps1'
        if (-not (Test-Path -LiteralPath $bootstrapPath -PathType Leaf)) {
            throw 'PHX-CI bootstrap script is missing at requested SHA: scripts/Bootstrap-PhxCiRepository.ps1'
        }

        try {
            & $bootstrapPath -RepoRoot $consumerWorktree | Out-Host
        }
        catch {
            throw "PHX-CI bootstrap failed: $($_.Exception.Message)"
        }

        $changedPaths = @(Get-ChangedPaths -WorkingTree $consumerWorktree)
        $unexpected = @($changedPaths | Where-Object { $_ -notin $script:AllowedPaths })
        if ($unexpected.Count -gt 0) {
            throw ("bootstrap changed unexpected consumer path(s): {0}" -f ($unexpected -join ', '))
        }

        $configPath = Join-Path $consumerWorktree 'phx-ci.json'
        if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
            throw 'bootstrap did not leave phx-ci.json present.'
        }
        try {
            $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json -ErrorAction Stop
        }
        catch {
            throw "resulting phx-ci.json is invalid JSON: $($_.Exception.Message)"
        }
        $resultingSha = [string]$config.framework.sha
        if ($resultingSha.ToLowerInvariant() -cne $PhxCiSha.ToLowerInvariant()) {
            throw "resulting phx-ci.json framework.sha '$resultingSha' does not equal requested SHA '$PhxCiSha'."
        }

        if ($changedPaths.Count -eq 0) {
            Write-RepinSkipped -Reason ("bootstrap produced no managed-file change; requested PHX-CI state {0} is already satisfied" -f $PhxCiSha.ToLowerInvariant())
            return 0
        }

        & $script:GitPath -C $consumerWorktree add -- @($script:AllowedPaths)
        $addExit = $LASTEXITCODE
        if ($addExit -ne 0) {
            throw "git add of managed repin paths failed with exit code $addExit."
        }

        $staged = @((Invoke-Git -WorkingTree $consumerWorktree -Args @('diff', '--cached', '--name-only') -PreserveLines).Lines |
            ForEach-Object { ([string]$_).TrimEnd([char]13) } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
        $unexpectedStaged = @($staged | Where-Object { $_ -notin $script:AllowedPaths })
        if ($unexpectedStaged.Count -gt 0) {
            throw ("unexpected staged consumer path(s): {0}" -f ($unexpectedStaged -join ', '))
        }

        if ($staged.Count -eq 0) {
            Write-RepinSkipped -Reason ("bootstrap produced no staged managed-file change; requested PHX-CI state {0} is already satisfied" -f $PhxCiSha.ToLowerInvariant())
            return 0
        }

        $diffCheck = Invoke-Git -WorkingTree $consumerWorktree -Args @('diff', '--cached', '--check') -AllowFailure
        if ($diffCheck.ExitCode -ne 0) {
            throw "staged diff check failed (exit $($diffCheck.ExitCode)): $($diffCheck.Text)"
        }

        $raceFetch = Invoke-Git -WorkingTree $consumerRoot -Args @('fetch', 'origin', $TargetBranch) -AllowFailure
        if ($raceFetch.ExitCode -ne 0) {
            throw "pre-push target fetch failed (exit $($raceFetch.ExitCode)): $($raceFetch.Text)"
        }
        $latestHead = (Invoke-Git -WorkingTree $consumerRoot -Args @('rev-parse', '--verify', "$remoteRef^{commit}")).Text.ToLowerInvariant()
        if ($latestHead -cne $remoteHead) {
            throw "origin/$TargetBranch advanced during repin from $remoteHead to $latestHead; no commit was pushed."
        }

        $commit = Invoke-Git -WorkingTree $consumerWorktree -Args @('commit', '-m', ("build(ci): repin PHX-CI to {0}" -f $PhxCiSha.Substring(0, 12))) -AllowFailure
        if ($commit.ExitCode -ne 0) {
            throw "repin commit failed (exit $($commit.ExitCode)): $($commit.Text)"
        }
        $commitSha = (Invoke-Git -WorkingTree $consumerWorktree -Args @('rev-parse', 'HEAD')).Text.ToLowerInvariant()

        $push = Invoke-Git -WorkingTree $consumerWorktree -Args @('push', 'origin', "HEAD:refs/heads/$TargetBranch") -AllowFailure
        if ($push.ExitCode -ne 0) {
            throw "repin push failed for origin/$TargetBranch (exit $($push.ExitCode)): $($push.Text)"
        }

        Write-Host 'REPIN COMPLETE'
        Write-Host ("Target branch: {0}" -f $TargetBranch)
        Write-Host ("Previous HEAD: {0}" -f $remoteHead)
        Write-Host ("Repin commit: {0}" -f $commitSha)
        Write-Host ("PHX-CI SHA: {0}" -f $PhxCiSha.ToLowerInvariant())
        Write-Host ("Changed files: {0}" -f ($staged -join ', '))
        return 0
    }
    finally {
        if ($phxWorktreeAdded) {
            $removePhx = Invoke-Git -WorkingTree $phxRoot -Args @('worktree', 'remove', '--force', $phxWorktree) -AllowFailure
            if ($removePhx.ExitCode -ne 0) {
                $cleanupProblems.Add("PHX-CI worktree removal failed (exit $($removePhx.ExitCode)): $($removePhx.Text)")
            }
            else {
                $prunePhx = Invoke-Git -WorkingTree $phxRoot -Args @('worktree', 'prune') -AllowFailure
                if ($prunePhx.ExitCode -ne 0) {
                    $cleanupProblems.Add("PHX-CI worktree prune failed (exit $($prunePhx.ExitCode)): $($prunePhx.Text)")
                }
            }
        }

        if ($consumerWorktreeAdded) {
            $removeConsumer = Invoke-Git -WorkingTree $consumerRoot -Args @('worktree', 'remove', '--force', $consumerWorktree) -AllowFailure
            if ($removeConsumer.ExitCode -ne 0) {
                $cleanupProblems.Add("consumer worktree removal failed (exit $($removeConsumer.ExitCode)): $($removeConsumer.Text)")
            }
            else {
                $pruneConsumer = Invoke-Git -WorkingTree $consumerRoot -Args @('worktree', 'prune') -AllowFailure
                if ($pruneConsumer.ExitCode -ne 0) {
                    $cleanupProblems.Add("consumer worktree prune failed (exit $($pruneConsumer.ExitCode)): $($pruneConsumer.Text)")
                }
            }
        }

        if ($cleanupProblems.Count -eq 0 -and (Test-Path -LiteralPath $tempRoot)) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }

        $after = Get-ControlSnapshot -RepositoryRoot $consumerRoot
        if ($after.Branch -cne $before.Branch -or
            $after.Head -cne $before.Head -or
            $after.Status -cne $before.Status) {
            $cleanupProblems.Add(
                ("active consumer checkout changed. Before: branch={0}, HEAD={1}; after: branch={2}, HEAD={3}; porcelain was required to remain identical." -f
                    $before.Branch, $before.Head, $after.Branch, $after.Head)
            )
        }

        if ($cleanupProblems.Count -gt 0) {
            throw ("cleanup/invariant failure: {0}" -f ($cleanupProblems -join ' | '))
        }
    }
}

try {
    $exitCode = Invoke-RepinMain
    exit $exitCode
}
catch {
    [Console]::Error.WriteLine('REPIN FAILED')
    [Console]::Error.WriteLine(("Reason: {0}" -f $_.Exception.Message))
    exit 1
}
