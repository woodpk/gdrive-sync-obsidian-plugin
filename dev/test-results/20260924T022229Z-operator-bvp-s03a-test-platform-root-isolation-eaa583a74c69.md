STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: BLOCKED; REPOSITORY-GATE FAILURE; A required non-verification gate did not complete successfully.

- Framework version: 0.2.0-dev.2
- Run ID: de45aab6-be65-4298-8e6e-06d38e179430
- Repository: C:/phx-tmp/phx-ci-run-76d3b26c227a47bfb7d3cc898530d18b/gdrive-sync-obsidian-plugin
- Branch:
- Verified HEAD: eaa583a74c695ab7ce1726a636a469efb90a708f
- Verified tree: b3f5cd6f5ece06cfd69a3e1d4c56c802627f2e7d
- Expected HEAD: eaa583a74c695ab7ce1726a636a469efb90a708f
- Base SHA: 376ab75477c863cceb63ff82475f352a8f4ec4cc
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- Started: 2026-09-24T02:22:30.8978961Z
- Ended: 2026-09-24T02:23:32.4400134Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- node-preflight: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- node-project-files: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- install: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- typecheck: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- test-focused: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- test: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- build: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- repository-check: PASS (exit 0; NONE; run de45aab6-be65-4298-8e6e-06d38e179430)
- check: FAIL (exit 1; REPOSITORY-GATE FAILURE; run de45aab6-be65-4298-8e6e-06d38e179430)
- artifacts: MISSING (FRAMEWORK FAILURE)

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: REPOSITORY-GATE FAILURE

## Core-runner safety gate

- Result: BLOCKED
- Failure classification: RUNNER SAFETY FAILURE
- Reason: Verification commands changed non-evidence working-tree paths: .test-platform-build/src/platform-root.js, .test-platform-build/test/platform-root.test.js

## Core-runner provenance

- Source branch: bvp-s03a-test-platform-root-isolation
- Source build HEAD requested: eaa583a74c695ab7ce1726a636a469efb90a708f
- Verification checkout HEAD: eaa583a74c695ab7ce1726a636a469efb90a708f
- Evidence publication target: origin/bvp-s03a-test-platform-root-isolation
