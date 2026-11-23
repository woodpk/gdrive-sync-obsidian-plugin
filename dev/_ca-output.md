STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 7b9ad4ec-d23e-433e-99ea-475e17399c90
- Repository: C:/temp/9b43bc39c98e460e9bdb3f0d00718ebf/phx-a1b6ca7cba0f4ea7/w
- Branch:
- Verified HEAD: b17a2c803090f718fbaa7a31438a153d980613ec
- Verified tree: e9fc839c1bf760b219c0df30c42ad70464ffc963
- Expected HEAD: b17a2c803090f718fbaa7a31438a153d980613ec
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-23T01:24:23.1216801Z
- Ended: 2026-11-23T01:29:15.3216273Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- preflight: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- node-preflight: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- node-project-files: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- install: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- typecheck: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- test-focused: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- test: FAIL (exit 1; TEST FAILURE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90; reason: Dependent stage was not executed: test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7b9ad4ec-d23e-433e-99ea-475e17399c90; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
