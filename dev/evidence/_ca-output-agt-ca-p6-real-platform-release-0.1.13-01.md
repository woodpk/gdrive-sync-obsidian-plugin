# Phase 6 prerelease 0.1.13 publication evidence

## Authority

- Agent: `agt-ca-p6-real-platform-release-0.1.13-01`
- Release input SHA: `4352f168bd3c4f948f7110fd8713a3f71df2b901`
- Release branch: `phase6-real-platform-release-0.1.13`
- Frozen release preparation SHA: `eced46abcafafffa658e49e69d3553fed65cdbff`
- Immutable tag: `0.1.13`
- Immutable tag target: `eced46abcafafffa658e49e69d3553fed65cdbff`
- Execution branch: `release-0.1.13-exec`
- Final publication workflow commit SHA: `66946c0aebe566032ebf6072775c5bf80138a256`
- Initial release-creation workflow commit SHA: `9b338064aea66f080323ab21bf7af4b99015c6b1`

## GitHub Actions publication

- Workflow: `One-shot prerelease 0.1.13 publication`
- Initial actual release-creation run ID: `34729404514`
- Initial actual release-creation run URL: https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/34729404514
- Initial release-creation run conclusion: `success`
- Final idempotent publication/verification run ID: `34729548466`
- Final idempotent publication/verification run URL: https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/34729548466
- Final run conclusion: `success`
- Runner: `ubuntu-24.04`
- GitHub Actions performed the actual tag/release publication using the repository token: `PASS`

## Verification

- Release authority/drift gate: `PASS`
- Typecheck: `PASS`
- Test TypeScript compilation: `PASS`
- Complete automated suite: `786/786 PASS`, `0 failures`
- Focused LOG-07 end-to-end observability verification: `9/9 PASS`, `0 failures`
- Production build: `PASS`
- Repository check: `PASS`
- `git diff --check`: `PASS`
- Frozen artifact identity gate: `PASS`
- Published-release download/rehash in GitHub Actions: `PASS`
- Independent rehash of the exported `gh release download` bytes after the terminal Actions run: `PASS`
- Downloaded manifest version: `0.1.13`
- Remote tag independently re-read after publication: `PASS`

## Release

- GitHub release database ID: `387752811`
- Release URL: https://github.com/woodpk/gdrive-sync-obsidian-plugin/releases/tag/0.1.13
- Title: `0.1.13 — Phase 6 Integrated Observability B01 Diagnostic Physical Validation Build`
- Tag name: `0.1.13`
- Draft: `false`
- Prerelease: `true`
- Release author: `github-actions[bot]`

## Published custom assets

### `main.js`

- GitHub asset ID: `560285556`
- Size: `853390` bytes
- SHA-256 / GitHub digest: `27e5f5a887309c2521f0a16f937076e13db90f11f0bd73bc64daf5f5f349c85c`
- Independent downloaded-byte rehash: `27e5f5a887309c2521f0a16f937076e13db90f11f0bd73bc64daf5f5f349c85c`
- Identity result: `PASS`

### `manifest.json`

- GitHub asset ID: `560285558`
- Size: `276` bytes
- SHA-256 / GitHub digest: `6db461da1efaaa47be0a6c98a979fb9d17c948978efc0b7e78db1dcb29ee6b0c`
- Independent downloaded-byte rehash: `6db461da1efaaa47be0a6c98a979fb9d17c948978efc0b7e78db1dcb29ee6b0c`
- Downloaded version: `0.1.13`
- Identity result: `PASS`

The final custom asset set is exactly `main.js` and `manifest.json`.

## Packaging boundaries

Release preparation changed exactly:

- `manifest.json`
- `package-lock.json`
- `package.json`

No production source or test source was changed by release preparation: `PASS`.

The execution branch contains publication-workflow-only task changes and was not merged into `phase6-integration`.

The release-only version metadata was not merged into `phase6-integration`.

## Physical-validation boundary

- Desktop installation performed: `NO`
- Live Google Drive synchronization performed: `NO`
- B01 physical validation performed/resumed: `NO`
- B01 remains blocked pending the separate desktop installation and installed-build identity gate.

The `0.1.13` tag remains on frozen `PREP_SHA` `eced46abcafafffa658e49e69d3553fed65cdbff`; this evidence commit must not and does not move the tag.
