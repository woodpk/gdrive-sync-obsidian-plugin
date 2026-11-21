STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Repository verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: d0260a16-e6f9-470d-a39c-bc0225e1e1a3
- Repository: C:/temp/dd9721c31e5a4ca586a3d871fb99002b/phx-b7cb4062ca44482c/w
- Branch:
- Verified HEAD: d32e0219b2002ea054e48eea073ce2563d2cbde3
- Verified tree: 87f092cb4267c96869be9678a3d45dce4622bcc2
- Expected HEAD: d32e0219b2002ea054e48eea073ce2563d2cbde3
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-21T00:04:10.9715688Z
- Ended: 2026-11-21T00:05:05.3872188Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3)
- preflight: PASS (exit 0; NONE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3)
- node-preflight: PASS (exit 0; NONE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3)
- node-project-files: PASS (exit 0; NONE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3)
- install: PASS (exit 0; NONE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3; reason: Stage 'typecheck' exited unsuccessfully.)
- test-focused: BLOCKED (exit not executed; DEPENDENCY FAILURE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- test: BLOCKED (exit not executed; DEPENDENCY FAILURE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0); test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run d0260a16-e6f9-470d-a39c-bc0225e1e1a3; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: PRODUCT FAILURE
