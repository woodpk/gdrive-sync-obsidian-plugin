import type {
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  EntityKind,
  ProtocolVersion,
  RemoteObjectId,
  VaultIdentity,
  VaultPath
} from "./common";
import type { EnumerationCompleteness, RemoteObservation } from "./snapshot";
export const REQUIRED_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file" as const;
export type DriveAuthenticationState = { readonly status: "authenticated"; readonly accountHint?: string } | { readonly status: "authentication-required"; readonly reason?: string } | { readonly status: "unavailable"; readonly reason: "offline" | "service-unavailable" };
export interface ManagedRemoteIdentity { readonly rootId: RemoteObjectId; readonly vaultIdentity: VaultIdentity; readonly protocolVersion: ProtocolVersion; }
export type ManagedRemoteValidation = { readonly status: "valid"; readonly identity: ManagedRemoteIdentity } | { readonly status: "missing-root" } | { readonly status: "identity-mismatch"; readonly observedVaultIdentity?: VaultIdentity } | { readonly status: "incompatible-protocol"; readonly observedVersion: ProtocolVersion } | { readonly status: "ambiguous"; readonly reason: string };
export interface RemoteProtocolInfo { readonly currentVersion: ProtocolVersion; readonly compatible: boolean; }
export type DriveSignal = { readonly kind: "authentication-required" | "transient-failure" | "permission-denied"; readonly detail?: string } | { readonly kind: "rate-limited"; readonly retryAfterMs?: number } | { readonly kind: "quota-exhausted"; readonly detail?: string } | { readonly kind: "not-found"; readonly remoteObjectId?: RemoteObjectId } | { readonly kind: "conflict" | "recovery-required"; readonly detail: string };
export type DriveResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly signal: DriveSignal };
export interface RemoteEntry { readonly path: VaultPath; readonly entityKind: EntityKind; readonly remoteObjectId: RemoteObjectId; readonly content?: ContentEvidence; readonly trashed: boolean; }
export interface RemoteListing { readonly entries: readonly RemoteEntry[]; readonly completeness: EnumerationCompleteness; }
export type RemoteChange = { readonly kind: "upsert"; readonly entry: RemoteEntry } | { readonly kind: "removed"; readonly remoteObjectId: RemoteObjectId; readonly lastKnownPath?: VaultPath };
export interface RemoteChangePage { readonly changes: readonly RemoteChange[]; readonly nextCursor: ChangeCursor; readonly completeness: EnumerationCompleteness; }
export interface RemoteDownload {
  readonly content: BinaryContentSource;
  readonly remoteObjectId: RemoteObjectId;
  readonly evidence: ContentEvidence;
}
export interface RemoteMutationReceipt { readonly remoteObjectId: RemoteObjectId; readonly path: VaultPath; readonly evidence?: ContentEvidence; }
export interface RemoteCreateRequest {
  readonly path: VaultPath;
  readonly entityKind: EntityKind;
  readonly content?: BinaryContentSource;
  readonly expectedEvidence?: ContentEvidence;
}
export interface RemoteUpdateRequest {
  readonly remoteObjectId: RemoteObjectId;
  readonly path: VaultPath;
  readonly content: BinaryContentSource;
  readonly expectedRemoteRevision?: string;
  readonly expectedEvidence?: ContentEvidence;
}
/**
 * Legacy/raw Drive transport surface retained for compatibility with existing code.
 * The Stage 2A synchronization execution path MUST NOT treat create/update/move/trash
 * results from this interface as authoritative mutation outcomes. Workstream A owns
 * the adapter from these transport primitives into ReliableRemoteMutationPort, and
 * Workstream D consumes only the reliable frozen synchronization seams.
 */
export interface GoogleDrivePort {
  authenticationState(): Promise<DriveAuthenticationState>;
  createManagedRoot(vaultIdentity: VaultIdentity, protocolVersion: ProtocolVersion): Promise<DriveResult<ManagedRemoteIdentity>>;
  pairManagedRoot(rootId: RemoteObjectId, expectedVaultIdentity: VaultIdentity): Promise<DriveResult<ManagedRemoteValidation>>;
  validateManagedRoot(identity: ManagedRemoteIdentity): Promise<DriveResult<ManagedRemoteValidation>>;
  protocolInfo(rootId: RemoteObjectId): Promise<DriveResult<RemoteProtocolInfo>>;
  listForReconciliation(rootId: RemoteObjectId): Promise<DriveResult<RemoteListing>>;
  getStartCursor(rootId: RemoteObjectId): Promise<DriveResult<ChangeCursor>>;
  readChanges(rootId: RemoteObjectId, cursor: ChangeCursor): Promise<DriveResult<RemoteChangePage>>;
  observe(rootId: RemoteObjectId, path: VaultPath): Promise<DriveResult<RemoteObservation>>;
  download(remoteObjectId: RemoteObjectId): Promise<DriveResult<RemoteDownload>>;
  /** @deprecated Raw transport primitive; not synchronization authority. */
  create(rootId: RemoteObjectId, request: RemoteCreateRequest): Promise<DriveResult<RemoteMutationReceipt>>;
  /** @deprecated Raw in-place transport primitive; forbidden for preservation-safe synchronization content update. */
  update(request: RemoteUpdateRequest): Promise<DriveResult<RemoteMutationReceipt>>;
  /** @deprecated Raw transport primitive; synchronization must use ReliableRemoteMutationPort.moveExisting. */
  move(remoteObjectId: RemoteObjectId, fromPath: VaultPath, toPath: VaultPath): Promise<DriveResult<RemoteMutationReceipt>>;
  /** @deprecated Raw transport primitive; synchronization must use ReliableRemoteMutationPort.trashExisting. */
  trash(remoteObjectId: RemoteObjectId): Promise<DriveResult<void>>;
}

/**
 * V1.3 maps only context-free operational Drive failures. Observation/semantic
 * results such as not-found and conflict remain owned by their calling context.
 */
export function operationalFailureFromDriveSignalV1_3(
  signal: DriveSignal,
): import("./common").OperationalFailureProvenanceV1_3 | undefined {
  switch (signal.kind) {
    case "authentication-required":
      return { kind: "authentication-required", source: "google-drive", ...(signal.detail === undefined ? {} : { detail: signal.detail }) };
    case "transient-failure":
      return { kind: "transient-failure", source: "google-drive", ...(signal.detail === undefined ? {} : { detail: signal.detail }) };
    case "rate-limited":
      return { kind: "rate-limited", source: "google-drive", ...(signal.retryAfterMs === undefined ? {} : { retryAfterMs: signal.retryAfterMs }) };
    case "permission-denied":
      return { kind: "permission-denied", source: "google-drive", ...(signal.detail === undefined ? {} : { detail: signal.detail }) };
    case "quota-exhausted":
      return { kind: "quota-exhausted", source: "google-drive", ...(signal.detail === undefined ? {} : { detail: signal.detail }) };
    case "recovery-required":
      return { kind: "recovery-required", source: "google-drive", detail: signal.detail };
    case "not-found":
    case "conflict":
      return undefined;
  }
}
