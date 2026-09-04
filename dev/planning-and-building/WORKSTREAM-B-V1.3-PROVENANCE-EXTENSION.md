# WORKSTREAM B — SUPPLEMENTAL V1.3 FAILURE-PROVENANCE EXTENSION

## 0. STATUS / IDENTITY

You are `agt-CA-P6-SYNC-LOCAL-01`, receiving one bounded supplemental extension to the already-approved **Workstream B — Local Platform Safety** implementation.

**THIS IS NOT A REJECTION. YOUR PRIOR APPROVAL REMAINS IN FORCE.**

Previously approved B source/test authority:
`1d59af4bf4ed6f5b3a16a763c8e8c192c7c77d2d`

Previously approved B evidence head:
`592a6d5fdeb0ace89fbb5fdf1ca3c7cc3cbc0df9`

Do not redo the approved recovery matrix, staging safety, cache-bypass work, external-reference safety, watcher correlation, or test-discovery correction.

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Create only:
`phase6-sync-local-v1.3-provenance-extension`

Base it directly on:
`7fa9dd2c95f940260594cefa2674963be3a785de`

Approved V1.3 foundation:
`05600f7ca48a6726b72188005f29eddfc1191519`

Required `src/contracts/**` tree:
`0db68ced179825f929008b502335210260ca2ce3`

Before coding verify the exact base and contract tree. If either differs, STOP.

`src/contracts/**` is frozen. Do not modify it.

---

## 1. SINGLE PURPOSE

Extend B's approved crash-safe local transaction implementation so **public V1.3 operational provenance carried by an input content stream survives B's staging boundary** as `LocalTransactionResultV1_3`.

The existing physical behavior is already correct: a failure while staging lazy content is conservative `outcome-unknown`.

The new requirement is only to preserve a trustworthy public operational cause alongside that physical truth.

---

## 2. REQUIRED V1.3 SURFACES

Use only:

- `OperationalFailureErrorV1_3`
- `operationalFailureProvenanceFromErrorV1_3`
- `LocalTransactionResultV1_3`
- `LocalTransactionalMutationPortV1_3`

B must depend only on the public contract.

Do NOT import A's private `DriveContentStreamError`.

Do NOT classify failures by matching error-message text.

---

## 3. REQUIRED BEHAVIOR

### B-V13-1 — stage-and-verify

When `stageAndVerify()` catches an error while consuming/staging `BinaryContentSource`:

1. retain the existing physical result;
2. call the public V1.3 extractor;
3. if structured provenance is returned, emit `LocalTransactionResultV1_3` with:
   - `status: "outcome-unknown"`;
   - the existing bounded reason;
   - exact transaction/stage state;
   - exact `operationalFailure`;
4. if no public provenance exists, return conservative `outcome-unknown` with **no fabricated operationalFailure**.

A transient/auth/rate-limit cause never converts physical uncertainty into `blocked`, `stale`, or known-not-applied authority.

### B-V13-2 — commit/recovery

`commitVerifiedStage()` and `recover()` must satisfy the V1.3 successor result seam without changing their approved physical semantics.

Pure local I/O uncertainty remains unclassified physical uncertainty.

### B-V13-3 — canonical wrapper

The B-owned canonical transaction wrapper must preserve V1.3 result data when delegating to the transactional backend.

It must not strip `operationalFailure`.

Preserve all existing canonical hashing, cache invalidation, watcher correlation, and exact transaction behavior.

### B-V13-4 — prior safety remains frozen

Do not weaken target/stage/backup separation, SHA-256/size verification, create absence authority, replace old-content authority, backup/swap crash recovery, iOS/mobile boundaries, external-reference fail-closed behavior, or transaction staging semantics.

---

## 4. SCOPE

Primary authorized production files:

- `src/local/local-vault-access-boundary.ts`
- `src/product/canonical-local-vault.ts`

Authorized tests:

- `test/workstreams/local/local-transaction-safety.test.ts`
- `test/workstreams/local/local-recovery-matrix.test.ts`
- one new focused B V1.3 test under `test/workstreams/local/**`.

If default test discovery genuinely requires it, one test-only import change is allowed in:
`test/phase6-a-local-hardening.test.ts`

Authorized evidence:
`dev/evidence/_ca-output-agt-CA-P6-SYNC-LOCAL-V1.3-EXT-01.md`

Do NOT modify:

- `src/contracts/**`
- `src/drive/**`
- D orchestration files
- H-owned `src/product/phase6-sync-integration.ts`
- H fixture files
- G model
- canonical `_ca-output.md`.

If the H-owned integrated wrapper later needs a V1.3 typing/composition adaptation, record that exact H dependency; do not edit H here.

---

## 5. ACCEPTANCE TESTS

Prove:

1. public authentication carrier thrown mid-stream -> local `outcome-unknown + authentication-required`;
2. transient carrier -> local `outcome-unknown + transient-failure`;
3. rate-limit carrier -> local `outcome-unknown` preserving exact `retryAfterMs = 5000`;
4. generic local `Error` -> `outcome-unknown` with no `operationalFailure`;
5. strings containing `ECONNRESET`, `429`, or `authentication-required` are not parsed into provenance;
6. canonical wrapper delegation preserves structured provenance;
7. existing local transaction safety/recovery regressions remain green.

The tests must prove provenance does not change physical classification.

---

## 6. VERIFICATION

Verify exact candidate:

```bash
npm ci
npm run typecheck
npx tsc -p tsconfig.test.json
node --test <compiled focused B V1.3 test(s)>
node --test .test-build/test/phase6-foundation-failure-provenance.test.js
node --test <compiled existing B transaction/recovery tests>
npm run build
git diff --check 7fa9dd2c95f940260594cefa2674963be3a785de...<B_V1_3_EXTENSION_SHA>
```

Use a disposable proof branch if necessary.

If full `npm test` is run, report exact totals; do not repair unrelated failures.

---

## 7. EVIDENCE / STOP

Record exact base, contract tree, files changed, public extractor used, proof no A-private error type is referenced, proof arbitrary strings are not parsed, focused/regression totals, typecheck/build/diff results, source/test SHA, proof run/job/artifact/digest if used, and any exact H composition dependency.

Write only:
`dev/evidence/_ca-output-agt-CA-P6-SYNC-LOCAL-V1.3-EXT-01.md`

Do not merge. Do not integrate into H. Do not resume H-U5. Prior B approval remains intact.

Return for independent supervisor review.

End exactly:

`WORKSTREAM B V1.3 PROVENANCE EXTENSION COMPLETE — PRIOR B APPROVAL PRESERVED — READY FOR SUPERVISOR REVIEW`
