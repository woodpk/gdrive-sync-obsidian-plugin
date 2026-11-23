STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: e2b30f3d-2faa-45e6-be88-ae604e8cebcf
- Repository: C:/temp/cb5a9d2c16cb4f658989111cdb509ada/phx-283b275907b14988/w
- Branch:
- Verified HEAD: a278479987e7fb46ea02f22221c53ff4425e51a4
- Verified tree: 882480fc60d3aab46b3ce94c1f8faea6f5d5a86c
- Expected HEAD: a278479987e7fb46ea02f22221c53ff4425e51a4
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-23T03:58:34.5321565Z
- Ended: 2026-11-23T04:03:45.0891951Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- preflight: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- node-preflight: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- node-project-files: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- install: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- typecheck: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- test-focused: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- test: FAIL (exit 1; TEST FAILURE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf; reason: Dependent stage was not executed: test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run e2b30f3d-2faa-45e6-be88-ae604e8cebcf; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
