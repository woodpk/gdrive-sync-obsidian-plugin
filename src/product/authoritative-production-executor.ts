import type {
  AuthoritativeSynchronizationExecutor,
  AuthoritativeSynchronizationExecutorV1_3,
  AuthorityCompletePreconditionValidationResult,
  ExecutablePlannedOperation,
  ExecutionResult,
  ExecutionResultV1_3,
  GoogleDrivePort,
  LocalTransactionResultV1_3,
  LocalTransactionalMutationPortV1_3,
  ManagedRemoteIdentity,
  OperationalFailureProvenanceV1_3,
  RecoverableOperationIntentV1_1,
  ReliableRemoteMutationPortV1_3,
  RemoteMutationOutcomeV1_3,
  RemoteObjectId,
  RetrySafePhysicalAuthorityV1_3,
  StateLoadContext,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore,
} from "../contracts";
import {
  createAuthoritativeProductExecutor as createBaseAuthoritativeProductExecutor,
  type RecoverableProductionMutationDependencies,
} from "./authoritative-production-executor-base";
import { recoverMatchingDurableIntentToVerifiedReceipt } from "./durable-intent-recovery";
import type { ProductSynchronizationExecutor } from "./production-executor";

export type { RecoverableProductionMutationDependencies } from "./authoritative-production-executor-base";

export interface RecoverableProductionMutationDependenciesV1_3 {
  readonly reliableRemoteMutationPort?: ReliableRemoteMutationPortV1_3;
  readonly localTransactionalMutationPort?: LocalTransactionalMutationPortV1_3;
  readonly remoteFolderCreateRecoveryReadPort?: RecoverableProductionMutationDependencies["remoteFolderCreateRecoveryReadPort"];
}

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
  const intents = loaded.state.operationIntents.filter(value => value.operationId === operation.operationId);
  if (!intents.length) return { status: "none" };
  if (intents.length !== 1) return { status: "recovery-required", reason: "duplicate durable operation intent identity" };
  const intent = intents[0]!;
  if (intent.semanticAuthority.generation !== loaded.state.semanticGeneration) return { status: "recovery-required", reason: "persisted durable intent belongs to stale semantic generation" };
  const contradiction = operationContradiction(operation, intent);
  return contradiction ? { status: "recovery-required", reason: contradiction } : { status: "found", intent };
}

/**
 * Production authoritative executor. New work delegates to the established D-C4
 * implementation. A matching persisted physical intent, however, is a restart
 * record: it bypasses ordinary pre-dispatch validation and is recovered only as
 * far as effect-verified. Canonical BASE/state commit and state-committed durable
 * finalization remain owned by AuthorityCompleteExecutionCoordinator.
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

    const recovery = await recoverMatchingDurableIntentToVerifiedReceipt(
      legacy,
      authorityStore,
      identityStateStore,
      stateContext,
      managedRemote,
      operation.operationId,
      {
        localTransactionalMutationPort: configured.localTransactionalMutationPort,
        remoteFolderCreateRecoveryReadPort: configured.remoteFolderCreateRecoveryReadPort,
      },
    );
    if (recovery.status === "recovery-required") return { status: "recovery-required", reason: recovery.reason };
    if (recovery.status === "retired") return { status: "recovery-required", reason: "unattempted durable intent was retired; current work must be replanned under renewed authority" };
    return { status: "durable-verified-success", receipt: recovery.receipt };
  }

  return { validatePreconditions, execute };
}

function retrySafeVerifiedNotApplied(): RetrySafePhysicalAuthorityV1_3 {
  return { status: "verified-no-unresolved-effect", basis: "verified-not-applied" };
}

function safeVerifiedNotAppliedResult(
  reason: string,
  operationalFailure: OperationalFailureProvenanceV1_3 | undefined,
): ExecutionResultV1_3 {
  const safety = retrySafeVerifiedNotApplied();
  if (!operationalFailure) return { status: "blocking-failure", reason, effectSafety: safety };
  switch (operationalFailure.kind) {
    case "authentication-required":
      return { status: "authentication-required", reason, operationalFailure, effectSafety: safety };
    case "transient-failure":
    case "rate-limited":
      return { status: "retryable-failure", reason, operationalFailure, retrySafety: safety };
    case "permission-denied":
    case "quota-exhausted":
      return { status: "blocking-failure", reason, operationalFailure, effectSafety: safety };
    case "recovery-required":
    case "unclassified":
      return { status: "recovery-required", reason, operationalFailure };
  }
}

function predecessorToV1_3(result: ExecutionResult): ExecutionResultV1_3 {
  switch (result.status) {
    case "durable-verified-success":
    case "stale-precondition":
    case "cancelled":
      return result;
    case "recovery-required":
      return { status: "recovery-required", reason: result.reason };
    case "uncertain":
      return { status: "uncertain", reason: result.reason };
    case "blocking-failure":
      return { status: "recovery-required", reason: result.reason };
    case "retryable-failure":
      return { status: "recovery-required", reason: result.reason };
  }
}

/**
 * V1.3 successor execution seam. The predecessor durable lifecycle remains the
 * physical authority; structured operational provenance is captured orthogonally
 * from the frozen successor ports and is never derived from reason strings.
 */
export function createAuthoritativeProductExecutorV1_3(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  identityStateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  managedRemote: ManagedRemoteIdentity,
  explicitDependencies: RecoverableProductionMutationDependenciesV1_3,
): AuthoritativeSynchronizationExecutorV1_3 {
  const observed: { remote?: RemoteMutationOutcomeV1_3; local?: LocalTransactionResultV1_3 } = {};

  const remote = explicitDependencies.reliableRemoteMutationPort;
  const local = explicitDependencies.localTransactionalMutationPort;
  const adaptedDependencies: RecoverableProductionMutationDependencies = {
    ...(remote ? {
      reliableRemoteMutationPort: {
        reserveFileCreateIdentity: (...args) => remote.reserveFileCreateIdentity(...args),
        reserveFolderCreateIdentity: (...args) => remote.reserveFolderCreateIdentity(...args),
        createReserved: async (...args) => {
          const outcome = await remote.createReserved(...args);
          observed.remote = outcome;
          return outcome;
        },
        updateExisting: async (...args) => {
          const outcome = await remote.updateExisting(...args);
          observed.remote = outcome;
          return outcome;
        },
        moveExisting: async (...args) => {
          const outcome = await remote.moveExisting(...args);
          observed.remote = outcome;
          return outcome;
        },
        trashExisting: async (...args) => {
          const outcome = await remote.trashExisting(...args);
          observed.remote = outcome;
          return outcome;
        },
      },
    } : {}),
    ...(local ? {
      localTransactionalMutationPort: {
        stageAndVerify: async (...args) => {
          const result = await local.stageAndVerify(...args);
          observed.local = result;
          return result;
        },
        commitVerifiedStage: async (...args) => {
          const result = await local.commitVerifiedStage(...args);
          observed.local = result;
          return result;
        },
        recover: async (...args) => {
          const result = await local.recover(...args);
          observed.local = result;
          return result;
        },
      },
    } : {}),
    remoteFolderCreateRecoveryReadPort: explicitDependencies.remoteFolderCreateRecoveryReadPort,
  };

  const predecessor = createAuthoritativeProductExecutor(
    legacy,
    authorityStore,
    identityStateStore,
    stateContext,
    managedRemote,
    adaptedDependencies,
  );

  return {
    validatePreconditions: operation => predecessor.validatePreconditions(operation),
    async execute(operation) {
      delete observed.remote;
      delete observed.local;
      const result = await predecessor.execute(operation);
      const remoteOutcome = observed.remote;
      const localResult = observed.local;

      if (result.status === "uncertain") {
        if (remoteOutcome?.status === "outcome-unknown") {
          return {
            status: "uncertain",
            reason: result.reason,
            ...(remoteOutcome.operationalFailure ? { operationalFailure: remoteOutcome.operationalFailure } : {}),
          };
        }
        if (localResult?.status === "outcome-unknown") {
          return {
            status: "uncertain",
            reason: result.reason,
            ...(localResult.operationalFailure ? { operationalFailure: localResult.operationalFailure } : {}),
          };
        }
        if (remoteOutcome?.status === "verified-not-applied") {
          // A clean merge may already have a separately verified LOCAL effect;
          // one safe REMOTE non-application cannot make the logical operation retry-safe.
          if (operation.kind === "clean-text-merge") {
            return {
              status: "uncertain",
              reason: result.reason,
              ...(remoteOutcome.operationalFailure ? { operationalFailure: remoteOutcome.operationalFailure } : {}),
            };
          }
          return safeVerifiedNotAppliedResult(
            remoteOutcome.reason,
            remoteOutcome.operationalFailure,
          );
        }
      }

      return predecessorToV1_3(result);
    },
  };
}
