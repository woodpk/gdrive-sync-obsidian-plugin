STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Repository verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: a1f6f798-e02a-4c3d-8f9e-7c49ee13446f
- Repository: C:/temp/365c6492235145d68cdaeb27cab73511/phx-7dc51262238546a5/w
- Branch:
- Verified HEAD: e31fd3ec4ce190c7945697c49ab2bb44161aad19
- Verified tree: ce325814e9c38cefa2436c5809347133a65cecbc
- Expected HEAD: e31fd3ec4ce190c7945697c49ab2bb44161aad19
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-22T16:24:21.5676181Z
- Ended: 2026-11-22T16:25:03.5557090Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f)
- preflight: PASS (exit 0; NONE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f)
- node-preflight: PASS (exit 0; NONE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f)
- node-project-files: PASS (exit 0; NONE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f)
- install: PASS (exit 0; NONE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f; reason: Stage 'typecheck' exited unsuccessfully.)
- test-focused: BLOCKED (exit not executed; DEPENDENCY FAILURE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- test: BLOCKED (exit not executed; DEPENDENCY FAILURE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0); test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run a1f6f798-e02a-4c3d-8f9e-7c49ee13446f; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: PRODUCT FAILURE

## Core-runner provenance

- Source branch: build/dec339-ws02-bu05-cursor-recovery-gates-20261120
- Source build HEAD requested: e31fd3ec4ce190c7945697c49ab2bb44161aad19
- Verification checkout HEAD: e31fd3ec4ce190c7945697c49ab2bb44161aad19
- Evidence publication target: origin/build/dec339-ws02-bu05-cursor-recovery-gates-20261120
