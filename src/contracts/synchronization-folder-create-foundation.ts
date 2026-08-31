import type {
  EntityKind,
  MutationIntentId,
  ObservationToken,
  OperationId,
  PersistenceRevision,
  RemoteObjectId,
  SemanticStateGeneration,
  VaultPath,
} from "./common";
import {
  restartRecoveryDirective,
  type AuthoritativeBaseTransition,
  type DurableRemoteChangeBatch,
  type LocalMutationTransaction,
  type PathConvergenceState,
  type RecoverableOperationStage,
  type RecoverablePhysicalMutationDescriptor,
  type RemoteMutationIdentity,
  type RestartRecoveryDirective,
  type SemanticAuthorityReference,
  type SemanticStateValidationIssue,
  type SynchronizationAuthoritySaveResult,
} from "./synchronization-foundation";

/**
 * Additive Phase 6 v1.1 folder-create recovery contract.
 *
 * The pre-v1.1 RecoverablePhysicalMutationDescriptor and synchronization
 * authority metadata/store remain compatibility surfaces for already-reviewed
 * file/move/trash behavior. New or resumed v1.1 synchronization code must use
 * the v1.1 descriptor, metadata, and store surfaces below so empty-folder
 * creation participates in the same durable mutation lifecycle without a
 * sidecar or worker-local authority contract.
 */
export interface FolderCreatePathAuthority extends SemanticAuthorityReference {
  readonly targetPath: VaultPath;
  readonly parentPath: VaultPath;
  /** Stable platform-normalized comparison key used to detect path collisions. */
  readonly pathComparisonKey: string;
  readonly expectedTarget: "absent";
}

export interface LocalFolderCreatePhysicalMutationDescriptor {
  readonly kind: "local-folder-create";
  readonly targetSide: "local";
  readonly mutationKind: "create";
  readonly intentId: MutationIntentId;
  readonly targetPath: VaultPath;
  readonly pathAuthority: FolderCreatePathAuthority;
}

export interface RemoteFolderCreatePhysicalMutationDescriptor {
  readonly kind: "remote-folder-create";
  readonly targetSide: "remote";
  readonly mutationKind: "create";
  readonly intentId: MutationIntentId;
  readonly targetPath: VaultPath;
  readonly parentRemoteObjectId: RemoteObjectId;
  readonly pathAuthority: FolderCreatePathAuthority;
  /** Reserved Drive identity must be durable before dispatch and reused after restart. */
  readonly remoteMutation: Extract<RemoteMutationIdentity, { readonly kind: "reserved-folder-create" }>;
}

export type FolderCreatePhysicalMutationDescriptor =
  | LocalFolderCreatePhysicalMutationDescriptor
  | RemoteFolderCreatePhysicalMutationDescriptor;

/** Authoritative v1.1 physical descriptor family. */
export type RecoverablePhysicalMutationDescriptorV1_1 =
  | RecoverablePhysicalMutationDescriptor
  | FolderCreatePhysicalMutationDescriptor;

export interface RecoverableMutationEffectV1_1 {
  readonly effectId: string;
  readonly descriptor: RecoverablePhysicalMutationDescriptorV1_1;
  readonly stage: RecoverableOperationStage;
  readonly verificationEvidenceRef?: string;
}

export type RecoverableOperationIntentV1_1 =
  | {
      readonly logicalKind: "single-effect";
      readonly operationId: OperationId;
      readonly intentId: MutationIntentId;
      readonly semanticAuthority: SemanticAuthorityReference;
      readonly effects: readonly [RecoverableMutationEffectV1_1];
    }
  | {
      readonly logicalKind: "clean-text-merge";
      readonly operationId: OperationId;
      readonly intentId: MutationIntentId;
      readonly semanticAuthority: SemanticAuthorityReference;
      readonly effects: readonly [RecoverableMutationEffectV1_1, RecoverableMutationEffectV1_1, ...RecoverableMutationEffectV1_1[]];
    };

/**
 * Canonical authoritative metadata for new/resumed phase6-sync-foundation-v1.1
 * synchronization. Unlike the v1 compatibility metadata, this surface can
 * durably carry folder-create intents through save/load/restart.
 */
export interface SynchronizationAuthorityMetadataV1_1 {
  readonly persistenceRevision: PersistenceRevision;
  readonly semanticGeneration: SemanticStateGeneration;
  readonly learnedRemoteBatches: readonly DurableRemoteChangeBatch[];
  readonly pathConvergence: readonly { readonly path: VaultPath; readonly state: PathConvergenceState }[];
  readonly operationIntents: readonly RecoverableOperationIntentV1_1[];
  readonly localTransactions: readonly LocalMutationTransaction[];
}

export type SynchronizationAuthorityLoadResultV1_1<TState extends SynchronizationAuthorityMetadataV1_1> =
  | { readonly status: "trusted"; readonly state: TState }
  | { readonly status: "uninitialized" }
  | { readonly status: "recovery-required"; readonly issues: readonly SemanticStateValidationIssue[] };

/**
 * Frozen authority persistence seam for v1.1. Workstreams C and D exchange
 * folder-capable state only through this contract; no sidecar or shadow store
 * is required or permitted.
 */
export interface SynchronizationAuthorityStoreV1_1<
  TState extends SynchronizationAuthorityMetadataV1_1 = SynchronizationAuthorityMetadataV1_1,
> {
  loadAuthority(): Promise<SynchronizationAuthorityLoadResultV1_1<TState>>;
  saveAuthority(
    state: TState,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult>;
  commitBaseTransition(
    transition: AuthoritativeBaseTransition,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult>;
}

export interface RecoverableEffectRestartDirectiveV1_1 {
  readonly effectId: string;
  readonly directive: RestartRecoveryDirective;
}

/** Shared restart classification for every effect in a folder-capable v1.1 operation. */
export function recoverableOperationV1_1RestartRecoveryDirectives(
  intent: RecoverableOperationIntentV1_1,
): readonly RecoverableEffectRestartDirectiveV1_1[] {
  return intent.effects.map(effect => ({
    effectId: effect.effectId,
    directive: restartRecoveryDirective(effect),
  }));
}

/** Shared logical completion rule: every required physical effect must be state-committed. */
export function recoverableOperationV1_1IsComplete(intent: RecoverableOperationIntentV1_1): boolean {
  return intent.effects.every(effect => effect.stage === "state-committed");
}

export type LocalFolderCreateObservation =
  | {
      readonly status: "authoritative-absent";
      readonly targetPath: VaultPath;
      readonly pathComparisonKey: string;
    }
  | {
      readonly status: "folder";
      readonly targetPath: VaultPath;
      readonly pathComparisonKey: string;
      readonly observationToken: ObservationToken;
    }
  | {
      readonly status: "occupied";
      readonly targetPath: VaultPath;
      readonly pathComparisonKey: string;
      readonly entityKind: EntityKind;
    }
  | { readonly status: "unobservable"; readonly reason: string };

export type RemoteFolderCreateObservation =
  | {
      readonly status: "authoritative-absent";
      readonly reservedRemoteObjectId: RemoteObjectId;
    }
  | {
      readonly status: "folder";
      readonly targetPath: VaultPath;
      readonly pathComparisonKey: string;
      readonly remoteObjectId: RemoteObjectId;
      readonly parentRemoteObjectId: RemoteObjectId;
    }
  | {
      readonly status: "occupied";
      readonly targetPath: VaultPath;
      readonly pathComparisonKey: string;
      readonly remoteObjectId: RemoteObjectId;
      readonly entityKind: EntityKind;
    }
  | { readonly status: "unobservable"; readonly reason: string };

export type FolderCreateVerificationProof =
  | {
      readonly kind: "local-folder-create";
      readonly targetPath: VaultPath;
      readonly pathComparisonKey: string;
      readonly entityKind: "folder";
      readonly observationToken: ObservationToken;
    }
  | {
      readonly kind: "remote-folder-create";
      readonly targetPath: VaultPath;
      readonly pathComparisonKey: string;
      readonly entityKind: "folder";
      readonly remoteObjectId: RemoteObjectId;
      readonly parentRemoteObjectId: RemoteObjectId;
      readonly reservedRemoteObjectId: RemoteObjectId;
    };

export type FolderCreateRecoveryOutcome =
  | { readonly status: "verified-effect"; readonly proof: FolderCreateVerificationProof }
  | { readonly status: "verified-not-applied"; readonly reason: string }
  | { readonly status: "conflict-preserved"; readonly reason: string }
  | { readonly status: "outcome-unknown"; readonly reason: string };

export function folderCreateDescriptorIsSelfConsistent(descriptor: FolderCreatePhysicalMutationDescriptor): boolean {
  if (descriptor.targetPath !== descriptor.pathAuthority.targetPath) return false;
  if (descriptor.kind === "remote-folder-create") {
    return descriptor.intentId === descriptor.remoteMutation.intentId
      && descriptor.targetPath === descriptor.remoteMutation.path;
  }
  return true;
}

export function verifyLocalFolderCreate(
  descriptor: LocalFolderCreatePhysicalMutationDescriptor,
  observation: LocalFolderCreateObservation,
): FolderCreateRecoveryOutcome {
  if (!folderCreateDescriptorIsSelfConsistent(descriptor)) {
    return { status: "outcome-unknown", reason: "folder-create-descriptor-inconsistent" };
  }
  if (observation.status === "unobservable") {
    return { status: "outcome-unknown", reason: observation.reason };
  }
  if (observation.targetPath !== descriptor.targetPath
    || observation.pathComparisonKey !== descriptor.pathAuthority.pathComparisonKey) {
    return { status: "conflict-preserved", reason: "local-folder-path-authority-mismatch" };
  }
  if (observation.status === "authoritative-absent") {
    return { status: "verified-not-applied", reason: "authoritative-local-absence" };
  }
  if (observation.status === "occupied" && observation.entityKind !== "folder") {
    return { status: "conflict-preserved", reason: "local-folder-path-occupied-incompatibly" };
  }
  if (observation.status === "occupied") {
    return { status: "conflict-preserved", reason: "local-folder-object-not-proven-as-intended-effect" };
  }
  return {
    status: "verified-effect",
    proof: {
      kind: "local-folder-create",
      targetPath: observation.targetPath,
      pathComparisonKey: observation.pathComparisonKey,
      entityKind: "folder",
      observationToken: observation.observationToken,
    },
  };
}

export function verifyRemoteFolderCreate(
  descriptor: RemoteFolderCreatePhysicalMutationDescriptor,
  observation: RemoteFolderCreateObservation,
): FolderCreateRecoveryOutcome {
  if (!folderCreateDescriptorIsSelfConsistent(descriptor)) {
    return { status: "outcome-unknown", reason: "folder-create-descriptor-inconsistent" };
  }
  if (observation.status === "unobservable") {
    return { status: "outcome-unknown", reason: observation.reason };
  }
  const reservedRemoteObjectId = descriptor.remoteMutation.reservedRemoteObjectId;
  if (observation.status === "authoritative-absent") {
    return observation.reservedRemoteObjectId === reservedRemoteObjectId
      ? { status: "verified-not-applied", reason: "reserved-remote-folder-authoritatively-absent" }
      : { status: "outcome-unknown", reason: "remote-absence-did-not-check-reserved-identity" };
  }
  if (observation.targetPath !== descriptor.targetPath
    || observation.pathComparisonKey !== descriptor.pathAuthority.pathComparisonKey) {
    return { status: "conflict-preserved", reason: "remote-folder-path-authority-mismatch" };
  }
  if (observation.status === "occupied") {
    return { status: "conflict-preserved", reason: "remote-folder-logical-path-occupied-by-non-authoritative-object" };
  }
  if (observation.remoteObjectId !== reservedRemoteObjectId
    || observation.parentRemoteObjectId !== descriptor.parentRemoteObjectId) {
    return { status: "conflict-preserved", reason: "remote-folder-identity-or-parent-mismatch" };
  }
  return {
    status: "verified-effect",
    proof: {
      kind: "remote-folder-create",
      targetPath: observation.targetPath,
      pathComparisonKey: observation.pathComparisonKey,
      entityKind: "folder",
      remoteObjectId: observation.remoteObjectId,
      parentRemoteObjectId: observation.parentRemoteObjectId,
      reservedRemoteObjectId,
    },
  };
}

/** Folder effects use the same durable dispatch-stage restart semantics as every other mutation. */
export function folderCreateRestartRecoveryDirective(
  effect: Pick<RecoverableMutationEffectV1_1, "stage" | "verificationEvidenceRef">,
): RestartRecoveryDirective {
  return restartRecoveryDirective(effect);
}

/** Physical existence is not authoritative synchronization commit authority. */
export function folderCreateEligibleForAuthoritativeCommit(
  outcome: FolderCreateRecoveryOutcome,
  pathConvergence: PathConvergenceState,
): boolean {
  return outcome.status === "verified-effect" && pathConvergence.status === "converged";
}
