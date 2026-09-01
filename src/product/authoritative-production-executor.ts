import type {
  AuthoritativeSynchronizationExecutor,
  AuthorityCompletePreconditionValidationResult,
  ExecutablePlannedOperation,
  ExecutionResult,
  GoogleDrivePort,
  ManagedRemoteIdentity,
  RecoverableOperationIntentV1_1,
  RemoteEntry,
  RemoteObjectId,
  StateLoadContext,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore,
} from "../contracts";
import {
  createAuthoritativeProductExecutor as createBaseAuthoritativeProductExecutor,
  type RecoverableProductionMutationDependencies,
} from "./authoritative-production-executor-base";
import { recoverOutstandingDurableIntents, reconstructDurableRecovery } from "./durable-intent-recovery";
import type { ProductSynchronizationExecutor } from "./production-executor";

export type { RecoverableProductionMutationDependencies } from "./authoritative-production-executor-base";

type LegacyRecoveryReads = {
  readonly drive: Pick<GoogleDrivePort, "listForReconciliation">;
  readonly recoverableProductionMutationDependencies?: RecoverableProductionMutationDependencies;
};

function expectedOperationShape(intent: RecoverableOperationIntentV1_1): { readonly kind: ExecutablePlannedOperation["kind"]; readonly path: ExecutablePlannedOperation["path"]; readonly remoteObjectId?: RemoteObjectId } | undefined {
  const first = intent.effects[0]?.descriptor;
  if (!first) return undefined;
  if (intent.logicalKind === "clean-text-merge") {
    const remote = intent.effects.map(effect => effect.descriptor).find(descriptor => descriptor.kind === "remote-file");
    return remote?.kind === "remote-file"
      ? { kind: "clean-text-merge", path: remote.targetPath, remoteObjectId: remote.remoteMutation.kind === "existing-file-content-update" ? remote.remoteMutation.remoteObjectId : undefined }
      : undefined;
  }
  if (first.kind === "remote-file") {
    return first.remoteMutation.kind === "reserved-file-create"
      ? { kind: "upload-create", path: first.targetPath, remoteObjectId: first.remoteMutation.reservedRemoteObjectId }
      : { kind: "upload-update", path: first.targetPath, remoteObjectId: first.remoteMutation.remoteObjectId };
  }
  if (first.kind === "remote-folder-create") return { kind: "upload-create", path: first.targetPath, remoteObjectId: first.remoteMutation.reservedRemoteObjectId };
  if (first.kind === "local-file") return { kind: first.mutationKind === "create" ? "download-create" : "download-update", path: first.targetPath };
  if (first.kind === "local-folder-create") return { kind: "download-create", path: first.targetPath };
  if (first.kind === "move") return { kind: "identity-preserving-move", path: first.fromPath, remoteObjectId: first.remoteObjectId ?? first.identityAuthority.remoteObjectId };
  return { kind: first.targetSide === "remote" ? "trash-remote" : "trash-local", path: first.path, remoteObjectId: first.remoteObjectId };
}

function operationContradiction(operation: ExecutablePlannedOperation, intent: RecoverableOperationIntentV1_1): string | undefined {
  const expected = expectedOperationShape(intent);
  if (!expected) return "persisted durable intent cannot establish one logical operation shape";
  if (operation.kind !== expected.kind || operation.path !== expected.path) return "current operation contradicts persisted durable intent kind/path";
  if (operation.kind === "identity-preserving-move") {
    const descriptor = intent.effects[0]?.descriptor;
    if (descriptor?.kind !== "move" || operation.fromPath !== descriptor.fromPath || operation.toPath !== descriptor.toPath || operation.targetSide !== descriptor.targetSide) return "current move contradicts persisted durable move authority";
  }
  const claimedIds = [operation.remoteObjectId, operation.contentVersion?.remoteObjectId].filter((value): value is RemoteObjectId => value !== undefined);
  if (expected.remoteObjectId && claimedIds.some(value => value !== expected.remoteObjectId)) return "current operation REMOTE identity contradicts persisted durable identity";
  return undefined;
}

async function outstandingIntent(authorityStore: SynchronizationAuthorityStoreV1_1, operation: ExecutablePlannedOperation): Promise<{ readonly status: "none" } | { readonly status: "recovery-required"; readonly reason: string } | { readonly status: "found"; readonly intent: RecoverableOperationIntentV1_1 }> {
  const loaded = await authorityStore.loadAuthority();
  if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
  const intent = loaded.state.operationIntents.find(value => value.operationId === operation.operationId);
  if (!intent) return { status: "none" };
  if (intent.semanticAuthority.generation !== loaded.state.semanticGeneration) return { status: "recovery-required", reason: "persisted durable intent belongs to stale semantic generation" };
  const contradiction = operationContradiction(operation, intent);
  return contradiction ? { status: "recovery-required", reason: contradiction } : { status: "found", intent };
}

async function completeRemoteEntries(legacy: ProductSynchronizationExecutor, managedRemote: ManagedRemoteIdentity): Promise<readonly RemoteEntry[] | undefined> {
  const listed = await (legacy as unknown as LegacyRecoveryReads).drive.listForReconciliation(managedRemote.rootId);
  return listed.ok && listed.value.completeness.status === "complete" ? listed.value.entries.filter(entry => !entry.trashed) : undefined;
}

/**
 * Production authoritative executor. New work delegates to the established D-C4
 * implementation. A matching persisted physical intent, however, is a restart
 * record: it bypasses ordinary pre-dispatch validation, recovers from durable
 * descriptors, and returns only the descriptor-derived receipt already committed
 * by the restart path. Current operation content can never replace durable bytes.
 */
export function createAuthoritativeProductExecutor(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  identityStateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  managedRemote: ManagedRemoteIdentity,
  explicitDependencies?: RecoverableProductionMutationDependencies,
): AuthoritativeSynchronizationExecutor {
  const base = createBaseAuthoritativeProductExecutor(legacy, authorityStore, identityStateStore, stateContext, managedRemote, explicitDependencies);
  const configured = explicitDependencies ?? (legacy as unknown as LegacyRecoveryReads).recoverableProductionMutationDependencies ?? {};

  async function validatePreconditions(operation: ExecutablePlannedOperation): Promise<AuthorityCompletePreconditionValidationResult> {
    const existing = await outstandingIntent(authorityStore, operation);
    if (existing.status === "recovery-required") return { status: "recovery-required", reason: existing.reason };
    if (existing.status === "found") return { status: "valid" };
    return base.validatePreconditions(operation);
  }

  async function execute(operation: ExecutablePlannedOperation): Promise<ExecutionResult> {
    const existing = await outstandingIntent(authorityStore, operation);
    if (existing.status === "recovery-required") return { status: "recovery-required", reason: existing.reason };
    if (existing.status === "none") return base.execute(operation);
    const wasUnattempted = existing.intent.effects.every(effect => effect.stage === "intent-persisted");

    const recovery = await recoverOutstandingDurableIntents(
      legacy,
      authorityStore,
      identityStateStore,
      stateContext,
      managedRemote,
      {
        localTransactionalMutationPort: configured.localTransactionalMutationPort,
        remoteFolderCreateRecoveryReadPort: configured.remoteFolderCreateRecoveryReadPort,
      },
    );
    if (recovery.status === "recovery-required") return { status: "recovery-required", reason: recovery.reason };
    if (wasUnattempted) return { status: "recovery-required", reason: "unattempted durable intent was retired; current work must be replanned under renewed authority" };

    const [authority, canonical, entries] = await Promise.all([
      authorityStore.loadAuthority(),
      identityStateStore.load(stateContext),
      completeRemoteEntries(legacy, managedRemote),
    ]);
    if (authority.status !== "trusted" || canonical.status !== "trusted" || !entries) return { status: "recovery-required", reason: "durable restart completed but exact committed receipt cannot be reconstructed" };
    const persisted = authority.state.operationIntents.find(value => value.operationId === operation.operationId);
    if (!persisted) return { status: "recovery-required", reason: "durable restart intent disappeared before receipt reconstruction" };
    const reconstructed = reconstructDurableRecovery(persisted, canonical.state, entries);
    if (!reconstructed) return { status: "recovery-required", reason: "durable restart receipt cannot be reconstructed from persisted physical authority" };
    return { status: "durable-verified-success", receipt: reconstructed.receipt };
  }

  return { validatePreconditions, execute };
}
