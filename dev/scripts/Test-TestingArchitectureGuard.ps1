[CmdletBinding()]
param(
    [string]$RepoRoot,
    [string[]]$ChangedPath = @(),
    [string]$ChangeClass = 'ordinary'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Normalize-RepoPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $normalized = $Path.Trim().Replace('\', '/')
    while ($normalized.StartsWith('./', [System.StringComparison]::Ordinal)) {
        $normalized = $normalized.Substring(2)
    }
    return $normalized.TrimStart('/')
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
        Write-Output 'ARCH_GUARD_ERROR rule=INPUT path=<script> detail=Cannot determine repository root.'
        exit 2
    }
    $RepoRoot = Join-Path $PSScriptRoot '../..'
}

$ScriptRepositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    Write-Output "ARCH_GUARD_ERROR rule=INPUT path=$RepoRoot detail=Repository root does not exist."
    exit 2
}

if ($ChangeClass -notin @('ordinary', 'authorized-governance')) {
    Write-Output "ARCH_GUARD_ERROR rule=INPUT path=<change-class> detail=ChangeClass must be ordinary or authorized-governance."
    exit 2
}

$violations = [System.Collections.Generic.List[object]]::new()

function Add-Violation {
    param(
        [Parameter(Mandatory = $true)][string]$Rule,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Detail
    )

    $violations.Add([pscustomobject]@{
        Rule = $Rule
        Path = (Normalize-RepoPath $Path)
        Detail = $Detail
    }) | Out-Null
}

function Get-RepoRelativePath {
    param([Parameter(Mandatory = $true)][string]$FullPath)

    $relative = [System.IO.Path]::GetRelativePath($RepoRoot, [System.IO.Path]::GetFullPath($FullPath))
    return Normalize-RepoPath $relative
}

function Normalize-PolicyRoot {
    param([Parameter(Mandatory = $true)][string]$Path)

    return (Normalize-RepoPath $Path).TrimEnd('/')
}

function Test-RepoPathWithinRoot {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][string]$Root
    )

    $path = Normalize-RepoPath $RelativePath
    $normalizedRoot = Normalize-PolicyRoot $Root
    return $path -eq $normalizedRoot -or $path.StartsWith("$normalizedRoot/", [System.StringComparison]::Ordinal)
}

function Test-RepoPathWithinAnyRoot {
    param(
        [Parameter(Mandatory = $true)][string]$RelativePath,
        [Parameter(Mandatory = $true)][string[]]$Roots
    )

    foreach ($root in $Roots) {
        if (Test-RepoPathWithinRoot -RelativePath $RelativePath -Root $root) {
            return $true
        }
    }
    return $false
}

function Get-SourceFiles {
    param([Parameter(Mandatory = $true)][string]$RelativeRoot)

    $root = Join-Path $RepoRoot (Normalize-PolicyRoot $RelativeRoot)
    if (-not (Test-Path -LiteralPath $root -PathType Container)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
        $_.Extension -in @('.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs')
    })
}

function ConvertFrom-ManifestScalar {
    param([Parameter(Mandatory = $true)][string]$Value)

    $trimmed = $Value.Trim()
    if ($trimmed.Length -ge 2) {
        if (($trimmed.StartsWith('"') -and $trimmed.EndsWith('"')) -or
            ($trimmed.StartsWith("'") -and $trimmed.EndsWith("'"))) {
            return $trimmed.Substring(1, $trimmed.Length - 2)
        }
    }
    return $trimmed
}

function Get-ManifestTopLevelScalar {
    param(
        [Parameter(Mandatory = $true)][string[]]$Lines,
        [Parameter(Mandatory = $true)][string]$Key
    )

    $pattern = '^' + [regex]::Escape($Key) + ':\s*(?<value>.+?)\s*$'
    $matchesFound = @($Lines | Where-Object { $_ -match $pattern })
    if ($matchesFound.Count -ne 1) {
        throw "Manifest key '$Key' must appear exactly once as a scalar."
    }
    [void]($matchesFound[0] -match $pattern)
    return ConvertFrom-ManifestScalar $matches['value']
}

function Get-ManifestSectionBounds {
    param(
        [Parameter(Mandatory = $true)][string[]]$Lines,
        [Parameter(Mandatory = $true)][string]$Section
    )

    $pattern = '^' + [regex]::Escape($Section) + ':\s*$'
    $indices = [System.Collections.Generic.List[int]]::new()
    for ($index = 0; $index -lt $Lines.Count; $index++) {
        if ($Lines[$index] -match $pattern) {
            $indices.Add($index) | Out-Null
        }
    }
    if ($indices.Count -ne 1) {
        throw "Manifest section '$Section' must appear exactly once."
    }

    $start = $indices[0]
    $end = $Lines.Count
    for ($index = $start + 1; $index -lt $Lines.Count; $index++) {
        $line = $Lines[$index]
        if ([string]::IsNullOrWhiteSpace($line) -or $line.TrimStart().StartsWith('#')) {
            continue
        }
        if ($line -match '^\S') {
            $end = $index
            break
        }
    }

    return [pscustomobject]@{ Start = $start; End = $end }
}

function Get-ManifestNestedScalar {
    param(
        [Parameter(Mandatory = $true)][string[]]$Lines,
        [Parameter(Mandatory = $true)][string]$Section,
        [Parameter(Mandatory = $true)][string]$Key
    )

    $bounds = Get-ManifestSectionBounds -Lines $Lines -Section $Section
    $pattern = '^  ' + [regex]::Escape($Key) + ':\s*(?<value>.+?)\s*$'
    $values = [System.Collections.Generic.List[string]]::new()
    for ($index = $bounds.Start + 1; $index -lt $bounds.End; $index++) {
        if ($Lines[$index] -match $pattern) {
            $values.Add((ConvertFrom-ManifestScalar $matches['value'])) | Out-Null
        }
    }
    if ($values.Count -ne 1) {
        throw "Manifest key '$Section.$Key' must appear exactly once as a scalar."
    }
    return $values[0]
}

function Get-ManifestNestedList {
    param(
        [Parameter(Mandatory = $true)][string[]]$Lines,
        [Parameter(Mandatory = $true)][string]$Section,
        [Parameter(Mandatory = $true)][string]$Key,
        [bool]$Required = $true
    )

    $bounds = Get-ManifestSectionBounds -Lines $Lines -Section $Section
    $keyPattern = '^  ' + [regex]::Escape($Key) + ':\s*(?<inline>\[\s*\])?\s*$'
    $keyIndices = [System.Collections.Generic.List[int]]::new()
    $inlineEmpty = $false
    for ($index = $bounds.Start + 1; $index -lt $bounds.End; $index++) {
        if ($Lines[$index] -match $keyPattern) {
            $keyIndices.Add($index) | Out-Null
            if (-not [string]::IsNullOrWhiteSpace($matches['inline'])) {
                $inlineEmpty = $true
            }
        }
    }

    if ($keyIndices.Count -eq 0 -and -not $Required) {
        return @()
    }
    if ($keyIndices.Count -ne 1) {
        throw "Manifest list '$Section.$Key' must appear exactly once."
    }
    if ($inlineEmpty) {
        return @()
    }

    $values = [System.Collections.Generic.List[string]]::new()
    for ($index = $keyIndices[0] + 1; $index -lt $bounds.End; $index++) {
        $line = $Lines[$index]
        if ($line -match '^  \S') {
            break
        }
        if ($line -match '^    -\s+(?<value>.+?)\s*$') {
            $values.Add((ConvertFrom-ManifestScalar $matches['value'])) | Out-Null
        }
    }
    if ($Required -and $values.Count -eq 0) {
        throw "Manifest list '$Section.$Key' must not be empty."
    }
    return @($values)
}

function Get-ManifestTopLevelList {
    param(
        [Parameter(Mandatory = $true)][string[]]$Lines,
        [Parameter(Mandatory = $true)][string]$Key
    )

    $pattern = '^' + [regex]::Escape($Key) + ':\s*$'
    $indices = [System.Collections.Generic.List[int]]::new()
    for ($index = 0; $index -lt $Lines.Count; $index++) {
        if ($Lines[$index] -match $pattern) {
            $indices.Add($index) | Out-Null
        }
    }
    if ($indices.Count -ne 1) {
        throw "Manifest list '$Key' must appear exactly once."
    }

    $values = [System.Collections.Generic.List[string]]::new()
    for ($index = $indices[0] + 1; $index -lt $Lines.Count; $index++) {
        $line = $Lines[$index]
        if ($line -match '^\S') {
            break
        }
        if ($line -match '^  -\s+(?<value>.+?)\s*$') {
            $values.Add((ConvertFrom-ManifestScalar $matches['value'])) | Out-Null
        }
    }
    if ($values.Count -eq 0) {
        throw "Manifest list '$Key' must not be empty."
    }
    return @($values)
}

function ConvertFrom-ManifestBoolean {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Path
    )

    if ($Value -eq 'true') { return $true }
    if ($Value -eq 'false') { return $false }
    throw "Manifest key '$Path' must be true or false."
}

function Convert-FrozenSurfaceToPath {
    param([Parameter(Mandatory = $true)][string]$Surface)

    $trimmed = $Surface.Trim()
    if ($trimmed -match '^[A-Za-z0-9._/-]+$') {
        return Normalize-RepoPath $trimmed
    }
    if ($trimmed -match '(?<path>[A-Za-z0-9._/-]+\.[A-Za-z0-9._-]+)\s*$') {
        return Normalize-RepoPath $matches['path']
    }
    throw "Frozen surface entry '$Surface' does not contain a deterministic repository path."
}

function Get-BoundaryPolicy {
    $manifestRelativePath = 'dev/governance/testing-platform-boundary.yaml'
    $manifestPath = Join-Path $RepoRoot $manifestRelativePath

    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        Add-Violation 'BOUNDARY_MANIFEST_MISSING' $manifestRelativePath 'Required authoritative boundary manifest is missing.'
        return $null
    }

    try {
        $lines = @(Get-Content -LiteralPath $manifestPath)
        if ($lines.Count -eq 0) {
            throw 'Manifest is empty.'
        }
        if (@($lines | Where-Object { $_.IndexOf([char]9) -ge 0 }).Count -gt 0) {
            throw 'Tabs are not permitted in the authoritative manifest.'
        }

        $schemaVersionText = Get-ManifestTopLevelScalar -Lines $lines -Key 'schema_version'
        $schemaVersion = 0
        if (-not [int]::TryParse($schemaVersionText, [ref]$schemaVersion) -or $schemaVersion -ne 2) {
            throw "Unsupported schema_version '$schemaVersionText'."
        }

        $status = Get-ManifestTopLevelScalar -Lines $lines -Key 'status'
        if ([string]::IsNullOrWhiteSpace($status) -or $status -notmatch '(?i)^authoritative(?:_|$)') {
            throw "Manifest status '$status' does not establish authoritative boundary policy."
        }

        $productionRoots = @(Get-ManifestNestedList -Lines $lines -Section 'roots' -Key 'production' | ForEach-Object { Normalize-PolicyRoot $_ })
        $testPlatformRoot = Normalize-PolicyRoot (Get-ManifestNestedScalar -Lines $lines -Section 'roots' -Key 'test_platform')
        $activeDevRoot = Normalize-PolicyRoot (Get-ManifestNestedScalar -Lines $lines -Section 'roots' -Key 'active_dev')
        $archiveRoot = Normalize-PolicyRoot (Get-ManifestNestedScalar -Lines $lines -Section 'roots' -Key 'archive')

        $productionForbiddenRoots = @(Get-ManifestNestedList -Lines $lines -Section 'import_rules' -Key 'production_must_not_import' | ForEach-Object { Normalize-PolicyRoot $_ })
        $testPlatformAllowlistRequired = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'import_rules' -Key 'test_platform_may_import_production_only_through_allowlist') 'import_rules.test_platform_may_import_production_only_through_allowlist'
        $scenarioSpecificProductionAllowed = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'import_rules' -Key 'scenario_specific_production_code_allowed') 'import_rules.scenario_specific_production_code_allowed'

        $shippingForbiddenRoots = @(Get-ManifestNestedList -Lines $lines -Section 'shipping_rules' -Key 'production_bundle_must_exclude' | ForEach-Object { Normalize-PolicyRoot $_ })
        $productionValidationUiAllowed = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'shipping_rules' -Key 'production_validation_ui_allowed') 'shipping_rules.production_validation_ui_allowed'
        $validationDeviceAgentSeparated = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'shipping_rules' -Key 'validation_device_agent_must_be_separate_artifact_or_entrypoint') 'shipping_rules.validation_device_agent_must_be_separate_artifact_or_entrypoint'

        $productionSeamAllowlistRequired = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'production_seam' -Key 'allowlist_required') 'production_seam.allowlist_required'
        $approvedProductionImports = @(Get-ManifestNestedList -Lines $lines -Section 'production_seam' -Key 'approved_imports' -Required $false | ForEach-Object { Normalize-RepoPath $_ })

        $frozenSurfaces = @(Get-ManifestTopLevelList -Lines $lines -Key 'supervisor_owned_frozen_surfaces' | ForEach-Object { Convert-FrozenSurfaceToPath $_ })

        $archiveIsNonAuthoritative = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'archive_policy' -Key 'archive_is_non_authoritative') 'archive_policy.archive_is_non_authoritative'
        $archiveExcluded = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'archive_policy' -Key 'exclude_from_normal_grounding') 'archive_policy.exclude_from_normal_grounding'
        $activeDocsMustNotDepend = ConvertFrom-ManifestBoolean (Get-ManifestNestedScalar -Lines $lines -Section 'archive_policy' -Key 'active_docs_must_not_depend_on_archived_prompts') 'archive_policy.active_docs_must_not_depend_on_archived_prompts'

        $scenarioPowerShellMaxText = Get-ManifestNestedScalar -Lines $lines -Section 'complexity_budgets' -Key 'scenario_specific_powershell_scripts_max'
        $scenarioPowerShellMax = -1
        if (-not [int]::TryParse($scenarioPowerShellMaxText, [ref]$scenarioPowerShellMax) -or $scenarioPowerShellMax -ne 0) {
            throw 'complexity_budgets.scenario_specific_powershell_scripts_max must be 0 for S03B.'
        }

        if ($productionRoots.Count -eq 0 -or [string]::IsNullOrWhiteSpace($testPlatformRoot) -or
            [string]::IsNullOrWhiteSpace($activeDevRoot) -or [string]::IsNullOrWhiteSpace($archiveRoot)) {
            throw 'Required architecture roots are incomplete.'
        }

        foreach ($root in @($productionRoots + @($testPlatformRoot, $activeDevRoot, $archiveRoot) + $productionForbiddenRoots + $shippingForbiddenRoots)) {
            if ($root -notmatch '^[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$' -or $root -match '(^|/)\.\.($|/)') {
                throw "Manifest root '$root' is not a safe repository-relative root."
            }
        }

        foreach ($productionRoot in $productionRoots) {
            if ((Test-RepoPathWithinRoot -RelativePath $productionRoot -Root $testPlatformRoot) -or
                (Test-RepoPathWithinRoot -RelativePath $testPlatformRoot -Root $productionRoot)) {
                throw "Production root '$productionRoot' overlaps test-platform root '$testPlatformRoot'."
            }
        }

        if (-not (Test-RepoPathWithinRoot -RelativePath $archiveRoot -Root $activeDevRoot)) {
            throw "Archive root '$archiveRoot' must be contained by active_dev root '$activeDevRoot'."
        }

        if (-not ($productionForbiddenRoots -contains $testPlatformRoot)) {
            throw 'import_rules.production_must_not_import does not prohibit the authoritative test-platform root.'
        }
        if (-not ($shippingForbiddenRoots -contains $testPlatformRoot)) {
            throw 'shipping_rules.production_bundle_must_exclude does not exclude the authoritative test-platform root.'
        }
        if (-not $testPlatformAllowlistRequired -or -not $productionSeamAllowlistRequired) {
            throw 'Production seam allowlist authority is not enabled.'
        }
        if ($scenarioSpecificProductionAllowed -or $productionValidationUiAllowed -or -not $validationDeviceAgentSeparated) {
            throw 'Manifest permits production scenario/validation authority or does not require validation-device separation.'
        }
        if (-not $archiveIsNonAuthoritative -or -not $archiveExcluded -or -not $activeDocsMustNotDepend) {
            throw 'Archive policy does not establish required inertness.'
        }

        return [pscustomobject]@{
            ManifestPath = $manifestRelativePath
            ProductionRoots = @($productionRoots | Sort-Object -Unique)
            TestPlatformRoot = $testPlatformRoot
            ActiveDevRoot = $activeDevRoot
            ArchiveRoot = $archiveRoot
            ProductionForbiddenRoots = @($productionForbiddenRoots | Sort-Object -Unique)
            ShippingForbiddenRoots = @($shippingForbiddenRoots | Sort-Object -Unique)
            ApprovedProductionImports = @($approvedProductionImports | Sort-Object -Unique)
            FrozenSurfaces = @($frozenSurfaces | Sort-Object -Unique)
            ScenarioSpecificProductionAllowed = $scenarioSpecificProductionAllowed
            ProductionValidationUiAllowed = $productionValidationUiAllowed
        }
    }
    catch {
        Add-Violation 'BOUNDARY_MANIFEST_INVALID' $manifestRelativePath $_.Exception.Message
        return $null
    }
}

function Resolve-RepositoryReference {
    param(
        [Parameter(Mandatory = $true)][string]$OriginRelativePath,
        [Parameter(Mandatory = $true)][string]$Reference,
        [Parameter(Mandatory = $true)][string[]]$KnownRoots,
        [bool]$TreatBareAsRepoRelative = $false
    )

    $normalizedReference = $Reference.Trim().Trim([char]34).Trim([char]39).Replace('\', '/')
    if ([string]::IsNullOrWhiteSpace($normalizedReference)) {
        return $null
    }

    $normalizedReference = $normalizedReference -replace '[*?\[].*$', ''
    if ([string]::IsNullOrWhiteSpace($normalizedReference)) {
        return $null
    }

    foreach ($root in $KnownRoots) {
        $normalizedRoot = Normalize-PolicyRoot $root
        if ($normalizedReference -eq $normalizedRoot -or $normalizedReference.StartsWith("$normalizedRoot/", [System.StringComparison]::Ordinal)) {
            return Normalize-RepoPath $normalizedReference
        }
    }

    if (-not $normalizedReference.StartsWith('.', [System.StringComparison]::Ordinal) -and -not $TreatBareAsRepoRelative) {
        return $null
    }

    $originFullPath = Join-Path $RepoRoot ($OriginRelativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    $baseDirectory = if ($TreatBareAsRepoRelative -and -not $normalizedReference.StartsWith('.', [System.StringComparison]::Ordinal)) {
        $RepoRoot
    }
    else {
        Split-Path -Parent $originFullPath
    }

    try {
        $targetFullPath = [System.IO.Path]::GetFullPath((Join-Path $baseDirectory $normalizedReference))
        $relative = [System.IO.Path]::GetRelativePath($RepoRoot, $targetFullPath)
        if ($relative -eq '..' -or $relative.StartsWith('../', [System.StringComparison]::Ordinal) -or $relative.StartsWith('..\', [System.StringComparison]::Ordinal)) {
            return $null
        }
        return Normalize-RepoPath $relative
    }
    catch {
        return $null
    }
}

function Test-ApprovedProductionImport {
    param(
        [Parameter(Mandatory = $true)][string]$Target,
        [Parameter(Mandatory = $true)][string[]]$Allowlist
    )

    foreach ($rawEntry in $Allowlist) {
        $entry = Normalize-RepoPath $rawEntry
        if ($entry.EndsWith('/**', [System.StringComparison]::Ordinal)) {
            $prefix = $entry.Substring(0, $entry.Length - 3).TrimEnd('/')
            if ($Target -eq $prefix -or $Target.StartsWith("$prefix/", [System.StringComparison]::Ordinal)) {
                return $true
            }
            continue
        }
        if ($Target -eq $entry) {
            return $true
        }

        $entryWithoutExtension = $entry -replace '(?i)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$', ''
        if ($entryWithoutExtension -ne $entry -and $Target -eq $entryWithoutExtension) {
            return $true
        }

        if ($entry -match '(?i)/index\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$') {
            $indexParent = $entry -replace '(?i)/index\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$', ''
            if ($Target -eq $indexParent) {
                return $true
            }
        }
    }
    return $false
}

function Get-BuildScriptFileReferences {
    param([Parameter(Mandatory = $true)][string]$Script)

    $references = [System.Collections.Generic.List[string]]::new()
    $patterns = @(
        '(?i)(?:^|&&|\|\||;)\s*(?:node|tsx|ts-node)\s+(?:--[A-Za-z0-9_-]+(?:=\S+)?\s+)*(?<path>"[^"]+"|''[^'']+''|[A-Za-z0-9_./\\-]+\.(?:mjs|cjs|js|ts))',
        '(?i)(?:^|&&|\|\||;)\s*tsc\b[^;&|]*?(?:-p|--project)\s+(?<path>"[^"]+"|''[^'']+''|[A-Za-z0-9_./\\-]+)',
        '(?i)(?:^|&&|\|\||;)\s*(?:esbuild|rollup|webpack|vite)\s+(?<path>"[^"]+"|''[^'']+''|[A-Za-z0-9_./\\-]+)'
    )
    foreach ($pattern in $patterns) {
        foreach ($match in [regex]::Matches($Script, $pattern)) {
            $references.Add($match.Groups['path'].Value.Trim().Trim([char]34).Trim([char]39)) | Out-Null
        }
    }
    return @($references)
}

function Get-ObjectStringValues {
    param($Value)

    $values = [System.Collections.Generic.List[string]]::new()
    if ($null -eq $Value) {
        return @()
    }
    if ($Value -is [string]) {
        $values.Add($Value) | Out-Null
        return @($values)
    }
    if ($Value -is [System.Collections.IEnumerable] -and $Value -isnot [string]) {
        foreach ($item in $Value) {
            foreach ($nested in Get-ObjectStringValues $item) {
                $values.Add($nested) | Out-Null
            }
        }
        return @($values)
    }
    foreach ($property in $Value.PSObject.Properties) {
        foreach ($nested in Get-ObjectStringValues $property.Value) {
            $values.Add($nested) | Out-Null
        }
    }
    return @($values)
}

function Invoke-TypeScriptArchitectureAnalysis {
    param([Parameter(Mandatory = $true)][object[]]$Requests)

    if ($Requests.Count -eq 0) {
        return @()
    }

    $typescriptModulePath = Join-Path $ScriptRepositoryRoot 'node_modules/typescript/lib/typescript.js'
    if (-not (Test-Path -LiteralPath $typescriptModulePath -PathType Leaf)) {
        Add-Violation 'SOURCE_ANALYZER_UNAVAILABLE' 'node_modules/typescript/lib/typescript.js' 'Installed TypeScript parser is required for semantic architecture analysis.'
        return @()
    }

    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($null -eq $nodeCommand) {
        Add-Violation 'SOURCE_ANALYZER_UNAVAILABLE' '<node>' 'Node.js is required for TypeScript architecture analysis.'
        return @()
    }

    $analyzer = @'
const fs = require("fs");
const path = require("path");
const request = JSON.parse(fs.readFileSync(0, "utf8"));
const ts = require(request.typescriptModulePath);

const sourceRequests = request.files.filter(file => file.mode !== "tsconfig");
const options = {
  allowJs: true,
  checkJs: false,
  noResolve: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS,
  moduleDetection: ts.ModuleDetectionKind ? ts.ModuleDetectionKind.Force : undefined,
};
const program = ts.createProgram({ rootNames: sourceRequests.map(file => file.fullPath), options });
const checker = program.getTypeChecker();

function stringValue(node) {
  return node && ts.isStringLiteralLike(node) ? node.text : null;
}
function declarationNames(name, output) {
  if (!name) return;
  if (ts.isIdentifier(name)) { output.push(name.text); return; }
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) if (ts.isBindingElement(element)) declarationNames(element.name, output);
  }
}
function propertyNameText(name) {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}
function locallyShadowedRequire(identifier, sourceFile) {
  const symbol = checker.getSymbolAtLocation(identifier);
  if (!symbol || !symbol.declarations) return false;
  return symbol.declarations.some(declaration => path.resolve(declaration.getSourceFile().fileName) === path.resolve(sourceFile.fileName));
}
function collectDependencies(sourceFile) {
  const dependencies = [];
  function add(kind, specifier) { if (specifier !== null) dependencies.push({ kind, specifier }); }
  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      add(node.importClause && node.importClause.isTypeOnly ? "import-type" : "import", stringValue(node.moduleSpecifier));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      add(node.isTypeOnly ? "export-type" : "export", stringValue(node.moduleSpecifier));
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      add("import-equals", stringValue(node.moduleReference.expression));
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        add("dynamic-import", stringValue(node.arguments[0]));
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require" && !locallyShadowedRequire(node.expression, sourceFile)) {
        add("require", stringValue(node.arguments[0]));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return dependencies.filter(item => item.specifier !== null);
}

const scenarioName = /^(?:BVP(?:_|$)[A-Za-z0-9_]*|scenario(?:Id|Runner|Step|Fixture|Verdict|Control|Execution|Command|Action)[A-Za-z0-9_]*|validation(?:Scenario|Runner|Control|Mode|Command)[A-Za-z0-9_]*|(?:run|execute|start|resume|advance|select|set|dispatch)[A-Za-z0-9_]*Scenario[A-Za-z0-9_]*)$/i;
function collectScenarioSignals(sourceFile) {
  const signals = [];
  function add(kind, name) { if (name && scenarioName.test(name)) signals.push({ kind, name }); }
  function addBinding(kind, name) { const names = []; declarationNames(name, names); for (const value of names) add(kind, value); }
  function visit(node) {
    if (ts.isVariableDeclaration(node)) addBinding("variable", node.name);
    else if (ts.isParameter(node)) addBinding("parameter", node.name);
    else if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) add("declaration", node.name && node.name.text);
    else if (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) add("member", propertyNameText(node.name));
    else if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) add("property", propertyNameText(node.name));
    else if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) add("call", node.expression.text);
      else if (ts.isPropertyAccessExpression(node.expression)) add("call", node.expression.name.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  const seen = new Set();
  return signals.filter(signal => {
    const key = signal.kind + ":" + signal.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const buildKeys = new Set(["entry", "entries", "entryPoint", "entryPoints", "input", "inputs", "inject", "tsconfig"]);
const buildCallNames = new Set(["build", "buildSync", "context", "defineConfig"]);

function collectBuildReferences(sourceFile) {
  const topLevelValues = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        topLevelValues.set(declaration.name.text, declaration.initializer);
      }
    }
  }

  function staticStrings(node, seen) {
    if (!node) return [];
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(element => staticStrings(element, seen));
    if (ts.isParenthesizedExpression(node)) return staticStrings(node.expression, seen);
    if (ts.isIdentifier(node) && topLevelValues.has(node.text) && !seen.has(node.text)) {
      const nextSeen = new Set(seen);
      nextSeen.add(node.text);
      return staticStrings(topLevelValues.get(node.text), nextSeen);
    }
    return [];
  }

  const references = [];
  function addValues(node) {
    for (const value of staticStrings(node, new Set())) references.push(value);
  }

  function inspectConfig(node, seenIdentifiers = new Set()) {
    if (!node) return;

    if (ts.isParenthesizedExpression(node)) {
      inspectConfig(node.expression, seenIdentifiers);
      return;
    }

    if (ts.isIdentifier(node) && topLevelValues.has(node.text) && !seenIdentifiers.has(node.text)) {
      const nextSeen = new Set(seenIdentifiers);
      nextSeen.add(node.text);
      inspectConfig(topLevelValues.get(node.text), nextSeen);
      return;
    }

    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) inspectConfig(element, seenIdentifiers);
      return;
    }

    if (!ts.isObjectLiteralExpression(node)) return;

    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        const key = propertyNameText(property.name);
        if (key && buildKeys.has(key)) addValues(property.initializer);
        else inspectConfig(property.initializer, seenIdentifiers);
      } else if (ts.isShorthandPropertyAssignment(property)) {
        if (buildKeys.has(property.name.text) && topLevelValues.has(property.name.text)) {
          addValues(topLevelValues.get(property.name.text));
        }
      }
    }
  }

  function callName(expression) {
    if (ts.isIdentifier(expression)) return expression.text;
    if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
    return null;
  }

  function isModuleExports(left) {
    if (!ts.isPropertyAccessExpression(left)) return false;
    if (ts.isIdentifier(left.expression) && left.expression.text === "module" && left.name.text === "exports") return true;
    if (ts.isIdentifier(left.expression) && left.expression.text === "exports") return true;
    return false;
  }

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const name = callName(node.expression);
      if (name && buildCallNames.has(name)) {
        for (const argument of node.arguments) inspectConfig(argument);
      }
    } else if (ts.isExportAssignment(node)) {
      inspectConfig(node.expression);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && isModuleExports(node.left)) {
      inspectConfig(node.right);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...new Set(references)];
}

function collectTsconfigReferences(file) {
  const text = fs.readFileSync(file.fullPath, "utf8");
  const parsed = ts.parseConfigFileTextToJson(file.fullPath, text);
  if (parsed.error) return { errors: [ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n")], buildReferences: [] };
  const config = parsed.config || {};
  const references = [];
  function add(value) {
    if (typeof value === "string") references.push(value);
    else if (Array.isArray(value)) for (const item of value) add(item);
  }
  add(config.files);
  add(config.include);
  add(config.extends);
  if (Array.isArray(config.references)) for (const reference of config.references) if (reference && typeof reference.path === "string") references.push(reference.path);
  if (config.compilerOptions) {
    add(config.compilerOptions.rootDir);
    add(config.compilerOptions.rootDirs);
  }
  return { errors: [], buildReferences: [...new Set(references)] };
}

const results = [];
for (const file of request.files) {
  if (file.mode === "tsconfig") {
    const result = collectTsconfigReferences(file);
    results.push({ path: file.relativePath, mode: file.mode, dependencies: [], scenarioSignals: [], buildReferences: result.buildReferences, errors: result.errors });
    continue;
  }
  const sourceFile = program.getSourceFile(file.fullPath);
  if (!sourceFile) {
    results.push({ path: file.relativePath, mode: file.mode, dependencies: [], scenarioSignals: [], buildReferences: [], errors: ["TypeScript parser did not load source file."] });
    continue;
  }
  const errors = program.getSyntacticDiagnostics(sourceFile).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  results.push({
    path: file.relativePath,
    mode: file.mode,
    dependencies: collectDependencies(sourceFile),
    scenarioSignals: file.mode === "source" ? collectScenarioSignals(sourceFile) : [],
    buildReferences: file.mode === "build" ? collectBuildReferences(sourceFile) : [],
    errors,
  });
}
process.stdout.write(JSON.stringify(results));
'@

    $payload = @{
        typescriptModulePath = $typescriptModulePath
        files = $Requests
    } | ConvertTo-Json -Depth 8 -Compress

    $output = @($payload | & $nodeCommand.Source -e $analyzer 2>&1)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Add-Violation 'SOURCE_ANALYSIS_FAILED' '<typescript-analyzer>' ("TypeScript analyzer exited $exitCode: " + ($output -join ' '))
        return @()
    }

    try {
        $parsed = ($output -join [Environment]::NewLine) | ConvertFrom-Json
        return @($parsed)
    }
    catch {
        Add-Violation 'SOURCE_ANALYSIS_FAILED' '<typescript-analyzer>' ("Unable to parse analyzer output: " + $_.Exception.Message)
        return @()
    }
}

$policy = Get-BoundaryPolicy

if ($null -ne $policy) {
    $knownRoots = @($policy.ProductionRoots + @($policy.TestPlatformRoot))

    $sourceRequests = [System.Collections.Generic.List[object]]::new()
    foreach ($productionRoot in $policy.ProductionRoots) {
        foreach ($file in Get-SourceFiles $productionRoot) {
            $sourceRequests.Add([pscustomobject]@{
                fullPath = $file.FullName
                relativePath = Get-RepoRelativePath $file.FullName
                mode = 'source'
            }) | Out-Null
        }
    }
    foreach ($file in Get-SourceFiles $policy.TestPlatformRoot) {
        $sourceRequests.Add([pscustomobject]@{
            fullPath = $file.FullName
            relativePath = Get-RepoRelativePath $file.FullName
            mode = 'source'
        }) | Out-Null
    }

    $packagePath = Join-Path $RepoRoot 'package.json'
    $package = $null
    if (-not (Test-Path -LiteralPath $packagePath -PathType Leaf)) {
        Add-Violation 'PRODUCTION_BUILD_CONFIGURATION_INVALID' 'package.json' 'Production package.json is required to establish build entrypoints.'
    }
    else {
        try {
            $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
        }
        catch {
            Add-Violation 'PRODUCTION_BUILD_CONFIGURATION_INVALID' 'package.json' ("Unable to parse package.json: " + $_.Exception.Message)
        }
    }

    $buildRequests = [System.Collections.Generic.List[object]]::new()
    $buildRequestPaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)

    function Add-BuildRequest {
        param(
            [Parameter(Mandatory = $true)][string]$RelativePath,
            [Parameter(Mandatory = $true)][string]$Mode
        )

        $normalized = Normalize-RepoPath $RelativePath
        if ($buildRequestPaths.Add("$Mode|$normalized")) {
            $fullPath = Join-Path $RepoRoot ($normalized.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
            if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
                $buildRequests.Add([pscustomobject]@{
                    fullPath = [System.IO.Path]::GetFullPath($fullPath)
                    relativePath = $normalized
                    mode = $Mode
                }) | Out-Null
            }
            else {
                Add-Violation 'PRODUCTION_BUILD_CONFIGURATION_INVALID' $normalized 'Production build configuration references a missing file.'
            }
        }
    }

    if ($null -ne $package) {
        foreach ($fieldName in @('main', 'module', 'browser', 'exports')) {
            $property = $package.PSObject.Properties[$fieldName]
            if ($null -eq $property) { continue }
            foreach ($value in Get-ObjectStringValues $property.Value) {
                $target = Resolve-RepositoryReference -OriginRelativePath 'package.json' -Reference $value -KnownRoots $knownRoots -TreatBareAsRepoRelative $true
                if ($null -ne $target -and (Test-RepoPathWithinAnyRoot -RelativePath $target -Roots $policy.ShippingForbiddenRoots)) {
                    Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' 'package.json' ("Production package field '$fieldName' references forbidden shipping root through '$value'.")
                }
            }
        }

        $scriptsProperty = $package.PSObject.Properties['scripts']
        if ($null -ne $scriptsProperty -and $null -ne $scriptsProperty.Value) {
            foreach ($scriptProperty in $scriptsProperty.Value.PSObject.Properties) {
                if ($scriptProperty.Name -notmatch '^(?:build|verify:build|bundle|package|dist|release)(?::|$)') {
                    continue
                }
                foreach ($reference in Get-BuildScriptFileReferences ([string]$scriptProperty.Value)) {
                    $target = Resolve-RepositoryReference -OriginRelativePath 'package.json' -Reference $reference -KnownRoots $knownRoots -TreatBareAsRepoRelative $true
                    if ($null -eq $target) { continue }
                    if (Test-RepoPathWithinAnyRoot -RelativePath $target -Roots $policy.ShippingForbiddenRoots) {
                        Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' 'package.json' ("Production build script '$($scriptProperty.Name)' directly references forbidden shipping root through '$reference'.")
                        continue
                    }
                    if ($target -match '(?i)tsconfig[^/]*\.json$') {
                        Add-BuildRequest -RelativePath $target -Mode 'tsconfig'
                    }
                    elseif ($target -match '(?i)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$') {
                        Add-BuildRequest -RelativePath $target -Mode 'build'
                    }
                }
            }
        }
    }

    if (Test-Path -LiteralPath (Join-Path $RepoRoot 'tsconfig.json') -PathType Leaf) {
        Add-BuildRequest -RelativePath 'tsconfig.json' -Mode 'tsconfig'
    }
    foreach ($pattern in @('esbuild.config.*', 'rollup.config.*', 'webpack.config.*', 'vite.config.*')) {
        foreach ($file in @(Get-ChildItem -LiteralPath $RepoRoot -File -Filter $pattern -ErrorAction SilentlyContinue)) {
            Add-BuildRequest -RelativePath (Get-RepoRelativePath $file.FullName) -Mode 'build'
        }
    }

    $analysisRequests = @($sourceRequests) + @($buildRequests)
    $analysis = @(Invoke-TypeScriptArchitectureAnalysis -Requests $analysisRequests)

    foreach ($result in $analysis) {
        $relativePath = Normalize-RepoPath ([string]$result.path)

        foreach ($errorText in @($result.errors)) {
            if ([string]::IsNullOrWhiteSpace([string]$errorText)) { continue }
            Add-Violation 'SOURCE_ANALYSIS_FAILED' $relativePath ([string]$errorText)
        }

        if ($result.mode -eq 'source') {
            $isProduction = Test-RepoPathWithinAnyRoot -RelativePath $relativePath -Roots $policy.ProductionRoots
            $isTestPlatform = Test-RepoPathWithinRoot -RelativePath $relativePath -Root $policy.TestPlatformRoot

            foreach ($dependency in @($result.dependencies)) {
                $specifier = [string]$dependency.specifier
                $target = Resolve-RepositoryReference -OriginRelativePath $relativePath -Reference $specifier -KnownRoots $knownRoots
                if ($null -eq $target) { continue }

                if ($isProduction -and (Test-RepoPathWithinAnyRoot -RelativePath $target -Roots $policy.ProductionForbiddenRoots)) {
                    Add-Violation 'PRODUCTION_IMPORTS_TEST_PLATFORM' $relativePath ("Actual $($dependency.kind) dependency '$specifier' resolves into forbidden root '$target'.")
                }

                if ($isTestPlatform -and (Test-RepoPathWithinAnyRoot -RelativePath $target -Roots $policy.ProductionRoots)) {
                    if (-not (Test-ApprovedProductionImport -Target $target -Allowlist $policy.ApprovedProductionImports)) {
                        Add-Violation 'TEST_PLATFORM_IMPORTS_UNAPPROVED_PRODUCTION' $relativePath ("Actual $($dependency.kind) dependency '$specifier' resolves into production '$target' without an approved seam entry.")
                    }
                }
            }

            if ($isProduction -and -not $policy.ScenarioSpecificProductionAllowed) {
                foreach ($signal in @($result.scenarioSignals)) {
                    Add-Violation 'PRODUCTION_SCENARIO_CONTROL' $relativePath ("Executable production $($signal.kind) '$($signal.name)' introduces prohibited BVP/validation scenario authority.")
                }
            }
        }
        elseif ($result.mode -eq 'build') {
            foreach ($dependency in @($result.dependencies)) {
                $specifier = [string]$dependency.specifier
                $target = Resolve-RepositoryReference -OriginRelativePath $relativePath -Reference $specifier -KnownRoots $knownRoots
                if ($null -ne $target -and (Test-RepoPathWithinAnyRoot -RelativePath $target -Roots $policy.ShippingForbiddenRoots)) {
                    Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' $relativePath ("Actual build dependency '$specifier' resolves into forbidden shipping root '$target'.")
                }
            }
            foreach ($reference in @($result.buildReferences)) {
                $target = Resolve-RepositoryReference -OriginRelativePath $relativePath -Reference ([string]$reference) -KnownRoots $knownRoots -TreatBareAsRepoRelative $true
                if ($null -ne $target -and (Test-RepoPathWithinAnyRoot -RelativePath $target -Roots $policy.ShippingForbiddenRoots)) {
                    Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' $relativePath ("Actual build input/reference '$reference' resolves into forbidden shipping root '$target'.")
                }
            }
        }
        elseif ($result.mode -eq 'tsconfig') {
            foreach ($reference in @($result.buildReferences)) {
                $target = Resolve-RepositoryReference -OriginRelativePath $relativePath -Reference ([string]$reference) -KnownRoots $knownRoots -TreatBareAsRepoRelative $true
                if ($null -ne $target -and (Test-RepoPathWithinAnyRoot -RelativePath $target -Roots $policy.ShippingForbiddenRoots)) {
                    Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' $relativePath ("Production TypeScript build input/reference '$reference' resolves into forbidden shipping root '$target'.")
                }
            }
        }
    }

    $mainBundlePath = Join-Path $RepoRoot 'main.js'
    if (Test-Path -LiteralPath $mainBundlePath -PathType Leaf) {
        $bundleContent = Get-Content -LiteralPath $mainBundlePath -Raw
        if ($bundleContent.Contains('BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL', [System.StringComparison]::Ordinal)) {
            Add-Violation 'PRODUCTION_BUNDLE_CONTAINS_TEST_PLATFORM' 'main.js' 'Shipping bundle contains the BVP non-shipping sentinel.'
        }
    }

    $testPlatformFullRoot = Join-Path $RepoRoot $policy.TestPlatformRoot
    if (Test-Path -LiteralPath $testPlatformFullRoot -PathType Container) {
        foreach ($file in @(Get-ChildItem -LiteralPath $testPlatformFullRoot -Recurse -File -Filter '*.ps1')) {
            Add-Violation 'TEST_PLATFORM_POWERSHELL_PROHIBITED' (Get-RepoRelativePath $file.FullName) 'PowerShell scripts are prohibited beneath the authoritative test-platform root.'
        }
    }

    $activeDevFullRoot = Join-Path $RepoRoot $policy.ActiveDevRoot
    if (Test-Path -LiteralPath $activeDevFullRoot -PathType Container) {
        $authorityTerms = '(?i)\b(?:execute|executing|use|using|read|follow|prompt|task|authority|authoritative|governing|required input|source of truth|depend|depends|dependency)\b'
        $historicalTerms = '(?i)\b(?:historical|non-authoritative|non authoritative|archived|must not|do not|excluded|exclude|ignore|superseded|provenance|no\s+(?:use|reliance|dependency|authority))\b'
        $archivePrefix = [regex]::Escape((Normalize-RepoPath $policy.ArchiveRoot))
        $archiveReference = '(?i)(?:^|[\s(''"])(?:\./)?' + $archivePrefix + '/[^\s)''"]*'

        foreach ($file in @(Get-ChildItem -LiteralPath $activeDevFullRoot -Recurse -File -Filter '*.md')) {
            $relativePath = Get-RepoRelativePath $file.FullName
            if (Test-RepoPathWithinRoot -RelativePath $relativePath -Root $policy.ArchiveRoot) {
                continue
            }

            $lineNumber = 0
            foreach ($line in Get-Content -LiteralPath $file.FullName) {
                $lineNumber++
                if ($line -match $archiveReference -and $line -match $authorityTerms -and $line -notmatch $historicalTerms) {
                    Add-Violation 'ARCHIVE_USED_AS_CURRENT_AUTHORITY' $relativePath ("Line $lineNumber treats authoritative archive root as current task/design/implementation authority.")
                }
            }
        }
    }

    if ($ChangedPath.Count -gt 0 -and $ChangeClass -eq 'ordinary') {
        foreach ($rawChangedPath in $ChangedPath) {
            foreach ($piece in ($rawChangedPath -split '[,;\r\n]+')) {
                if ([string]::IsNullOrWhiteSpace($piece)) { continue }
                $changed = Normalize-RepoPath $piece
                foreach ($frozen in $policy.FrozenSurfaces) {
                    if ($changed -eq $frozen -or $changed.StartsWith("$frozen/", [System.StringComparison]::Ordinal)) {
                        Add-Violation 'FROZEN_SURFACE_CHANGED' $changed ("Ordinary work changed supervisor-owned frozen surface '$frozen'.")
                        break
                    }
                }
            }
        }
    }
}

if ($violations.Count -gt 0) {
    foreach ($violation in $violations) {
        Write-Output ("ARCH_GUARD_VIOLATION rule={0} path={1} detail={2}" -f $violation.Rule, $violation.Path, $violation.Detail)
    }
    Write-Output ("ARCH_GUARD_RESULT=FAIL violations={0}" -f $violations.Count)
    exit 1
}

Write-Output 'ARCH_GUARD_RESULT=PASS violations=0'
exit 0