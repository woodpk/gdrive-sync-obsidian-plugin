# BRAIN 0.1.19 — Release-candidate metadata and packaging

**Feature:** WS-05/R019 (bounded release-candidate identity correction)
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Candidate source:** `2bf51ca15aec9c752e3ac7769fcf3ac237df99df`
**Source baseline:** `fc926297b40fd4cd53fad8bfaf21380c55058bc3`
**Owner intent:** advance the stale GitHub prerelease/version identity and provide an accurately versioned desktop package; distinguish shipping from validation-only artifacts.

## Scope and expected behavior

1. Advance `manifest.json`, `package.json`, root `package-lock.json` (both root version fields), and `versions.json` consistently from 0.1.18 to **0.1.19**. Preserve Obsidian `minAppVersion: 1.11.4`.
2. No product synchronization, Google OAuth, storage, PHX-CI framework, BVP scenario or production TypeScript logic changes. The prior installed 0.1.18-labeled validation artifact is not a release asset.
3. A **production** release package consists of source-built `main.js` and corresponding `manifest.json` from the same qualified source. Reject any test-platform nonshipping marker, unverified or mismatched bytes, stale version metadata, or an artifact whose provenance differs from the approved source.
4. Preserve historical `0.1.18` release/tag/assets. Proposed release type for `0.1.19` is **prerelease**, consistent with project history, not an assertion of physical S09/Stage 3 completion.
5. Keep Windows BVP validation artifact distinct from production shipping bytes. Upgrading its displayed version requires a **separately built and checked** matching 0.1.19 validation artifact; do not replace its `main.js` with shipping `main.js`.
6. Do not change vault `data.json`, pairing, IndexedDB/SecretStorage, managed Drive root, sync settings, or real personal vault content during release packaging.

## Qualification and acceptance

- PHX-CI remains the only executable software-verification authority, with exact source, pinned runtime, all normal qualification stages, full/focused tests and original immutable evidence. Historical release hash allowlist is **not** to be silently rebaselined.
- Builder must demonstrate consistency of all four version metadata surfaces, production entrypoint/build shape, production-vs-validation separation, exact hashes of `main.js` and `manifest.json`, and safe failure on mismatched input.
- Test-family adequacy: version-only metadata does not introduce new executable sync semantics; existing PHX-CI regression and build guards remain required. Validate compatibility, identity, provenance, release shape, safety and mismatches explicitly. Runtime-specific concurrency, state migration, conflict, restart, Drive mutations and retry behavior are unchanged and remain covered by existing product/BVP suites; record specific NMA determination in final review.
- After qualification, independent Reviewer must first perform blind source/requirements assessment, freeze/publish it, then inspect authored tests, original PHX-CI evidence, and candidate identity, and publish final acceptance.
- **No GitHub release creation, tag creation, production deployment, data sync, or exact shipping digest promotion until Reviewer acceptance and separate Owner approval of the exact shipping artifacts.** A PHX-CI development artifact hash is observation, not authorization.
- On approval, publish approved bytes only, as `0.1.19` GitHub prerelease with `main.js`, `manifest.json`, and SHA-256 manifest; verify published downloaded bytes and source identity. No GitHub Actions.

**Current disposition:** Metadata candidate is prepared; shipping release publication remains gated independently of BRAIN physical S09.
