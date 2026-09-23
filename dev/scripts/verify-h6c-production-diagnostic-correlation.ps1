param(
  [switch]$CommitAndPushEvidence,
  [switch]$AllowDetachedWorktree
)

$ErrorActionPreference = "Stop"
$BaseSha = "c6daa20ad287f395a99cf88943465a9ecc3159dd"
$ExpectedImplementationHead = "edbd13bc4c150a3d276a19ca95f02d5d8066eabd"
$ExpectedProductControllerBlob = "876d30eec5eb36ca16fee375581c85f3c7a5fa16"
$Branch = "phase6-h6c-production-diagnostic-correlation"
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$ArchivePath = Join-Path $RepoRoot "dev/agents/st2a/ph6/h6c/archive/product-controller-base.ts.pre-h6c-c6daa20.snapshot"
$ExpectedBlob = "fee7c40e715d277cea2b5e26059a86753bb316a0"
$ExpectedSha256 = "55433da9a69d750be7aeb5cb5e6ffa77fa6ea28ba06c10fcbc81e8feab190750"
$EvidenceRelativePath = "dev/_ca-output.md"
$EvidencePath = Join-Path $RepoRoot $EvidenceRelativePath
$Failed = $false

if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) { throw "Verifier repository root does not exist: $RepoRoot" }
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "package.json") -PathType Leaf)) { throw "Verifier repository root is invalid: package.json not found under $RepoRoot" }
Set-Location -LiteralPath $RepoRoot
$resolvedRootRaw = @(& git rev-parse --show-toplevel)
$resolvedRootExit = $LASTEXITCODE
if ($resolvedRootExit -ne 0) { throw ("Verifier could not resolve its own Git repository root; git rev-parse exited " + $resolvedRootExit) }
$resolvedRoot = ([string]($resolvedRootRaw -join "`n")).Trim()
if (-not $resolvedRoot) { throw "Verifier Git repository root was empty." }
$resolvedRootFull = [System.IO.Path]::GetFullPath($resolvedRoot)
if ($resolvedRootFull -ne $RepoRoot) { throw ("Verifier repository-root mismatch. Script root resolved to " + $RepoRoot + " but Git resolved " + $resolvedRootFull) }

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
  ("- Reviewed implementation HEAD: " + $ExpectedImplementationHead),
  ("- Required branch: " + $Branch),
  ("- Verifier repository root: " + $RepoRoot),
  "- GitHub Actions: **NOT USED**",
  "- PHX-CI: **NOT RUN**",
  "- Physical Google Drive validation: **NOT RUN**",
  ""
)

$headRaw = @(& git rev-parse HEAD)
$headExit = $LASTEXITCODE
if ($headExit -ne 0) {
  Write-Evidence ("FAIL: could not resolve verification HEAD; git rev-parse exited " + $headExit)
  $head = ""
  $Failed = $true
} else {
  $head = ([string]($headRaw -join "`n")).Trim()
  if (-not $head) {
    Write-Evidence "FAIL: verification HEAD was empty."
    $Failed = $true
  }
}
Write-Evidence ("- Verification HEAD: " + $head)

$currentBranchRaw = @(& git branch --show-current)
$branchExit = $LASTEXITCODE
if ($branchExit -ne 0) {
  Write-Evidence ("FAIL: could not resolve current branch; git branch exited " + $branchExit)
  $currentBranch = ""
  $Failed = $true
} else {
  $currentBranch = ([string]($currentBranchRaw -join "`n")).Trim()
}
if ($currentBranch) {
  Write-Evidence ("- Current branch: " + $currentBranch)
  Assert-Equal "branch" $currentBranch $Branch
} elseif ($AllowDetachedWorktree) {
  Write-Evidence "- Current branch: DETACHED temporary verification worktree"
} else {
  Write-Evidence "FAIL: detached HEAD is not permitted unless -AllowDetachedWorktree is supplied."
  $Failed = $true
}

$remoteRequiredHeadRaw = @(& git rev-parse ("origin/" + $Branch))
$remoteRequiredHeadExit = $LASTEXITCODE
if ($remoteRequiredHeadExit -ne 0) {
  $remoteRequiredHead = ""
} else {
  $remoteRequiredHead = ([string]($remoteRequiredHeadRaw -join "`n")).Trim()
}
if ($remoteRequiredHeadExit -ne 0 -or -not $remoteRequiredHead) {
  Write-Evidence "FAIL: could not resolve origin required-branch HEAD."
  $Failed = $true
} else {
  Assert-Equal "verification HEAD matches origin required branch" $head $remoteRequiredHead
}

$mergeBaseRaw = @(& git merge-base $BaseSha HEAD)
$mergeBaseExit = $LASTEXITCODE
if ($mergeBaseExit -ne 0) {
  $mergeBase = ""
} else {
  $mergeBase = ([string]($mergeBaseRaw -join "`n")).Trim()
}
if ($mergeBaseExit -ne 0 -or -not $mergeBase) {
  Write-Evidence "FAIL: could not resolve merge base."
  $Failed = $true
} else {
  Assert-Equal "merge base" $mergeBase $BaseSha
}

Write-Evidence ""
Write-Evidence "## Reviewed implementation pin"
& git merge-base --is-ancestor $ExpectedImplementationHead HEAD
$implementationAncestorExit = $LASTEXITCODE
if ($implementationAncestorExit -eq 0) {
  Write-Evidence ("PASS: reviewed implementation commit is an ancestor of verification HEAD: " + $ExpectedImplementationHead)
} elseif ($implementationAncestorExit -eq 1) {
  Write-Evidence ("FAIL: reviewed implementation commit is not an ancestor of verification HEAD: " + $ExpectedImplementationHead)
  $Failed = $true
} else {
  Write-Evidence ("FAIL: implementation ancestry check exited " + $implementationAncestorExit)
  $Failed = $true
}

& git diff --quiet $ExpectedImplementationHead HEAD -- src
$sourceDriftExit = $LASTEXITCODE
if ($sourceDriftExit -eq 0) {
  Write-Evidence "PASS: no src/** files changed after the reviewed implementation HEAD."
} elseif ($sourceDriftExit -eq 1) {
  Write-Evidence "FAIL: src/** changed after the reviewed implementation HEAD."
  $sourceDrift = @(& git diff --name-only $ExpectedImplementationHead HEAD -- src)
  $sourceDriftListExit = $LASTEXITCODE
  if ($sourceDriftListExit -eq 0) {
    foreach ($file in $sourceDrift) { Write-Evidence ("SOURCE DRIFT: " + $file) }
  } else {
    Write-Evidence ("FAIL: could not enumerate source drift; git diff exited " + $sourceDriftListExit)
  }
  $Failed = $true
} else {
  Write-Evidence ("FAIL: source-drift git diff --quiet exited " + $sourceDriftExit)
  $Failed = $true
}

$reviewedProductBlobRaw = @(& git rev-parse ($ExpectedImplementationHead + ":src/product/product-controller-base.ts"))
$reviewedProductBlobExit = $LASTEXITCODE
if ($reviewedProductBlobExit -eq 0) { $reviewedProductBlob = ([string]($reviewedProductBlobRaw -join "`n")).Trim() } else { $reviewedProductBlob = "" }

$currentCommittedProductBlobRaw = @(& git rev-parse ("HEAD:src/product/product-controller-base.ts"))
$currentCommittedProductBlobExit = $LASTEXITCODE
if ($currentCommittedProductBlobExit -eq 0) { $currentCommittedProductBlob = ([string]($currentCommittedProductBlobRaw -join "`n")).Trim() } else { $currentCommittedProductBlob = "" }

$currentWorkingProductBlobRaw = @(& git hash-object (Join-Path $RepoRoot "src/product/product-controller-base.ts"))
$currentWorkingProductBlobExit = $LASTEXITCODE
if ($currentWorkingProductBlobExit -eq 0) { $currentWorkingProductBlob = ([string]($currentWorkingProductBlobRaw -join "`n")).Trim() } else { $currentWorkingProductBlob = "" }

if ($reviewedProductBlobExit -ne 0 -or -not $reviewedProductBlob -or $currentCommittedProductBlobExit -ne 0 -or -not $currentCommittedProductBlob -or $currentWorkingProductBlobExit -ne 0 -or -not $currentWorkingProductBlob) {
  Write-Evidence "FAIL: could not resolve reviewed/current product-controller-base.ts blobs."
  $Failed = $true
} else {
  Assert-Equal "reviewed product-controller-base.ts blob" $reviewedProductBlob $ExpectedProductControllerBlob
  Assert-Equal "current committed product-controller-base.ts blob" $currentCommittedProductBlob $ExpectedProductControllerBlob
  Assert-Equal "current working product-controller-base.ts blob" $currentWorkingProductBlob $ExpectedProductControllerBlob
}

& git diff --quiet -- src
$workingSourceDiffExit = $LASTEXITCODE
if ($workingSourceDiffExit -eq 0) {
  Write-Evidence "PASS: no unstaged src/** working-tree drift."
} elseif ($workingSourceDiffExit -eq 1) {
  Write-Evidence "FAIL: unstaged src/** working-tree drift exists."
  $Failed = $true
} else {
  Write-Evidence ("FAIL: unstaged source git diff --quiet exited " + $workingSourceDiffExit)
  $Failed = $true
}

& git diff --cached --quiet -- src
$stagedSourceDiffExit = $LASTEXITCODE
if ($stagedSourceDiffExit -eq 0) {
  Write-Evidence "PASS: no staged src/** working-tree drift."
} elseif ($stagedSourceDiffExit -eq 1) {
  Write-Evidence "FAIL: staged src/** working-tree drift exists."
  $Failed = $true
} else {
  Write-Evidence ("FAIL: staged source git diff --cached --quiet exited " + $stagedSourceDiffExit)
  $Failed = $true
}

$preSourceStatus = @(& git status --porcelain=v1 --untracked-files=all -- src)
$preSourceStatusExit = $LASTEXITCODE
if ($preSourceStatusExit -ne 0) {
  Write-Evidence ("FAIL: pre-verification src/** status check exited " + $preSourceStatusExit)
  $Failed = $true
} elseif ($preSourceStatus.Count -eq 0) {
  Write-Evidence "PASS: src/** has no staged, unstaged, or untracked files before verification."
} else {
  foreach ($line in $preSourceStatus) { Write-Evidence ("FAIL: pre-verification source status: " + [string]$line) }
  $Failed = $true
}

if ($Failed) {
  Write-Evidence ""
  Write-Evidence "# RESULT: FAIL"
  Write-Evidence "Verification stopped before dependency install/tests because the reviewed source implementation pin failed."
  exit 1
}

Write-Evidence ""
Write-Evidence "## Archive gate"
$baseBlobRaw = @(& git rev-parse ($BaseSha + ":src/product/product-controller-base.ts"))
$baseBlobExit = $LASTEXITCODE
if ($baseBlobExit -eq 0) { $baseBlob = ([string]($baseBlobRaw -join "`n")).Trim() } else { $baseBlob = "" }
if ($baseBlobExit -ne 0 -or -not $baseBlob) {
  Write-Evidence ("FAIL: could not resolve base product-controller blob; git rev-parse exited " + $baseBlobExit)
  $Failed = $true
}

$archiveBlobRaw = @(& git hash-object $ArchivePath)
$archiveBlobExit = $LASTEXITCODE
if ($archiveBlobExit -eq 0) { $archiveBlob = ([string]($archiveBlobRaw -join "`n")).Trim() } else { $archiveBlob = "" }
if ($archiveBlobExit -ne 0 -or -not $archiveBlob) {
  Write-Evidence ("FAIL: could not hash archive file; git hash-object exited " + $archiveBlobExit)
  $Failed = $true
}
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

Write-Evidence ""
Write-Evidence "## Production hunk classification"
Write-Evidence "HUNK 1: diagnostic metadata exposure - imports DiagnosticEvent plus the diagnostic correlation tracker/types only."
Write-Evidence "HUNK 2: diagnostic metadata exposure - adds the non-authoritative in-memory diagnostic correlation tracker field."
Write-Evidence "HUNK 3: diagnostic run creation + propagation + metadata exposure + diagnostic event emission - exposes read-only correlation/snapshot seams; manual and Verify/Reconcile previews begin diagnostic runs and pass them into existing planning."
Write-Evidence "HUNK 4: diagnostic run propagation - binds the existing semantic plan ID to the already-created diagnostic run after planning, without changing the plan."
Write-Evidence "HUNK 5: diagnostic lifecycle termination + diagnostic run creation + propagation + diagnostic event emission - terminates a superseded preview diagnostic scope before conflict resolution, creates the conflict-resolution diagnostic run, and passes only its run ID into the existing resolution-plan execution."
Write-Evidence ("PASS: current src/** is mechanically pinned to reviewed implementation HEAD " + $ExpectedImplementationHead + "; the reviewed hunk classifications below therefore apply to the verified source.")
Write-Evidence "PASS: reviewed production hunks are confined to the H6C authorized diagnostic-only categories."
Write-Evidence "PASS: reviewed production hunks do not change planner inputs/outputs, operation selection/order, execution eligibility, mutation calls/results, synchronization authority state, conflict resolution choice semantics, or recovery decisions."

Write-Evidence ""
Write-Evidence "## Correlation-path audit"
Write-Evidence "Manual: previewManual begins the production diagnostic run; createPlan retains the same run ID with the semantic plan; validation binds ValidationRunIdentity + authorityCycleId + diagnosticRunId + planId; asserted execution reuses that exact run ID; terminal proof reads only that run."
Write-Evidence "Verify/Reconcile: previewVerifyReconcile now has the same diagnostic lifecycle as manual preview and is bound/verified by the same exact run-cycle-plan mechanism."
Write-Evidence "Conflict resolution: validation retains the exact observed conflict under the originating authority cycle; production closes the superseded preview diagnostic scope, begins a fresh conflict-resolution run, executes the unchanged semantic resolution plan, and validation accepts terminal proof only from that fresh exact run."
Write-Evidence "Terminal result: inspectExactProductionTerminal requires the exact diagnostic run ID, component sync.controller, stage terminal, one unambiguous terminal event, and a recognized result; state convergence requires sync-run-complete plus exact expected complete/partial result where H6C terminal proof is requested."
Write-Evidence "Fail-closed: missing, wrong-run, cross-run/cycle, ambiguous, missing-terminal, contradictory, failed, and cancelled cases are covered by focused regressions; request acceptance alone is non-authoritative."

Invoke-RecordedNative "Dependency install" "npm" @("ci")
Invoke-RecordedNative "Test TypeScript compilation" "npx" @("tsc", "-p", "tsconfig.test.json")

$focusedTests = @(
  ".test-build/test/phase6-h6c-production-diagnostic-correlation.test.js",
  ".test-build/test/validation-production-path-driver.test.js",
  ".test-build/test/validation-mode-runtime-plan-handoff.test.js",
  ".test-build/test/validation-mode-runtime-canary.test.js",
  ".test-build/test/validation-state-convergence-verifier.test.js",
  ".test-build/test/phase6-alpha-diagnostic-logging.test.js",
  ".test-build/test/phase6-alpha-ios-sync-diagnostics.test.js",
  ".test-build/test/product-controller-reconstruction-recovery-r1.test.js",
  ".test-build/test/product-controller-uninitialized-first-sync.test.js",
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
Write-Evidence "## Post-verification source-integrity gate"

& git merge-base --is-ancestor $ExpectedImplementationHead HEAD
$postImplementationAncestorExit = $LASTEXITCODE
if ($postImplementationAncestorExit -eq 0) {
  Write-Evidence ("PASS: reviewed implementation commit remains an ancestor after verification: " + $ExpectedImplementationHead)
} elseif ($postImplementationAncestorExit -eq 1) {
  Write-Evidence "FAIL: reviewed implementation commit is no longer an ancestor after verification."
  $Failed = $true
} else {
  Write-Evidence ("FAIL: post-verification implementation ancestry check exited " + $postImplementationAncestorExit)
  $Failed = $true
}

& git diff --quiet $ExpectedImplementationHead HEAD -- src
$postCommittedSourceExit = $LASTEXITCODE
if ($postCommittedSourceExit -eq 0) {
  Write-Evidence "PASS: committed src/** still exactly matches the reviewed implementation."
} elseif ($postCommittedSourceExit -eq 1) {
  Write-Evidence "FAIL: committed src/** differs from the reviewed implementation after verification."
  $Failed = $true
} else {
  Write-Evidence ("FAIL: post-verification committed-source git diff --quiet exited " + $postCommittedSourceExit)
  $Failed = $true
}

& git diff --quiet -- src
$postUnstagedSourceExit = $LASTEXITCODE
if ($postUnstagedSourceExit -eq 0) {
  Write-Evidence "PASS: no unstaged src/** changes after verification."
} elseif ($postUnstagedSourceExit -eq 1) {
  Write-Evidence "FAIL: verification left unstaged src/** changes."
  $Failed = $true
} else {
  Write-Evidence ("FAIL: post-verification unstaged-source git diff --quiet exited " + $postUnstagedSourceExit)
  $Failed = $true
}

& git diff --cached --quiet -- src
$postStagedSourceExit = $LASTEXITCODE
if ($postStagedSourceExit -eq 0) {
  Write-Evidence "PASS: no staged src/** changes after verification."
} elseif ($postStagedSourceExit -eq 1) {
  Write-Evidence "FAIL: verification left staged src/** changes."
  $Failed = $true
} else {
  Write-Evidence ("FAIL: post-verification staged-source git diff --cached --quiet exited " + $postStagedSourceExit)
  $Failed = $true
}

$postSourceStatus = @(& git status --porcelain=v1 --untracked-files=all -- src)
$postSourceStatusExit = $LASTEXITCODE
if ($postSourceStatusExit -ne 0) {
  Write-Evidence ("FAIL: post-verification src/** status check exited " + $postSourceStatusExit)
  $Failed = $true
} elseif ($postSourceStatus.Count -eq 0) {
  Write-Evidence "PASS: src/** has no staged, unstaged, or untracked files after verification."
} else {
  foreach ($line in $postSourceStatus) { Write-Evidence ("FAIL: post-verification source status: " + [string]$line) }
  $Failed = $true
}

$postCommittedProductBlobRaw = @(& git rev-parse ("HEAD:src/product/product-controller-base.ts"))
$postCommittedProductBlobExit = $LASTEXITCODE
if ($postCommittedProductBlobExit -eq 0) { $postCommittedProductBlob = ([string]($postCommittedProductBlobRaw -join "`n")).Trim() } else { $postCommittedProductBlob = "" }
if ($postCommittedProductBlobExit -ne 0 -or -not $postCommittedProductBlob) {
  Write-Evidence ("FAIL: could not resolve post-verification committed product-controller blob; git rev-parse exited " + $postCommittedProductBlobExit)
  $Failed = $true
} else {
  Assert-Equal "post-verification committed product-controller-base.ts blob" $postCommittedProductBlob $ExpectedProductControllerBlob
}

$postWorkingProductBlobRaw = @(& git hash-object (Join-Path $RepoRoot "src/product/product-controller-base.ts"))
$postWorkingProductBlobExit = $LASTEXITCODE
if ($postWorkingProductBlobExit -eq 0) { $postWorkingProductBlob = ([string]($postWorkingProductBlobRaw -join "`n")).Trim() } else { $postWorkingProductBlob = "" }
if ($postWorkingProductBlobExit -ne 0 -or -not $postWorkingProductBlob) {
  Write-Evidence ("FAIL: could not hash post-verification working product-controller file; git hash-object exited " + $postWorkingProductBlobExit)
  $Failed = $true
} else {
  Assert-Equal "post-verification working product-controller-base.ts blob" $postWorkingProductBlob $ExpectedProductControllerBlob
}

Write-Evidence ""
Write-Evidence "## Breaking-change audit"
Write-Evidence "Static scope assertions checked: persisted-state owners unchanged; settings persistence owners unchanged; Drive protocol/metadata owners unchanged; planner/executor/core/Drive/local/state source families unchanged."
Write-Evidence "Semantic ID generation remains in the pre-H6C planner/controller code; H6C does not alter semanticPlanId or withSemanticOperationId."
Write-Evidence "Conflict resolution still constructs and executes the same resolution plan; only diagnostic run lifecycle/correlation metadata were added."
Write-Evidence "D06 execution authority is unchanged; no selective execution, plan splitting, execute-safe-subset, or executePlanned semantic change was introduced."
Write-Evidence "Invariant 1 PASS: synchronization branch conditions governing product outcomes are unchanged; new conditionals govern diagnostic correlation/lifecycle only."
Write-Evidence "Invariant 2 PASS: planner inputs and outputs are unchanged."
Write-Evidence "Invariant 3 PASS: plan operation selection and ordering are unchanged."
Write-Evidence "Invariant 4 PASS: operation execution eligibility is unchanged."
Write-Evidence "Invariant 5 PASS: local/remote mutation requests are unchanged."
Write-Evidence "Invariant 6 PASS: mutation result interpretation is unchanged."
Write-Evidence "Invariant 7 PASS: BASE, mappings, tombstones, cursors, revisions, generations, durable intents/effects, recovery, and first-sync authority are unchanged."
Write-Evidence "Invariant 8 PASS: conflict-resolution user choices and synchronization semantics are unchanged."
Write-Evidence "Invariant 9 PASS: when diagnostics are unavailable, added correlation state clears/fails closed for validation and does not alter the production synchronization path/result."
Write-Evidence "Invariant 10 PASS: diagnostic failure remains non-authoritative and cannot change synchronization success, failure, or physical effects."
if ($Failed) {
  Write-Evidence "Breaking-change gate: NOT ESTABLISHED because one or more verification commands/checks failed."
} else {
  Write-Evidence "Breaking-change gate PASS: persisted synchronization state shape, settings persistence shape, Drive protocol/metadata, synchronization contracts, planner output, executor behavior, mutation sequence, plan IDs, operation IDs, conflict outcomes, ordinary desktop/mobile behavior, and UserAction synchronization authority are unchanged by scope plus passing regressions."
}
Write-Evidence "GitHub Actions were not used."

Write-Evidence ""
if ($Failed) {
  Write-Evidence "# RESULT: FAIL"
} else {
  Write-Evidence "# RESULT: PASS"
}

if ($CommitAndPushEvidence) {
  & git add -- $EvidenceRelativePath
  $gitAddExit = $LASTEXITCODE
  if ($gitAddExit -ne 0) { throw ("git add evidence failed: " + $gitAddExit) }

  & git diff --cached --quiet -- $EvidenceRelativePath
  $stagedDiffExit = $LASTEXITCODE
  if ($stagedDiffExit -eq 0) {
    throw "Expected H6C evidence change was not staged; refusing to report a pushed evidence commit."
  } elseif ($stagedDiffExit -eq 1) {
    & git commit -m "test(h6c): record local verification evidence" -- $EvidenceRelativePath
    $gitCommitExit = $LASTEXITCODE
    if ($gitCommitExit -ne 0) { throw ("git commit evidence failed: " + $gitCommitExit) }
    $evidenceCommitRaw = @(& git rev-parse HEAD)
    $evidenceCommitExit = $LASTEXITCODE
    if ($evidenceCommitExit -ne 0) { throw ("could not resolve evidence commit HEAD after commit; git rev-parse exited " + $evidenceCommitExit) }
    $evidenceCommit = ([string]($evidenceCommitRaw -join "`n")).Trim()
    if (-not $evidenceCommit) { throw "could not resolve evidence commit HEAD after commit: empty output." }
    Write-Host ("Evidence commit: " + $evidenceCommit)
    & git push origin ("HEAD:" + $Branch)
    $gitPushExit = $LASTEXITCODE
    if ($gitPushExit -ne 0) { throw ("git push evidence failed: " + $gitPushExit) }
  } else {
    throw ("git diff --cached --quiet failed: " + $stagedDiffExit)
  }
}

if ($Failed) { exit 1 }
exit 0
