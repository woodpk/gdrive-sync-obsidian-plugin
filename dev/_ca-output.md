STATUS: COMPLETE

# phx-ci evidence - gdrive-sync-obsidian-plugin

## Verification summary

- Change-set verification: PASS
- Repository verification: PASS
- Overall verification: PASS

- Framework version: 0.2.0-dev.2
- Run ID: 4323c021-1c8f-4c35-a3e3-79148d5f39c2
- Repository: C:/temp/35f55d92e66b43cdac889a5b0aad784d/phx-e98e0a9787ac47ce/w
- Branch:
- Verified HEAD: 51d75e63eac1f3a37ef998cf599f039dce7feb2f
- Verified tree: 3c362f4ef9cae621415deedf892f83bace20a574
- Expected HEAD: 51d75e63eac1f3a37ef998cf599f039dce7feb2f
- Base SHA: 684675e079d4cc9199f83d6c60b900a0f033153d
- Task version: 3.53.1
- OS: Microsoft Windows NT 10.0.26200.0
- PowerShell: 7.6.6
- git: git version 2.52.0.windows.1
- node: v22.23.2
- npm: 10.9.8
- nodeExecutable: C:\Program Files\nodejs\node.exe
- npmExecutable: C:\Program Files\nodejs\npm.cmd
- Started: 2026-10-21T16:00:14.6054379Z
- Ended: 2026-10-21T16:03:17.6950337Z

## Ordered stages

- preflight: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- node-preflight: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- node-project-files: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- install: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- typecheck: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- test-focused: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- test: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- build: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- repository-check: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- check: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)
- artifacts: PASS (exit 0; NONE; run 4323c021-1c8f-4c35-a3e3-79148d5f39c2)

## Artifacts

- main.js: 922631 bytes; SHA-256 6bb0012cb21a244a2f53a44b7bdcf3203b6284070bb3b725d7b32d919c2b881d

Final verdict: COMPLETE

## BRAIN BVP 0.1.20-bvp.2 release-operator record

- Status: NOT_PUBLISHED_BLOCKED
- Accepted source SHA: b1ef092cf5ce73c7811b5726ee803add2538df2c
- Accepted source tree: b353df77de37e9c4a1c12a71ef2aac4b9fb4d109
- Operator branch: release/bvp-0.1.20-bvp.2-publication-20261116
- GitHub release: NOT CONFIRMED
- New PHX-CI run: NONE; no software-validation result claimed
- Physical devices, OAuth, Drive, sync and vault installation: NOT TOUCHED
- Local staging/evidence location: C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112
- Publication attempt: False
- Postpublication byte readback: False
- Blocker: install locked packaging dependencies failed (exit 1); full output preserved in release evidence.

~~~~text
RELEASE: 0.1.20-bvp.2
ACCEPTED SOURCE: b1ef092cf5ce73c7811b5726ee803add2538df2c
LOCAL EVIDENCE: C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112
COMMAND [repository root]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 rev-parse --show-toplevel
EXIT [repository root]: 0
OUTPUT [repository root]:
C:/Users/woodpk/AppData/Local/Temp/brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3
Origin URL identity inspected without recording its potentially sensitive value.
COMMAND [operator checkout cleanliness]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 status --porcelain=v1 --untracked-files=all
EXIT [operator checkout cleanliness]: 0
OUTPUT [operator checkout cleanliness]:

COMMAND [operator branch name]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 branch --show-current
EXIT [operator branch name]: 0
OUTPUT [operator branch name]:
release/bvp-0.1.20-bvp.2-publication-20261116
COMMAND [remote operator SHA]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 rev-parse origin/release/bvp-0.1.20-bvp.2-publication-20261116
EXIT [remote operator SHA]: 0
OUTPUT [remote operator SHA]:
c50b58f0cf8bdf1b0ff52807c265ec45b8c8c7bf
COMMAND [local operator SHA]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 rev-parse HEAD
EXIT [local operator SHA]: 0
OUTPUT [local operator SHA]:
c50b58f0cf8bdf1b0ff52807c265ec45b8c8c7bf
COMMAND [preexisting release tag]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 ls-remote --tags origin refs/tags/0.1.20-bvp.2
EXIT [preexisting release tag]: 0
OUTPUT [preexisting release tag]:

COMMAND [fetch accepted source]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 fetch --no-tags origin feature/bvp-drivefile-cross-client-readonly-20261115
EXIT [fetch accepted source]: 0
OUTPUT [fetch accepted source]:
From https://github.com/woodpk/gdrive-sync-obsidian-plugin
 * branch              feature/bvp-drivefile-cross-client-readonly-20261115 -> FETCH_HEAD
COMMAND [accepted source tree]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 rev-parse b1ef092cf5ce73c7811b5726ee803add2538df2c^{tree}
EXIT [accepted source tree]: 0
OUTPUT [accepted source tree]:
b353df77de37e9c4a1c12a71ef2aac4b9fb4d109
COMMAND [create isolated source worktree]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 worktree add --detach C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source b1ef092cf5ce73c7811b5726ee803add2538df2c
EXIT [create isolated source worktree]: 0
OUTPUT [create isolated source worktree]:
Preparing worktree (detached HEAD b1ef092c)
Updating files:  42% (836/1988)
Updating files:  43% (855/1988)
Updating files:  44% (875/1988)
Updating files:  45% (895/1988)
Updating files:  46% (915/1988)
Updating files:  47% (935/1988)
Updating files:  48% (955/1988)
Updating files:  49% (975/1988)
Updating files:  50% (994/1988)
Updating files:  51% (1014/1988)
Updating files:  52% (1034/1988)
Updating files:  53% (1054/1988)
Updating files:  54% (1074/1988)
Updating files:  55% (1094/1988)
Updating files:  56% (1114/1988)
Updating files:  57% (1134/1988)
Updating files:  58% (1154/1988)
Updating files:  59% (1173/1988)
Updating files:  59% (1181/1988)
Updating files:  60% (1193/1988)
Updating files:  61% (1213/1988)
Updating files:  62% (1233/1988)
Updating files:  63% (1253/1988)
Updating files:  64% (1273/1988)
Updating files:  65% (1293/1988)
Updating files:  66% (1313/1988)
Updating files:  67% (1332/1988)
Updating files:  68% (1352/1988)
Updating files:  69% (1372/1988)
Updating files:  70% (1392/1988)
Updating files:  71% (1412/1988)
Updating files:  72% (1432/1988)
Updating files:  73% (1452/1988)
Updating files:  74% (1472/1988)
Updating files:  75% (1491/1988)
Updating files:  76% (1511/1988)
Updating files:  77% (1531/1988)
Updating files:  78% (1551/1988)
Updating files:  79% (1571/1988)
Updating files:  80% (1591/1988)
Updating files:  81% (1611/1988)
Updating files:  82% (1631/1988)
Updating files:  83% (1651/1988)
Updating files:  84% (1670/1988)
Updating files:  85% (1690/1988)
Updating files:  86% (1710/1988)
Updating files:  87% (1730/1988)
Updating files:  88% (1750/1988)
Updating files:  89% (1770/1988)
Updating files:  90% (1790/1988)
Updating files:  91% (1810/1988)
Updating files:  92% (1829/1988)
Updating files:  93% (1849/1988)
Updating files:  94% (1869/1988)
Updating files:  95% (1889/1988)
Updating files:  96% (1909/1988)
Updating files:  97% (1929/1988)
Updating files:  98% (1949/1988)
Updating files:  99% (1969/1988)
Updating files: 100% (1988/1988)
Updating files: 100% (1988/1988), done.
HEAD is now at b1ef092c docs(dec360): record authorized guard repair, adversarial tests and pending exact-source PHX-CI
COMMAND [isolated source HEAD]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source rev-parse HEAD
EXIT [isolated source HEAD]: 0
OUTPUT [isolated source HEAD]:
b1ef092cf5ce73c7811b5726ee803add2538df2c
COMMAND [isolated source cleanliness]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source status --porcelain=v1 --untracked-files=all
EXIT [isolated source cleanliness]: 0
OUTPUT [isolated source cleanliness]:

Building release assets from exact accepted source; no tests or PHX-CI are being run.
COMMAND [install locked packaging dependencies]: npm.cmd ci --no-audit --no-fund
EXIT [install locked packaging dependencies]: 1
OUTPUT [install locked packaging dependencies]:
npm warn cleanup Failed to remove some directories [
npm warn cleanup   [
npm warn cleanup     '\\\\?\\C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@esbuild',
npm warn cleanup     [Error: EPERM: operation not permitted, rmdir 'C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source\node_modules\@esbuild'] {
npm warn cleanup       errno: -4048,
npm warn cleanup       code: 'EPERM',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: 'C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@esbuild'
npm warn cleanup     }
npm warn cleanup   ],
npm warn cleanup   [
npm warn cleanup     '\\\\?\\C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@codemirror',
npm warn cleanup     [Error: EPERM: operation not permitted, rmdir 'C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source\node_modules\@codemirror\state\dist'] {
npm warn cleanup       errno: -4048,
npm warn cleanup       code: 'EPERM',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: 'C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@codemirror\\state\\dist'
npm warn cleanup     }
npm warn cleanup   ],
npm warn cleanup   [
npm warn cleanup     '\\\\?\\C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules',
npm warn cleanup     [Error: EPERM: operation not permitted, rmdir 'C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source\node_modules\typescript\lib\zh-cn'] {
npm warn cleanup       errno: -4048,
npm warn cleanup       code: 'EPERM',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: 'C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\typescript\\lib\\zh-cn'
npm warn cleanup     }
npm warn cleanup   ],
npm warn cleanup   [
npm warn cleanup     '\\\\?\\C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@marijn',
npm warn cleanup     [Error: EPERM: operation not permitted, rmdir 'C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source\node_modules\@marijn\find-cluster-break'] {
npm warn cleanup       errno: -4048,
npm warn cleanup       code: 'EPERM',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: 'C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@marijn\\find-cluster-break'
npm warn cleanup     }
npm warn cleanup   ],
npm warn cleanup   [
npm warn cleanup     '\\\\?\\C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\moment',
npm warn cleanup     [Error: EPERM: operation not permitted, rmdir 'C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source\node_modules\moment\src\lib'] {
npm warn cleanup       errno: -4048,
npm warn cleanup       code: 'EPERM',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: 'C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\moment\\src\\lib'
npm warn cleanup     }
npm warn cleanup   ],
npm warn cleanup   [
npm warn cleanup     '\\\\?\\C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@types',
npm warn cleanup     [Error: EPERM: operation not permitted, rmdir 'C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source\node_modules\@types\codemirror'] {
npm warn cleanup       errno: -4048,
npm warn cleanup       code: 'EPERM',
npm warn cleanup       syscall: 'rmdir',
npm warn cleanup       path: 'C:\\Users\\woodpk\\AppData\\Local\\Temp\\brain-bvp-release-52823a56e789489082014c5617eca112\\accepted-source\\node_modules\\@types\\codemirror'
npm warn cleanup     }
npm warn cleanup   ]
npm warn cleanup ]
npm error code 1
npm error path C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source\node_modules\esbuild
npm error command failed
npm error command C:\WINDOWS\system32\cmd.exe /d /s /c node install.js
npm error 'node' is not recognized as an internal or external command,
npm error operable program or batch file.
npm error A complete log of this run can be found in: C:\Users\woodpk\AppData\Local\npm-cache\_logs\2026-11-16T18_51_37_107Z-debug-0.log
RELEASE BLOCKER: install locked packaging dependencies failed (exit 1); full output preserved in release evidence.
COMMAND [remove isolated build worktree]: git.exe -C C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-bootstrap-62336f8a1fa1436ea6b72abf69e2ecc3 worktree remove --force C:\Users\woodpk\AppData\Local\Temp\brain-bvp-release-52823a56e789489082014c5617eca112\accepted-source
EXIT [remove isolated build worktree]: 0
OUTPUT [remove isolated build worktree]:

~~~~
