/**
 * DEC-339 D339-01: observational metadata contracts, not BASE, recovery or mutation authority.
 * No implementation may persist a targeted mutation proof or infer global Drive visibility from drive.file.
 */
import type {
  ChangeCursor, ContentEvidence, DeviceIdentity, EntityKind, ObservationToken,
  PersistenceRevision, ProtocolVersion, RemoteObjectId, RemoteRevisionId,
  SemanticStateGeneration, VaultIdentity, VaultPath,
} from "./common";

export type InventoryGeneration = string & { readonly __inventoryGeneration: "InventoryGeneration" };
export type InventoryDomain = "content" | "portable-config";
export type InventoryCoverageState = "complete" | "partial" | "unknown" | "invalid";
export type InventoryTrustFailure = "unknown" | "partial" | "ambiguous" | "stale" | "incompatible" | "invalid" | "recovery-required";

/** The opaque account key must not contain an access token, email or credential. */
export interface InventoryIdentityFence {
  readonly vaultIdentity: VaultIdentity;
  readonly deviceIdentity: DeviceIdentity;
  readonly pairedAccountKey: string;
  readonly managedRootId: RemoteObjectId;
  readonly protocolVersion: ProtocolVersion;
  readonly contentDomainRootId: RemoteObjectId;
  readonly configDomainRootId: RemoteObjectId;
  readonly scopePolicyFingerprint: string;
  readonly inventorySchemaVersion: number;
}

/** Immutable per-generation manifest: predecessor history must not live only on active control. */
export interface InventoryGenerationManifest {
  readonly generation: InventoryGeneration;
  readonly parentGeneration: InventoryGeneration | null;
  readonly overlayDepth: number;
  readonly inputCursor: ChangeCursor;
  readonly terminalCursor: ChangeCursor;
  readonly baseStartToken: ChangeCursor;
  readonly fence: InventoryIdentityFence;
  readonly authorityPersistenceRevision: PersistenceRevision;
  readonly authoritySemanticGeneration: SemanticStateGeneration;
  readonly recordCount: number;
  readonly coverageDigest: string;
  readonly validationReceipt: string;
  readonly status: "staging" | "complete" | "invalid";
}

/** One stable Drive ID; duplicate names within the same physical parent are expressly legal. */
export interface InventoryRemoteEntity {
  readonly generation: InventoryGeneration;
  readonly remoteObjectId: RemoteObjectId;
  readonly parentRemoteObjectId: RemoteObjectId | null;
  readonly domain: InventoryDomain;
  readonly name: string;
  readonly kind: EntityKind;
  readonly logicalPath?: VaultPath;
  readonly pathValidity: "verified" | "unknown" | "invalid";
  readonly access: "visible" | "inaccessible" | "unknown";
  readonly trashed: boolean;
  readonly managedRootId: RemoteObjectId;
  readonly provenanceDomain: InventoryDomain;
  readonly revision?: RemoteRevisionId;
  readonly content?: ContentEvidence;
}

/** Advisory only: no missing local row can prove deletion. */
export interface InventoryLocalObservation {
  readonly generation: InventoryGeneration;
  readonly path: VaultPath;
  readonly kind: EntityKind;
  readonly presence: "present" | "unreadable" | "unknown";
  readonly observationToken?: ObservationToken;
  readonly remoteObjectId?: RemoteObjectId;
}

/** Provider-visible coverage is not a claim over files unavailable under drive.file. */
export interface InventoryCoverage {
  readonly generation: InventoryGeneration;
  readonly domain: InventoryDomain;
  readonly scopeId: RemoteObjectId;
  readonly scopeKind: "domain" | "parent";
  readonly state: InventoryCoverageState;
  readonly visibility: "app-visible" | "unknown";
  readonly allPagesRead: boolean;
  readonly incompleteSearch: boolean;
  readonly provenanceVerified: boolean;
  readonly terminalCursor: ChangeCursor;
  readonly reason?: string;
}

export type InventoryOverlayRecord =
  | { readonly kind: "upsert"; readonly generation: InventoryGeneration; readonly entity: InventoryRemoteEntity }
  | { readonly kind: "mask"; readonly generation: InventoryGeneration; readonly remoteObjectId: RemoteObjectId };

export type InventoryReadResult<T> =
  | { readonly status: "verified-observation"; readonly generation: InventoryGeneration; readonly value: T }
  | { readonly status: InventoryTrustFailure; readonly reason: string };

export type InventoryMembershipClassification =
  | "tracked-managed-id" | "proven-outside-managed-domain" | "unclassifiable-or-lost-access";

export interface InventoryTargetedProof {
  readonly remoteObjectId: RemoteObjectId;
  readonly parentRemoteObjectId: RemoteObjectId;
  readonly name: string;
  readonly domain: InventoryDomain;
  readonly siblingIds: readonly RemoteObjectId[];
  readonly siblingCoverage: "complete";
  readonly nonLocalManagedProvenance: "verified-current";
  readonly authoritySemanticGeneration: SemanticStateGeneration;
  readonly observedRevision?: RemoteRevisionId;
  readonly observedContent?: ContentEvidence;
  readonly purpose: "precondition" | "effect-convergence" | "durable-recovery";
}

/** Ephemeral only. A proof is neither durable mutation permission nor an operation receipt. */
export type InventoryTargetedProofResult =
  | { readonly status: "verified-current-proof"; readonly proof: InventoryTargetedProof }
  | { readonly status: InventoryTrustFailure; readonly reason: string };

/** Pure shape checks cannot mint a provider-backed current physical proof. */
export type InventoryTargetedProofAssessment =
  | { readonly status: "structurally-eligible"; readonly purpose: InventoryTargetedProof["purpose"] }
  | { readonly status: InventoryTrustFailure; readonly reason: string };

export interface InventoryReadLease {
  readonly generation: InventoryGeneration;
  readonly fence: InventoryIdentityFence;
  getById(id: RemoteObjectId): Promise<InventoryReadResult<InventoryRemoteEntity | undefined>>;
  listByParent(domain: InventoryDomain, parent: RemoteObjectId, name?: string, limit?: number): Promise<InventoryReadResult<readonly InventoryRemoteEntity[]>>;
  listByPath(domain: InventoryDomain, path: VaultPath, limit?: number): Promise<InventoryReadResult<readonly InventoryRemoteEntity[]>>;
  coverage(domain: InventoryDomain, scope: RemoteObjectId): Promise<InventoryReadResult<InventoryCoverage>>;
  /** Releases ancestor-generation pins. */
  release(): Promise<void>;
}

export interface InventoryStageRequest {
  readonly candidate: InventoryGenerationManifest;
  readonly overlays: AsyncIterable<InventoryOverlayRecord>;
  readonly coverage: AsyncIterable<InventoryCoverage>;
}

export interface InventoryPublishRequest {
  readonly candidateGeneration: InventoryGeneration;
  readonly validationReceipt: string;
  readonly expectedActiveGeneration: InventoryGeneration | null;
  readonly expectedAuthorityPersistenceRevision: PersistenceRevision;
  readonly expectedAuthoritySemanticGeneration: SemanticStateGeneration;
  readonly expectedCanonicalCursor: ChangeCursor | null;
  readonly nextCanonicalCursor: ChangeCursor;
  readonly fence: InventoryIdentityFence;
  readonly learnedBatchId?: string;
}

export type InventoryPublishResult =
  | { readonly status: "published"; readonly generation: InventoryGeneration; readonly terminalCursor: ChangeCursor }
  | { readonly status: "stale" | "invalid" | "recovery-required"; readonly reason: string };

/**
 * The future WS-02 implementation MUST publish the inventory active pointer, reachable
 * immutable manifest and trusted canonical cursor/batch metadata in ONE IndexedDB
 * transaction with a sync-state CAS. All existing cursor writers must be fenced there.
 * This interface does not implement persistence or certify an effect.
 */
export interface InventoryObservationStore {
  openRead(): Promise<InventoryReadResult<InventoryReadLease>>;
  stage(request: InventoryStageRequest): Promise<InventoryReadResult<InventoryGeneration>>;
  publishAtomically(request: InventoryPublishRequest): Promise<InventoryPublishResult>;
}
