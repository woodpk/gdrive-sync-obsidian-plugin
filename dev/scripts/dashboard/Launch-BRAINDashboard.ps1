#requires -Version 7.0
<#
.SYNOPSIS
  Launch BRAIN's progress-branch dashboard from ANY existing BRAIN working branch.
.DESCRIPTION
  Never checks out, resets, cleans, commits, or merges the operator's checkout.
  Uses a fresh, isolated clone of refs/heads/progress for the dashboard program,
  writable run evidence and optional evidence publication. BRAIN data sources
  (master and owned feature branches) are independently cloned read-only by the
  generator. Only optional evidence publication writes to refs/heads/progress.
#>
[CmdletBinding()]
param(
    [string]$RepositoryRoot=(Get-Location).Path,
    [string]$OutputDirectory='',
    [string]$EdgeExecutable='',
    [switch]$VerifyBrowser,
    [switch]$NoOpen,
    [switch]$PersistEvidence,
    [switch]$KeepTemporaryCheckout
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
$PSNativeCommandUseErrorActionPreference=$false
$repoUrl='https://github.com/woodpk/gdrive-sync-obsidian-plugin.git'
$encoding=[Text.UTF8Encoding]::new($false)
$runId=[DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssfffZ')+'-'+[guid]::NewGuid().ToString('N').Substring(0,8)
if(-not $OutputDirectory){$OutputDirectory=Join-Path $env:LOCALAPPDATA 'BRAIN-Dashboards'}
$outDir=[IO.Path]::GetFullPath($OutputDirectory)
$evidence=Join-Path $outDir ('evidence/'+$runId)
$launchLog=Join-Path $evidence 'launcher-git.ndjson'
$checkout=Join-Path ([IO.Path]::GetTempPath()) ('brain-dashboard-progress-'+$runId)
$repo=[IO.Path]::GetFullPath($RepositoryRoot)
$branchBefore='';$headBefore='';$branchAfter='';$headAfter='';$dashboardExit=$null
$verdict='FAIL';$reason='';$progressSha='';$evidenceCommit='';$started=$false
$latest=Join-Path $outDir 'BRAIN-Dashboard-LATEST.html'
function Invoke-LaunchGit {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $output=@(& git @Arguments 2>&1)
    $code=$LASTEXITCODE
    if($null -eq $code){$code=0}
    $txt=($output|ForEach-Object {[string]$_}) -join "`n"
    $record=[ordered]@{utc=[DateTimeOffset]::UtcNow.ToString('o');command='git '+($Arguments -join ' ');exitCode=$code;output=$txt}
    [IO.File]::AppendAllText($launchLog,((ConvertTo-Json -InputObject $record -Compress -Depth 6)+"`n"),$encoding)
    Write-Host "> git $($Arguments -join ' ') [exit=$code]"
    if($txt){Write-Host $txt}
    if($code -ne 0){throw "git exited $code : $($Arguments -join ' ')"}
    return $txt
}
try {
    [IO.Directory]::CreateDirectory($evidence)|Out-Null
    Start-Transcript -LiteralPath (Join-Path $evidence 'launcher-terminal.log') -Force|Out-Null
    $started=$true
    if(-not (Get-Command git -ErrorAction SilentlyContinue)){throw 'Git for Windows is required.'}
    $top=(Invoke-LaunchGit -Arguments @('-C',$repo,'rev-parse','--show-toplevel')).Trim()
    if([IO.Path]::GetFullPath($top).TrimEnd([char[]]@('\','/')) -cne $repo.TrimEnd([char[]]@('\','/'))){throw 'RepositoryRoot must identify the current BRAIN checkout root.'}
    $origin=(Invoke-LaunchGit -Arguments @('-C',$repo,'remote','get-url','origin')).Trim()
    if($origin -notmatch '^(https://github\.com/woodpk/gdrive-sync-obsidian-plugin(\.git)?|git@github\.com:woodpk/gdrive-sync-obsidian-plugin(\.git)?)$'){
        throw "Unexpected BRAIN origin: $origin"
    }
    $branchBefore=(Invoke-LaunchGit -Arguments @('-C',$repo,'symbolic-ref','--short','HEAD')).Trim()
    $headBefore=(Invoke-LaunchGit -Arguments @('-C',$repo,'rev-parse','HEAD')).Trim()
    Write-Host "[operator] Preserving checkout branch '$branchBefore' ($headBefore)"
    Write-Host '[module] Isolated progress clone; never checkout progress in the operator workspace.'
    $null=Invoke-LaunchGit -Arguments @('clone','--no-tags','--single-branch','--branch','progress','--',$repoUrl,$checkout)
    $branch=(Invoke-LaunchGit -Arguments @('-C',$checkout,'symbolic-ref','--short','HEAD')).Trim()
    if($branch -cne 'progress'){throw "Isolated module clone is not on progress: $branch"}
    $progressSha=(Invoke-LaunchGit -Arguments @('-C',$checkout,'rev-parse','HEAD')).Trim()
    if($progressSha -notmatch '^[a-f0-9]{40}$'){throw 'Progress module commit is not a valid SHA.'}
    $runner=Join-Path $checkout 'dev/scripts/dashboard/Run-BRAINDashboard.ps1'
    if(-not [IO.File]::Exists($runner)){throw "BRAIN dashboard module is missing from progress: $runner"}
    & $runner -RepositoryRoot $checkout -OutputDirectory $outDir -EdgeExecutable $EdgeExecutable -VerifyBrowser:$VerifyBrowser -NoOpen:$NoOpen
    $dashboardExit=$LASTEXITCODE
    if($null -eq $dashboardExit){$dashboardExit=1}
    $runEvidence=Get-ChildItem -LiteralPath (Join-Path $checkout 'dev/test-results/dashboard') -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending|Select-Object -First 1
    if($null -ne $runEvidence){
        Copy-Item -LiteralPath $runEvidence.FullName -Destination (Join-Path $evidence 'dashboard-run') -Recurse -Force
        Write-Host "[evidence] Persistent local copy: $evidence"
    }
    $summary=Join-Path $checkout 'dev/_ca-output.md'
    if([IO.File]::Exists($summary)){Copy-Item -LiteralPath $summary -Destination (Join-Path $evidence '_ca-output.md') -Force}
    if($PersistEvidence){
        if($null -eq $runEvidence){throw 'Cannot persist evidence: no dashboard run directory exists.'}
        $relative='dev/test-results/dashboard/'+$runEvidence.Name
        $null=Invoke-LaunchGit -Arguments @('-C',$checkout,'add','--','dev/_ca-output.md')
        foreach($name in @('command-log.ndjson','terminal.log','validation.json','dashboard.snapshot.json','dashboard.html','browser-dom.txt','browser-qa.html')){
            if([IO.File]::Exists((Join-Path $runEvidence.FullName $name))){
                $null=Invoke-LaunchGit -Arguments @('-C',$checkout,'add','-f','--',($relative+'/'+$name))
            }
        }
        $null=Invoke-LaunchGit -Arguments @('-C',$checkout,'commit','-m',("test(brain-dashboard): preserve $runId qualification evidence"))
        $evidenceCommit=(Invoke-LaunchGit -Arguments @('-C',$checkout,'rev-parse','HEAD')).Trim()
        # Fast-forward push only; a concurrent progress update must reject rather than overwrite.
        $null=Invoke-LaunchGit -Arguments @('-C',$checkout,'push','origin','HEAD:refs/heads/progress')
        Write-Host "[remote-evidence] Published only to refs/heads/progress: $evidenceCommit"
    }
    if($dashboardExit -ne 0){throw "Dashboard runner failed with exit $dashboardExit; evidence saved to $evidence"}
    if(-not [IO.File]::Exists($latest)){throw "Dashboard runner passed, but final report is missing: $latest"}
    $verdict='PASS'
}catch{
    $reason=$_.Exception.Message
    Write-Host "[BRAIN dashboard] FAIL: $reason" -ForegroundColor Red
}finally{
    try {
        if($branchBefore){$branchAfter=(Invoke-LaunchGit -Arguments @('-C',$repo,'symbolic-ref','--short','HEAD')).Trim()}
        if($headBefore){$headAfter=(Invoke-LaunchGit -Arguments @('-C',$repo,'rev-parse','HEAD')).Trim()}
        if(($branchBefore -and $branchAfter -cne $branchBefore) -or ($headBefore -and $headAfter -cne $headBefore)){
            $verdict='FAIL';$reason='Operator checkout branch/HEAD changed unexpectedly; manual investigation required.'
        }
    }catch{$verdict='FAIL';$reason="Unable to confirm operator checkout remained unchanged: $($_.Exception.Message)"}
    try{
        $result=[ordered]@{runId=$runId;verdict=$verdict;reason=$reason;operatorBranchBefore=$branchBefore;operatorBranchAfter=$branchAfter;
            operatorHeadBefore=$headBefore;operatorHeadAfter=$headAfter;dashboardSourceBranch='progress';dashboardSourceHead=$progressSha;
            dashboardExit=$dashboardExit;latest=$latest;localEvidence=$evidence;persistEvidence=[bool]$PersistEvidence;evidenceCommit=$evidenceCommit;
            exitCode=$(if($verdict -eq 'PASS'){0}else{1})}
        [IO.File]::WriteAllText((Join-Path $evidence 'launcher-result.json'),((ConvertTo-Json -InputObject $result -Depth 10)+"`n"),$encoding)
    }catch{}
    if($started){try{Stop-Transcript|Out-Null}catch{}}
    if($verdict -eq 'PASS' -and -not $KeepTemporaryCheckout){
        try{Remove-Item -LiteralPath $checkout -Recurse -Force -ErrorAction Stop}catch{Write-Warning "Temporary clone cleanup failed: $($_.Exception.Message)"}
    }elseif([IO.Directory]::Exists($checkout)){
        Write-Host "[recovery] Keeping isolated progress checkout for diagnosis: $checkout"
    }
    Write-Host ''
    @([pscustomobject]@{OperatorBranch=$branchBefore;ModuleBranch='progress';Verdict=$verdict;Dashboard=$latest;Evidence=$evidence;
        PublishedCommit=$evidenceCommit;Exit=$(if($verdict -eq 'PASS'){0}else{1})})|Format-Table -AutoSize -Wrap|Out-Host
}
if($verdict -ne 'PASS'){exit 1};exit 0