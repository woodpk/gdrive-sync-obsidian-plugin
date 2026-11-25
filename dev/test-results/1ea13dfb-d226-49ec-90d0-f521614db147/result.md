STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 1ea13dfb-d226-49ec-90d0-f521614db147
- Repository: C:/temp/1ad50448b33f4640bfd1acdf6ad979dd/phx-4fd8edce6a864bef/w
- Branch:
- Verified HEAD: 8a863151c7b2e62faa38135970b6d1e60380791a
- Verified tree: 086b4da019bae1985bf12971a19002cb5cd6071c
- Expected HEAD: 8a863151c7b2e62faa38135970b6d1e60380791a
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-25T05:43:53.8488332Z
- Ended: 2026-11-25T05:46:43.6134085Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- preflight: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- node-preflight: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- node-project-files: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- install: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- typecheck: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- test-focused: FAIL (exit 2; TEST FAILURE; run 1ea13dfb-d226-49ec-90d0-f521614db147; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 1ea13dfb-d226-49ec-90d0-f521614db147; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 1ea13dfb-d226-49ec-90d0-f521614db147; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 1ea13dfb-d226-49ec-90d0-f521614db147; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 1ea13dfb-d226-49ec-90d0-f521614db147)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 1ea13dfb-d226-49ec-90d0-f521614db147; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-step6-metadata-bvp-20261124
- Source build HEAD requested: 8a863151c7b2e62faa38135970b6d1e60380791a
- Verification checkout HEAD: 8a863151c7b2e62faa38135970b6d1e60380791a
- Evidence publication target: origin/build/dec339-step6-metadata-bvp-20261124
