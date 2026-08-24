/** Frozen Phase 1 shared value types. */
type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type VaultPath = Brand<string, "VaultPath">;
export type RemoteObjectId = Brand<string, "RemoteObjectId">;
export type VaultIdentity = Brand<string, "VaultIdentity">;
export type DeviceIdentity = Brand<string, "DeviceIdentity">;
export type ChangeCursor = Brand<string, "ChangeCursor">;
export type StateRevision = Brand<string, "StateRevision">;
export type OperationId = Brand<string, "OperationId">;
export type PlanId = Brand<string, "PlanId">;
export type ConflictId = Brand<string, "ConflictId">;
export type CheckpointId = Brand<string, "CheckpointId">;
export type ContentHash = Brand<string, "ContentHash">;
export type ObservationToken = Brand<string, "ObservationToken">;
export type ProtocolVersion = Brand<string, "ProtocolVersion">;
export type EntityKind = "file" | "folder";
export type SyncSide = "local" | "remote";

/**
 * Platform-neutral binary content source.
 *
 * Implementations provide content incrementally and must not require the
 * complete file to be materialized in memory before consumption begins.
 */
export interface BinaryContentSource {
  readonly sizeBytes?: number;
  openChunks(): AsyncIterable<Uint8Array>;
}

/** Timestamps are advisory metadata and never overwrite/conflict authority. */
export interface ContentEvidence {
  readonly hash?: ContentHash;
  readonly sizeBytes?: number;
  readonly revision?: string;
  readonly advisoryModifiedTimeMs?: number;
}
export interface VersionReference {
  readonly path: VaultPath;
  readonly entityKind: EntityKind;
  readonly content?: ContentEvidence;
  readonly remoteObjectId?: RemoteObjectId;
  readonly observationToken?: ObservationToken;
}
export const contractId = <T extends string>(value: string): Brand<string, T> => value as Brand<string, T>;
