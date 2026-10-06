[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ProjectRoot,[Parameter(Mandatory)][string]$CurrentHead,
    [Parameter(Mandatory)][string]$PredecessorHead,[Parameter(Mandatory)][string]$PredecessorEvidencePath
)
$ErrorActionPreference='Stop'; Set-StrictMode -Version Latest
function Fail([string]$Message){throw "BVP_PRODUCTION_TEST_CARRY_FORWARD_ERROR $Message"}
$root=[IO.Path]::GetFullPath($ProjectRoot)
$gitCommand=@(Get-Command git.exe -CommandType Application -All -ErrorAction SilentlyContinue|Select-Object -First 1)
if($gitCommand.Count-eq 0){$gitCommand=@(Get-Command git -CommandType Application -All -ErrorAction Stop|Select-Object -First 1)}
$git=[string]$gitCommand[0].Source
$actualHead=(& $git -C $root rev-parse HEAD 2>$null).Trim()
if($LASTEXITCODE-ne 0-or $actualHead-cne $CurrentHead){Fail "current HEAD mismatch expected=$CurrentHead actual=$actualHead"}
& $git -C $root merge-base --is-ancestor $PredecessorHead $CurrentHead 2>$null
if($LASTEXITCODE-ne 0){Fail "predecessor is not an ancestor predecessor=$PredecessorHead current=$CurrentHead"}
$allowed=@('test-platform/src/live-device/drive-mailbox.ts','test-platform/src/live-device/validation-entrypoint.ts','dev/scripts/Test-BvpProductionTestCarryForward.ps1','dev/scripts/Invoke-PHXCI-BvpFinalSelectiveVerification.ps1')
$changed=@(& $git -C $root diff --name-only "$PredecessorHead..$CurrentHead" 2>$null|ForEach-Object{([string]$_).Replace('\','/')}|Where-Object{-not[string]::IsNullOrWhiteSpace($_)})
if($LASTEXITCODE-ne 0){Fail 'unable to inspect predecessor-to-current changed paths'}
$unexpected=@($changed|Where-Object{$allowed-cnotcontains $_})
if($unexpected.Count-gt 0){Fail "current correction touches unapproved paths: $($unexpected -join ', ')"}
foreach($required in @('test-platform/src/live-device/drive-mailbox.ts','test-platform/src/live-device/validation-entrypoint.ts')){if($changed-cnotcontains $required){Fail "expected R6 correction path is absent: $required"}}
if(@($changed|Where-Object{$_-like 'src/*'-or $_-like 'test/*'-or $_-in @('package.json','package-lock.json','tsconfig.json','tsconfig.test.json')}).Count-gt 0){Fail 'production source/test input changed and cannot be carried forward'}
if(-not(Test-Path -LiteralPath $PredecessorEvidencePath -PathType Leaf)){Fail "predecessor evidence is missing: $PredecessorEvidencePath"}
try{$evidence=Get-Content -LiteralPath $PredecessorEvidencePath -Raw -Encoding utf8|ConvertFrom-Json -ErrorAction Stop}catch{Fail "predecessor evidence is unreadable: $($_.Exception.Message)"}
if([string]$evidence.repository.verifiedHead-cne $PredecessorHead){Fail "predecessor evidence HEAD mismatch expected=$PredecessorHead actual=$($evidence.repository.verifiedHead)"}
if([string]$evidence.verification.repository.status-cne 'PASS'){Fail "predecessor repository verification was not PASS: $($evidence.verification.repository.status)"}
$testStages=@($evidence.stages|Where-Object{[string]$_.name-ceq 'test'})
if($testStages.Count-ne 1){Fail "predecessor evidence must contain exactly one test stage; found $($testStages.Count)"}
$test=$testStages[0]
if([string]$test.result-cne 'PASS'-or[int]$test.exitCode-ne 0){Fail 'predecessor test stage was not PASS exit=0'}
$stdout=[string]$test.stdout
foreach($proof in @('# tests 835','# pass 835','# fail 0')){if(-not $stdout.Contains($proof,[StringComparison]::Ordinal)){Fail "predecessor test output is missing expected proof: $proof"}}
$toolPath=Join-Path $root '.phx-ci/tool-versions.json'
if(-not(Test-Path -LiteralPath $toolPath -PathType Leaf)){Fail "current PHX-CI tool versions are missing: $toolPath"}
$currentTools=Get-Content -LiteralPath $toolPath -Raw -Encoding utf8|ConvertFrom-Json -ErrorAction Stop
$priorTools=$evidence.environment.nativeToolVersions
foreach($name in @('node','npm')){$current=[string]$currentTools.$name;$prior=[string]$priorTools.$name;if([string]::IsNullOrWhiteSpace($current)-or[string]::IsNullOrWhiteSpace($prior)-or$current-cne$prior){Fail "toolchain mismatch for $name predecessor=$prior current=$current"}}
$currentOs=[Environment]::OSVersion.VersionString; $currentPs=$PSVersionTable.PSVersion.ToString(); $currentGit=(& $git --version).Trim()
if($currentOs-cne[string]$evidence.environment.os){Fail "OS mismatch predecessor=$($evidence.environment.os) current=$currentOs"}
if($currentPs-cne[string]$evidence.environment.powerShellVersion){Fail "PowerShell mismatch predecessor=$($evidence.environment.powerShellVersion) current=$currentPs"}
if($currentGit-cne[string]$priorTools.git){Fail "Git mismatch predecessor=$($priorTools.git) current=$currentGit"}
Write-Output 'BVP_PRODUCTION_TEST_CARRY_FORWARD=PASS'
Write-Output "predecessorHead=$PredecessorHead"; Write-Output "currentHead=$CurrentHead"; Write-Output "predecessorRunId=$($evidence.runId)"
Write-Output 'tests=835'; Write-Output 'pass=835'; Write-Output 'fail=0'; Write-Output "changedPaths=$($changed.Count)"
