STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; PRODUCT FAILURE; Stage 'test-focused' did not execute because required stage 'typecheck' failed first.
- Repository verification: BLOCKED; PRODUCT FAILURE; Stage 'test' did not execute because required stage 'typecheck' failed first.
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 8af6c21f-fddd-4d49-9da0-d40e945584f8
- Repository: C:/phx-1703522189c344e7/w
- Branch:
- Verified HEAD: 9e7437b7fcf767ab2a3d861aaf5012d8d5eaad9e
- Verified tree: 28286fb830f44bcb7f3bef482101c21dd9c54ec1
- Expected HEAD: 9e7437b7fcf767ab2a3d861aaf5012d8d5eaad9e
- Base SHA: 7b4297adceb2fd6268a5801a207b7dce1f7b7728
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-09T19:38:24.4993157Z
- Ended: 2026-10-09T19:38:43.4508834Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 8af6c21f-fddd-4d49-9da0-d40e945584f8)
- node-preflight: PASS (exit 0; NONE; run 8af6c21f-fddd-4d49-9da0-d40e945584f8)
- node-project-files: PASS (exit 0; NONE; run 8af6c21f-fddd-4d49-9da0-d40e945584f8)
- install: PASS (exit 0; NONE; run 8af6c21f-fddd-4d49-9da0-d40e945584f8)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run 8af6c21f-fddd-4d49-9da0-d40e945584f8)
- test-focused: MISSING (FRAMEWORK FAILURE)
- test: MISSING (FRAMEWORK FAILURE)
- build: MISSING (FRAMEWORK FAILURE)
- repository-check: MISSING (FRAMEWORK FAILURE)
- check: MISSING (FRAMEWORK FAILURE)
- artifacts: MISSING (FRAMEWORK FAILURE)

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: PRODUCT FAILURE

## Core-runner provenance

- Source branch: bvp-s09a-request-attribution-01
- Source build HEAD requested: 9e7437b7fcf767ab2a3d861aaf5012d8d5eaad9e
- Verification checkout HEAD: 9e7437b7fcf767ab2a3d861aaf5012d8d5eaad9e
- Evidence publication target: origin/bvp-s09a-request-attribution-01
