# PHASE 6 REAL-PLATFORM VALIDATION RELEASE — CLOUD ACTOR TASK

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`agt-ca-p6-real-platform-release-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Your assignment is to create the next GitHub prerelease used for Phase 6 real Windows/iPhone validation.

This is a **release-packaging task**, not a product-development task.

Do not redesign synchronization behavior.
Do not modify production source or tests.
Do not begin physical synchronization testing.
Do not begin Stage 3.

---

## 1. AUTHORITATIVE INPUT

Use exactly:

`RELEASE_INPUT_SHA = 8f0dce8f4ce30fb8a20c47f70b995783c6b967cb`

This commit is the current `phase6-integration` state immediately after the H-FINAL exact-SHA promotion and the authoritative project-state refresh.

The frozen final H source/test candidate is:

`H_FINAL_SOURCE_TEST_SHA = cb0c81b2ddb941446f821d71274aa58af28007ec`

The approved/promoted H-FINAL closure is:

`H_FINAL_CLOSURE_SHA = 669e01273acc55def047da4b9d9a0532726d68c0`

Frozen `src/contracts/**` tree:

`0db68ced179825f929008b502335210260ca2ce3`

The final automated H-FINAL proof established:

- complete repository tests: `687 / 687 PASS`;
- H/V1.3 critical: `82 / 82 PASS`;
- G adversarial: `56 / 56 PASS`;
- V1.3 foundation: `17 / 17 PASS`;
- typecheck: PASS;
- test TypeScript compilation: PASS;
- production build: PASS;
- repository check: PASS;
- entrypoint/syntax/local-runtime/mobile-evaluation/package-shape verifiers: PASS.

The H-FINAL production artifact before release-version metadata changes was:

- `main.js` size: `699431` bytes;
- SHA-256: `da4fbe6cb3dc704b48cba3a1d37245aca0f32a3fba9c5970ae7aab4c9ddf9482`.

This pre-release artifact identity is historical comparison evidence only; the `0.1.8` build must be hashed independently after release metadata is updated.

---

## 2. RELEASE IDENTITY

Current published prerelease:

`0.1.7`

Current repository version metadata at `RELEASE_INPUT_SHA`:

- `manifest.json`: `0.1.7`;
- `package.json`: `0.1.7`;
- `package-lock.json`: root/package version `0.1.7`.

Create the next prerelease as:

`0.1.8`

Required release title:

`0.1.8 — Phase 6 H-FINAL Physical Validation Build`

Required release classification:

- GitHub Release: published;
- `prerelease = true`;
- `draft = false`.

This is intentionally **not** a stable/final product release because physical Windows/iPhone validation and Stage 3 remain pending.

---

## 3. ENTRY / DRIFT GATE

Before making any change:

1. verify commit `8f0dce8f4ce30fb8a20c47f70b995783c6b967cb` exists;
2. create a dedicated release branch from that exact SHA, not from a later moving branch tip;
3. recommended branch name:
   `phase6-real-platform-release-0.1.8`;
4. verify tag `0.1.8` does not already exist;
5. verify no GitHub release for tag `0.1.8` already exists;
6. verify `manifest.json`, `package.json`, and the root package entries in `package-lock.json` are all `0.1.7` before modification;
7. verify `src/**`, `test/**`, and `scripts/**` have no substantive difference from the frozen H-FINAL source/test candidate that would indicate post-H-FINAL product drift;
8. verify `src/contracts/**` still resolves to tree `0db68ced179825f929008b502335210260ca2ce3`.

If any release/tag collision, unexplained product drift, or frozen-contract mismatch exists, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not overwrite an existing release or tag.
Do not force-move a tag.

---

## 4. AUTHORIZED WRITABLE SURFACE

The release-preparation implementation commit may modify only the version metadata mechanically required for `0.1.8`:

- `manifest.json`;
- `package.json`;
- `package-lock.json`.

Do not modify:

- `src/**`;
- `test/**`;
- `src/contracts/**`;
- `scripts/**`;
- `oauth-callback/**`;
- `versions.json` unless an existing repository verification command proves it must change for this private prerelease;
- `dev/planning-and-building/**`;
- canonical `dev/evidence/_ca-output.md`;
- any prior agent evidence;
- `master` or any other protected/integration branch.

If `versions.json` is not required by an existing check, leave it unchanged; historical alpha releases have not used it as the per-prerelease version ledger.

No production behavior change is authorized.

---

## 5. REQUIRED RELEASE-PREPARATION CHANGE

Update the release version from `0.1.7` to `0.1.8` consistently in:

- `manifest.json` → `version`;
- `package.json` → `version`;
- `package-lock.json` → top-level `version` and root package `packages[""] .version`.

Preserve all other metadata unless a purely mechanical package-manager update is required to keep the lock file internally consistent.

The release manifest must still contain:

- `id = "brain-google-drive-sync"`;
- `name = "BRAIN Google Drive Sync"`;
- `version = "0.1.8"`;
- `minAppVersion = "1.11.4"`;
- `isDesktopOnly = false`.

Commit this bounded version-only preparation.

Record the resulting exact commit as:

`RELEASE_0_1_8_PREP_SHA`

---

## 6. CLEAN BUILD / VERIFICATION

From a clean checkout of `RELEASE_0_1_8_PREP_SHA`, run the strongest repository verification available, at minimum:

1. `npm ci`
2. `npm run typecheck`
3. `npx tsc -p tsconfig.test.json`
4. `npm test`
5. `npm run build`
6. `npm run check`
7. `git diff --check RELEASE_INPUT_SHA...RELEASE_0_1_8_PREP_SHA`

Required results:

- all commands exit `0`;
- the complete repository suite remains `687 / 687 PASS` unless the repository test count has changed only because of separately authorized non-product tasking files, in which case explain the exact reason rather than silently accepting a different product test surface;
- all repository build/package/mobile verifiers pass;
- `main.js` exists and is non-empty;
- `manifest.json` is valid JSON and reports version `0.1.8`;
- no source/test/contract file changed relative to the authorized release input.

Compute and record for the exact release assets:

- `main.js` byte size;
- `main.js` SHA-256;
- `manifest.json` byte size;
- `manifest.json` SHA-256.

Do not use an older `main.js` from another branch or release.
The release `main.js` must be the artifact produced from the exact `0.1.8` release-preparation commit.

---

## 7. TAG AND GITHUB PRERELEASE

Only after the clean verification above succeeds:

1. create immutable tag:
   `0.1.8`
   pointing exactly to `RELEASE_0_1_8_PREP_SHA`;
2. push the dedicated release branch and tag;
3. create the GitHub prerelease for tag `0.1.8`;
4. publish exactly these required install assets:
   - `main.js`
   - `manifest.json`
5. do not publish stale assets from `0.1.7`;
6. do not substitute source archives for the required install assets.

If the build actually produces an intentionally supported `styles.css`, do not add it unless repository/release precedent or current product packaging specifically requires it. The current established release pattern is `main.js` + `manifest.json`.

Required release body, semantically:

```markdown
Phase 6 prerelease for controlled real Windows/iPhone validation of the independently approved H-FINAL synchronization candidate.

The H-FINAL automated gate is green: 687/687 repository tests plus all H/V1.3, G adversarial, foundation, typecheck, build, repository-check, and mobile/package verification gates passed before this release.

This release is for physical platform validation. Real Windows/iPhone Google Drive synchronization validation remains to be completed. Phase 6 is not yet complete and Stage 3 has not begun.
```

Do not describe physical-device validation as already passed.
Do not call this a stable production release.

---

## 8. POST-PUBLISH VERIFICATION

After publishing, independently verify through GitHub metadata that:

- tag `0.1.8` exists;
- the tag resolves exactly to `RELEASE_0_1_8_PREP_SHA`;
- the release is published, non-draft, and marked prerelease;
- release title is exactly:
  `0.1.8 — Phase 6 H-FINAL Physical Validation Build`;
- the release contains `main.js` and `manifest.json`;
- each asset size matches the locally built artifact;
- each GitHub-reported asset digest, when GitHub provides one, matches the independently computed SHA-256;
- downloaded `manifest.json` reports version `0.1.8` and plugin ID `brain-google-drive-sync`;
- downloaded `main.js` hash matches the built/released artifact;
- no branch other than the dedicated release branch was modified;
- no source/test/contract file was modified;
- no physical synchronization test was started.

---

## 9. RELEASE EVIDENCE

Create one dedicated evidence file on the release branch:

`dev/evidence/_ca-output-agt-ca-p6-real-platform-release-01.md`

Record:

- agent identity;
- `RELEASE_INPUT_SHA`;
- `H_FINAL_SOURCE_TEST_SHA`;
- release branch;
- version-metadata change manifest;
- `RELEASE_0_1_8_PREP_SHA`;
- exact verification commands/results;
- complete test totals;
- build/package verifier results;
- release asset sizes and SHA-256 values;
- tag identity;
- release URL/release ID;
- release asset IDs/names/sizes/digests;
- confirmation `prerelease=true`, `draft=false`;
- confirmation no `src/**`, `test/**`, contracts, or product behavior changed;
- confirmation `phase6-integration`, `master`, and Stage 3 were not modified/started;
- confirmation physical validation remains pending.

Commit only that evidence file after the release has been verified.

Record the final evidence-bearing release branch head as:

`RELEASE_0_1_8_EVIDENCE_SHA`

Do not move tag `0.1.8` to the later evidence commit. The tag must remain on the exact verified release-preparation commit whose assets were built.

---

## 10. COMPLETION RESPONSE

Return:

- `RELEASE_0_1_8_PREP_SHA`;
- `RELEASE_0_1_8_EVIDENCE_SHA`;
- release branch;
- tag target SHA;
- release URL and release ID;
- `main.js` asset ID / size / SHA-256 / GitHub digest;
- `manifest.json` asset ID / size / SHA-256 / GitHub digest;
- exact test totals;
- typecheck / test compilation / build / check results;
- exact changed-file manifest;
- confirmation no production source/test/contract changes occurred;
- confirmation physical validation and Stage 3 remain pending;
- any blocker.

End exactly:

`0.1.8 PHASE 6 PHYSICAL-VALIDATION PRERELEASE COMPLETE — READY FOR DESKTOP/IPHONE INSTALLATION — PHYSICAL VALIDATION NOT YET STARTED`

---

## 11. STOP

Stop after the prerelease and release evidence are complete.

Do not update the user's installed Obsidian plugin.
Do not perform Windows/iPhone synchronization.
Do not begin performance optimization.
Do not begin Stage 3.
