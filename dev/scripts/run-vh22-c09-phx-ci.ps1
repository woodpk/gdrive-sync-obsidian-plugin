[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$repo = "D:\obsidian-brain-dev"
$infraBranch = "ci-3-phx-ci-obsidian-pilot"
$tempRunner = Join-Path $env:TEMP "run-phx-ci.ps1"

git -C $repo fetch origin --prune
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }

$runnerText = git -C $repo show "origin/${infraBranch}:dev/scripts/run-phx-ci.ps1"
if ($LASTEXITCODE -ne 0) {
    throw "Could not load standardized runner from origin/$infraBranch."
}

Set-Content -LiteralPath $tempRunner -Value $runnerText -Encoding utf8NoBOM

try {
    & $tempRunner `
        -RepoRoot $repo `
        -Branch "phase6-vh22-repository-suite-blocker-repair-01" `
        -ExpectedHead "29f11394f9da3f7ff5db58a8e5359cc32686acb4" `
        -BaseSha "5c33bb4e982fe2a211e48e3c082f2e01ce357368" `
        -RunName "vh22-repository-suite-blocker-repair-01" `
        -FocusedTest "npx tsc -p tsconfig.test.json && node --test .test-build/test/phase6-alpha-portable-collision.test.js .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-log06-diagnostic-bundle-operator-surface.test.js" `
        -AllowedChangedFiles @(
            "dev/_ca-output.md",
            "dev/evidence/_ca-output-agt-ca-p6-vh22-repository-suite-blocker-repair-01.md",
            "dev/scripts/verify-vh22-repository-suite-blocker-repair-01.ps1",
            "test/phase6-alpha-portable-collision.test.ts",
            "test/phase6-foundation-failure-provenance.test.ts",
            "test/phase6-log06-diagnostic-bundle-operator-surface.test.ts"
        ) `
        -RequiredAncestors @(
            "4ab5239532fce080f17f4129bc56e9b0b484347a"
        ) `
        -RequiredFiles @(
            "test/phase6-alpha-portable-collision.test.ts",
            "test/phase6-foundation-failure-provenance.test.ts",
            "test/phase6-log06-diagnostic-bundle-operator-surface.test.ts"
        )
}
finally {
    Remove-Item -LiteralPath $tempRunner -Force -ErrorAction SilentlyContinue
}
