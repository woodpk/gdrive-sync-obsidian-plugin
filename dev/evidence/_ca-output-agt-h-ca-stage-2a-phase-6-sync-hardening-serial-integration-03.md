## V1.3 FOUNDATION ADOPTION CHECKPOINT

### Authority

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-03`
- `H_PRE_V1_3_HEAD`: `47f46b15c4edf75c12cb7b20e8a211a59af2c796`
- Approved V1.3 foundation source SHA: `05600f7ca48a6726b72188005f29eddfc1191519`
- Approved V1.3 `src/contracts` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Pre-adoption H `src/contracts` tree: `4deb82e382f7957c731ef78db52b4164571d57a3`
- Pre-adoption canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- PR #45 before adoption: OPEN / DRAFT / UNMERGED.

### Exact adoption procedure

The available GitHub repository tooling does not expose a direct `git cherry-pick` command. The approved commit was therefore transplanted using the GitHub Git Data equivalent of a conflict-free:

`git cherry-pick -x 05600f7ca48a6726b72188005f29eddfc1191519`

Before creating the H commit, the two planning documents and the complete predecessor `src/contracts` tree on H were proven byte-identical to the approved commit's parent, and `test/phase6-foundation-failure-provenance.test.ts` was proven absent. No conflict resolution or content editing was performed. The exact six post-image blobs from approved commit `05600f7ca48a6726b72188005f29eddfc1191519` were applied to H in one child commit with the standard provenance footer:

`(cherry picked from commit 05600f7ca48a6726b72188005f29eddfc1191519)`

- `H_V1_3_ADOPTION_SHA`: `7fa9dd2c95f940260594cefa2674963be3a785de`
- Adoption delta: exactly 6 files, 605 additions, 0 deletions.
- Adopted paths:
  - `dev/planning-and-building/phase6-sync-architecture-foundation.md`
  - `dev/planning-and-building/phase6-sync-contract-freeze.md`
  - `src/contracts/common.ts`
  - `src/contracts/execution.ts`
  - `src/contracts/google-drive.ts`
  - `test/phase6-foundation-failure-provenance.test.ts`
- Existing H-U5-P1 fixture files were not modified by the adoption.

### Contract identity

- Resulting H `src/contracts` tree: `0db68ced179825f929008b502335210260ca2ce3` — EXACT MATCH.
- V1.3 changed contract byte identity:
  - `src/contracts/common.ts` = `6ac3a4dd2721e93193584ef16a823593f9a11303`
  - `src/contracts/execution.ts` = `64cd95f34b0fac7426b1d8260b6f621095a6abff`
  - `src/contracts/google-drive.ts` = `69ff1659c916d5a8be94d75d7ce436dfe18dbe36`
- Unaffected predecessor contract byte identity preserved:
  - `src/contracts/conflict.ts` = `86f9225e7958a2454bd08dc6c0c7a672a5c1fa66`
  - `src/contracts/index.ts` = `66df02df294665029fb5c6b9bdab877ace0f89de`
  - `src/contracts/local-vault.ts` = `d9187ffc389d4ccda70a159de3b7b00c7d4ec88a`
  - `src/contracts/plan.ts` = `3cf5a80becd4a073cfe1204fb21daea3375dfb7e`
  - `src/contracts/snapshot.ts` = `f3adf4ac35c1ae2ad0f56560a50dd207a2e210a7`
  - `src/contracts/state.ts` = `f41920c8576972d8b12236d06e4a9efd67975e35`
  - `src/contracts/status-audit-actions.ts` = `5b9fc086bd150fb385035bb9a5eca2abd9f33226`
  - `src/contracts/synchronization-folder-create-foundation.ts` = `1a2fdaa27a959f4c61737b69a168fb002dcb54f5`
  - `src/contracts/synchronization-foundation.ts` = `fde30f9ed2b13b878476759c3c0f4d7ddbbc5af6`

### Disposable GitHub Actions proof

- Proof branch: `h-v1-3-foundation-adoption-proof-h02`
- Proof branch state: unmerged; workflow isolated to disposable branch.
- Proof workflow commit: `c02d98420771b38977ba4251c2dd4b77300205f6`
- Proof run ID: `33696154525`
- Proof job ID: `100465336681`
- Proof artifact ID: `9871839327`
- Proof artifact digest: `sha256:be4a56f922c2d047645c0ca5e2d1651b7a8036b9e72a8f7dd085a86feab6bab0`
- Node: `v22.23.2`
- npm: `10.9.8`
- Checked-out HEAD identity: `7fa9dd2c95f940260594cefa2674963be3a785de` — PASS / exit `0`.
- Checked-out `src/contracts` tree identity: `0db68ced179825f929008b502335210260ca2ce3` — PASS / exit `0`.
- `npm ci`: PASS / exit `0`.
- `npm run typecheck`: PASS / exit `0`.
- `npx tsc -p tsconfig.test.json`: PASS / exit `0`.
- `node --test .test-build/test/phase6-foundation-failure-provenance.test.js`: PASS / exit `0`.
- Focused V1.3 predictive totals: `17 tests / 17 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo`.
- Focused totals identity assertion: PASS / exit `0`.
- `npm run build`: PASS / exit `0`.
- `git diff --check 47f46b15c4edf75c12cb7b20e8a211a59af2c796...7fa9dd2c95f940260594cefa2674963be3a785de`: PASS / exit `0`.
- H-U5-P1 Group-B focused suite was not run as an adoption gate.
- Full `npm test` was not run as an adoption requirement.

### Closure state

- Canonical `dev/evidence/_ca-output.md` remained blob-identical at `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73` through executable adoption verification.
- PR #45 after executable adoption: OPEN / DRAFT / UNMERGED, head `7fa9dd2c95f940260594cefa2674963be3a785de`.
- PR #47 remained untouched: OPEN / DRAFT / UNMERGED, head `888637a216816053698c7f50b9fef17ce161342f`.
- Foundation evidence commit `888637a216816053698c7f50b9fef17ce161342f` was not cherry-picked.
- Foundation disposable-proof commit `a757231d59b64efca624f6c7ba9e4099dc5c4e66` was not cherry-picked.
- No Workstream A, B, D, or G implementation was started.
- H-U5-P1 was not resumed.
- No H-FINAL work was started.
