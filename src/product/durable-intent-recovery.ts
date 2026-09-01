import {
  contractId,
  folderCreateDescriptorIsSelfConsistent,
  verifyLocalFolderCreate,
  verifyRemoteFolderCreate,
  type CanonicalFileContentProof,
  type ContentEvidence,
  type LocalFolderCreateObservation,
  type LocalMutationTransaction,
  type LocalTransactionalMutationPort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type PlannedOperation,
  type RecoverableMutationEffectV1_1,
  type RecoverableOperationIntentV1_1,
  type RecoverablePhysicalMutationDescriptorV1_1,
  type RemoteEntry,
  type RemoteFolderCreateRecoveryReadPort,
  type RemoteObjectId,
  type StateLoadContext,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthorityStoreV1_1,
  type SynchronizationStateStore,
  type TrustedSynchronizationState,
  type VaultPath,
  type VerifiedExecutionReceipt,
} from "../contracts";
import { StateCommitCoordinator } from "../core/commit-coordinator";
import { sha256Text } from "../util/sha256";
import { DurableEffectLifecycleCoordinator, type PhysicalEffectDispatchResult } from "./operation-isolation";
import type { ProductSynchronizationExecutor } from "./production-executor";

export interface DurableIntentRecoveryDependencies {
  readonly localTransactionalMutationPort?: LocalTransactionalMutationPort;
  readonly remoteFolderCreateRecoveryReadPort?: RemoteFolderCreateRecoveryReadPort;
}

export type DurableIntentRecoveryResult =
  | { readonly status: "recovered"; readonly changed: boolean; readonly recoveredCount: number; readonly retiredCount: number }
  | { readonly status: "recovery-required"; readonly reason: string };

export interface ReconstructedDurableRecovery {
  readonly operation: PlannedOperation;
  readonly receipt: VerifiedExecutionReceipt;
}

type LegacyReads = {
  readonly local: LocalVaultPort;
  readonly drive: {
    listForReconciliation(rootId: RemoteObjectId): Promise<{ readonly ok: true; readonly value: { readonly entries: readonly RemoteEntry[]; readonly completeness: { readonly status: string } } } | { readonly ok: false; readonly signal: unknown }>;
  };
};

type VerifiedIntentState = {
  readonly intent: RecoverableOperationIntentV1_1;
  readonly canonical: TrustedSynchronizationState;
  readonly remoteEntries: readonly RemoteEntry[];
};

const cid = <T extends string>(value: string) => contractId<T>(value);
const reads = (legacy: ProductSynchronizationExecutor) => legacy as unknown as LegacyReads;
const physicalStages = new Set(["dispatch-authorized", "outcome-unknown", "effect-verified", "state-committed"]);

function evidenceRef(prefix: string, value: unknown): string {
  return `${prefix}:${String(sha256Text(JSON.stringify(value)))}`;
}

function contentEvidence(proof: CanonicalFileContentProof): ContentEvidence {
  return { hash: proof.hash, sizeBytes: proof.sizeBytes };
}

function sameCanonical(left: CanonicalFileContentProof | undefined, right: CanonicalFileContentProof | undefined): boolean {
  return Boolean(left && right && left.algorithm === right.algorithm && left.hash === right.hash && left.sizeBytes === right.sizeBytes);
}

function descriptorShape(descriptor: RecoverablePhysicalMutationDescriptorV1_1): unknown {
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    return mutation.kind === "reserved-file-create"
      ? {
          kind: descriptor.kind,
          targetSide: descriptor.targetSide,
          mutationKind: descriptor.mutationKind,
          targetPath: String(descriptor.targetPath),
          remoteMutation: {
            kind: mutation.kind,
            intentId: String(mutation.intentId),
            reservedRemoteObjectId: String(mutation.reservedRemoteObjectId),
            path: String(mutation.path),
            intendedContent: mutation.intendedContent,
          },
          intendedContent: descriptor.intendedContent,
        }
      : {
          kind: descriptor.kind,
          targetSide: descriptor.targetSide,
          mutationKind: descriptor.mutationKind,
          targetPath: String(descriptor.targetPath),
          remoteMutation: {
            kind: mutation.kind,
            intentId: String(mutation.intentId),
            remoteObjectId: String(mutation.remoteObjectId),
            candidateRemoteObjectId: String(mutation.candidateRemoteObjectId),
            expectedRevision: String(mutation.expectedRevision),
            path: String(mutation.path),
            updateProtocol: mutation.updateProtocol,
            intendedContent: mutation.intendedContent,
            identityAuthority: {
              generation: String(mutation.identityAuthority.generation),
              status: mutation.identityAuthority.status,
              path: String(mutation.identityAuthority.path),
              remoteObjectId: String(mutation.identityAuthority.remoteObjectId),
            },
          },
          intendedContent: descriptor.intendedContent,
        };
  }
  if (descriptor.kind === "remote-folder-create") {
    return {
      kind: descriptor.kind,
      targetSide: descriptor.targetSide,
      mutationKind: descriptor.mutationKind,
      intentId: String(descriptor.intentId),
      targetPath: String(descriptor.targetPath),
      parentRemoteObjectId: String(descriptor.parentRemoteObjectId),
      pathAuthority: {
        generation: String(descriptor.pathAuthority.generation),
        targetPath: String(descriptor.pathAuthority.targetPath),
        parentPath: String(descriptor.pathAuthority.parentPath),
        pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
        expectedTarget: descriptor.pathAuthority.expectedTarget,
      },
      remoteMutation: {
        kind: descriptor.remoteMutation.kind,
        intentId: String(descriptor.remoteMutation.intentId),
        reservedRemoteObjectId: String(descriptor.remoteMutation.reservedRemoteObjectId),
        path: String(descriptor.remoteMutation.path),
      },
    };
  }
  if (descriptor.kind === "local-file") {
    return {
      kind: descriptor.kind,
      targetSide: descriptor.targetSide,
      mutationKind: descriptor.mutationKind,
      targetPath: String(descriptor.targetPath),
      localTransactionId: String(descriptor.localTransactionId),
      intendedContent: descriptor.intendedContent,
    };
  }
  if (descriptor.kind === "local-folder-create") {
    return {
      kind: descriptor.kind,
      targetSide: descriptor.targetSide,
      mutationKind: descriptor.mutationKind,
      intentId: String(descriptor.intentId),
      targetPath: String(descriptor.targetPath),
      pathAuthority: {
        generation: String(descriptor.pathAuthority.generation),
        targetPath: String(descriptor.pathAuthority.targetPath),
        parentPath: String(descriptor.pathAuthority.parentPath),
        pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
        expectedTarget: descriptor.pathAuthority.expectedTarget,
      },
    };
  }
  if (descriptor.kind === "move") {
    return {
      kind: descriptor.kind,
      targetSide: descriptor.targetSide,
      fromPath: String(descriptor.fromPath),
      toPath: String(descriptor.toPath),
      remoteObjectId: descriptor.remoteObjectId ? String(descriptor.remoteObjectId) : undefined,
      identityAuthority: {
        generation: String(descriptor.identityAuthority.generation),
        status: descriptor.identityAuthority.status,
        path: String(descriptor.identityAuthority.path),
        remoteObjectId: String(descriptor.identityAuthority.remoteObjectId),
      },
    };
  }
  return {
    kind: descriptor.kind,
    targetSide: descriptor.targetSide,
    path: String(descriptor.path),
    remoteObjectId: descriptor.remoteObjectId ? String(descriptor.remoteObjectId) : undefined,
    baseAuthority: {
      generation: String(descriptor.baseAuthority.generation),
      path: String(descriptor.baseAuthority.path),
      fingerprint: String(descriptor.baseAuthority.fingerprint),
    },
    identityAuthority: descriptor.identityAuthority ? {
      generation: String(descriptor.identityAuthority.generation),
      status: descriptor.identityAuthority.status,
      path: String(descriptor.identityAuthority.path),
      remoteObjectId: String(descriptor.identityAuthority.remoteObjectId),
    } : undefined,
  };
}

function aggregateVerificationRef(intent: RecoverableOperationIntentV1_1): string | undefined {
  const effects = [...intent.effects].sort((a, b) => a.effectId.localeCompare(b.effectId));
  if (effects.some(effect => !physicalStages.has(effect.stage) || (effect.stage === "effect-verified" || effect.stage === "state-committed") && !effect.verificationEvidenceRef)) return undefined;
  if (effects.some(effect => effect.stage !== "effect-verified" && effect.stage !== "state-committed")) return undefined;
  return evidenceRef("durable-recovery", {
    operationId: String(intent.operationId),
    semanticGeneration: String(intent.semanticAuthority.generation),
    effects: effects.map(effect => ({
      effectId: effect.effectId,
      descriptor: descriptorShape(effect.descriptor),
      verificationEvidenceRef: effect.verificationEvidenceRef,
    })),
  });
}

function uniqueRemoteAtPath(entries: readonly RemoteEntry[], path: VaultPath, entityKind?: "file" | "folder"): RemoteEntry | undefined {
  const matches = entries.filter(entry => !entry.trashed && entry.path === path && (!entityKind || entry.entityKind === entityKind));
  return matches.length === 1 ? matches[0] : undefined;
}

function exactRemoteContent(entry: RemoteEntry | undefined, intended: CanonicalFileContentProof): boolean {
  return Boolean(entry && entry.entityKind === "file" && entry.content?.hash === intended.hash && entry.content.sizeBytes === intended.sizeBytes);
}

function findCanonicalRemoteId(state: TrustedSynchronizationState, path: VaultPath): RemoteObjectId | undefined {
  const byPath = state.remoteMappings.filter(mapping => mapping.path === path);
  return byPath.length === 1 ? byPath[0]?.remoteObjectId : undefined;
}

function entityKindFor(state: TrustedSynchronizationState, path: VaultPath, remoteObjectId?: RemoteObjectId): "file" | "folder" {
  const base = state.base.find(entry => entry.path === path);
  if (base) return base.entityKind;
  const tombstone = state.tombstones.find(entry => entry.path === path);
  if (tombstone) return tombstone.entityKind;
  const mapping = state.remoteMappings.find(entry => entry.path === path || (remoteObjectId && entry.remoteObjectId === remoteObjectId));
  return mapping?.entityKind ?? "file";
}

function validateDescriptor(intent: RecoverableOperationIntentV1_1, effect: RecoverableMutationEffectV1_1, authority: SynchronizationAuthorityMetadataV1_1): string | undefined {
  const descriptor = effect.descriptor;
  if (!effect.effectId || !descriptor || !physicalStages.has(effect.stage) && effect.stage !== "intent-persisted") return "durable effect stage/descriptor is malformed";
  if (intent.semanticAuthority.generation !== authority.semanticGeneration) return "persisted intent belongs to stale semantic authority";

  if (descriptor.kind === "remote-file") {
    if (descriptor.targetPath !== descriptor.remoteMutation.path || !sameCanonical(descriptor.intendedContent, descriptor.remoteMutation.intendedContent)) return "REMOTE file descriptor contradicts persisted mutation identity/content";
    if (descriptor.remoteMutation.intentId !== intent.intentId) return "REMOTE file descriptor intent identity is inconsistent";
    if (descriptor.remoteMutation.kind === "reserved-file-create") {
      if (descriptor.mutationKind !== "create") return "REMOTE file create descriptor has incompatible mutation kind";
    } else {
      if (descriptor.mutationKind !== "update") return "REMOTE file update descriptor has incompatible mutation kind";
      if (descriptor.remoteMutation.updateProtocol !== "immutable-candidate-preservation") return "REMOTE update descriptor lacks immutable-candidate preservation authority";
      if (descriptor.remoteMutation.identityAuthority.generation !== intent.semanticAuthority.generation
        || descriptor.remoteMutation.identityAuthority.path !== descriptor.targetPath
        || descriptor.remoteMutation.identityAuthority.remoteObjectId !== descriptor.remoteMutation.remoteObjectId) return "REMOTE update descriptor identity authority contradicts persisted mutation identity";
    }
    return undefined;
  }
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") {
    if (!folderCreateDescriptorIsSelfConsistent(descriptor)) return "folder-create durable descriptor is internally inconsistent";
    if (descriptor.intentId !== intent.intentId || descriptor.pathAuthority.generation !== intent.semanticAuthority.generation) return "folder-create descriptor semantic authority is inconsistent";
    return undefined;
  }
  if (descriptor.kind === "local-file") {
    const tx = authority.localTransactions.filter(transaction => transaction.transactionId === descriptor.localTransactionId && transaction.operationId === intent.operationId);
    if (tx.length !== 1 || !sameCanonical(tx[0]?.expectedNewEvidence, descriptor.intendedContent) || tx[0]?.path !== descriptor.targetPath || tx[0]?.mutationKind !== descriptor.mutationKind) return "LOCAL file descriptor lacks one exact matching durable transaction authority";
    return undefined;
  }
  if (descriptor.kind === "move") {
    if (descriptor.identityAuthority.generation !== intent.semanticAuthority.generation
      || descriptor.identityAuthority.path !== descriptor.fromPath
      || (descriptor.remoteObjectId && descriptor.remoteObjectId !== descriptor.identityAuthority.remoteObjectId)) return "move descriptor identity authority is contradictory";
    return undefined;
  }
  if (descriptor.baseAuthority.generation !== intent.semanticAuthority.generation || descriptor.baseAuthority.path !== descriptor.path) return "trash descriptor BASE authority is contradictory";
  if (descriptor.targetSide === "remote") {
    if (!descriptor.remoteObjectId || !descriptor.identityAuthority
      || descriptor.identityAuthority.generation !== intent.semanticAuthority.generation
      || descriptor.identityAuthority.path !== descriptor.path
      || descriptor.identityAuthority.remoteObjectId !== descriptor.remoteObjectId) return "REMOTE trash descriptor identity authority is contradictory";
  }
  return undefined;
}

function validateIntent(intent: RecoverableOperationIntentV1_1, authority: SynchronizationAuthorityMetadataV1_1): string | undefined {
  if (!intent.effects.length) return "durable operation intent contains no physical effects";
  if (intent.logicalKind === "single-effect" && intent.effects.length !== 1) return "single-effect durable intent contains multiple effects";
  if (intent.logicalKind === "clean-text-merge" && intent.effects.length < 2) return "clean merge durable intent is missing required effects";
  const ids = new Set<string>();
  for (const effect of intent.effects) {
    if (ids.has(effect.effectId)) return "durable operation intent contains duplicate effect identity";
    ids.add(effect.effectId);
    const invalid = validateDescriptor(intent, effect, authority);
    if (invalid) return invalid;
  }
  if (intent.effects.some(effect => effect.stage === "intent-persisted") && intent.effects.some(effect => effect.stage !== "intent-persisted")) {
    return "durable operation intent mixes unattempted and physically progressed effects";
  }
  return undefined;
}

function durableContent(intent: RecoverableOperationIntentV1_1): CanonicalFileContentProof | undefined | null {
  const proofs = intent.effects.flatMap(effect => {
    const descriptor = effect.descriptor;
    return descriptor.kind === "remote-file" || descriptor.kind === "local-file" ? [descriptor.intendedContent] : [];
  });
  if (!proofs.length) return undefined;
  const first = proofs[0]!;
  return proofs.every(proof => sameCanonical(first, proof)) ? first : null;
}

function durableRemoteIdentity(
  intent: RecoverableOperationIntentV1_1,
  canonical: TrustedSynchronizationState,
  remoteEntries: readonly RemoteEntry[],
): { readonly resulting?: RemoteObjectId; readonly predecessor?: RemoteObjectId } | undefined {
  const remoteDescriptor = intent.effects.map(effect => effect.descriptor).find(descriptor => descriptor.targetSide === "remote");
  if (remoteDescriptor?.kind === "remote-file") {
    return remoteDescriptor.remoteMutation.kind === "reserved-file-create"
      ? { resulting: remoteDescriptor.remoteMutation.reservedRemoteObjectId }
      : { resulting: remoteDescriptor.remoteMutation.candidateRemoteObjectId, predecessor: remoteDescriptor.remoteMutation.remoteObjectId };
  }
  if (remoteDescriptor?.kind === "remote-folder-create") return { resulting: remoteDescriptor.remoteMutation.reservedRemoteObjectId };
  if (remoteDescriptor?.kind === "move") return { resulting: remoteDescriptor.remoteObjectId ?? remoteDescriptor.identityAuthority.remoteObjectId };
  if (remoteDescriptor?.kind === "trash") return { resulting: remoteDescriptor.remoteObjectId };

  const descriptor = intent.effects[0]?.descriptor;
  if (!descriptor) return undefined;
  const path = descriptor.kind === "move" ? descriptor.toPath : descriptor.kind === "trash" ? descriptor.path : descriptor.kind === "local-file" || descriptor.kind === "local-folder-create" ? descriptor.targetPath : undefined;
  if (!path) return {};
  const kind = descriptor.kind === "local-folder-create" ? "folder" : undefined;
  const observed = uniqueRemoteAtPath(remoteEntries, path, kind);
  const mapped = findCanonicalRemoteId(canonical, path);
  if (observed && mapped && observed.remoteObjectId !== mapped) return undefined;
  return { resulting: observed?.remoteObjectId ?? mapped };
}

export function reconstructDurableRecovery(
  intent: RecoverableOperationIntentV1_1,
  canonical: TrustedSynchronizationState,
  remoteEntries: readonly RemoteEntry[],
): ReconstructedDurableRecovery | undefined {
  if (!intent.effects.every(effect => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) return undefined;
  const aggregate = aggregateVerificationRef(intent);
  if (!aggregate) return undefined;
  const proof = durableContent(intent);
  if (proof === null) return undefined;
  const identity = durableRemoteIdentity(intent, canonical, remoteEntries);
  if (!identity) return undefined;

  const first = intent.effects[0]?.descriptor;
  if (!first) return undefined;
  let operation: PlannedOperation;

  if (intent.logicalKind === "clean-text-merge") {
    const locals = intent.effects.filter(effect => effect.descriptor.kind === "local-file");
    const remotes = intent.effects.filter(effect => effect.descriptor.kind === "remote-file");
    if (locals.length !== 1 || remotes.length !== 1 || remotes[0]?.descriptor.kind !== "remote-file" || remotes[0].descriptor.remoteMutation.kind !== "existing-file-content-update" || !proof) return undefined;
    const remote = remotes[0].descriptor;
    if (locals[0]?.descriptor.kind !== "local-file" || locals[0].descriptor.targetPath !== remote.targetPath) return undefined;
    operation = {
      operationId: intent.operationId,
      kind: "clean-text-merge",
      path: remote.targetPath,
      targetSide: "remote",
      remoteObjectId: remote.remoteMutation.remoteObjectId,
      contentVersion: { path: remote.targetPath, entityKind: "file", content: contentEvidence(proof) },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized clean merge from durable physical descriptors." }],
    };
  } else if (first.kind === "remote-file") {
    if (!proof) return undefined;
    operation = first.mutationKind === "create"
      ? {
          operationId: intent.operationId,
          kind: "upload-create",
          path: first.targetPath,
          targetSide: "remote",
          contentVersion: { path: first.targetPath, entityKind: "file", content: contentEvidence(proof) },
          destructive: false,
          preconditions: [],
          reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE file create." }],
        }
      : first.remoteMutation.kind === "existing-file-content-update"
        ? {
            operationId: intent.operationId,
            kind: "upload-update",
            path: first.targetPath,
            targetSide: "remote",
            remoteObjectId: first.remoteMutation.remoteObjectId,
            contentVersion: { path: first.targetPath, entityKind: "file", content: contentEvidence(proof) },
            destructive: false,
            preconditions: [],
            reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE file update." }],
          }
        : undefined as never;
  } else if (first.kind === "remote-folder-create") {
    operation = {
      operationId: intent.operationId,
      kind: "upload-create",
      path: first.targetPath,
      targetSide: "remote",
      contentVersion: { path: first.targetPath, entityKind: "folder" },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE folder create." }],
    };
  } else if (first.kind === "local-file") {
    if (!proof || !identity.resulting) return undefined;
    operation = {
      operationId: intent.operationId,
      kind: first.mutationKind === "create" ? "download-create" : "download-update",
      path: first.targetPath,
      targetSide: "local",
      remoteObjectId: identity.resulting,
      contentVersion: { path: first.targetPath, entityKind: "file", remoteObjectId: identity.resulting, content: contentEvidence(proof) },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized LOCAL file mutation." }],
    };
  } else if (first.kind === "local-folder-create") {
    if (!identity.resulting) return undefined;
    operation = {
      operationId: intent.operationId,
      kind: "download-create",
      path: first.targetPath,
      targetSide: "local",
      remoteObjectId: identity.resulting,
      contentVersion: { path: first.targetPath, entityKind: "folder", remoteObjectId: identity.resulting },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized LOCAL folder create." }],
    };
  } else if (first.kind === "move") {
    const remoteObjectId = first.remoteObjectId ?? first.identityAuthority.remoteObjectId;
    operation = {
      operationId: intent.operationId,
      kind: "identity-preserving-move",
      path: first.fromPath,
      targetSide: first.targetSide,
      fromPath: first.fromPath,
      toPath: first.toPath,
      remoteObjectId,
      contentVersion: canonical.base.find(entry => entry.path === first.fromPath || entry.path === first.toPath)?.content
        ? { path: first.toPath, entityKind: entityKindFor(canonical, first.fromPath, remoteObjectId), content: canonical.base.find(entry => entry.path === first.fromPath || entry.path === first.toPath)?.content, remoteObjectId }
        : { path: first.toPath, entityKind: entityKindFor(canonical, first.fromPath, remoteObjectId), remoteObjectId },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized identity-preserving move." }],
    };
  } else {
    const remoteObjectId = first.remoteObjectId ?? (first.targetSide === "local" ? findCanonicalRemoteId(canonical, first.path) : undefined);
    operation = {
      operationId: intent.operationId,
      kind: first.targetSide === "remote" ? "trash-remote" : "trash-local",
      path: first.path,
      targetSide: first.targetSide,
      remoteObjectId,
      destructive: true,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized trash operation." }],
    };
  }

  if (!operation) return undefined;
  return {
    operation,
    receipt: {
      operationId: intent.operationId,
      durable: true,
      integrityVerified: true,
      ...(proof ? { evidence: contentEvidence(proof) } : {}),
      ...(identity.resulting ? { resultingRemoteObjectId: identity.resulting } : {}),
      verificationEvidenceRef: aggregate,
    },
  };
}

function exactContentMatches(actual: TrustedSynchronizationState["base"][number]["content"], expected: VerifiedExecutionReceipt["evidence"]): boolean {
  if (!expected) return true;
  return Boolean(actual && (!expected.hash || actual.hash === expected.hash) && (expected.sizeBytes === undefined || actual.sizeBytes === expected.sizeBytes));
}

function exactCanonicalCommitAlreadyApplied(state: TrustedSynchronizationState, operation: PlannedOperation, receipt: VerifiedExecutionReceipt): boolean {
  if (!receipt.verificationEvidenceRef) return false;
  const journal = state.operations.find(entry => entry.operationId === operation.operationId);
  if (!journal || journal.status !== "completed" || journal.path !== operation.path || journal.verificationEvidenceRef !== receipt.verificationEvidenceRef) return false;
  const resultingRemoteObjectId = receipt.resultingRemoteObjectId ?? operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;

  if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
    const entries = state.base.filter(entry => entry.path === operation.path);
    if (entries.length !== 1) return false;
    const entry = entries[0]!;
    const entityKind = operation.contentVersion?.entityKind ?? entry.entityKind;
    const localOnlyConflictCopy = operation.kind === "download-create" && operation.contentVersion !== undefined && operation.path !== operation.contentVersion.path;
    if (entry.entityKind !== entityKind || entry.localExisted !== true || entry.remoteExisted !== !localOnlyConflictCopy || !exactContentMatches(entry.content, receipt.evidence)) return false;
    if (localOnlyConflictCopy) return entry.remoteObjectId === undefined && state.remoteMappings.every(mapping => mapping.path !== operation.path);
    if (!resultingRemoteObjectId || entry.remoteObjectId !== resultingRemoteObjectId) return false;
    const byPath = state.remoteMappings.filter(mapping => mapping.path === operation.path);
    const byId = state.remoteMappings.filter(mapping => mapping.remoteObjectId === resultingRemoteObjectId);
    return byPath.length === 1 && byId.length === 1 && byPath[0]?.remoteObjectId === resultingRemoteObjectId && byId[0]?.path === operation.path && byPath[0]?.entityKind === entityKind;
  }
  if (operation.kind === "identity-preserving-move" && operation.fromPath && operation.toPath) {
    if (!resultingRemoteObjectId || state.base.some(entry => entry.path === operation.fromPath) || state.remoteMappings.some(mapping => mapping.path === operation.fromPath)) return false;
    const targetBase = state.base.filter(entry => entry.path === operation.toPath);
    const targetMapping = state.remoteMappings.filter(mapping => mapping.path === operation.toPath || mapping.remoteObjectId === resultingRemoteObjectId);
    return targetBase.length === 1 && targetBase[0]?.remoteObjectId === resultingRemoteObjectId && targetMapping.length === 1 && targetMapping[0]?.path === operation.toPath && targetMapping[0]?.remoteObjectId === resultingRemoteObjectId;
  }
  if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (state.base.some(entry => entry.path === operation.path) || state.remoteMappings.some(mapping => mapping.path === operation.path)) return false;
    const expectedDeletedOn = operation.kind === "trash-remote" ? "local" : "remote";
    const tombstones = state.tombstones.filter(entry => entry.path === operation.path && entry.deletedOn === expectedDeletedOn);
    return tombstones.length === 1 && (!resultingRemoteObjectId || tombstones[0]?.remoteObjectId === resultingRemoteObjectId);
  }
  return false;
}

async function completeRemoteListing(legacy: ProductSynchronizationExecutor, remote: ManagedRemoteIdentity): Promise<readonly RemoteEntry[] | undefined> {
  const listed = await reads(legacy).drive.listForReconciliation(remote.rootId);
  return listed.ok && listed.value.completeness.status === "complete" ? listed.value.entries.filter(entry => !entry.trashed) : undefined;
}

async function observeConvergence(
  legacy: ProductSynchronizationExecutor,
  descriptor: RecoverablePhysicalMutationDescriptorV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<PhysicalEffectDispatchResult> {
  if (descriptor.kind === "remote-folder-create") {
    if (!dependencies.remoteFolderCreateRecoveryReadPort) return { status: "outcome-unknown", reason: "RemoteFolderCreateRecoveryReadPort unavailable during durable recovery" };
    const observed = await dependencies.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(descriptor);
    const verified = verifyRemoteFolderCreate(descriptor, observed);
    return verified.status === "verified-effect"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-folder", verified.proof) }
      : verified;
  }
  if (descriptor.kind === "local-folder-create") {
    const observed = await reads(legacy).local.observe(descriptor.targetPath);
    const folderObservation: LocalFolderCreateObservation = observed.status === "present" && observed.entityKind === "folder" && observed.observationToken
      ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed.observationToken }
      : observed.status === "absent"
        ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey }
        : observed.status === "present"
          ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed.entityKind }
          : { status: "unobservable", reason: "LOCAL folder observation incomplete during durable recovery" };
    const verified = verifyLocalFolderCreate(descriptor, folderObservation);
    return verified.status === "verified-effect"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-folder", verified.proof) }
      : verified;
  }
  if (descriptor.kind === "local-file") {
    const observed = await reads(legacy).local.observe(descriptor.targetPath);
    return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === descriptor.intendedContent.hash && observed.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-file", descriptorShape(descriptor)) }
      : { status: "outcome-unknown", reason: "LOCAL file does not currently prove the persisted intended content" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([reads(legacy).local.observe(descriptor.fromPath), reads(legacy).local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-move", descriptorShape(descriptor)) }
      : { status: "outcome-unknown", reason: "LOCAL move physical reality is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await reads(legacy).local.observe(descriptor.path)).status === "absent"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-trash", descriptorShape(descriptor)) }
      : { status: "outcome-unknown", reason: "LOCAL trash target remains present" };
  }

  const entries = await completeRemoteListing(legacy, remote);
  if (!entries) return { status: "outcome-unknown", reason: "complete current REMOTE listing unavailable during durable recovery" };
  if (descriptor.kind === "remote-file") {
    const expected = descriptor.remoteMutation.kind === "reserved-file-create" ? descriptor.remoteMutation.reservedRemoteObjectId : descriptor.remoteMutation.candidateRemoteObjectId;
    const match = uniqueRemoteAtPath(entries, descriptor.targetPath, "file");
    return match?.remoteObjectId === expected && exactRemoteContent(match, descriptor.intendedContent)
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-file", { descriptor: descriptorShape(descriptor), remoteObjectId: String(match.remoteObjectId), content: match.content }) }
      : { status: "outcome-unknown", reason: "REMOTE file physical reality does not prove the persisted identity/content without ambiguity" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const expected = descriptor.remoteObjectId ?? descriptor.identityAuthority.remoteObjectId;
    const destination = uniqueRemoteAtPath(entries, descriptor.toPath);
    const source = entries.filter(entry => entry.path === descriptor.fromPath && entry.remoteObjectId === expected);
    return destination?.remoteObjectId === expected && source.length === 0
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-move", descriptorShape(descriptor)) }
      : { status: "outcome-unknown", reason: "REMOTE move physical reality is not uniquely converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    const byId = entries.filter(entry => entry.remoteObjectId === descriptor.remoteObjectId);
    const byPath = entries.filter(entry => entry.path === descriptor.path);
    return byId.length === 0 && byPath.length === 0
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-trash", descriptorShape(descriptor)) }
      : { status: "outcome-unknown", reason: "REMOTE trash physical reality is absent by ID only incompletely or logical path is reoccupied" };
  }
  return { status: "outcome-unknown", reason: "unsupported durable recovery descriptor" };
}

async function recoverLocalTransaction(
  lifecycle: DurableEffectLifecycleCoordinator,
  intent: RecoverableOperationIntentV1_1,
  effect: RecoverableMutationEffectV1_1,
  authority: SynchronizationAuthorityMetadataV1_1,
  legacy: ProductSynchronizationExecutor,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<PhysicalEffectDispatchResult> {
  if (effect.descriptor.kind !== "local-file") return observeConvergence(legacy, effect.descriptor, { rootId: cid<"RemoteObjectId">("unused") as RemoteObjectId } as ManagedRemoteIdentity, dependencies);
  if (!dependencies.localTransactionalMutationPort) return { status: "outcome-unknown", reason: "LocalTransactionalMutationPort unavailable during durable recovery" };
  const tx = authority.localTransactions.find(transaction => transaction.transactionId === effect.descriptor.localTransactionId && transaction.operationId === intent.operationId);
  if (!tx) return { status: "outcome-unknown", reason: "LOCAL durable transaction is missing during recovery" };
  const recovered = await dependencies.localTransactionalMutationPort.recover(tx);
  const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
  if (persisted.status !== "persisted") return { status: "outcome-unknown", reason: "LOCAL transaction recovery progress could not be persisted" };
  if (recovered.status !== "recovered" && recovered.status !== "committed") return { status: "outcome-unknown", reason: "LOCAL transaction recovery did not establish a recovered result" };
  const observed = await reads(legacy).local.observe(effect.descriptor.targetPath);
  return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === effect.descriptor.intendedContent.hash && observed.content.sizeBytes === effect.descriptor.intendedContent.sizeBytes
    ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-file", { transactionId: String(tx.transactionId), descriptor: descriptorShape(effect.descriptor) }) }
    : { status: "outcome-unknown", reason: "LOCAL recovered transaction does not prove persisted intended content" };
}

async function finalizeEffects(lifecycle: DurableEffectLifecycleCoordinator, intent: RecoverableOperationIntentV1_1): Promise<string | undefined> {
  for (const effect of intent.effects) {
    if (effect.stage === "state-committed") continue;
    if (effect.stage !== "effect-verified" || !effect.verificationEvidenceRef) return `durable effect ${effect.effectId} cannot finalize from ${effect.stage}`;
    const finalized = await lifecycle.markEffectStateCommitted(String(intent.operationId), effect.effectId, effect.verificationEvidenceRef);
    if (finalized.status !== "state-committed") return `durable effect ${effect.effectId} state finalization failed (${finalized.status})`;
  }
  return undefined;
}

async function recoverIntent(
  intent: RecoverableOperationIntentV1_1,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  stateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  legacy: ProductSynchronizationExecutor,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<{ readonly status: "recovered"; readonly changed: boolean; readonly retired: boolean } | { readonly status: "recovery-required"; readonly reason: string }> {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  let authorityLoad = await lifecycle.loadAuthority();
  if (authorityLoad.status !== "trusted") return authorityLoad;
  const current = authorityLoad.state.operationIntents.find(candidate => candidate.operationId === intent.operationId);
  if (!current) return { status: "recovered", changed: false, retired: false };
  const invalid = validateIntent(current, authorityLoad.state);
  if (invalid) return { status: "recovery-required", reason: invalid };

  if (current.effects.every(effect => effect.stage === "state-committed")) return { status: "recovered", changed: false, retired: false };
  if (current.effects.every(effect => effect.stage === "intent-persisted")) {
    const retired = await lifecycle.retireUnattemptedIntent(String(current.operationId));
    return retired.status === "persisted"
      ? { status: "recovered", changed: true, retired: true }
      : { status: "recovery-required", reason: `unattempted durable intent could not be retired (${retired.status})` };
  }

  for (const effect of current.effects) {
    if (effect.stage === "state-committed" || effect.stage === "effect-verified") continue;
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") return { status: "recovery-required", reason: `unsupported outstanding durable stage ${effect.stage}` };
    const physical = effect.descriptor.kind === "local-file"
      ? await recoverLocalTransaction(lifecycle, current, effect, authorityLoad.state, legacy, dependencies)
      : await observeConvergence(legacy, effect.descriptor, remote, dependencies);
    const recorded = await lifecycle.recordPhysicalResult(String(current.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && recorded.status !== "already-progressed") {
      return { status: "recovery-required", reason: `physical reality for durable effect ${effect.effectId} remains unresolved (${recorded.status}${"reason" in recorded ? `: ${recorded.reason}` : ""})` };
    }
  }

  authorityLoad = await lifecycle.loadAuthority();
  if (authorityLoad.status !== "trusted") return authorityLoad;
  const recovered = authorityLoad.state.operationIntents.find(candidate => candidate.operationId === current.operationId);
  if (!recovered) return { status: "recovery-required", reason: "durable intent disappeared during recovery" };
  const invalidAfter = validateIntent(recovered, authorityLoad.state);
  if (invalidAfter) return { status: "recovery-required", reason: invalidAfter };
  if (!recovered.effects.every(effect => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) {
    return { status: "recovery-required", reason: "not every durable physical effect reached verified authority" };
  }

  const canonicalLoad = await stateStore.load(stateContext);
  if (canonicalLoad.status !== "trusted") return { status: "recovery-required", reason: "trusted canonical state unavailable during durable-intent recovery" };
  const remoteEntries = await completeRemoteListing(legacy, remote);
  if (!remoteEntries) return { status: "recovery-required", reason: "complete REMOTE observation unavailable for durable receipt reconstruction" };
  const reconstructed = reconstructDurableRecovery(recovered, canonicalLoad.state, remoteEntries);
  if (!reconstructed) return { status: "recovery-required", reason: "durable physical descriptors cannot reconstruct one unambiguous verified recovery receipt" };

  const anyCommitted = recovered.effects.some(effect => effect.stage === "state-committed");
  const alreadyCanonical = exactCanonicalCommitAlreadyApplied(canonicalLoad.state, reconstructed.operation, reconstructed.receipt);
  if (anyCommitted && !alreadyCanonical) return { status: "recovery-required", reason: "state-committed durable marker lacks exact canonical commit proof" };

  if (!alreadyCanonical) {
    const committed = await new StateCommitCoordinator(stateStore, stateContext).commitVerifiedSuccess(reconstructed.operation, reconstructed.receipt, canonicalLoad.state.stateRevision);
    if (committed.status === "stale-state") return { status: "recovery-required", reason: "canonical state changed during durable recovery; verified physical evidence was preserved" };
    if (committed.status !== "committed") return { status: "recovery-required", reason: committed.reason };
  }

  const latestAuthority = await lifecycle.loadAuthority();
  if (latestAuthority.status !== "trusted") return latestAuthority;
  const latestIntent = latestAuthority.state.operationIntents.find(candidate => candidate.operationId === recovered.operationId);
  if (!latestIntent) return { status: "recovery-required", reason: "durable intent missing before state finalization" };
  const finalizationFailure = await finalizeEffects(lifecycle, latestIntent);
  if (finalizationFailure) return { status: "recovery-required", reason: finalizationFailure };
  return { status: "recovered", changed: true, retired: false };
}

/**
 * Production restart entry. Outstanding durable physical intent is drained from
 * persistence before the current planner is allowed to decide new work. It never
 * invokes create/update/move/trash dispatch methods; dispatch-authorized and
 * outcome-unknown are classified only by current physical observation/recovery.
 */
export async function recoverOutstandingDurableIntents(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  stateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies = {},
): Promise<DurableIntentRecoveryResult> {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  const loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  let changed = false;
  let recoveredCount = 0;
  let retiredCount = 0;
  for (const snapshot of loaded.state.operationIntents) {
    const result = await recoverIntent(snapshot, authorityStore, stateStore, stateContext, legacy, remote, dependencies);
    if (result.status !== "recovered") return result;
    if (result.changed) changed = true;
    if (result.retired) retiredCount += 1;
    else if (result.changed) recoveredCount += 1;
  }
  return { status: "recovered", changed, recoveredCount, retiredCount };
}
