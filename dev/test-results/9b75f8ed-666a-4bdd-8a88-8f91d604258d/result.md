STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 9b75f8ed-666a-4bdd-8a88-8f91d604258d
- Repository: C:/temp/aa4d5290c8e64e2e9ad2deedf9e8c253/phx-8d2c1b1b615f45ff/w
- Branch:
- Verified HEAD: d84f251401e66389b753f511e6c341557b4f4b92
- Verified tree: aa45a638513a99707b9f5b4c08874082b15c36e0
- Expected HEAD: d84f251401e66389b753f511e6c341557b4f4b92
- Base SHA: 42460912847e363aa4fa11e23e0429944383889d
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-14T23:22:24.9051705Z
- Ended: 2026-11-14T23:25:45.8310543Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- preflight: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- node-preflight: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- node-project-files: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- install: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- typecheck: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- test-focused: FAIL (exit 1; TEST FAILURE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 9b75f8ed-666a-4bdd-8a88-8f91d604258d; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/bvp-poll-error-observability-20261025
- Source build HEAD requested: d84f251401e66389b753f511e6c341557b4f4b92
- Verification checkout HEAD: d84f251401e66389b753f511e6c341557b4f4b92
- Evidence publication target: origin/build/bvp-poll-error-observability-20261025
