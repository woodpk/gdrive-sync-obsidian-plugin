import type { DataAdapter } from "obsidian";
import {
  contractId,
  type AuthoritativeBaseTransition,
  type BaseEntry,
  type BaseFingerprint,
  type LocalMutationTransaction,
  type LocalTransactionResult,
  type LocalTransactionalMutationPort,
  type LocalVaultPort,
  type PersistenceRevision,
  type SemanticStateGeneration,
  type StateLoadContext,
  type StateLoadResult,
  type StateRevision,
  type StateSaveResult,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationCancellationSignal,
  type SynchronizationStateStore,
  type TrustedSynchronizationState,
  type VaultPath,
} from "../contracts";
import { ObsidianLocalMutationTransactions } from "../local/local-vault-access-boundary";
import {
  createInitialAuthorityState,
  type DurableSynchronizationAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  type RecoveryReplacementResult,
} from "../state/persistent-state-store";
import { sha256Text } from "../util/sha256";
import { CONFIG_REMOTE_NAMESPACE, ProductPathScope } from "./path-scope";

const vp = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");

export function nextIntegratedSemanticGeneration(current: SemanticStateGeneration): SemanticStateGeneration {
  const value = String(current);
  const match = /^(.*?)(\d+)$/.exec(value);
  const next = match ? `${match[1]}${Number(match[2]) + 1}` : `${value}:1`;
  return contractId<"SemanticStateGeneration">(next) as SemanticStateGeneration;
}

function semanticStateRevision(generation: SemanticStateGeneration): StateRevision {
  return contractId<"StateRevision">(`semantic-cas:${String(generation)}`) as StateRevision;
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

function physicalArtifactPath(target: VaultPath, role: "stage" | "backup", seed: VaultPath): VaultPath {
  const raw = normalize(String(target));
  const slash = raw.lastIndexOf("/");
  const parent = slash >= 0 ? raw.slice(0, slash) : "";
  const name = slash >= 0 ? raw.slice(slash + 1) : raw;
  const token = String(sha256Text(String(seed))).slice(0, 24);
  return vp(`${parent ? `${parent}/` : ""}.${name}.brain-sync-${role}-${token}`);
}

/**
 * B's crash-safe transaction engine owns the actual filesystem mutation. H maps
 * D's logical durable transaction into physical sibling artifacts so selective
 * configuration paths resolve correctly and staging/backup files remain inside
 * the repository's operational exclusion patterns.
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
    const target = this.physical(transaction.path);
    return {
      ...transaction,
      path: target,
      stagePath: physicalArtifactPath(target, "stage", transaction.stagePath),
      backupPath: physicalArtifactPath(target, "backup", transaction.backupPath),
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

function authorityProjection(state: DurableSynchronizationAuthorityState): string {
  return JSON.stringify({
    vaultIdentity: state.vaultIdentity,
    deviceIdentity: state.deviceIdentity,
    base: state.base,
    baseAuthority: state.baseAuthority,
    remoteMappings: state.remoteMappings,
    tombstones: state.tombstones,
    changeCursor: state.changeCursor,
    learnedRemoteBatches: state.learnedRemoteBatches,
    learnedRemoteReductions: state.learnedRemoteReductions,
    pathConvergence: state.pathConvergence,
    knownDevices: state.knownDevices,
  });
}

function legacySemanticProjection(state: TrustedSynchronizationState): string {
  return JSON.stringify({
    vaultIdentity: state.vaultIdentity,
    deviceIdentity: state.deviceIdentity,
    base: state.base,
    remoteMappings: state.remoteMappings,
    tombstones: state.tombstones,
    changeCursor: state.changeCursor,
    knownDevices: state.knownDevices,
  });
}

function factForPath(state: TrustedSynchronizationState, path: VaultPath): string {
  return JSON.stringify({
    base: state.base.filter(entry => entry.path === path),
    mapping: state.remoteMappings.filter(entry => entry.path === path),
    tombstone: state.tombstones.filter(entry => entry.path === path),
  });
}

function changedCanonicalPaths(current: TrustedSynchronizationState, candidate: TrustedSynchronizationState): readonly VaultPath[] {
  const paths = new Map<string, VaultPath>();
  for (const entry of [...current.base, ...candidate.base, ...current.remoteMappings, ...candidate.remoteMappings, ...current.tombstones, ...candidate.tombstones]) {
    paths.set(String(entry.path), entry.path);
  }
  return [...paths.values()].filter(path => factForPath(current, path) !== factForPath(candidate, path));
}

function fingerprintForBase(entry: BaseEntry): BaseFingerprint {
  const hash = sha256Text(JSON.stringify({
    path: String(entry.path),
    entityKind: entry.entityKind,
    localExisted: entry.localExisted,
    remoteExisted: entry.remoteExisted,
    remoteObjectId: entry.remoteObjectId ? String(entry.remoteObjectId) : undefined,
    content: entry.content ? {
      hash: entry.content.hash ? String(entry.content.hash) : undefined,
      sizeBytes: entry.content.sizeBytes,
      revision: entry.content.revision,
    } : undefined,
  }));
  return contractId<"BaseFingerprint">(`base:${String(hash)}`) as BaseFingerprint;
}

function canCarryExactBaseAuthority(entry: BaseEntry): boolean {
  if (!entry.localExisted || !entry.remoteExisted || !entry.remoteObjectId) return false;
  if (entry.entityKind === "folder") return true;
  return Boolean(entry.content?.hash)
    && entry.content?.sizeBytes !== undefined
    && Number.isSafeInteger(entry.content.sizeBytes)
    && entry.content.sizeBytes >= 0;
}

function reconcileCanonicalAuthority(
  current: DurableSynchronizationAuthorityState,
  legacyCandidate: TrustedSynchronizationState,
): DurableSynchronizationAuthorityState {
  const semanticChanged = legacySemanticProjection(current) !== legacySemanticProjection(legacyCandidate);
  let candidate: DurableSynchronizationAuthorityState = {
    ...current,
    base: legacyCandidate.base,
    remoteMappings: legacyCandidate.remoteMappings,
    tombstones: legacyCandidate.tombstones,
    changeCursor: legacyCandidate.changeCursor,
    operations: legacyCandidate.operations,
    knownDevices: legacyCandidate.knownDevices,
  };
  if (!semanticChanged) return candidate;

  const nextGeneration = nextIntegratedSemanticGeneration(current.semanticGeneration);
  const changed = new Set(changedCanonicalPaths(current, legacyCandidate).map(String));
  let baseAuthority = candidate.baseAuthority.filter(entry => !changed.has(String(entry.path)));
  let pathConvergence = candidate.pathConvergence.filter(entry => !changed.has(String(entry.path)));

  for (const pathValue of changed) {
    const entry = candidate.base.find(value => String(value.path) === pathValue);
    if (!entry || !canCarryExactBaseAuthority(entry)) continue;
    const mapping = candidate.remoteMappings.filter(value => value.path === entry.path);
    if (mapping.length !== 1 || mapping[0]?.remoteObjectId !== entry.remoteObjectId || mapping[0]?.entityKind !== entry.entityKind) continue;
    const fingerprint = fingerprintForBase(entry);
    baseAuthority = [...baseAuthority, { path: entry.path, fingerprint }];
    pathConvergence = [...pathConvergence, {
      path: entry.path,
      state: { status: "converged" as const, generation: nextGeneration, baseFingerprint: fingerprint },
    }];
  }

  candidate = { ...candidate, baseAuthority, pathConvergence };
  return rebaseIntegratedConvergence(candidate, nextGeneration);
}

function authorityState(value: TrustedSynchronizationState): value is DurableSynchronizationAuthorityState {
  const candidate = value as Partial<DurableSynchronizationAuthorityState>;
  return candidate.authoritySchemaVersion === 2
    && candidate.persistenceRevision !== undefined
    && candidate.semanticGeneration !== undefined
    && Array.isArray(candidate.learnedRemoteBatches)
    && Array.isArray(candidate.pathConvergence)
    && Array.isArray(candidate.operationIntents)
    && Array.isArray(candidate.localTransactions)
    && Array.isArray(candidate.baseAuthority);
}

/**
 * H's state adapter is the production compatibility layer between D's historical
 * split-store stateRevision CAS and C's single-document persistenceRevision +
 * semanticGeneration authority. D observes a semantic CAS token; all physical
 * intent/effect checkpoints still advance C's independent persistence revision.
 */
export class IntegratedSynchronizationStateStore extends PersistentSynchronizationStateStore implements SynchronizationStateStore {
  constructor(private readonly source: PersistentSynchronizationStateStore) {
    super(new MemoryStateByteStorage(), source.currentSchemaVersion);
  }

  override async load(context: StateLoadContext): Promise<StateLoadResult> {
    const loaded = await this.source.load(context);
    if (loaded.status !== "trusted" || !authorityState(loaded.state)) return loaded;
    return {
      status: "trusted",
      state: { ...loaded.state, stateRevision: semanticStateRevision(loaded.state.semanticGeneration) },
    };
  }

  override async saveTrusted(candidate: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult> {
    const authority = await this.source.loadAuthority();
    if (authority.status === "uninitialized") {
      const initial = createInitialAuthorityState({
        persistenceRevision: contractId<"PersistenceRevision">(String(candidate.stateRevision)) as PersistenceRevision,
        semanticGeneration: contractId<"SemanticStateGeneration">("semantic:0") as SemanticStateGeneration,
        vaultIdentity: candidate.vaultIdentity,
        deviceIdentity: candidate.deviceIdentity,
        schemaVersion: candidate.schemaVersion,
      });
      const saved = await this.source.saveTrusted(initial);
      return saved.status === "saved"
        ? { status: "saved", stateRevision: semanticStateRevision(initial.semanticGeneration) }
        : saved;
    }
    if (authority.status !== "trusted") return { status: "recovery-required", reason: "authoritative state requires recovery" };
    const current = authority.state;
    const semanticRevision = semanticStateRevision(current.semanticGeneration);
    if (expectedRevision && expectedRevision !== semanticRevision) return { status: "stale-revision", actualRevision: semanticRevision };

    const reconciled = reconcileCanonicalAuthority(current, candidate);
    const saved = await this.saveAuthority(reconciled, current.persistenceRevision, current.semanticGeneration);
    if (saved.status === "saved") return { status: "saved", stateRevision: semanticStateRevision(saved.semanticGeneration) };
    if (saved.status === "stale-persistence" || saved.status === "stale-semantic-authority") {
      const latest = await this.source.loadAuthority();
      return { status: "stale-revision", actualRevision: latest.status === "trusted" ? semanticStateRevision(latest.state.semanticGeneration) : undefined };
    }
    return { status: "recovery-required", reason: saved.issues.map(issue => `${issue.code}:${issue.detail}`).join("; ") };
  }

  override async loadAuthority() { return this.source.loadAuthority(); }

  override async saveAuthority(
    state: DurableSynchronizationAuthorityState,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") {
      return loaded.status === "uninitialized"
        ? { status: "stale-persistence" }
        : { status: "recovery-required", issues: loaded.issues };
    }
    const semanticChanged = authorityProjection(loaded.state) !== authorityProjection(state);
    const candidate = semanticChanged
      ? rebaseIntegratedConvergence(state, nextIntegratedSemanticGeneration(loaded.state.semanticGeneration))
      : state;
    return this.source.saveAuthority(candidate, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  override async commitBaseTransition(
    transition: AuthoritativeBaseTransition,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const first = await this.source.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration);
    if (first.status !== "saved") return first;
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized"
      ? { status: "stale-persistence" }
      : { status: "recovery-required", issues: loaded.issues };
    const staleConvergence = loaded.state.pathConvergence.some(entry => entry.state.status === "converged" && entry.state.generation !== loaded.state.semanticGeneration);
    if (!staleConvergence) return first;
    const candidate = rebaseIntegratedConvergence(loaded.state, nextIntegratedSemanticGeneration(loaded.state.semanticGeneration));
    return this.source.saveAuthority(candidate, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
  }

  override async createRecoveryBackup() { return this.source.createRecoveryBackup(); }

  override async replaceRecoveryState(state: TrustedSynchronizationState, context: StateLoadContext): Promise<RecoveryReplacementResult> {
    const replacement = authorityState(state) ? state : createInitialAuthorityState({
      persistenceRevision: contractId<"PersistenceRevision">(String(state.stateRevision)) as PersistenceRevision,
      semanticGeneration: contractId<"SemanticStateGeneration">("semantic:recovery:0") as SemanticStateGeneration,
      vaultIdentity: state.vaultIdentity,
      deviceIdentity: state.deviceIdentity,
      schemaVersion: state.schemaVersion,
    });
    const result = await this.source.replaceRecoveryState(replacement, context);
    return result.status === "replaced"
      ? { ...result, stateRevision: semanticStateRevision(replacement.semanticGeneration) }
      : result;
  }

  override async assessMigration(targetSchemaVersion: number) { return this.source.assessMigration(targetSchemaVersion); }
  override async exportDiagnosticState() { return this.source.exportDiagnosticState(); }
}
