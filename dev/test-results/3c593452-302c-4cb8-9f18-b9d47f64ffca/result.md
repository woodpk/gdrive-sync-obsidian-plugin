STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Repository verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 3c593452-302c-4cb8-9f18-b9d47f64ffca
- Repository: C:/temp/38ef88f537a3412cbd093bf2d33d5981/phx-9757e4be42e54c7e/w
- Branch:
- Verified HEAD: b03269284ed6269055e08ec793d4e74539b5eeb2
- Verified tree: 2ed33d82aaae6f4a99759a58dbfdc2902f50cadc
- Expected HEAD: b03269284ed6269055e08ec793d4e74539b5eeb2
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-19T02:32:23.7057451Z
- Ended: 2026-11-19T02:33:23.7451964Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca)
- preflight: PASS (exit 0; NONE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca)
- node-preflight: PASS (exit 0; NONE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca)
- node-project-files: PASS (exit 0; NONE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca)
- install: PASS (exit 0; NONE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca; reason: Stage 'typecheck' exited unsuccessfully.)
- test-focused: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- test: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0); test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 3c593452-302c-4cb8-9f18-b9d47f64ffca; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: PRODUCT FAILURE

## Core-runner provenance

- Source branch: fix/dec362-stable-drive-id-content-update-20261118
- Source build HEAD requested: b03269284ed6269055e08ec793d4e74539b5eeb2
- Verification checkout HEAD: b03269284ed6269055e08ec793d4e74539b5eeb2
- Evidence publication target: origin/fix/dec362-stable-drive-id-content-update-20261118
