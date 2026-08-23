import type { ChangeCursor, CheckpointId, ContentEvidence, DeviceIdentity, EntityKind, OperationId, RemoteObjectId, StateRevision, VaultIdentity, VaultPath } from "./common";

export interface BaseEntry { readonly path: VaultPath; readonly entityKind: EntityKind; readonly localExisted: boolean; readonly remoteExisted: boolean; readonly content?: ContentEvidence; readonly remoteObjectId?: RemoteObjectId; }
export interface TombstoneEntry { readonly path: VaultPath; readonly entityKind: EntityKind; readonly deletedOn: "local" | "remote" | "both"; readonly remoteObjectId?: RemoteObjectId; readonly sourceDeviceId?: DeviceIdentity; readonly advisoryRecordedAtMs?: number; }
export interface RemoteObjectMapping { readonly path: VaultPath; readonly remoteObjectId: RemoteObjectId; readonly entityKind: EntityKind; }
export type OperationJournalStatus = "pending" | "completed" | "uncertain";
export interface OperationJournalEntry { readonly operationId: OperationId; readonly path?: VaultPath; readonly status: OperationJournalStatus; readonly verificationEvidenceRef?: string; readonly checkpointId?: CheckpointId; }
export interface DeviceStateEntry { readonly deviceId: DeviceIdentity; readonly stale: boolean; readonly advisoryLastReconciledAtMs?: number; }
export interface TrustedSynchronizationState {
  readonly schemaVersion: number;
  readonly stateRevision: StateRevision;
  readonly vaultIdentity: VaultIdentity;
  readonly deviceIdentity: DeviceIdentity;
  readonly base: readonly BaseEntry[];
  readonly remoteMappings: readonly RemoteObjectMapping[];
  readonly tombstones: readonly TombstoneEntry[];
  readonly changeCursor?: ChangeCursor;
  readonly operations: readonly OperationJournalEntry[];
  readonly knownDevices: readonly DeviceStateEntry[];
}
export type RecoveryReason = "expected-state-missing" | "malformed" | "truncated" | "incompatible-version" | "internally-inconsistent" | "clone-or-restore-suspected" | "integrity-check-failed";
/** Missing/corrupt expected state cannot silently become a trusted empty base. */
export type StateLoadResult =
  | { readonly status: "trusted"; readonly state: TrustedSynchronizationState }
  | { readonly status: "uninitialized" }
  | { readonly status: "recovery-required"; readonly reason: RecoveryReason; readonly detail?: string };
export interface StateLoadContext { readonly expectation: "new-installation" | "existing-pairing"; readonly expectedVaultIdentity?: VaultIdentity; readonly expectedDeviceIdentity?: DeviceIdentity; }
export type StateSaveResult = { readonly status: "saved"; readonly stateRevision: StateRevision } | { readonly status: "stale-revision"; readonly actualRevision?: StateRevision } | { readonly status: "recovery-required"; readonly reason: string };
export interface StateBackupReceipt { readonly backupId: string; readonly sourceRevision?: StateRevision; }
export interface StateMigrationAssessment { readonly status: "compatible" | "migration-required" | "incompatible"; readonly fromVersion?: number; readonly toVersion: number; }
export interface SynchronizationStateStore {
  load(context: StateLoadContext): Promise<StateLoadResult>;
  saveTrusted(state: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult>;
  createRecoveryBackup(): Promise<StateBackupReceipt>;
  assessMigration(targetSchemaVersion: number): Promise<StateMigrationAssessment>;
  exportDiagnosticState(): Promise<Uint8Array>;
}
