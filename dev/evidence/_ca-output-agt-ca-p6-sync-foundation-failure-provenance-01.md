# Agent Evidence — agt-ca-p6-sync-foundation-failure-provenance-01

## Authority

- Exact base SHA: `96b4541b15012ac4ce0d81243b73ef779efd343e`
- Exact base contract tree: `4deb82e382f7957c731ef78db52b4164571d57a3`
- Candidate branch: `phase6-sync-foundation-v1.3-failure-provenance`
- Approval state: candidate only; independent supervisor approval required.

## Proven deficit

The v1.2 foundation preserved structured `DriveSignal` at the raw REMOTE transport boundary and preserved durable physical outcome/recovery certainty, but the safe physical mutation chain could collapse operational cause to `reason: string`. In particular, lazy remote download failures consumed by `LocalTransactionalMutationPort.stageAndVerify()` and reliable remote mutation failures had no frozen public structured provenance route into `ExecutionResult`.

A D/H-only repair would therefore have to parse reason strings, depend on Workstream A private error classes/properties, or create a sidecar/shadow contract. Each would violate the frozen cross-workstream contract model.

## Selected additive contract semantics

- Added shared `OperationalFailureProvenance` with authentication, transient, rate-limit/`retryAfterMs`, permission, quota, recovery, semantic, and conservative unclassified classes.
- Added public `OperationalFailureError` plus `operationalFailureProvenanceFromError()` for lazy `BinaryContentSource` failures.
- Added `operationalFailureFromDriveSignal()` to translate existing frozen Drive transport signals.
- Added optional structured provenance to failure variants of `RemoteMutationOutcome`, `LocalTransactionResult`, `CoherentRemoteDownload`, and `ExecutionResult`.
- Added `operationalFailureDisposition()` for user/retry disposition without changing physical certainty.
- Unknown/unclassified operational causes map conservatively to recovery-required/no inferred retry.

Core invariant: physical-effect certainty and operational-failure provenance are orthogonal authorities. Operational provenance may schedule retry or surface status but never proves that a dispatch-authorized/outcome-unknown effect was not applied and never authorizes blind redispatch.

## Predictive tests

Added `test/phase6-foundation-failure-provenance.test.ts` covering:

1. authentication during lazy download;
2. transient lazy download failure;
3. rate limiting preserving exact `retryAfterMs = 5000`;
4. generic local I/O uncertainty without fabricated network provenance;
5. remote mutation lost response retaining physical uncertainty plus provenance;
6. verified-not-applied versus outcome-unknown remaining distinct under identical provenance;
7. execution boundary preserving physical recovery truth separately from user/retry disposition;
8. unclassified future operational cause failing conservatively.

## Cross-contract audit

Audited the frozen family: `common.ts`, `google-drive.ts`, `local-vault.ts`, `synchronization-foundation.ts`, `synchronization-folder-create-foundation.ts`, `execution.ts`, `state.ts`, `snapshot.ts`, `plan.ts`, `status-audit-actions.ts`, `conflict.ts`, and `index.ts`.

Expected chain after correction:

`REMOTE/LOCAL operational failure -> structured public provenance -> safe physical mutation -> durable physical certainty -> authoritative execution result -> retry/auth/offline/recovery disposition`

No production Workstream A–H implementation is modified by this candidate.

## Files changed

- `src/contracts/common.ts`
- `src/contracts/google-drive.ts`
- `src/contracts/synchronization-foundation.ts`
- `src/contracts/execution.ts`
- `test/phase6-foundation-failure-provenance.test.ts`
- `dev/planning-and-building/phase6-sync-architecture-foundation.md`
- `dev/planning-and-building/phase6-sync-contract-freeze.md`
- `dev/evidence/_ca-output-agt-ca-p6-sync-foundation-failure-provenance-01.md`

## Verification

Verification will be executed against the candidate through the repository CI surface after the candidate commit is created. Exact command results/test totals and the final candidate/contract-tree SHA will be appended before completion.
