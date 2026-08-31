# Phase 6 Synchronization Architecture Foundation

Status: **corrected candidate for independent supervisor re-review**  
Predecessor foundation agent: `agt-CA-P6-SYNC-FOUNDATION-01`  
Continuation agent: `agt-CA-P6-SYNC-FOUNDATION-CLOUD-01`  
Foundation branch: `phase6-sync-architecture-foundation`  
Reviewed predecessor: PR #33 at `85d509d90d475717d609c559fad870f64b956e9e`  
Stage: Stage 2A / Phase 6 Alpha  
Parallel implementation: **not authorized**

## 1. Authority and continuation scope

This is a re-entry correction of the existing Codex foundation, not a replacement architecture. The target-system specification, decision register, Stage 1 decomposition, Phase 1 shared contracts, current repository, PR #33 accepted behavior, and current manual remain authoritative.

The following predecessor foundation decisions are preserved: LOCAL/REMOTE/BASE/common separation; persistence revision versus semantic generation; exact BASE authority; BASE healing; remote-ingestion versus path-convergence separation; discriminated Drive pages; duplicate-path ambiguity; durable mutation identity; explicit unknown mutation outcome; restart recovery state; local transaction stages; exact local mutation provenance; cancellation distinct from crash safety; lifecycle state; deterministic fault points; resource-bounded text merge; semantic state validation; A–G workstream strategy; and PR #33 operation-local stale isolation.

This continuation corrects only shared semantic authority that was too weak to freeze safely. It does not implement Workstreams A–G.

## 2. Current official protocol grounding

Primary sources materially constraining this corrected candidate:

- Drive `changes.list` distinguishes intermediate `nextPageToken` from terminal `newStartPageToken`: https://developers.google.com/workspace/drive/api/guides/manage-changes
- Drive `files.generateIds` supports pre-generated identities for retry-safe create families: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/generateIds
- Drive resumable upload status recovers transport progress, but does not itself prove a content-version compare-and-swap: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Drive v3 `files.update` documents metadata/content update parameters but does **not** document a Drive-specific expected-`File.version` or `If-Match` atomic precondition for this file-content update path: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/update
- Drive `File.version` is monotonically increasing and reflects server-side changes, but observation of a version before a later update is not itself atomic mutation authority: https://developers.google.com/workspace/drive/api/reference/rest/v3/files
- Blob revisions can assist recovery, and selected revisions can be retained where supported, but ordinary older revisions may be purged; target requirement REM-010 already forbids correctness from depending on version history: https://developers.google.com/workspace/drive/api/guides/manage-revisions

No current official Drive-specific evidence reviewed for this continuation establishes that the product's existing `GET version -> compare -> later PATCH/upload` sequence is atomic CAS. The foundation therefore must assume it is **not** CAS.

## 3. Truth and revision domains

### 3.1 Truth domains

1. **LOCAL observation truth** — current, platform-safe observation; file content authority requires canonical evidence.
2. **REMOTE observation/ingestion truth** — current Drive observations plus durably learned Changes facts; logical path may be absent, unique, or ambiguous.
3. **BASE/common authority** — exact facts proven common; never timestamp winner state.
4. **Persistence truth** — serialized document CAS sequence; not semantic synchronization authority.

### 3.2 Revision separation

`PersistenceRevision` sequences state-document writes. `SemanticStateGeneration` changes only when synchronization authority changes. History-dependent work binds semantic generation plus exact per-path BASE fingerprint. A persistence-only CAS retry does not by itself invalidate unchanged semantic authority.

## 4. Common/BASE authority

BASE may heal only from current authoritative common state.

### Files

A file common-state proof is discriminated as `file-common` and requires:

- current local observation token;
- unambiguous remote object ID;
- current remote revision;
- canonical SHA-256 content proof;
- exact equality of LOCAL and REMOTE canonical hash and size.

Size, timestamp, path, object identity, or optional generic content evidence alone cannot heal file BASE.

### Folders

Structural/folder equality uses a separate `folder-common` proof. File-content proof is neither required nor accidentally implied.

### Absence

Two-sided absence uses `absence-common`: reliable local absence plus explicit complete remote-absence authority. Incomplete enumeration or read/access failure cannot authorize it.

## 5. Lossless remote ingestion and path convergence

Remote feed ingestion and per-path convergence remain independent.

A terminal Changes token may be advanced only after the corresponding complete batch is durable. The durable authority state now retains `learnedRemoteBatches[]`, not only one latest batch. A later batch may not replace an unresolved earlier batch until every fact from the earlier batch needed for reconciliation has been durably reduced into other authoritative state.

This is necessary for removals, moves, create-then-delete, repeated changes, duplicate/ambiguous paths, and long-lived unresolved paths while later batches continue.

## 6. Remote mutation preservation

### 6.1 Creates

Create retains durable `MutationIntentId` plus pre-generated `RemoteObjectId`. Ambiguous retry reconciles the same identity rather than creating a duplicate.

### 6.2 Existing-object content updates

Because an atomic Drive v3 content-update CAS was not established, an existing-object update may not use this reasoning:

`observe R0 -> revalidate R0 -> PATCH same object -> observe our bytes -> verified conflict-free success`.

The frozen candidate therefore requires immutable-candidate preservation: persist predecessor authority and exact intended canonical bytes, reserve a durable candidate object identity, materialize and verify those bytes without destructively overwriting the predecessor, then separately determine path convergence while preserving any independent concurrent candidate.

Revision history/trash may assist recovery but is not the correctness foundation.

## 7. Durable operation dispatch ordering

Operation stages mean:

`intent-persisted -> dispatch-authorized -> outcome-unknown/effect-verified -> state-committed`

`dispatch-authorized` is durably written before the external mutation call and means the mutation may have occurred. Once this stage is durable, restart must reconcile physical reality rather than classify the operation definitely unattempted.

## 8. Local transaction authority

Local replacement remains staged and crash-safe. Create carries authoritative expected absence. Replace carries expected presence with exact observation token and canonical old-content proof. Both require canonical new-content proof. Backup expectations therefore differ deterministically across create versus replace recovery.

## 9. Observation, lifecycle, provenance, cancellation, and resource safety

Preserved predecessor rules:

- observation APIs remain read-only;
- events are reconciliation hints, never absence/deletion authority;
- plugin-generated local writes correlate by exact provenance, not timing windows;
- cancellation is cooperative and never substitutes for crash durability;
- no new operation starts while suspending/suspended/unloading;
- automatic text merge requires bounded known inputs and otherwise preserves/conflicts;
- Windows/iOS boundaries remain mandatory.

## 10. Semantic state validation

Known critical semantic issue codes remain stable. `other-semantic-inconsistency` supplies a privacy-safe fail-closed extension category for newly discovered impossible state.

## 11. Global invariants

1. No acknowledged LOCAL/REMOTE/common version silently disappears through race, retry, crash, concurrent device mutation, or missed event.
2. Final writer bytes alone never prove a remote update conflict-free when an intervening version could have existed.
3. File BASE healing requires canonical SHA-256 equality and unambiguous current identity.
4. Unknown/unreadable/inaccessible is never authoritative absence or deletion.
5. Stable remote identity is separate from logical path; duplicate candidates remain explicit.
6. Remote-ingestion progress never discards the only durable fact required by unresolved earlier work.
7. Every mutation has durable intent; dispatch possibility becomes durable before the external call.
8. Local create/replace pre-state authority is explicit and survives every swap boundary.
9. Persistence revision is not semantic authority.
10. Semantic contradictions fail closed.
11. PR #33 operation-local stale isolation remains intact.

## 12. PR #33 preservation boundary

PR #33 remains open/unmerged and is the reviewed predecessor implementation at `85d509d90d475717d609c559fad870f64b956e9e`. Its accepted operation-local stale isolation, pending-intent retirement, per-pass observation coherence, scoped uncertainty, and diagnostic privacy remain preserved.

## 13. Supervisor finding disposition A–H

Findings A–H remain **CONFIRMED AND CORRECTED**. This reject/fix pass does not reopen them.

## 14. Candidate freeze boundary

The contract version remains `phase6-sync-foundation-v1`; it is semantic, not an approval claim. The historical Codex checkpoint is not the worker base. After independent approval, the supervisor will externally identify one exact complete workstream-base SHA. Parallel implementation remains unauthorized until then.

## 15. Reject/fix R1–R6 lifecycle corrections — superseding authority

This section supersedes any earlier wording in this document that conflicts with it.

### R1 — exact plan authority

The legacy planner DTO may still contain compatibility-only `base-trusted` / `identity-unambiguous` markers, but those markers are **not executable authority**. The frozen execution path accepts only `ExecutablePlannedOperation`, whose preconditions structurally exclude those nominal markers and can carry `ExactBaseAuthority` and `IdentityAuthorityProof` directly. Workstream D must migrate any history/identity-dependent operation to exact authority before it can enter the authoritative executor/committer seam.

### R2 — recoverable physical mutation descriptors

`RecoverableOperationIntent` now persists physical effects, not merely a path and operation bit. A single-effect operation carries one durable effect. A clean merge carries at least two separately staged effects. The durable descriptors cover local file create/replace, remote file create/update, move with side/from/to/identity, and trash with exact deletion/BASE authority. Restart therefore does not require the pre-crash in-memory `PlannedOperation` to know what may have happened.

### R3 — every remote mutation uses the safe seam

`ReliableRemoteMutationPort` covers reserved file/folder create, preservation-safe file content update, identity-preserving move, and trash. All return explicit verified-effect / verified-not-applied / conflict-preserved / outcome-unknown states. The raw `GoogleDrivePort.create/update/move/trash` methods are compatibility transport primitives only and are non-authoritative for the new synchronization path. Workstream A owns the adapter; Workstream D consumes only the safe port.

### R4 — materialization is not convergence

`RemoteMutationApplicationProof` proves only that a physical candidate/effect was safely verified without destructive loss. `RemotePathConvergenceAuthority` separately answers whether the logical path is conflict-free. If R0, independent RI, and writer candidate RW all exist, RW may be safely materialized while the path remains `conflict-preserved`. Ordinary convergence requires both verified application and explicit conflict-free convergence authority.

### R5 — exact intended remote content survives restart

Every remote file-content create/update identity durably binds canonical SHA-256 plus byte size for the exact intended bytes before dispatch. Lost-response recovery verifies the candidate against that persisted intended evidence, not against whatever LOCAL contains after restart.

### R6 — missed event plus unchanged metadata cannot become permanent authority

Workstream B must implement `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()`. Verify/Reconcile and policy-selected integrity sweeps must eventually use an authoritative cache-bypassing byte read. Thus a same-size modification with unchanged/preserved mtime, missed watcher event, and unchanged cached observation token may temporarily evade the fast path but cannot remain permanent stale authority. Workstream G must model this exact scenario.

## 16. Mutation lifecycle cross-contract audit

For every v1 mutating plan kind the frozen chain is now complete:

`PLAN -> exact execution authority -> durable operation/effect intent -> durable dispatch authority -> local/remote safe mutation port -> physical verification -> path convergence/conflict -> BASE/state commit -> restart recovery`.

- upload-create/update: exact intended content is durable; remote create/update use safe identities/outcomes.
- download-create/update: exact remote read feeds a local create/replace transaction with durable pre-state and intended new evidence.
- remote move: durable side/from/to/object/identity descriptor plus safe remote move outcome.
- local move: durable side/from/to/identity descriptor; Workstream B provides physical semantics and C persists stage/effect authority.
- remote trash: durable remote object plus exact BASE/deletion/identity authority and safe trash outcome.
- local trash: durable local path plus exact BASE/deletion authority.
- clean text merge: one logical operation coordinates two or more separately staged physical effects; one-side completion can never imply logical completion.

No v1 mutation requires a private sidecar contract or the pre-crash in-memory plan to reconstruct unfinished physical intent.
