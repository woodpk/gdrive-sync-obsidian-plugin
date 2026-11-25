STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 263c1505-d5c7-4a52-bbf8-603842af0519
- Repository: C:/temp/cc6c2a4d9a29441c9656ec3a52ab9eaf/phx-76f47a6f51f9489e/w
- Branch:
- Verified HEAD: ceefa3260d926214e2a921c1a76200e6cbadade4
- Verified tree: 623e5ea9ed1bf0bb17608e0415db5a43cb983dea
- Expected HEAD: ceefa3260d926214e2a921c1a76200e6cbadade4
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-25T06:11:04.7626832Z
- Ended: 2026-11-25T06:15:15.1689979Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- preflight: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- node-preflight: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- node-project-files: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- install: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- typecheck: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- test-focused: FAIL (exit 1; TEST FAILURE; run 263c1505-d5c7-4a52-bbf8-603842af0519; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 263c1505-d5c7-4a52-bbf8-603842af0519; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 263c1505-d5c7-4a52-bbf8-603842af0519; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 263c1505-d5c7-4a52-bbf8-603842af0519; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 263c1505-d5c7-4a52-bbf8-603842af0519)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 263c1505-d5c7-4a52-bbf8-603842af0519; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
