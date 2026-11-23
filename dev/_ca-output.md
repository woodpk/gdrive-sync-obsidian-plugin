STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: FAIL; TEST FAILURE; Stage 'test' exited unsuccessfully.
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: fe5780d5-9df0-4371-aa7d-c550cc03a161
- Repository: C:/temp/5721b7bbe03d4dc9b2ab4aa65eca82bc/phx-d130894dcf674739/w
- Branch:
- Verified HEAD: b35b8a498cc8b6a06719e33f9d97853557a811c3
- Verified tree: 9ee8628a7b2b109caf21dba6878e56c802e3ca31
- Expected HEAD: b35b8a498cc8b6a06719e33f9d97853557a811c3
- Base SHA: 8bbc67db3bb34137ac4be8188b5b50de34855180
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-23T07:08:55.2753972Z
- Ended: 2026-11-23T07:12:16.0191325Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run fe5780d5-9df0-4371-aa7d-c550cc03a161)
- preflight: PASS (exit 0; NONE; run fe5780d5-9df0-4371-aa7d-c550cc03a161)
- node-preflight: PASS (exit 0; NONE; run fe5780d5-9df0-4371-aa7d-c550cc03a161)
- node-project-files: PASS (exit 0; NONE; run fe5780d5-9df0-4371-aa7d-c550cc03a161)
- install: PASS (exit 0; NONE; run fe5780d5-9df0-4371-aa7d-c550cc03a161)
- typecheck: PASS (exit 0; NONE; run fe5780d5-9df0-4371-aa7d-c550cc03a161)
- test-focused: FAIL (exit 1; TEST FAILURE; run fe5780d5-9df0-4371-aa7d-c550cc03a161; reason: Stage 'test-focused' exited unsuccessfully.)
- test: FAIL (exit 1; TEST FAILURE; run fe5780d5-9df0-4371-aa7d-c550cc03a161; reason: Stage 'test' exited unsuccessfully.)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fe5780d5-9df0-4371-aa7d-c550cc03a161; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fe5780d5-9df0-4371-aa7d-c550cc03a161; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fe5780d5-9df0-4371-aa7d-c550cc03a161; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run fe5780d5-9df0-4371-aa7d-c550cc03a161)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run fe5780d5-9df0-4371-aa7d-c550cc03a161; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
