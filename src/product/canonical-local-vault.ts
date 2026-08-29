import type {
  ConfigurationClassification,
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
import { sha256BinarySource } from "../util/sha256";

interface CachedEvidence { readonly token: ObservationToken; readonly hash: Awaited<ReturnType<typeof sha256BinarySource>>; }
export interface CanonicalEvidenceOptions { readonly staleRetryAttempts?: number; readonly staleRetryDelayMs?: number; }

function sleep(milliseconds: number): Promise<void> { return new Promise(resolve => globalThis.setTimeout(resolve, milliseconds)); }
function staleObservationError(error: unknown): boolean {
  return error instanceof Error && (error.name === "LocalStaleObservationError" || /^Local observation became stale:/u.test(error.message));
}

/**
 * Phase-5 production evidence decorator. Stable files receive a canonical SHA-256
 * before planner input is created. The opaque observation token is only a cache
 * predicate; it is never winner/authority evidence.
 */
export class CanonicalEvidenceLocalVault implements LocalVaultPort {
  private readonly cache = new Map<string, CachedEvidence>();
  private readonly staleRetryAttempts: number;
  private readonly staleRetryDelayMs: number;
  constructor(private readonly inner: LocalVaultPort, options: CanonicalEvidenceOptions = {}) {
    this.staleRetryAttempts = options.staleRetryAttempts ?? 3;
    this.staleRetryDelayMs = options.staleRetryDelayMs ?? 25;
    if (!Number.isSafeInteger(this.staleRetryAttempts) || this.staleRetryAttempts < 1) throw new Error("staleRetryAttempts must be a positive safe integer");
    if (!Number.isSafeInteger(this.staleRetryDelayMs) || this.staleRetryDelayMs < 0) throw new Error("staleRetryDelayMs must be a non-negative safe integer");
  }

  activeConfigurationDirectory(): Promise<VaultPath> { return this.inner.activeConfigurationDirectory(); }

  async enumerate(): Promise<LocalVaultListing> {
    const listing = await this.inner.enumerate();
    const entries: LocalObservation[] = [];
    for (const observation of listing.entries) {
      const enriched = await this.enrich(observation);
      entries.push(enriched);
    }
    // Per-file canonical-content uncertainty is represented on that path. Only
    // the wrapped enumerator may determine whether the directory listing itself
    // was incomplete.
    return { entries, completeness: listing.completeness };
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
  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe { return this.inner.onChange(change => { this.invalidateChange(change); listener(change); }); }
  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return this.inner.onLifecycle(listener); }

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
    // A bounded stale-observation retry was exhausted. Preserve path-local
    // presence without promoting any incomplete content evidence.
    return { ...original, content: undefined, stability: "unstable", observationToken: undefined };
  }

  private invalidateChange(change: LocalVaultChange): void {
    if (change.kind === "renamed") { this.cache.delete(String(change.fromPath)); this.cache.delete(String(change.toPath)); }
    else this.cache.delete(String(change.path));
  }
}
