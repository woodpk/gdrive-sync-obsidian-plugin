# Phase 6 Foundation v1.2 Remote Folder Recovery Observation — Corrected Evidence

## Identity and correction authority

- Agent: `agt-CA-P6-SYNC-ORCHESTRATION-01`
- Execution class for this correction: `SERIAL-SHARED-OWNER`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Branch: `phase6-sync-foundation-v1.2-remote-folder-recovery-observation`
- Approved v1.1 starting foundation SHA: `e6e74b6503e95219b3070044a86be2dd7e41bd5d`
- Source Workstream D blocker SHA: `bec4b64bb84fc147db39c004f959f8e09db5945e`
- Rejected v1.2 evidence head: `344a4720bf4c356de757464ae19a7b7fe8e14ad2`
- Tested implementation checkpoint: `837c11551ce584503339f682d28ddf8be7fd533c`
- Correct v1.2 review/CI PR: **PR #40**, `phase6-sync-foundation-v1.2-remote-folder-recovery-observation` -> `phase6-integration`
- PR #40 status at correction start: OPEN, DRAFT, UNMERGED.

This rejection is evidence/provenance-only. The reviewed contract implementation, predictive test source, and bounded planning correction require no implementation change in this pass. Workstream D remains paused.

The earlier completion summary incorrectly identified an unrelated pull request as the v1.2 review/CI harness. That statement is superseded. PR #40 is the sole v1.2 review/CI PR recorded by this corrected evidence.

## Frozen reviewed artifacts — accepted and unchanged

The following reviewed blobs are frozen for this evidence-only correction:

- `src/contracts/synchronization-folder-create-foundation.ts`
  - blob `1a2fdaa27a959f4c61737b69a168fb002dcb54f5`
- `test/phase6-folder-remote-recovery-observation-foundation.test.ts`
  - blob `83b6c34cad59f7b400f470ddcd2b934486a88360`
- `dev/planning-and-building/phase6-sync-remote-folder-recovery-observation-correction.md`
  - blob `713773932761a9daf922e1699ea59a2c9e02d748`

No production, test, contract, planning/foundation, dependency, package, or workflow modification is authorized by this correction.

## Accepted foundation result

The accepted v1.2 foundation adds a dedicated read-only remote-folder-create restart observation seam without broadening generic remote observation DTOs. It preserves the distinction between persisted expected authority and independently observed physical reality.

The frozen contract provides `RemoteFolderCreateRecoveryReadPort` and `recoverRemoteFolderCreate()`. Recovery remains:

`persisted descriptor -> read-only recovery observation -> unchanged verifyRemoteFolderCreate()`.

The persisted intended parent remains expectation. A successful `folder` recovery observation must carry independently observed current object/path/parent evidence. Authoritative absence requires both reserved-ID absence and a clear intended target. Occupancy, duplicate/ambiguous evidence, incomplete parent/path authority, or read uncertainty remain conservative and cannot be converted into success by copying expected descriptor values into observed evidence.

The existing verifier was not weakened.

## Predictive foundation coverage

`test/phase6-folder-remote-recovery-observation-foundation.test.ts` contains the accepted T1–T10 matrix:

- T1 — correct reserved folder under correct observed parent -> `verified-effect`.
- T2 — correct reserved folder under wrong observed parent -> conservative conflict.
- T3 — correct reserved ID at wrong structural path -> not success.
- T4 — reserved ID missing while intended path is occupied -> conflict, not `verified-not-applied`.
- T5 — authoritative reserved-ID absence plus clear target -> `verified-not-applied` permitted.
- T6 — duplicate/ambiguous logical path -> no arbitrary candidate; conservative unknown.
- T7 — incomplete parent/path observation -> `outcome-unknown`.
- T8 — restart from `dispatch-authorized` -> read-only reconciliation before redispatch.
- T9 — restart from `outcome-unknown` -> same read-only reconciliation before redispatch.
- T10 — intended parent in the descriptor is expectation, not observed proof.

## Corrected verification provenance for the rejected implementation/evidence checkpoints

### PR and checkout semantics

The v1.2 verification harness is PR #40. The repository workflow `.github/workflows/phase6-alpha-diagnostic-ci.yml` is triggered by `pull_request` targeting `phase6-integration` and uses plain:

```yaml
- uses: actions/checkout@v4
```

with no explicit head ref.

Accordingly, the cited PR runs are recorded as **PR merge-ref verification containing the candidate head**. Workflow metadata `head_sha` identifies the PR head candidate associated with the run; it is not, by itself, proof that `actions/checkout` checked out the literal detached head SHA.

No exact-head clean-checkout claim is made for these runs absent independent checkout-log evidence establishing it.

### Tested implementation checkpoint

- Workflow: `Phase 6 Alpha Diagnostic Verification`
- Run: `33402395394`
- Job: `99521635985`
- PR head metadata: `837c11551ce584503339f682d28ddf8be7fd533c`
- Checkout qualification: **PR merge-ref verification containing candidate head `837c115...`**
- Result: **SUCCESS**
- Uploaded artifact ID: `9761760080`
- Artifact digest: `sha256:9b8b0f767a55fc8ce6de5660ddac2e583523a8eba0506a35962bcfb2e74cdf07`

### Rejected evidence-bearing candidate

- Workflow: `Phase 6 Alpha Diagnostic Verification`
- Run: `33403086287`
- Job: `99523913304`
- PR head metadata: `344a4720bf4c356de757464ae19a7b7fe8e14ad2`
- Checkout qualification: **PR merge-ref verification containing candidate head `344a472...`**
- Result: **SUCCESS**
- Uploaded artifact ID: `9762024751`
- Artifact digest: `sha256:8e5904d05abd81082a71da504cfcba7e7b506a6acf247b9755d9b91f24da6128`

The downloaded artifact from run `33403086287` independently establishes the verification outputs summarized below.

## Correct runtime and test evidence

The persistent PR workflow configures:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
```

Therefore the supported runtime statement is: **workflow configured for Node 22**. No unsupported patch-level Node or npm assertion is used as historical evidence for the rejected runs.

Verified test results from the uploaded run artifact:

- full repository test suite: **423/423 PASS**, 0 fail;
- v1.2 T1–T10: **all PASS** within the 423-test full suite;
- workflow-focused callback/diagnostic/OAuth/export suite: **38/38 PASS**, 0 fail;
- full repository `npm run check`: **PASS**, including a repeated **423/423 PASS** full suite;
- typecheck: **PASS**;
- production build: **PASS**;
- `git diff --check`: **PASS**.

No separate three-file Phase 6 focused-test count is claimed as part of these GitHub Actions runs because the persistent workflow does not execute such a command.

## Correct build-verification evidence

At the rejected candidate, `scripts/` contains only:

- `scripts/build.mjs`
- `scripts/verify-build.mjs`

`package.json` defines:

```json
"build": "node scripts/build.mjs && node scripts/verify-build.mjs",
"check": "npm run typecheck && npm test && npm run build"
```

The actual `verify-build.mjs` verification outputs are exactly:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

These are five checks emitted by the single existing `verify-build.mjs` script. They are not represented as separate platform-specific package-verifier scripts.

## Correct artifact identity

For both cited v1.2 verification runs, the actual generated `main.js` identity is:

```text
415353 bytes
SHA-256 02f258642be1595e68052e7de189c1bc64e603f984418cdd65224b982e05a1bd
```

For run `33403086287`, the downloaded `brain-sync` verification artifact directly contains `main.js` and `.ci-evidence/main-js-size.txt` / `.ci-evidence/main-js-sha256.txt`; independent inspection of the extracted file reproduces the same byte count and SHA-256.

Earlier evidence used a different bundle identity. That identity was erroneous for these cited v1.2 runs and is superseded rather than retained as current verification evidence.

## C1–C5 correction closure

- **C1 — PR provenance:** CORRECTED. PR #40 is the sole v1.2 review/CI PR in current evidence.
- **C2 — checkout semantics:** CORRECTED. PR runs are qualified as merge-ref verification containing the candidate head unless a checkout log proves literal exact-head checkout.
- **C3 — artifact identity:** CORRECTED to `415353` bytes / SHA-256 `02f258642be1595e68052e7de189c1bc64e603f984418cdd65224b982e05a1bd`.
- **C4 — runtime/focused tests:** CORRECTED to workflow-configured Node 22; full **423/423**; T1–T10 PASS; workflow-focused **38/38**. Unsupported runtime and unsupported separate focused-count claims removed.
- **C5 — package verification:** CORRECTED to the actual single `verify-build.mjs` script and its five emitted PASS checks. Nonexistent-script execution claims removed.

## Evidence-only repair manifest

Authorized final net modifications relative to rejected head `344a4720bf4c356de757464ae19a7b7fe8e14ad2` are limited to:

1. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-V1.2-REMOTE-FOLDER-RECOVERY-OBSERVATION-01.md`
2. `dev/evidence/_ca-output.md`

No other repository modification is authorized or intended.

## Fresh corrected-evidence verification

The evidence correction commit `1a197a4f1001107988103ea2c40403a002120872` triggered PR #40's normal `Phase 6 Alpha Diagnostic Verification` workflow.

- Run: `33409650181`
- Job: `99545722844`
- Candidate head metadata: `1a197a4f1001107988103ea2c40403a002120872`
- Result: **SUCCESS**
- Workflow runtime configuration: Node `22`
- Uploaded artifact ID: `9764596414`
- Artifact digest: `sha256:ce8b1a528841e5089db33fa1e435d5a399433a890b0499dd91b78a341b3d06c5`

### Fresh checkout evidence

The inspected checkout log independently proves that the workflow fetched:

`+9a94862757e540382fac81204f83d16b5d251569:refs/remotes/pull/40/merge`

and then executed checkout of:

`refs/remotes/pull/40/merge`

The checked-out commit was:

`9a94862757e540382fac81204f83d16b5d251569`

with the log identifying it as a merge of candidate head `1a197a4f1001107988103ea2c40403a002120872` into base `86a35b31ccd01df188f00346a7b7b376008899eb`.

Therefore the fresh corrected run is specifically **PR #40 merge-ref verification at `9a94862757e540382fac81204f83d16b5d251569`, containing candidate head `1a197a4f...`**. It is not represented as literal detached-head verification.

### Fresh test/build evidence

The downloaded fresh artifact directly establishes:

- full repository suite: **423/423 PASS**, 0 fail;
- v1.2 T1–T10: **all PASS** as tests 394–403 in the full suite;
- workflow-focused callback/diagnostic/OAuth/export suite: **38/38 PASS**, 0 fail;
- typecheck: **PASS**;
- production build: **PASS**;
- repository `npm run check`: **PASS**;
- `git diff --check`: **PASS**;
- `verify-build.mjs` five checks: **all PASS**.

The fresh uploaded artifact contains `main.js` with independently rechecked identity:

```text
415353 bytes
SHA-256 02f258642be1595e68052e7de189c1bc64e603f984418cdd65224b982e05a1bd
```

No required corrected-run verification is unavailable.

## Scope and final-stop boundaries

- Workstream D orchestration implementation: **PAUSED / NOT RESUMED**.
- Workstream A Drive production implementation: **NOT PERFORMED**.
- `phase6-integration`: **NOT MODIFIED**.
- `master`: **NOT MODIFIED**.
- PR #40: **NOT MERGED**.
- Any other branch/PR merge: **NONE**.
- OAuth/Azure behavior or configuration: **NOT MODIFIED**.
- Release/tag work: **NONE**.
- Physical synchronization: **NOT PERFORMED**.
- Stage 3: **NOT STARTED**.
- Supervisor approval: **NOT CLAIMED**.

This document is correction evidence, not authorization to resume Workstream D.
