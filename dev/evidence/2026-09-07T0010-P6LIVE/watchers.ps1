param(
    [Parameter(Mandatory = $true)]
    [string]$ValidationPath,
    [Parameter(Mandatory = $true)]
    [string]$PluginDataPath,
    [Parameter(Mandatory = $true)]
    [string]$EvidencePath
)

$ErrorActionPreference = 'Continue'
$fsLog = Join-Path $EvidencePath 'filesystem-events.jsonl'
$stateLog = Join-Path $EvidencePath 'plugin-state-events.jsonl'
$resourceLog = Join-Path $EvidencePath 'resource-samples.csv'
$stopFile = Join-Path $EvidencePath 'stop-watchers.flag'

if (-not (Test-Path -LiteralPath $resourceLog)) {
    'timestamp,processCount,workingSetBytes,privateMemoryBytes,totalCpuSeconds,allResponding' | Set-Content -LiteralPath $resourceLog -Encoding utf8
}

$vaultWatcher = [System.IO.FileSystemWatcher]::new($ValidationPath)
$vaultWatcher.IncludeSubdirectories = $true
$vaultWatcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, DirectoryName, LastWrite, Size'
$vaultWatcher.EnableRaisingEvents = $true

$dataWatcher = [System.IO.FileSystemWatcher]::new((Split-Path -Parent $PluginDataPath), (Split-Path -Leaf $PluginDataPath))
$dataWatcher.NotifyFilter = [System.IO.NotifyFilters]'LastWrite, Size, FileName'
$dataWatcher.EnableRaisingEvents = $true

Register-ObjectEvent -InputObject $vaultWatcher -EventName Created -SourceIdentifier 'validation-created' | Out-Null
Register-ObjectEvent -InputObject $vaultWatcher -EventName Changed -SourceIdentifier 'validation-changed' | Out-Null
Register-ObjectEvent -InputObject $vaultWatcher -EventName Deleted -SourceIdentifier 'validation-deleted' | Out-Null
Register-ObjectEvent -InputObject $vaultWatcher -EventName Renamed -SourceIdentifier 'validation-renamed' | Out-Null
Register-ObjectEvent -InputObject $dataWatcher -EventName Changed -SourceIdentifier 'plugin-data-changed' | Out-Null
Register-ObjectEvent -InputObject $dataWatcher -EventName Created -SourceIdentifier 'plugin-data-created' | Out-Null
Register-ObjectEvent -InputObject $dataWatcher -EventName Renamed -SourceIdentifier 'plugin-data-renamed' | Out-Null

$lastResourceSample = [DateTimeOffset]::MinValue

try {
    while (-not (Test-Path -LiteralPath $stopFile)) {
        $evt = Wait-Event -Timeout 1
        while ($null -ne $evt) {
            $now = [DateTimeOffset]::Now.ToString('o')
            if ($evt.SourceIdentifier -like 'validation-*') {
                $args = $evt.SourceEventArgs
                $record = [ordered]@{
                    timestamp = $now
                    action = $evt.SourceIdentifier.Substring('validation-'.Length)
                    relativePath = if ($args.FullPath) { [System.IO.Path]::GetRelativePath($ValidationPath, $args.FullPath) } else { $null }
                }
                if ($evt.SourceIdentifier -eq 'validation-renamed') {
                    $record.oldRelativePath = [System.IO.Path]::GetRelativePath($ValidationPath, $args.OldFullPath)
                }
                ($record | ConvertTo-Json -Compress) | Add-Content -LiteralPath $fsLog -Encoding utf8
            }
            elseif ($evt.SourceIdentifier -like 'plugin-data-*') {
                $size = $null
                $hash = $null
                try {
                    $item = Get-Item -LiteralPath $PluginDataPath -ErrorAction Stop
                    $size = $item.Length
                    $hash = (Get-FileHash -LiteralPath $PluginDataPath -Algorithm SHA256 -ErrorAction Stop).Hash.ToLowerInvariant()
                } catch {}
                $record = [ordered]@{
                    timestamp = $now
                    writeOccurred = $true
                    event = $evt.SourceIdentifier.Substring('plugin-data-'.Length)
                    size = $size
                    sha256 = $hash
                }
                ($record | ConvertTo-Json -Compress) | Add-Content -LiteralPath $stateLog -Encoding utf8
            }
            Remove-Event -EventIdentifier $evt.EventIdentifier -ErrorAction SilentlyContinue
            $evt = Get-Event | Select-Object -First 1
        }

        $sampleNow = [DateTimeOffset]::Now
        if (($sampleNow - $lastResourceSample).TotalSeconds -ge 2) {
            $processes = @(Get-Process -Name Obsidian -ErrorAction SilentlyContinue)
            $working = ($processes | Measure-Object -Property WorkingSet64 -Sum).Sum
            $private = ($processes | Measure-Object -Property PrivateMemorySize64 -Sum).Sum
            $cpu = ($processes | Measure-Object -Property CPU -Sum).Sum
            $responding = @($processes | Where-Object { -not $_.Responding }).Count -eq 0
            ('{0},{1},{2},{3},{4},{5}' -f $sampleNow.ToString('o'), $processes.Count, $working, $private, $cpu, $responding) | Add-Content -LiteralPath $resourceLog -Encoding utf8
            $lastResourceSample = $sampleNow
        }
    }
}
finally {
    Get-EventSubscriber | Where-Object { $_.SourceIdentifier -like 'validation-*' -or $_.SourceIdentifier -like 'plugin-data-*' } | Unregister-Event -Force -ErrorAction SilentlyContinue
    $vaultWatcher.Dispose()
    $dataWatcher.Dispose()
}
