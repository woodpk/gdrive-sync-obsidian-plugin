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

---

## V1.3 A/B/D INTEGRATION CLOSURE

### Authority and bounded integration scope

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-03`
- H A/B/D integration entry SHA: `f7a66117e4c1645d8d32f30937776e9e8a0ba659`
- Frozen V1.3 `src/contracts` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Final dynamically verified implementation candidate: `4fef16f498dafba15fc1da5a63124567c5f56bcc`
- Canonical `dev/evidence/_ca-output.md` blob at the verified candidate: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73` — unchanged.

The approved A/B/D source/test bytes were integrated without worker evidence commits or worker proof workflows. H then performed only the product-composition correction required to preserve the frozen V1.3 operational-failure disposition through the existing authoritative execution lifecycle.

The exact cumulative implementation/test delta from `f7a66117e4c1645d8d32f30937776e9e8a0ba659` through `4fef16f498dafba15fc1da5a63124567c5f56bcc` is exactly these nine paths:

1. `src/drive/google-drive-port.ts`
2. `src/local/local-vault-access-boundary.ts`
3. `src/product/authoritative-production-executor.ts`
4. `src/product/product-controller-base.ts`
5. `test/phase6-a-local-hardening.test.ts`
6. `test/workstreams/drive/phase6-remote-protocol-v1.3.test.ts`
7. `test/workstreams/drive/phase6-remote-protocol.test.ts`
8. `test/workstreams/local/local-v1_3-failure-provenance.test.ts`
9. `test/workstreams/orchestration/v1.3-failure-provenance-extension.test.ts`

No `src/contracts/**` file changed. No H-U5 fixture file changed. No G source/test file changed.

### H-owned integration correction

The final H correction is confined to `src/product/product-controller-base.ts`.

The product controller now:

- uses the approved V1.3 authoritative product executor;
- captures a genuine frozen V1.3 operational-failure carrier at the lazy `BinaryContentSource` / local transactional mutation seam without parsing human-readable reason strings;
- preserves D's physical `uncertain` result and enriches that already-uncertain result with the captured `OperationalFailureProvenanceV1_3` when the predecessor compatibility path omitted the structured field;
- delegates final user-facing classification to the frozen `executionDispositionV1_3` contract helper;
- surfaces authentication as `authentication-required` and transient/rate-limit conditions as `offline-deferred` while preserving the unresolved physical effect underneath;
- does not reinterpret or erase an independently `recovery-required` physical result, preserving V1.3 C14 and the existing durable recovery authority;
- does not advance canonical BASE/state/cursor on the uncertain lazy-transfer failure cases.

### Preserved failed verification history

Failed verification attempts remain part of the audit trail and are not represented as passes.

1. Initial proof run `33832375291`, job `100897886651`:
   - exact checkout / frozen-contract checks: PASS;
   - `npm ci`: PASS;
   - typecheck: FAIL due to H-owned TypeScript callback-capture narrowing;
   - artifact `9922221403`, digest `sha256:e4f4e0159b07fff2fa1aa56d499b8948b195abc06b80f89e41d35205d11f19fe`.
2. Second proof run `33832909538`, job `100899469968`:
   - exact checkout / frozen-contract checks: PASS;
   - `npm ci`: PASS;
   - typecheck: FAIL due to the remaining H-owned control-flow narrowing;
   - artifact `9922387613`, digest `sha256:d05015827eca77bf7a43c73b60dd3ffae58d3c931dff9b26521e376a4f520d04`.
3. First behaviorally complete proof run `33833391725`, job `100900893448`:
   - typecheck / test compile / V1.3 foundation / A / B / D regressions: PASS;
   - H focused acceptance: `11 tests / 8 pass / 3 fail`;
   - the three failures were the B4 lazy-transfer authentication/transient/rate-limit product-surface mappings;
   - artifact `9922534160`, digest `sha256:026fcc4056ee851894182f004ac18cc45581cc52b301c62c7f2c76ac72d425b5`.
4. Repair run `33834818877`, job `100905044662`:
   - local-only candidate `60d29d56c3470861f7fbd3911263529d80e63979` was NOT pushed;
   - typecheck and all V1.3 foundation/A/B/D regressions: PASS;
   - H focused acceptance remained `11 / 8 pass / 3 fail`;
   - artifact `9922947552`, digest `sha256:84647758427a6e4bb546c3f0d7444fded6fc8ca949a32fb8f9581966b19c65df`.
5. Repair R2 run `33835066636`, job `100905777955`:
   - local-only candidate `bafa7daac5a53092b3fd0d509cb66416c46bc6e1` was NOT pushed;
   - typecheck and all V1.3 foundation/A/B/D regressions: PASS;
   - H focused acceptance remained `11 / 8 pass / 3 fail`;
   - artifact `9923034399`, digest `sha256:89a7648a6567d7ca0d6b268a7c4d2e2aa2d5a422d800068019db3bdbba201bd5`.

The final diagnosis was that the relevant physical result was already V1.3 `uncertain`; the H seam needed to enrich that uncertain result with trustworthy captured lazy operational provenance, not reinterpret a `recovery-required` result.

### Final authoritative GitHub Actions proof

- Disposable proof branch: `h-v1-3-abd-integration-proof-h03`
- Successful proof workflow: `.github/workflows/h-v1-3-abd-integration-repair-r3.yml`
- Proof-branch workflow commit: `aed46a507ac4410383030232f6642ef5cac38486`
- Run ID: `33835348682`
- Job ID: `100906611092`
- Result: SUCCESS
- Node: `v22.23.2`
- npm: `10.9.8`
- Proof artifact ID: `9923091809`
- Proof artifact digest: `sha256:84a2b4da86a87aa95b55b0c7184634a6ea5db97825a7b92510f1d4de1972959e`

Final gates:

- exact repair authority checkout: PASS;
- frozen `src/contracts` tree identity: PASS;
- bounded H repair touched only `src/product/product-controller-base.ts`: PASS;
- `npm ci`: PASS — 16 packages installed, 0 vulnerabilities;
- `npm run typecheck`: PASS;
- `npx tsc -p tsconfig.test.json`: PASS;
- V1.3 foundation: `17 tests / 17 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo`;
- Workstream A V1.3: `9 / 9 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo`;
- Workstream B V1.3: `5 / 5 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo`;
- Workstream D V1.3: `8 / 8 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo`;
- H focused acceptance: `11 tests / 11 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo`;
- `npm run build`: PASS;
- build verifier entrypoint/syntax/local-runtime-dependencies/mobile-evaluation/package-shape: all PASS;
- build artifact size: `695580` bytes;
- build artifact SHA-256: `ddd155779545a002131c1db69d0179a2ea4c0d87dd7ff2cd219f35133bb38a23`;
- `git diff --check f7a66117e4c1645d8d32f30937776e9e8a0ba659...HEAD`: PASS;
- exact nine-file cumulative delta assertion: PASS;
- final frozen contracts tree assertion: PASS;
- verified candidate push to `phase6-sync-integration-h`: PASS.

The three formerly failing B4 acceptance tests now pass:

- authentication revoked after lazy transfer begins -> `authentication-required`;
- transient failure after lazy transfer begins -> `offline-deferred`;
- rate limit after lazy transfer begins -> retryable/offline-deferred taxonomy.

### Closure state before evidence-only commit

- `H_V1_3_ABD_INTEGRATION_CANDIDATE_SHA`: `4fef16f498dafba15fc1da5a63124567c5f56bcc`
- `src/contracts` tree: `0db68ced179825f929008b502335210260ca2ce3` — exact.
- Canonical `dev/evidence/_ca-output.md`: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73` — unchanged.
- PR #45: OPEN / DRAFT / UNMERGED at implementation candidate head.
- Disposable proof branches/workflows remain unmerged.
- H-U5 was not resumed beyond the explicitly required 11-test focused acceptance surface.
- H-FINAL was not started.
