STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; PRODUCT FAILURE; Stage 'test-focused' did not execute because required stage 'typecheck' failed first.
- Repository verification: BLOCKED; PRODUCT FAILURE; Stage 'test' did not execute because required stage 'typecheck' failed first.
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 18c02c77-58a2-4c24-ab86-f94182396bb7
- Repository: C:/phx-eb90ef773c2342a3/w
- Branch:
- Verified HEAD: 5fe08a311157e6e044491a4a500736c5e160375a
- Verified tree: 8c00c4a8d0766866cd324ea621df510405187d54
- Expected HEAD: 5fe08a311157e6e044491a4a500736c5e160375a
- Base SHA: 720e38df2ca0bc0337214200904a200fafeabca7
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-11T19:55:11.7437743Z
- Ended: 2026-10-11T19:55:41.7887128Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 18c02c77-58a2-4c24-ab86-f94182396bb7)
- node-preflight: PASS (exit 0; NONE; run 18c02c77-58a2-4c24-ab86-f94182396bb7)
- node-project-files: PASS (exit 0; NONE; run 18c02c77-58a2-4c24-ab86-f94182396bb7)
- install: PASS (exit 0; NONE; run 18c02c77-58a2-4c24-ab86-f94182396bb7)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run 18c02c77-58a2-4c24-ab86-f94182396bb7)
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

- Source branch: dec339/d339-07b2-provider-effect-matrix-01
- Source build HEAD requested: 5fe08a311157e6e044491a4a500736c5e160375a
- Verification checkout HEAD: 5fe08a311157e6e044491a4a500736c5e160375a
- Evidence publication target: origin/dec339/d339-07b2-provider-effect-matrix-01
