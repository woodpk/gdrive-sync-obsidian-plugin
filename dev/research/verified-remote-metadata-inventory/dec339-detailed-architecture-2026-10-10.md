# DEC-339 — Verified Per-Device Metadata Inventory: Detailed Architecture

**Status:** Engineering design, implementation-ready subject to independent architecture review and PHX-CI implementation gates; **no implementation, acceptance, deployment, or physical mutation implied**  
**Date:** 2026-10-10  
**Repository baseline:** `woodpk/gdrive-sync-obsidian-plugin` at `ce2a7accb80f12334ae50cbb73d46fb97dbe96fa`  
**Authority:** DEC-339 in `dev/authority/decision-register.yaml`; BRAIN Target Specification §7.9, §3.6–3.9, §6–9; retained STATE-001–017, CHANGE-004–007, REM-001–010, INV-001–020; current WS-02/03/05/07 architecture and BVP boundary lock.  
**Purpose:** Freeze the smallest implementation-ready cross-workstream design that can reuse verified remote metadata without weakening any physical-effect, BASE/history, uniqueness, recovery, or destructive-operation proof.

## 1. Grounded baseline and why this is a new component

1. `src/state/indexeddb-state-storage.ts` currently opens `brain-google-drive-sync:<vaultIdentity>:<deviceIdentity>` at IndexedDB version **1**, one `sync-state` object store and one `current-state` key. Its `compareAndSwap` reads and writes a complete byte-envelope within a single read-write transaction. `src/state/persistent-state-store.ts` parses a checksummed envelope, preserves product `schemaVersion=1`, authority `authoritySchemaVersion=2`, `persistenceRevision` and `semanticGeneration`, and validates BASE, remote mappings, tombstones, learned Changes batches, operation intents and effects. **A new multi-store transaction API is required**; the current single-key CAS does not atomically commit inventory rows with its cursor.
2. `src/product/snapshot-assembler.ts` currently forms the incremental remote projection by starting with **trusted BASE remote entries**, replaying `learnedRemoteBatches`, then consuming Changes pages to a terminal token. It constructs all-path `PathSnapshot[]`; ambiguously duplicated remote path entries become `unknown`. No complete, independent observation inventory is persisted today. BASE is historical synchronization authority, **not** proof of an exhaustive current remote namespace.
3. `src/product/product-controller.ts::persistLearnedRemoteBatch` persists learned change reductions and then mirrors a terminal cursor through another state save. `src/product/product-controller-base.ts` has an additional end-of-run `commitCursor` path. The new design must reconcile both existing paths; **neither may advance a usable inventory cursor without the matching inventory commit**.
4. `src/drive/google-drive-port.ts` already implements `getStartCursor`, `readChangePage`, a full two-domain `listForReconciliation`, exact-ID reads, path/parent resolution, managed-root/account checks, provenance validation, duplicate-aware candidate enumeration, and outcome-specific mutation/recovery reads. `readChangeRaw` currently uses a **process-local `pathCache`** for `removed` events; the inventory must supply durable ID→last-known-path evidence, with unknown removals staying unknown.
5. `src/product/authoritative-production-executor-base.ts::verifyRemote` presently calls **complete full-tree reconciliation** to prove per-effect convergence. `src/product/durable-intent-recovery-base.ts` independently requires verified resolution of outstanding effects. New targeted proofs are permissible only as stronger/equivalent substitutions, not silent removal of those checks.
6. `src/product/runtime.ts` constructs device-scoped IndexedDB authority state, independent IndexedDB text-version retention, existing Drive boundary and a single product planner/executor. Inventory MUST remain subordinate to these components. Production source may not import `test-platform/**`.
7. Physical S09A observation: **223** production HTTP events; **108 list + 90 get**; **188 operation-attributed**; **two write-bearing operations each caused a full reconciliation** (7.877 seconds combined wall time); **35 planning-stage requests** have no semantic-purpose attribution. Every operation is completely attributed but run-level `attributionComplete=false`. Earlier 1,737-request/23-effect initial sync is **not** a comparable benchmark. The completed physical canary MUST NOT be repeated for bookkeeping.

## 2. Immutable authority and trust model

### 2.1 Three distinct ledgers

- **BASE/history and durable operation intent:** the existing authoritative synchronization state, including its semantic generation, tombstones, recovery journals and verified-effect commit ordering. Only existing authority interfaces authorize planning outcomes and state transitions.
- **Observation inventory:** reconstructible, device-local materialized **facts about the currently observed LOCAL and managed REMOTE namespace**. It may answer scoped presence, ID, ancestry, occupancy and content-evidence queries, but has **zero mutation authority**.
- **Changes continuity:** a cursor and continuous feed coverage describing which remote observations have been incorporated. A cursor is useful only with its **specific complete inventory generation** and verified root/account/scope binding.

Never promote an inventory fact into BASE, declare a deletion, retire an object, adopt an unrecognized remote ID, or finalize an uncertain effect without the existing authoritative lifecycle.

### 2.2 Evidence validity levels

Every consumer receives an explicit result, not a nullable cached object:
- `verified-for-observation`: snapshot/generation is complete for the requested scope, identity-binding valid, continuous Changes coverage established through its committed terminal cursor, required ancestors uniquely resolved, and no relevant uncertainty/ambiguity exists. This is sufficient to **assemble planning observations**, not automatically sufficient for mutation.
- `targeted-current-proof`: fresh provider observations at the particular precondition or convergence boundary, plus inherited valid inventory graph facts. Includes an explicit observed entity-ID, ancestor chain, parent-ID and sibling occupancy set, revision/content evidence when applicable, and a proof-use classification. The proof is invalidated by an intervening conflicting observation, changed authority generation, pairing/scope change, or unresolved physical effect. This is the only possible optimized substitute for the current live verification read.
- `unknown`: no valid completeness or trusted membership/identity evidence. **Never** convert to absent.
- `ambiguous`: >1 live ID occupies the same (domain,parent-ID,name) or logical path, or ancestor/ID/provenance collisions exist. Block affected operations.
- `stale` / `incompatible` / `corrupt` / `recovery-required`: unusable for claims of presence, absence or mutation authority; invoke scoped observation or complete baseline/recovery.

An `absent` planning observation is derived **only** from an applicable, complete and continuously maintained domain/parent coverage set at the stated observed horizon with no ambiguity. A stored missing row, 404, empty filtered query, inaccessible file or cache miss is not proof of absence. Destructive and create-path occupancy preconditions require *fresh* targeted verification at execution irrespective of a planning absence.

### 2.3 Identity / freshness fence

Every inventory generation and proof binds:
`(vaultIdentity, deviceIdentity, pairedAccountKey, managedRootId, protocolVersion, contentDomainRootId, portableConfigDomainRootId, scopePolicyFingerprint, inventorySchemaVersion, inventoryGeneration, cursorGeneration, authoritySemanticGenerationAtRead)`.

Account/root/protocol must be freshly validated through the existing Drive gate for each planning/execution entry; do not cache OAuth authentication or re-pair. The scope fingerprint includes normalized managed/exclusion/portable-configuration classification policy. On any mismatch, invalidate the affected coverage or all active inventory as appropriate. An authority semantic-generation change never authorizes using an older mutation proof; **only** a narrowly proven, independent read-only observation may be rebound after recalculating compatibility. Inventory observation generations and authoritative semantic generations are **different counters**; never alias them.

Freshness is a proven relation to a **terminal Changes cursor and observation interval**, not a TTL or timestamp. The current feed only establishes remote change coverage **through its terminal token**; it cannot guarantee that no external writer changed Drive after that point. Targeted read and post-effect convergence remain required at the relevant action boundary. No local cache can make multi-request Google Drive operations transactional.

## 3. Persistent schema, indexes and canonical state

**Engineering choice:** extend the **existing device-scoped IndexedDB database** rather than introduce a second product database, serialized full-inventory JSON document, synchronized vault file, or new backend. Upgrade DB version 1→2 with additive stores; leave existing `sync-state/current-state` bytes and backup entries untouched. Keep existing trusted product/authority schema at its current version unless a separately reviewed compatibility adapter explicitly requires schema change.

The following are **semantic data contracts**, not prescribed exported TypeScript type names:

| Record / key | Required fields and meaning | Indexes / constraints |
| --- | --- | --- |
| `inventory-control` / singleton | `schemaVersion`, identity fence, `activeGeneration`, `parentGeneration` (for copy-on-write deltas), `overlayDepth`, `terminalCursor`, `cursorLineage`, `baseStartToken`, status (`uninitialized/staging/ready/invalid/recovery-required`), `coverageDigest`, `authorityPersistenceRevisionAtPublish`, `authoritySemanticGenerationAtPublish`, `committedAt` informational time | singleton; active generation and cursor MUST switch together atomically |
| `inventory-entities` / `(generation, remoteObjectId)` | remote stable ID, parent ID, domain ID, exact name, derived logical path, kind, trashed/accessibility state, revision/version, size/hash/available content evidence, managed-root/app provenance, last successful observation token/epoch, uncertainty classification; copy-on-write overlay rows may explicitly mask a prior-generation ID | by `(generation, domain, parentId, name)` **non-unique**; `(generation, domain, logicalPath)` **non-unique**; by parent, remote ID; never unique-index names/paths |
| `inventory-local` / `(generation, logicalPath)` | local kind and last observed path/content token/fingerprint, visibility/unreadability, optional established remote ID mapping, observation source/epoch. No local file bytes. | by path and normalized path-comparison key; local-state observations remain hints until current local enumeration proves completeness |
| `inventory-coverage` / `(generation, domain, scopeId)` | exact complete child/page coverage, parent/subtree ID, verified domain/root chain, capture start/end token, terminal feed incorporation, invalidation reason, observed error; explicit `complete/partial/unknown/invalid` | by generation+domain+scope; **partial must not be promoted to complete** |
| `inventory-mutation-stage` / `(candidateGeneration, sequence)` | temporary import/delta writes, replay identity, source/target cursor, staging status and checksum/record-count diagnostics | staging isolated from active view; bounded garbage collection after safe publish |
| `inventory-proof` / transient only | proof purpose (read-only planning / operation precondition / effect convergence / recovery), exact observed IDs, occupancy evidence, rev/content, authority fence, invalidation conditions | **do not persist as reusable mutation authorization** |

The occupancy index MUST preserve multiple same-name siblings, including files versus folders, alternative ancestor chains, and case/platform-normalization collisions; all collision classes yield ambiguity until resolved. Derived logical paths must be recomputed for descendants on a folder move/rename using stable parent links; never mutate only the moved folder's display path while silently leaving stale descendant indexes. Prevent parent cycles, out-of-domain ancestry, duplicate remote-ID row definitions, stale generation mixing and orphan nodes without explicitly recorded uncertainty. A remote tombstone in inventory is **not** a synchronization-authoritative deletion tombstone.

Rows represent *in-scope* local items and managed remote counterparts, with explicitly separate local/remote presence dimensions. Remote entities with known ID but unresolved logical path remain in an ID-keyed **quarantine/unknown** set instead of vanishing from the namespace. Preserve the supported content and portable configuration domains as separate roots. IndexedDB access must be selective by ID/parent/path and paged for large vaults; do not deserialize the entire inventory during each remote query.

Existing `remoteMappings` and `learnedRemoteBatches` remain authoritative/historical according to their current contracts. A proposed inventory cannot silently rewrite or discard them. Projections into `PathSnapshot` must retain existing `base`, `identity`, `remoteEnumeration`, unknown handling, and global safety gate semantics. **BASE cannot seed “complete inventory”** merely because it has known mappings.

## 4. Atomicity, CAS, crash consistency and migration

### 4.1 Required storage extension

Implement an authority-owned `commitObservedGeneration(expectedAuthorityPersistenceRevision, expectedInventoryGeneration, candidate, terminalCursor)` boundary using **one IndexedDB read-write transaction** that spans `sync-state`, inventory-control and affected inventory stores. It must:
1. Re-read current `sync-state/current-state` and inventory-control in the same transaction; check unchanged authority bytes/revision, pairing fence and inventory generation; verify no outstanding authority/recovery conflict and candidate validation receipt.
2. Stage changed records under a **new shadow generation** in bounded IndexedDB transactions; those rows are unreadable by active consumers until promoted. **Incremental generations MUST use copy-on-write overlays over a pinned predecessor generation**, not copy every unchanged entity on each Changes poll. Effective views resolve the bounded lineage by stable ID and explicit overlay-mask rows, with path/parent occupancy indexes logically merged and audited; coverage is inherited only where unaffected and its invalidations are recorded. Baseline/periodic compaction creates a full new candidate in bounded chunks. Bound overlay depth and garbage-collect only generations proven unreachable after atomic pointer publication.
3. Within the final transaction, commit the complete validated generation marker plus its **matching terminal cursor** and any necessary mirrored canonical authority cursor/learned-batch metadata; update the trusted state's ordinary CAS/persistence revision safely, preserving semantic-generation rules, operation intents and BASE/history. Make the active-pointer switch and trusted-state compatibility state change indivisible.
4. On any abort, CAS race, quota failure, suspend/kill, validation uncertainty, or partial page, preserve the previous active generation+cursor unchanged. Incomplete shadow generations are ignored and later safely reclaimed; never merge half-applied rows into the active generation.
5. Avoid long-running IndexedDB transactions across network awaits. Build/validate candidate off-transaction; keep commit atomic and short. Never use IndexedDB auto-commit ordering as a substitute for a single transaction spanning the required stores.

The existing `StateByteStorage.compareAndSwap` has only single-key authority; introduce a backward-compatible store-owned multi-record operation. Route all cursor-changing paths through this operation after cutover (`persistLearnedRemoteBatch`, end-of-run `commitCursor`, recovery/reconstruction). During transition, the **inventory's atomic generation+cursor fence** is the sole usable observation cursor; an existing legacy cursor may not be advanced independently and treated as inventory continuity. If an old cursor is ahead of/unequal to inventory control, mark inventory untrusted and rebaseline, **never fast-forward it**.

The final active-marker transaction is the linearization point for local durability only. It does not itself prove a remote mutation, remote non-change after the terminal token, or an authoritative BASE transition. Outstanding durable intents retain priority over any inventory update/replay.

### 4.2 Upgrade without repairing the unrelated `data.json` incident

- DB upgrade 1→2 creates stores/indexes additively without touching existing `sync-state` bytes, backups, device identity, `data.json`, text-version DB, pairing or OAuth secrets. If upgrade is blocked by another open instance, do not race/delete the database; retain old path, surface blocked/readonly fallback.
- Before any schema migration changing existing authority bytes, use existing **backup-first, explicit CAS migration** discipline. The inventory itself starts **absent/untrusted**; existing BASE/mappings/cursor are not imported as a complete remote inventory. A fresh verified baseline initializes it.
- Before cutover, old executor/reader behavior remains authoritative; a failed inventory initialization is not interpreted as state loss. The optimizer may be disabled without dropping trusted BASE or durable effects.
- At cutover, verify existing pending intents and legacy cursor/batches; safely complete existing recovery through present lifecycle first. No fresh inventory may make an unresolved older intent disappear.
- On storage quota failure, transaction abort, partially created indexes, schema mismatch, or iOS eviction, preserve primary state and fall back to current conservative reconciliation/recovery. If the entire existing authority DB is lost/corrupt, enter **existing recovery-required**, never automatically recreate trusted BASE or device identity.
- Because existing `IndexedDbStateByteStorage.open()` specifies version **1**, older builds will encounter `VersionError` after a DB version-2 upgrade. **Rollback is not automatically supported by simply reinstalling an older binary.** Provide a version-2-aware rollback-compatible reader that ignores inventory safely, or explicitly authorized backup-based restore of exact trusted authority bytes; otherwise fail closed without attempting state reset or re-pair. Avoid unconditional upgrade of the authority envelope. Do not execute a live rollback/migration until separately authorized.

## 5. Full baseline: safe completeness construction

1. Validate paired Google account, vault/device, configured root and both managed domain roots with the existing remote policy. Capture a **start Changes token before scanning**; bind it to the exact account/root/scope fence. An expired/failed start is not evidence.
2. Traverse both managed domains in bounded pages, capturing raw IDs, parent IDs, names, kind, revision/hash where provided, provenance and explicit per-folder coverage. Reject/mark partial when any page fails, `nextPageToken` remains, an incomplete-search indication exists, domain provenance is unprovable, a descendant lacks valid ancestry, or permission/access observations are inadequate. Do not assume a filtered listing contains all remote objects.
3. Preserve **duplicate same-name siblings** rather than deduplicating. Resolve and record conflicts and platform-normalization collisions as ambiguous. Verify a coherent root→domain→parent graph and one-to-one remote IDs; missing/ambiguous identity remains unknown.
4. **Replay every Changes page from the pre-scan start token to a terminal `newStartPageToken`** onto the shadow candidate, with strict paging continuity and mutation/event ordering. This closes the gap created by changes during the traversal. Changes may contain an ID without a file resource; do not invent its path or classify removal as deletion. If an event cannot be located, scoped-completeness/revalidation is required; if not safely resolvable, fail the candidate and retry a full baseline.
5. Revalidate changed parents/ancestors and affected sibling occupancy after replay; a moved/renamed folder invalidates descendant path mappings and coverage until recomputed. Recheck root/account/protocol and candidate scope/fence before publish.
6. Publish only a completely validated candidate through §4's atomic generation+cursor transaction. Until then the current full reconciliation path continues to operate. A baseline with unresolved global completeness **cannot** be advertised as complete even if most rows are useful hints.

Periodic or user-requested full reconciliation remains available and may replace an old generation only after the same safe publication conditions. A hard content/domain error blocks affected operations and, if complete-domain proof cannot be established, blocks any dependent absence/deletion inference.

## 6. Incremental Changes API incorporation

- Begin only from a `ready` generation and its **atomically paired** cursor; reconfirm identity/scope and no unsafe pending recovery. Ingest all pages in order, assert requested-token continuity and unique terminal-token semantics, and create one shadow delta generation. Never publish an intermediate page as a terminal observation.
- For upsert with enough provider metadata: validate root/domain, stable ID, parents, revision/content and app provenance; update by ID; recompute parent/path occupancy and descendants as needed. Record both old and new parents as potentially affected occupancy scopes. A changed file that enters/exits the managed domain requires explicit scope determination; never silently omit it.
- For `removed`, trashed, inaccessible, or absent `file`: distinguish **known ID membership** from unknown ID. Use persisted ID→last-known-parent/path to localize invalidation; do not infer why a file disappeared (trash, access loss, move out) unless independently proven. When no reliable prior ID mapping exists, record unknown scope and initiate scoped re-observation or safe full reconciliation. Do not manufacture deletion authority.
- With duplicate events, resends or interrupted replay, reduce deterministically and idempotently by ID/change order; prove final materialized rows and the cursor correspond to the same complete batch. A 404/permission denial is not a deletion unless a stronger relevant Drive observation establishes that status.
- A rejected token, terminal gap, pagination defect, uncertainty, partial provider response, content/domain mismatch, local storage failure or inconsistent candidate leaves old active cursor and rows untouched. Report `invalid/stale/recovery-required` for the affected trust scope and perform a **full safe baseline** when coverage cannot be restored.
- The Changes stream is **account-wide, not a subtree-specific proof**. Filtering must be based on verified managed-domain membership and prior tracked IDs; do not discard an event merely because a partial current file payload does not contain a recognized root marker.
- Do not infer that `newStartPageToken` proves remote immutability after its horizon. Remote planner observations and actual mutation time have different freshness requirements.

Google reference: [Drive v3 changes.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list), [Drive v3 files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list). Both support paged results; Changes carries `nextPageToken` or terminal `newStartPageToken`. Drive changes can represent deletion **or loss of access**.

## 7. Targeted verification contract (the permitted optimization)

Expose a WS-03 **read-only targeted proof request** with explicit purpose, expected exact authority generation, managed identity, operation descriptor, expected parent/occupancy and revision/content requirements; respond with:
`verified(proof with observed IDs/revisions/parent/name/domain, complete sibling occupancy, exact observation horizon)`, `stale`, `ambiguous`, `unknown`, or `unavailable`.

Minimum per-effect proof obligations (WS-05 must preserve the existing result classifications):
| Effect | Mandatory independent physical convergence evidence |
| --- | --- |
| File/folder create | Reserved ID exists with correct type, expected parent/name/domain/provenance; fresh exhaustive **same-name sibling query** for actual physical parent proves exactly one live occupant (the reserved ID); ancestors uniquely resolve. |
| File content update / immutable candidate | Candidate exact-ID revision/content matches intended proof; prior occupant identity and required retirement state verified; fresh sibling occupancy shows candidate is sole live logical-path occupant; preserved alternatives retained where protocol requires. |
| Rename/move | Same stable ID at expected new parent/name/domain, old/new parent occupancy uniquely resolved, moved folder's subtree relationships not stale; no unsupported cross-domain reclassification. |
| Remote trash/deletion | Exact expected object/status and scope, post-effect absence/trash proof, current path occupancy and BASE/deletion authority; never classify inaccessible as successfully deleted. |
| Recovery after uncertain effect | Re-run **existing** durable-intent recovery owner with exact reservation/transaction identity, positive/negative observations and conflict preservation. No inventory record may resolve `outcome-unknown` alone. |

The proof must close the **same potential counterexamples** as the old full-tree convergence: another same-name occupant, different stable ID, inaccessible ancestor, wrong root, unrelated resource, concurrent rename/move, partial enumeration, stale precondition, revision mismatch, unobserved predecessor, or uncertain post-dispatch outcome. For any condition the targeted proof cannot prove, **call existing complete reconciliation or block/recovery**; do not label an unproven optimization as equivalent.

No TOCTOU immunity is claimed: Google Drive does not provide a cross-API lock here. Revalidate immediately before mutation and after it, invalidate on any intervening conflict, and preserve fail-closed outcomes when a racing remote writer defeats proof. The optimized path is allowed only after a dedicated safety-equivalence gate; launch behind a disabled-by-default capability flag until PHX-CI and independent review establish this equivalence.

## 8. Planner/executor integration and invalidation

- **WS-05 snapshot assembly:** after pairing validation and durable-intent recovery, ask WS-02 for a coherent, scoped inventory snapshot; WS-03 advances it through Changes. Translate only valid complete coverage into existing `RemoteEntry`/`PathSnapshot` semantics. Preserve existing local **fresh enumeration**, BASE/historical evidence, duplicate identity behavior, path scope/exclusions and global gates. On inadequate coverage, invoke today's complete `listForReconciliation` or recovery path. Do not introduce a second planner.
- **WS-05 execution:** preserve reviewed plan, exact preconditions, current semantic-generation CAS, durable-intent persistence, dispatch authorization, physical receipt, independent convergence and final BASE commit ordering. New targeted proof port is an **optional replacement for the remote verification *read***, not for the authoritative executor, lifecycle, result or recovery journal.
- **WS-02 invalidation:** wrong account/root/device, protocol or policy fingerprint; cursor discontinuity; IndexedDB integrity/semantic failure; ambiguous parent/ID/occupancy; incomplete pages; permission/API errors; local scope change; concurrent authority state revision; changed folder ancestry; unresolved recovery; crash during candidate construction or effect. Invalidate the minimum *provable* scope, else global. Invalidated scopes cannot yield absence.
- **Concurrent execution:** serialize inventory publication by active-generation CAS and authority persistence CAS, and make per-run snapshots immutable. If a device-local controller observes a newer committed generation during planned execution, revalidate/replan affected operations. Two devices' inventories do not share storage/authority; remote races are caught by live checks.
- **Stale-device protection:** existing device reconciliation and deletion circuit breaker remain unchanged. A new inventory on a returning device is never proof that its old BASE deletion is legitimate.
- **Local observation:** local inventory hints accelerate ID mapping and diagnostics, not local unreadability/deletion inference. Fresh local enumeration and stability tokens remain required under the current local-vault contract.
- **Fall back conservatively:** losing optimization may increase HTTP calls, never permission to relax verification. No fallback changes OAuth scope or mutates remote state as a side effect.

## 9. Mobile resource envelope and privacy

- Store metadata-only rows. No full file bodies, OAuth tokens, secrets, retained conflict binaries, or full remote response JSON in inventory.
- Apply paged IndexedDB cursor/index access; keep network page and staging write batches bounded and release rows between iterations. Copy-on-write incremental overlays avoid O(n) full-inventory duplication per poll; bound overlay depth and compact in a shadow generation. No O(n²) whole-graph scans per operation. Avoid serializing the entire inventory into the existing single `current-state` envelope.
- Today `ProductSnapshotAssembler` materializes `PathSnapshot[]`; implementation must measure the *combined* peak planning+inventory working set, not pretend that indexed storage alone makes the existing planner O(1) memory. Introduce bounded projection/chunking only when it preserves global reconciliation, collision and destructive-plan gates. Otherwise enforce a measured safe memory ceiling and fail closed to a recoverable status; **do not** silently truncate entities.
- Use deterministic scale fixtures (small, nested/duplicate-heavy, and large with mobile-like memory quotas) and actual representative Windows/iOS memory behavior where genuinely required by rollout. Define and record operational memory/storage budgets **before activation** using observed device constraints; avoid inventing an unmeasured universal iPhone threshold.
- Diagnostics retain only bounded numeric/categorical counts, opaque IDs and hashed/sanitized path keys. No raw object names, content, filenames, URL query strings or credentials exported as inventory telemetry.

## 10. Contract ownership and execution-safe decomposition

The boundaries below are frozen for **future** task planning; their filenames/SHAs must be rebound from the actual predecessor before dispatch.

| Unit | Owner | Bounded deliverable | Dependency / no-overlap rule |
| --- | --- | --- | --- |
| D339-01 | WS-02 | Finalize domain vocabulary, data schemas, proof/result types, invariant validator and ownership API; design-focused tests as appropriate | **First prerequisite**. Sole owner of shared inventory schema / state contracts. WS-03/05 only consume approved signatures. |
| D339-02 | WS-02 | Additive indexed IndexedDB v2 storage, staged generations, atomic authority+cursor control commit, migration and restart resilience | After D339-01; WS-02 owns `src/state/**` and DB mutation/CAS lifecycle. No WS-03/05 writes to store implementation. |
| D339-03 | WS-03 | Verified two-domain baseline and Changes stream metadata-to-delta translation, durable ID/path knowledge, duplicate-aware targeted read contract | After D339-01; may overlap D339-02 **only** with frozen read/write interfaces and disjoint `src/drive/**` ownership. |
| D339-04 | WS-02 + integration gate | Compose/verify WS-02 storage with WS-03 observer updates; generation/cursor atomicity, graph checks, rebaseline and invalidation | After D339-02/03; **one** owning integrator for shared contract compatibility; no independent competing cursor lifecycle. |
| D339-05 | WS-05 | Inventory-backed snapshot assembly + safe fallback and current local/BASE semantics; single controller/planner preserved | After D339-04. Sole `src/product/snapshot-assembler.ts` / controller integration owner. |
| D339-06 | WS-05 | Targeted read proof consumption by existing executor; retain independent convergence, durable intent, negative ambiguity recovery | After D339-05 and targeted WS-03 proof contract; do not parallel-edit executor/recovery lifecycle. |
| D339-07 | WS-07 | PHX-CI-owned deterministic virtual-world scenarios, negative/fault cases, contract equivalence, attribution and comparable performance evidence | Scenario planning may proceed after D339-01; executable tests added as relevant feature increments land. Do not edit frozen BVP core/governance/PHX-CI pins without supervisor-owned change. |
| D339-08 | Integration / independent review | Integrated PHX-CI product + BVP tests, benchmark gate, Windows/iOS resource checks, adversarial architecture review, rollout decision | After all implementation units. Does not invent a second verification framework or self-approve promotion. |

Capacity-size each unit again immediately before dispatch using exact source/head and touched files. Split oversized units into serial resumable subunits with one invariant owner; avoid speculative file allowlists. `src/contracts/**` shared interface changes are owned by D339-01 only unless explicitly reassigned. `dev/authority/governance/locks/testing-platform-boundary.yaml`, `phx-ci.json`, `Taskfile.phx-ci.yml`, architecture guard, and BVP frozen seams remain supervisor-owned.

## 11. PHX-CI verification and acceptance matrix

**Exclusive authority:** Every executable software validation is run/coordinated **only by PHX-CI**. No GitHub Actions, standalone proofs, new scenario-specific PowerShell programs, or independent CI. Tests live in existing product/BVP test roots and run through the pinned `node-typescript` PHX-CI adapter. Repository-controlled `dev/scripts/**` may be only short PHX-CI setup/invocation/evidence wrappers, not independent verifiers. Do not rerun the accepted S09A physical canary.

| Gate | Required observations / fail condition |
| --- | --- |
| Identity / migration | Existing DB v1 opens under v2 without rewriting trusted envelope or `data.json`; backup/CAS discipline, zero inadvertent re-pair; existing pending intents survive; old code fallback/recovery defined. |
| Crash atomicity | Inject kill/abort before staging, during each page, before publish, inside IndexedDB commit, just after commit, during cursor compatibility mirror; restart sees either complete old snapshot+cursor or complete new snapshot+cursor, never advanced cursor with missing/older rows. |
| Ingestion | Multi-page Changes terminal continuity; duplicate IDs/pages, out-of-order-invalid sequence, removed without file, access loss, moved folders/descendants, domain exit/entry, invalid/root-changed token, stale cursor, partial listings, scope-policy changes; overlay-mask resolution, bounded lineage/compaction and never re-exposing deleted predecessor rows. |
| Uniqueness | Same-name sibling files/folders, duplicate ancestors, conflicting IDs, parent cycles, normalized local collisions, orphan identities, remote same-name create race: ambiguous never yields destructive/create-success authority. |
| Planner safety | For matched controlled fixtures compare baseline existing full-reconciliation mode vs new inventory mode: same snapshots/identity assessments, operations, global gates, conflicts, BASE transitions and recovery dispositions (apart from explicitly non-semantic diagnostic differences). |
| Executor safety | Proof-equivalent file/folder create, update, move, trash and recovery; invalidate/replan on stale proof; never mark successful effect until independent physical convergence and durable record. Test races *between* planning/precondition/read/write/postcheck. |
| Recovery and destructive | Partial/unreadable local, offline, quota, transaction abort, stale device, mass deletion, first-sync safe union, unknown cursor, data corruption, missing root/account mismatch, post-dispatch ambiguous effect: existing safety gates and unknown classifications retained. |
| Resource / performance | Exact same fixture and effect plan with optimizer **off/on**, identical authority and mutation safety results. Record Drive request endpoint/purpose counts, per-operation wall time, summed HTTP latency separately, reconciliation count, full-run attribution coverage, memory peak and persistent bytes; do not use historical unlike workloads to claim improvement. |
| Repository/build | PHX-CI focused test selection nonzero, full product/BVP tests, typecheck, build, architecture guard/budgets, artifact hashes, exact source SHA and canonical `dev/test-results/<run-id>/` evidence. |
| Independent review | Review implementation diff, authority fences, IndexedDB transaction assumptions, all six counterexamples, state lineage, migration and proof truth, then close only with authoritative PHX-CI results and accepted reviewer findings. |

A performance claim is permitted **only** when equivalent workloads and semantic assertions pass; the initial optimization may be retained in fallback/disabled mode if it cannot meet the safety gates. Resource budget acceptance requires documented real-device evidence, not inferred sizes.

## 12. Rollout, invalidation and stop gates

1. **Design review gate (current):** independently challenge §§2–9 against actual code and Drive API contracts, amend within locked DEC-339 scope. This architecture is **not** an authorization to create product code.
2. **Storage-only shadow deployment:** additive DB stores, metadata observation in shadow/non-authoritative mode; preserve old planner/executor and no behavior switch.
3. **Observation mode:** enable full baseline + Changes maintenance and compare with existing reconciliation under PHX-CI; unknown and discrepancy force fallback, never mutation.
4. **Planner cutover:** feature-gated, after safety-equivalent snapshot evidence. Maintain legacy full fallback.
5. **Executor targeted proof:** separate gated activation after explicit convergence/recovery equivalence and adversarial negative tests. No bundled disablement of old full reconciling path before evidence.
6. **Physical rollout:** separately authorized representative Windows/iOS tests, resource observation and staged upgrade; **not** the already-completed S09A canary. S09A broader acceptance and `data.json` root-cause investigation remain open.
7. **Rollback:** disable inventory consumption, preserve existing authoritative state, return to complete reconciliation. Never purge/repair unknown authority automatically; version-incompatible reader must stop safely.

**Hard stop:** no code implementation, live Drive mutation, plugin installation, state reset, PHX-CI rerun of completed S09A work, Stage 3 entry, release, or production promotion is authorized by this architecture document.

## 13. Design-time unresolved items and falsification checks

These are **engineering verification gates**, not invitations to reopen the DEC-339 product direction:

1. **Schema/CAS adapter detail:** decide the exact backward-compatible transaction facade after walking all state save call sites. If one authority store instance could bypass the two-store cursor fence, cutover is blocked; remedy remains inside WS-02/05 integration.
2. **Baseline observation horizon:** verify against Google Drive API whether all relevant listing/Changes events and accessible file fields provide enough coverage for arbitrary concurrent edits, especially files created/removed during scan and loss of access. If not, mark incomplete/retry rather than assert completeness.
3. **Proof-equivalence matrix:** for each optimized remote effect, exhibit how the narrow query excludes the same disallowed state as `verifyRemote`'s complete listing. If a case cannot be shown equivalent, keep full-list fallback for that effect.
4. **Mobile memory:** establish measured iOS and Windows peak resource budgets and graceful failure behavior before implementation activation. The existing whole-plan assembly must be included in the memory study.
5. **No inferred global speedup:** S09A measured metadata amplification but did not isolate exact redundant request subsets. The 35 unscoped planning requests require future planning-attribution work for complete purpose metrics; they do **not** require replaying that physical run.

No additional human product choice is identified in this design. A later finding that safely narrowing convergence requires relaxing an existing invariant is **a stop/escalation**, not an engineering discretion item.

---

**Design grounded from:** `AGENTS.md`, active `dev/state/**`, DEC-339 register, Target Specification §7.9, WS-02/03/05/07 architecture/decomposition, BVP lock, S09A report, and actual source at the baseline SHA; official Google Drive v3 `changes.list`/`files.list` API documentation.