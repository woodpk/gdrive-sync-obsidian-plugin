# Phase 1 Frozen Shared Contracts

## Status and Scope

This is the repository-grounded handoff for Stage 2A Build Phase 1. It records the source-level contracts frozen before the Phase 2/3/4 parallel construction wave. It does not redefine the target-system specification or Stage 1 decomposition.

Phase 1 deliberately does not implement reconciliation policy, production persistence, live Google OAuth/Drive behavior, the complete Obsidian local adapter, merge policy, final execution, or product UI.

## Foundation and Donor Adoption Decision

The repository uses **selective architectural adaptation**, not a direct Google Drive Mirror fork. Mirror remains the primary engineering baseline because it demonstrates useful separation of reconciliation, Drive access, persistent base state, injected/testable transport, bounded retry/concurrency, mobile-conscious memory handling, and broad test seams. A direct fork was rejected because it would import later-phase implementation and incompatible product semantics: full-Drive authorization, desktop-assisted mobile credential transfer, newest-mtime conflict winners, multi-target/Shared-Drive assumptions, and missing/corrupt-state fallback that can collapse uncertainty into an empty base.

Google Drive Merge Sync remains a secondary design reference. Its explicit planning, identity-preserving move concept, `drive.file` direction, and pure three-way-merge seam informed the boundaries. Its planner is not imported because it still uses local mtime as change authority in places; complete merge behavior belongs to Phase 2.

No donor source file is copied into Phase 1, so no donor source/license text is incorporated at this stage. Donor provenance is retained here as engineering evidence, not product authority.

## Repository Foundation

- `../../package.json` and `../../package-lock.json` — pinned/reproducible npm dependency graph and build/test commands.
- `../../tsconfig.json` — strict repository TypeScript checking.
- `../../tsconfig.build.json` — CommonJS Obsidian entry-point compilation.
- `../../tsconfig.test.json` — isolated CommonJS contract-test compilation.
- `../../scripts/finalize-build.mjs` — build-tooling-only finalization that places emitted `main.js` at the plugin root.
- `../../manifest.json` — private Obsidian plugin manifest with `isDesktopOnly: false`.
- `../../versions.json` — plugin/minimum-Obsidian compatibility mapping.
- `../../src/main.ts` — minimal loadable entry point with no Phase 2+ synchronization behavior.
- `../../test/mobile-safety.test.ts` — manifest/import/secret-contract architecture guard.
- `../../.github/workflows/phase1-ci.yml` — clean install, typecheck, tests, and production-build verification.

Node.js is used only by build/test tooling. Mobile-required runtime source is under `../../src`; automated guards reject Node/Electron/Windows-only runtime imports. Frozen transfer boundaries use a platform-neutral lazy chunk source so large-file adapters can process content with bounded memory instead of requiring whole-file materialization.

## Frozen Contract Modules

### Shared Value Types

**Location:** `../../src/contracts/common.ts`

**Public names:** `VaultPath`, `RemoteObjectId`, `VaultIdentity`, `DeviceIdentity`, `ChangeCursor`, `StateRevision`, `OperationId`, `PlanId`, `ConflictId`, `CheckpointId`, `ContentHash`, `ObservationToken`, `ProtocolVersion`, `EntityKind`, `SyncSide`, `BinaryContentSource`, `ContentEvidence`, `VersionReference`.

`BinaryContentSource` is the frozen platform-neutral binary-transfer abstraction. `openChunks()` returns an `AsyncIterable<Uint8Array>` so content may be produced and consumed incrementally; the contract does not require the complete file, or all chunks, to be accumulated in memory before consumption begins. Individual chunks remain portable `Uint8Array` values. `ContentEvidence.advisoryModifiedTimeMs` is explicitly advisory; no contract makes a timestamp winner-selection authority.

### Snapshot and Observation Contract

**Location:** `../../src/contracts/snapshot.ts`

**Public names:** `FileStability`, `Observation`, `LocalObservation`, `RemoteObservation`, `EnumerationCompleteness`, `IdentityAssessment`, `BaseEvidence`, `PathSnapshot`.

Represents confirmed absence separately from unreadable/inaccessible/unknown state, file stability, stable remote identity evidence, trusted/uninitialized/untrusted base, tombstone evidence, remote-enumeration completeness, and identity/path ambiguity. Phase 2 consumes these semantics; Phases 3 and 4 populate remote/local observations behind their ports.

### Synchronization Plan Contract

**Location:** `../../src/contracts/plan.ts`

**Public names:** `PLAN_OPERATION_KINDS`, `PlanOperationKind`, `OperationPrecondition`, `PlanReason`, `PlannedOperation`, `PlanExecutionDisposition`, `SynchronizationPlan`, `PlanningInput`, `SynchronizationPlanner`.

Frozen operation vocabulary: `noop`, `upload-create`, `upload-update`, `download-create`, `download-update`, `identity-preserving-move`, `clean-text-merge`, `unresolved-conflict`, `trash-local`, `trash-remote`, `blocked-unsafe`, `recovery-required`. Operations can carry preconditions and reason/evidence metadata. Phase 2 owns implementation.

### Local Vault Boundary Contract

**Location:** `../../src/contracts/local-vault.ts`

**Public names:** `LocalVaultListing`, `LocalReadResult`, `LocalMutationReceipt`, `PathValidationResult`, `ConfigurationClassification`, `LocalVaultChange`, `LocalLifecycleEvent`, `Unsubscribe`, `LocalVaultPort`.

Provides mobile-safe enumeration/observation/content access, create/replace/folder creation, rename/move, recoverable trash, path validation, runtime active-configuration-directory discovery, selective configuration classification, and local change/lifecycle observation. File reads expose `BinaryContentSource`, and create/replace accept `BinaryContentSource`, so the Phase 4 adapter boundary permits lazy incremental large-file transfer without a complete-file `Uint8Array` payload. Phase 4 owns implementation; Phase 2 consumes only this port.

### Google Drive Boundary Contract

**Location:** `../../src/contracts/google-drive.ts`

**Public names:** `REQUIRED_DRIVE_SCOPE`, `DriveAuthenticationState`, `ManagedRemoteIdentity`, `ManagedRemoteValidation`, `RemoteProtocolInfo`, `DriveSignal`, `DriveResult`, `RemoteEntry`, `RemoteListing`, `RemoteChange`, `RemoteChangePage`, `RemoteDownload`, `RemoteMutationReceipt`, `RemoteCreateRequest`, `RemoteUpdateRequest`, `GoogleDrivePort`.

Freezes `https://www.googleapis.com/auth/drive.file`, separates authentication/session availability from managed-remote identity validation, and represents stable Drive IDs, protocol/schema information, reconciliation listing with explicit completeness, initial/incremental change cursors, content transfer, CRUD, identity-preserving move, recoverable trash, and retry/rate-limit/quota/recovery signaling. Downloads and create/update request content use `BinaryContentSource`, allowing the Phase 3 adapter boundary to consume or produce file content incrementally with bounded memory and without prescribing Node streams, filesystem handles, or another desktop-only mechanism. Phase 3 owns implementation; synchronization policy does not belong in this adapter.

### Durable State Contract

**Location:** `../../src/contracts/state.ts`

**Public names:** `BaseEntry`, `TombstoneEntry`, `RemoteObjectMapping`, `OperationJournalStatus`, `OperationJournalEntry`, `DeviceStateEntry`, `TrustedSynchronizationState`, `RecoveryReason`, `StateLoadResult`, `StateLoadContext`, `StateSaveResult`, `StateBackupReceipt`, `StateMigrationAssessment`, `SynchronizationStateStore`.

Represents trustworthy base/history, stable vault/device identity, remote-object mappings, tombstones, Drive cursor, pending/completed/uncertain operation state, stale-device state, schema/version, recovery classification, migration assessment, recovery backup, and diagnostic export. `StateLoadContext` distinguishes a true new installation from an existing pairing whose expected state is missing; malformed/absent expected state cannot silently become a trusted empty base. Phase 2 owns implementation.

### Conflict and Merge Contract

**Location:** `../../src/contracts/conflict.ts`

**Public names:** `ConflictProvenance`, `ConcurrentAlternates`, `ThreeWayProvenance`, `ConflictAssessment`, `ConflictResolution`, `ConflictResolver`.

Distinguishes no conflict, clean merge, unresolved text conflict, opaque/binary conflict, and delete-versus-modify conflict while retaining concurrent-version/provenance references. User outcomes include keep local, keep remote, keep both, accept clean merge, and manual resolution. No newest-timestamp-wins outcome exists. Phase 2 owns implementation.

### Execution Result and Commit Contract

**Location:** `../../src/contracts/execution.ts`

**Public names:** `PreconditionValidationResult`, `VerifiedExecutionReceipt`, `ExecutionResult`, `SynchronizationExecutor`, `CommitResult`, `AuthoritativeSuccessCommitter`.

Distinguishes durable verified success, retryable failure, blocking failure, stale-precondition/re-plan, cancellation, uncertain outcome, and recovery-required outcome. `AuthoritativeSuccessCommitter` accepts only a receipt structurally marked `durable: true` and `integrityVerified: true`, preserving validate precondition → mutate → verify → authoritative commit. Phase 2 owns execution/commit coordination.

### Status, Audit, and User-Action Contract

**Location:** `../../src/contracts/status-audit-actions.ts`

**Public names:** `SynchronizationStatus`, `AuditEventKind`, `AuditRecord`, `ProductSurfaceState`, `UserAction`, `UserActionResult`, `ProductControlPort`.

Exposes idle/ready, planning, syncing, offline/deferred, authentication required, paused, conflict present, destructive-plan blocked, recovery required, and error states plus plan preview/conflict/recovery data. Actions include Execute, conflict resolution, destructive-plan approval with recovery checkpoint, pause/resume, Verify/Reconcile Vault, and cancellation. Audit records expose operation metadata only; no content payload or general destructive force-sync action exists. Phase 5 consumes this surface; Phase 2 supplies policy-derived state.

## Dependency Direction

```text
UI / orchestration
        ↓
Phase 1 product/domain contracts
   ↙       ↓        ↘
Phase 4   Phase 2   Phase 3
Local     Core      Drive/OAuth
adapter   semantics adapter
```

Contracts may depend on other contract modules. Phase 2 may depend on the Local Vault and Google Drive ports. Phases 3 and 4 implement their ports but must not depend on Phase 2 synchronization-policy implementation. UI/product code submits actions through `ProductControlPort` rather than directly mutating adapters.

## Test Doubles and Contract Seams

**Location:** `../../src/testing/fakes.ts`

**Exports:** `createLocalVaultFake`, `createGoogleDriveFake`, `InMemorySynchronizationStateStore`, `FakeSynchronizationPlanner`, `RecordingSuccessCommitter`, `RecordingProductControl`.

These let Phase 2 test synchronization/state semantics without live Drive or Obsidian, Phase 3 test `GoogleDrivePort` independently of synchronization policy, Phase 4 test `LocalVaultPort` independently of synchronization policy, and later UI/orchestration tests consume policy-derived status/actions without bypassing the engine. `../../test/contracts.test.ts` exercises every frozen contract family, including a multi-chunk lazy `BinaryContentSource` accepted by the local and Drive transfer types; `../../test/mobile-safety.test.ts` enforces the mobile/secret boundary.

## Parallel Ownership

- **Phase 2:** synchronization planning, conflict/merge semantics, destructive-safety policy, execution/commit coordination, and durable synchronization-state implementation.
- **Phase 3:** Google OAuth and `GoogleDrivePort` implementation.
- **Phase 4:** Obsidian local/platform/configuration and `LocalVaultPort` implementation.
- **Supervisor lineage:** frozen-contract ownership, cross-workstream contract changes, integration ordering, and acceptance gates.

Phases 2, 3, and 4 may proceed concurrently only after supervisory acceptance of Phase 1.

## Frozen-Contract Change Procedure

A Phase 2/3/4 worker that finds a frozen contract insufficient must not edit it unilaterally.

1. Report the exact contract/type/member that is insufficient and the target requirement that cannot be satisfied.
2. Describe the smallest semantic change required and identify affected workstreams.
3. Stop only dependent work; continue independent in-scope work when safe.
4. The supervising lineage evaluates the change against higher-authority artifacts and all affected workstreams.
5. The supervisor centrally approves/rejects and persists any contract revision, updates this handoff, and communicates the revision to every affected worker.
6. Dependent workers reconcile to the accepted revision before continuing.

Ordinary private implementation behind a frozen interface does not require this procedure.

## Donor Semantics Deliberately Rejected

Phase 1 excludes newest-mtime conflict winners, full Google Drive authorization, desktop-generated credential/token transfer, missing/corrupt persisted state as a trusted empty base, delete/recreate as the only rename semantic, full-tree polling as the only remote-detection contract, multi-target/Shared-Drive product semantics, Node/Electron/Windows-only dependencies in mobile runtime modules, a global destructive force-sync bypass, and developer-controlled telemetry.

## Verified Commands

The repository verification gate is:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

GitHub Actions run `32662762609` first verified the complete Phase 1 implementation and generated the reproducible lockfile, which was persisted in commit `bb9f7b0b0da8cdd1a5017b7faf2bc401793b2afa`.

GitHub Actions run `32662829150` then performed the final clean-checkout gate from the committed lockfile: `npm ci` passed, strict TypeScript checking passed, all 14 Phase 1 contract/mobile-safety tests passed, and the production build passed.

## Verification Status

**PASS.** Phase 1 repository foundation, frozen shared contracts, test seams, mobile-safety checks, reproducible dependency installation, and production build were verified before C1 correction. The C1 large-file transfer correction must pass the same full gate before its evidence is finalized. Supervisor acceptance is still required before starting the Phase 2/3/4 parallel wave.
