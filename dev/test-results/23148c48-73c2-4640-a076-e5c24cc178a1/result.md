STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: FAIL; TEST FAILURE; Stage 'test-focused' exited unsuccessfully.
- Repository verification: PASS
- Overall verification: BLOCKED; TEST FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 23148c48-73c2-4640-a076-e5c24cc178a1
- Repository: C:/temp/4811be0e87d6416499a7fdb742070dca/phx-d5a90529a37a41eb/w
- Branch:
- Verified HEAD: a7e1132b06b08df9395af54d0e2374bad5f5d975
- Verified tree: 7e0e6debb8a47768943febad491d355a3efb5c68
- Expected HEAD: a7e1132b06b08df9395af54d0e2374bad5f5d975
- Base SHA: f507cbcc669568d1cb480abca469bdb1a7d184b8
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-25T05:58:16.0957514Z
- Ended: 2026-11-25T06:02:21.1265502Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- preflight: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- node-preflight: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- node-project-files: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- install: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- typecheck: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- test-focused: FAIL (exit 1; TEST FAILURE; run 23148c48-73c2-4640-a076-e5c24cc178a1; reason: Stage 'test-focused' exited unsuccessfully.)
- test: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 23148c48-73c2-4640-a076-e5c24cc178a1; reason: Dependent stage was not executed: test-focused (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 23148c48-73c2-4640-a076-e5c24cc178a1; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 23148c48-73c2-4640-a076-e5c24cc178a1; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 23148c48-73c2-4640-a076-e5c24cc178a1)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 23148c48-73c2-4640-a076-e5c24cc178a1; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: TEST FAILURE

## Core-runner provenance

- Source branch: build/dec339-step6-metadata-bvp-20261124
- Source build HEAD requested: a7e1132b06b08df9395af54d0e2374bad5f5d975
- Verification checkout HEAD: a7e1132b06b08df9395af54d0e2374bad5f5d975
- Evidence publication target: origin/build/dec339-step6-metadata-bvp-20261124
