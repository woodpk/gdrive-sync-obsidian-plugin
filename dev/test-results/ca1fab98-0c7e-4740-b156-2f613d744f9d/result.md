STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: ca1fab98-0c7e-4740-b156-2f613d744f9d
- Repository: C:/temp/519f02151f1841f094861bf042f47898/phx-6d88b842e32949dd/w
- Branch:
- Verified HEAD: 0e38f14d67dae95b3a3465d4da2df6687bb74b5d
- Verified tree: 4dea704a02bb52dec92a492d8e0f668e59d9856c
- Expected HEAD: 0e38f14d67dae95b3a3465d4da2df6687bb74b5d
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-25T05:23:53.4428143Z
- Ended: 2026-11-25T05:26:44.8427934Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- preflight: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- node-preflight: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- node-project-files: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- install: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- typecheck: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- test-focused: FAIL (exit 2; TEST FAILURE; run ca1fab98-0c7e-4740-b156-2f613d744f9d; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run ca1fab98-0c7e-4740-b156-2f613d744f9d; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run ca1fab98-0c7e-4740-b156-2f613d744f9d; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run ca1fab98-0c7e-4740-b156-2f613d744f9d; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run ca1fab98-0c7e-4740-b156-2f613d744f9d)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run ca1fab98-0c7e-4740-b156-2f613d744f9d; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-step6-metadata-bvp-20261124
- Source build HEAD requested: 0e38f14d67dae95b3a3465d4da2df6687bb74b5d
- Verification checkout HEAD: 0e38f14d67dae95b3a3465d4da2df6687bb74b5d
- Evidence publication target: origin/build/dec339-step6-metadata-bvp-20261124
