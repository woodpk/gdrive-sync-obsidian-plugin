# PHASE 6 PRE-LIVE REPAIR PRERELEASE 0.1.9 — CLOUD RELEASE TASK

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`agt-ca-p6-real-platform-release-0.1.9-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Your assignment is to construct, verify, tag, and publish the next GitHub prerelease used to resume controlled Phase 6 Windows/iPhone physical validation after the approved pre-live correctness/platform repair campaign.

This is a **release-packaging task**, not a product-development task.

Do not redesign synchronization behavior.
Do not modify production source or tests.
Do not install the plugin on any device.
Do not perform live synchronization.
Do not begin Stage 3.

---

## 1. AUTHORITATIVE RELEASE INPUT

Use exactly:

`RELEASE_INPUT_SHA = e7c6eebacbec1c882a25a18e4617e2d492e78188`

This is the promoted `phase6-integration` merge containing the independently reviewed WP1 correctness repairs and WP2 platform/runtime repairs while preserving integration-only tasking history.

Approved repair head incorporated by that merge:

`APPROVED_PRELIVE_REPAIR_SHA = 5272532eabd5f48fd2a8225fa887e29610c63fde`

The approved repair candidate established raw executable evidence of:

- complete repository tests: `711 / 711 PASS`;
- focused verification suite: `38 / 38 PASS`;
- raw `full-tests.tap`: `0 fail`, zero `not ok`;
- raw `check.log` embedded test run: `711 / 711 PASS`;
- typecheck: PASS;
- production build: PASS;
- repository check: PASS.

The integration merge differs from `APPROVED_PRELIVE_REPAIR_SHA` only by four `dev/agents/*.md` tasking documents. There is no `src/**`, `test/**`, workflow, package-script, build-script, or manifest difference between those two product trees.

Do not substitute a later `phase6-integration` branch tip for `RELEASE_INPUT_SHA`.

---

## 2. RELEASE IDENTITY

Latest published prerelease:

`0.1.8`

Create the next prerelease as:

`0.1.9`

Required release title:

`0.1.9 — Phase 6 Pre-Live Repair Physical Validation Build`

Required classification:

- GitHub Release: published;
- `prerelease = true`;
- `draft = false`.

This remains a controlled physical-validation build. It is not a stable/final production release. Phase 6 physical validation remains pending and Stage 3 has not begun.

### Repository metadata clarification

At `RELEASE_INPUT_SHA`, repository version metadata is expected to still report `0.1.7` because the prior `0.1.8` version bump was intentionally isolated to the historical 0.1.8 release branch and was not merged into `phase6-integration`.

Therefore a bounded direct metadata update:

`0.1.7 -> 0.1.9`

is expected and authorized for this release preparation.

Do **not** downgrade, recreate, overwrite, or move the existing `0.1.8` release/tag merely to make the repository metadata sequence appear contiguous.

---

## 3. ENTRY / DRIFT GATE

Before writing anything:

1. verify commit `e7c6eebacbec1c882a25a18e4617e2d492e78188` exists;
2. verify its first parent is the pre-promotion integration line and its second parent is the approved repair lineage containing `5272532eabd5f48fd2a8225fa887e29610c63fde`;
3. create a dedicated release branch from **exactly** `RELEASE_INPUT_SHA`;
4. recommended branch name:
   `phase6-real-platform-release-0.1.9`;
5. verify GitHub prerelease `0.1.8` exists and remains untouched;
6. verify tag `0.1.9` does not already exist;
7. verify no GitHub release for tag `0.1.9` already exists;
8. verify current repository metadata is internally consistent before modification and record the observed versions from:
   - `manifest.json`;
   - `package.json`;
   - top-level `package-lock.json` version;
   - `package-lock.json` root package version;
9. verify `manifest.json` still contains:
   - `id = "brain-google-drive-sync"`;
   - `name = "BRAIN Google Drive Sync"`;
   - `minAppVersion = "1.11.4"`;
   - `isDesktopOnly = false`;
10. verify there is no unexplained product drift relative to `RELEASE_INPUT_SHA` before release preparation.

If the exact input cannot be established, `0.1.9` collides with an existing tag/release, or unexplained product drift exists, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not force-move or overwrite a release/tag.

---

## 4. AUTHORIZED WRITABLE SURFACE

The release-preparation commit may modify only mechanically required release metadata:

- `manifest.json`;
- `package.json`;
- `package-lock.json`.

Do not modify:

- `src/**`;
- `test/**`;
- `src/contracts/**`;
- `scripts/**`;
- `oauth-callback/**`;
- `.github/workflows/**`;
- `dev/planning-and-building/**`;
- existing prior evidence files;
- `phase6-integration` directly;
- `master` directly.

`versions.json` must remain unchanged unless an existing repository verification command proves it is mechanically required for this private prerelease. Do not update it merely by convention.

After publishing, one dedicated evidence file under `dev/evidence/` is authorized on the release branch as described below.

No production behavior change is authorized.

---

## 5. REQUIRED VERSION PREPARATION

Set release metadata to `0.1.9` consistently in:

- `manifest.json` -> `version`;
- `package.json` -> `version`;
- `package-lock.json` -> top-level `version`;
- `package-lock.json` -> `packages[""].version`.

Preserve all other metadata unless a purely mechanical package-manager operation is required to keep the lockfile internally consistent.

Required release manifest identity after the update:

- `id = "brain-google-drive-sync"`;
- `name = "BRAIN Google Drive Sync"`;
- `version = "0.1.9"`;
- `minAppVersion = "1.11.4"`;
- `isDesktopOnly = false`.

Commit the bounded metadata-only change.

Record the exact commit as:

`RELEASE_0_1_9_PREP_SHA`

---

## 6. CLEAN BUILD / TRUE EXECUTABLE VERIFICATION

From a clean checkout of `RELEASE_0_1_9_PREP_SHA`, run at minimum:

1. `npm ci`
2. `npm run typecheck`
3. `npx tsc -p tsconfig.test.json`
4. `npm test`
5. `npm run build`
6. `npm run check`
7. `git diff --check RELEASE_INPUT_SHA...RELEASE_0_1_9_PREP_SHA`

All commands must exit `0`.

### Raw-test evidence requirement

The historical Phase 6 Actions workflow pipes some commands through `tee` without `pipefail`, so a green workflow badge alone is not accepted as proof.

If CI is used, inspect the raw test/check outputs directly.

Acceptance requires:

- complete test run: `# fail 0` and zero `not ok` entries;
- embedded `npm run check` test run: `# fail 0` and zero `not ok` entries;
- test count must be at least the currently approved `711` tests; if it differs, explain exactly why and prove no tests were silently skipped;
- typecheck PASS;
- test TypeScript compilation PASS;
- production build PASS;
- repository check PASS;
- `main.js` exists and is non-empty;
- `manifest.json` parses and reports `0.1.9`.

Verify the release-preparation diff contains no `src/**`, `test/**`, contract, script, or workflow change.

Compute and record for the exact release artifacts:

- `main.js` byte size;
- `main.js` SHA-256;
- `manifest.json` byte size;
- `manifest.json` SHA-256.

Do not reuse `main.js` or `manifest.json` from 0.1.8 or any other build.

---

## 7. TAG / GITHUB PRERELEASE

Only after clean verification succeeds:

1. create immutable tag `0.1.9` pointing exactly to `RELEASE_0_1_9_PREP_SHA`;
2. push the dedicated release branch and tag;
3. create/publish the GitHub prerelease for tag `0.1.9`;
4. publish exactly the required install assets:
   - `main.js`
   - `manifest.json`
5. include `styles.css` only if the exact release build intentionally produces and requires it according to existing repository packaging behavior;
6. do not publish stale 0.1.8 assets;
7. do not substitute source archives for required install assets.

Required release body, semantically:

```markdown
Phase 6 prerelease for controlled resumption of real Windows/iPhone validation after the independently reviewed pre-live correctness and platform/runtime repair campaign.

The repaired candidate passed the complete raw executable verification surface, including 711/711 repository tests, 38/38 focused tests, typecheck, production build, and repository check before release preparation. The release preparation changes version metadata only and must independently re-run the full verification surface.

This release is for physical platform validation. Physical Windows/iPhone synchronization validation remains incomplete. Phase 6 is not yet complete and Stage 3 has not begun.
```

Do not claim physical A03 or later tests have passed.
Do not call this a stable/final release.

---

## 8. POST-PUBLISH INTEGRITY VERIFICATION

After publishing, independently verify through GitHub metadata and downloaded assets:

- tag `0.1.9` exists;
- tag resolves exactly to `RELEASE_0_1_9_PREP_SHA`;
- release is published, non-draft, prerelease;
- title is exactly:
  `0.1.9 — Phase 6 Pre-Live Repair Physical Validation Build`;
- required `main.js` and `manifest.json` assets exist;
- asset sizes match the locally built files;
- GitHub asset digests, where provided, exactly match independently computed SHA-256 values;
- downloaded `manifest.json` reports `version = 0.1.9` and `id = brain-google-drive-sync`;
- downloaded `main.js` hash exactly matches the built artifact;
- tag remains on the verified release-preparation commit, not a later evidence commit;
- `phase6-integration` was not moved by this release task;
- no physical synchronization was started.

---

## 9. RELEASE EVIDENCE

Create one dedicated evidence file on the release branch:

`dev/evidence/_ca-output-agt-ca-p6-real-platform-release-0.1.9-01.md`

Record:

- agent identity;
- `RELEASE_INPUT_SHA`;
- `APPROVED_PRELIVE_REPAIR_SHA`;
- release branch;
- observed pre-release version metadata;
- version-change manifest;
- `RELEASE_0_1_9_PREP_SHA`;
- exact verification commands and exit results;
- raw full-test totals;
- raw check-embedded test totals;
- build/check/typecheck results;
- release asset sizes and SHA-256 hashes;
- tag identity;
- release URL and release ID;
- release asset IDs/names/sizes/digests;
- `prerelease=true`, `draft=false`;
- confirmation no `src/**`, `test/**`, contract, script, or workflow files changed;
- confirmation `phase6-integration` and Stage 3 were not modified/started;
- confirmation physical validation remains pending.

Commit only this evidence file after the published release has been independently verified.

Record the final evidence-bearing branch head as:

`RELEASE_0_1_9_EVIDENCE_SHA`

Do not move tag `0.1.9` to the later evidence commit.

---

## 10. COMPLETION RESPONSE

Return:

- `RELEASE_0_1_9_PREP_SHA`;
- `RELEASE_0_1_9_EVIDENCE_SHA`;
- release branch;
- tag target SHA;
- release URL and release ID;
- `main.js` asset ID / size / SHA-256 / GitHub digest;
- `manifest.json` asset ID / size / SHA-256 / GitHub digest;
- raw complete-test totals;
- raw check-embedded test totals;
- typecheck / test compilation / build / check results;
- exact changed-file manifest;
- confirmation no production source/test/contract changes occurred;
- confirmation physical validation and Stage 3 remain pending;
- any blocker.

End exactly:

`0.1.9 PHASE 6 PRE-LIVE REPAIR PRERELEASE COMPLETE — READY FOR WINDOWS INSTALLATION — PHYSICAL VALIDATION NOT YET RESUMED`

---

## 11. STOP

Stop after prerelease publication and release evidence are complete.

Do not install the plugin.
Do not perform Windows/iPhone synchronization.
Do not resume A03.
Do not optimize performance.
Do not begin Stage 3.
