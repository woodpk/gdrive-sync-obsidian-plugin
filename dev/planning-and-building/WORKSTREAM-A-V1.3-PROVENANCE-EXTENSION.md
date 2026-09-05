# WORKSTREAM A — SUPPLEMENTAL V1.3 FAILURE-PROVENANCE EXTENSION

## 0. STATUS / IDENTITY

You are `agt-CA-P6-SYNC-REMOTE-01`, receiving one bounded supplemental extension to the already-approved **Workstream A — Remote / Google Drive Protocol** implementation.

**THIS IS NOT A REJECTION. YOUR PRIOR APPROVAL REMAINS IN FORCE.**

Previously approved A source authority:
`7892589a45038e270b4a1ca0a7d96cf78cd348c7`

Previously approved A evidence head:
`3a974ca32f10db985a50c02623bd6764f84df617`

Do not redo A-C1/A-C2 or redesign previously accepted Drive behavior.

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Create only:
`phase6-sync-remote-v1.3-provenance-extension`

Base it directly on the approved H executable V1.3 checkpoint:
`7fa9dd2c95f940260594cefa2674963be3a785de`

Approved V1.3 foundation:
`05600f7ca48a6726b72188005f29eddfc1191519`

Required `src/contracts/**` tree:
`0db68ced179825f929008b502335210260ca2ce3`

Before coding verify the exact base and contract tree. If either differs, STOP.

`src/contracts/**` is frozen. Do not modify it.

---

## 1. SINGLE PURPOSE

Extend A's approved Drive implementation so structured `DriveSignal` failures cross the new public V1.3 seam without requiring B/D/H to know A-private error types or parse free-form reasons.

Cover only:

1. lazy/coherent remote content reads, including failures raised during `BinaryContentSource.openChunks()`;
2. reliable remote mutation outcomes.

This is a compatibility extension, not new sync architecture.

---

## 2. REQUIRED V1.3 SURFACES

Use the existing frozen successors:

- `OperationalFailureProvenanceV1_3`
- `OperationalFailureErrorV1_3`
- `operationalFailureFromDriveSignalV1_3`
- `CoherentRemoteDownloadV1_3`
- `CoherentRemoteReadPortV1_3`
- `RemoteMutationOutcomeV1_3`
- `ReliableRemoteMutationPortV1_3`

Do not create worker-local replacement contracts or string-prefix protocols.

The existing private `DriveContentStreamError` may remain for legacy compatibility, but a V1.3 consumer must be able to extract public provenance without importing that private class.

---

## 3. REQUIRED BEHAVIOR

### A-V13-1 — lazy stream provenance

When a Drive-originating failure occurs during lazy chunk consumption, preserve public V1.3 provenance for:

- authentication-required;
- transient-failure;
- rate-limited, including exact `retryAfterMs`;
- permission-denied;
- quota-exhausted;
- explicit recovery-required.

Arbitrary errors must not be fabricated into those categories.

`not-found` and `conflict` remain contextual and must not become global operational provenance.

### A-V13-2 — coherent reads

Make the production Drive adapter satisfy the V1.3 coherent-read seam while preserving the predecessor seam.

Preserve:

- coherent success;
- true `changed-during-transfer` semantics;
- `outcome-unknown` for unresolved operational failures, with structured provenance when trustworthy.

Do not reinterpret semantic change as network failure.

### A-V13-3 — reliable mutations

Make the approved reliable mutation implementation satisfy `ReliableRemoteMutationPortV1_3`.

Preserve physical truth exactly:

- `verified-effect`;
- `verified-not-applied`;
- `conflict-preserved`;
- `outcome-unknown`.

Attach `operationalFailure` only when the approved V1.3 mapping yields trustworthy context-free provenance.

An auth/transient/rate-limit cause must NEVER convert `outcome-unknown` into `verified-not-applied`.

### A-V13-4 — preserve prior approval

Do not weaken stable IDs, exact revisions/evidence, immutable-candidate updates, folder-create recovery, partial reconciliation, Changes API behavior, resumable upload recovery, cancellation, `drive.file`, same-device auth, or conflict preservation.

---

## 4. SCOPE

Primary authorized production file:
`src/drive/google-drive-port.ts`

If another `src/drive/**` support file is truly required, STOP first and report the exact reason before expanding.

Authorized tests:

- `test/workstreams/drive/phase6-remote-protocol.test.ts`
- one new focused A V1.3 test under `test/workstreams/drive/**` if useful.

Authorized evidence:
`dev/evidence/_ca-output-agt-CA-P6-SYNC-REMOTE-V1.3-EXT-01.md`

Do NOT modify:

- `src/contracts/**`
- `src/local/**`
- D orchestration/product files
- H integration files
- G adversarial model
- canonical `dev/evidence/_ca-output.md`
- package/release metadata.

---

## 5. ACCEPTANCE TESTS

Prove at minimum:

1. lazy authentication failure is publicly extractable without using A's private error type;
2. transient failure preserves its category;
3. rate-limit preserves exact `retryAfterMs = 5000`;
4. arbitrary `Error` creates no fabricated Drive provenance;
5. `not-found` and `conflict` remain contextual;
6. `outcome-unknown + rate-limited` remains physically `outcome-unknown`;
7. `verified-not-applied + authentication-required` preserves both facts;
8. existing approved A regression tests remain green.

Do not weaken assertions.

---

## 6. VERIFICATION

Verify the exact candidate using a disposable GitHub Actions proof branch if needed:

```bash
npm ci
npm run typecheck
npx tsc -p tsconfig.test.json
node --test <compiled focused A V1.3 test(s)>
node --test .test-build/test/phase6-foundation-failure-provenance.test.js
npm run build
git diff --check 7fa9dd2c95f940260594cefa2674963be3a785de...<A_V1_3_EXTENSION_SHA>
```

Also run the existing A-owned Drive regression surface.

If full `npm test` is run, report exact totals honestly; unrelated failures are not authorization to repair another workstream.

---

## 7. EVIDENCE / STOP

Record exact base, contract tree, files changed, mapping rules, focused/regression totals, typecheck/build/diff status, exact source/test SHA, proof run/job/artifact/digest if used, and confirmation that prior A approval remains intact.

Do not modify old A evidence. Do not merge. Do not integrate into H. Do not resume H-U5.

Return for independent supervisor review.

End exactly:

`WORKSTREAM A V1.3 PROVENANCE EXTENSION COMPLETE — PRIOR A APPROVAL PRESERVED — READY FOR SUPERVISOR REVIEW`
