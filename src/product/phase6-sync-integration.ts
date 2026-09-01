import type { DataAdapter } from "obsidian";
import {
  contractId,
  type AuthorityCompleteSuccessCommitter,
  type BaseFingerprint,
  type CommitResult,
  type ExecutablePlannedOperation,
  type LocalMutationTransaction,
  type LocalTransactionResult,
  type LocalTransactionalMutationPort,
  type LocalVaultPort,
  type PersistenceRevision,
  type SemanticStateGeneration,
  type StateRevision,
  type SynchronizationCancellationSignal,
  type VaultPath,
  type VerifiedExecutionReceipt,
} from "../contracts";
import { ObsidianLocalMutationTransactions } from "../local/local-vault-access-boundary";
import {
  type DurableSynchronizationAuthorityState,
  PersistentSynchronizationStateStore,
} from "../state/persistent-state-store";
import { sha256Text } from "../util/sha256";
import { CONFIG_REMOTE_NAMESPACE, ProductPathScope } from "./path-scope";

const vp = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");

/**
 * C owns the semantic-generation algorithm in production persistence. H must
 * predict the generation that C will assign when a semantic projection changes
 * so every still-valid converged path can be carried forward under that exact
 * generation instead of becoming spuriously stale after an unrelated durable
 * fact is learned.
 */
export function nextIntegratedSemanticGeneration(current: SemanticStateGeneration): SemanticStateGeneration {
  const value = String(current);
  const match = /^(.*?)(\d+)$/.exec(value);
  const next = match ? `${match[1]}${Number(match[2]) + 1}` : `${value}:1`;
  return contractId<"SemanticStateGeneration">(next) as SemanticStateGeneration;
}

/** Carry unchanged converged-path authority through one exact semantic CAS. */
export function rebaseIntegratedConvergence(
  state: DurableSynchronizationAuthorityState,
  generation: SemanticStateGeneration,
): DurableSynchronizationAuthorityState {
  return {
    ...state,
    pathConvergence: state.pathConvergence.map(entry => entry.state.status === "converged"
      ? { ...entry, state: { ...entry.state, generation } }
      : entry),
  };
}

/**
 * B's physical transaction implementation intentionally works on physical vault
 * paths. Product planning works on logical paths, including the synthetic
 * portable-configuration namespace. This adapter performs only that mapping and
 * returns the original logical durable descriptor with B's updated crash stage.
 */
export class IntegratedLocalTransactionalMutationPort implements LocalTransactionalMutationPort {
  private readonly delegate: ObsidianLocalMutationTransactions;

  constructor(
    adapter: DataAdapter,
    rawLocal: LocalVaultPort,
    private readonly scope: ProductPathScope,
  ) {
    this.delegate = new ObsidianLocalMutationTransactions(adapter, rawLocal);
  }

  async stageAndVerify(
    transaction: LocalMutationTransaction,
    content: Parameters<LocalTransactionalMutationPort["stageAndVerify"]>[1],
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResult> {
    const result = await this.delegate.stageAndVerify(this.toPhysical(transaction), content, cancellation);
    return this.toLogical(result, transaction);
  }

  async commitVerifiedStage(
    transaction: LocalMutationTransaction,
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResult> {
    const result = await this.delegate.commitVerifiedStage(this.toPhysical(transaction), cancellation);
    return this.toLogical(result, transaction);
  }

  async recover(
    transaction: LocalMutationTransaction,
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResult> {
    const result = await this.delegate.recover(this.toPhysical(transaction), cancellation);
    return this.toLogical(result, transaction);
  }

  private toPhysical(transaction: LocalMutationTransaction): LocalMutationTransaction {
    return {
      ...transaction,
      path: this.physical(transaction.path),
      stagePath: this.physical(transaction.stagePath),
      backupPath: this.physical(transaction.backupPath),
    } as LocalMutationTransaction;
  }

  private toLogical(result: LocalTransactionResult, logical: LocalMutationTransaction): LocalTransactionResult {
    return {
      ...result,
      transaction: { ...logical, stage: result.transaction.stage } as LocalMutationTransaction,
    } as LocalTransactionResult;
  }

  private physical(path: VaultPath): VaultPath {
    const logical = normalize(String(path));
    if (logical === CONFIG_REMOTE_NAMESPACE) throw new Error("reserved portable-configuration namespace is not a physical transaction target");
    if (logical.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`)) {
      const relative = logical.slice(CONFIG_REMOTE_NAMESPACE.length + 1);
      return vp(`${normalize(String(this.scope.activeConfigurationDirectory()))}/${relative}`);
    }
    return vp(logical);
  }
}

function physicalOperation(operation: ExecutablePlannedOperation): boolean {
  return [
    "upload-create",
    "upload-update",
    "download-create",
    "download-update",
    "identity-preserving-move",
    "clean-text-merge",
    "trash-local",
    "trash-remote",
  ].includes(operation.kind);
}

function operationGeneration(operation: ExecutablePlannedOperation): SemanticStateGeneration | undefined {
  const values = operation.preconditions.flatMap(precondition => {
    if (precondition.kind === "base-authority") return [precondition.authority.generation];
    if (precondition.kind === "identity-authority") return [precondition.proof.generation];
    return [];
  });
  if (!values.length) return undefined;
  return values.every(value => value === values[0]) ? values[0] : undefined;
}

function fingerprint(
  operation: ExecutablePlannedOperation,
  receipt: VerifiedExecutionReceipt,
  remoteObjectId: string | undefined,
): BaseFingerprint {
  const evidence = receipt.evidence ?? operation.contentVersion?.content;
  const value = sha256Text(JSON.stringify({
    path: String(operation.path),
    entityKind: operation.contentVersion?.entityKind ?? "file",
    remoteObjectId,
    hash: evidence?.hash ? String(evidence.hash) : undefined,
    sizeBytes: evidence?.sizeBytes,
  }));
  return contractId<"BaseFingerprint">(`base:${String(value)}`) as BaseFingerprint;
}

function asStateRevision(value: PersistenceRevision): StateRevision {
  return contractId<"StateRevision">(String(value)) as StateRevision;
}

/**
 * H-owned production bridge between D's verified-effect boundary and C's single
 * durable authority document. Persistence-only operation/effect checkpoints are
 * allowed to advance C's persistence revision between validation and commit; the
 * semantic generation must remain exact. The final BASE/journal transition then
 * uses C's current persistence revision as the CAS token.
 */
export class IntegratedAuthorityStateCommitter implements AuthorityCompleteSuccessCommitter {
  constructor(private readonly store: PersistentSynchronizationStateStore) {}

  async commitVerifiedSuccess(
    operation: ExecutablePlannedOperation,
    receipt: VerifiedExecutionReceipt,
    expectedStateRevision?: StateRevision,
  ): Promise<CommitResult> {
    if (receipt.operationId !== operation.operationId || receipt.durable !== true || receipt.integrityVerified !== true) {
      return { status: "recovery-required", reason: "integrated authoritative commit requires the exact durable verified operation receipt" };
    }

    const loaded = await this.store.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `integrated authority is ${loaded.status}` };
    const current = loaded.state;
    const intent = current.operationIntents.find(value => value.operationId === operation.operationId);
    const operationAuthority = operationGeneration(operation);

    if (physicalOperation(operation)) {
      if (!intent) return { status: "recovery-required", reason: "durable physical intent is missing at integrated canonical commit" };
      if (intent.semanticAuthority.generation !== current.semanticGeneration) {
        return { status: "stale-state", actualRevision: current.stateRevision };
      }
      if (!intent.effects.every(effect => effect.stage === "effect-verified" && Boolean(effect.verificationEvidenceRef))) {
        return { status: "recovery-required", reason: "integrated canonical commit requires every physical effect to remain durably effect-verified" };
      }
    } else if (expectedStateRevision && current.stateRevision !== expectedStateRevision) {
      return { status: "stale-state", actualRevision: current.stateRevision };
    }

    if (operationAuthority && operationAuthority !== current.semanticGeneration) {
      return { status: "stale-state", actualRevision: current.stateRevision };
    }

    const transitioned = this.applyOperation(current, operation, receipt);
    if (!transitioned.ok) return { status: "recovery-required", reason: transitioned.reason };

    const saved = await this.store.saveAuthority(
      transitioned.state,
      current.persistenceRevision,
      current.semanticGeneration,
    );
    if (saved.status === "saved") return { status: "committed", newStateRevision: asStateRevision(saved.persistenceRevision) };
    if (saved.status === "stale-persistence") return { status: "stale-state", actualRevision: saved.actualPersistenceRevision ? asStateRevision(saved.actualPersistenceRevision) : undefined };
    if (saved.status === "stale-semantic-authority") return { status: "stale-state", actualRevision: current.stateRevision };
    return { status: "recovery-required", reason: saved.issues.map(issue => `${issue.code}:${issue.detail}`).join("; ") || "integrated authority save failed semantic validation" };
  }

  private applyOperation(
    current: DurableSynchronizationAuthorityState,
    operation: ExecutablePlannedOperation,
    receipt: VerifiedExecutionReceipt,
  ): { readonly ok: true; readonly state: DurableSynchronizationAuthorityState } | { readonly ok: false; readonly reason: string } {
    let base = [...current.base];
    let baseAuthority = [...current.baseAuthority];
    let mappings = [...current.remoteMappings];
    let tombstones = [...current.tombstones];
    let pathConvergence = [...current.pathConvergence];
    const sourcePath = operation.kind === "identity-preserving-move" && operation.fromPath ? operation.fromPath : operation.path;
    const oldBase = base.find(entry => entry.path === sourcePath);
    const entityKind = operation.contentVersion?.entityKind ?? oldBase?.entityKind ?? "file";
    const remoteObjectId = receipt.resultingRemoteObjectId ?? operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId ?? oldBase?.remoteObjectId;
    const evidence = receipt.evidence ?? operation.contentVersion?.content ?? oldBase?.content;
    let semanticChanged = false;

    const clearPath = (path: VaultPath) => {
      base = base.filter(entry => entry.path !== path);
      baseAuthority = baseAuthority.filter(entry => entry.path !== path);
      mappings = mappings.filter(entry => entry.path !== path);
      tombstones = tombstones.filter(entry => entry.path !== path);
      pathConvergence = pathConvergence.filter(entry => entry.path !== path);
    };

    const establishCommon = (path: VaultPath): string | undefined => {
      if (!remoteObjectId) return "common-state commit lacks exact remote object identity";
      clearPath(path);
      base.push({ path, entityKind, localExisted: true, remoteExisted: true, content: evidence, remoteObjectId });
      mappings = mappings.filter(entry => entry.remoteObjectId !== remoteObjectId);
      mappings.push({ path, remoteObjectId, entityKind });
      const nextGeneration = nextIntegratedSemanticGeneration(current.semanticGeneration);
      const nextFingerprint = fingerprint(operation, receipt, String(remoteObjectId));
      baseAuthority.push({ path, fingerprint: nextFingerprint });
      pathConvergence.push({ path, state: { status: "converged", generation: nextGeneration, baseFingerprint: nextFingerprint } });
      semanticChanged = true;
      return undefined;
    };

    if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
      const localOnlyConflictCopy = operation.kind === "download-create"
        && operation.contentVersion !== undefined
        && operation.path !== operation.contentVersion.path;
      if (localOnlyConflictCopy) {
        clearPath(operation.path);
        base.push({ path: operation.path, entityKind, localExisted: true, remoteExisted: false, content: evidence });
        semanticChanged = true;
      } else {
        const problem = establishCommon(operation.path);
        if (problem) return { ok: false, reason: problem };
      }
    } else if (operation.kind === "identity-preserving-move") {
      if (!operation.fromPath || !operation.toPath || !oldBase || !remoteObjectId) {
        return { ok: false, reason: "identity-preserving move commit lacks exact old BASE, destination, or remote identity" };
      }
      clearPath(operation.fromPath);
      clearPath(operation.toPath);
      base.push({ ...oldBase, path: operation.toPath, localExisted: true, remoteExisted: true, content: evidence, remoteObjectId });
      mappings = mappings.filter(entry => entry.remoteObjectId !== remoteObjectId);
      mappings.push({ path: operation.toPath, remoteObjectId, entityKind: oldBase.entityKind });
      const nextGeneration = nextIntegratedSemanticGeneration(current.semanticGeneration);
      const nextFingerprint = fingerprint({ ...operation, path: operation.toPath }, receipt, String(remoteObjectId));
      baseAuthority.push({ path: operation.toPath, fingerprint: nextFingerprint });
      pathConvergence.push({ path: operation.toPath, state: { status: "converged", generation: nextGeneration, baseFingerprint: nextFingerprint } });
      semanticChanged = true;
    } else if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
      if (!oldBase) return { ok: false, reason: "verified deletion commit lacks prior BASE" };
      clearPath(operation.path);
      tombstones.push({
        path: operation.path,
        entityKind: oldBase.entityKind,
        deletedOn: operation.kind === "trash-remote" ? "local" : "remote",
        remoteObjectId: remoteObjectId ?? oldBase.remoteObjectId,
        sourceDeviceId: current.deviceIdentity,
      });
      semanticChanged = true;
    } else if (operation.kind === "noop" && operation.reasons.some(reason => reason.code === "both-deleted") && oldBase) {
      clearPath(operation.path);
      tombstones.push({
        path: operation.path,
        entityKind: oldBase.entityKind,
        deletedOn: "both",
        remoteObjectId: remoteObjectId ?? oldBase.remoteObjectId,
        sourceDeviceId: current.deviceIdentity,
      });
      semanticChanged = true;
    } else if (operation.kind === "noop" && operation.reasons.some(reason => reason.code === "safe-union-identical") && operation.contentVersion) {
      const problem = establishCommon(operation.path);
      if (problem) return { ok: false, reason: problem };
    }

    let candidate: DurableSynchronizationAuthorityState = {
      ...current,
      base,
      baseAuthority,
      remoteMappings: mappings,
      tombstones,
      pathConvergence,
      operations: [
        ...current.operations.filter(entry => entry.operationId !== operation.operationId),
        {
          operationId: operation.operationId,
          path: operation.path,
          status: "completed",
          verificationEvidenceRef: receipt.verificationEvidenceRef,
          checkpointId: current.operations.find(entry => entry.operationId === operation.operationId)?.checkpointId,
        },
      ],
    };

    if (semanticChanged) {
      const nextGeneration = nextIntegratedSemanticGeneration(current.semanticGeneration);
      candidate = rebaseIntegratedConvergence(candidate, nextGeneration);
    }
    return { ok: true, state: candidate };
  }
}
