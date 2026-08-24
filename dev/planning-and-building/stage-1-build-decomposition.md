# BRAIN Google Drive Sync Plugin — Stage 1 Minimum Sound Build Decomposition

## 1. Status and Authority

**Status:** Authoritative Stage 1 build decomposition  
**Project:** `woodpk/gdrive-sync-obsidian-plugin`  
**Workflow:** Workflow A — Stage 0 → Stage 1 → Stage 2A → Stage 3  
**Governing manual:** `agent-led-software-product-construction-manual.md`  
**Target-system authority:** `target-system-specification.md`  
**Decision authority:** `decision-register.yaml`  
**Date:** 2026-08-23

This artifact is the compact persisted build decomposition required by Stage 1. It is subordinate to the target-system specification and may not redefine product behavior.

Detailed coding-agent prompts do not belong here. Under Stage 2A, each build-session prompt must be generated against the repository state that actually exists when that session begins.

## 2. Decomposition Standard Applied

The governing manual requires the target system to be divided into the fewest build phases that can be implemented accurately, safely, and verifiably. A phase exists here only where separation is justified by dependency order, architectural sequencing, a stable boundary required before dependent work, independent testability, risk isolation, prerequisite validation, or a meaningful integration boundary.

The repository is effectively pre-implementation at decomposition time: the root contains only `../../.idea` and `..`. No application source tree, build configuration, manifest, runtime code, or automated test suite exists yet. Therefore this document defines logical phase responsibilities and contracts without inventing future concrete file paths or private types.

## 3. Ordered Dependency Model

The minimum sound construction graph is:

```text
Phase 1 — Repository Foundation and Frozen Shared Contracts
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
Phase 2 — Core     Phase 3 —    Phase 4 —
Sync Semantics     Google Drive  Obsidian Local,
and Durable State  and OAuth     Platform, Config
             │           │           │
             └───────────┼───────────┘
                         ▼
Phase 5 — Integrated Synchronization Product and User Workflows
                         │
                         ▼
Phase 6 — Cross-Platform Hardening and Stage 3 Readiness
```

Phase 1 is sequential because it establishes the shared boundaries required for safe parallel construction. Phases 2, 3, and 4 are intentionally independent after Phase 1 and may execute concurrently under separate coding agents. Phase 5 is the integration boundary and therefore depends on successful completion of Phases 2, 3, and 4. Phase 6 requires the integrated product produced by Phase 5.

## 4. Shared Contracts That Must Be Frozen Before Parallel Work

Phase 1 must establish stable shared behavioral contracts for the following concepts before Phases 2, 3, and 4 begin in parallel. Exact interface/type names remain implementation discretion and must be determined from the repository created during Phase 1.

### 4.1 Snapshot and Observation Contract

The shared representation must distinguish local and remote existence, successful observation versus unreadable/inaccessible state, content/change evidence, stable remote identity, prior trustworthy base state, tombstone/deletion history, file stability, enumeration completeness, and identity/path ambiguity.

### 4.2 Synchronization Plan Contract

The shared plan representation must support the target specification's complete operation vocabulary, including no-op, upload/create, upload/update, download/create, download/update, rename/move, clean merge, unresolved conflict, recoverable deletion/trash, blocked/unsafe action, and recovery-required state. Planned operations must carry preconditions and enough reason/evidence metadata for preview, execution validation, testing, safety policy, and audit.

### 4.3 Local Vault Boundary Contract

The synchronization core must interact with the local vault through a boundary capable of safe enumeration, read, write/replace, rename/move, recoverable deletion, path validation, configuration classification, and change observation without depending directly on desktop-only APIs.

### 4.4 Google Drive Boundary Contract

The synchronization core must interact with Google Drive through a boundary capable of managed-root identity, stable Drive IDs, file/folder CRUD semantics, identity-preserving moves, recoverable trash, content transfer, metadata, incremental changes, complete reconciliation listing, retry/rate-limit signaling, and remote protocol/version information.

### 4.5 Durable State Contract

The state boundary must represent trustworthy base/history, device and vault identity, remote-object mapping, tombstones, change cursors, checkpoint/operation status, schema version, recovery state, and enough integrity information to distinguish valid state from missing, corrupt, incompatible, or uncertain state.

### 4.6 Conflict and Merge Contract

The planner/executor boundary must distinguish clean merge from unresolved conflict and must preserve provenance sufficient to retain both complete conflicting versions. No shared contract may encode newest-timestamp-wins semantics.

### 4.7 Execution Result and Commit Contract

Operation results must distinguish durable success, retryable failure, blocked/unsafe state, cancellation, stale-precondition invalidation, and uncertain outcome. Successful synchronization state may be committed only after the underlying mutation is durable and transfer integrity is verified.

### 4.8 Status, Audit, and User-Action Contract

The product surface must be able to consume stable status/plan/conflict/recovery/audit semantics without reimplementing synchronization policy in the UI. User actions such as Execute, conflict resolution, destructive-plan approval, pause/resume, and Verify/Reconcile must flow through shared product contracts rather than bypass the planner/executor.

### 4.9 Parallel Ownership Rule

After Phase 1, the Phase 2 agent owns synchronization semantics and operational-state implementation; the Phase 3 agent owns Google Drive and OAuth implementation; the Phase 4 agent owns Obsidian-local/platform/configuration implementation. A parallel agent must not independently change a frozen shared contract. Any required contract change must be returned to the supervising lineage, reconciled centrally, persisted, and communicated to all affected workstreams before dependent work continues.

## 5. Build Phase 1 — Repository Foundation and Frozen Shared Contracts

### 5.1 Objective

Establish a buildable, testable, mobile-compatible Obsidian plugin repository and the stable cross-workstream contracts required for safe parallel implementation.

### 5.2 Starting Assumptions and Prerequisites

- The target-system specification and decision register are authoritative.
- The repository contains no existing product implementation to preserve.
- Google Drive Mirror is the primary engineering foundation/baseline; Google Drive Merge Sync is a secondary donor/reference.
- The direct-fork versus adaptation/transplant strategy remains an engineering decision and is resolved here through repository and donor inspection rather than by product authority.

### 5.3 Required End State

- The repository has a functioning TypeScript/JavaScript/npm Obsidian-plugin build and automated-test baseline.
- The plugin manifest/runtime baseline is explicitly mobile-compatible and does not require desktop-only execution.
- The engineering strategy for adopting/reusing donor code is selected and reflected in the actual repository without importing donor behavior that contradicts the target specification.
- Logical ownership boundaries from the target specification are represented in the codebase sufficiently to prevent synchronization policy from being embedded directly in Google Drive, Obsidian I/O, or UI code.
- The shared contracts in Section 4 exist in source and are stable enough for Phases 2, 3, and 4 to implement independently.
- Test doubles/fakes or equivalent contract-testing seams exist so each parallel workstream can be tested without requiring the other workstreams to be complete.
- The baseline contains no credentials or developer-controlled telemetry.

### 5.4 Principal Contracts and Invariants Introduced or Preserved

- Preserve the target specification's authority over donor code.
- Preserve mobile-safe dependency direction.
- Freeze snapshot, plan, local-vault, Drive, state, conflict, execution-result, status, and audit semantics before parallel work begins.
- Keep product policy in synchronization/planning contracts rather than transport or UI adapters.
- Ensure no shared interface embeds timestamp-winner, unsafe deletion, broad Drive-scope, desktop-token-transfer, or other superseded donor semantics.

### 5.5 Dependencies

None beyond the authoritative Stage 1 artifacts and donor/source grounding.

### 5.6 Acceptance Criteria

- A clean checkout installs dependencies, builds, and runs the initial automated test suite successfully.
- The plugin baseline is configured to support both desktop and mobile Obsidian.
- Automated architecture/contract checks or equivalent inspection demonstrate that mobile-required paths do not depend on desktop-only facilities.
- Every Section 4 shared contract is present and exercised by at least one contract/unit test or fake-based compile/test path.
- Phase 2, Phase 3, and Phase 4 implementation can begin without needing to invent or independently redefine cross-workstream semantics.
- No target-system product requirement is weakened by the selected donor-code strategy.

### 5.7 Non-Goals

- Do not implement complete synchronization behavior.
- Do not implement the complete Google Drive/OAuth integration.
- Do not implement the complete Obsidian filesystem/configuration integration.
- Do not implement the final user interface or onboarding workflows.
- Do not add speculative abstractions unrelated to a target requirement or cross-phase dependency.

## 6. Build Phase 2 — Core Synchronization Semantics and Durable State

### 6.1 Objective

Implement the deterministic synchronization decision model and the durable operational-state/recovery model that make data-safe bidirectional synchronization possible independently of concrete Google Drive and Obsidian I/O.

### 6.2 Starting Assumptions and Prerequisites

- Phase 1 is complete.
- Shared snapshot, plan, state, conflict, execution-result, and adapter contracts are frozen.
- Google Drive and Obsidian implementations may still be incomplete; this phase must be testable through fakes/contract implementations.

### 6.3 Required End State

- LOCAL + REMOTE + trustworthy BASE/history observations deterministically produce an explicit synchronization plan without mutating either side.
- Change truth uses identity, state, hashes/content evidence, and relevant metadata; timestamps remain advisory only.
- Safe-union first-sync semantics are implemented, including no first-sync deletion and preserve-both handling for divergent no-base collisions.
- Text concurrent modification supports BASE/LOCAL/REMOTE three-way merge classification; clean merges and unresolved conflicts are distinguished correctly.
- Binary conflicts and true text conflicts preserve both complete versions; delete-vs-modify preserves modification.
- Rename/move recognition is identity/evidence based and never guesses ambiguous identity.
- Attested deletion, tombstones, stale-device protection, recoverable-delete planning, destructive circuit breaking, and no-force-bypass policy are represented in the core planning/safety model.
- Persistent operational state supports vault/device identity, base/history, remote-object mappings, tombstones, operation/checkpoint state, schema/version information, recovery state, and backup/export evidence as required by the target.
- Missing, corrupt, truncated, incompatible, or internally inconsistent state is recognized as untrusted and enters non-destructive recovery rather than empty-base behavior.
- State persistence and operation bookkeeping are crash-consistent: durable state cannot claim success ahead of durable verified effects.
- Core logic supports cancellation, stale-precondition invalidation, later reconciliation, and per-path isolation semantics required by the target.

### 6.4 Principal Contracts and Invariants Introduced or Preserved

- `PLAN-001` through `PLAN-009` planning semantics.
- `CHANGE-001` through `CHANGE-003` local/base change truth.
- `FIRST-001` through `FIRST-005` first-sync decision semantics; product workflow completion occurs in Phase 5.
- `STATE-001` through `STATE-017` operational-state semantics.
- `CONFLICT-001` through `CONFLICT-011` conflict/merge semantics at the domain level.
- `MOVE-001`, `MOVE-003`, and `MOVE-005` identity/evidence semantics.
- `DELETE-001` through `DELETE-010` destructive-safety semantics.
- `XFER-005` checkpoint semantics and the state-facing portion of `XFER-001`/`XFER-004`.
- `INV-001` through `INV-009`, `INV-015`, `INV-016`, and `INV-019` as core invariants.

### 6.5 Dependencies

Phase 1 only.

### 6.6 Acceptance Criteria

- Deterministic automated tests cover the complete reconciliation matrix required by Target Specification §13.2 using local/remote fakes.
- Tests prove clock skew cannot alter conflict/winner classification.
- Tests prove no-base absence, unreadable/unknown observation, corrupt state, or partial knowledge cannot become deletion authority.
- Tests prove first-sync deletion cannot occur.
- Tests prove true text conflict, binary conflict, and delete-vs-modify preserve required content.
- Tests prove stale-device/tombstone logic prevents unsafe resurrection or destructive authorization.
- Tests cover identity-preserving rename classification and ambiguous-rename refusal.
- State tests cover corruption, incompatible versions, checkpoint semantics, migration safety, clone/restore identity concerns, and crash-ordering around durable commits.
- Circuit-breaker tests distinguish ordinary small deletions from suspicious destructive plans and require approval/checkpoint semantics for the latter.
- Core tests run without live Google Drive or a real Obsidian vault.

### 6.7 Non-Goals

- Do not implement live Google OAuth or Drive REST transport.
- Do not implement concrete Obsidian vault filesystem behavior.
- Do not implement final UI, onboarding, or settings screens.
- Do not embed platform-specific policy in the domain engine.

## 7. Build Phase 3 — Google Drive and OAuth Boundary

### 7.1 Objective

Implement the complete user-owned Google authentication and managed Google Drive remote boundary required by the synchronization contracts, without allowing transport/API concerns to redefine synchronization policy.

### 7.2 Starting Assumptions and Prerequisites

- Phase 1 is complete.
- The Drive/authentication contracts are frozen.
- Phase 2 and Phase 4 may be under construction concurrently.

### 7.3 Required End State

- The plugin authenticates each device independently against the user's own Google OAuth application using `drive.file` only.
- Windows and iPhone can complete authentication without desktop token transfer.
- The external/system-browser OAuth flow, return mechanism, anti-CSRF state, and PKCE/current code-protection requirements satisfy the target specification.
- If a hosted HTTPS callback is required, the approved user-controlled Azure Static Web Apps boundary is implemented with no vault-data handling and no token persistence.
- Tokens/secrets remain device-local and are never placed into synchronized data, logs, or repository source.
- The Drive implementation creates or explicitly pairs to the dedicated managed BRAIN Sync remote and validates stable vault/remote identity independently from authentication success.
- The managed remote supports stable Drive IDs, content transfer, identity-preserving rename/move, recoverable trash, protocol/schema metadata, remote-root failure detection, and supplementary Drive history recovery where available.
- Incremental remote detection uses the Google Drive Changes API after baseline; durable change-cursor semantics conform to the shared contract.
- Full remote listing/reconciliation can establish completeness explicitly and cannot convert partial listing into deletion authority.
- Transfers support integrity evidence, safe retry after ambiguous failure, bounded concurrency, backoff/jitter, rate-limit handling, and large-file behavior appropriate to the target.
- Remote quota/storage failure preserves local data and fails safely.

### 7.4 Principal Contracts and Invariants Introduced or Preserved

- `AUTH-001` through `AUTH-012`.
- `REM-001` through `REM-010`.
- `CHANGE-004` through `CHANGE-007`.
- Remote-facing portions of `XFER-001`, `XFER-002`, `XFER-004`, `XFER-007`, and `XFER-008`.
- Remote-facing portions of `MOVE-002` and recoverable deletion behavior.
- `FAIL-002` through `FAIL-004` for remote/API failure handling.
- `PRIV-001` through `PRIV-004` as applied to authentication, API, callback, and diagnostics.
- `INV-002`, `INV-010`, `INV-011`, and `INV-014` at the Drive/auth boundary.

### 7.5 Dependencies

Phase 1 only. Phase 3 may execute in parallel with Phases 2 and 4.

### 7.6 Acceptance Criteria

- Automated tests/fakes verify Drive ID preservation, managed-root identity validation, remote rename/move, trash semantics, remote schema/version handling, missing-root recovery signaling, and ambiguous remote identity handling.
- Changes API tests verify cursor advancement only after durable incorporation and safe fallback to full reconciliation when the cursor is missing/invalid.
- Partial/failing remote enumeration tests prove absence cannot authorize deletion.
- Retry, rate-limit, quota, ambiguous-upload, large-file, and content-integrity tests pass.
- Authorization uses only `drive.file` and no repository credential is committed.
- Same-device authentication is demonstrated on Windows and iPhone/iOS at least to the extent possible before full product integration; any final lifecycle integration remaining is explicitly carried to Phase 5.
- Hosted callback behavior, if used, is demonstrably content-blind and token-nonpersistent.

### 7.7 Non-Goals

- Do not decide synchronization conflicts or deletion policy inside the Drive adapter.
- Do not implement Obsidian local filesystem semantics.
- Do not implement final sync orchestration, preview UI, or conflict/recovery UI.
- Do not broaden Drive scope, add Shared Drive support, or add multiple sync targets.

## 8. Build Phase 4 — Obsidian Local, Platform, and Configuration Boundary

### 8.1 Objective

Implement the Windows/iOS-safe local-vault and selective-configuration boundary so the synchronization engine can observe and mutate the BRAIN vault without unsafe filesystem assumptions, platform leakage, or accidental synchronization of device-local state.

### 8.2 Starting Assumptions and Prerequisites

- Phase 1 is complete.
- The local-vault/platform/configuration contracts are frozen.
- Phase 2 and Phase 3 may be under construction concurrently.

### 8.3 Required End State

- Local enumeration covers all in-scope vault files and empty directories, including unknown/binary files, while applying the same explicit exclusion semantics used by reconciliation.
- The active Obsidian configuration directory is discovered from runtime behavior rather than hard-coded as `.obsidian`.
- Portable configuration uses an explicit safe allowlist/classifier; unknown configuration remains local by default; workspace/session/cache/platform state, authentication secrets, and synchronization operational state remain excluded.
- The local boundary handles path normalization, Unicode/case collisions, invalid/reserved names, path-length compatibility, hidden files, exclusions, symlinks/junctions/external references, and read/access failures according to the target specification.
- Local writes/download replacements are atomic or functionally safe; local disk exhaustion cannot partially replace valid content.
- Local deletion uses recoverable Obsidian/local trash where feasible.
- Local rename/move preserves Obsidian link-management behavior where required.
- File-stability checks prevent transient mid-write states from being treated as stable transfer inputs.
- Local change/lifecycle observation supports startup readiness, later debounce/coalescing by the product orchestrator, iOS suspension/resume behavior, and isolation from initialization-generated events.
- The local boundary remains fully usable when remote authentication/network access is absent.
- Plugin disable/uninstall/device-unlink behavior is non-destructive.
- The existing Google Drive BRAIN asset repository remains outside this plugin; ordinary vault binaries, embedded binaries, and materialized attachments follow the target's filesystem-only semantics.

### 8.4 Principal Contracts and Invariants Introduced or Preserved

- `SYS-002` through `SYS-004` and `SYS-007` at the platform boundary.
- Local-trigger/lifecycle portions of `SYNC-003`, `SYNC-004`, `SYNC-006`, `SYNC-007`, `SYNC-011`, and `SYNC-012`.
- Local-facing portions of `XFER-002`, `XFER-003`, and `XFER-006`.
- `FILE-001` through `FILE-015`.
- `CONFIG-001` through `CONFIG-009`.
- Local-facing portions of `MOVE-004` and recoverable deletion.
- `FAIL-001`, `FAIL-005`, `FAIL-006`, and `FAIL-007` at the local/platform boundary.
- `ASSET-001` through `ASSET-008`.
- `LIFE-001` and `LIFE-002`.
- `INV-003`, `INV-012` through `INV-014`, `INV-017`, `INV-018`, and `INV-020` at the local/platform boundary.

### 8.5 Dependencies

Phase 1 only. Phase 4 may execute in parallel with Phases 2 and 3.

### 8.6 Acceptance Criteria

- Automated tests cover all-file enumeration, empty directories, hidden files, exclusion symmetry, unknown extensions, symlink/junction refusal, unreadable paths, and file stability.
- Cross-platform path tests cover separator normalization, Unicode-equivalent names, case collisions, reserved/invalid names, and path-length preflight without silent overwrite/normalization.
- Atomic-replacement and local-disk-exhaustion tests prove valid existing content is preserved on failure.
- Local trash and rename/move tests preserve required recoverability and Obsidian semantics.
- Configuration tests prove unknown configuration is excluded by default and protected operational/auth/device state cannot synchronize.
- Mobile compatibility tests demonstrate that required local behavior does not depend on Node/Electron/Windows-only APIs.
- Lifecycle tests prove startup initialization does not generate unsafe synchronization and iOS interruption can be handed safely to later orchestration.
- Tests prove plugin disable/uninstall/device unlink does not delete shared or local content.
- Tests demonstrate no code path enumerates or mutates the separate Google Drive BRAIN asset repository as part of local-vault synchronization.

### 8.7 Non-Goals

- Do not implement Google OAuth or Drive API behavior.
- Do not decide synchronization conflicts or destructive policy inside the local adapter.
- Do not implement final end-to-end synchronization orchestration or user workflow UI.
- Do not add arbitrary third-party plugin-settings synchronization.

## 9. Build Phase 5 — Integrated Synchronization Product and User Workflows

### 9.1 Objective

Integrate the Phase 2 synchronization/state engine with the Phase 3 Google Drive/OAuth boundary and Phase 4 Obsidian local/platform boundary to produce the complete user-facing synchronization product defined by the target specification.

### 9.2 Starting Assumptions and Prerequisites

- Phases 2, 3, and 4 have independently passed their acceptance criteria.
- Shared contracts from Phase 1 remain authoritative or have been centrally revised and persisted by the supervisor lineage.
- No parallel workstream has introduced unreviewed contract drift.

### 9.3 Required End State

- The user can complete guided first-device setup, same-device authentication, remote creation/pairing, vault/device identity establishment, exclusions review, first-sync preview, explicit execution, and successful base establishment.
- Additional devices can independently authenticate, explicitly pair to the correct BRAIN remote, and safely reconcile their local vault using safe-union/stale-device semantics.
- Manual `Sync now`, configurable startup/resume sync, local-change-triggered sync, periodic remote reconciliation, pause/resume, and bidirectional normal operation function through one shared planning/execution path.
- Manual synchronization always previews before execution; automatic synchronization executes only ordinary safe plans and blocks conditions requiring user intervention.
- The executor revalidates operation preconditions, uses real local/remote adapters, verifies transfers, commits durable state in the required order, handles cancellation, and re-plans stale work.
- Remote changes during a run invalidate affected work; local changes during a run are captured for a subsequent pass.
- Conflicts create and retain deterministic preserved alternatives; the user can keep local, keep remote, keep both, accept clean merge where relevant, or manually resolve. Resolution becomes new authoritative content and propagates normally.
- Suspicious destructive plans are blocked before mutation, provide a reviewable plan and recoverable checkpoint, and require explicit approval without a global unsafe force bypass.
- Recovery mode provides actionable reconstruction/preview rather than silent reset.
- The product exposes required current status, meaningful notifications, bounded privacy-safe audit/history, conflict/recovery management, and on-demand Verify/Reconcile Vault.
- Failure modes from the target specification are surfaced coherently without impairing local editing.
- Device removal/deauthorization and plugin lifecycle behavior remain non-destructive.

### 9.4 Principal Contracts and Invariants Introduced or Preserved

- Complete product realization of `SYS-001` through `SYS-008`.
- Complete `SYNC-001` through `SYNC-013` behavior.
- Execution realization of `PLAN-001` through `PLAN-009`.
- Product realization of `FIRST-001` through `FIRST-007`.
- Integration of all `STATE`, `XFER`, `CONFLICT`, `MOVE`, `DELETE`, `CONFIG`, `FAIL`, `PRIV`, `ASSET`, and `LIFE` requirements through their established boundaries.
- `UI-001` through `UI-008`.
- All `INV-001` through `INV-020` must remain true in the integrated system.

### 9.5 Dependencies

Phases 2, 3, and 4, all completed against Phase 1 shared contracts.

### 9.6 Acceptance Criteria

- End-to-end automated integration scenarios cover first sync, additional-device pairing, ordinary local edit, ordinary remote change, offline edit/reconnect, text merge, true text conflict, binary conflict, rename/move, deletion, delete-vs-modify, suspicious bulk destruction, recovery mode, cancellation, and stale-precondition re-planning.
- Manual and automatic synchronization demonstrably use the same planning semantics; no alternate unsafe mutation path exists.
- Status, preview, conflict, recovery, audit/history, notification, pause/resume, and Verify/Reconcile flows operate against real product state rather than UI-only mock behavior.
- Transfer verification precedes authoritative success-state commit in integrated tests.
- Auth revocation, wrong account, missing remote root, corrupt state, lost cursor, partial remote listing, local unreadability, disk/quota exhaustion, network/rate failure, invalid path, and repeated per-path failure produce the specified product response.
- First-sync and corrupt-state integration tests prove destructive propagation remains disabled until trustworthy state exists.
- The integrated product builds successfully and remains loadable on both desktop and mobile Obsidian targets.

### 9.7 Non-Goals

- Do not add features outside the target-system specification.
- Do not optimize away safety checks merely to improve throughput.
- Do not perform final large-scale mobile/performance/fault hardening that requires the complete integrated system; that belongs in Phase 6.
- Do not perform Stage 3 independent validation within the construction phase.

## 10. Build Phase 6 — Cross-Platform Hardening and Stage 3 Readiness

### 10.1 Objective

Exercise the complete integrated product under the failure, scale, platform, security, and interruption conditions that cannot be validated adequately before integration; correct defects; and produce objective construction evidence suitable for independent Stage 3 validation.

### 10.2 Starting Assumptions and Prerequisites

- Phase 5 has produced the complete integrated product.
- All earlier phase acceptance criteria have passed.
- The current repository, not prior phase summaries, is treated as the implementation authority for this phase.

### 10.3 Required End State

- The integrated product satisfies the target specification's complete build/platform, reconciliation, state/crash-safety, transfer/large-vault, destructive-safety, authentication/security, configuration/lifecycle, and asset-boundary evidence requirements.
- Windows desktop behavior and iPhone/iOS behavior are exercised on real supported runtimes for all workflows that cannot be proven by unit/integration fakes alone.
- Large-vault and large-file behavior demonstrates bounded memory/concurrency appropriate to iOS.
- Fault injection covers crashes/interruption before, during, and after content mutation/state commit, ambiguous remote outcomes, corruption, cursor loss, partial listing, remote-root deletion, clone/restore, migration, and cancellation.
- Security checks verify least-privilege OAuth, secret containment, callback isolation, no external telemetry, and absence of credentials in source/synchronized data/diagnostics.
- Destructive-safety testing includes legitimate ordinary deletions, suspicious mass deletion, legitimate bulk reorganization review, recovery checkpoints, and absence of an unsafe bypass.
- Any defects discovered within target scope are corrected and affected/broader tests rerun.
- A complete requirement-to-implementation/test evidence record is available for Stage 3, while Stage 3 remains an independent validation activity.

### 10.4 Principal Contracts and Invariants Introduced or Preserved

No new product semantics are introduced. Phase 6 validates and hardens all requirements and all `INV-001` through `INV-020` against the complete implementation.

### 10.5 Dependencies

Phase 5.

### 10.6 Acceptance Criteria

- Reproducible clean build and complete automated test suite pass.
- Required Windows and iPhone/iOS functional scenarios pass.
- Target Specification §13.1 through §13.7 completion-evidence categories are satisfied with recorded objective evidence.
- Fault-injection/crash-safety tests pass without silent data loss or false-success state.
- Large-vault/large-file tests meet bounded-resource requirements on representative constrained/mobile conditions.
- Security/privacy checks pass and no secret or vault-content telemetry leakage is present.
- Full requirement traceability has no unassigned or untested material requirement before Stage 3 handoff.
- No known Critical or Major construction-scope defect remains unresolved when the implementation is handed to Stage 3.

### 10.7 Non-Goals

- Do not redefine target requirements to match implementation defects.
- Do not add speculative features.
- Do not treat this phase as the independent Stage 3 validation; it prepares evidence and a conformant candidate for that separate review.

## 11. Parallel Construction Rules

### 11.1 Allowed Parallel Wave

After Phase 1 passes, Phases 2, 3, and 4 may execute concurrently because they own distinct implementation boundaries and can be tested against the frozen Phase 1 contracts.

### 11.2 Prohibited Premature Parallelism

Phases 2, 3, and 4 must not begin before Phase 1 has established and validated the shared contracts. Phase 5 must not begin integration against an incomplete or contract-drifting parallel workstream.

### 11.3 Supervisor Ownership

The supervising lineage owns shared contracts, integration order, cross-workstream changes, acceptance gates, and repository-wide conflict resolution. Worker agents own only the implementation scope assigned through their Stage 2A build-session prompts.

### 11.4 Contract Change Procedure

If a worker discovers that a frozen shared contract cannot support its required end state, the worker must report the specific deficiency rather than redefining the contract unilaterally. The supervisor must inspect all affected workstreams, revise the smallest necessary shared contract, persist the change, and ensure dependent workers rebase/reconcile before continuing.

### 11.5 Repository Isolation

Parallel work should use branches/worktrees or another supervisor-controlled isolation strategy that prevents simultaneous uncontrolled edits to the same working tree. The exact Git workflow is engineering discretion, but integration must preserve one coherent repository history and the target-system authority.

## 12. Requirement-to-Phase Coverage Matrix

The table assigns every normative target-system requirement family to the phase or phases responsible for implementing it. Phase 6 provides final construction verification for all families.

| Target requirement IDs | Primary implementation phase(s) | Integration / final construction verification |
| --- | --- | --- |
| `SYS-001`–`SYS-008` | Phase 1 foundation; Phase 4 platform boundary | Phase 5; Phase 6 |
| `AUTH-001`–`AUTH-012` | Phase 3 | Phase 5; Phase 6 |
| `REM-001`–`REM-010` | Phase 3 | Phase 5; Phase 6 |
| `SYNC-001`–`SYNC-002` | Phase 5 | Phase 6 |
| `SYNC-003`–`SYNC-007` | Phase 4 boundary + Phase 5 orchestration | Phase 6 |
| `SYNC-008`–`SYNC-010` | Phase 2 state/execution semantics + Phase 5 orchestration | Phase 6 |
| `SYNC-011`–`SYNC-012` | Phase 4 platform behavior + Phase 5 orchestration | Phase 6 |
| `SYNC-013` | Phase 5 | Phase 6 |
| `PLAN-001`–`PLAN-009` | Phase 2 | Phase 5; Phase 6 |
| `CHANGE-001`–`CHANGE-003` | Phase 2 | Phase 5; Phase 6 |
| `CHANGE-004`–`CHANGE-007` | Phase 3 | Phase 5; Phase 6 |
| `FIRST-001`–`FIRST-005` | Phase 2 semantics | Phase 5; Phase 6 |
| `FIRST-006`–`FIRST-007` | Phase 5 workflow | Phase 6 |
| `STATE-001`–`STATE-017` | Phase 2 | Phase 5; Phase 6 |
| `XFER-001`–`XFER-008` | Phase 2 state/commit semantics; Phase 3 remote transfer; Phase 4 local transfer | Phase 5; Phase 6 |
| `CONFLICT-001`–`CONFLICT-011` | Phase 2 semantics | Phase 5 UX/execution; Phase 6 |
| `MOVE-001`, `MOVE-003`, `MOVE-005` | Phase 2 semantics | Phase 5; Phase 6 |
| `MOVE-002` | Phase 3 | Phase 5; Phase 6 |
| `MOVE-004` | Phase 4 | Phase 5; Phase 6 |
| `FILE-001`–`FILE-015` | Phase 4 | Phase 5; Phase 6 |
| `DELETE-001`–`DELETE-010` | Phase 2 semantics/safety | Phase 5 execution/approval; Phase 6 |
| `CONFIG-001`–`CONFIG-009` | Phase 4 | Phase 5; Phase 6 |
| `UI-001`–`UI-008` | Phase 5 | Phase 6 |
| `FAIL-001`–`FAIL-007` | Phase 3 remote failures; Phase 4 local/platform failures | Phase 5 product response; Phase 6 |
| `PRIV-001`–`PRIV-004` | Phase 1 architecture; Phases 3 and 4 boundary implementation | Phase 5; Phase 6 |
| `ASSET-001`–`ASSET-008` | Phase 4 boundary | Phase 5; Phase 6 |
| `LIFE-001`–`LIFE-002` | Phase 4 local lifecycle | Phase 5 product workflow; Phase 6 |

## 13. Invariant-to-Phase Coverage Matrix

| Target invariant IDs | Primary enforcement phase(s) | Integrated verification |
| --- | --- | --- |
| `INV-001`–`INV-009` | Phase 2 | Phase 5; Phase 6 |
| `INV-010` | Phases 2 and 3 | Phase 5; Phase 6 |
| `INV-011` | Phases 3 and 4 | Phase 5; Phase 6 |
| `INV-012` | Phase 4 | Phase 5; Phase 6 |
| `INV-013` | Phase 4 | Phase 5; Phase 6 |
| `INV-014` | Phase 1 architecture; Phases 3 and 4 | Phase 5; Phase 6 |
| `INV-015`–`INV-016` | Phase 2 | Phase 5; Phase 6 |
| `INV-017`–`INV-018` | Phase 4 | Phase 5; Phase 6 |
| `INV-019` | Phase 2 | Phase 5; Phase 6 |
| `INV-020` | Phase 4 | Phase 5; Phase 6 |

## 14. Completion-Evidence Coverage

| Target-specification evidence category | Construction phase responsible for producing evidence |
| --- | --- |
| §13.1 Build and platform evidence | Phases 1, 4, 5, and 6 |
| §13.2 Reconciliation semantic tests | Phase 2; integrated confirmation in Phases 5 and 6 |
| §13.3 State and crash-safety tests | Phase 2; integrated fault injection in Phase 6 |
| §13.4 Transfer and large-vault evidence | Phases 3 and 4; integrated scale validation in Phase 6 |
| §13.5 Destructive-safety evidence | Phase 2; integrated approval/execution validation in Phases 5 and 6 |
| §13.6 Authentication and security evidence | Phase 3; integrated device/security validation in Phases 5 and 6 |
| §13.7 Configuration, lifecycle, and asset-boundary evidence | Phase 4; integrated validation in Phases 5 and 6 |
| §13.8 Stage 3 traceability readiness | Phase 6 prepares complete evidence; Stage 3 independently validates it |

## 15. Deferred Engineering Decisions Assigned to Build Phases

No unresolved product-authority decision blocks construction. Engineering choices deliberately left open by the target specification are assigned as follows so they are resolved at the earliest phase with adequate evidence.

| Engineering determination | Responsible phase |
| --- | --- |
| Direct fork vs adaptation/transplant of Mirror/donor code | Phase 1 |
| Concrete internal module/type decomposition | Phase 1 initially; refined locally within later phase ownership |
| Concrete synchronization-state persistence/journal/atomicity technology | Phase 2 |
| Three-way merge library/algorithm | Phase 2 |
| Circuit-breaker numeric thresholds/heuristics | Phase 2, stress-validated in Phase 6 |
| Tombstone retention defaults | Phase 2, stress-validated in Phase 6 |
| Concrete OAuth code-exchange topology | Phase 3 |
| Concrete secure token-storage mechanism | Phase 3 |
| Remote metadata/schema physical representation | Phase 3 |
| Hash/cache and transfer buffering/chunking mechanics | Phases 2 and 3 according to ownership |
| Version-specific Obsidian portable-config allowlist | Phase 4 |
| Concrete local atomic-write and vault-level coordination mechanics | Phase 4 or Phase 5 according to repository ownership established in Phase 1 |
| Mobile batch size, concurrency, retry limits, reconciliation cadence defaults | Owning implementation phase; finalized under Phase 6 evidence |
| UI layout, naming, iconography | Phase 5 |
| Audit/history serialization and retention implementation | Phase 5 |

## 16. Coverage and Dependency Check

### 16.1 Every Target-System Requirement Is Assigned

Pass. Section 12 maps every normative requirement family from `SYS`, `AUTH`, `REM`, `SYNC`, `PLAN`, `CHANGE`, `FIRST`, `STATE`, `XFER`, `CONFLICT`, `MOVE`, `FILE`, `DELETE`, `CONFIG`, `UI`, `FAIL`, `PRIV`, `ASSET`, and `LIFE` to one or more construction phases. Section 13 maps all twenty target invariants. Section 14 maps every completion-evidence category.

### 16.2 No Requirement Is Silently Lost

Pass. Cross-cutting requirements are intentionally assigned to both their owning implementation boundary and Phase 5 integration where required. Phase 6 verifies the complete integrated set rather than assuming green unit tests imply complete product coverage.

### 16.3 Dependencies Precede Dependent Behavior

Pass. Phase 1 establishes the shared boundaries before any parallel implementation. Phases 2, 3, and 4 depend only on those boundaries and may execute concurrently. Phase 5 integrates only after all three pass. Phase 6 validates only after the complete integrated product exists.

### 16.4 Cross-Phase Contracts Are Explicit Enough to Prevent Drift

Pass. Section 4 defines the semantic contracts that must be frozen before parallel work, and Section 11 defines supervisor ownership and the required procedure for contract changes. Concrete source types remain a Stage 2A repository-grounded implementation decision, consistent with the manual's instruction not to invent concrete interfaces prematurely when behavioral boundaries are sufficient.

### 16.5 No Phase Exists Only for Organizational Convenience

Pass. Phase 1 exists because safe parallelism requires a stable boundary first. Phases 2, 3, and 4 exist because they are independently testable ownership boundaries with materially different failure domains. Phase 5 exists because real integration cannot be proven within any isolated boundary. Phase 6 exists because mobile, scale, crash, security, and end-to-end fault behavior require a complete integrated product and constitute a distinct risk-validation gate before independent Stage 3 review.

### 16.6 Phases Cannot Safely Be Merged Further

Pass.

- Merging Phase 1 into a parallel workstream would allow agents to invent incompatible shared contracts before the boundary is frozen.
- Merging Phase 2 with Phase 3 would couple product synchronization semantics to Google transport behavior and reduce deterministic testability.
- Merging Phase 2 with Phase 4 would couple synchronization policy to Obsidian/filesystem mechanics and reduce deterministic testability.
- Merging Phases 3 and 4 would unnecessarily couple two independent external/platform boundaries and remove a safe parallel seam.
- Merging Phase 5 into Phases 2–4 would require isolated workstreams to coordinate through an integration surface before their prerequisites are independently complete.
- Merging Phase 6 into Phase 5 would mix construction/integration with the scale, real-device, crash, and fault-validation gate that can only be meaningful after integration is stable.

Any finer phase split would primarily subdivide feature nouns or private implementation mechanics and is therefore intentionally deferred to Stage 2A session expansion where the current repository can determine whether a phase requires one or more concrete build sessions.

### 16.7 Completing All Phases Necessarily Produces the Target System

Pass. Phases 1–4 establish every required architectural and external boundary; Phase 2 provides the complete synchronization/state semantics; Phase 5 composes those boundaries into every required user/system workflow; Phase 6 verifies and corrects the complete target evidence set. No target capability is assigned only to a future unspecified phase.

## 17. Stage 2A Handoff Rules

### 17.1 Supervisor Re-entry

A supervisor starting a later chat/session must read the governing manual, current target-system specification, current decision register, this decomposition completely, and then inspect the actual repository before expanding a phase into a coding-agent prompt.

### 17.2 Build-Session Expansion

The phase definitions in this file are deliberately compact. The supervisor must generate each detailed Stage 2A build-session prompt only when that session is ready to begin, using current repository facts, current tests, earlier completed work, and the exact target requirements assigned here.

### 17.3 Phase Completion Gate

A phase is not complete merely because a worker reports completion. The supervisor must establish objective evidence that the required end state exists, acceptance criteria pass, relevant tests/builds pass, contracts remain intact, and no known phase-scope defect remains before dependent work begins.

### 17.4 Persisted Progress

After each completed phase or material contract change, the supervisor lineage must persist enough project-state evidence that a successor supervisor can determine the actual completed/current/next state without relying on chat history alone.

## 18. Unresolved Product Decisions

None currently known. If Stage 2A exposes an ambiguity whose alternatives would materially alter the target product and neither the target-system specification nor decision register resolves it, the supervisor must return only that product decision to the user rather than allowing a worker agent to choose silently.

## 19. Stage 1 Decomposition Result

The minimum sound build decomposition contains **six phases**.

Phase 1 is the prerequisite contract/foundation gate. Phases 2, 3, and 4 form the safe parallel construction wave. Phase 5 is the required integration/product-workflow gate. Phase 6 is the integrated hardening and Stage 3 readiness gate.

This decomposition, together with `target-system-specification.md` and `decision-register.yaml`, supplies the persisted Stage 1 authority needed for Workflow A supervised construction. Stage 2A may now expand Phase 1 against the actual repository state when authorized.