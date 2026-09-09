param(
    [Parameter(Mandatory = $false)]
    [string]$WatcherPath
)

if ([string]::IsNullOrEmpty($WatcherPath)) {
    $WatcherPath = Join-Path -Path $PSScriptRoot -ChildPath 'watchers.ps1'
}

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

function Assert-Condition {
    param(
        [Parameter(Mandatory = $true)]
        [bool]$Condition,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function ConvertTo-WindowsCommandLineArgument {
    param(
        [Parameter(Mandatory = $false)]
        [AllowEmptyString()]
        [string]$Argument
    )

    if ($null -eq $Argument) {
        $Argument = ''
    }

    if ($Argument.Length -gt 0 -and $Argument -notmatch '[\s"]') {
        return $Argument
    }

    $quoted = '"'
    $backslashCount = 0
    foreach ($character in $Argument.ToCharArray()) {
        if ($character -eq [char]'\') {
            $backslashCount++
            continue
        }

        if ($character -eq [char]'"') {
            $quoted += ('\' * (($backslashCount * 2) + 1))
            $quoted += '"'
            $backslashCount = 0
            continue
        }

        if ($backslashCount -gt 0) {
            $quoted += ('\' * $backslashCount)
            $backslashCount = 0
        }
        $quoted += $character
    }

    if ($backslashCount -gt 0) {
        $quoted += ('\' * ($backslashCount * 2))
    }
    $quoted += '"'
    return $quoted
}

function Get-JsonLineRecords {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return
    }

    foreach ($line in @(Get-Content -LiteralPath $Path)) {
        if (-not [string]::IsNullOrWhiteSpace($line)) {
            Write-Output ($line | ConvertFrom-Json -ErrorAction Stop)
        }
    }
}

function Get-JsonRecordCount {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Predicate
    )

    $records = @(Get-JsonLineRecords -Path $Path)
    return @($records | Where-Object -FilterScript $Predicate).Count
}

function Wait-ForCondition {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Condition,
        [Parameter(Mandatory = $true)]
        [System.Diagnostics.Process]$Process,
        [Parameter(Mandatory = $true)]
        [string]$Stage,
        [Parameter(Mandatory = $false)]
        [int]$TimeoutSeconds = 15
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $lastConditionError = $null
    while ([DateTime]::UtcNow -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) {
            throw ("Watcher exited unexpectedly during {0}." -f $Stage)
        }

        try {
            if ((& $Condition) -eq $true) {
                return
            }
            $lastConditionError = $null
        }
        catch {
            $lastConditionError = $_.Exception.Message
        }

        Start-Sleep -Milliseconds 100
    }

    $detail = if ($null -ne $lastConditionError) {
        ' Last polling error: ' + $lastConditionError
    }
    else {
        ''
    }
    throw (("Timed out waiting for {0}." -f $Stage) + $detail)
}

function Wait-ForProcessExit {
    param(
        [Parameter(Mandatory = $true)]
        [System.Diagnostics.Process]$Process,
        [Parameter(Mandatory = $true)]
        [string]$Stage,
        [Parameter(Mandatory = $false)]
        [int]$TimeoutSeconds = 10
    )

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) {
            return
        }
        Start-Sleep -Milliseconds 100
    }
    throw ("Timed out waiting for watcher process exit during {0}." -f $Stage)
}

function Invoke-RelativePathProbe {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ScriptPath,
        [Parameter(Mandatory = $true)]
        [string]$ValidationPath,
        [Parameter(Mandatory = $true)]
        [string]$PluginDataPath,
        [Parameter(Mandatory = $true)]
        [string]$EvidencePath,
        [Parameter(Mandatory = $true)]
        [string]$ProbePath
    )

    $probeOutput = & $ScriptPath -ValidationPath $ValidationPath -PluginDataPath $PluginDataPath -EvidencePath $EvidencePath -RelativePathProbe $ProbePath
    $probeText = ($probeOutput | Out-String).Trim()
    Assert-Condition -Condition (-not [string]::IsNullOrWhiteSpace($probeText)) -Message 'Relative-path probe returned no JSON.'
    return ($probeText | ConvertFrom-Json -ErrorAction Stop)
}

$tempRoot = $null
$stopFile = $null
$watcherProcess = $null
$watcherProcessId = $null
$streamsRead = $false
$stdoutText = ''
$stderrText = ''
$failure = $null
$summary = $null

try {
    Assert-Condition -Condition ($env:OS -eq 'Windows_NT') -Message 'This verification must run on Windows.'

    $runtimeVersion = $PSVersionTable.PSVersion.ToString()
    $runtimeEdition = if ($PSVersionTable.ContainsKey('PSEdition')) {
        [string]$PSVersionTable.PSEdition
    }
    else {
        ''
    }
    Assert-Condition -Condition ($runtimeVersion.StartsWith('5.1.')) -Message ("Expected the current host to be Windows PowerShell 5.1, found {0}." -f $runtimeVersion)
    Assert-Condition -Condition ($runtimeEdition -eq 'Desktop') -Message ("Expected the current host to be Windows PowerShell Desktop edition, found {0}." -f $runtimeEdition)

    Assert-Condition -Condition (Test-Path -LiteralPath $WatcherPath -PathType Leaf) -Message 'Watcher script was not found.'
    $resolvedWatcherPath = (Resolve-Path -LiteralPath $WatcherPath).ProviderPath
    $currentPowerShell = Join-Path -Path $PSHOME -ChildPath 'powershell.exe'
    Assert-Condition -Condition (Test-Path -LiteralPath $currentPowerShell -PathType Leaf) -Message 'Current Windows PowerShell executable was not found.'

    $tempRoot = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ('p6 watcher compat Ünicode ' + [guid]::NewGuid().ToString('N'))
    $validationRoot = Join-Path -Path $tempRoot -ChildPath 'Vault Ünicode'
    $siblingRoot = Join-Path -Path $tempRoot -ChildPath 'Vault Ünicode-Other'
    $pluginRoot = Join-Path -Path $tempRoot -ChildPath 'Plugin State Ünicode'
    $evidenceRoot = Join-Path -Path $tempRoot -ChildPath 'Evidence Output Ünicode'
    $watcherCopyRoot = Join-Path -Path $tempRoot -ChildPath 'Watcher Script Ünicode'
    $disposableWatcherPath = Join-Path -Path $watcherCopyRoot -ChildPath 'watchers copy ü.ps1'
    $pluginDataPath = Join-Path -Path $pluginRoot -ChildPath 'data ü.json'
    $stdoutPath = Join-Path -Path $evidenceRoot -ChildPath 'watcher-stdout.txt'
    $stderrPath = Join-Path -Path $evidenceRoot -ChildPath 'watcher-stderr.txt'
    $stopFile = Join-Path -Path $evidenceRoot -ChildPath 'stop-watchers.flag'
    $fsLog = Join-Path -Path $evidenceRoot -ChildPath 'filesystem-events.jsonl'
    $pluginLog = Join-Path -Path $evidenceRoot -ChildPath 'plugin-state-events.jsonl'
    $resourceLog = Join-Path -Path $evidenceRoot -ChildPath 'resource-samples.csv'

    New-Item -ItemType Directory -Path $validationRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $siblingRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $pluginRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $watcherCopyRoot -Force | Out-Null
    Copy-Item -LiteralPath $resolvedWatcherPath -Destination $disposableWatcherPath

    $siblingProbePath = Join-Path -Path $siblingRoot -ChildPath 'probe ü.txt'
    'outside' | Set-Content -LiteralPath $siblingProbePath -Encoding utf8
    $siblingProbe = Invoke-RelativePathProbe -ScriptPath $disposableWatcherPath -ValidationPath $validationRoot -PluginDataPath $pluginDataPath -EvidencePath $evidenceRoot -ProbePath $siblingProbePath
    Assert-Condition -Condition (-not [bool]$siblingProbe.contained) -Message 'Sibling-prefix path was incorrectly accepted as contained.'
    Assert-Condition -Condition ($null -eq $siblingProbe.relativePath) -Message 'Sibling-prefix path was assigned an invented relative path.'
    Assert-Condition -Condition ($siblingProbe.pathError -eq 'outside-validation-root') -Message 'Sibling-prefix containment failure did not produce the expected non-secret indicator.'

    $escapeProbePath = Join-Path -Path $validationRoot -ChildPath '..\Vault Ünicode-Other\probe ü.txt'
    Assert-Condition -Condition ([string]::Equals([System.IO.Path]::GetFullPath($escapeProbePath), [System.IO.Path]::GetFullPath($siblingProbePath), [System.StringComparison]::OrdinalIgnoreCase)) -Message 'Normalized escape probe did not resolve to the intended outside-root target.'
    $escapeProbe = Invoke-RelativePathProbe -ScriptPath $disposableWatcherPath -ValidationPath $validationRoot -PluginDataPath $pluginDataPath -EvidencePath $evidenceRoot -ProbePath $escapeProbePath
    Assert-Condition -Condition (-not [bool]$escapeProbe.contained) -Message 'Normalized parent-directory escape was incorrectly accepted as contained.'
    Assert-Condition -Condition ($null -eq $escapeProbe.relativePath) -Message 'Normalized parent-directory escape was assigned an invented relative path.'
    Assert-Condition -Condition ($escapeProbe.pathError -eq 'outside-validation-root') -Message 'Normalized parent-directory escape did not produce the expected non-secret indicator.'

    $insideProbeRelative = 'probe inside ü.txt'
    $insideProbePath = Join-Path -Path $validationRoot -ChildPath $insideProbeRelative
    $insideProbe = Invoke-RelativePathProbe -ScriptPath $disposableWatcherPath -ValidationPath $validationRoot -PluginDataPath $pluginDataPath -EvidencePath $evidenceRoot -ProbePath $insideProbePath
    Assert-Condition -Condition ([bool]$insideProbe.contained) -Message 'Inside-root path was incorrectly rejected.'
    Assert-Condition -Condition ($insideProbe.relativePath -eq $insideProbeRelative) -Message 'Inside-root path did not produce the expected relative path.'
    Assert-Condition -Condition ($null -eq $insideProbe.pathError) -Message 'Inside-root path unexpectedly produced a path error.'

    '{"initial":true}' | Set-Content -LiteralPath $pluginDataPath -Encoding utf8

    $processArguments = @(
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', $disposableWatcherPath,
        '-ValidationPath', $validationRoot,
        '-PluginDataPath', $pluginDataPath,
        '-EvidencePath', $evidenceRoot
    )
    $processStartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processStartInfo.FileName = $currentPowerShell
    $processStartInfo.Arguments = (($processArguments | ForEach-Object { ConvertTo-WindowsCommandLineArgument -Argument $_ }) -join ' ')
    $processStartInfo.WorkingDirectory = $tempRoot
    $processStartInfo.UseShellExecute = $false
    $processStartInfo.CreateNoWindow = $true
    $processStartInfo.RedirectStandardOutput = $true
    $processStartInfo.RedirectStandardError = $true

    $watcherProcess = New-Object System.Diagnostics.Process
    $watcherProcess.StartInfo = $processStartInfo
    Assert-Condition -Condition $watcherProcess.Start() -Message 'Watcher process could not be started.'
    $watcherProcessId = $watcherProcess.Id

    Wait-ForCondition -Process $watcherProcess -Stage 'watcher startup and first resource sample' -Condition {
        if (-not (Test-Path -LiteralPath $resourceLog -PathType Leaf)) {
            return $false
        }
        try {
            return (@(Import-Csv -LiteralPath $resourceLog).Count -gt 0)
        }
        catch {
            return $false
        }
    }

    $createdRelative = 'alpha file.txt'
    $createdPath = Join-Path -Path $validationRoot -ChildPath $createdRelative
    'one' | Set-Content -LiteralPath $createdPath -Encoding utf8
    Wait-ForCondition -Process $watcherProcess -Stage 'file creation event' -Condition {
        try {
            return ((Get-JsonRecordCount -Path $fsLog -Predicate { $_.action -eq 'created' -and $_.relativePath -eq $createdRelative }) -gt 0)
        }
        catch {
            return $false
        }
    }

    $changeCountBefore = Get-JsonRecordCount -Path $fsLog -Predicate { $_.action -eq 'changed' -and $_.relativePath -eq $createdRelative }
    'two' | Add-Content -LiteralPath $createdPath -Encoding utf8
    Wait-ForCondition -Process $watcherProcess -Stage 'file change event' -Condition {
        try {
            return ((Get-JsonRecordCount -Path $fsLog -Predicate { $_.action -eq 'changed' -and $_.relativePath -eq $createdRelative }) -gt $changeCountBefore)
        }
        catch {
            return $false
        }
    }

    $renamedRelative = 'renamed ü.txt'
    Rename-Item -LiteralPath $createdPath -NewName $renamedRelative
    $renamedPath = Join-Path -Path $validationRoot -ChildPath $renamedRelative
    Wait-ForCondition -Process $watcherProcess -Stage 'file rename event' -Condition {
        try {
            return ((Get-JsonRecordCount -Path $fsLog -Predicate { $_.action -eq 'renamed' -and $_.relativePath -eq $renamedRelative -and $_.oldRelativePath -eq $createdRelative }) -gt 0)
        }
        catch {
            return $false
        }
    }

    $nestedRelativeDirectory = Join-Path -Path 'Nested Space' -ChildPath '子'
    $nestedDirectory = Join-Path -Path $validationRoot -ChildPath $nestedRelativeDirectory
    New-Item -ItemType Directory -Path $nestedDirectory -Force | Out-Null
    $nestedRelative = Join-Path -Path $nestedRelativeDirectory -ChildPath 'nested ü.txt'
    $nestedPath = Join-Path -Path $validationRoot -ChildPath $nestedRelative
    'nested' | Set-Content -LiteralPath $nestedPath -Encoding utf8
    Wait-ForCondition -Process $watcherProcess -Stage 'nested Unicode file creation event' -Condition {
        try {
            return ((Get-JsonRecordCount -Path $fsLog -Predicate { $_.action -eq 'created' -and $_.relativePath -eq $nestedRelative }) -gt 0)
        }
        catch {
            return $false
        }
    }

    Remove-Item -LiteralPath $renamedPath -Force
    Wait-ForCondition -Process $watcherProcess -Stage 'file deletion event' -Condition {
        try {
            return ((Get-JsonRecordCount -Path $fsLog -Predicate { $_.action -eq 'deleted' -and $_.relativePath -eq $renamedRelative }) -gt 0)
        }
        catch {
            return $false
        }
    }

    $contentMarker = 'SYNTHETIC_PLUGIN_CONTENT_MUST_NOT_APPEAR_IN_LOGS'
    ('{"marker":"' + $contentMarker + '","changed":true}') | Set-Content -LiteralPath $pluginDataPath -Encoding utf8
    $expectedPluginSize = (Get-Item -LiteralPath $pluginDataPath).Length
    $expectedPluginHash = (Get-FileHash -LiteralPath $pluginDataPath -Algorithm SHA256).Hash.ToLowerInvariant()
    Wait-ForCondition -Process $watcherProcess -Stage 'content-blind plugin state observation' -Condition {
        try {
            return ((Get-JsonRecordCount -Path $pluginLog -Predicate { $_.event -eq 'changed' -and $_.size -eq $expectedPluginSize -and $_.sha256 -eq $expectedPluginHash }) -gt 0)
        }
        catch {
            return $false
        }
    }

    'stop' | Set-Content -LiteralPath $stopFile -Encoding ascii
    Wait-ForProcessExit -Process $watcherProcess -Stage 'stop-flag shutdown'
    $watcherProcess.Refresh()
    Assert-Condition -Condition $watcherProcess.HasExited -Message 'Watcher did not stop cleanly after stop-watchers.flag was created.'
    $watcherProcess.WaitForExit()
    $stdoutText = $watcherProcess.StandardOutput.ReadToEnd()
    $stderrText = $watcherProcess.StandardError.ReadToEnd()
    $streamsRead = $true
    $watcherExitCode = $watcherProcess.ExitCode
    $stdoutText | Set-Content -LiteralPath $stdoutPath -Encoding utf8
    $stderrText | Set-Content -LiteralPath $stderrPath -Encoding utf8

    Assert-Condition -Condition ($watcherExitCode -eq 0) -Message ("Watcher exited with code {0}." -f $watcherExitCode)
    Assert-Condition -Condition ([string]::IsNullOrWhiteSpace($stderrText)) -Message ("Watcher wrote to stderr: {0}" -f $stderrText.Trim())
    Assert-Condition -Condition ($stderrText -notmatch 'GetRelativePath') -Message 'Unsupported GetRelativePath runtime exception was observed.'
    Assert-Condition -Condition (@(Get-Process -Id $watcherProcessId -ErrorAction SilentlyContinue).Count -eq 0) -Message 'Watcher process remained after clean shutdown.'

    Assert-Condition -Condition (Test-Path -LiteralPath $fsLog -PathType Leaf) -Message 'filesystem-events.jsonl was not created.'
    Assert-Condition -Condition (Test-Path -LiteralPath $pluginLog -PathType Leaf) -Message 'plugin-state-events.jsonl was not created.'
    Assert-Condition -Condition (Test-Path -LiteralPath $resourceLog -PathType Leaf) -Message 'resource-samples.csv was not created.'

    $rawFsLines = @(Get-Content -LiteralPath $fsLog | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Assert-Condition -Condition ($rawFsLines.Count -gt 0) -Message 'Filesystem event log was empty.'
    $fsRecords = @(Get-JsonLineRecords -Path $fsLog)
    Assert-Condition -Condition ($fsRecords.Count -eq $rawFsLines.Count) -Message 'Filesystem event JSONL did not parse into exactly one record per non-empty line.'
    foreach ($record in $fsRecords) {
        foreach ($property in $record.PSObject.Properties) {
            if ($property.Value -is [string]) {
                Assert-Condition -Condition ($property.Value.IndexOf($validationRoot, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) -Message 'Filesystem event log exposed the absolute validation root.'
            }
        }
    }

    $createEventCount = @($fsRecords | Where-Object { $_.action -eq 'created' -and $_.relativePath -eq $createdRelative }).Count
    $changeEventCount = @($fsRecords | Where-Object { $_.action -eq 'changed' -and $_.relativePath -eq $createdRelative }).Count
    $renameEventCount = @($fsRecords | Where-Object { $_.action -eq 'renamed' -and $_.relativePath -eq $renamedRelative -and $_.oldRelativePath -eq $createdRelative }).Count
    $nestedCreateEventCount = @($fsRecords | Where-Object { $_.action -eq 'created' -and $_.relativePath -eq $nestedRelative }).Count
    $deleteEventCount = @($fsRecords | Where-Object { $_.action -eq 'deleted' -and $_.relativePath -eq $renamedRelative }).Count
    Assert-Condition -Condition ($createEventCount -gt 0) -Message 'Expected file create event was not recorded with the correct relative path.'
    Assert-Condition -Condition ($changeEventCount -gt $changeCountBefore) -Message 'Expected file change event was not recorded after the explicit content update.'
    Assert-Condition -Condition ($renameEventCount -gt 0) -Message 'Expected rename event did not contain the correct old and new relative paths.'
    Assert-Condition -Condition ($nestedCreateEventCount -gt 0) -Message 'Expected nested file event was not recorded with the correct relative path.'
    Assert-Condition -Condition ($deleteEventCount -gt 0) -Message 'Expected file delete event was not recorded with the correct relative path.'

    $rawPluginLines = @(Get-Content -LiteralPath $pluginLog | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Assert-Condition -Condition ($rawPluginLines.Count -gt 0) -Message 'Plugin state event log was empty.'
    $pluginRecords = @(Get-JsonLineRecords -Path $pluginLog)
    Assert-Condition -Condition ($pluginRecords.Count -eq $rawPluginLines.Count) -Message 'Plugin state JSONL did not parse into exactly one record per non-empty line.'
    Assert-Condition -Condition (($rawPluginLines -join "`n").IndexOf($contentMarker, [System.StringComparison]::Ordinal) -lt 0) -Message 'Plugin state log exposed plugin file contents.'
    $expectedPluginProperties = @('timestamp', 'writeOccurred', 'event', 'size', 'sha256')
    foreach ($record in $pluginRecords) {
        $pluginPropertyNames = @($record.PSObject.Properties.Name)
        Assert-Condition -Condition ($pluginPropertyNames.Count -eq $expectedPluginProperties.Count) -Message 'Plugin state log contained an unexpected telemetry field.'
        foreach ($expectedProperty in $expectedPluginProperties) {
            Assert-Condition -Condition ($pluginPropertyNames -contains $expectedProperty) -Message ("Plugin state log omitted expected field {0}." -f $expectedProperty)
        }
    }
    $matchingPluginEventCount = @($pluginRecords | Where-Object { $_.event -eq 'changed' -and $_.size -eq $expectedPluginSize -and $_.sha256 -eq $expectedPluginHash }).Count
    Assert-Condition -Condition ($matchingPluginEventCount -gt 0) -Message 'Plugin state log did not record the expected content-blind size/SHA-256 observation.'

    $resourceRows = @(Import-Csv -LiteralPath $resourceLog)
    Assert-Condition -Condition ($resourceRows.Count -gt 0) -Message 'Resource sample log contained no samples.'
    $expectedResourceProperties = @('timestamp', 'processCount', 'workingSetBytes', 'privateMemoryBytes', 'totalCpuSeconds', 'allResponding')
    foreach ($row in $resourceRows) {
        $resourcePropertyNames = @($row.PSObject.Properties.Name)
        Assert-Condition -Condition (($resourcePropertyNames -join '|') -eq ($expectedResourceProperties -join '|')) -Message 'Resource sample CSV did not retain the expected six-column schema.'
        $parsedTimestamp = [DateTimeOffset]::MinValue
        Assert-Condition -Condition ([DateTimeOffset]::TryParse($row.timestamp, [ref]$parsedTimestamp)) -Message 'Resource sample CSV contained an invalid timestamp.'
        [long]$parsedProcessCount = 0
        Assert-Condition -Condition ([long]::TryParse($row.processCount, [ref]$parsedProcessCount) -and $parsedProcessCount -ge 0) -Message 'Resource sample CSV contained an invalid process count.'
        $parsedResponding = $false
        Assert-Condition -Condition ([bool]::TryParse($row.allResponding, [ref]$parsedResponding)) -Message 'Resource sample CSV contained an invalid allResponding value.'
    }

    $summary = [ordered]@{
        result = 'PASS'
        windowsPowerShell = $runtimeVersion
        edition = $runtimeEdition
        filesystemEventRecords = $fsRecords.Count
        eventCounts = [ordered]@{
            created = $createEventCount
            changed = $changeEventCount
            renamed = $renameEventCount
            nestedUnicodeCreated = $nestedCreateEventCount
            deleted = $deleteEventCount
        }
        pluginStateEventRecords = $pluginRecords.Count
        matchingPluginStateEvents = $matchingPluginEventCount
        resourceSamples = $resourceRows.Count
        subprocessPathsWithSpacesAndUnicode = $true
        siblingPrefixRejected = $true
        normalizedEscapeRejected = $true
        renameOldAndNewPathsContained = $true
        absoluteValidationRootAbsent = $true
        pluginContentsAbsentFromLog = $true
        resourceSchemaValid = $true
        unsupportedGetRelativePathAbsent = $true
        watcherExitCode = $watcherExitCode
        watcherExitedCleanly = $true
        watcherProcessAbsent = $true
        watcherCleanupCompleted = $true
        stderrEmpty = $true
        disposableDirectoryRemoved = $false
    }
}
catch {
    $failure = $_.Exception.Message
}
finally {
    if ($null -ne $watcherProcess) {
        try {
            $watcherProcess.Refresh()
            if (-not $watcherProcess.HasExited) {
                if (-not [string]::IsNullOrEmpty($stopFile) -and -not (Test-Path -LiteralPath $stopFile)) {
                    'stop' | Set-Content -LiteralPath $stopFile -Encoding ascii
                }

                $cleanupDeadline = [DateTime]::UtcNow.AddSeconds(5)
                while (-not $watcherProcess.HasExited -and [DateTime]::UtcNow -lt $cleanupDeadline) {
                    Start-Sleep -Milliseconds 100
                    $watcherProcess.Refresh()
                }
                if (-not $watcherProcess.HasExited) {
                    Stop-Process -Id $watcherProcess.Id -Force -ErrorAction SilentlyContinue
                    $watcherProcess.WaitForExit()
                    $cleanupFailure = 'Watcher required forced termination during cleanup.'
                    $failure = if ($null -eq $failure) { $cleanupFailure } else { $failure + ' Cleanup: ' + $cleanupFailure }
                }
            }

            $watcherProcess.Refresh()
            if ($watcherProcess.HasExited -and -not $streamsRead) {
                $watcherProcess.WaitForExit()
                $stdoutText = $watcherProcess.StandardOutput.ReadToEnd()
                $stderrText = $watcherProcess.StandardError.ReadToEnd()
                $streamsRead = $true
                if (-not [string]::IsNullOrWhiteSpace($stderrText)) {
                    $stderrFailure = 'Watcher stderr during failed verification: ' + $stderrText.Trim()
                    $failure = if ($null -eq $failure) { $stderrFailure } else { $failure + ' ' + $stderrFailure }
                }
            }
        }
        catch {
            $cleanupFailure = 'Watcher cleanup failed: ' + $_.Exception.Message
            $failure = if ($null -eq $failure) { $cleanupFailure } else { $failure + ' Cleanup: ' + $cleanupFailure }
        }
        finally {
            $watcherProcess.Dispose()
        }
    }

    try {
        if (-not [string]::IsNullOrEmpty($tempRoot) -and (Test-Path -LiteralPath $tempRoot)) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force
        }
    }
    catch {
        $cleanupFailure = 'Disposable verification directory could not be removed: ' + $_.Exception.Message
        $failure = if ($null -eq $failure) { $cleanupFailure } else { $failure + ' Cleanup: ' + $cleanupFailure }
    }

    if (-not [string]::IsNullOrEmpty($tempRoot) -and (Test-Path -LiteralPath $tempRoot)) {
        $cleanupFailure = 'Disposable verification directory remained after cleanup.'
        $failure = if ($null -eq $failure) { $cleanupFailure } else { $failure + ' Cleanup: ' + $cleanupFailure }
    }
    elseif ($null -ne $summary) {
        $summary['disposableDirectoryRemoved'] = $true
    }
}

if ($null -ne $failure) {
    throw $failure
}

($summary | ConvertTo-Json -Compress -Depth 5)
