STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: c90bbb37-a79b-46a7-9612-5977207e3789
- Repository: C:/temp/38ef88f537a3412cbd093bf2d33d5981/phx-bca3482db6294c96/w
- Branch:
- Verified HEAD: e187c69fea3305e54e2a78eb39211a2936dddec9
- Verified tree: fe334a5ec153fee84d3be62aaddf3c830455d312
- Expected HEAD: e187c69fea3305e54e2a78eb39211a2936dddec9
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-19T03:01:40.2901011Z
- Ended: 2026-11-19T03:05:05.3459082Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run c90bbb37-a79b-46a7-9612-5977207e3789)
- preflight: PASS (exit 0; NONE; run c90bbb37-a79b-46a7-9612-5977207e3789)
- node-preflight: PASS (exit 0; NONE; run c90bbb37-a79b-46a7-9612-5977207e3789)
- node-project-files: PASS (exit 0; NONE; run c90bbb37-a79b-46a7-9612-5977207e3789)
- install: PASS (exit 0; NONE; run c90bbb37-a79b-46a7-9612-5977207e3789)
- typecheck: PASS (exit 0; NONE; run c90bbb37-a79b-46a7-9612-5977207e3789)
- test-focused: FAIL (exit 1; TEST FAILURE; run c90bbb37-a79b-46a7-9612-5977207e3789; reason: Stage 'test-focused' exited unsuccessfully.)
- test: FAIL (exit 1; TEST FAILURE; run c90bbb37-a79b-46a7-9612-5977207e3789; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c90bbb37-a79b-46a7-9612-5977207e3789; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c90bbb37-a79b-46a7-9612-5977207e3789; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c90bbb37-a79b-46a7-9612-5977207e3789; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run c90bbb37-a79b-46a7-9612-5977207e3789)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c90bbb37-a79b-46a7-9612-5977207e3789; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
