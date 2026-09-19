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
        -Branch "phase6-vh22-c09-scenario-correction-02" `
        -ExpectedHead "7b81ae8df30f0f589918fae975fd05b91f8146c2" `
        -BaseSha "fbe9dfca58840e49ebcb3a14b97d4c569770cf6e" `
        -RunName "vh22-c09-correction-02" `
        -FocusedTest "npx tsc -p tsconfig.test.json && node --test .test-build/test/validation-c09-windows-delete-ios-trash.test.js" `
        -AllowedChangedFiles @(
            "dev/_ca-output.md",
            "dev/evidence/_ca-output-agt-ca-p6-vh22-c09-scenario-01-correction-02.md",
            "dev/scripts/bootstrap-vh22-c09-correction-02.ps1",
            "dev/scripts/verify-vh22-c09-correction-02.ps1",
            "src/validation/scenarios/c09-windows-delete-ios-trash.ts",
            "test/validation-c09-windows-delete-ios-trash.test.ts"
        ) `
        -RequiredAncestors @(
            "66ef2e7f153e726d0d43f27c75f7f7260c4e0302"
        ) `
        -ForbiddenAncestors @(
            "49f31d6e3c6661b8a1a05922ed5f8b4514b835fc",
            "cbd8946ef6defc20ab3286e4f540877c16c606fc"
        ) `
        -RequiredFiles @(
            "src/validation/scenarios/c09-windows-delete-ios-trash.ts",
            "test/validation-c09-windows-delete-ios-trash.test.ts"
        ) `
        -PredecessorEvidenceMarker "dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md"
}
finally {
    Remove-Item -LiteralPath $tempRunner -Force -ErrorAction SilentlyContinue
}
