#requires -Version 7.0
<#
.SYNOPSIS
  Refresh the read-only BRAIN dashboard from freshly fetched, immutable Git refs.
.DESCRIPTION
  Does not change the operator checkout branch or any remote repository data.
  Uses only Git, PowerShell 7 and optional installed Microsoft Edge.
#>
[CmdletBinding()]
param(
    [string]$RepositoryRoot=(Join-Path $PSScriptRoot '../../..'),
    [string]$RepositoryUrl='https://github.com/woodpk/gdrive-sync-obsidian-plugin.git',
    [string]$ReferenceBranch='master',
    [string]$OutputDirectory='',
    [string]$EdgeExecutable='',
    [switch]$VerifyBrowser,
    [switch]$NoOpen,
    [switch]$KeepTemporaryCheckout
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
. (Join-Path $PSScriptRoot 'Dashboard.BrainCore.ps1')
$encoding=[Text.UTF8Encoding]::new($false)
$start=[DateTimeOffset]::UtcNow
$runId=$start.ToString('yyyyMMddTHHmmssfffZ')+'-'+[guid]::NewGuid().ToString('N').Substring(0,8)
$root=[IO.Path]::GetFullPath($RepositoryRoot)
# SECURITY/PERSISTENCE PREFLIGHT: do not create any output, evidence, or
# dev/_ca-output.md in a feature-branch checkout, even on a failed invocation.
$preflightBranch=''
if(Get-Command git -ErrorAction SilentlyContinue) {
    $rawBranch=@(& git -C $root symbolic-ref --short HEAD 2>$null)
    if($LASTEXITCODE -eq 0){$preflightBranch=($rawBranch -join '').Trim()}
}
if($preflightBranch -cne 'progress') {
    Write-Host "[dashboard] STOP: Current checkout is '$preflightBranch', not progress. Use the branch-independent Launch-BRAINDashboard.ps1." -ForegroundColor Red
    @([pscustomobject]@{Operation='BRAIN dashboard';OperatorBranch=$preflightBranch;Verdict='NOT RUN';Writes='NONE';Exit=2})|Format-Table -AutoSize|Out-Host
    exit 2
}
$evidence=Join-Path $root ('dev/test-results/dashboard/'+$runId)
$summary=Join-Path $root 'dev/_ca-output.md'
if(-not $OutputDirectory){$OutputDirectory=Join-Path $root 'dev/dashboards'}
$outDir=[IO.Path]::GetFullPath($OutputDirectory)
$temp=Join-Path ([IO.Path]::GetTempPath()) ('brain-dashboard-'+$runId)
$checkout=Join-Path $temp 'source'
$log=Join-Path $evidence 'command-log.ndjson'
$transcript=Join-Path $evidence 'terminal.log'
$report=Join-Path $evidence 'validation.json'
$published='';$snapPath='';$master='';$verdict='FAIL';$reason='';$started=$false
$script:BrainCommandLog=$log
$script:BrainLogEncoding=$encoding
function Invoke-BrainGit {
    param([Parameter(Mandatory)][string[]]$Arguments,[switch]$Quiet)
    $description='git '+($Arguments -join ' ')
    $lines=@(& git @Arguments 2>&1)
    $exitCode=$LASTEXITCODE
    if($null -eq $exitCode){$exitCode=0}
    $output=($lines|ForEach-Object {[string]$_}) -join "`n"
    $rec=[ordered]@{utc=[DateTimeOffset]::UtcNow.ToString('o');command=$description;exitCode=$exitCode;output=$output}
    [IO.File]::AppendAllText($script:BrainCommandLog,(ConvertTo-Json -InputObject $rec -Compress -Depth 5)+"`n",$script:BrainLogEncoding)
    if(-not $Quiet){Write-Host "> $description`n[exit-code] $exitCode";if($output){Write-Host $output}}
    if($exitCode -ne 0){throw "Native command failed, exit $exitCode : $description"}
    return $output
}
try {
    [IO.Directory]::CreateDirectory($evidence)|Out-Null
    [IO.Directory]::CreateDirectory($outDir)|Out-Null
    [IO.Directory]::CreateDirectory($temp)|Out-Null
    Start-Transcript -Path $transcript -Force | Out-Null;$started=$true
    Write-Host "[dashboard] Run $runId"
    Write-Host "[dashboard] Evidence: $evidence"
    Assert-Brain ([bool](Get-Command git -ErrorAction SilentlyContinue)) 'Git for Windows is required.'
    Assert-Brain ($RepositoryUrl -eq 'https://github.com/woodpk/gdrive-sync-obsidian-plugin.git') 'Repository URL must match approved BRAIN repository.'
    Assert-Brain ($ReferenceBranch -eq 'master') 'Current BRAIN dashboard requires the canonical master baseline.'
    Assert-Brain ([IO.File]::Exists((Join-Path $root '.git')) -or [IO.Directory]::Exists((Join-Path $root '.git'))) "RepositoryRoot must be a local checkout: $root"
    # Data sources include master and feature branches, but writable dashboard output
    # and verification evidence must be in an isolated progress checkout only.
    $writableBranch=(Invoke-BrainGit -Arguments @('-C',$root,'symbolic-ref','--short','HEAD') -Quiet).Trim()
    Assert-Brain ($writableBranch -ceq 'progress') "Dashboard writer requires progress; the operator's checkout is '$writableBranch'. Use Launch-BRAINDashboard.ps1 from any branch instead."
    # DCM-style parser preflight: a broken .ps1 cannot reliably run its own tests.
    foreach($name in @('Run-BRAINDashboard.ps1','Dashboard.BrainCore.ps1','Test-BRAINDashboard.ps1','Launch-BRAINDashboard.ps1')) {
        $tokens=$null;$errors=$null
        $scriptPath=Join-Path $PSScriptRoot $name
        $null=[System.Management.Automation.Language.Parser]::ParseFile($scriptPath,[ref]$tokens,[ref]$errors)
        if(@($errors).Count -gt 0){
            throw "PowerShell parser preflight failed for $name : " + (@($errors|ForEach-Object {$_.Message}) -join '; ')
        }
    }
    Write-Host '[parser-preflight] PASS — four dashboard scripts.'
    $settingsPath=Join-Path $PSScriptRoot 'dashboard.local.json'
    $settings=Get-Content $settingsPath -Raw -Encoding UTF8|ConvertFrom-Json -AsHashtable -Depth 10
    $prefixes=@($settings['feature_prefixes']);$maxRefs=[int]$settings['max_feature_refs']
    Assert-Brain ($maxRefs -ge 1 -and $maxRefs -le 100) 'max_feature_refs must be 1..100.'
    Assert-Brain ($prefixes.Count -gt 0 -and $prefixes.Count -lt 12) 'Feature-prefix inventory missing/invalid.'
    # DCM's operator-environment launch pattern, but BRAIN uses a separate read-only clone.
    $null=Invoke-BrainGit -Arguments @('clone','--quiet','--no-checkout','--', $RepositoryUrl,$checkout)
    $master=(Invoke-BrainGit -Arguments @('-C',$checkout,'rev-parse',"refs/remotes/origin/$ReferenceBranch") -Quiet).Trim()
    Assert-Brain ($master -match '^[a-f0-9]{40}$') 'Pinned master identity missing.'
    $refs=Invoke-BrainGit -Arguments @('-C',$checkout,'for-each-ref','--format=%(refname:short)|%(objectname)|%(committerdate:iso8601)','refs/remotes/origin') -Quiet
    $allRefs=@()
    foreach($line in ($refs -split "`r?`n")) {
        $parts=$line.Split('|',3)
        if($parts.Count -ne 3 -or $parts[0] -notlike 'origin/*'){continue}
        $branch=$parts[0].Substring(7)
        if(-not (@($prefixes|Where-Object {$branch.StartsWith([string]$_,[StringComparison]::Ordinal)}).Count)){continue}
        if($parts[1] -notmatch '^[a-f0-9]{40}$'){continue}
        $date=[DateTimeOffset]::MinValue
        try {$date=[DateTimeOffset]::Parse($parts[2])}catch{}
        $allRefs+=,[pscustomobject]@{branch=$branch;sha=$parts[1];timestamp=$date}
    }
    $selected=@($allRefs|Sort-Object timestamp -Descending|Select-Object -First $maxRefs)
    $masterIndex=Invoke-BrainGit -Arguments @('-C',$checkout,'show',("${master}:dev/planning/02-workstreams/00-INDEX.md")) -Quiet
    $baselineAccepted=$masterIndex.Contains('The accepted six product phases map one-to-one to WS-01 through WS-06')
    Write-Host "[source-check] Pinned master $master; $($selected.Count) matching feature branches"
    $features=New-Object System.Collections.Generic.List[object]
    $seenKeys=New-Object 'System.Collections.Generic.HashSet[string]'
    foreach($branch in $selected){
        try {
            $yaml=Invoke-BrainGit -Arguments @('-C',$checkout,'show',("$($branch.sha):dev/state/current-state.yaml")) -Quiet
            $state=ConvertFrom-BrainStateText $yaml
            foreach($key in @($state.Keys)) {
                if($key -notmatch '^(dec339_|dec362_)'){continue}
                $block=$state[$key]
                if($block -isnot [System.Collections.IDictionary]){continue}
                # A copied historical state block on a newer branch is NOT that branch's own new acceptance.
                $ownedBranch=[string]$block['branch'];if(-not $ownedBranch){$ownedBranch=[string]$block['builder_branch']}
                if($ownedBranch -ne $branch.branch){continue}
                $id=Get-BrainFeatureId $key $block
                if(-not $id -or -not $seenKeys.Add($id)){continue}
                $features.Add([pscustomobject]@{key=$key;branch=$branch.branch;sha=$branch.sha;timestamp=$branch.timestamp;fields=$block})
            }
        } catch {
            Write-Warning "Cannot read feature source $($branch.branch): $($_.Exception.Message)"
        }
    }
    # The canonical master keeps an older WS-07 global active pointer. Include it as
    # a separately labelled BVP feature, not as the override for current DEC-339 focus.
    try {
        $masterYaml=Invoke-BrainGit -Arguments @('-C',$checkout,'show',("${master}:dev/state/current-state.yaml")) -Quiet
        $masterState=ConvertFrom-BrainStateText $masterYaml
        if(([string]$masterState['active_workstream']) -like 'WS-07*') {
            $bvpFields=[ordered]@{status=[string]$masterState['active_build_unit_status'];branch='master';
                scope=[string]$masterState['active_build_unit'];next_action=[string]$masterState['next_action'];
                qualified_source_sha=[string]$masterState['active_build_unit_qualified_source_sha']}
            $features.Add([pscustomobject]@{key='brain_global_bvp_active';branch='master';sha=$master;
                timestamp=[DateTimeOffset]::MinValue;fields=$bvpFields})
        }
    } catch { Write-Warning "Master BVP status could not be read: $($_.Exception.Message)" }
    Assert-Brain ($features.Count -gt 0) 'No compatible BRAIN feature-state records were found. No stale report will be republished.'
    Write-Host "[source-check] $($features.Count) feature-specific authoritative state blocks found"
    & (Join-Path $PSScriptRoot 'Test-BRAINDashboard.ps1') -CoreOnly
    if($LASTEXITCODE -ne 0){throw 'Dashboard offline regression tests failed.'}
    $snapshot=New-BrainSnapshot -Checkout $checkout -MasterSha $master -Features @($features.ToArray()) -BaselineAccepted $baselineAccepted
    $json=ConvertTo-Json -InputObject $snapshot -Depth 70
    $templatePath=Join-Path $PSScriptRoot 'brain-dashboard-template.html'
    $expectedHash=((Get-Content (Join-Path $PSScriptRoot 'template.sha256') -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
    $actualHash=(Get-FileHash -Algorithm SHA256 $templatePath).Hash.ToLowerInvariant()
    Assert-Brain ($actualHash -eq $expectedHash) 'Dashboard template hash differs from the supplied DCM-derived approved adaptation.'
    $template=[IO.File]::ReadAllText($templatePath,$encoding)
    $html=New-BrainDashboardHtml -Template $template -SnapshotJson $json
    $htmlPath=Join-Path $evidence 'dashboard.html'
    $snapPath=Join-Path $evidence 'dashboard.snapshot.json'
    [IO.File]::WriteAllText($snapPath,$json,$encoding)
    [IO.File]::WriteAllText($htmlPath,$html,$encoding)
    Write-Host "[generator] Snapshot written to $snapPath"
    if($VerifyBrowser){
        & (Join-Path $PSScriptRoot 'Test-BRAINDashboard.ps1') -BrowserHtmlPath $htmlPath -EvidenceDirectory $evidence -EdgeExecutable $EdgeExecutable
        if($LASTEXITCODE -ne 0){throw 'Headless Edge browser dashboard QA failed.'}
        Write-Host '[browser-qa] PASS'
    }else {Write-Host '[browser-qa] NOT RUN (optional)'}
    # Generated HTML must exist and have a source identity prior to LATEST publication.
    Assert-Brain ($html.Contains($master.Substring(0,10))) 'Snapshot did not retain the pinned master baseline.'
    Assert-Brain (-not $html.Contains('__PROJECT_SNAPSHOT_JSON__')) 'Unresolved HTML data-binding marker.'
    $versioned=Join-Path $outDir ("BRAIN-Dashboard-$runId.html")
    $latest=Join-Path $outDir 'BRAIN-Dashboard-LATEST.html'
    [IO.File]::Copy($htmlPath,$versioned,$true)
    $staging=$latest+'.tmp-'+$runId
    [IO.File]::Copy($htmlPath,$staging,$true)
    [IO.File]::Move($staging,$latest,$true)
    $published=$latest;$verdict='PASS'
    Write-Host "[dashboard] Published $latest"
    if(-not $NoOpen){Start-Process -FilePath $latest;Write-Host '[dashboard] Open requested; this alone does not establish browser QA.'}
}catch{
    $reason=$_.Exception.Message
    Write-Host "[dashboard] FAIL: $reason" -ForegroundColor Red
}finally{
    $ended=[DateTimeOffset]::UtcNow
    $record=[ordered]@{runId=$runId;verdict=$verdict;reason=$reason;started=$start.ToString('o');ended=$ended.ToString('o');master=$master;
        checkout=$root;latest=$published;originalEvidence=$evidence;snapshot=$snapPath;browserQA=$(if($VerifyBrowser){'requested'}else{'not-run'});
        finalExitCode=$(if($verdict -eq 'PASS'){0}else{1})}
    try{[IO.File]::WriteAllText($report,((ConvertTo-Json -InputObject $record -Depth 12)+"`n"),$encoding)}catch{}
    try{
        $small="`n## BRAIN dashboard $runId`n- Verdict: **$verdict**`n- Source master: $master`n- Evidence: $evidence`n- Published: $published`n- Exit: $(if($verdict -eq 'PASS'){0}else{1})`n- Reason: $reason`n"
        [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($summary))|Out-Null
        [IO.File]::AppendAllText($summary,$small,$encoding)
    }catch{}
    if(-not $KeepTemporaryCheckout){try{if(Test-Path -LiteralPath $temp){Remove-Item $temp -Recurse -Force -ErrorAction Stop}}catch{Write-Warning "Temporary clone cleanup failed: $($_.Exception.Message)"}}
    Write-Host ''
    @([pscustomobject]@{Run=$runId;Verdict=$verdict;Source=$(if($master){$master.Substring(0,[Math]::Min(12,$master.Length))}else{'unavailable'});Published=$published;Evidence=$evidence;Exit=$(if($verdict -eq 'PASS'){0}else{1})})|Format-Table -AutoSize -Wrap|Out-Host
    if($started){try{Stop-Transcript | Out-Null}catch{}}
}
if($verdict -ne 'PASS'){exit 1};exit 0