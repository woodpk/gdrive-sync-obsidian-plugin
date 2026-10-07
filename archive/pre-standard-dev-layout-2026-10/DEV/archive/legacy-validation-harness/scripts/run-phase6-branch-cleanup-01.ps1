[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Repo = "woodpk/gdrive-sync-obsidian-plugin"
$ContinuationBase = "81320ccad480b31222a9ab572c03cbdf162f4663"
$MasterSha = "b1b3a4bd70cd14be49ae9085a8305f5825fccf4f"
$Vh22Sha = "54afee918f9f55ea828ce507b8acadcd780f6ff7"
$FrameworkSha = "60688ea1b09f181c089ac04e33c39b3090dc9605"
$Evidence = "dev/evidence/_ca-output-agt-ca-p6-branch-consolidation-cleanup-01.md"

$Frozen = [ordered]@{
"archive/phase6-legacy-history"="3bf5aa979c3c60f81f6bc35a013207f2ccf18c64"
"ci-3-phx-ci-obsidian-pilot"="67a37b1743fd046ac95791fd33486378606f8622"
"ci-4-split-verification-status"="00627e6e6f3d670bbf6555303b451a69d9faf4ad"
"phase6-vh14-module-integration-runner"="8c3d6e79db0d7dcf882d0a66a9bbd8b39bc3a30b"
"phase6-vh15-r2-promotion-tooling"="11933c2951c28c97e0a900e66c369bfb98bbbb09"
"phase6-vh15-r2-run-scoped-plan-handoff"="fbe9dfca58840e49ebcb3a14b97d4c569770cf6e"
"phase6-vh15-r3-runtime-derived-plan-identity-binding"="a3e222379b52bfce38682f4059445a3a6c8dac1b"
"phase6-vh15-validation-mode-runtime-canary"="fbe9dfca58840e49ebcb3a14b97d4c569770cf6e"
"phase6-vh16-c03-scenario"="90e6e0ad6121e32e426828126840ebaeb2a24cb7"
"phase6-vh16-c03-scenario-correction-01"="6f9b5a0225c5bce5c07bedb7904edca39035f242"
"phase6-vh17-c04-scenario"="b01275262e97cfa66ac9e38844e3b4af77877167"
"phase6-vh17-c04-scenario-correction-01"="68ce67099c18e3f8830d4efebb144706471a7814"
"phase6-vh18-c05-scenario"="dce455831e430ef1a24377372863ef2d1ad54f6a"
"phase6-vh18-c05-scenario-correction-01"="70ba6d6bf0da537b630e8642d84823daeeb624f5"
"phase6-vh19-c06-scenario"="c69342b4ac4a9cdc000a75cd39e97aca5af36ca6"
"phase6-vh19-c06-scenario-correction-01"="fb983f9a67523b625998df7bf5a6dba870e5bb47"
"phase6-vh20-c07-scenario"="98d7507baab230f4dfd4caeea3a6e67198b66bfe"
"phase6-vh20-c07-scenario-correction-01"="ffeedf1cbfd334381e2316a8326c6daaa5e03bf8"
"phase6-vh21-c08-scenario"="b281c74f05094e15410d22cfbcf878f0d9495e1f"
"phase6-vh21-c08-scenario-correction-01"="6aafd865a37f55d87b5a57c03d53c0f847363a94"
"phase6-vh22-c09-scenario"="49f31d6e3c6661b8a1a05922ed5f8b4514b835fc"
"phase6-vh22-c09-scenario-correction-01"="cbd8946ef6defc20ab3286e4f540877c16c606fc"
"phase6-vh22-c09-scenario-correction-02"="5c33bb4e982fe2a211e48e3c082f2e01ce357368"
"phase6-vh22-repository-suite-blocker-repair-01"="f94cadc247230164a5a5bac3aaef4111b2ea5b8f"
"temp-vh21-c08-focused-verification-01"="bf636fc603a5410f709b7ad2821400a1d78ef896"
"tmp-vh22-c09-correction-focused-verification"="770ee083b048cdbc705c7fb7cd787f6050ad79f5"
"tmp-vh22-c09-focused-verification"="0c2d5d3bf640a7d6ff232b20ded884a715020aa7"
}
$DeleteOrder = @(
"temp-vh21-c08-focused-verification-01","tmp-vh22-c09-correction-focused-verification","tmp-vh22-c09-focused-verification",
"phase6-vh16-c03-scenario","phase6-vh17-c04-scenario","phase6-vh18-c05-scenario","phase6-vh19-c06-scenario","phase6-vh20-c07-scenario","phase6-vh21-c08-scenario","phase6-vh22-c09-scenario","phase6-vh22-c09-scenario-correction-01",
"phase6-vh16-c03-scenario-correction-01","phase6-vh17-c04-scenario-correction-01","phase6-vh18-c05-scenario-correction-01","phase6-vh19-c06-scenario-correction-01","phase6-vh20-c07-scenario-correction-01","phase6-vh21-c08-scenario-correction-01",
"phase6-vh14-module-integration-runner","phase6-vh15-r2-promotion-tooling","phase6-vh15-r2-run-scoped-plan-handoff","phase6-vh15-r3-runtime-derived-plan-identity-binding","phase6-vh15-validation-mode-runtime-canary","phase6-vh22-c09-scenario-correction-02","phase6-vh22-repository-suite-blocker-repair-01",
"ci-4-split-verification-status","ci-3-phx-ci-obsidian-pilot","archive/phase6-legacy-history"
)

$Root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..")).TrimEnd("\","/")
function Git([string[]]$a,[switch]$AllowFail) {
    $o=@(& git.exe -C $Root @a 2>&1); $c=$LASTEXITCODE; $t=($o -join "`n").Trim()
    if(!$AllowFail -and $c -ne 0){throw "git $($a -join ' ') failed (exit $c).`n$t"}
    [pscustomobject]@{Code=$c;Text=$t}
}
$GhPath=(Get-Command gh.exe -ErrorAction SilentlyContinue)
if(!$GhPath){$GhPath=(Get-Command gh -ErrorAction SilentlyContinue)}
function Gh([string[]]$a,[switch]$AllowFail) {
    if(!$script:GhExe){throw "GitHub CLI (gh) is not available on PATH."}
    $o=@(& $script:GhExe @a 2>&1); $c=$LASTEXITCODE; $t=($o -join "`n").Trim()
    if(!$AllowFail -and $c -ne 0){throw "gh $($a -join ' ') failed (exit $c).`n$t"}
    [pscustomobject]@{Code=$c;Text=$t}
}
if($GhPath){$script:GhExe=$GhPath.Source}

function Branches {
    $m=[ordered]@{}
    foreach($l in ((Git @("ls-remote","--heads","origin")).Text -split "`n")){
        if(!$l){continue}; if($l -notmatch '^([0-9a-f]{40})\s+refs/heads/(.+)$'){throw "Bad branch ref: $l"}
        $m[$Matches[2]]=$Matches[1]
    }; $m
}
function TagSha([string]$tag){
    $x=(Git @("ls-remote","--tags","origin","refs/tags/$tag")).Text
    if(!$x){return $null}; if($x -notmatch '^([0-9a-f]{40})\s+refs/tags/.+$'){throw "Bad tag ref: $x"}; $Matches[1]
}
function OpenPrHeads {
    $x=(Gh @("pr","list","--repo",$Repo,"--state","open","--limit","100","--json","headRefName,number,url")).Text
    if(!$x){return @()}; @($x|ConvertFrom-Json)
}
function NoRetiringPrs {
    $bad=@(OpenPrHeads|Where-Object{$Frozen.Contains([string]$_.headRefName)})
    if($bad.Count){
        $details=@($bad|ForEach-Object{"#$($_.number) $($_.headRefName)"})
        throw "Open PR uses retiring branch: $($details -join ', ')"
    }
}
function Ancestor([string]$a,[string]$d,[string]$what){
    if((Git @("merge-base","--is-ancestor",$a,$d) -AllowFail).Code -ne 0){throw "$what ancestry failed: $a -> $d"}
}
function VerifyAllTags {
    foreach($e in $Frozen.GetEnumerator()){
        $tag="archive/branch-cleanup-20260920/$($e.Key)"; $actual=TagSha $tag
        if($actual -ne $e.Value){throw "Tag mismatch $tag expected $($e.Value) actual '$actual'"}
    }
}
function VerifyStageA([string]$prep){
    $allowed=@(".gitignore","dev/scripts/run-phx-ci.ps1","dev/test-results/.gitkeep","dev/archive/phase6-legacy-history.md","dev/scripts/run-phase6-branch-cleanup-01.ps1","dev/evidence/_ca-output-agt-ca-p6-branch-consolidation-cleanup-01.md")
    $delta=@((Git @("diff","--name-only","$ContinuationBase..$prep")).Text -split "`n"|Where-Object{$_})
    $bad=@($delta|Where-Object{$_ -notin $allowed}); if($bad.Count){throw "Unauthorized Stage A path(s): $($bad -join ', ')"}
    if(@($delta|Where-Object{$_ -like "src/*" -or $_ -like "test/*"}).Count){throw "Stage A modified product source/tests."}
    $bridge=(Git @("show","${prep}:dev/scripts/run-phx-ci.ps1")).Text
    if($bridge -notmatch [regex]::Escape($FrameworkSha)){throw "PHX-CI pin missing."}
    if($bridge -match 'ci-3-phx-ci-obsidian-pilot|ci-4-split-verification-status'){throw "Core bridge depends on retiring CI branch."}
    if((Git @("show","${prep}:.gitignore")).Text -notmatch '(?m)^\.phx-ci/$'){throw ".phx-ci/ ignore missing."}
    if((Git @("show","${prep}:dev/archive/phase6-legacy-history.md")).Text -notmatch 'archive/branch-cleanup-20260920/archive/phase6-legacy-history'){throw "Archive retirement note missing."}
    if((Git @("cat-file","-e","${prep}:Taskfile.yml") -AllowFail).Code -eq 0){throw "Pilot Taskfile.yml must not be migrated."}
}
function CompleteEvidence([string]$prep,[hashtable]$tags,[hashtable]$deletes,[string[]]$final){
    $rows=@(); foreach($e in $Frozen.GetEnumerator()){
        $n=[string]$e.Key;$s=[string]$e.Value;$t="archive/branch-cleanup-20260920/$n"
        $rows+="| ``$n`` | ``$s`` | ``$t`` | $($tags[$n]) | $($deletes[$n]) |"
    }
    $lines=@("STATUS: COMPLETE","","# Phase 6 Branch Consolidation / Cleanup 01","","## Retained branches","","- ``master``: ``$MasterSha``","- ``phase6-integration`` cleanup-preparation head: ``$prep``","- Final integration advances only by this evidence-only commit.","","## Retired branches and preservation","","| Branch | Frozen SHA | Preservation tag | Tag verification | Deletion result |","|---|---|---|---|---|")+$rows+@("","## Final remote state","","- Final branch count: $($final.Count)","- Final branches: $($final -join ', ')","- ``master`` unchanged: PASS","- Approved VH22 promotion remains in integration ancestry: PASS","- No open PR references a retired head: PASS","","## Infrastructure","","- CI migration: PASS — permanent ``dev/scripts/run-phx-ci.ps1`` is on integration.","- PHX-CI pin: ``$FrameworkSha``.","- Pilot ``Taskfile.yml``: NOT MIGRATED.","- Stale VH22 runner/promotion tooling: NOT MIGRATED.","- Archive manifest migration/retirement note: PASS.","- Product ``src/**`` changes: NONE.","- Product ``test/**`` changes: NONE.","- GitHub Actions used: NO.","","- Preservation tags verified before deletion: PASS (27/27).","- Retiring branches deleted/verified absent: PASS (27/27).","- Final verdict: COMPLETE")
    $path=Join-Path $Root ($Evidence.Replace("/",[IO.Path]::DirectorySeparatorChar))
    $lines|Set-Content -LiteralPath $path -Encoding utf8NoBOM
    Git @("add","--",$Evidence)|Out-Null
    $staged=(Git @("diff","--cached","--name-only")).Text
    if($staged.Trim() -ne $Evidence){throw "Unexpected staged path(s): $staged"}
    Git @("commit","-m","docs(evidence): complete Phase 6 branch cleanup")|Out-Null
    $commit=(Git @("rev-parse","HEAD")).Text
    Git @("fetch","origin","--prune","--tags")|Out-Null
    $remote=(Git @("rev-parse","origin/phase6-integration")).Text
    if($remote -ne $prep){throw "integration advanced before evidence push: expected $prep actual $remote"}
    Git @("push","origin","HEAD:refs/heads/phase6-integration")|Out-Null
    if((Git @("ls-remote","--heads","origin","refs/heads/phase6-integration")).Text -notmatch "^$commit\s"){throw "Evidence push verification failed."}
    Write-Host "Final evidence pushed: $commit" -ForegroundColor Green
}

if(!(Test-Path (Join-Path $Root ".git"))){throw "Repository root not found from script location: $Root"}
if($DeleteOrder.Count -ne 27 -or $Frozen.Count -ne 27){throw "Frozen map/deletion order count must be 27."}
if((@($DeleteOrder|Sort-Object -Unique)).Count -ne 27){throw "Deletion order contains duplicates."}
foreach($n in $DeleteOrder){if(!$Frozen.Contains($n)){throw "Deletion order contains unknown branch $n"}}

$origin=(Git @("remote","get-url","origin")).Text
if($origin -notmatch '(?i)(?:github\.com[/:])woodpk/gdrive-sync-obsidian-plugin(?:\.git)?$'){throw "Unexpected origin: $origin"}
$dirty=(Git @("status","--porcelain=v1","--untracked-files=no")).Text
if($dirty){throw "Tracked/index state must be clean.`n$dirty"}
if(!$script:GhExe){throw "GitHub CLI (gh) is not available on PATH."}

Git @("fetch","origin","--prune","--tags")|Out-Null
$auth=Gh @("auth","status") -AllowFail; if($auth.Code){throw "GitHub authentication unavailable.`n$($auth.Text)"}
$rv=Gh @("repo","view",$Repo,"--json","nameWithOwner,defaultBranchRef") -AllowFail
if($rv.Code){throw "Authenticated GitHub read failed.`n$($rv.Text)"}
$rm=$rv.Text|ConvertFrom-Json
if($rm.nameWithOwner -ne $Repo -or $rm.defaultBranchRef.name -ne "master"){throw "Repository/default-branch mismatch."}

$current=(Git @("branch","--show-current")).Text
if($DryRun){
    Write-Host "DRY RUN: no local branch switch/fast-forward, tag creation, branch deletion, evidence write, commit, or push will occur." -ForegroundColor Yellow
}else{
    if($current -ne "phase6-integration"){
        Git @("switch","phase6-integration")|Out-Null
    }
    Git @("merge","--ff-only","origin/phase6-integration")|Out-Null
    if((Git @("status","--porcelain=v1","--untracked-files=no")).Text){throw "Tracked/index state not clean after integration fast-forward."}
}

NoRetiringPrs
$b=Branches
if(!$b.Contains("master") -or $b["master"] -ne $MasterSha){throw "master drift."}
if(!$b.Contains("phase6-integration")){throw "phase6-integration missing."}
$integrationHead=[string]$b["phase6-integration"]
if(!$DryRun -and (Git @("rev-parse","HEAD")).Text -ne $integrationHead){throw "Local phase6-integration is not at the remote integration head."}
$prep=(Git @("log","-1","--format=%H","origin/phase6-integration","--","dev/scripts/run-phase6-branch-cleanup-01.ps1")).Text
if(!$prep){throw "Cleanup preparation commit containing this executor could not be resolved."}
Ancestor $Vh22Sha $integrationHead "VH22"
Ancestor $ContinuationBase $integrationHead "Continuation"
Ancestor $prep $integrationHead "Cleanup preparation"
VerifyStageA $prep

$tags=@{};$deletes=@{}
$names=@($b.Keys);$onlyTwo=($names.Count -eq 2 -and $b.Contains("master") -and $b.Contains("phase6-integration"))
$ev=(Git @("show","origin/phase6-integration:$Evidence") -AllowFail)
$evComplete=($ev.Code -eq 0 -and ($ev.Text -split "`n")[0].Trim() -eq "STATUS: COMPLETE")
if(!$onlyTwo -and $integrationHead -ne $prep){throw "integration advanced beyond cleanup preparation before destructive cleanup: prep $prep current $integrationHead"}
if($onlyTwo -and $integrationHead -ne $prep -and !$evComplete){throw "integration advanced beyond cleanup preparation without COMPLETE evidence: prep $prep current $integrationHead"}
if($onlyTwo){
    VerifyAllTags;NoRetiringPrs
    if($DryRun){
        Write-Host "DRY RUN PASS: repository already has exactly master and phase6-integration; all 27 preservation tags verify." -ForegroundColor Green
        if($evComplete){Write-Host "Existing cleanup evidence is COMPLETE." -ForegroundColor Green}
        else{Write-Host "Existing cleanup evidence is not COMPLETE; dry run will not modify it." -ForegroundColor Yellow}
        return
    }
    if($evComplete){Write-Host "Cleanup already COMPLETE and re-verified." -ForegroundColor Green;return}
    foreach($n in $Frozen.Keys){$tags[$n]="VERIFIED";$deletes[$n]="ALREADY DELETED / VERIFIED ABSENT"}
    CompleteEvidence $prep $tags $deletes @("master","phase6-integration");return
}

$missing=@()
foreach($e in $Frozen.GetEnumerator()){
    if(!$b.Contains($e.Key)){$missing+=$e.Key;continue}
    if($b[$e.Key] -ne $e.Value){throw "Retiring branch drift: $($e.Key) expected $($e.Value) actual $($b[$e.Key])"}
}
$extra=@($b.Keys|Where-Object{$_ -ne "master" -and $_ -ne "phase6-integration" -and !$Frozen.Contains($_)})
if($extra.Count){throw "Unexpected branch(es): $($extra -join ', ')"}
if($missing.Count){VerifyAllTags}

if($DryRun){
    Git @("fetch","origin","--prune","--tags")|Out-Null
    $b=Branches

    if(!$b.Contains("master") -or $b["master"] -ne $MasterSha){throw "master drift during dry-run recheck."}
    if(!$b.Contains("phase6-integration")){throw "phase6-integration missing during dry-run recheck."}
    if([string]$b["phase6-integration"] -ne $integrationHead){throw "phase6-integration changed during dry-run recheck."}

    foreach($e in $Frozen.GetEnumerator()){
        $n=[string]$e.Key;$sha=[string]$e.Value
        if($b.Contains($n) -and $b[$n] -ne $sha){throw "Retiring branch drift during dry-run recheck: $n expected $sha actual $($b[$n])"}
        if(!$b.Contains($n)){
            $rt=TagSha "archive/branch-cleanup-20260920/$n"
            if($rt -ne $sha){throw "Retiring branch $n is absent but its preservation tag is not verified at $sha."}
        }
    }

    $dryCreate=0;$dryExisting=0;$dryDelete=0;$dryAbsent=0
    Write-Host ""
    Write-Host "DRY RUN — preservation-tag plan" -ForegroundColor Cyan
    foreach($e in $Frozen.GetEnumerator()){
        $n=[string]$e.Key;$sha=[string]$e.Value;$tag="archive/branch-cleanup-20260920/$n";$rt=TagSha $tag
        if($rt){
            if($rt -ne $sha){throw "Existing remote tag mismatch $tag expected $sha actual $rt"}
            $dryExisting++
            Write-Host "  VERIFY EXISTING TAG  $tag -> $sha"
            continue
        }

        $lt=Git @("rev-parse","--verify","refs/tags/$tag") -AllowFail
        if($lt.Code -eq 0 -and $lt.Text -ne $sha){throw "Local tag mismatch $tag expected $sha actual $($lt.Text)"}
        $dryCreate++
        Write-Host "  WOULD CREATE TAG     $tag -> $sha"
    }

    NoRetiringPrs
    Write-Host ""
    Write-Host "DRY RUN — remote-branch deletion plan" -ForegroundColor Cyan
    foreach($n in $DeleteOrder){
        if($b.Contains($n)){
            if($b[$n] -ne $Frozen[$n]){throw "Branch drift before dry-run deletion simulation $n"}
            $dryDelete++
            Write-Host "  WOULD DELETE BRANCH  $n @ $($Frozen[$n])"
        }else{
            $dryAbsent++
            Write-Host "  ALREADY ABSENT       $n"
        }
    }

    $survivors=@($b.Keys|Where-Object{$_ -eq "master" -or $_ -eq "phase6-integration"}|Sort-Object)
    $unexpected=@($b.Keys|Where-Object{$_ -ne "master" -and $_ -ne "phase6-integration" -and !$Frozen.Contains($_)})
    if($unexpected.Count){throw "Unexpected branch(es) during dry-run simulation: $($unexpected -join ', ')"}
    if($survivors.Count -ne 2 -or $survivors[0] -ne "master" -or $survivors[1] -ne "phase6-integration"){throw "Dry-run retained-branch simulation failed."}

    Write-Host ""
    Write-Host "DRY RUN PASS — no repository or remote mutations performed." -ForegroundColor Green
    Write-Host "  Preservation tags: would create $dryCreate; already verified $dryExisting; total 27."
    Write-Host "  Retiring branches: would delete $dryDelete; already absent $dryAbsent; total 27."
    Write-Host "  Expected final remote branches after real execution: master, phase6-integration."
    Write-Host "Run without -DryRun only after reviewing this plan."
    return
}

Git @("fetch","origin","--prune","--tags")|Out-Null
$b=Branches
if(!$missing.Count){
    foreach($e in $Frozen.GetEnumerator()){if(!$b.Contains($e.Key) -or $b[$e.Key] -ne $e.Value){throw "Branch changed immediately before tagging: $($e.Key)"}}
    foreach($e in $Frozen.GetEnumerator()){
        $n=[string]$e.Key;$sha=[string]$e.Value;$tag="archive/branch-cleanup-20260920/$n";$rt=TagSha $tag
        if($rt){if($rt -ne $sha){throw "Existing tag mismatch $tag"};$tags[$n]="VERIFIED (pre-existing)";continue}
        $lt=Git @("rev-parse","--verify","refs/tags/$tag") -AllowFail
        if($lt.Code -eq 0 -and $lt.Text -ne $sha){throw "Local tag mismatch $tag"}
        if($lt.Code -ne 0){Git @("tag",$tag,$sha)|Out-Null}
        Git @("push","origin","refs/tags/${tag}:refs/tags/${tag}")|Out-Null
        if((TagSha $tag) -ne $sha){throw "Remote tag verification failed $tag"}
        $tags[$n]="CREATED / VERIFIED"
    }
    VerifyAllTags
}else{
    foreach($n in $Frozen.Keys){$tags[$n]="VERIFIED (resume)"}
}

VerifyAllTags;NoRetiringPrs
foreach($n in $DeleteOrder){
    $now=Branches
    if(!$now.Contains($n)){$deletes[$n]="ALREADY DELETED / VERIFIED ABSENT";continue}
    if($now[$n] -ne $Frozen[$n]){throw "Branch drift before deletion $n"}
    Git @("push","origin","--delete",$n)|Out-Null
    if((Branches).Contains($n)){throw "Deletion verification failed $n"}
    $deletes[$n]="DELETED / VERIFIED ABSENT"
}

Git @("fetch","origin","--prune","--tags")|Out-Null
$f=Branches;$final=@($f.Keys|Sort-Object)
if($final.Count -ne 2 -or $final[0] -ne "master" -or $final[1] -ne "phase6-integration"){throw "Final branch gate failed: $($final -join ', ')"}
if($f["master"] -ne $MasterSha){throw "master changed during cleanup."}
VerifyAllTags;NoRetiringPrs
Ancestor $Vh22Sha $f["phase6-integration"] "Final VH22"
Ancestor $prep $f["phase6-integration"] "Preparation"
CompleteEvidence $prep $tags $deletes $final

Write-Host "PHASE 6 BRANCH CONSOLIDATION CLEANUP 01 LOCAL EXECUTION COMPLETE" -ForegroundColor Green
Write-Host "Return to ChatGPT for independent remote verification."
