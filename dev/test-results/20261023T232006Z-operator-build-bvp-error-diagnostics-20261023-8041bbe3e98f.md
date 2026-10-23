STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited 1.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: e2e05c1c-0ac0-495f-a222-193acf392adc
- Repository: C:/temp/ec3df08eab1043eb91a59cf9a84a8d63/phx-684ba11c22424de8/w
- Branch:
- Verified HEAD: 8041bbe3e98f62325ffcf50b25409b725ad10479
- Verified tree: 58f046900dbaf00465f3ced5b96fde8c52e116c8
- Expected HEAD: 8041bbe3e98f62325ffcf50b25409b725ad10479
- Base SHA: 42460912847e363aa4fa11e23e0429944383889d
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-23T23:20:12.5771948Z
- Ended: 2026-10-23T23:21:48.3991355Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run e2e05c1c-0ac0-495f-a222-193acf392adc)
- node-preflight: PASS (exit 0; NONE; run e2e05c1c-0ac0-495f-a222-193acf392adc)
- node-project-files: PASS (exit 0; NONE; run e2e05c1c-0ac0-495f-a222-193acf392adc)
- install: PASS (exit 0; NONE; run e2e05c1c-0ac0-495f-a222-193acf392adc)
- typecheck: PASS (exit 0; NONE; run e2e05c1c-0ac0-495f-a222-193acf392adc)
- test-focused: FAIL (exit 1; TEST FAILURE; run e2e05c1c-0ac0-495f-a222-193acf392adc)
- test: PASS (exit 0; NONE; run e2e05c1c-0ac0-495f-a222-193acf392adc)
- build: MISSING (FRAMEWORK FAILURE)
- repository-check: MISSING (FRAMEWORK FAILURE)
- check: MISSING (FRAMEWORK FAILURE)
- artifacts: MISSING (FRAMEWORK FAILURE)

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/bvp-error-diagnostics-20261023
- Source build HEAD requested: 8041bbe3e98f62325ffcf50b25409b725ad10479
- Verification checkout HEAD: 8041bbe3e98f62325ffcf50b25409b725ad10479
- Evidence publication target: origin/build/bvp-error-diagnostics-20261023
