#requires -Version 7.0
# Offline regression tests and optional native Microsoft Edge browser QA.
[CmdletBinding()]
param(
    [switch]$CoreOnly,
    [string]$BrowserHtmlPath='',
    [string]$EvidenceDirectory='',
    [string]$EdgeExecutable=''
)
Set-StrictMode -Version Latest
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'Dashboard.BrainCore.ps1')
$exitCode=0;$reason=''
try {
    $sample=@'
schema_version: 1
project: "woodpk/gdrive-sync-obsidian-plugin"
active_workstream: "WS-07-brain-verification-platform"
dec339_ws02_bu04_hint_visibility_2026_11_20:
  status: "BU04_F01_RESOLVED_INDEPENDENTLY_ACCEPTED_BUILDER_CLOSED;FULL_WS02_GATE_INCOMPLETE"
  branch: "build/dec339-ws02-bu04-local-hint-visibility-barrier-20261120"
  qualified_source_sha: "8850dab0970862783f4a7e5beb4f214b83dd4acc"
dec339_ws02_bu07_scope_owner_2026_11_23:
  status: "BUILDER_SOURCE_AND_TESTS_COMMITTED;REVIEW_PENDING"
  branch: "build/dec339-ws02-bu07-scope-owner-local-hint-integration-20261123"
dec362_stable_remote_identity_correction_2026_11_18:
  status: "FEATURE_CLOSED;SOFTWARE_ACCEPTED_WITH_MINOR_FINDINGS;DEC363_OWNER_RISK_RECONCILED"
  builder_branch: "fix/dec362-stable-drive-id-content-update-20261118"
'@
    $state=ConvertFrom-BrainStateText $sample
    Assert-Brain ($state['project'] -eq 'woodpk/gdrive-sync-obsidian-plugin') 'YAML project identity parser failed.'
    Assert-Brain ($state['dec339_ws02_bu04_hint_visibility_2026_11_20']['qualified_source_sha'] -eq '8850dab0970862783f4a7e5beb4f214b83dd4acc') 'Nested source SHA parser failed.'
    Assert-Brain ((Get-BrainFeatureId 'dec339_ws02_bu04_hint_visibility_2026_11_20' $state['dec339_ws02_bu04_hint_visibility_2026_11_20']) -eq 'WS-02/BU-04') 'Feature ID mapping incorrect.'
    Assert-Brain ((Get-BrainFeatureId 'dec362_stable_remote_identity_correction_2026_11_18' $state['dec362_stable_remote_identity_correction_2026_11_18']) -eq 'WS-05/DEC362') 'DEC-362 ownership mapping incorrect.'
    Assert-Brain ((Get-BrainFeatureStatus $state['dec339_ws02_bu04_hint_visibility_2026_11_20']) -eq 'accepted') 'Historical F-01 not superseded by accepted R2 status.'
    Assert-Brain ((Get-BrainFeatureStatus $state['dec339_ws02_bu07_scope_owner_2026_11_23']) -eq 'active') 'Review pending should remain active, not accepted.'
    Assert-Brain ((Get-BrainFeatureStatus $state['dec362_stable_remote_identity_correction_2026_11_18']) -eq 'accepted') 'Accepted DEC-362 not recognized.'
    Assert-Brain ((Get-BrainFeatureStatus @{status='PHXCI_PASS_REVIEW_PENDING'}) -ne 'accepted') 'Passing PHX-CI incorrectly considered independent acceptance.'
    Assert-Brain ((Get-BrainFeatureStatus @{status='CORRECTION_REQUIRED'}) -eq 'blocked') 'Real review rejection must be blocked.'
    Assert-Brain ((Get-BrainFeatureStatus @{status='REVIEW_PENDING'}) -ne 'accepted') 'Review pending is not accepted.'
    $dummy='<!doctype html><body><script id="project-snapshot">__PROJECT_SNAPSHOT_JSON__</script></body>'
    $out=New-BrainDashboardHtml $dummy '{"x":"<\/script>"}'
    Assert-Brain (-not $out.Contains('__PROJECT_SNAPSHOT_JSON__')) 'Snapshot marker replacement failed.'
    Assert-Brain ($out.Contains('"x"')) 'JSON packet binding lost.'
    $bad=$false
    try{$null=New-BrainDashboardHtml ($dummy+$dummy) '{"ok":true}'}catch{$bad=$true}
    Assert-Brain $bad 'Duplicate template markers should be rejected.'
    Write-Host '[self-test] PASS — YAML parser, feature identity, acceptance separation, bounded status, HTML injection'
    if(-not $BrowserHtmlPath -or $CoreOnly){exit 0}
    $htmlFull=[IO.Path]::GetFullPath($BrowserHtmlPath)
    Assert-Brain ([IO.File]::Exists($htmlFull)) "Browser HTML missing: $htmlFull"
    if(-not $EvidenceDirectory){$EvidenceDirectory=[IO.Path]::GetDirectoryName($htmlFull)}
    [IO.Directory]::CreateDirectory($EvidenceDirectory)|Out-Null
    if(-not $EdgeExecutable) {
        $candidates=@(
            $(if($env:ProgramFiles){Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe'}),
            $(if(${env:ProgramFiles(x86)}){Join-Path ${env:ProgramFiles(x86)} 'Microsoft/Edge/Application/msedge.exe'}),
            $(if($env:LOCALAPPDATA){Join-Path $env:LOCALAPPDATA 'Microsoft/Edge/Application/msedge.exe'})
        )|Where-Object {$_ -and [IO.File]::Exists($_)}
        $EdgeExecutable=@($candidates)[0]
    }
    Assert-Brain ($EdgeExecutable -and [IO.File]::Exists($EdgeExecutable)) 'Requested browser QA requires installed Microsoft Edge.'
    $original=[IO.File]::ReadAllText($htmlFull)
    $qa=@'
<script id="brain-dashboard-local-qa">
setTimeout(()=>{const out=document.createElement('output');out.id='brain-qa-result';
try {
 const a=(check,message)=>{if(!check)throw Error(message);};
 a(document.querySelectorAll('.tab').length===2,'DCM-derived two-tab layout missing');
 a(!!document.querySelector('.hero'),'Work hierarchy/active-unit hero missing');
 a(!!document.querySelector('[data-tree]'),'Work hierarchy tree missing');
 a(!!document.querySelector('.purpose-box'),'Active unit explanation missing');
 const tabs=[...document.querySelectorAll('.tab')];tabs[1].click();
 a(!!document.querySelector('.metrics'),'Performance metrics missing');
 tabs[0].click();a(!!document.querySelector('.hero'),'Cannot navigate back to work hierarchy');
 const data=JSON.parse(document.getElementById('project-snapshot').textContent);
 a(data.project.repository==='woodpk/gdrive-sync-obsidian-plugin','Wrong repository identity');
 a(data.workstreams.length===7,'Wrong BRAIN workstream count');
 out.textContent='PASS: two tabs, hierarchy, purpose, performance, source binding, navigation';
}catch(e){out.textContent='FAIL: '+e.message;}document.body.append(out);},300);
</script>
'@
    Assert-Brain ($original.Contains('</body>')) 'Malformed HTML: no body closing tag.'
    $qaPath=Join-Path $EvidenceDirectory 'browser-qa.html'
    [IO.File]::WriteAllText($qaPath,$original.Replace('</body>',$qa+'</body>'),[Text.UTF8Encoding]::new($false))
    $uri=([Uri]::new([IO.Path]::GetFullPath($qaPath))).AbsoluteUri
    $profile=Join-Path $EvidenceDirectory 'edge-isolated-profile'
    $args=@('--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--virtual-time-budget=2200','--dump-dom',('--user-data-dir='+$profile),$uri)
    $lines=@(& $EdgeExecutable @args 2>&1);$code=$LASTEXITCODE
    $result=($lines|ForEach-Object {[string]$_}) -join "`n"
    [IO.File]::WriteAllText((Join-Path $EvidenceDirectory 'browser-dom.txt'),$result,[Text.UTF8Encoding]::new($false))
    Assert-Brain ($code -eq 0) "Microsoft Edge returned native exit $code."
    Assert-Brain ($result.Contains('PASS: two tabs, hierarchy, purpose, performance, source binding, navigation')) 'Interactive browser QA did not pass.'
    Write-Host '[browser-qa] PASS — headless Edge exercised navigation and source-bound content.'
}catch{$reason=$_.Exception.Message;$exitCode=1;Write-Host "[self-test/browser-qa] FAIL: $reason" -ForegroundColor Red}
Write-Host ("[test-summary] verdict="+$(if($exitCode -eq 0){'PASS'}else{'FAIL'})+" exit=$exitCode")
exit $exitCode