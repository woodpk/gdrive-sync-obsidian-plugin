[CmdletBinding()]
param(
    [string]$RepoRoot,
    [string[]]$ChangedPath = @()
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

$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    Write-Output "ARCH_GUARD_ERROR rule=INPUT path=$RepoRoot detail=Repository root does not exist."
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

function Get-SourceFiles {
    param([Parameter(Mandatory = $true)][string]$RelativeRoot)

    $root = Join-Path $RepoRoot $RelativeRoot
    if (-not (Test-Path -LiteralPath $root -PathType Container)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $root -Recurse -File | Where-Object {
        $_.Extension -in @('.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs')
    })
}

function Test-JavaScriptIdentifierStart {
    param([char]$Character)

    return [char]::IsLetter($Character) -or $Character -eq '_' -or $Character -eq '$'
}

function Test-JavaScriptIdentifierPart {
    param([char]$Character)

    return [char]::IsLetterOrDigit($Character) -or $Character -eq '_' -or $Character -eq '$'
}

function Test-JavaScriptKeywordAllowsRegexAfter {
    param([Parameter(Mandatory = $true)][string]$Keyword)

    return $Keyword -in @(
        'await',
        'case',
        'delete',
        'do',
        'else',
        'in',
        'instanceof',
        'new',
        'of',
        'return',
        'throw',
        'typeof',
        'void',
        'yield'
    )
}

function Test-JavaScriptControlHeaderKeyword {
    param([Parameter(Mandatory = $true)][string]$Keyword)

    return $Keyword -in @(
        'catch',
        'for',
        'if',
        'switch',
        'while',
        'with'
    )
}

function Skip-JavaScriptRegexLiteral {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][ref]$Index
    )

    $Index.Value = $Index.Value + 1
    $inCharacterClass = $false
    while ($Index.Value -lt $Content.Length) {
        $character = $Content[$Index.Value]

        if ($character -eq [char]92 -and ($Index.Value + 1) -lt $Content.Length) {
            $Index.Value = $Index.Value + 2
            continue
        }

        if ($character -eq [char]91) {
            $inCharacterClass = $true
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]93 -and $inCharacterClass) {
            $inCharacterClass = $false
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]47 -and -not $inCharacterClass) {
            $Index.Value = $Index.Value + 1
            while ($Index.Value -lt $Content.Length -and [char]::IsLetter($Content[$Index.Value])) {
                $Index.Value = $Index.Value + 1
            }
            return
        }

        if ($character -eq [char]10 -or $character -eq [char]13) {
            return
        }

        $Index.Value = $Index.Value + 1
    }
}

function Read-JavaScriptTemplateLiteral {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][ref]$Index,
        [Parameter(Mandatory = $true)]$Tokens
    )

    $Index.Value = $Index.Value + 1
    while ($Index.Value -lt $Content.Length) {
        $character = $Content[$Index.Value]

        if ($character -eq [char]92 -and ($Index.Value + 1) -lt $Content.Length) {
            $Index.Value = $Index.Value + 2
            continue
        }

        if ($character -eq [char]96) {
            $Index.Value = $Index.Value + 1
            return
        }

        if ($character -eq [char]36 -and ($Index.Value + 1) -lt $Content.Length -and $Content[$Index.Value + 1] -eq [char]123) {
            $Index.Value = $Index.Value + 2
            Read-JavaScriptTokens -Content $Content -Index $Index -Tokens $Tokens -StopAtTemplateExpressionEnd $true
            continue
        }

        $Index.Value = $Index.Value + 1
    }
}

function Read-JavaScriptTokens {
    param(
        [Parameter(Mandatory = $true)][string]$Content,
        [Parameter(Mandatory = $true)][ref]$Index,
        [Parameter(Mandatory = $true)]$Tokens,
        [bool]$StopAtTemplateExpressionEnd = $false
    )

    $braceDepth = 0
    $braceContexts = [System.Collections.Generic.Stack[string]]::new()
    $parenContexts = [System.Collections.Generic.Stack[string]]::new()
    $previousToken = $null
    $regexCanStart = $true
    $statementBodyExpected = $false

    while ($Index.Value -lt $Content.Length) {
        $character = $Content[$Index.Value]

        if ([char]::IsWhiteSpace($character)) {
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($StopAtTemplateExpressionEnd -and $character -eq [char]125 -and $braceDepth -eq 0) {
            $Index.Value = $Index.Value + 1
            return
        }

        if ($character -eq [char]47 -and ($Index.Value + 1) -lt $Content.Length) {
            $nextCharacter = $Content[$Index.Value + 1]

            if ($nextCharacter -eq [char]47) {
                $Index.Value = $Index.Value + 2
                while ($Index.Value -lt $Content.Length -and $Content[$Index.Value] -ne [char]10 -and $Content[$Index.Value] -ne [char]13) {
                    $Index.Value = $Index.Value + 1
                }
                continue
            }

            if ($nextCharacter -eq [char]42) {
                $Index.Value = $Index.Value + 2
                while (($Index.Value + 1) -lt $Content.Length) {
                    if ($Content[$Index.Value] -eq [char]42 -and $Content[$Index.Value + 1] -eq [char]47) {
                        $Index.Value = $Index.Value + 2
                        break
                    }
                    $Index.Value = $Index.Value + 1
                }
                continue
            }

            if ($regexCanStart) {
                Skip-JavaScriptRegexLiteral -Content $Content -Index $Index
                $token = [pscustomobject]@{
                    Kind = 'value'
                    Value = '<regex>'
                }
                $Tokens.Add($token) | Out-Null
                $previousToken = $token
                $regexCanStart = $false
                $statementBodyExpected = $false
                continue
            }

            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = '/'
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $true
            $statementBodyExpected = $false
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]39 -or $character -eq [char]34) {
            $quote = $character
            $builder = [System.Text.StringBuilder]::new()
            $Index.Value = $Index.Value + 1
            while ($Index.Value -lt $Content.Length) {
                $stringCharacter = $Content[$Index.Value]

                if ($stringCharacter -eq [char]92 -and ($Index.Value + 1) -lt $Content.Length) {
                    $escapedCharacter = $Content[$Index.Value + 1]
                    if ($escapedCharacter -ne [char]10 -and $escapedCharacter -ne [char]13) {
                        $builder.Append($escapedCharacter) | Out-Null
                    }
                    $Index.Value = $Index.Value + 2
                    continue
                }

                if ($stringCharacter -eq $quote) {
                    $Index.Value = $Index.Value + 1
                    break
                }

                $builder.Append($stringCharacter) | Out-Null
                $Index.Value = $Index.Value + 1
            }

            $token = [pscustomobject]@{
                Kind = 'string'
                Value = $builder.ToString()
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $false
            $statementBodyExpected = $false
            continue
        }

        if ($character -eq [char]96) {
            Read-JavaScriptTemplateLiteral -Content $Content -Index $Index -Tokens $Tokens
            $token = [pscustomobject]@{
                Kind = 'value'
                Value = '<template>'
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $false
            $statementBodyExpected = $false
            continue
        }

        if (Test-JavaScriptIdentifierStart $character) {
            $start = $Index.Value
            $Index.Value = $Index.Value + 1
            while ($Index.Value -lt $Content.Length -and (Test-JavaScriptIdentifierPart $Content[$Index.Value])) {
                $Index.Value = $Index.Value + 1
            }

            $identifier = $Content.Substring($start, $Index.Value - $start)
            $token = [pscustomobject]@{
                Kind = 'identifier'
                Value = $identifier
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = Test-JavaScriptKeywordAllowsRegexAfter $identifier
            $statementBodyExpected = $identifier -in @('do', 'else')
            continue
        }

        if ([char]::IsDigit($character)) {
            $Index.Value = $Index.Value + 1
            while ($Index.Value -lt $Content.Length -and $Content[$Index.Value] -match '[A-Za-z0-9_.]') {
                $Index.Value = $Index.Value + 1
            }

            $token = [pscustomobject]@{
                Kind = 'value'
                Value = '<number>'
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $false
            $statementBodyExpected = $false
            continue
        }

        if ($character -eq [char]40) {
            $parenKind = 'expression'
            if ($null -ne $previousToken -and
                $previousToken.Kind -eq 'identifier' -and
                (Test-JavaScriptControlHeaderKeyword $previousToken.Value)) {
                $parenKind = 'statement-header'
            }
            $parenContexts.Push($parenKind)

            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = '('
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $true
            $statementBodyExpected = $false
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]41) {
            $parenKind = 'expression'
            if ($parenContexts.Count -gt 0) {
                $parenKind = $parenContexts.Pop()
            }

            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = ')'
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token

            if ($parenKind -eq 'statement-header') {
                $regexCanStart = $true
                $statementBodyExpected = $true
            }
            else {
                $regexCanStart = $false
                $statementBodyExpected = $false
            }

            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]123) {
            $braceKind = 'expression'
            if ($statementBodyExpected -or
                $null -eq $previousToken -or
                ($previousToken.Kind -eq 'punctuation' -and $previousToken.Value -in @(')', '}', ';')) -or
                ($previousToken.Kind -eq 'identifier' -and $previousToken.Value -in @('else', 'do', 'try', 'finally'))) {
                $braceKind = 'block'
            }
            $braceContexts.Push($braceKind)
            $braceDepth++

            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = '{'
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $true
            $statementBodyExpected = $false
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]125) {
            $braceKind = 'expression'
            if ($braceContexts.Count -gt 0) {
                $braceKind = $braceContexts.Pop()
            }
            if ($braceDepth -gt 0) {
                $braceDepth--
            }

            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = '}'
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $braceKind -eq 'block'
            $statementBodyExpected = $braceKind -eq 'block'
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]91) {
            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = '['
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $true
            $statementBodyExpected = $false
            $Index.Value = $Index.Value + 1
            continue
        }

        if ($character -eq [char]93) {
            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = ']'
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = $false
            $statementBodyExpected = $false
            $Index.Value = $Index.Value + 1
            continue
        }

        if (($character -eq [char]43 -or $character -eq [char]45) -and
            ($Index.Value + 1) -lt $Content.Length -and
            $Content[$Index.Value + 1] -eq $character) {
            $wasExpressionComplete = -not $regexCanStart
            $operator = ([string]$character) + ([string]$character)
            $token = [pscustomobject]@{
                Kind = 'punctuation'
                Value = $operator
            }
            $Tokens.Add($token) | Out-Null
            $previousToken = $token
            $regexCanStart = -not $wasExpressionComplete
            $statementBodyExpected = $false
            $Index.Value = $Index.Value + 2
            continue
        }

        $punctuation = [string]$character
        $token = [pscustomobject]@{
            Kind = 'punctuation'
            Value = $punctuation
        }
        $Tokens.Add($token) | Out-Null
        $previousToken = $token
        $statementBodyExpected = $false

        if ($punctuation -eq '.' -or $punctuation -eq '?') {
            $regexCanStart = $punctuation -eq '?'
        }
        elseif ($punctuation -eq ';' -or $punctuation -eq ',' -or $punctuation -eq ':' -or
                $punctuation -in @('=', '+', '-', '*', '%', '&', '|', '^', '!', '~', '<', '>')) {
            $regexCanStart = $true
        }
        else {
            $regexCanStart = $true
        }

        $Index.Value = $Index.Value + 1
    }
}

function Get-JavaScriptTokens {
    param([Parameter(Mandatory = $true)][string]$Content)

    $tokens = [System.Collections.Generic.List[object]]::new()
    $index = 0
    Read-JavaScriptTokens -Content $Content -Index ([ref]$index) -Tokens $tokens
    return @($tokens)
}

function Get-ModuleSpecifiers {
    param([Parameter(Mandatory = $true)][string]$Content)

    $tokens = @(Get-JavaScriptTokens $Content)
    $specifiers = [System.Collections.Generic.List[string]]::new()

    for ($index = 0; $index -lt $tokens.Count; $index++) {
        $token = $tokens[$index]
        if ($token.Kind -ne 'identifier') {
            continue
        }

        if ($token.Value -eq 'require') {
            $isPropertyAccess = $index -gt 0 -and $tokens[$index - 1].Kind -eq 'punctuation' -and $tokens[$index - 1].Value -eq '.'
            if (-not $isPropertyAccess -and ($index + 2) -lt $tokens.Count -and
                $tokens[$index + 1].Kind -eq 'punctuation' -and $tokens[$index + 1].Value -eq '(' -and
                $tokens[$index + 2].Kind -eq 'string') {
                $specifiers.Add($tokens[$index + 2].Value) | Out-Null
            }
            continue
        }

        if ($token.Value -eq 'import') {
            $isPropertyAccess = $index -gt 0 -and $tokens[$index - 1].Kind -eq 'punctuation' -and $tokens[$index - 1].Value -eq '.'
            if ($isPropertyAccess) {
                continue
            }

            if (($index + 2) -lt $tokens.Count -and
                $tokens[$index + 1].Kind -eq 'punctuation' -and $tokens[$index + 1].Value -eq '(' -and
                $tokens[$index + 2].Kind -eq 'string') {
                $specifiers.Add($tokens[$index + 2].Value) | Out-Null
                continue
            }

            if (($index + 1) -lt $tokens.Count -and $tokens[$index + 1].Kind -eq 'string') {
                $specifiers.Add($tokens[$index + 1].Value) | Out-Null
                continue
            }
        }

        if ($token.Value -ne 'import' -and $token.Value -ne 'export') {
            continue
        }

        for ($scan = $index + 1; $scan -lt $tokens.Count; $scan++) {
            $candidate = $tokens[$scan]
            if ($candidate.Kind -eq 'punctuation' -and $candidate.Value -eq ';') {
                break
            }

            if ($candidate.Kind -eq 'identifier' -and $candidate.Value -eq 'from' -and
                ($scan + 1) -lt $tokens.Count -and $tokens[$scan + 1].Kind -eq 'string') {
                $specifiers.Add($tokens[$scan + 1].Value) | Out-Null
                break
            }
        }
    }

    return @($specifiers)
}

function Resolve-RepositoryModuleTarget {
    param(
        [Parameter(Mandatory = $true)][string]$ImporterRelativePath,
        [Parameter(Mandatory = $true)][string]$Specifier
    )

    $normalizedSpecifier = $Specifier.Replace('\', '/')
    if ($normalizedSpecifier -match '^(?:src|test-platform)(?:/|$)') {
        return Normalize-RepoPath $normalizedSpecifier
    }

    if (-not $normalizedSpecifier.StartsWith('.', [System.StringComparison]::Ordinal)) {
        return $null
    }

    $importerFullPath = Join-Path $RepoRoot ($ImporterRelativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
    $importerDirectory = Split-Path -Parent $importerFullPath
    $targetFullPath = [System.IO.Path]::GetFullPath((Join-Path $importerDirectory $normalizedSpecifier))
    $relative = [System.IO.Path]::GetRelativePath($RepoRoot, $targetFullPath)
    if ($relative -eq '..' -or $relative.StartsWith('../', [System.StringComparison]::Ordinal) -or $relative.StartsWith('..\', [System.StringComparison]::Ordinal)) {
        return $null
    }
    return Normalize-RepoPath $relative
}

function Test-ContainsTestPlatformReference {
    param([AllowEmptyString()][string]$Text)
    return $Text -match '(?i)(?:^|[\\/])test-platform(?:[\\/]|$)|\btest-platform[\\/]'
}

function Test-ObjectForTestPlatformReference {
    param($Value)

    if ($null -eq $Value) { return $false }
    if ($Value -is [string]) { return Test-ContainsTestPlatformReference $Value }
    if ($Value -is [System.Collections.IDictionary]) {
        foreach ($key in $Value.Keys) {
            if (Test-ContainsTestPlatformReference ([string]$key)) { return $true }
            if (Test-ObjectForTestPlatformReference $Value[$key]) { return $true }
        }
        return $false
    }
    if ($Value -is [System.Collections.IEnumerable] -and $Value -isnot [string]) {
        foreach ($item in $Value) {
            if (Test-ObjectForTestPlatformReference $item) { return $true }
        }
        return $false
    }
    foreach ($property in $Value.PSObject.Properties) {
        if (Test-ContainsTestPlatformReference $property.Name) { return $true }
        if (Test-ObjectForTestPlatformReference $property.Value) { return $true }
    }
    return $false
}

# Rule 1: production source must not import the test platform.
foreach ($file in Get-SourceFiles 'src') {
    $relativePath = Get-RepoRelativePath $file.FullName
    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($specifier in Get-ModuleSpecifiers $content) {
        $target = Resolve-RepositoryModuleTarget -ImporterRelativePath $relativePath -Specifier $specifier
        if ($null -ne $target -and $target -match '^test-platform(?:/|$)') {
            Add-Violation 'PRODUCTION_IMPORTS_TEST_PLATFORM' $relativePath "Module specifier '$specifier' resolves into test-platform/."
        }
    }
}

# Rule 2: ordinary production build inputs/configuration and the shipping bundle must exclude test-platform code.
$packagePath = Join-Path $RepoRoot 'package.json'
if (Test-Path -LiteralPath $packagePath -PathType Leaf) {
    try {
        $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
        foreach ($fieldName in @('main', 'module', 'browser', 'exports')) {
            $property = $package.PSObject.Properties[$fieldName]
            if ($null -ne $property -and (Test-ObjectForTestPlatformReference $property.Value)) {
                Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' 'package.json' "Production package field '$fieldName' references test-platform/."
            }
        }
        $scriptsProperty = $package.PSObject.Properties['scripts']
        if ($null -ne $scriptsProperty -and $null -ne $scriptsProperty.Value) {
            foreach ($scriptProperty in $scriptsProperty.Value.PSObject.Properties) {
                if ($scriptProperty.Name -match '^(?:build|verify:build|bundle|package|dist|release)(?::|$)' -and (Test-ContainsTestPlatformReference ([string]$scriptProperty.Value))) {
                    Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' 'package.json' "Production build script '$($scriptProperty.Name)' references test-platform/."
                }
            }
        }
    }
    catch {
        Add-Violation 'PRODUCTION_BUILD_CONFIGURATION_INVALID' 'package.json' "Unable to parse package.json: $($_.Exception.Message)"
    }
}

$buildConfigCandidates = [System.Collections.Generic.List[string]]::new()
foreach ($relativePath in @('tsconfig.json')) {
    if (Test-Path -LiteralPath (Join-Path $RepoRoot $relativePath) -PathType Leaf) {
        $buildConfigCandidates.Add($relativePath) | Out-Null
    }
}
foreach ($pattern in @('esbuild.config.*', 'rollup.config.*', 'webpack.config.*', 'vite.config.*')) {
    foreach ($file in @(Get-ChildItem -LiteralPath $RepoRoot -File -Filter $pattern -ErrorAction SilentlyContinue)) {
        $buildConfigCandidates.Add((Get-RepoRelativePath $file.FullName)) | Out-Null
    }
}
$scriptsRoot = Join-Path $RepoRoot 'scripts'
if (Test-Path -LiteralPath $scriptsRoot -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $scriptsRoot -Recurse -File | Where-Object {
        $_.Name -match '(?i)(?:^|[-_.])(build|bundle|package)(?:[-_.]|$)'
    })) {
        $buildConfigCandidates.Add((Get-RepoRelativePath $file.FullName)) | Out-Null
    }
}
foreach ($relativePath in @($buildConfigCandidates | Sort-Object -Unique)) {
    $fullPath = Join-Path $RepoRoot $relativePath
    $content = Get-Content -LiteralPath $fullPath -Raw
    if (Test-ContainsTestPlatformReference $content) {
        Add-Violation 'PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM' $relativePath 'Production build configuration or entrypoint references test-platform/.'
    }
}

$mainBundlePath = Join-Path $RepoRoot 'main.js'
if (Test-Path -LiteralPath $mainBundlePath -PathType Leaf) {
    $bundleContent = Get-Content -LiteralPath $mainBundlePath -Raw
    if ($bundleContent.Contains('BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL', [System.StringComparison]::Ordinal)) {
        Add-Violation 'PRODUCTION_BUNDLE_CONTAINS_TEST_PLATFORM' 'main.js' 'Shipping bundle contains the BVP non-shipping sentinel.'
    }
}

# Rule 3: production source must not contain BVP/validation scenario IDs or scenario execution controls.
$scenarioPatterns = @(
    '(?i)\bBVP[-_][A-Za-z0-9][A-Za-z0-9_.-]*\b',
    '(?i)\bscenario(?:Id|Runner|Step|Fixture|Verdict|Control|Execution)\b',
    '(?i)\b(?:run|execute|start|resume|advance|select|set)[A-Za-z0-9_]*Scenario\b',
    '(?i)\bvalidation(?:Scenario|Runner|Control|Mode)\b'
)
foreach ($file in Get-SourceFiles 'src') {
    $relativePath = Get-RepoRelativePath $file.FullName
    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($pattern in $scenarioPatterns) {
        if ($content -match $pattern) {
            Add-Violation 'PRODUCTION_SCENARIO_CONTROL' $relativePath 'Production source contains a prohibited BVP/validation scenario identifier or control surface.'
            break
        }
    }
}

# Rule 4: test-platform imports of production src are denied until an explicit production-import allowlist exists.
foreach ($file in Get-SourceFiles 'test-platform') {
    $relativePath = Get-RepoRelativePath $file.FullName
    $content = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($specifier in Get-ModuleSpecifiers $content) {
        $target = Resolve-RepositoryModuleTarget -ImporterRelativePath $relativePath -Specifier $specifier
        if ($null -ne $target -and $target -match '^src(?:/|$)') {
            Add-Violation 'TEST_PLATFORM_IMPORTS_UNAPPROVED_PRODUCTION' $relativePath "Module specifier '$specifier' resolves into production src/ but no production-import allowlist entry is defined."
        }
    }
}

# Rule 5: PowerShell is prohibited beneath test-platform/.
$testPlatformRoot = Join-Path $RepoRoot 'test-platform'
if (Test-Path -LiteralPath $testPlatformRoot -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $testPlatformRoot -Recurse -File -Filter '*.ps1')) {
        Add-Violation 'TEST_PLATFORM_POWERSHELL_PROHIBITED' (Get-RepoRelativePath $file.FullName) 'PowerShell scripts are prohibited beneath test-platform/.'
    }
}

# Rule 6: active BVP planning/tasking must not treat archive material as current executable authority.
$activeBvpDocs = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
$planningRoot = Join-Path $RepoRoot 'dev/planning-and-building'
if (Test-Path -LiteralPath $planningRoot -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $planningRoot -File -Filter 'testing-platform*.md')) {
        $activeBvpDocs.Add($file) | Out-Null
    }
}
$bvpTaskRoot = Join-Path $RepoRoot 'dev/agents/st2a/ph6/05-bvp'
if (Test-Path -LiteralPath $bvpTaskRoot -PathType Container) {
    foreach ($file in @(Get-ChildItem -LiteralPath $bvpTaskRoot -Recurse -File -Filter '*.md')) {
        $activeBvpDocs.Add($file) | Out-Null
    }
}
$authorityTerms = '(?i)\b(?:execute|executing|use|using|read|follow|prompt|task|authority|authoritative|governing|required input|source of truth)\b'
$historicalTerms = '(?i)\b(?:historical|non-authoritative|non authoritative|archived|must not|do not|excluded|exclude|ignore|superseded|no\s+(?:use|reliance|dependency|authority))\b'
$archiveMarkdownLink = '(?i)\[[^\]]+\]\(\s*(?:\./)?dev/archive/[^)]+\)'
$archiveImperativeReference = '(?i)\b(?:execute|read|follow|use)\b.*dev/archive/[^\s`)]*'
foreach ($file in @($activeBvpDocs | Sort-Object FullName -Unique)) {
    $relativePath = Get-RepoRelativePath $file.FullName
    $lineNumber = 0
    foreach ($line in Get-Content -LiteralPath $file.FullName) {
        $lineNumber++
        $currentAuthorityReference = (($line -match $archiveMarkdownLink -and $line -match $authorityTerms) -or $line -match $archiveImperativeReference)
        if ($line -match 'dev/archive/' -and $currentAuthorityReference -and $line -notmatch $historicalTerms) {
            Add-Violation 'ARCHIVE_USED_AS_CURRENT_AUTHORITY' $relativePath "Line $lineNumber treats dev/archive/ material as current task/execution authority."
        }
    }
}

# Rule 7: changed-path enforcement for supervisor-owned frozen surfaces in normal work packages.
if ($ChangedPath.Count -gt 0) {
    $manifestRelativePath = 'dev/governance/testing-platform-boundary.yaml'
    $manifestPath = Join-Path $RepoRoot $manifestRelativePath
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        Add-Violation 'BOUNDARY_MANIFEST_MISSING' $manifestRelativePath 'Frozen-surface enforcement requires the architecture boundary manifest.'
    }
    else {
        $manifestLines = Get-Content -LiteralPath $manifestPath
        $inFrozenSection = $false
        $frozenPaths = [System.Collections.Generic.List[string]]::new()
        foreach ($line in $manifestLines) {
            if ($line -match '^supervisor_owned_frozen_surfaces:\s*$') {
                $inFrozenSection = $true
                continue
            }
            if (-not $inFrozenSection) { continue }
            if ($line -match '^\S') { break }
            if ($line -match '^\s+-\s+(?<surface>.+?)\s*$') {
                $surface = $matches['surface'].Trim().Trim([char]39).Trim([char]34)
                if ($surface -match '^(?<path>[A-Za-z0-9._/-]+)$') {
                    $frozenPaths.Add((Normalize-RepoPath $matches['path'])) | Out-Null
                }
                elseif ($surface -match '(?<path>[A-Za-z0-9._/-]+\.[A-Za-z0-9._-]+)\s*$') {
                    $frozenPaths.Add((Normalize-RepoPath $matches['path'])) | Out-Null
                }
            }
        }

        foreach ($rawChangedPath in $ChangedPath) {
            foreach ($piece in ($rawChangedPath -split '[,;\r\n]+')) {
                if ([string]::IsNullOrWhiteSpace($piece)) { continue }
                $changed = Normalize-RepoPath $piece
                foreach ($frozen in @($frozenPaths | Sort-Object -Unique)) {
                    if ($changed -eq $frozen -or $changed.StartsWith("$frozen/", [System.StringComparison]::Ordinal)) {
                        Add-Violation 'FROZEN_SURFACE_CHANGED' $changed "Normal work package changed supervisor-owned frozen surface '$frozen'."
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
