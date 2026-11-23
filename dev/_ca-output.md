STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 4f7089b8-f3fc-4e3d-8534-79f08e474868
- Repository: C:/temp/d99385b830b44b7aa32d098d4d79b6fc/phx-09a8c9290c854f04/w
- Branch:
- Verified HEAD: f494f68603330adf283b9680d90047d76cd00be4
- Verified tree: 217d909751b6afbee45682eeb3da8e99c1e8f817
- Expected HEAD: f494f68603330adf283b9680d90047d76cd00be4
- Base SHA: 8bbc67db3bb34137ac4be8188b5b50de34855180
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-23T07:00:52.9649222Z
- Ended: 2026-11-23T07:04:04.8567010Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868)
- preflight: PASS (exit 0; NONE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868)
- node-preflight: PASS (exit 0; NONE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868)
- node-project-files: PASS (exit 0; NONE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868)
- install: PASS (exit 0; NONE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868)
- typecheck: PASS (exit 0; NONE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868)
- test-focused: FAIL (exit 1; TEST FAILURE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868; reason: Stage 'test-focused' exited unsuccessfully.)
- test: FAIL (exit 1; TEST FAILURE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 4f7089b8-f3fc-4e3d-8534-79f08e474868; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
