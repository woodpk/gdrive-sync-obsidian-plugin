STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea
- Repository: C:/temp/a5a31d151d69438891ad0ca7e0e41d50/phx-d8e6f1487bcd4eed/w
- Branch:
- Verified HEAD: 241e2659e7a56188be6565971dcdb542b5e51e4e
- Verified tree: 2ca31085b3c529a0df083444e94bbf07b3b4c3f3
- Expected HEAD: 241e2659e7a56188be6565971dcdb542b5e51e4e
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-21T00:35:41.2862916Z
- Ended: 2026-11-21T00:39:40.5505501Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- preflight: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- node-preflight: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- node-project-files: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- install: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- typecheck: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- test-focused: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- test: FAIL (exit 1; TEST FAILURE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea; reason: Dependent stage was not executed: test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-ws02-bu05-cursor-recovery-gates-20261120
- Source build HEAD requested: 241e2659e7a56188be6565971dcdb542b5e51e4e
- Verification checkout HEAD: 241e2659e7a56188be6565971dcdb542b5e51e4e
- Evidence publication target: origin/build/dec339-ws02-bu05-cursor-recovery-gates-20261120
