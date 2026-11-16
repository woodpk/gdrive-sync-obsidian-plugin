STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 7fa30197-d986-4afb-ac31-54d59ef54903
- Repository: C:/temp/738382a7d914443ca1d66ecf943dcd50/phx-77e7c69d339d4090/w
- Branch:
- Verified HEAD: 420374e7ecb34d771c9de5131e0c9268a0ee4ef8
- Verified tree: 87ac8513b4304790038fa0c71dd51f7fe5bf3992
- Expected HEAD: 420374e7ecb34d771c9de5131e0c9268a0ee4ef8
- Base SHA: 42460912847e363aa4fa11e23e0429944383889d
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-16T11:14:25.5209333Z
- Ended: 2026-11-16T11:17:32.2859699Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- preflight: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- node-preflight: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- node-project-files: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- install: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- typecheck: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- test-focused: FAIL (exit 1; TEST FAILURE; run 7fa30197-d986-4afb-ac31-54d59ef54903; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7fa30197-d986-4afb-ac31-54d59ef54903; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7fa30197-d986-4afb-ac31-54d59ef54903; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7fa30197-d986-4afb-ac31-54d59ef54903; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 7fa30197-d986-4afb-ac31-54d59ef54903)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7fa30197-d986-4afb-ac31-54d59ef54903; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: release/bvp-0.1.20-bvp.2-preparation-20261116
- Source build HEAD requested: 420374e7ecb34d771c9de5131e0c9268a0ee4ef8
- Verification checkout HEAD: 420374e7ecb34d771c9de5131e0c9268a0ee4ef8
- Evidence publication target: origin/release/bvp-0.1.20-bvp.2-preparation-20261116
