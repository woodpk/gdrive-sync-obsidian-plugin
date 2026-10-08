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
  [string]$RunId,
  [string[]]$ResumeEvidence = @(),
  [string]$ResumeEvidenceNote
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RunIdWasProvided = -not [string]::IsNullOrWhiteSpace($RunId)

if (-not $RunIdWasProvided) {
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
    throw "Working tree must be clean before a BVP battery run so result persistence cannot include unrelated files."
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
$CheckpointFile = Join-Path $ResultDir "checkpoint.json"
$IsResume = Test-Path -LiteralPath $ResultDir -PathType Container

if ($IsResume) {
  if (-not $RunIdWasProvided) {
    throw "Generated RunId collided with an existing result package: $RunId"
  }
  if (-not (Test-Path -LiteralPath $CheckpointFile -PathType Leaf)) {
    throw "Existing result package has no checkpoint to resume: $ResultDir"
  }
  if ($ResumeEvidence.Count -eq 0) {
    throw "A checkpoint resume requires -ResumeEvidence."
  }
  if ($ResumeEvidence -contains "human-confirmation" -and [string]::IsNullOrWhiteSpace($ResumeEvidenceNote)) {
    throw "A checkpoint resume with human-confirmation requires -ResumeEvidenceNote describing the observed physical action/outcome. Do not include credentials or tokens."
  }
  if ($ResumeEvidenceNote.Length -gt 2000) {
    throw "ResumeEvidenceNote must be 2000 characters or fewer."
  }
} else {
  if ($ResumeEvidence.Count -gt 0 -or -not [string]::IsNullOrWhiteSpace($ResumeEvidenceNote)) {
    throw "Resume evidence may only be supplied when resuming an existing checkpointed RunId."
  }
  New-Item -ItemType Directory -Path $ResultDir -Force | Out-Null
}

$AttemptsDir = Join-Path $ResultDir "attempts"
New-Item -ItemType Directory -Path $AttemptsDir -Force | Out-Null
$ExistingAttempts = @(Get-ChildItem -LiteralPath $AttemptsDir -Directory -Filter "attempt-*" -ErrorAction SilentlyContinue)
$AttemptNumber = $ExistingAttempts.Count + 1
$AttemptName = "attempt-{0:D3}" -f $AttemptNumber
$AttemptDir = Join-Path $AttemptsDir $AttemptName
New-Item -ItemType Directory -Path $AttemptDir -Force | Out-Null

$TranscriptPath = Join-Path $AttemptDir "terminal.log"
$AttemptResultJsonPath = Join-Path $AttemptDir "result.json"
$ResumeEvidencePath = Join-Path $AttemptDir "resume-evidence.json"
$CanonicalResultJsonPath = Join-Path $ResultDir "result.json"
$ResultMarkdownPath = Join-Path $ResultDir "result.md"
$CompiledCli = Join-Path $RepoRoot ".test-build/bvp/test-platform/src/batteries/run-live-battery.js"
$DeviceMapJson = $DeviceMap | ConvertTo-Json -Compress
$ResumeEvidenceJson = @($ResumeEvidence) | ConvertTo-Json -Compress -AsArray

$CommandRecords = [System.Collections.Generic.List[object]]::new()
$BatteryExitCode = 0
$FailureMessage = $null
$UploadExitCode = 0

[System.IO.File]::WriteAllText($TranscriptPath, "", [System.Text.UTF8Encoding]::new($false))

if ($IsResume) {
  $ResumeRecord = [ordered]@{
    schemaVersion = 1
    runId = $RunId
    attempt = $AttemptNumber
    suppliedEvidence = @($ResumeEvidence)
    observationNote = $ResumeEvidenceNote
    recordedAtUtc = [DateTimeOffset]::UtcNow.ToString("o")
  }
  [System.IO.File]::WriteAllText(
    $ResumeEvidencePath,
    (($ResumeRecord | ConvertTo-Json -Depth 10) + [Environment]::NewLine),
    [System.Text.UTF8Encoding]::new($false)
  )
}

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
    $AttemptResultJsonPath,
    (($Payload | ConvertTo-Json -Depth 20) + [Environment]::NewLine),
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Write-ResultMarkdown {
  try {
    $Envelope = Get-Content -LiteralPath $CanonicalResultJsonPath -Raw | ConvertFrom-Json -Depth 100
  } catch {
    $script:FailureMessage = "Unable to parse result.json: $($_.Exception.Message)"
    Write-FallbackResult -Classification "battery-result-json-invalid"
    Copy-Item -LiteralPath $AttemptResultJsonPath -Destination $CanonicalResultJsonPath -Force
    $Envelope = Get-Content -LiteralPath $CanonicalResultJsonPath -Raw | ConvertFrom-Json -Depth 100
  }

  $Result = $Envelope.result
  $Status = [string]$Result.status
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

  $PackageStatus = if ($BatteryExitCode -eq 0) {
    "PASS"
  } elseif ($BatteryExitCode -eq 3 -and $Envelope.PSObject.Properties.Name -contains "checkpoint") {
    "CHECKPOINT REQUIRED"
  } else {
    "FAIL"
  }

  $Rows = ($CommandRecords | ForEach-Object {
    $SafeCommand = $_.Command.Replace("|", "\|")
    "| $($_.Label) | $SafeCommand | $($_.ExitCode) |"
  }) -join [Environment]::NewLine

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

  $CheckpointSection = ""
  if ($Envelope.PSObject.Properties.Name -contains "checkpoint" -and $null -ne $Envelope.checkpoint) {
    $Required = @($Envelope.checkpoint.requiredEvidence) -join ", "
    $CheckpointSection = @"

## Pending human checkpoint

- Device: $($Envelope.checkpoint.device)
- Action: $($Envelope.checkpoint.action)
- Stop condition: $($Envelope.checkpoint.stopCondition)
- Required resume evidence: $Required
- Next safe action: $($Envelope.checkpoint.nextSafeAction)

Resume this exact Run ID after the physical checkpoint is complete. Do not start a replacement run.
"@
  }

  $Markdown = @"
# BVP Battery Result

- Battery: $Battery
- Run ID: $RunId
- Attempt: $AttemptNumber
- Package status: **$PackageStatus**
- BVP status: **$Status**
- Battery process exit code: $BatteryExitCode
$ClassificationLine
- Validation source commit: $ValidationSourceCommit
- Controller source HEAD at attempt start: $InputHead
- Controller branch: $BranchName
- Relay root: $RelayRoot
- Generated UTC: $([DateTimeOffset]::UtcNow.ToString("o"))
- GitHub Actions used: **No**
$HumanLine
$CheckpointSection

## Result package

- result.json — current complete machine-readable battery/BVP result.
- result.md — this current human-readable run summary.
- checkpoint.json — present when a human checkpoint has been issued; retained as checkpoint history after resume.
- attempts/$AttemptName/result.json — machine-readable output from this attempt.
- attempts/$AttemptName/terminal.log — complete compile/BVP terminal output from this attempt.
- attempts/$AttemptName/resume-evidence.json — present only on resume attempts and records the supplied bounded evidence tokens.

## Executed commands for this attempt

| Step | Command | Exit code |
| --- | --- | ---: |
$Rows

## Persistence

This directory is the complete persisted BVP battery result package. After each attempt, the operator stages only this run directory, commits it, and pushes that commit to the current branch on origin.
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
  Write-TranscriptLine "Attempt: $AttemptNumber"
  Write-TranscriptLine "Resume: $IsResume"
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
      "--result-file", $AttemptResultJsonPath,
      "--resume-evidence-json", $ResumeEvidenceJson,
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
  if (-not (Test-Path -LiteralPath $AttemptResultJsonPath -PathType Leaf)) {
    Write-FallbackResult -Classification "battery-result-not-produced"
  }
  Copy-Item -LiteralPath $AttemptResultJsonPath -Destination $CanonicalResultJsonPath -Force
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

  $CommitVerb = if ($IsResume) { "resume" } else { "record" }
  & git commit -m "test(bvp): $CommitVerb $Battery result $RunId attempt $AttemptNumber"
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
