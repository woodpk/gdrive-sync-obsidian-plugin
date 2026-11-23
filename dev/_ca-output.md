STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Repository verification: BLOCKED; DEPENDENCY FAILURE; Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0)
- Overall verification: BLOCKED; PRODUCT FAILURE; Promotion requires PASS for both change-set and repository verification.

- Framework version: 0.2.0-dev.2
- Run ID: 03f86b04-600f-4e89-92ad-3b1767fea073
- Repository: C:/temp/43cdeb9dcb9946a19ac25f16be2fdfdd/phx-0505656f93bc43d7/w
- Branch:
- Verified HEAD: f19e395d742243f1c33b8daa7d80db48865c2b1c
- Verified tree: 58bfd812fbc34a2109759851df6b2fa1839804b7
- Expected HEAD: f19e395d742243f1c33b8daa7d80db48865c2b1c
- Base SHA: 7e830d74188d14db7f5ceb35d710a6b894cc2b73
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.10
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-11-23T17:51:40.4213024Z
- Ended: 2026-11-23T17:52:20.6010266Z

## Ordered stages

- authority-check: PASS (exit 0; NONE; run 03f86b04-600f-4e89-92ad-3b1767fea073)
- preflight: PASS (exit 0; NONE; run 03f86b04-600f-4e89-92ad-3b1767fea073)
- node-preflight: PASS (exit 0; NONE; run 03f86b04-600f-4e89-92ad-3b1767fea073)
- node-project-files: PASS (exit 0; NONE; run 03f86b04-600f-4e89-92ad-3b1767fea073)
- install: PASS (exit 0; NONE; run 03f86b04-600f-4e89-92ad-3b1767fea073)
- typecheck: FAIL (exit 2; PRODUCT FAILURE; run 03f86b04-600f-4e89-92ad-3b1767fea073; reason: Stage 'typecheck' exited unsuccessfully.)
- test-focused: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 03f86b04-600f-4e89-92ad-3b1767fea073; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- test: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 03f86b04-600f-4e89-92ad-3b1767fea073; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0))
- artifact-preparation: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 03f86b04-600f-4e89-92ad-3b1767fea073; reason: Dependent stage was not executed: typecheck (prerequisite is not an executed PASS with native exit 0); test-focused (prerequisite is not an executed PASS with native exit 0); test (prerequisite is not an executed PASS with native exit 0))
- build: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 03f86b04-600f-4e89-92ad-3b1767fea073; reason: Dependent stage was not executed: artifact-preparation (prerequisite is not an executed PASS with native exit 0))
- artifacts: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 03f86b04-600f-4e89-92ad-3b1767fea073; reason: Dependent stage was not executed: build (prerequisite is not an executed PASS with native exit 0))
- check: PASS (exit 0; NONE; run 03f86b04-600f-4e89-92ad-3b1767fea073)
- repository-check: BLOCKED (exit not executed; DEPENDENCY FAILURE; run 03f86b04-600f-4e89-92ad-3b1767fea073; reason: Dependent stage was not executed: artifacts (prerequisite is not an executed PASS with native exit 0))

## Artifacts

- None recorded for current run

Final verdict: BLOCKED
Failure classification: PRODUCT FAILURE
