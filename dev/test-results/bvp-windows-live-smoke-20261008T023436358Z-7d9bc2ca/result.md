# BVP Battery Result

- Battery: windows-live-smoke
- Run ID: bvp-windows-live-smoke-20261008T023436358Z-7d9bc2ca
- Scenario: battery-windows-live-smoke-01
- BVP status: **completed**
- Battery process exit code: 0

- Validation source commit: 3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f
- Controller source HEAD: 01b9755dbb2039680c51d05c5021b9d86c7eb848
- Controller branch: bvp-battery-pilot-01
- Relay root: D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync\.bvp-relay
- Generated UTC: 2026-10-08T02:35:04.7857584+00:00
- GitHub Actions used: **No**
- Canonical BVP evidence: Scenario battery-windows-live-smoke-01 [live] verdict=completed; assertions=3/3; observations=2; traceability=BVP-WINDOWS-LIVE-SMOKE

## Result package

- result.json — complete machine-readable battery/BVP result.
- result.md — this human-readable run summary.
- terminal.log — complete terminal output for compilation and BVP execution.
- checkpoint.json — not produced by this battery.

## Executed commands

| Step | Command | Exit code |
| --- | --- | ---: |
| node-version | node --version | 0 |
| npm-version | npm --version | 0 |
| bvp-typescript-compile | node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json | 0 |
| bvp-live-battery | node D:\obsidian-brain-dev\.test-build\bvp\test-platform\src\batteries\run-live-battery.js --battery windows-live-smoke --device-map-json {"windows":"device:8b7820faab2603b334a1c13d8c3bdba0"} --relay-root D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync\.bvp-relay --checkpoint-file D:\obsidian-brain-dev\dev\Test-Results\bvp-windows-live-smoke-20261008T023436358Z-7d9bc2ca\checkpoint.json --result-file D:\obsidian-brain-dev\dev\Test-Results\bvp-windows-live-smoke-20261008T023436358Z-7d9bc2ca\result.json --validation-source-commit 3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f --run-id bvp-windows-live-smoke-20261008T023436358Z-7d9bc2ca --result-timeout-ms 60000 --poll-interval-ms 250 | 0 |

## Persistence

This directory is the complete persisted BVP battery result package. After the package is finalized, the operator script commits only this directory and pushes that commit to the current branch on origin.