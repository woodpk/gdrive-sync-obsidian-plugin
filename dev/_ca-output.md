STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: f5464803-6b77-4ffd-bf9c-29cde7b4f91d
- Repository: C:/temp/581f709b045349eea87961730b8faa69/phx-8b2f444463f8429c/w
- Branch:
- Verified HEAD: 2f4cdc9949ffba16465ee73a1c1e83445b4f1d55
- Verified tree: 1c61b9d374c592b55b544b10acb9c7d8ae2159e9
- Expected HEAD: 2f4cdc9949ffba16465ee73a1c1e83445b4f1d55
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-20T11:53:09.6014026Z
- Ended: 2026-11-20T11:56:26.7662525Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d)
- preflight: PASS (exit 0; NONE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d)
- node-preflight: PASS (exit 0; NONE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d)
- node-project-files: PASS (exit 0; NONE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d)
- install: PASS (exit 0; NONE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d)
- typecheck: PASS (exit 0; NONE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d)
- test-focused: FAIL (exit 1; TEST FAILURE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d; reason: Stage 'test-focused' exited unsuccessfully.)
- test: FAIL (exit 1; TEST FAILURE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run f5464803-6b77-4ffd-bf9c-29cde7b4f91d; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
