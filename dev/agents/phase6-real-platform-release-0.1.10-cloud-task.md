# PHASE 6 A03 REPAIR PRERELEASE 0.1.10 — CLOUD RELEASE TASK

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`agt-ca-p6-real-platform-release-0.1.10-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Your assignment is to construct, verify, tag, and publish GitHub prerelease `0.1.10` from the exact supervisor-promoted C1-R1 repair integration commit so controlled Phase 6 physical validation can resume at the preserved A03 checkpoint.

This is a **release-packaging task only**.

Do not redesign synchronization behavior.
Do not modify production source or tests.
Do not install the plugin on any device.
Do not perform live synchronization.
Do not resume A03.
Do not begin B–O.
Do not begin Stage 3.

---

## 1. AUTHORITATIVE RELEASE INPUT

Use exactly:

`RELEASE_INPUT_SHA = 05a99001607f48896062d0aac6ee507fc892691a`

This is the supervisor-promoted `phase6-integration` merge of approved C1-R1 repair HEAD:

`APPROVED_C1_R1_SHA = 145ff6898225c5737fea7dfbab2b79dc4ae7b02f`

The merge commit has:

- first parent: `73153a8144a8ec43a061b48ebe80e6bb5d853157` — integration/tasking/evidence line;
- second parent: `145ff6898225c5737fea7dfbab2b79dc4ae7b02f` — approved C1-R1 repair head.

The approved repair passed authoritative verification:

- workflow run: `34235800263`;
- job: `102093048308`;
- complete repository tests: `727 / 727 PASS`;
- focused C1 tests: `16 / 16 PASS`;
- focused callback/diagnostic/OAuth/export tests: `38 / 38 PASS`;
- raw TAP: zero `not ok`, `# fail 0`;
- `npm run check`: `727 / 727 PASS`, zero `not ok`;
- typecheck: PASS;
- standalone test TypeScript compile: PASS;
- production build: PASS;
- diff whitespace check: PASS.

Approved build artifact identity at the repair head:

- `main.js` size: `733916` bytes;
- `main.js` SHA-256: `f5ed8bf4eaaed81502fca50845fb5ed66234655389b0896d19d4d7edda2eefa4`.

Do **not** substitute a later `phase6-integration` branch tip for `RELEASE_INPUT_SHA`. The tasking commit that contains this prompt will necessarily move `phase6-integration` beyond the authoritative release input; that later tasking commit is not release input.

---

## 2. RELEASE IDENTITY

Latest published prerelease:

`0.1.9`

Create the next prerelease as:

`0.1.10`

Required release title:

`0.1.10 — Phase 6 A03 Conflict-Resolution Repair Physical Validation Build`

Required classification:

- GitHub Release: published;
- `prerelease = true`;
- `draft = false`.

This is a controlled physical-validation build only. Phase 6 physical validation is still incomplete. Stage 3 has not begun.

At `RELEASE_INPUT_SHA`, repository release metadata is expected to report `0.1.9`. The authorized release-preparation change is therefore:

`0.1.9 -> 0.1.10`

Do not recreate, overwrite, move, or delete the existing `0.1.9` tag or release.

---

## 3. ENTRY / DRIFT GATE

Before writing anything:

1. verify commit `05a99001607f48896062d0aac6ee507fc892691a` exists;
2. verify its parents are exactly the integration/tasking line and approved C1-R1 repair lineage described above;
3. verify `APPROVED_C1_R1_SHA = 145ff6898225c5737fea7dfbab2b79dc4ae7b02f` is reachable as the promoted repair parent;
4. create a dedicated release branch from **exactly** `RELEASE_INPUT_SHA`;
5. required branch name:
   `phase6-real-platform-release-0.1.10`;
6. verify GitHub prerelease/tag `0.1.9` exists and remains untouched;
7. verify tag `0.1.10` does not already exist;
8. verify no GitHub release for tag `0.1.10` already exists;
9. record observed versions from:
   - `manifest.json`;
   - `package.json`;
   - top-level `package-lock.json` version;
   - `package-lock.json` root package version;
10. require all four observed versions to be `0.1.9` before the bump;
11. verify `manifest.json` still contains:
   - `id = "brain-google-drive-sync"`;
   - `name = "BRAIN Google Drive Sync"`;
   - `minAppVersion = "1.11.4"`;
   - `isDesktopOnly = false`;
12. verify there is no unexplained product drift relative to `RELEASE_INPUT_SHA` before release preparation.

If any exact-input, version, tag/release-collision, parentage, or product-drift check fails, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not force-move or overwrite any existing tag/release.

---

## 4. AUTHORIZED WRITABLE SURFACE

The release-preparation commit may modify only:

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
- prior evidence files;
- `phase6-integration` directly;
- `master` directly.

`versions.json` must remain unchanged unless an existing repository verification command proves it is mechanically required for this private prerelease. Do not change it by convention alone.

After publication, one dedicated release evidence file under `dev/evidence/` is authorized on the release branch.

No product behavior change is authorized.

---

## 5. VERSION PREPARATION

Set `0.1.10` consistently in:

- `manifest.json` -> `version`;
- `package.json` -> `version`;
- `package-lock.json` -> top-level `version`;
- `package-lock.json` -> `packages[""].version`.

Preserve all other metadata unless a purely mechanical lockfile update is required.

Required manifest identity after update:

- `id = "brain-google-drive-sync"`;
- `name = "BRAIN Google Drive Sync"`;
- `version = "0.1.10"`;
- `minAppVersion = "1.11.4"`;
- `isDesktopOnly = false`.

Commit only the bounded metadata change.

Record that exact commit as:

`RELEASE_0_1_10_PREP_SHA`

---

## 6. CLEAN BUILD / EXECUTABLE VERIFICATION

From a clean checkout of `RELEASE_0_1_10_PREP_SHA`, run at minimum:

1. `npm ci`
2. `npm run typecheck`
3. `npx tsc -p tsconfig.test.json`
4. `npm test`
5. focused C1 suite:
   `node --test .test-build/test/phase6-a03-first-sync-conflict-resolution-authority.test.js`
6. `npm run build`
7. `npm run check`
8. `git diff --check RELEASE_INPUT_SHA...RELEASE_0_1_10_PREP_SHA`

All commands must exit `0`.

### Raw evidence requirements

Do not rely on a green workflow badge alone.

Inspect raw TAP/log output.

Acceptance requires:

- full `npm test`: at least `727` tests, `# fail 0`, zero `not ok`;
- focused C1 suite: all tests pass, zero `not ok`;
- `npm run check` embedded tests: at least `727` tests, `# fail 0`, zero `not ok`;
- typecheck PASS;
- standalone test TypeScript compile PASS;
- production build PASS;
- repository check PASS;
- diff whitespace check PASS;
- `main.js` exists and is non-empty;
- `manifest.json` parses and reports `0.1.10`.

If the test count differs from the approved `727`, explain exactly why and prove tests were not silently skipped.

Verify the release-preparation diff contains no `src/**`, `test/**`, contracts, scripts, workflows, or unrelated files.

Compute and record exact release artifact identity:

- `main.js` byte size;
- `main.js` SHA-256;
- `manifest.json` byte size;
- `manifest.json` SHA-256.

Do not reuse artifacts from `0.1.9` or another branch/build.

---

## 7. TAG / GITHUB PRERELEASE

Only after the clean verification above succeeds:

1. create immutable tag `0.1.10` pointing exactly to `RELEASE_0_1_10_PREP_SHA`;
2. push the dedicated release branch and tag;
3. create/publish the GitHub prerelease for tag `0.1.10`;
4. publish exactly the required install assets:
   - `main.js`;
   - `manifest.json`;
5. include `styles.css` only if the exact build intentionally produces and requires it under existing packaging behavior;
6. do not publish stale `0.1.9` assets;
7. do not substitute source archives for required install assets.

Required release body, semantically:

```markdown
Phase 6 prerelease for controlled resumption of physical validation after the C1-R1 first-sync conflict-resolution authority repair.

The repaired candidate fixes the A03 first-sync conflict-resolution authority deadlock while preserving ordinary BASE/identity authority, recovery fail-closed behavior, exact conflict evidence validation, and durable retry safety. The supervisor-approved candidate passed the complete executable verification surface before promotion, including 727/727 repository tests and the focused C1 authority suite.

This 0.1.10 release preparation changes release metadata only and independently re-runs the full verification surface before publication.

This release is for physical Windows/iPhone validation. A03 has not yet been resumed, later Phase 6 live tests remain pending, Phase 6 is not complete, and Stage 3 has not begun.
```

Do not claim A03 has passed.
Do not claim later physical tests have passed.
Do not call this a stable/final release.

---

## 8. POST-PUBLISH INTEGRITY VERIFICATION

After publishing, independently verify:

- tag `0.1.10` exists;
- tag resolves exactly to `RELEASE_0_1_10_PREP_SHA`;
- release is published, non-draft, prerelease;
- title is exactly:
  `0.1.10 — Phase 6 A03 Conflict-Resolution Repair Physical Validation Build`;
- required `main.js` and `manifest.json` assets exist;
- asset sizes equal the locally built files;
- GitHub asset digests, where supplied, match independently computed SHA-256 values;
- downloaded `manifest.json` reports `version = 0.1.10` and `id = brain-google-drive-sync`;
- downloaded `main.js` SHA-256 exactly matches the verified build;
- tag remains on the prep commit, not a later evidence commit;
- existing `0.1.9` tag/release is unchanged;
- `phase6-integration` was not moved by release execution;
- no device installation or synchronization occurred.

---

## 9. RELEASE EVIDENCE

Create exactly one dedicated evidence file on the release branch:

`dev/evidence/_ca-output-agt-ca-p6-real-platform-release-0.1.10-01.md`

Record:

- agent identity;
- `RELEASE_INPUT_SHA`;
- `APPROVED_C1_R1_SHA`;
- release branch;
- observed pre-release version metadata;
- exact version-change manifest;
- `RELEASE_0_1_10_PREP_SHA`;
- verification commands and exit results;
- raw full-test totals;
- raw focused C1 totals;
- raw `npm run check` totals;
- typecheck/test-compilation/build/check/diff-check results;
- release asset sizes and SHA-256 hashes;
- tag identity;
- release URL and release ID;
- asset IDs/names/sizes/digests;
- `prerelease=true`, `draft=false`;
- confirmation no `src/**`, `test/**`, contract, script, or workflow changes occurred in release preparation;
- confirmation `phase6-integration` did not move during release execution;
- confirmation no installation/live sync/A03 resumption/B–O/Stage-3 activity occurred.

Commit only this evidence file after publication and independent integrity verification.

Record the final evidence-bearing release branch head as:

`RELEASE_0_1_10_EVIDENCE_SHA`

Do not move tag `0.1.10` to the evidence commit.

---

## 10. COMPLETION RESPONSE

Return:

- `RELEASE_0_1_10_PREP_SHA`;
- `RELEASE_0_1_10_EVIDENCE_SHA`;
- release branch;
- tag target SHA;
- release URL and release ID;
- `main.js` asset ID / size / SHA-256 / GitHub digest;
- `manifest.json` asset ID / size / SHA-256 / GitHub digest;
- raw full-test totals;
- focused C1 totals;
- raw check-embedded test totals;
- typecheck / test compilation / build / check / diff-check results;
- exact release-preparation changed-file manifest;
- confirmation no production source/test/contract changes occurred;
- confirmation existing `0.1.9` release/tag is untouched;
- confirmation A03 has not yet resumed and Stage 3 remains unauthorized;
- any blocker.

End exactly:

`0.1.10 PHASE 6 A03 REPAIR PRERELEASE COMPLETE — READY FOR WINDOWS INSTALLATION — PHYSICAL VALIDATION NOT YET RESUMED`

---

## 11. STOP

Stop after prerelease publication and release evidence are complete.

Do not install the plugin.
Do not perform Windows/iPhone synchronization.
Do not resume A03.
Do not begin B–O.
Do not optimize or redesign synchronization behavior.
Do not begin Stage 3.
