import {
  folderCreateDescriptorIsSelfConsistent,
  verifyLocalFolderCreate,
  verifyRemoteFolderCreate,
  type CanonicalFileContentProof,
  type GoogleDrivePort,
  type LocalFolderCreateObservation,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type OperationId,
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
  type VaultPath,
  type VerifiedExecutionReceipt,
} from "../contracts";
import { sha256Text } from "../util/sha256";
import { DurableEffectLifecycleCoordinator, type PhysicalEffectDispatchResult } from "./operation-isolation";
import {
  recoverOutstandingDurableIntents as recoverBaseOutstandingDurableIntents,
  reconstructDurableRecovery,
  type DurableIntentRecoveryDependencies,
  type DurableIntentRecoveryResult,
  type ReconstructedDurableRecovery,
} from "./durable-intent-recovery-base";
import type { ProductSynchronizationExecutor } from "./production-executor";

export { reconstructDurableRecovery } from "./durable-intent-recovery-base";
export type { DurableIntentRecoveryDependencies, DurableIntentRecoveryResult, ReconstructedDurableRecovery } from "./durable-intent-recovery-base";

export type DurableIntentVerifiedRecoveryResult =
  | { readonly status: "verified"; readonly receipt: VerifiedExecutionReceipt }
  | { readonly status: "retired" }
  | { readonly status: "recovery-required"; readonly reason: string };

type RecoveryReads = { readonly local: LocalVaultPort; readonly drive: Pick<GoogleDrivePort, "listForReconciliation"> };
const reads = (legacy: ProductSynchronizationExecutor) => legacy as unknown as RecoveryReads;

function evidenceRef(prefix: string, value: unknown): string {
  return `${prefix}:${String(sha256Text(JSON.stringify(value)))}`;
}

function sameContent(left: CanonicalFileContentProof | undefined, right: CanonicalFileContentProof | undefined): boolean {
  return Boolean(left && right && left.algorithm === right.algorithm && left.hash === right.hash && left.sizeBytes === right.sizeBytes);
}

function uniqueRemote(entries: readonly RemoteEntry[], path: VaultPath, kind?: "file" | "folder"): RemoteEntry | undefined {
  const matches = entries.filter(entry => !entry.trashed && entry.path === path && (!kind || entry.entityKind === kind));
  return matches.length === 1 ? matches[0] : undefined;
}

async function completeEntries(legacy: ProductSynchronizationExecutor, remote: ManagedRemoteIdentity): Promise<readonly RemoteEntry[] | undefined> {
  const result = await reads(legacy).drive.listForReconciliation(remote.rootId);
  return result.ok && result.value.completeness.status === "complete" ? result.value.entries.filter(entry => !entry.trashed) : undefined;
}

function validateDescriptor(
  intent: RecoverableOperationIntentV1_1,
  effect: RecoverableMutationEffectV1_1,
  authority: SynchronizationAuthorityMetadataV1_1,
): string | undefined {
  const descriptor = effect.descriptor;
  if (!effect.effectId) return "durable effect identity is malformed";
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    if (descriptor.targetPath !== mutation.path || mutation.intentId !== intent.intentId || !sameContent(descriptor.intendedContent, mutation.intendedContent)) {
      return "REMOTE file descriptor contradicts persisted mutation identity/content";
    }
    if (mutation.kind === "reserved-file-create") return descriptor.mutationKind === "create" ? undefined : "REMOTE file create descriptor has incompatible mutation kind";
    if (descriptor.mutationKind !== "update" || mutation.updateProtocol !== "immutable-candidate-preservation") return "REMOTE update descriptor lacks immutable-candidate authority";
    if (mutation.identityAuthority.status !== "unique"
      || mutation.identityAuthority.generation !== intent.semanticAuthority.generation
      || mutation.identityAuthority.path !== descriptor.targetPath
      || mutation.identityAuthority.remoteObjectId !== mutation.remoteObjectId) return "REMOTE update descriptor identity authority is contradictory";
    return undefined;
  }
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") {
    if (!folderCreateDescriptorIsSelfConsistent(descriptor)) return "folder-create durable descriptor is internally inconsistent";
    return descriptor.intentId === intent.intentId && descriptor.pathAuthority.generation === intent.semanticAuthority.generation
      ? undefined
      : "folder-create descriptor semantic authority is inconsistent";
  }
  if (descriptor.kind === "local-file") {
    const matches = authority.localTransactions.filter(transaction => transaction.transactionId === descriptor.localTransactionId && transaction.operationId === intent.operationId);
    const transaction = matches[0];
    return matches.length === 1
      && transaction?.path === descriptor.targetPath
      && transaction.mutationKind === descriptor.mutationKind
      && sameContent(transaction.expectedNewEvidence, descriptor.intendedContent)
      ? undefined
      : "LOCAL file descriptor lacks one exact matching durable transaction authority";
  }
  if (descriptor.kind === "move") {
    return descriptor.identityAuthority.status === "unique"
      && descriptor.identityAuthority.generation === intent.semanticAuthority.generation
      && descriptor.identityAuthority.path === descriptor.fromPath
      && (!descriptor.remoteObjectId || descriptor.remoteObjectId === descriptor.identityAuthority.remoteObjectId)
      ? undefined
      : "move descriptor identity authority is contradictory";
  }
  if (descriptor.baseAuthority.generation !== intent.semanticAuthority.generation || descriptor.baseAuthority.path !== descriptor.path) return "trash descriptor BASE authority is contradictory";
  if (descriptor.targetSide === "remote") {
    return descriptor.remoteObjectId
      && descriptor.identityAuthority?.status === "unique"
      && descriptor.identityAuthority.generation === intent.semanticAuthority.generation
      && descriptor.identityAuthority.path === descriptor.path
      && descriptor.identityAuthority.remoteObjectId === descriptor.remoteObjectId
      ? undefined
      : "REMOTE trash descriptor identity authority is contradictory";
  }
  return undefined;
}

function validateIntent(intent: RecoverableOperationIntentV1_1, authority: SynchronizationAuthorityMetadataV1_1): string | undefined {
  if (intent.semanticAuthority.generation !== authority.semanticGeneration) return "persisted durable intent belongs to stale semantic generation";
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

async function folderObservation(
  legacy: ProductSynchronizationExecutor,
  descriptor: Extract<RecoverablePhysicalMutationDescriptorV1_1, { readonly kind: "local-folder-create" | "remote-folder-create" }>,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<PhysicalEffectDispatchResult> {
  if (descriptor.kind === "remote-folder-create") {
    const reader: RemoteFolderCreateRecoveryReadPort | undefined = dependencies.remoteFolderCreateRecoveryReadPort;
    if (!reader) return { status: "outcome-unknown", reason: "RemoteFolderCreateRecoveryReadPort unavailable during durable recovery" };
    const result = verifyRemoteFolderCreate(descriptor, await reader.observeFolderCreateRecovery(descriptor));
    return result.status === "verified-effect"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-folder", result.proof) }
      : result;
  }
  const observed = await reads(legacy).local.observe(descriptor.targetPath);
  const view: LocalFolderCreateObservation = observed.status === "present" && observed.entityKind === "folder" && observed.observationToken
    ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed.observationToken }
    : observed.status === "absent"
      ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey }
      : observed.status === "present"
        ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed.entityKind }
        : { status: "unobservable", reason: "LOCAL folder observation incomplete during durable recovery" };
  const result = verifyLocalFolderCreate(descriptor, view);
  return result.status === "verified-effect"
    ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-folder", result.proof) }
    : result;
}

async function observePhysicalReality(
  legacy: ProductSynchronizationExecutor,
  lifecycle: DurableEffectLifecycleCoordinator,
  intent: RecoverableOperationIntentV1_1,
  effect: RecoverableMutationEffectV1_1,
  authority: SynchronizationAuthorityMetadataV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
  remoteEntries: () => Promise<readonly RemoteEntry[] | undefined>,
  recoverLocalTransaction: boolean,
): Promise<PhysicalEffectDispatchResult> {
  const descriptor = effect.descriptor;
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") return folderObservation(legacy, descriptor, dependencies);
  if (descriptor.kind === "local-file") {
    if (recoverLocalTransaction) {
      if (!dependencies.localTransactionalMutationPort) return { status: "outcome-unknown", reason: "LocalTransactionalMutationPort unavailable during durable recovery" };
      const transaction = authority.localTransactions.find(value => value.transactionId === descriptor.localTransactionId && value.operationId === intent.operationId);
      if (!transaction) return { status: "outcome-unknown", reason: "LOCAL durable transaction missing during recovery" };
      const recovered = await dependencies.localTransactionalMutationPort.recover(transaction);
      const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
      if (persisted.status !== "persisted") return { status: "outcome-unknown", reason: "LOCAL transaction recovery progress could not be persisted" };
      if (recovered.status !== "recovered" && recovered.status !== "committed") return { status: "outcome-unknown", reason: "LOCAL transaction recovery did not establish completion" };
    }
    const observed = await reads(legacy).local.observe(descriptor.targetPath);
    return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === descriptor.intendedContent.hash && observed.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-file", { descriptor, observed: observed.content }) }
      : { status: "outcome-unknown", reason: "LOCAL file does not prove persisted intended content" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([reads(legacy).local.observe(descriptor.fromPath), reads(legacy).local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-move", descriptor) }
      : { status: "outcome-unknown", reason: "LOCAL move physical reality is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await reads(legacy).local.observe(descriptor.path)).status === "absent"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-local-trash", descriptor) }
      : { status: "outcome-unknown", reason: "LOCAL trash target remains present" };
  }
  const entries = await remoteEntries();
  if (!entries) return { status: "outcome-unknown", reason: "complete REMOTE observation unavailable during durable recovery" };
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    const expectedId = mutation.kind === "reserved-file-create" ? mutation.reservedRemoteObjectId : mutation.candidateRemoteObjectId;
    const actual = uniqueRemote(entries, descriptor.targetPath, "file");
    return actual?.remoteObjectId === expectedId && actual.content?.hash === descriptor.intendedContent.hash && actual.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-file", { descriptor, observed: actual }) }
      : { status: "outcome-unknown", reason: "REMOTE file does not prove persisted identity/content without ambiguity" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const expectedId = descriptor.remoteObjectId ?? descriptor.identityAuthority.remoteObjectId;
    const destination = uniqueRemote(entries, descriptor.toPath);
    return destination?.remoteObjectId === expectedId && !entries.some(entry => entry.path === descriptor.fromPath && entry.remoteObjectId === expectedId)
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-move", { descriptor, destination }) }
      : { status: "outcome-unknown", reason: "REMOTE move is not uniquely converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return !entries.some(entry => entry.remoteObjectId === descriptor.remoteObjectId) && !entries.some(entry => entry.path === descriptor.path)
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("durable-recovery-remote-trash", { descriptor, exactAbsence: true }) }
      : { status: "outcome-unknown", reason: "REMOTE trash is not proven by exact ID/path absence" };
  }
  return { status: "outcome-unknown", reason: "unsupported durable recovery descriptor" };
}

async function verifyCurrentPhysicalReality(
  legacy: ProductSynchronizationExecutor,
  lifecycle: DurableEffectLifecycleCoordinator,
  intent: RecoverableOperationIntentV1_1,
  effect: RecoverableMutationEffectV1_1,
  authority: SynchronizationAuthorityMetadataV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
  cachedEntries: () => Promise<readonly RemoteEntry[] | undefined>,
): Promise<string | undefined> {
  const observed = await observePhysicalReality(legacy, lifecycle, intent, effect, authority, remote, dependencies, cachedEntries, false);
  return observed.status === "verified-effect" ? undefined : `${observed.status}: ${observed.reason}`;
}

async function preflightVerifiedEffects(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<string | undefined> {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  const loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded.reason;
  let remotePromise: Promise<readonly RemoteEntry[] | undefined> | undefined;
  const remoteEntries = () => remotePromise ??= completeEntries(legacy, remote);
  for (const intent of loaded.state.operationIntents) {
    const invalid = validateIntent(intent, loaded.state);
    if (invalid) return invalid;
    for (const effect of intent.effects) {
      if (effect.stage !== "effect-verified") continue;
      if (!effect.verificationEvidenceRef) return `effect-verified durable effect ${effect.effectId} lacks verification evidence`;
      const failure = await verifyCurrentPhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries);
      if (failure) return `${effect.effectId}: effect-verified physical reality is not currently converged (${failure})`;
    }
  }
  return undefined;
}

/**
 * Recover one matching durable intent only through physical verification. This is
 * the direct executor restart entry: it never performs canonical BASE/state commit
 * or durable state-committed finalization. Those remain owned by the enclosing
 * AuthorityCompleteExecutionCoordinator. No physical mutation method is called.
 */
export async function recoverMatchingDurableIntentToVerifiedReceipt(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  stateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  remote: ManagedRemoteIdentity,
  operationId: OperationId,
  dependencies: DurableIntentRecoveryDependencies = {},
): Promise<DurableIntentVerifiedRecoveryResult> {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  let loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  const matches = loaded.state.operationIntents.filter(intent => intent.operationId === operationId);
  if (matches.length !== 1) return { status: "recovery-required", reason: matches.length ? "duplicate durable operation intent identity" : "matching durable operation intent is unavailable" };
  let intent = matches[0]!;
  const invalid = validateIntent(intent, loaded.state);
  if (invalid) return { status: "recovery-required", reason: invalid };

  if (intent.effects.every(effect => effect.stage === "intent-persisted")) {
    const retired = await lifecycle.retireUnattemptedIntent(String(intent.operationId));
    return retired.status === "persisted" ? { status: "retired" } : { status: "recovery-required", reason: `unattempted durable intent could not be retired (${retired.status})` };
  }

  let remotePromise: Promise<readonly RemoteEntry[] | undefined> | undefined;
  const remoteEntries = () => remotePromise ??= completeEntries(legacy, remote);
  for (const effect of intent.effects) {
    if (effect.stage === "state-committed") continue;
    if (effect.stage === "effect-verified") {
      if (!effect.verificationEvidenceRef) return { status: "recovery-required", reason: `effect-verified durable effect ${effect.effectId} lacks verification evidence` };
      const failure = await verifyCurrentPhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries);
      if (failure) return { status: "recovery-required", reason: `${effect.effectId}: effect-verified physical reality is not currently converged (${failure})` };
      continue;
    }
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") {
      return { status: "recovery-required", reason: `unsupported matching durable stage ${effect.stage}` };
    }
    const physical = await observePhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries, true);
    const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && !(recorded.status === "already-progressed" && (recorded.stage === "effect-verified" || recorded.stage === "state-committed"))) {
      return { status: "recovery-required", reason: `durable effect ${effect.effectId} remains unresolved (${recorded.status}${"reason" in recorded ? `: ${recorded.reason}` : ""})` };
    }
    loaded = await lifecycle.loadAuthority();
    if (loaded.status !== "trusted") return loaded;
    const refreshed = loaded.state.operationIntents.filter(value => value.operationId === operationId);
    if (refreshed.length !== 1) return { status: "recovery-required", reason: "durable intent identity changed during physical recovery" };
    intent = refreshed[0]!;
  }

  loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  const refreshed = loaded.state.operationIntents.filter(value => value.operationId === operationId);
  if (refreshed.length !== 1) return { status: "recovery-required", reason: "durable intent identity changed before receipt reconstruction" };
  intent = refreshed[0]!;
  const invalidVerified = validateIntent(intent, loaded.state);
  if (invalidVerified) return { status: "recovery-required", reason: invalidVerified };
  if (!intent.effects.every(effect => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) {
    return { status: "recovery-required", reason: "not every durable physical effect reached verified authority" };
  }

  const canonical = await stateStore.load(stateContext);
  if (canonical.status !== "trusted") return { status: "recovery-required", reason: "trusted canonical state unavailable during durable receipt reconstruction" };
  const entries = await remoteEntries();
  if (!entries) return { status: "recovery-required", reason: "complete REMOTE observation unavailable for durable receipt reconstruction" };
  const reconstructed = reconstructDurableRecovery(intent, canonical.state, entries);
  return reconstructed
    ? { status: "verified", receipt: reconstructed.receipt }
    : { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" };
}

/**
 * Effect-verified means physical dispatch must never happen again; it does not
 * mean current convergence may be assumed forever. Re-observe those exact
 * persisted effects before the base recovery path can cross canonical BASE/state.
 */
export async function recoverOutstandingDurableIntents(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  stateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies = {},
): Promise<DurableIntentRecoveryResult> {
  const failure = await preflightVerifiedEffects(legacy, authorityStore, remote, dependencies);
  if (failure) return { status: "recovery-required", reason: failure };
  return recoverBaseOutstandingDurableIntents(legacy, authorityStore, stateStore, stateContext, remote, dependencies);
}
