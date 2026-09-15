import type {
  AuthoritativeSuccessCommitter,
  CheckpointId,
  CommitResult,
  OperationJournalEntry,
  PlannedOperation,
  StateLoadContext,
  StateRevision,
  SynchronizationStateStore,
  TrustedSynchronizationState,
  VerifiedExecutionReceipt,
} from "../contracts";
import { contractId } from "../contracts";

const TRANSITIVELY_CARRIED_MOVE_REASON = "ancestor-folder-move-carried-descendant";

function nextRevision(current: StateRevision): StateRevision {
  const value = String(current);
  const match = /^(.*?)(\d+)$/.exec(value);
  const next = match ? `${match[1]}${Number(match[2]) + 1}` : `${value}:1`;
  return contractId<"StateRevision">(next) as StateRevision;
}

function upsertJournal(state: TrustedSynchronizationState, entry: OperationJournalEntry): readonly OperationJournalEntry[] {
  const retained = state.operations.filter(item => item.operationId !== entry.operationId);
  return [...retained, entry];
}

function transitivelyCarriedMove(operation: PlannedOperation): boolean {
  return operation.kind === "noop"
    && Boolean(operation.fromPath)
    && Boolean(operation.toPath)
    && Boolean(operation.remoteObjectId)
    && Boolean(operation.contentVersion)
    && operation.reasons.some(reason => reason.code === TRANSITIVELY_CARRIED_MOVE_REASON);
}

function applySuccessfulOperation(state: TrustedSynchronizationState, operation: PlannedOperation, receipt: VerifiedExecutionReceipt): TrustedSynchronizationState {
  let base = [...state.base];
  let mappings = [...state.remoteMappings];
  let tombstones = [...state.tombstones];
  const oldBase = base.find(entry => entry.path === operation.path || (operation.fromPath && entry.path === operation.fromPath));
  const entityKind = operation.contentVersion?.entityKind ?? oldBase?.entityKind ?? "file";
  const remoteObjectId = receipt.resultingRemoteObjectId ?? operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId ?? oldBase?.remoteObjectId;
  const localOnlyConflictCopy = operation.kind === "download-create" && operation.contentVersion !== undefined && operation.path !== operation.contentVersion.path;

  if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
    base = base.filter(entry => entry.path !== operation.path);
    base.push({
      path: operation.path,
      entityKind,
      localExisted: true,
      remoteExisted: !localOnlyConflictCopy,
      content: receipt.evidence ?? operation.contentVersion?.content,
      remoteObjectId: localOnlyConflictCopy ? undefined : remoteObjectId,
    });
    tombstones = tombstones.filter(entry => entry.path !== operation.path);
    if (!localOnlyConflictCopy && remoteObjectId) {
      mappings = mappings.filter(mapping => mapping.remoteObjectId !== remoteObjectId && mapping.path !== operation.path);
      mappings.push({ path: operation.path, remoteObjectId, entityKind });
    }
  } else if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    base = base.filter(entry => entry.path !== operation.path);
    mappings = mappings.filter(mapping => mapping.path !== operation.path);
    tombstones = tombstones.filter(entry => entry.path !== operation.path);
    tombstones.push({
      path: operation.path,
      entityKind,
      deletedOn: operation.kind === "trash-remote" ? "local" : "remote",
      remoteObjectId,
      sourceDeviceId: state.deviceIdentity,
    });
  } else if (operation.kind === "noop" && operation.reasons.some(reason => reason.code === "both-deleted") && oldBase) {
    base = base.filter(entry => entry.path !== operation.path);
    mappings = mappings.filter(mapping => mapping.path !== operation.path);
    tombstones = tombstones.filter(entry => entry.path !== operation.path);
    tombstones.push({
      path: operation.path,
      entityKind,
      deletedOn: "both",
      remoteObjectId,
      sourceDeviceId: state.deviceIdentity,
    });
  } else if (operation.kind === "noop" && operation.reasons.some(reason => reason.code === "safe-union-identical") && operation.contentVersion) {
    base = base.filter(entry => entry.path !== operation.path);
    base.push({
      path: operation.path,
      entityKind,
      localExisted: true,
      remoteExisted: true,
      content: receipt.evidence ?? operation.contentVersion.content,
      remoteObjectId,
    });
    tombstones = tombstones.filter(entry => entry.path !== operation.path);
    if (remoteObjectId) {
      mappings = mappings.filter(mapping => mapping.remoteObjectId !== remoteObjectId && mapping.path !== operation.path);
      mappings.push({ path: operation.path, remoteObjectId, entityKind });
    }
  } else if (transitivelyCarriedMove(operation) && operation.fromPath && operation.toPath && operation.contentVersion && remoteObjectId) {
    base = base.filter(entry => entry.path !== operation.fromPath && entry.path !== operation.toPath);
    base.push({
      path: operation.toPath,
      entityKind: operation.contentVersion.entityKind,
      localExisted: true,
      remoteExisted: true,
      content: receipt.evidence ?? operation.contentVersion.content,
      remoteObjectId,
    });
    mappings = mappings.filter(mapping => mapping.remoteObjectId !== remoteObjectId && mapping.path !== operation.fromPath && mapping.path !== operation.toPath);
    mappings.push({ path: operation.toPath, remoteObjectId, entityKind: operation.contentVersion.entityKind });
    tombstones = tombstones.filter(entry => entry.path !== operation.fromPath && entry.path !== operation.toPath);
  } else if (operation.kind === "identity-preserving-move" && operation.fromPath && operation.toPath) {
    base = base.filter(entry => entry.path !== operation.fromPath && entry.path !== operation.toPath);
    base.push({
      path: operation.toPath,
      entityKind,
      localExisted: true,
      remoteExisted: true,
      content: receipt.evidence ?? oldBase?.content,
      remoteObjectId,
    });
    tombstones = tombstones.filter(entry => entry.path !== operation.fromPath && entry.path !== operation.toPath);
    if (remoteObjectId) {
      mappings = mappings.filter(mapping => mapping.remoteObjectId !== remoteObjectId && mapping.path !== operation.fromPath && mapping.path !== operation.toPath);
      mappings.push({ path: operation.toPath, remoteObjectId, entityKind });
    }
  }

  return { ...state, base, remoteMappings: mappings, tombstones };
}

/** Coordinates durable operation journal state with verified effects. */
export class StateCommitCoordinator implements AuthoritativeSuccessCommitter {
  constructor(private readonly store: SynchronizationStateStore, private readonly context: StateLoadContext) {}

  async markPending(operation: PlannedOperation, expectedStateRevision?: StateRevision, checkpointId?: CheckpointId): Promise<CommitResult> {
    return this.writeJournal(operation, { operationId: operation.operationId, path: operation.path, status: "pending", checkpointId }, expectedStateRevision);
  }

  async markUncertain(operation: PlannedOperation, expectedStateRevision?: StateRevision, checkpointId?: CheckpointId): Promise<CommitResult> {
    return this.writeJournal(operation, { operationId: operation.operationId, path: operation.path, status: "uncertain", checkpointId }, expectedStateRevision);
  }

  /** Remove an exact known-unmutated pending intent after a mutation-boundary stale check. */
  async discardPending(operation: PlannedOperation, expectedStateRevision: StateRevision): Promise<CommitResult> {
    const loaded = await this.store.load(this.context);
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `trusted state unavailable while retiring stale intent: ${loaded.status}` };
    if (loaded.state.stateRevision !== expectedStateRevision) return { status: "stale-state", actualRevision: loaded.state.stateRevision };
    const pending = loaded.state.operations.find(item => item.operationId === operation.operationId);
    if (!pending || pending.status !== "pending" || pending.path !== operation.path) {
      return { status: "recovery-required", reason: "stale intent cannot be retired because its exact pending journal is unavailable" };
    }
    const updated: TrustedSynchronizationState = {
      ...loaded.state,
      stateRevision: nextRevision(loaded.state.stateRevision),
      operations: loaded.state.operations.filter(item => item.operationId !== operation.operationId),
    };
    const saved = await this.store.saveTrusted(updated, loaded.state.stateRevision);
    if (saved.status === "saved") return { status: "committed", newStateRevision: saved.stateRevision };
    if (saved.status === "stale-revision") return { status: "stale-state", actualRevision: saved.actualRevision };
    return { status: "recovery-required", reason: saved.reason };
  }

  async commitVerifiedSuccess(operation: PlannedOperation, receipt: VerifiedExecutionReceipt, expectedStateRevision?: StateRevision): Promise<CommitResult> {
    if (receipt.operationId !== operation.operationId) return { status: "recovery-required", reason: "execution receipt does not match planned operation" };
    if (receipt.durable !== true || receipt.integrityVerified !== true) return { status: "recovery-required", reason: "authoritative commit requires durable integrity-verified execution" };
    const loaded = await this.store.load(this.context);
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `trusted state unavailable during success commit: ${loaded.status}` };
    if (expectedStateRevision && loaded.state.stateRevision !== expectedStateRevision) return { status: "stale-state", actualRevision: loaded.state.stateRevision };
    if (transitivelyCarriedMove(operation)) {
      const oldBase = loaded.state.base.filter(entry => entry.path === operation.fromPath);
      const byPath = loaded.state.remoteMappings.filter(mapping => mapping.path === operation.fromPath);
      const byId = loaded.state.remoteMappings.filter(mapping => mapping.remoteObjectId === operation.remoteObjectId);
      if (oldBase.length !== 1
        || oldBase[0]?.remoteObjectId !== operation.remoteObjectId
        || byPath.length !== 1
        || byId.length !== 1
        || byPath[0]?.remoteObjectId !== operation.remoteObjectId
        || byId[0]?.path !== operation.fromPath) {
        return { status: "recovery-required", reason: "verified carried descendant no longer has one exact canonical predecessor to rebase" };
      }
    }

    const priorJournal = loaded.state.operations.find(item => item.operationId === operation.operationId);
    const updatedEffectState = applySuccessfulOperation(loaded.state, operation, receipt);
    const newStateRevision = nextRevision(loaded.state.stateRevision);
    const updated: TrustedSynchronizationState = {
      ...updatedEffectState,
      stateRevision: newStateRevision,
      operations: upsertJournal(updatedEffectState, {
        operationId: operation.operationId,
        path: operation.path,
        status: "completed",
        verificationEvidenceRef: receipt.verificationEvidenceRef,
        checkpointId: priorJournal?.checkpointId,
      }),
    };
    const saved = await this.store.saveTrusted(updated, loaded.state.stateRevision);
    if (saved.status === "saved") return { status: "committed", newStateRevision: saved.stateRevision };
    if (saved.status === "stale-revision") return { status: "stale-state", actualRevision: saved.actualRevision };
    return { status: "recovery-required", reason: saved.reason };
  }

  private async writeJournal(operation: PlannedOperation, entry: OperationJournalEntry, expectedStateRevision?: StateRevision): Promise<CommitResult> {
    const loaded = await this.store.load(this.context);
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `trusted state unavailable while journaling: ${loaded.status}` };
    if (expectedStateRevision && loaded.state.stateRevision !== expectedStateRevision) return { status: "stale-state", actualRevision: loaded.state.stateRevision };
    const updated: TrustedSynchronizationState = {
      ...loaded.state,
      stateRevision: nextRevision(loaded.state.stateRevision),
      operations: upsertJournal(loaded.state, entry),
    };
    const saved = await this.store.saveTrusted(updated, loaded.state.stateRevision);
    if (saved.status === "saved") return { status: "committed", newStateRevision: saved.stateRevision };
    if (saved.status === "stale-revision") return { status: "stale-state", actualRevision: saved.actualRevision };
    return { status: "recovery-required", reason: saved.reason };
  }
}
