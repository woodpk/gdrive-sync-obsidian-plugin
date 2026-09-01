import {
  contractId,
  folderCreateDescriptorIsSelfConsistent,
  verifyLocalFolderCreate,
  verifyRemoteFolderCreate,
  type CanonicalFileContentProof,
  type ContentEvidence,
  type GoogleDrivePort,
  type LocalFolderCreateObservation,
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

type LegacyReads = { readonly local: LocalVaultPort; readonly drive: Pick<GoogleDrivePort, "listForReconciliation"> };
const legacyReads = (legacy: ProductSynchronizationExecutor) => legacy as unknown as LegacyReads;
const physicalStages = new Set(["dispatch-authorized", "outcome-unknown", "effect-verified", "state-committed"]);

function evidenceRef(prefix: string, value: unknown): string {
  return `${prefix}:${String(sha256Text(JSON.stringify(value)))}`;
}
function asEvidence(value: CanonicalFileContentProof): ContentEvidence { return { hash: value.hash, sizeBytes: value.sizeBytes }; }
function sameContent(a: CanonicalFileContentProof | undefined, b: CanonicalFileContentProof | undefined): boolean {
  return Boolean(a && b && a.algorithm === b.algorithm && a.hash === b.hash && a.sizeBytes === b.sizeBytes);
}
function uniqueRemote(entries: readonly RemoteEntry[], path: VaultPath, kind?: "file" | "folder"): RemoteEntry | undefined {
  const matches = entries.filter(entry => !entry.trashed && entry.path === path && (!kind || entry.entityKind === kind));
  return matches.length === 1 ? matches[0] : undefined;
}
function currentMappedRemoteId(state: TrustedSynchronizationState, path: VaultPath): RemoteObjectId | undefined {
  const matches = state.remoteMappings.filter(mapping => mapping.path === path);
  return matches.length === 1 ? matches[0]?.remoteObjectId : undefined;
}
function entityKind(state: TrustedSynchronizationState, path: VaultPath, remoteId?: RemoteObjectId): "file" | "folder" {
  return state.base.find(entry => entry.path === path)?.entityKind
    ?? state.tombstones.find(entry => entry.path === path)?.entityKind
    ?? state.remoteMappings.find(mapping => mapping.path === path || (remoteId !== undefined && mapping.remoteObjectId === remoteId))?.entityKind
    ?? "file";
}
function intendedContent(intent: RecoverableOperationIntentV1_1): CanonicalFileContentProof | undefined | null {
  const values = intent.effects.flatMap(effect => {
    const descriptor = effect.descriptor;
    return descriptor.kind === "remote-file" || descriptor.kind === "local-file" ? [descriptor.intendedContent] : [];
  });
  if (!values.length) return undefined;
  return values.every(value => sameContent(values[0], value)) ? values[0] : null;
}

function validateDescriptor(intent: RecoverableOperationIntentV1_1, effect: RecoverableMutationEffectV1_1, authority: SynchronizationAuthorityMetadataV1_1): string | undefined {
  const descriptor = effect.descriptor;
  if (!effect.effectId || (!physicalStages.has(effect.stage) && effect.stage !== "intent-persisted")) return "durable effect stage or identity is malformed";
  if (intent.semanticAuthority.generation !== authority.semanticGeneration) return "persisted intent belongs to stale semantic authority";

  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    if (descriptor.targetPath !== mutation.path || !sameContent(descriptor.intendedContent, mutation.intendedContent) || mutation.intentId !== intent.intentId) {
      return "REMOTE file descriptor contradicts persisted mutation identity/content";
    }
    if (mutation.kind === "reserved-file-create") return descriptor.mutationKind === "create" ? undefined : "REMOTE file create descriptor has incompatible mutation kind";
    if (descriptor.mutationKind !== "update" || mutation.updateProtocol !== "immutable-candidate-preservation") return "REMOTE update descriptor lacks immutable-candidate authority";
    if (mutation.identityAuthority.generation !== intent.semanticAuthority.generation || mutation.identityAuthority.path !== descriptor.targetPath || mutation.identityAuthority.remoteObjectId !== mutation.remoteObjectId) {
      return "REMOTE update descriptor identity authority is contradictory";
    }
    return undefined;
  }
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") {
    if (!folderCreateDescriptorIsSelfConsistent(descriptor)) return "folder-create durable descriptor is internally inconsistent";
    return descriptor.intentId === intent.intentId && descriptor.pathAuthority.generation === intent.semanticAuthority.generation
      ? undefined
      : "folder-create descriptor semantic authority is inconsistent";
  }
  if (descriptor.kind === "local-file") {
    const matches = authority.localTransactions.filter(tx => tx.transactionId === descriptor.localTransactionId && tx.operationId === intent.operationId);
    const tx = matches[0];
    return matches.length === 1 && tx?.path === descriptor.targetPath && tx.mutationKind === descriptor.mutationKind && sameContent(tx.expectedNewEvidence, descriptor.intendedContent)
      ? undefined
      : "LOCAL file descriptor lacks one exact matching durable transaction authority";
  }
  if (descriptor.kind === "move") {
    return descriptor.identityAuthority.generation === intent.semanticAuthority.generation
      && descriptor.identityAuthority.path === descriptor.fromPath
      && (!descriptor.remoteObjectId || descriptor.remoteObjectId === descriptor.identityAuthority.remoteObjectId)
      ? undefined
      : "move descriptor identity authority is contradictory";
  }
  if (descriptor.baseAuthority.generation !== intent.semanticAuthority.generation || descriptor.baseAuthority.path !== descriptor.path) return "trash descriptor BASE authority is contradictory";
  if (descriptor.targetSide === "remote") {
    if (!descriptor.remoteObjectId || !descriptor.identityAuthority || descriptor.identityAuthority.generation !== intent.semanticAuthority.generation || descriptor.identityAuthority.path !== descriptor.path || descriptor.identityAuthority.remoteObjectId !== descriptor.remoteObjectId) {
      return "REMOTE trash descriptor identity authority is contradictory";
    }
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
  if (intent.effects.some(effect => effect.stage === "intent-persisted") && intent.effects.some(effect => effect.stage !== "intent-persisted")) return "durable operation intent mixes unattempted and physically progressed effects";
  if (intendedContent(intent) === null) return "durable operation intent contains contradictory persisted content authority";
  return undefined;
}

function aggregateVerificationRef(intent: RecoverableOperationIntentV1_1): string | undefined {
  if (!intent.effects.every(effect => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) return undefined;
  const effects = [...intent.effects].sort((a, b) => a.effectId.localeCompare(b.effectId));
  return evidenceRef("durable-recovery", {
    operationId: String(intent.operationId),
    semanticGeneration: String(intent.semanticAuthority.generation),
    effects: effects.map(effect => ({ effectId: effect.effectId, descriptor: effect.descriptor, verificationEvidenceRef: effect.verificationEvidenceRef })),
  });
}

function remoteIdentity(intent: RecoverableOperationIntentV1_1, canonical: TrustedSynchronizationState, entries: readonly RemoteEntry[]): { resulting?: RemoteObjectId; predecessor?: RemoteObjectId } | undefined {
  const remote = intent.effects.map(effect => effect.descriptor).find(descriptor => descriptor.targetSide === "remote");
  if (remote?.kind === "remote-file") {
    const mutation = remote.remoteMutation;
    return mutation.kind === "reserved-file-create"
      ? { resulting: mutation.reservedRemoteObjectId }
      : { resulting: mutation.candidateRemoteObjectId, predecessor: mutation.remoteObjectId };
  }
  if (remote?.kind === "remote-folder-create") return { resulting: remote.remoteMutation.reservedRemoteObjectId };
  if (remote?.kind === "move") return { resulting: remote.remoteObjectId ?? remote.identityAuthority.remoteObjectId };
  if (remote?.kind === "trash") return { resulting: remote.remoteObjectId };

  const descriptor = intent.effects[0]?.descriptor;
  if (!descriptor) return undefined;
  const path = descriptor.kind === "local-file" || descriptor.kind === "local-folder-create" ? descriptor.targetPath
    : descriptor.kind === "move" ? descriptor.toPath
      : descriptor.kind === "trash" ? descriptor.path
        : undefined;
  if (!path) return {};
  const observed = uniqueRemote(entries, path, descriptor.kind === "local-folder-create" ? "folder" : undefined);
  const mapped = currentMappedRemoteId(canonical, path);
  if (observed && mapped && observed.remoteObjectId !== mapped) return undefined;
  return { resulting: observed?.remoteObjectId ?? mapped };
}

export function reconstructDurableRecovery(intent: RecoverableOperationIntentV1_1, canonical: TrustedSynchronizationState, entries: readonly RemoteEntry[]): ReconstructedDurableRecovery | undefined {
  const aggregate = aggregateVerificationRef(intent);
  const content = intendedContent(intent);
  const identity = remoteIdentity(intent, canonical, entries);
  if (!aggregate || content === null || !identity) return undefined;
  const first = intent.effects[0]?.descriptor;
  if (!first) return undefined;
  let operation: PlannedOperation | undefined;

  if (intent.logicalKind === "clean-text-merge") {
    const localEffects = intent.effects.filter(effect => effect.descriptor.kind === "local-file");
    const remoteEffects = intent.effects.filter(effect => effect.descriptor.kind === "remote-file");
    const local = localEffects[0]?.descriptor;
    const remote = remoteEffects[0]?.descriptor;
    if (!content || localEffects.length !== 1 || remoteEffects.length !== 1 || local?.kind !== "local-file" || remote?.kind !== "remote-file" || remote.remoteMutation.kind !== "existing-file-content-update" || local.targetPath !== remote.targetPath) return undefined;
    operation = {
      operationId: intent.operationId, kind: "clean-text-merge", path: remote.targetPath, targetSide: "remote",
      remoteObjectId: remote.remoteMutation.remoteObjectId,
      contentVersion: { path: remote.targetPath, entityKind: "file", content: asEvidence(content) }, destructive: false,
      preconditions: [], reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized clean merge from durable descriptors." }],
    };
  } else if (first.kind === "remote-file") {
    if (!content) return undefined;
    const mutation = first.remoteMutation;
    if (mutation.kind === "reserved-file-create") {
      operation = {
        operationId: intent.operationId, kind: "upload-create", path: first.targetPath, targetSide: "remote",
        contentVersion: { path: first.targetPath, entityKind: "file", content: asEvidence(content) }, destructive: false,
        preconditions: [], reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE file create." }],
      };
    } else {
      operation = {
        operationId: intent.operationId, kind: "upload-update", path: first.targetPath, targetSide: "remote", remoteObjectId: mutation.remoteObjectId,
        contentVersion: { path: first.targetPath, entityKind: "file", content: asEvidence(content) }, destructive: false,
        preconditions: [], reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE file update." }],
      };
    }
  } else if (first.kind === "remote-folder-create") {
    operation = {
      operationId: intent.operationId, kind: "upload-create", path: first.targetPath, targetSide: "remote",
      contentVersion: { path: first.targetPath, entityKind: "folder" }, destructive: false, preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE folder create." }],
    };
  } else if (first.kind === "local-file") {
    if (!content || !identity.resulting) return undefined;
    operation = {
      operationId: intent.operationId, kind: first.mutationKind === "create" ? "download-create" : "download-update", path: first.targetPath, targetSide: "local", remoteObjectId: identity.resulting,
      contentVersion: { path: first.targetPath, entityKind: "file", remoteObjectId: identity.resulting, content: asEvidence(content) }, destructive: false, preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized LOCAL file mutation." }],
    };
  } else if (first.kind === "local-folder-create") {
    if (!identity.resulting) return undefined;
    operation = {
      operationId: intent.operationId, kind: "download-create", path: first.targetPath, targetSide: "local", remoteObjectId: identity.resulting,
      contentVersion: { path: first.targetPath, entityKind: "folder", remoteObjectId: identity.resulting }, destructive: false, preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized LOCAL folder create." }],
    };
  } else if (first.kind === "move") {
    const remoteObjectId = first.remoteObjectId ?? first.identityAuthority.remoteObjectId;
    const kind = entityKind(canonical, first.fromPath, remoteObjectId);
    const base = canonical.base.find(entry => entry.path === first.fromPath || entry.path === first.toPath);
    operation = {
      operationId: intent.operationId, kind: "identity-preserving-move", path: first.fromPath, targetSide: first.targetSide,
      fromPath: first.fromPath, toPath: first.toPath, remoteObjectId,
      contentVersion: { path: first.toPath, entityKind: kind, remoteObjectId, ...(base?.content ? { content: base.content } : {}) },
      destructive: false, preconditions: [], reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized identity-preserving move." }],
    };
  } else {
    const rid = first.remoteObjectId ?? (first.targetSide === "local" ? currentMappedRemoteId(canonical, first.path) : undefined);
    operation = {
      operationId: intent.operationId, kind: first.targetSide === "remote" ? "trash-remote" : "trash-local", path: first.path, targetSide: first.targetSide,
      ...(rid ? { remoteObjectId: rid } : {}), destructive: true, preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized trash operation." }],
    };
  }

  return {
    operation,
    receipt: {
      operationId: intent.operationId, durable: true, integrityVerified: true,
      ...(content ? { evidence: asEvidence(content) } : {}),
      ...(identity.resulting ? { resultingRemoteObjectId: identity.resulting } : {}),
      verificationEvidenceRef: aggregate,
    },
  };
}

function exactContent(actual: TrustedSynchronizationState["base"][number]["content"], expected: VerifiedExecutionReceipt["evidence"]): boolean {
  return !expected || Boolean(actual && (!expected.hash || actual.hash === expected.hash) && (expected.sizeBytes === undefined || actual.sizeBytes === expected.sizeBytes));
}
function exactCanonicalCommit(state: TrustedSynchronizationState, operation: PlannedOperation, receipt: VerifiedExecutionReceipt): boolean {
  if (!receipt.verificationEvidenceRef) return false;
  const journal = state.operations.find(entry => entry.operationId === operation.operationId);
  if (!journal || journal.status !== "completed" || journal.path !== operation.path || journal.verificationEvidenceRef !== receipt.verificationEvidenceRef) return false;
  const rid = receipt.resultingRemoteObjectId ?? operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
  if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
    const base = state.base.filter(entry => entry.path === operation.path);
    if (base.length !== 1 || base[0]?.entityKind !== operation.contentVersion?.entityKind || !exactContent(base[0]?.content, receipt.evidence)) return false;
    if (!rid || base[0]?.remoteObjectId !== rid) return false;
    const byPath = state.remoteMappings.filter(mapping => mapping.path === operation.path);
    const byId = state.remoteMappings.filter(mapping => mapping.remoteObjectId === rid);
    return byPath.length === 1 && byId.length === 1 && byPath[0]?.remoteObjectId === rid && byId[0]?.path === operation.path;
  }
  if (operation.kind === "identity-preserving-move" && operation.fromPath && operation.toPath) {
    if (!rid || state.base.some(entry => entry.path === operation.fromPath) || state.remoteMappings.some(mapping => mapping.path === operation.fromPath)) return false;
    return state.base.filter(entry => entry.path === operation.toPath && entry.remoteObjectId === rid).length === 1
      && state.remoteMappings.filter(mapping => mapping.path === operation.toPath && mapping.remoteObjectId === rid).length === 1;
  }
  if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (state.base.some(entry => entry.path === operation.path) || state.remoteMappings.some(mapping => mapping.path === operation.path)) return false;
    const deletedOn = operation.kind === "trash-remote" ? "local" : "remote";
    return state.tombstones.filter(entry => entry.path === operation.path && entry.deletedOn === deletedOn && (!rid || entry.remoteObjectId === rid)).length === 1;
  }
  return false;
}

async function remoteEntries(legacy: ProductSynchronizationExecutor, remote: ManagedRemoteIdentity): Promise<readonly RemoteEntry[] | undefined> {
  const listed = await legacyReads(legacy).drive.listForReconciliation(remote.rootId);
  return listed.ok && listed.value.completeness.status === "complete" ? listed.value.entries.filter(entry => !entry.trashed) : undefined;
}

async function observePersistedEffect(legacy: ProductSynchronizationExecutor, descriptor: RecoverablePhysicalMutationDescriptorV1_1, remote: ManagedRemoteIdentity, deps: DurableIntentRecoveryDependencies): Promise<PhysicalEffectDispatchResult> {
  if (descriptor.kind === "remote-folder-create") {
    if (!deps.remoteFolderCreateRecoveryReadPort) return { status: "outcome-unknown", reason: "RemoteFolderCreateRecoveryReadPort unavailable during durable recovery" };
    const result = verifyRemoteFolderCreate(descriptor, await deps.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(descriptor));
    return result.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-folder", result.proof) } : result;
  }
  if (descriptor.kind === "local-folder-create") {
    const observed = await legacyReads(legacy).local.observe(descriptor.targetPath);
    const view: LocalFolderCreateObservation = observed.status === "present" && observed.entityKind === "folder" && observed.observationToken
      ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed.observationToken }
      : observed.status === "absent"
        ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey }
        : observed.status === "present"
          ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed.entityKind }
          : { status: "unobservable", reason: "LOCAL folder observation incomplete during durable recovery" };
    const result = verifyLocalFolderCreate(descriptor, view);
    return result.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-folder", result.proof) } : result;
  }
  if (descriptor.kind === "local-file") {
    const observed = await legacyReads(legacy).local.observe(descriptor.targetPath);
    return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === descriptor.intendedContent.hash && observed.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-file", descriptor) }
      : { status: "outcome-unknown", reason: "LOCAL file does not prove persisted intended content" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([legacyReads(legacy).local.observe(descriptor.fromPath), legacyReads(legacy).local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-move", descriptor) }
      : { status: "outcome-unknown", reason: "LOCAL move physical reality is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await legacyReads(legacy).local.observe(descriptor.path)).status === "absent"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-trash", descriptor) }
      : { status: "outcome-unknown", reason: "LOCAL trash target remains present" };
  }
  const entries = await remoteEntries(legacy, remote);
  if (!entries) return { status: "outcome-unknown", reason: "complete REMOTE listing unavailable during durable recovery" };
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    const rid = mutation.kind === "reserved-file-create" ? mutation.reservedRemoteObjectId : mutation.candidateRemoteObjectId;
    const match = uniqueRemote(entries, descriptor.targetPath, "file");
    return match?.remoteObjectId === rid && match.content?.hash === descriptor.intendedContent.hash && match.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-file", { descriptor, observed: match }) }
      : { status: "outcome-unknown", reason: "REMOTE file does not prove persisted identity/content without ambiguity" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const rid = descriptor.remoteObjectId ?? descriptor.identityAuthority.remoteObjectId;
    const target = uniqueRemote(entries, descriptor.toPath);
    return target?.remoteObjectId === rid && !entries.some(entry => entry.path === descriptor.fromPath && entry.remoteObjectId === rid)
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-move", descriptor) }
      : { status: "outcome-unknown", reason: "REMOTE move is not uniquely converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return !entries.some(entry => entry.remoteObjectId === descriptor.remoteObjectId) && !entries.some(entry => entry.path === descriptor.path)
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-trash", descriptor) }
      : { status: "outcome-unknown", reason: "REMOTE trash is not proven by exact ID/path absence" };
  }
  return { status: "outcome-unknown", reason: "unsupported durable recovery descriptor" };
}

async function recoverLocalFile(lifecycle: DurableEffectLifecycleCoordinator, intent: RecoverableOperationIntentV1_1, effect: RecoverableMutationEffectV1_1, authority: SynchronizationAuthorityMetadataV1_1, legacy: ProductSynchronizationExecutor, deps: DurableIntentRecoveryDependencies): Promise<PhysicalEffectDispatchResult> {
  const descriptor = effect.descriptor;
  if (descriptor.kind !== "local-file") return { status: "outcome-unknown", reason: "LOCAL file recovery invoked for non-file descriptor" };
  if (!deps.localTransactionalMutationPort) return { status: "outcome-unknown", reason: "LocalTransactionalMutationPort unavailable during durable recovery" };
  const tx = authority.localTransactions.find(value => value.transactionId === descriptor.localTransactionId && value.operationId === intent.operationId);
  if (!tx) return { status: "outcome-unknown", reason: "LOCAL durable transaction missing during recovery" };
  const recovered = await deps.localTransactionalMutationPort.recover(tx);
  const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
  if (persisted.status !== "persisted") return { status: "outcome-unknown", reason: "LOCAL transaction recovery progress could not be persisted" };
  if (recovered.status !== "recovered" && recovered.status !== "committed") return { status: "outcome-unknown", reason: "LOCAL transaction recovery did not establish completion" };
  const observed = await legacyReads(legacy).local.observe(descriptor.targetPath);
  return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === descriptor.intendedContent.hash && observed.content.sizeBytes === descriptor.intendedContent.sizeBytes
    ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-file", { transactionId: String(tx.transactionId), descriptor }) }
    : { status: "outcome-unknown", reason: "LOCAL recovered transaction does not prove persisted intended content" };
}

async function finalizeIntent(lifecycle: DurableEffectLifecycleCoordinator, intent: RecoverableOperationIntentV1_1): Promise<string | undefined> {
  for (const effect of intent.effects) {
    if (effect.stage === "state-committed") continue;
    if (effect.stage !== "effect-verified" || !effect.verificationEvidenceRef) return `durable effect ${effect.effectId} cannot finalize from ${effect.stage}`;
    const result = await lifecycle.markEffectStateCommitted(String(intent.operationId), effect.effectId, effect.verificationEvidenceRef);
    if (result.status !== "state-committed") return `durable effect ${effect.effectId} finalization failed (${result.status})`;
  }
  return undefined;
}

async function recoverOne(snapshot: RecoverableOperationIntentV1_1, legacy: ProductSynchronizationExecutor, authorityStore: SynchronizationAuthorityStoreV1_1, stateStore: SynchronizationStateStore, stateContext: StateLoadContext, remote: ManagedRemoteIdentity, deps: DurableIntentRecoveryDependencies): Promise<{ status: "recovered"; changed: boolean; retired: boolean } | { status: "recovery-required"; reason: string }> {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  let authority = await lifecycle.loadAuthority();
  if (authority.status !== "trusted") return authority;
  const intent = authority.state.operationIntents.find(value => value.operationId === snapshot.operationId);
  if (!intent) return { status: "recovered", changed: false, retired: false };
  const invalid = validateIntent(intent, authority.state);
  if (invalid) return { status: "recovery-required", reason: invalid };
  if (intent.effects.every(effect => effect.stage === "state-committed")) return { status: "recovered", changed: false, retired: false };
  if (intent.effects.every(effect => effect.stage === "intent-persisted")) {
    const retired = await lifecycle.retireUnattemptedIntent(String(intent.operationId));
    return retired.status === "persisted" ? { status: "recovered", changed: true, retired: true } : { status: "recovery-required", reason: `unattempted intent could not be retired (${retired.status})` };
  }

  for (const effect of intent.effects) {
    if (effect.stage === "state-committed" || effect.stage === "effect-verified") continue;
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") return { status: "recovery-required", reason: `unsupported outstanding durable stage ${effect.stage}` };
    const physical = effect.descriptor.kind === "local-file"
      ? await recoverLocalFile(lifecycle, intent, effect, authority.state, legacy, deps)
      : await observePersistedEffect(legacy, effect.descriptor, remote, deps);
    const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && recorded.status !== "already-progressed") {
      return { status: "recovery-required", reason: `durable effect ${effect.effectId} remains unresolved (${recorded.status}${"reason" in recorded ? `: ${recorded.reason}` : ""})` };
    }
  }

  authority = await lifecycle.loadAuthority();
  if (authority.status !== "trusted") return authority;
  const verified = authority.state.operationIntents.find(value => value.operationId === intent.operationId);
  if (!verified) return { status: "recovery-required", reason: "durable intent disappeared during recovery" };
  const invalidVerified = validateIntent(verified, authority.state);
  if (invalidVerified) return { status: "recovery-required", reason: invalidVerified };
  if (!verified.effects.every(effect => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) return { status: "recovery-required", reason: "not every durable physical effect reached verified authority" };

  const canonical = await stateStore.load(stateContext);
  if (canonical.status !== "trusted") return { status: "recovery-required", reason: "trusted canonical state unavailable during durable recovery" };
  const entries = await remoteEntries(legacy, remote);
  if (!entries) return { status: "recovery-required", reason: "complete REMOTE observation unavailable for durable receipt reconstruction" };
  const reconstructed = reconstructDurableRecovery(verified, canonical.state, entries);
  if (!reconstructed) return { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" };

  const priorCommit = exactCanonicalCommit(canonical.state, reconstructed.operation, reconstructed.receipt);
  if (verified.effects.some(effect => effect.stage === "state-committed") && !priorCommit) return { status: "recovery-required", reason: "state-committed durable marker lacks exact canonical commit proof" };
  if (!priorCommit) {
    const commit = await new StateCommitCoordinator(stateStore, stateContext).commitVerifiedSuccess(reconstructed.operation, reconstructed.receipt, canonical.state.stateRevision);
    if (commit.status === "stale-state") return { status: "recovery-required", reason: "canonical state changed during recovery; verified physical evidence remains durable" };
    if (commit.status !== "committed") return { status: "recovery-required", reason: commit.reason };
  }

  const latest = await lifecycle.loadAuthority();
  if (latest.status !== "trusted") return latest;
  const latestIntent = latest.state.operationIntents.find(value => value.operationId === verified.operationId);
  if (!latestIntent) return { status: "recovery-required", reason: "durable intent missing before finalization" };
  const failed = await finalizeIntent(lifecycle, latestIntent);
  return failed ? { status: "recovery-required", reason: failed } : { status: "recovered", changed: true, retired: false };
}

/** Drain persisted physical work before current planning. No mutation dispatch method is called here. */
export async function recoverOutstandingDurableIntents(legacy: ProductSynchronizationExecutor, authorityStore: SynchronizationAuthorityStoreV1_1, stateStore: SynchronizationStateStore, stateContext: StateLoadContext, remote: ManagedRemoteIdentity, deps: DurableIntentRecoveryDependencies = {}): Promise<DurableIntentRecoveryResult> {
  const loaded = await new DurableEffectLifecycleCoordinator(authorityStore).loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  let changed = false;
  let recoveredCount = 0;
  let retiredCount = 0;
  for (const snapshot of loaded.state.operationIntents) {
    const result = await recoverOne(snapshot, legacy, authorityStore, stateStore, stateContext, remote, deps);
    if (result.status !== "recovered") return result;
    changed ||= result.changed;
    if (result.retired) retiredCount += 1;
    else if (result.changed) recoveredCount += 1;
  }
  return { status: "recovered", changed, recoveredCount, retiredCount };
}
