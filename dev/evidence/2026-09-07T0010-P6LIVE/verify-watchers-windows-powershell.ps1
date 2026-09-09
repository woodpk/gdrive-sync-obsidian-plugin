param(
    [Parameter(Mandatory = $false)]
    [string]$WatcherPath = (Join-Path $PSScriptRoot 'watchers.ps1')
)

$ErrorActionPreference = 'Stop'

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

function Assert-WatcherAlive {
    param(
        [Parameter(Mandatory = $true)]
        [System.Diagnostics.Process]$Process,
        [Parameter(Mandatory = $true)]
        [string]$Stage
    )

    $Process.Refresh()
    Assert-Condition -Condition (-not $Process.HasExited) -Message ("Watcher exited unexpectedly during {0}." -f $Stage)
}

Assert-Condition -Condition ($env:OS -eq 'Windows_NT') -Message 'This verification must run on Windows.'
Assert-Condition -Condition (Test-Path -LiteralPath $WatcherPath -PathType Leaf) -Message 'Watcher script was not found.'

$windowsPowerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
Assert-Condition -Condition (Test-Path -LiteralPath $windowsPowerShell -PathType Leaf) -Message 'Windows PowerShell executable was not found.'

$runtimeText = (& $windowsPowerShell -NoProfile -Command '$PSVersionTable.PSVersion.ToString() + "|" + $PSVersionTable.PSEdition').Trim()
Assert-Condition -Condition ($LASTEXITCODE -eq 0) -Message 'Unable to query Windows PowerShell runtime.'
$runtimeParts = $runtimeText -split '\|', 2
Assert-Condition -Condition ($runtimeParts.Count -eq 2) -Message 'Unexpected Windows PowerShell runtime response.'
Assert-Condition -Condition ($runtimeParts[0].StartsWith('5.1.')) -Message ("Expected Windows PowerShell 5.1, found {0}." -f $runtimeParts[0])
Assert-Condition -Condition ($runtimeParts[1] -eq 'Desktop') -Message ("Expected Windows PowerShell Desktop edition, found {0}." -f $runtimeParts[1])

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('p6-watcher-compat-' + [guid]::NewGuid().ToString('N'))
$validationRoot = Join-Path $tempRoot 'Vault Ünicode'
$siblingRoot = Join-Path $tempRoot 'Vault Ünicode-Other'
$pluginRoot = Join-Path $tempRoot 'Plugin State'
$evidenceRoot = Join-Path $tempRoot 'Evidence Output'
$pluginDataPath = Join-Path $pluginRoot 'data.json'
$stdoutPath = Join-Path $evidenceRoot 'watcher-stdout.txt'
$stderrPath = Join-Path $evidenceRoot 'watcher-stderr.txt'
$stopFile = Join-Path $evidenceRoot 'stop-watchers.flag'
$watcherProcess = $null
$failure = $null
$summary = $null

try {
    New-Item -ItemType Directory -Path $validationRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $siblingRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $pluginRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $evidenceRoot -Force | Out-Null

    $siblingProbePath = Join-Path $siblingRoot 'probe.txt'
    'outside' | Set-Content -LiteralPath $siblingProbePath -Encoding utf8
    $probeOutput = & $windowsPowerShell -NoProfile -ExecutionPolicy Bypass -File $WatcherPath -ValidationPath $validationRoot -PluginDataPath $pluginDataPath -EvidencePath $evidenceRoot -RelativePathProbe $siblingProbePath
    Assert-Condition -Condition ($LASTEXITCODE -eq 0) -Message 'Sibling-prefix containment probe failed to execute.'
    $probe = ($probeOutput | Out-String).Trim() | ConvertFrom-Json
    Assert-Condition -Condition (-not [bool]$probe.contained) -Message 'Sibling-prefix path was incorrectly accepted as contained.'
    Assert-Condition -Condition ($null -eq $probe.relativePath) -Message 'Sibling-prefix path was assigned an invented relative path.'
    Assert-Condition -Condition ($probe.pathError -eq 'outside-validation-root') -Message 'Sibling-prefix containment failure did not produce the expected non-secret indicator.'

    '{"initial":true}' | Set-Content -LiteralPath $pluginDataPath -Encoding utf8

    $quotedWatcher = '"{0}"' -f $WatcherPath.Replace('"', '""')
    $quotedValidation = '"{0}"' -f $validationRoot.Replace('"', '""')
    $quotedPlugin = '"{0}"' -f $pluginDataPath.Replace('"', '""')
    $quotedEvidence = '"{0}"' -f $evidenceRoot.Replace('"', '""')
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', $quotedWatcher,
        '-ValidationPath', $quotedValidation,
        '-PluginDataPath', $quotedPlugin,
        '-EvidencePath', $quotedEvidence
    )

    $watcherProcess = Start-Process -FilePath $windowsPowerShell -ArgumentList $arguments -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    Start-Sleep -Seconds 2
    Assert-WatcherAlive -Process $watcherProcess -Stage 'startup'

    $createdRelative = 'alpha file.txt'
    $createdPath = Join-Path $validationRoot $createdRelative
    'one' | Set-Content -LiteralPath $createdPath -Encoding utf8
    Start-Sleep -Milliseconds 900
    Assert-WatcherAlive -Process $watcherProcess -Stage 'file creation'

    'two' | Add-Content -LiteralPath $createdPath -Encoding utf8
    Start-Sleep -Milliseconds 900
    Assert-WatcherAlive -Process $watcherProcess -Stage 'file change'

    $renamedRelative = 'renamed ü.txt'
    Rename-Item -LiteralPath $createdPath -NewName $renamedRelative
    $renamedPath = Join-Path $validationRoot $renamedRelative
    Start-Sleep -Milliseconds 900
    Assert-WatcherAlive -Process $watcherProcess -Stage 'file rename'

    $nestedDirectory = Join-Path $validationRoot 'Nested Space\子'
    New-Item -ItemType Directory -Path $nestedDirectory -Force | Out-Null
    $nestedRelative = 'Nested Space\子\nested.txt'
    $nestedPath = Join-Path $validationRoot $nestedRelative
    'nested' | Set-Content -LiteralPath $nestedPath -Encoding utf8
    Start-Sleep -Milliseconds 900
    Assert-WatcherAlive -Process $watcherProcess -Stage 'nested file creation'

    Remove-Item -LiteralPath $renamedPath -Force
    Start-Sleep -Milliseconds 900
    Assert-WatcherAlive -Process $watcherProcess -Stage 'file deletion'

    $contentMarker = 'SYNTHETIC_PLUGIN_CONTENT_MUST_NOT_APPEAR_IN_LOGS'
    ('{"marker":"' + $contentMarker + '","changed":true}') | Set-Content -LiteralPath $pluginDataPath -Encoding utf8
    $expectedPluginSize = (Get-Item -LiteralPath $pluginDataPath).Length
    $expectedPluginHash = (Get-FileHash -LiteralPath $pluginDataPath -Algorithm SHA256).Hash.ToLowerInvariant()
    Start-Sleep -Seconds 3
    Assert-WatcherAlive -Process $watcherProcess -Stage 'plugin data change and resource sampling'

    'stop' | Set-Content -LiteralPath $stopFile -Encoding ascii
    $shutdownDeadline = [DateTime]::UtcNow.AddSeconds(10)
    while (-not $watcherProcess.HasExited -and [DateTime]::UtcNow -lt $shutdownDeadline) {
        Start-Sleep -Milliseconds 200
        $watcherProcess.Refresh()
    }
    Assert-Condition -Condition $watcherProcess.HasExited -Message 'Watcher did not stop cleanly after stop-watchers.flag was created.'
    Assert-Condition -Condition ($watcherProcess.ExitCode -eq 0) -Message ("Watcher exited with code {0}." -f $watcherProcess.ExitCode)

    $fsLog = Join-Path $evidenceRoot 'filesystem-events.jsonl'
    $pluginLog = Join-Path $evidenceRoot 'plugin-state-events.jsonl'
    $resourceLog = Join-Path $evidenceRoot 'resource-samples.csv'
    Assert-Condition -Condition (Test-Path -LiteralPath $fsLog -PathType Leaf) -Message 'filesystem-events.jsonl was not created.'
    Assert-Condition -Condition (Test-Path -LiteralPath $pluginLog -PathType Leaf) -Message 'plugin-state-events.jsonl was not created.'
    Assert-Condition -Condition (Test-Path -LiteralPath $resourceLog -PathType Leaf) -Message 'resource-samples.csv was not created.'

    $rawFsLines = @(Get-Content -LiteralPath $fsLog | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Assert-Condition -Condition ($rawFsLines.Count -gt 0) -Message 'Filesystem event log was empty.'
    $fsRecords = @($rawFsLines | ForEach-Object { $_ | ConvertFrom-Json })
    Assert-Condition -Condition (($rawFsLines -join "`n").IndexOf($validationRoot, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) -Message 'Filesystem event log exposed the absolute validation root.'

    Assert-Condition -Condition (@($fsRecords | Where-Object { $_.action -eq 'created' -and $_.relativePath -eq $createdRelative }).Count -gt 0) -Message 'Expected file create event was not recorded with the correct relative path.'
    Assert-Condition -Condition (@($fsRecords | Where-Object { $_.action -eq 'changed' -and $_.relativePath -eq $createdRelative }).Count -gt 0) -Message 'Expected file change event was not recorded with the correct relative path.'
    Assert-Condition -Condition (@($fsRecords | Where-Object { $_.action -eq 'renamed' -and $_.relativePath -eq $renamedRelative -and $_.oldRelativePath -eq $createdRelative }).Count -gt 0) -Message 'Expected rename event did not contain the correct old and new relative paths.'
    Assert-Condition -Condition (@($fsRecords | Where-Object { $_.action -eq 'created' -and $_.relativePath -eq $nestedRelative }).Count -gt 0) -Message 'Expected nested file event was not recorded with the correct relative path.'
    Assert-Condition -Condition (@($fsRecords | Where-Object { $_.action -eq 'deleted' -and $_.relativePath -eq $renamedRelative }).Count -gt 0) -Message 'Expected file delete event was not recorded with the correct relative path.'

    $rawPluginLines = @(Get-Content -LiteralPath $pluginLog | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    Assert-Condition -Condition ($rawPluginLines.Count -gt 0) -Message 'Plugin state event log was empty.'
    $pluginRecords = @($rawPluginLines | ForEach-Object { $_ | ConvertFrom-Json })
    Assert-Condition -Condition (($rawPluginLines -join "`n").IndexOf($contentMarker, [System.StringComparison]::Ordinal) -lt 0) -Message 'Plugin state log exposed plugin file contents.'
    Assert-Condition -Condition (@($pluginRecords | Where-Object { $_.event -eq 'changed' -and $_.size -eq $expectedPluginSize -and $_.sha256 -eq $expectedPluginHash }).Count -gt 0) -Message 'Plugin state log did not record the expected content-blind size/SHA-256 observation.'

    $resourceRows = @(Import-Csv -LiteralPath $resourceLog)
    Assert-Condition -Condition ($resourceRows.Count -gt 0) -Message 'Resource sample log contained no samples.'
    foreach ($row in $resourceRows) {
        Assert-Condition -Condition ($null -ne $row.timestamp -and $null -ne $row.processCount -and $null -ne $row.workingSetBytes -and $null -ne $row.privateMemoryBytes -and $null -ne $row.totalCpuSeconds -and $null -ne $row.allResponding) -Message 'Resource sample CSV did not retain the expected six-column schema.'
        $parsedTimestamp = [DateTimeOffset]::MinValue
        Assert-Condition -Condition ([DateTimeOffset]::TryParse($row.timestamp, [ref]$parsedTimestamp)) -Message 'Resource sample CSV contained an invalid timestamp.'
    }

    $stderrText = if (Test-Path -LiteralPath $stderrPath) { Get-Content -LiteralPath $stderrPath -Raw } else { '' }
    Assert-Condition -Condition ($stderrText -notmatch 'GetRelativePath') -Message 'Unsupported GetRelativePath runtime exception was observed.'
    Assert-Condition -Condition (@(Get-Process -Id $watcherProcess.Id -ErrorAction SilentlyContinue).Count -eq 0) -Message 'Watcher process remained after clean shutdown.'

    $summary = [ordered]@{
        result = 'PASS'
        windowsPowerShell = $runtimeParts[0]
        edition = $runtimeParts[1]
        filesystemEventRecords = $fsRecords.Count
        pluginStateEventRecords = $pluginRecords.Count
        resourceSamples = $resourceRows.Count
        siblingPrefixRejected = $true
        pluginContentsAbsentFromLog = $true
        watcherExitedCleanly = $true
    }
}
catch {
    $failure = $_.Exception.Message
}
finally {
    if ($null -ne $watcherProcess) {
        $watcherProcess.Refresh()
        if (-not $watcherProcess.HasExited) {
            try {
                if (-not (Test-Path -LiteralPath $stopFile)) {
                    'stop' | Set-Content -LiteralPath $stopFile -Encoding ascii
                }
                $cleanupDeadline = [DateTime]::UtcNow.AddSeconds(5)
                while (-not $watcherProcess.HasExited -and [DateTime]::UtcNow -lt $cleanupDeadline) {
                    Start-Sleep -Milliseconds 200
                    $watcherProcess.Refresh()
                }
                if (-not $watcherProcess.HasExited) {
                    Stop-Process -Id $watcherProcess.Id -Force -ErrorAction SilentlyContinue
                    if ($null -eq $failure) {
                        $failure = 'Watcher required forced termination during cleanup.'
                    }
                }
            }
            catch {
                if ($null -eq $failure) {
                    $failure = 'Watcher cleanup failed.'
                }
            }
        }
    }

    try {
        if (Test-Path -LiteralPath $tempRoot) {
            Remove-Item -LiteralPath $tempRoot -Recurse -Force
        }
    }
    catch {
        if ($null -eq $failure) {
            $failure = 'Disposable verification directory could not be removed.'
        }
    }

    if (Test-Path -LiteralPath $tempRoot) {
        if ($null -eq $failure) {
            $failure = 'Disposable verification directory remained after cleanup.'
        }
    }
}

if ($null -ne $failure) {
    throw $failure
}

($summary | ConvertTo-Json -Compress)
