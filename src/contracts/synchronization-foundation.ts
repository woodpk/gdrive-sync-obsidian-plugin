import type {
  BaseFingerprint,
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  ContentHash,
  EntityKind,
  LocalMutationTransactionId,
  MutationIntentId,
  ObservationToken,
  OperationId,
  OperationalFailureProvenance,
  PersistenceRevision,
  RemoteIngestionBatchId,
  RemoteObjectId,
  RemoteRevisionId,
  SemanticStateGeneration,
  SyncSide,
  VaultPath,
} from "./common";
import type { DriveResult, ManagedRemoteIdentity, RemoteChange, RemoteMutationReceipt } from "./google-drive";

/**
 * Supervisor-review candidate contract surface for the Phase 6 synchronization
 * hardening wave. These contracts deliberately separate persistence mechanics,
 * semantic authority, remote ingestion, physical mutation, and path convergence.
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

/** Canonical file equality authority. Size/timestamps/path/identity alone are insufficient. */
export interface CanonicalFileContentProof {
  readonly algorithm: "sha256";
  readonly hash: ContentHash;
  readonly sizeBytes: number;
}

export interface FileCommonStateProof extends SemanticAuthorityReference {
  readonly kind: "file-common";
  readonly path: VaultPath;
  readonly entityKind: "file";
  readonly localObservationToken: ObservationToken;
  readonly remoteObjectId: RemoteObjectId;
  readonly remoteRevision: RemoteRevisionId;
  readonly canonicalContent: CanonicalFileContentProof;
  readonly identity: "unambiguous";
}

export interface FolderCommonStateProof extends SemanticAuthorityReference {
  readonly kind: "folder-common";
  readonly path: VaultPath;
  readonly entityKind: "folder";
  readonly localObservationToken: ObservationToken;
  readonly remoteObjectId: RemoteObjectId;
  readonly remoteRevision?: RemoteRevisionId;
  readonly identity: "unambiguous";
}

export interface AbsenceCommonStateProof extends SemanticAuthorityReference {
  readonly kind: "absence-common";
  readonly path: VaultPath;
  readonly entityKind: EntityKind;
  readonly localAbsence: { readonly status: "absent"; readonly observationToken?: ObservationToken };
  readonly remoteAbsence: { readonly status: "absent"; readonly completenessProofRef: string };
  readonly identity: "unambiguous";
}

export type CommonStateProof = FileCommonStateProof | FolderCommonStateProof | AbsenceCommonStateProof;

export function establishFileCommonStateProof(values: {
  readonly path: VaultPath;
  readonly generation: SemanticStateGeneration;
  readonly localObservationToken: ObservationToken;
  readonly remoteObjectId: RemoteObjectId;
  readonly remoteRevision: RemoteRevisionId;
  readonly localCanonicalContent?: CanonicalFileContentProof;
  readonly remoteCanonicalContent?: CanonicalFileContentProof;
}): FileCommonStateProof | undefined {
  const local = values.localCanonicalContent;
  const remote = values.remoteCanonicalContent;
  if (!local || !remote) return undefined;
  if (local.algorithm !== "sha256" || remote.algorithm !== "sha256") return undefined;
  if (local.hash !== remote.hash || local.sizeBytes !== remote.sizeBytes) return undefined;
  return {
    kind: "file-common",
    path: values.path,
    entityKind: "file",
    generation: values.generation,
    localObservationToken: values.localObservationToken,
    remoteObjectId: values.remoteObjectId,
    remoteRevision: values.remoteRevision,
    canonicalContent: local,
    identity: "unambiguous",
  };
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

export type RemoteChangeProtocolPage =
  | { readonly kind: "intermediate"; readonly requestedToken: ChangeCursor; readonly changes: readonly RemoteChange[]; readonly nextPageToken: ChangeCursor }
  | { readonly kind: "terminal"; readonly requestedToken: ChangeCursor; readonly changes: readonly RemoteChange[]; readonly newStartPageToken: ChangeCursor };

export type RemoteChangePageClassification =
  | { readonly status: "valid"; readonly page: RemoteChangeProtocolPage }
  | { readonly status: "invalid"; readonly reason: "both-page-tokens-present" | "page-token-missing" };

export function classifyRemoteChangePage(values: {
  readonly requestedToken: ChangeCursor;
  readonly changes: readonly RemoteChange[];
  readonly nextPageToken?: ChangeCursor;
  readonly newStartPageToken?: ChangeCursor;
}): RemoteChangePageClassification {
  if (values.nextPageToken && values.newStartPageToken) return { status: "invalid", reason: "both-page-tokens-present" };
  if (values.nextPageToken) return { status: "valid", page: { kind: "intermediate", requestedToken: values.requestedToken, changes: values.changes, nextPageToken: values.nextPageToken } };
  if (values.newStartPageToken) return { status: "valid", page: { kind: "terminal", requestedToken: values.requestedToken, changes: values.changes, newStartPageToken: values.newStartPageToken } };
  return { status: "invalid", reason: "page-token-missing" };
}

export interface RemoteIngestionCheckpoint {
  readonly batchId: RemoteIngestionBatchId;
  readonly startingToken: ChangeCursor;
  readonly terminalStartToken: ChangeCursor;
  readonly persistenceRevision: PersistenceRevision;
  readonly status: "learned";
}

export interface DurableRemoteChangeBatch {
  readonly checkpoint: RemoteIngestionCheckpoint;
  readonly changes: readonly RemoteChange[];
}

export function appendDurableRemoteChangeBatch(backlog: readonly DurableRemoteChangeBatch[], batch: DurableRemoteChangeBatch): readonly DurableRemoteChangeBatch[] {
  if (backlog.some(existing => existing.checkpoint.batchId === batch.checkpoint.batchId)) return backlog;
  return [...backlog, batch];
}

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

export function resolveRemotePathCandidates(path: VaultPath, candidates: readonly RemotePathCandidate[]): RemoteLogicalPathResolution {
  const unique = [...new Map(candidates.map(candidate => [String(candidate.remoteObjectId), candidate])).values()];
  if (unique.length === 0) return { status: "absent", path };
  if (unique.length === 1) return { status: "unique", path, candidate: unique[0] };
  return { status: "ambiguous", path, candidates: unique };
}

/** Durable identity for every v1 remote mutation. File content mutations bind exact intended bytes before dispatch. */
export type RemoteMutationIdentity =
  | {
      readonly kind: "reserved-file-create";
      readonly intentId: MutationIntentId;
      readonly reservedRemoteObjectId: RemoteObjectId;
      readonly path: VaultPath;
      readonly intendedContent: CanonicalFileContentProof;
    }
  | {
      readonly kind: "reserved-folder-create";
      readonly intentId: MutationIntentId;
      readonly reservedRemoteObjectId: RemoteObjectId;
      readonly path: VaultPath;
    }
  | {
      readonly kind: "existing-file-content-update";
      readonly intentId: MutationIntentId;
      readonly remoteObjectId: RemoteObjectId;
      readonly expectedRevision: RemoteRevisionId;
      readonly path: VaultPath;
      readonly updateProtocol: "immutable-candidate-preservation";
      readonly candidateRemoteObjectId: RemoteObjectId;
      readonly intendedContent: CanonicalFileContentProof;
      readonly identityAuthority: IdentityAuthorityProof;
    }
  | {
      readonly kind: "identity-preserving-move";
      readonly intentId: MutationIntentId;
      readonly remoteObjectId: RemoteObjectId;
      readonly fromPath: VaultPath;
      readonly toPath: VaultPath;
      readonly identityAuthority: IdentityAuthorityProof;
    }
  | {
      readonly kind: "trash";
      readonly intentId: MutationIntentId;
      readonly remoteObjectId: RemoteObjectId;
      readonly path: VaultPath;
      readonly baseAuthority: ExactBaseAuthority;
      readonly identityAuthority: IdentityAuthorityProof;
    };

export type RemoteMutationApplicationProof =
  | { readonly kind: "reserved-create"; readonly remoteObjectId: RemoteObjectId; readonly path: VaultPath; readonly verifiedContent?: CanonicalFileContentProof }
  | {
      readonly kind: "immutable-candidate-preservation";
      readonly candidateRemoteObjectId: RemoteObjectId;
      readonly predecessorRemoteObjectId: RemoteObjectId;
      readonly predecessorRevision: RemoteRevisionId;
      readonly intendedContent: CanonicalFileContentProof;
      readonly verifiedContent: CanonicalFileContentProof;
      readonly preservedRemoteObjectIds: readonly RemoteObjectId[];
    }
  | { readonly kind: "identity-preserving-move"; readonly remoteObjectId: RemoteObjectId; readonly fromPath: VaultPath; readonly toPath: VaultPath }
  | { readonly kind: "trash"; readonly remoteObjectId: RemoteObjectId; readonly path: VaultPath; readonly trashed: true };

/** Application proof answers only whether the physical effect was safely verified, not whether the path converged. */
export type RemoteMutationOutcome =
  | { readonly status: "verified-effect"; readonly receipt?: RemoteMutationReceipt; readonly applicationProof: RemoteMutationApplicationProof }
  | { readonly status: "conflict-preserved"; readonly reason: string; readonly preservedRemoteObjectIds: readonly RemoteObjectId[]; readonly operationalFailure?: OperationalFailureProvenance }
  | { readonly status: "verified-not-applied"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenance }
  | { readonly status: "outcome-unknown"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenance };

export type RemoteUpdateVerificationEvidence =
  | { readonly kind: "final-content-observed-only"; readonly finalContentMatchesCandidate: boolean }
  | { readonly kind: "immutable-candidate-preservation"; readonly finalContentMatchesCandidate: boolean; readonly proof: Extract<RemoteMutationApplicationProof, { readonly kind: "immutable-candidate-preservation" }> };

/** Proves non-destructive materialization only. It deliberately says nothing about logical-path conflict status. */
export function remoteUpdateWasSafelyMaterialized(evidence: RemoteUpdateVerificationEvidence): boolean {
  if (evidence.kind !== "immutable-candidate-preservation" || !evidence.finalContentMatchesCandidate) return false;
  return evidence.proof.intendedContent.hash === evidence.proof.verifiedContent.hash
    && evidence.proof.intendedContent.sizeBytes === evidence.proof.verifiedContent.sizeBytes
    && evidence.proof.preservedRemoteObjectIds.includes(evidence.proof.predecessorRemoteObjectId);
}

export type RemotePathConvergenceAuthority =
  | { readonly status: "conflict-free"; readonly basis: "no-independent-candidate" | "all-candidates-authoritatively-equivalent"; readonly authoritativeRemoteObjectIds: readonly RemoteObjectId[] }
  | { readonly status: "conflict-preserved"; readonly independentRemoteObjectIds: readonly RemoteObjectId[] };

export function remoteUpdateEligibleForOrdinaryConvergence(applicationVerified: boolean, authority: RemotePathConvergenceAuthority): boolean {
  return applicationVerified && authority.status === "conflict-free";
}

/** Every production synchronization remote mutation must use this recovery-safe seam. */
export interface ReliableRemoteMutationPort {
  reserveFileCreateIdentity(root: ManagedRemoteIdentity, intentId: MutationIntentId, path: VaultPath, intendedContent: CanonicalFileContentProof): Promise<DriveResult<Extract<RemoteMutationIdentity, { readonly kind: "reserved-file-create" }>>>;
  reserveFolderCreateIdentity(root: ManagedRemoteIdentity, intentId: MutationIntentId, path: VaultPath): Promise<DriveResult<Extract<RemoteMutationIdentity, { readonly kind: "reserved-folder-create" }>>>;
  createReserved(identity: Extract<RemoteMutationIdentity, { readonly kind: "reserved-file-create" | "reserved-folder-create" }>, content?: BinaryContentSource, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome>;
  updateExisting(identity: Extract<RemoteMutationIdentity, { readonly kind: "existing-file-content-update" }>, content: BinaryContentSource, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome>;
  moveExisting(identity: Extract<RemoteMutationIdentity, { readonly kind: "identity-preserving-move" }>, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome>;
  trashExisting(identity: Extract<RemoteMutationIdentity, { readonly kind: "trash" }>, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome>;
}

export type CoherentRemoteDownload =
  | { readonly status: "coherent"; readonly remoteObjectId: RemoteObjectId; readonly revision: RemoteRevisionId; readonly evidence: ContentEvidence; readonly content: BinaryContentSource }
  | { readonly status: "changed-during-transfer" | "outcome-unknown"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenance };

export interface CoherentRemoteReadPort {
  downloadVersion(remoteObjectId: RemoteObjectId, expectedRevision: RemoteRevisionId, expectedEvidence: ContentEvidence, cancellation?: SynchronizationCancellationSignal): Promise<DriveResult<CoherentRemoteDownload>>;
}

export type RecoverableOperationStage = "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified" | "state-committed";

export type RecoverablePhysicalMutationDescriptor =
  | {
      readonly kind: "local-file";
      readonly targetSide: "local";
      readonly mutationKind: "create" | "replace";
      readonly targetPath: VaultPath;
      readonly localTransactionId: LocalMutationTransactionId;
      readonly intendedContent: CanonicalFileContentProof;
    }
  | {
      readonly kind: "remote-file";
      readonly targetSide: "remote";
      readonly mutationKind: "create" | "update";
      readonly targetPath: VaultPath;
      readonly remoteMutation: Extract<RemoteMutationIdentity, { readonly kind: "reserved-file-create" | "existing-file-content-update" }>;
      readonly intendedContent: CanonicalFileContentProof;
    }
  | {
      readonly kind: "move";
      readonly targetSide: SyncSide;
      readonly fromPath: VaultPath;
      readonly toPath: VaultPath;
      readonly remoteObjectId?: RemoteObjectId;
      readonly identityAuthority: IdentityAuthorityProof;
    }
  | {
      readonly kind: "trash";
      readonly targetSide: SyncSide;
      readonly path: VaultPath;
      readonly remoteObjectId?: RemoteObjectId;
      readonly baseAuthority: ExactBaseAuthority;
      readonly identityAuthority?: IdentityAuthorityProof;
    };

export interface RecoverableMutationEffect {
  readonly effectId: string;
  readonly descriptor: RecoverablePhysicalMutationDescriptor;
  readonly stage: RecoverableOperationStage;
  readonly verificationEvidenceRef?: string;
}

export type RecoverableOperationIntent =
  | {
      readonly logicalKind: "single-effect";
      readonly operationId: OperationId;
      readonly intentId: MutationIntentId;
      readonly semanticAuthority: SemanticAuthorityReference;
      readonly effects: readonly [RecoverableMutationEffect];
    }
  | {
      readonly logicalKind: "clean-text-merge";
      readonly operationId: OperationId;
      readonly intentId: MutationIntentId;
      readonly semanticAuthority: SemanticAuthorityReference;
      readonly effects: readonly [RecoverableMutationEffect, RecoverableMutationEffect, ...RecoverableMutationEffect[]];
    };

export type RestartRecoveryDirective =
  | { readonly action: "retire-unattempted-intent" }
  | { readonly action: "reconcile-physical-reality" }
  | { readonly action: "finish-authoritative-state-commit"; readonly verificationEvidenceRef: string }
  | { readonly action: "none" };

export function mutationMayHaveBeenAttempted(stage: RecoverableOperationStage): boolean {
  return stage !== "intent-persisted";
}

export function restartRecoveryDirective(effect: Pick<RecoverableMutationEffect, "stage" | "verificationEvidenceRef">): RestartRecoveryDirective {
  if (effect.stage === "state-committed") return { action: "none" };
  if (effect.stage === "intent-persisted") return { action: "retire-unattempted-intent" };
  if (effect.stage === "effect-verified" && effect.verificationEvidenceRef) return { action: "finish-authoritative-state-commit", verificationEvidenceRef: effect.verificationEvidenceRef };
  return { action: "reconcile-physical-reality" };
}

/** A multi-effect logical operation is complete only when every physical effect reached state commit. */
export function recoverableOperationIsComplete(intent: RecoverableOperationIntent): boolean {
  return intent.effects.every(effect => effect.stage === "state-committed");
}

export type LocalMutationTransactionStage = "staging" | "staged-unverified" | "staged-verified" | "backup-established" | "swap-committed" | "cleanup-pending" | "completed";

export type LocalTargetPreState =
  | { readonly status: "expected-absent"; readonly observationToken?: ObservationToken }
  | { readonly status: "expected-present"; readonly observationToken: ObservationToken; readonly entityKind: "file"; readonly canonicalContent: CanonicalFileContentProof };

interface LocalMutationTransactionBase {
  readonly transactionId: LocalMutationTransactionId;
  readonly operationId: OperationId;
  readonly path: VaultPath;
  readonly stagePath: VaultPath;
  readonly backupPath: VaultPath;
  readonly stage: LocalMutationTransactionStage;
  readonly expectedEntityKind: "file";
  readonly expectedNewEvidence: CanonicalFileContentProof;
}

export type LocalMutationTransaction =
  | (LocalMutationTransactionBase & { readonly mutationKind: "create"; readonly expectedTarget: Extract<LocalTargetPreState, { readonly status: "expected-absent" }> })
  | (LocalMutationTransactionBase & { readonly mutationKind: "replace"; readonly expectedTarget: Extract<LocalTargetPreState, { readonly status: "expected-present" }> });

export type LocalTransactionResult =
  | { readonly status: "staged-verified" | "committed" | "recovered"; readonly transaction: LocalMutationTransaction; readonly resultingObservationToken?: ObservationToken }
  | { readonly status: "stale" | "blocked" | "outcome-unknown"; readonly reason: string; readonly transaction: LocalMutationTransaction; readonly operationalFailure?: OperationalFailureProvenance };

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

export function localTransactionBackupExpectation(transaction: LocalMutationTransaction): "backup-not-required" | "backup-required-if-target-displaced" {
  return transaction.mutationKind === "create" ? "backup-not-required" : "backup-required-if-target-displaced";
}

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
  "after-intent-persist-before-dispatch-authority",
  "after-dispatch-authority-before-mutation-call",
  "after-mutation-call-before-response",
  "after-remote-response-before-effect-verification",
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

export type KnownSemanticStateValidationIssueCode =
  | "active-device-missing"
  | "duplicate-base-path"
  | "duplicate-remote-object-mapping"
  | "mapping-base-disagreement"
  | "base-tombstone-overlap"
  | "journal-reference-incomplete"
  | "ingestion-checkpoint-inconsistent";

export type SemanticStateValidationIssueCode = KnownSemanticStateValidationIssueCode | "other-semantic-inconsistency";

export interface SemanticStateValidationIssue {
  readonly code: SemanticStateValidationIssueCode;
  readonly path?: VaultPath;
  readonly detail: string;
  readonly invariantCategory?: string;
}
export interface SemanticStateValidator<TState> { validate(state: TState): readonly SemanticStateValidationIssue[]; }

export interface SynchronizationAuthorityMetadata {
  readonly persistenceRevision: PersistenceRevision;
  readonly semanticGeneration: SemanticStateGeneration;
  readonly learnedRemoteBatches: readonly DurableRemoteChangeBatch[];
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

export interface SynchronizationAuthorityStore<TState extends SynchronizationAuthorityMetadata> {
  loadAuthority(): Promise<SynchronizationAuthorityLoadResult<TState>>;
  saveAuthority(state: TState, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration?: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult>;
  commitBaseTransition(transition: AuthoritativeBaseTransition, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult>;
}
