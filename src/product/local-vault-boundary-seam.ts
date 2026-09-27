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
export type { RemoteObservation } from "../contracts/snapshot";
