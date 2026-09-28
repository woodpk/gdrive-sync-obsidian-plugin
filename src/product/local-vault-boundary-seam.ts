/**
 * Narrow non-shipping production seam for deterministic BVP virtual-world adapters.
 *
 * This module exposes existing production boundary contracts and pure boundary-policy
 * helpers only. It contains no synchronization policy and is not imported by the
 * shipping product entrypoint.
 */
export { contractId } from "../contracts/common";
export type {
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  ObservationToken,
  VaultPath,
} from "../contracts/common";
export type { LocalObservation } from "../contracts/snapshot";
export type {
  ConfigurationClassification,
  LocalLifecycleEvent,
  LocalMutationReceipt,
  LocalReadResult,
  LocalVaultChange,
  LocalVaultListing,
  LocalVaultPort,
  PathValidationResult,
  Unsubscribe,
} from "../contracts/local-vault";
export {
  normalizeVaultPath,
  validateCrossPlatformPath,
} from "../local/path-policy";
export { SelectiveConfigurationPolicy } from "../local/config-policy";
export { LocalExclusionPolicy } from "../local/exclusions";

export type {
  DriveAuthenticationState,
  DriveResult,
  DriveSignal,
  GoogleDrivePort,
  ManagedRemoteIdentity,
  ManagedRemoteValidation,
  RemoteChange,
  RemoteChangePage,
  RemoteCreateRequest,
  RemoteDownload,
  RemoteEntry,
  RemoteListing,
  RemoteMutationReceipt,
  RemoteProtocolInfo,
  RemoteUpdateRequest,
} from "../contracts/google-drive";
export type {
  ProtocolVersion,
  RemoteObjectId,
  VaultIdentity,
} from "../contracts/common";
export type {
  EnumerationCompleteness,
  RemoteObservation,
} from "../contracts/snapshot";

export {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
} from "../state/persistent-state-store";
export type {
  DurableSynchronizationAuthorityState,
  StateByteStorage,
} from "../state/persistent-state-store";
export {
  TombstoneRetentionPolicy,
  ageKnownDevices,
  generateDeviceIdentity,
  markKnownDeviceReconciled,
  registerKnownDevice,
} from "../state/state-policy";
export { SynchronizationStateAuthorityAdapter } from "./synchronization-adapters";
export type {
  DeviceIdentity,
  PersistenceRevision,
  SemanticStateGeneration,
  StateRevision,
} from "../contracts/common";
export type {
  StateLoadContext,
  StateLoadResult,
  TrustedSynchronizationState,
} from "../contracts/state";

export { ProductController } from "./product-controller";
export { ProductSnapshotAssembler } from "./snapshot-assembler";
export { ProductSynchronizationExecutor } from "./production-executor";
export { ProductionSynchronizationPlanner } from "../core/production-planner";
export { DeterministicSynchronizationPlanner } from "../core/planner";
export { ThreeWayConflictResolver } from "../core/conflict-resolver";
export { InMemoryRunLeasePort } from "../core/run-coordinator";
export { BoundedAuditHistory, MemoryAuditPersistence } from "./audit-history";
export type {
  CanonicalFileContentProof,
  LocalMutationTransaction,
  LocalTransactionResult,
  LocalTransactionalMutationPort,
  MutationIntentId,
  ReliableRemoteMutationPort,
  RemoteMutationIdentity,
  RemoteMutationOutcome,
  SynchronizationCancellationSignal,
} from "../contracts/synchronization-foundation";
export type {
  RemoteFolderCreateObservation,
  RemoteFolderCreatePhysicalMutationDescriptor,
  RemoteFolderCreateRecoveryReadPort,
} from "../contracts/synchronization-folder-create-foundation";
export type { RemoteUpdateFinalizationPort } from "./durable-intent-recovery-base";
export type { RemoteRevisionId } from "../contracts/common";
export { ObsidianLocalMutationTransactions } from "../local/local-vault-access-boundary";
export { CanonicalEvidenceLocalVault } from "./canonical-local-vault";
