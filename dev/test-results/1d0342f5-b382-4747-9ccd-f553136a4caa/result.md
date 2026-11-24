STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; PRODUCT FAILURE; Stage 'test-focused' did not execute because required stage 'typecheck' failed first.
- Repository verification: BLOCKED; PRODUCT FAILURE; Stage 'test' did not execute because required stage 'typecheck' failed first.
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 1d0342f5-b382-4747-9ccd-f553136a4caa
- Repository: C:/phx-58d7a4775d6d4e51/w
- Branch:
- Verified HEAD: 181f0a70cbd430208dfbb27db4157f1781f91d21
- Verified tree: 929b2529ab39235df3d979ee2f07d53b789c4f60
- Expected HEAD: 181f0a70cbd430208dfbb27db4157f1781f91d21
- Base SHA: 62fb2632017c0744f16fe95467d39d35ae655b16
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-24T18:09:04.6864516Z
- Ended: 2026-11-24T18:09:30.3055929Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 1d0342f5-b382-4747-9ccd-f553136a4caa)
- node-preflight: PASS (exit 0; NONE; run 1d0342f5-b382-4747-9ccd-f553136a4caa)
- node-project-files: PASS (exit 0; NONE; run 1d0342f5-b382-4747-9ccd-f553136a4caa)
- install: PASS (exit 0; NONE; run 1d0342f5-b382-4747-9ccd-f553136a4caa)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run 1d0342f5-b382-4747-9ccd-f553136a4caa)
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

- Source branch: build/dec339-step6-metadata-bvp-20261124
- Source build HEAD requested: 181f0a70cbd430208dfbb27db4157f1781f91d21
- Verification checkout HEAD: 181f0a70cbd430208dfbb27db4157f1781f91d21
- Evidence publication target: origin/build/dec339-step6-metadata-bvp-20261124
