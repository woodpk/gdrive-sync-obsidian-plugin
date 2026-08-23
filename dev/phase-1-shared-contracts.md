# Phase 1 Frozen Shared Contracts

## Status and Scope

This is the repository-grounded handoff for Stage 2A Build Phase 1. It records the source-level contracts frozen before the Phase 2/3/4 parallel construction wave. It does not redefine the target-system specification or Stage 1 decomposition.

Phase 1 deliberately does not implement reconciliation policy, production persistence, live Google OAuth/Drive behavior, the complete Obsidian local adapter, merge policy, final execution, or product UI.

## Foundation and Donor Adoption Decision

The repository uses **selective architectural adaptation**, not a direct Google Drive Mirror fork. Mirror remains the primary engineering baseline because it demonstrates useful separation of reconciliation, Drive access, persistent base state, injected/testable transport, bounded retry/concurrency, mobile-conscious memory handling, and broad test seams. A direct fork was rejected because it would import later-phase implementation and incompatible product semantics: full-Drive authorization, desktop-assisted mobile credential transfer, newest-mtime conflict winners, multi-target/Shared-Drive assumptions, and missing/corrupt-state fallback that can collapse uncertainty into an empty base.

Google Drive Merge Sync remains a secondary design reference. Its explicit planning, identity-preserving move concept, `drive.file` direction, and pure three-way-merge seam informed the boundaries. Its planner is not imported because it still uses local mtime as change authority in places; complete merge behavior belongs to Phase 2.

No donor source file is copied into Phase 1, so no donor source/license text is incorporated at this stage. Donor provenance is retained here as engineering evidence, not product authority.

## Repository Foundation

- `package.json` — pinned npm dependencies and build/test commands.
- `tsconfig.json` — strict TypeScript checking.
- `esbuild.config.mjs` — browser-targeted Obsidian bundle with `obsidian` externalized.
- `manifest.json` — mobile-compatible private plugin manifest (`isDesktopOnly: false`).
- `src/main.ts` — minimal loadable entry point with no Phase 2+ behavior.
- `test/mobile-safety.test.ts` — manifest/import/secret architecture guard.
- `.github/workflows/phase1-ci.yml` — clean install, typecheck, tests, and build verification.

Node.js is build/test tooling only. Mobile-required runtime source is under `src/` and is guarded against Node/Electron/Windows-only imports.

## Frozen Contract Modules

### Shared Value Types

**Location:** `src/contracts/common.ts`  
**Public names:** `VaultPath`, `RemoteObjectId`, `VaultIdentity`, `DeviceIdentity`, `ChangeCursor`, `StateRevision`, `OperationId`, `PlanId`, `ConflictId`, `CheckpointId`, `ContentHash`, `ObservationToken`, `ProtocolVersion`, `EntityKind`, `SyncSide`, `ContentEvidence`, `VersionReference`.  
`ContentEvidence.advisoryModifiedTimeMs` is advisory only; no contract makes a timestamp winner-selection authority.

### Snapshot and Observation Contract

**Location:** `src/contracts/snapshot.ts`  
**Public names:** `FileStability`, `Observation`, `LocalObservation`, `RemoteObservation`, `EnumerationCompleteness`, `IdentityAssessment`, `BaseEvidence`, `PathSnapshot`.  
Represents confirmed absence separately from unreadable/inaccessible/unknown state, stability, remote identity, trusted/uninitialized/untrusted base, tombstone evidence, enumeration completeness, and identity ambiguity. Phase 2 owns planning; Phases 3/4 populate observations.

### Synchronization Plan Contract

**Location:** `src/contracts/plan.ts`  
**Public names:** `PLAN_OPERATION_KINDS`, `PlanOperationKind`, `OperationPrecondition`, `PlanReason`, `PlannedOperation`, `PlanExecutionDisposition`, `SynchronizationPlan`, `PlanningInput`, `SynchronizationPlanner`.  
Frozen operation vocabulary: `noop`, `upload-create`, `upload-update`, `download-create`, `download-update`, `identity-preserving-move`, `clean-text-merge`, `unresolved-conflict`, `trash-local`, `trash-remote`, `blocked-unsafe`, `recovery-required`. Phase 2 owns implementation.

### Local Vault Boundary Contract

**Location:** `src/contracts/local-vault.ts`  
**Public names:** `LocalVaultListing`, `LocalReadResult`, `LocalMutationReceipt`, `PathValidationResult`, `ConfigurationClassification`, `LocalVaultChange`, `LocalLifecycleEvent`, `Unsubscribe`, `LocalVaultPort`.  
Provides mobile-safe enumeration/observation/content access, create/replace/folder creation, move, recoverable trash, path validation, active configuration-directory discovery, configuration classification, and lifecycle/change observation. Phase 4 owns implementation.

### Google Drive Boundary Contract

**Location:** `src/contracts/google-drive.ts`  
**Public names:** `REQUIRED_DRIVE_SCOPE`, `DriveAuthenticationState`, `ManagedRemoteIdentity`, `ManagedRemoteValidation`, `RemoteProtocolInfo`, `DriveSignal`, `DriveResult`, `RemoteEntry`, `RemoteListing`, `RemoteChange`, `RemoteChangePage`, `RemoteDownload`, `RemoteMutationReceipt`, `RemoteCreateRequest`, `RemoteUpdateRequest`, `GoogleDrivePort`.  
Freezes `drive.file`, separates authentication from managed-remote identity, represents stable Drive IDs, protocol info, complete/partial reconciliation listing, initial/incremental change cursors, transfers, CRUD, identity-preserving move, trash, and retry/quota/recovery signaling. Phase 3 owns implementation.

### Durable State Contract

**Location:** `src/contracts/state.ts`  
**Public names:** `BaseEntry`, `TombstoneEntry`, `RemoteObjectMapping`, `OperationJournalStatus`, `OperationJournalEntry`, `DeviceStateEntry`, `TrustedSynchronizationState`, `RecoveryReason`, `StateLoadResult`, `StateLoadContext`, `StateSaveResult`, `StateBackupReceipt`, `StateMigrationAssessment`, `SynchronizationStateStore`.  
Represents base/history, vault/device identity, mappings, tombstones, cursor, pending/completed/uncertain operation state, stale devices, recovery, migration, backup, and diagnostic export. `StateLoadContext` distinguishes a true new installation from expected state that is missing/corrupt. Phase 2 owns implementation.

### Conflict and Merge Contract

**Location:** `src/contracts/conflict.ts`  
**Public names:** `ConflictProvenance`, `ConcurrentAlternates`, `ThreeWayProvenance`, `ConflictAssessment`, `ConflictResolution`, `ConflictResolver`.  
Distinguishes no conflict, clean merge, unresolved text, opaque/binary, and delete-vs-modify while retaining concurrent-version provenance. No newest-timestamp-wins outcome exists. Phase 2 owns implementation.

### Execution Result and Commit Contract

**Location:** `src/contracts/execution.ts`  
**Public names:** `PreconditionValidationResult`, `VerifiedExecutionReceipt`, `ExecutionResult`, `SynchronizationExecutor`, `CommitResult`, `AuthoritativeSuccessCommitter`.  
Distinguishes verified success, retryable/blocking failure, stale precondition, cancellation, uncertain outcome, and recovery. `AuthoritativeSuccessCommitter` accepts only a durable, integrity-verified receipt, preserving validate → mutate → verify → authoritative commit. Phase 2 owns execution/commit coordination.

### Status, Audit, and User-Action Contract

**Location:** `src/contracts/status-audit-actions.ts`  
**Public names:** `SynchronizationStatus`, `AuditEventKind`, `AuditRecord`, `ProductSurfaceState`, `UserAction`, `UserActionResult`, `ProductControlPort`.  
Exposes required status/preview/conflict/recovery state and Execute, conflict resolution, destructive approval with recovery checkpoint, pause/resume, Verify/Reconcile, and cancellation. Audit records are metadata-only. No force-sync action exists. Phase 5 consumes this surface; Phase 2 supplies policy state.

## Dependency Direction

```text
UI / orchestration
        ↓
Phase 1 contracts
   ↙       ↓        ↘
Phase 4   Phase 2   Phase 3
Local     Core      Drive/OAuth
adapter   semantics adapter
```

Contracts may depend on other contract modules. Phase 2 may depend on Local Vault and Drive ports. Phases 3/4 implement their ports but must not depend on Phase 2 policy implementation. UI/product code submits actions through `ProductControlPort`, not directly to adapters.

## Test Doubles and Contract Seams

**Location:** `src/testing/fakes.ts`  
**Exports:** `createLocalVaultFake`, `createGoogleDriveFake`, `InMemorySynchronizationStateStore`, `FakeSynchronizationPlanner`, `RecordingSuccessCommitter`, `RecordingProductControl`.

These let Phase 2 test without live Drive/Obsidian, Phase 3 test its Drive port without sync policy, Phase 4 test its local port without sync policy, and later UI/orchestration tests consume engine state/actions without bypassing policy. `test/contracts.test.ts` exercises every contract family.

## Parallel Ownership

- **Phase 2:** planning, conflict/merge semantics, destructive safety, execution/commit coordination, durable synchronization-state implementation.
- **Phase 3:** Google OAuth and `GoogleDrivePort` implementation.
- **Phase 4:** Obsidian local/platform/configuration and `LocalVaultPort` implementation.
- **Supervisor lineage:** frozen-contract ownership, cross-workstream contract changes, integration order, and acceptance gates.

## Frozen-Contract Change Procedure

A Phase 2/3/4 worker must not change these contracts unilaterally. It must report the exact deficient type/member, target requirement blocked, smallest needed semantic change, and affected workstreams. The supervisor centrally evaluates and persists any accepted revision, communicates it to every affected worker, and dependent workers reconcile before continuing. Ordinary private implementation behind a frozen boundary does not require this process.

## Donor Semantics Deliberately Rejected

Phase 1 excludes newest-mtime conflict winners, full Drive authorization, desktop-generated token transfer, corrupt/missing state as trusted empty base, delete/recreate as the only rename semantic, full-tree polling as the only remote-detection contract, multi-target/Shared-Drive product semantics, mobile runtime Node/Electron/Windows dependencies, a global destructive force-sync bypass, and developer-controlled telemetry.

## Verified Commands

Final clean verification commands are:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

## Verification Status

Pending clean GitHub Actions verification. This section must be updated before Phase 1 is reported complete.
