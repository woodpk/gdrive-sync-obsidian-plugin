# Workstream B V1.3 Failure-Provenance Extension Evidence

## B-C1 evidence correction status

This file is the dedicated completion evidence for the already-existing Workstream B V1.3 source/test candidate. B-C1 is evidence-only: no production code, tests, shared contracts, or other workstream files are changed by this correction.

- Agent: `agt-CA-P6-SYNC-LOCAL-01`
- Shared extension base SHA: `7fa9dd2c95f940260594cefa2674963be3a785de`
- Frozen V1.3 `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Source/test candidate SHA: `a703a6e6cef6a500b85d631e83cb35da0c5fd921`
- Branch: `phase6-sync-local-v1.3-provenance-extension`

The GitHub Actions proof run identified below was triggered from this branch at head SHA exactly `a703a6e6cef6a500b85d631e83cb35da0c5fd921`. The candidate Git tree resolves `src/contracts/**` to exactly `0db68ced179825f929008b502335210260ca2ce3`; the frozen contract tree was therefore unchanged by the source/test candidate.

## Exact source/test manifest

Comparison of `7fa9dd2c95f940260594cefa2674963be3a785de...a703a6e6cef6a500b85d631e83cb35da0c5fd921` contains exactly these three source/test paths:

1. `src/local/local-vault-access-boundary.ts`
2. `test/phase6-a-local-hardening.test.ts`
3. `test/workstreams/local/local-v1_3-failure-provenance.test.ts`

No `src/contracts/**` file is part of that source/test manifest.

## Public V1.3 provenance seam

`src/local/local-vault-access-boundary.ts` imports the public V1.3 extractor `operationalFailureProvenanceFromErrorV1_3` and the public V1.3 local transaction types. `ObsidianLocalMutationTransactions.stageAndVerify()` retains its physical `status: "outcome-unknown"` staging result when staging throws, calls the public extractor, and conditionally carries the returned `operationalFailure` without changing the transaction's physical state.

`commitVerifiedStage()` and `recover()` retain the previously approved local physical semantics. Their local catch paths continue to return unclassified physical uncertainty rather than fabricating remote operational provenance.

### No A-private error dependency

The B-owned production change references `operationalFailureProvenanceFromErrorV1_3`; it does not import or reference A-private `DriveContentStreamError`. The source/test candidate therefore depends on the public contract rather than A's private error implementation.

### No error-message parsing

The focused B test deliberately stages ordinary `Error` objects whose messages are:

- `ordinary local failure`
- `ECONNRESET`
- `429`
- `authentication-required`

For every case it asserts:

- physical status remains `outcome-unknown`;
- `operationalFailure` is `undefined`;
- transaction stage remains `staging`.

Thus arbitrary or suggestive error-message strings are not promoted into structured V1.3 provenance.

### Generic local uncertainty remains unclassified

The same focused test proves a generic local staging error remains physical `outcome-unknown` with no `operationalFailure`. The foundation regression independently verifies that `operationalFailureProvenanceFromErrorV1_3(new Error("ECONNRESET-looking text is not authority"))` returns `undefined`.

### Operational provenance is orthogonal to physical uncertainty

The focused authentication, transient, and rate-limit cases all assert `status: "outcome-unknown"` and transaction stage `staging` while preserving the structured operational cause. The rate-limit case additionally preserves `retryAfterMs: 5000` exactly. Operational cause therefore does not convert physical uncertainty into `blocked`, `stale`, committed, or otherwise known physical authority.

The canonical wrapper regression delegates a backend `LocalTransactionResultV1_3` carrying rate-limit provenance and proves `CanonicalEvidenceLocalVault.stageAndVerify()` returns the structured `operationalFailure` unchanged rather than stripping it.

## Reconciled verification evidence

Existing verification was reconciled from:

- Workflow: `Phase 6 Alpha Diagnostic Verification`
- Run: `33708130117`
- Job: `100501621117`
- Run head SHA: `a703a6e6cef6a500b85d631e83cb35da0c5fd921`
- Artifact ID: `9875966923`
- Artifact name: `phase6-oauth-housekeeping-verification`
- Artifact digest: `sha256:d5aa4068d12ebf4e363a290413b783f70012a01357ad18f39d834c1562543e1c`

The artifact contains retained `.ci-evidence/full-tests.tap`, `.ci-evidence/check.log`, `.ci-evidence/focused-tests.tap`, and build identity files.

### Focused Workstream B V1.3 provenance results

The retained full-test TAP proves all five focused B V1.3 test cases executed and passed:

1. `ok 285 - B V1.3: authentication carrier remains physical outcome-unknown with authentication provenance`
2. `ok 286 - B V1.3: transient carrier remains physical outcome-unknown with transient provenance`
3. `ok 287 - B V1.3: rate-limit carrier remains physical outcome-unknown and preserves exact retry timing`
4. `ok 288 - B V1.3: generic local errors and suggestive strings never fabricate operational provenance`
5. `ok 289 - B V1.3: canonical transaction wrapper preserves structured provenance returned by backend`

Focused B V1.3 result observed in retained TAP: **5 tests / 5 passed / 0 failed**.

A separate standalone transcript for `node --test .test-build/test/workstreams/local/local-v1_3-failure-provenance.test.js` is `NOT AVAILABLE IN THIS SESSION`. The same compiled focused test is imported by the top-level B test entrypoint and the five named cases above are directly present as passing cases in the retained candidate TAP.

### Foundation failure-provenance regression

`test/phase6-foundation-failure-provenance.test.ts` defines 17 V1.3 foundation cases. In the retained candidate TAP they appear consecutively as tests 551 through 567 and all pass, including authentication, transient, exact rate-limit timing, fail-closed not-found/conflict/generic-local cases, physical/operational orthogonality, retry/reconciliation authority, predecessor-byte preservation, and documentation succession checks.

Foundation failure-provenance result observed in retained TAP: **17 tests / 17 passed / 0 failed**.

A separate standalone transcript for `node --test .test-build/test/phase6-foundation-failure-provenance.test.js` is `NOT AVAILABLE IN THIS SESSION`; the file's 17 named cases are directly present as passing cases in the retained aggregate TAP.

### Directly affected prior B transaction/recovery regressions

The retained TAP proves the directly affected approved B regression cases all passed:

1. `ok 276 - create crash-recovery matrix preserves absence or verified new content at every boundary`
2. `ok 277 - replace crash-recovery matrix never converts lost old target into create authority`
3. `ok 278 - authoritative cache-bypass discovers same-size same-mtime H0->H1 after missed watcher event`
4. `ok 279 - corrupt staged bytes are rejected before target displacement`
5. `ok 280 - create requires authoritative absence and commits verified bytes`
6. `ok 281 - replace rechecks canonical old bytes even when observation token is unchanged`
7. `ok 282 - replace recovery treats absent target plus absent required backup as contradiction`
8. `ok 283 - replace recovery completes verified stage when old target survives in backup`
9. `ok 284 - exact plugin structural hints coalesce while overlapping user edit remains observable`

Directly affected prior B transaction/recovery result: **9 tests / 9 passed / 0 failed**.

A separate standalone transcript for the compiled nested B transaction/recovery files is `NOT AVAILABLE IN THIS SESSION`; the nine named regression cases above are directly present as passing cases in the retained candidate TAP.

## Typecheck, compile, build, and static verification

The workflow definition at the candidate SHA executes:

- `npm ci`
- `npm run typecheck`
- `npm test`, whose package script is `tsc -p tsconfig.test.json && node --test .test-build/test/*.test.js`
- `npm run build`
- `npm run check`
- `git diff --check`

GitHub records successful step conclusions for dependency installation, Typecheck, Full tests, Production build, Full repository check, and Diff whitespace check. The following more precise observations govern this evidence:

- `npm ci`: GitHub step conclusion `success`.
- `npm run typecheck` (`tsc --noEmit`): GitHub step conclusion `success`.
- `tsc -p tsconfig.test.json`: executed as the first leg of `npm test`; the subsequent Node TAP exists, proving test compilation completed sufficiently for the test runner to execute. A separate standalone `npx tsc -p tsconfig.test.json` transcript is `NOT AVAILABLE IN THIS SESSION`.
- `npm run build`: GitHub step conclusion `success`.
- workflow `git diff --check`: GitHub step conclusion `success`.
- exact requested range check `git diff --check 7fa9dd2c95f940260594cefa2674963be3a785de...a703a6e6cef6a500b85d631e83cb35da0c5fd921`: `NOT AVAILABLE IN THIS SESSION`. The workflow command was plain `git diff --check`, so it is not represented here as equivalent to the requested range check.

### Aggregate-test limitation in the existing workflow

The workflow commands for `Full tests` and `Full repository check` pipe through `tee` without enabling shell `pipefail`. GitHub therefore records those steps as `success` even though the retained aggregate TAP reports unrelated repository failures.

The retained `.ci-evidence/full-tests.tap` aggregate is:

- tests: 678
- passed: 611
- failed: 42
- cancelled: 25
- skipped: 0
- todo: 0

The retained `.ci-evidence/check.log` reaches the same test aggregate during `npm run check`; it does not show the subsequent build leg of that compound `check` script. Consequently, this evidence does **not** claim that aggregate `npm test` or aggregate `npm run check` passed. Those unrelated aggregate failures are not repaired under B-C1.

The required B V1.3 cases, foundation failure-provenance cases, and directly affected prior B transaction/recovery cases identified above are all explicitly `ok` in the retained TAP and expose no B source/test defect.

## B-C1 change scope

B-C1 creates only:

- `dev/evidence/_ca-output-agt-CA-P6-SYNC-LOCAL-V1.3-EXT-01.md`

Production/test candidate remains fixed at `a703a6e6cef6a500b85d631e83cb35da0c5fd921`. No production file, test file, `src/contracts/**` file, other workstream file, or canonical `dev/evidence/_ca-output.md` is modified by B-C1.

## Remaining blocker / limitation

No B-C1 source/test blocker was exposed by the reconciled evidence. Materially unavailable standalone command transcripts and the exact base-to-candidate range-form `git diff --check` are explicitly marked `NOT AVAILABLE IN THIS SESSION` above. The existing aggregate suite contains unrelated failures and is not represented as green; B-C1 makes no attempt to repair them.
