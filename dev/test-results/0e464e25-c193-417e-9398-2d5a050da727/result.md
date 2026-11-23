STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Repository verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 0e464e25-c193-417e-9398-2d5a050da727
- Repository: C:/temp/8058488882534376ab8e95535711f300/phx-9c5b46ea8f874a92/w
- Branch:
- Verified HEAD: 76503842e613eb73b32be5a33cf8f82e79e255fd
- Verified tree: 15f5f61d65294f2c64969813401d1eb613e823b4
- Expected HEAD: 76503842e613eb73b32be5a33cf8f82e79e255fd
- Base SHA: f936961a4b9dbcb8b23e887771d27bbba7e7ac55
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-23T22:13:07.9516570Z
- Ended: 2026-11-23T22:13:36.5135202Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 0e464e25-c193-417e-9398-2d5a050da727)
- preflight: PASS (exit 0; NONE; run 0e464e25-c193-417e-9398-2d5a050da727)
- node-preflight: PASS (exit 0; NONE; run 0e464e25-c193-417e-9398-2d5a050da727)
- node-project-files: PASS (exit 0; NONE; run 0e464e25-c193-417e-9398-2d5a050da727)
- install: PASS (exit 0; NONE; run 0e464e25-c193-417e-9398-2d5a050da727)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run 0e464e25-c193-417e-9398-2d5a050da727; reason: Stage 'typecheck' exited unsuccessfully.)
- test-focused: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 0e464e25-c193-417e-9398-2d5a050da727; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- test: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 0e464e25-c193-417e-9398-2d5a050da727; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 0e464e25-c193-417e-9398-2d5a050da727; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0); test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 0e464e25-c193-417e-9398-2d5a050da727; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 0e464e25-c193-417e-9398-2d5a050da727; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 0e464e25-c193-417e-9398-2d5a050da727)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 0e464e25-c193-417e-9398-2d5a050da727; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: PRODUCT FAILURE

## Core-runner provenance

- Source branch: build/dec339-step5-gated-planner-cutover-20261123
- Source build HEAD requested: 76503842e613eb73b32be5a33cf8f82e79e255fd
- Verification checkout HEAD: 76503842e613eb73b32be5a33cf8f82e79e255fd
- Evidence publication target: origin/build/dec339-step5-gated-planner-cutover-20261123
