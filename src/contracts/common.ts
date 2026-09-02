/** Frozen Phase 1 shared value types. */
type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type VaultPath = Brand<string, "VaultPath">;
export type RemoteObjectId = Brand<string, "RemoteObjectId">;
export type VaultIdentity = Brand<string, "VaultIdentity">;
export type DeviceIdentity = Brand<string, "DeviceIdentity">;
export type ChangeCursor = Brand<string, "ChangeCursor">;
export type StateRevision = Brand<string, "StateRevision">;
/** Byte-document compare-and-swap sequence. It is not synchronization authority. */
export type PersistenceRevision = StateRevision;
/** Changes only when authoritative synchronization facts (BASE, mappings, tombstones, or learned remote state) change. */
export type SemanticStateGeneration = Brand<string, "SemanticStateGeneration">;
export type BaseFingerprint = Brand<string, "BaseFingerprint">;
export type RemoteIngestionBatchId = Brand<string, "RemoteIngestionBatchId">;
export type MutationIntentId = Brand<string, "MutationIntentId">;
export type LocalMutationTransactionId = Brand<string, "LocalMutationTransactionId">;
export type RemoteRevisionId = Brand<string, "RemoteRevisionId">;
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
 * Structured operational-failure provenance is independent of physical-effect certainty.
 * It may inform retry scheduling or product status, but never proves whether a mutation
 * was or was not physically applied.
 */
export type OperationalFailureOrigin = "local" | "remote" | "unknown";
export type OperationalFailureProvenance =
  | { readonly kind: "authentication-required"; readonly origin: OperationalFailureOrigin; readonly detail?: string }
  | { readonly kind: "transient-failure"; readonly origin: OperationalFailureOrigin; readonly detail?: string }
  | { readonly kind: "rate-limited"; readonly origin: OperationalFailureOrigin; readonly retryAfterMs?: number; readonly detail?: string }
  | { readonly kind: "permission-denied"; readonly origin: OperationalFailureOrigin; readonly detail?: string }
  | { readonly kind: "quota-exhausted"; readonly origin: OperationalFailureOrigin; readonly detail?: string }
  | { readonly kind: "recovery-required"; readonly origin: OperationalFailureOrigin; readonly detail?: string }
  | { readonly kind: "semantic-failure"; readonly origin: OperationalFailureOrigin; readonly detail?: string }
  | { readonly kind: "unclassified"; readonly origin: OperationalFailureOrigin; readonly detail?: string };

/** Public carrier for failures that occur only while a lazy BinaryContentSource is consumed. */
export class OperationalFailureError extends Error {
  readonly name = "OperationalFailureError";
  constructor(readonly provenance: OperationalFailureProvenance, message?: string) {
    super(message ?? provenance.detail ?? provenance.kind);
  }
}

/**
 * Sanctioned public extraction helper. Unknown errors deliberately return undefined so
 * callers can fail conservatively instead of parsing strings or inventing retryability.
 */
export function operationalFailureProvenanceFromError(error: unknown): OperationalFailureProvenance | undefined {
  return error instanceof OperationalFailureError ? error.provenance : undefined;
}

export function unclassifiedOperationalFailure(origin: OperationalFailureOrigin, detail?: string): OperationalFailureProvenance {
  return { kind: "unclassified", origin, ...(detail === undefined ? {} : { detail }) };
}

/**
 * Platform-neutral binary content source.
 *
 * Implementations provide content incrementally and must not require the
 * complete file to be materialized in memory before consumption begins.
 * Lazy operational failures may be surfaced by throwing OperationalFailureError.
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
