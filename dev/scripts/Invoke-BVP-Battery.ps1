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
$EvidencePath = Join-Path $RepoRoot "dev/_ca-output.md"

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

$TranscriptPath = Join-Path $env:TEMP "$RunId.log"
$CheckpointFile = Join-Path $env:TEMP "$RunId.checkpoint.json"
$CompiledCli = Join-Path $RepoRoot ".test-build/bvp/test-platform/src/batteries/run-live-battery.js"
$DeviceMapJson = $DeviceMap | ConvertTo-Json -Compress

$CommandRecords = [System.Collections.Generic.List[object]]::new()
$FinalExitCode = 0
$FailureMessage = $null

[System.IO.File]::WriteAllText($TranscriptPath, "", [System.Text.UTF8Encoding]::new($false))

function Write-TranscriptLine {
  param([Parameter(Mandatory = $true)][string]$Line)
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
    Write-TranscriptLine $Item.ToString()
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

function Write-Evidence {
  $Rows = ($CommandRecords | ForEach-Object {
    $SafeCommand = $_.Command.Replace("|", "\|")
    "| $($_.Label) | `$SafeCommand` | $($_.ExitCode) |"
  }) -join [Environment]::NewLine

  $Transcript = if (Test-Path -LiteralPath $TranscriptPath) {
    Get-Content -LiteralPath $TranscriptPath -Raw
  } else {
    ""
  }

  $Status = if ($FinalExitCode -eq 0) { "PASS" } else { "FAIL" }
  $FailureSection = if ($FailureMessage) {
    @"

## Failure

$FailureMessage
"@
  } else {
    ""
  }

  $Evidence = @"
# BVP Battery Evidence

- Battery: `$Battery`
- Run ID: `$RunId`
- Status: **$Status**
- Final exit code: `$FinalExitCode`
- Validation source commit: `$ValidationSourceCommit`
- Relay root: `$RelayRoot`
- Generated UTC: `$([DateTimeOffset]::UtcNow.ToString("o"))`
- GitHub Actions used: **No**

## Commands

| Step | Command | Exit code |
| --- | --- | ---: |
$Rows
$FailureSection

## Complete terminal output

```text
$Transcript
```
"@

  [System.IO.File]::WriteAllText(
    $EvidencePath,
    $Evidence,
    [System.Text.UTF8Encoding]::new($false)
  )
}

Push-Location $RepoRoot
try {
  $FinalExitCode = Invoke-RecordedExternal -Label "repository-head" -FilePath "git" -Arguments @("rev-parse", "HEAD")
  if ($FinalExitCode -eq 0) {
    $FinalExitCode = Invoke-RecordedExternal -Label "repository-status" -FilePath "git" -Arguments @("status", "--short")
  }
  if ($FinalExitCode -eq 0) {
    $FinalExitCode = Invoke-RecordedExternal -Label "node-version" -FilePath "node" -Arguments @("--version")
  }
  if ($FinalExitCode -eq 0) {
    $FinalExitCode = Invoke-RecordedExternal -Label "npm-version" -FilePath "npm" -Arguments @("--version")
  }
  if ($FinalExitCode -eq 0) {
    $FinalExitCode = Invoke-RecordedExternal -Label "bvp-typescript-compile" -FilePath "node" -Arguments @(
      "node_modules/typescript/bin/tsc",
      "-p",
      "test-platform/tsconfig.json"
    )
  }
  if ($FinalExitCode -eq 0 -and -not (Test-Path -LiteralPath $CompiledCli -PathType Leaf)) {
    throw "Compiled BVP battery CLI was not produced: $CompiledCli"
  }
  if ($FinalExitCode -eq 0) {
    $FinalExitCode = Invoke-RecordedExternal -Label "bvp-live-battery" -FilePath "node" -Arguments @(
      $CompiledCli,
      "--battery", $Battery,
      "--device-map-json", $DeviceMapJson,
      "--relay-root", $RelayRoot,
      "--checkpoint-file", $CheckpointFile,
      "--validation-source-commit", $ValidationSourceCommit,
      "--run-id", $RunId,
      "--result-timeout-ms", $ResultTimeoutMs.ToString(),
      "--poll-interval-ms", $PollIntervalMs.ToString()
    )
  }
} catch {
  $FailureMessage = $_.Exception.Message
  if ($FinalExitCode -eq 0) {
    $FinalExitCode = 1
  }
  Write-TranscriptLine ""
  Write-TranscriptLine "ERROR: $FailureMessage"
} finally {
  Pop-Location
  Write-Evidence
}

Write-Host ""
Write-Host "Evidence: $EvidencePath"
exit $FinalExitCode
