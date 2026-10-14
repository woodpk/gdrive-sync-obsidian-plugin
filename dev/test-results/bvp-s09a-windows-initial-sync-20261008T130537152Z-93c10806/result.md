# BVP Battery Result

- Battery: s09a-windows-initial-sync
- Run ID: bvp-s09a-windows-initial-sync-20261008T130537152Z-93c10806
- Attempt: 1
- Package status: **FAIL**
- BVP status: **blocked**
- Battery process exit code: 1
- Classification: production-preview-unavailable
- Validation source commit: f5b5d9edd71a84f7ee280c8016df997e06d56751
- Controller source HEAD at attempt start: f5b5d9edd71a84f7ee280c8016df997e06d56751
- Controller branch: bvp-battery-pilot-01
- Relay root: D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync\.bvp-relay
- Generated UTC: 2026-10-08T13:06:25.6152317+00:00
- GitHub Actions used: **No**
- Canonical BVP evidence: Scenario battery-s09a-windows-initial-sync-01 [live] verdict=blocked; assertions=2/2; observations=4; traceability=BVP-S09A-WINDOWS-INITIAL-SYNC


## Result package

- result.json — current complete machine-readable battery/BVP result.
- result.md — this current human-readable run summary.
- checkpoint.json — present when a human checkpoint has been issued; retained as checkpoint history after resume.
- attempts/attempt-001/result.json — machine-readable output from this attempt.
- attempts/attempt-001/terminal.log — complete compile/BVP terminal output from this attempt.
- attempts/attempt-001/resume-evidence.json — present only on resume attempts and records the supplied bounded evidence tokens.

## Executed commands for this attempt

| Step | Command | Exit code |
| --- | --- | ---: |
| node-version | node --version | 0 |
| npm-version | npm --version | 0 |
| bvp-typescript-compile | node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json | 0 |
| bvp-live-battery | node D:\obsidian-brain-dev\.test-build\bvp\test-platform\test\batteries\run-live-battery.js --battery s09a-windows-initial-sync --device-map-json {"windows":"device:8b7820faab2603b334a1c13d8c3bdba0"} --relay-root D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync\.bvp-relay --checkpoint-file D:\obsidian-brain-dev\dev\Test-Results\bvp-s09a-windows-initial-sync-20261008T130537152Z-93c10806\checkpoint.json --result-file D:\obsidian-brain-dev\dev\Test-Results\bvp-s09a-windows-initial-sync-20261008T130537152Z-93c10806\attempts\attempt-001\result.json --resume-evidence-json  --validation-source-commit f5b5d9edd71a84f7ee280c8016df997e06d56751 --run-id bvp-s09a-windows-initial-sync-20261008T130537152Z-93c10806 --result-timeout-ms 60000 --poll-interval-ms 250 | 1 |

## Persistence

This directory is the complete persisted BVP battery result package. After each attempt, the operator stages only this run directory, commits it, and pushes that commit to the current branch on origin.