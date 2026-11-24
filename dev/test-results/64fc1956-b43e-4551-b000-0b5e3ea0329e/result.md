STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 64fc1956-b43e-4551-b000-0b5e3ea0329e
- Repository: C:/temp/85f4652542044805abb7979648fbdc8e/phx-a0b11912750b4a89/w
- Branch:
- Verified HEAD: edfd4b1168ac61d865a32f9852ecd1df24d1391d
- Verified tree: 1faf3679049e44c3a7538b545619d5b6f73d6a70
- Expected HEAD: edfd4b1168ac61d865a32f9852ecd1df24d1391d
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-24T22:22:49.7761237Z
- Ended: 2026-11-24T22:26:55.8204388Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e)
- preflight: PASS (exit 0; NONE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e)
- node-preflight: PASS (exit 0; NONE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e)
- node-project-files: PASS (exit 0; NONE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e)
- install: PASS (exit 0; NONE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e)
- typecheck: PASS (exit 0; NONE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e)
- test-focused: FAIL (exit 1; TEST FAILURE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e; reason: Stage 'test-focused' exited unsuccessfully.)
- test: FAIL (exit 1; TEST FAILURE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 64fc1956-b43e-4551-b000-0b5e3ea0329e; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-step6-metadata-bvp-20261124
- Source build HEAD requested: edfd4b1168ac61d865a32f9852ecd1df24d1391d
- Verification checkout HEAD: edfd4b1168ac61d865a32f9852ecd1df24d1391d
- Evidence publication target: origin/build/dec339-step6-metadata-bvp-20261124
