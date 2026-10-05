STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: BLOCKED; REPOSITORY-GATE FAILURE; A required non-verification gate did not complete successfully.

- Framework version: 0.2.0-dev.2
- Run ID: 34a003cf-8277-4ba5-8831-c9019eb65596
- Repository: C:/695286d0ce1d4bb68b50089a8f9e9d8d/phx-e5e2c1fde7a24f1e/w
- Branch:
- Verified HEAD: 06c9dbeb95ee5f0b0336745e8772074e1ace9b56
- Verified tree: 338412a9dc0c034026f6e3281fbb2585e2771063
- Expected HEAD: 06c9dbeb95ee5f0b0336745e8772074e1ace9b56
- Base SHA: 4f9c69c38c12c09d2f06f3f966dc8519ed45a99f
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-04T22:18:45.0067076Z
- Ended: 2026-10-04T22:20:51.3804166Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- node-preflight: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- node-project-files: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- install: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- typecheck: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- test-focused: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- test: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- build: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- repository-check: FAIL (exit 1; REPOSITORY-GATE FAILURE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- artifacts: PASS (exit 0; NONE; run 34a003cf-8277-4ba5-8831-c9019eb65596)
- check: MISSING (FRAMEWORK FAILURE)

## Artifacts

- main.js: 886635 bytes; SHA-256 550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477

Final verdict: BLOCKED
Failure classification: REPOSITORY-GATE FAILURE

## Core-runner provenance

- Source branch: bvp-s08f-desktop-live-canary
- Source build HEAD requested: 06c9dbeb95ee5f0b0336745e8772074e1ace9b56
- Verification checkout HEAD: 06c9dbeb95ee5f0b0336745e8772074e1ace9b56
- Evidence publication target: origin/bvp-s08f-desktop-live-canary
