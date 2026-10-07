# H-U4 Evidence Correction Closure — H-02

This file is the successor evidence closure for H-U4-C1 and H-U4-C2 only.

## Authority

- Predecessor H-U4 evidence head: `e3563949801d120ec401bdf71723a7c65a8a95c0`
- Frozen source/test authority: `84cae684607be10b57ec5569bab14a819bad822f`

## H-U4-C1 — Artifact Digest Correction

- Artifact: `9829465257`
- Superseded incorrect digest: `sha256:2b3fd9207d2476a50a9003bf8271e96a3b2c365e37170d86b421f3b51db00047`
- Corrected authoritative digest: `sha256:bddb1e0ae6f950f0db14fcc13b2db4621402b06844d9f54e0f636504c1c9b709`

The corrected authoritative digest above supersedes the previously recorded incorrect digest.

## H-U4-C2 — Actual Process Exit-Code Proof

- Disposable verification branch: `h-u4-c2-exit-proof-h02`
- Temporary workflow path: `.github/workflows/h-u4-c2-exit-proof.yml`
- GitHub Actions proof run ID: `33631714916`
- Tested SHA: `84cae684607be10b57ec5569bab14a819bad822f`
- Node version: `v22.23.2`
- npm version: `10.9.8`
- `npm ci`: SUCCESS (`added 16 packages`, `found 0 vulnerabilities`)
- Actual numeric `npm test` exit code: `1`
- Actual numeric `npm run check` exit code: `1`
- Reproduced TAP totals:
  - tests: `656`
  - pass: `584`
  - fail: `47`
  - cancelled: `25`
  - skipped: `0`
  - todo: `0`

The commands were not piped through `tee`. Their numeric process exit codes were captured immediately after direct execution.

The previously accepted 72-result H-U4 classification ledger was not modified or re-derived.

The successful proof run explicitly checked out the frozen source/test authority, verified `git rev-parse HEAD`, completed `npm ci`, directly executed both npm commands, confirmed both exit statuses were nonzero, reproduced the accepted H-U4 TAP totals, and preserved the direct command logs in GitHub Actions artifact `9847069905` (`h-u4-c2-direct-exit-proof`).
