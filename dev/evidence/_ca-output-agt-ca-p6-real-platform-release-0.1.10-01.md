# Phase 6 A03 Repair Prerelease 0.1.10 Evidence

- Agent: `agt-ca-p6-real-platform-release-0.1.10-01`
- RELEASE_INPUT_SHA: `05a99001607f48896062d0aac6ee507fc892691a`
- APPROVED_C1_R1_SHA: `145ff6898225c5737fea7dfbab2b79dc4ae7b02f`
- Release branch: `phase6-real-platform-release-0.1.10`
- Observed pre-release versions: manifest/package/package-lock top/root = `0.1.9`
- Version change: `0.1.9 -> 0.1.10` in `manifest.json`, `package.json`, and package-lock top/root only.
- RELEASE_0_1_10_PREP_SHA: `d5a84fdeb1a21d048c9b5db8196e87b59a03f06f`

## Verification

- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- `npm test`: PASS — 727 tests, # fail 0, zero not ok
- Focused C1 suite: PASS — 16 tests, # fail 0, zero not ok
- `npm run build`: PASS
- `npm run check`: PASS — embedded 727 tests, # fail 0, zero not ok
- `git diff --check RELEASE_INPUT_SHA...RELEASE_0_1_10_PREP_SHA`: PASS
- Release-preparation changed files: `manifest.json`, `package.json`, `package-lock.json` only

## Release artifacts

- `main.js`: size 733916 bytes; SHA-256 `f5ed8bf4eaaed81502fca50845fb5ed66234655389b0896d19d4d7edda2eefa4`; asset ID `551003106`; GitHub digest `sha256:f5ed8bf4eaaed81502fca50845fb5ed66234655389b0896d19d4d7edda2eefa4`
- `manifest.json`: size 276 bytes; SHA-256 `f26b3aa7da26fcbaf0f2cc067c2fb89be50e4f97f5de8a01cbc08214986a42fd`; asset ID `551003108`; GitHub digest `sha256:f26b3aa7da26fcbaf0f2cc067c2fb89be50e4f97f5de8a01cbc08214986a42fd`

## Publication

- Tag: `0.1.10` -> `d5a84fdeb1a21d048c9b5db8196e87b59a03f06f`
- Release URL: https://github.com/woodpk/gdrive-sync-obsidian-plugin/releases/tag/0.1.10
- Release ID: `384947601`
- `prerelease=true`
- `draft=false`
- Published assets independently downloaded and matched local sizes/SHA-256 values.
- Existing `0.1.9` tag/release verified unchanged.
- `phase6-integration` remained at `b042227329d76153f36d3dcc789851c04790c34f` during release execution.

## Scope confirmations

- No `src/**`, `test/**`, contract, script, workflow, or product-behavior changes occurred in release preparation.
- No plugin installation or live synchronization occurred.
- A03 was not resumed.
- B–O were not begun.
- Stage 3 was not begun and remains unauthorized.
