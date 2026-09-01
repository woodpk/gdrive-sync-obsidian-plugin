import {
  verifyLocalFolderCreate,
  verifyRemoteFolderCreate,
  type GoogleDrivePort,
  type LocalFolderCreateObservation,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type RecoverablePhysicalMutationDescriptorV1_1,
  type RemoteEntry,
  type RemoteFolderCreateRecoveryReadPort,
  type RemoteObjectId,
  type StateLoadContext,
  type SynchronizationAuthorityStoreV1_1,
  type SynchronizationStateStore,
  type VaultPath,
} from "../contracts";
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

type RecoveryReads = { readonly local: LocalVaultPort; readonly drive: Pick<GoogleDrivePort, "listForReconciliation"> };
const reads = (legacy: ProductSynchronizationExecutor) => legacy as unknown as RecoveryReads;

function uniqueRemote(entries: readonly RemoteEntry[], path: VaultPath, kind?: "file" | "folder"): RemoteEntry | undefined {
  const matches = entries.filter(entry => !entry.trashed && entry.path === path && (!kind || entry.entityKind === kind));
  return matches.length === 1 ? matches[0] : undefined;
}

async function completeEntries(legacy: ProductSynchronizationExecutor, remote: ManagedRemoteIdentity): Promise<readonly RemoteEntry[] | undefined> {
  const result = await reads(legacy).drive.listForReconciliation(remote.rootId);
  return result.ok && result.value.completeness.status === "complete" ? result.value.entries.filter(entry => !entry.trashed) : undefined;
}

async function verifyFolder(
  legacy: ProductSynchronizationExecutor,
  descriptor: Extract<RecoverablePhysicalMutationDescriptorV1_1, { readonly kind: "local-folder-create" | "remote-folder-create" }>,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<string | undefined> {
  if (descriptor.kind === "remote-folder-create") {
    const reader: RemoteFolderCreateRecoveryReadPort | undefined = dependencies.remoteFolderCreateRecoveryReadPort;
    if (!reader) return "RemoteFolderCreateRecoveryReadPort unavailable while revalidating effect-verified REMOTE folder";
    const result = verifyRemoteFolderCreate(descriptor, await reader.observeFolderCreateRecovery(descriptor));
    return result.status === "verified-effect" ? undefined : `effect-verified REMOTE folder is not currently converged (${result.status}: ${result.reason})`;
  }
  const observed = await reads(legacy).local.observe(descriptor.targetPath);
  const view: LocalFolderCreateObservation = observed.status === "present" && observed.entityKind === "folder" && observed.observationToken
    ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed.observationToken }
    : observed.status === "absent"
      ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey }
      : observed.status === "present"
        ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed.entityKind }
        : { status: "unobservable", reason: "LOCAL folder observation incomplete while revalidating effect-verified state" };
  const result = verifyLocalFolderCreate(descriptor, view);
  return result.status === "verified-effect" ? undefined : `effect-verified LOCAL folder is not currently converged (${result.status}: ${result.reason})`;
}

async function verifyCurrentPhysicalReality(
  legacy: ProductSynchronizationExecutor,
  descriptor: RecoverablePhysicalMutationDescriptorV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
  cachedEntries: () => Promise<readonly RemoteEntry[] | undefined>,
): Promise<string | undefined> {
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") return verifyFolder(legacy, descriptor, dependencies);
  if (descriptor.kind === "local-file") {
    const observed = await reads(legacy).local.observe(descriptor.targetPath);
    return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === descriptor.intendedContent.hash && observed.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? undefined
      : "effect-verified LOCAL file no longer proves the persisted intended content";
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([reads(legacy).local.observe(descriptor.fromPath), reads(legacy).local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present" ? undefined : "effect-verified LOCAL move is not currently converged";
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await reads(legacy).local.observe(descriptor.path)).status === "absent" ? undefined : "effect-verified LOCAL trash target is present again";
  }

  const entries = await cachedEntries();
  if (!entries) return "complete current REMOTE observation unavailable while revalidating effect-verified state";
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    const expectedId = mutation.kind === "reserved-file-create" ? mutation.reservedRemoteObjectId : mutation.candidateRemoteObjectId;
    const actual = uniqueRemote(entries, descriptor.targetPath, "file");
    return actual?.remoteObjectId === expectedId && actual.content?.hash === descriptor.intendedContent.hash && actual.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? undefined
      : "effect-verified REMOTE file no longer proves the persisted identity/content";
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const expectedId: RemoteObjectId = descriptor.remoteObjectId ?? descriptor.identityAuthority.remoteObjectId;
    const destination = uniqueRemote(entries, descriptor.toPath);
    return destination?.remoteObjectId === expectedId && !entries.some(entry => entry.path === descriptor.fromPath && entry.remoteObjectId === expectedId)
      ? undefined
      : "effect-verified REMOTE move is not currently uniquely converged";
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return !entries.some(entry => entry.remoteObjectId === descriptor.remoteObjectId) && !entries.some(entry => entry.path === descriptor.path)
      ? undefined
      : "effect-verified REMOTE trash is not currently proven by exact ID/path absence";
  }
  return "effect-verified descriptor cannot be revalidated";
}

async function preflightVerifiedEffects(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<string | undefined> {
  const loaded = await authorityStore.loadAuthority();
  if (loaded.status !== "trusted") return `authoritative metadata ${loaded.status}`;
  let remotePromise: Promise<readonly RemoteEntry[] | undefined> | undefined;
  const remoteEntries = () => remotePromise ??= completeEntries(legacy, remote);
  for (const intent of loaded.state.operationIntents) {
    if (intent.semanticAuthority.generation !== loaded.state.semanticGeneration) return "persisted durable intent belongs to stale semantic generation";
    for (const effect of intent.effects) {
      if (effect.stage !== "effect-verified") continue;
      if (!effect.verificationEvidenceRef) return `effect-verified durable effect ${effect.effectId} lacks verification evidence`;
      const failure = await verifyCurrentPhysicalReality(legacy, effect.descriptor, remote, dependencies, remoteEntries);
      if (failure) return `${effect.effectId}: ${failure}`;
    }
  }
  return undefined;
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
