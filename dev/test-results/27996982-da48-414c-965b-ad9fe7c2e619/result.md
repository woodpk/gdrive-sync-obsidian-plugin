STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 27996982-da48-414c-965b-ad9fe7c2e619
- Repository: C:/temp/03feec64723e406bacf59168af1a22b6/phx-fe96c68032124b8e/w
- Branch:
- Verified HEAD: 80db61bfe7cd14a1810f36ce982b8bc7e46c6270
- Verified tree: 5f453cd0f09728fd16ad9d36edf3e59833487026
- Expected HEAD: 80db61bfe7cd14a1810f36ce982b8bc7e46c6270
- Base SHA: 42460912847e363aa4fa11e23e0429944383889d
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-15T00:13:44.5916553Z
- Ended: 2026-11-15T00:17:16.2699790Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- preflight: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- node-preflight: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- node-project-files: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- install: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- typecheck: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- test-focused: FAIL (exit 1; TEST FAILURE; run 27996982-da48-414c-965b-ad9fe7c2e619; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 27996982-da48-414c-965b-ad9fe7c2e619; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 27996982-da48-414c-965b-ad9fe7c2e619; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 27996982-da48-414c-965b-ad9fe7c2e619; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 27996982-da48-414c-965b-ad9fe7c2e619)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 27996982-da48-414c-965b-ad9fe7c2e619; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/bvp-poll-error-observability-20261025
- Source build HEAD requested: 80db61bfe7cd14a1810f36ce982b8bc7e46c6270
- Verification checkout HEAD: 80db61bfe7cd14a1810f36ce982b8bc7e46c6270
- Evidence publication target: origin/build/bvp-poll-error-observability-20261025
