[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
    [string]$BaseSha
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-RepoPath([string]$Path) {
    return (($Path -replace '\\', '/') -replace '^\./', '').Trim('/')
}

function Test-Under([string]$Path, [string]$Root) {
    $p = Normalize-RepoPath $Path
    $r = (Normalize-RepoPath $Root).TrimEnd('/')
    return $p -eq $r -or $p.StartsWith("$r/", [System.StringComparison]::Ordinal)
}

function Get-ManifestPolicy {
    $path = Join-Path $RepoRoot 'dev/governance/testing-platform-boundary.yaml'
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'BOUNDARY_MANIFEST_MISSING' }
    $lines = @(Get-Content -LiteralPath $path)
    $top = ''
    $sub = ''
    $production = [System.Collections.Generic.List[string]]::new()
    $approved = [System.Collections.Generic.List[string]]::new()
    $values = @{}
    foreach ($raw in $lines) {
        $line = $raw -replace '\s+#.*$', ''
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match '^([A-Za-z0-9_]+):\s*(.*)$') {
            $top = $Matches[1]
            $sub = ''
            if (-not [string]::IsNullOrWhiteSpace($Matches[2])) { $values[$top] = $Matches[2].Trim() }
            continue
        }
        if ($line -match '^  ([A-Za-z0-9_]+):\s*(.*)$') {
            $sub = $Matches[1]
            $value = $Matches[2].Trim()
            if ($value) { $values["$top.$sub"] = $value }
            continue
        }
        if ($line -match '^    -\s+(.+)$') {
            $item = $Matches[1].Trim().Trim('"').Trim("'")
            if ($top -eq 'roots' -and $sub -eq 'production') { $production.Add((Normalize-RepoPath $item)) }
            elseif ($top -eq 'production_seam' -and $sub -eq 'approved_imports') { $approved.Add((Normalize-RepoPath $item)) }
            continue
        }
        if ($line -match '^    ([A-Za-z0-9_]+):\s*(.+)$') {
            $values["$top.$($Matches[1])"] = $Matches[2].Trim()
        }
    }
    if ($production.Count -eq 0) { throw 'BOUNDARY_MANIFEST_INVALID: roots.production is required.' }
    foreach ($key in @('roots.test_platform','roots.active_dev','roots.archive','production_seam.max_logical_loc','production_seam.max_files','complexity_budgets.test_platform_framework_core_logical_ts_loc_max','complexity_budgets.live_device_agent_logical_ts_loc_max','complexity_budgets.ordinary_scenario_logical_loc_target','complexity_budgets.ordinary_scenario_logical_loc_hard_max','complexity_budgets.scenario_specific_powershell_scripts_max','complexity_budgets.bvp_powershell_scripts_max','complexity_budgets.bvp_powershell_combined_logical_loc_max','complexity_budgets.scenario_specific_production_files_max')) {
        if (-not $values.ContainsKey($key)) { throw "BOUNDARY_MANIFEST_INVALID: missing $key." }
    }
    function IntValue([string]$Key) {
        $n = 0
        if (-not [int]::TryParse(([string]$values[$Key]), [ref]$n)) { throw "BOUNDARY_MANIFEST_INVALID: $Key must be an integer." }
        return $n
    }
    return [pscustomobject]@{
        ProductionRoots = @($production)
        TestPlatformRoot = Normalize-RepoPath ([string]$values['roots.test_platform'])
        ActiveDevRoot = Normalize-RepoPath ([string]$values['roots.active_dev'])
        ArchiveRoot = Normalize-RepoPath ([string]$values['roots.archive'])
        ApprovedSeam = @($approved)
        SeamLocMax = IntValue 'production_seam.max_logical_loc'
        SeamFilesMax = IntValue 'production_seam.max_files'
        CoreLocMax = IntValue 'complexity_budgets.test_platform_framework_core_logical_ts_loc_max'
        LiveLocMax = IntValue 'complexity_budgets.live_device_agent_logical_ts_loc_max'
        ScenarioTarget = IntValue 'complexity_budgets.ordinary_scenario_logical_loc_target'
        ScenarioMax = IntValue 'complexity_budgets.ordinary_scenario_logical_loc_hard_max'
        ScenarioPsMax = IntValue 'complexity_budgets.scenario_specific_powershell_scripts_max'
        BvpPsCountMax = IntValue 'complexity_budgets.bvp_powershell_scripts_max'
        BvpPsLocMax = IntValue 'complexity_budgets.bvp_powershell_combined_logical_loc_max'
        ScenarioProductionMax = IntValue 'complexity_budgets.scenario_specific_production_files_max'
    }
}

function Get-SnapshotPaths([string]$Sha, $Policy) {
    if ($Sha) {
        $output = @(& git -C $RepoRoot ls-tree -r --name-only $Sha 2>&1)
        $code = $LASTEXITCODE
        if ($code -ne 0) { throw "BASE_SHA_UNREADABLE: git ls-tree exited ${code}: $($output -join ' ')" }
        return @($output | ForEach-Object { Normalize-RepoPath ([string]$_) })
    }
    $found = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($root in @($Policy.ProductionRoots + @($Policy.TestPlatformRoot, 'dev/scripts'))) {
        $full = Join-Path $RepoRoot ((Normalize-RepoPath $root).Replace('/', [System.IO.Path]::DirectorySeparatorChar))
        if (-not (Test-Path -LiteralPath $full -PathType Container)) { continue }
        foreach ($file in @(Get-ChildItem -LiteralPath $full -Recurse -File)) {
            $relative = Normalize-RepoPath ([System.IO.Path]::GetRelativePath($RepoRoot, $file.FullName))
            $found.Add($relative) | Out-Null
        }
    }
    return @($found)
}

function Read-SnapshotText([string]$Path, [string]$Sha) {
    if ($Sha) {
        $spec = '{0}:{1}' -f $Sha, (Normalize-RepoPath $Path)
        $output = @(& git -C $RepoRoot show $spec 2>&1)
        $code = $LASTEXITCODE
        if ($code -ne 0) { return $null }
        return ($output -join "`n")
    }
    $full = Join-Path $RepoRoot ((Normalize-RepoPath $Path).Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { return $null }
    return Get-Content -LiteralPath $full -Raw
}

function Get-LogicalLines([string]$Text, [string]$Kind) {
    $result = [System.Collections.Generic.List[string]]::new()
    $inBlock = $false
    $start = if ($Kind -eq 'ps') { '<#' } else { '/*' }
    $end = if ($Kind -eq 'ps') { '#>' } else { '*/' }
    foreach ($raw in ($Text -split "`r?`n")) {
        $line = $raw
        while ($true) {
            if ($inBlock) {
                $close = $line.IndexOf($end, [System.StringComparison]::Ordinal)
                if ($close -lt 0) { $line = ''; break }
                $line = $line.Substring($close + 2)
                $inBlock = $false
                continue
            }
            $open = $line.IndexOf($start, [System.StringComparison]::Ordinal)
            if ($open -lt 0) { break }
            $close = $line.IndexOf($end, $open + 2, [System.StringComparison]::Ordinal)
            if ($close -ge 0) { $line = $line.Remove($open, ($close + 2) - $open); continue }
            $line = $line.Substring(0, $open)
            $inBlock = $true
            break
        }
        $trim = $line.Trim()
        if (-not $trim) { continue }
        if ($Kind -eq 'ps' -and $trim.StartsWith('#')) { continue }
        if ($Kind -ne 'ps' -and $trim.StartsWith('//')) { continue }
        $result.Add($line)
    }
    return @($result)
}

function Count-Loc([string]$Text, [string]$Path) {
    if ($null -eq $Text) { return 0 }
    $kind = if ($Path -match '(?i)\.ps1$') { 'ps' } elseif ($Path -match '(?i)\.ya?ml$') { 'ps' } else { 'ts' }
    return @(Get-LogicalLines $Text $kind).Count
}

function Get-ImportSpecifiers([string[]]$Lines) {
    $result = [System.Collections.Generic.List[string]]::new()
    $patterns = @(
        '^\s*(?:import|export)\b.*?\bfrom\s*["'']([^"'']+)["'']',
        '^\s*import\s*["'']([^"'']+)["'']',
        '^\s*(?:const|let|var)\b[^=]*=\s*(?:await\s+)?(?:require|import)\s*\(\s*["'']([^"'']+)["'']',
        '^\s*(?:void|await)\s+import\s*\(\s*["'']([^"'']+)["'']'
    )
    foreach ($line in $Lines) {
        foreach ($pattern in $patterns) {
            $match = [regex]::Match($line, $pattern)
            if ($match.Success) { $result.Add($match.Groups[1].Value); break }
        }
    }
    return @($result)
}

function Resolve-Relative([string]$Origin, [string]$Specifier) {
    if (-not $Specifier.StartsWith('.')) { return $null }
    $parts = [System.Collections.Generic.List[string]]::new()
    $base = (Normalize-RepoPath $Origin) -replace '/[^/]+$', ''
    foreach ($segment in (("$base/$Specifier") -split '/')) {
        if (-not $segment -or $segment -eq '.') { continue }
        if ($segment -eq '..') { if ($parts.Count -eq 0) { return $null }; $parts.RemoveAt($parts.Count - 1); continue }
        $parts.Add($segment)
    }
    return ($parts -join '/')
}

function Measure-Snapshot([string]$Sha, $Policy) {
    $paths = @(Get-SnapshotPaths $Sha $Policy)
    $tsExt = '(?i)\.(?:ts|tsx|mts|cts)$'
    $productionFiles = @($paths | Where-Object { $p = $_; ($Policy.ProductionRoots | Where-Object { Test-Under $p $_ }).Count -gt 0 -and $p -match $tsExt })
    $testFiles = @($paths | Where-Object { (Test-Under $_ $Policy.TestPlatformRoot) -and $_ -match $tsExt })
    $classificationErrors = [System.Collections.Generic.List[string]]::new()
    foreach ($path in @($paths | Where-Object { (Test-Under $_ $Policy.TestPlatformRoot) -and $_ -match '(?i)\.(?:js|jsx|mjs|cjs|py|sh)$' })) {
        $classificationErrors.Add("Unclassifiable active BVP executable source: $path")
    }
    $productionLoc = 0
    foreach ($path in $productionFiles) { $productionLoc += Count-Loc (Read-SnapshotText $path $Sha) $path }

    $seamFiles = [System.Collections.Generic.List[string]]::new()
    foreach ($entry in $Policy.ApprovedSeam) {
        $match = @($productionFiles | Where-Object { $_ -eq $entry -or $_ -eq "$entry.ts" -or $_ -eq "$entry/index.ts" })
        if ($match.Count -eq 0) { $classificationErrors.Add("Approved production seam entry is not a readable production TypeScript file: $entry") }
        foreach ($path in $match) { if (-not $seamFiles.Contains($path)) { $seamFiles.Add($path) } }
    }
    $seamLoc = 0
    foreach ($path in $seamFiles) { $seamLoc += Count-Loc (Read-SnapshotText $path $Sha) $path }

    $scenarioRoot = (Normalize-RepoPath $Policy.TestPlatformRoot) + '/scenarios'
    $fixtureRoot = (Normalize-RepoPath $Policy.TestPlatformRoot) + '/fixtures'
    $testRoot = (Normalize-RepoPath $Policy.TestPlatformRoot) + '/test'
    $sourceRoot = (Normalize-RepoPath $Policy.TestPlatformRoot) + '/src'
    $coreFiles = [System.Collections.Generic.List[string]]::new()
    $liveFiles = [System.Collections.Generic.List[string]]::new()
    foreach ($path in $testFiles) {
        if (Test-Under $path $testRoot) { continue }
        if (Test-Under $path $scenarioRoot) { continue }
        if (Test-Under $path $fixtureRoot) { continue }
        if (-not (Test-Under $path $sourceRoot)) { $classificationErrors.Add("Unclassifiable active BVP TypeScript source: $path"); continue }
        if ($path -match '(?i)(?:^|/)(?:live-device|device-command-agent|command-agent|device-agent|windows-relay|relay|mailbox)(?:[-_/\.]|$)') { $liveFiles.Add($path) }
        else { $coreFiles.Add($path) }
    }
    $coreLoc = 0
    foreach ($path in $coreFiles) { $coreLoc += Count-Loc (Read-SnapshotText $path $Sha) $path }
    $liveLoc = 0
    foreach ($path in $liveFiles) { $liveLoc += Count-Loc (Read-SnapshotText $path $Sha) $path }

    $scenarioFiles = @($paths | Where-Object { (Test-Under $_ $scenarioRoot) -and $_ -match '(?i)\.(?:ts|json|ya?ml)$' })
    $scenarios = [System.Collections.Generic.List[object]]::new()
    foreach ($path in $scenarioFiles) {
        $loc = Count-Loc (Read-SnapshotText $path $Sha) $path
        $name = (Normalize-RepoPath $path).Substring($scenarioRoot.Length + 1) -replace '\.[^.]+$', ''
        $scenarios.Add([pscustomobject]@{ scenario = $name; path = $path; logicalLoc = $loc; targetExceeded = ($loc -gt $Policy.ScenarioTarget); hardMaxExceeded = ($loc -gt $Policy.ScenarioMax) })
    }

    $prodSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($p in $productionFiles) { $prodSet.Add($p) | Out-Null }
    $imports = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($path in $testFiles) {
        $text = Read-SnapshotText $path $Sha
        foreach ($specifier in @(Get-ImportSpecifiers @(Get-LogicalLines $text 'ts'))) {
            $target = Resolve-Relative $path $specifier
            if (-not $target) { continue }
            foreach ($candidate in @($target, "$target.ts", "$target.tsx", "$target/index.ts")) {
                if ($prodSet.Contains($candidate)) { $imports.Add($candidate) | Out-Null; break }
            }
        }
    }

    $scriptPaths = @($paths | Where-Object { $_ -match '(?i)^dev/scripts/.*(?:Bvp|TestingArchitecture).*\.ps1$' })
    $psLoc = 0
    foreach ($path in $scriptPaths) { $psLoc += Count-Loc (Read-SnapshotText $path $Sha) $path }
    $scenarioPs = @($paths | Where-Object { ((Test-Under $_ $Policy.TestPlatformRoot) -or $_ -match '(?i)^dev/scripts/.*(?:scenario|BVP-[A-Z0-9-]+).*\.ps1$') -and $_ -match '(?i)\.ps1$' })
    $scenarioProd = [System.Collections.Generic.List[string]]::new()
    foreach ($path in $productionFiles) {
        $text = Read-SnapshotText $path $Sha
        $code = @(Get-LogicalLines $text 'ts') -join "`n"
        if ($path -match '(?i)scenario' -or $code -match '(?im)^\s*(?:export\s+)?(?:class|interface|type)\s+[A-Za-z0-9_]*Scenario[A-Za-z0-9_]*\b') { $scenarioProd.Add($path) }
    }
    $scenarioLocTotal = ($scenarios | Measure-Object -Property logicalLoc -Sum).Sum
    if ($null -eq $scenarioLocTotal) { $scenarioLocTotal = 0 }
    return [pscustomobject]@{
        productionSourceLogicalLoc = $productionLoc
        productionSeamLogicalLoc = $seamLoc
        productionSeamFileCount = $seamFiles.Count
        productionSeamFiles = @($seamFiles | Sort-Object)
        frameworkCoreLogicalTsLoc = $coreLoc
        platformCoreRuntimeModuleCount = $coreFiles.Count
        frameworkCoreFiles = @($coreFiles | Sort-Object)
        liveDeviceAgentRelayLogicalTsLoc = $liveLoc
        liveDeviceAgentRelayFiles = @($liveFiles | Sort-Object)
        scenarioDefinitionLogicalLocTotal = [int]$scenarioLocTotal
        scenarioCount = $scenarios.Count
        scenarios = @($scenarios | Sort-Object path)
        productionModulesImportedCount = $imports.Count
        productionModulesImported = @($imports | Sort-Object)
        bvpPowerShellScriptCount = $scriptPaths.Count
        bvpPowerShellLogicalLoc = $psLoc
        bvpPowerShellFiles = @($scriptPaths | Sort-Object)
        scenarioSpecificPowerShellCount = $scenarioPs.Count
        scenarioSpecificPowerShellFiles = @($scenarioPs | Sort-Object)
        scenarioSpecificProductionFileCount = $scenarioProd.Count
        scenarioSpecificProductionFiles = @($scenarioProd | Sort-Object)
        classificationErrors = @($classificationErrors | Sort-Object)
    }
}

function Add-Budget($List, [string]$Id, [int]$Measured, [int]$Limit, [string[]]$Offenders = @()) {
    $state = if ($Measured -le $Limit) { 'PASS' } else { 'FAIL' }
    $List.Add([pscustomobject]@{ id = $Id; measured = $Measured; limit = $Limit; state = $state; offenders = @($Offenders) }) | Out-Null
}

try {
    $RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path
    $policy = Get-ManifestPolicy
    $current = Measure-Snapshot '' $policy
    $budgets = [System.Collections.Generic.List[object]]::new()
    Add-Budget $budgets 'PRODUCTION_SEAM_LOC' $current.productionSeamLogicalLoc $policy.SeamLocMax $current.productionSeamFiles
    Add-Budget $budgets 'PRODUCTION_SEAM_FILES' $current.productionSeamFileCount $policy.SeamFilesMax $current.productionSeamFiles
    Add-Budget $budgets 'FRAMEWORK_CORE_LOC' $current.frameworkCoreLogicalTsLoc $policy.CoreLocMax $current.frameworkCoreFiles
    Add-Budget $budgets 'LIVE_DEVICE_AGENT_RELAY_LOC' $current.liveDeviceAgentRelayLogicalTsLoc $policy.LiveLocMax $current.liveDeviceAgentRelayFiles
    foreach ($scenario in $current.scenarios) { Add-Budget $budgets ("SCENARIO_LOC:{0}" -f $scenario.scenario) $scenario.logicalLoc $policy.ScenarioMax @($scenario.path) }
    Add-Budget $budgets 'SCENARIO_SPECIFIC_POWERSHELL' $current.scenarioSpecificPowerShellCount $policy.ScenarioPsMax $current.scenarioSpecificPowerShellFiles
    Add-Budget $budgets 'BVP_POWERSHELL_SCRIPT_COUNT' $current.bvpPowerShellScriptCount $policy.BvpPsCountMax $current.bvpPowerShellFiles
    Add-Budget $budgets 'BVP_POWERSHELL_LOC' $current.bvpPowerShellLogicalLoc $policy.BvpPsLocMax $current.bvpPowerShellFiles
    Add-Budget $budgets 'SCENARIO_SPECIFIC_PRODUCTION_FILES' $current.scenarioSpecificProductionFileCount $policy.ScenarioProductionMax $current.scenarioSpecificProductionFiles
    $base = $null
    $delta = $null
    if ($BaseSha) {
        $base = Measure-Snapshot $BaseSha $policy
        $delta = [ordered]@{}
        foreach ($name in @('productionSourceLogicalLoc','productionSeamLogicalLoc','productionSeamFileCount','frameworkCoreLogicalTsLoc','platformCoreRuntimeModuleCount','liveDeviceAgentRelayLogicalTsLoc','scenarioDefinitionLogicalLocTotal','scenarioCount','productionModulesImportedCount','bvpPowerShellScriptCount','bvpPowerShellLogicalLoc','scenarioSpecificPowerShellCount','scenarioSpecificProductionFileCount')) {
            $delta[$name] = [pscustomobject]@{ base = [int]$base.$name; current = [int]$current.$name; delta = ([int]$current.$name - [int]$base.$name) }
        }
    }
    $failed = @($budgets | Where-Object state -eq 'FAIL').Count -gt 0 -or $current.classificationErrors.Count -gt 0
    if ($null -ne $base -and $base.classificationErrors.Count -gt 0) { $failed = $true }
    $baseLabel = if ($BaseSha) { $BaseSha } else { $null }
    $overall = if ($failed) { 'FAIL' } else { 'PASS' }
    $result = [ordered]@{ schemaVersion = 1; baseSha = $baseLabel; current = $current; base = $base; delta = $delta; budgets = @($budgets); overall = $overall }
    $result | ConvertTo-Json -Depth 12
    if ($failed) { exit 1 }
    exit 0
}
catch {
    $baseLabel = if ($BaseSha) { $BaseSha } else { $null }
    [ordered]@{ schemaVersion = 1; baseSha = $baseLabel; current = $null; base = $null; delta = $null; budgets = @(); overall = 'FAIL'; error = $_.Exception.Message } | ConvertTo-Json -Depth 6
    exit 1
}
