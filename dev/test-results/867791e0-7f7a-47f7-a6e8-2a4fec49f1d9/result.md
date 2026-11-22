STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9
- Repository: C:/temp/e8e98e8902b44fdca1357e3cbaa7d27a/phx-8df4a9ef76f84878/w
- Branch:
- Verified HEAD: fed6d52bd3b2c28db259c60c50da5b3ea7844682
- Verified tree: c0fcd0488cbdb20fe8c477f353caad4fc0ef5e6b
- Expected HEAD: fed6d52bd3b2c28db259c60c50da5b3ea7844682
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-22T06:21:32.0484007Z
- Ended: 2026-11-22T06:24:16.4662486Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- preflight: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- node-preflight: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- node-project-files: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- install: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- typecheck: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- test-focused: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- test: FAIL (exit 1; TEST FAILURE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9; reason: Dependent stage was not executed: test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 867791e0-7f7a-47f7-a6e8-2a4fec49f1d9; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-ws02-bu05-cursor-recovery-gates-20261120
- Source build HEAD requested: fed6d52bd3b2c28db259c60c50da5b3ea7844682
- Verification checkout HEAD: fed6d52bd3b2c28db259c60c50da5b3ea7844682
- Evidence publication target: origin/build/dec339-ws02-bu05-cursor-recovery-gates-20261120
