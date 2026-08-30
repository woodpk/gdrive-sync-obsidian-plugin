# Phase 6 Synchronization Architecture Foundation

Status: **candidate for independent supervisor review**  
Agent: `agt-CA-P6-SYNC-FOUNDATION-01`  
Foundation branch: `phase6-sync-architecture-foundation`  
Reviewed predecessor: PR #33 at `85d509d90d475717d609c559fad870f64b956e9e`  
Stage: Stage 2A / Phase 6 Alpha  
Parallel implementation: **not authorized**

## 1. Authority and scope

This artifact applies the current target-system specification, decision register, Stage 1 decomposition, frozen Phase 1 contracts, later Phase 6 decisions/evidence, and the accepted behavior represented by PR #33. It does not reopen product discovery, replace the three-way reconciliation model, merge PR #33, or authorize implementation workstreams.

The foundation establishes shared semantic boundaries needed for later non-overlapping work. It deliberately does not complete the Drive, local-platform, state/recovery, orchestration, lifecycle, or merge remediations.

No unresolved product decision was found. The remaining matters are engineering implementation assigned to the later workstreams and subject to supervisor approval of this foundation.

## 2. Official platform/protocol grounding

The following current primary sources materially constrain the architecture:

- Google Drive Changes: an intermediate response can contain `nextPageToken`; only the terminal response supplies `newStartPageToken`, which is stored for the next polling cycle. [Retrieve changes](https://developers.google.com/workspace/drive/api/guides/manage-changes)
- Google Drive generated IDs: a pre-generated ID can be supplied to create/copy; a retry after successful creation returns `409` rather than creating a duplicate. The `drive.file` scope supports `files.generateIds`. [Create and manage files](https://developers.google.com/workspace/drive/api/guides/create-file) and [files.generateIds](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/generateIds)
- Google resumable upload: the session URI is the recovery handle; upload status is queried with an empty `PUT`; `308` reports the accepted range and `200/201` means complete. [Upload file data](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- The current Drive v3 `files.update` reference documents patch/upload behavior but no atomic `version == expected` request precondition. This foundation therefore does not claim that the existing read-compare-later-update sequence is CAS. [files.update](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/update)
- Drive exposes a monotonically increasing file `version`, but it reflects every server-side change. [File resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)
- Revision-specific blob downloads use `revisions.get`, but older blob revisions are downloadable only when retained (`keepForever`) and are subject to ownership/organizer constraints. The normal `files.get?alt=media` operation addresses the current head, not a contractually pinned metadata observation. [Download and export files](https://developers.google.com/workspace/drive/api/guides/manage-downloads) and [Manage file revisions](https://developers.google.com/workspace/drive/api/guides/manage-revisions)
- Obsidian's supported `Vault`/`DataAdapter` and event APIs are cross-platform plugin boundaries, but event delivery is a signal rather than a durable filesystem journal. [Obsidian API](https://github.com/obsidianmd/obsidian-api) and [Vault guide](https://docs.obsidian.md/Plugins/Vault)
- Windows directory notification buffers can overflow; when all changes cannot be recorded, callers must re-enumerate the directory/subtree. [ReadDirectoryChangesW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-readdirectorychangesw) and [Directory change notifications](https://learn.microsoft.com/en-us/windows/win32/fileio/obtaining-directory-change-notifications)
- iOS normally suspends background apps, may terminate suspended scenes to reclaim resources, and requires cancellation/expiration handling for bounded background tasks. [Managing your app's life cycle](https://developer.apple.com/documentation/uikit/managing-your-app-s-life-cycle), [Preparing for background](https://developer.apple.com/documentation/uikit/preparing-your-ui-to-run-in-the-background), and [Background execution time](https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time)

## 3. Authoritative system model

### 3.1 Truth domains

The system has four distinct truth domains:

1. **LOCAL observation truth** — a current cross-platform observation with stability and, for content mutation, canonical evidence. Local events are hints that request reconciliation; they are not durable truth.
2. **REMOTE observation and ingestion truth** — complete Drive listing/observation and durably learned change-feed records. A remote logical path can be absent, uniquely represented, or ambiguous.
3. **BASE/common authority** — exact content/identity facts proven common to LOCAL and REMOTE. BASE is not a timestamp and not merely whatever was last persisted.
4. **Persistence truth** — the byte-document revision used for compare-and-swap. It protects serialization but does not itself prove that a BASE fact remains current.

### 3.2 Two revision domains

`PersistenceRevision` (the compatibility alias for the existing `StateRevision`) sequences state-document writes. Journal-only, diagnostic, or other non-semantic writes may change it.

`SemanticStateGeneration` changes when synchronization authority changes: BASE, tombstones, identity mappings, path convergence facts, or durably learned remote state. A plan that depends on history captures this generation plus an exact per-path `BaseFingerprint`.

A write may change persistence revision without changing semantic generation. A stale persistence CAS forces the write to retry/reload; it does not automatically invalidate an otherwise unchanged semantic plan. A changed semantic generation or mismatched exact BASE fingerprint invalidates the history-dependent operation.

### 3.3 Common-state healing

If current stable LOCAL and coherent REMOTE are cryptographically equal and their entity identity/path relationship is unambiguous, equality proves a common version even when stored BASE is older. The state layer may commit a **BASE-healing transition** without rewriting content.

Required evidence:

- canonical content equality for files (SHA-256 and size when available);
- matching entity kind;
- unambiguous remote object identity and logical path;
- complete/authoritative absence evidence where deletion is involved;
- current exact observations at the commit boundary;
- no conflicting pending/uncertain intent for that path.

This handles transfer-completed/process-died-before-BASE-commit without indefinitely retaining an obsolete merge base.

### 3.4 Remote ingestion and path convergence

Drive change ingestion is a durable learning pipeline, not a synonym for path convergence.

1. Begin at a persisted terminal start token.
2. Read every page. An intermediate page yields only `nextPageToken`; the terminal page yields only `newStartPageToken`.
3. Normalize repeated object entries in feed order without collapsing distinct objects that claim the same logical path.
4. Durably checkpoint the complete learned batch and terminal start token.
5. Reconcile affected paths independently.

The ingestion watermark may advance only after all pages and learned records are durable. It need not wait for every path to converge. Unresolved paths retain explicit convergence/attention state and are retried from durable learned evidence. This prevents one conflicted path from pinning later Drive changes while also preventing skipped changes.

### 3.5 Remote identity and mutation

Stable Drive object identity and vault-relative logical path are separate. Every lookup returns `absent`, `unique`, or `ambiguous`; ambiguity carries all candidates and never chooses an arbitrary winner.

Remote create uses a durable `MutationIntentId` and pre-generated `RemoteObjectId`. A repeated create with that reserved ID is reconciled as the same intent. A lost/ambiguous response becomes `outcome-unknown` and must be reconciled by identity before retry or commit.

The architecture does not claim an atomic Drive version CAS for updates. The Drive workstream must implement a conflict-preserving protocol: persist exact intent, revalidate identity/revision immediately before dispatch, classify ambiguous response as unknown, then re-observe and verify. If an intervening edit cannot be excluded, preserve both versions or surface conflict; never acknowledge silent overwrite as common state.

### 3.6 Operation and restart state machine

Every mutating operation has a durable intent before dispatch:

`intent-persisted -> mutation-dispatched -> effect-verified -> state-committed`

Any lost/ambiguous response enters `outcome-unknown`.

On restart:

- `intent-persisted`, `mutation-dispatched`, or `outcome-unknown`: inspect physical LOCAL/REMOTE reality under exact intent identity and classify applied/not-applied/ambiguous;
- `effect-verified`: revalidate the verification reference and finish authoritative state commit;
- `state-committed`: no mutation recovery remains;
- any unprovable or contradictory state: global recovery, not an assumed retry.

The recovery consumer runs before new automatic mutation authority is granted.

### 3.7 Local replacement transaction

Existing valid local data is not surrendered before new staged data is cryptographically verified. The durable local transaction stages are:

`staging -> staged-unverified -> staged-verified -> backup-established -> swap-committed -> cleanup-pending -> completed`

The transaction records target, stage, backup, operation identity, expected old observation, and expected new evidence in plugin-owned durable state. Restart either discards an unverified stage, verifies it, restores/completes a swap, or cleans a verified backup. At every durable boundary the old data, verified new data, or sufficient recovery metadata remains available.

Temporary/staging artifacts remain outside synchronization scope.

### 3.8 Observation and migration

Observation methods are read-only. Provenance stamping or protocol migration is an explicit, idempotent mutation with intent/outcome/recovery semantics. A list, observe, or Changes read must not silently PATCH Drive.

### 3.9 Events, lifecycle, cancellation, and self-mutation

Windows/iOS events request reconciliation but never grant deletion or convergence authority. Startup/resume and periodic/verification opportunities provide recovery from missed events. Watcher overflow, delayed/missing iOS events, preserved mtime, same-size rewrites, external-editor replacement, and lock/access failures all resolve through observation/enumeration, never through event inference.

Plugin-generated local mutations carry exact operation/transaction provenance. Matching events may be coalesced only when the resulting observation token/evidence matches the mutation receipt. Timing-window suppression is prohibited because it can hide concurrent user edits.

Cancellation is cooperative and distinct from crash safety. Cancellation signals propagate through planners/transfers/mutations where bounded interruption is possible, but correctness never depends on observing cancellation before iOS suspension or process death. No new operation begins after lifecycle enters suspending/suspended/unloading. In-flight work either reaches a durable boundary or is recovered from its journal.

### 3.10 Resource-bounded text merge

Automatic text merge requires known input sizes within a configured per-version and combined budget. Unknown or oversized input is not materialized for automatic merge; both versions are preserved and surfaced as conflict/attention. Later implementation may use a more bounded algorithm, but may not remove the fail-closed resource policy.

## 4. Global invariants

1. No acknowledged durable/common version silently disappears through race, retry, crash, termination, missed event, or concurrent device mutation.
2. A path-local problem does not starve unrelated safe paths unless global authority is compromised.
3. Unknown/unreadable/inaccessible is never authoritative absence or deletion.
4. BASE contains only authoritatively common facts and can heal when current equality is proved.
5. Stable remote identity is separate from logical path; ambiguity is explicit.
6. A terminal remote-ingestion watermark advances only after the entire batch is durable; path convergence is tracked separately.
7. Every mutation has durable intent and recoverable outcome semantics.
8. Ambiguous create retry cannot create a second logical operation.
9. Local destructive swap follows stage verification and has restart metadata.
10. When external mutation stops and services eventually succeed, replicas converge or remain explicitly conflicted/recovery-blocked, never silently livelocked.
11. All required behavior is valid on Obsidian Windows and iOS; indefinite iOS background execution is never assumed.
12. `drive.file`, same-device authentication, device-local secrets, safe-union first sync, destructive circuit breaker, portable-config isolation, and PR #33 path-local progress semantics remain intact.

## 5. PR #33 preservation and replacement boundaries

PR #33 remains the reviewed predecessor and is not merged by this branch. Its valid behaviors are preserved:

- operation-local stale preconditions are isolated and do not force controller self-replan;
- exact pending intent can be retired only after mutation-boundary proof that no mutation occurred;
- one observation per side/path is reused within one precondition-validation pass;
- local enumeration uncertainty is scoped to all/path/subtree rather than contaminating unrelated paths;
- diagnostics expose aggregate precondition kind/side, not vault paths.

The later recovery contract broadens pending-intent handling across process restart; it does not reverse PR #33's exact safe-retirement rule. The semantic generation and exact BASE contracts replace the prior assumption that persistence revision or `base-trusted` existence alone is execution authority.

## 6. Finding disposition register

| # | Disposition | Objective repository evidence | Governing correction / owner |
|---|---|---|---|
| 9.1 | **CONFIRMED ARCHITECTURAL HAZARD** | `StateCommitCoordinator` increments `stateRevision` for journal writes, while `base-trusted` only loads any trusted document. CAS sequencing and semantic authority are conflated. | Distinct persistence revision, semantic generation, exact BASE authority. C + D. |
| 9.2 | **CONFIRMED DEFECT** | Planner emits `equal-current-content` `noop` when LOCAL==REMOTE with existing BASE; `applySuccessfulOperation` does not update BASE for that noop reason. | Explicit BASE-healing transition. C + D. |
| 9.3 | **CONFIRMED DEFECT** | Persisted `pending`/`uncertain` entries are stored but neither state load nor run entry consumes them before new work. | Recoverable intent stages and mandatory restart consumer. C. |
| 9.4 | **CONFIRMED DEFECT** | Controller advances `changeCursor` only on wholly complete execution; any path attention keeps old cursor and can replay/pin subsequent changes. | Durable learned-change checkpoint separate from path convergence. A + C + D. |
| 9.5 | **CONFIRMED DEFECT** | `readChanges` maps `nextPageToken ?? newStartPageToken` into one `nextCursor` and labels one page complete; assembler reads one page. | Discriminated intermediate/terminal pages and whole-batch durability. A. |
| 9.6 | **CONFIRMED DEFECT** | Adapter GETs `version`, compares it, then later starts PATCH upload; no atomic documented version precondition binds the mutation. | Conflict-preserving intent/revalidate/re-observe protocol; no invented CAS. A + D. |
| 9.7 | **CONFIRMED DEFECT** | Create uses server-assigned IDs; a lost successful response followed by retry can create a duplicate name/object. | Pre-generated ID + durable mutation intent. A + C. |
| 9.8 | **CONFIRMED DEFECT** | Path traversal detects duplicates, but snapshot assembly constructs `Map(path -> entry)` and can collapse distinct listed objects. | `RemoteLogicalPathResolution` retains all candidates. A + D. |
| 9.9 | **CONFIRMED DEFECT** | Executor's `identity-unambiguous` branch is `continue`; it proves nothing at execution. | Executable identity proof or removal/replacement of nominal precondition. A + D. |
| 9.10 | **CONFIRMED DEFECT** | `base-trusted` validates only that some trusted state loads; no exact path BASE fact/generation is checked. | `ExactBaseAuthority` generation + fingerprint. C + D. |
| 9.11 | **CONFIRMED ARCHITECTURAL HAZARD** | Local replace renames target to randomized backup, then stage to target; transaction metadata is not durable/recovered after process death. | Persistent local transaction stages and restart action. B + C. |
| 9.12 | **CONFIRMED DEFECT** | Inner adapter swaps staged bytes first; canonical wrapper hashes/re-observes only afterward. | Verify staged content before backup/swap. B. |
| 9.13 | **CONFIRMED DEFECT** | Metadata is read once, but every range request reads current file head; no revision pin or end-to-end pre-swap content proof binds all chunks. | Coherent remote-version transfer proof; otherwise unknown/conflict. A + B. |
| 9.14 | **CONFIRMED DEFECT** | list/change paths call `ensureDomainProvenance`, which PATCHes app properties during observation. | Read-only observation; explicit idempotent provenance migration. A. |
| 9.15 | **CONFIRMED ARCHITECTURAL HAZARD** | Full local enumeration can recover missed events when a run occurs, but events/lifecycle have no explicit overflow/missed-event authority model and runs may be disabled/delayed. | Events as hints, mandatory reconciliation opportunities, platform fault tests. B + E. |
| 9.16 | **CONFIRMED ARCHITECTURAL HAZARD** | Local adapter emits the same events for plugin and user writes; no exact mutation provenance is correlated. | Exact transaction/receipt provenance, no time-window suppression. B + E. |
| 9.17 | **CONFIRMED ARCHITECTURAL HAZARD** | Cancellation is checked between operations; transfer and mutation ports accept no cancellation signal. iOS may suspend before completion. | Portable cancellation signal plus crash-safe journal semantics. A + B + C + E. |
| 9.18 | **CONFIRMED DEFECT** | Three-way merge builds an O(n*m) LCS matrix; retained/downloaded text is accumulated in unbounded strings with no policy gate. | Fail-closed merge resource contract and bounded implementation. F. |
| 9.19 | **CONFIRMED DEFECT** | Production never transitions `knownDevices[].stale`; only initial false values and test fixtures exist. | Explicit reconciliation epoch/lease or signed device-seen authority and lifecycle policy. C + E. |
| 9.20 | **CONFIRMED DEFECT** | State validation checks basic arrays/IDs and a few uniqueness constraints, but not active-device presence, mapping/BASE consistency, BASE/tombstone overlap, journal completeness, or ingestion consistency. | Semantic validator issue contract and recovery on inconsistency. C. |

No finding was falsified by current code. Several existing defenses reduce impact, as noted, but do not satisfy the full invariant.

## 7. Shared contract overview

The candidate frozen surface is in:

- `src/contracts/common.ts`: persistence/semantic generation and stable identity brands;
- `src/contracts/synchronization-foundation.ts`: exact BASE authority, ingestion pages/checkpoints, convergence state, remote ambiguity/mutation identity, restart journal, local transaction, provenance, cancellation/lifecycle, fault points, merge policy, semantic validation;
- callable workstream seams in that module: `ReliableRemoteChangePort`, `ReliableRemoteMutationPort`, `CoherentRemoteReadPort`, `LocalTransactionalMutationPort`, and `SynchronizationAuthorityStore`;
- `src/contracts/index.ts`: public export.

Compatibility is intentional: existing `StateRevision` remains available and aliases the persistence concept. Current production behavior is unchanged by this foundation. Later workstreams must migrate implementation behind the new interfaces rather than invent alternative semantics.

## 8. Major integration transitions

1. State workstream adds semantic generation, validated durable ingestion/journal/local-transaction records, and migration/recovery.
2. Drive workstream implements lossless multipage ingestion, reserved-ID create, coherent transfer, explicit ambiguity, and explicit provenance migration.
3. Local workstream implements verified staged replacement/recovery and exact self-mutation provenance across Windows/iOS.
4. Reconciliation consumes those seams for BASE healing, exact authority checks, learned-change/path-convergence separation, and dependency isolation.
5. Runtime propagates lifecycle/cancellation and guarantees reconciliation opportunities.
6. Merge workstream applies bounded resource policy.
7. Adversarial workstream tests the integrated behavior through the frozen fault seams.

The precise ownership and integration order are in `phase6-sync-parallel-workstreams.md`.

## 9. Deferred engineering work

The following are intentionally not implemented here:

- state schema migration and production semantic validator;
- Drive multipage loop/checkpoint persistence and duplicate-safe mutation protocol;
- local durable transaction store/restart repair;
- orchestration migration to exact authority proofs and BASE healing;
- lifecycle cancellation propagation;
- bounded merge algorithm/threshold selection;
- full deterministic two-device/crash simulator.

These are bounded engineering tasks, not unresolved product decisions. They may begin only after independent supervisor approval.
