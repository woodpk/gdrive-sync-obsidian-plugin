import {
  contractId,
  type AuthoritativeBaseTransition,
  type BaseEntry,
  type BaseFingerprint,
  type PersistenceRevision,
  type SemanticStateGeneration,
  type StateLoadContext,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type SynchronizationStateStore,
  type TrustedSynchronizationState,
} from "../contracts";
import { sha256Text } from "../util/sha256";

function sortedBy<T>(values: readonly T[], key: (value: T) => string): readonly T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

function semanticGeneration(state: TrustedSynchronizationState): SemanticStateGeneration {
  const semantic = {
    base: sortedBy(state.base, entry => String(entry.path)).map(entry => ({
      path: String(entry.path),
      entityKind: entry.entityKind,
      localExisted: entry.localExisted,
      remoteExisted: entry.remoteExisted,
      content: entry.content
        ? {
            hash: entry.content.hash ? String(entry.content.hash) : undefined,
            sizeBytes: entry.content.sizeBytes,
            revision: entry.content.revision,
          }
        : undefined,
      remoteObjectId: entry.remoteObjectId ? String(entry.remoteObjectId) : undefined,
    })),
    remoteMappings: sortedBy(state.remoteMappings, entry => `${String(entry.path)}\u0000${String(entry.remoteObjectId)}`).map(entry => ({
      path: String(entry.path),
      entityKind: entry.entityKind,
      remoteObjectId: String(entry.remoteObjectId),
    })),
    tombstones: sortedBy(state.tombstones, entry => String(entry.path)).map(entry => ({
      path: String(entry.path),
      entityKind: entry.entityKind,
      deletedOn: entry.deletedOn,
      remoteObjectId: entry.remoteObjectId ? String(entry.remoteObjectId) : undefined,
      sourceDeviceId: String(entry.sourceDeviceId),
    })),
    changeCursor: state.changeCursor ? String(state.changeCursor) : undefined,
  };
  return contractId<"SemanticStateGeneration">(`semantic:${String(sha256Text(JSON.stringify(semantic)))}`) as SemanticStateGeneration;
}

function baseFingerprint(entry: BaseEntry): BaseFingerprint {
  const exact = {
    path: String(entry.path),
    entityKind: entry.entityKind,
    localExisted: entry.localExisted,
    remoteExisted: entry.remoteExisted,
    content: entry.content
      ? {
          hash: entry.content.hash ? String(entry.content.hash) : undefined,
          sizeBytes: entry.content.sizeBytes,
          revision: entry.content.revision,
        }
      : undefined,
    remoteObjectId: entry.remoteObjectId ? String(entry.remoteObjectId) : undefined,
  };
  return contractId<"BaseFingerprint">(`base:${String(sha256Text(JSON.stringify(exact)))}`) as BaseFingerprint;
}

function deriveAuthority(state: TrustedSynchronizationState): SynchronizationAuthorityMetadataV1_1 {
  const generation = semanticGeneration(state);
  return {
    persistenceRevision: state.stateRevision as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: state.base.map(entry => ({
      path: entry.path,
      state: { status: "converged", generation, baseFingerprint: baseFingerprint(entry) },
    })),
    operationIntents: [],
    localTransactions: [],
  };
}

function recoveryIssue(detail: string) {
  return [{ code: "other-semantic-inconsistency" as const, detail, invariantCategory: "trusted-state-authority-bridge" }];
}

/**
 * Production bridge from the already durable trusted synchronization state to
 * the frozen v1.1 authority read model. It does not accept shadow authority
 * writes: verified operation results continue to commit through the canonical
 * SynchronizationStateStore, and the next authority read is derived from that
 * durable state.
 */
export class TrustedStateSynchronizationAuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  constructor(
    private readonly stateStore: SynchronizationStateStore,
    private readonly context: StateLoadContext,
  ) {}

  async loadAuthority() {
    const loaded = await this.stateStore.load(this.context);
    if (loaded.status === "uninitialized") return { status: "uninitialized" as const };
    if (loaded.status === "recovery-required") {
      return { status: "recovery-required" as const, issues: recoveryIssue(`trusted synchronization state requires recovery: ${loaded.reason}`) };
    }
    return { status: "trusted" as const, state: deriveAuthority(loaded.state) };
  }

  async saveAuthority(
    state: SynchronizationAuthorityMetadataV1_1,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") {
      return { status: "recovery-required", issues: loaded.status === "recovery-required" ? loaded.issues : recoveryIssue("trusted synchronization state is uninitialized") };
    }
    if (loaded.state.persistenceRevision !== expectedPersistenceRevision) {
      return { status: "stale-persistence", actualPersistenceRevision: loaded.state.persistenceRevision };
    }
    if (expectedSemanticGeneration && loaded.state.semanticGeneration !== expectedSemanticGeneration) {
      return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    }
    if (state.semanticGeneration !== loaded.state.semanticGeneration) {
      return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    }
    return {
      status: "saved",
      persistenceRevision: loaded.state.persistenceRevision,
      semanticGeneration: loaded.state.semanticGeneration,
    };
  }

  async commitBaseTransition(
    _transition: AuthoritativeBaseTransition,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") {
      return { status: "recovery-required", issues: loaded.status === "recovery-required" ? loaded.issues : recoveryIssue("trusted synchronization state is uninitialized") };
    }
    if (loaded.state.persistenceRevision !== expectedPersistenceRevision) {
      return { status: "stale-persistence", actualPersistenceRevision: loaded.state.persistenceRevision };
    }
    if (loaded.state.semanticGeneration !== expectedSemanticGeneration) {
      return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    }
    return { status: "recovery-required", issues: recoveryIssue("BASE transitions must commit through the verified canonical state committer; shadow authority mutation is disabled") };
  }
}
