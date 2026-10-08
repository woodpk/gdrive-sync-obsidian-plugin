# BVP Battery Result

- Battery: s09a-windows-initial-sync
- Run ID: bvp-s09a-windows-initial-sync-20261008T050503775Z-043d087e
- Attempt: 1
- Package status: **FAIL**
- BVP status: **failed**
- Battery process exit code: 2
- Classification: battery-result-not-produced
- Validation source commit: 3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f
- Controller source HEAD at attempt start: 51b69a53df568e96e849dff77eb375409f798a37
- Controller branch: bvp-battery-pilot-01
- Relay root: D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync\.bvp-relay
- Generated UTC: 2026-10-08T05:05:10.6155923+00:00
- GitHub Actions used: **No**



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
| bvp-typescript-compile | node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json | 2 |

## Persistence

This directory is the complete persisted BVP battery result package. After each attempt, the operator stages only this run directory, commits it, and pushes that commit to the current branch on origin.