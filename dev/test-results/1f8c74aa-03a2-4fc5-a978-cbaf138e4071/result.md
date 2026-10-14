STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: BLOCKED; REPOSITORY-GATE FAILURE; A required non-verification gate did not complete successfully.

- Framework version: 0.2.0-dev.2
- Run ID: 1f8c74aa-03a2-4fc5-a978-cbaf138e4071
- Repository: C:/phx-d2353725e54a42ed/w
- Branch:
- Verified HEAD: a351517c6cbe41bd64b696fabfffafc198d5665f
- Verified tree: 44cd487049e7f5952534c15f10fab0ee1370652c
- Expected HEAD: a351517c6cbe41bd64b696fabfffafc198d5665f
- Base SHA: 4f9c69c38c12c09d2f06f3f966dc8519ed45a99f
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-05T15:33:57.0930945Z
- Ended: 2026-10-05T15:35:50.5154171Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- node-preflight: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- node-project-files: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- install: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- typecheck: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- test-focused: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- test: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- build: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- repository-check: FAIL (exit 1; REPOSITORY-GATE FAILURE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- artifacts: PASS (exit 0; NONE; run 1f8c74aa-03a2-4fc5-a978-cbaf138e4071)
- check: MISSING (FRAMEWORK FAILURE)

## Artifacts

- main.js: 886635 bytes; SHA-256 550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477

Final verdict: BLOCKED
Failure classification: REPOSITORY-GATE FAILURE

## Core-runner provenance

- Source branch: bvp-s08f-desktop-live-canary
- Source build HEAD requested: a351517c6cbe41bd64b696fabfffafc198d5665f
- Verification checkout HEAD: a351517c6cbe41bd64b696fabfffafc198d5665f
- Evidence publication target: origin/bvp-s08f-desktop-live-canary
