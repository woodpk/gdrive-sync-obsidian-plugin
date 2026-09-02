# Agent Evidence — agt-ca-p6-sync-foundation-failure-provenance-01

## Authority

- Exact approved foundation base SHA: `96b4541b15012ac4ce0d81243b73ef779efd343e`
- Exact approved base contract tree: `4deb82e382f7957c731ef78db52b4164571d57a3`
- Candidate branch: `phase6-sync-foundation-v1.3-failure-provenance`
- Candidate implementation SHA before this evidence-only closure commit: `adedff6d3f319160c30228073113c549c3ebddb3`
- Candidate contract tree SHA: `01fe8b84805fe1f78158b13516c7c0ec228816eb`
- Draft verification/review PR: `#47` (not merged; opened only to exercise the ordinary pull-request CI surface and provide supervisor review visibility)
- Approval state: **candidate only**; independent supervisor approval is required.

The final branch candidate SHA is the evidence-closure commit containing this file. A Git commit cannot embed its own SHA in the content from which that same SHA is calculated, so the authoritative final candidate SHA is the branch head of `phase6-sync-foundation-v1.3-failure-provenance` and is reported in the agent completion response.

## Proven deficit

The v1.2 foundation preserved structured `DriveSignal` at the raw REMOTE transport boundary and preserved durable physical outcome/recovery certainty, but the safe physical-mutation chain could collapse operational cause to `reason: string`. In particular, lazy remote download failures consumed by `LocalTransactionalMutationPort.stageAndVerify()` and reliable remote mutation failures had no frozen public structured provenance route into `ExecutionResult`.

A D/H-only repair would therefore have to parse free-form reason strings, depend on Workstream A private error classes/properties such as a private `DriveContentStreamError`/undocumented `driveSignal`, or create a private sidecar/shadow contract. Each would violate the frozen cross-workstream contract model and would leave B/D/H coupled to implementation detail rather than public foundation authority.

## Selected additive contract semantics

- Added shared `OperationalFailureProvenance` with authentication, transient, rate-limit/`retryAfterMs`, permission, quota, recovery, semantic, and conservative unclassified classes.
- Added public `OperationalFailureError` plus `operationalFailureProvenanceFromError()` for lazy `BinaryContentSource` failures.
- Added `operationalFailureFromDriveSignal()` to translate existing frozen Drive transport signals into shared provenance while retaining `retryAfterMs`.
- Added optional structured provenance to the relevant failure variants of `RemoteMutationOutcome`, `LocalTransactionResult`, `CoherentRemoteDownload`, and `ExecutionResult`.
- Restricted `ExecutionResult.retryable-failure` structured provenance to transient/rate-limit causes; authentication, permission, quota, recovery, semantic, and unclassified provenance cannot be explicitly represented as retryable provenance.
- Added `operationalFailureDisposition()` for user/retry disposition without changing physical certainty.
- Unknown/unclassified operational causes map conservatively to recovery-required/no inferred retry.

Core invariant: **physical-effect certainty and operational-failure provenance are orthogonal authorities.** Operational provenance may schedule retry or surface status but never proves that a dispatch-authorized/outcome-unknown effect was not applied and never authorizes blind redispatch.

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

The repository ordinary `npm test` command runtime-discovered these as tests **404–411**. All 8 passed.

## Cross-contract audit

Audited the frozen family:

- `src/contracts/common.ts`
- `src/contracts/google-drive.ts`
- `src/contracts/local-vault.ts`
- `src/contracts/synchronization-foundation.ts`
- `src/contracts/synchronization-folder-create-foundation.ts`
- `src/contracts/execution.ts`
- `src/contracts/state.ts`
- `src/contracts/snapshot.ts`
- `src/contracts/plan.ts`
- `src/contracts/status-audit-actions.ts`
- `src/contracts/conflict.ts`
- `src/contracts/index.ts`

Corrected public chain:

`REMOTE/LOCAL operational failure -> structured public provenance -> safe physical mutation -> durable physical certainty -> authoritative execution result -> retry/auth/offline/recovery disposition`

No operational disposition becomes physical-effect authority. Existing `dispatch-authorized`, `outcome-unknown`, restart reconciliation, local transaction, and verified-effect/not-applied semantics remain authoritative.

## Files changed from the exact approved base

- `src/contracts/common.ts`
- `src/contracts/google-drive.ts`
- `src/contracts/synchronization-foundation.ts`
- `src/contracts/execution.ts`
- `test/phase6-foundation-failure-provenance.test.ts`
- `dev/planning-and-building/phase6-sync-architecture-foundation.md`
- `dev/planning-and-building/phase6-sync-contract-freeze.md`
- `dev/evidence/_ca-output-agt-ca-p6-sync-foundation-failure-provenance-01.md`

No Workstream A, B, C, D, E, F, G, or H production implementation was modified. No integration branch was modified or merged.

## Verification

Verification of implementation SHA `adedff6d3f319160c30228073113c549c3ebddb3` was performed through the repository's ordinary pull-request CI surface in Phase 1 CI run `33665417030`, job `100365828835`. Because the PR base (`master`) is an ancestor of the exact approved foundation, the PR verification checkout contains the candidate head without a competing/divergent base change.

| Requested verification | Observed result |
|---|---|
| `npm ci` | PASS; CI step completed successfully (exit-equivalent success); 16 packages added; 0 vulnerabilities reported. |
| `npm run typecheck` | PASS; CI step completed successfully; `tsc --noEmit`. |
| foundation predictive tests | PASS; runtime-discovered by ordinary `npm test`; 8/8 passed as tests 404–411. |
| `npm test` | PASS; **431 tests / 431 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo**. |
| `npm run build` | PASS; CI step completed successfully; entrypoint, syntax, local-runtime-dependency, mobile-evaluation, and package-shape verification all PASS. Build artifact size `415353`; SHA-256 `02f258642be1595e68052e7de189c1bc64e603f984418cdd65224b982e05a1bd`. |
| `npm run check` | **NOT EXECUTED AS A SINGLE COMMAND IN THIS SESSION.** `package.json` defines it as `npm run typecheck && npm test && npm run build`; all three constituent commands were independently executed by the same CI job and passed. |
| `git diff --check` | **NOT AVAILABLE IN THIS SESSION.** The exposed GitHub/CI surface did not provide that command and the authorized foundation scope did not permit altering CI solely to add it. Repository compare/diff inspection was used instead for scope and patch review. |

The final evidence-only commit does not modify contracts, tests, or production code and therefore does not change the verified candidate implementation or contract tree.

## Scope/diff confirmation

GitHub comparison from exact base `96b4541b15012ac4ce0d81243b73ef779efd343e` to the candidate implementation SHA showed only the eight authorized contract/test/documentation/evidence paths listed above. The candidate was directly based on the exact approved SHA; no `phase6-sync-integration-h` or `phase6-integration` change was used as the base or modified by this work.

## Affected downstream workstreams

- **A:** must map/emit public structured Drive/lazy-content provenance rather than requiring consumers to know private error types/properties.
- **B:** can preserve lazy remote-source provenance in `LocalTransactionResult` without coupling to A implementation details.
- **C:** durable physical stage/recovery authority remains unchanged; provenance is additive and must not reinterpret physical certainty.
- **D:** can map local/remote physical outcomes into `ExecutionResult` while separately retaining operational disposition.
- **G:** can adversarially assert that authentication/transient/rate-limit guidance never authorizes redispatch of an unresolved physical effect.
- **H/UI/integration:** can surface authentication/deferred/rate-limit/permission/quota/recovery behavior from public execution contracts instead of reason strings.

Workstreams E and F have no identified direct contract-consumption change from this correction.

## Candidate status

This branch is **not approved**, **not merged**, and does not authorize downstream production repairs. It is ready only for independent supervisor adversarial review.