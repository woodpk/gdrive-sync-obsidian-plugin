import type {
  ConfigurationClassification,
  LocalIntegrityReconciliationPort,
  LocalLifecycleEvent,
  LocalMutationReceipt,
  LocalReadResult,
  LocalVaultChange,
  LocalVaultListing,
  LocalVaultPort,
  ObservationToken,
  PathValidationResult,
  Unsubscribe,
  VaultPath,
} from "../contracts";
import type { LocalObservation } from "../contracts/snapshot";
import type {
  LocalMutationProvenance,
  LocalMutationTransaction,
  LocalTransactionalMutationPort,
  LocalTransactionResult,
  SynchronizationCancellationSignal,
} from "../contracts/synchronization-foundation";
import { sha256BinarySource } from "../util/sha256";

interface CachedEvidence { readonly token: ObservationToken; readonly hash: Awaited<ReturnType<typeof sha256BinarySource>>; }
export interface CanonicalEvidenceOptions { readonly staleRetryAttempts?: number; readonly staleRetryDelayMs?: number; }

interface ActiveMutationCorrelation {
  readonly transaction: LocalMutationTransaction;
  readonly provenance: Omit<LocalMutationProvenance, "expectedResultToken">;
  readonly pending: LocalVaultChange[];
}

function sleep(milliseconds: number): Promise<void> { return new Promise(resolve => globalThis.setTimeout(resolve, milliseconds)); }
function staleObservationError(error: unknown): boolean {
  return error instanceof Error && (error.name === "LocalStaleObservationError" || /^Local observation became stale:/u.test(error.message));
}

function changeTouches(change: LocalVaultChange, path: VaultPath): boolean {
  return change.kind === "renamed"
    ? change.fromPath === path || change.toPath === path
    : change.path === path;
}

/**
 * Phase-5 production evidence decorator, extended by Phase 6 Workstream B.
 * Stable files receive canonical SHA-256 evidence. Ordinary observations may
 * use the opaque observation-token cache; authoritative integrity reads never
 * do. The class can also front the frozen crash-safe transaction port so
 * self-generated watcher hints are coalesced only when exact transaction/result
 * provenance proves they are the plugin's own physical effect.
 */
export class CanonicalEvidenceLocalVault implements LocalVaultPort, LocalIntegrityReconciliationPort, LocalTransactionalMutationPort {
  private readonly cache = new Map<string, CachedEvidence>();
  private readonly staleRetryAttempts: number;
  private readonly staleRetryDelayMs: number;
  private readonly changeListeners = new Set<(change: LocalVaultChange) => void>();
  private activeMutation?: ActiveMutationCorrelation;
  private innerChangeUnsubscribe?: Unsubscribe;

  constructor(
    private readonly inner: LocalVaultPort,
    options: CanonicalEvidenceOptions = {},
    private readonly transactional?: LocalTransactionalMutationPort,
  ) {
    this.staleRetryAttempts = options.staleRetryAttempts ?? 3;
    this.staleRetryDelayMs = options.staleRetryDelayMs ?? 25;
    if (!Number.isSafeInteger(this.staleRetryAttempts) || this.staleRetryAttempts < 1) throw new Error("staleRetryAttempts must be a positive safe integer");
    if (!Number.isSafeInteger(this.staleRetryDelayMs) || this.staleRetryDelayMs < 0) throw new Error("staleRetryDelayMs must be a non-negative safe integer");
  }

  activeConfigurationDirectory(): Promise<VaultPath> { return this.inner.activeConfigurationDirectory(); }

  async enumerate(): Promise<LocalVaultListing> {
    const listing = await this.inner.enumerate();
    const entries: LocalObservation[] = [];
    for (const observation of listing.entries) entries.push(await this.enrich(observation));
    return { ...listing, entries };
  }

  async observe(path: VaultPath): Promise<LocalObservation> { return this.enrich(await this.inner.observe(path)); }

  async readFile(path: VaultPath, expectedToken?: ObservationToken): Promise<LocalReadResult> {
    const observed = await this.observe(path);
    if (observed.status !== "present" || observed.entityKind !== "file" || observed.stability !== "stable" || !observed.observationToken || !observed.content?.hash) {
      throw new Error(`Canonical stable local file evidence unavailable: ${String(path)} (${observed.status})`);
    }
    if (expectedToken && expectedToken !== observed.observationToken) throw new Error(`Local observation became stale: ${String(path)}`);
    const result = await this.inner.readFile(path, observed.observationToken);
    return {
      ...result,
      evidence: { ...result.evidence, hash: observed.content.hash },
      observationToken: observed.observationToken,
    };
  }

  /**
   * Authoritative integrity seam. This intentionally starts below this
   * decorator's evidence cache, consumes the current bytes, hashes them, then
   * proves the file remained the same stable observation across the read.
   */
  async readFileBypassingEvidenceCache(path: VaultPath): Promise<LocalReadResult> {
    let current = await this.inner.observe(path);
    for (let attempt = 0; attempt < this.staleRetryAttempts; attempt += 1) {
      if (current.status !== "present" || current.entityKind !== "file" || current.stability !== "stable" || !current.observationToken) {
        throw new Error(`Authoritative local integrity evidence unavailable: ${String(path)} (${current.status})`);
      }
      const token = current.observationToken;
      try {
        const read = await this.inner.readFile(path, token);
        const hash = await sha256BinarySource(read.content);
        const after = await this.inner.observe(path);
        if (after.status === "present" && after.entityKind === "file" && after.stability === "stable" && after.observationToken === token) {
          this.cache.set(String(path), { token, hash });
          return {
            ...read,
            evidence: { ...read.evidence, ...after.content, hash },
            observationToken: token,
          };
        }
        current = after;
      } catch (error) {
        if (!staleObservationError(error)) throw error;
        current = await this.inner.observe(path);
      }
      if (attempt + 1 < this.staleRetryAttempts && this.staleRetryDelayMs) await sleep(this.staleRetryDelayMs * (attempt + 1));
    }
    throw new Error(`Authoritative local integrity read remained unstable after bounded retries: ${String(path)}`);
  }

  async createFile(path: VaultPath, content: Parameters<LocalVaultPort["createFile"]>[1]): Promise<LocalMutationReceipt> {
    await this.inner.createFile(path, content); return this.canonicalReceipt(path);
  }
  async replaceFile(path: VaultPath, content: Parameters<LocalVaultPort["replaceFile"]>[1], expectedToken?: ObservationToken): Promise<LocalMutationReceipt> {
    await this.inner.replaceFile(path, content, expectedToken); return this.canonicalReceipt(path);
  }
  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> { return this.inner.createFolder(path); }
  async move(fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt> {
    this.cache.delete(String(fromPath)); await this.inner.move(fromPath, toPath); return this.canonicalReceipt(toPath);
  }
  async trash(path: VaultPath): Promise<void> { this.cache.delete(String(path)); await this.inner.trash(path); }
  validatePath(path: VaultPath): Promise<PathValidationResult> { return this.inner.validatePath(path); }
  classifyConfiguration(path: VaultPath): Promise<ConfigurationClassification> { return this.inner.classifyConfiguration(path); }

  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe {
    this.changeListeners.add(listener);
    if (!this.innerChangeUnsubscribe) this.innerChangeUnsubscribe = this.inner.onChange(change => this.handleInnerChange(change));
    return () => {
      this.changeListeners.delete(listener);
      if (this.changeListeners.size === 0) {
        this.innerChangeUnsubscribe?.();
        this.innerChangeUnsubscribe = undefined;
      }
    };
  }
  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return this.inner.onLifecycle(listener); }

  async stageAndVerify(
    transaction: LocalMutationTransaction,
    content: Parameters<LocalTransactionalMutationPort["stageAndVerify"]>[1],
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResult> {
    return this.requireTransactional().stageAndVerify(transaction, content, cancellation);
  }

  async commitVerifiedStage(
    transaction: LocalMutationTransaction,
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResult> {
    const active = this.beginMutationCorrelation(transaction);
    try {
      const result = await this.requireTransactional().commitVerifiedStage(transaction, cancellation);
      await this.finishMutationCorrelation(active, result);
      if (result.status === "committed" || result.status === "recovered") this.cache.delete(String(transaction.path));
      return result;
    } catch (error) {
      this.flushCorrelation(active);
      throw error;
    }
  }

  async recover(
    transaction: LocalMutationTransaction,
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResult> {
    const active = this.beginMutationCorrelation(transaction);
    try {
      const result = await this.requireTransactional().recover(transaction, cancellation);
      await this.finishMutationCorrelation(active, result);
      if (result.status === "committed" || result.status === "recovered") this.cache.delete(String(transaction.path));
      return result;
    } catch (error) {
      this.flushCorrelation(active);
      throw error;
    }
  }

  private requireTransactional(): LocalTransactionalMutationPort {
    if (!this.transactional) throw new Error("Crash-safe local transactional mutation backend is not configured");
    return this.transactional;
  }

  private beginMutationCorrelation(transaction: LocalMutationTransaction): ActiveMutationCorrelation {
    if (this.activeMutation) throw new Error("Local mutation provenance correlation is already active");
    const active: ActiveMutationCorrelation = {
      transaction,
      provenance: { source: "brain-sync", operationId: transaction.operationId, transactionId: transaction.transactionId },
      pending: [],
    };
    this.activeMutation = active;
    return active;
  }

  private async finishMutationCorrelation(active: ActiveMutationCorrelation, result: LocalTransactionResult): Promise<void> {
    if (this.activeMutation !== active) return;
    this.activeMutation = undefined;
    if ((result.status !== "committed" && result.status !== "recovered") || !result.resultingObservationToken) {
      this.emitChanges(active.pending);
      return;
    }
    const observed = await this.inner.observe(active.transaction.path);
    const exactResult = observed.status === "present"
      && observed.entityKind === "file"
      && observed.stability === "stable"
      && observed.observationToken === result.resultingObservationToken;
    const structuralOnly = active.pending.every(change => this.isExactTransactionStructuralHint(change, active.transaction));
    if (!exactResult || !structuralOnly) this.emitChanges(active.pending);
    // When both predicates hold, every held hint is explained by the exact
    // operation/transaction and exact resulting token and can be coalesced.
  }

  private isExactTransactionStructuralHint(change: LocalVaultChange, transaction: LocalMutationTransaction): boolean {
    if (change.kind !== "renamed") return false;
    if (transaction.mutationKind === "create") {
      return change.fromPath === transaction.stagePath && change.toPath === transaction.path;
    }
    return (change.fromPath === transaction.path && change.toPath === transaction.backupPath)
      || (change.fromPath === transaction.stagePath && change.toPath === transaction.path);
  }

  private flushCorrelation(active: ActiveMutationCorrelation): void {
    if (this.activeMutation === active) this.activeMutation = undefined;
    this.emitChanges(active.pending);
  }

  private handleInnerChange(change: LocalVaultChange): void {
    this.invalidateChange(change);
    const active = this.activeMutation;
    if (active && changeTouches(change, active.transaction.path)) {
      active.pending.push(change);
      return;
    }
    this.emitChanges([change]);
  }

  private emitChanges(changes: readonly LocalVaultChange[]): void {
    for (const change of changes) for (const listener of this.changeListeners) listener(change);
  }

  private async canonicalReceipt(path: VaultPath): Promise<LocalMutationReceipt> {
    this.cache.delete(String(path));
    const observed = await this.observe(path);
    return observed.status === "present" ? { path, evidence: observed.content, observationToken: observed.observationToken } : { path };
  }

  private async enrich(observation: LocalObservation): Promise<LocalObservation> {
    if (observation.status !== "present" || observation.entityKind !== "file") return observation;
    if (observation.stability !== "stable" || !observation.observationToken) return observation;
    const original = observation;
    let current: LocalObservation = observation;
    for (let attempt = 0; attempt < this.staleRetryAttempts; attempt += 1) {
      if (current.status !== "present" || current.entityKind !== "file" || current.stability !== "stable" || !current.observationToken) {
        if (attempt + 1 < this.staleRetryAttempts) {
          if (this.staleRetryDelayMs) await sleep(this.staleRetryDelayMs * (attempt + 1));
          current = await this.inner.observe(original.path);
          continue;
        }
        break;
      }
      const key = String(current.path), cached = this.cache.get(key);
      if (cached?.token === current.observationToken) return { ...current, content: { ...current.content, hash: cached.hash } };
      try {
        const read = await this.inner.readFile(current.path, current.observationToken);
        const hash = await sha256BinarySource(read.content);
        const after = await this.inner.observe(current.path);
        if (after.status === "present" && after.entityKind === "file" && after.stability === "stable" && after.observationToken === current.observationToken) {
          this.cache.set(key, { token: current.observationToken, hash });
          return { ...after, content: { ...after.content, hash } };
        }
        current = after;
      } catch (error) {
        if (!staleObservationError(error)) {
          return { status: "unknown", side: "local", path: current.path, reason: `canonical SHA-256 evidence unavailable: ${error instanceof Error ? error.message : String(error)}` };
        }
        current = await this.inner.observe(original.path);
      }
      if (attempt + 1 < this.staleRetryAttempts && this.staleRetryDelayMs) await sleep(this.staleRetryDelayMs * (attempt + 1));
    }
    return { ...original, content: undefined, stability: "unstable", observationToken: undefined };
  }

  private invalidateChange(change: LocalVaultChange): void {
    if (change.kind === "renamed") { this.cache.delete(String(change.fromPath)); this.cache.delete(String(change.toPath)); }
    else this.cache.delete(String(change.path));
  }
}
