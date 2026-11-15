STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 020904e7-f70c-4c00-a39c-a0c29372355c
- Repository: C:/temp/4ab434279c7b46f295de5f5e9f3d504e/phx-ea9faa15f4264cf5/w
- Branch:
- Verified HEAD: 2c70ca5562a4d366c9d54e9bc99dd379bfc7da3a
- Verified tree: 1cf2b581282cf68392ee58c7f3bf702578956739
- Expected HEAD: 2c70ca5562a4d366c9d54e9bc99dd379bfc7da3a
- Base SHA: 42460912847e363aa4fa11e23e0429944383889d
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-15T17:41:54.2002547Z
- Ended: 2026-11-15T17:45:57.1749648Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- preflight: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- node-preflight: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- node-project-files: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- install: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- typecheck: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- test-focused: FAIL (exit 1; TEST FAILURE; run 020904e7-f70c-4c00-a39c-a0c29372355c; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 020904e7-f70c-4c00-a39c-a0c29372355c; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 020904e7-f70c-4c00-a39c-a0c29372355c; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 020904e7-f70c-4c00-a39c-a0c29372355c; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 020904e7-f70c-4c00-a39c-a0c29372355c)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 020904e7-f70c-4c00-a39c-a0c29372355c; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE
