param(
  [Parameter(Mandatory = $true)]
  [string]$Battery,
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

Push-Location $RepoRoot
try {
  $InitialStatus = @(& git status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to read repository status."
  }
  if ($InitialStatus.Count -gt 0) {
    throw "Working tree must be clean before a BVP deterministic battery run."
  }

  $BranchName = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($BranchName)) {
    throw "BVP deterministic battery result upload requires a named local branch."
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
$TapPath = Join-Path $ResultDir "test-output.tap"
$CompiledCli = Join-Path $RepoRoot ".test-build/bvp/test-platform/src/batteries/run-deterministic-battery.js"

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
      kind = "deterministic-node-test"
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
  $Envelope = Get-Content -LiteralPath $ResultJsonPath -Raw | ConvertFrom-Json -Depth 100
  $Result = $Envelope.result
  $Status = [string]$Result.status
  $ExitCode = if ($Result.PSObject.Properties.Name -contains "exitCode") {
    [string]$Result.exitCode
  } else {
    [string]$BatteryExitCode
  }
  $Duration = if ($Result.PSObject.Properties.Name -contains "durationMs") {
    [string]$Result.durationMs
  } else {
    "<not-produced>"
  }
  $TestFiles = if (
    $Envelope.PSObject.Properties.Name -contains "battery" -and
    $Envelope.battery.PSObject.Properties.Name -contains "testFiles"
  ) {
    @($Envelope.battery.testFiles)
  } else {
    @()
  }
  $TestFileLines = if ($TestFiles.Count -gt 0) {
    ($TestFiles | ForEach-Object { "- $_" }) -join [Environment]::NewLine
  } else {
    "- <not-produced>"
  }

  $Rows = ($CommandRecords | ForEach-Object {
    $SafeCommand = $_.Command.Replace("|", "\|")
    "| $($_.Label) | $SafeCommand | $($_.ExitCode) |"
  }) -join [Environment]::NewLine

  $Markdown = @"
# BVP Deterministic Battery Result

- Battery: $Battery
- Run ID: $RunId
- Status: **$Status**
- Exit code: $ExitCode
- Duration ms: $Duration
- Controller source HEAD: $InputHead
- Controller branch: $BranchName
- Generated UTC: $([DateTimeOffset]::UtcNow.ToString("o"))
- GitHub Actions used: **No**

## Test files

$TestFileLines

## Result package

- result.json — machine-readable battery summary.
- result.md — this human-readable summary.
- terminal.log — complete compilation and battery terminal output.
- test-output.tap — complete Node test-runner TAP output.

## Executed commands

| Step | Command | Exit code |
| --- | --- | ---: |
$Rows

## Persistence

The operator stages only this run directory, commits it, and pushes that commit to the current branch on origin.
"@

  [System.IO.File]::WriteAllText(
    $ResultMarkdownPath,
    $Markdown,
    [System.Text.UTF8Encoding]::new($false)
  )
}

Push-Location $RepoRoot
try {
  Write-TranscriptLine "BVP DETERMINISTIC BATTERY RUN"
  Write-TranscriptLine "Battery: $Battery"
  Write-TranscriptLine "Run ID: $RunId"
  Write-TranscriptLine "Controller branch: $BranchName"
  Write-TranscriptLine "Controller HEAD: $InputHead"
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
    throw "Compiled deterministic battery CLI was not produced: $CompiledCli"
  }
  if ($BatteryExitCode -eq 0) {
    $BatteryExitCode = Invoke-RecordedExternal -Label "bvp-deterministic-battery" -FilePath "node" -Arguments @(
      $CompiledCli,
      "--battery", $Battery,
      "--result-file", $ResultJsonPath,
      "--tap-file", $TapPath
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
    Write-FallbackResult -Classification "deterministic-battery-result-not-produced"
  }
  if (-not (Test-Path -LiteralPath $TapPath -PathType Leaf)) {
    [System.IO.File]::WriteAllText($TapPath, "", [System.Text.UTF8Encoding]::new($false))
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
    throw "git add failed for BVP deterministic result package."
  }

  & git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    throw "No BVP deterministic result files were staged for upload."
  }
  if ($LASTEXITCODE -ne 1) {
    throw "Unable to inspect staged BVP deterministic result files."
  }

  & git commit -m "test(bvp): record $Battery result $RunId"
  if ($LASTEXITCODE -ne 0) {
    throw "git commit failed for BVP deterministic result package."
  }

  & git push origin "HEAD:$BranchName"
  if ($LASTEXITCODE -ne 0) {
    throw "git push failed for BVP deterministic result package."
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
