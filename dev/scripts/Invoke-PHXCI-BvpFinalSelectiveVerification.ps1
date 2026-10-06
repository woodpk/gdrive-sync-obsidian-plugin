[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ProjectRoot,[Parameter(Mandatory)][string]$FrameworkRoot,[Parameter(Mandatory)][string]$TempRoot,
    [Parameter(Mandatory)][string]$ExpectedHead,[Parameter(Mandatory)][string]$ExpectedBaseSha,[Parameter(Mandatory)][string]$PredecessorHead,
    [Parameter(Mandatory)][string]$PredecessorEvidencePath
)
$ErrorActionPreference='Stop'; Set-StrictMode -Version Latest
$root=[IO.Path]::GetFullPath($ProjectRoot); $framework=[IO.Path]::GetFullPath($FrameworkRoot); $temp=[IO.Path]::GetFullPath($TempRoot)
$carryScript=Join-Path $root 'dev/scripts/Test-BvpProductionTestCarryForward.ps1'
$taskCommand=@(Get-Command task.exe -CommandType Application -All -ErrorAction SilentlyContinue|Select-Object -First 1)
if($taskCommand.Count-eq 0){$taskCommand=@(Get-Command task -CommandType Application -All -ErrorAction Stop|Select-Object -First 1)}
$task=[string]$taskCommand[0].Source
$gitCommand=@(Get-Command git.exe -CommandType Application -All -ErrorAction SilentlyContinue|Select-Object -First 1)
if($gitCommand.Count-eq 0){$gitCommand=@(Get-Command git -CommandType Application -All -ErrorAction Stop|Select-Object -First 1)}
$git=[string]$gitCommand[0].Source
foreach($required in @($root,$framework,$temp,$carryScript,$PredecessorEvidencePath,(Join-Path $root 'phx-ci.json'),(Join-Path $root 'Taskfile.yml'),(Join-Path $root 'Taskfile.phx-ci.yml'))){if(-not(Test-Path -LiteralPath $required)){throw "Required PHX-CI selective-verification input is missing: $required"}}
$actualHead=(& $git -C $root rev-parse HEAD 2>$null).Trim()
if($LASTEXITCODE-ne 0-or$actualHead-cne$ExpectedHead){throw "Verification HEAD mismatch. Expected $ExpectedHead; actual $actualHead"}
$config=Get-Content -LiteralPath (Join-Path $root 'phx-ci.json') -Raw -Encoding utf8|ConvertFrom-Json -ErrorAction Stop
$frameworkSha=Split-Path -Leaf $framework
if([string]$config.framework.sha-cne$frameworkSha){throw "PHX-CI runtime pin mismatch. Config=$($config.framework.sha); runtime=$frameworkSha"}
function Quote-PowerShellLiteral([string]$Value){return "'"+$Value.Replace("'","''")+"'"}
$carryCommand=@('& '+(Quote-PowerShellLiteral $carryScript),'-ProjectRoot '+(Quote-PowerShellLiteral $root),'-CurrentHead '+(Quote-PowerShellLiteral $ExpectedHead),'-PredecessorHead '+(Quote-PowerShellLiteral $PredecessorHead),'-PredecessorEvidencePath '+(Quote-PowerShellLiteral ([IO.Path]::GetFullPath($PredecessorEvidencePath))))-join' '
$runId=[guid]::NewGuid().ToString('D'); $resultDirectory=Join-Path $root "dev/Test-Results/$runId"
$stdoutPath=Join-Path $temp "phx-ci-$runId.stdout.log"; $stderrPath=Join-Path $temp "phx-ci-$runId.stderr.log"
$terminalPath=Join-Path $resultDirectory 'terminal.log'; $resultMd=Join-Path $resultDirectory 'result.md'; $resultJson=Join-Path $resultDirectory 'result.json'
$names=@('PHX_FRAMEWORK_ROOT','PHX_FOCUSED_TEST_COMMAND','PHX_FULL_TEST_COMMAND','PHX_EXPECTED_HEAD','PHX_EXPECTED_BASE_SHA','PHX_REQUIRE_CLEAN_TREE','PHX_TEMP_ROOT','PHX_RUN_ID','BVP_CHANGE_CLASS'); $old=@{}
foreach($name in $names){$old[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$values=@{PHX_FRAMEWORK_ROOT=$framework;PHX_FOCUSED_TEST_COMMAND='npm run test:bvp-root';PHX_FULL_TEST_COMMAND=$carryCommand;PHX_EXPECTED_HEAD=$ExpectedHead;PHX_EXPECTED_BASE_SHA=$ExpectedBaseSha;PHX_REQUIRE_CLEAN_TREE='false';PHX_TEMP_ROOT=$temp;PHX_RUN_ID=$runId;BVP_CHANGE_CLASS='authorized-governance'}
foreach($name in $values.Keys){[Environment]::SetEnvironmentVariable($name,[string]$values[$name],'Process')}
try{$process=Start-Process -FilePath $task -ArgumentList @('ci') -WorkingDirectory $root -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath;$taskExit=[int]$process.ExitCode}
finally{foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$old[$name],'Process')}}
New-Item -ItemType Directory -Path $resultDirectory -Force|Out-Null
$stdout=if(Test-Path -LiteralPath $stdoutPath){Get-Content -LiteralPath $stdoutPath -Raw -Encoding utf8}else{''}; $stderr=if(Test-Path -LiteralPath $stderrPath){Get-Content -LiteralPath $stderrPath -Raw -Encoding utf8}else{''}
@('===== STDOUT =====',$stdout,'===== STDERR =====',$stderr)|Set-Content -LiteralPath $terminalPath -Encoding utf8NoBOM
$legacyMd=Join-Path $root 'dev/_ca-output.md'; $legacyJson=Join-Path $root 'dev/_ca-output.json'
if(Test-Path -LiteralPath $legacyMd -PathType Leaf){Copy-Item -LiteralPath $legacyMd -Destination $resultMd -Force}
if(Test-Path -LiteralPath $legacyJson -PathType Leaf){Copy-Item -LiteralPath $legacyJson -Destination $resultJson -Force}
Write-Output $stdout
if(-not[string]::IsNullOrWhiteSpace($stderr)){[Console]::Error.WriteLine($stderr)}
Write-Output ''; Write-Output "PHX-CI selective run ID: $runId"; Write-Output "PHX-CI result directory: $resultDirectory"
Write-Output "Production test execution: CARRIED FORWARD from $PredecessorHead"; Write-Output 'Focused BVP execution: CURRENT'; Write-Output 'Build/repository/artifact gates: CURRENT if reached'
if($taskExit-ne 0){throw "PHX-CI selective verification failed with exit code $taskExit. Evidence retained at $resultDirectory"}
if(-not(Test-Path -LiteralPath $resultMd -PathType Leaf)-or-not(Test-Path -LiteralPath $resultJson -PathType Leaf)){throw "PHX-CI completed without canonical result.md/result.json at $resultDirectory"}
