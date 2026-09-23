[CmdletBinding()]
param(
    [string]$RepositoryRoot = (Get-Location).Path,
    [string]$ExpectedRemoteBranch = 'origin/phase6-integration'
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$evidencePath = Join-Path $repo 'dev/_ca-output.md'
$checks = [System.Collections.Generic.List[object]]::new()
$failure = $null
$head = ''
$remote = ''

function Add-Check {
    param([string]$Name, [bool]$Passed, [string]$Detail)
    $checks.Add([pscustomobject]@{ Name=$Name; Passed=$Passed; Detail=$Detail })
    if (-not $Passed) { throw "BVP-S01 verification failed: $Name - $Detail" }
}
function Has-Path([string]$Relative) {
    Test-Path -LiteralPath (Join-Path $repo $Relative)
}

try {
    $head = (& git -C $repo rev-parse HEAD).Trim()
    $code = $LASTEXITCODE
    Add-Check 'resolve HEAD' ($code -eq 0 -and $head) "HEAD=$head exit=$code"

    $remote = (& git -C $repo rev-parse $ExpectedRemoteBranch).Trim()
    $code = $LASTEXITCODE
    Add-Check 'resolve integration authority' ($code -eq 0 -and $remote) "$ExpectedRemoteBranch=$remote exit=$code"
    Add-Check 'exact integration authority commit' ($head -eq $remote) "HEAD=$head remote=$remote"

    $required = @(
        'dev/planning-and-building/testing-platform-target-system-specification.md',
        'dev/planning-and-building/testing-platform-authority-transition-and-legacy-archive.md',
        'dev/planning-and-building/testing-platform-build-decomposition.md',
        'dev/planning-and-building/testing-platform-requirement-coverage.md',
        'dev/planning-and-building/testing-platform-build-session-specifications.md',
        'dev/governance/testing-platform-boundary.yaml',
        'dev/archive/legacy-validation-harness/README.md',
        'dev/archive/legacy-validation-harness/ARCHIVE-MANIFEST.md'
    )
    foreach ($path in $required) { Add-Check "required path $path" (Has-Path $path) 'must exist' }

    $forbidden = @(
        'dev/planning-and-building/phase6-live-validation-harness-plan.md',
        'dev/agents/st2a/ph6/04-lv/01-test',
        'dev/agents/st2a/ph6/h6c/archive',
        'dev/scripts/verify-h6c-production-diagnostic-correlation.ps1'
    )
    foreach ($path in $forbidden) { Add-Check "legacy active path absent $path" (-not (Has-Path $path)) 'must be archived' }

    $decision = Get-Content -LiteralPath (Join-Path $repo 'dev/planning-and-building/decision-register.yaml') -Raw
    foreach ($id in 301..310) {
        $pattern = "(?ms)^\s*- id: DEC-$id\s*\r?\n\s*status: superseded\s*\r?\n\s*superseded_by: DEC-311"
        Add-Check "DEC-$id superseded" ([regex]::IsMatch($decision,$pattern)) 'must be superseded by DEC-311'
    }
    foreach ($id in 311..322) {
        $pattern = "(?ms)^\s*- id: DEC-$id\s*\r?\n\s*status: locked"
        Add-Check "DEC-$id locked" ([regex]::IsMatch($decision,$pattern)) 'replacement decision must be active'
    }

    $state = Get-Content -LiteralPath (Join-Path $repo 'dev/planning-and-building/project-state.yaml') -Raw
    Add-Check 'project state names BVP authority' ($state -match 'active_bvp_authority') 'required'
    Add-Check 'archive is inert' ($state -match 'historical and non-authoritative') 'required'
    Add-Check 'S01 gate blocks S02' ($state -match 'No replacement BVP implementation begins until BVP-S01 local archive/authority verification passes') 'required'

    $manifest = Get-Content -LiteralPath (Join-Path $repo 'dev/archive/legacy-validation-harness/ARCHIVE-MANIFEST.md')
    $clean = @(
        'dev/planning-and-building/decision-register.yaml',
        'dev/planning-and-building/project-state.yaml',
        'dev/agents/agent-to-agent-communication.md',
        'dev/_ca-output.md'
    )
    $manifestRows = 0
    foreach ($line in $manifest) {
        if ($line -notlike '| *dev/*') { continue }
        $parts = $line.Split('|')
        if ($parts.Count -lt 4) { continue }
        $src = $parts[1].Trim().Trim([char]96)
        $dst = $parts[2].Trim().Trim([char]96)
        if (-not $src.StartsWith('dev/') -or -not $dst.StartsWith('dev/archive/legacy-validation-harness/')) { continue }
        $manifestRows++
        Add-Check "archive destination $dst" (Has-Path $dst) "source=$src"
        if ($src -notin $clean) { Add-Check "archived source absent $src" (-not (Has-Path $src)) 'must no longer be active' }
    }
    Add-Check 'archive manifest classified live set' ($manifestRows -eq 156) "rows=$manifestRows expected=156"

    $legacyPatterns = @('00-vh\d','01-vh\d','vh\d+.*scenario','verify-vh','validation-mode-runtime','scenario-runner')
    $allowed = @(
        'dev/planning-and-building/testing-platform-target-system-specification.md',
        'dev/planning-and-building/testing-platform-authority-transition-and-legacy-archive.md',
        'dev/planning-and-building/testing-platform-build-decomposition.md',
        'dev/planning-and-building/testing-platform-requirement-coverage.md',
        'dev/planning-and-building/testing-platform-build-session-specifications.md',
        'dev/planning-and-building/testing-platform-planning-package.md',
        'dev/planning-and-building/decision-register.yaml',
        'dev/planning-and-building/project-state.yaml',
        'dev/agents/agent-to-agent-communication.md',
        'dev/scripts/Invoke-BvpS01AuthorityArchiveVerification.ps1',
        'dev/scripts/Invoke-BvpS01Bootstrap.ps1'
    )
    foreach ($rootRel in @('dev/agents','dev/planning-and-building','dev/scripts','dev/governance')) {
        $rootPath = Join-Path $repo $rootRel
        if (-not (Test-Path -LiteralPath $rootPath)) { continue }
        foreach ($file in Get-ChildItem -LiteralPath $rootPath -Recurse -File) {
            if ($file.FullName -like (Join-Path $repo 'dev/archive/*')) { continue }
            $rel = $file.FullName.Substring($repo.Length).TrimStart('\','/').Replace('\','/')
            if ($rel -in $allowed) { continue }
            $text = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
            foreach ($pattern in $legacyPatterns) {
                if ($rel -match $pattern -or ($text -and $text -match $pattern)) {
                    Add-Check "no unclassified active legacy reference $rel" $false "matched $pattern"
                }
            }
        }
    }

    & git -C $repo diff --check
    $code = $LASTEXITCODE
    Add-Check 'git diff --check' ($code -eq 0) "exit=$code"
}
catch {
    $failure = $_.Exception.Message
}

$status = if ($failure) { 'BLOCKED' } else { 'COMPLETE' }
$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("STATUS: $status")
$lines.Add('')
$lines.Add('# BVP-S01 Authority / Archive Verification Evidence')
$lines.Add('')
$lines.Add("- Timestamp: $([DateTimeOffset]::Now.ToString('o'))")
$lines.Add('- Repository: woodpk/gdrive-sync-obsidian-plugin')
$lines.Add('- Authority branch: phase6-integration')
$lines.Add("- Verified HEAD: $head")
$lines.Add("- Verified remote authority: $remote")
$lines.Add('- GitHub Actions used: NO')
$lines.Add('')
$lines.Add('## Checks')
$lines.Add('')
foreach ($check in $checks) {
    $mark = if ($check.Passed) { 'PASS' } else { 'FAIL' }
    $lines.Add("- $mark - $($check.Name): $($check.Detail)")
}
if ($failure) {
    $lines.Add('')
    $lines.Add('## Blocker')
    $lines.Add('')
    $lines.Add($failure)
} else {
    $lines.Add('')
    $lines.Add('## Gate Result')
    $lines.Add('')
    $lines.Add('BVP-S01 archive/authority transition is locally verified. BVP-S02 may be expanded only after this evidence is committed and pushed to phase6-integration.')
}
Set-Content -LiteralPath $evidencePath -Value $lines -Encoding utf8

if ($failure) { throw $failure }
Write-Host 'BVP-S01 authority/archive verification PASS.'
