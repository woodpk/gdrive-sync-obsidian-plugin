STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: BLOCKED; REPOSITORY-GATE FAILURE; A required non-verification gate did not complete successfully.

- Framework version: 0.2.0-dev.2
- Run ID: 9166a436-0cda-494d-bf65-920e1186b65b
- Repository: C:/phx-a9f2e502a47f4b02/w
- Branch:
- Verified HEAD: 278f3e3c2ca2d837b862b3c49125e3265dfd5984
- Verified tree: 6d089dd1da1aeb354447b336f9263ac1d9884f37
- Expected HEAD: 278f3e3c2ca2d837b862b3c49125e3265dfd5984
- Base SHA: ec1e2e1a27577587aa3ab14cced01f0804eb2e58
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-09T22:16:08.2788874Z
- Ended: 2026-10-09T22:17:38.8838429Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- node-preflight: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- node-project-files: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- install: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- typecheck: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- test-focused: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- test: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- build: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- repository-check: FAIL (exit 1; REPOSITORY-GATE FAILURE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- artifacts: PASS (exit 0; NONE; run 9166a436-0cda-494d-bf65-920e1186b65b)
- check: MISSING (FRAMEWORK FAILURE)

## Artifacts

- main.js: 902987 bytes; SHA-256 e6bd40f9f780c3940de61669309b2c54732a1968d20739ecfefc1f0a710ec19e

Final verdict: BLOCKED
Failure classification: REPOSITORY-GATE FAILURE

## Core-runner provenance

- Source branch: bvp-s09a-request-attribution-01
- Source build HEAD requested: 278f3e3c2ca2d837b862b3c49125e3265dfd5984
- Verification checkout HEAD: 278f3e3c2ca2d837b862b3c49125e3265dfd5984
- Evidence publication target: origin/bvp-s09a-request-attribution-01
