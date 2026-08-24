import type { App, DataAdapter, Stat, TAbstractFile } from "obsidian";
import { contractId, type BinaryContentSource, type ObservationToken, type VaultPath } from "../contracts/common";
import type {
  ConfigurationClassification,
  LocalLifecycleEvent,
  LocalMutationReceipt,
  LocalReadResult,
  LocalVaultChange,
  LocalVaultListing,
  LocalVaultPort,
  PathValidationResult,
  Unsubscribe
} from "../contracts/local-vault";
import type { LocalObservation } from "../contracts/snapshot";
import { SelectiveConfigurationPolicy } from "./config-policy";
import { LocalExclusionPolicy } from "./exclusions";
import { normalizeVaultPath, validateCrossPlatformPath } from "./path-policy";

interface VaultWithConfigDir {
  readonly configDir: string;
}

interface LocalAdapterOptions {
  readonly exclusionPolicy?: LocalExclusionPolicy;
  readonly configurationPolicy?: SelectiveConfigurationPolicy;
  readonly stabilityDelayMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export class LocalPlatformCapabilityError extends Error {
  constructor(readonly capability: string, message: string) {
    super(message);
    this.name = "LocalPlatformCapabilityError";
  }
}

export class LocalStaleObservationError extends Error {
  constructor(readonly path: VaultPath) {
    super(`Local observation became stale: ${String(path)}`);
    this.name = "LocalStaleObservationError";
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => globalThis.setTimeout(resolve, milliseconds));
}

function asPath(path: string): VaultPath {
  return normalizeVaultPath(path) as VaultPath;
}

function statToken(path: string, stat: Stat, generation: number): ObservationToken {
  // mtime participates only in an opaque stale-precondition token. It is never
  // used to choose a synchronization winner or infer authority.
  return contractId<"ObservationToken">(`${normalizeVaultPath(path)}|${stat.type}|${stat.size}|${stat.mtime}|g${generation}`);
}

function sameStat(left: Stat | null, right: Stat | null): boolean {
  if (!left || !right) return false;
  return left.type === right.type && left.size === right.size && left.mtime === right.mtime;
}

function classifyFailure(path: VaultPath, error: unknown): LocalObservation {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLocaleLowerCase("en-US");
  if (lower.includes("permission") || lower.includes("denied") || lower.includes("access")) {
    return { status: "inaccessible", side: "local", path, reason: message };
  }
  if (lower.includes("read") || lower.includes("io") || lower.includes("i/o")) {
    return { status: "unreadable", side: "local", path, reason: message };
  }
  return { status: "unknown", side: "local", path, reason: message };
}

function chunkArrayBuffer(chunk: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(chunk.byteLength);
  copy.set(chunk);
  return copy.buffer;
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function baseName(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? path : path.slice(slash + 1);
}

function temporarySibling(path: string, purpose: "stage" | "backup"): string {
  const parent = parentPath(path);
  const leaf = baseName(path);
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${parent ? `${parent}/` : ""}.${leaf}.brain-sync-${purpose}-${id}`;
}

class ResourceFetchContentSource implements BinaryContentSource {
  readonly sizeBytes?: number;

  constructor(
    private readonly owner: ObsidianLocalVaultAdapter,
    private readonly path: VaultPath,
    private readonly expectedToken: ObservationToken,
    sizeBytes: number | undefined,
    private readonly fetchImpl: typeof fetch
  ) {
    this.sizeBytes = sizeBytes;
  }

  async *openChunks(): AsyncIterable<Uint8Array> {
    await this.owner.assertToken(this.path, this.expectedToken);
    const resourceUrl = this.owner.adapter.getResourcePath(String(this.path));
    const response = await this.fetchImpl(resourceUrl);
    if (!response.ok) throw new Error(`Unable to open local resource ${String(this.path)}: HTTP ${response.status}`);
    if (!response.body) {
      throw new LocalPlatformCapabilityError(
        "incremental-local-read",
        "This runtime does not expose a ReadableStream for Obsidian local resources; whole-file readBinary fallback is intentionally prohibited for large-file safety."
      );
    }
    const reader = response.body.getReader();
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        if (result.value.byteLength > 0) yield result.value;
      }
    } finally {
      reader.releaseLock();
    }
    await this.owner.assertToken(this.path, this.expectedToken);
  }
}

/**
 * Production Phase 4 implementation of the frozen LocalVaultPort.
 *
 * It uses only Obsidian's platform-neutral DataAdapter/FileManager surfaces
 * plus browser APIs available to desktop and mobile WebViews. It contains no
 * synchronization planning, remote access, or product scheduling policy.
 */
export class ObsidianLocalVaultAdapter implements LocalVaultPort {
  readonly adapter: DataAdapter;
  private readonly exclusionPolicy: LocalExclusionPolicy;
  private readonly configurationPolicy: SelectiveConfigurationPolicy;
  private readonly stabilityDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly changeListeners = new Set<(change: LocalVaultChange) => void>();
  private readonly lifecycleListeners = new Set<(event: LocalLifecycleEvent) => void>();
  private readonly eventUnsubscribers: Array<() => void> = [];
  private readonly generations = new Map<string, number>();
  private vaultReady = false;
  private disposed = false;

  constructor(readonly app: App, options: LocalAdapterOptions = {}) {
    this.adapter = app.vault.adapter;
    this.exclusionPolicy = options.exclusionPolicy ?? new LocalExclusionPolicy();
    this.configurationPolicy = options.configurationPolicy ?? new SelectiveConfigurationPolicy();
    this.stabilityDelayMs = options.stabilityDelayMs ?? 150;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.installVaultEvents();
    this.installLifecycleEvents();
  }

  async activeConfigurationDirectory(): Promise<VaultPath> {
    const value = (this.app.vault as unknown as VaultWithConfigDir).configDir;
    if (!value || typeof value !== "string") {
      throw new LocalPlatformCapabilityError("active-configuration-directory", "Obsidian runtime did not expose vault.configDir");
    }
    return asPath(value);
  }

  async enumerate(): Promise<LocalVaultListing> {
    const entries: LocalObservation[] = [];
    const configDir = await this.activeConfigurationDirectory();
    const visited = new Set<string>();
    const failures: string[] = [];

    const visit = async (folder: string): Promise<void> => {
      const normalizedFolder = normalizeVaultPath(folder);
      if (visited.has(normalizedFolder)) {
        failures.push(`Repeated directory encountered while enumerating: ${normalizedFolder || "/"}`);
        return;
      }
      visited.add(normalizedFolder);
      let listing: Awaited<ReturnType<DataAdapter["list"]>>;
      try {
        listing = await this.adapter.list(normalizedFolder);
      } catch (error) {
        failures.push(`${normalizedFolder || "/"}: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }

      for (const folderPath of listing.folders) {
        const path = asPath(folderPath);
        if (this.exclusionPolicy.evaluate(path, configDir).excluded) continue;
        const observation = await this.observe(path);
        entries.push(observation);
        if (observation.status === "present" && observation.entityKind === "folder") await visit(folderPath);
      }
      for (const filePath of listing.files) {
        const path = asPath(filePath);
        if (this.exclusionPolicy.evaluate(path, configDir).excluded) continue;
        entries.push(await this.observe(path));
      }
    };

    await visit("");
    return {
      entries,
      completeness: failures.length === 0 ? { status: "complete" } : { status: "partial", reason: failures.join("; ") }
    };
  }

  async observe(path: VaultPath): Promise<LocalObservation> {
    const normalized = asPath(String(path));
    try {
      const exists = await this.adapter.exists(String(normalized), true);
      if (!exists) return { status: "absent", side: "local", path: normalized };
      const first = await this.adapter.stat(String(normalized));
      if (!first) return { status: "unknown", side: "local", path: normalized, reason: "Path exists but adapter.stat returned no metadata" };
      if (first.type === "folder") {
        return {
          status: "present",
          side: "local",
          path: normalized,
          entityKind: "folder",
          stability: "stable",
          observationToken: statToken(String(normalized), first, this.generationFor(normalized))
        };
      }
      await sleep(this.stabilityDelayMs);
      const second = await this.adapter.stat(String(normalized));
      const stable = sameStat(first, second);
      const finalStat = second ?? first;
      return {
        status: "present",
        side: "local",
        path: normalized,
        entityKind: "file",
        content: { sizeBytes: finalStat.size, advisoryModifiedTimeMs: finalStat.mtime },
        stability: stable ? "stable" : "unstable",
        observationToken: statToken(String(normalized), finalStat, this.generationFor(normalized))
      };
    } catch (error) {
      return classifyFailure(normalized, error);
    }
  }

  async readFile(path: VaultPath, expectedToken?: ObservationToken): Promise<LocalReadResult> {
    const observation = await this.observe(path);
    if (observation.status !== "present" || observation.entityKind !== "file") {
      throw new Error(`Local file is not readable/present: ${String(path)} (${observation.status})`);
    }
    if (observation.stability !== "stable" || !observation.observationToken) {
      throw new Error(`Local file is not stable: ${String(path)}`);
    }
    if (expectedToken && expectedToken !== observation.observationToken) throw new LocalStaleObservationError(path);
    const token = observation.observationToken;
    return {
      content: new ResourceFetchContentSource(this, path, token, observation.content?.sizeBytes, this.fetchImpl),
      evidence: observation.content ?? {},
      stability: "stable",
      observationToken: token
    };
  }

  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> {
    await this.assertCompatible(path);
    if (await this.adapter.exists(String(path), true)) throw new Error(`Cannot create existing local path: ${String(path)}`);
    const stage = temporarySibling(String(path), "stage");
    try {
      await this.writeIncremental(stage, content);
      await this.adapter.rename(stage, String(path));
      await this.waitForPath(path);
      return this.receipt(path);
    } catch (error) {
      await this.removeIfExists(stage);
      throw error;
    }
  }

  async replaceFile(path: VaultPath, content: BinaryContentSource, expectedToken?: ObservationToken): Promise<LocalMutationReceipt> {
    await this.assertCompatible(path);
    if (expectedToken) await this.assertToken(path, expectedToken);
    const stage = temporarySibling(String(path), "stage");
    const backup = temporarySibling(String(path), "backup");
    let backupCreated = false;
    try {
      await this.writeIncremental(stage, content);
      if (expectedToken) await this.assertToken(path, expectedToken);
      const exists = await this.adapter.exists(String(path), true);
      if (exists) {
        await this.adapter.rename(String(path), backup);
        backupCreated = true;
      }
      try {
        await this.adapter.rename(stage, String(path));
      } catch (error) {
        if (backupCreated) await this.adapter.rename(backup, String(path)).catch(() => undefined);
        throw error;
      }
      await this.waitForPath(path);
      if (backupCreated) await this.adapter.trashLocal(backup).catch(() => undefined);
      return this.receipt(path);
    } catch (error) {
      await this.removeIfExists(stage);
      throw error;
    }
  }

  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> {
    await this.assertCompatible(path);
    if (!(await this.adapter.exists(String(path), true))) await this.app.vault.createFolder(String(path));
    return this.receipt(path);
  }

  async move(fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt> {
    await this.assertCompatible(toPath);
    const file = this.app.vault.getAbstractFileByPath(String(fromPath));
    if (!file) throw new Error(`Cannot move missing local path: ${String(fromPath)}`);
    await this.app.fileManager.renameFile(file, String(toPath));
    return this.receipt(toPath);
  }

  async trash(path: VaultPath): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(String(path));
    if (!file) throw new Error(`Cannot trash missing local path: ${String(path)}`);
    await this.app.fileManager.trashFile(file);
  }

  async validatePath(path: VaultPath): Promise<PathValidationResult> {
    const listing = await this.enumerate();
    const existing = listing.entries
      .filter(entry => entry.status === "present")
      .map(entry => String(entry.path));
    return validateCrossPlatformPath(path, existing);
  }

  async classifyConfiguration(path: VaultPath): Promise<ConfigurationClassification> {
    return this.configurationPolicy.classify(path, await this.activeConfigurationDirectory());
  }

  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe {
    this.lifecycleListeners.add(listener);
    return () => this.lifecycleListeners.delete(listener);
  }

  /** Phase 5/plugin lifecycle calls this; it is intentionally non-destructive. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.emitLifecycle({ kind: "unload" });
    for (const unsubscribe of this.eventUnsubscribers.splice(0)) unsubscribe();
    this.changeListeners.clear();
    this.lifecycleListeners.clear();
  }

  async assertToken(path: VaultPath, expectedToken: ObservationToken): Promise<void> {
    const observation = await this.observe(path);
    if (observation.status !== "present" || observation.stability !== "stable" || observation.observationToken !== expectedToken) {
      throw new LocalStaleObservationError(path);
    }
  }

  private async writeIncremental(path: string, content: BinaryContentSource): Promise<void> {
    await this.adapter.writeBinary(path, new ArrayBuffer(0));
    try {
      for await (const chunk of content.openChunks()) {
        if (chunk.byteLength === 0) continue;
        await this.adapter.appendBinary(path, chunkArrayBuffer(chunk));
      }
    } catch (error) {
      await this.removeIfExists(path);
      throw error;
    }
  }

  private async assertCompatible(path: VaultPath): Promise<void> {
    const result = await this.validatePath(path);
    if (result.status === "blocked") throw new Error(`Blocked local path (${result.reason}): ${String(path)}${result.detail ? ` — ${result.detail}` : ""}`);
  }

  private async receipt(path: VaultPath): Promise<LocalMutationReceipt> {
    const observation = await this.observe(path);
    return observation.status === "present"
      ? { path, evidence: observation.content, observationToken: observation.observationToken }
      : { path };
  }

  private async removeIfExists(path: string): Promise<void> {
    try {
      if (await this.adapter.exists(path, true)) await this.adapter.remove(path);
    } catch {
      // Cleanup failure is deliberately non-destructive to any destination file.
    }
  }

  private async waitForPath(path: VaultPath): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (this.app.vault.getAbstractFileByPath(String(path)) || await this.adapter.exists(String(path), true)) return;
      await sleep(25);
    }
    throw new Error(`Local mutation completed but path was not observable: ${String(path)}`);
  }

  private generationFor(path: VaultPath): number {
    return this.generations.get(String(path)) ?? 0;
  }

  private bump(path: string): void {
    const normalized = normalizeVaultPath(path);
    this.generations.set(normalized, (this.generations.get(normalized) ?? 0) + 1);
  }

  private installVaultEvents(): void {
    const register = (ref: unknown): void => {
      this.eventUnsubscribers.push(() => this.app.vault.offref(ref as never));
    };
    register(this.app.vault.on("create", (file: TAbstractFile) => {
      this.bump(file.path);
      this.emitChange({ kind: "created", path: asPath(file.path) });
    }));
    register(this.app.vault.on("modify", (file: TAbstractFile) => {
      this.bump(file.path);
      this.emitChange({ kind: "modified", path: asPath(file.path) });
    }));
    register(this.app.vault.on("delete", (file: TAbstractFile) => {
      this.bump(file.path);
      this.emitChange({ kind: "deleted", path: asPath(file.path) });
    }));
    register(this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
      this.bump(oldPath);
      this.bump(file.path);
      this.emitChange({ kind: "renamed", fromPath: asPath(oldPath), toPath: asPath(file.path) });
    }));
  }

  private installLifecycleEvents(): void {
    this.app.workspace.onLayoutReady(() => {
      this.vaultReady = true;
      this.emitLifecycle({ kind: "vault-ready" });
    });
    if (typeof document === "undefined") return;
    const visibility = (): void => this.emitLifecycle({ kind: document.visibilityState === "hidden" ? "suspend" : "resume" });
    const suspend = (): void => this.emitLifecycle({ kind: "suspend" });
    const resume = (): void => this.emitLifecycle({ kind: "resume" });
    document.addEventListener("visibilitychange", visibility);
    globalThis.addEventListener?.("pagehide", suspend);
    globalThis.addEventListener?.("pageshow", resume);
    this.eventUnsubscribers.push(() => document.removeEventListener("visibilitychange", visibility));
    this.eventUnsubscribers.push(() => globalThis.removeEventListener?.("pagehide", suspend));
    this.eventUnsubscribers.push(() => globalThis.removeEventListener?.("pageshow", resume));
  }

  private emitChange(change: LocalVaultChange): void {
    // Startup-generated activity is intentionally suppressed. Phase 5 will
    // reconcile the complete vault after `vault-ready`, then debounce/coalesce
    // subsequent truthful local events.
    if (!this.vaultReady || this.disposed) return;
    for (const listener of this.changeListeners) listener(change);
  }

  private emitLifecycle(event: LocalLifecycleEvent): void {
    if (this.disposed && event.kind !== "unload") return;
    for (const listener of this.lifecycleListeners) listener(event);
  }
}
