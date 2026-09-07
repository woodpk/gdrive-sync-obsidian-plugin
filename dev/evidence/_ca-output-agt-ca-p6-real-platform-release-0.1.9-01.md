# Phase 6 Pre-Live Repair Prerelease 0.1.9 Evidence

- Agent: `agt-ca-p6-real-platform-release-0.1.9-01`
- `RELEASE_INPUT_SHA`: `e7c6eebacbec1c882a25a18e4617e2d492e78188`
- `APPROVED_PRELIVE_REPAIR_SHA`: `5272532eabd5f48fd2a8225fa887e29610c63fde`
- Release branch: `phase6-real-platform-release-0.1.9`
- Observed pre-release metadata: manifest/package/lock/root package all `0.1.7`
- Version-change manifest: `manifest.json`, `package.json`, `package-lock.json` only
- `RELEASE_0_1_9_PREP_SHA`: `f0369d342a65294e8f4b14c44009b93f4157654a`

## Verification
- `npm ci`: PASS, exit 0
- `npm run typecheck`: PASS, exit 0
- `npx tsc -p tsconfig.test.json`: PASS, exit 0
- `npm test`: PASS — 711 tests / 711 pass / 0 fail; zero `not ok`
- `npm run build`: PASS, exit 0
- `npm run check`: PASS — embedded tests 711 / 711 pass / 0 fail; zero `not ok`
- `git diff --check e7c6eebacbec1c882a25a18e4617e2d492e78188...f0369d342a65294e8f4b14c44009b93f4157654a`: PASS
- `main.js`: non-empty and produced from exact prep commit
- `manifest.json`: version `0.1.9`, id `brain-google-drive-sync`

## Release assets
- `main.js`: asset ID `549344315`; size `722333` bytes; SHA-256 `9d45d5b3ba26218d3a47dae62ac2c0798133937197811cae185b0aee022128b2`; GitHub digest `sha256:9d45d5b3ba26218d3a47dae62ac2c0798133937197811cae185b0aee022128b2`
- `manifest.json`: asset ID `549344316`; size `275` bytes; SHA-256 `9cbccf935b8f9d5a637bbe900cfb01a9455ca1d8537fac007f1e76761d087f40`; GitHub digest `sha256:9cbccf935b8f9d5a637bbe900cfb01a9455ca1d8537fac007f1e76761d087f40`

## GitHub prerelease
- Tag `0.1.9` -> `f0369d342a65294e8f4b14c44009b93f4157654a`
- Release ID: `384305539`
- Release URL: https://github.com/woodpk/gdrive-sync-obsidian-plugin/releases/tag/0.1.9
- Title: `0.1.9 — Phase 6 Pre-Live Repair Physical Validation Build`
- `prerelease=true`
- `draft=false`
- Downloaded `main.js` and `manifest.json` matched exact built SHA-256 values.

## Scope and safety
- No `src/**`, `test/**`, `src/contracts/**`, `scripts/**`, `oauth-callback/**`, or workflow files changed in the release branch from input to prep.
- The prep commit changes only `manifest.json`, `package.json`, and `package-lock.json`.
- `phase6-integration` was not moved by this release task.
- Physical validation remains pending; A03 was not resumed.
- Stage 3 was not started.
