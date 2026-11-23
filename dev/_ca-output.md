STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 7e1b476c-73ce-43f2-8bec-da3b96b56c90
- Repository: C:/temp/e499813698ee486b8ed8cb8cb80ee478/phx-3a7b0a286d3c478e/w
- Branch:
- Verified HEAD: bcc5ba167160decc05413e01e1e7671f27c314f9
- Verified tree: 172c889666c74c0610fe7c1e964bab26b30532f3
- Expected HEAD: bcc5ba167160decc05413e01e1e7671f27c314f9
- Base SHA: d8fdf66db0aeb7c44fafb42ccd5cbee706682425
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-23T20:56:53.3261050Z
- Ended: 2026-11-23T20:59:40.3590134Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90)
- preflight: PASS (exit 0; NONE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90)
- node-preflight: PASS (exit 0; NONE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90)
- node-project-files: PASS (exit 0; NONE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90)
- install: PASS (exit 0; NONE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90)
- typecheck: PASS (exit 0; NONE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90)
- test-focused: FAIL (exit 1; TEST FAILURE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90; reason: Stage 'test-focused' exited unsuccessfully.)
- test: FAIL (exit 1; TEST FAILURE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 7e1b476c-73ce-43f2-8bec-da3b96b56c90; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
