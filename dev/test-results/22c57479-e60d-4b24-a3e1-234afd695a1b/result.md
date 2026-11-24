STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: BLOCKED; REPOSITORY-GATE FAILURE; A required non-verification gate did not complete successfully.

- Framework version: 0.2.0-dev.2
- Run ID: 22c57479-e60d-4b24-a3e1-234afd695a1b
- Repository: C:/phx-9a7f6c8271b4422f/w
- Branch:
- Verified HEAD: 550fe83abcf7077353d665ef9d4942c0b045d6cc
- Verified tree: 532f22a0f3900c689f14d897ee03f112e498dcae
- Expected HEAD: 550fe83abcf7077353d665ef9d4942c0b045d6cc
- Base SHA: 62fb2632017c0744f16fe95467d39d35ae655b16
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-24T18:40:02.4132991Z
- Ended: 2026-11-24T18:45:51.4728348Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- node-preflight: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- node-project-files: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- install: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- typecheck: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- test-focused: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- test: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- build: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- repository-check: FAIL (exit 1; REPOSITORY-GATE FAILURE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- artifacts: PASS (exit 0; NONE; run 22c57479-e60d-4b24-a3e1-234afd695a1b)
- check: MISSING (FRAMEWORK FAILURE)

## Artifacts

- main.js: 1079114 bytes; SHA-256 43b9d35713c8064cb3f8a9d21370dc651bda3cd0173ce6ca360a0ca958441f01

Final verdict: BLOCKED
Failure classification: REPOSITORY-GATE FAILURE

## Core-runner provenance

- Source branch: build/dec339-step6-metadata-bvp-20261124
- Source build HEAD requested: 550fe83abcf7077353d665ef9d4942c0b045d6cc
- Verification checkout HEAD: 550fe83abcf7077353d665ef9d4942c0b045d6cc
- Evidence publication target: origin/build/dec339-step6-metadata-bvp-20261124
