STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 8796362f-7263-42e4-b255-593dc9259f28
- Repository: C:/temp/38ef88f537a3412cbd093bf2d33d5981/phx-b3491536a1894d6e/w
- Branch:
- Verified HEAD: 27f3d247eba07090a6b5d5c3283e0cca572b0e90
- Verified tree: 18b08d5fc81229136d8e56b53b9e54c58eaa5421
- Expected HEAD: 27f3d247eba07090a6b5d5c3283e0cca572b0e90
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-19T02:39:21.8520516Z
- Ended: 2026-11-19T02:40:30.3046362Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 8796362f-7263-42e4-b255-593dc9259f28)
- preflight: PASS (exit 0; NONE; run 8796362f-7263-42e4-b255-593dc9259f28)
- node-preflight: PASS (exit 0; NONE; run 8796362f-7263-42e4-b255-593dc9259f28)
- node-project-files: PASS (exit 0; NONE; run 8796362f-7263-42e4-b255-593dc9259f28)
- install: PASS (exit 0; NONE; run 8796362f-7263-42e4-b255-593dc9259f28)
- typecheck: PASS (exit 0; NONE; run 8796362f-7263-42e4-b255-593dc9259f28)
- test-focused: FAIL (exit 2; TEST FAILURE; run 8796362f-7263-42e4-b255-593dc9259f28; reason: Stage 'test-focused' exited unsuccessfully.)
- test: FAIL (exit 1; TEST FAILURE; run 8796362f-7263-42e4-b255-593dc9259f28; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 8796362f-7263-42e4-b255-593dc9259f28; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 8796362f-7263-42e4-b255-593dc9259f28; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 8796362f-7263-42e4-b255-593dc9259f28; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 8796362f-7263-42e4-b255-593dc9259f28)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 8796362f-7263-42e4-b255-593dc9259f28; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: fix/dec362-stable-drive-id-content-update-20261118
- Source build HEAD requested: 27f3d247eba07090a6b5d5c3283e0cca572b0e90
- Verification checkout HEAD: 27f3d247eba07090a6b5d5c3283e0cca572b0e90
- Evidence publication target: origin/fix/dec362-stable-drive-id-content-update-20261118
