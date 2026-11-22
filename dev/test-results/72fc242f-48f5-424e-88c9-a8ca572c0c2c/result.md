STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 72fc242f-48f5-424e-88c9-a8ca572c0c2c
- Repository: C:/temp/16a123fcfc2c4d4aa9948ca78672fe41/phx-623071217c5d4a14/w
- Branch:
- Verified HEAD: 88fdb7ae26a63047817c5861191960a845c1af62
- Verified tree: 1d49e613e2b190e8bea0914f4237639958c15e34
- Expected HEAD: 88fdb7ae26a63047817c5861191960a845c1af62
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-22T05:34:17.1375120Z
- Ended: 2026-11-22T05:37:18.2001500Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- preflight: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- node-preflight: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- node-project-files: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- install: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- typecheck: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- test-focused: FAIL (exit 1; TEST FAILURE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 72fc242f-48f5-424e-88c9-a8ca572c0c2c; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-ws02-bu05-cursor-recovery-gates-20261120
- Source build HEAD requested: 88fdb7ae26a63047817c5861191960a845c1af62
- Verification checkout HEAD: 88fdb7ae26a63047817c5861191960a845c1af62
- Evidence publication target: origin/build/dec339-ws02-bu05-cursor-recovery-gates-20261120
