# Phase 6 Synchronization Contract Freeze Candidate

Status: **candidate only — independent supervisor approval pending**  
Contract version: `phase6-sync-foundation-v1.3-failure-provenance`  
Previous supervisor-approved foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`  
Previous frozen contract tree: `4deb82e382f7957c731ef78db52b4164571d57a3`  
Branch: `phase6-sync-foundation-v1.3-failure-provenance`

This manifest does not authorize parallel continuation. The exact supervisor-approved workstream-base SHA will be identified externally after review and must be the single repository snapshot used by every later or resumed affected workstream.

## 1. Frozen files

- `src/contracts/common.ts`
- `src/contracts/synchronization-foundation.ts`
- `src/contracts/synchronization-folder-create-foundation.ts`
- `src/contracts/state.ts`
- `src/contracts/snapshot.ts`
- `src/contracts/plan.ts`
- `src/contracts/local-vault.ts`
- `src/contracts/google-drive.ts`
- `src/contracts/execution.ts`
- `src/contracts/conflict.ts`
- `src/contracts/status-audit-actions.ts`
- `src/contracts/index.ts`

Later agents must not modify `src/contracts/**` independently after approval. Compatibility adapters belong in the owning workstream.

## 2. Frozen callable authority surface

The previously approved v1.2 contract surface remains authoritative except for the additive operational-failure provenance correction below. Existing exact BASE, identity, canonical-content, durable mutation identity, remote-ingestion, local transaction, folder-create, recovery-stage, state-store, and execution-authority contracts remain unchanged in meaning.

### v1.3 operational-failure provenance additions

| Contract | Frozen guarantee | Consumers |
|---|---|---|
| `OperationalFailureProvenance` | Structured operational cause independent of physical-effect certainty. Distinguishes authentication, transient failure, rate limiting, permission, quota, recovery, semantic, and conservative unclassified causes. | A, B, D, H/UI |
| `OperationalFailureError` / `operationalFailureProvenanceFromError` | Public lazy-`BinaryContentSource` failure carrier/extractor. No private A error type, undocumented property, or reason-string grammar is cross-workstream authority. | A, B, D |
| `operationalFailureFromDriveSignal` | Converts frozen `DriveSignal` values into the shared operational provenance representation, preserving rate-limit retry timing. | A |
| `RemoteMutationOutcome.operationalFailure` | Failure variants may retain structured operational provenance while preserving `verified-not-applied`, `conflict-preserved`, and `outcome-unknown` physical distinctions. | A, C, D |
| `LocalTransactionResult.operationalFailure` | Failed/uncertain local transaction results may retain the operational provenance of a lazy remote content failure without changing local physical certainty. | B, C, D |
| `CoherentRemoteDownload.operationalFailure` | Non-coherent/uncertain remote reads may retain operational provenance when applicable. | A, D |
| `ExecutionResult.operationalFailure` | Retry/block/uncertain/recovery execution results can carry operational provenance separately from execution physical/recovery status. | D, H/UI |
| `operationalFailureDisposition` | Provides conservative user/retry disposition. `unclassified`, semantic, and recovery causes are never guessed into retryability. | D, H/UI |

## 3. Fixed mutation lifecycle

Every mutation still satisfies:

`PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE AUTHORITY STORE -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`

Operational failure provenance is carried alongside this lifecycle. It does not replace any stage, proof, or physical-result discriminator.

## 4. Physical certainty versus operational disposition

**Physical-effect certainty and operational-failure provenance are orthogonal authorities.**

Physical certainty answers whether an effect is verified applied, verified not applied, preserved as conflict, or remains outcome-unknown/recovery-required. Operational provenance answers why the operation/read failed or was interrupted and what retry/user disposition may be appropriate.

The same authentication, transient-network, or rate-limit provenance may legitimately accompany either a provably not-applied result or an outcome-unknown result. The provenance therefore cannot collapse those physical states into one another.

**Operational failure provenance may influence retry scheduling and user-facing status, but never proves that a dispatch-authorized/outcome-unknown physical effect was not applied.**

Consequences:

1. `dispatch-authorized` and later uncertain stages still require physical reconciliation on restart.
2. Authentication, transient, and rate-limit causes never authorize blind redispatch.
3. `retryAfterMs` is scheduling guidance only; it is not physical non-application authority.
4. Generic local I/O uncertainty may remain without operational provenance rather than fabricating a remote/network class.
5. Unknown future operational causes are represented conservatively as `unclassified` and map to non-retry/recovery disposition until explicitly classified by a later approved contract.

## 5. Lazy content-source failure contract

A `BinaryContentSource` may fail only after `openChunks()` begins. Such a source may throw the public `OperationalFailureError` carrying `OperationalFailureProvenance`. Consumers extract only through `operationalFailureProvenanceFromError()`.

Cross-workstream code MUST NOT:

- depend on a private Workstream-A `DriveContentStreamError` class;
- inspect an undocumented `driveSignal` property;
- parse free-form error/reason text to infer authentication, transient, rate-limit, permission, quota, or recovery authority.

An arbitrary thrown error that is not the public carrier yields no structured provenance; callers remain physically conservative.

## 6. Remote mutation and local transaction contract

`RemoteMutationOutcome` retains its four existing physical families. Its failure families may additionally carry `operationalFailure`.

`LocalTransactionResult` retains staged/committed/recovered/stale/blocked/outcome-unknown semantics. Its failure family may additionally carry `operationalFailure` when, for example, remote lazy content fails during staging.

Neither addition authorizes physical-state reinterpretation.

## 7. Execution and product disposition

`ExecutionResult` may retain `operationalFailure` on retryable, blocking, uncertain, and recovery-required results. The physical `status` remains authoritative for durable/recovery semantics.

`operationalFailureDisposition()` supplies only operational/user disposition:

- authentication-required -> reauthenticate before retry;
- transient-failure -> bounded backoff/defer;
- rate-limited -> bounded backoff/defer preserving applicable `retryAfterMs`;
- permission/quota -> blocking failure;
- recovery/semantic/unclassified -> recovery-required, no inferred retry.

This mapping cannot convert an `uncertain` execution result into `retryable-failure` and cannot authorize a second dispatch of an unresolved effect.

## 8. Retained invariants

1. Persistence revision and semantic authority remain distinct.
2. File BASE healing requires canonical SHA-256 equality.
3. Folder proof remains structural/identity authority.
4. Remote-ingestion progress cannot discard unresolved learned facts.
5. Duplicate logical paths remain explicit.
6. Existing-object remote content update does not assume undocumented atomic Drive CAS.
7. Dispatch possibility is durable before the external call.
8. Local file create/replace recovery authority remains explicit.
9. Unknown mutation outcome never becomes retryable-not-applied by assumption.
10. Semantic contradiction always has a fail-closed representation.
11. Physical application and logical path convergence remain distinct.
12. Folder-create operation identity and reserved remote identity survive persistence/restart unchanged.
13. Logical completion requires every required physical effect to reach `state-committed`.
14. Physical-effect certainty and operational-failure provenance remain orthogonal.
15. Operational retryability never becomes physical-effect authority.

## 9. Workstream effects

- **A** must emit the public provenance carrier/mapping rather than exposing private error semantics across workstreams.
- **B** can preserve lazy remote-source provenance in `LocalTransactionResult` without depending on A implementation details.
- **C** retains existing physical/recovery state semantics; provenance does not alter durable stage authority.
- **D** can map `RemoteMutationOutcome` / `LocalTransactionResult` to `ExecutionResult` while preserving both dimensions.
- **H/UI** can surface authentication/deferred/rate-limit/recovery disposition from the public execution contract without guessing from strings.
- **G** can adversarially assert that retry guidance never authorizes redispatch of an uncertain effect.

No production workstream is modified by this candidate.

## 10. Cross-contract audit

The v1.3 candidate was audited across `common.ts`, `google-drive.ts`, `local-vault.ts`, `synchronization-foundation.ts`, `synchronization-folder-create-foundation.ts`, `execution.ts`, `state.ts`, `snapshot.ts`, `plan.ts`, `status-audit-actions.ts`, `conflict.ts`, and `index.ts`.

The intended public chain is:

`REMOTE/LOCAL operational failure -> structured public provenance -> safe physical mutation -> durable physical certainty -> authoritative execution result -> retry/auth/offline/recovery disposition`

No operational disposition becomes physical-effect authority anywhere in this chain.

## 11. Contract change rule

If an approved workstream cannot meet acceptance criteria using this surface, it stops and submits `CONTRACT CHANGE REQUEST`. It must not edit, parse around, or shadow the frozen contracts on its branch.

## 12. Approval state

This remains a **candidate**, not an operative freeze. No production branch is authorized to consume it until the independent supervisor explicitly approves the candidate head and identifies that SHA as the new common workstream base.
