# Phase 6 Real-Platform Validation Release Evidence

- Agent: `agt-ca-p6-real-platform-release-01`
- `RELEASE_INPUT_SHA`: `8f0dce8f4ce30fb8a20c47f70b995783c6b967cb`
- `H_FINAL_SOURCE_TEST_SHA`: `cb0c81b2ddb941446f821d71274aa58af28007ec`
- `H_FINAL_CLOSURE_SHA`: `669e01273acc55def047da4b9d9a0532726d68c0`
- Release branch: `phase6-real-platform-release-0.1.8`
- `RELEASE_0_1_8_PREP_SHA`: `371b18f5574ef4ed56cd5f22c4a2cea26fae8c95`
- Frozen `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3` — PASS

## Version-Metadata Change Manifest

The release-preparation commit changed only:

- `manifest.json` — `version` from `0.1.7` to `0.1.8`
- `package.json` — `version` from `0.1.7` to `0.1.8`
- `package-lock.json` — top-level `version` and `packages[""] .version` from `0.1.7` to `0.1.8`

No production source, tests, contracts, scripts, OAuth callback files, or product behavior changed.

## Clean Verification

The exact release-preparation commit was checked out cleanly and verified with:

- `npm ci` — PASS, exit 0
- `npm run typecheck` — PASS, exit 0
- `npx tsc -p tsconfig.test.json` — PASS, exit 0
- `npm test` — PASS: 687 tests / 687 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo
- `npm run build` — PASS, exit 0
- `npm run check` — PASS, exit 0
- `git diff --check 8f0dce8f4ce30fb8a20c47f70b995783c6b967cb...371b18f5574ef4ed56cd5f22c4a2cea26fae8c95` — PASS

Build/package verification from the exact preparation commit:

- entrypoint verifier — PASS
- syntax verifier — PASS
- local-runtime dependency verifier — PASS
- mobile evaluation verifier — PASS
- package-shape verifier — PASS
- `main.js` exists and is non-empty — PASS
- `manifest.json` parses as valid JSON with version `0.1.8` and plugin ID `brain-google-drive-sync` — PASS

The exact preparation commit was rebuilt again during post-publish closure, and the downloaded GitHub release assets matched that clean rebuild byte-for-byte.

## Release Asset Identity

### `main.js`

- Asset ID: `548067614`
- Size: `699431` bytes
- Independently computed SHA-256: `da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`
- GitHub digest: `sha256:da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`

### `manifest.json`

- Asset ID: `548067617`
- Size: `275` bytes
- Independently computed SHA-256: `f5860b515a5f8a6fa195d81e5f9741e6e6b5ac81b29401e64ad171275eeda477`
- GitHub digest: `sha256:f5860b515a5f8a6fa195d81e5f9741e6e6b5ac81b29401e64ad171275eeda477`

Independent post-publish download verification confirmed:

- downloaded `main.js` hash matches the exact clean-build artifact;
- downloaded `manifest.json` hash matches the exact clean-build artifact;
- downloaded `manifest.json` reports version `0.1.8`;
- downloaded `manifest.json` reports plugin ID `brain-google-drive-sync`.

## GitHub Prerelease

- Tag: `0.1.8`
- Tag target: `371b18f5574ef4ed56cd5f22c4a2cea26fae8c95`
- Release ID: `383806642`
- Release URL: https://github.com/woodpk/gdrive-sync-obsidian-plugin/releases/tag/0.1.8
- Title: `0.1.8 — Phase 6 H-FINAL Physical Validation Build`
- `prerelease=true`
- `draft=false`
- Required install assets present: `main.js`, `manifest.json`

The tag remains on the exact verified release-preparation commit. It is not moved to this later evidence commit.

## Scope and Safety Confirmation

- No `src/**` file changed relative to the authorized release input.
- No `test/**` file changed relative to the authorized release input.
- No `src/contracts/**` file changed, and the frozen contracts tree remains exact.
- No `scripts/**` file changed relative to the authorized release input.
- No product behavior changed.
- `phase6-integration` was not modified by this release operation.
- `master` was not modified by this release operation.
- Stage 3 was not started.
- Physical Windows/iPhone Google Drive synchronization validation remains pending and was not started.

## Cloud Verification Runs

- Initial gated build/publish run: GitHub Actions run `34078499227`; all pre-publish clean verification gates passed before tag/release creation.
- Independent post-publish rebuild/download verification run: GitHub Actions run `34078857654`; exact preparation rebuild and published-asset identity verification passed. The run's later evidence-branch plumbing was superseded by this direct evidence commit and is not part of the final release branch history.
