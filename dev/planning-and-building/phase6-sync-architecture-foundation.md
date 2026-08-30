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

This is necessary for:

- removed objects whose old path/object relation may be needed later;
- moves represented by repeated changes to one object;
- create-then-delete before path convergence;
- repeated updates across successive batches;
- duplicate/ambiguous logical paths;
- paths that remain unresolved while later batches continue.

Example state transition:

1. learn batch 1 containing removal/object A; path A remains unresolved;
2. durably append batch 2 containing object B changes;
3. durably append batch 3 containing later A/B facts;
4. process dies;
5. restart loads all three learned batches plus path convergence state;
6. reconciliation may compact/retire a batch only after its required facts are represented in trustworthy mappings/BASE/tombstones/path state.

The ingestion watermark therefore never advances by forgetting the only durable representation of unresolved remote reality.

## 6. Remote mutation preservation

### 6.1 Creates

Create retains the predecessor design: durable `MutationIntentId` plus pre-generated `RemoteObjectId`. Ambiguous retry reconciles the same identity rather than creating a duplicate.

### 6.2 Existing-object content updates

Because an atomic Drive v3 content-update CAS was not established, an existing-object update may not use this reasoning:

`observe R0 -> revalidate R0 -> PATCH same object -> observe our bytes -> verified conflict-free success`.

That sequence cannot rule out an intervening RI written after revalidation but before the PATCH. Observing RW afterward proves only current bytes, not absence/preservation of RI.

The frozen candidate therefore requires **immutable-candidate preservation**:

1. persist mutation intent and predecessor object/revision authority;
2. reserve a durable candidate object identity for intended new bytes;
3. materialize/verify new bytes without destructively overwriting the predecessor;
4. re-observe identity/path reality;
5. converge authority/path only while preserving every version whose loss cannot be excluded;
6. return ordinary `verified-applied` only with `RemoteMutationApplicationProof` showing predecessor preservation under the immutable-candidate protocol;
7. otherwise return `conflict-preserved` or `outcome-unknown`.

Revision history/trash may assist recovery but is not the correctness foundation.

## 7. Durable operation dispatch ordering

Operation stages now mean:

`intent-persisted -> dispatch-authorized -> outcome-unknown/effect-verified -> state-committed`

- `intent-persisted`: durable intent exists and durable state still proves dispatch was not authorized. Restart may retire it as unattempted.
- `dispatch-authorized`: this stage is durably written **before** the external mutation call. From this point onward, restart must assume the mutation **may have occurred**, even if the process died before actually entering the call.
- `outcome-unknown`: mutation may have reached the external system and result is not authoritatively known.
- `effect-verified`: durable effect has verification evidence but authoritative state commit is not finished.
- `state-committed`: authoritative state incorporates the verified effect.

Required deterministic fault points distinguish:

1. after intent persistence / before dispatch-authority persistence;
2. after dispatch-authority persistence / before mutation call;
3. after mutation call may have reached external system / before response;
4. after response / before effect verification;
5. after verification / before state commit;
6. local stage/backup/swap boundaries.

No crash window may restart from state claiming "definitely not dispatched" after mutation became possible.

## 8. Local transaction authority

Local replacement remains staged and crash-safe, but durable authority now distinguishes transaction kind and exact target pre-state.

### Create

`mutationKind=create` requires `expectedTarget=expected-absent`. Backup absence is normal unless contradictory target reality appears.

### Replace

`mutationKind=replace` requires `expectedTarget=expected-present` with:

- exact observation token;
- expected file entity kind;
- canonical SHA-256 old-content proof.

The transaction also requires canonical verified new evidence. A missing backup after old-target displacement is therefore abnormal for replace rather than being confused with a create.

At restart, target/stage/backup combinations are interpreted against this durable pre-state authority. Contradiction fails closed to recovery.

## 9. Observation, lifecycle, provenance, cancellation, and resource safety

Preserved predecessor rules:

- observation APIs remain read-only; migration/stamping is explicit mutation;
- events are reconciliation hints, never absence/deletion authority;
- plugin-generated local writes correlate by exact transaction/observation provenance, not timing windows;
- cancellation is cooperative and never substitutes for crash durability;
- no new operation starts while suspending/suspended/unloading;
- automatic text merge requires known bounded input sizes and falls back to preservation/conflict when unknown/oversized;
- Windows/iOS supported boundaries and mobile isolation remain mandatory.

## 10. Semantic state validation

Known critical semantic issue codes remain stable. The contract additionally provides `other-semantic-inconsistency` with a privacy-safe invariant category. This prevents a newly discovered impossible state from being treated as trusted merely because the foundation did not predict a dedicated enum member. Any returned semantic issue yields recovery-required authority rather than ordinary trusted continuation.

## 11. Global invariants

1. No acknowledged LOCAL/REMOTE/common version silently disappears through race, retry, crash, concurrent device mutation, or missed event.
2. Final writer bytes alone never prove a remote update conflict-free when an intervening version could have existed.
3. File BASE healing requires canonical SHA-256 equality and unambiguous current identity.
4. Unknown/unreadable/inaccessible is never authoritative absence or deletion.
5. Stable remote identity is separate from logical path; duplicate candidates remain explicit.
6. Remote-ingestion progress never discards the only durable fact required by unresolved earlier work.
7. Every mutation has durable intent; dispatch possibility becomes durable before the external call.
8. Create/retry uses one reserved remote identity; existing-object update preserves predecessor/concurrent candidates until authority is resolved.
9. Local create/replace pre-state authority is explicit and survives every swap boundary.
10. Persistence revision is not semantic authority.
11. Semantic contradictions fail closed, including newly discovered categories.
12. PR #33 operation-local stale isolation and unrelated safe-path progress remain intact.
13. `drive.file`, same-device authentication, device-local secrets, safe-union first sync, destructive circuit breaker, portable-config isolation, mobile compatibility, and resource-bounded processing remain fixed.
14. When external mutation stops and services eventually succeed, replicas converge or remain explicitly conflicted/recovery-blocked rather than silently losing data or livelocking.

## 12. PR #33 preservation boundary

PR #33 remains open/unmerged and is the reviewed predecessor implementation at `85d509d90d475717d609c559fad870f64b956e9e`. This foundation branch is rooted from that reviewed implementation. Its accepted behaviors are preserved:

- operation-local stale preconditions do not abort unrelated safe work;
- exact known-unmutated pending intent may be retired only from mutation-boundary proof;
- one current observation per side/path is reused within a validation pass;
- local enumeration uncertainty remains all/path/subtree scoped;
- diagnostics expose privacy-safe aggregate precondition evidence.

The corrected foundation broadens future crash/recovery authority but does not reverse any of those behaviors.

## 13. Supervisor finding disposition A–H

| Finding | Disposition in candidate | Correction |
|---|---|---|
| A — remote update preservation | **CONFIRMED AND CORRECTED** | No undocumented CAS; immutable-candidate preservation and application proof required before conflict-free acknowledgment. |
| B — BASE healing proof | **CONFIRMED AND CORRECTED** | Discriminated file/folder/absence common proofs; file proof requires canonical SHA-256 equality. |
| C — local pre-state authority | **CONFIRMED AND CORRECTED** | Create/replace discriminated transaction with exact absent/present authority and canonical old/new evidence. |
| D — multi-batch ingestion | **CONFIRMED AND CORRECTED** | Durable `learnedRemoteBatches[]`; latest-only replacement prohibited until safe reduction. |
| E — dispatch durability | **CONFIRMED AND CORRECTED** | Durable `dispatch-authorized` before call; explicit crash windows and restart meaning. |
| F — approved SHA semantics | **CONFIRMED AND CORRECTED** | Contract version/checkpoint/current candidate/externally approved workstream-base SHA explicitly separated. |
| G — parallel feasibility | **CONFIRMED AND CORRECTED** | Workstream manifest now requires branch-local fakes, frozen cross-owned tests, and branch-local typecheck/build feasibility. |
| H — validation extensibility | **CONFIRMED AND CORRECTED** | Stable known codes plus privacy-safe `other-semantic-inconsistency`. |

No genuine product-authority decision was required to resolve these findings. They are engineering safety corrections within the existing target contract.

## 14. Candidate freeze boundary

The contract version remains `phase6-sync-foundation-v1`; the version label is semantic, not an approval claim. The historical Codex implementation checkpoint `8b575e7439fdd601166e3bdb6e335992364da3fc` is not the future worker base.

After this continuation is finished and independently approved, the supervisor will identify one exact **workstream-base SHA** externally. Every A–G worker must branch from that complete snapshot. Until that explicit approval, this document remains a candidate and parallel implementation is unauthorized.
