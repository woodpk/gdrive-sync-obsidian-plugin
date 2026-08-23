import type { ChangeCursor, ContentEvidence, EntityKind, ProtocolVersion, RemoteObjectId, VaultIdentity, VaultPath } from "./common";
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
export interface RemoteDownload { readonly bytes: Uint8Array; readonly remoteObjectId: RemoteObjectId; readonly evidence: ContentEvidence; }
export interface RemoteMutationReceipt { readonly remoteObjectId: RemoteObjectId; readonly path: VaultPath; readonly evidence?: ContentEvidence; }
export interface RemoteCreateRequest { readonly path: VaultPath; readonly entityKind: EntityKind; readonly bytes?: Uint8Array; readonly expectedEvidence?: ContentEvidence; }
export interface RemoteUpdateRequest { readonly remoteObjectId: RemoteObjectId; readonly path: VaultPath; readonly bytes: Uint8Array; readonly expectedRemoteRevision?: string; readonly expectedEvidence?: ContentEvidence; }
/** Authentication/session state and remote identity validation are deliberately separate. */
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
  create(rootId: RemoteObjectId, request: RemoteCreateRequest): Promise<DriveResult<RemoteMutationReceipt>>;
  update(request: RemoteUpdateRequest): Promise<DriveResult<RemoteMutationReceipt>>;
  move(remoteObjectId: RemoteObjectId, fromPath: VaultPath, toPath: VaultPath): Promise<DriveResult<RemoteMutationReceipt>>;
  trash(remoteObjectId: RemoteObjectId): Promise<DriveResult<void>>;
}
