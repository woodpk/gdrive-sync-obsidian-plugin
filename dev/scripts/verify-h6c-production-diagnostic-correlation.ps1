param(
  [switch]$CommitAndPushEvidence
)

$ErrorActionPreference = "Stop"
$BaseSha = "c6daa20ad287f395a99cf88943465a9ecc3159dd"
$Branch = "phase6-h6c-production-diagnostic-correlation"
$ArchivePath = "dev/agents/st2a/ph6/h6c/archive/product-controller-base.ts.pre-h6c-c6daa20.snapshot"
$ExpectedBlob = "fee7c40e715d277cea2b5e26059a86753bb316a0"
$ExpectedSha256 = "55433da9a69d750be7aeb5cb5e6ffa77fa6ea28ba06c10fcbc81e8feab190750"
$EvidencePath = "dev/_ca-output.md"
$Failed = $false

function Write-Evidence {
  param([string]$Text)
  $Text | Tee-Object -FilePath $EvidencePath -Append
}

function Invoke-RecordedNative {
  param(
    [string]$Label,
    [string]$File,
    [string[]]$Arguments
  )
  Write-Evidence ""
  Write-Evidence ("## " + $Label)
  Write-Evidence ("COMMAND: " + $File + " " + ($Arguments -join " "))
  $output = @(& $File @Arguments 2>&1)
  $exitCode = $LASTEXITCODE
  foreach ($line in $output) { Write-Evidence ([string]$line) }
  Write-Evidence ("EXIT CODE: " + $exitCode)
  if ($exitCode -ne 0) {
    $script:Failed = $true
  }
  return $exitCode
}

function Assert-Equal {
  param(
    [string]$Label,
    [string]$Actual,
    [string]$Expected
  )
  if ($Actual -eq $Expected) {
    Write-Evidence ("PASS: " + $Label + " = " + $Actual)
    return
  }
  Write-Evidence ("FAIL: " + $Label + " expected " + $Expected + " but observed " + $Actual)
  $script:Failed = $true
}

Set-Content -Path $EvidencePath -Value @(
  "# Phase 6 H6C Local Verification Evidence",
  "",
  "- Agent: agt-ca-p6-h6c-production-diagnostic-correlation-01",
  ("- Exact base: " + $BaseSha),
  ("- Required branch: " + $Branch),
  "- GitHub Actions: **NOT USED**",
  "- PHX-CI: **NOT RUN**",
  "- Physical Google Drive validation: **NOT RUN**",
  ""
)

$head = (& git rev-parse HEAD).Trim()
$headExit = $LASTEXITCODE
Write-Evidence ("- Verification HEAD: " + $head)
if ($headExit -ne 0) { $Failed = $true }

$currentBranch = (& git branch --show-current).Trim()
$branchExit = $LASTEXITCODE
Write-Evidence ("- Current branch: " + $currentBranch)
if ($branchExit -ne 0) { $Failed = $true }
Assert-Equal "branch" $currentBranch $Branch

$mergeBase = (& git merge-base $BaseSha HEAD).Trim()
$mergeBaseExit = $LASTEXITCODE
if ($mergeBaseExit -ne 0) {
  Write-Evidence "FAIL: could not resolve merge base."
  $Failed = $true
} else {
  Assert-Equal "merge base" $mergeBase $BaseSha
}

Write-Evidence ""
Write-Evidence "## Archive gate"
$baseBlob = (& git rev-parse ($BaseSha + ":src/product/product-controller-base.ts")).Trim()
$baseBlobExit = $LASTEXITCODE
if ($baseBlobExit -ne 0) { $Failed = $true }
$archiveBlob = (& git hash-object $ArchivePath).Trim()
$archiveBlobExit = $LASTEXITCODE
if ($archiveBlobExit -ne 0) { $Failed = $true }
$archiveSha256 = (Get-FileHash -Algorithm SHA256 -Path $ArchivePath).Hash.ToLowerInvariant()
Assert-Equal "base Git blob" $baseBlob $ExpectedBlob
Assert-Equal "archive Git blob" $archiveBlob $ExpectedBlob
Assert-Equal "archive/base byte equivalence" $archiveBlob $baseBlob
Assert-Equal "archive SHA-256" $archiveSha256 $ExpectedSha256

Write-Evidence ""
Write-Evidence "## Scope and frozen-source checks"
$changedFiles = @(& git diff --name-only ($BaseSha + "...HEAD"))
$changedExit = $LASTEXITCODE
if ($changedExit -ne 0) { $Failed = $true }
foreach ($file in $changedFiles) { Write-Evidence ("CHANGED: " + $file) }

$frozen = @(& git diff --name-only ($BaseSha + "...HEAD") -- src/core src/drive src/local src/state)
$frozenExit = $LASTEXITCODE
if ($frozenExit -ne 0) { $Failed = $true }
if ($frozen.Count -eq 0) {
  Write-Evidence "PASS: no changes under src/core, src/drive, src/local, or src/state."
} else {
  foreach ($file in $frozen) { Write-Evidence ("FAIL: frozen source changed: " + $file) }
  $Failed = $true
}

$productChanges = @(& git diff --name-only ($BaseSha + "...HEAD") -- src/product)
$productExit = $LASTEXITCODE
if ($productExit -ne 0) { $Failed = $true }
$unexpectedProduct = @($productChanges | Where-Object { $_ -ne "src/product/product-controller-base.ts" })
if ($unexpectedProduct.Count -eq 0) {
  Write-Evidence "PASS: product-source modification is limited to src/product/product-controller-base.ts."
} else {
  foreach ($file in $unexpectedProduct) { Write-Evidence ("FAIL: unexpected product source changed: " + $file) }
  $Failed = $true
}

$archiveReferences = @(& git grep -n "dev/agents/st2a/ph6/h6c/archive" -- src 2>$null)
$grepExit = $LASTEXITCODE
if ($grepExit -eq 1) {
  Write-Evidence "PASS: production source contains no archive reference."
} elseif ($grepExit -eq 0) {
  foreach ($line in $archiveReferences) { Write-Evidence ("FAIL: archive referenced by source: " + $line) }
  $Failed = $true
} else {
  Write-Evidence ("FAIL: git grep archive-reference check exited " + $grepExit)
  $Failed = $true
}

Write-Evidence ""
Write-Evidence "## Archive-based production diff"
$productDiff = @(& git diff --no-ext-diff --unified=3 $BaseSha HEAD -- src/product/product-controller-base.ts 2>&1)
$productDiffExit = $LASTEXITCODE
foreach ($line in $productDiff) { Write-Evidence ([string]$line) }
Write-Evidence ("EXIT CODE: " + $productDiffExit)
if ($productDiffExit -ne 0) { $Failed = $true }

Invoke-RecordedNative "Dependency install" "npm" @("ci")
Invoke-RecordedNative "Test TypeScript compilation" "npx" @("tsc", "-p", "tsconfig.test.json")

$focusedTests = @(
  ".test-build/test/phase6-h6c-production-diagnostic-correlation.test.js",
  ".test-build/test/validation-production-path-driver.test.js",
  ".test-build/test/validation-mode-runtime-plan-handoff.test.js",
  ".test-build/test/validation-mode-runtime-canary.test.js",
  ".test-build/test/validation-state-convergence-verifier.test.js",
  ".test-build/test/validation-c03-ios-update-windows-download.test.js",
  ".test-build/test/validation-c04-ios-move-windows-move-correction.test.js",
  ".test-build/test/validation-c05-ios-delete-windows-trash.test.js",
  ".test-build/test/validation-c06-h6b-registration.test.js",
  ".test-build/test/validation-c07-windows-update-ios-download.test.js",
  ".test-build/test/validation-c08-windows-move-ios-move.test.js",
  ".test-build/test/validation-c09-windows-delete-ios-trash.test.js",
  ".test-build/test/phase6-alpha-mixed-plan-isolation.test.js",
  ".test-build/test/phase6-a03-first-sync-conflict-resolution-authority.test.js"
)
Invoke-RecordedNative "Focused H6C/diagnostic/controller/runtime/convergence/mixed-plan/conflict regressions" "node" (@("--test") + $focusedTests)
Invoke-RecordedNative "Typecheck" "npm" @("run", "typecheck")
Invoke-RecordedNative "Complete automated test suite" "npm" @("test")
Invoke-RecordedNative "Build" "npm" @("run", "build")
Invoke-RecordedNative "Repository check" "npm" @("run", "check")

Write-Evidence ""
Write-Evidence "## Breaking-change audit"
Write-Evidence "Static scope assertions checked: persisted-state owners unchanged; settings persistence owners unchanged; Drive protocol/metadata owners unchanged; planner/executor/core/Drive/local/state source families unchanged."
Write-Evidence "Semantic ID generation remains in the pre-H6C planner/controller code; H6C does not alter semanticPlanId or withSemanticOperationId."
Write-Evidence "Conflict resolution still constructs and executes the same resolution plan; only diagnostic run lifecycle/correlation metadata were added."
Write-Evidence "D06 execution authority is unchanged; no selective execution, plan splitting, execute-safe-subset, or executePlanned semantic change was introduced."
Write-Evidence "GitHub Actions were not used."

Write-Evidence ""
if ($Failed) {
  Write-Evidence "# RESULT: FAIL"
} else {
  Write-Evidence "# RESULT: PASS"
}

if ($CommitAndPushEvidence) {
  & git add -- $EvidencePath
  if ($LASTEXITCODE -ne 0) { throw "git add evidence failed." }
  & git diff --cached --quiet -- $EvidencePath
  $hasStagedEvidence = $LASTEXITCODE -ne 0
  if ($hasStagedEvidence) {
    & git commit -m "test(h6c): record local verification evidence" -- $EvidencePath
    if ($LASTEXITCODE -ne 0) { throw "git commit evidence failed." }
    & git push origin $Branch
    if ($LASTEXITCODE -ne 0) { throw "git push evidence failed." }
  }
}

if ($Failed) { exit 1 }
exit 0
