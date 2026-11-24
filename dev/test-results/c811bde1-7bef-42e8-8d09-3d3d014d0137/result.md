STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: c811bde1-7bef-42e8-8d09-3d3d014d0137
- Repository: C:/temp/3c80653b40c54bad8dcf23750c8548c3/phx-48ae78d80d314d65/w
- Branch:
- Verified HEAD: 4425c8102c1a6c754ca03eb1be52ae66f854628a
- Verified tree: d33faa0111a7441b21daf27080dc9bae6496b534
- Expected HEAD: 4425c8102c1a6c754ca03eb1be52ae66f854628a
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-24T23:26:20.8409185Z
- Ended: 2026-11-24T23:30:12.4648173Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- preflight: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- node-preflight: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- node-project-files: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- install: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- typecheck: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- test-focused: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- test: FAIL (exit 1; TEST FAILURE; run c811bde1-7bef-42e8-8d09-3d3d014d0137; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c811bde1-7bef-42e8-8d09-3d3d014d0137; reason: Dependent stage was not executed: test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c811bde1-7bef-42e8-8d09-3d3d014d0137; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c811bde1-7bef-42e8-8d09-3d3d014d0137; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run c811bde1-7bef-42e8-8d09-3d3d014d0137)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run c811bde1-7bef-42e8-8d09-3d3d014d0137; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-step6-metadata-bvp-20261124
- Source build HEAD requested: 4425c8102c1a6c754ca03eb1be52ae66f854628a
- Verification checkout HEAD: 4425c8102c1a6c754ca03eb1be52ae66f854628a
- Evidence publication target: origin/build/dec339-step6-metadata-bvp-20261124
