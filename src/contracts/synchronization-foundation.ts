import type {
  BaseFingerprint,
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  EntityKind,
  LocalMutationTransactionId,
  MutationIntentId,
  ObservationToken,
  OperationId,
  PersistenceRevision,
  RemoteIngestionBatchId,
  RemoteObjectId,
  RemoteRevisionId,
  SemanticStateGeneration,
  VaultPath,
} from "./common";
import type { DriveResult, ManagedRemoteIdentity, RemoteChange, RemoteMutationReceipt } from "./google-drive";

/**
 * Supervisor-review candidate contract surface for the Phase 6 synchronization
 * hardening wave. These contracts deliberately separate persistence mechanics,
 * semantic authority, remote ingestion, and per-path convergence.
 */

export interface SemanticAuthorityReference {
  readonly generation: SemanticStateGeneration;
}

/** Exact BASE fact that authorized history-dependent work on one path. */
export interface ExactBaseAuthority extends SemanticAuthorityReference {
  readonly path: VaultPath;
  readonly fingerprint: BaseFingerprint;
}

export interface IdentityAuthorityProof extends SemanticAuthorityReference {
  readonly status: "unique";
  readonly path: VaultPath;
  readonly remoteObjectId: RemoteObjectId;
}

/** Evidence sufficient to heal a stale BASE without rewriting equal content. */
export interface CommonStateProof extends SemanticAuthorityReference {
  readonly path: VaultPath;
  readonly entityKind: EntityKind;
  readonly localObservationToken?: ObservationToken;
  readonly remoteObjectId?: RemoteObjectId;
  readonly remoteRevision?: RemoteRevisionId;
  readonly content?: ContentEvidence;
  readonly identity: "unambiguous";
}

export type AuthoritativeBaseTransition =
  | { readonly kind: "heal-common-state"; readonly proof: CommonStateProof; readonly nextFingerprint: BaseFingerprint }
  | { readonly kind: "verified-operation"; readonly operationId: OperationId; readonly proof: CommonStateProof; readonly nextFingerprint: BaseFingerprint }
  | { readonly kind: "verified-deletion"; readonly operationId: OperationId; readonly authority: ExactBaseAuthority };

export function exactBaseAuthorityMatches(expected: ExactBaseAuthority, actual: ExactBaseAuthority): boolean {
  return expected.generation === actual.generation
    && expected.path === actual.path
    && expected.fingerprint === actual.fingerprint;
}

export type PathConvergenceState =
  | { readonly status: "converged"; readonly generation: SemanticStateGeneration; readonly baseFingerprint: BaseFingerprint }
  | { readonly status: "attention" | "conflict"; readonly reasonCode: string }
  | { readonly status: "unknown"; readonly reasonCode: string };

/** A complete Drive page is intermediate or terminal; those tokens are not interchangeable. */
export type RemoteChangeProtocolPage =
  | {
      readonly kind: "intermediate";
      readonly requestedToken: ChangeCursor;
      readonly changes: readonly RemoteChange[];
      readonly nextPageToken: ChangeCursor;
    }
  | {
      readonly kind: "terminal";
      readonly requestedToken: ChangeCursor;
      readonly changes: readonly RemoteChange[];
      readonly newStartPageToken: ChangeCursor;
    };

export type RemoteChangePageClassification =
  | { readonly status: "valid"; readonly page: RemoteChangeProtocolPage }
  | { readonly status: "invalid"; readonly reason: "both-page-tokens-present" | "page-token-missing" };

/** Lossless classifier for the two states returned by Drive changes.list. */
export function classifyRemoteChangePage(values: {
  readonly requestedToken: ChangeCursor;
  readonly changes: readonly RemoteChange[];
  readonly nextPageToken?: ChangeCursor;
  readonly newStartPageToken?: ChangeCursor;
}): RemoteChangePageClassification {
  if (values.nextPageToken && values.newStartPageToken) return { status: "invalid", reason: "both-page-tokens-present" };
  if (values.nextPageToken) return {
    status: "valid",
    page: { kind: "intermediate", requestedToken: values.requestedToken, changes: values.changes, nextPageToken: values.nextPageToken },
  };
  if (values.newStartPageToken) return {
    status: "valid",
    page: { kind: "terminal", requestedToken: values.requestedToken, changes: values.changes, newStartPageToken: values.newStartPageToken },
  };
  return { status: "invalid", reason: "page-token-missing" };
}

/** Durable learning progress is separate from whether every affected path converged. */
export interface RemoteIngestionCheckpoint {
  readonly batchId: RemoteIngestionBatchId;
  readonly startingToken: ChangeCursor;
  readonly terminalStartToken: ChangeCursor;
  readonly persistenceRevision: PersistenceRevision;
  readonly status: "learned";
}

export interface DurableRemoteChangeBatch {
  readonly checkpoint: RemoteIngestionCheckpoint;
  /** Ordered, normalized object changes. Distinct object IDs remain distinct. */
  readonly changes: readonly RemoteChange[];
}

/** Drive workstream change-feed seam; a call returns exactly one complete protocol page. */
export interface ReliableRemoteChangePort {
  readChangePage(identity: ManagedRemoteIdentity, requestedToken: ChangeCursor, cancellation?: SynchronizationCancellationSignal): Promise<DriveResult<RemoteChangeProtocolPage>>;
}

export interface RemotePathCandidate {
  readonly remoteObjectId: RemoteObjectId;
  readonly path: VaultPath;
  readonly entityKind: EntityKind;
  readonly content?: ContentEvidence;
}

export type RemoteLogicalPathResolution =
  | { readonly status: "absent"; readonly path: VaultPath }
  | { readonly status: "unique"; readonly path: VaultPath; readonly candidate: RemotePathCandidate }
  | { readonly status: "ambiguous"; readonly path: VaultPath; readonly candidates: readonly RemotePathCandidate[] };

/** Never reduces multiple same-path Drive objects to an arbitrary map winner. */
export function resolveRemotePathCandidates(path: VaultPath, candidates: readonly RemotePathCandidate[]): RemoteLogicalPathResolution {
  const unique = [...new Map(candidates.map(candidate => [String(candidate.remoteObjectId), candidate])).values()];
  if (unique.length === 0) return { status: "absent", path };
  if (unique.length === 1) return { status: "unique", path, candidate: unique[0] };
  return { status: "ambiguous", path, candidates: unique };
}

export type RemoteMutationIdentity =
  | {
      readonly kind: "reserved-create";
      readonly intentId: MutationIntentId;
      readonly reservedRemoteObjectId: RemoteObjectId;
      readonly path: VaultPath;
    }
  | {
      readonly kind: "existing-object";
      readonly intentId: MutationIntentId;
      readonly remoteObjectId: RemoteObjectId;
      readonly expectedRevision: RemoteRevisionId;
      readonly path: VaultPath;
    };

export type RemoteMutationOutcome =
  | { readonly status: "verified-applied"; readonly receipt: RemoteMutationReceipt }
  | { readonly status: "verified-not-applied"; readonly reason: string }
  | { readonly status: "outcome-unknown"; readonly reason: string };

/** Drive workstream target seam; ambiguous results are values, never ordinary retryable success. */
export interface ReliableRemoteMutationPort {
  reserveCreateIdentity(root: ManagedRemoteIdentity, intentId: MutationIntentId, path: VaultPath): Promise<DriveResult<Extract<RemoteMutationIdentity, { readonly kind: "reserved-create" }>>>;
  createReserved(identity: Extract<RemoteMutationIdentity, { readonly kind: "reserved-create" }>, entityKind: EntityKind, content?: BinaryContentSource, expectedEvidence?: ContentEvidence, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome>;
  updateExisting(identity: Extract<RemoteMutationIdentity, { readonly kind: "existing-object" }>, content: BinaryContentSource, expectedEvidence?: ContentEvidence, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome>;
}

export type CoherentRemoteDownload =
  | {
      readonly status: "coherent";
      readonly remoteObjectId: RemoteObjectId;
      readonly revision: RemoteRevisionId;
      readonly evidence: ContentEvidence;
      readonly content: BinaryContentSource;
    }
  | { readonly status: "changed-during-transfer" | "outcome-unknown"; readonly reason: string };

export interface CoherentRemoteReadPort {
  downloadVersion(remoteObjectId: RemoteObjectId, expectedRevision: RemoteRevisionId, expectedEvidence: ContentEvidence, cancellation?: SynchronizationCancellationSignal): Promise<DriveResult<CoherentRemoteDownload>>;
}

export type RecoverableOperationStage =
  | "intent-persisted"
  | "mutation-dispatched"
  | "outcome-unknown"
  | "effect-verified"
  | "state-committed";

export interface RecoverableOperationIntent {
  readonly operationId: OperationId;
  readonly intentId: MutationIntentId;
  readonly path: VaultPath;
  readonly stage: RecoverableOperationStage;
  readonly semanticAuthority: SemanticAuthorityReference;
  readonly baseAuthority?: ExactBaseAuthority;
  readonly remoteMutation?: RemoteMutationIdentity;
  readonly localTransactionId?: LocalMutationTransactionId;
  readonly verificationEvidenceRef?: string;
}

export type RestartRecoveryDirective =
  | { readonly action: "reconcile-physical-reality" }
  | { readonly action: "finish-authoritative-state-commit"; readonly verificationEvidenceRef: string }
  | { readonly action: "none" };

export function restartRecoveryDirective(intent: RecoverableOperationIntent): RestartRecoveryDirective {
  if (intent.stage === "state-committed") return { action: "none" };
  if (intent.stage === "effect-verified" && intent.verificationEvidenceRef) {
    return { action: "finish-authoritative-state-commit", verificationEvidenceRef: intent.verificationEvidenceRef };
  }
  return { action: "reconcile-physical-reality" };
}

export type LocalMutationTransactionStage =
  | "staging"
  | "staged-unverified"
  | "staged-verified"
  | "backup-established"
  | "swap-committed"
  | "cleanup-pending"
  | "completed";

export interface LocalMutationTransaction {
  readonly transactionId: LocalMutationTransactionId;
  readonly operationId: OperationId;
  readonly path: VaultPath;
  readonly stagePath: VaultPath;
  readonly backupPath: VaultPath;
  readonly stage: LocalMutationTransactionStage;
  readonly expectedOldToken?: ObservationToken;
  readonly expectedNewEvidence: ContentEvidence;
}

export type LocalTransactionResult =
  | { readonly status: "staged-verified" | "committed" | "recovered"; readonly transaction: LocalMutationTransaction; readonly resultingObservationToken?: ObservationToken }
  | { readonly status: "stale" | "blocked" | "outcome-unknown"; readonly reason: string; readonly transaction: LocalMutationTransaction };

/** Local workstream mutation seam; implementations persist every returned durable stage through C. */
export interface LocalTransactionalMutationPort {
  stageAndVerify(transaction: LocalMutationTransaction, content: BinaryContentSource, cancellation?: SynchronizationCancellationSignal): Promise<LocalTransactionResult>;
  commitVerifiedStage(transaction: LocalMutationTransaction, cancellation?: SynchronizationCancellationSignal): Promise<LocalTransactionResult>;
  recover(transaction: LocalMutationTransaction, cancellation?: SynchronizationCancellationSignal): Promise<LocalTransactionResult>;
}

export type LocalTransactionRecoveryAction = "discard-unverified-stage" | "verify-stage" | "restore-or-complete-swap" | "cleanup-backup" | "none";

export function localTransactionRecoveryAction(transaction: LocalMutationTransaction): LocalTransactionRecoveryAction {
  switch (transaction.stage) {
    case "staging":
    case "staged-unverified": return "discard-unverified-stage";
    case "staged-verified": return "verify-stage";
    case "backup-established": return "restore-or-complete-swap";
    case "swap-committed":
    case "cleanup-pending": return "cleanup-backup";
    case "completed": return "none";
  }
}

/** Exact provenance, not a timing window, for suppressing plugin-generated event feedback. */
export interface LocalMutationProvenance {
  readonly source: "brain-sync";
  readonly operationId: OperationId;
  readonly transactionId: LocalMutationTransactionId;
  readonly expectedResultToken?: ObservationToken;
}

export interface SynchronizationCancellationSignal {
  readonly cancelled: boolean;
  onCancellation(listener: () => void): () => void;
}

export type SynchronizationLifecycleState = "active" | "suspending" | "suspended" | "unloading";

export const SYNCHRONIZATION_FAULT_POINTS = [
  "after-intent-persist",
  "after-mutation-dispatch",
  "after-remote-response",
  "after-effect-verification",
  "before-authoritative-state-commit",
  "after-stage-write",
  "after-stage-verification",
  "after-backup-establish",
  "after-local-swap",
] as const;
export type SynchronizationFaultPoint = (typeof SYNCHRONIZATION_FAULT_POINTS)[number];
export interface SynchronizationFaultInjector { reach(point: SynchronizationFaultPoint, operationId: OperationId): Promise<void>; }

export interface TextMergeResourcePolicy {
  readonly maximumInputBytesPerVersion: number;
  readonly maximumCombinedInputBytes: number;
}

export type TextMergeEligibility = { readonly eligible: true } | { readonly eligible: false; readonly reason: "version-too-large" | "combined-input-too-large" | "size-unknown" };

export function assessTextMergeEligibility(sizes: readonly (number | undefined)[], policy: TextMergeResourcePolicy): TextMergeEligibility {
  if (sizes.some(size => size === undefined)) return { eligible: false, reason: "size-unknown" };
  const known = sizes as number[];
  if (known.some(size => size > policy.maximumInputBytesPerVersion)) return { eligible: false, reason: "version-too-large" };
  if (known.reduce((total, size) => total + size, 0) > policy.maximumCombinedInputBytes) return { eligible: false, reason: "combined-input-too-large" };
  return { eligible: true };
}

export type SemanticStateValidationIssueCode =
  | "active-device-missing"
  | "duplicate-base-path"
  | "duplicate-remote-object-mapping"
  | "mapping-base-disagreement"
  | "base-tombstone-overlap"
  | "journal-reference-incomplete"
  | "ingestion-checkpoint-inconsistent";

export interface SemanticStateValidationIssue { readonly code: SemanticStateValidationIssueCode; readonly path?: VaultPath; readonly detail: string; }
export interface SemanticStateValidator<TState> { validate(state: TState): readonly SemanticStateValidationIssue[]; }

/** Required coordination segment of the future trusted synchronization state. */
export interface SynchronizationAuthorityMetadata {
  readonly persistenceRevision: PersistenceRevision;
  readonly semanticGeneration: SemanticStateGeneration;
  readonly learnedRemoteBatch?: DurableRemoteChangeBatch;
  /** Array form is intentional: this segment must survive JSON/IndexedDB serialization. */
  readonly pathConvergence: readonly { readonly path: VaultPath; readonly state: PathConvergenceState }[];
  readonly operationIntents: readonly RecoverableOperationIntent[];
  readonly localTransactions: readonly LocalMutationTransaction[];
}

export type SynchronizationAuthorityLoadResult<TState extends SynchronizationAuthorityMetadata> =
  | { readonly status: "trusted"; readonly state: TState }
  | { readonly status: "uninitialized" }
  | { readonly status: "recovery-required"; readonly issues: readonly SemanticStateValidationIssue[] };

export type SynchronizationAuthoritySaveResult =
  | { readonly status: "saved"; readonly persistenceRevision: PersistenceRevision; readonly semanticGeneration: SemanticStateGeneration }
  | { readonly status: "stale-persistence"; readonly actualPersistenceRevision?: PersistenceRevision }
  | { readonly status: "stale-semantic-authority"; readonly actualSemanticGeneration?: SemanticStateGeneration }
  | { readonly status: "recovery-required"; readonly issues: readonly SemanticStateValidationIssue[] };

/** State workstream seam with separate CAS and semantic-authority guards. */
export interface SynchronizationAuthorityStore<TState extends SynchronizationAuthorityMetadata> {
  loadAuthority(): Promise<SynchronizationAuthorityLoadResult<TState>>;
  saveAuthority(state: TState, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration?: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult>;
  commitBaseTransition(transition: AuthoritativeBaseTransition, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult>;
}
