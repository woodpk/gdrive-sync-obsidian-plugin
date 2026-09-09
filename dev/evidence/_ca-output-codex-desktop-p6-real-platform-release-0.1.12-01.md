# Phase 6 prerelease 0.1.12 publication evidence

- Release input: `c422f17630158edc44d0f1e0e44896201419ac39`
- Release-prep SHA: `97b0c69672a912f2cd4da92ea890dc53b464179e`
- Release branch: `phase6-real-platform-release-0.1.12`
- Tag: `0.1.12`
- Verified tag target: `97b0c69672a912f2cd4da92ea890dc53b464179e`
- GitHub release ID: `385665782` (`RE_kwDOUBoUmc4W_Mr2`)
- Release state: prerelease `true`; draft `false`

## Qualification and build

- Approved clean Linux verification: full suite 732/732 PASS; focused A03 suite 21/21 PASS; B01 predecessor/update/recovery regressions PASS; build/check/typecheck PASS.
- Windows release-prep verification: 729/732, with exactly the three qualified environment-only failures (two drive-qualified-vs-root-relative path assertions and one `core.autocrlf=true` LF/CRLF immutable-prefix assertion). No product or test changes were made for them.
- `git diff --check`: PASS.
- `npm run build`: PASS, including all build/package verifiers.
- Packaging diff from input to prep SHA: version-only changes in `manifest.json`, `package.json`, and `package-lock.json`.

## Published assets and read-back

- `main.js`: 740540 bytes; SHA-256 `f648f0534dcfdc55b53465c7fe9b841e8050e39b9c68009f6f9750d84f435ba3`
- `manifest.json`: 284 bytes; SHA-256 `6a579b8d0f2a6d141220770bccf0b35880a4a71342946cf78302204efcaecabe`; version `0.1.12`
- Exactly these two assets were independently downloaded from the published GitHub prerelease. Their sizes and SHA-256 hashes matched the locally verified release artifacts.

No product source or tests were changed. No live Drive remediation was performed. The plugin was not installed. B01 was not rerun. B02-O, iPhone/iOS validation, and Stage 3 were not started. PR #59 was untouched.
