#requires -Version 7.0
# BRAIN source-bound dashboard extraction. Reporting only: no approvals or product mutation.
Set-StrictMode -Version Latest
$script:BrainRepository = 'woodpk/gdrive-sync-obsidian-plugin'
$script:BrainWorkstreams = [ordered]@{
    'WS-01'='Repository Foundation and Frozen Shared Contracts'
    'WS-02'='Core Synchronization Semantics and Durable State'
    'WS-03'='Google Drive and OAuth Boundary'
    'WS-04'='Obsidian Local, Platform, and Configuration Boundary'
    'WS-05'='Integrated Synchronization Product and User Workflows'
    'WS-06'='Cross-Platform Hardening and Stage 3 Readiness'
    'WS-07'='BRAIN Verification Platform'
}
$script:BrainDescriptions = @{
    'WS-02/BU-01'=@('IndexedDB connection and schema upgrade','Preserve old trusted synchronization state while introducing v2 inventory storage.','Safe v1-to-v2 upgrade without destructive reset, orphaned durable intent, or cursor loss.','Software-only upgrade qualification; live schema migration and physical testing remain gated.')
    'WS-02/BU-02'=@('V2-aware legacy cursor interoperability','Legacy runtime must remain safe against the upgraded database layout.','Preserve canonical cursor, BASE, backups and pending effects in the v2-aware adapter.','Does not authorize old v1-only rollback or real-device migration.')
    'WS-02/BU-03'=@('Local inventory lifecycle invalidation','Local metadata hints must never become trusted after a vault or scope change.','Invalidate advisory local rows during scope changes, resume, and vault lifecycle transitions.','Does not activate the new inventory planner in the shipping runtime.')
    'WS-02/BU-04'=@('Immediate stale-hint visibility barrier','A failed asynchronous invalidation must not reopen a stale metadata hint.','Fail closed until new complete enumeration and durable replacement establish fresh advisory readiness.','Coordinator-specific software proof; cross-WebView consumer wiring remains separate.')
    'WS-02/BU-05'=@('Cursor writer and backup-first recovery gates','Concurrent cursor writers and corrupted durable state must not silently overwrite trusted authority.','Qualify stale-writer refusal, correct recovery identity and backup-first restoration of trusted state.','Real cross-device integration and complete operational cutover remain separately gated.')
    'WS-02/BU-06'=@('Real browser multi-context IndexedDB upgrade and rollback','A live browser may hold multiple database contexts that block version changes.','Verify browser-backed upgrade, blocking, late completion, retry and v2-aware rollback behavior.','Software/browser-backed checks do not authorize a real vault or physical device migration.')
    'WS-02/BU-07'=@('Scope-owner and local-hint integration','Every local metadata consumer must honor the active scope and invalidation barriers.','Integrate effective policy ownership and local hint read safety without giving hints authority.','Local advisory integration does not authorize inventory planner cutover.')
    'WS-03/DEC339-RM'=@('Authenticated remote metadata transport','Reuse the paired Google Drive transport for verified metadata observations.','Provide read-only, account-bound metadata reads with exact identity and conservative partial-result handling.','No new OAuth scopes, live Drive writes, or inventory planner activation.')
    'WS-07/BVP-CLI'=@('BVP CLI result finalization','The verification platform must preserve exact run results and failure evidence.','Qualify the current BVP execution/output lifecycle and obtain source-bound review.','The BVP global pointer is a separate workstream and must not override newer DEC-339 feature-specific state.')
    'WS-05/DEC362'=@('Stable Drive ID content updates','Existing-file edits must preserve the established Google Drive object identity.','Implement same-ID updates and clean-merge propagation, with revision/content and recovery checks.','Accepted software feature only; physical provider proof and DEC-339 cutover are separate.')
}
function Assert-Brain([bool]$Condition,[string]$Message) { if(-not $Condition){throw $Message} }
function Get-BrainTextValue($Raw) {
    $t=([string]$Raw).Trim()
    if($t.Length -ge 2 -and (($t.StartsWith('"') -and $t.EndsWith('"')) -or ($t.StartsWith("'") -and $t.EndsWith("'")))) { return $t.Substring(1,$t.Length-2) }
    return $t
}
function ConvertFrom-BrainStateText {
    param([Parameter(Mandatory)][string]$Text)
    $out=[ordered]@{}; $current=''
    foreach($line in ($Text -split "`r?`n")) {
        if($line -match '^(?<key>[A-Za-z0-9_-]+):(?:\s+(?<value>.*))?\s*$') {
            $current=$Matches.key
            if($Matches.ContainsKey('value') -and -not [string]::IsNullOrWhiteSpace($Matches.value)) {
                $out[$current]=Get-BrainTextValue $Matches.value
                $current=''
            } else { $out[$current]=[ordered]@{} }
        } elseif($current -and $line -match '^  (?<key>[A-Za-z0-9_-]+):\s*(?<value>.*?)\s*$') {
            $out[$current][$Matches.key]=Get-BrainTextValue $Matches.value
        }
    }
    return $out
}
function Get-BrainSourceLink {
    param([string]$Commit,[string]$Path)
    if($Commit -notmatch '^[a-f0-9]{40}$' -or $Path -notmatch '^dev/[A-Za-z0-9_.\-/]+$' -or $Path -match '(^|/)\.\.(/|$)') { return '' }
    return "https://github.com/$script:BrainRepository/blob/$Commit/$Path"
}
function Get-BrainRefSource {
    param([string]$Commit,[string]$Path,[string]$Label)
    $u=Get-BrainSourceLink $Commit $Path
    return [ordered]@{label=$Label;path=$Path;url=$u}
}
function Get-BrainFeatureId {
    param([string]$Key,[System.Collections.IDictionary]$Fields)
    if($Key -eq 'brain_global_bvp_active') { return 'WS-07/BVP-CLI' }
    if($Key -match '^dec339_ws02_storage_upgrade_') { return 'WS-02/BU-01' }
    if($Key -match '^dec339_ws02_bu(?<num>\d{2})_') { return 'WS-02/BU-'+$Matches.num }
    if($Key -match '^dec339_ws03_remote_metadata_') { return 'WS-03/DEC339-RM' }
    if($Key -match '^dec362_') { return 'WS-05/DEC362' }
    if($Key -match '^dec339_ws(?<num>\d{2})_') { return 'WS-'+$Matches.num+'/DEC339-'+($Key -replace '^dec339_ws\d{2}_','' -replace '_\d{4}_\d{2}_\d{2}$','').ToUpperInvariant() }
    return ''
}
function Get-BrainFeatureStatus {
    param([System.Collections.IDictionary]$Fields)
    $s=[string]$Fields['status']
    $review=[string]$Fields['independent_review_verdict']
    if($s -match '(?i)(INDEPENDENTLY_ACCEPTED.*BUILDER_CLOSED|ACCEPTED_AND_BUILDER_CLOSED|ACCEPTED_CLOSED|FEATURE_CLOSED.*SOFTWARE_ACCEPTED|SOFTWARE_ACCEPTED_WITH_MINOR_FINDINGS)' -and $s -notmatch '(?i)NOT_ACCEPTED') {return 'accepted'}
    if($review -match '(?i)^PASS WITH MINOR FINDINGS|ACCEPTED' -and $s -match '(?i)CLOSED') {return 'accepted'}
    if($s -match '(?i)(CORRECTION_REQUIRED|FAILED|BLOCKED|REJECTED)' -and $s -notmatch '(?i)(SUPERSEDED|RESOLVED|HISTORICAL)') {return 'blocked'}
    if($s -match '(?i)(HANDOFF|REVIEW|QUALIFIED|PHXCI.*PASS|SOFTWARE.*PASS|VERIFIED)') {return 'active'}
    if($s -match '(?i)(BUILDER|SOURCE|TEST|IMPLEMENTED|AUTHORED|BUILD|IN_PROGRESS)') {return 'partial'}
    return 'planned'
}
function Get-BrainFeatureName([string]$Id,[string]$Key) {
    if($script:BrainDescriptions.ContainsKey($Id)) {return $script:BrainDescriptions[$Id][0]}
    return ((($Key -replace '^dec339_ws\d{2}_','') -replace '_\d{4}_\d{2}_\d{2}$','') -replace '_',' ')
}
function Get-BrainSelectedPlan([System.Collections.IDictionary]$Fields) {
    foreach($key in @('planning','planning_path','plan','review_assignment')) {
        $v=[string]$Fields[$key]
        if($v -match '^dev/planning/[A-Za-z0-9_./-]+\.md$' -and $v -notmatch '(^|/)\.\.(/|$)') { return $v }
    }
    return ''
}
function Get-BrainLatestEvidence {
    param([Parameter(Mandatory)][string]$Checkout,[Parameter(Mandatory)][string]$Commit,[System.Collections.IDictionary]$Fields)
    $ids=New-Object System.Collections.Generic.List[string]
    foreach($key in @($Fields.Keys)) {
        if($key -match '(?i)(phxci|verification).*(run_id)$' -or $key -match '(?i)^phxci_run_id$') {
            $v=[string]$Fields[$key];if($v -match '^[a-f0-9]{8}-[a-f0-9-]{27,}$' -and -not $ids.Contains($v)){$ids.Add($v)}
        }
    }
    $results=New-Object System.Collections.Generic.List[object]
    foreach($id in $ids) {
        $path="dev/test-results/$id/result.json"
        try {
            $raw=Invoke-BrainGit -Arguments @('-C',$Checkout,'show',("${Commit}:$path")) -Quiet
            $result=$raw | ConvertFrom-Json -AsHashtable -Depth 70 -ErrorAction Stop
            $date=[datetimeoffset]::MinValue
            try {$date=[datetimeoffset]::Parse([string]$result['endedAt'])}catch{}
            $stages=@($result['stages']);$focused=$stages|Where-Object { $_['name'] -eq 'test-focused' }|Select-Object -First 1
            $full=$stages|Where-Object { $_['name'] -eq 'test' }|Select-Object -First 1
            $focusOutput=if($null -ne $focused){[string]$focused['stdout']}else{''}
            $fullOutput=if($null -ne $full){[string]$full['stdout']}else{''}
            $matchF=[regex]::Match($focusOutput,'(?m)^# pass\s+(\d+)')
            $matchT=[regex]::Match($fullOutput,'(?m)^# pass\s+(\d+)')
            $matchX=[regex]::Match($fullOutput,'(?m)^# fail\s+(\d+)')
            $nF=$null;$nT=$null;$nX=$null
            if($matchF.Success){$nF=[int]$matchF.Groups[1].Value}
            if($matchT.Success){$nT=[int]$matchT.Groups[1].Value}
            if($matchX.Success){$nX=[int]$matchX.Groups[1].Value}
            $results.Add([pscustomobject]@{id=$id;path=$path;date=$date;pass=($result['overallVerificationResult'] -eq 'PASS');source=[string]$result['repository']['verifiedHead'];focused=$nF;product=$nT;fail=$nX;count=@($stages|Where-Object {$_.result -eq 'PASS'}).Count;total=$stages.Count})
        } catch {
            # A state value without an accessible immutable result is not positive verification proof.
            Write-Host "[evidence] Unavailable run $id (not counted as passed): $($_.Exception.Message)"
        }
    }
    return @($results|Sort-Object date -Descending)
}
function New-BrainSnapshot {
    param([Parameter(Mandatory)][string]$Checkout,[Parameter(Mandatory)][string]$MasterSha,[Parameter(Mandatory)]$Features,[bool]$BaselineAccepted=$false)
    $units=New-Object System.Collections.Generic.List[object]
    $catalog=New-Object System.Collections.Generic.List[object]
    $workstreams=New-Object System.Collections.Generic.List[object]
    $provenance=New-Object System.Collections.Generic.List[object]
    $ids=New-Object 'System.Collections.Generic.HashSet[string]'
    foreach($f in @($Features)) {
        $id=Get-BrainFeatureId $f.key $f.fields
        if(-not $id -or -not $ids.Add($id)) {continue}
        $ws=$id.Split('/')[0]
        if(-not $script:BrainWorkstreams.Contains($ws)) {continue}
        $status=Get-BrainFeatureStatus $f.fields
        $pretty=Get-BrainFeatureName $id $f.key
        $desc=$script:BrainDescriptions[$id]
        $plan=Get-BrainSelectedPlan $f.fields
        $sourcePath=if($plan){$plan}else{'dev/state/current-state.yaml'}
        $scope=[string]$f.fields['scope'];if(-not $scope){$scope=[string]$f.fields['status']}
        $purpose=if($desc){$desc[0]+'. '+$desc[1]}else{"Inspect the source plan for $pretty; do not assume undocumented implementation scope."}
        $why=if($desc){$desc[1]}else{'The acceptance record identifies this unit but does not provide a separate human-oriented rationale.'}
        $result=if($desc){$desc[2]}else{'Satisfy the source plan and independent review requirements without claiming unstated behavior.'}
        $boundary=if($desc){$desc[3]}else{'This bounded unit does not, by itself, authorize merge, migration, activation or release.'}
        $evidence=Get-BrainLatestEvidence $Checkout $f.sha $f.fields
        $latest=@($evidence)|Select-Object -First 1
        $detail="Source state: $([string]$f.fields['status']). Source branch: $($f.branch). Scope: $scope"
        $src=Get-BrainRefSource $f.sha $sourcePath 'Original build-unit plan or source state'
        $stateRef=Get-BrainRefSource $f.sha 'dev/state/current-state.yaml' 'Pinned repository progress state'
        $unit=[ordered]@{id=$id;name=$pretty;parentId=$ws;nodeType='major_unit';nodeTypeLabel='BRAIN Build Unit / accepted feature';status=$status;displayStatus=$status;
             purpose=$purpose;whyItMatters=$why;expectedResult=$result;scopeBoundary=$boundary;detail=$detail;displayReason='';
             acceptedSourceSha=$(if($status -eq 'accepted') {[string]$f.fields['accepted_source_sha']} else {''});
             sources=@($src,$stateRef);verificationRefs=@()}
        if($status -eq 'accepted' -and -not $unit.acceptedSourceSha){$unit.acceptedSourceSha=[string]$f.fields['frozen_qualified_source_sha']}
        if($status -eq 'accepted' -and -not $unit.acceptedSourceSha){$unit.acceptedSourceSha=[string]$f.fields['qualified_source_sha']}
        if($status -eq 'accepted' -and -not $unit.acceptedSourceSha){$unit.acceptedSourceSha=[string]$f.fields['bu05_accepted_source_sha']}
        $refId=$id+'-acceptance'
        $qualResult=if($status -eq 'accepted'){'accepted'}else{'pending'}
        $catalog.Add([ordered]@{id=$refId;name="$pretty — independent acceptance";type='Independent source review / Builder closeout';status=$qualResult;
            description="Original state: $([string]$f.fields['status']). A passing software test is not independent feature acceptance.";
            nextProof=$(if($status -eq 'accepted'){'Accepted within the recorded bounded scope; downstream system gates remain separate.'}else{'Source-specific independent Reviewer verdict and authorized Builder closeout are required.'});sources=@($stateRef)})
        $unit.verificationRefs+=,[ordered]@{refId=$refId;status=$qualResult;role='Source-bound acceptance status for this exact feature.'}
        if($latest){
            $rid=$id+'-phxci'
            $qstatus=if($latest.pass){'accepted'}else{'blocked'}
            $evref=Get-BrainRefSource $f.sha $latest.path 'Original PHX-CI result'
            $catalog.Add([ordered]@{id=$rid;name="$pretty — recorded PHX-CI";type='Exact-source Windows software qualification';status=$qstatus;
                description="Run $($latest.id): $($latest.count)/$($latest.total) stages; focused PASS $($latest.focused); product PASS $($latest.product), FAIL $($latest.fail). Verified source $($latest.source).";
                nextProof=$(if($latest.pass){'Passing test evidence does not approve merging or activation.'}else{'Correct failure and rerun exact-source qualification before review.'});sources=@($evref)})
            $unit.verificationRefs+=,[ordered]@{refId=$rid;status=$qstatus;role='Original Windows PHX-CI result, not independent acceptance.'}
        }
        $units.Add($unit)
        $provenance.Add([ordered]@{label="$id branch and state";ref=$f.sha;path='dev/state/current-state.yaml'})
    }
    # Preserve the supplied DEC-362 task checklist as a distinct evidence catalog; not new work units.
    $dec362=@($units|Where-Object {$_.id -eq 'WS-05/DEC362'})|Select-Object -First 1
    if($dec362){
        $taskRows=@(
            @('DEC362-13','Simulated cross-device regressions','accepted','A→B→A and clean-merge software proof. No physical execution.'),
            @('DEC362-14','Changes and inventory continuity','partial','Supporting Changes replay exists; direct integrated end-to-end inventory test not conclusively established.'),
            @('DEC362-15','Independent full software qualification','accepted','Formal accepted software scope; verify the original immutable PHX-CI and review artifacts.'),
            @('DEC362-16','DEC-339 / PR #157 activation boundary','pending','Accepted DEC-362 prerequisite is not approval to merge or activate PR #157.')
        )
        foreach($t in $taskRows){
            $st=$t[2];if($dec362.status -ne 'accepted' -and $st -eq 'accepted'){$st='pending'}
            $catalog.Add([ordered]@{id=$t[0];name=$t[1];type='User-provided DEC-362 checklist / scope-qualified interpretation';status=$st;
                 description=$t[3];nextProof='Confirm direct, scope-appropriate evidence before any broader system-gate acceptance.';sources=@($dec362.sources[0])})
            $dec362.verificationRefs+=,[ordered]@{refId=$t[0];status=$st;role='Checklist status, distinct from product activation or physical-device proof.'}
        }
    }
    $now=[DateTimeOffset]::UtcNow.ToString('yyyy-MM-dd HH:mm:ss UTC')
    $sorted=@($Features|Sort-Object timestamp -Descending)
    $attention=@($sorted|Where-Object {(Get-BrainFeatureStatus $_.fields) -ne 'accepted'})
    $candidate=if($attention.Count){$attention[0]}elseif($sorted.Count){$sorted[0]}else{$null}
    $activeId=if($candidate){Get-BrainFeatureId $candidate.key $candidate.fields}else{''}
    $activeWs=if($activeId){$activeId.Split('/')[0]}else{'WS-02'}
    $activeNode=@($units|Where-Object {$_.id -eq $activeId})|Select-Object -First 1
    if(-not $activeNode){
        $activeId='WS-02';$activeNode=[ordered]@{name=$script:BrainWorkstreams['WS-02'];purpose='Current source records do not establish an active integration build unit.';status='planned'}
    }
    foreach($ws in $script:BrainWorkstreams.Keys){
        $children=@($units|Where-Object {$_.parentId -eq $ws})
        $accepted=@($children|Where-Object {$_.status -eq 'accepted'}).Count
        # Workstream-level acceptance is NOT inferred solely from accepted feature slices.
        $wsStatus=if($children.Count){'active'}elseif($BaselineAccepted -and $ws -in @('WS-01','WS-04')){'accepted'}else{'partial'}
        $formal=if($wsStatus -eq 'accepted'){'Original accepted product-phase baseline recorded in the canonical Workstream index; new DEC-339 and physical gates are separate.'}elseif($children.Count){'Current feature-source work shown. Accepted feature slices do not establish new formal workstream closure.'}else{'Entire current workstream acceptance not independently reconstructed by this feature-focused dashboard.'}
        $workstreams.Add([ordered]@{id=$ws;name=$script:BrainWorkstreams[$ws];status=$wsStatus;formalStatus=$formal;
            acceptedBuildUnits=$accepted;totalBuildUnits=$children.Count})
    }
    $allUnits=New-Object System.Collections.Generic.List[object]
    foreach($w in $workstreams){
        $allUnits.Add([ordered]@{id=$w.id;name=$w.name;nodeType='workstream';nodeTypeLabel='Workstream';status=$w.status;displayStatus=$w.status;
            purpose="BRAIN $($w.name): preserve the project’s existing authorized architecture and acceptance boundaries.";
            whyItMatters='A Workstream can own multiple independently reviewed features, but those feature acceptances do not by themselves close the entire Workstream.';
            expectedResult='Close every required work unit and independently prove all applicable workstream/system acceptance conditions.';
            scopeBoundary='A completed software workstream alone does not authorize physical testing, migration, deployment, release or inventory activation.';
            detail=$w.formalStatus;sources=@((Get-BrainRefSource $MasterSha 'dev/planning/02-workstreams/00-INDEX.md' 'Workstream index'));
            verificationRefs=@();displayReason='';acceptedSourceSha=''})
        foreach($u in @($units|Where-Object {$_.parentId -eq $w.id})){$allUnits.Add($u)}
    }
    $nextText=if($candidate -and $candidate.fields['next_action']){([string]$candidate.fields['next_action'] -replace '_',' ')}else{'Inspect current source planning and the next approved Builder/Reviewer handoff; no new authorization is implied.'}
    $acceptanceMsg=if($activeNode.status -eq 'accepted'){'Feature accepted within its narrow original recorded scope; subsequent gates remain outstanding.'}else{'The active feature lacks final independently accepted closeout.'}
    $currentEvidence=$null
    if($candidate){$cands=Get-BrainLatestEvidence $Checkout $candidate.sha $candidate.fields;if(@($cands).Count){$currentEvidence=@($cands)[0]}}
    $lastEv=$null
    if($currentEvidence){$lastEv=[ordered]@{pass=$currentEvidence.product;fail=$currentEvidence.fail;scope="Source $($currentEvidence.source); PHX-CI overall $(if($currentEvidence.pass){'PASS'}else{'BLOCKED'})";path=$currentEvidence.path}}
    $checks=@(
        [ordered]@{label='Accepted feature slices';complete=(@($units|Where-Object {$_.parentId -eq $activeWs -and $_.status -ne 'accepted'}).Count -eq 0);detail='Every currently discovered Build Unit has an independent acceptance record.'},
        [ordered]@{label='Entire Workstream gate';complete=$false;detail='No parent-wide acceptance inferred from individual feature closeouts.'},
        [ordered]@{label='Inventory activation';complete=$false;detail='DEC-339 runtime cutover and PR #157 require separate Owner authorization.'},
        [ordered]@{label='Physical/system acceptance';complete=$false;detail='Live Windows/iOS and Stage 3 gates are independent of software PHX-CI.'}
    )
    $sources=New-Object System.Collections.Generic.List[object];$sources.Add([ordered]@{label='Master';ref=$MasterSha});foreach($p in $provenance){$sources.Add($p)}
    return [ordered]@{
       project=[ordered]@{name='BRAIN Google Drive / Obsidian Sync';repository=$script:BrainRepository;branch=$(if($candidate){$candidate.branch}else{'master'});commit=$(if($candidate){$candidate.sha}else{$MasterSha});master=$MasterSha;asOf=$now}
       stages=@([ordered]@{name='Stage 1 — Product specification';status='accepted';detail='Original target-system and workstream decomposition established.'},[ordered]@{name='Stage 2A / Phase 6 — Integration and hardening';status='active';detail='DEC-339 source branches and independent acceptance gates remain in progress.'},[ordered]@{name='Stage 3 — Independent validation';status='pending';detail='Full physical/system acceptance and release authorization remain separate.'})
       active=[ordered]@{workstreamId=$activeWs;unitId=$activeId;path=$(if($candidate){"$activeId / $($candidate.branch)"}else{'No active source feature identified'});nextAction=$nextText}
       activePresentation=[ordered]@{name=$activeNode.name;scope='Newest unfinished source-owned feature, or most recent accepted feature; not a governance active-pointer override';sourceLabel='Pinned per-feature state and source branch';construction=$(if($candidate){[string]$candidate.fields['status']}else{'Not established'});qualification=$(if($currentEvidence){"$($currentEvidence.count)/$($currentEvidence.total) PHX-CI stages; overall $(if($currentEvidence.pass){'PASS'}else{'BLOCKED'})."}else{'Original exact-source result not established for this feature.'});acceptance=$acceptanceMsg;lastEvidence=$lastEv}
       nextStep=[ordered]@{title='Respect the next recorded source-bound gate';context=$nextText;sourceText=$nextText;sourceLabel='Per-feature current-state.yaml';role=$(if($candidate){[string]$candidate.fields['handoff-recipient-role']}else{'Owner/Builder'});boundary='Do not infer full WS-02/WS-05 closure, PR #157 merge, inventory activation, migration, physical test or release from a bounded feature acceptance.'}
       closeoutReadiness=[ordered]@{status='active';checks=$checks}
       workstreams=@($workstreams.ToArray());units=@($allUnits.ToArray());verificationCatalog=@($catalog.ToArray());
       verificationInventory=[ordered]@{status='partial';scope='Discovered source-bound feature checks plus supplied DEC-362 checklist; not the exhaustive BRAIN requirement inventory'}
       requirements=[ordered]@{mapped=$null;total=$null}
       verification=[ordered]@{result=$(if($currentEvidence){if($currentEvidence.pass){'PASS software evidence'}else{'BLOCKED software evidence'}}else{'Not established'});scope='Most recent per-feature original source verification; does not imply system acceptance';stagesPassed=$(if($currentEvidence){$currentEvidence.count}else{$null});stagesTotal=$(if($currentEvidence){$currentEvidence.total}else{$null});focusedPassed=$(if($currentEvidence){$currentEvidence.focused}else{$null});focusedTotal=$null;repositoryPassed=$(if($currentEvidence){$currentEvidence.product}else{$null});repositoryTotal=$null;runId=$(if($currentEvidence){$currentEvidence.id}else{''})}
       milestones=@();blockers=@('Full DEC-339 integration and PR #157 activation are not established by bounded software acceptance.','Full-system physical Windows/iOS acceptance and Stage 3 remain separately gated.')
       performance=[ordered]@{cohorts=@();trend=@();forecast='No evidence-supported full-system delivery date established.'}
       sources=@($sources.ToArray())
    }
}
function New-BrainDashboardHtml {
    param([Parameter(Mandatory)][string]$Template,[Parameter(Mandatory)]$SnapshotJson)
    $marker='__PROJECT_SNAPSHOT_JSON__'
    Assert-Brain ($Template.Split(@($marker),[StringSplitOptions]::None).Count -eq 2) 'Template must contain exactly one embedded snapshot marker.'
    $safeJson=[regex]::Replace($SnapshotJson,'(?i)</script','<\/script')
    return $Template.Replace($marker,$safeJson)
}