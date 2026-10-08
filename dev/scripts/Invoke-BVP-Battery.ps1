param(
  [string]$Battery = "windows-live-smoke",
  [Parameter(Mandatory = $true)]
  [hashtable]$DeviceMap,
  [Parameter(Mandatory = $true)]
  [string]$RelayRoot,
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[0-9a-fA-F]{40}$")]
  [string]$ValidationSourceCommit,
  [int]$ResultTimeoutMs = 60000,
  [int]$PollIntervalMs = 250,
  [string]$RunId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path

if ([string]::IsNullOrWhiteSpace($RunId)) {
  $Stamp = [DateTimeOffset]::UtcNow.ToString("yyyyMMddTHHmmssfffZ")
  $Suffix = [Guid]::NewGuid().ToString("N").Substring(0, 8)
  $RunId = "bvp-$Battery-$Stamp-$Suffix"
}

if ($RunId.Length -gt 128) {
  throw "RunId must be 128 characters or fewer."
}
if ($ResultTimeoutMs -le 0) {
  throw "ResultTimeoutMs must be positive."
}
if ($PollIntervalMs -le 0) {
  throw "PollIntervalMs must be positive."
}
if (-not (Test-Path -LiteralPath $RelayRoot -PathType Container)) {
  throw "RelayRoot does not exist: $RelayRoot"
}

Push-Location $RepoRoot
try {
  $InitialStatus = @(& git status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read repository status."
  }
  if ($InitialStatus.Count -gt 0) {
    throw "Working tree must be clean before a BVP battery run so the result upload cannot include unrelated files."
  }

  $BranchName = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($BranchName)) {
    throw "BVP battery result upload requires a named local branch."
  }

  $InputHead = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to resolve repository HEAD."
  }

  & git remote get-url origin *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Git remote 'origin' is required for BVP result upload."
  }
} finally {
  Pop-Location
}

$ResultDir = Join-Path $RepoRoot "dev/Test-Results/$RunId"
$RelativeResultDir = "dev/Test-Results/$RunId"
if (Test-Path -LiteralPath $ResultDir) {
  throw "Result package already exists: $ResultDir"
}

New-Item -ItemType Directory -Path $ResultDir -Force | Out-Null

$TranscriptPath = Join-Path $ResultDir "terminal.log"
$ResultJsonPath = Join-Path $ResultDir "result.json"
$ResultMarkdownPath = Join-Path $ResultDir "result.md"
$CheckpointFile = Join-Path $ResultDir "checkpoint.json"
$CompiledCli = Join-Path $RepoRoot ".test-build/bvp/test-platform/src/batteries/run-live-battery.js"
$DeviceMapJson = $DeviceMap | ConvertTo-Json -Compress

$CommandRecords = [System.Collections.Generic.List[object]]::new()
$BatteryExitCode = 0
$FailureMessage = $null
$UploadExitCode = 0

[System.IO.File]::WriteAllText($TranscriptPath, "", [System.Text.UTF8Encoding]::new($false))

function Write-TranscriptLine {
  param([AllowEmptyString()][string]$Line)
  Write-Host $Line
  Add-Content -LiteralPath $TranscriptPath -Value $Line -Encoding utf8
}

function Invoke-RecordedExternal {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$Arguments = @()
  )

  $Display = if ($Arguments.Count -gt 0) {
    "$FilePath " + ($Arguments -join " ")
  } else {
    $FilePath
  }

  Write-TranscriptLine ""
  Write-TranscriptLine ">>> $Label"
  Write-TranscriptLine "COMMAND: $Display"

  $Output = & $FilePath @Arguments 2>&1
  foreach ($Item in $Output) {
    Write-TranscriptLine ($Item.ToString())
  }

  $Code = $LASTEXITCODE
  Write-TranscriptLine "EXIT CODE: $Code"
  [void]$CommandRecords.Add([pscustomobject]@{
    Label = $Label
    Command = $Display
    ExitCode = $Code
  })
  return $Code
}

function Write-FallbackResult {
  param([Parameter(Mandatory = $true)][string]$Classification)

  $Payload = [ordered]@{
    battery = [ordered]@{
      name = $Battery
    }
    result = [ordered]@{
      status = "failed"
      classification = $Classification
      reason = if ($FailureMessage) { $FailureMessage } else { $Classification }
    }
  }

  [System.IO.File]::WriteAllText(
    $ResultJsonPath,
    (($Payload | ConvertTo-Json -Depth 20) + [Environment]::NewLine),
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Write-ResultMarkdown {
  try {
    $Envelope = Get-Content -LiteralPath $ResultJsonPath -Raw | ConvertFrom-Json -Depth 100
  } catch {
    $script:FailureMessage = "Unable to parse result.json: $($_.Exception.Message)"
    Write-FallbackResult -Classification "battery-result-json-invalid"
    $Envelope = Get-Content -LiteralPath $ResultJsonPath -Raw | ConvertFrom-Json -Depth 100
  }

  $Result = $Envelope.result
  $Status = [string]$Result.status
  $ScenarioId = if ($Result.PSObject.Properties.Name -contains "scenarioId") {
    [string]$Result.scenarioId
  } else {
    "<not-produced>"
  }
  $Classification = if ($Result.PSObject.Properties.Name -contains "classification") {
    [string]$Result.classification
  } else {
    ""
  }
  $HumanEvidence = if (
    $Result.PSObject.Properties.Name -contains "evidence" -and
    $null -ne $Result.evidence -and
    $Result.evidence.PSObject.Properties.Name -contains "human"
  ) {
    [string]$Result.evidence.human
  } else {
    ""
  }

  $Rows = ($CommandRecords | ForEach-Object {
    $SafeCommand = $_.Command.Replace("|", "\|")
    "| $($_.Label) | $SafeCommand | $($_.ExitCode) |"
  }) -join [Environment]::NewLine

  $CheckpointLine = if (Test-Path -LiteralPath $CheckpointFile -PathType Leaf) {
    "- checkpoint.json — persisted BVP checkpoint/resume state."
  } else {
    "- checkpoint.json — not produced by this battery."
  }

  $ClassificationLine = if ([string]::IsNullOrWhiteSpace($Classification)) {
    ""
  } else {
    "- Classification: $Classification"
  }

  $HumanLine = if ([string]::IsNullOrWhiteSpace($HumanEvidence)) {
    ""
  } else {
    "- Canonical BVP evidence: $HumanEvidence"
  }

  $Markdown = @"
# BVP Battery Result

- Battery: $Battery
- Run ID: $RunId
- Scenario: $ScenarioId
- BVP status: **$Status**
- Battery process exit code: $BatteryExitCode
$ClassificationLine
- Validation source commit: $ValidationSourceCommit
- Controller source HEAD: $InputHead
- Controller branch: $BranchName
- Relay root: $RelayRoot
- Generated UTC: $([DateTimeOffset]::UtcNow.ToString("o"))
- GitHub Actions used: **No**
$HumanLine

## Result package

- result.json — complete machine-readable battery/BVP result.
- result.md — this human-readable run summary.
- terminal.log — complete terminal output for compilation and BVP execution.
$CheckpointLine

## Executed commands

| Step | Command | Exit code |
| --- | --- | ---: |
$Rows

## Persistence

This directory is the complete persisted BVP battery result package. After the package is finalized, the operator script commits only this directory and pushes that commit to the current branch on `origin`.
"@

  [System.IO.File]::WriteAllText(
    $ResultMarkdownPath,
    $Markdown,
    [System.Text.UTF8Encoding]::new($false)
  )
}

Push-Location $RepoRoot
try {
  Write-TranscriptLine "BVP BATTERY RUN"
  Write-TranscriptLine "Battery: $Battery"
  Write-TranscriptLine "Run ID: $RunId"
  Write-TranscriptLine "Controller branch: $BranchName"
  Write-TranscriptLine "Controller HEAD: $InputHead"
  Write-TranscriptLine "Validation source: $ValidationSourceCommit"
  Write-TranscriptLine "Result package: $RelativeResultDir"

  $BatteryExitCode = Invoke-RecordedExternal -Label "node-version" -FilePath "node" -Arguments @("--version")
  if ($BatteryExitCode -eq 0) {
    $BatteryExitCode = Invoke-RecordedExternal -Label "npm-version" -FilePath "npm" -Arguments @("--version")
  }
  if ($BatteryExitCode -eq 0) {
    $BatteryExitCode = Invoke-RecordedExternal -Label "bvp-typescript-compile" -FilePath "node" -Arguments @(
      "node_modules/typescript/bin/tsc",
      "-p",
      "test-platform/tsconfig.json"
    )
  }
  if ($BatteryExitCode -eq 0 -and -not (Test-Path -LiteralPath $CompiledCli -PathType Leaf)) {
    throw "Compiled BVP battery CLI was not produced: $CompiledCli"
  }
  if ($BatteryExitCode -eq 0) {
    $BatteryExitCode = Invoke-RecordedExternal -Label "bvp-live-battery" -FilePath "node" -Arguments @(
      $CompiledCli,
      "--battery", $Battery,
      "--device-map-json", $DeviceMapJson,
      "--relay-root", $RelayRoot,
      "--checkpoint-file", $CheckpointFile,
      "--result-file", $ResultJsonPath,
      "--validation-source-commit", $ValidationSourceCommit,
      "--run-id", $RunId,
      "--result-timeout-ms", $ResultTimeoutMs.ToString(),
      "--poll-interval-ms", $PollIntervalMs.ToString()
    )
  }
} catch {
  $FailureMessage = $_.Exception.Message
  if ($BatteryExitCode -eq 0) {
    $BatteryExitCode = 1
  }
  Write-TranscriptLine ""
  Write-TranscriptLine "ERROR: $FailureMessage"
} finally {
  if (-not (Test-Path -LiteralPath $ResultJsonPath -PathType Leaf)) {
    Write-FallbackResult -Classification "battery-result-not-produced"
  }
  Write-ResultMarkdown
  Pop-Location
}

Write-Host ""
Write-Host "Persisted result package: $RelativeResultDir"
Write-Host "Uploading result package to GitHub branch '$BranchName'..."

Push-Location $RepoRoot
try {
  & git add -- $RelativeResultDir
  if ($LASTEXITCODE -ne 0) {
    throw "git add failed for BVP result package."
  }

  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    throw "No BVP result files were staged for upload."
  }
  if ($LASTEXITCODE -ne 1) {
    throw "Unable to inspect staged BVP result files."
  }

  & git commit -m "test(bvp): record $Battery result $RunId"
  if ($LASTEXITCODE -ne 0) {
    throw "git commit failed for BVP result package."
  }

  & git push origin "HEAD:$BranchName"
  if ($LASTEXITCODE -ne 0) {
    throw "git push failed for BVP result package."
  }

  $UploadedCommit = (& git rev-parse HEAD).Trim()
  Write-Host "Uploaded result package commit: $UploadedCommit"
} catch {
  $UploadExitCode = 2
  Write-Host "RESULT UPLOAD ERROR: $($_.Exception.Message)"
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Result package: $ResultDir"
if ($UploadExitCode -eq 0) {
  Write-Host "GitHub upload: PASS"
} else {
  Write-Host "GitHub upload: FAIL"
}

if ($UploadExitCode -ne 0) {
  exit $UploadExitCode
}
exit $BatteryExitCode
