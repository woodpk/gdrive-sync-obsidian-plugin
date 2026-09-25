[CmdletBinding()]
param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Test {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) {
        throw "PHX-CI REPIN SELF-TEST FAILURE: $Message"
    }
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string[]]$GitArguments
    )

    $output = @(& git -C $Root @GitArguments 2>&1)
    $code = $LASTEXITCODE
    $text = ($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine
    if ($code -ne 0) {
        throw "git -C '$Root' $($GitArguments -join ' ') failed (exit $code): $text"
    }
    return $text.TrimEnd()
}

function Get-ControlState {
    param([Parameter(Mandatory)][string]$Root)

    return [pscustomobject]@{
        Branch = Invoke-Git -Root $Root -GitArguments @('branch', '--show-current')
        Head = Invoke-Git -Root $Root -GitArguments @('rev-parse', 'HEAD')
        Status = Invoke-Git -Root $Root -GitArguments @('status', '--porcelain=v1', '--untracked-files=all')
    }
}

function Assert-ControlState {
    param(
        [Parameter(Mandatory)]$Before,
        [Parameter(Mandatory)]$After,
        [Parameter(Mandatory)][string]$Context
    )

    Assert-Test ($After.Branch -ceq $Before.Branch) "$Context changed active branch"
    Assert-Test ($After.Head -ceq $Before.Head) "$Context changed active HEAD"
    Assert-Test ($After.Status -ceq $Before.Status) "$Context changed active porcelain"
}

function Assert-NoRawFrames {
    param(
        [Parameter(Mandatory)][string]$Text,
        [Parameter(Mandatory)][string]$Context
    )

    Assert-Test ($Text -notmatch '(?m)^Exception:') "$Context leaked Exception:"
    Assert-Test ($Text -notmatch '(?m)^Line\s+\|') "$Context leaked Line |"
    Assert-Test ($Text -notmatch '(?m)^\s*\+\s+throw(?:\s|\(|$)') "$Context leaked a source throw frame"
}

function New-PhxFixture {
    param([Parameter(Mandatory)][string]$Root)

    $work = Join-Path $Root 'phx-work'
    $origin = Join-Path $Root 'phx-origin.git'
    New-Item -ItemType Directory -Path (Join-Path $work 'scripts') -Force | Out-Null

    & git -C $work init -b main *> $null
    Assert-Test ($LASTEXITCODE -eq 0) 'failed to initialize PHX fixture'
    Invoke-Git -Root $work -GitArguments @('config', 'user.name', 'phx-ci-test') | Out-Null
    Invoke-Git -Root $work -GitArguments @('config', 'user.email', 'phx-ci-test@example.invalid') | Out-Null

    '0.2.0-test' | Set-Content -LiteralPath (Join-Path $work 'VERSION') -Encoding utf8NoBOM

    @'
[CmdletBinding()]
param([Parameter(Mandatory)][string]$RepoRoot)

$ErrorActionPreference = 'Stop'
$frameworkRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sha = (& git -C $frameworkRoot rev-parse HEAD).Trim()
$version = (Get-Content -LiteralPath (Join-Path $frameworkRoot 'VERSION') -Raw).Trim()

if ($env:PHX_REPIN_TEST_BOOTSTRAP_NOOP -eq '1') {
    Write-Host 'PHX-CI BOOTSTRAP COMPLETE'
    Write-Host 'Changed files: none (fixture no-op)'
    return
}

$configPath = Join-Path $RepoRoot 'phx-ci.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$config.framework.sha = $sha
$config.framework.version = $version
($config | ConvertTo-Json -Depth 10) |
    Set-Content -LiteralPath $configPath -Encoding utf8NoBOM

("managed framework " + $sha) |
    Set-Content -LiteralPath (Join-Path $RepoRoot 'Taskfile.phx-ci.yml') -Encoding utf8NoBOM
("root integration " + $sha) |
    Set-Content -LiteralPath (Join-Path $RepoRoot 'Taskfile.yml') -Encoding utf8NoBOM

if ($env:PHX_REPIN_TEST_UNEXPECTED_PATH -eq '1') {
    'unexpected' | Set-Content -LiteralPath (Join-Path $RepoRoot 'unexpected.txt') -Encoding utf8NoBOM
}

Write-Host 'PHX-CI BOOTSTRAP COMPLETE'
'@ | Set-Content -LiteralPath (Join-Path $work 'scripts/Bootstrap-PhxCiRepository.ps1') -Encoding utf8NoBOM

    Invoke-Git -Root $work -GitArguments @('add', '.') | Out-Null
    Invoke-Git -Root $work -GitArguments @('commit', '-m', 'fixture phx bootstrap') | Out-Null
    $sha = Invoke-Git -Root $work -GitArguments @('rev-parse', 'HEAD')

    & git init --bare $origin *> $null
    Assert-Test ($LASTEXITCODE -eq 0) 'failed to initialize PHX bare origin'
    Invoke-Git -Root $work -GitArguments @('remote', 'add', 'origin', $origin) | Out-Null
    Invoke-Git -Root $work -GitArguments @('push', '-u', 'origin', 'main') | Out-Null

    return [pscustomobject]@{
        Root = $work
        Sha = $sha
    }
}

function New-ConsumerFixture {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string]$InitialPin
    )

    $work = Join-Path $Root 'consumer-work'
    $origin = Join-Path $Root 'consumer-origin.git'
    New-Item -ItemType Directory -Path $work -Force | Out-Null

    & git -C $work init -b target *> $null
    Assert-Test ($LASTEXITCODE -eq 0) 'failed to initialize consumer fixture'
    Invoke-Git -Root $work -GitArguments @('config', 'user.name', 'phx-ci-test') | Out-Null
    Invoke-Git -Root $work -GitArguments @('config', 'user.email', 'phx-ci-test@example.invalid') | Out-Null

    $config = [ordered]@{
        repositoryIdentity = 'fixture/consumer'
        projectName = 'fixture-consumer'
        adapter = 'node-typescript'
        framework = [ordered]@{
            version = '0.2.0-old'
            sha = $InitialPin
            pinPolicy = 'exact'
        }
        expectedArtifacts = @('main.js')
        evidence = [ordered]@{
            canonicalPath = 'dev/_ca-output.md'
            historyDirectory = 'dev/test-results'
        }
        repositoryPolicy = [ordered]@{
            requiredPaths = @()
            prohibitedChangedPaths = @()
        }
    }
    ($config | ConvertTo-Json -Depth 10) |
        Set-Content -LiteralPath (Join-Path $work 'phx-ci.json') -Encoding utf8NoBOM
    'old managed taskfile' | Set-Content -LiteralPath (Join-Path $work 'Taskfile.phx-ci.yml') -Encoding utf8NoBOM
    'old root taskfile' | Set-Content -LiteralPath (Join-Path $work 'Taskfile.yml') -Encoding utf8NoBOM
    'fixture' | Set-Content -LiteralPath (Join-Path $work 'plugin-production-sentinel.txt') -Encoding utf8NoBOM

    Invoke-Git -Root $work -GitArguments @('add', '.') | Out-Null
    Invoke-Git -Root $work -GitArguments @('commit', '-m', 'fixture target') | Out-Null
    $targetHead = Invoke-Git -Root $work -GitArguments @('rev-parse', 'HEAD')

    & git init --bare $origin *> $null
    Assert-Test ($LASTEXITCODE -eq 0) 'failed to initialize consumer bare origin'
    Invoke-Git -Root $work -GitArguments @('remote', 'add', 'origin', $origin) | Out-Null
    Invoke-Git -Root $work -GitArguments @('push', '-u', 'origin', 'target') | Out-Null

    Invoke-Git -Root $work -GitArguments @('switch', '-c', 'operator-control') | Out-Null
    'operator-local-state' | Set-Content -LiteralPath (Join-Path $work 'operator-untracked.txt') -Encoding utf8NoBOM

    return [pscustomobject]@{
        Root = $work
        TargetHead = $targetHead
        Control = Get-ControlState -Root $work
    }
}

function Invoke-RepinCase {
    param(
        [Parameter(Mandatory)][string]$OperatorPath,
        [Parameter(Mandatory)][string]$ConsumerRoot,
        [Parameter(Mandatory)][string]$PhxRoot,
        [Parameter(Mandatory)][string]$PhxSha,
        [string]$ExpectedHead = '',
        [string]$Mode = ''
    )

    $priorUnexpected = $env:PHX_REPIN_TEST_UNEXPECTED_PATH
    $priorNoop = $env:PHX_REPIN_TEST_BOOTSTRAP_NOOP
    try {
        Remove-Item Env:PHX_REPIN_TEST_UNEXPECTED_PATH -ErrorAction SilentlyContinue
        Remove-Item Env:PHX_REPIN_TEST_BOOTSTRAP_NOOP -ErrorAction SilentlyContinue
        if ($Mode -eq 'unexpected') {
            $env:PHX_REPIN_TEST_UNEXPECTED_PATH = '1'
        }
        if ($Mode -eq 'noop') {
            $env:PHX_REPIN_TEST_BOOTSTRAP_NOOP = '1'
        }

        $arguments = @(
            '-NoProfile',
            '-File', $OperatorPath,
            '-ConsumerRepositoryRoot', $ConsumerRoot,
            '-TargetBranch', 'target',
            '-PhxCiSha', $PhxSha,
            '-PhxCiSourceRoot', $PhxRoot
        )
        if (-not [string]::IsNullOrWhiteSpace($ExpectedHead)) {
            $arguments += @('-ExpectedTargetHead', $ExpectedHead)
        }

        $output = @(& (Get-Process -Id $PID).Path @arguments 2>&1)
        $exitCode = $LASTEXITCODE
        return [pscustomobject]@{
            ExitCode = $exitCode
            Text = (($output | ForEach-Object { [string]$_ }) -join [Environment]::NewLine)
        }
    }
    finally {
        if ($null -eq $priorUnexpected) {
            Remove-Item Env:PHX_REPIN_TEST_UNEXPECTED_PATH -ErrorAction SilentlyContinue
        }
        else {
            $env:PHX_REPIN_TEST_UNEXPECTED_PATH = $priorUnexpected
        }
        if ($null -eq $priorNoop) {
            Remove-Item Env:PHX_REPIN_TEST_BOOTSTRAP_NOOP -ErrorAction SilentlyContinue
        }
        else {
            $env:PHX_REPIN_TEST_BOOTSTRAP_NOOP = $priorNoop
        }
    }
}

$operatorPath = Join-Path $RepositoryRoot 'dev/scripts/Invoke-PhxCiRepin.ps1'
$selfTestPath = Join-Path $RepositoryRoot 'dev/scripts/Invoke-PhxCiRepinSelfTest.ps1'
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("phx-ci-repin-self-test-{0}" -f [guid]::NewGuid().ToString('N'))

try {
    foreach ($parserTarget in @(
        [pscustomobject]@{ Name = 'operator script'; Path = $operatorPath },
        [pscustomobject]@{ Name = 'self-test script'; Path = $selfTestPath }
    )) {
        $tokens = $null
        $parseErrors = $null
        [Management.Automation.Language.Parser]::ParseFile($parserTarget.Path, [ref]$tokens, [ref]$parseErrors) | Out-Null
        Assert-Test (@($parseErrors).Count -eq 0) ("{0} parser errors: {1}" -f $parserTarget.Name, ((@($parseErrors) | ForEach-Object { $_.Message }) -join ' | '))
        Write-Output ("PASS {0} PowerShell parser validation" -f $parserTarget.Name)
    }

    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    $phx = New-PhxFixture -Root (Join-Path $tempRoot 'phx')
    $oldPin = '1111111111111111111111111111111111111111'

    $mismatch = New-ConsumerFixture -Root (Join-Path $tempRoot 'mismatch') -InitialPin $oldPin
    $mismatchResult = Invoke-RepinCase -OperatorPath $operatorPath -ConsumerRoot $mismatch.Root -PhxRoot $phx.Root -PhxSha $phx.Sha -ExpectedHead '0000000000000000000000000000000000000000'
    Assert-Test ($mismatchResult.ExitCode -eq 0) "expected-head mismatch returned $($mismatchResult.ExitCode)"
    Assert-Test ($mismatchResult.Text -match 'REPIN SKIPPED') 'expected-head mismatch did not report REPIN SKIPPED'
    Assert-Test ($mismatchResult.Text -match 'expected target HEAD') 'expected-head mismatch reason missing'
    Assert-NoRawFrames -Text $mismatchResult.Text -Context 'expected-head mismatch'
    Assert-Test ((Invoke-Git -Root $mismatch.Root -GitArguments @('rev-parse', 'origin/target')) -ceq $mismatch.TargetHead) 'expected-head mismatch changed target branch'
    Assert-ControlState -Before $mismatch.Control -After (Get-ControlState -Root $mismatch.Root) -Context 'expected-head mismatch'
    Write-Output 'PASS expected-head mismatch is a clean REPIN SKIPPED result with exit 0'

    $already = New-ConsumerFixture -Root (Join-Path $tempRoot 'already') -InitialPin $phx.Sha
    $alreadyResult = Invoke-RepinCase -OperatorPath $operatorPath -ConsumerRoot $already.Root -PhxRoot $phx.Root -PhxSha $phx.Sha
    Assert-Test ($alreadyResult.ExitCode -eq 0) "already-pinned target returned $($alreadyResult.ExitCode)"
    Assert-Test ($alreadyResult.Text -match 'REPIN SKIPPED') 'already-pinned target did not report REPIN SKIPPED'
    Assert-Test ($alreadyResult.Text -match 'already pinned') 'already-pinned reason missing'
    Assert-NoRawFrames -Text $alreadyResult.Text -Context 'already-pinned target'
    Assert-Test ((Invoke-Git -Root $already.Root -GitArguments @('rev-parse', 'origin/target')) -ceq $already.TargetHead) 'already-pinned target changed remote target branch'
    Assert-ControlState -Before $already.Control -After (Get-ControlState -Root $already.Root) -Context 'already-pinned target'
    Write-Output 'PASS already-pinned target is a clean REPIN SKIPPED result with exit 0'

    $noop = New-ConsumerFixture -Root (Join-Path $tempRoot 'noop') -InitialPin $oldPin
    $noopResult = Invoke-RepinCase -OperatorPath $operatorPath -ConsumerRoot $noop.Root -PhxRoot $phx.Root -PhxSha $phx.Sha -Mode 'noop'
    Assert-Test ($noopResult.ExitCode -ne 0) 'bootstrap no-op with an unsatisfied requested pin returned success'
    Assert-Test ($noopResult.Text -match 'REPIN FAILED') 'bootstrap no-op with unsatisfied state did not fail cleanly'
    Assert-Test ($noopResult.Text -match 'does not equal requested SHA') 'bootstrap no-op state-validation reason missing'
    Assert-NoRawFrames -Text $noopResult.Text -Context 'bootstrap no-op with unsatisfied state'
    Assert-Test ((Invoke-Git -Root $noop.Root -GitArguments @('rev-parse', 'origin/target')) -ceq $noop.TargetHead) 'bootstrap no-op with unsatisfied state changed target branch'
    Assert-ControlState -Before $noop.Control -After (Get-ControlState -Root $noop.Root) -Context 'bootstrap no-op with unsatisfied state'
    Write-Output 'PASS bootstrap no-change cannot silently pass unless the requested pin is actually satisfied'

    $success = New-ConsumerFixture -Root (Join-Path $tempRoot 'success') -InitialPin $oldPin
    Assert-Test ($success.Control.Branch -ceq 'operator-control') 'success fixture active checkout is not deliberately on a different branch'
    $successResult = Invoke-RepinCase -OperatorPath $operatorPath -ConsumerRoot $success.Root -PhxRoot $phx.Root -PhxSha $phx.Sha -ExpectedHead $success.TargetHead
    Assert-Test ($successResult.ExitCode -eq 0) "successful repin returned $($successResult.ExitCode): $($successResult.Text)"
    Assert-Test ($successResult.Text -match 'REPIN COMPLETE') 'successful repin completion message missing'
    Assert-NoRawFrames -Text $successResult.Text -Context 'successful repin'
    Invoke-Git -Root $success.Root -GitArguments @('fetch', 'origin', 'target') | Out-Null
    $successHead = Invoke-Git -Root $success.Root -GitArguments @('rev-parse', 'origin/target')
    Assert-Test ($successHead -cne $success.TargetHead) 'successful repin did not advance target branch'
    $configSpec = '{0}:phx-ci.json' -f $successHead
    $remoteConfig = (Invoke-Git -Root $success.Root -GitArguments @('show', $configSpec)) | ConvertFrom-Json
    Assert-Test ([string]$remoteConfig.framework.sha -ceq $phx.Sha) 'successful repin did not publish requested framework.sha'
    $changed = @((Invoke-Git -Root $success.Root -GitArguments @('diff', '--name-only', "$($success.TargetHead)..$successHead")) -split '\r?\n' | Where-Object { $_ })
    $allowed = @('phx-ci.json', 'Taskfile.phx-ci.yml', 'Taskfile.yml')
    Assert-Test (@($changed | Where-Object { $_ -notin $allowed }).Count -eq 0) ("successful repin changed unexpected path(s): {0}" -f ($changed -join ', '))
    Invoke-Git -Root $success.Root -GitArguments @('diff', '--check', "$($success.TargetHead)..$successHead") | Out-Null
    Write-Output 'PASS successful repin committed managed files pass git diff --check'
    Assert-ControlState -Before $success.Control -After (Get-ControlState -Root $success.Root) -Context 'successful repin'
    Write-Output 'PASS active checkout on a different branch does not matter'
    Write-Output 'PASS successful repin updates only managed PHX-CI consumer files and preserves active checkout'

    $unexpected = New-ConsumerFixture -Root (Join-Path $tempRoot 'unexpected') -InitialPin $oldPin
    $unexpectedResult = Invoke-RepinCase -OperatorPath $operatorPath -ConsumerRoot $unexpected.Root -PhxRoot $phx.Root -PhxSha $phx.Sha -Mode 'unexpected'
    Assert-Test ($unexpectedResult.ExitCode -ne 0) 'unexpected changed path returned success'
    Assert-Test ($unexpectedResult.Text -match 'REPIN FAILED') 'unexpected changed path did not render concise public failure'
    Assert-Test ($unexpectedResult.Text -match 'unexpected consumer path') 'unexpected changed path reason missing'
    Assert-NoRawFrames -Text $unexpectedResult.Text -Context 'unexpected changed path failure'
    Assert-Test ((Invoke-Git -Root $unexpected.Root -GitArguments @('rev-parse', 'origin/target')) -ceq $unexpected.TargetHead) 'unexpected changed path advanced target branch'
    Assert-ControlState -Before $unexpected.Control -After (Get-ControlState -Root $unexpected.Root) -Context 'unexpected changed path failure'
    Write-Output 'PASS unexpected changed path fails without changing target branch or active checkout'

    Write-Output 'ALL PHX-CI REPIN SELF-TESTS PASSED'
    exit 0
}
catch {
    [Console]::Error.WriteLine($_)
    exit 1
}
finally {
    Remove-Item Env:PHX_REPIN_TEST_UNEXPECTED_PATH -ErrorAction SilentlyContinue
    Remove-Item Env:PHX_REPIN_TEST_BOOTSTRAP_NOOP -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
