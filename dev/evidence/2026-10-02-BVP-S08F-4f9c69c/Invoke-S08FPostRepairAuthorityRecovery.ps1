[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$RepositoryRoot,
    [Parameter(Mandatory = $true)][string]$Branch,
    [Parameter(Mandatory = $true)][string]$CandidateSha,
    [string]$VaultPath = 'D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b',
    [int]$DebugPort = 63311
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$implementationSha = '57e5be079ded16ba50b4f95c49f78a9d90b47f3f'
$evidenceRelative = 'dev/evidence/2026-10-02-BVP-S08F-4f9c69c'
$expectedProductionHash = '550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477'
$expectedProductionSize = 886635
$expectedValidationHash = '6c676900aaaf4aaa3417215d1eda2c16e578822715536ef1ffc0ca8741ffc9cf'
$expectedValidationSize = 911149
$expectedValidationManifestHash = 'f7ec45b74beb0e9edb041f17ae3af9e8f40b4cfd216ddbd3870adfdbd9d55ccc'
$oldValidationHash = '4c2e3d3cc18cfc30a2622068659ca8199c6ce8ed67dfec11dc298ff5b1e4e351'
$expectedCanaryHash = 'db03eedf8f43902405abdc0f893649a3d9b3e166e3e21d35a3e06e3c6a6e259d'
$retryRunId = 's08f-desktop-canary-4f9c69c-r2'
$deviceId = 'windows-brain-patrick'
$tempRoot = Join-Path 'C:\' ('s08f-' + [guid]::NewGuid().ToString('N'))
$sourceWorktree = Join-Path $tempRoot 's'
$evidenceWorktree = Join-Path $tempRoot 'e'
$helper = Join-Path $tempRoot 'r.mjs'
$results = [System.Collections.Generic.List[object]]::new()
$git = $null
$node = $null
$npm = $null
$script:nativePathOverride = $null
$ready = $true
$physicalExit = $null
$recoverySuccess = $false
$evidenceCommit = ''
$published = $false
$preserve = $true

function Add-Result {
    param(
        [string]$Stage,
        [ValidateSet('PASS','FAIL','BLOCKED','SKIPPED','INDETERMINATE')][string]$Status,
        [string]$Classification,
        [string]$Summary,
        [AllowNull()][string]$Evidence = $null
    )
    [void]$results.Add([pscustomobject]@{
        stage = $Stage
        status = $Status
        classification = $Classification
        summary = $Summary
        evidence = $Evidence
    })
    Write-Host ('[{0}] {1}: {2}' -f $Status,$Stage,$Summary)
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [string]$WorkingDirectory = $RepositoryRoot
    )
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $File
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    if (-not [string]::IsNullOrWhiteSpace([string]$script:nativePathOverride)) {
        $psi.Environment['PATH'] = $script:nativePathOverride
    }
    foreach ($argument in $Arguments) { [void]$psi.ArgumentList.Add($argument) }
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdoutTask = $process.StandardOutput.ReadToEndAsync()
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $process.WaitForExit()
    return [pscustomobject]@{
        exitCode = $process.ExitCode
        stdout = $stdoutTask.GetAwaiter().GetResult()
        stderr = $stderrTask.GetAwaiter().GetResult()
        command = $File + ' ' + ($Arguments -join ' ')
    }
}

function Remote-Head {
    $result = Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'rev-parse',('refs/remotes/origin/' + $Branch))
    if ($result.exitCode -ne 0) { return $null }
    return $result.stdout.Trim()
}

function Changed-Paths {
    $tracked = Invoke-Native -File $git.Source -Arguments @('-C',$evidenceWorktree,'diff','--name-only')
    $untracked = Invoke-Native -File $git.Source -Arguments @('-C',$evidenceWorktree,'ls-files','--others','--exclude-standard')
    $items = @()
    if ($tracked.exitCode -eq 0) { $items += @($tracked.stdout.Split([Environment]::NewLine,[System.StringSplitOptions]::RemoveEmptyEntries)) }
    if ($untracked.exitCode -eq 0) { $items += @($untracked.stdout.Split([Environment]::NewLine,[System.StringSplitOptions]::RemoveEmptyEntries)) }
    return @($items | ForEach-Object { $_.Replace('\','/') } | Sort-Object -Unique)
}

try {
    Write-Host '============================================================'
    Write-Host 'S08F POST-REPAIR PRODUCT-AUTHORITY RECOVERY'
    Write-Host '============================================================'
    Write-Host ('Task candidate: {0}' -f $CandidateSha)
    Write-Host ('Repaired implementation: {0}' -f $implementationSha)
    Write-Host ('Disposable vault: {0}' -f $VaultPath)
    Write-Host ('Diagnostic root: {0}' -f $tempRoot)

    $git = Get-Command git.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    $node = Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $git -or $null -eq $node -or $null -eq $npm) {
        $ready = $false
        Add-Result 'toolchain' 'BLOCKED' 'ENVIRONMENT FAILURE' 'Required Git/Node/npm applications are unavailable.'
    } else {
        $pathParts = [System.Collections.Generic.List[string]]::new()
        foreach ($candidatePath in @(
            (Split-Path -Parent $node.Source),
            (Split-Path -Parent $git.Source),
            (Split-Path -Parent $npm.Source),
            (Join-Path $env:SystemRoot 'System32'),
            $env:SystemRoot,
            (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0')
        )) {
            if (-not [string]::IsNullOrWhiteSpace([string]$candidatePath) -and
                (Test-Path -LiteralPath $candidatePath -PathType Container) -and
                -not $pathParts.Contains($candidatePath)) {
                [void]$pathParts.Add($candidatePath)
            }
        }
        $script:nativePathOverride = $pathParts -join [System.IO.Path]::PathSeparator
        $nodeProbe = Invoke-Native -File $node.Source -Arguments @('--version')
        $wsProbe = Invoke-Native -File $node.Source -Arguments @('-e','process.stdout.write(typeof WebSocket)')
        if ($nodeProbe.exitCode -eq 0 -and $wsProbe.exitCode -eq 0 -and $wsProbe.stdout.Trim() -eq 'function') {
            Add-Result 'toolchain' 'PASS' 'TOOLCHAIN READY' ('Node {0}; WebSocket available; bounded child PATH established.' -f $nodeProbe.stdout.Trim())
        } else {
            $ready = $false
            Add-Result 'toolchain' 'BLOCKED' 'ENVIRONMENT FAILURE' 'Node/WebSocket runtime prerequisite is unavailable.' ($nodeProbe.stderr + $wsProbe.stderr)
        }
    }

    if ($ready) {
        $fetch = Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune')
        $remote = if ($fetch.exitCode -eq 0) { Remote-Head } else { $null }
        if ($fetch.exitCode -eq 0 -and $remote -ceq $CandidateSha) {
            Add-Result 'task-identity' 'PASS' 'EXACT TASK HEAD' ('Remote task branch is exactly {0}.' -f $CandidateSha)
        } else {
            $ready = $false
            Add-Result 'task-identity' 'BLOCKED' 'REPOSITORY-STATE FAILURE' ('Expected remote HEAD {0}; observed {1}.' -f $CandidateSha,$remote) ($fetch.stdout + $fetch.stderr)
        }
    }

    if ($ready) {
        $implProbe = Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'cat-file','-e',($implementationSha + '^{commit}'))
        if ($implProbe.exitCode -eq 0) {
            Add-Result 'implementation-identity' 'PASS' 'EXACT REPAIRED SOURCE' ('Repaired implementation commit {0} is available.' -f $implementationSha)
        } else {
            $ready = $false
            Add-Result 'implementation-identity' 'BLOCKED' 'REPOSITORY-STATE FAILURE' 'Exact repaired implementation commit is unavailable.' $implProbe.stderr
        }
    }

    if ($ready) {
        [void][System.IO.Directory]::CreateDirectory($tempRoot)
        $addSource = Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'worktree','add','--detach',$sourceWorktree,$implementationSha)
        $addEvidence = if ($addSource.exitCode -eq 0) {
            Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'worktree','add','--detach',$evidenceWorktree,$CandidateSha)
        } else { $null }
        if ($addSource.exitCode -eq 0 -and $null -ne $addEvidence -and $addEvidence.exitCode -eq 0) {
            Add-Result 'isolated-worktrees' 'PASS' 'EXACT-SHA ISOLATION' 'Created separate repaired-source and evidence/publication worktrees.'
        } else {
            $ready = $false
            $detail = $addSource.stdout + $addSource.stderr
            if ($null -ne $addEvidence) { $detail += $addEvidence.stdout + $addEvidence.stderr }
            Add-Result 'isolated-worktrees' 'BLOCKED' 'REPOSITORY-STATE FAILURE' 'Unable to create exact-SHA disposable worktrees.' $detail
        }
    }

    if ($ready) {
        $install = Invoke-Native -File $npm.Source -Arguments @('ci','--no-audit','--no-fund') -WorkingDirectory $sourceWorktree
        if ($install.exitCode -eq 0) {
            Add-Result 'dependencies' 'PASS' 'DEPENDENCIES READY' 'npm ci completed for the exact repaired source.'
        } else {
            $ready = $false
            Add-Result 'dependencies' 'FAIL' 'DEPENDENCY FAILURE' 'npm ci failed for the exact repaired source.' ($install.stdout + $install.stderr)
        }
    }

    if ($ready) {
        $compile = Invoke-Native -File $node.Source -Arguments @('node_modules/typescript/bin/tsc','-p','test-platform/tsconfig.json') -WorkingDirectory $sourceWorktree
        if ($compile.exitCode -eq 0) {
            Add-Result 'test-platform-compile' 'PASS' 'COMPILE PASS' 'Test-platform sources compile from the exact repaired source.'
        } else {
            $ready = $false
            Add-Result 'test-platform-compile' 'FAIL' 'BUILD FAILURE' 'Test-platform compilation failed.' ($compile.stdout + $compile.stderr)
        }
    }

    if ($ready) {
        $productionBuild = Invoke-Native -File $npm.Source -Arguments @('run','build') -WorkingDirectory $sourceWorktree
        $productionPath = Join-Path $sourceWorktree 'main.js'
        if ($productionBuild.exitCode -eq 0 -and (Test-Path -LiteralPath $productionPath -PathType Leaf)) {
            $productionHash = (Get-FileHash -LiteralPath $productionPath -Algorithm SHA256).Hash.ToLowerInvariant()
            $productionSize = (Get-Item -LiteralPath $productionPath).Length
            $productionText = [System.IO.File]::ReadAllText($productionPath)
            $forbidden = @('BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox') | Where-Object { $productionText.Contains($_,[System.StringComparison]::Ordinal) }
            if ($productionHash -ceq $expectedProductionHash -and $productionSize -eq $expectedProductionSize -and @($forbidden).Count -eq 0) {
                Add-Result 'production-artifact' 'PASS' 'EXACT REPAIRED PRODUCTION ARTIFACT' ('main.js {0} bytes / {1}; validation markers absent.' -f $productionSize,$productionHash)
            } else {
                $ready = $false
                Add-Result 'production-artifact' 'FAIL' 'ARTIFACT IDENTITY FAILURE' ('Unexpected production artifact: size={0} hash={1} markers={2}' -f $productionSize,$productionHash,(@($forbidden) -join ','))
            }
        } else {
            $ready = $false
            Add-Result 'production-artifact' 'FAIL' 'BUILD FAILURE' 'Production build did not produce main.js.' ($productionBuild.stdout + $productionBuild.stderr)
        }
    }

    if ($ready) {
        $validationBuild = Invoke-Native -File $node.Source -Arguments @('.test-build/bvp/test-platform/src/live-device/build-validation-artifact.js') -WorkingDirectory $sourceWorktree
        $validationDir = Join-Path $sourceWorktree '.test-build\bvp-live-device\plugin'
        $validationMain = Join-Path $validationDir 'main.js'
        $validationManifest = Join-Path $validationDir 'manifest.json'
        $validationIdentityPath = Join-Path $validationDir 'build-identity.json'
        if ($validationBuild.exitCode -eq 0 -and
            (Test-Path -LiteralPath $validationMain -PathType Leaf) -and
            (Test-Path -LiteralPath $validationManifest -PathType Leaf) -and
            (Test-Path -LiteralPath $validationIdentityPath -PathType Leaf)) {
            $validationHash = (Get-FileHash -LiteralPath $validationMain -Algorithm SHA256).Hash.ToLowerInvariant()
            $validationSize = (Get-Item -LiteralPath $validationMain).Length
            $manifestHash = (Get-FileHash -LiteralPath $validationManifest -Algorithm SHA256).Hash.ToLowerInvariant()
            $identity = Get-Content -LiteralPath $validationIdentityPath -Raw | ConvertFrom-Json
            $identityPass = [string]$identity.sourceCommit -ceq $implementationSha -and
                [string]$identity.artifactSha256 -ceq $expectedValidationHash -and
                [int64]$identity.artifactSize -eq $expectedValidationSize -and
                [string]$identity.manifestSha256 -ceq $expectedValidationManifestHash
            if ($validationHash -ceq $expectedValidationHash -and
                $validationSize -eq $expectedValidationSize -and
                $manifestHash -ceq $expectedValidationManifestHash -and
                $identityPass) {
                Add-Result 'validation-artifact' 'PASS' 'EXACT REPAIRED VALIDATION ARTIFACT' ('Validation main.js {0} bytes / {1}; source={2}.' -f $validationSize,$validationHash,$implementationSha)
            } else {
                $ready = $false
                Add-Result 'validation-artifact' 'FAIL' 'ARTIFACT IDENTITY FAILURE' ('Validation artifact mismatch: size={0} hash={1} manifest={2} source={3}' -f $validationSize,$validationHash,$manifestHash,[string]$identity.sourceCommit)
            }
        } else {
            $ready = $false
            Add-Result 'validation-artifact' 'FAIL' 'BUILD FAILURE' 'Validation artifact build did not produce the complete plugin artifact.' ($validationBuild.stdout + $validationBuild.stderr)
        }
    }

    $pluginDir = Join-Path $VaultPath '.obsidian\plugins\brain-google-drive-sync'
    $dataJson = Join-Path $pluginDir 'data.json'
    $installedMain = Join-Path $pluginDir 'main.js'
    $installedManifest = Join-Path $pluginDir 'manifest.json'
    $installedIdentity = Join-Path $pluginDir 'build-identity.json'
    $relayState = Join-Path $pluginDir ('.bvp-relay\device-state\' + $retryRunId + '--' + $deviceId + '.json')
    $canaryPath = Join-Path $VaultPath 'BVP-VALIDATION\s08f-desktop-canary-4f9c69c\canary.md'

    if ($ready) {
        $presencePass = (Test-Path -LiteralPath $pluginDir -PathType Container) -and
            (Test-Path -LiteralPath $dataJson -PathType Leaf) -and
            (Test-Path -LiteralPath $installedMain -PathType Leaf) -and
            (Test-Path -LiteralPath $installedManifest -PathType Leaf) -and
            (Test-Path -LiteralPath $relayState -PathType Leaf) -and
            (Test-Path -LiteralPath $canaryPath -PathType Leaf)
        if (-not $presencePass) {
            $ready = $false
            Add-Result 'preserved-physical-state' 'BLOCKED' 'PHYSICAL PRECONDITION FAILURE' 'Disposable plugin, r2 state, or preserved canary fixture is missing.'
        } else {
            $retryState = Get-Content -LiteralPath $relayState -Raw | ConvertFrom-Json
            $retryCommand = $null
            try { $retryCommand = [string]$retryState.commandKey | ConvertFrom-Json } catch { }
            $canaryHash = (Get-FileHash -LiteralPath $canaryPath -Algorithm SHA256).Hash.ToLowerInvariant()
            $canarySize = (Get-Item -LiteralPath $canaryPath).Length
            $installedHash = (Get-FileHash -LiteralPath $installedMain -Algorithm SHA256).Hash.ToLowerInvariant()
            $statePass = [int]$retryState.sequence -eq 3 -and
                [string]$retryState.phase -ceq 'completed' -and
                $null -ne $retryCommand -and
                [string]$retryCommand.runId -ceq $retryRunId -and
                [int]$retryCommand.sequence -eq 3 -and
                [string]$retryCommand.kind -ceq 'production-execute' -and
                [string]$retryState.result.status -ceq 'rejected' -and
                [string]$retryState.result.classification -ceq 'production-action-rejected'
            $fixturePass = $canarySize -eq 77 -and $canaryHash -ceq $expectedCanaryHash
            $installedPass = $installedHash -ceq $oldValidationHash -or $installedHash -ceq $expectedValidationHash
            if ($statePass -and $fixturePass -and $installedPass) {
                Add-Result 'preserved-physical-state' 'PASS' 'EXACT R2 PRESERVED STATE' ('r2 remains terminal sequence 3; canary is exact; installed validation hash={0}.' -f $installedHash)
            } else {
                $ready = $false
                Add-Result 'preserved-physical-state' 'BLOCKED' 'PHYSICAL PRECONDITION FAILURE' ('Preserved state mismatch: statePass={0} fixturePass={1} installedHash={2}' -f $statePass,$fixturePass,$installedHash)
            }
        }
    }

    if ($ready) {
        $dataHashBefore = (Get-FileHash -LiteralPath $dataJson -Algorithm SHA256).Hash.ToLowerInvariant()
        Copy-Item -LiteralPath $validationMain -Destination $installedMain -Force
        Copy-Item -LiteralPath $validationManifest -Destination $installedManifest -Force
        Copy-Item -LiteralPath $validationIdentityPath -Destination $installedIdentity -Force
        $dataHashAfter = (Get-FileHash -LiteralPath $dataJson -Algorithm SHA256).Hash.ToLowerInvariant()
        $installedHashAfter = (Get-FileHash -LiteralPath $installedMain -Algorithm SHA256).Hash.ToLowerInvariant()
        $installedIdentityModel = Get-Content -LiteralPath $installedIdentity -Raw | ConvertFrom-Json
        if ($dataHashBefore -ceq $dataHashAfter -and
            $installedHashAfter -ceq $expectedValidationHash -and
            [string]$installedIdentityModel.sourceCommit -ceq $implementationSha) {
            Add-Result 'repaired-validation-install' 'PASS' 'BOUNDED VALIDATION INSTALL' 'Installed only repaired validation main.js/manifest/build identity; data.json remained byte-identical.'
        } else {
            $ready = $false
            Add-Result 'repaired-validation-install' 'FAIL' 'PHYSICAL INSTALL FAILURE' ('Install verification failed: dataBefore={0} dataAfter={1} main={2} source={3}' -f $dataHashBefore,$dataHashAfter,$installedHashAfter,[string]$installedIdentityModel.sourceCommit)
        }
    }

    if ($ready) {
        $builder = [System.Text.StringBuilder]::new()
        foreach ($index in 1..5) {
            $relativePart = $evidenceRelative + '/s08f-physical-canary.part' + $index + '.mjs.txt'
            $show = Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'show',($CandidateSha + ':' + $relativePart))
            if ($show.exitCode -ne 0) {
                $ready = $false
                Add-Result 'helper-materialization' 'BLOCKED' 'EVIDENCE FAILURE' ('Unable to read helper fragment {0} from exact task candidate.' -f $relativePart) $show.stderr
                break
            }
            [void]$builder.AppendLine($show.stdout)
        }
        if ($ready) {
            [System.IO.File]::WriteAllText($helper,$builder.ToString(),[System.Text.UTF8Encoding]::new($false))
            $syntax = Invoke-Native -File $node.Source -Arguments @('--check',$helper) -WorkingDirectory $sourceWorktree
            $self = if ($syntax.exitCode -eq 0) { Invoke-Native -File $node.Source -Arguments @($helper,'--self-check') -WorkingDirectory $sourceWorktree } else { $null }
            if ($syntax.exitCode -eq 0 -and $null -ne $self -and $self.exitCode -eq 0) {
                Add-Result 'helper-materialization' 'PASS' 'HARNESS SELF-REVIEW PASS' 'Exact candidate helper assembled and passed syntax/self-check.'
            } else {
                $ready = $false
                $detail = $syntax.stdout + $syntax.stderr
                if ($null -ne $self) { $detail += $self.stdout + $self.stderr }
                Add-Result 'helper-materialization' 'FAIL' 'VERIFICATION-HARNESS DEFECT' 'Physical helper syntax/self-check failed.' $detail
            }
        }
    }

    if ($ready) {
        $evidenceDir = Join-Path $evidenceWorktree $evidenceRelative
        $physical = Invoke-Native -File $node.Source -Arguments @(
            $helper,'--vault',$VaultPath,'--worktree',$sourceWorktree,'--evidence-dir',$evidenceDir,
            '--debug-port',[string]$DebugPort,'--source-commit',$implementationSha,'--branch-head',$CandidateSha
        ) -WorkingDirectory $sourceWorktree
        $physicalExit = $physical.exitCode
        if ($physical.stdout) { Write-Host $physical.stdout.TrimEnd() }
        if ($physical.stderr) { Write-Warning $physical.stderr.TrimEnd() }

        $verdictPath = Join-Path $evidenceDir 'S08F-BLOCKED.json'
        if (Test-Path -LiteralPath $verdictPath -PathType Leaf) {
            $verdict = Get-Content -LiteralPath $verdictPath -Raw | ConvertFrom-Json
            $recoverySuccess = $physicalExit -eq 20 -and
                [string]$verdict.status -ceq 'BLOCKED' -and
                [string]$verdict.classification -ceq 'r2-terminal-product-authority-recovered'
        }
        if ($recoverySuccess) {
            Add-Result 'product-authority-recovery' 'PASS' 'PRODUCT AUTHORITY RECOVERED' 'Repaired product recovered the preserved uncertain r2 durable intent to authoritative idle-ready state without replaying r2.'
        } elseif ($physicalExit -eq 20) {
            Add-Result 'product-authority-recovery' 'BLOCKED' 'PHYSICAL RECOVERY BLOCKED' 'Recovery helper stopped safely before product authority was proven restored.' ($physical.stdout + $physical.stderr)
        } else {
            Add-Result 'product-authority-recovery' 'FAIL' 'PHYSICAL RECOVERY FAILURE' ('Recovery helper exited {0}.' -f $physicalExit) ($physical.stdout + $physical.stderr)
        }
    } else {
        Add-Result 'product-authority-recovery' 'BLOCKED' 'UPSTREAM PREREQUISITE BLOCKED' 'No product-authority mutation was attempted because a prerequisite failed.'
    }

    if (Test-Path -LiteralPath $evidenceWorktree -PathType Container) {
        $changes = @(Changed-Paths)
        $unexpected = @($changes | Where-Object { -not $_.StartsWith($evidenceRelative + '/', [System.StringComparison]::Ordinal) })
        if ($unexpected.Count -eq 0) {
            Add-Result 'repository-mutation-audit' 'PASS' 'AUTHORIZED EVIDENCE-ONLY MUTATION' ('Evidence worktree changes remain confined to {0}.' -f $evidenceRelative) ($changes -join [Environment]::NewLine)
        } else {
            Add-Result 'repository-mutation-audit' 'FAIL' 'REPOSITORY-STATE FAILURE' ('Unexpected changed paths: {0}' -f ($unexpected -join ', ')) ($changes -join [Environment]::NewLine)
        }

        $auditPass = $unexpected.Count -eq 0
        if ($auditPass -and $changes.Count -gt 0) {
            $add = Invoke-Native -File $git.Source -Arguments @('-C',$evidenceWorktree,'add','--',$evidenceRelative)
            $message = if ($recoverySuccess) { 'test(bvp): record repaired S08F product-authority recovery' } else { 'test(bvp): record blocked repaired S08F product-authority recovery' }
            $commit = if ($add.exitCode -eq 0) { Invoke-Native -File $git.Source -Arguments @('-C',$evidenceWorktree,'commit','-m',$message) } else { $null }
            if ($null -ne $commit -and $commit.exitCode -eq 0) {
                $head = Invoke-Native -File $git.Source -Arguments @('-C',$evidenceWorktree,'rev-parse','HEAD')
                $evidenceCommit = $head.stdout.Trim()
                $refresh = Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'fetch','origin',('+refs/heads/' + $Branch + ':refs/remotes/origin/' + $Branch),'--prune')
                $remote = if ($refresh.exitCode -eq 0) { Remote-Head } else { $null }
                if ($refresh.exitCode -eq 0 -and $remote -ceq $CandidateSha) {
                    $lease = 'refs/heads/' + $Branch + ':' + $CandidateSha
                    $destination = 'HEAD:refs/heads/' + $Branch
                    $push = Invoke-Native -File $git.Source -Arguments @('-C',$evidenceWorktree,'push','origin','--force-with-lease=' + $lease,$destination)
                    if ($push.exitCode -eq 0) {
                        $published = $true
                        Add-Result 'evidence-publication' 'PASS' 'ATOMIC EVIDENCE PUBLICATION' ('Published evidence commit {0} under exact branch lease.' -f $evidenceCommit)
                    } else {
                        Add-Result 'evidence-publication' 'FAIL' 'REPOSITORY-STATE FAILURE' 'Evidence push failed under exact branch lease.' ($push.stdout + $push.stderr)
                    }
                } else {
                    Add-Result 'evidence-publication' 'BLOCKED' 'REPOSITORY-STATE FAILURE' ('Branch drift before evidence publication. Expected {0}; observed {1}.' -f $CandidateSha,$remote)
                }
            } else {
                $detail = if ($null -eq $commit) { $add.stdout + $add.stderr } else { $commit.stdout + $commit.stderr }
                Add-Result 'evidence-publication' 'FAIL' 'EVIDENCE FAILURE' 'Unable to create evidence commit.' $detail
            }
        } elseif ($changes.Count -eq 0) {
            Add-Result 'evidence-publication' 'SKIPPED' 'NO EVIDENCE MUTATION' 'Recovery produced no evidence changes to publish.'
        } else {
            Add-Result 'evidence-publication' 'BLOCKED' 'REPOSITORY-STATE FAILURE' 'Evidence publication blocked by unexpected mutation.'
        }
    }

    if ($recoverySuccess -and $published -and @($results | Where-Object { $_.status -eq 'FAIL' }).Count -eq 0) {
        $preserve = $false
    }
} catch {
    Add-Result 'harness-terminal' 'FAIL' 'VERIFICATION-HARNESS DEFECT' 'Unexpected harness exception.' $_.Exception.ToString()
} finally {
    if (-not $preserve -and $null -ne $git) {
        foreach ($path in @($sourceWorktree,$evidenceWorktree)) {
            if (Test-Path -LiteralPath $path -PathType Container) {
                [void](Invoke-Native -File $git.Source -Arguments @('-C',$RepositoryRoot,'worktree','remove','--force',$path))
            }
        }
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    Write-Host ''
    Write-Host '============================================================'
    Write-Host 'S08F POST-REPAIR AUTHORITY RECOVERY RESULT'
    Write-Host '============================================================'
    foreach ($result in $results) {
        Write-Host ('{0,-30} {1,-13} {2}' -f $result.stage,$result.status,$result.classification)
        Write-Host ('  {0}' -f $result.summary)
        if ($result.status -ne 'PASS' -and -not [string]::IsNullOrWhiteSpace([string]$result.evidence)) {
            Write-Host '  Evidence:'
            Write-Host ([string]$result.evidence)
        }
    }
    Write-Host '------------------------------------------------------------'
    Write-Host ('RECOVERY SUCCESS: {0}' -f $recoverySuccess)
    Write-Host ('EVIDENCE COMMIT: {0}' -f $(if ($evidenceCommit) { $evidenceCommit } else { '<none>' }))
    Write-Host ('EVIDENCE PUBLISHED: {0}' -f $published)
    Write-Host ('DIAGNOSTIC WORKSPACE: {0}' -f $(if ($preserve) { $tempRoot } else { '<cleaned>' }))
    if ($recoverySuccess -and $published) {
        Write-Host 'NEXT STATE: READY FOR FRESH S08F CANARY IDENTITY BINDING'
        [Environment]::ExitCode = 0
    } elseif (@($results | Where-Object { $_.status -eq 'FAIL' }).Count -gt 0) {
        Write-Host 'NEXT STATE: DIAGNOSE / REPAIR — DO NOT REPLAY R2'
        [Environment]::ExitCode = 21
    } else {
        Write-Host 'NEXT STATE: BLOCKED — PRESERVE STATE; DO NOT REPLAY R2'
        [Environment]::ExitCode = 20
    }
    Write-Host '============================================================'
}
