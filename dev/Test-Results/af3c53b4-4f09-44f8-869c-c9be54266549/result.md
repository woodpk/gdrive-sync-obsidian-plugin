STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; TOOLCHAIN FAILURE; Stage 'test-focused' did not execute because required stage 'install' failed first.
- Repository verification: BLOCKED; TOOLCHAIN FAILURE; Stage 'test' did not execute because required stage 'install' failed first.
- Overall verification: BLOCKED; TOOLCHAIN FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: af3c53b4-4f09-44f8-869c-c9be54266549
- Repository: D:/phx-tmp/phx-1ed8887454624c4c/w
- Branch:
- Verified HEAD: 6987849a020ee39933861611de2295e6ab98359f
- Verified tree: 2a0f715ff2ce515abd0194bd0d15706610859001
- Expected HEAD: 6987849a020ee39933861611de2295e6ab98359f
- Base SHA: 225e38d0e851ea7e537f71c1134f2931344ef5ac
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- Started: 2026-10-01T19:50:05.9723728Z
- Ended: 2026-10-01T19:50:18.9210060Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run af3c53b4-4f09-44f8-869c-c9be54266549)
- node-preflight: PASS (exit 0; NONE; run af3c53b4-4f09-44f8-869c-c9be54266549)
- node-project-files: PASS (exit 0; NONE; run af3c53b4-4f09-44f8-869c-c9be54266549)
- install: FAIL (exit 1; TOOLCHAIN FAILURE; run af3c53b4-4f09-44f8-869c-c9be54266549)
- typecheck: MISSING (FRAMEWORK FAILURE)
- test-focused: MISSING (FRAMEWORK FAILURE)
- test: MISSING (FRAMEWORK FAILURE)
- build: MISSING (FRAMEWORK FAILURE)
- repository-check: MISSING (FRAMEWORK FAILURE)
- check: MISSING (FRAMEWORK FAILURE)
- artifacts: MISSING (FRAMEWORK FAILURE)

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TOOLCHAIN FAILURE

## Core-runner provenance

- Source branch: bvp-s08a-production-run-receipt-seam
- Source build HEAD requested: 6987849a020ee39933861611de2295e6ab98359f
- Verification checkout HEAD: 6987849a020ee39933861611de2295e6ab98359f
- Evidence publication target: origin/bvp-s08a-production-run-receipt-seam
