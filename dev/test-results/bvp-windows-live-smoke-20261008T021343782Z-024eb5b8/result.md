# BVP Battery Result

- Battery: windows-live-smoke
- Run ID: bvp-windows-live-smoke-20261008T021343782Z-024eb5b8
- Scenario: <not-produced>
- BVP status: **failed**
- Battery process exit code: 2
- Classification: battery-result-not-produced
- Validation source commit: 3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f
- Controller source HEAD: 0352df4d4ba9c1598413b748fe498da60a861e28
- Controller branch: bvp-battery-pilot-01
- Relay root: D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync\.bvp-relay
- Generated UTC: 2026-10-08T02:13:50.6966985+00:00
- GitHub Actions used: **No**


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
| bvp-typescript-compile | node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json | 2 |

## Persistence

This directory is the complete persisted BVP battery result package. After the package is finalized, the operator script commits only this directory and pushes that commit to the current branch on origin.