# BRAIN Google Drive Sync Plugin — Target-System Specification

## 1. Document Status, Authority, and Use

**Status:** Authoritative Stage 1 target-system specification  
**Project:** `woodpk/gdrive-sync-obsidian-plugin`  
**Workflow:** Agent-Led Software Product Construction Manual — Recommended Default Workflow A  
**Stage:** Stage 1 — Target-System Specification and Minimum Sound Build Decomposition  
**Target-specification revision:** 2  
**Date:** 2026-08-23

This document defines the required finished product. It is a **target-system specification**, not a coding recipe, build-session transcript, or substitute for the separate Stage 1 build decomposition.

The specification is written at the level required by `agent-led-software-product-construction-manual.md`: materially different implementations must not be able to produce materially different product behavior while still claiming conformance, but ordinary engineering mechanics remain available to implementation judgment.

### 1.1 Authority Rules

The following authority rules govern this project:

1. A later explicit user decision overrides earlier project artifacts.
2. `decision-register.yaml` records the accepted product/process decisions and their supersession history.
3. This target-system specification is the authoritative finished-system contract used by Stage 2 construction and Stage 3 validation.
4. The Stage 1 build decomposition and coverage artifacts are implementation-planning authorities only; they may not redefine this target system.
5. Build-session prompts are subordinate to this specification and the decomposition.
6. The actual repository is authoritative evidence of **current implementation state**, but existing code does not override required target behavior.
7. Donor/reference repositories are evidence and implementation accelerators only; they never define the product.

If this specification and the current decision register appear materially inconsistent, a supervisor MUST treat that as an authority/specification defect to reconcile. A supervisor MUST NOT silently choose whichever artifact is more convenient.

### 1.2 Normative Language

`MUST`, `MUST NOT`, `SHALL`, `SHALL NOT`, `REQUIRED`, and `PROHIBITED` are normative requirements.

`SHOULD` identifies a strong product/architecture preference that may be changed only when engineering evidence demonstrates an equivalent or safer outcome without changing required behavior, compatibility, safety, or operational semantics.

`MAY` identifies implementation discretion or optional behavior.

### 1.3 Authoritative Inputs and Grounding Snapshot

This specification was constructed from:

- `agent-led-software-product-construction-manual.md`, blob SHA `02adedab577f397d98fb9666166270358a581761`, fully re-read before the original specification and re-applied during this revision;
- `decision-register.yaml` and all accepted Stage 0 product decisions represented there;
- repository/source grounding performed against:
  - `woodpk/gdrive-sync-obsidian-plugin` — effectively pre-implementation at Stage 1 entry;
  - `laupas/google-drive-mirror` at commit `886f47a0e52e71a33cd2833b4a013f9b81d68464`;
  - `kebl3541/Obsidian-Google-Drive-Merge-Sync` at commit `2b4c27b4d18fea52ae3e8239a89ee50bd4ae5222`;
- official Google Drive/OAuth and Obsidian platform documentation consulted during Stage 1 when engineering feasibility affected specification boundaries.

Repository grounding established that Google Drive Mirror provides valuable proven architecture for reconciliation, persistent base state, Drive abstraction, retries, bounded concurrency, event suppression, mobile batching, checkpointing, IndexedDB-backed remote listing, and broad tests, but several of its product semantics conflict with this target. Google Drive Merge Sync provides useful donor implementations/concepts for identity-preserving Drive moves, dry-run planning, `drive.file`, and textual three-way merge, but likewise does not define the target product.

The repository and donor commit descriptions above are **historical Stage 1 grounding**, not promises about future repository state. Every later supervisor MUST inspect the current repository before asserting current implementation locations, types, interfaces, tests, or completed work.

### 1.4 Successive-Supervisor Re-entry Contract

A supervisor entering this project in a later chat/session MUST, before planning or issuing implementation work:

1. read the governing development manual;
2. read this target-system specification completely;
3. read the current decision register completely and honor supersession;
4. once created, read the complete Stage 1 build decomposition and requirement-to-phase coverage artifact(s);
5. inspect the actual current repository and relevant tests before naming implementation locations;
6. determine which build phase/session is actually complete, active, or next from persisted evidence rather than predecessor prose alone;
7. preserve all fixed contracts and cross-workstream boundaries already established;
8. surface only genuine unresolved product-authority decisions to the user;
9. resolve ordinary engineering uncertainty through repository inspection and engineering analysis;
10. update persisted project-state/decomposition evidence whenever completed work changes what a later supervisor must know.

When multiple build agents operate in parallel, shared interfaces/contracts required by more than one workstream MUST be established and persisted before dependent parallel implementation begins. Agents may implement behind those contracts independently but may not redefine them locally.

## 2. Product Definition

The finished product is a private/custom Obsidian plugin that safely synchronizes one BRAIN Obsidian vault between Windows desktop Obsidian and iPhone/iOS Obsidian using the user's own Google Drive as remote synchronization infrastructure.

The intended model is local-first:

```text
Windows local BRAIN vault
          ⇅
      synchronization
          ⇅
user-owned Google Drive BRAIN Sync remote
          ⇅
      synchronization
          ⇅
iPhone local BRAIN vault
```

Each device retains a normal local Obsidian vault. Google Drive is the remote synchronization medium, not a mounted live filesystem and not a prerequisite for local vault use.

The product exists to replace dependence on Obsidian Sync for BRAIN synchronization while providing stronger visibility, recoverability, conflict safety, and destructive-operation protection than a naive two-way file copier.

### 2.1 Success Criterion

The product is successful when the user can work normally in BRAIN on Windows and iPhone, including while temporarily offline, and the plugin safely converges legitimate changes through the user's Google Drive without silently losing, overwriting, corrupting, resurrecting, or mass-deleting valid vault data.

Correctness, recoverability, and data preservation take priority over minimum code size, maximum throughput, or aggressive automatic convergence.

## 3. Required Capabilities

### 3.1 Platform and Product Scope

**SYS-001 — Obsidian plugin.** The product MUST execute as an Obsidian plugin implemented in the TypeScript/JavaScript/npm ecosystem.

**SYS-002 — Windows support.** Windows desktop Obsidian MUST be a first-class supported runtime.

**SYS-003 — iOS support.** Obsidian on iPhone/iOS MUST be a first-class supported runtime. The plugin MUST NOT be desktop-only.

**SYS-004 — Mobile-safe runtime boundary.** Functionality required on iOS MUST NOT depend on Node.js, Electron, Windows-only APIs, PowerShell, .NET executables, local Python executables, native Windows libraries, or other desktop-only facilities. Desktop-specific facilities, if used, MUST be isolated so their absence cannot break mobile loading or required mobile behavior.

**SYS-005 — One-vault scope.** Version 1 MUST support one BRAIN vault synchronized to one personal Google Drive synchronization remote.

**SYS-006 — Single-user scope.** Version 1 MUST support the user's own account and devices; multi-user roles, shared-vault permissions, multi-tenant behavior, Shared Drives, and multiple independent sync targets are not required.

**SYS-007 — Local-first availability.** Loss of network access, Google Drive availability, or authentication MUST NOT make the local Obsidian vault unusable for ordinary editing.

**SYS-008 — Private distribution compatibility.** The plugin MUST be usable as a private/custom plugin without official Obsidian Community Plugin publication.

### 3.2 Google Drive Remote and Authentication

**AUTH-001 — User-owned Google account.** Synchronization MUST operate directly against the user's Google Drive account; vault content MUST NOT require transit through Obsidian Sync, a developer-controlled synchronization service, or another storage provider.

**AUTH-002 — Least privilege.** The Google Drive authorization scope MUST be `https://www.googleapis.com/auth/drive.file`. Broader Drive scope MUST NOT be requested without a later explicit product-authority decision.

**AUTH-003 — User-owned OAuth application.** The plugin MUST use OAuth credentials belonging to the user's own Google Cloud project/application rather than developer-owned shared credentials.

**AUTH-004 — Same-device authentication.** Every supported device, including iPhone, MUST be able to complete Google authentication using that device alone. Desktop-generated token transfer, desktop-generated connection codes carrying credentials, or another desktop dependency MUST NOT be required for mobile authentication.

**AUTH-005 — System-browser authorization.** Google authorization MUST use a secure external/system browser flow and MUST NOT rely on an embedded user-agent controlled by the plugin.

**AUTH-006 — OAuth return path.** The authorization return mechanism MUST be compatible with both Windows and iOS. If an HTTPS redirect/callback is required, the approved preferred callback host is a user-controlled Azure Static Web Apps Free deployment. That callback is authentication infrastructure only.

**AUTH-007 — Callback isolation.** Any hosted callback MUST NOT receive, inspect, persist, proxy, or synchronize vault content. It MUST minimize handling of authorization material, MUST NOT retain tokens, and MUST be designed so an intercepted authorization response cannot be redeemed by a party other than the initiating device/session. Exact code-exchange placement is engineering discretion subject to current Google OAuth requirements and this security contract.

**AUTH-008 — OAuth transaction integrity.** Authorization MUST use high-entropy anti-CSRF transaction state and current secure authorization-code protections appropriate to the Google client type, including PKCE where supported/required. Callback responses MUST be correlated to the initiating device/session before acceptance.

**AUTH-009 — Device-local secrets.** Refresh tokens, access tokens, OAuth secrets, and other authentication secrets MUST remain device-local and MUST NEVER enter vault synchronization or configuration synchronization payloads.

**AUTH-010 — Secret storage.** Sensitive values MUST use the strongest secure storage facility available through the supported Obsidian/runtime APIs. Plaintext persistence in ordinary synchronized plugin configuration is prohibited.

**AUTH-011 — Revocation/failure.** Expired, revoked, invalid, or insufficient authorization MUST fail closed for remote operations while preserving local vault use. Reauthentication MUST be clearly surfaced. Destructive synchronization MUST NOT resume until remote identity and synchronization state are revalidated.

**AUTH-012 — Account change.** Changing the Google account or OAuth identity MUST require explicit re-pairing; prior remote identity or state MUST NOT be silently reused across accounts.

### 3.3 Remote Synchronization Domain

**REM-001 — Dedicated remote.** The plugin MUST create or explicitly pair to a dedicated plugin-managed BRAIN Sync folder/tree in Google Drive.

**REM-002 — Remote identity.** The BRAIN Sync remote MUST carry stable identity information sufficient to prove that a local vault is paired with the intended remote rather than merely with a similarly named folder.

**REM-003 — Explicit pairing.** Pairing to an existing remote MUST be deliberate and validated. The plugin MUST NOT silently adopt an arbitrary Google Drive folder based only on name or location.

**REM-004 — Plugin-managed domain.** The BRAIN Sync remote is synchronization infrastructure, not a supported general-purpose Google Drive working copy. Direct manual editing of that remote is not a normal workflow.

**REM-005 — External modification safety.** Unexpected externally introduced changes inside the plugin-managed remote MUST be treated conservatively. Safely attributable modifications to managed objects may be reconciled; ambiguous, structurally invalid, or suspicious changes MUST be surfaced and MUST NOT be converted into destructive actions by guesswork.

**REM-006 — Stable remote identity.** Stable Google Drive file/folder IDs MUST be used as persistent remote identity where available rather than treating path alone as identity.

**REM-007 — Versioned remote schema.** Any plugin-owned remote metadata/protocol representation MUST carry an explicit schema/protocol version. Compatible migrations MUST be controlled and backward-aware; incompatible versions MUST block affected synchronization rather than corrupt shared state.

**REM-008 — Missing remote root.** If the paired BRAIN Sync root becomes missing, inaccessible, or deleted, the plugin MUST enter a critical recovery state. It MUST NOT silently create a replacement remote and upload the current local vault as though nothing happened.

**REM-009 — Logical remote separation.** Vault-content representation, portable configuration representation, and synchronization/protocol metadata MUST be logically separated so that configuration/state operations cannot accidentally be interpreted as ordinary vault-content operations. Their exact physical layout is engineering discretion.

**REM-010 — Supplementary Drive recovery history.** Google Drive trash/version history MAY be used as an additional recovery aid, but synchronization correctness MUST NOT depend on prior remote versions being available. Loss of version history cannot make an otherwise safe state transition unsafe or authorize destructive guesses.

### 3.4 Synchronization Initiation and Scheduling

**SYNC-001 — Manual synchronization.** The product MUST provide an explicit `Sync now` operation.

**SYNC-002 — Manual preview.** Manual `Sync now` MUST first produce a preview of the proposed plan and MUST require an explicit Execute action before that plan mutates either side.

**SYNC-003 — Startup/resume synchronization.** The user MUST be able to enable or disable synchronization after Obsidian startup/resume independently per device.

**SYNC-004 — Local-change synchronization.** The user MUST be able to enable or disable automatic synchronization following local vault changes independently per device.

**SYNC-005 — Periodic remote reconciliation.** The user MUST be able to enable or disable periodic remote reconciliation independently per device, with a conservative configurable cadence.

**SYNC-006 — Debounce/coalescing.** Bursts of local changes MUST be debounced/coalesced. The plugin MUST NOT begin a separate synchronization operation for every file event or keystroke.

**SYNC-007 — Startup readiness.** Automatic startup behavior MUST wait until Obsidian has sufficiently initialized the vault/configuration. Initialization-generated file events MUST NOT be mistaken for user changes.

**SYNC-008 — Serialized runs.** A device MUST NOT execute overlapping sync runs for the same vault. New triggers arriving during a run MUST be coalesced into later reconciliation.

**SYNC-009 — Cross-instance coordination.** Concurrent plugin instances that could manipulate the same local vault/state MUST be prevented from acting as independent writers by a coordination/lease mechanism or functionally equivalent exclusion guarantee.

**SYNC-010 — Pause/resume.** The user MUST be able to pause remote synchronization per device without impairing ordinary local use and later resume through reconciliation.

**SYNC-011 — iOS lifecycle.** The product MUST NOT promise unsupported true background synchronization on iOS. It MUST synchronize while Obsidian is active and on appropriate startup/resume opportunities, and it MUST tolerate suspension/termination at any point without corrupting data or state.

**SYNC-012 — Mobile data controls.** Automatic synchronization behavior on mobile MUST include configurable cellular-data restrictions, including a Wi-Fi-only option for automatic synchronization and large transfers.

**SYNC-013 — Bidirectional normal operation.** Normal synchronization MUST be bidirectional. Persistent push-only or pull-only operating modes are not part of v1. Preview/dry-run controls do not change this bidirectional product model.

### 3.5 Snapshot, Planning, and Execution

**PLAN-001 — Explicit planning layer.** Every synchronization run MUST derive an explicit synchronization plan before performing content mutations.

**PLAN-002 — Plan inputs.** Planning MUST be based on a consistent view of current LOCAL state, current REMOTE state, and the trustworthy synchronization BASE/history. Timestamp ordering alone is insufficient.

**PLAN-003 — Plan vocabulary.** The plan MUST be able to represent, at minimum: no-op, upload/create, upload/update, download/create, download/update, identity-preserving rename/move, clean text merge, unresolved conflict, local trash/delete, remote trash/delete, blocked/unsafe action, and recovery-required conditions.

**PLAN-004 — Explainability.** Planned actions MUST retain enough reason/evidence metadata to explain why the action was derived, including relevant identity/base/change evidence. User-facing detail may be summarized, but diagnostics and tests MUST be able to determine the derivation basis.

**PLAN-005 — Immutable execution intent.** An executing plan MUST NOT silently mutate its meaning when underlying state changes. Preconditions that become stale MUST invalidate or re-plan the affected action.

**PLAN-006 — Remote change during run.** A newly detected remote change that affects a planned path MUST invalidate/re-plan that affected work rather than allow stale-plan execution.

**PLAN-007 — Local change during run.** Local changes occurring during an active run MUST be captured for a subsequent reconciliation pass instead of unpredictably changing the executing plan.

**PLAN-008 — Safe automatic execution.** Automatic runs MAY execute ordinary safe plans without per-item confirmation, but MUST stop or partially block when the plan contains a conflict requiring user choice, an untrusted-state condition, an identity ambiguity, or a destructive plan that trips safety policy.

**PLAN-009 — Cancellation.** Active synchronization MUST support safe cancellation: no new operations are started after cancellation is accepted; the current atomic operation is completed or safely abandoned according to its contract; durable state reflects only durable completed work; later synchronization can safely resume/recompute.

### 3.6 Local and Remote Change Detection

**CHANGE-001 — No timestamp authority.** Timestamps MUST NEVER be authoritative evidence that one side should overwrite another. Clock skew MUST NOT affect correctness.

**CHANGE-002 — Content/identity evidence.** File identity, previous synchronized state, content hashes/content evidence, size where useful, Drive revision/metadata, and current existence state MUST be used to determine change status.

**CHANGE-003 — Hash caching allowed.** Hashes MAY be cached using safe metadata predicates to avoid repeatedly reading unchanged files, but a cache optimization MUST NOT change synchronization semantics.

**CHANGE-004 — Incremental remote tracking.** After a trustworthy initial remote baseline, normal remote change detection MUST use the Google Drive Changes API or its current supported equivalent under the locked `drive.file` scope rather than enumerating the entire remote tree on every poll.

**CHANGE-005 — Change cursor durability.** Remote change cursors/page tokens MUST be persisted as synchronization state and advanced only when the corresponding observed state is durably incorporated. Loss or invalidation of the cursor MUST trigger conservative re-baselining, not deletion inference.

**CHANGE-006 — Full integrity reconciliation.** Incremental remote change tracking MUST be supplemented by periodic full remote/local reconciliation and an explicit on-demand `Verify/Reconcile Vault` operation so missed/inconsistent incremental state cannot persist indefinitely.

**CHANGE-007 — Complete-set deletion safety.** When a full listing/reconciliation is required, absence-based remote deletion conclusions MUST NOT be drawn until the system has established that the relevant remote enumeration is complete. Partial listings, failed listings, or interrupted scans cannot authorize deletions.

### 3.7 First Synchronization and Device Pairing

**FIRST-001 — Safe-union initialization.** First synchronization MUST use safe-union semantics.

**FIRST-002 — One-sided content.** Content present only locally MUST be copied remotely; content present only in the managed remote MUST be copied locally, subject to exclusions and compatibility validation.

**FIRST-003 — Identical collision.** Same-path identical content MUST converge as a no-op/base establishment rather than create a conflict or duplicate.

**FIRST-004 — Divergent collision.** Same-path divergent content with no trustworthy common base MUST NOT be overwritten. Both complete versions MUST be preserved and the collision surfaced for resolution.

**FIRST-005 — No initialization deletions.** Deletion propagation is PROHIBITED until a trustworthy synchronization base has been established. An empty or partially populated side MUST NEVER erase a populated side merely because no prior state exists.

**FIRST-006 — Guided setup.** Setup MUST cover same-device Google authentication, remote creation or validated pairing, BRAIN vault identity confirmation, device identity establishment, visible exclusions/configuration policy, and first-sync preview before normal automatic synchronization can be enabled.

**FIRST-007 — Initial automatic sync disabled.** Automatic synchronization MUST remain disabled until the first preview has been reviewed and the first synchronization has completed successfully enough to establish trustworthy state.

### 3.8 Synchronization State, Identity, and Durability

**STATE-001 — Persistent base.** The system MUST retain persistent synchronization state sufficient to distinguish new content, unchanged content, modification, intentional deletion, rename/move, stale-device state, and unresolved/uncertain operations.

**STATE-002 — Vault identity.** BRAIN MUST have a stable synchronization identity stored/represented in a way that allows the plugin to reject silent pairing of the wrong local vault to the remote.

**STATE-003 — Device identity.** Each installation MUST have a stable random device ID used for provenance, conflict attribution, stale-device reasoning, audit, and diagnostics. Hardware fingerprinting is prohibited.

**STATE-004 — Remote object identity.** Synchronization state MUST retain remote file/folder identity where needed to preserve identity across renames/moves and to detect ambiguous remapping.

**STATE-005 — Deletion/tombstone history.** State MUST retain bounded deletion/tombstone history long enough to prevent a stale/offline device from reintroducing intentionally deleted content as new content.

**STATE-006 — Tombstone safety.** Tombstone/history retention MUST be conservatively configurable and MUST NOT expire while a known device is too stale to reconcile safely.

**STATE-007 — Stale-device gate.** A device returning after a long offline period MUST reconcile and re-establish trustworthy current state before its stale state can authorize destructive propagation.

**STATE-008 — Operational state separation.** Device-local operational state — including device ID, tokens, base state, file-ID mappings, hashes/caches where authoritative, change cursors, checkpoints/journal, tombstones, recovery state, and logs — MUST NOT be synchronized as ordinary vault content.

**STATE-009 — Atomic durability.** Authoritative state updates MUST have crash-consistent persistence semantics. Persisted state MUST never claim an operation completed before the underlying content mutation and required integrity verification are durable.

**STATE-010 — Partial-operation classification.** Interrupted work MUST leave enough durable evidence to distinguish completed, pending, and uncertain operations. Restart MUST safely resume or recompute without silently duplicating or losing data.

**STATE-011 — State integrity validation.** Missing, malformed, truncated, incompatible, or internally inconsistent authoritative state MUST be detected as untrusted rather than silently interpreted as an empty valid base.

**STATE-012 — Recovery mode.** Untrusted state MUST enter an explicit recovery mode. While state is untrusted, absence MUST NOT be treated as deletion evidence and destructive propagation MUST remain disabled.

**STATE-013 — Conservative reconstruction.** Recovery MUST reconstruct knowledge from actual local content, actual accessible managed Drive content, stable identities, and trustworthy metadata/history. Ambiguous conclusions MUST be surfaced rather than guessed.

**STATE-014 — State backup/export.** The product MUST provide a user-accessible way to export/backup synchronization metadata and diagnostic evidence sufficient for recovery/troubleshooting without exporting authentication secrets.

**STATE-015 — Versioning/migration.** Local synchronization-state schemas MUST be explicitly versioned. Automatic migration is permitted only for safe, known transformations and MUST preserve a recoverable pre-migration checkpoint/backup. Unsafe upgrade/downgrade paths MUST be refused.

**STATE-016 — Clone/restore detection.** A restored or cloned plugin installation that duplicates device identity or stale state MUST be detected conservatively and MUST NOT silently impersonate the original device as an independent current writer.

**STATE-017 — Device removal.** The user MUST be able to remove/deauthorize a device identity without deleting shared vault content or breaking other valid devices.

### 3.9 Transfer Integrity and Interruption Safety

**XFER-001 — Verify before commit.** An HTTP/API success response alone is insufficient evidence of successful synchronization. Content transfer MUST be validated using appropriate content/hash evidence before authoritative synchronization state is committed.

**XFER-002 — Stable-source validation.** A local file that changes while being read/uploaded MUST invalidate that transfer as a successful synchronization of the planned version. The changed file MUST be safely re-evaluated/retried.

**XFER-003 — Atomic local replacement.** Downloads and merged replacements MUST use atomic or functionally equivalent safe replacement semantics wherever the platform permits. A partial download/rewrite MUST NEVER become visible as valid final vault content.

**XFER-004 — Safe upload semantics.** Upload/update semantics MUST be idempotent or safely retryable. Restart after ambiguous network failure MUST determine or re-establish remote outcome before blindly creating duplicate content.

**XFER-005 — Checkpointing.** Long synchronization work MUST checkpoint durable completed progress frequently enough that interruption does not require unsafe replay of an entire large run. Checkpoint frequency/implementation is engineering discretion.

**XFER-006 — Bounded resources.** Large vaults and large files MUST be processed using bounded memory and bounded concurrency appropriate to the platform. The design MUST remain viable within iOS WebView/mobile memory constraints.

**XFER-007 — Large files.** The product MUST support large files using bounded/streamed/chunked techniques or equivalent safeguards rather than imposing an arbitrary small product-level file-size ceiling.

**XFER-008 — Rate limiting.** Google API calls MUST use bounded concurrency and bounded retry with exponential backoff plus jitter and MUST honor applicable Google retry/quota guidance.

### 3.10 Conflicts and Merge Semantics

**CONFLICT-001 — Text three-way merge.** When a safely recognized text file changed independently on both sides from the same trustworthy base, resolution MUST use BASE + LOCAL + REMOTE three-way merge semantics.

**CONFLICT-002 — Clean merge.** A proven clean three-way merge MAY be accepted automatically as the new content and synchronized to both sides.

**CONFLICT-003 — True text conflict.** If changes cannot be safely merged, the system MUST preserve both complete versions, preserve enough base/provenance information for review, and surface the conflict. It MUST NOT silently choose the newest or preferred side.

**CONFLICT-004 — No newest-wins.** Timestamp-based newest-wins resolution is PROHIBITED for concurrent text or binary content changes.

**CONFLICT-005 — Binary/opaque conflict.** If an opaque/binary file changed independently on both sides, both complete versions MUST be preserved and the conflict surfaced; the plugin MUST NOT automatically overwrite either version merely because of timestamp order.

**CONFLICT-006 — Delete-vs-modify.** When one side deletes content that the other side independently modified after the common base, the modification MUST survive and the deletion conflict MUST be surfaced. A concurrent delete cannot silently erase independent modification.

**CONFLICT-007 — Path isolation.** A conflict normally blocks only the affected path. Unrelated safe paths SHOULD continue synchronizing unless the conflict indicates broader identity/state corruption.

**CONFLICT-008 — Conflict copies.** Preserved conflict/alternate files MUST use deterministic, collision-safe naming near the original logical content, including enough source/device and time provenance to distinguish versions.

**CONFLICT-009 — Conflict retention.** Conflict copies MUST NEVER be automatically deleted as cleanup.

**CONFLICT-010 — Resolution controls.** Conflict UI MUST support the decisions meaningful to the case, including keep local, keep remote, keep both, accept a clean merge, and manual resolution where applicable.

**CONFLICT-011 — Resolution propagation.** Once the user explicitly resolves a conflict, the selected/resolved content becomes the new authoritative vault content and propagates normally.

### 3.11 Rename and Move Semantics

**MOVE-001 — Identity-preserving rename.** A rename/move SHOULD be represented as a rename/move rather than delete-and-create whenever it can be identified safely.

**MOVE-002 — Drive identity preservation.** Remote renames/moves MUST preserve Google Drive file ID and object history where the Drive API permits it.

**MOVE-003 — Evidence-based recognition.** Rename detection MUST rely on stable identity and/or sufficiently strong prior-state/content evidence. Ambiguous matches MUST NOT be guessed.

**MOVE-004 — Local Obsidian semantics.** When applying a remote rename/move locally, the implementation SHOULD use Obsidian-supported file-management behavior where needed to preserve Obsidian link-update semantics rather than bypassing Obsidian carelessly.

**MOVE-005 — Ambiguous move.** If an apparent rename/move cannot be uniquely proven, the path MUST be treated conservatively as a collision/conflict or safe independent operations; destructive identity reassignment is prohibited.

### 3.12 Filesystem Scope, Paths, and File Types

**FILE-001 — Whole-vault default.** Ordinary vault content is synchronized by default except explicit exclusions and the protected configuration/operational-state boundaries specified below.

**FILE-002 — All file types.** Enumeration MUST include all in-scope filesystem files, not only Obsidian-recognized document types. Unknown or unsupported formats MUST synchronize as opaque binary data.

**FILE-003 — Empty folders.** Empty directories are part of the synchronized vault structure and MUST be preserved.

**FILE-004 — Hidden files.** Hidden/dotfiles are included by default unless covered by an explicit/default exclusion. The active Obsidian configuration directory is governed separately by CONFIG requirements.

**FILE-005 — Visible exclusions.** Path/pattern exclusions MUST be explicit, visible, and configurable. The same exclusion semantics MUST be applied consistently to local and remote views so excluded material cannot be misread as one-sided deletion.

**FILE-006 — Conservative default noise exclusions.** Known non-vault operational noise, including `.git` content, OS metadata, lock/temporary files, and plugin/runtime caches, MUST be excluded by safe visible defaults. Exact patterns MAY evolve through engineering validation.

**FILE-007 — Symlink/junction boundary.** The plugin MUST NOT follow symlinks, junctions, aliases, or equivalent external filesystem references outside the vault synchronization boundary. Unsupported references MUST be surfaced or excluded safely.

**FILE-008 — Path normalization.** Path comparison MUST account for separator normalization, Unicode-equivalent representations, and platform case/path semantics while preserving the user's original safe names.

**FILE-009 — Collision protection.** Unicode-equivalent names, case-only distinctions, reserved/invalid names, or other path combinations that cannot coexist safely across Windows and iOS MUST become explicit blocked/conflict conditions rather than silent normalization or overwrite.

**FILE-010 — Path compatibility preflight.** Filename/path validity and path-length compatibility MUST be checked before executing operations that would create an invalid local path.

**FILE-011 — Metadata scope.** Synchronization MUST preserve content, logical names/paths, and identity/timestamp metadata necessary for correct synchronization. OS-specific ACLs, Windows permissions, extended attributes, and other non-portable filesystem metadata are not synchronized.

**FILE-012 — No content deduplication by accident.** Separately named/path-addressed files MUST remain distinct even when their bytes are identical. Content hashes are change evidence, not authorization to collapse user files.

**FILE-013 — Write stability.** Files still being actively written MUST not be transferred as stable final versions. The system MUST use a stability/precondition mechanism appropriate to the runtime.

**FILE-014 — Per-path failure isolation.** A repeatedly failing individual file/path SHOULD be isolated as a surfaced error while unrelated safe work continues, unless the failure implies global state/identity uncertainty.

**FILE-015 — Read/access failure is not deletion.** Failure to read/stat/access an expected local path MUST NOT be converted into deletion evidence. The affected path MUST be blocked/surfaced until its existence/change state can be established safely; unrelated safe paths MAY continue.

### 3.13 Deletion and Destructive-Operation Safety

**DELETE-001 — Attested deletion.** A missing file/folder counts as an intentional deletion only when trustworthy prior synchronization state proves it previously existed on that side and the current absence is itself reliably observed. Never-seen content, access/read failures, and missing/untrusted state cannot authorize deletion.

**DELETE-002 — Recoverable deletion.** Normal propagated deletions MUST use recoverable local/Obsidian trash and Google Drive trash where feasible, not immediate hard deletion.

**DELETE-003 — Ordinary deletion propagation.** Low-risk, well-attested deletions MAY propagate automatically during automatic synchronization without per-item user confirmation.

**DELETE-004 — No automatic trash purge.** The plugin MUST NOT automatically empty Google Drive trash or local recovery/trash stores.

**DELETE-005 — Circuit breaker.** The planner/executor MUST contain a mass-deletion/destructive-operation circuit breaker.

**DELETE-006 — Breaker signals.** The breaker MUST consider at least absolute destructive-operation count, percentage of the relevant vault affected, deviation from normal/recent behavior where available, and whether synchronization state is absent/rebuilt/untrusted.

**DELETE-007 — Breaker action.** A suspicious destructive plan MUST halt before destructive execution and require explicit user review/approval. It MUST be visible in the conflict/recovery/safety UI.

**DELETE-008 — Recovery checkpoint.** Unusually destructive operations MUST have a practical recoverable checkpoint in addition to ordinary trash behavior before execution is permitted.

**DELETE-009 — No unsafe force bypass.** The product MUST NOT provide a global force-sync command that casually bypasses deletion, conflict, state-integrity, identity, or transfer-integrity safeguards.

**DELETE-010 — Exact thresholds.** Numeric circuit-breaker thresholds and adaptive heuristics are engineering parameters, but their defaults MUST be conservative and MUST be validated against both legitimate bulk reorganization and corruption/mass-deletion scenarios.

### 3.14 Obsidian Configuration Synchronization

The active Obsidian configuration directory MUST be obtained from the runtime rather than assumed permanently to be named `.obsidian`.

**CONFIG-001 — Separate boundary.** The active Obsidian configuration directory MUST be excluded from ordinary vault-content synchronization and handled only by the dedicated selective configuration-sync policy.

**CONFIG-002 — Selective portable configuration.** The product MUST support synchronization of portable Obsidian configuration that is safe to share between Windows and iOS, rather than synchronizing the configuration directory wholesale.

**CONFIG-003 — Portable-configuration eligibility contract.** A configuration artifact is eligible for synchronization only when its semantics are known sufficiently to establish that it is portable across supported devices and does not contain authentication secrets, device identity, synchronization state, caches/runtime state, or platform-specific session/workspace state. The implementation MUST use an explicit allowlist or equivalently explicit classifier; unknown configuration artifacts are excluded by default until their portability/safety is established. Exact filenames and version-specific mappings are engineering-maintained details, not fixed product semantics.

**CONFIG-004 — Device-local configuration.** Workspace/layout/session state, caches, temporary/lock data, platform-specific state, and other configuration known to represent a device's local runtime rather than portable user configuration MUST remain device-local by default.

**CONFIG-005 — Authentication and sync-state exclusion.** OAuth secrets/tokens, secure-storage values, device ID, synchronization base, Drive change cursors, checkpoints/journals, tombstones, recovery state, audit logs, caches, and other operational synchronization state MUST NEVER be synchronized through configuration sync.

**CONFIG-006 — This plugin's settings.** The plugin MAY synchronize a sanitized portable subset of its own nonsecret settings, but device-local controls, credentials, secret material/references that would expose secret values, device identity, pairing-sensitive operational state, and runtime state MUST remain local.

**CONFIG-007 — Third-party plugin settings.** Arbitrary third-party plugin settings MUST NOT be synchronized wholesale merely because they reside under the configuration directory. A third-party setting is eligible only if its representation satisfies CONFIG-003 or the user explicitly opts into a known-safe selection mechanism. Generic third-party settings synchronization is not required for v1.

**CONFIG-008 — Visible policy.** The effective configuration inclusion/exclusion policy MUST be visible to the user. Secrets and protected operational state remain non-synchronizable even when a broad path pattern would otherwise include them.

**CONFIG-009 — Configuration conflicts.** Portable configuration conflicts MUST follow conservative conflict semantics appropriate to the configuration type; a device-specific or secret-bearing value MUST never be overwritten onto another device merely to achieve convergence.

### 3.15 Observability, History, and Recovery UX

**UI-001 — Current status.** The plugin MUST continuously expose a clear current status sufficient to distinguish at least: idle/ready, planning, syncing, offline/deferred, authentication required, paused, conflict present, destructive plan blocked, recovery required, and error.

**UI-002 — Sync preview.** Manual preview MUST summarize action counts by material category and allow inspection of affected paths/reasons before Execute.

**UI-003 — Conflict/recovery management.** A dedicated management experience MUST surface unresolved conflicts, preserved alternates, blocked destructive plans, identity/path ambiguity, and recovery-required conditions with actionable resolution paths.

**UI-004 — Meaningful notifications only.** Notifications SHOULD be reserved for material conditions such as conflicts, blocked destructive plans, authentication failure, recovery mode, or repeated synchronization errors. Routine successful background work SHOULD avoid notification noise.

**UI-005 — Audit/history.** The system MUST keep bounded user-visible synchronization history covering plans/runs, executed operations, conflicts, deletions/trash actions, errors, recovery events, and user safety approvals/resolutions sufficient for diagnosis and recovery.

**UI-006 — Audit privacy.** Audit/history MUST contain operation metadata and evidence, not full note contents or binary payloads.

**UI-007 — Retention.** Audit/history retention MUST be bounded and configurable so it remains useful without unbounded storage growth.

**UI-008 — Verify/Reconcile command.** The user MUST be able to request a full integrity verification/reconciliation independent of the incremental change cursor.

### 3.16 Network, Quota, and Resource Failure Behavior

**FAIL-001 — Offline operation.** Offline editing is fully supported. When connectivity returns, local and remote changes MUST reconcile from state/evidence rather than assuming the offline side is authoritative.

**FAIL-002 — Transient network retry.** Retryable network and Google API failures MUST use bounded exponential backoff plus jitter, after which work is deferred cleanly rather than blocking local use indefinitely.

**FAIL-003 — Quota/rate response.** Google rate-limit/quota guidance, including applicable retry timing, MUST be honored. Repeated quota failure MUST surface an actionable deferred/error condition.

**FAIL-004 — Remote storage full.** Google Drive storage/quota exhaustion MUST preserve all local changes, stop affected remote writes, and surface the condition. A destructive fallback is prohibited.

**FAIL-005 — Local disk full.** Local disk-space exhaustion MUST preserve existing valid local data, stop affected writes/downloads, and surface the condition. A partial replacement MUST not destroy the previously valid file.

**FAIL-006 — Mobile resource pressure.** Automatic work MAY defer expensive batches under constrained mobile conditions. Manual synchronization MUST remain available when feasible, and deferral MUST not weaken correctness.

**FAIL-007 — Unsupported path/file condition.** An unsafe path or unsupported filesystem object MUST block only affected work where isolation is safe; it MUST not be silently renamed, discarded, or followed outside the vault.

### 3.17 Privacy and Security

**PRIV-001 — No external telemetry by default.** The plugin MUST NOT send usage telemetry, vault metadata, diagnostics, or analytics to developer-controlled or unrelated third-party systems by default.

**PRIV-002 — Local diagnostics.** Logs/diagnostics remain local unless the user explicitly exports/shares them.

**PRIV-003 — Content minimization.** Diagnostics and audit history MUST NOT store full note content or binary payloads unless the user explicitly exports a content artifact for a specific recovery/debugging action.

**PRIV-004 — No custom E2E encryption requirement.** Version 1 does not require plugin-controlled end-to-end encryption of Google Drive content. Google account/Drive transport/storage security is the baseline unless a later product decision adds application-level encryption.

### 3.18 BRAIN Asset-Workflow Boundary

**ASSET-001 — Separate ChatGPT Work responsibility.** The existing ChatGPT Work workflow that semantically classifies/externalizes certain BRAIN binary assets remains separate and is not subsumed by this plugin.

**ASSET-002 — Filesystem-only semantics.** The sync plugin synchronizes filesystem state; it does not perform AI sensitivity screening, semantic classification, canonical-asset selection, externalization, or note-link rewriting.

**ASSET-003 — Independent binary in Inbox.** A binary file independently placed in `00-Inbox` is an ordinary vault file for synchronization and MUST be synchronized byte-for-byte until another authorized workflow changes or deletes it.

**ASSET-004 — Embedded binary.** A binary physically embedded inside a container file such as DOCX is not extracted by synchronization; the containing file is one opaque synchronized object.

**ASSET-005 — Materialized attachment.** An attachment materialized by Obsidian as a separate vault file is synchronized as a separate ordinary vault object along with the referencing note.

**ASSET-006 — Asset repository exclusion.** The existing Google Drive BRAIN asset repository is outside the synchronization engine's management boundary. The plugin MUST NOT enumerate, reconcile, rename, trash, delete, or otherwise manage that repository as part of BRAIN vault synchronization.

**ASSET-007 — Externalization deletion semantics.** If ChatGPT Work externalizes an asset and deletes its vault binary, that vault deletion is an ordinary attested vault deletion and may propagate across local vaults and the BRAIN Sync remote.

**ASSET-008 — Canonical asset immunity.** Propagating removal of the vault binary MUST NEVER be interpreted as permission to delete the separately externalized canonical asset in the BRAIN asset repository.

### 3.19 Plugin Lifecycle and Disconnect Safety

**LIFE-001 — Disable/uninstall safety.** Disabling or uninstalling the plugin MUST NOT automatically delete local vault content, the shared BRAIN Sync remote, conflict/recovery content, or recovery state needed to reconnect safely.

**LIFE-002 — Device unlink is non-destructive.** Removing/deauthorizing this device MUST be logically distinct from deleting the shared synchronization remote. Device removal MUST NOT delete shared vault data or impair other valid devices.

## 4. Observable Behavior

This section defines externally meaningful workflows that distinguish correct from incorrect operation. It does not prescribe private method/class sequences.

### 4.1 Initial Setup on the First Device

1. The user enables the plugin in the local BRAIN vault.
2. The plugin establishes a device ID and validates that it is not silently reusing an ambiguous cloned identity.
3. The user configures/uses their own Google OAuth application and authenticates on the same device.
4. The plugin creates a new dedicated BRAIN Sync remote or explicitly validates an existing one.
5. The plugin establishes/validates the stable BRAIN synchronization identity and remote protocol/schema compatibility.
6. The user sees the effective vault/configuration exclusions.
7. The plugin scans local and accessible managed remote state and constructs a first-sync safe-union plan.
8. No deletion is present merely because a side is empty, unreadable, partially observed, or unknown.
9. The user reviews the preview and explicitly executes it.
10. Completed transfers are verified before trustworthy base state is committed.
11. Automatic synchronization may then be enabled.

Incorrect behavior includes silently choosing a same-named folder, deleting content during initialization, enabling automatic destructive sync before a base exists, or requiring desktop token transfer to authenticate iPhone.

### 4.2 Pairing an Additional Device

A second device authenticates independently, explicitly locates/pairs to the same stable BRAIN Sync identity, verifies protocol compatibility, and performs safe-union/reconciliation against its local vault. Existing local content is not assumed stale or disposable merely because a remote exists. The resulting base is device-appropriate while shared identity/tombstone semantics prevent stale resurrection.

### 4.3 Ordinary Local Edit

A stable local edit triggers a debounced sync when enabled. The planner compares local evidence, remote evidence, and base. If only local content changed, the plugin uploads/updates the existing remote object where appropriate, verifies the result, then commits the new base. A local edit while offline remains local and is reconciled later.

### 4.4 Ordinary Remote-Managed Change

A change to a managed Drive object is observed through incremental change tracking. If only the managed remote changed, the plugin safely downloads and atomically replaces/creates the local file, verifies the transferred content, and commits state. Unexpected structural changes are evaluated conservatively rather than blindly trusted.

### 4.5 Concurrent Text Edit

If the same recognized text file changed independently on two devices from the same base, the plugin uses three-way merge. Non-overlapping changes may converge automatically. A genuine overlap preserves both complete source versions and requires/permits explicit user resolution; timestamp order never silently decides the winner.

### 4.6 Concurrent Binary Edit

Both versions survive. The user sees a conflict with source/provenance. Neither binary is silently overwritten because it is newer.

### 4.7 Rename/Move

A proven local or remote rename/move preserves logical file identity and the Drive object ID where possible. A local application of a remote rename respects Obsidian link-management behavior. Ambiguous rename candidates are not guessed.

### 4.8 Deletion

A file missing from one side is propagated as a deletion only when trustworthy base/tombstone evidence establishes that it previously existed there, the current absence is reliably observed, and the other side did not independently modify it. Deletion uses recoverable trash. Delete-vs-modify preserves the modification and surfaces a conflict.

### 4.9 Suspicious Bulk Destruction

Before a suspicious destructive plan executes, the circuit breaker blocks destructive actions and presents the plan/recovery checkpoint for explicit review. There is no global bypass that converts unknown or corrupt state into authority to delete.

### 4.10 Interrupted Run / iOS Suspension

If Obsidian is suspended, killed, or the network fails mid-run, already durable verified actions remain recorded; unfinished/uncertain actions do not masquerade as complete. On return, the plugin safely resumes or re-plans from reality.

### 4.11 Corrupt or Missing State

Corrupt state is not treated as an empty valid base. The user sees a recovery-required state. The plugin rebuilds knowledge conservatively and prohibits destructive inference until a new trustworthy base is established and previewed.

### 4.12 ChatGPT Work Asset Externalization

If ChatGPT Work converts a vault binary into an external Google Drive asset link and removes the vault binary, synchronization propagates only the vault-side file deletion. The external canonical asset remains untouched because its Drive domain is outside this plugin.

### 4.13 Disable, Uninstall, or Device Removal

Disabling/uninstalling stops plugin execution without erasing shared or local content. Removing a device identity/deauthorization does not delete the shared remote. Any future capability that destroys the shared BRAIN Sync remote must be a separate explicitly destructive operation and cannot be conflated with routine disconnect/uninstall behavior.

## 5. Responsibilities and Boundaries

The following are **logical responsibilities**, not mandated class names or source-file layout.

### 5.1 Obsidian Plugin / User-Control Boundary

Owns commands, settings, status, preview, conflict/recovery interaction, safe lifecycle integration, and platform capability detection. It must not contain hidden product policy that contradicts planner/state contracts.

### 5.2 Authentication Boundary

Owns same-device OAuth initiation/return validation, token refresh/revocation handling, and device-local secret access. Vault content never crosses this boundary except through authenticated Drive API requests made by the Drive integration.

### 5.3 Local Vault Boundary

Owns safe enumeration, read/write/trash/rename behavior, path compatibility, file stability, and the distinction between ordinary vault content, selective configuration content, and plugin operational state.

### 5.4 Google Drive Boundary

Owns Drive REST/API operations, `drive.file` authorization, managed-root identity, stable Drive IDs, content transfer, metadata/change-feed operations, retries, and recoverable Drive trash semantics. It must expose enough stable semantics that synchronization logic does not depend on raw API response quirks.

### 5.5 Synchronization-State Boundary

Owns durable per-device base/history, identity mappings, change cursor, tombstones, checkpoints, schema version, and recovery status. It is authoritative for what the device previously knew, but it does not outrank actual local/remote reality when integrity validation fails.

### 5.6 Snapshot/Reconciliation Planning Boundary

Consumes local snapshot + remote snapshot/change evidence + trustworthy base/history and derives the explicit plan without directly mutating content. Destructive safety and conflict classification belong here or in a mandatory pre-execution policy layer that cannot be bypassed.

### 5.7 Execution/Transfer Boundary

Applies an already validated plan using safe per-operation preconditions, transfer-integrity checks, bounded concurrency, atomic replacement, recoverable deletion, and durable commit ordering. It cannot invent a different resolution policy from the plan.

### 5.8 Conflict and Recovery Boundary

Owns three-way merge semantics, preserved alternate versions, user conflict choices, untrusted-state reconstruction, destructive blocking, and the transition back to trustworthy normal operation.

### 5.9 Configuration-Sync Boundary

Owns only explicitly portable/sanitized Obsidian configuration. It is separate from ordinary vault-content synchronization and cannot copy device-local state or secrets.

### 5.10 External BRAIN Asset Boundary

The pre-existing Google Drive BRAIN asset repository and ChatGPT Work semantic workflow are external systems. There is no synchronization-management interface from this plugin into that asset repository.

## 6. Component Interactions and System Contracts

### 6.1 Snapshot Contract

A synchronization decision is made against a bounded, internally coherent set of observations. A snapshot must distinguish:

- current local existence/content identity;
- current managed-remote existence/content identity;
- whether a local path was successfully observed versus unreadable/inaccessible;
- stable Drive object identity;
- previous trustworthy base state;
- deletion/tombstone history;
- whether remote enumeration/change-feed coverage is complete enough for the conclusion being drawn;
- whether local files were stable when observed;
- whether any identity/path ambiguity exists.

A snapshot that is partial, inaccessible, or known stale cannot authorize destructive conclusions that require complete knowledge.

### 6.2 Plan Contract

A plan is a deterministic statement of intended synchronization effects from the supplied observations and policy. It carries sufficient provenance/preconditions to be validated before execution. The same core plan representation serves manual preview, automatic execution, tests, safety checks, and audit.

### 6.3 Operation Commit Contract

For a content-changing operation, the logical authority order is:

1. validate that the planned precondition remains true;
2. perform the content/identity mutation using retry-safe semantics;
3. verify the durable result/content identity as required;
4. only then persist authoritative synchronization state saying the operation succeeded.

The exact transaction/journal technology is engineering discretion, but reversing this authority order is prohibited.

### 6.4 Incremental Change Contract

A stored Drive change cursor describes the last durably incorporated change position. The cursor is not advanced past changes whose corresponding local/remote/state effects are not durably accounted for. Cursor loss or invalidation causes conservative full reconciliation.

### 6.5 Conflict Contract

Conflict resolution cannot destroy evidence needed to recover either concurrent version. Clean merges may converge automatically; unresolved conflicts preserve complete alternates until explicit resolution. Conflict artifacts are ordinary protected user data once created and are not ephemeral cleanup objects.

### 6.6 Recovery Contract

Recovery begins from the presumption that uncertain state cannot authorize destruction. It uses actual local/remote observations and stable identity evidence to rebuild knowledge, produces a reviewable reconciliation result, and returns to normal mode only when a trustworthy base/protocol relationship is re-established. Drive version/trash history may assist but cannot substitute for trustworthy state reasoning.

### 6.7 Authentication Contract

Authentication success proves permission to access the intended managed Google Drive domain for the current account; it does not by itself prove the remote is the correct BRAIN remote. Pairing identity validation remains a separate required check.

## 7. Data, State, and Authority

### 7.1 Ordinary Vault Content

The local vault on each device and its corresponding managed remote representation are peers after initialization. Neither side is globally authoritative for all changes. The synchronization base/history determines whether a difference is a new change, a deletion, or a conflict.

### 7.2 Synchronization Base

The base represents the last trustworthy agreement/evidence between sides for relevant paths/identities. It is not merely a cache. Corruption or loss changes system safety state and therefore must be detected.

### 7.3 File Identity

Path is an address, not the only identity. Google Drive file ID plus historical/content evidence permits identity-preserving renames/moves. Identity ambiguity blocks destructive reassignment.

### 7.4 Vault and Device Identity

The remote BRAIN identity establishes which logical vault is synchronized. Device identity establishes provenance of an installation. Neither may be derived from mutable display names alone.

### 7.5 Tombstones

Deletion records are synchronization history needed to prevent resurrection and distinguish legitimate absence. They are retained according to stale-device safety rather than discarded immediately after deletion propagation.

### 7.6 Remote Protocol Metadata

Remote protocol/schema metadata is plugin-owned coordination data. Its concrete serialization and placement are engineering choices, but it must be versioned, scoped to the intended BRAIN remote, compatible with `drive.file`, and protected from interpretation as normal user vault content.

### 7.7 Local Operational State

Local operational state is device-local and excluded from vault/config sync. Storage technology is open, but durability, versioning, integrity detection, migration, backup/export, and crash consistency are required semantics.

### 7.8 Configuration Data

Configuration is split into:

- portable safe configuration eligible for selective synchronization;
- device-specific configuration that remains local;
- unknown/unclassified configuration, which remains local by default;
- secrets, which are always local and non-synchronizable;
- plugin operational synchronization state, which is always local except for deliberately designed shared protocol metadata.

## 8. System Invariants

The following conditions MUST remain true regardless of implementation:

**INV-001.** No missing or corrupt synchronization state can itself authorize deletion.

**INV-002.** No partial/failed remote enumeration can be treated as a complete proof that remote content is absent.

**INV-003.** No local read/access failure can be treated as proof that a previously known path was intentionally deleted.

**INV-004.** No authoritative state entry may claim a content operation succeeded before the operation is durable and integrity-verified.

**INV-005.** Concurrent content changes are never resolved solely by newest timestamp.

**INV-006.** A delete-vs-modify race never silently destroys the modified version.

**INV-007.** A binary conflict never silently discards one version.

**INV-008.** A true text conflict preserves complete recoverable versions until resolution.

**INV-009.** First synchronization cannot propagate deletion before a trustworthy base exists.

**INV-010.** Stable remote file identity is preserved across a proven rename/move whenever the Drive API supports that operation.

**INV-011.** Authentication secrets and device-local operational state never enter vault/config synchronization payloads.

**INV-012.** The BRAIN asset repository is never inside the sync engine's management scope.

**INV-013.** Offline/local editing remains available when remote synchronization is unavailable.

**INV-014.** iOS-required behavior never depends on desktop-only APIs.

**INV-015.** Suspicious bulk deletion cannot execute automatically through the ordinary synchronization path.

**INV-016.** A stale returning device cannot authorize destructive propagation before reconciliation.

**INV-017.** Path/platform collisions are surfaced rather than silently normalized into data loss.

**INV-018.** Unknown file types are preserved as opaque data rather than dropped because Obsidian does not recognize their extension.

**INV-019.** The same core planning semantics govern preview, automatic execution, diagnostics, and tests; a separate unsafe execution path is prohibited.

**INV-020.** Disable, uninstall, or device deauthorization cannot implicitly delete shared synchronization data.

## 9. Failure and Validation Behavior

| Condition | Required system response |
| --- | --- |
| Network unavailable | Preserve local use; defer remote work; retry boundedly later. |
| Google token invalid/revoked | Stop remote mutations; surface reauth; preserve local work; revalidate before destructive resume. |
| Wrong Google account | Require explicit re-pair; never adopt prior account state silently. |
| Remote BRAIN Sync root missing/inaccessible | Critical recovery state; no silent recreate/repopulate. |
| Sync state missing/corrupt/incompatible | Explicit untrusted/recovery state; no deletion inference; conservative rebuild. |
| Change cursor unavailable/invalid | Full safe reconciliation; no deletion conclusion from cursor failure. |
| Partial/failed remote listing | Do not infer missing remote objects as deletions. |
| Local path unreadable/inaccessible | Block/surface affected path; do not infer deletion. |
| Duplicate/ambiguous remote path or identity | Preserve content; block affected ambiguous operations; surface. |
| Local file changes during upload | Invalidate planned version; do not mark synchronized; re-plan/retry. |
| Remote changes during affected planned work | Invalidate/re-plan affected path. |
| Obsidian/iOS termination mid-run | Restart-safe recovery from durable completed/uncertain operation evidence. |
| Local disk full | Do not replace valid content partially; stop affected writes; surface. |
| Drive storage/quota full | Preserve local changes; stop affected remote writes; surface; no destructive fallback. |
| API 429/5xx/transient network error | Bounded retry/backoff/jitter; then safe defer/error. |
| Path invalid on target platform | Block affected creation; preserve source; surface collision/error. |
| True text conflict | Preserve complete versions; surface; block affected path pending resolution. |
| Binary conflict | Preserve complete versions; surface; never newest-wins. |
| Delete versus independent modification | Preserve modification; surface deletion conflict. |
| Suspicious mass deletion | Block before mutation; create/verify recovery checkpoint; require explicit review/approval. |
| Unsupported symlink/junction/external target | Do not follow; surface/exclude safely. |
| Individual repeated path failure | Isolate affected path when safe; continue unrelated safe work. |
| Plugin disable/uninstall/device removal | Stop participation without deleting shared/local content as a side effect. |

## 10. Fixed Decisions — Implementation May Not Reinterpret

The following are fixed product/architecture constraints:

- Obsidian plugin; TypeScript/JavaScript/npm ecosystem.
- Windows and iPhone/iOS first-class support.
- Local-first ordinary vault on every device.
- User's Google Drive is the remote; no Obsidian Sync dependency.
- One BRAIN vault, one personal Google Drive remote, one user in v1.
- Normal synchronization is bidirectional; persistent push-only/pull-only modes are excluded from v1.
- `drive.file` authorization scope.
- User-owned Google OAuth project/client.
- Same-device mobile authentication; no desktop token transfer requirement.
- Azure Static Web Apps Free is the approved preferred hosted callback platform if an HTTPS callback/bridge is required.
- Dedicated plugin-managed BRAIN Sync remote distinct from the existing BRAIN asset repository.
- Google Drive Changes API for normal incremental remote detection after baseline, plus periodic/on-demand full integrity reconciliation.
- Explicit dry-run/planning layer; manual Sync now previews before Execute.
- Persistent trustworthy base/history is required; corrupt/missing state enters safe recovery.
- Timestamps are advisory only, never overwrite authority.
- Local read/access failure is never deletion evidence.
- Three-way merge for concurrent recognized text changes.
- True conflicts preserve complete versions.
- Binary conflicts preserve complete versions.
- Delete-vs-modify preserves the modification.
- Identity-preserving renames/moves and Drive IDs where safely possible.
- Recoverable trash-based normal deletion.
- Drive version/trash history is supplementary recovery only, not a correctness dependency.
- Mass-deletion/destructive circuit breaker and recoverable checkpoint.
- Safe-union first synchronization and no first-sync deletion.
- Selective portable Obsidian configuration synchronization with secrets/device state excluded and unknown config excluded until classified safe.
- Unknown ordinary vault files synchronize as opaque binary.
- Disable/uninstall/device unlink are non-destructive by default.
- No external telemetry by default.
- No custom plugin-controlled E2E encryption requirement in v1.
- ChatGPT Work asset externalization remains separate; existing BRAIN asset repository is never managed by this plugin.
- Google Drive Mirror is the primary engineering foundation/baseline; Google Drive Merge Sync is a secondary donor/reference; neither defines product behavior.

## 11. Engineering Discretion

The following remain engineering choices provided all normative semantics above are preserved:

- whether construction begins as a direct fork of Mirror, a substantial adaptation, or selective transplantation into the current repository;
- exact internal class/module decomposition and private interfaces;
- exact state persistence technology, database/file format, journal format, and atomic-write mechanism;
- exact remote metadata serialization and physical folder/object layout within the dedicated BRAIN Sync domain;
- exact vault-level lease/lock implementation;
- exact three-way merge library/algorithm, provided required merge/conflict semantics and tests hold;
- exact cryptographic hash algorithm(s), local hash-cache representation, and cache invalidation implementation;
- exact upload/download chunking/streaming strategy and buffer sizes;
- exact mobile batch size, concurrency limits, retry limits, and default full-reconciliation cadence;
- exact numeric mass-deletion thresholds/heuristics, subject to conservative validated behavior;
- exact default tombstone retention durations, subject to stale-device safety;
- exact secure secret-storage adapter and compatibility fallback consistent with AUTH-009/AUTH-010;
- exact OAuth code-exchange topology required by the user's Google OAuth client type/current Google policy, provided same-device authentication, callback isolation, no vault-data handling, no token persistence by the callback, and other AUTH requirements remain true;
- exact version-specific Obsidian configuration filenames included by the explicit portable-configuration classifier/allowlist, provided CONFIG requirements remain satisfied;
- exact UI layout, naming, icons, and visual design;
- exact internal log/audit serialization and retention implementation;
- ordinary refactoring and helper choices necessary to cleanly adapt donor code.

Engineering discretion does **not** permit weakening required data-integrity, conflict, recovery, mobile, scope, or authorization behavior.

## 12. Non-Goals

Version 1 explicitly does not require:

- multi-user collaboration or role-based permissions;
- multiple independent vault sync targets;
- Shared Drive support;
- persistent push-only or pull-only modes;
- a generic synchronization service for arbitrary folders outside BRAIN;
- official Obsidian Community Plugin publication;
- a developer-hosted synchronization backend;
- Obsidian Sync interoperability as a required remote layer;
- live mounted-Google-Drive filesystem operation;
- semantic/AI processing of BRAIN content;
- replacement of the ChatGPT Work asset-processing workflow;
- management of the existing Google Drive BRAIN asset repository;
- automatic Google Docs/Sheets embedding or conversion;
- arbitrary manual editing of the plugin's Drive synchronization infrastructure as a supported workflow;
- blind synchronization of arbitrary third-party plugin settings;
- synchronization of OS ACLs, extended attributes, or Windows-specific metadata;
- hard-delete/trash-purge automation;
- a destructive force-sync bypass;
- custom application-level end-to-end encryption in the first release;
- true background execution on iOS beyond capabilities provided by Obsidian/iOS;
- external analytics/telemetry.

## 13. Completion Evidence

The product is not complete because it builds or because donor tests pass. Stage 3 must be able to verify every material requirement against implementation and executable evidence.

At minimum, construction MUST leave objective evidence in the following dimensions.

### 13.1 Build and Platform Evidence

- reproducible TypeScript/build success;
- plugin manifest/runtime state is mobile-compatible rather than desktop-only;
- Windows Obsidian functional testing;
- iPhone/iOS Obsidian functional testing for authentication, initial pairing, upload, download, conflict handling, interruption/resume, and UI-critical flows;
- no mobile-required module imports that depend on Node/Electron/Windows-only APIs.

### 13.2 Reconciliation Semantic Tests

Automated deterministic tests MUST cover, at minimum:

- fresh local only → upload;
- fresh remote only → download;
- equal collision → no-op/base establishment;
- divergent no-base collision → preserve both/conflict;
- unchanged on both sides → no-op;
- only-local modification → upload/update;
- only-remote modification → download/update;
- both text changed → three-way merge classification;
- clean three-way merge;
- true text conflict → preserved complete alternates;
- binary conflict → preserved complete alternates;
- local deletion after prior two-sided existence → recoverable remote deletion;
- remote deletion after prior two-sided existence → recoverable local deletion;
- delete-vs-modify in both directions → modification survives/conflict;
- both deleted → stable tombstone/base transition;
- no-base absence does not become deletion;
- unreadable local path does not become deletion;
- clock skew cannot change winner/conflict classification;
- stale/offline device cannot resurrect deleted content or authorize unsafe deletion;
- identity-preserving local and remote rename/move;
- ambiguous rename does not guess;
- path/Unicode/case collision blocking;
- exclusions applied symmetrically;
- unknown extension/binary synchronization;
- empty-folder behavior.

### 13.3 State and Crash-Safety Tests

Evidence MUST include controlled fault/interruption testing for:

- crash before content mutation;
- crash during upload/download;
- ambiguous network response after remote mutation;
- crash after content mutation but before state commit;
- crash during/after state commit;
- corrupt/truncated state representation;
- incompatible state/protocol version;
- lost Drive change cursor;
- partial remote listing;
- remote root deletion;
- clone/restore of device state;
- state migration with rollback/recovery checkpoint;
- safe cancellation.

No test may accept an empty-state fallback as proof of recovery from corruption unless the system is explicitly in non-destructive recovery mode.

### 13.4 Transfer and Large-Vault Evidence

- transferred-byte/content integrity verification tests;
- file-changing-during-transfer tests;
- bounded concurrency tests;
- retry/backoff/rate-limit tests;
- large-file tests;
- large-vault tests demonstrating bounded memory behavior appropriate to iOS;
- incremental Changes API operation plus full-reconcile correction path;
- Drive quota/local disk-space failure behavior.

### 13.5 Destructive-Safety Evidence

Tests MUST prove:

- first-sync deletion cannot occur;
- corrupt/missing base cannot authorize deletion;
- local read/access failure cannot authorize deletion;
- partial remote enumeration cannot authorize remote-absence deletion;
- circuit breaker blocks suspicious destructive plans before mutation;
- ordinary legitimate small deletions can still propagate;
- legitimate bulk reorganization can be reviewed/approved without bypassing safeguards;
- recovery checkpoint exists before unusually destructive approved execution;
- there is no unguarded global force-delete/force-sync path.

### 13.6 Authentication and Security Evidence

- same-device Google authorization works on Windows and iPhone;
- scope grant is limited to `drive.file`;
- no desktop token transfer is required;
- callback does not receive vault content or persist tokens;
- OAuth transaction state/anti-interception protections are verified;
- credentials/tokens are absent from synchronized configuration, audit logs, exported diagnostics, and repository source;
- revoked token behavior fails closed for remote mutation and preserves local use.

### 13.7 Configuration, Lifecycle, and Asset-Boundary Evidence

- active Obsidian config directory is not hard-coded as `.obsidian` for policy enforcement;
- ordinary vault sync cannot accidentally synchronize protected operational state;
- configuration synchronization uses an explicit safe portable policy and excludes unknown configuration by default;
- workspace/device-local state remains local by default;
- secrets never synchronize;
- disable/uninstall/device unlink does not delete shared/local content as a side effect;
- existing Google Drive BRAIN asset repository is never enumerated or mutated by the sync engine;
- ChatGPT Work externalization followed by vault-file deletion removes only the vault/sync-remote representation, not the canonical external asset.

### 13.8 Stage 3 Traceability Requirement

Independent validation MUST map each material requirement ID in this specification to:

1. implementation evidence;
2. automated or behavioral validation evidence;
3. pass/fail/partial status.

Passing tests that omit a specification requirement do not establish product completeness.

## 14. Decision-Register Traceability

This specification consolidates the authoritative decision register rather than replacing its historical record. Major requirement families trace to these decision ranges:

| Specification family | Primary decision-register sources |
| --- | --- |
| Process / authority | DEC-001–DEC-008 plus current Workflow A process amendment |
| Development environment / platform | DEC-010–DEC-019 |
| Product scope / local-first | DEC-020–DEC-028 |
| Donor/foundation strategy | DEC-030–DEC-035 |
| Sync triggers / execution / mobile | DEC-040–DEC-054 |
| First sync / onboarding / identity | DEC-060–DEC-070 |
| Remote structure / detection / recovery | DEC-080–DEC-091 |
| OAuth / least privilege | DEC-100–DEC-109 |
| State / recovery / interruption | DEC-120–DEC-139 |
| Conflict semantics | DEC-150–DEC-162 |
| Rename / filesystem / path behavior | DEC-170–DEC-188 |
| Deletion / destructive safety | DEC-200–DEC-209 |
| Dry-run / observability / audit / cancel | DEC-220–DEC-230 |
| Obsidian configuration | DEC-240–DEC-244 |
| Offline / network / mobile | DEC-250–DEC-254 |
| Transfer integrity | DEC-260–DEC-263 |
| Privacy / security | DEC-270–DEC-272 |
| BRAIN asset boundary | DEC-280–DEC-289 |

Where a deferred-engineering entry in the decision register is constrained further here, this document defines the required **outcome/contract** while retaining implementation discretion over ordinary mechanics.

## 15. Product-Decision Status

No currently known unresolved **product-authority** decision prevents decomposition or implementation of this target system.

Matters remaining open are engineering determinations expressly bounded by this specification, including concrete persistence technology, donor-code adoption mechanics, merge implementation, batching/concurrency parameters, circuit-breaker numeric thresholds, tombstone duration defaults, version-specific configuration allowlist entries, and exact OAuth code-exchange topology compatible with current Google policy.

If later engineering work discovers a choice whose alternatives would materially change the product defined here, that choice MUST be returned to the user rather than silently resolved.

## 16. Workflow A Stage-1 Handoff and Completion Gate

The project now uses **Workflow A** because construction will use supervised, persisted decomposition and potentially parallel worker agents.

This target-system specification is complete only as the **target-definition artifact**. Stage 1 as a whole is not complete until the supervisor also persists:

1. the minimum sound ordered build decomposition required by the development manual;
2. a complete requirement-to-build-phase coverage mapping using the requirement IDs in this specification;
3. dependency and cross-phase contract definitions sufficient to prevent drift;
4. any stable shared interfaces/contracts that must be frozen before parallel work can safely begin;
5. a Stage 1 coverage/dependency check proving that all requirements are assigned, dependencies precede dependents, no phase exists only for organizational convenience, and completing all phases necessarily produces this target system.

Under Workflow A, detailed coding-agent prompts MUST NOT be generated en masse from the Stage 1 repository snapshot. Each build-session prompt must be generated by a supervisor against the **actual repository state that exists when that session begins**, while consuming this specification and the persisted decomposition/coverage artifacts.

Parallel worker agents may be used only where the decomposition establishes genuinely independent workstreams or frozen shared boundaries. Integration authority remains with the supervisor lineage, and no worker-agent implementation decision may redefine this target specification.
