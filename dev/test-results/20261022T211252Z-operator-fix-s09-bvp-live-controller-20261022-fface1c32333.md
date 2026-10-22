STATUS: BLOCKED

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: BLOCKED; REPOSITORY-GATE FAILURE; A required non-verification gate did not complete successfully.

- Framework version: 0.2.0-dev.2
- Run ID: e231a5b5-7a14-42e2-b8ae-766f062fac0c
- Repository: C:/temp/0ce1571ad4574ac596724d50369042b4/phx-5f05214455d14284/w
- Branch:
- Verified HEAD: fface1c3233312eb2356c9cebca7c2957e55918f
- Verified tree: 3fe7369e10d5962f0288ce13630c1fd0912df1c9
- Expected HEAD: fface1c3233312eb2356c9cebca7c2957e55918f
- Base SHA: 42460912847e363aa4fa11e23e0429944383889d
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-22T21:12:54.9321074Z
- Ended: 2026-10-22T21:15:06.5555883Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- node-preflight: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- node-project-files: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- install: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- typecheck: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- test-focused: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- test: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- build: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- repository-check: FAIL (exit 1; REPOSITORY-GATE FAILURE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- artifacts: PASS (exit 0; NONE; run e231a5b5-7a14-42e2-b8ae-766f062fac0c)
- check: MISSING (FRAMEWORK FAILURE)

## Artifacts

- main.js: 922631 bytes; SHA-256 6bb0012cb21a244a2f53a44b7bdcf3203b6284070bb3b725d7b32d919c2b881d

Final verdict: BLOCKED
Failure classification: REPOSITORY-GATE FAILURE

## Core-runner provenance

- Source branch: fix/s09-bvp-live-controller-20261022
- Source build HEAD requested: fface1c3233312eb2356c9cebca7c2957e55918f
- Verification checkout HEAD: fface1c3233312eb2356c9cebca7c2957e55918f
- Evidence publication target: origin/fix/s09-bvp-live-controller-20261022
