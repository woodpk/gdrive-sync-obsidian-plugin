[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$BaseSha = "6da8794b947c51b6e5cc4a15a467215d2fe37831"
$VerifierPath = "dev/scripts/Invoke-BvpS02LegacyHarnessRetirementVerification.ps1"
$EvidencePath = "dev/_ca-output.md"

$RequiredDeletions = @(
  "src/validation/c-series-composition.ts",
  "src/validation/coordination-evidence-contracts.ts",
  "src/validation/cross-device-coordinator.ts",
  "src/validation/driver-plan-fault-verifier-contracts.ts",
  "src/validation/fixture-manager.ts",
  "src/validation/human-checkpoint-resume-controller.ts",
  "src/validation/index.ts",
  "src/validation/plan-assertion-engine.ts",
  "src/validation/production-diagnostic-correlation.ts",
  "src/validation/production-path-driver.ts",
  "src/validation/run-sandbox-checkpoint-contracts.ts",
  "src/validation/safety-sandbox.ts",
  "src/validation/scenario-evidence-recorder.ts",
  "src/validation/scenario-runner-contracts.ts",
  "src/validation/scenario-runner-core.ts",
  "src/validation/scenario-runner-durable-state.ts",
  "src/validation/scenario-runner-module-adapter.ts",
  "src/validation/scenario-runner.ts",
  "src/validation/scenarios/c03-ios-update-windows-download.ts",
  "src/validation/scenarios/c04-ios-move-windows-move.ts",
  "src/validation/scenarios/c05-ios-delete-windows-trash.ts",
  "src/validation/scenarios/c06-windows-create-ios-download.ts",
  "src/validation/scenarios/c07-windows-update-ios-download.ts",
  "src/validation/scenarios/c08-windows-move-ios-move.ts",
  "src/validation/scenarios/c09-windows-delete-ios-trash.ts",
  "src/validation/state-ambiguity-cancel-fault-hooks.ts",
  "src/validation/state-convergence-verifier.ts",
  "src/validation/transport-coverage-faults.ts",
  "src/validation/validation-mode-runtime.ts",
  "src/diagnostics/production-diagnostic-correlation.ts",
  "test/phase6-h6c-production-diagnostic-correlation.test.ts",
  "test/validation-c-series-composition.test.ts",
  "test/validation-c03-ios-update-windows-download.test.ts",
  "test/validation-c04-ios-move-windows-move-correction.test.ts",
  "test/validation-c05-ios-delete-windows-trash.test.ts",
  "test/validation-c06-h6b-registration.test.ts",
  "test/validation-c07-windows-update-ios-download.test.ts",
  "test/validation-c08-windows-move-ios-move.test.ts",
  "test/validation-c09-windows-delete-ios-trash.test.ts",
  "test/validation-coordination-evidence-contracts.test.ts",
  "test/validation-cross-device-coordinator.test.ts",
  "test/validation-driver-plan-fault-verifier-contracts.test.ts",
  "test/validation-fixture-manager.test.ts",
  "test/validation-human-checkpoint-resume.test.ts",
  "test/validation-mode-runtime-canary.test.ts",
  "test/validation-mode-runtime-plan-handoff.test.ts",
  "test/validation-plan-assertion-engine.test.ts",
  "test/validation-production-diagnostic-fixture.ts",
  "test/validation-production-path-driver.test.ts",
  "test/validation-run-sandbox-checkpoint-contracts.test.ts",
  "test/validation-safety-sandbox.test.ts",
  "test/validation-scenario-evidence-recorder.test.ts",
  "test/validation-scenario-runner-canary-suite.test.ts",
  "test/validation-scenario-runner-canary-suite.ts",
  "test/validation-scenario-runner-canary-support.ts",
  "test/validation-scenario-runner-contracts.test.ts",
  "test/validation-scenario-runner-core.test.ts",
  "test/validation-scenario-runner-durable-state.test.ts",
  "test/validation-scenario-runner-integration.test.ts",
  "test/validation-scenario-runner-module-adapter.test.ts",
  "test/validation-state-ambiguity-cancel-fault-hooks.test.ts",
  "test/validation-state-convergence-verifier.test.ts",
  "test/validation-transport-coverage-faults.test.ts"
)

$RequiredModifiedSourceTest = @(
  "src/main.ts",
  "src/product/settings-tab.ts",
  "src/product/product-controller-base.ts"
)

$ExpectedSourceTestChanges = @($RequiredDeletions + $RequiredModifiedSourceTest) | Sort-Object -Unique

$ExpectedBlobs = @{
  "src/main.ts" = "dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7"
  "src/product/settings-tab.ts" = "e6a56451a3a6723d223c09175cc901c46f527985"
  "src/product/product-controller-base.ts" = "fee7c40e715d277cea2b5e26059a86753bb316a0"
}

$RetiredIdentifiers = @(
  "ValidationModeRuntime",
  "validationRuntime",
  "validationModeEnabled",
  "setValidationModeEnabled",
  "validationScenarioIds",
  "startValidationScenario",
  "resumeValidationScenario",
  "currentDiagnosticCorrelation",
  "ProductionDiagnosticCorrelation",
  "scenario-runner",
  "cross-device-coordinator",
  "scenario-evidence-recorder"
)

$FrozenExplicit = @(
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.test.json",
  "src/testing/fakes.ts"
)

$Log = New-Object System.Collections.Generic.List[string]
$Failures = New-Object System.Collections.Generic.List[string]

function Add-Log {
  param([string]$Text = "")
  [void]$Log.Add($Text)
}

function Add-Check {
  param(
    [string]$Name,
    [bool]$Passed,
    [string]$Detail
  )
  $state = if ($Passed) { "PASS" } else { "FAIL" }
  Add-Log ("- {0} - {1}: {2}" -f $state, $Name, $Detail)
  if (-not $Passed) {
    [void]$Failures.Add(("{0}: {1}" -f $Name, $Detail))
  }
}

function Invoke-NativeCaptured {
  param(
    [string]$Label,
    [string]$FilePath,
    [string[]]$Arguments,
    [switch]$AllowNonZero
  )

  Add-Log ""
  Add-Log ("## COMMAND: {0}" -f $Label)
  Add-Log ("EXEC: {0} {1}" -f $FilePath, ($Arguments -join " "))

  $output = & $FilePath @Arguments 2>&1
  $exitCode = $LASTEXITCODE

  foreach ($item in @($output)) {
    Add-Log ($item.ToString())
  }
  Add-Log ("EXIT CODE: {0}" -f $exitCode)

  if (-not $AllowNonZero -and $exitCode -ne 0) {
    [void]$Failures.Add(("{0} exited {1}" -f $Label, $exitCode))
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    Lines = @($output | ForEach-Object { $_.ToString() })
  }
}

function Get-WorkingBlob {
  param([string]$Path)
  $output = & git hash-object -- $Path 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    return $null
  }
  return (($output | Select-Object -First 1).ToString().Trim())
}

function Get-BaseBlob {
  param([string]$Path)
  $spec = "{0}:{1}" -f $BaseSha, $Path
  $output = & git rev-parse $spec 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    return $null
  }
  return (($output | Select-Object -First 1).ToString().Trim())
}

function Compare-ExactSet {
  param(
    [string[]]$Actual,
    [string[]]$Expected
  )
  $a = @($Actual | Sort-Object -Unique)
  $e = @($Expected | Sort-Object -Unique)
  if ($a.Count -ne $e.Count) { return $false }
  for ($i = 0; $i -lt $e.Count; $i++) {
    if ($a[$i] -ne $e[$i]) { return $false }
  }
  return $true
}

function Get-ChangedPaths {
  $tracked = & git diff --name-only $BaseSha -- 2>&1
  $trackedExit = $LASTEXITCODE
  if ($trackedExit -ne 0) {
    [void]$Failures.Add(("git diff --name-only failed with exit code {0}" -f $trackedExit))
  }

  $untracked = & git ls-files --others --exclude-standard 2>&1
  $untrackedExit = $LASTEXITCODE
  if ($untrackedExit -ne 0) {
    [void]$Failures.Add(("git ls-files --others failed with exit code {0}" -f $untrackedExit))
  }

  return @(
    @($tracked) + @($untracked) |
      ForEach-Object { $_.ToString().Trim().Replace("\", "/") } |
      Where-Object { $_ } |
      Sort-Object -Unique
  )
}

function Assert-ChangeSet {
  param(
    [string]$Phase,
    [bool]$RequireEvidence
  )

  $changed = @(Get-ChangedPaths)
  $sourceTest = @($changed | Where-Object { $_ -like "src/*" -or $_ -like "test/*" })
  $dev = @($changed | Where-Object { $_ -like "dev/*" })
  $other = @($changed | Where-Object { $_ -notlike "src/*" -and $_ -notlike "test/*" -and $_ -notlike "dev/*" })
  $allowedDev = @($VerifierPath, $EvidencePath)
  $unexpectedDev = @($dev | Where-Object { $_ -notin $allowedDev })

  Add-Check ("{0} exact source/test change set" -f $Phase) (Compare-ExactSet $sourceTest $ExpectedSourceTestChanges) ("actual={0}; expected={1}" -f ($sourceTest -join ", "), ($ExpectedSourceTestChanges -join ", "))
  Add-Check ("{0} dev allowlist" -f $Phase) ($unexpectedDev.Count -eq 0) ("actual={0}; allowed={1}" -f ($dev -join ", "), ($allowedDev -join ", "))
  Add-Check ("{0} verifier is a changed dev path" -f $Phase) ($VerifierPath -in $dev) ("actual={0}" -f ($dev -join ", "))
  if ($RequireEvidence) {
    Add-Check ("{0} evidence is a changed dev path" -f $Phase) ($EvidencePath -in $dev) ("actual={0}" -f ($dev -join ", "))
  }
  Add-Check ("{0} no other changed paths" -f $Phase) ($other.Count -eq 0) ("actual={0}" -f ($other -join ", "))
}

function Assert-FrozenFiles {
  param([string]$Phase)

  $scriptList = & git ls-tree -r --name-only $BaseSha -- scripts 2>&1
  $scriptListExit = $LASTEXITCODE
  if ($scriptListExit -ne 0) {
    Add-Check ("{0} enumerate build scripts" -f $Phase) $false ("exit={0}" -f $scriptListExit)
    return
  }

  $frozen = @($FrozenExplicit + @($scriptList | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ })) | Sort-Object -Unique
  foreach ($path in $frozen) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
      Add-Check ("{0} frozen file {1}" -f $Phase, $path) $false "missing"
      continue
    }
    $actual = Get-WorkingBlob $path
    $expected = Get-BaseBlob $path
    Add-Check ("{0} frozen file {1}" -f $Phase, $path) ($null -ne $actual -and $actual -eq $expected) ("actual={0}; expected={1}" -f $actual, $expected)
  }
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RepoRoot

try {
  Add-Log "# BVP-S02 Legacy Harness Retirement Verification"
  Add-Log ""
  Add-Log ("Timestamp: {0}" -f ([DateTimeOffset]::Now.ToString("o")))
  Add-Log ("Repository root: {0}" -f $RepoRoot)
  Add-Log ("Required base: {0}" -f $BaseSha)
  Add-Log "GitHub Actions used: NO"

  $headResult = Invoke-NativeCaptured "resolve HEAD" "git" @("rev-parse", "HEAD")
  $head = if ($headResult.ExitCode -eq 0 -and $headResult.Lines.Count -gt 0) { $headResult.Lines[0].Trim() } else { "" }

  $ancestor = Invoke-NativeCaptured "base ancestry" "git" @("merge-base", "--is-ancestor", $BaseSha, "HEAD") -AllowNonZero
  Add-Check "task HEAD descends from exact S02 input" ($ancestor.ExitCode -eq 0) ("HEAD={0}; base={1}; exit={2}" -f $head, $BaseSha, $ancestor.ExitCode)

  Assert-ChangeSet "PRE-DYNAMIC" $false

  Add-Check "required deletion count" ($RequiredDeletions.Count -eq 63) ("count={0}" -f $RequiredDeletions.Count)
  foreach ($path in $RequiredDeletions) {
    Add-Check ("required deletion {0}" -f $path) (-not (Test-Path -LiteralPath $path)) "must be absent"
  }

  Add-Check "active src/validation tree absent" (-not (Test-Path -LiteralPath "src/validation")) "src/validation must not exist"
  Add-Check "H6C production diagnostic correlation seam absent" (-not (Test-Path -LiteralPath "src/diagnostics/production-diagnostic-correlation.ts")) "must be absent"

  foreach ($path in $ExpectedBlobs.Keys) {
    $actual = if (Test-Path -LiteralPath $path -PathType Leaf) { Get-WorkingBlob $path } else { $null }
    $expected = $ExpectedBlobs[$path]
    Add-Check ("exact blob {0}" -f $path) ($null -ne $actual -and $actual -eq $expected) ("actual={0}; expected={1}" -f $actual, $expected)
  }

  foreach ($identifier in $RetiredIdentifiers) {
    $grep = Invoke-NativeCaptured ("retired identifier search: {0}" -f $identifier) "git" @("grep", "-n", "-I", "-F", "--", $identifier, "--", "src", "test") -AllowNonZero
    $passed = $grep.ExitCode -eq 1
    Add-Check ("zero active src/test occurrences: {0}" -f $identifier) $passed ("git-grep-exit={0}" -f $grep.ExitCode)
  }

  Assert-FrozenFiles "PRE-DYNAMIC"

  Invoke-NativeCaptured "npm ci" "npm" @("ci") | Out-Null
  Invoke-NativeCaptured "npm run typecheck" "npm" @("run", "typecheck") | Out-Null
  Invoke-NativeCaptured "npm test" "npm" @("test") | Out-Null
  Invoke-NativeCaptured "npm run build" "npm" @("run", "build") | Out-Null
  Invoke-NativeCaptured "npm run check" "npm" @("run", "check") | Out-Null
  Invoke-NativeCaptured "git diff --check" "git" @("diff", "--check") | Out-Null

  if (Test-Path -LiteralPath "main.js" -PathType Leaf) {
    $bundleText = [System.IO.File]::ReadAllText((Join-Path $RepoRoot "main.js"))
    foreach ($identifier in $RetiredIdentifiers) {
      Add-Check ("shipping main.js excludes {0}" -f $identifier) (-not $bundleText.Contains($identifier)) "identifier must be absent from built bundle"
    }
  } else {
    Add-Check "shipping main.js exists" $false "npm run build did not leave main.js for inspection"
  }

  Assert-FrozenFiles "POST-DYNAMIC"
  Assert-ChangeSet "POST-DYNAMIC" $true
}
catch {
  [void]$Failures.Add(("Verifier exception: {0}" -f $_.Exception.Message))
  Add-Log ""
  Add-Log ("VERIFIER EXCEPTION: {0}" -f $_.Exception.ToString())
}
finally {
  $status = if ($Failures.Count -eq 0) { "STATUS: COMPLETE" } else { "STATUS: BLOCKED" }

  $final = New-Object System.Collections.Generic.List[string]
  [void]$final.Add($status)
  [void]$final.Add("")
  foreach ($line in $Log) {
    [void]$final.Add($line)
  }

  [void]$final.Add("")
  [void]$final.Add("## FINAL RESULT")
  [void]$final.Add(("Failure count: {0}" -f $Failures.Count))
  foreach ($failure in $Failures) {
    [void]$final.Add(("- {0}" -f $failure))
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $RepoRoot $EvidencePath), (($final -join [Environment]::NewLine) + [Environment]::NewLine), $encoding)

  Write-Output $status
  Write-Output ("Evidence: {0}" -f (Join-Path $RepoRoot $EvidencePath))

  if ($Failures.Count -ne 0) {
    exit 1
  }
  exit 0
}
